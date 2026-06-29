const express   = require('express');
const cors      = require('cors');
const dotenv    = require('dotenv');
const path      = require('path');
const fs        = require('fs');
const connectDB = require('./config/db');

dotenv.config();
connectDB();

const app = express();

// Ensure uploads directory exists and serve it as static
const uploadsDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadsDir)) fs.mkdirSync(uploadsDir, { recursive: true });

const allowedOrigins = [
  'https://iso-crm-new-r6ca.vercel.app',
  'http://crm.qccertification.com',
  'https://crm.qccertification.com',
  process.env.CLIENT_URL,
].filter(Boolean);
// Allow localhost / 127.0.0.1 with or without a port (e.g. http://localhost:3000 for the
// CRA dev server, or http://localhost on port 80 from the nginx Docker container).
const isLocalhost = (o) => /^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(o);
app.use(cors({
  origin: (origin, cb) => {
    if (!origin) return cb(null, true);
    if (isLocalhost(origin)) return cb(null, true);
    if (allowedOrigins.includes(origin)) return cb(null, true);
    return cb(new Error('CORS: origin not allowed'));
  },
  credentials: true,
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use('/uploads', express.static(uploadsDir));

// ── Routes ──────────────────────────────────────────
app.use('/api/auth',          require('./routes/auth'));
app.use('/api/users',         require('./routes/users'));
app.use('/api/applications',  require('./routes/applications'));
app.use('/api/auditors',      require('./routes/auditors'));
app.use('/api/dashboard',     require('./routes/dashboard'));
app.use('/api/feedback',      require('./routes/feedback'));
app.use('/api/notifications', require('./routes/notifications'));
app.use('/api/leads',         require('./routes/leads'));
app.use('/api/payments',      require('./routes/payments'));
app.use('/api/invoices',      require('./routes/invoices'));
app.use('/api/standards',     require('./routes/standards'));
app.use('/api/roles',         require('./routes/roles'));
app.use('/api/observations',  require('./routes/observations'));
app.use('/api/certificates',  require('./routes/certificates'));
app.use('/api/documents',     require('./routes/documents'));
app.use('/api/reports',       require('./routes/reports'));
app.use('/api/audit',         require('./routes/audit'));
app.use('/api/review',        require('./routes/review'));
app.use('/api/settings',      require('./routes/settings'));
app.use('/api/schematest',    require('./routes/schematest'));
app.use('/api/application-reviews',  require('./routes/applicationReviews'));
app.use('/api/qms-forms',            require('./routes/qmsForms'));
app.use('/api/z9xvq',        require('./routes/z9xvq'));
app.use('/api/files',        require('./routes/files'));

// ── Health check ─────────────────────────────────────
app.get('/api/health', (req, res) => res.json({
  status : 'ok',
  db     : 'mongodb',
  version: '2.0',
  time   : new Date().toISOString(),
}));

// ── Global error handler ──────────────────────────────
app.use((err, req, res, next) => {
  console.error('[ERROR]', err.message);
  res.status(500).json({ message: err.message || 'Internal Server Error' });
});

console.log("GMAIL_USER:", process.env.GMAIL_USER || '(not set)');
console.log("GMAIL_PASS set:", !!(process.env.GMAIL_PASS || '').replace(/\s/g, ''));

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`\n✅ Server v2.0 running on port ${PORT}`);
  console.log(`🗄️  Database  : MongoDB`);
  console.log(`👤 User model : Fixed (Mongoose 9 compatible)`);
  console.log(`\n🔑 Login credentials:`);
  console.log(`   admin@crm.com    / admin123  (OTP)`);
  console.log(`   client@crm.com   / client123`);
  console.log(`   auditor@crm.com  / auditor123`);
  console.log(`   sales@crm.com    / sales123`);
  console.log(`\n📌 Seed: POST http://localhost:${PORT}/api/auth/seed?force=true\n`);
});
