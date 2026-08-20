const mongoose = require('mongoose');

const auditTeamMemberSchema = new mongoose.Schema({
  name:     String,
  role:     String,
  stage1MD: String,
  stage2MD: String,
}, { _id: false });

const ncSchema = new mongoose.Schema({
  standard: String,
  type:     String,
  clause:   String,
  detail:   String,
  process:  String,
}, { _id: false });

const observationItemSchema = new mongoose.Schema({
  standard: String,
  clause:   String,
  detail:   String,
}, { _id: false });

const auditReportSchema = new mongoose.Schema({
  // ── Ownership & Control ───────────────────────────────────────────────────
  createdBy:       { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  clientId:        { type: String, default: '' },
  client:          { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
  assignedAuditor:  { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
  assignedReviewer: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
  status:          { type: String, enum: ['draft', 'in_progress', 'completed'], default: 'draft' },

  // ── Step 1: AUD-F-02 §2.1 — Organization Info ────────────────────────────
  refNo: String, orgName: String, address: String, additionalSites: String,
  contactNumber: String, email: String, contactPerson: String, designation: String,
  modeOfWorking: String, hybridDetails: String, scope: String,
  mainProcesses: String, outsourcedProcesses: String,

  // §2.3 — Application & Audit Type
  applicationType: String,
  totalEmployees:  String,
  contractual:     { type: Number, default: 0 },
  shifts: String, fullTime: String, partTime: String,
  performingSameJob: String, tempUnskilled: String,

  // ── Step 2: AUD-F-02 §2.2 — Standards ────────────────────────────────────
  standards: [String],

  // §2.4 — Personnel grid (dynamic keys per category)
  personnel: { type: mongoose.Schema.Types.Mixed, default: {} },

  // ── Step 3: AUD-F-02 §2.5 — Management System ────────────────────────────
  legalActs: String, keyProcessArea: String, products: String,
  outsourcingProcess: String, consultantDetails: String,
  establishmentDate: String, manualDate: String,
  internalAuditDate: String, mrmDate: String,
  alreadyCertified: { type: Boolean, default: false },
  certStandards: String, certBody: String, certIssue: String, certExpiry: String,

  // §2.6 — Integration options (dynamic keys)
  integration: { type: mongoose.Schema.Types.Mixed, default: {} },

  // ── Step 4: AUD-F-03 — Audit Planning ────────────────────────────────────
  auditTeam: [auditTeamMemberSchema],
  stage1From: String, stage1To: String, stage2From: String, stage2To: String,
  iafCode: String, risk: String, meetingLink: String, modeOfAudit: String,
  applicationDate: String, applicationReviewDate: String, after11Month: String,
  stage1AuditPlan: String, stage2AuditPlan: String,

  // ── Step 5: AUD-F-09 — Stage 1 Audit Report ──────────────────────────────
  s1OrgBrief: String, s1Duration: String,
  s1EmployeeChanged: { type: Boolean, default: false },
  s1ScopeChanged:    { type: Boolean, default: false },
  s1Clauses:    { type: mongoose.Schema.Types.Mixed, default: {} },
  s1MinorNC:    { type: Number, default: 0 },
  s1MajorNC:    { type: Number, default: 0 },
  s1Obs:        { type: Number, default: 0 },
  s1OFI:        { type: Number, default: 0 },
  s1Readiness:  String,
  s1Recommendation: String,
  s1NCs:         [ncSchema],
  s1Observations:[observationItemSchema],

  // ── Step 6: AUD-F-15 — Stage 2 Audit Report ──────────────────────────────
  s2Duration: String, s2Deviations: String,
  s2SignificantIssues: String, s2Changes: String,
  s2MinorNC: { type: Number, default: 0 },
  s2MajorNC: { type: Number, default: 0 },
  s2Obs:     { type: Number, default: 0 },
  s2OFI:     { type: Number, default: 0 },
  s2Recommendation: String,
  s2NCs:         [ncSchema],
  s2Observations:[observationItemSchema],
  s2RootCause: String, s2Correction: String,
  s2CorrectiveAction: String, s2CompletionDate: String,

  // ── Step 7: AUD-F-21/22 — Certificate & Review (admin only) ──────────────
  certSystem:       { type: String, default: 'Quality Management System' },
  certReqStandard:  String,
  certScope:        String,
  certIssueDate:    String,
  certNumber:       String,
  clientAuthPerson: String,
  auditTeamLeader:  String,
  reviewDecision:   String,
  reviewDate:       String,
  hodDecision:      String,
  hodReviewDate:    String,

}, { timestamps: true });

module.exports = mongoose.model('AuditReport', auditReportSchema);
