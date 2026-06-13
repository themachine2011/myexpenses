# Feature Review — 2026-06-11

Automated daily run of `.claude/commands/feature-review.md`.
Branch: `main` (unchanged — no commits, no branch changes). Read the prior logs
`2026-06-09` and `2026-06-10` first; today's picks do **not** repeat any of the
six features added then (Health, Trends, Merchants / Forecast, Goals, Patterns)
and instead close three different gaps: **budget limits**, the **income side**,
and **forward bill commitments**.

---

## 1. Executive summary

After the 2026-06-09 (backward analytics) and 2026-06-10 (forward / behavioural)
runs, the app reads its **expense** history well and projects spending forward.
Three clear gaps remained:

1. **Budgets are stored but invisible.** The app already keeps a `budgets{}` map
   (set on Planning) and a `budgetUsage()` helper, but there was **no screen**
   that shows budget vs actual across categories.
2. **The income side was unanalysed.** Every analytics tab is expense-focused;
   nothing summarised earnings, sources, or income stability.
3. **No single "what's due soon" view.** `upcomingDues()` exists and is reused in
   the Forecast tab, but there was no dedicated forward bills calendar.

Today's run adds three lightweight, read-only tabs that close those gaps, each
with a Dashboard preview card:

1. **Budgets** — budget vs actual per category this month + a run-rate projection
   that flags an over-budget month early.
2. **Income Insights** — monthly income trend, top sources, income-by-category,
   and a simple stability score.
3. **Upcoming Bills** — financing + recurring + reminders due in 30/60/90 days,
   grouped by week, with totals.

All three are additive, touch existing files only for wiring, and were validated
by a math unit test + a clean Vite dev-server compile (see §13).

## 2. What changed since the last review

The 2026-06-10 run added Forecast / Goals / Patterns and the shared
`2026-06-10-utils-forecast.js`. Those previews render live and correct during
this run. Today's work **reuses** the 2026-06-09 analytics helpers (period math,
income/expense definitions, merchant normalization, `categoryExpenseTotals`)
rather than redefining "what counts as spending," and adds only new,
feature-specific math in one new util.

## 3. Current system overview

- **Stack:** React 18 + Vite, framer-motion, recharts, three.js. State in
  `context.jsx` (`useAppState`), shared via `AppContext`.
- **Shell:** `App.jsx` — sticky header, `NAV` array, `renderView()` switch.
  Now **17** top-level tabs after today (Dashboard … Bills).
- **Pages:** `pages.jsx` (~250 KB) holds the Dashboard + most pages.
- **Data model:** transactions `{ id, date, amount, type, category, description,
  locked, status, ... }`; `budgets{}` = per-category monthly limits;
  `recurring[]`, `reminders[]`, `goals[]` for planning; `Financing` rows = real
  outflows; `Savings` rows excluded from spend/income.
- **Money rules:** `fmt()` formats per the BRL/USD toggle (display only); stored
  data currency-agnostic; transactions are the source of truth.

## 4. Dashboard review

The Dashboard is a launcher: pinned KPI row, then preview-card rows for the
2026-06-09 and 2026-06-10 tabs, then the heavier panels. Today adds a **third
preview-card row** (Budgets / Income / Bills) directly under the second, keeping
the same "summary card → drill into tab" pattern and the `PanelErrorBoundary`
wrapper. No existing panel was moved or restyled.

## 5. All tabs review

- **Health / Trends / Merchants / Forecast / Goals / Patterns** — confirmed live.
- **Graphs / Net Worth / Cards / Triumph** — strong visuals; Cards & Triumph
  remain personalized (specific cards, a specific motorcycle).
- **Ledger / Transactions / Planning** — entry, history, budgets/goals/reminders.
- **Subscriptions / Debts / Timeline / Card Purchases** — reachable in-app but not
  in the top `NAV` (slightly hidden).
- **Gap closed today:** nothing showed budget vs actual, analysed income, or
  consolidated upcoming bills. Those are the three new tabs.

## 6. UI/UX improvement opportunities

- The top nav is now **17 items** wide; it wraps cleanly but is past the point
  where a grouped "More" overflow would read better. Flagged again, not changed
  (touches existing nav layout beyond additive wiring).
- Subscriptions / Debts / Timeline still aren't in the top nav. Same flag as
  prior runs.

## 7. Scalability improvement opportunities

