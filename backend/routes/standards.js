const express  = require('express');
const router   = express.Router();
const Standard = require('../models/Standard');
const { protect, authorize } = require('../middleware/auth');

router.get('/', protect, async (req, res) => {
  try {
    const standards = await Standard.find().sort({ name: 1 }).lean();
    res.json(standards);
  } catch (err) { res.status(500).json({ message: err.message }); }
});

router.post('/', protect, authorize('admin'), async (req, res) => {
  try {
    const { name, category, description, clauses, active } = req.body;
    if (!name) return res.status(400).json({ message: 'Name required' });
    const exists = await Standard.findOne({ name });
    if (exists) return res.status(400).json({ message: 'Standard already exists' });
    const standard = await Standard.create({ name, category, description, clauses: clauses || [], active: active !== false });
    res.status(201).json(standard);
  } catch (err) { res.status(500).json({ message: err.message }); }
});

router.put('/:id', protect, authorize('admin'), async (req, res) => {
  try {
    const standard = await Standard.findByIdAndUpdate(req.params.id, req.body, { returnDocument: 'after' });
    if (!standard) return res.status(404).json({ message: 'Not found' });
    res.json(standard);
  } catch (err) { res.status(500).json({ message: err.message }); }
});

router.delete('/:id', protect, authorize('admin'), async (req, res) => {
  try {
    const standard = await Standard.findByIdAndDelete(req.params.id);
    if (!standard) return res.status(404).json({ message: 'Not found' });
    res.json({ message: 'Deleted' });
  } catch (err) { res.status(500).json({ message: err.message }); }
});

module.exports = router;

