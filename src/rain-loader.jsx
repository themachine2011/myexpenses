// =============================================================================
// RainLoader — "Through the Glass" loading screen
// Heavy rain refracting a blurred 1990s Wall Street ticker, cold green CRT grade.
// Pure <canvas> (no three.js / framer needed). Drop-in replacement for
// AurumLoader: same { accentHex, accentShimmer, onComplete } signature so the
// existing App.jsx wiring keeps working.
//
//   import { RainLoader } from './rain-loader.jsx';
//   <RainLoader accentHex={tk.accent} accentShimmer={tk.accentShimmer}
//               onComplete={() => { ... }} />
//
// Optional props: brand ('myExpenses'), holdMs (how long it shows, 2600),
// fadeMs (exit fade, 600).
// =============================================================================
import React, { useRef, useEffect, useState } from 'react';

const TICKER = [
  { sym: 'DJIA', price: '3834.44', chg: 12.61 }, { sym: 'NASDAQ', price: '751.96', chg: 4.20 },
  { sym: 'S&P', price: '470.42', chg: -1.10 }, { sym: 'IBM', price: '56.25', chg: 0.50 },
  { sym: 'GE', price: '105.00', chg: 1.25 }, { sym: 'XON', price: '64.00', chg: -0.50 },
  { sym: 'KO', price: '44.75', chg: 0.12 }, { sym: 'GM', price: '54.25', chg: 0.75 },
  { sym: 'MCD', price: '58.50', chg: -0.25 }, { sym: 'T', price: '52.12', chg: -0.37 },
  { sym: 'MRK', price: '34.62', chg: 0.62 }, { sym: 'DIS', price: '42.75', chg: 1.00 },
  { sym: 'BA', price: '43.37', chg: -0.62 }, { sym: 'JPM', price: '71.25', chg: 0.88 },
  { sym: 'INTC', price: '31.06', chg: 2.13 }, { sym: 'WMT', price: '25.50', chg: -0.18 },
];
const MONO = "ui-monospace, 'SF Mono', Menlo, Consolas, monospace";
const rnd = (a, b) => a + Math.random() * (b - a);

class RainScene {
  constructor(canvas) { this.canvas = canvas; this.setup(); }

  setup() {
    const cv = this.canvas;
    const rect = cv.getBoundingClientRect();
    const dpr = Math.min(window.devicePixelRatio || 1, 1.5);
    this.W = Math.max(1, Math.round((rect.width || window.innerWidth) * dpr));
    this.H = Math.max(1, Math.round((rect.height || window.innerHeight) * dpr));
    cv.width = this.W; cv.height = this.H;
    this.ctx = cv.getContext('2d');
    this.scene = document.createElement('canvas');
    this.scene.width = this.W; this.scene.height = this.H;
    this.sctx = this.scene.getContext('2d');
    this.u = this.H / 600;
    this.cfg = { density: 1.15, sliders: 26, bokeh: 16, blur: 8 };
    this.buildGeometry();
    this.initDrops();
  }

