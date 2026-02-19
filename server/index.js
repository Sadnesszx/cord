require('dotenv').config();
const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');
const { initDB } = require('./db');
const setupSocket = require('./socket');

const app = express();
const server = http.createServer(app);

const io = new Server(server, {
  cors: {
    origin: process.env.CLIENT_URL || 'http://localhost:5173',
    methods: ['GET', 'POST'],
  },
});

// Middleware
app.use(cors({ origin: process.env.CLIENT_URL || 'http://localhost:5173' }));
app.use(express.json());

// Routes
app.use('/api/auth', require('./routes/auth'));
app.use('/api/servers', require('./routes/servers'));
app.use('/api', require('./routes/messages'));
app.use('/api/users', require('./routes/users'));
app.use('/api/friends', require('./routes/friends'));

app.get('/health', (_, res) => res.json({ status: 'ok' }));

// Socket
setupSocket(io);

const PORT = process.env.PORT || 3001;

initDB().then(() => {
  server.listen(PORT, () => {
    console.log(`🚀 SadLounge server running on port ${PORT}`);
  });
}).catch(console.error);
