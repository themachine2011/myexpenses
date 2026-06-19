# Feature Review — 2026-06-19

Run of `.claude/commands/feature-review.md`, but this run was **user-directed**:
the operator gave a specific, detailed feature spec (a Wallet Breakdown on the
Dashboard) rather than leaving the new feature to the routine's discretion. The
explicit user spec takes priority over the routine's generic "new tab + preview"
default, so this feature is intentionally **not** a new tab (see §4).

Branch: `main` (stayed on the current branch; commit + push performed, as both
the scheduled task and the user explicitly authorised it). Prior logs read first
(latest 2026-06-18 — Emergency Fund / Safety Net); nothing was re-suggested,
redone, or undone.

---

## 1. New feature applied (1)

**Wallet Breakdown** — click the header **Wallet** *label* (not the number) and a
card slides into the top of the Dashboard's left sidebar listing exactly the
purchases that make up the Wallet (= this month's Cash Flow) number. Click again
to hide; hidden by default; smooth framer-motion height/opacity transition.

- Lists the current-month, month-to-date **expense** rows (fixed + variable) that
  feed the Wallet — the *same* rows the total already sums, so the list can never
  disagree with the number.
- Each row: description, date, value, payment method (branded chip), instalment
  badge (e.g. `2/5`), `· bought` note for postponed-card purchases, and a `fixed`
  hint for locked rows.
- **Inline edit / delete** reusing the *existing* `EditTransactionDialog`,
  `EditBtn`, `TrashBtn`, `confirmDelete`, and context `editTransaction` /
  `deleteTransaction` — a small "ghost transactions" view, **not** a new
  transaction system. Locked/fixed rows keep edit/delete disabled (existing safe
  behaviour — never mutate locked rows).
- **Reconciliation footer** (`Income +X − Purchases −Y = Wallet`) explains why the
  list total isn't the Wallet number directly: income is part of the math but is
  intentionally **not** shown as a purchase row (per spec — no incomes listed).

### Why this, and the two candidates considered
The user explicitly requested it, so the usual "pick the single best of two
ideas" became "implement the requested feature as specified." The two design
candidates weighed were placement: **(a)** inline at the top of the existing left
sidebar vs **(b)** a `position:fixed` floating popup over the left gutter. Chose
**(a)** — robust, responsive, reuses the 300px sticky column, never overlaps
other content. (Recorded in the approved plan.)

## 2. Existing features improved
- The header **Wallet** label is now an interactive control (clickable +
  keyboard-accessible: Enter/Space, `role="button"`, `aria-pressed`). The Wallet
  *value* button (BRL↔USD currency flip) is untouched and still works.
- No other existing feature was modified — kept deliberately minimal.

## 3. Tab merge performed
None. The feature is a Dashboard interaction, not a tab, so no merge applied.
After the recent Compare/Behaviour nests, remaining overlaps are thin; forcing a
merge would add churn without a clear win.

## 4. Deviation from the routine's default (noted per instructions)
The routine's default is "new feature lives in its own new tab AND a Dashboard
preview card." The user's spec explicitly overrides this: *"feel like part of the
Dashboard, not like a separate tab"* and *"keep the feature focused only on the
Wallet breakdown and Dashboard interaction."* So there is **no new tab and no
nav entry** — the reveal *is* its Dashboard surface. This is a conscious,
user-approved deviation, not an omission.

## 5. Files created
- `.claude/feature-review-log/2026-06-19-feature-review.md` (this log)

(No new source file — the card lives next to the edit/delete components it
reuses, in `pages.jsx`, to avoid exporting a half-dozen internal helpers.)

## 6. Files modified (committed this run)
- `src/charts.jsx` — added `monthBucketRows` next to `monthBucketTotals` (same
  filter, returns the rows instead of just sums).
- `src/pages.jsx` — added the exported `WalletBreakdownCard` (+ `instalmentOf`
  helper) and `monthBucketRows` to the charts import. **Only these two hunks were
  committed** (see §8).
- `src/App.jsx` — `walletOpen` state + `toggleWalletBreakdown`, the clickable
  Wallet label, the `WalletBreakdownCard` import, and the card rendered in the
  dashboard `<aside>` via `<AnimatePresence>`.

## 7. Files now unused / safe to delete
None.

## 8. Risks / unclear areas
- **Pre-existing uncommitted work found in the tree — intentionally NOT
  committed.** The working tree already contained an unrelated, in-progress
  feature (recurring-deduplication + purchase-cycle / card-billing) touching
  `src/context.jsx`, several `src/pages.jsx` hunks, and a new untracked
  `src/2026-06-19-utils-recurring-deduplication.js`. Sibling git worktrees and a
  `clever-wright-uncommitted.patch` suggest another agent session is still working
  on it. That code mutates stored transactions on load and was not reviewed here,
  so it was deliberately **left unstaged/untracked**. This run committed **only**
  the Wallet Breakdown changes (staged via `git apply --cached` of an isolated
  patch so the mixed `pages.jsx` import hunk did not drag in the foreign change).
  The other session's work is untouched and still in the working tree.
- **Verification** was done on a separate dev instance (port 5180, isolated
  localStorage) because the user's own dev server held 5174. Confirmed: hidden by
  default; click opens / click closes; 27 purchase rows; `Income − Purchases =
  Wallet` matched the header exactly; deleting a R$ 105 purchase moved the header
  Wallet −584,20 → −479,20 instantly; locked Triumph-financing row's edit/delete
  correctly disabled; no income rows listed. Production build (`vite build`) of
  the full tree passed (1313 modules).
