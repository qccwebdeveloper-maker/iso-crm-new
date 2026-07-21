const mongoose = require('mongoose');

// Master roster of auditors/technical experts and their on-file signature image,
// imported from the "List of Auditors Code Matrix" (Signature.xlsx). Used to
// auto-fill the Signature column on QMS forms (e.g. F-03 Auditor Declaration)
// whenever a signatory's name matches an entry here — no manual upload needed.
const auditorSignatureSchema = new mongoose.Schema({
  name:         { type: String, required: true, trim: true },
  nameKey:      { type: String, required: true, trim: true, lowercase: true, unique: true },
  location:     { type: String, trim: true },
  signatureUrl: { type: String, trim: true, default: '' },
}, { timestamps: true });

auditorSignatureSchema.pre('validate', function setNameKey() {
  if (this.name) this.nameKey = this.name.trim().toLowerCase();
});

module.exports = mongoose.model('AuditorSignature', auditorSignatureSchema);
