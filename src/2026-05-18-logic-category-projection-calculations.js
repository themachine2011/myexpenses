// Pure projection logic for the Dashboard Calculator's Projection mode.
// No React, no DOM, no localStorage — just numbers in, numbers out, so
// it can be unit-tested in isolation later.

// Convert a time spec to a month count.
//   { kind: 'months', count }
//   { kind: 'years',  count }
//   { kind: 'untilYear', year }  → months from now (inclusive) to Dec of that year
export const periodToMonths = (period, now = new Date()) => {
  if (!period) return 12;
  if (period.kind === 'months') return Math.max(1, Number(period.count) || 0);
  if (period.kind === 'years')  return Math.max(1, Math.round((Number(period.count) || 0) * 12));
  if (period.kind === 'untilYear') {
    const targetYear = Number(period.year) || now.getFullYear();
    const months = (targetYear - now.getFullYear()) * 12 + (11 - now.getMonth());
    return Math.max(1, months + 1);
  }
  return 12;
};

// Single-category projection.
// Inputs:
//   avg              - monthly average for the category, in currency units
//   months           - how many months ahead
//   reductionPct     - reduction as percentage (0-100), optional
//   reductionFixed   - reduction in absolute currency per month, optional
//                      If both provided, `reductionFixed` wins.
//   monthlyCap       - optional cap: new monthly = min(avg, cap). Wins over
//                      reductionPct / reductionFixed when set.
// Returns: { baseline, reduced, savings, monthly, yearly, newMonthlyAvg, pct }
export const projectCategorySpend = ({
  avg = 0,
  months = 12,
  reductionPct,
  reductionFixed,
  monthlyCap,
} = {}) => {
  const a = Math.max(0, Number(avg) || 0);
  const m = Math.max(1, Number(months) || 1);

  let newMonthlyAvg = a;
  if (Number.isFinite(monthlyCap) && monthlyCap !== null && monthlyCap !== undefined && monthlyCap !== '') {
    newMonthlyAvg = Math.min(a, Math.max(0, Number(monthlyCap) || 0));
  } else if (Number.isFinite(reductionFixed) && reductionFixed !== null && reductionFixed !== undefined && reductionFixed !== '') {
    newMonthlyAvg = Math.max(0, a - (Number(reductionFixed) || 0));
  } else if (Number.isFinite(reductionPct) && reductionPct !== null && reductionPct !== undefined && reductionPct !== '') {
    const pct = Math.max(0, Math.min(100, Number(reductionPct) || 0));
    newMonthlyAvg = Math.max(0, a * (1 - pct / 100));
  }

  const baseline = a * m;
  const reduced = newMonthlyAvg * m;
  const savings = baseline - reduced;
  const monthlySavings = savings / m;
  const yearlySavings = monthlySavings * 12;
  const pct = a > 0 ? (savings / baseline) * 100 : 0;

  return {
    baseline,
    reduced,
    savings,
    monthly: monthlySavings,
    yearly: yearlySavings,
    newMonthlyAvg,
    pct,
    months: m,
  };
};

// Aggregate projection across multiple categories at once. Each row should be
// { category, average }. Reduction inputs apply to all.
export const projectAcrossCategories = ({
  rows = [],
  months = 12,
  reductionPct,
  reductionFixed,
} = {}) => {
  let baseline = 0, reduced = 0;
  const perCategory = [];
  for (const row of rows) {
    const r = projectCategorySpend({
      avg: row.average,
      months,
      reductionPct,
      reductionFixed,
    });
    baseline += r.baseline;
    reduced += r.reduced;
    perCategory.push({ category: row.category, label: row.label, ...r });
  }
  const savings = baseline - reduced;
  return {
    baseline,
    reduced,
    savings,
    monthly: savings / Math.max(1, months),
    yearly: (savings / Math.max(1, months)) * 12,
    perCategory,
    months,
  };
};

