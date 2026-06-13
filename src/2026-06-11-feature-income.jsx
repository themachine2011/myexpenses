// Feature (2026-06-11 review): Income Insights
//
// What it does: the income counterpart to all the expense analytics. Shows a
// monthly income trend, your top income sources (grouped by description),
// income split by category, average monthly income, and a simple stability
// read (steady salary vs lumpy freelance). Period toggle: 6M / 12M.
//
// Where it lives: its own "Income" tab + a small Dashboard preview showing your
// average monthly income + stability, linking into the tab.
//
// Read-only. Pure function of `transactions` (type 'income', Savings excluded);
// money shown via `fmt()`.

import React, { useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import { useAppContext } from './context.jsx';
import { incomeInsights } from './2026-06-11-utils-insights.js';

const card = (tk) => ({
  background: tk.surface, border: `1px solid ${tk.hairline}`, borderRadius: 18, padding: 24,
  backdropFilter: 'blur(24px)', WebkitBackdropFilter: 'blur(24px)',
  boxShadow: tk.isDark ? '0 30px 60px rgba(0,0,0,0.4)' : '0 20px 50px rgba(40,30,20,0.06)',
});
const eyebrow = (tk) => ({
  fontFamily: 'var(--font-mono)', fontSize: 10, letterSpacing: '0.32em',
  textTransform: 'uppercase', color: tk.textDim,
});

const stabilityWord = (score) => {
  if (score >= 85) return 'Very steady';
  if (score >= 70) return 'Steady';
  if (score >= 50) return 'Variable';
  return 'Lumpy';
};

const useIncome = (months) => {
  const { transactions } = useAppContext();
  return useMemo(() => incomeInsights(transactions, months), [transactions, months]);
};

export const IncomePage = () => {
  const { themeTokens: tk, fmt, getCategoryColor } = useAppContext();
  const [months, setMonths] = useState(6);
  const d = useIncome(months);
  const maxMonth = Math.max(1, ...d.series.map((m) => m.income));

  return (
    <div style={{ display: 'grid', gap: 24 }}>
      {/* Summary + window toggle */}
      <div style={{ ...card(tk), display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 16, alignItems: 'center' }}>
        <div>
          <div style={eyebrow(tk)}>Avg monthly income</div>
          <div style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 28, color: tk.text, marginTop: 8 }}>{fmt(d.avgMonthly)}</div>
          <div style={{ fontFamily: 'var(--font-mono)', fontSize: 12, color: tk.textDim, marginTop: 4 }}>last {d.windowMonths} months</div>
        </div>
        <div>
          <div style={eyebrow(tk)}>Stability</div>
          <div style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 28, color: tk.text, marginTop: 8 }}>{stabilityWord(d.stabilityScore)}</div>
          <div style={{ fontFamily: 'var(--font-mono)', fontSize: 12, color: tk.textDim, marginTop: 4 }}>{d.stabilityScore}/100 steadiness</div>
        </div>
        <div>
          <div style={eyebrow(tk)}>Top source</div>
          <div style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 22, color: tk.text, marginTop: 8, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{d.topSource?.name || '—'}</div>
          <div style={{ fontFamily: 'var(--font-mono)', fontSize: 12, color: tk.textDim, marginTop: 4 }}>{d.topSource ? `${d.topSource.share.toFixed(0)}% of income` : 'no income yet'}</div>
        </div>
        <div style={{ justifySelf: 'end' }}>
          <div style={{ display: 'inline-flex', borderRadius: 999, overflow: 'hidden', border: `1px solid ${tk.hairline2 || tk.hairline}` }}>
            {[{ id: 6, label: '6M' }, { id: 12, label: '12M' }].map((opt) => {
              const active = months === opt.id;
              return (
                <button key={opt.id} onClick={() => setMonths(opt.id)} style={{
                  padding: '6px 14px', border: 'none', cursor: 'pointer',
                  background: active ? tk.accent : 'transparent',
                  color: active ? (tk.isDark ? '#0B0B0D' : '#fff') : tk.textDim,
                  fontFamily: 'var(--font-mono)', fontSize: 10, letterSpacing: '0.16em', textTransform: 'uppercase',
                }}>{opt.label}</button>
              );
            })}
          </div>
        </div>
      </div>

      {d.total === 0 ? (
        <div style={{ ...card(tk), color: tk.textDim, fontSize: 14 }}>No income recorded in this period yet.</div>
      ) : (
        <>
          {/* Monthly income trend */}
          <div style={card(tk)}>
            <div style={{ ...eyebrow(tk), marginBottom: 16 }}>Monthly income</div>
            <div style={{ display: 'flex', alignItems: 'flex-end', gap: 8, height: 140 }}>
              {d.series.map((m) => (
                <div key={`${m.label}-${m.year}`} title={`${m.label} ${m.year} · ${fmt(m.income)}`}
                  style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'flex-end', height: '100%', gap: 6 }}>
                  <div style={{ height: `${Math.max(2, (m.income / maxMonth) * 100)}%`, background: tk.positive || tk.accent, opacity: m.income > 0 ? 0.9 : 0.2, borderRadius: '4px 4px 0 0' }} />
                  <div style={{ textAlign: 'center', fontFamily: 'var(--font-mono)', fontSize: 10, color: tk.textFaint || tk.textDim }}>{m.label}</div>
                </div>
              ))}
            </div>
          </div>

          {/* Top sources */}
          <div style={card(tk)}>
            <div style={{ ...eyebrow(tk), marginBottom: 16 }}>Top income sources</div>
            <div style={{ display: 'grid', gap: 12 }}>
              {d.bySource.slice(0, 8).map((s, i) => (
                <motion.div key={s.key} initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.03 }}
                  style={{ display: 'grid', gridTemplateColumns: '1fr 1.6fr auto', gap: 14, alignItems: 'center' }}>
                  <span style={{ fontFamily: 'var(--font-body)', fontSize: 14, color: tk.text, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{s.name}</span>
                  <div style={{ height: 10, borderRadius: 999, background: tk.hairline2 || tk.hairline, overflow: 'hidden' }}>
                    <div style={{ width: `${Math.max(2, s.share)}%`, height: '100%', background: tk.positive || tk.accent, borderRadius: 999, transition: 'width 320ms' }} />
                  </div>
                  <span style={{ textAlign: 'right', fontFamily: 'var(--font-mono)', fontSize: 12, color: tk.text }}>{fmt(s.total)} <span style={{ color: tk.textDim }}>· {s.share.toFixed(0)}%</span></span>
                </motion.div>
              ))}
            </div>
          </div>

          {/* By category */}
          {d.byCategory.length > 0 && (
            <div style={card(tk)}>
              <div style={{ ...eyebrow(tk), marginBottom: 16 }}>Income by category</div>
              <div style={{ display: 'grid', gap: 12 }}>
                {d.byCategory.map((c, i) => {
                  const color = getCategoryColor ? getCategoryColor(c.category) : (tk.positive || tk.accent);
                  return (
                    <div key={c.category} style={{ display: 'grid', gridTemplateColumns: '1fr 1.6fr auto', gap: 14, alignItems: 'center' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, minWidth: 0 }}>
                        <span style={{ width: 9, height: 9, borderRadius: '50%', background: color, flexShrink: 0 }} />
                        <span style={{ fontFamily: 'var(--font-body)', fontSize: 14, color: tk.text, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{c.category}</span>
                      </div>
                      <div style={{ height: 10, borderRadius: 999, background: tk.hairline2 || tk.hairline, overflow: 'hidden' }}>
                        <div style={{ width: `${Math.max(2, c.share)}%`, height: '100%', background: color, borderRadius: 999, transition: 'width 320ms' }} />
                      </div>
                      <span style={{ textAlign: 'right', fontFamily: 'var(--font-mono)', fontSize: 12, color: tk.text }}>{fmt(c.total)} <span style={{ color: tk.textDim }}>· {c.share.toFixed(0)}%</span></span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </>
      )}

      <div style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: tk.textFaint || tk.textDim, lineHeight: 1.6 }}>
        Income = transactions of type income (Savings transfers excluded). Stability
        is higher when month-to-month income varies less; a lumpy freelance income
        scores lower than a fixed salary.
      </div>
    </div>
  );
};

export const IncomePreview = () => {
  const { themeTokens: tk, fmt, setView } = useAppContext();
  const d = useIncome(6);
  const maxMonth = Math.max(1, ...d.series.map((m) => m.income));
  return (
    <div onClick={() => setView('income')} className="aurum-card-hover" style={{ ...card(tk), cursor: 'pointer' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
        <div style={eyebrow(tk)}>Income Insights</div>
        <span style={{ fontFamily: 'var(--font-mono)', fontSize: 10, letterSpacing: '0.16em', textTransform: 'uppercase', color: tk.textDim }}>Open →</span>
      </div>
      {d.total > 0 ? (
        <>
          <div style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: tk.textDim }}>Avg / month · last 6 months</div>
          <div style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 26, color: tk.text, marginTop: 6 }}>{fmt(d.avgMonthly)}</div>
          <div style={{ display: 'flex', alignItems: 'flex-end', gap: 4, height: 36, marginTop: 12 }}>
            {d.series.map((m) => (
              <div key={`${m.label}-${m.year}`} style={{ flex: 1, height: `${Math.max(6, (m.income / maxMonth) * 100)}%`, background: tk.positive || tk.accent, opacity: 0.85, borderRadius: '2px 2px 0 0' }} />
            ))}
          </div>
          <div style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: tk.textDim, marginTop: 10 }}>{stabilityWord(d.stabilityScore)} · {d.stabilityScore}/100</div>
        </>
      ) : (
        <div style={{ color: tk.textDim, fontSize: 13 }}>Record some income to see your earnings trend.</div>
      )}
    </div>
  );
};

export default IncomePage;
