// Feature (2026-06-12 review): Fixed vs Flex
//
// What it does: splits real spending into COMMITTED (locked rows — financing
// instalments, fired recurring bills) and FLEXIBLE (everything you chose to
// spend), per category and over time. Answers "how much of my spending could
// I actually cut?" — the Health tab scores fixed-cost load, but nothing
// showed the split itself.
//
// Where it lives: its own "Fixed/Flex" tab + a small Dashboard preview.
// Read-only. Pure function of `transactions`; money shown via `fmt()`.

import React, { useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import { useAppContext } from './context.jsx';
import { periodRangeFor, monthlyExpenseSeries } from './2026-06-09-utils-analytics.js';
import { fixedFlexReport } from './2026-06-12-utils-week-flex-streaks.js';

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

const PillToggle = ({ options, value, onChange, tk }) => (
  <div style={{ display: 'inline-flex', borderRadius: 999, overflow: 'hidden', border: `1px solid ${tk.hairline2 || tk.hairline}` }}>
    {options.map((opt) => {
      const active = value === opt.id;
      return (
        <button key={opt.id} onClick={() => onChange(opt.id)} style={{
          padding: '6px 12px', border: 'none', cursor: 'pointer',
          background: active ? tk.accent : 'transparent',
          color: active ? (tk.isDark ? '#0B0B0D' : '#fff') : tk.textDim,
          fontFamily: 'var(--font-mono)', fontSize: 10, letterSpacing: '0.16em', textTransform: 'uppercase',
        }}>{opt.label}</button>
      );
    })}
  </div>
);

const useFixedFlex = (period) => {
  const { transactions } = useAppContext();
  return useMemo(() => {
    const { from, to } = periodRangeFor(period);
    return fixedFlexReport(transactions, from, to);
  }, [transactions, period]);
};

// One horizontal committed-vs-flexible stacked bar.
const SplitBar = ({ fixed, flex, tk, h = 12 }) => {
  const total = fixed + flex;
  const fixedPct = total > 0 ? (fixed / total) * 100 : 0;
  return (
    <div style={{ height: h, borderRadius: 999, background: tk.hairline2 || tk.hairline, overflow: 'hidden', display: 'flex' }}>
      {total > 0 && <>
        <div style={{ width: `${fixedPct}%`, background: tk.textDim, transition: 'width 300ms' }} />
        <div style={{ width: `${100 - fixedPct}%`, background: tk.accent, transition: 'width 300ms' }} />
      </>}
    </div>
  );
};

const Legend = ({ tk }) => (
  <div style={{ display: 'flex', gap: 16, fontFamily: 'var(--font-mono)', fontSize: 11, color: tk.textDim }}>
    <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
      <span style={{ width: 9, height: 9, borderRadius: 2, background: tk.textDim }} /> Committed
    </span>
    <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
      <span style={{ width: 9, height: 9, borderRadius: 2, background: tk.accent }} /> Flexible
    </span>
  </div>
);

export const FixedFlexPage = () => {
  const { themeTokens: tk, fmt, transactions, getCategoryColor } = useAppContext();
  const [period, setPeriod] = useState('month');
  const r = useFixedFlex(period);

  // Committed-share trend over the last 6 calendar months (reuses the shared
  // monthly series, which already carries expense + fixed totals).
  const trend = useMemo(() =>
    monthlyExpenseSeries(transactions, 6).map((m) => ({
      label: m.label,
      share: m.expense > 0 ? (m.fixed / m.expense) * 100 : 0,
      expense: m.expense,
    })), [transactions]);

  return (
    <div style={{ display: 'grid', gap: 24 }}>
      {/* Summary + period toggle */}
      <div style={{ ...card(tk), display: 'grid', gap: 18 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12 }}>
          <div style={eyebrow(tk)}>Committed vs flexible spending</div>
          <PillToggle options={PERIODS} value={period} onChange={setPeriod} tk={tk} />
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(170px, 1fr))', gap: 16 }}>
          <div>
            <div style={eyebrow(tk)}>Committed</div>
            <div style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 28, color: tk.text, marginTop: 8 }}>{fmt(r.fixed)}</div>
            <div style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: tk.textDim, marginTop: 4 }}>{r.fixedPct.toFixed(0)}% of spending</div>
          </div>
          <div>
            <div style={eyebrow(tk)}>Flexible</div>
            <div style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 28, color: tk.accent, marginTop: 8 }}>{fmt(r.flex)}</div>
            <div style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: tk.textDim, marginTop: 4 }}>{r.flexPct.toFixed(0)}% — the part you can cut</div>
          </div>
          <div>
            <div style={eyebrow(tk)}>Total spent</div>
            <div style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 28, color: tk.negative, marginTop: 8 }}>{fmt(r.total)}</div>
          </div>
        </div>
        <SplitBar fixed={r.fixed} flex={r.flex} tk={tk} />
        <Legend tk={tk} />
      </div>

      {/* Per-category split */}
      <div style={card(tk)}>
        <div style={{ ...eyebrow(tk), marginBottom: 14 }}>By category</div>
        {r.rows.length === 0 ? (
          <div style={{ color: tk.textDim, fontSize: 14 }}>No spending in this period.</div>
        ) : r.rows.slice(0, 12).map((row, i) => (
          <motion.div key={row.category} initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.03 }}
            style={{ marginBottom: 13 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 5 }}>
              <span style={{ fontSize: 13, color: tk.text, display: 'flex', alignItems: 'center', gap: 7 }}>
                <span style={{ width: 8, height: 8, borderRadius: '50%', background: getCategoryColor(row.category), flexShrink: 0 }} />
                {row.category}
              </span>
              <span style={{ fontFamily: 'var(--font-mono)', fontSize: 12, color: tk.textDim }}>
                {fmt(row.total)} · {row.flexShare.toFixed(0)}% flexible
              </span>
            </div>
            <SplitBar fixed={row.fixed} flex={row.flex} tk={tk} h={8} />
          </motion.div>
        ))}
        {r.rows.length > 12 && (
          <div style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: tk.textDim, marginTop: 8 }}>
            Showing the top 12 of {r.rows.length} categories by total.
          </div>
        )}
      </div>

      {/* Committed-share trend */}
      <div style={card(tk)}>
        <div style={{ ...eyebrow(tk), marginBottom: 14 }}>Committed share · last 6 months</div>
        <div style={{ display: 'grid', gridTemplateColumns: `repeat(${trend.length}, 1fr)`, gap: 10, alignItems: 'end', height: 120 }}>
          {trend.map((m) => (
            <div key={m.label} style={{ display: 'grid', gap: 6, alignContent: 'end', justifyItems: 'center', height: '100%' }}>
              <div title={`${m.share.toFixed(0)}% of ${fmt(m.expense)}`} style={{
                width: '70%', maxWidth: 38,
                height: `${Math.max(3, m.share)}%`,
                borderRadius: 8, background: tk.textDim, opacity: 0.85,
                alignSelf: 'end',
              }} />
              <span style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: tk.textDim }}>{m.label}</span>
              <span style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: tk.text }}>{m.share.toFixed(0)}%</span>
            </div>
          ))}
        </div>
      </div>

      <div style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: tk.textFaint || tk.textDim, lineHeight: 1.6 }}>
        How it works: committed = locked transactions (financing instalments and
        recurring bills that already fired) — real outflows you can't skip on a
        whim. Flexible = every other real expense. Savings transfers are
        excluded from both. A lower committed share means more room to adjust
        when a month gets tight.
      </div>
    </div>
  );
};

