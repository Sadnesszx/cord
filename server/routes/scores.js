const express = require('express');
const { pool } = require('../db');
const auth = require('../middleware/auth');

const router = express.Router();

// Submit a score
router.post('/', auth, async (req, res) => {
  const { game, score, meta } = req.body;
  if (!game || score === undefined) return res.status(400).json({ error: 'Missing fields' });
  try {
    // Only keep the best score per user per game
    const { rows: existing } = await pool.query(
      'SELECT id, score FROM minigame_scores WHERE user_id = $1 AND game = $2',
      [req.user.id, game]
    );
    if (existing.length) {
      if (score > existing[0].score) {
        await pool.query(
          'UPDATE minigame_scores SET score = $1, meta = $2, created_at = NOW() WHERE id = $3',
          [score, meta || null, existing[0].id]
        );
      }
    } else {
      await pool.query(
        'INSERT INTO minigame_scores (user_id, username, game, score, meta) VALUES ($1, $2, $3, $4, $5)',
        [req.user.id, req.user.username, game, score, meta || null]
      );
    }
    res.json({ success: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// Get leaderboard for a game
router.get('/:game', auth, async (req, res) => {
  try {
    const { rows } = await pool.query(
      `SELECT ms.username, u.avatar_color, u.avatar_url, ms.score, ms.meta, ms.created_at
       FROM minigame_scores ms
       JOIN users u ON ms.user_id = u.id
       WHERE ms.game = $1
       ORDER BY ms.score DESC
       LIMIT 10`,
      [req.params.game]
    );
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;