// Preset registry. Each preset returns { id, label, build(ctx) } where ctx
// holds { row, allRows, now } and `build` produces a projection result object.
//
// `row` is the currently-selected single category.
// `allRows` is every visible non-Income/Savings/Financing row (used for #13).
// "Non-essential" (#14) is defined as everything except Financing, Insurance,
// Health, Gas — explicit list since no category-type metadata exists yet.
export const NON_ESSENTIAL_EXCLUDE = new Set(['Financing', 'Insurance', 'Health', 'Gas']);

export const buildPresets = () => ([
  {
    id: 'cat-10-6m',
    label: 'Reduce by 10% for 6 months',
    scope: 'single',
    build: ({ row }) => projectCategorySpend({ avg: row.average, months: 6, reductionPct: 10 }),
  },
  {
    id: 'cat-10-1y',
    label: 'Reduce by 10% for 1 year',
    scope: 'single',
    build: ({ row }) => projectCategorySpend({ avg: row.average, months: 12, reductionPct: 10 }),
  },
  {
    id: 'cat-20-1y',
    label: 'Reduce by 20% for 1 year',
    scope: 'single',
    build: ({ row }) => projectCategorySpend({ avg: row.average, months: 12, reductionPct: 20 }),
  },
  {
    id: 'cat-30-1y',
    label: 'Reduce by 30% for 1 year',
    scope: 'single',
    build: ({ row }) => projectCategorySpend({ avg: row.average, months: 12, reductionPct: 30 }),
  },
  {
    id: 'cat-div-2',
    label: 'Divide average by 2',
    scope: 'single',
    build: ({ row }) => projectCategorySpend({ avg: row.average, months: 12, reductionPct: 50 }),
  },
  {
    id: 'cat-div-3',
    label: 'Divide average by 3',
    scope: 'single',
    build: ({ row }) => {
      const r = projectCategorySpend({ avg: row.average, months: 12, reductionFixed: row.average * (2 / 3) });
      return r;
    },
  },
  {
    id: 'cat-compare',
    label: 'Compare current vs reduced (−10%)',
    scope: 'single',
    build: ({ row }) => projectCategorySpend({ avg: row.average, months: 1, reductionPct: 10 }),
  },
  {
    id: 'cat-12m-as-is',
    label: 'Project 12 months as-is',
    scope: 'single',
    build: ({ row }) => projectCategorySpend({ avg: row.average, months: 12, reductionPct: 0 }),
  },
  {
    id: 'cat-24m-as-is',
    label: 'Project 24 months as-is',
    scope: 'single',
    build: ({ row }) => projectCategorySpend({ avg: row.average, months: 24, reductionPct: 0 }),
  },
  {
    id: 'cat-until-next-year',
    label: 'Savings until end of next year',
    scope: 'single',
    build: ({ row, now = new Date() }) => projectCategorySpend({
      avg: row.average,
      months: periodToMonths({ kind: 'untilYear', year: now.getFullYear() + 1 }, now),
      reductionPct: 10,
    }),
  },
  {
    id: 'cat-5y',
    label: 'Savings over 5 years (−10%)',
    scope: 'single',
    build: ({ row }) => projectCategorySpend({ avg: row.average, months: 60, reductionPct: 10 }),
  },
  {
    id: 'cat-cap',
    label: 'Apply a monthly cap',
    scope: 'single',
    needsCap: true,
    build: ({ row, monthlyCap }) => projectCategorySpend({ avg: row.average, months: 12, monthlyCap }),
  },
  {
    id: 'all-10-1y',
    label: 'All visible categories −10% / 1 year',
    scope: 'all',
    build: ({ allRows }) => projectAcrossCategories({ rows: allRows, months: 12, reductionPct: 10 }),
  },
  {
    id: 'non-essential-10-1y',
    label: 'Non-essential −10% / 1 year',
    scope: 'all',
    build: ({ allRows }) => projectAcrossCategories({
      rows: allRows.filter((r) => !NON_ESSENTIAL_EXCLUDE.has(r.category)),
      months: 12,
      reductionPct: 10,
    }),
  },
]);
