# AssistFlow Backend Deployment Guide

**Last Updated:** September 28, 2026  
**Target:** Production deployment of FastAPI backend  
**Cost:** Free tier options included

---

## 📋 Table of Contents

1. [Quick Comparison](#quick-comparison)
2. [Option 1: Railway (Recommended)](#option-1-railway-recommended)
3. [Option 2: Render](#option-2-render)
4. [Option 3: AWS (Free Tier)](#option-3-aws-free-tier)
5. [Option 4: Google Cloud Run](#option-4-google-cloud-run)
6. [Option 5: Fly.io](#option-5-flyio)
7. [Option 6: Vercel (Serverless)](#option-6-vercel-serverless)
8. [Environment Variables Setup](#environment-variables-setup)
9. [Post-Deployment Configuration](#post-deployment-configuration)
10. [Troubleshooting](#troubleshooting)

---

## 🎯 Quick Comparison

| Platform | Free Tier | Ease | Performance | Limits | Best For |
|----------|-----------|------|-------------|--------|----------|
| **Railway** | $5 credit/month | ⭐⭐⭐⭐⭐ | Fast | 500 hrs/month | Fastest setup |
| **Render** | 750 hrs/month | ⭐⭐⭐⭐⭐ | Medium | Sleeps after 15min | Simple apps |
| **AWS EC2** | 750 hrs/month | ⭐⭐⭐ | Fast | 1 year free | Learning AWS |
| **Google Cloud Run** | 2M requests/month | ⭐⭐⭐⭐ | Fast | Cold starts | High traffic |
| **Fly.io** | 3 VMs free | ⭐⭐⭐⭐ | Fast | 256MB RAM | Edge deployment |
| **Vercel** | Unlimited | ⭐⭐⭐ | Fast | 10s timeout | Hobby projects |

**Recommendation:** Railway for simplicity, AWS for scalability, Render for zero cost

---

## Option 1: Railway (Recommended) ⭐

**Why Railway:**
- ✅ Easiest deployment (1-click from GitHub)
- ✅ Automatic HTTPS and domain
- ✅ Built-in monitoring
- ✅ No sleep/cold starts
- ✅ $5 free credit monthly (~100 hours)

### Step 1: Prepare Backend for Railway

Create `railway.json` in the backend directory:

```bash
cd /Users/mark/AssistFlow/backend
```

Create the file:

```json
{
  "$schema": "https://railway.app/railway.schema.json",
  "build": {
    "builder": "NIXPACKS"
  },
  "deploy": {
    "startCommand": "uvicorn app.main:app --host 0.0.0.0 --port $PORT",
    "restartPolicyType": "ON_FAILURE",
    "restartPolicyMaxRetries": 10
  }
}
```

### Step 2: Add Procfile (Optional)

Create `Procfile` in backend/:

```
web: uvicorn app.main:app --host 0.0.0.0 --port $PORT
```

### Step 3: Deploy to Railway

**Via Railway Dashboard:**

1. Go to https://railway.app and sign up (use GitHub)
2. Click **"New Project"** → **"Deploy from GitHub repo"**
3. Select your `AssistFlow` repository
4. Railway will auto-detect Python
5. Set **Root Directory** to `backend`
6. Click **"Deploy Now"**

**Via Railway CLI:**

```bash
# Install Railway CLI
npm i -g @railway/cli

# Login
railway login

# Initialize project
cd backend
railway init

# Deploy
railway up
```

### Step 4: Set Environment Variables

In Railway dashboard:

1. Go to your project → **"Variables"** tab
2. Add these variables:

```env
GOOGLE_API_KEY=your_gemini_api_key_here
CHROMA_PERSIST_DIR=/app/data/chroma
KNOWLEDGE_DIR=/app/data/knowledge
OFFLINE_DB_PATH=/app/data/offline_cache/offline.db
PORT=8000
```

### Step 5: Add Persistent Volume for ChromaDB

**Important:** ChromaDB needs persistent storage

In Railway dashboard:
1. Go to **"Settings"** → **"Volumes"**
2. Click **"New Volume"**
3. Mount path: `/app/data`
4. Size: 1GB (sufficient for knowledge base)

### Step 6: Copy Data Files to Railway

**Option A: Build-time copy (Recommended)**

Create `railway.toml`:

```toml
[build]
builder = "NIXPACKS"

[deploy]
startCommand = "python -m scripts.ingest_knowledge && uvicorn app.main:app --host 0.0.0.0 --port $PORT"
```

**Option B: Manual upload via Railway CLI:**

```bash
railway run python scripts/ingest_knowledge.py
```

### Step 7: Get Your Production URL

Railway will provide a URL like:
```
https://assistflow-production.up.railway.app
```

### Step 8: Test the Deployment

```bash
# Health check
curl https://your-app.up.railway.app/api/health

# Test query
curl -X POST https://your-app.up.railway.app/api/chat \
  -H "Content-Type: application/json" \
  -d '{"query": "How do I reset my CRM password?"}'
```

### Railway Cost Estimate

```
Free tier: $5 credit/month
Usage: ~$0.05/hour for 512MB RAM
Total free hours: ~100 hours/month
Sufficient for: Development, low-traffic apps
```

**Status:** ✅ Railway is the fastest option

---

## Option 2: Render

**Why Render:**
- ✅ Completely free (750 hours/month)
- ✅ Easy setup from GitHub
- ✅ Automatic HTTPS
- ⚠️ Sleeps after 15 minutes of inactivity (takes 30-60s to wake up)

### Step 1: Prepare Backend for Render

Create `render.yaml` in project root:

```yaml
services:
  - type: web
    name: assistflow-backend
    env: python
    region: oregon
    plan: free
    buildCommand: pip install -r backend/requirements.txt
    startCommand: cd backend && uvicorn app.main:app --host 0.0.0.0 --port $PORT
    envVars:
      - key: GOOGLE_API_KEY
        sync: false
      - key: CHROMA_PERSIST_DIR
        value: /opt/render/project/src/data/chroma
      - key: KNOWLEDGE_DIR
        value: /opt/render/project/src/data/knowledge
      - key: OFFLINE_DB_PATH
        value: /opt/render/project/src/data/offline_cache/offline.db
      - key: PYTHON_VERSION
        value: 3.11.0
```

### Step 2: Deploy to Render

**Via Render Dashboard:**

1. Go to https://render.com and sign up
2. Click **"New +"** → **"Web Service"**
3. Connect your GitHub repository
4. Configure:
   - **Name:** assistflow-backend
   - **Environment:** Python 3
   - **Build Command:** `pip install -r backend/requirements.txt`
   - **Start Command:** `cd backend && uvicorn app.main:app --host 0.0.0.0 --port $PORT`
   - **Plan:** Free
5. Click **"Create Web Service"**

### Step 3: Add Environment Variables

In Render dashboard → **Environment**:

```env
GOOGLE_API_KEY=your_gemini_api_key_here
CHROMA_PERSIST_DIR=/opt/render/project/src/data/chroma
KNOWLEDGE_DIR=/opt/render/project/src/data/knowledge
OFFLINE_DB_PATH=/opt/render/project/src/data/offline_cache/offline.db
```

### Step 4: Add Persistent Disk

**Important:** Free tier has no persistent disk

**Workaround:** Re-ingest knowledge on every deploy

Update `render.yaml`:

```yaml
buildCommand: |
  pip install -r backend/requirements.txt &&
  cd scripts && python ingest_knowledge.py
```

**Limitation:** ChromaDB will re-index on every cold start (slow first request)

### Step 5: Get Your Production URL

Render provides:
```
https://assistflow-backend.onrender.com
```

### Render Limitations

- ⚠️ **Cold starts:** 30-60 second delay after 15 min inactivity
- ⚠️ **No persistent disk** on free tier (must re-index)
- ⚠️ **750 hours/month** limit
- ⚠️ **Shared CPU** (slower performance)

**Workaround for Cold Starts:**

Use a cron job to ping your API every 10 minutes:

```bash
# Add to cron (your local machine or another service)
*/10 * * * * curl https://assistflow-backend.onrender.com/api/health
```

**Status:** ✅ Best for zero-cost, low-traffic apps

---

## Option 3: AWS (Free Tier)

**Why AWS:**
- ✅ Industry standard
- ✅ 750 hours/month free for 1 year
- ✅ Full control and scalability
- ⚠️ More complex setup
- ⚠️ Requires AWS knowledge

### Architecture

```
Internet Gateway → Application Load Balancer → EC2 Instance (t2.micro)
                                                  ├── FastAPI
                                                  ├── ChromaDB
                                                  └── SQLite
```

### Step 1: Launch EC2 Instance

1. **Go to AWS Console** → EC2 Dashboard
2. Click **"Launch Instance"**
3. **Configure:**
   - **Name:** assistflow-backend
   - **AMI:** Ubuntu Server 22.04 LTS (Free tier eligible)
   - **Instance type:** t2.micro (1 vCPU, 1GB RAM)
   - **Key pair:** Create new or use existing
   - **Network:** Default VPC
   - **Security Group:**
     - SSH (22) from your IP
     - HTTP (80) from anywhere (0.0.0.0/0)
     - HTTPS (443) from anywhere (0.0.0.0/0)
     - Custom TCP (8000) from anywhere
4. **Storage:** 8GB (free tier includes up to 30GB)
5. Click **"Launch Instance"**

### Step 2: Connect to EC2

```bash
# Download your key pair (e.g., assistflow-key.pem)
chmod 400 assistflow-key.pem

# Connect via SSH
ssh -i assistflow-key.pem ubuntu@<your-ec2-public-ip>
```

### Step 3: Install Dependencies on EC2

```bash
# Update system
sudo apt update && sudo apt upgrade -y

# Install Python 3.11
sudo apt install -y python3.11 python3.11-venv python3-pip

# Install Git
sudo apt install -y git

# Clone your repository
git clone https://github.com/yourusername/AssistFlow.git
cd AssistFlow/backend

# Create virtual environment
python3.11 -m venv .venv
source .venv/bin/activate

# Install dependencies
pip install -r requirements.txt
```

### Step 4: Configure Environment Variables

```bash
# Create .env file
nano .env
```

Add:

```env
GOOGLE_API_KEY=your_gemini_api_key_here
CHROMA_PERSIST_DIR=/home/ubuntu/AssistFlow/data/chroma
KNOWLEDGE_DIR=/home/ubuntu/AssistFlow/data/knowledge
OFFLINE_DB_PATH=/home/ubuntu/AssistFlow/data/offline_cache/offline.db
```

### Step 5: Ingest Knowledge Base

```bash
cd /home/ubuntu/AssistFlow/scripts
python ingest_knowledge.py
```

**Output:**
```
✓ Successfully ingested 8 documents
✓ ChromaDB collection created
```

### Step 6: Set Up Systemd Service (Auto-Start)

```bash
sudo nano /etc/systemd/system/assistflow.service
```

Add:

```ini
[Unit]
Description=AssistFlow FastAPI Backend
After=network.target

[Service]
Type=simple
User=ubuntu
WorkingDirectory=/home/ubuntu/AssistFlow/backend
Environment="PATH=/home/ubuntu/AssistFlow/backend/.venv/bin"
ExecStart=/home/ubuntu/AssistFlow/backend/.venv/bin/uvicorn app.main:app --host 0.0.0.0 --port 8000
Restart=always
RestartSec=10

[Install]
WantedBy=multi-user.target
```

**Enable and start:**

```bash
sudo systemctl daemon-reload
sudo systemctl enable assistflow
sudo systemctl start assistflow

# Check status
sudo systemctl status assistflow
```

### Step 7: Set Up Nginx Reverse Proxy (Optional but Recommended)

```bash
sudo apt install -y nginx

sudo nano /etc/nginx/sites-available/assistflow
```

Add:

```nginx
server {
    listen 80;
    server_name your-domain.com;  # Or use EC2 public IP

    location / {
        proxy_pass http://127.0.0.1:8000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

**Enable site:**

```bash
sudo ln -s /etc/nginx/sites-available/assistflow /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl restart nginx
```

### Step 8: Set Up SSL with Let's Encrypt (Optional)

```bash
sudo apt install -y certbot python3-certbot-nginx

# Get SSL certificate (requires domain name)
sudo certbot --nginx -d your-domain.com
```

### Step 9: Test Deployment

```bash
# From local machine
curl http://<ec2-public-ip>/api/health

# Test query
curl -X POST http://<ec2-public-ip>/api/chat \
  -H "Content-Type: application/json" \
  -d '{"query": "How do I reset my CRM password?"}'
```

### AWS Cost Estimate

```
Free Tier (First 12 months):
- EC2 t2.micro: 750 hours/month (always-on = 730 hrs)
- Storage: 30GB EBS
- Data Transfer: 15GB/month outbound

After Free Tier:
- EC2 t2.micro: ~$8.50/month
- Storage: ~$2.40/month (30GB)
- Total: ~$11/month
```

### AWS Monitoring

```bash
# View logs
sudo journalctl -u assistflow -f

# Check resource usage
htop
df -h
```

**Status:** ✅ Best for production, requires AWS knowledge

---

## Option 4: Google Cloud Run

**Why Cloud Run:**
- ✅ 2 million requests/month free
- ✅ Automatic scaling (0 to N)
- ✅ Pay only for actual usage
- ⚠️ Cold starts (~2-5 seconds)
- ⚠️ Requires Docker

### Step 1: Create Dockerfile

Create `backend/Dockerfile`:

```dockerfile
FROM python:3.11-slim

WORKDIR /app

# Install system dependencies
RUN apt-get update && apt-get install -y \
    build-essential \
    && rm -rf /var/lib/apt/lists/*

# Copy requirements
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy application
COPY . .

# Copy data files
COPY ../data /app/data

# Ingest knowledge at build time
RUN python /app/../scripts/ingest_knowledge.py

# Expose port
EXPOSE 8080

# Run application
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8080"]
```

### Step 2: Build and Push to Google Container Registry

```bash
# Install Google Cloud SDK
curl https://sdk.cloud.google.com | bash
exec -l $SHELL
gcloud init

# Authenticate
gcloud auth login

# Set project
gcloud config set project your-project-id

# Build and push
cd backend
gcloud builds submit --tag gcr.io/your-project-id/assistflow-backend

# Or use Docker
docker build -t gcr.io/your-project-id/assistflow-backend .
docker push gcr.io/your-project-id/assistflow-backend
```

### Step 3: Deploy to Cloud Run

```bash
gcloud run deploy assistflow-backend \
  --image gcr.io/your-project-id/assistflow-backend \
  --platform managed \
  --region us-central1 \
  --allow-unauthenticated \
  --set-env-vars GOOGLE_API_KEY=your_key_here \
  --memory 1Gi \
  --cpu 1 \
  --max-instances 10
```

### Step 4: Get Your Production URL

Cloud Run provides:
```
https://assistflow-backend-xxxxxx-uc.a.run.app
```

### Cloud Run Cost Estimate

```
Free Tier:
- 2M requests/month
- 360,000 GB-seconds compute
- 180,000 vCPU-seconds

Pricing after free tier:
- $0.00002400 per request
- $0.00000900 per GB-second
- $0.00002400 per vCPU-second

Estimated for 1,000 requests/day:
~$2-5/month
```

**Status:** ✅ Best for serverless, pay-per-use

---

## Option 5: Fly.io

**Why Fly.io:**
- ✅ 3 shared VMs free (256MB RAM each)
- ✅ Global edge deployment
- ✅ No cold starts
- ✅ Simple CLI

### Step 1: Install Fly CLI

```bash
# macOS
brew install flyctl

# Or use install script
curl -L https://fly.io/install.sh | sh
```

### Step 2: Login and Initialize

```bash
flyctl auth login

cd /Users/mark/AssistFlow/backend
flyctl launch
```

**Interactive setup:**
```
? Choose an app name: assistflow-backend
? Choose a region: sjc (San Jose, California)
? Would you like to set up a Postgresql database? No
? Would you like to set up an Upstash Redis database? No
? Create .dockerignore from 1 .gitignore file? Yes
```

### Step 3: Configure fly.toml

Fly generates `fly.toml`, edit it:

```toml
app = "assistflow-backend"
primary_region = "sjc"

[build]
  builder = "paketobuildpacks/builder:base"
  buildpacks = ["gcr.io/paketo-buildpacks/python"]

[env]
  PORT = "8000"
  CHROMA_PERSIST_DIR = "/data/chroma"
  KNOWLEDGE_DIR = "/data/knowledge"
  OFFLINE_DB_PATH = "/data/offline_cache/offline.db"

[http_service]
  internal_port = 8000
  force_https = true
  auto_stop_machines = false
  auto_start_machines = true
  min_machines_running = 1

[[vm]]
  cpu_kind = "shared"
  cpus = 1
  memory_mb = 256

[mounts]
  source = "assistflow_data"
  destination = "/data"
```

### Step 4: Create Persistent Volume

```bash
flyctl volumes create assistflow_data --size 1 --region sjc
```

### Step 5: Set Secrets

```bash
flyctl secrets set GOOGLE_API_KEY=your_gemini_api_key_here
```

### Step 6: Deploy

```bash
flyctl deploy
```

### Step 7: Get Your Production URL

```
https://assistflow-backend.fly.dev
```

### Fly.io Cost Estimate

```
Free Tier:
- 3 shared-cpu VMs (256MB RAM each)
- 3GB persistent storage
- 160GB outbound data transfer

Sufficient for: 1 backend instance with storage
Cost: $0/month within free tier
```

**Status:** ✅ Good balance of free tier and performance

---

## Option 6: Vercel (Serverless)

**Why Vercel:**
- ✅ Unlimited free deployments
- ✅ Automatic HTTPS
- ✅ Simple GitHub integration
- ⚠️ 10-second execution timeout (too short for some RAG queries)
- ⚠️ Serverless (no persistent storage for ChromaDB)

### ⚠️ Important Limitation

Vercel serverless functions have:
- 10-second timeout on Hobby plan
- No persistent filesystem (ChromaDB needs rebuilding each request)

**Not recommended for AssistFlow backend** due to timeout and storage constraints.

**Alternative:** Host ChromaDB separately (Railway/AWS) and use Vercel only for API proxy.

---

## 🔒 Environment Variables Setup

**Required for all platforms:**

```env
# Gemini API (Required)
GOOGLE_API_KEY=AIza...your_key_here

# Data paths (adjust based on platform)
CHROMA_PERSIST_DIR=/app/data/chroma
KNOWLEDGE_DIR=/app/data/knowledge
OFFLINE_DB_PATH=/app/data/offline_cache/offline.db

# Optional
PORT=8000  # Most platforms set this automatically
PYTHONUNBUFFERED=1  # For better logging
```

**How to get Gemini API key:**

1. Go to https://makersuite.google.com/app/apikey
2. Click **"Create API Key"**
3. Select or create a Google Cloud project
4. Copy the API key (starts with `AIza...`)

---

## 🔧 Post-Deployment Configuration

### Update Web App Backend URL

Edit `webapp/src/App.jsx`:

```javascript
// Before (local development)
const BACKEND_URL = 'http://127.0.0.1:8000';

// After (production)
const BACKEND_URL = 'https://your-backend-url.com';
```

**Or use environment variable:**

Create `webapp/.env`:

```env
VITE_BACKEND_URL=https://your-backend-url.com
```

Update `webapp/src/App.jsx`:

```javascript
const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || 'http://127.0.0.1:8000';
```

### Enable CORS for Production

Edit `backend/app/api/middleware.py`:

```python
from fastapi.middleware.cors import CORSMiddleware

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000",  # Local development
        "https://your-webapp.vercel.app",  # Production web app
        "chrome-extension://*",  # Chrome extension
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
```

### Set Up Health Monitoring

**UptimeRobot (Free):**

1. Go to https://uptimerobot.com
2. Add new monitor:
   - **Type:** HTTP(s)
   - **URL:** `https://your-backend/api/health`
   - **Interval:** 5 minutes
3. Get alerts via email/SMS if backend goes down

**Alternative: Better Uptime, Pingdom**

---

## 🐛 Troubleshooting

### Issue: "Module not found" errors

**Cause:** Missing dependencies

**Fix:**
```bash
pip install -r requirements.txt --upgrade
```

### Issue: "ChromaDB connection failed"

**Cause:** Incorrect `CHROMA_PERSIST_DIR` path

**Fix:**
- Railway: `/app/data/chroma`
- Render: `/opt/render/project/src/data/chroma`
- AWS: `/home/ubuntu/AssistFlow/data/chroma`
- Fly.io: `/data/chroma`

### Issue: "Gemini API quota exceeded"

**Cause:** Too many requests or invalid API key

**Fix:**
1. Check quota: https://console.cloud.google.com/apis/api/generativelanguage.googleapis.com/quotas
2. Verify API key is correct
3. Enable billing (increases quota)

### Issue: Cold starts taking too long (Render)

**Fix:**
- Set up cron job to ping every 10 minutes
- Upgrade to paid plan ($7/month, no sleep)

### Issue: Backend not accessible from web app

**Cause:** CORS not configured

**Fix:** Add web app domain to `allow_origins` in middleware.py

### Issue: Out of memory errors

**Cause:** ChromaDB consuming too much RAM

**Fix:**
- Increase instance memory (Railway/AWS)
- Reduce chunk count (re-ingest with larger chunk size)
- Use external vector DB (Pinecone, Weaviate)

---

## 📊 Deployment Decision Tree

```
Do you need 24/7 uptime with no cold starts?
├─ Yes → Railway ($5 credit) or Fly.io (free 256MB)
└─ No → Can tolerate 30-60s wake-up delay?
    ├─ Yes → Render (free 750hrs)
    └─ No → Need enterprise features?
        ├─ Yes → AWS EC2 (free 1 year, then $11/month)
        └─ No → Need serverless auto-scaling?
            ├─ Yes → Google Cloud Run (2M requests free)
            └─ No → Choose Railway for simplicity
```

---

## 🎯 Recommended Setup for AssistFlow

**For Development/Testing:**
- **Backend:** Railway (easiest, $5 credit)
- **Web App:** Vercel (free, auto-deploy from GitHub)
- **Total Cost:** $0/month (within free credits)

**For Production (Low Traffic):**
- **Backend:** Fly.io (free 256MB VM, no cold starts)
- **Web App:** Vercel (free)
- **Monitoring:** UptimeRobot (free)
- **Total Cost:** $0/month

**For Production (High Traffic/Enterprise):**
- **Backend:** AWS EC2 t2.small ($17/month)
- **Web App:** Vercel Pro ($20/month) or CloudFlare Pages
- **Database:** AWS RDS for conversation history
- **Monitoring:** AWS CloudWatch
- **Total Cost:** ~$40/month

---

## 📝 Quick Start Commands

### Railway (Fastest)
```bash
npm i -g @railway/cli
railway login
cd backend
railway init
railway up
railway open  # Get URL
```

### Render (Free Forever)
```bash
# Just push to GitHub, then:
# 1. Go to render.com
# 2. New Web Service
# 3. Connect repo
# 4. Deploy
```

### AWS (Full Control)
```bash
# Launch EC2, then:
ssh -i key.pem ubuntu@<ip>
git clone <repo>
cd AssistFlow/backend
python3.11 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
uvicorn app.main:app --host 0.0.0.0 --port 8000
```

### Fly.io (Edge Network)
```bash
brew install flyctl
flyctl auth login
cd backend
flyctl launch
flyctl deploy
```

---

## ✅ Deployment Checklist

**Pre-Deployment:**
- [ ] Test backend locally (`python run.py`)
- [ ] Verify all dependencies in `requirements.txt`
- [ ] Confirm Gemini API key works
- [ ] Test knowledge ingestion script
- [ ] Check data files are in repository

**Deployment:**
- [ ] Choose hosting platform
- [ ] Set environment variables
- [ ] Configure persistent storage (if needed)
- [ ] Deploy backend
- [ ] Run knowledge ingestion
- [ ] Test `/api/health` endpoint
- [ ] Test `/api/chat` endpoint

**Post-Deployment:**
- [ ] Update web app `BACKEND_URL`
- [ ] Configure CORS for production domain
- [ ] Set up uptime monitoring
- [ ] Test offline fallback
- [ ] Monitor logs for errors
- [ ] Document production URL

---

## 🎓 Next Steps

After deploying backend:

1. **Deploy Web App** → See WEBAPP.md
2. **Set up Monitoring** → UptimeRobot or Railway dashboard
3. **Run Ragas Evaluation** → Test production quality
4. **Add Analytics** → Track query success rates
5. **Implement Caching** → Redis for repeated queries

---

**End of Deployment Guide**  
*For issues, check logs first: `railway logs` or `flyctl logs`*
