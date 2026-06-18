// Feature (2026-06-18 review): Emergency Fund / Safety Net.
//
// What it does: turns the savings buffer into a plain answer — "your savings
// covers N months of expenses; aim for a 3 / 6 / 12-month cushion; you're X%
// there; at your recent saving pace you'll reach it by <month>." It's the
// actionable, dedicated view behind the Financial Health "emergency runway"
// sub-score, which until now was only a single number on the Health tab.
//
// Where it lives: its own "Safety Net" tab (Plan group, with the savings
// cluster) + a small Dashboard preview that shows months covered and links in.
//
// Design note (CLAUDE.md rules #4 / #5): all numbers come from the pure
// `emergencyFundReport`, which REUSES the same trailing-average monthly expense
// the Health runway uses and the same `monthlySavingsPace` the Goals tab uses —
// so it can never disagree with those surfaces. Read-only; no writes at all.

import React, { useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import { useAppContext } from './context.jsx';
import { monthlyExpenseSeries } from './2026-06-09-utils-analytics.js';
import { monthlySavingsPace } from './2026-06-10-utils-forecast.js';
import { emergencyFundReport } from './2026-06-18-utils-emergency-fund.js';

const card = (tk) => ({
  background: tk.surface, border: `1px solid ${tk.hairline}`, borderRadius: 18, padding: 24,
  backdropFilter: 'blur(24px)', WebkitBackdropFilter: 'blur(24px)',
  boxShadow: tk.isDark ? '0 30px 60px rgba(0,0,0,0.4)' : '0 20px 50px rgba(40,30,20,0.06)',
});
const eyebrow = (tk) => ({
  fontFamily: 'var(--font-mono)', fontSize: 10, letterSpacing: '0.32em',
  textTransform: 'uppercase', color: tk.textDim,
});
const toneColor = (tk, tone) =>
  tone === 'positive' ? tk.positive : tone === 'negative' ? tk.negative : tk.accent;

// Shared computation used by both the page and the Dashboard preview so the
// numbers are always identical in both places. Average monthly expense uses the
// SAME trailing window + filter as the Health "runway" sub-score.
const useSafetyNet = (targetMonths) => {
  const { transactions, savingsTotal } = useAppContext();
  return useMemo(() => {
    const series = monthlyExpenseSeries(transactions, 6);
    const withSpend = series.filter((m) => m.expense > 0);
    const avgMonthlyExpense = withSpend.length
      ? withSpend.reduce((s, m) => s + m.expense, 0) / withSpend.length
      : 0;
    const monthlyPace = monthlySavingsPace(transactions, 3);
    return emergencyFundReport({ savingsTotal, avgMonthlyExpense, monthlyPace, targetMonths });
  }, [transactions, savingsTotal, targetMonths]);
};

const TARGETS = [
  { id: 3, label: '3 mo' },
  { id: 6, label: '6 mo' },
  { id: 12, label: '12 mo' },
];

const Stat = ({ tk, label, value, color, sub }) => (
  <div>
    <div style={eyebrow(tk)}>{label}</div>
    <div style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 26, color: color || tk.text, marginTop: 8 }}>{value}</div>
    {sub && <div style={{ fontFamily: 'var(--font-mono)', fontSize: 12, color: tk.textDim, marginTop: 4 }}>{sub}</div>}
  </div>
);

const monthsText = (m) => (m == null ? '—' : `${m.toFixed(1)} mo`);

