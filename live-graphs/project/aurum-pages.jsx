/* global React, FramerMotion */
const { useState, useEffect, useRef, useMemo } = React;
const { motion, AnimatePresence } = window.FramerMotion;

// =====================================================================
// AURUM PAGES — Dashboard, Cards, Goals (with luxury sedan), Graph,
// Net Worth, Transactions. Uses window.* from tokens/context/charts.
// =====================================================================

// --- shared primitives ---
const Surface = ({ children, style, onClick, hoverable, delay = 0 }) => {
  const { themeTokens } = useAppContext();
  return (
    <motion.div
      className="aurum-card-hover"
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay, ease: [0.22, 1, 0.36, 1] }}
      whileHover={hoverable ? { y: -3 } : {}}
      onClick={onClick}
      style={{
        background: themeTokens.surface,
        border: `1px solid ${themeTokens.hairline}`,
        borderRadius: 18,
        padding: 24,
        backdropFilter: 'blur(24px)',
        WebkitBackdropFilter: 'blur(24px)',
        boxShadow: themeTokens.isDark ? '0 30px 60px rgba(0,0,0,0.4)' : '0 20px 50px rgba(40,30,20,0.06)',
        cursor: onClick ? 'pointer' : 'default',
        ...style
      }}>
      {children}
    </motion.div>);

};

const Eyebrow = ({ children, color }) => {
  const { themeTokens } = useAppContext();
  return (
    <div style={{
      fontFamily: 'var(--font-mono)',
      fontSize: 10, letterSpacing: '0.32em', textTransform: 'uppercase',
      color: color || themeTokens.textDim, marginBottom: 8
    }}>{children}</div>);

};

const Display = ({ children, size = 56, italic = false, color, style, weight = 600 }) => {
  const { themeTokens } = useAppContext();
  return (
    <div style={{
      fontFamily: 'var(--font-display)',
      fontWeight: weight,
      fontSize: size, lineHeight: 1, fontStyle: 'normal',
      color: color || themeTokens.text, letterSpacing: '-0.01em',
      ...style
    }}>{children}</div>);

};

// =====================================================================
// CREDIT CARD VISUAL — onyx + rose-gold reskin (no logo replication)
// =====================================================================
const CardVisual = ({ name, last4, holder, type, accent, themeTokens }) => {
  const grad = type === 'visa' ?
  `linear-gradient(135deg, #18181F 0%, #2A2A33 50%, #1C1C24 100%)` :
  `linear-gradient(135deg, #1F1614 0%, #2D1F1B 50%, #1A1310 100%)`;
  return (
    <div style={{
      width: '100%', aspectRatio: '1.586 / 1', borderRadius: 20,
      background: grad,
      border: `1px solid ${themeTokens.hairline2}`,
      padding: 22, position: 'relative', overflow: 'hidden',
      boxShadow: '0 30px 60px rgba(0,0,0,0.45), inset 0 1px 0 rgba(255,255,255,0.06)',
      color: '#F2EDE6',
      fontFamily: 'var(--font-body)'
    }}>
      {/* Engraved sheen */}
      <div style={{
        position: 'absolute', inset: 0, pointerEvents: 'none',
        background: `radial-gradient(circle at 20% 0%, ${accent}22, transparent 50%), radial-gradient(circle at 100% 100%, ${accent}18, transparent 60%)`
      }} />
      {/* Issuer mark — original geometric monogram, no real bank IP */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', position: 'relative' }}>
        <div>
          <div style={{ fontFamily: 'var(--font-display)', fontWeight: 600, fontSize: 22, letterSpacing: '0.04em' }}>VISA</div>
          <div style={{ fontFamily: 'var(--font-mono)', fontSize: 9, letterSpacing: '0.32em', textTransform: 'uppercase', opacity: 0.6, marginTop: 2 }}>{name}</div>
        </div>
        {/* EMV chip — abstract */}
        <div style={{ width: 44, height: 32, borderRadius: 6, background: `linear-gradient(135deg, ${accent} 0%, ${themeTokens.accentSoft} 50%, ${accent} 100%)`, position: 'relative', boxShadow: 'inset 0 0 0 1px rgba(0,0,0,0.2)' }}>
          <div style={{ position: 'absolute', inset: 4, borderRadius: 3, background: 'repeating-linear-gradient(0deg, rgba(0,0,0,0.18) 0 2px, transparent 2px 5px), repeating-linear-gradient(90deg, rgba(0,0,0,0.18) 0 2px, transparent 2px 5px)', opacity: "1" }} />
        </div>
      </div>
      <div style={{ position: 'absolute', left: 22, right: 22, bottom: 22 }}>
        <div style={{ fontFamily: 'var(--font-mono)', fontSize: 16, letterSpacing: '0.18em' }}>•••• •••• •••• {last4}</div>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginTop: 12 }}>
          <div>
            <div style={{ fontSize: 9, letterSpacing: '0.32em', textTransform: 'uppercase', opacity: 0.55, fontFamily: 'var(--font-mono)' }}>LAURENCIO PEREIRA</div>
            <div style={{ fontSize: 13, marginTop: 2, letterSpacing: '0.04em' }}>{holder}</div>
          </div>
          <div style={{ fontFamily: 'var(--font-display)', fontWeight: 600, fontSize: 22, letterSpacing: '0.05em', color: accent }}>
            {type === 'visa' ? 'Au · I' : 'Au · II'}
          </div>
        </div>
      </div>
    </div>);

};

