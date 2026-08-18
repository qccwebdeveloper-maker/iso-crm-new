const express     = require('express');
const router      = express.Router();
const Certificate = require('../models/Certificate');
const CertSetting = require('../models/CertSetting');
const User        = require('../models/User');
const Application = require('../models/Application');
const QMSForm     = require('../models/QMSForm');
const { protect, authorize } = require('../middleware/auth');

// ── Certificate number generator — format: QCC/##L##L/MMYY ──
// matches  ^QCC\/\d{2}[A-Z]\d{2}[A-Z]\/(0[1-9]|1[0-2])\d{2}$
const randDigits = (n) => Array.from({ length: n }, () => Math.floor(Math.random() * 10)).join('');
const randLetter = () => String.fromCharCode(65 + Math.floor(Math.random() * 26));
async function generateCertNumber() {
  const now = new Date();
  const mm = String(now.getMonth() + 1).padStart(2, '0');   // 01–12
  const yy = String(now.getFullYear()).slice(-2);           // 2-digit year
  for (let i = 0; i < 60; i++) {
    const middle = `${randDigits(2)}${randLetter()}${randDigits(2)}${randLetter()}`;
    const num = `QCC/${middle}/${mm}${yy}`;
    const exists = await Certificate.findOne({ certNumber: num }).select('_id').lean();
    if (!exists) return num;
  }
  return `QCC/${randDigits(2)}${randLetter()}${randDigits(2)}${randLetter()}/${mm}${yy}`;
}

// GET /api/certificates/gen-number — generate a unique certificate number
router.get('/gen-number', protect, authorize('admin'), async (req, res) => {
  try { res.json({ certNumber: await generateCertNumber() }); }
  catch (err) { res.status(500).json({ message: err.message }); }
});

// GET /api/certificates/prefill/:clientId — auto-fill certificate fields from a client's application
router.get('/prefill/:clientId', protect, authorize('admin'), async (req, res) => {
  try {
    const cid = (req.params.clientId || '').trim();
    const user = await User.findOne({ clientId: cid });
    if (!user) return res.status(404).json({ message: `No client found with Client ID "${cid}"` });

    // Most recent application for this client (if any)
    const app = await Application.findOne({ client: user._id }).sort({ createdAt: -1 });
    const a = app || {};

    // The CRM's primary source of client details is the F01 QMS Application Form
    // (scope, address, standards, contact, … are entered there). Prefer it, then
    // fall back to the legacy Application document, then the bare client record.
    const f01 = await QMSForm.findOne({ clientId: cid, formType: 1 }).select('formData').lean();
    const fd = f01?.formData || {};
    const fdStandards = Array.isArray(fd.standards) ? fd.standards.filter(Boolean) : [];
    // Prepend the country code only when the number doesn't already carry one, so a
    // mobile saved as "+91 98…" isn't turned into "+91 +91 98…". Legacy/imported F01
    // records can also bake the code in as plain digits with no "+" (e.g. "9198…"),
    // so compare digits rather than just checking for a leading "+".
    const fdMobile   = (fd.mobileNumber || '').trim();
    const ccDigits   = String(fd.countryCode || '').replace(/\D/g, '');
    const fdDigits   = fdMobile.replace(/\D/g, '');
    const fdLocal    = (ccDigits && fdDigits.startsWith(ccDigits) && fdDigits.length > ccDigits.length)
      ? fdDigits.slice(ccDigits.length)
      : fdDigits;
    const fdPhone = !fdMobile ? ''
      : fdMobile.startsWith('+') ? fdMobile
      : `${fd.countryCode || ''} ${fdLocal}`.trim();

    const data = {
      orgName:        fd.organizationName || a.organizationName || user.company || user.name || '',
      standard:       fdStandards[0] || a.isoStandard || (Array.isArray(a.standards) && a.standards[0]) || user.isoStandard || '',
      scope:          fd.scopeOfCertification || a.scopeOfCertification || a.scope || user.scope || '',
      address:        fd.address || [a.address, a.address1, a.city, a.state, a.country, a.pincode].filter(Boolean).join(', ') || user.address || '',
      additionalSites:fd.additionalSites || a.additionalSites || '',
      contactPerson:  fd.contactPerson || a.contactPerson || user.name || '',
      designation:    fd.designation || a.designation || '',
      contactNumber:  fdPhone || a.contactNumbers || user.phone || '',
      email:          fd.emailId || a.emailId || user.email || '',
      accreditation:  fd.accreditationBody || a.accreditationBody || 'EAS',
      linkedApplication: app ? app._id : null,
      certNumber:     await generateCertNumber(),
      clientId:       user.clientId || '',
    };

    res.json({
      data,
      foundApplication: !!app || !!f01,
      client: { name: user.name, clientId: user.clientId, company: user.company || '' },
    });
  } catch (err) { res.status(500).json({ message: err.message }); }
});

// GET /api/certificates
router.get('/', protect, async (req, res) => {
  try {
    const certs = await Certificate.find().sort({ createdAt: -1 });
    res.json(certs);
  } catch (err) { res.status(500).json({ message: err.message }); }
});

// GET /api/certificates/settings
router.get('/settings', protect, async (req, res) => {
  try {
    let setting = await CertSetting.findOne();
    if (!setting) setting = await CertSetting.create({});
    res.json(setting);
  } catch (err) { res.status(500).json({ message: err.message }); }
});

// PUT /api/certificates/settings
router.put('/settings', protect, authorize('admin'), async (req, res) => {
  try {
    const setting = await CertSetting.findOneAndUpdate({}, req.body, { new: true, upsert: true });
    res.json(setting);
  } catch (err) { res.status(500).json({ message: err.message }); }
});

// POST /api/certificates/manual
router.post('/manual', protect, authorize('admin'), async (req, res) => {
  try {
    if (!req.body.orgName || !req.body.standard || !req.body.certNumber) {
      return res.status(400).json({ message: 'Organization name, standard and certificate number are required' });
    }
    const exists = await Certificate.findOne({ certNumber: req.body.certNumber });
    if (exists) return res.status(400).json({ message: 'Certificate number already exists' });
    const cert = await Certificate.create(req.body);
    res.status(201).json(cert);
  } catch (err) { res.status(500).json({ message: err.message }); }
});

// GET /api/certificates/:id
router.get('/:id', protect, async (req, res) => {
  try {
    const cert = await Certificate.findById(req.params.id);
    if (!cert) return res.status(404).json({ message: 'Certificate not found' });
    res.json(cert);
  } catch (err) { res.status(500).json({ message: err.message }); }
});

// PUT /api/certificates/:id
router.put('/:id', protect, authorize('admin'), async (req, res) => {
  try {
    const cert = await Certificate.findByIdAndUpdate(req.params.id, req.body, { returnDocument: 'after' });
    if (!cert) return res.status(404).json({ message: 'Certificate not found' });
    res.json(cert);
  } catch (err) { res.status(500).json({ message: err.message }); }
});

// DELETE /api/certificates/:id
router.delete('/:id', protect, authorize('admin'), async (req, res) => {
  try {
    const cert = await Certificate.findByIdAndDelete(req.params.id);
    if (!cert) return res.status(404).json({ message: 'Certificate not found' });
    res.json({ message: 'Certificate deleted' });
  } catch (err) { res.status(500).json({ message: err.message }); }
});

module.exports = router;

