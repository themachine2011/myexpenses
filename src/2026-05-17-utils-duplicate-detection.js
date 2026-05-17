// Duplicate detection for transactions.
//
// A duplicate is a transaction that shares the same calendar day, the same
// absolute amount, the same payment method, and (case-insensitively) the
// same description as an existing transaction.
//
// This is intentionally narrow: it should NOT flag two genuine same-day
// charges that just happen to share an amount, so description has to match
// too. The dedupe is a soft warning surface — callers decide whether to
// block, prompt, or proceed.

const dayKey = (date) => {
  const d = date instanceof Date ? date : new Date(date);
  if (isNaN(d.getTime())) return '';
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};

const fingerprint = (tx) => {
  const dk = dayKey(tx?.date);
  const amt = Math.round((Number(tx?.amount) || 0) * 100);
  const desc = String(tx?.description || '').trim().toLowerCase();
  const pm = String(tx?.paymentMethod || '').trim().toLowerCase();
  return `${dk}|${amt}|${pm}|${desc}`;
};

export const buildDuplicateIndex = (existing) => {
  const idx = new Map();
  if (!Array.isArray(existing)) return idx;
  for (const tx of existing) {
    if (!tx) continue;
    const fp = fingerprint(tx);
    if (!fp) continue;
    if (!idx.has(fp)) idx.set(fp, []);
    idx.get(fp).push(tx);
  }
  return idx;
};

export const findDuplicate = (candidate, existing) => {
  if (!candidate) return null;
  const fp = fingerprint(candidate);
  if (!fp) return null;
  if (existing instanceof Map) {
    const hits = existing.get(fp);
    return hits && hits.length ? hits[0] : null;
  }
  if (!Array.isArray(existing)) return null;
  for (const tx of existing) {
    if (!tx || tx.id === candidate.id) continue;
    if (fingerprint(tx) === fp) return tx;
  }
  return null;
};

// Filter a candidate list against an existing collection, returning
// { unique, duplicates }. Useful for batch imports.
export const partitionDuplicates = (candidates, existing) => {
  const idx = existing instanceof Map ? existing : buildDuplicateIndex(existing);
  const seenInBatch = new Map();
  const unique = [];
  const duplicates = [];
  for (const c of candidates || []) {
    if (!c) { duplicates.push(c); continue; }
    const fp = fingerprint(c);
    if (!fp) { unique.push(c); continue; }
    if (idx.has(fp) || seenInBatch.has(fp)) {
      duplicates.push(c);
    } else {
      unique.push(c);
      seenInBatch.set(fp, c);
    }
  }
  return { unique, duplicates };
};
