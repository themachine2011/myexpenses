// Feature (2026-06-18 review, run 2): Debt Strategy.
//
// What it does: turns the user-managed debts list into a payoff priority view:
// highest-interest "avalanche", smallest-balance "snowball", monthly interest
// drag, estimated payment plan, and the next debt to attack.
//
// Where it lives: its own "Debt Plan" tab (Plan group, beside Debts) plus a
// small Dashboard preview card. Read-only; it never writes debt data.

import React, { useMemo } from 'react';
import { motion } from 'framer-motion';
import { useAppContext } from './context.jsx';
import { debtStrategyReport } from './2026-06-18-utils-debt-strategy.js';

const card = (tk) => ({
  background: tk.surface, border: `1px solid ${tk.hairline}`, borderRadius: 18, padding: 24,
  backdropFilter: 'blur(24px)', WebkitBackdropFilter: 'blur(24px)',
  boxShadow: tk.isDark ? '0 30px 60px rgba(0,0,0,0.4)' : '0 20px 50px rgba(40,30,20,0.06)',
});

const eyebrow = (tk) => ({
  fontFamily: 'var(--font-mono)', fontSize: 10, letterSpacing: '0.32em',
  textTransform: 'uppercase', color: tk.textDim,
});

const toneColor = (tk, tone) =>
  tone === 'positive' ? tk.positive : tone === 'negative' ? tk.negative : tk.accent;

const useDebtStrategy = () => {
  const { debtsState } = useAppContext();
  return useMemo(() => debtStrategyReport({ debts: debtsState }), [debtsState]);
};

const Stat = ({ tk, label, value, color, sub }) => (
  <div>
    <div style={eyebrow(tk)}>{label}</div>
    <div style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 26, color: color || tk.text, marginTop: 8 }}>
      {value}
    </div>
    {sub && <div style={{ fontFamily: 'var(--font-mono)', fontSize: 12, color: tk.textDim, marginTop: 4 }}>{sub}</div>}
  </div>
);

const StrategyCard = ({ tk, title, debt, children, active }) => (
  <div style={{
    ...card(tk),
    borderColor: active ? tk.accent : tk.hairline,
    boxShadow: active ? `0 0 0 1px ${tk.accent}33` : card(tk).boxShadow,
  }}>
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: 12 }}>
      <div style={eyebrow(tk)}>{title}</div>
      {active && (
        <span style={{
          fontFamily: 'var(--font-mono)', fontSize: 9, letterSpacing: '0.18em',
          textTransform: 'uppercase', color: tk.accent,
        }}>
          Recommended
        </span>
      )}
    </div>
    <div style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 24, color: tk.text, marginTop: 10 }}>
      {debt?.name || 'No active debt'}
    </div>
    <div style={{ color: tk.textDim, fontSize: 13, lineHeight: 1.5, marginTop: 8 }}>
      {children}
    </div>
  </div>
);

const DebtRow = ({ debt, index, tk, fmt }) => {
  const principal = debt.principal || 1;
  const pct = Math.min(100, Math.max(0, (debt.paid / principal) * 100));
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.035 }}
      style={{
        display: 'grid',
        gridTemplateColumns: 'minmax(160px, 1.4fr) repeat(4, minmax(90px, 1fr))',
        gap: 12,
        alignItems: 'center',
        padding: '12px 0',
        borderBottom: `1px solid ${tk.hairline}`,
      }}
    >
      <div style={{ minWidth: 0 }}>
        <div style={{ color: tk.text, fontSize: 14, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {debt.name}
        </div>
        <div style={{ height: 6, borderRadius: 999, background: tk.hairline2 || tk.hairline, overflow: 'hidden', marginTop: 8 }}>
          <div style={{ width: `${pct}%`, height: '100%', background: tk.positive || tk.accent, borderRadius: 999 }} />
        </div>
      </div>
      <div style={{ fontFamily: 'var(--font-mono)', fontSize: 12, color: tk.text }}>{fmt(debt.remaining)}</div>
      <div style={{ fontFamily: 'var(--font-mono)', fontSize: 12, color: debt.ratePct > 0 ? tk.accent : tk.textDim }}>{debt.ratePct.toFixed(2)}%/mo</div>
      <div style={{ fontFamily: 'var(--font-mono)', fontSize: 12, color: tk.textDim }}>{fmt(debt.monthlyInterest)}</div>
      <div style={{ fontFamily: 'var(--font-mono)', fontSize: 12, color: tk.textDim }}>
        {debt.payoffLabel || 'No target'}
      </div>
    </motion.div>
  );
};

