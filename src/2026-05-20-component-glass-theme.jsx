import React, { useState, useEffect, useMemo } from 'react';

const STORAGE_DESIGN = 'aurum.glassTheme.design.v2';
const STORAGE_MODE   = 'aurum.glassTheme.mode.v2';

const DESIGNS = {
  A: {
    name: 'Pure White',
    swatch: '#FFFFFF',
    day: {
      bg: `
        radial-gradient(circle 10px at 12% 18%, rgba(255,255,255,0.92), rgba(255,255,255,0.35) 38%, transparent 78%),
        radial-gradient(circle 6px at 8% 48%, rgba(255,255,255,0.85), transparent 72%),
        radial-gradient(circle 13px at 38% 28%, rgba(255,255,255,0.70), transparent 82%),
        radial-gradient(circle 7px at 72% 58%, rgba(255,255,255,0.88), transparent 72%),
        radial-gradient(circle 11px at 88% 76%, rgba(255,255,255,0.72), transparent 76%),
        radial-gradient(circle 5px at 45% 88%, rgba(255,255,255,0.78), transparent 70%),
        radial-gradient(circle 9px at 60% 12%, rgba(255,255,255,0.66), transparent 72%),
        radial-gradient(ellipse 55% 45% at 78% 12%, rgba(255,248,235,0.38), transparent 62%),
        radial-gradient(ellipse 62% 52% at 18% 72%, rgba(220,225,232,0.42), transparent 68%),
        linear-gradient(135deg, #FFFFFF 0%, #FAFBFC 45%, #F0F2F5 100%)
      `,
      cardBg: 'rgba(255, 255, 255, 0.65)',
      cardBorder: 'rgba(100, 110, 125, 0.40)',
      cardShadow: '0 18px 44px rgba(60, 70, 90, 0.16), inset 0 1px 0 rgba(255,255,255,0.85), inset 0 0 0 1px rgba(255,255,255,0.30)',
      tintOverlay: 'rgba(255,255,255,0.04)',
    },
    night: {
      bg: `
        radial-gradient(circle 8px at 14% 22%, rgba(255,255,255,0.65), transparent 76%),
        radial-gradient(circle 5px at 32% 65%, rgba(255,255,255,0.55), transparent 70%),
        radial-gradient(circle 10px at 68% 38%, rgba(255,255,255,0.62), transparent 78%),
        radial-gradient(circle 7px at 85% 82%, rgba(255,255,255,0.58), transparent 72%),
        radial-gradient(ellipse 40% 32% at 78% 18%, rgba(225,230,238,0.38), transparent 62%),
        radial-gradient(ellipse 62% 52% at 22% 68%, rgba(245,238,225,0.36), transparent 68%),
        linear-gradient(135deg, #FBFAF7 0%, #F4F1EC 45%, #ECE6DD 100%)
      `,
      cardBg: 'rgba(252, 250, 247, 0.55)',
      cardBorder: 'rgba(150, 140, 125, 0.35)',
      cardShadow: '0 18px 44px rgba(80, 70, 60, 0.18), inset 0 1px 0 rgba(255,253,250,0.80), inset 0 0 0 1px rgba(255,253,250,0.25)',
      tintOverlay: 'rgba(252,250,247,0.04)',
    },
  },

  B: {
    name: 'Liquid Onyx',
    swatch: '#C5A572',
    day: {
      bg: `
        radial-gradient(circle 8px at 18% 22%, rgba(255,235,200,0.58), transparent 76%),
        radial-gradient(circle 6px at 38% 65%, rgba(255,225,180,0.42), transparent 72%),
        radial-gradient(circle 11px at 68% 28%, rgba(255,235,200,0.52), transparent 82%),
        radial-gradient(circle 7px at 82% 78%, rgba(255,230,190,0.46), transparent 76%),
        radial-gradient(circle 5px at 52% 88%, rgba(255,235,200,0.50), transparent 72%),
        radial-gradient(ellipse 52% 42% at 72% 18%, rgba(200,165,110,0.42), transparent 62%),
        radial-gradient(ellipse 65% 55% at 22% 72%, rgba(60,55,50,0.55), transparent 66%),
        linear-gradient(135deg, #2C2823 0%, #3A352D 50%, #1F1B17 100%)
      `,
      cardBg: 'rgba(40, 42, 50, 0.45)',
      cardBorder: 'rgba(197, 165, 114, 0.30)',
      cardShadow: '0 18px 44px rgba(0,0,0,0.45), inset 0 1px 0 rgba(197,165,114,0.22), inset 0 0 0 1px rgba(197,165,114,0.10)',
      tintOverlay: 'rgba(30,28,24,0.18)',
    },
    night: {
      bg: `
        radial-gradient(circle 6px at 16% 25%, rgba(220,210,180,0.42), transparent 76%),
        radial-gradient(circle 5px at 42% 70%, rgba(220,210,180,0.34), transparent 72%),
        radial-gradient(circle 9px at 72% 32%, rgba(220,210,180,0.46), transparent 76%),
        radial-gradient(circle 6px at 88% 82%, rgba(220,210,180,0.40), transparent 72%),
        radial-gradient(ellipse 40% 32% at 76% 20%, rgba(180,160,120,0.40), transparent 62%),
        radial-gradient(ellipse 62% 52% at 24% 70%, rgba(35,30,28,0.60), transparent 66%),
        linear-gradient(135deg, #0F0E0D 0%, #161412 50%, #0A0908 100%)
      `,
      cardBg: 'rgba(20, 22, 28, 0.55)',
      cardBorder: 'rgba(197, 165, 114, 0.24)',
      cardShadow: '0 18px 44px rgba(0,0,0,0.55), inset 0 1px 0 rgba(197,165,114,0.16), inset 0 0 0 1px rgba(197,165,114,0.08)',
      tintOverlay: 'rgba(8,8,10,0.22)',
    },
  },

  C: {
    name: 'Cream',
    swatch: '#E6D5B8',
    day: {
      bg: `
        radial-gradient(circle 9px at 14% 20%, rgba(255,255,255,0.88), transparent 76%),
        radial-gradient(circle 6px at 32% 58%, rgba(255,255,255,0.68), transparent 72%),
        radial-gradient(circle 12px at 62% 32%, rgba(255,255,255,0.64), transparent 82%),
        radial-gradient(circle 7px at 80% 70%, rgba(255,255,255,0.74), transparent 72%),
        radial-gradient(circle 5px at 48% 86%, rgba(255,255,255,0.64), transparent 72%),
        radial-gradient(ellipse 54% 44% at 76% 14%, rgba(255,245,220,0.55), transparent 62%),
        radial-gradient(ellipse 64% 54% at 18% 70%, rgba(214,199,168,0.48), transparent 66%),
        linear-gradient(135deg, #FAF6EF 0%, #ECE2D0 45%, #D6C7A8 100%)
      `,
      cardBg: 'rgba(255, 252, 247, 0.62)',
      cardBorder: 'rgba(160, 140, 110, 0.45)',
      cardShadow: '0 18px 44px rgba(120, 95, 60, 0.20), inset 0 1px 0 rgba(255,252,247,0.80), inset 0 0 0 1px rgba(255,252,247,0.25)',
      tintOverlay: 'rgba(255,252,247,0.06)',
    },
    night: {
      bg: `
        radial-gradient(circle 8px at 18% 22%, rgba(230,213,184,0.50), transparent 76%),
        radial-gradient(circle 5px at 36% 62%, rgba(230,213,184,0.42), transparent 72%),
        radial-gradient(circle 10px at 68% 34%, rgba(230,213,184,0.48), transparent 76%),
        radial-gradient(circle 6px at 84% 78%, rgba(230,213,184,0.44), transparent 72%),
        radial-gradient(ellipse 46% 36% at 72% 18%, rgba(230,213,184,0.40), transparent 62%),
        radial-gradient(ellipse 62% 52% at 20% 72%, rgba(34,28,18,0.55), transparent 66%),
        linear-gradient(135deg, #18140E 0%, #221C12 50%, #0F0B08 100%)
      `,
      cardBg: 'rgba(45, 38, 28, 0.55)',
      cardBorder: 'rgba(230, 213, 184, 0.30)',
      cardShadow: '0 18px 44px rgba(0,0,0,0.50), inset 0 1px 0 rgba(230,213,184,0.18), inset 0 0 0 1px rgba(230,213,184,0.10)',
      tintOverlay: 'rgba(20,16,10,0.18)',
    },
  },

  D: {
    name: 'Crystal Frost',
    swatch: '#C5C7CC',
    day: {
      bg: `
        radial-gradient(circle 8px at 14% 18%, rgba(255,255,255,0.88), transparent 76%),
        radial-gradient(circle 6px at 32% 60%, rgba(255,255,255,0.68), transparent 72%),
        radial-gradient(circle 12px at 68% 30%, rgba(255,255,255,0.64), transparent 82%),
        radial-gradient(circle 7px at 84% 72%, rgba(255,255,255,0.74), transparent 72%),
        radial-gradient(circle 5px at 50% 86%, rgba(255,255,255,0.64), transparent 72%),
        radial-gradient(ellipse 52% 44% at 76% 16%, rgba(255,255,255,0.52), transparent 62%),
        radial-gradient(ellipse 66% 56% at 22% 68%, rgba(140,150,165,0.45), transparent 66%),
        linear-gradient(135deg, #F5F7FA 0%, #DDE2E8 45%, #B7BDC5 100%)
      `,
      cardBg: 'rgba(255, 255, 255, 0.58)',
      cardBorder: 'rgba(110, 120, 135, 0.55)',
      cardShadow: '0 18px 44px rgba(60, 70, 90, 0.22), inset 0 1px 0 rgba(255,255,255,0.80), inset 0 0 0 1px rgba(255,255,255,0.25)',
      tintOverlay: 'rgba(255,255,255,0.04)',
    },
    night: {
      bg: `
        radial-gradient(circle 7px at 16% 22%, rgba(220,225,232,0.45), transparent 76%),
        radial-gradient(circle 5px at 32% 64%, rgba(220,225,232,0.38), transparent 72%),
        radial-gradient(circle 10px at 70% 36%, rgba(220,225,232,0.48), transparent 76%),
        radial-gradient(circle 6px at 86% 80%, rgba(220,225,232,0.42), transparent 72%),
        radial-gradient(ellipse 42% 34% at 76% 18%, rgba(220,225,232,0.42), transparent 62%),
        radial-gradient(ellipse 62% 52% at 20% 70%, rgba(20,22,28,0.55), transparent 66%),
        linear-gradient(135deg, #0E1014 0%, #1A1D22 50%, #07080A 100%)
      `,
      cardBg: 'rgba(40, 44, 52, 0.55)',
      cardBorder: 'rgba(180, 185, 195, 0.32)',
      cardShadow: '0 18px 44px rgba(0,0,0,0.55), inset 0 1px 0 rgba(220,225,232,0.18), inset 0 0 0 1px rgba(220,225,232,0.08)',
      tintOverlay: 'rgba(8,10,14,0.10)',
    },
  },
};

