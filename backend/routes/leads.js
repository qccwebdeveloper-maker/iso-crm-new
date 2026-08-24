const express     = require('express');
const rateLimit   = require('express-rate-limit');
const router      = express.Router();
const Lead        = require('../models/Lead');
const Application = require('../models/Application');
const User        = require('../models/User');
const { protect, authorize } = require('../middleware/auth');

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PHONE_RE = /^\+?\d{7,15}$/;

// The real anti-spam backstop for the public endpoint below — the contact
// forms' math CAPTCHA is client-side only (UX deterrent for casual bots going
// through the actual page), so anyone scripting requests straight at this API
// skips it entirely. This caps abuse regardless of how the request was made.
// Keyed by IP (requires server.js's `trust proxy` so this reads the real
// client IP behind nginx, not the proxy's).
const publicLeadLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5,
  standardHeaders: true,
  legacyHeaders: false,
  message: { message: 'Too many submissions from this device. Please try again later.' },
});

// `link` defaults to the Lead Management list — there's no per-lead detail route to
// deep-link into yet, so clicking a lead notification lands admin/sales on the list
// where the lead in question shows up (filter/search by name or Lead ID from there).
const pushNotif = async (userId, message, type = 'info', link = '/admin/leads') => {
  if (!userId) return;
  await User.findByIdAndUpdate(userId, {
    $push: { notifications: { $each: [{ message, type, read: false, link, createdAt: new Date() }], $position: 0, $slice: 50 } }
  });
};

const populateFields = [
  { path: 'assignedTo',       select: 'name email role' },
  { path: 'assignedAuditor',  select: 'name email role' },
  { path: 'assignedReviewer', select: 'name email role' },
];

// POST /api/leads/public — unauthenticated: the QCC marketing site's contact
// page and footer contact form both post here directly (no CRM login involved).
// Only a fixed set of fields can be set from a request like this; everything
// else (status, assignedTo, priority, ...) stays at its schema default so an
// anonymous visitor can never do more than create a plain new lead. Visible
// afterwards only to admin/sales via the GET routes below (protect+authorize).
router.post('/public', publicLeadLimiter, async (req, res) => {
  try {
    const { name, email, phone, subject, message, hp_website } = req.body;

    // Honeypot: a hidden field real visitors never see or fill; script bots
    // that blindly populate every field in the form do. Pretend success
    // without touching the database, so the bot has no signal to adapt to.
    if (hp_website) {
      return res.status(201).json({ message: 'Thanks — we will get back to you shortly.' });
    }

    const trimmedName = String(name || '').trim();
    if (!trimmedName || trimmedName.length < 2) return res.status(400).json({ message: 'Enter a valid name.' });
    if (trimmedName.length > 150) return res.status(400).json({ message: 'Name is too long.' });

    const trimmedEmail = email ? String(email).trim().toLowerCase() : '';
    const digitsOnlyPhone = phone ? String(phone).replace(/[\s\-().]/g, '') : '';
    if (!trimmedEmail && !digitsOnlyPhone) return res.status(400).json({ message: 'Email or phone is required' });
    if (trimmedEmail && !EMAIL_RE.test(trimmedEmail)) return res.status(400).json({ message: 'Enter a valid email address.' });
    if (digitsOnlyPhone && !PHONE_RE.test(digitsOnlyPhone)) return res.status(400).json({ message: 'Enter a valid phone number.' });
    if (message && String(message).length > 3000) return res.status(400).json({ message: 'Message is too long.' });

    const lead = await Lead.create({
      companyName: trimmedName,
      contactPerson: trimmedName,
      email: trimmedEmail || undefined,
      mobile: phone ? String(phone).trim() : undefined,
      source: 'Website',
      status: 'pending_review',
      notes: [subject, message].filter(Boolean).join(' — ').slice(0, 5000),
    });

    // Notify admins so a new public-site submission doesn't sit unnoticed
    const admins = await User.find({ role: 'admin' }).select('_id');
    for (const a of admins) {
      await pushNotif(a._id, `New website enquiry pending review: ${lead.companyName}`, 'info');
    }

    res.status(201).json({ message: 'Thanks — we will get back to you shortly.', leadId: lead.leadId });
  } catch (err) { res.status(500).json({ message: err.message }); }
});

// GET /api/leads
router.get('/', protect, authorize('admin', 'sales'), async (req, res) => {
  try {
    // Sales and admin both see all leads (the sales dashboard is a team-wide view:
    // unassigned counter, team performance, full pipeline). Optional ?mine=true lets a
    // sales user narrow to just the leads assigned to them.
    const filter = {};
    if (req.query.status) filter.status = req.query.status;
    if (req.user.role === 'sales' && req.query.mine === 'true') filter.assignedTo = req.user._id;
    const leads = await Lead.find(filter).populate(populateFields).sort({ createdAt: -1 });
    res.json(leads);
  } catch (err) { res.status(500).json({ message: err.message }); }
});

// GET /api/leads/stats
router.get('/stats', protect, authorize('admin', 'sales'), async (req, res) => {
  try {
    const [total, pendingReview, newL, contacted, qualified, converted, lost] = await Promise.all([
      Lead.countDocuments(), Lead.countDocuments({ status: 'pending_review' }),
      Lead.countDocuments({ status: 'new' }),
      Lead.countDocuments({ status: 'contacted' }), Lead.countDocuments({ status: 'qualified' }),
      Lead.countDocuments({ status: 'converted' }), Lead.countDocuments({ status: 'lost' }),
    ]);
    res.json({ total, pending_review: pendingReview, new: newL, contacted, qualified, converted, lost });
  } catch (err) { res.status(500).json({ message: err.message }); }
});

