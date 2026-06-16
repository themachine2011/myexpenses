// Feature (2026-06-15 review): Daily Allowance — "safe to spend per day"
//
// What it does: turns "where will the month land?" into a single, actionable
// number — how much you can still spend each day for the rest of this month and
// stay within your income, after setting aside the bills that are still due.
//
// Where it lives: its own "Allowance" tab (Plan group) + a small Dashboard
// preview that shows the daily number and links into the tab.
//
// Design note (CLAUDE.md rules #4 / #5): all numbers come from `allowanceReport`,
// which reuses the Forecast engine (`monthForecast`). It adds NO new projection
// of future income or spend, so it can never disagree with the Forecast tab.
// Two honest income bases (received so far / last month's typical) are offered;
// neither invents future money.
//
// Read-only. All money from `transactions` + known dues; shown via `fmt()`.

import React, { useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import { useAppContext } from './context.jsx';
import { allowanceReport } from './2026-06-15-utils-allowance.js';

const card = (tk) => ({
  background: tk.surface, border: `1px solid ${tk.hairline}`, borderRadius: 18, padding: 24,
  backdropFilter: 'blur(24px)', WebkitBackdropFilter: 'blur(24px)',
  boxShadow: tk.isDark ? '0 30px 60px rgba(0,0,0,0.4)' : '0 20px 50px rgba(40,30,20,0.06)',
});
const eyebrow = (tk) => ({
  fontFamily: 'var(--font-mono)', fontSize: 10, letterSpacing: '0.32em',
  textTransform: 'uppercase', color: tk.textDim,
});

const useAllowance = () => {
  const { transactions, upcomingDues } = useAppContext();
  return useMemo(() => {
    const dues = upcomingDues ? upcomingDues(31) : [];
    return allowanceReport(transactions, dues);
  }, [transactions, upcomingDues]);
};

// Pick the most useful default: a full-month "typical" basis is steadier early
// in the month (before payday), so use it when last month had income.
const defaultBasis = (a) => (a.hasTypical ? 'typical' : 'received');

const Stat = ({ tk, label, value, color, sub }) => (
  <div>
    <div style={eyebrow(tk)}>{label}</div>
    <div style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 26, color: color || tk.text, marginTop: 8 }}>{value}</div>
    {sub && <div style={{ fontFamily: 'var(--font-mono)', fontSize: 12, color: tk.textDim, marginTop: 4 }}>{sub}</div>}
  </div>
);

