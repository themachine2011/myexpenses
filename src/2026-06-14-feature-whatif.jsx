// Feature (2026-06-14 review): What-If Spending Simulator
//
// What it does: "cut category X by N% → how much do I save over 6 / 12 / 24
// months?" A global cut applies to every category; any category can override
// it with its own cut. Shows total saved plus a per-category breakdown.
//
// Why it's additive (was deferred 2026-06-12 & 06-11): it does NOT add a second
// projection engine. It runs each category through `projectCategorySpend` — the
// exact function behind the Planning → Category Projection Calculator — fed by
// the same `buildCategoryAverageRows` averages. So the two tools can never
// disagree (CLAUDE.md rule #5). Read-only; money shown via `fmt()`.
//
// Where it lives: its own "What-If" tab (Plan group) + a Dashboard preview.

import React, { useMemo, useState } from 'react';
import { useAppContext, MOTO_AMOUNT } from './context.jsx';
import { buildCategoryAverageRows } from './2026-05-19-logic-category-average-calculation.js';
import { whatIfScenario, trailingMonthsPeriod } from './2026-06-14-utils-calendar-whatif.js';

const card = (tk) => ({
  background: tk.surface, border: `1px solid ${tk.hairline}`, borderRadius: 18, padding: 24,
  backdropFilter: 'blur(24px)', WebkitBackdropFilter: 'blur(24px)',
  boxShadow: tk.isDark ? '0 30px 60px rgba(0,0,0,0.4)' : '0 20px 50px rgba(40,30,20,0.06)',
});
const eyebrow = (tk) => ({
  fontFamily: 'var(--font-mono)', fontSize: 10, letterSpacing: '0.32em',
  textTransform: 'uppercase', color: tk.textDim,
});

const HORIZONS = [
  { id: 6, label: '6 mo' },
  { id: 12, label: '12 mo' },
  { id: 24, label: '24 mo' },
];

// Category-average rows over a trailing 6-month window — the same source and
// definition the Projection Calculator uses, so baselines line up.
const useAvgRows = () => {
  const { transactions, recurring, categories } = useAppContext();
  return useMemo(() => {
    const period = trailingMonthsPeriod(6);
    const rows = buildCategoryAverageRows({ transactions, recurring, categories, period, motoAmount: MOTO_AMOUNT });
    // Only categories with something to cut. Income/Savings are already excluded
    // by buildCategoryAverageRows (it collects spending categories).
    return rows.filter((r) => (Number(r.average) || 0) > 0).sort((a, b) => b.average - a.average);
  }, [transactions, recurring, categories]);
};

