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

---

# Feature Review - 2026-06-18 (Run 2)

Automated run of `.claude/commands/feature-review.md`.

Branch: `main` (stayed on the current branch). Conflict noted: the user message
asked for commit/push and merge to main, but the routine file's Hard limits say
**Do not commit or push**. This run followed the routine file and did not commit
or push.

## 1. Executive summary

The app now has a broad planning set: Forecast, Allowance, Goals, Trajectory,
Safety Net, Budgets, Bills, Recurring, Debts, and Net Worth. The strongest
remaining gap found in this run was not another savings or budget view; it was
turning the existing user-managed debt balances into a payoff order.

Applied this run:

- **Debt Strategy / Debt Plan** - a new read-only Plan tab plus Dashboard preview
  that ranks debts by avalanche vs snowball strategy, shows managed debt
  remaining, monthly interest drag, estimated monthly payment plan, and the
  debt-free target when all debts have payoff-month fields.
- **Debts improvement** - the Debts tab now has a small "Plan payoff ->" cross-link
  so debt tracking leads into the new strategy view.

No tab merge or nest was applied. The existing thin/overlap candidates were
reviewed, but another merge today would either repeat prior work or hide useful
entry points without reducing enough clutter.

## 2. What changed or looks important since the last review

The most recent log was already today's first run, which shipped **Safety Net**.
This run did not repeat Safety Net, Net-Worth Trajectory, Behaviour, or Compare
work. It treated Safety Net as shipped context and looked for a different
uncovered axis. The uncovered axis was debt payoff prioritization: Debts stores
balances, rates, and payoff targets, but nothing interpreted them into an
ordered plan.

## 3. Current system overview

The product is a React 18 + Vite single-page app with context-backed local state.
`App.jsx` owns nav groups and route rendering; `pages.jsx` owns the Dashboard,
legacy/core views, and shared UI primitives; newer review features live in dated
feature files with small pure utilities where calculations are non-trivial.

Financial source of truth remains unchanged:

- transactions drive spending, income, bills, recurring detection, and savings;
- `debtsState` stores user-managed debts separately from the locked Triumph
  financing schedule;
- Net Worth subtracts user-managed debt, while Triumph financing remains a
  monthly cash-flow schedule.

## 4. Dashboard review

Dashboard structure remains KPI row plus hideable preview rows. The new preview
was added to the existing money row (`Budgets / Income / Bills / Recurring`) as
**Debt Plan**, avoiding a new Dashboard row. The preview links into its own tab
and shows managed debt remaining plus the next payoff target when debt exists.

No Dashboard panel was moved off the page in this run.

## 5. All tabs review

- Dashboard: functioning launcher pattern; added one preview card.
- Health: Safety Net already made the runway sub-score actionable; no repeat
  work.
- Forecast / Allowance: already cover month-end cash and daily safe-to-spend.
- Goals / Trajectory / Safety Net: cover savings target, net-worth projection,
  and emergency cushion; no duplicate savings feature added.
- Budgets: already includes current usage and projected month-end run-rate, so
  a Budget Pace feature was rejected as duplicative.
- Bills / Recurring / Subscriptions: separate manual and detected recurring
  surfaces remain useful; no merge applied today.
- Debts: tracks user-managed balances and manual payment progress but did not
  answer "which debt should I attack first?" - improved with a cross-link and
  the new strategy tab.
- Net Worth: already includes managed debt in equity; Debt Plan links back to it.
- Behaviour / Compare hubs: prior nests remain intact.
- Personalized areas (Triumph and branded card visuals): still candidates for
  future public-product generalization, untouched.

## 6. UI/UX improvement opportunities

Debt users now get a single next action rather than only a list of balances. The
new tab shows both common payoff mental models:

- avalanche for highest interest first;
- snowball for smallest balance first.

The Debts tab now points to the planning view. The Dashboard preview keeps the
feature discoverable without increasing top-level Dashboard complexity.

## 7. Scalability improvement opportunities

The debt strategy calculation is isolated in `debtStrategyReport`, so future
features can reuse the same ranking and totals without copying math into the UI.
It reads existing debt fields only and adds no new localStorage key or migration.

Potential future scaling: add optional user-configurable extra monthly payoff,
but not in this run because that would introduce new state and more UX surface.

## 8. Simplification opportunities

No merge or nest was applied.

Reviewed but not changed:

- Plan group is still long; a future Plan sub-hub could group cash, savings, and
  debt planning.
- Subscriptions and Recurring overlap conceptually, but one is manual templates
  and the other is detected spend. Keeping both visible avoids losing function.
- Debt Strategy and Debts overlap by domain, but one is read-only planning and
  one is CRUD/payment tracking. They were kept as separate tabs this run because
  the new feature is required to live in its own tab.

## 9. Existing features improved, and logic mistakes found

Improved:

- Debts tab gained a "Plan payoff ->" cross-link to the new Debt Plan tab.

Logic/calc issues found and fixed:

- During focused utility checks, zero-interest-only debt was initially labelled
  as avalanche because the avalanche and snowball target were the same debt. The
  util now recommends snowball when there is no interest-bearing debt.