// =====================================================================
// LUXURY SEDAN GOAL — uploaded photo as hero, original silk curtain
// (NO BMW logo, NO M-stripes, NO trademarked colors). Curtain reveals
// on scroll/swipe. Click car → driving animation (wheels spin via CSS
// pseudo-elements, ground moves). All original design.
// =====================================================================
const LuxurySedanGoal = () => {
  const { themeTokens, savingsTotal, goalAmount, addSaving, fmt } = useAppContext();
  const [coverPct, setCoverPct] = useState(1.0); // 1 = fully covered (curtain shut)
  const [driving, setDriving] = useState(false);
  const [windPulse, setWindPulse] = useState(0); // bumps on every scroll tick — drives the wind sway
  const sectionRef = useRef(null);

  // Scroll-driven curtain reveal — bidirectional (open down, close up).
  // Each wheel event also bumps windPulse so the silk sways/billows.
  useEffect(() => {
    const onWheel = (e) => {
      const r = sectionRef.current?.getBoundingClientRect();
      if (!r) return;
      const inView = r.top < window.innerHeight * 0.7 && r.bottom > 100;
      if (!inView) return;
      e.preventDefault();
      const delta = e.deltaY;
      setCoverPct((p) => Math.max(0, Math.min(1, p - delta * 0.0015)));
      // Wind: scroll down = positive sway, scroll up = negative sway
      setWindPulse((w) => w + Math.max(-1, Math.min(1, delta / 80)));
    };
    const el = sectionRef.current;
    el?.addEventListener('wheel', onWheel, { passive: false });
    return () => el?.removeEventListener('wheel', onWheel);
  }, []);

  // Touch-driven curtain reveal (iPad swipe)
  useEffect(() => {
    let lastY = null;
    const onStart = (e) => {lastY = e.touches[0].clientY;};
    const onMove = (e) => {
      if (lastY == null) return;
      const dy = e.touches[0].clientY - lastY;
      lastY = e.touches[0].clientY;
      setCoverPct((p) => Math.max(0, Math.min(1, p + dy * 0.003)));
      setWindPulse((w) => w - Math.max(-1, Math.min(1, dy / 40)));
    };
    const el = sectionRef.current;
    el?.addEventListener('touchstart', onStart, { passive: true });
    el?.addEventListener('touchmove', onMove, { passive: true });
    return () => {
      el?.removeEventListener('touchstart', onStart);
      el?.removeEventListener('touchmove', onMove);
    };
  }, []);

  // Wind decay — sway naturally relaxes back to 0 between scroll events
  useEffect(() => {
    let raf;
    const tick = () => {
      setWindPulse((w) => Math.abs(w) < 0.02 ? 0 : w * 0.92);
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, []);

  const progress = Math.min(1, savingsTotal / goalAmount);
  const remaining = Math.max(0, goalAmount - savingsTotal);

  return (
    <Surface style={{ padding: 0, overflow: 'hidden', position: 'relative' }}>
      <div ref={sectionRef} style={{ position: 'relative' }}>

        {/* Car hero — uploaded photo */}
        <div style={{
          position: 'relative',
          width: '100%',
          aspectRatio: '16/9',
          background: '#000',
          overflow: 'hidden'
        }}>
          <img src="assets/sport-sedan.png" alt="Triumph Street Triple RS goal"
          style={{
            position: 'absolute', inset: 0, width: '100%', height: '100%',
            objectFit: 'cover',
            transform: driving ? 'scale(1.04) translateX(0)' : 'scale(1.02)',
            transition: 'transform 600ms ease',
            cursor: 'pointer'
          }}
          onClick={() => setDriving((d) => !d)} />

          {/* Animated ground streaks while driving */}
          {driving &&
          <div style={{
            position: 'absolute', left: 0, right: 0, bottom: 0, height: '18%',
            pointerEvents: 'none',
            background: 'repeating-linear-gradient(90deg, rgba(255,200,170,0.0) 0 40px, rgba(255,210,180,0.18) 40px 50px, rgba(255,200,170,0.0) 50px 90px)',
            animation: 'au-ground 0.45s linear infinite',
            mixBlendMode: 'screen'
          }} />
          }

          {/* Spinning wheel highlights overlay (positioned roughly over wheels) */}
          {driving &&
          <>
              <div style={spinHighlight(themeTokens.accent, '21%', '76%')} />
              <div style={spinHighlight(themeTokens.accent, '70%', '76%')} />
            </>
          }

          {/* Two-panel silk curtain — splits open as you scroll, sways with wind. */}
          <div style={{ position: 'absolute', inset: 0, overflow: 'hidden' }}>
          {(() => {
              const open = 1 - coverPct;
              const windL = windPulse * 6;
              const windR = -windPulse * 6;
              const skewL = windPulse * 1.6;
              const skewR = -windPulse * 1.6;
              const slideL = -open * 52;
              const slideR = open * 52;
              const silkBase = `
              repeating-linear-gradient(90deg,
                rgba(0,0,0,0.32) 0 1px,
                rgba(255,255,255,0.04) 1px 14px,
                rgba(0,0,0,0.18) 14px 16px,
                rgba(255,255,255,0.02) 16px 30px),
              linear-gradient(180deg, #0E0E12 0%, #16161B 40%, #0B0B0F 100%)
            `;
              const panel = (side) => ({
                position: 'absolute', top: 0, bottom: 0,
                width: '52%',
                [side]: 0,
                background: silkBase,
                boxShadow: side === 'left' ?
                'inset -28px 0 60px rgba(0,0,0,0.7), inset 0 -30px 60px rgba(0,0,0,0.5)' :
                'inset  28px 0 60px rgba(0,0,0,0.7), inset 0 -30px 60px rgba(0,0,0,0.5)',
                transformOrigin: side === 'left' ? 'top left' : 'top right',
                transition: 'transform 220ms cubic-bezier(0.22,1,0.36,1)',
                willChange: 'transform'
              });
              const pleat =
              <div style={{
                position: 'absolute', inset: 0,
                background: `repeating-linear-gradient(90deg,
                  transparent 0 38px,
                  rgba(0,0,0,${0.18 + Math.abs(windPulse) * 0.08}) 38px 40px,
                  transparent 40px 78px)`,
                pointerEvents: 'none'
              }} />;

              const hem =
              <div style={{ position: 'absolute', left: 0, right: 0, bottom: 0, height: 18,
                background: `linear-gradient(180deg, transparent, ${themeTokens.accentDeep})`, opacity: 0.6 }} />;

              return (
                <>
                <div style={{
                    ...panel('left'),
                    transform: `translateX(${slideL + windL}%) skewX(${skewL}deg)`
                  }}>
                  {pleat}
                  {hem}
                </div>
                <div style={{
                    ...panel('right'),
                    transform: `translateX(${slideR + windR}%) skewX(${skewR}deg)`
                  }}>
                  {pleat}
                  {hem}
                </div>
                {/* Center seam glow + monogram fade out as curtain opens */}
                <div style={{
                    position: 'absolute', top: 0, bottom: 0, left: '50%',
                    transform: 'translateX(-50%)',
                    width: 2,
                    background: `linear-gradient(180deg, transparent, ${themeTokens.accent}55, transparent)`,
                    opacity: coverPct,
                    pointerEvents: 'none'
                  }} />
                <div style={{
                    position: 'absolute', top: '45%', left: '50%',
                    transform: `translate(-50%,-50%) scale(${0.6 + coverPct * 0.4})`,
                    textAlign: 'center', color: themeTokens.accent,
                    opacity: coverPct,
                    transition: 'opacity 240ms ease',
                    pointerEvents: 'none'
                  }}>
                  <div style={{
                      width: 110, height: 110, borderRadius: '50%',
                      border: `1.5px solid ${themeTokens.accent}`,
                      display: 'grid', placeItems: 'center',
                      margin: '0 auto 16px',
                      boxShadow: `0 0 40px ${themeTokens.accent}40`
                    }}>
                    <div style={{ fontFamily: 'var(--font-display)', fontWeight: 600, fontSize: 38, color: themeTokens.accent, lineHeight: 1, letterSpacing: '-0.02em' }}>Soon</div>
                  </div>
                  <div style={{ fontFamily: 'var(--font-mono)', fontSize: 11, letterSpacing: '0.36em', textTransform: 'uppercase', color: themeTokens.accentSoft }}>Scroll to reveal</div>
                </div>
              </>);

            })()}
          </div>

          {/* Headline overlay */}
          <div style={{
            position: 'absolute', left: 32, bottom: 24,
            color: '#F2EDE6',
            textShadow: '0 4px 24px rgba(0,0,0,0.7)'
          }}>
            <Eyebrow color={themeTokens.accent}>May 2029 · Purchasing Goal</Eyebrow>
            <div style={{ fontFamily: 'var(--font-display)', fontWeight: 600, fontSize: 56, lineHeight: 1, marginTop: 6, letterSpacing: '-0.02em',
              backgroundImage: `linear-gradient(95deg, ${themeTokens.accentSoft} 0%, ${themeTokens.text} 35%, ${themeTokens.accent} 70%, ${themeTokens.accentDeep} 100%)`,
              WebkitBackgroundClip: 'text', backgroundClip: 'text', color: 'transparent'
            }}></div>
          </div>
        </div>

        {/* Goal counter + add savings */}
        <div style={{ padding: 28 }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr auto', gap: 24, alignItems: 'end' }}>
            <div>
              <Eyebrow>Acquisition Fund</Eyebrow>
              <div style={{ display: 'flex', alignItems: 'baseline', gap: 12 }}>
                <Display size={64}>{fmt(savingsTotal)}</Display>
                <div style={{ color: themeTokens.textDim, fontSize: 14, fontFamily: 'var(--font-mono)' }}>
                  / {fmt(goalAmount)}
                </div>
              </div>
              <div style={{ color: themeTokens.textDim, fontSize: 13, marginTop: 6 }}>
                {fmt(remaining)} remaining · {(progress * 100).toFixed(1)}% saved
              </div>
            </div>
            <div style={{ display: 'flex', gap: 10 }}>
              {[250, 500].map((amt, i) =>
              <button key={amt} onClick={() => addSaving(amt)}
              style={{
                background: i === 1 ? themeTokens.accent : 'transparent',
                color: i === 1 ? '#0B0B0D' : themeTokens.accent,
                border: i === 1 ? 'none' : `1px solid ${themeTokens.accent}`,
                padding: '14px 22px',
                borderRadius: 999, cursor: 'pointer',
                fontFamily: 'var(--font-body)', fontWeight: 600,
                fontSize: 12, letterSpacing: '0.18em', textTransform: 'uppercase',
                boxShadow: i === 1 ? `0 12px 30px ${themeTokens.accent}40` : 'none',
                transition: 'transform 200ms'
              }}
              onMouseDown={(e) => e.currentTarget.style.transform = 'scale(0.97)'}
              onMouseUp={(e) => e.currentTarget.style.transform = 'scale(1)'}>
                  Add R$ {amt}
                </button>
              )}
            </div>
          </div>
          {/* Progress bar */}
          <div style={{ marginTop: 20, height: 6, borderRadius: 999, background: themeTokens.hairline2, overflow: 'hidden' }}>
            <motion.div
              initial={{ width: 0 }} animate={{ width: `${progress * 100}%` }}
              transition={{ duration: 1.1, ease: [0.22, 1, 0.36, 1] }}
              style={{
                height: '100%', background: `linear-gradient(90deg, ${themeTokens.accentDeep}, ${themeTokens.accent}, ${themeTokens.accentShimmer})`
              }} />
          </div>
        </div>
      </div>
    </Surface>);

};

const spinHighlight = (accent, left, top) => ({
  position: 'absolute',
  left, top,
  width: '8%', aspectRatio: '1/1',
  borderRadius: '50%',
  border: `2px solid ${accent}`,
  borderTopColor: 'transparent',
  borderRightColor: 'transparent',
  animation: 'au-spin 0.4s linear infinite',
  pointerEvents: 'none',
  filter: `drop-shadow(0 0 8px ${accent})`
});

// =====================================================================
// DASHBOARD — KPIs + RotatingCharts + Recent Activity
// =====================================================================
const KPICard = ({ label, value, delta, positive, accent }) => {
  const { themeTokens } = useAppContext();
  const positive_ = positive ?? delta >= 0;
  return (
    <Surface>
      <Eyebrow>{label}</Eyebrow>
      <Display size={42}>{value}</Display>
      {delta !== undefined &&
      <div style={{ marginTop: 10, display: 'flex', alignItems: 'center', gap: 8, fontFamily: 'var(--font-mono)', fontSize: 12,
        color: positive_ ? themeTokens.positive : themeTokens.negative }}>
          {positive_ ? '↑' : '↓'} {Math.abs(delta).toFixed(1)}%
          <span style={{ color: themeTokens.textDim }}>vs last month</span>
        </div>
      }
    </Surface>);

};

const Dashboard = () => {
  const { transactions, themeTokens, ccStats, fmt } = useAppContext();
  const [timeRange, setTimeRange] = useState(6);
  const series = useMemo(() => buildMonthlySeries(transactions, timeRange - 1, 0), [transactions, timeRange]);

  const lastMonth = series[series.length - 1] || { income: 0, fixed: 0, variable: 0, cashflow: 0 };
  const prevMonth = series[series.length - 2] || { income: 1, cashflow: 1 };
  const incomeDelta = (lastMonth.income - prevMonth.income) / Math.max(1, prevMonth.income) * 100;
  const cashflowDelta = (lastMonth.cashflow - prevMonth.cashflow) / Math.max(1, Math.abs(prevMonth.cashflow)) * 100;
  const savingsRate = lastMonth.income > 0 ? lastMonth.cashflow / lastMonth.income * 100 : 0;

  return (
    <div style={{ display: 'grid', gap: 24 }}>
      {/* KPI row */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 16 }}>
        <KPICard label="Liquid Income" value={fmt(lastMonth.income)} delta={incomeDelta} />
        <KPICard label="Cash Flow" value={fmt(lastMonth.cashflow)} delta={cashflowDelta} />
        <KPICard label="Savings Rate" value={`${savingsRate.toFixed(1)}%`} positive={savingsRate >= 20} delta={savingsRate} />
        <KPICard label="Fixed Expenses" value={fmt(lastMonth.fixed)} positive={false} />
      </div>

      {/* Rotating charts */}
      <Surface>
        <RotatingCharts
          data={series}
          lines={[
          { name: 'Cash Flow', key: 'cashflow', color: themeTokens.accent },
          { name: 'Income', key: 'income', color: themeTokens.positive },
          { name: 'Expenses', key: 'expense', color: themeTokens.negative }]
          }
          timeRange={timeRange} setTimeRange={setTimeRange}
          tabs={[
          { value: 3, label: '3M' }, { value: 6, label: '6M' }, { value: 12, label: '1Y' }]
          } />
        
      </Surface>

      {/* Composed flow + Pie */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24 }}>
        <Surface>
          <Eyebrow>Income vs Costs · 6M</Eyebrow>
          <div style={{ height: 12 }} />
          <ComposedFlow data={series} />
        </Surface>
        <Surface>
          <Eyebrow>Spending by Category · This Month</Eyebrow>
          <div style={{ height: 12 }} />
          <ExpensePie transactions={transactions} />
        </Surface>
      </div>

      {/* Recent Activity */}
      <Surface>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
          <Eyebrow>Recent Activity</Eyebrow>
          <span style={{ color: themeTokens.textDim, fontFamily: 'var(--font-mono)', fontSize: 11, letterSpacing: '0.16em', textTransform: 'uppercase' }}>
            View all →
          </span>
        </div>
        <div>
          {transactions.slice(0, 7).map((tx, i) =>
          <motion.div key={tx.id}
          initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }}
          transition={{ delay: i * 0.04 }}
          style={{ display: 'grid', gridTemplateColumns: 'auto 1fr auto auto', gap: 16, padding: '14px 0',
            borderBottom: `1px solid ${themeTokens.hairline}`, alignItems: 'center' }}>
              <div style={{ width: 38, height: 38, borderRadius: 10, background: themeTokens.surface2, display: 'grid', placeItems: 'center',
              color: tx.type === 'income' ? themeTokens.positive : themeTokens.accent, fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 16 }}>
                {tx.category[0]}
              </div>
              <div>
                <div style={{ color: themeTokens.text, fontSize: 14 }}>{tx.description}</div>
                <div style={{ color: themeTokens.textDim, fontSize: 11, fontFamily: 'var(--font-mono)', marginTop: 2 }}>
                  {tx.category} · {tx.paymentMethod}
                </div>
              </div>
              <div style={{ color: themeTokens.textDim, fontFamily: 'var(--font-mono)', fontSize: 11 }}>
                {new Date(tx.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
              </div>
              <div style={{ fontFamily: 'var(--font-mono)', fontSize: 14,
              color: tx.type === 'income' ? themeTokens.positive : themeTokens.text }}>
                {tx.type === 'income' ? '+' : '−'}{fmt(tx.amount)}
              </div>
            </motion.div>
          )}
        </div>
      </Surface>
    </div>);

};

// =====================================================================
// CARDS PAGE
// =====================================================================
const CardsPage = () => {
  const { ccStats, themeTokens, fmt } = useAppContext();
  const cards = [
  { name: 'Mercado Pago', last4: '4731', holder: 'A. Aurum', type: 'visa', stats: ccStats['VISA Mercado Pago'] },
  { name: 'Nubank', last4: '8129', holder: 'A. Aurum', type: 'mastercard', stats: ccStats['Nubank MasterCard'] }];

  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(340px, 1fr))', gap: 24 }}>
      {cards.map((c, i) =>
      <Surface key={i} delay={i * 0.1}>
          <CardVisual {...c} accent={themeTokens.accent} themeTokens={themeTokens} />
          <div style={{ marginTop: 22, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
            <div>
              <Eyebrow>Current Cycle</Eyebrow>
              <Display size={28}>{fmt(c.stats?.current || 0)}</Display>
            </div>
            <div>
              <Eyebrow>Future</Eyebrow>
              <Display size={28} color={themeTokens.textDim}>{fmt(c.stats?.future || 0)}</Display>
            </div>
          </div>
          <div style={{ marginTop: 18, paddingTop: 14, borderTop: `1px solid ${themeTokens.hairline}` }}>
            <Eyebrow>Recent on this card</Eyebrow>
            {(c.stats?.txs || []).slice(0, 4).map((tx) =>
          <div key={tx.id} style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', fontSize: 13 }}>
                <span style={{ color: themeTokens.text }}>{tx.description}</span>
                <span style={{ color: themeTokens.textDim, fontFamily: 'var(--font-mono)' }}>{fmt(tx.amount)}</span>
              </div>
          )}
          </div>
        </Surface>
      )}
    </div>);

};

// =====================================================================
// GRAPH PAGE
// =====================================================================
const GraphPage = () => {
  const { transactions, themeTokens } = useAppContext();
  const series = useMemo(() => buildMonthlySeries(transactions, 6, 6), [transactions]);
  return (
    <div style={{ display: 'grid', gap: 24 }}>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24 }}>
        <Surface>
          <Eyebrow>Cash Flow · 14-month window</Eyebrow>
          <Display size={36}>{fmtCurrency(series[series.length - 1]?.cashflow || 0, 'BRL')}</Display>
          <div style={{ height: 12 }} />
          <AreaSpark data={series} dataKey="cashflow" accent={themeTokens.accent} tokens={themeTokens} height={220} />
        </Surface>
        <Surface>
          <Eyebrow>Income · 14-month window</Eyebrow>
          <Display size={36} color={themeTokens.positive}>{fmtCurrency(series[series.length - 1]?.income || 0, 'BRL')}</Display>
          <div style={{ height: 12 }} />
          <AreaSpark data={series} dataKey="income" accent={themeTokens.positive} tokens={themeTokens} height={220} />
        </Surface>
      </div>
      <Surface>
        <Eyebrow>Income vs Fixed + Variable</Eyebrow>
        <div style={{ height: 12 }} />
        <ComposedFlow data={series} />
      </Surface>
      <Surface>
        <Eyebrow>Spending by Category</Eyebrow>
        <div style={{ height: 12 }} />
        <ExpensePie transactions={transactions} />
      </Surface>
    </div>);

};

