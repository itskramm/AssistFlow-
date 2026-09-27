import { useMemo, useState } from 'react';

const initialMessages = [
  {
    id: 1,
    sender: 'assistant',
    text: 'Hi, I can help with troubleshooting steps, SOP guidance, and downtime procedures.'
  },
  {
    id: 2,
    sender: 'user',
    text: 'The CRM dashboard is loading slowly and the login page keeps timing out.'
  },
  {
    id: 3,
    sender: 'assistant',
    text: 'Try checking your network status, refreshing the session, and validating whether the outage checklist applies.'
  }
];

function App() {
  const [messages, setMessages] = useState(initialMessages);
  const [input, setInput] = useState('');
  const [status, setStatus] = useState('Online');
  const [isLoading, setIsLoading] = useState(false);

  const agentSummary = useMemo(
    () => ({
      name: 'AssistFlow',
      mode: 'Support assistant',
      availability: status
    }),
    [status]
  );

  const handleSubmit = async (event) => {
    event.preventDefault();

    const trimmed = input.trim();
    if (!trimmed) {
      return;
    }

    const userMessage = {
      id: Date.now(),
      sender: 'user',
      text: trimmed
    };

    setMessages((current) => [...current, userMessage]);
    setInput('');
    setIsLoading(true);

    try {
      const response = await fetch('http://127.0.0.1:8000/api/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ message: trimmed })
      });

      const data = await response.json();
      const assistantReply = {
        id: Date.now() + 1,
        sender: 'assistant',
        text: data.reply || 'The system responded, but no guidance was returned.'
      };

      setMessages((current) => [...current, assistantReply]);
      setStatus('Online');
    } catch (error) {
      const fallbackReply = {
        id: Date.now() + 2,
        sender: 'assistant',
        text: 'The backend is unavailable. Please check the local FastAPI server and retry.'
      };

      setMessages((current) => [...current, fallbackReply]);
      setStatus('Offline');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="app-shell">
      <header className="topbar">
        <div>
          <p className="eyebrow">Workspace Support</p>
          <h1>{agentSummary.name}</h1>
        </div>
        <span className={`status-pill ${status === 'Offline' ? 'offline' : 'online'}`}>
          {status}
        </span>
      </header>

      <main className="chat-panel">
        {messages.map((message) => (
          <div
            key={message.id}
            className={`message-row ${message.sender === 'assistant' ? 'assistant' : 'user'}`}
          >
            <div className="message-bubble">
              {message.text}
            </div>
          </div>
        ))}

        {isLoading && (
          <div className="message-row assistant">
            <div className="message-bubble">Thinking...</div>
          </div>
        )}
      </main>

      <form className="composer" onSubmit={handleSubmit}>
        <input
          type="text"
          value={input}
          onChange={(event) => setInput(event.target.value)}
          placeholder="Describe the issue or ask for a procedure..."
          aria-label="Issue description"
        />
        <button type="submit" disabled={isLoading}>
          {isLoading ? 'Sending...' : 'Send'}
        </button>
      </form>
    </div>
  );
}

export default App;
