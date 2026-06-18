// Util (2026-06-18 review): Emergency Fund / Safety Net — pure runway math.
//
// The Financial Health tab already scores an "emergency runway" sub-score, but
// nowhere in the app turns it into a full, actionable view: "how many months of
// expenses does my savings cover, what's the gap to a 3/6/12-month cushion, and
// when do I get there at my recent saving pace?" This util answers exactly that.
//
// Honest by design (CLAUDE.md rules #4 / #5):
//   - It invents NO new numbers. `monthsCovered` uses the SAME trailing-average
//     monthly expense the Health "runway" sub-score uses, so the two surfaces can
//     never disagree. The buffer is the user's real `savingsTotal`.
//   - The time-to-fund uses the SAME `monthlySavingsPace` the Goals tab uses, so
//     the ETA logic matches the rest of the app.
//   - Straight-line, clearly labelled an estimate — not a promise of future money.

import { clamp } from './2026-06-09-utils-analytics.js';
import { monthLabelAhead } from './2026-06-17-utils-networth-trajectory.js';

// Status band for the current cushion, in months of expenses covered. The 3 and
// 6 month marks are the standard personal-finance safety thresholds.
export const safetyBand = (monthsCovered) => {
  if (monthsCovered >= 6) return { label: 'Fully funded', tone: 'positive' };
  if (monthsCovered >= 3) return { label: 'Building', tone: 'accent' };
  if (monthsCovered >= 1) return { label: 'Thin cushion', tone: 'negative' };
  return { label: 'At risk', tone: 'negative' };
};

// Build the safety-net report.
//   savingsTotal      — current set-aside balance (the buffer)
//   avgMonthlyExpense — trailing mean real monthly expense (runway denominator)
//   monthlyPace       — recent monthly saving pace (can be ≤ 0)
//   targetMonths      — desired cushion in months of expenses (default 6)
export const emergencyFundReport = ({
  savingsTotal = 0,
  avgMonthlyExpense = 0,
  monthlyPace = 0,
  targetMonths = 6,
  now = new Date(),
} = {}) => {
  const buffer = Number(savingsTotal) || 0;
  const burn = Math.max(0, Number(avgMonthlyExpense) || 0);
  const pace = Number(monthlyPace) || 0;
  const months = Math.max(1, Number(targetMonths) || 6);

  // Months of expenses the buffer covers. With no recorded spending we can't
  // express a runway in months, so report null rather than a misleading ∞.
  const monthsCovered = burn > 0 ? buffer / burn : null;

  const targetAmount = burn * months;
  const gap = Math.max(0, targetAmount - buffer);
  const pct = targetAmount > 0 ? clamp((buffer / targetAmount) * 100, 0, 100) : 0;
  const funded = targetAmount > 0 && buffer >= targetAmount;

  // Time to close the gap at the recent saving pace (same rule as Goals).
  let monthsToFund = null;
  let etaLabel = null;
  if (gap <= 0) {
    monthsToFund = 0;
    etaLabel = 'Funded';
  } else if (pace > 0) {
    monthsToFund = Math.ceil(gap / pace);
    etaLabel = monthLabelAhead(monthsToFund, now);
  }

  const band = safetyBand(monthsCovered == null ? (buffer > 0 ? 6 : 0) : monthsCovered);

  return {
    buffer,
    avgMonthlyExpense: burn,
    monthlyPace: pace,
    targetMonths: months,
    monthsCovered,      // null when there's no spending history yet
    targetAmount,
    gap,
    pct,
    funded,
    monthsToFund,       // null when there's a gap but pace ≤ 0
    etaLabel,
    band,
    hasExpenseData: burn > 0,
  };
};

export default emergencyFundReport;
