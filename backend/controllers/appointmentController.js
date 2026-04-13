const { pool }      = require('../config/db');
const { generateToken } = require('../services/tokenService');
const notify            = require('../services/notificationService');

// ------------------------------------------------------------------
// Helper: get patient.id from the logged-in user
// ------------------------------------------------------------------
const getPatientId = async (userId) => {
  const [rows] = await pool.query(
    'SELECT id FROM patients WHERE user_id = ?',
    [userId]
  );
  return rows.length > 0 ? rows[0].id : null;
};

// ------------------------------------------------------------------
// POST /api/appointments/book
// Patient books an appointment — token auto-assigned
// ------------------------------------------------------------------
const bookAppointment = async (req, res) => {
  const { doctor_id, date, time, notes } = req.body;

  try {
    const patientId = await getPatientId(req.user.id);
    if (!patientId) {
      return res.status(404).json({ success: false, message: 'Patient profile not found.' });
    }

    // 1. Verify the doctor exists
    const [doctorRows] = await pool.query(
      `SELECT d.id, u.name AS doctor_name, u.email AS doctor_email
       FROM doctors d JOIN users u ON u.id = d.user_id
       WHERE d.id = ?`,
      [doctor_id]
    );
    if (doctorRows.length === 0) {
      return res.status(404).json({ success: false, message: 'Doctor not found.' });
    }
    const doctor = doctorRows[0];

    // 2. Check doctor has availability on that date
    const [avail] = await pool.query(
      `SELECT id FROM availability
       WHERE doctor_id = ? AND date = ? AND start_time <= ? AND end_time >= ?`,
      [doctor_id, date, time, time]
    );
    if (avail.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Doctor is not available at the selected date/time.',
      });
    }

    // 3. Prevent double-booking: same patient, same doctor, same date
    const [existing] = await pool.query(
      `SELECT id FROM appointments
       WHERE patient_id = ? AND doctor_id = ? AND date = ? AND status NOT IN ('cancelled')`,
      [patientId, doctor_id, date]
    );
    if (existing.length > 0) {
      return res.status(409).json({
        success: false,
        message: 'You already have an active appointment with this doctor on this date.',
      });
    }

    // 4. Begin transaction: generate token + insert appointment atomically
    const conn = await pool.getConnection();
    try {
      await conn.beginTransaction();

      const tokenNumber = await generateToken(conn, doctor_id, date);

      const [result] = await conn.query(
        `INSERT INTO appointments (patient_id, doctor_id, date, time, status, token_number, notes)
         VALUES (?, ?, ?, ?, 'booked', ?, ?)`,
        [patientId, doctor_id, date, time, tokenNumber, notes || null]
      );

      await conn.commit();

      // 5. Mock notification
      notify.sendBookingConfirmation({
        patientName:  req.user.name,
        patientEmail: req.user.email,
        doctorName:   doctor.doctor_name,
        date,
        time,
        tokenNumber,
      });

      return res.status(201).json({
        success:     true,
        message:     'Appointment booked successfully.',
        appointment: {
          id:           result.insertId,
          doctor_id,
          date,
          time,
          token_number: tokenNumber,
          status:       'booked',
        },
      });
    } catch (txErr) {
      await conn.rollback();
      throw txErr;
    } finally {
      conn.release();
    }
  } catch (err) {
    console.error('bookAppointment error:', err);
    res.status(500).json({ success: false, message: 'Booking failed.' });
  }
};