export const AllowancePage = () => {
  const { themeTokens: tk, fmt, setView } = useAppContext();
  const a = useAllowance();
  const [basis, setBasis] = useState(() => defaultBasis(a));
  const b = basis === 'typical' ? a.typical : a.received;

  const perDayColor = b.negative ? tk.negative : (b.perDay >= a.dailyPace ? tk.positive : tk.text);
  const incomeLabel = basis === 'typical' ? "last month's income" : 'income received so far';

  return (
    <div style={{ display: 'grid', gap: 24 }}>
      {/* Headline: the daily number */}
      <div style={{ ...card(tk), display: 'grid', gridTemplateColumns: 'minmax(220px, 320px) 1fr', gap: 28, alignItems: 'center' }}>
        <div>
          <div style={eyebrow(tk)}>Safe to spend · {a.monthLabel}</div>
          <div style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 52, lineHeight: 1, color: perDayColor, marginTop: 10 }}>
            {fmt(Math.max(0, b.perDay))}<span style={{ fontSize: 22, color: tk.textDim }}> /day</span>
          </div>
          <div style={{ fontFamily: 'var(--font-mono)', fontSize: 12, color: tk.textDim, marginTop: 8 }}>
            {b.negative
              ? `Over budget by ${fmt(Math.abs(b.pool))} on this basis`
              : `${fmt(b.perWeek)} / week · over ${a.daysToSpread} day${a.daysToSpread === 1 ? '' : 's'} left`}
          </div>
        </div>
        <div>
          <div style={{ color: tk.textDim, fontSize: 14, lineHeight: 1.6, maxWidth: 560 }}>
            Based on <b style={{ color: tk.text }}>{incomeLabel}</b>, after taking out what you've
            already spent and the bills still due, you have <b style={{ color: tk.text }}>{fmt(b.pool)}</b> left
            to spend across the rest of {a.monthLabel}.
          </div>
          {/* Income-basis toggle — both options are real money, no forecasting */}
          <div style={{ display: 'inline-flex', marginTop: 16, borderRadius: 999, overflow: 'hidden', border: `1px solid ${tk.hairline2 || tk.hairline}` }}>
            {[{ id: 'typical', label: 'Typical month', on: a.hasTypical }, { id: 'received', label: 'Received so far', on: true }].map((opt) => {
              const active = basis === opt.id;
              return (
                <button key={opt.id} onClick={() => opt.on && setBasis(opt.id)} disabled={!opt.on}
                  title={opt.id === 'typical' ? "Last month's total income" : 'Income received so far this month'}
                  style={{
                    padding: '6px 14px', border: 'none', cursor: opt.on ? 'pointer' : 'not-allowed',
                    background: active ? tk.accent : 'transparent',
                    color: active ? (tk.isDark ? '#0B0B0D' : '#fff') : (opt.on ? tk.textDim : tk.textFaint || tk.textDim),
                    opacity: opt.on ? 1 : 0.5,
                    fontFamily: 'var(--font-mono)', fontSize: 10, letterSpacing: '0.16em', textTransform: 'uppercase',
                  }}>{opt.label}</button>
              );
            })}
          </div>
        </div>
      </div>

      {/* How the pool is built — kept transparent and clearly separated */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 16 }}>
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} style={card(tk)}>
          <Stat tk={tk} label={basis === 'typical' ? 'Income (last month)' : 'Income received'}
            value={fmt(basis === 'typical' ? a.typicalIncome : a.receivedIncome)} color={tk.positive}
            sub={basis === 'typical' ? 'Full prior month' : `This month so far`} />
        </motion.div>
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }} style={card(tk)}>
          <Stat tk={tk} label="Spent so far" value={`− ${fmt(a.spent)}`} color={tk.negative}
            sub={`${a.daysElapsed} of ${a.daysInMonth} days in`} />
        </motion.div>
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} style={card(tk)}>
          <Stat tk={tk} label="Bills still due" value={`− ${fmt(a.dueRemaining)}`} color={tk.negative}
            sub={`Committed before month end`} />
        </motion.div>
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }} style={card(tk)}>
          <Stat tk={tk} label="Left to spend" value={fmt(b.pool)} color={b.negative ? tk.negative : tk.text}
            sub={`Over ${a.daysToSpread} day${a.daysToSpread === 1 ? '' : 's'}`} />
        </motion.div>
      </div>

      {/* Pace check vs the Forecast run-rate (same number as the Forecast tab) */}
      <div style={card(tk)}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 10, flexWrap: 'wrap', gap: 8 }}>
          <div style={eyebrow(tk)}>Your current pace vs this allowance</div>
          <div style={{ fontFamily: 'var(--font-mono)', fontSize: 13, color: tk.text }}>
            {fmt(a.dailyPace)}/day now
          </div>
        </div>
        <div style={{ color: tk.textDim, fontSize: 14, lineHeight: 1.6 }}>
          {b.negative ? (
            <>You've already committed more than {incomeLabel} for {a.monthLabel}. Easing off
            discretionary spend or revisiting the bills above would bring this back to positive.</>
          ) : b.perDay >= a.dailyPace ? (
            <>You're spending about <b style={{ color: tk.text }}>{fmt(a.dailyPace)}/day</b>, which is at or
            under your <b style={{ color: tk.positive }}>{fmt(b.perDay)}/day</b> allowance — on track to finish the month in the green.</>
          ) : (
            <>You're spending about <b style={{ color: tk.text }}>{fmt(a.dailyPace)}/day</b>, a bit above your
            <b style={{ color: tk.negative }}> {fmt(b.perDay)}/day</b> allowance. Trimming roughly
            <b style={{ color: tk.text }}> {fmt(Math.max(0, a.dailyPace - b.perDay))}/day</b> keeps the month on budget.</>
          )}
        </div>
        <div style={{ marginTop: 14, fontSize: 12, color: tk.textFaint || tk.textDim, lineHeight: 1.5 }}>
          Built from the same figures as the Forecast tab. "Typical month" uses last month's total
          income so the daily number is steady before payday; "Received so far" uses only money
          already in this month. Bills still due are set aside, never double-counted.
        </div>
      </div>

      <div style={{ ...card(tk), display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12 }}>
        <div style={{ color: tk.textDim, fontSize: 13 }}>Want the full month-end projection instead?</div>
        <button onClick={() => setView('forecast')} style={{
          background: 'transparent', border: `1px solid ${tk.hairline2 || tk.hairline}`, color: tk.text,
          padding: '8px 16px', borderRadius: 999, fontFamily: 'var(--font-mono)', fontSize: 10,
          letterSpacing: '0.18em', textTransform: 'uppercase', cursor: 'pointer',
        }}>Open forecast →</button>
      </div>
    </div>
  );
};

export const AllowancePreview = () => {
  const { themeTokens: tk, fmt, setView } = useAppContext();
  const a = useAllowance();
  const basis = defaultBasis(a);
  const b = basis === 'typical' ? a.typical : a.received;
  const perDayColor = b.negative ? tk.negative : (b.perDay >= a.dailyPace ? tk.positive : tk.text);
  return (
    <div onClick={() => setView('allowance')} className="aurum-card-hover" style={{ ...card(tk), cursor: 'pointer' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
        <div style={eyebrow(tk)}>Daily Allowance</div>
        <span style={{ fontFamily: 'var(--font-mono)', fontSize: 10, letterSpacing: '0.16em', textTransform: 'uppercase', color: tk.textDim }}>Open →</span>
      </div>
      <div style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: tk.textDim }}>Safe to spend · {a.monthLabel}</div>
      <div style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 32, color: perDayColor, marginTop: 6 }}>
        {fmt(Math.max(0, b.perDay))}<span style={{ fontSize: 15, color: tk.textDim }}> /day</span>
      </div>
      <div style={{ fontFamily: 'var(--font-mono)', fontSize: 12, color: tk.textDim, marginTop: 4 }}>
        {b.negative ? `Over budget on income basis` : `${a.daysToSpread} day${a.daysToSpread === 1 ? '' : 's'} left · ${fmt(b.perWeek)}/wk`}
      </div>
    </div>
  );
};

export default AllowancePage;
