import React from 'react';
import {
  PieChart,
  Pie,
  Cell,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from 'recharts';
import { SalesReportProductSummary } from '../types';

interface SalesReportProductChartProps {
  data: SalesReportProductSummary[];
  isLoading?: boolean;
}

const COLORS = ['#0F5298', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#06b6d4', '#84cc16', '#f97316', '#6366f1'];

const formatCurrency = (value: number) => {
  if (value >= 1000000) {
    return `₱${(value / 1000000).toFixed(1)}M`;
  }
  if (value >= 1000) {
    return `₱${(value / 1000).toFixed(0)}K`;
  }
  return `₱${value.toFixed(0)}`;
};

const CustomTooltip = ({ active, payload }: any) => {
  if (active && payload && payload.length) {
    const data = payload[0]?.payload;
    return (
      <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg shadow-lg p-3">
        <p className="text-sm font-medium text-slate-800 dark:text-white mb-2">{data?.name}</p>
        <div className="space-y-1">
          <p className="text-sm text-slate-600 dark:text-slate-300">
            Revenue: <span className="font-bold text-brand-blue">{formatCurrency(data?.value || 0)}</span>
          </p>
          <p className="text-sm text-slate-600 dark:text-slate-300">
            Quantity: <span className="font-bold">{data?.quantity?.toLocaleString() || 0}</span>
          </p>
          <p className="text-sm text-slate-600 dark:text-slate-300">
            Share: <span className="font-bold">{((data?.percent || 0) * 100).toFixed(1)}%</span>
          </p>
        </div>
      </div>
    );
  }
  return null;
};

const CustomLegend = ({ payload }: any) => {
  return (
    <div className="flex flex-wrap justify-center gap-2 mt-2">
      {payload?.slice(0, 6).map((entry: any, index: number) => (
        <div key={`legend-${index}`} className="flex items-center gap-1.5">
          <div
            className="w-3 h-3 rounded-full"
            style={{ backgroundColor: entry.color }}
          />
          <span className="text-xs text-slate-600 dark:text-slate-400 truncate max-w-[80px]">
            {entry.value}
          </span>
        </div>
      ))}
      {payload?.length > 6 && (
        <span className="text-xs text-slate-500">+{payload.length - 6} more</span>
      )}
    </div>
  );
};

const SalesReportProductChart: React.FC<SalesReportProductChartProps> = ({
  data,
  isLoading,
}) => {
  if (isLoading) {
    return (
      <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-6">
        <div className="h-6 bg-slate-200 dark:bg-slate-700 rounded animate-pulse w-40 mb-4" />
        <div className="h-64 bg-slate-100 dark:bg-slate-700/50 rounded animate-pulse" />
      </div>
    );
  }

  if (data.length === 0) {
    return (
      <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-6">
        <h3 className="text-lg font-semibold text-slate-800 dark:text-white mb-4">Revenue by Product</h3>
        <div className="h-64 flex items-center justify-center text-slate-500">
          No product data available
        </div>
      </div>
    );
  }

  const totalRevenue = data.reduce((sum, d) => sum + d.totalRevenue, 0);
  const chartData = data.slice(0, 10).map((d) => ({
    name: d.productName,
    value: d.totalRevenue,
    quantity: d.totalQuantity,
    percent: totalRevenue > 0 ? d.totalRevenue / totalRevenue : 0,
  }));

  return (
    <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-6">
      <h3 className="text-lg font-semibold text-slate-800 dark:text-white mb-4">Revenue by Product</h3>
      <div className="h-64">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={chartData}
              cx="50%"
              cy="45%"
              innerRadius={50}
              outerRadius={80}
              paddingAngle={2}
              dataKey="value"
            >
              {chartData.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
              ))}
            </Pie>
            <Tooltip content={<CustomTooltip />} />
            <Legend content={<CustomLegend />} />
          </PieChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};

export default SalesReportProductChart;
