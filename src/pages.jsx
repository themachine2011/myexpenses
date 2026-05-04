import React, { useState, useEffect, useRef, useMemo } from 'react';
import { motion } from 'framer-motion';
import { useAppContext } from './context.jsx';
import { resolveRange, CATEGORIES, MOTO_AMOUNT, MOTO_COUNT, transactionsToCSV, parseTransactionsCSV } from './context.jsx';
import { fmtCurrency } from './tokens.jsx';
import { AreaSpark, RotatingCharts, ExpensePie, ComposedFlow, RadarHealth, RadialGauge, RetentionBar, buildMonthlySeries } from './charts.jsx';

export const Surface = ({ children, style, onClick, hoverable, delay = 0 }) => {
  const { themeTokens } = useAppContext();
  return (
    <motion.div
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
    </motion.div>
  );
};

export const Eyebrow = ({ children, color }) => {
  const { themeTokens } = useAppContext();
  return (
    <div style={{
      fontFamily: 'var(--font-mono)',
      fontSize: 10, letterSpacing: '0.32em', textTransform: 'uppercase',
      color: color || themeTokens.textDim, marginBottom: 8
    }}>{children}</div>
  );
};

export const Display = ({ children, size = 56, color, style, weight = 700 }) => {
  const { themeTokens } = useAppContext();
  const w = weight >= 600 ? 700 : 400;
  return (
    <div style={{
      fontFamily: 'var(--font-display)',
      fontWeight: w,
      fontSize: size, lineHeight: 1, fontStyle: 'normal',
      color: color || themeTokens.text, letterSpacing: '-0.01em',
      ...style
    }}>{children}</div>
  );
};

const CARD_IMG = { visa: '/assets/visa.png', mastercard: '/assets/nubank.png' };

export const CardVisual = ({ type }) => (
  <img src={CARD_IMG[type] || CARD_IMG.visa} alt=""
    draggable={false}
    style={{
      display: 'block',
      width: '100%', aspectRatio: '1.586 / 1', borderRadius: 20,
      objectFit: 'cover',
      boxShadow: '0 30px 60px rgba(0,0,0,0.45), inset 0 1px 0 rgba(255,255,255,0.06)',
      userSelect: 'none', pointerEvents: 'none',
    }} />
);

const CardBack = ({ total, last4, name }) => (
  <div style={{
    width: '100%', aspectRatio: '1.586 / 1', borderRadius: 20,
    background: '#FFFFFF', color: '#000',
    boxShadow: '0 30px 60px rgba(0,0,0,0.45)',
    padding: 26, position: 'relative', overflow: 'hidden',
    fontFamily: 'var(--font-body)',
    display: 'flex', flexDirection: 'column', justifyContent: 'space-between',
  }}>
    <div style={{
      fontFamily: 'var(--font-mono)', fontSize: 10, letterSpacing: '0.32em',
      textTransform: 'uppercase', color: '#000',
    }}>{name} · •••• {last4}</div>
    <div>
      <div style={{
        fontFamily: 'var(--font-mono)', fontSize: 10, letterSpacing: '0.32em',
        textTransform: 'uppercase', color: '#000', marginBottom: 8,
      }}>Total Balance</div>
      <div style={{
        fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 44,
        color: '#000', letterSpacing: '-0.02em', lineHeight: 1,
      }}>{fmtCurrency(total, 'BRL')}</div>
    </div>
    <div style={{
      fontFamily: 'var(--font-mono)', fontSize: 9, letterSpacing: '0.4em',
      textTransform: 'uppercase', color: '#000', opacity: 0.6,
    }}>Tap to flip · Hover to tilt</div>
  </div>
);

const FlipTiltCard = ({ children, back }) => {
  const wrapRef = useRef(null);
  const [flipped, setFlipped] = useState(false);
  const [tilt, setTilt] = useState({ x: 0, y: 0 });

  const onMove = (e) => {
    const r = wrapRef.current?.getBoundingClientRect();
    if (!r) return;
    const px = (e.clientX - r.left) / r.width - 0.5;
    const py = (e.clientY - r.top) / r.height - 0.5;
    setTilt({ x: -py * 18, y: px * 18 });
  };
  const onLeave = () => setTilt({ x: 0, y: 0 });

  return (
    <div ref={wrapRef}
      onMouseMove={onMove}
      onMouseLeave={onLeave}
      onClick={() => setFlipped((f) => !f)}
      style={{ width: '100%', perspective: 1200, cursor: 'pointer' }}>
      <div style={{
        position: 'relative', width: '100%',
        aspectRatio: '1.586 / 1',
        transformStyle: 'preserve-3d',
        transform: `rotateX(${tilt.x}deg) rotateY(${(flipped ? 180 : 0) + tilt.y}deg)`,
        transition: 'transform 600ms cubic-bezier(0.22,1,0.36,1)',
      }}>
        <div style={{ position: 'absolute', inset: 0, backfaceVisibility: 'hidden' }}>{children}</div>
        <div style={{ position: 'absolute', inset: 0, backfaceVisibility: 'hidden', transform: 'rotateY(180deg)' }}>{back}</div>
      </div>
    </div>
  );
};

const PaymentPanel = ({ current, future }) => {
  const { themeTokens, fmt } = useAppContext();
  return (
    <div style={{
      marginTop: 18, padding: 16, borderRadius: 14,
      background: 'var(--color-bg-surface, #FFFFFF)',
      color: '#000',
      display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12,
      boxShadow: '0 8px 24px rgba(0,0,0,0.25)',
    }}>
      <div>
        <div style={{
          fontFamily: 'var(--font-mono)', fontSize: 9, letterSpacing: '0.32em',
          textTransform: 'uppercase', color: 'rgba(0,0,0,0.55)',
        }}>Current Month</div>
        <div style={{
          fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 24,
          color: '#D7263D', marginTop: 4, letterSpacing: '-0.01em',
        }}>{fmt(current)}</div>
      </div>
      <div>
        <div style={{
          fontFamily: 'var(--font-mono)', fontSize: 9, letterSpacing: '0.32em',
          textTransform: 'uppercase', color: 'rgba(0,0,0,0.55)',
        }}>Future / Pending</div>
        <div style={{
          fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 24,
          color: '#E0B33B', marginTop: 4, letterSpacing: '-0.01em',
        }}>{fmt(future)}</div>
      </div>
    </div>
  );
};

const RotaryCarousel = ({ items }) => {
  const { themeTokens } = useAppContext();
  const [idx, setIdx] = useState(0);
  const lockRef = useRef(0);
  const wheelAccum = useRef(0);
  const ref = useRef(null);
  const n = items.length;

  const cycle = (dir) => {
    const now = Date.now();
    if (now - lockRef.current < 560) return;
    lockRef.current = now;
    setIdx((i) => (i + dir + n) % n);
  };

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const onWheel = (e) => {
      const dx = Math.abs(e.deltaX) > Math.abs(e.deltaY) ? e.deltaX : e.deltaY;
      e.preventDefault();
      wheelAccum.current += dx;
      if (Math.abs(wheelAccum.current) > 40) {
        cycle(wheelAccum.current > 0 ? 1 : -1);
        wheelAccum.current = 0;
      }
    };
    el.addEventListener('wheel', onWheel, { passive: false });
    return () => el.removeEventListener('wheel', onWheel);
  }, []);

  const offsetOf = (i) => {
    let d = i - idx;
    if (d > n / 2) d -= n;
    if (d < -n / 2) d += n;
    return d;
  };

  return (
    <div style={{ position: 'relative' }}>
      <div ref={ref} style={{
        position: 'relative', width: '100%', height: 420,
        overflow: 'hidden', userSelect: 'none',
      }}>
        {items.map((it, i) => {
          const off = offsetOf(i);
          return (
            <div key={i} style={{
              position: 'absolute', inset: 0,
              transform: `translateX(${off * 100}%)`,
              transition: 'transform 560ms cubic-bezier(0.22,1,0.36,1)',
              willChange: 'transform',
              pointerEvents: off === 0 ? 'auto' : 'none',
              padding: '0 4px',
            }}>
              <div style={{
                height: '100%', display: 'flex', flexDirection: 'column',
                background: 'transparent', boxShadow: 'none',
              }}>
                <Eyebrow>{it.label}</Eyebrow>
                <div style={{ flex: 1, minHeight: 0 }}>{it.render()}</div>
              </div>
            </div>
          );
        })}
      </div>

      <div style={{
        marginTop: 18, display: 'flex', justifyContent: 'space-between',
        alignItems: 'center', gap: 12,
      }}>
        <button onClick={() => cycle(-1)}
          style={navBtn(themeTokens)}>‹</button>
        <div style={{ display: 'flex', gap: 8 }}>
          {items.map((_, i) => (
            <button key={i} onClick={() => setIdx(i)}
              aria-label={`Go to chart ${i + 1}`}
              style={{
                width: i === idx ? 22 : 6, height: 6,
                border: 'none', padding: 0,
                borderRadius: 999,
                background: i === idx ? themeTokens.accent : themeTokens.hairline2,
                transition: 'all 280ms ease',
                cursor: 'pointer',
              }} />
          ))}
        </div>
        <button onClick={() => cycle(1)}
          style={navBtn(themeTokens)}>›</button>
      </div>
    </div>
  );
};

