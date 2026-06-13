// Feature (2026-06-11 review, run 2): Unusual Spending Alerts
//
// What it does: flags recent transactions that are far above their category's
// typical ticket (robust median + MAD statistics), so mistakes, fraud, or
// forgotten one-offs surface without manual scanning.
//
// Why now: this was suggested and deferred on 2026-06-09 / 06-10 / 06-11
// because thresholds "needed tuning". The tuning is now a USER-FACING
// sensitivity toggle (Fewer ×4 / Balanced ×3 / More ×2) instead of a hidden
// constant, which removes that blocker. Locked rows (financing instalments,
// recurring fires) are excluded — fixed commitments are never "unusual".
//
// Where it lives: its own "Alerts" tab + a small Dashboard preview linking in.
// Read-only — flags are computed on the fly, nothing is stored or written.
// Money shown via `fmt()`.

import React, { useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import { useAppContext } from './context.jsx';
import { unusualSpending, SENSITIVITY_LEVELS } from './2026-06-11-utils-yearly-compare-alerts.js';

const card = (tk) => ({
  background: tk.surface, border: `1px solid ${tk.hairline}`, borderRadius: 18, padding: 24,
  backdropFilter: 'blur(24px)', WebkitBackdropFilter: 'blur(24px)',
  boxShadow: tk.isDark ? '0 30px 60px rgba(0,0,0,0.4)' : '0 20px 50px rgba(40,30,20,0.06)',
});
const eyebrow = (tk) => ({
  fontFamily: 'var(--font-mono)', fontSize: 10, letterSpacing: '0.32em',
  textTransform: 'uppercase', color: tk.textDim,
});

const WINDOWS = [
  { id: 30, label: '30d' },
  { id: 90, label: '90d' },
  { id: 180, label: '180d' },
];

const fmtDate = (iso) =>
  new Date(iso).toLocaleDateString('en-US', { day: 'numeric', month: 'short' });

const PillToggle = ({ options, value, onChange, tk }) => (
  <div style={{ display: 'inline-flex', borderRadius: 999, overflow: 'hidden', border: `1px solid ${tk.hairline2 || tk.hairline}` }}>
    {options.map((opt) => {
      const active = value === opt.id;
      return (
        <button key={opt.id} onClick={() => onChange(opt.id)} style={{
          padding: '6px 12px', border: 'none', cursor: 'pointer',
          background: active ? tk.accent : 'transparent',
          color: active ? (tk.isDark ? '#0B0B0D' : '#fff') : tk.textDim,
          fontFamily: 'var(--font-mono)', fontSize: 10, letterSpacing: '0.16em', textTransform: 'uppercase',
        }}>{opt.label}</button>
      );
    })}
  </div>
);

const useAlerts = (windowDays, sensitivityId) => {
  const { transactions } = useAppContext();
  return useMemo(() => {
    const level = SENSITIVITY_LEVELS.find((l) => l.id === sensitivityId) || SENSITIVITY_LEVELS[1];
    return unusualSpending(transactions, { windowDays, multiplier: level.multiplier });
  }, [transactions, windowDays, sensitivityId]);
};

export const AlertsPage = () => {
  const { themeTokens: tk, fmt, getCategoryColor, setFocusTxId, setView } = useAppContext();
  const [windowDays, setWindowDays] = useState(90);
  const [sensitivity, setSensitivity] = useState('medium');
  const r = useAlerts(windowDays, sensitivity);

  return (
    <div style={{ display: 'grid', gap: 24 }}>
      {/* Summary + controls */}
      <div style={{ ...card(tk), display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(170px, 1fr))', gap: 16, alignItems: 'center' }}>
        <div>
          <div style={eyebrow(tk)}>Flagged ({windowDays}d)</div>
          <div style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 28, color: r.alerts.length ? tk.negative : tk.positive, marginTop: 8 }}>
            {r.alerts.length}
          </div>
          <div style={{ fontFamily: 'var(--font-mono)', fontSize: 12, color: tk.textDim, marginTop: 4 }}>
            of {r.scanned} checked
          </div>
        </div>
        <div>
          <div style={eyebrow(tk)}>Window</div>
          <div style={{ marginTop: 10 }}>
            <PillToggle options={WINDOWS} value={windowDays} onChange={setWindowDays} tk={tk} />
          </div>
        </div>
        <div>
          <div style={eyebrow(tk)}>Alerts · sensitivity</div>
          <div style={{ marginTop: 10 }}>
            <PillToggle options={SENSITIVITY_LEVELS} value={sensitivity} onChange={setSensitivity} tk={tk} />
          </div>
        </div>
      </div>

      {/* Alert list */}
      {r.alerts.length === 0 ? (
        <div style={{ ...card(tk), color: tk.textDim, fontSize: 14, lineHeight: 1.6 }}>
          Nothing unusual in the last {windowDays} days — every recent purchase is
          in line with its category's typical size. Raise the sensitivity to
          “More” to look closer.
        </div>
      ) : (
        <div style={card(tk)}>
          <div style={{ ...eyebrow(tk), marginBottom: 12 }}>Worth a look</div>
          {r.alerts.slice(0, 50).map((a, i) => (
            <motion.div key={a.id || i} initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.02 }}
              onClick={() => { setFocusTxId?.(a.id); setView('transactions'); }}
              style={{ display: 'grid', gridTemplateColumns: '56px 1fr auto', gap: 14, alignItems: 'center', padding: '10px 0', borderBottom: `1px solid ${tk.hairline}`, cursor: 'pointer' }}>
              <span style={{ fontFamily: 'var(--font-mono)', fontSize: 12, color: tk.textDim }}>{fmtDate(a.date)}</span>
              <div style={{ minWidth: 0 }}>
                <div style={{ fontSize: 14, color: tk.text, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{a.description}</div>
                <div style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: tk.textDim, display: 'flex', alignItems: 'center', gap: 6, marginTop: 2 }}>
                  <span style={{ width: 8, height: 8, borderRadius: '50%', background: getCategoryColor(a.category), flexShrink: 0 }} />
                  {a.category} · typical {fmt(a.typical)}
                </div>
              </div>
              <div style={{ textAlign: 'right' }}>
                <div style={{ fontFamily: 'var(--font-mono)', fontSize: 14, color: tk.negative }}>{fmt(a.amount)}</div>
                <div style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: tk.textDim, marginTop: 2 }}>×{a.ratio.toFixed(1)} typical</div>
              </div>
            </motion.div>
          ))}
          {r.alerts.length > 50 && (
            <div style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: tk.textDim, marginTop: 10 }}>
              Showing the top 50 of {r.alerts.length} — narrow the window or lower the sensitivity.
            </div>
          )}
        </div>
      )}

      <div style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: tk.textFaint || tk.textDim, lineHeight: 1.6 }}>
        How it works: each purchase is compared with its category's typical
        (median) ticket across your whole history. It's flagged when it's beyond
        the sensitivity multiplier AND beyond the category's normal spread — so
        naturally varied categories don't cry wolf. Fixed commitments (financing
        instalments, recurring bills) and categories with fewer than {r.minSamples}{' '}
        purchases are skipped. Flags are computed live — nothing is stored.
        Click a row to open it in Transactions.
      </div>
    </div>
  );
};

