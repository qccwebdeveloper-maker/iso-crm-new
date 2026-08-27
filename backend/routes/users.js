const express = require('express');
const router  = express.Router();
const bcrypt  = require('bcryptjs');
const User    = require('../models/User');
const { protect, authorize } = require('../middleware/auth');
const { generateClientId, findReusableClientId } = require('../utils/clientId');

const hashPassword = (pw) => bcrypt.hash(pw, 10);

// GET /api/users
router.get('/', protect, authorize('admin', 'sales'), async (req, res) => {
  try {
    const filter = {};
    if (req.query.role) filter.role = req.query.role;
    const users = await User.find(filter).select('-password').sort({ createdAt: -1 }).lean();
    res.json(users);
  } catch (err) { res.status(500).json({ message: err.message }); }
});

// GET /api/users/me/notifications
router.get('/me/notifications', protect, async (req, res) => {
  try {
    const user = await User.findById(req.user._id).select('notifications');
    if (!user) return res.status(404).json({ message: 'Not found' });
    res.json([...(user.notifications || [])].reverse().slice(0, 30));
  } catch (err) { res.status(500).json({ message: err.message }); }
});

// PUT /api/users/me/notifications/read-all
router.put('/me/notifications/read-all', protect, async (req, res) => {
  try {
    await User.updateOne({ _id: req.user._id }, { $set: { 'notifications.$[].read': true } });
    res.json({ message: 'All notifications marked as read' });
  } catch (err) { res.status(500).json({ message: err.message }); }
});

// PUT /api/users/me/notifications/:notifId
router.put('/me/notifications/:notifId', protect, async (req, res) => {
  try {
    await User.updateOne(
      { _id: req.user._id, 'notifications._id': req.params.notifId },
      { $set: { 'notifications.$.read': true } }
    );
    res.json({ message: 'Marked as read' });
  } catch (err) { res.status(500).json({ message: err.message }); }
});

// GET /api/users/:id
router.get('/:id', protect, async (req, res) => {
  try {
    const user = await User.findById(req.params.id).select('-password');
    if (!user) return res.status(404).json({ message: 'User not found' });
    res.json(user);
  } catch (err) { res.status(500).json({ message: err.message }); }
});

// POST /api/users — create user (password hashed here directly)
router.post('/', protect, authorize('admin', 'sales'), async (req, res) => {
  try {
    const { name, email, password, role, phone, company, country, isoStandard, branchLabel, address } = req.body;
    if (!name || !email || !password || !role) {
      return res.status(400).json({ message: 'Name, email, password and role are required' });
    }
    // Staff accounts (admin/sales/auditor/reviewer) log in by email, so those must
    // stay unique. Clients also have a unique Client ID to log in with, so the same
    // email can be reused across multiple client records (e.g. one contact managing
    // several certifications) — each new one just gets its own Client ID.
    if (role !== 'client') {
      const exists = await User.findOne({ email: email.toLowerCase().trim() });
      if (exists) return res.status(400).json({ message: 'Email already in use' });
    }

    // Same client + same standard + a still-active (non-expired) certification is
    // one lifecycle and must keep the same Client ID (see backend/utils/clientId.js
    // findReusableClientId). Hard block — a new Client ID for this company+standard
    // can only be created once the existing certificate has actually expired
    // (Certificates page → Expire).
    if (role === 'client' && company && isoStandard) {
      const reusable = await findReusableClientId({ company, standard: isoStandard, branchLabel });
      if (reusable) {
        return res.status(409).json({
          message: `An active Client ID (${reusable.clientId}) already exists for ${company}, ${branchLabel || 'Main Branch'} under ${isoStandard}. Use that Client ID for new cycles instead.`,
          existingClientId: reusable.clientId,
        });
      }
    }

    const clientId = role === 'client' ? await generateClientId() : undefined;
    const hashed   = await hashPassword(password);
    const user     = await User.create({
      name, email: email.toLowerCase().trim(),
      password: hashed, role, phone, company, country, address,
      branchLabel: role === 'client' ? String(branchLabel || '').trim() : undefined,
      clientId, isoStandard: role === 'client' ? isoStandard : undefined,
      isActive: true, pendingApproval: false,
    });

    const safe = user.toObject();
    delete safe.password;
    res.status(201).json({ ...safe, _plainPassword: password });
  } catch (err) {
    console.error('[POST /api/users] error:', err.message);
    res.status(500).json({ message: err.message });
  }
});

// PUT /api/users/:id — update user (re-hash password if changed)
router.put('/:id', protect, authorize('admin', 'sales'), async (req, res) => {
  try {
    const data = { ...req.body };
    if (data.password && data.password.trim()) {
      data.password = await hashPassword(data.password);
    } else {
      delete data.password;
    }
    const user = await User.findByIdAndUpdate(req.params.id, data, { returnDocument: 'after' }).select('-password');
    if (!user) return res.status(404).json({ message: 'User not found' });
    res.json({ message: 'User updated', user });
  } catch (err) {
    console.error('[PUT /api/users/:id] error:', err.message);
    res.status(500).json({ message: err.message });
  }
});

// DELETE /api/users/:id
router.delete('/:id', protect, authorize('admin'), async (req, res) => {
  try {
    const user = await User.findByIdAndDelete(req.params.id);
    if (!user) return res.status(404).json({ message: 'User not found' });
    res.json({ message: 'User deleted' });
  } catch (err) { res.status(500).json({ message: err.message }); }
});

module.exports = router;
