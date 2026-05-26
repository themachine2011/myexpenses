// =============================================================================
// FoggyGlassCanvas — live droplets + bubbles overlay for the "Foggy Glass"
// glass design (id 'F'). Mounted by GlassBackdrop only when design === 'F',
// so the other glass designs pay zero cost.
//
// Layers (all position: fixed, pointer-events: none, z-index: 0 — they sit
// between the .aurum-glass-bg-layer and the app's cards, exactly like the
// existing .aurum-glass-bg-sheen overlay does):
//   1. SVG fractal-noise frost grain (subtle, static)
//   2. Patchy condensation (very low-opacity drifting white)
//   3. Live <canvas> — tiny condensation specks, raindrops sliding down,
//      and small bubbles popping in across the surface
//   4. Slow glossy highlight sweep
//
// All tunables live in CONFIG at the top of the engine effect.
// =============================================================================

import React, { useEffect, useRef } from 'react';

const FROST_FILTER_ID_COARSE = 'aurum-foggy-frost-coarse';
const FROST_FILTER_ID_FINE   = 'aurum-foggy-frost-fine';

// Install the SVG noise filters once per document. We can't define them inline
// in JSX because React-mounting an <svg> with <filter> children in <body>
// inconsistently registers the IDs for cross-element `filter: url(#id)` use.
function installFrostFilters() {
  if (document.getElementById('__aurum_foggy_glass_filters')) return;
  const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  svg.id = '__aurum_foggy_glass_filters';
  svg.setAttribute('width', '0');
  svg.setAttribute('height', '0');
  svg.setAttribute('aria-hidden', 'true');
  svg.style.position = 'absolute';
  svg.innerHTML = `
    <defs>
      <filter id="${FROST_FILTER_ID_COARSE}" x="0%" y="0%" width="100%" height="100%">
        <feTurbulence type="fractalNoise" baseFrequency="0.85" numOctaves="2" seed="3" stitchTiles="stitch"/>
        <feColorMatrix values="0 0 0 0 1
                               0 0 0 0 1
                               0 0 0 0 1
                               0 0 0 0.55 0"/>
      </filter>
      <filter id="${FROST_FILTER_ID_FINE}" x="0%" y="0%" width="100%" height="100%">
        <feTurbulence type="fractalNoise" baseFrequency="2.4" numOctaves="1" seed="7" stitchTiles="stitch"/>
        <feColorMatrix values="0 0 0 0 1
                               0 0 0 0 1
                               0 0 0 0 1
                               0 0 0 0.4 0"/>
      </filter>
    </defs>
  `;
  document.body.appendChild(svg);
}

// Install the keyframes + static styles once per document.
function installFoggyStyles() {
  if (document.getElementById('__aurum_foggy_glass_styles')) return;
  const style = document.createElement('style');
  style.id = '__aurum_foggy_glass_styles';
  style.textContent = `
    .aurum-foggy-frost,
    .aurum-foggy-frost-fine,
    .aurum-foggy-condensation,
    .aurum-foggy-gloss,
    .aurum-foggy-canvas {
      position: fixed;
      inset: 0;
      pointer-events: none;
      z-index: 0;
    }
    .aurum-foggy-frost      { opacity: 0.18; mix-blend-mode: overlay;    }
    .aurum-foggy-frost-fine { opacity: 0.12; mix-blend-mode: soft-light; }

    .aurum-foggy-condensation {
      mix-blend-mode: screen;
      background:
        radial-gradient(40% 30% at 20% 30%, rgba(255,255,255,0.18) 0%, transparent 70%),
        radial-gradient(35% 28% at 75% 70%, rgba(255,255,255,0.16) 0%, transparent 70%),
        radial-gradient(30% 25% at 50% 15%, rgba(255,255,255,0.14) 0%, transparent 75%),
        radial-gradient(45% 35% at 90% 50%, rgba(255,255,255,0.12) 0%, transparent 75%);
      filter: blur(28px);
      animation: aurumFoggyCondDrift 42s ease-in-out infinite alternate;
      opacity: 0.32;
    }
    html[data-glass-mode="night"] .aurum-foggy-condensation { opacity: 0.18; }

    @keyframes aurumFoggyCondDrift {
      0%   { transform: translate(0%, 0%); }
      100% { transform: translate(1%, -0.5%); }
    }

    .aurum-foggy-gloss {
      inset: -12%;
      background: linear-gradient(115deg,
        transparent 35%,
        rgba(255,255,255,0.035) 48%,
        rgba(255,255,255,0.07)  53%,
        rgba(255,255,255,0.035) 58%,
        transparent 72%);
      mix-blend-mode: screen;
      filter: blur(24px);
      animation: aurumFoggyGloss 36s ease-in-out infinite;
    }
    @keyframes aurumFoggyGloss {
      0%   { transform: translate(-6%, -3%); opacity: 0.6; }
      50%  { transform: translate(3%, 2%);   opacity: 1.0; }
      100% { transform: translate(-6%, -3%); opacity: 0.6; }
    }

    /* Honor reduced-motion: kill the slow loops + the canvas spawn loop
       (the engine itself watches the media query and stops animating). */
    @media (prefers-reduced-motion: reduce) {
      .aurum-foggy-condensation,
      .aurum-foggy-gloss { animation: none; }
    }
  `;
  document.head.appendChild(style);
}

