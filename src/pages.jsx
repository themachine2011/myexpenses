import React, { useState, useEffect, useRef, useMemo } from 'react';
import { motion } from 'framer-motion';
import { useAppContext } from './context.jsx';
import { resolveRange, CATEGORIES, DEFAULT_CATEGORY, DEFAULT_SPLIT_CATEGORY, MOTO_AMOUNT, MOTO_COUNT, transactionsToCSV, parseTransactionsCSV, currentMonthRange, computeAvailableCash, goalProgress, debtTotals } from './context.jsx';
import { fmtCurrency } from './tokens.jsx';
import { AreaSpark, RotatingCharts, ExpensePie, ComposedFlow, RadarHealth, RadialGauge, RetentionBar, buildMonthlySeries, buildYearSeries } from './charts.jsx';
import { SpendHeatmapSurface } from './heatmap.jsx';
import { buildBackupPayload, downloadBackup } from './2026-05-16-backup-scheduled-json-export.jsx';

const confirmDelete = (msg) => {
  if (typeof window === 'undefined') return true;
  return window.confirm(msg);
};

// Minimal error boundary. Catches render errors inside its subtree and shows
// a small fallback panel instead of tearing down the parent. The fallback
// includes the actual error message so future regressions are diagnosable
// without spelunking through React's batched "above error occurred" logs.
export class PanelErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { error: null };
  }
  static getDerivedStateFromError(error) {
    return { error };
  }
  componentDidCatch(error, info) {
    // Keep the original message visible in dev — React's own log buries it
    // under a generic "above error occurred" notice.
    console.error('[PanelErrorBoundary]', this.props.label || '', error?.message, info?.componentStack);
  }
  render() {
    if (!this.state.error) return this.props.children;
    return (
      <div style={{
        padding: 16, borderRadius: 12,
        border: '1px solid rgba(224, 122, 110, 0.4)',
        background: 'rgba(224, 122, 110, 0.08)',
        color: '#E07A6E',
        fontFamily: 'var(--font-mono)', fontSize: 12, lineHeight: 1.5,
      }}>
        <div style={{ fontWeight: 700, letterSpacing: '0.18em', textTransform: 'uppercase', marginBottom: 6 }}>
          {this.props.label || 'Panel'} failed to render
        </div>
        <div style={{ opacity: 0.85 }}>{String(this.state.error?.message || this.state.error)}</div>
      </div>
    );
  }
}

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

export const KPICard = ({ label, value, delta, positive, valueColor, yoy }) => {
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
      {yoy && (
        <div style={{ marginTop: 4, display: 'flex', alignItems: 'center', gap: 8, fontFamily: 'var(--font-mono)', fontSize: 11,
          color: !yoy.hasPrior ? themeTokens.textFaint : (yoy.pct >= 0 ? themeTokens.positive : themeTokens.negative) }}>
          {yoy.hasPrior
            ? <>{yoy.pct >= 0 ? '↑' : '↓'} {Math.abs(yoy.pct).toFixed(1)}% <span style={{ color: themeTokens.textDim }}>YoY</span></>
            : <span style={{ color: themeTokens.textFaint }}>— YoY (no prior data)</span>}
        </div>
      )}
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

const InsightTile = ({ label, value, detail, color, themeTokens }) => (
  <div style={{
    background: themeTokens.surface2,
    border: `1px solid ${themeTokens.hairline}`,
    borderRadius: 14,
    padding: 18,
    display: 'flex', flexDirection: 'column', gap: 6,
  }}>
    <div style={{
      fontFamily: 'var(--font-mono)', fontSize: 10, letterSpacing: '0.18em',
      textTransform: 'uppercase', color: themeTokens.textDim,
    }}>{label}</div>
    <div style={{
      fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 26,
      color: color || themeTokens.text, letterSpacing: '-0.01em',
    }}>{value}</div>
    {detail && (
      <div style={{ color: themeTokens.textDim, fontSize: 12, lineHeight: 1.4 }}>{detail}</div>
    )}
  </div>
);

const MonthlyInsights = ({ transactions, savingsTotal, goalAmount, themeTokens, fmt }) => {
  const { from, to } = currentMonthRange();
  const insights = useMemo(() => {
    const inMonth = transactions.filter((t) => {
      const d = new Date(t.date);
      return d >= from && d <= to;
    });
    let income = 0, expense = 0, savings = 0, locked = 0;
    const byCategory = {};
    for (const t of inMonth) {
      if (t.category === 'Savings') {
        savings += t.type === 'income' ? t.amount : -t.amount;
        continue;
      }
      if (t.category === 'Financing') {
        locked += t.amount;
        continue;
      }
      if (t.type === 'income') income += t.amount;
      else if (t.type === 'expense') {
        expense += t.amount;
        byCategory[t.category] = (byCategory[t.category] || 0) + t.amount;
      }
    }
    const balance = income - expense - savings - locked;
    const sortedCats = Object.entries(byCategory).sort((a, b) => b[1] - a[1]);
    const top = sortedCats[0];
    const totalExpense = Math.max(1, expense);
    const distribution = sortedCats.slice(0, 5).map(([k, v]) => ({
      name: k, value: v, pct: (v / totalExpense) * 100,
    }));
    return { income, expense, savings, locked, balance, top, distribution };
  }, [transactions, from.getTime(), to.getTime()]);

  // Savings progression: last 6 months cumulative savings
  const savingsProgression = useMemo(() => {
    const now = new Date();
    const points = [];
    let cumulative = 0;
    for (let m = -5; m <= 0; m++) {
      const base = new Date(now.getFullYear(), now.getMonth() + m, 1);
      const ym = `${base.getFullYear()}-${base.getMonth()}`;
      let delta = 0;
      for (const t of transactions) {
        if (t.category !== 'Savings') continue;
        const d = new Date(t.date);
        if (`${d.getFullYear()}-${d.getMonth()}` !== ym) continue;
        delta += t.type === 'income' ? t.amount : -t.amount;
      }
      cumulative += delta;
      points.push({ label: base.toLocaleString('en-US', { month: 'short' }), value: cumulative });
    }
    return points;
  }, [transactions]);

  // Financing: current month + next upcoming pending installment
  const financing = useMemo(() => {
    const fin = transactions.filter((t) => t.category === 'Financing').sort((a, b) => new Date(a.date) - new Date(b.date));
    const inMonthRow = fin.find((t) => {
      const d = new Date(t.date);
      return d >= from && d <= to;
    });
    const nowMs = Date.now();
    const upcoming = fin.find((t) => new Date(t.date).getTime() > (inMonthRow ? new Date(inMonthRow.date).getTime() : nowMs) && t.status !== 'paid');
    return { current: inMonthRow, next: upcoming };
  }, [transactions, from.getTime(), to.getTime()]);

  const goalPct = goalAmount > 0 ? (savingsTotal / goalAmount) * 100 : 0;

  return (
    <Surface>
      <Eyebrow>This Month · At a Glance</Eyebrow>
      <div style={{ height: 14 }} />
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 12 }}>
        <InsightTile themeTokens={themeTokens}
          label="Top Spend"
          value={insights.top ? insights.top[0] : '—'}
          detail={insights.top ? `${fmt(insights.top[1])} this month` : 'No expenses yet'}
          color={themeTokens.accent} />
        <InsightTile themeTokens={themeTokens}
          label="Saved This Month"
          value={fmt(Math.max(0, insights.savings))}
          detail={insights.savings >= 0
            ? `${insights.income > 0 ? ((insights.savings / insights.income) * 100).toFixed(1) : '0.0'}% of income`
            : `Net withdrawal ${fmt(Math.abs(insights.savings))}`}
          color={insights.savings >= 0 ? themeTokens.positive : themeTokens.negative} />
        <InsightTile themeTokens={themeTokens}
          label="Monthly Balance"
          value={`${insights.balance >= 0 ? '+' : '−'}${fmt(Math.abs(insights.balance))}`}
          detail={`Income ${fmt(insights.income)} − Expenses ${fmt(insights.expense)} − Savings ${fmt(insights.savings)} − Locked ${fmt(insights.locked)}`}
          color={insights.balance >= 0 ? themeTokens.positive : themeTokens.negative} />
        <InsightTile themeTokens={themeTokens}
          label="Goal Progress"
          value={`${goalPct.toFixed(1)}%`}
          detail={`${fmt(savingsTotal)} of ${fmt(goalAmount)}`}
          color={themeTokens.accent} />
      </div>

      <div style={{ height: 22 }} />
      <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1.2fr) minmax(0, 1fr)', gap: 18 }}>
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 10 }}>
            <Eyebrow>Where the Money Went</Eyebrow>
            <span style={{ color: themeTokens.textDim, fontFamily: 'var(--font-mono)', fontSize: 11 }}>{fmt(insights.expense)}</span>
          </div>
          {insights.distribution.length === 0 && (
            <div style={{ color: themeTokens.textDim, fontSize: 13, padding: '8px 0' }}>No spending recorded this month.</div>
          )}
          {insights.distribution.map((d) => (
            <div key={d.name} style={{ display: 'grid', gridTemplateColumns: '120px 1fr 80px', gap: 12, alignItems: 'center', padding: '6px 0' }}>
              <div style={{ color: themeTokens.text, fontSize: 13 }}>{d.name}</div>
              <div style={{ height: 8, background: themeTokens.hairline, borderRadius: 999, overflow: 'hidden' }}>
                <div style={{ width: `${d.pct}%`, height: '100%', background: `linear-gradient(90deg, ${themeTokens.accentDeep}, ${themeTokens.accent})` }} />
              </div>
              <div style={{ color: themeTokens.textDim, fontFamily: 'var(--font-mono)', fontSize: 11, textAlign: 'right' }}>
                {d.pct.toFixed(0)}% · {fmt(d.value)}
              </div>
            </div>
          ))}
        </div>

        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 10 }}>
            <Eyebrow>Locked Payments</Eyebrow>
            <span style={{ color: themeTokens.textDim, fontFamily: 'var(--font-mono)', fontSize: 11 }}>Triumph financing</span>
          </div>
          {[
            ['This month', financing.current],
            ['Next upcoming', financing.next],
          ].map(([label, row]) => (
            <div key={label} style={{
              display: 'grid', gridTemplateColumns: 'auto 1fr auto', gap: 12,
              padding: '10px 0', borderBottom: `1px solid ${themeTokens.hairline}`, alignItems: 'center',
            }}>
              <div style={{ fontFamily: 'var(--font-mono)', fontSize: 10, letterSpacing: '0.18em', textTransform: 'uppercase', color: themeTokens.textDim, width: 110 }}>{label}</div>
              {row ? (
                <>
                  <div>
                    <div style={{ color: themeTokens.text, fontSize: 13 }}>
                      Installment {(row.installmentIndex ?? 0) + 1}/{MOTO_COUNT}
                    </div>
                    <div style={{ color: themeTokens.textDim, fontFamily: 'var(--font-mono)', fontSize: 10, marginTop: 2 }}>
                      {new Date(row.date).toLocaleDateString('en-US', { day: '2-digit', month: 'short', year: 'numeric' })}
                    </div>
                  </div>
                  <div style={{
                    fontFamily: 'var(--font-mono)', fontSize: 13,
                    color: row.status === 'paid' ? themeTokens.textDim : themeTokens.accent,
                  }}>{fmt(row.amount)} · {row.status === 'paid' ? 'Paid' : 'Pending'}</div>
                </>
              ) : (
                <div style={{ color: themeTokens.textDim, fontSize: 12 }}>—</div>
              )}
            </div>
          ))}
          <div style={{ marginTop: 18 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 8 }}>
              <Eyebrow>Savings Progression · 6M</Eyebrow>
              <span style={{ color: themeTokens.textDim, fontFamily: 'var(--font-mono)', fontSize: 11 }}>{fmt(savingsTotal)}</span>
            </div>
            <SavingsSparkline points={savingsProgression} themeTokens={themeTokens} fmt={fmt} />
          </div>
        </div>
      </div>
    </Surface>
  );
};

const SavingsSparkline = ({ points, themeTokens, fmt }) => {
  if (!points.length) return null;
  const max = Math.max(1, ...points.map((p) => p.value));
  const min = Math.min(0, ...points.map((p) => p.value));
  const range = Math.max(1, max - min);
  const W = 100; const H = 60;
  const path = points.map((p, i) => {
    const x = (i / Math.max(1, points.length - 1)) * W;
    const y = H - ((p.value - min) / range) * H;
    return `${i === 0 ? 'M' : 'L'} ${x.toFixed(2)} ${y.toFixed(2)}`;
  }).join(' ');
  return (
    <div>
      <svg viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none" style={{ width: '100%', height: 60 }}>
        <defs>
          <linearGradient id="sav-grad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={themeTokens.accent} stopOpacity="0.4" />
            <stop offset="100%" stopColor={themeTokens.accent} stopOpacity="0" />
          </linearGradient>
        </defs>
        <path d={`${path} L ${W} ${H} L 0 ${H} Z`} fill="url(#sav-grad)" />
        <path d={path} stroke={themeTokens.accent} strokeWidth="1.5" fill="none" />
      </svg>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 4, color: themeTokens.textDim, fontFamily: 'var(--font-mono)', fontSize: 10 }}>
        {points.map((p) => <span key={p.label}>{p.label}</span>)}
      </div>
    </div>
  );
};

// Bill reminders panel — aggregates upcoming financing installments, recurring
// templates, and manual reminders (next 30 days). Lets the user add a one-off
// reminder and mark items paid.
const BillRemindersPanel = () => {
  const {
    upcomingDues, addReminder, markReminderPaid, deleteReminder,
    themeTokens, fmt,
  } = useAppContext();
  const [editing, setEditing] = useState(false);
  const [label, setLabel]     = useState('');
  const [amount, setAmount]   = useState('');
  const [date, setDate]       = useState(() => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  });
  const dues = upcomingDues(30);
  const inputStyle = {
    width: '100%', background: 'transparent',
    border: `1px solid ${themeTokens.hairline2}`, borderRadius: 10,
    padding: '10px 14px', color: themeTokens.text, fontFamily: 'var(--font-body)', fontSize: 14, outline: 'none',
  };
  const submitReminder = () => {
    if (!label || !amount || !date) return;
    addReminder({ label, amount: Number(amount), date: new Date(date).toISOString() });
    setLabel(''); setAmount('');
  };
  const kindStyle = (kind) => {
    const map = {
      financing: { color: themeTokens.negative, label: 'Financing' },
      recurring: { color: themeTokens.accent,   label: 'Recurring' },
      reminder:  { color: '#F5B544',             label: 'Reminder' },
    };
    return map[kind] || map.reminder;
  };
  return (
    <Surface>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
        <Eyebrow>Bill Reminders · Next 30 days</Eyebrow>
        <span style={{ color: themeTokens.textDim, fontSize: 12, fontFamily: 'var(--font-mono)' }}>
          {dues.length} upcoming
        </span>
        <div style={{ flex: 1 }} />
        <button onClick={() => setEditing((e) => !e)}
          style={{
            padding: '6px 12px', borderRadius: 999,
            border: `1px solid ${editing ? themeTokens.accent : themeTokens.hairline2}`,
            background: editing ? themeTokens.accent : 'transparent',
            color: editing ? '#0B0B0D' : themeTokens.textDim,
            fontFamily: 'var(--font-mono)', fontSize: 10,
            letterSpacing: '0.18em', textTransform: 'uppercase',
            cursor: 'pointer', transition: 'all 200ms',
          }}>{editing ? 'Done' : '+ Add reminder'}</button>
      </div>

      {editing && (
        <div style={{ marginTop: 14, paddingTop: 14, borderTop: `1px solid ${themeTokens.hairline}`, display: 'grid', gridTemplateColumns: '1fr 140px 160px auto', gap: 10, alignItems: 'end' }}>
          <div>
            <Label tk={themeTokens}>Label</Label>
            <input value={label} onChange={(e) => setLabel(e.target.value)} placeholder="e.g. Internet bill" style={inputStyle} />
          </div>
          <div>
            <Label tk={themeTokens}>Amount (R$)</Label>
            <input type="number" value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="0.00"
              style={{ ...inputStyle, fontFamily: 'var(--font-mono)' }} />
          </div>
          <div>
            <Label tk={themeTokens}>Due date</Label>
            <input type="date" value={date} onChange={(e) => setDate(e.target.value)}
              style={{ ...inputStyle, fontFamily: 'var(--font-mono)', colorScheme: 'dark' }} />
          </div>
          <button onClick={submitReminder}
            disabled={!label || !amount || !date}
            style={{
              padding: '12px 18px', border: 'none', borderRadius: 999,
              background: themeTokens.accent, color: '#0B0B0D',
              fontFamily: 'var(--font-body)', fontWeight: 700, fontSize: 11,
              letterSpacing: '0.18em', textTransform: 'uppercase',
              cursor: (!label || !amount || !date) ? 'not-allowed' : 'pointer',
              opacity: (!label || !amount || !date) ? 0.5 : 1, whiteSpace: 'nowrap',
            }}>Save</button>
        </div>
      )}

      <div style={{ height: 12 }} />
      {dues.length === 0 ? (
        <div style={{ color: themeTokens.textDim, fontSize: 13, padding: '8px 0' }}>
          Nothing due in the next 30 days. Quiet stretch.
        </div>
      ) : (
        <div style={{ display: 'grid', gap: 8 }}>
          {dues.map((d, i) => {
            const ks = kindStyle(d.kind);
            const dt = new Date(d.date);
            return (
              <div key={i} style={{
                display: 'grid', gridTemplateColumns: '70px 1fr auto auto auto', gap: 14,
                alignItems: 'center', padding: '8px 0',
                borderBottom: i === dues.length - 1 ? 'none' : `1px solid ${themeTokens.hairline}`,
              }}>
                <div style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: themeTokens.textDim }}>
                  {dt.toLocaleDateString('en-US', { month: 'short', day: '2-digit' })}
                </div>
                <div style={{ color: themeTokens.text, fontSize: 13 }}>{d.label}</div>
                <span style={{
                  background: ks.color, color: '#FFFFFF',
                  padding: '2px 8px', borderRadius: 4,
                  fontFamily: 'var(--font-mono)', fontSize: 9, fontWeight: 600,
                  letterSpacing: '0.18em', textTransform: 'uppercase',
                }}>{ks.label}</span>
                <div style={{ fontFamily: 'var(--font-mono)', fontSize: 13, color: themeTokens.text, minWidth: 90, textAlign: 'right' }}>
                  {fmt(d.amount)}
                </div>
                {d.reminderId ? (
                  <div style={{ display: 'flex', gap: 6 }}>
                    <button onClick={() => markReminderPaid(d.reminderId)}
                      style={{ background: 'transparent', border: 'none', color: themeTokens.positive, cursor: 'pointer', fontFamily: 'var(--font-mono)', fontSize: 10, letterSpacing: '0.18em', textTransform: 'uppercase' }}>
                      Paid
                    </button>
                    <button onClick={() => { if (confirmDelete('Delete this reminder?')) deleteReminder(d.reminderId); }}
                      style={{ background: 'transparent', border: 'none', color: themeTokens.textDim, cursor: 'pointer', fontFamily: 'var(--font-mono)', fontSize: 10, letterSpacing: '0.18em', textTransform: 'uppercase' }}>
                      Del
                    </button>
                  </div>
                ) : <span />}
              </div>
            );
          })}
        </div>
      )}
    </Surface>
  );
};

