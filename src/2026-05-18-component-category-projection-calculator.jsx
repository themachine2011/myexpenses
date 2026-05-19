import React, { useEffect, useMemo, useState } from 'react';
import { useAppContext, CATEGORIES, MOTO_AMOUNT } from './context.jsx';
import {
  buildCategoryAverageRows,
  buildFutureCategorySpendRows,
  buildYearToMonthPeriod,
} from './2026-05-19-logic-category-average-calculation.js';
import {
  getCategoryDisplayName,
} from './2026-05-19-utils-category-colors.js';
import {
  projectCategorySpend,
  projectAcrossCategories,
  buildPresets,
  periodToMonths,
} from './2026-05-18-logic-category-projection-calculations.js';
import { FormulaTooltip } from './2026-05-18-component-formula-tooltip.jsx';

const PERIOD_KINDS = [
  { id: 'months', label: 'Months' },
  { id: 'years', label: 'Years' },
  { id: 'untilYear', label: 'Until year' },
];

const HISTORY_PERIODS = [
  { id: 'ytd', label: 'YTD' },
  { id: 'last3', label: '3 mo', months: 3 },
  { id: 'last6', label: '6 mo', months: 6 },
  { id: 'last12', label: '12 mo', months: 12 },
  { id: 'custom', label: 'Custom' },
];

const startOfDay = (date) => new Date(date.getFullYear(), date.getMonth(), date.getDate(), 0, 0, 0, 0);
const endOfDay = (date) => new Date(date.getFullYear(), date.getMonth(), date.getDate(), 23, 59, 59, 999);
const startOfMonth = (date) => new Date(date.getFullYear(), date.getMonth(), 1, 0, 0, 0, 0);
const endOfMonth = (date) => new Date(date.getFullYear(), date.getMonth() + 1, 0, 23, 59, 59, 999);
const pad2 = (value) => String(value).padStart(2, '0');

const toDateInput = (date) => `${date.getFullYear()}-${pad2(date.getMonth() + 1)}-${pad2(date.getDate())}`;

const parseDateInput = (value, fallback) => {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(value || ''));
  if (!match) return fallback;
  const date = new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3]));
  return Number.isNaN(date.getTime()) ? fallback : date;
};

const monthDistanceInclusive = (from, to) =>
  Math.max(1, (to.getFullYear() - from.getFullYear()) * 12 + (to.getMonth() - from.getMonth()) + 1);

const formatPeriodLabel = (from, to) => {
  const sameYear = from.getFullYear() === to.getFullYear();
  const fromLabel = from.toLocaleString('en-US', {
    month: 'short',
    year: sameYear ? undefined : 'numeric',
  });
  const toLabel = to.toLocaleString('en-US', { month: 'short', year: 'numeric' });
  return `${fromLabel} - ${toLabel}`;
};

const buildHistoryPeriod = ({ kind, customFrom, customTo, now }) => {
  if (kind === 'ytd') {
    return buildYearToMonthPeriod({ year: now.getFullYear(), month: now.getMonth() }, now);
  }

  if (kind === 'custom') {
    const fallbackFrom = new Date(now.getFullYear(), now.getMonth() - 5, 1);
    const fallbackTo = now;
    let from = startOfDay(parseDateInput(customFrom, fallbackFrom));
    let to = endOfDay(parseDateInput(customTo, fallbackTo));
    if (from > to) [from, to] = [startOfDay(to), endOfDay(from)];
    return {
      kind,
      from,
      to,
      monthsIncluded: monthDistanceInclusive(from, to),
      label: formatPeriodLabel(from, to),
    };
  }

  const months = HISTORY_PERIODS.find((period) => period.id === kind)?.months || 6;
  const from = startOfMonth(new Date(now.getFullYear(), now.getMonth() - months + 1, 1));
  const to = now;
  return {
    kind,
    from,
    to,
    monthsIncluded: months,
    label: formatPeriodLabel(from, to),
  };
};

const asNumberOrUndefined = (value) => {
  if (value === '' || value === null || value === undefined) return undefined;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : undefined;
};

const setsEqual = (a, b) => {
  if (a.size !== b.size) return false;
  for (const item of a) if (!b.has(item)) return false;
  return true;
};

