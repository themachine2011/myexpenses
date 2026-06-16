// Shared, read-only math for the 2026-06-16 feature review.
//
// Why this file exists:
//   The Subscriptions tab is MANUAL only — the user has to hand-type every
//   recurring template. Nothing looks at the real transaction history to find
//   charges that already repeat on a regular cadence (Netflix, gym, insurance,
//   that gaming sub you forgot). `detectRecurring` does exactly that, as a pure
//   function so it can be unit-tested and reused (CLAUDE.md rule #4).
//
// Money rules (CLAUDE.md "Project financial logic"):
//   - Transactions are the source of truth for REAL spending.
//   - "Savings" rows are money set aside, not spending → excluded.
//   - This file never invents future money: it only reports the cadence and the
//     monthly-equivalent of charges that ALREADY happened. "Next expected" is a
//     simple last-date + median-gap projection, clearly labelled as a guess.
//   - Nothing here formats currency; callers use the context `fmt()` so the
//     BRL/USD wallet toggle keeps working (display only).
//
// The detector is deliberately conservative: it would rather miss a real
// subscription than wrongly flag variable spend (e.g. groceries at one store)
// as recurring. Three independent gates must all pass — enough repeats, a
// regular interval, and a stable amount.

import { normalizeMerchant } from './2026-06-09-utils-analytics.js';

const DAY = 86400000;

export const median = (arr) => {
  if (!arr || !arr.length) return 0;
  const s = [...arr].sort((a, b) => a - b);
  const m = Math.floor(s.length / 2);
  return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2;
};

// Recognised billing rhythms. `perMonth` converts one charge into a monthly
// equivalent so different cadences can be summed into one "monthly load".
export const CADENCES = [
  { id: 'weekly',    label: 'Weekly',        days: 7,  min: 5,  max: 10,  perMonth: 30 / 7 },
  { id: 'biweekly',  label: 'Every 2 weeks', days: 14, min: 11, max: 18,  perMonth: 30 / 14 },
  { id: 'monthly',   label: 'Monthly',       days: 30, min: 24, max: 38,  perMonth: 1 },
  { id: 'quarterly', label: 'Quarterly',     days: 91, min: 78, max: 104, perMonth: 1 / 3 },
];

export const classifyCadence = (gapDays) =>
  CADENCES.find((c) => gapDays >= c.min && gapDays <= c.max) || null;

// Detect recurring charges from the trailing `windowMonths` of transactions.
//
// transactions       : the source-of-truth rows.
// recurringTemplates  : the user's manual Subscriptions templates, used only to
//                       mark a detected series as already "tracked".
// Returns { items, activeItems, monthlyTotal, trackedMonthly, untrackedMonthly,
//           untrackedCount, count, annualTotal, windowMonths }.
export const detectRecurring = (transactions, recurringTemplates = [], now = new Date(), opts = {}) => {
  const windowMonths = opts.windowMonths || 6;
  const minCount     = opts.minCount || 3;
  const start = new Date(now.getFullYear(), now.getMonth() - windowMonths + 1, 1);

  // Group real expenses by normalized merchant key.
  const groups = new Map();
  for (const t of transactions || []) {
    if (t.type !== 'expense' || t.category === 'Savings') continue;
    const d = new Date(t.date);
    if (isNaN(d) || d < start || d > now) continue;
    const raw = (t.description || '').trim() || '(no description)';
    const key = normalizeMerchant(raw);
    let g = groups.get(key);
    if (!g) { g = { key, names: {}, txs: [] }; groups.set(key, g); }
    g.txs.push({ date: d, amount: Number(t.amount) || 0, category: t.category });
    g.names[raw] = (g.names[raw] || 0) + 1;
  }

  const trackedKeys = new Set(
    (recurringTemplates || [])
      .map((r) => normalizeMerchant(r.description || ''))
      .filter(Boolean)
  );

  const items = [];
  for (const g of groups.values()) {
    if (g.txs.length < minCount) continue;
    g.txs.sort((a, b) => a.date - b.date);

    // Gate 1 — a regular interval.
    const gaps = [];
    for (let i = 1; i < g.txs.length; i++) gaps.push((g.txs[i].date - g.txs[i - 1].date) / DAY);
    const medGap = median(gaps);
    const cadence = classifyCadence(medGap);
    if (!cadence) continue;
    const tol = Math.max(2, medGap * 0.35);
    const regularN = gaps.filter((x) => Math.abs(x - medGap) <= tol).length;
    const regularity = gaps.length ? regularN / gaps.length : 0;
    if (regularity < 0.6) continue;

    // Gate 2 — a stable amount (variable spend like groceries is rejected here).
    const amounts = g.txs.map((t) => t.amount);
    const mean = amounts.reduce((s, a) => s + a, 0) / amounts.length;
    const variance = amounts.reduce((s, a) => s + (a - mean) ** 2, 0) / amounts.length;
    const cv = mean > 0 ? Math.sqrt(variance) / mean : 0;
    if (cv > 0.4) continue;

    const typicalAmount = median(amounts);
    const last = g.txs[g.txs.length - 1];
    const lastDate = last.date;
    const nextDate = new Date(lastDate.getTime() + medGap * DAY);
    const monthlyEquiv = typicalAmount * cadence.perMonth;
    const sinceLast = (now - lastDate) / DAY;
    const active = sinceLast <= cadence.days * 1.6; // still live, not cancelled

    let best = null, bn = -1;
    for (const [n, c] of Object.entries(g.names)) if (c > bn) { best = n; bn = c; }

    // Financing instalments already exist as future-dated, pre-scheduled rows,
    // so they are NOT a "blind spot" and must NOT get a one-click recurring
    // template (that would double-count the loan). They still count toward the
    // recurring monthly load — they ARE a recurring cost — but are treated as
    // already accounted for, not as something to start tracking.
    const scheduled = last.category === 'Financing';

    items.push({
      key: g.key,
      name: best,
      category: last.category,
      count: g.txs.length,
      typicalAmount,
      cadence: cadence.id,
      cadenceLabel: cadence.label,
      medianGapDays: Math.round(medGap),
      monthlyEquiv,
      cv,
      regularity,
      lastDate: lastDate.toISOString(),
      nextDate: nextDate.toISOString(),
      active,
      tracked: trackedKeys.has(g.key),
      scheduled,
    });
  }

  items.sort((a, b) => b.monthlyEquiv - a.monthlyEquiv);

  const activeItems = items.filter((i) => i.active);
  const monthlyTotal = activeItems.reduce((s, i) => s + i.monthlyEquiv, 0);
  // "Untracked" = a real blind spot: active, not saved as a Subscriptions
  // template, and not an already-scheduled financing instalment.
  const untracked        = activeItems.filter((i) => !i.tracked && !i.scheduled);
  const untrackedMonthly = untracked.reduce((s, i) => s + i.monthlyEquiv, 0);
  const accountedMonthly = monthlyTotal - untrackedMonthly; // tracked subs + scheduled financing

  return {
    items,
    activeItems,
    windowMonths,
    monthlyTotal,
    accountedMonthly,
    untrackedMonthly,
    untrackedCount: untracked.length,
    count: items.length,
    annualTotal: monthlyTotal * 12,
  };
};
