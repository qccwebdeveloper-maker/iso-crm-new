const mongoose = require('mongoose');

const certSchema = new mongoose.Schema({
  orgName:          { type: String, required: true },
  standard:         { type: String, required: true },
  scope:            { type: String },
  address:          { type: String },
  additionalSites:  { type: String },
  contactPerson:    { type: String },
  designation:      { type: String },
  contactNumber:    { type: String },
  email:            { type: String },
  auditorName:      { type: String },
  auditorRole:      { type: String, enum: ['Lead Auditor','Auditor','Technical Expert',''] },
  iafCode:          { type: String },
  accreditation:    { type: String, default: 'NABCB' },
  certNumber:       { type: String, required: true, unique: true },
  issueDate:        { type: Date },
  expiryDate:       { type: Date },
  surveillanceDate: { type: Date },   // 1st surveillance due
  surveillanceDate2:{ type: Date },   // 2nd surveillance due
  originalCertDate: { type: Date },
  notes:            { type: String },
  linkedApplication:{ type: mongoose.Schema.Types.ObjectId, ref: 'Application', default: null },
}, { timestamps: true });

module.exports = mongoose.model('Certificate', certSchema);
