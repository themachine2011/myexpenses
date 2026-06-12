// Feature (2026-06-10 review): Spending Patterns (calendar rhythm)
//
// What it does: shows WHEN you spend — which weekdays cost the most, your
// weekday-vs-weekend split, and how spending clusters across the days of the
// month. Period toggle: this month / 3M / 6M / all.
//
// Where it lives: its own "Patterns" tab + a small Dashboard preview showing
// your busiest weekday and links into the tab.
//
// Read-only. Pure function of `transactions`; money shown via `fmt()`.

import React, { useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import { useAppContext } from './context.jsx';
import { periodRangeFor } from './2026-06-09-utils-analytics.js';
import { spendingPatterns } from './2026-06-10-utils-forecast.js';

const card = (tk) => ({
  background: tk.surface, border: `1px solid ${tk.hairline}`, borderRadius: 18, padding: 24,
  backdropFilter: 'blur(24px)', WebkitBackdropFilter: 'blur(24px)',
  boxShadow: tk.isDark ? '0 30px 60px rgba(0,0,0,0.4)' : '0 20px 50px rgba(40,30,20,0.06)',
});
const eyebrow = (tk) => ({
  fontFamily: 'var(--font-mono)', fontSize: 10, letterSpacing: '0.32em',
  textTransform: 'uppercase', color: tk.textDim,
});

const PERIODS = [
  { id: 'month', label: 'Month' },
  { id: '3m', label: '3M' },
  { id: '6m', label: '6M' },
  { id: 'all', label: 'All' },
];

const usePatterns = (period) => {
  const { transactions } = useAppContext();
  return useMemo(() => {
    const { from, to } = periodRangeFor(period);
    return spendingPatterns(transactions, from, to);
  }, [transactions, period]);
};

// Horizontal bar.
const Bar = ({ frac, color, tk, h = 10 }) => (
  <div style={{ height: h, borderRadius: 999, background: tk.hairline2 || tk.hairline, overflow: 'hidden' }}>
    <div style={{ width: `${Math.max(2, Math.round(frac * 100))}%`, height: '100%', background: color, borderRadius: 999, transition: 'width 300ms' }} />
  </div>
);

export const SpendingPatternsPage = () => {
  const { themeTokens: tk, fmt } = useAppContext();
  const [period, setPeriod] = useState('3m');
  const p = usePatterns(period);
  const maxWd = Math.max(1, ...p.weekday.map((d) => d.total));
  const maxDom = Math.max(1, ...p.dom.map((d) => d.total));
  const weekendShare = p.grandTotal > 0 ? p.weekendTotal / p.grandTotal * 100 : 0;

  return (
    <div style={{ display: 'grid', gap: 24 }}>
      {/* Summary + period toggle */}
      <div style={{ ...card(tk), display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(190px, 1fr))', gap: 16, alignItems: 'center' }}>
        <div>
          <div style={eyebrow(tk)}>Busiest day</div>
          <div style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 30, color: tk.text, marginTop: 8 }}>{p.busiestDay?.label || '—'}</div>
          <div style={{ fontFamily: 'var(--font-mono)', fontSize: 12, color: tk.textDim, marginTop: 4 }}>{fmt(p.busiestDay?.total || 0)} total</div>
        </div>
        <div>
          <div style={eyebrow(tk)}>Weekend share</div>
          <div style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 30, color: tk.text, marginTop: 8 }}>{weekendShare.toFixed(0)}%</div>
          <div style={{ fontFamily: 'var(--font-mono)', fontSize: 12, color: tk.textDim, marginTop: 4 }}>of spend on Sat/Sun</div>
        </div>
        <div>
          <div style={eyebrow(tk)}>Avg per purchase</div>
          <div style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 30, color: tk.text, marginTop: 8 }}>{fmt(p.avgTicket)}</div>
          <div style={{ fontFamily: 'var(--font-mono)', fontSize: 12, color: tk.textDim, marginTop: 4 }}>{p.txCount} purchases</div>
        </div>
        <div style={{ justifySelf: 'end' }}>
          <div style={{ display: 'inline-flex', borderRadius: 999, overflow: 'hidden', border: `1px solid ${tk.hairline2 || tk.hairline}` }}>
            {PERIODS.map((opt) => {
              const active = period === opt.id;
              return (
                <button key={opt.id} onClick={() => setPeriod(opt.id)} style={{
                  padding: '6px 12px', border: 'none', cursor: 'pointer',
                  background: active ? tk.accent : 'transparent',
                  color: active ? (tk.isDark ? '#0B0B0D' : '#fff') : tk.textDim,
                  fontFamily: 'var(--font-mono)', fontSize: 10, letterSpacing: '0.16em', textTransform: 'uppercase',
                }}>{opt.label}</button>
              );
            })}
          </div>
        </div>
      </div>

      {p.grandTotal === 0 ? (
        <div style={{ ...card(tk), color: tk.textDim, fontSize: 14 }}>No spending recorded in this period yet.</div>
      ) : (
        <>
          {/* By weekday */}
          <div style={card(tk)}>
            <div style={{ ...eyebrow(tk), marginBottom: 16 }}>Spend by weekday</div>
            <div style={{ display: 'grid', gap: 12 }}>
              {p.weekday.map((d, i) => {
                const isWeekend = i === 0 || i === 6;
                const color = isWeekend ? tk.accent : (tk.positive || tk.accent);
                return (
                  <motion.div key={d.label} initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.03 }}
                    style={{ display: 'grid', gridTemplateColumns: '44px 1fr 110px', gap: 14, alignItems: 'center' }}>
                    <span style={{ fontFamily: 'var(--font-mono)', fontSize: 12, color: isWeekend ? tk.accent : tk.textDim }}>{d.label}</span>
                    <Bar frac={d.total / maxWd} color={color} tk={tk} />
                    <span style={{ textAlign: 'right', fontFamily: 'var(--font-mono)', fontSize: 12, color: tk.text }}>{fmt(d.total)}</span>
                  </motion.div>
                );
              })}
            </div>
          </div>

          {/* By day of month */}
          <div style={card(tk)}>
            <div style={{ ...eyebrow(tk), marginBottom: 16 }}>Spend by day of month</div>
            <div style={{ display: 'flex', alignItems: 'flex-end', gap: 3, height: 120 }}>
              {p.dom.map((d) => (
                <div key={d.day} title={`Day ${d.day} · ${fmt(d.total)} · ${d.count} tx`}
                  style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'flex-end', height: '100%' }}>
                  <div style={{ height: `${Math.max(2, (d.total / maxDom) * 100)}%`, background: d.total >= maxDom * 0.999 ? tk.accent : (tk.textDim), opacity: d.total > 0 ? 0.9 : 0.25, borderRadius: '3px 3px 0 0' }} />
                </div>
              ))}
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 8, fontFamily: 'var(--font-mono)', fontSize: 10, color: tk.textFaint || tk.textDim }}>
              <span>1</span><span>10</span><span>20</span><span>31</span>
            </div>
          </div>

          {/* Weekday vs weekend split bar */}
          <div style={card(tk)}>
            <div style={{ ...eyebrow(tk), marginBottom: 14 }}>Weekday vs weekend</div>
            <div style={{ display: 'flex', height: 28, borderRadius: 999, overflow: 'hidden', border: `1px solid ${tk.hairline}` }}>
              <div style={{ width: `${100 - weekendShare}%`, background: tk.positive || tk.accent, display: 'grid', placeItems: 'center' }}>
                {100 - weekendShare > 16 && <span style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: tk.isDark ? '#0B0B0D' : '#fff' }}>WEEKDAY {(100 - weekendShare).toFixed(0)}%</span>}
              </div>
              <div style={{ width: `${weekendShare}%`, background: tk.accent, display: 'grid', placeItems: 'center' }}>
                {weekendShare > 16 && <span style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: tk.isDark ? '#0B0B0D' : '#fff' }}>WEEKEND {weekendShare.toFixed(0)}%</span>}
              </div>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 10, fontFamily: 'var(--font-mono)', fontSize: 12, color: tk.textDim }}>
              <span>{fmt(p.weekdayTotal)} on weekdays</span>
              <span>{fmt(p.weekendTotal)} on weekends</span>
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export const SpendingPatternsPreview = () => {
  const { themeTokens: tk, fmt, setView } = useAppContext();
  const p = usePatterns('3m');
  const maxWd = Math.max(1, ...p.weekday.map((d) => d.total));
  return (
    <div onClick={() => setView('patterns')} className="aurum-card-hover" style={{ ...card(tk), cursor: 'pointer' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
        <div style={eyebrow(tk)}>Spending Patterns</div>
        <span style={{ fontFamily: 'var(--font-mono)', fontSize: 10, letterSpacing: '0.16em', textTransform: 'uppercase', color: tk.textDim }}>Open →</span>
      </div>
      {p.grandTotal > 0 ? (
        <>
          <div style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: tk.textDim }}>Busiest day · last 3 months</div>
          <div style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 26, color: tk.text, marginTop: 6 }}>{p.busiestDay?.label || '—'}</div>
          <div style={{ display: 'flex', alignItems: 'flex-end', gap: 4, height: 36, marginTop: 12 }}>
            {p.weekday.map((d, i) => (
              <div key={d.label} style={{ flex: 1, height: `${Math.max(6, (d.total / maxWd) * 100)}%`,
                background: (i === 0 || i === 6) ? tk.accent : tk.textDim, opacity: 0.85, borderRadius: '2px 2px 0 0' }} />
            ))}
          </div>
        </>
      ) : (
        <div style={{ color: tk.textDim, fontSize: 13 }}>Record some spending to see your weekly rhythm.</div>
      )}
    </div>
  );
};

export default SpendingPatternsPage;
