# Feature Review — 2026-06-17

Automated daily run of `.claude/commands/feature-review.md`.

Branch: `main` (stayed on current branch per Hard limits; this run **does**
commit + push, as the scheduled task explicitly authorises it). Prior logs read
first (latest 2026-06-16, which added Recurring Cost Radar + the Behaviour hub).
Today does not repeat any shipped tab; the new feature fills a genuinely
uncovered axis — the *forward* net-worth curve.

---

## 1. Executive summary

The product is mature: ~29 routed views (8 core pills + Insights + Plan groups)
and 6 hideable Dashboard preview rows. The one clearly **uncovered axis** is a
*forward* net-worth projection:

- The **Net Worth** core tab shows only **today** (assets + savings − managed
  debt) and a log of past snapshots. Nothing answers "if I keep saving at my
  recent pace, where does my net worth go, and when do I cross R$1M?"
- **Forecast** projects this *month's* cash, **Goals** projects when you hit a
  *specific savings target*, **Health** scores *today*. None draws the long-run
  wealth curve. That gap is the new feature.

Applied this run (all additive / read-only; no stored-data shape changed):

1. **Net-Worth Trajectory** (new `Trajectory` tab in the Plan group + Dashboard
   preview) — projects net worth forward 1 / 2 / 5 years from current equity at
   the user's *real* recent saving pace, draws the curve, and shows the dates it
   crosses the next round-number milestones. Derived from a pure, unit-tested
   `trajectoryReport` that **reuses** `netWorthSnapshot` (equity) and
   `monthlyExpenseSeries` (real monthly cash flow) — no new spending model.

No tab merge/nest this run: after the 06-15 (Compare) and 06-16 (Behaviour)
nests, the remaining overlaps are thin, and forcing another merge would add
churn without a clear win. One new feature + verification was the right scope.

## 2. What changed since the last review

- 06-16 shipped **Recurring Cost Radar** (auto-detect subscriptions) and nested
  **Trends + Patterns** into a **Behaviour** hub. Both reviewed live; no
  regression, no re-do. The Recurring "scheduled financing" double-count guard
  from that run was re-confirmed intact.
- Nav stays grouped (Insights / Plan dropdowns); every preview row hideable from
  Tweaks. Today's wiring follows both patterns exactly.

## 3. Current system overview

- React 18 + Vite; state in `context.jsx`; shell `App.jsx` (8 pills + 2 nav
  groups); `pages.jsx` holds Dashboard + legacy pages; each newer feature lives
  in its own dated file with a pure-math util + unit-tested logic.
- Transactions are the source of truth; `Savings` rows are excluded from both
  income and expense by `periodTotals`, so **cash flow = the amount that grows
  net worth** — exactly the rate the new projection uses. `fmt()` is display-only
  (BRL/USD wallet toggle).

## 4. Dashboard review

Launcher pattern intact: KPI row → six hideable preview rows → heavier panels.
This run adds **one preview card** (Net-Worth Trajectory) to the *existing*
`previewsForward` row (Forecast · Goals · Patterns → + Trajectory) rather than
spawning a 7th row — the same deliberate choice as 06-15/06-16, to avoid
worsening clutter. No existing panel moved or restyled. Verified live: the card
renders real data ("Projected · 1 year R$ 930.134,42 · +R$ 28.134,42 vs today").

## 5. All tabs review

- All analytics/planning tabs reviewed; data hooks shared with their verified
  Dashboard previews.
- **Net Worth** (snapshot-only) had no forward counterpart → added Trajectory as
  its forward-looking sibling (placed in the Plan group's savings cluster, next
  to Goals).
- Trends/Patterns (Behaviour) and Yearly/Compare (Compare) already nested in
  prior runs; left as-is.
- Personalized tabs (Triumph, card brands, named items) still await the
  generalization roadmap; untouched.

## 6. UI/UX improvement opportunities

- "Where is my wealth heading?" now has a single headline answer (projected net
  worth at 1/2/5 yr) plus milestone dates — previously the app only showed today.
- The chart is a dependency-free inline SVG (line + shaded area), matching the
  house card/eyebrow style; horizon and average-vs-median toggles use the same
  pill pattern as the Allowance tab.

## 7. Scalability improvement opportunities

