// =============================================================================
// BlurryCityLights — wallpaper J
// Soft-focus night city lights, large warm/cool bokeh through wet camera lens.
// Layers (all position: fixed, pointer-events: none):
//   1. .aurum-blur-base     — near-black gradient with warm city glow at floor
//   2. <canvas .aurum-blur-bokeh>    — drifting, breathing bokeh disks
//   3. .aurum-blur-grain    — fine SVG noise (helps the lens feel real)
//   4. <canvas .aurum-blur-streaks>  — faint vertical water streaks on glass
//   5. <canvas .aurum-blur-mist>     — sparse condensation specks
//   6. .aurum-blur-vignette — soft edge falloff
// =============================================================================

import React, { useEffect, useRef } from 'react';


const BLUR_NOISE_FILTER = 'aurum-blur-noise-fine';

function installBlurFilters() {
  if (document.getElementById('__aurum_blur_lights_filters')) return;
  const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  svg.id = '__aurum_blur_lights_filters';
  svg.setAttribute('width', '0');
  svg.setAttribute('height', '0');
  svg.style.position = 'absolute';
  svg.innerHTML = `
    <defs>
      <filter id="${BLUR_NOISE_FILTER}" x="0%" y="0%" width="100%" height="100%">
        <feTurbulence type="fractalNoise" baseFrequency="1.6" numOctaves="1" seed="11" stitchTiles="stitch"/>
        <feColorMatrix values="0 0 0 0 1
                               0 0 0 0 1
                               0 0 0 0 1
                               0 0 0 0.35 0"/>
      </filter>
    </defs>
  `;
  document.body.appendChild(svg);
}

function installBlurStyles() {
  if (document.getElementById('__aurum_blur_lights_styles')) return;
  const style = document.createElement('style');
  style.id = '__aurum_blur_lights_styles';
  style.textContent = `
    .aurum-blur-base,
    .aurum-blur-bokeh,
    .aurum-blur-grain,
    .aurum-blur-streaks,
    .aurum-blur-mist,
    .aurum-blur-vignette {
      position: fixed;
      inset: 0;
      pointer-events: none;
      z-index: 0;
    }

    .aurum-blur-base {
      background:
        radial-gradient(ellipse 90% 55% at 50% 95%, rgba(240, 150, 80, 0.20) 0%, transparent 65%),
        radial-gradient(ellipse 60% 40% at 18% 82%, rgba(220, 80, 80, 0.12) 0%, transparent 70%),
        radial-gradient(ellipse 60% 40% at 82% 78%, rgba(100, 160, 230, 0.14) 0%, transparent 70%),
        linear-gradient(180deg, #050608 0%, #07080C 40%, #0A0B10 70%, #0D0E14 100%);
    }

    .aurum-blur-grain  { opacity: 0.10; mix-blend-mode: overlay; }

    .aurum-blur-vignette {
      background: radial-gradient(ellipse 90% 75% at 50% 50%, transparent 50%, rgba(0,0,0,0.55) 100%);
    }

    @media (prefers-reduced-motion: reduce) {
      .aurum-blur-bokeh { /* engine self-throttles */ }
    }
  `;
  document.head.appendChild(style);
}

