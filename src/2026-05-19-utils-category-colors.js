export const HIGH_SPENDING_THRESHOLD = 750;
export const HIGH_SPENDING_RED = '#EF4444';
export const TRIUMPH_FINANCING_RED = '#B91C1C';
export const USELESS_CATEGORY = 'Useless';
export const USELESS_CATEGORY_LABEL = 'Useless 🗑️';

const CATEGORY_COLOR_MAP = {
  Clothing: '#C084FC',
  'Convenience Store': '#F59E0B',
  Debts: '#B084F5',
  Debt: '#B084F5',
  Financing: TRIUMPH_FINANCING_RED,
  Fuel: '#38BDF8',
  Gas: '#38BDF8',
  Health: '#F97316',
  Insurance: '#2DD4BF',
  'Online Subscriptions': '#818CF8',
  Restaurants: '#EC4899',
  Shopping: '#C084FC',
  Trips: '#22C55E',
  Uber: '#030303',
  Useless: '#94A3B8',
  Zaffari: '#FACC15',
  Entertainment: '#A3E635',
  Purchase: '#14B8A6',
};

const FALLBACK_PALETTE = [
  '#06B6D4',
  '#A78BFA',
  '#FBBF24',
  '#34D399',
  '#FB7185',
  '#F472B6',
  '#4ADE80',
  '#93C5FD',
  '#F97316',
  '#64748B',
];

export const normalizeCategoryName = (category) => {
  const name = String(category || '').trim();
  if (!name) return USELESS_CATEGORY;
  if (name === 'Debt') return 'Debts';
  if (name === 'Others' || name === USELESS_CATEGORY_LABEL) return USELESS_CATEGORY;
  if (name === 'Triumph Financing') return 'Financing';
  return name;
};

export const getCategoryDisplayName = (category) => {
  const name = normalizeCategoryName(category);
  if (name === 'Financing') return 'Triumph Financing';
  if (name === USELESS_CATEGORY) return USELESS_CATEGORY_LABEL;
  return name;
};

const hashCategory = (category) => {
  const value = normalizeCategoryName(category);
  let hash = 0;
  for (let i = 0; i < value.length; i += 1) {
    hash = ((hash << 5) - hash) + value.charCodeAt(i);
    hash |= 0;
  }
  return Math.abs(hash);
};

export const categoryColor = (category) => {
  const name = normalizeCategoryName(category);
  if (CATEGORY_COLOR_MAP[name]) return CATEGORY_COLOR_MAP[name];
  return FALLBACK_PALETTE[hashCategory(name) % FALLBACK_PALETTE.length];
};

export const valueColor = (value, category, fallback) => {
  if (normalizeCategoryName(category) === 'Financing') return TRIUMPH_FINANCING_RED;
  return Number(value) > HIGH_SPENDING_THRESHOLD ? HIGH_SPENDING_RED : fallback;
};
