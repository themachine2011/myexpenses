// Feature (2026-06-11 review): Upcoming Bills
//
// What it does: a single forward view of what's due soon — unpaid financing
// instalments, recurring templates, and manual reminders — pulled from the
// existing `upcomingDues(days)` helper. Groups by this week / next week / later,
// totals the commitment, and breaks it down by kind. Horizon toggle: 30/60/90d.
//
// Where it lives: its own "Bills" tab + a small Dashboard preview showing the
// next bill and the total due in 30 days, linking into the tab.
//
// Read-only. It only reads `upcomingDues(days)`; the underlying recurring /
// reminder / financing data is still managed on the Planning & Subscriptions
// tabs. Money shown via `fmt()`.

import React, { useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import { useAppContext } from './context.jsx';
import { summarizeDues, bucketDuesByWeek } from './2026-06-11-utils-insights.js';

const card = (tk) => ({
  background: tk.surface, border: `1px solid ${tk.hairline}`, borderRadius: 18, padding: 24,
  backdropFilter: 'blur(24px)', WebkitBackdropFilter: 'blur(24px)',
  boxShadow: tk.isDark ? '0 30px 60px rgba(0,0,0,0.4)' : '0 20px 50px rgba(40,30,20,0.06)',
});
const eyebrow = (tk) => ({
  fontFamily: 'var(--font-mono)', fontSize: 10, letterSpacing: '0.32em',
  textTransform: 'uppercase', color: tk.textDim,
});

const KIND_META = {
  financing: { label: 'Financing', dot: '#E0A458' },
  recurring: { label: 'Recurring', dot: '#7DAAE1' },
  reminder: { label: 'Reminder', dot: '#9B8AE6' },
};

const fmtDue = (iso) => {
  const d = new Date(iso);
  return d.toLocaleDateString('en-US', { day: 'numeric', month: 'short' });
};

const HORIZONS = [
  { id: 30, label: '30d' },
  { id: 60, label: '60d' },
  { id: 90, label: '90d' },
];

const useDues = (days) => {
  const { upcomingDues } = useAppContext();
  return useMemo(() => {
    const list = upcomingDues(days) || [];
    return { list, summary: summarizeDues(list), buckets: bucketDuesByWeek(list) };
  }, [upcomingDues, days]);
};

const Row = ({ d, tk, fmt, i }) => {
  const meta = KIND_META[d.kind] || { label: d.kind, dot: tk.textDim };
  return (
    <motion.div initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.02 }}
      style={{ display: 'grid', gridTemplateColumns: '64px 1fr auto', gap: 14, alignItems: 'center', padding: '8px 0', borderBottom: `1px solid ${tk.hairline}` }}>
      <span style={{ fontFamily: 'var(--font-mono)', fontSize: 12, color: tk.textDim }}>{fmtDue(d.date)}</span>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, minWidth: 0 }}>
        <span title={meta.label} style={{ width: 9, height: 9, borderRadius: '50%', background: meta.dot, flexShrink: 0 }} />
        <span style={{ fontFamily: 'var(--font-body)', fontSize: 14, color: tk.text, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{d.label || meta.label}</span>
      </div>
      <span style={{ textAlign: 'right', fontFamily: 'var(--font-mono)', fontSize: 13, color: tk.text }}>{fmt(d.amount)}</span>
    </motion.div>
  );
};

