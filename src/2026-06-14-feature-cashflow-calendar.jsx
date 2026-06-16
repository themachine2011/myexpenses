// Feature (2026-06-14 review): Cashflow Calendar
//
// What it does: a real month grid (Sun..Sat) showing each day's NET cashflow
// (real income − real expense) with a forward overlay of what's due that day.
// Click a day with spending to open it in All Purchases.
//
// Why it's additive (was deferred 2026-06-12): this is a different VIEW from
// the Dashboard "Spend Heatmap" (a 52-week density strip of past expense) and
// the Planning "Payment Calendar" (a dues picker list). Nothing existing is
// moved or restyled. Read-only; money shown via `fmt()`.
//
// Where it lives: its own "Calendar" tab (Plan group) + a Dashboard preview.

import React, { useMemo, useState } from 'react';
import { useAppContext } from './context.jsx';
import { cashflowCalendar } from './2026-06-14-utils-calendar-whatif.js';

const card = (tk) => ({
  background: tk.surface, border: `1px solid ${tk.hairline}`, borderRadius: 18, padding: 24,
  backdropFilter: 'blur(24px)', WebkitBackdropFilter: 'blur(24px)',
  boxShadow: tk.isDark ? '0 30px 60px rgba(0,0,0,0.4)' : '0 20px 50px rgba(40,30,20,0.06)',
});
const eyebrow = (tk) => ({
  fontFamily: 'var(--font-mono)', fontSize: 10, letterSpacing: '0.32em',
  textTransform: 'uppercase', color: tk.textDim,
});
const DOW = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

const netColor = (net, tk) => (net > 0 ? tk.positive : net < 0 ? tk.negative : tk.textDim);

// Build the calendar for `offset` months back from now (0 = current month).
const useCashflow = (offset) => {
  const { transactions, upcomingDues } = useAppContext();
  const dues = useMemo(() => upcomingDues(120), [upcomingDues]);
  return useMemo(() => {
    const now = new Date();
    const y = now.getFullYear();
    const m = now.getMonth() - offset;
    return cashflowCalendar(transactions, dues, { year: y + Math.floor(m / 12), month: ((m % 12) + 12) % 12 });
  }, [transactions, dues, offset]);
};