- `trajectoryReport` is a small pure function that **reuses** the existing
  `netWorthSnapshot` and `monthlyExpenseSeries` — no new net-worth or
  cash-flow engine to keep in sync (CLAUDE.md rule #4).
- It invents no future-money model; the straight-line rate is the mean (or
  median) of real completed months, so it can never disagree with the figures
  the Dashboard already shows.

## 8. Simplification opportunities (tabs to merge / nest)

- **None applied this run** (deliberate — see §1). The remaining candidates are
  unchanged from prior logs and remain owner decisions:
  - retire the standalone `trends`/`patterns`/`yearly`/`compare` routes by
    re-pointing their preview cards at the Behaviour/Compare hubs;
  - ship a slimmer default-on preview-row set (a default-visibility preference).
- Nav clutter note: Plan group is now 12 items. A future pass could group the
  savings/forward cluster (Forecast · Allowance · Goals · Trajectory) into its
  own sub-hub — flagged, not done, to keep this run's footprint small.

## 9. Existing features improved / logic mistakes found

- **No calculation bugs found** in the existing tabs this run. The 06-16
  month-to-date standardisation and the Recurring "scheduled financing" guard
  were both re-checked and remain correct.
- One **correctness decision inside the new feature** (made during design, not a
  fix to old code): the projection deliberately **drops the current, in-progress
  month** (`monthlyExpenseSeries(7).slice(0,-1)`) so a half-finished month never
  drags the saving pace down — the same month-to-date discipline used elsewhere.
  It also offers a **median** basis so one freak month (a big one-off or a
  windfall) doesn't distort the curve. Verified live: median basis (R$ 953.861
  at 5 yr) is correctly lower than mean (R$ 1.042.672), resisting the outlier.

## 10. Features that could move off the Dashboard

- None this run. The new feature follows the established pattern (preview card on
  Dashboard, full tab in nav).

## 11. The 2 candidate ideas (applied the best one)

### Candidate A — Net-Worth Trajectory ✅ APPLIED
- **What it does:** projects current net worth forward 1 / 2 / 5 years using the
  user's recent real monthly saving pace (mean or median of completed months),
  draws the wealth curve, and shows the dates the pace crosses the next
  round-number milestones (e.g. crosses R$1M ~Dec 2029).
- **Purpose:** the long-run "where is my wealth heading?" read the app was
  missing — the forward counterpart to the snapshot-only Net Worth tab.
- **Logic:** rate = mean (or median) `cashflow` over the last 6 completed months
  (Savings transfers already excluded, so cash flow = net worth growth); project
  `equity + rate·t`; milestones = next steps above equity (step sized to the
  balance: R$10k/25k/100k/250k), crossing month = `ceil((target − equity)/rate)`,
  capped at a 10-year horizon. Shrinking case shows months-to-zero instead.
- **Main components:** `trajectoryReport` (util), `NetWorthTrajectoryPage`,
  `NetWorthTrajectoryPreview`.
- **Where it lives:** `Trajectory` tab in the Plan group (next to Goals).
- **Dashboard preview + own tab:** both ✅.
- **UI/UX benefit:** one headline number + milestone dates + a curve.
- **Scalability benefit:** pure derived math reusing two existing utils; nothing
  new to maintain.
- **Complexity:** medium. **Risk:** low (fully read-only; no writes at all).

### Candidate B — Money Flow (income→fixed→flex→savings waterfall) ⏸ NOT APPLIED
- **What it does:** a single waterfall/Sankey-style visual of this month's income
  splitting into fixed, flexible, savings and leftover.
- **Why not chosen:** it largely **re-plots data already shown** across the
  "Income vs Category" dashboard panel, the Fixed/Flex tab, and the cash-flow
  chart — prettier, but duplicative. Candidate A fills a genuinely *uncovered*
  axis (the forward wealth curve) with no existing equivalent, and aligns with
  the routine's "prefer changes that improve financial visibility and planning".

**Why A is stronger:** it answers a question nothing else in the app answers
(long-run net-worth trajectory + milestone dates), it's a beloved generic
personal-finance feature, and it complements the snapshot Net Worth tab rather
than duplicating any existing surface.

