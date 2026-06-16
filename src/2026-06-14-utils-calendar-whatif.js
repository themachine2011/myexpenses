// Shared, read-only math for the 2026-06-14 feature review.
//
// Why this file exists:
//   The two features added on 2026-06-14 (Cashflow Calendar, What-If Spending
//   Simulator) were deferred on 2026-06-12 because each touched an existing
//   feature. They are unblocked here by REUSING existing engines instead of
//   adding competing ones (CLAUDE.md rule #4: don't duplicate logic; rule #5:
//   two projection systems must never disagree):
//     - Cashflow Calendar buckets the same real income/expense rows the rest of
//       the analytics suite uses, and overlays the context `upcomingDues` list
//       (the same forward-commitment data the Bills tab and sidebar use).
//     - What-If reuses `projectCategorySpend` — the exact engine behind the
//       Planning → Category Projection Calculator — so a given reduction can
//       never produce a different number in the two places.
//
// Money rules (CLAUDE.md "Project financial logic"):
//   - Transactions are the source of truth for REAL spending and income.
//   - "Savings" rows are money set aside, not spend/income — excluded here,
//     same definition as the shared analytics helpers.
//   - "Net" is real income minus real expense for the day/month (cashflow).
//   - Dues are clearly PROJECTED (not yet spent) and kept separate from actuals.
//   - Nothing here formats currency; callers use the context `fmt()` so the
//     BRL/USD wallet toggle keeps working (display only).

import { projectCategorySpend } from './2026-05-18-logic-category-projection-calculations.js';

// Same real-spend/real-income definitions as the shared analytics util.
const isRealExpense = (t) => t.type === 'expense' && t.category !== 'Savings';
const isRealIncome = (t) => t.type === 'income' && t.category !== 'Savings';

const dayKey = (d) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

// ---------------------------------------------------------------------------
// 1. Cashflow Calendar (real month grid, per-day net + due overlay)
// ---------------------------------------------------------------------------
// Builds one calendar month as Sun..Sat week rows. Each in-month day carries
// its real income, real expense, net (income - expense), and any dues falling
// on that day. This is a different VIEW from the 52-week Spend Heatmap (density
// of past expense) and the Payment Calendar list (a picker of dues): a real
// grid showing signed daily cashflow with a forward due overlay.
//
//   transactions: source of truth for actuals.
//   dues:         whatever context.upcomingDues(days) returns
//                 ({ date, kind, label, amount, ... }) — PROJECTED, not spent.
export const cashflowCalendar = (transactions, dues = [], { year, month, now = new Date() } = {}) => {
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const y = year ?? now.getFullYear();
  const m = month ?? now.getMonth();
  const monthStart = new Date(y, m, 1);
  const monthEnd = new Date(y, m + 1, 0, 23, 59, 59, 999);
  // The current month is partial: real income/expense must stop at `now`. The
  // app seeds pending financing instalments as future-dated transaction rows
  // later this month, and those same rows come back from `upcomingDues` as
  // projected dues. Counting them as actuals would double-count them (in Net
  // AND in Due) before they happen. Past months use the whole month. Same
  // "cap actuals at today" rule as the budget/forecast reports — keeps actual
  // vs projected separate (CLAUDE.md rule #5).
  const isCurrentMonth = y === now.getFullYear() && m === now.getMonth();
  const actualsTo = isCurrentMonth ? now : monthEnd;

  // Real income/expense per day (actuals only — capped at today this month).
  const byDay = new Map(); // dayKey -> { income, expense, count }
  for (const t of transactions || []) {
    const d = new Date(t.date);
    if (d < monthStart || d > actualsTo) continue;
    const k = dayKey(d);
    let row = byDay.get(k);
    if (!row) { row = { income: 0, expense: 0, count: 0 }; byDay.set(k, row); }
    if (isRealIncome(t)) row.income += t.amount;
    else if (isRealExpense(t)) { row.expense += t.amount; row.count += 1; }
  }

  // Dues that land inside this month, bucketed by day. Kept separate from the
  // actual income/expense so projected money is never merged into real totals.
  const duesByDay = new Map();
  let dueTotal = 0;
  for (const due of dues || []) {
    const d = new Date(due.date);
    if (d < monthStart || d > monthEnd) continue;
    const k = dayKey(d);
    if (!duesByDay.has(k)) duesByDay.set(k, []);
    duesByDay.get(k).push(due);
    dueTotal += Number(due.amount) || 0;
  }

  const firstDow = monthStart.getDay(); // 0 = Sunday
  const daysInMonth = monthEnd.getDate();
  const cells = [];
  for (let i = 0; i < firstDow; i++) cells.push({ blank: true, key: `pre-${i}` });

  let income = 0, expense = 0, activeDays = 0;
  for (let day = 1; day <= daysInMonth; day++) {
    const date = new Date(y, m, day);
    const k = dayKey(date);
    const b = byDay.get(k) || { income: 0, expense: 0, count: 0 };
    income += b.income; expense += b.expense;
    if (b.count > 0) activeDays += 1;
    const dl = duesByDay.get(k) || [];
    cells.push({
      blank: false, key: k, date, day,
      income: b.income, expense: b.expense, net: b.income - b.expense, count: b.count,
      dues: dl, dueAmount: dl.reduce((s, x) => s + (Number(x.amount) || 0), 0),
      isToday: date.getTime() === today.getTime(),
      isFuture: date > today,
    });
  }
  while (cells.length % 7 !== 0) cells.push({ blank: true, key: `post-${cells.length}` });

  const weeks = [];
  for (let i = 0; i < cells.length; i += 7) weeks.push(cells.slice(i, i + 7));

  return {
    year: y, month: m,
    label: monthStart.toLocaleDateString('en-US', { month: 'long', year: 'numeric' }),
    weeks,
    totals: { income, expense, net: income - expense },
    dueTotal, daysInMonth, activeDays,
    isCurrentMonth,
  };
};

