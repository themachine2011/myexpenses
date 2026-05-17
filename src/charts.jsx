import React, { useEffect, useMemo, useState } from 'react';
import {
  ResponsiveContainer, AreaChart, Area, LineChart, Line, BarChart, Bar,
  PieChart, Pie, Cell, RadarChart, Radar, PolarGrid, PolarAngleAxis,
  XAxis, YAxis, CartesianGrid, Tooltip, ComposedChart,
} from 'recharts';
import { fmtCurrency } from './tokens.jsx';
import { useAppContext } from './context.jsx';

export const AuTooltip = ({ active, payload, label, tokens, fmt }) => {
  if (!active || !payload || !payload.length) return null;
  return (
    <div style={{
      background: tokens.tooltipBg,
      border: `1px solid ${tokens.hairline2}`,
      borderRadius: 12, padding: '10px 14px',
      backdropFilter: 'blur(20px)', WebkitBackdropFilter: 'blur(20px)',
      boxShadow: '0 20px 50px rgba(0,0,0,0.4)',
      fontFamily: 'var(--font-body)',
    }}>
      <div style={{ fontSize: 11, letterSpacing: '0.18em', textTransform:'uppercase', color: tokens.textDim, marginBottom: 6 }}>{label}</div>
      {payload.map((p, i) => (
        <div key={i} style={{ display:'flex', justifyContent:'space-between', gap: 18, fontSize: 13 }}>
          <span style={{ color: tokens.textDim, display:'flex', alignItems:'center', gap: 6 }}>
            <span style={{ width: 8, height: 8, borderRadius: 2, background: p.color || p.payload?.fill }} />
            {p.name}
          </span>
          <span style={{ color: tokens.text, fontFamily:'var(--font-mono)', fontWeight: 400 }}>{fmt ? fmt(p.value) : p.value}</span>
        </div>
      ))}
    </div>
  );
};

export const AreaSpark = ({ data, dataKey, accent, tokens, height = 220 }) => {
  const id = `gr-${dataKey}-${accent.replace('#','')}`;
  return (
    <ResponsiveContainer width="100%" height={height}>
      <AreaChart data={data} margin={{ top: 10, right: 6, left: 6, bottom: 0 }}>
        <defs>
          <linearGradient id={id} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={accent} stopOpacity={0.45} />
            <stop offset="100%" stopColor={accent} stopOpacity={0} />
          </linearGradient>
        </defs>
        <CartesianGrid stroke={tokens.grid} strokeDasharray="2 4" vertical={false} />
        <XAxis dataKey="label" tickLine={false} axisLine={false}
               tick={{ fill: tokens.textDim, fontSize: 11, fontFamily: 'var(--font-mono)' }} />
        <YAxis hide domain={['dataMin - 200', 'dataMax + 400']} />
        <Tooltip content={(p) => <AuTooltip {...p} tokens={tokens} fmt={(v)=>fmtCurrency(v,'BRL')} />} cursor={{ stroke: tokens.hairline2 }} />
        <Area type="monotone" dataKey={dataKey} stroke={accent} strokeWidth={2}
              fill={`url(#${id})`} isAnimationActive animationDuration={1100} />
      </AreaChart>
    </ResponsiveContainer>
  );
};

// Compact BRL formatter used inside the X-axis ticks ("R$2,5k", "-R$520")
const fmtCompactBRL = (v) => {
  if (v == null || isNaN(v)) return 'R$0';
  const sign = v < 0 ? '-' : '';
  const abs = Math.abs(v);
  if (abs >= 1000) return `${sign}R$${(abs / 1000).toFixed(1).replace('.', ',')}k`;
  return `${sign}R$${abs.toFixed(0)}`;
};

// Color rule for the per-month cashflow label: red < 0, yellow < 500, green >= 500.
const cashflowColor = (cf, tokens) => {
  if (cf < 0)   return tokens?.negative || '#EF4444';
  if (cf < 500) return '#F5B544';
  return tokens?.positive || '#10B981';
};

// Custom XAxis tick that renders the month label on the first row and the month's cashflow
// on the second row, colored by sign/threshold. Used by RotatingCharts.
const CashflowTick = ({ x, y, payload, data, tokens }) => {
  const item = (data || []).find((d) => d.label === payload.value);
  const cashflow = item ? item.cashflow : 0;
  const color = cashflowColor(cashflow, tokens);
  return (
    <g transform={`translate(${x},${y})`}>
      <text x={0} y={0} dy={14} textAnchor="middle"
        fill={tokens.textDim} fontSize={11} fontFamily="var(--font-mono)">
        {payload.value}
      </text>
      <text x={0} y={0} dy={30} textAnchor="middle"
        fill={color} fontSize={11} fontFamily="var(--font-mono)" fontWeight={600}>
        {fmtCompactBRL(cashflow)}
      </text>
    </g>
  );
};