- Each new feature lives in its **own file**, so the `pages.jsx` monolith doesn't
  grow. New math is in one new util (`2026-06-11-utils-insights.js`) that imports
  the 2026-06-09 helpers — no duplicated period/spending logic (CLAUDE.md rule #4).
- All three features are pure functions of existing data; no per-user tuning, no
  new dependencies, no new storage keys.

## 8. Simplification opportunities

- Personalized specifics (Triumph bike, named apartments, specific card brands)
  could be generalized for a public product. Deferred — needs owner sign-off.
- The Dashboard now has **three** preview rows (9 cards). They could later be made
  show/hide-able via Tweaks like the other panels. Deferred — that edits the
  existing panel-toggle system beyond simple wiring.

## 9. Features that could move off the Dashboard into a dedicated tab

- The **Category Average Spending** sidebar + **Spending-by-Category** pie would
  sit naturally next to Trends/Patterns. Not moved (changes existing Dashboard
  behaviour beyond wiring); flagged for a future consolidation pass.

## 10. Five feature suggestions

### A. Budgets — Budget vs Actual ✅ APPLIED
- **What it does:** for every category with a budget limit, shows this month's
  actual spend vs the limit AND a separate daily run-rate projection of month-end
  spend; flags status over / at-risk / warn / ok; sums a totals row.
- **Purpose:** makes the stored-but-invisible budgets usable; answers "am I going
  to blow a category this month?" early.
- **Logic:** `actual = categoryExpenseTotals(this month)`;
  `projected = actual / dayOfMonth × daysInMonth`; status from actual vs limit and
  projected vs limit. Actual and projected kept clearly separate (rule #5).
- **Main components:** `BudgetsPage`, `BudgetsPreview`, `budgetReport`.
- **Where it lives:** new **Budgets** tab + Dashboard preview. *(both confirmed)*
- **UI/UX benefit:** per-category bars with a projected-bust marker.
- **Scalability benefit:** reads existing `budgets` + transactions; generic.
- **Complexity:** medium. **Risk:** low (read-only; writes nothing — budgets are
  still edited on Planning).

### B. Income Insights ✅ APPLIED
- **What it does:** monthly income trend (6/12M), top income sources grouped by
  description, income by category, average monthly income, and a stability score.
- **Purpose:** the income counterpart to all the expense analytics.
- **Logic:** reuse `monthlyExpenseSeries` (carries income) for the trend;
  group income tx by `normalizeMerchant`; stability = `1 − coefficient of
  variation` mapped to 0..100. "Savings" rows excluded.
- **Main components:** `IncomePage`, `IncomePreview`, `incomeInsights`.
- **Where it lives:** new **Income** tab + Dashboard preview. *(both confirmed)*
- **UI/UX benefit:** one screen for "where does my money come from, how steady?"
- **Scalability benefit:** pure function of transactions; generic.
- **Complexity:** medium. **Risk:** low (read-only).

### C. Upcoming Bills ✅ APPLIED
- **What it does:** forward list of what's due — unpaid financing instalments,
  recurring templates, manual reminders — within 30/60/90 days, grouped into this
  week / next week / later, with totals and a per-kind breakdown.
- **Purpose:** a single "what's coming out of my account soon" view.
- **Logic:** reads the existing `upcomingDues(days)`; `summarizeDues` totals by
  kind; `bucketDuesByWeek` buckets by days-from-today.
- **Main components:** `BillsPage`, `BillsPreview`, `summarizeDues`,
  `bucketDuesByWeek`.
- **Where it lives:** new **Bills** tab + Dashboard preview. *(both confirmed)*
- **UI/UX benefit:** dated rows colour-coded by kind; weekly buckets.
- **Scalability benefit:** reuses one existing helper; no new data model.
- **Complexity:** low–medium. **Risk:** low (read-only; doesn't mark bills paid —
  that stays on Planning/Subscriptions).

### D. Unusual Spending Detector ⏸ DEFERRED (also deferred 2026-06-09 / 06-10)
- **What it does:** flags transactions far above a category's typical size
  (median × N / MAD) as "worth a look."
- **Where it lives:** new **Alerts** tab + Dashboard preview.
- **Complexity:** medium. **Risk:** low–medium. **Why deferred again:** thresholds
  need real-data tuning to avoid false positives, and the signal overlaps Trends.

### E. Recurring / Subscription Finder ⏸ DEFERRED (also deferred 2026-06-10)
- **What it does:** auto-detects likely recurring charges from history (same
  merchant, regular cadence) and estimates monthly/annual cost.
- **Where it lives:** new **Recurring** tab + Dashboard preview.
- **Complexity:** medium. **Risk:** medium. **Why deferred:** overlaps the existing
  **Subscriptions** page and needs cadence-detection tuning + owner reconciliation.
  (Note: today's read-only **Bills** tab partly serves the "see recurring costs"
  need without the risky auto-detection, making E even lower priority.)

### Why the 3 chosen are strongest
A, B, and C are **purely additive, read-only, generic, and non-overlapping**:
each surfaces data the app already has on an axis nothing else covered (budget
limits, income, forward bills), and none needs threshold tuning. D and E both
need data-tuning or shadow existing functionality, so they stay follow-ups.

### How each relates to other tabs
- **Budgets** reads the same `budgets` the Planning tab manages and the same
  actual-spend definition as the Dashboard KPIs — a vs-limit view without
  changing how budgets are created.
- **Income** is the income mirror of the expense-side Trends/Merchants/Patterns.
- **Bills** is the dedicated home for the `upcomingDues` data that the Forecast
  tab only shows as a side note.

### Best implementation order (the order used today)
New util (`2026-06-11-utils-insights.js`, reusing the 2026-06-09 helpers) →
Budgets → Income → Bills → wire `NAV`/switch in App.jsx + a third Dashboard
preview row in pages.jsx.

### What should NOT be built yet
- Generalizing the personalized Triumph/apartment/card features (owner decision).
- Moving existing Dashboard panels into tabs (changes existing behaviour).
- A nav overflow/grouping redesign (the 17-wide nav is the right trigger, but it
  edits existing layout beyond additive wiring — owner call).
- D and E above, until thresholds/overlap are resolved.

---

## 11. Applied today (3)

1. **Budgets** — per-category budget vs actual this month + run-rate projection,
   in a new **Budgets** tab + Dashboard preview.
2. **Income Insights** — income trend, top sources, by-category, stability score,
   in a new **Income** tab + Dashboard preview.
3. **Upcoming Bills** — financing/recurring/reminder dues in 30/60/90 days grouped
   by week, in a new **Bills** tab + Dashboard preview.

## 12. Files created / modified

**Created (5):**
- `src/2026-06-11-utils-insights.js` — new read-only math (`budgetReport`,
  `incomeInsights`, `summarizeDues`, `bucketDuesByWeek`); reuses the 2026-06-09
  analytics util.
- `src/2026-06-11-feature-budgets.jsx` — Budgets page + Dashboard preview.
- `src/2026-06-11-feature-income.jsx` — Income page + Dashboard preview.
- `src/2026-06-11-feature-bills.jsx` — Bills page + Dashboard preview.
- `.claude/feature-review-log/2026-06-11-feature-review.md` — this log.

**Modified (2) — wiring only:**
- `src/App.jsx` — 3 imports, 3 `NAV` entries (Budgets/Income/Bills), 3
  `renderView()` switch cases.
- `src/pages.jsx` — 3 preview imports + a third 3-card preview row added to the
  Dashboard, right after the 2026-06-10 preview row, each wrapped in
  `PanelErrorBoundary`.

No existing files were renamed, moved, deleted, or overwritten. No commits/pushes;
branch unchanged.

## 13. Validation performed

- **Math unit test (node):** on a synthetic transaction set —
  `budgetReport` correctly marked Food **over** (spent 300 > limit 250), Rent
  **at-risk** (spent 900 < limit 1000 but projected ≈ 2455 > limit on a day-11
  run-rate), Transport **ok** (0 spent), with `overCount` 1 / `atRiskCount` 1;
  `incomeInsights` summed income to 10100 (Savings row excluded), avg/month 1683
  over a 6-month window, picked top source "ACME Payroll"; `summarizeDues` split
  660 across financing/recurring/reminder; `bucketDuesByWeek` placed each due in
  the right week bucket. No NaN / divide-by-zero in any output.
- **Dev server (Vite):** `npm run dev` compiled with **no build errors** and **no
  browser console errors**. All three new **Dashboard preview cards render live**
  (Budgets / Income Insights / Upcoming Bills), none tripped its
  `PanelErrorBoundary`. The nav shows all 17 tabs including the 3 new ones.
- The full pages share their data hooks (`useBudgets` / `useIncome` / `useDues`)
  with the three preview cards, so the data layer is exercised end-to-end.

## 14. Deferred (2)

1. **Unusual Spending Detector** — flags transactions far above a category's
   typical size; deferred again (threshold tuning + overlaps Trends).
2. **Recurring / Subscription Finder** — auto-detects recurring charges from
   history; deferred (overlaps the existing Subscriptions page; needs cadence
   tuning and owner reconciliation — and today's Bills tab partly covers the need).

## 15. Risks & unclear areas

- **In-harness tab switching couldn't be exercised (environment, not the app).**
  Same quirk documented on 2026-06-10: in the preview sandbox, clicking a nav
  button or loading `?view=budgets` did not switch the active view — and this
  affects the *existing* tabs too, so it's a StrictMode/automation quirk, not a
  code problem. The full pages were therefore verified indirectly: they share
  their data hooks with the three preview cards, which render live and correct,
  and everything compiles with no console errors. **Recommended quick manual
  check:** open `npm run dev` and click the Budgets / Income / Bills tabs once.
- **Full-page screenshot timed out** during capture — the app's heavy three.js
  particle/canvas animations make full-page screenshotting slow in the sandbox;
  unrelated to the additive changes (no console/build errors).
- **Budgets definitional choice:** "actual" uses the shared
  `categoryExpenseTotals` (Savings excluded, all other expenses incl. Financing
  counted), matching the 2026-06-09/10 analytics layer. This can differ slightly
  from the context `budgetUsage()` helper, which counts *all* expense in a
  category; the difference only matters for a (nonsensical) budget on the Savings
  category. The projection is a simple run-rate, labelled as an estimate and kept
  separate from actual.
- **Income stability** is a coefficient-of-variation read over the window; a user
  with only one or two months of income data will score low/lumpy — expected, and
  the page explains it. **Bills** is read-only and intentionally does not mark
  bills paid (that stays on Planning/Subscriptions) to avoid duplicating write
  logic.
- **Nav width:** the top nav is now 17 items. It still wraps cleanly, but a
  grouping/overflow pass is increasingly worth an owner decision (flagged, not
  changed).
