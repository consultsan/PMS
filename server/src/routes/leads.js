const express = require('express');
const router = express.Router();
const { PrismaClient } = require('@prisma/client');
const multer = require('multer');
const xlsx = require('xlsx');
const { auth, checkRole } = require('../middleware/auth');
const path = require('path');
const fs = require('fs');

const prisma = new PrismaClient();
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, 'uploads/');
  },
  filename: function (req, file, cb) {
    // Use original name with a timestamp or unique suffix to avoid collisions
    const ext = path.extname(file.originalname);
    const base = path.basename(file.originalname, ext);
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, base + '-' + uniqueSuffix + ext);
  }
});
const upload = multer({ storage });

const STATUS_POINTS = {
  NEW: 100,
  OPD_DONE: 200,
  IPD_DONE: 3500,
};

// Helper: Calculate points for a lead
function getPoints(status, override) {
  if (override) return override;
  return STATUS_POINTS[status] || 0;
}

// Helper: Get partner-specific points if defined
async function getPartnerPoints(partnerId, status) {
  if (!partnerId || !status) return null;
  const entry = await prisma.partnerPoints.findUnique({
    where: { partnerId_status: { partnerId, status } },
  });
  return entry ? entry.points : null;
}

// Create Lead
router.post('/', auth, upload.array('files'), async (req, res) => {
  try {
    const { name, phone, remarks, hospitalId, pointsOverride, specialisation } = req.body;
    let partnerId = req.body.partnerId;
    let status = req.body.status;
    if (req.user.role === 'PARTNER') {
      partnerId = req.user.id;
      status = 'NEW';
    }
    if (!name || !phone || phone.length !== 10) {
      return res.status(400).json({ message: 'Name and 10-digit phone are required.' });
    }
    // Check for duplicate phone number
    const existingLead = await prisma.lead.findFirst({
      where: { phone, isDeleted: false }
    });
    if (existingLead) {
      // Create a duplicate lead with status 'DUPLICATE'
      const duplicateLead = await prisma.lead.create({
        data: {
          name,
          phone,
          remarks,
          status: 'DUPLICATE',
          points: 0,
          partnerId,
          hospitalId: hospitalId ?? req.user.hospitalId,
          createdById: req.user.id,
          salesPersonId: null
        },
      });
      return res.status(400).json({ message: 'Phone no already exists in the system', lead: duplicateLead });
    }
    let points = getPoints(status || 'NEW', pointsOverride);
    if (partnerId) {
      const customPoints = await getPartnerPoints(partnerId, status || 'NEW');
      if (customPoints !== null) points = customPoints;
    }
    const resolvedHospitalId = hospitalId ?? req.user.hospitalId;
    if (!resolvedHospitalId) {
      return res.status(400).json({ message: 'Hospital ID is required.' });
    }
    // Round robin sales person assignment
    let salesPersonId = null;
    if (resolvedHospitalId) {
      // Get all active salespersons for the hospital
      const salesPeople = await prisma.user.findMany({
        where: {
          hospitalId: resolvedHospitalId,
          role: 'SALES_PERSON',
          isActive: true
        },
        orderBy: { createdAt: 'asc' }
      });
      if (salesPeople.length > 0) {
        // Find the last assigned salesPersonId for this hospital
        const lastLead = await prisma.lead.findFirst({
          where: {
            hospitalId: resolvedHospitalId,
            salesPersonId: { not: null }
          },
          orderBy: { createdAt: 'desc' }
        });
        let nextIndex = 0;
        if (lastLead && lastLead.salesPersonId) {
          const lastIndex = salesPeople.findIndex(u => u.id === lastLead.salesPersonId);
          nextIndex = (lastIndex + 1) % salesPeople.length;
        }
        salesPersonId = salesPeople[nextIndex].id;
      }
    }
    // Create the lead
    const lead = await prisma.lead.create({
      data: {
        name,
        phone,
        remarks,
        status: status || 'NEW',
        points,
        partnerId,
        hospitalId: resolvedHospitalId,
        createdById: req.user.id,
        salesPersonId,
        specialisation,
      },
    });
    // Save each uploaded file as a LeadDocument
    if (req.files && req.files.length > 0) {
      await Promise.all(
        req.files.map(file =>
          prisma.leadDocument.create({
            data: {
              leadId: lead.id,
              fileUrl: `/uploads/${file.filename}`,
            },
          })
        )
      );
    }
    // Fetch the lead with documents to return
    const leadWithDocs = await prisma.lead.findUnique({
      where: { id: lead.id },
      include: { documents: true },
    });
    res.status(201).json(leadWithDocs);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Get all leads (with role-based filtering)
router.get('/', auth, async (req, res) => {
  try {
    const where = { isDeleted: false };
    if (req.user.role === 'PARTNER') {
      where.partnerId = req.user.id;
    } else if (req.user.role !== 'SUPERADMIN' && req.user.hospitalId) {
      where.hospitalId = req.user.hospitalId;
    }
    if (req.query.status) where.status = req.query.status;
    if (req.query.includeDeleted && (req.user.role === 'SUPERADMIN' || req.user.role === 'ADMIN')) {
      delete where.isDeleted;
    }
    const leads = await prisma.lead.findMany({
      where,
      include: { partner: true, salesPerson: true, hospital: true, createdBy: true, documents: true },
      orderBy: { createdAt: 'desc' },
    });
    res.json(leads);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Export leads as Excel with filters
router.get('/export', auth, async (req, res) => {
  try {
    const { from, to, partnerId, status, salesPersonId, adminId } = req.query;
    const where = { isDeleted: false };

    if (partnerId) where.partnerId = partnerId;
    if (status) where.status = status;
    if (salesPersonId) where.salesPersonId = salesPersonId;
    if (from || to) {
      where.createdAt = {};
      if (from) where.createdAt.gte = new Date(from);
      if (to) where.createdAt.lte = new Date(to);
    }
    // Only superadmin can filter by admin
    if (adminId && req.user.role === 'SUPERADMIN') {
      where['createdById'] = adminId;
    }

    // Role-based filtering
    if (req.user.role === 'PARTNER') {
      where.partnerId = req.user.id;
    } else if (req.user.role !== 'SUPERADMIN' && req.user.hospitalId) {
      where.hospitalId = req.user.hospitalId;
    }

    const leads = await prisma.lead.findMany({
      where,
      include: { partner: true, salesPerson: true, hospital: true, createdBy: true }
    });

    const data = leads.map(l => ({
      name: l.name,
      phone: l.phone,
      status: l.status,
      points: l.points,
      remarks: l.remarks,
      partner: l.partner ? `${l.partner.firstName} ${l.partner.lastName}` : '',
      salesPerson: l.salesPerson ? `${l.salesPerson.firstName} ${l.salesPerson.lastName}` : '',
      hospital: l.hospital ? l.hospital.name : '',
      createdBy: l.createdBy ? `${l.createdBy.firstName} ${l.createdBy.lastName}` : '',
      createdAt: l.createdAt,
    }));

    const ws = xlsx.utils.json_to_sheet(data);
    const wb = xlsx.utils.book_new();
    xlsx.utils.book_append_sheet(wb, ws, 'Leads');
    const buffer = xlsx.write(wb, { type: 'buffer', bookType: 'xlsx' });
    res.setHeader('Content-Disposition', 'attachment; filename=\"leads.xlsx\"');
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.send(buffer);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Export failed' });
  }
});

// Duplicate Leads endpoint for admin/superadmin
router.get('/duplicates', auth, checkRole('ADMIN', 'SUPERADMIN'), async (req, res) => {
  try {
    const leads = await prisma.lead.findMany({
      where: { status: 'DUPLICATE', isDeleted: false },
      include: { partner: true, salesPerson: true, hospital: true, createdBy: true, documents: true },
      orderBy: { createdAt: 'desc' },
    });
    res.json(leads);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Failed to fetch duplicate leads' });
  }
});

// Get single lead
router.get('/:id', auth, async (req, res) => {
  try {
    const lead = await prisma.lead.findUnique({
      where: { id: req.params.id },
      include: { partner: true, salesPerson: true, hospital: true, createdBy: true, documents: true },
    });
    if (!lead || (lead.isDeleted && req.user.role !== 'SUPERADMIN' && req.user.role !== 'ADMIN')) {
      return res.status(404).json({ message: 'Lead not found' });
    }
    res.json(lead);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Update lead (status, remarks, etc.) and support file uploads
router.put('/:id', auth, upload.array('files'), async (req, res) => {
  try {
    const { name, phone, remarks, status, pointsOverride, specialisation } = req.body;
    const lead = await prisma.lead.findUnique({ where: { id: req.params.id } });
    if (!lead) return res.status(404).json({ message: 'Lead not found' });
    // Only superadmin can override points
    let points = lead.points;
    if (pointsOverride && req.user.role === 'SUPERADMIN') {
      points = Number(pointsOverride);
    } else if (status && status !== lead.status) {
      // Check for custom partner points
      let customPoints = null;
      if (lead.partnerId) {
        customPoints = await getPartnerPoints(lead.partnerId, status);
      }
      points = customPoints !== null ? customPoints : getPoints(status);
    }
    const updated = await prisma.lead.update({
      where: { id: req.params.id },
      data: { name, phone, remarks, status, points, specialisation },
    });

    // Save each uploaded file as a LeadDocument
    if (req.files && req.files.length > 0) {
      await Promise.all(
        req.files.map(file =>
          prisma.leadDocument.create({
            data: {
              leadId: updated.id,
              fileUrl: `/uploads/${file.filename}`,
            },
          })
        )
      );
    }

    // Fetch the lead with documents to return
    const leadWithDocs = await prisma.lead.findUnique({
      where: { id: updated.id },
      include: { documents: true },
    });

    res.json(leadWithDocs);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Delete lead and associated documents
router.delete('/:id', auth, async (req, res) => {
  try {
    // Only allow partner to delete their own leads
    const lead = await prisma.lead.findUnique({ where: { id: req.params.id }, include: { documents: true } });
    if (!lead) return res.status(404).json({ message: 'Lead not found' });
    if (req.user.role === 'PARTNER' && lead.partnerId !== req.user.id) {
      return res.status(403).json({ message: 'Not authorized' });
    }
    // Delete associated documents from DB and filesystem
    for (const doc of lead.documents) {
      if (doc.fileUrl) {
        const filePath = path.join(__dirname, '../../', doc.fileUrl);
        fs.unlink(filePath, err => { /* ignore errors */ });
      }
      await prisma.leadDocument.delete({ where: { id: doc.id } });
    }
    // Delete the lead
    await prisma.lead.delete({ where: { id: req.params.id } });
    res.json({ message: 'Lead and documents deleted' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Delete failed' });
  }
});

// Bulk upload leads via Excel
router.post('/bulk-upload', auth, upload.single('file'), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ message: 'No file uploaded' });
    const workbook = xlsx.readFile(req.file.path);
    const sheet = workbook.Sheets[workbook.SheetNames[0]];
    const rows = xlsx.utils.sheet_to_json(sheet);
    const leadsToCreate = [];
    for (const row of rows) {
      if (!row.name || !row.phone || String(row.phone).length !== 10) continue;
      let points = STATUS_POINTS.NEW;
      if (req.user.role === 'PARTNER' || req.user.role === 'ADMIN' || req.user.role === 'SUPERADMIN') {
        const customPoints = await getPartnerPoints(req.user.id, 'NEW');
        if (customPoints !== null) points = customPoints;
      }
      leadsToCreate.push({
        name: row.name,
        phone: String(row.phone),
        remarks: row.remarks || '',
        status: 'NEW',
        points,
        hospitalId: req.user.hospitalId,
        createdById: req.user.id,
        partnerId: req.user.role === 'PARTNER' ? req.user.id : undefined
      });
    }
    const created = await prisma.lead.createMany({ data: leadsToCreate });
    res.json({ message: `Uploaded ${created.count} leads` });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Bulk upload failed' });
  }
});

// Lead analytics endpoint
router.get('/analytics', auth, async (req, res) => {
  try {
    // Count leads by status
    const statuses = ['NEW', 'NOT_REACHABLE', 'NOT_INTERESTED', 'OPD_DONE', 'IPD_DONE', 'CLOSED', 'DELETED'];
    const statusCounts = {};
    const allLeads = await prisma.lead.findMany();
    console.log('All leads in DB:', allLeads);
    for (const status of statuses) {
      statusCounts[status] = await prisma.lead.count({ where: { status, isDeleted: false } });
    }
    // Total points (excluding closed leads)
    const pointsResult = await prisma.lead.aggregate({
      _sum: { points: true },
      where: { status: { not: 'CLOSED' }, isDeleted: false }
    });
    const totalPoints = pointsResult._sum.points || 0;
    console.log('Status counts:', statusCounts, 'Total points:', totalPoints);
    res.json({ statusCounts, totalPoints });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Analytics error' });
  }
});

// Reassign lead (partner or sales person)
router.put('/:id/reassign', auth, checkRole('SUPERADMIN', 'ADMIN'), async (req, res) => {
  try {
    const { partnerId, salesPersonId } = req.body;
    if (!partnerId && !salesPersonId) {
      return res.status(400).json({ message: 'partnerId or salesPersonId required' });
    }
    const lead = await prisma.lead.findUnique({ where: { id: req.params.id } });
    if (!lead) return res.status(404).json({ message: 'Lead not found' });
    const updated = await prisma.lead.update({
      where: { id: req.params.id },
      data: {
        ...(partnerId && { partnerId }),
        ...(salesPersonId && { salesPersonId })
      },
      include: { partner: true, salesPerson: true, hospital: true, createdBy: true },
    });
    res.json(updated);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Reassignment failed' });
  }
});

// Get all remarks for a lead
router.get('/:leadId/remarks', auth, async (req, res) => {
  try {
    const remarks = await prisma.leadRemark.findMany({
      where: { leadId: req.params.leadId },
      orderBy: { createdAt: 'asc' },
      include: { user: { select: { id: true, firstName: true, lastName: true, role: true } } }
    });
    res.json(remarks);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Failed to fetch remarks' });
  }
});

// Add a new remark to a lead
router.post('/:leadId/remarks', auth, upload.single('file'), async (req, res) => {
  try {
    const message = req.body.message;
    let fileUrl = null;
    if (req.file) {
      fileUrl = `/uploads/${req.file.filename}`;
    }
    if ((!message || !message.trim()) && !fileUrl) {
      return res.status(400).json({ message: 'Message or file is required' });
    }
    // Check if lead exists
    const lead = await prisma.lead.findUnique({ where: { id: req.params.leadId } });
    if (!lead) return res.status(404).json({ message: 'Lead not found' });
    const remark = await prisma.leadRemark.create({
      data: {
        leadId: req.params.leadId,
        userId: req.user.id,
        message: message ? message.trim() : '',
        fileUrl,
      },
      include: { user: { select: { id: true, firstName: true, lastName: true, role: true } } }
    });
    res.status(201).json(remark);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Failed to add remark' });
  }
});

module.exports = router; 