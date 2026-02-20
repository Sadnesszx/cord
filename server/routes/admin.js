const express = require('express');
const bcrypt = require('bcryptjs');
const { pool } = require('../db');
const auth = require('../middleware/auth');

const router = express.Router();
const ADMIN_USERNAME = 'Sadness';

const isAdmin = async (userId) => {
  const { rows } = await pool.query('SELECT username FROM users WHERE id = $1', [userId]);
  return rows.length && rows[0].username === ADMIN_USERNAME;
};

// Reset password
router.post('/reset-password', auth, async (req, res) => {
  if (!await isAdmin(req.user.id)) return res.status(403).json({ error: 'Not authorized' });
  const { username, newPassword } = req.body;
  if (!newPassword || newPassword.length < 4) return res.status(400).json({ error: 'Password too short' });
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

// Ban user
router.post('/ban', auth, async (req, res) => {
  if (!await isAdmin(req.user.id)) return res.status(403).json({ error: 'Not authorized' });
  const { username, reason } = req.body;
  try {
    const { rows } = await pool.query(
      'UPDATE users SET banned = TRUE, ban_reason = $1 WHERE username = $2 RETURNING username',
      [reason || 'No reason provided', username]
    );
    if (!rows.length) return res.status(404).json({ error: 'User not found' });
    res.json({ message: `${username} has been banned` });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// Unban user
router.post('/unban', auth, async (req, res) => {
  if (!await isAdmin(req.user.id)) return res.status(403).json({ error: 'Not authorized' });
  const { username } = req.body;
  try {
    await pool.query('UPDATE users SET banned = FALSE, ban_reason = $1 WHERE username = $2', ['', username]);
    res.json({ message: `${username} has been unbanned` });
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

// Warn user
router.post('/warn', auth, async (req, res) => {
  if (!await isAdmin(req.user.id)) return res.status(403).json({ error: 'Not authorized' });
  const { username, warning } = req.body;
  try {
    const { rows } = await pool.query(
      'UPDATE users SET warning = $1 WHERE username = $2 RETURNING username',
      [warning || '', username]
    );
    if (!rows.length) return res.status(404).json({ error: 'User not found' });
    res.json({ message: warning ? `Warning sent to ${username}` : `Warning cleared for ${username}` });
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;