// Shared, read-only math for the 2026-06-11 feature review.
//
// Why this file exists:
//   The three features added on 2026-06-11 (Budgets / Budget-vs-Actual, Income
//   Insights, Upcoming Bills) each need a little pure number-crunching. To honour
//   CLAUDE.md rule #4 (don't duplicate logic), the testable math lives here once,
//   and all period / income / expense definitions are reused from the existing
//   2026-06-09 analytics util instead of being re-implemented.
//
// Money rules (CLAUDE.md "Project financial logic"):
//   - Transactions are the source of truth for REAL spending and income.
//   - "Savings" rows are money set aside, not spend/income — already excluded by
//     the shared helpers (categoryExpenseTotals / isRealIncome).
//   - Nothing here formats currency; callers use the context `fmt()` so the
//     BRL/USD wallet toggle keeps working (display only).
//   - Actual / projected are kept clearly separate (rule #5): each budget row
//     reports spend-so-far AND a separate run-rate projection, never merged.

import {
  clamp, monthRangeFor, inRange, monthlyExpenseSeries,
  categoryExpenseTotals, normalizeMerchant,
} from './2026-06-09-utils-analytics.js';

export { clamp, monthRangeFor };

// ---------------------------------------------------------------------------
// 1. Budget vs Actual (current calendar month)
// ---------------------------------------------------------------------------
// For every category that has a positive budget limit, compares this month's
// real expense (actual) against the limit, and ALSO projects month-end spend
// from the simple daily run-rate so the user can see a bust coming early.
// Status: 'over' (already past limit) > 'at-risk' (projected to bust) >
// 'warn' (>=80% used) > 'ok'.
export const budgetReport = (transactions, budgets = {}, now = new Date()) => {
  const cur = monthRangeFor(0, now);
  // "Spent" is capped at `now`, not month-end — the full month range would
  // count future-dated rows (e.g. a pending instalment later this month) as
  // already spent, inflating both the spent bar and the run-rate projection.
  const actuals = categoryExpenseTotals(transactions, cur.from, now); // Map cat -> spent

  const daysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
  const dayOfMonth = clamp(now.getDate(), 1, daysInMonth);

  const rows = [];
  let totalLimit = 0, totalSpent = 0, totalProjected = 0;
  for (const [cat, limitRaw] of Object.entries(budgets || {})) {
    const limit = Number(limitRaw) || 0;
    if (limit <= 0) continue;
    const spent = actuals.get(cat) || 0;
    const projected = (spent / dayOfMonth) * daysInMonth;
    const pct = limit > 0 ? (spent / limit) * 100 : 0;
    const projectedPct = limit > 0 ? (projected / limit) * 100 : 0;
    let status = 'ok';
    if (spent > limit) status = 'over';
    else if (projected > limit) status = 'at-risk';
    else if (pct >= 80) status = 'warn';
    rows.push({
      category: cat, limit, spent, projected, pct, projectedPct,
      remaining: limit - spent, status,
    });
    totalLimit += limit; totalSpent += spent; totalProjected += projected;
  }
  rows.sort((a, b) => b.pct - a.pct);

  return {
    rows,
    hasBudgets: rows.length > 0,
    totalLimit, totalSpent, totalProjected,
    totalRemaining: totalLimit - totalSpent,
    totalPct: totalLimit > 0 ? (totalSpent / totalLimit) * 100 : 0,
    overCount: rows.filter((r) => r.status === 'over').length,
    atRiskCount: rows.filter((r) => r.status === 'at-risk').length,
    daysInMonth, dayOfMonth, monthLabel: cur.label,
  };
};

// ---------------------------------------------------------------------------
// 2. Income Insights
// ---------------------------------------------------------------------------
// Everything else in the app is expense-focused; this is the income side.
// Reports a monthly income trend, top income sources (grouped by description),
// income by category, and a simple stability read (lower variation = steadier
// income). "Savings" rows are excluded (they are set-aside, not earnings).
const isRealIncome = (t) => t.type === 'income' && t.category !== 'Savings';

