// SmartOpsSupportHub Side Panel Logic

const BACKEND_URL = 'https://assistflow-backend-ctbq.onrender.com';

const chatContainer = document.getElementById('chatContainer');
const messageForm = document.getElementById('messageForm');
const messageInput = document.getElementById('messageInput');
const sendButton = document.getElementById('sendButton');
const statusBadge = document.getElementById('statusBadge');

let conversationHistory = [];
let isProcessing = false;

// Quick topic buttons
document.querySelectorAll('.topic-button').forEach(button => {
  button.addEventListener('click', () => {
    const topic = button.dataset.topic;
    messageInput.value = topic;
    sendMessage(topic);
  });
});

// Form submission
messageForm.addEventListener('submit', (e) => {
  e.preventDefault();
  const message = messageInput.value.trim();
  if (message) {
    sendMessage(message);
  }
});

// Send message on Enter
messageInput.addEventListener('keypress', (e) => {
  if (e.key === 'Enter' && !e.shiftKey && !isProcessing) {
    e.preventDefault();
    const message = messageInput.value.trim();
    if (message) {
      sendMessage(message);
    }
  }
});

async function sendMessage(message) {
  if (!message || isProcessing) return;

  isProcessing = true;
  messageInput.disabled = true;
  sendButton.disabled = true;
  messageInput.value = '';

  // Add user message
  addMessage('user', message);

  // Add to history
  conversationHistory.push({
    role: 'user',
    content: message
  });

  // Show typing indicator
  const typingIndicator = showTypingIndicator();

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 30000);

    const response = await fetch(`${BACKEND_URL}/api/chat`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        message: message,
        conversation_history: conversationHistory
      }),
      signal: controller.signal
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }

    const data = await response.json();

    // Remove typing indicator
    typingIndicator.remove();

    // Add assistant response
    addMessage('assistant', data.response || data.reply || 'No response from assistant');

    // Update conversation history
    conversationHistory.push({
      role: 'assistant',
      content: data.response || data.reply
    });

    // Show source if available
    if (data.source) {
      const sourceText = getSourceLabel(data.source);
      addSourceBadge(sourceText);
    }

    // Update status
    updateStatus('online');

  } catch (error) {
    console.error('Chat error:', error);
    typingIndicator.remove();

    if (error.name === 'AbortError') {
      addMessage('system', '⚠️ Request timed out. Please try again.');
    } else {
      addMessage('system', '⚠️ Connection error. The assistant is currently offline.');
      updateStatus('offline');
    }
  } finally {
    isProcessing = false;
    messageInput.disabled = false;
    sendButton.disabled = false;
    messageInput.focus();
  }
}

function addMessage(type, content) {
  const messageRow = document.createElement('div');
  messageRow.className = `message-row ${type}`;

  const bubble = document.createElement('div');
  bubble.className = type === 'system' ? 'message-bubble system' : 'message-bubble';
  bubble.textContent = content;

  messageRow.appendChild(bubble);
  chatContainer.appendChild(messageRow);

  // Smooth scroll
  requestAnimationFrame(() => {
    chatContainer.scrollTop = chatContainer.scrollHeight;
  });
}

function showTypingIndicator() {
  const messageRow = document.createElement('div');
  messageRow.className = 'message-row assistant';

  const indicator = document.createElement('div');
  indicator.className = 'typing-indicator';
  indicator.innerHTML = '<span></span><span></span><span></span>';

  messageRow.appendChild(indicator);
  chatContainer.appendChild(messageRow);

  requestAnimationFrame(() => {
    chatContainer.scrollTop = chatContainer.scrollHeight;
  });

  return messageRow;
}

function addSourceBadge(text) {
  const lastAssistantRow = Array.from(chatContainer.querySelectorAll('.message-row.assistant'))
    .filter(row => !row.querySelector('.typing-indicator'))
    .pop();

  if (lastAssistantRow) {
    const bubble = lastAssistantRow.querySelector('.message-bubble');
    if (bubble) {
      const badge = document.createElement('div');
      badge.className = 'source-badge';
      badge.textContent = text;
      bubble.appendChild(badge);
    }
  }
}

function getSourceLabel(source) {
  const labels = {
    'rag': '📚 AI · SOP',
    'offline-cache': '📦 Offline cache',
    'fallback': '⚠️ No connection'
  };
  return labels[source] || source;
}

function updateStatus(status) {
  if (status === 'online') {
    statusBadge.textContent = '✅ Online';
    statusBadge.className = 'status-badge online';
  } else {
    statusBadge.textContent = '⚠️ Offline';
    statusBadge.className = 'status-badge offline';
  }
}

// Check backend health on load
async function checkBackendHealth() {
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 5000);

    const response = await fetch(`${BACKEND_URL}/api/health`, {
      signal: controller.signal
    });

    clearTimeout(timeoutId);

    if (response.ok) {
      updateStatus('online');
      console.log('✅ Backend connected');
    } else {
      updateStatus('offline');
    }
  } catch (error) {
    console.error('Backend health check failed:', error);
    updateStatus('offline');
  }
}

// Check health on load (debounced)
setTimeout(checkBackendHealth, 500);
