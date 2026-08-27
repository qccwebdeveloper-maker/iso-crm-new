const mongoose = require('mongoose');

const documentSchema = new mongoose.Schema({
  name:            { type: String },
  originalName:    { type: String },
  path:            { type: String, required: true },   // access link: /api/files/<key> → presigned redirect
  publicId:        { type: String, required: true },   // S3 object key (used for delete/presign)
  s3Key:           { type: String },                   // same as publicId — explicit S3 key
  storageUrl:      { type: String },                   // raw S3 object URL (reference; bucket is private)
  docType:         { type: String, enum: ['applicationForm','agreement','signedForm','auditReport','reviewReport','certificate','proofId','document'], default: 'document' },
  applicationId:   { type: String },
  application:     { type: mongoose.Schema.Types.ObjectId, ref: 'Application', index: true },
  clientId:        { type: String },   // CLT-... code of the application's client
  client:          { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  uploadedBy:      { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  uploadedByName:  { type: String },
  fileSize:        { type: Number },
  mimeType:        { type: String },
  uploadedAt:      { type: Date, default: Date.now },
}, { timestamps: true });

module.exports = mongoose.model('Document', documentSchema);
