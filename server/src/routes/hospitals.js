const express = require('express');
const router = express.Router();
const { PrismaClient } = require('@prisma/client');
const { auth, checkRole } = require('../middleware/auth');

const prisma = new PrismaClient();

// Get all hospitals (Superadmin: all, Admin: only assigned hospital)
router.get('/', auth, checkRole('SUPERADMIN', 'ADMIN'), async (req, res) => {
  try {
    let hospitals;
    if (req.user.role === 'SUPERADMIN') {
      hospitals = await prisma.hospital.findMany({
        where: { isActive: true },
        include: {
          users: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              email: true,
              role: true
            }
          }
        }
      });
    } else if (req.user.role === 'ADMIN') {
      hospitals = await prisma.hospital.findMany({
        where: { id: req.user.hospitalId, isActive: true },
        include: {
          users: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              email: true,
              role: true
            }
          }
        }
      });
    } else {
      hospitals = [];
    }
    res.json(hospitals);
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

// Get single hospital
router.get('/:id', auth, async (req, res) => {
  try {
    const hospital = await prisma.hospital.findUnique({
      where: { id: req.params.id },
      include: {
        users: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
            role: true
          }
        }
      }
    });

    if (!hospital || !hospital.isActive) {
      return res.status(404).json({ message: 'Hospital not found' });
    }

    // Only superadmin can view all hospitals
    if (req.user.role !== 'SUPERADMIN' && req.user.hospitalId !== hospital.id) {
      return res.status(403).json({ message: 'Not authorized' });
    }

    res.json(hospital);
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

// Create hospital (Superadmin only)
router.post('/', auth, checkRole('SUPERADMIN'), async (req, res) => {
  try {
    const { name, address, city, state, country, phone, email } = req.body;
    
    const hospital = await prisma.hospital.create({
      data: {
        name,
        address,
        city,
        state,
        country,
        phone,
        email
      }
    });

    res.status(201).json(hospital);
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

// Update hospital (Superadmin only)
router.put('/:id', auth, checkRole('SUPERADMIN'), async (req, res) => {
  try {
    const { name, address, city, state, country, phone, email } = req.body;
    
    const hospital = await prisma.hospital.update({
      where: { id: req.params.id },
      data: {
        name,
        address,
        city,
        state,
        country,
        phone,
        email
      }
    });

    res.json(hospital);
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

// Delete hospital (Superadmin only)
router.delete('/:id', auth, checkRole('SUPERADMIN'), async (req, res) => {
  try {
    // Soft delete by setting isActive to false
    await prisma.hospital.update({
      where: { id: req.params.id },
      data: { isActive: false }
    });

    res.json({ message: 'Hospital deleted successfully' });
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router; 