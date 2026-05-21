import React from 'react';
import { useAppContext } from './context.jsx';
import { WheelPeriodSelector } from './2026-05-19-component-wheel-period-selector.jsx';
import { InlineCardTitle } from './card-explanations.jsx';

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
  const diamondBlue = '#7DAAE1';
  const graphite = '#101114';
  const graphiteHover = '#171A1F';

  return (
    <div
      className="aurum-card-hover"
      style={{
        background: themeTokens.surface,
        border: `1px solid ${themeTokens.hairline}`,
        borderRadius: 16,
        padding: 16,
        display: 'grid',
        gap: 14,
        width: '100%',
        minWidth: 0,
        boxSizing: 'border-box',
        transition: 'background 180ms ease, border-color 180ms ease, box-shadow 180ms ease',
      }}
    >
      <InlineCardTitle style={{
        fontFamily: 'var(--font-mono)',
        fontSize: 10,
        letterSpacing: '0.28em',
        textTransform: 'uppercase',
        color: themeTokens.textDim,
      }}>Month Selector</InlineCardTitle>

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
              className="aurum-card-flash-hover"
              onClick={() => setMonth(month.value)}
              title={month.full}
              style={{
                border: `1px solid ${active ? diamondBlue : '#2D3138'}`,
                background: active ? graphiteHover : graphite,
                color: active ? '#FFFFFF' : '#D5DAE1',
                borderRadius: 8,
                padding: '8px 0',
                fontFamily: 'var(--font-mono)',
                fontSize: 10,
                letterSpacing: '0.12em',
                textTransform: 'uppercase',
                cursor: 'pointer',
                boxShadow: active ? `0 0 0 2px ${diamondBlue}33` : 'none',
                transition: 'background 160ms ease, border-color 160ms ease, box-shadow 160ms ease, color 160ms ease',
                '--black-card-base-bg': active ? graphiteHover : graphite,
                '--black-card-rest-border': active ? diamondBlue : '#2D3138',
                '--black-card-rest-shadow': active ? `0 0 0 2px ${diamondBlue}33` : 'none',
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
