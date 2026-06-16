// Feature (2026-06-16 review): Recurring Cost Radar
//
// What it does: scans your real transaction history and automatically finds
// charges that repeat on a regular cadence — subscriptions, memberships,
// insurance, that streaming service you forgot about. It totals your monthly
// (and yearly) recurring load and flags the ones you have NOT yet saved as a
// Subscriptions template ("untracked" — the usual place money quietly leaks).
//
// Why it's new: the existing Subscriptions tab is MANUAL — you have to type in
// every template yourself. This tab is the automatic counterpart: it discovers
// the recurring charges already sitting in your data. One click promotes a
// detected charge into a real Subscriptions template (reusing `addRecurring`,
// the existing storage shape — nothing new persisted by this tab itself).
//
// Where it lives: its own "Recurring" tab (Plan group, next to Subscriptions) +
// a small Dashboard preview that shows the monthly load and links into the tab.
//
// Read-only by default. All numbers come from `detectRecurring`, a pure,
// unit-tested function. It never invents future money — "next expected" is a
// labelled last-charge + median-gap estimate, not a forecast of new spend.

import React, { useMemo } from 'react';
import { motion } from 'framer-motion';
import { useAppContext } from './context.jsx';
import { detectRecurring } from './2026-06-16-utils-recurring-detector.js';

const card = (tk) => ({
  background: tk.surface, border: `1px solid ${tk.hairline}`, borderRadius: 18, padding: 24,
  backdropFilter: 'blur(24px)', WebkitBackdropFilter: 'blur(24px)',
  boxShadow: tk.isDark ? '0 30px 60px rgba(0,0,0,0.4)' : '0 20px 50px rgba(40,30,20,0.06)',
});
const eyebrow = (tk) => ({
  fontFamily: 'var(--font-mono)', fontSize: 10, letterSpacing: '0.32em',
  textTransform: 'uppercase', color: tk.textDim,
});

const useRadar = () => {
  const { transactions, recurring } = useAppContext();
  return useMemo(() => detectRecurring(transactions, recurring), [transactions, recurring]);
};

const fmtDate = (iso) => {
  const d = new Date(iso);
  if (isNaN(d)) return '—';
  return d.toLocaleDateString('en-US', { day: 'numeric', month: 'short' });
};

const Stat = ({ tk, label, value, color, sub }) => (
  <div>
    <div style={eyebrow(tk)}>{label}</div>
    <div style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 26, color: color || tk.text, marginTop: 8 }}>{value}</div>
    {sub && <div style={{ fontFamily: 'var(--font-mono)', fontSize: 12, color: tk.textDim, marginTop: 4 }}>{sub}</div>}
  </div>
);

const Pill = ({ tk, children, tone }) => (
  <span style={{
    fontFamily: 'var(--font-mono)', fontSize: 9, letterSpacing: '0.14em', textTransform: 'uppercase',
    padding: '3px 8px', borderRadius: 999,
    border: `1px solid ${tone === 'pos' ? tk.positive : tone === 'warn' ? tk.negative : tk.hairline2 || tk.hairline}`,
    color: tone === 'pos' ? tk.positive : tone === 'warn' ? tk.negative : tk.textDim,
    whiteSpace: 'nowrap',
  }}>{children}</span>
);

