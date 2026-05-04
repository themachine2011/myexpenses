/* global React, ReactDOM */
const { useState, useEffect, useRef, useMemo, useCallback, createContext, useContext, createElement: h, Fragment } = React;

// =====================================================================
// AURUM CONTEXT — preserves the architecture from the original aurum.jsx:
// unified ledger, locked moto installments (48), debt generators,
// computeBankBalance, ccStats. Reskinned but functionally faithful.
// =====================================================================
const AppContext = createContext(null);
const useAppContext = () => useContext(AppContext);

const generateId = () => `tx-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;

// --- Locked motorcycle installments: 48 × R$ 2,191 starting June 2025 ---
const MOTO_AMOUNT = 2191;
const MOTO_COUNT  = 48;
const MOTO_START_YEAR = 2025;
const MOTO_START_MONTH = 5; // June
const MOTO_DUE_DAY = 18;

const generateMotoInstallments = () => {
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
    });
  }
  return out;
};

// --- Debt installment generator (variable n, evenly split, last absorbs remainder) ---
const generateDebtInstallments = (debt) => {
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

// --- Bank balance computation over a window ---
const computeBankBalance = (transactions, { from, to } = {}) => {
  const start = from ? new Date(from) : null;
  const end   = to   ? new Date(to)   : null;
  let bal = 0;
  for (const tx of transactions) {
    const d = new Date(tx.date);
    if (start && d < start) continue;
    if (end && d > end) continue;
    if (tx.type === 'income') bal += tx.amount;
    else if (tx.type === 'expense' && (tx.paymentMethod === 'Bank Transfer' || tx.paymentMethod === 'Cash' || tx.paymentMethod === 'PIX')) {
      bal -= tx.amount;
    }
  }
  return bal;
};

// --- Credit-card billing-month logic ---
const getCardDates = (cardType) => cardType === 'VISA Mercado Pago' ? { close: 7, due: 15 } : { close: 8, due: 16 };
const getBillingMonth = (txDateStr, cardType) => {
  const d = new Date(txDateStr);
  const { close } = getCardDates(cardType);
  if (d.getDate() > close) return new Date(d.getFullYear(), d.getMonth() + 1, 1);
  return new Date(d.getFullYear(), d.getMonth(), 1);
};

// --- Seed sample income / variable expenses so screens have data ---
const seedTransactions = () => {
  const out = generateMotoInstallments();
  const now = new Date();
  // Generate 6 months of recurring income + variable expenses
  for (let m = -3; m <= 2; m++) {
    const base = new Date(now.getFullYear(), now.getMonth() + m, 1);
    const yyyy = base.getFullYear(), mm = base.getMonth();
    // Salary
    out.push({ id: generateId() + `-sal-${m}`, type: 'income', amount: 5550, description: 'Monthly salary', category: 'Salary', paymentMethod: 'Bank Transfer', date: new Date(yyyy, mm, 5).toISOString() });
    // Rent income — apartments
    out.push({ id: generateId() + `-rpoa-${m}`, type: 'income', amount: 2200, description: 'Rent income · Apartment POA', category: 'Rental', paymentMethod: 'Bank Transfer', date: new Date(yyyy, mm, 5).toISOString() });
    out.push({ id: generateId() + `-rurg-${m}`, type: 'income', amount: 1800, description: 'Rent income · Apartment Uruguaiana', category: 'Rental', paymentMethod: 'Bank Transfer', date: new Date(yyyy, mm, 10).toISOString() });
    // Variable: Uber + Restaurants spread across the month
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
    // A handful of other categories for variety
    out.push({ id: generateId()+`-z-${m}`, type:'expense', amount: 380+Math.round(Math.random()*120), description:'Zaffari grocery', category:'Zaffari', paymentMethod:'VISA Mercado Pago', date:new Date(yyyy, mm, 12).toISOString() });
    out.push({ id: generateId()+`-e-${m}`, type:'expense', amount: 220+Math.round(Math.random()*80), description:'Cinema + concert', category:'Entertainment', paymentMethod:'Nubank MasterCard', date:new Date(yyyy, mm, 18).toISOString() });
  }
  out.sort((a, b) => new Date(b.date) - new Date(a.date));
  return out;
};

// --- AppProvider hook
const useAppState = () => {
  const [theme, setTheme]       = useState('onyx');     // onyx | ivory
  const [accent, setAccent]     = useState('rose');
  const [fontPair, setFontPair] = useState('sf');
  const [density, setDensity]   = useState('comfortable');
  const [lang, setLang]         = useState('en');
  const [currency, setCurrency] = useState('BRL');
  const [view, setView]         = useState('dashboard');

  const [transactions, setTransactions] = useState(() => seedTransactions());

  const [savingsTotal, setSavingsTotal] = useState(8400);
  const [goalAmount, setGoalAmount]     = useState(120000);

  const [netWorthState, setNetWorthState] = useState({
    apartments: [
      { id: 'apt1', name: 'Apartment POA',         value: 450000, rent: 2200, dueDate: 5,  sqm: 65 },
      { id: 'apt2', name: 'Apartment Uruguaiana',  value: 380000, rent: 1800, dueDate: 10, sqm: 45 },
    ],
    motorcycle: {
      brand: 'Triumph', model: 'Street Triple RS', segment: 'Supernaked', horsepower: 130,
      color: 'Carbon Black', value: 72000, marketValue: 72000,
      debt: MOTO_AMOUNT * MOTO_COUNT, paid: 0, fipe: 73000, year: '2023',
    },
  });
  const [debtsState, setDebtsState] = useState([]);
  const [cashTimeframe, setCashTimeframe] = useState('current');

  const themeTokens = useMemo(() => buildTokens(theme, accent), [theme, accent]);
  const fonts       = FONT_PAIRS[fontPair] || FONT_PAIRS.sf;

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
  const deleteTransaction = (id) => setTransactions(p => p.filter(t => t.id !== id || t.locked));
  const handleClearHistory= ()   => setTransactions(p => p.filter(t => t.locked));
  const addSaving         = (amt)=> setSavingsTotal(p => p + amt);

  return {
    theme, setTheme, accent, setAccent, fontPair, setFontPair, density, setDensity,
    lang, setLang, currency, setCurrency, view, setView,
    themeTokens, fonts,
    transactions, addTransaction, deleteTransaction, handleClearHistory,
    savingsTotal, addSaving, goalAmount, setGoalAmount,
    netWorthState, setNetWorthState,
    debtsState, setDebtsState,
    cashTimeframe, setCashTimeframe,
    ccStats,
    fmt: (v) => fmtCurrency(v, currency),
    computeBankBalance: (opts) => computeBankBalance(transactions, opts),
  };
};

Object.assign(window, {
  AppContext, useAppContext, useAppState,
  generateId, generateMotoInstallments, generateDebtInstallments,
  computeBankBalance, getCardDates, getBillingMonth,
  MOTO_AMOUNT, MOTO_COUNT,
});
