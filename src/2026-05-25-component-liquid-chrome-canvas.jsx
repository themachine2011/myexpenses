// =============================================================================
// LiquidChromeCanvas — full-viewport WebGL fragment-shader wallpaper for the
// "Liquid Chrome" glass design (id 'G'). Mounted by GlassBackdrop only when
// design === 'G', so the other glass designs pay zero cost.
//
// Layer behavior matches FoggyGlassCanvas:
//   - position: fixed, inset: 0, pointer-events: none, z-index: 0
//   - mounts BETWEEN .aurum-glass-bg-layer and the app's cards
//   - pauses on document.hidden
//   - respects prefers-reduced-motion (draws one frame and stops)
//
// Shader port of the standalone liquid-chrome.html wallpaper.
// =============================================================================

import React, { useEffect, useRef } from 'react';

function installLiquidChromeStyles() {
  if (document.getElementById('__aurum_liquid_chrome_styles')) return;
  const style = document.createElement('style');
  style.id = '__aurum_liquid_chrome_styles';
  style.textContent = `
    .aurum-liquid-chrome-canvas {
      position: fixed;
      inset: 0;
      width: 100%;
      height: 100%;
      pointer-events: none;
      z-index: 0;
      display: block;
    }
  `;
  document.head.appendChild(style);
}

const VS = `
  attribute vec2 a;
  void main() { gl_Position = vec4(a, 0.0, 1.0); }
`;

// Layered FBM noise → fake normal → reflective chrome with chromatic shimmer.
// `uMode` ∈ {0,1} for day/night: night dims the env + cools it slightly.
const FS = `
  precision highp float;
  uniform vec2  uRes;
  uniform float uTime;
  uniform vec2  uMouse; // 0..1, eased
  uniform float uMode;  // 0 = day, 1 = night

  float hash(vec2 p){ return fract(sin(dot(p, vec2(127.1,311.7))) * 43758.5453123); }
  float vnoise(vec2 p){
    vec2 i = floor(p), f = fract(p);
    float a = hash(i);
    float b = hash(i + vec2(1.0, 0.0));
    float c = hash(i + vec2(0.0, 1.0));
    float d = hash(i + vec2(1.0, 1.0));
    vec2 u = f*f*(3.0 - 2.0*f);
    return mix(a,b,u.x) + (c-a)*u.y*(1.0-u.x) + (d-b)*u.x*u.y;
  }
  float fbm(vec2 p){
    float v = 0.0, a = 0.5;
    mat2 R = mat2(0.8, -0.6, 0.6, 0.8);
    for (int i = 0; i < 6; i++) {
      v += a * vnoise(p);
      p = R * p * 2.02;
      a *= 0.5;
    }
    return v;
  }

  float field(vec2 p, float t){
    vec2 q = vec2(fbm(p + vec2(0.0,  t*0.08)),
                  fbm(p + vec2(5.2,  t*0.10) + 1.3));
    vec2 r = vec2(fbm(p + 3.7*q + vec2(1.7, 9.2) + t*0.06),
                  fbm(p + 3.1*q + vec2(8.3, 2.8) - t*0.07));
    return fbm(p + 2.4*r);
  }

  vec3 envSample(vec2 dir){
    float a = atan(dir.y, dir.x);
    float r = length(dir);
    float horizon = smoothstep(0.6, 0.0, abs(dir.y - 0.05));
    float sky = smoothstep(-1.0, 1.0, dir.y);
    vec3 cool = vec3(0.62, 0.70, 0.85);
    vec3 warm = vec3(0.95, 0.88, 0.78);
    vec3 floorC = vec3(0.10, 0.11, 0.13);
    vec3 base = mix(floorC, mix(cool, warm, 0.5 + 0.5*sin(a*2.0)), sky);
    base += horizon * vec3(1.10, 1.05, 0.95) * 0.55;
    base *= 0.85 + 0.15 * sin(a*8.0 + r*3.0);
    return base;
  }

  void main(){
    vec2 uv = (gl_FragCoord.xy - 0.5*uRes) / uRes.y;
    float t = uTime;

    vec2 par = (uMouse - 0.5) * 0.20;
    vec2 p = uv * 1.35 + par;

    float e = 0.0025;
    float n  = field(p,            t);
    float nx = field(p + vec2(e,0.), t);
    float ny = field(p + vec2(0.,e), t);
    vec2  grad = vec2(nx - n, ny - n) / e;

    vec3 N = normalize(vec3(-grad * 0.55, 1.0));
    vec3 V = normalize(vec3(uv * 0.6 - par*0.5, 1.0));
    vec3 R = reflect(-V, N);

    float disp = 0.020 + 0.020 * n;
    vec3 col;
    col.r = envSample(R.xy + vec2( disp,  disp*0.4)).r;
    col.g = envSample(R.xy).g;
    col.b = envSample(R.xy - vec2( disp,  disp*0.4)).b;

    float fres = pow(1.0 - max(N.z, 0.0), 2.4);
    col += fres * vec3(0.85, 0.90, 1.05) * 0.30;

    vec3 L = normalize(vec3(0.4*sin(t*0.25), 0.5 + 0.3*cos(t*0.2), 0.8));
    float spec = pow(max(dot(reflect(-L, N), V), 0.0), 60.0);
    col += spec * vec3(1.0, 0.98, 0.92) * 0.9;

    col *= 0.92;
    col = col / (1.0 + col * 0.35);

    float vig = smoothstep(1.25, 0.25, length(uv));
    col *= mix(0.78, 1.0, vig);

    float lum = dot(col, vec3(0.299, 0.587, 0.114));
    col = mix(vec3(lum), col, 0.85);

    // Night: cooler + dimmer
    vec3 night = col * vec3(0.78, 0.84, 0.95) * 0.78;
    col = mix(col, night, uMode);

    gl_FragColor = vec4(col, 1.0);
  }
`;

