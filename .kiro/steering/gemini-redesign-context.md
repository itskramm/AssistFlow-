---
inclusion: manual
name: gemini-redesign
description: Context for AssistFlow Gemini-style UI redesign implementation
---

# AssistFlow Gemini Redesign — Implementation Context

## 🎯 Project Overview

You are refactoring the AssistFlow web application frontend to adopt a modern, Google Gemini-inspired design system while preserving all existing functionality.

## 📁 Key Files to Work With

### Frontend (Web App)
- **`webapp/src/App.jsx`** — Main application component (586 lines)
- **`webapp/src/main.jsx`** — Entry point with layout wrapper
- **`webapp/src/index.css`** — Tailwind CSS styles + custom CSS
- **`webapp/src/offlineFaq.js`** — Offline FAQ logic (do not modify)

### Reference Files
- **`DESIGN_GUIDE.md`** — Complete design specifications
- **`extension/sidepanel/src/App.jsx`** — Extension version (for reference)

## 🚫 What NOT to Touch

### Preserve These Elements:
1. **All Backend Integration** — FastAPI endpoints, fetch calls, error handling
2. **Offline Logic** — `isOffline.current`, `searchFaq()`, health poll
3. **State Management** — All `useState`, `useRef`, `useEffect` hooks
4. **Message Handling** — `sendMessage()`, `handleRetry()`, `handleFeedback()`
5. **Dark Mode Toggle** — `localStorage` persistence logic
6. **offlineFaq.js** — Entire file unchanged

### Do Not Add:
- External UI libraries (Material-UI, Ant Design, etc.)
- New npm dependencies
- Heavy JavaScript animations (use CSS transitions)

## 🎨 Design Philosophy Summary

### Visual Transformation
**From:** Heavy purple gradient, solid colors, basic layout  
**To:** Clean white/slate canvas, subtle ambient glows, glassmorphism

### Layout Changes
**Before:**
```
[Static Welcome Text] | [Chat Panel]
```

**After:**
```
[Interactive Workspace with Cards] | [Refined Chat Panel]
```

### Key Visual Updates
1. **Main Canvas** — Replace purple gradient with `bg-slate-50` or `bg-white`
2. **Ambient Glow** — Add subtle animated gradient at top
3. **Suggestion Cards** — Interactive prompt cards with icons
4. **Chat Messages** — Borderless AI responses, soft user bubbles
5. **Status Badge** — Sleek pill with glowing dot
6. **Input Area** — Floating pill-shaped container

## 🧩 Component Structure

### New Components to Create

