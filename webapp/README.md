# AssistFlow Web Application

Standalone web version of the AssistFlow Chrome extension. This provides the same AI-assisted workplace support functionality in a responsive web interface.

## Features

- **Same process flow** as the Chrome extension
- **Side panel chat interface** with the main content area
- **Offline FAQ** support with 39 pre-loaded protocols
- **Real-time AI assistance** via the FastAPI backend
- **Auto-recovery** from offline mode
- **Dark mode** support
- **Responsive design** — works on desktop and tablets

## Quick Start

### 1. Install dependencies

```bash
npm install
```

### 2. Start the development server

```bash
npm run dev
```

The app will open at `http://localhost:3000`

### 3. Make sure the backend is running

```bash
cd ../backend
source .venv/bin/activate
python run.py
```

## Build for Production

```bash
npm run build
```

The production build will be in the `dist/` directory.

To preview the production build:

```bash
npm run preview
```

## Architecture

```
webapp/
├── public/
│   └── favicon.svg          # App icon
├── src/
│   ├── App.jsx             # Main chat component (same logic as extension)
│   ├── main.jsx            # Entry point with layout wrapper
│   ├── index.css           # Styles (same as extension + web-specific)
│   └── offlineFaq.js       # Local FAQ for offline mode
├── index.html
├── vite.config.js
├── tailwind.config.js
└── package.json
```

## Key Differences from Extension

1. **No Chrome API dependencies** — removed all `chrome.runtime` calls
2. **Standalone layout** — split-screen design with welcome panel + chat sidebar
3. **No page context** — doesn't read ticket info from CRM pages (web-only mode)
4. **Direct usage** — no need to install as browser extension

## Offline Mode

Works exactly like the extension:

- **First failure**: 5s timeout → marks offline → serves from local FAQ
- **Subsequent queries**: Skip fetch entirely → instant FAQ response (< 1ms)
- **Auto-recovery**: Polls backend every 30s → restores online mode automatically
- **No match**: Shows clickable list of all FAQ topics

## Configuration

Backend URL is set in `src/App.jsx`:

```javascript
const BACKEND_URL = 'http://127.0.0.1:8000';
```

Change this if your backend is running on a different host/port.

## Development

- Hot reload is enabled — changes reflect immediately
- Tailwind CSS for styling with dark mode support
- React 18 with hooks
- Vite for fast build and dev server

## Deployment

The built static files can be deployed to:
- **Netlify** / **Vercel** — zero-config deployment
- **AWS S3 + CloudFront** — static hosting
- **Internal web server** — serve the `dist/` folder

Just ensure the `BACKEND_URL` points to your production backend.

## Browser Support

- Chrome 90+
- Firefox 88+
- Safari 14+
- Edge 90+