// =====================================================================
// NET WORTH
// =====================================================================
const NetWorthPage = () => {
  const { netWorthState, themeTokens, savingsTotal, fmt } = useAppContext();
  const aptValue = netWorthState.apartments.reduce((s, a) => s + a.value, 0);
  const motoValue = netWorthState.motorcycle.marketValue;
  const total = aptValue + motoValue + savingsTotal;
  return (
    <div style={{ display: 'grid', gap: 24 }}>
      <Surface>
        <Eyebrow>Total Net Worth</Eyebrow>
        <Display size={84}>{fmt(total)}</Display>
        <div style={{ marginTop: 12, color: themeTokens.textDim, fontSize: 13 }}>
          Apartments · Triumph Street Triple RS · Liquid Savings
        </div>
      </Surface>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 16 }}>
        {netWorthState.apartments.map((a, i) =>
        <Surface key={a.id} delay={i * 0.08}>
            <Eyebrow>{a.name}</Eyebrow>
            <Display size={36}>{fmt(a.value)}</Display>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginTop: 16, fontSize: 12 }}>
              <div>
                <div style={{ color: themeTokens.textDim, fontFamily: 'var(--font-mono)', letterSpacing: '0.18em', textTransform: 'uppercase' }}>Rent</div>
                <div style={{ color: themeTokens.text, marginTop: 4 }}>{fmt(a.rent)}/mo</div>
              </div>
              <div>
                <div style={{ color: themeTokens.textDim, fontFamily: 'var(--font-mono)', letterSpacing: '0.18em', textTransform: 'uppercase' }}>Area</div>
                <div style={{ color: themeTokens.text, marginTop: 4 }}>{a.sqm} m²</div>
              </div>
            </div>
          </Surface>
        )}
      </div>
    </div>);

};

