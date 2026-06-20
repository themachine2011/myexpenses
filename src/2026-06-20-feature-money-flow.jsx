// Feature (2026-06-20 review): Money Flow — income allocation
//
// What it does: answers the one question no existing view answers as a single
// picture — "of the money that came IN this month, where did it actually GO?"
// Income sits at the top (100%); each spending category is shown as a
// proportional bar with its share of income; a final "Kept / saved" row shows
// what was left (or the overspend, in red).
//
// Why it can't disagree with the rest of the app: it reuses the SAME row split
// the Dashboard Wallet / Cash-Flow KPI uses — `monthBucketRows` (income / fixed
// / variable rows) and `monthBucketTotals` (the cashflow number) from charts.jsx.
// The "Kept / saved" figure IS `monthBucketTotals(...).cashflow`, so it always
// equals the header Wallet number for the current month.
//
// Where it lives: its own "Money Flow" tab (Insights group) + a small Dashboard
// preview card (rendered in the Dashboard left sidebar by App.jsx).
//
// Read-only. No new spending model, no stored-data change. All money via context
// `fmt()`, all colours via context `getCategoryColor()`.

import React, { useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import { useAppContext } from './context.jsx';
import { monthBucketRows, monthBucketTotals } from './charts.jsx';

const card = (tk) => ({
  background: tk.surface, border: `1px solid ${tk.hairline}`, borderRadius: 18, padding: 24,
  backdropFilter: 'blur(24px)', WebkitBackdropFilter: 'blur(24px)',
  boxShadow: tk.isDark ? '0 30px 60px rgba(0,0,0,0.4)' : '0 20px 50px rgba(40,30,20,0.06)',
});
const eyebrow = (tk) => ({
  fontFamily: 'var(--font-mono)', fontSize: 10, letterSpacing: '0.32em',
  textTransform: 'uppercase', color: tk.textDim,
});

const MONTH_LABEL = (y, m) =>
  new Date(y, m, 1).toLocaleDateString('en-US', { month: 'short', year: 'numeric' });

// Build the list of selectable months: current month (month-to-date) plus the
// three previous closed months. Returns newest-first.
const buildMonthOptions = (now) => {
  const opts = [];
  for (let i = 0; i < 4; i++) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    opts.push({
      year: d.getFullYear(),
      month: d.getMonth(),
      // The current month is capped at today (month-to-date) so a future-dated
      // instalment later this month is not counted as already spent — matching
      // the Dashboard KPI behaviour. Closed months use the whole month.
      dayCap: i === 0 ? now.getDate() : null,
      label: i === 0 ? 'This month' : MONTH_LABEL(d.getFullYear(), d.getMonth()),
    });
  }
  return opts;
};

// Pure allocation calc for one month bucket. Groups the fixed + variable expense
// rows by category and ranks them; income and the kept remainder come straight
// from the same charts.jsx helpers the KPI row uses.
export const moneyFlowReport = (transactions, year, month, dayCap = null) => {
  const rows = monthBucketRows(transactions, year, month, dayCap);
  const totals = monthBucketTotals(transactions, year, month, dayCap);
  const income = totals.income;
  const expense = totals.expense;
  const byCat = new Map();
  for (const tx of [...rows.fixed, ...rows.variable]) {
    const key = tx.category || 'Uncategorized';
    const prev = byCat.get(key) || { category: key, total: 0, count: 0, fixed: false };
    prev.total += tx.amount || 0;
    prev.count += 1;
    if (tx.locked) prev.fixed = true;
    byCat.set(key, prev);
  }
  const categories = [...byCat.values()].sort((a, b) => b.total - a.total);
  return {
    income,
    expense,
    kept: totals.cashflow, // income − expense, the SAME number as the Wallet KPI
    categories,
  };
};

