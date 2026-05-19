import React, { useEffect, useMemo, useState } from 'react';
import { useAppContext, CATEGORIES, MOTO_AMOUNT } from './context.jsx';
import {
  buildCategoryAverageRows,
  buildYearToMonthPeriod,
  FINANCING_CATEGORY,
} from './2026-05-19-logic-category-average-calculation.js';
import {
  categoryColor,
  getCategoryDisplayName,
} from './2026-05-19-utils-category-colors.js';
import {
  projectCategorySpend,
  projectAcrossCategories,
  buildPresets,
  periodToMonths,
} from './2026-05-18-logic-category-projection-calculations.js';

const PERIOD_KINDS = [
  { id: 'months',    label: 'Months' },
  { id: 'years',     label: 'Years' },
  { id: 'untilYear', label: 'Until year' },
];

export const CategoryProjectionCalculator = () => {
  const { transactions, recurring, themeTokens, fmt } = useAppContext();
  const now = useMemo(() => new Date(), []);

  // Source-of-truth category rows — same data the Average-by-Category card uses.
  const rows = useMemo(() => {
    const ytd = buildYearToMonthPeriod({ year: now.getFullYear(), month: now.getMonth() }, now);
    return buildCategoryAverageRows({
      transactions,
      recurring,
      categories: CATEGORIES,
      period: ytd,
      motoAmount: MOTO_AMOUNT,
    });
  }, [transactions, recurring, now]);

  // Spending rows = non-Income, non-Financing, average > 0 → sortable & selectable.
  const spendingRows = useMemo(
    () => rows
      .filter((r) => r.category !== 'Income' && r.category !== FINANCING_CATEGORY)
      .sort((a, b) => b.average - a.average),
    [rows]
  );

  const [selectedCategory, setSelectedCategory] = useState(() => {
    const first = spendingRows.find((r) => r.average > 0);
    return first ? first.category : (spendingRows[0]?.category || 'Health');
  });

  // Keep selection in sync if the category disappears (rare).
  useEffect(() => {
    if (!spendingRows.find((r) => r.category === selectedCategory) && spendingRows.length) {
      setSelectedCategory(spendingRows[0].category);
    }
  }, [spendingRows, selectedCategory]);

  const currentRow = useMemo(
    () => spendingRows.find((r) => r.category === selectedCategory) || { average: 0, category: selectedCategory, label: getCategoryDisplayName(selectedCategory) },
    [spendingRows, selectedCategory]
  );

  // Reduction inputs
  const [reductionPct,   setReductionPct]   = useState('10');
  const [reductionFixed, setReductionFixed] = useState('');
  const [monthlyCap,     setMonthlyCap]     = useState('');

  // Time period
  const [periodKind,  setPeriodKind]  = useState('months');
  const [periodCount, setPeriodCount] = useState(12);
  const [untilYear,   setUntilYear]   = useState(now.getFullYear() + 1);

  const period = useMemo(() => {
    if (periodKind === 'untilYear') return { kind: 'untilYear', year: Number(untilYear) || now.getFullYear() + 1 };
    return { kind: periodKind, count: Number(periodCount) || 0 };
  }, [periodKind, periodCount, untilYear, now]);
  const months = useMemo(() => periodToMonths(period, now), [period, now]);

  // Build the active projection from the current selection + inputs.
  const projection = useMemo(() => projectCategorySpend({
    avg: currentRow.average,
    months,
    reductionPct: reductionPct === '' ? undefined : Number(reductionPct),
    reductionFixed: reductionFixed === '' ? undefined : Number(reductionFixed),
    monthlyCap: monthlyCap === '' ? undefined : Number(monthlyCap),
  }), [currentRow.average, months, reductionPct, reductionFixed, monthlyCap]);

  // Presets — running them updates the displayed result panel.
  const presets = useMemo(() => buildPresets(), []);
  const [activePreset, setActivePreset] = useState(null);
  const [presetResult, setPresetResult] = useState(null);

  const runPreset = (preset) => {
    setActivePreset(preset.id);
    const allRows = spendingRows;
    const cap = monthlyCap === '' ? undefined : Number(monthlyCap);
    const out = preset.build({ row: currentRow, allRows, now, monthlyCap: cap });
    setPresetResult({ preset, out });
  };

  const inputBase = {
    background: 'transparent',
    border: `1px solid ${themeTokens.hairline2}`, borderRadius: 8,
    padding: '6px 10px', color: themeTokens.text,
    fontFamily: 'var(--font-body)', fontSize: 13, outline: 'none',
    width: '100%', minWidth: 0, boxSizing: 'border-box',
  };
  const monoInput = { ...inputBase, fontFamily: 'var(--font-mono)' };

  const labelStyle = {
    fontFamily: 'var(--font-mono)', fontSize: 9,
    letterSpacing: '0.16em', textTransform: 'uppercase',
    color: themeTokens.textDim,
    marginBottom: 4,
  };

  const color = categoryColor(currentRow.category);

  const ResultRow = ({ k, v, accent }) => (
    <div style={{
      display: 'flex', justifyContent: 'space-between', alignItems: 'baseline',
      padding: '4px 0',
      borderBottom: `1px dashed ${themeTokens.hairline}`,
    }}>
      <span style={{ color: themeTokens.textDim, fontFamily: 'var(--font-mono)', fontSize: 10, letterSpacing: '0.12em', textTransform: 'uppercase' }}>{k}</span>
      <span style={{ color: accent || themeTokens.text, fontFamily: 'var(--font-mono)', fontSize: 12 }}>{v}</span>
    </div>
  );

  // Display either the live projection or the active preset's outcome.
  const shown = presetResult?.out || projection;
  const shownLabel = presetResult ? presetResult.preset.label : `${reductionPct || 0}% reduction for ${months} mo`;
  const isAggregate = !!presetResult && presetResult.preset.scope === 'all';

  return (
    <div style={{ display: 'grid', gap: 12, minWidth: 0 }}>
      {/* Category selector */}
      <div>
        <div style={labelStyle}>Category</div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, minWidth: 0 }}>
          <span style={{ width: 10, height: 10, borderRadius: 2, background: color, flexShrink: 0 }} />
          <select
            value={selectedCategory}
            onChange={(e) => { setSelectedCategory(e.target.value); setActivePreset(null); setPresetResult(null); }}
            style={{ ...inputBase, cursor: 'pointer' }}>
            {spendingRows.map((r) => (
              <option key={r.category} value={r.category}>
                {r.label || getCategoryDisplayName(r.category)} {r.average > 0 ? `· ${fmt(r.average)}` : '· —'}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Current average headline */}
      <div style={{
        border: `1px solid ${themeTokens.hairline}`,
        borderRadius: 12,
        padding: '10px 12px',
        background: `${themeTokens.surface2}66`,
      }}>
        <div style={labelStyle}>{(currentRow.label || getCategoryDisplayName(currentRow.category))} · YTD avg / month</div>
        <div style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 22, color: themeTokens.text }}>
          {fmt(currentRow.average)}
        </div>
      </div>

      {/* Reduction inputs */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'minmax(0, 1fr) minmax(0, 1fr)',
        gap: 8,
        minWidth: 0,
      }}>
        <label>
          <div style={labelStyle}>Reduction %</div>
          <input type="number" min="0" max="100" step="1"
            value={reductionPct}
            onChange={(e) => { setReductionPct(e.target.value); setActivePreset(null); setPresetResult(null); }}
            placeholder="0–100"
            style={monoInput} />
        </label>
        <label>
          <div style={labelStyle}>Or fixed R$/mo</div>
          <input type="number" min="0" step="1"
            value={reductionFixed}
            onChange={(e) => { setReductionFixed(e.target.value); setActivePreset(null); setPresetResult(null); }}
            placeholder="0,00"
            style={monoInput} />
        </label>
      </div>

      <label>
        <div style={labelStyle}>Or monthly cap</div>
        <input type="number" min="0" step="1"
          value={monthlyCap}
          onChange={(e) => { setMonthlyCap(e.target.value); setActivePreset(null); setPresetResult(null); }}
          placeholder="leave blank to ignore"
          style={monoInput} />
      </label>

      {/* Time period */}
      <div>
        <div style={labelStyle}>Time period</div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, minmax(0, 1fr))', gap: 4, marginBottom: 6 }}>
          {PERIOD_KINDS.map((k) => {
            const active = periodKind === k.id;
            return (
              <button key={k.id} type="button"
                onClick={() => { setPeriodKind(k.id); setActivePreset(null); setPresetResult(null); }}
                style={{
                  padding: '6px 4px',
                  border: `1px solid ${active ? themeTokens.accent : themeTokens.hairline2}`,
                  background: active ? themeTokens.accent : 'transparent',
                  color: active ? (themeTokens.isDark ? '#0B0B0D' : '#FFFFFF') : themeTokens.textDim,
                  borderRadius: 8,
                  fontFamily: 'var(--font-mono)', fontSize: 9,
                  letterSpacing: '0.12em', textTransform: 'uppercase',
                  cursor: 'pointer',
                  minWidth: 0,
                  whiteSpace: 'nowrap',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                }}>{k.label}</button>
            );
          })}
        </div>
        {periodKind === 'untilYear' ? (
          <input type="number" min={now.getFullYear()} max={now.getFullYear() + 50}
            value={untilYear}
            onChange={(e) => { setUntilYear(e.target.value); setActivePreset(null); setPresetResult(null); }}
            style={monoInput} />
        ) : (
          <input type="number" min={1} step={1}
            value={periodCount}
            onChange={(e) => { setPeriodCount(e.target.value); setActivePreset(null); setPresetResult(null); }}
            style={monoInput} />
        )}
        <div style={{
          marginTop: 4,
          color: themeTokens.textFaint,
          fontFamily: 'var(--font-mono)',
          fontSize: 9,
          letterSpacing: '0.12em',
          textTransform: 'uppercase',
        }}>{months} month{months === 1 ? '' : 's'} ahead</div>
      </div>

      {/* Results */}
      <div style={{
        border: `1px solid ${color}66`,
        borderRadius: 12,
        padding: '10px 12px',
        background: `${color}14`,
        display: 'grid',
        gap: 4,
        minWidth: 0,
      }}>
        <div style={{
          color: themeTokens.textDim,
          fontFamily: 'var(--font-mono)', fontSize: 9,
          letterSpacing: '0.16em', textTransform: 'uppercase',
        }}>
          {isAggregate ? 'Across all selected categories' : (currentRow.label || getCategoryDisplayName(currentRow.category))} · {shownLabel}
        </div>
        <ResultRow k="Baseline total"   v={fmt(shown.baseline)} />
        <ResultRow k="Reduced total"    v={fmt(shown.reduced)}  accent={themeTokens.text} />
        <ResultRow k="Saved"            v={fmt(shown.savings)}  accent={themeTokens.positive} />
        <ResultRow k="Monthly saving"   v={fmt(shown.monthly)}  accent={themeTokens.positive} />
        {shown.months >= 12 && (
          <ResultRow k="Yearly saving"  v={fmt(shown.yearly)}   accent={themeTokens.positive} />
        )}
        {!isAggregate && (
          <ResultRow k="New monthly avg" v={fmt(shown.newMonthlyAvg ?? 0)} />
        )}
      </div>

      {/* Presets */}
      <div>
        <div style={labelStyle}>Quick presets</div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: 6 }}>
          {presets.map((preset) => {
            const active = activePreset === preset.id;
            const noData = preset.scope === 'single' && currentRow.average <= 0;
            return (
              <button key={preset.id}
                type="button"
                disabled={noData}
                onClick={() => runPreset(preset)}
                title={noData ? 'No spending recorded for this category' : preset.label}
                style={{
                  padding: '6px 8px',
                  border: `1px solid ${active ? themeTokens.accent : themeTokens.hairline2}`,
                  background: active ? `${themeTokens.accent}1A` : 'transparent',
                  color: noData ? themeTokens.textFaint : themeTokens.text,
                  borderRadius: 8,
                  fontFamily: 'var(--font-mono)', fontSize: 9,
                  letterSpacing: '0.06em', textTransform: 'uppercase',
                  cursor: noData ? 'not-allowed' : 'pointer',
                  opacity: noData ? 0.4 : 1,
                  textAlign: 'left',
                  minWidth: 0,
                  whiteSpace: 'normal',
                  lineHeight: 1.2,
                }}>{preset.label}</button>
            );
          })}
        </div>
        {(activePreset || presetResult) && (
          <button
            type="button"
            onClick={() => { setActivePreset(null); setPresetResult(null); }}
            style={{
              marginTop: 8,
              background: 'transparent', border: 'none',
              color: themeTokens.textDim, cursor: 'pointer',
              fontFamily: 'var(--font-mono)', fontSize: 9,
              letterSpacing: '0.12em', textTransform: 'uppercase',
            }}>Clear preset ✕</button>
        )}
      </div>
    </div>
  );
};
