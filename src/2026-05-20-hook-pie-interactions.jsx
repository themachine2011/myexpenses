import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Sector } from 'recharts';

export const PIE_CONTINUOUS_SPIN_SECONDS = 75;
export const PIE_MANUAL_STEP_DEG = 1;
export const PIE_MANUAL_SPIN_MS = 100;

const PIE_ROTATION_STYLE_ID = 'pie-chart-rotation-styles';
const PIE_WHEEL_PIXEL_THRESHOLD = 24;
const PIE_MANUAL_EASING = 'cubic-bezier(0.22, 1, 0.36, 1)';

const ensurePieRotationStyles = () => {
  if (typeof document === 'undefined' || document.getElementById(PIE_ROTATION_STYLE_ID)) return;
  const style = document.createElement('style');
  style.id = PIE_ROTATION_STYLE_ID;
  style.textContent = `
@keyframes pieContinuousSpin {
  from { rotate: 0deg; }
  to { rotate: 360deg; }
}

.pie-rotation-root .recharts-pie {
  transform-box: fill-box;
  transform-origin: center center;
  will-change: transform;
  animation: pieContinuousSpin var(--pie-continuous-spin-duration, ${PIE_CONTINUOUS_SPIN_SECONDS}s) linear infinite;
  animation-play-state: var(--pie-rotation-play-state, running);
  transform: rotate(var(--pie-manual-rotation-deg, 0deg));
  transition: transform var(--pie-manual-spin-duration, ${PIE_MANUAL_SPIN_MS}ms) var(--pie-manual-spin-easing, ${PIE_MANUAL_EASING});
}

@media (prefers-reduced-motion: reduce) {
  .pie-rotation-root .recharts-pie {
    animation: none;
    transition-duration: 50ms;
  }
}
`;
  document.head.appendChild(style);
};

const getNormalizedWheelDelta = (event) => {
  const scale =
    event.deltaMode === 1 ? 16 :
    event.deltaMode === 2 ? window.innerHeight || 800 :
    1;
  return event.deltaY * scale;
};

export const BlackOutlineActiveShape = (props) => {
  const { cx, cy, innerRadius, outerRadius, startAngle, endAngle, fill } = props;
  const activeOuterRadius = outerRadius + Math.max(4, outerRadius * 0.04);
  return (
    <g>
      <Sector
        cx={cx} cy={cy}
        innerRadius={innerRadius}
        outerRadius={activeOuterRadius}
        startAngle={startAngle}
        endAngle={endAngle}
        fill={fill}
        stroke="#000000"
        strokeWidth={2.5}
        style={{
          filter: `drop-shadow(0 0 12px ${fill}88)`,
          transition: 'filter 180ms ease-out',
        }}
      />
    </g>
  );
};

export const ExpensePieActiveShape = (props) => {
  const { cx, cy, innerRadius, outerRadius, startAngle, endAngle, fill } = props;
  const activeOuterRadius = outerRadius + Math.max(5, outerRadius * 0.05);
  return (
    <g>
      <Sector
        cx={cx} cy={cy}
        innerRadius={innerRadius}
        outerRadius={activeOuterRadius}
        startAngle={startAngle}
        endAngle={endAngle}
        fill={fill}
        stroke="#000000"
        strokeWidth={2.5}
        style={{
          filter: `drop-shadow(0 0 14px ${fill}AA)`,
          transition: 'filter 180ms ease-out',
        }}
      />
    </g>
  );
};

