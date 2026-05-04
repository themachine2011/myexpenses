import React, { createContext, useContext, useState, useMemo, useEffect } from 'react';
import { FONT_PAIRS, buildTokens, fmtCurrency } from './tokens.jsx';

export const AppContext = createContext(null);
export const useAppContext = () => useContext(AppContext);

export const generateId = () => `tx-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;

export const MOTO_AMOUNT = 2191;
export const MOTO_COUNT  = 48;
export const MOTO_PAID_COUNT = 11;
const MOTO_START_YEAR = 2025;
const MOTO_START_MONTH = 4;
const MOTO_DUE_DAY = 18;

export const CATEGORIES = [
  'Income',
  'Financing', 'Debts', 'Restaurants', 'Uber', 'Trips',
  'Zaffari', 'Clothing', 'Others', 'Gas', 'Insurance',
];

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
  const body = txs.map((t) => TX_CSV_FIELDS.map((f) => escape(t[f])).join(',')).join('\n');
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
      category: obj.category || 'Others',
      paymentMethod: obj.paymentMethod || 'Bank Transfer',
    };
  }).filter(Boolean);
  return { rows: parsed, skipped };
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

const TX_KEY = 'aurum.tx.v2';

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

  const [transactions, setTransactions] = useState(() => {
    try {
      const raw = typeof window !== 'undefined' ? window.localStorage.getItem(TX_KEY) : null;
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed) && parsed.length) return parsed;
      }
    } catch (_) {}
    return seedTransactions();
  });

  useEffect(() => {
    try { window.localStorage.setItem(TX_KEY, JSON.stringify(transactions)); } catch (_) {}
  }, [transactions]);

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
  const [debtsState, setDebtsState] = useState([]);
  const [cashTimeframe, setCashTimeframe] = useState('current');

  const themeTokens = useMemo(() => buildTokens(theme, accent), [theme, accent]);
  const fonts       = FONT_PAIRS[fontPair] || FONT_PAIRS.schibsted;

  const ccStats = useMemo(() => {
    const stats = {
      'VISA Mercado Pago': { current: 0, future: 0, total: 0, txs: [] },
      'Nubank MasterCard': { current: 0, future: 0, total: 0, txs: [] },
    };
    const now = new Date();
    transactions.forEach(tx => {
      if (tx.type === 'expense' && stats[tx.paymentMethod]) {
        const bm = getBillingMonth(tx.date, tx.paymentMethod);
        const cb = getBillingMonth(now.toISOString(), tx.paymentMethod);
        if (bm.getTime() === cb.getTime()) stats[tx.paymentMethod].current += tx.amount;
        else if (bm > cb) stats[tx.paymentMethod].future += tx.amount;
        stats[tx.paymentMethod].total += tx.amount;
        stats[tx.paymentMethod].txs.push(tx);
      }
    });
    Object.values(stats).forEach(s => s.txs.sort((a,b)=>new Date(b.date)-new Date(a.date)));
    return stats;
  }, [transactions]);

  const addTransaction    = (tx) => setTransactions(p => [{ ...tx, id: tx.id || generateId() }, ...p].sort((a,b)=>new Date(b.date)-new Date(a.date)));
  const addInstallmentPurchase = ({ description, category, amount, paymentMethod, firstDate, installments }) => {
    const n = Math.max(1, Math.min(12, Number(installments) || 1));
    const total = Number(amount) || 0;
    const base = Math.floor((total / n) * 100) / 100;
    const last = Math.round((total - base * (n - 1)) * 100) / 100;
    const start = new Date(firstDate);
    const out = [];
    const groupId = generateId();
    const txType = category === 'Income' ? 'income' : 'expense';
    for (let i = 0; i < n; i++) {
      const d = new Date(start.getFullYear(), start.getMonth() + i, start.getDate());
      out.push({
        id: `${groupId}-${i}`,
        groupId,
        type: txType,
        amount: i === n - 1 ? last : base,
        description: n > 1 ? `${description} · ${i + 1}/${n}` : description,
        category: category || 'Purchase',
        paymentMethod,
        date: d.toISOString(),
      });
    }
    setTransactions(p => [...out, ...p].sort((a,b)=>new Date(b.date)-new Date(a.date)));
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
  const importTransactions = (rows) => {
    if (!Array.isArray(rows) || !rows.length) return 0;
    setTransactions((p) => {
      const ids = new Set(p.map((t) => t.id));
      const fresh = rows.filter((r) => !ids.has(r.id));
      return [...fresh, ...p].sort((a, b) => new Date(b.date) - new Date(a.date));
    });
    return rows.length;
  };

  return {
    theme, setTheme, accent, setAccent, fontPair, setFontPair, density, setDensity,
    lang, setLang, currency, setCurrency, view, setView,
    themeTokens, fonts,
    transactions, addTransaction, addInstallmentPurchase, deleteTransaction, handleClearHistory,
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
    fmt: (v) => fmtCurrency(v, currency),
    computeBankBalance: (opts) => computeBankBalance(transactions, opts),
  };
};
