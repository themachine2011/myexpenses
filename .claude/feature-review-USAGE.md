# How to Use the Daily Feature Review

A short guide to the daily routine that reviews MyExpenses, improves it, and adds
one new feature.

## What it does
Every morning it:
1. Reviews the whole product (Dashboard, tabs, features, UI/UX, scalability).
2. Improves existing features, fixes any logic/calculation mistakes, and tidies
   navigation (it can merge two related tabs into one, or nest connected tabs
   under a parent).
3. Thinks up 2 new feature ideas and automatically builds the best one — in its
   own new tab, with a small preview card on the Dashboard. (If nothing useful is
   worth adding, it skips the new feature that day and just improves and
   simplifies.)
4. Writes a dated log of what it did.
5. Describes the 1 idea it skipped, so you can add it later by hand.

## The 3 pieces
- **The routine** — `.claude/commands/feature-review.md`
  The full set of rules the review follows.
- **The history log** — `.claude/feature-review-log/`
  One dated file per run (date, the feature applied, the improvements and merges
  made, files touched, the idea deferred).
- **The schedule** — runs automatically every morning (see below).

## How it runs each day
- It runs **automatically every morning** as a scheduled task.
- Scheduled tasks only run while the Claude app is open. If the app was closed at
  the scheduled time, it runs the next time you open the app.
- You'll get a notification each time it finishes.

## Run it right now (manual)
You don't have to wait for the morning. Any time, just say:

> Run the daily feature review routine. Follow `.claude/commands/feature-review.md`.

## After each run — your 2-minute checklist
1. Read today's log in `.claude/feature-review-log/`.
2. Open the app and click around — check the new tab works, and that any
   improved or merged tabs still behave correctly.
3. Skim the 1 deferred idea — if you like it, ask me to build it.
4. If you're happy, commit the changes yourself. If not, discard them (the
   routine never commits, so nothing is locked in until you say so).

## Important safety notes
- The routine **never commits, pushes, or deletes files**, and it **never
  deletes or rewrites your saved data** (new data is only ever added). All
  changes land as un-committed edits in your working folder, so you can always
  review or undo them before keeping them.
- It makes **minimal, targeted edits**: one new feature (new tab + small
  Dashboard preview), plus clear improvements, logic fixes, and at most one
  sensible tab merge or nest. It won't do sweeping redesigns or unrelated
  restyling on its own, and any change to calculations is re-checked and written
  into the log.
- When a merge or nest makes an old tab file unused, the routine switches off
  that tab but **leaves the file in place** and flags it in the log as "safe to
  delete after review" — so you decide whether to remove it.
- Because it changes things unattended each morning, edits can pile up if you
  don't review them. Check the log and click through the app regularly.

## Change or pause the schedule
Just tell me, for example:
- "Change the feature review to run at 7am."
- "Pause the daily feature review."
- "Only run the feature review on weekdays."

## Apply a deferred idea later
Open the latest log file, copy the idea's description, and say:
> Build the deferred feature "<name>" from today's feature-review log.