export const incomeInsights = (transactions, months = 6, now = new Date()) => {
  // Monthly income trend — reuse the shared series (it already carries income).
  const series = monthlyExpenseSeries(transactions, months, now)
    .map((m) => ({ label: m.label, year: m.year, income: m.income }));

  const avgMonthly = series.length
    ? series.reduce((s, m) => s + m.income, 0) / series.length
    : 0;
  // Stability via coefficient of variation across the window (0 = perfectly
  // steady). Mapped to a friendly 0..100 score.
  const variance = series.length
    ? series.reduce((s, m) => s + Math.pow(m.income - avgMonthly, 2), 0) / series.length
    : 0;
  const std = Math.sqrt(variance);
  const cov = avgMonthly > 0 ? std / avgMonthly : 0;
  const stabilityScore = clamp(Math.round((1 - cov) * 100), 0, 100);

  // Source / category breakdown over the same trailing window.
  const start = monthRangeFor(months - 1, now).from;
  const end = monthRangeFor(0, now).to;
  const srcMap = new Map();
  const catMap = new Map();
  let total = 0, count = 0;
  for (const t of transactions || []) {
    if (!isRealIncome(t)) continue;
    if (!inRange(t, start, end)) continue;
    const raw = (t.description || '').trim() || '(no description)';
    const key = normalizeMerchant(raw);
    let g = srcMap.get(key);
    if (!g) { g = { key, name: raw, total: 0, count: 0, _names: {} }; srcMap.set(key, g); }
    g.total += t.amount; g.count += 1;
    g._names[raw] = (g._names[raw] || 0) + 1;
    catMap.set(t.category, (catMap.get(t.category) || 0) + t.amount);
    total += t.amount; count += 1;
  }

  const bySource = [...srcMap.values()].map((g) => {
    let best = g.name, bestN = -1;
    for (const [n, c] of Object.entries(g._names)) if (c > bestN) { best = n; bestN = c; }
    return { key: g.key, name: best, total: g.total, count: g.count, share: total > 0 ? (g.total / total) * 100 : 0 };
  }).sort((a, b) => b.total - a.total);

  const byCategory = [...catMap.entries()]
    .map(([category, amt]) => ({ category, total: amt, share: total > 0 ? (amt / total) * 100 : 0 }))
    .sort((a, b) => b.total - a.total);

  return {
    series, avgMonthly, std, cov, stabilityScore,
    bySource, byCategory, total, count,
    topSource: bySource[0] || null,
    windowMonths: months,
  };
};

// ---------------------------------------------------------------------------
// 3. Upcoming Bills (forward commitments)
// ---------------------------------------------------------------------------
// `dues` is whatever the context `upcomingDues(days)` returns:
//   { date, kind: 'financing'|'recurring'|'reminder', label, amount, ... }.
// These helpers only summarise / bucket that list — no new data definition.
export const summarizeDues = (dues = []) => {
  let total = 0;
  const byKind = { financing: 0, recurring: 0, reminder: 0 };
  for (const d of dues) {
    const amt = Number(d.amount) || 0;
    total += amt;
    if (byKind[d.kind] != null) byKind[d.kind] += amt;
    else byKind[d.kind] = amt;
  }
  return { total, byKind, count: dues.length };
};

// Split dues into "this week / next week / later in window" buckets relative to
// `now`, each with its own running total.
export const bucketDuesByWeek = (dues = [], now = new Date()) => {
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const buckets = [
    { id: 'week1', label: 'This week', max: 7, items: [], total: 0 },
    { id: 'week2', label: 'Next week', max: 14, items: [], total: 0 },
    { id: 'rest', label: 'Later', max: Infinity, items: [], total: 0 },
  ];
  for (const d of dues) {
    const days = Math.floor((new Date(d.date) - today) / 86400000);
    const b = buckets.find((bk) => days < bk.max) || buckets[buckets.length - 1];
    b.items.push(d);
    b.total += Number(d.amount) || 0;
  }
  return buckets;
};
