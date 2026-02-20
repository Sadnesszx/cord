const express = require('express');
const bcrypt = require('bcryptjs');
const { pool } = require('../db');
const auth = require('../middleware/auth');

const router = express.Router();

const ADMIN_USERNAME = 'Sadness';

// Reset a user's password (admin only)
router.post('/reset-password', auth, async (req, res) => {
  const { username, newPassword } = req.body;

  const { rows: adminRows } = await pool.query('SELECT username FROM users WHERE id = $1', [req.user.id]);
  if (!adminRows.length || adminRows[0].username !== ADMIN_USERNAME)
    return res.status(403).json({ error: 'Not authorized' });

  if (!newPassword || newPassword.length < 4)
    return res.status(400).json({ error: 'Password too short' });

  try {
    const hash = await bcrypt.hash(newPassword, 12);
    const { rows } = await pool.query(
      'UPDATE users SET password_hash = $1 WHERE username = $2 RETURNING username',
      [hash, username]
    );
    if (!rows.length) return res.status(404).json({ error: 'User not found' });
    res.json({ message: `Password reset for ${username}` });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;