export const RecurringRadarPage = () => {
  const { themeTokens: tk, fmt, setView, addRecurring, getCategoryColor } = useAppContext();
  const r = useRadar();

  const track = (item) => {
    const day = Math.max(1, Math.min(28, new Date(item.lastDate).getDate() || 1));
    addRecurring({
      description: item.name,
      amount: Number(item.typicalAmount.toFixed(2)),
      category: item.category,
      paymentMethod: 'Bank Transfer',
      type: 'expense',
      dayOfMonth: day,
    });
  };

  const active = r.activeItems;
  const inactive = r.items.filter((i) => !i.active);

  return (
    <div style={{ display: 'grid', gap: 24 }}>
      {/* Headline */}
      <div style={{ ...card(tk), display: 'grid', gridTemplateColumns: 'minmax(220px, 320px) 1fr', gap: 28, alignItems: 'center' }}>
        <div>
          <div style={eyebrow(tk)}>Recurring load · per month</div>
          <div style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 52, lineHeight: 1, color: tk.text, marginTop: 10 }}>
            {fmt(r.monthlyTotal)}
          </div>
          <div style={{ fontFamily: 'var(--font-mono)', fontSize: 12, color: tk.textDim, marginTop: 8 }}>
            {fmt(r.annualTotal)} / year · {active.length} active charge{active.length === 1 ? '' : 's'}
          </div>
        </div>
        <div>
          <div style={{ color: tk.textDim, fontSize: 14, lineHeight: 1.6, maxWidth: 560 }}>
            Found by scanning the last <b style={{ color: tk.text }}>{r.windowMonths} months</b> of transactions for charges that
            repeat on a steady schedule with a steady amount. {r.untrackedCount > 0 ? (
              <> <b style={{ color: tk.negative }}>{r.untrackedCount}</b> of them {r.untrackedCount === 1 ? 'is' : 'are'} not
              yet saved as a subscription — <b style={{ color: tk.text }}>{fmt(r.untrackedMonthly)}/mo</b> of possible blind spots.</>
            ) : (
              <> Every active recurring charge is already tracked or scheduled. Nice.</>
            )}
          </div>
        </div>
      </div>

      {/* Summary cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 16 }}>
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} style={card(tk)}>
          <Stat tk={tk} label="Monthly recurring" value={fmt(r.monthlyTotal)} sub={`${active.length} active`} />
        </motion.div>
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }} style={card(tk)}>
          <Stat tk={tk} label="Yearly recurring" value={fmt(r.annualTotal)} color={tk.text} sub="If nothing changes" />
        </motion.div>
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} style={card(tk)}>
          <Stat tk={tk} label="Untracked" value={fmt(r.untrackedMonthly)} color={r.untrackedCount ? tk.negative : tk.positive}
            sub={`${r.untrackedCount} charge${r.untrackedCount === 1 ? '' : 's'} /mo`} />
        </motion.div>
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }} style={card(tk)}>
          <Stat tk={tk} label="Accounted for" value={fmt(r.accountedMonthly)} color={tk.positive}
            sub="Tracked subs + financing" />
        </motion.div>
      </div>

      {/* Detected list */}
      <div style={card(tk)}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 14, flexWrap: 'wrap', gap: 8 }}>
          <div style={eyebrow(tk)}>Detected recurring charges</div>
          <div style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: tk.textDim }}>Sorted by monthly cost</div>
        </div>

        {active.length === 0 && inactive.length === 0 ? (
          <div style={{ color: tk.textDim, fontSize: 14, lineHeight: 1.6 }}>
            No recurring charges detected yet. The radar needs at least 3 charges from the same place,
            on a regular schedule, with a stable amount — add a few more months of transactions and they'll appear here.
          </div>
        ) : (
          <div style={{ display: 'grid', gap: 8 }}>
            {active.map((item) => (
              <div key={item.key} style={{
                display: 'grid', gridTemplateColumns: '1fr auto', gap: 12, alignItems: 'center',
                padding: '12px 14px', borderRadius: 12, border: `1px solid ${tk.hairline}`,
                background: (item.tracked || item.scheduled) ? 'transparent' : (tk.isDark ? 'rgba(255,255,255,0.02)' : 'rgba(40,30,20,0.015)'),
              }}>
                <div style={{ minWidth: 0 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                    <span style={{ width: 8, height: 8, borderRadius: '50%', background: getCategoryColor(item.category), flexShrink: 0 }} />
                    <span style={{ fontFamily: 'var(--font-body)', fontSize: 15, color: tk.text, fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{item.name}</span>
                    <Pill tk={tk}>{item.cadenceLabel}</Pill>
                    {item.tracked
                      ? <Pill tk={tk} tone="pos">Tracked</Pill>
                      : item.scheduled
                        ? <Pill tk={tk}>Scheduled</Pill>
                        : <Pill tk={tk} tone="warn">Not tracked</Pill>}
                  </div>
                  <div style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: tk.textDim, marginTop: 4 }}>
                    {fmt(item.typicalAmount)} each · {item.count}× seen · next ~{fmtDate(item.nextDate)}
                  </div>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                  <div style={{ textAlign: 'right' }}>
                    <div style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 17, color: tk.text }}>{fmt(item.monthlyEquiv)}</div>
                    <div style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: tk.textFaint || tk.textDim }}>/mo</div>
                  </div>
                  {!item.tracked && !item.scheduled && (
                    <button onClick={() => track(item)} title="Save as a Subscriptions template"
                      style={{
                        background: 'transparent', border: `1px solid ${tk.hairline2 || tk.hairline}`, color: tk.text,
                        padding: '6px 12px', borderRadius: 999, fontFamily: 'var(--font-mono)', fontSize: 9,
                        letterSpacing: '0.16em', textTransform: 'uppercase', cursor: 'pointer', whiteSpace: 'nowrap',
                      }}>Track</button>
                  )}
                </div>
              </div>
            ))}

            {inactive.length > 0 && (
              <>
                <div style={{ ...eyebrow(tk), marginTop: 14, marginBottom: 2 }}>Looks cancelled (no recent charge)</div>
                {inactive.map((item) => (
                  <div key={item.key} style={{
                    display: 'grid', gridTemplateColumns: '1fr auto', gap: 12, alignItems: 'center',
                    padding: '10px 14px', borderRadius: 12, border: `1px dashed ${tk.hairline}`, opacity: 0.7,
                  }}>
                    <div style={{ minWidth: 0 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                        <span style={{ fontFamily: 'var(--font-body)', fontSize: 14, color: tk.textDim, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{item.name}</span>
                        <Pill tk={tk}>{item.cadenceLabel}</Pill>
                      </div>
                      <div style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: tk.textFaint || tk.textDim, marginTop: 4 }}>
                        Last charge {fmtDate(item.lastDate)} · {fmt(item.typicalAmount)} each
                      </div>
                    </div>
                    <div style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: tk.textDim }}>was {fmt(item.monthlyEquiv)}/mo</div>
                  </div>
                ))}
              </>
            )}
          </div>
        )}

        <div style={{ marginTop: 16, fontSize: 12, color: tk.textFaint || tk.textDim, lineHeight: 1.5 }}>
          Detection is deliberately strict: a charge must repeat at least 3 times, on a regular interval,
          with a stable amount — so variable spending (like groceries at one store) is not mistaken for a subscription.
          "Next expected" is an estimate from the last charge, not a forecast of new spending.
        </div>
      </div>

      <div style={{ ...card(tk), display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12 }}>
        <div style={{ color: tk.textDim, fontSize: 13 }}>Manage your saved subscription templates?</div>
        <button onClick={() => setView('subscriptions')} style={{
          background: 'transparent', border: `1px solid ${tk.hairline2 || tk.hairline}`, color: tk.text,
          padding: '8px 16px', borderRadius: 999, fontFamily: 'var(--font-mono)', fontSize: 10,
          letterSpacing: '0.18em', textTransform: 'uppercase', cursor: 'pointer',
        }}>Open subscriptions →</button>
      </div>
    </div>
  );
};

export const RecurringRadarPreview = () => {
  const { themeTokens: tk, fmt, setView } = useAppContext();
  const r = useRadar();
  return (
    <div onClick={() => setView('recurringRadar')} className="aurum-card-hover" style={{ ...card(tk), cursor: 'pointer' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
        <div style={eyebrow(tk)}>Recurring Radar</div>
        <span style={{ fontFamily: 'var(--font-mono)', fontSize: 10, letterSpacing: '0.16em', textTransform: 'uppercase', color: tk.textDim }}>Open →</span>
      </div>
      <div style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: tk.textDim }}>Recurring charges in your spending</div>
      <div style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 32, color: tk.text, marginTop: 6 }}>
        {fmt(r.monthlyTotal)}<span style={{ fontSize: 15, color: tk.textDim }}> /mo</span>
      </div>
      <div style={{ fontFamily: 'var(--font-mono)', fontSize: 12, color: r.untrackedCount ? tk.negative : tk.textDim, marginTop: 4 }}>
        {r.untrackedCount > 0
          ? `${r.untrackedCount} untracked · ${fmt(r.untrackedMonthly)}/mo`
          : `${r.activeItems.length} active · all tracked`}
      </div>
    </div>
  );
};

export default RecurringRadarPage;
