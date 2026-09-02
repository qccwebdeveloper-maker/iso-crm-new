const mongoose = require('mongoose');

const observationSchema = new mongoose.Schema({
  applicationId:    { type: String, required: true, index: true },
  application:      { type: mongoose.Schema.Types.ObjectId, ref: 'Application' },
  type:             { type: String, enum: ['Major NC','Minor NC','OFI','Observation'], required: true },
  description:      { type: String, required: true },
  corrective_action:{ type: String },
  raisedBy:         { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  raisedByName:     { type: String },
  status:           { type: String, enum: ['Open','Closed'], default: 'Open', index: true },
  closedAt:         { type: Date },
}, { timestamps: true });

module.exports = mongoose.model('Observation', observationSchema);
