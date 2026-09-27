/**
 * App.jsx — AssistFlow Side Panel
 *
 * Updated to reflect live system:
 *  - Gemini 3.8 Flash returns markdown-style replies (bold, numbered lists)
 *  - Source badge on each assistant bubble (rag / offline-cache / fallback)
 *  - Retry button on error/fallback messages
 *  - Improved step parser handles: "1. Step", "1) Step", "**1. Step**", "Step 1:"
 *  - Bold text (**text**) rendered inline without a markdown library
 */

import { useCallback, useEffect, useRef, useState } from 'react';
import { searchFaq, getTopicList } from './offlineFaq.js';

const BACKEND_URL = 'http://127.0.0.1:8000';

const WELCOME_MESSAGE = {
  id: 'welcome',
  sender: 'assistant',
  text: "Hi, I'm AssistFlow. I can help with troubleshooting steps, SOP guidance, and downtime procedures. Ask me anything or highlight text on the page to send it as a query.",
  feedback: null,
  source: null,
};

// ---------------------------------------------------------------------------
// Markdown-lite renderer
// ---------------------------------------------------------------------------

/**
 * Strips leading markdown bold markers from a line.
 * e.g. "**1. Do this**" → "1. Do this"
 */
function stripBold(text) {
  return text.replace(/\*\*(.*?)\*\*/g, '$1');
}

/**
 * Splits inline text into alternating plain/bold segments for rendering.
 * "Check **this** carefully" → [{bold:false,text:"Check "},{bold:true,text:"this"},{bold:false,text:" carefully"}]
 */
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

