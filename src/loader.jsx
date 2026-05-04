import React, { useRef, useEffect, useState } from 'react';
import * as THREE from 'three';

export const AurumToken3D = ({ mode = 'loader', accentHex = '#E0A899', onReady }) => {
  const mountRef  = useRef(null);
  const stateRef  = useRef({});
  const [, setReady] = useState(false);

  useEffect(() => {
    if (!mountRef.current) return;
    const T = THREE;
    const mount = mountRef.current;
    const w0 = mount.clientWidth, h0 = mount.clientHeight;

    const scene = new T.Scene();
    const camera = new T.PerspectiveCamera(38, w0 / h0, 0.1, 100);
    camera.position.set(0, 0, 6.2);

    const renderer = new T.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setSize(w0, h0);
    renderer.setClearColor(0x000000, 0);
    mount.appendChild(renderer.domElement);

    const tokenGroup = new T.Group();
    scene.add(tokenGroup);

    const radius = 1.55, thickness = 0.18;
    const discGeom = new T.CylinderGeometry(radius, radius, thickness, 128, 1);

    const accentColor = new T.Color(accentHex);
    const bodyMat = new T.MeshStandardMaterial({
      color: 0x14141a,
      metalness: 0.82,
      roughness: 0.32,
      envMapIntensity: 1.0,
    });
    const disc = new T.Mesh(discGeom, bodyMat);
    disc.rotation.x = Math.PI / 2;
    tokenGroup.add(disc);

    const ringGeom = new T.RingGeometry(radius * 0.78, radius * 0.92, 96);
    const ringMat  = new T.MeshStandardMaterial({
      color: accentColor, metalness: 1.0, roughness: 0.18,
      side: T.DoubleSide, emissive: accentColor.clone().multiplyScalar(0.05),
    });
    const ringFront = new T.Mesh(ringGeom, ringMat);
    ringFront.position.z = thickness / 2 + 0.001;
    tokenGroup.add(ringFront);
    const ringBack = new T.Mesh(ringGeom, ringMat);
    ringBack.position.z = -thickness / 2 - 0.001;
    ringBack.rotation.y = Math.PI;
    tokenGroup.add(ringBack);

    const medGeom = new T.CylinderGeometry(radius * 0.74, radius * 0.74, thickness * 1.04, 96);
    const medMat = new T.MeshStandardMaterial({
      color: 0x1c1c22, metalness: 0.7, roughness: 0.4,
    });
    const med = new T.Mesh(medGeom, medMat);
    med.rotation.x = Math.PI / 2;
    tokenGroup.add(med);

    const buildMonogram = () => {
      const grp = new T.Group();
      const matEng = new T.MeshStandardMaterial({
        color: accentColor, metalness: 1.0, roughness: 0.22,
        emissive: accentColor.clone().multiplyScalar(0.08),
      });
      const outer = new T.Shape();
      const w = 0.95, hgt = 1.0;
      outer.moveTo(0, hgt/2);
      outer.lineTo(w/2, -hgt/2);
      outer.lineTo(-w/2, -hgt/2);
      outer.lineTo(0, hgt/2);
      const inner = new T.Path();
      const sw = 0.62, sh = 0.62;
      inner.moveTo(0, sh/2);
      inner.lineTo(sw/2, -sh/2);
      inner.lineTo(-sw/2, -sh/2);
      inner.lineTo(0, sh/2);
      outer.holes.push(inner);
      const triGeom = new T.ExtrudeGeometry(outer, { depth: 0.06, bevelEnabled: true, bevelThickness: 0.012, bevelSize: 0.012, bevelSegments: 4 });
      const tri = new T.Mesh(triGeom, matEng);
      grp.add(tri);
      const barGeom = new T.BoxGeometry(0.42, 0.08, 0.06);
      const bar = new T.Mesh(barGeom, matEng);
      bar.position.y = -0.08;
      bar.position.z = 0.03;
      grp.add(bar);
      return grp;
    };
    const monoFront = buildMonogram();
    monoFront.position.z = thickness / 2 + 0.02;
    tokenGroup.add(monoFront);
    const monoBack = buildMonogram();
    monoBack.position.z = -thickness / 2 - 0.02;
    monoBack.rotation.y = Math.PI;
    tokenGroup.add(monoBack);

    const buildArcDots = (count = 64) => {
      const grp = new T.Group();
      const dotGeom = new T.SphereGeometry(0.018, 8, 8);
      const dotMat = new T.MeshStandardMaterial({ color: accentColor, metalness: 1.0, roughness: 0.25 });
      const r = radius * 0.66;
      for (let i = 0; i < count; i++) {
        const a = (i / count) * Math.PI * 2;
        const m = new T.Mesh(dotGeom, dotMat);
        m.position.set(Math.cos(a) * r, Math.sin(a) * r, 0);
        grp.add(m);
      }
      return grp;
    };
    const arcF = buildArcDots(72);
    arcF.position.z = thickness / 2 + 0.012;
    tokenGroup.add(arcF);
    const arcB = buildArcDots(72);
    arcB.position.z = -thickness / 2 - 0.012;
    tokenGroup.add(arcB);

    const knurlGroup = new T.Group();
    const knurlGeom = new T.BoxGeometry(0.04, thickness * 0.92, 0.04);
    const knurlMat  = new T.MeshStandardMaterial({ color: 0x202028, metalness: 0.85, roughness: 0.35 });
    const ridges = 96;
    for (let i = 0; i < ridges; i++) {
      const a = (i / ridges) * Math.PI * 2;
      const k = new T.Mesh(knurlGeom, knurlMat);
      k.position.set(Math.cos(a) * (radius + 0.005), 0, Math.sin(a) * (radius + 0.005));
      k.lookAt(0, 0, 0);
      knurlGroup.add(k);
    }
    tokenGroup.add(knurlGroup);

    const ambient = new T.AmbientLight(0xffffff, 0.35);
    scene.add(ambient);
    const key = new T.DirectionalLight(0xffffff, 1.4);
    key.position.set(4, 6, 6);
    scene.add(key);
    const rim = new T.DirectionalLight(accentColor, 1.1);
    rim.position.set(-5, 2, -3);
    scene.add(rim);
    const fill = new T.PointLight(0xffe9d8, 0.9, 20);
    fill.position.set(2, -3, 4);
    scene.add(fill);

    const hemi = new T.HemisphereLight(0xffd9c2, 0x1a1820, 0.5);
    scene.add(hemi);

    const s = stateRef.current;
    s.spinSpeed = 0.012;
    s.targetZ = 6.2;
    s.zNow = 6.2;
    s.tiltX = 0; s.tiltY = 0;
    s.targetTiltX = 0; s.targetTiltY = 0;
    s.freeRot = { x: 0, y: 0 };
    s.useFreeRot = false;
    s.dragging = null;
    s.last = { x: 0, y: 0 };
    s.autoSpin = true;
    s.modeRef = mode;

    const dom = renderer.domElement;
    dom.style.cursor = 'grab';
    dom.style.touchAction = 'none';
    const onContext = (e) => e.preventDefault();
    dom.addEventListener('contextmenu', onContext);

    const onPointerDown = (e) => {
      if (s.modeRef === 'header') return;
      dom.setPointerCapture(e.pointerId);
      s.last.x = e.clientX; s.last.y = e.clientY;
      if (e.button === 2) {
        s.dragging = 'right';
        s.useFreeRot = true;
        s.autoSpin = false;
      } else {
        s.dragging = 'left';
      }
      dom.style.cursor = 'grabbing';
    };
    const onPointerMove = (e) => {
      if (!s.dragging) return;
      const dx = e.clientX - s.last.x;
      const dy = e.clientY - s.last.y;
      s.last.x = e.clientX; s.last.y = e.clientY;
      if (s.dragging === 'right') {
        s.freeRot.y += dx * 0.01;
        s.freeRot.x += dy * 0.01;
      } else {
        s.targetTiltX = THREE.MathUtils.clamp(s.targetTiltX + dy * 0.0035, -0.4, 0.4);
        s.targetTiltY = THREE.MathUtils.clamp(s.targetTiltY + dx * 0.0035, -0.4, 0.4);
      }
    };
    const onPointerUp = (e) => {
      try { dom.releasePointerCapture(e.pointerId); } catch (_) {}
      s.dragging = null;
      dom.style.cursor = 'grab';
      s.targetTiltX *= 0.4; s.targetTiltY *= 0.4;
    };
    const onWheel = (e) => {
      if (s.modeRef === 'header') return;
      e.preventDefault();
      s.targetZ = THREE.MathUtils.clamp(s.targetZ + e.deltaY * 0.005, 3.4, 10);
    };

    dom.addEventListener('pointerdown', onPointerDown);
    window.addEventListener('pointermove', onPointerMove);
    window.addEventListener('pointerup',   onPointerUp);
    dom.addEventListener('wheel', onWheel, { passive: false });

    let raf = 0;
    const animate = () => {
      raf = requestAnimationFrame(animate);

      s.zNow += (s.targetZ - s.zNow) * 0.08;
      camera.position.z = s.zNow;

      s.tiltX += (s.targetTiltX - s.tiltX) * 0.12;
      s.tiltY += (s.targetTiltY - s.tiltY) * 0.12;

      if (s.modeRef === 'header') {
        tokenGroup.rotation.y += 0.018;
        tokenGroup.rotation.x = 0.18;
        tokenGroup.rotation.z = 0;
      } else if (s.useFreeRot) {
        tokenGroup.rotation.x = s.freeRot.x;
        tokenGroup.rotation.y = s.freeRot.y;
        tokenGroup.rotation.z = 0;
      } else {
        if (s.autoSpin) tokenGroup.rotation.y += s.spinSpeed;
        tokenGroup.rotation.x = s.tiltX;
        tokenGroup.rotation.z = -s.tiltY * 0.4;
      }

      renderer.render(scene, camera);
    };
    animate();

    const ro = new ResizeObserver(() => {
      const w = mount.clientWidth, hgt = mount.clientHeight;
      camera.aspect = w / hgt; camera.updateProjectionMatrix();
      renderer.setSize(w, hgt);
    });
    ro.observe(mount);

    setReady(true);
    onReady && onReady();

    return () => {
      cancelAnimationFrame(raf);
      ro.disconnect();
      dom.removeEventListener('contextmenu', onContext);
      dom.removeEventListener('pointerdown', onPointerDown);
      window.removeEventListener('pointermove', onPointerMove);
      window.removeEventListener('pointerup',   onPointerUp);
      dom.removeEventListener('wheel', onWheel);
      mount.removeChild(renderer.domElement);
      discGeom.dispose(); ringGeom.dispose(); medGeom.dispose(); knurlGeom.dispose();
      bodyMat.dispose(); ringMat.dispose(); medMat.dispose(); knurlMat.dispose();
      renderer.dispose();
    };
  }, [accentHex]);

  useEffect(() => { if (stateRef.current) stateRef.current.modeRef = mode; }, [mode]);

  return <div ref={mountRef} style={{ position: 'absolute', inset: 0, width: '100%', height: '100%' }} />;
};

