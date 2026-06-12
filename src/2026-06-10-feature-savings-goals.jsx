// Feature (2026-06-10 review): Savings Goals Tracker
//
// What it does: shows every savings goal as a progress ring with allocated vs
// target, and projects when each goal will be funded based on your recent
// monthly savings pace. If no per-goal list exists yet, it falls back to the
// app's single overall savings goal so the tab is never empty.
//
// Where it lives: its own "Goals" tab + a small Dashboard preview showing the
// nearest goal's progress and links into the tab.
//
// Read-only: it reads existing goals + Savings rows; it never writes data.
// Money shown via context `fmt()` so BRL/USD display keeps working.

import React, { useMemo } from 'react';
import { motion } from 'framer-motion';
import { useAppContext } from './context.jsx';
import { monthlySavingsPace, goalForecast } from './2026-06-10-utils-forecast.js';

const card = (tk) => ({
  background: tk.surface, border: `1px solid ${tk.hairline}`, borderRadius: 18, padding: 24,
  backdropFilter: 'blur(24px)', WebkitBackdropFilter: 'blur(24px)',
  boxShadow: tk.isDark ? '0 30px 60px rgba(0,0,0,0.4)' : '0 20px 50px rgba(40,30,20,0.06)',
});
const eyebrow = (tk) => ({
  fontFamily: 'var(--font-mono)', fontSize: 10, letterSpacing: '0.32em',
  textTransform: 'uppercase', color: tk.textDim,
});

// Circular progress ring drawn as two SVG circles.
const Ring = ({ pct, color, tk, size = 110, stroke = 9 }) => {
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const off = c * (1 - Math.max(0, Math.min(1, pct / 100)));
  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} aria-hidden>
      <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={tk.hairline2 || tk.hairline} strokeWidth={stroke} />
      <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={color} strokeWidth={stroke} strokeLinecap="round"
        strokeDasharray={c} strokeDashoffset={off} transform={`rotate(-90 ${size / 2} ${size / 2})`} />
    </svg>
  );
};

// Build the goal list (per-goal if present, else the one overall savings goal).
const useGoals = () => {
  const { goals, transactions, savingsTotal, goalAmount } = useAppContext();
  return useMemo(() => {
    const pace = monthlySavingsPace(transactions, 3);
    let list = (goals || []).map((g) => ({
      id: g.id, name: g.name || 'Goal',
      allocated: Number(g.allocated) || 0, target: Number(g.target) || 0, due: g.due,
    }));
    if (list.length === 0 && (Number(goalAmount) || 0) > 0) {
      list = [{ id: 'overall', name: 'Overall savings goal', allocated: Number(savingsTotal) || 0, target: Number(goalAmount) || 0 }];
    }
    const rows = list.map((g) => ({ ...g, fc: goalForecast(g, pace) }));
    rows.sort((a, b) => {
      const am = a.fc.monthsToFund, bm = b.fc.monthsToFund;
      if (am == null && bm == null) return b.fc.pct - a.fc.pct;
      if (am == null) return 1; if (bm == null) return -1;
      return am - bm;
    });
    const totalAllocated = rows.reduce((s, g) => s + g.allocated, 0);
    const totalTarget = rows.reduce((s, g) => s + g.target, 0);
    return { rows, pace, totalAllocated, totalTarget };
  }, [goals, transactions, savingsTotal, goalAmount]);
};