/**
 * Detects whether a reply is a numbered list and returns the steps.
 * Handles Gemini output formats:
 *   "1. Step"  "1) Step"  "**1. Step**"  "Step 1: ..."
 */
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
// Offline topic list — shown when no FAQ entry matches
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
    <div
      className={`message-row ${isAssistant ? 'assistant' : 'user'}`}
      role="listitem"
    >
      <div className={`message-bubble ${isError ? 'bubble-error' : ''}`}>

        {/* Topic list for no-match offline responses */}
        {isTopics
          ? <TopicList onSelect={onTopicSelect} />
          : steps
            ? <StepList steps={steps} />
            : <p className="bubble-text"><InlineText text={message.text} /></p>
        }

        {/* Source badge + feedback row — only on assistant messages */}
        {isAssistant && message.id !== 'welcome' && !isTopics && (
          <div className="bubble-footer">
            <SourceBadge source={message.source} />

            {/* Retry button on error/fallback */}
            {isError && onRetry && (
              <button className="retry-btn" onClick={() => onRetry(message.userText)}>
                ↺ Retry
              </button>
            )}

            {/* Thumbs up/down — not shown on error messages */}
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

function SelectedTextBanner({ text, onUse, onDismiss }) {
  if (!text) return null;
  return (
    <div className="selected-banner" role="status" aria-live="polite">
      <span className="selected-preview">
        "{text.slice(0, 80)}{text.length > 80 ? '…' : ''}"
      </span>
      <div className="selected-actions">
        <button className="banner-btn use" onClick={onUse}>Use as query</button>
        <button className="banner-btn dismiss" onClick={onDismiss} aria-label="Dismiss">✕</button>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main App
// ---------------------------------------------------------------------------

export default function App() {
  const [messages,     setMessages]     = useState([WELCOME_MESSAGE]);
  const [input,        setInput]        = useState('');
  const [status,       setStatus]       = useState('Online');
  const [isLoading,    setIsLoading]    = useState(false);
  const [platform,     setPlatform]     = useState('');
  const [selectedText, setSelectedText] = useState('');
  const [pageContext,  setPageContext]   = useState(null); // live CRM ticket data
  const [darkMode,     setDarkMode]     = useState(() => {
    // Restore preference from storage; default to system preference
    try {
      const stored = localStorage.getItem('assistflow-dark');
      if (stored !== null) return stored === 'true';
    } catch { /* storage may be unavailable */ }
    return window.matchMedia('(prefers-color-scheme: dark)').matches;
  });

  const chatEndRef = useRef(null);
  const inputRef   = useRef(null);

  // Apply / remove dark class on <html>
  useEffect(() => {
    document.documentElement.classList.toggle('dark', darkMode);
    try { localStorage.setItem('assistflow-dark', String(darkMode)); } catch { /* ignore */ }
  }, [darkMode]);

  // Auto-scroll to bottom on new messages
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isLoading]);

  // ---------------------------------------------------------------------------
  // Chrome runtime — PANEL_READY + message listeners
  // ---------------------------------------------------------------------------
  useEffect(() => {
    if (!chrome?.runtime) return;

    // Ask background for last known tab context
    chrome.runtime.sendMessage({ type: 'PANEL_READY' }, (response) => {
      if (response?.context) applyTabContext(response.context);
    });

    const handler = (message) => {
      if (message.type === 'TAB_CONTEXT' || message.type === 'PAGE_CONTEXT') {
        applyTabContext(message);
      }
      if (message.type === 'PAGE_DATA' && message.data) {
        setPageContext(message.data);
      }
      if (message.type === 'TEXT_SELECTED' && message.selectedText) {
        setSelectedText(message.selectedText);
      }
      if (message.type === 'CONTEXT_MENU_QUERY' && message.selectedText) {
        setInput(message.selectedText);
        inputRef.current?.focus();
      }
    };

    chrome.runtime.onMessage.addListener(handler);
    return () => chrome.runtime.onMessage.removeListener(handler);
  }, []);

  function applyTabContext(ctx) {
    if (ctx?.platform) setPlatform(ctx.platform);
    else if (ctx?.hostname) setPlatform(ctx.hostname);
  }

  // ---------------------------------------------------------------------------
  // Send a message to the backend
  // ---------------------------------------------------------------------------
  const sendMessage = useCallback(async (text) => {
    const trimmed = (text || '').trim();
    if (!trimmed || isLoading) return;

    const userMsg = { id: Date.now(), sender: 'user', text: trimmed, feedback: null, source: null };
    setMessages((prev) => [...prev, userMsg]);
    setInput('');
    setSelectedText('');
    setIsLoading(true);

    // Build request body — attach live CRM page context if available
    const body = { message: trimmed };
    if (pageContext && Object.keys(pageContext).length > 0) {
      body.page_context = pageContext;
    }

    try {
      const controller = new AbortController();
      const timeoutId  = setTimeout(() => controller.abort(), 30000);

      const res = await fetch(`${BACKEND_URL}/api/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
        signal: controller.signal,
      });
      clearTimeout(timeoutId);

      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();

      setMessages((prev) => [...prev, {
        id:         Date.now() + 1,
        sender:     'assistant',
        text:       data.reply || 'The system responded but returned no guidance.',
        feedback:   null,
        source:     data.source || 'rag',
        latency_ms: data.latency_ms,
        userText:   trimmed,
      }]);
      // Reflect actual connectivity state — backend may have served from cache
      setStatus(data.source === 'rag' ? 'Online' : 'Offline');
    } catch {
      // Backend unreachable or timed out — answer instantly from the local FAQ.
      // No second network request needed.
      const { answer, matched } = searchFaq(trimmed);
      setMessages((prev) => [...prev, {
        id:       Date.now() + 1,
        sender:   'assistant',
        text:     matched ? answer : '',
        feedback: null,
        source:   matched ? 'offline-cache' : 'offline-topics',
        userText: trimmed,
      }]);
      setStatus('Offline');
    } finally {
      setIsLoading(false);
    }
  }, [isLoading, pageContext]);

  const handleSubmit = (e) => {
    e.preventDefault();
    sendMessage(input);
  };

  // Retry — re-sends the original user query that produced an error message
  const handleRetry = useCallback((originalText) => {
    if (originalText) sendMessage(originalText);
  }, [sendMessage]);

  // Topic select — agent taps a topic from the offline list
  const handleTopicSelect = useCallback((label) => {
    sendMessage(label);
  }, [sendMessage]);

  // ---------------------------------------------------------------------------
  // Feedback
  // ---------------------------------------------------------------------------
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
      // Best-effort — don't surface feedback errors to the agent
    }
  }, [messages]);

  // ---------------------------------------------------------------------------
  // Render
  // ---------------------------------------------------------------------------
  return (
    <div className="app-shell">
      <header className="topbar" role="banner">
        <div className="topbar-left">
          <p className="eyebrow">
            {platform ? `Active on ${platform}` : 'Workspace Support'}
          </p>
          <h1>AssistFlow</h1>
          {pageContext?.subject && (
            <p className="context-label" title={pageContext.subject}>
              📋 {pageContext.ticketId ? `#${pageContext.ticketId} · ` : ''}{pageContext.subject.slice(0, 40)}{pageContext.subject.length > 40 ? '…' : ''}
            </p>
          )}
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

      <SelectedTextBanner
        text={selectedText}
        onUse={() => sendMessage(selectedText)}
        onDismiss={() => setSelectedText('')}
      />

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
