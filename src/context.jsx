import React, { createContext, useContext, useState, useMemo, useEffect } from 'react';
import { FONT_PAIRS, buildTokens, fmtCurrency } from './tokens.jsx';
import { useStoredState, safeRead, safeWrite } from './2026-05-16-utils-storage-write-guard.jsx';
import { validateTransaction, validatePatch } from './2026-05-16-utils-transaction-form-validation.js';
import { findDuplicate, partitionDuplicates, buildDuplicateIndex } from './2026-05-17-utils-duplicate-detection.js';
import {
  categoryColor,
  getDefaultCategoryColor,
  isValidHexColor,
  normalizeCategoryColorOverrides,
  normalizeCategoryName,
  USELESS_CATEGORY,
} from './2026-05-19-utils-category-colors.js';

export { validateTransaction, validatePatch };
export { findDuplicate, partitionDuplicates, buildDuplicateIndex };

export const AppContext = createContext(null);
export const useAppContext = () => useContext(AppContext);

export const generateId = () => `tx-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;

export const MOTO_AMOUNT = 2191;
export const MOTO_COUNT  = 48;
export const MOTO_PAID_COUNT = 12;
const MOTO_START_YEAR = 2025;
const MOTO_START_MONTH = 4;
const MOTO_DUE_DAY = 18;

export const CATEGORIES = [
  'Income',
  'Clothing',
  'Convenience Store',
  'Debts',
  'Financing',
  'Gas',
  'Health',
  'Insurance',
  'Online Subscriptions',
  'Restaurants',
  'Trips',
  'Uber',
  USELESS_CATEGORY,
  'Zaffari',
];

export const DEFAULT_CATEGORY = 'Debts';
export const DEFAULT_SPLIT_CATEGORY = 'Restaurants';

const normalizeStoredCategory = (category, fallback = USELESS_CATEGORY) =>
  normalizeCategoryName(category || fallback);

const normalizeRecordCategory = (record, fallback = USELESS_CATEGORY) => {
  const nextCategory = normalizeStoredCategory(record?.category, fallback);
  return nextCategory === record?.category ? record : { ...record, category: nextCategory };
};

const normalizeCategoryMapKeys = (map = {}) => {
  let changed = false;
  const next = {};
  for (const [key, value] of Object.entries(map || {})) {
    const normalizedKey = normalizeStoredCategory(key);
    if (normalizedKey !== key) changed = true;
    next[normalizedKey] = Math.max(Number(next[normalizedKey]) || 0, Number(value) || 0);
  }
  if (Object.keys(next).length !== Object.keys(map || {}).length) changed = true;
  return changed ? next : map;
};

export const generateMotoInstallments = () => {
  const out = [];
  for (let i = 0; i < MOTO_COUNT; i++) {
    const d = new Date(MOTO_START_YEAR, MOTO_START_MONTH + i, MOTO_DUE_DAY);
    out.push({
      id: `moto-${i}`,
      locked: true,
      type: 'expense',
      amount: MOTO_AMOUNT,
      description: `Triumph Street Triple RS installment ${i + 1}/${MOTO_COUNT}`,
      category: 'Financing',
      paymentMethod: 'Bank Transfer',
      date: d.toISOString(),
      installmentIndex: i,
      status: i < MOTO_PAID_COUNT ? 'paid' : 'pending',
    });
  }
  return out;
};

export const generateDebtInstallments = (debt) => {
  const total = Number(debt.totalDebit) || 0;
  const n = Number(debt.installments) || 1;
  const startDate = new Date(debt.startDate || Date.now());
  const base = Math.floor((total / n) * 100) / 100;
  const last = Math.round((total - base * (n - 1)) * 100) / 100;
  const out = [];
  for (let i = 0; i < n; i++) {
    const d = new Date(startDate.getFullYear(), startDate.getMonth() + i, startDate.getDate());
    out.push({
      id: `debt-${debt.id}-${i}`,
      locked: true,
      debtId: debt.id,
      type: 'expense',
      amount: i === n - 1 ? last : base,
      description: `${debt.creditor} · ${i + 1}/${n}`,
      category: 'Debt',
      paymentMethod: 'Bank Transfer',
      date: d.toISOString(),
    });
  }
  return out;
};

export const TX_CSV_FIELDS = ['id','date','type','amount','description','category','paymentMethod'];

export const transactionsToCSV = (txs) => {
  const escape = (v) => {
    const s = v == null ? '' : String(v);
    return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  const head = TX_CSV_FIELDS.join(',');
  const body = txs.map((t) => TX_CSV_FIELDS.map((f) => escape(f === 'category' ? normalizeCategoryName(t[f]) : t[f])).join(',')).join('\n');
  return head + '\n' + body;
};

export const parseTransactionsCSV = (text) => {
  const rows = [];
  let row = [];
  let cur = '';
  let inQuotes = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (inQuotes) {
      if (c === '"' && text[i + 1] === '"') { cur += '"'; i++; }
      else if (c === '"') inQuotes = false;
      else cur += c;
    } else {
      if (c === '"') inQuotes = true;
      else if (c === ',') { row.push(cur); cur = ''; }
      else if (c === '\n' || c === '\r') {
        if (cur || row.length) { row.push(cur); rows.push(row); row = []; cur = ''; }
        if (c === '\r' && text[i + 1] === '\n') i++;
      } else cur += c;
    }
  }
  if (cur || row.length) { row.push(cur); rows.push(row); }
  if (!rows.length) return { rows: [], skipped: 0 };
  const head = rows.shift().map((h) => h.trim());
  let skipped = 0;
  const parsed = rows.map((r) => {
    const obj = {};
    head.forEach((h, idx) => { obj[h] = r[idx]; });
    if (!obj.date || !obj.amount || !obj.description) { skipped++; return null; }
    const d = new Date(obj.date);
    if (isNaN(d.getTime())) { skipped++; return null; }
    const amt = Number(obj.amount);
    if (!isFinite(amt)) { skipped++; return null; }
    return {
      id: obj.id || generateId(),
      date: d.toISOString(),
      type: obj.type === 'income' ? 'income' : 'expense',
      amount: amt,
      description: obj.description,
      category: normalizeCategoryName(obj.category || USELESS_CATEGORY),
      paymentMethod: obj.paymentMethod || 'Bank Transfer',
    };
  }).filter(Boolean);
  return { rows: parsed, skipped };
};

export const currentMonthRange = (now = new Date()) => ({
  from: new Date(now.getFullYear(), now.getMonth(), 1),
  to:   new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999),
});

// Cash available in the bank for the current period:
// income − expenses − net savings flow − locked payments (financing installments within the range).
// Savings deposits (income+Savings) reduce available cash because that money has been set aside;
// Savings withdrawals (expense+Savings) restore it. Financing rows behave like normal expenses,
// so when the range is the current month only the current installment is subtracted.
export const computeAvailableCash = (transactions, { from, to } = {}) => {
  const start = from ? new Date(from) : null;
  const end   = to instanceof Date ? to : (to ? new Date(to) : null);
  let cash = 0;
  for (const tx of transactions) {
    const d = new Date(tx.date);
    if (start && d < start) continue;
    if (end && d > end) continue;
    if (tx.category === 'Savings') {
      if (tx.type === 'income') cash -= tx.amount;
      else cash += tx.amount;
    } else {
      if (tx.type === 'income') cash += tx.amount;
      else cash -= tx.amount;
    }
  }
  return cash;
};

export const computeBankBalance = (transactions, { from, to } = {}) => {
  const start = from ? new Date(from) : null;
  const end   = to instanceof Date ? to : (to ? new Date(to) : null);
  let bal = 0;
  for (const tx of transactions) {
    const d = new Date(tx.date);
    if (start && d < start) continue;
    if (end && d > end) continue;
    if (tx.type === 'income') bal += tx.amount;
    else if (tx.type === 'expense') bal -= tx.amount;
  }
  return bal;
};

export const resolveRange = (filter) => {
  if (!filter) return { from: null, to: null };
  const now = new Date();
  if (filter.kind === 'custom') {
    return {
      from: filter.from ? new Date(filter.from) : null,
      to:   filter.to   ? new Date(filter.to)   : null,
    };
  }
  const days = Number(filter.days) || 30;
  const from = new Date(now);
  from.setDate(from.getDate() - days);
  return { from, to: null };
};

export const getCardDates = (cardType) => cardType === 'VISA Mercado Pago' ? { close: 7, due: 15 } : { close: 8, due: 16 };
export const getBillingMonth = (txDateStr, cardType) => {
  const d = new Date(txDateStr);
  const { close } = getCardDates(cardType);
  if (d.getDate() > close) return new Date(d.getFullYear(), d.getMonth() + 1, 1);
  return new Date(d.getFullYear(), d.getMonth(), 1);
};

const seedTransactions = () => {
  const out = generateMotoInstallments();
  const now = new Date();
  for (let m = -3; m <= 2; m++) {
    const base = new Date(now.getFullYear(), now.getMonth() + m, 1);
    const yyyy = base.getFullYear(), mm = base.getMonth();
    out.push({ id: generateId() + `-sal-${m}`, type: 'income', amount: 5550, description: 'Monthly salary', category: 'Salary', paymentMethod: 'Bank Transfer', date: new Date(yyyy, mm, 5).toISOString() });
    out.push({ id: generateId() + `-rpoa-${m}`, type: 'income', amount: 2200, description: 'Rent income · Apartment POA', category: 'Rental', paymentMethod: 'Bank Transfer', date: new Date(yyyy, mm, 5).toISOString() });
    out.push({ id: generateId() + `-rurg-${m}`, type: 'income', amount: 1800, description: 'Rent income · Apartment Uruguaiana', category: 'Rental', paymentMethod: 'Bank Transfer', date: new Date(yyyy, mm, 10).toISOString() });
    const uberCount = 6 + Math.floor(Math.random() * 5);
    for (let k = 0; k < uberCount; k++) {
      out.push({
        id: generateId() + `-u-${m}-${k}`,
        type: 'expense',
        amount: 18 + Math.round(Math.random() * 38),
        description: 'Uber ride',
        category: 'Uber',
        paymentMethod: Math.random() > 0.4 ? 'VISA Mercado Pago' : 'Nubank MasterCard',
        date: new Date(yyyy, mm, 1 + Math.floor(Math.random() * 27)).toISOString(),
      });
    }
    const restCount = 4 + Math.floor(Math.random() * 4);
    for (let k = 0; k < restCount; k++) {
      out.push({
        id: generateId() + `-r-${m}-${k}`,
        type: 'expense',
        amount: 60 + Math.round(Math.random() * 180),
        description: ['Bistrô do Centro','Sushi Yama','Parrilla del Sur','Café Florence','Trattoria Luna'][k % 5],
        category: 'Restaurants',
        paymentMethod: Math.random() > 0.5 ? 'VISA Mercado Pago' : 'Nubank MasterCard',
        date: new Date(yyyy, mm, 1 + Math.floor(Math.random() * 27)).toISOString(),
      });
    }
    out.push({ id: generateId()+`-z-${m}`, type:'expense', amount: 380+Math.round(Math.random()*120), description:'Zaffari grocery', category:'Zaffari', paymentMethod:'VISA Mercado Pago', date:new Date(yyyy, mm, 12).toISOString() });
    out.push({ id: generateId()+`-e-${m}`, type:'expense', amount: 220+Math.round(Math.random()*80), description:'Cinema + concert', category:'Entertainment', paymentMethod:'Nubank MasterCard', date:new Date(yyyy, mm, 18).toISOString() });
  }
  out.sort((a, b) => new Date(b.date) - new Date(a.date));
  return out;
};

const TX_KEY            = 'aurum.tx.v2';
const RULES_KEY         = 'aurum.rules.v1';
const RECURRING_KEY     = 'aurum.recurring.v1';
const BUDGETS_KEY       = 'aurum.budgets.v1';
const GOALS_KEY         = 'aurum.goals.v1';
const DEBTS_KEY         = 'aurum.debts.v1';
const REMINDERS_KEY     = 'aurum.reminders.v1';
const NETWORTH_HIST_KEY = 'aurum.networth.history.v1';
const CATEGORY_COLORS_KEY = 'aurum.categoryColors.v1';

// ----------------------------------------------------------------------------
// Auto-categorization: suggest a category by walking the user-defined rules.
// Rule shape: { id, match, category }. Case-insensitive substring match.
// ----------------------------------------------------------------------------
export const suggestCategory = (description, rules) => {
  if (!description || !Array.isArray(rules) || !rules.length) return null;
  const desc = description.toLowerCase();
  for (const rule of rules) {
    if (!rule?.match) continue;
    if (desc.includes(String(rule.match).toLowerCase())) return normalizeStoredCategory(rule.category);
  }
  return null;
};

// ----------------------------------------------------------------------------
// Budgets: { [category]: monthlyLimit }. Returns { spent, limit, pct } for the
// supplied calendar month (defaults to current).
// ----------------------------------------------------------------------------
export const budgetUsage = (transactions, category, budgets, now = new Date()) => {
  const normalizedCategory = normalizeStoredCategory(category);
  const limit = Number(budgets?.[normalizedCategory]) || 0;
  const { from, to } = currentMonthRange(now);
  let spent = 0;
  for (const t of transactions) {
    if (t.type !== 'expense') continue;
    if (normalizeStoredCategory(t.category) !== normalizedCategory) continue;
    const d = new Date(t.date);
    if (d < from || d > to) continue;
    spent += t.amount;
  }
  const pct = limit > 0 ? (spent / limit) * 100 : 0;
  return { spent, limit, pct };
};

// Multi-goal progress. Allocated must be ≤ savingsTotal globally (enforced at UI).
export const goalProgress = (goal) => {
  const allocated = Number(goal?.allocated) || 0;
  const target    = Number(goal?.target)    || 0;
  const pct       = target > 0 ? Math.min(100, (allocated / target) * 100) : 0;
  let monthsToTarget = null;
  if (goal?.due) {
    const due = new Date(goal.due);
    const now = new Date();
    monthsToTarget = (due.getFullYear() - now.getFullYear()) * 12 + (due.getMonth() - now.getMonth());
  }
  return { allocated, target, pct, monthsToTarget };
};

// Aggregate totals for the user-managed debts list (NOT the Triumph financing —
// that lives in the locked transactions).
export const debtTotals = (debts) => {
  let totalPrincipal = 0, totalPaid = 0;
  for (const d of debts || []) {
    totalPrincipal += Number(d?.principal) || 0;
    totalPaid      += Number(d?.paidSoFar) || 0;
  }
  return { totalPrincipal, totalPaid, remaining: totalPrincipal - totalPaid };
};

// Upcoming dues = unpaid financing + recurring templates + manual reminders
// within `daysAhead` of `now`. Sorted ascending by date.
export const upcomingDues = (transactions, recurring, reminders, daysAhead = 30, now = new Date()) => {
  const out = [];
  const today    = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const horizon  = new Date(today);
  horizon.setDate(horizon.getDate() + daysAhead);

  for (const t of transactions || []) {
    if (t.category !== 'Financing') continue;
    if (t.status === 'paid') continue;
    const d = new Date(t.date);
    if (d < today || d > horizon) continue;
    out.push({ date: t.date, kind: 'financing', label: t.description, amount: t.amount, txId: t.id });
  }

  for (const r of recurring || []) {
    const day  = Math.max(1, Math.min(28, Number(r.dayOfMonth) || 1));
    const cand1 = new Date(now.getFullYear(), now.getMonth(), day);
    const cand2 = new Date(now.getFullYear(), now.getMonth() + 1, day);
    const candidates = [cand1, cand2].filter((c) => c >= today && c <= horizon);
    for (const c of candidates) {
      out.push({ date: c.toISOString(), kind: 'recurring', label: r.description, amount: Number(r.amount) || 0, recurringId: r.id });
    }
  }

  for (const r of reminders || []) {
    if (r.paid) continue;
    const d = new Date(r.date);
    if (d < today || d > horizon) continue;
    out.push({ date: r.date, kind: 'reminder', label: r.label, amount: Number(r.amount) || 0, reminderId: r.id });
  }

  out.sort((a, b) => new Date(a.date) - new Date(b.date));
  return out;
};

// Daily-spend map for calendar heatmap. Returns { 'YYYY-MM-DD': totalExpense }.
export const dailySpendMap = (transactions, rangeDays = 365, now = new Date()) => {
  const map = {};
  const start = new Date(now);
  start.setDate(start.getDate() - rangeDays);
  for (const t of transactions || []) {
    if (t.type !== 'expense') continue;
    const d = new Date(t.date);
    if (d < start || d > now) continue;
    const k = `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
    map[k] = (map[k] || 0) + t.amount;
  }
  return map;
};