const navBtn = (tk) => ({
  width: 36, height: 36, borderRadius: 999,
  border: `1px solid ${tk.hairline2}`,
  background: 'transparent',
  color: tk.textDim,
  fontSize: 18, lineHeight: 1,
  cursor: 'pointer',
  display: 'grid', placeItems: 'center',
  fontFamily: 'var(--font-body)',
  transition: 'all 200ms',
});

export const ParticleField = () => {
  const { themeTokens } = useAppContext();
  const dots = useMemo(() => Array.from({ length: 28 }, (_, i) => ({
    id: i,
    x: Math.random() * 100,
    y: Math.random() * 100,
    s: 1 + Math.random() * 2.4,
    d: 12 + Math.random() * 18,
    o: 0.04 + Math.random() * 0.12,
    delay: Math.random() * -20,
  })), []);
  return (
    <div aria-hidden style={{
      position: 'fixed', inset: 0, pointerEvents: 'none', zIndex: 0,
      overflow: 'hidden',
    }}>
      <style>{`
        @keyframes au-drift {
          0%   { transform: translate3d(0,0,0); }
          50%  { transform: translate3d(20px,-30px,0); }
          100% { transform: translate3d(0,0,0); }
        }
      `}</style>
      {dots.map((d) => (
        <span key={d.id} style={{
          position: 'absolute',
          left: `${d.x}%`, top: `${d.y}%`,
          width: d.s, height: d.s, borderRadius: '50%',
          background: themeTokens.accent,
          opacity: d.o,
          filter: `blur(${d.s > 2.4 ? 1 : 0}px)`,
          animation: `au-drift ${d.d}s ease-in-out infinite`,
          animationDelay: `${d.delay}s`,
        }} />
      ))}
    </div>
  );
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

export const LuxurySedanGoal = () => {
  const { themeTokens, savingsTotal, goalAmount, addSaving, fmt } = useAppContext();
  const [coverPct, setCoverPct] = useState(1.0);
  const [driving, setDriving] = useState(false);
  const [windPulse, setWindPulse] = useState(0);
  const [savingsInput, setSavingsInput] = useState('');
  const sectionRef = useRef(null);

  const applySaving = () => {
    const n = Number(savingsInput);
    if (!n || isNaN(n)) return;
    addSaving(n);
    setSavingsInput('');
  };

  useEffect(() => {
    const onWheel = (e) => {
      const r = sectionRef.current?.getBoundingClientRect();
      if (!r) return;
      const inView = r.top < window.innerHeight * 0.7 && r.bottom > 100;
      if (!inView) return;
      e.preventDefault();
      const delta = e.deltaY;
      setCoverPct((p) => Math.max(0, Math.min(1, p - delta * 0.0015)));
      setWindPulse((w) => w + Math.max(-1, Math.min(1, delta / 80)));
    };
    const el = sectionRef.current;
    el?.addEventListener('wheel', onWheel, { passive: false });
    return () => el?.removeEventListener('wheel', onWheel);
  }, []);

  useEffect(() => {
    let lastY = null;
    const onStart = (e) => { lastY = e.touches[0].clientY; };
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

        <div style={{
          position: 'relative',
          width: '100%',
          aspectRatio: '16/9',
          background: '#000',
          overflow: 'hidden'
        }}>
          <img src="/assets/sport-sedan.png" alt="Sedan goal"
            style={{
              position: 'absolute', inset: 0, width: '100%', height: '100%',
              objectFit: 'cover',
              transform: driving ? 'scale(1.04) translateX(0)' : 'scale(1.02)',
              transition: 'transform 600ms ease',
              cursor: 'pointer'
            }}
            onClick={() => setDriving((d) => !d)} />

          {driving &&
            <div style={{
              position: 'absolute', left: 0, right: 0, bottom: 0, height: '18%',
              pointerEvents: 'none',
              background: 'repeating-linear-gradient(90deg, rgba(255,200,170,0.0) 0 40px, rgba(255,210,180,0.18) 40px 50px, rgba(255,200,170,0.0) 50px 90px)',
              animation: 'au-ground 0.45s linear infinite',
              mixBlendMode: 'screen'
            }} />
          }

          {driving &&
            <>
              <div style={spinHighlight(themeTokens.accent, '21%', '76%')} />
              <div style={spinHighlight(themeTokens.accent, '70%', '76%')} />
            </>
          }

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
              const pleat = (
                <div style={{
                  position: 'absolute', inset: 0,
                  background: `repeating-linear-gradient(90deg,
                    transparent 0 38px,
                    rgba(0,0,0,${0.18 + Math.abs(windPulse) * 0.08}) 38px 40px,
                    transparent 40px 78px)`,
                  pointerEvents: 'none'
                }} />
              );

              const hem = (
                <div style={{ position: 'absolute', left: 0, right: 0, bottom: 0, height: 18,
                  background: `linear-gradient(180deg, transparent, ${themeTokens.accentDeep})`, opacity: 0.6 }} />
              );

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
                      <div style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 38, color: themeTokens.accent, lineHeight: 1, letterSpacing: '-0.02em' }}>Soon</div>
                    </div>
                    <div style={{ fontFamily: 'var(--font-mono)', fontSize: 11, letterSpacing: '0.36em', textTransform: 'uppercase', color: themeTokens.accentSoft }}>Scroll to reveal</div>
                  </div>
                </>
              );
            })()}
          </div>

          <div style={{
            position: 'absolute', left: 32, bottom: 24,
            color: '#F2EDE6',
            textShadow: '0 4px 24px rgba(0,0,0,0.7)'
          }}>
            <Eyebrow color={themeTokens.accent}>May 2029 · Purchasing Goal</Eyebrow>
          </div>
        </div>

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
            <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
              <input
                type="number"
                step="0.01"
                value={savingsInput}
                onChange={(e) => setSavingsInput(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter') applySaving(); }}
                placeholder="e.g. 500 or -250"
                style={{
                  width: 180,
                  background: 'transparent',
                  border: `1px solid ${themeTokens.hairline2}`,
                  borderRadius: 12,
                  padding: '12px 16px',
                  color: themeTokens.text,
                  fontFamily: 'var(--font-mono)', fontSize: 14,
                  outline: 'none',
                }} />
              <button onClick={applySaving}
                disabled={!savingsInput || Number(savingsInput) === 0}
                style={{
                  background: themeTokens.accent,
                  color: '#0B0B0D',
                  border: 'none',
                  padding: '14px 22px',
                  borderRadius: 999,
                  cursor: (!savingsInput || Number(savingsInput) === 0) ? 'not-allowed' : 'pointer',
                  opacity: (!savingsInput || Number(savingsInput) === 0) ? 0.5 : 1,
                  fontFamily: 'var(--font-body)', fontWeight: 700,
                  fontSize: 12, letterSpacing: '0.18em', textTransform: 'uppercase',
                  boxShadow: `0 12px 30px ${themeTokens.accent}40`,
                  transition: 'transform 200ms',
                }}
                onMouseDown={(e) => e.currentTarget.style.transform = 'scale(0.97)'}
                onMouseUp={(e) => e.currentTarget.style.transform = 'scale(1)'}>
                Apply
              </button>
            </div>
          </div>
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
    </Surface>
  );
};

export const KPICard = ({ label, value, delta, positive, valueColor }) => {
  const { themeTokens } = useAppContext();
  const positive_ = positive ?? delta >= 0;
  return (
    <Surface>
      <Eyebrow>{label}</Eyebrow>
      <Display size={42} color={valueColor}>{value}</Display>
      {delta !== undefined &&
        <div style={{ marginTop: 10, display: 'flex', alignItems: 'center', gap: 8, fontFamily: 'var(--font-mono)', fontSize: 12,
          color: positive_ ? themeTokens.positive : themeTokens.negative }}>
          {positive_ ? '↑' : '↓'} {Math.abs(delta).toFixed(1)}%
          <span style={{ color: themeTokens.textDim }}>vs last month</span>
        </div>
      }
    </Surface>
  );
};