const DESIGN_ORDER = ['A', 'B', 'C', 'D'];
const MODE_ORDER   = ['auto', 'day', 'night'];

// Which underlying app theme (`cream` = light, `onyx` = dark) pairs with each
// glass design + day/night combo, so text always has contrast with the bg.
// Pure White (A) is always light. Liquid Onyx (B) is always dark. Cream (C)
// and Crystal Frost (D) flip with day/night.
const APP_THEME_FOR_GLASS = {
  A: { day: 'cream', night: 'cream' },
  B: { day: 'onyx',  night: 'onyx'  },
  C: { day: 'cream', night: 'onyx'  },
  D: { day: 'cream', night: 'onyx'  },
};

const isClockDay = () => {
  const h = new Date().getHours();
  return h >= 6 && h < 18;
};

export function useGlassTheme() {
  const [design, setDesign] = useState(() => {
    try { return localStorage.getItem(STORAGE_DESIGN) || 'A'; }
    catch { return 'A'; }
  });
  const [override, setOverride] = useState(() => {
    try { return localStorage.getItem(STORAGE_MODE) || 'auto'; }
    catch { return 'auto'; }
  });
  const [clockDay, setClockDay] = useState(isClockDay);

  useEffect(() => {
    const id = setInterval(() => setClockDay(isClockDay()), 60_000);
    return () => clearInterval(id);
  }, []);

  useEffect(() => {
    try { localStorage.setItem(STORAGE_DESIGN, design); } catch (_) {}
  }, [design]);
  useEffect(() => {
    try { localStorage.setItem(STORAGE_MODE, override); } catch (_) {}
  }, [override]);

  const effectiveMode = override === 'auto' ? (clockDay ? 'day' : 'night') : override;

  const cycleDesign = () => setDesign((d) => DESIGN_ORDER[(DESIGN_ORDER.indexOf(d) + 1) % DESIGN_ORDER.length]);
  const cycleMode   = () => setOverride((m) => MODE_ORDER[(MODE_ORDER.indexOf(m) + 1) % MODE_ORDER.length]);

  return {
    design, setDesign, cycleDesign,
    mode: override, setMode: setOverride, cycleMode,
    effectiveMode, clockDay,
    variant: DESIGNS[design][effectiveMode],
    meta: DESIGNS[design],
  };
}

