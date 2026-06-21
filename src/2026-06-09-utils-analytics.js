// Shared, read-only analytics helpers for the 2026-06-09 feature review.
//
// Why this file exists:
//   The three features added on 2026-06-09 (Financial Health Score, Spending
//   Trends, Top Merchants) all need the same period math and the same
//   income/expense definitions. Rather than copy that logic into each feature
//   file, it lives here once (CLAUDE.md rule #4: do not duplicate logic).
//
// Money rules (CLAUDE.md "Project financial logic"):
//   - Transactions are the source of truth for REAL spending.
//   - "Savings" category rows are money set aside, not spending, so they are
//     excluded from income and expense totals here.
//   - Everything else with type 'expense' (including Financing / Debt) is a
//     real outflow and is counted.
//   - These helpers never format currency; callers use the context `fmt()` so
//     the global BRL/USD wallet toggle keeps working (display only).

import { isFixedExpense, fixedDurationGroupIds } from './2026-06-21-utils-fixed-expense.js';

export const clamp = (n, lo, hi) => Math.max(lo, Math.min(hi, n));

// Month range for `offset` months back from `now` (0 = current month).
export const monthRangeFor = (offset = 0, now = new Date()) => {
  const y = now.getFullYear();
  const m = now.getMonth() - offset;
  return {
    from: new Date(y, m, 1),
    to: new Date(y, m + 1, 0, 23, 59, 59, 999),
    label: new Date(y, m, 1).toLocaleDateString('en-US', { month: 'short' }),
    year: new Date(y, m, 1).getFullYear(),
    monthIndex: new Date(y, m, 1).getMonth(),
  };
};

// Range for a named period used by the tab period toggles.
// 'month' = current calendar month, '3m'/'6m' = last N whole months incl. this
// one, 'all' = everything (from = null).
export const periodRangeFor = (key, now = new Date()) => {
  if (key === 'all') return { from: null, to: null };
  if (key === '3m') return { from: new Date(now.getFullYear(), now.getMonth() - 2, 1), to: now };
  if (key === '6m') return { from: new Date(now.getFullYear(), now.getMonth() - 5, 1), to: now };
  // default: current month
  return { from: new Date(now.getFullYear(), now.getMonth(), 1), to: now };
};

export const inRange = (tx, from, to) => {
  const d = new Date(tx.date);
  if (from && d < from) return false;
  if (to && d > to) return false;
  return true;
};

const isRealExpense = (t) => t.type === 'expense' && t.category !== 'Savings';
const isRealIncome = (t) => t.type === 'income' && t.category !== 'Savings';

// Period totals consistent with the Dashboard's actual-spending definition.
export const periodTotals = (transactions, from, to) => {
  let income = 0, expense = 0, fixed = 0;
  // Compute the 6+ month installment groups ONCE over the full list (not per
  // row), then reuse the central rule so this matches the Dashboard everywhere.
  const fixedGroupIds = fixedDurationGroupIds(transactions);
  for (const t of transactions) {
    if (!inRange(t, from, to)) continue;
    if (isRealIncome(t)) income += t.amount;
    else if (isRealExpense(t)) {
      expense += t.amount;
      if (isFixedExpense(t, fixedGroupIds)) fixed += t.amount;
    }
  }
  return { income, expense, fixed, cashflow: income - expense };
};

// Oldest -> newest monthly expense/income series for the last `months` months.
export const monthlyExpenseSeries = (transactions, months = 6, now = new Date()) => {
  const out = [];
  for (let i = months - 1; i >= 0; i--) {
    const r = monthRangeFor(i, now);
    const t = periodTotals(transactions, r.from, r.to);
    out.push({ label: r.label, year: r.year, monthIndex: r.monthIndex, ...t });
  }
  return out;
};

// Map of category -> total real expense within [from, to].
export const categoryExpenseTotals = (transactions, from, to) => {
  const map = new Map();
  for (const t of transactions) {
    if (!isRealExpense(t)) continue;
    if (!inRange(t, from, to)) continue;
    map.set(t.category, (map.get(t.category) || 0) + t.amount);
  }
  return map;
};

