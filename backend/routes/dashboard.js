const express     = require('express');
const router      = express.Router();
const Application = require('../models/Application');
const User        = require('../models/User');
const Lead        = require('../models/Lead');
const { protect } = require('../middleware/auth');

router.get('/stats', protect, async (req, res) => {
  try {
    const { role, _id } = req.user;

    if (role === 'admin') {
      const [totalApplications, clients, auditors, statusCounts, monthlyApps, recentApps] = await Promise.all([
        Application.countDocuments(),
        User.countDocuments({ role: 'client' }),
        User.countDocuments({ role: 'auditor' }),
        Application.aggregate([{ $group: { _id: '$status', count: { $sum: 1 } } }]),
        Application.aggregate([
          { $group: { _id: { year: { $year: '$createdAt' }, month: { $month: '$createdAt' } }, count: { $sum: 1 } } },
          { $sort: { '_id.year': 1, '_id.month': 1 } },
          { $limit: 12 },
        ]),
        Application.find().sort({ createdAt: -1 }).limit(6)
          .populate('client', 'name email clientId')
          .populate('assignedAuditor', 'name'),
      ]);
      return res.json({ totalApplications, clients, auditors, statusCounts, monthlyApps, recentApps });
    }

    if (role === 'client') {
      const apps = await Application.find({ client: _id });
      return res.json({
        totalApplications: apps.length,
        submitted:   apps.filter(a => a.status === 'submitted').length,
        underReview: apps.filter(a => a.status === 'under_review').length,
        certified:   apps.filter(a => a.status === 'certified').length,
        rejected:    apps.filter(a => a.status === 'rejected').length,
        recentApps:  apps.slice(-5).reverse(),
      });
    }

    if (role === 'auditor') {
      const apps = await Application.find({ assignedAuditor: _id });
      return res.json({
        assigned:   apps.length,
        pending:    apps.filter(a => ['under_review','audit_stage1'].includes(a.status)).length,
        completed:  apps.filter(a => ['audit_stage2','approved','certified'].includes(a.status)).length,
        recentApps: apps.slice(-5).reverse(),
      });
    }

    if (role === 'reviewer') {
      const apps = await Application.find({ assignedReviewer: _id });
      const statusCounts = await Application.aggregate([
        { $match: { assignedReviewer: _id } },
        { $group: { _id: '$status', count: { $sum: 1 } } },
      ]);
      return res.json({
        assignedCount:      apps.length,
        inProgressCount:    apps.filter(a => ['under_review','audit_stage1','audit_stage2'].includes(a.status)).length,
        completedCount:     apps.filter(a => ['approved','certified'].includes(a.status)).length,
        pendingCount:       apps.filter(a => a.status === 'audit_stage2').length,
        recentApplications: apps.slice(-8).reverse(),
        statusDistribution: statusCounts,
      });
    }

    if (role === 'sales') {
      const [total, newL, qualified, converted] = await Promise.all([
        Lead.countDocuments(),
        Lead.countDocuments({ status: 'new' }),
        Lead.countDocuments({ status: 'qualified' }),
        Lead.countDocuments({ status: 'converted' }),
      ]);
      return res.json({
        totalLeads: total, newLeads: newL, qualified, converted,
        conversionRate: total ? Math.round((converted / total) * 100) : 0,
      });
    }

    res.json({});
  } catch (err) { res.status(500).json({ message: err.message }); }
});

module.exports = router;

