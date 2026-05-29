import React, { useMemo, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAppContext } from './context.jsx';
import { getCategoryDisplayName } from './2026-05-19-utils-category-colors.js';

const FINANCING_CATEGORIES = new Set(['Financing', 'Debt', 'Debts']);
const SAVINGS_CATEGORY     = 'Savings';

function monthRange(now = new Date()) {
  const y = now.getFullYear();
  const m = now.getMonth();
  return {
    from: new Date(y, m, 1),
    to:   new Date(y, m + 1, 0, 23, 59, 59, 999),
  };
}

function prevMonthRange(now = new Date()) {
  const y = now.getFullYear();
  const m = now.getMonth();
  return {
    from: new Date(y, m - 1, 1),
    to:   new Date(y, m, 0, 23, 59, 59, 999),
  };
}

function withinRange(date, { from, to }) {
  const d = new Date(date);
  return d >= from && d <= to;
}

function aggregatePeriod(transactions, range) {
  let income = 0, operating = 0, financing = 0, savingsFlow = 0, fixed = 0, variable = 0;
  const incomeByCategory   = new Map();
  const expenseByCategory  = new Map();

  for (const t of transactions || []) {
    if (!withinRange(t.date, range)) continue;
    const amt = Number(t.amount) || 0;

    if (t.type === 'income') {
      if (t.category === SAVINGS_CATEGORY) continue;
      income += amt;
      incomeByCategory.set(t.category, (incomeByCategory.get(t.category) || 0) + amt);
    } else if (t.type === 'expense') {
      if (t.category === SAVINGS_CATEGORY) { savingsFlow += amt; continue; }
      if (FINANCING_CATEGORIES.has(t.category)) financing += amt;
      else operating += amt;
      if (t.locked) fixed += amt; else variable += amt;
      expenseByCategory.set(t.category, (expenseByCategory.get(t.category) || 0) + amt);
    }
  }

  const totalExpense = operating + financing;
  const net          = income - totalExpense;
  return { income, totalExpense, operating, financing, savingsFlow, fixed, variable, net,
           incomeByCategory, expenseByCategory };
}

function deltaPct(curr, prev) {
  if (prev === 0 || prev == null || !isFinite(prev)) return null;
  return ((curr - prev) / Math.abs(prev)) * 100;
}

const DeltaChip = ({ pct, tk }) => {
  if (pct == null || !isFinite(pct)) return (
    <span style={{ color: tk.textDim, fontFamily: 'var(--font-mono)', fontSize: 10, letterSpacing: '0.16em' }}>
      —
    </span>
  );
  const positive = pct >= 0;
  const arrow = positive ? '▲' : '▼';
  return (
    <span style={{
      color: positive ? tk.positive : tk.negative,
      fontFamily: 'var(--font-mono)', fontSize: 10, letterSpacing: '0.12em',
    }}>
      {arrow} {Math.abs(pct).toFixed(1)}% vs last mo
    </span>
  );
};

const StatementTile = ({ title, rows, total, totalLabel, totalColor, delta, tk }) => (
  <div style={{
    background: tk.surface2 || tk.surface,
    border: `1px solid ${tk.hairline}`,
    borderRadius: 14, padding: 18,
    display: 'flex', flexDirection: 'column', gap: 12,
    minWidth: 0,
  }}>
    <div style={{
      fontFamily: 'var(--font-mono)', fontSize: 10, letterSpacing: '0.32em',
      textTransform: 'uppercase', color: tk.textDim,
    }}>{title}</div>

    <div style={{ display: 'grid', gap: 6 }}>
      {rows.map((r, i) => (
        <div key={i} style={{
          display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: 12,
        }}>
          <span style={{ color: tk.textDim, fontSize: 12 }}>{r.label}</span>
          <span style={{
            color: r.color || tk.text,
            fontFamily: 'var(--font-mono)', fontSize: 13,
          }}>{r.value}</span>
        </div>
      ))}
    </div>

    <div style={{ borderTop: `1px solid ${tk.hairline}`, paddingTop: 10, display: 'grid', gap: 4 }}>
      <div style={{
        display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: 12,
      }}>
        <span style={{
          fontFamily: 'var(--font-mono)', fontSize: 10, letterSpacing: '0.18em',
          textTransform: 'uppercase', color: tk.textDim,
        }}>{totalLabel}</span>
        <span style={{
          fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 22,
          color: totalColor || tk.text, letterSpacing: '-0.01em',
        }}>{total}</span>
      </div>
      <div style={{ textAlign: 'right' }}><DeltaChip pct={delta} tk={tk} /></div>
    </div>
  </div>
);

