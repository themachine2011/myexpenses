# Feature Review — 2026-06-10

Automated daily run of `.claude/commands/feature-review.md`.
Branch: `main` (unchanged — no commits, no branch changes). Read the prior log
`2026-06-09-feature-review.md` first; today's picks do **not** repeat the three
features applied then (Health, Trends, Merchants) and instead pick up the
forward-looking gap those left open.

---

## 1. Executive summary

MyExpenses ("Aurum") now has a solid **backward/at-a-glance** analytics layer
(Health score, month-over-month Trends, Top Merchants — all added 2026-06-09).
The clearest remaining gap is **forward-looking** and **behavioural** insight:
the app shows where money *went*, but does little to say where the month is
*heading*, whether savings goals are *on track*, or *when* in the week/month
spending clusters.

Today's run adds three lightweight, read-only tabs that close that gap, each
with a Dashboard preview card:

1. **Month-End Cash Forecast** — a simple daily run-rate projection of where this
   month's spending lands, plus known bills still due.
2. **Savings Goals Tracker** — progress rings + projected funding dates from your
   recent savings pace.
3. **Spending Patterns** — when you spend (weekday, day-of-month, weekend split).

All three are additive, touch existing files only for wiring, and were validated
by a math unit test + esbuild bundle + a clean dev-server compile (see §13).

## 2. What changed since the last review

The 2026-06-09 run added the Health / Trends / Merchants tabs and a shared
read-only analytics util (`2026-06-09-utils-analytics.js`). Those are now live on
the Dashboard as preview cards and confirmed rendering with real data during this
run. The app is otherwise unchanged. Today's work deliberately **reuses** that
2026-06-09 util (period math, totals) instead of redefining "what counts as
spending," and adds only new, feature-specific math in a new util.

## 3. Current system overview

- **Stack:** React 18 + Vite, framer-motion, recharts, three.js. State in
  `context.jsx` (`useAppState`), shared via `AppContext`.
- **Shell:** `App.jsx` — sticky header, `NAV` array, `renderView()` switch.
  Now 14 top-level tabs after today (Dashboard … Patterns).
- **Pages:** `pages.jsx` (~250 KB) holds the Dashboard + most pages.
- **Data model:** transactions `{ id, date, amount, type, category, description,
  locked, status, ... }`; `Savings` rows = set-aside money (excluded from spend);
  `Financing`/`Debt` = real outflows. `goals[]`, `recurring[]`, `reminders[]`,
  `budgets{}` live in context for planning features.
- **Money rules:** `fmt()` formats per the BRL/USD toggle (display only); stored
  data currency-agnostic; transactions are the source of truth.

## 4. Dashboard review

The Dashboard is a launcher: pinned KPI row, then a preview-card row for the
2026-06-09 tabs, then the heavier panels (Financial Statements, Monthly Insights,
Cash Flow Chart, Heatmap, Income vs Category, Recent Activity). Today adds a
**second preview-card row** (Forecast / Goals / Patterns) directly under the
first, keeping the same "summary card → drill into tab" pattern and the
`PanelErrorBoundary` wrapper. No existing panel was moved or restyled.

## 5. All tabs review

- **Health / Trends / Merchants** (2026-06-09) — confirmed live and correct.
- **Graphs / Net Worth / Cards / Triumph** — strong visuals; Cards & Triumph
  remain personalized (specific cards, a specific motorcycle).
- **Ledger / Transactions / Planning** — entry, history, budgets/goals/reminders.
- **Subscriptions / Debts / Timeline / Card Purchases** — reachable in-app but not
  in the top `NAV` (slightly hidden).
- **Gap closed today:** nothing projected the *current month forward*, tracked
  *goal funding dates*, or surfaced *when* spending happens. Those are the three
  new tabs.

## 6. UI/UX improvement opportunities

- Some pages (Subscriptions, Debts, Timeline) still aren't in the top nav — a
  small "More" group would help discoverability. *(deferred — touches existing
  nav layout beyond additive wiring)*
- The top nav is now 14 items wide; it wraps cleanly but is approaching the point
  where grouping/overflow would read better. Flagged, not changed.

## 7. Scalability improvement opportunities

