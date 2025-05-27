console.log('users.js loaded');

const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const { PrismaClient } = require('@prisma/client');
const { auth, checkRole } = require('../middleware/auth');
const multer = require('multer');
const path = require('path');

const prisma = new PrismaClient();

const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, 'uploads/');
  },
  filename: function (req, file, cb) {
    const ext = path.extname(file.originalname);
    const base = path.basename(file.originalname, ext);
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, base + '-' + uniqueSuffix + ext);
  }
});
const upload = multer({ storage });

// GET /api/users/me - get current user's profile
router.get('/me', auth, async (req, res) => {
  console.log('GET /api/users/me called - UNIQUE LOG', req.user);
  const user = await prisma.user.findUnique({
    where: { id: req.user.id },
    include: { hospital: true }
  });
  res.json(user);
});

// Get single user
router.get('/:id', auth, async (req, res) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.params.id },
      include: { hospital: true }
    });

    if (!user || !user.isActive) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Check authorization
    if (req.user.role !== 'SUPERADMIN' && req.user.hospitalId !== user.hospitalId) {
      return res.status(403).json({ message: 'Not authorized' });
    }

    res.json(user);
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

// Get all users (filtered by role and hospital)
router.get('/', auth, async (req, res) => {
  try {
    const { role, hospitalId, status } = req.query;
    let where = {};

    // Superadmin can see all users
    if (req.user.role !== 'SUPERADMIN') {
      where.hospitalId = req.user.hospitalId;
    } else if (typeof hospitalId !== 'undefined') {
      where.hospitalId = hospitalId === 'null' ? null : hospitalId;
    }

    if (role) {
      where.role = role;
    }
    if (status) {
      where.status = status;
    }

    // Only require isActive: true for non-pending-partner queries
    if (!(req.user.role === 'SUPERADMIN' && hospitalId === 'null' && status === 'ONBOARDING')) {
      where.isActive = true;
    }

    const users = await prisma.user.findMany({
      where,
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        role: true,
        hospitalId: true,
        hospital: true,
        createdAt: true,
        lastLoginAt: true,
        isActive: true,
        phone: true,
        partnerType: true,
        partnerTypeOther: true,
        bankName: true,
        accountNumber: true,
        ifscCode: true,
      }
    });

    res.json(users);
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

// Create user
router.post('/', auth, checkRole('SUPERADMIN', 'ADMIN'), async (req, res) => {
  try {
    const { email, password, firstName, lastName, role, hospitalId, phone, partnerType, partnerTypeOther, bankName, accountNumber, ifscCode } = req.body;

    // For partner and sales, require 10-digit phone
    if ((role === 'PARTNER' || role === 'SALES_PERSON')) {
      if (!phone || !/^\d{10}$/.test(phone)) {
        return res.status(400).json({ message: 'Phone number must be 10 digits for partners and sales people.' });
      }
    }

    // Check if email already exists
    const existingUser = await prisma.user.findUnique({
      where: { email }
    });

    if (existingUser) {
      return res.status(400).json({ message: 'Email already registered' });
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Create user
    const user = await prisma.user.create({
      data: {
        email,
        password: hashedPassword,
        firstName,
        lastName,
        role,
        hospitalId: req.user.role === 'SUPERADMIN' ? hospitalId : req.user.hospitalId,
        phone,
        status: (role === 'PARTNER' || role === 'SALES_PERSON' || role === 'ADMIN') ? 'ACTIVE' : undefined,
        isActive: (role === 'PARTNER' || role === 'SALES_PERSON' || role === 'ADMIN') ? true : undefined,
        partnerType,
        partnerTypeOther,
        bankName,
        accountNumber,
        ifscCode,
      }
    });

    res.status(201).json({
      id: user.id,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      role: user.role,
      hospitalId: user.hospitalId,
      phone: user.phone,
      partnerType: user.partnerType,
      partnerTypeOther: user.partnerTypeOther,
      bankName: user.bankName,
      accountNumber: user.accountNumber,
      ifscCode: user.ifscCode,
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

// PUT /api/users/me - update current user's profile (with PAN/Aadhaar doc upload)
router.put('/me', auth, upload.fields([
  { name: 'panDoc', maxCount: 1 },
  { name: 'aadhaarDoc', maxCount: 1 }
]), async (req, res) => {
  try {
    const { firstName, lastName, phone, pan, aadhaar, bankName, accountNumber, ifscCode } = req.body;
    const data = { firstName, lastName, phone, pan, aadhaar, bankName, accountNumber, ifscCode };
    if (req.files && req.files.panDoc) {
      data.panDocUrl = `/uploads/${req.files.panDoc[0].filename}`;
    }
    if (req.files && req.files.aadhaarDoc) {
      data.aadhaarDocUrl = `/uploads/${req.files.aadhaarDoc[0].filename}`;
    }
    const user = await prisma.user.update({
      where: { id: req.user.id },
      data
    });
    res.json(user);
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

// Update user (admin/superadmin)
router.put('/:id', auth, checkRole('SUPERADMIN', 'ADMIN'), async (req, res) => {
  try {
    const { firstName, lastName, role, hospitalId, isActive, phone, partnerType, partnerTypeOther, bankName, accountNumber, ifscCode } = req.body;
    const userId = req.params.id;

    // For partner and sales, require 10-digit phone
    if ((role === 'PARTNER' || role === 'SALES_PERSON')) {
      if (!phone || !/^\d{10}$/.test(phone)) {
        return res.status(400).json({ message: 'Phone number must be 10 digits for partners and sales people.' });
      }
    }

    // Check if user exists
    const existingUser = await prisma.user.findUnique({
      where: { id: userId }
    });

    if (!existingUser) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Check authorization
    if (req.user.role !== 'SUPERADMIN' && req.user.hospitalId !== existingUser.hospitalId) {
      return res.status(403).json({ message: 'Not authorized' });
    }

    // Update user
    const user = await prisma.user.update({
      where: { id: userId },
      data: {
        firstName,
        lastName,
        role: req.user.role === 'SUPERADMIN' ? role : existingUser.role,
        hospitalId: req.user.role === 'SUPERADMIN' ? hospitalId : existingUser.hospitalId,
        isActive,
        phone,
        partnerType,
        partnerTypeOther,
        bankName,
        accountNumber,
        ifscCode,
      }
    });

    res.json({
      id: user.id,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      role: user.role,
      hospitalId: user.hospitalId,
      isActive: user.isActive,
      phone: user.phone,
      partnerType: user.partnerType,
      partnerTypeOther: user.partnerTypeOther,
      bankName: user.bankName,
      accountNumber: user.accountNumber,
      ifscCode: user.ifscCode,
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

// Delete user (soft delete)
router.delete('/:id', auth, checkRole('SUPERADMIN', 'ADMIN'), async (req, res) => {
  try {
    const userId = req.params.id;

    // Check if user exists
    const existingUser = await prisma.user.findUnique({
      where: { id: userId }
    });

    if (!existingUser) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Check authorization: Superadmin can delete any partner; Admin can only delete partners in their hospital
    if (req.user.role === 'ADMIN' && req.user.hospitalId !== existingUser.hospitalId) {
      return res.status(403).json({ message: 'Not authorized' });
    }

    if (req.user.role === 'SUPERADMIN') {
      // Hard delete
      await prisma.user.delete({ where: { id: userId } });
      res.json({ message: 'User permanently deleted' });
    } else {
      // Soft delete
      await prisma.user.update({
        where: { id: userId },
        data: { isActive: false }
      });
      res.json({ message: 'User deleted successfully' });
    }
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

// Approve partner (admin/superadmin only)
router.put('/:id/approve', auth, checkRole('SUPERADMIN', 'ADMIN'), async (req, res) => {
  try {
    const userId = req.params.id;
    const user = await prisma.user.update({
      where: { id: userId },
      data: { isActive: true, status: 'ACTIVE' }
    });
    res.json({ message: 'Partner approved', user });
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

// Reject partner (admin/superadmin only)
router.put('/:id/reject', auth, checkRole('SUPERADMIN', 'ADMIN'), async (req, res) => {
  try {
    const userId = req.params.id;
    const user = await prisma.user.update({
      where: { id: userId },
      data: { isActive: false, status: 'REJECTED' }
    });
    res.json({ message: 'Partner rejected', user });
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

// Approve and assign hospital (superadmin only)
router.put('/:id/approve-assign', auth, checkRole('SUPERADMIN'), async (req, res) => {
  try {
    const userId = req.params.id;
    const { hospitalId } = req.body;
    if (!hospitalId) {
      return res.status(400).json({ message: 'Hospital ID is required' });
    }
    const user = await prisma.user.update({
      where: { id: userId },
      data: { isActive: true, status: 'ACTIVE', hospitalId }
    });
    res.json({ message: 'Partner approved and assigned', user });
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

// Reassign admin data to another admin
router.post('/:id/reassign', auth, checkRole('SUPERADMIN'), async (req, res) => {
  try {
    const { targetAdminId } = req.body;
    const deletedAdminId = req.params.id;

    console.log('Reassigning admin data:', { deletedAdminId, targetAdminId });

    // Check if both admins exist
    const [deletedAdmin, targetAdmin] = await Promise.all([
      prisma.user.findUnique({ where: { id: deletedAdminId } }),
      prisma.user.findUnique({ where: { id: targetAdminId } })
    ]);

    console.log('Found admins:', { 
      deletedAdmin: deletedAdmin ? { id: deletedAdmin.id, role: deletedAdmin.role, hospitalId: deletedAdmin.hospitalId } : null,
      targetAdmin: targetAdmin ? { id: targetAdmin.id, role: targetAdmin.role, hospitalId: targetAdmin.hospitalId } : null
    });

    if (!deletedAdmin || !targetAdmin) {
      return res.status(404).json({ message: 'Admin not found' });
    }

    if (targetAdmin.role !== 'ADMIN') {
      return res.status(400).json({ message: 'Target user must be an admin' });
    }

    if (!targetAdmin.hospitalId) {
      return res.status(400).json({ message: 'Target admin must be assigned to a hospital' });
    }

    if (!deletedAdmin.hospitalId) {
      return res.status(400).json({ message: 'Deleted admin is not assigned to any hospital' });
    }

    // Reassign all partners, sales persons and leads
    try {
      await prisma.$transaction(async (tx) => {
        console.log('Starting transaction for reassignment');

        // Update partners
        const updatedPartners = await tx.user.updateMany({
          where: { 
            hospitalId: deletedAdmin.hospitalId,
            role: 'PARTNER'
          },
          data: { hospitalId: targetAdmin.hospitalId }
        });
        console.log('Updated partners:', updatedPartners);

        // Update sales persons
        const updatedSalesPersons = await tx.user.updateMany({
          where: { 
            hospitalId: deletedAdmin.hospitalId,
            role: 'SALES_PERSON'
          },
          data: { hospitalId: targetAdmin.hospitalId }
        });
        console.log('Updated sales persons:', updatedSalesPersons);

        // Update leads hospitalId
        const updatedLeads = await tx.lead.updateMany({
          where: { 
            hospitalId: deletedAdmin.hospitalId
          },
          data: { hospitalId: targetAdmin.hospitalId }
        });
        console.log('Updated leads:', updatedLeads);

        // Update leads' createdById
        const updatedCreatedBy = await tx.lead.updateMany({
          where: { createdById: deletedAdminId },
          data: { createdById: targetAdminId }
        });
        console.log('Updated leads createdById:', updatedCreatedBy);

        // Now delete the admin
        const deletedUser = await tx.user.delete({ where: { id: deletedAdminId } });
        console.log('Deleted admin:', deletedUser);
      });

      console.log('Transaction completed successfully');
      res.json({ message: 'Admin data reassigned and deleted successfully' });
    } catch (txError) {
      console.error('Transaction failed:', txError);
      throw txError; // Re-throw to be caught by outer try-catch
    }
  } catch (error) {
    console.error('Error in reassign endpoint:', error);
    // Check for specific database errors
    if (error.code === 'P2002') {
      return res.status(400).json({ 
        message: 'A unique constraint would be violated on the database',
        error: error.message 
      });
    }
    if (error.code === 'P2003') {
      return res.status(400).json({ 
        message: 'Foreign key constraint failed on the database',
        error: error.message 
      });
    }
    res.status(500).json({ 
      message: 'Failed to reassign admin data',
      error: error.message 
    });
  }
});

module.exports = router; 