const DashboardCarousel = ({ transactions, series }) => {
  const { themeTokens, savingsTotal, goalAmount } = useAppContext();

  const byCard = useMemo(() => {
    const sums = { 'VISA Mercado Pago': 0, 'Nubank MasterCard': 0, 'Bank Transfer': 0, 'PIX': 0, 'Cash': 0 };
    const now = new Date();
    for (const tx of transactions) {
      if (tx.type !== 'expense') continue;
      const d = new Date(tx.date);
      if (d.getMonth() !== now.getMonth() || d.getFullYear() !== now.getFullYear()) continue;
      if (sums[tx.paymentMethod] != null) sums[tx.paymentMethod] += tx.amount;
    }
    return Object.entries(sums)
      .filter(([, v]) => v > 0)
      .map(([k, v]) => ({ label: k.replace('Mercado Pago','MP').replace('MasterCard','MC').replace('Bank Transfer','Bank'), value: Math.round(v) }));
  }, [transactions]);

  const radar = useMemo(() => {
    const last = series[series.length - 1] || { income: 1, fixed: 0, variable: 0, cashflow: 0 };
    const inc = Math.max(1, last.income);
    return [
      { key: 'Savings',  value: Math.max(0, Math.min(100, (last.cashflow / inc) * 100)) },
      { key: 'Income',   value: Math.min(100, (inc / 12000) * 100) },
      { key: 'Fixed',    value: Math.max(0, 100 - (last.fixed / inc) * 100) },
      { key: 'Variable', value: Math.max(0, 100 - (last.variable / inc) * 100) },
      { key: 'Liquidity',value: Math.max(0, Math.min(100, (last.cashflow / 5000) * 100)) },
    ];
  }, [series]);

  const items = [
    { label: 'Cash Flow · Revenue vs Net', render: () => <AreaSpark data={series} dataKey="cashflow" accent={themeTokens.accent} tokens={themeTokens} height={360} /> },
    { label: 'Spending · Inventory Donut', render: () => <ExpensePie transactions={transactions} /> },
    { label: 'Spend by Method · Retention', render: () => <RetentionBar data={byCard} accent={themeTokens.accent} /> },
    { label: 'Financial Health · Radar', render: () => <RadarHealth metrics={radar} /> },
    { label: 'Savings · Goal Progress', render: () => <RadialGauge value={savingsTotal} max={goalAmount} label="Goal Progress" /> },
  ];

  return <RotaryCarousel items={items} />;
};

export const Dashboard = () => {
  const { transactions, themeTokens, fmt } = useAppContext();
  const [timeRange, setTimeRange] = useState(6);
  const series = useMemo(() => buildMonthlySeries(transactions, timeRange - 1, 0), [transactions, timeRange]);

  const lastMonth = series[series.length - 1] || { income: 0, fixed: 0, variable: 0, cashflow: 0 };
  const prevMonth = series[series.length - 2] || { income: 1, cashflow: 1 };
  const incomeDelta = (lastMonth.income - prevMonth.income) / Math.max(1, prevMonth.income) * 100;
  const cashflowDelta = (lastMonth.cashflow - prevMonth.cashflow) / Math.max(1, Math.abs(prevMonth.cashflow)) * 100;
  const savingsRate = lastMonth.income > 0 ? lastMonth.cashflow / lastMonth.income * 100 : 0;

  return (
    <div style={{ display: 'grid', gap: 24 }}>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 16 }}>
        <KPICard label="Liquid Income" value={fmt(lastMonth.income)} delta={incomeDelta}
          valueColor={lastMonth.income >= 0 ? themeTokens.positive : themeTokens.negative} />
        <KPICard label="Cash Flow" value={fmt(lastMonth.cashflow)} delta={cashflowDelta}
          valueColor={lastMonth.cashflow >= 0 ? themeTokens.positive : themeTokens.negative} />
        <KPICard label="Savings Rate" value={`${savingsRate.toFixed(1)}%`} positive={savingsRate >= 20} delta={savingsRate}
          valueColor={themeTokens.positive} />
        <KPICard label="Fixed Expenses" value={fmt(lastMonth.fixed)} positive={false}
          valueColor={themeTokens.negative} />
      </div>

      <Surface>
        <RotatingCharts
          data={series}
          lines={[
            { name: 'Cash Flow', key: 'cashflow', color: themeTokens.accent },
            { name: 'Income', key: 'income', color: themeTokens.positive },
            { name: 'Expenses', key: 'expense', color: themeTokens.negative }
          ]}
          timeRange={timeRange} setTimeRange={setTimeRange}
          tabs={[
            { value: 3, label: '3M' }, { value: 6, label: '6M' }, { value: 12, label: '1Y' }
          ]} />
      </Surface>

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

      <div style={{ padding: '8px 0' }}>
        <Eyebrow>Rotary Carousel · 5 Graphs</Eyebrow>
        <div style={{ height: 16 }} />
        <DashboardCarousel transactions={transactions} series={series} />
      </div>


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
    </div>
  );
};

export const CardsPage = () => {
  const { ccStats, themeTokens, fmt } = useAppContext();
  const cards = [
    { name: 'Mercado Pago', last4: '4731', type: 'visa', stats: ccStats['VISA Mercado Pago'] },
    { name: 'Nubank',       last4: '8129', type: 'mastercard', stats: ccStats['Nubank MasterCard'] }
  ];

  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(360px, 1fr))', gap: 28 }}>
      {cards.map((c, i) =>
        <motion.div key={i}
          initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: i * 0.08, ease: [0.22, 1, 0.36, 1] }}>
          <FlipTiltCard
            back={<CardBack total={c.stats?.total || 0} last4={c.last4} name={c.name} />}>
            <CardVisual type={c.type} />
          </FlipTiltCard>

          <PaymentPanel current={c.stats?.current || 0} future={c.stats?.future || 0} />

          <div style={{ marginTop: 16, paddingTop: 14, borderTop: `1px solid ${themeTokens.hairline}` }}>
            <Eyebrow>Recent on this card</Eyebrow>
            {(c.stats?.txs || []).slice(0, 4).map((tx) =>
              <div key={tx.id} style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', fontSize: 13 }}>
                <span style={{ color: themeTokens.text }}>{tx.description}</span>
                <span style={{ color: themeTokens.textDim, fontFamily: 'var(--font-mono)' }}>{fmt(tx.amount)}</span>
              </div>
            )}
          </div>
        </motion.div>
      )}
    </div>
  );
};

export const GraphPage = () => {
  const { transactions, themeTokens } = useAppContext();
  const series = useMemo(() => buildMonthlySeries(transactions, 6, 6), [transactions]);
  return (
    <div style={{ display: 'grid', gap: 24 }}>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24 }}>
        <Surface>
          <Eyebrow>Cash Flow · 14-month window</Eyebrow>
          <Display size={36}
            color={(series[series.length - 1]?.cashflow || 0) >= 0 ? themeTokens.positive : themeTokens.negative}>
            {fmtCurrency(series[series.length - 1]?.cashflow || 0, 'BRL')}
          </Display>
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
    </div>
  );
};

export const NetWorthPage = () => {
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
    </div>
  );
};

const PAYMENT_METHODS = [
  { id: 'Debit/Cash',        label: 'Debit/Cash',  short: 'D/C',  img: null,                  type: 'debit' },
  { id: 'VISA Mercado Pago', label: 'Mercado Pago', short: 'Visa', img: '/assets/visa.png',   type: 'visa' },
  { id: 'Nubank MasterCard', label: 'Nubank',       short: 'Nu',   img: '/assets/nubank.png', type: 'mastercard' },
];

const pad2 = (n) => String(n).padStart(2, '0');
const dateKeyOf = (y, m, d) => `${y}-${m + 1}-${d}`;
const isoOf = (y, m, d) => `${y}-${pad2(m + 1)}-${pad2(d)}`;