export const MoneyFlowPage = () => {
  const { themeTokens: tk, fmt, transactions, getCategoryColor } = useAppContext();
  const now = useMemo(() => new Date(), []);
  const options = useMemo(() => buildMonthOptions(now), [now]);
  const [sel, setSel] = useState(0);
  const opt = options[sel] || options[0];

  const report = useMemo(
    () => moneyFlowReport(transactions, opt.year, opt.month, opt.dayCap),
    [transactions, opt.year, opt.month, opt.dayCap],
  );

  // Bars are sized against income so the picture reads as "share of what came
  // in". If there is no income (or spending exceeds it), fall back to total
  // spend so the bars still convey relative size.
  const denom = report.income > 0 ? report.income : (report.expense || 1);
  const keptShare = report.income > 0 ? (report.kept / report.income) * 100 : 0;
  // Rounded percent for display; `+ 0` normalises JS negative zero so a tiny
  // overspend (e.g. −0.4%) shows "0%" rather than "-0%".
  const keptPct = Math.round(keptShare) + 0;

  return (
    <div style={{ display: 'grid', gap: 24 }}>
      <div style={{ ...card(tk), display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12 }}>
        <div>
          <div style={eyebrow(tk)}>Where the money went</div>
          <div style={{ marginTop: 8, fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 30, color: tk.text }}>{fmt(report.income)}</div>
          <div style={{ fontFamily: 'var(--font-mono)', fontSize: 12, color: tk.textDim, marginTop: 4 }}>
            income in · {opt.label}
          </div>
        </div>
        <div style={{ display: 'inline-flex', borderRadius: 999, overflow: 'hidden', border: `1px solid ${tk.hairline2 || tk.hairline}`, flexWrap: 'wrap' }}>
          {options.map((o, i) => {
            const active = sel === i;
            return (
              <button key={`${o.year}-${o.month}`} onClick={() => setSel(i)} style={{
                padding: '7px 14px', border: 'none', cursor: 'pointer',
                background: active ? tk.accent : 'transparent',
                color: active ? (tk.isDark ? '#0B0B0D' : '#fff') : tk.textDim,
                fontFamily: 'var(--font-mono)', fontSize: 10, letterSpacing: '0.16em', textTransform: 'uppercase',
              }}>{o.label}</button>
            );
          })}
        </div>
      </div>

      <div style={card(tk)}>
        <div style={{ ...eyebrow(tk), marginBottom: 16 }}>Allocation of income</div>

        {report.income <= 0 && report.categories.length === 0 && (
          <div style={{ color: tk.textDim, fontSize: 13 }}>No income or spending recorded for {opt.label.toLowerCase()} yet.</div>
        )}

        {report.income <= 0 && report.categories.length > 0 && (
          <div style={{ color: tk.textDim, fontSize: 12, marginBottom: 14 }}>
            No income recorded this period — bars below show each category's share of total spend.
          </div>
        )}

        <div style={{ display: 'grid', gap: 12 }}>
          {report.categories.map((c, i) => {
            const color = getCategoryColor ? getCategoryColor(c.category) : tk.accent;
            const share = (c.total / denom) * 100;
            return (
              <motion.div key={c.category} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: Math.min(i * 0.03, 0.4) }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, alignItems: 'baseline' }}>
                  <div style={{ color: tk.text, fontSize: 14, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    {c.category}{c.fixed ? <span style={{ color: tk.textDim, fontSize: 10.5 }}> · fixed</span> : ''}
                  </div>
                  <div style={{ fontFamily: 'var(--font-mono)', fontSize: 13, color: tk.text, whiteSpace: 'nowrap' }}>
                    {fmt(c.total)} <span style={{ color: tk.textDim }}>· {share.toFixed(0)}%</span>
                  </div>
                </div>
                <div style={{ marginTop: 6, height: 8, borderRadius: 999, background: tk.hairline2 || tk.hairline, overflow: 'hidden' }}>
                  <div style={{ width: `${Math.max(2, Math.min(100, share))}%`, height: '100%', background: color, borderRadius: 999 }} />
                </div>
              </motion.div>
            );
          })}
        </div>

        {/* Kept / saved row — this IS the Wallet / Cash-Flow number for the month. */}
        {(report.income > 0 || report.categories.length > 0) && (
          <div style={{ marginTop: 20, paddingTop: 16, borderTop: `1px solid ${tk.hairline}` }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, alignItems: 'baseline' }}>
              <div style={{ color: tk.text, fontSize: 14, fontWeight: 600 }}>
                {report.kept >= 0 ? 'Kept / saved' : 'Overspent'}
              </div>
              <div style={{ fontFamily: 'var(--font-mono)', fontSize: 14, color: report.kept >= 0 ? tk.positive : tk.negative, whiteSpace: 'nowrap' }}>
                {report.kept >= 0 ? '+' : '−'}{fmt(Math.abs(report.kept))}
                {report.income > 0 && <span style={{ color: tk.textDim }}> · {keptPct}%</span>}
              </div>
            </div>
            <div style={{ marginTop: 6, height: 8, borderRadius: 999, background: tk.hairline2 || tk.hairline, overflow: 'hidden' }}>
              <div style={{
                width: `${Math.max(2, Math.min(100, Math.abs(keptShare)))}%`, height: '100%',
                background: report.kept >= 0 ? tk.positive : tk.negative, borderRadius: 999,
              }} />
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export const MoneyFlowPreview = () => {
  const { themeTokens: tk, fmt, transactions, getCategoryColor, setView } = useAppContext();
  const top = useMemo(() => {
    const now = new Date();
    const r = moneyFlowReport(transactions, now.getFullYear(), now.getMonth(), now.getDate());
    const t = r.categories[0] || null;
    const share = t && r.income > 0 ? (t.total / r.income) * 100 : null;
    return { cat: t, share, income: r.income };
  }, [transactions]);

  const color = top.cat && getCategoryColor ? getCategoryColor(top.cat.category) : tk.accent;

  return (
    <div onClick={() => setView('moneyFlow')} className="aurum-card-hover" style={{ ...card(tk), cursor: 'pointer' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
        <div style={eyebrow(tk)}>Money Flow</div>
        <span style={{ fontFamily: 'var(--font-mono)', fontSize: 10, letterSpacing: '0.16em', textTransform: 'uppercase', color: tk.textDim }}>Open →</span>
      </div>
      {top.cat ? (
        <>
          <div style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: tk.textDim }}>Biggest slice this month</div>
          <div style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 22, color: tk.text, marginTop: 6, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{top.cat.category}</div>
          <div style={{ fontFamily: 'var(--font-mono)', fontSize: 13, color: tk.text, marginTop: 4 }}>
            {fmt(top.cat.total)}{top.share != null && <span style={{ color: tk.textDim }}> · {top.share.toFixed(0)}% of income</span>}
          </div>
          <div style={{ marginTop: 10, height: 6, borderRadius: 999, background: tk.hairline2 || tk.hairline, overflow: 'hidden' }}>
            <div style={{ width: `${Math.max(2, Math.min(100, top.share != null ? top.share : 100))}%`, height: '100%', background: color, borderRadius: 999 }} />
          </div>
        </>
      ) : (
        <div style={{ color: tk.textDim, fontSize: 13 }}>No spending logged this month yet.</div>
      )}
    </div>
  );
};

export default MoneyFlowPage;
