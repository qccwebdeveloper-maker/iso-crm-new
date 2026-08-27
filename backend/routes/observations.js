const express     = require('express');
const router      = express.Router();
const Observation = require('../models/Observation');
const { protect } = require('../middleware/auth');

// GET /api/observations
router.get('/', protect, async (req, res) => {
  try {
    const filter = {};
    if (req.query.applicationId) filter.applicationId = req.query.applicationId;
    if (req.query.status)        filter.status        = req.query.status;
    const obs = await Observation.find(filter).sort({ createdAt: -1 }).lean();
    res.json(obs);
  } catch (err) { res.status(500).json({ message: err.message }); }
});

// POST /api/observations
router.post('/', protect, async (req, res) => {
  try {
    const { applicationId, type, description, corrective_action } = req.body;
    if (!applicationId || !description) return res.status(400).json({ message: 'Application and description required' });
    const obs = await Observation.create({
      applicationId, type, description, corrective_action,
      raisedBy: req.user._id, raisedByName: req.user.name,
      status: 'Open',
    });
    res.status(201).json(obs);
  } catch (err) { res.status(500).json({ message: err.message }); }
});

// PUT /api/observations/:id
router.put('/:id', protect, async (req, res) => {
  try {
    const updates = { ...req.body };
    if (req.body.status === 'Closed') updates.closedAt = new Date();
    const obs = await Observation.findByIdAndUpdate(req.params.id, updates, { returnDocument: 'after' });
    if (!obs) return res.status(404).json({ message: 'Not found' });
    res.json(obs);
  } catch (err) { res.status(500).json({ message: err.message }); }
});

// DELETE /api/observations/:id
router.delete('/:id', protect, async (req, res) => {
  try {
    const obs = await Observation.findByIdAndDelete(req.params.id);
    if (!obs) return res.status(404).json({ message: 'Not found' });
    res.json({ message: 'Observation deleted' });
  } catch (err) { res.status(500).json({ message: err.message }); }
});

module.exports = router;

