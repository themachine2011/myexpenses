import React, { useState, useEffect, useMemo } from 'react';
import FoggyGlassCanvas from './2026-05-25-component-foggy-glass-canvas.jsx';
import LiquidChromeCanvas from './2026-05-25-component-liquid-chrome-canvas.jsx';
import MeshGradientCanvas from './2026-05-25-component-mesh-gradient-canvas.jsx';
import StormGlassCityCanvas from './2026-05-27-component-storm-glass-city-canvas.jsx';
import BlurryCityLightsCanvas from './2026-05-27-component-blurry-city-lights-canvas.jsx';
import DarkAbstractGlassCanvas from './2026-05-27-component-dark-abstract-glass-canvas.jsx';

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

  E: {
    name: 'Wet Glass Motion',
    swatch: '#9CB4D0',
    day: {
      bg: `
        radial-gradient(circle 11px at 12% 20%, rgba(255,255,255,0.95), rgba(255,255,255,0.40) 38%, transparent 78%),
        radial-gradient(circle 6px at 24% 52%, rgba(255,255,255,0.85), transparent 72%),
        radial-gradient(circle 14px at 42% 30%, rgba(255,255,255,0.72), transparent 82%),
        radial-gradient(circle 8px at 70% 60%, rgba(255,255,255,0.90), transparent 72%),
        radial-gradient(circle 5px at 36% 82%, rgba(255,255,255,0.78), transparent 70%),
        radial-gradient(circle 12px at 88% 78%, rgba(255,255,255,0.70), transparent 76%),
        radial-gradient(circle 7px at 58% 14%, rgba(255,255,255,0.78), transparent 72%),
        radial-gradient(ellipse 60% 50% at 82% 14%, rgba(255,250,235,0.65), transparent 60%),
        radial-gradient(ellipse 55% 45% at 14% 78%, rgba(165,190,220,0.45), transparent 66%),
        linear-gradient(110deg, transparent 0%, rgba(255,255,255,0.55) 38%, transparent 62%),
        linear-gradient(135deg, #F8FAFF 0%, #E8EEF5 45%, #CBD6E2 100%)
      `,
      cardBg: 'rgba(255, 255, 255, 0.50)',
      cardBorder: 'rgba(160, 180, 210, 0.45)',
      cardShadow: '0 22px 50px rgba(60, 80, 110, 0.18), inset 0 1px 0 rgba(255,255,255,0.80), inset 0 0 0 1px rgba(255,255,255,0.30)',
      tintOverlay: 'rgba(255,255,255,0.05)',
    },
    night: {
      bg: `
        radial-gradient(circle 9px at 12% 22%, rgba(220,230,245,0.50), transparent 76%),
        radial-gradient(circle 5px at 26% 56%, rgba(220,230,245,0.42), transparent 72%),
        radial-gradient(circle 12px at 44% 32%, rgba(220,230,245,0.46), transparent 78%),
        radial-gradient(circle 7px at 72% 62%, rgba(220,230,245,0.50), transparent 72%),
        radial-gradient(circle 5px at 38% 82%, rgba(220,230,245,0.40), transparent 70%),
        radial-gradient(circle 10px at 86% 78%, rgba(220,230,245,0.44), transparent 76%),
        radial-gradient(ellipse 50% 40% at 80% 16%, rgba(200,220,245,0.30), transparent 60%),
        radial-gradient(ellipse 55% 45% at 14% 78%, rgba(70,90,120,0.40), transparent 66%),
        linear-gradient(110deg, transparent 0%, rgba(180,200,230,0.18) 38%, transparent 62%),
        linear-gradient(135deg, #0A0E14 0%, #11161F 50%, #060810 100%)
      `,
      cardBg: 'rgba(28, 34, 46, 0.55)',
      cardBorder: 'rgba(150, 170, 200, 0.30)',
      cardShadow: '0 22px 50px rgba(0, 0, 0, 0.55), inset 0 1px 0 rgba(180,200,230,0.18), inset 0 0 0 1px rgba(180,200,230,0.08)',
      tintOverlay: 'rgba(10,14,22,0.18)',
    },
  },

  F: {
    name: 'Foggy Glass',
    swatch: '#A6B8CC',
    day: {
      // Soft transparent-glass scene: warm sun upper-right, cool blue lower-left,
      // faint horizon band in the middle. Tuned to read calm when blurred by
      // the .aurum-glass-bg-layer filter. The live droplets + bubbles are drawn
      // on top by <FoggyGlassCanvas/>, which only mounts when design === 'F'.
      bg: `
        radial-gradient(circle 9px at 16% 22%, rgba(255,255,255,0.78), transparent 76%),
        radial-gradient(circle 6px at 34% 60%, rgba(255,255,255,0.62), transparent 72%),
        radial-gradient(circle 11px at 66% 30%, rgba(255,255,255,0.66), transparent 80%),
        radial-gradient(circle 7px at 82% 72%, rgba(255,255,255,0.70), transparent 72%),
        radial-gradient(ellipse 50% 60% at 80% 20%, rgba(255,238,205,0.72), transparent 70%),
        radial-gradient(ellipse 64% 48% at 18% 78%, rgba(160,185,215,0.50), transparent 70%),
        linear-gradient(180deg,
          rgba(180,200,225,0.55) 0%,
          rgba(170,190,215,0.35) 35%,
          rgba(150,170,195,0.55) 58%,
          rgba(140,160,185,0.40) 65%,
          rgba(170,190,210,0.30) 75%,
          transparent           90%),
        linear-gradient(135deg, #DDE5EE 0%, #CFD9E4 45%, #B6C4D2 100%)
      `,
      cardBg: 'rgba(255, 255, 255, 0.46)',
      cardBorder: 'rgba(150, 170, 200, 0.42)',
      cardShadow: '0 20px 48px rgba(60, 80, 110, 0.20), inset 0 1px 0 rgba(255,255,255,0.75), inset 0 0 0 1px rgba(255,255,255,0.25)',
      tintOverlay: 'rgba(255,255,255,0.06)',
    },
    night: {
      bg: `
        radial-gradient(circle 8px at 16% 22%, rgba(220,232,248,0.46), transparent 76%),
        radial-gradient(circle 5px at 32% 58%, rgba(220,232,248,0.40), transparent 72%),
        radial-gradient(circle 10px at 68% 30%, rgba(220,232,248,0.46), transparent 78%),
        radial-gradient(circle 6px at 84% 76%, rgba(220,232,248,0.40), transparent 72%),
        radial-gradient(ellipse 46% 38% at 80% 20%, rgba(200,215,240,0.30), transparent 64%),
        radial-gradient(ellipse 62% 52% at 18% 76%, rgba(40,55,80,0.55), transparent 66%),
        linear-gradient(180deg,
          rgba(30,40,58,0.40) 0%,
          rgba(22,32,48,0.30) 40%,
          rgba(50,60,80,0.45) 58%,
          rgba(38,50,72,0.35) 70%,
          transparent         90%),
        linear-gradient(135deg, #0D1320 0%, #141B2A 50%, #070A12 100%)
      `,
      cardBg: 'rgba(28, 36, 52, 0.55)',
      cardBorder: 'rgba(150, 175, 210, 0.30)',
      cardShadow: '0 20px 48px rgba(0, 0, 0, 0.55), inset 0 1px 0 rgba(180,200,230,0.18), inset 0 0 0 1px rgba(180,200,230,0.08)',
      tintOverlay: 'rgba(10,14,22,0.18)',
    },
  },

  // =========================================================================
  // G — Liquid Chrome
  // Full-viewport WebGL chrome shader is mounted on top by <LiquidChromeCanvas/>
  // when design === 'G'. The `bg` value here is only a fallback that shows
  // through the slight blur margin around the canvas (and acts as the safety
  // net if WebGL fails to initialize). Cards are dark translucent glass so
  // light text from the onyx theme reads cleanly over the steel-tone surface.
  // =========================================================================
  G: {
    name: 'Liquid Chrome',
    swatch: '#B8BCC4',
    day: {
      bg: `
        radial-gradient(ellipse 65% 55% at 50% 30%, rgba(180,188,200,0.45), transparent 70%),
        linear-gradient(135deg, #2A2E36 0%, #1A1D22 50%, #0E1014 100%)
      `,
      cardBg: 'rgba(28, 32, 40, 0.52)',
      cardBorder: 'rgba(200, 210, 222, 0.34)',
      cardShadow: '0 20px 48px rgba(0,0,0,0.50), inset 0 1px 0 rgba(220,228,240,0.22), inset 0 0 0 1px rgba(220,228,240,0.10)',
      tintOverlay: 'rgba(12,14,18,0.16)',
    },
    night: {
      bg: `
        radial-gradient(ellipse 65% 55% at 50% 30%, rgba(140,150,165,0.36), transparent 70%),
        linear-gradient(135deg, #16181E 0%, #0C0E12 50%, #06070A 100%)
      `,
      cardBg: 'rgba(18, 20, 26, 0.58)',
      cardBorder: 'rgba(190, 200, 215, 0.28)',
      cardShadow: '0 20px 48px rgba(0,0,0,0.60), inset 0 1px 0 rgba(210,218,232,0.18), inset 0 0 0 1px rgba(210,218,232,0.08)',
      tintOverlay: 'rgba(6,8,12,0.22)',
    },
  },

  // =========================================================================
  // H — Mesh Gradient
  // Full-viewport WebGL colored-blob shader mounted by <MeshGradientCanvas/>
  // when design === 'H'. Cards are light glass by day (cream theme), dark
  // glass by night (onyx theme), each tuned to read over a vivid surface.
  // =========================================================================
  H: {
    name: 'Mesh Gradient',
    swatch: '#C26EA8',
    day: {
      bg: `
        radial-gradient(ellipse 80% 60% at 30% 30%, rgba(220,110,150,0.32), transparent 70%),
        radial-gradient(ellipse 70% 55% at 75% 70%, rgba(100,150,230,0.32), transparent 70%),
        linear-gradient(135deg, #1A1530 0%, #221A38 50%, #100C20 100%)
      `,
      cardBg: 'rgba(255, 255, 255, 0.52)',
      cardBorder: 'rgba(255, 255, 255, 0.42)',
      cardShadow: '0 22px 50px rgba(40, 20, 60, 0.32), inset 0 1px 0 rgba(255,255,255,0.65), inset 0 0 0 1px rgba(255,255,255,0.28)',
      tintOverlay: 'rgba(255,255,255,0.06)',
    },
    night: {
      bg: `
        radial-gradient(ellipse 80% 60% at 30% 30%, rgba(180,80,120,0.30), transparent 70%),
        radial-gradient(ellipse 70% 55% at 75% 70%, rgba(70,110,180,0.30), transparent 70%),
        linear-gradient(135deg, #0E0B1C 0%, #150F25 50%, #080612 100%)
      `,
      cardBg: 'rgba(28, 24, 50, 0.55)',
      cardBorder: 'rgba(210, 190, 240, 0.30)',
      cardShadow: '0 22px 50px rgba(0, 0, 0, 0.58), inset 0 1px 0 rgba(220,200,255,0.18), inset 0 0 0 1px rgba(220,200,255,0.08)',
      tintOverlay: 'rgba(10,8,20,0.20)',
    },
  },

  // =========================================================================
  // I — Storm Glass City
  // Dark stormy night skyline behind wet glass; rain streaks, droplets,
  // distant lightning, subtle mouse parallax on the skyline. Mounted by
  // <StormGlassCityCanvas/>; `bg` is the safety-net behind it.
  // =========================================================================
  I: {
    name: 'Storm Glass City',
    swatch: '#7AA0C8',
    day: {
      bg: `
        radial-gradient(ellipse 70% 50% at 50% 78%, rgba(70,110,150,0.28) 0%, transparent 70%),
        linear-gradient(180deg, #0A1422 0%, #0F1828 60%, #122035 100%)
      `,
      cardBg: 'rgba(20, 28, 44, 0.55)',
      cardBorder: 'rgba(180, 200, 230, 0.30)',
      cardShadow: '0 22px 50px rgba(0,0,0,0.55), inset 0 1px 0 rgba(220,232,250,0.20), inset 0 0 0 1px rgba(220,232,250,0.08)',
      tintOverlay: 'rgba(10,14,22,0.18)',
    },
    night: {
      bg: `
        radial-gradient(ellipse 70% 50% at 50% 78%, rgba(70,110,150,0.22) 0%, transparent 70%),
        linear-gradient(180deg, #060A14 0%, #0A111E 50%, #0E1828 100%)
      `,
      cardBg: 'rgba(18, 24, 38, 0.58)',
      cardBorder: 'rgba(170, 190, 220, 0.28)',
      cardShadow: '0 22px 50px rgba(0,0,0,0.60), inset 0 1px 0 rgba(220,232,250,0.18), inset 0 0 0 1px rgba(220,232,250,0.06)',
      tintOverlay: 'rgba(6,10,18,0.22)',
    },
  },

  // =========================================================================
  // J — Blurry City Lights
  // Soft-focus night lights, bokeh disks + water streaks on a wet camera lens.
  // Mounted by <BlurryCityLightsCanvas/>.
  // =========================================================================
  J: {
    name: 'Blurry City Lights',
    swatch: '#F0A66E',
    day: {
      bg: `
        radial-gradient(ellipse 90% 55% at 50% 95%, rgba(240,150,80,0.18) 0%, transparent 65%),
        linear-gradient(180deg, #07080C 0%, #0A0B10 60%, #0D0E14 100%)
      `,
      cardBg: 'rgba(14, 18, 26, 0.55)',
      cardBorder: 'rgba(220, 232, 250, 0.22)',
      cardShadow: '0 22px 50px rgba(0,0,0,0.60), inset 0 1px 0 rgba(220,232,250,0.18), inset 0 0 0 1px rgba(220,232,250,0.06)',
      tintOverlay: 'rgba(6,7,12,0.18)',
    },
    night: {
      bg: `
        radial-gradient(ellipse 90% 55% at 50% 95%, rgba(240,150,80,0.20) 0%, transparent 65%),
        linear-gradient(180deg, #050608 0%, #07080C 50%, #0A0B10 100%)
      `,
      cardBg: 'rgba(12, 14, 20, 0.60)',
      cardBorder: 'rgba(220, 232, 250, 0.22)',
      cardShadow: '0 22px 50px rgba(0,0,0,0.65), inset 0 1px 0 rgba(220,232,250,0.18), inset 0 0 0 1px rgba(220,232,250,0.06)',
      tintOverlay: 'rgba(4,5,9,0.24)',
    },
  },

  // =========================================================================
  // K — Dark Abstract Glass
  // Black abstract glassmorphism: rounded glass beads, white/grey reflections,
  // faint chromatic city-light tints, slow breathing motion. Mounted by
  // <DarkAbstractGlassCanvas/>.
  // =========================================================================
  K: {
    name: 'Dark Abstract Glass',
    swatch: '#E6EAF0',
    day: {
      bg: `radial-gradient(ellipse 70% 55% at 50% 50%, #0E1014 0%, #06070A 70%, #020306 100%)`,
      cardBg: 'rgba(18, 20, 26, 0.58)',
      cardBorder: 'rgba(220, 232, 250, 0.28)',
      cardShadow: '0 22px 50px rgba(0,0,0,0.60), inset 0 1px 0 rgba(220,232,250,0.20), inset 0 0 0 1px rgba(220,232,250,0.08)',
      tintOverlay: 'rgba(4,6,10,0.22)',
    },
    night: {
      bg: `radial-gradient(ellipse 70% 55% at 50% 50%, #0E1014 0%, #06070A 70%, #020306 100%)`,
      cardBg: 'rgba(14, 16, 22, 0.62)',
      cardBorder: 'rgba(220, 232, 250, 0.26)',
      cardShadow: '0 22px 50px rgba(0,0,0,0.70), inset 0 1px 0 rgba(220,232,250,0.18), inset 0 0 0 1px rgba(220,232,250,0.06)',
      tintOverlay: 'rgba(2,3,6,0.28)',
    },
  },
};

