# Feature Review — 2026-06-15

Automated daily run of `.claude/commands/feature-review.md`.

Branch: `feature/daily-review-2026-06-10-11` (unchanged — no commits, no branch
changes, per Hard limits). Prior logs read first (latest was 2026-06-12).
Between then and now, the two items deferred on 06-12 were built and committed
(commits `d76d6d3` Cashflow Calendar & What-If, `4bee0de` cap in-progress month
at today) but never got their own log file — noted here so they aren't
re-suggested. Today's pick does not repeat any of the ~17 analytics/planning
tabs already shipped.

---

## 1. Executive summary

The product is now very mature: **28 routed views** (8 core pills + an Insights
group of 11 + a Plan group of 9) and **6 Dashboard preview rows**. Nearly every
analytics axis is covered. Two things stood out this run:

1. **One genuine gap remained:** nothing turns "where will the month land?" into
   the single most actionable consumer-finance number — *how much can I still
   spend per day for the rest of this month?* Forecast gives a month-end figure;
   Budgets gives per-category limits; neither gives a forward daily rate.
2. **Nav clutter keeps growing** (flagged in the 06-12 log as an owner decision).
   The Insights group held 11 items, two of which — Yearly and Month Compare —
   are the same idea (retrospective period comparison).

Applied this run (both additive / read-only, no data shape changed):

1. **Daily Allowance** (new `Allowance` tab + Dashboard preview) — "safe to
   spend per day" for the rest of the month, derived from the *existing*
   Forecast engine so it can never disagree with it.
2. **Nest: "Compare" hub** — Yearly + Month Compare nested under one `Compare`
   tab with Months / Year sub-tabs, trimming the Insights group from 11 → 10.
   Nothing moved or rewritten; both pages render unchanged.

## 2. What changed since the last review

- Cashflow Calendar and What-If Simulator (the 06-12 deferrals) are now live in
  the Plan group with a 6th preview row (`previewsPlanning`). Their shared util
  (`2026-06-14-utils-calendar-whatif.js`) correctly caps current-month actuals
  at today and reuses `projectCategorySpend` (no projection conflict). Reviewed,
  no fix needed.
- Nav is grouped (Insights / Plan dropdowns); every preview row is hideable from
  Tweaks. Today's wiring follows both patterns.

## 3. Current system overview

- React 18 + Vite; state in `context.jsx`; shell `App.jsx` (8 pills + 2 nav
  groups); `pages.jsx` (~256 KB) holds Dashboard + legacy pages; each newer
  feature lives in its own dated file with a pure-math util + unit-tested logic.
- Transactions are the source of truth; `Savings` rows excluded from
  spend/income; `locked` rows are real outflows; `fmt()` is display-only
  (BRL/USD wallet toggle).

## 4. Dashboard review

Launcher pattern intact: KPI row → six hideable preview rows → heavier panels.
This run adds **one preview card** (Daily Allowance) to the *existing*
`previewsPlanning` row rather than spawning a 7th row — deliberate, to avoid
worsening the clutter it's partly meant to relieve. No existing panel moved or
restyled.

## 5. All tabs review

- 17 analytics/planning tabs reviewed; data hooks shared with their verified
  Dashboard previews.
- Yearly + Compare overlap (both retrospective comparison) → nested this run.
- Trends + Patterns also overlap (both spending-behaviour analysis) — a future
  nest candidate, left for next run to keep this run minimal.
- Personalized tabs (Triumph, card brands, named items) still await the
  generalization roadmap; untouched.

## 6. UI/UX improvement opportunities

- The single daily number is a higher-signal "what do I do today?" read than any
  existing tab — addressed by the new feature.
- Income-basis ambiguity (received-so-far vs typical-month) is handled with an
  explicit, labelled toggle rather than a hidden assumption.

## 7. Scalability improvement opportunities

