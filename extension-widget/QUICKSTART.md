# 🚀 AssistFlow Extension - 2-Minute Quick Start

## TL;DR
Get your AI assistant on every website in 3 steps!

---

## Step 1: Generate Icons (30 seconds)

```bash
# From project root:
open extension-widget/create-icons.html
```

In the browser:
1. Icons generate automatically
2. Click "Download 16x16" → save as `icon16.png`
3. Click "Download 48x48" → save as `icon48.png`
4. Click "Download 128x128" → save as `icon128.png`
5. Move all 3 PNG files to `extension-widget/icons/` folder

---

## Step 2: Load Extension (60 seconds)

1. Open Chrome
2. Type in address bar: `chrome://extensions/`
3. Toggle ON "Developer mode" (top-right corner)
4. Click "Load unpacked" button
5. Navigate to and select the `extension-widget` folder
6. Click "Select" or "Open"

✅ Extension installed!

---

## Step 3: Test It! (30 seconds)

1. Visit **any website** (try google.com)
2. Look for **💬 button** in bottom-right corner
3. **Click it** → sidebar slides in
4. Type: **"Hello, can you help me?"**
5. Press **Enter** or click **Send**
6. Wait for AI response (~1-2 seconds)
7. Click **X** or backdrop to close

✅ It works!

---

## What's Next?

### Use it for real work:
- Browse your CRM system
- Click 💬 when you need help
- Ask: "How do I escalate a ticket?"
- Get instant SOP-based answers
- Close and continue working

### Share with team:
1. Zip the `extension-widget` folder
2. Send to teammates
3. They follow steps 1-3 above
4. Everyone has AI assistant!

### Publish it:
- Create Chrome Web Store developer account
- Upload extension
- Share publicly

---

## Troubleshooting

**No 💬 button showing?**
- Refresh the webpage (Cmd+R or Ctrl+R)
- Check extension is enabled at `chrome://extensions/`

**Chat not responding?**
- Check backend: https://assistflow-backend-ctbq.onrender.com/api/health
- Should return: `{"status":"ok"}`

**Icons missing warning?**
- Make sure you completed Step 1
- Verify 3 PNG files exist in `extension-widget/icons/`

---

## That's It! 🎉

You now have an AI assistant accessible from **every website** you visit!

For detailed docs: see `README.md`  
For troubleshooting: see `INSTALLATION.md`  
For full summary: see `EXTENSION_WIDGET_COMPLETE.md`