const emptyProjectionRow = { category: 'None', label: 'No category selected', average: 0, total: 0 };

export const CategoryProjectionCalculator = () => {
  const { transactions, recurring, reminders, themeTokens, fmt, getCategoryColor } = useAppContext();
  const now = useMemo(() => new Date(), []);

  const [historyKind, setHistoryKind] = useState('ytd');
  const [customFrom, setCustomFrom] = useState(() => toDateInput(new Date(now.getFullYear(), now.getMonth() - 5, 1)));
  const [customTo, setCustomTo] = useState(() => toDateInput(now));

  const historyPeriod = useMemo(() => buildHistoryPeriod({
    kind: historyKind,
    customFrom,
    customTo,
    now,
  }), [historyKind, customFrom, customTo, now]);

  const rows = useMemo(() => buildCategoryAverageRows({
    transactions,
    recurring,
    categories: CATEGORIES,
    period: historyPeriod,
    motoAmount: MOTO_AMOUNT,
  }), [
    transactions,
    recurring,
    historyPeriod.from.getTime(),
    historyPeriod.to.getTime(),
    historyPeriod.monthsIncluded,
  ]);

  const [periodKind, setPeriodKind] = useState('months');
  const [periodCount, setPeriodCount] = useState(12);
  const [untilYear, setUntilYear] = useState(now.getFullYear() + 1);

  const period = useMemo(() => {
    if (periodKind === 'untilYear') return { kind: 'untilYear', year: Number(untilYear) || now.getFullYear() + 1 };
    return { kind: periodKind, count: Number(periodCount) || 0 };
  }, [periodKind, periodCount, untilYear, now]);

  const months = useMemo(() => periodToMonths(period, now), [period, now]);

  const futureRows = useMemo(() => buildFutureCategorySpendRows({
    transactions,
    recurring,
    reminders,
    categories: CATEGORIES,
    from: now,
    months,
    motoAmount: MOTO_AMOUNT,
  }), [transactions, recurring, reminders, months, now]);

  const futureByCategory = useMemo(
    () => new Map(futureRows.map((row) => [row.category, row])),
    [futureRows]
  );

  const categoryRows = useMemo(
    () => rows
      .filter((row) => row.category !== 'Income')
      .map((row) => {
        const future = futureByCategory.get(row.category);
        const futureTotalRaw = Number(future?.total) || 0;
        const futureAverageRaw = Number(future?.averagePerMonth ?? future?.average) || 0;
        // Triumph financing: the schedule lists 48 installments — the current
        // month's payment is already counted in the historical/actual sum, and
        // the future schedule lists every remaining installment. Adding the
        // future average on top double-counts the recurring R$ MOTO_AMOUNT and
        // makes the projection avg show 2× the real monthly burden. For this
        // category we keep the historical average only. Every other category
        // continues to use historical + future so recurring subscriptions etc.
        // still surface scheduled spend.
        const isTriumph = !!row.isTriumphFinancing;
        const futureTotal = isTriumph ? 0 : futureTotalRaw;
        const futureAverage = isTriumph ? 0 : futureAverageRaw;
        return {
          ...row,
          futureTotal,
          futureAverage,
          projectionTotal: (Number(row.total) || 0) + futureTotal,
          projectionAverage: (Number(row.average) || 0) + futureAverage,
        };
      })
      .sort((a, b) => {
        if (b.projectionAverage !== a.projectionAverage) return b.projectionAverage - a.projectionAverage;
        return String(a.label).localeCompare(String(b.label));
      }),
    [rows, futureByCategory]
  );

  const activeRows = useMemo(
    () => categoryRows.filter((row) => row.projectionAverage > 0),
    [categoryRows]
  );

  const zeroRows = useMemo(
    () => categoryRows.filter((row) => row.projectionAverage <= 0),
    [categoryRows]
  );

  const [selectedCategories, setSelectedCategories] = useState(() => new Set());

  useEffect(() => {
    setSelectedCategories((current) => {
      const activeCategories = new Set(activeRows.map((row) => row.category));
      const next = new Set([...current].filter((category) => activeCategories.has(category)));
      if (!next.size && activeRows[0]) next.add(activeRows[0].category);
      return setsEqual(current, next) ? current : next;
    });
  }, [activeRows]);

  const selectedRows = useMemo(
    () => activeRows.filter((row) => selectedCategories.has(row.category)),
    [activeRows, selectedCategories]
  );

  const selectedActualTotal = useMemo(
    () => selectedRows.reduce((sum, row) => sum + (Number(row.total) || 0), 0),
    [selectedRows]
  );

  const selectedFutureTotal = useMemo(
    () => selectedRows.reduce((sum, row) => sum + (Number(row.futureTotal) || 0), 0),
    [selectedRows]
  );

  const selectedTotal = selectedActualTotal + selectedFutureTotal;

  const selectedAverage = useMemo(
    () => selectedRows.reduce((sum, row) => sum + (Number(row.projectionAverage ?? row.average) || 0), 0),
    [selectedRows]
  );

  const selectedHistoricalAverage = useMemo(
    () => selectedRows.reduce((sum, row) => sum + (Number(row.average) || 0), 0),
    [selectedRows]
  );

  const currentRow = selectedRows.length === 1
    ? selectedRows[0]
    : {
      category: 'Selected categories',
      label: selectedRows.length ? `${selectedRows.length} categories` : emptyProjectionRow.label,
      average: selectedAverage,
      projectionAverage: selectedAverage,
      total: selectedTotal,
      projectionTotal: selectedTotal,
      futureTotal: selectedFutureTotal,
    };

  const [adjustmentDirection, setAdjustmentDirection] = useState('decrease');
  const [adjustmentPct, setAdjustmentPct] = useState('10');
  const [fixedAdjustment, setFixedAdjustment] = useState('');
  const [monthlyCap, setMonthlyCap] = useState('');

  const projectionArgs = useMemo(() => {
    const pct = asNumberOrUndefined(adjustmentPct);
    const fixed = asNumberOrUndefined(fixedAdjustment);
    const cap = asNumberOrUndefined(monthlyCap);
    return {
      months,
      monthlyCap: cap,
      ...(adjustmentDirection === 'increase'
        ? { increasePct: pct, increaseFixed: fixed }
        : { reductionPct: pct, reductionFixed: fixed }),
    };
  }, [adjustmentDirection, adjustmentPct, fixedAdjustment, monthlyCap, months]);

  const projection = useMemo(() => {
    if (!selectedRows.length) return projectCategorySpend({ avg: 0, months });
    if (selectedRows.length === 1) {
      return projectCategorySpend({ avg: selectedRows[0].projectionAverage ?? selectedRows[0].average, ...projectionArgs });
    }
    return projectAcrossCategories({ rows: selectedRows, ...projectionArgs });
  }, [selectedRows, projectionArgs, months]);

  const presets = useMemo(() => buildPresets(), []);
  const [activePreset, setActivePreset] = useState(null);
  const [presetResult, setPresetResult] = useState(null);

  const clearPreset = () => {
    setActivePreset(null);
    setPresetResult(null);
  };

  const toggleCategory = (category) => {
    clearPreset();
    setSelectedCategories((current) => {
      const next = new Set(current);
      if (next.has(category)) next.delete(category);
      else next.add(category);
      return next;
    });
  };

  const selectAllActive = () => {
    clearPreset();
    setSelectedCategories(new Set(activeRows.map((row) => row.category)));
  };

  const clearSelection = () => {
    clearPreset();
    setSelectedCategories(new Set());
  };

  const runPreset = (preset) => {
    setActivePreset(preset.id);
    const cap = asNumberOrUndefined(monthlyCap);
    const presetRows = selectedRows.length ? selectedRows : activeRows;
    const row = selectedRows.length === 1 ? selectedRows[0] : (activeRows[0] || emptyProjectionRow);
    const out = preset.build({ row, allRows: presetRows, now, monthlyCap: cap });
    setPresetResult({ preset, out });
  };

  const inputBase = {
    background: 'transparent',
    border: `1px solid ${themeTokens.hairline2}`,
    borderRadius: 8,
    padding: '6px 10px',
    color: themeTokens.text,
    fontFamily: 'var(--font-body)',
    fontSize: 13,
    outline: 'none',
    width: '100%',
    minWidth: 0,
    boxSizing: 'border-box',
    colorScheme: themeTokens.isDark ? 'dark' : 'light',
  };
  const monoInput = { ...inputBase, fontFamily: 'var(--font-mono)' };

  const labelStyle = {
    fontFamily: 'var(--font-mono)',
    fontSize: 9,
    letterSpacing: '0.16em',
    textTransform: 'uppercase',
    color: themeTokens.textDim,
    marginBottom: 4,
  };

  const activeColor = selectedRows.length === 1 ? getCategoryColor(currentRow.category) : themeTokens.accent;
  const shown = presetResult?.out || projection;
  const shownLabel = presetResult
    ? presetResult.preset.label
    : `${adjustmentPct || 0}% ${adjustmentDirection === 'increase' ? 'increase' : 'reduction'} for ${months} mo`;
  const isAggregate = selectedRows.length !== 1 || (!!presetResult && presetResult.preset.scope === 'all');
  const isPositiveSavings = (Number(shown.savings) || 0) >= 0;
  const differenceLabel = isPositiveSavings ? 'Saved' : 'Extra spend';
  const differenceColor = isPositiveSavings ? themeTokens.positive : themeTokens.negative;

  // Plain-English description of how `newMonthlyAvg` was derived. Used by the
  // formula tooltips on the projection result rows.
  const adjustmentExplanation = (() => {
    const baselineAvg = currentRow.average || (shown.baseline / Math.max(1, shown.months));
    if (presetResult) {
      return `Preset applied: "${presetResult.preset.label}".\nBaseline avg ${fmt(baselineAvg)} → adjusted to ${fmt(shown.newMonthlyAvg ?? 0)}.`;
    }
    if (monthlyCap !== '' && Number.isFinite(Number(monthlyCap))) {
      return `Monthly cap applied: min(${fmt(baselineAvg)}, ${fmt(Number(monthlyCap))}) = ${fmt(shown.newMonthlyAvg ?? 0)}.`;
    }
    if (fixedAdjustment !== '' && Number.isFinite(Number(fixedAdjustment))) {
      const sign = adjustmentDirection === 'increase' ? '+' : '−';
      return `Fixed amount: ${fmt(baselineAvg)} ${sign} ${fmt(Number(fixedAdjustment))} = ${fmt(shown.newMonthlyAvg ?? 0)} per month.`;
    }
    if (adjustmentPct !== '' && Number.isFinite(Number(adjustmentPct))) {
      const pct = Number(adjustmentPct);
      const op = adjustmentDirection === 'increase' ? `× (1 + ${pct}/100)` : `× (1 − ${pct}/100)`;
      return `Percentage: ${fmt(baselineAvg)} ${op} = ${fmt(shown.newMonthlyAvg ?? 0)} per month.`;
    }
    return `No adjustment applied — projected average stays at ${fmt(shown.newMonthlyAvg ?? 0)} per month.`;
  })();

  const ResultRow = ({ k, v, accent, formula }) => (
    <div style={{
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'baseline',
      gap: 12,
      padding: '4px 0',
      borderBottom: `1px dashed ${themeTokens.hairline}`,
    }}>
      <span style={{
        color: themeTokens.textDim,
        fontFamily: 'var(--font-mono)',
        fontSize: 10,
        letterSpacing: '0.12em',
        textTransform: 'uppercase',
      }}>{k}</span>
      <FormulaTooltip formula={formula}>
        <span style={{
          color: accent || themeTokens.text,
          fontFamily: 'var(--font-mono)',
          fontSize: 12,
          whiteSpace: 'nowrap',
        }}>{v}</span>
      </FormulaTooltip>
    </div>
  );

  return (
    <div style={{ display: 'grid', gap: 12, minWidth: 0 }}>
      <div>
        <div style={labelStyle}>Historical period</div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, minmax(0, 1fr))', gap: 4 }}>
          {HISTORY_PERIODS.map((periodOption) => {
            const active = historyKind === periodOption.id;
            return (
              <button
                key={periodOption.id}
                type="button"
                onClick={() => { setHistoryKind(periodOption.id); clearPreset(); }}
                style={{
                  padding: '6px 4px',
                  border: `1px solid ${active ? themeTokens.accent : themeTokens.hairline2}`,
                  background: active ? themeTokens.accent : 'transparent',
                  color: active ? (themeTokens.isDark ? '#0B0B0D' : '#FFFFFF') : themeTokens.textDim,
                  borderRadius: 8,
                  fontFamily: 'var(--font-mono)',
                  fontSize: 9,
                  letterSpacing: '0.08em',
                  textTransform: 'uppercase',
                  cursor: 'pointer',
                  minWidth: 0,
                }}
              >
                {periodOption.label}
              </button>
            );
          })}
        </div>
        {historyKind === 'custom' && (
          <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) minmax(0, 1fr)', gap: 8, marginTop: 8 }}>
            <input type="date" value={customFrom} onChange={(event) => { setCustomFrom(event.target.value); clearPreset(); }} style={monoInput} />
            <input type="date" value={customTo} onChange={(event) => { setCustomTo(event.target.value); clearPreset(); }} style={monoInput} />
          </div>
        )}
        <div style={{
          marginTop: 5,
          color: themeTokens.textFaint,
          fontFamily: 'var(--font-mono)',
          fontSize: 9,
          letterSpacing: '0.12em',
          textTransform: 'uppercase',
        }}>
          Source: history {historyPeriod.label} + future scheduled / planned / recurring spending
        </div>
      </div>

      <div>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8, marginBottom: 6 }}>
          <div style={{ ...labelStyle, marginBottom: 0 }}>Categories</div>
          <div style={{ display: 'flex', gap: 6 }}>
            <button type="button" onClick={selectAllActive} disabled={!activeRows.length} style={{
              background: 'transparent',
              border: `1px solid ${themeTokens.hairline2}`,
              borderRadius: 999,
              color: themeTokens.textDim,
              cursor: activeRows.length ? 'pointer' : 'not-allowed',
              fontFamily: 'var(--font-mono)',
              fontSize: 8,
              letterSpacing: '0.1em',
              padding: '4px 8px',
              textTransform: 'uppercase',
              opacity: activeRows.length ? 1 : 0.45,
            }}>All</button>
            <button type="button" onClick={clearSelection} style={{
              background: 'transparent',
              border: `1px solid ${themeTokens.hairline2}`,
              borderRadius: 999,
              color: themeTokens.textDim,
              cursor: 'pointer',
              fontFamily: 'var(--font-mono)',
              fontSize: 8,
              letterSpacing: '0.1em',
              padding: '4px 8px',
              textTransform: 'uppercase',
            }}>Clear</button>
          </div>
        </div>

        <div style={{
          border: `1px solid ${themeTokens.hairline}`,
          borderRadius: 12,
          background: `${themeTokens.surface2}66`,
          maxHeight: 360,
          overflow: 'auto',
          padding: 8,
          display: 'grid',
          gap: 6,
        }}>
          {categoryRows.length ? categoryRows.map((row) => {
            // Show EVERY spending category. Rows with average === 0 are still
            // rendered, just visually dimmed and with a "no data" tail label —
            // never hide them, so the calculator's list always matches the
            // Average-by-Category card above it.
            const checked = selectedCategories.has(row.category);
            const color = getCategoryColor(row.category);
            const hasData = row.projectionAverage > 0;
            return (
              <label key={row.category} style={{
                display: 'grid',
                gridTemplateColumns: 'auto 1fr auto',
                alignItems: 'center',
                gap: 8,
                cursor: hasData ? 'pointer' : 'not-allowed',
                color: hasData ? themeTokens.text : themeTokens.textFaint,
                fontSize: 12,
                opacity: hasData ? 1 : 0.55,
              }}>
                <input
                  type="checkbox"
                  checked={checked && hasData}
                  disabled={!hasData}
                  onChange={() => { if (hasData) toggleCategory(row.category); }}
                  style={{
                    width: 14, height: 14,
                    accentColor: color,
                    cursor: hasData ? 'pointer' : 'not-allowed',
                  }}
                />
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: 8, minWidth: 0 }}>
                  <span style={{ width: 8, height: 8, borderRadius: 2, background: color, flexShrink: 0 }} />
                  <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {row.label || getCategoryDisplayName(row.category)}
                  </span>
                </span>
                <span style={{
                  color: hasData ? themeTokens.textDim : themeTokens.textFaint,
                  fontFamily: 'var(--font-mono)', fontSize: 10, whiteSpace: 'nowrap',
                }}>
                  {hasData ? `${fmt(row.projectionAverage)}/mo${row.futureTotal > 0 ? ' incl future' : ''}` : 'no data'}
                </span>
              </label>
            );
          }) : (
            <div style={{ color: themeTokens.textDim, fontSize: 12, padding: 8 }}>
              No spending categories available.
            </div>
          )}
        </div>
        <div style={{
          marginTop: 6,
          color: themeTokens.textFaint,
          fontFamily: 'var(--font-mono)',
          fontSize: 9,
          letterSpacing: '0.12em',
          textTransform: 'uppercase',
        }}>
          {activeRows.length} with data · {zeroRows.length} without
        </div>
      </div>

      <div style={{
        border: `1px solid ${themeTokens.hairline}`,
        borderRadius: 12,
        padding: '10px 12px',
        background: `${themeTokens.surface2}66`,
      }}>
        <div style={labelStyle}>{isAggregate ? currentRow.label : (currentRow.label || getCategoryDisplayName(currentRow.category))} · actuals</div>
        <ResultRow k="Actual in period" v={fmt(selectedActualTotal)}
          formula={`Formula:\nActual = sum of transactions in the period, for the selected category.\n\nSource: actual Transactions data\nPeriod: ${historyPeriod.label}\n\nValue: ${fmt(selectedActualTotal)}`}
        />
        <ResultRow k="Future in horizon" v={fmt(selectedFutureTotal)}
          formula={`Formula:\nFuture in horizon = sum of scheduled / locked future transactions within the projection period.\n\nSource: combined — Transactions dated ahead + locked installments\n\nValue: ${fmt(selectedFutureTotal)}`}
        />
        <ResultRow k="Historical avg/mo" v={fmt(selectedHistoricalAverage)}
          formula={`Formula:\nHistorical avg/mo = total actual spending ÷ months in period.\n\n${fmt(selectedActualTotal)} ÷ ${historyPeriod.monthsIncluded} month${historyPeriod.monthsIncluded === 1 ? '' : 's'} = ${fmt(selectedHistoricalAverage)}\n\nSource: actual Transactions data only`}
        />
        <ResultRow k="Projection avg/mo" v={fmt(selectedAverage)}
          formula={`Formula:\nProjection avg/mo = baseline monthly spend used by the calculator.\n\nIt blends actual historical average with any known future obligations so the projection reflects what is realistically expected per month.\n\nSource: combined — historical Transactions + scheduled future spend\n\nValue: ${fmt(selectedAverage)}`}
        />
        <ResultRow k="Months averaged" v={historyPeriod.monthsIncluded}
          formula={`Formula:\nMonths averaged = number of full months in the selected historical period.\n\nPeriod: ${historyPeriod.label}\nMonths: ${historyPeriod.monthsIncluded}`}
        />
      </div>

      <div>
        <div style={labelStyle}>Adjustment</div>
        <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) minmax(0, 1fr)', gap: 4, marginBottom: 8 }}>
          {[
            ['decrease', 'Reduce'],
            ['increase', 'Increase'],
          ].map(([id, label]) => {
            const active = adjustmentDirection === id;
            return (
              <button
                key={id}
                type="button"
                onClick={() => { setAdjustmentDirection(id); clearPreset(); }}
                style={{
                  padding: '6px 4px',
                  border: `1px solid ${active ? themeTokens.accent : themeTokens.hairline2}`,
                  background: active ? themeTokens.accent : 'transparent',
                  color: active ? (themeTokens.isDark ? '#0B0B0D' : '#FFFFFF') : themeTokens.textDim,
                  borderRadius: 8,
                  fontFamily: 'var(--font-mono)',
                  fontSize: 9,
                  letterSpacing: '0.12em',
                  textTransform: 'uppercase',
                  cursor: 'pointer',
                }}
              >
                {label}
              </button>
            );
          })}
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) minmax(0, 1fr)', gap: 8, minWidth: 0 }}>
          <label>
            <div style={labelStyle}>Percent</div>
            <input
              type="number"
              min="0"
              max={adjustmentDirection === 'decrease' ? 100 : undefined}
              step="1"
              value={adjustmentPct}
              onChange={(event) => { setAdjustmentPct(event.target.value); clearPreset(); }}
              placeholder={adjustmentDirection === 'decrease' ? '0-100' : '0+'}
              style={monoInput}
            />
          </label>
          <label>
            <div style={labelStyle}>Fixed R$/mo</div>
            <input
              type="number"
              min="0"
              step="1"
              value={fixedAdjustment}
              onChange={(event) => { setFixedAdjustment(event.target.value); clearPreset(); }}
              placeholder="0,00"
              style={monoInput}
            />
          </label>
        </div>
      </div>

      <label>
        <div style={labelStyle}>Or monthly cap</div>
        <input
          type="number"
          min="0"
          step="1"
          value={monthlyCap}
          onChange={(event) => { setMonthlyCap(event.target.value); clearPreset(); }}
          placeholder="leave blank to ignore"
          style={monoInput}
        />
      </label>

      <div>
        <div style={labelStyle}>Projection horizon</div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, minmax(0, 1fr))', gap: 4, marginBottom: 6 }}>
          {PERIOD_KINDS.map((periodOption) => {
            const active = periodKind === periodOption.id;
            return (
              <button
                key={periodOption.id}
                type="button"
                onClick={() => { setPeriodKind(periodOption.id); clearPreset(); }}
                style={{
                  padding: '6px 4px',
                  border: `1px solid ${active ? themeTokens.accent : themeTokens.hairline2}`,
                  background: active ? themeTokens.accent : 'transparent',
                  color: active ? (themeTokens.isDark ? '#0B0B0D' : '#FFFFFF') : themeTokens.textDim,
                  borderRadius: 8,
                  fontFamily: 'var(--font-mono)',
                  fontSize: 9,
                  letterSpacing: '0.12em',
                  textTransform: 'uppercase',
                  cursor: 'pointer',
                  minWidth: 0,
                  whiteSpace: 'nowrap',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                }}
              >
                {periodOption.label}
              </button>
            );
          })}
        </div>
        {periodKind === 'untilYear' ? (
          <input
            type="number"
            min={now.getFullYear()}
            max={now.getFullYear() + 50}
            value={untilYear}
            onChange={(event) => { setUntilYear(event.target.value); clearPreset(); }}
            style={monoInput}
          />
        ) : (
          <input
            type="number"
            min={1}
            step={1}
            value={periodCount}
            onChange={(event) => { setPeriodCount(event.target.value); clearPreset(); }}
            style={monoInput}
          />
        )}
        <div style={{
          marginTop: 4,
          color: themeTokens.textFaint,
          fontFamily: 'var(--font-mono)',
          fontSize: 9,
          letterSpacing: '0.12em',
          textTransform: 'uppercase',
        }}>
          {months} month{months === 1 ? '' : 's'} ahead
        </div>
      </div>

      <div style={{
        border: `1px solid ${activeColor}66`,
        borderRadius: 12,
        padding: '10px 12px',
        background: `${activeColor}14`,
        display: 'grid',
        gap: 4,
        minWidth: 0,
      }}>
        <div style={{
          color: themeTokens.textDim,
          fontFamily: 'var(--font-mono)',
          fontSize: 9,
          letterSpacing: '0.16em',
          textTransform: 'uppercase',
        }}>
          {isAggregate ? currentRow.label : (currentRow.label || getCategoryDisplayName(currentRow.category))} · {shownLabel}
        </div>
        <ResultRow k="Baseline total" v={fmt(shown.baseline)}
          formula={`Formula:\nBaseline total = baseline monthly average × projection period.\n\n${fmt(shown.baseline / Math.max(1, shown.months))} × ${shown.months} month${shown.months === 1 ? '' : 's'} = ${fmt(shown.baseline)}\n\nThis is the spend with NO adjustment applied.\nSource: projected data`}
        />
        <ResultRow k="Projected total" v={fmt(shown.reduced)} accent={themeTokens.text}
          formula={`Formula:\nProjected total = adjusted monthly average × projection period.\n\n${fmt(shown.newMonthlyAvg ?? 0)} × ${shown.months} month${shown.months === 1 ? '' : 's'} = ${fmt(shown.reduced)}\n\n${adjustmentExplanation}\nSource: projected data`}
        />
        <ResultRow k={differenceLabel} v={fmt(Math.abs(shown.savings || 0))} accent={differenceColor}
          formula={`Formula:\n${differenceLabel} = baseline total − projected total.\n\n${fmt(shown.baseline)} − ${fmt(shown.reduced)} = ${(shown.savings || 0) >= 0 ? '' : '−'}${fmt(Math.abs(shown.savings || 0))}\n\n${isPositiveSavings ? 'A positive number means you save that much over the whole projection period.' : 'A negative number means the adjustment makes you spend MORE over the whole projection period.'}\nSource: projected data`}
        />
        <ResultRow k={`${differenceLabel}/mo`} v={fmt(Math.abs(shown.monthly || 0))} accent={differenceColor}
          formula={`Formula:\n${differenceLabel}/mo = ${differenceLabel.toLowerCase()} ÷ projection months.\n\n${fmt(Math.abs(shown.savings || 0))} ÷ ${shown.months} month${shown.months === 1 ? '' : 's'} = ${fmt(Math.abs(shown.monthly || 0))} per month\n\nSource: projected data`}
        />
        {shown.months >= 12 && (
          <ResultRow k={`${differenceLabel}/year`} v={fmt(Math.abs(shown.yearly || 0))} accent={differenceColor}
            formula={`Formula:\n${differenceLabel}/year = monthly ${differenceLabel.toLowerCase()} × 12.\n\n${fmt(Math.abs(shown.monthly || 0))} × 12 = ${fmt(Math.abs(shown.yearly || 0))}\n\nSource: projected data`}
          />
        )}
        <ResultRow k="Projected avg/mo" v={fmt(shown.newMonthlyAvg ?? 0)}
          formula={`Formula:\nProjected avg/mo = baseline monthly average after the adjustment is applied.\n\n${adjustmentExplanation}\n\nResult: ${fmt(shown.newMonthlyAvg ?? 0)} per month\nSource: projected data`}
        />
      </div>

      <div>
        <div style={labelStyle}>Quick presets</div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: 6 }}>
          {presets.map((preset) => {
            const active = activePreset === preset.id;
            const noData = !activeRows.length || (preset.scope === 'single' && selectedRows.length !== 1);
            return (
              <button
                key={preset.id}
                type="button"
                disabled={noData}
                onClick={() => runPreset(preset)}
                title={noData ? 'Select one active category for this preset' : preset.label}
                style={{
                  padding: '6px 8px',
                  border: `1px solid ${active ? themeTokens.accent : themeTokens.hairline2}`,
                  background: active ? `${themeTokens.accent}1A` : 'transparent',
                  color: noData ? themeTokens.textFaint : themeTokens.text,
                  borderRadius: 8,
                  fontFamily: 'var(--font-mono)',
                  fontSize: 9,
                  letterSpacing: '0.06em',
                  textTransform: 'uppercase',
                  cursor: noData ? 'not-allowed' : 'pointer',
                  opacity: noData ? 0.4 : 1,
                  textAlign: 'left',
                  minWidth: 0,
                  whiteSpace: 'normal',
                  lineHeight: 1.2,
                }}
              >
                {preset.label}
              </button>
            );
          })}
        </div>
        {(activePreset || presetResult) && (
          <button
            type="button"
            onClick={clearPreset}
            style={{
              marginTop: 8,
              background: 'transparent',
              border: 'none',
              color: themeTokens.textDim,
              cursor: 'pointer',
              fontFamily: 'var(--font-mono)',
              fontSize: 9,
              letterSpacing: '0.12em',
              textTransform: 'uppercase',
            }}
          >
            Clear preset x
          </button>
        )}
      </div>
    </div>
  );
};
