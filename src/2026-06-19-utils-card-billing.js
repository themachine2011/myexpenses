// Credit-card billing rule.
//
// Some cards are paid on a fixed due day of the FOLLOWING month, not on the day
// of purchase. For those, a transaction keeps its real purchase day in a
// `purchaseDate` field, but its main `date` becomes the payment due date — so
// the app's calendar-month money math (Wallet, Cash Flow, charts, card stats,
// all of which key off `tx.date`) counts the charge in the month the bill is
// actually paid.
//
// Pure logic, no imports — Node-testable.

// method id -> day of next month the bill is due. Extensible (e.g. Nubank later).
export const CARD_DUE_DAY = {
  'VISA Mercado Pago': 10,
};

export const isPostponedCard = (method) =>
  Object.prototype.hasOwnProperty.call(CARD_DUE_DAY, method);

// Parse 'YYYY-MM-DD' (or the date part of an ISO string) into a LOCAL midnight
// Date, sidestepping the UTC "off by one day" trap of new Date('YYYY-MM-DD').
// Falls back to a permissive parse for anything else.
const toLocalDate = (value) => {
  if (value instanceof Date) return isNaN(value.getTime()) ? null : new Date(value.getFullYear(), value.getMonth(), value.getDate());
  const s = String(value == null ? '' : value);
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(s);
  if (m) return new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]));
  const d = new Date(s);
  if (isNaN(d.getTime())) return null;
  return new Date(d.getFullYear(), d.getMonth(), d.getDate());
};

// Local-midnight ISO for a purchase day (what we store in `purchaseDate`).
export const localMidnightISO = (value) => {
  const d = toLocalDate(value);
  return d ? d.toISOString() : null;
};

export const splitInstallmentAmounts = (total, installments) => {
  const count = Math.max(1, Math.min(12, Number(installments) || 1));
  const totalCents = Math.round((Number(total) || 0) * 100);
  const baseCents = Math.floor(totalCents / count);
  const remainder = totalCents - (baseCents * count);
  return Array.from({ length: count }, (_, index) =>
    (baseCents + (index === count - 1 ? remainder : 0)) / 100);
};

export const monthlyPaymentISO = (purchaseDate, monthOffset = 0, dueDay = 10) => {
  const base = toLocalDate(purchaseDate);
  if (!base) return null;
  const day = Math.max(1, Math.min(28, Number(dueDay) || 10));
  return new Date(base.getFullYear(), base.getMonth() + 1 + monthOffset, day).toISOString();
};

/**
 * Payment due date (local-midnight ISO) for a card purchase.
 * Due = the card's due day in (purchaseMonth + 1 + monthOffset). `monthOffset`
 * lets installment i land on the (i+1)-th following month's bill.
 * Returns null when the method isn't a postponed card or the date is unusable.
 */
export const cardPaymentISO = (purchaseDate, method, monthOffset = 0) => {
  if (!isPostponedCard(method)) return null;
  return monthlyPaymentISO(purchaseDate, monthOffset, CARD_DUE_DAY[method]);
};

export default cardPaymentISO;
