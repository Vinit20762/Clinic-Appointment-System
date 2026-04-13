const express    = require('express');
const { body }   = require('express-validator');
const {
  addDoctor, getDoctors, deleteDoctor, getPatients, getReports,
} = require('../controllers/adminController');
const verifyToken  = require('../middleware/auth');
const authorizeRole = require('../middleware/authorize');
const handleErrors  = require('../middleware/validate');

const router = express.Router();

// All admin routes require a valid JWT AND the admin role
router.use(verifyToken, authorizeRole(['admin']));

const addDoctorRules = [
  body('name').trim().notEmpty().withMessage('Name is required'),
  body('email').isEmail().withMessage('Valid email required').normalizeEmail(),
  body('password').isLength({ min: 8 }).withMessage('Password must be 8+ characters'),
  body('specialization').trim().notEmpty().withMessage('Specialization is required'),
];

router.post('/add-doctor',   addDoctorRules, handleErrors, addDoctor);
router.get('/doctors',       getDoctors);
router.delete('/doctors/:id', deleteDoctor);
router.get('/patients',      getPatients);
router.get('/reports',       getReports);

module.exports = router;