// -----------------------------------------------------------------------------
// Bokeh engine. Soft disks with a bright core + outer rim, drifting slowly,
// breathing in size, occasionally twinkling. Colors sampled from a curated
// city-light palette (warm amber/red dominant, cool teal/blue accents).
// -----------------------------------------------------------------------------
function startBokehEngine(canvas) {
  const CONFIG = {
    fps: 30,
    dprCap: 1.4,
    count: 38,
    radius: [40, 180],
    drift: 0.012, // px / ms — very slow
    twinkleChance: 0.0006, // per ms per disk
  };

  // Palette inspired by reference 3 — saturated city lights.
  const palette = [
    { h: 18,  s: 88, l: 60 }, // amber
    { h: 30,  s: 90, l: 65 }, // gold
    { h: 0,   s: 80, l: 58 }, // crimson
    { h: 200, s: 80, l: 60 }, // sky blue
    { h: 215, s: 65, l: 55 }, // steel blue
    { h: 145, s: 65, l: 55 }, // emerald
    { h: 96,  s: 60, l: 60 }, // lime
    { h: 320, s: 60, l: 60 }, // magenta
    { h: 45,  s: 90, l: 70 }, // pale gold
    { h: 0,   s: 0,  l: 92 }, // white
  ];

  const ctx = canvas.getContext('2d');
  let W = 0, H = 0, DPR = 1;
  const rand = (a, b) => a + Math.random() * (b - a);

  const disks = [];
  function spawn() {
    const c = palette[Math.floor(Math.random() * palette.length)];
    const r = rand(CONFIG.radius[0], CONFIG.radius[1]);
    disks.push({
      x: rand(-r, W + r),
      y: rand(-r, H + r),
      r,
      baseR: r,
      vx: rand(-CONFIG.drift, CONFIG.drift),
      vy: rand(-CONFIG.drift, CONFIG.drift) * 0.6,
      hue: c.h, sat: c.s, lit: c.l,
      // Breathing
      breath: rand(0, Math.PI * 2),
      breathSpeed: rand(0.0002, 0.0005),
      breathAmp: rand(0.06, 0.16),
      // Twinkle
      twink: 0,
      // Per-disk alpha so the field has depth
      alpha: rand(0.45, 0.95),
    });
  }

  function resize() {
    DPR = Math.min(window.devicePixelRatio || 1, CONFIG.dprCap);
    W = window.innerWidth;
    H = window.innerHeight;
    if (W < 1 || H < 1) return;
    canvas.width = Math.round(W * DPR);
    canvas.height = Math.round(H * DPR);
    canvas.style.width = W + 'px';
    canvas.style.height = H + 'px';
    ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
  }

  resize();
  for (let i = 0; i < CONFIG.count; i++) spawn();

  function draw(d) {
    const r = d.r;
    const cx = d.x, cy = d.y;
    const a = d.alpha * (1 + d.twink * 0.6);

    // Outer halo
    const halo = ctx.createRadialGradient(cx, cy, 0, cx, cy, r);
    halo.addColorStop(0.00, `hsla(${d.hue}, ${d.sat}%, ${d.lit}%, ${0.55 * a})`);
    halo.addColorStop(0.30, `hsla(${d.hue}, ${d.sat}%, ${d.lit}%, ${0.32 * a})`);
    halo.addColorStop(0.65, `hsla(${d.hue}, ${d.sat}%, ${d.lit - 8}%, ${0.10 * a})`);
    halo.addColorStop(1.00, `hsla(${d.hue}, ${d.sat}%, ${d.lit - 12}%, 0)`);
    ctx.fillStyle = halo;
    ctx.beginPath(); ctx.arc(cx, cy, r, 0, Math.PI * 2); ctx.fill();

    // Bright core — small, slightly bluish-white
    const cR = r * 0.18;
    const core = ctx.createRadialGradient(cx, cy, 0, cx, cy, cR);
    core.addColorStop(0,   `hsla(${d.hue}, ${d.sat * 0.4}%, 92%, ${0.75 * a})`);
    core.addColorStop(0.5, `hsla(${d.hue}, ${d.sat * 0.6}%, 80%, ${0.45 * a})`);
    core.addColorStop(1,   `hsla(${d.hue}, ${d.sat}%, ${d.lit}%, 0)`);
    ctx.fillStyle = core;
    ctx.beginPath(); ctx.arc(cx, cy, cR, 0, Math.PI * 2); ctx.fill();
  }

  const FRAME_MS = 1000 / CONFIG.fps;
  let last = performance.now();
  let accum = 0, rafId = 0, stopped = false;
  let paused = document.hidden;

  function tick(now) {
    if (stopped) return;
    if (paused) { rafId = requestAnimationFrame(tick); last = now; return; }
    const elapsed = now - last; last = now;
    accum += elapsed;
    if (accum < FRAME_MS) { rafId = requestAnimationFrame(tick); return; }
    const dt = Math.min(120, accum); accum = 0;

    ctx.globalCompositeOperation = 'source-over';
    ctx.clearRect(0, 0, W, H);
    ctx.globalCompositeOperation = 'lighter';

    for (const d of disks) {
      d.x += d.vx * dt;
      d.y += d.vy * dt;

      // Breathing
      d.breath += d.breathSpeed * dt;
      d.r = d.baseR * (1 + Math.sin(d.breath) * d.breathAmp);

      // Twinkle — small, rare flare
      if (Math.random() < CONFIG.twinkleChance * dt) d.twink = 1;
      if (d.twink > 0) d.twink = Math.max(0, d.twink - dt * 0.0025);

      // Wrap softly off-screen so the field looks endless.
      const margin = d.baseR * 1.2;
      if (d.x < -margin)     d.x = W + margin;
      if (d.x > W + margin)  d.x = -margin;
      if (d.y < -margin)     d.y = H + margin;
      if (d.y > H + margin)  d.y = -margin;

      draw(d);
    }

    rafId = requestAnimationFrame(tick);
  }

  const onResize = () => resize();
  const onVis    = () => { paused = document.hidden; if (!paused) last = performance.now(); };
  window.addEventListener('resize', onResize);
  document.addEventListener('visibilitychange', onVis);

  const reduce = window.matchMedia
    && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (!reduce) {
    rafId = requestAnimationFrame(tick);
  } else {
    // Single static frame
    ctx.globalCompositeOperation = 'lighter';
    for (const d of disks) draw(d);
  }

  return () => {
    stopped = true;
    cancelAnimationFrame(rafId);
    window.removeEventListener('resize', onResize);
    document.removeEventListener('visibilitychange', onVis);
    disks.length = 0;
  };
}

