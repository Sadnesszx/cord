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

// Get reactions for a channel's messages
router.get('/channels/:channelId/reactions', auth, async (req, res) => {
  try {
    const { rows } = await pool.query(
      `SELECT mr.message_id, mr.emoji, mr.user_id, u.username
       FROM message_reactions mr
       JOIN users u ON mr.user_id = u.id
       WHERE mr.message_id IN (
         SELECT id FROM messages WHERE channel_id = $1
       )`,
      [req.params.channelId]
    );
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

// Toggle reaction
router.post('/messages/:messageId/react', auth, async (req, res) => {
  const { emoji } = req.body;
  try {
    const { rows: existing } = await pool.query(
      'SELECT id FROM message_reactions WHERE message_id = $1 AND user_id = $2 AND emoji = $3',
      [req.params.messageId, req.user.id, emoji]
    );
    if (existing.length) {
      await pool.query('DELETE FROM message_reactions WHERE id = $1', [existing[0].id]);
      res.json({ action: 'removed' });
    } else {
      await pool.query(
        'INSERT INTO message_reactions (message_id, user_id, emoji) VALUES ($1, $2, $3)',
        [req.params.messageId, req.user.id, emoji]
      );
      res.json({ action: 'added' });
    }
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

// Edit a message
router.patch('/messages/:messageId', auth, async (req, res) => {
  const { content } = req.body;
  if (!content?.trim()) return res.status(400).json({ error: 'Content required' });
  try {
    const { rows } = await pool.query(
      'SELECT user_id, channel_id FROM messages WHERE id = $1',
      [req.params.messageId]
    );
    if (!rows.length) return res.status(404).json({ error: 'Message not found' });
    if (rows[0].user_id !== req.user.id) return res.status(403).json({ error: 'Not your message' });
    const { rows: updated } = await pool.query(
      'UPDATE messages SET content = $1, edited = TRUE WHERE id = $2 RETURNING *',
      [content.trim(), req.params.messageId]
    );
    const io = global.getIO?.();
    if (io) {
      io.to(rows[0].channel_id).emit('message_edited', { messageId: req.params.messageId, content: content.trim() });
    }
    res.json(updated[0]);
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;