export const EmergencyFundPage = () => {
  const { themeTokens: tk, fmt, setView } = useAppContext();
  const [targetMonths, setTargetMonths] = useState(6);
  const r = useSafetyNet(targetMonths);
  const color = toneColor(tk, r.band.tone);

  return (
    <div style={{ display: 'grid', gap: 24 }}>
      {/* Headline: months of expenses covered + status band */}
      <div style={{ ...card(tk), display: 'grid', gridTemplateColumns: 'minmax(220px, 320px) 1fr', gap: 28, alignItems: 'center' }}>
        <div>
          <div style={eyebrow(tk)}>Months of expenses covered</div>
          <div style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 50, lineHeight: 1, color, marginTop: 10 }}>
            {r.monthsCovered == null ? '—' : `${r.monthsCovered.toFixed(1)}`}
            {r.monthsCovered != null && <span style={{ fontSize: 22, color: tk.textDim }}> mo</span>}
          </div>
          <div style={{ fontFamily: 'var(--font-mono)', fontSize: 11, letterSpacing: '0.2em', textTransform: 'uppercase', color, marginTop: 10 }}>
            {r.band.label}
          </div>
        </div>
        <div>
          <div style={{ color: tk.textDim, fontSize: 14, lineHeight: 1.6, maxWidth: 560 }}>
            {!r.hasExpenseData ? (
              <>There isn't enough recent spending recorded to size a safety net yet. Once a few months of
              expenses are logged, this will show how long your savings would last.</>
            ) : r.funded ? (
              <>Your <b style={{ color: tk.text }}>{fmt(r.buffer)}</b> savings buffer fully covers a
              <b style={{ color: tk.positive }}> {r.targetMonths}-month</b> cushion at your typical spend of
              <b style={{ color: tk.text }}> {fmt(r.avgMonthlyExpense)}/month</b>. Nicely protected.</>
            ) : (
              <>Your <b style={{ color: tk.text }}>{fmt(r.buffer)}</b> savings buffer covers about
              <b style={{ color }}> {monthsText(r.monthsCovered)}</b> at your typical spend of
              <b style={{ color: tk.text }}> {fmt(r.avgMonthlyExpense)}/month</b>. A
              <b style={{ color: tk.text }}> {r.targetMonths}-month</b> cushion needs
              <b style={{ color: tk.text }}> {fmt(r.targetAmount)}</b>.</>
            )}
          </div>
          {/* Target cushion toggle */}
          <div style={{ display: 'flex', gap: 12, marginTop: 16, flexWrap: 'wrap', alignItems: 'center' }}>
            <span style={{ ...eyebrow(tk), fontSize: 9 }}>Target</span>
            <div style={{ display: 'inline-flex', borderRadius: 999, overflow: 'hidden', border: `1px solid ${tk.hairline2 || tk.hairline}` }}>
              {TARGETS.map((t) => {
                const active = targetMonths === t.id;
                return (
                  <button key={t.id} onClick={() => setTargetMonths(t.id)} style={{
                    padding: '6px 14px', border: 'none', cursor: 'pointer',
                    background: active ? tk.accent : 'transparent',
                    color: active ? (tk.isDark ? '#0B0B0D' : '#fff') : tk.textDim,
                    fontFamily: 'var(--font-mono)', fontSize: 10, letterSpacing: '0.16em', textTransform: 'uppercase',
                  }}>{t.label}</button>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      {/* Progress toward the chosen cushion */}
      <div style={card(tk)}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 12, flexWrap: 'wrap', gap: 8 }}>
          <div style={eyebrow(tk)}>Progress to a {r.targetMonths}-month cushion</div>
          <div style={{ fontFamily: 'var(--font-mono)', fontSize: 12, color }}>{Math.round(r.pct)}%</div>
        </div>
        <div style={{ height: 14, borderRadius: 999, background: tk.hairline2 || tk.hairline, overflow: 'hidden' }}>
          <motion.div initial={{ width: 0 }} animate={{ width: `${Math.round(r.pct)}%` }}
            transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
            style={{ height: '100%', background: color, borderRadius: 999 }} />
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 8, fontFamily: 'var(--font-mono)', fontSize: 12, color: tk.textDim }}>
          <span>{fmt(r.buffer)} saved</span>
          <span>{fmt(r.targetAmount)} target</span>
        </div>
      </div>

      {/* Breakdown */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 16 }}>
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} style={card(tk)}>
          <Stat tk={tk} label="Savings buffer" value={fmt(r.buffer)} color={tk.text}
            sub={`Covers ${monthsText(r.monthsCovered)} of expenses`} />
        </motion.div>
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }} style={card(tk)}>
          <Stat tk={tk} label="Typical monthly spend" value={fmt(r.avgMonthlyExpense)} color={tk.text}
            sub="Trailing 6-month average" />
        </motion.div>
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} style={card(tk)}>
          <Stat tk={tk}
            label={r.funded ? 'Status' : 'Still needed'}
            value={r.funded ? 'Funded' : fmt(r.gap)}
            color={r.funded ? tk.positive : tk.text}
            sub={r.funded
              ? `${r.targetMonths}-month cushion met`
              : r.monthsToFund != null
                ? `~${r.monthsToFund} mo away · ${r.etaLabel}`
                : 'Add to savings to start the clock'} />
        </motion.div>
      </div>

      {/* Footnote + cross-links */}
      <div style={{ ...card(tk), display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12 }}>
        <div style={{ color: tk.textFaint || tk.textDim, fontSize: 12, lineHeight: 1.5, maxWidth: 560 }}>
          An emergency fund is savings set aside to cover essential expenses if income stops. The ETA is a
          straight-line estimate from your recent saving pace, not a guarantee.
        </div>
        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
          <button onClick={() => setView('goals')} style={{
            background: 'transparent', border: `1px solid ${tk.hairline2 || tk.hairline}`, color: tk.text,
            padding: '8px 16px', borderRadius: 999, fontFamily: 'var(--font-mono)', fontSize: 10,
            letterSpacing: '0.18em', textTransform: 'uppercase', cursor: 'pointer',
          }}>Savings goals →</button>
          <button onClick={() => setView('health')} style={{
            background: 'transparent', border: `1px solid ${tk.hairline2 || tk.hairline}`, color: tk.text,
            padding: '8px 16px', borderRadius: 999, fontFamily: 'var(--font-mono)', fontSize: 10,
            letterSpacing: '0.18em', textTransform: 'uppercase', cursor: 'pointer',
          }}>Health score →</button>
        </div>
      </div>
    </div>
  );
};

export const EmergencyFundPreview = () => {
  const { themeTokens: tk, fmt, setView } = useAppContext();
  const r = useSafetyNet(6);
  const color = toneColor(tk, r.band.tone);
  return (
    <div onClick={() => setView('emergencyFund')} className="aurum-card-hover" style={{ ...card(tk), cursor: 'pointer' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
        <div style={eyebrow(tk)}>Safety Net</div>
        <span style={{ fontFamily: 'var(--font-mono)', fontSize: 10, letterSpacing: '0.16em', textTransform: 'uppercase', color: tk.textDim }}>Open →</span>
      </div>
      <div style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: tk.textDim }}>Expenses covered</div>
      <div style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 30, color, marginTop: 6 }}>
        {r.monthsCovered == null ? '—' : `${r.monthsCovered.toFixed(1)} mo`}
      </div>
      <div style={{ fontFamily: 'var(--font-mono)', fontSize: 12, color: tk.textDim, marginTop: 4 }}>
        {r.hasExpenseData ? `${Math.round(r.pct)}% to 6-month cushion` : 'Log expenses to size it'}
      </div>
    </div>
  );
};

export default EmergencyFundPage;
