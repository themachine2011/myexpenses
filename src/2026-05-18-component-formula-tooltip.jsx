import React, { useState, useId } from 'react';
import { AnimatePresence, motion } from 'framer-motion';

// Balloon-style formula tooltip used by the Category Projection card.
// Wraps a single span (the calculated number) and shows a popup ONLY while
// the pointer is over that span — never the whole row. Scale + opacity
// animation makes the open feel like an inflating balloon and the close
// like a softly shrinking bubble.
//
// Props:
//   children   - the visible number/text to wrap (typically a <span>)
//   formula    - plain-English formula text (newlines preserved)
//   placement  - 'top' (default) or 'bottom'
//   style      - extra style applied to the trigger wrapper
export const FormulaTooltip = ({ children, formula, placement = 'top', style }) => {
  const [open, setOpen] = useState(false);
  const id = useId();
  if (!formula) return children;

  const arrowSide = placement === 'top' ? { top: '100%', borderTop: '8px solid rgba(232, 92, 92, 0.96)', borderBottom: 'none' }
                                        : { bottom: '100%', borderBottom: '8px solid rgba(232, 92, 92, 0.96)', borderTop: 'none' };
  const popupPlacement = placement === 'top'
    ? { bottom: 'calc(100% + 10px)' }
    : { top: 'calc(100% + 10px)' };

  return (
    <span
      onMouseEnter={() => setOpen(true)}
      onMouseLeave={() => setOpen(false)}
      onFocus={() => setOpen(true)}
      onBlur={() => setOpen(false)}
      style={{
        position: 'relative',
        display: 'inline-block',
        cursor: 'help',
        ...style,
      }}
      aria-describedby={open ? id : undefined}
    >
      {children}
      <AnimatePresence>
        {open && (
          <motion.span
            id={id}
            role="tooltip"
            initial={{ opacity: 0, scale: 0.6, y: placement === 'top' ? 4 : -4 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.55, y: placement === 'top' ? 6 : -6 }}
            transition={{
              type: 'spring', stiffness: 480, damping: 26, mass: 0.6,
              opacity: { duration: 0.18, ease: [0.22, 1, 0.36, 1] },
            }}
            style={{
              position: 'absolute',
              right: 0,
              ...popupPlacement,
              minWidth: 220,
              maxWidth: 320,
              background: 'linear-gradient(180deg, #EE7674 0%, #E45C5A 100%)',
              color: '#FFFFFF',
              padding: '10px 14px',
              borderRadius: 18,
              boxShadow: '0 18px 38px rgba(180, 50, 50, 0.35), 0 0 0 1px rgba(255,255,255,0.06) inset',
              fontFamily: 'var(--font-body)',
              fontSize: 11,
              lineHeight: 1.45,
              letterSpacing: '0.01em',
              whiteSpace: 'pre-wrap',
              wordBreak: 'break-word',
              textAlign: 'left',
              pointerEvents: 'none',
              transformOrigin: placement === 'top' ? 'bottom right' : 'top right',
              zIndex: 50,
            }}
          >
            {formula}
            {/* Down-pointing arrow / tail */}
            <span
              aria-hidden
              style={{
                position: 'absolute',
                right: 18,
                width: 0, height: 0,
                borderLeft: '8px solid transparent',
                borderRight: '8px solid transparent',
                ...arrowSide,
              }}
            />
          </motion.span>
        )}
      </AnimatePresence>
    </span>
  );
};
