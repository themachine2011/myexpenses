# Feature Review — 2026-06-20

Automated daily run of `.claude/commands/feature-review.md`.

Branch: `main` (stayed on the current branch per Hard limits; this run **does**
commit + push, as the scheduled task explicitly authorises it). Prior logs read
first (latest 2026-06-19 — Wallet Breakdown). Nothing was re-suggested, redone,
or undone.

---

## 1. Executive summary

The product is mature: ~31 routed views = 8 core pills + an **Insights** group
(9 items) + a **Plan** group (**14 items**) + hidden routes, plus 6 hideable
Dashboard preview rows and the new sidebar Wallet Breakdown.

Two clear opportunities stood out this run:

1. **Nav bloat (simplify):** the **Plan** dropdown had grown to 14 items — too
   long to scan. The codebase already has a proven, low-risk fix used twice
   (Compare hub nests Months/Year; Behaviour hub nests Trends/Patterns): a thin
   "hub" wrapper that nests siblings under one tab while keeping each child's
   standalone route registered for Dashboard deep-links.
2. **A genuine content gap:** no view answers *"of the money that came IN this
   month, where did it actually GO?"* as a single allocation picture. Trends =
   time series, Patterns = weekday, Merchants = who, Categories Average = bars.
   None shows income → category allocation + what was kept. That is the new
   feature.

Applied this run (all additive / read-only; **no stored-data shape changed**;
**every change isolated to new files + `App.jsx`** — see §8):

1. **Money Flow** (new `Money Flow` tab in the **Insights** group + a Dashboard
   sidebar preview) — income at the top (100%), each spending category as a
   proportional bar with its share of income, and a final **Kept / saved**
   (or **Overspent**) row that **is** `monthBucketTotals(...).cashflow` — the
   exact same number as the header Wallet / Cash-Flow KPI, so it can never
   disagree. A 4-month selector (This month / last 3 closed months) lets you
   scan recent allocation.
2. **Nest: "Savings" hub** — Goals + Trajectory + Safety Net nested under one
   `Savings` tab with Goals / Trajectory / Safety Net sub-tabs, trimming the
   Plan group **14 → 12**. All three pages render unchanged; their standalone
   routes stay registered so the existing Dashboard preview cards still
   deep-link straight to each.

## 2. What changed since the last review

- 2026-06-19 added the **Wallet Breakdown** sidebar reveal (click the header
  "Wallet" label to list the purchases behind the number). Today's Money Flow is
  complementary, not overlapping: Wallet Breakdown lists the *individual rows*;
  Money Flow shows the *category allocation %* of income. Both reuse the same
  `monthBucket*` helpers, so all three (Wallet KPI, Breakdown, Money Flow) agree.
- The working tree still carries another session's **uncommitted** card-billing /
  recurring-dedup work (flagged in the 2026-06-19 log). Left untouched again
  (see §8).

## 3. Current system overview

- **Core pills (8):** Dashboard, Graphs, Cards, Net Worth, Triumph, Ledger,
  Transactions, Planning.
- **Insights group (now 10):** Health, Week, Streaks, Behaviour (Trends/Patterns),
  Merchants, Income, Compare (Months/Year), **Money Flow (new)**, Alerts,
  Timeline.
- **Plan group (now 12):** Forecast, Allowance, **Savings (new hub: Goals /
  Trajectory / Safety Net)**, Budgets, Fixed/Flex, What-If, Calendar, Bills,
  Subscriptions, Recurring, Debt Plan, Debts.
- **Dashboard:** KPI row + 6 hideable preview rows + sidebar (Wallet Breakdown,
  Categories Average, and now the **Money Flow preview**).

## 4. Dashboard review

Solid. The KPI row (Liquid Income / Cash Flow / Savings Rate / Fixed Expenses) +
preview rows remain the strong core. The left sidebar is becoming the home for
"explain this number" widgets (Wallet Breakdown, Categories Average, Money Flow),
which is a coherent grouping. No KPI logic was changed this run.

## 5. All tabs review

No functional regressions. The only structural change is the Plan group nest
(Savings) and the new Insights item (Money Flow). Every previously-reachable view
is still reachable; the three nested pages are now one click deeper (via the
Savings hub) but also still deep-linked from their Dashboard previews.

## 6. UI/UX improvement opportunities (noted, not all applied)

- The header nav wraps to a third line on narrow widths now that Insights has 10
  items. A future run could move 1–2 backward-looking items (e.g. Timeline) into
  a different grouping, or introduce a search-driven command palette for tabs.
  Not done this run to keep the footprint minimal.
- Money Flow could later gain a true Sankey (source→destination curves); kept to
  proportional bars this run for robustness/low risk.

## 7. Scalability / simplification opportunities

