/**
 * App.jsx — AssistFlow Web Application
 *
 * ChatGPT/Gemini-style layout:
 *   - Home screen: centred greeting + big input bar + suggestion chips
 *   - On first send: sidebar slides in with the full conversation
 *   - Floating 💬 button always visible at bottom-right (rendered at root)
 */

import { useCallback, useEffect, useRef, useState } from 'react';
import { searchFaq, getTopicList } from './offlineFaq.js';

const BACKEND_URL      = import.meta.env.VITE_BACKEND_URL || 'https://assistflow-backend-ctbq.onrender.com';
const FETCH_TIMEOUT_MS = 15000;
const HEALTH_POLL_MS   = 30000;

const WELCOME_MESSAGE = {
  id: 'welcome',
  sender: 'assistant',
  text: "Hi, I'm AssistFlow. I can help with troubleshooting steps, SOP guidance, and downtime procedures. Ask me anything!",
  feedback: null,
  source: null,
};

const SUGGESTIONS = [
  { icon: '🔑', label: 'CRM password reset',     query: 'How do I reset my CRM password?' },
  { icon: '📞', label: 'Call quality issues',     query: 'Call quality issues on my headset' },
  { icon: '📋', label: 'Escalate a ticket',       query: 'How do I escalate a ticket?' },
  { icon: '🆔', label: 'Identity verification',   query: 'Customer identity verification steps' },
  { icon: '🌐', label: 'VPN not connecting',      query: 'VPN disconnected, how do I reconnect?' },
  { icon: '⚡', label: 'System running slow',     query: 'My system is running slow' },
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
      <p className="topic-list-heading">I can help with these topics while offline:</p>
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
// Message bubble
// ---------------------------------------------------------------------------
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
            ? <ol className="steps-list">{steps.map((s, i) => <li key={i}><InlineText text={s} /></li>)}</ol>
            : <p className="bubble-text"><InlineText text={message.text} /></p>
        }
        {isAssistant && message.id !== 'welcome' && !isTopics && (
          <div className="bubble-footer">
            <SourceBadge source={message.source} />
            {isError && onRetry && (
              <button className="retry-btn" onClick={() => onRetry(message.userText)}>↺ Retry</button>
            )}
            {!isError && (
              <div className="feedback-row">
                <button className={`feedback-btn ${message.feedback === 'up'   ? 'active-up'   : ''}`}
                  onClick={() => onFeedback(message.id, 'up')}   disabled={message.feedback !== null} aria-label="Helpful">👍</button>
                <button className={`feedback-btn ${message.feedback === 'down' ? 'active-down' : ''}`}
                  onClick={() => onFeedback(message.id, 'down')} disabled={message.feedback !== null} aria-label="Not helpful">👎</button>
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
  const [messages,    setMessages]    = useState([WELCOME_MESSAGE]);
  const [input,       setInput]       = useState('');
  const [status,      setStatus]      = useState('Online');
  const [isLoading,   setIsLoading]   = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [darkMode,    setDarkMode]    = useState(() => {
    try {
      const s = localStorage.getItem('assistflow-dark');
      if (s !== null) return s === 'true';
    } catch { /**/ }
    return window.matchMedia('(prefers-color-scheme: dark)').matches;
  });

  const chatEndRef = useRef(null);
  const inputRef   = useRef(null);
  const isOffline  = useRef(false);

  useEffect(() => {
    document.documentElement.classList.toggle('dark', darkMode);
    try { localStorage.setItem('assistflow-dark', String(darkMode)); } catch { /**/ }
  }, [darkMode]);

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

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isLoading]);

  const sendMessage = useCallback(async (text) => {
    const trimmed = (text || '').trim();
    if (!trimmed || isLoading) return;

    // Open the sidebar when a message is sent
    setSidebarOpen(true);

    const userMsg = { id: Date.now(), sender: 'user', text: trimmed, feedback: null, source: null };
    setMessages(prev => [...prev, userMsg]);
    setInput('');
    setIsLoading(true);

    if (isOffline.current) {
      const { answer, matched } = searchFaq(trimmed);
      setMessages(prev => [...prev, {
        id: Date.now() + 1, sender: 'assistant',
        text: matched ? answer : '', feedback: null,
        source: matched ? 'offline-cache' : 'offline-topics', userText: trimmed,
      }]);
      setIsLoading(false);
      return;
    }

    try {
      const ctrl = new AbortController();
      const tid  = setTimeout(() => ctrl.abort(), FETCH_TIMEOUT_MS);
      const res  = await fetch(`${BACKEND_URL}/api/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
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
        source: matched ? 'offline-cache' : 'offline-topics', userText: trimmed,
      }]);
    } finally {
      setIsLoading(false);
    }
  }, [isLoading]);

  const handleSubmit      = e => { e.preventDefault(); sendMessage(input); };
  const handleRetry       = useCallback(t => { if (t) sendMessage(t); },   [sendMessage]);
  const handleTopicSelect = useCallback(l => sendMessage(l),                [sendMessage]);

  const handleFeedback = useCallback(async (messageId, rating) => {
    setMessages(prev => prev.map(m => m.id === messageId ? { ...m, feedback: rating } : m));
    const msg  = messages.find(m => m.id === messageId);
    const idx  = messages.findIndex(m => m.id === messageId);
    const user = messages.slice(0, idx).reverse().find(m => m.sender === 'user');
    if (!msg) return;
    try {
      await fetch(`${BACKEND_URL}/api/feedback`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: user?.text || '', reply: msg.text, rating: rating === 'up' ? 1 : 2 }),
      });
    } catch { /**/ }
  }, [messages]);

  return (
    <div className="app-container">

      {/* ── Floating button — root level, never trapped by overflow:hidden ── */}
      <button
        className={`floating-chat-bubble ${sidebarOpen ? 'hidden' : ''}`}
        onClick={() => setSidebarOpen(true)}
        aria-label="Open chat"
        title="Open AssistFlow chat"
      >
        <img src="/bubble-logo.png" alt="Open chat" className="bubble-logo-img" />
        <span className="bubble-pulse" />
      </button>

      {/* ── Backdrop ── */}
      {sidebarOpen && (
        <div className="sidebar-backdrop" onClick={() => setSidebarOpen(false)} aria-hidden="true" />
      )}

      {/* ── Sidebar (slides in from right) ── */}
      <aside className={`sidebar ${sidebarOpen ? 'open' : 'closed'}`}>
        <div className="sidebar-header">
          <div>
            <p className="eyebrow">AI Support</p>
            <h2 className="sidebar-title">AssistFlow</h2>
          </div>
          <div className="header-actions">
            <span className={`status-pill ${status === 'Offline' ? 'offline' : 'online'}`}>{status}</span>
            <button className="sidebar-toggle" onClick={() => setSidebarOpen(false)} aria-label="Close sidebar">✕</button>
          </div>
        </div>

        <main className="sidebar-chat" role="list" aria-label="Conversation">
          {messages.map(msg => (
            <MessageBubble key={msg.id} message={msg}
              onFeedback={handleFeedback} onRetry={handleRetry} onTopicSelect={handleTopicSelect} />
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

        <form className="sidebar-composer" onSubmit={handleSubmit} aria-label="Send a message">
          <input ref={inputRef} type="text" value={input}
            onChange={e => setInput(e.target.value)}
            placeholder="Ask a question…"
            aria-label="Message"
            disabled={isLoading}
          />
          <button type="submit" disabled={isLoading || !input.trim()} aria-label="Send">
            {isLoading ? '…' : '↑'}
          </button>
        </form>
      </aside>

      {/* ── Main area ── */}
      <div className="main-area">
        <div className="main-content-wrapper">

          {/* Top bar */}
          <header className="topbar">
            <span className="topbar-logo">AssistFlow</span>
            <div className="topbar-actions">
              <span className={`status-pill ${status === 'Offline' ? 'offline' : 'online'}`}>{status}</span>
              <button className="topbar-btn" onClick={() => setDarkMode(d => !d)} aria-label="Toggle dark mode">
                {darkMode ? '☀️' : '🌙'}
              </button>
            </div>
          </header>

          {/* Home screen */}
          <section className="home-screen">
            <div className="home-greeting">
              <h1 className="greeting-title">How can I help you?</h1>
              <p className="greeting-sub">AI-powered support for your workplace questions and procedures.</p>
            </div>

            {/* Big centred input — just like ChatGPT */}
            <form className="home-composer" onSubmit={handleSubmit} aria-label="Ask a question">
              <input
                type="text"
                className="home-input"
                value={input}
                onChange={e => setInput(e.target.value)}
                placeholder="Ask me anything…"
                aria-label="Question"
                disabled={isLoading}
                autoFocus
              />
              <button type="submit" className="home-send-btn"
                disabled={isLoading || !input.trim()} aria-label="Send">
                {isLoading ? '…' : '↑'}
              </button>
            </form>

            {/* Suggestion chips */}
            <div className="suggestions-grid">
              {SUGGESTIONS.map(s => (
                <button key={s.query} className="suggestion-chip" onClick={() => sendMessage(s.query)}>
                  <span className="chip-icon">{s.icon}</span>
                  <span className="chip-label">{s.label}</span>
                </button>
              ))}
            </div>

            <p className="home-footer">
              39 offline protocols · Powered by Gemini 2.5 Flash
            </p>
          </section>

        </div>
      </div>
    </div>
  );
}
