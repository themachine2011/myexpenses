// Feature (2026-06-12 review): This Week digest
//
// What it does: the only weekly read in the app — what went out over the last
// 7 days vs the 7 days before, where it went (top categories), the biggest
// individual purchases, and what's due in the NEXT 7 days. Every other tab
// thinks in months; this is the "how is my week going?" answer.
//
// Where it lives: its own "Week" tab + a small Dashboard preview linking in.
// Read-only — pure function of `transactions` plus the existing context
// `upcomingDues(7)` helper. Actual spending and upcoming (projected) dues are
// shown in clearly separated cards (CLAUDE.md rule #5). Money via `fmt()`.

import React, { useMemo } from 'react';
import { motion } from 'framer-motion';
import { useAppContext } from './context.jsx';
import { weekDigest } from './2026-06-12-utils-week-flex-streaks.js';
import { summarizeDues } from './2026-06-11-utils-insights.js';

const card = (tk) => ({
  background: tk.surface, border: `1px solid ${tk.hairline}`, borderRadius: 18, padding: 24,
  backdropFilter: 'blur(24px)', WebkitBackdropFilter: 'blur(24px)',
  boxShadow: tk.isDark ? '0 30px 60px rgba(0,0,0,0.4)' : '0 20px 50px rgba(40,30,20,0.06)',
});
const eyebrow = (tk) => ({
  fontFamily: 'var(--font-mono)', fontSize: 10, letterSpacing: '0.32em',
  textTransform: 'uppercase', color: tk.textDim,
});

const fmtDate = (d) =>
  new Date(d).toLocaleDateString('en-US', { day: 'numeric', month: 'short' });

const KIND_LABEL = { financing: 'Financing', recurring: 'Recurring', reminder: 'Reminder' };

const useWeek = () => {
  const { transactions } = useAppContext();
  return useMemo(() => weekDigest(transactions), [transactions]);
};

// "vs last week" chip: green when this week is cheaper, red when pricier.
const DeltaChip = ({ w, tk }) => {
  if (w.pct === null) {
    return <span style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: tk.textDim }}>
      {w.spent > 0 ? 'nothing spent last week' : 'two quiet weeks'}
    </span>;
  }
  const up = w.delta > 0;
  return (
    <span style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: up ? tk.negative : tk.positive }}>
      {up ? '▲' : '▼'} {Math.abs(w.pct).toFixed(0)}% vs last week
    </span>
  );
};

