# Backend API Deployment Guide

Deploy the Driver Tracker backend API separately on any platform (Coolify, Railway, Render, etc.)

---

## 🚀 Coolify Deployment

### Step 1: Create PostgreSQL Database

1. In Coolify → **"+ New Resource"** → **"Database"** → **"PostgreSQL"**
2. Configure:
   - Name: `driver-tracker-db`
   - Database: `driver_tracker`
   - Username: `postgres`
   - Password: Generate a strong password
3. Note the internal connection URL (e.g., `postgresql://postgres:password@postgres:5432/driver_tracker`)

### Step 2: Deploy Backend API

1. **"+ New Service"** → **"Docker"** → **"Via Git Repository"**
2. Repository: `https://github.com/heyyrintu/truck-tracker`
3. Branch: `main`
4. Build Configuration:
   - **Build Pack**: Dockerfile
   - **Dockerfile Location**: `backend/Dockerfile`
   - **Build Context**: `backend`
   - **Port**: `3001`

### Step 3: Environment Variables

Add these in Coolify service settings:

```env
# Node Environment
NODE_ENV=production
PORT=3001

# Database Connection
DATABASE_URL=postgresql://postgres:YOUR_PASSWORD@postgres-internal:5432/driver_tracker

# JWT Configuration (Generate with: openssl rand -base64 64)
JWT_SECRET=your_generated_jwt_secret_here
JWT_EXPIRES_IN=7d

# Rate Limiting (Optional)
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100

# CORS Origin (Optional - your frontend URL)
CORS_ORIGIN=https://your-frontend-domain.com
```

### Step 4: Domain Configuration

1. Go to **Domains** tab in your service
2. Add your domain: `api.yourdomain.com`
3. Enable HTTPS (automatic with Coolify)

### Step 5: Run Database Migrations

After first deployment:

```bash
# SSH into your server or use Coolify terminal
docker exec -it <backend-container-id> npx prisma migrate deploy

# Optional: Seed test data
docker exec -it <backend-container-id> npx prisma db seed
```

---

## 📊 Health Check

Test if your API is running:

```bash
curl https://api.yourdomain.com/health
# Should return: {"status":"ok","timestamp":"..."}
```

---

## 🔧 Other Platforms

### Railway

1. Click **"Deploy from GitHub"**
2. Select `backend` folder as root
3. Add environment variables from above
4. Railway auto-detects Dockerfile

### Render

1. **New → Web Service**
2. Connect GitHub repo
3. Root Directory: `backend`
4. Build Command: `npm install && npm run build`
5. Start Command: `node dist/index.js`
6. Add environment variables

### Vercel (API Routes)

Not recommended for this Express backend. Use Coolify, Railway, or Render instead.

---

## 📝 Test Users (from seed)

After seeding:
- **Admin**: `admin@tracker.com` / `admin123`
- **Driver 1**: `driver1@tracker.com` / `driver123`
- **Driver 2**: `driver2@tracker.com` / `driver123`

---

## 🔒 Security Checklist

- [ ] Strong `JWT_SECRET` (64+ characters)
- [ ] Strong database password
- [ ] HTTPS enabled
- [ ] CORS configured for your frontend domain
- [ ] Rate limiting enabled
- [ ] Database backups configured

---

## 🐛 Troubleshooting

### Database Connection Failed

Check if `DATABASE_URL` is correct:
```bash
docker exec -it <container> printenv DATABASE_URL
```

### Port Already in Use

Ensure PORT=3001 in environment variables.

### Migrations Not Running

Manually run:
```bash
docker exec -it <container> sh
npx prisma migrate deploy
```

---

## 📈 Monitoring

View logs in real-time:
```bash
# Coolify
Use the Logs tab in dashboard

# Or via CLI
docker logs -f <container-name>
```
