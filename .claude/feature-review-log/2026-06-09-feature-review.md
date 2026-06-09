# Feature Review — 2026-06-09

Automated daily run of `.claude/commands/feature-review.md`.
Branch: `feature/dashboard-panels-custom-categories` (unchanged — no commits, no
branch changes). This is the first **dated** log entry; the folder previously
held only `README.md`, so nothing has been auto-applied before today.

---

## 1. Executive summary

MyExpenses ("Aurum") is a single-user React/Vite personal-finance dashboard with
a strong visual identity (glass theme, 3D token, animated charts) and genuinely
deep money logic (BRL↔USD wallet, projections, debts, subscriptions, financial
statements). The product is mature on the **input** and **styling** side. The
biggest open opportunity is **read-only analytics that answer "so what?"** — the
app shows a lot of numbers but does less to interpret them.

Today's run adds three lightweight, read-only analysis tabs that interpret data
already in the app, each with a Dashboard preview card:

1. **Financial Health** — one 0–100 score from this month's real numbers.
2. **Spending Trends** — this month vs last month, per category, biggest movers.
3. **Top Merchants** — who you pay (a dimension the app didn't have before).

All three are additive, touch existing files only for wiring, and were validated
by bundling + a math unit test (see §13).

## 2. What changed since the last review

No prior dated review exists, so there is no machine-readable diff to compare
against. Observed recent activity (file timestamps / git): the Dashboard gained a
custom show/hide **panel system** and **custom categories** (current branch
name), an **AI import extractor** (Jun 3), **financial statements** panel, and a
**category projection calculator**. The app is actively evolving on the
Dashboard; this review deliberately keeps new work *off* the Dashboard (only
small preview cards) to avoid colliding with that in-progress work.

## 3. Current system overview

- **Stack:** React 18 + Vite, framer-motion, recharts, three.js. State lives in
  `context.jsx` (`useAppState`) and is shared via `AppContext`.
- **Shell:** `App.jsx` — sticky header with wallet balance + BRL/USD flip, a
  `NAV` array of tabs, a `renderView()` switch, a Tweaks panel, and a fixed
  light/dark toggle.
- **Pages:** `pages.jsx` (~250 KB) holds every page/component.
- **Data model:** transactions are `{ id, date, amount, type:'income'|'expense',
  category, description, paymentMethod, locked, ... }`. `Savings` rows are
  set-aside money (excluded from spend); `Financing`/`Debt` are real outflows.
- **Money rules:** `fmt()` formats per the BRL/USD toggle (display only); stored
  data is currency-agnostic. Transactions are the source of truth.

## 4. Dashboard review

Panels today: KPI row (Liquid Income, Cash Flow, Savings Rate, Fixed Expenses),
Financial Statements, Monthly Insights, Cash Flow Chart, Spend Heatmap, Income vs
Costs + Spending-by-Category pie, Recent Activity; sidebar Category Average
Spending. Strengths: clean, premium, user-controllable via Tweaks. Watch-outs:
the Dashboard is already long and is the busiest file to edit — adding *full*
features here would worsen scroll length and merge risk. Recommendation (followed
today): keep the Dashboard as a **launcher** — small preview cards that link into
dedicated tabs.

## 5. All tabs review

- **Graphs / Net Worth / Cards** — strong visuals; Cards & Triumph are
  personalized (specific cards and a specific motorcycle).
- **Ledger / Transactions / All Transactions** — solid data entry & history.
- **Planning** — holds budgets, savings, bill reminders (good consolidation).
- **Subscriptions / Debts / Timeline / Card Purchases** — reachable in-app but
  not in the top `NAV`; they work but are slightly hidden.
- **Gap:** nothing interprets *trends over time*, *overall health*, or
  *merchant-level* spend. That gap defines today's three features.

## 6. UI/UX improvement opportunities

- Several useful pages (Subscriptions, Debts, Timeline) aren't in the top nav —
  discoverability could improve with a small "More" group.
- The Dashboard would read better as summary cards that drill into tabs (the
  pattern the three new previews follow).
- A single "health" glance would reduce the cognitive load of scanning four KPIs.

## 7. Scalability improvement opportunities

- `pages.jsx` is a ~250 KB monolith; new features should live in their **own
  files** (today's do) so the monolith doesn't keep growing.
- Period math and income/expense definitions were at risk of being copy-pasted;
  today they were centralized in one shared util (`2026-06-09-utils-analytics.js`)
  so future analytics reuse it instead of redefining "what counts as spending."

## 8. Simplification opportunities

- Personalized specifics (Triumph bike, named apartments, specific card brands)
  could be generalized into "vehicle/asset goals" and "generic cards" if this
  ever becomes a public product. Deferred — high-touch, needs owner sign-off.
- Four KPIs could be summarized by one Health score for at-a-glance use (added).

## 9. Features that could move off the Dashboard into a dedicated tab

- The **Category Average Spending** sidebar and the **Spending-by-Category** pie
  are analysis pieces that would fit naturally alongside the new **Trends** tab.
  Not moved today (that would change existing Dashboard behavior beyond wiring);
  flagged for a future consolidation pass.

## 10. Five feature suggestions

### A. Financial Health Score ✅ APPLIED
- **What it does:** turns this month's real transactions + savings balance into a
  single 0–100 score with four sub-scores and plain-language tips.
- **Purpose:** an at-a-glance "how am I doing?" that four separate KPIs don't give.
- **Logic:** savings rate (30%), spending-vs-income (25%), emergency runway
  (25%, savings ÷ avg monthly expense), fixed-cost load (20%); piecewise-linear
  mappers → weighted composite.
- **Main components:** `HealthScorePage`, `HealthScorePreview`, SVG gauge.
- **Where it lives:** new **Health** tab + Dashboard preview. *(both confirmed)*
- **UI/UX benefit:** one memorable number; reduces KPI-scanning.
- **Scalability benefit:** reuses shared analytics util; generic for any user.
- **Complexity:** medium. **Risk:** low (read-only).

### B. Spending Trends / Top Movers ✅ APPLIED
- **What it does:** this month vs last month per category; ranks biggest
  increases/decreases; 6-month sparkline per category.
- **Purpose:** answers "what changed?" — the most common budgeting question.
- **Logic:** category totals for current vs previous month; delta + %; 6-month
  series for sparklines.
- **Main components:** `SpendingTrendsPage`, `SpendingTrendsPreview`, inline
  `Sparkline` (no new deps).
- **Where it lives:** new **Trends** tab + Dashboard preview. *(both confirmed)*
- **UI/UX benefit:** surfaces movers instead of making the user diff months by eye.
- **Scalability benefit:** pure function of transactions; no per-user tuning.
- **Complexity:** medium. **Risk:** low (read-only).

### C. Top Merchants / Payees ✅ APPLIED
- **What it does:** groups expenses by merchant (normalized description) and ranks
  by total, with count, average ticket, last-seen, category; period toggle.
- **Purpose:** adds the missing *who you pay* dimension (app only had categories).
- **Logic:** normalize description → group → sum/count/avg → sort; period ranges
  (month/3M/6M/all).
- **Main components:** `MerchantsPage`, `MerchantsPreview`, `merchantTotals` util.
- **Where it lives:** new **Merchants** tab + Dashboard preview. *(both confirmed)*
- **UI/UX benefit:** finds recurring drains the category view hides.
- **Scalability benefit:** generic; normalization is conservative (under-merges
  rather than wrongly merging two real merchants).
- **Complexity:** medium. **Risk:** low (read-only; merchant grouping is heuristic).

### D. Unusual Spending Detector ⏸ DEFERRED
- **What it does:** flags transactions far above a category's typical size
  (median × N or z-score) as "worth a look."
- **Purpose:** catch mistakes, fraud, or one-offs without manual scanning.
- **Logic:** per-category median/MAD over a trailing window; flag outliers.
- **Where it lives:** new **Alerts** tab + Dashboard preview.
- **Complexity:** medium. **Risk:** low–medium (thresholds need tuning to avoid
  false positives). **Why deferred:** overlaps the Trends signal; better built
  after seeing how Trends reads in practice.

### E. Month-End Cash Forecast ⏸ DEFERRED
- **What it does:** projects end-of-month available cash from elapsed-day run-rate
  plus known locked/recurring dues.
- **Purpose:** a forward "will I be okay this month?" view.
- **Logic:** run-rate = spent-so-far ÷ days-elapsed × days-in-month, plus
  `upcomingDues()`; separate **actual / projected / combined** per project rules.
- **Where it lives:** new **Forecast** tab + Dashboard preview.
- **Complexity:** medium–high. **Risk:** medium. **Why deferred:** overlaps the
  existing Category Projection Calculator; needs a careful, owner-reviewed
  reconciliation of the two projection methods before shipping.

### Why the 3 chosen are strongest
A, B, and C are **purely additive, read-only, and generic** — they interpret data
already present, need no threshold tuning, and don't overlap an existing feature.
D and E both shadow existing functionality (Trends signal; the projection
calculator) and involve tuning/forecasting judgment, so they carry more risk and
are better as a follow-up once A–C are in use.

### How each relates to other tabs
- Health summarizes the same month the Dashboard KPIs describe — a roll-up, not a
  contradiction (uses the same actual-spending definition).
- Trends is the time-derivative of the Dashboard's category pie.
- Merchants is the orthogonal axis to categories (Transactions/Cards show
  individual rows; Merchants aggregates them by payee).

### Best implementation order
Shared util → Health → Trends → Merchants → wire NAV/switch + Dashboard previews.
(Exactly the order used today.)

### What should NOT be built yet
- Generalizing the personalized Triumph/apartment/card features (needs owner
  decisions; not additive).
- Moving existing Dashboard panels into tabs (changes existing behavior beyond
  wiring).
- D and E above, until A–C have been seen in real use.

---

## 11. Applied today (3)

1. **Financial Health Score** — a 0–100 monthly health score with four sub-scores
   and tips, in a new **Health** tab + Dashboard preview.
2. **Spending Trends / Top Movers** — month-over-month category movement with
   sparklines, in a new **Trends** tab + Dashboard preview.
3. **Top Merchants / Payees** — spend grouped by merchant with totals/averages, in
   a new **Merchants** tab + Dashboard preview.

## 12. Files created / modified

**Created (4):**
- `src/2026-06-09-utils-analytics.js` — shared read-only period/score/merchant math.
- `src/2026-06-09-feature-health-score.jsx` — Health page + Dashboard preview.
- `src/2026-06-09-feature-spending-trends.jsx` — Trends page + Dashboard preview.
- `src/2026-06-09-feature-merchants.jsx` — Merchants page + Dashboard preview.
- `.claude/feature-review-log/2026-06-09-feature-review.md` — this log.

**Modified (2) — wiring only:**
- `src/App.jsx` — 3 imports, 3 `NAV` entries (Health/Trends/Merchants), 3
  `renderView()` switch cases.
- `src/pages.jsx` — 3 preview imports + a 3-card preview row added to the
  Dashboard, right after the KPI row, each wrapped in `PanelErrorBoundary`.

No existing files were renamed, moved, deleted, or overwritten. No commits/pushes;
branch unchanged.

## 13. Validation performed

- **Bundle:** `esbuild --bundle` on all three new feature entry files succeeded
  (exit 0); every import resolved through `context.jsx`'s full dependency chain
  and the shared util. The three authored `.jsx`/`.js` files also parse clean.
- **Math unit test (node):** on a synthetic transaction set —
  `periodTotals` = income 7750 (Savings excluded), expense 3091 (Financing
  included), fixed 2191, cashflow 4659; health composite sane (97 "Excellent");
  merchant grouping merged `"Zaffari grocery"`/`"ZAFFARI  grocery"` (780, 2×);
  `lerpScore` clamps; zero-data health returns a finite score (no NaN/divide-by-0).
- **Edits confirmed** via the file API (App.jsx imports/NAV/switch; pages.jsx
  preview imports + cards).

## 14. Deferred (2)

1. **Unusual Spending Detector** — flags transactions far above a category's
   typical size; deferred because it overlaps the Trends signal and needs
   threshold tuning.
2. **Month-End Cash Forecast** — run-rate + known dues projection; deferred
   because it overlaps the existing Category Projection Calculator and needs an
   owner-reviewed reconciliation of the two projection methods.

## 15. Risks & unclear areas

- **Shell-mount staleness (environment, not the app):** during this run the Linux
  shell mount served a *stale, truncated* copy of `App.jsx`/`pages.jsx` over
  OneDrive, which made an early `esbuild` bundle of the whole app fail spuriously.
  The file-API view confirmed both files are complete and correct, and the new
  features bundle cleanly. **Recommended manual check:** open the app
  (`npm run dev`) and click the three new tabs to confirm they render — a quick
  visual confirmation since a full project build couldn't run in this sandbox
  (the mounted `node_modules` is a Windows install, so the Linux rollup/esbuild
  native binaries are absent — unrelated to the code).
- **Merchant grouping is heuristic.** Normalization is intentionally conservative
  (lowercases, collapses whitespace, strips accents and `3/12`-style markers); it
  may under-merge (two spellings shown separately) but should not wrongly merge
  two genuinely different merchants.
- **Empty/new-wallet states.** With no data the Health score shows a neutral
  ~"Fair" and the Trends/Merchants previews show friendly empty messages — not
  misleading, but worth a glance once real data is present.
- **Definitional choice (noted for transparency):** the new analytics count
  `Financing`/`Debt` as real expenses and exclude `Savings`, matching the
  Dashboard's actual-spending KPIs. If you prefer Financing excluded from
  "spending," that's a one-line change in `2026-06-09-utils-analytics.js`.
