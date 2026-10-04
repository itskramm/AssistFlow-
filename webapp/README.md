# AssistFlow Web Application

Standalone web version of the AssistFlow Chrome extension. This provides the same AI-assisted workplace support functionality in a responsive web interface.

## Features

- **Same process flow** as the Chrome extension
- **Side panel chat interface** with the main content area
- **Offline FAQ** support with 39 pre-loaded protocols
- **Real-time AI assistance** via the FastAPI backend
- **Auto-recovery** from offline mode
- **Dark mode** support
- **Supabase email/password login and sign-up** with email OTP verification
- **Supabase profiles** with an account dropdown in the main page
- **Per-user prompt history** — prompts, responses, source labels, and ratings are restored after sign-in
- **Left-side history panel** — browse saved prompts and jump back to an earlier exchange
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

### 4. Configure Supabase authentication

Create a Supabase project and enable **Email** under Authentication → Providers.
The signup form stores the user's full name, phone number, birthday, and address
in the protected `profiles` table. Passwords are stored only by Supabase Auth;
they must never be added to `profiles`.
Then copy `webapp/.env.example` to `.env.local` and set:

```bash
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=sb_publishable_your-key
```

The app displays the login/sign-up page until a valid Supabase session exists.
New users receive an email verification OTP after signup. In the Supabase
dashboard, keep email confirmation enabled, set the email OTP length to
**6 digits**, and configure the Confirm signup email template to include
`{{ .Token }}`. The website accepts exactly six numeric digits and verifies
the code with `supabase.auth.verifyOtp({ type: 'signup' })`.
You can also use the Supabase dashboard's Authentication → Users page to
create accounts directly.

Run `supabase/schema.sql` in the Supabase SQL Editor to create or update the
protected `profiles` table, the per-user `prompt_history` table, and the trigger
that creates a profile row for each new user. Prompt history is linked to the
authenticated user's ID and protected by Row Level Security, so users cannot
read or modify another user's prompts. The profile dropdown shows the user's
name, email, and role.
Only the Supabase URL and publishable/anonymous public key belong in Vite
variables; never expose a Supabase service-role or secret key in the browser.

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
│   ├── offlineFaq.js       # Local FAQ for offline mode
│   └── supabaseClient.js   # Supabase browser client and configuration check
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

For Vercel, add these environment variables in Project Settings → Environment
Variables, then redeploy:

```text
VITE_SUPABASE_URL
VITE_SUPABASE_ANON_KEY
```

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