// =====================================================================
// TRANSACTIONS LEDGER
// =====================================================================
const TransactionsPage = () => {
  const { transactions, themeTokens, fmt } = useAppContext();
  const [q, setQ] = useState('');
  const filtered = transactions.filter((t) => !q || t.description.toLowerCase().includes(q.toLowerCase()) || t.category.toLowerCase().includes(q.toLowerCase()));
  return (
    <div style={{ display: 'grid', gap: 16 }}>
      <Surface>
        <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search ledger…"
        style={{
          width: '100%', background: 'transparent', border: 'none', outline: 'none',
          color: themeTokens.text, fontSize: 18, fontFamily: 'var(--font-body)', fontWeight: 500
        }} />
      </Surface>
      <Surface style={{ padding: 0 }}>
        <div style={{ maxHeight: 600, overflow: 'auto' }}>
          {filtered.slice(0, 200).map((tx, i) =>
          <div key={tx.id} style={{ display: 'grid', gridTemplateColumns: 'auto 1fr auto auto', gap: 16, padding: '14px 22px',
            borderBottom: `1px solid ${themeTokens.hairline}`, alignItems: 'center' }}>
              <div style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: themeTokens.textDim, width: 64 }}>
                {new Date(tx.date).toLocaleDateString('en-US', { month: 'short', day: '2-digit' })}
              </div>
              <div>
                <div style={{ color: themeTokens.text, fontSize: 14 }}>{tx.description}</div>
                <div style={{ color: themeTokens.textDim, fontFamily: 'var(--font-mono)', fontSize: 10, letterSpacing: '0.18em', textTransform: 'uppercase', marginTop: 2 }}>
                  {tx.category}{tx.locked ? ' · locked' : ''}
                </div>
              </div>
              <div style={{ color: themeTokens.textDim, fontSize: 11, fontFamily: 'var(--font-mono)' }}>{tx.paymentMethod}</div>
              <div style={{ fontFamily: 'var(--font-mono)', fontSize: 14,
              color: tx.type === 'income' ? themeTokens.positive : themeTokens.text, minWidth: 100, textAlign: 'right' }}>
                {tx.type === 'income' ? '+' : '−'}{fmt(tx.amount)}
              </div>
            </div>
          )}
        </div>
      </Surface>
    </div>);

};

