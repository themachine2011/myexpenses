# Feature Review — 2026-06-12

Automated daily run of `.claude/commands/feature-review.md`. (The run started
on 2026-06-12 and crossed midnight into 06-13 while validating; the file and
feature names keep the 06-12 run date.)

Branch: `main` (unchanged — no commits, no branch changes). Prior logs read
first; today's picks do not repeat any of the twelve features applied on
2026-06-09 (Health, Trends, Merchants), 2026-06-10 (Forecast, Goals,
Patterns), 2026-06-11 run 1 (Budgets, Income, Bills) or run 2 (Yearly,
Compare, Alerts).

---

## 1. Executive summary

After twelve analytics/planning tabs, three axes were still uncovered:

1. **No weekly horizon.** Every tab thinks in months (or years); nothing
   answers "how is my week going?" — the natural day-to-day check-in.
2. **The committed-vs-flexible split was invisible.** The `locked` flag is
   used as a Health sub-score and a KPI total, but nothing showed *which*
   spending is committed vs choosable, per category — i.e. "what could I
   actually cut?"
3. **No habit layer.** Patterns shows *when* money goes out, but nothing
   tracks no-spend days or streaks — a small motivation loop generic finance
   apps ship as standard.

Applied today (all additive, read-only, each in its own tab + Dashboard
preview):

1. **This Week** (`Week` tab) — rolling 7-day digest: spent vs the prior 7
   days, income, per-day average, top categories, biggest purchases
   (click-through to Transactions), and what's due in the next 7 days
   (clearly labelled projected, via the existing `upcomingDues`).
2. **Fixed vs Flex** (`Fixed/Flex` tab) — committed (locked) vs flexible
   spending split: totals, one stacked split bar, per-category stacked bars,
   and a 6-month committed-share trend. Period toggle Month/3M/6M/All.
3. **No-Spend Streaks** (`Streaks` tab) — current and best (90d) streaks of
   days with zero flexible spending, 30-day dot strip, no-spend count and
   daily flexible average. Locked rows and Savings transfers never break a
   streak; counting starts at the first recorded transaction so empty history
   can't fake a streak.

## 2. What changed since the last review

Since run 2 of 06-11, two long-flagged items were fixed (by the owner or a
later session): the top nav is now grouped (8 core pills + **Insights**/
**Plan** dropdowns — Timeline/Subscriptions/Debts finally have nav homes) and
all four preview rows are hideable via Tweaks (`previewsAnalytics/Forward/
Money/Deep` in `DASHBOARD_PANELS`). Today's wiring follows both patterns: the
three new tabs join the nav groups (no new top-level pills) and the new
preview row gets its own Tweaks toggle (`previewsRhythm`).

## 3. Current system overview

- React 18 + Vite; state in `context.jsx`; shell `App.jsx` (8 core pills +
  2 nav groups, now 23 routed views); `pages.jsx` (~253 KB) holds Dashboard +
  legacy pages; newer features live in their own dated files.
- Transactions are the source of truth; Savings rows excluded from
  spend/income; locked rows (financing/recurring) are real outflows; `fmt()`
  handles BRL/USD display only.

## 4. Dashboard review

Launcher pattern intact: KPI row → four hideable preview rows → heavier
panels. This run adds a **fifth preview row** (Week / Fixed-vs-Flex /
Streaks) directly under the fourth, same `PanelErrorBoundary` +
`aurum-card-hover` pattern, with its own Tweaks toggle. No existing panel
moved or restyled.

## 5. All tabs review

- 12 review tabs from prior runs — previews confirmed live during this run.
- Graphs / Net Worth / Cards / Triumph — unchanged; Cards & Triumph still
  personalized (generalization roadmap pending).
- Ledger / Transactions / Planning — entry, history, budgets/goals/reminders.
- Timeline / Subscriptions / Debts — now reachable via nav groups (fixed
  since last run). Card Purchases remains in-app-only (minor).
- Gaps closed this run: weekly horizon, committed-vs-flexible visibility,
  habit/streak layer.

