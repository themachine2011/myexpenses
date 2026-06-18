# Feature Review — 2026-06-18

Automated daily run of `.claude/commands/feature-review.md`.

Branch: `main` (stayed on the current branch per Hard limits; this run **does**
commit + push, as the scheduled task explicitly authorises it). Prior logs read
first (latest 2026-06-17, which added Net-Worth Trajectory). Today does not
repeat any shipped tab; the new feature fills the one remaining uncovered
*savings-safety* axis — months-of-expenses runway.

---

## 1. Executive summary

The product is mature: ~30 routed views (8 core pills + Insights + Plan groups)
and 6 hideable Dashboard preview rows. The clear **uncovered axis** this run is a
dedicated **emergency-fund / safety-net** view:

- The **Health** tab scores an "emergency runway" sub-score (one number, 25% of
  the composite) but nothing turns it into a full, actionable view.
- **Goals** tracks an *arbitrary* savings target; **Trajectory** projects *total*
  net worth forward; **Forecast** is *this month's* cash. None answers the single
  most-recommended personal-finance question: *"how many months of expenses does
  my savings cover, and how far am I from a 3 / 6 / 12-month cushion?"* That gap
  is the new feature.

Applied this run (all additive / read-only; no stored-data shape changed):

1. **Emergency Fund / Safety Net** (new `Safety Net` tab in the Plan group +
   Dashboard preview) — shows months of expenses the savings buffer covers, a
   status band (At risk / Thin / Building / Fully funded), progress to a chosen
   3/6/12-month cushion, the amount still needed, and the ETA at the recent
   saving pace. Derived from a pure, unit-tested `emergencyFundReport` that
   **reuses** the *same* trailing-average monthly expense the Health runway uses
   and the *same* `monthlySavingsPace` the Goals tab uses — so it can never
   disagree with those surfaces.
2. **Improvement (Health tab):** the "emergency runway" sub-score now has a
   dedicated home, so the Health footer gained a **"Safety net →"** cross-link
   next to "Review transactions →", making that sub-score actionable.

No tab merge/nest this run: after the 06-15 (Compare) and 06-16 (Behaviour)
nests, the remaining overlaps are thin, and forcing another merge would add churn
without a clear win (consistent with the 06-17 decision). One new feature + one
cross-link improvement + verification was the right scope.

## 2. What changed since the last review

- 06-17 shipped **Net-Worth Trajectory** (forward wealth curve) and added its
  preview to the `previewsForward` row. Reviewed live; no regression, no re-do.
- The savings/forward cluster in the Plan group (Forecast · Allowance · Goals ·
  Trajectory) is the natural home for the new Safety Net tab, placed right after
  Trajectory.

## 3. Current system overview

- React 18 + Vite; state in `context.jsx`; shell `App.jsx` (8 pills + 2 nav
  groups); `pages.jsx` holds Dashboard + legacy pages; each newer feature lives
  in its own dated file with a pure-math util + unit-tested logic.
- Transactions are the source of truth; `Savings` rows are excluded from both
  income and expense by `periodTotals`. The Safety Net buffer is the user's real
  `savingsTotal`; the runway denominator is the trailing-6-month average real
  expense — the identical number the Health "runway" sub-score already uses.

## 4. Dashboard review

Launcher pattern intact: KPI row → six hideable preview rows → heavier panels.
This run adds **one preview card** (Safety Net) to the *existing* `previewsForward`
row (Forecast · Goals · Patterns · Trajectory → + Safety Net) rather than
spawning a 7th row — same deliberate choice as prior runs, to avoid worsening
clutter. No existing panel moved or restyled. Verified live: the card renders real
data ("Expenses covered · 0.0 mo · 0% to 6-month cushion") matching independently
re-computed stored data (savings R$ 0, avg spend R$ 4.442, 6-mo target R$ 26.654).

## 5. All tabs review

- All analytics/planning tabs reviewed; data hooks shared with their verified
  Dashboard previews.
- **Health** had an "emergency runway" sub-score with no deeper view → added
  Safety Net as the dedicated expansion, and a footer cross-link from Health.
- Trends/Patterns (Behaviour) and Yearly/Compare (Compare) already nested in
  prior runs; left as-is.
- Personalized tabs (Triumph, card brands, named items) still await the
  generalization roadmap; untouched.

## 6. UI/UX improvement opportunities

- "Am I protected if income stops?" now has a single headline answer (months
  covered + status band) plus a progress bar to a chosen cushion and an ETA.
- The target cushion uses the same pill toggle pattern as Trajectory's horizon
  toggle; the progress bar matches the Health sub-score bar style. No new visual
  language introduced.

