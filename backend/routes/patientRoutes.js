const express       = require('express');
const { body }      = require('express-validator');
const {
  getProfile,
  updateProfile,
  getMyAppointments,
  getDoctors,
  getDoctorAvailability,
} = require('../controllers/patientController');
const verifyToken   = require('../middleware/auth');
const authorizeRole = require('../middleware/authorize');
const handleErrors  = require('../middleware/validate');

const router = express.Router();

// Patient-only routes
router.use(verifyToken, authorizeRole(['patient']));

router.get('/profile',   getProfile);
router.put('/profile',
  [
    body('name').optional().trim().notEmpty().withMessage('Name cannot be blank'),
    body('age').optional().isInt({ min: 0, max: 150 }).withMessage('Invalid age'),
    body('gender').optional().isIn(['male', 'female', 'other']),
    body('phone').optional().isMobilePhone().withMessage('Invalid phone'),
  ],
  handleErrors,
  updateProfile
);
router.get('/appointments',        getMyAppointments);
router.get('/doctors',             getDoctors);
router.get('/doctors/:id/availability', getDoctorAvailability);

module.exports = router;
