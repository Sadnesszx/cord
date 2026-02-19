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
    res.json(rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;
