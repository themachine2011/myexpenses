// Nest (2026-06-20 review): "Savings" hub
//
// Goals (track a savings target), Net-Worth Trajectory (project the wealth curve
// forward) and Emergency Fund / Safety Net (months of expenses the buffer covers)
// are all "grow and protect your savings" views, and they were three separate
// items in the already-crowded Plan nav group (14 items). This thin parent nests
// them under one "Savings" tab with a Goals / Trajectory / Safety Net sub-toggle,
// trimming the group from 14 to 12 without changing any of the three pages.
//
// Same approach as the 2026-06-15 Compare hub and the 2026-06-16 Behaviour hub:
// nothing is moved or rewritten, each child page renders exactly as-is and reads
// its own data from context. The standalone `goals`, `trajectory` and
// `emergencyFund` routes stay registered in App.jsx, so the Dashboard preview
// cards still deep-link straight to the focused view. This wrapper is purely
// additive chrome.

import React, { useState } from 'react';
import { useAppContext } from './context.jsx';
import { SavingsGoalsPage } from './2026-06-10-feature-savings-goals.jsx';
import { NetWorthTrajectoryPage } from './2026-06-17-feature-networth-trajectory.jsx';
import { EmergencyFundPage } from './2026-06-18-feature-emergency-fund.jsx';

const SUBS = [
  { id: 'goals', label: 'Goals' },
  { id: 'trajectory', label: 'Trajectory' },
  { id: 'safety', label: 'Safety Net' },
];

export const SavingsHubPage = ({ initial = 'goals' }) => {
  const { themeTokens: tk } = useAppContext();
  const [sub, setSub] = useState(SUBS.some((s) => s.id === initial) ? initial : 'goals');

  return (
    <div style={{ display: 'grid', gap: 20 }}>
      <div style={{ display: 'inline-flex', justifySelf: 'start', borderRadius: 999, overflow: 'hidden', border: `1px solid ${tk.hairline2 || tk.hairline}` }}>
        {SUBS.map((s) => {
          const active = sub === s.id;
          return (
            <button key={s.id} onClick={() => setSub(s.id)}
              style={{
                padding: '8px 18px', border: 'none', cursor: 'pointer',
                background: active ? tk.accent : 'transparent',
                color: active ? (tk.isDark ? '#0B0B0D' : '#fff') : tk.textDim,
                fontFamily: 'var(--font-mono)', fontSize: 10, letterSpacing: '0.18em',
                textTransform: 'uppercase', transition: 'background 180ms, color 180ms',
              }}>{s.label}</button>
          );
        })}
      </div>
      {sub === 'goals' ? <SavingsGoalsPage />
        : sub === 'trajectory' ? <NetWorthTrajectoryPage />
        : <EmergencyFundPage />}
    </div>
  );
};

export default SavingsHubPage;
