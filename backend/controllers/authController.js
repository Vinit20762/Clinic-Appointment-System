const bcrypt = require('bcryptjs');
const jwt    = require('jsonwebtoken');
const { pool } = require('../config/db');
const notify   = require('../services/notificationService');

// ------------------------------------------------------------------
// Helper: sign a JWT with the user payload
// ------------------------------------------------------------------
const signToken = (user) =>
  jwt.sign(
    { id: user.id, email: user.email, role: user.role, name: user.name },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }
  );

// ------------------------------------------------------------------
// POST /api/auth/register
// Public — patients only can self-register
// ------------------------------------------------------------------
const register = async (req, res) => {
  const { name, email, password, age, gender, phone } = req.body;

  try {
    // Check for duplicate email
    const [existing] = await pool.query(
      'SELECT id FROM users WHERE email = ?',
      [email]
    );
    if (existing.length > 0) {
      return res.status(409).json({ success: false, message: 'Email already in use.' });
    }

    // Hash password — cost factor 10 is a solid balance of security vs speed
    const hashedPassword = await bcrypt.hash(password, 10);

    const conn = await pool.getConnection();
    try {
      await conn.beginTransaction();

      // Insert into users
      const [userResult] = await conn.query(
        'INSERT INTO users (name, email, password, role) VALUES (?, ?, ?, ?)',
        [name.trim(), email.toLowerCase().trim(), hashedPassword, 'patient']
      );
      const userId = userResult.insertId;

      // Insert into patients profile table
      await conn.query(
        'INSERT INTO patients (user_id, age, gender, phone) VALUES (?, ?, ?, ?)',
        [userId, age || null, gender || null, phone || null]
      );

      await conn.commit();

      // Mock notification
      notify.sendRegistrationConfirmation({ name, email });

      const token = signToken({ id: userId, email, role: 'patient', name });

      return res.status(201).json({
        success: true,
        message: 'Registration successful.',
        token,
        user: { id: userId, name, email, role: 'patient' },
      });
    } catch (txErr) {
      await conn.rollback();
      throw txErr;
    } finally {
      conn.release();
    }
  } catch (err) {
    console.error('register error:', err);
    res.status(500).json({ success: false, message: 'Registration failed.' });
  }
};

// ------------------------------------------------------------------
// POST /api/auth/login
// Public — all roles
// ------------------------------------------------------------------
const login = async (req, res) => {
  const { email, password } = req.body;

  try {
    const [rows] = await pool.query(
      'SELECT id, name, email, password, role FROM users WHERE email = ?',
      [email.toLowerCase().trim()]
    );

    if (rows.length === 0) {
      // Intentionally vague message to prevent user enumeration
      return res.status(401).json({ success: false, message: 'Invalid email or password.' });
    }

    const user = rows[0];
    const isMatch = await bcrypt.compare(password, user.password);

    if (!isMatch) {
      return res.status(401).json({ success: false, message: 'Invalid email or password.' });
    }

    const token = signToken(user);

    // Send back user info without the password hash
    const { password: _pw, ...safeUser } = user;

    return res.json({
      success: true,
      message: 'Login successful.',
      token,
      user: safeUser,
    });
  } catch (err) {
    console.error('login error:', err);
    res.status(500).json({ success: false, message: 'Login failed.' });
  }
};

// ------------------------------------------------------------------
// GET /api/auth/me
// Protected — returns the current user's profile
// ------------------------------------------------------------------
const getMe = async (req, res) => {
  try {
    const [rows] = await pool.query(
      'SELECT id, name, email, role, created_at FROM users WHERE id = ?',
      [req.user.id]
    );

    if (rows.length === 0) {
      return res.status(404).json({ success: false, message: 'User not found.' });
    }

    return res.json({ success: true, user: rows[0] });
  } catch (err) {
    console.error('getMe error:', err);
    res.status(500).json({ success: false, message: 'Could not fetch profile.' });
  }
};

module.exports = { register, login, getMe };