export const usePieChartRotation = () => {
  const containerRef = useRef(null);
  const wheelAccumRef = useRef(0);
  const lastWheelDirectionRef = useRef(0);
  const pendingRotationRef = useRef(0);
  const frameRef = useRef(null);
  const [active, setActive] = useState(false);
  const [rotationDeg, setRotationDeg] = useState(0);
  const [isVisible, setIsVisible] = useState(true);
  const [isPageVisible, setIsPageVisible] = useState(() =>
    typeof document === 'undefined' ? true : document.visibilityState !== 'hidden'
  );
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(false);

  useEffect(() => {
    ensurePieRotationStyles();
  }, []);

  useEffect(() => {
    const onPointerDown = (e) => {
      if (!containerRef.current?.contains(e.target)) setActive(false);
    };
    document.addEventListener('pointerdown', onPointerDown);
    return () => document.removeEventListener('pointerdown', onPointerDown);
  }, []);

  useEffect(() => {
    if (typeof window === 'undefined' || !window.matchMedia) return undefined;
    const query = window.matchMedia('(prefers-reduced-motion: reduce)');
    const sync = () => setPrefersReducedMotion(query.matches);
    sync();
    query.addEventListener?.('change', sync);
    return () => query.removeEventListener?.('change', sync);
  }, []);

  useEffect(() => {
    if (typeof document === 'undefined') return undefined;
    const sync = () => setIsPageVisible(document.visibilityState !== 'hidden');
    document.addEventListener('visibilitychange', sync);
    return () => document.removeEventListener('visibilitychange', sync);
  }, []);

  const flushRotation = useCallback(() => {
    frameRef.current = null;
    const next = pendingRotationRef.current;
    pendingRotationRef.current = 0;
    if (next) setRotationDeg((value) => value + next);
  }, []);

  const queueRotation = useCallback((direction) => {
    pendingRotationRef.current += direction * PIE_MANUAL_STEP_DEG;
    if (frameRef.current == null) frameRef.current = requestAnimationFrame(flushRotation);
  }, [flushRotation]);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return undefined;
    const onWheel = (e) => {
      const delta = getNormalizedWheelDelta(e);
      if (!delta) return;
      e.preventDefault();
      setActive(true);

      const direction = delta < 0 ? 1 : -1;
      if (lastWheelDirectionRef.current !== direction) {
        wheelAccumRef.current = 0;
        lastWheelDirectionRef.current = direction;
      }

      const magnitude = Math.abs(delta);
      if (magnitude >= PIE_WHEEL_PIXEL_THRESHOLD) {
        wheelAccumRef.current = 0;
        queueRotation(direction);
        return;
      }

      wheelAccumRef.current += magnitude;
      if (wheelAccumRef.current >= PIE_WHEEL_PIXEL_THRESHOLD) {
        wheelAccumRef.current = 0;
        queueRotation(direction);
      }
    };
    el.addEventListener('wheel', onWheel, { passive: false });
    return () => el.removeEventListener('wheel', onWheel);
  }, [queueRotation]);

  useEffect(() => {
    const el = containerRef.current;
    if (!el || typeof IntersectionObserver === 'undefined') return undefined;
    const obs = new IntersectionObserver((entries) => {
      setIsVisible(entries[0]?.isIntersecting ?? true);
    }, { threshold: 0.05 });
    obs.observe(el);
    return () => obs.disconnect();
  }, []);

  useEffect(() => {
    return () => {
      if (frameRef.current != null) cancelAnimationFrame(frameRef.current);
    };
  }, []);

  const containerProps = {
    className: 'pie-rotation-root',
    onClick: () => setActive(true),
    onPointerEnter: () => setActive(true),
    onPointerLeave: () => setActive(false),
    onFocus: () => setActive(true),
    onBlur: () => setActive(false),
    onKeyDown: (e) => { if (e.key === 'Enter' || e.key === ' ') setActive(true); },
    role: 'button',
    tabIndex: 0,
    style: {
      '--pie-manual-rotation-deg': `${rotationDeg}deg`,
      '--pie-continuous-spin-duration': `${PIE_CONTINUOUS_SPIN_SECONDS}s`,
      '--pie-manual-spin-duration': prefersReducedMotion ? '50ms' : `${PIE_MANUAL_SPIN_MS}ms`,
      '--pie-manual-spin-easing': PIE_MANUAL_EASING,
      '--pie-rotation-play-state': isVisible && isPageVisible ? 'running' : 'paused',
    },
  };

  return {
    containerRef,
    containerProps,
    active,
    rotationDeg,
    prefersReducedMotion,
  };
};

export const usePieInteractions = () => {
  const rotation = usePieChartRotation();
  const [hoverIndex, setHoverIndex] = useState(null);

  const pieHoverProps = {
    activeIndex: hoverIndex != null ? hoverIndex : -1,
    onMouseEnter: (_, i) => setHoverIndex(i),
    onMouseLeave: () => setHoverIndex(null),
  };

  return {
    ...rotation,
    pieHoverProps,
    hoverIndex,
    setHoverIndex,
  };
};