// -----------------------------------------------------------------------------
// Vertical water-streak engine (matches reference 3's thin runs of water).
// -----------------------------------------------------------------------------
function startStreakEngine(canvas) {
  const CONFIG = {
    fps: 30,
    dprCap: 1.3,
    streakCount: 14,
  };

  const ctx = canvas.getContext('2d');
  let W = 0, H = 0, DPR = 1;
  const rand = (a, b) => a + Math.random() * (b - a);
  const streaks = [];

  function spawn(initial) {
    const x = rand(W * 0.05, W * 0.95);
    streaks.push({
      x,
      y0: rand(-H * 0.2, H * 0.4),
      y1: rand(-H * 0.2, H * 0.4) + rand(40, 120),
      vy: rand(0.04, 0.10),
      w: rand(0.6, 1.4),
      a: rand(0.10, 0.32),
      grow: rand(40, 120),
    });
    if (initial) {
      const s = streaks[streaks.length - 1];
      s.y0 = rand(-H * 0.1, H);
      s.y1 = s.y0 + rand(60, 220);
    }
  }

  for (let i = 0; i < CONFIG.streakCount; i++) spawn(true);

  function resize() {
    DPR = Math.min(window.devicePixelRatio || 1, CONFIG.dprCap);
    W = window.innerWidth;
    H = window.innerHeight;
    if (W < 1 || H < 1) return;
    canvas.width = Math.round(W * DPR);
    canvas.height = Math.round(H * DPR);
    canvas.style.width = W + 'px';
    canvas.style.height = H + 'px';
    ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
  }
  resize();

  const FRAME_MS = 1000 / CONFIG.fps;
  let last = performance.now();
  let accum = 0, rafId = 0, stopped = false;
  let paused = document.hidden;

  function tick(now) {
    if (stopped) return;
    if (paused) { rafId = requestAnimationFrame(tick); last = now; return; }
    const elapsed = now - last; last = now;
    accum += elapsed;
    if (accum < FRAME_MS) { rafId = requestAnimationFrame(tick); return; }
    const dt = Math.min(120, accum); accum = 0;

    ctx.clearRect(0, 0, W, H);
    ctx.globalCompositeOperation = 'screen';

    for (let i = streaks.length - 1; i >= 0; i--) {
      const s = streaks[i];
      s.y0 += s.vy * dt;
      s.y1 += s.vy * dt * 1.05;
      if (s.y0 > H + 40) { streaks.splice(i, 1); spawn(false); continue; }

      const g = ctx.createLinearGradient(s.x, s.y0, s.x, s.y1);
      g.addColorStop(0,    `rgba(220, 232, 248, 0)`);
      g.addColorStop(0.3,  `rgba(220, 232, 248, ${s.a * 0.7})`);
      g.addColorStop(0.7,  `rgba(220, 232, 248, ${s.a})`);
      g.addColorStop(1,    `rgba(220, 232, 248, 0)`);
      ctx.strokeStyle = g;
      ctx.lineWidth = s.w;
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.moveTo(s.x, s.y0);
      ctx.lineTo(s.x, s.y1);
      ctx.stroke();
    }

    rafId = requestAnimationFrame(tick);
  }

  const onResize = () => resize();
  const onVis    = () => { paused = document.hidden; if (!paused) last = performance.now(); };
  window.addEventListener('resize', onResize);
  document.addEventListener('visibilitychange', onVis);

  const reduce = window.matchMedia
    && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (!reduce) rafId = requestAnimationFrame(tick);

  return () => {
    stopped = true;
    cancelAnimationFrame(rafId);
    window.removeEventListener('resize', onResize);
    document.removeEventListener('visibilitychange', onVis);
    streaks.length = 0;
  };
}

