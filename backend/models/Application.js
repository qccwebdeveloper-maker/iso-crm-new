const mongoose = require('mongoose');

const feedbackSchema = new mongoose.Schema({
  from:      { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  role:      { type: String },
  message:   { type: String },
  rating:    { type: Number, min: 1, max: 5 },
  createdAt: { type: Date, default: Date.now },
}, { _id: true });

const uploadedDocSchema = new mongoose.Schema({
  name:         { type: String },
  originalName: { type: String },
  path:         { type: String },
  publicId:     { type: String },
  docType:      { type: String },
  uploadedBy:   { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  uploadedAt:   { type: Date, default: Date.now },
}, { _id: true });

const applicationSchema = new mongoose.Schema({
  applicationId:      { type: String, unique: true, sparse: true },
  refno:              { type: String },

  // BUG FIX 1: removed required:true — allows draft saves without orgName
  status:             { type: String, enum: ['draft','submitted','under_review','audit_stage1','audit_stage2','approved','certified','rejected'], default: 'draft' },
  progressPercentage: { type: Number, default: 0 },
  progressStages:     [{ type: String }],

  // ── Step 1 — Organization & Contact
  organizationName:     { type: String, trim: true },   // not required — drafts allowed
  organizationAbbr:     { type: String, trim: true },
  address:              { type: String },
  address1:             { type: String },
  additionalSites:      { type: String },
  city:                 { type: String },
  state:                { type: String },
  country:              { type: String, default: 'India' },
  pincode:              { type: String },
  website:              { type: String },
  contactNumbers:       { type: String },
  emailId:              { type: String },
  contactPerson:        { type: String },
  designation:          { type: String },
  modeOfWorking:        { type: String, enum: ['Online','Onsite','Hybrid',''], default: 'Onsite' },
  hybridCoreActivities: { type: String },
  scopeOfCertification: { type: String },
  scope:                { type: String },

  // ── Step 2 — Standards & Type
  isoStandard:         { type: String },
  standards:           [{ type: String }],
  mainProcesses:       { type: String },
  outsourcedProcesses: { type: String },
  othersStandard:      { type: String },
  applicationType:     { type: String, default: 'Initial' },
  accreditationBody:   { type: String, default: 'EAS' },

  // ── Step 3 — Employees
  totalEmployees:  { type: Number, default: 0 },
  contractual:     { type: Number, default: 0 },
  workingShifts:   { type: Number, default: 1 },
  // BUG FIX 2: [[Number]] is invalid Mongoose syntax — use Mixed for 2D array
  empTable:        { type: mongoose.Schema.Types.Mixed, default: () => Array(5).fill(null).map(() => Array(5).fill(0)) },
  remotePersonnel: { type: Number, default: 0 },
  weekendOperation:{ type: String },
  employeeCount:   {
    headOffice: { type: Number, default: 0 },
    branches:   { type: Number, default: 0 },
    temporary:  { type: Number, default: 0 },
    total:      { type: Number, default: 0 },
  },

  // ── Step 4 — Management System Info
  legalAct:             { type: String },
  keyProcessArea:       { type: String },
  productsServices:     { type: String },
  outsourcingProcess:   { type: String },
  consultantDetails:    { type: String },
  establishmentDate:    { type: Date },
  manualDate:           { type: Date },
  internalAuditDate:    { type: Date },
  managementReviewDate: { type: Date },
  alreadyCertified:     { type: Boolean, default: false },
  certStandard:         { type: String },
  certBody:             { type: String },
  certIssueDate:        { type: Date },
  certExpiryDate:       { type: Date },

  // ── Audit type flags (YES / NO / '')
  combinedAudit:         { type: String },
  jointAudit:            { type: String },
  integratedAudit:       { type: String },
  separateAudit:         { type: String },
  internalAuditCombined: { type: String },
  mrmCombined:           { type: String },
  manualCombined:        { type: String },
  systemIntegrated:      { type: String },
  integratedApproach:    { type: String },
  integratedMgmt:        { type: String },
  integrationPercentage: { type: String },

  // ── ISO 50001 specific
  annualEnergyConsumption: { type: String },
  enmsPersonnels:          { type: Number },
  energySources:           { type: String },
  significantEnergyUses:   { type: String },

  // ── ISO 14001 / 45001 specific
  locationConditions:    [{ type: String }],
  airEmissionFacility:   { type: String },
  wastewaterFacility:    { type: String },
  wastesAmount:          { type: String },
  hazardousChemicals:    { type: String },
  pollutionClearance:    { type: String },
  criticalAspectsOHSAS:  { type: String },
  envAspectDetails:      { type: String },
  personnelOnSite:       { type: String },
  personnelAwayFromSite: { type: String },
  risksAwayFromSite:     { type: String },
  ohsmsSignificantRisk:  { type: String },
  notRegulatedByLaw:     { type: String },
  relevantLaws:          { type: String },

  // ── Assignment
  client:           { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
  assignedAuditor:  { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
  assignedReviewer: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
  // BUG FIX 3: null is not in enum — removed default:null, use sparse allow
  auditAcceptanceStatus: { type: String, enum: ['pending','accepted','rejected',null,''] },
  auditAcceptedDate:     { type: Date },

  // ── Documents (S3 file links)
  applicationForm: { type: String },
  agreement:       { type: String },
  signedForm:      { type: String },
  auditReport:     { type: String },
  reviewReport:    { type: String },
  proofId:         { type: String },
  certificate:     { url: { type: String }, issuedAt: { type: Date } },
  uploadedDocuments: [uploadedDocSchema],

  // ── Payment
  paymentStatus: { type: String, enum: ['pending','partially_received','received'], default: 'pending' },
  paymentAmount: { type: Number, default: 0 },
  paymentDate:   { type: Date },

  // ── Notes
  auditNotes:  { type: String, default: '' },
  reviewNotes: { type: String, default: '' },
  adminNotes:  { type: String, default: '' },

  feedbacks:   [feedbackSchema],
  submittedAt: { type: Date },
}, { timestamps: true, strict: false }); // strict:false lets extra frontend fields pass through

// Auto-generate applicationId before save
// Mongoose 6+: async pre hooks must NOT take next — just return the promise
applicationSchema.pre('save', async function () {
  if (this.isNew && !this.applicationId) {
    const Model = mongoose.model('Application');
    // Use the highest existing APPnnnn + 1 (count-based ids collide after deletions)
    const last = await Model.findOne({ applicationId: /^APP\d+$/ })
      .sort({ applicationId: -1 }).select('applicationId').lean();
    let next = last ? parseInt(last.applicationId.replace('APP', ''), 10) + 1 : 1000;
    // Guard against any gap collisions
    while (await Model.exists({ applicationId: `APP${String(next).padStart(4, '0')}` })) next++;
    this.applicationId = `APP${String(next).padStart(4, '0')}`;
  }
});

module.exports = mongoose.model('Application', applicationSchema);
