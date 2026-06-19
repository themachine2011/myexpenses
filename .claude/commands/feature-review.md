# Daily Feature Review Routine — MyExpenses

## 1. Purpose
Each run, improve the product by:
- improving existing features (including fixing logic or calculation mistakes)
- merging related tabs into one when it reduces clutter
- nesting connected tabs inside a parent tab when they share the same logic
- better navigation and a cleaner Dashboard structure
- better UI/UX and smoother interactions
- removing unnecessary complexity
- adding one useful new feature (the best of two ideas)

## 2. Before you start
- Working folder: `C:\Users\laurencio.pereira\OneDrive - Cyncly\Área de Trabalho\myexpenses`
- This routine is the full set of rules — follow it in order, not from memory.
- Before suggesting or changing anything, read the most recent file in
  `.claude/feature-review-log/` so you do not re-suggest, redo, or undo
  something already applied (a feature, an improvement, or a tab merge/nest).

## 3. Hard limits (never do these)
- Do not commit or push.
- Do not create, switch, or delete branches — stay on the current branch.
- Do not rename or move existing files.
- Do not delete existing files. If a merge or nest leaves a file unused, only
  remove its route/navigation entry so it no longer shows as a tab, leave the
  file on disk, and list it in the log under "now unused — safe to delete after
  review".
- Do not delete or rewrite saved data or its storage shape. If a change needs
  new data, add it as new fields/keys and keep old data readable.
- Keep every edit minimal and deliberate — only what the review justifies. No
  unrelated styling or cosmetic churn, and no large speculative rewrites.

## 4. What you ARE allowed to do
- Edit existing files to improve a feature, fix a logic/calculation mistake, or
  merge/nest tabs.
- Create the files the new feature needs (its own tab and components).
- Make the small edits needed to wire things in: register the new tab, add its
  Dashboard preview card, and update navigation for any merge or nest.
- Keep the footprint on unrelated components as small as possible.

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
- Tabs that overlap and could be merged, or that could be nested under a parent
- Missing features or useful new tabs

## 6. Constraints
- Review the current implementation before deciding anything.
- Only edit an existing file when the review points to a clear improvement, a
  genuine logic/calculation fix, or a sensible tab merge/nest — not just for the
  sake of change.
- Prefer changes that improve financial visibility, planning, or usability.
- Explain the risks and the maintenance cost of each change.

## 7. Where the new feature must live
- The new feature gets its own dedicated tab.
- The new feature also shows a small preview card on the Dashboard that links
  into that tab.

## 8. Required report (produce this every run)
1. Executive summary
2. What changed or looks important since the last review (from the most recent
   log, if detectable)
3. Current system overview
4. Dashboard review
5. All tabs review
6. UI/UX improvement opportunities
7. Scalability improvement opportunities
8. Simplification opportunities (including tabs to merge or nest)
9. Existing features to improve, and any logic/calculation mistakes found
10. Features that could move off the Dashboard into a dedicated tab
11. Exactly 2 candidate ideas for the new feature

For EACH of the 2 candidate ideas, include:
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
- Why the chosen idea is the stronger of the two
- How the new feature's logic relates to the existing tabs
- The order to apply this run's changes (improvements, then any merge/nest, then
  the new feature)
- Anything that should NOT be built or changed yet
- Any risks or unclear areas

## 9. Auto-apply policy (the one exception to "ask first")
- Think through 2 candidate ideas, then automatically apply the single best
  one — no approval needed.
- Also apply automatically, and only within the Hard limits above:
  - clear improvements to existing features,
  - genuine logic/calculation fixes,
  - one sensible tab merge or nest, if the review found one.
- Default is to apply exactly one new feature. If the review finds nothing
  genuinely useful to add this run, it is fine to skip the new feature and spend
  the run improving and simplifying instead — say so in the report and log.
- Do NOT auto-apply anything that would break a Hard limit (deleting files or
  data, rewriting stored data, renaming/moving files, large risky rewrites).
  Describe those clearly at the end so I can decide on them later.

## 10. Final validation before finishing
Re-check everything you touched: calculations, logic flow, navigation, styling,
and UI/UX. Confirm the improvements and any merge/nest did not break an existing
feature and that no functionality was lost.

## 11. Keep a history log (every run)
- Before suggesting anything, read the most recent file in
  `.claude/feature-review-log/` so you don't repeat or undo earlier work.
- At the end of every run, create one dated log file:
  `.claude/feature-review-log/YYYY-MM-DD-feature-review.md`
- That log file must contain:
  - Run date
  - The 1 new feature applied (name + one-line summary), or a note that none was
    added and why
  - Existing features improved, and any logic/calculation fixes made
  - Any tab merge or nest performed
  - The files created and the files modified
  - Files now unused / safe to delete after review
  - The candidate idea that was NOT applied (name + one-line summary)
  - Any risks or unclear areas found

## 12. Done only when
- The whole system has been reviewed, AND
- This run's changes have been applied (the improvements, any merge/nest, and the
  one new feature — or a clear note that the new feature was skipped and why),
  AND
- The dated history log file for today has been written.

End with a final report listing: what was reviewed, the existing features
improved or merged/nested, the new feature applied (or skipped and why), files
created, files modified, files now unused, and any risks found.
