const QMSForm = require('../models/QMSForm');

// Every certification cycle number that has at least one saved QMS form for this
// Client ID, ascending. A brand-new/legacy client with no cycleNumber data yet is
// treated as a single cycle 1 (matches the schema default).
async function getClientCycles(clientId) {
  const raw = await QMSForm.distinct('cycleNumber', { clientId });
  // Documents saved before the cycleNumber field existed never got backfilled with
  // it, so distinct() can return null alongside 1 for what's really just cycle 1 —
  // normalize null/undefined to 1 so a legacy client never looks like it has 2 cycles.
  const cycles = Array.from(new Set(raw.map(c => (c == null ? 1 : c)))).sort((a, b) => a - b);
  return cycles.length ? cycles : [1];
}

async function getLatestCycle(clientId) {
  const cycles = await getClientCycles(clientId);
  return cycles[cycles.length - 1];
}

module.exports = { getClientCycles, getLatestCycle };
