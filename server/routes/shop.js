const express = require('express');
const { pool } = require('../db');
const auth = require('../middleware/auth');

const router = express.Router();

// Get all shop items + user inventory + ticket balance
router.get('/', auth, async (req, res) => {
  try {
    const { rows: items } = await pool.query('SELECT * FROM shop_items ORDER BY type, price ASC');
    const { rows: inventory } = await pool.query(
      'SELECT item_id, equipped FROM user_inventory WHERE user_id = $1',
      [req.user.id]
    );
    const { rows: userRows } = await pool.query('SELECT tickets FROM users WHERE id = $1', [req.user.id]);
    res.json({
      items,
      inventory,
      tickets: userRows[0]?.tickets || 0,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// Buy an item
router.post('/buy/:itemId', auth, async (req, res) => {
  try {
    const { rows: item } = await pool.query('SELECT * FROM shop_items WHERE id = $1', [req.params.itemId]);
    if (!item.length) return res.status(404).json({ error: 'Item not found' });

    const { rows: userRows } = await pool.query('SELECT tickets FROM users WHERE id = $1', [req.user.id]);
    const tickets = userRows[0]?.tickets || 0;
    if (tickets < item[0].price) return res.status(400).json({ error: 'Not enough tickets' });

    // Check if already owned
    const { rows: owned } = await pool.query(
      'SELECT id FROM user_inventory WHERE user_id = $1 AND item_id = $2',
      [req.user.id, req.params.itemId]
    );
    if (owned.length) return res.status(400).json({ error: 'Already owned' });

    // Deduct tickets and add to inventory
    await pool.query('UPDATE users SET tickets = tickets - $1 WHERE id = $2', [item[0].price, req.user.id]);
    await pool.query(
      'INSERT INTO user_inventory (user_id, item_id) VALUES ($1, $2)',
      [req.user.id, req.params.itemId]
    );

    const { rows: newUserRows } = await pool.query('SELECT tickets FROM users WHERE id = $1', [req.user.id]);
    res.json({ success: true, tickets: newUserRows[0].tickets });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// Equip/unequip an item
router.patch('/equip/:itemId', auth, async (req, res) => {
  const { equipped } = req.body;
  try {
    const { rows: item } = await pool.query('SELECT * FROM shop_items WHERE id = $1', [req.params.itemId]);
    if (!item.length) return res.status(404).json({ error: 'Item not found' });

    // If equipping, unequip other items of same type first
    if (equipped) {
      const { rows: sameType } = await pool.query(
        `SELECT ui.item_id FROM user_inventory ui
         JOIN shop_items si ON ui.item_id = si.id
         WHERE ui.user_id = $1 AND si.type = $2`,
        [req.user.id, item[0].type]
      );
      for (const i of sameType) {
        await pool.query('UPDATE user_inventory SET equipped = FALSE WHERE user_id = $1 AND item_id = $2', [req.user.id, i.item_id]);
      }
      // Apply the item effect to user profile
      if (item[0].type === 'username_color') {
        await pool.query('UPDATE users SET username_color = $1 WHERE id = $2', [item[0].value, req.user.id]);
      } else if (item[0].type === 'profile_border') {
        await pool.query('UPDATE users SET profile_border = $1 WHERE id = $2', [item[0].value, req.user.id]);
      }
    } else {
      // Unequipping — clear the effect
      if (item[0].type === 'username_color') {
        await pool.query('UPDATE users SET username_color = NULL WHERE id = $1', [req.user.id]);
      } else if (item[0].type === 'profile_border') {
        await pool.query('UPDATE users SET profile_border = NULL WHERE id = $1', [req.user.id]);
      }
    }

    await pool.query(
      'UPDATE user_inventory SET equipped = $1 WHERE user_id = $2 AND item_id = $3',
      [equipped, req.user.id, req.params.itemId]
    );

    res.json({ success: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;