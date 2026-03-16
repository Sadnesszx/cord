const express = require('express');
const { pool } = require('../db');
const auth = require('../middleware/auth');

const router = express.Router();

// Get all servers for current user
router.get('/', auth, async (req, res) => {
  try {
    const { rows } = await pool.query(
      `SELECT s.* FROM servers s
       JOIN server_members sm ON s.id = sm.server_id
       WHERE sm.user_id = $1
       ORDER BY s.created_at ASC`,
      [req.user.id]
    );
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// Create a server
router.post('/', auth, async (req, res) => {
  const { name } = req.body;
  if (!name) return res.status(400).json({ error: 'Server name required' });

  try {
    const { rows } = await pool.query(
      `INSERT INTO servers (name, owner_id) VALUES ($1, $2) RETURNING *`,
      [name, req.user.id]
    );
    const server = rows[0];

    // Add owner as member
    await pool.query(
      `INSERT INTO server_members (server_id, user_id) VALUES ($1, $2)`,
      [server.id, req.user.id]
    );

    // Create default general channel
    await pool.query(
      `INSERT INTO channels (server_id, name) VALUES ($1, 'general')`,
      [server.id]
    );

    res.status(201).json(server);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// Get channels for a server
router.get('/:serverId/channels', auth, async (req, res) => {
  try {
    // Verify membership
    const { rows: members } = await pool.query(
      `SELECT 1 FROM server_members WHERE server_id = $1 AND user_id = $2`,
      [req.params.serverId, req.user.id]
    );
    if (!members.length) return res.status(403).json({ error: 'Not a member' });

    const { rows } = await pool.query(
      `SELECT * FROM channels WHERE server_id = $1 ORDER BY created_at ASC`,
      [req.params.serverId]
    );
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// Create a channel
router.post('/:serverId/channels', auth, async (req, res) => {
  const { name } = req.body;
  if (!name) return res.status(400).json({ error: 'Channel name required' });

  try {
    // Verify ownership
    const { rows } = await pool.query(
      `SELECT owner_id FROM servers WHERE id = $1`, [req.params.serverId]
    );
    if (!rows.length || rows[0].owner_id !== req.user.id)
      return res.status(403).json({ error: 'Only server owner can create channels' });

    const { rows: channels } = await pool.query(
      `INSERT INTO channels (server_id, name) VALUES ($1, $2) RETURNING *`,
      [req.params.serverId, name.toLowerCase().replace(/\s+/g, '-')]
    );
    res.status(201).json(channels[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// Join a server by ID
router.post('/:serverId/join', auth, async (req, res) => {
  try {
    await pool.query(
      `INSERT INTO server_members (server_id, user_id) VALUES ($1, $2) ON CONFLICT DO NOTHING`,
      [req.params.serverId, req.user.id]
    );
    const { rows } = await pool.query(`SELECT * FROM servers WHERE id = $1`, [req.params.serverId]);
    const { rows: userInfo } = await pool.query(
      'SELECT id, username, avatar_color, avatar_url, status, custom_status FROM users WHERE id = $1',
      [req.user.id]
    );
    const io = global.getIO?.();
    if (io) {
      io.to(`server_${req.params.serverId}`).emit('member_joined', { member: userInfo[0], serverId: req.params.serverId });
    }
    res.json(rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// Get server members
router.get('/:id/members', auth, async (req, res) => {
  try {
    const { rows } = await pool.query(
      `SELECT u.id, u.username, u.avatar_color, u.avatar_url, u.status, u.custom_status FROM users u
       JOIN server_members sm ON sm.user_id = u.id
       WHERE sm.server_id = $1
       ORDER BY u.username ASC`,
      [req.params.id]
    );
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// Delete a server
router.delete('/:id', auth, async (req, res) => {
  try {
    const { rows } = await pool.query('SELECT owner_id FROM servers WHERE id = $1', [req.params.id]);
    if (!rows.length) return res.status(404).json({ error: 'Server not found' });
    if (rows[0].owner_id !== req.user.id) return res.status(403).json({ error: 'Not the owner' });
    await pool.query('DELETE FROM servers WHERE id = $1', [req.params.id]);
    res.json({ message: 'Server deleted' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// Delete a channel
router.delete('/:serverId/channels/:channelId', auth, async (req, res) => {
  try {
    const { rows } = await pool.query('SELECT owner_id FROM servers WHERE id = $1', [req.params.serverId]);
    if (!rows.length) return res.status(404).json({ error: 'Server not found' });
    if (rows[0].owner_id !== req.user.id) return res.status(403).json({ error: 'Not the owner' });
    await pool.query('DELETE FROM channels WHERE id = $1', [req.params.channelId]);
    res.json({ message: 'Channel deleted' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// Browse all servers
router.get('/browse/all', auth, async (req, res) => {
  try {
    const { rows } = await pool.query(
      `SELECT s.id, s.name, s.owner_id, s.icon_url, u.username as owner_name,
       COUNT(sm.user_id)::int as member_count
       FROM servers s
       JOIN users u ON s.owner_id = u.id
       LEFT JOIN server_members sm ON sm.server_id = s.id
       GROUP BY s.id, u.username
       ORDER BY member_count DESC`
    );
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// Leave a server
router.post('/:id/leave', auth, async (req, res) => {
  try {
    const { rows } = await pool.query('SELECT owner_id FROM servers WHERE id = $1', [req.params.id]);
    if (!rows.length) return res.status(404).json({ error: 'Server not found' });
    if (rows[0].owner_id === req.user.id) return res.status(400).json({ error: "You can't leave a server you own — delete it instead" });
    await pool.query('DELETE FROM server_members WHERE server_id = $1 AND user_id = $2', [req.params.id, req.user.id]);
    const io = global.getIO?.();
    if (io) {
      io.to(`server_${req.params.id}`).emit('member_left', { userId: req.user.id, serverId: req.params.id });
    }
    res.json({ message: 'Left server' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// Rename a server
router.patch('/:id/rename', auth, async (req, res) => {
  const { name } = req.body;
  if (!name) return res.status(400).json({ error: 'Name required' });
  try {
    const { rows } = await pool.query('SELECT owner_id FROM servers WHERE id = $1', [req.params.id]);
    if (!rows.length) return res.status(404).json({ error: 'Server not found' });
    if (rows[0].owner_id !== req.user.id) return res.status(403).json({ error: 'Not the owner' });
    const { rows: updated } = await pool.query('UPDATE servers SET name = $1 WHERE id = $2 RETURNING *', [name, req.params.id]);
    res.json(updated[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

router.patch('/:id/icon', auth, async (req, res) => {
  const { icon_url } = req.body;
  try {
    const { rows } = await pool.query('SELECT owner_id FROM servers WHERE id = $1', [req.params.id]);
    if (!rows.length) return res.status(404).json({ error: 'Server not found' });
    if (rows[0].owner_id !== req.user.id) return res.status(403).json({ error: 'Not the owner' });
    const { rows: updated } = await pool.query('UPDATE servers SET icon_url = $1 WHERE id = $2 RETURNING *', [icon_url, req.params.id]);
    res.json(updated[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

router.get('/:channelId', auth, async (req, res) => {
  try {
    const { rows } = await pool.query('SELECT * FROM channels WHERE id = $1', [req.params.channelId]);
    if (!rows.length) return res.status(404).json({ error: 'Channel not found' });
    res.json(rows[0]);
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

// Generate invite link
router.post('/:id/invite', auth, async (req, res) => {
  try {
    const { rows: member } = await pool.query(
      'SELECT 1 FROM server_members WHERE server_id = $1 AND user_id = $2',
      [req.params.id, req.user.id]
    );
    if (!member.length) return res.status(403).json({ error: 'Not a member' });

    const code = Math.random().toString(36).substring(2, 10).toUpperCase();
    const { rows } = await pool.query(
      'INSERT INTO server_invites (server_id, code, created_by) VALUES ($1, $2, $3) RETURNING *',
      [req.params.id, code, req.user.id]
    );
    res.json({ code: rows[0].code });
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

// Join via invite code
router.post('/invite/:code/join', auth, async (req, res) => {
  try {
    const { rows } = await pool.query(
      'SELECT * FROM server_invites WHERE code = $1 AND expires_at > NOW()',
      [req.params.code]
    );
    if (!rows.length) return res.status(404).json({ error: 'Invalid or expired invite' });
    const serverId = rows[0].server_id;
    await pool.query(
      'INSERT INTO server_members (server_id, user_id) VALUES ($1, $2) ON CONFLICT DO NOTHING',
      [serverId, req.user.id]
    );
    const { rows: server } = await pool.query('SELECT * FROM servers WHERE id = $1', [serverId]);
    const { rows: userInfo } = await pool.query(
      'SELECT id, username, avatar_color, avatar_url, status, custom_status FROM users WHERE id = $1',
      [req.user.id]
    );
    const io = global.getIO?.();
    if (io) {
      io.to(`server_${serverId}`).emit('member_joined', { member: userInfo[0], serverId });
    }
    res.json(server[0]);
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

// Kick a member
router.delete('/:id/members/:userId', auth, async (req, res) => {
  try {
    const { rows } = await pool.query('SELECT owner_id FROM servers WHERE id = $1', [req.params.id]);
    if (!rows.length) return res.status(404).json({ error: 'Server not found' });
    if (rows[0].owner_id !== req.user.id) return res.status(403).json({ error: 'Not the owner' });
    if (req.params.userId === req.user.id) return res.status(400).json({ error: "You can't kick yourself" });
    await pool.query('DELETE FROM server_members WHERE server_id = $1 AND user_id = $2', [req.params.id, req.params.userId]);
    const io = global.getIO?.();
    if (io) {
      io.to(`user_${req.params.userId}`).emit('kicked_from_server', { serverId: req.params.id });
      io.to(`server_${req.params.id}`).emit('member_left', { userId: req.params.userId, serverId: req.params.id });
    }
    res.json({ message: 'Kicked' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

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

module.exports = router;