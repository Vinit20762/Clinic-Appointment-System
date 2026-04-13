const { pool } = require('../config/db');

// ------------------------------------------------------------------
// Helper: get the doctors.id for the logged-in doctor user
// ------------------------------------------------------------------
const getDoctorId = async (userId) => {
  const [rows] = await pool.query(
    'SELECT id FROM doctors WHERE user_id = ?',
    [userId]
  );
  return rows.length > 0 ? rows[0].id : null;
};

// ------------------------------------------------------------------
// POST /api/doctor/availability
// Doctor sets (or upserts) their availability for a date
// ------------------------------------------------------------------
const setAvailability = async (req, res) => {
  const { date, start_time, end_time } = req.body;

  try {
    const doctorId = await getDoctorId(req.user.id);
    if (!doctorId) {
      return res.status(404).json({ success: false, message: 'Doctor profile not found.' });
    }

    // Validate that end_time is after start_time
    if (start_time >= end_time) {
      return res.status(400).json({
        success: false,
        message: 'end_time must be after start_time.',
      });
    }

    // Upsert: if availability exists for that day, update it
    const [existing] = await pool.query(
      'SELECT id FROM availability WHERE doctor_id = ? AND date = ?',
      [doctorId, date]
    );

    if (existing.length > 0) {
      await pool.query(
        'UPDATE availability SET start_time = ?, end_time = ? WHERE doctor_id = ? AND date = ?',
        [start_time, end_time, doctorId, date]
      );
      return res.json({ success: true, message: 'Availability updated.' });
    }

    await pool.query(
      'INSERT INTO availability (doctor_id, date, start_time, end_time) VALUES (?, ?, ?, ?)',
      [doctorId, date, start_time, end_time]
    );

    return res.status(201).json({ success: true, message: 'Availability set successfully.' });
  } catch (err) {
    console.error('setAvailability error:', err);
    res.status(500).json({ success: false, message: 'Could not set availability.' });
  }
};

// ------------------------------------------------------------------
// GET /api/doctor/availability
// Doctor views all their availability windows
// ------------------------------------------------------------------
const getMyAvailability = async (req, res) => {
  try {
    const doctorId = await getDoctorId(req.user.id);
    if (!doctorId) {
      return res.status(404).json({ success: false, message: 'Doctor profile not found.' });
    }

    const [rows] = await pool.query(
      `SELECT id, date, start_time, end_time
       FROM availability
       WHERE doctor_id = ?
       ORDER BY date ASC`,
      [doctorId]
    );

    return res.json({ success: true, availability: rows });
  } catch (err) {
    console.error('getMyAvailability error:', err);
    res.status(500).json({ success: false, message: 'Could not fetch availability.' });
  }
};

// ------------------------------------------------------------------
// GET /api/doctor/appointments
// Doctor sees all their appointments (optionally filtered by date)
// ------------------------------------------------------------------
const getMyAppointments = async (req, res) => {
  const { date, status } = req.query;

  try {
    const doctorId = await getDoctorId(req.user.id);
    if (!doctorId) {
      return res.status(404).json({ success: false, message: 'Doctor profile not found.' });
    }

    let query = `
      SELECT a.id, a.date, a.time, a.status, a.token_number, a.notes, a.created_at,
             u.name  AS patient_name,
             u.email AS patient_email,
             p.age   AS patient_age,
             p.phone AS patient_phone,
             p.gender AS patient_gender
      FROM appointments a
      JOIN patients p ON p.id = a.patient_id
      JOIN users    u ON u.id = p.user_id
      WHERE a.doctor_id = ?
    `;
    const params = [doctorId];

    if (date) {
      query  += ' AND a.date = ?';
      params.push(date);
    }
    if (status) {
      query  += ' AND a.status = ?';
      params.push(status);
    }

    query += ' ORDER BY a.date ASC, a.token_number ASC';

    const [appointments] = await pool.query(query, params);

    return res.json({ success: true, appointments });
  } catch (err) {
    console.error('getMyAppointments error:', err);
    res.status(500).json({ success: false, message: 'Could not fetch appointments.' });
  }
};

// ------------------------------------------------------------------
// PUT /api/doctor/appointments/:id/status
// Doctor updates an appointment status (e.g., marks it completed)
// ------------------------------------------------------------------
const updateAppointmentStatus = async (req, res) => {
  const { id }     = req.params;
  const { status } = req.body;
  const allowed    = ['completed', 'cancelled'];

  if (!allowed.includes(status)) {
    return res.status(400).json({
      success: false,
      message: `Status must be one of: ${allowed.join(', ')}`,
    });
  }

  try {
    const doctorId = await getDoctorId(req.user.id);
    if (!doctorId) {
      return res.status(404).json({ success: false, message: 'Doctor profile not found.' });
    }

    // Make sure the appointment belongs to this doctor
    const [rows] = await pool.query(
      'SELECT id, status FROM appointments WHERE id = ? AND doctor_id = ?',
      [id, doctorId]
    );
    if (rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Appointment not found.' });
    }
    if (rows[0].status === 'cancelled') {
      return res.status(400).json({ success: false, message: 'Cannot modify a cancelled appointment.' });
    }

    await pool.query(
      'UPDATE appointments SET status = ? WHERE id = ?',
      [status, id]
    );

    return res.json({ success: true, message: `Appointment marked as ${status}.` });
  } catch (err) {
    console.error('updateAppointmentStatus error:', err);
    res.status(500).json({ success: false, message: 'Could not update appointment.' });
  }
};

