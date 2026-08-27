const mongoose = require('mongoose');

const paymentSchema = new mongoose.Schema({
  name:          { type: String, required: true },
  transactionId: { type: String, required: true },
  applicationId: { type: mongoose.Schema.Types.ObjectId, ref: 'Application', default: null, index: true },
  amount:        { type: Number, required: true },
  paymentStatus: { type: String, enum: ['pending','partially_received','received'], default: 'pending', index: true },
  paymentDate:   { type: Date },
}, { timestamps: true });

module.exports = mongoose.model('Payment', paymentSchema);
