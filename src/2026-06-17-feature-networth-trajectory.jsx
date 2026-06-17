// Feature (2026-06-17 review): Net-Worth Trajectory — the forward wealth curve.
//
// What it does: the Net Worth tab shows only TODAY (assets + savings − managed
// debt) and a log of past snapshots. This projects that number FORWARD — "if you
// keep saving at your recent pace, here's your net worth over the next year, and
// the date you cross the next round-number milestone."
//
// Where it lives: its own "Trajectory" tab (Plan group) + a small Dashboard
// preview that shows the 12-month projected net worth and links into the tab.
//
// Design note (CLAUDE.md rules #4 / #5): all numbers come from the pure
// `trajectoryReport`, which REUSES the existing `netWorthSnapshot` (current
// equity) and `monthlyExpenseSeries` (real monthly cash flow). It invents no new
// spending model — the growth rate is just the average of REAL completed months,
// and it's labelled an estimate, not a promise of future money. Read-only.

import React, { useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import { useAppContext } from './context.jsx';
import { monthlyExpenseSeries } from './2026-06-09-utils-analytics.js';
import { trajectoryReport } from './2026-06-17-utils-networth-trajectory.js';

const card = (tk) => ({
  background: tk.surface, border: `1px solid ${tk.hairline}`, borderRadius: 18, padding: 24,
  backdropFilter: 'blur(24px)', WebkitBackdropFilter: 'blur(24px)',
  boxShadow: tk.isDark ? '0 30px 60px rgba(0,0,0,0.4)' : '0 20px 50px rgba(40,30,20,0.06)',
});
const eyebrow = (tk) => ({
  fontFamily: 'var(--font-mono)', fontSize: 10, letterSpacing: '0.32em',
  textTransform: 'uppercase', color: tk.textDim,
});

// Build the projection from current equity + completed-month cash flow. The
// current, in-progress month is dropped so a half-finished month never drags
// the pace down (same month-to-date discipline used across the app).
const useTrajectory = (horizonMonths, useMedian) => {
  const { transactions, netWorthSnapshot } = useAppContext();
  return useMemo(() => {
    const snap = netWorthSnapshot ? netWorthSnapshot() : { equity: 0 };
    // 7 months ending with the current one; drop the last (in-progress) month.
    const series = monthlyExpenseSeries(transactions, 7);
    const completed = series.slice(0, -1);
    const monthlyNets = completed.map((m) => m.cashflow);
    return { ...trajectoryReport({ equity: snap.equity, monthlyNets, horizonMonths, useMedian }), snap };
  }, [transactions, netWorthSnapshot, horizonMonths, useMedian]);
};

// Tiny inline area+line chart of the projected curve. Pure SVG, no deps. Shades
// the band between zero (or the min point) and the curve, draws the line, and
// marks the start (now) and end (projected) points.
const TrajectoryChart = ({ points, tk, fmt, growing }) => {
  const W = 720, H = 200, padX = 14, padTop = 18, padBottom = 26;
  const vals = points.map((p) => p.value);
  const max = Math.max(...vals), min = Math.min(...vals);
  const span = max - min || 1;
  const x = (i) => padX + (i / (points.length - 1)) * (W - padX * 2);
  const y = (v) => padTop + (1 - (v - min) / span) * (H - padTop - padBottom);
  const line = points.map((p, i) => `${i === 0 ? 'M' : 'L'} ${x(i).toFixed(1)} ${y(p.value).toFixed(1)}`).join(' ');
  const area = `${line} L ${x(points.length - 1).toFixed(1)} ${(H - padBottom).toFixed(1)} L ${x(0).toFixed(1)} ${(H - padBottom).toFixed(1)} Z`;
  const stroke = growing ? tk.positive : tk.negative;
  const gid = 'trajGrad';
  return (
    <svg viewBox={`0 0 ${W} ${H}`} width="100%" height="200" preserveAspectRatio="none" role="img" aria-label="Projected net worth curve">
      <defs>
        <linearGradient id={gid} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={stroke} stopOpacity="0.28" />
          <stop offset="100%" stopColor={stroke} stopOpacity="0.02" />
        </linearGradient>
      </defs>
      <path d={area} fill={`url(#${gid})`} stroke="none" />
      <path d={line} fill="none" stroke={stroke} strokeWidth="2.5" strokeLinejoin="round" strokeLinecap="round" />
      {/* start + end dots */}
      <circle cx={x(0)} cy={y(points[0].value)} r="4" fill={tk.text} />
      <circle cx={x(points.length - 1)} cy={y(points[points.length - 1].value)} r="5" fill={stroke} stroke={tk.surface} strokeWidth="2" />
      {/* sparse x labels: first, middle, last */}
      {[0, Math.floor((points.length - 1) / 2), points.length - 1].map((i) => (
        <text key={i} x={x(i)} y={H - 8} textAnchor={i === 0 ? 'start' : i === points.length - 1 ? 'end' : 'middle'}
          fontSize="11" fill={tk.textFaint || tk.textDim} fontFamily="var(--font-mono)">{points[i].label}</text>
      ))}
    </svg>
  );
};

const HORIZONS = [
  { id: 12, label: '1 yr' },
  { id: 24, label: '2 yr' },
  { id: 60, label: '5 yr' },
];

const Stat = ({ tk, label, value, color, sub }) => (
  <div>
    <div style={eyebrow(tk)}>{label}</div>
    <div style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 26, color: color || tk.text, marginTop: 8 }}>{value}</div>
    {sub && <div style={{ fontFamily: 'var(--font-mono)', fontSize: 12, color: tk.textDim, marginTop: 4 }}>{sub}</div>}
  </div>
);

