// Shared, read-only math for the 2026-06-11 feature review (second run).
//
// Why this file exists:
//   The three features added in this run (Year in Review, Month Compare,
//   Unusual Spending Alerts) each need a little pure number-crunching. To
//   honour CLAUDE.md rule #4 (don't duplicate logic), the testable math lives
//   here once, and all period / income / expense definitions are reused from
//   the existing 2026-06-09 analytics util instead of being re-implemented.
//
// Money rules (CLAUDE.md "Project financial logic"):
//   - Transactions are the source of truth for REAL spending and income.
//   - "Savings" rows are money set aside, not spend/income — already excluded
//     by the shared helpers (periodTotals / categoryExpenseTotals).
//   - Nothing here formats currency; callers use the context `fmt()` so the
//     BRL/USD wallet toggle keeps working (display only).
//   - Actual vs committed are kept clearly separate (rule #5): the current
//     year is summed strictly up to "now" (year to date), and future-dated
//     rows (e.g. pending financing instalments) are reported separately as
//     `scheduledRest`, never merged into actuals.

import {
  clamp, inRange, periodTotals, categoryExpenseTotals, merchantTotals,
} from './2026-06-09-utils-analytics.js';

export { clamp };

const MONTH_LABEL = (year, monthIndex) =>
  new Date(year, monthIndex, 1).toLocaleDateString('en-US', { month: 'short' });

// ---------------------------------------------------------------------------
// 1. Year in Review
// ---------------------------------------------------------------------------
// Years worth showing in the selector: any year that has at least one
// transaction, capped at the current year (future-dated financing instalments
// exist out to 2029 — a "review" of a year that hasn't happened is noise).
export const availableYears = (transactions, now = new Date()) => {
  const cap = now.getFullYear();
  const set = new Set([cap]);
  for (const t of transactions || []) {
    const y = new Date(t.date).getFullYear();
    if (Number.isFinite(y) && y <= cap) set.add(y);
  }
  return [...set].sort((a, b) => b - a); // newest first
};

// Full-year (or year-to-date, for the current year) summary:
//   - per-month income/expense series (current month capped at `now` so
//     future-dated rows stay out of "actual")
//   - totals + savings rate + average monthly expense
//   - top categories / merchants of the year
//   - busiest & lightest month by expense
//   - prior-year comparison over the SAME window (YTD vs same-period-last-year
//     when the selected year is the current one, so the compare is fair)
//   - scheduledRest: committed future-dated outflows later this year, reported
//     separately from actuals (never added on top).
export const yearSummary = (transactions, year, now = new Date()) => {
  const isCurrent = year === now.getFullYear();
  const from = new Date(year, 0, 1);
  const to = isCurrent ? now : new Date(year, 11, 31, 23, 59, 59, 999);
  const lastMonthIndex = isCurrent ? now.getMonth() : 11;

  const months = [];
  for (let m = 0; m <= lastMonthIndex; m++) {
    const mFrom = new Date(year, m, 1);
    const mTo = (isCurrent && m === lastMonthIndex)
      ? now
      : new Date(year, m + 1, 0, 23, 59, 59, 999);
    const t = periodTotals(transactions, mFrom, mTo);
    months.push({ label: MONTH_LABEL(year, m), monthIndex: m, ...t });
  }

  const totals = months.reduce(
    (acc, m) => ({
      income: acc.income + m.income,
      expense: acc.expense + m.expense,
      fixed: acc.fixed + m.fixed,
    }),
    { income: 0, expense: 0, fixed: 0 }
  );
  totals.net = totals.income - totals.expense;
  totals.savingsRate = totals.income > 0 ? (totals.net / totals.income) * 100 : 0;
  const monthsElapsed = months.length;
  const avgMonthlyExpense = monthsElapsed ? totals.expense / monthsElapsed : 0;

  const catMap = categoryExpenseTotals(transactions, from, to);
  const topCategories = [...catMap.entries()]
    .map(([category, total]) => ({
      category, total,
      share: totals.expense > 0 ? (total / totals.expense) * 100 : 0,
    }))
    .sort((a, b) => b.total - a.total);
  const topMerchants = merchantTotals(transactions, from, to);

  let busiestMonth = null, lightestMonth = null;
  for (const m of months) {
    if (!busiestMonth || m.expense > busiestMonth.expense) busiestMonth = m;
    if (!lightestMonth || m.expense < lightestMonth.expense) lightestMonth = m;
  }

  const prevFrom = new Date(year - 1, 0, 1);
  const prevTo = isCurrent
    ? new Date(year - 1, now.getMonth(), now.getDate(), 23, 59, 59, 999)
    : new Date(year - 1, 11, 31, 23, 59, 59, 999);
  const prev = periodTotals(transactions, prevFrom, prevTo);
  const yoy = {
    hasPrior: prev.income !== 0 || prev.expense !== 0,
    prevIncome: prev.income,
    prevExpense: prev.expense,
    prevNet: prev.income - prev.expense,
    incomePct: prev.income > 0 ? ((totals.income - prev.income) / prev.income) * 100 : null,
    expensePct: prev.expense > 0 ? ((totals.expense - prev.expense) / prev.expense) * 100 : null,
  };

  // Committed-but-not-yet-actual outflows for the rest of the current year
  // (e.g. pending financing instalments). Reported separately (rule #5).
  let scheduledRest = 0;
  if (isCurrent) {
    const endOfYear = new Date(year, 11, 31, 23, 59, 59, 999);
    for (const t of transactions || []) {
      if (t.type !== 'expense' || t.category === 'Savings') continue;
      const d = new Date(t.date);
      if (d > now && d <= endOfYear) scheduledRest += t.amount;
    }
  }

  return {
    year, isCurrent, months, monthsElapsed, totals, avgMonthlyExpense,
    topCategories, topMerchants, busiestMonth, lightestMonth, yoy, scheduledRest,
  };
};