// Budgets per category. Reads/writes the `budgets` map in context, renders a
// progress bar per category with limit set, and an inline editor to add/edit limits.
const BudgetsPanel = () => {
  const { budgets, setBudget, removeBudget, budgetUsage, themeTokens, fmt } = useAppContext();
  const [editing, setEditing] = useState(false);
  const [newCat, setNewCat] = useState(DEFAULT_CATEGORY);
  const [newLimit, setNewLimit] = useState('');
  const entries = Object.entries(budgets || {});
  const colorFor = (pct) => {
    if (pct >= 100) return themeTokens.negative;
    if (pct >= 80)  return '#F5B544';
    return themeTokens.positive;
  };
  return (
    <Surface>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
        <Eyebrow>Budgets · This Month</Eyebrow>
        <span style={{ color: themeTokens.textDim, fontSize: 12, fontFamily: 'var(--font-mono)' }}>
          {entries.length} categor{entries.length === 1 ? 'y' : 'ies'} tracked
        </span>
        <div style={{ flex: 1 }} />
        <button onClick={() => setEditing((e) => !e)}
          style={{
            padding: '6px 12px', borderRadius: 999,
            border: `1px solid ${editing ? themeTokens.accent : themeTokens.hairline2}`,
            background: editing ? themeTokens.accent : 'transparent',
            color: editing ? '#0B0B0D' : themeTokens.textDim,
            fontFamily: 'var(--font-mono)', fontSize: 10,
            letterSpacing: '0.18em', textTransform: 'uppercase',
            cursor: 'pointer', transition: 'all 200ms',
          }}>{editing ? 'Done' : 'Set budgets'}</button>
      </div>

      {editing && (
        <div style={{ marginTop: 14, paddingTop: 14, borderTop: `1px solid ${themeTokens.hairline}`, display: 'grid', gridTemplateColumns: '1fr 140px auto', gap: 10, alignItems: 'end' }}>
          <div>
            <Label tk={themeTokens}>Category</Label>
            <select value={newCat} onChange={(e) => setNewCat(e.target.value)}
              style={{
                width: '100%', background: 'transparent',
                border: `1px solid ${themeTokens.hairline2}`, borderRadius: 10,
                padding: '10px 14px', color: themeTokens.text, fontFamily: 'var(--font-body)', fontSize: 14, outline: 'none', cursor: 'pointer',
              }}>
              {CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>
          <div>
            <Label tk={themeTokens}>Monthly limit (R$)</Label>
            <input type="number" value={newLimit} onChange={(e) => setNewLimit(e.target.value)} placeholder="0.00"
              style={{
                width: '100%', background: 'transparent',
                border: `1px solid ${themeTokens.hairline2}`, borderRadius: 10,
                padding: '10px 14px', color: themeTokens.text, fontFamily: 'var(--font-mono)', fontSize: 14, outline: 'none',
              }} />
          </div>
          <button
            disabled={!newLimit || Number(newLimit) <= 0}
            onClick={() => { setBudget(newCat, Number(newLimit)); setNewLimit(''); }}
            style={{
              padding: '12px 18px', border: 'none', borderRadius: 999,
              background: themeTokens.accent, color: '#0B0B0D',
              fontFamily: 'var(--font-body)', fontWeight: 700, fontSize: 11,
              letterSpacing: '0.18em', textTransform: 'uppercase',
              cursor: (!newLimit || Number(newLimit) <= 0) ? 'not-allowed' : 'pointer',
              opacity: (!newLimit || Number(newLimit) <= 0) ? 0.5 : 1,
              whiteSpace: 'nowrap', transition: 'all 200ms',
            }}>Set limit</button>
        </div>
      )}

      <div style={{ height: 12 }} />
      {entries.length === 0 ? (
        <div style={{ color: themeTokens.textDim, fontSize: 13, padding: '8px 0' }}>
          No budgets yet. Click "Set budgets" to add one.
        </div>
      ) : (
        <div style={{ display: 'grid', gap: 12 }}>
          {entries.map(([cat, limit]) => {
            const { spent, pct } = budgetUsage(cat);
            const clamped = Math.min(100, pct);
            const color = colorFor(pct);
            return (
              <div key={cat}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 6 }}>
                  <span style={{ color: themeTokens.text, fontSize: 13 }}>{cat}</span>
                  <span style={{ color: themeTokens.textDim, fontFamily: 'var(--font-mono)', fontSize: 11 }}>
                    <span style={{ color }}>{fmt(spent)}</span> / {fmt(limit)} <span style={{ color }}>· {pct.toFixed(0)}%</span>
                  </span>
                </div>
                <div style={{ position: 'relative', height: 8, background: themeTokens.surface2, borderRadius: 999, overflow: 'hidden' }}>
                  <div style={{ position: 'absolute', inset: 0, width: `${clamped}%`, background: color, transition: 'width 400ms ease' }} />
                </div>
                {editing && (
                  <div style={{ marginTop: 6, textAlign: 'right' }}>
                    <button onClick={() => { if (confirmDelete(`Remove the budget for "${cat}"?`)) removeBudget(cat); }}
                      style={{ background: 'transparent', border: 'none', color: themeTokens.textDim, cursor: 'pointer', fontFamily: 'var(--font-mono)', fontSize: 10, letterSpacing: '0.18em', textTransform: 'uppercase' }}>
                      Remove
                    </button>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </Surface>
  );
};

// Compact Savings panel for the Dashboard. Replaces the old standalone Savings
// tab — no luxury-car picture, just the numbers and controls. Lists goals when
// the user has created any, otherwise shows an empty hint.
const SavingsPanel = () => {
  const {
    themeTokens, fmt, savingsTotal, addSaving,
    goals, addGoal, updateGoal, deleteGoal,
  } = useAppContext();

  const [depositAmt, setDepositAmt] = useState('');
  const [showNewGoal, setShowNewGoal] = useState(false);
  const [newName, setNewName] = useState('');
  const [newTarget, setNewTarget] = useState('');
  const [newDue, setNewDue] = useState('');

  const totalAllocated = (goals || []).reduce((s, g) => s + (Number(g.allocated) || 0), 0);
  const unallocated    = Math.max(0, savingsTotal - totalAllocated);

  const inputStyle = {
    background: 'transparent',
    border: `1px solid ${themeTokens.hairline2}`, borderRadius: 10,
    padding: '8px 12px', color: themeTokens.text,
    fontFamily: 'var(--font-body)', fontSize: 13, outline: 'none',
  };

  const submitNew = () => {
    if (!newName || !newTarget) return;
    addGoal({ name: newName, target: Number(newTarget), due: newDue || null, allocated: 0 });
    setNewName(''); setNewTarget(''); setNewDue(''); setShowNewGoal(false);
  };

  const allocate = (g, delta) => {
    const curr = Number(g.allocated) || 0;
    const next = Math.max(0, curr + delta);
    const newTotal = totalAllocated - curr + next;
    if (newTotal > savingsTotal + 0.001) return;
    updateGoal(g.id, { allocated: next });
  };

  return (
    <Surface>
      <div style={{ display: 'flex', alignItems: 'baseline', gap: 16, flexWrap: 'wrap' }}>
        <div>
          <Eyebrow>Savings · Balance</Eyebrow>
          <div style={{
            fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 38,
            color: themeTokens.text, letterSpacing: '-0.02em', marginTop: 4,
          }}>{fmt(savingsTotal)}</div>
        </div>
        <div style={{ marginLeft: 'auto', display: 'flex', gap: 24, flexWrap: 'wrap', alignItems: 'baseline' }}>
          <div>
            <div style={{ color: themeTokens.textDim, fontFamily: 'var(--font-mono)', fontSize: 10, letterSpacing: '0.18em', textTransform: 'uppercase' }}>Allocated</div>
            <div style={{ fontFamily: 'var(--font-mono)', fontSize: 14, color: themeTokens.text, marginTop: 4 }}>{fmt(totalAllocated)}</div>
          </div>
          <div>
            <div style={{ color: themeTokens.textDim, fontFamily: 'var(--font-mono)', fontSize: 10, letterSpacing: '0.18em', textTransform: 'uppercase' }}>Unallocated</div>
            <div style={{ fontFamily: 'var(--font-mono)', fontSize: 14, color: themeTokens.accent, marginTop: 4 }}>{fmt(unallocated)}</div>
          </div>
        </div>
      </div>

      <div style={{ marginTop: 14, paddingTop: 14, borderTop: `1px solid ${themeTokens.hairline}`, display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'center' }}>
        <span style={{ color: themeTokens.textDim, fontFamily: 'var(--font-mono)', fontSize: 10, letterSpacing: '0.18em', textTransform: 'uppercase' }}>
          Deposit / withdraw
        </span>
        <input type="number" value={depositAmt} onChange={(e) => setDepositAmt(e.target.value)}
          placeholder="e.g. 500 or -200"
          style={{ ...inputStyle, fontFamily: 'var(--font-mono)', maxWidth: 200 }} />
        <button
          disabled={!depositAmt || Number(depositAmt) === 0}
          onClick={() => { addSaving(Number(depositAmt)); setDepositAmt(''); }}
          style={{
            padding: '8px 16px', border: 'none', borderRadius: 999,
            background: themeTokens.accent, color: '#0B0B0D',
            fontFamily: 'var(--font-body)', fontWeight: 700, fontSize: 10,
            letterSpacing: '0.18em', textTransform: 'uppercase',
            cursor: (!depositAmt || Number(depositAmt) === 0) ? 'not-allowed' : 'pointer',
            opacity: (!depositAmt || Number(depositAmt) === 0) ? 0.5 : 1,
          }}>Apply</button>
        <div style={{ flex: 1 }} />
        <button onClick={() => setShowNewGoal((v) => !v)}
          style={{
            padding: '6px 12px', borderRadius: 999,
            border: `1px solid ${showNewGoal ? themeTokens.accent : themeTokens.hairline2}`,
            background: showNewGoal ? themeTokens.accent : 'transparent',
            color: showNewGoal ? '#0B0B0D' : themeTokens.textDim,
            fontFamily: 'var(--font-mono)', fontSize: 10,
            letterSpacing: '0.18em', textTransform: 'uppercase', cursor: 'pointer',
          }}>{showNewGoal ? 'Cancel' : '+ New goal'}</button>
      </div>

      {showNewGoal && (
        <div style={{ marginTop: 12, display: 'grid', gridTemplateColumns: '1fr 140px 160px auto', gap: 10, alignItems: 'end' }}>
          <div>
            <Label tk={themeTokens}>Name</Label>
            <input value={newName} onChange={(e) => setNewName(e.target.value)}
              placeholder="e.g. Emergency fund" style={{ ...inputStyle, width: '100%' }} />
          </div>
          <div>
            <Label tk={themeTokens}>Target (R$)</Label>
            <input type="number" value={newTarget} onChange={(e) => setNewTarget(e.target.value)}
              placeholder="0.00" style={{ ...inputStyle, width: '100%', fontFamily: 'var(--font-mono)' }} />
          </div>
          <div>
            <Label tk={themeTokens}>Target date (optional)</Label>
            <input type="date" value={newDue} onChange={(e) => setNewDue(e.target.value)}
              style={{ ...inputStyle, width: '100%', fontFamily: 'var(--font-mono)', colorScheme: themeTokens.isDark ? 'dark' : 'light' }} />
          </div>
          <button onClick={submitNew} disabled={!newName || !newTarget}
            style={{
              padding: '10px 16px', border: 'none', borderRadius: 999,
              background: themeTokens.accent, color: '#0B0B0D',
              fontFamily: 'var(--font-body)', fontWeight: 700, fontSize: 10,
              letterSpacing: '0.18em', textTransform: 'uppercase',
              cursor: (!newName || !newTarget) ? 'not-allowed' : 'pointer',
              opacity: (!newName || !newTarget) ? 0.5 : 1, whiteSpace: 'nowrap',
            }}>Add goal</button>
        </div>
      )}

      {(goals || []).length > 0 && (
        <div style={{ marginTop: 16, paddingTop: 14, borderTop: `1px solid ${themeTokens.hairline}`, display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 12 }}>
          {goals.map((g) => {
            const { pct, monthsToTarget } = goalProgress(g);
            const remaining = Math.max(0, Number(g.target || 0) - Number(g.allocated || 0));
            return (
              <div key={g.id} style={{
                background: themeTokens.surface2,
                border: `1px solid ${themeTokens.hairline}`,
                borderRadius: 14, padding: 14,
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
                  <div style={{ color: themeTokens.text, fontSize: 14, fontWeight: 600 }}>{g.name}</div>
                  <button onClick={() => deleteGoal(g.id)}
                    style={{ background: 'transparent', border: 'none', color: themeTokens.textDim, cursor: 'pointer', fontFamily: 'var(--font-mono)', fontSize: 9, letterSpacing: '0.18em', textTransform: 'uppercase' }}>
                    Remove
                  </button>
                </div>
                <div style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 22, color: themeTokens.text, marginTop: 6 }}>
                  {fmt(Number(g.allocated) || 0)} <span style={{ color: themeTokens.textDim, fontSize: 12, fontWeight: 400 }}>/ {fmt(Number(g.target) || 0)}</span>
                </div>
                <div style={{ position: 'relative', height: 6, background: themeTokens.surface, borderRadius: 999, overflow: 'hidden', marginTop: 8 }}>
                  <div style={{ position: 'absolute', inset: 0, width: `${pct}%`, background: themeTokens.accent, transition: 'width 400ms ease' }} />
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 6 }}>
                  <span style={{ color: themeTokens.textDim, fontFamily: 'var(--font-mono)', fontSize: 10 }}>{pct.toFixed(1)}% · {fmt(remaining)} left</span>
                  {g.due && monthsToTarget != null && (
                    <span style={{ color: themeTokens.textDim, fontFamily: 'var(--font-mono)', fontSize: 10 }}>
                      {monthsToTarget >= 0 ? `${monthsToTarget}mo` : 'overdue'}
                    </span>
                  )}
                </div>
                <div style={{ display: 'flex', gap: 6, marginTop: 10, flexWrap: 'wrap' }}>
                  {[50, 100, 500].map((v) => (
                    <button key={v} onClick={() => allocate(g, v)} disabled={unallocated < v}
                      style={{
                        padding: '4px 10px', borderRadius: 999,
                        border: `1px solid ${themeTokens.hairline2}`,
                        background: 'transparent', color: themeTokens.textDim,
                        fontFamily: 'var(--font-mono)', fontSize: 9,
                        letterSpacing: '0.18em', textTransform: 'uppercase',
                        cursor: unallocated < v ? 'not-allowed' : 'pointer',
                        opacity: unallocated < v ? 0.4 : 1,
                      }}>+{v}</button>
                  ))}
                  <button onClick={() => allocate(g, -(Number(g.allocated) || 0))}
                    disabled={(Number(g.allocated) || 0) === 0}
                    style={{
                      padding: '4px 10px', borderRadius: 999,
                      border: `1px solid ${themeTokens.hairline2}`,
                      background: 'transparent', color: themeTokens.textDim,
                      fontFamily: 'var(--font-mono)', fontSize: 9,
                      letterSpacing: '0.18em', textTransform: 'uppercase',
                      cursor: (Number(g.allocated) || 0) === 0 ? 'not-allowed' : 'pointer',
                      opacity: (Number(g.allocated) || 0) === 0 ? 0.4 : 1,
                    }}>Reset</button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </Surface>
  );
};

export const Dashboard = () => {
  const { transactions, themeTokens, fmt, savingsTotal, goalAmount, setView, yoyDelta } = useAppContext();
  const [timeRange, setTimeRange] = useState(6);
  const series = useMemo(() => buildMonthlySeries(transactions, 1, timeRange - 2), [transactions, timeRange]);

  const currentMonth = series[1] || { income: 0, fixed: 0, variable: 0, cashflow: 0 };
  const prevMonth = series[0] || { income: 1, cashflow: 1 };
  const incomeDelta = (currentMonth.income - prevMonth.income) / Math.max(1, prevMonth.income) * 100;
  const cashflowDelta = (currentMonth.cashflow - prevMonth.cashflow) / Math.max(1, Math.abs(prevMonth.cashflow)) * 100;
  const savingsRate = currentMonth.income > 0 ? currentMonth.cashflow / currentMonth.income * 100 : 0;

  // Year-over-year deltas for each KPI: compare current calendar month to the
  // same month last year. Helpers in context compute { current, prior, pct, hasPrior }.
  const now    = new Date();
  const yoyInc = useMemo(
    () => yoyDelta(now.getFullYear(), now.getMonth(), (txs) => txs.reduce((s, t) => s + (t.type === 'income' && t.category !== 'Savings' ? t.amount : 0), 0)),
    [transactions, yoyDelta]
  );
  const yoyExp = useMemo(
    () => yoyDelta(now.getFullYear(), now.getMonth(), (txs) => txs.reduce((s, t) => s + (t.type === 'expense' && t.category !== 'Savings' && t.category !== 'Financing' ? t.amount : 0), 0)),
    [transactions, yoyDelta]
  );
  const yoyCash = useMemo(
    () => yoyDelta(now.getFullYear(), now.getMonth(), (txs) => {
      let inc = 0, exp = 0;
      for (const t of txs) {
        if (t.category === 'Savings') continue;
        if (t.type === 'income') inc += t.amount;
        else if (t.type === 'expense') exp += t.amount;
      }
      return inc - exp;
    }),
    [transactions, yoyDelta]
  );
  const yoyFixed = useMemo(
    () => yoyDelta(now.getFullYear(), now.getMonth(), (txs) => txs.reduce((s, t) => s + ((t.type === 'expense' && t.locked) ? t.amount : 0), 0)),
    [transactions, yoyDelta]
  );

  return (
    <div style={{ display: 'grid', gap: 24 }}>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 16 }}>
        <KPICard label="Liquid Income" value={fmt(currentMonth.income)} delta={incomeDelta}
          valueColor={currentMonth.income >= 0 ? themeTokens.positive : themeTokens.negative}
          yoy={yoyInc} />
        <KPICard label="Cash Flow" value={fmt(currentMonth.cashflow)} delta={cashflowDelta}
          valueColor={currentMonth.cashflow >= 0 ? themeTokens.positive : themeTokens.negative}
          yoy={yoyCash} />
        <KPICard label="Savings Rate" value={`${savingsRate.toFixed(1)}%`} positive={savingsRate >= 20} delta={savingsRate}
          valueColor={themeTokens.positive} />
        <KPICard label="Fixed Expenses" value={fmt(currentMonth.fixed)} positive={false}
          valueColor={themeTokens.negative}
          yoy={yoyFixed} />
      </div>

      <PanelErrorBoundary label="Monthly Insights">
        <MonthlyInsights transactions={transactions} savingsTotal={savingsTotal} goalAmount={goalAmount}
          themeTokens={themeTokens} fmt={fmt} />
      </PanelErrorBoundary>

      <PanelErrorBoundary label="Bill Reminders">
        <BillRemindersPanel />
      </PanelErrorBoundary>

      <PanelErrorBoundary label="Budgets">
        <BudgetsPanel />
      </PanelErrorBoundary>

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

      <SpendHeatmapSurface Surface={Surface} Eyebrow={Eyebrow} />

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

      <SavingsPanel />

      <Surface>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
          <Eyebrow>Recent Activity</Eyebrow>
          <button onClick={() => setView('allTransactions')}
            style={{
              background: 'transparent', border: 'none', padding: 0,
              color: themeTokens.textDim, fontFamily: 'var(--font-mono)',
              fontSize: 11, letterSpacing: '0.16em', textTransform: 'uppercase',
              cursor: 'pointer', transition: 'color 200ms',
            }}
            onMouseEnter={(e) => (e.currentTarget.style.color = themeTokens.accent)}
            onMouseLeave={(e) => (e.currentTarget.style.color = themeTokens.textDim)}>
            View all →
          </button>
        </div>
        <div>
          {transactions
            .filter((t) => t.category !== 'Financing')
            .slice()
            .sort((a, b) => new Date(b.date) - new Date(a.date))
            .slice(0, 7)
            .map((tx, i) =>
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
                <div style={{ color: themeTokens.textDim, fontSize: 11, fontFamily: 'var(--font-mono)', marginTop: 4, display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                  <span>{tx.category}</span>
                  {PAYMENT_CHIP[tx.paymentMethod]
                    ? <PaymentChip method={tx.paymentMethod} />
                    : <span>· {tx.paymentMethod}</span>}
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

const cardInstallmentInfo = (tx) => {
  const match = String(tx.description || '').match(/(?:·|\u00b7)\s*(\d+)\/(\d+)\s*$/);
  if (match) return `Installment ${match[1]}/${match[2]}`;
  return tx.groupId ? 'Installment schedule' : 'Single purchase';
};

const cardDisplayDescription = (tx) =>
  String(tx.description || '').replace(/\s*(?:·|\u00b7)\s*\d+\/\d+\s*$/, '');

const buildCardPurchasesHtml = ({ card, rows, fmt }) => {
  const escapeHtml = (value) => String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');

  const now = new Date();
  const title = `${card.name} · Recent on this card`;
  const visaBilling = card.method === 'VISA Mercado Pago'
    ? `<div class="billing-box">
        <div class="billing-label">Closing / payment date</div>
        <div class="billing-date">15th of every month</div>
        <div class="billing-note">Billing cycle date: 15th monthly</div>
      </div>`
    : '';

  const currentMonthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const initialRows = rows.filter((tx) => new Date(tx.date) >= currentMonthStart);
  const bodyRows = initialRows.length ? initialRows.map((tx) => {
    const date = new Date(tx.date);
    const future = date > now;
    const installment = cardInstallmentInfo(tx);
    return `
      <tr class="${future ? 'future' : ''}">
        <td>${escapeHtml(date.toLocaleDateString('en-US', { month: 'short', day: '2-digit', year: 'numeric' }))}</td>
        <td>
          <div class="desc">${escapeHtml(cardDisplayDescription(tx))}</div>
          <div class="meta">${escapeHtml(tx.category)} · ${escapeHtml(tx.paymentMethod)}</div>
        </td>
        <td>${escapeHtml(installment)}</td>
        <td>${future ? 'Future scheduled charge' : 'Current month purchase'}</td>
        <td class="amount">${escapeHtml(fmt(tx.amount))}</td>
      </tr>`;
  }).join('') : '<tr><td colspan="5" class="empty">No current purchases or future / pending purchases on this card.</td></tr>';
  const normalizedRows = rows.map((tx) => ({
    id: tx.id,
    date: tx.date,
    description: cardDisplayDescription(tx),
    category: tx.category,
    paymentMethod: tx.paymentMethod,
    amount: Number(tx.amount) || 0,
    amountLabel: fmt(tx.amount),
    installment: cardInstallmentInfo(tx),
  }));
  const rowsJson = JSON.stringify(normalizedRows).replace(/</g, '\\u003c');

  const html = `<!doctype html>
    <html lang="en">
      <head>
        <meta charset="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <title>${escapeHtml(title)}</title>
        <style>
          * { box-sizing: border-box; }
          body {
            margin: 0;
            background: #121212;
            color: #F2EDE6;
            font-family: Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
          }
          main { max-width: 1180px; margin: 0 auto; padding: 32px; }
          header {
            display: flex;
            align-items: flex-start;
            justify-content: space-between;
            gap: 24px;
            margin-bottom: 24px;
            border-bottom: 1px solid #333333;
            padding-bottom: 20px;
          }
          .eyebrow {
            color: #999999;
            font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace;
            font-size: 11px;
            letter-spacing: 0.22em;
            text-transform: uppercase;
          }
          h1 { margin: 8px 0 0; font-size: 34px; letter-spacing: -0.02em; }
          .summary { margin-top: 10px; color: #999999; font-size: 14px; }
          .filters {
            display: flex;
            flex-wrap: wrap;
            gap: 8px;
            align-items: center;
            margin: 0 0 18px;
            padding: 14px;
            border: 1px solid #333333;
            border-radius: 16px;
            background: #1E1E1E;
          }
          .filter-btn, .custom-input {
            border: 1px solid #3A3A3A;
            border-radius: 999px;
            background: transparent;
            color: #999999;
            padding: 8px 12px;
            font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace;
            font-size: 10px;
            letter-spacing: 0.16em;
            text-transform: uppercase;
          }
          .filter-btn { cursor: pointer; transition: all 180ms ease; }
          .filter-btn.active {
            border-color: #E0A899;
            background: #E0A899;
            color: #0B0B0D;
          }
          .custom-input {
            border-radius: 10px;
            color-scheme: dark;
            display: none;
          }
          .filters.custom .custom-input { display: inline-block; }
          .totals {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
            gap: 10px;
            margin: 0 0 18px;
          }
          .metric {
            border: 1px solid #333333;
            border-radius: 14px;
            padding: 12px 14px;
            background: #1E1E1E;
          }
          .metric-label {
            color: #999999;
            font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace;
            font-size: 10px;
            letter-spacing: 0.18em;
            text-transform: uppercase;
          }
          .metric-value { margin-top: 4px; font-size: 20px; font-weight: 700; }
          .billing-box {
            min-width: 260px;
            border: 1px solid #E0A899;
            border-radius: 16px;
            padding: 14px 16px;
            text-align: right;
            background: rgba(224, 168, 153, 0.10);
          }
          .billing-label, .billing-note {
            color: #999999;
            font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace;
            font-size: 10px;
            letter-spacing: 0.18em;
            text-transform: uppercase;
          }
          .billing-date { margin: 4px 0; color: #F2EDE6; font-size: 22px; font-weight: 700; }
          h2 {
            margin: 24px 0 10px;
            color: #999999;
            font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace;
            font-size: 11px;
            letter-spacing: 0.22em;
            text-transform: uppercase;
          }
          table { width: 100%; border-collapse: collapse; overflow: hidden; border-radius: 16px; }
          th, td { padding: 14px 16px; border-bottom: 1px solid #2A2A2A; text-align: left; vertical-align: top; }
          th {
            color: #999999;
            font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace;
            font-size: 10px;
            letter-spacing: 0.18em;
            text-transform: uppercase;
            background: #1E1E1E;
          }
          tr.future td { color: #E0B33B; }
          tr.pending td { color: #E0B33B; }
          .desc { font-weight: 600; color: inherit; }
          .meta {
            margin-top: 4px;
            color: #777777;
            font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace;
            font-size: 11px;
            letter-spacing: 0.08em;
            text-transform: uppercase;
          }
          .amount { text-align: right; font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace; }
          .empty { text-align: center; color: #999999; padding: 32px; }
          .section { margin-top: 8px; }
          @media (max-width: 760px) {
            main { padding: 20px; }
            header { display: grid; }
            .billing-box { text-align: left; width: 100%; }
            table { display: block; overflow-x: auto; white-space: nowrap; }
          }
        </style>
      </head>
      <body>
        <main>
          <header>
            <div>
              <div class="eyebrow">Recent on this card</div>
              <h1>${escapeHtml(card.name)}</h1>
              <div class="summary">Current purchases of the month and Future / Pending purchases</div>
            </div>
            ${visaBilling}
          </header>
          <section id="filters" class="filters">
            <button class="filter-btn active" data-filter="currentFuture">Current + Future / Pending</button>
            <button class="filter-btn" data-filter="last30">Last 30 days</button>
            <button class="filter-btn" data-filter="cycle15">15th last month &rarr; 15th this month</button>
            <button class="filter-btn" data-filter="last60">Last 60 days</button>
            <button class="filter-btn" data-filter="last90">Last 90 days</button>
            <button class="filter-btn" data-filter="custom">Custom period</button>
            <input id="customFrom" class="custom-input" type="date" />
            <input id="customTo" class="custom-input" type="date" />
          </section>
          <section class="totals">
            <div class="metric">
              <div class="metric-label">Transactions</div>
              <div id="countTotal" class="metric-value">0</div>
            </div>
            <div class="metric">
              <div class="metric-label">Current period</div>
              <div id="currentTotal" class="metric-value">R$ 0,00</div>
            </div>
            <div class="metric">
              <div class="metric-label">Future / Pending</div>
              <div id="futureTotal" class="metric-value">R$ 0,00</div>
            </div>
          </section>
          <section class="section">
          <h2>Current month purchases</h2>
          <table>
            <thead>
              <tr>
                <th>Transaction date</th>
                <th>Description</th>
                <th>Installment information</th>
                <th>Schedule</th>
                <th>Amount</th>
              </tr>
            </thead>
            <tbody id="currentRows">${bodyRows}</tbody>
          </table>
          </section>
          <section class="section">
          <h2>Future / Pending purchases</h2>
          <table>
            <thead>
              <tr>
                <th>Transaction date</th>
                <th>Description</th>
                <th>Installment information</th>
                <th>Schedule</th>
                <th>Amount</th>
              </tr>
            </thead>
            <tbody id="futureRows"></tbody>
          </table>
          </section>
        </main>
        <script>
          const rows = ${rowsJson};
          const today = new Date();
          const currentMonthStart = new Date(today.getFullYear(), today.getMonth(), 1);
          const money = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' });
          const filterBox = document.getElementById('filters');
          const customFrom = document.getElementById('customFrom');
          const customTo = document.getElementById('customTo');
          let activeFilter = 'currentFuture';

          const escapeText = (value) => String(value ?? '')
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#039;');

          const dayStart = (date) => {
            const d = new Date(date);
            d.setHours(0, 0, 0, 0);
            return d;
          };
          const addDays = (date, days) => {
            const d = dayStart(date);
            d.setDate(d.getDate() + days);
            return d;
          };
          const cycle15Range = () => ({
            from: new Date(today.getFullYear(), today.getMonth() - 1, 15),
            to: new Date(today.getFullYear(), today.getMonth(), 15, 23, 59, 59, 999),
          });
          const activeRange = () => {
            if (activeFilter === 'last30') return { from: addDays(today, -30), to: today };
            if (activeFilter === 'last60') return { from: addDays(today, -60), to: today };
            if (activeFilter === 'last90') return { from: addDays(today, -90), to: today };
            if (activeFilter === 'cycle15') return cycle15Range();
            if (activeFilter === 'custom') {
              return {
                from: customFrom.value ? dayStart(customFrom.value) : null,
                to: customTo.value ? new Date(customTo.value + 'T23:59:59.999') : null,
              };
            }
            return { from: currentMonthStart, to: null };
          };
          const visibleRows = () => {
            const range = activeRange();
            return rows.filter((row) => {
              const d = new Date(row.date);
              if (range.from && d < range.from) return false;
              if (range.to && d > range.to) return false;
              return true;
            }).sort((a, b) => new Date(a.date) - new Date(b.date));
          };
          const rowHtml = (row, label, cls) => {
            const date = new Date(row.date);
            return '<tr class="' + cls + '">' +
              '<td>' + escapeText(date.toLocaleDateString('en-US', { month: 'short', day: '2-digit', year: 'numeric' })) + '</td>' +
              '<td><div class="desc">' + escapeText(row.description) + '</div><div class="meta">' + escapeText(row.category) + ' · ' + escapeText(row.paymentMethod) + '</div></td>' +
              '<td>' + escapeText(row.installment) + '</td>' +
              '<td>' + label + '</td>' +
              '<td class="amount">' + escapeText(row.amountLabel) + '</td>' +
            '</tr>';
          };
          const emptyHtml = (message) => '<tr><td colspan="5" class="empty">' + escapeText(message) + '</td></tr>';
          const render = () => {
            filterBox.classList.toggle('custom', activeFilter === 'custom');
            const rowsInRange = visibleRows();
            const currentRows = rowsInRange.filter((row) => new Date(row.date) <= today);
            const futureRows = rowsInRange.filter((row) => new Date(row.date) > today);
            document.getElementById('currentRows').innerHTML = currentRows.length
              ? currentRows.map((row) => rowHtml(row, 'Current purchase', '')).join('')
              : emptyHtml('No current purchases in this filter.');
            document.getElementById('futureRows').innerHTML = futureRows.length
              ? futureRows.map((row) => rowHtml(row, 'Future / Pending scheduled charge', 'pending')).join('')
              : emptyHtml('No future / pending purchases in this filter.');
            const currentAmount = currentRows.reduce((sum, row) => sum + row.amount, 0);
            const futureAmount = futureRows.reduce((sum, row) => sum + row.amount, 0);
            document.getElementById('countTotal').textContent = String(rowsInRange.length);
            document.getElementById('currentTotal').textContent = money.format(currentAmount);
            document.getElementById('futureTotal').textContent = money.format(futureAmount);
          };
          document.querySelectorAll('[data-filter]').forEach((btn) => {
            btn.addEventListener('click', () => {
              activeFilter = btn.dataset.filter;
              document.querySelectorAll('[data-filter]').forEach((b) => b.classList.toggle('active', b === btn));
              render();
            });
          });
          customFrom.addEventListener('change', render);
          customTo.addEventListener('change', render);
          render();
        </script>
      </body>
    </html>`;
  return html;
};

const createCardPurchasesUrl = (args) =>
  URL.createObjectURL(new Blob([buildCardPurchasesHtml(args)], { type: 'text/html;charset=utf-8' }));

// Opens the in-app CardPurchasesPage in a new browser tab by reopening the
// SPA with `?card=<method>&view=cardPurchases`. App.jsx bootstraps the focused
// card + view from those params on mount.
const CardRecentPurchasesLink = ({ card, themeTokens }) => {
  const handleClick = (e) => {
    e.preventDefault();
    try {
      const url = `${window.location.origin}${window.location.pathname}?card=${encodeURIComponent(card.method)}&view=cardPurchases`;
      window.open(url, '_blank', 'noopener,noreferrer');
    } catch (_) {}
  };
  return (
    <button
      type="button"
      onClick={handleClick}
      style={{
        padding: '6px 12px', borderRadius: 999,
        border: `1px solid ${themeTokens.hairline2}`,
        background: 'transparent',
        color: themeTokens.textDim,
        fontFamily: 'var(--font-mono)', fontSize: 10,
        letterSpacing: '0.18em', textTransform: 'uppercase',
        cursor: 'pointer', transition: 'all 200ms',
        display: 'inline-flex',
      }}>
      Recent on this card ↗
    </button>
  );
};

export const CardsPage = () => {
  const { ccStats, themeTokens, fmt } = useAppContext();
  const cards = [
    { name: 'Mercado Pago', last4: '4731', type: 'visa', method: 'VISA Mercado Pago', stats: ccStats['VISA Mercado Pago'] },
    { name: 'Nubank',       last4: '8129', type: 'mastercard', method: 'Nubank MasterCard', stats: ccStats['Nubank MasterCard'] }
  ];

  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(360px, 1fr))', gap: 28 }}>
      {cards.map((c, i) => {
        const cardRows = (c.stats?.txs || [])
          .slice()
          .sort((a, b) => new Date(a.date) - new Date(b.date));
        return (
        <motion.div key={i}
          initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: i * 0.08, ease: [0.22, 1, 0.36, 1] }}>
          <FlipTiltCard
            back={<CardBack total={c.stats?.total || 0} last4={c.last4} name={c.name} />}>
            <CardVisual type={c.type} />
          </FlipTiltCard>

          <PaymentPanel current={c.stats?.current || 0} future={c.stats?.future || 0} />

          <div style={{ marginTop: 16, paddingTop: 14, borderTop: `1px solid ${themeTokens.hairline}` }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, marginBottom: 6 }}>
              <Eyebrow>Recent on this card</Eyebrow>
              <CardRecentPurchasesLink card={c} themeTokens={themeTokens} />
            </div>
            {(c.stats?.txs || []).slice(0, 4).map((tx) =>
              <div key={tx.id} style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', fontSize: 13 }}>
                <span style={{ color: themeTokens.text }}>{tx.description}</span>
                <span style={{ color: themeTokens.textDim, fontFamily: 'var(--font-mono)' }}>{fmt(tx.amount)}</span>
              </div>
            )}
          </div>
        </motion.div>
      );
      })}
    </div>
  );
};

// Full-page view of one card's purchases. Splits Current (already happened up
// to today) and Future / Pending (dated after today). Filters: 30D / 60D / 90D
// / Custom date range. Opens in a separate browser tab via the URL params
// `?card=<method>&view=cardPurchases` (see CardRecentPurchasesLink + App.jsx).
export const CardPurchasesPage = () => {
  const {
    transactions, themeTokens, fmt,
    focusedCardMethod, setFocusedCardMethod, setView,
  } = useAppContext();

  // 30D / 60D / 90D / custom — defaults to 30D.
  const [filterKind, setFilterKind] = useState('30');
  const [customFrom, setCustomFrom] = useState('');
  const [customTo,   setCustomTo]   = useState('');

  const cardMeta = useMemo(() => {
    const map = {
      'VISA Mercado Pago': { name: 'Mercado Pago', last4: '4731', brand: '#1A1F71' },
      'Nubank MasterCard': { name: 'Nubank',       last4: '8129', brand: '#820AD1' },
    };
    return map[focusedCardMethod] || { name: focusedCardMethod || 'Card', last4: '••••', brand: themeTokens.accent };
  }, [focusedCardMethod, themeTokens.accent]);

  const today = useMemo(() => {
    const d = new Date();
    d.setHours(23, 59, 59, 999);
    return d;
  }, []);

  // Compute the active filter range. Future months are always included
  // regardless of "last N days" — those filters only narrow the *historical*
  // window so the user can still see upcoming scheduled installments.
  const range = useMemo(() => {
    if (filterKind === 'custom') {
      const from = customFrom ? new Date(customFrom + 'T00:00:00') : null;
      const to   = customTo   ? new Date(customTo   + 'T23:59:59') : null;
      return { from, to, includeFuture: false };
    }
    const days = Number(filterKind) || 30;
    const from = new Date(today);
    from.setDate(from.getDate() - days);
    from.setHours(0, 0, 0, 0);
    return { from, to: null, includeFuture: true };
  }, [filterKind, customFrom, customTo, today]);

  const filtered = useMemo(() => {
    if (!focusedCardMethod) return [];
    return transactions.filter((t) => {
      if (t.paymentMethod !== focusedCardMethod) return false;
      const d = new Date(t.date);
      // Future-dated rows: always include in "preset" filters; respect bounds in custom.
      if (d > today) {
        if (range.includeFuture) return true;
        if (range.to && d > range.to) return false;
        return true;
      }
      if (range.from && d < range.from) return false;
      if (range.to && d > range.to) return false;
      return true;
    }).sort((a, b) => new Date(a.date) - new Date(b.date));
  }, [transactions, focusedCardMethod, range, today]);

  const current = filtered.filter((t) => new Date(t.date) <= today);
  const future  = filtered.filter((t) => new Date(t.date) >  today);
  const sum     = (arr) => arr.reduce((s, t) => s + (Number(t.amount) || 0), 0);
  const currentTotal = sum(current);
  const futureTotal  = sum(future);

  const chipStyle = (active) => ({
    padding: '6px 14px', borderRadius: 999,
    border: `1px solid ${active ? themeTokens.accent : themeTokens.hairline2}`,
    background: active ? themeTokens.accent : 'transparent',
    color: active ? '#0B0B0D' : themeTokens.textDim,
    fontFamily: 'var(--font-mono)', fontSize: 10,
    letterSpacing: '0.18em', textTransform: 'uppercase',
    cursor: 'pointer', transition: 'all 200ms',
  });

  const inputStyle = {
    background: 'transparent',
    border: `1px solid ${themeTokens.hairline2}`, borderRadius: 8,
    padding: '6px 10px', color: themeTokens.text,
    fontFamily: 'var(--font-mono)', fontSize: 12, outline: 'none',
    colorScheme: themeTokens.isDark ? 'dark' : 'light',
  };

  const RowGroup = ({ title, rows, total, pending }) => (
    <Surface>
      <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
        <Eyebrow>{title}</Eyebrow>
        <div style={{ fontFamily: 'var(--font-mono)', fontSize: 12, color: themeTokens.textDim }}>
          {rows.length} item{rows.length === 1 ? '' : 's'} · <span style={{ color: pending ? '#E0B33B' : themeTokens.text }}>{fmt(total)}</span>
        </div>
      </div>
      <div style={{ height: 8 }} />
      {rows.length === 0 ? (
        <div style={{ padding: 16, color: themeTokens.textDim, fontSize: 13, textAlign: 'center' }}>
          {pending ? 'No upcoming purchases.' : 'No purchases in this range.'}
        </div>
      ) : (
        <div style={{ borderTop: `1px solid ${themeTokens.hairline}` }}>
          {rows.map((tx) => {
            const d = new Date(tx.date);
            const color = pending ? '#E0B33B' : themeTokens.text;
            return (
              <div key={tx.id} style={{
                display: 'grid', gridTemplateColumns: '90px 1fr auto', gap: 14,
                padding: '12px 0', alignItems: 'center',
                borderBottom: `1px solid ${themeTokens.hairline}`,
              }}>
                <div style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: pending ? '#E0B33B' : themeTokens.textDim }}>
                  {d.toLocaleDateString('en-US', { month: 'short', day: '2-digit', year: 'numeric' })}
                </div>
                <div>
                  <div style={{ color, fontSize: 14 }}>{tx.description}</div>
                  <div style={{ color: themeTokens.textDim, fontFamily: 'var(--font-mono)', fontSize: 10, letterSpacing: '0.18em', textTransform: 'uppercase', marginTop: 4 }}>
                    {tx.category}{pending ? ' · pending' : ''}
                  </div>
                </div>
                <div style={{ fontFamily: 'var(--font-mono)', fontSize: 14, color, minWidth: 100, textAlign: 'right' }}>
                  −{fmt(tx.amount)}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </Surface>
  );

  return (
    <div style={{ display: 'grid', gap: 16 }}>
      <Surface>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
          <button onClick={() => { setFocusedCardMethod(null); setView('cards'); }}
            style={{
              padding: '6px 14px', borderRadius: 999,
              border: `1px solid ${themeTokens.hairline2}`,
              background: 'transparent', color: themeTokens.textDim,
              fontFamily: 'var(--font-mono)', fontSize: 10,
              letterSpacing: '0.18em', textTransform: 'uppercase', cursor: 'pointer',
            }}>← Cards</button>
          <div style={{ width: 12 }} />
          <span style={{
            display: 'inline-block', width: 10, height: 10, borderRadius: 2,
            background: cardMeta.brand,
          }} />
          <div style={{
            fontFamily: 'var(--font-display)', fontSize: 22, fontWeight: 700,
            color: themeTokens.text, letterSpacing: '-0.01em',
          }}>{cardMeta.name}</div>
          <span style={{ color: themeTokens.textDim, fontFamily: 'var(--font-mono)', fontSize: 11, letterSpacing: '0.18em' }}>
            •••• {cardMeta.last4}
          </span>
          <div style={{ flex: 1 }} />
          <div style={{ color: themeTokens.textDim, fontFamily: 'var(--font-mono)', fontSize: 11 }}>
            Current <span style={{ color: themeTokens.text }}>{fmt(currentTotal)}</span> · Future <span style={{ color: '#E0B33B' }}>{fmt(futureTotal)}</span>
          </div>
        </div>
      </Surface>

      <Surface>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
          <Eyebrow>Filter</Eyebrow>
          <button style={chipStyle(filterKind === '30')}  onClick={() => setFilterKind('30')}>Last 30 days</button>
          <button style={chipStyle(filterKind === '60')}  onClick={() => setFilterKind('60')}>Last 60 days</button>
          <button style={chipStyle(filterKind === '90')}  onClick={() => setFilterKind('90')}>Last 90 days</button>
          <button style={chipStyle(filterKind === 'custom')} onClick={() => setFilterKind('custom')}>Custom</button>
          {filterKind === 'custom' && (
            <>
              <span style={{ color: themeTokens.textDim, fontFamily: 'var(--font-mono)', fontSize: 10, letterSpacing: '0.18em', textTransform: 'uppercase', marginLeft: 6 }}>From</span>
              <input type="date" value={customFrom} onChange={(e) => setCustomFrom(e.target.value)} style={inputStyle} />
              <span style={{ color: themeTokens.textDim, fontFamily: 'var(--font-mono)', fontSize: 10, letterSpacing: '0.18em', textTransform: 'uppercase' }}>To</span>
              <input type="date" value={customTo} onChange={(e) => setCustomTo(e.target.value)} style={inputStyle} />
            </>
          )}
          <div style={{ flex: 1 }} />
          <div style={{ color: themeTokens.textFaint, fontFamily: 'var(--font-mono)', fontSize: 10, letterSpacing: '0.18em', textTransform: 'uppercase' }}>
            Future purchases always shown
          </div>
        </div>
      </Surface>

      <RowGroup title="Current month / past purchases" rows={current} total={currentTotal} pending={false} />
      <RowGroup title="Future · Pending" rows={future} total={futureTotal} pending={true} />
    </div>
  );
};

const GRAPH_PURCHASE_FILTERS = [
  { id: 'all', label: 'All' },
  { id: 'debit', label: 'Debit/Cash' },
  { id: 'visa', label: 'Visa Mercado Pago' },
  { id: 'nubank', label: 'Nubank' },
  { id: 'subscriptions', label: 'Subscriptions' },
];

const isSubscriptionPurchase = (tx) => {
  const category = String(tx.category || '').toLowerCase();
  const tags = Array.isArray(tx.tags) ? tx.tags.map((tag) => String(tag).toLowerCase()) : [];
  return category.includes('subscription') || tags.includes('recurring') || tags.includes('subscription');
};

const graphPurchaseGroup = (tx) => {
  if (isSubscriptionPurchase(tx)) return 'subscriptions';
  if (tx.paymentMethod === 'VISA Mercado Pago') return 'visa';
  if (tx.paymentMethod === 'Nubank MasterCard') return 'nubank';
  return 'debit';
};

const graphPurchaseGroupLabel = (group) => (
  GRAPH_PURCHASE_FILTERS.find((filter) => filter.id === group)?.label || 'Debit/Cash'
);

const MonthPurchaseDrilldown = ({ selectedMonth, transactions, themeTokens, fmt }) => {
  const [filter, setFilter] = useState('all');

  useEffect(() => {
    setFilter('all');
  }, [selectedMonth?.monthKey]);

  const rows = useMemo(() => {
    if (!selectedMonth) return [];
    return transactions
      .filter((tx) => {
        if (tx.type !== 'expense') return false;
        if (tx.category === 'Financing' || tx.category === 'Savings') return false;
        const date = new Date(tx.date);
        return date.getFullYear() === selectedMonth.year && date.getMonth() === selectedMonth.month;
      })
      .map((tx) => ({ ...tx, graphGroup: graphPurchaseGroup(tx) }))
      .sort((a, b) => new Date(a.date) - new Date(b.date));
  }, [transactions, selectedMonth]);

  const totals = useMemo(() => {
    const next = { all: 0, debit: 0, visa: 0, nubank: 0, subscriptions: 0 };
    for (const tx of rows) {
      next.all += Number(tx.amount) || 0;
      next[tx.graphGroup] += Number(tx.amount) || 0;
    }
    return next;
  }, [rows]);

  const visibleRows = filter === 'all' ? rows : rows.filter((tx) => tx.graphGroup === filter);
  const visibleTotal = visibleRows.reduce((sum, tx) => sum + (Number(tx.amount) || 0), 0);
  const chipStyle = (active) => ({
    border: `1px solid ${active ? themeTokens.accent : themeTokens.hairline2}`,
    background: active ? themeTokens.accent : 'transparent',
    color: active ? '#0B0B0D' : themeTokens.textDim,
    borderRadius: 999,
    padding: '7px 12px',
    fontFamily: 'var(--font-mono)',
    fontSize: 10,
    letterSpacing: '0.18em',
    textTransform: 'uppercase',
    cursor: 'pointer',
    transition: 'all 180ms',
  });

  if (!selectedMonth) return null;

  return (
    <Surface>
      <div style={{ display: 'flex', justifyContent: 'space-between', gap: 18, alignItems: 'flex-start', flexWrap: 'wrap' }}>
        <div>
          <Eyebrow>Purchases · {selectedMonth.monthLabel}</Eyebrow>
          <Display size={34} color={themeTokens.accent}>{fmt(totals.all)}</Display>
          <div style={{ color: themeTokens.textDim, fontSize: 13, marginTop: 6 }}>
            Total purchases for the selected month, excluding income, savings, and financing rows.
          </div>
        </div>
        <div style={{ textAlign: 'right' }}>
          <Eyebrow>Filtered total</Eyebrow>
          <div style={{ color: themeTokens.text, fontFamily: 'var(--font-mono)', fontSize: 22, marginTop: 6 }}>
            {fmt(visibleTotal)}
          </div>
          <div style={{ color: themeTokens.textDim, fontFamily: 'var(--font-mono)', fontSize: 10, letterSpacing: '0.18em', textTransform: 'uppercase', marginTop: 6 }}>
            {visibleRows.length} purchase{visibleRows.length === 1 ? '' : 's'}
          </div>
        </div>
      </div>

      <div style={{ height: 18 }} />
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 10 }}>
        {GRAPH_PURCHASE_FILTERS.slice(1).map((item) => (
          <div key={item.id} style={{
            border: `1px solid ${themeTokens.hairline}`,
            borderRadius: 14,
            background: themeTokens.surface2,
            padding: '12px 14px',
          }}>
            <div style={{ color: themeTokens.textDim, fontFamily: 'var(--font-mono)', fontSize: 10, letterSpacing: '0.18em', textTransform: 'uppercase' }}>
              {item.label}
            </div>
            <div style={{ color: themeTokens.text, fontFamily: 'var(--font-mono)', fontSize: 18, marginTop: 6 }}>
              {fmt(totals[item.id])}
            </div>
          </div>
        ))}
      </div>

      <div style={{ height: 16 }} />
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
        {GRAPH_PURCHASE_FILTERS.map((item) => (
          <button key={item.id} onClick={() => setFilter(item.id)} style={chipStyle(filter === item.id)}>
            {item.label}
          </button>
        ))}
      </div>

      <div style={{ height: 14 }} />
      <div style={{ overflowX: 'auto', border: `1px solid ${themeTokens.hairline}`, borderRadius: 14 }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 760 }}>
          <thead>
            <tr style={{ background: themeTokens.surface2 }}>
              {['Date', 'Description', 'Group', 'Category', 'Payment', 'Amount'].map((heading) => (
                <th key={heading} style={{
                  padding: '12px 14px',
                  color: themeTokens.textDim,
                  fontFamily: 'var(--font-mono)',
                  fontSize: 10,
                  letterSpacing: '0.18em',
                  textTransform: 'uppercase',
                  textAlign: heading === 'Amount' ? 'right' : 'left',
                  borderBottom: `1px solid ${themeTokens.hairline}`,
                }}>
                  {heading}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {visibleRows.length === 0 ? (
              <tr>
                <td colSpan={6} style={{ padding: 28, textAlign: 'center', color: themeTokens.textDim, fontSize: 13 }}>
                  No purchases for this filter.
                </td>
              </tr>
            ) : visibleRows.map((tx) => {
              const date = new Date(tx.date);
              return (
                <tr key={tx.id}>
                  <td style={{ padding: '12px 14px', borderBottom: `1px solid ${themeTokens.hairline}`, color: themeTokens.textDim, fontFamily: 'var(--font-mono)', fontSize: 11 }}>
                    {date.toLocaleDateString('en-US', { month: 'short', day: '2-digit' })}
                  </td>
                  <td style={{ padding: '12px 14px', borderBottom: `1px solid ${themeTokens.hairline}`, color: themeTokens.text, fontSize: 13 }}>
                    {tx.description}
                  </td>
                  <td style={{ padding: '12px 14px', borderBottom: `1px solid ${themeTokens.hairline}`, color: themeTokens.accent, fontFamily: 'var(--font-mono)', fontSize: 10, letterSpacing: '0.16em', textTransform: 'uppercase' }}>
                    {graphPurchaseGroupLabel(tx.graphGroup)}
                  </td>
                  <td style={{ padding: '12px 14px', borderBottom: `1px solid ${themeTokens.hairline}`, color: themeTokens.textDim, fontSize: 12 }}>
                    {tx.category}
                  </td>
                  <td style={{ padding: '12px 14px', borderBottom: `1px solid ${themeTokens.hairline}`, color: themeTokens.textDim, fontSize: 12 }}>
                    {tx.paymentMethod}
                  </td>
                  <td style={{ padding: '12px 14px', borderBottom: `1px solid ${themeTokens.hairline}`, color: themeTokens.text, fontFamily: 'var(--font-mono)', fontSize: 13, textAlign: 'right' }}>
                    {fmt(tx.amount)}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </Surface>
  );
};

export const GraphPage = () => {
  const { transactions, themeTokens, fmt, pickedDate } = useAppContext();

  // Default window is the current calendar year (Jan 1 → Dec 31). When the
  // user clicks a date on the Payment Calendar, that selection drives all the
  // graphs into single-month mode. The selection is intentionally NOT
  // persisted — when the user leaves Graphs and comes back, the page remounts
  // and defaults back to the full year.
  const today = useMemo(() => new Date(), []);
  const baselineRef = useRef(pickedDate);
  const [selectedMonth, setSelectedMonth] = useState(null);

  // Watch pickedDate changes that happen AFTER mount (i.e. the user clicked a
  // day in the Payment Calendar while on this page). On the very first render
  // we just capture the baseline so the default year view is preserved.
  useEffect(() => {
    if (pickedDate === baselineRef.current) return;
    const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(pickedDate);
    if (!m) return;
    const y = Number(m[1]);
    const mo = Number(m[2]) - 1;
    const base = new Date(y, mo, 1);
    setSelectedMonth({
      year: y, month: mo,
      monthKey: `${y}-${String(mo + 1).padStart(2, '0')}`,
      monthLabel: base.toLocaleString('en-US', { month: 'long', year: 'numeric' }),
    });
  }, [pickedDate]);

  const year = selectedMonth?.year ?? today.getFullYear();
  const series = useMemo(() => buildYearSeries(transactions, year), [transactions, year]);

  // Cash flow + income headline values. When a month is selected, show that
  // month's value; otherwise sum the whole 12-month window.
  const headline = useMemo(() => {
    if (selectedMonth) {
      const m = series.find((r) => r.monthKey === selectedMonth.monthKey);
      return { cashflow: m?.cashflow || 0, income: m?.income || 0 };
    }
    return series.reduce(
      (acc, r) => ({ cashflow: acc.cashflow + r.cashflow, income: acc.income + r.income }),
      { cashflow: 0, income: 0 }
    );
  }, [series, selectedMonth?.monthKey]);

  const cashflowEyebrow = selectedMonth ? `Cash Flow · ${selectedMonth.monthLabel}` : `Cash Flow · ${year}`;
  const incomeEyebrow   = selectedMonth ? `Income · ${selectedMonth.monthLabel}`    : `Income · ${year}`;
  const composedEyebrow = selectedMonth ? `Income vs Fixed + Variable · ${selectedMonth.monthLabel}` : `Income vs Fixed + Variable · ${year}`;
  const pieEyebrow      = selectedMonth ? `Spending by Category · ${selectedMonth.monthLabel}` : `Spending by Category · ${year}`;

  // Range passed to ExpensePie. Year mode = Jan→Dec of the year, month mode =
  // just that month.
  const pieRange = selectedMonth
    ? { fromYear: selectedMonth.year, fromMonth: selectedMonth.month, toYear: selectedMonth.year, toMonth: selectedMonth.month }
    : { fromYear: year, fromMonth: 0, toYear: year, toMonth: 11 };

  const clearSelection = () => { setSelectedMonth(null); };

  return (
    <div style={{ display: 'grid', gap: 24 }}>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24 }}>
        <Surface>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
            <Eyebrow>{cashflowEyebrow}</Eyebrow>
            {selectedMonth && (
              <button onClick={clearSelection}
                style={{
                  background: 'transparent', border: 'none', color: themeTokens.textDim, cursor: 'pointer',
                  fontFamily: 'var(--font-mono)', fontSize: 10, letterSpacing: '0.18em', textTransform: 'uppercase',
                }}>Clear month ✕</button>
            )}
          </div>
          <Display size={36}
            color={(headline.cashflow || 0) >= 0 ? themeTokens.positive : themeTokens.negative}>
            {fmtCurrency(headline.cashflow || 0, 'BRL')}
          </Display>
          <div style={{ height: 12 }} />
          <AreaSpark data={series} dataKey="cashflow" accent={themeTokens.accent} tokens={themeTokens} height={220} />
        </Surface>
        <Surface>
          <Eyebrow>{incomeEyebrow}</Eyebrow>
          <Display size={36} color={themeTokens.positive}>{fmtCurrency(headline.income || 0, 'BRL')}</Display>
          <div style={{ height: 12 }} />
          <AreaSpark data={series} dataKey="income" accent={themeTokens.positive} tokens={themeTokens} height={220} />
        </Surface>
      </div>
      <Surface>
        <div style={{ display: 'flex', justifyContent: 'space-between', gap: 14, alignItems: 'center', flexWrap: 'wrap' }}>
          <Eyebrow>{composedEyebrow}</Eyebrow>
          <span style={{ color: themeTokens.textDim, fontFamily: 'var(--font-mono)', fontSize: 10, letterSpacing: '0.18em', textTransform: 'uppercase' }}>
            Click a column · or pick a day in the Payment Calendar
          </span>
        </div>
        <div style={{ height: 12 }} />
        <ComposedFlow data={series} onMonthSelect={(p) => setSelectedMonth({
          year: p.year, month: p.month, monthKey: p.monthKey, monthLabel: p.monthLabel,
        })} selectedMonthKey={selectedMonth?.monthKey} />
      </Surface>
      <MonthPurchaseDrilldown selectedMonth={selectedMonth} transactions={transactions} themeTokens={themeTokens} fmt={fmt} />
      <Surface>
        <Eyebrow>{pieEyebrow}</Eyebrow>
        <div style={{ height: 12 }} />
        <ExpensePie transactions={transactions} selectedMonth={selectedMonth} range={pieRange} />
      </Surface>
    </div>
  );
};

export const NetWorthPage = () => {
  const { netWorthState, setNetWorthState, themeTokens, savingsTotal, fmt, debtsState, setView } = useAppContext();
  const [editingApt, setEditingApt] = useState(null);
  const [propertyDraft, setPropertyDraft] = useState({ value: '', rent: '', sqm: '' });
  const aptValue  = netWorthState.apartments.reduce((s, a) => s + a.value, 0);
  const motoValue = netWorthState.motorcycle.marketValue;
  // The motorcycle's market value (FIPE) is treated as a pure asset.
  // Triumph financing installments live in the transaction ledger and are
  // already reflected in monthly cash flow, so we do NOT subtract a moto debt
  // here — that would double-count the cost.
  const assets    = aptValue + motoValue + savingsTotal;
  const managed   = debtTotals(debtsState).remaining;
  const equity    = assets - managed;

  const openPropertyEdit = (apt) => {
    setEditingApt(apt);
    setPropertyDraft({
      value: String(apt.value ?? ''),
      rent: String(apt.rent ?? ''),
      sqm: String(apt.sqm ?? ''),
    });
  };

  const savePropertyEdit = () => {
    if (!editingApt) return;
    const value = Number(propertyDraft.value);
    const rent = Number(propertyDraft.rent);
    const sqm = Number(propertyDraft.sqm);
    setNetWorthState((prev) => ({
      ...prev,
      apartments: prev.apartments.map((apt) => apt.id === editingApt.id
        ? {
            ...apt,
            value: Number.isFinite(value) ? value : apt.value,
            rent: Number.isFinite(rent) ? rent : apt.rent,
            sqm: Number.isFinite(sqm) ? sqm : apt.sqm,
          }
        : apt),
    }));
    setEditingApt(null);
  };

  const editButtonStyle = {
    background: 'transparent',
    border: `1px solid ${themeTokens.hairline}`,
    color: themeTokens.textDim,
    padding: '6px 12px', borderRadius: 999,
    fontFamily: 'var(--font-mono)', fontSize: 10,
    letterSpacing: '0.18em', textTransform: 'uppercase',
    cursor: 'pointer',
  };

  const modalInputStyle = {
    width: '100%',
    background: 'transparent',
    border: `1px solid ${themeTokens.hairline}`,
    borderRadius: 8,
    padding: '8px 10px',
    color: themeTokens.text,
    fontFamily: 'var(--font-mono)',
    fontSize: 14,
    outline: 'none',
  };

  return (
    <div style={{ display: 'grid', gap: 24 }}>
      <Surface>
        <Eyebrow>Total Net Worth · Equity</Eyebrow>
        <Display size={84}>{fmt(equity)}</Display>
        <div style={{ marginTop: 12, display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 12 }}>
          <div>
            <div style={{ color: themeTokens.textDim, fontFamily: 'var(--font-mono)', fontSize: 10, letterSpacing: '0.18em', textTransform: 'uppercase' }}>Assets</div>
            <div style={{ color: themeTokens.positive, fontFamily: 'var(--font-mono)', fontSize: 16, marginTop: 4 }}>{fmt(assets)}</div>
          </div>
          <div>
            <div style={{ color: themeTokens.textDim, fontFamily: 'var(--font-mono)', fontSize: 10, letterSpacing: '0.18em', textTransform: 'uppercase' }}>Managed debts</div>
            <div style={{ color: themeTokens.negative, fontFamily: 'var(--font-mono)', fontSize: 16, marginTop: 4 }}>− {fmt(managed)}</div>
          </div>
          <div>
            <div style={{ color: themeTokens.textDim, fontFamily: 'var(--font-mono)', fontSize: 10, letterSpacing: '0.18em', textTransform: 'uppercase' }}>Triumph (FIPE)</div>
            <div style={{ color: themeTokens.text, fontFamily: 'var(--font-mono)', fontSize: 14, marginTop: 4 }}>{fmt(motoValue)}</div>
          </div>
          <div>
            <div style={{ color: themeTokens.textDim, fontFamily: 'var(--font-mono)', fontSize: 10, letterSpacing: '0.18em', textTransform: 'uppercase' }}>Apartments</div>
            <div style={{ color: themeTokens.text, fontFamily: 'var(--font-mono)', fontSize: 14, marginTop: 4 }}>{fmt(aptValue)}</div>
          </div>
        </div>
        <div style={{ marginTop: 16, display: 'flex', gap: 10, flexWrap: 'wrap' }}>
          <button onClick={() => setView('debts')}
            style={{
              padding: '6px 12px', borderRadius: 999,
              border: `1px solid ${themeTokens.hairline2}`, background: 'transparent', color: themeTokens.textDim,
              fontFamily: 'var(--font-mono)', fontSize: 10, letterSpacing: '0.18em', textTransform: 'uppercase',
              cursor: 'pointer',
            }}>Manage debts →</button>
        </div>
      </Surface>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 16 }}>
        {netWorthState.apartments.map((a, i) =>
          <Surface key={a.id} delay={i * 0.08}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12 }}>
              <Eyebrow>{a.name}</Eyebrow>
              <button
                onClick={() => openPropertyEdit(a)}
                aria-label={`Edit ${a.name}`}
                style={editButtonStyle}>
                Edit
              </button>
            </div>
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

      {editingApt && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label={`Edit ${editingApt.name}`}
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 100,
            background: 'rgba(0,0,0,0.55)',
            display: 'grid',
            placeItems: 'center',
            padding: 24,
          }}>
          <Surface style={{ width: 'min(560px, 100%)', maxHeight: '90vh', overflow: 'auto' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12 }}>
              <div>
                <Eyebrow>Edit Property</Eyebrow>
                <Display size={32}>{editingApt.name}</Display>
              </div>
              <button
                onClick={() => setEditingApt(null)}
                aria-label="Close property editor"
                style={editButtonStyle}>
                Close
              </button>
            </div>

            <div style={{ marginTop: 24, display: 'grid', gap: 14 }}>
              <label style={{ display: 'grid', gap: 6 }}>
                <span style={{ fontFamily: 'var(--font-mono)', fontSize: 10, letterSpacing: '0.18em', textTransform: 'uppercase', color: themeTokens.textDim }}>Property market value</span>
                <input
                  type="number"
                  inputMode="decimal"
                  value={propertyDraft.value}
                  onChange={(e) => setPropertyDraft((p) => ({ ...p, value: e.target.value }))}
                  style={modalInputStyle}
                />
              </label>
              <label style={{ display: 'grid', gap: 6 }}>
                <span style={{ fontFamily: 'var(--font-mono)', fontSize: 10, letterSpacing: '0.18em', textTransform: 'uppercase', color: themeTokens.textDim }}>Monthly rent amount</span>
                <input
                  type="number"
                  inputMode="decimal"
                  value={propertyDraft.rent}
                  onChange={(e) => setPropertyDraft((p) => ({ ...p, rent: e.target.value }))}
                  style={modalInputStyle}
                />
              </label>
              <label style={{ display: 'grid', gap: 6 }}>
                <span style={{ fontFamily: 'var(--font-mono)', fontSize: 10, letterSpacing: '0.18em', textTransform: 'uppercase', color: themeTokens.textDim }}>Apartment area (m²)</span>
                <input
                  type="number"
                  inputMode="decimal"
                  value={propertyDraft.sqm}
                  onChange={(e) => setPropertyDraft((p) => ({ ...p, sqm: e.target.value }))}
                  style={modalInputStyle}
                />
              </label>
            </div>

            <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', marginTop: 24 }}>
              <button
                onClick={() => setEditingApt(null)}
                style={editButtonStyle}>
                Cancel
              </button>
              <button
                onClick={savePropertyEdit}
                style={{
                  border: `1px solid ${themeTokens.accent}`,
                  background: themeTokens.accent,
                  color: '#0B0B0D',
                  padding: '8px 14px', borderRadius: 999,
                  fontFamily: 'var(--font-mono)', fontSize: 10,
                  letterSpacing: '0.18em', textTransform: 'uppercase',
                  cursor: 'pointer',
                }}>
                Save
              </button>
            </div>
          </Surface>
        </div>
      )}
    </div>
  );
};

const PAYMENT_METHODS = [
  { id: 'Debit/Cash',        label: 'Debit/Cash',  short: 'D/C',  img: null,                  type: 'debit' },
  { id: 'VISA Mercado Pago', label: 'Mercado Pago', short: 'Visa', img: '/assets/visa.png',   type: 'visa' },
  { id: 'Nubank MasterCard', label: 'Nubank',       short: 'Nu',   img: '/assets/nubank.png', type: 'mastercard' },
];

// Branded chip colors for transaction lists (Dashboard, Ledger, History, etc.)
const PAYMENT_CHIP = {
  'VISA Mercado Pago': { bg: '#1A1F71', label: 'Mercado Pago' }, // classic VISA blue
  'Nubank MasterCard': { bg: '#820AD1', label: 'Nubank' },        // Nubank purple
};

// Branded filter button colors for the Ledger filter strip
const PAYMENT_FILTER_COLOR = {
  'VISA Mercado Pago': '#000000', // Mercado Pago → black
  'Nubank MasterCard': '#820AD1', // Nubank → purple
  'Debit/Cash':        '#0EA47A', // Debit/Cash → green
};

const PaymentChip = ({ method }) => {
  const cfg = PAYMENT_CHIP[method];
  if (!cfg) return <span>{method}</span>;
  return (
    <span style={{
      display: 'inline-block',
      background: cfg.bg, color: '#FFFFFF',
      padding: '2px 8px', borderRadius: 4,
      fontFamily: 'var(--font-mono)', fontSize: 9,
      letterSpacing: '0.18em', textTransform: 'uppercase',
      fontWeight: 600, lineHeight: 1.4,
    }}>{cfg.label}</span>
  );
};

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
      .filter((t) => t.category !== 'Financing')
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
                  letterSpacing: '0.18em', textTransform: 'uppercase', marginTop: 4,
                  display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap',
                }}>
                  <span>{tx.category}</span>
                  {PAYMENT_CHIP[tx.paymentMethod] && <PaymentChip method={tx.paymentMethod} />}
                </div>
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
    transactions, themeTokens, fmt, deleteTransaction, editTransaction, handleClearHistory,
    searchQuery, setSearchQuery, focusTxId, setFocusTxId, dateFilter,
  } = useAppContext();
  const [editingTx, setEditingTx] = useState(null);
  const [cardFilter, setCardFilter] = useState('all');
  const [amountMin, setAmountMin]   = useState('');
  const [amountMax, setAmountMax]   = useState('');
  const [tagFilter, setTagFilter]   = useState([]); // array of selected tags
  const localQ = searchQuery;
  const setLocalQ = setSearchQuery;
  const listRef = useRef(null);

  // Collect all tags currently present in non-financing transactions.
  const allTags = useMemo(() => {
    const set = new Set();
    for (const t of transactions) {
      if (t.category === 'Financing') continue;
      (t.tags || []).forEach((tag) => set.add(tag));
    }
    return Array.from(set).sort();
  }, [transactions]);

  const filtered = useMemo(() => {
    const { from, to } = resolveRange(dateFilter);
    const s = (localQ || '').trim().toLowerCase();
    const min = amountMin === '' ? null : Number(amountMin);
    const max = amountMax === '' ? null : Number(amountMax);
    return transactions.filter((t) => {
      if (t.category === 'Financing') return false;
      if (cardFilter !== 'all' && t.paymentMethod !== cardFilter) return false;
      const d = new Date(t.date);
      if (from && d < from) return false;
      if (to && d > to) return false;
      if (min != null && t.amount < min) return false;
      if (max != null && t.amount > max) return false;
      if (tagFilter.length) {
        const tags = t.tags || [];
        if (!tagFilter.every((tag) => tags.includes(tag))) return false;
      }
      if (!s) return true;
      return (
        (t.description || '').toLowerCase().includes(s) ||
        (t.category || '').toLowerCase().includes(s) ||
        (t.paymentMethod || '').toLowerCase().includes(s) ||
        (t.tags || []).join(' ').toLowerCase().includes(s) ||
        String(t.amount).includes(s)
      );
    });
  }, [transactions, cardFilter, localQ, dateFilter, amountMin, amountMax, tagFilter]);

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
              const brandColor = PAYMENT_FILTER_COLOR[opt.id];
              const isBranded = !!brandColor;
              const bg = isBranded
                ? brandColor
                : (active ? themeTokens.accent : 'transparent');
              const color = isBranded
                ? '#FFFFFF'
                : (active ? '#0B0B0D' : themeTokens.textDim);
              const border = isBranded
                ? brandColor
                : (active ? themeTokens.accent : themeTokens.hairline2);
              return (
                <button key={opt.id} onClick={() => setCardFilter(opt.id)}
                  style={{
                    padding: '6px 12px', borderRadius: 999,
                    border: `1px solid ${border}`,
                    background: bg,
                    color,
                    fontFamily: 'var(--font-mono)', fontSize: 10,
                    letterSpacing: '0.18em', textTransform: 'uppercase',
                    fontWeight: isBranded ? 600 : 400,
                    cursor: 'pointer', transition: 'all 200ms',
                    boxShadow: isBranded && active ? `0 0 0 2px ${themeTokens.accent}` : 'none',
                    opacity: isBranded && !active ? 0.85 : 1,
                  }}>{opt.label}</button>
              );
            })}
          </div>
          <div style={{ flex: 1 }} />
          <RangeFilter />
        </div>
        <div style={{ display: 'flex', gap: 14, alignItems: 'center', flexWrap: 'wrap', marginTop: 12, paddingTop: 12, borderTop: `1px solid ${themeTokens.hairline}` }}>
          <span style={{ color: themeTokens.textDim, fontFamily: 'var(--font-mono)', fontSize: 10, letterSpacing: '0.18em', textTransform: 'uppercase' }}>Amount</span>
          <input type="number" value={amountMin} onChange={(e) => setAmountMin(e.target.value)} placeholder="min"
            style={{ width: 96, background: 'transparent', border: `1px solid ${themeTokens.hairline2}`, borderRadius: 8, padding: '6px 10px', color: themeTokens.text, fontFamily: 'var(--font-mono)', fontSize: 12, outline: 'none' }} />
          <span style={{ color: themeTokens.textDim }}>—</span>
          <input type="number" value={amountMax} onChange={(e) => setAmountMax(e.target.value)} placeholder="max"
            style={{ width: 96, background: 'transparent', border: `1px solid ${themeTokens.hairline2}`, borderRadius: 8, padding: '6px 10px', color: themeTokens.text, fontFamily: 'var(--font-mono)', fontSize: 12, outline: 'none' }} />
          {allTags.length > 0 && (
            <>
              <span style={{ color: themeTokens.textDim, fontFamily: 'var(--font-mono)', fontSize: 10, letterSpacing: '0.18em', textTransform: 'uppercase', marginLeft: 12 }}>Tags</span>
              {allTags.map((tag) => {
                const active = tagFilter.includes(tag);
                return (
                  <button key={tag}
                    onClick={() => setTagFilter((p) => active ? p.filter((x) => x !== tag) : [...p, tag])}
                    style={{
                      padding: '4px 10px', borderRadius: 999,
                      border: `1px solid ${active ? themeTokens.accent : themeTokens.hairline2}`,
                      background: active ? themeTokens.accent : 'transparent',
                      color: active ? '#0B0B0D' : themeTokens.textDim,
                      fontFamily: 'var(--font-mono)', fontSize: 9,
                      letterSpacing: '0.18em', textTransform: 'uppercase',
                      cursor: 'pointer', transition: 'all 200ms',
                    }}>#{tag}</button>
                );
              })}
            </>
          )}
          {(amountMin || amountMax || tagFilter.length > 0) && (
            <button onClick={() => { setAmountMin(''); setAmountMax(''); setTagFilter([]); }}
              style={{ marginLeft: 'auto', background: 'transparent', border: 'none', color: themeTokens.textDim, cursor: 'pointer', fontFamily: 'var(--font-mono)', fontSize: 10, letterSpacing: '0.18em', textTransform: 'uppercase' }}>
              Clear advanced
            </button>
          )}
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
                display: 'grid', gridTemplateColumns: 'auto 1fr auto auto auto', gap: 16, padding: '14px 22px',
                borderBottom: `1px solid ${themeTokens.hairline}`, alignItems: 'center',
                transition: 'background 600ms ease',
              }}>
                <div style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: rowColor, width: 64 }}>
                  {d.toLocaleDateString('en-US', { month: 'short', day: '2-digit' })}
                </div>
                <div>
                  <div style={{ color: future ? '#E0B33B' : themeTokens.text, fontSize: 14 }}>{tx.description}</div>
                  <div style={{ color: themeTokens.textDim, fontFamily: 'var(--font-mono)', fontSize: 10, letterSpacing: '0.18em', textTransform: 'uppercase', marginTop: 4, display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                    <span>{tx.category}</span>
                    {PAYMENT_CHIP[tx.paymentMethod]
                      ? <PaymentChip method={tx.paymentMethod} />
                      : <span>· {tx.paymentMethod}</span>}
                    {tx.locked && <span>· locked</span>}
                  </div>
                </div>
                <div style={{ fontFamily: 'var(--font-mono)', fontSize: 14, color: future ? '#E0B33B' : themeTokens.text, minWidth: 100, textAlign: 'right' }}>
                  {tx.type === 'income' ? '+' : '−'}{fmt(tx.amount)}
                </div>
                <EditBtn locked={tx.locked} onClick={() => setEditingTx(tx)} />
                <TrashBtn locked={tx.locked} onClick={() => { if (confirmDelete('Delete this transaction?')) deleteTransaction(tx.id); }} />
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

      {editingTx && (
        <EditTransactionDialog
          tx={editingTx}
          onClose={() => setEditingTx(null)}
          onSave={(patch) => { editTransaction(editingTx.id, patch); setEditingTx(null); }}
        />
      )}
    </div>
  );
};

const isoDate = (d) => {
  const yy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${yy}-${mm}-${dd}`;
};

// Hidden "View All" page — reachable only from the Dashboard's Recent Activity "View all →" button.
// Mirrors the Ledger filters (payment method + date range) but presents the full purchase list
// without the right-side history sidebar, and offers a Back button to return to the Dashboard.
export const AllTransactionsPage = () => {
  const {
    transactions, themeTokens, fmt, deleteTransaction, editTransaction,
    searchQuery, setSearchQuery, dateFilter, setView,
  } = useAppContext();
  const [cardFilter, setCardFilter] = useState('all');
  const [editingTx, setEditingTx]   = useState(null);
  const localQ = searchQuery;
  const setLocalQ = setSearchQuery;

  const filtered = useMemo(() => {
    const { from, to } = resolveRange(dateFilter);
    const s = (localQ || '').trim().toLowerCase();
    return transactions
      .filter((t) => {
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
      })
      .slice()
      .sort((a, b) => new Date(b.date) - new Date(a.date));
  }, [transactions, cardFilter, localQ, dateFilter]);

  const now = new Date();

  return (
    <div style={{ display: 'grid', gap: 16 }}>
      <Surface>
        <div style={{ display: 'flex', alignItems: 'center', gap: 16, flexWrap: 'wrap' }}>
          <button onClick={() => setView('dashboard')}
            style={{
              padding: '6px 14px', borderRadius: 999,
              border: `1px solid ${themeTokens.hairline2}`,
              background: 'transparent', color: themeTokens.textDim,
              fontFamily: 'var(--font-mono)', fontSize: 10,
              letterSpacing: '0.18em', textTransform: 'uppercase',
              cursor: 'pointer', transition: 'all 200ms',
            }}>← Dashboard</button>
          <div style={{
            fontFamily: 'var(--font-display)', fontSize: 24, fontWeight: 700,
            color: themeTokens.text, letterSpacing: '-0.01em',
          }}>All Purchases</div>
          <div style={{ flex: 1 }} />
          <div style={{
            fontFamily: 'var(--font-mono)', fontSize: 11, color: themeTokens.textDim,
            letterSpacing: '0.18em', textTransform: 'uppercase',
          }}>{filtered.length} entries</div>
        </div>
      </Surface>

      <Surface>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
          <input value={localQ} onChange={(e) => setLocalQ(e.target.value)} placeholder="Search purchases…"
            style={{
              flex: 1, minWidth: 200, background: 'transparent', border: 'none', outline: 'none',
              color: themeTokens.text, fontSize: 18, fontFamily: 'var(--font-body)', fontWeight: 400,
            }} />
        </div>
      </Surface>

      <Surface>
        <div style={{ display: 'flex', gap: 14, alignItems: 'center', flexWrap: 'wrap' }}>
          <Eyebrow>Filters</Eyebrow>
          <div style={{ display: 'flex', gap: 6 }}>
            {[{ id: 'all', label: 'All' }, ...PAYMENT_METHODS.map((m) => ({ id: m.id, label: m.label }))].map((opt) => {
              const active = cardFilter === opt.id;
              const brandColor = PAYMENT_FILTER_COLOR[opt.id];
              const isBranded = !!brandColor;
              const bg = isBranded
                ? brandColor
                : (active ? themeTokens.accent : 'transparent');
              const color = isBranded
                ? '#FFFFFF'
                : (active ? '#0B0B0D' : themeTokens.textDim);
              const border = isBranded
                ? brandColor
                : (active ? themeTokens.accent : themeTokens.hairline2);
              return (
                <button key={opt.id} onClick={() => setCardFilter(opt.id)}
                  style={{
                    padding: '6px 12px', borderRadius: 999,
                    border: `1px solid ${border}`,
                    background: bg,
                    color,
                    fontFamily: 'var(--font-mono)', fontSize: 10,
                    letterSpacing: '0.18em', textTransform: 'uppercase',
                    fontWeight: isBranded ? 600 : 400,
                    cursor: 'pointer', transition: 'all 200ms',
                    boxShadow: isBranded && active ? `0 0 0 2px ${themeTokens.accent}` : 'none',
                    opacity: isBranded && !active ? 0.85 : 1,
                  }}>{opt.label}</button>
              );
            })}
          </div>
          <div style={{ flex: 1 }} />
          <RangeFilter />
        </div>
      </Surface>

      <Surface style={{ padding: 0 }}>
        <div style={{ maxHeight: 760, overflow: 'auto' }}>
          {filtered.map((tx) => {
            const d = new Date(tx.date);
            const future = d > now;
            const rowColor = future ? '#E0B33B' : themeTokens.textDim;
            return (
              <div key={tx.id} style={{
                display: 'grid', gridTemplateColumns: 'auto 1fr auto auto auto', gap: 16, padding: '14px 22px',
                borderBottom: `1px solid ${themeTokens.hairline}`, alignItems: 'center',
              }}>
                <div style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: rowColor, width: 64 }}>
                  {d.toLocaleDateString('en-US', { month: 'short', day: '2-digit' })}
                </div>
                <div>
                  <div style={{ color: future ? '#E0B33B' : themeTokens.text, fontSize: 14 }}>{tx.description}</div>
                  <div style={{ color: themeTokens.textDim, fontFamily: 'var(--font-mono)', fontSize: 10, letterSpacing: '0.18em', textTransform: 'uppercase', marginTop: 4, display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                    <span>{tx.category}</span>
                    {PAYMENT_CHIP[tx.paymentMethod]
                      ? <PaymentChip method={tx.paymentMethod} />
                      : <span>· {tx.paymentMethod}</span>}
                    {tx.locked && <span>· locked</span>}
                  </div>
                </div>
                <div style={{ fontFamily: 'var(--font-mono)', fontSize: 14, color: future ? '#E0B33B' : themeTokens.text, minWidth: 100, textAlign: 'right' }}>
                  {tx.type === 'income' ? '+' : '−'}{fmt(tx.amount)}
                </div>
                <EditBtn locked={tx.locked} onClick={() => setEditingTx(tx)} />
                <TrashBtn locked={tx.locked} onClick={() => { if (confirmDelete('Delete this transaction?')) deleteTransaction(tx.id); }} />
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

      {editingTx && (
        <EditTransactionDialog
          tx={editingTx}
          onClose={() => setEditingTx(null)}
          onSave={(patch) => { editTransaction(editingTx.id, patch); setEditingTx(null); }}
        />
      )}
    </div>
  );
};

export const TransactionsPage = () => {
  const ctx = useAppContext();
  const {
    themeTokens, fmt, addInstallmentPurchase, addSplitPurchase, transactions, importTransactions,
    pickedDate, setPickedDate, activeFormCard, setActiveFormCard,
    rules, addRule, deleteRule, suggestCategory, setView,
  } = ctx;
  const method = activeFormCard;
  const setMethod = setActiveFormCard;
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState(DEFAULT_CATEGORY);
  const [categoryDirty, setCategoryDirty] = useState(false); // true once user picks category manually
  const [amount, setAmount] = useState('');
  const [installments, setInstallments] = useState(1);
  const [importStatus, setImportStatus] = useState('');
  const fileInputRef = useRef(null);
  const jsonInputRef = useRef(null);

  // Split state — when true, replaces single Category+Amount with a multi-leg editor.
  // Initial value is sourced from the Tweaks panel's `defaultSplitMode`.
  const [splitMode, setSplitMode] = useState(ctx.defaultSplitMode || false);
  const [splitLegs, setSplitLegs] = useState([
    { category: DEFAULT_CATEGORY, amount: '' },
    { category: DEFAULT_SPLIT_CATEGORY, amount: '' },
  ]);
  const splitTotal = useMemo(
    () => splitLegs.reduce((s, l) => s + (Number(l.amount) || 0), 0),
    [splitLegs]
  );

  // Tags — comma-separated input parsed into an array.
  const [tagsText, setTagsText] = useState('');
  const parsedTags = useMemo(
    () => tagsText.split(',').map((t) => t.trim()).filter(Boolean),
    [tagsText]
  );

  // Auto-suggest category from description while the user types — but yield
  // to any manual selection (categoryDirty).
  const onDescriptionChange = (next) => {
    setDescription(next);
    if (categoryDirty) return;
    const sug = suggestCategory ? suggestCategory(next) : null;
    if (sug && CATEGORIES.includes(sug)) setCategory(sug);
  };

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

  const handleExportJSON = () => {
    downloadBackup(buildBackupPayload(ctx), { auto: false });
  };

  // Restore individual feature stores from a backup file.
  const restoreFeatureStores = (parsed) => {
    if (!parsed || typeof parsed !== 'object') return 0;
    if (!confirmDelete('Restore from backup? This will REPLACE your current rules, recurring templates, budgets, goals, debts, and reminders.')) {
      return 0;
    }
    let restored = 0;
    if (Array.isArray(parsed.rules)) {
      // Replace rules wholesale: delete current then add.
      (ctx.rules || []).slice().forEach((r) => ctx.deleteRule(r.id));
      parsed.rules.forEach((r) => { if (r && r.match) { ctx.addRule({ match: r.match, category: r.category }); restored++; } });
    }
    if (Array.isArray(parsed.recurring)) {
      (ctx.recurring || []).slice().forEach((r) => ctx.deleteRecurring(r.id));
      parsed.recurring.forEach((r) => { if (r && r.description) { ctx.addRecurring({ ...r, id: undefined }); restored++; } });
    }
    if (parsed.budgets && typeof parsed.budgets === 'object') {
      Object.keys(ctx.budgets || {}).forEach((k) => ctx.removeBudget(k));
      Object.entries(parsed.budgets).forEach(([k, v]) => { if (k && Number(v) > 0) { ctx.setBudget(k, Number(v)); restored++; } });
    }
    if (Array.isArray(parsed.goals)) {
      (ctx.goals || []).slice().forEach((g) => ctx.deleteGoal(g.id));
      parsed.goals.forEach((g) => { if (g && g.name) { ctx.addGoal({ ...g, id: undefined }); restored++; } });
    }
    if (Array.isArray(parsed.debts)) {
      (ctx.debtsState || []).slice().forEach((d) => ctx.deleteDebt(d.id));
      parsed.debts.forEach((d) => { if (d && d.name) { ctx.addDebt({ ...d, id: undefined }); restored++; } });
    }
    if (Array.isArray(parsed.reminders)) {
      (ctx.reminders || []).slice().forEach((r) => ctx.deleteReminder(r.id));
      parsed.reminders.forEach((r) => { if (r && r.label && r.date) { ctx.addReminder({ ...r, id: undefined }); restored++; } });
    }
    return restored;
  };

  const handleImportFile = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const { rows, skipped } = parseTransactionsCSV(String(reader.result || ''));
        const result = importTransactions(rows);
        const parts = [`Imported ${result.added} row${result.added === 1 ? '' : 's'}`];
        if (skipped)            parts.push(`${skipped} parse-skipped`);
        if (result.invalid)     parts.push(`${result.invalid} invalid`);
        if (result.duplicates)  parts.push(`${result.duplicates} duplicate${result.duplicates === 1 ? '' : 's'}`);
        setImportStatus(parts.join(' · '));
      } catch (err) {
        setImportStatus(`Import failed: ${err.message}`);
      }
      e.target.value = '';
    };
    reader.readAsText(file);
  };

  const handleImportJSON = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const parsed = JSON.parse(String(reader.result || ''));
        const list = Array.isArray(parsed) ? parsed : Array.isArray(parsed?.transactions) ? parsed.transactions : null;
        if (!list) throw new Error('Expected an array of transactions or { transactions: [...] }');
        let skipped = 0;
        const rows = list.map((r) => {
          if (!r || !r.date || !r.amount || !r.description) { skipped++; return null; }
          const d = new Date(r.date);
          if (isNaN(d.getTime())) { skipped++; return null; }
          const amt = Number(r.amount);
          if (!isFinite(amt)) { skipped++; return null; }
          return {
            id: r.id || `tx-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
            date: d.toISOString(),
            type: r.type === 'income' ? 'income' : 'expense',
            amount: amt,
            description: r.description,
            category: r.category || 'Others',
            paymentMethod: r.paymentMethod || 'Bank Transfer',
            tags: Array.isArray(r.tags) ? r.tags : [],
          };
        }).filter(Boolean);
        const result = importTransactions(rows);
        // If this is a full backup (schema = aurum.fullbackup.v1 OR any feature
        // arrays exist on the payload), also restore feature stores.
        const extras = parsed && (parsed.schema === 'aurum.fullbackup.v1' ||
          parsed.rules || parsed.recurring || parsed.budgets || parsed.goals ||
          parsed.debts || parsed.reminders)
          ? restoreFeatureStores(parsed) : 0;
        const parts = [`Imported ${result.added} JSON row${result.added === 1 ? '' : 's'}`];
        if (skipped)            parts.push(`${skipped} parse-skipped`);
        if (result.invalid)     parts.push(`${result.invalid} invalid`);
        if (result.duplicates)  parts.push(`${result.duplicates} duplicate${result.duplicates === 1 ? '' : 's'}`);
        if (extras > 0)         parts.push(`restored ${extras} setting${extras === 1 ? '' : 's'}`);
        setImportStatus(parts.join(' · '));
      } catch (err) {
        setImportStatus(`JSON import failed: ${err.message}`);
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
    .slice()
    .sort((a, b) => new Date(b.date) - new Date(a.date))
    .slice(0, 6);

  const [formErrors, setFormErrors] = useState({});

  const submit = () => {
    setFormErrors({});
    if (splitMode) {
      if (!description) { setFormErrors({ description: 'Description is required.' }); return; }
      const legs = splitLegs.filter((l) => Number(l.amount) > 0 && l.category)
        .map((l) => ({ ...l, tags: parsedTags }));
      if (!legs.length) { setFormErrors({ amount: 'Add at least one leg with an amount greater than zero.' }); return; }
      const res = addSplitPurchase({ description, paymentMethod: method, date: pickedDate, legs });
      if (res && res.ok === false) { setFormErrors(res.errors || {}); return; }
      setDescription(''); setTagsText('');
      setSplitLegs([{ category: DEFAULT_CATEGORY, amount: '' }, { category: DEFAULT_SPLIT_CATEGORY, amount: '' }]);
      setCategoryDirty(false);
      return;
    }
    const res = addInstallmentPurchase({
      description, category, amount: Number(amount),
      paymentMethod: method, firstDate: pickedDate, installments,
      tags: parsedTags,
    });
    if (res && res.ok === false) { setFormErrors(res.errors || {}); return; }
    setDescription(''); setAmount(''); setTagsText(''); setCategoryDirty(false);
  };

  const inputStyle = {
    width: '100%', background: 'transparent',
    border: `1px solid ${themeTokens.hairline2}`,
    borderRadius: 10, padding: '10px 12px',
    color: themeTokens.text, fontSize: 14, fontFamily: 'var(--font-body)',
    outline: 'none',
  };
  const errorInputStyle = {
    ...inputStyle,
    border: `1px solid ${themeTokens.negative}`,
    boxShadow: `0 0 0 3px ${themeTokens.negative}22`,
  };
  const fieldError = (key) => formErrors[key] ? (
    <div style={{
      marginTop: 4,
      color: themeTokens.negative,
      fontFamily: 'var(--font-mono)',
      fontSize: 10, letterSpacing: '0.12em', textTransform: 'uppercase',
    }}>{formErrors[key]}</div>
  ) : null;
  const fieldStyle = (key) => formErrors[key] ? errorInputStyle : inputStyle;

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
          {portabilityBtn('Export JSON', handleExportJSON)}
          {portabilityBtn('Import CSV', () => fileInputRef.current?.click(), true)}
          {portabilityBtn('Import JSON', () => jsonInputRef.current?.click())}
          <input ref={fileInputRef} type="file" accept=".csv,text/csv" onChange={handleImportFile} style={{ display: 'none' }} />
          <input ref={jsonInputRef} type="file" accept=".json,application/json" onChange={handleImportJSON} style={{ display: 'none' }} />
          {importStatus && (
            <div style={{ width: '100%', color: themeTokens.textDim, fontFamily: 'var(--font-mono)', fontSize: 11, letterSpacing: '0.18em', textTransform: 'uppercase' }}>
              {importStatus}
            </div>
          )}
        </div>
      </Surface>

      <Surface>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
          <Eyebrow>Subscriptions</Eyebrow>
          <span style={{ color: themeTokens.textDim, fontSize: 12, fontFamily: 'var(--font-mono)' }}>
            Recurring monthly templates auto-add to your ledger.
          </span>
          <div style={{ flex: 1 }} />
          <button onClick={() => setView('subscriptions')}
            style={{
              padding: '8px 16px', borderRadius: 999,
              border: `1px solid ${themeTokens.accent}`,
              background: 'transparent', color: themeTokens.accent,
              fontFamily: 'var(--font-mono)', fontSize: 10,
              letterSpacing: '0.18em', textTransform: 'uppercase',
              cursor: 'pointer', transition: 'all 200ms',
            }}>Manage subscriptions →</button>
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
            <input value={description} onChange={(e) => onDescriptionChange(e.target.value)}
              placeholder="e.g. New monitor" style={fieldStyle('description')} />
            {fieldError('description')}
          </div>

          <label style={{ display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer', userSelect: 'none' }}>
            <input type="checkbox" checked={splitMode} onChange={(e) => setSplitMode(e.target.checked)}
              style={{ width: 16, height: 16, accentColor: themeTokens.accent, cursor: 'pointer' }} />
            <span style={{
              fontFamily: 'var(--font-mono)', fontSize: 11, letterSpacing: '0.18em',
              textTransform: 'uppercase', color: themeTokens.textDim,
            }}>Split across categories</span>
          </label>

          {splitMode ? (
            <div style={{ display: 'grid', gap: 10 }}>
              {splitLegs.map((leg, idx) => (
                <div key={idx} style={{ display: 'grid', gridTemplateColumns: '1fr 130px auto', gap: 10, alignItems: 'end' }}>
                  <div>
                    {idx === 0 && <Label tk={themeTokens}>Category</Label>}
                    <select value={leg.category}
                      onChange={(e) => setSplitLegs((p) => p.map((l, i) => i === idx ? { ...l, category: e.target.value } : l))}
                      style={{ ...inputStyle, cursor: 'pointer' }}>
                      {CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
                    </select>
                  </div>
                  <div>
                    {idx === 0 && <Label tk={themeTokens}>Amount</Label>}
                    <input type="number" inputMode="decimal" value={leg.amount}
                      onChange={(e) => setSplitLegs((p) => p.map((l, i) => i === idx ? { ...l, amount: e.target.value } : l))}
                      placeholder="0.00" style={{ ...inputStyle, fontFamily: 'var(--font-mono)' }} />
                  </div>
                  <button onClick={() => setSplitLegs((p) => p.length > 1 ? p.filter((_, i) => i !== idx) : p)}
                    disabled={splitLegs.length <= 1}
                    style={{
                      background: 'transparent', border: `1px solid ${themeTokens.hairline2}`,
                      color: themeTokens.textDim, borderRadius: 999, padding: '8px 12px',
                      fontFamily: 'var(--font-mono)', fontSize: 10,
                      letterSpacing: '0.18em', textTransform: 'uppercase',
                      cursor: splitLegs.length <= 1 ? 'not-allowed' : 'pointer',
                      opacity: splitLegs.length <= 1 ? 0.4 : 1,
                    }}>Remove</button>
                </div>
              ))}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 10 }}>
                <button onClick={() => setSplitLegs((p) => [...p, { category: DEFAULT_CATEGORY, amount: '' }])}
                  style={{
                    background: 'transparent', border: `1px solid ${themeTokens.hairline2}`,
                    color: themeTokens.accent, borderRadius: 999, padding: '8px 14px',
                    fontFamily: 'var(--font-mono)', fontSize: 10,
                    letterSpacing: '0.18em', textTransform: 'uppercase', cursor: 'pointer',
                  }}>+ Add leg</button>
                <div style={{ color: themeTokens.textDim, fontFamily: 'var(--font-mono)', fontSize: 12 }}>
                  Total: <span style={{ color: themeTokens.text }}>{fmt(splitTotal)}</span>
                </div>
              </div>
            </div>
          ) : (
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <div>
              <Label tk={themeTokens}>Amount (R$)</Label>
              <input type="number" inputMode="decimal" value={amount} onChange={(e) => setAmount(e.target.value)}
                placeholder="0.00" style={{ ...fieldStyle('amount'), fontFamily: 'var(--font-mono)' }} />
              {fieldError('amount')}
            </div>
            <div>
              <Label tk={themeTokens}>Category</Label>
              <select
                value={category}
                onChange={(e) => { setCategory(e.target.value); setCategoryDirty(true); }}
                style={{
                  ...fieldStyle('category'),
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
              {fieldError('category')}
            </div>
          </div>
          )}

          {!splitMode && (
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
          )}

          <div>
            <Label tk={themeTokens}>Tags (comma-separated, optional)</Label>
            <input value={tagsText} onChange={(e) => setTagsText(e.target.value)}
              placeholder="e.g. vacation, work" style={inputStyle} />
            {parsedTags.length > 0 && (
              <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginTop: 6 }}>
                {parsedTags.map((t) => (
                  <span key={t} style={{
                    background: themeTokens.surface2, color: themeTokens.accent,
                    fontFamily: 'var(--font-mono)', fontSize: 9, padding: '3px 8px',
                    borderRadius: 4, letterSpacing: '0.18em', textTransform: 'uppercase',
                  }}>#{t}</span>
                ))}
              </div>
            )}
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <div>
              <Label tk={themeTokens}>First payment</Label>
              <input type="date" value={pickedDate} onChange={(e) => setPickedDate(e.target.value)}
                style={{ ...fieldStyle('date'), fontFamily: 'var(--font-mono)', colorScheme: 'dark' }} />
              {fieldError('date')}
            </div>
            <div>
              <Label tk={themeTokens}>Last payment</Label>
              <input type="date" value={lastDate} readOnly
                style={{ ...inputStyle, fontFamily: 'var(--font-mono)', colorScheme: 'dark', opacity: 0.7 }} />
            </div>
          </div>

          {Object.keys(formErrors).length > 0 && (
            <div style={{
              padding: '10px 12px', borderRadius: 10,
              border: `1px solid ${themeTokens.negative}55`,
              background: `${themeTokens.negative}12`,
              color: themeTokens.negative,
              fontFamily: 'var(--font-body)', fontSize: 12, lineHeight: 1.5,
            }}>
              {Object.values(formErrors).map((m, i) => <div key={i}>· {m}</div>)}
            </div>
          )}

          <button onClick={submit}
            disabled={!description || (!splitMode && !amount)}
            style={{
              marginTop: 4, padding: '14px 22px',
              border: 'none', borderRadius: 999,
              background: themeTokens.accent, color: '#0B0B0D',
              fontFamily: 'var(--font-body)', fontWeight: 700,
              fontSize: 12, letterSpacing: '0.18em', textTransform: 'uppercase',
              cursor: (!description || (!splitMode && !amount)) ? 'not-allowed' : 'pointer',
              opacity: (!description || (!splitMode && !amount)) ? 0.5 : 1,
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
                <div style={{ color: themeTokens.textDim, fontFamily: 'var(--font-mono)', fontSize: 10, letterSpacing: '0.18em', textTransform: 'uppercase', marginTop: 4, display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                  <span>{tx.category}</span>
                  {PAYMENT_CHIP[tx.paymentMethod]
                    ? <PaymentChip method={tx.paymentMethod} />
                    : <span>· {tx.paymentMethod}</span>}
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

      <RulesEditor rules={rules} addRule={addRule} deleteRule={deleteRule}
        themeTokens={themeTokens} inputStyle={inputStyle} />
    </div>
  );
};

// Auto-categorization rules editor — list + add row.
const RulesEditor = ({ rules, addRule, deleteRule, themeTokens, inputStyle }) => {
  const [match, setMatch]       = useState('');
  const [category, setCategory] = useState(DEFAULT_CATEGORY);
  const add = () => {
    const m = match.trim();
    if (!m) return;
    addRule({ match: m, category });
    setMatch('');
  };
  return (
    <Surface>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
        <Eyebrow>Auto-categorization rules</Eyebrow>
        <span style={{ color: themeTokens.textDim, fontSize: 12, fontFamily: 'var(--font-mono)' }}>
          {rules.length} rule{rules.length === 1 ? '' : 's'}
        </span>
      </div>
      <div style={{ height: 12 }} />
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 200px auto', gap: 10, alignItems: 'end' }}>
        <div>
          <Label tk={themeTokens}>Match (substring, case-insensitive)</Label>
          <input value={match} onChange={(e) => setMatch(e.target.value)}
            placeholder="e.g. Uber" style={inputStyle}
            onKeyDown={(e) => { if (e.key === 'Enter') add(); }} />
        </div>
        <div>
          <Label tk={themeTokens}>Category</Label>
          <select value={category} onChange={(e) => setCategory(e.target.value)}
            style={{
              ...inputStyle, appearance: 'none', WebkitAppearance: 'none', MozAppearance: 'none',
              paddingRight: 32, cursor: 'pointer',
            }}>
            {CATEGORIES.map((c) => (
              <option key={c} value={c} style={{ background: themeTokens.surface, color: themeTokens.text }}>{c}</option>
            ))}
          </select>
        </div>
        <button onClick={add} disabled={!match.trim()}
          style={{
            padding: '12px 18px', border: 'none', borderRadius: 999,
            background: themeTokens.accent, color: '#0B0B0D',
            fontFamily: 'var(--font-body)', fontWeight: 700, fontSize: 11,
            letterSpacing: '0.18em', textTransform: 'uppercase',
            cursor: match.trim() ? 'pointer' : 'not-allowed', opacity: match.trim() ? 1 : 0.5,
            transition: 'all 200ms', whiteSpace: 'nowrap',
          }}>Add rule</button>
      </div>
      {rules.length > 0 && (
        <div style={{ marginTop: 16, borderTop: `1px solid ${themeTokens.hairline}` }}>
          {rules.map((r) => (
            <div key={r.id} style={{
              display: 'grid', gridTemplateColumns: '1fr 200px auto', gap: 10,
              alignItems: 'center', padding: '10px 0',
              borderBottom: `1px solid ${themeTokens.hairline}`,
            }}>
              <div style={{ color: themeTokens.text, fontSize: 13 }}>
                When description contains <strong style={{ color: themeTokens.accent }}>{r.match}</strong>
              </div>
              <div style={{ color: themeTokens.textDim, fontFamily: 'var(--font-mono)', fontSize: 11, letterSpacing: '0.18em', textTransform: 'uppercase' }}>
                → {r.category}
              </div>
              <button onClick={() => { if (confirmDelete(`Delete the rule "${r.match}" → ${r.category}?`)) deleteRule(r.id); }}
                style={{
                  background: 'transparent', border: 'none',
                  color: themeTokens.textDim, cursor: 'pointer',
                  fontFamily: 'var(--font-mono)', fontSize: 10,
                  letterSpacing: '0.18em', textTransform: 'uppercase',
                }}>Remove</button>
            </div>
          ))}
        </div>
      )}
    </Surface>
  );
};

// Subscriptions / Recurring transactions — hidden view reached from a button on Transactions.
export const SubscriptionsPage = () => {
  const {
    themeTokens, fmt, recurring, addRecurring, updateRecurring, deleteRecurring, setView,
  } = useAppContext();
  const [description, setDescription] = useState('');
  const [amount, setAmount]           = useState('');
  const [category, setCategory]       = useState(DEFAULT_CATEGORY);
  const [paymentMethod, setPaymentMethod] = useState('Bank Transfer');
  const [type, setType]               = useState('expense');
  const [dayOfMonth, setDayOfMonth]   = useState(5);

  const inputStyle = {
    width: '100%', background: 'transparent',
    border: `1px solid ${themeTokens.hairline2}`, borderRadius: 10,
    padding: '10px 14px', color: themeTokens.text,
    fontFamily: 'var(--font-body)', fontSize: 14, outline: 'none',
  };

  const submit = () => {
    if (!description || !amount) return;
    addRecurring({
      description,
      amount: Number(amount),
      category,
      paymentMethod,
      type,
      dayOfMonth: Math.max(1, Math.min(28, Number(dayOfMonth) || 1)),
    });
    setDescription(''); setAmount('');
  };

  return (
    <div style={{ display: 'grid', gap: 16 }}>
      <Surface>
        <div style={{ display: 'flex', alignItems: 'center', gap: 16, flexWrap: 'wrap' }}>
          <button onClick={() => setView('transactions')}
            style={{
              padding: '6px 14px', borderRadius: 999,
              border: `1px solid ${themeTokens.hairline2}`,
              background: 'transparent', color: themeTokens.textDim,
              fontFamily: 'var(--font-mono)', fontSize: 10,
              letterSpacing: '0.18em', textTransform: 'uppercase',
              cursor: 'pointer', transition: 'all 200ms',
            }}>← Transactions</button>
          <div style={{
            fontFamily: 'var(--font-display)', fontSize: 24, fontWeight: 700,
            color: themeTokens.text, letterSpacing: '-0.01em',
          }}>Subscriptions & Recurring</div>
          <div style={{ flex: 1 }} />
          <div style={{ color: themeTokens.textDim, fontSize: 12, fontFamily: 'var(--font-mono)' }}>
            {recurring.length} template{recurring.length === 1 ? '' : 's'}
          </div>
        </div>
      </Surface>

      <Surface>
        <Eyebrow>New recurring template</Eyebrow>
        <div style={{ height: 12 }} />
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 140px 1fr 1fr', gap: 12, alignItems: 'end' }}>
          <div>
            <Label tk={themeTokens}>Description</Label>
            <input value={description} onChange={(e) => setDescription(e.target.value)}
              placeholder="e.g. Netflix" style={inputStyle} />
          </div>
          <div>
            <Label tk={themeTokens}>Amount</Label>
            <input type="number" value={amount} onChange={(e) => setAmount(e.target.value)}
              placeholder="0.00" style={{ ...inputStyle, fontFamily: 'var(--font-mono)' }} />
          </div>
          <div>
            <Label tk={themeTokens}>Category</Label>
            <select value={category} onChange={(e) => setCategory(e.target.value)} style={{ ...inputStyle, cursor: 'pointer' }}>
              {CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>
          <div>
            <Label tk={themeTokens}>Payment method</Label>
            <select value={paymentMethod} onChange={(e) => setPaymentMethod(e.target.value)} style={{ ...inputStyle, cursor: 'pointer' }}>
              <option value="Bank Transfer">Bank Transfer</option>
              <option value="Debit/Cash">Debit/Cash</option>
              <option value="VISA Mercado Pago">Mercado Pago</option>
              <option value="Nubank MasterCard">Nubank</option>
            </select>
          </div>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '160px 160px auto', gap: 12, alignItems: 'end', marginTop: 12 }}>
          <div>
            <Label tk={themeTokens}>Type</Label>
            <select value={type} onChange={(e) => setType(e.target.value)} style={{ ...inputStyle, cursor: 'pointer' }}>
              <option value="expense">Expense</option>
              <option value="income">Income</option>
            </select>
          </div>
          <div>
            <Label tk={themeTokens}>Day of month (1–28)</Label>
            <input type="number" min="1" max="28" value={dayOfMonth} onChange={(e) => setDayOfMonth(e.target.value)}
              style={{ ...inputStyle, fontFamily: 'var(--font-mono)' }} />
          </div>
          <button onClick={submit} disabled={!description || !amount}
            style={{
              padding: '12px 18px', border: 'none', borderRadius: 999,
              background: themeTokens.accent, color: '#0B0B0D',
              fontFamily: 'var(--font-body)', fontWeight: 700, fontSize: 11,
              letterSpacing: '0.18em', textTransform: 'uppercase',
              cursor: (!description || !amount) ? 'not-allowed' : 'pointer',
              opacity: (!description || !amount) ? 0.5 : 1,
              transition: 'all 200ms', whiteSpace: 'nowrap',
            }}>Add template</button>
        </div>
      </Surface>

      <Surface style={{ padding: 0 }}>
        {recurring.length === 0 ? (
          <div style={{ padding: 32, textAlign: 'center', color: themeTokens.textDim, fontSize: 13 }}>
            No subscriptions yet. Add one above to auto-add it each month.
          </div>
        ) : (
          recurring.map((r) => (
            <div key={r.id} style={{
              display: 'grid', gridTemplateColumns: '1fr 100px 100px 110px auto auto', gap: 14,
              padding: '14px 22px', alignItems: 'center',
              borderBottom: `1px solid ${themeTokens.hairline}`,
            }}>
              <div>
                <div style={{ color: themeTokens.text, fontSize: 14 }}>{r.description}</div>
                <div style={{ color: themeTokens.textDim, fontFamily: 'var(--font-mono)', fontSize: 10, letterSpacing: '0.18em', textTransform: 'uppercase', marginTop: 4 }}>
                  {r.category} · {r.paymentMethod}
                </div>
              </div>
              <div style={{ color: r.type === 'income' ? themeTokens.positive : themeTokens.text, fontFamily: 'var(--font-mono)', fontSize: 13, textAlign: 'right' }}>
                {r.type === 'income' ? '+' : '−'}{fmt(Number(r.amount) || 0)}
              </div>
              <div style={{ color: themeTokens.textDim, fontFamily: 'var(--font-mono)', fontSize: 11, letterSpacing: '0.18em', textTransform: 'uppercase' }}>
                Day {r.dayOfMonth}
              </div>
              <div style={{ color: themeTokens.textFaint, fontFamily: 'var(--font-mono)', fontSize: 10, letterSpacing: '0.18em', textTransform: 'uppercase' }}>
                {r.lastFiredKey ? `Last: ${r.lastFiredKey}` : 'Not fired yet'}
              </div>
              <button onClick={() => updateRecurring(r.id, { lastFiredKey: '' })}
                title="Reset last-fired key so it will fire again this month"
                style={{
                  background: 'transparent', border: `1px solid ${themeTokens.hairline2}`, color: themeTokens.textDim,
                  borderRadius: 999, padding: '6px 10px', fontFamily: 'var(--font-mono)', fontSize: 10,
                  letterSpacing: '0.18em', textTransform: 'uppercase', cursor: 'pointer',
                }}>Re-fire</button>
              <button onClick={() => { if (confirmDelete(`Delete the recurring template "${r.description}"?`)) deleteRecurring(r.id); }}
                style={{
                  background: 'transparent', border: 'none', color: themeTokens.negative, cursor: 'pointer',
                  fontFamily: 'var(--font-mono)', fontSize: 10,
                  letterSpacing: '0.18em', textTransform: 'uppercase',
                }}>Remove</button>
            </div>
          ))
        )}
      </Surface>
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

const PencilIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor"
    strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
    <path d="M12 20h9" />
    <path d="M16.5 3.5a2.121 2.121 0 1 1 3 3L7 19l-4 1 1-4 12.5-12.5z" />
  </svg>
);

const EditBtn = ({ onClick, locked }) => (
  <button onClick={(e) => { e.stopPropagation(); if (!locked) onClick?.(); }}
    disabled={locked}
    aria-label="Edit transaction"
    title={locked ? 'Locked entry — cannot edit' : 'Edit'}
    style={{
      width: 28, height: 28, padding: 0,
      border: 'none', borderRadius: 8,
      background: 'transparent',
      color: locked ? 'rgba(180,180,180,0.25)' : '#9CA3AF',
      cursor: locked ? 'not-allowed' : 'pointer',
      display: 'grid', placeItems: 'center',
      transition: 'background 160ms, color 160ms',
    }}
    onMouseEnter={(e) => { if (!locked) { e.currentTarget.style.background = 'rgba(180,180,180,0.12)'; e.currentTarget.style.color = '#E5E7EB'; } }}
    onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = locked ? 'rgba(180,180,180,0.25)' : '#9CA3AF'; }}>
    <PencilIcon />
  </button>
);

// Modal dialog for editing a transaction in place.
const EditTransactionDialog = ({ tx, onClose, onSave }) => {
  const { themeTokens, fmt } = useAppContext();
  const [description, setDescription] = useState(tx?.description || '');
  const [amount, setAmount]           = useState(tx?.amount != null ? String(tx.amount) : '');
  const [category, setCategory]       = useState(tx?.category || DEFAULT_CATEGORY);
  const [paymentMethod, setPaymentMethod] = useState(tx?.paymentMethod || 'Bank Transfer');
  const [type, setType]               = useState(tx?.type || 'expense');
  const [date, setDate]               = useState(() => {
    const d = tx?.date ? new Date(tx.date) : new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  });
  const [tagsText, setTagsText]       = useState((tx?.tags || []).join(', '));

  const inputStyle = {
    width: '100%', background: 'transparent',
    border: `1px solid ${themeTokens.hairline2}`, borderRadius: 10,
    padding: '10px 14px', color: themeTokens.text, fontFamily: 'var(--font-body)', fontSize: 14, outline: 'none',
  };

  if (!tx) return null;
  const save = () => {
    if (!description) return;
    const tags = tagsText.split(',').map((t) => t.trim()).filter(Boolean);
    onSave({ description, amount: Number(amount) || 0, category, paymentMethod, date, type, tags });
  };

  return (
    <div onClick={onClose}
      style={{
        position: 'fixed', inset: 0, zIndex: 200,
        background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(6px)',
        display: 'grid', placeItems: 'center', padding: 24,
      }}>
      <div onClick={(e) => e.stopPropagation()}
        style={{
          background: themeTokens.surface,
          border: `1px solid ${themeTokens.hairline}`,
          borderRadius: 18, padding: 28,
          width: 'min(560px, 100%)',
          maxHeight: '90vh', overflow: 'auto',
          boxShadow: '0 30px 70px rgba(0,0,0,0.5)',
        }}>
        <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', marginBottom: 16 }}>
          <Eyebrow>Edit transaction</Eyebrow>
          <button onClick={onClose}
            style={{ background: 'transparent', border: 'none', color: themeTokens.textDim, cursor: 'pointer', fontFamily: 'var(--font-mono)', fontSize: 11, letterSpacing: '0.18em', textTransform: 'uppercase' }}>
            Close ×
          </button>
        </div>
        <div style={{ display: 'grid', gap: 12 }}>
          <div>
            <Label tk={themeTokens}>Description</Label>
            <input value={description} onChange={(e) => setDescription(e.target.value)} style={inputStyle} />
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <div>
              <Label tk={themeTokens}>Amount (R$)</Label>
              <input type="number" value={amount} onChange={(e) => setAmount(e.target.value)}
                style={{ ...inputStyle, fontFamily: 'var(--font-mono)' }} />
            </div>
            <div>
              <Label tk={themeTokens}>Type</Label>
              <select value={type} onChange={(e) => setType(e.target.value)} style={{ ...inputStyle, cursor: 'pointer' }}>
                <option value="expense">Expense</option>
                <option value="income">Income</option>
              </select>
            </div>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <div>
              <Label tk={themeTokens}>Category</Label>
              <select value={category} onChange={(e) => setCategory(e.target.value)} style={{ ...inputStyle, cursor: 'pointer' }}>
                {CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
            <div>
              <Label tk={themeTokens}>Payment method</Label>
              <select value={paymentMethod} onChange={(e) => setPaymentMethod(e.target.value)} style={{ ...inputStyle, cursor: 'pointer' }}>
                <option value="Bank Transfer">Bank Transfer</option>
                <option value="Debit/Cash">Debit/Cash</option>
                <option value="VISA Mercado Pago">Mercado Pago</option>
                <option value="Nubank MasterCard">Nubank</option>
              </select>
            </div>
          </div>
          <div>
            <Label tk={themeTokens}>Date</Label>
            <input type="date" value={date} onChange={(e) => setDate(e.target.value)}
              style={{ ...inputStyle, fontFamily: 'var(--font-mono)', colorScheme: 'dark' }} />
          </div>
          <div>
            <Label tk={themeTokens}>Tags (comma-separated)</Label>
            <input value={tagsText} onChange={(e) => setTagsText(e.target.value)} style={inputStyle} />
          </div>
        </div>
        <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', marginTop: 18 }}>
          <button onClick={onClose}
            style={{
              padding: '10px 18px', borderRadius: 999,
              border: `1px solid ${themeTokens.hairline2}`, background: 'transparent', color: themeTokens.textDim,
              fontFamily: 'var(--font-mono)', fontSize: 11, letterSpacing: '0.18em', textTransform: 'uppercase',
              cursor: 'pointer',
            }}>Cancel</button>
          <button onClick={save} disabled={!description}
            style={{
              padding: '10px 20px', border: 'none', borderRadius: 999,
              background: themeTokens.accent, color: '#0B0B0D',
              fontFamily: 'var(--font-body)', fontWeight: 700, fontSize: 11,
              letterSpacing: '0.18em', textTransform: 'uppercase',
              cursor: description ? 'pointer' : 'not-allowed',
              opacity: description ? 1 : 0.5,
            }}>Save</button>
        </div>
      </div>
    </div>
  );
};

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

// Multi-savings-goal manager. Replaces the hardcoded single goal with a list of
// user-defined goals. Each goal has a target and an allocated portion of the
// global savingsTotal. The unallocated remainder is shown so the user can see
// the gap.
export const GoalsPage = () => {
  const {
    goals, addGoal, updateGoal, deleteGoal,
    savingsTotal, addSaving, themeTokens, fmt,
  } = useAppContext();
  const [editingId, setEditingId] = useState(null);
  const [newName, setNewName]     = useState('');
  const [newTarget, setNewTarget] = useState('');
  const [newDue, setNewDue]       = useState('');
  const [depositAmt, setDepositAmt] = useState('');

  const totalAllocated = goals.reduce((s, g) => s + (Number(g.allocated) || 0), 0);
  const unallocated    = Math.max(0, savingsTotal - totalAllocated);

  const inputStyle = {
    width: '100%', background: 'transparent',
    border: `1px solid ${themeTokens.hairline2}`, borderRadius: 10,
    padding: '10px 14px', color: themeTokens.text, fontFamily: 'var(--font-body)', fontSize: 14, outline: 'none',
  };

  const submitNew = () => {
    if (!newName || !newTarget) return;
    addGoal({ name: newName, target: Number(newTarget), due: newDue || null, allocated: 0 });
    setNewName(''); setNewTarget(''); setNewDue('');
  };

  const allocate = (g, delta) => {
    // Constrain: allocated >= 0 and totalAllocated + delta <= savingsTotal
    const curr = Number(g.allocated) || 0;
    const next = Math.max(0, curr + delta);
    const newTotal = totalAllocated - curr + next;
    if (newTotal > savingsTotal + 0.001) return;
    updateGoal(g.id, { allocated: next });
  };

  return (
    <div style={{ display: 'grid', gap: 24 }}>
      <Surface>
        <div style={{ display: 'flex', alignItems: 'baseline', gap: 16, flexWrap: 'wrap' }}>
          <div>
            <Eyebrow>Savings · Total balance</Eyebrow>
            <div style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 42, color: themeTokens.text, letterSpacing: '-0.02em', marginTop: 4 }}>
              {fmt(savingsTotal)}
            </div>
          </div>
          <div style={{ marginLeft: 'auto', textAlign: 'right' }}>
            <div style={{ fontFamily: 'var(--font-mono)', fontSize: 10, letterSpacing: '0.18em', textTransform: 'uppercase', color: themeTokens.textDim }}>
              Allocated
            </div>
            <div style={{ fontFamily: 'var(--font-mono)', fontSize: 16, color: themeTokens.text, marginTop: 2 }}>
              {fmt(totalAllocated)}
            </div>
            <div style={{ fontFamily: 'var(--font-mono)', fontSize: 10, letterSpacing: '0.18em', textTransform: 'uppercase', color: themeTokens.textDim, marginTop: 8 }}>
              Unallocated
            </div>
            <div style={{ fontFamily: 'var(--font-mono)', fontSize: 16, color: themeTokens.accent, marginTop: 2 }}>
              {fmt(unallocated)}
            </div>
          </div>
        </div>

        <div style={{ marginTop: 16, paddingTop: 16, borderTop: `1px solid ${themeTokens.hairline}`, display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
          <Label tk={themeTokens}>Deposit / withdraw savings</Label>
          <input type="number" value={depositAmt} onChange={(e) => setDepositAmt(e.target.value)} placeholder="e.g. 500 or -200"
            style={{ ...inputStyle, fontFamily: 'var(--font-mono)', maxWidth: 200 }} />
          <button
            disabled={!depositAmt || Number(depositAmt) === 0}
            onClick={() => { addSaving(Number(depositAmt)); setDepositAmt(''); }}
            style={{
              padding: '10px 16px', border: 'none', borderRadius: 999,
              background: themeTokens.accent, color: '#0B0B0D',
              fontFamily: 'var(--font-body)', fontWeight: 700, fontSize: 11,
              letterSpacing: '0.18em', textTransform: 'uppercase',
              cursor: (!depositAmt || Number(depositAmt) === 0) ? 'not-allowed' : 'pointer',
              opacity: (!depositAmt || Number(depositAmt) === 0) ? 0.5 : 1,
            }}>Apply</button>
        </div>
      </Surface>

      <Surface>
        <Eyebrow>New goal</Eyebrow>
        <div style={{ height: 12 }} />
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 140px 160px auto', gap: 10, alignItems: 'end' }}>
          <div>
            <Label tk={themeTokens}>Name</Label>
            <input value={newName} onChange={(e) => setNewName(e.target.value)}
              placeholder="e.g. Emergency fund" style={inputStyle} />
          </div>
          <div>
            <Label tk={themeTokens}>Target (R$)</Label>
            <input type="number" value={newTarget} onChange={(e) => setNewTarget(e.target.value)}
              placeholder="0.00" style={{ ...inputStyle, fontFamily: 'var(--font-mono)' }} />
          </div>
          <div>
            <Label tk={themeTokens}>Target date (optional)</Label>
            <input type="date" value={newDue} onChange={(e) => setNewDue(e.target.value)}
              style={{ ...inputStyle, fontFamily: 'var(--font-mono)', colorScheme: 'dark' }} />
          </div>
          <button onClick={submitNew}
            disabled={!newName || !newTarget}
            style={{
              padding: '12px 18px', border: 'none', borderRadius: 999,
              background: themeTokens.accent, color: '#0B0B0D',
              fontFamily: 'var(--font-body)', fontWeight: 700, fontSize: 11,
              letterSpacing: '0.18em', textTransform: 'uppercase',
              cursor: (!newName || !newTarget) ? 'not-allowed' : 'pointer',
              opacity: (!newName || !newTarget) ? 0.5 : 1,
              whiteSpace: 'nowrap',
            }}>Add goal</button>
        </div>
      </Surface>

      {goals.length === 0 ? (
        <LuxurySedanGoal />
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: 16 }}>
          {goals.map((g) => {
            const { pct, monthsToTarget } = goalProgress(g);
            const remaining = Math.max(0, Number(g.target || 0) - Number(g.allocated || 0));
            return (
              <Surface key={g.id}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
                  <Eyebrow>{g.name}</Eyebrow>
                  <button onClick={() => { if (confirmDelete(`Delete the goal "${g.name}"?`)) deleteGoal(g.id); }}
                    style={{ background: 'transparent', border: 'none', color: themeTokens.textDim, cursor: 'pointer', fontFamily: 'var(--font-mono)', fontSize: 9, letterSpacing: '0.18em', textTransform: 'uppercase' }}>
                    Remove
                  </button>
                </div>
                <div style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 32, color: themeTokens.text, letterSpacing: '-0.02em', marginTop: 8 }}>
                  {fmt(Number(g.allocated) || 0)} <span style={{ color: themeTokens.textDim, fontSize: 14, fontWeight: 400 }}>/ {fmt(Number(g.target) || 0)}</span>
                </div>
                <div style={{ position: 'relative', height: 8, background: themeTokens.surface2, borderRadius: 999, overflow: 'hidden', marginTop: 12 }}>
                  <div style={{ position: 'absolute', inset: 0, width: `${pct}%`, background: themeTokens.accent, transition: 'width 400ms ease' }} />
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 8 }}>
                  <span style={{ color: themeTokens.textDim, fontFamily: 'var(--font-mono)', fontSize: 11 }}>{pct.toFixed(1)}% · {fmt(remaining)} to go</span>
                  {g.due && (
                    <span style={{ color: themeTokens.textDim, fontFamily: 'var(--font-mono)', fontSize: 11 }}>
                      {monthsToTarget != null && monthsToTarget >= 0 ? `${monthsToTarget}mo left` : (monthsToTarget < 0 ? 'overdue' : '')}
                    </span>
                  )}
                </div>
                <div style={{ display: 'flex', gap: 8, marginTop: 12, flexWrap: 'wrap' }}>
                  {[50, 100, 500].map((v) => (
                    <button key={v} onClick={() => allocate(g, v)}
                      disabled={unallocated < v}
                      style={{
                        padding: '6px 12px', borderRadius: 999,
                        border: `1px solid ${themeTokens.hairline2}`,
                        background: 'transparent', color: themeTokens.textDim,
                        fontFamily: 'var(--font-mono)', fontSize: 10,
                        letterSpacing: '0.18em', textTransform: 'uppercase',
                        cursor: unallocated < v ? 'not-allowed' : 'pointer',
                        opacity: unallocated < v ? 0.4 : 1,
                      }}>+{v}</button>
                  ))}
                  <button onClick={() => allocate(g, -(Number(g.allocated) || 0))}
                    disabled={(Number(g.allocated) || 0) === 0}
                    style={{
                      padding: '6px 12px', borderRadius: 999,
                      border: `1px solid ${themeTokens.hairline2}`,
                      background: 'transparent', color: themeTokens.textDim,
                      fontFamily: 'var(--font-mono)', fontSize: 10,
                      letterSpacing: '0.18em', textTransform: 'uppercase',
                      cursor: (Number(g.allocated) || 0) === 0 ? 'not-allowed' : 'pointer',
                      opacity: (Number(g.allocated) || 0) === 0 ? 0.4 : 1,
                    }}>Reset</button>
                </div>
              </Surface>
            );
          })}
        </div>
      )}
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
  // Next due = first pending installment whose date is on or after today. If all
  // pendings are past-due, fall back to the very first pending so we still show
  // something meaningful instead of nothing.
  const todayStart = useMemo(() => {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    return d;
  }, []);
  const nextDue = (
    schedule.find((t) => t.status === 'pending' && new Date(t.date) >= todayStart)
    || schedule.find((t) => t.status === 'pending')
  );

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

      <ScheduleGrid schedule={schedule} themeTokens={themeTokens} fmt={fmt}
        nextDueId={nextDue?.id} todayStart={todayStart} />
    </div>
  );
};