export const RotatingCharts = ({ data, lines, timeRange, setTimeRange, tabs }) => {
  const { themeTokens, fmt } = useAppContext();
  const [chartIdx, setChartIdx] = useState(0);
  const cur = lines[chartIdx];

  return (
    <div>
      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-end', marginBottom: 16, flexWrap:'wrap', gap: 12 }}>
        <div>
          <div style={{ fontSize: 11, letterSpacing: '0.3em', textTransform:'uppercase', color: themeTokens.textDim, fontFamily: 'var(--font-mono)' }}>{cur.name}</div>
          <div style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 44, lineHeight: 1, marginTop: 4, color: themeTokens.text, letterSpacing: '-0.02em' }}>
            {fmt(data[data.length-1]?.[cur.key] || 0)}
          </div>
        </div>
        <div style={{ display:'flex', gap: 6 }}>
          {tabs.map((t,i) => (
            <button key={i} onClick={() => setTimeRange(t.value)}
              style={{
                background: timeRange===t.value ? themeTokens.accent : 'transparent',
                color: timeRange===t.value ? '#0B0B0D' : themeTokens.textDim,
                border: `1px solid ${timeRange===t.value ? themeTokens.accent : themeTokens.hairline2}`,
                padding: '6px 12px', borderRadius: 999, fontSize: 11,
                letterSpacing: '0.18em', textTransform:'uppercase',
                fontFamily:'var(--font-mono)', cursor:'pointer', transition:'all 200ms',
              }}>{t.label}</button>
          ))}
        </div>
      </div>

      <ResponsiveContainer width="100%" height={300}>
        <AreaChart data={data} margin={{ top: 10, right: 24, left: 8, bottom: 18 }}>
          <defs>
            <linearGradient id={`rc-${chartIdx}`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={cur.color} stopOpacity={0.4} />
              <stop offset="100%" stopColor={cur.color} stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid stroke={themeTokens.grid} strokeDasharray="2 4" vertical={false} />
          <XAxis dataKey="label" tickLine={false} axisLine={false}
                 height={42}
                 interval={0}
                 tick={<CashflowTick data={data} tokens={themeTokens} />} />
          <YAxis tickLine={false} axisLine={false} width={56}
                 tickFormatter={(v) => `${(v/1000).toFixed(0)}k`}
                 tick={{ fill: themeTokens.textDim, fontSize: 10, fontFamily:'var(--font-mono)' }} />
          <Tooltip content={(p) => <AuTooltip {...p} tokens={themeTokens} fmt={fmt} />} cursor={{ stroke: themeTokens.hairline2 }} />
          <Area type="monotone" dataKey={cur.key} stroke={cur.color} strokeWidth={2.2}
                fill={`url(#rc-${chartIdx})`} isAnimationActive animationDuration={900} />
        </AreaChart>
      </ResponsiveContainer>

      <div style={{ display:'flex', gap: 6, marginTop: 14, justifyContent:'center' }}>
        {lines.map((l,i) => (
          <button key={i} onClick={() => setChartIdx(i)}
            style={{
              background: chartIdx===i ? themeTokens.surface2 : 'transparent',
              border: `1px solid ${chartIdx===i ? themeTokens.accent : themeTokens.hairline}`,
              color: chartIdx===i ? themeTokens.accent : themeTokens.textDim,
              padding: '6px 14px', borderRadius: 8, fontSize: 11,
              letterSpacing:'0.18em', textTransform:'uppercase',
              fontFamily:'var(--font-mono)', cursor:'pointer', transition:'all 220ms',
            }}>{l.name}</button>
        ))}
      </div>
    </div>
  );
};

