// Feature (2026-06-11 review): Budgets — Budget vs Actual
//
// What it does: for every category that has a budget limit set, shows how much
// of this month's limit is already spent (actual) and a separate run-rate
// projection of where the month will land — so an over-budget month is visible
// early. Totals row sums all budgets. Status colours: over / at-risk / warn / ok.
//
// Where it lives: its own "Budgets" tab + a small Dashboard preview that shows
// how many categories are over / at risk and links into the tab.
//
// Read-only. The budgets themselves are still created/edited on the Planning
// tab; this tab only reads `budgets` + `transactions` and never writes.

import React, { useMemo } from 'react';
import { motion } from 'framer-motion';
import { useAppContext } from './context.jsx';
import { budgetReport } from './2026-06-11-utils-insights.js';

const card = (tk) => ({
  background: tk.surface, border: `1px solid ${tk.hairline}`, borderRadius: 18, padding: 24,
  backdropFilter: 'blur(24px)', WebkitBackdropFilter: 'blur(24px)',
  boxShadow: tk.isDark ? '0 30px 60px rgba(0,0,0,0.4)' : '0 20px 50px rgba(40,30,20,0.06)',
});
const eyebrow = (tk) => ({
  fontFamily: 'var(--font-mono)', fontSize: 10, letterSpacing: '0.32em',
  textTransform: 'uppercase', color: tk.textDim,
});

// Map a budget-row status to a token colour.
const statusColor = (tk, status) => {
  if (status === 'over') return tk.negative;
  if (status === 'at-risk') return tk.negative;
  if (status === 'warn') return tk.accent;
  return tk.positive || tk.accent;
};
const statusLabel = (status) => {
  if (status === 'over') return 'Over budget';
  if (status === 'at-risk') return 'On track to bust';
  if (status === 'warn') return 'Getting close';
  return 'On track';
};

const useBudgets = () => {
  const { transactions, budgets } = useAppContext();
  return useMemo(() => budgetReport(transactions, budgets), [transactions, budgets]);
};

