const express = require('express');
const { pool } = require('../db');
const auth = require('../middleware/auth');

const router = express.Router();

// Send friend request
router.post('/request', auth, async (req, res) => {
  const { username } = req.body;
  if (!username) return res.status(400).json({ error: 'Username required' });

  try {
    const { rows } = await pool.query('SELECT id FROM users WHERE username = $1', [username]);
    if (!rows.length) return res.status(404).json({ error: 'User not found' });

    const receiverId = rows[0].id;
    if (receiverId === req.user.id) return res.status(400).json({ error: "You can't add yourself" });

    const { rows: existing } = await pool.query(
      `SELECT * FROM friend_requests WHERE 
       (sender_id = $1 AND receiver_id = $2) OR 
       (sender_id = $2 AND receiver_id = $1)`,
      [req.user.id, receiverId]
    );
    if (existing.length) return res.status(409).json({ error: 'Friend request already exists' });

    await pool.query(
      'INSERT INTO friend_requests (sender_id, receiver_id) VALUES ($1, $2)',
      [req.user.id, receiverId]
    );
    res.json({ message: 'Friend request sent!' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// Get pending incoming requests
router.get('/requests', auth, async (req, res) => {
  try {
    const { rows } = await pool.query(
      `SELECT fr.id, u.username, u.avatar_color, fr.created_at
       FROM friend_requests fr
       JOIN users u ON fr.sender_id = u.id
       WHERE fr.receiver_id = $1 AND fr.status = 'pending'`,
      [req.user.id]
    );
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

// Accept or decline
router.post('/requests/:id/respond', auth, async (req, res) => {
  const { action } = req.body;
  try {
    const { rows } = await pool.query(
      'UPDATE friend_requests SET status = $1 WHERE id = $2 AND receiver_id = $3 RETURNING *',
      [action === 'accept' ? 'accepted' : 'declined', req.params.id, req.user.id]
    );
    if (!rows.length) return res.status(404).json({ error: 'Request not found' });
    res.json(rows[0]);
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

// Get friends list
router.get('/', auth, async (req, res) => {
  try {
    const { rows } = await pool.query(
      `SELECT u.id, u.username, u.avatar_color FROM users u
       JOIN friend_requests fr ON (
         (fr.sender_id = u.id AND fr.receiver_id = $1) OR
         (fr.receiver_id = u.id AND fr.sender_id = $1)
       )
       WHERE fr.status = 'accepted'`,
      [req.user.id]
    );
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

// Get DM messages with a friend
router.get('/dm/:friendId', auth, async (req, res) => {
  try {
    const { rows } = await pool.query(
      `SELECT dm.*, u.username, u.avatar_color FROM dm_messages dm
       JOIN users u ON dm.sender_id = u.id
       WHERE (dm.sender_id = $1 AND dm.receiver_id = $2)
          OR (dm.sender_id = $2 AND dm.receiver_id = $1)
       ORDER BY dm.created_at ASC LIMIT 500`,
      [req.user.id, req.params.friendId]
    );
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

// Unfriend
router.delete('/:friendId', auth, async (req, res) => {
  try {
    await pool.query(
      `DELETE FROM friend_requests WHERE 
       ((sender_id = $1 AND receiver_id = $2) OR 
       (sender_id = $2 AND receiver_id = $1))
       AND status = 'accepted'`,
      [req.user.id, req.params.friendId]
    );
    res.json({ message: 'Unfriended' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// Get all DM conversations (admin only)
router.get('/inbox/all', auth, async (req, res) => {
  try {
    const { rows } = await pool.query(
      `SELECT DISTINCT ON (u.id) u.id, u.username, u.avatar_color, dm.content as last_message, dm.created_at
       FROM dm_messages dm
       JOIN users u ON (
         CASE WHEN dm.sender_id = $1 THEN dm.receiver_id = u.id
         ELSE dm.sender_id = u.id END
       )
       WHERE dm.sender_id = $1 OR dm.receiver_id = $1
       ORDER BY u.id, dm.created_at DESC`,
      [req.user.id]
    );
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// Send DM to any user (for contact owner)
router.post('/dm/send', auth, async (req, res) => {
  const { receiverId, content } = req.body;
  if (!content?.trim() || !receiverId) return res.status(400).json({ error: 'Missing fields' });
  try {
    const { rows } = await pool.query(
      `INSERT INTO dm_messages (sender_id, receiver_id, content) VALUES ($1, $2, $3) RETURNING *`,
      [req.user.id, receiverId, content.trim()]
    );
    const { rows: users } = await pool.query('SELECT username, avatar_color FROM users WHERE id = $1', [req.user.id]);
    res.json({ ...rows[0], username: users[0].username, avatar_color: users[0].avatar_color });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// Delete a DM message
router.delete('/dm/message/:messageId', auth, async (req, res) => {
  try {
    const { rows } = await pool.query(
      'SELECT sender_id FROM dm_messages WHERE id = $1',
      [req.params.messageId]
    );
    if (!rows.length) return res.status(404).json({ error: 'Message not found' });
    if (rows[0].sender_id !== req.user.id) return res.status(403).json({ error: 'Not your message' });
    await pool.query('DELETE FROM dm_messages WHERE id = $1', [req.params.messageId]);
    res.json({ message: 'Deleted' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;