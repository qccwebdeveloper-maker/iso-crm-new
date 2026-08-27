const User        = require('../models/User');
const QMSForm     = require('../models/QMSForm');
const Certificate = require('../models/Certificate');

// Generate the next sequential 4-digit clientId: 1000, 1001, 1002 ... 9999.
// Only purely-numeric clientIds count toward the series (legacy "CLT-..." ids are ignored).
async function generateClientId() {
  // Find the highest existing numeric clientId.
  const last = await User.findOne({ clientId: /^\d{4}$/ })
    .sort({ clientId: -1 })
    .select('clientId')
    .lean();

  let next = last ? parseInt(last.clientId, 10) + 1 : 1000;

  // Guard against collisions (e.g. concurrent signups) by stepping forward until free.
  for (; next <= 9999; next++) {
    const id = String(next);
    const exists = await User.findOne({ clientId: id }).select('_id').lean();
    if (!exists) return id;
  }

  throw new Error('Client ID range exhausted (1000-9999)');
}

// Resolves the "real" ISO standard for a Client ID the same way every QMS form
// does: the Application Form (F01)'s own standards selection is authoritative when
// present, otherwise fall back to whatever was entered at registration.
async function resolveStandardForClientId(clientId, fallbackIsoStandard) {
  const appForm = await QMSForm.findOne({ clientId, formType: 1 }).select('formData.standards');
  const list = Array.isArray(appForm?.formData?.standards) ? appForm.formData.standards.filter(Boolean) : [];
  return list.length ? list.join(', ') : (fallbackIsoStandard || '');
}

// Finds an existing, still-active (non-expired) Client ID for the same company +
// standard, so callers can avoid accidentally minting a duplicate for what should
// be one certification lifecycle (same client + same standard, cert not expired).
// Returns null when there's nothing to reuse (brand-new company+standard, or every
// same-standard match has an expired certificate) — the caller should proceed to
// generateClientId() as normal in that case.
async function findReusableClientId({ company, standard, branchLabel }) {
  if (!company || !standard) return null;

  const escapedCompany = String(company).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const siblings = await User.find({
    role: 'client',
    company: new RegExp(`^${escapedCompany}$`, 'i'),
  }).select('clientId isoStandard branchLabel');

  const requestedBranch = String(branchLabel || '').trim().toLowerCase();

  for (const sibling of siblings) {
    if (!sibling.clientId) continue;
    const siblingBranch = String(sibling.branchLabel || '').trim().toLowerCase();
    if (requestedBranch && siblingBranch !== requestedBranch) continue;
    const siblingStandard = await resolveStandardForClientId(sibling.clientId, sibling.isoStandard);
    if (siblingStandard !== standard) continue;

    const latestCert = await Certificate
      .findOne({ clientId: sibling.clientId })
      .sort({ expiryDate: -1 })
      .select('expiryDate');

    const isActive = !latestCert || !latestCert.expiryDate || latestCert.expiryDate > new Date();
    if (isActive) {
      return { clientId: sibling.clientId, company, standard };
    }
  }

  return null;
}

module.exports = { generateClientId, resolveStandardForClientId, findReusableClientId };