const Calendar = ({ marks = {}, monthOffset = 0, onPickMonth, selectedDate, onSelectDate }) => {
  const { themeTokens } = useAppContext();
  const today = new Date();
  const cur = new Date(today.getFullYear(), today.getMonth() + monthOffset, 1);
  const y = cur.getFullYear(), m = cur.getMonth();
  const firstDow = new Date(y, m, 1).getDay();
  const days = new Date(y, m + 1, 0).getDate();
  const cells = Array.from({ length: firstDow + days }, (_, i) =>
    i < firstDow ? null : i - firstDow + 1
  );
  const monthLabel = cur.toLocaleString('en-US', { month: 'long', year: 'numeric' });

  return (
    <div style={{
      background: themeTokens.surface, border: `1px solid ${themeTokens.hairline}`,
      borderRadius: 14, padding: 16,
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
        <button onClick={() => onPickMonth?.(-1)} style={navBtn(themeTokens)}>‹</button>
        <div style={{
          fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 16,
          color: themeTokens.text, letterSpacing: '-0.01em',
        }}>{monthLabel}</div>
        <button onClick={() => onPickMonth?.(1)} style={navBtn(themeTokens)}>›</button>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 4 }}>
        {['S','M','T','W','T','F','S'].map((d, i) => (
          <div key={i} style={{
            fontFamily: 'var(--font-mono)', fontSize: 9, letterSpacing: '0.2em',
            color: themeTokens.textFaint, textAlign: 'center', padding: '4px 0',
          }}>{d}</div>
        ))}
        {cells.map((day, i) => {
          if (day == null) return <div key={i} />;
          const dateKey = dateKeyOf(y, m, day);
          const iso = isoOf(y, m, day);
          const mark = marks[dateKey];
          const isToday = day === today.getDate() && m === today.getMonth() && y === today.getFullYear();
          const isSelected = selectedDate && selectedDate === iso;
          const clickable = typeof onSelectDate === 'function';
          const baseBorder =
            isSelected ? `1.5px solid ${themeTokens.accent}` :
            mark === 'first' ? `1.5px solid ${themeTokens.accent}` :
            mark === 'last'  ? `1.5px solid ${themeTokens.accentSoft}` :
            mark === 'mid'   ? `1px solid ${themeTokens.hairline2}` :
            '1px solid transparent';
          const baseBg =
            isSelected ? `${themeTokens.accent}33` :
            isToday    ? `${themeTokens.accent}20` :
            'transparent';
          const cellStyle = {
            position: 'relative',
            aspectRatio: '1/1',
            display: 'grid', placeItems: 'center',
            fontFamily: 'var(--font-mono)', fontSize: 11,
            color: mark || isSelected ? themeTokens.text : themeTokens.textDim,
            borderRadius: 8,
            border: baseBorder,
            background: baseBg,
            padding: 0,
            cursor: clickable ? 'pointer' : 'default',
          };
          const inner = (
            <>
              {day}
              {mark && <span style={{
                position: 'absolute', bottom: 3, width: 4, height: 4, borderRadius: '50%',
                background: mark === 'first' ? themeTokens.accent :
                            mark === 'last'  ? themeTokens.accentSoft :
                            themeTokens.hairline2,
              }} />}
            </>
          );
          return clickable ? (
            <button key={i} type="button" onClick={() => onSelectDate(iso)} style={cellStyle}>{inner}</button>
          ) : (
            <div key={i} style={cellStyle}>{inner}</div>
          );
        })}
      </div>
      <div style={{ display: 'flex', gap: 16, marginTop: 12, flexWrap: 'wrap' }}>
        <Legend dot={themeTokens.accent} text="First payment" tk={themeTokens} />
        <Legend dot={themeTokens.accentSoft} text="Last payment" tk={themeTokens} />
        <Legend dot={themeTokens.hairline2} text="Installment" tk={themeTokens} />
      </div>
    </div>
  );
};

const Legend = ({ dot, text, tk }) => (
  <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
    <span style={{ width: 8, height: 8, borderRadius: '50%', background: dot }} />
    <span style={{ fontFamily: 'var(--font-mono)', fontSize: 9, letterSpacing: '0.18em', textTransform: 'uppercase', color: tk.textDim }}>{text}</span>
  </div>
);

const CardThumb = ({ method, active, onClick }) => {
  const { themeTokens } = useAppContext();
  return (
    <button onClick={onClick}
      style={{
        position: 'relative',
        width: 84, height: 54, padding: 0,
        borderRadius: 10,
        border: active ? `2px solid ${themeTokens.accent}` : `1px solid ${themeTokens.hairline2}`,
        background: 'transparent',
        cursor: 'pointer',
        overflow: 'hidden',
        opacity: active ? 1 : 0.55,
        transition: 'all 200ms',
      }}>
      <img src={method.img} alt="" draggable={false}
        style={{ width: '100%', height: '100%', objectFit: 'cover', pointerEvents: 'none' }} />
    </button>
  );
};

const computeCardMarks = (transactions, cardId) => {
  const groups = new Map();
  for (const tx of transactions) {
    if (tx.type !== 'expense' || tx.paymentMethod !== cardId) continue;
    const key = tx.groupId || tx.debtId || tx.id;
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key).push(tx);
  }
  const marks = {};
  for (const list of groups.values()) {
    if (list.length === 1) {
      const d = new Date(list[0].date);
      marks[`${d.getFullYear()}-${d.getMonth() + 1}-${d.getDate()}`] = 'first';
      continue;
    }
    const sorted = [...list].sort((a, b) => new Date(a.date) - new Date(b.date));
    sorted.forEach((tx, i) => {
      const d = new Date(tx.date);
      const key = `${d.getFullYear()}-${d.getMonth() + 1}-${d.getDate()}`;
      const tag = i === 0 ? 'first' : i === sorted.length - 1 ? 'last' : 'mid';
      if (marks[key] !== 'first' && marks[key] !== 'last') marks[key] = tag;
    });
  }
  return marks;
};

const monthOffsetFromIso = (iso) => {
  if (!iso) return 0;
  const [y, m] = iso.split('-').map(Number);
  const now = new Date();
  return (y - now.getFullYear()) * 12 + ((m - 1) - now.getMonth());
};

export const GlobalCalendar = () => {
  const { transactions, pickedDate, setPickedDate, activeFormCard, themeTokens } = useAppContext();
  const [monthOffset, setMonthOffset] = useState(() => monthOffsetFromIso(pickedDate));

  useEffect(() => {
    setMonthOffset(monthOffsetFromIso(pickedDate));
  }, [pickedDate]);

  const marks = useMemo(() => computeCardMarks(transactions, activeFormCard), [transactions, activeFormCard]);

  return (
    <div style={{ display: 'grid', gap: 12 }}>
      <div style={{
        fontFamily: 'var(--font-mono)', fontSize: 10, letterSpacing: '0.32em',
        textTransform: 'uppercase', color: themeTokens.textDim,
      }}>Payment Calendar</div>
      <Calendar
        marks={marks}
        monthOffset={monthOffset}
        onPickMonth={(d) => setMonthOffset((o) => o + d)}
        selectedDate={pickedDate}
        onSelectDate={(iso) => setPickedDate(iso)}
      />
    </div>
  );
};

const RANGE_PRESETS = [
  { id: 'p30',  label: '30D',  filter: { kind: 'preset', days: 30 } },
  { id: 'p90',  label: '90D',  filter: { kind: 'preset', days: 90 } },
  { id: 'p365', label: '12M',  filter: { kind: 'preset', days: 365 } },
];

export const RangeFilter = () => {
  const { dateFilter, setDateFilter, themeTokens } = useAppContext();
  const isCustom = dateFilter?.kind === 'custom';
  const matchPreset = (preset) =>
    !isCustom && dateFilter?.kind === 'preset' && Number(dateFilter.days) === preset.filter.days;

  const chipStyle = (active) => ({
    padding: '6px 12px',
    borderRadius: 999,
    border: `1px solid ${active ? themeTokens.accent : themeTokens.hairline2}`,
    background: active ? themeTokens.accent : 'transparent',
    color: active ? '#0B0B0D' : themeTokens.textDim,
    fontFamily: 'var(--font-mono)', fontSize: 10,
    letterSpacing: '0.18em', textTransform: 'uppercase',
    cursor: 'pointer', transition: 'all 200ms',
  });

  const inputStyle = {
    background: 'transparent',
    border: `1px solid ${themeTokens.hairline2}`,
    borderRadius: 8, padding: '6px 8px',
    color: themeTokens.text,
    fontFamily: 'var(--font-mono)', fontSize: 11,
    outline: 'none', colorScheme: 'dark',
    flex: 1, minWidth: 0,
  };

  return (
    <div style={{ display: 'grid', gap: 10 }}>
      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
        {RANGE_PRESETS.map((p) => (
          <button key={p.id} onClick={() => setDateFilter(p.filter)} style={chipStyle(matchPreset(p))}>
            {p.label}
          </button>
        ))}
        <button
          onClick={() => setDateFilter({ kind: 'custom', from: '', to: '' })}
          style={chipStyle(isCustom)}>
          Custom
        </button>
      </div>
      {isCustom && (
        <div style={{ display: 'flex', gap: 8 }}>
          <input type="date" value={dateFilter.from || ''}
            onChange={(e) => setDateFilter({ ...dateFilter, from: e.target.value })}
            style={inputStyle} />
          <input type="date" value={dateFilter.to || ''}
            onChange={(e) => setDateFilter({ ...dateFilter, to: e.target.value })}
            style={inputStyle} />
        </div>
      )}
    </div>
  );
};