  buildGeometry() {
    const W = this.W, H = this.H, u = this.u;
    this.buildings = [];
    let x = -20 * u;
    while (x < W + 20 * u) {
      const w = rnd(46, 96) * u;
      const top = rnd(0.18, 0.5) * H;
      const sh = Math.round(rnd(6, 16));
      const b = { x, y: top, w, color: `rgb(${sh},${sh + 6},${sh + 4})`, wins: [] };
      const cols = Math.max(2, Math.floor(w / (11 * u)));
      const rows = Math.max(3, Math.floor((H - top) / (14 * u)));
      const cw = w / cols, rh = (H - top) / rows;
      for (let cI = 0; cI < cols; cI++) for (let rI = 0; rI < rows; rI++) {
        if (Math.random() < 0.45) continue;
        const warm = Math.random() < 0.25;
        const col = warm ? '220,200,120' : (Math.random() < 0.5 ? '90,230,170' : '150,255,205');
        b.wins.push({ x: cI * cw + cw * 0.18, y: rI * rh + rh * 0.18, w: cw * 0.6, h: rh * 0.55, col, base: rnd(0.12, 0.5), s: rnd(0.3, 2.2), ph: rnd(0, 7) });
      }
      this.buildings.push(b);
      x += w + rnd(2, 10) * u;
    }
    this.bokeh = [];
    for (let i = 0; i < this.cfg.bokeh; i++) {
      const warm = Math.random() < 0.18;
      this.bokeh.push({ x: rnd(0, W), y: rnd(0.2, 0.78) * H, r: rnd(10, 40) * u, col: warm ? '230,190,110' : (Math.random() < 0.5 ? '70,255,175' : '90,230,200'), a: rnd(0.18, 0.5), s: rnd(0.4, 1.8), ph: rnd(0, 7) });
    }
    this.band1 = H * 0.30; this.band2 = H * 0.50;
    this.fs1 = 12 * u; this.fs2 = 13 * u;
    this.spd1 = 46 * u; this.spd2 = 34 * u;
    this.reflTop = H * 0.74;
    this._measure();
  }

  _measure() {
    const c = this.sctx;
    c.font = `${this.fs1}px ${MONO}`;
    let t = 0; const g1 = this.fs1 * 1.4;
    this._w1 = TICKER.map(e => { const s = `${e.sym} ${e.price} ${e.chg >= 0 ? '+' : ''}${e.chg.toFixed(2)}`; const w = c.measureText(s).width; t += w + g1; return w; });
    this._tot1 = t;
    c.font = `${this.fs2}px ${MONO}`;
    let t2 = 0; const g2 = this.fs2 * 1.4;
    this._w2 = TICKER.map(e => { const s = `${e.sym} ${e.price} ${e.chg >= 0 ? '+' : ''}${e.chg.toFixed(2)}`; const w = c.measureText(s).width; t2 += w + g2; return w; });
    this._tot2 = t2;
  }

  initDrops() {
    const W = this.W, H = this.H, u = this.u, cfg = this.cfg;
    this.mist = [];
    for (let i = 0; i < Math.round(140 * cfg.density); i++) this.mist.push({ x: rnd(0, W), y: rnd(0, H), r: rnd(0.6, 2.4) * u, a: rnd(0.15, 0.5) });
    this.gems = [];
    for (let i = 0; i < Math.round(22 * cfg.density); i++) this.gems.push(this.newGem());
    this.sliders = [];
    for (let i = 0; i < cfg.sliders; i++) { const s = this.newSlider(); s.y = rnd(0, H); this.sliders.push(s); }
    this.trail = [];
    this.fall = [];
    for (let i = 0; i < Math.round(0.45 * 220); i++) this.fall.push(this.newFall(true));
  }

  newGem() { const u = this.u; return { x: rnd(0, this.W), y: rnd(0, this.H), r: rnd(2.5, 6.5) * u, a: 1 }; }
  newSlider() { const u = this.u, r = rnd(5, 12) * u; return { x: rnd(0, this.W), y: -rnd(0, this.H * 0.5), r, vy: 0, wait: rnd(0, 2.5), wob: rnd(0, 7) }; }
  newFall(rand) { const u = this.u; return { x: rnd(0, this.W), y: rand ? rnd(0, this.H) : -rnd(0, this.H * 0.5), len: rnd(14, 40) * u, sp: rnd(620, 1050) * u, a: rnd(0.08, 0.28) }; }

