// Schema-versioned storage envelope + migration runner.
//
// Every persisted blob is wrapped as { __v: <integer>, data: <value> }.
// Legacy unwrapped values are treated as version 0 and walked forward
// through MIGRATIONS until they reach CURRENT_VERSIONS[key].
//
// To add a migration later: bump CURRENT_VERSIONS[key], then add an entry
// MIGRATIONS[key][previousVersion] = (oldData) => newData.

export const CURRENT_VERSIONS = {
  'aurum.tx.v2':               2,
  'aurum.rules.v1':            1,
  'aurum.recurring.v1':        1,
  'aurum.budgets.v1':          1,
  'aurum.goals.v1':            1,
  'aurum.debts.v1':            1,
  'aurum.reminders.v1':        1,
  'aurum.networth.history.v1': 1,
  'aurum.backup.settings.v1':  1,
};

// Each entry maps storageKey -> { fromVersion: upgradeFn }.
// upgradeFn receives the previous-version data and returns the next-version data.
// The runner walks from `fromVersion` upward step-by-step until it reaches
// CURRENT_VERSIONS[key]. Missing intermediate steps are treated as no-ops
// (shape already compatible — version label just gets bumped).
//
// These entries are coverage *scaffolding*: every currently-tracked key has a
// migration slot so future shape changes have a single, obvious place to add
// the upgrade logic. The current shapes are stable, so the v0 -> current
// migrations are identity functions (just bump the version label). When a
// real shape change is introduced, replace the relevant identity function
// with the actual transformation. The pattern for that is documented below.
export const MIGRATIONS = {
  // Example of a real (non-identity) migration to keep next to the stubs.
  // When the tx shape adds an `accountId` field, do:
  //
  //   'aurum.tx.v2': {
  //     1: (rows) => (Array.isArray(rows) ? rows : []).map((r) => ({
  //       ...r,
  //       accountId: r.accountId || 'default',
  //     })),
  //   },
  //
  // And bump CURRENT_VERSIONS['aurum.tx.v2'] to 3.

  'aurum.tx.v2':               { 0: (d) => d, 1: (d) => d },
  'aurum.rules.v1':            { 0: (d) => d },
  'aurum.recurring.v1':        { 0: (d) => d },
  'aurum.budgets.v1':          { 0: (d) => d },
  'aurum.goals.v1':            { 0: (d) => d },
  'aurum.debts.v1':            { 0: (d) => d },
  'aurum.reminders.v1':        { 0: (d) => d },
  'aurum.networth.history.v1': { 0: (d) => d },
  'aurum.backup.settings.v1':  { 0: (d) => d },
};

const isWrapped = (parsed) =>
  parsed && typeof parsed === 'object' && !Array.isArray(parsed)
  && Object.prototype.hasOwnProperty.call(parsed, '__v')
  && Object.prototype.hasOwnProperty.call(parsed, 'data');

export const runMigrations = (key, parsed) => {
  const target = CURRENT_VERSIONS[key] ?? 1;
  let version = 0;
  let data = parsed;
  if (isWrapped(parsed)) {
    version = Number(parsed.__v) || 0;
    data = parsed.data;
  }
  const steps = MIGRATIONS[key] || {};
  while (version < target) {
    const step = steps[version];
    if (typeof step !== 'function') {
      // No migration registered — assume the shape is already compatible
      // and just bump the version label.
      version = target;
      break;
    }
    data = step(data);
    version += 1;
  }
  return { data, version, migrated: version !== (isWrapped(parsed) ? (Number(parsed.__v) || 0) : 0) };
};

export const wrap = (key, data) => ({ __v: CURRENT_VERSIONS[key] ?? 1, data });