## 7. Scalability improvement opportunities

- `emergencyFundReport` is a small pure function that **reuses** the existing
  trailing-average expense and `monthlySavingsPace` — no new spend/savings engine
  to keep in sync (CLAUDE.md rule #4). `monthLabelAhead` and `clamp` are reused
  from existing utils rather than re-implemented.
- It invents no future-money model; the ETA is a straight-line estimate from the
  recent pace, so it can never disagree with Goals' ETA logic.

## 8. Simplification opportunities (tabs to merge / nest)

- **None applied this run** (deliberate). Unchanged owner-decision candidates:
  - retire the standalone `trends`/`patterns`/`yearly`/`compare` routes by
    re-pointing their preview cards at the Behaviour/Compare hubs;
  - ship a slimmer default-on preview-row set (a default-visibility preference);
  - group the Plan savings cluster (Forecast · Allowance · Goals · Trajectory ·
    Safety Net) into its own sub-hub — the Plan group is now 13 items. Flagged,
    not done, to keep this run's footprint small.

## 9. Existing features improved / logic mistakes found

- **No calculation bugs found** in the existing tabs this run. The runway figure
  the new feature shows is intentionally identical to the Health runway sub-score
  (same window + filter), confirmed by reading the Health computation.
- **Improvement made:** Health footer now links to the new Safety Net tab
  ("Safety net →"), turning the previously dead-end runway sub-score into a path.

## 10. Features that could move off the Dashboard

- None this run. The new feature follows the established pattern (preview card on
  Dashboard, full tab in nav).

## 11. The 2 candidate ideas (applied the best one)

### Candidate A — Emergency Fund / Safety Net ✅ APPLIED
- **What it does:** shows how many months of expenses the savings buffer covers,
  a status band, progress to a 3/6/12-month cushion, the gap, and the ETA to fully
  fund at the recent saving pace.
- **Purpose:** the universal "am I protected if income stops?" read — the
  actionable expansion of the Health runway sub-score, which was only a number.
- **Logic:** `monthsCovered = savingsTotal / avgMonthlyExpense` (avg = trailing
  6-month mean of months with spend — same as Health); `targetAmount =
  targetMonths × avgMonthlyExpense`; `gap = max(0, target − buffer)`;
  `monthsToFund = ceil(gap / monthlySavingsPace)` when pace > 0 (same rule as
  Goals); status band at 1/3/6-month thresholds.
- **Main components:** `emergencyFundReport` + `safetyBand` (util),
  `EmergencyFundPage`, `EmergencyFundPreview`.
- **Where it lives:** `Safety Net` tab in the Plan group (after Trajectory).
- **Dashboard preview + own tab:** both ✅.
- **UI/UX benefit:** one headline (months covered) + a clear progress bar + ETA.
- **Scalability benefit:** pure derived math reusing existing utils; nothing new
  to maintain.
- **Complexity:** low–medium. **Risk:** low (fully read-only; no writes at all).

### Candidate B — Savings-Rate Trend ⏸ NOT APPLIED
- **What it does:** a monthly savings-rate (%) line over the last 6–12 months vs a
  20% benchmark.
- **Why not chosen:** it largely **re-plots data already shown** — the Dashboard
  "Savings Rate" KPI, the Health savings-rate sub-score, the Income tab, and the
  cash-flow trend chart all already express the same thing. Candidate A fills a
  genuinely *uncovered* axis (the emergency-fund runway) with no existing
  equivalent, and aligns with "prefer changes that improve financial visibility
  and planning".

**Why A is stronger:** it answers a question nothing else in the app answers in a
dedicated view (months-of-expenses safety + cushion ETA), it's a beloved generic
personal-finance feature, and it complements (rather than duplicates) Health,
Goals, and Trajectory.

**Relation to existing tabs:** Safety Net is the actionable expansion of the
**Health** "emergency runway" sub-score (it shares the exact avg-expense figure),
its ETA uses the same `monthlySavingsPace` as **Goals**, and it differs from
**Trajectory** (total net worth forward) and **Forecast** (this month's cash).

**Order applied this run:** new util (+ 32 unit checks) → new feature
page/preview → improvement (Health cross-link) → wiring (App.jsx import/nav/route/
panel label, pages.jsx preview) → build → live verification.

**Not to build yet:** Candidate B; retiring the standalone
trends/patterns/yearly/compare routes; a Plan-group savings sub-hub;
generalization of personalized tabs.

## 12. Files created / modified

**Created (3):**
- `src/2026-06-18-utils-emergency-fund.js` — pure `emergencyFundReport` +
  `safetyBand`. Reuses `clamp` (analytics) and `monthLabelAhead` (trajectory util)
  rather than re-implementing them.
- `src/2026-06-18-feature-emergency-fund.jsx` — `EmergencyFundPage` +
  `EmergencyFundPreview` (status band, progress bar, 3/6/12-month target toggle,
  cross-links to Goals + Health).
- `.claude/feature-review-log/2026-06-18-feature-review.md` — this log.

**Modified (3):**
- `src/App.jsx` — 1 import; Plan-group `emergencyFund` entry (after Trajectory);
  `renderView()` case for `emergencyFund`; `previewsForward` panel label updated
  to include Safety Net.
- `src/pages.jsx` — 1 preview import; Safety Net preview card added to the
  existing `previewsForward` row (wrapped in `PanelErrorBoundary`).
- `src/2026-06-09-feature-health-score.jsx` — footer CTA row gained a "Safety
  net →" cross-link button (improvement; the runway sub-score now has a home).

No files renamed, moved, deleted, or overwritten. No stored-data shape changed
(the feature is 100% read-only — it has no write paths). To be committed +
pushed to `main` (authorised by the scheduled task).

## 13. Files now unused / safe to delete after review

- **None.** No tab was merged or nested this run, so nothing was orphaned.

## 14. Validation performed

- **Unit tests (node):** `emergencyFundReport` / `safetyBand` — 32 checks:
  funded/building/at-risk/no-data paths, months-covered = buffer ÷ avg-expense,
  target = months × avg-expense, gap, pct (capped 0–100), funded flag,
  monthsToFund + ETA label (and null when pace ≤ 0), null months-covered when
  there's no expense history (no NaN), empty-input safety, band thresholds at
  1/3/6 months, and targetMonths floor. All passed.
- **`npm run build`:** clean — 1258 modules transformed (was 1256; +2 new files).
  Only the pre-existing >500 kB single-chunk warning, same as every run.
- **Browser (Vite dev preview):** **zero console errors** after HMR of all five
  touched files + navigation.
  - **Preview card** renders live on the Dashboard's forward row: "Expenses
    covered · 0.0 mo · 0% to 6-month cushion". Numbers independently verified by
    re-computing from stored data (`aurum.tx.v2`): savings buffer R$ 0, trailing
    6-month avg expense R$ 4.442, 6-month target R$ 26.654 → 0.0 months, 0% — an
    exact match, and it correctly exercises the zero-buffer branch.
  - **Nav** shows and highlights "PLAN · SAFETY NET" when the view is active.
  - The preview card uses the *same* `useSafetyNet` hook + `emergencyFundReport`
    util as the full page and is wrapped in `PanelErrorBoundary`; it rendered real
    numbers without hitting the error fallback, proving the shared logic mounts
    cleanly.
- **Known environment limitation (unchanged from prior logs):** the preview tab
  reports `visibilityState: "hidden"`, which throttles `requestAnimationFrame`, so
  the `AnimatePresence mode="wait"` wrapper keeps the *previous* view's exit frozen
  and the full new page never mounts on a headless navigation (a `preview_screenshot`
  also times out for the same reason). This affects **every** tab equally, not this
  feature. The page-only code is static presentational JSX built from the same
  card/eyebrow/Stat/toggle/progress-bar helpers already proven by the Trajectory
  page, and `npm run build` compiled it.
  **Recommended 30-second manual check:** open the app, click Plan → Safety Net,
  flip the 3 / 6 / 12-month target, and confirm the headline + progress bar update.

## 15. Candidate NOT applied

- **Savings-Rate Trend** — not applied because it re-plots data already shown
  across the Savings-Rate KPI, the Health savings sub-score, Income, and the
  cash-flow chart (see §11).

## 16. Risks & unclear areas

- **Zero/sparse savings understates the cushion.** With no `Savings`-category
  balance the buffer is R$ 0 and months-covered is 0.0 — honest, but new users
  who keep an emergency fund *outside* this app's Savings tracking will see 0.
  This mirrors how Health, Goals, and Trajectory already treat the savings
  balance, so it's consistent; a future tweak could let the user point at an
  external buffer. Transparently labelled.
- **No expense history → no runway.** When there's no recorded spend the runway
  is shown as "—" (not ∞ or NaN) and the card says "Log expenses to size it".
- **Straight-line ETA.** Time-to-fund assumes the recent pace holds — clearly
  labelled an estimate, same discipline as Goals/Trajectory.
- **Read-only, no data risk.** The feature has no write paths, reads the existing
  storage shape only, and adds no new keys.
- **Nav clutter grows by one** (Plan 12 → 13). A Plan-group savings sub-hub is
  flagged for a future run.
