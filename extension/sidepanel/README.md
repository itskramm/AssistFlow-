# AssistFlow Chrome Extension

This is the CRM-integrated Chrome extension for AssistFlow. It opens a native
Chrome side panel, reads supported CRM ticket details from the current page, and
lets agents ask questions without leaving their CRM.

The extension is optional. The standalone web application is in `webapp/` and
does not require Chrome extension installation.

## What you need

- Google Chrome 114 or newer
- Node.js 18 or newer and npm
- The AssistFlow backend running at `http://127.0.0.1:8000`
- A built extension loaded as an unpacked extension

The extension uses the same backend API and local offline FAQ as the web app.
It does not use the web app's Supabase login or saved conversation-history
screen.

## Install from the repository

From the repository root:

```bash
cd extension/sidepanel
npm install
npm run build
```

This creates the installable bundle in `extension/sidepanel/dist/`.

## Load the extension in Chrome

1. Open `chrome://extensions`.
2. Enable **Developer mode**.
3. Click **Load unpacked**.
4. Select the repository's `extension/sidepanel/dist/` folder.
5. Pin **AssistFlow** from Chrome's Extensions menu.
6. Click the AssistFlow toolbar icon to open the side panel.

After changing extension source files, run `npm run build` again and click the
reload button on the AssistFlow card in `chrome://extensions`.

## Start the backend

The extension cannot answer online questions unless the backend is running:

```bash
cd backend
source .venv/bin/activate       # macOS/Linux
# .venv\Scripts\activate        # Windows PowerShell
python run.py
```

Check the backend before opening the extension:

```bash
curl http://127.0.0.1:8000/api/health
```

The extension currently uses this backend URL:

```javascript
const BACKEND_URL = 'http://127.0.0.1:8000';
```

To use a deployed backend, update `BACKEND_URL` in
`src/App.jsx`, rebuild the extension, and reload the unpacked extension.

## Use it with a CRM

1. Open a supported CRM page in Chrome.
2. Open the AssistFlow side panel from the toolbar.
3. Ask a question about the current ticket, or highlight text on the page and
   send it as a query.
4. Use the context-menu action **Ask AssistFlow** on selected text when needed.

The content script recognizes CRM and support platforms including Salesforce,
Zendesk, Freshdesk, Genesys Cloud, RingCentral, Talkdesk, Five9, HubSpot,
ServiceNow, Intercom, Help Scout, Kustomer, and Zoho.

Some pages, including `chrome://` pages and the Chrome Web Store, block
extensions from reading page content. The side panel can still be opened there,
but automatic ticket context will not be available.

## Offline behavior

- If the backend is reachable, questions use the RAG and Gemini pipeline.
- If the backend is unavailable, the extension falls back to its bundled FAQ.
- The extension automatically checks for backend recovery while offline.

## Troubleshooting

### The extension does not appear

Make sure you loaded `extension/sidepanel/dist/`, not the source directory, and
reload the extension after rebuilding.

### The side panel is blank

Run `npm run build` from `extension/sidepanel/`, then reload the extension in
`chrome://extensions`. Inspect the extension service worker or side panel for
JavaScript errors.

### Online answers do not work

Check that the backend responds at `http://127.0.0.1:8000/api/health`, that
`GEMINI_API_KEY` is configured in `backend/.env`, and that the extension's
`BACKEND_URL` matches the backend address.

### CRM details are not detected

Refresh the CRM tab after loading or reloading the extension. Confirm the page
matches one of the supported CRM domains and remember that protected Chrome
pages cannot be inspected by content scripts.

## Development

```bash
cd extension/sidepanel
npm run dev
```

The Vite dev server is useful for UI work, but Chrome installation and CRM
content-script testing should use the production bundle from `npm run build`.
