const mongoose = require('mongoose');

const qmsFormSchema = new mongoose.Schema({
  clientId:  { type: String, required: true },
  clientRef: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  formType:  { type: Number, required: true, min: 1, max: 23 },
  // Which certification cycle (Initial+Surveillances, then a new one per
  // recertification-before-expiry) this form belongs to. A Client ID persists
  // across cycles, so cycleNumber is what actually separates them.
  cycleNumber: { type: Number, default: 1, min: 1 },
  // Which stage within a cycle this record belongs to. Several formTypes (e.g. the
  // CAR forms 12/13, or the Application Form 1) are reachable from more than one
  // stage's nav section — without this, those stages would all silently read/write
  // the exact same document. 'initial' only exists in cycle 1; every later cycle
  // only ever uses surv1/surv2/recert (see Layout.js buildCycleGroupedNav).
  phase:     { type: String, enum: ['initial', 'surv1', 'surv2', 'recert'], default: 'initial' },
  formCode:  { type: String },
  formName:  { type: String },
  status:    { type: String, enum: ['draft', 'saved', 'completed'], default: 'draft' },
  formData:  { type: mongoose.Schema.Types.Mixed, default: {} },
  // For F01: the Application record created when a client submits this form
  application: { type: mongoose.Schema.Types.ObjectId, ref: 'Application' },
}, { timestamps: true });

qmsFormSchema.index({ clientId: 1, formType: 1, cycleNumber: 1, phase: 1 }, { unique: true });

module.exports = mongoose.model('QMSForm', qmsFormSchema);