export const BillsPage = () => {
  const { themeTokens: tk, fmt, setView } = useAppContext();
  const [days, setDays] = useState(30);
  const { summary, buckets } = useDues(days);

  return (
    <div style={{ display: 'grid', gap: 24 }}>
      {/* Summary + horizon toggle */}
      <div style={{ ...card(tk), display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(170px, 1fr))', gap: 16, alignItems: 'center' }}>
        <div>
          <div style={eyebrow(tk)}>Total due ({days}d)</div>
          <div style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 28, color: tk.text, marginTop: 8 }}>{fmt(summary.total)}</div>
          <div style={{ fontFamily: 'var(--font-mono)', fontSize: 12, color: tk.textDim, marginTop: 4 }}>{summary.count} bill{summary.count === 1 ? '' : 's'}</div>
        </div>
        <div>
          <div style={eyebrow(tk)}>Financing</div>
          <div style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 22, color: tk.text, marginTop: 8 }}>{fmt(summary.byKind.financing || 0)}</div>
        </div>
        <div>
          <div style={eyebrow(tk)}>Recurring</div>
          <div style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 22, color: tk.text, marginTop: 8 }}>{fmt(summary.byKind.recurring || 0)}</div>
        </div>
        <div style={{ justifySelf: 'end' }}>
          <div style={{ display: 'inline-flex', borderRadius: 999, overflow: 'hidden', border: `1px solid ${tk.hairline2 || tk.hairline}` }}>
            {HORIZONS.map((opt) => {
              const active = days === opt.id;
              return (
                <button key={opt.id} onClick={() => setDays(opt.id)} style={{
                  padding: '6px 12px', border: 'none', cursor: 'pointer',
                  background: active ? tk.accent : 'transparent',
                  color: active ? (tk.isDark ? '#0B0B0D' : '#fff') : tk.textDim,
                  fontFamily: 'var(--font-mono)', fontSize: 10, letterSpacing: '0.16em', textTransform: 'uppercase',
                }}>{opt.label}</button>
              );
            })}
          </div>
        </div>
      </div>

      {summary.count === 0 ? (
        <div style={{ ...card(tk), color: tk.textDim, fontSize: 14, lineHeight: 1.6 }}>
          Nothing due in the next {days} days. Recurring bills and reminders set on the{' '}
          <button onClick={() => setView('planning')} style={{ background: 'none', border: 'none', color: tk.accent, cursor: 'pointer', padding: 0, font: 'inherit', textDecoration: 'underline' }}>Planning</button>{' '}
          tab will appear here as their dates approach.
        </div>
      ) : (
        buckets.filter((b) => b.items.length > 0).map((b) => (
          <div key={b.id} style={card(tk)}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 10 }}>
              <div style={eyebrow(tk)}>{b.label}</div>
              <span style={{ fontFamily: 'var(--font-mono)', fontSize: 13, color: tk.text }}>{fmt(b.total)}</span>
            </div>
            {b.items.map((d, i) => <Row key={`${d.kind}-${d.txId || d.recurringId || d.reminderId || i}-${d.date}`} d={d} tk={tk} fmt={fmt} i={i} />)}
          </div>
        ))
      )}

      <div style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: tk.textFaint || tk.textDim, lineHeight: 1.6 }}>
        Upcoming bills = unpaid financing instalments + recurring templates +
        manual reminders within the chosen horizon. This view is read-only; mark
        bills paid where you normally manage them.
      </div>
    </div>
  );
};

export const BillsPreview = () => {
  const { themeTokens: tk, fmt, setView } = useAppContext();
  const { list, summary } = useDues(30);
  const next = list[0] || null;
  return (
    <div onClick={() => setView('bills')} className="aurum-card-hover" style={{ ...card(tk), cursor: 'pointer' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
        <div style={eyebrow(tk)}>Upcoming Bills</div>
        <span style={{ fontFamily: 'var(--font-mono)', fontSize: 10, letterSpacing: '0.16em', textTransform: 'uppercase', color: tk.textDim }}>Open →</span>
      </div>
      {summary.count > 0 ? (
        <>
          <div style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: tk.textDim }}>Due in next 30 days</div>
          <div style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 26, color: tk.text, marginTop: 6 }}>{fmt(summary.total)}</div>
          {next && (
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginTop: 12, fontFamily: 'var(--font-mono)', fontSize: 12 }}>
              <span style={{ color: tk.textDim, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '60%' }}>Next: {next.label || next.kind}</span>
              <span style={{ color: tk.text }}>{fmtDue(next.date)} · {fmt(next.amount)}</span>
            </div>
          )}
          <div style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: tk.textDim, marginTop: 8 }}>{summary.count} bill{summary.count === 1 ? '' : 's'} ahead</div>
        </>
      ) : (
        <div style={{ color: tk.textDim, fontSize: 13 }}>No bills due in the next 30 days.</div>
      )}
    </div>
  );
};

export default BillsPage;