function GlassBackdrop({ glass }) {
  const variant = glass.variant;

  useEffect(() => {
    const html = document.documentElement;
    html.setAttribute('data-glass-active', 'true');
    html.setAttribute('data-glass-design', glass.design);
    html.setAttribute('data-glass-mode', glass.effectiveMode);
  }, [glass.design, glass.effectiveMode]);

  useEffect(() => {
    const id = '__aurum_glass_styles';
    let style = document.getElementById(id);
    if (!style) {
      style = document.createElement('style');
      style.id = id;
      document.head.appendChild(style);
    }
    style.textContent = `
      :root {
        --glass-card-bg: ${variant.cardBg};
        --glass-card-border: ${variant.cardBorder};
        --glass-card-shadow: ${variant.cardShadow};
        --glass-tint-overlay: ${variant.tintOverlay};
      }

      html[data-glass-active="true"] body,
      html[data-glass-active="true"] body > #root,
      html[data-glass-active="true"] body > #root > div {
        background: transparent !important;
      }

      /* Cards: match the PRIMARY surface color used across onyx / ivory / cream
         themes and turn them into translucent wet-glass panels. We intentionally
         skip surface2 (#252525 etc) because that color is used by hundreds of
         small inner chips/inputs — applying backdrop-filter to all of them
         tanks render performance. */
      html[data-glass-active="true"] [style*="#1E1E1E"],
      html[data-glass-active="true"] [style*="#1e1e1e"],
      html[data-glass-active="true"] [style*="rgb(30, 30, 30)"],
      html[data-glass-active="true"] [style*="rgb(30,30,30)"],
      html[data-glass-active="true"] [style*="rgba(255, 252, 246, 0.78)"],
      html[data-glass-active="true"] [style*="rgba(255,252,246,0.78)"],
      html[data-glass-active="true"] [style*="rgba(255,255,255,0.92)"],
      html[data-glass-active="true"] [style*="rgba(255, 255, 255, 0.92)"] {
        background:
          linear-gradient(var(--glass-tint-overlay), var(--glass-tint-overlay)),
          var(--glass-card-bg) !important;
        backdrop-filter: blur(8px) saturate(160%) !important;
        -webkit-backdrop-filter: blur(8px) saturate(160%) !important;
        border-color: var(--glass-card-border) !important;
        box-shadow: var(--glass-card-shadow) !important;
      }

      /* Soft drift so the wet glass feels alive without being distracting. */
      @keyframes aurumGlassDrift {
        0%, 100% { transform: translate3d(0, 0, 0) scale(1.08); }
        50%      { transform: translate3d(-22px, -14px, 0) scale(1.08); }
      }
      .aurum-glass-bg-layer {
        position: fixed;
        inset: -12vh -12vw;
        z-index: 0;
        pointer-events: none;
        filter: blur(22px);
        animation: aurumGlassDrift 48s ease-in-out infinite;
        background: ${variant.bg};
        transition: background 700ms ease;
      }

      /* Subtle highlight sweep across the very top, like light hitting wet glass. */
      .aurum-glass-bg-sheen {
        position: fixed;
        inset: 0;
        z-index: 0;
        pointer-events: none;
        background:
          linear-gradient(180deg, rgba(255,255,255,0.10) 0%, transparent 30%),
          linear-gradient(0deg,   rgba(0,0,0,0.10)   0%, transparent 30%);
      }

      /* Slim, glass-themed scrollbar so it blends in. */
      html[data-glass-active="true"] ::-webkit-scrollbar-thumb {
        background: var(--glass-card-border);
        border-radius: 8px;
      }
    `;
  }, [variant.bg, variant.cardBg, variant.cardBorder, variant.cardShadow, variant.tintOverlay]);

  return (
    <>
      <div className="aurum-glass-bg-layer" aria-hidden="true" />
      <div className="aurum-glass-bg-sheen" aria-hidden="true" />
    </>
  );
}