// ---------------------------------------------------------------------------
// 2. Month Compare
// ---------------------------------------------------------------------------
export const monthKeyOf = (year, monthIndex) =>
  `${year}-${String(monthIndex + 1).padStart(2, '0')}`;

// Selectable months, newest first: from the current calendar month back to the
// oldest transaction (capped at `maxMonths`). The current month is flagged
// `inProgress` so the UI can label it honestly (partial vs full month).
export const monthOptions = (transactions, maxMonths = 24, now = new Date()) => {
  let oldest = null;
  for (const t of transactions || []) {
    const d = new Date(t.date);
    if (!isNaN(d) && (!oldest || d < oldest)) oldest = d;
  }
  if (!oldest) oldest = now;
  const stop = new Date(oldest.getFullYear(), oldest.getMonth(), 1);
  const out = [];
  for (let i = 0; i < maxMonths; i++) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    if (d < stop) break;
    out.push({
      key: monthKeyOf(d.getFullYear(), d.getMonth()),
      year: d.getFullYear(),
      monthIndex: d.getMonth(),
      inProgress: i === 0,
      label: d.toLocaleDateString('en-US', { month: 'short', year: 'numeric' })
        + (i === 0 ? ' · in progress' : ''),
    });
  }
  return out;
};

const parseMonthKey = (key) => {
  const [y, m] = String(key || '').split('-').map(Number);
  return { year: y || 0, monthIndex: (m || 1) - 1 };
};
// The in-progress month is partial: cap its upper bound at `now` so pending
// future-dated rows this month (e.g. the seeded financing instalment later in
// the month) don't inflate the comparison before they occur. Past months use
// the full calendar month. Same "cap actuals at today" rule the other
// current-period reports use (CLAUDE.md rule #5: actual vs projected stay apart).
const monthRangeOf = ({ year, monthIndex }, now = new Date()) => {
  const isCurrent = year === now.getFullYear() && monthIndex === now.getMonth();
  return {
    from: new Date(year, monthIndex, 1),
    to: isCurrent ? now : new Date(year, monthIndex + 1, 0, 23, 59, 59, 999),
  };
};

