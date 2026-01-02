import React from 'react';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';
import { SalesReportDailySummary } from '../types';

interface SalesReportTrendChartProps {
  data: SalesReportDailySummary[];
  isLoading?: boolean;
}

const formatCurrency = (value: number) => {
  if (value >= 1000000) {
    return `₱${(value / 1000000).toFixed(1)}M`;
  }
  if (value >= 1000) {
    return `₱${(value / 1000).toFixed(0)}K`;
  }
  return `₱${value}`;
};

const formatDate = (dateStr: string) => {
  const date = new Date(dateStr);
  return date.toLocaleDateString('en-PH', { month: 'short', day: 'numeric' });
};

const CustomTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg shadow-lg p-3">
        <p className="text-sm font-medium text-slate-800 dark:text-white mb-2">
          {formatDate(label)}
        </p>
        <div className="space-y-1">
          <p className="text-sm text-slate-600 dark:text-slate-300">
            Revenue: <span className="font-bold text-brand-blue">{formatCurrency(payload[0]?.value || 0)}</span>
          </p>
          {payload[1] && (
            <p className="text-sm text-slate-600 dark:text-slate-300">
              Transactions: <span className="font-bold">{payload[1]?.value || 0}</span>
            </p>
          )}
        </div>
      </div>
    );
  }
  return null;
};

const SalesReportTrendChart: React.FC<SalesReportTrendChartProps> = ({
  data,
  isLoading,
}) => {
  if (isLoading) {
    return (
      <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-6">
        <div className="h-6 bg-slate-200 dark:bg-slate-700 rounded animate-pulse w-32 mb-4" />
        <div className="h-64 bg-slate-100 dark:bg-slate-700/50 rounded animate-pulse" />
      </div>
    );
  }

  if (data.length === 0) {
    return (
      <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-6">
        <h3 className="text-lg font-semibold text-slate-800 dark:text-white mb-4">Sales Trend</h3>
        <div className="h-64 flex items-center justify-center text-slate-500">
          No data available for the selected period
        </div>
      </div>
    );
  }

  const chartData = data.map((d) => ({
    date: d.date,
    revenue: d.totalRevenue,
    transactions: d.transactionCount,
  }));

  return (
    <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-6">
      <h3 className="text-lg font-semibold text-slate-800 dark:text-white mb-4">Sales Trend</h3>
      <div className="h-64">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={chartData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
            <defs>
              <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#0F5298" stopOpacity={0.3} />
                <stop offset="95%" stopColor="#0F5298" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" className="dark:stroke-slate-700" />
            <XAxis
              dataKey="date"
              tickFormatter={formatDate}
              tick={{ fill: '#64748b', fontSize: 12 }}
              axisLine={{ stroke: '#e2e8f0' }}
              tickLine={false}
            />
            <YAxis
              tickFormatter={formatCurrency}
              tick={{ fill: '#64748b', fontSize: 12 }}
              axisLine={false}
              tickLine={false}
              width={60}
            />
            <Tooltip content={<CustomTooltip />} />
            <Area
              type="monotone"
              dataKey="revenue"
              stroke="#0F5298"
              strokeWidth={2}
              fillOpacity={1}
              fill="url(#colorRevenue)"
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};

export default SalesReportTrendChart;
