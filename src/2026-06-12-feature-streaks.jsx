// Feature (2026-06-12 review): No-Spend Streaks
//
// What it does: counts the days you spent nothing flexible — current streak,
// best streak in the last 90 days, and a 30-day dot strip. Committed rows
// (financing instalments, fired recurring bills) and Savings transfers never
// break a streak: those aren't choices made that day. A small habit/motivation
// layer no other tab covers.
//
// Where it lives: its own "Streaks" tab + a small Dashboard preview.
// Read-only. Pure function of `transactions`; money shown via `fmt()`.

import React, { useMemo } from 'react';
import { useAppContext } from './context.jsx';
import { streaksReport } from './2026-06-12-utils-week-flex-streaks.js';

const card = (tk) => ({
  background: tk.surface, border: `1px solid ${tk.hairline}`, borderRadius: 18, padding: 24,
  backdropFilter: 'blur(24px)', WebkitBackdropFilter: 'blur(24px)',
  boxShadow: tk.isDark ? '0 30px 60px rgba(0,0,0,0.4)' : '0 20px 50px rgba(40,30,20,0.06)',
});
const eyebrow = (tk) => ({
  fontFamily: 'var(--font-mono)', fontSize: 10, letterSpacing: '0.32em',
  textTransform: 'uppercase', color: tk.textDim,
});

const fmtDate = (d) =>
  d ? new Date(d).toLocaleDateString('en-US', { day: 'numeric', month: 'short' }) : '';

const useStreaks = () => {
  const { transactions } = useAppContext();
  return useMemo(() => streaksReport(transactions, { days: 90 }), [transactions]);
};

// One dot per day: green = no flexible spending, dim = spent.
const DayDot = ({ d, tk, size = 14 }) => (
  <div
    title={`${fmtDate(d.date)} — ${d.spent ? 'spent' : 'no-spend day'}`}
    style={{
      width: size, height: size, borderRadius: '50%',
      background: d.spent ? (tk.hairline2 || tk.hairline) : tk.positive,
      opacity: d.spent ? 0.9 : 1,
    }} />
);

export const StreaksPage = () => {
  const { themeTokens: tk, fmt } = useAppContext();
  const r = useStreaks();
  const strip = r.daysList.slice(-30);

  return (
    <div style={{ display: 'grid', gap: 24 }}>
      {/* Summary */}
      <div style={{ ...card(tk), display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(170px, 1fr))', gap: 16 }}>
        <div>
          <div style={eyebrow(tk)}>Current streak</div>
          <div style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 34, color: r.current > 0 ? tk.positive : tk.text, marginTop: 8 }}>
            {r.current} {r.current === 1 ? 'day' : 'days'}
          </div>
          <div style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: tk.textDim, marginTop: 4 }}>
            {r.observed === 0 ? 'no history yet' : r.todaySpent ? 'spent something today' : 'today counts — keep going'}
          </div>
        </div>
        <div>
          <div style={eyebrow(tk)}>Best · last 90 days</div>
          <div style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 34, color: tk.text, marginTop: 8 }}>
            {r.best} {r.best === 1 ? 'day' : 'days'}
          </div>
          <div style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: tk.textDim, marginTop: 4 }}>
            {r.best > 0 ? `${fmtDate(r.bestStart)} – ${fmtDate(r.bestEnd)}` : '—'}
          </div>
        </div>
        <div>
          <div style={eyebrow(tk)}>No-spend days · 30d</div>
          <div style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 34, color: tk.text, marginTop: 8 }}>
            {r.noSpend30}<span style={{ fontSize: 18, color: tk.textDim }}> / {r.observed30}</span>
          </div>
        </div>
        <div>
          <div style={eyebrow(tk)}>Flexible spend · per day (30d)</div>
          <div style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 34, color: tk.text, marginTop: 8 }}>
            {fmt(r.dailyAvg30)}
          </div>
        </div>
      </div>

      {/* 30-day strip */}
      <div style={card(tk)}>
        <div style={{ ...eyebrow(tk), marginBottom: 14 }}>Last 30 days</div>
        {strip.length === 0 ? (
          <div style={{ color: tk.textDim, fontSize: 14 }}>
            Nothing recorded yet — streaks start counting from your first transaction.
          </div>
        ) : (
          <>
            <div style={{ display: 'flex', gap: 7, flexWrap: 'wrap' }}>
              {strip.map((d) => <DayDot key={d.key} d={d} tk={tk} />)}
            </div>
            <div style={{ display: 'flex', gap: 16, marginTop: 14, fontFamily: 'var(--font-mono)', fontSize: 11, color: tk.textDim }}>
              <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <span style={{ width: 9, height: 9, borderRadius: '50%', background: tk.positive }} /> no-spend day
              </span>
              <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <span style={{ width: 9, height: 9, borderRadius: '50%', background: tk.hairline2 || tk.hairline }} /> spent
              </span>
              <span style={{ marginLeft: 'auto' }}>oldest → today</span>
            </div>
          </>
        )}
      </div>

      <div style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: tk.textFaint || tk.textDim, lineHeight: 1.6 }}>
        How it works: a no-spend day has zero flexible spending. Committed
        payments (financing instalments, recurring bills that fired) and
        Savings transfers don't break a streak — they aren't day-to-day
        choices. Counting starts at your first recorded transaction, looking
        back at most 90 days, so an empty history can't fake a long streak.
        Everything is computed live; nothing is stored.
      </div>
    </div>
  );
};

export const StreaksPreview = () => {
  const { themeTokens: tk, setView } = useAppContext();
  const r = useStreaks();
  const strip = r.daysList.slice(-14);
  return (
    <div onClick={() => setView('streaks')} className="aurum-card-hover" style={{ ...card(tk), cursor: 'pointer' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
        <div style={eyebrow(tk)}>No-Spend Streaks</div>
        <span style={{ fontFamily: 'var(--font-mono)', fontSize: 10, letterSpacing: '0.16em', textTransform: 'uppercase', color: tk.textDim }}>Open →</span>
      </div>
      <div style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: tk.textDim }}>Current streak</div>
      <div style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 26, color: r.current > 0 ? tk.positive : tk.text, marginTop: 6 }}>
        {r.current} {r.current === 1 ? 'day' : 'days'}
      </div>
      <div style={{ display: 'flex', gap: 5, marginTop: 12, flexWrap: 'wrap' }}>
        {strip.map((d) => <DayDot key={d.key} d={d} tk={tk} size={11} />)}
      </div>
      <div style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: tk.textDim, marginTop: 10 }}>
        best 90d: {r.best} · no-spend 30d: {r.noSpend30}/{r.observed30}
      </div>
    </div>
  );
};

export default StreaksPage;
