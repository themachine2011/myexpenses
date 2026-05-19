import { normalizeCategoryName, getCategoryDisplayName } from './2026-05-19-utils-category-colors.js';

export const FINANCING_CATEGORY = 'Financing';

const pad2 = (n) => String(n).padStart(2, '0');
const monthKey = (year, month) => `${year}-${pad2(month + 1)}`;

const startOfMonth = (year, month) => new Date(year, month, 1, 0, 0, 0, 0);
const endOfMonth = (year, month) => new Date(year, month + 1, 0, 23, 59, 59, 999);

const isSameMonth = (a, b) =>
  a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth();

const monthDistanceInclusive = (from, to) =>
  Math.max(1, (to.getFullYear() - from.getFullYear()) * 12 + (to.getMonth() - from.getMonth()) + 1);

const dayDistanceInclusive = (from, to) => {
  const start = new Date(from.getFullYear(), from.getMonth(), from.getDate());
  const end = new Date(to.getFullYear(), to.getMonth(), to.getDate());
  return Math.max(1, Math.floor((end - start) / 86400000) + 1);
};

const dateInRange = (date, from, to) => date >= from && date <= to;

export const buildYearToMonthPeriod = ({ year, month }, now = new Date()) => {
  const from = new Date(year, 0, 1, 0, 0, 0, 0);
  const selectedEnd = endOfMonth(year, month);
  const to = isSameMonth(selectedEnd, now) && year === now.getFullYear()
    ? new Date(now)
    : selectedEnd;
  return {
    kind: 'ytd',
    from,
    to,
    monthsIncluded: monthDistanceInclusive(from, selectedEnd),
    label: `${from.toLocaleString('en-US', { month: 'short' })} - ${selectedEnd.toLocaleString('en-US', { month: 'short', year: 'numeric' })}`,
  };
};

export const buildComparisonPeriod = (mode, period, now = new Date()) => {
  const year = Number(period?.year) || now.getFullYear();

  if (mode === 'trimester') {
    const quarter = Math.max(1, Math.min(4, Number(period?.quarter) || 1));
    const startMonth = (quarter - 1) * 3;
    const from = startOfMonth(year, startMonth);
    const to = endOfMonth(year, startMonth + 2);
    return { mode, from, to, monthsIncluded: 3, label: `Q${quarter} ${year}` };
  }

  if (mode === 'semester') {
    const semester = Math.max(1, Math.min(2, Number(period?.semester) || 1));
    const startMonth = semester === 1 ? 0 : 6;
    const from = startOfMonth(year, startMonth);
    const to = endOfMonth(year, startMonth + 5);
    return { mode, from, to, monthsIncluded: 6, label: `${semester === 1 ? 'H1' : 'H2'} ${year}` };
  }

  if (mode === 'year') {
    return {
      mode,
      from: startOfMonth(year, 0),
      to: endOfMonth(year, 11),
      monthsIncluded: 12,
      label: String(year),
    };
  }

  const month = Math.max(0, Math.min(11, Number(period?.month) || 0));
  return {
    mode: 'month',
    from: startOfMonth(year, month),
    to: endOfMonth(year, month),
    monthsIncluded: 1,
    label: startOfMonth(year, month).toLocaleString('en-US', { month: 'short', year: 'numeric' }),
  };
};

const isSpendingCategory = (category) => {
  const name = normalizeCategoryName(category);
  return name !== 'Income' && name !== 'Savings' && name !== 'Salary' && name !== 'Rental';
};

const isTriumphFinancingTx = (tx) => {
  const id = String(tx?.id || '');
  const description = String(tx?.description || '').toLowerCase();
  return id.startsWith('moto-') || (normalizeCategoryName(tx?.category) === FINANCING_CATEGORY && description.includes('triumph'));
};

const expenseAmount = (tx, motoAmount) =>
  isTriumphFinancingTx(tx) ? Number(motoAmount) || 2191 : Number(tx?.amount) || 0;