export const CashflowCalendarPage = () => {
  const { themeTokens: tk, fmt, setView, setDateFilter } = useAppContext();
  const [offset, setOffset] = useState(0);
  const r = useCashflow(offset);

  const openDay = (cell) => {
    if (!cell || cell.blank || cell.count === 0) return;
    setDateFilter({ kind: 'custom', from: cell.key, to: cell.key });
    setView('allTransactions');
  };

  const navBtn = (label, fn, disabled) => (
    <button onClick={fn} disabled={disabled}
      style={{
        background: 'transparent', border: `1px solid ${tk.hairline}`, color: disabled ? tk.textFaint : tk.text,
        borderRadius: 10, padding: '6px 12px', cursor: disabled ? 'default' : 'pointer',
        fontFamily: 'var(--font-mono)', fontSize: 14, lineHeight: 1, opacity: disabled ? 0.5 : 1,
      }}>{label}</button>
  );

  return (
    <div style={{ display: 'grid', gap: 24 }}>
      {/* Header: month nav + month totals */}
      <div style={card(tk)}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            {navBtn('‹', () => setOffset((o) => o + 1), false)}
            <div>
              <div style={eyebrow(tk)}>Cashflow Calendar</div>
              <div style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 24, color: tk.text, marginTop: 4 }}>
                {r.label}
              </div>
            </div>
            {navBtn('›', () => setOffset((o) => Math.max(0, o - 1)), offset === 0)}
          </div>
          <div style={{ display: 'flex', gap: 22, flexWrap: 'wrap' }}>
            <div>
              <div style={eyebrow(tk)}>Income</div>
              <div style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 20, color: tk.positive, marginTop: 4 }}>{fmt(r.totals.income)}</div>
            </div>
            <div>
              <div style={eyebrow(tk)}>Expense</div>
              <div style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 20, color: tk.negative, marginTop: 4 }}>{fmt(r.totals.expense)}</div>
            </div>
            <div>
              <div style={eyebrow(tk)}>Net</div>
              <div style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 20, color: netColor(r.totals.net, tk), marginTop: 4 }}>{fmt(r.totals.net)}</div>
            </div>
            <div>
              <div style={eyebrow(tk)}>Due · projected</div>
              <div style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 20, color: tk.accent, marginTop: 4 }}>{fmt(r.dueTotal)}</div>
            </div>
          </div>
        </div>
      </div>

      {/* Month grid */}
      <div style={card(tk)}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 8 }}>
          {DOW.map((d) => (
            <div key={d} style={{ ...eyebrow(tk), fontSize: 9, textAlign: 'center', paddingBottom: 4 }}>{d}</div>
          ))}
          {r.weeks.map((week, wi) => week.map((cell) => {
            if (cell.blank) return <div key={cell.key} />;
            const clickable = cell.count > 0;
            const border = cell.isToday ? `1px solid ${tk.accent}` : `1px solid ${tk.hairline}`;
            return (
              <div key={cell.key}
                onClick={() => openDay(cell)}
                title={clickable ? `${cell.count} purchase${cell.count === 1 ? '' : 's'} · click to open` : undefined}
                style={{
                  minHeight: 72, borderRadius: 12, border, padding: 8,
                  background: cell.isToday ? `${tk.accent}14` : tk.surface2,
                  display: 'flex', flexDirection: 'column', gap: 4,
                  cursor: clickable ? 'pointer' : 'default',
                  opacity: cell.isFuture && cell.count === 0 && cell.dues.length === 0 ? 0.55 : 1,
                }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: cell.isToday ? tk.accent : tk.textDim }}>{cell.day}</span>
                  {cell.dueAmount > 0 && (
                    <span title={`Due: ${fmt(cell.dueAmount)} (projected)`}
                      style={{ width: 7, height: 7, borderRadius: '50%', background: tk.accent }} />
                  )}
                </div>
                {(cell.income > 0 || cell.expense > 0) ? (
                  <div style={{ marginTop: 'auto' }}>
                    <div style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 13, color: netColor(cell.net, tk) }}>
                      {cell.net > 0 ? '+' : ''}{fmt(cell.net)}
                    </div>
                  </div>
                ) : cell.dueAmount > 0 ? (
                  <div style={{ marginTop: 'auto', fontFamily: 'var(--font-mono)', fontSize: 10, color: tk.accent }}>
                    due {fmt(cell.dueAmount)}
                  </div>
                ) : null}
              </div>
            );
          }))}
        </div>
      </div>

      <div style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: tk.textFaint || tk.textDim, lineHeight: 1.6 }}>
        Net = real income − real expense for the day (Savings transfers excluded,
        same as the rest of the analytics tabs). The orange dot and "due" amount
        are <strong>projected</strong> commitments from your financing,
        recurring bills and reminders — never mixed into the real Income / Expense
        / Net totals above. Click any day with spending to open it in All
        Purchases. Everything is computed live; nothing is stored.
      </div>
    </div>
  );
};

export const CashflowCalendarPreview = () => {
  const { themeTokens: tk, fmt, setView } = useAppContext();
  const r = useCashflow(0);
  return (
    <div onClick={() => setView('cashflowCalendar')} className="aurum-card-hover" style={{ ...card(tk), cursor: 'pointer' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
        <div style={eyebrow(tk)}>Cashflow Calendar</div>
        <span style={{ fontFamily: 'var(--font-mono)', fontSize: 10, letterSpacing: '0.16em', textTransform: 'uppercase', color: tk.textDim }}>Open →</span>
      </div>
      <div style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: tk.textDim }}>{r.label} · net so far</div>
      <div style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 26, color: netColor(r.totals.net, tk), marginTop: 6 }}>
        {r.totals.net > 0 ? '+' : ''}{fmt(r.totals.net)}
      </div>
      <div style={{ display: 'flex', gap: 14, marginTop: 12, fontFamily: 'var(--font-mono)', fontSize: 11, color: tk.textDim, flexWrap: 'wrap' }}>
        <span>in {fmt(r.totals.income)}</span>
        <span>out {fmt(r.totals.expense)}</span>
        <span style={{ color: tk.accent }}>due {fmt(r.dueTotal)}</span>
      </div>
    </div>
  );
};

export default CashflowCalendarPage;