const filterByRange = (transactions, filter) => {
  const { from, to } = resolveRange(filter);
  return transactions.filter((t) => {
    const d = new Date(t.date);
    if (from && d < from) return false;
    if (to && d > to) return false;
    return true;
  });
};

export const HistorySidebar = () => {
  const { transactions, dateFilter, themeTokens, fmt, setView, setFocusTxId, setSearchQuery } = useAppContext();

  const rows = useMemo(() => {
    return filterByRange(transactions, dateFilter)
      .slice()
      .sort((a, b) => new Date(b.date) - new Date(a.date));
  }, [transactions, dateFilter]);

  const today = new Date();

  const open = (tx) => {
    setSearchQuery('');
    setFocusTxId(tx.id);
    setView('ledger');
  };

  return (
    <div style={{
      background: themeTokens.surface,
      border: `1px solid ${themeTokens.hairline}`,
      borderRadius: 18,
      display: 'flex', flexDirection: 'column',
      maxHeight: 'calc(100vh - 140px)',
      overflow: 'hidden',
    }}>
      <div style={{ padding: '18px 18px 12px' }}>
        <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', marginBottom: 10 }}>
          <div style={{
            fontFamily: 'var(--font-mono)', fontSize: 10, letterSpacing: '0.32em',
            textTransform: 'uppercase', color: themeTokens.textDim,
          }}>Transaction History</div>
          <div style={{
            fontFamily: 'var(--font-mono)', fontSize: 11, color: themeTokens.text,
          }}>{rows.length}</div>
        </div>
        <RangeFilter />
      </div>
      <div style={{ overflow: 'auto', borderTop: `1px solid ${themeTokens.hairline}` }}>
        {rows.length === 0 && (
          <div style={{ padding: 24, color: themeTokens.textDim, fontSize: 12, textAlign: 'center' }}>
            No transactions in range.
          </div>
        )}
        {rows.map((tx) => {
          const d = new Date(tx.date);
          const future = d > today;
          const color = future ? '#E0B33B' : themeTokens.textDim;
          const titleColor = future ? '#E0B33B' : themeTokens.textDim;
          return (
            <button key={tx.id} onClick={() => open(tx)}
              style={{
                width: '100%',
                display: 'grid', gridTemplateColumns: '52px 1fr auto', gap: 10,
                padding: '10px 16px',
                border: 'none',
                background: 'transparent',
                textAlign: 'left',
                borderBottom: `1px solid ${themeTokens.hairline}`,
                cursor: 'pointer',
              }}>
              <div style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color }}>
                {d.toLocaleDateString('en-US', { month: 'short', day: '2-digit' })}
              </div>
              <div style={{ minWidth: 0 }}>
                <div style={{
                  color: titleColor, fontSize: 13,
                  whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
                }}>{tx.description}</div>
                <div style={{
                  color: themeTokens.textFaint,
                  fontFamily: 'var(--font-mono)', fontSize: 9,
                  letterSpacing: '0.18em', textTransform: 'uppercase', marginTop: 2,
                }}>{tx.category}</div>
              </div>
              <div style={{
                fontFamily: 'var(--font-mono)', fontSize: 12, color,
                alignSelf: 'center',
              }}>
                {tx.type === 'income' ? '+' : '−'}{fmt(tx.amount)}
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
};

export const GlobalSearch = () => {
  const { transactions, themeTokens, fmt, setView, setSearchQuery, setFocusTxId } = useAppContext();
  const [q, setQ] = useState('');
  const [open, setOpen] = useState(false);
  const wrapRef = useRef(null);

  useEffect(() => {
    const onDoc = (e) => {
      if (!wrapRef.current?.contains(e.target)) setOpen(false);
    };
    document.addEventListener('mousedown', onDoc);
    return () => document.removeEventListener('mousedown', onDoc);
  }, []);

  const results = useMemo(() => {
    const s = q.trim().toLowerCase();
    if (!s) return [];
    return transactions.filter((t) =>
      (t.description || '').toLowerCase().includes(s) ||
      (t.category || '').toLowerCase().includes(s) ||
      (t.paymentMethod || '').toLowerCase().includes(s) ||
      String(t.amount).includes(s)
    ).slice(0, 8);
  }, [q, transactions]);

  const pick = (tx) => {
    setSearchQuery(q);
    setFocusTxId(tx.id);
    setView('ledger');
    setOpen(false);
  };

  return (
    <div ref={wrapRef} style={{ position: 'relative', flex: 1, maxWidth: 360 }}>
      <input
        value={q}
        onChange={(e) => { setQ(e.target.value); setOpen(true); }}
        onFocus={() => setOpen(true)}
        placeholder="Search history…"
        style={{
          width: '100%',
          background: 'transparent',
          border: `1px solid ${themeTokens.hairline2}`,
          borderRadius: 999,
          padding: '8px 14px',
          color: themeTokens.text,
          fontFamily: 'var(--font-body)', fontSize: 13,
          outline: 'none',
        }} />
      {open && results.length > 0 && (
        <div style={{
          position: 'absolute', top: 'calc(100% + 6px)', left: 0, right: 0,
          background: themeTokens.surface,
          border: `1px solid ${themeTokens.hairline}`,
          borderRadius: 14,
          boxShadow: '0 30px 60px rgba(0,0,0,0.4)',
          zIndex: 60,
          overflow: 'hidden',
          backdropFilter: 'blur(28px) saturate(160%)',
          WebkitBackdropFilter: 'blur(28px) saturate(160%)',
        }}>
          {results.map((tx) => {
            const d = new Date(tx.date);
            return (
              <button key={tx.id} onClick={() => pick(tx)}
                style={{
                  width: '100%',
                  display: 'grid', gridTemplateColumns: '1fr auto', gap: 10,
                  padding: '10px 14px',
                  border: 'none', borderBottom: `1px solid ${themeTokens.hairline}`,
                  background: 'transparent',
                  textAlign: 'left', cursor: 'pointer',
                }}>
                <div style={{ minWidth: 0 }}>
                  <div style={{
                    color: themeTokens.text, fontSize: 13,
                    whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
                  }}>{tx.description}</div>
                  <div style={{
                    color: themeTokens.textDim,
                    fontFamily: 'var(--font-mono)', fontSize: 10,
                    letterSpacing: '0.18em', textTransform: 'uppercase', marginTop: 2,
                  }}>
                    {tx.category} · {tx.paymentMethod} · {d.toLocaleDateString('en-US', { month: 'short', day: '2-digit' })}
                  </div>
                </div>
                <div style={{
                  fontFamily: 'var(--font-mono)', fontSize: 12,
                  color: tx.type === 'income' ? themeTokens.positive : themeTokens.text,
                  alignSelf: 'center',
                }}>
                  {tx.type === 'income' ? '+' : '−'}{fmt(tx.amount)}
                </div>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
};

export const LedgerPage = () => {
  const {
    transactions, themeTokens, fmt, deleteTransaction, handleClearHistory,
    searchQuery, setSearchQuery, focusTxId, setFocusTxId, dateFilter,
  } = useAppContext();
  const [cardFilter, setCardFilter] = useState('all');
  const localQ = searchQuery;
  const setLocalQ = setSearchQuery;
  const listRef = useRef(null);

  const filtered = useMemo(() => {
    const { from, to } = resolveRange(dateFilter);
    const s = (localQ || '').trim().toLowerCase();
    return transactions.filter((t) => {
      if (t.category === 'Financing') return false;
      if (cardFilter !== 'all' && t.paymentMethod !== cardFilter) return false;
      const d = new Date(t.date);
      if (from && d < from) return false;
      if (to && d > to) return false;
      if (!s) return true;
      return (
        (t.description || '').toLowerCase().includes(s) ||
        (t.category || '').toLowerCase().includes(s) ||
        (t.paymentMethod || '').toLowerCase().includes(s) ||
        String(t.amount).includes(s)
      );
    });
  }, [transactions, cardFilter, localQ, dateFilter]);

  useEffect(() => {
    if (!focusTxId) return;
    const node = listRef.current?.querySelector(`[data-tx-id="${focusTxId}"]`);
    if (node) {
      node.scrollIntoView({ block: 'center', behavior: 'smooth' });
      const prev = node.style.background;
      node.style.background = `${themeTokens.accent}22`;
      setTimeout(() => { node.style.background = prev; setFocusTxId(null); }, 1600);
    } else {
      setFocusTxId(null);
    }
  }, [focusTxId, filtered]);

  const now = new Date();

  return (
    <div style={{ display: 'grid', gap: 16 }}>
      <Surface>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
          <input value={localQ} onChange={(e) => setLocalQ(e.target.value)} placeholder="Search ledger…"
            style={{
              flex: 1, minWidth: 200, background: 'transparent', border: 'none', outline: 'none',
              color: themeTokens.text, fontSize: 18, fontFamily: 'var(--font-body)', fontWeight: 400,
            }} />
          <ClearHistoryBtn onConfirm={handleClearHistory} />
        </div>
      </Surface>

      <Surface>
        <div style={{ display: 'flex', gap: 14, alignItems: 'center', flexWrap: 'wrap' }}>
          <Eyebrow>Filters</Eyebrow>
          <div style={{ display: 'flex', gap: 6 }}>
            {[{ id: 'all', label: 'All' }, ...PAYMENT_METHODS.map((m) => ({ id: m.id, label: m.label }))].map((opt) => {
              const active = cardFilter === opt.id;
              return (
                <button key={opt.id} onClick={() => setCardFilter(opt.id)}
                  style={{
                    padding: '6px 12px', borderRadius: 999,
                    border: `1px solid ${active ? themeTokens.accent : themeTokens.hairline2}`,
                    background: active ? themeTokens.accent : 'transparent',
                    color: active ? '#0B0B0D' : themeTokens.textDim,
                    fontFamily: 'var(--font-mono)', fontSize: 10,
                    letterSpacing: '0.18em', textTransform: 'uppercase',
                    cursor: 'pointer', transition: 'all 200ms',
                  }}>{opt.label}</button>
              );
            })}
          </div>
          <div style={{ flex: 1 }} />
          <RangeFilter />
        </div>
      </Surface>

      <Surface style={{ padding: 0 }}>
        <div ref={listRef} style={{ maxHeight: 640, overflow: 'auto' }}>
          {filtered.slice(0, 400).map((tx) => {
            const d = new Date(tx.date);
            const future = d > now;
            const rowColor = future ? '#E0B33B' : themeTokens.textDim;
            return (
              <div key={tx.id} data-tx-id={tx.id} style={{
                display: 'grid', gridTemplateColumns: 'auto 1fr auto auto', gap: 16, padding: '14px 22px',
                borderBottom: `1px solid ${themeTokens.hairline}`, alignItems: 'center',
                transition: 'background 600ms ease',
              }}>
                <div style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: rowColor, width: 64 }}>
                  {d.toLocaleDateString('en-US', { month: 'short', day: '2-digit' })}
                </div>
                <div>
                  <div style={{ color: future ? '#E0B33B' : themeTokens.text, fontSize: 14 }}>{tx.description}</div>
                  <div style={{ color: themeTokens.textDim, fontFamily: 'var(--font-mono)', fontSize: 10, letterSpacing: '0.18em', textTransform: 'uppercase', marginTop: 2 }}>
                    {tx.category} · {tx.paymentMethod}{tx.locked ? ' · locked' : ''}
                  </div>
                </div>
                <div style={{ fontFamily: 'var(--font-mono)', fontSize: 14, color: future ? '#E0B33B' : themeTokens.text, minWidth: 100, textAlign: 'right' }}>
                  {tx.type === 'income' ? '+' : '−'}{fmt(tx.amount)}
                </div>
                <TrashBtn locked={tx.locked} onClick={() => deleteTransaction(tx.id)} />
              </div>
            );
          })}
          {filtered.length === 0 && (
            <div style={{ padding: 32, textAlign: 'center', color: themeTokens.textDim, fontSize: 13 }}>
              No transactions match your filters.
            </div>
          )}
        </div>
      </Surface>
    </div>
  );
};

const isoDate = (d) => {
  const yy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${yy}-${mm}-${dd}`;
};

export const TransactionsPage = () => {
  const {
    themeTokens, fmt, addInstallmentPurchase, transactions, importTransactions,
    pickedDate, setPickedDate, activeFormCard, setActiveFormCard,
  } = useAppContext();
  const method = activeFormCard;
  const setMethod = setActiveFormCard;
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState(CATEGORIES[2]);
  const [amount, setAmount] = useState('');
  const [installments, setInstallments] = useState(1);
  const [importStatus, setImportStatus] = useState('');
  const fileInputRef = useRef(null);

  const handleExportCSV = () => {
    const exportable = transactions.filter((t) => !t.locked);
    const csv = transactionsToCSV(exportable);
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `aurum-transactions-${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleImportFile = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const { rows, skipped } = parseTransactionsCSV(String(reader.result || ''));
        const added = importTransactions(rows);
        setImportStatus(`Imported ${added} row${added === 1 ? '' : 's'}${skipped ? ` · ${skipped} skipped` : ''}`);
      } catch (err) {
        setImportStatus(`Import failed: ${err.message}`);
      }
      e.target.value = '';
    };
    reader.readAsText(file);
  };

  useEffect(() => {
    if (!PAYMENT_METHODS.some((m) => m.id === method)) {
      setMethod(PAYMENT_METHODS[0].id);
    }
  }, []);

  const lastDate = useMemo(() => {
    const d = new Date(pickedDate);
    if (isNaN(d)) return pickedDate;
    return isoDate(new Date(d.getFullYear(), d.getMonth() + (installments - 1), d.getDate()));
  }, [pickedDate, installments]);

  const monthlyAmount = useMemo(() => {
    const a = Number(amount) || 0;
    return a / Math.max(1, installments);
  }, [amount, installments]);

  const recent = transactions
    .filter((t) => t.type === 'expense' && PAYMENT_METHODS.some((m) => m.id === t.paymentMethod))
    .slice(0, 6);

  const submit = () => {
    if (!description || !amount) return;
    addInstallmentPurchase({
      description, category, amount: Number(amount),
      paymentMethod: method, firstDate: pickedDate, installments,
    });
    setDescription(''); setAmount('');
  };

  const inputStyle = {
    width: '100%', background: 'transparent',
    border: `1px solid ${themeTokens.hairline2}`,
    borderRadius: 10, padding: '10px 12px',
    color: themeTokens.text, fontSize: 14, fontFamily: 'var(--font-body)',
    outline: 'none',
  };

  const portabilityBtn = (label, onClick, primary = false) => (
    <button onClick={onClick}
      style={{
        padding: '10px 18px',
        border: primary ? 'none' : `1px solid ${themeTokens.accent}`,
        borderRadius: 999,
        background: primary ? themeTokens.accent : 'transparent',
        color: primary ? '#0B0B0D' : themeTokens.accent,
        fontFamily: 'var(--font-body)', fontWeight: 700,
        fontSize: 11, letterSpacing: '0.18em', textTransform: 'uppercase',
        cursor: 'pointer', transition: 'all 200ms',
      }}>{label}</button>
  );

  return (
    <div style={{ display: 'grid', gap: 16 }}>
      <Surface>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
          <Eyebrow>Data Portability</Eyebrow>
          <div style={{ flex: 1 }} />
          {portabilityBtn('Export CSV', handleExportCSV)}
          {portabilityBtn('Import CSV', () => fileInputRef.current?.click(), true)}
          <input ref={fileInputRef} type="file" accept=".csv,text/csv" onChange={handleImportFile} style={{ display: 'none' }} />
          {importStatus && (
            <div style={{ width: '100%', color: themeTokens.textDim, fontFamily: 'var(--font-mono)', fontSize: 11, letterSpacing: '0.18em', textTransform: 'uppercase' }}>
              {importStatus}
            </div>
          )}
        </div>
      </Surface>

    <div style={{ display: 'grid', gridTemplateColumns: '1.1fr 1fr', gap: 24, alignItems: 'start' }}>
      <Surface>
        <Eyebrow>New Purchase</Eyebrow>
        <div style={{ display: 'grid', gap: 16, marginTop: 12 }}>

          <div>
            <Label tk={themeTokens}>Payment method</Label>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              {PAYMENT_METHODS.map((m) => {
                const isDebit = m.id === 'Debit/Cash';
                const selected = method === m.id;
                return (
                  <React.Fragment key={m.id}>
                    <button onClick={() => setMethod(m.id)}
                      style={{
                        padding: 10, borderRadius: 14,
                        border: selected
                          ? `2px solid ${isDebit ? '#FFFFFF' : themeTokens.accent}`
                          : `1px solid ${isDebit ? '#16A34A' : themeTokens.hairline2}`,
                        background: isDebit ? '#22C55E' : 'transparent',
                        cursor: 'pointer',
                        display: 'flex', alignItems: 'center', gap: 12,
                        transition: 'all 200ms',
                      }}>
                      {m.img ? (
                        <img src={m.img} alt="" draggable={false}
                          style={{ width: 56, height: 36, objectFit: 'cover', borderRadius: 6, pointerEvents: 'none' }} />
                      ) : (
                        <div aria-hidden style={{ width: 56, height: 36, borderRadius: 6, background: 'rgba(255,255,255,0.18)' }} />
                      )}
                      <div style={{ textAlign: 'left' }}>
                        <div style={{ color: isDebit ? '#FFFFFF' : themeTokens.text, fontSize: 14 }}>{m.label}</div>
                        <div style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: isDebit ? '#FFFFFF' : themeTokens.textDim, letterSpacing: '0.18em', textTransform: 'uppercase' }}>{m.type}</div>
                      </div>
                    </button>
                    {isDebit && <div aria-hidden />}
                  </React.Fragment>
                );
              })}
            </div>
          </div>

          <div>
            <Label tk={themeTokens}>Description</Label>
            <input value={description} onChange={(e) => setDescription(e.target.value)}
              placeholder="e.g. New monitor" style={inputStyle} />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <div>
              <Label tk={themeTokens}>Amount (R$)</Label>
              <input type="number" inputMode="decimal" value={amount} onChange={(e) => setAmount(e.target.value)}
                placeholder="0.00" style={{ ...inputStyle, fontFamily: 'var(--font-mono)' }} />
            </div>
            <div>
              <Label tk={themeTokens}>Category</Label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                style={{
                  ...inputStyle,
                  appearance: 'none',
                  WebkitAppearance: 'none',
                  MozAppearance: 'none',
                  backgroundImage: `linear-gradient(45deg, transparent 50%, ${themeTokens.textDim} 50%), linear-gradient(135deg, ${themeTokens.textDim} 50%, transparent 50%)`,
                  backgroundPosition: 'calc(100% - 18px) 50%, calc(100% - 13px) 50%',
                  backgroundSize: '5px 5px, 5px 5px',
                  backgroundRepeat: 'no-repeat',
                  paddingRight: 32,
                  cursor: 'pointer',
                }}>
                {CATEGORIES.map((c) => (
                  <option key={c} value={c} style={{ background: themeTokens.surface, color: themeTokens.text }}>{c}</option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <Label tk={themeTokens}>Installments · {installments}× of {fmt(monthlyAmount)}</Label>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginTop: 4 }}>
              {Array.from({ length: 12 }, (_, i) => i + 1).map((n) => (
                <button key={n} onClick={() => setInstallments(n)}
                  style={{
                    width: 36, height: 32,
                    border: 'none',
                    borderRadius: 8,
                    background: installments === n ? themeTokens.accent : themeTokens.surface2,
                    color: installments === n ? '#0B0B0D' : themeTokens.textDim,
                    fontFamily: 'var(--font-mono)', fontSize: 12,
                    cursor: 'pointer', transition: 'all 180ms',
                  }}>{n}×</button>
              ))}
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <div>
              <Label tk={themeTokens}>First payment</Label>
              <input type="date" value={pickedDate} onChange={(e) => setPickedDate(e.target.value)}
                style={{ ...inputStyle, fontFamily: 'var(--font-mono)', colorScheme: 'dark' }} />
            </div>
            <div>
              <Label tk={themeTokens}>Last payment</Label>
              <input type="date" value={lastDate} readOnly
                style={{ ...inputStyle, fontFamily: 'var(--font-mono)', colorScheme: 'dark', opacity: 0.7 }} />
            </div>
          </div>

          <button onClick={submit}
            disabled={!description || !amount}
            style={{
              marginTop: 4, padding: '14px 22px',
              border: 'none', borderRadius: 999,
              background: themeTokens.accent, color: '#0B0B0D',
              fontFamily: 'var(--font-body)', fontWeight: 700,
              fontSize: 12, letterSpacing: '0.18em', textTransform: 'uppercase',
              cursor: (!description || !amount) ? 'not-allowed' : 'pointer',
              opacity: (!description || !amount) ? 0.5 : 1,
              boxShadow: `0 12px 30px ${themeTokens.accent}40`,
              transition: 'all 200ms',
            }}>
            Add Purchase
          </button>
        </div>
      </Surface>

      <Surface>
        <Eyebrow>Recent on cards</Eyebrow>
        <div style={{ marginTop: 8 }}>
          {recent.length === 0 && (
            <div style={{ color: themeTokens.textDim, fontSize: 13, padding: '12px 0' }}>
              No card purchases yet.
            </div>
          )}
          {recent.map((tx) => (
            <div key={tx.id} style={{
              display: 'grid', gridTemplateColumns: '1fr auto', gap: 12,
              padding: '12px 0', borderBottom: `1px solid ${themeTokens.hairline}`,
            }}>
              <div>
                <div style={{ color: themeTokens.text, fontSize: 14 }}>{tx.description}</div>
                <div style={{ color: themeTokens.textDim, fontFamily: 'var(--font-mono)', fontSize: 10, letterSpacing: '0.18em', textTransform: 'uppercase', marginTop: 2 }}>
                  {tx.category} · {tx.paymentMethod}
                </div>
              </div>
              <div style={{ textAlign: 'right' }}>
                <div style={{ fontFamily: 'var(--font-mono)', fontSize: 14, color: themeTokens.text }}>−{fmt(tx.amount)}</div>
                <div style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: themeTokens.textDim }}>
                  {new Date(tx.date).toLocaleDateString('en-US', { month: 'short', day: '2-digit' })}
                </div>
              </div>
            </div>
          ))}
        </div>
      </Surface>
    </div>
    </div>
  );
};

const TrashIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor"
    strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
    <polyline points="3 6 5 6 21 6" />
    <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
    <line x1="10" y1="11" x2="10" y2="17" />
    <line x1="14" y1="11" x2="14" y2="17" />
  </svg>
);

const TrashBtn = ({ onClick, locked }) => (
  <button onClick={(e) => { e.stopPropagation(); if (!locked) onClick?.(); }}
    disabled={locked}
    aria-label="Delete transaction"
    title={locked ? 'Locked entry — cannot delete' : 'Delete'}
    style={{
      width: 28, height: 28, padding: 0,
      border: 'none', borderRadius: 8,
      background: 'transparent',
      color: locked ? 'rgba(224,122,110,0.25)' : '#E07A6E',
      cursor: locked ? 'not-allowed' : 'pointer',
      display: 'grid', placeItems: 'center',
      transition: 'background 160ms',
    }}
    onMouseEnter={(e) => { if (!locked) e.currentTarget.style.background = 'rgba(224,122,110,0.12)'; }}
    onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; }}>
    <TrashIcon />
  </button>
);

