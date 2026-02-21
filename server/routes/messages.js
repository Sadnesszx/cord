const express = require('express');
const { pool } = require('../db');
const auth = require('../middleware/auth');

const router = express.Router();

// Get messages for a channel
router.get('/channels/:channelId/messages', auth, async (req, res) => {
  const limit = Math.min(parseInt(req.query.limit) || 50, 100);
  const before = req.query.before;

  try {
    let query = `
      SELECT m.*, u.username, u.avatar_color, u.avatar_url
      FROM messages m
      JOIN users u ON m.user_id = u.id
      WHERE m.channel_id = $1
    `;
    const params = [req.params.channelId];

    if (before) {
      query += ` AND m.created_at < $2`;
      params.push(before);
    }

    query += ` ORDER BY m.created_at DESC LIMIT $${params.length + 1}`;
    params.push(limit);

    const { rows } = await pool.query(query, params);
    res.json(rows.reverse());
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// Delete a message
router.delete('/messages/:messageId', auth, async (req, res) => {
  try {
    const { rows } = await pool.query(
      'SELECT user_id FROM messages WHERE id = $1',
      [req.params.messageId]
    );
    if (!rows.length) return res.status(404).json({ error: 'Message not found' });
    if (rows[0].user_id !== req.user.id) return res.status(403).json({ error: 'Not your message' });

    await pool.query('DELETE FROM messages WHERE id = $1', [req.params.messageId]);
    res.json({ message: 'Deleted' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;
