// Feature (2026-06-11 review, run 2): Month Compare
//
// What it does: pick any two months and see them side by side — income,
// spending and net at the top, then a per-category breakdown sorted by the
// size of the change, with "new this month" / "stopped" tags and biggest
// increase / biggest drop callouts.
//
// Why: Trends shows the rolling direction, Forecast shows where this month is
// heading — but nothing answers "what exactly changed between March and May?".
// Default compare is the last two COMPLETE months so it's a fair fight; the
// in-progress current month can be picked explicitly and is labelled as such.
//
// Where it lives: its own "Compare" tab + a small Dashboard preview linking in.
// Read-only — it writes nothing. Money shown via `fmt()`.

import React, { useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import { useAppContext } from './context.jsx';
import { monthOptions, compareMonths } from './2026-06-11-utils-yearly-compare-alerts.js';

const card = (tk) => ({
  background: tk.surface, border: `1px solid ${tk.hairline}`, borderRadius: 18, padding: 24,
  backdropFilter: 'blur(24px)', WebkitBackdropFilter: 'blur(24px)',
  boxShadow: tk.isDark ? '0 30px 60px rgba(0,0,0,0.4)' : '0 20px 50px rgba(40,30,20,0.06)',
});
const eyebrow = (tk) => ({
  fontFamily: 'var(--font-mono)', fontSize: 10, letterSpacing: '0.32em',
  textTransform: 'uppercase', color: tk.textDim,
});

const MonthSelect = ({ value, onChange, options, tk }) => (
  <select value={value} onChange={(e) => onChange(e.target.value)} style={{
    background: 'transparent', color: tk.text, border: `1px solid ${tk.hairline2 || tk.hairline}`,
    borderRadius: 999, padding: '6px 12px', fontFamily: 'var(--font-mono)', fontSize: 11,
    letterSpacing: '0.08em', cursor: 'pointer', outline: 'none',
  }}>
    {options.map((o) => (
      <option key={o.key} value={o.key} style={{ background: tk.isDark ? '#0B0B0D' : '#fff', color: tk.text }}>
        {o.label}
      </option>
    ))}
  </select>
);

const DeltaTag = ({ delta, pct, tk, invert = false }) => {
  const good = invert ? delta <= 0 : delta >= 0;
  return (
    <span style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: good ? tk.positive : tk.negative }}>
      {delta >= 0 ? '+' : ''}{pct != null && isFinite(pct) ? `${pct.toFixed(1)}%` : 'new'}
    </span>
  );
};

const useCompare = (aKey, bKey) => {
  const { transactions } = useAppContext();
  return useMemo(
    () => (aKey && bKey ? compareMonths(transactions, aKey, bKey) : null),
    [transactions, aKey, bKey]
  );
};