export const ExpensePie = ({ transactions, selectedMonth }) => {
  const { themeTokens, fmt } = useAppContext();
  const [active, setActive] = useState(null);
  const data = useMemo(() => {
    const now = new Date();
    const targetYear = selectedMonth?.year ?? now.getFullYear();
    const targetMonth = selectedMonth?.month ?? now.getMonth();
    const sums = {};
    for (const tx of transactions) {
      if (tx.type !== 'expense') continue;
      const d = new Date(tx.date);
      if (d.getMonth() !== targetMonth || d.getFullYear() !== targetYear) continue;
      sums[tx.category] = (sums[tx.category] || 0) + tx.amount;
    }
    return Object.entries(sums).map(([name, value]) => ({ name, value }))
      .sort((a,b) => b.value-a.value).slice(0, 6);
  }, [transactions, selectedMonth?.year, selectedMonth?.month]);

  useEffect(() => {
    setActive(null);
  }, [selectedMonth?.monthKey]);

  const palette = [themeTokens.accent, themeTokens.accentDeep, themeTokens.accentSoft, '#7B8086', '#3F3F46', '#5C564F'];
  const total = data.reduce((s,d)=>s+d.value, 0);

  return (
    <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap: 24, alignItems:'center' }}>
      <ResponsiveContainer width="100%" height={240}>
        <PieChart>
          <Pie data={data} dataKey="value" innerRadius={70} outerRadius={100} paddingAngle={2}
               isAnimationActive animationDuration={900}
               onMouseEnter={(_,i) => setActive(i)} onMouseLeave={() => setActive(null)}>
            {data.map((_,i) => (
              <Cell key={i} fill={palette[i % palette.length]} stroke="none"
                    style={{ filter: active===i ? `drop-shadow(0 0 12px ${palette[i % palette.length]})` : 'none', transition:'filter 200ms' }} />
            ))}
          </Pie>
          <Tooltip content={(p) => <AuTooltip {...p} tokens={themeTokens} fmt={fmt} />} />
        </PieChart>
      </ResponsiveContainer>
      <div>
        {data.map((d,i) => (
          <div key={d.name}
               onMouseEnter={() => setActive(i)}
               onMouseLeave={() => setActive(null)}
               style={{ display:'flex', justifyContent:'space-between', padding:'8px 0', borderBottom:`1px solid ${themeTokens.hairline}`,
                        opacity: active===null||active===i?1:0.4, transition:'opacity 180ms' }}>
            <span style={{ display:'flex', alignItems:'center', gap: 10, color: themeTokens.text, fontSize: 13 }}>
              <span style={{ width: 8, height: 8, borderRadius: 2, background: palette[i % palette.length] }} />
              {d.name}
            </span>
            <span style={{ color: themeTokens.textDim, fontFamily:'var(--font-mono)', fontSize: 12 }}>
              {((d.value/total)*100).toFixed(1)}%
            </span>
          </div>
        ))}
      </div>
    </div>
  );
};

export const ComposedFlow = ({ data, onMonthSelect, selectedMonthKey }) => {
  const { themeTokens, fmt } = useAppContext();
  const barClick = (entry) => {
    const payload = entry?.payload || entry;
    if (payload) onMonthSelect?.(payload);
  };
  const chartClick = (entry) => {
    const payload = entry?.activePayload?.[0]?.payload;
    if (payload) onMonthSelect?.(payload);
  };
  const barCursor = onMonthSelect ? 'pointer' : 'default';
  return (
    <ResponsiveContainer width="100%" height={280}>
      <ComposedChart data={data} margin={{ top: 10, right: 8, left: 0, bottom: 0 }} onClick={chartClick}>
        <CartesianGrid stroke={themeTokens.grid} strokeDasharray="2 4" vertical={false} />
        <XAxis dataKey="label" tickLine={false} axisLine={false}
               tick={{ fill: themeTokens.textDim, fontSize: 11, fontFamily:'var(--font-mono)' }} />
        <YAxis tickLine={false} axisLine={false} width={56}
               tickFormatter={(v) => `${(v/1000).toFixed(0)}k`}
               tick={{ fill: themeTokens.textDim, fontSize: 10, fontFamily:'var(--font-mono)' }} />
        <Tooltip content={(p) => <AuTooltip {...p} tokens={themeTokens} fmt={fmt} />} />
        <Bar dataKey="fixed" stackId="x" name="Fixed" fill={themeTokens.accentDeep} radius={[0,0,0,0]}
             isAnimationActive animationDuration={900} onClick={barClick} style={{ cursor: barCursor }}>
          {data.map((entry) => (
            <Cell key={`fixed-${entry.monthKey}`} fill={entry.monthKey === selectedMonthKey ? themeTokens.accentSoft : themeTokens.accentDeep} />
          ))}
        </Bar>
        <Bar dataKey="variable" stackId="x" name="Variable" fill={themeTokens.accent} radius={[6,6,0,0]}
             isAnimationActive animationDuration={900} onClick={barClick} style={{ cursor: barCursor }}>
          {data.map((entry) => (
            <Cell key={`variable-${entry.monthKey}`} fill={entry.monthKey === selectedMonthKey ? themeTokens.accentSoft : themeTokens.accent} />
          ))}
        </Bar>
        <Line type="monotone" dataKey="income" name="Income" stroke={themeTokens.positive} strokeWidth={2.2}
              dot={{ fill: themeTokens.positive, r: 3 }} isAnimationActive animationDuration={1100} />
      </ComposedChart>
    </ResponsiveContainer>
  );
};

