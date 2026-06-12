// Feature (2026-06-10 review): Month-End Cash Forecast
//
// What it does: from how much you've already spent this month, it works out a
// simple daily pace and projects where you'll land by month end — then shows
// it alongside last month and any known bills still due.
//
// Where it lives: its own "Forecast" tab + a small Dashboard preview that shows
// the projected month-end spend and links into the tab.
//
// Design note (CLAUDE.md rule #5): this is a single top-level CASH run-rate, not
// a per-category model, so it stays clearly separate from the Category
// Projection Calculator. Actual / projected / combined are labelled distinctly.
//
// Read-only. All money from `transactions` + known dues; shown via `fmt()`.

import React, { useMemo } from 'react';
import { motion } from 'framer-motion';
import { useAppContext } from './context.jsx';
import { monthForecast } from './2026-06-10-utils-forecast.js';

const card = (tk) => ({
  background: tk.surface, border: `1px solid ${tk.hairline}`, borderRadius: 18, padding: 24,
  backdropFilter: 'blur(24px)', WebkitBackdropFilter: 'blur(24px)',
  boxShadow: tk.isDark ? '0 30px 60px rgba(0,0,0,0.4)' : '0 20px 50px rgba(40,30,20,0.06)',
});
const eyebrow = (tk) => ({
  fontFamily: 'var(--font-mono)', fontSize: 10, letterSpacing: '0.32em',
  textTransform: 'uppercase', color: tk.textDim,
});

const useForecast = () => {
  const { transactions, upcomingDues } = useAppContext();
  return useMemo(() => {
    const dues = upcomingDues ? upcomingDues(31) : [];
    return monthForecast(transactions, dues);
  }, [transactions, upcomingDues]);
};

const Stat = ({ tk, label, value, color, sub }) => (
  <div>
    <div style={eyebrow(tk)}>{label}</div>
    <div style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 30, color: color || tk.text, marginTop: 8 }}>{value}</div>
    {sub && <div style={{ fontFamily: 'var(--font-mono)', fontSize: 12, color: tk.textDim, marginTop: 4 }}>{sub}</div>}
  </div>
);