  drawTicker(t, y, fs, spd, widths, total) {
    const c = this.sctx, W = this.W, gap = fs * 1.4;
    c.font = `${fs}px ${MONO}`; c.textBaseline = 'middle';
    c.fillStyle = 'rgba(0,16,11,0.5)'; c.fillRect(0, y - fs * 0.95, W, fs * 1.9);
    c.fillStyle = 'rgba(60,255,170,0.10)';
    c.fillRect(0, y - fs * 0.95, W, 1.5); c.fillRect(0, y + fs * 0.95 - 1.5, W, 1.5);
    const tot = total + TICKER.length * gap;
    const start = -((t * spd) % tot);
    for (let bx = start; bx < W; bx += tot) {
      let cx = bx;
      for (let i = 0; i < TICKER.length; i++) {
        const e = TICKER[i];
        const symS = `${e.sym} `;
        c.fillStyle = 'rgba(210,255,232,0.92)'; c.fillText(symS, cx, y);
        const sw = c.measureText(symS).width;
        c.fillStyle = e.chg >= 0 ? 'rgba(70,240,160,0.92)' : 'rgba(255,95,110,0.92)';
        c.fillText(`${e.price} ${e.chg >= 0 ? '+' : ''}${e.chg.toFixed(2)}`, cx + sw, y);
        cx += widths[i] + gap;
      }
    }
  }

  renderScene(t) {
    const c = this.sctx, W = this.W, H = this.H;
    let g = c.createLinearGradient(0, 0, 0, H);
    g.addColorStop(0, '#06120e'); g.addColorStop(0.55, '#03100c'); g.addColorStop(1, '#021310');
    c.fillStyle = g; c.fillRect(0, 0, W, H);
    let hg = c.createRadialGradient(W * 0.5, H * 0.6, 0, W * 0.5, H * 0.6, W * 0.75);
    hg.addColorStop(0, 'rgba(22,130,95,0.20)'); hg.addColorStop(1, 'rgba(0,0,0,0)');
    c.fillStyle = hg; c.fillRect(0, 0, W, H);
    for (const b of this.buildings) {
      c.fillStyle = b.color; c.fillRect(b.x, b.y, b.w, H - b.y);
      for (const w of b.wins) {
        const fl = 0.5 + 0.5 * Math.sin(t * w.s + w.ph);
        c.fillStyle = `rgba(${w.col},${(w.base * (0.4 + 0.6 * fl)).toFixed(3)})`;
        c.fillRect(b.x + w.x, b.y + w.y, w.w, w.h);
      }
    }
    c.globalCompositeOperation = 'lighter';
    for (const k of this.bokeh) {
      const fl = 0.7 + 0.3 * Math.sin(t * k.s + k.ph);
      const rg = c.createRadialGradient(k.x, k.y, 0, k.x, k.y, k.r);
      rg.addColorStop(0, `rgba(${k.col},${(k.a * fl).toFixed(3)})`);
      rg.addColorStop(0.5, `rgba(${k.col},${(k.a * fl * 0.35).toFixed(3)})`);
      rg.addColorStop(1, 'rgba(0,0,0,0)');
      c.fillStyle = rg; c.beginPath(); c.arc(k.x, k.y, k.r, 0, 7); c.fill();
    }
    c.globalCompositeOperation = 'source-over';
    this.drawTicker(t, this.band1, this.fs1, this.spd1, this._w1, this._tot1);
    this.drawTicker(t, this.band2, this.fs2, this.spd2, this._w2, this._tot2);
    const top = this.reflTop;
    c.save(); c.globalAlpha = 0.42; c.translate(0, top); c.scale(1, -1);
    c.drawImage(this.scene, 0, Math.max(0, top - (H - top)), W, H - top, 0, -(H - top), W, H - top);
    c.restore();
    let wg = c.createLinearGradient(0, top, 0, H);
    wg.addColorStop(0, 'rgba(2,16,12,0.35)'); wg.addColorStop(1, 'rgba(1,12,10,0.92)');
    c.fillStyle = wg; c.fillRect(0, top, W, H - top);
  }

