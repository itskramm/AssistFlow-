/**
 * App.jsx — SmartOpsSupportHub Web Application
 *
 * ChatGPT-style layout:
 *   - Home: centred greeting + input bar + suggestion chips
 *   - On first send: transitions to full-page chat (messages above, input pinned at bottom)
 *   - No sidebar — the main page IS the chat, just like ChatGPT
 */

import { useCallback, useEffect, useRef, useState } from 'react';
import { searchFaq, getTopicList } from './offlineFaq.js';
import { isSupabaseConfigured, supabase } from './supabaseClient.js';

const BACKEND_URL      = import.meta.env.VITE_BACKEND_URL || 'https://assistflow-backend-ctbq.onrender.com';
const FETCH_TIMEOUT_MS = 15000;
const HEALTH_POLL_MS   = 30000;
const OTP_LENGTH       = 6;

const SUGGESTIONS = [
  { icon: '🔑', label: 'CRM password reset',   query: 'How do I reset my CRM password?' },
  { icon: '📞', label: 'Call quality issues',   query: 'Call quality issues on my headset' },
  { icon: '📋', label: 'Escalate a ticket',     query: 'How do I escalate a ticket?' },
  { icon: '🆔', label: 'Identity verification', query: 'Customer identity verification steps' },
  { icon: '🌐', label: 'VPN not connecting',    query: 'VPN disconnected, how do I reconnect?' },
  { icon: '⚡', label: 'System running slow',   query: 'My system is running slow' },
];

// ---------------------------------------------------------------------------
// Inline markdown (bold only)
// ---------------------------------------------------------------------------
function parseInline(text) {
  const parts = [];
  const re = /\*\*(.*?)\*\*/g;
  let last = 0, m;
  while ((m = re.exec(text)) !== null) {
    if (m.index > last) parts.push({ bold: false, text: text.slice(last, m.index) });
    parts.push({ bold: true, text: m[1] });
    last = m.index + m[0].length;
  }
  if (last < text.length) parts.push({ bold: false, text: text.slice(last) });
  return parts.length ? parts : [{ bold: false, text }];
}

function InlineText({ text }) {
  return (
    <>
      {parseInline(text).map((p, i) =>
        p.bold ? <strong key={i}>{p.text}</strong> : <span key={i}>{p.text}</span>
      )}
    </>
  );
}

function stripBold(t) { return t.replace(/\*\*(.*?)\*\*/g, '$1'); }

function parseSteps(text) {
  const lines = text.split('\n').map(l => stripBold(l.trim())).filter(Boolean);
  const re = /^(\d+[.):]\s+|step\s+\d+[.:]\s*)/i;
  const steps = lines.filter(l => re.test(l));
  return steps.length >= 2 ? steps.map(l => l.replace(re, '').trim()) : null;
}

