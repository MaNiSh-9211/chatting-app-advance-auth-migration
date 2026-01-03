# AuthAdvance - Full-Stack Authentication System

A production-ready authentication system built with Node.js, TypeScript, React, MongoDB, and Redis.

## Features

- 🔐 **Email/Password Authentication** with comprehensive validation
- 🚀 **Super-fast Email Check** using Redis (Instagram-style instant feedback)
- 📧 **Email Verification** with beautiful HTML templates
- 🔑 **Password Reset** flow with secure tokens
- 🎫 **JWT Authentication** with Access/Refresh token rotation
- 🌐 **OAuth Integration** (Google & GitHub)
- 💅 **Premium Glassmorphism UI** with dark theme

---

## 📋 Prerequisites

Before running this project, you need:

| Service | Description |
|---------|-------------|
| **Node.js** | v18+ recommended |
| **MongoDB** | Local or cloud (MongoDB Atlas) |
| **Redis** | Local Redis server |
| **Google OAuth** | For Google login |
| **GitHub OAuth** | For GitHub login |
| **SMTP Server** | For sending emails |

---

## 🔧 Setup Guide

### 1. Install Dependencies

```bash
# Install server dependencies
cd server
npm install

# Install client dependencies
cd ../client
npm install
```

### 2. Configure Environment Variables

Copy the example env file and edit it:

```bash
cd server
copy .env.example .env
```

Edit `server/.env` with your credentials (see sections below for how to get each).

---

## 🗄️ MongoDB Setup