No existing stored data or storage shape was changed.

## 10. Features that could move off the Dashboard

None moved this run. The new feature follows the existing pattern: one Dashboard
preview card plus a dedicated tab.

## 11. Exactly 2 candidate ideas for the new feature

### Candidate A - Debt Strategy / Debt Plan - APPLIED

- **Feature name:** Debt Strategy / Debt Plan
- **What it does:** ranks managed debts by payoff priority, shows avalanche and
  snowball next targets, monthly interest drag, estimated monthly payment plan,
  payoff queue, and debt-free target when payoff months are available.
- **Purpose:** turns the existing Debts tracker from a balance list into an
  actionable payoff plan.
- **Logic:** read `debtsState`; compute remaining = principal - paidSoFar,
  monthly interest = remaining * monthlyRate, estimated monthly payment from
  rate + payoffMonths, avalanche order by highest rate, snowball order by
  smallest remaining balance; use snowball when no active debt has interest.
- **Main components:** `debtStrategyReport`, `DebtStrategyPage`,
  `DebtStrategyPreview`.
- **Where it should live:** Plan group, beside Debts.
- **Dashboard preview + own tab:** confirmed both.
- **UI/UX benefit:** gives one obvious "pay this first" answer while still
  showing the alternative strategy.
- **Scalability benefit:** pure utility can support future extra-payment
  simulation without changing current storage.
- **Complexity:** medium.
- **Risk level:** low-medium, because rate interpretation depends on users
  entering monthly rate as the Debts form currently labels it.

### Candidate B - Income Reliability Monitor - NOT APPLIED

- **Feature name:** Income Reliability Monitor
- **What it does:** flags income volatility, late/missing expected income, and
  dependency on top income sources.
- **Purpose:** helps users know whether income is stable enough for planning.
- **Logic:** reuse existing Income Insights source grouping and monthly income
  series; compare recent income against trailing average and expected dates.
- **Main components:** income reliability util, tab page, Dashboard preview.
- **Where it should live:** Insights group near Income.
- **Dashboard preview + own tab:** would need both.
- **UI/UX benefit:** good early-warning view for irregular income.
- **Scalability benefit:** could generalize to multiple income streams later.
- **Complexity:** medium.
- **Risk level:** medium, because expected income dates are not explicitly
  stored and inference could be noisy.

**Why Candidate A is stronger:** Debt data already includes the fields required
for a useful deterministic plan. Candidate B would infer expected income timing
from transaction history and could generate false warnings. Debt Strategy is more
actionable with lower data risk.

**How the new feature relates to existing tabs:** It expands Debts, connects back
to Net Worth, and complements Forecast/Allowance by focusing on payoff order
rather than current-month cash. It does not duplicate Budgets, Safety Net, Goals,
or Trajectory.

**Order applied:** pure utility -> feature tab and preview -> App nav/route
wiring -> Dashboard preview wiring -> Debts cross-link -> validation -> log.

**Not built yet:** configurable extra-payment simulation, interest-savings
projection, annual APR/monthly rate conversion, Plan sub-hub, or Debt/Debt Plan
tab merge.

## 12. Files created / modified

Created:

- `src/2026-06-18-utils-debt-strategy.js`
- `src/2026-06-18-feature-debt-strategy.jsx`

Modified:

- `src/App.jsx` - imported and routed Debt Plan; added Plan nav entry; updated
  Dashboard panel label.
- `src/pages.jsx` - imported Dashboard preview, added preview card, added Debts
  cross-link.
- `.claude/feature-review-log/2026-06-18-feature-review.md` - appended this run.

Generated build output:

- `dist/index.html`
- `dist/assets/index-B8WAh8a6.js`

Note: the worktree already had unrelated dirty files and generated `dist` churn
before this run, including a tracked asset deletion. This run did not create,
switch, or delete branches, and did not intentionally delete source files.

## 13. Files now unused / safe to delete after review

- None. No tab merge or nest was performed.

## 14. Validation performed

- Focused Node assertions for `debtStrategyReport`: active debt totals,
  avalanche order, snowball order, priority selection, debt-free months,
  monthly payment, monthly interest, zero-interest snowball behavior, and empty
  input behavior all passed.
- `npm run build` passed. Vite reported the existing large chunk warning.
- Browser verification against `http://localhost:5174/` passed:
  - Dashboard loaded with title `Aurum - Onyx & Rose Gold`.
  - Dashboard preview contained `Debt Plan` and `Managed debt remaining`.
  - `?view=debtStrategy` loaded the full Debt Plan route with `Debt payoff
    priority`, `Payoff queue`, and `Manage debts`.
  - Captured console error logs: none.

## 15. Risks and unclear areas

- The Debts form labels rate as `% / mo`; Debt Plan uses it as a monthly rate.
  If a user enters annual APR, interest/payment estimates will be overstated.
- Payment estimates are planning math only. They do not record payments or alter
  debts.
- Debt-free target is only shown when every active debt has a payoff-month
  target; otherwise the page asks for payoff months rather than inventing a date.
- Existing `dist` artifacts were already dirty before this run; build output is
  generated and should be reviewed separately from source changes.