// =====================================================================
// COSTS / TIMELINE / DEBTS / GOALS PAGES (compact)
// =====================================================================
const CostsPage = () => {
  const { transactions, themeTokens } = useAppContext();
  const series = useMemo(() => buildMonthlySeries(transactions, 5, 0), [transactions]);
  return (
    <div style={{ display: 'grid', gap: 24 }}>
      <Surface>
        <Eyebrow>Fixed vs Variable · 6-month</Eyebrow>
        <div style={{ height: 12 }} />
        <ComposedFlow data={series} />
      </Surface>
      <Surface>
        <Eyebrow>By Category · This Month</Eyebrow>
        <div style={{ height: 12 }} />
        <ExpensePie transactions={transactions} />
      </Surface>
    </div>);

};

const GoalsPage = () => {
  return (
    <div style={{ display: 'grid', gap: 24 }}>
      <LuxurySedanGoal />
    </div>);

};

const TimelinePage = () => {
  const { transactions, themeTokens, fmt } = useAppContext();
  const series = useMemo(() => buildMonthlySeries(transactions, 6, 6), [transactions]);
  return (
    <Surface>
      <Eyebrow>Cash Flow Timeline · ±6 months</Eyebrow>
      <div style={{ height: 12 }} />
      <AreaSpark data={series} dataKey="cashflow" accent={useAppContext().themeTokens.accent} tokens={useAppContext().themeTokens} height={320} />
    </Surface>);

};

