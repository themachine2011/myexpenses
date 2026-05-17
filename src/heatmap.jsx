import React, { useMemo } from 'react';
import { useAppContext } from './context.jsx';

// CalendarHeatmap — GitHub-style daily spending intensity grid for the last
// ~52 weeks. Each cell is one day; opacity scales with that day's total expense.
// `data` is a { 'YYYY-MM-DD': totalExpenses } map (provided via context.dailySpendMap).
// `onDayClick(isoDate)` lets callers (e.g. Dashboard) navigate to a filtered view.
export const CalendarHeatmap = ({ data, themeTokens, fmt, weeks = 52, onDayClick }) => {
  const { cells, max } = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    // Align to the end of the current week (Saturday) so the rightmost column
    // is fully populated.
    const end = new Date(today);
    end.setDate(end.getDate() + (6 - end.getDay()));
    const start = new Date(end);
    start.setDate(start.getDate() - (weeks * 7 - 1));
    const out = [];
    let max = 0;
    for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
      const k = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
      const v = (data && data[k]) || 0;
      max = Math.max(max, v);
      out.push({ key: k, date: new Date(d), value: v });
    }
    return { cells: out, max };
  }, [data, weeks]);

  // Group cells into columns (weeks). Column index = floor((cell index) / 7).
  // Within a column, day-of-week order is Sun(0) … Sat(6).
  const cols = [];
  for (let i = 0; i < cells.length; i += 7) cols.push(cells.slice(i, i + 7));

  const intensity = (v) => {
    if (!v || max === 0) return 0;
    return 0.12 + (v / max) * 0.8; // 0.12 floor so empty-with-zero ≠ tiny-with-zero
  };

  // Month labels at the top of the grid. We label each column whose first
  // cell is in a new month vs. the previous column.
  const monthLabels = cols.map((col, i) => {
    const m = col[0]?.date.getMonth();
    if (i === 0) return col[0].date.toLocaleString('en-US', { month: 'short' });
    const prevM = cols[i - 1][0]?.date.getMonth();
    if (m !== prevM) return col[0].date.toLocaleString('en-US', { month: 'short' });
    return '';
  });

  const CELL = 11;
  const GAP  = 3;

  return (
    <div style={{ overflowX: 'auto' }}>
      <div style={{ display: 'inline-grid', gridTemplateColumns: `auto repeat(${cols.length}, ${CELL}px)`, gap: GAP, alignItems: 'start' }}>
        {/* empty top-left corner */}
        <div />
        {monthLabels.map((m, i) => (
          <div key={i} style={{
            fontFamily: 'var(--font-mono)', fontSize: 9,
            color: themeTokens.textDim, letterSpacing: '0.18em', textTransform: 'uppercase',
            textAlign: 'left', minHeight: 12,
          }}>{m}</div>
        ))}
        {/* DOW labels column + cells */}
        {[0, 1, 2, 3, 4, 5, 6].map((dow) => (
          <React.Fragment key={dow}>
            <div style={{
              fontFamily: 'var(--font-mono)', fontSize: 8, color: themeTokens.textFaint,
              paddingRight: 6, alignSelf: 'center', minWidth: 18, textAlign: 'right',
            }}>
              {dow === 1 ? 'Mon' : dow === 3 ? 'Wed' : dow === 5 ? 'Fri' : ''}
            </div>
            {cols.map((col, i) => {
              const cell = col[dow];
              if (!cell) return <div key={i} style={{ width: CELL, height: CELL }} />;
              const op = intensity(cell.value);
              const clickable = !!onDayClick && cell.value > 0;
              return (
                <div key={i}
                  title={`${cell.key} · ${fmt ? fmt(cell.value) : cell.value}${clickable ? ' · click to filter' : ''}`}
                  onClick={clickable ? () => onDayClick(cell.key) : undefined}
                  style={{
                    width: CELL, height: CELL, borderRadius: 2,
                    background: cell.value > 0
                      ? `${themeTokens.accent}${Math.round(op * 255).toString(16).padStart(2, '0')}`
                      : themeTokens.surface2,
                    transition: 'background 200ms, transform 120ms',
                    cursor: clickable ? 'pointer' : 'default',
                  }}
                  onMouseEnter={clickable ? (e) => { e.currentTarget.style.transform = 'scale(1.5)'; } : undefined}
                  onMouseLeave={clickable ? (e) => { e.currentTarget.style.transform = 'scale(1)'; } : undefined}
                />
              );
            })}
          </React.Fragment>
        ))}
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 12, color: themeTokens.textDim, fontFamily: 'var(--font-mono)', fontSize: 10, letterSpacing: '0.18em', textTransform: 'uppercase' }}>
        Less
        {[0.12, 0.32, 0.52, 0.72, 0.92].map((op) => (
          <div key={op} style={{
            width: CELL, height: CELL, borderRadius: 2,
            background: `${themeTokens.accent}${Math.round(op * 255).toString(16).padStart(2, '0')}`,
          }} />
        ))}
        More · Peak day {fmt ? fmt(max) : max}
      </div>
    </div>
  );
};

// Convenience wrapper that pulls data from context. Clicking a populated day
// jumps to the All Purchases view with the date range pinned to that day.
export const SpendHeatmapSurface = ({ Surface, Eyebrow }) => {
  const { dailySpendMap, themeTokens, fmt, setView, setDateFilter } = useAppContext();
  const data = useMemo(() => dailySpendMap(365), [dailySpendMap]);
  const handleDayClick = (isoDay) => {
    if (!isoDay) return;
    setDateFilter({ kind: 'custom', from: isoDay, to: isoDay });
    setView('allTransactions');
  };
  return (
    <Surface>
      <Eyebrow>Daily Spending · 52-week heatmap</Eyebrow>
      <div style={{ height: 16 }} />
      <CalendarHeatmap data={data} themeTokens={themeTokens} fmt={fmt} weeks={52}
        onDayClick={handleDayClick} />
    </Surface>
  );
};
