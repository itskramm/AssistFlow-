/**
 * App.jsx — AssistFlow Web Application
 *
 * Standalone web version of the Chrome extension side panel.
 * Same offline detection logic and process flow as the extension.
 */

import { useCallback, useEffect, useRef, useState } from 'react';
import { searchFaq, getTopicList } from './offlineFaq.js';

const BACKEND_URL      = 'http://127.0.0.1:8000';
const FETCH_TIMEOUT_MS = 5000;
const HEALTH_POLL_MS   = 30000;

const WELCOME_MESSAGE = {
  id: 'welcome',
  sender: 'assistant',
  text: "Hi, I'm AssistFlow. I can help with troubleshooting steps, SOP guidance, and downtime procedures. Ask me anything!",
  feedback: null,
  source: null,
};

// ---------------------------------------------------------------------------
// Markdown-lite renderer
// ---------------------------------------------------------------------------

function stripBold(text) {
  return text.replace(/\*\*(.*?)\*\*/g, '$1');
}

function parseInline(text) {
  const parts = [];
  const regex = /\*\*(.*?)\*\*/g;
  let last = 0;
  let match;
  while ((match = regex.exec(text)) !== null) {
    if (match.index > last) parts.push({ bold: false, text: text.slice(last, match.index) });
    parts.push({ bold: true, text: match[1] });
    last = match.index + match[0].length;
  }
  if (last < text.length) parts.push({ bold: false, text: text.slice(last) });
  return parts.length ? parts : [{ bold: false, text }];
}

function InlineText({ text }) {
  const parts = parseInline(text);
  return (
    <>
      {parts.map((p, i) =>
        p.bold ? <strong key={i}>{p.text}</strong> : <span key={i}>{p.text}</span>
      )}
    </>
  );
}

function parseSteps(text) {
  const lines = text.split('\n').map(l => stripBold(l.trim())).filter(Boolean);
  const stepPattern = /^(\d+[.):]\s+|step\s+\d+[.:]\s*)/i;
  const steps = lines.filter(l => stepPattern.test(l));
  if (steps.length >= 2) {
    return steps.map(l => l.replace(stepPattern, '').trim());
  }
  return null;
}

// ---------------------------------------------------------------------------
// Offline topic list
// ---------------------------------------------------------------------------

