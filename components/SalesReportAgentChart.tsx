import React from 'react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from 'recharts';
import { SalesReportAgentSummary } from '../types';

interface SalesReportAgentChartProps {
  data: SalesReportAgentSummary[];
  isLoading?: boolean;
}

const COLORS = ['#0F5298', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#06b6d4', '#84cc16'];

const formatCurrency = (value: number) => {
  if (value >= 1000000) {
    return `₱${(value / 1000000).toFixed(1)}M`;
  }
  if (value >= 1000) {
    return `₱${(value / 1000).toFixed(0)}K`;
  }
  return `₱${value}`;
};

const CustomTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    const data = payload[0]?.payload;
    return (
      <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg shadow-lg p-3">
        <p className="text-sm font-medium text-slate-800 dark:text-white mb-2">{label}</p>
        <div className="space-y-1">
          <p className="text-sm text-slate-600 dark:text-slate-300">
            Revenue: <span className="font-bold text-brand-blue">{formatCurrency(data?.totalRevenue || 0)}</span>
          </p>
          <p className="text-sm text-slate-600 dark:text-slate-300">
            Transactions: <span className="font-bold">{data?.transactionCount || 0}</span>
          </p>
          <p className="text-sm text-slate-600 dark:text-slate-300">
            Customers: <span className="font-bold">{data?.uniqueCustomers || 0}</span>
          </p>
        </div>
      </div>
    );
  }
  return null;
};

const SalesReportAgentChart: React.FC<SalesReportAgentChartProps> = ({
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
        <h3 className="text-lg font-semibold text-slate-800 dark:text-white mb-4">Performance by Agent</h3>
        <div className="h-64 flex items-center justify-center text-slate-500">
          No agent data available
        </div>
      </div>
    );
  }

  const chartData = data.slice(0, 10).map((d) => ({
    name: d.agentName.split(' ')[0],
    fullName: d.agentName,
    totalRevenue: d.totalRevenue,
    transactionCount: d.transactionCount,
    uniqueCustomers: d.uniqueCustomers,
  }));

  return (
    <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-6">
      <h3 className="text-lg font-semibold text-slate-800 dark:text-white mb-4">Performance by Agent</h3>
      <div className="h-64">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={chartData} layout="vertical" margin={{ top: 5, right: 30, left: 40, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" className="dark:stroke-slate-700" horizontal={true} vertical={false} />
            <XAxis
              type="number"
              tickFormatter={formatCurrency}
              tick={{ fill: '#64748b', fontSize: 12 }}
              axisLine={false}
              tickLine={false}
            />
            <YAxis
              type="category"
              dataKey="name"
              tick={{ fill: '#64748b', fontSize: 12 }}
              axisLine={false}
              tickLine={false}
              width={60}
            />
            <Tooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(0,0,0,0.05)' }} />
            <Bar dataKey="totalRevenue" radius={[0, 4, 4, 0]} maxBarSize={30}>
              {chartData.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};

export default SalesReportAgentChart;
