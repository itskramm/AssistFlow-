// AssistFlow Chat Interface Logic

const BACKEND_URL = 'https://assistflow-backend-ctbq.onrender.com';

const messagesContainer = document.getElementById('messages');
const messageInput = document.getElementById('messageInput');
const sendBtn = document.getElementById('sendBtn');
const closeBtn = document.getElementById('closeBtn');

let conversationHistory = [];

// Close sidebar
closeBtn.addEventListener('click', () => {
  window.parent.postMessage({ type: 'ASSISTFLOW_CLOSE' }, '*');
});

// Send message on Enter key
messageInput.addEventListener('keypress', (e) => {
  if (e.key === 'Enter' && !e.shiftKey) {
    e.preventDefault();
    sendMessage();
  }
});

// Send message on button click
sendBtn.addEventListener('click', sendMessage);

async function sendMessage() {
  const message = messageInput.value.trim();
  if (!message) return;

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
    const response = await fetch(`${BACKEND_URL}/api/chat`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        message: message,
        conversation_history: conversationHistory
      })
    });

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
    addMessage('system', '⚠️ Connection error. The assistant is currently offline. Please try again later.');
  } finally {
    // Re-enable input
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
  
  // Scroll to bottom
  messagesContainer.scrollTop = messagesContainer.scrollHeight;
}

function showTypingIndicator() {
  const indicator = document.createElement('div');
  indicator.className = 'typing-indicator';
  indicator.innerHTML = '<span></span><span></span><span></span>';
  messagesContainer.appendChild(indicator);
  messagesContainer.scrollTop = messagesContainer.scrollHeight;
  return indicator;
}

// Check backend health on load
async function checkBackendHealth() {
  try {
    const response = await fetch(`${BACKEND_URL}/api/health`);
    if (response.ok) {
      console.log('✅ Backend connected');
    } else {
      addMessage('system', '⚠️ Backend connection issue detected');
    }
  } catch (error) {
    console.error('Backend health check failed:', error);
    addMessage('system', '⚠️ Cannot connect to backend. Running in offline mode.');
  }
}

checkBackendHealth();
