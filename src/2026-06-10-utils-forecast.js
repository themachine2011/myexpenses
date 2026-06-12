// Shared, read-only math for the 2026-06-10 feature review.
//
// Why this file exists:
//   The three features added on 2026-06-10 (Month-End Cash Forecast, Savings
//   Goals Tracker, Spending Patterns) need a little pure math each. To honour
//   CLAUDE.md rule #4 (don't duplicate logic), the testable number-crunching
//   lives here once, and the period helpers are reused from the existing
//   2026-06-09 analytics util instead of being re-implemented.
//
// Money rules (CLAUDE.md "Project financial logic"):
//   - Transactions are the source of truth for REAL spending.
//   - "Savings" rows are money set aside, not spending (already excluded by the
//     2026-06-09 helpers). For the goals pace we look at Savings rows directly
//     because that IS the savings flow we want to measure.
//   - Nothing here formats currency; callers use the context `fmt()` so the
//     BRL/USD wallet toggle keeps working (display only).
//   - Actual / projected / combined are kept clearly separate (rule #5).

import {
  clamp, monthRangeFor, periodTotals, inRange, monthlyExpenseSeries,
} from './2026-06-09-utils-analytics.js';

export { clamp, monthRangeFor };

// ---------------------------------------------------------------------------
// 1. Month-End Cash Forecast
// ---------------------------------------------------------------------------
// A simple, transparent run-rate forecast for the CURRENT calendar month.
// It is deliberately a single top-level cash pace — NOT a per-category model —
// so it does not overlap or contradict the Category Projection Calculator.
//
// Returns clearly-separated actual vs projected vs combined figures:
//   actual    : income / expense / net recorded SO FAR this month.
//   pace      : average spend per elapsed day.
//   projected : extra spend expected over the remaining days (pace × daysLeft).
//   combined  : projected month-end expense (actual + projected) and the
//               projected month-end net (incomeSoFar − projected expense).
//   knownDues : known bills still due before month end (informational; these
//               may or may not already be captured by the run-rate, so they are
//               shown separately and never silently added on top).
export const monthForecast = (transactions, upcomingDuesList = [], now = new Date()) => {
  const cur = monthRangeFor(0, now);
  // "Actual so far" stops at `now`, not month-end: the full month range would
  // sweep future-dated rows (e.g. a pending financing instalment later this
  // month) into actuals and inflate the run-rate. Future commitments belong
  // in the separate knownDues section below.
  const totals = periodTotals(transactions, cur.from, now);

  const daysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
  const dayOfMonth = now.getDate();
  const daysElapsed = clamp(dayOfMonth, 1, daysInMonth);
  const daysRemaining = Math.max(0, daysInMonth - daysElapsed);

  const dailyPace = totals.expense / daysElapsed;
  const projectedRemainingSpend = dailyPace * daysRemaining;
  const projectedMonthExpense = totals.expense + projectedRemainingSpend;
  const projectedMonthNet = totals.income - projectedMonthExpense;

  // Last month's real total spend, for an at-a-glance "ahead / behind" read.
  const prev = periodTotals(transactions, monthRangeFor(1, now).from, monthRangeFor(1, now).to);
  const vsLastMonthPct = prev.expense > 0
    ? (projectedMonthExpense - prev.expense) / prev.expense * 100
    : null;

  // Known dues that still fall inside THIS month (heads-up, shown separately).
  // Window starts at the START of today, not `now`: upcomingDues() dates
  // same-day items at midnight, which an afternoon timestamp would wrongly
  // exclude — a bill due today is still due.
  const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const knownDues = (upcomingDuesList || [])
    .filter((d) => inRange({ date: d.date }, startOfToday, monthEnd))
    .map((d) => ({ ...d }));
  const knownDuesTotal = knownDues.reduce((s, d) => s + (Number(d.amount) || 0), 0);

  return {
    monthLabel: cur.label,
    daysInMonth, daysElapsed, daysRemaining, progress: daysElapsed / daysInMonth,
    actual: { income: totals.income, expense: totals.expense, net: totals.cashflow },
    dailyPace,
    projected: { remainingSpend: projectedRemainingSpend },
    combined: { monthExpense: projectedMonthExpense, monthNet: projectedMonthNet },
    prevExpense: prev.expense,
    vsLastMonthPct,
    knownDues, knownDuesTotal,
  };
};

// ---------------------------------------------------------------------------
// 2. Savings goal pace
// ---------------------------------------------------------------------------
// Average monthly savings inflow over the trailing `months`, derived straight
// from the Savings rows (income = put aside, expense = taken back out).
export const monthlySavingsPace = (transactions, months = 3, now = new Date()) => {
  let net = 0;
  const start = monthRangeFor(months - 1, now).from;
  const end = monthRangeFor(0, now).to;
  for (const t of transactions || []) {
    if (t.category !== 'Savings') continue;
    if (!inRange(t, start, end)) continue;
    net += t.type === 'income' ? t.amount : -t.amount;
  }
  return net / months; // can be negative if the user drew savings down
};

// Project how long until a goal is funded, given a monthly pace.
// Returns { pct, remaining, monthsToFund, etaLabel } — etaLabel is null when
// the pace is ≤ 0 (can't fund) or the goal is already met.
export const goalForecast = ({ allocated = 0, target = 0 }, pace = 0, now = new Date()) => {
  const remaining = Math.max(0, target - allocated);
  const pct = target > 0 ? clamp((allocated / target) * 100, 0, 100) : 0;
  if (remaining <= 0) return { pct: 100, remaining: 0, monthsToFund: 0, etaLabel: 'Funded' };
  if (pace <= 0) return { pct, remaining, monthsToFund: null, etaLabel: null };
  const monthsToFund = Math.ceil(remaining / pace);
  const eta = new Date(now.getFullYear(), now.getMonth() + monthsToFund, 1);
  const etaLabel = eta.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
  return { pct, remaining, monthsToFund, etaLabel };
};

// ---------------------------------------------------------------------------
// 3. Spending patterns (calendar rhythm)
// ---------------------------------------------------------------------------
// Buckets real expenses by weekday and by day-of-month over a date window, and
// reports the weekday vs weekend split. Pure function of transactions.
const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

export const spendingPatterns = (transactions, from, to) => {
  const weekday = WEEKDAYS.map((label) => ({ label, total: 0, count: 0 }));
  const dom = Array.from({ length: 31 }, (_, i) => ({ day: i + 1, total: 0, count: 0 }));
  let weekendTotal = 0, weekdayTotal = 0, grandTotal = 0, txCount = 0;

  for (const t of transactions || []) {
    if (t.type !== 'expense' || t.category === 'Savings') continue;
    if (!inRange(t, from, to)) continue;
    const d = new Date(t.date);
    const wd = d.getDay();
    weekday[wd].total += t.amount;
    weekday[wd].count += 1;
    const dim = Math.min(31, Math.max(1, d.getDate())) - 1;
    dom[dim].total += t.amount;
    dom[dim].count += 1;
    if (wd === 0 || wd === 6) weekendTotal += t.amount; else weekdayTotal += t.amount;
    grandTotal += t.amount;
    txCount += 1;
  }

  const busiestDay = weekday.reduce((a, b) => (b.total > a.total ? b : a), weekday[0]);
  const avgTicket = txCount > 0 ? grandTotal / txCount : 0;
  return {
    weekday, dom, weekendTotal, weekdayTotal, grandTotal, txCount, avgTicket, busiestDay,
  };
};

export { monthlyExpenseSeries };
