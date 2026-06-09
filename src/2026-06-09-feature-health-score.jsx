// Feature (2026-06-09 review): Financial Health Score
//
// What it does: turns the current month's real transactions plus the user's
// savings balance into a single 0–100 "health" number, broken into four
// sub-scores (savings rate, spending vs income, emergency runway, fixed-cost
// load), each with a plain-language tip.
//
// Where it lives: its own "Health" tab, plus a small preview card on the
// Dashboard that links into the tab.
//
// Read-only: it never writes data. All money comes from `transactions` (source
// of truth) and is shown through the context `fmt()` so BRL/USD display works.

import React, { useMemo } from 'react';
import { motion } from 'framer-motion';
import { useAppContext } from './context.jsx';
import {
  monthRangeFor, periodTotals, monthlyExpenseSeries,
  computeHealthScore, scoreBand,
} from './2026-06-09-utils-analytics.js';

const card = (tk) => ({
  background: tk.surface,
  border: `1px solid ${tk.hairline}`,
  borderRadius: 18,
  padding: 24,
  backdropFilter: 'blur(24px)',
  WebkitBackdropFilter: 'blur(24px)',
  boxShadow: tk.isDark ? '0 30px 60px rgba(0,0,0,0.4)' : '0 20px 50px rgba(40,30,20,0.06)',
});

const eyebrow = (tk) => ({
  fontFamily: 'var(--font-mono)', fontSize: 10, letterSpacing: '0.32em',
  textTransform: 'uppercase', color: tk.textDim,
});

const toneColor = (tk, tone) =>
  tone === 'positive' ? tk.positive : tone === 'negative' ? tk.negative : tk.accent;

// Shared computation used by both the page and the Dashboard preview so the
// number is always identical in both places.
const useHealth = () => {
  const { transactions, savingsTotal } = useAppContext();
  return useMemo(() => {
    const cur = monthRangeFor(0);
    const totals = periodTotals(transactions, cur.from, cur.to);
    // Average real monthly expense over the trailing 6 months (for runway).
    const series = monthlyExpenseSeries(transactions, 6);
    const withSpend = series.filter((m) => m.expense > 0);
    const avgMonthlyExpense = withSpend.length
      ? withSpend.reduce((s, m) => s + m.expense, 0) / withSpend.length
      : totals.expense;
    const health = computeHealthScore({
      income: totals.income, expense: totals.expense, fixed: totals.fixed,
      savingsTotal, avgMonthlyExpense,
    });
    return { ...health, totals, avgMonthlyExpense, monthLabel: cur.label };
  }, [transactions, savingsTotal]);
};

// Semicircular gauge drawn as a single SVG arc.
const Gauge = ({ score, color, tk, size = 200 }) => {
  const r = size / 2 - 14;
  const cx = size / 2, cy = size / 2;
  const a0 = Math.PI, a1 = 0; // 180° -> 0°
  const frac = Math.max(0, Math.min(1, score / 100));
  const ang = a0 + (a1 - a0) * frac;
  const pt = (a) => [cx + r * Math.cos(a), cy + r * Math.sin(a)];
  const [sx, sy] = pt(a0);
  const [ex, ey] = pt(a1);
  const [px, py] = pt(ang);
  const arc = (x, y) => `M ${sx} ${sy} A ${r} ${r} 0 0 1 ${x} ${y}`;
  return (
    <svg width={size} height={size / 2 + 18} viewBox={`0 0 ${size} ${size / 2 + 18}`} aria-hidden>
      <path d={arc(ex, ey)} fill="none" stroke={tk.hairline2 || tk.hairline} strokeWidth={12} strokeLinecap="round" />
      <path d={arc(px, py)} fill="none" stroke={color} strokeWidth={12} strokeLinecap="round" />
    </svg>
  );
};

const TIP = {
  savings: (h) => h.savingsRate >= 0.2
    ? 'Strong — you keep a healthy slice of every dollar you earn.'
    : h.savingsRate >= 0.1
      ? 'Okay. Nudging savings toward 20% of income builds a buffer faster.'
      : h.savingsRate >= 0
        ? 'Thin margin. Try to keep at least 10–20% of income unspent.'
        : 'You spent more than you earned this month. Trim a variable category.',
  expense: (h) => h.expenseRatio <= 0.7
    ? 'Spending is comfortably below income.'
    : h.expenseRatio <= 1
      ? 'Spending is close to income — little room for surprises.'
      : 'Spending is above income this month. Look for one cut.',
  runway: (h) => h.runwayMonths >= 6
    ? 'Great cushion — 6+ months of expenses set aside.'
    : h.runwayMonths >= 3
      ? 'Decent cushion. Aim for 6 months for full safety.'
      : 'Light cushion. Building toward 3 months of expenses helps most.',
  fixed: (h) => h.fixedRatio <= 0.3
    ? 'Fixed bills are light and flexible.'
    : h.fixedRatio <= 0.5
      ? 'Fixed bills are moderate.'
      : 'Fixed bills eat a large share of income — hard to flex in a tight month.',
};

const fmtRaw = (p, fmtMoney) => {
  if (p.kind === 'pct') return `${(p.raw * 100).toFixed(0)}%`;
  if (p.kind === 'months') return `${p.raw.toFixed(1)} mo`;
  if (p.kind === 'ratio') return `${(p.raw * 100).toFixed(0)}% of income`;
  return String(p.raw);
};

