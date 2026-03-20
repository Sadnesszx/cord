const jwt = require('jsonwebtoken');
const { pool } = require('../db');

const setupSocket = (io) => {
  const onlineUsers = new Set();
  const messageRates = new Map();

  const checkRateLimit = (userId) => {
    const now = Date.now();
    const rate = messageRates.get(userId);
    if (!rate || now > rate.resetAt) {
      messageRates.set(userId, { count: 1, resetAt: now + 5000 });
      return true;
    }
    if (rate.count >= 5) return false;
    rate.count++;
    return true;
  };

  io.use((socket, next) => {
    const token = socket.handshake.auth.token;
    if (!token) return next(new Error('No token'));
    try {
      socket.user = jwt.verify(token, process.env.JWT_SECRET);
      next();
    } catch {
      next(new Error('Invalid token'));
    }
  });

  io.on('connection', (socket) => {
    console.log(`🔌 ${socket.user.username} connected`);
    socket.join(`user_${socket.user.id}`);
    onlineUsers.add(socket.user.id);
    io.emit('online_users', Array.from(onlineUsers));

    socket.on('join_channel', (channelId) => {
      socket.rooms.forEach((room) => {
        if (room !== socket.id && room !== `user_${socket.user.id}` && !room.startsWith('server_')) {
          socket.leave(room);
        }
      });
      socket.join(channelId);
    });

    socket.on('send_message', async ({ channelId, content, replyToId }) => {
      if (!content?.trim() || !channelId) return;
      if (!checkRateLimit(socket.user.id)) {
        return socket.emit('rate_limited', { error: 'You are sending messages too fast!' });
      }
      try {
        const { rows } = await pool.query(
          `INSERT INTO messages (channel_id, user_id, content, reply_to_id) VALUES ($1, $2, $3, $4) RETURNING *`,
          [channelId, socket.user.id, content.trim(), replyToId || null]
        );
        const message = rows[0];
        const { rows: users } = await pool.query(
          `SELECT username, avatar_color, avatar_url, username_color, profile_border FROM users WHERE id = $1`,
          [socket.user.id]
        );
        let reply_content = null, reply_username = null;
        if (replyToId) {
          const { rows: replyRows } = await pool.query(
            `SELECT m.content, u.username FROM messages m JOIN users u ON m.user_id = u.id WHERE m.id = $1`,
            [replyToId]
          );
          if (replyRows.length) { reply_content = replyRows[0].content; reply_username = replyRows[0].username; }
        }
        io.to(channelId).emit('new_message', {
          ...message,
          username: users[0].username,
          avatar_color: users[0].avatar_color,
          avatar_url: users[0].avatar_url,
          username_color: users[0].username_color,
          profile_border: users[0].profile_border,
          reply_content,
          reply_username,
        });
      } catch (err) {
        console.error('Message error:', err);
        socket.emit('error', { message: 'Failed to send message' });
      }
    });

    socket.on('delete_message', async ({ messageId, channelId }) => {
      await pool.query('DELETE FROM messages WHERE id = $1 AND user_id = $2', [messageId, socket.user.id]);
      io.to(channelId).emit('message_deleted', { messageId });
    });

    socket.on('delete_dm', async ({ messageId, receiverId }) => {
      await pool.query('DELETE FROM dm_messages WHERE id = $1 AND sender_id = $2', [messageId, socket.user.id]);
      io.to(`user_${socket.user.id}`).emit('dm_deleted', { messageId });
      io.to(`user_${receiverId}`).emit('dm_deleted', { messageId });
    });

    socket.on('typing_start', ({ channelId }) => {
      socket.to(channelId).emit('user_typing', { username: socket.user.username });
    });

    socket.on('typing_stop', ({ channelId }) => {
      socket.to(channelId).emit('user_stop_typing', { username: socket.user.username });
    });

    socket.on('dm_typing_start', ({ receiverId }) => {
      io.to(`user_${receiverId}`).emit('dm_user_typing', { username: socket.user.username });
    });

    socket.on('dm_typing_stop', ({ receiverId }) => {
      io.to(`user_${receiverId}`).emit('dm_user_stop_typing', { username: socket.user.username });
    });

    socket.on('send_dm', async ({ receiverId, content }) => {
      if (!content?.trim() || !receiverId) return;
      if (!checkRateLimit(socket.user.id)) {
        return socket.emit('rate_limited', { error: 'You are sending messages too fast!' });
      }
      try {
        const { rows: blocked } = await pool.query(
          'SELECT 1 FROM blocked_users WHERE (blocker_id = $1 AND blocked_id = $2) OR (blocker_id = $2 AND blocked_id = $1)',
          [socket.user.id, receiverId]
        );
        if (blocked.length) return socket.emit('dm_error', { error: 'Cannot send message' });
        const { rows: friends } = await pool.query(
          `SELECT 1 FROM friend_requests WHERE ((sender_id = $1 AND receiver_id = $2) OR (sender_id = $2 AND receiver_id = $1)) AND status = 'accepted'`,
          [socket.user.id, receiverId]
        );
        const { rows: sharedServer } = await pool.query(
          `SELECT 1 FROM server_members sm1 JOIN server_members sm2 ON sm1.server_id = sm2.server_id WHERE sm1.user_id = $1 AND sm2.user_id = $2 LIMIT 1`,
          [socket.user.id, receiverId]
        );
        if (!friends.length && !sharedServer.length) return socket.emit('dm_error', { error: 'You can only DM friends or people you share a server with' });
        const { rows } = await pool.query(
          `INSERT INTO dm_messages (sender_id, receiver_id, content) VALUES ($1, $2, $3) RETURNING *`,
          [socket.user.id, receiverId, content.trim()]
        );
        const { rows: users } = await pool.query(
          'SELECT username, avatar_color, avatar_url, username_color, profile_border FROM users WHERE id = $1',
          [socket.user.id]
        );
        const fullMsg = {
          ...rows[0],
          username: users[0].username,
          avatar_color: users[0].avatar_color,
          avatar_url: users[0].avatar_url,
          username_color: users[0].username_color,
          profile_border: users[0].profile_border,
        };
        socket.emit('new_dm', fullMsg);
        io.to(`user_${receiverId}`).emit('new_dm', fullMsg);
      } catch (err) { console.error('DM error:', err); }
    });

    socket.on('get_online_users', () => {
      socket.emit('online_users', Array.from(onlineUsers));
    });

    socket.on('join_server', (serverId) => { socket.join(`server_${serverId}`); });
    socket.on('join_room', (roomId) => { socket.join(`room_${roomId}`); });

    socket.on('send_room_message', async ({ roomId, content }) => {
      if (!content?.trim() || !roomId) return;
      if (!checkRateLimit(socket.user.id)) {
        return socket.emit('rate_limited', { error: 'You are sending messages too fast!' });
      }
      try {
        const { rows: member } = await pool.query('SELECT 1 FROM room_members WHERE room_id = $1 AND user_id = $2', [roomId, socket.user.id]);
        if (!member.length) return;
        const { rows } = await pool.query('INSERT INTO room_messages (room_id, user_id, content) VALUES ($1, $2, $3) RETURNING *', [roomId, socket.user.id, content.trim()]);
        const { rows: users } = await pool.query(
          'SELECT username, avatar_color, avatar_url, username_color, profile_border FROM users WHERE id = $1',
          [socket.user.id]
        );
        io.to(`room_${roomId}`).emit('new_room_message', {
          ...rows[0],
          username: users[0].username,
          avatar_color: users[0].avatar_color,
          avatar_url: users[0].avatar_url,
          username_color: users[0].username_color,
          profile_border: users[0].profile_border,
        });
      } catch (err) { console.error('Room message error:', err); }
    });

    socket.on('delete_room_message', async ({ messageId, roomId }) => {
      try {
        const { rows } = await pool.query('SELECT user_id FROM room_messages WHERE id = $1', [messageId]);
        if (!rows.length) return;
        const { rows: u } = await pool.query('SELECT is_admin FROM users WHERE id = $1', [socket.user.id]);
        if (String(rows[0].user_id) !== String(socket.user.id) && !u[0]?.is_admin) return;
        await pool.query('DELETE FROM room_messages WHERE id = $1', [messageId]);
        io.to(`room_${roomId}`).emit('room_message_deleted', { messageId });
      } catch (err) { console.error(err); }
    });

    socket.on('disconnect', () => {
      console.log(`❌ ${socket.user.username} disconnected`);
      onlineUsers.delete(socket.user.id);
      io.emit('online_users', Array.from(onlineUsers));
    });
  });
};

module.exports = setupSocket;