export const FixedFlexPreview = () => {
  const { themeTokens: tk, fmt, setView } = useAppContext();
  const r = useFixedFlex('month');
  return (
    <div onClick={() => setView('fixedflex')} className="aurum-card-hover" style={{ ...card(tk), cursor: 'pointer' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
        <div style={eyebrow(tk)}>Fixed vs Flex</div>
        <span style={{ fontFamily: 'var(--font-mono)', fontSize: 10, letterSpacing: '0.16em', textTransform: 'uppercase', color: tk.textDim }}>Open →</span>
      </div>
      <div style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: tk.textDim }}>This month's spending mix</div>
      <div style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 26, color: tk.text, marginTop: 6 }}>
        {r.total > 0 ? `${r.fixedPct.toFixed(0)}% committed` : 'No spending yet'}
      </div>
      <div style={{ marginTop: 12 }}>
        <SplitBar fixed={r.fixed} flex={r.flex} tk={tk} h={10} />
      </div>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 10, fontFamily: 'var(--font-mono)', fontSize: 12 }}>
        <span style={{ color: tk.textDim }}>committed {fmt(r.fixed)}</span>
        <span style={{ color: tk.accent }}>flexible {fmt(r.flex)}</span>
      </div>
    </div>
  );
};

export default FixedFlexPage;
