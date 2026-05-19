---
description: Add a finance-aware calculator widget to the Aurum Dashboard.
---

# Add Dashboard Calculator

Add a compact calculator widget to the Aurum / MyExpenses Dashboard so the user can run quick math without leaving the page.

## What to build

A `<CalculatorPanel />` component:

- **Display** — single right-aligned input that doubles as the read-out and as a free-typing field. Accepts digits, `.`, `,`, `+`, `-`, `*`, `/`, `(`, `)`, and `%`. `Enter` evaluates, `Esc` clears.
- **Keypad** — 4-column grid: `C  ⌫  %  ÷`, `7 8 9 ×`, `4 5 6 −`, `1 2 3 +`, `± 0 . =`.
- **History strip** — last 3 evaluations shown beneath, monospace, dim. Click an entry to reload it into the display.
- **Quick-paste tiles** — pre-filled buttons that load common Aurum values into the display:
  - `Bank balance` (uses `state.computeAvailableCash({ from, to })` for the current month range)
  - `Savings total` (uses `state.savingsTotal`)
  - `Next financing installment` (uses `MOTO_AMOUNT`)
  - `Total managed debt` (uses `debtTotals(state.debtsState).remaining`)

## Placement

Insert `<CalculatorPanel />` on the **Dashboard**, immediately above the **Savings · Balance** panel (which already sits above Recent Activity). Reuse the existing `<Surface>` + `<Eyebrow>` chrome for visual consistency.

## Implementation rules

- **No new dependencies.** Evaluate the expression with a tiny sanitizer that allows only `0-9 . , + - * / ( ) %` then `new Function('return (' + sanitized.replace(/,/g, '.') + ')')()`. Reject anything else and surface "Invalid" in the display.
- **Currency-aware display.** When the result is finite, format it through the context's `fmt(...)` helper after the user presses `=` (raw expression stays editable above the formatted result).
- **Locale.** Treat both `.` and `,` as decimal separators when parsing.
- **Persistence.** Calculator state is ephemeral — no `localStorage` key, no context plumbing. Local `useState` only.
- **Keyboard.** Mount a `keydown` listener on the input field, not on `window`, so it does not steal focus from other surfaces.
- **Theme.** Use existing tokens: `themeTokens.accent` for `=`, `themeTokens.surface2` for digit keys, `themeTokens.hairline2` for borders. Match the radius and density of the existing `BudgetsPanel` editor for the keypad cells.
- **Density.** The panel must collapse cleanly on narrow widths — use `gridTemplateColumns: 'repeat(4, 1fr)'` with `minmax(0, 1fr)` so the keypad does not break the Dashboard grid.

## Files to touch

- `src/pages.jsx` — add the `CalculatorPanel` component near the other Dashboard sub-components (`BudgetsPanel`, `BillRemindersPanel`, `SavingsPanel`) and render it inside `Dashboard()` above `<SavingsPanel />`.

No new files. No edits to `App.jsx`, `context.jsx`, `charts.jsx`, or `tokens.jsx`.

## Verification

1. Open Dashboard → calculator panel renders between MonthlyInsights/Budgets and Savings.
2. Type `1500 + 220 * 3` → Enter → display shows `2160` and `R$ 2.160,00`.
3. Click `Bank balance` → display loads the formatted current-month available cash; pressing `=` re-evaluates with that number as the operand of subsequent math.
4. Click history entry → expression restored, `=` re-evaluates.
5. Invalid input (`12 ++ 3`) shows `Invalid`, does not crash, and `C` clears it.
6. Resize the browser to ~360 px wide — keypad stays in 4 columns, no horizontal scroll on the Dashboard.

## Out of scope

- No graphing / scientific functions (sin, sqrt, etc.).
- No saving named formulas or templates.
- No recording results as transactions.
- Do not modify any other Dashboard panel.