- Each new feature lives in its **own file**, so the `pages.jsx` monolith doesn't
  grow. New math is in one new util (`2026-06-10-utils-forecast.js`) that imports
  the 2026-06-09 helpers — no duplicated period/spending logic (CLAUDE.md rule #4).
- All three features are pure functions of existing data; no per-user tuning, no
  new dependencies, no new storage keys.

## 8. Simplification opportunities

- Personalized specifics (Triumph bike, named apartments, specific card brands)
  could be generalized for a public product. Deferred — needs owner sign-off; not
  additive.
- The two Dashboard preview rows (6 cards) could later be made show/hide-able via
  Tweaks like the other panels. Deferred — that edits the existing panel-toggle
  system beyond simple wiring.

## 9. Features that could move off the Dashboard into a dedicated tab

- The **Category Average Spending** sidebar + **Spending-by-Category** pie would
  sit naturally next to the Trends/Patterns tabs. Not moved (changes existing
  Dashboard behaviour beyond wiring); flagged for a future consolidation pass.

## 10. Five feature suggestions

### A. Month-End Cash Forecast ✅ APPLIED
- **What it does:** from spend-so-far this month, derives a daily pace and
  projects month-end spend; shows actual / projected / combined separately, plus
  known bills still due before month end and a vs-last-month read.
- **Purpose:** answers the forward question "will I be okay this month?"
- **Logic:** `dailyPace = expenseSoFar / daysElapsed`;
  `projectedMonthExpense = expenseSoFar + dailyPace × daysRemaining`;
  `projectedMonthNet = incomeSoFar − projectedMonthExpense`. Known dues pulled
  from `upcomingDues()` and shown separately (never silently added on top, to
  avoid double-counting).
- **Main components:** `CashForecastPage`, `CashForecastPreview`, `monthForecast`.
- **Where it lives:** new **Forecast** tab + Dashboard preview. *(both confirmed)*
- **UI/UX benefit:** one forward number with a clear pace bar.
- **Scalability benefit:** single top-level cash run-rate; generic for any user.
- **Complexity:** medium. **Risk:** low (read-only; clearly a run-rate estimate,
  kept distinct from the per-category Projection Calculator per CLAUDE.md rule #5).

### B. Savings Goals Tracker ✅ APPLIED
- **What it does:** every savings goal as a progress ring (allocated vs target)
  with a projected funding date from the last-3-month savings pace; falls back to
  the app's single overall goal when no per-goal list exists.
- **Purpose:** turns goals from static targets into "on track / when funded."
- **Logic:** `pace = net Savings-row flow over last 3 months ÷ 3`;
  `monthsToFund = ceil(remaining ÷ pace)`; ETA = now + monthsToFund.
- **Main components:** `SavingsGoalsPage`, `SavingsGoalsPreview`,
  `monthlySavingsPace`, `goalForecast`.
- **Where it lives:** new **Goals** tab + Dashboard preview. *(both confirmed)*
- **UI/UX benefit:** progress rings + a concrete funding month.
- **Scalability benefit:** reads existing `goals` + Savings rows; no new storage.
- **Complexity:** medium. **Risk:** low (read-only; ETA clearly labelled as
  "assumes recent pace holds").

### C. Spending Patterns ✅ APPLIED
- **What it does:** buckets real expenses by weekday and day-of-month, shows the
  weekday-vs-weekend split, busiest day, and average ticket; period toggle
  (month / 3M / 6M / all).
- **Purpose:** adds the *when* dimension (categories say *what*, merchants say
  *who*, this says *when*).
- **Logic:** group expenses by `getDay()` and `getDate()`; sum + count per bucket.
- **Main components:** `SpendingPatternsPage`, `SpendingPatternsPreview`,
  `spendingPatterns`.
- **Where it lives:** new **Patterns** tab + Dashboard preview. *(both confirmed)*
- **UI/UX benefit:** simple bars/columns; no new deps.
- **Scalability benefit:** pure function of transactions; generic.
- **Complexity:** low–medium. **Risk:** low (read-only).

### D. Unusual Spending Detector ⏸ DEFERRED (also deferred 2026-06-09)
- **What it does:** flags transactions far above a category's typical size
  (median × N / MAD) as "worth a look."
- **Purpose:** catch mistakes, fraud, or one-offs without manual scanning.
- **Where it lives:** new **Alerts** tab + Dashboard preview.
- **Complexity:** medium. **Risk:** low–medium. **Why deferred again:** thresholds
  need real-data tuning to avoid false positives, and the signal overlaps Trends.
  Better built once the new Patterns/Trends reads settle in.

### E. Recurring / Subscription Finder ⏸ DEFERRED
- **What it does:** auto-detects likely recurring charges from transaction history
  (same merchant, regular cadence) and estimates monthly/annual cost.
- **Purpose:** surface silent recurring drains the user forgot about.
- **Logic:** group by normalized merchant; detect ~monthly spacing; project annual.
- **Where it lives:** new **Recurring** tab + Dashboard preview.
- **Complexity:** medium. **Risk:** medium. **Why deferred:** overlaps the existing
  **Subscriptions** page and needs cadence-detection tuning; should reconcile with
  that page first (owner decision) before shipping a second, auto-detected view.

### Why the 3 chosen are strongest
A, B, and C are **purely additive, read-only, generic, and non-overlapping**:
they project / track / describe data already present, need no threshold tuning,
and each adds a genuinely new axis (forward-looking, goal-funding, time-of-week).
D and E both shadow existing functionality (Trends signal; the Subscriptions
page) and need tuning/owner reconciliation, so they carry more risk and are
better as follow-ups.

### How each relates to other tabs
- **Forecast** is the forward complement to the Dashboard KPIs and the Cash Flow
  chart — same actual-spending definition, projected ahead.
- **Goals** reads the same `goals` the Planning tab manages, adding a pace/ETA
  view without changing how goals are created.
- **Patterns** is the time axis to Trends' category axis and Merchants' payee
  axis.

### Best implementation order (the order used today)
New util (`2026-06-10-utils-forecast.js`, reusing the 2026-06-09 helpers) →
Forecast → Goals → Patterns → wire `NAV`/switch in App.jsx + a second Dashboard
preview row in pages.jsx.

### What should NOT be built yet
- Generalizing the personalized Triumph/apartment/card features (owner decision).
- Moving existing Dashboard panels into tabs (changes existing behaviour).
- D and E above, until thresholds/overlap are resolved.

---

## 11. Applied today (3)

1. **Month-End Cash Forecast** — daily run-rate projection of this month's
   spending + known dues, in a new **Forecast** tab + Dashboard preview.
2. **Savings Goals Tracker** — goal progress rings with projected funding dates
   from recent savings pace, in a new **Goals** tab + Dashboard preview.
3. **Spending Patterns** — weekday / day-of-month / weekend spending rhythm, in a
   new **Patterns** tab + Dashboard preview.

## 12. Files created / modified

**Created (5):**
- `src/2026-06-10-utils-forecast.js` — new read-only math (forecast, savings pace,
  goal ETA, weekday/day-of-month buckets); reuses the 2026-06-09 analytics util.
- `src/2026-06-10-feature-cash-forecast.jsx` — Forecast page + Dashboard preview.
- `src/2026-06-10-feature-savings-goals.jsx` — Goals page + Dashboard preview.
- `src/2026-06-10-feature-spending-patterns.jsx` — Patterns page + Dashboard preview.
- `.claude/feature-review-log/2026-06-10-feature-review.md` — this log.

**Modified (2) — wiring only:**
- `src/App.jsx` — 3 imports, 3 `NAV` entries (Forecast/Goals/Patterns), 3
  `renderView()` switch cases.
- `src/pages.jsx` — 3 preview imports + a second 3-card preview row added to the
  Dashboard, right after the 2026-06-09 preview row, each wrapped in
  `PanelErrorBoundary`.

No existing files were renamed, moved, deleted, or overwritten. No commits/pushes;
branch unchanged.

## 13. Validation performed

- **Math unit test (node):** on a synthetic transaction set —
  `monthForecast` gave actual expense 600 (Savings excluded, Financing would be
  included), income 5000, dailyPace 60, projected remaining 1200, combined month
  expense 1800, month net 3200, vs-last-month +100%, and exactly one in-month due;
  `monthlySavingsPace` averaged correctly over the trailing window; `goalForecast`
  handled normal (ETA computed), already-funded, and zero-pace (ETA null) cases;
  `spendingPatterns` bucketed weekday/weekend and picked the busiest day. No
  NaN / divide-by-zero in any output.
- **esbuild bundle:** all three new feature files + the new util bundled with the
  import chain resolved (exit 0); App.jsx and pages.jsx pass a JSX syntax check.
- **Dev server:** `npm run dev` (Vite) compiled with **no errors** in server or
  browser console. All three new **Dashboard preview cards render live with
  correct real-data numbers** (Forecast ≈ R$ 19.597,86 projected at 33% of month
  / R$ 653,26 per day; Goals → overall R$ 0 of R$ 120.000 at 0%; Patterns →
  busiest day Sun). The previews use the same data hooks as the full pages, so the
  data layer is exercised end-to-end.

## 14. Deferred (2)

1. **Unusual Spending Detector** — flags transactions far above a category's
   typical size; deferred again (threshold tuning + overlaps Trends).
2. **Recurring / Subscription Finder** — auto-detects recurring charges from
   history; deferred (overlaps the existing Subscriptions page; needs cadence
   tuning and an owner-reviewed reconciliation with that page).

## 15. Risks & unclear areas

- **In-harness tab switching couldn't be exercised (environment, not the app).**
  In the preview sandbox, clicking a nav button or loading `?view=forecast` did
  not switch the active view — and this affected the *existing* Health tab too,
  so it's a StrictMode/automation quirk (the `view` state is plain
  `useState('dashboard')` with no persistence), not a code problem. The full
  pages were therefore verified indirectly: they share their data hooks with the
  three preview cards, which render live and correct, and all files compile and
  bundle cleanly. **Recommended quick manual check:** open `npm run dev` and click
  the Forecast / Goals / Patterns tabs to eyeball the full pages once.
- **Forecast is a simple run-rate.** It is intentionally a single top-level cash
  pace, not a per-category model, and is labelled as such so it never contradicts
  the Category Projection Calculator. Known dues are shown separately rather than
  added on top, to avoid double-counting. Early in the month the pace is noisier
  (fewer elapsed days) — expected for any run-rate.
- **Savings pace is a 3-month average.** If the user's savings are lumpy, the goal
  ETA will swing month to month; the UI says it "assumes your recent pace holds."
  When there are no per-goal entries, the tab falls back to the single overall
  `goalAmount` so it's never empty.
- **Definitional choice (consistent with 2026-06-09):** the new analytics count
  `Financing`/`Debt` as real expenses and exclude `Savings`, matching the
  Dashboard's actual-spending KPIs.
