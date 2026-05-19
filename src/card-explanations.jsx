import React, { useMemo, useState } from 'react';
import { useAppContext } from './context.jsx';

const cleanTitle = (title) =>
  String(title || 'Card')
    .replace(/\s+/g, ' ')
    .trim();

const baseTitle = (title) => cleanTitle(title).split(/\u00b7/)[0].trim();

const EXPLANATIONS = {
  'Spending by Category': {
    overview: 'Shows how expenses are split across categories for the active date range.',
    logic: 'Expense transactions are grouped by normalized category. Each slice uses the shared category color map, including Dashboard color overrides.',
    filters: 'Date range controls decide which transactions are included. Income is ignored. Future-dated expenses count when they fall inside the shown range.',
    example: 'If Restaurants is 25%, one quarter of spending in this chart belongs to Restaurants.',
  },
  Distribution: {
    overview: 'Shows the category mix for average spending in the Dashboard side panel.',
    logic: 'The chart uses the same shared category color source as Spending by Category. Category totals are converted into monthly averages for the selected period.',
    filters: 'The main month/year selector affects the visible average period. The locked reference values below it ignore comparison filters.',
    example: 'A larger slice means that category contributes more to average monthly spending.',
  },
  'Average by Category': {
    overview: 'Shows average spending per category and a locked full-history reference.',
    logic: 'Current averages use the selected period. Locked daily and monthly averages start at the first transaction in the system and end at the selected date.',
    filters: 'Comparison controls only affect comparison panes. Locked reference numbers are not changed by temporary comparison filters.',
    example: 'Use the period average for recent behavior and the locked average for long-term baseline behavior.',
  },
  Calculator: {
    overview: 'Provides quick math, scientific functions, and spending projections in the Dashboard.',
    logic: 'Projection mode starts from historical category averages and adds future scheduled, planned, and recurring category spending.',
    filters: 'Projection history period controls the historical average. Projection horizon controls how far future spending is included.',
    example: 'Reducing a category by 10% for 12 months compares current expected spending with the reduced projection.',
  },
  'Income vs Costs': {
    overview: 'Compares income against fixed and variable costs across recent months.',
    logic: 'Income transactions are summed separately from expense transactions. Locked expenses are treated as fixed costs.',
    filters: 'The Dashboard time range controls how many months are shown.',
    example: 'Bars show costs. The line shows income or cash-flow movement depending on the chart.',
  },
  'This Month': {
    overview: 'Summarizes current-month financial activity at a glance.',
    logic: "Uses this month's stored transactions, savings movement, locked payments, and category totals.",
    filters: 'Uses the current calendar month. Future-dated rows in this month are included where the card logic includes the full month.',
    example: 'Top Spend names the category with the largest expense total this month.',
  },
  Budgets: {
    overview: 'Tracks monthly category budget usage.',
    logic: "Each budget compares the current month's spending in that category against its saved monthly limit.",
    filters: 'Budget usage is based on the current calendar month and selected category.',
    example: '80% means the category has used most of its monthly limit.',
  },
  'Bill Reminders': {
    overview: 'Lists upcoming payments that need attention.',
    logic: 'Combines unpaid financing installments, recurring templates, and manual reminders.',
    filters: 'Uses the next 30 days from today.',
    example: 'A recurring subscription due next week appears beside manual reminders.',
  },
  'Recent Activity': {
    overview: 'Shows the latest non-financing transactions.',
    logic: 'Transactions are sorted newest first and limited to the most recent rows.',
    filters: 'This Dashboard list is not controlled by the ledger date filter.',
    example: 'Use View all to inspect the full transaction list.',
  },
};

const fallbackExplanation = (title) => ({
  overview: `${baseTitle(title)} summarizes one financial area from the stored app data.`,
  logic: 'The card reads the relevant transactions, goals, budgets, or schedules and formats the result for quick scanning.',
  filters: 'Date filters, selected categories, and future-dated rows affect this card only when its surrounding page or controls use them.',
  example: 'Read the headline first, then use the smaller labels and percentages to understand what changed or what contributes most.',
});

const TABS = [
  ['overview', 'Overview'],
  ['logic', 'Logic'],
  ['filters', 'Filters'],
  ['example', 'Example'],
];

const BookInfoIcon = () => (
  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor"
    strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
    <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" />
    <path d="M4 4.5A2.5 2.5 0 0 1 6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15Z" />
    <path d="M9 8h6" />
    <path d="M9 12h3" />
  </svg>
);

