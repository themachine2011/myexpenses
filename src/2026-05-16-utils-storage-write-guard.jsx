import React, { useState, useEffect, useCallback } from 'react';
import { runMigrations, wrap } from './2026-05-16-utils-schema-migrations.js';

// Listeners for storage-write failures. The toast subscribes here.
const _writeErrorListeners = new Set();

const emitWriteError = (key, error) => {
  const event = { key, error, when: new Date().toISOString() };
  _writeErrorListeners.forEach((fn) => {
    try { fn(event); } catch (_) {}
  });
};

export const subscribeWriteErrors = (listener) => {
  _writeErrorListeners.add(listener);
  return () => _writeErrorListeners.delete(listener);
};

export const safeRead = (key, fallback) => {
  if (typeof window === 'undefined') return typeof fallback === 'function' ? fallback() : fallback;
  let raw;
  try { raw = window.localStorage.getItem(key); }
  catch (_) { return typeof fallback === 'function' ? fallback() : fallback; }
  if (raw == null) return typeof fallback === 'function' ? fallback() : fallback;
  let parsed;
  try { parsed = JSON.parse(raw); }
  catch (_) { return typeof fallback === 'function' ? fallback() : fallback; }
  try {
    const { data } = runMigrations(key, parsed);
    if (data == null) return typeof fallback === 'function' ? fallback() : fallback;
    return data;
  } catch (_) {
    return typeof fallback === 'function' ? fallback() : fallback;
  }
};

export const safeWrite = (key, value) => {
  if (typeof window === 'undefined') return false;
  try {
    const wrapped = wrap(key, value);
    window.localStorage.setItem(key, JSON.stringify(wrapped));
    return true;
  } catch (error) {
    emitWriteError(key, error);
    return false;
  }
};

export const useStoredState = (key, initial) => {
  const [val, set] = useState(() => safeRead(key, initial));
  useEffect(() => { safeWrite(key, val); }, [key, val]);
  return [val, set];
};

export const useStorageError = () => {
  const [error, setError] = useState(null);
  useEffect(() => subscribeWriteErrors((e) => setError(e)), []);
  const dismiss = useCallback(() => setError(null), []);
  return { error, dismiss };
};

export const StorageErrorToast = ({ onExportNow }) => {
  const { error, dismiss } = useStorageError();
  if (!error) return null;
  const msg = error.error && error.error.name === 'QuotaExceededError'
    ? 'Your last change was not saved — browser storage is full.'
    : 'Your last change was not saved.';
  return (
    <div
      role="alert"
      style={{
        position: 'fixed', left: '50%', bottom: 24, transform: 'translateX(-50%)',
        zIndex: 2147483647,
        maxWidth: 520,
        padding: '12px 16px',
        borderRadius: 12,
        background: 'rgba(28, 20, 20, 0.95)',
        color: '#fff',
        boxShadow: '0 12px 32px rgba(0,0,0,0.35)',
        border: '1px solid rgba(255, 90, 90, 0.6)',
        display: 'flex', alignItems: 'center', gap: 12,
        fontFamily: 'var(--font-body, system-ui)',
        fontSize: 13,
      }}>
      <span style={{ flex: 1 }}>{msg} Export your data now so you don't lose it.</span>
      {typeof onExportNow === 'function' && (
        <button
          onClick={() => { onExportNow(); dismiss(); }}
          style={{
            padding: '6px 12px', borderRadius: 8, border: 'none',
            background: '#ffb84d', color: '#1a1a1a', fontWeight: 600,
            cursor: 'pointer',
          }}>Export now</button>
      )}
      <button
        onClick={dismiss}
        style={{
          padding: '6px 10px', borderRadius: 8, border: '1px solid rgba(255,255,255,0.25)',
          background: 'transparent', color: '#fff', cursor: 'pointer',
        }}>Dismiss</button>
    </div>
  );
};
