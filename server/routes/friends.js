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

// Notify receiver in real time
try {
  const io = global.getIO?.();
  if (io) {
    const { rows: senderInfo } = await pool.query(
      'SELECT username, avatar_color, avatar_url FROM users WHERE id = $1',
      [req.user.id]
    );
    const { rows: reqRow } = await pool.query(
  'SELECT id FROM friend_requests WHERE sender_id = $1 AND receiver_id = $2',
  [req.user.id, receiverId]
);
io.to(`user_${receiverId}`).emit('new_friend_request', {
  id: reqRow[0].id,
  username: senderInfo[0].username,
  avatar_color: senderInfo[0].avatar_color,
  avatar_url: senderInfo[0].avatar_url,
});
  }
} catch (e) { console.error('socket notify error:', e); }

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
      `SELECT fr.id, u.username, u.avatar_color, u.avatar_url, fr.created_at
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

    if (action === 'accept') {
      try {
        const io = global.getIO?.();
        if (io) {
          const { rows: accepterInfo } = await pool.query(
            'SELECT id, username, avatar_color, avatar_url FROM users WHERE id = $1',
            [req.user.id]
          );
          const { rows: senderInfo } = await pool.query(
            'SELECT id, username, avatar_color, avatar_url FROM users WHERE id = $1',
            [rows[0].sender_id]
          );
          // Notify sender their request was accepted
          io.to(`user_${rows[0].sender_id}`).emit('friend_request_accepted', {
            id: accepterInfo[0].id,
            username: accepterInfo[0].username,
            avatar_color: accepterInfo[0].avatar_color,
            avatar_url: accepterInfo[0].avatar_url,
          });
          // Notify accepter to refresh their friends list
          io.to(`user_${req.user.id}`).emit('friend_request_accepted', {
            id: senderInfo[0].id,
            username: senderInfo[0].username,
            avatar_color: senderInfo[0].avatar_color,
            avatar_url: senderInfo[0].avatar_url,
          });
        }
      } catch (e) { console.error('socket notify error:', e); }
    }

    res.json(rows[0]);
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

// Get friends list
router.get('/', auth, async (req, res) => {
  try {
    const { rows } = await pool.query(
      `SELECT u.id, u.username, u.avatar_color, u.avatar_url FROM users u
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
      `SELECT dm.*, u.username, u.avatar_color, u.avatar_url FROM dm_messages dm
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

    try {
      const io = global.getIO?.();
      if (io) {
        io.to(`user_${req.params.friendId}`).emit('friend_removed', { userId: req.user.id });
        io.to(`user_${req.user.id}`).emit('friend_removed', { userId: req.params.friendId });
      }
    } catch (e) { console.error('socket notify error:', e); }

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
      `SELECT DISTINCT ON (u.id) u.id, u.username, u.avatar_color, u.avatar_url, dm.content as last_message, dm.created_at
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
    const { rows: users } = await pool.query('SELECT username, avatar_color, avatar_url FROM users WHERE id = $1', [req.user.id]);
    res.json({ ...rows[0], username: users[0].username, avatar_color: users[0].avatar_color, avatar_url: users[0].avatar_url });
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

// Get reactions for DM messages
router.get('/dm/:friendId/reactions', auth, async (req, res) => {
  try {
    const { rows } = await pool.query(
      `SELECT dr.message_id, dr.emoji, dr.user_id, u.username
       FROM dm_reactions dr
       JOIN users u ON dr.user_id = u.id
       WHERE dr.message_id IN (
         SELECT id FROM dm_messages
         WHERE (sender_id = $1 AND receiver_id = $2)
         OR (sender_id = $2 AND receiver_id = $1)
       )`,
      [req.user.id, req.params.friendId]
    );
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

// Toggle DM reaction
router.post('/dm/message/:messageId/react', auth, async (req, res) => {
  const { emoji } = req.body;
  try {
    const { rows: existing } = await pool.query(
      'SELECT id FROM dm_reactions WHERE message_id = $1 AND user_id = $2 AND emoji = $3',
      [req.params.messageId, req.user.id, emoji]
    );
    if (existing.length) {
      await pool.query('DELETE FROM dm_reactions WHERE id = $1', [existing[0].id]);
      res.json({ action: 'removed' });
    } else {
      await pool.query(
        'INSERT INTO dm_reactions (message_id, user_id, emoji) VALUES ($1, $2, $3)',
        [req.params.messageId, req.user.id, emoji]
      );
      res.json({ action: 'added' });
    }
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;