export const MonthComparePage = () => {
  const { themeTokens: tk, fmt, transactions, getCategoryColor } = useAppContext();
  const options = useMemo(() => monthOptions(transactions), [transactions]);
  // Default to the last two complete months (skip the in-progress current one)
  // so the comparison is fair out of the box.
  const [aKey, setAKey] = useState(options[1]?.key || options[0]?.key);
  const [bKey, setBKey] = useState(options[2]?.key || options[1]?.key || options[0]?.key);
  const c = useCompare(aKey, bKey);

  const labelOf = (key) => options.find((o) => o.key === key)?.label || key;

  if (!c) {
    return <div style={{ ...card(tk), color: tk.textDim, fontSize: 14 }}>Not enough transaction history to compare months yet.</div>;
  }

  return (
    <div style={{ display: 'grid', gap: 24 }}>
      {/* Pickers + totals */}
      <div style={{ ...card(tk), display: 'grid', gap: 18 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12 }}>
          <div style={eyebrow(tk)}>Month Compare</div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
            <MonthSelect value={aKey} onChange={setAKey} options={options} tk={tk} />
            <span style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: tk.textDim }}>vs</span>
            <MonthSelect value={bKey} onChange={setBKey} options={options} tk={tk} />
          </div>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(170px, 1fr))', gap: 16 }}>
          {[
            { label: 'Income', a: c.a.income, b: c.b.income, delta: c.deltas.income, pct: c.pct.income, color: tk.positive, invert: false },
            { label: 'Spending', a: c.a.expense, b: c.b.expense, delta: c.deltas.expense, pct: c.pct.expense, color: tk.negative, invert: true },
            { label: 'Net', a: c.a.net, b: c.b.net, delta: c.deltas.net, pct: null, color: c.a.net >= 0 ? tk.positive : tk.negative, invert: false },
          ].map((k) => (
            <div key={k.label}>
              <div style={eyebrow(tk)}>{k.label}</div>
              <div style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 24, color: k.color, marginTop: 8 }}>{fmt(k.a)}</div>
              <div style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: tk.textDim, marginTop: 2 }}>
                was {fmt(k.b)}{' '}
                {k.pct != null
                  ? <DeltaTag delta={k.delta} pct={k.pct} tk={tk} invert={k.invert} />
                  : <span style={{ color: k.delta >= 0 ? tk.positive : tk.negative }}>{k.delta >= 0 ? '+' : '−'}{fmt(Math.abs(k.delta))}</span>}
              </div>
            </div>
          ))}
        </div>
        {(c.biggestIncrease || c.biggestDrop) && (
          <div style={{ display: 'flex', gap: 18, fontFamily: 'var(--font-mono)', fontSize: 11, color: tk.textDim, flexWrap: 'wrap' }}>
            {c.biggestIncrease && <span>Biggest increase: <span style={{ color: tk.negative }}>{c.biggestIncrease.category} +{fmt(c.biggestIncrease.delta)}</span></span>}
            {c.biggestDrop && <span>Biggest drop: <span style={{ color: tk.positive }}>{c.biggestDrop.category} −{fmt(Math.abs(c.biggestDrop.delta))}</span></span>}
          </div>
        )}
      </div>

      {/* Per-category breakdown */}
      <div style={card(tk)}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 14, flexWrap: 'wrap', gap: 8 }}>
          <div style={eyebrow(tk)}>Spending by category</div>
          <div style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: tk.textDim }}>
            <span style={{ color: tk.accent }}>■</span> {labelOf(aKey)} · <span>■</span> {labelOf(bKey)}
          </div>
        </div>
        {c.rows.length === 0 && <div style={{ color: tk.textDim, fontSize: 13 }}>No spending in either month.</div>}
        {c.rows.map((r, i) => (
          <div key={r.category} style={{ padding: '10px 0', borderBottom: `1px solid ${tk.hairline}` }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 6, gap: 12 }}>
              <span style={{ fontSize: 13, color: tk.text, display: 'flex', alignItems: 'center', gap: 8, minWidth: 0 }}>
                <span style={{ width: 9, height: 9, borderRadius: '50%', background: getCategoryColor(r.category), flexShrink: 0 }} />
                <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{r.category}</span>
                {r.isNew && <span style={{ fontFamily: 'var(--font-mono)', fontSize: 9, letterSpacing: '0.12em', textTransform: 'uppercase', color: tk.accent, border: `1px solid ${tk.accent}`, borderRadius: 999, padding: '1px 7px', flexShrink: 0 }}>new</span>}
                {r.isGone && <span style={{ fontFamily: 'var(--font-mono)', fontSize: 9, letterSpacing: '0.12em', textTransform: 'uppercase', color: tk.textDim, border: `1px solid ${tk.hairline2 || tk.hairline}`, borderRadius: 999, padding: '1px 7px', flexShrink: 0 }}>stopped</span>}
              </span>
              <span style={{ fontFamily: 'var(--font-mono)', fontSize: 12, color: tk.text, flexShrink: 0 }}>
                {fmt(r.a)} <span style={{ color: tk.textDim }}>vs {fmt(r.b)}</span>{' '}
                <span style={{ color: r.delta > 0 ? tk.negative : tk.positive }}>
                  {r.delta >= 0 ? '+' : '−'}{fmt(Math.abs(r.delta))}
                </span>
              </span>
            </div>
            <div style={{ display: 'grid', gap: 3 }}>
              <div style={{ height: 5, borderRadius: 3, background: tk.hairline, overflow: 'hidden' }}>
                <motion.div initial={{ width: 0 }} animate={{ width: `${(r.a / Math.max(1, c.maxRow)) * 100}%` }} transition={{ duration: 0.45, delay: i * 0.02 }}
                  style={{ height: '100%', borderRadius: 3, background: tk.accent }} />
              </div>
              <div style={{ height: 5, borderRadius: 3, background: tk.hairline, overflow: 'hidden' }}>
                <motion.div initial={{ width: 0 }} animate={{ width: `${(r.b / Math.max(1, c.maxRow)) * 100}%` }} transition={{ duration: 0.45, delay: i * 0.02 + 0.05 }}
                  style={{ height: '100%', borderRadius: 3, background: tk.textDim, opacity: 0.45 }} />
              </div>
            </div>
          </div>
        ))}
        <div style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: tk.textFaint || tk.textDim, marginTop: 12, lineHeight: 1.6 }}>
          Real spending only (Savings rows excluded). “new” = the category had nothing
          in the baseline month; “stopped” = it had spending there but none in the
          spotlight month.
        </div>
      </div>
    </div>
  );
};

export const MonthComparePreview = () => {
  const { themeTokens: tk, fmt, setView, transactions } = useAppContext();
  const options = useMemo(() => monthOptions(transactions), [transactions]);
  const aKey = options[1]?.key, bKey = options[2]?.key || options[1]?.key;
  const c = useCompare(aKey, bKey);
  return (
    <div onClick={() => setView('compare')} className="aurum-card-hover" style={{ ...card(tk), cursor: 'pointer' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
        <div style={eyebrow(tk)}>Month Compare</div>
        <span style={{ fontFamily: 'var(--font-mono)', fontSize: 10, letterSpacing: '0.16em', textTransform: 'uppercase', color: tk.textDim }}>Open →</span>
      </div>
      {c ? (
        <>
          <div style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: tk.textDim }}>
            {options.find((o) => o.key === aKey)?.label} vs {options.find((o) => o.key === bKey)?.label} · spending
          </div>
          <div style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 26, marginTop: 6, color: c.deltas.expense <= 0 ? tk.positive : tk.negative }}>
            {c.deltas.expense >= 0 ? '+' : '−'}{fmt(Math.abs(c.deltas.expense))}
          </div>
          {c.biggestIncrease && (
            <div style={{ fontFamily: 'var(--font-mono)', fontSize: 12, color: tk.textDim, marginTop: 12, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              Top mover: {c.biggestIncrease.category} +{fmt(c.biggestIncrease.delta)}
            </div>
          )}
          <div style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: tk.textDim, marginTop: 8 }}>
            {c.rows.length} categor{c.rows.length === 1 ? 'y' : 'ies'} compared
          </div>
        </>
      ) : (
        <div style={{ color: tk.textDim, fontSize: 13 }}>Not enough history to compare months yet.</div>
      )}
    </div>
  );
};

export default MonthComparePage;
