# 🚀 AssistFlow Extension - 2-Minute Quick Start

## TL;DR
Get your AI assistant as a Chrome side panel in 3 steps!

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

## Step 3: Use the Floating Button (30 seconds)

1. Open a normal website such as GitHub or Google.
2. Click the SmartOpsSupportHub button in the bottom-right corner.
3. Type: **"Hello, can you help me?"**
4. Press **Enter** or click **Send**
5. Get an AI response without leaving the page.
6. Use the extension toolbar icon if you want the native panel that persists across tabs.

✅ It works!

---

## What's Different from Before?

### Old Version: Floating Button
- ❌ Injected into every webpage
- ❌ Could conflict with website content
- ❌ Z-index issues
- ❌ Performance impact

### New Version: Native Side Panel + Floating Button
- ✅ Floating launcher on normal websites
- ✅ Native Chrome panel available from the toolbar
- ✅ Native panel persists across tabs
- ⚠️ Chrome-restricted pages cannot run the floating launcher

---

## Requirements

- **Chrome 114+** (for Side Panel API)
- Check your version: `chrome://version/`
- Update Chrome if needed

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

**No extension icon?**
- Right-click Chrome toolbar → pin AssistFlow
- Or click puzzle icon → find AssistFlow → click pin

**Side panel not opening?**
- Check you have Chrome 114+ (`chrome://version/`)
- Reload extension at `chrome://extensions/`
- Check for errors in background service worker

**Chat not responding?**
- Check backend: https://assistflow-backend-ctbq.onrender.com/api/health
- Should return: `{"status":"ok"}`
- Inspect side panel (right-click → Inspect) for console errors

---

## That's It! 🎉

You now have an AI assistant accessible from **every website** you visit!

For detailed docs: see `README.md`  
For troubleshooting: see `INSTALLATION.md`  
For full summary: see [`docs/EXTENSION_WIDGET_COMPLETE.md`](../docs/EXTENSION_WIDGET_COMPLETE.md)
