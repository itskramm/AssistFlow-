/**
 * App.jsx — AssistFlow Web Application
 *
 * ChatGPT-style layout:
 *   - Home: centred greeting + input bar + suggestion chips
 *   - On first send: transitions to full-page chat (messages above, input pinned at bottom)
 *   - No sidebar — the main page IS the chat, just like ChatGPT
 */

import { useCallback, useEffect, useRef, useState } from 'react';
import { searchFaq, getTopicList } from './offlineFaq.js';

const BACKEND_URL      = import.meta.env.VITE_BACKEND_URL || 'https://assistflow-backend-ctbq.onrender.com';
const FETCH_TIMEOUT_MS = 15000;
const HEALTH_POLL_MS   = 30000;

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
        <img src="/bubble-logo.png" alt="AssistFlow" />
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
// Typing indicator
// ---------------------------------------------------------------------------
function TypingRow() {
  return (
    <div className="msg-row msg-assistant">
      <div className="msg-avatar">
        <img src="/bubble-logo.png" alt="AssistFlow" />
      </div>
      <div className="msg-body">
        <div className="msg-bubble-assistant loading-bubble">
          <span className="dot" /><span className="dot" /><span className="dot" />
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main App
// ---------------------------------------------------------------------------
export default function App() {
  const [messages,  setMessages]  = useState([]);
  const [input,     setInput]     = useState('');
  const [status,    setStatus]    = useState('Online');
  const [isLoading, setIsLoading] = useState(false);
  const [chatMode,  setChatMode]  = useState(false); // false = home, true = chat
  const [darkMode,  setDarkMode]  = useState(() => {
    try {
      const s = localStorage.getItem('assistflow-dark');
      if (s !== null) return s === 'true';
    } catch { /**/ }
    return window.matchMedia('(prefers-color-scheme: dark)').matches;
  });

  const chatEndRef  = useRef(null);
  const inputRef    = useRef(null);
  const isOffline   = useRef(false);

  useEffect(() => {
    document.documentElement.classList.toggle('dark', darkMode);
    try { localStorage.setItem('assistflow-dark', String(darkMode)); } catch { /**/ }
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

  // ── New chat ──
  const newChat = () => {
    setMessages([]);
    setChatMode(false);
    setInput('');
    setTimeout(() => inputRef.current?.focus(), 50);
  };

  return (
    <div className="app-shell">

      {/* ── Topbar ── */}
      <header className="topbar">
        <div className="topbar-left">
          <img src="/bubble-logo.png" alt="AssistFlow" className="topbar-logo-img" />
          <span className="topbar-name">AssistFlow</span>
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
              AssistFlow can make mistakes. Verify critical procedures.
            </p>
          </form>
        </div>
      )}

    </div>
  );
}
