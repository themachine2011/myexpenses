// Pure validators for transaction inputs. Returns { ok: true } or
// { ok: false, errors: { [field]: message } }.

const MS_PER_DAY = 24 * 60 * 60 * 1000;
const MAX_PAST_DAYS   = 10 * 365;
const MAX_FUTURE_DAYS = 365;

const checkDescription = (description) => {
  if (typeof description !== 'string') return 'Description is required.';
  if (!description.trim()) return 'Description is required.';
  return null;
};

const checkAmount = (amount) => {
  const n = Number(amount);
  if (!isFinite(n)) return 'Amount must be a number.';
  if (n <= 0) return 'Amount must be greater than zero.';
  return null;
};

const checkDate = (date) => {
  if (date == null || date === '') return 'Date is required.';
  const d = new Date(date);
  if (isNaN(d.getTime())) return 'Date is not valid.';
  const now = Date.now();
  const diff = d.getTime() - now;
  if (diff > MAX_FUTURE_DAYS * MS_PER_DAY) return "Date can't be more than a year in the future.";
  if (-diff > MAX_PAST_DAYS * MS_PER_DAY) return "Date can't be more than 10 years in the past.";
  return null;
};

const checkType = (type) => {
  if (type === 'income' || type === 'expense' || type === 'transfer') return null;
  return 'Type must be income or expense.';
};

const checkCategory = (category) => {
  if (typeof category !== 'string') return 'Category is required.';
  if (!category.trim()) return 'Category is required.';
  return null;
};

export const validateTransaction = (tx) => {
  const errors = {};
  const e1 = checkDescription(tx?.description); if (e1) errors.description = e1;
  const e2 = checkAmount(tx?.amount);           if (e2) errors.amount      = e2;
  const e3 = checkDate(tx?.date);                if (e3) errors.date        = e3;
  if (tx?.type !== undefined) {
    const e4 = checkType(tx.type);              if (e4) errors.type        = e4;
  }
  const e5 = checkCategory(tx?.category);       if (e5) errors.category    = e5;
  if (Object.keys(errors).length) return { ok: false, errors };
  return { ok: true };
};

export const validatePatch = (patch) => {
  if (!patch || typeof patch !== 'object') return { ok: true };
  const errors = {};
  if (patch.description !== undefined) {
    const e = checkDescription(patch.description); if (e) errors.description = e;
  }
  if (patch.amount !== undefined) {
    const e = checkAmount(patch.amount); if (e) errors.amount = e;
  }
  if (patch.date !== undefined) {
    const e = checkDate(patch.date); if (e) errors.date = e;
  }
  if (patch.type !== undefined) {
    const e = checkType(patch.type); if (e) errors.type = e;
  }
  if (patch.category !== undefined) {
    const e = checkCategory(patch.category); if (e) errors.category = e;
  }
  if (Object.keys(errors).length) return { ok: false, errors };
  return { ok: true };
};
