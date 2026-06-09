# How to Use the Daily Feature Review

A short guide to the daily routine that reviews MyExpenses and adds new features.

## What it does
Every morning it:
1. Reviews the whole product (Dashboard, tabs, features, UI/UX, scalability).
2. Thinks up 5 new feature ideas.
3. Automatically builds the best 3 — each in its own new tab, with a small
   preview card on the Dashboard.
4. Writes a dated log of what it did.
5. Describes the 2 ideas it skipped so you can add them later by hand.

## The 3 pieces
- **The routine** — `.claude/commands/feature-review.md`
  The full set of rules the review follows.
- **The history log** — `.claude/feature-review-log/`
  One dated file per run (date, 3 applied, 2 deferred, files touched).
- **The schedule** — runs automatically every morning (see below).

## How it runs each day
- It runs **automatically every morning** as a scheduled task.
- Scheduled tasks only run while the Claude app is open. If the app was closed
  at the scheduled time, it runs the next time you open the app.
- You'll get a notification each time it finishes.

## Run it right now (manual)
You don't have to wait for the morning. Any time, just say:

> Run the daily feature review routine. Follow `.claude/commands/feature-review.md`.

## After each run — your 2-minute checklist
1. Read today's log in `.claude/feature-review-log/`.
2. Open the app and click the new tabs to make sure they work.
3. Skim the 2 deferred features — if you like one, ask me to build it.
4. If you're happy, commit the changes yourself. If not, you can discard them
   (the routine never commits, so nothing is locked in until you say so).

## Important safety notes
- The routine **never commits, pushes, or deletes** anything. New features land
  as un-committed changes in your working folder, so you can always review or
  undo them before keeping them.
- It only **adds** features (new tab + small Dashboard preview) and touches
  existing code as little as possible. It won't redesign your Dashboard or
  change your financial logic on its own.
- Because it applies 3 features unattended each morning, changes can pile up if
  you don't review them. Check the log regularly.

## Change or pause the schedule
Just tell me, for example:
- "Change the feature review to run at 7am."
- "Pause the daily feature review."
- "Only run the feature review on weekdays."

## Apply a deferred feature later
Open the latest log file, copy the feature description, and say:
> Build the deferred feature "<name>" from today's feature-review log.
