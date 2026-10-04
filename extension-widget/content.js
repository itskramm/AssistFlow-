// SmartOpsSupportHub floating page launcher

(function () {
  'use strict';

  if (window.__smartOpsSupportHubInjected) return;
  window.__smartOpsSupportHubInjected = true;

  const root = document.createElement('div');
  root.id = 'smartops-widget-root';
  root.innerHTML = `
    <button
      id="smartops-widget-button"
      type="button"
      aria-label="Open SmartOpsSupportHub"
      title="Open SmartOpsSupportHub"
    >
      <img src="${chrome.runtime.getURL('icons/icon128.png')}" alt="">
    </button>
    <div id="smartops-widget-backdrop" hidden></div>
    <section
      id="smartops-widget-panel"
      role="dialog"
      aria-label="SmartOpsSupportHub"
      aria-hidden="true"
    >
      <button
        id="smartops-widget-close"
        type="button"
        aria-label="Close SmartOpsSupportHub"
        title="Close"
      >×</button>
      <iframe
        title="SmartOpsSupportHub"
        src="${chrome.runtime.getURL('sidepanel.html')}?embedded=1"
        allow="clipboard-write"
      ></iframe>
    </section>
  `;

  const appendWidget = () => {
    if (document.documentElement && !document.getElementById('smartops-widget-root')) {
      document.documentElement.appendChild(root);
    }
  };

  appendWidget();
  if (!root.isConnected) {
    document.addEventListener('DOMContentLoaded', appendWidget, { once: true });
  }

  const button = root.querySelector('#smartops-widget-button');
  const close = root.querySelector('#smartops-widget-close');
  const backdrop = root.querySelector('#smartops-widget-backdrop');
  const panel = root.querySelector('#smartops-widget-panel');

  function setOpen(open) {
    panel.classList.toggle('smartops-widget-panel-open', open);
    button.classList.toggle('smartops-widget-button-hidden', open);
    backdrop.hidden = !open;
    panel.setAttribute('aria-hidden', String(!open));
  }

  button.addEventListener('click', () => setOpen(true));
  close.addEventListener('click', () => setOpen(false));
  backdrop.addEventListener('click', () => setOpen(false));

  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape') setOpen(false);
  });
})();
