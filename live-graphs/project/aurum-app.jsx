/* global React, ReactDOM, FramerMotion */
const { useState, useEffect, useMemo } = React;
const { motion, AnimatePresence } = window.FramerMotion;

// =====================================================================
// AURUM APP — root, header (with mini-token + balance), nav, view router,
// loader → header transition, Tweaks panel
// =====================================================================

const TWEAK_DEFAULTS = /*EDITMODE-BEGIN*/{
  "theme": "onyx",
  "accent": "rose",
  "fontPair": "sf",
  "density": "comfortable",
  "currency": "BRL",
  "language": "en",
  "showLoader": true
} /*EDITMODE-END*/;

const NAV = [
{ id: 'dashboard', label: 'Dashboard' },
{ id: 'graph', label: 'Graphs' },
{ id: 'goals', label: 'Savings' },
{ id: 'cards', label: 'Cards' },
{ id: 'networth', label: 'Net Worth' },
{ id: 'costs', label: 'Costs' },
{ id: 'motorcycle', label: 'Triumph' },
{ id: 'transactions', label: 'Ledger' }];


// Mini-token in header — uses same Three.js token but in `header` mode
const HeaderToken = ({ accentHex }) =>
<div style={{ position: 'relative', width: 56, height: 56, flexShrink: 0 }}>
    <AurumToken3D mode="header" accentHex={accentHex} />
  </div>;


const App = () => {
  const [tweaks, setTweak] = useTweaks(TWEAK_DEFAULTS);

  // Sync tweaks → app state
  const state = useAppState();
  useEffect(() => {state.setTheme(tweaks.theme);}, [tweaks.theme]);
  useEffect(() => {state.setAccent(tweaks.accent);}, [tweaks.accent]);
  useEffect(() => {state.setFontPair(tweaks.fontPair);}, [tweaks.fontPair]);
  useEffect(() => {state.setDensity(tweaks.density);}, [tweaks.density]);
  useEffect(() => {state.setCurrency(tweaks.currency);}, [tweaks.currency]);
  useEffect(() => {state.setLang(tweaks.language);}, [tweaks.language]);

  // Loader state — shown for ~3s on first mount (or on replay)
  const [loaderShown, setLoaderShown] = useState(tweaks.showLoader);
  const [loaderDone, setLoaderDone] = useState(!tweaks.showLoader);

  const tk = state.themeTokens;
  const fonts = state.fonts;

  // Inject Google Fonts + global font stack
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

  // Global override: kill all italics + expose CSS vars per spec
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
      em, i { font-style: normal !important; font-weight: 500; }
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

  // Compute current bank balance (income - bank/cash/PIX expenses, all-time)
  const balance = useMemo(() => state.computeBankBalance(), [state.transactions]);

  const renderView = () => {
    switch (state.view) {
      case 'dashboard':return <Dashboard />;
      case 'graph':return <GraphPage />;
      case 'goals':return <GoalsPage />;
      case 'cards':return <CardsPage />;
      case 'networth':return <NetWorthPage />;
      case 'costs':return <CostsPage />;
      case 'motorcycle':return <MotorcyclePage />;
      case 'transactions':return <TransactionsPage />;
      case 'timeline':return <TimelinePage />;
      case 'debts':return <DebtsPage />;
      default:return <Dashboard />;
    }
  };

  return (
    <AppContext.Provider value={state}>
      <div style={{
        minHeight: '100vh',
        background: `radial-gradient(ellipse at 70% -10%, ${tk.accent}10 0%, transparent 50%), ${tk.canvas}`,
        color: tk.text,
        fontFamily: fonts.body,
        paddingBottom: 80
      }}>

        {/* Loader overlay */}
        <AnimatePresence>
          {loaderShown &&
          <AurumLoader
            accentHex={tk.accent}
            accentShimmer={tk.accentShimmer}
            onComplete={() => {setLoaderShown(false);setTimeout(() => setLoaderDone(true), 100);}} />

          }
        </AnimatePresence>

        {/* Header — appears after loader */}
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
          <div style={{ maxWidth: 1400, margin: '0 auto', padding: '14px 28px',
            display: 'flex', alignItems: 'center', gap: 24 }}>
            {/* Mini token */}
            <HeaderToken accentHex={tk.accent} />

            {/* Brand + balance */}
            <div style={{ display: 'flex', alignItems: 'baseline', gap: 14 }}>
              <div style={{
                fontFamily: fonts.display, fontStyle: 'italic', fontSize: 28,
                color: tk.text, letterSpacing: '0.02em'
              }}>Wallet</div>
              <div style={{
                fontFamily: 'var(--font-mono)', fontSize: 18,
                color: balance >= 0 ? tk.positive : tk.negative,
                letterSpacing: '0.02em'
              }}>
                {balance >= 0 ? '+' : '−'}{state.fmt(Math.abs(balance))}
              </div>
            </div>

            {/* Spacer */}
            <div style={{ flex: 1 }} />

            {/* Tabs */}
            <nav style={{ display: 'flex', gap: 4, alignItems: 'center' }}>
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
                    fontSize: 10, fontWeight: 500,
                    letterSpacing: '0.18em', textTransform: 'uppercase',
                    cursor: 'pointer', transition: 'all 200ms'
                  }}>
                    {n.label}
                  </button>);

              })}
            </nav>
          </div>
        </motion.header>

        {/* Main */}
        <main style={{ maxWidth: 1400, margin: '0 auto', padding: '32px 28px' }}>
          <AnimatePresence mode="wait">
            <motion.div key={state.view}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: loaderDone ? 1 : 0, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}>
              {renderView()}
            </motion.div>
          </AnimatePresence>
        </main>

        {/* Tweaks panel */}
        <TweaksPanel title="Tweaks">
          <TweakSection label="Theme" />
          <TweakRadio label="Mode" value={tweaks.theme} options={[{ value: 'onyx', label: 'Onyx' }, { value: 'ivory', label: 'Ivory' }]} onChange={(v) => setTweak('theme', v)} />
          <TweakSelect label="Accent" value={tweaks.accent} options={Object.entries(ACCENT_PRESETS).map(([k, v]) => ({ value: k, label: v.name }))} onChange={(v) => setTweak('accent', v)} />
          <TweakSelect label="Font set" value={tweaks.fontPair} options={Object.entries(FONT_PAIRS).map(([k, v]) => ({ value: k, label: v.name }))} onChange={(v) => setTweak('fontPair', v)} />
          <TweakSection label="Display" />
          <TweakRadio label="Density" value={tweaks.density} options={['comfortable', 'compact']} onChange={(v) => setTweak('density', v)} />
          <TweakSelect label="Currency" value={tweaks.currency} options={[{ value: 'BRL', label: 'R$' }, { value: 'USD', label: 'US$' }, { value: 'compact', label: 'Compact' }]} onChange={(v) => setTweak('currency', v)} />
          <TweakRadio label="Language" value={tweaks.language} options={[{ value: 'en', label: 'EN' }, { value: 'pt', label: 'EN' }]} onChange={(v) => setTweak('language', v)} />
          <TweakSection label="Loader" />
          <TweakButton label="Replay loader" onClick={() => {setLoaderDone(false);setLoaderShown(true);}} />
        </TweaksPanel>
      </div>
    </AppContext.Provider>);

};

// Mount
const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(<App />);
