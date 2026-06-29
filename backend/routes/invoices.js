const express = require('express');
const router  = express.Router();
const Invoice = require('../models/Invoice');
const User    = require('../models/User');
const { protect, authorize } = require('../middleware/auth');

/* Push a notification onto a client's User record. */
async function notifyClient(clientRefId, message, link) {
  if (!clientRefId) return;
  await User.findByIdAndUpdate(clientRefId, {
    $push: { notifications: { $each: [{
      message, type: 'info', read: false, link: link || '/client/invoices', createdAt: new Date(),
    }], $position: 0, $slice: 50 } },
  });
}

// ── Admin: list all invoices ──
router.get('/', protect, authorize('admin'), async (req, res) => {
  try {
    const filter = {};
    if (req.query.clientId) filter.clientId = req.query.clientId;
    if (req.query.stage)    filter.stage    = req.query.stage;
    const invoices = await Invoice.find(filter)
      .populate('clientRef', 'name company clientId email')
      .sort({ createdAt: -1 });
    res.json(invoices);
  } catch (err) { res.status(500).json({ message: err.message }); }
});

// ── Admin: invoices for one client ──
router.get('/by-client/:clientId', protect, authorize('admin'), async (req, res) => {
  try {
    const invoices = await Invoice.find({ clientId: req.params.clientId })
      .populate('clientRef', 'name company clientId email')
      .sort({ createdAt: -1 });
    res.json(invoices);
  } catch (err) { res.status(500).json({ message: err.message }); }
});

// ── Admin: STEP 1 — create & send a proforma invoice ──
router.post('/', protect, authorize('admin'), async (req, res) => {
  try {
    const { clientId, organizationName, standard, address, amount } = req.body;
    if (!clientId || !amount) {
      return res.status(400).json({ message: 'Client ID and amount are required' });
    }
    const client = await User.findOne({ clientId });
    if (!client) return res.status(404).json({ message: 'No client found with this ID' });

    const seq = (await Invoice.countDocuments({ clientId })) + 1;
    const yy  = String(new Date().getFullYear()).slice(-2);
    const invoiceNo = `QCC/PI/${clientId}/${String(seq).padStart(2, '0')}/${yy}`;

    const invoice = await Invoice.create({
      clientId,
      clientRef: client._id,
      organizationName: organizationName || client.company || '',
      standard: standard || client.isoStandard || '',
      address: address || client.address || '',
      invoiceNo,
      amount: Number(amount),
      stage: 'proforma',
      proformaSentAt: new Date(),
    });

    await notifyClient(client._id, `Proforma invoice ${invoiceNo} (₹${Number(amount)}) has been sent to you.`);
    res.status(201).json(invoice);
  } catch (err) { res.status(500).json({ message: err.message }); }
});

// ── Admin: STEP 2a — record the payment received ──
router.put('/:id/payment', protect, authorize('admin'), async (req, res) => {
  try {
    const { paymentType, bankName, receivedAmount, paymentDate } = req.body;
    const invoice = await Invoice.findByIdAndUpdate(
      req.params.id,
      {
        paymentType: paymentType || '',
        bankName: bankName || '',
        receivedAmount: receivedAmount != null ? Number(receivedAmount) : undefined,
        paymentDate: paymentDate ? new Date(paymentDate) : new Date(),
        stage: 'payment',
        // recording a new payment resets a prior verification
        verified: false, verifiedAt: null,
      },
      { new: true }
    );
    if (!invoice) return res.status(404).json({ message: 'Invoice not found' });
    res.json(invoice);
  } catch (err) { res.status(500).json({ message: err.message }); }
});

// ── Admin: STEP 2b — verify the received payment ──
router.put('/:id/verify', protect, authorize('admin'), async (req, res) => {
  try {
    const { verifiedAmount } = req.body;
    const invoice = await Invoice.findByIdAndUpdate(
      req.params.id,
      {
        verified: true,
        verifiedAmount: verifiedAmount != null ? Number(verifiedAmount) : undefined,
        verifiedAt: new Date(),
        stage: 'verified',
      },
      { new: true }
    );
    if (!invoice) return res.status(404).json({ message: 'Invoice not found' });
    res.json(invoice);
  } catch (err) { res.status(500).json({ message: err.message }); }
});

// ── Admin: STEP 3 — send the final invoice ──
router.put('/:id/final', protect, authorize('admin'), async (req, res) => {
  try {
    const invoice = await Invoice.findById(req.params.id);
    if (!invoice) return res.status(404).json({ message: 'Invoice not found' });
    if (!invoice.verified) return res.status(400).json({ message: 'Verify the payment before sending the final invoice' });

    invoice.stage = 'final';
    invoice.finalSentAt = new Date();
    await invoice.save();

    const finalNo = (invoice.invoiceNo || '').replace('/PI/', '/INV/');
    await notifyClient(invoice.clientRef, `Final invoice ${finalNo || ''} (₹${invoice.amount}) has been issued to you.`);
    res.json(invoice);
  } catch (err) { res.status(500).json({ message: err.message }); }
});

// ── Admin: delete ──
router.delete('/:id', protect, authorize('admin'), async (req, res) => {
  try {
    const invoice = await Invoice.findByIdAndDelete(req.params.id);
    if (!invoice) return res.status(404).json({ message: 'Invoice not found' });
    res.json({ message: 'Invoice deleted' });
  } catch (err) { res.status(500).json({ message: err.message }); }
});

// ── Client: own invoices (only those actually sent — proforma onwards) ──
router.get('/my', protect, authorize('client'), async (req, res) => {
  try {
    if (!req.user.clientId) return res.json([]);
    const invoices = await Invoice.find({ clientId: req.user.clientId }).sort({ createdAt: -1 });
    res.json(invoices);
  } catch (err) { res.status(500).json({ message: err.message }); }
});

module.exports = router;
