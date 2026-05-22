export const ACCENT_PRESETS = {
  rose:      { name: 'Rose Gold',  hex: '#E0A899', soft: '#F4D6CB', deep: '#9C6A5C', shimmer: '#F8DCC9' },
  champagne: { name: 'Champagne',  hex: '#D9C7A0', soft: '#EFE3C5', deep: '#8E7B57', shimmer: '#F2E5C2' },
  copper:    { name: 'Copper',     hex: '#C7846A', soft: '#E5BCA9', deep: '#7C4A36', shimmer: '#E5B49C' },
  platinum:  { name: 'Platinum',   hex: '#C9CDD2', soft: '#E4E7EA', deep: '#7B8086', shimmer: '#E8EBEE' },
};

export const THEMES = {
  onyx: {
    name: 'Onyx',
    canvas:    '#121212',
    canvas2:   '#1A1A1A',
    surface:   '#1E1E1E',
    surface2:  '#252525',
    bgSurface: '#FFFFFF',
    hairline:  '#333333',
    hairline2: '#3A3A3A',
    text:      '#F2EDE6',
    textDim:   '#999999',
    textFaint: '#666666',
    axisText:  '#666666',
    grid:      'rgba(255,255,255,0.04)',
    tooltipBg: '#1E1E1E',
    tooltipBorder: '#333333',
    tooltipText:   '#FFFFFF',
    positive:  '#7BC0A4',
    negative:  '#E07A6E',
    isDark:    true,
  },
  ivory: {
    name: 'Ivory',
    canvas:    '#F6F1EA',
    canvas2:   '#EFE9DF',
    surface:   'rgba(255, 252, 246, 0.78)',
    surface2:  'rgba(255, 252, 246, 0.94)',
    hairline:  'rgba(40,30,20,0.08)',
    hairline2: 'rgba(40,30,20,0.14)',
    text:      '#1A1612',
    textDim:   '#6B5E50',
    textFaint: '#A89A8A',
    grid:      'rgba(40,30,20,0.06)',
    tooltipBg: 'rgba(255,252,246,0.96)',
    positive:  '#3F8B6E',
    negative:  '#B85647',
    isDark:    false,
  },
  cream: {
    // Light mode — pure white canvas with soft "diamond" blue hairlines and
    // black text. The key is kept as `cream` so the existing toggle and tweaks
    // wiring stays intact; the user-facing label is "Light".
    name: 'Light',
    canvas:    '#FFFFFF',
    canvas2:   '#FBFCFE',                 // barely-blue snow
    surface:   'rgba(255,255,255,0.92)',
    surface2:  'rgba(248,251,255,0.98)',  // subtle blue cast
    bgSurface: '#FFFFFF',
    hairline:  'rgba(125,170,225,0.28)',  // soft diamond-blue border
    hairline2: 'rgba(125,170,225,0.45)',
    text:      '#000000',                 // black font
    textDim:   '#2E2E2E',
    textFaint: '#7A7A7A',
    axisText:  '#525252',
    grid:      'rgba(125,170,225,0.10)',
    tooltipBg: 'rgba(255,255,255,0.97)',
    tooltipBorder: 'rgba(125,170,225,0.45)',
    tooltipText:   '#000000',
    positive:  '#0E8F5E',
    negative:  '#C73E2E',
    isDark:    false,
  },
};

const SF_BODY  = '-apple-system, BlinkMacSystemFont, "SF Pro Text", "SF Pro Display", "Inter", system-ui, sans-serif';
const SF_DISPL = '"Lexend", -apple-system, BlinkMacSystemFont, "SF Pro Display", "Inter", system-ui, sans-serif';
const SF_MONO  = '"Roboto Mono", ui-monospace, "SF Mono", Menlo, monospace';

const SCHIBSTED = '"Schibsted Grotesk", ui-sans-serif, system-ui, sans-serif';