function ModeIcon({ mode, effective }) {
  if (mode === 'day') {
    return (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor"
        strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
        <circle cx="12" cy="12" r="4.5" />
        <line x1="12" y1="2"    x2="12"    y2="4.5" />
        <line x1="12" y1="19.5" x2="12"    y2="22" />
        <line x1="4.22" y1="4.22" x2="6"   y2="6" />
        <line x1="18"   y1="18"   x2="19.78" y2="19.78" />
        <line x1="2"    y1="12"   x2="4.5"  y2="12" />
        <line x1="19.5" y1="12"   x2="22"   y2="12" />
        <line x1="4.22" y1="19.78" x2="6"   y2="18" />
        <line x1="18"   y1="6"    x2="19.78" y2="4.22" />
      </svg>
    );
  }
  if (mode === 'night') {
    return (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor"
        strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
        <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
      </svg>
    );
  }
  // auto — half-sun / half-moon split, follows current effective mode for visual hint
  return (
    <div style={{ position: 'relative', width: 22, height: 22 }}>
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor"
        strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden
        style={{ position: 'absolute', inset: 0 }}>
        <circle cx="12" cy="12" r="4.5" />
        <line x1="12" y1="2"    x2="12"    y2="4.5" />
        <line x1="4.22" y1="4.22" x2="6"   y2="6" />
        <line x1="2"    y1="12"   x2="4.5"  y2="12" />
        <line x1="4.22" y1="19.78" x2="6"   y2="18" />
        <line x1="12" y1="19.5" x2="12"    y2="22" />
      </svg>
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor"
        strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden
        style={{ position: 'absolute', inset: 0, clipPath: 'inset(0 0 0 50%)' }}>
        <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
      </svg>
    </div>
  );
}

