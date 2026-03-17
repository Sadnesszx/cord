require('dotenv').config();
const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');
const { initDB } = require('./db');
const setupSocket = require('./socket');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');

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
app.use(helmet());
app.use(express.json());

// Rate limiting - max 20 requests per minute on auth routes
const authLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 20,
  message: { error: 'Too many attempts, please try again in a minute.' },
  standardHeaders: true,
  legacyHeaders: false,
});
app.use('/api/auth', authLimiter);

// General rate limit - max 200 requests per minute
const generalLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 200,
  message: { error: 'Too many requests, slow down!' },
  standardHeaders: true,
  legacyHeaders: false,
});
app.use(generalLimiter);

// Socket
setupSocket(io);
global.getIO = () => io;

// Routes
app.use('/api/auth', require('./routes/auth'));
app.use('/api/servers', require('./routes/servers'));
app.use('/api', require('./routes/messages'));
app.use('/api/users', require('./routes/users'));
app.use('/api/friends', require('./routes/friends'));
app.use('/api/admin', require('./routes/admin'));
app.use('/api/scores', require('./routes/scores'));
app.use('/api/forums', require('./routes/forums'));
app.use('/api/rooms', require('./routes/rooms'));
app.use('/api/rooms', require('./routes/rooms'));

app.get('/health', (_, res) => res.json({ status: 'ok' }));

const PORT = process.env.PORT || 3001;

initDB().then(() => {
  server.listen(PORT, () => {
    console.log(`🚀 NihilisticChat server running on port ${PORT}`);
  });
}).catch(console.error);