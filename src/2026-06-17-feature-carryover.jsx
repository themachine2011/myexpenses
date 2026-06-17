// Feature (2026-06-17): Carryover prompt (confirm-first).
//
// When the previous month ended negative, this card appears at the top of the
// Dashboard and ASKS before doing anything: "Carry May's −R$X into June as a
// Debts charge on the 5th?" — Carry it over, or Not now. Nothing is written
// until the user confirms (this is Option D, the safe variant).
//
// On confirm it creates a normal, editable 'Debts' expense paid by Debit/Cash,
// dated the 5th, tagged 'carryover' (idempotent via a stable id). On dismiss it
// remembers the month so it won't re-ask. Renders nothing when there's nothing
// pending, so it costs zero space on a healthy month.

import React from 'react';
import { motion } from 'framer-motion';
import { useAppContext } from './context.jsx';

const card = (tk) => ({
  background: tk.surface, border: `1px solid ${tk.accent}55`, borderRadius: 18, padding: 22,
  backdropFilter: 'blur(24px)', WebkitBackdropFilter: 'blur(24px)',
  boxShadow: tk.isDark ? '0 24px 50px rgba(0,0,0,0.4)' : '0 18px 44px rgba(40,30,20,0.06)',
});
const eyebrow = (tk) => ({
  fontFamily: 'var(--font-mono)', fontSize: 10, letterSpacing: '0.32em',
  textTransform: 'uppercase', color: tk.textDim,
});

export const CarryoverPrompt = () => {
  const { themeTokens: tk, fmt, pendingCarryovers, confirmCarryover, dismissCarryover } = useAppContext();
  const pending = pendingCarryovers ? pendingCarryovers() : [];
  if (!pending.length) return null;

  return (
    <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} style={card(tk)}>
      <div style={eyebrow(tk)}>Carry over last month's deficit?</div>
      <div style={{ display: 'grid', gap: 14, marginTop: 12 }}>
        {pending.map((p) => (
          <div key={p.ym} style={{
            display: 'flex', justifyContent: 'space-between', alignItems: 'center',
            gap: 16, flexWrap: 'wrap',
          }}>
            <div style={{ color: tk.textDim, fontSize: 14, lineHeight: 1.6, flex: '1 1 320px', minWidth: 0 }}>
              <b style={{ color: tk.text }}>{p.label}</b> ended at{' '}
              <b style={{ color: tk.negative }}>−{fmt(p.deficit)}</b>. Add it to{' '}
              <b style={{ color: tk.text }}>{p.nextLabel}</b> as a <b style={{ color: tk.text }}>Debts</b> charge
              on the 5th, paid by Debit/Cash?
            </div>
            <div style={{ display: 'flex', gap: 8, flexShrink: 0 }}>
              <button onClick={() => confirmCarryover(p)} style={{
                background: tk.accent, color: tk.isDark ? '#0B0B0D' : '#fff', border: 'none',
                padding: '9px 16px', borderRadius: 999, cursor: 'pointer',
                fontFamily: 'var(--font-mono)', fontSize: 10, letterSpacing: '0.16em', textTransform: 'uppercase',
              }}>Carry it over</button>
              <button onClick={() => dismissCarryover(p.ym)} style={{
                background: 'transparent', color: tk.textDim, border: `1px solid ${tk.hairline2 || tk.hairline}`,
                padding: '9px 16px', borderRadius: 999, cursor: 'pointer',
                fontFamily: 'var(--font-mono)', fontSize: 10, letterSpacing: '0.16em', textTransform: 'uppercase',
              }}>Not now</button>
            </div>
          </div>
        ))}
      </div>
      <div style={{ marginTop: 14, fontSize: 12, color: tk.textFaint || tk.textDim, lineHeight: 1.5 }}>
        This adds one normal, editable "Debts" transaction — you can change or delete it anytime in Transactions.
        A deficit caused by paying off an earlier carryover is not rolled again.
      </div>
    </motion.div>
  );
};

export default CarryoverPrompt;
