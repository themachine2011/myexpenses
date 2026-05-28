import React, { useState, useEffect, useMemo, useRef } from 'react';
import { useAppContext } from './context.jsx';
import { getCategoryDisplayName, USELESS_CATEGORY } from './2026-05-19-utils-category-colors.js';

const CYCLE_MS = 30_000;
const HISTORY_SIZE = 10;
const OVERSPEND_WINDOW_DAYS = 15;
const OVERSPEND_THRESHOLD = 100;
const ACCENT = '#C5A572';
// Skip meta-buckets: Savings/Financing are non-discretionary flows, Useless is
// the dump for un-categorized transactions — none make sense as "reduce X" tips.
const EXCLUDED = new Set(['Savings', 'Financing', USELESS_CATEGORY]);
const PERCENTAGES = [10, 15, 20, 25, 30, 35, 40, 45, 50];

// ---------- Pure selectors ----------

function topCategoriesThisMonth(transactions) {
  const now = new Date();
  const start = new Date(now.getFullYear(), now.getMonth(), 1).getTime();
  const end   = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999).getTime();
  const totals = new Map();
  for (const t of transactions) {
    if (t.type !== 'expense') continue;
    if (EXCLUDED.has(t.category)) continue;
    const ts = new Date(t.date).getTime();
    if (ts < start || ts > end) continue;
    totals.set(t.category, (totals.get(t.category) || 0) + (Number(t.amount) || 0));
  }
  return [...totals.entries()]
    .map(([category, total]) => ({ category, total }))
    .sort((a, b) => b.total - a.total)
    .slice(0, 5);
}

function buildSavingCandidates(topCategories) {
  if (!topCategories.length) return [];
  const out = [];
  for (const { category, total } of topCategories) {
    for (const pct of PERCENTAGES) {
      out.push({
        id: `${category}|${pct}`,
        category,
        reductionPct: pct,
        savingAmount: total * (pct / 100),
        subs: topCategories.slice(0, 3).map((c) => ({
          category: c.category,
          pct,
          saving: c.total * (pct / 100),
        })),
      });
    }
  }
  return out;
}

function topOverspendingGroup(transactions) {
  const cutoff = Date.now() - OVERSPEND_WINDOW_DAYS * 24 * 60 * 60 * 1000;
  const byDesc = new Map();
  const byCategory = new Map();
  const categoryForDesc = new Map();
  for (const t of transactions) {
    if (t.type !== 'expense') continue;
    if (EXCLUDED.has(t.category)) continue;
    const ts = new Date(t.date).getTime();
    if (ts < cutoff) continue;
    const desc = (t.description || '').trim();
    const amt  = Number(t.amount) || 0;
    if (desc) {
      byDesc.set(desc, (byDesc.get(desc) || 0) + amt);
      if (!categoryForDesc.has(desc)) categoryForDesc.set(desc, t.category);
    }
    byCategory.set(t.category, (byCategory.get(t.category) || 0) + amt);
  }
  const groups = [];
  for (const [desc, total] of byDesc) {
    if (total > OVERSPEND_THRESHOLD) {
      groups.push({ kind: 'item', label: desc, total, category: categoryForDesc.get(desc) });
    }
  }
  for (const [cat, total] of byCategory) {
    if (total > OVERSPEND_THRESHOLD) {
      groups.push({ kind: 'category', label: cat, total, category: cat });
    }
  }
  groups.sort((a, b) => b.total - a.total);
  return groups[0] || null;
}

// ---------- Hook: rotate suggestions, dedupe last 10 ----------

function useDynamicSuggestion(candidates) {
  const [current, setCurrent] = useState(null);
  // Ring buffer of last 10 candidate ids. When all candidates have been used
  // within the window, the spec allows the 11th bubble to reuse the first.
  const historyRef = useRef([]);

  const pickNext = (cands) => {
    if (!cands.length) return null;
    const recent = new Set(historyRef.current);
    const fresh = cands.filter((c) => !recent.has(c.id));
    const pool = fresh.length ? fresh : cands;
    const next = pool[Math.floor(Math.random() * pool.length)];
    historyRef.current = [next.id, ...historyRef.current].slice(0, HISTORY_SIZE);
    return next;
  };

  useEffect(() => {
    setCurrent(pickNext(candidates));
  }, [candidates]);

  useEffect(() => {
    if (!candidates.length) return undefined;
    const id = setInterval(() => setCurrent(pickNext(candidates)), CYCLE_MS);
    return () => clearInterval(id);
  }, [candidates]);

  return current;
}

// ---------- Keyframes (injected once) ----------

