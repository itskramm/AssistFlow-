# AssistFlow Extension - Quick Installation Guide

## Step-by-Step Installation

### Step 1: Generate Icons

1. Open `create-icons.html` in your browser:
   ```bash
   open extension-widget/create-icons.html
   ```

2. The icons will generate automatically

3. Click each download button:
   - Download 16x16 → save as `icon16.png`
   - Download 48x48 → save as `icon48.png`
   - Download 128x128 → save as `icon128.png`

4. Move all three PNG files to the `extension-widget/icons/` folder

### Step 2: Load Extension in Chrome

1. Open Google Chrome

2. Navigate to `chrome://extensions/`

3. Enable **Developer mode** (toggle switch in top-right corner)

4. Click **"Load unpacked"** button

5. Navigate to and select the `extension-widget` folder

6. Click **"Select"** or **"Open"**

### Step 3: Verify Installation

1. You should see "AssistFlow Assistant" in your extensions list

2. The extension should show as **Enabled**

3. Visit any website (e.g., google.com, github.com)

4. Look for the **💬 floating button** in the bottom-right corner

### Step 4: Test the Extension

1. Click the 💬 floating button

2. The sidebar should slide in from the right

3. Type a message: "Hello"

4. You should get a response from the AI assistant

5. Click the **X** or backdrop to close

## Troubleshooting

### Icons Missing Warning

If you see: "Could not load icon 'icons/icon16.png'"

**Solution:**
1. Make sure you completed Step 1 (Generate Icons)
2. Verify the files exist in `extension-widget/icons/`
3. Click the refresh button on the extension card
4. Reload any open tabs

### Floating Button Not Appearing

**Solution:**
1. Check the extension is enabled in `chrome://extensions/`
2. Refresh the webpage (Cmd+R or Ctrl+R)
3. Open browser console (F12) and look for: `✅ AssistFlow widget loaded`
4. If you don't see this message, reload the extension

### Extension Not Loading

**Solution:**
1. Make sure Developer mode is enabled
2. Check for error messages in red on the extension card
3. Verify `manifest.json` exists and is valid
4. Try closing and reopening Chrome

### Chat Not Responding

**Solution:**
1. Check backend status: https://assistflow-backend-ctbq.onrender.com/api/health
2. Should return: `{"status":"ok","service":"assistflow-backend"}`
3. Open browser console (F12) and check Network tab for errors
4. Look for CORS errors - these indicate backend configuration issues

### Extension Not Working on Some Sites

**Note:** Extensions have limited permissions on:
- `chrome://` pages (extensions, settings, etc.)
- Chrome Web Store pages
- Some restricted domains

This is a Chrome security feature and cannot be bypassed.

## Usage Tips

### Keyboard Navigation
- Press **Tab** to focus the input field
- Press **Enter** to send message
- Press **Escape** to close sidebar (future feature)

### Best Websites to Test
- GitHub.com
- Google.com  
- News sites
- Your company's internal portals

### Performance
- The extension is lightweight (~50KB)
- Minimal impact on page load times
- Only loads chat UI when opened

## Uninstallation

To remove the extension:

1. Go to `chrome://extensions/`
2. Find "AssistFlow Assistant"
3. Click **"Remove"**
4. Confirm removal

## Updates

When you make changes to the code:

1. Edit the files in `extension-widget/`
2. Go to `chrome://extensions/`
3. Click the **refresh icon** (circular arrow) on the extension card
4. Refresh any open tabs to see changes

## Next Steps

- ✅ Basic installation complete
- ✅ Test on multiple websites
- ✅ Verify backend connectivity
- 🔄 Customize appearance (edit `widget.css`)
- 🔄 Add more features (edit `iframe.js`)
- 🔄 Prepare for Chrome Web Store submission

## Support

If you encounter issues not covered here:

1. Check the browser console (F12) for error messages
2. Verify backend is running and accessible
3. Check the main AssistFlow documentation
4. Review the extension's README.md for advanced configuration

---

**Congratulations! 🎉** Your AssistFlow assistant is now available on every webpage you visit!
