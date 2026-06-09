// Feature (2026-06-09 review): Top Merchants / Payees
//
// What it does: the app already breaks spending down by category; this adds the
// missing angle — WHO you pay. It groups expense transactions by merchant
// (normalized description) and ranks them by total spend, with count, average
// ticket, last-seen date and category. A period toggle covers this month / 3M
// / 6M / all time.
//
// Where it lives: its own "Merchants" tab + a small Dashboard preview showing
// the top merchant for the current month.
//
// Read-only. All money from `transactions`; displayed via context `fmt()`.

import React, { useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import { useAppContext } from './context.jsx';
import { periodRangeFor, monthRangeFor, merchantTotals } from './2026-06-09-utils-analytics.js';

const card = (tk) => ({
  background: tk.surface, border: `1px solid ${tk.hairline}`, borderRadius: 18, padding: 24,
  backdropFilter: 'blur(24px)', WebkitBackdropFilter: 'blur(24px)',
  boxShadow: tk.isDark ? '0 30px 60px rgba(0,0,0,0.4)' : '0 20px 50px rgba(40,30,20,0.06)',
});
const eyebrow = (tk) => ({
  fontFamily: 'var(--font-mono)', fontSize: 10, letterSpacing: '0.32em',
  textTransform: 'uppercase', color: tk.textDim,
});

const PERIODS = [
  { id: 'month', label: 'This month' },
  { id: '3m', label: '3M' },
  { id: '6m', label: '6M' },
  { id: 'all', label: 'All' },
];

const shortDate = (d) => new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });

export const MerchantsPage = () => {
  const { themeTokens: tk, fmt, transactions, getCategoryColor } = useAppContext();
  const [period, setPeriod] = useState('3m');

  const data = useMemo(() => {
    const { from, to } = periodRangeFor(period);
    const list = merchantTotals(transactions, from, to);
    const total = list.reduce((s, m) => s + m.total, 0);
    return { list, total };
  }, [transactions, period]);

  const top = data.list.slice(0, 20);
  const max = top.length ? top[0].total : 1;

  return (
    <div style={{ display: 'grid', gap: 24 }}>
      <div style={{ ...card(tk), display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12 }}>
        <div>
          <div style={eyebrow(tk)}>Where the money goes</div>
          <div style={{ marginTop: 8, fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 30, color: tk.text }}>{fmt(data.total)}</div>
          <div style={{ fontFamily: 'var(--font-mono)', fontSize: 12, color: tk.textDim, marginTop: 4 }}>{data.list.length} merchants · {PERIODS.find((p) => p.id === period).label}</div>
        </div>
        <div style={{ display: 'inline-flex', borderRadius: 999, overflow: 'hidden', border: `1px solid ${tk.hairline2 || tk.hairline}` }}>
          {PERIODS.map((p) => {
            const active = period === p.id;
            return (
              <button key={p.id} onClick={() => setPeriod(p.id)} style={{
                padding: '7px 14px', border: 'none', cursor: 'pointer',
                background: active ? tk.accent : 'transparent',
                color: active ? (tk.isDark ? '#0B0B0D' : '#fff') : tk.textDim,
                fontFamily: 'var(--font-mono)', fontSize: 10, letterSpacing: '0.16em', textTransform: 'uppercase',
              }}>{p.label}</button>
            );
          })}
        </div>
      </div>

      <div style={card(tk)}>
        <div style={{ ...eyebrow(tk), marginBottom: 16 }}>Top merchants</div>
        {top.length === 0 && <div style={{ color: tk.textDim, fontSize: 13 }}>No expenses in this period yet.</div>}
        <div style={{ display: 'grid', gap: 12 }}>
          {top.map((m, i) => {
            const c = getCategoryColor ? getCategoryColor(m.category) : tk.accent;
            const share = data.total > 0 ? (m.total / data.total * 100) : 0;
            return (
              <motion.div key={m.key} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: Math.min(i * 0.03, 0.4) }}>
                <div style={{ display: 'grid', gridTemplateColumns: '24px 1fr auto', gap: 12, alignItems: 'center' }}>
                  <div style={{ fontFamily: 'var(--font-mono)', fontSize: 12, color: tk.textFaint || tk.textDim, textAlign: 'right' }}>{i + 1}</div>
                  <div style={{ minWidth: 0 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, alignItems: 'baseline' }}>
                      <div style={{ color: tk.text, fontSize: 14, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{m.name}</div>
                      <div style={{ fontFamily: 'var(--font-mono)', fontSize: 13, color: tk.text, whiteSpace: 'nowrap' }}>{fmt(m.total)}</div>
                    </div>
                    <div style={{ marginTop: 6, height: 6, borderRadius: 999, background: tk.hairline2 || tk.hairline, overflow: 'hidden' }}>
                      <div style={{ width: `${Math.max(2, (m.total / max) * 100)}%`, height: '100%', background: c, borderRadius: 999 }} />
                    </div>
                    <div style={{ marginTop: 6, fontFamily: 'var(--font-mono)', fontSize: 10.5, color: tk.textDim, display: 'flex', gap: 12, flexWrap: 'wrap' }}>
                      <span>{m.count}× · avg {fmt(m.avg)}</span>
                      <span style={{ color: c }}>{m.category}</span>
                      <span>last {shortDate(m.lastDate)}</span>
                      <span>{share.toFixed(0)}% of spend</span>
                    </div>
                  </div>
                  <div />
                </div>
              </motion.div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

export const MerchantsPreview = () => {
  const { themeTokens: tk, fmt, transactions, setView } = useAppContext();
  const top = useMemo(() => {
    const cur = monthRangeFor(0);
    return merchantTotals(transactions, cur.from, cur.to)[0] || null;
  }, [transactions]);
  return (
    <div onClick={() => setView('merchants')} className="aurum-card-hover" style={{ ...card(tk), cursor: 'pointer' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
        <div style={eyebrow(tk)}>Top Merchants</div>
        <span style={{ fontFamily: 'var(--font-mono)', fontSize: 10, letterSpacing: '0.16em', textTransform: 'uppercase', color: tk.textDim }}>Open →</span>
      </div>
      {top ? (
        <>
          <div style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: tk.textDim }}>#1 this month</div>
          <div style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 24, color: tk.text, marginTop: 6, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{top.name}</div>
          <div style={{ fontFamily: 'var(--font-mono)', fontSize: 13, color: tk.text, marginTop: 4 }}>{fmt(top.total)} <span style={{ color: tk.textDim }}>· {top.count}×</span></div>
        </>
      ) : (
        <div style={{ color: tk.textDim, fontSize: 13 }}>No expenses logged this month yet.</div>
      )}
    </div>
  );
};

export default MerchantsPage;
