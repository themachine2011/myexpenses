/* global React, Recharts */
const { useMemo, useState, useEffect, useRef } = React;
const { ResponsiveContainer, AreaChart, Area, LineChart, Line, BarChart, Bar,
        PieChart, Pie, Cell, RadarChart, Radar, PolarGrid, PolarAngleAxis,
        XAxis, YAxis, CartesianGrid, Tooltip, Legend, ComposedChart } = window.Recharts;

// =====================================================================
// AURUM CHARTS — Recharts, animated, tooltip-rich, onyx/rose-gold styled
// =====================================================================

// Shared tooltip renderer
const AuTooltip = ({ active, payload, label, tokens, fmt }) => {
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
          <span style={{ color: tokens.text, fontFamily:'var(--font-mono)', fontWeight: 500 }}>{fmt ? fmt(p.value) : p.value}</span>
        </div>
      ))}
    </div>
  );
};

// ---------------------------------------------------------------------
// 1. AreaSpark — large headline + animated stroke-on-mount area chart
// ---------------------------------------------------------------------
const AreaSpark = ({ data, dataKey, accent, tokens, height = 220 }) => {
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

// ---------------------------------------------------------------------
// 2. RotatingCharts — animated rotation between Cash Flow / Income / Costs
// ---------------------------------------------------------------------
const RotatingCharts = ({ data, lines, timeRange, setTimeRange, tabs }) => {
  const { themeTokens, fmt } = useAppContext();
  const [chartIdx, setChartIdx] = useState(0);
  const cur = lines[chartIdx];

  return (
    <div>
      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-end', marginBottom: 16, flexWrap:'wrap', gap: 12 }}>
        <div>
          <div style={{ fontSize: 11, letterSpacing: '0.3em', textTransform:'uppercase', color: themeTokens.textDim, fontFamily: 'var(--font-mono)' }}>{cur.name}</div>
          <div style={{ fontFamily: '"Instrument Serif", serif', fontSize: 44, lineHeight: 1, marginTop: 4, color: themeTokens.text, fontStyle:'italic' }}>
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

      <ResponsiveContainer width="100%" height={280}>
        <AreaChart data={data} margin={{ top: 10, right: 8, left: 0, bottom: 0 }}>
          <defs>
            <linearGradient id={`rc-${chartIdx}`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={cur.color} stopOpacity={0.4} />
              <stop offset="100%" stopColor={cur.color} stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid stroke={themeTokens.grid} strokeDasharray="2 4" vertical={false} />
          <XAxis dataKey="label" tickLine={false} axisLine={false}
                 tick={{ fill: themeTokens.textDim, fontSize: 11, fontFamily:'var(--font-mono)' }} />
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

// ---------------------------------------------------------------------
// 3. ExpensePie — animated donut with active-slice highlight
// ---------------------------------------------------------------------
const ExpensePie = ({ transactions }) => {
  const { themeTokens, fmt } = useAppContext();
  const [active, setActive] = useState(null);
  const data = useMemo(() => {
    const now = new Date();
    const sums = {};
    for (const tx of transactions) {
      if (tx.type !== 'expense') continue;
      const d = new Date(tx.date);
      if (d.getMonth() !== now.getMonth() || d.getFullYear() !== now.getFullYear()) continue;
      sums[tx.category] = (sums[tx.category] || 0) + tx.amount;
    }
    return Object.entries(sums).map(([name, value]) => ({ name, value }))
      .sort((a,b) => b.value-a.value).slice(0, 6);
  }, [transactions]);

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

// ---------------------------------------------------------------------
// 4. ComposedFlow — Income line + Fixed/Variable cost bars
// ---------------------------------------------------------------------
const ComposedFlow = ({ data }) => {
  const { themeTokens, fmt } = useAppContext();
  return (
    <ResponsiveContainer width="100%" height={280}>
      <ComposedChart data={data} margin={{ top: 10, right: 8, left: 0, bottom: 0 }}>
        <CartesianGrid stroke={themeTokens.grid} strokeDasharray="2 4" vertical={false} />
        <XAxis dataKey="label" tickLine={false} axisLine={false}
               tick={{ fill: themeTokens.textDim, fontSize: 11, fontFamily:'var(--font-mono)' }} />
        <YAxis tickLine={false} axisLine={false} width={56}
               tickFormatter={(v) => `${(v/1000).toFixed(0)}k`}
               tick={{ fill: themeTokens.textDim, fontSize: 10, fontFamily:'var(--font-mono)' }} />
        <Tooltip content={(p) => <AuTooltip {...p} tokens={themeTokens} fmt={fmt} />} />
        <Bar dataKey="fixed"    stackId="x" name="Fixed"    fill={themeTokens.accentDeep} radius={[0,0,0,0]} isAnimationActive animationDuration={900} />
        <Bar dataKey="variable" stackId="x" name="Variable" fill={themeTokens.accent}     radius={[6,6,0,0]} isAnimationActive animationDuration={900} />
        <Line type="monotone" dataKey="income" name="Income" stroke={themeTokens.positive} strokeWidth={2.2}
              dot={{ fill: themeTokens.positive, r: 3 }} isAnimationActive animationDuration={1100} />
      </ComposedChart>
    </ResponsiveContainer>
  );
};

// ---------------------------------------------------------------------
// 5. RadarHealth — financial health radar
// ---------------------------------------------------------------------
const RadarHealth = ({ metrics }) => {
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

// ---------------------------------------------------------------------
// Build a 6-month / 14-month series helper
// ---------------------------------------------------------------------
const buildMonthlySeries = (transactions, monthsBack = 5, monthsForward = 0) => {
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
      income, fixed, variable, expense: fixed + variable, cashflow,
    });
  }
  return out;
};

Object.assign(window, {
  AreaSpark, RotatingCharts, ExpensePie, ComposedFlow, RadarHealth,
  buildMonthlySeries, AuTooltip,
});
