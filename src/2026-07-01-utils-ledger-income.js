// Ledger · Income Visibility (2026-07-01) — pure, read-only income math.
//
// Why this file exists:
//   The Ledger's new "Income" sub-tab needs to filter, group and summarise
//   income, but MUST NOT invent, estimate, simulate, mock or hardcode any
//   value. All of that is number-crunching on the REAL `transactions` array,
//   so — following the project rule "don't duplicate logic; testable math lives
//   in utils" — the definitions live here once and the view only renders them.
//
// Money rules (aligned with the rest of the app):
//   - Income is a transaction with type === 'income'.
//   - "Savings" rows are money moved between pockets, not real income, so they
//     are excluded — exactly the app-wide `isRealIncome` rule already used by
//     Income Insights, the Dashboard KPIs and periodTotals().
//   - Received vs Pending reuses EXISTING signals only (see incomeStatus).
//   - Nothing here formats currency; callers use the context `fmt()` so the
//     BRL/USD wallet toggle keeps working (display only).

// A "Savings" transfer is money set aside, not earned income.
export const INCOME_TRANSFER_CATEGORY = 'Savings';

// Real income = an income-typed transaction that is not an internal Savings
// transfer. Same rule as `isRealIncome` in the analytics util.
export const isRealIncome = (tx) =>
  tx && tx.type === 'income' && tx.category !== INCOME_TRANSFER_CATEGORY;

// Received vs Pending — reuse the two signals the app ALREADY has, do not
// invent a new pending system:
//   1. An explicit status field ('paid'/'pending'), as financing installments
//      set it. 'pending' → pending, 'paid' → received.
//   2. Otherwise fall back to the date convention the Ledger already uses to
//      paint "expected" rows gold: a future-dated income row is still expected
//      (pending); a past/today row has been received.
export const incomeStatus = (tx, now = new Date()) => {
  if (tx && tx.status === 'pending') return 'pending';
  if (tx && tx.status === 'paid') return 'received';
  const d = new Date(tx && tx.date);
  if (!Number.isFinite(d.getTime())) return 'received';
  return d > now ? 'pending' : 'received';
};

export const isPendingIncome = (tx, now = new Date()) => incomeStatus(tx, now) === 'pending';

// "Where is this money coming from?" — the income source. The real payee lives
// in the description (e.g. "Rent Income · 10/12", "Monthly salary"); the category
// is often a generic "Income". So the source is the description with any trailing
// installment/sequence marker stripped ("· 10/12", " 3/12", "(2/6)"), falling
// back to the category when there is no description. Purely display grouping —
// it never changes stored data.
export const incomeSourceLabel = (tx) => {
  const desc = (tx && tx.description || '').trim();
  if (!desc) return (tx && tx.category) || 'Uncategorized';
  const base = desc
    .replace(/[·•\-–—(\[]+\s*\d{1,3}\s*\/\s*\d{1,3}\s*[)\]]?\s*$/, '') // "· 10/12" / "(2/6)" / "[1/2]" tail
    .replace(/\s+\d{1,3}\s*\/\s*\d{1,3}\s*$/, '')                      // " 10/12" tail
    .replace(/[·•\-–—]\s*$/, '')                                        // dangling separator
    .trim();
  return base || desc;
};

// Case-insensitive grouping key for a source label.
export const incomeSourceKey = (tx) => incomeSourceLabel(tx).toLowerCase();

// Calendar-month window `offset` months from `now` (0 = current, -1 = last).
export const monthRangeForOffset = (offset = 0, now = new Date()) => ({
  from: new Date(now.getFullYear(), now.getMonth() + offset, 1, 0, 0, 0, 0),
  to: new Date(now.getFullYear(), now.getMonth() + offset + 1, 0, 23, 59, 59, 999),
});

// Parse a "YYYY-MM-DD" (or any Date-parseable) value into a local boundary,
// mirroring resolveRange()'s custom-range handling so the between-dates filter
// behaves identically to the rest of the app.
export const parseBoundary = (value, endOfDay = false) => {
  if (!value) return null;
  const m = typeof value === 'string' && /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  const d = m
    ? new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]))
    : new Date(value);
  if (!Number.isFinite(d.getTime())) return null;
  d.setHours(endOfDay ? 23 : 0, endOfDay ? 59 : 0, endOfDay ? 59 : 0, endOfDay ? 999 : 0);
  return d;
};

// Resolve a period descriptor into a {from, to} window (nulls = unbounded).
//   { kind: 'all' }                         → no date bounds
//   { kind: 'month', offset }               → a single calendar month
//   { kind: 'range', from, to }             → an inclusive custom range
export const resolveIncomeRange = (period = { kind: 'all' }, now = new Date()) => {
  if (period.kind === 'month') return monthRangeForOffset(period.offset || 0, now);
  if (period.kind === 'range') {
    return { from: parseBoundary(period.from, false), to: parseBoundary(period.to, true) };
  }
  return { from: null, to: null };
};

