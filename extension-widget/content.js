// AssistFlow Widget - Content Script
// Injects floating chat bubble on every webpage

(function() {
  'use strict';
  
  // Prevent multiple injections
  if (window.assistFlowInjected) return;
  window.assistFlowInjected = true;

  const BACKEND_URL = 'https://assistflow-backend-ctbq.onrender.com';
  
  // Create floating button
  const floatingButton = document.createElement('div');
  floatingButton.id = 'assistflow-floating-btn';
  floatingButton.innerHTML = '💬';
  floatingButton.title = 'Open AssistFlow Assistant';
  
  // Create sidebar container
  const sidebar = document.createElement('div');
  sidebar.id = 'assistflow-sidebar';
  sidebar.className = 'assistflow-closed';
  
  // Create iframe for chat interface
  const iframe = document.createElement('iframe');
  iframe.id = 'assistflow-iframe';
  iframe.src = chrome.runtime.getURL('iframe.html');
  iframe.allow = 'clipboard-write';
  
  // Create backdrop
  const backdrop = document.createElement('div');
  backdrop.id = 'assistflow-backdrop';
  backdrop.className = 'assistflow-backdrop-hidden';
  
  // Assemble components
  sidebar.appendChild(iframe);
  document.body.appendChild(backdrop);
  document.body.appendChild(floatingButton);
  document.body.appendChild(sidebar);
  
  // State
  let isOpen = false;
  
  // Toggle sidebar
  function toggleSidebar() {
    isOpen = !isOpen;
    
    if (isOpen) {
      sidebar.classList.remove('assistflow-closed');
      sidebar.classList.add('assistflow-open');
      backdrop.classList.remove('assistflow-backdrop-hidden');
      backdrop.classList.add('assistflow-backdrop-visible');
      floatingButton.style.transform = 'scale(0)';
    } else {
      sidebar.classList.remove('assistflow-open');
      sidebar.classList.add('assistflow-closed');
      backdrop.classList.remove('assistflow-backdrop-visible');
      backdrop.classList.add('assistflow-backdrop-hidden');
      floatingButton.style.transform = 'scale(1)';
    }
  }
  
  // Event listeners
  floatingButton.addEventListener('click', toggleSidebar);
  backdrop.addEventListener('click', toggleSidebar);
  
  // Listen for close messages from iframe
  window.addEventListener('message', (event) => {
    if (event.data.type === 'ASSISTFLOW_CLOSE') {
      if (isOpen) toggleSidebar();
    }
  });
  
  // Listen for messages from extension popup
  chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.type === 'OPEN_ASSISTFLOW') {
      if (!isOpen) toggleSidebar();
      sendResponse({ success: true });
    }
  });
  
  console.log('✅ AssistFlow widget loaded');
})();
