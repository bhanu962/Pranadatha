# Pranadatha — Deployment Guide (Render)

> Full step-by-step guide to deploy **Pranadatha** on [Render](https://render.com) for both the backend API and React frontend.

---

## Table of Contents
1. [Prerequisites](#1-prerequisites)
2. [GitHub Setup](#2-github-setup)
3. [MongoDB Atlas Config](#3-mongodb-atlas-config)
4. [Deploy Backend (API)](#4-deploy-backend-api)
5. [Deploy Frontend (Static Site)](#5-deploy-frontend-static-site)
6. [Environment Variables Reference](#6-environment-variables-reference)
7. [Build Commands Reference](#7-build-commands-reference)
8. [Post-Deploy Steps](#8-post-deploy-steps)
9. [Custom Domain](#9-custom-domain-optional)
10. [Useful Commands](#10-useful-commands)

---

## 1. Prerequisites

- GitHub account with this repo pushed
- [Render](https://render.com) account (free plan available)
- MongoDB Atlas cluster running (already configured)
- Brevo SMTP credentials (already configured)

---

## 2. GitHub Setup

If not already done:
```bash
git init
git add .
git commit -m "feat: Pranadatha initial release"
git branch -M main
git remote add origin https://github.com/YOUR_USERNAME/pranadatha.git
git push -u origin main
```

> ⚠️ Make sure `.env` and `.env.local` are in `.gitignore` and **not committed**.

---

## 3. MongoDB Atlas Config

In MongoDB Atlas → **Network Access** → Add IP:
- Add `0.0.0.0/0` (Allow all IPs) — required for Render's dynamic IPs

In **Database Access**: ensure your DB user has Read/Write access.

---

## 4. Deploy Backend (API)

### Option A — Using render.yaml (Recommended)
1. Go to **Render Dashboard** → **New** → **Blueprint**
2. Connect your GitHub repo
3. Render auto-detects `render.yaml` and creates both services

### Option B — Manual Setup

1. **Render Dashboard** → **New** → **Web Service**
2. Connect your GitHub repo
3. Fill in the settings:

| Setting | Value |
|---------|-------|
| **Name** | `pranadatha-api` |
| **Region** | Singapore |
| **Branch** | `main` |
| **Root Directory** | `server` |
| **Runtime** | `Node` |
| **Build Command** | `npm install` |
| **Start Command** | `node server.js` |
| **Plan** | Free |

4. Set **Health Check Path**: `/api/health`

5. Go to **Environment** → add all variables from [Section 6](#6-environment-variables-reference)

6. Click **Create Web Service** → wait for deployment ✅

---

## 5. Deploy Frontend (Static Site)

1. **Render Dashboard** → **New** → **Static Site**
2. Connect your GitHub repo
3. Fill in settings:

| Setting | Value |
|---------|-------|
| **Name** | `pranadatha-client` |
| **Branch** | `main` |
| **Root Directory** | `client` |
| **Build Command** | `npm install && npm run build` |
| **Publish Directory** | `dist` |

4. Set **Environment Variables**:

| Key | Value |
|-----|-------|
| `VITE_API_URL` | `https://pranadatha-api.onrender.com/api` |
| `VITE_VAPID_PUBLIC_KEY` | *your VAPID public key* |

5. **Redirects / Rewrites** — Click **Redirects/Rewrites** tab → Add:

| Source | Destination | Action |
|--------|-------------|--------|
| `/*` | `/index.html` | Rewrite |

> This is **required** for React Router to work on page refresh.

6. Click **Create Static Site** → wait for deployment ✅

---

## 6. Environment Variables Reference

### Backend (`server/`)

| Variable | Value / Notes |
|----------|---------------|
| `NODE_ENV` | `production` |
| `PORT` | `10000` *(Render sets this automatically)* |
| `MONGO_URI` | `mongodb+srv://...` |
| `JWT_SECRET` | Long random string |
| `JWT_REFRESH_SECRET` | Long random string |
| `JWT_EXPIRE` | `7d` |
| `VAPID_PUBLIC_KEY` | From `npm run generate-vapid` |
| `VAPID_PRIVATE_KEY` | From `npm run generate-vapid` |
| `VAPID_EMAIL` | `pranadatha@gmail.com` |
| `SMTP_HOST` | `smtp-relay.brevo.com` |
| `SMTP_PORT` | `587` |
| `SMTP_USER` | Brevo SMTP user |
| `SMTP_PASS` | Brevo SMTP password |
| `FROM_EMAIL` | `noreply@pranadatha.in` |
| `FROM_NAME` | `Pranadatha` |
| `CORS_ORIGIN` | `https://pranadatha-client.onrender.com` |
| `CLIENT_URL` | `https://pranadatha-client.onrender.com` |
| `LOG_LEVEL` | `info` |

### Frontend (`client/`)

| Variable | Value |
|----------|-------|
| `VITE_API_URL` | `https://pranadatha-api.onrender.com/api` |
| `VITE_VAPID_PUBLIC_KEY` | Same as server `VAPID_PUBLIC_KEY` |

---

## 7. Build Commands Reference

### Local Development
```bash
# Backend
cd server
npm install
npm run dev          # nodemon server.js on :5000

# Frontend
cd client
npm install
npm run dev          # vite dev server on :5173

# Both at once (from root)
start.bat            # Windows
```

### Production Build (Frontend only — backend has no build step)
```bash
cd client
npm run build        # outputs to client/dist/
npm run preview      # preview production build locally
```

### Database Scripts
```bash
cd server
npm run seed         # Seed demo data (safe to re-run)
node scripts/clear-db.js   # ⚠️ Wipe DB + seed admin only
npm run generate-vapid     # Generate new VAPID keys
```

---

## 8. Post-Deploy Steps

After both services are live:

1. **Seed the database** (from your local machine with prod `MONGO_URI`):
```bash
cd server
MONGO_URI=mongodb+srv://... node scripts/seed.js
```

2. **Update `CORS_ORIGIN`** in backend env to your actual frontend URL

3. **Update `CLIENT_URL`** in backend env for correct email links

4. **Test the health endpoint**:
```
GET https://pranadatha-api.onrender.com/api/health
```
Should return: `{ "success": true, "status": "healthy" }`

5. **Test login** with admin account:
   - Email: `admin@bloodfinder.app`
   - Password: `admin123456`

---

## 9. Custom Domain (Optional)

In Render Dashboard → your service → **Settings** → **Custom Domain**:
- Add `api.pranadatha.in` for backend
- Add `pranadatha.in` or `www.pranadatha.in` for frontend
- Render provides free SSL for custom domains

Then update `CORS_ORIGIN` and `CLIENT_URL` accordingly.

---

## 10. Useful Commands

```bash
# Check Render logs
# → Render Dashboard → your service → Logs tab

# Force redeploy
# → Render Dashboard → your service → Manual Deploy

# Generate new VAPID keys (if needed)
cd server && npm run generate-vapid

# Check if API is up
curl https://pranadatha-api.onrender.com/api/health
```

---

> **Free tier note**: Render free services spin down after 15 minutes of inactivity. The first request after spin-down takes ~30 seconds. Upgrade to Starter ($7/mo) for always-on hosting.