const FormalSection = ({ title, lines, total, totalLabel, totalColor, tk }) => (
  <div style={{ display: 'grid', gap: 8 }}>
    <div style={{
      fontFamily: 'var(--font-mono)', fontSize: 10, letterSpacing: '0.28em',
      textTransform: 'uppercase', color: tk.text,
    }}>{title}</div>
    <div style={{ display: 'grid', gap: 4 }}>
      {lines.length === 0 ? (
        <div style={{ color: tk.textDim, fontSize: 12, fontStyle: 'italic' }}>No line items</div>
      ) : lines.map((ln, i) => (
        <div key={i} style={{
          display: 'flex', justifyContent: 'space-between', alignItems: 'baseline',
          padding: '2px 0', borderBottom: i === lines.length - 1 ? 'none' : `1px dashed ${tk.hairline}`,
        }}>
          <span style={{
            color: ln.indent ? tk.textDim : tk.text,
            fontSize: 12, paddingLeft: ln.indent ? 12 : 0,
          }}>{ln.label}</span>
          <span style={{
            color: ln.color || tk.text,
            fontFamily: 'var(--font-mono)', fontSize: 12,
          }}>{ln.value}</span>
        </div>
      ))}
    </div>
    <div style={{
      display: 'flex', justifyContent: 'space-between', alignItems: 'baseline',
      borderTop: `2px solid ${tk.hairline}`, paddingTop: 6, marginTop: 4,
    }}>
      <span style={{
        fontFamily: 'var(--font-mono)', fontSize: 10, letterSpacing: '0.18em',
        textTransform: 'uppercase', color: tk.text,
      }}>{totalLabel}</span>
      <span style={{
        fontFamily: 'var(--font-mono)', fontSize: 15, fontWeight: 700,
        color: totalColor || tk.text,
      }}>{total}</span>
    </div>
  </div>
);

const FS_PRIVACY_MASK_STYLE = (blurred) => ({
  transition: 'filter 320ms cubic-bezier(0.22, 1, 0.36, 1), opacity 320ms cubic-bezier(0.22, 1, 0.36, 1)',
  filter: blurred ? 'blur(14px) saturate(140%)' : 'blur(0px)',
  opacity: blurred ? 0.78 : 1,
  userSelect: blurred ? 'none' : 'auto',
  pointerEvents: blurred ? 'none' : 'auto',
  willChange: 'filter',
});

