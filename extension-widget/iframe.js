// AssistFlow Chat Interface Logic (Optimized)

const BACKEND_URL = 'https://assistflow-backend-ctbq.onrender.com';

const messagesContainer = document.getElementById('messages');
const messageInput = document.getElementById('messageInput');
const sendBtn = document.getElementById('sendBtn');
const closeBtn = document.getElementById('closeBtn');

let conversationHistory = [];
let isProcessing = false;

// Close sidebar
closeBtn.addEventListener('click', () => {
  window.parent.postMessage({ type: 'ASSISTFLOW_CLOSE' }, '*');
});

// Send message on Enter key
messageInput.addEventListener('keypress', (e) => {
  if (e.key === 'Enter' && !e.shiftKey && !isProcessing) {
    e.preventDefault();
    sendMessage();
  }
});

// Send message on button click
sendBtn.addEventListener('click', sendMessage);

async function sendMessage() {
  const message = messageInput.value.trim();
  if (!message || isProcessing) return;

  // Prevent multiple submissions
  isProcessing = true;
  
  // Disable input
  messageInput.disabled = true;
  sendBtn.disabled = true;
  messageInput.value = '';

  // Add user message to UI
  addMessage('user', message);

  // Add to conversation history
  conversationHistory.push({
    role: 'user',
    content: message
  });

  // Show typing indicator
  const typingIndicator = showTypingIndicator();

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 30000); // 30s timeout

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
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = await response.json();

    // Remove typing indicator
    typingIndicator.remove();

    // Add assistant response
    addMessage('assistant', data.response);

    // Update conversation history
    conversationHistory.push({
      role: 'assistant',
      content: data.response
    });

    // Show sources if available
    if (data.sources && data.sources.length > 0) {
      const sourcesText = `📚 Sources: ${data.sources.join(', ')}`;
      addMessage('system', sourcesText);
    }

  } catch (error) {
    console.error('Chat error:', error);
    typingIndicator.remove();
    
    if (error.name === 'AbortError') {
      addMessage('system', '⚠️ Request timed out. Please try again.');
    } else {
      addMessage('system', '⚠️ Connection error. The assistant is currently offline. Please try again later.');
    }
  } finally {
    // Re-enable input
    isProcessing = false;
    messageInput.disabled = false;
    sendBtn.disabled = false;
    messageInput.focus();
  }
}

function addMessage(type, content) {
  const messageDiv = document.createElement('div');
  messageDiv.className = `message ${type}`;
  messageDiv.textContent = content;
  messagesContainer.appendChild(messageDiv);
  
  // Use requestAnimationFrame for smoother scrolling
  requestAnimationFrame(() => {
    messagesContainer.scrollTop = messagesContainer.scrollHeight;
  });
}

function showTypingIndicator() {
  const indicator = document.createElement('div');
  indicator.className = 'typing-indicator';
  indicator.innerHTML = '<span></span><span></span><span></span>';
  messagesContainer.appendChild(indicator);
  
  requestAnimationFrame(() => {
    messagesContainer.scrollTop = messagesContainer.scrollHeight;
  });
  
  return indicator;
}

// Check backend health on load (with caching)
let healthCheckDone = false;
async function checkBackendHealth() {
  if (healthCheckDone) return;
  
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 5000); // 5s timeout
    
    const response = await fetch(`${BACKEND_URL}/api/health`, {
      signal: controller.signal
    });
    
    clearTimeout(timeoutId);
    
    if (response.ok) {
      console.log('✅ Backend connected');
      healthCheckDone = true;
    } else {
      addMessage('system', '⚠️ Backend connection issue detected');
    }
  } catch (error) {
    console.error('Backend health check failed:', error);
    addMessage('system', '⚠️ Cannot connect to backend. Running in offline mode.');
  }
}

// Debounced health check
let healthCheckTimer;
function scheduleHealthCheck() {
  clearTimeout(healthCheckTimer);
  healthCheckTimer = setTimeout(checkBackendHealth, 500);
}

scheduleHealthCheck();
