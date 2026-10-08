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
import { isSupabaseConfigured, setRememberMe, supabase } from './supabaseClient.js';

const BACKEND_URL      = import.meta.env.VITE_BACKEND_URL || 'https://assistflow-backend-ctbq.onrender.com';
const FETCH_TIMEOUT_MS = 15000;
const HEALTH_POLL_MS   = 30000;
const PROMPT_HISTORY_LIMIT = 50;
const INACTIVITY_TIMEOUT_MS = 60 * 1000;
const MINIMUM_AGE = 18;

const SUGGESTIONS = [
  { icon: '🔑', label: 'CRM password reset',   query: 'How do I reset my CRM password?' },
  { icon: '📞', label: 'Call quality issues',   query: 'Call quality issues on my headset' },
  { icon: '📋', label: 'Escalate a ticket',     query: 'How do I escalate a ticket?' },
  { icon: '🆔', label: 'Identity verification', query: 'Customer identity verification steps' },
  { icon: '🌐', label: 'VPN not connecting',    query: 'VPN disconnected, how do I reconnect?' },
  { icon: '⚡', label: 'System running slow',   query: 'My system is running slow' },
];

function getConversationTurns(messages) {
  return messages
    .filter(message => (
      (message.sender === 'user' || message.sender === 'assistant') &&
      message.text?.trim()
    ))
    .slice(-12)
    .map(message => ({
      role: message.sender,
      content: message.text.slice(0, 1200),
    }));
}

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

function isValidEmail(value) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/i.test(value.trim());
}