**Relation to existing tabs:** Trajectory is the *forward* sibling of the
snapshot **Net Worth** tab. Its rate comes from the same cash-flow figure the
**Dashboard KPI row**, **Forecast**, and **Allowance** all use, so it can't
disagree with them; it differs from **Goals** (a specific savings target's ETA)
by projecting *total* net worth, and from **Forecast** (this month's cash) by
looking years ahead.

**Order applied this run:** new util (+ 27 unit tests) → new feature
page/preview → wiring (App.jsx import/nav/route/panel label, pages.jsx preview)
→ build → live browser verification.

**Not to build yet:** Candidate B; retiring the standalone
trends/patterns/yearly/compare routes; a Plan-group savings sub-hub;
generalization of personalized tabs.

## 12. Files created / modified

**Created (3):**
- `src/2026-06-17-utils-networth-trajectory.js` — pure `trajectoryReport` (+
  `milestoneStep`, `monthLabelAhead`). Reuses no re-implemented definitions.
- `src/2026-06-17-feature-networth-trajectory.jsx` — `NetWorthTrajectoryPage` +
  `NetWorthTrajectoryPreview` (inline SVG curve, horizon + mean/median toggles).
- `.claude/feature-review-log/2026-06-17-feature-review.md` — this log.

**Modified (2) — wiring only:**
- `src/App.jsx` — 1 import; Plan-group `trajectory` entry (after Goals);
  `renderView()` case for `trajectory`; `previewsForward` panel label updated to
  include Trajectory.
- `src/pages.jsx` — 1 preview import; Net-Worth Trajectory preview card added to
  the existing `previewsForward` row (wrapped in `PanelErrorBoundary`).

No files renamed, moved, deleted, or overwritten. No stored-data shape changed
(the feature is 100% read-only — it has no write paths at all). Committed +
pushed to `main` (authorised by the scheduled task).

## 13. Files now unused / safe to delete after review

- **None.** No tab was merged or nested this run, so nothing was orphaned.

## 14. Validation performed

- **Unit tests (node):** `trajectoryReport` — 27 checks: mean/median rate,
  13-point series, projected = equity + rate·horizon, growing/flat/shrinking
  flags, milestone values + ordering + 120-month cap, median resists an outlier
  month, months-to-zero when shrinking, empty-input safety (no NaN), step sizing,
  and month-label rollover across a year. All passed.
- **`npm run build`:** clean — 1254 modules transformed (was 1252; +2 new
  files). Only the pre-existing >500 kB single-chunk warning, same as every run.
- **Browser (Vite dev preview):** zero console errors after load + navigation.
  - **Preview card** renders live on the Dashboard's forward row: "Projected · 1
    year R$ 930.134,42 · +R$ 28.134,42 vs today".
  - **Full Trajectory page** (verified by spoofing `visibilityState` to defeat
    the documented hidden-tab rAF limitation): headline R$ 930.134,42 (+R$
    28.134,42 vs today's R$ 902.000,00) at a pace of R$ 2.344,54/mo; SVG curve
    drawn (line + shaded area) with correct axis labels (Now · Dec 2026 · Jun
    2027); milestones R$1M ~Dec 2029 (42 mo) and R$1.1M ~Jul 2033 (85 mo), with
    R$1.2M (~127 mo) correctly excluded by the 120-month cap; "Open net worth →"
    link present. Nav shows and highlights "PLAN · TRAJECTORY".
  - **Toggles work:** 5 YR switches the headline to R$ 1.042.672,10; the
    "Typical (median)" basis correctly lowers it to R$ 953.861,00 (resisting the
    one high month — mean R$ 2.344,54 vs median R$ 864,35).
- **Known environment limitation (unchanged from prior logs):** the preview tab
  reports `visibilityState: "hidden"`, which pauses `requestAnimationFrame`, so
  the `AnimatePresence mode="wait"` wrapper stays at opacity 0 on a normal click;
  content is mounted in the DOM (confirmed via `textContent`) and a screenshot
  rendered the full page. Affects every tab equally.
  **Recommended 30-second manual check:** open the app, click Plan → Trajectory,
  flip 1/2/5 yr and Average/Typical.

## 15. Candidate NOT applied

- **Money Flow** (income→fixed→flex→savings waterfall) — not applied because it
  re-plots data already shown across Income-vs-Category, Fixed/Flex, and the
  cash-flow chart (see §11).

## 16. Risks & unclear areas

- **Sparse history understates the pace.** The rate averages the last 6
  *completed* months; months before the user started tracking count as R$0
  saved, which can drag the average down for new users. This is honest
  (no data = no recorded saving) and transparently labelled ("based on N
  completed months"), and the median basis softens it — but a future tweak could
  start the window at the first transaction. Thresholds/window are centralised in
  the util and easy to tune.
- **Straight-line projection.** It assumes the recent pace holds and no new
  assets/debts are added — clearly labelled an estimate, not a guarantee. It is
  intentionally simple (no compounding/interest) to stay honest and predictable.
- **Read-only, no data risk.** The feature has no write paths, reuses the
  existing storage shape only for reads, and adds no new keys.
- **Nav clutter grows by one** (Plan 11 → 12). Net tabs +1 this run (no offsetting
  nest). A Plan-group savings sub-hub is flagged for a future run.