const recurringMonthSet = (transactions) => {
  const fired = new Set();
  for (const tx of transactions || []) {
    const id = String(tx?.id || '');
    const match = /^rec-(.+)-(\d{4}-\d{2})$/.exec(id);
    if (match) fired.add(`${match[1]}|${match[2]}`);
  }
  return fired;
};

const monthsInRange = (from, to) => {
  const out = [];
  const cursor = new Date(from.getFullYear(), from.getMonth(), 1);
  const last = new Date(to.getFullYear(), to.getMonth(), 1);
  while (cursor <= last) {
    out.push({ year: cursor.getFullYear(), month: cursor.getMonth(), key: monthKey(cursor.getFullYear(), cursor.getMonth()) });
    cursor.setMonth(cursor.getMonth() + 1);
  }
  return out;
};

export const collectSpendingCategories = (baseCategories = [], transactions = [], recurring = []) => {
  const ordered = [];
  const seen = new Set();
  const add = (category) => {
    const name = normalizeCategoryName(category);
    if (!isSpendingCategory(name) || seen.has(name)) return;
    seen.add(name);
    ordered.push(name);
  };

  for (const category of baseCategories) add(category);
  for (const tx of transactions || []) {
    if (tx?.type !== 'expense') continue;
    add(tx.category);
  }
  for (const template of recurring || []) {
    if (template?.type === 'income') continue;
    add(template.category);
  }
  add(FINANCING_CATEGORY);

  return ordered;
};

export const buildCategoryAverageRows = ({
  transactions = [],
  recurring = [],
  categories = [],
  period,
  motoAmount = 2191,
}) => {
  const from = period?.from || new Date(new Date().getFullYear(), 0, 1);
  const to = period?.to || new Date();
  const monthsIncluded = Math.max(1, Number(period?.monthsIncluded) || monthDistanceInclusive(from, to));
  const daysIncluded = Math.max(1, Number(period?.daysIncluded) || dayDistanceInclusive(from, to));
  const allCategories = collectSpendingCategories(categories, transactions, recurring);
  const totals = Object.fromEntries(allCategories.map((category) => [category, 0]));

  for (const tx of transactions || []) {
    if (tx?.type !== 'expense') continue;
    const date = new Date(tx.date);
    if (!dateInRange(date, from, to)) continue;
    const category = normalizeCategoryName(tx.category);
    if (!isSpendingCategory(category)) continue;
    totals[category] = (totals[category] || 0) + expenseAmount(tx, motoAmount);
  }

  const firedRecurring = recurringMonthSet(transactions);
  for (const template of recurring || []) {
    if (template?.type === 'income') continue;
    const amount = Number(template?.amount) || 0;
    if (amount <= 0) continue;
    const category = normalizeCategoryName(template.category);
    if (!isSpendingCategory(category)) continue;
    const day = Math.max(1, Math.min(28, Number(template.dayOfMonth) || 1));
    for (const item of monthsInRange(from, to)) {
      const key = `${template.id}|${item.key}`;
      if (firedRecurring.has(key)) continue;
      const occurrenceDate = new Date(item.year, item.month, day, 12, 0, 0, 0);
      if (!dateInRange(occurrenceDate, from, to)) continue;
      totals[category] = (totals[category] || 0) + amount;
    }
  }

  return allCategories.map((category) => {
    const total = totals[category] || 0;
    const averagePerMonth = total / monthsIncluded;
    const averagePerDay = total / daysIncluded;
    return {
      category,
      label: getCategoryDisplayName(category),
      total,
      average: averagePerMonth,
      averagePerMonth,
      averagePerDay,
      monthsIncluded,
      daysIncluded,
      periodLabel: period?.label,
      isTriumphFinancing: category === FINANCING_CATEGORY,
    };
  });
};

const earliestTransactionDate = (transactions = [], fallback = new Date()) => {
  let earliest = null;
  for (const tx of transactions || []) {
    const date = new Date(tx?.date);
    if (Number.isNaN(date.getTime())) continue;
    if (!earliest || date < earliest) earliest = date;
  }
  return earliest || fallback;
};

