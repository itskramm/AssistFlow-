/**
 * App.jsx — AssistFlow Side Panel
 *
 * Features:
 *  - On mount: sends PANEL_READY to background to fetch last known tab context
 *  - Listens for TAB_CONTEXT, PAGE_CONTEXT, TEXT_SELECTED, CONTEXT_MENU_QUERY
 *    messages from the background service worker / content script
 *  - Shows the active CRM platform in the header (e.g. "Salesforce", "Zendesk")
 *  - "Use selected text" banner when the agent highlights text on the host page
 *  - Formats assistant replies: numbered steps rendered as <ol>, plain text as <p>
 *  - Thumbs up / down feedback sent to POST /api/feedback
 *  - Online / Offline status pill
 */

import { useCallback, useEffect, useRef, useState } from 'react';

const BACKEND_URL = 'http://127.0.0.1:8000';

const WELCOME_MESSAGE = {
  id: 'welcome',
  sender: 'assistant',
  text: "Hi, I'm AssistFlow. I can help with troubleshooting steps, SOP guidance, and downtime procedures. Ask me anything or highlight text on the page to send it as a query.",
  feedback: null,
};

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Detects whether a string looks like a numbered list and splits it into steps.
 * Matches patterns like "1. ...", "1) ...", or "Step 1: ..."
 */
function parseSteps(text) {
  const lines = text.split('\n');
  const stepPattern = /^(\d+[.):]|step\s+\d+[.):])[\s]*/i;
  const steps = lines.filter((l) => stepPattern.test(l.trim()));
  if (steps.length >= 2) {
    return steps.map((l) => l.replace(stepPattern, '').trim());
  }
  return null;
}

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

function StepList({ steps }) {
  return (
    <ol className="steps-list" aria-label="Step-by-step instructions">
      {steps.map((step, i) => (
        <li key={i}>{step}</li>
      ))}
    </ol>
  );
}

function MessageBubble({ message, onFeedback }) {
  const steps = message.sender === 'assistant' ? parseSteps(message.text) : null;

  return (
    <div
      className={`message-row ${message.sender === 'assistant' ? 'assistant' : 'user'}`}
      role="listitem"
    >
      <div className="message-bubble">
        {steps ? <StepList steps={steps} /> : <p className="bubble-text">{message.text}</p>}

        {/* Feedback controls — only on assistant messages, not on the welcome msg */}
        {message.sender === 'assistant' && message.id !== 'welcome' && (
          <div className="feedback-row" aria-label="Rate this response">
            <button
              className={`feedback-btn ${message.feedback === 'up' ? 'active-up' : ''}`}
              onClick={() => onFeedback(message.id, 'up')}
              aria-label="Helpful"
              title="Helpful"
              disabled={message.feedback !== null}
            >
              👍
            </button>
            <button
              className={`feedback-btn ${message.feedback === 'down' ? 'active-down' : ''}`}
              onClick={() => onFeedback(message.id, 'down')}
              aria-label="Not helpful"
              title="Not helpful"
              disabled={message.feedback !== null}
            >
              👎
            </button>
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
      <span className="selected-preview">"{text.slice(0, 80)}{text.length > 80 ? '…' : ''}"</span>
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
  const [messages, setMessages] = useState([WELCOME_MESSAGE]);
  const [input, setInput] = useState('');
  const [status, setStatus] = useState('Online');
  const [isLoading, setIsLoading] = useState(false);
  const [platform, setPlatform] = useState('');
  const [selectedText, setSelectedText] = useState('');

  const chatEndRef = useRef(null);
  const inputRef = useRef(null);

  // Auto-scroll to bottom on new messages
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isLoading]);

  // ---------------------------------------------------------------------------
  // On mount: announce PANEL_READY to get last known tab context
  // ---------------------------------------------------------------------------
  useEffect(() => {
    if (!chrome?.runtime) return;

    chrome.runtime.sendMessage({ type: 'PANEL_READY' }, (response) => {
      if (response?.context) {
        applyTabContext(response.context);
      }
    });

    // Listen for runtime messages from background + content scripts
    const handler = (message) => {
      if (message.type === 'TAB_CONTEXT' || message.type === 'PAGE_CONTEXT') {
        applyTabContext(message);
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

    const userMsg = { id: Date.now(), sender: 'user', text: trimmed, feedback: null };
    setMessages((prev) => [...prev, userMsg]);
    setInput('');
    setSelectedText('');
    setIsLoading(true);

    try {
      const res = await fetch(`${BACKEND_URL}/api/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: trimmed }),
      });

      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();

      const assistantMsg = {
        id: Date.now() + 1,
        sender: 'assistant',
        text: data.reply || 'The system responded but returned no guidance.',
        feedback: null,
        source: data.source,
        latency_ms: data.latency_ms,
      };
      setMessages((prev) => [...prev, assistantMsg]);
      setStatus('Online');
    } catch {
      const fallbackMsg = {
        id: Date.now() + 2,
        sender: 'assistant',
        text: 'The backend is unavailable. Check that the local FastAPI server is running, then retry.',
        feedback: null,
        source: 'fallback',
      };
      setMessages((prev) => [...prev, fallbackMsg]);
      setStatus('Offline');
    } finally {
      setIsLoading(false);
    }
  }, [isLoading]);

  const handleSubmit = (e) => {
    e.preventDefault();
    sendMessage(input);
  };

  // ---------------------------------------------------------------------------
  // Feedback
  // ---------------------------------------------------------------------------
  const handleFeedback = useCallback(async (messageId, rating) => {
    // Optimistically update UI
    setMessages((prev) =>
      prev.map((m) => (m.id === messageId ? { ...m, feedback: rating } : m))
    );

    const msg = messages.find((m) => m.id === messageId);
    if (!msg) return;

    // Find the preceding user message to send as the query
    const msgIndex = messages.findIndex((m) => m.id === messageId);
    const userMsg = messages.slice(0, msgIndex).reverse().find((m) => m.sender === 'user');

    try {
      await fetch(`${BACKEND_URL}/api/feedback`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: userMsg?.text || '',
          reply: msg.text,
          rating: rating === 'up' ? 1 : 2,
        }),
      });
    } catch {
      // Feedback is best-effort — don't surface errors to the agent
    }
  }, [messages]);

  // ---------------------------------------------------------------------------
  // Render
  // ---------------------------------------------------------------------------
  return (
    <div className="app-shell">
      {/* Header */}
      <header className="topbar" role="banner">
        <div className="topbar-left">
          <p className="eyebrow">{platform ? `Active on ${platform}` : 'Workspace Support'}</p>
          <h1>AssistFlow</h1>
        </div>
        <span className={`status-pill ${status === 'Offline' ? 'offline' : 'online'}`}>
          {status}
        </span>
      </header>

      {/* Selected text banner */}
      <SelectedTextBanner
        text={selectedText}
        onUse={() => sendMessage(selectedText)}
        onDismiss={() => setSelectedText('')}
      />

      {/* Chat area */}
      <main className="chat-panel" role="list" aria-label="Conversation">
        {messages.map((msg) => (
          <MessageBubble key={msg.id} message={msg} onFeedback={handleFeedback} />
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

      {/* Input */}
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
