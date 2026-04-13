const express    = require('express');
const { body }   = require('express-validator');
const { register, login, getMe } = require('../controllers/authController');
const verifyToken     = require('../middleware/auth');
const handleErrors    = require('../middleware/validate');

const router = express.Router();

// Validation rules
const registerRules = [
  body('name').trim().notEmpty().withMessage('Name is required').isLength({ max: 100 }),
  body('email').isEmail().withMessage('Valid email required').normalizeEmail(),
  body('password')
    .isLength({ min: 8 }).withMessage('Password must be at least 8 characters')
    .matches(/[A-Z]/).withMessage('Password must contain an uppercase letter')
    .matches(/[0-9]/).withMessage('Password must contain a number'),
  body('age').optional().isInt({ min: 0, max: 150 }).withMessage('Invalid age'),
  body('gender').optional().isIn(['male', 'female', 'other']).withMessage('Invalid gender'),
  body('phone').optional().isMobilePhone().withMessage('Invalid phone number'),
];

const loginRules = [
  body('email').isEmail().withMessage('Valid email required').normalizeEmail(),
  body('password').notEmpty().withMessage('Password is required'),
];

router.post('/register', registerRules, handleErrors, register);
router.post('/login',    loginRules,    handleErrors, login);
router.get('/me',        verifyToken,   getMe);

module.exports = router;
