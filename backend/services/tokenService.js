const { pool } = require('../config/db');

/**
 * generateToken
 * -------------
 * Core of the queue system.
 * Finds the highest existing token for a doctor on a given date and
 * returns the next one. This runs inside the caller's transaction so
 * we don't need to acquire a separate lock.
 *
 * @param {object} conn  - An active mysql2 connection (with transaction)
 * @param {number} doctorId
 * @param {string} date  - 'YYYY-MM-DD'
 * @returns {Promise<number>} - The new token number (1-based)
 */
const generateToken = async (conn, doctorId, date) => {
  // MAX() returns NULL if no rows exist, so COALESCE falls back to 0
  const [[{ maxToken }]] = await conn.query(
    `SELECT COALESCE(MAX(token_number), 0) AS maxToken
     FROM appointments
     WHERE doctor_id = ? AND date = ?`,
    [doctorId, date]
  );

  const newToken = maxToken + 1;

  // Keep the tokens table in sync (upsert)
  await conn.query(
    `INSERT INTO tokens (doctor_id, date, current_token)
     VALUES (?, ?, 0)
     ON DUPLICATE KEY UPDATE doctor_id = doctor_id`,  // no-op if row exists
    [doctorId, date]
  );

  return newToken;
};

module.exports = { generateToken };