// Side-by-side comparison of two calendar months ("a" is the month under the
// spotlight, "b" the baseline). Per-category rows are real expenses only and
// are sorted by the size of the change.
export const compareMonths = (transactions, aKey, bKey, now = new Date()) => {
  const A = parseMonthKey(aKey), B = parseMonthKey(bKey);
  const ra = monthRangeOf(A, now), rb = monthRangeOf(B, now);
  const ta = periodTotals(transactions, ra.from, ra.to);
  const tb = periodTotals(transactions, rb.from, rb.to);
  const ca = categoryExpenseTotals(transactions, ra.from, ra.to);
  const cb = categoryExpenseTotals(transactions, rb.from, rb.to);

  const cats = new Set([...ca.keys(), ...cb.keys()]);
  const rows = [...cats].map((category) => {
    const a = ca.get(category) || 0;
    const b = cb.get(category) || 0;
    const delta = a - b;
    // pct is null when the baseline month had nothing in this category
    // (a "new spending" row — can't express it as a % of zero).
    const pct = b > 0 ? (delta / b) * 100 : (a > 0 ? null : 0);
    return { category, a, b, delta, pct, isNew: b === 0 && a > 0, isGone: a === 0 && b > 0 };
  }).sort((x, y) => Math.abs(y.delta) - Math.abs(x.delta));

  const biggestIncrease = rows.find((r) => r.delta > 0) || null;
  const biggestDrop = rows.find((r) => r.delta < 0) || null;
  const maxRow = rows.reduce((mx, r) => Math.max(mx, r.a, r.b), 0);

  return {
    a: { key: aKey, ...ta, net: ta.income - ta.expense },
    b: { key: bKey, ...tb, net: tb.income - tb.expense },
    deltas: {
      income: ta.income - tb.income,
      expense: ta.expense - tb.expense,
      net: (ta.income - ta.expense) - (tb.income - tb.expense),
    },
    pct: {
      income: tb.income > 0 ? ((ta.income - tb.income) / tb.income) * 100 : null,
      expense: tb.expense > 0 ? ((ta.expense - tb.expense) / tb.expense) * 100 : null,
    },
    rows, biggestIncrease, biggestDrop, maxRow,
  };
};

// ---------------------------------------------------------------------------
// 3. Unusual Spending Alerts
// ---------------------------------------------------------------------------
// Flags individual transactions far above their category's typical ticket.
// Robust statistics (median + MAD) so one big outlier doesn't drag the
// baseline up with it. Deliberately conservative:
//   - baseline = ALL history of real, unlocked expenses per category
//     (locked rows are fixed commitments — financing instalments, recurring
//     fires — the same amount every month; they're neither mistakes nor
//     useful baseline for discretionary spending)
//   - a category needs >= minSamples transactions before it can flag anything
//   - threshold = max(median × multiplier, median + 3 × MAD): in flat
//     categories the multiplier rules; in naturally noisy categories the MAD
//     term raises the bar so normal variance doesn't page the user.
// The multiplier comes from a user-facing sensitivity toggle, which is what
// previous reviews said was missing before this could ship (no hidden tuning —
// the user picks how touchy it should be).
const median = (nums) => {
  if (!nums.length) return 0;
  const s = [...nums].sort((a, b) => a - b);
  const mid = Math.floor(s.length / 2);
  return s.length % 2 ? s[mid] : (s[mid - 1] + s[mid]) / 2;
};

export const SENSITIVITY_LEVELS = [
  { id: 'low', label: 'Fewer', multiplier: 4 },
  { id: 'medium', label: 'Balanced', multiplier: 3 },
  { id: 'high', label: 'More', multiplier: 2 },
];

export const unusualSpending = (
  transactions,
  { windowDays = 90, multiplier = 3, minSamples = 5, now = new Date() } = {}
) => {
  const eligible = (t) => t.type === 'expense' && t.category !== 'Savings' && !t.locked;

  // Per-category baselines over all history.
  const byCat = new Map();
  for (const t of transactions || []) {
    if (!eligible(t)) continue;
    const amt = Number(t.amount) || 0;
    if (amt <= 0) continue;
    if (!byCat.has(t.category)) byCat.set(t.category, []);
    byCat.get(t.category).push(amt);
  }
  const baselines = new Map();
  for (const [cat, amounts] of byCat) {
    if (amounts.length < minSamples) continue;
    const med = median(amounts);
    if (med <= 0) continue;
    const mad = median(amounts.map((a) => Math.abs(a - med)));
    baselines.set(cat, { median: med, mad, count: amounts.length });
  }

  // Scan the recent window.
  const start = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  start.setDate(start.getDate() - windowDays);

  const alerts = [];
  let scanned = 0;
  for (const t of transactions || []) {
    if (!eligible(t)) continue;
    const d = new Date(t.date);
    if (d < start || d > now) continue;
    const base = baselines.get(t.category);
    if (!base) continue;
    scanned += 1;
    const amt = Number(t.amount) || 0;
    const threshold = Math.max(base.median * multiplier, base.median + 3 * base.mad);
    if (amt <= threshold) continue;
    alerts.push({
      id: t.id,
      date: t.date,
      description: t.description || '(no description)',
      category: t.category,
      amount: amt,
      typical: base.median,
      ratio: amt / base.median,
      threshold,
      samples: base.count,
    });
  }
  alerts.sort((x, y) => y.ratio - x.ratio);

  return {
    alerts,
    scanned,
    categoriesCovered: baselines.size,
    windowDays,
    multiplier,
    minSamples,
  };
};