  drawGem(c, d, zoom, alpha) {
    const r = d.r; if (r < 0.4) return;
    c.save(); c.globalAlpha = alpha;
    c.beginPath(); c.arc(d.x, d.y, r, 0, 7); c.closePath(); c.clip();
    c.translate(d.x, d.y); c.scale(zoom, -zoom); c.translate(-d.x, -d.y);
    c.drawImage(this.scene, 0, 0);
    c.restore();
    c.save(); c.globalAlpha = alpha;
    c.beginPath(); c.arc(d.x, d.y, r, 0, 7);
    c.lineWidth = Math.max(0.6, r * 0.13); c.strokeStyle = 'rgba(0,24,18,0.4)'; c.stroke();
    const hx = d.x - r * 0.34, hy = d.y - r * 0.4;
    const hgr = c.createRadialGradient(hx, hy, 0, hx, hy, r * 0.85);
    hgr.addColorStop(0, 'rgba(205,255,232,0.55)'); hgr.addColorStop(1, 'rgba(255,255,255,0)');
    c.fillStyle = hgr; c.beginPath(); c.arc(d.x, d.y, r, 0, 7); c.fill();
    c.restore();
  }

  step(dt, t) {
    const H = this.H, u = this.u;
    for (const s of this.sliders) {
      if (s.wait > 0) { s.wait -= dt; continue; }
      s.vy += dt * (120 + s.r * 8) * u * 0.5;
      s.vy = Math.min(s.vy, (180 + s.r * 30) * u);
      s.y += s.vy * dt; s.x += Math.sin(t * 2 + s.wob) * 0.25 * u;
      if (Math.random() < dt * 14) {
        this.trail.push({ x: s.x + rnd(-1, 1) * u, y: s.y - s.r, r: rnd(0.6, 0.35 * s.r / u) * u, a: rnd(0.5, 0.9) });
        if (this.trail.length > 240) this.trail.shift();
      }
      if (s.y - s.r > H) { Object.assign(s, this.newSlider()); s.y = -s.r; }
    }
    for (const tr of this.trail) tr.a -= dt * 0.35;
    this.trail = this.trail.filter(tr => tr.a > 0.05);
    for (const f of this.fall) { f.y += f.sp * dt; if (f.y - f.len > H) Object.assign(f, this.newFall(false)); }
  }

  frame(t) {
    const c = this.ctx, W = this.W, H = this.H, u = this.u, cfg = this.cfg;
    this.renderScene(t);
    c.clearRect(0, 0, W, H);
    c.filter = `blur(${cfg.blur}px) brightness(0.74) saturate(1.05)`;
    c.drawImage(this.scene, 0, 0);
    c.filter = 'none';
    c.fillStyle = 'rgba(3,14,11,0.18)'; c.fillRect(0, 0, W, H);
    c.globalCompositeOperation = 'lighter'; c.lineWidth = 1.1 * u;
    for (let i = 0; i < this.fall.length; i++) {
      if (i % 2 === 0) continue;
      const f = this.fall[i];
      c.strokeStyle = `rgba(170,230,210,${f.a * 0.5})`;
      c.beginPath(); c.moveTo(f.x, f.y); c.lineTo(f.x + 2.5 * u, f.y + f.len); c.stroke();
    }
    c.globalCompositeOperation = 'source-over';
    for (const m of this.mist) {
      const mg = c.createRadialGradient(m.x, m.y, 0, m.x, m.y, m.r);
      mg.addColorStop(0, `rgba(190,240,220,${m.a * 0.5})`); mg.addColorStop(1, 'rgba(190,240,220,0)');
      c.fillStyle = mg; c.beginPath(); c.arc(m.x, m.y, m.r, 0, 7); c.fill();
    }
    for (const tr of this.trail) this.drawGem(c, tr, 1.35, tr.a);
    for (const d of this.gems) this.drawGem(c, d, 1.4, 1);
    for (const s of this.sliders) {
      c.save(); c.globalAlpha = 0.3; c.fillStyle = 'rgba(0,10,8,0.6)';
      c.beginPath(); c.ellipse(s.x + s.r * 0.12, s.y + s.r * 0.5, s.r * 0.95, s.r * 1.05, 0, 0, 7); c.fill(); c.restore();
      this.drawGem(c, s, 1.45, 1);
    }
  }
}

