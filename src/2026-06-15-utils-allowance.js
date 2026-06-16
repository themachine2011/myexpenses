// Shared, read-only math for the 2026-06-15 feature review: Daily Allowance
// (a.k.a. "safe to spend per day for the rest of this month").
//
// Why this file exists / how it stays consistent (CLAUDE.md rules #4 and #5):
//   Nothing in the app answers "how much can I still spend each day for the
//   rest of the month?" Forecast projects a single month-end figure; Budgets
//   tracks per-category limits. This derives a forward DAILY rate, and it does
//   so by REUSING `monthForecast` — the same engine behind the Forecast tab —
//   so the two tools can never disagree about income received, spend so far, or
//   bills still due. We add no new projection of future spend or income here.
//
// Money rules ("Project financial logic"):
//   - Transactions are the source of truth for REAL income and spend.
//   - "Actual so far" is capped at today (monthForecast already does this), so
//     a future-dated instalment can't inflate what's counted as already spent.
//   - Bills still due this month are subtracted as committed money, never
//     merged into actual spend (kept separate, like the Forecast tab).
//   - Two honest income bases are offered, both real (no future projection):
//       • "received"  — income actually received so far this month.
//       • "typical"   — last month's total income (a stable, full-month basis,
//                       useful early in the month before payday lands).
//   - Nothing here formats currency; callers use the context `fmt()` so the
//     BRL/USD wallet toggle keeps working (display only).

import { monthForecast } from './2026-06-10-utils-forecast.js';
import { periodTotals, monthRangeFor } from './2026-06-09-utils-analytics.js';

// Build the allowance report from the same numbers the Forecast tab uses.
//   transactions: source of truth for actuals.
//   dues:         whatever context.upcomingDues(days) returns — PROJECTED bills.
export const allowanceReport = (transactions, dues = [], now = new Date()) => {
  const f = monthForecast(transactions, dues, now);

  // Today through the last day of the month, inclusive. You can still spend
  // today, so today counts as a spendable day. min 1 guards the final day.
  const daysToSpread = Math.max(1, f.daysRemaining + 1);

  const spent = f.actual.expense;          // real, capped at today
  const dueRemaining = f.knownDuesTotal;   // committed bills still ahead this month
  const receivedIncome = f.actual.income;  // real income received so far

  // Last month's real income — a full-month basis that doesn't swing with when
  // payday lands. Real data, not a forecast of the future.
  const prevRange = monthRangeFor(1, now);
  const prev = periodTotals(transactions || [], prevRange.from, prevRange.to);
  const typicalIncome = prev.income;

  // pool = money you could still spend this month after setting aside the bills
  // that are already committed. Can be negative (you've spent/committed more
  // than the income basis) — reported honestly, the page shows it in the red.
  const make = (incomeBasis) => {
    const pool = incomeBasis - spent - dueRemaining;
    const perDay = pool / daysToSpread;
    return {
      incomeBasis,
      pool,
      perDay,
      perWeek: perDay * 7,
      negative: pool < 0,
    };
  };

  const received = make(receivedIncome);
  const typical = make(typicalIncome);

  // "On track" = the pool covers the run-rate estimate of remaining spend that
  // the Forecast tab already computes. Same number, so the two tabs agree.
  const projectedRemaining = f.projected.remainingSpend;

  return {
    monthLabel: f.monthLabel,
    daysInMonth: f.daysInMonth,
    daysElapsed: f.daysElapsed,
    daysRemaining: f.daysRemaining,
    daysToSpread,
    spent,
    dueRemaining,
    receivedIncome,
    typicalIncome,
    hasTypical: typicalIncome > 0,
    dailyPace: f.dailyPace,           // current real spend pace, for comparison
    projectedRemaining,
    received,
    typical,
  };
};