export const AurumLoader = ({ accentHex, accentShimmer, onComplete }) => {
  const [mouse, setMouse] = useState({ x: 0.5, y: 0.5 });
  const [exiting, setExiting] = useState(false);
  const overlayRef = useRef(null);

  useEffect(() => {
    const onMove = (e) => {
      const r = overlayRef.current?.getBoundingClientRect();
      if (!r) return;
      setMouse({ x: (e.clientX - r.left) / r.width, y: (e.clientY - r.top) / r.height });
    };
    window.addEventListener('pointermove', onMove);
    const id = setTimeout(() => setExiting(true), 2400);
    const id2 = setTimeout(() => onComplete && onComplete(), 3000);
    return () => { window.removeEventListener('pointermove', onMove); clearTimeout(id); clearTimeout(id2); };
  }, [onComplete]);

  const haloX = (mouse.x * 100).toFixed(1);
  const haloY = (mouse.y * 100).toFixed(1);
  const halo = `
    radial-gradient(circle at ${haloX}% ${haloY}%, ${accentShimmer}80 0%, transparent 22%),
    radial-gradient(circle at ${(100-haloX)}% ${haloY}%, #B8C9F4aa 0%, transparent 28%),
    radial-gradient(circle at ${haloX}% ${(100-haloY)}%, #D9A8C8aa 0%, transparent 28%)
  `;

  return (
    <div
      ref={overlayRef}
      style={{
        position:'fixed', inset:0, zIndex:200,
        background:'radial-gradient(circle at 50% 45%, #0F0F12 0%, #050507 70%)',
        display:'grid', placeItems:'center',
        opacity: exiting ? 0 : 1,
        transition: 'opacity 600ms ease',
        pointerEvents: exiting ? 'none' : 'auto',
        overflow: 'hidden',
      }}
    >
      <div style={{ position:'absolute', inset:0, pointerEvents:'none', mixBlendMode:'screen', background: halo, opacity: 0.7, filter: 'blur(20px)' }} />
      <div style={{ position:'absolute', inset:0, background:'radial-gradient(circle at 50% 60%, transparent 30%, rgba(0,0,0,0.7) 100%)', pointerEvents:'none' }} />

      <div style={{
        position:'relative',
        width: 'min(70vmin, 560px)', height: 'min(70vmin, 560px)',
        filter: `drop-shadow(0 30px 60px ${accentHex}30) drop-shadow(0 10px 30px rgba(0,0,0,0.6))`,
      }}>
        <AurumToken3D mode="loader" accentHex={accentHex} />
      </div>

      <div style={{
        position:'absolute', bottom: '12%', left: 0, right: 0,
        textAlign:'center', color:'#F2EDE6',
      }}>
        <div style={{
          fontFamily: 'var(--font-display)', fontSize: 38, fontWeight: 700,
          letterSpacing: '0.06em', color: '#F2EDE6',
        }}>Aurum</div>
        <div style={{
          fontFamily: 'var(--font-mono)', fontSize: 11, letterSpacing: '0.4em',
          textTransform:'uppercase', color: '#9A938A', marginTop: 8,
        }}>Right-click & drag · Scroll to zoom</div>
      </div>
    </div>
  );
};
