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
  // Set once an admin creates a client login for this legacy record (see
  // POST /:id/create-login) — the same value as the linked User's clientId,
  // so the client can log in with Client ID + `${clientId}@1234` and pull up
  // their own documents via GET /me.
  clientId:       { type: String, index: true, unique: true, sparse: true },
  linkedUser:     { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  // Plaintext copy of the login password created alongside linkedUser, kept
  // ONLY so an admin can look it up again later (the User doc only stores a
  // bcrypt hash, which can't be reversed) — random per client, not derivable
  // from clientId (see createLoginForOldClient), so this is the sole place
  // it's recoverable from after creation.
  loginPassword:  { type: String },
  // Set by backend/scripts/enrich-old-clients-from-documents.js once it has
  // tried to fill in companyName/isoStandard/phone from this record's
  // documents — whether or not anything was actually found. Lets a re-run
  // (after a restart, or a code fix mid-way through the ~8,000 records)
  // resume from where it left off instead of re-downloading and re-OCR'ing
  // every document all over again for records already attempted.
  enrichmentAttemptedAt: { type: Date, index: true },
}, { timestamps: true });

module.exports = mongoose.model('OldClient', oldClientSchema);
