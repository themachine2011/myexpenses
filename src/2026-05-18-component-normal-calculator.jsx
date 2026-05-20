import React, { useEffect, useRef, useState } from 'react';
import { useAppContext } from './context.jsx';
import { evalExpression, fmtBr } from './2026-05-18-utils-currency-calculator.js';
import { getInvertedCardTokens } from './2026-05-20-utils-inverted-card.js';

// Standard 4-column calculator. The display is a normal input (so the user
// can type with the physical keyboard) and the keypad below is for click /
// touch input. Enter evaluates, Esc clears, Backspace deletes one char.
export const NormalCalculator = ({ scientific = false }) => {
  const { themeTokens, fmt } = useAppContext();
  const inv = getInvertedCardTokens(themeTokens);
  const [expr, setExpr] = useState('');
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);
  const inputRef = useRef(null);

  // Memory (used by Scientific mode but harmless in Normal — never displayed
  // when scientific === false).
  const [memory, setMemory] = useState(0);

  useEffect(() => { setResult(null); setError(null); }, [expr]);

  const press = (chunk) => {
    setExpr((prev) => prev + chunk);
  };
  const clear = () => { setExpr(''); setResult(null); setError(null); };
  const back = () => setExpr((prev) => prev.slice(0, -1));
  const equals = () => {
    if (!expr.trim()) return;
    const out = evalExpression(expr);
    if (out.ok) {
      setResult(out.value);
      setError(null);
    } else {
      setResult(null);
      setError(out.error || 'Invalid');
    }
  };
  const negate = () => setExpr((prev) => {
    // Prepend a minus or wrap last token.
    if (!prev) return '-';
    if (prev.startsWith('-')) return prev.slice(1);
    return '-' + prev;
  });

  // Memory ops (used by Scientific mode)
  const memoryAdd = () => {
    if (result != null) setMemory((m) => m + result);
    else {
      const r = evalExpression(expr);
      if (r.ok) setMemory((m) => m + r.value);
    }
  };
  const memorySub = () => {
    if (result != null) setMemory((m) => m - result);
    else {
      const r = evalExpression(expr);
      if (r.ok) setMemory((m) => m - r.value);
    }
  };
  const memoryRecall = () => setExpr((prev) => prev + String(memory).replace('.', ','));
  const memoryClear = () => setMemory(0);

  // Keyboard
  const onKeyDown = (e) => {
    if (e.key === 'Enter' || e.key === '=') { e.preventDefault(); equals(); return; }
    if (e.key === 'Escape') { e.preventDefault(); clear(); return; }
    // Backspace handled natively by the input.
  };

  const buttonStyle = (variant = 'digit') => {
    const base = {
      padding: '10px 0',
      border: `1px solid ${inv.border}`,
      borderRadius: 10,
      fontFamily: 'var(--font-mono)',
      fontSize: 14,
      cursor: 'pointer',
      transition: 'transform 80ms, background 160ms, border 160ms',
      userSelect: 'none',
      minWidth: 0,
    };
    if (variant === 'digit') {
      return { ...base, background: 'transparent', color: inv.fg };
    }
    if (variant === 'op') {
      return { ...base, background: 'transparent', color: themeTokens.accent, borderColor: themeTokens.accent + '66' };
    }
    if (variant === 'fn') {
      return { ...base, background: 'transparent', color: inv.muted, fontSize: 11, letterSpacing: '0.06em' };
    }
    if (variant === 'eq') {
      return {
        ...base,
        background: themeTokens.accent,
        color: themeTokens.isDark ? '#0B0B0D' : '#FFFFFF',
        borderColor: themeTokens.accent,
        fontWeight: 700,
      };
    }
    if (variant === 'mem') {
      return { ...base, background: 'transparent', color: inv.muted, fontSize: 10, letterSpacing: '0.08em' };
    }
    return base;
  };

  const Key = ({ label, onPress, variant = 'digit', span = 1 }) => (
    <button
      type="button"
      onClick={onPress}
      style={{ ...buttonStyle(variant), gridColumn: `span ${span}` }}
      onMouseDown={(e) => { e.currentTarget.style.transform = 'scale(0.96)'; }}
      onMouseUp={(e) => { e.currentTarget.style.transform = 'scale(1)'; }}
      onMouseLeave={(e) => { e.currentTarget.style.transform = 'scale(1)'; }}>
      {label}
    </button>
  );

  return (
    <div style={{ display: 'grid', gap: 10, minWidth: 0 }}>
      {/* Display */}
      <div style={{
        border: `1px solid ${inv.border}`,
        borderRadius: 12,
        background: 'transparent',
        padding: '10px 12px',
        display: 'grid',
        gap: 4,
        minWidth: 0,
        overflow: 'hidden',
      }}>
        <input
          ref={inputRef}
          value={expr}
          onChange={(e) => setExpr(e.target.value)}
          onKeyDown={onKeyDown}
          placeholder="0"
          style={{
            width: '100%',
            background: 'transparent',
            border: 'none', outline: 'none',
            color: inv.fg,
            fontFamily: 'var(--font-mono)',
            fontSize: 18,
            textAlign: 'right',
            padding: 0,
          }}
        />
        <div style={{
          minHeight: 18,
          textAlign: 'right',
          fontFamily: 'var(--font-mono)',
          fontSize: 12,
          color: error ? themeTokens.negative : inv.muted,
        }}>
          {error
            ? error
            : result != null
              ? fmt(result)
              : ' '}
        </div>
      </div>

      {/* Scientific extras */}
      {scientific && (
        <>
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(4, minmax(0, 1fr))',
            gap: 6,
            minWidth: 0,
          }}>
            <Key label="√"  onPress={() => press('√(')} variant="fn" />
            <Key label="x²" onPress={() => press('^2')} variant="fn" />
            <Key label="xⁿ" onPress={() => press('^')}  variant="fn" />
            <Key label="( )" onPress={() => press('(')} variant="fn" />
          </div>
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(4, minmax(0, 1fr))',
            gap: 6,
            minWidth: 0,
            paddingBottom: 4,
            borderBottom: `1px dashed ${inv.border}`,
          }}>
            <Key label="M+"  onPress={memoryAdd}    variant="mem" />
            <Key label="M−"  onPress={memorySub}    variant="mem" />
            <Key label="MR"  onPress={memoryRecall} variant="mem" />
            <Key label="MC"  onPress={memoryClear}  variant="mem" />
          </div>
          <div style={{
            color: inv.faint,
            fontFamily: 'var(--font-mono)', fontSize: 9,
            letterSpacing: '0.12em', textTransform: 'uppercase',
            textAlign: 'right',
          }}>
            Memory: {fmtBr(memory)}
          </div>
        </>
      )}

      {/* Main 4×5 keypad */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(4, minmax(0, 1fr))',
        gap: 6,
        minWidth: 0,
      }}>
        <Key label="C"  onPress={clear} variant="fn" />
        <Key label="⌫"  onPress={back}  variant="fn" />
        <Key label="%"  onPress={() => press('%')} variant="op" />
        <Key label="÷"  onPress={() => press('÷')} variant="op" />

        <Key label="7" onPress={() => press('7')} />
        <Key label="8" onPress={() => press('8')} />
        <Key label="9" onPress={() => press('9')} />
        <Key label="×" onPress={() => press('×')} variant="op" />

        <Key label="4" onPress={() => press('4')} />
        <Key label="5" onPress={() => press('5')} />
        <Key label="6" onPress={() => press('6')} />
        <Key label="−" onPress={() => press('-')} variant="op" />

        <Key label="1" onPress={() => press('1')} />
        <Key label="2" onPress={() => press('2')} />
        <Key label="3" onPress={() => press('3')} />
        <Key label="+" onPress={() => press('+')} variant="op" />

        <Key label="±" onPress={negate} variant="fn" />
        <Key label="0" onPress={() => press('0')} />
        <Key label="," onPress={() => press(',')} />
        <Key label="=" onPress={equals} variant="eq" />
      </div>
    </div>
  );
};
