const express = require('express');
const router = express.Router();
const { PrismaClient } = require('@prisma/client');
const { auth, checkRole } = require('../middleware/auth');

const prisma = new PrismaClient();

// Get all pending partner points requests
router.get('/pending', auth, checkRole('SUPERADMIN'), async (req, res) => {
  try {
    const pending = await prisma.partnerPoints.findMany({
      where: { approvalStatus: 'PENDING' },
      include: { partner: { select: { firstName: true, lastName: true } } }
    });
    res.json(pending.map(p => ({
      id: p.id,
      partner: p.partner ? `${p.partner.firstName} ${p.partner.lastName}` : '',
      requestedPoints: p.points,
      status: p.approvalStatus
    })));
  } catch (error) {
    res.status(500).json({ message: 'Failed to fetch pending requests' });
  }
});

// Approve partner points request
router.post('/:id/approve', auth, checkRole('SUPERADMIN'), async (req, res) => {
  try {
    const updated = await prisma.partnerPoints.update({
      where: { id: req.params.id },
      data: { approvalStatus: 'APPROVED' }
    });
    res.json({ success: true, updated });
  } catch (error) {
    res.status(500).json({ message: 'Failed to approve request' });
  }
});

// Reject partner points request
router.post('/:id/reject', auth, checkRole('SUPERADMIN'), async (req, res) => {
  try {
    const updated = await prisma.partnerPoints.update({
      where: { id: req.params.id },
      data: { approvalStatus: 'REJECTED' }
    });
    res.json({ success: true, updated });
  } catch (error) {
    res.status(500).json({ message: 'Failed to reject request' });
  }
});

// Set or update partner points for a status
router.post('/partner-points', auth, checkRole('SUPERADMIN', 'ADMIN'), async (req, res) => {
  try {
    const { partnerId, status, points, approvalStatus } = req.body;
    if (!partnerId || !status || typeof points !== 'number') {
      return res.status(400).json({ message: 'partnerId, status, and points are required' });
    }

    // Determine the approval status based on user role and request
    let finalApprovalStatus;
    if (req.user.role === 'SUPERADMIN') {
      finalApprovalStatus = 'APPROVED';
    } else if (req.user.role === 'ADMIN') {
      finalApprovalStatus = approvalStatus || 'PENDING';
    }

    const result = await prisma.partnerPoints.upsert({
      where: { partnerId_status: { partnerId, status } },
      update: { 
        points,
        approvalStatus: finalApprovalStatus
      },
      create: { 
        partnerId, 
        status, 
        points,
        approvalStatus: finalApprovalStatus
      },
    });
    res.json(result);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Failed to set partner points' });
  }
});

// Get all partner points for a partner
router.get('/partner-points', auth, async (req, res) => {
  try {
    const { partnerId } = req.query;
    if (!partnerId) return res.status(400).json({ message: 'partnerId required' });
    const points = await prisma.partnerPoints.findMany({
      where: { partnerId },
      orderBy: { status: 'asc' },
    });
    res.json(points);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Failed to get partner points' });
  }
});

// Get a specific partner points entry
router.get('/partner-points/:id', auth, async (req, res) => {
  try {
    const entry = await prisma.partnerPoints.findUnique({ where: { id: req.params.id } });
    if (!entry) return res.status(404).json({ message: 'Not found' });
    res.json(entry);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Failed to get partner points entry' });
  }
});

module.exports = router; 