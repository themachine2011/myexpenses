import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { AppContext, useAppState, currentMonthRange } from './context.jsx';
import { ACCENT_PRESETS, FONT_PAIRS } from './tokens.jsx';
import { formatAge } from './2026-05-18-fx-rate-service.js';
import { AurumLoader, AurumToken3D } from './loader.jsx';
import {
  Dashboard, GraphPage, CardsPage, NetWorthPage,
  MotorcyclePage, TransactionsPage, LedgerPage, TimelinePage, DebtsPage,
  AllTransactionsPage, SubscriptionsPage, CardPurchasesPage,
  ParticleField, GlobalCalendar, HistorySidebar, GlobalSearch,
} from './pages.jsx';
import { DashboardCategoriesAverageSpendingFeature } from './2026-05-19-feature-categories-average-spending.jsx';
import {
  useTweaks, TweaksPanel, TweakSection, TweakRadio, TweakSelect, TweakButton, TweakSlider,
} from './tweaks-panel.jsx';
import { StorageErrorToast } from './2026-05-16-utils-storage-write-guard.jsx';
import {
  useAutoBackup, buildBackupPayload, downloadBackup, setBackupSettings, getBackupSettings,
} from './2026-05-16-backup-scheduled-json-export.jsx';
import { GlassTheme } from './2026-05-20-component-glass-theme.jsx';

const TWEAK_DEFAULTS = {
  theme: 'onyx',
  accent: 'rose',
  fontPair: 'schibsted',
  density: 'comfortable',
  currency: 'BRL',
  language: 'en',
  defaultSplitMode: 'off',
  backupIntervalDays: getBackupSettings().intervalDays,
};

const NAV = [
  { id: 'dashboard', label: 'Dashboard' },
  { id: 'graph', label: 'Graphs' },
  { id: 'cards', label: 'Cards' },
  { id: 'networth', label: 'Net Worth' },
  { id: 'motorcycle', label: 'Triumph' },
  { id: 'ledger', label: 'Ledger' },
  { id: 'transactions', label: 'Transactions' },
];

const HeaderToken = ({ accentHex }) => (
  <div style={{ position: 'relative', width: 56, height: 56, flexShrink: 0 }}>
    <AurumToken3D mode="header" accentHex={accentHex} />
  </div>
);

