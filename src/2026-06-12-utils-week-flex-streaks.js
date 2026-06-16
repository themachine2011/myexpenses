// Shared, read-only math for the 2026-06-12 feature review.
//
// Why this file exists:
//   The three features added on 2026-06-12 (This Week digest, Fixed vs Flex
//   split, No-Spend Streaks) each need a little pure number-crunching. To
//   honour CLAUDE.md rule #4 (don't duplicate logic), the testable math lives
//   here once, and period / expense definitions are reused from the existing
//   2026-06-09 analytics util instead of being re-implemented.
//
// Money rules (CLAUDE.md "Project financial logic"):
//   - Transactions are the source of truth for REAL spending and income.
//   - "Savings" rows are money set aside, not spend/income — excluded here,
//     same definition as the shared analytics helpers.
//   - Locked rows (financing instalments, fired recurring bills) are real
//     outflows and count as spending; they are the "committed" half of the
//     Fixed-vs-Flex split, and they never break a no-spend streak (you can't
//     "choose" not to pay an instalment that day).
//   - Nothing here formats currency; callers use the context `fmt()` so the
//     BRL/USD wallet toggle keeps working (display only).

import { inRange } from './2026-06-09-utils-analytics.js';

// Same real-spend/real-income definitions as the shared analytics util (they
// are module-private there; restated to keep the definition identical).
const isRealExpense = (t) => t.type === 'expense' && t.category !== 'Savings';
const isRealIncome = (t) => t.type === 'income' && t.category !== 'Savings';

const dayStart = (d) => new Date(d.getFullYear(), d.getMonth(), d.getDate());
const dayKey = (d) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

// ---------------------------------------------------------------------------
// 1. This Week digest (rolling 7 days vs the 7 days before)
// ---------------------------------------------------------------------------
// Every other tab thinks in months. This is the only weekly read: what went
// out over the last 7 days (today included), how that compares with the prior
// 7 days, where it went, and the biggest individual purchases.
export const weekDigest = (transactions, now = new Date()) => {
  const today = dayStart(now);
  const weekFrom = new Date(today); weekFrom.setDate(weekFrom.getDate() - 6);
  const weekTo = new Date(today); weekTo.setHours(23, 59, 59, 999);
  const prevFrom = new Date(today); prevFrom.setDate(prevFrom.getDate() - 13);
  const prevTo = new Date(today); prevTo.setDate(prevTo.getDate() - 7); prevTo.setHours(23, 59, 59, 999);

  let spent = 0, income = 0, count = 0, prevSpent = 0;
  const catMap = new Map();
  const expenses = [];

  for (const t of transactions || []) {
    if (isRealExpense(t)) {
      if (inRange(t, weekFrom, weekTo)) {
        spent += t.amount; count += 1;
        catMap.set(t.category, (catMap.get(t.category) || 0) + t.amount);
        expenses.push(t);
      } else if (inRange(t, prevFrom, prevTo)) {
        prevSpent += t.amount;
      }
    } else if (isRealIncome(t) && inRange(t, weekFrom, weekTo)) {
      income += t.amount;
    }
  }

  const topCategories = [...catMap.entries()]
    .map(([category, total]) => ({ category, total, share: spent > 0 ? (total / spent) * 100 : 0 }))
    .sort((a, b) => b.total - a.total);

  const biggest = expenses
    .slice()
    .sort((a, b) => b.amount - a.amount)
    .slice(0, 5);

  const delta = spent - prevSpent;
  return {
    from: weekFrom, to: weekTo,
    spent, income, count,
    perDay: spent / 7,
    prevSpent, delta,
    // pct is null when last week had nothing — callers show "new spending"
    // instead of a divide-by-zero percentage.
    pct: prevSpent > 0 ? (delta / prevSpent) * 100 : null,
    topCategories,
    topCategory: topCategories[0] || null,
    biggest,
  };
};