```jsx
// 1. MainWorkspace.jsx
export function MainWorkspace({ onCardClick }) {
  return (
    <div className="relative">
      <AmbientGlow />
      <GreetingHeader />
      <SuggestionCardsGrid onCardClick={onCardClick} />
    </div>
  );
}

// 2. AmbientGlow.jsx
export function AmbientGlow() {
  return (
    <div className="absolute inset-x-0 top-0 h-80 pointer-events-none overflow-hidden">
      <div className="absolute inset-0 bg-gradient-to-r from-blue-500/10 via-indigo-500/10 to-purple-500/10 blur-3xl opacity-60 dark:from-blue-600/20 dark:via-indigo-600/20 dark:to-purple-600/20 dark:opacity-40" />
    </div>
  );
}

// 3. GreetingHeader.jsx
export function GreetingHeader() {
  return (
    <div className="relative z-10 max-w-4xl mx-auto px-6 pt-24 pb-12">
      <h1 className="text-5xl md:text-6xl font-bold leading-tight mb-4 bg-clip-text text-transparent bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600">
        Hello. How can AssistFlow support your agents today?
      </h1>
      <p className="text-lg text-slate-600 dark:text-slate-400 leading-relaxed">
        Select a common scenario below or describe any issue in the chat panel.
      </p>
    </div>
  );
}

// 4. SuggestionCard.jsx
export function SuggestionCard({ icon, title, description, query, onClick }) {
  return (
    <button
      onClick={() => onClick(query)}
      className="group relative p-6 bg-white/60 dark:bg-slate-900/60 backdrop-blur-md border border-slate-200/60 dark:border-slate-700/60 rounded-2xl shadow-sm hover:shadow-md transition-all duration-300 text-left"
    >
      <div className="absolute inset-0 bg-gradient-to-br from-blue-500/5 to-indigo-500/5 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity" />
      <div className="relative z-10">
        <div className="w-10 h-10 mb-3 rounded-xl bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center text-xl">
          {icon}
        </div>
        <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100 mb-2">
          {title}
        </h3>
        <p className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
          {description}
        </p>
      </div>
    </button>
  );
}

// 5. StatusBadge.jsx
export function StatusBadge({ status }) {
  const variants = {
    online: {
      bg: 'bg-green-50 dark:bg-green-900/30',
      text: 'text-green-700 dark:text-green-400',
      border: 'border-green-200 dark:border-green-800',
      dot: 'bg-green-500'
    },
    offline: {
      bg: 'bg-amber-50 dark:bg-amber-900/30',
      text: 'text-amber-700 dark:text-amber-400',
      border: 'border-amber-200 dark:border-amber-800',
      dot: 'bg-amber-500'
    }
  };
  
  const variant = variants[status.toLowerCase()] || variants.offline;
  
  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${variant.bg} ${variant.text} border ${variant.border}`}>
      <span className={`w-1.5 h-1.5 rounded-full ${variant.dot} ${status === 'online' ? 'animate-pulse' : ''}`} />
      {status}
    </span>
  );
}
```

## 📋 Suggestion Cards Data

### Card Definitions
```jsx
const suggestionCards = [
  {
    id: 1,
    icon: '🔐',
    title: 'CRM Login Failure',
    description: 'Step-by-step password reset and account unlock procedures',
    query: 'Agent cannot log into Salesforce',
    color: 'blue'
  },
  {
    id: 2,
    icon: '📋',
    title: 'Queue Access Denied',
    description: 'Permission set assignment and role configuration guide',
    query: 'Agent has no access to queue',
    color: 'indigo'
  },
  {
    id: 3,
    icon: '🔑',
    title: 'SSO Authentication',
    description: 'Single Sign-On troubleshooting and VPN connectivity checks',
    query: 'SSO authentication not working',
    color: 'purple'
  },
  {
    id: 4,
    icon: '⬆️',
    title: 'Ticket Escalation',
    description: 'Tier 2/3 escalation procedures and supervisor routing',
    query: 'How to escalate a ticket to Tier 2',
    color: 'green'
  },
  {
    id: 5,
    icon: '📞',
    title: 'Call Quality Issues',
    description: 'Audio troubleshooting, echo cancellation, and network diagnostics',
    query: 'Customer cannot hear agent',
    color: 'orange'
  },
  {
    id: 6,
    icon: '⚠️',
    title: 'System Downtime',
    description: 'Offline workflow procedures and backup dialer instructions',
    query: 'CRM system is down',
    color: 'red'
  }
];
```

## 🔄 Implementation Flow

### Step 1: Update Layout Structure (main.jsx)
```jsx
// Before
<div className="webapp-container">
  <div className="main-content">{/* Static welcome */}</div>
  <div className="side-panel"><App /></div>
</div>

// After
<div className="webapp-container">
  <div className="main-workspace">
    <MainWorkspace onCardClick={handleCardClick} />
  </div>
  <div className="side-panel">
    <App ref={chatRef} />
  </div>
