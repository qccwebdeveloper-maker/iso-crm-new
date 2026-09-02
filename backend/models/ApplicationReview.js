const mongoose = require('mongoose');

const auditTeamMemberSchema = new mongoose.Schema({
  role:       { type: String },
  name:       { type: String, default: '' },
  stage1Days: { type: String, default: '' },
  stage2Days: { type: String, default: '' },
}, { _id: false });

const applicationReviewSchema = new mongoose.Schema({
  applicationRef: { type: mongoose.Schema.Types.ObjectId, ref: 'Application', index: true },

  /* Section 1 — Basic Info */
  idNo:                   { type: String, default: '' },
  organizationName:       { type: String, default: '' },
  address:                { type: String, default: '' },
  contactPerson:          { type: String, default: '' },
  contactNumbers:         { type: String, default: '' },
  personsUnderCertification: { type: String, default: '' },
  auditType1:             { type: String, default: 'Stage I' },
  auditType2:             { type: String, default: 'Stage II' },
  auditStandards:         { type: String, default: '' },
  modeOfAudit:            { type: String, default: 'Onsite' },
  meetingLink:            { type: String, default: '' },
  scopeOfCertification:   { type: String, default: '' },
  auditLanguage:          { type: String, default: 'English' },
  iafCode:                { type: String, default: '' },

  /* Transfer */
  isTransfer:       { type: String, enum: ['Yes', 'No'], default: 'No' },
  ncClosed:         { type: String, default: '' },
  ncReason:         { type: String, default: '' },
  transferFromIAF:  { type: String, default: '' },
  certValidityDate: { type: Date },

  risk: { type: String, enum: ['H', 'M', 'L', ''], default: '' },

  /* Section 2 — Audit Team */
  auditTeam:        { type: [auditTeamMemberSchema], default: [] },
  totalManDays:     { type: String, default: '' },
  totalManDaysStages: { type: String, default: '' },
  totalManDaysIAF:  { type: String, default: '' },

  stage1From: { type: Date },
  stage1To:   { type: Date },
  stage2From: { type: Date },
  stage2To:   { type: Date },

  reviewerName:     { type: String, default: '' },
  reviewerDate:     { type: Date },
  verificationName: { type: String, default: '' },
  verificationDate: { type: Date },

  /* Section 3 — ISMS Manday (ISO 27001) */
  ismsPersonsControl:     { type: String, default: '' },
  ismsBaseAuditTime:      { type: String, default: '' },
  ismsComplexityAdj:      { type: String, default: '' },
  ismsAdditiveAdj:        { type: String, default: '' },
  ismsAdditionalTime:     { type: String, default: '' },
  ismsTotalFinalTime:     { type: String, default: '' },
  ismsStage1Time:         { type: String, default: '' },
  ismsStage2Time:         { type: String, default: '' },
  ismsBusinessComplexity: { type: String, default: '' },
  ismsITComplexity:       { type: String, default: '' },

  /* Section 4 — IMS Integrated Manday */
  imsOrgName:              { type: String, default: '' },
  imsEmployees:            { type: String, default: '' },
  imsApplicableStandards:  { type: String, default: '' },
  imsISO9001:              { type: String, default: '' },
  imsISO14001:             { type: String, default: '' },
  imsISO45001:             { type: String, default: '' },
  imsISO27001:             { type: String, default: '' },
  imsTotalBeforeIntegration: { type: String, default: '' },
  imsBusinessComplexity:   { type: String, default: '' },
  imsITComplexity:         { type: String, default: '' },
  imsImpactFactor:         { type: String, default: '' },
  imsISMSReduction:        { type: String, default: '' },
  imsLevelOfIntegration:   { type: String, default: '' },
  imsCombinedAuditAbility: { type: String, default: '' },
  imsIntegratedReduction:  { type: String, default: '' },
  imsManDayReduction:      { type: String, default: '' },
  imsFinalIntegratedManDays: { type: String, default: '' },
  imsOnSiteTime:           { type: String, default: '' },
  imsOffSiteTime:          { type: String, default: '' },
  imsStage1Audit:          { type: String, default: '' },
  imsStage2Audit:          { type: String, default: '' },
  imsTotalOnSite:          { type: String, default: '' },
  imsOffSitePlanning:      { type: String, default: '' },
  imsTotalIntegratedTime:  { type: String, default: '' },

  reviewStatus: {
    type: String,
    enum: ['draft', 'submitted', 'approved'],
    default: 'draft',
  },

  reviewedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
}, { timestamps: true });

module.exports = mongoose.model('ApplicationReview', applicationReviewSchema);