export const DashboardFinancialStatements = ({ blurred = false }) => {
  const {
    transactions, themeTokens: tk, fmt,
    savingsTotal, netWorthState, debtTotals,
  } = useAppContext();
  const [showFormal, setShowFormal] = useState(false);

  const thisRange = useMemo(() => monthRange(),     []);
  const prevRange = useMemo(() => prevMonthRange(), []);
  const cur = useMemo(() => aggregatePeriod(transactions, thisRange), [transactions, thisRange]);
  const prv = useMemo(() => aggregatePeriod(transactions, prevRange), [transactions, prevRange]);

  const aptValue  = (netWorthState?.apartments || []).reduce((s, a) => s + (Number(a.value) || 0), 0);
  const motoValue = Number(netWorthState?.motorcycle?.marketValue) || 0;
  const liquid    = Number(savingsTotal) || 0;
  const assets    = aptValue + motoValue + liquid;
  const debts     = (debtTotals && debtTotals().remaining) || 0;
  const netWorth  = assets - debts;

  const dIncome = deltaPct(cur.income, prv.income);
  const dCash   = deltaPct(cur.net, prv.net);
  const dFlow   = deltaPct(cur.income - cur.totalExpense, prv.income - prv.totalExpense);

  const incomeLines = [...cur.incomeByCategory.entries()]
    .sort((a, b) => b[1] - a[1])
    .map(([cat, amt]) => ({ label: getCategoryDisplayName(cat), value: `+ ${fmt(amt)}`, color: tk.positive, indent: true }));

  const expenseLines = [...cur.expenseByCategory.entries()]
    .sort((a, b) => b[1] - a[1])
    .map(([cat, amt]) => ({ label: getCategoryDisplayName(cat), value: `− ${fmt(amt)}`, color: tk.negative, indent: true }));

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
      style={{
        background: tk.surface,
        border: `1px solid ${tk.hairline}`,
        borderRadius: 18, padding: 24,
        backdropFilter: 'blur(24px)',
        WebkitBackdropFilter: 'blur(24px)',
        boxShadow: tk.isDark ? '0 30px 60px rgba(0,0,0,0.4)' : '0 20px 50px rgba(40,30,20,0.06)',
        display: 'grid', gap: 18,
      }}>
      <div style={{
        display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12, flexWrap: 'wrap',
      }}>
        <div style={{
          fontFamily: 'var(--font-mono)', fontSize: 10, letterSpacing: '0.32em',
          textTransform: 'uppercase', color: tk.textDim,
        }}>Financial Statements · This Month</div>

        <button
          type="button"
          onClick={() => setShowFormal((v) => !v)}
          aria-expanded={showFormal}
          style={{
            background: 'transparent',
            border: `1px solid ${tk.hairline2 || tk.hairline}`,
            color: tk.textDim,
            padding: '6px 12px', borderRadius: 999,
            fontFamily: 'var(--font-mono)', fontSize: 10,
            letterSpacing: '0.18em', textTransform: 'uppercase',
            cursor: 'pointer',
            transition: 'color 200ms, border-color 200ms',
          }}
          onMouseEnter={(e) => { e.currentTarget.style.color = tk.accent; e.currentTarget.style.borderColor = tk.accent; }}
          onMouseLeave={(e) => { e.currentTarget.style.color = tk.textDim; e.currentTarget.style.borderColor = tk.hairline2 || tk.hairline; }}
        >
          {showFormal ? 'Hide formal ▴' : 'Formal view ▾'}
        </button>
      </div>

      <div style={FS_PRIVACY_MASK_STYLE(blurred)} aria-hidden={blurred || undefined}>
      <div style={{
        display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 14,
      }}>
        <StatementTile
          title="This Month"
          rows={[
            { label: 'Income',   value: `+ ${fmt(cur.income)}`,       color: tk.positive },
            { label: 'Expenses', value: `− ${fmt(cur.totalExpense)}`, color: tk.negative },
          ]}
          total={fmt(cur.net)}
          totalLabel="Net"
          totalColor={cur.net >= 0 ? tk.positive : tk.negative}
          delta={dCash}
          tk={tk}
        />
        <StatementTile
          title="What You Have"
          rows={[
            { label: 'Assets',      value: `+ ${fmt(assets)}`, color: tk.positive },
            { label: 'Liabilities', value: `− ${fmt(debts)}`,  color: tk.negative },
          ]}
          total={fmt(netWorth)}
          totalLabel="Net Worth"
          totalColor={netWorth >= 0 ? tk.positive : tk.negative}
          delta={null}
          tk={tk}
        />
        <StatementTile
          title="Money Movement"
          rows={[
            { label: 'In',  value: `+ ${fmt(cur.income)}`,       color: tk.positive },
            { label: 'Out', value: `− ${fmt(cur.totalExpense)}`, color: tk.negative },
          ]}
          total={fmt(cur.income - cur.totalExpense)}
          totalLabel="Change"
          totalColor={(cur.income - cur.totalExpense) >= 0 ? tk.positive : tk.negative}
          delta={dFlow}
          tk={tk}
        />
      </div>

      <AnimatePresence initial={false}>
        {showFormal && (
          <motion.div
            key="formal"
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
            style={{ overflow: 'hidden' }}
          >
            <div style={{
              display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 18,
              paddingTop: 16, borderTop: `1px solid ${tk.hairline}`,
            }}>
              <FormalSection
                title="Income Statement"
                lines={[
                  ...incomeLines,
                  { label: 'Total Income', value: `+ ${fmt(cur.income)}`, color: tk.positive },
                  ...expenseLines,
                  { label: 'Total Expenses', value: `− ${fmt(cur.totalExpense)}`, color: tk.negative },
                ]}
                total={fmt(cur.net)}
                totalLabel="Net Income"
                totalColor={cur.net >= 0 ? tk.positive : tk.negative}
                tk={tk}
              />

              <FormalSection
                title="Balance Sheet"
                lines={[
                  { label: 'Cash & Savings',   value: fmt(liquid),    indent: true },
                  { label: 'Apartments',       value: fmt(aptValue),  indent: true },
                  { label: 'Motorcycle (FIPE)',value: fmt(motoValue), indent: true },
                  { label: 'Total Assets',     value: `+ ${fmt(assets)}`, color: tk.positive },
                  { label: 'Managed Debts',    value: `− ${fmt(debts)}`,  color: tk.negative, indent: true },
                  { label: 'Total Liabilities',value: `− ${fmt(debts)}`,  color: tk.negative },
                ]}
                total={fmt(netWorth)}
                totalLabel="Equity"
                totalColor={netWorth >= 0 ? tk.positive : tk.negative}
                tk={tk}
              />

              <FormalSection
                title="Cash Flow Statement"
                lines={[
                  { label: 'Income (inflow)',         value: `+ ${fmt(cur.income)}`,    color: tk.positive, indent: true },
                  { label: 'Operating expenses',      value: `− ${fmt(cur.operating)}`, color: tk.negative, indent: true },
                  { label: 'Net Operating',           value: fmt(cur.income - cur.operating) },
                  { label: 'Financing (debts)',       value: `− ${fmt(cur.financing)}`, color: tk.negative, indent: true },
                  { label: 'Savings transfers (out)', value: `− ${fmt(cur.savingsFlow)}`, color: tk.textDim, indent: true },
                ]}
                total={fmt(cur.net)}
                totalLabel="Net Change"
                totalColor={cur.net >= 0 ? tk.positive : tk.negative}
                tk={tk}
              />
            </div>
          </motion.div>
        )}
      </AnimatePresence>
      </div>
    </motion.div>
  );
};
