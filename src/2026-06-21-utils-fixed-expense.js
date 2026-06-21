// ── Fixed-expense rule (single source of truth for the WHOLE app) ────────────
//
// One question, one answer, used everywhere: is THIS expense a fixed expense?
// Kept framework-free (plain .js, no React/recharts) so the charts, the
// Dashboard KPIs, the Wallet breakdown, the analytics utils and the
// Fixed-vs-Flex tab can all import the SAME rule instead of each rolling their
// own `tx.locked` check (CLAUDE.md rule #4: don't duplicate logic).
//
// A purchase is Fixed when the user is committed to it for the long term:
//   1. It's `locked` — financing instalments and fired recurring bills are
//      stored locked:true.
//   2. It's a subscription — a recurring/subscription tag, a `rec-…` id, or a
//      category named like "…Subscription…". Subscriptions are ALWAYS fixed,
//      even a Netflix charge typed in by hand that never got locked.
//   3. It belongs to an instalment / scheduled-payment group (shared groupId)
//      whose plan runs 6 monthly payments — or a 6-month span — or longer.
// Anything shorter (a one-off, or a 2–3x split) stays Variable.
//
// Reclassifying fixed↔variable NEVER changes income, total expense or cash
// flow — only which side of the fixed/variable split a row lands on. Each
// caller keeps its own income / Savings filtering; this only answers
// fixed-vs-not for a row that is already known to be a real expense.

export const FIXED_MONTHS_THRESHOLD = 6;

// From the FULL transaction list, the set of groupIds whose payment plan lasts
// FIXED_MONTHS_THRESHOLD months or longer. Always pass the whole list — a plan
// can span months the caller is about to filter out. Split-purchase legs share
// a groupId but all fall on ONE date, so they collapse to a single month and
// never trip the test.
export const fixedDurationGroupIds = (transactions, threshold = FIXED_MONTHS_THRESHOLD) => {
  const monthsByGroup = new Map(); // groupId -> Set<year*12 + month>
  for (const tx of transactions || []) {
    if (!tx || tx.type === 'income' || !tx.groupId) continue;
    const d = new Date(tx.date);
    if (Number.isNaN(d.getTime())) continue;
    const idx = d.getFullYear() * 12 + d.getMonth();
    let months = monthsByGroup.get(tx.groupId);
    if (!months) { months = new Set(); monthsByGroup.set(tx.groupId, months); }
    months.add(idx);
  }
  const fixed = new Set();
  for (const [groupId, months] of monthsByGroup) {
    const idxs = [...months];
    const span = idxs.length ? Math.max(...idxs) - Math.min(...idxs) + 1 : 0;
    // 6+ distinct payment months, OR a 6-month-or-longer span (handles gaps).
    if (months.size >= threshold || span >= threshold) fixed.add(groupId);
  }
  return fixed;
};

// Is this row a subscription / recurring commitment? Broad on purpose so a
// subscription is ALWAYS fixed, however it got into the app:
//   - tagged 'recurring' or 'subscription' (auto-fired or manual),
//   - a recurring-fire id (rec-…),
//   - or a category whose name contains "subscription" (e.g. "Online
//     Subscriptions") for charges typed or imported by hand.
export const isSubscriptionTx = (tx) => {
  if (!tx) return false;
  const tags = Array.isArray(tx.tags) ? tx.tags : [];
  if (tags.includes('recurring') || tags.includes('subscription')) return true;
  if (typeof tx.id === 'string' && tx.id.startsWith('rec-')) return true;
  return String(tx.category || '').toLowerCase().includes('subscription');
};

// THE single source of truth. Pass the groupId set from fixedDurationGroupIds
// (computed ONCE over the full list, never per row). Income rows are never a
// "fixed expense".
export const isFixedExpense = (tx, fixedGroupIds) => {
  if (!tx || tx.type === 'income') return false;
  return !!(
    tx.locked ||
    isSubscriptionTx(tx) ||
    (tx.groupId && fixedGroupIds && fixedGroupIds.has(tx.groupId))
  );
};