// ---------------------------------------------------------------------------
// Offline topic list
// ---------------------------------------------------------------------------
function TopicList({ onSelect }) {
  return (
    <div className="topic-list">
      <p className="topic-list-heading">Available topics while offline:</p>
      <ul>
        {getTopicList().map((label, i) => (
          <li key={i}><button className="topic-btn" onClick={() => onSelect(label)}>{label}</button></li>
        ))}
      </ul>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Source badge
// ---------------------------------------------------------------------------
const SOURCE_LABELS = {
  'rag':           { label: 'AI · SOP',      cls: 'source-rag'     },
  'offline-cache': { label: 'Offline cache', cls: 'source-offline' },
  'fallback':      { label: 'No connection', cls: 'source-fallback' },
};

function SourceBadge({ source }) {
  if (!source) return null;
  const { label, cls } = SOURCE_LABELS[source] || { label: source, cls: 'source-rag' };
  return <span className={`source-badge ${cls}`}>{label}</span>;
}

// ---------------------------------------------------------------------------
// Message row — ChatGPT style: user right, assistant left with avatar
// ---------------------------------------------------------------------------
function MessageRow({ message, onFeedback, onRetry, onTopicSelect }) {
  const isUser      = message.sender === 'user';
  const isAssistant = message.sender === 'assistant';
  const isError     = message.source === 'fallback';
  const isTopics    = message.source === 'offline-topics';
  const steps       = isAssistant && !isTopics ? parseSteps(message.text) : null;

  if (isUser) {
    return (
      <div className="msg-row msg-user">
        <div className="msg-bubble-user">
          <InlineText text={message.text} />
        </div>
      </div>
    );
  }

  return (
    <div className="msg-row msg-assistant">
      {/* Avatar */}
      <div className="msg-avatar">
        <img src="/bubble-logo.png" alt="SmartOpsSupportHub" />
      </div>

      <div className="msg-body">
        <div className={`msg-bubble-assistant ${isError ? 'msg-error' : ''}`}>
          {isTopics
            ? <TopicList onSelect={onTopicSelect} />
            : steps
              ? <ol className="steps-list">{steps.map((s, i) => <li key={i}><InlineText text={s} /></li>)}</ol>
              : <p className="bubble-text"><InlineText text={message.text} /></p>
          }
        </div>

        {/* Footer: source + feedback */}
        {message.id !== 'welcome' && !isTopics && (
          <div className="msg-footer">
            <SourceBadge source={message.source} />
            {isError && onRetry && (
              <button className="retry-btn" onClick={() => onRetry(message.userText)}>↺ Retry</button>
            )}
            {!isError && (
              <div className="feedback-row">
                <button
                  className={`feedback-btn ${message.feedback === 'up' ? 'active-up' : ''}`}
                  onClick={() => onFeedback(message.id, 'up')}
                  disabled={message.feedback !== null}
                  aria-label="Helpful"
                >👍</button>
                <button
                  className={`feedback-btn ${message.feedback === 'down' ? 'active-down' : ''}`}
                  onClick={() => onFeedback(message.id, 'down')}
                  disabled={message.feedback !== null}
                  aria-label="Not helpful"
                >👎</button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Sidebar message bubble (compact, no avatar)
// ---------------------------------------------------------------------------
function SideMessage({ message, onTopicSelect }) {
  const isUser   = message.sender === 'user';
  const isTopics = message.source === 'offline-topics';
  const steps    = !isUser && !isTopics ? parseSteps(message.text) : null;

  return (
    <div className={`side-msg-row ${isUser ? 'side-msg-user' : 'side-msg-assistant'}`}>
      <div className={`side-msg-bubble ${isUser ? 'side-bubble-user' : 'side-bubble-assistant'}`}>
        {isTopics
          ? <TopicList onSelect={onTopicSelect} />
          : steps
            ? <ol className="steps-list">{steps.map((s, i) => <li key={i}><InlineText text={s} /></li>)}</ol>
            : <p className="bubble-text"><InlineText text={message.text} /></p>
        }
      </div>
    </div>
  );
}
function TypingRow() {
  return (
    <div className="msg-row msg-assistant">
      <div className="msg-avatar">
        <img src="/bubble-logo.png" alt="SmartOpsSupportHub" />
      </div>
      <div className="msg-body">
        <div className="msg-bubble-assistant loading-bubble">
          <span className="dot" /><span className="dot" /><span className="dot" />
        </div>
      </div>
    </div>
  );
}

function LoginScreen() {
  const [mode, setMode] = useState('login');
  const [email, setEmail] = useState('');
  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');
  const [birthday, setBirthday] = useState('');
  const [address, setAddress] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [otp, setOtp] = useState('');
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [awaitingOtp, setAwaitingOtp] = useState(false);
  const isSignUp = mode === 'signup';

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (!supabase) return;
    if (!email.trim() || !password) {
      setError('Enter your email and password.');
      return;
    }
    if (isSignUp && !fullName.trim()) {
      setError('Enter your full name.');
      return;
    }
    if (isSignUp && !phone.trim()) {
      setError('Enter your phone number.');
      return;
    }
    if (isSignUp && !birthday) {
      setError('Enter your birthday.');
      return;
    }
    if (isSignUp && !address.trim()) {
      setError('Enter your address.');
      return;
    }
    if (isSignUp && password.length < 8) {
      setError('Use a password with at least 8 characters.');
      return;
    }
    if (isSignUp && password !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }

    setError('');
    setNotice('');
    setIsSubmitting(true);
    if (isSignUp) {
      const { data, error: signUpError } = await supabase.auth.signUp({
        email: email.trim(),
        password,
        options: {
          emailRedirectTo: window.location.origin,
          data: {
            full_name: fullName.trim(),
            phone: phone.trim(),
            birthday,
            address: address.trim(),
          },
        },
      });
      if (signUpError) {
        setError(signUpError.message);
      } else if (!data.session) {
        setAwaitingOtp(true);
        setNotice('We sent a verification code to your email.');
        setPassword('');
        setConfirmPassword('');
      }
    } else {
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password,
      });
      if (signInError) setError(signInError.message);
    }
    setIsSubmitting(false);
  };

  const switchMode = () => {
    setMode(isSignUp ? 'login' : 'signup');
    setError('');
    setNotice('');
    setPassword('');
    setConfirmPassword('');
    setFullName('');
    setPhone('');
    setBirthday('');
    setAddress('');
    setOtp('');
    setAwaitingOtp(false);
  };

  const verifyEmailOtp = async (event) => {
    event.preventDefault();
    const trimmedOtp = otp.trim();
    if (!supabase || !trimmedOtp) {
      setError('Enter the 6-digit verification code from your email.');
      return;
    }
    if (!new RegExp(`^\\d{${OTP_LENGTH}}$`).test(trimmedOtp)) {
      setError('The verification code must contain exactly 6 digits.');
      return;
    }

    setError('');
    setIsSubmitting(true);
    const { error: verifyError } = await supabase.auth.verifyOtp({
      email: email.trim(),
      token: trimmedOtp,
      type: 'signup',
    });
    if (verifyError) {
      setError(verifyError.message);
    } else {
      setAwaitingOtp(false);
      setNotice('Email verified. You can now sign in.');
      setMode('login');
      setPassword('');
      setOtp('');
    }
    setIsSubmitting(false);
  };

  const resendEmailOtp = async () => {
    if (!supabase || !email.trim()) return;
    setError('');
    setNotice('');
    setIsSubmitting(true);
    const { error: resendError } = await supabase.auth.resend({
      type: 'signup',
      email: email.trim(),
    });
    if (resendError) {
      setError(resendError.message);
    } else {
      setNotice('A new verification code was sent.');
    }
    setIsSubmitting(false);
  };

  return (
    <main className="login-page">
      <section className="login-card" aria-labelledby="login-title">
        <img className="login-logo" src="/bubble-logo.png" alt="SmartOpsSupportHub" />
        <p className="login-eyebrow">WORKPLACE SUPPORT</p>
        <h1 id="login-title">{isSignUp ? 'Create your account' : 'Welcome back'}</h1>
        <p className="login-subtitle">
          {isSignUp
            ? 'Create an account to start using SmartOpsSupportHub.'
            : 'Sign in to access SmartOpsSupportHub.'}
        </p>

        {!isSupabaseConfigured ? (
          <p className="login-error" role="alert">
            Supabase is not configured. Add the VITE_SUPABASE_URL and
            VITE_SUPABASE_ANON_KEY environment variables.
          </p>
        ) : awaitingOtp ? (
          <form className="login-form" onSubmit={verifyEmailOtp}>
            <label htmlFor="login-otp">6-digit email verification code</label>
            <input
              id="login-otp"
              type="text"
              value={otp}
              onChange={event => setOtp(event.target.value.replace(/\D/g, '').slice(0, OTP_LENGTH))}
              inputMode="numeric"
              autoComplete="one-time-code"
              pattern={`\\d{${OTP_LENGTH}}`}
              minLength={OTP_LENGTH}
              maxLength={OTP_LENGTH}
              required
              placeholder="Enter 6 digits"
              autoFocus
            />
            {error && <p className="login-error" role="alert">{error}</p>}
            <button className="login-submit" type="submit" disabled={isSubmitting}>
              {isSubmitting ? 'Verifying…' : 'Verify email'}
            </button>
            <p className="login-switch">
              Didn’t receive it?{' '}
              <button type="button" onClick={resendEmailOtp} disabled={isSubmitting}>
                Resend code
              </button>{' '}
              or{' '}
              <button type="button" onClick={() => setAwaitingOtp(false)}>
                Back to sign up
              </button>
            </p>
          </form>
        ) : (
          <form className="login-form" onSubmit={handleSubmit}>
            {isSignUp && (
              <>
                <label htmlFor="login-full-name">Full name</label>
                <input
                  id="login-full-name"
                  type="text"
                  value={fullName}
                  onChange={event => setFullName(event.target.value)}
                  autoComplete="name"
                  placeholder="Your full name"
                  autoFocus
                />
                <label htmlFor="login-phone">Phone number</label>
                <input
                  id="login-phone"
                  type="text"
                  value={phone}
                  onChange={event => setPhone(event.target.value)}
                  inputMode="tel"
                  autoComplete="tel"
                  spellCheck="false"
                  placeholder="+1 555 123 4567"
                />
                <label htmlFor="login-birthday">Birthday</label>
                <input
                  id="login-birthday"
                  type="date"
                  value={birthday}
                  onChange={event => setBirthday(event.target.value)}
                  autoComplete="bday"
                />
                <label htmlFor="login-address">Address</label>
                <textarea
                  id="login-address"
                  value={address}
                  onChange={event => setAddress(event.target.value)}
                  autoComplete="street-address"
                  placeholder="Your address"
                  rows="3"
                />
              </>
            )}
            <label htmlFor="login-email">Work email</label>
            <input
              id="login-email"
              type="email"
              value={email}
              onChange={event => setEmail(event.target.value)}
              autoComplete="email"
              placeholder="you@company.com"
              autoFocus={!isSignUp}
            />
            <label htmlFor="login-password">Password</label>
            <input
              id="login-password"
              type="password"
              value={password}
              onChange={event => setPassword(event.target.value)}
              autoComplete={isSignUp ? 'new-password' : 'current-password'}
              placeholder="Enter your password"
            />
            {isSignUp && (
              <>
                <label htmlFor="login-confirm-password">Confirm password</label>
                <input
                  id="login-confirm-password"
                  type="password"
                  value={confirmPassword}
                  onChange={event => setConfirmPassword(event.target.value)}
                  autoComplete="new-password"
                  placeholder="Re-enter your password"
                />
                <p className="login-field-hint">Use at least 8 characters.</p>
              </>
            )}
            {error && <p className="login-error" role="alert">{error}</p>}
            {notice && <p className="login-notice" role="status">{notice}</p>}
            <button className="login-submit" type="submit" disabled={isSubmitting}>
              {isSubmitting ? 'Please wait…' : isSignUp ? 'Create account' : 'Sign in'}
            </button>
            <p className="login-switch">
              {isSignUp ? 'Already have an account?' : 'Need an account?'}{' '}
              <button type="button" onClick={switchMode}>
                {isSignUp ? 'Sign in' : 'Create one'}
              </button>
            </p>
          </form>
        )}
      </section>
    </main>
  );
}

function AccountMenu({ profile, email, onLogout }) {
  const [isOpen, setIsOpen] = useState(false);
  const displayName = profile?.full_name || email?.split('@')[0] || 'Account';
  const initials = displayName
    .split(/\s+/)
    .map(part => part[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();

  return (
    <div className="account-menu">
      <button
        className="account-button"
        type="button"
        onClick={() => setIsOpen(open => !open)}
        aria-expanded={isOpen}
        aria-haspopup="menu"
      >
        <span className="account-avatar">{initials}</span>
        <span className="account-button-name">{displayName}</span>
        <span className="account-chevron" aria-hidden="true">⌄</span>
      </button>
      {isOpen && (
        <div className="account-dropdown" role="menu">
          <div className="account-dropdown-header">
            <span className="account-avatar account-avatar-large">{initials}</span>
            <div>
              <strong>{displayName}</strong>
              <span>{email}</span>
            </div>
          </div>
          <div className="account-profile-row">
            <span>Profile</span>
            <span>{profile?.role || 'Support agent'}</span>
          </div>
          <div className="account-profile-row">
            <span>Phone</span>
            <span>{profile?.phone_number || 'Not provided'}</span>
          </div>
          <div className="account-profile-row">
            <span>Birthday</span>
            <span>{profile?.birthday || 'Not provided'}</span>
          </div>
          <div className="account-profile-row">
            <span>Address</span>
            <span>{profile?.address || 'Not provided'}</span>
          </div>
          <button className="account-signout" type="button" onClick={onLogout} role="menuitem">
            Sign out
          </button>
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main App
// ---------------------------------------------------------------------------
export default function App() {
  const [session, setSession] = useState(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [profile, setProfile] = useState(null);
  const [messages,   setMessages]   = useState([]);
  const [sideMessages, setSideMessages] = useState([]);
  const [sideInput,  setSideInput]  = useState('');
  const [sideLoading, setSideLoading] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [input,      setInput]      = useState('');
  const [status,     setStatus]     = useState('Online');
  const [isLoading,  setIsLoading]  = useState(false);
  const [chatMode,   setChatMode]   = useState(false);
  const [darkMode,   setDarkMode]   = useState(() => {
    try {
      const s = localStorage.getItem('smartops-dark');
      if (s !== null) return s === 'true';
    } catch { /**/ }
    return window.matchMedia('(prefers-color-scheme: dark)').matches;
  });

  const chatEndRef  = useRef(null);
  const sideEndRef  = useRef(null);
  const inputRef    = useRef(null);
  const sideInputRef = useRef(null);
  const isOffline   = useRef(false);

  useEffect(() => {
    if (!supabase) {
      setAuthLoading(false);
      return undefined;
    }

    let active = true;
    supabase.auth.getSession().then(({ data: { session: currentSession } }) => {
      if (active) {
        setSession(currentSession);
        setAuthLoading(false);
      }
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (_event, nextSession) => setSession(nextSession)
    );
    return () => {
      active = false;
      subscription.unsubscribe();
    };
  }, []);

  useEffect(() => {
    if (!supabase || !session?.user) {
      setProfile(null);
      return undefined;
    }

    let active = true;
    supabase
      .from('profiles')
      .select('full_name, email, phone_number, birthday, address, role, avatar_url')
      .eq('id', session.user.id)
      .maybeSingle()
      .then(({ data }) => {
        if (active) setProfile(data);
      });

    return () => { active = false; };
  }, [session]);

  const handleLogout = useCallback(async () => {
    if (supabase) await supabase.auth.signOut();
    setMessages([]);
    setSideMessages([]);
    setChatMode(false);
    setSidebarOpen(false);
  }, []);

  const authHeaders = useCallback(() => (
    session?.access_token
      ? { Authorization: `Bearer ${session.access_token}` }
      : {}
  ), [session]);

  useEffect(() => {
    document.documentElement.classList.toggle('dark', darkMode);
    try { localStorage.setItem('smartops-dark', String(darkMode)); } catch { /**/ }
  }, [darkMode]);

  // Health poll when offline
  useEffect(() => {
    let timer = null;
    const probe = async () => {
      if (!isOffline.current) return;
      try {
        const res = await fetch(`${BACKEND_URL}/api/health`, { signal: AbortSignal.timeout(3000) });
        if (res.ok) { isOffline.current = false; setStatus('Online'); }
      } catch { /**/ }
      finally { if (isOffline.current) timer = setTimeout(probe, HEALTH_POLL_MS); }
    };
    if (status === 'Offline') timer = setTimeout(probe, HEALTH_POLL_MS);
    return () => clearTimeout(timer);
  }, [status]);

  // Auto-scroll on new messages
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isLoading]);

  // Auto-scroll sidebar
  useEffect(() => {
    sideEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [sideMessages, sideLoading]);

  // Focus side input when sidebar opens
  useEffect(() => {
    if (sidebarOpen) setTimeout(() => sideInputRef.current?.focus(), 150);
  }, [sidebarOpen]);

  // Focus input when switching to chat mode
  useEffect(() => {
    if (chatMode) inputRef.current?.focus();
  }, [chatMode]);

  const sendMessage = useCallback(async (text) => {
    const trimmed = (text || '').trim();
    if (!trimmed || isLoading) return;

    // Switch to chat view on first message
    if (!chatMode) setChatMode(true);

    const userMsg = {
      id: Date.now(), sender: 'user',
      text: trimmed, feedback: null, source: null,
    };
    setMessages(prev => [...prev, userMsg]);
    setInput('');
    setIsLoading(true);

    // Offline fast path
    if (isOffline.current) {
      const { answer, matched } = searchFaq(trimmed);
      setMessages(prev => [...prev, {
        id: Date.now() + 1, sender: 'assistant',
        text: matched ? answer : '', feedback: null,
        source: matched ? 'offline-cache' : 'offline-topics',
        userText: trimmed,
      }]);
      setIsLoading(false);
      return;
    }

    // Online path
    try {
      const ctrl = new AbortController();
      const tid  = setTimeout(() => ctrl.abort(), FETCH_TIMEOUT_MS);
      const res  = await fetch(`${BACKEND_URL}/api/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...authHeaders() },
        body: JSON.stringify({ message: trimmed }),
        signal: ctrl.signal,
      });
      clearTimeout(tid);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      isOffline.current = false;
      setMessages(prev => [...prev, {
        id: Date.now() + 1, sender: 'assistant',
        text: data.reply || 'The system responded but returned no guidance.',
        feedback: null, source: data.source || 'rag',
        latency_ms: data.latency_ms, userText: trimmed,
      }]);
      setStatus(data.source === 'rag' ? 'Online' : 'Offline');
    } catch {
      isOffline.current = true;
      setStatus('Offline');
      const { answer, matched } = searchFaq(trimmed);
      setMessages(prev => [...prev, {
        id: Date.now() + 1, sender: 'assistant',
        text: matched ? answer : '', feedback: null,
        source: matched ? 'offline-cache' : 'offline-topics',
        userText: trimmed,
      }]);
    } finally {
      setIsLoading(false);
    }
  }, [isLoading, chatMode]);

  const handleSubmit      = e => { e.preventDefault(); sendMessage(input); };
  const handleRetry       = useCallback(t => { if (t) sendMessage(t); }, [sendMessage]);
  const handleTopicSelect = useCallback(l => sendMessage(l), [sendMessage]);

  // ── Sidebar send ──
  const sendSideMessage = useCallback(async (text) => {
    const trimmed = (text || '').trim();
    if (!trimmed || sideLoading) return;

    const userMsg = { id: Date.now(), sender: 'user', text: trimmed, source: null };
    setSideMessages(prev => [...prev, userMsg]);
    setSideInput('');
    setSideLoading(true);

    if (isOffline.current) {
      const { answer, matched } = searchFaq(trimmed);
      setSideMessages(prev => [...prev, {
        id: Date.now() + 1, sender: 'assistant',
        text: matched ? answer : '', source: matched ? 'offline-cache' : 'offline-topics',
        userText: trimmed,
      }]);
      setSideLoading(false);
      return;
    }

    try {
      const ctrl = new AbortController();
      const tid  = setTimeout(() => ctrl.abort(), FETCH_TIMEOUT_MS);
      const res  = await fetch(`${BACKEND_URL}/api/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...authHeaders() },
        body: JSON.stringify({ message: trimmed }),
        signal: ctrl.signal,
      });
      clearTimeout(tid);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      setSideMessages(prev => [...prev, {
        id: Date.now() + 1, sender: 'assistant',
        text: data.reply || 'No guidance returned.',
        source: data.source || 'rag', userText: trimmed,
      }]);
    } catch {
      const { answer, matched } = searchFaq(trimmed);
      setSideMessages(prev => [...prev, {
        id: Date.now() + 1, sender: 'assistant',
        text: matched ? answer : '', source: matched ? 'offline-cache' : 'offline-topics',
        userText: trimmed,
      }]);
    } finally {
      setSideLoading(false);
    }
  }, [sideLoading]);

  const handleFeedback = useCallback(async (messageId, rating) => {
    setMessages(prev => prev.map(m => m.id === messageId ? { ...m, feedback: rating } : m));
    const msg  = messages.find(m => m.id === messageId);
    const idx  = messages.findIndex(m => m.id === messageId);
    const user = messages.slice(0, idx).reverse().find(m => m.sender === 'user');
    if (!msg) return;
    try {
      await fetch(`${BACKEND_URL}/api/feedback`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...authHeaders() },
        body: JSON.stringify({ message: user?.text || '', reply: msg.text, rating: rating === 'up' ? 1 : 2 }),
      });
    } catch { /**/ }
  }, [authHeaders, messages]);

  // ── New chat ──
  const newChat = () => {
    setMessages([]);
    setChatMode(false);
    setInput('');
    setTimeout(() => inputRef.current?.focus(), 50);
  };

  if (authLoading) {
    return <main className="login-page"><p className="login-loading">Loading…</p></main>;
  }

  if (!session) return <LoginScreen />;

  return (
    <div className="app-shell">

      {/* ── Floating bubble button ── */}
      <button
        className={`floating-bubble ${sidebarOpen ? 'bubble-hidden' : ''}`}
        onClick={() => setSidebarOpen(true)}
        aria-label="Open assistant"
        title="Open SmartOpsSupportHub assistant"
      >
        <img src="/bubble-logo.png" alt="" className="bubble-img" />
      </button>

      {/* ── Sidebar backdrop ── */}
      {sidebarOpen && (
        <div className="sidebar-backdrop" onClick={() => setSidebarOpen(false)} aria-hidden="true" />
      )}

      {/* ── Sidebar panel ── */}
      <aside className={`sidebar-panel ${sidebarOpen ? 'sidebar-open' : 'sidebar-closed'}`}>
        <div className="sidebar-header">
          <div className="sidebar-header-left">
            <img src="/bubble-logo.png" alt="SmartOpsSupportHub" className="sidebar-avatar" />
            <div>
              <p className="sidebar-title">SmartOpsSupportHub</p>
              <span className={`status-pill ${status === 'Offline' ? 'offline' : 'online'}`}>{status}</span>
            </div>
          </div>
          <button className="sidebar-close-btn" onClick={() => setSidebarOpen(false)} aria-label="Close">✕</button>
        </div>

        <div className="sidebar-messages">
          {sideMessages.length === 0 && (
            <div className="sidebar-empty">
              <p>👋 Hi! Ask me anything about workplace procedures.</p>
            </div>
          )}
          {sideMessages.map(msg => (
            <SideMessage key={msg.id} message={msg}
              onTopicSelect={t => sendSideMessage(t)} />
          ))}
          {sideLoading && (
            <div className="side-msg-row side-msg-assistant">
              <div className="side-bubble-assistant loading-bubble">
                <span className="dot" /><span className="dot" /><span className="dot" />
              </div>
            </div>
          )}
          <div ref={sideEndRef} />
        </div>

        <form className="sidebar-composer"
          onSubmit={e => { e.preventDefault(); sendSideMessage(sideInput); }}>
          <input
            ref={sideInputRef}
            type="text"
            value={sideInput}
            onChange={e => setSideInput(e.target.value)}
            placeholder="Ask a question…"
            disabled={sideLoading}
            aria-label="Sidebar message"
          />
          <button type="submit" disabled={sideLoading || !sideInput.trim()} aria-label="Send">
            {sideLoading ? '…' : '↑'}
          </button>
        </form>
      </aside>

      {/* ── Topbar ── */}
      <header className="topbar">
        <div className="topbar-left">
          <img src="/bubble-logo.png" alt="SmartOpsSupportHub" className="topbar-logo-img" />
          <span className="topbar-name">SmartOpsSupportHub</span>
        </div>
        <div className="topbar-right">
          {chatMode && (
            <button className="topbar-btn new-chat-btn" onClick={newChat} title="New chat">
              ✏️ New chat
            </button>
          )}
          <span className={`status-pill ${status === 'Offline' ? 'offline' : 'online'}`}>
            {status}
          </span>
          <button className="topbar-icon-btn" onClick={() => setDarkMode(d => !d)} aria-label="Toggle dark mode">
            {darkMode ? '☀️' : '🌙'}
          </button>
          <AccountMenu
            profile={profile}
            email={session.user.email}
            onLogout={handleLogout}
          />
        </div>
      </header>

      {/* ── Main ── */}
      <main className="chat-main">

        {/* HOME SCREEN */}
        {!chatMode && (
          <div className="home-screen">
            <div className="home-greeting">
              <h1 className="greeting-title">How can I help you?</h1>
              <p className="greeting-sub">
                Ask about SOPs, troubleshooting, or any workplace procedure.
              </p>
            </div>

            <form className="composer-wrap" onSubmit={handleSubmit}>
              <div className="composer-box">
                <input
                  ref={inputRef}
                  type="text"
                  className="composer-input"
                  value={input}
                  onChange={e => setInput(e.target.value)}
                  placeholder="Ask me anything…"
                  aria-label="Question"
                  disabled={isLoading}
                  autoFocus
                />
                <button type="submit" className="composer-send"
                  disabled={isLoading || !input.trim()} aria-label="Send">
                  ↑
                </button>
              </div>
              <p className="composer-hint">
                39 offline protocols · Powered by Gemini 2.5 Flash
              </p>
            </form>

            {/* Suggestion chips */}
            <div className="suggestions-grid">
              {SUGGESTIONS.map(s => (
                <button key={s.query} className="suggestion-chip"
                  onClick={() => sendMessage(s.query)}>
                  <span className="chip-icon">{s.icon}</span>
                  <span className="chip-label">{s.label}</span>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* CHAT SCREEN */}
        {chatMode && (
          <div className="messages-area">
            {messages.map(msg => (
              <MessageRow key={msg.id} message={msg}
                onFeedback={handleFeedback}
                onRetry={handleRetry}
                onTopicSelect={handleTopicSelect}
              />
            ))}
            {isLoading && <TypingRow />}
            <div ref={chatEndRef} />
          </div>
        )}
      </main>

      {/* ── Pinned composer (chat mode only) ── */}
      {chatMode && (
        <div className="composer-footer">
          <form className="composer-wrap" onSubmit={handleSubmit}>
            <div className="composer-box">
              <input
                ref={inputRef}
                type="text"
                className="composer-input"
                value={input}
                onChange={e => setInput(e.target.value)}
                placeholder="Ask a follow-up…"
                aria-label="Message"
                disabled={isLoading}
              />
              <button type="submit" className="composer-send"
                disabled={isLoading || !input.trim()} aria-label="Send">
                {isLoading ? '…' : '↑'}
              </button>
            </div>
            <p className="composer-hint">
              SmartOpsSupportHub can make mistakes. Verify critical procedures.
            </p>
          </form>
        </div>
      )}

    </div>
  );
}
