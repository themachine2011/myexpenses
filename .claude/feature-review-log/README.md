# Feature Review — History Log

This folder stores one dated file per review run.

## File naming
`YYYY-MM-DD-feature-review.md` (one file per run)

## What each file contains
- **Run date**
- **Applied today** — the 3 features added (name + one-line summary)
- **Files created** — new files this run
- **Files modified** — existing files touched this run
- **Deferred** — the 2 features that were NOT applied (so you can apply them later)
- **Risks / unclear areas** — anything to watch

## Why this exists
- Lets you see what was added over time.
- Lets the routine read the latest entry before each run, so it does not
  re-suggest features that were already applied.
- Gives you a quick list of the deferred features to apply manually.

The routine writes these files automatically. You don't need to edit them.