// =============================================================================
// Live drop / bubble engine (vanilla canvas, no deps).
// =============================================================================
function startEngine(canvas, getMode) {
  const CONFIG = {
    fps: 45,
    dprCap: 1.5,

    staticTarget:  25,
    fallingTarget: 12,
    bubbleTarget:  18,
    maxDrops:      110,

    spawnIntervalMs: 350,

    staticSize:   [0.6, 2.0],
    fallingSize:  [3.0, 6.5],
    bubbleSize:   [1.4, 3.2],

    fallingVMax:  [0.45, 0.75],
    bubbleVMax:   [0.18, 0.34],
  };

  const ctx = canvas.getContext('2d');
  const SPRITE_R = 32;
  const sprite = document.createElement('canvas');
  // Tracks which mode the cached sprite was painted for, so the animation
  // loop can detect a day/night switch and trigger a rebuild without needing
  // a window resize.
  let spriteMode = null;
  let W = 0, H = 0, DPR = 1;

  const rand = (a, b) => a + Math.random() * (b - a);

  function rebuildSprite(mode) {
    spriteMode = mode;
    const px = SPRITE_R * 2 * DPR;
    sprite.width = px; sprite.height = px;
    const s = sprite.getContext('2d');
    s.setTransform(DPR, 0, 0, DPR, 0, 0);
    const r = SPRITE_R, cx = r, cy = r;

    const isNight = mode === 'night';
    const body = s.createRadialGradient(
      cx - r * 0.35, cy - r * 0.45, r * 0.05, cx, cy, r * 0.96
    );
    if (isNight) {
      body.addColorStop(0.00, 'rgba(220, 230, 248, 0.75)');
      body.addColorStop(0.40, 'rgba(180, 195, 220, 0.40)');
      body.addColorStop(0.75, 'rgba(120, 140, 175, 0.28)');
      body.addColorStop(1.00, 'rgba(80, 100, 135, 0.00)');
    } else {
      body.addColorStop(0.00, 'rgba(255, 250, 235, 0.85)');
      body.addColorStop(0.40, 'rgba(230, 232, 230, 0.45)');
      body.addColorStop(0.75, 'rgba(180, 195, 210, 0.30)');
      body.addColorStop(1.00, 'rgba(140, 158, 178, 0.00)');
    }
    s.fillStyle = body;
    s.beginPath(); s.arc(cx, cy, r * 0.96, 0, Math.PI * 2); s.fill();

    s.globalCompositeOperation = 'screen';
    s.beginPath();
    s.arc(cx - r * 0.40, cy - r * 0.48, r * 0.22, 0, Math.PI * 2);
    s.fillStyle = isNight
      ? 'rgba(230, 240, 255, 0.55)'
      : 'rgba(255, 255, 252, 0.70)';
    s.fill();

    s.beginPath();
    s.arc(cx + r * 0.45, cy + r * 0.45, r * 0.14, 0, Math.PI * 2);
    s.fillStyle = isNight
      ? 'rgba(180, 200, 240, 0.30)'
      : 'rgba(255, 230, 200, 0.35)';
    s.fill();
  }

  function resize() {
    DPR = Math.min(window.devicePixelRatio || 1, CONFIG.dprCap);
    W = window.innerWidth;
    H = window.innerHeight;
    if (W < 1 || H < 1) return;
    canvas.width  = Math.round(W * DPR);
    canvas.height = Math.round(H * DPR);
    canvas.style.width  = W + 'px';
    canvas.style.height = H + 'px';
    ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
    rebuildSprite(getMode());
  }

  // State
  const drops  = [];
  const trails = [];
  const pops   = [];

  function spawnStatic() {
    if (drops.length >= CONFIG.maxDrops) return;
    const r = rand(CONFIG.staticSize[0], CONFIG.staticSize[1]);
    drops.push({
      kind: 'static',
      x: rand(0, W), y: rand(0, H * 0.95),
      r, growth: rand(0.00008, 0.00022),
      vy: 0, sliding: false,
      slideThreshold: rand(2.4, 3.2),
    });
  }
  function spawnFalling() {
    if (drops.length >= CONFIG.maxDrops) return;
    const r = rand(CONFIG.fallingSize[0], CONFIG.fallingSize[1]);
    drops.push({
      kind: 'falling',
      x: rand(W * 0.03, W * 0.97),
      y: rand(-12, H * 0.10),
      r, growth: 0,
      vy: rand(0.10, 0.20),
      vyMax: rand(CONFIG.fallingVMax[0], CONFIG.fallingVMax[1]),
      sliding: true, pauseUntil: 0,
    });
  }
  function spawnBubble() {
    if (drops.length >= CONFIG.maxDrops) return;
    const r = rand(CONFIG.bubbleSize[0], CONFIG.bubbleSize[1]);
    const x = rand(W * 0.04, W * 0.96);
    const y = rand(H * 0.05, H * 0.85);
    pops.push({
      x, y, r: r * 0.9,
      maxR: r * rand(5.5, 8.5),
      age: 0, life: rand(420, 680),
    });
    drops.push({
      kind: 'bubble',
      x, y, r: 0.01, targetR: r,
      vy: 0, vyMax: rand(CONFIG.bubbleVMax[0], CONFIG.bubbleVMax[1]),
      sliding: false,
      bornAt: performance.now(),
      settleMs: rand(160, 420),
      slideAfter: rand(300, 900),
      pauseUntil: 0,
    });
  }

  function seed() {
    drops.length = 0; trails.length = 0; pops.length = 0;
    for (let i = 0; i < CONFIG.staticTarget; i++) spawnStatic();
    for (let i = 0; i < 6; i++) { spawnFalling(); drops[drops.length-1].y = rand(-20, H * 0.85); }
    for (let i = 0; i < 4; i++) spawnBubble();
  }

  function drawDrop(d) {
    const sc = d.r / SPRITE_R;
    const size = SPRITE_R * 2 * sc;
    ctx.drawImage(sprite, d.x - SPRITE_R * sc, d.y - SPRITE_R * sc, size, size);
  }
  function drawTrail(t) {
    const alpha = 0.35 * (1 - t.fade);
    if (alpha <= 0.01) return;
    ctx.save();
    ctx.globalCompositeOperation = 'screen';
    ctx.strokeStyle = `rgba(255, 245, 225, ${alpha})`;
    ctx.lineWidth = t.w;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(t.x, t.y0);
    ctx.lineTo(t.x, t.y1);
    ctx.stroke();
    ctx.restore();
  }

  // Loop
  const FRAME_MS = 1000 / CONFIG.fps;
  let last = performance.now();
  let accumFrame = 0, trailSpawnAccum = 0, spawnAccum = 0;
  let rafId = 0;
  let stopped = false;
  let paused = document.hidden;

  resize();
  seed();

  function tick(now) {
    if (stopped) return;
    if (paused) { rafId = requestAnimationFrame(tick); last = now; return; }

    // Rebuild the cached droplet sprite if day/night has flipped — otherwise
    // drops keep drawing with the old mode's palette until a window resize.
    const currentMode = getMode();
    if (currentMode !== spriteMode) rebuildSprite(currentMode);

    const elapsed = now - last; last = now;
    accumFrame += elapsed;
    if (accumFrame < FRAME_MS) { rafId = requestAnimationFrame(tick); return; }
    const dt = Math.min(80, accumFrame); accumFrame = 0;

    spawnAccum += dt;
    if (spawnAccum > CONFIG.spawnIntervalMs) {
      spawnAccum = 0;
      let cs=0, cf=0, cb=0;
      for (const d of drops) { if (d.kind==='static') cs++; else if (d.kind==='falling') cf++; else if (d.kind==='bubble') cb++; }
      if (cs < CONFIG.staticTarget  && Math.random() < 0.7)  spawnStatic();
      if (cf < CONFIG.fallingTarget && Math.random() < 0.85) spawnFalling();
      if (cb < CONFIG.bubbleTarget) {
        const burst = 1 + (Math.random() < 0.3 ? 1 : 0) + (Math.random() < 0.12 ? 1 : 0);
        for (let k = 0; k < burst && cb + k < CONFIG.bubbleTarget; k++) spawnBubble();
      }
    }

    ctx.clearRect(0, 0, W, H);

    // Trails
    for (let i = trails.length - 1; i >= 0; i--) {
      const t = trails[i];
      t.age += dt;
      t.fade = Math.min(1, t.age / t.life);
      if (t.fade >= 1) { trails.splice(i, 1); continue; }
      drawTrail(t);
    }

    // Splash rings
    for (let i = pops.length - 1; i >= 0; i--) {
      const p = pops[i];
      p.age += dt;
      const tt = p.age / p.life;
      if (tt >= 1) { pops.splice(i, 1); continue; }
      p.r = p.maxR * (0.2 + tt * 0.8);
      const a = (1 - tt) * 0.55;
      ctx.save();
      ctx.globalCompositeOperation = 'screen';
      ctx.strokeStyle = `rgba(255, 250, 235, ${a * 0.9})`;
      ctx.lineWidth = Math.max(0.6, 1.6 * (1 - tt));
      ctx.beginPath(); ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2); ctx.stroke();
      ctx.strokeStyle = `rgba(255, 245, 220, ${a * 0.5})`;
      ctx.lineWidth = Math.max(0.4, 0.9 * (1 - tt));
      ctx.beginPath(); ctx.arc(p.x, p.y, p.r * 0.65, 0, Math.PI * 2); ctx.stroke();
      ctx.restore();
    }

    // Drops
    for (let i = drops.length - 1; i >= 0; i--) {
      const d = drops[i];

      if (d.kind === 'bubble') {
        const age = now - d.bornAt;
        if (age < d.settleMs) {
          const k = age / d.settleMs;
          d.r = d.targetR * (1 - Math.pow(1 - k, 3));
        } else if (!d.sliding && age > d.slideAfter) {
          d.sliding = true; d.vy = rand(0.02, 0.06);
        } else if (d.sliding) {
          if (now < d.pauseUntil) {
            d.r += 0.0008 * dt;
          } else {
            d.vy = Math.min(d.vyMax, d.vy + 0.00022 * dt);
            const oldY = d.y;
            d.y += d.vy * dt;
            d.r *= (1 - 0.00007 * dt);
            if (Math.random() < 0.0008 * dt) {
              d.pauseUntil = now + rand(140, 380);
              d.vy *= 0.4;
            }
            trailSpawnAccum += dt;
            if (trailSpawnAccum > 60) {
              trailSpawnAccum = 0;
              trails.push({ x: d.x, y0: oldY, y1: d.y, w: Math.max(0.8, d.r * 0.55), age: 0, life: rand(5000, 8000), fade: 0 });
            }
          }
        }
        if (d.y - d.r > H || d.r < 0.5) { drops.splice(i, 1); continue; }
        drawDrop(d);
        continue;
      }

      if (!d.sliding) {
        d.r += d.growth * dt;
        if (d.r >= d.slideThreshold) {
          d.sliding = true; d.vy = rand(0.015, 0.04);
        }
      } else if (d.kind === 'falling') {
        if (now < d.pauseUntil) {
          d.r += 0.002 * dt;
        } else {
          d.vy = Math.min(d.vyMax, d.vy + 0.00040 * dt);
          const oldY = d.y;
          d.y += d.vy * dt;
          d.r *= (1 - 0.00008 * dt);
          if (Math.random() < 0.0006 * dt) {
            d.pauseUntil = now + rand(120, 400);
            d.vy *= 0.3;
          }
          for (let j = drops.length - 1; j >= 0; j--) {
            const o = drops[j];
            if (o === d || o.kind !== 'static') continue;
            const dx = o.x - d.x, dy = o.y - d.y;
            if (Math.abs(dx) < d.r * 1.2 && dy > -d.r && dy < d.r * 1.4) {
              d.r += o.r * 0.25;
              drops.splice(j, 1);
            }
          }
          trailSpawnAccum += dt;
          if (trailSpawnAccum > 32) {
            trailSpawnAccum = 0;
            trails.push({ x: d.x, y0: oldY, y1: d.y, w: Math.max(1.2, d.r * 0.75), age: 0, life: rand(6000, 9500), fade: 0 });
          }
        }
        if (d.y - d.r > H || d.r < 0.6) { drops.splice(i, 1); continue; }
      } else {
        // Static drop that has grown enough to start sliding.
        d.vy = Math.min(0.18, d.vy + 0.00010 * dt);
        const oldY = d.y;
        d.y += d.vy * dt;
        d.r *= (1 - 0.00012 * dt);
        trailSpawnAccum += dt;
        if (trailSpawnAccum > 90) {
          trailSpawnAccum = 0;
          trails.push({ x: d.x, y0: oldY, y1: d.y, w: Math.max(0.6, d.r * 0.55), age: 0, life: rand(6000, 10000), fade: 0 });
        }
        if (d.y - d.r > H || d.r < 0.4) { drops.splice(i, 1); continue; }
      }

      drawDrop(d);
    }

    rafId = requestAnimationFrame(tick);
  }

  // Lifecycle helpers
  function onResize() { resize(); }
  function onVis()    { paused = document.hidden; if (!paused) last = performance.now(); }
  window.addEventListener('resize', onResize);
  document.addEventListener('visibilitychange', onVis);

  // Respect reduced-motion: don't even start the loop.
  const reduce = window.matchMedia
    && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (!reduce) {
    rafId = requestAnimationFrame(tick);
  } else {
    // Draw one static frame so the surface still has a few drops on it.
    last = performance.now();
    ctx.clearRect(0, 0, W, H);
    for (const d of drops) drawDrop(d);
  }

  // Returns a teardown function
  return () => {
    stopped = true;
    cancelAnimationFrame(rafId);
    window.removeEventListener('resize', onResize);
    document.removeEventListener('visibilitychange', onVis);
    // Let GC reclaim sprite + state.
    drops.length = 0; trails.length = 0; pops.length = 0;
  };
}