// Year-over-year delta. `selectorFn(monthTxs)` reduces a month's transactions
// to a single number (e.g. sum of expenses). Returns { current, prior, pct, hasPrior }.
export const yoyDelta = (transactions, year, month, selectorFn) => {
  const inMonth = (y, m) => (transactions || []).filter((t) => {
    const d = new Date(t.date);
    return d.getFullYear() === y && d.getMonth() === m;
  });
  const current = selectorFn(inMonth(year, month));
  const prior   = selectorFn(inMonth(year - 1, month));
  if (prior === 0) return { current, prior: 0, pct: null, hasPrior: false };
  return { current, prior, pct: ((current - prior) / Math.abs(prior)) * 100, hasPrior: true };
};

// Snapshot for Net Worth history. The motorcycle's FIPE (marketValue) is
// counted as a pure asset — the Triumph financing balance is intentionally
// NOT subtracted here, since the user already tracks installments in their
// monthly cash flow (and the bike is a paid-for-in-installments asset).
// Only user-managed debts (separate loans, etc.) reduce equity.
export const netWorthSnapshot = (netWorthState, debts, savingsTotal) => {
  const apts = (netWorthState?.apartments || []).reduce((s, a) => s + (Number(a.value) || 0), 0);
  const moto = Number(netWorthState?.motorcycle?.marketValue) || 0;
  const managedDebt = debtTotals(debts).remaining;
  const total  = apts + moto + (Number(savingsTotal) || 0);
  const equity = total - managedDebt;
  return { total, debt: managedDebt, equity, apts, moto, savings: Number(savingsTotal) || 0, managedDebt };
};

