import React from 'react';
import { motion } from 'framer-motion';
import { useAppContext } from './context.jsx';
import { getInvertedCardTokens } from './2026-05-20-utils-inverted-card.js';

const MODES = [
  { id: 'normal',     label: 'Normal' },
  { id: 'scientific', label: 'Scientific' },
  { id: 'projection', label: 'Projection' },
];

export const CalculatorModeSwitcher = ({ value, onChange, layoutGroupId = 'calc-mode' }) => {
  const { themeTokens } = useAppContext();
  const inv = getInvertedCardTokens(themeTokens);
  return (
    <div style={{
      display: 'grid',
      gridTemplateColumns: 'repeat(3, minmax(0, 1fr))',
      gap: 4,
      padding: 4,
      borderRadius: 999,
      background: themeTokens.isDark ? 'rgba(11,11,13,0.06)' : 'rgba(255,255,255,0.08)',
      border: `1px solid ${inv.border}`,
      width: '100%',
      minWidth: 0,
      boxSizing: 'border-box',
    }}>
      {MODES.map((mode) => {
        const active = value === mode.id;
        return (
          <button
            key={mode.id}
            type="button"
            onClick={() => onChange?.(mode.id)}
            style={{
              position: 'relative',
              padding: '7px 4px',
              border: 'none',
              background: 'transparent',
              color: active ? (themeTokens.isDark ? '#0B0B0D' : '#FFFFFF') : inv.muted,
              fontFamily: 'var(--font-mono)', fontSize: 10,
              letterSpacing: '0.16em', textTransform: 'uppercase',
              cursor: 'pointer',
              borderRadius: 999,
              transition: 'color 220ms',
              minWidth: 0,
              overflow: 'hidden',
              whiteSpace: 'nowrap',
              textOverflow: 'ellipsis',
              zIndex: 1,
              fontWeight: active ? 700 : 400,
            }}>
            {active && (
              <motion.span
                layoutId={layoutGroupId}
                style={{
                  position: 'absolute', inset: 0,
                  background: themeTokens.accent,
                  borderRadius: 999,
                  zIndex: -1,
                }}
                transition={{ type: 'spring', stiffness: 380, damping: 32 }}
              />
            )}
            {mode.label}
          </button>
        );
      })}
    </div>
  );
};