export const WhatIfPage = () => {
  const { themeTokens: tk, fmt } = useAppContext();
  const rows = useAvgRows();
  const [months, setMonths] = useState(12);
  const [globalPct, setGlobalPct] = useState(10);
  const [overrides, setOverrides] = useState({});

  const scenario = useMemo(
    () => whatIfScenario({ rows, months, globalPct, overrides }),
    [rows, months, globalPct, overrides],
  );

  const setOverride = (cat, val) =>
    setOverrides((o) => ({ ...o, [cat]: val }));
  const clearOverride = (cat) =>
    setOverrides((o) => { const n = { ...o }; delete n[cat]; return n; });

  const toggle = (active) => ({
    background: active ? tk.text : 'transparent', color: active ? tk.canvas : tk.textDim,
    border: `1px solid ${active ? tk.text : tk.hairline}`, borderRadius: 999,
    padding: '6px 14px', cursor: 'pointer', fontFamily: 'var(--font-mono)', fontSize: 10,
    letterSpacing: '0.18em', textTransform: 'uppercase',
  });

  return (
    <div style={{ display: 'grid', gap: 24 }}>
      {/* Controls + headline result */}
      <div style={{ ...card(tk), display: 'grid', gap: 20 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 16 }}>
          <div>
            <div style={eyebrow(tk)}>What-If · projected savings</div>
            <div style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 40, color: tk.positive, marginTop: 6 }}>
              {fmt(scenario.savings)}
            </div>
            <div style={{ fontFamily: 'var(--font-mono)', fontSize: 12, color: tk.textDim, marginTop: 4 }}>
              over {scenario.months} months · {fmt(scenario.monthly)}/mo · {scenario.pct.toFixed(1)}% of {fmt(scenario.baseline)} baseline
            </div>
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            {HORIZONS.map((h) => (
              <button key={h.id} onClick={() => setMonths(h.id)} style={toggle(months === h.id)}>{h.label}</button>
            ))}
          </div>
        </div>

        {/* Global cut slider */}
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
            <span style={eyebrow(tk)}>Cut every category by</span>
            <span style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 16, color: tk.text }}>{globalPct}%</span>
          </div>
          <input type="range" min={0} max={50} step={5} value={globalPct}
            onChange={(e) => setGlobalPct(Number(e.target.value))}
            style={{ width: '100%', accentColor: tk.accent, cursor: 'pointer' }} />
          {Object.keys(overrides).length > 0 && (
            <button onClick={() => setOverrides({})}
              style={{ marginTop: 10, background: 'transparent', border: `1px solid ${tk.hairline}`, color: tk.textDim,
                borderRadius: 8, padding: '4px 10px', cursor: 'pointer', fontFamily: 'var(--font-mono)', fontSize: 10,
                letterSpacing: '0.16em', textTransform: 'uppercase' }}>
              Reset {Object.keys(overrides).length} override{Object.keys(overrides).length === 1 ? '' : 's'}
            </button>
          )}
        </div>
      </div>

      {/* Per-category breakdown */}
      <div style={card(tk)}>
        <div style={{ ...eyebrow(tk), marginBottom: 14 }}>Per category · monthly avg → cut → saved over {scenario.months} mo</div>
        {scenario.perCategory.length === 0 ? (
          <div style={{ color: tk.textDim, fontSize: 14 }}>No spending categories with a positive average in the last 6 months.</div>
        ) : (
          <div style={{ display: 'grid', gap: 10 }}>
            {scenario.perCategory.map((p) => {
              const overridden = overrides[p.category] !== undefined && overrides[p.category] !== '';
              return (
                <div key={p.category} style={{
                  display: 'grid', gridTemplateColumns: 'minmax(110px,1.4fr) 1fr auto auto', gap: 12, alignItems: 'center',
                  padding: '10px 12px', borderRadius: 12, background: tk.surface2, border: `1px solid ${tk.hairline}`,
                }}>
                  <span style={{ fontFamily: 'var(--font-body)', fontSize: 14, color: tk.text, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{p.label}</span>
                  <span style={{ fontFamily: 'var(--font-mono)', fontSize: 12, color: tk.textDim }}>{fmt(p.average)}/mo</span>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                    <input type="number" min={0} max={100} value={overridden ? overrides[p.category] : ''}
                      placeholder={`${globalPct}`}
                      onChange={(e) => setOverride(p.category, e.target.value)}
                      style={{
                        width: 52, textAlign: 'right', background: tk.surface, color: tk.text,
                        border: `1px solid ${overridden ? tk.accent : tk.hairline}`, borderRadius: 8,
                        padding: '4px 6px', fontFamily: 'var(--font-mono)', fontSize: 12,
                      }} />
                    <span style={{ fontFamily: 'var(--font-mono)', fontSize: 12, color: tk.textDim }}>%</span>
                    {overridden && (
                      <button onClick={() => clearOverride(p.category)} title="Use the global cut"
                        style={{ background: 'transparent', border: 'none', color: tk.textFaint, cursor: 'pointer', fontSize: 14, lineHeight: 1, padding: 0 }}>×</button>
                    )}
                  </div>
                  <span style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 14, color: p.savings > 0 ? tk.positive : tk.textDim, textAlign: 'right', minWidth: 80 }}>
                    {fmt(p.savings)}
                  </span>
                </div>
              );
            })}
          </div>
        )}
      </div>

      <div style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: tk.textFaint || tk.textDim, lineHeight: 1.6 }}>
        Baselines are your real monthly averages over the last 6 months (Savings
        excluded). Each category is projected with the <strong>same engine</strong> as
        Planning → Category Projection Calculator, so the numbers always agree. Type
        a % in a row to override the global cut for that one category. This is a
        what-if estimate — nothing here changes your data.
      </div>
    </div>
  );
};

export const WhatIfPreview = () => {
  const { themeTokens: tk, fmt, setView } = useAppContext();
  const rows = useAvgRows();
  // Preview uses a fixed, illustrative scenario: every category −10% / 12 mo.
  const scenario = useMemo(() => whatIfScenario({ rows, months: 12, globalPct: 10 }), [rows]);
  return (
    <div onClick={() => setView('whatif')} className="aurum-card-hover" style={{ ...card(tk), cursor: 'pointer' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
        <div style={eyebrow(tk)}>What-If Simulator</div>
        <span style={{ fontFamily: 'var(--font-mono)', fontSize: 10, letterSpacing: '0.16em', textTransform: 'uppercase', color: tk.textDim }}>Open →</span>
      </div>
      <div style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: tk.textDim }}>Cut everything 10% · 12 mo</div>
      <div style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 26, color: tk.positive, marginTop: 6 }}>
        {fmt(scenario.savings)}
      </div>
      <div style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: tk.textDim, marginTop: 10 }}>
        {fmt(scenario.monthly)}/mo saved · {scenario.pct.toFixed(0)}% of spend
      </div>
    </div>
  );
};

export default WhatIfPage;
