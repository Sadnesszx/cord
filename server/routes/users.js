const express = require('express');
const { pool } = require('../db');
const auth = require('../middleware/auth');

const router = express.Router();

// Update avatar color
router.patch('/me/avatar', auth, async (req, res) => {
  const { avatar_color } = req.body;
  const validColors = ['#555', '#7a3030', '#2d5a3d', '#2d3d5a', '#5a2d5a', '#5a4a2d', '#2d5a5a', '#3d3d3d', '#6b2737', '#2d4a2d'];
  if (!validColors.includes(avatar_color))
    return res.status(400).json({ error: 'Invalid color' });

  try {
    const { rows } = await pool.query(
      'UPDATE users SET avatar_color = $1 WHERE id = $2 RETURNING avatar_color',
      [avatar_color, req.user.id]
    );
    res.json(rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;