// Compact grid of installment cards, scrollable when content overflows.
// Auto-fits 4–6 columns depending on width. Highlights the next-due card and
// shows a small down-arrow hint when more rows exist below the fold.
const ScheduleGrid = ({ schedule, themeTokens, fmt, nextDueId, todayStart }) => {
  const scrollRef = useRef(null);
  const [hasMoreBelow, setHasMoreBelow] = useState(false);

  // Auto-scroll the next-due card into view on mount so the user sees what
  // matters first without manual scrolling.
  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    const target = el.querySelector('[data-next-due="true"]');
    if (target) {
      const top = target.offsetTop - el.offsetTop - 12;
      el.scrollTo({ top, behavior: 'smooth' });
    }
  }, [nextDueId]);

  // Track whether the scroll container can scroll further down so we can
  // show / hide the "more below" indicator dynamically.
  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    const onScroll = () => {
      setHasMoreBelow(el.scrollTop + el.clientHeight + 8 < el.scrollHeight);
    };
    onScroll();
    el.addEventListener('scroll', onScroll, { passive: true });
    return () => el.removeEventListener('scroll', onScroll);
  }, [schedule.length]);

  const jumpDown = () => {
    const el = scrollRef.current;
    if (!el) return;
    el.scrollBy({ top: Math.max(120, el.clientHeight * 0.8), behavior: 'smooth' });
  };

  return (
    <Surface style={{ position: 'relative' }}>
      <div ref={scrollRef} style={{ maxHeight: 480, overflow: 'auto', paddingRight: 4 }}>
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
          gap: 10,
        }}>
          {schedule.map((tx) => {
            const d = new Date(tx.date);
            const paid = tx.status === 'paid';
            const overdue = !paid && d < todayStart;
            const idx = (tx.installmentIndex ?? 0) + 1;
            const isNext = tx.id === nextDueId;

            const borderColor = isNext
              ? themeTokens.accent
              : overdue
                ? themeTokens.negative
                : paid
                  ? themeTokens.hairline2
                  : themeTokens.hairline;
            const tintBg = isNext
              ? `${themeTokens.accent}1A`
              : overdue
                ? `${themeTokens.negative}10`
                : 'transparent';

            return (
              <div key={tx.id}
                data-next-due={isNext ? 'true' : undefined}
                style={{
                  background: tintBg,
                  border: `1px solid ${borderColor}`,
                  borderRadius: 12,
                  padding: '12px 14px',
                  display: 'grid', gap: 6,
                  opacity: paid ? 0.55 : 1,
                  boxShadow: isNext ? `0 0 0 1px ${themeTokens.accent}, 0 8px 22px ${themeTokens.accent}22` : 'none',
                  transition: 'all 200ms',
                }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
                  <span style={{
                    fontFamily: 'var(--font-mono)', fontSize: 10,
                    letterSpacing: '0.18em', color: themeTokens.textDim,
                  }}>
                    {String(idx).padStart(2, '0')}/{MOTO_COUNT}
                  </span>
                  <span style={{
                    fontFamily: 'var(--font-mono)', fontSize: 9, letterSpacing: '0.18em',
                    textTransform: 'uppercase',
                    padding: '2px 8px', borderRadius: 999,
                    border: `1px solid ${paid ? themeTokens.hairline2 : (overdue ? themeTokens.negative : themeTokens.accent)}`,
                    background: paid ? 'transparent' : (overdue ? `${themeTokens.negative}1A` : `${themeTokens.accent}1A`),
                    color: paid ? themeTokens.textDim : (overdue ? themeTokens.negative : themeTokens.accent),
                  }}>
                    {paid ? 'Paid' : overdue ? 'Overdue' : isNext ? 'Next' : 'Pending'}
                  </span>
                </div>
                <div style={{ color: themeTokens.text, fontSize: 14, fontWeight: 500 }}>
                  {d.toLocaleDateString('en-US', { day: '2-digit', month: 'short', year: 'numeric' })}
                </div>
                <div style={{
                  fontFamily: 'var(--font-mono)', fontSize: 14, color: themeTokens.text,
                  marginTop: 2,
                }}>
                  {fmt(tx.amount)}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {hasMoreBelow && (
        <button
          onClick={jumpDown}
          aria-label="Scroll for more installments"
          title="More installments below"
          style={{
            position: 'absolute', right: 18, bottom: 18,
            width: 36, height: 36, borderRadius: '50%',
            border: `1px solid ${themeTokens.hairline2}`,
            background: themeTokens.surface,
            backdropFilter: 'blur(12px)', WebkitBackdropFilter: 'blur(12px)',
            color: themeTokens.text,
            display: 'grid', placeItems: 'center',
            cursor: 'pointer',
            boxShadow: '0 8px 18px rgba(0,0,0,0.25)',
            transition: 'transform 160ms',
          }}
          onMouseEnter={(e) => { e.currentTarget.style.transform = 'translateY(2px)'; }}
          onMouseLeave={(e) => { e.currentTarget.style.transform = 'translateY(0)'; }}
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor"
            strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
            <polyline points="6 9 12 15 18 9" />
          </svg>
        </button>
      )}
    </Surface>
  );
};

// Debts CRUD — user-managed debts (separate from locked Triumph financing).
// Each debt: { id, name, principal, rate (% per period, optional), startDate, payoffMonths, paidSoFar }.
// Total managed debt subtracts from Net Worth equity (see NetWorthPage).
export const DebtsPage = () => {
  const {
    debtsState, addDebt, updateDebt, deleteDebt,
    themeTokens, fmt, setView,
  } = useAppContext();
  const [name, setName]             = useState('');
  const [principal, setPrincipal]   = useState('');
  const [rate, setRate]             = useState('');
  const [startDate, setStartDate]   = useState(() => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  });
  const [payoffMonths, setPayoffMonths] = useState('');

  const totals = debtTotals(debtsState);

  const inputStyle = {
    width: '100%', background: 'transparent',
    border: `1px solid ${themeTokens.hairline2}`, borderRadius: 10,
    padding: '10px 14px', color: themeTokens.text, fontFamily: 'var(--font-body)', fontSize: 14, outline: 'none',
  };

  const submit = () => {
    if (!name || !principal) return;
    addDebt({
      name,
      principal: Number(principal),
      rate: Number(rate) || 0,
      startDate: new Date(startDate).toISOString(),
      payoffMonths: Number(payoffMonths) || null,
    });
    setName(''); setPrincipal(''); setRate(''); setPayoffMonths('');
  };

  const recordPayment = (debt, delta) => {
    const next = Math.max(0, (Number(debt.paidSoFar) || 0) + delta);
    updateDebt(debt.id, { paidSoFar: Math.min(next, Number(debt.principal) || 0) });
  };

  return (
    <div style={{ display: 'grid', gap: 24 }}>
      <Surface>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16 }}>
          <button onClick={() => setView('networth')}
            style={{
              padding: '6px 14px', borderRadius: 999,
              border: `1px solid ${themeTokens.hairline2}`,
              background: 'transparent', color: themeTokens.textDim,
              fontFamily: 'var(--font-mono)', fontSize: 10,
              letterSpacing: '0.18em', textTransform: 'uppercase',
              cursor: 'pointer', transition: 'all 200ms',
            }}>← Net Worth</button>
        </div>
        <div style={{ display: 'flex', alignItems: 'baseline', gap: 16, flexWrap: 'wrap' }}>
          <div>
            <Eyebrow>Debts · Managed</Eyebrow>
            <div style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 42, color: themeTokens.negative, letterSpacing: '-0.02em', marginTop: 4 }}>
              {fmt(totals.remaining)}
            </div>
            <div style={{ color: themeTokens.textDim, fontFamily: 'var(--font-mono)', fontSize: 11, letterSpacing: '0.18em', textTransform: 'uppercase', marginTop: 6 }}>
              {fmt(totals.totalPaid)} paid · {fmt(totals.totalPrincipal)} principal
            </div>
          </div>
          <div style={{ marginLeft: 'auto', maxWidth: 360, textAlign: 'right' }}>
            <div style={{ color: themeTokens.textDim, fontSize: 12, fontFamily: 'var(--font-mono)', letterSpacing: '0.18em', textTransform: 'uppercase' }}>
              Triumph financing
            </div>
            <div style={{ color: themeTokens.text, fontSize: 13, marginTop: 4, lineHeight: 1.4 }}>
              The Triumph installment schedule is tracked separately under the Triumph tab.
              These debts cover other loans, financing, or borrowed money.
            </div>
            <button onClick={() => setView('motorcycle')}
              style={{
                marginTop: 10, padding: '6px 12px', borderRadius: 999,
                border: `1px solid ${themeTokens.hairline2}`, background: 'transparent', color: themeTokens.textDim,
                fontFamily: 'var(--font-mono)', fontSize: 10, letterSpacing: '0.18em', textTransform: 'uppercase',
                cursor: 'pointer',
              }}>Open Triumph →</button>
          </div>
        </div>
      </Surface>

      <Surface>
        <Eyebrow>New debt</Eyebrow>
        <div style={{ height: 12 }} />
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 140px 120px 160px 140px auto', gap: 10, alignItems: 'end' }}>
          <div>
            <Label tk={themeTokens}>Name / creditor</Label>
            <input value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Personal loan" style={inputStyle} />
          </div>
          <div>
            <Label tk={themeTokens}>Principal (R$)</Label>
            <input type="number" value={principal} onChange={(e) => setPrincipal(e.target.value)} placeholder="0.00"
              style={{ ...inputStyle, fontFamily: 'var(--font-mono)' }} />
          </div>
          <div>
            <Label tk={themeTokens}>Rate (% / mo)</Label>
            <input type="number" value={rate} onChange={(e) => setRate(e.target.value)} placeholder="0"
              style={{ ...inputStyle, fontFamily: 'var(--font-mono)' }} />
          </div>
          <div>
            <Label tk={themeTokens}>Start date</Label>
            <input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)}
              style={{ ...inputStyle, fontFamily: 'var(--font-mono)', colorScheme: 'dark' }} />
          </div>
          <div>
            <Label tk={themeTokens}>Payoff (months)</Label>
            <input type="number" value={payoffMonths} onChange={(e) => setPayoffMonths(e.target.value)} placeholder="12"
              style={{ ...inputStyle, fontFamily: 'var(--font-mono)' }} />
          </div>
          <button onClick={submit}
            disabled={!name || !principal}
            style={{
              padding: '12px 18px', border: 'none', borderRadius: 999,
              background: themeTokens.accent, color: '#0B0B0D',
              fontFamily: 'var(--font-body)', fontWeight: 700, fontSize: 11,
              letterSpacing: '0.18em', textTransform: 'uppercase',
              cursor: (!name || !principal) ? 'not-allowed' : 'pointer',
              opacity: (!name || !principal) ? 0.5 : 1, whiteSpace: 'nowrap',
            }}>Add debt</button>
        </div>
      </Surface>

      {debtsState.length === 0 ? (
        <Surface>
          <div style={{ textAlign: 'center', padding: 24, color: themeTokens.textDim, fontSize: 14 }}>
            No managed debts yet. Add one above to track payoff progress.
          </div>
        </Surface>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: 16 }}>
          {debtsState.map((d) => {
            const principal = Number(d.principal) || 0;
            const paid      = Number(d.paidSoFar) || 0;
            const remaining = Math.max(0, principal - paid);
            const pct       = principal > 0 ? (paid / principal) * 100 : 0;
            return (
              <Surface key={d.id}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
                  <Eyebrow>{d.name}</Eyebrow>
                  <button onClick={() => { if (confirmDelete(`Delete the debt "${d.name}"?`)) deleteDebt(d.id); }}
                    style={{ background: 'transparent', border: 'none', color: themeTokens.textDim, cursor: 'pointer', fontFamily: 'var(--font-mono)', fontSize: 9, letterSpacing: '0.18em', textTransform: 'uppercase' }}>
                    Remove
                  </button>
                </div>
                <div style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 28, color: themeTokens.text, letterSpacing: '-0.02em', marginTop: 8 }}>
                  {fmt(remaining)}
                  <span style={{ color: themeTokens.textDim, fontSize: 14, fontWeight: 400 }}> remaining</span>
                </div>
                <div style={{ position: 'relative', height: 8, background: themeTokens.surface2, borderRadius: 999, overflow: 'hidden', marginTop: 12 }}>
                  <div style={{ position: 'absolute', inset: 0, width: `${pct}%`, background: themeTokens.positive, transition: 'width 400ms ease' }} />
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 8 }}>
                  <span style={{ color: themeTokens.textDim, fontFamily: 'var(--font-mono)', fontSize: 11 }}>
                    {pct.toFixed(1)}% paid · {fmt(paid)} / {fmt(principal)}
                  </span>
                  {d.rate > 0 && (
                    <span style={{ color: themeTokens.textDim, fontFamily: 'var(--font-mono)', fontSize: 11 }}>{d.rate}%/mo</span>
                  )}
                </div>
                <div style={{ display: 'flex', gap: 8, marginTop: 12, flexWrap: 'wrap' }}>
                  {[100, 500, 1000].map((v) => (
                    <button key={v} onClick={() => recordPayment(d, v)}
                      disabled={remaining <= 0}
                      style={{
                        padding: '6px 12px', borderRadius: 999,
                        border: `1px solid ${themeTokens.hairline2}`,
                        background: 'transparent', color: themeTokens.textDim,
                        fontFamily: 'var(--font-mono)', fontSize: 10,
                        letterSpacing: '0.18em', textTransform: 'uppercase',
                        cursor: remaining <= 0 ? 'not-allowed' : 'pointer',
                        opacity: remaining <= 0 ? 0.4 : 1,
                      }}>+{v} paid</button>
                  ))}
                  <button onClick={() => updateDebt(d.id, { paidSoFar: 0 })}
                    disabled={paid === 0}
                    style={{
                      padding: '6px 12px', borderRadius: 999,
                      border: `1px solid ${themeTokens.hairline2}`,
                      background: 'transparent', color: themeTokens.textDim,
                      fontFamily: 'var(--font-mono)', fontSize: 10,
                      letterSpacing: '0.18em', textTransform: 'uppercase',
                      cursor: paid === 0 ? 'not-allowed' : 'pointer',
                      opacity: paid === 0 ? 0.4 : 1,
                    }}>Reset</button>
                </div>
              </Surface>
            );
          })}
        </div>
      )}
    </div>
  );
};
