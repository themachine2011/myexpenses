import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useAppContext } from './context.jsx';
import { getInvertedCardTokens } from './2026-05-20-utils-inverted-card.js';

export const WheelPeriodSelector = ({ label, options, value, onChange, compact }) => {
  const { themeTokens } = useAppContext();
  const inv = getInvertedCardTokens(themeTokens);
  const ref = useRef(null);
  const wheelRef = useRef(0);
  const activeRef = useRef(false);
  const [active, setActive] = useState(false);

  const index = Math.max(0, options.findIndex((item) => item.value === value));
  const selected = options[index] || options[0];
  const visible = useMemo(() => {
    if (!options.length) return [];
    const prev = options[(index - 1 + options.length) % options.length];
    const next = options[(index + 1) % options.length];
    return [prev, selected, next];
  }, [options, index, selected]);

  const step = (dir) => {
    if (!options.length) return;
    const nextIndex = (index + dir + options.length) % options.length;
    onChange?.(options[nextIndex].value);
  };

  useEffect(() => {
    activeRef.current = active;
  }, [active]);

  useEffect(() => {
    const onPointerDown = (event) => {
      if (!ref.current?.contains(event.target)) setActive(false);
    };
    document.addEventListener('pointerdown', onPointerDown);
    return () => document.removeEventListener('pointerdown', onPointerDown);
  }, []);

  useEffect(() => {
    const el = ref.current;
    if (!el) return undefined;
    const onWheel = (event) => {
      if (!activeRef.current) return;
      event.preventDefault();
      wheelRef.current += event.deltaY;
      if (Math.abs(wheelRef.current) < 24) return;
      step(wheelRef.current > 0 ? 1 : -1);
      wheelRef.current = 0;
    };
    el.addEventListener('wheel', onWheel, { passive: false });
    return () => el.removeEventListener('wheel', onWheel);
  }, [index, options, onChange]);

  return (
    <div ref={ref} style={{ display: 'grid', gap: 6, minWidth: compact ? 86 : 106 }}>
      {label && (
        <div style={{
          color: inv.muted,
          fontFamily: 'var(--font-mono)',
          fontSize: 9,
          letterSpacing: '0.22em',
          textTransform: 'uppercase',
        }}>{label}</div>
      )}
      <button
        type="button"
        className="aurum-card-flash-hover"
        onClick={() => setActive(true)}
        onFocus={() => setActive(true)}
        style={{
          height: compact ? 74 : 86,
          border: `1px solid ${active ? themeTokens.accent : inv.border}`,
          borderRadius: 12,
          background: inv.bg,
          color: inv.fg,
          overflow: 'hidden',
          cursor: 'ns-resize',
          padding: 0,
          boxShadow: active ? `0 0 0 3px ${themeTokens.accent}18` : 'none',
          transition: 'border 180ms, background 180ms, box-shadow 180ms',
          '--black-card-base-bg': inv.bg,
          '--black-card-rest-border': active ? themeTokens.accent : inv.border,
          '--black-card-rest-shadow': active ? `0 0 0 3px ${themeTokens.accent}18` : 'none',
        }}
      >
        <div style={{
          height: '100%',
          display: 'grid',
          gridTemplateRows: '1fr 1.2fr 1fr',
          alignItems: 'center',
          textAlign: 'center',
          transform: active ? 'translateY(0)' : 'translateY(0)',
          transition: 'transform 220ms cubic-bezier(0.22,1,0.36,1)',
        }}>
          {visible.map((item, itemIndex) => (
            <div key={`${item.value}-${itemIndex}`} style={{
              color: itemIndex === 1 ? inv.fg : inv.faint,
              fontFamily: itemIndex === 1 ? 'var(--font-display)' : 'var(--font-mono)',
              fontSize: itemIndex === 1 ? (compact ? 16 : 18) : 11,
              fontWeight: itemIndex === 1 ? 700 : 400,
              lineHeight: 1,
              opacity: itemIndex === 1 ? 1 : 0.48,
              transform: itemIndex === 1 ? 'scale(1)' : 'scale(0.92)',
              transition: 'all 180ms cubic-bezier(0.22,1,0.36,1)',
            }}>
              {item.label}
            </div>
          ))}
        </div>
      </button>
    </div>
  );
};
