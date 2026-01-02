import React, { useEffect, useState } from 'react';
import { Calendar, User, Filter, Building2, Users } from 'lucide-react';
import { SalesReportFilters, SalesReportViewType } from '../types';
import { getAgentsList } from '../services/salesReportService';

interface SalesReportFilterProps {
  filters: SalesReportFilters;
  onFiltersChange: (filters: SalesReportFilters) => void;
}

const DATE_PRESETS = [
  { label: 'Today', getValue: () => {
    const today = new Date().toISOString().split('T')[0];
    return { dateFrom: today, dateTo: today };
  }},
  { label: 'This Week', getValue: () => {
    const now = new Date();
    const start = new Date(now);
    start.setDate(now.getDate() - now.getDay());
    return { 
      dateFrom: start.toISOString().split('T')[0], 
      dateTo: now.toISOString().split('T')[0] 
    };
  }},
  { label: 'This Month', getValue: () => {
    const now = new Date();
    const start = new Date(now.getFullYear(), now.getMonth(), 1);
    return { 
      dateFrom: start.toISOString().split('T')[0], 
      dateTo: now.toISOString().split('T')[0] 
    };
  }},
  { label: 'Last 30 Days', getValue: () => {
    const now = new Date();
    const start = new Date(now);
    start.setDate(now.getDate() - 30);
    return { 
      dateFrom: start.toISOString().split('T')[0], 
      dateTo: now.toISOString().split('T')[0] 
    };
  }},
  { label: 'Last 90 Days', getValue: () => {
    const now = new Date();
    const start = new Date(now);
    start.setDate(now.getDate() - 90);
    return { 
      dateFrom: start.toISOString().split('T')[0], 
      dateTo: now.toISOString().split('T')[0] 
    };
  }},
];

const STATUS_OPTIONS = [
  { value: 'pending', label: 'Pending' },
  { value: 'approved', label: 'Approved' },
  { value: 'confirmed', label: 'Confirmed' },
  { value: 'paid', label: 'Paid' },
  { value: 'rejected', label: 'Rejected' },
];

const SOURCE_TYPE_OPTIONS = [
  { value: 'sales_report', label: 'Field Reports' },
  { value: 'sales_order', label: 'Sales Orders' },
  { value: 'invoice', label: 'Invoices' },
];

