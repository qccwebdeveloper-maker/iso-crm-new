const mongoose = require('mongoose');

const qmsFormSchema = new mongoose.Schema({
  clientId:  { type: String, required: true },
  clientRef: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  formType:  { type: Number, required: true, min: 1, max: 22 },
  formCode:  { type: String },
  formName:  { type: String },
  status:    { type: String, enum: ['draft', 'saved', 'completed'], default: 'draft' },
  formData:  { type: mongoose.Schema.Types.Mixed, default: {} },
  // For F01: the Application record created when a client submits this form
  application: { type: mongoose.Schema.Types.ObjectId, ref: 'Application' },
}, { timestamps: true });

qmsFormSchema.index({ clientId: 1, formType: 1 }, { unique: true });

module.exports = mongoose.model('QMSForm', qmsFormSchema);
