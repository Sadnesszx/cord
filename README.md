# 💬 Cord — Your Discord Clone

A real-time chat app built with React, Node.js, Socket.io, and PostgreSQL. Dark, sleek, bubbly design.

## Stack
- **Frontend**: React + Vite
- **Backend**: Node.js + Express
- **Real-time**: Socket.io (WebSockets)
- **Database**: PostgreSQL
- **Hosting**: Railway (free tier)

---

## 🚀 Run Locally

### 1. Prerequisites
- Node.js 18+
- PostgreSQL running locally (or use a free cloud DB like [Neon](https://neon.tech))

### 2. Clone & Install
```bash
git clone <your-repo-url>
cd cord
npm run install:all
```

### 3. Set up the Server `.env`
```bash
cp server/.env.example server/.env
```
Edit `server/.env`:
```
DATABASE_URL=postgresql://your_user:your_password@localhost:5432/cord
JWT_SECRET=pick-a-long-random-string-here
CLIENT_URL=http://localhost:5173
PORT=3001
NODE_ENV=development
```

### 4. Set up the Client `.env`
```bash
cp client/.env.example client/.env
```
Edit `client/.env`:
```
VITE_API_URL=http://localhost:3001
VITE_SOCKET_URL=http://localhost:3001
```

### 5. Create the database
```bash
createdb cord
```
The app will auto-create all tables on first run.

### 6. Start everything
```bash
npm run dev
```

Open [http://localhost:5173](http://localhost:5173) 🎉

---

## 🚂 Deploy to Railway (Free)

### Backend
1. Go to [railway.app](https://railway.app) and create a new project
2. Click **Add Service → GitHub Repo** and connect your repo
3. Add a **PostgreSQL** plugin to your project (Railway provides this free)
4. Set environment variables in Railway dashboard:
   ```
   DATABASE_URL  → (Railway auto-fills this from the Postgres plugin)
   JWT_SECRET    → your-secret-key
   CLIENT_URL    → https://your-frontend-url.vercel.app
   NODE_ENV      → production
   ```
5. Railway will auto-deploy on every push ✅

### Frontend
1. Go to [vercel.com](https://vercel.com) (free tier)
2. Import your GitHub repo
3. Set root directory to `client`
4. Add environment variables:
   ```
   VITE_API_URL     → https://your-railway-backend.railway.app
   VITE_SOCKET_URL  → https://your-railway-backend.railway.app
   ```
5. Deploy ✅

---

## 📁 Project Structure

```
cord/
├── client/                   # React frontend
│   └── src/
│       ├── components/
│       │   ├── layout/       # ServerSidebar, ChannelSidebar
│       │   ├── chat/         # ChatArea (real-time messages)
│       │   └── ui/           # ProtectedRoute
│       ├── context/          # AuthContext
│       ├── lib/              # api.js, socket.js
│       └── pages/            # AuthPage, AppLayout
│
└── server/                   # Node.js backend
    ├── db/                   # PostgreSQL pool + schema
    ├── middleware/            # JWT auth
    ├── routes/               # auth, servers, messages
    ├── socket/               # WebSocket handlers
    └── index.js              # Entry point
```

---

## ✨ Features (v1)
- [x] Register / Login (JWT auth)
- [x] Create & join servers
- [x] Create channels
- [x] Real-time messaging (Socket.io)
- [x] Typing indicators
- [x] Message history (PostgreSQL)
- [x] Message grouping by user & date

## 🗺️ Coming Next (v2 ideas)
- [ ] Direct Messages
- [ ] File/image uploads
- [ ] Roles & permissions
- [ ] Voice channels
- [ ] Reactions / emoji
- [ ] Message edit & delete
- [ ] Invite links for servers