- The "hub nest" pattern is now used 3× (Compare, Behaviour, Savings) and is the
  right lever to keep the growing nav scannable. Remaining nest candidates for a
  future run: a **Bills/Recurring** hub (Bills + Subscriptions + Recurring) and a
  **Debt** hub (Debt Plan + Debts). Not done this run (one nest per run).

## 8. Existing features improved / logic fixes

- **Money Flow (own new feature) polish:** the "Kept/saved" percentage rounded a
  tiny overspend (−0.4%) to a confusing `-0%`. Fixed to display `0%` (normalised
  JS negative zero). No other existing feature's logic was changed.

## 9. The 2 candidate ideas (and why the chosen one won)

**Candidate A — Money Flow (CHOSEN).**
- *What:* income allocation for the month — ranked category bars as a share of
  income + a Kept/saved (or Overspent) remainder.
- *Logic:* reuses `monthBucketRows` + `monthBucketTotals` (charts.jsx); groups
  fixed+variable rows by category; remainder = cashflow. No new spending model,
  so it can never disagree with the Wallet KPI.
- *Lives:* own `moneyFlow` tab (Insights) + Dashboard sidebar preview.
- *Complexity:* low–medium. *Risk:* low (read-only, reuses proven helpers).

**Candidate B — 50/30/20 Rule Check (NOT applied).**
- *What:* bucket spending into Needs / Wants / Savings and compare to the popular
  50/30/20 guideline.
- *Why rejected:* needs a per-category Needs/Wants classification, which overlaps
  the existing **Fixed/Flex** tab and is opinionated/personalised — higher risk
  of "wrong" labels, and less universally meaningful than a raw allocation
  picture. Money Flow makes zero assumptions about the user's categories.

## 10. Order applied this run

1. Improvement (Money Flow `-0%` polish — part of the new feature).
2. Nest (Savings hub) — nav-only + one new thin wrapper file.
3. New feature (Money Flow) — new file + App.jsx wiring + sidebar preview.

## 11. Tab merge / nest performed

**Nest:** "Savings" hub (Goals + Trajectory + Safety Net) → Plan group 14 → 12.
The standalone `goals` / `trajectory` / `emergencyFund` routes remain registered.

## 12. Files created

- `src/2026-06-20-feature-savings-hub.jsx` — thin hub wrapper (Goals /
  Trajectory / Safety Net), copied from the 2026-06-16 Behaviour hub pattern.
- `src/2026-06-20-feature-money-flow.jsx` — `MoneyFlowPage` + `MoneyFlowPreview`
  + pure `moneyFlowReport` (reuses `monthBucketRows` / `monthBucketTotals`).
- `.claude/feature-review-log/2026-06-20-feature-review.md` — this log.

## 13. Files modified

- `src/App.jsx` — imports for the two new files; `savingsHub` + `moneyFlow`
  routes in `renderView`; Plan group's three savings items replaced by one
  `Savings` hub entry; `Money Flow` added to the Insights group; `<MoneyFlowPreview/>`
  rendered in the Dashboard left `<aside>`.

**Deliberate deviation (isolation):** the Money Flow Dashboard preview lives in
the left **sidebar**, not a main-column preview row. The main-column preview
rows live in `pages.jsx`, which currently holds another session's **uncommitted
in-progress work** (card-billing cycles + recurring-dedup + installment-split,
touching `context.jsx`, `pages.jsx`, `2026-06-18-feature-transaction-import.jsx`).
To honour "do not commit foreign work", this run kept **every change in new files
+ `App.jsx` only** and did not touch `pages.jsx` / `context.jsx` / `charts.jsx`.
The sidebar preview is still on the Dashboard and still deep-links into the tab.

## 14. Files now unused / safe to delete

None. The Savings hub keeps all three child routes registered.

## 15. Risks / unclear areas

- **Foreign uncommitted work, again left untouched.** `context.jsx`, `pages.jsx`,
  `2026-06-18-feature-transaction-import.jsx`, `2026-06-19-utils-card-billing.js`
  and the untracked `2026-06-19-utils-recurring-deduplication.js` carry another
  session's in-progress work. This run committed **only** `App.jsx` + the two new
  `2026-06-20-*` files + this log. `dist/*` build artifacts and `launch.json`
  were **not** staged.
- Money Flow's `moneyFlowReport` is exported from the same file as its
  components, which disables Vite Fast Refresh for that file (full reload on
  edit only — a dev-experience note, **no production impact**; the production
  build is clean). Left co-located to keep the footprint minimal and the calc
  unit-testable.
- Verification done on the user's own dev config (port 5176): build clean (1315
  modules); Money Flow "Overspent −R$ 31,80" matched the header Wallet exactly;
  Savings hub Goals/Trajectory/Safety Net sub-tabs all rendered; nav correctly
  showed "INSIGHTS · MONEY FLOW" and "PLAN · SAVINGS"; no console errors.