const isoToday = () => {
  const d = new Date();
  const yy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${yy}-${mm}-${dd}`;
};

export const useAppState = () => {
  const [theme, setTheme]       = useState('onyx');
  const [accent, setAccent]     = useState('rose');
  const [fontPair, setFontPair] = useState('schibsted');
  const [density, setDensity]   = useState('comfortable');
  const [lang, setLang]         = useState('en');
  const [currency, setCurrency] = useState('BRL');
  const [view, setView]         = useState('dashboard');

  const [transactions, setTransactions] = useStoredState(TX_KEY, () => seedTransactions());

  // One-shot migration: enforce paid/pending status on Triumph installments
  // based on the current MOTO_PAID_COUNT. Existing localStorage data was seeded
  // when the constant was lower, so installments paid since then need to be
  // flipped. Idempotent — only writes if at least one row actually changes.
  useEffect(() => {
    setTransactions((prev) => {
      let changed = false;
      const next = prev.map((t) => {
        if (typeof t?.id !== 'string' || !t.id.startsWith('moto-')) return t;
        const i = Number(t.id.slice('moto-'.length));
        if (!Number.isFinite(i)) return t;
        const wantStatus = i < MOTO_PAID_COUNT ? 'paid' : 'pending';
        if (t.status === wantStatus) return t;
        changed = true;
        return { ...t, status: wantStatus };
      });
      return changed ? next : prev;
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const [pickedDate, setPickedDate]         = useState(() => isoToday());
  const [activeFormCard, setActiveFormCard] = useState('VISA Mercado Pago');
  const [searchQuery, setSearchQuery]       = useState('');
  const [focusTxId, setFocusTxId]           = useState(null);
  const [dateFilter, setDateFilter]         = useState({ kind: 'preset', days: 30 });

  const [goalAmount, setGoalAmount] = useState(120000);

  const savingsTotal = useMemo(
    () => transactions.reduce((sum, t) => {
      if (t.category !== 'Savings') return sum;
      return sum + (t.type === 'income' ? t.amount : -t.amount);
    }, 0),
    [transactions]
  );

  const [netWorthState, setNetWorthState] = useState({
    apartments: [
      { id: 'apt1', name: 'Apartment POA',         value: 450000, rent: 2200, dueDate: 5,  sqm: 65 },
      { id: 'apt2', name: 'Apartment Uruguaiana',  value: 380000, rent: 1800, dueDate: 10, sqm: 45 },
    ],
    motorcycle: {
      brand: 'Triumph', model: 'Street Triple RS', segment: 'Supernaked', horsepower: 130,
      color: 'Carbon Black', value: 72000, marketValue: 72000,
      debt: MOTO_AMOUNT * MOTO_COUNT, paid: 0, year: '2023',
    },
  });
  // ----- Feature state (Step 0 foundation) ---------------------------------
  const [rules,     setRules]     = useStoredState(RULES_KEY,     []);
  const [recurring, setRecurring] = useStoredState(RECURRING_KEY, []);
  const [budgets,   setBudgets]   = useStoredState(BUDGETS_KEY,   {});
  const [goals,     setGoals]     = useStoredState(GOALS_KEY,     []);
  const [debtsState, setDebtsState] = useStoredState(DEBTS_KEY,   []);
  const [reminders, setReminders] = useStoredState(REMINDERS_KEY, []);
  const [nwHistory, setNwHistory] = useStoredState(NETWORTH_HIST_KEY, []);
  const [categoryColorOverrides, setCategoryColorOverrides] = useStoredState(CATEGORY_COLORS_KEY, {});
  const [cashTimeframe, setCashTimeframe] = useState('current');
  const [defaultSplitMode, setDefaultSplitMode] = useState(false);
  const [focusedCardMethod, setFocusedCardMethod] = useState(null);

  useEffect(() => {
    setTransactions((prev) => {
      let changed = false;
      const next = (prev || []).map((tx) => {
        const normalized = normalizeRecordCategory(tx);
        if (normalized !== tx) changed = true;
        return normalized;
      });
      return changed ? next : prev;
    });
    setRules((prev) => {
      let changed = false;
      const next = (prev || []).map((rule) => {
        const normalized = normalizeRecordCategory(rule);
        if (normalized !== rule) changed = true;
        return normalized;
      });
      return changed ? next : prev;
    });
    setRecurring((prev) => {
      let changed = false;
      const next = (prev || []).map((template) => {
        const normalized = normalizeRecordCategory(template);
        if (normalized !== template) changed = true;
        return normalized;
      });
      return changed ? next : prev;
    });
    setBudgets((prev) => normalizeCategoryMapKeys(prev));
    setCategoryColorOverrides((prev) => {
      const next = normalizeCategoryColorOverrides(prev);
      const prevKeys = Object.keys(prev || {});
      const nextKeys = Object.keys(next);
      if (prevKeys.length !== nextKeys.length) return next;
      return nextKeys.some((key) => next[key] !== prev[key]) ? next : prev;
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const themeTokens = useMemo(() => buildTokens(theme, accent), [theme, accent]);
  const fonts       = FONT_PAIRS[fontPair] || FONT_PAIRS.schibsted;
  const normalizedCategoryColorOverrides = useMemo(
    () => normalizeCategoryColorOverrides(categoryColorOverrides),
    [categoryColorOverrides]
  );
  const getCategoryColor = useMemo(
    () => (category) => categoryColor(category, normalizedCategoryColorOverrides),
    [normalizedCategoryColorOverrides]
  );
  const setCategoryColor = (category, color) => {
    if (!isValidHexColor(color)) return;
    const key = normalizeStoredCategory(category);
    const nextColor = String(color).trim().toUpperCase();
    setCategoryColorOverrides((prev) => ({
      ...normalizeCategoryColorOverrides(prev),
      [key]: nextColor,
    }));
  };
  const resetCategoryColor = (category) => {
    const key = normalizeStoredCategory(category);
    setCategoryColorOverrides((prev) => {
      const next = normalizeCategoryColorOverrides(prev);
      delete next[key];
      return next;
    });
  };
  const resetAllCategoryColors = () => setCategoryColorOverrides({});

  const ccStats = useMemo(() => {
    const stats = {
      'VISA Mercado Pago': { current: 0, future: 0, total: 0, txs: [] },
      'Nubank MasterCard': { current: 0, future: 0, total: 0, txs: [] },
    };
    const now = new Date();
    const curY = now.getFullYear();
    const curM = now.getMonth();
    transactions.forEach(tx => {
      if (tx.type === 'expense' && stats[tx.paymentMethod]) {
        const d = new Date(tx.date);
        const ty = d.getFullYear();
        const tm = d.getMonth();
        // Calendar-month accounting (not billing cycle): "current" = same calendar month as today;
        // "future" = any month strictly after the current calendar month.
        if (ty === curY && tm === curM) {
          stats[tx.paymentMethod].current += tx.amount;
        } else if (ty > curY || (ty === curY && tm > curM)) {
          stats[tx.paymentMethod].future += tx.amount;
        }
        stats[tx.paymentMethod].total += tx.amount;
        stats[tx.paymentMethod].txs.push(tx);
      }
    });
    Object.values(stats).forEach(s => s.txs.sort((a,b)=>new Date(b.date)-new Date(a.date)));
    return stats;
  }, [transactions]);

  // Add a transaction. By default refuses to insert if a same-day / same-amount /
  // same-method / same-description row already exists. Caller can pass
  // { allowDuplicate: true } to override (e.g. after the user confirms a warning).
  const addTransaction = (tx, opts = {}) => {
    const v = validateTransaction(tx);
    if (!v.ok) return { ok: false, errors: v.errors };
    if (!opts.allowDuplicate) {
      const dup = findDuplicate(tx, transactions);
      if (dup) return { ok: false, duplicate: dup, errors: { duplicate: 'A matching transaction already exists for this day, amount, and payment method.' } };
    }
    setTransactions(p => [{ ...tx, id: tx.id || generateId() }, ...p].sort((a,b)=>new Date(b.date)-new Date(a.date)));
    return { ok: true };
  };
  const addInstallmentPurchase = ({ description, category, amount, paymentMethod, firstDate, installments, tags }) => {
    const normalizedCategory = normalizeStoredCategory(category, 'Purchase');
    const v = validateTransaction({
      description, amount, date: firstDate,
      category: normalizedCategory,
      type: normalizedCategory === 'Income' ? 'income' : 'expense',
    });
    if (!v.ok) return { ok: false, errors: v.errors };
    const n = Math.max(1, Math.min(12, Number(installments) || 1));
    const total = Number(amount) || 0;
    const base = Math.floor((total / n) * 100) / 100;
    const last = Math.round((total - base * (n - 1)) * 100) / 100;
    const start = new Date(firstDate);
    const out = [];
    const groupId = generateId();
    const txType = normalizedCategory === 'Income' ? 'income' : 'expense';
    const tagList = Array.isArray(tags) ? tags.filter(Boolean) : [];
    for (let i = 0; i < n; i++) {
      const d = new Date(start.getFullYear(), start.getMonth() + i, start.getDate());
      out.push({
        id: `${groupId}-${i}`,
        groupId,
        type: txType,
        amount: i === n - 1 ? last : base,
        description: n > 1 ? `${description} · ${i + 1}/${n}` : description,
        category: normalizedCategory,
        paymentMethod,
        date: d.toISOString(),
        tags: tagList,
      });
    }
    setTransactions(p => [...out, ...p].sort((a,b)=>new Date(b.date)-new Date(a.date)));
    return { ok: true };
  };
  // Split a single purchase across categories. Each leg becomes its own transaction
  // sharing a `groupId` (reuses the installment pattern so groupId behavior is consistent).
  const addSplitPurchase = ({ description, paymentMethod, date, legs }) => {
    if (!Array.isArray(legs) || !legs.length) return { ok: false, errors: { legs: 'At least one leg is required.' } };
    for (const leg of legs) {
      const normalizedCategory = normalizeStoredCategory(leg.category);
      const v = validateTransaction({
        description, amount: leg.amount, date,
        category: normalizedCategory,
        type: leg.type === 'income' ? 'income' : 'expense',
      });
      if (!v.ok) return { ok: false, errors: v.errors };
    }
    const groupId = generateId();
    const out = legs.map((leg, i) => ({
      ...leg,
      id: `${groupId}-split-${i}`,
      groupId,
      type: leg.type === 'income' ? 'income' : 'expense',
      amount: Number(leg.amount) || 0,
      description: legs.length > 1 ? `${description} · ${normalizeStoredCategory(leg.category)}` : description,
      category: normalizeStoredCategory(leg.category),
      paymentMethod: paymentMethod || 'Bank Transfer',
      date: new Date(date).toISOString(),
      tags: leg.tags || [],
    }));
    setTransactions((p) => [...out, ...p].sort((a, b) => new Date(b.date) - new Date(a.date)));
    return { ok: true };
  };

  // Edit a single transaction in place. Locked rows (Triumph financing) refuse
  // edits. The `patch` may contain description, amount, category, paymentMethod,
  // date, tags, type.
  const editTransaction = (id, patch) => {
    const v = validatePatch(patch);
    if (!v.ok) return { ok: false, errors: v.errors };
    setTransactions((p) => p.map((t) => {
      if (t.id !== id) return t;
      if (t.locked) return t; // never mutate locked rows
      const next = { ...t };
      if (patch.description !== undefined) next.description = patch.description;
      if (patch.amount      !== undefined) next.amount      = Number(patch.amount) || 0;
      if (patch.category    !== undefined) next.category    = normalizeStoredCategory(patch.category);
      if (patch.paymentMethod !== undefined) next.paymentMethod = patch.paymentMethod;
      if (patch.date        !== undefined) next.date        = new Date(patch.date).toISOString();
      if (patch.tags        !== undefined) next.tags        = Array.isArray(patch.tags) ? patch.tags : [];
      if (patch.type        !== undefined) next.type        = patch.type === 'income' ? 'income' : 'expense';
      return next;
    }).sort((a, b) => new Date(b.date) - new Date(a.date)));
    return { ok: true };
  };

  const deleteTransaction = (id) => setTransactions(p => p.filter(t => t.id !== id || t.locked));
  const handleClearHistory= ()   => setTransactions(p => p.filter(t => t.locked));
  const addSaving = (amt) => {
    const n = Number(amt);
    if (!n || isNaN(n)) return;
    addTransaction({
      type: n >= 0 ? 'income' : 'expense',
      amount: Math.abs(n),
      description: n >= 0 ? 'Savings deposit' : 'Savings withdrawal',
      category: 'Savings',
      paymentMethod: 'Bank Transfer',
      date: new Date().toISOString(),
    });
  };
  // Import a batch of transactions. Each row is run through the full validator;
  // invalid rows are dropped. Rows that fingerprint-match an existing transaction
  // (same day, amount, method, description) or another row in the same batch are
  // also dropped. Returns a summary so the UI can show "added / skipped" counts.
  const importTransactions = (rows) => {
    if (!Array.isArray(rows) || !rows.length) {
      return { added: 0, invalid: 0, duplicates: 0 };
    }
    const valid = [];
    let invalid = 0;
    for (const r of rows) {
      const v = validateTransaction(r);
      if (v.ok) valid.push(normalizeRecordCategory(r));
      else invalid++;
    }
    let addedCount = 0;
    let dupCount = 0;
    setTransactions((p) => {
      const ids = new Set(p.map((t) => t.id));
      const idDeduped = valid.filter((r) => !ids.has(r.id));
      const { unique, duplicates } = partitionDuplicates(idDeduped, p);
      dupCount = (valid.length - idDeduped.length) + duplicates.length;
      addedCount = unique.length;
      if (!unique.length) return p;
      return [...unique, ...p].sort((a, b) => new Date(b.date) - new Date(a.date));
    });
    return { added: addedCount, invalid, duplicates: dupCount };
  };

  // ----- CRUD helpers for new feature state --------------------------------
  // Rules (auto-categorization)
  const addRule    = (rule) => setRules((p) => [...p, { id: generateId(), ...rule, category: normalizeStoredCategory(rule?.category) }]);
  const deleteRule = (id)   => setRules((p) => p.filter((r) => r.id !== id));

  // Recurring transaction templates
  const addRecurring    = (tpl)       => setRecurring((p) => [...p, { id: generateId(), lastFiredKey: '', ...tpl, category: normalizeStoredCategory(tpl?.category) }]);
  const updateRecurring = (id, patch) => setRecurring((p) => p.map((r) => r.id === id ? { ...r, ...patch, ...(patch?.category !== undefined ? { category: normalizeStoredCategory(patch.category) } : {}) } : r));
  const deleteRecurring = (id)        => setRecurring((p) => p.filter((r) => r.id !== id));

  // Budgets
  const setBudget    = (cat, limit) => setBudgets((p) => ({ ...p, [normalizeStoredCategory(cat)]: Number(limit) || 0 }));
  const removeBudget = (cat)        => setBudgets((p) => { const next = { ...p }; delete next[normalizeStoredCategory(cat)]; return next; });

  // Goals (multi-savings)
  const addGoal    = (g)          => setGoals((p) => [...p, { id: generateId(), allocated: 0, ...g }]);
  const updateGoal = (id, patch)  => setGoals((p) => p.map((g) => g.id === id ? { ...g, ...patch } : g));
  const deleteGoal = (id)         => setGoals((p) => p.filter((g) => g.id !== id));

  // Debts (user-managed)
  const addDebt    = (d)          => setDebtsState((p) => [...p, { id: generateId(), paidSoFar: 0, ...d }]);
  const updateDebt = (id, patch)  => setDebtsState((p) => p.map((d) => d.id === id ? { ...d, ...patch } : d));
  const deleteDebt = (id)         => setDebtsState((p) => p.filter((d) => d.id !== id));

  // Bill reminders (manual)
  const addReminder      = (r)   => setReminders((p) => [...p, { id: generateId(), paid: false, ...r }]);
  const markReminderPaid = (id)  => setReminders((p) => p.map((r) => r.id === id ? { ...r, paid: true } : r));
  const deleteReminder   = (id)  => setReminders((p) => p.filter((r) => r.id !== id));

  // ----- Auto-fire recurring templates on mount ----------------------------
  // Idempotent via lastFiredKey = "YYYY-MM". A second mount in the same month
  // is a no-op; a mount the following month fires once.
  useEffect(() => {
    if (!recurring.length) return;
    const now = new Date();
    const curKey = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
    const today  = now.getDate();
    const toFire = recurring.filter((r) => {
      const day = Math.max(1, Math.min(28, Number(r.dayOfMonth) || 1));
      return day <= today && r.lastFiredKey !== curKey;
    });
    if (!toFire.length) return;
    const newTxs = toFire.map((r) => ({
      id: `rec-${r.id}-${curKey}`,
      type: r.type === 'income' ? 'income' : 'expense',
      amount: Number(r.amount) || 0,
      description: r.description,
      category: normalizeStoredCategory(r.category),
      paymentMethod: r.paymentMethod || 'Bank Transfer',
      date: new Date(now.getFullYear(), now.getMonth(), Math.min(today, Math.max(1, Number(r.dayOfMonth) || 1))).toISOString(),
      tags: ['recurring'],
    }));
    setTransactions((p) => {
      const ids = new Set(p.map((t) => t.id));
      const fresh = newTxs.filter((t) => !ids.has(t.id));
      if (!fresh.length) return p;
      return [...fresh, ...p].sort((a, b) => new Date(b.date) - new Date(a.date));
    });
    setRecurring((p) => p.map((r) => toFire.some((f) => f.id === r.id) ? { ...r, lastFiredKey: curKey } : r));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ----- Append a Net Worth snapshot for the current month if missing ------
  // The history is capped at the most recent 36 months to keep storage bounded.
  useEffect(() => {
    const now = new Date();
    const ym  = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
    if ((nwHistory || []).some((s) => s.ym === ym)) return;
    const snap = netWorthSnapshot(netWorthState, debtsState, savingsTotal);
    setNwHistory((p) => {
      const merged = [...(p || []), { ym, ...snap }].sort((a, b) => a.ym.localeCompare(b.ym));
      return merged.slice(-36);
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return {
    theme, setTheme, accent, setAccent, fontPair, setFontPair, density, setDensity,
    lang, setLang, currency, setCurrency, view, setView,
    themeTokens, fonts,
    transactions, addTransaction, addInstallmentPurchase, addSplitPurchase, editTransaction, deleteTransaction, handleClearHistory,
    importTransactions,
    savingsTotal, addSaving, goalAmount, setGoalAmount,
    netWorthState, setNetWorthState,
    debtsState, setDebtsState,
    cashTimeframe, setCashTimeframe,
    ccStats,
    pickedDate, setPickedDate,
    activeFormCard, setActiveFormCard,
    searchQuery, setSearchQuery,
    focusTxId, setFocusTxId,
    dateFilter, setDateFilter,
    categoryColorOverrides: normalizedCategoryColorOverrides,
    getCategoryColor,
    getDefaultCategoryColor,
    setCategoryColor,
    resetCategoryColor,
    resetAllCategoryColors,
    fmt: (v) => fmtCurrency(v, currency),
    computeBankBalance: (opts) => computeBankBalance(transactions, opts),
    computeAvailableCash: (opts) => computeAvailableCash(transactions, opts),

    // New feature state + CRUD helpers (Step 0 foundation)
    rules,     addRule,    deleteRule,
    recurring, addRecurring, updateRecurring, deleteRecurring,
    budgets,   setBudget,  removeBudget,
    goals,     addGoal,    updateGoal,    deleteGoal,
    addDebt,   updateDebt, deleteDebt,
    reminders, addReminder, markReminderPaid, deleteReminder,
    nwHistory,
    defaultSplitMode, setDefaultSplitMode,
    focusedCardMethod, setFocusedCardMethod,
    // Bound calc helpers
    suggestCategory: (desc) => suggestCategory(desc, rules),
    budgetUsage:     (cat)  => budgetUsage(transactions, cat, budgets),
    upcomingDues:    (days) => upcomingDues(transactions, recurring, reminders, days),
    dailySpendMap:   (days) => dailySpendMap(transactions, days),
    debtTotals:      ()     => debtTotals(debtsState),
    yoyDelta:        (year, month, fn) => yoyDelta(transactions, year, month, fn),
    netWorthSnapshot:()     => netWorthSnapshot(netWorthState, debtsState, savingsTotal),
  };
};
