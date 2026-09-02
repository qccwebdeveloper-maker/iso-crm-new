const mongoose = require('mongoose');
const bcrypt   = require('bcryptjs');

const notificationSchema = new mongoose.Schema({
  message:   { type: String, required: true },
  type:      { type: String, enum: ['info','warning','success','error'], default: 'info' },
  read:      { type: Boolean, default: false },
  link:      { type: String },
  createdAt: { type: Date, default: Date.now },
}, { _id: true });

const userSchema = new mongoose.Schema({
  name:                 { type: String, required: true, trim: true },
  email:                { type: String, required: true, lowercase: true, trim: true },
  password:             { type: String, required: true },
  role:                 { type: String, enum: ['admin','client','auditor','reviewer','sales'], required: true, index: true },
  company:              { type: String, trim: true },
  country:              { type: String, trim: true },
  phone:                { type: String, trim: true },
  isActive:             { type: Boolean, default: true },
  pendingApproval:      { type: Boolean, default: false },
  clientId:             { type: String, index: true },
  // Set for client accounts auto-created from a legacy OldClient record (see
  // routes/oldClients.js POST /:id/create-login) — lets the frontend point them
  // at their legacy document viewer instead of the QMS/application dashboard.
  isLegacyClient:       { type: Boolean, default: false },
  branchLabel:          { type: String, trim: true },
  address:              { type: String },
  isoStandard:          { type: String },
  scope:                { type: String },
  profileImage:         { type: String },
  assignedApplications: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Application' }],
  notifications:        { type: [notificationSchema], default: [] },
}, { timestamps: true });

// Admin OTP login queries by both fields; keep that lookup indexed as user data grows.
userSchema.index({ email: 1, role: 1 });

// Static helper — hash any password string
userSchema.statics.hashPassword = (password) => bcrypt.hash(password, 10);

// Instance helper — compare entered password with stored hash
userSchema.methods.matchPassword = function (entered) {
  return bcrypt.compare(entered, this.password);
};

// Hide password from all JSON responses
userSchema.set('toJSON', {
  transform(doc, ret) {
    delete ret.password;
    return ret;
  },
});

module.exports = mongoose.model('User', userSchema);