// -----------------------------------------------------------------------------
// Misty specks — countless tiny dots of condensation across the lens.
// -----------------------------------------------------------------------------
function paintMist(canvas) {
  const DPR = Math.min(window.devicePixelRatio || 1, 1.3);
  const W = window.innerWidth, H = window.innerHeight;
  canvas.width = Math.round(W * DPR);
  canvas.height = Math.round(H * DPR);
  canvas.style.width = W + 'px';
  canvas.style.height = H + 'px';
  const ctx = canvas.getContext('2d');
  ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
  ctx.clearRect(0, 0, W, H);
  ctx.globalCompositeOperation = 'screen';
  const n = Math.floor((W * H) / 4200);
  for (let i = 0; i < n; i++) {
    const x = Math.random() * W;
    const y = Math.random() * H;
    const r = Math.random() * 0.9 + 0.3;
    const a = Math.random() * 0.35 + 0.10;
    ctx.fillStyle = `rgba(230, 240, 255, ${a})`;
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.fill();
  }
}

// -----------------------------------------------------------------------------
// React component
// -----------------------------------------------------------------------------
function BlurryCityLights({ mode = 'night' }) {
  const bokehRef   = useRef(null);
  const streakRef  = useRef(null);
  const mistRef    = useRef(null);

  useEffect(() => {
    installBlurFilters();
    installBlurStyles();
  }, []);

  useEffect(() => bokehRef.current  && startBokehEngine(bokehRef.current),   []);
  useEffect(() => streakRef.current && startStreakEngine(streakRef.current), []);

  useEffect(() => {
    if (!mistRef.current) return;
    paintMist(mistRef.current);
    const onResize = () => mistRef.current && paintMist(mistRef.current);
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);

  return (
    <React.Fragment>
      <div className="aurum-blur-base" aria-hidden="true" />
      <canvas ref={bokehRef}  className="aurum-blur-bokeh"   aria-hidden="true" />
      <canvas ref={mistRef}   className="aurum-blur-mist"    aria-hidden="true" />
      <canvas ref={streakRef} className="aurum-blur-streaks" aria-hidden="true" />
      <svg
        className="aurum-blur-grain"
        preserveAspectRatio="none"
        viewBox="0 0 100 100"
        aria-hidden="true"
      >
        <rect width="100" height="100" filter={`url(#${BLUR_NOISE_FILTER})`} />
      </svg>
      <div className="aurum-blur-vignette" aria-hidden="true" />
    </React.Fragment>
  );
}

export default BlurryCityLights;
