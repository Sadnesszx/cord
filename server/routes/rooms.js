const express = require('express');
const { pool } = require('../db');
const auth = require('../middleware/auth');

const router = express.Router();

// Create a room
router.post('/', auth, async (req, res) => {
  const { name } = req.body;
  if (!name?.trim()) return res.status(400).json({ error: 'Name required' });
  try {
    const code = Math.random().toString(36).substring(2, 8).toUpperCase() + Math.random().toString(36).substring(2, 6).toUpperCase();
    const { rows } = await pool.query(
      'INSERT INTO rooms (name, code, owner_id) VALUES ($1, $2, $3) RETURNING *',
      [name.trim(), code, req.user.id]
    );
    await pool.query('INSERT INTO room_members (room_id, user_id) VALUES ($1, $2)', [rows[0].id, req.user.id]);
    res.status(201).json(rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// Join a room via code
router.post('/join', auth, async (req, res) => {
  const { code } = req.body;
  if (!code?.trim()) return res.status(400).json({ error: 'Code required' });
  try {
    const { rows } = await pool.query('SELECT * FROM rooms WHERE code = $1', [code.trim().toUpperCase()]);
    if (!rows.length) return res.status(404).json({ error: 'Room not found' });
    const room = rows[0];
    await pool.query(
      'INSERT INTO room_members (room_id, user_id) VALUES ($1, $2) ON CONFLICT DO NOTHING',
      [room.id, req.user.id]
    );
    res.json(room);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// Get all rooms for current user
router.get('/', auth, async (req, res) => {
  try {
    const { rows } = await pool.query(
      `SELECT r.*, 
        (SELECT COUNT(*) FROM room_members rm2 WHERE rm2.room_id = r.id)::int as member_count
       FROM rooms r
       JOIN room_members rm ON r.id = rm.room_id
       WHERE rm.user_id = $1
       ORDER BY r.created_at DESC`,
      [req.user.id]
    );
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// Get room members
router.get('/:id/members', auth, async (req, res) => {
  try {
    const { rows } = await pool.query(
      `SELECT u.id, u.username, u.avatar_color, u.avatar_url
       FROM room_members rm
       JOIN users u ON rm.user_id = u.id
       WHERE rm.room_id = $1`,
      [req.params.id]
    );
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

// Get messages for a room
router.get('/:id/messages', auth, async (req, res) => {
  try {
    const { rows: member } = await pool.query(
      'SELECT 1 FROM room_members WHERE room_id = $1 AND user_id = $2',
      [req.params.id, req.user.id]
    );
    if (!member.length) return res.status(403).json({ error: 'Not a member' });
    const { rows } = await pool.query(
      `SELECT rm.*, u.username, u.avatar_color, u.avatar_url
       FROM room_messages rm
       JOIN users u ON rm.user_id = u.id
       WHERE rm.room_id = $1
       ORDER BY rm.created_at ASC`,
      [req.params.id]
    );
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

// Leave a room
router.post('/:id/leave', auth, async (req, res) => {
  try {
    await pool.query('DELETE FROM room_members WHERE room_id = $1 AND user_id = $2', [req.params.id, req.user.id]);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

// Delete a room (owner only)
router.delete('/:id', auth, async (req, res) => {
  try {
    const { rows } = await pool.query('SELECT owner_id FROM rooms WHERE id = $1', [req.params.id]);
    if (!rows.length) return res.status(404).json({ error: 'Room not found' });
    if (String(rows[0].owner_id) !== String(req.user.id)) return res.status(403).json({ error: 'Not authorized' });
    await pool.query('DELETE FROM rooms WHERE id = $1', [req.params.id]);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;