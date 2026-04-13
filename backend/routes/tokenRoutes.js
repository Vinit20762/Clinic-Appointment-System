const express       = require('express');
const verifyToken   = require('../middleware/auth');

const router = express.Router();
router.use(verifyToken);

/**
 * GET /api/tokens/queue/:doctorId?date=YYYY-MM-DD
 * Public token queue — any logged-in user can see the queue
 * (patients use this to track their position)
 */
router.get('/queue/:doctorId', async (req, res) => {
  const { doctorId }  = req.params;
  const { pool }      = require('../config/db');
  const date          = req.query.date || new Date().toISOString().split('T')[0];

  try {
    const [[tokenRow]] = await pool.query(
      'SELECT current_token FROM tokens WHERE doctor_id = ? AND date = ?',
      [doctorId, date]
    );
    const currentToken = tokenRow ? tokenRow.current_token : 0;

    const [queue] = await pool.query(
      `SELECT a.id, a.token_number, a.time, a.status,
              u.name AS patient_name
       FROM appointments a
       JOIN patients p ON p.id = a.patient_id
       JOIN users    u ON u.id = p.user_id
       WHERE a.doctor_id = ? AND a.date = ? AND a.status = 'booked'
       ORDER BY a.token_number ASC`,
      [doctorId, date]
    );

    return res.json({ success: true, currentToken, queue, date });
  } catch (err) {
    console.error('tokenQueue error:', err);
    res.status(500).json({ success: false, message: 'Could not fetch queue.' });
  }
});

module.exports = router;