export const CardExplanationButton = ({ title, explanationKey }) => {
  const { themeTokens } = useAppContext();
  const [open, setOpen] = useState(false);
  const [tab, setTab] = useState('overview');
  const label = cleanTitle(explanationKey || title);
  const explanation = useMemo(
    () => EXPLANATIONS[baseTitle(label)] || fallbackExplanation(label),
    [label]
  );

  return (
    <>
      <button
        type="button"
        aria-label={`Explain ${label}`}
        title={`Explain ${label}`}
        onClick={(event) => {
          event.stopPropagation();
          setOpen(true);
        }}
        style={{
          width: 22,
          height: 22,
          borderRadius: 999,
          border: `1px solid ${themeTokens.hairline2}`,
          background: `${themeTokens.surface2}AA`,
          color: themeTokens.textDim,
          cursor: 'pointer',
          display: 'inline-grid',
          placeItems: 'center',
          flex: '0 0 auto',
          padding: 0,
        }}
      >
        <BookInfoIcon />
      </button>

      {open && (
        <div
          role="presentation"
          onClick={() => setOpen(false)}
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 10000,
            background: 'rgba(0,0,0,0.52)',
            display: 'grid',
            placeItems: 'center',
            padding: 20,
          }}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-label={`${label} explanation`}
            onClick={(event) => event.stopPropagation()}
            style={{
              width: 'min(520px, 100%)',
              border: `1px solid ${themeTokens.hairline2}`,
              borderRadius: 16,
              background: themeTokens.surface,
              boxShadow: '0 28px 80px rgba(0,0,0,0.45)',
              padding: 18,
              display: 'grid',
              gap: 14,
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <div style={{
                width: 34,
                height: 34,
                borderRadius: 10,
                background: `${themeTokens.accent}22`,
                color: themeTokens.accent,
                display: 'grid',
                placeItems: 'center',
              }}>
                <BookInfoIcon />
              </div>
              <div style={{ minWidth: 0 }}>
                <div style={{
                  color: themeTokens.text,
                  fontFamily: 'var(--font-display)',
                  fontSize: 22,
                  fontWeight: 700,
                  lineHeight: 1.1,
                }}>
                  {label}
                </div>
                <div style={{
                  color: themeTokens.textDim,
                  fontFamily: 'var(--font-mono)',
                  fontSize: 10,
                  letterSpacing: '0.16em',
                  marginTop: 4,
                  textTransform: 'uppercase',
                }}>
                  Card guide
                </div>
              </div>
              <button
                type="button"
                onClick={() => setOpen(false)}
                aria-label="Close explanation"
                style={{
                  marginLeft: 'auto',
                  border: 'none',
                  background: 'transparent',
                  color: themeTokens.textDim,
                  cursor: 'pointer',
                  fontFamily: 'var(--font-mono)',
                  fontSize: 18,
                  lineHeight: 1,
                }}
              >
                x
              </button>
            </div>

            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
              {TABS.map(([id, text]) => {
                const active = tab === id;
                return (
                  <button
                    key={id}
                    type="button"
                    onClick={() => setTab(id)}
                    style={{
                      border: `1px solid ${active ? themeTokens.accent : themeTokens.hairline2}`,
                      background: active ? themeTokens.accent : 'transparent',
                      color: active ? '#0B0B0D' : themeTokens.textDim,
                      borderRadius: 999,
                      cursor: 'pointer',
                      fontFamily: 'var(--font-mono)',
                      fontSize: 10,
                      letterSpacing: '0.12em',
                      padding: '6px 10px',
                      textTransform: 'uppercase',
                    }}
                  >
                    {text}
                  </button>
                );
              })}
            </div>

            <div style={{
              border: `1px solid ${themeTokens.hairline}`,
              borderRadius: 12,
              background: `${themeTokens.surface2}66`,
              color: themeTokens.text,
              fontSize: 14,
              lineHeight: 1.55,
              padding: 14,
            }}>
              {explanation[tab]}
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export const InlineCardTitle = ({ children, explanationKey, style }) => {
  const { themeTokens } = useAppContext();
  const title = cleanTitle(children);
  return (
    <div style={{
      display: 'inline-flex',
      alignItems: 'center',
      gap: 8,
      minWidth: 0,
      color: themeTokens.textDim,
      ...style,
    }}>
      <span style={{ minWidth: 0 }}>{children}</span>
      <CardExplanationButton title={title} explanationKey={explanationKey} />
    </div>
  );
};
