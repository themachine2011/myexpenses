import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
} from 'recharts';
import { useAppContext, CATEGORIES, MOTO_AMOUNT } from './context.jsx';
import { WheelPeriodSelector } from './2026-05-19-component-wheel-period-selector.jsx';
import {
  buildCategoryAverageRows,
  buildComparisonPeriod,
  buildFullHistoryCategoryAverageRows,
  buildYearToMonthPeriod,
  FINANCING_CATEGORY,
} from './2026-05-19-logic-category-average-calculation.js';
import {
  getCategoryDisplayName,
  HIGH_SPENDING_RED,
  TRIUMPH_FINANCING_RED,
  valueColor,
} from './2026-05-19-utils-category-colors.js';
import { InlineCardTitle } from './card-explanations.jsx';
import { LockedReferenceCard } from './2026-05-18-component-locked-reference-card.jsx';
import { usePieInteractions, BlackOutlineActiveShape } from './2026-05-20-hook-pie-interactions.jsx';
import { getInvertedCardTokens } from './2026-05-20-utils-inverted-card.js';

const MONTH_OPTIONS = Array.from({ length: 12 }, (_, month) => ({
  value: month,
  label: new Date(2026, month, 1).toLocaleString('en-US', { month: 'short' }),
}));

const QUARTER_OPTIONS = [
  { value: 1, label: 'Q1' },
  { value: 2, label: 'Q2' },
  { value: 3, label: 'Q3' },
  { value: 4, label: 'Q4' },
];

const SEMESTER_OPTIONS = [
  { value: 1, label: 'H1' },
  { value: 2, label: 'H2' },
];

const yearOptions = (centerYear) =>
  Array.from({ length: 10 }, (_, index) => {
    const year = centerYear - 5 + index;
    return { value: year, label: String(year) };
  });

const modeOptions = [
  { value: 'month', label: 'Months' },
  { value: 'trimester', label: 'Trimesters' },
  { value: 'semester', label: 'Semesters' },
  { value: 'year', label: 'Years' },
];

const fmtCompact = (value) => {
  const amount = Number(value) || 0;
  if (Math.abs(amount) >= 1000) return `R$${(amount / 1000).toFixed(1).replace('.', ',')}k`;
  return `R$${Math.round(amount)}`;
};

const CategoryTooltip = ({ active, payload, label, tokens, fmt }) => {
  if (!active || !payload?.length) return null;
  return (
    <div style={{
      background: tokens.tooltipBg,
      border: `1px solid ${tokens.hairline2}`,
      borderRadius: 12,
      padding: '10px 12px',
      boxShadow: '0 18px 42px rgba(0,0,0,0.35)',
      fontFamily: 'var(--font-body)',
    }}>
      <div style={{
        color: tokens.textDim,
        fontFamily: 'var(--font-mono)',
        fontSize: 10,
        letterSpacing: '0.18em',
        textTransform: 'uppercase',
        marginBottom: 6,
      }}>{label}</div>
      {payload.map((item, index) => {
        const category = item.payload?.category || item.payload?.name || label;
        const color = valueColor(item.value, category, tokens.text);
        return (
          <div key={index} style={{ display: 'flex', justifyContent: 'space-between', gap: 14, fontSize: 12 }}>
            <span style={{ color: tokens.textDim, display: 'inline-flex', alignItems: 'center', gap: 6 }}>
              <span style={{ width: 8, height: 8, borderRadius: 2, background: item.color || item.payload?.color }} />
              {item.name}
            </span>
            <span style={{ color, fontFamily: 'var(--font-mono)' }}>{fmt(item.value)}</span>
          </div>
        );
      })}
    </div>
  );
};

