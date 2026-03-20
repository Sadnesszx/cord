const express = require('express');
const bcrypt = require('bcryptjs');
const { pool } = require('../db');
const auth = require('../middleware/auth');

const router = express.Router();


const isAdmin = async (userId) => {
  const { rows } = await pool.query('SELECT is_admin FROM users WHERE id = $1', [userId]);
  return rows[0]?.is_admin === true;
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
      'UPDATE users SET banned = TRUE, ban_reason = $1 WHERE username = $2 RETURNING id, username',
      [reason || 'No reason provided', username]
    );
    if (!rows.length) return res.status(404).json({ error: 'User not found' });
    try {
      const io = global.getIO?.();
      if (io) io.to(`user_${rows[0].id}`).emit('force_logout', { reason: reason || 'You have been banned.' });
    } catch (e) {}
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

// Admin: get all users
router.get('/users', auth, async (req, res) => {
  if (!await isAdmin(req.user.id)) return res.status(403).json({ error: 'Not authorized' });
  try {
    const { rows } = await pool.query(
      'SELECT id, username, avatar_color, avatar_url FROM users ORDER BY username ASC'
    );
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

// Admin: get DM conversation between two users
router.get('/dms/:user1/:user2', auth, async (req, res) => {
  if (!await isAdmin(req.user.id)) return res.status(403).json({ error: 'Not authorized' });
  try {
    const { rows: u1 } = await pool.query('SELECT id FROM users WHERE username = $1', [req.params.user1]);
    const { rows: u2 } = await pool.query('SELECT id FROM users WHERE username = $1', [req.params.user2]);
    if (!u1.length || !u2.length) return res.status(404).json({ error: 'User not found' });
    const { rows } = await pool.query(
      `SELECT dm.*, u.username, u.avatar_color, u.avatar_url
       FROM dm_messages dm
       JOIN users u ON dm.sender_id = u.id
       WHERE (dm.sender_id = $1 AND dm.receiver_id = $2)
          OR (dm.sender_id = $2 AND dm.receiver_id = $1)
       ORDER BY dm.created_at ASC`,
      [u1[0].id, u2[0].id]
    );
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

// Get all reports
router.get('/reports', auth, async (req, res) => {
  if (!await isAdmin(req.user.id)) return res.status(403).json({ error: 'Not authorized' });
  try {
    const { rows } = await pool.query(
      `SELECT r.*, 
        reporter.username as reporter_username,
        reported.username as reported_username
       FROM reports r
       JOIN users reporter ON r.reporter_id = reporter.id
       LEFT JOIN users reported ON r.reported_user_id = reported.id
       WHERE r.resolved = FALSE
       ORDER BY r.created_at DESC`
    );
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

// Resolve a report
router.patch('/reports/:id/resolve', auth, async (req, res) => {
  if (!await isAdmin(req.user.id)) return res.status(403).json({ error: 'Not authorized' });
  try {
    await pool.query('UPDATE reports SET resolved = TRUE WHERE id = $1', [req.params.id]);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

// Get all users with their last IP
router.get('/ips', auth, async (req, res) => {
  if (!await isAdmin(req.user.id)) return res.status(403).json({ error: 'Not authorized' });
  try {
    const { rows } = await pool.query(
      `SELECT u.id, u.username, u.avatar_color, u.avatar_url, u.created_at, u.banned,
        s.ip_address, s.user_agent, s.last_seen
       FROM users u
       LEFT JOIN LATERAL (
         SELECT ip_address, user_agent, last_seen FROM user_sessions
         WHERE user_id = u.id ORDER BY last_seen DESC LIMIT 1
       ) s ON true
       ORDER BY u.created_at DESC`
    );
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;