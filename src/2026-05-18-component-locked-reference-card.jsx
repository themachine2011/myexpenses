import React, { useMemo, useRef, useState } from 'react';
import { useAppContext, MOTO_AMOUNT } from './context.jsx';

// Compute every-category averages from January 1 of the current year through
// today. Includes Triumph financing because each `moto-i` installment lives in
// the transactions array as a normal expense. Pure function — no React state.
const computeYearToDateAverages = (transactions, now = new Date()) => {
  const yearStart = new Date(now.getFullYear(), 0, 1, 0, 0, 0, 0);
  const todayEnd = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);

  let total = 0;
  for (const tx of transactions || []) {
    if (tx?.type !== 'expense') continue;
    if (!tx.date) continue;
    const d = new Date(tx.date);
    if (d < yearStart || d > todayEnd) continue;
    total += Number(tx.amount) || 0;
  }

  const msPerDay = 24 * 60 * 60 * 1000;
  const days = Math.max(1, Math.round((todayEnd - yearStart) / msPerDay) + 1);
  const monthsSpan = (todayEnd.getFullYear() - yearStart.getFullYear()) * 12 + (todayEnd.getMonth() - yearStart.getMonth()) + 1;
  const months = Math.max(1, monthsSpan);

  return {
    total,
    daily: total / days,
    monthly: total / months,
    days,
    months,
    fromLabel: yearStart.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
    toLabel:   todayEnd.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
  };
};

// Locked Reference card. Click to flip between the front (existing category-
// scoped averages) and a back face showing the full cost-of-existence YTD
// averages (every category, including Triumph financing). Hover tilts the
// card exactly like the credit cards on the Cards tab (FlipTiltCard:
// rotateX = -py × 18, rotateY = px × 18, 600 ms cubic-bezier transition).
export const LockedReferenceCard = ({ front }) => {
  const { transactions, themeTokens, fmt } = useAppContext();
  const wrapRef = useRef(null);
  const [flipped, setFlipped] = useState(false);
  const [tilt, setTilt] = useState({ x: 0, y: 0 });

  const ytd = useMemo(
    () => computeYearToDateAverages(transactions),
    [transactions]
  );

  // Mirror the FlipTiltCard tilt math used by the credit cards.
  const onMove = (e) => {
    const r = wrapRef.current?.getBoundingClientRect();
    if (!r) return;
    const px = (e.clientX - r.left) / r.width - 0.5;
    const py = (e.clientY - r.top) / r.height - 0.5;
    setTilt({ x: -py * 18, y: px * 18 });
  };
  const onLeave = () => setTilt({ x: 0, y: 0 });

  // Suppress click-flip when the user lifted the pointer after a drag/scroll.
  const downPos = useRef(null);
  const onPointerDown = (e) => { downPos.current = { x: e.clientX, y: e.clientY }; };
  const onClick = (e) => {
    const start = downPos.current;
    downPos.current = null;
    if (start) {
      const dx = Math.abs(e.clientX - start.x);
      const dy = Math.abs(e.clientY - start.y);
      if (dx > 6 || dy > 6) return; // treat as drag, not click
    }
    setFlipped((f) => !f);
  };

  const YELLOW = '#F5B544';

  // Back face is sized to match the front card exactly: same padding (10),
  // same gap (8), same value fontSize (13). Yellow + bold + mono keeps the
  // figures visually distinct without overflowing the sidebar column.
  const backFace = (
    <div style={{
      border: `1px solid ${YELLOW}66`,
      borderRadius: 12,
      padding: 10,
      background: `${themeTokens.surface2}66`,
      display: 'grid',
      gap: 8,
      width: '100%',
      boxSizing: 'border-box',
      boxShadow: `0 0 0 1px ${YELLOW}22 inset`,
    }}>
      <div style={{
        color: YELLOW,
        fontFamily: 'var(--font-mono)',
        fontSize: 9,
        letterSpacing: '0.18em',
        textTransform: 'uppercase',
        fontWeight: 700,
      }}>
        Cost of existence · YTD
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
        <div>
          <div style={{
            color: themeTokens.textFaint,
            fontFamily: 'var(--font-mono)',
            fontSize: 9,
            letterSpacing: '0.12em',
            textTransform: 'uppercase',
          }}>Avg / day</div>
          <div style={{
            color: YELLOW,
            fontFamily: 'var(--font-mono)',
            fontSize: 13,
            fontWeight: 700,
            marginTop: 3,
          }}>{fmt(ytd.daily)}</div>
        </div>
        <div>
          <div style={{
            color: themeTokens.textFaint,
            fontFamily: 'var(--font-mono)',
            fontSize: 9,
            letterSpacing: '0.12em',
            textTransform: 'uppercase',
          }}>Avg / month</div>
          <div style={{
            color: YELLOW,
            fontFamily: 'var(--font-mono)',
            fontSize: 13,
            fontWeight: 700,
            marginTop: 3,
          }}>{fmt(ytd.monthly)}</div>
        </div>
      </div>
      <div style={{
        color: themeTokens.textFaint,
        fontFamily: 'var(--font-mono)',
        fontSize: 9,
        letterSpacing: '0.12em',
        textTransform: 'uppercase',
        lineHeight: 1.45,
      }}>
        Jan 1 → today · all categories · click to flip ↻
      </div>
    </div>
  );

  return (
    <div
      ref={wrapRef}
      onMouseMove={onMove}
      onMouseLeave={onLeave}
      onPointerDown={onPointerDown}
      onClick={onClick}
      style={{
        width: '100%',
        perspective: 1200,
        cursor: 'pointer',
      }}
    >
      <div style={{
        position: 'relative',
        width: '100%',
        display: 'grid',
        transformStyle: 'preserve-3d',
        transform: `rotateX(${tilt.x}deg) rotateY(${(flipped ? 180 : 0) + tilt.y}deg)`,
        transition: 'transform 600ms cubic-bezier(0.22, 1, 0.36, 1)',
      }}>
        {/* Front face — existing locked-reference content provided by parent. */}
        <div style={{
          gridArea: '1 / 1',
          backfaceVisibility: 'hidden',
          WebkitBackfaceVisibility: 'hidden',
        }}>
          {front}
        </div>
        {/* Back face — YTD all-category averages. */}
        <div style={{
          gridArea: '1 / 1',
          backfaceVisibility: 'hidden',
          WebkitBackfaceVisibility: 'hidden',
          transform: 'rotateY(180deg)',
        }}>
          {backFace}
        </div>
      </div>
    </div>
  );
};