const useActiveRotation = () => {
  const wrapRef = useRef(null);
  const activeChartRef = useRef(null);
  const [activeChart, setActiveChart] = useState(null);
  const [pieRotation, setPieRotation] = useState(0);
  const [barRotation, setBarRotation] = useState(0);

  useEffect(() => {
    activeChartRef.current = activeChart;
  }, [activeChart]);

  useEffect(() => {
    const onPointerDown = (event) => {
      if (!wrapRef.current?.contains(event.target)) setActiveChart(null);
    };
    document.addEventListener('pointerdown', onPointerDown);
    return () => document.removeEventListener('pointerdown', onPointerDown);
  }, []);

  useEffect(() => {
    const el = wrapRef.current;
    if (!el) return undefined;
    const onWheel = (event) => {
      const chartEl = event.target?.closest?.('[data-category-average-chart]');
      if (!chartEl || !el.contains(chartEl)) return;
      const chart = chartEl.getAttribute('data-category-average-chart');
      if (activeChartRef.current !== chart) return;
      event.preventDefault();
      const delta = event.deltaY > 0 ? 8 : -8;
      if (chart === 'pie') setPieRotation((value) => value + delta);
      if (chart === 'bar') setBarRotation((value) => value + delta);
    };
    el.addEventListener('wheel', onWheel, { passive: false });
    return () => el.removeEventListener('wheel', onWheel);
  }, []);

  return {
    wrapRef,
    activeChart,
    setActiveChart,
    pieRotation,
    barRotation,
  };
};

const PeriodPairSelector = ({ mode, periodA, periodB, onChangeA, onChangeB }) => {
  const { themeTokens } = useAppContext();
  const inv = getInvertedCardTokens(themeTokens);
  const years = yearOptions(new Date().getFullYear());

  const selectForMode = (period, onChange, prefix) => {
    if (mode === 'trimester') {
      return (
        <>
          <WheelPeriodSelector compact label={`${prefix} Period`} options={QUARTER_OPTIONS} value={period.quarter} onChange={(quarter) => onChange({ ...period, quarter })} />
          <WheelPeriodSelector compact label={`${prefix} Year`} options={years} value={period.year} onChange={(year) => onChange({ ...period, year })} />
        </>
      );
    }
    if (mode === 'semester') {
      return (
        <>
          <WheelPeriodSelector compact label={`${prefix} Period`} options={SEMESTER_OPTIONS} value={period.semester} onChange={(semester) => onChange({ ...period, semester })} />
          <WheelPeriodSelector compact label={`${prefix} Year`} options={years} value={period.year} onChange={(year) => onChange({ ...period, year })} />
        </>
      );
    }
    if (mode === 'year') {
      return (
        <WheelPeriodSelector compact label={`${prefix} Year`} options={years} value={period.year} onChange={(year) => onChange({ ...period, year })} />
      );
    }
    return (
      <>
        <WheelPeriodSelector compact label={`${prefix} Month`} options={MONTH_OPTIONS} value={period.month} onChange={(month) => onChange({ ...period, month })} />
        <WheelPeriodSelector compact label={`${prefix} Year`} options={years} value={period.year} onChange={(year) => onChange({ ...period, year })} />
      </>
    );
  };

  return (
    <div style={{
      display: 'grid',
      gap: 10,
      padding: 10,
      border: `1px solid ${inv.border}`,
      borderRadius: 12,
      background: inv.bg,
      color: inv.fg,
      minWidth: 0,
      overflow: 'hidden',
    }}>
      <div style={{ display: 'grid', gap: 10, minWidth: 0 }}>
        <div style={{ display: 'grid', gridTemplateColumns: mode === 'year' ? '1fr' : '1fr 1fr', gap: 8, minWidth: 0 }}>
          {selectForMode(periodA, onChangeA, 'A')}
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: mode === 'year' ? '1fr' : '1fr 1fr', gap: 8, minWidth: 0 }}>
          {selectForMode(periodB, onChangeB, 'B')}
        </div>
      </div>
    </div>
  );
};

