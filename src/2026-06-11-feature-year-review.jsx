// Feature (2026-06-11 review, run 2): Year in Review
//
// What it does: the long-horizon view nothing else covers — every other tab
// caps at 6 months. Pick a year and see income / expense / net / savings rate,
// a per-month bar chart, the busiest & lightest months, top categories and top
// merchants of that year, and a fair year-over-year comparison.
//
// Money rules: the current year is summed strictly YEAR TO DATE (future-dated
// rows like pending financing instalments are excluded from actuals and shown
// separately as "scheduled later this year") and the YoY compare uses the same
// Jan-1-to-today window of the prior year, so it's apples to apples.
//
// Where it lives: its own "Yearly" tab + a small Dashboard preview linking in.
// Read-only — it writes nothing. Money shown via `fmt()`.

import React, { useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import { useAppContext } from './context.jsx';
import { availableYears, yearSummary } from './2026-06-11-utils-yearly-compare-alerts.js';

const card = (tk) => ({
  background: tk.surface, border: `1px solid ${tk.hairline}`, borderRadius: 18, padding: 24,
  backdropFilter: 'blur(24px)', WebkitBackdropFilter: 'blur(24px)',
  boxShadow: tk.isDark ? '0 30px 60px rgba(0,0,0,0.4)' : '0 20px 50px rgba(40,30,20,0.06)',
});
const eyebrow = (tk) => ({
  fontFamily: 'var(--font-mono)', fontSize: 10, letterSpacing: '0.32em',
  textTransform: 'uppercase', color: tk.textDim,
});

const Pct = ({ value, tk, invert = false }) => {
  if (value == null || !isFinite(value)) return null;
  const good = invert ? value <= 0 : value >= 0;
  return (
    <span style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: good ? tk.positive : tk.negative }}>
      {value >= 0 ? '+' : ''}{value.toFixed(1)}%
    </span>
  );
};

const useYearReview = (year) => {
  const { transactions } = useAppContext();
  return useMemo(() => yearSummary(transactions, year), [transactions, year]);
};

