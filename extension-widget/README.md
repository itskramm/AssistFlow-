# AssistFlow Chrome Extension

A browser extension that injects the AssistFlow AI assistant as a floating chat bubble on **any webpage** you visit.

## Features

- 💬 **Floating Chat Bubble** - Always accessible from bottom-right corner
- 🌐 **Works on Any Website** - Available on every webpage you visit
- 🎨 **Beautiful UI** - Messenger-style sidebar with smooth animations
- 🚀 **Instant Access** - Click the bubble to slide out the assistant
- 🔒 **Privacy Focused** - Only communicates with AssistFlow backend

## Installation

### Option 1: Load Unpacked (Development)

1. Open Chrome and navigate to `chrome://extensions/`
2. Enable **Developer mode** (toggle in top-right corner)
3. Click **Load unpacked**
4. Select the `extension-widget` folder
5. The extension is now installed!

### Option 2: Create Icons First (Recommended)

Before loading, create proper icons:

```bash
cd extension-widget/icons
```

Create three PNG icons with these dimensions:
- `icon16.png` - 16x16 pixels
- `icon48.png` - 48x48 pixels  
- `icon128.png` - 128x128 pixels

**Quick Icon Creation (using ImageMagick):**

```bash
# Install ImageMagick if needed
brew install imagemagick

# Create a simple gradient icon
convert -size 128x128 gradient:#667eea-#764ba2 -font Arial -pointsize 80 -fill white -gravity center -annotate +0+0 "💬" icon128.png
convert icon128.png -resize 48x48 icon48.png
convert icon128.png -resize 16x16 icon16.png
```

## How to Use

1. **After installation**, visit any website
2. Look for the **💬 floating button** in the bottom-right corner
3. **Click the button** to open the AssistFlow assistant
4. **Start chatting!** Ask questions about workplace procedures, troubleshooting, etc.
5. Click the **X** or backdrop to close the sidebar

## Files Structure

```
extension-widget/
├── manifest.json         # Extension configuration
├── content.js           # Injected on every page
├── widget.css          # Floating button & sidebar styles
├── iframe.html         # Chat interface HTML
├── iframe.js           # Chat logic & API calls
├── popup.html          # Extension popup UI
├── popup.js            # Popup logic
├── icons/
│   ├── icon16.png
│   ├── icon48.png
│   └── icon128.png
└── README.md
```

## Architecture

### Content Script Injection
The extension uses a **content script** (`content.js`) that runs on **every webpage** (`<all_urls>`). This script:
- Injects the floating 💬 button
- Creates the sidebar container with iframe
- Handles open/close animations
- Listens for messages from the iframe

### Iframe Isolation
The chat interface runs in an **isolated iframe** (`iframe.html`) that:
- Contains the full chat UI
- Makes API calls to the AssistFlow backend
- Maintains conversation history
- Sends close messages to the parent window

### Backend Communication
All chat requests go to:
```
https://assistflow-backend-ctbq.onrender.com/api/chat
```

## Permissions Explained

- `storage` - Save user preferences (future feature)
- `activeTab` - Allow opening chat from toolbar icon
- `host_permissions` - Connect to AssistFlow backend API
- `<all_urls>` - Inject floating button on every website

## Troubleshooting

### Extension Not Appearing
- Check that Developer mode is enabled
- Ensure the extension is enabled in `chrome://extensions/`
- Try refreshing the page (Cmd+R / Ctrl+R)

### Floating Button Not Showing
- Open the browser console (F12) and check for errors
- Look for the message: `✅ AssistFlow widget loaded`
- Try reloading the extension in `chrome://extensions/`

### Chat Not Working
- Check network tab for API call errors
- Verify backend is running: https://assistflow-backend-ctbq.onrender.com/api/health
- Check for CORS errors in console

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