export const CashForecastPage = () => {
  const { themeTokens: tk, fmt, setView } = useAppContext();
  const f = useForecast();
  const paceColor = f.vsLastMonthPct == null ? tk.text
    : f.vsLastMonthPct > 5 ? tk.negative : f.vsLastMonthPct < -5 ? tk.positive : tk.text;
  const netColor = f.combined.monthNet >= 0 ? tk.positive : tk.negative;

  return (
    <div style={{ display: 'grid', gap: 24 }}>
      {/* Headline projection */}
      <div style={{ ...card(tk), display: 'grid', gridTemplateColumns: 'minmax(220px, 300px) 1fr', gap: 28, alignItems: 'center' }}>
        <div>
          <div style={eyebrow(tk)}>Projected month-end spend · {f.monthLabel}</div>
          <div style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 52, lineHeight: 1, color: paceColor, marginTop: 10 }}>
            {fmt(f.combined.monthExpense)}
          </div>
          <div style={{ fontFamily: 'var(--font-mono)', fontSize: 12, color: paceColor, marginTop: 8 }}>
            {f.vsLastMonthPct == null ? 'No last-month spend to compare'
              : `${f.vsLastMonthPct >= 0 ? '▲' : '▼'} ${Math.abs(f.vsLastMonthPct).toFixed(0)}% vs last month`}
          </div>
        </div>
        <div>
          <div style={{ color: tk.textDim, fontSize: 14, lineHeight: 1.5, maxWidth: 560 }}>
            You're <b style={{ color: tk.text }}>{Math.round(f.progress * 100)}%</b> through {f.monthLabel}
            ({f.daysElapsed} of {f.daysInMonth} days). At your current pace of
            <b style={{ color: tk.text }}> {fmt(f.dailyPace)}/day</b>, spending should reach the figure on the left by month end.
          </div>
          <div style={{ marginTop: 16, height: 8, borderRadius: 999, background: tk.hairline2 || tk.hairline, overflow: 'hidden' }}>
            <div style={{ width: `${Math.round(f.progress * 100)}%`, height: '100%', background: tk.accent, borderRadius: 999 }} />
          </div>
        </div>
      </div>

      {/* Actual vs projected vs combined — kept clearly separate (rule #5) */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 16 }}>
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} style={card(tk)}>
          <Stat tk={tk} label="Actual so far" value={fmt(f.actual.expense)} color={tk.negative}
            sub={`Income ${fmt(f.actual.income)} · Net ${fmt(f.actual.net)}`} />
        </motion.div>
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }} style={card(tk)}>
          <Stat tk={tk} label={`Projected (next ${f.daysRemaining} days)`} value={fmt(f.projected.remainingSpend)} color={tk.accent}
            sub={`Run-rate estimate of remaining spend`} />
        </motion.div>
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} style={card(tk)}>
          <Stat tk={tk} label="Combined month-end net" value={fmt(f.combined.monthNet)} color={netColor}
            sub={`Income so far − projected spend`} />
        </motion.div>
      </div>

      {/* Known bills still due — informational, never silently added on top */}
      <div style={card(tk)}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 14 }}>
          <div style={eyebrow(tk)}>Known bills still due this month</div>
          <div style={{ fontFamily: 'var(--font-mono)', fontSize: 13, color: tk.text }}>{fmt(f.knownDuesTotal)}</div>
        </div>
        {f.knownDues.length === 0 ? (
          <div style={{ color: tk.textDim, fontSize: 13 }}>No financing, recurring, or reminder bills are scheduled before month end.</div>
        ) : (
          <div style={{ display: 'grid', gap: 2 }}>
            {f.knownDues.map((d, i) => (
              <div key={`${d.kind}-${i}`} style={{ display: 'grid', gridTemplateColumns: '90px 1fr auto', gap: 12, alignItems: 'center', padding: '10px 0', borderBottom: `1px solid ${tk.hairline}` }}>
                <span style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: tk.textDim }}>
                  {new Date(d.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                </span>
                <span style={{ color: tk.text, fontSize: 13 }}>{d.label || d.kind}</span>
                <span style={{ fontFamily: 'var(--font-mono)', fontSize: 13, color: tk.negative }}>{fmt(d.amount)}</span>
              </div>
            ))}
          </div>
        )}
        <div style={{ marginTop: 14, fontSize: 12, color: tk.textFaint || tk.textDim, lineHeight: 1.5 }}>
          These are scheduled bills shown for context. The run-rate projection above is a
          simple daily-pace estimate and may already include some of them — they are listed
          separately rather than double-counted.
        </div>
      </div>

      <div style={{ ...card(tk), display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12 }}>
        <div style={{ color: tk.textDim, fontSize: 13 }}>Want a per-category view of where the month is heading?</div>
        <button onClick={() => setView('planning')} style={{
          background: 'transparent', border: `1px solid ${tk.hairline2 || tk.hairline}`, color: tk.text,
          padding: '8px 16px', borderRadius: 999, fontFamily: 'var(--font-mono)', fontSize: 10,
          letterSpacing: '0.18em', textTransform: 'uppercase', cursor: 'pointer',
        }}>Open planning →</button>
      </div>
    </div>
  );
};

export const CashForecastPreview = () => {
  const { themeTokens: tk, fmt, setView } = useAppContext();
  const f = useForecast();
  const paceColor = f.vsLastMonthPct == null ? tk.text
    : f.vsLastMonthPct > 5 ? tk.negative : f.vsLastMonthPct < -5 ? tk.positive : tk.text;
  return (
    <div onClick={() => setView('forecast')} className="aurum-card-hover" style={{ ...card(tk), cursor: 'pointer' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
        <div style={eyebrow(tk)}>Month-End Forecast</div>
        <span style={{ fontFamily: 'var(--font-mono)', fontSize: 10, letterSpacing: '0.16em', textTransform: 'uppercase', color: tk.textDim }}>Open →</span>
      </div>
      <div style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: tk.textDim }}>Projected spend · {f.monthLabel}</div>
      <div style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 32, color: paceColor, marginTop: 6 }}>{fmt(f.combined.monthExpense)}</div>
      <div style={{ fontFamily: 'var(--font-mono)', fontSize: 12, color: tk.textDim, marginTop: 4 }}>
        {Math.round(f.progress * 100)}% of month · {fmt(f.dailyPace)}/day
      </div>
      <div style={{ marginTop: 12, height: 6, borderRadius: 999, background: tk.hairline2 || tk.hairline, overflow: 'hidden' }}>
        <div style={{ width: `${Math.round(f.progress * 100)}%`, height: '100%', background: tk.accent, borderRadius: 999 }} />
      </div>
    </div>
  );
};

export default CashForecastPage;