export const SavingsGoalsPage = () => {
  const { themeTokens: tk, fmt, setView } = useAppContext();
  const g = useGoals();
  const overallPct = g.totalTarget > 0 ? Math.min(100, g.totalAllocated / g.totalTarget * 100) : 0;

  return (
    <div style={{ display: 'grid', gap: 24 }}>
      <div style={{ ...card(tk), display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 16 }}>
        <div>
          <div style={eyebrow(tk)}>Saved toward goals</div>
          <div style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 30, color: tk.text, marginTop: 8 }}>{fmt(g.totalAllocated)}</div>
          <div style={{ fontFamily: 'var(--font-mono)', fontSize: 12, color: tk.textDim, marginTop: 4 }}>of {fmt(g.totalTarget)} target · {overallPct.toFixed(0)}%</div>
        </div>
        <div>
          <div style={eyebrow(tk)}>Recent savings pace</div>
          <div style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 30, color: g.pace >= 0 ? tk.positive : tk.negative, marginTop: 8 }}>
            {g.pace >= 0 ? '+' : '−'}{fmt(Math.abs(g.pace))}
          </div>
          <div style={{ fontFamily: 'var(--font-mono)', fontSize: 12, color: tk.textDim, marginTop: 4 }}>per month · last 3 months</div>
        </div>
        <div>
          <div style={eyebrow(tk)}>Active goals</div>
          <div style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 30, color: tk.text, marginTop: 8 }}>{g.rows.length}</div>
          <div style={{ fontFamily: 'var(--font-mono)', fontSize: 12, color: tk.textDim, marginTop: 4 }}>being tracked</div>
        </div>
      </div>

      {g.rows.length === 0 ? (
        <div style={{ ...card(tk), color: tk.textDim, fontSize: 14 }}>
          No savings goals yet. Add one in Planning and it will show up here with a
          progress ring and a projected funding date.
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 16 }}>
          {g.rows.map((row, i) => {
            const fc = row.fc;
            const color = fc.pct >= 100 ? tk.positive : fc.pct >= 50 ? tk.accent : tk.textDim;
            return (
              <motion.div key={row.id} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: Math.min(i * 0.05, 0.4) }} style={card(tk)}>
                <div style={{ display: 'flex', gap: 18, alignItems: 'center' }}>
                  <div style={{ position: 'relative', display: 'grid', placeItems: 'center' }}>
                    <Ring pct={fc.pct} color={color} tk={tk} />
                    <div style={{ position: 'absolute', fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 20, color: tk.text }}>{fc.pct.toFixed(0)}%</div>
                  </div>
                  <div style={{ minWidth: 0 }}>
                    <div style={{ color: tk.text, fontSize: 16, fontWeight: 600, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{row.name}</div>
                    <div style={{ fontFamily: 'var(--font-mono)', fontSize: 12, color: tk.textDim, marginTop: 6 }}>{fmt(row.allocated)} / {fmt(row.target)}</div>
                    <div style={{ fontFamily: 'var(--font-mono)', fontSize: 12, color: tk.textDim, marginTop: 2 }}>{fmt(fc.remaining)} to go</div>
                    <div style={{ fontFamily: 'var(--font-mono)', fontSize: 12, color: fc.etaLabel ? tk.accent : tk.textFaint || tk.textDim, marginTop: 6 }}>
                      {fc.etaLabel === 'Funded' ? '✓ Funded'
                        : fc.etaLabel ? `≈ funded ${fc.etaLabel} (${fc.monthsToFund} mo)`
                          : 'Add to savings to set a pace'}
                    </div>
                  </div>
                </div>
              </motion.div>
            );
          })}
        </div>
      )}

      <div style={{ ...card(tk), display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12 }}>
        <div style={{ color: tk.textDim, fontSize: 13 }}>Funding dates assume your last-3-month savings pace holds steady.</div>
        <button onClick={() => setView('planning')} style={{
          background: 'transparent', border: `1px solid ${tk.hairline2 || tk.hairline}`, color: tk.text,
          padding: '8px 16px', borderRadius: 999, fontFamily: 'var(--font-mono)', fontSize: 10,
          letterSpacing: '0.18em', textTransform: 'uppercase', cursor: 'pointer',
        }}>Manage goals →</button>
      </div>
    </div>
  );
};

export const SavingsGoalsPreview = () => {
  const { themeTokens: tk, fmt, setView } = useAppContext();
  const g = useGoals();
  const nearest = g.rows[0];
  const color = nearest ? (nearest.fc.pct >= 100 ? tk.positive : nearest.fc.pct >= 50 ? tk.accent : tk.textDim) : tk.textDim;
  return (
    <div onClick={() => setView('goals')} className="aurum-card-hover" style={{ ...card(tk), cursor: 'pointer' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
        <div style={eyebrow(tk)}>Savings Goals</div>
        <span style={{ fontFamily: 'var(--font-mono)', fontSize: 10, letterSpacing: '0.16em', textTransform: 'uppercase', color: tk.textDim }}>Open →</span>
      </div>
      {nearest ? (
        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          <div style={{ position: 'relative', display: 'grid', placeItems: 'center' }}>
            <Ring pct={nearest.fc.pct} color={color} tk={tk} size={84} stroke={8} />
            <div style={{ position: 'absolute', fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 16, color: tk.text }}>{nearest.fc.pct.toFixed(0)}%</div>
          </div>
          <div style={{ minWidth: 0 }}>
            <div style={{ color: tk.text, fontSize: 15, fontWeight: 600, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{nearest.name}</div>
            <div style={{ fontFamily: 'var(--font-mono)', fontSize: 12, color: tk.textDim, marginTop: 4 }}>{fmt(nearest.allocated)} / {fmt(nearest.target)}</div>
            <div style={{ fontFamily: 'var(--font-mono)', fontSize: 12, color: nearest.fc.etaLabel ? tk.accent : tk.textDim, marginTop: 2 }}>
              {nearest.fc.etaLabel === 'Funded' ? '✓ Funded' : nearest.fc.etaLabel ? `≈ ${nearest.fc.etaLabel}` : 'No pace yet'}
            </div>
          </div>
        </div>
      ) : (
        <div style={{ color: tk.textDim, fontSize: 13 }}>Add a savings goal in Planning to track it here.</div>
      )}
    </div>
  );
};

export default SavingsGoalsPage;