function isValidFullName(value) {
  return /^\p{L}+(?:[ '\u2019-]\p{L}+)*$/u.test(value.trim());
}

function isValidPhilippineMobile(value) {
  return /^(?:09\d{9}|\+639\d{9})$/.test(value.trim());
}

function getMaximumBirthDate() {
  const date = new Date();
  date.setFullYear(date.getFullYear() - MINIMUM_AGE);
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${date.getFullYear()}-${month}-${day}`;
}

function isAtLeastMinimumAge(value) {
  if (!value) return false;
  const birthday = new Date(`${value}T00:00:00`);
  if (Number.isNaN(birthday.getTime())) return false;
  const today = new Date();
  const minimumDate = new Date(today.getFullYear() - MINIMUM_AGE, today.getMonth(), today.getDate());
  return birthday <= minimumDate;
}

function getPasswordChecks(value) {
  return {
    length: value.length >= 8 && value.length <= 16,
    uppercase: /[A-Z]/.test(value),
    lowercase: /[a-z]/.test(value),
    number: /\d/.test(value),
    special: /[^A-Za-z\d]/.test(value),
  };
}

function isValidPassword(value) {
  return Object.values(getPasswordChecks(value)).every(Boolean);
}

function getPasswordStrength(value) {
  const score = Object.values(getPasswordChecks(value)).filter(Boolean).length;
  if (score === 5) return 'strong';
  if (score >= 3) return 'average';
  return 'weak';
}

function PasswordField({ id, label, value, onChange, autoComplete, placeholder, onPaste }) {
  const [visible, setVisible] = useState(false);
  return (
    <>
      <label htmlFor={id}>{label}</label>
      <div className="password-field">
        <input
          id={id}
          type={visible ? 'text' : 'password'}
          value={value}
          onChange={onChange}
          autoComplete={autoComplete}
          placeholder={placeholder}
          onPaste={onPaste}
        />
        <button
          className="password-visibility"
          type="button"
          onClick={() => setVisible(current => !current)}
          aria-label={visible ? `Hide ${label.toLowerCase()}` : `Show ${label.toLowerCase()}`}
          title={visible ? 'Hide password' : 'Show password'}
        >
          {visible ? '◉' : '◌'}
        </button>
      </div>
    </>
  );
}

function PasswordRequirements({ password }) {
  const checks = getPasswordChecks(password);
  const items = [
    ['length', '8–16 characters'],
    ['uppercase', 'Uppercase letter'],
    ['lowercase', 'Lowercase letter'],
    ['number', 'Number'],
    ['special', 'Special character'],
  ];
  return (
    <div className={`password-requirements password-strength-${getPasswordStrength(password)}`}>
      <div className="password-strength-bar" aria-label={`Password strength: ${getPasswordStrength(password)}`} />
      <span className="password-strength-label">
        {password ? `Strength: ${getPasswordStrength(password)}` : 'Password requirements'}
      </span>
      <ul>
        {items.map(([key, label]) => (
          <li key={key} className={checks[key] ? 'requirement-met' : 'requirement-missing'}>
            <span aria-hidden="true">{checks[key] ? '✓' : '✕'}</span> {label}
          </li>
        ))}
      </ul>
    </div>
  );
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
  'rag':           { label: 'AI · SOP',        cls: 'source-rag'     },
  'offline-cache': { label: 'Offline cache',    cls: 'source-offline' },
  'fallback':      { label: 'No connection',    cls: 'source-fallback'},
  'scope':         { label: 'Supported topics', cls: 'source-rag'     },
  'general':       { label: 'General guidance', cls: 'source-rag'     },
  'help':          { label: 'Assistant',     cls: 'source-rag'     },
};

function SourceBadge({ source }) {
  if (!source) return null;
  const { label, cls } = SOURCE_LABELS[source] || { label: source, cls: 'source-rag' };
  return <span className={`source-badge ${cls}`}>{label}</span>;
}

// ---------------------------------------------------------------------------
// Message row — ChatGPT style: user right, assistant left with avatar
// ---------------------------------------------------------------------------
function MessageRow({ message, selected, onFeedback, onRetry, onTopicSelect }) {
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
    <div
      className={`msg-row msg-assistant ${selected ? 'msg-row-selected' : ''}`}
      id={message.historyId ? `history-${message.historyId}` : undefined}
    >
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
  const [accessType, setAccessType] = useState('User');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [rememberMe, setRememberMePreference] = useState(true);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const isSignUp = mode === 'signup';
  const isForgotPassword = mode === 'forgot';
  const maximumBirthDate = getMaximumBirthDate();

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (!supabase) return;
    const trimmedEmail = email.trim();

    if (!isValidEmail(trimmedEmail)) {
      setError('Enter a valid email address, including a domain such as name@example.com.');
      return;
    }
    if (isForgotPassword) {
      setError('');
      setNotice('');
      setIsSubmitting(true);
      const { error: resetError } = await supabase.auth.resetPasswordForEmail(trimmedEmail, {
        redirectTo: window.location.origin,
      });
      if (resetError) {
        setError(resetError.message);
      } else {
        setNotice('If an account exists for this email, a password reset link has been sent.');
      }
      setIsSubmitting(false);
      return;
    }

    if (!password) {
      setError('Enter your password.');
      return;
    }

    if (isSignUp && !fullName.trim()) {
      setError('Enter your full name.');
      return;
    }
    if (isSignUp && !isValidFullName(fullName)) {
      setError('Full Name may contain letters, spaces, hyphens, and apostrophes only.');
      return;
    }
    if (isSignUp && !phone.trim()) {
      setError('Enter your phone number.');
      return;
    }
    if (isSignUp && !isValidPhilippineMobile(phone)) {
      setError('Enter a valid Philippine mobile number: 09XXXXXXXXX or +639XXXXXXXXX.');
      return;
    }
    if (isSignUp && !birthday) {
      setError('Enter your birthday.');
      return;
    }
    if (isSignUp && !isAtLeastMinimumAge(birthday)) {
      setError('You must be at least 18 years old to create an account.');
      return;
    }
    if (isSignUp && !address.trim()) {
      setError('Enter your address.');
      return;
    }
    if (isSignUp && !isValidPassword(password)) {
      setError('Password must be 8–16 characters and include uppercase, lowercase, number, and special character.');
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
        email: trimmedEmail,
        password,
        options: {
          emailRedirectTo: window.location.origin,
          data: {
            full_name: fullName.trim(),
            phone: phone.trim(),
            birthday,
            address: address.trim(),
            access_type: accessType,
          },
        },
      });
      if (signUpError) {
        const message = signUpError.message?.toLowerCase() || '';
        setError(
          message.includes('already') || message.includes('registered')
            ? 'Email already registered. Please use a different email address or reset your password.'
            : signUpError.message
        );
      } else if (data.user?.identities?.length === 0) {
        setError('Email already registered. Please use a different email address or reset your password.');
      } else if (!data.session) {
        setNotice('Account created. Check your email and click the confirmation link to finish signing in.');
        setPassword('');
        setConfirmPassword('');
      } else {
        setNotice('Account created successfully. You are signed in.');
        setPassword('');
        setConfirmPassword('');
      }
    } else {
      setRememberMe(rememberMe);
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email: trimmedEmail,
        password,
      });
      if (signInError) {
        setError(
          signInError.message?.toLowerCase().includes('email not confirmed')
            ? 'Please verify your email before signing in.'
            : 'Invalid email or password.'
        );
      }
    }
    setIsSubmitting(false);
  };

  const switchMode = () => {
    setMode('login');
    setError('');
    setNotice('');
    setPassword('');
    setConfirmPassword('');
    setFullName('');
    setPhone('');
    setBirthday('');
    setAddress('');
    setAccessType('User');
  };

  const switchTo = nextMode => {
    setMode(nextMode);
    setError('');
    setNotice('');
    setPassword('');
    setConfirmPassword('');
  };

  const sendMagicLink = async () => {
    const trimmedEmail = email.trim();
    if (!isValidEmail(trimmedEmail)) {
      setError('Enter a valid email address before requesting a magic link.');
      return;
    }
    setError('');
    setNotice('');
    setIsSubmitting(true);
    const { error: magicLinkError } = await supabase.auth.signInWithOtp({
      email: trimmedEmail,
      options: {
        emailRedirectTo: window.location.origin,
        shouldCreateUser: false,
      },
    });
    if (magicLinkError) {
      setError(magicLinkError.message);
    } else {
      setNotice('If an account exists for this email, a magic link has been sent.');
    }
    setIsSubmitting(false);
  };

  return (
    <main className="login-page">
      <section className="login-card" aria-labelledby="login-title">
        <img className="login-logo" src="/bubble-logo.png" alt="SmartOpsSupportHub" />
        <p className="login-eyebrow">WORKPLACE SUPPORT</p>
        <h1 id="login-title">
          {isSignUp ? 'Create your account' : isForgotPassword ? 'Reset your password' : 'Welcome back'}
        </h1>
        <p className="login-subtitle">
          {isSignUp
            ? 'Complete every field to create a secure account.'
            : isForgotPassword
              ? 'Enter your registered email to receive a secure reset link.'
              : 'Sign in to access SmartOpsSupportHub.'}
        </p>

        {!isSupabaseConfigured ? (
          <p className="login-error" role="alert">
            Supabase is not configured. Add the VITE_SUPABASE_URL and
            VITE_SUPABASE_ANON_KEY environment variables.
          </p>
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
                {fullName && !isValidFullName(fullName) && (
                  <p className="login-field-warning" role="alert">
                    Use letters, spaces, hyphens, or apostrophes only.
                  </p>
                )}
                <label htmlFor="login-phone">Phone number</label>
                <input
                  id="login-phone"
                  type="text"
                  value={phone}
                  onChange={event => setPhone(event.target.value)}
                  inputMode="tel"
                  autoComplete="tel"
                  spellCheck="false"
                  placeholder="09171234567 or +639171234567"
                />
                {phone && !isValidPhilippineMobile(phone) && (
                  <p className="login-field-warning" role="alert">
                    Use 09XXXXXXXXX or +639XXXXXXXXX.
                  </p>
                )}
                <label htmlFor="login-birthday">Birthday</label>
                <input
                  id="login-birthday"
                  type="date"
                  value={birthday}
                  onChange={event => setBirthday(event.target.value)}
                  autoComplete="bday"
                  max={maximumBirthDate}
                />
                <p className="login-field-hint">You must be at least 18 years old.</p>
                <label htmlFor="login-address">Address</label>
                <textarea
                  id="login-address"
                  value={address}
                  onChange={event => setAddress(event.target.value)}
                  autoComplete="street-address"
                  placeholder="Your address"
                  rows="3"
                />
                <label htmlFor="login-access-type">Access type</label>
                <select
                  id="login-access-type"
                  value={accessType}
                  onChange={event => setAccessType(event.target.value)}
                >
                  <option value="Super Admin">Super Admin</option>
                  <option value="Admin">Admin</option>
                  <option value="User">User</option>
                </select>
              </>
            )}
            <label htmlFor="login-email">{isSignUp ? 'Username / email address' : 'Username / email address'}</label>
            <input
              id="login-email"
              type="email"
              value={email}
              onChange={event => setEmail(event.target.value)}
              autoComplete="email"
              placeholder="you@company.com"
              autoFocus={!isSignUp}
            />
            {!isForgotPassword && (
              <>
                <PasswordField
                  id="login-password"
                  label="Password"
                  value={password}
                  onChange={event => setPassword(event.target.value)}
                  autoComplete={isSignUp ? 'new-password' : 'current-password'}
                  placeholder="Enter your password"
                />
                {isSignUp && <PasswordRequirements password={password} />}
                {isSignUp && (
                  <>
                    <PasswordField
                      id="login-confirm-password"
                      label="Confirm password"
                      value={confirmPassword}
                      onChange={event => setConfirmPassword(event.target.value)}
                      autoComplete="new-password"
                      placeholder="Re-enter your password"
                      onPaste={event => event.preventDefault()}
                    />
                    {confirmPassword && confirmPassword !== password && (
                      <p className="login-field-warning" role="alert">Passwords do not match.</p>
                    )}
                    <p className="login-field-hint">For security, confirmation must be typed manually.</p>
                  </>
                )}
              </>
            )}
            {error && <p className="login-error" role="alert">{error}</p>}
            {notice && <p className="login-notice" role="status">{notice}</p>}
            <button className="login-submit" type="submit" disabled={isSubmitting}>
              {isSubmitting ? 'Please wait…' : isSignUp ? 'Create account' : isForgotPassword ? 'Send reset link' : 'Sign in'}
            </button>
            {!isSignUp && !isForgotPassword && (
              <>
                <label className="remember-me">
                  <input
                    type="checkbox"
                    checked={rememberMe}
                    onChange={event => setRememberMePreference(event.target.checked)}
                  />
                  Remember me
                </label>
                <button
                  className="login-magic-link"
                  type="button"
                  onClick={sendMagicLink}
                  disabled={isSubmitting}
                >
                  Email me a magic link
                </button>
              </>
            )}
            <p className="login-switch">
              {isForgotPassword ? (
                <button type="button" onClick={switchMode}>Back to sign in</button>
              ) : (
                <>
                  {!isSignUp && (
                    <button type="button" onClick={() => switchTo('forgot')}>Forgot password?</button>
                  )}
                  {' '}
                  {isSignUp ? 'Already have an account?' : 'Need an account?'}{' '}
                  <button type="button" onClick={isSignUp ? switchMode : () => switchTo('signup')}>
                    {isSignUp ? 'Sign in' : 'Create one'}
                  </button>
                </>
              )}
            </p>
          </form>
        )}
      </section>
    </main>
  );
}

function PasswordResetScreen({ onComplete }) {
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [completed, setCompleted] = useState(false);

  const handleSubmit = async event => {
    event.preventDefault();
    if (!isValidPassword(password)) {
      setError('Password must be 8–16 characters and include uppercase, lowercase, number, and special character.');
      return;
    }
    if (password !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }
    setError('');
    setIsSubmitting(true);
    const { error: updateError } = await supabase.auth.updateUser({ password });
    if (updateError) {
      setError(updateError.message);
    } else {
      setNotice('Password reset successfully. Please sign in again.');
      setCompleted(true);
      await supabase.auth.signOut();
    }
    setIsSubmitting(false);
  };

  return (
    <main className="login-page">
      <section className="login-card" aria-labelledby="reset-password-title">
        <img className="login-logo" src="/bubble-logo.png" alt="SmartOpsSupportHub" />
        <p className="login-eyebrow">ACCOUNT SECURITY</p>
        <h1 id="reset-password-title">Reset password</h1>
        {completed ? (
          <>
            <p className="login-notice" role="status">{notice}</p>
            <button className="login-submit" type="button" onClick={onComplete}>Return to login</button>
          </>
        ) : (
          <form className="login-form" onSubmit={handleSubmit}>
            <p className="login-subtitle">Choose a new password that has not been used before.</p>
            <PasswordField
              id="reset-password"
              label="New password"
              value={password}
              onChange={event => setPassword(event.target.value)}
              autoComplete="new-password"
              placeholder="Enter a new password"
            />
            <PasswordRequirements password={password} />
            <PasswordField
              id="reset-confirm-password"
              label="Confirm new password"
              value={confirmPassword}
              onChange={event => setConfirmPassword(event.target.value)}
              autoComplete="new-password"
              placeholder="Re-enter the new password"
              onPaste={event => event.preventDefault()}
            />
            {error && <p className="login-error" role="alert">{error}</p>}
            <button className="login-submit" type="submit" disabled={isSubmitting}>
              {isSubmitting ? 'Saving…' : 'Save new password'}
            </button>
          </form>
        )}
      </section>
    </main>
  );
}

function AccountMenu({ profile, email, onLogout, onResetPassword }) {
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
            <span>Access type</span>
            <span>{profile?.role || profile?.access_type || 'User'}</span>
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
          <button className="account-reset" type="button" onClick={onResetPassword} role="menuitem">
            Reset password
          </button>
          <button className="account-signout" type="button" onClick={onLogout} role="menuitem">
            Sign out
          </button>
        </div>
      )}
    </div>
  );
}

function HistoryPanel({ items, isOpen, selectedId, onSelect, onNewChat }) {
  return (
    <aside className={`history-panel ${isOpen ? 'history-open' : 'history-closed'}`}>
      <div className="history-header">
        <div>
          <p className="history-title">Conversation history</p>
          <span className="history-subtitle">Your saved chats</span>
        </div>
        <button
          className="history-new-btn"
          type="button"
          onClick={onNewChat}
          title="Start a new chat"
        >
          +
        </button>
      </div>

      {items.length === 0 ? (
        <div className="history-empty">
          <span className="history-empty-icon">◷</span>
          <p>Your saved prompts will appear here.</p>
        </div>
      ) : (
        <div className="history-list">
          {items.map(item => (
            <button
              key={item.id}
              className={`history-item ${selectedId === item.id ? 'history-item-active' : ''}`}
              type="button"
              onClick={() => onSelect(item.id)}
              title={item.title}
            >
              <span className="history-item-prompt">{item.title}</span>
              <time dateTime={item.createdAt}>{formatHistoryDate(item.createdAt)}</time>
            </button>
          ))}
        </div>
      )}
    </aside>
  );
}

function formatHistoryDate(value) {
  if (!value) return 'Saved prompt';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'Saved prompt';
  return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
}

// ---------------------------------------------------------------------------
// Main App
// ---------------------------------------------------------------------------
export default function App() {
  const [session, setSession] = useState(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [recoveryMode, setRecoveryMode] = useState(false);
  const [profile, setProfile] = useState(null);
  const [messages,   setMessages]   = useState([]);
  const [sideMessages, setSideMessages] = useState([]);
  const [sideInput,  setSideInput]  = useState('');
  const [sideLoading, setSideLoading] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [historyOpen, setHistoryOpen] = useState(true);
  const [conversations, setConversations] = useState([]);
  const [activeConversationId, setActiveConversationId] = useState(null);
  const [selectedHistoryId, setSelectedHistoryId] = useState(null);
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
  const chatRequestVersion = useRef(0);
  const historyLoadVersion = useRef(0);

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
      (event, nextSession) => {
        if (event === 'PASSWORD_RECOVERY') setRecoveryMode(true);
        setSession(nextSession);
      }
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
      .select('full_name, email, phone_number, birthday, address, role, access_type, avatar_url')
      .eq('id', session.user.id)
      .maybeSingle()
      .then(({ data }) => {
        if (active) setProfile(data);
      });

    return () => { active = false; };
  }, [session]);

  useEffect(() => {
    if (!session) return undefined;

    let timeoutId;
    const resetInactivityTimer = () => {
      window.clearTimeout(timeoutId);
      timeoutId = window.setTimeout(() => {
        setRecoveryMode(false);
        supabase?.auth.signOut();
      }, INACTIVITY_TIMEOUT_MS);
    };
    const activityEvents = ['pointerdown', 'keydown', 'mousemove', 'touchstart', 'scroll'];
    activityEvents.forEach(event => window.addEventListener(event, resetInactivityTimer, { passive: true }));
    resetInactivityTimer();

    return () => {
      window.clearTimeout(timeoutId);
      activityEvents.forEach(event => window.removeEventListener(event, resetInactivityTimer));
    };
  }, [session]);

  const promptHistoryRowsToMessages = useCallback((rows) => (
    rows
      .flatMap(row => ([
        {
          id: `${row.id}:user`,
          sender: 'user',
          text: row.prompt,
          feedback: null,
          source: null,
          historyId: row.id,
          createdAt: row.created_at,
        },
        {
          id: `${row.id}:assistant`,
          sender: 'assistant',
          text: row.response,
          feedback: row.rating === 1 ? 'up' : row.rating === 2 ? 'down' : null,
          source: row.source || 'rag',
          latency_ms: row.latency_ms,
          userText: row.prompt,
          historyId: row.id,
          createdAt: row.created_at,
        },
      ]))
  ), []);

  const loadConversation = useCallback(async (conversationId, shouldScroll = false) => {
    const userId = session?.user?.id;
    if (!supabase || !userId || !conversationId) return;
    const loadVersion = ++historyLoadVersion.current;

    const { data, error } = await supabase
      .from('prompt_history')
      .select('id, prompt, response, source, latency_ms, channel, rating, created_at')
      .eq('user_id', userId)
      .eq('conversation_id', conversationId)
      .eq('channel', 'main')
      .order('created_at', { ascending: true });

    if (error) {
      console.error('Unable to load conversation:', error);
      return;
    }
    if (
      loadVersion !== historyLoadVersion.current
      || session?.user?.id !== userId
    ) {
      return;
    }

    setMessages(promptHistoryRowsToMessages(data || []));
    setActiveConversationId(conversationId);
    setSelectedHistoryId(conversationId);
    setChatMode((data || []).length > 0);

    if (shouldScroll) {
      requestAnimationFrame(() => chatEndRef.current?.scrollIntoView({ behavior: 'smooth' }));
    }
  }, [promptHistoryRowsToMessages, session?.user?.id]);

  // Clear the previous user's chat immediately on account changes and
  // invalidate any history request that is still in flight.
  useEffect(() => {
    historyLoadVersion.current += 1;
    chatRequestVersion.current += 1;
    setMessages([]);
    setSideMessages([]);
    setChatMode(false);
    setConversations([]);
    setActiveConversationId(null);
    setSelectedHistoryId(null);
  }, [session?.user?.id]);

  // Restore this user's conversation list and most recent conversation.
  useEffect(() => {
    const userId = session?.user?.id;
    if (!supabase || !userId) {
      setMessages([]);
      setSideMessages([]);
      setChatMode(false);
      setConversations([]);
      setActiveConversationId(null);
      setSelectedHistoryId(null);
      return undefined;
    }

    let active = true;
    supabase
      .from('prompt_conversations')
      .select('id, title, channel, created_at, updated_at')
      .eq('user_id', userId)
      .eq('channel', 'main')
      .order('updated_at', { ascending: false })
      .limit(PROMPT_HISTORY_LIMIT)
      .then(async ({ data, error }) => {
        if (!active) return;
        if (error) {
          console.error('Unable to load conversation history:', error);
          return;
        }

        const conversationRows = data || [];
        setConversations(conversationRows);
        const latestConversation = conversationRows[0];
        if (latestConversation) {
          await loadConversation(latestConversation.id);
        } else {
          setMessages([]);
          setChatMode(false);
        }
      });

    return () => { active = false; };
  }, [loadConversation, session?.user?.id]);

  const savePromptHistory = useCallback(async ({
    prompt,
    response,
    source,
    latencyMs,
    channel = 'main',
    conversationId = null,
  }) => {
    if (!supabase || !session?.user?.id) return null;

    try {
      const { data, error } = await supabase
        .from('prompt_history')
        .insert({
          user_id: session.user.id,
          conversation_id: conversationId,
          prompt,
          response,
          source,
          latency_ms: latencyMs ?? null,
          channel,
        })
        .select('id, created_at')
        .single();

      if (error) {
        console.error('Unable to save prompt history:', error);
        return null;
      }

      if (conversationId && channel === 'main') {
        const updatedAt = data.created_at;
        setConversations(prev => prev.map(conversation => (
          conversation.id === conversationId
            ? { ...conversation, updated_at: updatedAt }
            : conversation
        )));
        await supabase
          .from('prompt_conversations')
          .update({ updated_at: updatedAt })
          .eq('id', conversationId)
          .eq('user_id', session.user.id);
      }

      return data;
    } catch (error) {
      console.error('Unable to save prompt history:', error);
      return null;
    }
  }, [session]);

  const createConversation = useCallback(async (title) => {
    if (!supabase || !session?.user?.id) return null;

    const { data, error } = await supabase
      .from('prompt_conversations')
      .insert({
        user_id: session.user.id,
        title: title.slice(0, 80),
        channel: 'main',
      })
      .select('id, title, channel, created_at, updated_at')
      .single();

    if (error) {
      console.error('Unable to create conversation:', error);
      return null;
    }

    setConversations(prev => [data, ...prev]);
    setActiveConversationId(data.id);
    setSelectedHistoryId(data.id);
    return data.id;
  }, [session]);

  const ensureConversation = useCallback(async (title) => (
    activeConversationId || createConversation(title)
  ), [activeConversationId, createConversation]);

  const handleLogout = useCallback(async () => {
    historyLoadVersion.current += 1;
    chatRequestVersion.current += 1;
    if (supabase) await supabase.auth.signOut();
    setMessages([]);
    setSideMessages([]);
    setChatMode(false);
    setSidebarOpen(false);
    setConversations([]);
    setActiveConversationId(null);
    setSelectedHistoryId(null);
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

    const conversation = getConversationTurns(messages);
    const requestVersion = chatRequestVersion.current;
    const conversationId = await ensureConversation(trimmed);
    if (requestVersion !== chatRequestVersion.current) return;

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
      if (requestVersion !== chatRequestVersion.current) return;
      setMessages(prev => [...prev, {
        id: Date.now() + 1, sender: 'assistant',
        text: matched ? answer : '', feedback: null,
        source: matched ? 'offline-cache' : 'offline-topics',
        userText: trimmed,
      }]);
      const history = await savePromptHistory({
        prompt: trimmed,
        response: matched ? answer : '',
        source: matched ? 'offline-cache' : 'offline-topics',
        conversationId,
      });
      if (history) {
        setMessages(prev => prev.map(message => (
          message.sender === 'assistant' &&
          message.userText === trimmed &&
          !message.historyId
            ? { ...message, historyId: history.id, createdAt: history.created_at }
            : message
        )));
      }
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
        body: JSON.stringify({ message: trimmed, conversation }),
        signal: ctrl.signal,
      });
      clearTimeout(tid);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      if (requestVersion !== chatRequestVersion.current) return;
      isOffline.current = false;
      setMessages(prev => [...prev, {
        id: Date.now() + 1, sender: 'assistant',
        text: data.reply || 'The system responded but returned no guidance.',
        feedback: null, source: data.source || 'rag',
        latency_ms: data.latency_ms, userText: trimmed,
      }]);
      const history = await savePromptHistory({
        prompt: trimmed,
        response: data.reply || 'The system responded but returned no guidance.',
        source: data.source || 'rag',
        latencyMs: data.latency_ms,
        conversationId,
      });
      if (history) {
        setMessages(prev => prev.map(message => (
          message.sender === 'assistant' &&
          message.userText === trimmed &&
          !message.historyId
            ? { ...message, historyId: history.id, createdAt: history.created_at }
            : message
        )));
      }
      setStatus(data.source === 'rag' || data.source === 'scope' || data.source === 'general' || data.source === 'help'
        ? 'Online'
        : 'Offline');
    } catch {
      isOffline.current = true;
      setStatus('Offline');
      const { answer, matched } = searchFaq(trimmed);
      if (requestVersion !== chatRequestVersion.current) return;
      setMessages(prev => [...prev, {
        id: Date.now() + 1, sender: 'assistant',
        text: matched ? answer : '', feedback: null,
        source: matched ? 'offline-cache' : 'offline-topics',
        userText: trimmed,
      }]);
      const history = await savePromptHistory({
        prompt: trimmed,
        response: matched ? answer : '',
        source: matched ? 'offline-cache' : 'offline-topics',
        conversationId,
      });
      if (history) {
        setMessages(prev => prev.map(message => (
          message.sender === 'assistant' &&
          message.userText === trimmed &&
          !message.historyId
            ? { ...message, historyId: history.id, createdAt: history.created_at }
            : message
        )));
      }
    } finally {
      setIsLoading(false);
    }
  }, [chatMode, ensureConversation, isLoading, messages, savePromptHistory]);

  const handleSubmit      = e => { e.preventDefault(); sendMessage(input); };
  const handleRetry       = useCallback(t => { if (t) sendMessage(t); }, [sendMessage]);
  const handleTopicSelect = useCallback(l => sendMessage(l), [sendMessage]);

  // ── Sidebar send ──
  const sendSideMessage = useCallback(async (text) => {
    const trimmed = (text || '').trim();
    if (!trimmed || sideLoading) return;

    const conversation = getConversationTurns(sideMessages);
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
      const history = await savePromptHistory({
        prompt: trimmed,
        response: matched ? answer : '',
        source: matched ? 'offline-cache' : 'offline-topics',
        channel: 'sidebar',
      });
      if (history) {
        setSideMessages(prev => prev.map(message => (
          message.sender === 'assistant' &&
          message.userText === trimmed &&
          !message.historyId
            ? { ...message, historyId: history.id, createdAt: history.created_at }
            : message
        )));
      }
      setSideLoading(false);
      return;
    }

    try {
      const ctrl = new AbortController();
      const tid  = setTimeout(() => ctrl.abort(), FETCH_TIMEOUT_MS);
      const res  = await fetch(`${BACKEND_URL}/api/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...authHeaders() },
        body: JSON.stringify({ message: trimmed, conversation }),
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
      const history = await savePromptHistory({
        prompt: trimmed,
        response: data.reply || 'No guidance returned.',
        source: data.source || 'rag',
        latencyMs: data.latency_ms,
        channel: 'sidebar',
      });
      if (history) {
        setSideMessages(prev => prev.map(message => (
          message.sender === 'assistant' &&
          message.userText === trimmed &&
          !message.historyId
            ? { ...message, historyId: history.id, createdAt: history.created_at }
            : message
        )));
      }
    } catch {
      const { answer, matched } = searchFaq(trimmed);
      setSideMessages(prev => [...prev, {
        id: Date.now() + 1, sender: 'assistant',
        text: matched ? answer : '', source: matched ? 'offline-cache' : 'offline-topics',
        userText: trimmed,
      }]);
      const history = await savePromptHistory({
        prompt: trimmed,
        response: matched ? answer : '',
        source: matched ? 'offline-cache' : 'offline-topics',
        channel: 'sidebar',
      });
      if (history) {
        setSideMessages(prev => prev.map(message => (
          message.sender === 'assistant' &&
          message.userText === trimmed &&
          !message.historyId
            ? { ...message, historyId: history.id, createdAt: history.created_at }
            : message
        )));
      }
    } finally {
      setSideLoading(false);
    }
  }, [savePromptHistory, sideLoading, sideMessages]);

  const handleFeedback = useCallback(async (messageId, rating) => {
    setMessages(prev => prev.map(m => m.id === messageId ? { ...m, feedback: rating } : m));
    const msg  = messages.find(m => m.id === messageId);
    const idx  = messages.findIndex(m => m.id === messageId);
    const user = messages.slice(0, idx).reverse().find(m => m.sender === 'user');
    if (!msg) return;
    try {
      if (supabase && msg.historyId) {
        const { error } = await supabase
          .from('prompt_history')
          .update({ rating: rating === 'up' ? 1 : 2 })
          .eq('id', msg.historyId)
          .eq('user_id', session.user.id);
        if (error) console.error('Unable to save prompt feedback:', error);
      }
      await fetch(`${BACKEND_URL}/api/feedback`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...authHeaders() },
        body: JSON.stringify({ message: user?.text || '', reply: msg.text, rating: rating === 'up' ? 1 : 2 }),
      });
    } catch { /**/ }
  }, [authHeaders, messages, session]);

  // ── New chat ──
  const newChat = () => {
    chatRequestVersion.current += 1;
    setMessages([]);
    setChatMode(false);
    setActiveConversationId(null);
    setSelectedHistoryId(null);
    setIsLoading(false);
    setInput('');
    setTimeout(() => inputRef.current?.focus(), 50);
  };

  const selectHistory = useCallback((conversationId) => {
    if (!conversations.some(conversation => conversation.id === conversationId)) return;
    loadConversation(conversationId, true);
  }, [conversations, loadConversation]);

  if (authLoading) {
    return <main className="login-page"><p className="login-loading">Loading…</p></main>;
  }

  if (recoveryMode) {
    return (
      <PasswordResetScreen
        onComplete={() => {
          setRecoveryMode(false);
          setSession(null);
        }}
      />
    );
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
          <button
            className="topbar-btn history-toggle-btn"
            onClick={() => setHistoryOpen(open => !open)}
            title={historyOpen ? 'Hide prompt history' : 'Show prompt history'}
            aria-expanded={historyOpen}
          >
            ☰ History
          </button>
          {chatMode && (
            <button className="topbar-btn new-chat-btn" onClick={newChat} title="New chat">
              ✏️ New chat
            </button>
          )}
          <span className={`status-pill ${status === 'Offline' ? 'offline' : 'online'}`}>
            {status}
          </span>
          <span className="access-type-badge">
            Access Type: {profile?.role || profile?.access_type || 'User'}
          </span>
          <button className="topbar-icon-btn" onClick={() => setDarkMode(d => !d)} aria-label="Toggle dark mode">
            {darkMode ? '☀️' : '🌙'}
          </button>
          <AccountMenu
            profile={profile}
            email={session.user.email}
            onLogout={handleLogout}
            onResetPassword={() => {
              setRecoveryMode(true);
            }}
          />
        </div>
      </header>

      {/* ── Main ── */}
      <div className="workspace-shell">
        <HistoryPanel
          items={conversations.map(conversation => ({
            id: conversation.id,
            title: conversation.title,
            createdAt: conversation.updated_at,
          }))}
          isOpen={historyOpen}
          selectedId={selectedHistoryId}
          onSelect={selectHistory}
          onNewChat={newChat}
        />

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
                  39 offline protocols · Powered by Gemini 3.1 Flash Lite
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
                  selected={msg.historyId === selectedHistoryId}
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
      </div>

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