export const WeekReviewPage = () => {
  const { themeTokens: tk, fmt, getCategoryColor, setFocusTxId, setView, upcomingDues } = useAppContext();
  const w = useWeek();
  const dues = useMemo(() => upcomingDues(7), [upcomingDues]);
  const dueSum = useMemo(() => summarizeDues(dues), [dues]);
  const maxCat = Math.max(1, ...w.topCategories.map((c) => c.total));

  return (
    <div style={{ display: 'grid', gap: 24 }}>
      {/* Summary — actual spending, last 7 days */}
      <div style={{ ...card(tk), display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(170px, 1fr))', gap: 16 }}>
        <div>
          <div style={eyebrow(tk)}>Spent · last 7 days</div>
          <div style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 28, color: tk.negative, marginTop: 8 }}>
            {fmt(w.spent)}
          </div>
          <div style={{ marginTop: 4 }}><DeltaChip w={w} tk={tk} /></div>
        </div>
        <div>
          <div style={eyebrow(tk)}>Income · last 7 days</div>
          <div style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 28, color: tk.positive, marginTop: 8 }}>
            {fmt(w.income)}
          </div>
          <div style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: tk.textDim, marginTop: 4 }}>
            {fmtDate(w.from)} – {fmtDate(w.to)}
          </div>
        </div>
        <div>
          <div style={eyebrow(tk)}>Per day</div>
          <div style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 28, color: tk.text, marginTop: 8 }}>
            {fmt(w.perDay)}
          </div>
          <div style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: tk.textDim, marginTop: 4 }}>
            {w.count} purchases
          </div>
        </div>
        <div>
          <div style={eyebrow(tk)}>Due · next 7 days</div>
          <div style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 28, color: dueSum.total > 0 ? tk.accent : tk.positive, marginTop: 8 }}>
            {fmt(dueSum.total)}
          </div>
          <div style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: tk.textDim, marginTop: 4 }}>
            {dueSum.count} upcoming · projected
          </div>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: 24 }}>
        {/* Where it went */}
        <div style={card(tk)}>
          <div style={{ ...eyebrow(tk), marginBottom: 14 }}>Where it went</div>
          {w.topCategories.length === 0 ? (
            <div style={{ color: tk.textDim, fontSize: 14 }}>No spending in the last 7 days.</div>
          ) : w.topCategories.slice(0, 6).map((c, i) => (
            <motion.div key={c.category} initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.04 }}
              style={{ marginBottom: 12 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 5 }}>
                <span style={{ fontSize: 13, color: tk.text, display: 'flex', alignItems: 'center', gap: 7 }}>
                  <span style={{ width: 8, height: 8, borderRadius: '50%', background: getCategoryColor(c.category), flexShrink: 0 }} />
                  {c.category}
                </span>
                <span style={{ fontFamily: 'var(--font-mono)', fontSize: 12, color: tk.textDim }}>
                  {fmt(c.total)} · {c.share.toFixed(0)}%
                </span>
              </div>
              <div style={{ height: 8, borderRadius: 999, background: tk.hairline2 || tk.hairline, overflow: 'hidden' }}>
                <div style={{ width: `${Math.max(2, (c.total / maxCat) * 100)}%`, height: '100%', borderRadius: 999, background: getCategoryColor(c.category), transition: 'width 300ms' }} />
              </div>
            </motion.div>
          ))}
        </div>

        {/* Biggest purchases */}
        <div style={card(tk)}>
          <div style={{ ...eyebrow(tk), marginBottom: 12 }}>Biggest purchases</div>
          {w.biggest.length === 0 ? (
            <div style={{ color: tk.textDim, fontSize: 14 }}>Nothing yet this week.</div>
          ) : w.biggest.map((t, i) => (
            <div key={t.id || i}
              onClick={() => { setFocusTxId?.(t.id); setView('transactions'); }}
              style={{ display: 'grid', gridTemplateColumns: '52px 1fr auto', gap: 12, alignItems: 'center', padding: '9px 0', borderBottom: `1px solid ${tk.hairline}`, cursor: 'pointer' }}>
              <span style={{ fontFamily: 'var(--font-mono)', fontSize: 12, color: tk.textDim }}>{fmtDate(t.date)}</span>
              <div style={{ minWidth: 0 }}>
                <div style={{ fontSize: 14, color: tk.text, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{t.description}</div>
                <div style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: tk.textDim, display: 'flex', alignItems: 'center', gap: 6, marginTop: 2 }}>
                  <span style={{ width: 8, height: 8, borderRadius: '50%', background: getCategoryColor(t.category), flexShrink: 0 }} />
                  {t.category}{t.locked ? ' · committed' : ''}
                </div>
              </div>
              <span style={{ fontFamily: 'var(--font-mono)', fontSize: 14, color: tk.negative }}>{fmt(t.amount)}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Due next 7 days — projected, clearly separate from actuals above */}
      <div style={card(tk)}>
        <div style={{ ...eyebrow(tk), marginBottom: 12 }}>Coming up · next 7 days (projected)</div>
        {dues.length === 0 ? (
          <div style={{ color: tk.textDim, fontSize: 14 }}>Nothing due in the next 7 days.</div>
        ) : dues.map((d, i) => (
          <div key={i} style={{ display: 'grid', gridTemplateColumns: '52px 90px 1fr auto', gap: 12, alignItems: 'center', padding: '9px 0', borderBottom: `1px solid ${tk.hairline}` }}>
            <span style={{ fontFamily: 'var(--font-mono)', fontSize: 12, color: tk.textDim }}>{fmtDate(d.date)}</span>
            <span style={{ fontFamily: 'var(--font-mono)', fontSize: 10, letterSpacing: '0.14em', textTransform: 'uppercase', color: tk.accent }}>
              {KIND_LABEL[d.kind] || d.kind}
            </span>
            <span style={{ fontSize: 14, color: tk.text, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{d.label}</span>
            <span style={{ fontFamily: 'var(--font-mono)', fontSize: 14, color: tk.text }}>{fmt(d.amount)}</span>
          </div>
        ))}
      </div>

      <div style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: tk.textFaint || tk.textDim, lineHeight: 1.6 }}>
        How it works: "last 7 days" is today plus the 6 days before, compared
        with the 7 days before that. Spent/income are real transactions
        (Savings transfers excluded). "Coming up" is projected from financing
        instalments, recurring templates and reminders — it is not actual
        spending yet. Click a purchase to open it in Transactions.
      </div>
    </div>
  );
};

export const WeekReviewPreview = () => {
  const { themeTokens: tk, fmt, setView, upcomingDues } = useAppContext();
  const w = useWeek();
  const dueSum = useMemo(() => summarizeDues(upcomingDues(7)), [upcomingDues]);
  return (
    <div onClick={() => setView('week')} className="aurum-card-hover" style={{ ...card(tk), cursor: 'pointer' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
        <div style={eyebrow(tk)}>This Week</div>
        <span style={{ fontFamily: 'var(--font-mono)', fontSize: 10, letterSpacing: '0.16em', textTransform: 'uppercase', color: tk.textDim }}>Open →</span>
      </div>
      <div style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: tk.textDim }}>Spent in the last 7 days</div>
      <div style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 26, color: tk.text, marginTop: 6 }}>
        {fmt(w.spent)}
      </div>
      <div style={{ marginTop: 6 }}><DeltaChip w={w} tk={tk} /></div>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 12, fontFamily: 'var(--font-mono)', fontSize: 12, gap: 10 }}>
        <span style={{ color: tk.textDim }}>
          {w.topCategory ? `top: ${w.topCategory.category}` : 'no spending yet'}
        </span>
        <span style={{ color: dueSum.total > 0 ? tk.accent : tk.textDim, flexShrink: 0 }}>
          due 7d: {fmt(dueSum.total)}
        </span>
      </div>
    </div>
  );
};

export default WeekReviewPage;