// Group expenses by merchant (normalized description). Returns an array of
// { key, name, total, count, avg, lastDate, category } sorted by total desc.
export const merchantTotals = (transactions, from, to) => {
  const groups = new Map();
  for (const t of transactions) {
    if (!isRealExpense(t)) continue;
    if (!inRange(t, from, to)) continue;
    const raw = (t.description || '').trim() || '(no description)';
    const key = normalizeMerchant(raw);
    let g = groups.get(key);
    if (!g) {
      g = { key, name: raw, total: 0, count: 0, lastDate: t.date, category: t.category, _names: {} };
      groups.set(key, g);
    }
    g.total += t.amount;
    g.count += 1;
    g._names[raw] = (g._names[raw] || 0) + 1;
    if (new Date(t.date) > new Date(g.lastDate)) { g.lastDate = t.date; g.category = t.category; }
  }
  const arr = [];
  for (const g of groups.values()) {
    // Display the most frequently seen original spelling for this merchant.
    let best = g.name, bestN = -1;
    for (const [n, c] of Object.entries(g._names)) if (c > bestN) { best = n; bestN = c; }
    arr.push({ key: g.key, name: best, total: g.total, count: g.count, avg: g.total / g.count, lastDate: g.lastDate, category: g.category });
  }
  arr.sort((a, b) => b.total - a.total);
  return arr;
};

// Normalize a description into a merchant grouping key: lowercase, collapse
// whitespace, drop trailing reference/installment numbers and punctuation so
// "Zaffari grocery" and "ZAFFARI  grocery" group together. Conservative on
// purpose — better to under-merge than to wrongly merge two real merchants.
export const normalizeMerchant = (desc) =>
  (desc || '')
    .toLowerCase()
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '') // strip accents
    .replace(/[#*]/g, ' ')
    .replace(/\b\d{1,2}\/\d{1,2}\b/g, ' ')           // 3/12 installment markers
    .replace(/\s+/g, ' ')
    .trim();

// Map a 0..100 score to a human band + token color name.
export const scoreBand = (score) => {
  if (score >= 80) return { label: 'Excellent', tone: 'positive' };
  if (score >= 65) return { label: 'Good', tone: 'positive' };
  if (score >= 50) return { label: 'Fair', tone: 'accent' };
  if (score >= 35) return { label: 'Needs work', tone: 'negative' };
  return { label: 'At risk', tone: 'negative' };
};

// Piecewise-linear mapper: given an x and a list of [x, score] breakpoints
// (ascending or descending x), return the interpolated score, clamped 0..100.
export const lerpScore = (x, points) => {
  if (x <= points[0][0]) return clamp(points[0][1], 0, 100);
  for (let i = 1; i < points.length; i++) {
    const [x0, s0] = points[i - 1];
    const [x1, s1] = points[i];
    if (x <= x1) {
      const f = (x - x0) / (x1 - x0 || 1);
      return clamp(s0 + f * (s1 - s0), 0, 100);
    }
  }
  return clamp(points[points.length - 1][1], 0, 100);
};

// Financial Health sub-scores + weighted composite. All inputs are real,
// transaction-derived numbers. `avgMonthlyExpense` is the mean real expense
// over the trailing window; `savingsTotal` is the user's set-aside balance.
export const computeHealthScore = ({ income, expense, fixed, savingsTotal, avgMonthlyExpense }) => {
  const savingsRate = income > 0 ? (income - expense) / income : (expense > 0 ? -1 : 0); // -1..1
  const fixedRatio = income > 0 ? fixed / income : (fixed > 0 ? 2 : 0);
  const expenseRatio = income > 0 ? expense / income : (expense > 0 ? 2 : 0);
  const runwayMonths = avgMonthlyExpense > 0 ? (savingsTotal || 0) / avgMonthlyExpense : (savingsTotal > 0 ? 12 : 0);

  const sSavings = lerpScore(savingsRate, [[-0.2, 0], [0, 35], [0.1, 60], [0.2, 85], [0.3, 100]]);
  const sFixed = lerpScore(fixedRatio, [[0.3, 100], [0.5, 70], [0.7, 40], [0.9, 10], [1.2, 0]]);
  const sExpense = lerpScore(expenseRatio, [[0.5, 100], [0.7, 80], [0.9, 55], [1.0, 40], [1.3, 0]]);
  const sRunway = lerpScore(runwayMonths, [[0, 10], [1, 40], [3, 70], [6, 100]]);

  const parts = [
    { id: 'savings', label: 'Savings rate', weight: 0.30, score: sSavings, raw: savingsRate, kind: 'pct' },
    { id: 'expense', label: 'Spending vs income', weight: 0.25, score: sExpense, raw: expenseRatio, kind: 'ratio' },
    { id: 'runway', label: 'Emergency runway', weight: 0.25, score: sRunway, raw: runwayMonths, kind: 'months' },
    { id: 'fixed', label: 'Fixed-cost load', weight: 0.20, score: sFixed, raw: fixedRatio, kind: 'ratio' },
  ];
  const total = Math.round(parts.reduce((s, p) => s + p.weight * p.score, 0));
  return { total, parts, savingsRate, fixedRatio, expenseRatio, runwayMonths };
};
