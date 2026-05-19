import React, { useState } from 'react';
import { DashboardMonthYearSelector } from './2026-05-19-component-month-year-selector.jsx';
import { CategoryAverageChartSection } from './2026-05-19-component-category-average-chart.jsx';
import { DashboardCalculatorPanel } from './2026-05-18-component-dashboard-calculator.jsx';

export const DashboardCategoriesAverageSpendingFeature = () => {
  const [selectedMonthYear, setSelectedMonthYear] = useState(() => {
    const now = new Date();
    return { year: now.getFullYear(), month: now.getMonth() };
  });

  return (
    <div style={{ display: 'grid', gap: 16, width: '100%', minWidth: 0 }}>
      <DashboardMonthYearSelector
        value={selectedMonthYear}
        onChange={setSelectedMonthYear}
      />
      <CategoryAverageChartSection selectedMonthYear={selectedMonthYear} />
      <DashboardCalculatorPanel />
    </div>
  );
};
