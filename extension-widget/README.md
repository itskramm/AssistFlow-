# AssistFlow Chrome Extension

A browser extension that adds the AssistFlow AI assistant as a **native Chrome side panel** - just like Chrome DevTools, but for workplace support!

## Features

- 📌 **Native Side Panel** - Built-in Chrome UI, not injected content
- 🎨 **Beautiful Interface** - Clean, modern chat design
- ⚡ **Always Available** - Click extension icon to open side panel
- 🚀 **Fast & Smooth** - No page impact, runs separately
- 🔒 **Privacy Focused** - Only communicates with AssistFlow backend
- 💬 **Full Chat Experience** - Same features as the web app

## Installation

### Option 1: Load Unpacked (Development)

1. Open Chrome and navigate to `chrome://extensions/`
2. Enable **Developer mode** (toggle in top-right corner)
3. Click **Load unpacked**
4. Select the `extension-widget` folder
5. The extension is now installed!

### Option 2: Generate Icons First (Recommended)

Before loading, create proper icons:

```bash
cd extension-widget
```

Open `create-icons.html` in your browser and download the three PNG icons:
- `icon16.png` - 16x16 pixels
- `icon48.png` - 48x48 pixels  
- `icon128.png` - 128x128 pixels

Save them to the `icons/` folder.

## How to Use

1. **After installation**, click the **AssistFlow icon** in your Chrome toolbar
2. The **side panel** opens on the right side of your browser
3. **Start chatting!** Ask questions about workplace procedures, troubleshooting, etc.
4. The side panel stays open across tabs - works alongside your browsing
5. Click the icon again or close the panel to hide it

## What is Chrome Side Panel?

Chrome's side panel is the same UI used by:
- Chrome DevTools
- Reading List
- Bookmarks sidebar
- Performance insights

It's a **native Chrome feature** that:
- Doesn't inject into web pages
- Runs in its own isolated context
- Stays persistent across tab switches
- Can be resized by the user
- Feels like part of the browser

## Files Structure

```
extension-widget/
├── manifest.json         # Extension configuration (v3 with side panel)
├── background.js         # Service worker for side panel
├── sidepanel.html       # Side panel UI
├── sidepanel.js         # Side panel logic & API calls
├── create-icons.html    # Icon generator tool
├── icons/
│   ├── icon16.png
│   ├── icon48.png
│   └── icon128.png
└── README.md
```

## Architecture

### Chrome Side Panel API
The extension uses Chrome's **Side Panel API** (introduced in Chrome 114):
- Side panel registered in `manifest.json`
- Opened via extension icon click
- Handled by background service worker
- Runs independently from web pages

### Benefits Over Content Script Injection
- ✅ No DOM injection or conflicts
- ✅ No z-index battles with websites
- ✅ Native Chrome UI integration
- ✅ Better performance (separate context)
- ✅ Persistent across tabs
- ✅ User can resize the panel
- ✅ Works on restricted pages (chrome://, etc.)

### Backend Communication
All chat requests go to:
```
https://assistflow-backend-ctbq.onrender.com/api/chat
```

## Permissions Explained

- `storage` - Save user preferences and conversation history
- `activeTab` - Allow side panel to know current tab context
- `sidePanel` - Enable Chrome's native side panel API
- `host_permissions` - Connect to AssistFlow backend API

## Troubleshooting

### Side Panel Not Opening
- Check that the extension is enabled in `chrome://extensions/`
- Make sure you're using Chrome 114 or later (Side Panel API requirement)
- Click the extension icon in the toolbar
- Check background service worker for errors

### No Extension Icon in Toolbar
- Right-click the toolbar
- Select "Show AssistFlow Assistant"
- Or click the puzzle icon and pin AssistFlow

### Chat Not Working
- Check network tab for API call errors
- Verify backend is running: https://assistflow-backend-ctbq.onrender.com/api/health
- Check for CORS errors in console (open DevTools in side panel: right-click → Inspect)

### Icons Missing Warning
If you see icon warnings:
1. Create the three PNG icons (16x16, 48x48, 128x128)
2. Place them in `extension-widget/icons/`
3. Reload the extension

## Development

To modify the extension:

1. Make changes to the files
2. Go to `chrome://extensions/`
3. Click the **refresh icon** on the AssistFlow extension card
4. Refresh any open tabs to see changes

## Backend Configuration

The backend URL is hardcoded in:
- `content.js` (line 9)
- `iframe.js` (line 3)
- `popup.js` (line 3)

To change the backend, update all three files.

## Future Enhancements

- [ ] Offline mode with cached FAQs
- [ ] Keyboard shortcut to toggle chat (Cmd+Shift+A)
- [ ] Dark/light theme toggle
- [ ] Conversation history persistence
- [ ] Custom position (left/right/bottom)
- [ ] Minimize to small bubble mode

## Publishing to Chrome Web Store

To publish this extension:

1. Create proper icons (required)
2. Test on multiple websites
3. Create a developer account ($5 one-time fee)
4. Zip the `extension-widget` folder
5. Upload to Chrome Web Store Developer Dashboard
6. Fill in store listing details
7. Submit for review

## License

Part of the AssistFlow project.

## Support

For issues or questions, check the main AssistFlow repository.
