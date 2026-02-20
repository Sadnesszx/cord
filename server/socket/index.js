const jwt = require('jsonwebtoken');
const { pool } = require('../db');

const setupSocket = (io) => {
  const onlineUsers = new Set();

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
        if (room !== socket.id && room !== `user_${socket.user.id}`) {
          socket.leave(room);
        }
      });
      socket.join(channelId);
    });

    socket.on('send_message', async ({ channelId, content }) => {
      if (!content?.trim() || !channelId) return;
      try {
        const { rows } = await pool.query(
          `INSERT INTO messages (channel_id, user_id, content)
           VALUES ($1, $2, $3) RETURNING *`,
          [channelId, socket.user.id, content.trim()]
        );
        const message = rows[0];
        const { rows: users } = await pool.query(
          `SELECT username, avatar_color FROM users WHERE id = $1`,
          [socket.user.id]
        );
        const fullMessage = {
          ...message,
          username: users[0].username,
          avatar_color: users[0].avatar_color,
        };
        io.to(channelId).emit('new_message', fullMessage);
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

    socket.on('send_dm', async ({ receiverId, content }) => {
      if (!content?.trim() || !receiverId) return;
      try {
        const { rows } = await pool.query(
          `INSERT INTO dm_messages (sender_id, receiver_id, content) VALUES ($1, $2, $3) RETURNING *`,
          [socket.user.id, receiverId, content.trim()]
        );
        const { rows: users } = await pool.query(
          'SELECT username, avatar_color FROM users WHERE id = $1',
          [socket.user.id]
        );
        const fullMsg = { ...rows[0], username: users[0].username, avatar_color: users[0].avatar_color };
        socket.emit('new_dm', fullMsg);
        io.to(`user_${receiverId}`).emit('new_dm', fullMsg);
      } catch (err) {
        console.error('DM error:', err);
      }
    });

    socket.on('disconnect', () => {
      console.log(`❌ ${socket.user.username} disconnected`);
      onlineUsers.delete(socket.user.id);
      io.emit('online_users', Array.from(onlineUsers));
    });
  });
};

module.exports = setupSocket;