const App = () => {
  const [tweaks, setTweak] = useTweaks(TWEAK_DEFAULTS);

  const state = useAppState();
  useEffect(() => { state.setTheme(tweaks.theme); }, [tweaks.theme]);
  useEffect(() => { state.setAccent(tweaks.accent); }, [tweaks.accent]);
  useEffect(() => { state.setFontPair(tweaks.fontPair); }, [tweaks.fontPair]);
  useEffect(() => { state.setDensity(tweaks.density); }, [tweaks.density]);
  useEffect(() => { state.setCurrency(tweaks.currency); }, [tweaks.currency]);
  useEffect(() => { state.setLang(tweaks.language); }, [tweaks.language]);
  useEffect(() => { state.setDefaultSplitMode?.(tweaks.defaultSplitMode === 'on'); }, [tweaks.defaultSplitMode]);

  // One-shot bootstrap: when this tab is opened with `?card=...&view=cardPurchases`
  // (e.g. by clicking "Recent on this card"), set the focused card and view.
  useEffect(() => {
    try {
      const params = new URLSearchParams(window.location.search);
      const wantView = params.get('view');
      const wantCard = params.get('card');
      if (wantCard) state.setFocusedCardMethod?.(wantCard);
      if (wantView) state.setView(wantView);
    } catch (_) {}
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  useEffect(() => { setBackupSettings({ intervalDays: tweaks.backupIntervalDays }); }, [tweaks.backupIntervalDays]);
  useAutoBackup(state);

  // Stable callback for GlassTheme. Its effect has `setTheme` in its deps, so
  // passing a fresh arrow function every render would re-fire the effect and
  // call `setTweak('theme', next)` again. `setTweak`'s reducer always returns
  // a new object reference even when the value is unchanged, which would loop
  // until React's update-depth guard tripped (`Maximum update depth exceeded`).
  const handleSetGlassTheme = useCallback((v) => setTweak('theme', v), [setTweak]);

  const [loaderShown, setLoaderShown] = useState(false);
  const [loaderDone, setLoaderDone]   = useState(true);

  const tk = state.themeTokens;
  const fonts = state.fonts;

  useEffect(() => {
    const link = document.createElement('link');
    link.rel = 'stylesheet';
    link.href = fonts.googleHref;
    document.head.appendChild(link);
    document.body.style.fontFamily = fonts.body;
    document.body.style.background = tk.canvas;
    document.body.style.color = tk.text;
    document.body.style.transition = 'background 480ms ease, color 480ms ease';
    return () => document.head.removeChild(link);
  }, [fonts.googleHref, fonts.body, tk.canvas, tk.text]);

  useEffect(() => {
    const id = '__aurum_global_overrides';
    let style = document.getElementById(id);
    if (!style) {
      style = document.createElement('style');
      style.id = id;
      document.head.appendChild(style);
    }
    style.textContent = `
      :root {
        --color-bg-main:    ${tk.canvas};
        --color-bg-card:    ${tk.surface};
        --color-bg-surface: ${tk.bgSurface || '#FFFFFF'};
        --color-border:     ${tk.hairline};
        --color-text-primary:   ${tk.text};
        --color-text-secondary: ${tk.textDim};
        --color-text-axis:      ${tk.textFaint};
        --font-display: ${fonts.display};
        --font-body:    ${fonts.body};
        --font-mono:    ${fonts.mono};
        --card-hover-bg: rgba(125, 170, 225, 0.12);
        --card-hover-border: #7DAAE1;
        --card-hover-shadow: 0 14px 30px rgba(125, 170, 225, 0.16);
        --black-card-flash-bg: rgba(125, 170, 225, 0.46);
        --black-card-flash-shadow: 0 0 0 3px rgba(125, 170, 225, 0.26), 0 16px 36px rgba(125, 170, 225, 0.2);
      }
      body, body * { font-style: normal !important; }
      em, i { font-style: normal !important; font-weight: 400; }
      @keyframes aurumDiamondBlueFlash {
        0%, 100% {
          background: var(--black-card-base-bg, #0B0B0D);
          border-color: var(--black-card-rest-border, rgba(255,255,255,0.16));
          box-shadow: var(--black-card-rest-shadow, none);
        }
        34% {
          background: var(--black-card-flash-bg);
          border-color: var(--card-hover-border);
          box-shadow: var(--black-card-flash-shadow);
        }
      }
      .aurum-card-hover {
        transition:
          background 180ms ease,
          border-color 180ms ease,
          box-shadow 180ms ease,
          transform 180ms ease;
      }
      .aurum-card-hover:hover {
        background: var(--card-hover-bg) !important;
        border-color: var(--card-hover-border) !important;
        box-shadow: var(--card-hover-shadow) !important;
      }
      .aurum-card-flash-hover {
        transition:
          border-color 180ms ease,
          box-shadow 180ms ease,
          transform 180ms ease;
      }
      .aurum-card-flash-hover:hover {
        animation: aurumDiamondBlueFlash 520ms cubic-bezier(0.22, 1, 0.36, 1) 1;
      }
    `;
  }, [tk, fonts]);

  const balance = useMemo(() => {
    const { from, to } = currentMonthRange();
    return state.computeAvailableCash({ from, to });
  }, [state.transactions]);

  const renderView = () => {
    switch (state.view) {
      case 'dashboard':   return <Dashboard />;
      case 'graph':       return <GraphPage />;
      case 'cards':       return <CardsPage />;
      case 'networth':    return <NetWorthPage />;
      case 'motorcycle':  return <MotorcyclePage />;
      case 'ledger':      return <LedgerPage />;
      case 'transactions':return <TransactionsPage />;
      case 'timeline':    return <TimelinePage />;
      case 'debts':       return <DebtsPage />;
      case 'allTransactions': return <AllTransactionsPage />;
      case 'subscriptions':   return <SubscriptionsPage />;
      case 'cardPurchases':   return <CardPurchasesPage />;
      default:            return <Dashboard />;
    }
  };

  return (
    <AppContext.Provider value={state}>
      <div style={{
        minHeight: '100vh',
        background: `radial-gradient(ellipse at 70% -10%, ${tk.accent}10 0%, transparent 50%), ${tk.canvas}`,
        color: tk.text,
        fontFamily: fonts.body,
        paddingBottom: 80,
        position: 'relative',
      }}>

        <GlassTheme tk={tk} setTheme={handleSetGlassTheme} />

        <ParticleField />

        <AnimatePresence>
          {loaderShown &&
            <AurumLoader
              accentHex={tk.accent}
              accentShimmer={tk.accentShimmer}
              onComplete={() => { setLoaderShown(false); setTimeout(() => setLoaderDone(true), 100); }} />
          }
        </AnimatePresence>

        <motion.header
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: loaderDone ? 1 : 0, y: loaderDone ? 0 : -20 }}
          transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
          style={{
            position: 'sticky', top: 0, zIndex: 50,
            background: tk.surface,
            backdropFilter: 'blur(28px) saturate(160%)',
            WebkitBackdropFilter: 'blur(28px) saturate(160%)',
            borderBottom: `1px solid ${tk.hairline}`
          }}>
          <div style={{ maxWidth: 1640, margin: '0 auto', padding: '14px 28px',
            display: 'flex', alignItems: 'center', gap: 24, flexWrap: 'wrap' }}>
            <HeaderToken accentHex={tk.accent} />

            <div style={{ display: 'flex', alignItems: 'baseline', gap: 14 }}>
              <div style={{
                fontFamily: fonts.display, fontWeight: 700, fontSize: 28,
                color: tk.text, letterSpacing: '-0.01em'
              }}>Wallet</div>
              {(() => {
                // Wallet click-flip BRL ↔ USD (CLAUDE.md rule #26).
                const cur = state.currency;
                const fxOk = state.fxStatus === 'ok' || (state.fxRate && state.fxStatus !== 'idle');
                const fxDisabled = !state.fxRate;
                const inCompact = cur === 'compact';
                const tooltip = inCompact
                  ? 'Compact mode is active — switch Currency in Tweaks to use BRL ↔ USD'
                  : fxDisabled
                    ? 'FX rate unavailable — BRL only. Will retry automatically.'
                    : `Live rate (AwesomeAPI · min bid/low): 1 USD = R$ ${state.fxRate.toFixed(4)} · refreshed ${formatAge(state.fxFetchedAt)}${state.fxStatus === 'error' ? ' · using cached' : ''}`;
                const onFlipBank = () => {
                  if (inCompact || fxDisabled) return;
                  state.flipDisplayCurrency();
                };
                return (
                  <>
                    <button
                      type="button"
                      onClick={onFlipBank}
                      title={tooltip}
                      disabled={inCompact || fxDisabled}
                      style={{
                        background: 'transparent', border: 'none', padding: 0,
                        fontFamily: 'var(--font-mono)', fontSize: 18,
                        color: balance >= 0 ? tk.positive : tk.negative,
                        letterSpacing: '0.02em',
                        cursor: (inCompact || fxDisabled) ? 'not-allowed' : 'pointer',
                        opacity: (inCompact || fxDisabled) ? 0.75 : 1,
                      }}>
                      {balance >= 0 ? '+' : '−'}{state.fmt(Math.abs(balance))}
                    </button>
                    <div title={tooltip} style={{
                      display: 'inline-flex', alignItems: 'stretch',
                      borderRadius: 999, overflow: 'hidden',
                      border: `1px solid ${tk.hairline2}`,
                      opacity: inCompact ? 0.4 : 1,
                    }}>
                      {[
                        { id: 'BRL', label: 'R$' },
                        { id: 'USD', label: '$' },
                      ].map((opt) => {
                        const active = cur === opt.id;
                        const disabled = inCompact || (opt.id === 'USD' && fxDisabled);
                        const onClick = () => {
                          if (disabled) return;
                          if (active) return;
                          state.flipDisplayCurrency();
                        };
                        return (
                          <button key={opt.id}
                            type="button"
                            onClick={onClick}
                            disabled={disabled}
                            title={tooltip}
                            style={{
                              padding: '3px 8px',
                              border: 'none',
                              background: active ? tk.accent : 'transparent',
                              color: active ? (tk.isDark ? '#0B0B0D' : '#FFFFFF') : tk.textDim,
                              fontFamily: 'var(--font-mono)', fontSize: 10,
                              letterSpacing: '0.18em', textTransform: 'uppercase',
                              cursor: disabled ? 'not-allowed' : (active ? 'default' : 'pointer'),
                              transition: 'background 180ms, color 180ms',
                            }}>{opt.label}</button>
                        );
                      })}
                    </div>
                  </>
                );
              })()}
            </div>

            <GlobalSearch />

            <nav style={{ display: 'flex', gap: 4, alignItems: 'center', flexWrap: 'wrap', justifyContent: 'flex-end' }}>
              {NAV.map((n) => {
                const active = state.view === n.id;
                return (
                  <button key={n.id} onClick={() => state.setView(n.id)}
                    style={{
                      background: active ? tk.text : 'transparent',
                      color: active ? tk.canvas : tk.textDim,
                      border: 'none',
                      padding: '8px 14px', borderRadius: 999,
                      fontFamily: 'var(--font-mono)',
                      fontSize: 10, fontWeight: 400,
                      letterSpacing: '0.18em', textTransform: 'uppercase',
                      cursor: 'pointer', transition: 'all 200ms'
                    }}>
                    {n.label}
                  </button>
                );
              })}
            </nav>
          </div>
        </motion.header>

        <main style={{
          maxWidth: 1640, margin: '0 auto', padding: '32px 28px',
          position: 'relative', zIndex: 1,
          display: 'grid',
          gridTemplateColumns: state.view === 'ledger'
            ? '300px minmax(0, 1fr) 360px'
            : '300px minmax(0, 1fr)',
          gap: 24,
          alignItems: 'start',
        }}>
          <aside style={{ position: 'sticky', top: 96, display: 'grid', gap: 16 }}>
            {state.view === 'dashboard'
              ? <DashboardCategoriesAverageSpendingFeature />
              : <GlobalCalendar />}
          </aside>

          <div style={{ minWidth: 0 }}>
            <AnimatePresence mode="wait">
              <motion.div key={state.view}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: loaderDone ? 1 : 0, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}>
                {renderView()}
              </motion.div>
            </AnimatePresence>
          </div>

          {state.view === 'ledger' && (
            <aside style={{ position: 'sticky', top: 96 }}>
              <HistorySidebar />
            </aside>
          )}
        </main>

        {/* Fixed bottom-left theme toggle — visible on every tab. Cycles between
            the dark Onyx mode and the warm Cream mode. */}
        <button
          onClick={() => setTweak('theme', tweaks.theme === 'cream' ? 'onyx' : 'cream')}
          aria-label={tweaks.theme === 'cream' ? 'Switch to dark mode' : 'Switch to light mode'}
          title={tweaks.theme === 'cream' ? 'Switch to Onyx (dark)' : 'Switch to Light (white)'}
          style={{
            position: 'fixed', left: 24, bottom: 24, zIndex: 100,
            width: 56, height: 56, borderRadius: '50%',
            border: `1px solid ${tk.hairline2}`,
            background: tk.surface,
            backdropFilter: 'blur(20px) saturate(160%)',
            WebkitBackdropFilter: 'blur(20px) saturate(160%)',
            boxShadow: tk.isDark
              ? '0 12px 28px rgba(0,0,0,0.45), 0 0 0 1px rgba(255,255,255,0.04)'
              : '0 12px 28px rgba(40,30,20,0.18), 0 0 0 1px rgba(40,30,20,0.06)',
            color: tk.text,
            display: 'grid', placeItems: 'center',
            cursor: 'pointer',
            transition: 'transform 200ms ease, background 480ms ease, color 480ms ease',
          }}
          onMouseEnter={(e) => { e.currentTarget.style.transform = 'scale(1.08)'; }}
          onMouseLeave={(e) => { e.currentTarget.style.transform = 'scale(1)'; }}
        >
          {tweaks.theme === 'cream' ? (
            // Moon icon (currently in light → click to go dark)
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor"
              strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
              <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
            </svg>
          ) : (
            // Sun icon (currently in dark → click to go cream)
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor"
              strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
              <circle cx="12" cy="12" r="4.5" />
              <line x1="12" y1="2" x2="12" y2="4.5" />
              <line x1="12" y1="19.5" x2="12" y2="22" />
              <line x1="4.22" y1="4.22" x2="6" y2="6" />
              <line x1="18" y1="18" x2="19.78" y2="19.78" />
              <line x1="2" y1="12" x2="4.5" y2="12" />
              <line x1="19.5" y1="12" x2="22" y2="12" />
              <line x1="4.22" y1="19.78" x2="6" y2="18" />
              <line x1="18" y1="6" x2="19.78" y2="4.22" />
            </svg>
          )}
        </button>

        <TweaksPanel title="Tweaks">
          <TweakSection label="Theme" />
          <TweakRadio label="Mode" value={tweaks.theme} options={[{ value: 'onyx', label: 'Onyx' }, { value: 'ivory', label: 'Ivory' }, { value: 'cream', label: 'Light' }]} onChange={(v) => setTweak('theme', v)} />
          <TweakSelect label="Accent" value={tweaks.accent} options={Object.entries(ACCENT_PRESETS).map(([k, v]) => ({ value: k, label: v.name }))} onChange={(v) => setTweak('accent', v)} />
          <TweakSelect label="Font set" value={tweaks.fontPair} options={Object.entries(FONT_PAIRS).map(([k, v]) => ({ value: k, label: v.name }))} onChange={(v) => setTweak('fontPair', v)} />
          <TweakSection label="Display" />
          <TweakRadio label="Density" value={tweaks.density} options={['comfortable', 'compact']} onChange={(v) => setTweak('density', v)} />
          <TweakSelect label="Currency" value={tweaks.currency} options={[{ value: 'BRL', label: 'R$' }, { value: 'USD', label: 'US$' }, { value: 'compact', label: 'Compact' }]} onChange={(v) => setTweak('currency', v)} />
          <TweakRadio label="Language" value={tweaks.language} options={[{ value: 'en', label: 'EN' }, { value: 'pt', label: 'PT' }]} onChange={(v) => setTweak('language', v)} />
          <TweakSection label="Transactions" />
          <TweakRadio label="Default split mode" value={tweaks.defaultSplitMode} options={[{ value: 'off', label: 'Off' }, { value: 'on', label: 'On' }]} onChange={(v) => setTweak('defaultSplitMode', v)} />
          <TweakSection label="Backups" />
          <TweakSlider label="Auto-backup every" min={1} max={30} step={1} unit="d"
            value={tweaks.backupIntervalDays}
            onChange={(v) => setTweak('backupIntervalDays', v)} />
          <TweakButton label="Backup now" onClick={() => {
            downloadBackup(buildBackupPayload(state), { auto: false });
            setBackupSettings({ lastAutoBackupAt: new Date().toISOString() });
          }} />
          <TweakSection label="Loader" />
          <TweakButton label="Replay loader" onClick={() => { setLoaderDone(false); setLoaderShown(true); }} />
        </TweaksPanel>

        <StorageErrorToast onExportNow={() => downloadBackup(buildBackupPayload(state), { auto: false })} />
      </div>
    </AppContext.Provider>
  );
};

export default App;
