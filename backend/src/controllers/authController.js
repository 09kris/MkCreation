const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { getPool } = require('../config/db');
const { JWT_SECRET } = require('../middleware/auth');

const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '7d';

async function register(req, res) {
  try {
    const { name, email, password, phone, address, role } = req.body;

    if (!name || !email || !password) {
      return res.status(400).json({
        success: false,
        message: 'Name, email, and password are required.',
      });
    }

    // Role check: Only allow 'admin' or 'customer'. Defaults to 'customer'
    const assignedRole = (role === 'admin') ? 'admin' : 'customer';

    const pool = getPool();
    const [existing] = await pool.query('SELECT id FROM users WHERE email = ? LIMIT 1', [email.trim().toLowerCase()]);

    if (existing.length > 0) {
      return res.status(409).json({
        success: false,
        message: 'An account with this email already exists.',
      });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const [result] = await pool.query(
      `INSERT INTO users (name, email, password, phone, role, address) VALUES (?, ?, ?, ?, ?, ?)`,
      [name.trim(), email.trim().toLowerCase(), hashedPassword, phone || null, assignedRole, address || null]
    );

    const userId = result.insertId;

    const token = jwt.sign(
      { id: userId, email: email.trim().toLowerCase(), role: assignedRole, name: name.trim() },
      JWT_SECRET,
      { expiresIn: JWT_EXPIRES_IN }
    );

    return res.status(201).json({
      success: true,
      message: 'Account registered successfully.',
      token,
      user: {
        id: userId,
        name: name.trim(),
        email: email.trim().toLowerCase(),
        phone: phone || '',
        role: assignedRole,
        address: address || '',
      },
    });
  } catch (err) {
    console.error('[Auth register error]', err);
    return res.status(500).json({
      success: false,
      message: 'Server error during registration. Please try again.',
      error: err.message,
    });
  }
}

async function login(req, res) {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: 'Email and password are required.',
      });
    }

    const pool = getPool();
    const [users] = await pool.query(
      'SELECT id, name, email, password, phone, role, address FROM users WHERE email = ? LIMIT 1',
      [email.trim().toLowerCase()]
    );

    if (users.length === 0) {
      return res.status(401).json({
        success: false,
        message: 'Invalid email or password.',
      });
    }

    const user = users[0];
    const isPasswordValid = await bcrypt.compare(password, user.password);

    if (!isPasswordValid) {
      return res.status(401).json({
        success: false,
        message: 'Invalid email or password.',
      });
    }

    const token = jwt.sign(
      { id: user.id, email: user.email, role: user.role, name: user.name },
      JWT_SECRET,
      { expiresIn: JWT_EXPIRES_IN }
    );

    return res.json({
      success: true,
      message: 'Login successful.',
      token,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        phone: user.phone || '',
        role: user.role,
        address: user.address || '',
      },
    });
  } catch (err) {
    console.error('[Auth login error]', err);
    return res.status(500).json({
      success: false,
      message: 'Server error during login. Please try again.',
      error: err.message,
    });
  }
}

async function getProfile(req, res) {
  try {
    const pool = getPool();
    const [users] = await pool.query(
      'SELECT id, name, email, phone, role, address, created_at FROM users WHERE id = ? LIMIT 1',
      [req.user.id]
    );

    if (users.length === 0) {
      return res.status(404).json({ success: false, message: 'User not found.' });
    }

    return res.json({ success: true, user: users[0] });
  } catch (err) {
    console.error('[Auth getProfile error]', err);
    return res.status(500).json({ success: false, message: 'Server error fetching profile.' });
  }
}

async function updateProfile(req, res) {
  try {
    const { name, phone, address } = req.body;
    const pool = getPool();

    await pool.query(
      'UPDATE users SET name = COALESCE(?, name), phone = COALESCE(?, phone), address = COALESCE(?, address) WHERE id = ?',
      [name ? name.trim() : null, phone ? phone.trim() : null, address ? address.trim() : null, req.user.id]
    );

    const [updated] = await pool.query(
      'SELECT id, name, email, phone, role, address FROM users WHERE id = ?',
      [req.user.id]
    );

    return res.json({
      success: true,
      message: 'Profile updated successfully.',
      user: updated[0],
    });
  } catch (err) {
    console.error('[Auth updateProfile error]', err);
    return res.status(500).json({ success: false, message: 'Server error updating profile.' });
  }
}

module.exports = {
  register,
  login,
  getProfile,
  updateProfile,
};
