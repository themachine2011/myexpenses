// Util (2026-06-18 review, run 2): Debt Strategy.
//
// Pure read-only math for turning user-managed debts into a payoff priority.
// It does not write debt data or change the stored shape; it only reads the
// existing { principal, paidSoFar, rate, payoffMonths } fields from context.

import { monthLabelAhead } from './2026-06-17-utils-networth-trajectory.js';

const cleanNumber = (value) => {
  const n = Number(value);
  return Number.isFinite(n) ? n : 0;
};

const paymentForMonths = (remaining, ratePct, months) => {
  const n = Math.max(0, Math.floor(cleanNumber(months)));
  if (remaining <= 0 || n <= 0) return 0;
  const monthlyRate = Math.max(0, cleanNumber(ratePct)) / 100;
  if (monthlyRate <= 0) return remaining / n;
  const denom = 1 - Math.pow(1 + monthlyRate, -n);
  return denom > 0 ? (remaining * monthlyRate) / denom : remaining / n;
};

const payoffLabel = (months, now) => {
  const n = Math.max(0, Math.floor(cleanNumber(months)));
  return n > 0 ? monthLabelAhead(n, now) : null;
};

const normalizeDebt = (debt, now, index = 0) => {
  const principal = Math.max(0, cleanNumber(debt?.principal));
  const paid = Math.min(principal, Math.max(0, cleanNumber(debt?.paidSoFar)));
  const remaining = Math.max(0, principal - paid);
  const ratePct = Math.max(0, cleanNumber(debt?.rate));
  const payoffMonths = Math.max(0, Math.floor(cleanNumber(debt?.payoffMonths)));
  const monthlyPayment = paymentForMonths(remaining, ratePct, payoffMonths);
  const monthlyInterest = remaining * (ratePct / 100);
  return {
    id: debt?.id || debt?.name || `debt-${index}`,
    name: debt?.name || 'Unnamed debt',
    principal,
    paid,
    remaining,
    ratePct,
    payoffMonths,
    monthlyPayment,
    monthlyInterest,
    payoffLabel: payoffLabel(payoffMonths, now),
    hasSchedule: payoffMonths > 0,
  };
};

const byAvalanche = (a, b) =>
  (b.ratePct - a.ratePct) ||
  (b.monthlyInterest - a.monthlyInterest) ||
  (b.remaining - a.remaining);

const bySnowball = (a, b) =>
  (a.remaining - b.remaining) ||
  (b.ratePct - a.ratePct);

export const debtStrategyReport = ({ debts = [], now = new Date() } = {}) => {
  const rows = (debts || [])
    .map((debt, index) => normalizeDebt(debt, now, index))
    .filter((debt) => debt.remaining > 0);

  const totalRemaining = rows.reduce((sum, debt) => sum + debt.remaining, 0);
  const totalPrincipal = rows.reduce((sum, debt) => sum + debt.principal, 0);
  const totalPaid = rows.reduce((sum, debt) => sum + debt.paid, 0);
  const monthlyInterest = rows.reduce((sum, debt) => sum + debt.monthlyInterest, 0);
  const monthlyPayment = rows.reduce((sum, debt) => sum + debt.monthlyPayment, 0);
  const weightedRate = totalRemaining > 0
    ? rows.reduce((sum, debt) => sum + debt.ratePct * debt.remaining, 0) / totalRemaining
    : 0;

  const avalanche = [...rows].sort(byAvalanche);
  const snowball = [...rows].sort(bySnowball);
  const avalancheDebt = avalanche[0] || null;
  const snowballDebt = snowball[0] || null;
  const hasInterest = rows.some((debt) => debt.ratePct > 0);
  const priorityDebt = hasInterest ? avalancheDebt : snowballDebt;
  const strategy = hasInterest ? 'avalanche' : 'snowball';
  const scheduledMonths = rows.filter((debt) => debt.payoffMonths > 0).map((debt) => debt.payoffMonths);
  const debtFreeMonths = scheduledMonths.length === rows.length && scheduledMonths.length > 0
    ? Math.max(...scheduledMonths)
    : null;

  const progressPct = totalPrincipal > 0 ? Math.min(100, Math.max(0, (totalPaid / totalPrincipal) * 100)) : 0;
  let band = { label: 'No active debt', tone: 'positive' };
  if (rows.length > 0) {
    if (weightedRate >= 3 || monthlyInterest >= Math.max(1, monthlyPayment * 0.25)) {
      band = { label: 'Interest heavy', tone: 'negative' };
    } else if (rows.some((debt) => !debt.hasSchedule)) {
      band = { label: 'Needs schedule', tone: 'accent' };
    } else {
      band = { label: 'Plan active', tone: 'positive' };
    }
  }

  return {
    rows,
    avalanche,
    snowball,
    avalancheDebt,
    snowballDebt,
    priorityDebt,
    strategy,
    band,
    totalRemaining,
    totalPrincipal,
    totalPaid,
    progressPct,
    monthlyInterest,
    monthlyPayment,
    weightedRate,
    debtFreeMonths,
    debtFreeLabel: debtFreeMonths == null ? null : monthLabelAhead(debtFreeMonths, now),
    activeCount: rows.length,
    hasDebt: rows.length > 0,
  };
};

export default debtStrategyReport;
