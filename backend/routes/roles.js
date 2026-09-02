const express = require('express');
const router  = express.Router();
const Role    = require('../models/Role');
const { protect, authorize } = require('../middleware/auth');

router.get('/', protect, async (req, res) => {
  try {
    res.json(await Role.find().sort({ name: 1 }).lean());
  } catch (err) { res.status(500).json({ message: err.message }); }
});

router.post('/', protect, authorize('admin'), async (req, res) => {
  try {
    const { name, permissions, description } = req.body;
    if (!name) return res.status(400).json({ message: 'Name required' });
    const exists = await Role.findOne({ name });
    if (exists) return res.status(400).json({ message: 'Role already exists' });
    const role = await Role.create({ name, permissions: permissions || [], description });
    res.status(201).json(role);
  } catch (err) { res.status(500).json({ message: err.message }); }
});

router.put('/:id', protect, authorize('admin'), async (req, res) => {
  try {
    const role = await Role.findByIdAndUpdate(req.params.id, req.body, { returnDocument: 'after' });
    if (!role) return res.status(404).json({ message: 'Not found' });
    res.json(role);
  } catch (err) { res.status(500).json({ message: err.message }); }
});

router.delete('/:id', protect, authorize('admin'), async (req, res) => {
  try {
    const role = await Role.findByIdAndDelete(req.params.id);
    if (!role) return res.status(404).json({ message: 'Not found' });
    res.json({ message: 'Deleted' });
  } catch (err) { res.status(500).json({ message: err.message }); }
});

module.exports = router;

