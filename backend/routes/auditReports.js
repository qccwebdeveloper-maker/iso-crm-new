const router      = require('express').Router();
const { protect, authorize } = require('../middleware/auth');
const AuditReport = require('../models/AuditReport');
const User        = require('../models/User');

// Fields that ONLY admin can write (Step 7)
const STEP7_FIELDS = [
  'certSystem', 'certReqStandard', 'certScope', 'certIssueDate', 'certNumber',
  'clientAuthPerson', 'auditTeamLeader', 'reviewDecision', 'reviewDate',
  'hodDecision', 'hodReviewDate',
];

// Fields that CLIENT is allowed to write (Steps 1 & 2 only)
const CLIENT_ALLOWED_FIELDS = [
  'refNo', 'orgName', 'address', 'additionalSites', 'contactNumber', 'email',
  'contactPerson', 'designation', 'modeOfWorking', 'hybridDetails', 'scope',
  'mainProcesses', 'outsourcedProcesses',
  'applicationType', 'totalEmployees', 'contractual', 'shifts',
  'fullTime', 'partTime', 'performingSameJob', 'tempUnskilled',
  'standards', 'personnel',
];

// ── POST /api/audit-reports  (admin: create) ──────────────────────────────────
router.post('/', protect, authorize('admin'), async (req, res) => {
  try {
    const { clientId, ...rest } = req.body;

    let clientRef = null;
    if (clientId) {
      const found = await User.findOne({ role: 'client', clientId });
      if (found) clientRef = found._id;
    }

    const report = await AuditReport.create({
      ...rest,
      clientId:  clientId || '',
      client:    clientRef,
      createdBy: req.user._id,
    });

    const populated = await AuditReport.findById(report._id)
      .populate('client',           'name email clientId')
      .populate('assignedAuditor',  'name email')
      .populate('assignedReviewer', 'name email')
      .populate('createdBy',        'name email');

    res.status(201).json(populated);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

// ── GET /api/audit-reports  (list, role-filtered) ─────────────────────────────
router.get('/', protect, authorize('admin', 'client', 'auditor', 'reviewer'), async (req, res) => {
  try {
    const role   = req.user.role;
    const filter = {};

    if (role === 'client') {
      filter.client = req.user._id;
    } else if (role === 'auditor' || role === 'reviewer') {
      // Match either field — some reports assign a reviewer-role user under the
      // legacy single-field flow, so check both to avoid hiding older assignments.
      filter.$or = [{ assignedAuditor: req.user._id }, { assignedReviewer: req.user._id }];
    }

    const reports = await AuditReport.find(filter)
      .select('refNo orgName clientId client assignedAuditor assignedReviewer status createdAt')
      .populate('client',           'name email clientId')
      .populate('assignedAuditor',  'name email')
      .populate('assignedReviewer', 'name email')
      .sort('-createdAt');

    res.json(reports);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// ── GET /api/audit-reports/:id  (single, access-checked) ─────────────────────
router.get('/:id', protect, authorize('admin', 'client', 'auditor', 'reviewer'), async (req, res) => {
  try {
    const report = await AuditReport.findById(req.params.id)
      .populate('client',           'name email clientId')
      .populate('assignedAuditor',  'name email')
      .populate('assignedReviewer', 'name email')
      .populate('createdBy',        'name email');

    if (!report) return res.status(404).json({ message: 'Report not found' });

    const role = req.user.role;

    if (role === 'client') {
      if (!report.client || !report.client._id.equals(req.user._id))
        return res.status(403).json({ message: 'Access denied' });
    }

    if (role === 'auditor' || role === 'reviewer') {
      const isAuditor  = report.assignedAuditor  && report.assignedAuditor._id.equals(req.user._id);
      const isReviewer = report.assignedReviewer && report.assignedReviewer._id.equals(req.user._id);
      if (!isAuditor && !isReviewer)
        return res.status(403).json({ message: 'Access denied' });
    }

    res.json(report);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// ── PUT /api/audit-reports/:id  (update, field-level restrictions) ────────────
router.put('/:id', protect, authorize('admin', 'client', 'auditor', 'reviewer'), async (req, res) => {
  try {
    const report = await AuditReport.findById(req.params.id);
    if (!report) return res.status(404).json({ message: 'Report not found' });

    const role = req.user.role;

    // Access check
    if (role === 'client') {
      if (!report.client || !report.client.equals(req.user._id))
        return res.status(403).json({ message: 'Access denied' });
    }
    if (role === 'auditor' || role === 'reviewer') {
      const isAuditor  = report.assignedAuditor  && report.assignedAuditor.equals(req.user._id);
      const isReviewer = report.assignedReviewer && report.assignedReviewer.equals(req.user._id);
      if (!isAuditor && !isReviewer)
        return res.status(403).json({ message: 'Access denied' });
    }

    let updateData = { ...req.body };

    if (role === 'client') {
      // Keep only Step 1 & 2 fields
      const safe = {};
      CLIENT_ALLOWED_FIELDS.forEach(f => {
        if (updateData[f] !== undefined) safe[f] = updateData[f];
      });
      updateData = safe;
    }

    if (role === 'auditor' || role === 'reviewer') {
      // Strip Step 7 fields
      STEP7_FIELDS.forEach(f => delete updateData[f]);
    }

    if (role !== 'admin') {
      // Non-admins cannot change ownership fields
      delete updateData.createdBy;
      delete updateData.clientId;
      delete updateData.client;
      delete updateData.assignedAuditor;
      delete updateData.assignedReviewer;
    }

    // If admin changes clientId, re-resolve client reference
    if (role === 'admin' && updateData.clientId !== undefined) {
      if (updateData.clientId) {
        const found = await User.findOne({ role: 'client', clientId: updateData.clientId });
        updateData.client = found ? found._id : null;
      } else {
        updateData.client = null;
      }
    }

    const updated = await AuditReport.findByIdAndUpdate(
      req.params.id,
      { $set: updateData },
      { new: true, runValidators: true }
    )
      .populate('client',           'name email clientId')
      .populate('assignedAuditor',  'name email')
      .populate('assignedReviewer', 'name email')
      .populate('createdBy',        'name email');

    res.json(updated);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

// ── POST /api/audit-reports/:id/assign  (admin: assign auditor and/or reviewer) ──
router.post('/:id/assign', protect, authorize('admin'), async (req, res) => {
  try {
    const { auditorId, reviewerId } = req.body;
    if (!auditorId && !reviewerId) return res.status(400).json({ message: 'Select an auditor or reviewer to assign' });

    const updates = {};
    if (auditorId) {
      const auditor = await User.findOne({ _id: auditorId, role: 'auditor' });
      if (!auditor) return res.status(404).json({ message: 'Auditor not found' });
      updates.assignedAuditor = auditorId;
    }
    if (reviewerId) {
      const reviewer = await User.findOne({ _id: reviewerId, role: 'reviewer' });
      if (!reviewer) return res.status(404).json({ message: 'Reviewer not found' });
      updates.assignedReviewer = reviewerId;
    }

    const report = await AuditReport.findByIdAndUpdate(
      req.params.id,
      updates,
      { new: true }
    )
      .populate('client',           'name email clientId')
      .populate('assignedAuditor',  'name email')
      .populate('assignedReviewer', 'name email');

    if (!report) return res.status(404).json({ message: 'Report not found' });
    res.json(report);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

// ── POST /api/audit-reports/:id/unassign  (admin: unassign auditor) ───────────
router.post('/:id/unassign', protect, authorize('admin'), async (req, res) => {
  try {
    const report = await AuditReport.findByIdAndUpdate(
      req.params.id,
      { assignedAuditor: null },
      { new: true }
    )
      .populate('client',           'name email clientId')
      .populate('assignedAuditor',  'name email')
      .populate('assignedReviewer', 'name email');

    if (!report) return res.status(404).json({ message: 'Report not found' });
    res.json(report);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// ── POST /api/audit-reports/:id/unassign-reviewer  (admin: unassign reviewer) ──
router.post('/:id/unassign-reviewer', protect, authorize('admin'), async (req, res) => {
  try {
    const report = await AuditReport.findByIdAndUpdate(
      req.params.id,
      { assignedReviewer: null },
      { new: true }
    )
      .populate('client',           'name email clientId')
      .populate('assignedAuditor',  'name email')
      .populate('assignedReviewer', 'name email');

    if (!report) return res.status(404).json({ message: 'Report not found' });
    res.json(report);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// ── DELETE /api/audit-reports/:id  (admin only) ───────────────────────────────
router.delete('/:id', protect, authorize('admin'), async (req, res) => {
  try {
    const report = await AuditReport.findByIdAndDelete(req.params.id);
    if (!report) return res.status(404).json({ message: 'Report not found' });
    res.json({ message: 'Report deleted successfully' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;
