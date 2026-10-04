// Popup logic for AssistFlow extension

const BACKEND_URL = 'https://assistflow-backend-ctbq.onrender.com';

const statusEl = document.getElementById('status');
const openChatBtn = document.getElementById('openChat');

// Check backend health
async function checkHealth() {
  try {
    const response = await fetch(`${BACKEND_URL}/api/health`);
    if (response.ok) {
      statusEl.textContent = '✅ Online and ready';
      statusEl.className = 'status online';
    } else {
      statusEl.textContent = '⚠️ Backend issue detected';
      statusEl.className = 'status offline';
    }
  } catch (error) {
    statusEl.textContent = '❌ Offline';
    statusEl.className = 'status offline';
  }
}

// Open chat by sending message to active tab
openChatBtn.addEventListener('click', async () => {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  
  chrome.tabs.sendMessage(tab.id, { type: 'OPEN_ASSISTFLOW' }, (response) => {
    if (chrome.runtime.lastError) {
      console.error('Error:', chrome.runtime.lastError);
      statusEl.textContent = '⚠️ Please refresh the page';
      statusEl.className = 'status offline';
    } else {
      window.close();
    }
  });
});

checkHealth();