const DESIGN_ORDER = ['A', 'E', 'F', 'G', 'H', 'I', 'J', 'K'];
const MODE_ORDER   = ['auto', 'day', 'night'];

// Which underlying app theme (`cream` = light, `onyx` = dark) pairs with each
// glass design + day/night combo, so text always has contrast with the bg.
// Pure White (A) is always light. Liquid Chrome (G) is always dark (steel
// tones — light text). Wet Glass Motion (E), Foggy Glass (F), and Mesh
// Gradient (H) flip with day/night.
const APP_THEME_FOR_GLASS = {
  A: { day: 'cream', night: 'cream' },
  E: { day: 'cream', night: 'onyx'  },
  F: { day: 'cream', night: 'onyx'  },
  G: { day: 'onyx',  night: 'onyx'  },
  H: { day: 'cream', night: 'onyx'  },
  I: { day: 'onyx',  night: 'onyx'  },
  J: { day: 'onyx',  night: 'onyx'  },
  K: { day: 'onyx',  night: 'onyx'  },
};

const isClockDay = () => {
  const h = new Date().getHours();
  return h >= 6 && h < 18;
};

export function useGlassTheme() {
  const [design, setDesign] = useState(() => {
    try { const stored = localStorage.getItem(STORAGE_DESIGN); return stored && DESIGNS[stored] ? stored : 'A'; }
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

  // Floating-card scroll-depth — only on design E (Wet Glass Motion). Lifts
  // glassed cards a few pixels with a stronger shadow while scrolling, then
  // settles back ~250ms after motion stops. rAF-throttled, GPU-only writes,
  // no layout reads. Skipped entirely when reduced-motion is requested.
  useEffect(() => {
    if (glass.design !== 'E') {
      const root = document.documentElement;
      root.style.removeProperty('--glass-card-lift');
      root.style.removeProperty('--glass-card-shadow-active');
      return;
    }
    const reduce = typeof window !== 'undefined'
      && window.matchMedia
      && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (reduce) return;

    const root = document.documentElement;
    let lastY     = window.scrollY;
    let lastT     = performance.now();
    let rafId     = 0;
    let settleId  = 0;
    let pending   = false;

    // Stacking-context note: applying `transform` to a card creates a new
    // containing block, which traps `position: fixed` children — including
    // the explanation balloon, which is supposed to overflow above any
    // neighboring card. To keep the balloon escape-able while idle, we
    // only set `data-glass-scrolling` (which gates the transform CSS) for
    // the brief window the user is actively scrolling. Between scrolls,
    // no transform exists on the cards, so the balloon floats correctly.
    const settle = () => {
      root.style.setProperty('--glass-card-lift', '0px');
      root.style.removeProperty('--glass-card-shadow-active');
      root.removeAttribute('data-glass-scrolling');
    };

    const onScroll = () => {
      if (pending) return;
      pending = true;
      rafId = requestAnimationFrame(() => {
        pending = false;
        const now = performance.now();
        const y   = window.scrollY;
        const dt  = Math.max(1, now - lastT);
        const dy  = Math.abs(y - lastY);
        // px/ms → clamp 0..8 px of lift for full velocity, scaled so a normal
        // wheel tick lands at ~4–6 px and a fast flick saturates at 8.
        const lift = Math.min(8, (dy / dt) * 6);
        lastY = y;
        lastT = now;
        root.setAttribute('data-glass-scrolling', 'true');
        root.style.setProperty('--glass-card-lift', `-${lift.toFixed(2)}px`);
        root.style.setProperty(
          '--glass-card-shadow-active',
          `0 ${(28 + lift * 2.4).toFixed(1)}px ${(60 + lift * 3).toFixed(1)}px rgba(20, 30, 50, ${(0.22 + lift * 0.012).toFixed(3)}), inset 0 1px 0 rgba(255,255,255,0.30)`,
        );
        clearTimeout(settleId);
        settleId = setTimeout(settle, 250);
      });
    };

    window.addEventListener('scroll', onScroll, { passive: true });
    return () => {
      window.removeEventListener('scroll', onScroll);
      cancelAnimationFrame(rafId);
      clearTimeout(settleId);
      root.style.removeProperty('--glass-card-lift');
      root.style.removeProperty('--glass-card-shadow-active');
      root.removeAttribute('data-glass-scrolling');
    };
  }, [glass.design]);

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

      /* Floating-card scroll-depth -- only when Wet Glass Motion (E) is the
         active design AND the user is actively scrolling. The
         data-glass-scrolling attribute is toggled by the scroll handler and
         removed about 250ms after the last scroll event. Gating transform on
         this attribute keeps cards free of a stacking context while idle,
         which is what lets the explanation balloon (position: fixed) float
         above neighboring cards instead of being clipped inside them. */
      html[data-glass-active="true"][data-glass-design="E"] [style*="#1E1E1E"],
      html[data-glass-active="true"][data-glass-design="E"] [style*="#1e1e1e"],
      html[data-glass-active="true"][data-glass-design="E"] [style*="rgb(30, 30, 30)"],
      html[data-glass-active="true"][data-glass-design="E"] [style*="rgb(30,30,30)"],
      html[data-glass-active="true"][data-glass-design="E"] [style*="rgba(255, 252, 246, 0.78)"],
      html[data-glass-active="true"][data-glass-design="E"] [style*="rgba(255,252,246,0.78)"],
      html[data-glass-active="true"][data-glass-design="E"] [style*="rgba(255,255,255,0.92)"],
      html[data-glass-active="true"][data-glass-design="E"] [style*="rgba(255, 255, 255, 0.92)"] {
        box-shadow: var(--glass-card-shadow-active, var(--glass-card-shadow)) !important;
        transition:
          transform 320ms cubic-bezier(0.22, 1, 0.36, 1),
          box-shadow 320ms ease,
          background 480ms ease,
          border-color 480ms ease;
      }

      html[data-glass-active="true"][data-glass-design="E"][data-glass-scrolling="true"] [style*="#1E1E1E"],
      html[data-glass-active="true"][data-glass-design="E"][data-glass-scrolling="true"] [style*="#1e1e1e"],
      html[data-glass-active="true"][data-glass-design="E"][data-glass-scrolling="true"] [style*="rgb(30, 30, 30)"],
      html[data-glass-active="true"][data-glass-design="E"][data-glass-scrolling="true"] [style*="rgb(30,30,30)"],
      html[data-glass-active="true"][data-glass-design="E"][data-glass-scrolling="true"] [style*="rgba(255, 252, 246, 0.78)"],
      html[data-glass-active="true"][data-glass-design="E"][data-glass-scrolling="true"] [style*="rgba(255,252,246,0.78)"],
      html[data-glass-active="true"][data-glass-design="E"][data-glass-scrolling="true"] [style*="rgba(255,255,255,0.92)"],
      html[data-glass-active="true"][data-glass-design="E"][data-glass-scrolling="true"] [style*="rgba(255, 255, 255, 0.92)"] {
        transform: translate3d(0, var(--glass-card-lift, 0px), 0);
        will-change: transform;
      }

      @media (prefers-reduced-motion: reduce) {
        html[data-glass-active="true"][data-glass-design="E"][data-glass-scrolling="true"] [style*="#1E1E1E"],
        html[data-glass-active="true"][data-glass-design="E"][data-glass-scrolling="true"] [style*="#1e1e1e"],
        html[data-glass-active="true"][data-glass-design="E"][data-glass-scrolling="true"] [style*="rgb(30, 30, 30)"],
        html[data-glass-active="true"][data-glass-design="E"][data-glass-scrolling="true"] [style*="rgb(30,30,30)"],
        html[data-glass-active="true"][data-glass-design="E"][data-glass-scrolling="true"] [style*="rgba(255, 252, 246, 0.78)"],
        html[data-glass-active="true"][data-glass-design="E"][data-glass-scrolling="true"] [style*="rgba(255,252,246,0.78)"],
        html[data-glass-active="true"][data-glass-design="E"][data-glass-scrolling="true"] [style*="rgba(255,255,255,0.92)"],
        html[data-glass-active="true"][data-glass-design="E"][data-glass-scrolling="true"] [style*="rgba(255, 255, 255, 0.92)"] {
          transform: none;
          will-change: auto;
        }
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

      /* For designs G + H + I + J + K, the full-viewport canvas already
         provides the entire image, so the sheen overlay would just wash it
         out. Hide it. */
      html[data-glass-active="true"][data-glass-design="G"] .aurum-glass-bg-sheen,
      html[data-glass-active="true"][data-glass-design="H"] .aurum-glass-bg-sheen,
      html[data-glass-active="true"][data-glass-design="I"] .aurum-glass-bg-sheen,
      html[data-glass-active="true"][data-glass-design="J"] .aurum-glass-bg-sheen,
      html[data-glass-active="true"][data-glass-design="K"] .aurum-glass-bg-sheen {
        display: none;
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
      {glass.design === 'F' && (
        <FoggyGlassCanvas
          mode={glass.effectiveMode}
          aria-hidden="true"
        />
      )}
      {glass.design === 'G' && (
        <LiquidChromeCanvas
          mode={glass.effectiveMode}
          aria-hidden="true"
        />
      )}
      {glass.design === 'H' && (
        <MeshGradientCanvas
          mode={glass.effectiveMode}
          aria-hidden="true"
        />
      )}
      {glass.design === 'I' && (
        <StormGlassCityCanvas
          mode={glass.effectiveMode}
          aria-hidden="true"
        />
      )}
      {glass.design === 'J' && (
        <BlurryCityLightsCanvas
          mode={glass.effectiveMode}
          aria-hidden="true"
        />
      )}
      {glass.design === 'K' && (
        <DarkAbstractGlassCanvas
          mode={glass.effectiveMode}
          aria-hidden="true"
        />
      )}
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

      {/* Design picker: A → E → F → G → H → A */}
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