// ---------------------------------------------------------------------------
// 2. What-If Spending Simulator
// ---------------------------------------------------------------------------
// "Cut category X by N% → effect over M months." Each category is run through
// `projectCategorySpend` — the SAME function the Category Projection Calculator
// uses — so the two tools can never disagree (rule #5). `globalPct` is the
// default cut applied to every category; `overrides` lets one category use a
// different cut. Inputs are the category-average rows from the existing
// `buildCategoryAverageRows`, so the baseline averages also match the Calculator.
export const whatIfScenario = ({ rows = [], months = 12, globalPct = 0, overrides = {} } = {}) => {
  const m = Math.max(1, Number(months) || 1);
  let baseline = 0, reduced = 0;

  const perCategory = rows.map((row) => {
    const avg = Number(row.projectionAverage ?? row.average) || 0;
    const raw = overrides[row.category];
    const pct = raw === undefined || raw === null || raw === ''
      ? (Number(globalPct) || 0)
      : (Number(raw) || 0);
    const r = projectCategorySpend({ avg, months: m, reductionPct: pct });
    baseline += r.baseline;
    reduced += r.reduced;
    return {
      category: row.category,
      label: row.label || row.category,
      average: avg,
      reductionPct: pct,
      baseline: r.baseline,
      reduced: r.reduced,
      savings: r.savings,
      newMonthlyAvg: r.newMonthlyAvg,
    };
  }).sort((a, b) => b.savings - a.savings);

  const savings = baseline - reduced;
  return {
    months: m,
    perCategory,
    baseline, reduced, savings,
    monthly: savings / m,
    yearly: (savings / m) * 12,
    pct: baseline > 0 ? (savings / baseline) * 100 : 0,
  };
};

// Trailing-N-whole-months period for `buildCategoryAverageRows` (matches the
// Calculator's "3 mo / 6 mo / 12 mo" history presets so averages line up).
export const trailingMonthsPeriod = (months = 6, now = new Date()) => {
  const m = Math.max(1, Number(months) || 1);
  const from = new Date(now.getFullYear(), now.getMonth() - (m - 1), 1);
  const to = new Date(now);
  return {
    from, to, monthsIncluded: m,
    label: `last ${m} mo`,
  };
};
