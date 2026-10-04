// AssistFlow Widget - Content Script (Optimized)
// Injects floating chat bubble on every webpage

(function() {
  'use strict';
  
  // Prevent multiple injections
  if (window.assistFlowInjected) return;
  window.assistFlowInjected = true;

  const BACKEND_URL = 'https://assistflow-backend-ctbq.onrender.com';
  
  // State
  let isOpen = false;
  let iframeLoaded = false;
  let sidebar = null;
  let iframe = null;
  let backdrop = null;
  
  // Create floating button
  const floatingButton = document.createElement('div');
  floatingButton.id = 'assistflow-floating-btn';
  floatingButton.innerHTML = '💬';
  floatingButton.title = 'Open AssistFlow Assistant';
  
  // Create backdrop (initially hidden)
  backdrop = document.createElement('div');
  backdrop.id = 'assistflow-backdrop';
  backdrop.className = 'assistflow-backdrop-hidden';
  
  // Create sidebar container (initially hidden)
  sidebar = document.createElement('div');
  sidebar.id = 'assistflow-sidebar';
  sidebar.className = 'assistflow-closed';
  
  // Append to DOM immediately (only button visible)
  document.body.appendChild(backdrop);
  document.body.appendChild(floatingButton);
  document.body.appendChild(sidebar);
  
  // Lazy-load iframe only when first opened
  function loadIframe() {
    if (iframeLoaded) return;
    
    iframe = document.createElement('iframe');
    iframe.id = 'assistflow-iframe';
    iframe.src = chrome.runtime.getURL('iframe.html');
    iframe.allow = 'clipboard-write';
    sidebar.appendChild(iframe);
    
    iframeLoaded = true;
  }
  
  // Toggle sidebar with optimized transitions
  function toggleSidebar() {
    isOpen = !isOpen;
    
    if (isOpen) {
      // Load iframe on first open
      loadIframe();
      
      // Use requestAnimationFrame for smooth transitions
      requestAnimationFrame(() => {
        sidebar.classList.remove('assistflow-closed');
        sidebar.classList.add('assistflow-open');
        backdrop.classList.remove('assistflow-backdrop-hidden');
        backdrop.classList.add('assistflow-backdrop-visible');
        floatingButton.style.transform = 'scale(0)';
        floatingButton.style.pointerEvents = 'none';
      });
    } else {
      requestAnimationFrame(() => {
        sidebar.classList.remove('assistflow-open');
        sidebar.classList.add('assistflow-closed');
        backdrop.classList.remove('assistflow-backdrop-visible');
        backdrop.classList.add('assistflow-backdrop-hidden');
        floatingButton.style.transform = 'scale(1)';
        floatingButton.style.pointerEvents = 'auto';
      });
    }
  }
  
  // Event listeners with passive option for better scrolling performance
  floatingButton.addEventListener('click', toggleSidebar);
  backdrop.addEventListener('click', toggleSidebar);
  
  // Listen for close messages from iframe
  window.addEventListener('message', (event) => {
    if (event.data.type === 'ASSISTFLOW_CLOSE') {
      if (isOpen) toggleSidebar();
    }
  }, { passive: true });
  
  // Listen for messages from extension popup
  chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.type === 'OPEN_ASSISTFLOW') {
      if (!isOpen) toggleSidebar();
      sendResponse({ success: true });
    }
  });
  
  console.log('✅ AssistFlow widget loaded (optimized)');
})();
