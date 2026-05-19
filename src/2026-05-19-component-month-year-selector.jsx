import React from 'react';
import { useAppContext } from './context.jsx';
import { WheelPeriodSelector } from './2026-05-19-component-wheel-period-selector.jsx';

const MONTHS = Array.from({ length: 12 }, (_, month) => ({
  value: month,
  label: new Date(2026, month, 1).toLocaleString('en-US', { month: 'short' }),
  full: new Date(2026, month, 1).toLocaleString('en-US', { month: 'long' }),
}));

export const buildYearOptions = (centerYear = new Date().getFullYear()) =>
  Array.from({ length: 10 }, (_, index) => {
    const year = centerYear - 5 + index;
    return { value: year, label: String(year) };
  });

export const DashboardMonthYearSelector = ({ value, onChange }) => {
  const { themeTokens } = useAppContext();
  const yearOptions = buildYearOptions(new Date().getFullYear());

  const setMonth = (month) => onChange?.({ ...value, month });
  const setYear = (year) => onChange?.({ ...value, year });

  return (
    <div style={{
      background: themeTokens.surface,
      border: `1px solid ${themeTokens.hairline}`,
      borderRadius: 16,
      padding: 16,
      display: 'grid',
      gap: 14,
      width: '100%',
      minWidth: 0,
      boxSizing: 'border-box',
    }}>
      <div style={{
        fontFamily: 'var(--font-mono)',
        fontSize: 10,
        letterSpacing: '0.28em',
        textTransform: 'uppercase',
        color: themeTokens.textDim,
      }}>Month Selector</div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
        <WheelPeriodSelector
          label="Month"
          compact
          options={MONTHS.map(({ value: itemValue, label }) => ({ value: itemValue, label }))}
          value={value.month}
          onChange={setMonth}
        />
        <WheelPeriodSelector
          label="Year"
          compact
          options={yearOptions}
          value={value.year}
          onChange={setYear}
        />
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 6 }}>
        {MONTHS.map((month) => {
          const active = month.value === value.month;
          return (
            <button
              key={month.value}
              type="button"
              onClick={() => setMonth(month.value)}
              title={month.full}
              style={{
                border: `1px solid ${active ? themeTokens.accent : themeTokens.hairline2}`,
                background: active ? themeTokens.accent : 'transparent',
                color: active ? '#0B0B0D' : themeTokens.textDim,
                borderRadius: 8,
                padding: '8px 0',
                fontFamily: 'var(--font-mono)',
                fontSize: 10,
                letterSpacing: '0.12em',
                textTransform: 'uppercase',
                cursor: 'pointer',
                transition: 'all 180ms',
              }}
            >
              {month.label}
            </button>
          );
        })}
      </div>
    </div>
  );
};
