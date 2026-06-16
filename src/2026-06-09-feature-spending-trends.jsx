// Feature (2026-06-09 review): Spending Trends / Top Movers
//
// What it does: compares this month's spending to last month, per category,
// and surfaces the biggest increases and decreases ("movers"). Each category
// gets a 6-month sparkline so you can see direction at a glance.
//
// Where it lives: its own "Trends" tab + a small Dashboard preview that shows
// the single biggest mover this month and links into the tab.
//
// Read-only. All money from `transactions`; displayed via context `fmt()`.

import React, { useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import { useAppContext } from './context.jsx';
import { monthRangeFor, categoryExpenseTotals, monthlyExpenseSeries } from './2026-06-09-utils-analytics.js';

const card = (tk) => ({
  background: tk.surface, border: `1px solid ${tk.hairline}`, borderRadius: 18, padding: 24,
  backdropFilter: 'blur(24px)', WebkitBackdropFilter: 'blur(24px)',
  boxShadow: tk.isDark ? '0 30px 60px rgba(0,0,0,0.4)' : '0 20px 50px rgba(40,30,20,0.06)',
});
const eyebrow = (tk) => ({
  fontFamily: 'var(--font-mono)', fontSize: 10, letterSpacing: '0.32em',
  textTransform: 'uppercase', color: tk.textDim,
});

const pctLabel = (prev, cur) => {
  if (prev <= 0 && cur <= 0) return '0%';
  if (prev <= 0) return 'new';
  return `${cur >= prev ? '+' : '−'}${Math.abs((cur - prev) / prev * 100).toFixed(0)}%`;
};

// Tiny inline sparkline (no external deps). values oldest -> newest.
const Sparkline = ({ values, color, tk, w = 120, h = 30 }) => {
  const max = Math.max(1, ...values);
  const min = Math.min(0, ...values);
  const span = max - min || 1;
  const step = values.length > 1 ? w / (values.length - 1) : w;
  const pts = values.map((v, i) => `${(i * step).toFixed(1)},${(h - ((v - min) / span) * h).toFixed(1)}`).join(' ');
  const lastX = (values.length - 1) * step;
  const lastY = h - ((values[values.length - 1] - min) / span) * h;
  return (
    <svg width={w} height={h} viewBox={`0 0 ${w} ${h}`} aria-hidden style={{ overflow: 'visible' }}>
      <polyline points={pts} fill="none" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
      <circle cx={lastX} cy={lastY} r={2.6} fill={color} />
    </svg>
  );
};

const useTrends = () => {
  const { transactions } = useAppContext();
  return useMemo(() => {
    const now = new Date();
    const cur = monthRangeFor(0, now);
    const prev = monthRangeFor(1, now);
    // Current month is month-to-date (capped at today), like Month Compare's
    // in-progress month: future-dated instalments seeded later this month must
    // not count as already-spent (CLAUDE.md rule #5). Past months use the whole
    // month, so the comparison baseline is unaffected.
    const curMap = categoryExpenseTotals(transactions, cur.from, now);
    const prevMap = categoryExpenseTotals(transactions, prev.from, prev.to);
    const series = monthlyExpenseSeries(transactions, 6);
    const cats = new Set([...curMap.keys(), ...prevMap.keys()]);
    const rows = [];
    for (const c of cats) {
      const curV = curMap.get(c) || 0;
      const prevV = prevMap.get(c) || 0;
      const spark = series.map((m) => {
        const isCurMonth = m.year === now.getFullYear() && m.monthIndex === now.getMonth();
        const r = {
          from: new Date(m.year, m.monthIndex, 1),
          to: isCurMonth ? now : new Date(m.year, m.monthIndex + 1, 0, 23, 59, 59, 999),
        };
        return categoryExpenseTotals(transactions, r.from, r.to).get(c) || 0;
      });
      rows.push({ category: c, cur: curV, prev: prevV, delta: curV - prevV, spark });
    }
    rows.sort((a, b) => b.cur - a.cur);
    const movers = rows.filter((r) => Math.abs(r.delta) > 0.005).sort((a, b) => Math.abs(b.delta) - Math.abs(a.delta));
    const totalCur = rows.reduce((s, r) => s + r.cur, 0);
    const totalPrev = rows.reduce((s, r) => s + r.prev, 0);
    return { rows, movers, totalCur, totalPrev, curLabel: cur.label, prevLabel: prev.label };
  }, [transactions]);
};

export const SpendingTrendsPage = () => {
  const { themeTokens: tk, fmt, getCategoryColor } = useAppContext();
  const t = useTrends();
  const [sort, setSort] = useState('mover'); // 'mover' | 'spend'
  const rows = sort === 'mover' ? t.movers : t.rows;
  const top = t.movers[0];

  return (
    <div style={{ display: 'grid', gap: 24 }}>
      <div style={{ ...card(tk), display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 16 }}>
        <div>
          <div style={eyebrow(tk)}>This month spend</div>
          <div style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 30, color: tk.text, marginTop: 8 }}>{fmt(t.totalCur)}</div>
          <div style={{ fontFamily: 'var(--font-mono)', fontSize: 12, color: t.totalCur >= t.totalPrev ? tk.negative : tk.positive, marginTop: 4 }}>
            {pctLabel(t.totalPrev, t.totalCur)} vs {t.prevLabel}
          </div>
        </div>
        {top && (
          <div>
            <div style={eyebrow(tk)}>Biggest mover</div>
            <div style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 30, color: tk.text, marginTop: 8 }}>{top.category}</div>
            <div style={{ fontFamily: 'var(--font-mono)', fontSize: 12, color: top.delta >= 0 ? tk.negative : tk.positive, marginTop: 4 }}>
              {top.delta >= 0 ? '▲' : '▼'} {fmt(Math.abs(top.delta))} ({pctLabel(top.prev, top.cur)})
            </div>
          </div>
        )}
        <div>
          <div style={eyebrow(tk)}>Last month spend</div>
          <div style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 30, color: tk.textDim, marginTop: 8 }}>{fmt(t.totalPrev)}</div>
          <div style={{ fontFamily: 'var(--font-mono)', fontSize: 12, color: tk.textDim, marginTop: 4 }}>{t.prevLabel}</div>
        </div>
      </div>

      <div style={card(tk)}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16, flexWrap: 'wrap', gap: 10 }}>
          <div style={eyebrow(tk)}>{t.curLabel} vs {t.prevLabel} · by category</div>
          <div style={{ display: 'inline-flex', borderRadius: 999, overflow: 'hidden', border: `1px solid ${tk.hairline2 || tk.hairline}` }}>
            {[{ id: 'mover', label: 'Movers' }, { id: 'spend', label: 'Top spend' }].map((opt) => {
              const active = sort === opt.id;
              return (
                <button key={opt.id} onClick={() => setSort(opt.id)} style={{
                  padding: '6px 12px', border: 'none', cursor: 'pointer',
                  background: active ? tk.accent : 'transparent',
                  color: active ? (tk.isDark ? '#0B0B0D' : '#fff') : tk.textDim,
                  fontFamily: 'var(--font-mono)', fontSize: 10, letterSpacing: '0.16em', textTransform: 'uppercase',
                }}>{opt.label}</button>
              );
            })}
          </div>
        </div>
        {rows.length === 0 && <div style={{ color: tk.textDim, fontSize: 13 }}>No spending recorded for these two months yet.</div>}
        <div style={{ display: 'grid', gap: 2 }}>
          {rows.map((r, i) => {
            const cColor = getCategoryColor ? getCategoryColor(r.category) : tk.accent;
            const up = r.delta >= 0;
            const moveColor = Math.abs(r.delta) < 0.005 ? tk.textDim : (up ? tk.negative : tk.positive);
            return (
              <motion.div key={r.category} initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: Math.min(i * 0.03, 0.4) }}
                style={{ display: 'grid', gridTemplateColumns: '10px 1.4fr 130px 1fr 110px', gap: 14, alignItems: 'center', padding: '12px 0', borderBottom: `1px solid ${tk.hairline}` }}>
                <span style={{ width: 10, height: 10, borderRadius: 3, background: cColor }} />
                <div>
                  <div style={{ color: tk.text, fontSize: 14 }}>{r.category}</div>
                  <div style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: tk.textDim, marginTop: 2 }}>{fmt(r.cur)} <span style={{ opacity: 0.6 }}>· was {fmt(r.prev)}</span></div>
                </div>
                <Sparkline values={r.spark} color={cColor} tk={tk} />
                <div style={{ fontFamily: 'var(--font-mono)', fontSize: 13, color: moveColor }}>
                  {Math.abs(r.delta) < 0.005 ? '—' : `${up ? '▲' : '▼'} ${fmt(Math.abs(r.delta))}`}
                </div>
                <div style={{ textAlign: 'right', fontFamily: 'var(--font-mono)', fontSize: 12, color: moveColor }}>{pctLabel(r.prev, r.cur)}</div>
              </motion.div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

