const bcrypt   = require('bcryptjs');
const { pool } = require('../config/db');

// ------------------------------------------------------------------
// POST /api/admin/add-doctor
// Admin only — creates a user with role='doctor' plus a doctors row
// ------------------------------------------------------------------
const addDoctor = async (req, res) => {
  const { name, email, password, specialization } = req.body;

  try {
    // Prevent duplicate emails
    const [existing] = await pool.query(
      'SELECT id FROM users WHERE email = ?',
      [email.toLowerCase().trim()]
    );
    if (existing.length > 0) {
      return res.status(409).json({ success: false, message: 'Email already in use.' });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const conn = await pool.getConnection();
    try {
      await conn.beginTransaction();

      const [userResult] = await conn.query(
        'INSERT INTO users (name, email, password, role) VALUES (?, ?, ?, ?)',
        [name.trim(), email.toLowerCase().trim(), hashedPassword, 'doctor']
      );
      const userId = userResult.insertId;

      const [doctorResult] = await conn.query(
        'INSERT INTO doctors (user_id, specialization) VALUES (?, ?)',
        [userId, specialization.trim()]
      );

      await conn.commit();

      return res.status(201).json({
        success: true,
        message: 'Doctor added successfully.',
        doctor: {
          id:             doctorResult.insertId,
          userId,
          name,
          email,
          specialization,
        },
      });
    } catch (txErr) {
      await conn.rollback();
      throw txErr;
    } finally {
      conn.release();
    }
  } catch (err) {
    console.error('addDoctor error:', err);
    res.status(500).json({ success: false, message: 'Could not add doctor.' });
  }
};

// ------------------------------------------------------------------
// GET /api/admin/doctors
// Admin only — list all doctors with user details
// ------------------------------------------------------------------
const getDoctors = async (req, res) => {
  try {
    const [doctors] = await pool.query(`
      SELECT d.id, d.specialization, d.created_at,
             u.id   AS user_id,
             u.name, u.email
      FROM doctors d
      JOIN users u ON u.id = d.user_id
      ORDER BY d.created_at DESC
    `);

    return res.json({ success: true, doctors });
  } catch (err) {
    console.error('getDoctors error:', err);
    res.status(500).json({ success: false, message: 'Could not fetch doctors.' });
  }
};

// ------------------------------------------------------------------
// DELETE /api/admin/doctors/:id
// Admin only — remove a doctor (cascades to availability & appointments)
// ------------------------------------------------------------------
const deleteDoctor = async (req, res) => {
  const { id } = req.params;

  try {
    const [result] = await pool.query('DELETE FROM doctors WHERE id = ?', [id]);

    if (result.affectedRows === 0) {
      return res.status(404).json({ success: false, message: 'Doctor not found.' });
    }

    return res.json({ success: true, message: 'Doctor removed.' });
  } catch (err) {
    console.error('deleteDoctor error:', err);
    res.status(500).json({ success: false, message: 'Could not delete doctor.' });
  }
};

// ------------------------------------------------------------------
// GET /api/admin/patients
// Admin only — list all patients
// ------------------------------------------------------------------
const getPatients = async (req, res) => {
  try {
    const [patients] = await pool.query(`
      SELECT p.id, p.age, p.gender, p.phone, p.created_at,
             u.id   AS user_id,
             u.name, u.email
      FROM patients p
      JOIN users u ON u.id = p.user_id
      ORDER BY p.created_at DESC
    `);

    return res.json({ success: true, patients });
  } catch (err) {
    console.error('getPatients error:', err);
    res.status(500).json({ success: false, message: 'Could not fetch patients.' });
  }
};

// ------------------------------------------------------------------
// GET /api/admin/reports
// Admin only — summary stats for the dashboard
// ------------------------------------------------------------------
const getReports = async (req, res) => {
  try {
    // Total counts
    const [[{ totalDoctors }]]  = await pool.query('SELECT COUNT(*) AS totalDoctors FROM doctors');
    const [[{ totalPatients }]] = await pool.query('SELECT COUNT(*) AS totalPatients FROM patients');
    const [[{ totalAppts }]]    = await pool.query('SELECT COUNT(*) AS totalAppts FROM appointments');

    // Appointments grouped by status
    const [statusBreakdown] = await pool.query(`
      SELECT status, COUNT(*) AS count
      FROM appointments
      GROUP BY status
    `);

    // Today's appointments
    const [[{ todayCount }]] = await pool.query(`
      SELECT COUNT(*) AS todayCount
      FROM appointments
      WHERE date = CURDATE()
    `);

    // Per-doctor appointment count (top 5)
    const [topDoctors] = await pool.query(`
      SELECT u.name AS doctor_name, d.specialization, COUNT(a.id) AS appointment_count
      FROM appointments a
      JOIN doctors d ON d.id = a.doctor_id
      JOIN users   u ON u.id = d.user_id
      GROUP BY a.doctor_id
      ORDER BY appointment_count DESC
      LIMIT 5
    `);

    return res.json({
      success: true,
      report: {
        totals: { doctors: totalDoctors, patients: totalPatients, appointments: totalAppts, today: todayCount },
        statusBreakdown,
        topDoctors,
      },
    });
  } catch (err) {
    console.error('getReports error:', err);
    res.status(500).json({ success: false, message: 'Could not generate report.' });
  }
};

module.exports = { addDoctor, getDoctors, deleteDoctor, getPatients, getReports };
