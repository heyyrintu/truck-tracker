# Frontend (Web PWA) Deployment Guide

Deploy the Driver Tracker web application separately on any static hosting platform.

---

## 🚀 Coolify Deployment

### Step 1: Deploy Web App

1. **"+ New Service"** → **"Docker"** → **"Via Git Repository"**
2. Repository: `https://github.com/heyyrintu/truck-tracker`
3. Branch: `main`
4. Build Configuration:
   - **Build Pack**: Dockerfile
   - **Dockerfile Location**: `web-pwa/Dockerfile`
   - **Build Context**: `web-pwa`
   - **Port**: `80`

### Step 2: Build Arguments

Add these as build arguments (needed at build time):

```env
VITE_API_URL=https://api.yourdomain.com/api
VITE_APP_NAME=Driver Tracker
```

### Step 3: Domain Configuration

1. Go to **Domains** tab
2. Add your domain: `tracker.yourdomain.com`
3. Enable HTTPS (automatic with Coolify)

---

## 📦 Alternative: Static Hosting Platforms

### Vercel (Recommended for frontend)

1. **New Project** → Import from GitHub
2. Framework: **Vite**
3. Root Directory: `web-pwa`
4. Build Command: `npm install && npm run build`
5. Output Directory: `dist`
6. Environment Variables:
   ```
   VITE_API_URL=https://api.yourdomain.com/api
   VITE_APP_NAME=Driver Tracker
   ```

### Netlify

1. **Add New Site** → Import from Git
2. Base directory: `web-pwa`
3. Build command: `npm run build`
4. Publish directory: `web-pwa/dist`
5. Environment Variables: (same as above)
6. Add redirect rule in `netlify.toml`:

```toml
[[redirects]]
  from = "/*"
  to = "/index.html"
  status = 200
```

### Cloudflare Pages

1. **Create a Project** → Connect Git
2. Build config:
   - Framework: Vite
   - Build command: `cd web-pwa && npm install && npm run build`
   - Build output: `web-pwa/dist`
3. Environment Variables: (same as above)

---

## 🔧 Manual Build & Deploy

### Build Locally

```bash
cd web-pwa

# Set environment variables
export VITE_API_URL=https://api.yourdomain.com/api
export VITE_APP_NAME="Driver Tracker"

# Build
npm install
npm run build

# Output is in dist/ folder
```

### Deploy to Any Static Host

Upload the `dist/` folder contents to:
- AWS S3 + CloudFront
- Google Cloud Storage
- Azure Static Web Apps
- Any web server (Apache, Nginx)

### Nginx Configuration (if self-hosting)

```nginx
server {
    listen 80;
    server_name tracker.yourdomain.com;
    root /var/www/tracker/dist;
    index index.html;

    # Gzip compression
    gzip on;
    gzip_types text/plain text/css application/javascript application/json;

    # Cache static assets
    location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg|woff|woff2|ttf)$ {
        expires 1y;
        add_header Cache-Control "public, immutable";
    }

    # No cache for service worker
    location /sw.js {
        add_header Cache-Control "no-cache";
    }

    # SPA routing
    location / {
        try_files $uri $uri/ /index.html;
    }
}
```

---

## 🌐 Environment Variables Explained

| Variable | Description | Example |
|----------|-------------|---------|
| `VITE_API_URL` | Your backend API URL | `https://api.tracker.com/api` |
| `VITE_APP_NAME` | App display name | `Driver Tracker` |

**Important**: These are **build-time** variables. They get baked into the JavaScript bundle during build. If you change them, you must rebuild and redeploy.

---

## ✅ Verify Deployment

1. **Check if site loads**:
   ```bash
   curl https://tracker.yourdomain.com
   ```

2. **Test login page**:
   - Open https://tracker.yourdomain.com
   - Should see the login form

3. **Check API connection**:
   - Open browser console (F12)
   - Try to login
   - Check network tab for API calls to your backend

4. **Test PWA**:
   - On mobile, should see "Add to Home Screen" prompt
   - Service worker should register (check DevTools → Application → Service Workers)

---

## 📱 PWA Installation

For users to install as an app:

1. **HTTPS is required** (Coolify/Vercel/Netlify auto-provide)
2. Visit site on mobile browser
3. Browser will show "Add to Home Screen" banner
4. Tap to install → App appears on home screen

---

## 🔒 Security Headers (Production)

If using Coolify/Docker, these are already in `nginx.conf`:

```nginx
add_header X-Frame-Options "SAMEORIGIN" always;
add_header X-Content-Type-Options "nosniff" always;
add_header X-XSS-Protection "1; mode=block" always;
add_header Referrer-Policy "strict-origin-when-cross-origin" always;
```

For Vercel/Netlify, add to their respective config files.

---

## 🐛 Troubleshooting

### API Calls Failing (CORS)

Ensure your backend has CORS configured:
```env
# Backend .env
CORS_ORIGIN=https://tracker.yourdomain.com
```

### White Screen / Blank Page

1. Check browser console for errors
2. Verify `VITE_API_URL` is correct
3. Ensure build completed successfully

### PWA Not Installing

1. Verify HTTPS is enabled
2. Check manifest.webmanifest is accessible
3. Check service worker in DevTools → Application

### Build Fails on Vercel/Netlify

Ensure:
- Node version is 18+ (set in platform settings)
- Build command includes `npm install`
- Environment variables are set

---

## 📊 Production Checklist

- [ ] HTTPS enabled (automatic on most platforms)
- [ ] `VITE_API_URL` points to production backend
- [ ] PWA manifest configured
- [ ] Service worker registered
- [ ] Cache headers configured
- [ ] Favicon and icons present
- [ ] Analytics added (optional)

---

## 🚀 Quick Deploy Commands

**Coolify (Docker)**:
Already configured in `web-pwa/Dockerfile`

**Vercel CLI**:
```bash
cd web-pwa
vercel --prod
```

**Netlify CLI**:
```bash
cd web-pwa
netlify deploy --prod
```

Your frontend is now deployed and connected to your backend API! 🎉