const KEYFRAMES_ID = '__aurum_insight_bubbles_kf';
const KEYFRAMES = `
  @keyframes auInflatePop {
    0%   { transform: translate(-50%, -50%) scale(0.82); opacity: 0; }
    5%   { transform: translate(-50%, -50%) scale(0.95); opacity: 1; }
    88%  { transform: translate(-50%, -50%) scale(1.08); opacity: 1; }
    95%  { transform: translate(-50%, -50%) scale(1.22); opacity: 0.85; }
    100% { transform: translate(-50%, -50%) scale(1.32); opacity: 0; }
  }
  @keyframes auBreath {
    0%, 100% { transform: translate(-50%, -50%) scale(1.00); }
    50%      { transform: translate(-50%, -50%) scale(1.035); }
  }
  @keyframes auSubFloat {
    0%, 100% { transform: var(--sub-base) translateY(0); }
    50%      { transform: var(--sub-base) translateY(-3px); }
  }
`;

function ensureKeyframes() {
  if (typeof document === 'undefined') return;
  if (document.getElementById(KEYFRAMES_ID)) return;
  const s = document.createElement('style');
  s.id = KEYFRAMES_ID;
  s.textContent = KEYFRAMES;
  document.head.appendChild(s);
}

// ---------- Palette (Aurora — theme-adaptive) ----------

function getPalette(themeTokens) {
  const isDark = themeTokens.isDark;
  return {
    bg: isDark ? 'rgba(255,255,255,0.10)' : 'rgba(255,255,255,0.32)',
    border: isDark ? 'rgba(255,250,235,0.24)' : 'rgba(197,165,114,0.38)',
    text: themeTokens.text,
    textDim: themeTokens.textDim,
    accent: ACCENT,
    subBg: isDark ? 'rgba(255,250,235,0.20)' : 'rgba(20,18,14,0.55)',
    subText: isDark ? '#1A1612' : '#FFFFFF',
    subBorder: isDark ? 'rgba(255,250,235,0.32)' : 'rgba(197,165,114,0.55)',
    shadow: isDark
      ? '0 14px 30px rgba(0,0,0,0.45), inset 0 1px 0 rgba(255,255,255,0.18)'
      : '0 14px 30px rgba(60,40,20,0.18), inset 0 1px 0 rgba(255,255,255,0.80)',
  };
}

// ---------- Tight pill surface (content-hugging) ----------

const pillSurface = (palette) => ({
  position: 'absolute',
  top: '50%', left: '50%',
  display: 'inline-flex',
  alignItems: 'center',
  gap: 6,
  borderRadius: 999,
  background: `
    radial-gradient(circle at 30% 28%, rgba(255,255,255,0.65), rgba(255,255,255,0.15) 40%, transparent 72%),
    ${palette.bg}
  `,
  border: `1px solid ${palette.border}`,
  backdropFilter: 'blur(12px) saturate(160%)',
  WebkitBackdropFilter: 'blur(12px) saturate(160%)',
  boxShadow: palette.shadow,
  color: palette.text,
  padding: '6px 14px',
  whiteSpace: 'nowrap',
  fontSize: 12,
  lineHeight: 1.25,
  transformOrigin: '50% 50%',
});

// ---------- Sub-bubble (small circle, clusters around main pill) ----------

function SubBubble({ sub, angle, palette, fmt }) {
  const rad = (angle * Math.PI) / 180;
  // Elliptical orbit: wider horizontally to clear the pill shape of the main bubble.
  const x = Math.cos(rad) * 130;
  const y = Math.sin(rad) * 56;
  const subBase = `translate(calc(-50% + ${x.toFixed(1)}px), calc(-50% + ${y.toFixed(1)}px))`;
  return (
    <div
      style={{
        position: 'absolute',
        top: '50%', left: '50%',
        ['--sub-base']: subBase,
        transform: subBase,
        width: 56, height: 56,
        borderRadius: '50%',
        background: `
          radial-gradient(circle at 32% 28%, rgba(255,255,255,0.55), rgba(255,255,255,0.10) 40%, transparent 70%),
          ${palette.subBg}
        `,
        border: `1px solid ${palette.subBorder}`,
        backdropFilter: 'blur(10px) saturate(140%)',
        WebkitBackdropFilter: 'blur(10px) saturate(140%)',
        boxShadow: '0 8px 18px rgba(0,0,0,0.18)',
        color: palette.subText,
        display: 'flex', flexDirection: 'column',
        alignItems: 'center', justifyContent: 'center',
        padding: 4,
        fontFamily: 'var(--font-mono)',
        animation: 'auSubFloat 4s ease-in-out infinite',
        zIndex: 1,
      }}
      title={`${getCategoryDisplayName(sub.category)} · −${sub.pct}% · ${fmt(sub.saving)}`}
    >
      <div style={{ fontSize: 11, fontWeight: 800, lineHeight: 1 }}>−{sub.pct}%</div>
      <div style={{ fontSize: 9, opacity: 0.92, marginTop: 2, lineHeight: 1 }}>{fmt(sub.saving)}</div>
    </div>
  );
}

