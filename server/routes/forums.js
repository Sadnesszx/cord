const express = require('express');
const { pool } = require('../db');
const auth = require('../middleware/auth');

const router = express.Router();

// Get all threads
router.get('/', auth, async (req, res) => {
  try {
    const { rows } = await pool.query(`
      SELECT ft.id, ft.title, ft.content, ft.created_at,
             u.username, u.avatar_color, u.avatar_url,
             COUNT(fr.id)::int as reply_count,
             MAX(fr.created_at) as last_reply_at
      FROM forum_threads ft
      JOIN users u ON ft.user_id = u.id
      LEFT JOIN forum_replies fr ON fr.thread_id = ft.id
      GROUP BY ft.id, u.username, u.avatar_color, u.avatar_url
      ORDER BY GREATEST(ft.created_at, COALESCE(MAX(fr.created_at), ft.created_at)) DESC
    `);
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// Get single thread with replies
router.get('/:id', auth, async (req, res) => {
  try {
    const { rows: thread } = await pool.query(`
      SELECT ft.*, u.username, u.avatar_color, u.avatar_url
      FROM forum_threads ft
      JOIN users u ON ft.user_id = u.id
      WHERE ft.id = $1
    `, [req.params.id]);
    if (!thread.length) return res.status(404).json({ error: 'Thread not found' });

    const { rows: replies } = await pool.query(`
      SELECT fr.*, u.username, u.avatar_color, u.avatar_url
      FROM forum_replies fr
      JOIN users u ON fr.user_id = u.id
      WHERE fr.thread_id = $1
      ORDER BY fr.created_at ASC
    `, [req.params.id]);

    res.json({ ...thread[0], replies });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// Create thread
router.post('/', auth, async (req, res) => {
  const { title, content } = req.body;
  if (!title?.trim() || !content?.trim()) return res.status(400).json({ error: 'Title and content required' });
  if (title.length > 100) return res.status(400).json({ error: 'Title too long' });
  try {
    const { rows } = await pool.query(
      'INSERT INTO forum_threads (user_id, title, content) VALUES ($1, $2, $3) RETURNING *',
      [req.user.id, title.trim(), content.trim()]
    );
    res.status(201).json(rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// Reply to thread
router.post('/:id/replies', auth, async (req, res) => {
  const { content } = req.body;
  if (!content?.trim()) return res.status(400).json({ error: 'Content required' });
  try {
    const { rows } = await pool.query(
      'INSERT INTO forum_replies (thread_id, user_id, content) VALUES ($1, $2, $3) RETURNING *',
      [req.params.id, req.user.id, content.trim()]
    );
    const { rows: user } = await pool.query('SELECT username, avatar_color, avatar_url FROM users WHERE id = $1', [req.user.id]);
    res.status(201).json({ ...rows[0], ...user[0] });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// Delete thread (owner or admin)
router.delete('/:id', auth, async (req, res) => {
  try {
    const { rows } = await pool.query('SELECT user_id FROM forum_threads WHERE id = $1', [req.params.id]);
    if (!rows.length) return res.status(404).json({ error: 'Thread not found' });
    const { rows: u } = await pool.query('SELECT is_admin FROM users WHERE id = $1', [req.user.id]);
    if (String(rows[0].user_id) !== String(req.user.id) && !u[0]?.is_admin)
      return res.status(403).json({ error: 'Not authorized' });
    await pool.query('DELETE FROM forum_threads WHERE id = $1', [req.params.id]);
    res.json({ success: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// Delete reply (owner or admin)
router.delete('/:threadId/replies/:replyId', auth, async (req, res) => {
  try {
    const { rows } = await pool.query('SELECT user_id FROM forum_replies WHERE id = $1', [req.params.replyId]);
    if (!rows.length) return res.status(404).json({ error: 'Reply not found' });
    const { rows: u } = await pool.query('SELECT is_admin FROM users WHERE id = $1', [req.user.id]);
    if (String(rows[0].user_id) !== String(req.user.id) && !u[0]?.is_admin)
      return res.status(403).json({ error: 'Not authorized' });
    await pool.query('DELETE FROM forum_replies WHERE id = $1', [req.params.replyId]);
    res.json({ success: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;