### Option A: Local MongoDB
1. Download and install [MongoDB Community Server](https://www.mongodb.com/try/download/community)
2. Start MongoDB service
3. Use connection string: `mongodb://localhost:27017/auth-advance`

### Option B: MongoDB Atlas (Cloud - Free)
1. Go to [MongoDB Atlas](https://www.mongodb.com/atlas)
2. Create a free account and cluster
3. Click "Connect" → "Connect your application"
4. Copy the connection string (looks like: `mongodb+srv://user:password@cluster.mongodb.net/auth-advance`)
5. Replace `<password>` with your actual password

```env
MONGODB_URI=mongodb+srv://USER:PASSWORD@cluster.mongodb.net/auth-advance?retryWrites=true&w=majority
```

---

## 📮 Redis Setup (Optional)

> **Note:** Redis is **optional**. If you don't have Redis, set `REDIS_ENABLED=false` in your `.env` file and the app will work normally (just without the instant email availability check).

### Option A: Disable Redis (Easiest)
If you don't want to set up Redis, just set:
```env
REDIS_ENABLED=false
```

### Option B: Local Redis (Windows)
1. Download [Redis for Windows](https://github.com/microsoftarchive/redis/releases) or use WSL
2. Extract and run `redis-server.exe`
3. Default connection: `localhost:6379`

### Option C: Using Docker
```bash
docker run -d -p 6379:6379 --name redis redis:alpine
```

```env
REDIS_ENABLED=true
REDIS_HOST=localhost
REDIS_PORT=6379
```

---

## 🔑 Google OAuth Setup

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project (or select existing)
3. Navigate to **APIs & Services** → **Credentials**
4. Click **Create Credentials** → **OAuth client ID**
5. Select **Web application**
6. Add authorized origins:
   - `http://localhost:5000`
   - `http://localhost:5173`
7. Add authorized redirect URIs:
   - `http://localhost:5000/api/auth/google/callback`
8. Copy **Client ID** and **Client Secret**

```env
GOOGLE_CLIENT_ID=your-client-id.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=your-client-secret
GOOGLE_CALLBACK_URL=http://localhost:5000/api/auth/google/callback
```

---

## 🐙 GitHub OAuth Setup

1. Go to [GitHub Developer Settings](https://github.com/settings/developers)
2. Click **New OAuth App**
3. Fill in:
   - **Application name**: AuthAdvance (or your choice)
   - **Homepage URL**: `http://localhost:5173`
   - **Authorization callback URL**: `http://localhost:5000/api/auth/github/callback`
4. Click **Register application**
5. Copy **Client ID**
6. Generate and copy **Client Secret**

```env
GITHUB_CLIENT_ID=your-github-client-id
GITHUB_CLIENT_SECRET=CHANGE_ME_GITHUB_SECRET
GITHUB_CALLBACK_URL=http://localhost:5000/api/auth/github/callback
```

---

## 📧 Email (SMTP) Setup

### Option A: Gmail (Easy for testing)
1. Go to [Google Account Security](https://myaccount.google.com/security)
2. Enable **2-Step Verification**
3. Go to **App passwords** (search in Google Account settings)
4. Generate a new app password for "Mail"
5. Copy the 16-character password

```env
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASS=your-16-char-app-password
```

### Option B: Mailtrap (For development)
1. Sign up at [Mailtrap.io](https://mailtrap.io/)
2. Get SMTP credentials from your inbox settings

---

## 📁 Final .env File Example

```env
# Server
PORT=5000
NODE_ENV=development

# MongoDB
MONGODB_URI=mongodb://localhost:27017/auth-advance

# Redis (set to false if Redis is not installed)
REDIS_ENABLED=true
REDIS_HOST=localhost
REDIS_PORT=6379

# JWT
JWT_ACCESS_SECRET=super-secret-access-key-change-this
JWT_REFRESH_SECRET=super-secret-refresh-key-change-this
JWT_ACCESS_EXPIRES_IN=15m
JWT_REFRESH_EXPIRES_IN=7d

# OAuth - Google
GOOGLE_CLIENT_ID=xxxxx.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=xxxxx
GOOGLE_CALLBACK_URL=http://localhost:5000/api/auth/google/callback

# OAuth - GitHub
GITHUB_CLIENT_ID=xxxxx
GITHUB_CLIENT_SECRET=xxxxx
GITHUB_CALLBACK_URL=http://localhost:5000/api/auth/github/callback

# Email (SMTP)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASS=your-app-password

# Frontend URL
CLIENT_URL=http://localhost:5173
```

---

## 🚀 Running the Project

### Method 1: Using the Start Script (Recommended)
```bash
# From project root
.\start.ps1
```

### Method 2: Manual (Two Terminals)

**Terminal 1 - Backend:**
```bash
cd server
npm run dev
```

**Terminal 2 - Frontend:**
```bash
cd client
npm run dev
```

### Method 3: Step-by-Step Commands

```bash
# Step 1: Open Terminal 1 and start Redis (if not running)
redis-server

# Step 2: Open Terminal 2 and start the backend
cd c:\Users\at381\OneDrive\Desktop\auth-advance\server
npm run dev

# Step 3: Open Terminal 3 and start the frontend
cd c:\Users\at381\OneDrive\Desktop\auth-advance\client
npm run dev

# Step 4: Open browser
# Go to: http://localhost:5173
```

---

## 🌐 Access the Application

| Service | URL |
|---------|-----|
| **Frontend** | http://localhost:5173 |
| **Backend API** | http://localhost:5000 |
| **Health Check** | http://localhost:5000/health |

---

## 📂 Project Structure

```
auth-advance/
├── server/                 # Node.js Backend
│   ├── src/
│   │   ├── config/        # DB, Redis, Passport configs
│   │   ├── controllers/   # Route handlers
│   │   ├── middleware/    # Auth, validation middleware
│   │   ├── models/        # Mongoose models
│   │   ├── routes/        # API routes
│   │   ├── services/      # Token, Email services
│   │   ├── types/         # TypeScript declarations
│   │   ├── validators/    # Zod schemas
│   │   └── index.ts       # Entry point
│   ├── .env               # Environment variables
│   └── package.json
│
├── client/                 # React Frontend
│   ├── src/
│   │   ├── api/           # API client
│   │   ├── components/    # Reusable UI components
│   │   ├── context/       # Auth context
│   │   ├── pages/         # Page components
│   │   ├── App.tsx        # Main app with routing
│   │   └── index.css      # Global styles
│   └── package.json
│
├── README.md              # This file
└── start.ps1              # Windows startup script
```

---

## 🔒 API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/auth/check-email` | Check email availability |
| POST | `/api/auth/register` | Register new user |
| POST | `/api/auth/login` | Login with email/password |
| POST | `/api/auth/verify-email` | Verify email token |
| POST | `/api/auth/forgot-password` | Request password reset |
| POST | `/api/auth/reset-password` | Reset password |
| POST | `/api/auth/refresh-token` | Refresh access token |
| POST | `/api/auth/logout` | Logout user |
| GET | `/api/auth/me` | Get current user (protected) |
| GET | `/api/auth/google` | Google OAuth |
| GET | `/api/auth/github` | GitHub OAuth |

---

## 🛠️ Troubleshooting

### "MongoDB connection error"
- Ensure MongoDB is running
- Check your `MONGODB_URI` is correct
- For Atlas, ensure your IP is whitelisted

### "Redis connection error"
- Start Redis server: `redis-server`
- Check Redis is running on port 6379

### OAuth not working
- Verify callback URLs match exactly
- Check client ID and secret are correct
- Ensure authorized origins include localhost ports

### Emails not sending
- Check SMTP credentials
- For Gmail, ensure App Password is used (not regular password)
- Check spam folder

---

## 📜 License

MIT License - Feel free to use for any project!