const horizonWord = (m) => (m % 12 === 0 ? `${m / 12} year${m === 12 ? '' : 's'}` : `${m} months`);

export const NetWorthTrajectoryPage = () => {
  const { themeTokens: tk, fmt, setView } = useAppContext();
  const [horizon, setHorizon] = useState(12);
  const [useMedian, setUseMedian] = useState(false);
  const t = useTrajectory(horizon, useMedian);

  const headlineColor = t.shrinking ? tk.negative : t.growing ? tk.positive : tk.text;
  const delta = t.projected - t.equity;

  return (
    <div style={{ display: 'grid', gap: 24 }}>
      {/* Headline: projected net worth at the chosen horizon */}
      <div style={{ ...card(tk), display: 'grid', gridTemplateColumns: 'minmax(220px, 320px) 1fr', gap: 28, alignItems: 'center' }}>
        <div>
          <div style={eyebrow(tk)}>Projected net worth · {horizonWord(horizon)}</div>
          <div style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 50, lineHeight: 1, color: headlineColor, marginTop: 10 }}>
            {fmt(t.projected)}
          </div>
          <div style={{ fontFamily: 'var(--font-mono)', fontSize: 12, color: tk.textDim, marginTop: 8 }}>
            {t.flat
              ? 'Flat — no recent net savings to project'
              : `${delta >= 0 ? '+' : '−'}${fmt(Math.abs(delta))} vs today (${fmt(t.equity)})`}
          </div>
        </div>
        <div>
          <div style={{ color: tk.textDim, fontSize: 14, lineHeight: 1.6, maxWidth: 560 }}>
            {t.growing ? (
              <>At your recent pace of <b style={{ color: tk.text }}>{fmt(t.rate)}/month</b> saved, your net worth
              grows from <b style={{ color: tk.text }}>{fmt(t.equity)}</b> today to about
              <b style={{ color: tk.positive }}> {fmt(t.projected)}</b> in {horizonWord(horizon)}.</>
            ) : t.shrinking ? (
              <>Your net worth is drifting <b style={{ color: tk.negative }}>down</b> by about {fmt(-t.rate)}/month
              at your recent pace{t.monthsToZero != null ? <>, which would reach zero in roughly <b style={{ color: tk.text }}>{t.monthsToZero} months</b> if nothing changes</> : null}.</>
            ) : (
              <>There isn't enough recent net saving to project a trajectory yet. Once a few months show money
              left over after expenses, the curve will appear here.</>
            )}
          </div>
          {/* Horizon + basis toggles */}
          <div style={{ display: 'flex', gap: 12, marginTop: 16, flexWrap: 'wrap' }}>
            <div style={{ display: 'inline-flex', borderRadius: 999, overflow: 'hidden', border: `1px solid ${tk.hairline2 || tk.hairline}` }}>
              {HORIZONS.map((h) => {
                const active = horizon === h.id;
                return (
                  <button key={h.id} onClick={() => setHorizon(h.id)} style={{
                    padding: '6px 14px', border: 'none', cursor: 'pointer',
                    background: active ? tk.accent : 'transparent',
                    color: active ? (tk.isDark ? '#0B0B0D' : '#fff') : tk.textDim,
                    fontFamily: 'var(--font-mono)', fontSize: 10, letterSpacing: '0.16em', textTransform: 'uppercase',
                  }}>{h.label}</button>
                );
              })}
            </div>
            <div style={{ display: 'inline-flex', borderRadius: 999, overflow: 'hidden', border: `1px solid ${tk.hairline2 || tk.hairline}` }}>
              {[{ id: false, label: 'Average month' }, { id: true, label: 'Typical (median)' }].map((opt) => {
                const active = useMedian === opt.id;
                return (
                  <button key={String(opt.id)} onClick={() => setUseMedian(opt.id)}
                    title={opt.id ? 'Median month resists one freak month (a big one-off or windfall)' : 'Mean of the last completed months'}
                    style={{
                      padding: '6px 14px', border: 'none', cursor: 'pointer',
                      background: active ? tk.accent : 'transparent',
                      color: active ? (tk.isDark ? '#0B0B0D' : '#fff') : tk.textDim,
                      fontFamily: 'var(--font-mono)', fontSize: 10, letterSpacing: '0.16em', textTransform: 'uppercase',
                    }}>{opt.label}</button>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      {/* The curve */}
      <div style={card(tk)}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 10, flexWrap: 'wrap', gap: 8 }}>
          <div style={eyebrow(tk)}>Net worth · now → {horizonWord(horizon)}</div>
          <div style={{ fontFamily: 'var(--font-mono)', fontSize: 12, color: tk.textDim }}>
            based on {t.monthsOfData} completed month{t.monthsOfData === 1 ? '' : 's'}
          </div>
        </div>
        {t.flat ? (
          <div style={{ color: tk.textDim, fontSize: 14, padding: '24px 0' }}>No projection to draw yet.</div>
        ) : (
          <TrajectoryChart points={t.points} tk={tk} fmt={fmt} growing={t.growing} />
        )}
      </div>

      {/* How it's built — transparent breakdown */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 16 }}>
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} style={card(tk)}>
          <Stat tk={tk} label="Net worth today" value={fmt(t.equity)} color={tk.text}
            sub={`Assets ${fmt((t.snap?.apts || 0) + (t.snap?.moto || 0))} + savings ${fmt(t.snap?.savings || 0)} − debt ${fmt(t.snap?.managedDebt || 0)}`} />
        </motion.div>
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }} style={card(tk)}>
          <Stat tk={tk} label={useMedian ? 'Typical monthly saving' : 'Average monthly saving'}
            value={`${t.rate >= 0 ? '+' : '−'}${fmt(Math.abs(t.rate))}`} color={t.rate >= 0 ? tk.positive : tk.negative}
            sub={`Mean ${fmt(t.meanMonthlyNet)} · median ${fmt(t.medianMonthlyNet)}`} />
        </motion.div>
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} style={card(tk)}>
          <Stat tk={tk} label={`In ${horizonWord(horizon)}`} value={fmt(t.projected)} color={headlineColor}
            sub={`${delta >= 0 ? '+' : '−'}${fmt(Math.abs(delta))} from today`} />
        </motion.div>
      </div>

      {/* Milestones — when you cross the next round numbers */}
      {t.growing && t.milestones.length > 0 && (
        <div style={card(tk)}>
          <div style={{ ...eyebrow(tk), marginBottom: 14 }}>Milestones at this pace</div>
          <div style={{ display: 'grid', gap: 10 }}>
            {t.milestones.map((m) => (
              <div key={m.value} style={{
                display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12,
                padding: '12px 14px', borderRadius: 12, border: `1px solid ${tk.hairline}`,
                background: tk.isDark ? 'rgba(255,255,255,0.02)' : 'rgba(40,30,20,0.015)',
              }}>
                <div style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 18, color: tk.text }}>{fmt(m.value)}</div>
                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontFamily: 'var(--font-mono)', fontSize: 13, color: tk.text }}>{m.label}</div>
                  <div style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: tk.textDim }}>
                    ~{m.monthsAway} month{m.monthsAway === 1 ? '' : 's'} away
                  </div>
                </div>
              </div>
            ))}
          </div>
          <div style={{ marginTop: 14, fontSize: 12, color: tk.textFaint || tk.textDim, lineHeight: 1.5 }}>
            A straight-line estimate from your recent saving pace, not a guarantee. Crossing dates assume the
            pace holds and no new assets or debts are added. Switch to "Typical (median)" above to ignore one
            unusual month.
          </div>
        </div>
      )}

      <div style={{ ...card(tk), display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12 }}>
        <div style={{ color: tk.textDim, fontSize: 13 }}>Want the full asset & debt breakdown behind today's number?</div>
        <button onClick={() => setView('networth')} style={{
          background: 'transparent', border: `1px solid ${tk.hairline2 || tk.hairline}`, color: tk.text,
          padding: '8px 16px', borderRadius: 999, fontFamily: 'var(--font-mono)', fontSize: 10,
          letterSpacing: '0.18em', textTransform: 'uppercase', cursor: 'pointer',
        }}>Open net worth →</button>
      </div>
    </div>
  );
};

export const NetWorthTrajectoryPreview = () => {
  const { themeTokens: tk, fmt, setView } = useAppContext();
  const t = useTrajectory(12, false);
  const headlineColor = t.shrinking ? tk.negative : t.growing ? tk.positive : tk.text;
  const delta = t.projected - t.equity;
  return (
    <div onClick={() => setView('trajectory')} className="aurum-card-hover" style={{ ...card(tk), cursor: 'pointer' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
        <div style={eyebrow(tk)}>Net-Worth Trajectory</div>
        <span style={{ fontFamily: 'var(--font-mono)', fontSize: 10, letterSpacing: '0.16em', textTransform: 'uppercase', color: tk.textDim }}>Open →</span>
      </div>
      <div style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: tk.textDim }}>Projected · 1 year</div>
      <div style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 30, color: headlineColor, marginTop: 6 }}>
        {fmt(t.projected)}
      </div>
      <div style={{ fontFamily: 'var(--font-mono)', fontSize: 12, color: tk.textDim, marginTop: 4 }}>
        {t.flat
          ? 'Add savings to project'
          : `${delta >= 0 ? '+' : '−'}${fmt(Math.abs(delta))} vs today`}
      </div>
    </div>
  );
};

export default NetWorthTrajectoryPage;