export const DebtStrategyPage = () => {
  const { themeTokens: tk, fmt, setView } = useAppContext();
  const r = useDebtStrategy();
  const color = toneColor(tk, r.band.tone);
  const activeStrategy = r.strategy;

  return (
    <div style={{ display: 'grid', gap: 24 }}>
      <div style={{ ...card(tk), display: 'grid', gridTemplateColumns: 'minmax(220px, 320px) 1fr', gap: 28, alignItems: 'center' }}>
        <div>
          <div style={eyebrow(tk)}>Debt payoff priority</div>
          <div style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 50, lineHeight: 1, color, marginTop: 10 }}>
            {r.hasDebt ? fmt(r.totalRemaining) : fmt(0)}
          </div>
          <div style={{ fontFamily: 'var(--font-mono)', fontSize: 11, letterSpacing: '0.18em', textTransform: 'uppercase', color, marginTop: 10 }}>
            {r.band.label}
          </div>
        </div>
        <div>
          <div style={{ color: tk.textDim, fontSize: 14, lineHeight: 1.6, maxWidth: 600 }}>
            {r.hasDebt ? (
              <>
                Focus extra payments on <b style={{ color: tk.text }}>{r.priorityDebt?.name}</b> first.
                {activeStrategy === 'avalanche'
                  ? <> It has the highest monthly rate, so the avalanche route reduces interest drag first.</>
                  : <> It has the smallest remaining balance, so the snowball route gives the fastest account closure.</>}
              </>
            ) : (
              <>No managed debts are active. Add loans or borrowed balances on the Debts tab and this will rank the payoff order.</>
            )}
          </div>
          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', marginTop: 16 }}>
            <button onClick={() => setView('debts')} style={{
              background: 'transparent', border: `1px solid ${tk.hairline2 || tk.hairline}`, color: tk.text,
              padding: '8px 16px', borderRadius: 999, fontFamily: 'var(--font-mono)', fontSize: 10,
              letterSpacing: '0.18em', textTransform: 'uppercase', cursor: 'pointer',
            }}>Manage debts -&gt;</button>
            <button onClick={() => setView('networth')} style={{
              background: 'transparent', border: `1px solid ${tk.hairline2 || tk.hairline}`, color: tk.text,
              padding: '8px 16px', borderRadius: 999, fontFamily: 'var(--font-mono)', fontSize: 10,
              letterSpacing: '0.18em', textTransform: 'uppercase', cursor: 'pointer',
            }}>Net worth -&gt;</button>
          </div>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 16 }}>
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} style={card(tk)}>
          <Stat tk={tk} label="Active debts" value={r.activeCount} color={tk.text}
            sub={`${Math.round(r.progressPct)}% paid overall`} />
        </motion.div>
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }} style={card(tk)}>
          <Stat tk={tk} label="Monthly plan" value={fmt(r.monthlyPayment)} color={r.monthlyPayment > 0 ? tk.text : tk.textDim}
            sub={r.monthlyPayment > 0 ? 'From payoff-month targets' : 'Add payoff months to estimate'} />
        </motion.div>
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} style={card(tk)}>
          <Stat tk={tk} label="Interest drag" value={fmt(r.monthlyInterest)} color={r.monthlyInterest > 0 ? tk.negative : tk.textDim}
            sub={`${r.weightedRate.toFixed(2)}% weighted monthly rate`} />
        </motion.div>
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }} style={card(tk)}>
          <Stat tk={tk} label="Debt-free target" value={r.debtFreeLabel || '--'} color={r.debtFreeLabel ? tk.positive : tk.textDim}
            sub={r.debtFreeMonths == null ? 'Some debts need payoff months' : `~${r.debtFreeMonths} months`} />
        </motion.div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: 16 }}>
        <StrategyCard tk={tk} title="Avalanche" debt={r.avalancheDebt} active={activeStrategy === 'avalanche'}>
          Pay the highest monthly-rate debt first. Best when interest cost is the main risk.
        </StrategyCard>
        <StrategyCard tk={tk} title="Snowball" debt={r.snowballDebt} active={activeStrategy === 'snowball'}>
          Pay the smallest remaining balance first. Best when quick account closures help momentum.
        </StrategyCard>
      </div>

      <div style={card(tk)}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 10, flexWrap: 'wrap', gap: 8 }}>
          <div style={eyebrow(tk)}>Payoff queue</div>
          <div style={{ fontFamily: 'var(--font-mono)', fontSize: 12, color: tk.textDim }}>
            sorted by recommended strategy
          </div>
        </div>
        {r.hasDebt ? (
          <>
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'minmax(160px, 1.4fr) repeat(4, minmax(90px, 1fr))',
              gap: 12,
              color: tk.textFaint || tk.textDim,
              fontFamily: 'var(--font-mono)',
              fontSize: 10,
              letterSpacing: '0.16em',
              textTransform: 'uppercase',
              paddingBottom: 8,
            }}>
              <span>Debt</span>
              <span>Remaining</span>
              <span>Rate</span>
              <span>Interest</span>
              <span>Target</span>
            </div>
            {(activeStrategy === 'avalanche' ? r.avalanche : r.snowball).map((debt, i) => (
              <DebtRow key={debt.id} debt={debt} index={i} tk={tk} fmt={fmt} />
            ))}
          </>
        ) : (
          <div style={{ color: tk.textDim, fontSize: 14, padding: '18px 0' }}>
            Add a managed debt to build a payoff queue.
          </div>
        )}
      </div>

      <div style={{ color: tk.textFaint || tk.textDim, fontSize: 12, lineHeight: 1.5 }}>
        Payment estimates use the existing monthly rate and payoff-month fields. They are planning math,
        not recorded payments, and do not include the separate Triumph financing schedule.
      </div>
    </div>
  );
};

export const DebtStrategyPreview = () => {
  const { themeTokens: tk, fmt, setView } = useAppContext();
  const r = useDebtStrategy();
  const color = toneColor(tk, r.band.tone);
  return (
    <div onClick={() => setView('debtStrategy')} className="aurum-card-hover" style={{ ...card(tk), cursor: 'pointer' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
        <div style={eyebrow(tk)}>Debt Plan</div>
        <span style={{ fontFamily: 'var(--font-mono)', fontSize: 10, letterSpacing: '0.16em', textTransform: 'uppercase', color: tk.textDim }}>Open -&gt;</span>
      </div>
      <div style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: tk.textDim }}>Managed debt remaining</div>
      <div style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 30, color, marginTop: 6 }}>
        {fmt(r.totalRemaining)}
      </div>
      <div style={{ fontFamily: 'var(--font-mono)', fontSize: 12, color: tk.textDim, marginTop: 4 }}>
        {r.hasDebt ? `Next: ${r.priorityDebt?.name}` : 'No active managed debt'}
      </div>
    </div>
  );
};

export default DebtStrategyPage;