// ------------------------------------------------------------------
// PUT /api/appointments/reschedule/:id
// Patient reschedules their appointment (new date/time → new token)
// ------------------------------------------------------------------
const rescheduleAppointment = async (req, res) => {
  const { id }             = req.params;
  const { date, time }     = req.body;

  try {
    const patientId = await getPatientId(req.user.id);
    if (!patientId) {
      return res.status(404).json({ success: false, message: 'Patient profile not found.' });
    }

    // Ownership + status check
    const [apptRows] = await pool.query(
      'SELECT id, doctor_id, status, date, time FROM appointments WHERE id = ? AND patient_id = ?',
      [id, patientId]
    );
    if (apptRows.length === 0) {
      return res.status(404).json({ success: false, message: 'Appointment not found.' });
    }
    const appt = apptRows[0];

    if (!['booked', 'rescheduled'].includes(appt.status)) {
      return res.status(400).json({
        success: false,
        message: 'Only booked or previously rescheduled appointments can be rescheduled.',
      });
    }

    // Check doctor availability on new date/time
    const [avail] = await pool.query(
      `SELECT id FROM availability
       WHERE doctor_id = ? AND date = ? AND start_time <= ? AND end_time >= ?`,
      [appt.doctor_id, date, time, time]
    );
    if (avail.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Doctor is not available at the new date/time.',
      });
    }

    // Check no double-booking on new date (excluding this appointment)
    const [conflict] = await pool.query(
      `SELECT id FROM appointments
       WHERE patient_id = ? AND doctor_id = ? AND date = ?
         AND status NOT IN ('cancelled') AND id != ?`,
      [patientId, appt.doctor_id, date, id]
    );
    if (conflict.length > 0) {
      return res.status(409).json({
        success: false,
        message: 'You already have an appointment with this doctor on the new date.',
      });
    }

    const conn = await pool.getConnection();
    try {
      await conn.beginTransaction();

      const newToken = await generateToken(conn, appt.doctor_id, date);

      await conn.query(
        `UPDATE appointments
         SET date = ?, time = ?, token_number = ?, status = 'rescheduled'
         WHERE id = ?`,
        [date, time, newToken, id]
      );

      await conn.commit();

      notify.sendRescheduleNotice({
        patientEmail: req.user.email,
        patientName:  req.user.name,
        newDate:      date,
        newTime:      time,
        tokenNumber:  newToken,
      });

      return res.json({
        success: true,
        message: 'Appointment rescheduled.',
        newToken,
      });
    } catch (txErr) {
      await conn.rollback();
      throw txErr;
    } finally {
      conn.release();
    }
  } catch (err) {
    console.error('rescheduleAppointment error:', err);
    res.status(500).json({ success: false, message: 'Reschedule failed.' });
  }
};

// ------------------------------------------------------------------
// DELETE /api/appointments/cancel/:id
// Patient cancels their appointment
// ------------------------------------------------------------------
const cancelAppointment = async (req, res) => {
  const { id } = req.params;

  try {
    const patientId = await getPatientId(req.user.id);
    if (!patientId) {
      return res.status(404).json({ success: false, message: 'Patient profile not found.' });
    }

    const [apptRows] = await pool.query(
      'SELECT id, status, date FROM appointments WHERE id = ? AND patient_id = ?',
      [id, patientId]
    );
    if (apptRows.length === 0) {
      return res.status(404).json({ success: false, message: 'Appointment not found.' });
    }

    if (apptRows[0].status === 'cancelled') {
      return res.status(400).json({ success: false, message: 'Appointment is already cancelled.' });
    }
    if (apptRows[0].status === 'completed') {
      return res.status(400).json({ success: false, message: 'Cannot cancel a completed appointment.' });
    }

    await pool.query(
      "UPDATE appointments SET status = 'cancelled' WHERE id = ?",
      [id]
    );

    notify.sendCancellationNotice({
      patientEmail: req.user.email,
      patientName:  req.user.name,
      date:         apptRows[0].date,
    });

    return res.json({ success: true, message: 'Appointment cancelled.' });
  } catch (err) {
    console.error('cancelAppointment error:', err);
    res.status(500).json({ success: false, message: 'Cancellation failed.' });
  }
};

// ------------------------------------------------------------------
// GET /api/appointments/:id
// Patient or Doctor can view a single appointment detail
// ------------------------------------------------------------------
const getAppointmentById = async (req, res) => {
  const { id } = req.params;

  try {
    const [rows] = await pool.query(
      `SELECT a.*,
              pu.name  AS patient_name,
              pu.email AS patient_email,
              p.phone  AS patient_phone,
              du.name  AS doctor_name,
              d.specialization
       FROM appointments a
       JOIN patients pa ON pa.id = a.patient_id
       JOIN users    pu ON pu.id = pa.user_id
       JOIN doctors  d  ON d.id  = a.doctor_id
       JOIN users    du ON du.id = d.user_id
       WHERE a.id = ?`,
      [id]
    );

    if (rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Appointment not found.' });
    }

    const appt = rows[0];

    // Authorization: patient sees only their own; doctor sees only their patient's
    if (req.user.role === 'patient') {
      const patientId = await getPatientId(req.user.id);
      if (appt.patient_id !== patientId) {
        return res.status(403).json({ success: false, message: 'Access denied.' });
      }
    }

    return res.json({ success: true, appointment: appt });
  } catch (err) {
    console.error('getAppointmentById error:', err);
    res.status(500).json({ success: false, message: 'Could not fetch appointment.' });
  }
};

module.exports = {
  bookAppointment,
  rescheduleAppointment,
  cancelAppointment,
  getAppointmentById,
};
