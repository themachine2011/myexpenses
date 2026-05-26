// =============================================================================
// MeshGradientCanvas — full-viewport WebGL fragment-shader wallpaper for the
// "Mesh Gradient" glass design (id 'H'). Mounted by GlassBackdrop only when
// design === 'H', so the other glass designs pay zero cost.
//
// Layer behavior matches FoggyGlassCanvas:
//   - position: fixed, inset: 0, pointer-events: none, z-index: 0
//   - pauses on document.hidden
//   - respects prefers-reduced-motion (draws one frame and stops)
//
// Shader port of the standalone mesh-gradient.html wallpaper.
// =============================================================================

import React, { useEffect, useRef } from 'react';

function installMeshGradientStyles() {
  if (document.getElementById('__aurum_mesh_gradient_styles')) return;
  const style = document.createElement('style');
  style.id = '__aurum_mesh_gradient_styles';
  style.textContent = `
    .aurum-mesh-gradient-canvas {
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

// 5 colored blobs on Lissajous paths through FBM-warped space.
// `uMode` ∈ {0,1} day/night — night deepens the bg + slightly mutes blobs.
const FS = `
  precision highp float;
  uniform vec2  uRes;
  uniform float uTime;
  uniform vec2  uMouse;
  uniform float uMode;

  float hash(vec2 p){ return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453123); }
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
    for (int i = 0; i < 5; i++){
      v += a * vnoise(p);
      p = R * p * 2.0;
      a *= 0.5;
    }
    return v;
  }

  float blob(vec2 p, vec2 c, float r){
    float d = length(p - c);
    float k = max(0.0, 1.0 - d / r);
    return k * k * (3.0 - 2.0 * k);
  }

  void main(){
    vec2 uv = (gl_FragCoord.xy - 0.5 * uRes) / uRes.y;
    float aspect = uRes.x / uRes.y;
    vec2 lim = vec2(aspect * 0.5, 0.5);

    float t = uTime;

    vec2 warp = vec2(
      fbm(uv * 1.5 + vec2(0.0, t * 0.10)),
      fbm(uv * 1.5 + vec2(3.7, t * 0.08) + 9.1)
    ) - 0.5;
    vec2 p = uv + warp * 0.18;

    vec2 mouse = (uMouse - 0.5) * vec2(aspect, 1.0);

    vec2 c0 = vec2( sin(t*0.21)*lim.x*0.85,  cos(t*0.17)*lim.y*0.80);
    vec2 c1 = vec2( cos(t*0.13)*lim.x*0.70,  sin(t*0.23)*lim.y*0.90);
    vec2 c2 = vec2( sin(t*0.27 + 1.7)*lim.x*0.90, cos(t*0.19 + 0.6)*lim.y*0.70);
    vec2 c3 = vec2( cos(t*0.11 + 2.4)*lim.x*0.80, sin(t*0.15 + 1.2)*lim.y*0.85);
    vec2 c4 = vec2( sin(t*0.09 + 3.1)*lim.x*0.55, cos(t*0.25 + 2.0)*lim.y*0.55);

    c0 += (mouse - c0) * 0.06;
    c2 += (mouse - c2) * 0.04;

    float w0 = blob(p, c0, 0.95);
    float w1 = blob(p, c1, 0.85);
    float w2 = blob(p, c2, 1.05);
    float w3 = blob(p, c3, 0.90);
    float w4 = blob(p, c4, 0.75);

    vec3 A = vec3(0.95, 0.42, 0.55);
    vec3 B = vec3(0.55, 0.40, 0.95);
    vec3 C = vec3(0.35, 0.75, 0.95);
    vec3 D = vec3(0.95, 0.80, 0.45);
    vec3 E = vec3(0.40, 0.92, 0.70);

    A = mix(A, vec3(0.98, 0.55, 0.40), 0.5 + 0.5 * sin(t*0.12));
    C = mix(C, vec3(0.50, 0.60, 1.00), 0.5 + 0.5 * cos(t*0.09));
    E = mix(E, vec3(0.55, 0.95, 0.85), 0.5 + 0.5 * sin(t*0.07 + 1.0));

    float wsum = w0 + w1 + w2 + w3 + w4 + 1e-4;
    vec3 col = (A*w0 + B*w1 + C*w2 + D*w3 + E*w4) / wsum;

    float density = clamp(wsum * 0.55, 0.0, 1.0);
    vec3 deep = mix(vec3(0.04, 0.04, 0.09), vec3(0.02, 0.02, 0.05), uMode);
    col = mix(deep, col, density);

    float grain = (hash(gl_FragCoord.xy + t) - 0.5) * 0.025;
    col += grain;

    float vig = smoothstep(1.35, 0.30, length(uv));
    col *= mix(0.78, 1.0, vig);

    col = col / (1.0 + col * 0.20);

    // night dampens saturation a touch
    float lum = dot(col, vec3(0.299, 0.587, 0.114));
    col = mix(col, mix(col, vec3(lum), 0.18) * 0.86, uMode);

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
      console.error('[mesh-gradient shader]', gl.getShaderInfoLog(s));
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
      tx = 0.5 + 0.30 * Math.sin(t * 0.11 + 0.7);
      ty = 0.5 + 0.30 * Math.cos(t * 0.14 + 1.3);
    }
    mx += (tx - mx) * 0.035;
    my += (ty - my) * 0.035;

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

export default function MeshGradientCanvas({ mode = 'day' }) {
  const canvasRef = useRef(null);
  const modeRef   = useRef(mode);
  modeRef.current = mode;

  useEffect(() => { installMeshGradientStyles(); }, []);

  useEffect(() => {
    if (!canvasRef.current) return;
    const teardown = startEngine(canvasRef.current, () => modeRef.current);
    return teardown;
  }, []);

  return (
    <canvas
      ref={canvasRef}
      className="aurum-mesh-gradient-canvas"
      aria-hidden="true"
    />
  );
}
