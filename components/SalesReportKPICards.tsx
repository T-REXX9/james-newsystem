import React from 'react';
import { DollarSign, ShoppingCart, TrendingUp, TrendingDown, Users, BarChart3 } from 'lucide-react';
import { SalesReportKPI } from '../types';

interface SalesReportKPICardsProps {
  kpis: SalesReportKPI | null;
  isLoading?: boolean;
}

const formatCurrency = (amount: number) => {
  return new Intl.NumberFormat('en-PH', {
    style: 'currency',
    currency: 'PHP',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
};

const formatCompactCurrency = (amount: number) => {
  if (amount >= 1000000) {
    return `₱${(amount / 1000000).toFixed(1)}M`;
  }
  if (amount >= 1000) {
    return `₱${(amount / 1000).toFixed(1)}K`;
  }
  return formatCurrency(amount);
};

const formatPercentage = (value: number) => {
  const sign = value >= 0 ? '+' : '';
  return `${sign}${value.toFixed(1)}%`;
};

interface KPICardProps {
  title: string;
  value: string;
  subtitle?: string;
  icon: React.ReactNode;
  trend?: number;
  trendLabel?: string;
  isLoading?: boolean;
}

const KPICard: React.FC<KPICardProps> = ({
  title,
  value,
  subtitle,
  icon,
  trend,
  trendLabel,
  isLoading,
}) => {
  const isPositiveTrend = trend !== undefined && trend >= 0;

  return (
    <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-5 hover:shadow-lg transition-shadow">
      <div className="flex items-start justify-between mb-3">
        <div className="p-2.5 rounded-lg bg-brand-blue/10 text-brand-blue">
          {icon}
        </div>
        {trend !== undefined && !isLoading && (
          <div
            className={`flex items-center gap-1 px-2 py-1 rounded-full text-xs font-bold ${
              isPositiveTrend
                ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400'
                : 'bg-rose-100 text-rose-700 dark:bg-rose-900/30 dark:text-rose-400'
            }`}
          >
            {isPositiveTrend ? (
              <TrendingUp className="w-3 h-3" />
            ) : (
              <TrendingDown className="w-3 h-3" />
            )}
            {formatPercentage(trend)}
          </div>
        )}
      </div>
      {isLoading ? (
        <div className="space-y-2">
          <div className="h-8 bg-slate-200 dark:bg-slate-700 rounded animate-pulse w-2/3" />
          <div className="h-4 bg-slate-200 dark:bg-slate-700 rounded animate-pulse w-1/2" />
        </div>
      ) : (
        <>
          <p className="text-2xl font-bold text-slate-800 dark:text-white mb-1">{value}</p>
          <p className="text-sm text-slate-500 dark:text-slate-400">{title}</p>
          {subtitle && (
            <p className="text-xs text-slate-400 dark:text-slate-500 mt-1">{subtitle}</p>
          )}
          {trendLabel && (
            <p className="text-xs text-slate-400 dark:text-slate-500 mt-1">{trendLabel}</p>
          )}
        </>
      )}
    </div>
  );
};

const SalesReportKPICards: React.FC<SalesReportKPICardsProps> = ({ kpis, isLoading }) => {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      <KPICard
        title="Total Revenue"
        value={kpis ? formatCompactCurrency(kpis.totalRevenue) : '₱0'}
        icon={<DollarSign className="w-5 h-5" />}
        trend={kpis?.revenueGrowthPct}
        trendLabel={kpis ? `vs. prev period: ${formatCurrency(kpis.prevTotalRevenue)}` : undefined}
        isLoading={isLoading}
      />
      <KPICard
        title="Total Transactions"
        value={kpis ? kpis.transactionCount.toLocaleString() : '0'}
        icon={<ShoppingCart className="w-5 h-5" />}
        trend={kpis?.transactionGrowthPct}
        trendLabel={kpis ? `vs. prev period: ${kpis.prevTransactionCount}` : undefined}
        isLoading={isLoading}
      />
      <KPICard
        title="Average Transaction"
        value={kpis ? formatCurrency(kpis.avgTransactionValue) : '₱0'}
        icon={<BarChart3 className="w-5 h-5" />}
        subtitle={kpis ? `prev: ${formatCurrency(kpis.prevAvgTransactionValue)}` : undefined}
        isLoading={isLoading}
      />
      <KPICard
        title="Unique Customers"
        value={kpis ? kpis.uniqueCustomers.toLocaleString() : '0'}
        icon={<Users className="w-5 h-5" />}
        subtitle={kpis ? `prev period: ${kpis.prevUniqueCustomers}` : undefined}
        isLoading={isLoading}
      />
    </div>
  );
};

export default SalesReportKPICards;
