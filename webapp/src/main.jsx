import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App.jsx';
import './index.css';

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <div className="webapp-container">
      <div className="main-content">
        <div className="welcome-panel">
          <h1>AssistFlow</h1>
          <p>
            AI-powered workplace support for call center agents.
            Real-time troubleshooting guidance, SOP procedures, and offline support
            — all in one place.
          </p>
        </div>
      </div>
      <div className="side-panel">
        <App />
      </div>
    </div>
  </React.StrictMode>
);
