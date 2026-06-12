# Feature Review — 2026-06-11 (run 2)

Automated run of `.claude/commands/feature-review.md`. This is the SECOND run
of 2026-06-11 — the first run (same date) applied Budgets / Income / Bills.
This log uses a `-run2` suffix because overwriting the existing dated log is
forbidden by the routine's hard limits.

Branch: `main` (unchanged — no commits, no branch changes). Prior logs read
first; today's picks do not repeat any of the nine features applied on
2026-06-09 (Health, Trends, Merchants), 2026-06-10 (Forecast, Goals, Patterns),
or 2026-06-11 run 1 (Budgets, Income, Bills).

---

## 1. Executive summary

After nine analytics tabs, the remaining gaps were:

1. **No long-horizon view.** Every period toggle caps at 6 months / "all";
   nothing summarises a year or compares it with the prior year.
2. **No explicit month-vs-month comparison.** Trends shows rolling direction,
   but nothing answers "what exactly changed between April and May, category by
   category?"
3. **The thrice-deferred anomaly detector.** Deferred on 06-09/06-10/06-11
   because thresholds "needed tuning" — solved this run by making sensitivity a
   user-facing toggle instead of a hidden constant.

Applied today (all additive, read-only, each in its own tab + Dashboard preview):

1. **Year in Review** (`Yearly` tab) — YTD/yearly income, spending, net,
   savings rate, month-by-month bars, top categories & merchants, fair YoY
   compare, committed-future kept separate.
2. **Month Compare** (`Compare` tab) — any two months side by side with
   per-category deltas, new/stopped tags, biggest increase/drop callouts.
3. **Unusual Spending Alerts** (`Alerts` tab) — median+MAD outlier flags with
   window (30/90/180d) and sensitivity (Fewer ×4 / Balanced ×3 / More ×2)
   toggles; locked rows and small-sample categories skipped.

## 2. What changed since the last review

Run 1 of today added Budgets / Income / Bills and `2026-06-11-utils-insights.js`;
all three render live and correct during this run. This run reuses the
2026-06-09 analytics helpers (`periodTotals`, `categoryExpenseTotals`,
`merchantTotals`) — no period/spending definitions were re-implemented.

## 3. Current system overview

- React 18 + Vite; state in `context.jsx`; shell `App.jsx` (`NAV` + `renderView`)
  — now **20** top-level tabs; `pages.jsx` (~251 KB) holds Dashboard + legacy pages;
  newer features live in their own dated files.
- Transactions are the source of truth; Savings rows excluded from spend/income;
  Financing/locked rows are real outflows; `fmt()` handles BRL/USD display only.

## 4. Dashboard review

Launcher pattern intact: KPI row → three preview rows (06-09 / 06-10 / 06-11
run 1) → heavier panels. This run adds a **fourth preview row**
(Yearly / Compare / Alerts) directly under the third, same
`PanelErrorBoundary` + `aurum-card-hover` pattern. No existing panel moved or
restyled. The Dashboard now carries **12 preview cards** — making the preview
rows hideable via Tweaks (like the six classic panels) is now clearly worth an
owner decision.

## 5. All tabs review

- 9 review tabs from prior runs — confirmed live during this run.
- Graphs / Net Worth / Cards / Triumph — unchanged; Cards & Triumph still
  personalized (specific cards, one motorcycle).
- Ledger / Transactions / Planning — entry, history, budgets/goals/reminders.
- Subscriptions / Debts / Timeline / Card Purchases — still reachable only
  in-app, not in the top NAV (flagged every run).
- Gaps closed this run: year horizon, explicit month comparison, outlier alerts.

## 6–9. Improvement opportunities (flagged, not changed)

- **Nav is now 20 items.** It wraps to two lines (see screenshot in run
  report). A grouped/overflow nav ("Analytics ▾", "Planning ▾") is past due —
  needs owner approval since it restructures existing layout.
- **12 preview cards** on the Dashboard should become hideable via the existing
  Tweaks panel-toggle system (extends `DASHBOARD_PANELS` — small but edits
  existing behaviour, so deferred).
- Personalized features (Triumph, named apartments, card brands) still await
  the generalization roadmap phases.
- The Category Average sidebar + Spending-by-Category pie could move into a
  category-drilldown tab (see deferred E below).

## 10. Five suggestions (full detail in run report)

- **A. Year in Review ✅ APPLIED** — yearly/YTD summary; low risk, read-only.
- **B. Month Compare ✅ APPLIED** — two-month side-by-side; low risk, read-only.
- **C. Unusual Spending Alerts ✅ APPLIED** — outlier flags with user-facing
  sensitivity; low–medium risk, read-only (no stored state, no dismissals yet).