export const FONT_PAIRS = {
  schibsted: {
    name: 'Schibsted Grotesk',
    display: SCHIBSTED,
    body:    SCHIBSTED,
    mono:    '"Geist Mono", ui-monospace, "SF Mono", monospace',
    googleHref: 'https://fonts.googleapis.com/css2?family=Schibsted+Grotesk:wght@400;700&family=Geist+Mono:wght@400;700&display=swap',
  },
  sf: {
    name: 'SF Pro · Lexend · Roboto Mono',
    display: SF_DISPL,
    body:    SF_BODY,
    mono:    SF_MONO,
    googleHref: 'https://fonts.googleapis.com/css2?family=Lexend:wght@400;700&family=Roboto+Mono:wght@400;700&family=Inter:wght@400;700&display=swap',
  },
  editorial: {
    name: 'Editorial Luxury',
    display: '"Instrument Serif", "Cormorant Garamond", Georgia, serif',
    body:    '"Geist", ui-sans-serif, system-ui, sans-serif',
    mono:    '"Geist Mono", ui-monospace, "SF Mono", monospace',
    googleHref: 'https://fonts.googleapis.com/css2?family=Instrument+Serif&family=Geist:wght@400;700&family=Geist+Mono:wght@400;700&display=swap',
  },
  modern: {
    name: 'Modern Precise',
    display: '"Manrope", system-ui, sans-serif',
    body:    '"Manrope", system-ui, sans-serif',
    mono:    '"IBM Plex Mono", ui-monospace, monospace',
    googleHref: 'https://fonts.googleapis.com/css2?family=Manrope:wght@400;700&family=IBM+Plex+Mono:wght@400;700&display=swap',
  },
};

// Currency formatter.
//   v     - numeric value, ALWAYS stored in BRL (canonical storage)
//   mode  - 'BRL' | 'USD' | 'compact'
//   opts  - { rate } — USD-to-BRL exchange rate. When `mode === 'USD'` and a
//           finite positive rate is supplied, the BRL value is converted to
//           USD (usd = brl / rate) and formatted as $1,234.56. When mode is
//           'USD' without a rate, falls back to the en-US currency format of
//           the raw BRL number (back-compat — every call site is going via
//           context.fmt now, which always passes the rate, so this branch is
//           only reached if a caller forgets to use it).
export const fmtCurrency = (v, mode = 'BRL', opts = {}) => {
  if (v == null || isNaN(v)) v = 0;
  if (mode === 'compact') {
    const abs = Math.abs(v);
    const sign = v < 0 ? '-' : '';
    if (abs >= 1e6) return `${sign}R$ ${(abs/1e6).toFixed(2)}M`;
    if (abs >= 1e3) return `${sign}R$ ${(abs/1e3).toFixed(1)}k`;
    return `${sign}R$ ${Math.round(abs)}`;
  }
  if (mode === 'USD') {
    const rate = Number(opts?.rate);
    // FX rate unavailable — fall back to canonical BRL formatting so a R$
    // value is never mislabeled with $. Matches the Wallet UX which already
    // disables the USD toggle and shows "FX rate unavailable — BRL only".
    if (!Number.isFinite(rate) || rate <= 0) {
      return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v);
    }
    const usd = (Number(v) || 0) / rate;
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(usd);
  }
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v);
};

export const fmtNumber = (v, dec = 0) =>
  new Intl.NumberFormat('en-US', { minimumFractionDigits: dec, maximumFractionDigits: dec }).format(v || 0);

export const buildTokens = (themeKey, accentKey) => {
  const t = THEMES[themeKey] || THEMES.onyx;
  const a = ACCENT_PRESETS[accentKey] || ACCENT_PRESETS.rose;
  return {
    ...t,
    accent:        a.hex,
    accentSoft:    a.soft,
    accentDeep:    a.deep,
    accentShimmer: a.shimmer,
    accentName:    a.name,
  };
};
