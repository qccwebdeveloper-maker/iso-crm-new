const mongoose = require('mongoose');

/* Three-step invoice / payment workflow:
   proforma  → admin creates & sends a proforma invoice to the client
   payment   → admin records the payment the client made (type / bank / amount / date)
   verified  → admin verifies the received amount
   final     → admin sends the final invoice to the client                              */
const invoiceSchema = new mongoose.Schema({
  clientId:         { type: String, required: true, index: true },
  clientRef:        { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  organizationName: { type: String },
  standard:         { type: String },
  address:          { type: String },
  invoiceNo:        { type: String },

  amount:           { type: Number, required: true },           // proforma (billed) amount

  stage:            { type: String, enum: ['proforma', 'payment', 'verified', 'final'], default: 'proforma' },
  proformaSentAt:   { type: Date },

  // Payment received
  paymentType:      { type: String, enum: ['full', 'half', 'part', ''], default: '' },
  bankName:         { type: String },                           // Axis / HDFC / Kotak / PayU / PayPal / Google Pay / Paytm / Cash / Other
  receivedAmount:   { type: Number },
  paymentDate:      { type: Date },

  // Verification
  verified:         { type: Boolean, default: false },
  verifiedAmount:   { type: Number },
  verifiedAt:       { type: Date },

  // Final invoice
  finalSentAt:      { type: Date },
}, { timestamps: true });

module.exports = mongoose.model('Invoice', invoiceSchema);