// ---------------------------------------------------------------------------
// 2. Fixed vs Flex (committed vs flexible spending)
// ---------------------------------------------------------------------------
// Splits real spending in [from, to] into "committed" (locked rows: financing
// instalments, fired recurring bills) and "flexible" (everything you chose to
// spend). Answers "how much of my spending could I actually cut?" — per
// category and in total.
export const fixedFlexReport = (transactions, from, to) => {
  const catMap = new Map();
  let fixed = 0, flex = 0;

  for (const t of transactions || []) {
    if (!isRealExpense(t)) continue;
    if (!inRange(t, from, to)) continue;
    let row = catMap.get(t.category);
    if (!row) { row = { category: t.category, fixed: 0, flex: 0, total: 0 }; catMap.set(t.category, row); }
    if (t.locked) { row.fixed += t.amount; fixed += t.amount; }
    else { row.flex += t.amount; flex += t.amount; }
    row.total += t.amount;
  }

  const total = fixed + flex;
  const rows = [...catMap.values()]
    .map((r) => ({ ...r, flexShare: r.total > 0 ? (r.flex / r.total) * 100 : 0 }))
    .sort((a, b) => b.total - a.total);

  return {
    rows, fixed, flex, total,
    fixedPct: total > 0 ? (fixed / total) * 100 : 0,
    flexPct: total > 0 ? (flex / total) * 100 : 0,
  };
};

// ---------------------------------------------------------------------------
// 3. No-Spend Streaks
// ---------------------------------------------------------------------------
// A "no-spend day" is a day with zero FLEXIBLE real spending. Committed rows
// (locked) and Savings transfers don't break a streak — those aren't choices
// made that day. Observation starts at the first transaction ever recorded
// (capped at `days` back) so an empty history doesn't fake a long streak.
export const streaksReport = (transactions, { days = 90, now = new Date() } = {}) => {
  const today = dayStart(now);

  let firstTxDay = null;
  const spendByDay = new Map(); // dayKey -> flexible spend that day
  for (const t of transactions || []) {
    const d = dayStart(new Date(t.date));
    if (d > today) continue; // future instalments aren't "days lived" yet
    if (!firstTxDay || d < firstTxDay) firstTxDay = d;
    if (!isRealExpense(t) || t.locked) continue;
    const k = dayKey(d);
    spendByDay.set(k, (spendByDay.get(k) || 0) + t.amount);
  }

  const windowStart = new Date(today); windowStart.setDate(windowStart.getDate() - (days - 1));
  const start = firstTxDay && firstTxDay > windowStart ? firstTxDay : windowStart;
  if (!firstTxDay) {
    return {
      observed: 0, current: 0, best: 0, bestStart: null, bestEnd: null,
      daysList: [], noSpend30: 0, observed30: 0, dailyAvg30: 0, todaySpent: false,
    };
  }

  const daysList = [];
  let best = 0, bestStart = null, bestEnd = null;
  let run = 0, runStart = null;
  for (let d = new Date(start); d <= today; d.setDate(d.getDate() + 1)) {
    const k = dayKey(d);
    const amount = spendByDay.get(k) || 0;
    const spentDay = amount > 0;
    daysList.push({ key: k, date: new Date(d), amount, spent: spentDay });
    if (!spentDay) {
      if (run === 0) runStart = new Date(d);
      run += 1;
      if (run > best) { best = run; bestStart = runStart; bestEnd = new Date(d); }
    } else {
      run = 0; runStart = null;
    }
  }

  // Current streak = consecutive no-spend days ending today.
  let current = 0;
  for (let i = daysList.length - 1; i >= 0 && !daysList[i].spent; i--) current += 1;

  const last30 = daysList.slice(-30);
  const noSpend30 = last30.filter((d) => !d.spent).length;
  const flexSum30 = last30.reduce((s, d) => s + d.amount, 0);

  return {
    observed: daysList.length,
    current, best, bestStart, bestEnd,
    daysList,
    noSpend30,
    observed30: last30.length,
    dailyAvg30: last30.length > 0 ? flexSum30 / last30.length : 0,
    todaySpent: daysList.length > 0 ? daysList[daysList.length - 1].spent : false,
  };
};
