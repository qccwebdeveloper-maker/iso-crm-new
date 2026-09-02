const express = require('express');
const router  = express.Router();
const Payment = require('../models/Payment');
const { protect, authorize } = require('../middleware/auth');

// GET /api/payments
router.get('/', protect, authorize('admin'), async (req, res) => {
  try {
    const filter = {};
    if (req.query.status)        filter.paymentStatus = req.query.status;
    if (req.query.applicationId) filter.applicationId = req.query.applicationId;
    const payments = await Payment.find(filter).sort({ createdAt: -1 }).lean();
    res.json(payments);
  } catch (err) { res.status(500).json({ message: err.message }); }
});

// GET /api/payments/:id
router.get('/:id', protect, authorize('admin'), async (req, res) => {
  try {
    const payment = await Payment.findById(req.params.id).lean();
    if (!payment) return res.status(404).json({ message: 'Payment not found' });
    res.json(payment);
  } catch (err) { res.status(500).json({ message: err.message }); }
});

// POST /api/payments
router.post('/', protect, authorize('admin'), async (req, res) => {
  try {
    const { name, transactionId, applicationId, amount, paymentStatus, paymentDate } = req.body;
    if (!name || !transactionId || !amount) {
      return res.status(400).json({ message: 'Name, transaction ID, and amount are required' });
    }
    const needsDate = paymentStatus === 'received' || paymentStatus === 'partially_received';
    const payment = await Payment.create({
      name, transactionId,
      applicationId: applicationId || null,
      amount: parseInt(amount),
      paymentStatus: paymentStatus || 'pending',
      paymentDate: needsDate ? (paymentDate || new Date()) : null,
    });
    res.status(201).json(payment);
  } catch (err) { res.status(500).json({ message: err.message }); }
});

// PUT /api/payments/:id
router.put('/:id', protect, authorize('admin'), async (req, res) => {
  try {
    const { name, transactionId, applicationId, amount, paymentStatus, paymentDate } = req.body;
    const update = {
      name,
      transactionId,
      applicationId: applicationId || null,
      amount: amount !== undefined ? parseInt(amount) : undefined,
      paymentStatus,
      paymentDate: (paymentStatus === 'received' || paymentStatus === 'partially_received') ? (paymentDate || new Date()) : null,
    };
    Object.keys(update).forEach(k => update[k] === undefined && delete update[k]);
    const payment = await Payment.findByIdAndUpdate(req.params.id, update, { new: true });
    if (!payment) return res.status(404).json({ message: 'Payment not found' });
    res.json(payment);
  } catch (err) { res.status(500).json({ message: err.message }); }
});

// DELETE /api/payments/:id
router.delete('/:id', protect, authorize('admin'), async (req, res) => {
  try {
    const payment = await Payment.findByIdAndDelete(req.params.id);
    if (!payment) return res.status(404).json({ message: 'Payment not found' });
    res.json({ message: 'Payment deleted' });
  } catch (err) { res.status(500).json({ message: err.message }); }
});

module.exports = router;

