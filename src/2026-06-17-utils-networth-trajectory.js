// Util (2026-06-17 review): Net-Worth Trajectory — pure projection math.
//
// The Net Worth tab only shows TODAY (assets + savings − managed debt) plus a
// history of past snapshots. Nothing projects the wealth curve FORWARD. This
// util answers "if I keep saving at my recent pace, where does my net worth go
// over the next year — and when do I cross the next round-number milestone?"
//
// Honest by design (CLAUDE.md rules #4 / #5):
//   - It invents NO new spending model. The growth rate is simply the average
//     of the user's REAL monthly cash flow (income − non-savings expense) over
//     COMPLETE prior months — the same `cashflow` field the Dashboard already
//     uses. The current, in-progress month is excluded so a half-finished month
//     never drags the average down.
//   - "Savings" transfers are already excluded from both income and expense by
//     `periodTotals`, so cash flow IS the amount that grows net worth.
//   - A straight-line projection, clearly labelled as an estimate — not a
//     guarantee of future money.

// Median resists one freak month (a big one-off purchase or windfall) better
// than the mean, so we surface both and let the page show the spread.
const median = (xs) => {
  if (!xs.length) return 0;
  const s = [...xs].sort((a, b) => a - b);
  const m = Math.floor(s.length / 2);
  return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2;
};

// A "nice" milestone step sized to the current net worth, so milestones are
// meaningful at every scale (R$10k steps for small balances, R$250k for large).
export const milestoneStep = (equity) => {
  const a = Math.abs(equity);
  if (a < 50_000) return 10_000;
  if (a < 250_000) return 25_000;
  if (a < 1_000_000) return 100_000;
  if (a < 5_000_000) return 250_000;
  return 1_000_000;
};

// Month label N months ahead of `now`, e.g. "Aug 2026". Localised lightly; the
// page passes the app's date — Date is only read here, never written.
export const monthLabelAhead = (n, now = new Date()) => {
  const d = new Date(now.getFullYear(), now.getMonth() + n, 1);
  return d.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
};

// Build the projection.
//   equity        — current net worth (use netWorthSnapshot().equity)
//   monthlyNets   — cash flow of COMPLETE prior months, oldest→newest (numbers)
//   horizonMonths — how far to project (default 12)
//   useMedian     — base the rate on the median month instead of the mean
export const trajectoryReport = ({ equity = 0, monthlyNets = [], horizonMonths = 12, useMedian = false, now = new Date() } = {}) => {
  const nets = (monthlyNets || []).map((x) => Number(x) || 0);
  const n = nets.length;
  const mean = n ? nets.reduce((s, x) => s + x, 0) / n : 0;
  const med = median(nets);
  const rate = useMedian ? med : mean;

  const points = [{ month: 0, value: equity, label: 'Now' }];
  for (let i = 1; i <= horizonMonths; i++) {
    points.push({ month: i, value: equity + rate * i, label: monthLabelAhead(i, now) });
  }
  const projected = equity + rate * horizonMonths;

  // Next round-number milestones above the current equity, and when (if ever)
  // the current pace crosses them. Only meaningful while net worth is growing.
  const milestones = [];
  if (rate > 0) {
    const step = milestoneStep(equity);
    let target = Math.floor(equity / step) * step + step;
    // Show up to 4 upcoming milestones, capped at a sane 10-year horizon so we
    // never promise a crossing 40 years out.
    for (let k = 0; k < 4; k++) {
      const monthsAway = Math.ceil((target - equity) / rate);
      if (monthsAway > 120) break;
      milestones.push({ value: target, monthsAway, label: monthLabelAhead(monthsAway, now) });
      target += step;
    }
  }

  return {
    equity,
    rate,
    meanMonthlyNet: mean,
    medianMonthlyNet: med,
    monthsOfData: n,
    horizonMonths,
    points,
    projected,
    growing: rate > 0,
    flat: rate === 0,
    shrinking: rate < 0,
    milestones,
    // Months of runway before net worth would hit zero, if it's shrinking and
    // currently positive. Honest "how long until trouble" read.
    monthsToZero: rate < 0 && equity > 0 ? Math.ceil(equity / -rate) : null,
  };
};

export default trajectoryReport;
