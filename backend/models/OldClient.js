const mongoose = require('mongoose');

// Legacy/pre-CRM clients: onboarded before this system existed, so they have
// no User account or QMS cycle — just company info plus scanned paperwork
// (agreement, invoices, GST/Udyam certs) kept for reference.
const documentSchema = new mongoose.Schema({
  name:         { type: String },
  originalName: { type: String },
  path:         { type: String, required: true },
  publicId:     { type: String },
  docType:      { type: String, enum: ['agreement', 'invoice', 'certificate', 'gstCertificate', 'udyamCertificate', 'other'], default: 'other' },
  uploadedAt:   { type: Date, default: Date.now },
}, { _id: true });

const oldClientSchema = new mongoose.Schema({
  companyName:    { type: String, required: true },
  contactPerson:  { type: String },
  phone:          { type: String },
  email:          { type: String },
  address:        { type: String },
  isoStandard:    { type: String },
  gstNumber:      { type: String },
  udyamNumber:    { type: String },
  notes:          { type: String },
  documents:      [documentSchema],
  createdBy:      { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  // Set when this record was auto-created by the Drive sync (see
  // routes/oldClients.js POST /drive/sync) — lets the sync skip folders it
  // has already imported instead of duplicating them on every run.
  driveFolderId:  { type: String, index: true, unique: true, sparse: true },
}, { timestamps: true });

module.exports = mongoose.model('OldClient', oldClientSchema);