const ClearHistoryBtn = ({ onConfirm }) => {
  const { themeTokens } = useAppContext();
  const click = () => {
    if (window.confirm('Are you sure? This will clear all unlocked history.')) onConfirm();
  };
  return (
    <button onClick={click}
      style={{
        padding: '8px 14px', borderRadius: 999,
        border: `1px solid ${themeTokens.negative}`,
        background: 'transparent',
        color: themeTokens.negative,
        fontFamily: 'var(--font-mono)', fontSize: 10,
        letterSpacing: '0.18em', textTransform: 'uppercase',
        cursor: 'pointer',
        display: 'inline-flex', alignItems: 'center', gap: 8,
        transition: 'all 200ms',
      }}>
      <TrashIcon /> Clear History
    </button>
  );
};

const Label = ({ children, tk }) => (
  <div style={{
    fontFamily: 'var(--font-mono)', fontSize: 10, letterSpacing: '0.32em',
    textTransform: 'uppercase', color: tk.textDim, marginBottom: 6,
  }}>{children}</div>
);

export const CostsPage = () => {
  const { transactions } = useAppContext();
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
    </div>
  );
};

export const GoalsPage = () => {
  return (
    <div style={{ display: 'grid', gap: 24 }}>
      <LuxurySedanGoal />
    </div>
  );
};