export const RainLoader = ({ accentHex, accentShimmer, onComplete, brand = 'myExpenses', holdMs = 2600, fadeMs = 600 }) => {
  const canvasRef = useRef(null);
  const [exiting, setExiting] = useState(false);

  useEffect(() => {
    const cv = canvasRef.current;
    if (!cv) return;
    let scene = new RainScene(cv);
    let last = performance.now(), raf = 0;
    const loop = (now) => {
      let dt = (now - last) / 1000; last = now;
      if (dt > 0.05) dt = 0.05;
      const t = now / 1000;
      scene.step(dt, t); scene.frame(t);
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    const onResize = () => { scene.setup(); };
    window.addEventListener('resize', onResize);

    const t1 = setTimeout(() => setExiting(true), holdMs);
    const t2 = setTimeout(() => onComplete && onComplete(), holdMs + fadeMs);
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener('resize', onResize);
      clearTimeout(t1); clearTimeout(t2);
    };
  }, [onComplete, holdMs, fadeMs]);

  // brand split: "my" light + rest bold (works for the default; any other
  // string just renders light + bold tail at the first lowercase→uppercase seam)
  const m = brand.match(/^([a-z]+)([A-Z].*)$/);
  const head = m ? m[1] : brand;
  const tail = m ? m[2] : '';

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 200, background: '#02080a',
      opacity: exiting ? 0 : 1, transition: `opacity ${fadeMs}ms ease`,
      pointerEvents: exiting ? 'none' : 'auto', overflow: 'hidden',
    }}>
      <style>{`
        @keyframes rl_flicker{0%,100%{opacity:1}3%{opacity:.4}5%{opacity:1}43%{opacity:.7}44%{opacity:1}73%{opacity:.55}74%{opacity:1}}
        @keyframes rl_grain{0%{transform:translate(0,0)}20%{transform:translate(3%,-2%)}40%{transform:translate(4%,2%)}60%{transform:translate(2%,3%)}80%{transform:translate(3%,-4%)}100%{transform:translate(0,0)}}
      `}</style>

      <canvas ref={canvasRef} style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', display: 'block' }} />

      {/* CRT scanlines */}
      <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none', mixBlendMode: 'multiply', opacity: 0.5,
        background: 'repeating-linear-gradient(0deg,rgba(0,0,0,0) 0px,rgba(0,0,0,0) 2px,rgba(0,0,0,0.18) 3px)' }} />
      {/* film grain */}
      <div style={{ position: 'absolute', inset: '-20%', pointerEvents: 'none', opacity: 0.06, mixBlendMode: 'screen',
        animation: 'rl_grain 1.1s steps(6) infinite',
        backgroundImage: "url(\"data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='140' height='140'><filter id='n'><feTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='2'/></filter><rect width='100%25' height='100%25' filter='url(%23n)'/></svg>\")" }} />
      {/* vignette */}
      <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none', boxShadow: 'inset 0 0 220px 60px rgba(0,0,0,0.78)' }} />

      {/* wordmark behind the wet pane */}
      <div style={{ position: 'absolute', inset: 0, display: 'grid', placeItems: 'center', pointerEvents: 'none', textAlign: 'center' }}>
        <div>
          <div style={{
            fontFamily: 'var(--font-display, Helvetica, Arial, sans-serif)', fontWeight: 300,
            fontSize: 'clamp(40px, 8vw, 92px)', letterSpacing: '0.03em', color: '#caffe6',
            filter: 'blur(1.6px)', animation: 'rl_flicker 7s infinite',
            textShadow: `0 0 22px rgba(60,255,170,.55), 0 0 60px ${accentShimmer || 'rgba(40,220,150,.35)'}`,
          }}>{head}<span style={{ fontWeight: 600 }}>{tail}</span></div>
          <div style={{
            fontFamily: MONO, fontSize: 'clamp(10px, 1.2vw, 14px)', letterSpacing: '0.55em',
            color: '#6fe6b4', marginTop: 18, filter: 'blur(.6px)', textShadow: '0 0 12px rgba(60,255,170,.5)',
          }}>LOADING</div>
        </div>
      </div>
    </div>
  );
};

export default RainLoader;
