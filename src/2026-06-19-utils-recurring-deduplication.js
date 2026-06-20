const normalizeText = (value) => String(value || '').trim().replace(/\s+/g, ' ').toLowerCase();

const amountKey = (value) => Math.round((Number(value) || 0) * 100);

const monthKey = (value) => {
  const date = new Date(value);
  if (!Number.isFinite(date.getTime())) return '';
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
};

const isRecurringTransaction = (transaction) =>
  (Array.isArray(transaction?.tags) && transaction.tags.includes('recurring'))
  || (typeof transaction?.id === 'string' && transaction.id.startsWith('rec-'));

export const recurringTemplateFingerprint = (template) => {
  const description = normalizeText(template?.description);
  if (!description) return '';
  const day = Math.max(1, Math.min(28, Number(template?.dayOfMonth) || 1));
  return [
    template?.type === 'income' ? 'income' : 'expense',
    description,
    amountKey(template?.amount),
    normalizeText(template?.category),
    normalizeText(template?.paymentMethod || 'Bank Transfer'),
    day,
  ].join('|');
};

export const recurringTransactionFingerprint = (transaction) => {
  if (transaction?.type !== 'expense' || !isRecurringTransaction(transaction)) return '';
  const month = monthKey(transaction.date);
  const description = normalizeText(transaction.description);
  if (!month || !description) return '';
  return [
    month,
    description,
    amountKey(transaction.amount),
    normalizeText(transaction.category),
    normalizeText(transaction.paymentMethod || 'Bank Transfer'),
  ].join('|');
};

const preferredTemplate = (existing, candidate) => {
  const existingFired = String(existing?.lastFiredKey || '');
  const candidateFired = String(candidate?.lastFiredKey || '');
  if (candidateFired > existingFired) return candidate;
  if (candidateFired === existingFired && !existing?.id && candidate?.id) return candidate;
  return existing;
};

export const dedupeRecurringTemplates = (templates) => {
  if (!Array.isArray(templates) || templates.length < 2) return templates || [];
  const indexByFingerprint = new Map();
  const unique = [];
  let changed = false;
  for (const template of templates) {
    const fingerprint = recurringTemplateFingerprint(template);
    if (!fingerprint || !indexByFingerprint.has(fingerprint)) {
      if (fingerprint) indexByFingerprint.set(fingerprint, unique.length);
      unique.push(template);
      continue;
    }
    const index = indexByFingerprint.get(fingerprint);
    unique[index] = preferredTemplate(unique[index], template);
    changed = true;
  }
  return changed ? unique : templates;
};

export const dedupeRecurringTransactions = (transactions) => {
  if (!Array.isArray(transactions) || transactions.length < 2) return transactions || [];
  const seen = new Set();
  const unique = [];
  let changed = false;
  for (const transaction of transactions) {
    const fingerprint = recurringTransactionFingerprint(transaction);
    if (fingerprint && seen.has(fingerprint)) {
      changed = true;
      continue;
    }
    if (fingerprint) seen.add(fingerprint);
    unique.push(transaction);
  }
  return changed ? unique : transactions;
};