export const buildFullHistoryCategoryAverageRows = ({
  transactions = [],
  recurring = [],
  categories = [],
  to = new Date(),
  motoAmount = 2191,
}) => {
  const end = new Date(to);
  const first = earliestTransactionDate(transactions, end);
  const from = first <= end
    ? new Date(first.getFullYear(), first.getMonth(), first.getDate(), 0, 0, 0, 0)
    : new Date(end.getFullYear(), end.getMonth(), end.getDate(), 0, 0, 0, 0);
  return buildCategoryAverageRows({
    transactions,
    recurring,
    categories,
    period: {
      kind: 'locked-history',
      from,
      to: end,
      monthsIncluded: monthDistanceInclusive(from, end),
      daysIncluded: dayDistanceInclusive(from, end),
      label: `${from.toLocaleString('en-US', { month: 'short', year: 'numeric' })} - ${end.toLocaleString('en-US', { month: 'short', year: 'numeric' })}`,
    },
    motoAmount,
  });
};

export const buildFutureCategorySpendRows = ({
  transactions = [],
  recurring = [],
  reminders = [],
  categories = [],
  from = new Date(),
  months = 12,
  to,
  motoAmount = 2191,
}) => {
  const start = new Date(from);
  const monthCount = Math.max(1, Number(months) || 1);
  const end = to ? new Date(to) : new Date(start);
  if (!to) end.setMonth(end.getMonth() + monthCount);
  if (!to) end.setMilliseconds(end.getMilliseconds() - 1);
  const daysIncluded = dayDistanceInclusive(start, end);
  const allCategories = collectSpendingCategories(categories, transactions, recurring);
  const totals = Object.fromEntries(allCategories.map((category) => [category, 0]));

  for (const tx of transactions || []) {
    if (tx?.type !== 'expense') continue;
    const date = new Date(tx.date);
    if (!(date > start && date <= end)) continue;
    const category = normalizeCategoryName(tx.category);
    if (!isSpendingCategory(category)) continue;
    totals[category] = (totals[category] || 0) + expenseAmount(tx, motoAmount);
  }

  const firedRecurring = recurringMonthSet(transactions);
  for (const template of recurring || []) {
    if (template?.type === 'income') continue;
    const amount = Number(template?.amount) || 0;
    if (amount <= 0) continue;
    const category = normalizeCategoryName(template.category);
    if (!isSpendingCategory(category)) continue;
    const day = Math.max(1, Math.min(28, Number(template.dayOfMonth) || 1));
    for (const item of monthsInRange(start, end)) {
      const key = `${template.id}|${item.key}`;
      if (firedRecurring.has(key)) continue;
      const occurrenceDate = new Date(item.year, item.month, day, 12, 0, 0, 0);
      if (!(occurrenceDate > start && occurrenceDate <= end)) continue;
      totals[category] = (totals[category] || 0) + amount;
    }
  }

  for (const reminder of reminders || []) {
    if (reminder?.paid) continue;
    const amount = Number(reminder?.amount) || 0;
    if (amount <= 0) continue;
    const date = new Date(reminder.date);
    if (!(date > start && date <= end)) continue;
    if (!reminder.category) continue;
    const category = normalizeCategoryName(reminder.category);
    if (!isSpendingCategory(category)) continue;
    totals[category] = (totals[category] || 0) + amount;
  }

  return allCategories.map((category) => {
    const total = totals[category] || 0;
    const averagePerMonth = total / monthCount;
    return {
      category,
      label: getCategoryDisplayName(category),
      total,
      average: averagePerMonth,
      averagePerMonth,
      averagePerDay: total / daysIncluded,
      monthsIncluded: monthCount,
      daysIncluded,
      periodLabel: `${start.toLocaleString('en-US', { month: 'short', year: 'numeric' })} - ${end.toLocaleString('en-US', { month: 'short', year: 'numeric' })}`,
      isTriumphFinancing: category === FINANCING_CATEGORY,
    };
  });
};