// The one and only place income rows are selected. Returns real income only,
// newest first. Every filter is a plain predicate over stored fields — no data
// is created or altered.
export const filterIncome = (transactions = [], opts = {}) => {
  const {
    period = { kind: 'all' },
    status = 'all',   // 'all' | 'received' | 'pending'
    source = 'all',   // 'all' | <source key from incomeSourceKey>
    query = '',
    now = new Date(),
  } = opts;
  const { from, to } = resolveIncomeRange(period, now);
  const q = (query || '').trim().toLowerCase();

  return transactions
    .filter((t) => {
      if (!isRealIncome(t)) return false;
      const d = new Date(t.date);
      if (from && d < from) return false;
      if (to && d > to) return false;
      if (status !== 'all' && incomeStatus(t, now) !== status) return false;
      if (source !== 'all' && incomeSourceKey(t) !== source) return false;
      if (q) {
        const hay = `${t.description || ''} ${t.category || ''} ${t.paymentMethod || ''} ${(t.tags || []).join(' ')} ${t.amount}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    })
    .sort((a, b) => new Date(b.date) - new Date(a.date));
};

// Summary numbers for a already-filtered list. Everything is derived from the
// list passed in, so totals can never disagree with what the user sees.
export const summarizeIncome = (list = [], now = new Date()) => {
  let total = 0, pending = 0, received = 0;
  const bySource = new Map();
  for (const t of list) {
    const amt = Number(t.amount) || 0;
    total += amt;
    if (incomeStatus(t, now) === 'pending') pending += amt; else received += amt;
    const key = incomeSourceKey(t);
    if (!bySource.has(key)) bySource.set(key, { label: incomeSourceLabel(t), amount: 0 });
    bySource.get(key).amount += amt;
  }
  let topSource = null;
  for (const [, entry] of bySource) {
    if (!topSource || entry.amount > topSource.amount) topSource = { name: entry.label, amount: entry.amount };
  }
  if (topSource) topSource.share = total > 0 ? (topSource.amount / total) * 100 : 0;
  return { total, count: list.length, pending, received, topSource, sourceCount: bySource.size };
};

// Group an already-filtered list by income source (description-derived), richest
// first. `category` keeps the first row's category so the UI can colour the dot.
export const groupIncomeBySource = (list = [], now = new Date()) => {
  const map = new Map();
  for (const t of list) {
    const key = incomeSourceKey(t);
    if (!map.has(key)) map.set(key, { key, label: incomeSourceLabel(t), category: t.category || 'Uncategorized', total: 0, count: 0, pending: 0, received: 0, items: [] });
    const g = map.get(key);
    const amt = Number(t.amount) || 0;
    g.total += amt;
    g.count += 1;
    g.items.push(t);
    if (incomeStatus(t, now) === 'pending') g.pending += amt; else g.received += amt;
  }
  return Array.from(map.values()).sort((a, b) => b.total - a.total);
};

// Group an already-filtered list by calendar month, newest month first.
export const groupIncomeByMonth = (list = [], now = new Date()) => {
  const map = new Map();
  for (const t of list) {
    const d = new Date(t.date);
    if (!Number.isFinite(d.getTime())) continue;
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
    if (!map.has(key)) {
      map.set(key, { key, year: d.getFullYear(), month: d.getMonth(), total: 0, count: 0, pending: 0, received: 0, items: [] });
    }
    const g = map.get(key);
    const amt = Number(t.amount) || 0;
    g.total += amt;
    g.count += 1;
    g.items.push(t);
    if (incomeStatus(t, now) === 'pending') g.pending += amt; else g.received += amt;
  }
  return Array.from(map.values()).sort((a, b) => (b.year - a.year) || (b.month - a.month));
};

// A short human label for the active period + status, e.g.
// "Current Month", "Pending · All time", "01/06/2026 – 30/06/2026".
export const incomePeriodLabel = (period = { kind: 'all' }, status = 'all', now = new Date()) => {
  let base;
  if (period.kind === 'month') {
    const off = period.offset || 0;
    const { from } = monthRangeForOffset(off, now);
    base = off === 0 ? 'Current Month' : from.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
  } else if (period.kind === 'range') {
    const f = parseBoundary(period.from, false);
    const t = parseBoundary(period.to, true);
    if (f && t) base = `${f.toLocaleDateString('en-GB')} – ${t.toLocaleDateString('en-GB')}`;
    else if (f) base = `From ${f.toLocaleDateString('en-GB')}`;
    else if (t) base = `Until ${t.toLocaleDateString('en-GB')}`;
    else base = 'Custom range';
  } else {
    base = 'All time';
  }
  const statusLabel = status === 'pending' ? 'Pending' : status === 'received' ? 'Received' : null;
  return statusLabel ? `${statusLabel} · ${base}` : base;
};
