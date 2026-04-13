const express       = require('express');
const { body }      = require('express-validator');
const {
  bookAppointment,
  rescheduleAppointment,
  cancelAppointment,
  getAppointmentById,
} = require('../controllers/appointmentController');
const verifyToken   = require('../middleware/auth');
const authorizeRole = require('../middleware/authorize');
const handleErrors  = require('../middleware/validate');

const router = express.Router();

// All routes need a valid JWT
router.use(verifyToken);

const bookRules = [
  body('doctor_id').isInt({ min: 1 }).withMessage('Valid doctor_id required'),
  body('date').isDate().withMessage('Valid date required (YYYY-MM-DD)'),
  body('time').matches(/^\d{2}:\d{2}$/).withMessage('Valid time required (HH:MM)'),
  body('notes').optional().isLength({ max: 500 }),
];

const rescheduleRules = [
  body('date').isDate().withMessage('Valid date required'),
  body('time').matches(/^\d{2}:\d{2}$/).withMessage('Valid time required (HH:MM)'),
];

// Only patients can book / reschedule / cancel
router.post('/book',              authorizeRole(['patient']), bookRules,       handleErrors, bookAppointment);
router.put('/reschedule/:id',     authorizeRole(['patient']), rescheduleRules, handleErrors, rescheduleAppointment);
router.delete('/cancel/:id',      authorizeRole(['patient']),                               cancelAppointment);

// Both patients and doctors can view a single appointment
router.get('/:id', authorizeRole(['patient', 'doctor', 'admin']), getAppointmentById);

module.exports = router;
