# Deployment Guide - Free Hosting Options

This guide provides instructions for deploying the Job Posts Fetch API on various **FREE** platforms at zero cost.

## Table of Contents
- [Render.com (Recommended)](#rendercom-recommended)
- [Railway.app](#railwayapp)
- [Fly.io](#flyio)
- [Docker Deployment](#docker-deployment)
- [Environment Variables](#environment-variables)

---

## Render.com (Recommended)

Render offers a generous free tier perfect for this API.

### Free Tier Features:
- 750 hours/month (enough for 24/7)
- Auto-deploy from Git
- Custom domains
- Free SSL
- 512 MB RAM
- Automatic health checks

### Deployment Steps:

1. **Create Account**
   - Go to [render.com](https://render.com)
   - Sign up with GitHub/GitLab

2. **Create New Web Service**
   - Click "New +" → "Web Service"
   - Connect your repository
   - Configure service:
     ```
     Name: job-posts-api
     Environment: Node
     Build Command: npm install
     Start Command: npm start
     Instance Type: Free
     ```

3. **Add Environment Variables**
   ```
   NODE_ENV=production
   PORT=3000
   AUTO_FETCH_ENABLED=true
   ```

4. **Deploy**
   - Click "Create Web Service"
   - Render will automatically deploy your app
   - URL: `https://job-posts-api.onrender.com`

### Notes:
- Free tier sleeps after 15 mins of inactivity
- First request after sleep takes ~30 seconds
- Database persists on disk

---

## Railway.app

Railway provides $5 free credit monthly (enough for small apps).

### Free Tier Features:
- $5 credit/month
- Deploy from Git
- Automatic HTTPS
- One-click database provisioning
- Always-on (doesn't sleep)

### Deployment Steps:

1. **Create Account**
   - Go to [railway.app](https://railway.app)
   - Sign up with GitHub

2. **Deploy from GitHub**
   - Click "New Project"
   - Select "Deploy from GitHub repo"
   - Choose your repository

3. **Configure Service**
   - Railway auto-detects Node.js
   - Add environment variables in Settings:
     ```
     NODE_ENV=production
     AUTO_FETCH_ENABLED=true
     ```

4. **Generate Domain**
   - Go to Settings → Domains
   - Click "Generate Domain"
   - URL: `https://your-app.up.railway.app`

### Notes:
- Monitors credit usage
- App doesn't sleep
- Good performance

---

## Fly.io

Fly.io offers excellent free tier with 3 VMs.

### Free Tier Features:
- 3 shared-cpu-1x VMs
- 160GB outbound data transfer
- Automatic SSL
- Global deployment

### Deployment Steps:

1. **Install Flyctl**
   ```bash
   # macOS/Linux
   curl -L https://fly.io/install.sh | sh

   # Windows (PowerShell)
   iwr https://fly.io/install.ps1 -useb | iex
   ```

2. **Login**
   ```bash
   flyctl auth login
   ```

3. **Launch App**
   ```bash
   flyctl launch
   ```

   Answer prompts:
   ```
   App Name: job-posts-api
   Region: Choose closest
   PostgreSQL: No
   Redis: No
   ```

4. **Deploy**
   ```bash
   flyctl deploy
   ```

5. **Set Environment Variables**
   ```bash
   flyctl secrets set NODE_ENV=production
   flyctl secrets set AUTO_FETCH_ENABLED=true
   ```

### Notes:
- Excellent global CDN
- App stays running
- Great for production

---

## Docker Deployment

For self-hosting or cloud platforms supporting Docker.

### Using Docker Compose (Recommended):

1. **Build and Run**
   ```bash
   docker-compose up -d
   ```

2. **Check Logs**
   ```bash
   docker-compose logs -f
   ```

3. **Stop**
   ```bash
   docker-compose down
   ```

### Using Docker Directly:

1. **Build Image**
   ```bash
   docker build -t job-posts-api .
   ```

2. **Run Container**
   ```bash
   docker run -d \
     -p 3000:3000 \
     -e NODE_ENV=production \
     -e AUTO_FETCH_ENABLED=false \
     --name job-posts-api \
     job-posts-api
   ```

3. **View Logs**
   ```bash
   docker logs -f job-posts-api
   ```

---

## Additional Free Platforms

### Cyclic.sh
- Completely free
- Deploy from GitHub
- Automatic HTTPS
- Serverless (cold starts)
- URL: [cyclic.sh](https://cyclic.sh)

### Glitch.com
- Free and fun platform
- 1000 hours/month
- Public by default
- Great for testing
- URL: [glitch.com](https://glitch.com)

### Koyeb
- Free tier: 1 service, 512MB RAM
- Deploy from Docker/GitHub
- Global edge network
- URL: [koyeb.com](https://koyeb.com)

---

## Environment Variables

Essential environment variables for production:

```env
# Required
NODE_ENV=production
PORT=3000

# Optional
AUTO_FETCH_ENABLED=true
AUTO_FETCH_INTERVAL=3600000

# Database (if using PostgreSQL)
DATABASE_URL=postgresql://user:pass@host:5432/db

# CORS (if needed)
ALLOWED_ORIGINS=https://yourfrontend.com
```

---

## Post-Deployment Checklist

- [ ] API is accessible via public URL
- [ ] Health check endpoint works: `GET /health`
- [ ] Swagger docs accessible: `GET /api-docs`
- [ ] Environment variables set correctly
- [ ] Database persists data across restarts
- [ ] Rate limiting is working
- [ ] Caching is enabled
- [ ] Test job fetching: `POST /api/jobs/fetch`
- [ ] Test job application: `POST /api/jobs/1/apply`

---

## Monitoring & Maintenance

### Free Monitoring Tools:

1. **UptimeRobot** (uptimerobot.com)
   - Free monitoring for 50 URLs
   - Alerts via email/SMS
   - 5-minute checks

2. **Better Uptime** (betteruptime.com)
   - Free tier available
   - Status pages
   - Incident management

3. **LogDNA/Mezmo** (mezmo.com)
   - Free log aggregation
   - Search and filter logs
   - Alerts

### Health Monitoring:

Add this as a cron job (UptimeRobot does this automatically):
```bash
curl https://your-api.com/health
```

---

## Scaling (When You Outgrow Free Tier)

1. **Database**: Migrate to managed PostgreSQL
   - Supabase (free tier)
   - Neon (free tier)
   - ElephantSQL (free tier)

2. **Caching**: Add Redis
   - Redis Cloud (free tier)
   - Upstash (serverless Redis, free tier)

3. **File Storage**: For resumes
   - Cloudinary (free tier)
   - AWS S3 (free tier 12 months)

---

## Troubleshooting

### App Not Starting
- Check logs: `flyctl logs` or platform equivalent
- Verify environment variables
- Check PORT is set correctly

### Database Connection Issues
- Ensure database file has write permissions
- For PostgreSQL, verify DATABASE_URL

### Rate Limiting Too Strict
- Adjust limits in `src/middleware/rateLimiter.js`
- Or disable for testing: remove from `src/server.js`

### Memory Issues
- Monitor with `GET /health` (shows memory usage)
- Reduce cache TTL
- Disable scheduler if not needed

---

## Support

For deployment issues:
- Check platform documentation
- Review logs carefully
- Test locally first with Docker
- Open an issue on GitHub

---

## Cost Comparison

| Platform | Free Tier | Monthly Cost After | Always On |
|----------|-----------|-------------------|-----------|
| Render   | 750 hrs   | $7/month          | ❌        |
| Railway  | $5 credit | $5/month          | ✅        |
| Fly.io   | 3 VMs     | $1.94/VM          | ✅        |
| Cyclic   | Unlimited | $5/month          | ❌        |
| Glitch   | 1000 hrs  | $8/month          | ❌        |

**Recommendation**: Start with Render or Railway, upgrade to Fly.io when you need better performance.