export const SpendingTrendsPreview = () => {
  const { themeTokens: tk, fmt, setView } = useAppContext();
  const t = useTrends();
  const top = t.movers[0];
  const up = top ? top.delta >= 0 : true;
  const moveColor = top ? (up ? tk.negative : tk.positive) : tk.textDim;
  return (
    <div onClick={() => setView('trends')} className="aurum-card-hover" style={{ ...card(tk), cursor: 'pointer' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
        <div style={eyebrow(tk)}>Spending Trends</div>
        <span style={{ fontFamily: 'var(--font-mono)', fontSize: 10, letterSpacing: '0.16em', textTransform: 'uppercase', color: tk.textDim }}>Open →</span>
      </div>
      {top ? (
        <>
          <div style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: tk.textDim }}>Biggest mover · {t.curLabel}</div>
          <div style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 26, color: tk.text, marginTop: 6 }}>{top.category}</div>
          <div style={{ fontFamily: 'var(--font-mono)', fontSize: 13, color: moveColor, marginTop: 4 }}>
            {up ? '▲' : '▼'} {fmt(Math.abs(top.delta))} ({pctLabel(top.prev, top.cur)}) vs {t.prevLabel}
          </div>
        </>
      ) : (
        <div style={{ color: tk.textDim, fontSize: 13 }}>Add a couple of months of spending to see movers.</div>
      )}
    </div>
  );
};

export default SpendingTrendsPage;