const SalesReportFilter: React.FC<SalesReportFilterProps> = ({
  filters,
  onFiltersChange,
}) => {
  const [agents, setAgents] = useState<{ id: string; name: string }[]>([]);
  const [activePreset, setActivePreset] = useState<string | null>(null);

  useEffect(() => {
    const loadAgents = async () => {
      const agentList = await getAgentsList();
      setAgents(agentList);
    };
    loadAgents();
  }, []);

  const handleDatePreset = (preset: typeof DATE_PRESETS[0]) => {
    const { dateFrom, dateTo } = preset.getValue();
    setActivePreset(preset.label);
    onFiltersChange({ ...filters, dateFrom, dateTo });
  };

  const handleViewTypeChange = (viewType: SalesReportViewType) => {
    onFiltersChange({ ...filters, viewType });
  };

  const handleAgentChange = (agentId: string) => {
    onFiltersChange({ ...filters, agentId: agentId || undefined });
  };

  const handleDateChange = (field: 'dateFrom' | 'dateTo', value: string) => {
    setActivePreset(null);
    onFiltersChange({ ...filters, [field]: value });
  };

  const handleStatusToggle = (status: string) => {
    const currentStatus = filters.status || [];
    const newStatus = currentStatus.includes(status)
      ? currentStatus.filter(s => s !== status)
      : [...currentStatus, status];
    onFiltersChange({ ...filters, status: newStatus.length > 0 ? newStatus : undefined });
  };

  const handleSourceTypeToggle = (sourceType: string) => {
    const currentTypes = filters.sourceType || [];
    const newTypes = currentTypes.includes(sourceType as any)
      ? currentTypes.filter(t => t !== sourceType)
      : [...currentTypes, sourceType as any];
    onFiltersChange({ ...filters, sourceType: newTypes.length > 0 ? newTypes : undefined });
  };

  return (
    <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-4 space-y-4">
      <div className="flex flex-wrap items-center gap-3">
        <div className="flex items-center gap-2 bg-slate-100 dark:bg-slate-700 rounded-lg p-1">
          <button
            onClick={() => handleViewTypeChange('company')}
            className={`flex items-center gap-2 px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
              filters.viewType === 'company'
                ? 'bg-brand-blue text-white'
                : 'text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-600'
            }`}
          >
            <Building2 className="w-4 h-4" />
            Company-wide
          </button>
          <button
            onClick={() => handleViewTypeChange('agent')}
            className={`flex items-center gap-2 px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
              filters.viewType === 'agent'
                ? 'bg-brand-blue text-white'
                : 'text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-600'
            }`}
          >
            <Users className="w-4 h-4" />
            By Agent
          </button>
        </div>

        <div className="h-6 w-px bg-slate-300 dark:bg-slate-600 hidden sm:block" />

        <div className="flex flex-wrap items-center gap-2">
          {DATE_PRESETS.map((preset) => (
            <button
              key={preset.label}
              onClick={() => handleDatePreset(preset)}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                activePreset === preset.label
                  ? 'bg-brand-blue text-white'
                  : 'bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-600'
              }`}
            >
              {preset.label}
            </button>
          ))}
        </div>
      </div>

      <div className="flex flex-wrap items-end gap-4">
        <div className="flex items-center gap-2">
          <Calendar className="w-4 h-4 text-slate-500" />
          <div className="flex items-center gap-2">
            <input
              type="date"
              value={filters.dateFrom}
              onChange={(e) => handleDateChange('dateFrom', e.target.value)}
              className="px-3 py-1.5 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-800 dark:text-white text-sm focus:ring-2 focus:ring-brand-blue focus:border-transparent"
            />
            <span className="text-slate-500">to</span>
            <input
              type="date"
              value={filters.dateTo}
              onChange={(e) => handleDateChange('dateTo', e.target.value)}
              className="px-3 py-1.5 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-800 dark:text-white text-sm focus:ring-2 focus:ring-brand-blue focus:border-transparent"
            />
          </div>
        </div>

        {filters.viewType === 'agent' && (
          <div className="flex items-center gap-2">
            <User className="w-4 h-4 text-slate-500" />
            <select
              value={filters.agentId || ''}
              onChange={(e) => handleAgentChange(e.target.value)}
              className="px-3 py-1.5 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-800 dark:text-white text-sm focus:ring-2 focus:ring-brand-blue focus:border-transparent min-w-[180px]"
            >
              <option value="">All Agents</option>
              {agents.map((agent) => (
                <option key={agent.id} value={agent.id}>
                  {agent.name}
                </option>
              ))}
            </select>
          </div>
        )}

        <div className="flex items-center gap-2">
          <Filter className="w-4 h-4 text-slate-500" />
          <div className="flex flex-wrap gap-1">
            {SOURCE_TYPE_OPTIONS.map((option) => (
              <button
                key={option.value}
                onClick={() => handleSourceTypeToggle(option.value)}
                className={`px-2 py-1 rounded text-xs font-medium transition-colors ${
                  (filters.sourceType || []).includes(option.value as any)
                    ? 'bg-brand-blue text-white'
                    : 'bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-600'
                }`}
              >
                {option.label}
              </button>
            ))}
          </div>
        </div>

        <div className="flex items-center gap-2">
          <div className="flex flex-wrap gap-1">
            {STATUS_OPTIONS.map((option) => (
              <button
                key={option.value}
                onClick={() => handleStatusToggle(option.value)}
                className={`px-2 py-1 rounded text-xs font-medium transition-colors ${
                  (filters.status || []).includes(option.value)
                    ? 'bg-emerald-500 text-white'
                    : 'bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-600'
                }`}
              >
                {option.label}
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default SalesReportFilter;