// ------------------------------------------------------------------
// GET /api/doctor/token/current
// Returns the currently-being-served token and the waiting queue
// ------------------------------------------------------------------
const getCurrentToken = async (req, res) => {
  const { date } = req.query;
  const targetDate = date || new Date().toISOString().split('T')[0];

  try {
    const doctorId = await getDoctorId(req.user.id);
    if (!doctorId) {
      return res.status(404).json({ success: false, message: 'Doctor profile not found.' });
    }

    // Get or create the token tracker row
    let [tokenRows] = await pool.query(
      'SELECT current_token FROM tokens WHERE doctor_id = ? AND date = ?',
      [doctorId, targetDate]
    );

    let currentToken = 0;
    if (tokenRows.length === 0) {
      await pool.query(
        'INSERT INTO tokens (doctor_id, date, current_token) VALUES (?, ?, 0)',
        [doctorId, targetDate]
      );
    } else {
      currentToken = tokenRows[0].current_token;
    }

    // Waiting queue — all booked appointments for today ordered by token
    const [queue] = await pool.query(
      `SELECT a.id, a.token_number, a.time,
              u.name AS patient_name,
              p.phone AS patient_phone
       FROM appointments a
       JOIN patients p ON p.id = a.patient_id
       JOIN users    u ON u.id = p.user_id
       WHERE a.doctor_id = ? AND a.date = ? AND a.status = 'booked'
       ORDER BY a.token_number ASC`,
      [doctorId, targetDate]
    );

    return res.json({ success: true, currentToken, queue });
  } catch (err) {
    console.error('getCurrentToken error:', err);
    res.status(500).json({ success: false, message: 'Could not fetch token info.' });
  }
};

// ------------------------------------------------------------------
// POST /api/doctor/token/next
// Doctor calls the next token (advances current_token by 1)
// ------------------------------------------------------------------
const callNextToken = async (req, res) => {
  const { date } = req.body;
  const targetDate = date || new Date().toISOString().split('T')[0];

  try {
    const doctorId = await getDoctorId(req.user.id);
    if (!doctorId) {
      return res.status(404).json({ success: false, message: 'Doctor profile not found.' });
    }

    // Find the next booked token after current
    const [tokenRow] = await pool.query(
      'SELECT current_token FROM tokens WHERE doctor_id = ? AND date = ?',
      [doctorId, targetDate]
    );
    const current = tokenRow.length > 0 ? tokenRow[0].current_token : 0;

    const [nextAppt] = await pool.query(
      `SELECT id, token_number FROM appointments
       WHERE doctor_id = ? AND date = ? AND status = 'booked' AND token_number > ?
       ORDER BY token_number ASC
       LIMIT 1`,
      [doctorId, targetDate, current]
    );

    if (nextAppt.length === 0) {
      return res.json({ success: true, message: 'No more patients in the queue.', nextToken: null });
    }

    const nextToken = nextAppt[0].token_number;

    // Upsert the tokens row
    await pool.query(
      `INSERT INTO tokens (doctor_id, date, current_token) VALUES (?, ?, ?)
       ON DUPLICATE KEY UPDATE current_token = ?`,
      [doctorId, targetDate, nextToken, nextToken]
    );

    return res.json({ success: true, message: `Now serving token #${nextToken}`, nextToken });
  } catch (err) {
    console.error('callNextToken error:', err);
    res.status(500).json({ success: false, message: 'Could not advance token.' });
  }
};

// ------------------------------------------------------------------
// GET /api/doctor/profile
// Doctor views their own profile
// ------------------------------------------------------------------
const getDoctorProfile = async (req, res) => {
  try {
    const [rows] = await pool.query(
      `SELECT d.id, d.specialization, d.created_at,
              u.name, u.email
       FROM doctors d
       JOIN users u ON u.id = d.user_id
       WHERE d.user_id = ?`,
      [req.user.id]
    );

    if (rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Doctor profile not found.' });
    }

    return res.json({ success: true, doctor: rows[0] });
  } catch (err) {
    console.error('getDoctorProfile error:', err);
    res.status(500).json({ success: false, message: 'Could not fetch profile.' });
  }
};

module.exports = {
  setAvailability,
  getMyAvailability,
  getMyAppointments,
  updateAppointmentStatus,
  getCurrentToken,
  callNextToken,
  getDoctorProfile,
};
