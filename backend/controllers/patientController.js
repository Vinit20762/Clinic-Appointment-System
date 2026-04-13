const { pool } = require('../config/db');

// ------------------------------------------------------------------
// GET /api/patient/profile
// Patient views / edits their profile
// ------------------------------------------------------------------
const getProfile = async (req, res) => {
  try {
    const [rows] = await pool.query(
      `SELECT p.id, p.age, p.gender, p.phone, p.created_at,
              u.name, u.email
       FROM patients p
       JOIN users u ON u.id = p.user_id
       WHERE p.user_id = ?`,
      [req.user.id]
    );

    if (rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Patient profile not found.' });
    }

    return res.json({ success: true, profile: rows[0] });
  } catch (err) {
    console.error('getProfile error:', err);
    res.status(500).json({ success: false, message: 'Could not fetch profile.' });
  }
};

// ------------------------------------------------------------------
// PUT /api/patient/profile
// Patient updates their own profile
// ------------------------------------------------------------------
const updateProfile = async (req, res) => {
  const { name, age, gender, phone } = req.body;

  try {
    const conn = await pool.getConnection();
    try {
      await conn.beginTransaction();

      if (name) {
        await conn.query('UPDATE users SET name = ? WHERE id = ?', [name.trim(), req.user.id]);
      }

      await conn.query(
        `UPDATE patients SET age = ?, gender = ?, phone = ?
         WHERE user_id = ?`,
        [age || null, gender || null, phone || null, req.user.id]
      );

      await conn.commit();
      return res.json({ success: true, message: 'Profile updated.' });
    } catch (txErr) {
      await conn.rollback();
      throw txErr;
    } finally {
      conn.release();
    }
  } catch (err) {
    console.error('updateProfile error:', err);
    res.status(500).json({ success: false, message: 'Could not update profile.' });
  }
};

// ------------------------------------------------------------------
// GET /api/patient/appointments
// Patient views their own appointments with token position info
// ------------------------------------------------------------------
const getMyAppointments = async (req, res) => {
  try {
    const [patientRow] = await pool.query(
      'SELECT id FROM patients WHERE user_id = ?',
      [req.user.id]
    );
    if (patientRow.length === 0) {
      return res.status(404).json({ success: false, message: 'Patient profile not found.' });
    }

    const patientId = patientRow[0].id;

    const [appointments] = await pool.query(
      `SELECT a.id, a.date, a.time, a.status, a.token_number, a.notes, a.created_at,
              d.specialization,
              u.name  AS doctor_name,
              u.email AS doctor_email,
              t.current_token
       FROM appointments a
       JOIN doctors d ON d.id = a.doctor_id
       JOIN users   u ON u.id = d.user_id
       LEFT JOIN tokens t ON t.doctor_id = a.doctor_id AND t.date = a.date
       WHERE a.patient_id = ?
       ORDER BY a.date DESC, a.token_number ASC`,
      [patientId]
    );

    return res.json({ success: true, appointments });
  } catch (err) {
    console.error('getMyAppointments error:', err);
    res.status(500).json({ success: false, message: 'Could not fetch appointments.' });
  }
};

// ------------------------------------------------------------------
// GET /api/doctors  (public-facing list)
// Any authenticated user can view available doctors
// ------------------------------------------------------------------
const getDoctors = async (req, res) => {
  try {
    const [doctors] = await pool.query(
      `SELECT d.id, d.specialization,
              u.name, u.email
       FROM doctors d
       JOIN users u ON u.id = d.user_id
       ORDER BY u.name ASC`
    );

    return res.json({ success: true, doctors });
  } catch (err) {
    console.error('getDoctors error:', err);
    res.status(500).json({ success: false, message: 'Could not fetch doctors.' });
  }
};

// ------------------------------------------------------------------
// GET /api/doctors/:id/availability
// Patient checks a doctor's open slots before booking
// ------------------------------------------------------------------
const getDoctorAvailability = async (req, res) => {
  const { id }   = req.params;
  const { date } = req.query;

  try {
    let query  = 'SELECT id, date, start_time, end_time FROM availability WHERE doctor_id = ?';
    const params = [id];

    if (date) {
      query  += ' AND date = ?';
      params.push(date);
    } else {
      // Default: only show future availability
      query  += ' AND date >= CURDATE()';
    }

    query += ' ORDER BY date ASC';

    const [rows] = await pool.query(query, params);
    return res.json({ success: true, availability: rows });
  } catch (err) {
    console.error('getDoctorAvailability error:', err);
    res.status(500).json({ success: false, message: 'Could not fetch availability.' });
  }
};

module.exports = { getProfile, updateProfile, getMyAppointments, getDoctors, getDoctorAvailability };