function TopicList({ onSelect }) {
  const topics = getTopicList();
  return (
    <div className="topic-list">
      <p className="topic-list-heading">I can help with these topics while offline:</p>
      <ul>
        {topics.map((label, i) => (
          <li key={i}>
            <button className="topic-btn" onClick={() => onSelect(label)}>
              {label}
            </button>
          </li>
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
};

function SourceBadge({ source }) {
  if (!source || source === null) return null;
  const { label, cls } = SOURCE_LABELS[source] || { label: source, cls: 'source-rag' };
  return <span className={`source-badge ${cls}`}>{label}</span>;
}

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

function StepList({ steps }) {
  return (
    <ol className="steps-list" aria-label="Step-by-step instructions">
      {steps.map((step, i) => (
        <li key={i}><InlineText text={step} /></li>
      ))}
    </ol>
  );
}

function MessageBubble({ message, onFeedback, onRetry, onTopicSelect }) {
  const isAssistant = message.sender === 'assistant';
  const isError     = message.source === 'fallback';
  const isTopics    = message.source === 'offline-topics';
  const steps       = isAssistant && !isTopics ? parseSteps(message.text) : null;

  return (
    <div className={`message-row ${isAssistant ? 'assistant' : 'user'}`} role="listitem">
      <div className={`message-bubble ${isError ? 'bubble-error' : ''}`}>
        {isTopics
          ? <TopicList onSelect={onTopicSelect} />
          : steps
            ? <StepList steps={steps} />
            : <p className="bubble-text"><InlineText text={message.text} /></p>
        }

        {isAssistant && message.id !== 'welcome' && !isTopics && (
          <div className="bubble-footer">
            <SourceBadge source={message.source} />

            {isError && onRetry && (
              <button className="retry-btn" onClick={() => onRetry(message.userText)}>
                ↺ Retry
              </button>
            )}

            {!isError && (
              <div className="feedback-row" aria-label="Rate this response">
                <button
                  className={`feedback-btn ${message.feedback === 'up' ? 'active-up' : ''}`}
                  onClick={() => onFeedback(message.id, 'up')}
                  aria-label="Helpful"
                  title="Helpful"
                  disabled={message.feedback !== null}
                >👍</button>
                <button
                  className={`feedback-btn ${message.feedback === 'down' ? 'active-down' : ''}`}
                  onClick={() => onFeedback(message.id, 'down')}
                  aria-label="Not helpful"
                  title="Not helpful"
                  disabled={message.feedback !== null}
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
// Main App
// ---------------------------------------------------------------------------

export default function App() {
  const [messages,  setMessages]  = useState([WELCOME_MESSAGE]);
  const [input,     setInput]     = useState('');
  const [status,    setStatus]    = useState('Online');
  const [isLoading, setIsLoading] = useState(false);
  const [darkMode,  setDarkMode]  = useState(() => {
    try {
      const stored = localStorage.getItem('assistflow-dark');
      if (stored !== null) return stored === 'true';
    } catch { /* ignore */ }
    return window.matchMedia('(prefers-color-scheme: dark)').matches;
  });

  const chatEndRef = useRef(null);
  const inputRef   = useRef(null);
  const isOffline  = useRef(false);

  // Apply dark mode class
  useEffect(() => {
    document.documentElement.classList.toggle('dark', darkMode);
    try { localStorage.setItem('assistflow-dark', String(darkMode)); } catch { /* ignore */ }
  }, [darkMode]);

  // Health poll — while offline, probe /api/health every 30s
  useEffect(() => {
    let timer = null;

    const probe = async () => {
      if (!isOffline.current) return;
      try {
        const res = await fetch(`${BACKEND_URL}/api/health`, { signal: AbortSignal.timeout(3000) });
        if (res.ok) {
          isOffline.current = false;
          setStatus('Online');
        }
      } catch {
        // Still offline
      } finally {
        if (isOffline.current) {
          timer = setTimeout(probe, HEALTH_POLL_MS);
        }
      }
    };

    if (status === 'Offline') {
      timer = setTimeout(probe, HEALTH_POLL_MS);
    }

    return () => clearTimeout(timer);
  }, [status]);

  // Auto-scroll to bottom
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isLoading]);

  // Send message with offline detection
  const sendMessage = useCallback(async (text) => {
    const trimmed = (text || '').trim();
    if (!trimmed || isLoading) return;

    const userMsg = { id: Date.now(), sender: 'user', text: trimmed, feedback: null, source: null };
    setMessages((prev) => [...prev, userMsg]);
    setInput('');
    setIsLoading(true);

    // Fast path: already know we're offline
    if (isOffline.current) {
      const { answer, matched } = searchFaq(trimmed);
      setMessages((prev) => [...prev, {
        id:       Date.now() + 1,
        sender:   'assistant',
        text:     matched ? answer : '',
        feedback: null,
        source:   matched ? 'offline-cache' : 'offline-topics',
        userText: trimmed,
      }]);
      setIsLoading(false);
      return;
    }

    // Normal path: try the backend
    try {
      const controller = new AbortController();
      const timeoutId  = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);

      const res = await fetch(`${BACKEND_URL}/api/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: trimmed }),
        signal: controller.signal,
      });
      clearTimeout(timeoutId);

      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();

      isOffline.current = false;
      setMessages((prev) => [...prev, {
        id:         Date.now() + 1,
        sender:     'assistant',
        text:       data.reply || 'The system responded but returned no guidance.',
        feedback:   null,
        source:     data.source || 'rag',
        latency_ms: data.latency_ms,
        userText:   trimmed,
      }]);
      setStatus(data.source === 'rag' ? 'Online' : 'Offline');
    } catch {
      // Fetch failed — mark offline, serve FAQ
      isOffline.current = true;
      setStatus('Offline');

      const { answer, matched } = searchFaq(trimmed);
      setMessages((prev) => [...prev, {
        id:       Date.now() + 1,
        sender:   'assistant',
        text:     matched ? answer : '',
        feedback: null,
        source:   matched ? 'offline-cache' : 'offline-topics',
        userText: trimmed,
      }]);
    } finally {
      setIsLoading(false);
    }
  }, [isLoading]);

  const handleSubmit = (e) => {
    e.preventDefault();
    sendMessage(input);
  };

  const handleRetry = useCallback((originalText) => {
    if (originalText) sendMessage(originalText);
  }, [sendMessage]);

  const handleTopicSelect = useCallback((label) => {
    sendMessage(label);
  }, [sendMessage]);

  const handleFeedback = useCallback(async (messageId, rating) => {
    setMessages((prev) =>
      prev.map((m) => (m.id === messageId ? { ...m, feedback: rating } : m))
    );

    const msg      = messages.find((m) => m.id === messageId);
    const msgIndex = messages.findIndex((m) => m.id === messageId);
    const userMsg  = messages.slice(0, msgIndex).reverse().find((m) => m.sender === 'user');
    if (!msg) return;

    try {
      await fetch(`${BACKEND_URL}/api/feedback`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: userMsg?.text || '',
          reply:   msg.text,
          rating:  rating === 'up' ? 1 : 2,
        }),
      });
    } catch {
      // Best-effort
    }
  }, [messages]);

  return (
    <div className="app-shell">
      <header className="topbar" role="banner">
        <div className="topbar-left">
          <p className="eyebrow">AI-Assisted Support System</p>
          <h1>AssistFlow</h1>
        </div>
        <div className="topbar-right">
          <button
            className="dark-toggle"
            onClick={() => setDarkMode(d => !d)}
            aria-label={darkMode ? 'Switch to light mode' : 'Switch to dark mode'}
            title={darkMode ? 'Light mode' : 'Dark mode'}
          >
            {darkMode ? '☀️' : '🌙'}
          </button>
          <span className={`status-pill ${status === 'Offline' ? 'offline' : 'online'}`}>
            {status}
          </span>
        </div>
      </header>

      <main className="chat-panel" role="list" aria-label="Conversation">
        {messages.map((msg) => (
          <MessageBubble
            key={msg.id}
            message={msg}
            onFeedback={handleFeedback}
            onRetry={handleRetry}
            onTopicSelect={handleTopicSelect}
          />
        ))}

        {isLoading && (
          <div className="message-row assistant" role="status" aria-live="polite">
            <div className="message-bubble loading-bubble">
              <span className="dot" /><span className="dot" /><span className="dot" />
            </div>
          </div>
        )}

        <div ref={chatEndRef} />
      </main>

      <form className="composer" onSubmit={handleSubmit} role="form" aria-label="Send a message">
        <input
          ref={inputRef}
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Describe the issue or ask for a procedure…"
          aria-label="Issue description or question"
          disabled={isLoading}
        />
        <button type="submit" disabled={isLoading || !input.trim()} aria-label="Send">
          {isLoading ? '…' : '↑'}
        </button>
      </form>
    </div>
  );
}