export const HealthScorePage = () => {
  const { themeTokens: tk, fmt, setView } = useAppContext();
  const h = useHealth();
  const band = scoreBand(h.total);
  const color = toneColor(tk, band.tone);

  return (
    <div style={{ display: 'grid', gap: 24 }}>
      <div style={{ ...card(tk), display: 'grid', gridTemplateColumns: 'minmax(220px, 280px) 1fr', gap: 28, alignItems: 'center' }}>
        <div style={{ display: 'grid', justifyItems: 'center', gap: 4 }}>
          <div style={{ position: 'relative', display: 'grid', justifyItems: 'center' }}>
            <Gauge score={h.total} color={color} tk={tk} />
            <div style={{ position: 'absolute', top: '46%', textAlign: 'center' }}>
              <div style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 56, lineHeight: 1, color: tk.text }}>{h.total}</div>
              <div style={{ fontFamily: 'var(--font-mono)', fontSize: 11, letterSpacing: '0.2em', textTransform: 'uppercase', color, marginTop: 6 }}>{band.label}</div>
            </div>
          </div>
        </div>
        <div>
          <div style={eyebrow(tk)}>Financial Health · {h.monthLabel}</div>
          <div style={{ marginTop: 10, color: tk.textDim, fontSize: 14, lineHeight: 1.5, maxWidth: 560 }}>
            A single read on this month, built only from your real transactions and
            savings balance. It blends how much you keep, how your spending compares
            to income, how long your savings would last, and how heavy your fixed
            bills are. Higher is healthier.
          </div>
          <div style={{ marginTop: 16, display: 'flex', gap: 20, flexWrap: 'wrap', fontFamily: 'var(--font-mono)', fontSize: 12, color: tk.textDim }}>
            <span>Income <b style={{ color: tk.positive }}>{fmt(h.totals.income)}</b></span>
            <span>Spent <b style={{ color: tk.negative }}>{fmt(h.totals.expense)}</b></span>
            <span>Kept <b style={{ color: h.totals.cashflow >= 0 ? tk.positive : tk.negative }}>{fmt(h.totals.cashflow)}</b></span>
          </div>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: 16 }}>
        {h.parts.map((p, i) => {
          const b = scoreBand(p.score);
          const c = toneColor(tk, b.tone);
          return (
            <motion.div key={p.id} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }} style={card(tk)}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
                <div style={eyebrow(tk)}>{p.label}</div>
                <div style={{ fontFamily: 'var(--font-mono)', fontSize: 12, color: c }}>{Math.round(p.score)}/100</div>
              </div>
              <div style={{ marginTop: 12, fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 26, color: tk.text }}>
                {fmtRaw(p, fmt)}
              </div>
              <div style={{ marginTop: 10, height: 6, borderRadius: 999, background: tk.hairline2 || tk.hairline, overflow: 'hidden' }}>
                <div style={{ width: `${Math.round(p.score)}%`, height: '100%', background: c, borderRadius: 999 }} />
              </div>
              <div style={{ marginTop: 12, fontSize: 12.5, lineHeight: 1.5, color: tk.textDim }}>{TIP[p.id](h)}</div>
              <div style={{ marginTop: 8, fontFamily: 'var(--font-mono)', fontSize: 10, letterSpacing: '0.16em', textTransform: 'uppercase', color: tk.textFaint || tk.textDim }}>
                Weight {Math.round(p.weight * 100)}%
              </div>
            </motion.div>
          );
        })}
      </div>

      <div style={{ ...card(tk), display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12 }}>
        <div style={{ color: tk.textDim, fontSize: 13 }}>
          Want to move the needle? The savings rate and spending sub-scores react fastest to changes this month.
        </div>
        <button onClick={() => setView('transactions')} style={{
          background: 'transparent', border: `1px solid ${tk.hairline2 || tk.hairline}`, color: tk.text,
          padding: '8px 16px', borderRadius: 999, fontFamily: 'var(--font-mono)', fontSize: 10,
          letterSpacing: '0.18em', textTransform: 'uppercase', cursor: 'pointer',
        }}>Review transactions →</button>
      </div>
    </div>
  );
};

// Compact Dashboard preview card → clicks into the Health tab.
export const HealthScorePreview = () => {
  const { themeTokens: tk, setView } = useAppContext();
  const h = useHealth();
  const band = scoreBand(h.total);
  const color = toneColor(tk, band.tone);
  return (
    <div onClick={() => setView('health')} className="aurum-card-hover" style={{ ...card(tk), cursor: 'pointer' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
        <div style={eyebrow(tk)}>Financial Health</div>
        <span style={{ fontFamily: 'var(--font-mono)', fontSize: 10, letterSpacing: '0.16em', textTransform: 'uppercase', color: tk.textDim }}>Open →</span>
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
        <Gauge score={h.total} color={color} tk={tk} size={120} />
        <div>
          <div style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 40, lineHeight: 1, color: tk.text }}>{h.total}</div>
          <div style={{ fontFamily: 'var(--font-mono)', fontSize: 11, letterSpacing: '0.18em', textTransform: 'uppercase', color, marginTop: 6 }}>{band.label}</div>
        </div>
      </div>
    </div>
  );
};

export default HealthScorePage;