export const AlertsPreview = () => {
  const { themeTokens: tk, fmt, setView } = useAppContext();
  const r = useAlerts(90, 'medium');
  const top = r.alerts[0] || null;
  return (
    <div onClick={() => setView('alerts')} className="aurum-card-hover" style={{ ...card(tk), cursor: 'pointer' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
        <div style={eyebrow(tk)}>Spending Alerts</div>
        <span style={{ fontFamily: 'var(--font-mono)', fontSize: 10, letterSpacing: '0.16em', textTransform: 'uppercase', color: tk.textDim }}>Open →</span>
      </div>
      <div style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: tk.textDim }}>Unusual in last 90 days</div>
      <div style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 26, color: r.alerts.length ? tk.negative : tk.positive, marginTop: 6 }}>
        {r.alerts.length === 0 ? 'All clear' : r.alerts.length}
      </div>
      {top ? (
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginTop: 12, fontFamily: 'var(--font-mono)', fontSize: 12, gap: 10 }}>
          <span style={{ color: tk.textDim, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{top.description}</span>
          <span style={{ color: tk.text, flexShrink: 0 }}>{fmt(top.amount)} · ×{top.ratio.toFixed(1)}</span>
        </div>
      ) : (
        <div style={{ fontFamily: 'var(--font-mono)', fontSize: 12, color: tk.textDim, marginTop: 12 }}>
          Recent purchases match their usual size.
        </div>
      )}
      <div style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: tk.textDim, marginTop: 8 }}>{r.scanned} purchases checked</div>
    </div>
  );
};

export default AlertsPage;