// =============================================================================
// React component
// =============================================================================
export default function FoggyGlassCanvas({ mode = 'day' }) {
  const canvasRef = useRef(null);
  const modeRef   = useRef(mode);
  modeRef.current = mode;

  useEffect(() => {
    installFrostFilters();
    installFoggyStyles();
  }, []);

  useEffect(() => {
    if (!canvasRef.current) return;
    const teardown = startEngine(canvasRef.current, () => modeRef.current);
    return teardown;
  }, []);

  // Frost-grain SVG layers reuse the filters we install at mount.
  return (
    <>
      <svg
        className="aurum-foggy-frost"
        preserveAspectRatio="none"
        viewBox="0 0 100 100"
        aria-hidden="true"
      >
        <rect width="100" height="100" filter={`url(#${FROST_FILTER_ID_COARSE})`} />
      </svg>
      <svg
        className="aurum-foggy-frost-fine"
        preserveAspectRatio="none"
        viewBox="0 0 100 100"
        aria-hidden="true"
      >
        <rect width="100" height="100" filter={`url(#${FROST_FILTER_ID_FINE})`} />
      </svg>
      <div className="aurum-foggy-condensation" aria-hidden="true" />
      <canvas
        ref={canvasRef}
        className="aurum-foggy-canvas"
        aria-hidden="true"
      />
      <div className="aurum-foggy-gloss" aria-hidden="true" />
    </>
  );
}
