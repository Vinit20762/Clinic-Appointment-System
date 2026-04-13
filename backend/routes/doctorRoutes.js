const express       = require('express');
const { body }      = require('express-validator');
const {
  setAvailability,
  getMyAvailability,
  getMyAppointments,
  updateAppointmentStatus,
  getCurrentToken,
  callNextToken,
  getDoctorProfile,
} = require('../controllers/doctorController');
const verifyToken   = require('../middleware/auth');
const authorizeRole = require('../middleware/authorize');
const handleErrors  = require('../middleware/validate');

const router = express.Router();

// All doctor routes require authentication + doctor role
router.use(verifyToken, authorizeRole(['doctor']));

const availabilityRules = [
  body('date').isDate().withMessage('Valid date required (YYYY-MM-DD)'),
  body('start_time').matches(/^\d{2}:\d{2}$/).withMessage('Valid start_time required (HH:MM)'),
  body('end_time').matches(/^\d{2}:\d{2}$/).withMessage('Valid end_time required (HH:MM)'),
];

router.get('/profile',               getDoctorProfile);
router.post('/availability',          availabilityRules, handleErrors, setAvailability);
router.get('/availability',           getMyAvailability);
router.get('/appointments',           getMyAppointments);
router.put('/appointments/:id/status',
  body('status').isIn(['completed', 'cancelled']).withMessage('Status must be completed or cancelled'),
  handleErrors,
  updateAppointmentStatus
);
router.get('/token/current',          getCurrentToken);
router.post('/token/next',
  body('date').optional().isDate().withMessage('Valid date required'),
  handleErrors,
  callNextToken
);

module.exports = router;