## 6–9. Improvement opportunities (flagged, not changed)

- **Insights group now holds 11 items** — at some point grouping by theme
  (e.g. "Spending" vs "Time") or merging near-neighbours (Trends/Patterns,
  Yearly/Compare) is worth an owner decision. Merging tabs = restructuring,
  not additive, so not done today.
- **15 preview cards across 5 rows** — all hideable now, but the default-on
  set is large; choosing a slimmer default is an owner call.
- Personalized features (Triumph, named apartments, card brands) still await
  the generalization roadmap phases.
- `pages.jsx` keeps growing only via wiring lines, which is fine, but a
  future pass could extract the Dashboard into its own file (owner call —
  moves existing code).

## 10. Five suggestions (summary)

- **A. This Week ✅ APPLIED** — weekly digest; low complexity, low risk,
  read-only. Own tab + preview confirmed.
- **B. Fixed vs Flex ✅ APPLIED** — committed/flexible split; low–medium
  complexity, low risk, read-only. Own tab + preview confirmed.
- **C. No-Spend Streaks ✅ APPLIED** — habit/streak layer; low complexity,
  low risk, read-only. Own tab + preview confirmed.
- **D. Cashflow Calendar ⏸ DEFERRED** — full month-grid calendar tab with
  per-day net, income/expense markers and due-date overlay. Deferred: it
  overlaps the Dashboard "Spend Heatmap" panel AND the sidebar Payment
  Calendar; doing it right means consolidating those (moving existing
  Dashboard pieces — owner approval needed). Complexity medium, risk medium.
- **E. What-If Spending Simulator ⏸ DEFERRED** (also deferred 06-11 run 2) —
  "cut category X by N% → effect over 6/12 months". Still blocked on
  reconciling with the existing Category Projection Calculator on Planning so
  two projection systems can't disagree (CLAUDE.md rule #5). Complexity
  medium, risk medium.

**Why A/B/C are strongest:** purely additive, read-only, generic (nothing
user-specific), no threshold tuning, and each covers an axis no existing tab
touches (week horizon / spend flexibility / habit). D and E both require
owner decisions about existing functionality first.