export const CategoryAverageChartSection = ({ selectedMonthYear }) => {
  const {
    transactions,
    recurring,
    themeTokens,
    fmt,
    categoryColorOverrides,
    getCategoryColor,
    getDefaultCategoryColor,
    setCategoryColor,
    resetCategoryColor,
  } = useAppContext();
  const rotation = useActiveRotation();
  const pie = usePieInteractions();
  const now = new Date();
  const [visibleCategories, setVisibleCategories] = useState(() =>
    new Set(CATEGORIES.filter((category) => category !== FINANCING_CATEGORY && category !== 'Income'))
  );
  const [colorCategory, setColorCategory] = useState(() =>
    CATEGORIES.find((category) => category !== FINANCING_CATEGORY && category !== 'Income') || CATEGORIES[0]
  );
  const [compareMode, setCompareMode] = useState('month');
  const [periodA, setPeriodA] = useState(() => ({
    year: selectedMonthYear.year,
    month: selectedMonthYear.month,
    quarter: Math.floor(selectedMonthYear.month / 3) + 1,
    semester: selectedMonthYear.month < 6 ? 1 : 2,
  }));
  const [periodB, setPeriodB] = useState(() => {
    const prior = new Date(selectedMonthYear.year, selectedMonthYear.month - 1, 1);
    return {
      year: prior.getFullYear(),
      month: prior.getMonth(),
      quarter: Math.floor(prior.getMonth() / 3) + 1,
      semester: prior.getMonth() < 6 ? 1 : 2,
    };
  });

  useEffect(() => {
    setPeriodA((current) => ({
      ...current,
      year: selectedMonthYear.year,
      month: selectedMonthYear.month,
      quarter: Math.floor(selectedMonthYear.month / 3) + 1,
      semester: selectedMonthYear.month < 6 ? 1 : 2,
    }));
  }, [selectedMonthYear.year, selectedMonthYear.month]);

  const ytdPeriod = useMemo(
    () => buildYearToMonthPeriod(selectedMonthYear, now),
    [selectedMonthYear.year, selectedMonthYear.month]
  );

  const allRows = useMemo(() => buildCategoryAverageRows({
    transactions,
    recurring,
    categories: CATEGORIES,
    period: ytdPeriod,
    motoAmount: MOTO_AMOUNT,
  }), [transactions, recurring, ytdPeriod.from.getTime(), ytdPeriod.to.getTime(), ytdPeriod.monthsIncluded]);

  const lockedRows = useMemo(() => buildFullHistoryCategoryAverageRows({
    transactions,
    recurring,
    categories: CATEGORIES,
    to: ytdPeriod.to,
    motoAmount: MOTO_AMOUNT,
  }), [transactions, recurring, ytdPeriod.to.getTime()]);

  const lockedByCategory = useMemo(
    () => new Map(lockedRows.map((row) => [row.category, row])),
    [lockedRows]
  );

  useEffect(() => {
    setVisibleCategories((current) => {
      const next = new Set(current);
      for (const row of allRows) {
        if (!row.isTriumphFinancing && !next.has(row.category)) next.add(row.category);
      }
      next.delete(FINANCING_CATEGORY);
      return next;
    });
  }, [allRows]);

  const categoryOptions = allRows;
  useEffect(() => {
    if (categoryOptions.some((row) => row.category === colorCategory)) return;
    const next = categoryOptions.find((row) => !row.isTriumphFinancing)?.category || categoryOptions[0]?.category;
    if (next) setColorCategory(next);
  }, [categoryOptions, colorCategory]);

  const visibleRows = allRows
    .filter((row) => visibleCategories.has(row.category))
    .filter((row) => row.average > 0)
    .sort((a, b) => b.average - a.average);

  const pieData = visibleRows.map((row) => ({
    name: row.label,
    category: row.category,
    value: row.average,
    color: getCategoryColor(row.category),
  }));

  const comparisonA = useMemo(() => buildComparisonPeriod(compareMode, periodA, now), [compareMode, periodA]);
  const comparisonB = useMemo(() => buildComparisonPeriod(compareMode, periodB, now), [compareMode, periodB]);
  const rowsA = useMemo(() => buildCategoryAverageRows({
    transactions,
    recurring,
    categories: CATEGORIES,
    period: comparisonA,
    motoAmount: MOTO_AMOUNT,
  }), [transactions, recurring, comparisonA.from.getTime(), comparisonA.to.getTime(), comparisonA.monthsIncluded]);
  const rowsB = useMemo(() => buildCategoryAverageRows({
    transactions,
    recurring,
    categories: CATEGORIES,
    period: comparisonB,
    motoAmount: MOTO_AMOUNT,
  }), [transactions, recurring, comparisonB.from.getTime(), comparisonB.to.getTime(), comparisonB.monthsIncluded]);

  const comparisonPanes = useMemo(() => {
    const buildPaneRows = (rows) => rows
      .filter((row) => visibleCategories.has(row.category))
      .map((row) => ({
        category: row.category,
        name: getCategoryDisplayName(row.category),
        value: row.average,
        color: getCategoryColor(row.category),
      }))
      .filter((row) => row.value > 0)
      .sort((a, b) => b.value - a.value)
      .slice(0, 6);
    const a = buildPaneRows(rowsA);
    const b = buildPaneRows(rowsB);
    const max = Math.max(1, ...a.map((row) => row.value), ...b.map((row) => row.value));
    return { a, b, max };
  }, [rowsA, rowsB, visibleCategories, getCategoryColor]);

  const totalAverage = visibleRows.reduce((sum, row) => sum + row.average, 0);
  const lockedDailyAverage = visibleRows.reduce(
    (sum, row) => sum + (Number(lockedByCategory.get(row.category)?.averagePerDay) || 0),
    0
  );
  const lockedMonthlyAverage = visibleRows.reduce(
    (sum, row) => sum + (Number(lockedByCategory.get(row.category)?.averagePerMonth) || 0),
    0
  );
  const lockedPeriodLabel = lockedRows[0]?.periodLabel || 'Full history';
  const selectedColor = getCategoryColor(colorCategory);
  const defaultColor = getDefaultCategoryColor(colorCategory);
  const hasCustomColor = selectedColor !== defaultColor || !!categoryColorOverrides?.[colorCategory];

  const inv = getInvertedCardTokens(themeTokens);
  const invCardBg = inv.bg;
  const invCardFg = inv.fg;
  const invCardMuted = inv.muted;
  const invCardFaint = inv.faint;
  const invCardBorder = inv.border;

  const chartFrame = (chart, children) => (
    <div
      role="button"
      tabIndex={0}
      onClick={() => rotation.setActiveChart(chart)}
      onKeyDown={(event) => {
        if (event.key === 'Enter' || event.key === ' ') rotation.setActiveChart(chart);
      }}
      data-category-average-chart={chart}
      style={{
        border: `1px solid ${rotation.activeChart === chart ? themeTokens.accent : inv.border}`,
        borderRadius: 14,
        background: inv.bg,
        color: inv.fg,
        padding: 10,
        width: '100%',
        minWidth: 0,
        overflow: 'hidden',
        boxSizing: 'border-box',
        cursor: rotation.activeChart === chart ? 'ns-resize' : 'pointer',
        outline: 'none',
        transition: 'border 180ms, box-shadow 180ms',
        boxShadow: rotation.activeChart === chart ? `0 0 0 3px ${themeTokens.accent}16` : 'none',
      }}
    >
      {children}
    </div>
  );

  const toggleCategory = (category) => {
    setVisibleCategories((current) => {
      const next = new Set(current);
      if (next.has(category)) next.delete(category);
      else next.add(category);
      return next;
    });
  };

  const comparisonPane = (period, rows, side) => {
    const total = rows.reduce((sum, row) => sum + row.value, 0);
    return (
      <div style={{
        minWidth: 0,
        padding: side === 'left' ? '10px 10px 10px 0' : '10px 0 10px 10px',
        borderRight: side === 'left' ? `1px solid ${inv.border}` : 'none',
        display: 'grid',
        gridTemplateRows: 'auto 1fr',
        gap: 10,
        overflow: 'hidden',
      }}>
        <div style={{
          minWidth: 0,
          paddingBottom: 8,
          borderBottom: `1px solid ${inv.hairline}`,
          textAlign: 'center',
        }}>
          <div style={{
            color: themeTokens.accent,
            fontFamily: 'var(--font-mono)',
            fontSize: 10,
            letterSpacing: '0.16em',
            textTransform: 'uppercase',
            whiteSpace: 'nowrap',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
          }}>
            {period.label}
          </div>
          <div style={{
            color: inv.fg,
            fontFamily: 'var(--font-mono)',
            fontSize: 12,
            marginTop: 4,
          }}>
            {fmt(total)}
          </div>
        </div>

        <div style={{ display: 'grid', gap: 8, alignContent: 'start', minWidth: 0, overflow: 'hidden' }}>
          {rows.length === 0 ? (
            <div style={{ color: inv.muted, fontSize: 12, textAlign: 'center', padding: '28px 4px' }}>
              No spending.
            </div>
          ) : rows.map((row) => {
            const width = `${Math.max(4, Math.min(100, (row.value / comparisonPanes.max) * 100))}%`;
            const amountColor = valueColor(row.value, row.category, inv.muted);
            return (
              <div key={`${period.label}-${row.category}`} style={{ minWidth: 0, display: 'grid', gap: 4 }}>
                <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) auto', gap: 6, alignItems: 'baseline' }}>
                  <span style={{
                    color: inv.fg,
                    fontSize: 11,
                    lineHeight: 1.15,
                    whiteSpace: 'nowrap',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                  }}>
                    {row.name}
                  </span>
                  <span style={{
                    color: amountColor,
                    fontFamily: 'var(--font-mono)',
                    fontSize: 10,
                    whiteSpace: 'nowrap',
                  }}>
                    {fmtCompact(row.value)}
                  </span>
                </div>
                <div style={{
                  height: 7,
                  borderRadius: 999,
                  background: inv.border,
                  overflow: 'hidden',
                }}>
                  <div style={{
                    width,
                    height: '100%',
                    borderRadius: 999,
                    background: row.color,
                    boxShadow: `0 0 10px ${row.color}55`,
                  }} />
                </div>
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  return (
    <div ref={rotation.wrapRef} style={{
      background: themeTokens.surface,
      border: `1px solid ${themeTokens.hairline}`,
      borderRadius: 16,
      padding: 16,
      display: 'grid',
      gap: 14,
      width: '100%',
      minWidth: 0,
      boxSizing: 'border-box',
      overflow: 'hidden',
    }}>
      <div>
        <InlineCardTitle style={{
          fontFamily: 'var(--font-mono)',
          fontSize: 10,
          letterSpacing: '0.28em',
          textTransform: 'uppercase',
          color: themeTokens.textDim,
        }}>Average by Category</InlineCardTitle>
        <div style={{
          marginTop: 4,
          color: themeTokens.text,
          fontFamily: 'var(--font-display)',
          fontWeight: 700,
          fontSize: 24,
          lineHeight: 1,
        }}>{fmt(totalAverage)}</div>
        <div style={{
          marginTop: 4,
          color: themeTokens.textFaint,
          fontFamily: 'var(--font-mono)',
          fontSize: 10,
          letterSpacing: '0.12em',
          textTransform: 'uppercase',
        }}>{ytdPeriod.label} avg over {ytdPeriod.monthsIncluded} mo</div>
      </div>

      <div style={{
        border: `1px solid ${invCardBorder}`,
        borderRadius: 12,
        padding: 10,
        background: invCardBg,
        color: invCardFg,
        display: 'grid',
        gap: 8,
        minWidth: 0,
      }}>
        <div style={{
          color: invCardMuted,
          fontFamily: 'var(--font-mono)',
          fontSize: 9,
          letterSpacing: '0.18em',
          textTransform: 'uppercase',
        }}>
          Category colors
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) auto auto', gap: 8, alignItems: 'center' }}>
          <select
            value={colorCategory}
            onChange={(event) => setColorCategory(event.target.value)}
            style={{
              minWidth: 0,
              width: '100%',
              background: 'transparent',
              border: `1px solid ${invCardBorder}`,
              borderRadius: 8,
              color: invCardFg,
              cursor: 'pointer',
              fontFamily: 'var(--font-body)',
              fontSize: 12,
              outline: 'none',
              padding: '7px 8px',
            }}
          >
            {categoryOptions.map((row) => (
              <option key={row.category} value={row.category}>
                {row.label}
              </option>
            ))}
          </select>
          <input
            type="color"
            value={selectedColor}
            onChange={(event) => setCategoryColor(colorCategory, event.target.value)}
            aria-label={`Color for ${getCategoryDisplayName(colorCategory)}`}
            style={{
              width: 42,
              height: 32,
              padding: 2,
              border: `1px solid ${invCardBorder}`,
              borderRadius: 8,
              background: 'transparent',
              cursor: 'pointer',
            }}
          />
          <button
            type="button"
            disabled={!hasCustomColor}
            onClick={() => resetCategoryColor(colorCategory)}
            style={{
              border: `1px solid ${invCardBorder}`,
              background: 'transparent',
              borderRadius: 8,
              color: hasCustomColor ? invCardMuted : invCardFaint,
              cursor: hasCustomColor ? 'pointer' : 'not-allowed',
              fontFamily: 'var(--font-mono)',
              fontSize: 9,
              letterSpacing: '0.1em',
              opacity: hasCustomColor ? 1 : 0.5,
              padding: '8px 9px',
              textTransform: 'uppercase',
            }}
          >
            Reset
          </button>
        </div>
      </div>

      <LockedReferenceCard front={(
        <div style={{
          border: `1px solid ${invCardBorder}`,
          borderRadius: 12,
          padding: 10,
          background: invCardBg,
          color: invCardFg,
          display: 'grid',
          gap: 8,
        }}>
          <div style={{
            color: invCardMuted,
            fontFamily: 'var(--font-mono)',
            fontSize: 9,
            letterSpacing: '0.18em',
            textTransform: 'uppercase',
          }}>
            Locked reference
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
            <div>
              <div style={{ color: invCardFaint, fontFamily: 'var(--font-mono)', fontSize: 9, letterSpacing: '0.12em', textTransform: 'uppercase' }}>
                Avg / day
              </div>
              <div style={{ color: invCardFg, fontFamily: 'var(--font-mono)', fontSize: 13, marginTop: 3 }}>
                {fmt(lockedDailyAverage)}
              </div>
            </div>
            <div>
              <div style={{ color: invCardFaint, fontFamily: 'var(--font-mono)', fontSize: 9, letterSpacing: '0.12em', textTransform: 'uppercase' }}>
                Avg / month
              </div>
              <div style={{ color: invCardFg, fontFamily: 'var(--font-mono)', fontSize: 13, marginTop: 3 }}>
                {fmt(lockedMonthlyAverage)}
              </div>
            </div>
          </div>
          <div style={{
            color: invCardFaint,
            fontFamily: 'var(--font-mono)',
            fontSize: 9,
            letterSpacing: '0.12em',
            textTransform: 'uppercase',
            lineHeight: 1.45,
          }}>
            {lockedPeriodLabel} · ignores comparison filters · click to flip ↻
          </div>
        </div>
      )} />

      <div
        ref={pie.containerRef}
        {...pie.containerProps}
        data-category-average-chart="pie"
        style={{
          border: `1px solid ${pie.active ? themeTokens.accent : invCardBorder}`,
          borderRadius: 14,
          background: invCardBg,
          color: invCardFg,
          padding: 10,
          width: '100%',
          minWidth: 0,
          overflow: 'hidden',
          boxSizing: 'border-box',
          cursor: pie.active ? 'ns-resize' : 'pointer',
          outline: 'none',
          transition: 'border 180ms, box-shadow 180ms',
          boxShadow: pie.active ? `0 0 0 3px ${themeTokens.accent}16` : 'none',
        }}
      >
        <div style={{ display: 'grid', gap: 8 }}>
          <InlineCardTitle explanationKey="Distribution" style={{ color: invCardMuted, fontFamily: 'var(--font-mono)', fontSize: 9, letterSpacing: '0.2em', textTransform: 'uppercase' }}>
            Distribution
          </InlineCardTitle>
          <div style={{ height: 188 }}>
            {pieData.length ? (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={pieData}
                    dataKey="value"
                    innerRadius={44}
                    outerRadius={72}
                    paddingAngle={2}
                    {...pie.pieRotationProps}
                    {...pie.pieHoverProps}
                    activeShape={BlackOutlineActiveShape}
                    isAnimationActive
                    animationDuration={600}
                  >
                    {pieData.map((entry) => (
                      <Cell key={entry.category} fill={entry.color} stroke="none" />
                    ))}
                  </Pie>
                  <Tooltip content={(props) => <CategoryTooltip {...props} tokens={themeTokens} fmt={fmt} />} />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div style={{ height: '100%', display: 'grid', placeItems: 'center', color: invCardFaint, fontSize: 12 }}>
                No visible spending.
              </div>
            )}
          </div>
        </div>
      </div>

      <div style={{ display: 'grid', gap: 8 }}>
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
          {modeOptions.map((mode) => (
            <button
              key={mode.value}
              type="button"
              onClick={() => setCompareMode(mode.value)}
              style={{
                border: `1px solid ${compareMode === mode.value ? themeTokens.accent : themeTokens.hairline2}`,
                background: compareMode === mode.value ? themeTokens.accent : 'transparent',
                color: compareMode === mode.value ? '#0B0B0D' : themeTokens.textDim,
                borderRadius: 999,
                padding: '6px 8px',
                fontFamily: 'var(--font-mono)',
                fontSize: 9,
                letterSpacing: '0.1em',
                textTransform: 'uppercase',
                cursor: 'pointer',
              }}
            >
              {mode.label}
            </button>
          ))}
        </div>
        <PeriodPairSelector
          mode={compareMode}
          periodA={periodA}
          periodB={periodB}
          onChangeA={setPeriodA}
          onChangeB={setPeriodB}
        />
      </div>

      {chartFrame('bar', (
        <div style={{
          display: 'grid',
          gap: 10,
          transform: `perspective(900px) rotateY(${rotation.barRotation}deg)`,
          transformStyle: 'preserve-3d',
          transition: 'transform 180ms cubic-bezier(0.22,1,0.36,1)',
          willChange: 'transform',
        }}>
          <InlineCardTitle style={{ color: themeTokens.textDim, fontFamily: 'var(--font-mono)', fontSize: 9, letterSpacing: '0.2em', textTransform: 'uppercase' }}>
            Period comparison
          </InlineCardTitle>
          <div style={{
            minHeight: 248,
            display: 'grid',
            gridTemplateColumns: 'minmax(0, 1fr) minmax(0, 1fr)',
            gap: 0,
            overflow: 'hidden',
          }}>
            {comparisonPanes.a.length || comparisonPanes.b.length ? (
              <>
                {comparisonPane(comparisonA, comparisonPanes.a, 'left')}
                {comparisonPane(comparisonB, comparisonPanes.b, 'right')}
              </>
            ) : (
              <div style={{ gridColumn: '1 / -1', display: 'grid', placeItems: 'center', color: themeTokens.textDim, fontSize: 12 }}>
                No comparison data.
              </div>
            )}
          </div>
        </div>
      ))}

      <details style={{
        border: `1px solid ${invCardBorder}`,
        borderRadius: 12,
        padding: 10,
        background: invCardBg,
        color: invCardFg,
      }}>
        <summary style={{
          cursor: 'pointer',
          color: invCardFg,
          fontFamily: 'var(--font-mono)',
          fontSize: 10,
          letterSpacing: '0.16em',
          textTransform: 'uppercase',
        }}>
          Categories ({visibleCategories.size})
        </summary>
        <div style={{ display: 'grid', gap: 8, marginTop: 10, maxHeight: 220, overflow: 'auto' }}>
          {categoryOptions.map((row) => {
            const checked = visibleCategories.has(row.category);
            const color = getCategoryColor(row.category);
            const amountColor = valueColor(row.average, row.category, invCardMuted);
            const locked = lockedByCategory.get(row.category);
            return (
              <label key={row.category} style={{
                display: 'grid',
                gridTemplateColumns: 'auto 1fr auto',
                alignItems: 'center',
                gap: 8,
                cursor: 'pointer',
                color: invCardFg,
                fontSize: 12,
              }}>
                <input
                  type="checkbox"
                  checked={checked}
                  onChange={() => toggleCategory(row.category)}
                  style={{ width: 14, height: 14, accentColor: color, cursor: 'pointer' }}
                />
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: 8, minWidth: 0 }}>
                  <span style={{ width: 8, height: 8, borderRadius: 2, background: color, flexShrink: 0 }} />
                  <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{row.label}</span>
                </span>
                <span style={{
                  color: amountColor,
                  fontFamily: 'var(--font-mono)',
                  fontSize: 11,
                  whiteSpace: 'nowrap',
                  display: 'grid',
                  gap: 2,
                  justifyItems: 'end',
                }}>
                  <span>{fmt(row.average)}</span>
                  <span style={{ color: invCardFaint, fontSize: 9 }}>
                    {fmt(locked?.averagePerDay || 0)}/d · {fmt(locked?.averagePerMonth || 0)}/mo
                  </span>
                </span>
              </label>
            );
          })}
        </div>
        <div style={{
          marginTop: 10,
          display: 'flex',
          gap: 8,
          flexWrap: 'wrap',
          color: themeTokens.textFaint,
          fontFamily: 'var(--font-mono)',
          fontSize: 9,
          letterSpacing: '0.12em',
          textTransform: 'uppercase',
        }}>
          <span style={{ color: HIGH_SPENDING_RED }}>Over R$750</span>
          <span style={{ color: TRIUMPH_FINANCING_RED }}>Triumph financing</span>
        </div>
      </details>
    </div>
  );
};