function startEngine(canvas, getMode) {
  const gl = canvas.getContext('webgl', { antialias: false, premultipliedAlpha: false });
  if (!gl) return () => {};

  function compile(type, src) {
    const s = gl.createShader(type);
    gl.shaderSource(s, src);
    gl.compileShader(s);
    if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) {
      // eslint-disable-next-line no-console
      console.error('[liquid-chrome shader]', gl.getShaderInfoLog(s));
      return null;
    }
    return s;
  }
  const vs = compile(gl.VERTEX_SHADER, VS);
  const fs = compile(gl.FRAGMENT_SHADER, FS);
  if (!vs || !fs) return () => {};

  const prog = gl.createProgram();
  gl.attachShader(prog, vs);
  gl.attachShader(prog, fs);
  gl.linkProgram(prog);
  gl.useProgram(prog);

  const buf = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, buf);
  gl.bufferData(
    gl.ARRAY_BUFFER,
    new Float32Array([-1,-1, 1,-1, -1,1, -1,1, 1,-1, 1,1]),
    gl.STATIC_DRAW
  );
  const a = gl.getAttribLocation(prog, 'a');
  gl.enableVertexAttribArray(a);
  gl.vertexAttribPointer(a, 2, gl.FLOAT, false, 0, 0);

  const uRes   = gl.getUniformLocation(prog, 'uRes');
  const uTime  = gl.getUniformLocation(prog, 'uTime');
  const uMouse = gl.getUniformLocation(prog, 'uMouse');
  const uMode  = gl.getUniformLocation(prog, 'uMode');

  let mx = 0.5, my = 0.5, tx = 0.5, ty = 0.5, lastMove = -1e6;
  const onPointer = (e) => {
    tx = e.clientX / window.innerWidth;
    ty = e.clientY / window.innerHeight;
    lastMove = performance.now();
  };
  window.addEventListener('pointermove', onPointer, { passive: true });

  function resize() {
    const dpr = Math.min(window.devicePixelRatio || 1, 1.5);
    canvas.width  = Math.max(1, Math.floor(window.innerWidth  * dpr));
    canvas.height = Math.max(1, Math.floor(window.innerHeight * dpr));
    gl.viewport(0, 0, canvas.width, canvas.height);
  }
  const onResize = () => resize();
  window.addEventListener('resize', onResize);
  resize();

  let stopped = false;
  let paused = document.hidden;
  const onVis = () => { paused = document.hidden; };
  document.addEventListener('visibilitychange', onVis);

  const reduce = window.matchMedia
    && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  const start = performance.now();
  let rafId = 0;

  function drawOnce(t) {
    gl.uniform2f(uRes, canvas.width, canvas.height);
    gl.uniform1f(uTime, t);
    gl.uniform2f(uMouse, mx, 1.0 - my);
    gl.uniform1f(uMode, getMode() === 'night' ? 1.0 : 0.0);
    gl.drawArrays(gl.TRIANGLES, 0, 6);
  }

  function frame(now) {
    if (stopped) return;
    if (paused) { rafId = requestAnimationFrame(frame); return; }
    const t = (now - start) / 1000;

    const idle = (now - lastMove) > 1500;
    if (idle) {
      tx = 0.5 + 0.35 * Math.sin(t * 0.13);
      ty = 0.5 + 0.30 * Math.cos(t * 0.17);
    }
    mx += (tx - mx) * 0.04;
    my += (ty - my) * 0.04;

    drawOnce(t);
    rafId = requestAnimationFrame(frame);
  }

  if (reduce) {
    drawOnce(0);
  } else {
    rafId = requestAnimationFrame(frame);
  }

  return () => {
    stopped = true;
    cancelAnimationFrame(rafId);
    window.removeEventListener('resize', onResize);
    window.removeEventListener('pointermove', onPointer);
    document.removeEventListener('visibilitychange', onVis);
    // Best-effort GL cleanup
    try {
      gl.deleteProgram(prog);
      gl.deleteShader(vs);
      gl.deleteShader(fs);
      gl.deleteBuffer(buf);
      const ext = gl.getExtension('WEBGL_lose_context');
      if (ext) ext.loseContext();
    } catch (_) {}
  };
}

export default function LiquidChromeCanvas({ mode = 'day' }) {
  const canvasRef = useRef(null);
  const modeRef   = useRef(mode);
  modeRef.current = mode;

  useEffect(() => { installLiquidChromeStyles(); }, []);

  useEffect(() => {
    if (!canvasRef.current) return;
    const teardown = startEngine(canvasRef.current, () => modeRef.current);
    return teardown;
  }, []);

  return (
    <canvas
      ref={canvasRef}
      className="aurum-liquid-chrome-canvas"
      aria-hidden="true"
    />
  );
}
