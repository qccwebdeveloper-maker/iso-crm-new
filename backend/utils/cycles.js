const QMSForm = require('../models/QMSForm');

// Every certification cycle number that has at least one saved QMS form for this
// Client ID, ascending. A brand-new/legacy client with no cycleNumber data yet is
// treated as a single cycle 1 (matches the schema default).
async function getClientCycles(clientId) {
  const cycles = await QMSForm.distinct('cycleNumber', { clientId });
  return cycles.length ? cycles.sort((a, b) => a - b) : [1];
}

async function getLatestCycle(clientId) {
  const cycles = await getClientCycles(clientId);
  return cycles[cycles.length - 1];
}

module.exports = { getClientCycles, getLatestCycle };