</div>
```

### Step 2: Refactor App.jsx Chat Panel
1. Update header with new StatusBadge
2. Redesign message bubbles (remove heavy borders)
3. Add hover-reveal action buttons
4. Style input as floating pill
5. Update loading state with new dots

### Step 3: Update index.css
1. Add gradient text utility
2. Update canvas background colors
3. Add glassmorphism utilities
4. Refine shadow scale
5. Update dark mode colors

### Step 4: Connect Card Clicks
```jsx
// In main.jsx or App.jsx
const handleCardClick = (query) => {
  // Populate input and trigger send
  setInput(query);
  sendMessage(query);
  
  // Optional: Smooth scroll to chat
  chatPanelRef.current?.scrollIntoView({ behavior: 'smooth' });
};
```

## 🎨 CSS Utilities to Add

### Gradient Text
```css
.gradient-text {
  @apply bg-clip-text text-transparent bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600;
}
```

### Glassmorphism Card
```css
.glass-card {
  @apply backdrop-blur-md bg-white/60 dark:bg-slate-900/60 
         border border-slate-200/60 dark:border-slate-700/60 
         shadow-sm hover:shadow-md transition-all duration-300;
}
```

### Ambient Glow
```css
.ambient-glow {
  @apply absolute inset-0 
         bg-gradient-to-r from-blue-500/10 via-indigo-500/10 to-purple-500/10 
         dark:from-blue-600/20 dark:via-indigo-600/20 dark:to-purple-600/20
         blur-3xl opacity-60 dark:opacity-40;
}
```

## ✅ Testing Checklist

After implementation, verify:

### Functionality
- [ ] Suggestion cards click → populate chat and send query
- [ ] Backend API calls work unchanged
- [ ] Offline mode detection works
- [ ] Auto-recovery health poll works
- [ ] Dark mode toggle persists
- [ ] Message history displays correctly
- [ ] Feedback buttons (thumbs up/down) work
- [ ] Copy button works
- [ ] Retry button works

### Visual Quality
- [ ] Gradient text renders correctly
- [ ] Glassmorphism blur effects work
- [ ] Ambient glow is subtle and pleasing
- [ ] Card hover states are smooth
- [ ] Status badge dot animates
- [ ] Loading dots bounce correctly
- [ ] Dark mode looks polished
- [ ] Responsive layout works (mobile, tablet, desktop)

### Accessibility
- [ ] Keyboard navigation works
- [ ] Focus indicators visible
- [ ] Screen reader friendly
- [ ] Color contrast meets WCAG AA

## 🚨 Common Pitfalls

### 1. Breaking Offline Logic
**Wrong:**
```jsx
// Don't modify the offline detection logic
if (backendAvailable) { // ❌
  callBackend();
}
```

**Right:**
```jsx
// Keep existing offline detection
if (isOffline.current) {
  const { answer, matched } = searchFaq(trimmed);
  // ... existing logic
}
```

### 2. Over-complicating Animations
**Wrong:**
```jsx
// Don't add heavy JS animations
import { motion } from 'framer-motion'; // ❌
```

**Right:**
```css
/* Use CSS transitions */
.card {
  @apply transition-all duration-300;
}
```

### 3. Breaking Dark Mode
**Wrong:**
```jsx
// Don't hardcode colors
<div style={{ background: '#ffffff' }}> // ❌
```

**Right:**
```jsx
// Use Tailwind dark mode classes
<div className="bg-white dark:bg-slate-900">
```

## 📚 Reference Code Snippets

### Complete Chat Message (AI) Example
```jsx
<div className="flex gap-3 mb-4 group">
  {/* Avatar */}
  <div className="flex-shrink-0 w-8 h-8 rounded-lg bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center">
    <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
    </svg>
  </div>
  
  {/* Content */}
  <div className="flex-1 min-w-0">
    <div className="bg-transparent rounded-2xl px-4 py-3 text-slate-900 dark:text-slate-100">
      {steps ? (
        <ol className="space-y-2 list-decimal list-inside">
          {steps.map((step, i) => (
            <li key={i} className="leading-relaxed">{step}</li>
          ))}
        </ol>
      ) : (
        <p className="leading-relaxed">{message.text}</p>
      )}
    </div>
    
    {/* Actions (hover-reveal) */}
    <div className="flex items-center gap-2 mt-2 px-4 opacity-0 group-hover:opacity-100 transition-opacity">
      <span className="text-xs text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-900/30 px-2 py-0.5 rounded-md">
        {message.source === 'offline-cache' ? 'Offline cache' : 'AI · SOP'}
      </span>
      <button className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 transition-colors">
        👍
      </button>
      <button className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 transition-colors">
        👎
      </button>
      <button className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 transition-colors">
        📋
      </button>
    </div>
  </div>
</div>
```

### Complete Input Area Example
```jsx
<div className="sticky bottom-0 z-20 p-4 border-t border-slate-200 dark:border-slate-800 bg-white/80 dark:bg-slate-900/80 backdrop-blur-md">
  <form onSubmit={handleSubmit} className="relative">
    <div className="flex items-end gap-2 p-2 bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-2xl shadow-lg focus-within:border-blue-500 dark:focus-within:border-blue-400 transition-colors">
      <textarea
        ref={inputRef}
        value={input}
        onChange={(e) => setInput(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            handleSubmit(e);
          }
        }}
        rows="1"
        placeholder="Describe the issue or ask for a procedure..."
        disabled={isLoading}
        className="flex-1 px-3 py-2 bg-transparent border-0 outline-none resize-none text-sm text-slate-900 dark:text-slate-100 placeholder:text-slate-400 max-h-32"
      />
      <button
        type="submit"
        disabled={isLoading || !input.trim()}
        className="flex-shrink-0 w-8 h-8 rounded-lg bg-blue-600 hover:bg-blue-700 disabled:bg-slate-300 dark:disabled:bg-slate-700 text-white flex items-center justify-center transition-colors disabled:cursor-not-allowed"
      >
        {isLoading ? (
          <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
          </svg>
        ) : (
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 10l7-7m0 0l7 7m-7-7v18" />
          </svg>
        )}
      </button>
    </div>
  </form>
</div>
```

## 🎯 Success Metrics

After implementation, the design should achieve:

1. **Visual Polish:** Clean, modern aesthetic that feels premium
2. **Functional Parity:** All features work exactly as before
3. **Performance:** No bundle size increase, smooth 60fps animations
4. **Accessibility:** Maintains WCAG AA compliance
5. **Responsive:** Works beautifully on desktop, tablet, and mobile

---

**Implementation Priority:** High  
**Estimated Effort:** 4-6 hours  
**Risk Level:** Medium (visual changes with functional preservation)  
**Documentation:** DESIGN_GUIDE.md (complete specifications)