export const YearReviewPage = () => {
  const { themeTokens: tk, fmt, transactions, getCategoryColor } = useAppContext();
  const years = useMemo(() => availableYears(transactions), [transactions]);
  const [year, setYear] = useState(years[0]);
  const s = useYearReview(year);

  const maxBar = Math.max(1, ...s.months.map((m) => Math.max(m.income, m.expense)));

  return (
    <div style={{ display: 'grid', gap: 24 }}>
      {/* Year selector + headline totals */}
      <div style={{ ...card(tk), display: 'grid', gap: 18 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12 }}>
          <div style={eyebrow(tk)}>Year in Review {s.isCurrent ? '· year to date' : ''}</div>
          <div style={{ display: 'inline-flex', borderRadius: 999, overflow: 'hidden', border: `1px solid ${tk.hairline2 || tk.hairline}` }}>
            {years.map((y) => {
              const active = y === year;
              return (
                <button key={y} onClick={() => setYear(y)} style={{
                  padding: '6px 14px', border: 'none', cursor: 'pointer',
                  background: active ? tk.accent : 'transparent',
                  color: active ? (tk.isDark ? '#0B0B0D' : '#fff') : tk.textDim,
                  fontFamily: 'var(--font-mono)', fontSize: 10, letterSpacing: '0.16em',
                }}>{y}</button>
              );
            })}
          </div>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(170px, 1fr))', gap: 16 }}>
          <div>
            <div style={eyebrow(tk)}>Income</div>
            <div style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 26, color: tk.positive, marginTop: 8 }}>{fmt(s.totals.income)}</div>
            {s.yoy.hasPrior && <Pct value={s.yoy.incomePct} tk={tk} />}
          </div>
          <div>
            <div style={eyebrow(tk)}>Spending</div>
            <div style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 26, color: tk.negative, marginTop: 8 }}>{fmt(s.totals.expense)}</div>
            {s.yoy.hasPrior && <Pct value={s.yoy.expensePct} tk={tk} invert />}
          </div>
          <div>
            <div style={eyebrow(tk)}>Net</div>
            <div style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 26, color: s.totals.net >= 0 ? tk.positive : tk.negative, marginTop: 8 }}>{fmt(s.totals.net)}</div>
            <span style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: tk.textDim }}>savings rate {s.totals.savingsRate.toFixed(1)}%</span>
          </div>
          <div>
            <div style={eyebrow(tk)}>Avg / month</div>
            <div style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 26, color: tk.text, marginTop: 8 }}>{fmt(s.avgMonthlyExpense)}</div>
            <span style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: tk.textDim }}>over {s.monthsElapsed} month{s.monthsElapsed === 1 ? '' : 's'}</span>
          </div>
        </div>
        {s.yoy.hasPrior && (
          <div style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: tk.textDim }}>
            vs same period {year - 1}: income {fmt(s.yoy.prevIncome)} · spending {fmt(s.yoy.prevExpense)} · net {fmt(s.yoy.prevNet)}
          </div>
        )}
        {s.isCurrent && s.scheduledRest > 0 && (
          <div style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: tk.textDim }}>
            Scheduled later this year (not counted above): {fmt(s.scheduledRest)}
          </div>
        )}
      </div>

      {/* Month-by-month bars */}
      <div style={card(tk)}>
        <div style={{ ...eyebrow(tk), marginBottom: 16 }}>Month by month</div>
        <div style={{ display: 'grid', gridTemplateColumns: `repeat(${s.months.length}, 1fr)`, gap: 8, alignItems: 'end', height: 150 }}>
          {s.months.map((m) => (
            <div key={m.monthIndex} title={`${m.label}: income ${fmt(m.income)} · spending ${fmt(m.expense)}`}
              style={{ display: 'flex', gap: 3, alignItems: 'flex-end', justifyContent: 'center', height: '100%' }}>
              <motion.div initial={{ height: 0 }} animate={{ height: `${Math.max(2, (m.income / maxBar) * 100)}%` }} transition={{ duration: 0.5 }}
                style={{ width: '38%', borderRadius: 4, background: tk.positive, opacity: 0.75 }} />
              <motion.div initial={{ height: 0 }} animate={{ height: `${Math.max(2, (m.expense / maxBar) * 100)}%` }} transition={{ duration: 0.5, delay: 0.05 }}
                style={{ width: '38%', borderRadius: 4, background: tk.negative, opacity: 0.9 }} />
            </div>
          ))}
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: `repeat(${s.months.length}, 1fr)`, gap: 8, marginTop: 8 }}>
          {s.months.map((m) => (
            <div key={m.monthIndex} style={{ textAlign: 'center', fontFamily: 'var(--font-mono)', fontSize: 10, color: tk.textDim }}>{m.label}</div>
          ))}
        </div>
        <div style={{ display: 'flex', gap: 18, marginTop: 14, fontFamily: 'var(--font-mono)', fontSize: 11, color: tk.textDim, flexWrap: 'wrap' }}>
          <span><span style={{ display: 'inline-block', width: 9, height: 9, borderRadius: 2, background: tk.positive, opacity: 0.75, marginRight: 6 }} />Income</span>
          <span><span style={{ display: 'inline-block', width: 9, height: 9, borderRadius: 2, background: tk.negative, opacity: 0.9, marginRight: 6 }} />Spending</span>
          {s.busiestMonth && <span>Busiest: {s.busiestMonth.label} ({fmt(s.busiestMonth.expense)})</span>}
          {s.lightestMonth && <span>Lightest: {s.lightestMonth.label} ({fmt(s.lightestMonth.expense)})</span>}
        </div>
      </div>

      {/* Top categories + top merchants */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: 24 }}>
        <div style={card(tk)}>
          <div style={{ ...eyebrow(tk), marginBottom: 14 }}>Top categories</div>
          {s.topCategories.length === 0 && <div style={{ color: tk.textDim, fontSize: 13 }}>No spending recorded in {year}.</div>}
          {s.topCategories.slice(0, 8).map((c, i) => (
            <div key={c.category} style={{ marginBottom: 12 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, marginBottom: 4 }}>
                <span style={{ color: tk.text, display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span style={{ width: 9, height: 9, borderRadius: '50%', background: getCategoryColor(c.category), flexShrink: 0 }} />
                  {c.category}
                </span>
                <span style={{ fontFamily: 'var(--font-mono)', color: tk.text }}>{fmt(c.total)}</span>
              </div>
              <div style={{ height: 6, borderRadius: 3, background: tk.hairline, overflow: 'hidden' }}>
                <motion.div initial={{ width: 0 }} animate={{ width: `${c.share}%` }} transition={{ duration: 0.5, delay: i * 0.04 }}
                  style={{ height: '100%', borderRadius: 3, background: getCategoryColor(c.category) }} />
              </div>
            </div>
          ))}
        </div>
        <div style={card(tk)}>
          <div style={{ ...eyebrow(tk), marginBottom: 14 }}>Top merchants</div>
          {s.topMerchants.length === 0 && <div style={{ color: tk.textDim, fontSize: 13 }}>No merchants recorded in {year}.</div>}
          {s.topMerchants.slice(0, 8).map((m) => (
            <div key={m.key} style={{ display: 'grid', gridTemplateColumns: '1fr auto', gap: 12, padding: '8px 0', borderBottom: `1px solid ${tk.hairline}` }}>
              <div style={{ minWidth: 0 }}>
                <div style={{ fontSize: 14, color: tk.text, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{m.name}</div>
                <div style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: tk.textDim }}>{m.count}× · avg {fmt(m.avg)}</div>
              </div>
              <span style={{ fontFamily: 'var(--font-mono)', fontSize: 13, color: tk.text, alignSelf: 'center' }}>{fmt(m.total)}</span>
            </div>
          ))}
        </div>
      </div>

      <div style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: tk.textFaint || tk.textDim, lineHeight: 1.6 }}>
        Real transactions only — Savings rows are set-aside money and are excluded.
        The current year is summed up to today; committed future instalments are
        listed separately, never mixed into actuals.
      </div>
    </div>
  );
};