export const RadarHealth = ({ metrics }) => {
  const { themeTokens } = useAppContext();
  return (
    <ResponsiveContainer width="100%" height={260}>
      <RadarChart data={metrics}>
        <PolarGrid stroke={themeTokens.hairline2} />
        <PolarAngleAxis dataKey="key" tick={{ fill: themeTokens.textDim, fontSize: 11, fontFamily:'var(--font-mono)' }} />
        <Radar dataKey="value" stroke={themeTokens.accent} fill={themeTokens.accent} fillOpacity={0.32}
               isAnimationActive animationDuration={1100} />
        <Tooltip content={(p) => <AuTooltip {...p} tokens={themeTokens} fmt={(v)=>`${v}/100`} />} />
      </RadarChart>
    </ResponsiveContainer>
  );
};

export const RadialGauge = ({ value, max, label, suffix = '%' }) => {
  const { themeTokens } = useAppContext();
  const pct = Math.max(0, Math.min(1, value / max));
  const data = [
    { name: 'on', value: pct },
    { name: 'off', value: 1 - pct },
  ];
  return (
    <div style={{ position: 'relative', width: '100%', height: 240 }}>
      <ResponsiveContainer width="100%" height="100%">
        <PieChart>
          <Pie
            data={data} dataKey="value"
            startAngle={180} endAngle={0}
            innerRadius="72%" outerRadius="100%"
            cornerRadius={10}
            stroke="none"
            isAnimationActive animationDuration={1100}
          >
            <Cell fill={themeTokens.accent} />
            <Cell fill={themeTokens.hairline2} />
          </Pie>
        </PieChart>
      </ResponsiveContainer>
      <div style={{
        position: 'absolute', inset: 0, display: 'grid', placeItems: 'center',
        paddingTop: 32, pointerEvents: 'none',
      }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{
            fontFamily: 'var(--font-display)', fontSize: 48, fontWeight: 700,
            color: themeTokens.text, lineHeight: 1, letterSpacing: '-0.02em',
          }}>{(pct * 100).toFixed(1)}{suffix}</div>
          {label && <div style={{
            fontFamily: 'var(--font-mono)', fontSize: 11, letterSpacing: '0.32em',
            textTransform: 'uppercase', color: themeTokens.textDim, marginTop: 8,
          }}>{label}</div>}
        </div>
      </div>
    </div>
  );
};

export const RetentionBar = ({ data, accent, soft, hairline }) => {
  const { themeTokens, fmt } = useAppContext();
  return (
    <ResponsiveContainer width="100%" height={260}>
      <BarChart data={data} margin={{ top: 10, right: 8, left: 0, bottom: 0 }}>
        <CartesianGrid stroke={themeTokens.grid} strokeDasharray="2 4" vertical={false} />
        <XAxis dataKey="label" tickLine={false} axisLine={false}
               tick={{ fill: themeTokens.textDim, fontSize: 11, fontFamily: 'var(--font-mono)' }} />
        <YAxis tickLine={false} axisLine={false} width={56}
               tickFormatter={(v) => `${(v/1000).toFixed(0)}k`}
               tick={{ fill: themeTokens.textDim, fontSize: 10, fontFamily: 'var(--font-mono)' }} />
        <Tooltip content={(p) => <AuTooltip {...p} tokens={themeTokens} fmt={fmt} />}
                 cursor={{ fill: 'rgba(255,255,255,0.03)' }} />
        <Bar dataKey="value" name="Spend"
             radius={[10, 10, 0, 0]}
             fill={accent || themeTokens.accent}
             isAnimationActive animationDuration={900} />
      </BarChart>
    </ResponsiveContainer>
  );
};

export const buildMonthlySeries = (transactions, monthsBack = 5, monthsForward = 0) => {
  const now = new Date();
  const out = [];
  for (let m = -monthsBack; m <= monthsForward; m++) {
    const base = new Date(now.getFullYear(), now.getMonth() + m, 1);
    const ym = base.getFullYear() + '-' + base.getMonth();
    let income = 0, fixed = 0, variable = 0;
    for (const tx of transactions) {
      const d = new Date(tx.date);
      const k = d.getFullYear() + '-' + d.getMonth();
      if (k !== ym) continue;
      if (tx.type === 'income') income += tx.amount;
      else if (tx.locked) fixed += tx.amount;
      else variable += tx.amount;
    }
    const cashflow = income - fixed - variable;
    out.push({
      label: base.toLocaleString('en-US', { month: 'short' }),
      monthLabel: base.toLocaleString('en-US', { month: 'long', year: 'numeric' }),
      monthKey: `${base.getFullYear()}-${String(base.getMonth() + 1).padStart(2, '0')}`,
      year: base.getFullYear(),
      month: base.getMonth(),
      income, fixed, variable, expense: fixed + variable, cashflow,
    });
  }
  return out;
};
