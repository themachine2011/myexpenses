import React, { useEffect, useRef, useState } from 'react';
import { Sector } from 'recharts';

export const PIE_AUTO_SPIN_STEP_DEG = 22.5;
export const PIE_AUTO_SPIN_INTERVAL_MS = 30000;
export const PIE_WHEEL_STEP_DEG = 180;

export const BlackOutlineActiveShape = (props) => {
  const { cx, cy, innerRadius, outerRadius, startAngle, endAngle, fill } = props;
  return (
    <g>
      <Sector
        cx={cx} cy={cy}
        innerRadius={innerRadius}
        outerRadius={outerRadius + 6}
        startAngle={startAngle}
        endAngle={endAngle}
        fill={fill}
        stroke="#000000"
        strokeWidth={2.5}
        style={{ filter: `drop-shadow(0 0 12px ${fill}88)` }}
      />
    </g>
  );
};

export const ExpensePieActiveShape = (props) => {
  const { cx, cy, innerRadius, outerRadius, startAngle, endAngle, fill } = props;
  return (
    <g>
      <Sector
        cx={cx} cy={cy}
        innerRadius={innerRadius}
        outerRadius={outerRadius + 22}
        startAngle={startAngle}
        endAngle={endAngle}
        fill={fill}
        stroke="#000000"
        strokeWidth={2.5}
        style={{ filter: `drop-shadow(0 0 18px ${fill})` }}
      />
      <Sector
        cx={cx} cy={cy}
        innerRadius={outerRadius + 26}
        outerRadius={outerRadius + 30}
        startAngle={startAngle}
        endAngle={endAngle}
        fill={fill}
        opacity={0.35}
      />
    </g>
  );
};

export const usePieInteractions = ({ baseStartAngle = 90, baseEndAngle = -270 } = {}) => {
  const containerRef = useRef(null);
  const activeRef = useRef(false);
  const visibleRef = useRef(true);
  const [active, setActive] = useState(false);
  const [rotation, setRotation] = useState(0);
  const [hoverIndex, setHoverIndex] = useState(null);

  useEffect(() => { activeRef.current = active; }, [active]);

  useEffect(() => {
    const onPointerDown = (e) => {
      if (!containerRef.current?.contains(e.target)) setActive(false);
    };
    document.addEventListener('pointerdown', onPointerDown);
    return () => document.removeEventListener('pointerdown', onPointerDown);
  }, []);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return undefined;
    const onWheel = (e) => {
      if (!activeRef.current) return;
      e.preventDefault();
      const delta = e.deltaY > 0 ? PIE_WHEEL_STEP_DEG : -PIE_WHEEL_STEP_DEG;
      setRotation((r) => r + delta);
    };
    el.addEventListener('wheel', onWheel, { passive: false });
    return () => el.removeEventListener('wheel', onWheel);
  }, []);

  useEffect(() => {
    const el = containerRef.current;
    if (!el || typeof IntersectionObserver === 'undefined') return undefined;
    const obs = new IntersectionObserver((entries) => {
      visibleRef.current = entries[0]?.isIntersecting ?? true;
    }, { threshold: 0.05 });
    obs.observe(el);
    return () => obs.disconnect();
  }, []);

  useEffect(() => {
    const id = setInterval(() => {
      if (visibleRef.current && document.visibilityState !== 'hidden') {
        setRotation((r) => r + PIE_AUTO_SPIN_STEP_DEG);
      }
    }, PIE_AUTO_SPIN_INTERVAL_MS);
    return () => clearInterval(id);
  }, []);

  const containerProps = {
    onClick: () => setActive(true),
    onKeyDown: (e) => { if (e.key === 'Enter' || e.key === ' ') setActive(true); },
    role: 'button',
    tabIndex: 0,
  };

  const pieRotationProps = {
    startAngle: baseStartAngle + rotation,
    endAngle: baseEndAngle + rotation,
  };

  const pieHoverProps = {
    activeIndex: hoverIndex != null ? hoverIndex : -1,
    onMouseEnter: (_, i) => setHoverIndex(i),
    onMouseLeave: () => setHoverIndex(null),
  };

  return {
    containerRef,
    containerProps,
    pieRotationProps,
    pieHoverProps,
    active,
    rotation,
    hoverIndex,
    setHoverIndex,
  };
};
