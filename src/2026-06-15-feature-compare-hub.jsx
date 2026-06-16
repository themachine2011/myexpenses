// Nest (2026-06-15 review): "Compare" hub
//
// Month Compare (this month vs another) and Year in Review (a whole year) are
// both retrospective period comparisons, and they were two separate items in
// the already-crowded Insights nav group. This thin parent nests them under one
// "Compare" tab with a Months / Year sub-toggle, trimming the group by one
// without changing either page.
//
// Nothing is moved or rewritten: each child page is rendered exactly as-is and
// reads its own data from context. The standalone `compare` and `yearly` routes
// stay registered in App.jsx, so the Dashboard preview cards still deep-link
// straight to the focused view. This wrapper is purely additive chrome.

import React, { useState } from 'react';
import { useAppContext } from './context.jsx';
import { MonthComparePage } from './2026-06-11-feature-month-compare.jsx';
import { YearReviewPage } from './2026-06-11-feature-year-review.jsx';

const SUBS = [
  { id: 'months', label: 'Months' },
  { id: 'year', label: 'Year' },
];

export const ComparePage = ({ initial = 'months' }) => {
  const { themeTokens: tk } = useAppContext();
  const [sub, setSub] = useState(SUBS.some((s) => s.id === initial) ? initial : 'months');

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
      {sub === 'months' ? <MonthComparePage /> : <YearReviewPage />}
    </div>
  );
};

export default ComparePage;
