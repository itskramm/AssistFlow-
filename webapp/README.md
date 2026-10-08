# AssistFlow Web Application

Standalone web version of the AssistFlow Chrome extension. This provides the same AI-assisted workplace support functionality in a responsive web interface.

## Features

- **Same process flow** as the Chrome extension
- **Side panel chat interface** with the main content area
- **Offline FAQ** support with 39 pre-loaded protocols
- **Real-time AI assistance** via the FastAPI backend
- **Auto-recovery** from offline mode
- **Dark mode** support
- **Supabase email/password login and sign-up** with email magic-link verification
- **Supabase profiles** with an account dropdown in the main page
- **Per-user conversation history** — complete saved chats, responses, source labels, and ratings are restored after sign-in
- **Left-side conversation history** — browse saved chats and reopen every exchange in a conversation
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
New users receive an email confirmation magic link after signup. The website
does not ask users to copy or enter a one-time code; clicking the link returns
to the application and completes the Supabase confirmation session. The login
page also offers a passwordless magic-link option, while password login remains
available.
You can also use the Supabase dashboard's Authentication → Users page to
create accounts directly.

The registration form validates full name characters, Philippine mobile
formats (`09XXXXXXXXX` or `+639XXXXXXXXX`), a dynamically calculated minimum
age of 18, an email-shaped username, access-type selection, and an 8–16
character password containing uppercase, lowercase, a number, and a special
character. Resend requests are throttled for 60 seconds. The effective profile
role defaults to `User`; selecting `Admin` or `Super Admin` is stored as the
requested access type, but privileged roles must be assigned by a trusted
administrator and cannot be self-escalated from the browser.

The Supabase CLI configuration and migrations are stored under `supabase/`.
This project currently uses Supabase's default email provider, which only
sends to authorized project/team email addresses and has strict rate limits.
After linking the project, apply database and Auth configuration with:

```bash
supabase db push --linked
supabase config push --project-ref YOUR_PROJECT_REF
```

The migration protects security-managed profile fields and validates the
registration metadata again in the database trigger. Configure custom SMTP in
Supabase before relying on signup or reset email delivery to public users.

Run `supabase/schema.sql` in the Supabase SQL Editor to create or update the
protected `profiles` table, the per-user `prompt_conversations` and
`prompt_history` tables, and the trigger
that creates a profile row for each new user. Prompt history is linked to the
authenticated user's ID and grouped into conversations protected by Row Level
Security. Composite ownership constraints ensure a history row cannot be
attached to another user's conversation, and the app clears stale messages and
invalidates in-flight history loads when the signed-in user changes. Users
cannot read or modify another user's chats. The profile
dropdown shows the user's name, email, and role.
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
