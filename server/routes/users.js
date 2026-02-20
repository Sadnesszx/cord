const express = require('express');
const bcrypt = require('bcryptjs');
const { pool } = require('../db');
const auth = require('../middleware/auth');

const router = express.Router();

// Update avatar color
router.patch('/me/avatar', auth, async (req, res) => {
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

// Get user profile
router.get('/:username', auth, async (req, res) => {
  try {
    const { rows } = await pool.query(
      'SELECT id, username, avatar_color, bio, created_at, banned FROM users WHERE username = $1',
      [req.params.username]
    );
    if (!rows.length) return res.status(404).json({ error: 'User not found' });
    res.json(rows[0]);
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;