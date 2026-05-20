export const SAVED_GREEN = '#22C55E';

export const getInvertedCardTokens = (themeTokens) => ({
  bg:     themeTokens.isDark ? '#FFFFFF' : '#0B0B0D',
  fg:     themeTokens.isDark ? '#0B0B0D' : '#FFFFFF',
  muted:  themeTokens.isDark ? 'rgba(11,11,13,0.62)' : 'rgba(255,255,255,0.72)',
  faint:  themeTokens.isDark ? 'rgba(11,11,13,0.42)' : 'rgba(255,255,255,0.52)',
  border: themeTokens.isDark ? 'rgba(11,11,13,0.12)' : 'rgba(255,255,255,0.18)',
  hairline: themeTokens.isDark ? 'rgba(11,11,13,0.08)' : 'rgba(255,255,255,0.10)',
});
