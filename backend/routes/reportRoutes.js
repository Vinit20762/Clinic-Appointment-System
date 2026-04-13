const express        = require('express');
const { dailyReport, doctorReport } = require('../controllers/reportController');
const verifyToken    = require('../middleware/auth');
const authorizeRole  = require('../middleware/authorize');

const router = express.Router();

// Only admins can pull reports
router.use(verifyToken, authorizeRole(['admin', 'doctor']));

router.get('/daily',        dailyReport);
router.get('/doctor/:id',   doctorReport);

module.exports = router;