// GET /api/leads/:id
router.get('/:id', protect, authorize('admin', 'sales'), async (req, res) => {
  try {
    const lead = await Lead.findById(req.params.id).populate(populateFields);
    if (!lead) return res.status(404).json({ message: 'Lead not found' });
    res.json(lead);
  } catch (err) { res.status(500).json({ message: err.message }); }
});

// POST /api/leads
router.post('/', protect, authorize('admin', 'sales'), async (req, res) => {
  try {
    const lead = await Lead.create(req.body);
    const populated = await Lead.findById(lead._id).populate(populateFields);
    res.status(201).json(populated);
  } catch (err) { res.status(500).json({ message: err.message }); }
});

// PUT /api/leads/:id
router.put('/:id', protect, authorize('admin', 'sales'), async (req, res) => {
  try {
    const lead = await Lead.findByIdAndUpdate(req.params.id, req.body, { returnDocument: 'after' })
      .populate(populateFields);
    if (!lead) return res.status(404).json({ message: 'Lead not found' });
    res.json(lead);
  } catch (err) { res.status(500).json({ message: err.message }); }
});

// POST /api/leads/:id/assign  â€” assign auditor and/or reviewer to a lead
router.post('/:id/assign', protect, authorize('admin', 'sales'), async (req, res) => {
  try {
    const { auditorId, reviewerId, assignedTo } = req.body;

    if (!auditorId && !reviewerId && !assignedTo) {
      return res.status(400).json({ message: 'Select at least one person to assign' });
    }

    const lead = await Lead.findById(req.params.id);
    if (!lead) return res.status(404).json({ message: 'Lead not found' });

    const updates = {};
    if (auditorId)  updates.assignedAuditor  = auditorId;
    if (reviewerId) updates.assignedReviewer = reviewerId;
    if (assignedTo) updates.assignedTo       = assignedTo;

    // Move status to 'contacted' automatically once someone is assigned
    if (lead.status === 'new' || lead.status === 'pending_review') updates.status = 'contacted';

    const updated = await Lead.findByIdAndUpdate(req.params.id, updates, { returnDocument: 'after' })
      .populate(populateFields);

    // Notify the assigned people. Auditors/reviewers have no leads page to land on
    // (leads are an admin/sales concept), so these skip the default /admin/leads link.
    if (auditorId)  await pushNotif(auditorId,  `You have been assigned to lead ${lead.leadId} â€” ${lead.companyName}`, 'info', null);
    if (reviewerId) await pushNotif(reviewerId, `You have been assigned to review lead ${lead.leadId} â€” ${lead.companyName}`, 'info', null);

    res.json(updated);
  } catch (err) { res.status(500).json({ message: err.message }); }
});

// POST /api/leads/:id/convert  â€” convert lead to application
router.post('/:id/convert', protect, authorize('admin', 'sales'), async (req, res) => {
  try {
    const lead = await Lead.findById(req.params.id).populate('assignedTo', 'name');
    if (!lead) return res.status(404).json({ message: 'Lead not found' });

    const app = await Application.create({
      organizationName:     lead.companyName,
      organizationAbbr:     lead.companyName.split(' ').map(w => w[0]).join('').substring(0, 4).toUpperCase(),
      city:                 lead.city || '',
      state:                lead.state || '',
      country:              lead.country || 'India',
      isoStandard:          lead.isoStandard || 'ISO 9001:2015',
      standards:            [lead.isoStandard || 'ISO 9001:2015'],
      scope:                req.body.scope || `ISO Certification for ${lead.companyName}`,
      scopeOfCertification: req.body.scope || `ISO Certification for ${lead.companyName}`,
      accreditationBody:    req.body.accreditationBody || 'NABCB',
      contactPerson:        lead.contactPerson,
      emailId:              lead.email,
      contactNumbers:       lead.mobile,
      adminNotes:           `Converted from lead ${lead.leadId}`,
      status:               'submitted',
      submittedAt:          new Date(),
      client:               req.body.clientId || null,
    });

    await Lead.findByIdAndUpdate(req.params.id, { status: 'converted', convertedToApplication: app._id });

    if (lead.assignedTo) {
      // assignedTo is a sales team member by convention — send them to their leads
      // page (mirrors the admin default, but sales doesn't have an /admin/leads route).
      await pushNotif(lead.assignedTo._id, `Lead ${lead.leadId} converted â€” Application ${app.applicationId} created`, 'success', '/sales/leads');
    }

    res.status(201).json({ message: 'Lead converted to application', application: app });
  } catch (err) { res.status(500).json({ message: err.message }); }
});

// DELETE /api/leads/:id
router.delete('/:id', protect, authorize('admin', 'sales'), async (req, res) => {
  try {
    const lead = await Lead.findByIdAndDelete(req.params.id);
    if (!lead) return res.status(404).json({ message: 'Not found' });
    res.json({ message: 'Lead deleted' });
  } catch (err) { res.status(500).json({ message: err.message }); }
});

module.exports = router;

