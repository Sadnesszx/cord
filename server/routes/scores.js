const express = require('express');
const { pool } = require('../db');
const auth = require('../middleware/auth');

const router = express.Router();

const awardTickets = async (userId, amount) => {
  await pool.query('UPDATE users SET tickets = COALESCE(tickets, 0) + $1 WHERE id = $2', [amount, userId]);
};

const calcTickets = (game, score) => {
  if (game === 'aim') return Math.max(1, Math.floor(score / 50));
  if (game === 'type') return Math.max(1, Math.floor(score * 2));
  if (game === 'reaction') {
    const ms = 10000 - score;
    if (ms < 200) return 50;
    if (ms < 300) return 30;
    if (ms < 400) return 15;
    return 5;
  }
  return 1;
};

// Submit a score
router.post('/', auth, async (req, res) => {
  const { game, score, meta } = req.body;
  if (!game || score === undefined) return res.status(400).json({ error: 'Missing fields' });
  try {
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

    // Award tickets every time you play
    const ticketsEarned = calcTickets(game, score);
    await awardTickets(req.user.id, ticketsEarned);

    const { rows: userRows } = await pool.query('SELECT tickets FROM users WHERE id = $1', [req.user.id]);
    res.json({ success: true, ticketsEarned, totalTickets: userRows[0].tickets });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// Get badges for a username
router.get('/badges/:username', auth, async (req, res) => {
  try {
    const { rows: user } = await pool.query('SELECT id FROM users WHERE username = $1', [req.params.username]);
    if (!user.length) return res.status(404).json({ error: 'User not found' });
    const userId = user[0].id;

    const games = ['aim', 'type', 'reaction'];
    const badges = [];

    for (const game of games) {
      const { rows } = await pool.query(
        `SELECT user_id FROM minigame_scores WHERE game = $1 ORDER BY score DESC LIMIT 1`,
        [game]
      );
      if (rows.length && String(rows[0].user_id) === String(userId)) {
        if (game === 'aim') badges.push({ id: 'aim_champion', label: 'Aim Champion', emoji: '🎯', desc: '#1 in Aim Trainer' });
        if (game === 'type') badges.push({ id: 'speed_typer', label: 'Speed Typer', emoji: '⌨️', desc: '#1 in Type Racer' });
        if (game === 'reaction') badges.push({ id: 'lightning', label: 'Lightning Reflexes', emoji: '⚡', desc: '#1 in Reaction Test' });
      }
    }

    // Shop badges from inventory
    const { rows: shopBadges } = await pool.query(
      `SELECT si.value, si.name, si.emoji FROM user_inventory ui
       JOIN shop_items si ON ui.item_id = si.id
       WHERE ui.user_id = $1 AND si.type = 'badge' AND ui.equipped = TRUE`,
      [userId]
    );
    shopBadges.forEach(b => badges.push({ id: b.value, label: b.name, emoji: b.emoji, desc: 'Shop badge' }));

    res.json(badges);
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