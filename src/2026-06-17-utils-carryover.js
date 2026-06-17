// Util (2026-06-17): negative-month carryover — pure detection + row builder.
//
// Request: when a finished month ends negative ("the Wallet went negative"),
// offer to carry that deficit into the next month as a real, visible expense in
// the 'Debts' category, paid by Debit/Cash, dated the 5th of that next month.
//
// This module is PURE (no React, no storage). The context layer decides when to
// create the row (confirm-first) and persists a "dismissed" list.
//
// Safety rules baked in (see the review map):
//  - FEEDBACK-LOOP GUARD: a carryover row is itself a 'Debts' expense, so it
//    would deepen the NEXT month's net and snowball forever. We therefore tag it
//    'carryover' and EXCLUDE 'carryover'-tagged rows when measuring a month's
//    own net. (The row still shows as real spending in the Wallet / Cash Flow —
//    it just doesn't generate a fresh carryover of itself.)
//  - COMPLETED MONTHS ONLY: we look at the immediately-previous calendar month,
//    never the in-progress current month, and never mass-backfill old history.
//  - IDEMPOTENT id: `carryover-YYYY-MM`, so reloads/confirm-twice never duplicate.

export const ymKey = (year, month) =>
  `${year}-${String(month + 1).padStart(2, '0')}`;

export const monthLabel = (year, month) =>
  new Date(year, month, 1).toLocaleDateString('en-US', { month: 'long', year: 'numeric' });

// A month's own net = real income − real outflow for that calendar month,
// EXCLUDING any carryover rows (the feedback-loop guard). Sign convention
// matches the app's displayed Cash Flow / Wallet (monthBucketTotals): an income
// row adds, anything else subtracts. So "month ended negative" here means the
// same thing the user sees as a negative Wallet for that month.
export const monthNetExcludingCarryover = (transactions, year, month) => {
  let income = 0, out = 0;
  for (const t of transactions || []) {
    const d = new Date(t.date);
    if (d.getFullYear() !== year || d.getMonth() !== month) continue;
    if (Array.isArray(t.tags) && t.tags.includes('carryover')) continue;
    if (t.type === 'income') income += Number(t.amount) || 0;
    else out += Number(t.amount) || 0;
  }
  return income - out;
};

// The transaction we would create for a confirmed carryover. Kept NON-locked so
// the user can edit or delete it later; tagged 'carryover' so the guard above
// (and any future feature) can recognise it.
export const buildCarryoverTx = (pending) => ({
  id: pending.carryId,
  type: 'expense',
  amount: pending.deficit,
  description: `Carried-over deficit · ${pending.label}`,
  category: 'Debts',            // canonical name ('Debt' auto-normalises to this)
  paymentMethod: 'Debit/Cash',  // canonical cash/debit method id
  date: pending.nextDate,       // 5th of the following month, ISO
  tags: ['carryover'],
});

// Detect a pending carryover. We deliberately only consider the SINGLE most
// recent completed month (the month before the current one) so we never
// retroactively manufacture a backlog of debt rows across seeded history.
// Returns [] or a one-item array. Each item:
//   { ym, year, month, label, deficit, carryId, nextDate, nextLabel }
export const detectPendingCarryovers = (transactions, dismissed = [], now = new Date()) => {
  const prev = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  const year = prev.getFullYear();
  const month = prev.getMonth();
  const ym = ymKey(year, month);

  if ((dismissed || []).includes(ym)) return [];

  const carryId = `carryover-${ym}`;
  // Already carried over (row exists) → nothing pending.
  if ((transactions || []).some((t) => t.id === carryId)) return [];

  // Need at least one real (non-carryover) transaction that month to carry.
  const hasReal = (transactions || []).some((t) => {
    const d = new Date(t.date);
    if (d.getFullYear() !== year || d.getMonth() !== month) return false;
    return !(Array.isArray(t.tags) && t.tags.includes('carryover'));
  });
  if (!hasReal) return [];

  const net = monthNetExcludingCarryover(transactions, year, month);
  if (net >= 0) return [];

  // The "next month" is the current calendar month; the charge lands on its 5th.
  const nextDate = new Date(now.getFullYear(), now.getMonth(), 5).toISOString();
  return [{
    ym,
    year,
    month,
    label: monthLabel(year, month),
    deficit: Math.abs(net),
    carryId,
    nextDate,
    nextLabel: monthLabel(now.getFullYear(), now.getMonth()),
  }];
};

export default detectPendingCarryovers;
