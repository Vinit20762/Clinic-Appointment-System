require('dotenv').config();

const express    = require('express');
const cors       = require('cors');
const helmet     = require('helmet');
const morgan     = require('morgan');
const rateLimit  = require('express-rate-limit');

const { testConnection } = require('./config/db');

// Route imports
const authRoutes        = require('./routes/authRoutes');
const adminRoutes       = require('./routes/adminRoutes');
const doctorRoutes      = require('./routes/doctorRoutes');
const patientRoutes     = require('./routes/patientRoutes');
const appointmentRoutes = require('./routes/appointmentRoutes');
const tokenRoutes       = require('./routes/tokenRoutes');
const reportRoutes      = require('./routes/reportRoutes');

const app = express();

// ------------------------------------------------------------------
// Security & utility middleware
// ------------------------------------------------------------------
app.use(helmet());   // sets sensible HTTP security headers
app.use(morgan(process.env.NODE_ENV === 'production' ? 'combined' : 'dev'));

// CORS — only allow our frontend origin
app.use(cors({
  origin:      process.env.CLIENT_URL || 'http://localhost:5173',
  credentials: true,
}));

// Rate-limit all /api routes to 100 requests per 15 minutes per IP
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max:      100,
  message:  { success: false, message: 'Too many requests, please try again later.' },
});
app.use('/api', apiLimiter);

// Parse JSON bodies
app.use(express.json({ limit: '10kb' }));
app.use(express.urlencoded({ extended: true }));

// ------------------------------------------------------------------
// Routes
// ------------------------------------------------------------------
app.use('/api/auth',         authRoutes);
app.use('/api/admin',        adminRoutes);
app.use('/api/doctor',       doctorRoutes);
app.use('/api/patient',      patientRoutes);
app.use('/api/appointments', appointmentRoutes);
app.use('/api/tokens',       tokenRoutes);
app.use('/api/reports',      reportRoutes);

// Health check
app.get('/api/health', (_req, res) => {
  res.json({ success: true, message: 'Clinic API is running', timestamp: new Date() });
});

// 404 handler
app.use((_req, res) => {
  res.status(404).json({ success: false, message: 'Route not found' });
});

// Global error handler — keeps stack traces out of prod responses
app.use((err, _req, res, _next) => {
  console.error('Unhandled error:', err);
  const status  = err.status  || 500;
  const message = process.env.NODE_ENV === 'production'
    ? 'Internal server error'
    : err.message;
  res.status(status).json({ success: false, message });
});

// ------------------------------------------------------------------
// Boot
// ------------------------------------------------------------------
const PORT = process.env.PORT || 5000;

(async () => {
  await testConnection();
  app.listen(PORT, () => {
    console.log(`🚀  Server running on http://localhost:${PORT}`);
    console.log(`    Environment: ${process.env.NODE_ENV || 'development'}`);
  });
})();
