import React, { useState, useMemo } from 'react';
import { BarChart3, TrendingUp, Users, Package, RefreshCw, Loader2 } from 'lucide-react';
import { SalesReportFilters } from '../types';
import { useSalesReport } from '../hooks/useSalesReport';
import { useSalesReportExport } from '../hooks/useSalesReportExport';
import SalesReportFilter from './SalesReportFilter';
import SalesReportKPICards from './SalesReportKPICards';
import SalesReportTrendChart from './SalesReportTrendChart';
import SalesReportAgentChart from './SalesReportAgentChart';
import SalesReportProductChart from './SalesReportProductChart';
import SalesReportTable from './SalesReportTable';
import SalesReportExportMenu from './SalesReportExportMenu';

type ChartTab = 'trend' | 'agent' | 'product';

const getDefaultFilters = (): SalesReportFilters => {
  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  return {
    dateFrom: monthStart.toISOString().split('T')[0],
    dateTo: now.toISOString().split('T')[0],
    viewType: 'company',
  };
};

interface SalesReportViewProps {
  currentUserId?: string;
}

const SalesReportView: React.FC<SalesReportViewProps> = ({ currentUserId }) => {
  const [filters, setFilters] = useState<SalesReportFilters>(getDefaultFilters());
  const [activeChartTab, setActiveChartTab] = useState<ChartTab>('trend');

  const filtersWithAgent = useMemo(() => {
    if (filters.viewType === 'agent' && currentUserId && !filters.agentId) {
      return { ...filters, agentId: currentUserId };
    }
    return filters;
  }, [filters, currentUserId]);

  const {
    data,
    kpis,
    dailySummary,
    agentSummary,
    productSummary,
    isLoading,
    error,
    refetch,
  } = useSalesReport(filtersWithAgent);

  const { exportPDF, exportExcel, isExporting } = useSalesReportExport({
    filters: filtersWithAgent,
    transactions: data,
    kpis,
    agentSummary,
    productSummary,
  });

  const chartTabs = [
    { id: 'trend' as ChartTab, label: 'Trend', icon: TrendingUp },
    { id: 'agent' as ChartTab, label: 'By Agent', icon: Users },
    { id: 'product' as ChartTab, label: 'By Product', icon: Package },
  ];

  return (
    <div className="h-full flex flex-col bg-slate-50 dark:bg-slate-950 print:bg-white">
      <div className="flex-shrink-0 border-b border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 print:border-0">
        <div className="px-6 py-4">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-brand-blue/10">
                <BarChart3 className="w-6 h-6 text-brand-blue" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-slate-800 dark:text-white">Sales Report</h1>
                <p className="text-sm text-slate-500">
                  {filters.dateFrom} to {filters.dateTo}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-3 print:hidden">
              <button
                onClick={refetch}
                disabled={isLoading}
                className="flex items-center gap-2 px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg text-sm font-medium hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors disabled:opacity-50"
              >
                <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
                Refresh
              </button>
              <SalesReportExportMenu
                onExportPDF={exportPDF}
                onExportExcel={exportExcel}
                isExporting={isExporting}
              />
            </div>
          </div>
          <SalesReportFilter filters={filters} onFiltersChange={setFilters} />
        </div>
      </div>

      <div className="flex-1 overflow-auto p-6 space-y-6 print:p-0 print:space-y-4">
        {error && (
          <div className="bg-rose-50 dark:bg-rose-900/20 border border-rose-200 dark:border-rose-800 rounded-lg p-4 print:hidden">
            <p className="text-rose-700 dark:text-rose-400 text-sm">
              Error loading data: {error.message}. Please try refreshing.
            </p>
          </div>
        )}

        <SalesReportKPICards kpis={kpis} isLoading={isLoading} />

        <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 overflow-hidden print:border-0">
          <div className="flex items-center gap-1 p-2 border-b border-slate-200 dark:border-slate-700 print:hidden">
            {chartTabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveChartTab(tab.id)}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                  activeChartTab === tab.id
                    ? 'bg-brand-blue text-white'
                    : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700'
                }`}
              >
                <tab.icon className="w-4 h-4" />
                {tab.label}
              </button>
            ))}
          </div>
          <div className="p-0">
            {activeChartTab === 'trend' && (
              <SalesReportTrendChart data={dailySummary} isLoading={isLoading} />
            )}
            {activeChartTab === 'agent' && (
              <SalesReportAgentChart data={agentSummary} isLoading={isLoading} />
            )}
            {activeChartTab === 'product' && (
              <SalesReportProductChart data={productSummary} isLoading={isLoading} />
            )}
          </div>
        </div>

        <div className="print:break-before-page">
          <SalesReportTable data={data} isLoading={isLoading} />
        </div>

        {isLoading && (
          <div className="fixed inset-0 bg-black/20 dark:bg-black/40 flex items-center justify-center z-50 print:hidden">
            <div className="bg-white dark:bg-slate-800 rounded-xl p-6 shadow-xl flex items-center gap-4">
              <Loader2 className="w-6 h-6 text-brand-blue animate-spin" />
              <span className="text-slate-800 dark:text-white font-medium">Loading report data...</span>
            </div>
          </div>
        )}
      </div>

      <style>{`
        @media print {
          body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
          .print\\:hidden { display: none !important; }
          .print\\:border-0 { border: none !important; }
          .print\\:bg-white { background: white !important; }
          .print\\:p-0 { padding: 0 !important; }
          .print\\:space-y-4 > * + * { margin-top: 1rem !important; }
          .print\\:break-before-page { break-before: page; }
        }
      `}</style>
    </div>
  );
};

export default SalesReportView;
