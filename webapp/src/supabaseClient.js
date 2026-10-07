import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseKey =
  import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY ||
  import.meta.env.VITE_SUPABASE_ANON_KEY;

export const isSupabaseConfigured = Boolean(supabaseUrl && supabaseKey);

let rememberMe = (() => {
  try {
    return localStorage.getItem('smartops-remember-me') !== 'false';
  } catch {
    return true;
  }
})();

function authStorageKeys() {
  const keys = [];
  for (const storage of [localStorage, sessionStorage]) {
    for (let index = 0; index < storage.length; index += 1) {
      const key = storage.key(index);
      if (key && key.includes('-auth-token')) keys.push(key);
    }
  }
  return [...new Set(keys)];
}

function moveAuthSession(targetStorage) {
  const sourceStorage = targetStorage === localStorage ? sessionStorage : localStorage;
  for (const key of authStorageKeys()) {
    const value = sourceStorage.getItem(key);
    if (value !== null) {
      targetStorage.setItem(key, value);
      sourceStorage.removeItem(key);
    }
  }
}

const authStorage = {
  getItem(key) {
    const preferred = rememberMe ? localStorage : sessionStorage;
    const fallback = rememberMe ? sessionStorage : localStorage;
    return preferred.getItem(key) ?? fallback.getItem(key);
  },
  setItem(key, value) {
    const preferred = rememberMe ? localStorage : sessionStorage;
    const fallback = rememberMe ? sessionStorage : localStorage;
    preferred.setItem(key, value);
    fallback.removeItem(key);
  },
  removeItem(key) {
    localStorage.removeItem(key);
    sessionStorage.removeItem(key);
  },
};

export function setRememberMe(value) {
  rememberMe = Boolean(value);
  try {
    localStorage.setItem('smartops-remember-me', String(rememberMe));
    moveAuthSession(rememberMe ? localStorage : sessionStorage);
  } catch {
    // Supabase still maintains the in-memory session if browser storage is unavailable.
  }
}

export const supabase = isSupabaseConfigured
  ? createClient(supabaseUrl, supabaseKey, {
      auth: {
        autoRefreshToken: true,
        persistSession: true,
        detectSessionInUrl: true,
        storage: authStorage,
      },
    })
  : null;