const MotorcyclePage = () => {
  const { netWorthState, themeTokens, fmt } = useAppContext();
  const m = netWorthState.motorcycle;
  return (
    <Surface>
      <Eyebrow>Triumph Street Triple RS · Specifications</Eyebrow>
      <Display size={56}>{m.brand} {m.model}</Display>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: 16, marginTop: 24 }}>
        {[
        ['Segment', m.segment], ['Horsepower', m.horsepower + ' hp'],
        ['Year', m.year], ['Color', m.color],
        ['Market Value', fmt(m.marketValue)], ['FIPE', fmt(m.fipe)]].
        map(([k, v]) =>
        <div key={k}>
            <Eyebrow>{k}</Eyebrow>
            <div style={{ color: themeTokens.text, fontSize: 18, fontFamily: 'var(--font-body)', fontWeight: 500 }}>{v}</div>
          </div>
        )}
      </div>
    </Surface>);

};

const DebtsPage = () => {
  const { themeTokens } = useAppContext();
  return (
    <Surface>
      <Eyebrow>Debts</Eyebrow>
      <Display size={36} color={themeTokens.textDim}>No active debts</Display>
      <div style={{ marginTop: 12, color: themeTokens.textDim, fontSize: 13 }}>
        Your only locked liability is the Triumph Street Triple RS financing (48 installments).
      </div>
    </Surface>);

};

Object.assign(window, {
  Surface, Eyebrow, Display, KPICard,
  Dashboard, CardsPage, GraphPage, NetWorthPage, TransactionsPage,
  CostsPage, GoalsPage, TimelinePage, MotorcyclePage, DebtsPage,
  LuxurySedanGoal, CardVisual
});