**Relation to other tabs:** Week is the short-horizon sibling of Compare
(months) and Yearly (years), and reuses `upcomingDues` like Bills/Forecast.
Fixed/Flex deepens the Health "fixed-cost load" sub-score and the KPI "Fixed
Expenses" into an explorable split. Streaks complements Patterns (when you
spend) with discipline (how often you don't).

**Implementation order used:** shared util → Week → Fixed/Flex → Streaks →
wiring (App.jsx routes/nav/panel toggle, pages.jsx previews).

**Not to build yet:** D, E above; nav-group re-theming; preview-row default
slimming; generalization of personalized tabs.

## 11. Applied today (3)

1. **This Week** — rolling 7-day spending/income digest with prior-week
   comparison, top categories, biggest purchases, and next-7-days dues, in
   new **Week** tab (Insights group) + Dashboard preview.
2. **Fixed vs Flex** — committed vs flexible spending split per category with
   a 6-month committed-share trend, in new **Fixed/Flex** tab (Plan group) +
   Dashboard preview.
3. **No-Spend Streaks** — current/best no-spend streaks with a 30-day dot
   strip, in new **Streaks** tab (Insights group) + Dashboard preview.

## 12. Files created / modified

**Created (5):**
- `src/2026-06-12-utils-week-flex-streaks.js` — pure math (`weekDigest`,
  `fixedFlexReport`, `streaksReport`); reuses the 2026-06-09 analytics util's
  `inRange`/`periodRangeFor`/`monthlyExpenseSeries` and the 06-11 insights
  util's `summarizeDues` (no re-implemented definitions).
- `src/2026-06-12-feature-week-review.jsx` — Week page + preview.
- `src/2026-06-12-feature-fixed-flex.jsx` — Fixed/Flex page + preview.
- `src/2026-06-12-feature-streaks.jsx` — Streaks page + preview.
- `.claude/feature-review-log/2026-06-12-feature-review.md` — this log.

**Modified (2) — wiring only:**
- `src/App.jsx` — 3 imports, 2 Insights-group entries (Week, Streaks), 1
  Plan-group entry (Fixed/Flex), 3 `renderView()` cases, 1 `DASHBOARD_PANELS`
  entry (`previewsRhythm`).
- `src/pages.jsx` — 3 preview imports + a fifth hideable preview row after
  the run-2 row, each card wrapped in `PanelErrorBoundary`.

No files renamed, moved, deleted, or overwritten (the `dist/` build artifacts
were regenerated by `npm run build`, as in prior runs). No commits/pushes.

## 13. Validation performed

- **Math unit test (node, 32 checks, all passed):** `weekDigest` — totals,
  prior-week delta (+15%), per-day, top-category share, biggest-purchase
  ordering, Savings exclusion, `pct: null` when last week is empty (no
  divide-by-zero), empty-input safety. `fixedFlexReport` — fixed/flex/total
  split, per-category split + flexShare, sort order, Savings exclusion,
  empty-input safety. `streaksReport` — observation window starts at first
  transaction, current streak ignores locked rows, best-streak range, 30-day
  counts and flexible daily average, future instalments ignored, streak
  resets on a flexible spend today, empty-input zeros. No NaN anywhere.
- **`npm run build`:** clean (only the pre-existing >500 kB single-chunk
  warning).
- **Browser (Vite dev preview):** zero console errors/warnings after reload.
  All 3 new preview cards render live with real data (Week: R$ 1.326,91
  spent, ▼53% vs last week, due-7d R$ 2.210,90; Fixed/Flex: 1% committed
  month-to-date, R$ 39,80 vs R$ 4.114,63; Streaks: current 3 days, best 30,
  no-spend 28/30) and none tripped its `PanelErrorBoundary`.
- **Full-page tab switching could not be exercised this run (environment,
  not the app):** the preview tab reports `visibilityState: "hidden"`, so
  animation frames are throttled and the `AnimatePresence mode="wait"` view
  swap never completes — this affects the *existing* tabs too (same quirk
  documented 2026-06-10 and 06-11 run 1; full-page screenshot also timed out
  on the heavy three.js canvases, as before). The full pages share their
  data hooks with the verified previews. **Recommended quick manual check:**
  open the app and click Week / Fixed/Flex / Streaks once.

## 14. Deferred (2)

1. **Cashflow Calendar** — month-grid calendar with per-day net and due
   overlay; deferred because it overlaps the Dashboard Spend Heatmap and the
   sidebar Payment Calendar (consolidation needs owner approval).
2. **What-If Spending Simulator** — "cut X by 20%" scenario tool; still
   deferred pending reconciliation with the existing Category Projection
   Calculator (two projection systems must not disagree).

## 15. Risks & unclear areas

- **Fixed/Flex "Month" is month-to-date** (June 1 → now), matching
  `periodRangeFor` used by Trends/Patterns. Early in the month the committed
  share looks low because instalments haven't fired yet, while the Dashboard
  "Fixed Expenses" KPI counts the whole calendar month. Definitions are each
  internally consistent and the page explains the split, but a curious owner
  comparing the two numbers may ask — flagging for transparency.
- **Streak semantics are a choice:** a no-spend day = zero *flexible* real
  spending (locked rows and Savings don't break streaks). The page states
  this. If the owner prefers "zero spending of any kind", it's a one-line
  change in `streaksReport`.
- **Week vs week is rolling, not calendar:** "last 7 days" = today + 6 back.
  Stated on the page; calendar-week alignment (Mon–Sun) would be a different
  product choice.
- **Insights group size (11 items)** and the 15-card default Dashboard are
  growing; both flagged above for an owner decision.
- The streaks 30-day strip uses dot tooltips (`title`) only — fine for
  desktop, no touch tooltip; acceptable for a v1.
