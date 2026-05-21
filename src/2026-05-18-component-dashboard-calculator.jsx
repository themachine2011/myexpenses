import React, { useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { useAppContext } from './context.jsx';
import { CalculatorModeSwitcher } from './2026-05-18-component-calculator-mode-switcher.jsx';
import { NormalCalculator } from './2026-05-18-component-normal-calculator.jsx';
import { ScientificCalculator } from './2026-05-18-component-scientific-calculator.jsx';
import { CategoryProjectionCalculator } from './2026-05-18-component-category-projection-calculator.jsx';
import { InlineCardTitle } from './card-explanations.jsx';
import { getInvertedCardTokens } from './2026-05-20-utils-inverted-card.js';

const SUBTITLE = {
  normal:     'Quick arithmetic',
  scientific: 'Advanced functions + memory',
  projection: 'Simulate category savings',
};

// Dashboard-sidebar calculator. Lives directly below the existing
// Average-by-Category card. Three modes with a segmented switcher. State is
// fully local — no localStorage keys, no context plumbing.
export const DashboardCalculatorPanel = () => {
  const { themeTokens } = useAppContext();
  const inv = getInvertedCardTokens(themeTokens);
  const [mode, setMode] = useState('normal');

  return (
    <div className="aurum-card-flash-hover" style={{
      background: inv.bg,
      color: inv.fg,
      border: `1px solid ${inv.border}`,
      borderRadius: 16,
      padding: 16,
      display: 'grid',
      gap: 14,
      width: '100%',
      minWidth: 0,
      boxSizing: 'border-box',
      overflow: 'hidden',
      '--black-card-base-bg': inv.bg,
      '--black-card-rest-border': inv.border,
      '--black-card-rest-shadow': 'none',
    }}>
      <div>
        <InlineCardTitle style={{
          fontFamily: 'var(--font-mono)',
          fontSize: 10,
          letterSpacing: '0.28em',
          textTransform: 'uppercase',
          color: inv.muted,
        }}>Calculator</InlineCardTitle>
        <div style={{
          marginTop: 2,
          color: inv.faint,
          fontFamily: 'var(--font-mono)',
          fontSize: 9,
          letterSpacing: '0.12em',
          textTransform: 'uppercase',
        }}>{SUBTITLE[mode]}</div>
      </div>

      <CalculatorModeSwitcher value={mode} onChange={setMode} />

      <AnimatePresence mode="wait">
        <motion.div
          key={mode}
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -6 }}
          transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
          style={{ minWidth: 0 }}>
          {mode === 'normal'     && <NormalCalculator />}
          {mode === 'scientific' && <ScientificCalculator />}
          {mode === 'projection' && <CategoryProjectionCalculator />}
        </motion.div>
      </AnimatePresence>
    </div>
  );
};
