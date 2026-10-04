# Render Setup Guide for AssistFlow Backend

**Last Updated:** September 28, 2026  
**Platform:** Render.com  
**Cost:** 100% Free (750 hours/month)  
**Setup Time:** 15 minutes

---

## 📋 What You'll Need

- ✅ GitHub account (your AssistFlow repo must be on GitHub)
- ✅ Render.com account (free, no credit card required)
- ✅ Google Gemini API key ([Get one here](https://makersuite.google.com/app/apikey))

---

## 🚀 Step-by-Step Setup

### Step 1: Push Configuration Files to GitHub

Your repository now includes:
- ✅ `render.yaml` — Render deployment configuration
- ✅ `backend/runtime.txt` — Python version specification
- ✅ Updated CORS in `backend/app/main.py`

**Commit and push these changes:**

```bash
cd /Users/mark/AssistFlow

git add render.yaml backend/runtime.txt backend/app/main.py
git commit -m "feat: add Render deployment configuration"
git push origin main
```

---

### Step 2: Sign Up for Render

1. Go to **https://render.com**
2. Click **"Get Started for Free"**
3. Sign up with your **GitHub account** (recommended)
4. Authorize Render to access your repositories

**No credit card required!**

---

### Step 3: Create New Web Service

#### Option A: Using Blueprint (Recommended — Automated)

1. In Render dashboard, click **"New +"** → **"Blueprint"**
2. Select your **AssistFlow** repository
3. Render will detect `render.yaml` automatically
4. Click **"Apply"**
5. Wait 2-3 minutes for deployment
6. **Skip to Step 5** (set environment variables)

#### Option B: Manual Setup

1. In Render dashboard, click **"New +"** → **"Web Service"**
2. Click **"Build and deploy from a Git repository"**
3. Select your **AssistFlow** repository
   - If not listed, click **"Configure account"** → Grant access
4. Click **"Connect"**

---

### Step 4: Configure Web Service (Manual Setup Only)

**If you used Blueprint (Option A), skip this step.**

Fill in the configuration:

| Field | Value |
|-------|-------|
| **Name** | `assistflow-backend` |
| **Region** | Oregon (US West) — *Choose closest to your users* |
| **Branch** | `main` |
| **Root Directory** | Leave blank (repository root) |
| **Runtime** | Python 3 |
| **Build Command** | `pip install -r backend/requirements.txt && python scripts/ingest_knowledge.py` |
| **Start Command** | `cd backend && uvicorn app.main:app --host 0.0.0.0 --port $PORT` |
| **Instance Type** | Free |

**Advanced Settings:**

- **Health Check Path:** `/api/health`
- **Auto-Deploy:** Yes (deploys on every git push)

Click **"Create Web Service"**

---

### Step 5: Set Environment Variables

⚠️ **CRITICAL STEP** — Your backend won't work without this!

1. In your service dashboard, go to **"Environment"** tab (left sidebar)
2. Click **"Add Environment Variable"**
3. Add the following variables:

| Key | Value | Notes |
|-----|-------|-------|
| `GOOGLE_API_KEY` | `AIza...your_key` | **Required** — Get from [Google AI Studio](https://makersuite.google.com/app/apikey) |
| `CHROMA_PERSIST_DIR` | `/opt/render/project/src/data/chroma` | ChromaDB storage path |
| `KNOWLEDGE_DIR` | `/opt/render/project/src/data/knowledge` | Knowledge base location |
| `OFFLINE_DB_PATH` | `/opt/render/project/src/data/offline_cache/offline.db` | Offline cache database |
| `PYTHON_VERSION` | `3.11.0` | Python runtime version |

4. Click **"Save Changes"**

**Your service will automatically redeploy with these variables.**

---

### Step 6: Get Your Google Gemini API Key

If you don't have one yet:

1. Go to **https://makersuite.google.com/app/apikey**
2. Sign in with your Google account
3. Click **"Create API Key"**
4. Select or create a Google Cloud project
5. Copy the API key (starts with `AIza...`)
6. Paste it into Render's `GOOGLE_API_KEY` environment variable

**API Key Permissions:**
- ✅ Generative Language API (enabled by default)
- ✅ Free tier: 60 requests/minute (sufficient for development)

---

### Step 7: Wait for Deployment

**Timeline:**
- ⏱️ Initial build: 5-8 minutes (installs dependencies + ingests knowledge)
- ⏱️ Subsequent deploys: 3-5 minutes

**Watch deployment logs:**
1. Go to **"Logs"** tab
2. You'll see:
   ```
   ==> Installing dependencies...
   ==> Building...
   ==> Running: pip install -r requirements.txt
   ==> Running: python scripts/ingest_knowledge.py
   ✓ Successfully ingested 8 documents
   ==> Starting service...
   Uvicorn running on http://0.0.0.0:10000
   ```

**When you see:** `Application startup complete` → ✅ **Deployment successful!**

---

### Step 8: Get Your Production URL

Once deployed, Render provides a URL:

```
https://assistflow-backend.onrender.com
```

**Find it:**
1. Top of your service dashboard
2. Or in **"Settings"** → **"Domains"**

**Copy this URL** — you'll need it for the web app configuration.

---

### Step 9: Test Your Deployment

**Test 1: Health Check**

```bash
curl https://assistflow-backend.onrender.com/api/health
```

**Expected response:**
```json
{
  "status": "healthy",
  "service": "assistflow-backend"
}
```

**Test 2: RAG Query**

```bash
curl -X POST https://assistflow-backend.onrender.com/api/chat \
  -H "Content-Type: application/json" \
  -d '{"query": "How do I reset my CRM password?"}'
```

**Expected response:**
```json
{
  "response": "Based on the Standard Operating Procedure...",
  "retrieved_chunks": [...],
  "model_used": "gemini-3.1-flash-lite"
}
```

**If both work:** ✅ **Your backend is live!**

---

### Step 10: Update Web App to Use Production Backend

#### For Local Development (Test Production Backend)

Edit `webapp/src/App.jsx`:

```javascript
// Find this line (around line 14)
const BACKEND_URL = 'http://127.0.0.1:8000';

// Replace with your Render URL
const BACKEND_URL = 'https://assistflow-backend.onrender.com';
```

**Test locally:**
```bash
cd webapp
npm run dev
# Open http://localhost:3000
# Try asking: "How do I reset my CRM password?"
```

#### For Production Web App Deployment

Create `webapp/.env.production`:

```env
VITE_BACKEND_URL=https://assistflow-backend.onrender.com
```

Update `webapp/src/App.jsx` to use environment variable:

```javascript
const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || 'http://127.0.0.1:8000';
```

---

## 🎉 You're Done!

Your backend is now live at:
```
https://assistflow-backend.onrender.com
```

**What works:**
- ✅ RAG queries with Gemini 3.1 Flash Lite
- ✅ ChromaDB vector search (8 documents indexed)
- ✅ Offline FAQ fallback (39 protocols)
- ✅ Health monitoring
- ✅ Automatic HTTPS
- ✅ Auto-deploy on git push

---

## ⚠️ Important: Understanding Render Free Tier

### Cold Starts (Sleep Mode)

**Behavior:**
- Backend **sleeps after 15 minutes** of inactivity
- **Wakes up in 30-60 seconds** on first request
- Subsequent requests are instant

**User Experience:**
- First query after idle period: 30-60s delay
- All other queries: 2-5s response time (normal)

### How to Minimize Cold Starts

**Option 1: Cron Job (Keep Alive)**

Set up a cron job to ping your backend every 10 minutes:

```bash
# On your local machine (macOS)
crontab -e

# Add this line:
*/10 * * * * curl -s https://assistflow-backend.onrender.com/api/health > /dev/null
```

**Option 2: External Service (Better)**

Use a free service like **UptimeRobot**:

1. Go to https://uptimerobot.com (free account)
2. Add new monitor:
   - **Type:** HTTP(s)
   - **URL:** `https://assistflow-backend.onrender.com/api/health`
   - **Interval:** 5 minutes
3. This keeps your backend awake 24/7

**Option 3: Upgrade to Paid Plan ($7/month)**

- Removes sleep entirely
- 512MB RAM (vs 256MB free)
- Faster performance
- Priority support

---

## 📊 Resource Limits (Free Tier)

| Resource | Limit | Actual Usage |
|----------|-------|--------------|
| **Compute Hours** | 750 hrs/month | ~730 hrs (always-on with cron) |
| **RAM** | 512MB | ~180MB (sufficient) |
| **Build Minutes** | Unlimited | ~5 min/deploy |
| **Bandwidth** | 100GB/month | <1GB (text responses) |
| **Disk Storage** | Ephemeral (no persistent disk) | Data re-ingested on wake |

**Important:** Free tier has **no persistent disk**

**What this means:**
- ChromaDB indexes are rebuilt on every cold start
- First query after wake: ~60-90s (includes re-indexing)
- Subsequent queries: 2-5s (normal)

**Workaround:** Use cron job to keep backend awake (prevents re-indexing)

---

## 🔍 Monitoring Your Backend

### View Logs

1. Go to Render dashboard → Your service
2. Click **"Logs"** tab
3. See real-time logs:
   ```
   POST /api/chat | 200 | 2341.5ms
   GET  /api/health | 200 | 1.2ms
   ```

**Filter logs:**
- **All Logs:** Everything (info, warnings, errors)
- **Errors Only:** Just error messages

### Check Metrics

1. Go to **"Metrics"** tab
2. View:
   - **CPU Usage:** Should be <20% average
   - **Memory Usage:** Should be ~180MB
   - **Response Time:** 2-5s for queries
   - **Request Count:** Track traffic

### Set Up Alerts

1. Go to **"Settings"** → **"Notifications"**
2. Add email or Slack webhook
3. Get notified on:
   - Deploy success/failure
   - Service crashes
   - High error rates

---

## 🐛 Troubleshooting

### Issue 1: "Application failed to start"

**Check logs for:**
```
ModuleNotFoundError: No module named 'langchain'
```

**Fix:**
- Ensure `requirements.txt` is in `backend/` directory
- Redeploy: **"Manual Deploy"** → **"Clear build cache & deploy"**

---

### Issue 2: "502 Bad Gateway"

**Cause:** Service is starting up (takes 30-60s after wake)

**Fix:** Wait 1 minute and retry

---

### Issue 3: "Gemini API key invalid"

**Check logs for:**
```
google.api_core.exceptions.InvalidArgument: API key not valid
```

**Fix:**
1. Go to **"Environment"** tab
2. Verify `GOOGLE_API_KEY` is set correctly
3. Get new key from https://makersuite.google.com/app/apikey
4. Update variable and save (auto-redeploys)

---

### Issue 4: "ChromaDB connection failed"

**Check logs for:**
```
Could not connect to a Chroma server at /opt/render/project/src/data/chroma
```

**Fix:**
- Verify `CHROMA_PERSIST_DIR` environment variable
- Correct path: `/opt/render/project/src/data/chroma`
- Redeploy after fixing

---

### Issue 5: "CORS error from web app"

**Browser console shows:**
```
Access to fetch at 'https://assistflow-backend.onrender.com' has been blocked by CORS policy
```

**Fix:**
- Already fixed in `backend/app/main.py` (allows Vercel/Netlify)
- If using custom domain, add it to `allow_origins` list
- Redeploy backend

---

### Issue 6: Slow first query (60-90s)

**This is normal after cold start!**

**Why:**
- Backend wakes from sleep (15s)
- Re-ingests knowledge base (30-45s)
- Processes first query (2-5s)

**Fix:**
- Set up cron job (keeps backend awake)
- Or upgrade to paid plan (no sleep)

---

## 🔄 Updating Your Backend

### Automatic Updates (Recommended)

**Any push to `main` branch auto-deploys:**

```bash
# Make changes to backend code
git add .
git commit -m "feat: improve response quality"
git push origin main

# Render automatically:
# 1. Detects push
# 2. Builds new version
# 3. Runs tests (if configured)
# 4. Deploys with zero downtime
```

**Timeline:** 3-5 minutes from push to live

### Manual Deploy

1. Go to Render dashboard → Your service
2. Click **"Manual Deploy"** (top right)
3. Select branch: `main`
4. Click **"Deploy"**

### Rollback to Previous Version

1. Go to **"Events"** tab
2. Find previous successful deploy
3. Click **"Rollback to this version"**

---

## 💰 Cost Management

### Free Tier Usage

**Monitor usage:**
1. Go to **"Account Settings"** → **"Usage"**
2. Check:
   - **Compute hours used:** Should stay under 750/month
   - **Bandwidth used:** Should be minimal (<5GB)

**If you exceed 750 hours:**
- Service will stop until next month
- Or upgrade to paid plan

**Calculation:**
```
24 hrs/day × 30 days = 720 hours (fits in free tier!)
```

### When to Upgrade ($7/month)

**Consider paid plan if:**
- ❌ Cold starts are unacceptable for users
- ❌ You need faster performance (1GB RAM)
- ❌ You need persistent disk (database storage)
- ❌ You need >100GB bandwidth

**For AssistFlow:**
- Free tier is sufficient for development/testing
- Upgrade recommended for production with >100 users

---

## 🎯 Next Steps

Now that your backend is deployed:

### 1. Deploy Web App

**Recommended: Vercel**

```bash
cd webapp

# Install Vercel CLI
npm i -g vercel

# Deploy
vercel

# Follow prompts (auto-detects Vite)
# Get production URL: https://assistflow.vercel.app
```

See `WEBAPP.md` for detailed instructions.

### 2. Set Up Monitoring

- ✅ UptimeRobot (keep backend awake)
- ✅ Render metrics dashboard
- ✅ Error alerting via email

### 3. Test RAG Quality

```bash
cd scripts
python evaluate_rag.py
# Generates Ragas metrics report
```

### 4. Implement Gemini-Style UI

Follow `DESIGN_GUIDE.md` to upgrade web app UI:
- Glassmorphism effects
- Interactive suggestion cards
- Ambient glow animations

---

## 📞 Support

**Render Documentation:** https://render.com/docs  
**Render Community:** https://community.render.com  
**AssistFlow Issues:** GitHub Issues on your repo

**Common Questions:**

**Q: Can I use a custom domain?**  
A: Yes! Go to "Settings" → "Custom Domain" (free SSL included)

**Q: Can I scale beyond free tier?**  
A: Yes, upgrade to Starter ($7/month) or higher

**Q: Is my Gemini API key secure?**  
A: Yes, environment variables are encrypted at rest

**Q: Can I use PostgreSQL or Redis?**  
A: Yes, Render offers free PostgreSQL (256MB) and Redis (25MB)

---

## ✅ Deployment Checklist

**Pre-Deployment:**
- [x] `render.yaml` created
- [x] `backend/runtime.txt` created
- [x] CORS configured in `backend/app/main.py`
- [ ] Changes committed to GitHub
- [ ] Gemini API key ready

**Deployment:**
- [ ] Render account created
- [ ] GitHub repository connected
- [ ] Web service created (Blueprint or Manual)
- [ ] Environment variables set (`GOOGLE_API_KEY`, etc.)
- [ ] Deployment successful (check logs)
- [ ] Health check passes: `/api/health`
- [ ] Test query works: `/api/chat`

**Post-Deployment:**
- [ ] Production URL noted
- [ ] Web app `BACKEND_URL` updated
- [ ] UptimeRobot monitor set up (optional)
- [ ] Error alerts configured
- [ ] Documentation updated with production URL

---

**🎉 Congratulations! Your AssistFlow backend is now live on Render!**

**Production URL:** `https://assistflow-backend.onrender.com`  
**Dashboard:** https://dashboard.render.com

**Questions?** Check the Troubleshooting section or open a GitHub Issue.

---

**End of Render Setup Guide**  
*For web app deployment, see WEBAPP.md*
