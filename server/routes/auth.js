const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { pool } = require('../db');


const router = express.Router();

router.post('/register', async (req, res) => {
  const { username, password } = req.body;
  if (!username || !password)
    return res.status(400).json({ error: 'Username and password required' });

if (username.length < 3 || username.length > 32)
    return res.status(400).json({ error: 'Username must be 3–32 characters' });

if (!/^[a-zA-Z0-9]+$/.test(username))
    return res.status(400).json({ error: 'Username can only contain letters and numbers' });

  try {
    const { rows: existing } = await pool.query(
  'SELECT id FROM users WHERE LOWER(username) = LOWER($1)',
  [username]
);
if (existing.length) return res.status(409).json({ error: 'Username already taken' });
    const hash = await bcrypt.hash(password, 12);
    const { rows } = await pool.query(
      `INSERT INTO users (username, email, password_hash)
       VALUES ($1, $2, $3) RETURNING id, username, avatar_color`,
      [username, `${username}@sadlounge.local`, hash]
    );
    const user = rows[0];
    const token = jwt.sign({ id: user.id, username: user.username }, process.env.JWT_SECRET, { expiresIn: '7d' });

try {
  if (global.io) {
    global.io.emit('new_user', { username: user.username });
    console.log('Emitted new_user for:', user.username);
  }
} catch (e) { console.error('notify error:', e); }

    res.status(201).json({ token, user });
  } catch (err) {
    if (err.code === '23505') {
      return res.status(409).json({ error: 'Username already taken' });
    }
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

router.post('/login', async (req, res) => {
  const { username, password } = req.body;
  if (!username || !password)
    return res.status(400).json({ error: 'Username and password required' });

  try {
    const { rows } = await pool.query(
      'SELECT * FROM users WHERE LOWER(username) = LOWER($1)', [username]
    );
    const user = rows[0];
    if (!user) return res.status(401).json({ error: 'Invalid credentials' });

    const valid = await bcrypt.compare(password, user.password_hash);
    if (!valid) return res.status(401).json({ error: 'Invalid credentials' });
    if (user.banned) return res.status(403).json({ error: `You are banned. Reason: ${user.ban_reason}` });

    const token = jwt.sign({ id: user.id, username: user.username }, process.env.JWT_SECRET, { expiresIn: '7d' });
    res.json({ token, user: { id: user.id, username: user.username, avatar_color: user.avatar_color, warning: user.warning } });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;
