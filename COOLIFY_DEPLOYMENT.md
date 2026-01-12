# Coolify Production Deployment Guide

This guide explains how to deploy the Driver Tracker System to **Coolify** - the open-source self-hosted Heroku/Netlify alternative.

---

## 📋 Prerequisites

1. **Coolify instance** running on your server
2. **Domain name** pointed to your server (e.g., `tracker.yourdomain.com`)
3. **GitHub repository** connected to Coolify

---

## 🚀 Deployment Options

### Option 1: Deploy with Docker Compose (Recommended)

This deploys the entire stack (PostgreSQL + Backend + Web) with one configuration.

#### Step 1: Create New Service

1. Go to your Coolify dashboard
2. Click **"+ New Service"**
3. Select **"Docker Compose"**
4. Connect to your GitHub repository: `heyyrintu/truck-tracker`
5. Set branch to `main`

#### Step 2: Configure Environment Variables

In the Coolify service settings, add these environment variables:

```env
# Required
DOMAIN=tracker.yourdomain.com
POSTGRES_PASSWORD=generate_a_strong_password_here
JWT_SECRET=generate_with_openssl_rand_base64_64

# Optional (has defaults)
POSTGRES_DB=driver_tracker
POSTGRES_USER=postgres
JWT_EXPIRES_IN=7d
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100
```

**Generate secure values:**
```bash
# JWT Secret
openssl rand -base64 64

# Database Password
openssl rand -base64 32
```

#### Step 3: Configure Domains

In Coolify, set up your domains:
- **Web App**: `tracker.yourdomain.com` → Port 80
- **API**: `api.tracker.yourdomain.com` → Port 3001

#### Step 4: Deploy

Click **"Deploy"** and wait for the build to complete.

---

### Option 2: Deploy Services Separately

If you prefer more control, deploy each service individually.

#### A. Deploy PostgreSQL Database

1. Go to **"+ New Resource"** → **"Database"** → **"PostgreSQL"**
2. Configure:
   - Database Name: `driver_tracker`
   - Username: `postgres`
   - Password: Generate a strong password
3. Note the internal connection URL

#### B. Deploy Backend API

1. **"+ New Service"** → **"Docker"**
2. Repository: `heyyrintu/truck-tracker`
3. Build Path: `./backend`
4. Dockerfile: `Dockerfile`
5. Port: `3001`

**Environment Variables:**
```env
NODE_ENV=production
PORT=3001
DATABASE_URL=postgresql://postgres:PASSWORD@postgres-internal:5432/driver_tracker
JWT_SECRET=your_jwt_secret
JWT_EXPIRES_IN=7d
```

6. Domain: `api.tracker.yourdomain.com`

#### C. Deploy Web PWA

1. **"+ New Service"** → **"Docker"**
2. Repository: `heyyrintu/truck-tracker`
3. Build Path: `./web-pwa`
4. Dockerfile: `Dockerfile`
5. Port: `80`

**Build Arguments:**
```env
VITE_API_URL=https://api.tracker.yourdomain.com/api
VITE_APP_NAME=Driver Tracker
```

6. Domain: `tracker.yourdomain.com`

---

## 🔧 Post-Deployment Setup

### 1. Run Database Migrations

After the first deployment, run migrations:

```bash
# SSH into your server
ssh user@your-server

# Find the backend container
docker ps | grep driver-tracker-api

# Run migrations
docker exec -it driver-tracker-api npx prisma migrate deploy

# Seed the database (optional - creates test users)
docker exec -it driver-tracker-api npx prisma db seed
```

### 2. Verify Deployment

**Check API Health:**
```bash
curl https://api.tracker.yourdomain.com/health
# Should return: {"status":"ok","timestamp":"..."}
```

**Check Web App:**
- Open https://tracker.yourdomain.com
- You should see the login page

### 3. Test Login

Use the seeded credentials:
- **Admin:** `admin@tracker.com` / `admin123`
- **Driver 1:** `driver1@tracker.com` / `driver123`

---

## 🔒 SSL/TLS Configuration

Coolify automatically handles SSL certificates via Let's Encrypt. Ensure:

1. Your domain DNS is pointing to your server
2. Ports 80 and 443 are open
3. Wait a few minutes for certificate generation

---

## 📊 Monitoring

### View Logs

In Coolify dashboard:
1. Click on your service
2. Go to **"Logs"** tab
3. View real-time logs

**Or via CLI:**
```bash
docker logs -f driver-tracker-api
docker logs -f driver-tracker-web
```

### Health Checks

Both services have health check endpoints:
- API: `https://api.tracker.yourdomain.com/health`
- Web: `https://tracker.yourdomain.com/health`

---

## 🔄 Updating

### Automatic Updates

1. In Coolify, go to your service settings
2. Enable **"Auto Deploy"** for the main branch
3. Push to GitHub → Automatic redeploy

### Manual Updates

1. Go to your service in Coolify
2. Click **"Redeploy"**
3. Wait for the build to complete

---

## 🛠️ Troubleshooting

### Build Fails

**Check the build logs in Coolify:**
- Ensure all environment variables are set
- Check for typos in the Dockerfile path

### API Connection Error

**Verify the DATABASE_URL:**
```bash
docker exec -it driver-tracker-api printenv DATABASE_URL
```

**Check database connectivity:**
```bash
docker exec -it driver-tracker-api npx prisma db pull
```

### CORS Errors

The backend allows CORS from any origin by default. If you need to restrict:

1. Add `CORS_ORIGIN` environment variable
2. Set it to your frontend domain: `https://tracker.yourdomain.com`

### PWA Not Installing

Ensure:
1. Site is served over HTTPS
2. `manifest.webmanifest` is accessible
3. Service worker is registered

---

## 📁 File Structure for Coolify

```
truck-tracker/
├── docker-compose.yml      # Main compose file (Option 1)
├── .env.production.example # Environment template
├── backend/
│   ├── Dockerfile          # Backend Docker image
│   ├── package.json
│   ├── prisma/
│   └── src/
└── web-pwa/
    ├── Dockerfile          # Frontend Docker image
    ├── nginx.conf          # Nginx configuration
    ├── package.json
    └── src/
```

---

## 🔐 Security Checklist

Before going live:

- [ ] Change default passwords (`admin123`, `driver123`)
- [ ] Generate strong JWT_SECRET (64+ characters)
- [ ] Generate strong POSTGRES_PASSWORD
- [ ] Enable rate limiting (default: 100 requests/15min)
- [ ] Review CORS settings if needed
- [ ] Set up database backups
- [ ] Configure monitoring/alerts

---

## 📱 Configure Android App

After deploying the backend:

1. Update `android-app/.env`:
   ```env
   VITE_API_URL=https://api.tracker.yourdomain.com/api
   ```

2. Rebuild the app:
   ```bash
   cd android-app
   npm run build
   npx cap sync android
   cd android
   ./gradlew assembleRelease
   ```

---

## 💡 Tips

### Database Backups

Set up automated backups with Coolify:
1. Go to your PostgreSQL database
2. Enable **"Backups"**
3. Configure schedule (e.g., daily at 3 AM)

### Scaling

For high traffic:
1. Increase container resources in Coolify
2. Consider adding a Redis cache
3. Set up read replicas for the database

### Custom Domain

1. Point your domain to Coolify server IP
2. Add the domain in service settings
3. Enable HTTPS
4. Wait for SSL certificate

---

## 🆘 Need Help?

- **Coolify Docs:** https://coolify.io/docs
- **Coolify Discord:** https://coolify.io/discord
- **Project Issues:** https://github.com/heyyrintu/truck-tracker/issues
