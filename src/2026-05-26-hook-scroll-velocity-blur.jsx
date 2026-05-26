import { useEffect, useRef, useState } from 'react';

// Scroll-velocity-driven motion-blur intensity hook.
//
// Returns a number in [0, 1]:
//   0   → page is not scrolling
//   ~1  → user is scrolling fast (≥ PEAK_VELOCITY_PX_PER_MS)
//
// After scroll stops, the value decays smoothly toward 0 using an exponential
// curve with a 180ms half-life, then the rAF loop self-terminates so the hook
// costs nothing while the page is idle.
//
// Honors `prefers-reduced-motion: reduce` — when set, the hook permanently
// returns 0 so the caller can skip the (expensive) `filter: blur()` paint.
//
// The hook intentionally does NOT apply any CSS. The caller multiplies the
// returned intensity by a peak (e.g. `filter: blur(${intensity * 4}px)`),
// driving any property that maps well to "motion": blur amount, shadow
// offset, opacity dip, border highlight, etc.

const PEAK_VELOCITY_PX_PER_MS = 3;   // scroll speed at which intensity saturates
const DECAY_HALF_LIFE_MS      = 180; // smooth fade-out after scroll stops
const RENDER_EPSILON          = 0.01; // skip re-renders for sub-pixel changes
const STOP_EPSILON            = 0.005;

const prefersReducedMotion = () => {
  if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') return false;
  try { return window.matchMedia('(prefers-reduced-motion: reduce)').matches; }
  catch (_) { return false; }
};

export const useScrollVelocityBlur = () => {
  const [intensity, setIntensity] = useState(0);
  const stateRef = useRef({
    lastScrollY: 0,
    lastScrollT: 0,
    lastTickT:   0,
    intensity:   0,
    rafId:       0,
    reduced:     false,
  });

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const s = stateRef.current;
    s.reduced = prefersReducedMotion();
    if (s.reduced) return; // never animate when the user opted out

    s.lastScrollY = window.scrollY;
    s.lastScrollT = performance.now();
    s.lastTickT   = s.lastScrollT;

    const tick = (now) => {
      const dt = Math.max(1, now - s.lastTickT);
      // Exponential decay toward 0 with a fixed half-life — frame-rate independent.
      const decay = Math.pow(0.5, dt / DECAY_HALF_LIFE_MS);
      s.intensity = s.intensity * decay;
      s.lastTickT = now;

      const next = Math.max(0, Math.min(1, s.intensity));
      // Skip React updates for changes smaller than 1% of the range — saves
      // a lot of paints during the long tail of the decay curve.
      setIntensity((prev) => (Math.abs(prev - next) > RENDER_EPSILON ? next : prev));

      if (next > STOP_EPSILON) {
        s.rafId = requestAnimationFrame(tick);
      } else {
        // Snap the last pixel to 0 so the consumer's filter unmounts cleanly.
        setIntensity((prev) => (prev !== 0 ? 0 : prev));
        s.rafId = 0;
      }
    };

    const onScroll = () => {
      if (s.reduced) return;
      const now = performance.now();
      const dt  = Math.max(1, now - s.lastScrollT);
      const dy  = window.scrollY - s.lastScrollY;
      const v   = Math.abs(dy) / dt;
      // Max-wins merge so sharp scroll bursts always register, even mid-decay.
      const fromScroll = Math.min(1, v / PEAK_VELOCITY_PX_PER_MS);
      s.intensity   = Math.max(s.intensity, fromScroll);
      s.lastScrollY = window.scrollY;
      s.lastScrollT = now;
      if (!s.rafId) s.rafId = requestAnimationFrame(tick);
    };

    const onMedia = () => {
      s.reduced = prefersReducedMotion();
      if (s.reduced) {
        if (s.rafId) cancelAnimationFrame(s.rafId);
        s.rafId = 0;
        s.intensity = 0;
        setIntensity(0);
      }
    };

    const mql = window.matchMedia ? window.matchMedia('(prefers-reduced-motion: reduce)') : null;
    if (mql?.addEventListener) mql.addEventListener('change', onMedia);
    else if (mql?.addListener) mql.addListener(onMedia);

    window.addEventListener('scroll', onScroll, { passive: true });
    return () => {
      window.removeEventListener('scroll', onScroll);
      if (s.rafId) cancelAnimationFrame(s.rafId);
      s.rafId = 0;
      if (mql?.removeEventListener) mql.removeEventListener('change', onMedia);
      else if (mql?.removeListener) mql.removeListener(onMedia);
    };
  }, []);

  return intensity;
};