export const TimelinePage = () => {
  const { transactions, themeTokens } = useAppContext();
  const series = useMemo(() => buildMonthlySeries(transactions, 6, 6), [transactions]);
  return (
    <Surface>
      <Eyebrow>Cash Flow Timeline · ±6 months</Eyebrow>
      <div style={{ height: 12 }} />
      <AreaSpark data={series} dataKey="cashflow" accent={themeTokens.accent} tokens={themeTokens} height={320} />
    </Surface>
  );
};

export const MotorcyclePage = () => {
  const { netWorthState, setNetWorthState, themeTokens, fmt, transactions } = useAppContext();
  const m = netWorthState.motorcycle;

  const [editing, setEditing] = useState(false);
  const [draftColor, setDraftColor] = useState(m.color);
  const [draftMarket, setDraftMarket] = useState(String(m.marketValue));

  const openEdit = () => {
    setDraftColor(m.color);
    setDraftMarket(String(m.marketValue));
    setEditing(true);
  };
  const saveEdit = () => {
    const mv = Number(String(draftMarket).replace(/[^0-9.-]/g, ''));
    setNetWorthState((prev) => ({
      ...prev,
      motorcycle: {
        ...prev.motorcycle,
        color: draftColor || prev.motorcycle.color,
        marketValue: Number.isFinite(mv) ? mv : prev.motorcycle.marketValue,
      },
    }));
    setEditing(false);
  };

  const schedule = useMemo(
    () => transactions
      .filter((t) => t.category === 'Financing')
      .slice()
      .sort((a, b) => new Date(a.date) - new Date(b.date)),
    [transactions]
  );

  const paidCount    = schedule.filter((t) => t.status === 'paid').length;
  const pendingCount = schedule.length - paidCount;
  const totalDebt    = MOTO_AMOUNT * MOTO_COUNT;
  const paidValue    = paidCount * MOTO_AMOUNT;
  const remaining    = totalDebt - paidValue;
  const nextDue      = schedule.find((t) => t.status === 'pending');

  return (
    <div style={{ display: 'grid', gap: 16 }}>
      <Surface>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12 }}>
          <div>
            <Eyebrow>Triumph Street Triple RS · Specifications</Eyebrow>
            <Display size={56}>{m.brand} {m.model}</Display>
          </div>
          <button
            onClick={openEdit}
            aria-label="Edit color and market value"
            style={{
              background: 'transparent',
              border: `1px solid ${themeTokens.hairline}`,
              color: themeTokens.textDim,
              padding: '6px 12px', borderRadius: 999,
              fontFamily: 'var(--font-mono)', fontSize: 10,
              letterSpacing: '0.18em', textTransform: 'uppercase',
              cursor: 'pointer',
            }}
          >
            Edit
          </button>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: 16, marginTop: 24 }}>
          {[
            ['Segment', m.segment], ['Horsepower', m.horsepower + ' hp'],
            ['Year', m.year], ['Color', m.color],
            ['Market Value', fmt(m.marketValue)]
          ].map(([k, v]) =>
            <div key={k}>
              <Eyebrow>{k}</Eyebrow>
              <div style={{ color: themeTokens.text, fontSize: 18, fontFamily: 'var(--font-body)', fontWeight: 400 }}>{v}</div>
            </div>
          )}
        </div>

        {editing && (
          <div style={{
            marginTop: 24, padding: 18, borderRadius: 12,
            border: `1px solid ${themeTokens.hairline}`,
            display: 'grid', gap: 14,
          }}>
            <Eyebrow>Edit Specifications</Eyebrow>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 14 }}>
              <label style={{ display: 'grid', gap: 6 }}>
                <span style={{ fontFamily: 'var(--font-mono)', fontSize: 10, letterSpacing: '0.18em', textTransform: 'uppercase', color: themeTokens.textDim }}>Color</span>
                <input
                  value={draftColor}
                  onChange={(e) => setDraftColor(e.target.value)}
                  style={{
                    background: 'transparent',
                    border: `1px solid ${themeTokens.hairline}`,
                    borderRadius: 8, padding: '8px 10px',
                    color: themeTokens.text, fontFamily: 'var(--font-body)', fontSize: 14,
                  }}
                />
              </label>
              <label style={{ display: 'grid', gap: 6 }}>
                <span style={{ fontFamily: 'var(--font-mono)', fontSize: 10, letterSpacing: '0.18em', textTransform: 'uppercase', color: themeTokens.textDim }}>Market Value</span>
                <input
                  inputMode="decimal"
                  value={draftMarket}
                  onChange={(e) => setDraftMarket(e.target.value)}
                  style={{
                    background: 'transparent',
                    border: `1px solid ${themeTokens.hairline}`,
                    borderRadius: 8, padding: '8px 10px',
                    color: themeTokens.text, fontFamily: 'var(--font-mono)', fontSize: 14,
                  }}
                />
              </label>
            </div>
            <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
              <button
                onClick={() => setEditing(false)}
                style={{
                  background: 'transparent',
                  border: `1px solid ${themeTokens.hairline}`,
                  color: themeTokens.textDim,
                  padding: '8px 14px', borderRadius: 999,
                  fontFamily: 'var(--font-mono)', fontSize: 10,
                  letterSpacing: '0.18em', textTransform: 'uppercase',
                  cursor: 'pointer',
                }}
              >Cancel</button>
              <button
                onClick={saveEdit}
                style={{
                  background: themeTokens.text,
                  border: 'none',
                  color: themeTokens.canvas,
                  padding: '8px 14px', borderRadius: 999,
                  fontFamily: 'var(--font-mono)', fontSize: 10,
                  letterSpacing: '0.18em', textTransform: 'uppercase',
                  cursor: 'pointer',
                }}
              >Save</button>
            </div>
          </div>
        )}
      </Surface>

      <Surface>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', flexWrap: 'wrap', gap: 16 }}>
          <div>
            <Eyebrow>Financing Schedule</Eyebrow>
            <Display size={36}>{fmt(remaining)}</Display>
            <div style={{ color: themeTokens.textDim, fontSize: 13, marginTop: 4 }}>
              {pendingCount} pending · {paidCount} paid · total {fmt(totalDebt)}
            </div>
          </div>
          {nextDue && (
            <div style={{ textAlign: 'right' }}>
              <Eyebrow>Next due</Eyebrow>
              <div style={{ color: themeTokens.text, fontSize: 18, fontFamily: 'var(--font-body)' }}>
                {new Date(nextDue.date).toLocaleDateString('en-US', { day: '2-digit', month: 'long', year: 'numeric' })}
              </div>
              <div style={{ color: themeTokens.textDim, fontFamily: 'var(--font-mono)', fontSize: 12 }}>
                {fmt(nextDue.amount)}
              </div>
            </div>
          )}
        </div>
      </Surface>

      <Surface style={{ padding: 0 }}>
        <div style={{ maxHeight: 480, overflow: 'auto' }}>
          {schedule.map((tx) => {
            const d = new Date(tx.date);
            const paid = tx.status === 'paid';
            const idx = (tx.installmentIndex ?? 0) + 1;
            return (
              <div key={tx.id} style={{
                display: 'grid', gridTemplateColumns: '64px 1fr auto auto', gap: 16,
                padding: '14px 22px', borderBottom: `1px solid ${themeTokens.hairline}`,
                alignItems: 'center', opacity: paid ? 0.55 : 1,
              }}>
                <div style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: themeTokens.textDim, letterSpacing: '0.18em' }}>
                  {String(idx).padStart(2, '0')}/{MOTO_COUNT}
                </div>
                <div>
                  <div style={{ color: themeTokens.text, fontSize: 14 }}>
                    {d.toLocaleDateString('en-US', { day: '2-digit', month: 'long', year: 'numeric' })}
                  </div>
                  <div style={{ color: themeTokens.textDim, fontFamily: 'var(--font-mono)', fontSize: 10, letterSpacing: '0.18em', textTransform: 'uppercase', marginTop: 2 }}>
                    Bank Transfer
                  </div>
                </div>
                <div style={{ fontFamily: 'var(--font-mono)', fontSize: 14, color: themeTokens.text, minWidth: 100, textAlign: 'right' }}>
                  {fmt(tx.amount)}
                </div>
                <div style={{
                  fontFamily: 'var(--font-mono)', fontSize: 10, letterSpacing: '0.18em', textTransform: 'uppercase',
                  padding: '4px 10px', borderRadius: 999,
                  border: `1px solid ${paid ? themeTokens.hairline2 : themeTokens.accent}`,
                  background: paid ? 'transparent' : `${themeTokens.accent}1A`,
                  color: paid ? themeTokens.textDim : themeTokens.accent,
                  minWidth: 72, textAlign: 'center',
                }}>
                  {paid ? 'Paid' : 'Pending'}
                </div>
              </div>
            );
          })}
        </div>
      </Surface>
    </div>
  );
};

export const DebtsPage = () => {
  const { themeTokens } = useAppContext();
  return (
    <Surface>
      <Eyebrow>Debts</Eyebrow>
      <Display size={36} color={themeTokens.textDim}>No active debts</Display>
      <div style={{ marginTop: 12, color: themeTokens.textDim, fontSize: 13 }}>
        Your only locked liability is the Triumph Street Triple RS financing (48 installments).
      </div>
    </Surface>
  );
};
