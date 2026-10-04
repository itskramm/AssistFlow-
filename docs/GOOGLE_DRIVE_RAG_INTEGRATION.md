# Google Drive RAG Integration Guide

**Last Updated:** September 28, 2026  
**Purpose:** Index and search documents from Google Drive with AssistFlow RAG  
**Use Case:** Dynamic knowledge base that updates from shared Drive folders

---

## 📋 Table of Contents

1. [Overview](#overview)
2. [Architecture](#architecture)
3. [Prerequisites](#prerequisites)
4. [Option 1: Google Drive API (Full Control)](#option-1-google-drive-api-full-control)
5. [Option 2: LangChain GoogleDriveLoader (Easier)](#option-2-langchain-googledriveloader-easier)
6. [Option 3: Scheduled Sync (Production)](#option-3-scheduled-sync-production)
7. [Security Considerations](#security-considerations)
8. [Troubleshooting](#troubleshooting)

---

## 🎯 Overview

**What This Enables:**
- ✅ Index documents from Google Drive folders
- ✅ Auto-sync when documents change
- ✅ Support for Docs, Sheets, PDFs, text files
- ✅ Folder-based organization
- ✅ Team collaboration (shared drives)

**Current vs. Google Drive:**

| Feature | Current (Local Files) | With Google Drive |
|---------|----------------------|-------------------|
| **Knowledge Source** | `data/knowledge/*.md` | Google Drive folder |
| **Update Method** | Manual file editing | Edit in Drive |
| **Sync** | Git commit + redeploy | Automatic polling |
| **Collaboration** | Git workflow | Google Drive sharing |
| **File Types** | .md, .txt | Docs, Sheets, PDFs, .txt, .docx |

---

## 🏗️ Architecture

### Current Flow:
```
Local Files (data/knowledge/*.md)
    ↓
ingest_knowledge.py (manual)
    ↓
ChromaDB (embeddings)
    ↓
FastAPI /api/chat endpoint
    ↓
Gemini generates answer
```

### With Google Drive:
```
Google Drive Folder (shared by team)
    ↓
Google Drive API (automatic sync every 15 min)
    ↓
Download to temp directory
    ↓
ingest_knowledge.py (automatic)
    ↓
ChromaDB (embeddings updated)
    ↓
FastAPI /api/chat endpoint
    ↓
Gemini generates answer
```

**Benefits:**
- No manual file copying
- Team can update docs in Drive
- Version history built-in
- Comments and collaboration
- Mobile editing support

---

## 📚 Prerequisites

### 1. Google Cloud Project

**Create Project:**
1. Go to https://console.cloud.google.com
2. Click **"Select a project"** → **"New Project"**
3. Name: `assistflow-drive-integration`
4. Click **"Create"**

### 2. Enable Google Drive API

1. In Cloud Console, go to **"APIs & Services"** → **"Library"**
2. Search for **"Google Drive API"**
3. Click **"Enable"**

### 3. Create Service Account Credentials

**Why Service Account?**
- Runs without user login
- Works in backend automation
- Secure for production

**Steps:**
1. Go to **"APIs & Services"** → **"Credentials"**
2. Click **"Create Credentials"** → **"Service Account"**
3. Name: `assistflow-drive-reader`
4. Role: **"Viewer"** (read-only access)
5. Click **"Done"**
6. Click on the service account email
7. Go to **"Keys"** tab
8. Click **"Add Key"** → **"Create new key"**
9. Choose **JSON** format
10. Download the key file (keep it secret!)

You'll get a file like `assistflow-drive-reader-abc123.json`

---

## Option 1: Google Drive API (Full Control)

**Best for:** Custom logic, specific file filtering, advanced sync

### Step 1: Install Dependencies

Add to `backend/requirements.txt`:

```txt
google-api-python-client==2.200.0
google-auth==2.59.0
google-auth-httplib2==0.4.2
google-auth-oauthlib==1.2.1
```

Install:
```bash
cd backend
source .venv/bin/activate
pip install -r requirements.txt
```

### Step 2: Create Drive Sync Script

Create `scripts/sync_from_drive.py`:

```python
"""
sync_from_drive.py
------------------
Downloads documents from a Google Drive folder and prepares them for ingestion.

Usage:
    export GOOGLE_DRIVE_FOLDER_ID="your_folder_id_here"
    export GOOGLE_APPLICATION_CREDENTIALS="path/to/service-account-key.json"
    python scripts/sync_from_drive.py
"""

import os
import io
import sys
from pathlib import Path
from googleapiclient.discovery import build
from googleapiclient.http import MediaIoBaseDownload
from google.oauth2 import service_account

# Configuration
SCOPES = ['https://www.googleapis.com/auth/drive.readonly']
SERVICE_ACCOUNT_FILE = os.getenv('GOOGLE_APPLICATION_CREDENTIALS')
DRIVE_FOLDER_ID = os.getenv('GOOGLE_DRIVE_FOLDER_ID')
LOCAL_KNOWLEDGE_DIR = Path(__file__).resolve().parents[1] / "data" / "knowledge"

# Supported MIME types and their extensions
MIME_TYPE_MAPPING = {
    'application/vnd.google-apps.document': ('docx', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'),
    'application/vnd.google-apps.spreadsheet': ('xlsx', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'),
    'application/pdf': ('pdf', 'application/pdf'),
    'text/plain': ('txt', 'text/plain'),
    'text/markdown': ('md', 'text/markdown'),
}


def authenticate():
    """Authenticate using service account credentials."""
    if not SERVICE_ACCOUNT_FILE:
        raise ValueError("GOOGLE_APPLICATION_CREDENTIALS environment variable not set")
    
    if not Path(SERVICE_ACCOUNT_FILE).exists():
        raise FileNotFoundError(f"Service account file not found: {SERVICE_ACCOUNT_FILE}")
    
    credentials = service_account.Credentials.from_service_account_file(
        SERVICE_ACCOUNT_FILE,
        scopes=SCOPES
    )
    return build('drive', 'v3', credentials=credentials)


def list_files_in_folder(service, folder_id):
    """List all files in a Google Drive folder."""
    query = f"'{folder_id}' in parents and trashed=false"
    
    results = service.files().list(
        q=query,
        pageSize=100,
        fields="files(id, name, mimeType, modifiedTime)"
    ).execute()
    
    return results.get('files', [])


def export_google_doc(service, file_id, mime_type, output_path):
    """Export a Google Workspace document (Docs, Sheets, etc.)."""
    export_mime = MIME_TYPE_MAPPING.get(mime_type, (None, None))[1]
    
    if not export_mime:
        print(f"  ⚠️  Unsupported file type: {mime_type}")
        return False
    
    request = service.files().export_media(fileId=file_id, mimeType=export_mime)
    fh = io.FileIO(output_path, 'wb')
    downloader = MediaIoBaseDownload(fh, request)
    
    done = False
    while not done:
        status, done = downloader.next_chunk()
    
    return True


def download_file(service, file_id, output_path):
    """Download a regular file (PDF, .txt, etc.)."""
    request = service.files().get_media(fileId=file_id)
    fh = io.FileIO(output_path, 'wb')
    downloader = MediaIoBaseDownload(fh, request)
    
    done = False
    while not done:
        status, done = downloader.next_chunk()
    
    return True


def sync_drive_folder():
    """Main sync function."""
    if not DRIVE_FOLDER_ID:
        raise ValueError("GOOGLE_DRIVE_FOLDER_ID environment variable not set")
    
    print("\n=== AssistFlow Google Drive Sync ===")
    print(f"Folder ID: {DRIVE_FOLDER_ID}")
    print(f"Local dir: {LOCAL_KNOWLEDGE_DIR}\n")
    
    # Authenticate
    print("Step 1: Authenticating with Google Drive...")
    service = authenticate()
    print("  ✓ Authenticated\n")
    
    # List files
    print("Step 2: Fetching files from Drive...")
    files = list_files_in_folder(service, DRIVE_FOLDER_ID)
    print(f"  ✓ Found {len(files)} file(s)\n")
    
    if not files:
        print("No files found in the folder. Add documents and try again.")
        return
    
    # Create knowledge directory if it doesn't exist
    LOCAL_KNOWLEDGE_DIR.mkdir(parents=True, exist_ok=True)
    
    # Download each file
    print("Step 3: Downloading files...")
    downloaded = 0
    skipped = 0
    
    for file in files:
        file_name = file['name']
        file_id = file['id']
        mime_type = file['mimeType']
        
        print(f"  Processing: {file_name}")
        
        # Determine file extension
        if mime_type in MIME_TYPE_MAPPING:
            extension = MIME_TYPE_MAPPING[mime_type][0]
            safe_name = file_name.replace(' ', '_').replace('/', '_')
            output_path = LOCAL_KNOWLEDGE_DIR / f"{safe_name}.{extension}"
            
            try:
                if mime_type.startswith('application/vnd.google-apps'):
                    # Export Google Workspace file
                    export_google_doc(service, file_id, mime_type, output_path)
                else:
                    # Download regular file
                    download_file(service, file_id, output_path)
                
                print(f"    ✓ Downloaded to {output_path.name}")
                downloaded += 1
            except Exception as e:
                print(f"    ✗ Error: {e}")
                skipped += 1
        else:
            print(f"    ⊘ Skipped (unsupported type: {mime_type})")
            skipped += 1
    
    print(f"\n✓ Sync complete!")
    print(f"  Downloaded: {downloaded}")
    print(f"  Skipped: {skipped}")
    print(f"\nNext: Run 'python scripts/ingest_knowledge.py' to index the documents.")


if __name__ == "__main__":
    try:
        sync_drive_folder()
    except Exception as e:
        print(f"\n✗ Error: {e}")
        sys.exit(1)
```

### Step 3: Share Drive Folder with Service Account

**Critical Step!**

1. Go to your Google Drive
2. Create or select the folder with your knowledge base documents
3. Right-click → **"Share"**
4. Paste your service account email (looks like: `assistflow-drive-reader@project-id.iam.gserviceaccount.com`)
5. Set permission to **"Viewer"**
6. Click **"Send"**

### Step 4: Get Folder ID

In Google Drive, open the folder and look at the URL:
```
https://drive.google.com/drive/folders/1aB2cD3eF4gH5iJ6kL7mN8oP9qR0sT
                                         ^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
                                         This is your FOLDER_ID
```

Copy that ID.

### Step 5: Set Environment Variables

**Local Development:**

Edit `backend/.env`:
```env
GOOGLE_APPLICATION_CREDENTIALS=/path/to/assistflow-drive-reader-abc123.json
GOOGLE_DRIVE_FOLDER_ID=1aB2cD3eF4gH5iJ6kL7mN8oP9qR0sT
```

**Render Production:**

1. Go to Render dashboard → **"Environment"** tab
2. Add:
   - Key: `GOOGLE_DRIVE_FOLDER_ID`
   - Value: Your folder ID
3. For the service account JSON:
   - Copy the entire contents of the JSON file
   - Add:
     - Key: `GOOGLE_SERVICE_ACCOUNT_JSON`
     - Value: Paste the entire JSON (it's long, that's OK)

Update `scripts/sync_from_drive.py` to handle JSON string:
```python
import json

SERVICE_ACCOUNT_JSON = os.getenv('GOOGLE_SERVICE_ACCOUNT_JSON')
SERVICE_ACCOUNT_FILE = os.getenv('GOOGLE_APPLICATION_CREDENTIALS')

def authenticate():
    if SERVICE_ACCOUNT_JSON:
        # Production: use JSON string
        credentials_dict = json.loads(SERVICE_ACCOUNT_JSON)
        credentials = service_account.Credentials.from_service_account_info(
            credentials_dict,
            scopes=SCOPES
        )
    elif SERVICE_ACCOUNT_FILE:
        # Local: use file
        credentials = service_account.Credentials.from_service_account_file(
            SERVICE_ACCOUNT_FILE,
            scopes=SCOPES
        )
    else:
        raise ValueError("Neither GOOGLE_SERVICE_ACCOUNT_JSON nor GOOGLE_APPLICATION_CREDENTIALS set")
    
    return build('drive', 'v3', credentials=credentials)
```

### Step 6: Test the Sync

```bash
cd /Users/mark/AssistFlow
source backend/.venv/bin/activate

# Sync files from Drive
python scripts/sync_from_drive.py

# Expected output:
# === AssistFlow Google Drive Sync ===
# Step 1: Authenticating with Google Drive...
#   ✓ Authenticated
# Step 2: Fetching files from Drive...
#   ✓ Found 8 file(s)
# Step 3: Downloading files...
#   Processing: CRM Login SOP
#     ✓ Downloaded to CRM_Login_SOP.docx
#   ...
# ✓ Sync complete!

# Now ingest into ChromaDB
python scripts/ingest_knowledge.py
```

### Step 7: Automate Sync (Production)

**Option A: Render Cron Job**

Create `render-cron.yaml`:
```yaml
services:
  - type: cron
    name: assistflow-drive-sync
    runtime: python
    schedule: "0 */4 * * *"  # Every 4 hours
    buildCommand: pip install -r backend/requirements.txt
    startCommand: python scripts/sync_from_drive.py && python scripts/ingest_knowledge.py
    envVarsFrom:
      - fromService:
          name: assistflow-backend
          type: web
```

**Option B: Built-in Scheduler**

Add to `backend/app/main.py`:

```python
from apscheduler.schedulers.asyncio import AsyncIOScheduler
import asyncio

@asynccontextmanager
async def lifespan(app: FastAPI):
    # --- Startup ---
    setup_logging(level=LOG_LEVEL)
    app.state.chat_service = ChatService()
    
    # Start background sync scheduler
    scheduler = AsyncIOScheduler()
    scheduler.add_job(
        sync_and_ingest,
        'interval',
        minutes=15,  # Sync every 15 minutes
        id='drive_sync'
    )
    scheduler.start()
    
    yield
    
    # --- Shutdown ---
    scheduler.shutdown()

async def sync_and_ingest():
    """Background task to sync Drive and re-ingest."""
    import subprocess
    
    # Run sync script
    result = subprocess.run(['python', 'scripts/sync_from_drive.py'], 
                          capture_output=True)
    if result.returncode == 0:
        # If sync successful, re-ingest
        subprocess.run(['python', 'scripts/ingest_knowledge.py'])
```

Add to `requirements.txt`:
```txt
apscheduler==3.10.4
```

---

## Option 2: LangChain GoogleDriveLoader (Easier)

**Best for:** Quick setup, less code

LangChain has built-in Google Drive support.

### Step 1: Install LangChain Google Drive

```bash
pip install langchain-google-community
```

Add to `requirements.txt`:
```txt
langchain-google-community==0.3.1
```

### Step 2: Update Ingest Script

Modify `scripts/ingest_knowledge.py`:

```python
from langchain_google_community import GoogleDriveLoader

def load_from_google_drive():
    """Load documents from Google Drive using LangChain."""
    folder_id = os.getenv("GOOGLE_DRIVE_FOLDER_ID")
    
    if not folder_id:
        print("No GOOGLE_DRIVE_FOLDER_ID set. Skipping Drive sync.")
        return []
    
    print("Loading documents from Google Drive...")
    
    loader = GoogleDriveLoader(
        folder_id=folder_id,
        credentials_path=os.getenv("GOOGLE_APPLICATION_CREDENTIALS"),
        recursive=False,  # Set True to include subfolders
        file_types=["document", "pdf", "sheet"],  # Google Doc types
    )
    
    documents = loader.load()
    print(f"  ✓ Loaded {len(documents)} document(s) from Drive")
    
    return documents

def ingest() -> None:
    # ... existing code ...
    
    # Load from Drive
    drive_docs = load_from_google_drive()
    
    # Load from local files (existing logic)
    local_docs = load_documents(KNOWLEDGE_DIR)
    
    # Combine both sources
    all_documents = drive_docs + local_docs
    
    # ... rest of ingestion logic ...
```

### Benefits of LangChain Loader:
- ✅ Less code to maintain
- ✅ Automatic Google Docs → text conversion
- ✅ Built-in error handling
- ✅ Supports recursive folder traversal

---

## Option 3: Scheduled Sync (Production)

### Using Render Cron Jobs

**Create separate cron service:**

1. In Render dashboard, click **"New +"** → **"Cron Job"**
2. Configure:
   - **Name:** assistflow-drive-sync
   - **Runtime:** Python 3
   - **Schedule:** `0 */4 * * *` (every 4 hours)
   - **Build Command:** `pip install -r backend/requirements.txt`
   - **Start Command:** `python scripts/sync_from_drive.py && python scripts/ingest_knowledge.py`
3. Set same environment variables as backend
4. Deploy

**Cron Schedule Examples:**
- `0 */4 * * *` — Every 4 hours
- `0 0 * * *` — Daily at midnight
- `*/15 * * * *` — Every 15 minutes
- `0 9,17 * * *` — 9 AM and 5 PM daily

---

## 🔒 Security Considerations

### 1. Service Account Permissions

**Best Practice:**
- ✅ Use "Viewer" role only (read-only)
- ✅ Create dedicated service account per project
- ✅ Rotate keys every 90 days

**Don't:**
- ❌ Use "Editor" or "Owner" roles
- ❌ Share service account across projects
- ❌ Commit JSON keys to Git

### 2. Secure Credential Storage

**Local Development:**
```bash
# Store key outside repository
mkdir ~/.assistflow
mv assistflow-drive-reader-abc123.json ~/.assistflow/

# Reference in .env
GOOGLE_APPLICATION_CREDENTIALS=/Users/mark/.assistflow/assistflow-drive-reader-abc123.json
```

**Production (Render):**
- Store entire JSON as environment variable
- Mark as "secret" in Render dashboard
- Never log credential values

### 3. Folder Access Control

**Limit Scope:**
1. Create dedicated "AssistFlow Knowledge Base" folder
2. Only share that specific folder with service account
3. Don't share entire Drive or root folders
4. Use sub-folders for organization:
   ```
   AssistFlow Knowledge Base/
   ├── SOPs/
   ├── Error Logs/
   ├── FAQs/
   └── Policies/
   ```

### 4. Data Validation

Add validation in sync script:

```python
def validate_file_content(content):
    """Ensure downloaded content is safe."""
    # Check file size (prevent huge files)
    if len(content) > 10_000_000:  # 10 MB limit
        raise ValueError("File too large")
    
    # Check for suspicious content
    if b'<script>' in content:
        raise ValueError("Suspicious content detected")
    
    return True
```

---

## 🐛 Troubleshooting

### Issue: "Service account does not have access"

**Solution:**
1. Verify you shared the folder with the service account email
2. Check the service account email in JSON file:
   ```json
   {
     "client_email": "assistflow-drive-reader@project-id.iam.gserviceaccount.com"
   }
   ```
3. Make sure you clicked "Send" after sharing

### Issue: "API not enabled"

**Solution:**
1. Go to https://console.cloud.google.com/apis/library
2. Search "Google Drive API"
3. Click "Enable"
4. Wait 1-2 minutes for propagation

### Issue: "Quota exceeded"

**Solution:**
- Free tier: 1,000 requests/100 seconds
- Reduce sync frequency
- Or enable billing for higher quotas

### Issue: Files not syncing

**Check:**
1. Folder ID is correct
2. Service account has "Viewer" permission
3. Files are not in trash
4. MIME types are supported

**Debug command:**
```bash
# Test authentication
python -c "
from google.oauth2 import service_account
creds = service_account.Credentials.from_service_account_file(
    'path/to/key.json',
    scopes=['https://www.googleapis.com/auth/drive.readonly']
)
print('✓ Auth successful')
"
```

---

## 📊 Comparison: Local Files vs. Google Drive

| Aspect | Local Files | Google Drive |
|--------|-------------|--------------|
| **Setup Complexity** | ⭐ Simple | ⭐⭐⭐ Moderate |
| **Team Collaboration** | Git workflow | Native Drive sharing |
| **Version Control** | Git history | Drive version history |
| **Mobile Editing** | No | Yes (Drive app) |
| **Real-time Updates** | Manual push | Automatic sync |
| **File Types** | .md, .txt | Docs, Sheets, PDFs, .docx |
| **Comments** | PR comments | Drive comments |
| **Access Control** | GitHub permissions | Drive permissions |
| **Offline Access** | Always available | Requires sync |
| **Cost** | Free | Free (15 GB limit) |

---

## 🎯 Recommended Approach

### For Small Teams (<5 people):
**Use Local Files (Current Setup)**
- Simpler to maintain
- No external dependencies
- Git provides version control
- Good for technical teams comfortable with Git

### For Larger Teams or Non-Technical Users:
**Use Google Drive Integration**
- Easier for non-developers to update
- Familiar interface (Google Docs)
- Real-time collaboration
- Mobile editing support

### Hybrid Approach (Best of Both):
1. **Primary source:** Google Drive (team edits here)
2. **Backup:** Sync to Git automatically
3. **Production:** Ingest from Drive every 4 hours

---

## 📝 Quick Start Checklist

**To add Google Drive to AssistFlow:**

- [ ] Create Google Cloud project
- [ ] Enable Google Drive API
- [ ] Create service account
- [ ] Download JSON key (keep secure!)
- [ ] Create knowledge base folder in Drive
- [ ] Share folder with service account email
- [ ] Get folder ID from URL
- [ ] Install dependencies: `google-api-python-client`
- [ ] Create `scripts/sync_from_drive.py` (use code above)
- [ ] Set environment variables (folder ID + JSON)
- [ ] Test sync: `python scripts/sync_from_drive.py`
- [ ] Ingest: `python scripts/ingest_knowledge.py`
- [ ] Set up cron job for automatic sync (optional)

---

## 🚀 Next Steps

After setting up Google Drive integration:

1. **Monitor Sync Logs** — Check Render logs for sync errors
2. **Set Up Alerts** — Get notified if sync fails
3. **Document Process** — Add Drive folder link to team wiki
4. **Train Team** — Show team how to add/edit documents
5. **Backup Strategy** — Periodically export Drive to Git

---

**End of Google Drive RAG Integration Guide**  
*For questions, see the Troubleshooting section or open a GitHub Issue*