export const YearReviewPreview = () => {
  const { themeTokens: tk, fmt, setView, transactions } = useAppContext();
  const year = new Date().getFullYear();
  const s = useYearReview(year);
  const maxBar = Math.max(1, ...s.months.map((m) => m.expense));
  return (
    <div onClick={() => setView('yearly')} className="aurum-card-hover" style={{ ...card(tk), cursor: 'pointer' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
        <div style={eyebrow(tk)}>Year in Review</div>
        <span style={{ fontFamily: 'var(--font-mono)', fontSize: 10, letterSpacing: '0.16em', textTransform: 'uppercase', color: tk.textDim }}>Open →</span>
      </div>
      <div style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: tk.textDim }}>{year} so far · net</div>
      <div style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 26, color: s.totals.net >= 0 ? tk.positive : tk.negative, marginTop: 6 }}>{fmt(s.totals.net)}</div>
      <div style={{ display: 'flex', gap: 3, alignItems: 'flex-end', height: 34, marginTop: 12 }}>
        {s.months.map((m) => (
          <div key={m.monthIndex} title={`${m.label}: ${fmt(m.expense)}`}
            style={{ flex: 1, height: `${Math.max(6, (m.expense / maxBar) * 100)}%`, borderRadius: 2, background: tk.negative, opacity: 0.55 }} />
        ))}
      </div>
      <div style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: tk.textDim, marginTop: 8 }}>
        in {fmt(s.totals.income)} · out {fmt(s.totals.expense)}
      </div>
    </div>
  );
};

export default YearReviewPage;
