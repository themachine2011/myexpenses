import { useEffect, useRef } from 'react';
import { safeRead, safeWrite } from './2026-05-16-utils-storage-write-guard.jsx';

const SETTINGS_KEY = 'aurum.backup.settings.v1';
const DEFAULT_INTERVAL_DAYS = 7;
const MS_PER_DAY = 24 * 60 * 60 * 1000;

export const getBackupSettings = () => {
  const raw = safeRead(SETTINGS_KEY, null);
  return {
    intervalDays: Number(raw?.intervalDays) > 0 ? Number(raw.intervalDays) : DEFAULT_INTERVAL_DAYS,
    lastAutoBackupAt: raw?.lastAutoBackupAt || null,
  };
};

export const setBackupSettings = (patch) => {
  const cur = getBackupSettings();
  const next = { ...cur, ...patch };
  safeWrite(SETTINGS_KEY, next);
  return next;
};

export const buildBackupPayload = (ctx) => {
  const exportable = (ctx?.transactions || []).filter((t) => !t.locked);
  return {
    schema: 'aurum.fullbackup.v1',
    exportedAt: new Date().toISOString(),
    count: exportable.length,
    transactions: exportable,
    rules:     ctx?.rules     || [],
    recurring: ctx?.recurring || [],
    budgets:   ctx?.budgets   || {},
    goals:     ctx?.goals     || [],
    debts:     ctx?.debtsState || [],
    reminders: ctx?.reminders || [],
    nwHistory: ctx?.nwHistory || [],
  };
};

export const downloadBackup = (payload, { auto = false } = {}) => {
  if (typeof window === 'undefined' || typeof document === 'undefined') return;
  const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  const stamp = new Date().toISOString().slice(0, 10);
  a.href = url;
  a.download = auto ? `aurum-autobackup-${stamp}.json` : `aurum-backup-${stamp}.json`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
};

export const useAutoBackup = (ctx) => {
  const fired = useRef(false);
  useEffect(() => {
    if (fired.current) return;
    fired.current = true;
    const { intervalDays, lastAutoBackupAt } = getBackupSettings();
    const dueSinceMs = intervalDays * MS_PER_DAY;
    const last = lastAutoBackupAt ? new Date(lastAutoBackupAt).getTime() : 0;
    if (last && Date.now() - last < dueSinceMs) return;
    if (!ctx || !Array.isArray(ctx.transactions)) return;
    try {
      const payload = buildBackupPayload(ctx);
      downloadBackup(payload, { auto: true });
      setBackupSettings({ lastAutoBackupAt: new Date().toISOString() });
    } catch (_) {
      // Silent — user can still backup manually.
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
};
