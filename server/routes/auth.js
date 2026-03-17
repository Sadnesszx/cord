const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { pool } = require('../db');

const router = express.Router();

router.post('/register', async (req, res) => {
  const { username, password, birthday, captchaToken } = req.body;
  if (!username || !password)
    return res.status(400).json({ error: 'Username and password required' });

  if (username.length < 3 || username.length > 32)
    return res.status(400).json({ error: 'Username must be 3–32 characters' });

  if (!/^[a-zA-Z0-9]+$/.test(username))
    return res.status(400).json({ error: 'Username can only contain letters and numbers' });

  if (!birthday)
    return res.status(400).json({ error: 'Birthday is required' });

  // Verify hCaptcha
  if (!captchaToken)
    return res.status(400).json({ error: 'Please complete the CAPTCHA' });

  try {
    const captchaRes = await fetch('https://api.hcaptcha.com/siteverify', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: `secret=${process.env.HCAPTCHA_SECRET}&response=${captchaToken}`,
    });
    const captchaData = await captchaRes.json();
    if (!captchaData.success)
      return res.status(400).json({ error: 'CAPTCHA verification failed. Please try again.' });
  } catch (err) {
    return res.status(500).json({ error: 'CAPTCHA verification error' });
  }

  // Age check - must be at least 13
  const today = new Date();
  const birth = new Date(birthday);
  const age = today.getFullYear() - birth.getFullYear() - (
    today < new Date(today.getFullYear(), birth.getMonth(), birth.getDate()) ? 1 : 0
  );
  if (age < 13)
    return res.status(400).json({ error: 'You must be at least 13 years old to register' });

  try {
    const { rows: existing } = await pool.query(
      'SELECT id FROM users WHERE LOWER(username) = LOWER($1)',
      [username]
    );
    if (existing.length) return res.status(409).json({ error: 'Username already taken' });

    const hash = await bcrypt.hash(password, 12);
    const { rows } = await pool.query(
      `INSERT INTO users (username, email, password_hash, birthday)
       VALUES ($1, $2, $3, $4) RETURNING id, username, avatar_color`,
      [username, `${username}@nihilisticchat.local`, hash, birthday]
    );
    const user = rows[0];
    const token = jwt.sign({ id: user.id, username: user.username }, process.env.JWT_SECRET, { expiresIn: '7d' });

    try {
      const io = global.getIO?.();
      if (io) {
        io.emit('new_user', { username: user.username });
        console.log('Emitted new_user for:', user.username);
      } else {
        console.log('IO not available');
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
    res.json({ token, user: { id: user.id, username: user.username, avatar_color: user.avatar_color, avatar_url: user.avatar_url, banner_color: user.banner_color, status: user.status, custom_status: user.custom_status, warning: user.warning, is_admin: user.is_admin } });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;