// SmartOpsSupportHub side panel and embedded widget logic

const BACKEND_URL = 'https://assistflow-backend-ctbq.onrender.com';
const FETCH_TIMEOUT_MS = 15000;

const chatContainer = document.getElementById('chatContainer');
const faqList = document.getElementById('faqList');
const messageForm = document.getElementById('messageForm');
const messageInput = document.getElementById('messageInput');
const sendButton = document.getElementById('sendButton');
const statusBadge = document.getElementById('statusBadge');
const newChatButton = document.getElementById('newChatButton');
const themeButton = document.getElementById('themeButton');

let isProcessing = false;
let isOffline = false;
let conversationHistory = [];

function getStoredTheme() {
  try {
    return localStorage.getItem('smartops-dark') === 'true';
  } catch {
    return false;
  }
}

function setDarkMode(enabled) {
  document.documentElement.classList.toggle('dark', enabled);
  themeButton.textContent = enabled ? '☀' : '☾';
  try {
    localStorage.setItem('smartops-dark', String(enabled));
  } catch {
    // Theme preference is optional.
  }
}

function updateStatus(online) {
  statusBadge.textContent = online ? 'Online' : 'Offline';
  statusBadge.className = `status-pill ${online ? 'online' : 'offline'}`;
}

function scrollToBottom() {
  requestAnimationFrame(() => {
    chatContainer.scrollTop = chatContainer.scrollHeight;
  });
}

function addMessage(type, content, source) {
  const row = document.createElement('div');
  row.className = `message-row ${type}`;

  if (type === 'assistant') {
    const avatar = document.createElement('img');
    avatar.className = 'message-avatar';
    avatar.src = 'icons/icon48.png';
    avatar.alt = '';
    row.appendChild(avatar);
  }

  const bubble = document.createElement('div');
  bubble.className = `message-bubble${type === 'system' ? ' system' : ''}`;
  bubble.textContent = content;

  if (source) {
    const badge = document.createElement('span');
    badge.className = 'source-badge';
    badge.textContent = getSourceLabel(source);
    bubble.appendChild(document.createTextNode(' '));
    bubble.appendChild(badge);
  }

  row.appendChild(bubble);
  chatContainer.appendChild(row);
  scrollToBottom();
  return row;
}

function showTypingIndicator() {
  const row = document.createElement('div');
  row.className = 'message-row assistant';

  const avatar = document.createElement('img');
  avatar.className = 'message-avatar';
  avatar.src = 'icons/icon48.png';
  avatar.alt = '';
  row.appendChild(avatar);

  const indicator = document.createElement('div');
  indicator.className = 'typing-indicator';
  indicator.innerHTML = '<span></span><span></span><span></span>';
  row.appendChild(indicator);

  chatContainer.appendChild(row);
  scrollToBottom();
  return row;
}

function getSourceLabel(source) {
  const labels = {
    rag: 'AI · SOP',
    'offline-cache': 'Offline FAQ',
    fallback: 'No connection'
  };
  return labels[source] || source;
}

function renderFaqTopics() {
  faqList.replaceChildren();
  FAQ.forEach((entry) => {
    const button = document.createElement('button');
    button.className = 'faq-button';
    button.type = 'button';
    button.textContent = entry.label;
    button.addEventListener('click', () => sendMessage(entry.query));
    faqList.appendChild(button);
  });
}

function resetChat() {
  conversationHistory = [];
  isOffline = false;
  chatContainer.querySelectorAll('.message-row').forEach((row) => row.remove());
  renderFaqTopics();
  updateStatus(true);
  messageInput.value = '';
  messageInput.focus();
}

async function getAssistantResponse(message) {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);

  try {
    const response = await fetch(`${BACKEND_URL}/api/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        message,
        conversation_history: conversationHistory
      }),
      signal: controller.signal
    });

    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    return await response.json();
  } finally {
    clearTimeout(timeoutId);
  }
}

async function sendMessage(message) {
  const trimmed = message.trim();
  if (!trimmed || isProcessing) return;

  isProcessing = true;
  messageInput.disabled = true;
  sendButton.disabled = true;
  messageInput.value = '';

  addMessage('user', trimmed);
  conversationHistory.push({ role: 'user', content: trimmed });
  const typing = showTypingIndicator();

  try {
    if (isOffline) throw new Error('offline');

    const data = await getAssistantResponse(trimmed);
    typing.remove();

    const answer = data.reply || data.response || 'The system returned no guidance.';
    const source = data.source || 'rag';
    addMessage('assistant', answer, source);
    conversationHistory.push({ role: 'assistant', content: answer });
    updateStatus(true);
  } catch (error) {
    typing.remove();
    const { answer, matched } = searchFaq(trimmed);

    isOffline = true;
    updateStatus(false);

    if (matched) {
      addMessage('assistant', answer, 'offline-cache');
      conversationHistory.push({ role: 'assistant', content: answer });
    } else if (error.name === 'AbortError') {
      addMessage('system', 'Request timed out. Try again or choose a topic from the FAQ.');
    } else {
      addMessage('system', 'The assistant is offline. Choose a matching topic from the FAQ below.');
    }
  } finally {
    isProcessing = false;
    messageInput.disabled = false;
    sendButton.disabled = false;
    messageInput.focus();
  }
}

messageForm.addEventListener('submit', (event) => {
  event.preventDefault();
  sendMessage(messageInput.value);
});

messageInput.addEventListener('keydown', (event) => {
  if (event.key === 'Enter' && !event.shiftKey) {
    event.preventDefault();
    messageForm.requestSubmit();
  }
});

newChatButton.addEventListener('click', resetChat);
themeButton.addEventListener('click', () => {
  setDarkMode(!document.documentElement.classList.contains('dark'));
});

async function checkBackendHealth() {
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 5000);
    const response = await fetch(`${BACKEND_URL}/api/health`, { signal: controller.signal });
    clearTimeout(timeoutId);
    isOffline = !response.ok;
    updateStatus(response.ok);
  } catch {
    isOffline = true;
    updateStatus(false);
  }
}

setDarkMode(getStoredTheme());
renderFaqTopics();
setTimeout(checkBackendHealth, 300);
messageInput.focus();
