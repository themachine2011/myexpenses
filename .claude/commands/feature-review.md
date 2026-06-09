# Daily Feature Review Routine — MyExpenses

## 1. Purpose
Review the whole project as a product, find useful new features, and
automatically add the best 3. Each run should leave the product slightly
better without breaking anything that already works.

## 2. Before you start
- Working folder: `C:\Users\laurencio.pereira\OneDrive - Cyncly\Área de Trabalho\myexpenses`
- Read the full routine file first and follow it:
  `.claude/commands/feature-review.md`
- If that file is missing: STOP and report it. Do not continue from memory.

## 3. Hard limits (never do these)
- Do not commit or push.
- Do not create, switch, or delete branches — stay on the current branch.
- Do not rename, move, delete, or overwrite existing files.
- Do not change the Dashboard, tabs, components, styling, logic, or data,
  EXCEPT where it is required to wire in one of the new features.

## 4. What you ARE allowed to do
- Create the new files a new feature needs.
- Make the smallest possible edits to existing files to connect a new
  feature (e.g. register its tab, add its Dashboard preview card).
- Keep the impact on existing components minimal.

## 5. Review the whole product
Analyze every part:
- Dashboard
- All existing tabs
- All existing features
- UI/UX quality
- User flow
- Scalability
- Reusable components
- Features that are too personalized to one user
- Features that could be made generic for a public product
- Features that could be simplified
- Features that should move off the Dashboard into their own tab
- Missing features or useful new tabs

## 6. Where new features must live
- Every new feature gets its own dedicated tab.
- Every new feature also shows a small preview on the Dashboard that links
  into that tab.

## 7. Required report (produce this every run)
1. Executive summary
2. What changed or looks important since the last review (if detectable)
3. Current system overview
4. Dashboard review
5. All tabs review
6. UI/UX improvement opportunities
7. Scalability improvement opportunities
8. Simplification opportunities
9. Features that could move off the Dashboard into a dedicated tab
10. At least 5 feature/new-tab suggestions

For EACH of the 5 suggestions, include:
- Feature name
- What it does
- Purpose
- Logic
- Main components
- Where it should live
- Dashboard preview + own tab (confirm both)
- UI/UX benefit
- Scalability benefit
- Complexity: low / medium / high
- Risk level

Then also explain:
- Why the 3 chosen features are the strongest
- Each feature's logic and how it relates to other tabs
- The best implementation order
- Anything that should NOT be built yet
- Any risks or unclear areas

## 8. Auto-apply policy (the one exception to "ask first")
- Think through 5 features, then automatically apply the best 3 — no approval
  needed for these 3.
- This override applies ONLY to additive new features that: live in their own
  new tab, add a small Dashboard preview, and touch existing code as little as
  possible. All other changes still require my approval.
- Describe the 2 features you did NOT apply clearly at the end, so I can apply
  them manually later.

## 9. Final validation before finishing
Re-check: calculations, logic flow, styling, UI/UX, and any math the new
features introduced.

## 10. Keep a history log (every run)
- Before suggesting features, read the most recent file in
  `.claude/feature-review-log/` so you don't re-suggest something already
  applied.
- At the end of every run, create one dated log file:
  `.claude/feature-review-log/YYYY-MM-DD-feature-review.md`
- That log file must contain:
  - Run date
  - The 3 features applied today (name + one-line summary each)
  - The files created and the files modified
  - The 2 features that were NOT applied (name + one-line summary each)
  - Any risks or unclear areas found

## 11. Done only when
- The whole system has been reviewed, AND
- The 3 new features have been applied automatically, AND
- The dated history log file for today has been written.
End with a final report listing: what was reviewed, what was suggested, the 3
applied, the 2 not applied, files created, files modified, and any risks found.