// ---------- Main saving bubble (tight pill) ----------

function MainBubble({ suggestion, palette, fmt }) {
  return (
    <div
      key={suggestion.id}
      style={{
        ...pillSurface(palette),
        animation: 'auInflatePop 30s ease-in-out forwards',
        zIndex: 2,
      }}
    >
      <span>Reduce</span>
      <span style={{ color: palette.accent, fontWeight: 800 }}>{getCategoryDisplayName(suggestion.category)}</span>
      <span>by</span>
      <span style={{ color: palette.accent, fontWeight: 800 }}>{suggestion.reductionPct}%</span>
      <span style={{ opacity: 0.6 }}>·</span>
      <span style={{ fontFamily: 'var(--font-mono)', fontWeight: 700 }}>{fmt(suggestion.savingAmount)}</span>
    </div>
  );
}

// ---------- Empty state pill ----------

function EmptyPill({ palette, message }) {
  return (
    <div style={{ ...pillSurface(palette), animation: 'auBreath 6s ease-in-out infinite' }}>
      <span style={{ opacity: 0.8 }}>{message}</span>
    </div>
  );
}

// ---------- Overspending pill ----------

function OverspendingPill({ group, palette, fmt }) {
  if (!group) {
    return <EmptyPill palette={palette} message="All clear · no item > R$ 100 in 15d" />;
  }
  const label = group.kind === 'item' ? group.label : getCategoryDisplayName(group.label);
  const showCategory = group.kind === 'item' && group.category && group.category !== group.label;
  return (
    <div style={{ ...pillSurface(palette), animation: 'auBreath 5s ease-in-out infinite' }}>
      <span>Spent</span>
      <span style={{ fontFamily: 'var(--font-mono)', fontWeight: 700 }}>{fmt(group.total)}</span>
      <span>on</span>
      <span style={{ fontWeight: 700 }}>{label}</span>
      <span style={{ opacity: 0.6 }}>·</span>
      <span style={{ opacity: 0.7 }}>15d</span>
      {showCategory && (
        <span style={{ color: '#9A9A9A', fontSize: 10, marginLeft: 4, letterSpacing: '0.06em' }}>
          ({getCategoryDisplayName(group.category)})
        </span>
      )}
    </div>
  );
}

// ---------- Eyebrow label (sits above each bubble slot) ----------

function SlotEyebrow({ children, palette }) {
  return (
    <div style={{
      fontFamily: 'var(--font-mono)', fontSize: 10,
      letterSpacing: '0.32em', textTransform: 'uppercase',
      color: palette.textDim,
      textAlign: 'center',
      marginBottom: 8,
    }}>
      {children}
    </div>
  );
}

// ---------- Row wrapper ----------

export default function InsightBubblesRow() {
  const { transactions, themeTokens, fmt } = useAppContext();

  useEffect(() => { ensureKeyframes(); }, []);

  const top5      = useMemo(() => topCategoriesThisMonth(transactions), [transactions]);
  const candidates = useMemo(() => buildSavingCandidates(top5), [top5]);
  const overspend  = useMemo(() => topOverspendingGroup(transactions), [transactions]);
  const suggestion = useDynamicSuggestion(candidates);
  const palette    = useMemo(() => getPalette(themeTokens), [themeTokens]);

  const slotStyle = {
    position: 'relative',
    minHeight: 170,
    overflow: 'visible',
  };

  return (
    <div style={{
      display: 'grid',
      gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))',
      gap: 24,
      overflow: 'visible',
    }}>
      <div>
        <SlotEyebrow palette={palette}>Saving Suggestion</SlotEyebrow>
        <div style={slotStyle}>
          {suggestion ? (
            <>
              {suggestion.subs.slice(0, 3).map((s, i) => (
                <SubBubble
                  key={`${suggestion.id}-${s.category}`}
                  sub={s}
                  angle={(i * 120) - 90}
                  palette={palette}
                  fmt={fmt}
                />
              ))}
              <MainBubble suggestion={suggestion} palette={palette} fmt={fmt} />
            </>
          ) : (
            <EmptyPill palette={palette} message="Add expenses to see saving ideas" />
          )}
        </div>
      </div>

      <div>
        <SlotEyebrow palette={palette}>Overspending Watch · 15 days</SlotEyebrow>
        <div style={slotStyle}>
          <OverspendingPill group={overspend} palette={palette} fmt={fmt} />
        </div>
      </div>
    </div>
  );
}