- New math is a small pure function (`allowanceReport`) that *reuses*
  `monthForecast` + `periodTotals` — no new projection engine, nothing to keep
  in sync later (CLAUDE.md rules #4 / #5).
- The "Compare" hub is a thin wrapper; it composes existing pages, so neither
  page grows and the nest is trivially reversible.

## 8. Simplification opportunities (tabs to merge / nest)

- **Done:** Yearly + Compare → one "Compare" hub (Insights 11 → 10).
- **Next-run candidates (not done, to keep footprint small):** Trends + Patterns
  ("Spending behaviour" hub); the 6 preview rows could ship a slimmer default-on
  set (owner call — it's a default-visibility preference, not a code fix).

## 9. Existing features to improve / logic mistakes found

- **No calculation bugs found.** The 06-14 calendar/what-if math was audited:
  current-month actuals are capped at `now`, dues are filtered to the month and
  kept separate from actuals, and the What-If reuses the Calculator's engine.
  All consistent — no change made.
- Improvement applied indirectly: Forecast now has a sibling (Allowance) that
  reframes the same numbers as a daily rate, with an explainer pointing users
  between the two so they read as one coherent system.

## 10. Features that could move off the Dashboard

- None this run. The Dashboard is already a launcher of hideable previews; the
  new feature follows that same pattern (preview on Dashboard, full tab in nav).

## 11. The 2 candidate ideas (applied the best one)

### Candidate A — Daily Allowance ✅ APPLIED
- **What it does:** shows how much you can still spend per day for the rest of
  the month and stay within income, after setting aside bills still due.
- **Purpose:** turn month-end projection into one daily, actionable number.
- **Logic:** `pool = income − spent so far − bills still due`; `perDay = pool ÷
  (days left incl. today)`. Two honest income bases — "Received so far" and
  "Typical month" (last month's total income) — both real, neither a forecast of
  future money. Reuses `monthForecast` so it can't disagree with Forecast.
- **Main components:** `allowanceReport` (util), `AllowancePage`,
  `AllowancePreview`.
- **Where it lives:** `Allowance` tab in the Plan group, after Forecast.
- **Dashboard preview + own tab:** both ✅ (preview added to the planning row).
- **UI/UX benefit:** the highest-signal "what do I do today?" read in the app.
- **Scalability benefit:** pure derived math, no new engine to maintain.
- **Complexity:** low. **Risk:** low (read-only, reuses verified engines).

### Candidate B — Savings Rate trend ⏸ NOT APPLIED
- **What it does:** monthly savings-rate % ((income−expense)/income) over 12
  months, with average, best/worst month, and a target line.
- **Purpose:** show the trend of how much of income is kept.
- **Logic:** per-month `periodTotals` over a trailing window → rate series.
- **Main components:** would need a util + page + preview.
- **Where it would live:** Insights group.
- **Dashboard preview + own tab:** both, if built.
- **UI/UX benefit:** a clean longitudinal "am I improving?" read.
- **Scalability benefit:** reuses `monthlyExpenseSeries`.
- **Complexity:** low–medium. **Risk:** low.
- **Why not chosen:** it overlaps two existing surfaces — the Dashboard "Cash
  Flow Chart" (monthly income/expense lines over 3M/6M/1Y) and the **Health**
  tab's "Savings rate" sub-score. Adding it risks a third place that says almost
  the same thing. Candidate A covers a genuinely *uncovered* axis (a forward
  daily spendable rate) and is harder to confuse with anything else.

**Why A is stronger:** it fills a real gap instead of re-plotting covered data,
it's a beloved generic consumer-finance feature (Simple's "Safe-to-Spend",
Copilot's daily budget), and by reusing the Forecast engine it adds zero risk of
two tools disagreeing.

**Relation to existing tabs:** Allowance is the daily-rate sibling of **Forecast**
(month-end figure) and a forward complement to **Bills** (it sets the same
upcoming dues aside) and **Budgets** (whole-month rate vs per-category limits).
The Compare hub simply re-homes **Yearly** + **Month Compare**.

**Order applied this run:** new util → new feature page/preview → nest wrapper →
wiring (App.jsx imports/nav/routes/panel label, pages.jsx preview).

**Not to build yet:** Candidate B; Trends + Patterns nest; preview-row default
slimming; generalization of personalized tabs.

## 12. Files created / modified

**Created (3):**
- `src/2026-06-15-utils-allowance.js` — pure `allowanceReport`; reuses
  `monthForecast` (forecast util) + `periodTotals`/`monthRangeFor` (analytics
  util). No re-implemented definitions.
- `src/2026-06-15-feature-allowance.jsx` — `AllowancePage` + `AllowancePreview`.
- `src/2026-06-15-feature-compare-hub.jsx` — thin `ComparePage` wrapper nesting
  the unchanged `MonthComparePage` + `YearReviewPage` under Months / Year
  sub-tabs.
- `.claude/feature-review-log/2026-06-15-feature-review.md` — this log.

**Modified (2) — wiring only:**
- `src/App.jsx` — 2 imports; Plan-group `allowance` entry; Insights-group
  `yearly`+`compare` replaced by one `compareHub` entry; `renderView()` cases
  for `allowance` and `compareHub` (the `yearly`/`compare` cases kept so preview
  deep-links still work); `previewsPlanning` panel label updated to include
  Allowance.
- `src/pages.jsx` — 1 preview import; Allowance preview card added to the
  existing `previewsPlanning` row (wrapped in `PanelErrorBoundary`).

No files renamed, moved, deleted, or overwritten. No stored-data shape changed.
No commits/pushes.

## 13. Files now unused / safe to delete after review

- **None.** The nest keeps `2026-06-11-feature-year-review.jsx` and
  `2026-06-11-feature-month-compare.jsx` fully in use — the Compare hub renders
  both, and their standalone routes + Dashboard preview cards still reference
  them. Nothing was orphaned.

## 14. Validation performed

- **Unit test (node, 22 checks, all passed):** `allowanceReport` — Savings rows
  excluded; future-dated rows excluded from current-month actuals (capped at
  today); past-due and next-month dues excluded; `daysToSpread = days left + 1`
  (incl. today); both income bases compute correctly; negative pool detected and
  reported honestly; last-day-of-month guard (`daysToSpread = 1`); empty-input
  safety (no NaN). No NaN anywhere.
- **`npm run build`:** clean (only the pre-existing >500 kB single-chunk
  warning, same as every prior run).
- **Browser (Vite dev preview):** zero console errors/warnings after load and
  navigation. The **Daily Allowance preview card renders live on the Dashboard
  with real data** — "R$ 0,00 /day · Over budget on income basis" (correct: this
  month income R$ 6.361 < expenses R$ 7.037, so the pool is negative and the
  daily figure is clamped to 0 with the over-budget message — the negative-pool
  branch working as designed). Nav correctly shows and highlights "PLAN ·
  ALLOWANCE". No `PanelErrorBoundary` tripped.
- **Known environment limitation (unchanged from 06-10/06-11/06-12 logs):**
  full-page tab switching can't be exercised here — the preview tab reports
  `visibilityState: "hidden"`, so the `AnimatePresence mode="wait"` exit
  animation of the outgoing Dashboard never completes and the incoming full page
  never mounts. This affects *every* tab equally, not this change. The full
  AllowancePage and the Compare hub share their data + logic with the verified
  preview cards and existing pages, and the bundle compiled them without error.
  **Recommended 30-second manual check:** open the app, click Plan → Allowance,
  toggle Typical/Received, then Insights → Compare and flip Months/Year.

## 15. Candidate NOT applied

- **Savings Rate trend** — monthly savings-rate % over 12 months; not applied
  because it overlaps the Dashboard Cash Flow Chart and the Health savings
  sub-score (see §11).

## 16. Risks & unclear areas

- **Income-basis choice is a product decision, surfaced not hidden.** "Received
  so far" can look alarming early in the month before payday (pool near 0 or
  negative); "Typical month" (last month's income) is steadier, so it's the
  default when last month had income. Both are labelled and toggleable. If a
  month had no prior-month income, only "Received so far" is available.
- **"Days left includes today."** The allowance spreads the pool over today
  through month-end inclusive. Stated on the page; a "from tomorrow" variant
  would be a one-line change.
- **Slight, intentional routing redundancy from the nest.** `yearly` and
  `compare` keep their standalone routes (so the Dashboard preview cards still
  deep-link straight to the focused view) *and* are reachable via the Compare
  hub. Harmless and fully reversible; chosen to avoid editing the two preview
  components.
- **Nav clutter is improved but not solved** (Insights 11 → 10, Plan 9 → 10
  with Allowance; net tabs +1 overall). The bigger restructuring (more nests,
  slimmer default previews) remains an owner decision, not auto-applied.

## 17. Addendum — clear calculation fixes (applied 2026-06-16)

A follow-up "apply any clear improvements" pass ran a 12-area adversarial audit
(it hit the session token limit partway, so the remaining areas were audited by
hand). It surfaced one **systemic calculation bug**: three early features still
counted **future-dated financing instalments as already-spent in the current
month**, while the rest of the suite (Forecast, Budgets, Month Compare, Year,
Calendar, Allowance) intentionally caps current-month actuals at today. Live
data confirmed it — the Merchants preview was showing a **Jun 18** instalment as
"#1 this month" on Jun 16.

**Fixed (3 files, all the same root cause — cap current-month actuals at `now`):**
- `src/2026-06-09-feature-health-score.jsx` — `useHealth` used the whole calendar
  month (`cur.to`); now month-to-date. Effect: the headline score and 3 of 4
  sub-scores no longer get dragged down by unpaid future instalments (observed
  32 "At risk" → 68 "Good" on the same data).
- `src/2026-06-09-feature-spending-trends.jsx` — `useTrends` current-month
  category totals and the current-month sparkline point now cap at today (past
  months unchanged), matching Month Compare's in-progress month.
- `src/2026-06-09-feature-merchants.jsx` — the **preview** used the whole month
  while the **page** already used month-to-date (`periodRangeFor('month')`); the
  preview now matches the page, so a future instalment no longer appears as the
  top merchant. (Removed the now-unused `monthRangeFor` import.)

**Validated:** `npm run build` clean; Dashboard previews render with corrected
real data (Merchants #1 = "Dívida · 1/3 · R$ 756,00", not the future Triumph
instalment); zero console errors.

**Dashboard KPI row — standardised to month-to-date (owner-approved 2026-06-16):**
The four headline KPI cards (Liquid Income, Cash Flow, Savings Rate, Fixed
Expenses) previously read the whole calendar month via the shared
`buildMonthlySeries`, so a future-dated instalment showed up as already-spent.
Because `buildMonthlySeries` is shared and intentionally spans *forward* months
for the cash-flow projection charts (`buildMonthlySeries(txs, 6, 6)`), it was NOT
capped. Instead a new `monthBucketTotals(transactions, year, month, dayCap)`
helper (same income/fixed/variable definitions, optional day-of-month cap) was
added and the KPI row now uses it; the chart `series` is untouched. "vs last
month" now compares the same elapsed window (month-to-date vs last month through
the same day) and YoY compares this-period vs the same period last year.
- Files: `src/charts.jsx` (+`monthBucketTotals`), `src/pages.jsx` (KPI
  `currentMonth`/`prevMonth` use it; removed the duplicate `now`),
  `src/context.jsx` (`yoyDelta` caps the in-progress month + same-period prior).
- Verified on real data: Fixed Expenses R$ 2.230,80 → R$ 39,80 (the Jun 18
  Triumph instalment no longer pre-counted), Cash Flow −R$ 676 → +R$ 1.567,
  Savings Rate −10.6% → 24.6%, Liquid Income unchanged R$ 6.361. Build clean,
  no console errors.

**Still NOT changed (flagged for owner decision):**
- **Unusual Spending Alerts window** (`2026-06-11-utils-yearly-compare-alerts.js`)
  — scans `windowDays + 1` calendar days (e.g. 91 for a "90-day" window). This is
  a defensible boundary convention, low impact; left as-is.
