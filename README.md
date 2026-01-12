# Driver Tracker System

A production-ready driver location tracking system with:
- **Web PWA** for drivers and admins
- **Android Hybrid App** for reliable background location tracking
- **Shared Backend** with PostgreSQL database

## 🏗️ Architecture

```
┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐
│   Web PWA       │     │  Android App    │     │   Admin Web     │
│   (Drivers)     │     │  (Drivers)      │     │   (Dashboard)   │
└────────┬────────┘     └────────┬────────┘     └────────┬────────┘
         │                       │                       │
         └───────────────────────┼───────────────────────┘
                                 │
                    ┌────────────▼────────────┐
                    │      REST API           │
                    │   (Node + Express)      │
                    └────────────┬────────────┘
                                 │
                    ┌────────────▼────────────┐
                    │      PostgreSQL         │
                    │      (Prisma ORM)       │
                    └─────────────────────────┘
```

## 📁 Project Structure

```
/backend         - Node.js + Express + TypeScript API
/web-pwa         - React + Vite + Tailwind PWA
/android-app     - Ionic + Capacitor Android App
```

## 🚀 Quick Start

### Prerequisites

- Node.js 18+ 
- PostgreSQL 14+
- Android Studio (for Android app)
- npm or yarn

### 1. Backend Setup

```bash
cd backend
npm install

# Create .env file
cp .env.example .env
# Edit .env with your database credentials

# Run migrations
npx prisma migrate dev

# Seed database
npm run seed

# Start development server
npm run dev
```

### 2. Web PWA Setup

```bash
cd web-pwa
npm install

# Create .env file
cp .env.example .env
# Set API URL

# Start development server
npm run dev
```

### 3. Android App Setup

```bash
cd android-app
npm install

# Create environment config
cp .env.example .env

# Build the web assets
npm run build

# Sync with Capacitor
npx cap sync android

# Open in Android Studio
npx cap open android
```

## 🔐 Environment Variables

### Backend (.env)
```env
DATABASE_URL="postgresql://user:password@localhost:5432/driver_tracker"
JWT_SECRET="your-super-secret-jwt-key-min-32-chars"
JWT_EXPIRES_IN="7d"
PORT=3001
NODE_ENV=development
```

### Web PWA (.env)
```env
VITE_API_URL=http://localhost:3001/api
VITE_APP_NAME="Driver Tracker"
```

### Android App (.env)
```env
VITE_API_URL=http://your-server-ip:3001/api
VITE_APP_NAME="Driver Tracker"
```

## 👥 Default Users (Seed Data)

| Role   | Email               | Password    |
|--------|---------------------|-------------|
| Admin  | admin@tracker.com   | admin123    |
| Driver | driver1@tracker.com | driver123   |
| Driver | driver2@tracker.com | driver123   |

## 📱 Features

### Driver Features (PWA + Android)
- ✅ Login with JWT authentication
- ✅ Start/Pause/Resume/Stop shift tracking
- ✅ Real-time location capture (10s/25m default)
- ✅ Battery-saving mode (60s/100m)
- ✅ Offline-first with local queue
- ✅ Auto-sync with exponential backoff
- ✅ Online/offline indicator
- ✅ Permission handling

### Admin Features (Web Only)
- ✅ Dashboard with all drivers
- ✅ Real-time driver status
- ✅ Map with breadcrumb trail
- ✅ Location timeline table
- ✅ Session history
- ✅ CSV export

### Backend Features
- ✅ JWT auth with roles
- ✅ Rate limiting
- ✅ Request validation
- ✅ Idempotent batch ingestion
- ✅ UTC timestamp handling

## 🔨 Build for Production

### Backend
```bash
cd backend
npm run build
npm start
```

### Web PWA
```bash
cd web-pwa
npm run build
# Deploy dist/ to your web server
```

### Android App
```bash
cd android-app
npm run build
npx cap sync android
# Build APK/AAB in Android Studio
```

## 📋 API Endpoints

| Method | Endpoint                          | Description              |
|--------|-----------------------------------|--------------------------|
| POST   | /api/auth/login                   | User login               |
| POST   | /api/sessions/start               | Start tracking session   |
| POST   | /api/sessions/pause               | Pause session            |
| POST   | /api/sessions/resume              | Resume session           |
| POST   | /api/sessions/stop                | Stop session             |
| POST   | /api/locations/batch              | Batch upload points      |
| GET    | /api/admin/drivers                | List all drivers         |
| GET    | /api/admin/drivers/:id/sessions   | Get driver sessions      |
| GET    | /api/admin/drivers/:id/locations  | Get driver locations     |
| GET    | /api/admin/export                 | Export CSV               |

## ⚠️ Known Limitations

### PWA Background Tracking
- **Web PWA tracking only works when the browser tab is open/active**
- Background tracking is severely limited by browser power-saving features
- The tab will be suspended after ~30 seconds in background on most browsers
- Service Workers cannot access Geolocation API

### Recommendation
- **Use the Android app for actual driver tracking**
- The PWA is suitable for:
  - Admin dashboard access
  - Quick driver check-in when Android app unavailable
  - Testing and development

### Android App
- Requires "Allow all the time" location permission on Android 10+
- Battery optimization must be disabled for reliable background tracking
- Some OEM ROMs (Xiaomi, Huawei, etc.) may require additional settings

## 🧪 Testing Notes

1. **Backend Tests**
   ```bash
   cd backend
   npm run test
   ```

2. **Manual Testing Flow**
   - Login as driver
   - Start a shift
   - Move around (or use mock location on Android)
   - Observe location points being captured
   - Toggle airplane mode to test offline queue
   - Turn network back on to see sync
   - Login as admin to view driver on map

3. **Test Offline Sync**
   - Start tracking
   - Disconnect network
   - Continue moving (points queue locally)
   - Reconnect network
   - Watch queue count decrease as sync happens

## 📝 License

MIT License - Use freely for your projects!
