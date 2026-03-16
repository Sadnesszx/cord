const express = require('express');
const bcrypt = require('bcryptjs');
const { pool } = require('../db');
const auth = require('../middleware/auth');

const router = express.Router();

// Change username
router.patch('/me/username', auth, async (req, res) => {
  const { username } = req.body;
  if (!username || username.length < 3 || username.length > 32)
    return res.status(400).json({ error: 'Username must be 3–32 characters' });
  if (!/^[a-zA-Z0-9]+$/.test(username))
    return res.status(400).json({ error: 'Username can only contain letters and numbers' });
  if (req.user.username === 'Sadness')
    return res.status(403).json({ error: 'Owner username cannot be changed' });
  try {
    const { rows: existing } = await pool.query(
      'SELECT id FROM users WHERE LOWER(username) = LOWER($1) AND id != $2',
      [username, req.user.id]
    );
    if (existing.length) return res.status(409).json({ error: 'Username already taken' });
    const { rows } = await pool.query(
      'UPDATE users SET username = $1 WHERE id = $2 RETURNING id, username',
      [username, req.user.id]
    );
    res.json(rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});
  const { avatar_color } = req.body;
  const validColors = ['#555', '#7a3030', '#2d5a3d', '#2d3d5a', '#5a2d5a', '#5a4a2d', '#2d5a5a', '#3d3d3d', '#6b2737', '#2d4a2d'];
  if (!validColors.includes(avatar_color))
    return res.status(400).json({ error: 'Invalid color' });
  try {
    const { rows } = await pool.query(
      'UPDATE users SET avatar_color = $1 WHERE id = $2 RETURNING avatar_color',
      [avatar_color, req.user.id]
    );
    res.json(rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// Update avatar image
router.patch('/avatar-image', auth, async (req, res) => {
  const { avatar_url } = req.body;
  try {
    await pool.query('UPDATE users SET avatar_url = $1 WHERE id = $2', [avatar_url, req.user.id]);
    const io = global.getIO?.();
    if (io) {
      io.emit('user_avatar_updated', { userId: req.user.id, avatar_url });
    }
    res.json({ success: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to update avatar' });
  }
});

// Change password
router.patch('/me/password', auth, async (req, res) => {
  const { password } = req.body;
  if (!password || password.length < 4)
    return res.status(400).json({ error: 'Password must be at least 4 characters' });
  try {
    const hash = await bcrypt.hash(password, 12);
    await pool.query('UPDATE users SET password_hash = $1 WHERE id = $2', [hash, req.user.id]);
    res.json({ message: 'Password updated!' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// Update bio
router.patch('/me/bio', auth, async (req, res) => {
  const { bio } = req.body;
  if (bio && bio.length > 200)
    return res.status(400).json({ error: 'Bio must be under 200 characters' });
  try {
    const { rows } = await pool.query(
      'UPDATE users SET bio = $1 WHERE id = $2 RETURNING bio',
      [bio || '', req.user.id]
    );
    res.json(rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// Update banner color
router.patch('/me/banner', auth, async (req, res) => {
  const { banner_color } = req.body;
  try {
    await pool.query('UPDATE users SET banner_color = $1 WHERE id = $2', [banner_color, req.user.id]);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: 'Failed to update banner' });
  }
});

// Update status
router.patch('/me/status', auth, async (req, res) => {
  const { status, custom_status } = req.body;
  const validStatuses = ['online', 'idle', 'dnd', 'invisible'];
  if (status && !validStatuses.includes(status))
    return res.status(400).json({ error: 'Invalid status' });
  try {
    await pool.query(
      'UPDATE users SET status = $1, custom_status = $2 WHERE id = $3',
      [status || 'online', custom_status || null, req.user.id]
    );
    const io = global.getIO?.();
    if (io) {
      io.emit('user_status_updated', {
        userId: req.user.id,
        status: status || 'online',
        custom_status: custom_status || null,
      });
    }
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

// Delete account
router.delete('/me', auth, async (req, res) => {
  try {
    // Prevent owner from deleting their account
    if (req.user.username === 'Sadness')
      return res.status(403).json({ error: 'Owner account cannot be deleted' });
    await pool.query('DELETE FROM users WHERE id = $1', [req.user.id]);
    res.json({ message: 'Account deleted' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// Admin: delete user's profile picture
router.patch('/admin/clear-avatar/:username', auth, async (req, res) => {
  if (req.user.username !== 'Sadness') return res.status(403).json({ error: 'Forbidden' });
  try {
    const { rows } = await pool.query('UPDATE users SET avatar_url = NULL WHERE username = $1 RETURNING id', [req.params.username]);
    if (rows.length) {
      const io = global.getIO?.();
      if (io) {
        io.to(`user_${rows[0].id}`).emit('avatar_cleared', { reason: req.body.reason || 'No reason provided' });
      }
    }
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

// Send feedback to owner
router.post('/feedback', auth, async (req, res) => {
  const { message } = req.body;
  if (!message?.trim()) return res.status(400).json({ error: 'Message required' });
  try {
    const { rows } = await pool.query('SELECT id FROM users WHERE username = $1', ['Sadness']);
    if (!rows.length) return res.status(404).json({ error: 'Owner not found' });
    const ownerId = rows[0].id;
    await pool.query(
      'INSERT INTO dm_messages (sender_id, receiver_id, content) VALUES ($1, $2, $3)',
      [req.user.id, ownerId, `📝 Feedback: ${message.trim()}`]
    );
    const io = global.getIO?.();
    if (io) {
      const { rows: senderInfo } = await pool.query(
        'SELECT username, avatar_color, avatar_url FROM users WHERE id = $1',
        [req.user.id]
      );
      io.to(`user_${ownerId}`).emit('new_dm', {
        sender_id: req.user.id,
        receiver_id: ownerId,
        content: `📝 Feedback: ${message.trim()}`,
        username: senderInfo[0].username,
        avatar_color: senderInfo[0].avatar_color,
        avatar_url: senderInfo[0].avatar_url,
        created_at: new Date().toISOString(),
      });
    }
    res.json({ message: 'Feedback sent!' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// Get user profile (keep this LAST since it's a wildcard route)
router.get('/:username', auth, async (req, res) => {
  try {
    const { rows } = await pool.query(
      'SELECT id, username, avatar_color, avatar_url, banner_color, bio, created_at, banned, status, custom_status FROM users WHERE username = $1',
      [req.params.username]
    );
    if (!rows.length) return res.status(404).json({ error: 'User not found' });
    res.json(rows[0]);
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;