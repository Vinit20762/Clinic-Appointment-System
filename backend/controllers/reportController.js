const { pool } = require('../config/db');

// ------------------------------------------------------------------
// GET /api/reports/daily?date=YYYY-MM-DD
// Returns appointment breakdown for a specific date (default: today)
// ------------------------------------------------------------------
const dailyReport = async (req, res) => {
  const date = req.query.date || new Date().toISOString().split('T')[0];

  try {
    // Per-status count
    const [statusBreakdown] = await pool.query(
      `SELECT status, COUNT(*) AS count
       FROM appointments
       WHERE date = ?
       GROUP BY status`,
      [date]
    );

    // All appointments for that day with patient + doctor details
    const [appointments] = await pool.query(
      `SELECT a.id, a.time, a.status, a.token_number,
              pu.name  AS patient_name,
              du.name  AS doctor_name,
              d.specialization
       FROM appointments a
       JOIN patients pa ON pa.id = a.patient_id
       JOIN users    pu ON pu.id = pa.user_id
       JOIN doctors  d  ON d.id  = a.doctor_id
       JOIN users    du ON du.id = d.user_id
       WHERE a.date = ?
       ORDER BY a.token_number ASC`,
      [date]
    );

    return res.json({
      success: true,
      report: { date, statusBreakdown, appointments, total: appointments.length },
    });
  } catch (err) {
    console.error('dailyReport error:', err);
    res.status(500).json({ success: false, message: 'Could not generate daily report.' });
  }
};

// ------------------------------------------------------------------
// GET /api/reports/doctor/:id?from=YYYY-MM-DD&to=YYYY-MM-DD
// Doctor-wise report with optional date range
// ------------------------------------------------------------------
const doctorReport = async (req, res) => {
  const { id }   = req.params;
  const { from, to } = req.query;

  try {
    // Verify doctor exists
    const [docRows] = await pool.query(
      `SELECT d.id, d.specialization, u.name
       FROM doctors d JOIN users u ON u.id = d.user_id
       WHERE d.id = ?`,
      [id]
    );
    if (docRows.length === 0) {
      return res.status(404).json({ success: false, message: 'Doctor not found.' });
    }

    let query  = `
      SELECT a.id, a.date, a.time, a.status, a.token_number,
             pu.name AS patient_name
      FROM appointments a
      JOIN patients pa ON pa.id = a.patient_id
      JOIN users    pu ON pu.id = pa.user_id
      WHERE a.doctor_id = ?
    `;
    const params = [id];

    if (from) { query += ' AND a.date >= ?'; params.push(from); }
    if (to)   { query += ' AND a.date <= ?'; params.push(to);   }

    query += ' ORDER BY a.date DESC, a.token_number ASC';

    const [appointments] = await pool.query(query, params);

    // Aggregate by status
    const summary = appointments.reduce((acc, a) => {
      acc[a.status] = (acc[a.status] || 0) + 1;
      return acc;
    }, {});

    return res.json({
      success: true,
      report: {
        doctor:       docRows[0],
        dateRange:    { from: from || 'all time', to: to || 'present' },
        total:        appointments.length,
        summary,
        appointments,
      },
    });
  } catch (err) {
    console.error('doctorReport error:', err);
    res.status(500).json({ success: false, message: 'Could not generate doctor report.' });
  }
};

module.exports = { dailyReport, doctorReport };
