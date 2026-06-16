# Feature Review — 2026-06-16

Automated daily run of `.claude/commands/feature-review.md`.

Branch: `feature/daily-review-2026-06-10-11` (unchanged — no commits, no branch
changes, per Hard limits). Prior logs read first (latest was 2026-06-15, incl.
its 2026-06-16 addendum that fixed the systemic "future instalment counted as
already-spent" bug across Health / Trends / Merchants / KPI row). Today does not
repeat any shipped tab; the one new feature fills a genuinely uncovered axis.

---

## 1. Executive summary

The product is mature: ~29 routed views (8 core pills + Insights + Plan groups)
and 6 hideable Dashboard preview rows. Two opportunities stood out:

1. **A real gap:** the **Subscriptions** tab is *manual only* — the user must
   hand-type every recurring template. Nothing scans the real transaction
   history to *discover* charges that already repeat on a steady cadence (the
   beloved "Rocket Money / Truebill" feature). That's the new feature.
2. **Flagged nest:** the 06-12 and 06-15 logs both flagged **Trends + Patterns**
   (both "spending behaviour" analyses, both in the crowded Insights group) as a
   sensible nest — the same proven thin-wrapper pattern as the 06-15 Compare hub.

Applied this run (all additive / read-only; no stored-data shape changed):

1. **Recurring Cost Radar** (new `Recurring` tab in the Plan group + Dashboard
   preview) — auto-detects recurring charges from real transactions, totals the
   monthly/yearly recurring load, and flags untracked "blind spots". Derived
   from a pure, unit-tested `detectRecurring`.
2. **Nest: "Behaviour" hub** — Trends + Patterns nested under one `Behaviour`
   tab with Trends / Patterns sub-tabs, trimming the Insights group from 10 → 9.
   Both pages render unchanged.

A small **correctness refinement** was made to the new feature during review
(see §9): Financing instalments are recurring costs but are *already scheduled*
as future rows, so they are excluded from the "untracked blind spot" total and
do **not** get the one-click "Track" button (that would double-count the loan).

## 2. What changed since the last review

- The 06-15 log + its 06-16 addendum standardised current-month actuals to
  month-to-date across Health, Trends, Merchants, and the Dashboard KPI row, and
  added the Allowance tab + Compare hub. All reviewed; no regression, no re-do.
- Nav is grouped (Insights / Plan dropdowns); every preview row is hideable from
  Tweaks. Today's wiring follows both patterns exactly.

## 3. Current system overview

- React 18 + Vite; state in `context.jsx`; shell `App.jsx` (8 pills + 2 nav
  groups); `pages.jsx` holds Dashboard + legacy pages; each newer feature lives
  in its own dated file with a pure-math util + unit-tested logic.
- Transactions are the source of truth; `Savings` rows excluded from
  spend/income; `Financing` rows are real, pre-scheduled outflows; `fmt()` is
  display-only (BRL/USD wallet toggle).

## 4. Dashboard review

Launcher pattern intact: KPI row → six hideable preview rows → heavier panels.
This run adds **one preview card** (Recurring Radar) to the *existing*
`previewsMoney` row (Budgets · Income · Bills · Recurring) rather than spawning a
7th row — same deliberate choice as 06-15, to avoid worsening clutter. No
existing panel moved or restyled. Verified live: the card renders real data
("R$ 2.191,00 /mo · 1 active · all tracked").

## 5. All tabs review

- All analytics/planning tabs reviewed; data hooks shared with their verified
  Dashboard previews.
- Trends + Patterns overlap (both spending-behaviour) → nested this run.
- Subscriptions (manual) had no automatic counterpart → added Recurring Radar as
  its sibling.
- Personalized tabs (Triumph, card brands, named items) still await the
  generalization roadmap; untouched.

## 6. UI/UX improvement opportunities

- "Where is my money committed every month?" had no single answer; the Radar's
  one headline number (monthly recurring load + yearly) answers it.
- The Behaviour hub reduces the Insights dropdown by one item, lowering nav
  scanning cost.

## 7. Scalability improvement opportunities

- `detectRecurring` is a small pure function that *reuses* `normalizeMerchant`
  from the existing analytics util — no new merchant-grouping engine to keep in
  sync (CLAUDE.md rule #4).
- The Behaviour hub is a thin wrapper that composes existing pages, so neither
  page grows and the nest is trivially reversible.

## 8. Simplification opportunities (tabs to merge / nest)

- **Done:** Trends + Patterns → one "Behaviour" hub (Insights 10 → 9).
- **Next-run candidates (not done, to keep footprint small):** the 6 preview
  rows could ship a slimmer default-on set (owner call — a default-visibility
  preference, not a code fix); the standalone `trends`/`patterns`/`yearly`/
  `compare` routes are kept only so the preview cards deep-link — a future pass
  could point those previews at the hubs instead and retire the standalone
  routes.

## 9. Existing features improved / logic mistakes found

- **One correctness refinement, in the new feature itself (caught during live
  review):** the detector first flagged the Triumph financing instalment series
  as an "untracked" recurring charge (R$ 2.191/mo). A financing instalment *is* a
  recurring cost, but it already exists as future-dated, pre-scheduled rows — so
  (a) it is **not** a blind spot, and (b) offering the one-click "Track" button
  for it would create a monthly auto-firing template that **double-counts the
  loan**. Fixed: `detectRecurring` now marks `category === 'Financing'` items as
  `scheduled`; scheduled items count toward the monthly *load* but are excluded
  from `untracked`/`untrackedMonthly`, show a "Scheduled" pill, and get no Track
  button. Added `accountedMonthly` (= tracked subs + scheduled financing) so the
  summary math always balances. Verified live: Untracked now reads R$ 0,00.
- **No other calculation bugs found.** The 06-16 addendum's month-to-date
  standardisation was re-checked against the live KPI row (Fixed Expenses
  R$ 39,80, Cash Flow +R$ 1.567, Savings Rate 24.6%) — all consistent.

## 10. Features that could move off the Dashboard

- None this run. The new feature follows the established pattern (preview card on
  Dashboard, full tab in nav).

## 11. The 2 candidate ideas (applied the best one)

### Candidate A — Recurring Cost Radar ✅ APPLIED
- **What it does:** scans the trailing 6 months of transactions, auto-detects
  charges that repeat on a regular cadence with a stable amount (subscriptions,
  memberships, insurance, loan instalments), totals the monthly + yearly
  recurring load, and flags the ones not yet saved as a Subscriptions template
  ("untracked blind spots"). One click promotes a real subscription into a
  Subscriptions template (reusing the existing `addRecurring` shape).
- **Purpose:** surface forgotten/silent recurring spend and show total committed
  monthly load — the natural automatic counterpart to the manual Subscriptions
  tab.
- **Logic:** group real expenses by `normalizeMerchant`; for each group with ≥3
  charges, require (1) a regular interval (median gap fits a weekly / biweekly /
  monthly / quarterly band, ≥60% of gaps within ±35% of the median), and (2) a
  stable amount (coefficient of variation ≤ 0.4). Monthly-equivalent = typical
  amount × cadence-per-month. Cross-reference Subscriptions templates for
  `tracked`; treat Financing as `scheduled`.
- **Main components:** `detectRecurring` (util), `RecurringRadarPage`,
  `RecurringRadarPreview`.
- **Where it lives:** `Recurring` tab in the Plan group (next to Subscriptions).
- **Dashboard preview + own tab:** both ✅.
- **UI/UX benefit:** one headline "recurring load" number + a blind-spot count.
- **Scalability benefit:** pure derived math reusing the existing merchant
  normaliser; nothing new to maintain.
- **Complexity:** medium. **Risk:** low (read-only by default; the only write is
  a user-initiated "Track" button reusing the existing recurring-template shape,
  and it is suppressed for already-scheduled financing).

### Candidate B — Cash Runway ⏸ NOT APPLIED
- **What it does:** how many months your savings would last at the current spend
  rate if income stopped (savings ÷ avg monthly expense).
- **Purpose:** an emergency-fund "how long could I survive" read.
- **Logic:** `runway = savingsTotal / avgMonthlyExpense` over a trailing window.
- **Where it would live:** Insights group.
- **Why not chosen:** it overlaps the **Health** tab, which already has an
  "Emergency runway" sub-score built from the same two numbers. Adding a whole
  tab for one ratio already shown elsewhere would re-plot covered data.
  Candidate A fills a genuinely *uncovered* axis (automatic recurring discovery)
  with no existing equivalent.

**Why A is stronger:** it answers a question nothing else in the app answers
(what repeats, automatically detected), it's a beloved generic consumer-finance
feature, and it complements rather than duplicates the manual Subscriptions tab.

**Relation to existing tabs:** Recurring Radar is the *automatic* sibling of the
*manual* **Subscriptions** tab; its monthly load overlaps conceptually with
**Bills** (upcoming dues) and **Fixed/Flex** (committed vs flexible), but it is
the only surface that *discovers* recurring charges from raw history rather than
relying on user-entered templates. The Behaviour hub simply re-homes **Trends**
+ **Patterns**.

**Order applied this run:** new util (+ tests) → new feature page/preview →
correctness refinement (scheduled financing) → nest wrapper → wiring (App.jsx
imports/nav/routes/panel label, pages.jsx preview).

**Not to build yet:** Candidate B; slimmer default preview rows; retiring the
standalone trends/patterns/yearly/compare routes; generalization of personalized
tabs.

## 12. Files created / modified

**Created (4):**
- `src/2026-06-16-utils-recurring-detector.js` — pure `detectRecurring` (+
  `classifyCadence`, `median`, `CADENCES`); reuses `normalizeMerchant`. No
  re-implemented definitions.
- `src/2026-06-16-feature-recurring-radar.jsx` — `RecurringRadarPage` +
  `RecurringRadarPreview`.
- `src/2026-06-16-feature-behaviour-hub.jsx` — thin `BehaviourPage` wrapper
  nesting the unchanged `SpendingTrendsPage` + `SpendingPatternsPage` under
  Trends / Patterns sub-tabs.
- `.claude/feature-review-log/2026-06-16-feature-review.md` — this log.

**Modified (2) — wiring only:**
- `src/App.jsx` — 2 imports; Plan-group `recurringRadar` entry (after
  Subscriptions); Insights-group `trends`+`patterns` replaced by one
  `behaviourHub` entry; `renderView()` cases for `recurringRadar` and
  `behaviourHub` (the `trends`/`patterns` cases kept so preview deep-links still
  work); `previewsMoney` panel label updated to include Recurring.
- `src/pages.jsx` — 1 preview import; Recurring Radar preview card added to the
  existing `previewsMoney` row (wrapped in `PanelErrorBoundary`).

No files renamed, moved, deleted, or overwritten. No stored-data shape changed
(the optional "Track" button reuses the existing `addRecurring` template shape).
No commits/pushes.

## 13. Files now unused / safe to delete after review

- **None.** The Behaviour nest keeps `2026-06-09-feature-spending-trends.jsx` and
  `2026-06-10-feature-spending-patterns.jsx` fully in use — the hub renders both,
  and their standalone routes + Dashboard preview cards still reference them.
  Nothing was orphaned.

## 14. Validation performed

- **Unit tests (node):** `detectRecurring` — 19 checks in the first pass
  (monthly/weekly cadence detection, monthly-equivalent math, tracked
  cross-reference, variable spend rejected, Savings excluded, active vs cancelled
  split, empty-input safety) + 11 checks in a second pass after the financing
  refinement (Financing marked `scheduled`, excluded from untracked, no
  double-count, `accountedMonthly` + `untrackedMonthly` = `monthlyTotal`). All
  passed; no NaN.
- **`npm run build`:** clean (only the pre-existing >500 kB single-chunk warning,
  same as every prior run). 1252 modules transformed.
- **Browser (Vite dev preview):** zero console errors after load and navigation.
  - **Recurring Radar preview card** renders live on the Dashboard:
    "R$ 2.191,00 /mo · 1 active · all tracked".
  - **Full Recurring Radar page** renders (verified by spoofing
    `visibilityState` to defeat the documented hidden-tab animation limitation):
    headline R$ 2.191,00/mo · R$ 26.292,00/yr; Untracked R$ 0,00; Accounted for
    R$ 2.191,00; the Triumph instalment listed with a **"Scheduled"** pill and
    **no "Track" button** (double-count guard working). Nav shows and highlights
    "PLAN · RECURRING".
  - **Behaviour hub** renders with the Trends / Patterns sub-toggle; clicking
    Patterns switches content (Busiest day · Sun, weekday breakdown). Trends and
    Patterns standalone routes still resolve for the preview deep-links.
- **Known environment limitation (unchanged from prior logs):** the preview tab
  reports `visibilityState: "hidden"`, which pauses `requestAnimationFrame`, so
  the `AnimatePresence mode="wait"` exit of the outgoing page never completes on
  a normal click and the incoming page doesn't mount. This affects *every* tab
  equally. Worked around this run by spoofing visibility, which let both new full
  pages mount and render correctly.
  **Recommended 30-second manual check:** open the app, click Plan → Recurring,
  then Insights → Behaviour and flip Trends/Patterns.

## 15. Candidate NOT applied

- **Cash Runway** — months your savings would last at current spend; not applied
  because it overlaps the Health tab's "Emergency runway" sub-score (see §11).

## 16. Risks & unclear areas

- **Detection tuning is a judgement call.** The three gates (≥3 charges, regular
  interval, stable amount with CV ≤ 0.4) are deliberately strict to avoid
  flagging variable spend (e.g. groceries) as a subscription. A real
  subscription that varies a lot in price (usage-based) could be missed; a very
  consistent twice-a-month habit could be picked up. Thresholds are centralised
  in the util and easy to tune.
- **"Track" button writes only on user click.** It reuses `addRecurring` (the
  existing template shape) and is suppressed for Financing (scheduled) items, so
  it cannot double-count a loan. It is still possible for a user to "Track" a
  detected subscription that they later also enter manually — a normal duplicate,
  removable in Subscriptions; no data-shape risk.
- **"Next expected" is an estimate**, not a forecast of new money (last charge +
  median gap), and is labelled as such on the page.
- **Nav clutter improved but not solved** (Insights 10 → 9; Plan 10 → 11 with
  Recurring; net tabs +0 overall because one nest offsets one new tab). Bigger
  restructuring remains an owner decision, not auto-applied.
