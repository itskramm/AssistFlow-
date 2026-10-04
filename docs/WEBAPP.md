# AssistFlow Web Application Guide

## Overview

The AssistFlow Web Application is a standalone version of the Chrome extension, providing the same AI-assisted workplace support functionality through a responsive web interface. It can be accessed from any modern browser without requiring extension installation.

## What's Included

The web app provides:

- **Same chat interface** as the Chrome extension
- **Identical offline detection** and auto-recovery logic
- **39 pre-loaded FAQ protocols** for instant offline responses
- **Real-time AI assistance** via the FastAPI backend (RAG + Gemini)
- **Dark mode** with localStorage persistence
- **Responsive design** optimized for desktop and tablets

## Key Differences from Extension

| Feature | Extension | Web App |
|---|---|---|
| Installation | Requires Chrome extension load | Direct browser access |
| CRM integration | Reads live ticket context | No page context (standalone) |
| Auto-activation | Opens on CRM domains | User navigates manually |
| Right-click menu | Available on any page | Not applicable |
| Highlight-to-query | Available via content script | Not applicable |
| Backend connectivity | Same | Same |
| Offline FAQ | Same (39 protocols) | Same (39 protocols) |
| Dark mode | Same | Same |

## Directory Structure

```
webapp/
├── public/
│   └── favicon.svg           # App icon
├── src/
│   ├── App.jsx              # Main chat component (extension logic adapted)
│   ├── main.jsx             # Entry point + layout wrapper
│   ├── index.css            # Styles (extension CSS + web-specific layout)
│   └── offlineFaq.js        # Local FAQ (same as extension)
├── dist/                    # Production build output
├── index.html
├── vite.config.js
├── tailwind.config.js
├── postcss.config.js
├── package.json
└── README.md
```

## Running the Web App

### Development Mode

1. Start the backend:
   ```bash
   cd backend
   source .venv/bin/activate
   python run.py
   ```

2. Start the web app:
   ```bash
   cd webapp
   npm install    # First time only
   npm run dev
   ```

3. Open http://localhost:3000 in your browser

### Production Build

```bash
cd webapp
npm run build
```

The production files will be in `webapp/dist/` ready for deployment.

To preview the production build locally:

```bash
npm run preview
```

## Deployment Options

### Option 1: Static Hosting (Netlify / Vercel)

1. Build the app: `npm run build`
2. Deploy the `dist/` folder
3. Set environment variable for backend URL if different from localhost

### Option 2: Internal Web Server

1. Build the app: `npm run build`
2. Copy `dist/` contents to your web server document root
3. Serve as static files (no server-side rendering needed)

### Option 3: Docker Container

Create `webapp/Dockerfile`:

```dockerfile
FROM node:18-alpine AS build
WORKDIR /app
COPY package*.json ./
RUN npm install
COPY . .
RUN npm run build

FROM nginx:alpine
COPY --from=build /app/dist /usr/share/nginx/html
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
```

Build and run:

```bash
docker build -t assistflow-webapp .
docker run -p 8080:80 assistflow-webapp
```

## Configuration

### Backend URL

Edit `src/App.jsx` to change the backend endpoint:

```javascript
const BACKEND_URL = 'http://127.0.0.1:8000';  // Change this for production
```

For production, use:
```javascript
const BACKEND_URL = 'https://your-backend-domain.com';
```

### Port Configuration

Edit `vite.config.js` to change the dev server port:

```javascript
export default defineConfig({
  server: {
    port: 3000,  // Change this if 3000 is already in use
    host: '0.0.0.0',
    open: true
  }
});
```

## Layout Structure

The web app uses a split-screen layout:

```
┌─────────────────────────────────────────────────────┐
│  Welcome Panel (Left)    │   Chat Panel (Right)    │
│                           │                          │
│  AssistFlow Logo          │  ┌─────────────────┐   │
│  Description              │  │  Chat Header    │   │
│  Features                 │  ├─────────────────┤   │
│                           │  │                 │   │
│                           │  │  Messages       │   │
│                           │  │                 │   │
│                           │  ├─────────────────┤   │
│                           │  │  Input Box      │   │
│                           │  └─────────────────┘   │
└─────────────────────────────────────────────────────┘
```

On mobile/tablet (< 1024px width), only the chat panel is shown.

## Offline Mode Behavior

Identical to the extension:

1. **First request fails** (5s timeout) → marks offline → serves from local FAQ
2. **Subsequent queries** → skips backend fetch → instant FAQ response (< 1ms)
3. **Background health poll** → every 30s while offline
4. **Auto-recovery** → when backend responds, switches back to online mode
5. **No FAQ match** → shows clickable list of all 39 topics

## Browser Compatibility

Tested and supported:

- ✅ Chrome 90+
- ✅ Firefox 88+
- ✅ Safari 14+
- ✅ Edge 90+

Requires:
- ES6+ JavaScript support
- CSS Grid
- CSS Custom Properties (CSS variables)
- Fetch API

## Performance

- **First load**: ~150KB gzipped (includes React 18)
- **Offline FAQ**: < 1ms response time
- **Online RAG query**: ~1-3s (backend dependent)
- **Dark mode toggle**: instant (CSS variables)

## Security Considerations

1. **CORS**: Ensure the backend allows the web app's origin
   ```python
   # backend/app/main.py
   origins = [
       "http://localhost:3000",      # Development
       "https://assistflow.yourdomain.com"  # Production
   ]
   ```

2. **API Key Protection**: Never expose `GEMINI_API_KEY` in the frontend
   - Keep all API calls server-side
   - Backend handles authentication

3. **HTTPS**: Use HTTPS in production for:
   - Secure cookie transmission
   - LocalStorage protection
   - Service worker support (if added)

## Troubleshooting

### Backend Connection Failed

**Symptom**: All queries return offline FAQ answers

**Check**:
1. Backend is running: `curl http://127.0.0.1:8000/api/health`
2. CORS is configured correctly in backend
3. `BACKEND_URL` in `src/App.jsx` matches backend address

### Dark Mode Not Persisting

**Symptom**: Dark mode resets on page reload

**Fix**: Check browser localStorage is enabled
```javascript
// Test in browser console:
localStorage.setItem('test', '1');
console.log(localStorage.getItem('test'));  // Should print '1'
```

### Build Fails

**Symptom**: `npm run build` errors

**Fix**:
1. Delete `node_modules` and `package-lock.json`
2. Run `npm install` again
3. Ensure Node.js version is 18 or higher

## Future Enhancements

Potential additions:

- [ ] Progressive Web App (PWA) support with offline caching
- [ ] Multi-language support
- [ ] Voice input for queries
- [ ] Export conversation history
- [ ] Admin panel for FAQ management
- [ ] Analytics dashboard
- [ ] Team collaboration features

## Support

For issues specific to the web app, check:
- Console errors (F12 → Console tab)
- Network tab (F12 → Network) for failed requests
- Backend logs for API errors

See main [`README.md`](../README.md) and [`TESTING.md`](TESTING.md) for comprehensive documentation.