function GlassControlButtons({ glass, tk }) {
  const swatch = glass.meta.swatch;

  const base = {
    width: 56, height: 56, borderRadius: '50%',
    border: `1px solid ${tk.hairline2}`,
    background: tk.surface,
    backdropFilter: 'blur(20px) saturate(160%)',
    WebkitBackdropFilter: 'blur(20px) saturate(160%)',
    boxShadow: tk.isDark
      ? '0 12px 28px rgba(0,0,0,0.45), 0 0 0 1px rgba(255,255,255,0.04)'
      : '0 12px 28px rgba(40,30,20,0.18), 0 0 0 1px rgba(40,30,20,0.06)',
    color: tk.text,
    display: 'grid', placeItems: 'center',
    cursor: 'pointer',
    position: 'fixed', bottom: 24, zIndex: 100,
    transition: 'transform 200ms ease, background 480ms ease, color 480ms ease',
  };

  const modeLabel =
    glass.mode === 'auto'  ? `Auto (currently ${glass.effectiveMode})`
  : glass.mode === 'day'   ? 'Day (manual)'
  :                          'Night (manual)';

  return (
    <>
      {/* Day / Night override toggle: auto → day → night → auto */}
      <button
        onClick={glass.cycleMode}
        aria-label={`Glass day/night mode: ${modeLabel}`}
        title={`Glass mode: ${modeLabel}`}
        style={{ ...base, left: 92 }}
        onMouseEnter={(e) => { e.currentTarget.style.transform = 'scale(1.08)'; }}
        onMouseLeave={(e) => { e.currentTarget.style.transform = 'scale(1)'; }}
      >
        <ModeIcon mode={glass.mode} effective={glass.effectiveMode} />
      </button>

      {/* Design picker: A → B → C → D → A */}
      <button
        onClick={glass.cycleDesign}
        aria-label={`Glass design: ${glass.design} — ${glass.meta.name}`}
        title={`Glass design ${glass.design}: ${glass.meta.name}`}
        style={{ ...base, left: 160 }}
        onMouseEnter={(e) => { e.currentTarget.style.transform = 'scale(1.08)'; }}
        onMouseLeave={(e) => { e.currentTarget.style.transform = 'scale(1)'; }}
      >
        <div style={{
          width: 30, height: 30, borderRadius: '50%',
          background: `radial-gradient(circle at 32% 30%, #FFFFFFCC 0%, ${swatch} 38%, ${swatch}AA 80%)`,
          display: 'grid', placeItems: 'center',
          fontWeight: 700, fontSize: 13,
          fontFamily: 'var(--font-mono, ui-monospace, monospace)',
          color: '#FFFFFF',
          textShadow: '0 1px 2px rgba(0,0,0,0.35)',
          boxShadow: `inset 0 1px 2px rgba(255,255,255,0.55), 0 2px 8px ${swatch}66`,
        }}>{glass.design}</div>
      </button>
    </>
  );
}

export function GlassTheme({ tk, setTheme }) {
  const glass = useGlassTheme();

  // Auto-pair the underlying app theme with the active glass design so text
  // never collides with the bg (e.g. cream text on pure-white glass).
  useEffect(() => {
    if (typeof setTheme !== 'function') return;
    const next = APP_THEME_FOR_GLASS[glass.design]?.[glass.effectiveMode];
    if (next) setTheme(next);
  }, [glass.design, glass.effectiveMode, setTheme]);

  return (
    <>
      <GlassBackdrop glass={glass} />
      <GlassControlButtons glass={glass} tk={tk} />
    </>
  );
}

export default GlassTheme;