export const BudgetsPage = () => {
  const { themeTokens: tk, fmt, getCategoryColor, setView } = useAppContext();
  const r = useBudgets();

  return (
    <div style={{ display: 'grid', gap: 24 }}>
      {/* Summary row */}
      <div style={{ ...card(tk), display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 16, alignItems: 'center' }}>
        <div>
          <div style={eyebrow(tk)}>Budgeted ({r.monthLabel})</div>
          <div style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 28, color: tk.text, marginTop: 8 }}>{fmt(r.totalLimit)}</div>
        </div>
        <div>
          <div style={eyebrow(tk)}>Spent so far</div>
          <div style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 28, color: tk.text, marginTop: 8 }}>{fmt(r.totalSpent)}</div>
          <div style={{ fontFamily: 'var(--font-mono)', fontSize: 12, color: tk.textDim, marginTop: 4 }}>{r.totalPct.toFixed(0)}% of budget</div>
        </div>
        <div>
          <div style={eyebrow(tk)}>Projected month-end</div>
          <div style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 28, color: r.totalProjected > r.totalLimit ? tk.negative : tk.text, marginTop: 8 }}>{fmt(r.totalProjected)}</div>
          <div style={{ fontFamily: 'var(--font-mono)', fontSize: 12, color: tk.textDim, marginTop: 4 }}>run-rate · day {r.dayOfMonth}/{r.daysInMonth}</div>
        </div>
        <div>
          <div style={eyebrow(tk)}>Left to spend</div>
          <div style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 28, color: r.totalRemaining < 0 ? tk.negative : (tk.positive || tk.text), marginTop: 8 }}>{fmt(r.totalRemaining)}</div>
          <div style={{ fontFamily: 'var(--font-mono)', fontSize: 12, color: tk.textDim, marginTop: 4 }}>{r.overCount} over · {r.atRiskCount} at risk</div>
        </div>
      </div>

      {!r.hasBudgets ? (
        <div style={{ ...card(tk), color: tk.textDim, fontSize: 14, lineHeight: 1.6 }}>
          No budgets set yet. Add a monthly limit to any category on the{' '}
          <button onClick={() => setView('planning')} style={{ background: 'none', border: 'none', color: tk.accent, cursor: 'pointer', padding: 0, font: 'inherit', textDecoration: 'underline' }}>Planning</button>{' '}
          tab and it will show up here with live spend tracking.
        </div>
      ) : (
        <div style={{ ...card(tk), display: 'grid', gap: 18 }}>
          <div style={eyebrow(tk)}>Per-category this month</div>
          {r.rows.map((row, i) => {
            const accent = getCategoryColor ? getCategoryColor(row.category) : tk.accent;
            const sColor = statusColor(tk, row.status);
            const usedFrac = Math.min(1, row.limit > 0 ? row.spent / row.limit : 0);
            const projFrac = Math.min(1.4, row.limit > 0 ? row.projected / row.limit : 0);
            return (
              <motion.div key={row.category} initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.03 }}
                style={{ display: 'grid', gap: 8 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: 12 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, minWidth: 0 }}>
                    <span style={{ width: 9, height: 9, borderRadius: '50%', background: accent, flexShrink: 0 }} />
                    <span style={{ fontFamily: 'var(--font-body)', fontSize: 14, color: tk.text, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{row.category}</span>
                  </div>
                  <span style={{ fontFamily: 'var(--font-mono)', fontSize: 12, color: tk.textDim, flexShrink: 0 }}>
                    {fmt(row.spent)} <span style={{ opacity: 0.6 }}>/ {fmt(row.limit)}</span>
                  </span>
                </div>
                {/* Track with actual fill + a projected marker. */}
                <div style={{ position: 'relative', height: 10, borderRadius: 999, background: tk.hairline2 || tk.hairline, overflow: 'hidden' }}>
                  <div style={{ width: `${usedFrac * 100}%`, height: '100%', background: sColor, borderRadius: 999, transition: 'width 320ms' }} />
                  {projFrac > usedFrac && row.status !== 'over' && (
                    <div title="Projected month-end" style={{ position: 'absolute', top: -2, bottom: -2, left: `calc(${Math.min(100, projFrac * 100)}% - 1px)`, width: 2, background: tk.text, opacity: 0.55 }} />
                  )}
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontFamily: 'var(--font-mono)', fontSize: 11 }}>
                  <span style={{ color: sColor }}>{statusLabel(row.status)}</span>
                  <span style={{ color: tk.textFaint || tk.textDim }}>proj {fmt(row.projected)} ({row.projectedPct.toFixed(0)}%)</span>
                </div>
              </motion.div>
            );
          })}
        </div>
      )}

      <div style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: tk.textFaint || tk.textDim, lineHeight: 1.6 }}>
        Actual = real expenses recorded this month (Savings excluded). Projected = a
        simple daily run-rate to month-end, shown separately from actual — it is an
        estimate, not recorded spend.
      </div>
    </div>
  );
};

export const BudgetsPreview = () => {
  const { themeTokens: tk, fmt, setView } = useAppContext();
  const r = useBudgets();
  const alert = r.overCount + r.atRiskCount;
  return (
    <div onClick={() => setView('budgets')} className="aurum-card-hover" style={{ ...card(tk), cursor: 'pointer' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
        <div style={eyebrow(tk)}>Budgets</div>
        <span style={{ fontFamily: 'var(--font-mono)', fontSize: 10, letterSpacing: '0.16em', textTransform: 'uppercase', color: tk.textDim }}>Open →</span>
      </div>
      {r.hasBudgets ? (
        <>
          <div style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: tk.textDim }}>Spent of budget · {r.monthLabel}</div>
          <div style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 26, color: r.totalSpent > r.totalLimit ? tk.negative : tk.text, marginTop: 6 }}>
            {r.totalPct.toFixed(0)}%
          </div>
          <div style={{ height: 8, borderRadius: 999, background: tk.hairline2 || tk.hairline, overflow: 'hidden', marginTop: 12 }}>
            <div style={{ width: `${Math.min(100, r.totalPct)}%`, height: '100%', background: r.totalSpent > r.totalLimit ? tk.negative : (tk.positive || tk.accent), borderRadius: 999 }} />
          </div>
          <div style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: alert > 0 ? tk.negative : tk.textDim, marginTop: 10 }}>
            {alert > 0 ? `${alert} categor${alert === 1 ? 'y' : 'ies'} need attention` : 'All categories on track'}
          </div>
        </>
      ) : (
        <div style={{ color: tk.textDim, fontSize: 13 }}>Set category limits on Planning to track budgets here.</div>
      )}
    </div>
  );
};

export default BudgetsPage;