- **D. What-If Spending Simulator ⏸ DEFERRED** — "cut category X by N% →
  effect over 6/12 months / goal ETA". Deferred: overlaps the existing Category
  Projection Calculator on Planning; needs a reconciliation decision so two
  projection systems don't disagree (CLAUDE.md rule #5).
- **E. Category Explorer ⏸ DEFERRED** — per-category drill-down (history,
  trend, merchants within category). Deferred: overlaps Trends + the Category
  Average sidebar; better as a consolidation (which means moving existing
  Dashboard pieces — owner approval needed).

## 11. Applied today (3)

1. **Year in Review** — yearly/YTD totals, monthly bars, top categories &
   merchants, YoY compare, in new **Yearly** tab + Dashboard preview.
2. **Month Compare** — side-by-side month comparison with per-category deltas,
   in new **Compare** tab + Dashboard preview.
3. **Unusual Spending Alerts** — median+MAD outlier detection with sensitivity
   and window toggles, in new **Alerts** tab + Dashboard preview.

## 12. Files created / modified

**Created (5):**
- `src/2026-06-11-utils-yearly-compare-alerts.js` — pure math
  (`availableYears`, `yearSummary`, `monthOptions`, `compareMonths`,
  `unusualSpending`, `SENSITIVITY_LEVELS`); reuses 2026-06-09 analytics util.
- `src/2026-06-11-feature-year-review.jsx` — Yearly page + preview.
- `src/2026-06-11-feature-month-compare.jsx` — Compare page + preview.
- `src/2026-06-11-feature-alerts.jsx` — Alerts page + preview.
- `.claude/feature-review-log/2026-06-11-feature-review-run2.md` — this log.

**Modified (2) — wiring only:**
- `src/App.jsx` — 3 imports, 3 `NAV` entries (Yearly/Compare/Alerts), 3
  `renderView()` cases.
- `src/pages.jsx` — 3 preview imports + a fourth 3-card preview row after the
  run-1 row, each wrapped in `PanelErrorBoundary`.

No files renamed, moved, deleted, or overwritten. No commits/pushes.

## 13. Validation performed

- **Math unit test (node, 35 checks, all passed):** `yearSummary` — YTD months
  Jan–Jun, income 2000 / expense 650 / net 1350 / savings rate 67.5%, future
  instalment (300) excluded from totals and reported as `scheduledRest`, YoY
  +150% / +550%, `availableYears` excludes future years. `compareMonths` —
  totals/deltas/pct correct, rows sorted by |Δ|, `new`/`stopped` tags, biggest
  increase/drop, pct null when baseline is 0 (no divide-by-zero).
  `unusualSpending` — flags only the true outlier (×6 typical); locked rows,
  <5-sample categories and Savings rows skipped; MAD term prevents noisy-category
  false positives; higher sensitivity ⇒ ≥ flags. No NaN anywhere.
- **`npm run build`:** clean (only the pre-existing >500 kB single-chunk warning).
- **Browser (Vite dev + preview):** zero console errors/warnings. All 3 preview
  cards render live (Yearly net R$ 13.791,47; Compare May-vs-Apr; Alerts 2
  flagged of 18 checked). **Tab switching worked this run** (the 06-10/06-11
  sandbox quirk did not reproduce): Yearly / Compare / Alerts full pages all
  render with real data, month selects populated (Jun 2026 → May 2025),
  sensitivity toggle live-tested (Balanced 2 → More 4 alerts). Screenshot taken
  of the new Dashboard row.

## 14. Deferred (2)

1. **What-If Spending Simulator** — scenario tool ("cut X by 20%"); deferred to
   reconcile with the existing Category Projection Calculator first.
2. **Category Explorer** — per-category drill-down tab; deferred because it
   overlaps Trends and the Category Average sidebar (consolidation, not addition).

## 15. Risks & unclear areas

- **Nav width (20 tabs)** and **12 Dashboard preview cards** — both past the
  comfortable limit; grouped nav + hideable preview rows need owner approval.
- **Alerts has no dismiss/snooze** — flags recompute live; a noisy month stays
  flagged for the whole window. Adding "dismiss" needs a new storage key
  (owner call). Alert rows click through to Transactions via the existing
  `focusTxId` mechanism.
- **Compare on the in-progress month** is apples-to-oranges by nature; the
  default is the last two complete months and the current month is labelled
  "in progress" — accepted residual risk.
- **Year in Review YoY** compares same-window periods (Jan-1→today vs prior
  year same span); with seed data the prior year is sparse, so big percentages
  (e.g. +983%) are expected, not a bug.
- **Compare "+R$ 0,00" curiosity** observed with live data: April and May had
  identical totals with different category mixes — verified correct (category
  shifts cancel), not a calculation error.
