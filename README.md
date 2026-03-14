# 🩸 Blood Donor Finder — Production PWA

A **full-stack Progressive Web Application** connecting emergency blood donors with patients and hospitals in real time, using **Web Push Notifications**, **location-based matching**, and **role-based access control**.

---

## 🚀 Quick Start (Local Development)

### Prerequisites
- Node.js v18+
- MongoDB 7.0+ (local or Atlas)
- npm 9+

### 1. Clone & Install

```bash
git clone <your-repo-url>
cd blood-donor-finder

# Install server dependencies
cd server && npm install

# Install client dependencies
cd ../client && npm install
```

### 2. Configure Environment

```bash
# Copy example env (in project root)
cp .env.example server/.env
```

Edit `server/.env` with your values:

| Variable | Required | Description |
|---|---|---|
| `MONGO_URI` | ✅ | MongoDB connection string |
| `JWT_SECRET` | ✅ | 32+ char random string |
| `VAPID_PUBLIC_KEY` | ✅ | Web Push public key |
| `VAPID_PRIVATE_KEY` | ✅ | Web Push private key |
| `VAPID_EMAIL` | ✅ | Your email |

### 3. Generate VAPID Keys

```bash
cd server
node scripts/generateVapid.js
# Copy the output into server/.env and client/.env
```

### 4. Create Client Env

```bash
# client/.env
VITE_API_URL=/api
VITE_VAPID_PUBLIC_KEY=<your_vapid_public_key>
```

### 5. Run Development Servers

```bash
# Terminal 1 - Backend API (port 5000)
cd server && npm run dev

# Terminal 2 - Frontend (port 5173)
cd client && npm run dev
```

Open **http://localhost:5173**

---

## 🐳 Docker Deployment

```bash
# Copy env and fill in your values
cp .env.example .env

# Start all services
docker-compose up -d

# View logs
docker-compose logs -f
```

Services:
- **MongoDB** → `localhost:27017`
- **API Server** → `localhost:5000`
- **Frontend** → `localhost:3000`

---

## 📡 API Reference

### Authentication `/api/auth`
| Method | Endpoint | Auth | Description |
|---|---|---|---|
| POST | `/register` | ❌ | Register new user |
| POST | `/login` | ❌ | Login & get JWT |
| GET | `/me` | ✅ | Get current user |
| PUT | `/update-profile` | ✅ | Update profile |
| PUT | `/change-password` | ✅ | Change password |
| POST | `/logout` | ✅ | Logout |

### Donors `/api/donors`
| Method | Endpoint | Auth | Description |
|---|---|---|---|
| GET | `/` | ❌ | List donors (paginated) |
| GET | `/search` | ❌ | Nearby donor search |
| GET | `/leaderboard` | ❌ | Top donors |
| GET | `/:id` | ❌ | Donor profile |
| PUT | `/toggle-availability` | 🩸 Donor | Toggle availability |
| GET | `/my/donations` | 🩸 Donor | Donation history |

### Blood Requests `/api/requests`
| Method | Endpoint | Auth | Role |
|---|---|---|---|
| POST | `/` | ✅ | Patient/Hospital |
| GET | `/` | ❌ | Any |
| GET | `/nearby` | ❌ | Any |
| GET | `/:id` | ❌ | Any |
| PUT | `/:id/respond` | ✅ | Donor |
| PUT | `/:id/fulfill` | ✅ | Owner/Admin |
| DELETE | `/:id` | ✅ | Owner/Admin |

### Notifications `/api/notifications`
| Method | Endpoint | Description |
|---|---|---|
| GET | `/public-key` | Get VAPID public key |
| POST | `/subscribe` | Save push subscription |
| DELETE | `/unsubscribe` | Remove subscription |
| POST | `/test` | Send test push |

### Camps `/api/camps`
| Method | Endpoint | Auth |
|---|---|---|
| GET | `/` | ❌ |
| POST | `/` | Hospital/Admin |
| POST | `/:id/register` | Donor |
| POST | `/:id/reminders` | Hospital/Admin |

### Admin `/api/admin`
| Endpoint | Description |
|---|---|
| `GET /stats` | Dashboard stats + charts |
| `GET /users` | User management |
| `PUT /users/:id/toggle-active` | Activate/deactivate user |
| `GET /geographic` | City distribution |

---

## 🏗️ Architecture

```
blood-donor-finder/
├── client/                  # React + Vite PWA
│   ├── public/
│   │   ├── manifest.json    # PWA manifest
│   │   └── service-worker.js # SW: caching + push
│   └── src/
│       ├── components/      # Navbar, DonorCard, MapView, NotificationBell
│       ├── context/         # AuthContext (JWT state)
│       ├── hooks/           # useAuth, useLocation, useNotification
│       ├── pages/           # All page components
│       ├── services/        # Axios API layer
│       └── utils/           # distance.js, eligibility.js
└── server/                  # Node.js + Express API
    ├── config/              # db.js, vapid.js
    ├── controllers/         # auth, donor, request, notification, camp, admin
    ├── middleware/          # authMiddleware, roleMiddleware
    ├── models/              # User, BloodRequest, Donation, Camp, Subscription
    ├── routes/              # All route files
    ├── services/            # pushService, matchingService, eligibilityService
    └── utils/               # logger, distance (Haversine)
```

---

## 🔔 Push Notification Flow

1. User enables notifications → browser calls `pushManager.subscribe()`
2. Frontend sends subscription object to `POST /api/notifications/subscribe`
3. Server stores subscription in MongoDB `Subscription` collection
4. When blood request created → server calls `findNearbyDonors()` (MongoDB `$nearSphere`)
5. For each matching donor → `web-push.sendNotification()` via VAPID
6. Service worker receives push → `self.registration.showNotification()`
7. Donor clicks notification → navigated to request detail page

---

## 🔐 Security Features

- ✅ JWT authentication with 7-day expiry
- ✅ bcrypt password hashing (12 salt rounds)
- ✅ Helmet.js security headers
- ✅ CORS whitelist
- ✅ Rate limiting: 100 req/15min general, 10 req/15min auth
- ✅ Input validation (express-validator)
- ✅ Role-based access control
- ✅ MongoDB injection prevention via Mongoose

---

## 📍 Location & Matching

- **Haversine formula** for accurate Earth-surface distances
- **MongoDB 2dsphere index** + `$nearSphere` for server-side geo-filtering
- Blood group **compatibility matrix** (e.g., O- donors can donate to AB+)
- Radius options: 5km / 10km / 25km
- **90-day eligibility rule** automatically enforced

---

## 👥 User Roles

| Role | Capabilities |
|---|---|
| 🩸 **Donor** | Toggle availability, respond to requests, earn badges |
| 🏥 **Hospital** | Create requests, manage responses, mark fulfilled |
| 🤒 **Patient** | Create blood requests, view donors |
| 🔧 **Admin** | Full access, user management, analytics |

---

## 🏆 Gamification

| Level | Donations | Badge |
|---|---|---|
| Bronze | 1–3 | 🥉 |
| Silver | 4–9 | 🥈 |
| Gold | 10+ | 🥇 |

---

## 🧪 Testing

```bash
cd server
npm test          # Run test suite
npm test:watch    # Watch mode
```

---

## 📝 License

MIT — Feel free to use, modify, and distribute.
