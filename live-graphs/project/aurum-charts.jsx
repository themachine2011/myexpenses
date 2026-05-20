/* global React, Recharts */
const { useMemo, useState, useEffect, useRef } = React;
const { ResponsiveContainer, AreaChart, Area, LineChart, Line, BarChart, Bar,
        PieChart, Pie, Sector, Cell, RadarChart, Radar, PolarGrid, PolarAngleAxis,
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

const PIE_CONTINUOUS_SPIN_SECONDS = 75;
const PIE_MANUAL_STEP_DEG = 1;
const PIE_MANUAL_SPIN_MS = 100;
const PIE_ROTATION_STYLE_ID = 'pie-chart-rotation-styles';
const PIE_WHEEL_PIXEL_THRESHOLD = 24;
const PIE_MANUAL_EASING = 'cubic-bezier(0.22, 1, 0.36, 1)';

const ensurePieRotationStyles = () => {
  if (document.getElementById(PIE_ROTATION_STYLE_ID)) return;
  const style = document.createElement('style');
  style.id = PIE_ROTATION_STYLE_ID;
  style.textContent = `
@keyframes pieContinuousSpin {
  from { rotate: 0deg; }
  to { rotate: 360deg; }
}

.pie-rotation-root .recharts-pie {
  transform-box: fill-box;
  transform-origin: center center;
  will-change: transform;
  animation: pieContinuousSpin var(--pie-continuous-spin-duration, ${PIE_CONTINUOUS_SPIN_SECONDS}s) linear infinite;
  animation-play-state: var(--pie-rotation-play-state, running);
  transform: rotate(var(--pie-manual-rotation-deg, 0deg));
  transition: transform var(--pie-manual-spin-duration, ${PIE_MANUAL_SPIN_MS}ms) var(--pie-manual-spin-easing, ${PIE_MANUAL_EASING});
}

@media (prefers-reduced-motion: reduce) {
  .pie-rotation-root .recharts-pie {
    animation: none;
    transition-duration: 50ms;
  }
}
`;
  document.head.appendChild(style);
};

const getNormalizedWheelDelta = (event) => {
  const scale =
    event.deltaMode === 1 ? 16 :
    event.deltaMode === 2 ? window.innerHeight || 800 :
    1;
  return event.deltaY * scale;
};

const ExpensePieActiveShape = (props) => {
  const { cx, cy, innerRadius, outerRadius, startAngle, endAngle, fill } = props;
  const activeOuterRadius = outerRadius + Math.max(5, outerRadius * 0.05);
  return (
    <g>
      <Sector
        cx={cx}
        cy={cy}
        innerRadius={innerRadius}
        outerRadius={activeOuterRadius}
        startAngle={startAngle}
        endAngle={endAngle}
        fill={fill}
        stroke="#000000"
        strokeWidth={2.5}
        style={{
          filter: `drop-shadow(0 0 14px ${fill}AA)`,
          transition: 'filter 180ms ease-out',
        }}
      />
    </g>
  );
};

const usePieChartRotation = () => {
  const containerRef = useRef(null);
  const wheelAccumRef = useRef(0);
  const lastWheelDirectionRef = useRef(0);
  const pendingRotationRef = useRef(0);
  const frameRef = useRef(null);
  const [active, setActive] = useState(false);
  const [rotationDeg, setRotationDeg] = useState(0);
  const [isVisible, setIsVisible] = useState(true);
  const [isPageVisible, setIsPageVisible] = useState(() => document.visibilityState !== 'hidden');
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(false);

  useEffect(() => {
    ensurePieRotationStyles();
  }, []);

  useEffect(() => {
    const onPointerDown = (event) => {
      if (!containerRef.current?.contains(event.target)) setActive(false);
    };
    document.addEventListener('pointerdown', onPointerDown);
    return () => document.removeEventListener('pointerdown', onPointerDown);
  }, []);

  useEffect(() => {
    if (!window.matchMedia) return undefined;
    const query = window.matchMedia('(prefers-reduced-motion: reduce)');
    const sync = () => setPrefersReducedMotion(query.matches);
    sync();
    query.addEventListener?.('change', sync);
    return () => query.removeEventListener?.('change', sync);
  }, []);

  useEffect(() => {
    const sync = () => setIsPageVisible(document.visibilityState !== 'hidden');
    document.addEventListener('visibilitychange', sync);
    return () => document.removeEventListener('visibilitychange', sync);
  }, []);

  const flushRotation = () => {
    frameRef.current = null;
    const next = pendingRotationRef.current;
    pendingRotationRef.current = 0;
    if (next) setRotationDeg((value) => value + next);
  };

  const queueRotation = (direction) => {
    pendingRotationRef.current += direction * PIE_MANUAL_STEP_DEG;
    if (frameRef.current == null) frameRef.current = requestAnimationFrame(flushRotation);
  };

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return undefined;
    const onWheel = (event) => {
      const delta = getNormalizedWheelDelta(event);
      if (!delta) return;
      event.preventDefault();
      setActive(true);

      const direction = delta < 0 ? 1 : -1;
      if (lastWheelDirectionRef.current !== direction) {
        wheelAccumRef.current = 0;
        lastWheelDirectionRef.current = direction;
      }

      const magnitude = Math.abs(delta);
      if (magnitude >= PIE_WHEEL_PIXEL_THRESHOLD) {
        wheelAccumRef.current = 0;
        queueRotation(direction);
        return;
      }

      wheelAccumRef.current += magnitude;
      if (wheelAccumRef.current >= PIE_WHEEL_PIXEL_THRESHOLD) {
        wheelAccumRef.current = 0;
        queueRotation(direction);
      }
    };
    el.addEventListener('wheel', onWheel, { passive: false });
    return () => el.removeEventListener('wheel', onWheel);
  }, []);

  useEffect(() => {
    const el = containerRef.current;
    if (!el || typeof IntersectionObserver === 'undefined') return undefined;
    const obs = new IntersectionObserver((entries) => {
      setIsVisible(entries[0]?.isIntersecting ?? true);
    }, { threshold: 0.05 });
    obs.observe(el);
    return () => obs.disconnect();
  }, []);

  useEffect(() => {
    return () => {
      if (frameRef.current != null) cancelAnimationFrame(frameRef.current);
    };
  }, []);

  return {
    active,
    containerRef,
    containerProps: {
      className: 'pie-rotation-root',
      onClick: () => setActive(true),
      onPointerEnter: () => setActive(true),
      onPointerLeave: () => setActive(false),
      onFocus: () => setActive(true),
      onBlur: () => setActive(false),
      onKeyDown: (event) => { if (event.key === 'Enter' || event.key === ' ') setActive(true); },
      role: 'button',
      tabIndex: 0,
      style: {
        '--pie-manual-rotation-deg': `${rotationDeg}deg`,
        '--pie-continuous-spin-duration': `${PIE_CONTINUOUS_SPIN_SECONDS}s`,
        '--pie-manual-spin-duration': prefersReducedMotion ? '50ms' : `${PIE_MANUAL_SPIN_MS}ms`,
        '--pie-manual-spin-easing': PIE_MANUAL_EASING,
        '--pie-rotation-play-state': isVisible && isPageVisible ? 'running' : 'paused',
      },
    },
  };
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
  const pie = usePieChartRotation();
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
      <div
        ref={pie.containerRef}
        {...pie.containerProps}
        style={{
          ...pie.containerProps.style,
          outline: 'none',
          cursor: pie.active ? 'ns-resize' : 'pointer',
        }}
      >
        <ResponsiveContainer width="100%" height={240}>
          <PieChart>
            <Pie data={data} dataKey="value" innerRadius={70} outerRadius={100} paddingAngle={2}
                 isAnimationActive animationDuration={900}
                 activeIndex={active != null ? active : -1}
                 activeShape={ExpensePieActiveShape}
                 onMouseEnter={(_,i) => setActive(i)} onMouseLeave={() => setActive(null)}>
              {data.map((_,i) => (
                <Cell key={i} fill={palette[i % palette.length]} stroke="none"
                      style={{ filter: active===i ? `drop-shadow(0 0 12px ${palette[i % palette.length]})` : 'none', transition:'filter 200ms' }} />
              ))}
            </Pie>
            <Tooltip content={(p) => <AuTooltip {...p} tokens={themeTokens} fmt={fmt} />} />
          </PieChart>
        </ResponsiveContainer>
      </div>
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
