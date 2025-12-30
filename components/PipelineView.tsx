import React, { useMemo, useState } from 'react';
import {
  Settings,
  ChevronDown, Plus, Search, ChevronRight, Loader2, Clock3, Activity, ShieldAlert, BarChart3, Target, CheckCircle2, AlertTriangle, LayoutGrid, List
} from 'lucide-react';
import { fetchDeals } from '../services/supabaseService';
import { PIPELINE_COLUMNS } from '../constants';
import { PipelineDeal, UserProfile } from '../types';
import CompanyName from './CompanyName';
import { useRealtimeList } from '../hooks/useRealtimeList';

interface PipelineViewProps {
  currentUser?: UserProfile;
}

type DealScope = 'all' | 'team' | 'mine';

const normalizeRole = (role?: string) => (role || '').trim().toLowerCase();

const PipelineView: React.FC<PipelineViewProps> = ({ currentUser }) => {
  const normalizedRole = normalizeRole(currentUser?.role);
  const isOwner = normalizedRole === 'owner' || normalizedRole === 'developer';
  const isManager = normalizedRole === 'manager';
  const isSupport = normalizedRole === 'support' || normalizedRole === 'support staff';
  const isAgent = normalizedRole.includes('agent');
  const isJunior = normalizedRole.includes('junior');
  const canCreateDeal = isOwner || isManager || isAgent || isJunior;
  const canExport = isOwner || isManager;

  const [viewMode, setViewMode] = useState<'kanban' | 'list'>('kanban');
  const [searchQuery, setSearchQuery] = useState('');
  const [showAdvancedFilters, setShowAdvancedFilters] = useState(false);
  const [showScopeMenu, setShowScopeMenu] = useState(false);
  const [dealScope, setDealScope] = useState<DealScope>(
    isAgent || isJunior ? 'mine' : 'all'
  );
  const [filters, setFilters] = useState({
    ownerName: 'all',
    stageId: 'all',
    valueRange: 'all',
    daysInStage: 'all',
    probability: 'all',
    customerType: 'all',
  });
  const stageMap = useMemo(() => {
    const map = new Map<string, typeof PIPELINE_COLUMNS[number]>();
    PIPELINE_COLUMNS.forEach(col => map.set(col.id, col));
    return map;
  }, []);

  // Use real-time list hook for deals
  const sortByStage = (a: PipelineDeal, b: PipelineDeal) => {
    const stageOrder = PIPELINE_COLUMNS.map(col => col.id);
    const aIndex = stageOrder.indexOf(a.stageId);
    const bIndex = stageOrder.indexOf(b.stageId);
    if (aIndex !== bIndex) return aIndex - bIndex;
    return new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime();
  };

  const { data: deals, isLoading } = useRealtimeList<PipelineDeal>({
    tableName: 'deals',
    initialFetchFn: fetchDeals,
    sortFn: sortByStage,
  });

  const filteredDeals = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    const ownerName = currentUser?.full_name || currentUser?.email || '';
    const stageProbability = (stageId: string) => stageMap.get(stageId)?.probability ?? 0;
    return deals.filter((deal) => {
      if (dealScope === 'mine' && ownerName && deal.ownerName !== ownerName) return false;
      if (dealScope === 'team' && currentUser?.team && deal.team && deal.team !== currentUser.team) return false;
      if (!isOwner && !isManager && !isSupport && (isAgent || isJunior) && ownerName && deal.ownerName !== ownerName) return false;

      if (query) {
        const haystack = `${deal.title} ${deal.company} ${deal.ownerName || ''}`.toLowerCase();
        if (!haystack.includes(query)) return false;
      }

      if (filters.ownerName !== 'all' && deal.ownerName !== filters.ownerName) return false;
      if (filters.stageId !== 'all' && deal.stageId !== filters.stageId) return false;
      if (filters.customerType !== 'all' && deal.customerType !== filters.customerType) return false;

      if (filters.valueRange !== 'all') {
        const value = deal.value || 0;
        const ranges: Record<string, [number, number | null]> = {
          '0-100k': [0, 100000],
          '100k-500k': [100000, 500000],
          '500k-1m': [500000, 1000000],
          '1m+': [1000000, null],
        };
        const [min, max] = ranges[filters.valueRange] || [0, null];
        if (value < min || (max !== null && value > max)) return false;
      }

      if (filters.daysInStage !== 'all') {
        const days = deal.daysInStage || 0;
        const ranges: Record<string, [number, number | null]> = {
          '0-7': [0, 7],
          '8-14': [8, 14],
          '15-30': [15, 30],
          '30+': [30, null],
        };
        const [min, max] = ranges[filters.daysInStage] || [0, null];
        if (days < min || (max !== null && days > max)) return false;
      }

      if (filters.probability !== 'all') {
        const prob = stageProbability(deal.stageId);
        const ranges: Record<string, [number, number]> = {
          '0-20': [0, 0.2],
          '21-40': [0.21, 0.4],
          '41-60': [0.41, 0.6],
          '61-80': [0.61, 0.8],
          '81-100': [0.81, 1],
        };
        const [min, max] = ranges[filters.probability] || [0, 1];
        if (prob < min || prob > max) return false;
      }

      return true;
    });
  }, [currentUser?.email, currentUser?.full_name, currentUser?.role, dealScope, deals, filters, isAgent, isJunior, isManager, isOwner, isSupport, searchQuery, stageMap]);

  // Helper to get deals for a column
  const getDealsForStage = (stageId: string) => filteredDeals.filter(d => d.stageId === stageId);

  // Calculate column stats (memoized for performance)
  const getColumnStats = useMemo(() => {
    const statsMap = new Map<string, { count: number; value: number; avgAge: number }>();

    PIPELINE_COLUMNS.forEach(col => {
      const stageDeals = filteredDeals.filter(d => d.stageId === col.id);
      const totalValue = stageDeals.reduce((sum, d) => sum + d.value, 0);
      const avgAge = stageDeals.length
        ? Math.round(stageDeals.reduce((sum, d) => sum + (d.daysInStage || 0), 0) / stageDeals.length)
        : 0;
      statsMap.set(col.id, { count: stageDeals.length, value: totalValue, avgAge });
    });

    return (stageId: string) => statsMap.get(stageId) || { count: 0, value: 0, avgAge: 0 };
  }, [filteredDeals]);

  // Calculate Total Pipeline Stats (memoized)
  const pipelineStats = useMemo(() => {
    const totalDeals = filteredDeals.length;
    const totalValue = filteredDeals.reduce((sum, d) => sum + d.value, 0);
    const weightedValue = filteredDeals.reduce((sum, d) => {
      const prob = stageMap.get(d.stageId)?.probability ?? 0.2;
      return sum + d.value * prob;
    }, 0);
    const avgDays = filteredDeals.length
      ? Math.round(filteredDeals.reduce((sum, d) => sum + (d.daysInStage || 0), 0) / filteredDeals.length)
      : 0;
    const stageDistribution = PIPELINE_COLUMNS.map(col => {
      const items = filteredDeals.filter(d => d.stageId === col.id);
      const value = items.reduce((sum, d) => sum + d.value, 0);
      return { id: col.id, title: col.title, count: items.length, value, probability: col.probability ?? 0 };
    });

    return { totalDeals, totalValue, weightedValue, avgDays, stageDistribution };
  }, [filteredDeals, stageMap]);

  const { totalDeals, totalValue, weightedValue, avgDays, stageDistribution } = pipelineStats;

  if (isLoading) {
    return (
      <div className="flex h-full items-center justify-center bg-gray-50 dark:bg-slate-950 w-full">
        <Loader2 className="w-8 h-8 text-brand-blue animate-spin" />
      </div>
    );
  }

  return (
    <div className="flex h-full bg-gray-50 dark:bg-slate-950 overflow-hidden font-sans w-full animate-fadeIn">
      
      {/* Main Content */}
      <div className="flex-1 flex flex-col min-w-0">
        
        {/* Toolbar */}
        <div className="bg-white dark:bg-slate-900 border-b border-gray-200 dark:border-slate-800 p-5 flex flex-col gap-4 shadow-sm z-10">
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                    <button
                        className="bg-brand-blue hover:bg-blue-800 text-white px-4 py-2.5 rounded-lg font-semibold text-sm flex items-center shadow-sm transition-all transform active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
                        disabled={!canCreateDeal}
                    >
                        <Plus className="w-4 h-4 mr-1.5" /> Add deal
                    </button>
                    <div className="flex items-center border border-gray-200 dark:border-slate-700 rounded-lg px-3 py-2 bg-white dark:bg-slate-800 shadow-sm cursor-pointer hover:border-gray-300 dark:hover:border-slate-600 transition-colors group">
                         <div className="w-1 h-5 bg-gray-300 dark:bg-slate-600 mr-3 rounded-full group-hover:bg-gray-400 transition-colors"></div>
                         <span className="text-sm font-bold text-gray-700 dark:text-slate-200 mr-2">B2B PH Sales Pipeline</span>
                         <ChevronDown className="w-4 h-4 text-gray-400 dark:text-slate-500" />
                         <div className="w-px h-5 bg-gray-200 dark:bg-slate-700 mx-3"></div>
                         <button className="p-1 hover:bg-gray-100 dark:hover:bg-slate-700 rounded transition-colors">
                            <Settings className="w-4 h-4 text-gray-400 dark:text-slate-500" />
                         </button>
                    </div>
                    <div className="flex items-center text-sm text-gray-500 dark:text-slate-400 gap-3 ml-2 bg-gray-50 dark:bg-slate-800 px-3 py-2 rounded-lg border border-gray-100 dark:border-slate-700">
                        <span className="font-semibold text-gray-700 dark:text-slate-300">{totalDeals} deals</span>
                        <span className="text-gray-300 dark:text-slate-600">|</span>
                        <span>Total: <span className="font-semibold text-gray-700 dark:text-slate-300">₱{totalValue.toLocaleString()}</span></span>
                        <span className="text-gray-300 dark:text-slate-600">|</span>
                        <span>Projected: <span className="font-semibold text-gray-700 dark:text-slate-300">₱{Math.round(weightedValue).toLocaleString()}</span></span>
                    </div>
                </div>

                <div className="flex items-center gap-3">
                    <div className="relative">
                        <button
                            className="flex items-center gap-2 px-3 py-2 border border-gray-200 dark:border-slate-700 rounded-lg text-sm font-medium text-gray-600 dark:text-slate-300 bg-white dark:bg-slate-800 hover:bg-gray-50 dark:hover:bg-slate-700 hover:text-gray-800 dark:hover:text-white transition-colors"
                            onClick={() => setShowScopeMenu((prev) => !prev)}
                        >
                            {dealScope === 'all' ? 'All deals' : dealScope === 'team' ? 'Team deals' : 'My deals'}
                            <ChevronDown className="w-3 h-3" />
                        </button>
                        {showScopeMenu && (
                            <div className="absolute right-0 mt-2 w-40 rounded-lg border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-900 shadow-lg z-20">
                                {(['all', 'team', 'mine'] as DealScope[]).map(scope => (
                                    <button
                                        key={scope}
                                        className={`w-full text-left px-3 py-2 text-sm hover:bg-gray-50 dark:hover:bg-slate-800 ${dealScope === scope ? 'font-semibold text-gray-800 dark:text-white' : 'text-gray-600 dark:text-slate-300'}`}
                                        onClick={() => {
                                          setDealScope(scope);
                                          setShowScopeMenu(false);
                                        }}
                                        disabled={scope === 'team' && !(isOwner || isManager)}
                                    >
                                        {scope === 'all' ? 'All deals' : scope === 'team' ? 'Team deals' : 'My deals'}
                                    </button>
                                ))}
                            </div>
                        )}
                    </div>
                    <div className="relative">
                        <input 
                            type="text" 
                            placeholder="Quick filter deals" 
                            value={searchQuery}
                            onChange={(event) => setSearchQuery(event.target.value)}
                            className="pl-3 pr-9 py-2 border border-gray-200 dark:border-slate-700 dark:bg-slate-800 dark:text-white rounded-lg text-sm focus:border-brand-blue focus:ring-1 focus:ring-brand-blue focus:outline-none w-56 transition-all shadow-sm"
                        />
                        <Search className="w-4 h-4 text-gray-400 dark:text-slate-500 absolute right-3 top-1/2 -translate-y-1/2" />
                    </div>
                    <button
                        className="flex items-center gap-2 px-3 py-2 border border-gray-200 dark:border-slate-700 rounded-lg text-sm font-medium text-gray-600 dark:text-slate-300 bg-white dark:bg-slate-800 hover:bg-gray-50 dark:hover:bg-slate-700 hover:text-gray-800 dark:hover:text-white transition-colors"
                        onClick={() => setShowAdvancedFilters((prev) => !prev)}
                    >
                        Advanced filters <ChevronRight className="w-3 h-3" />
                    </button>
                    <div className="flex items-center gap-1 border border-gray-200 dark:border-slate-700 rounded-lg overflow-hidden bg-white dark:bg-slate-800">
                        <button
                            className={`px-2.5 py-2 text-sm ${viewMode === 'kanban' ? 'bg-gray-100 dark:bg-slate-700 text-gray-800 dark:text-white' : 'text-gray-500 dark:text-slate-400'}`}
                            onClick={() => setViewMode('kanban')}
                            aria-label="Kanban view"
                        >
                            <LayoutGrid className="w-4 h-4" />
                        </button>
                        <button
                            className={`px-2.5 py-2 text-sm ${viewMode === 'list' ? 'bg-gray-100 dark:bg-slate-700 text-gray-800 dark:text-white' : 'text-gray-500 dark:text-slate-400'}`}
                            onClick={() => setViewMode('list')}
                            aria-label="List view"
                        >
                            <List className="w-4 h-4" />
                        </button>
                    </div>
                    <button
                        className="flex items-center gap-2 px-3 py-2 border border-gray-200 dark:border-slate-700 rounded-lg text-sm font-medium text-gray-600 dark:text-slate-300 bg-white dark:bg-slate-800 hover:bg-gray-50 dark:hover:bg-slate-700 hover:text-gray-800 dark:hover:text-white transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                        disabled={!canExport}
                    >
                        Export
                    </button>
                </div>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <div className="flex items-center gap-3 border border-gray-100 dark:border-slate-800 bg-gray-50 dark:bg-slate-800/60 rounded-xl p-3 shadow-sm">
                    <Target className="w-5 h-5 text-brand-blue" />
                    <div>
                        <p className="text-[11px] uppercase font-bold text-gray-400">Pipeline Value</p>
                        <p className="text-lg font-bold text-gray-800 dark:text-white">₱{totalValue.toLocaleString()}</p>
                    </div>
                </div>
                <div className="flex items-center gap-3 border border-gray-100 dark:border-slate-800 bg-gray-50 dark:bg-slate-800/60 rounded-xl p-3 shadow-sm">
                    <BarChart3 className="w-5 h-5 text-emerald-500" />
                    <div>
                        <p className="text-[11px] uppercase font-bold text-gray-400">Weighted Forecast</p>
                        <p className="text-lg font-bold text-gray-800 dark:text-white">₱{Math.round(weightedValue).toLocaleString()}</p>
                    </div>
                </div>
                <div className="flex items-center gap-3 border border-gray-100 dark:border-slate-800 bg-gray-50 dark:bg-slate-800/60 rounded-xl p-3 shadow-sm">
                    <Clock3 className="w-5 h-5 text-amber-500" />
                    <div>
                        <p className="text-[11px] uppercase font-bold text-gray-400">Avg Days in Stage</p>
                        <p className="text-lg font-bold text-gray-800 dark:text-white">{avgDays || '—'} days</p>
                    </div>
                </div>
                <div className="flex items-center gap-3 border border-gray-100 dark:border-slate-800 bg-gray-50 dark:bg-slate-800/60 rounded-xl p-3 shadow-sm">
                    <Activity className="w-5 h-5 text-indigo-500" />
                    <div>
                        <p className="text-[11px] uppercase font-bold text-gray-400">Stage Distribution</p>
                        <div className="flex items-center gap-1 text-[11px] text-gray-600 dark:text-slate-300">
                            {stageDistribution.map((s) => (
                                <span key={s.id} className="px-2 py-0.5 rounded-full bg-white dark:bg-slate-700 border border-gray-100 dark:border-slate-600 font-semibold">
                                    {s.title}: {s.count}
                                </span>
                            ))}
                        </div>
                    </div>
                </div>
            </div>
        </div>

        {showAdvancedFilters && (
            <div className="border-b border-gray-100 dark:border-slate-800 bg-white dark:bg-slate-900 px-6 py-4">
                <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-6 gap-3">
                    <select
                        className="border border-gray-200 dark:border-slate-700 rounded-lg px-3 py-2 text-sm bg-white dark:bg-slate-800 dark:text-white"
                        value={filters.ownerName}
                        onChange={(event) => setFilters((prev) => ({ ...prev, ownerName: event.target.value }))}
                    >
                        <option value="all">All owners</option>
                        {Array.from(new Set(deals.map((deal) => deal.ownerName).filter(Boolean))).map((owner) => (
                            <option key={owner} value={owner as string}>{owner}</option>
                        ))}
                    </select>
                    <select
                        className="border border-gray-200 dark:border-slate-700 rounded-lg px-3 py-2 text-sm bg-white dark:bg-slate-800 dark:text-white"
                        value={filters.valueRange}
                        onChange={(event) => setFilters((prev) => ({ ...prev, valueRange: event.target.value }))}
                    >
                        <option value="all">All values</option>
                        <option value="0-100k">₱0-100K</option>
                        <option value="100k-500k">₱100K-500K</option>
                        <option value="500k-1m">₱500K-1M</option>
                        <option value="1m+">₱1M+</option>
                    </select>
                    <select
                        className="border border-gray-200 dark:border-slate-700 rounded-lg px-3 py-2 text-sm bg-white dark:bg-slate-800 dark:text-white"
                        value={filters.stageId}
                        onChange={(event) => setFilters((prev) => ({ ...prev, stageId: event.target.value }))}
                    >
                        <option value="all">All stages</option>
                        {PIPELINE_COLUMNS.map((stage) => (
                            <option key={stage.id} value={stage.id}>{stage.title}</option>
                        ))}
                    </select>
                    <select
                        className="border border-gray-200 dark:border-slate-700 rounded-lg px-3 py-2 text-sm bg-white dark:bg-slate-800 dark:text-white"
                        value={filters.daysInStage}
                        onChange={(event) => setFilters((prev) => ({ ...prev, daysInStage: event.target.value }))}
                    >
                        <option value="all">All ages</option>
                        <option value="0-7">0-7 days</option>
                        <option value="8-14">8-14 days</option>
                        <option value="15-30">15-30 days</option>
                        <option value="30+">30+ days</option>
                    </select>
                    <select
                        className="border border-gray-200 dark:border-slate-700 rounded-lg px-3 py-2 text-sm bg-white dark:bg-slate-800 dark:text-white"
                        value={filters.probability}
                        onChange={(event) => setFilters((prev) => ({ ...prev, probability: event.target.value }))}
                    >
                        <option value="all">All probabilities</option>
                        <option value="0-20">0-20%</option>
                        <option value="21-40">21-40%</option>
                        <option value="41-60">41-60%</option>
                        <option value="61-80">61-80%</option>
                        <option value="81-100">81-100%</option>
                    </select>
                    <select
                        className="border border-gray-200 dark:border-slate-700 rounded-lg px-3 py-2 text-sm bg-white dark:bg-slate-800 dark:text-white"
                        value={filters.customerType}
                        onChange={(event) => setFilters((prev) => ({ ...prev, customerType: event.target.value }))}
                    >
                        <option value="all">All customer types</option>
                        <option value="VIP1">VIP1</option>
                        <option value="VIP2">VIP2</option>
                        <option value="Regular">Regular</option>
                    </select>
                </div>
                <div className="flex items-center justify-between mt-4 text-xs text-gray-500 dark:text-slate-400">
                    <span>{filteredDeals.length} deals matched</span>
                    <button
                        className="text-brand-blue hover:text-blue-700 font-semibold"
                        onClick={() => setFilters({
                          ownerName: 'all',
                          stageId: 'all',
                          valueRange: 'all',
                          daysInStage: 'all',
                          probability: 'all',
                          customerType: 'all',
                        })}
                    >
                        Reset filters
                    </button>
                </div>
            </div>
        )}

        {/* Stage design guidance */}
        <div className="px-6 py-4 bg-gray-50 dark:bg-slate-950 border-b border-gray-100 dark:border-slate-900">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
                {PIPELINE_COLUMNS.map((stage) => (
                    <div key={stage.id} className="border border-gray-100 dark:border-slate-800 rounded-xl bg-white dark:bg-slate-900 p-3 shadow-sm space-y-2">
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                                <div className={`w-2 h-2 rounded-full ${stage.color.replace('text-','bg-')}`}></div>
                                <p className="text-sm font-bold text-gray-800 dark:text-white">{stage.title}</p>
                            </div>
                            <span className="text-[11px] font-bold text-gray-500 dark:text-slate-400">{Math.round((stage.probability ?? 0) * 100)}% prob.</span>
                        </div>
                        <div className="text-[11px] text-gray-500 dark:text-slate-400">
                            <strong>Entry:</strong> {stage.entryCriteria || 'Buyer intent captured'}
                        </div>
                        <div className="text-[11px] text-gray-500 dark:text-slate-400">
                            <strong>Exit:</strong> {stage.exitCriteria || 'Buyer-verified outcome'}
                        </div>
                        <div className="flex items-center gap-2 text-[11px] text-amber-600 dark:text-amber-400">
                            <Clock3 className="w-3 h-3" /> Rooting: {stage.rootingDays ?? 7}d
                        </div>
                        <div className="text-[11px] text-gray-500 dark:text-slate-400">
                            <strong>Activities:</strong> {(stage.keyActivities || []).slice(0,2).join(' • ') || 'Advance buyer proof'}
                        </div>
                    </div>
                ))}
            </div>
        </div>

        {viewMode === 'kanban' ? (
            <div className="flex-1 overflow-hidden p-6 bg-gray-50 dark:bg-slate-950">
                <div className="flex h-full w-full">
                    {PIPELINE_COLUMNS.map((column, index) => {
                        const { count, value, avgAge } = getColumnStats(column.id);
                        const columnDeals = getDealsForStage(column.id);
                        
                        return (
                            <div key={column.id} className="flex-1 min-w-0 flex flex-col h-full mr-4 last:mr-0">
                                {/* Column Header */}
                                <div className="relative h-14 mb-4 filter drop-shadow-sm group flex-shrink-0">
                                    <div 
                                        className="absolute inset-0 bg-white dark:bg-slate-900 flex items-center px-4 transition-transform hover:scale-[1.02]"
                                        style={{
                                            clipPath: 'polygon(0% 0%, 92% 0%, 100% 50%, 92% 100%, 0% 100%, 8% 50%)',
                                            marginLeft: index === 0 ? '0' : '-22px',
                                            paddingLeft: index === 0 ? '16px' : '38px',
                                            zIndex: 10 - index,
                                            ...(index === 0 ? { clipPath: 'polygon(0% 0%, 92% 0%, 100% 50%, 92% 100%, 0% 100%)' } : {})
                                        }}
                                    >
                                        <div className="flex flex-col w-full truncate">
                                            <div className="flex items-center gap-2 mb-0.5">
                                                <div className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${column.color.replace('text-', 'bg-')}`}></div>
                                                <span className={`font-bold text-sm truncate ${column.color}`}>{column.title}</span>
                                            </div>
                                            <div className="flex items-center justify-between text-[11px] text-gray-400 dark:text-slate-500 font-medium">
                                                <span className="truncate">₱{value.toLocaleString()}</span>
                                                <span className="flex-shrink-0 ml-1">• {count} deals</span>
                                            </div>
                                            <div className="flex items-center justify-between text-[10px] text-gray-400 dark:text-slate-500 font-semibold">
                                                <span>{Math.round((column.probability ?? 0) * 100)}% win prob</span>
                                                <span>Avg {avgAge || 0}d</span>
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                {/* Cards Container */}
                                <div className="flex-1 overflow-y-auto pr-2 pb-4 space-y-3 custom-scrollbar">
                                    {columnDeals.map(deal => {
                                        const meta = stageMap.get(deal.stageId);
                                        const probability = meta?.probability ?? 0.2;
                                        const rootingDays = meta?.rootingDays ?? 7;
                                        const isStalled = (deal.daysInStage || 0) > rootingDays;
                                        return (
                                          <div 
                                              key={deal.id} 
                                              className={`bg-white dark:bg-slate-800 p-4 rounded-lg border border-gray-100 dark:border-slate-700 shadow-card group hover:shadow-card-hover transition-all duration-200 cursor-pointer relative ${(deal.isWarning || isStalled) ? 'bg-rose-50/30 dark:bg-rose-900/10' : ''}`}
                                          >
                                              {(deal.isWarning || isStalled) && (
                                                  <div className="absolute inset-0 bg-rose-50 dark:bg-rose-900 opacity-20 dark:opacity-10 pointer-events-none rounded-lg"></div>
                                              )}
                                              <div className="relative z-10 space-y-3">
                                                  <div className="flex items-start justify-between gap-2">
                                                      <div>
                                                          <h4 className="font-bold text-sm text-gray-800 dark:text-white leading-snug mb-1 group-hover:text-brand-blue dark:group-hover:text-blue-400 transition-colors">{deal.title}</h4>
                                                          <p className="text-xs text-gray-500 dark:text-slate-400 font-medium">
                                                              <CompanyName 
                                                                name={deal.company}
                                                                pastName={deal.pastName}
                                                                className="inline-flex items-center gap-1 text-xs font-medium text-gray-500 dark:text-slate-400"
                                                                formerNameClassName="text-[10px] text-slate-400 dark:text-slate-500 font-medium"
                                                              />
                                                          </p>
                                                      </div>
                                                      <span className="text-[11px] font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-900/30 px-2 py-0.5 rounded-full">
                                                          {(probability * 100).toFixed(0)}% win
                                                      </span>
                                                  </div>
                                                  
                                                  <div className="flex items-center justify-between">
                                                      <div className="flex items-center gap-2">
                                                          <img src={deal.avatar} alt="" className="w-6 h-6 rounded-full border border-white dark:border-slate-600 shadow-sm" />
                                                          <span className="text-xs font-medium text-gray-600 dark:text-slate-300">{deal.ownerName}</span>
                                                      </div>
                                                      {isStalled && (
                                                          <span className="flex items-center gap-1 bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300 text-[10px] font-bold px-2 py-0.5 rounded-full">
                                                              <AlertTriangle className="w-3 h-3" /> {deal.daysInStage}d in stage
                                                          </span>
                                                      )}
                                                  </div>

                                                  <div className="text-[11px] text-gray-500 dark:text-slate-400 space-y-1">
                                                      <div className="flex items-center gap-2">
                                                          <CheckCircle2 className="w-3 h-3 text-emerald-500" />
                                                          <span>Exit: {deal.exitEvidence || meta?.exitCriteria || 'Buyer-reviewed proposal'}</span>
                                                      </div>
                                                      <div className="flex items-center gap-2">
                                                          <ShieldAlert className="w-3 h-3 text-amber-500" />
                                                          <span>Next: {deal.nextStep || meta?.keyActivities?.[0] || 'Secure next meeting'}</span>
                                                      </div>
                                                  </div>
                                                  
                                                  <div className="flex items-center justify-between pt-3 border-t border-gray-50 dark:border-slate-700">
                                                      <div className="flex flex-col">
                                                          <span className="font-bold text-sm text-gray-700 dark:text-slate-200">₱{deal.value.toLocaleString()}</span>
                                                          <span className="text-[11px] text-gray-500 dark:text-slate-400">Weighted: ₱{Math.round(deal.value * probability).toLocaleString()}</span>
                                                      </div>
                                                      <button className="text-gray-300 hover:text-gray-500 dark:hover:text-slate-400 transition-colors">
                                                          <ChevronRight className="w-4 h-4" />
                                                      </button>
                                                  </div>
                                              </div>
                                          </div>
                                        );
                                    })}
                                    <div className="h-12"></div>
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>
        ) : (
            <div className="flex-1 overflow-auto p-6 bg-gray-50 dark:bg-slate-950">
                <div className="overflow-hidden rounded-xl border border-gray-100 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm">
                    <table className="min-w-full text-sm">
                        <thead className="bg-gray-50 dark:bg-slate-800 text-gray-500 dark:text-slate-400">
                            <tr>
                                <th className="text-left font-semibold px-4 py-3">Deal</th>
                                <th className="text-left font-semibold px-4 py-3">Owner</th>
                                <th className="text-left font-semibold px-4 py-3">Stage</th>
                                <th className="text-right font-semibold px-4 py-3">Value</th>
                                <th className="text-right font-semibold px-4 py-3">Weighted</th>
                                <th className="text-right font-semibold px-4 py-3">Days</th>
                                <th className="text-left font-semibold px-4 py-3">Next Step</th>
                            </tr>
                        </thead>
                        <tbody>
                            {filteredDeals.map((deal) => {
                                const meta = stageMap.get(deal.stageId);
                                const probability = meta?.probability ?? 0.2;
                                return (
                                    <tr key={deal.id} className="border-t border-gray-100 dark:border-slate-800 hover:bg-gray-50 dark:hover:bg-slate-800/60">
                                        <td className="px-4 py-3">
                                            <div className="font-semibold text-gray-800 dark:text-white">{deal.title}</div>
                                            <div className="text-xs text-gray-500 dark:text-slate-400">{deal.company}</div>
                                        </td>
                                        <td className="px-4 py-3 text-gray-600 dark:text-slate-300">{deal.ownerName || '—'}</td>
                                        <td className="px-4 py-3 text-gray-600 dark:text-slate-300">{meta?.title || '—'}</td>
                                        <td className="px-4 py-3 text-right font-semibold text-gray-700 dark:text-slate-200">₱{deal.value.toLocaleString()}</td>
                                        <td className="px-4 py-3 text-right text-gray-500 dark:text-slate-400">₱{Math.round(deal.value * probability).toLocaleString()}</td>
                                        <td className="px-4 py-3 text-right text-gray-500 dark:text-slate-400">{deal.daysInStage ?? '—'}</td>
                                        <td className="px-4 py-3 text-gray-500 dark:text-slate-400">{deal.nextStep || meta?.keyActivities?.[0] || '—'}</td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                    {filteredDeals.length === 0 && (
                        <div className="p-6 text-center text-sm text-gray-500 dark:text-slate-400">
                            No deals match the current filters.
                        </div>
                    )}
                </div>
            </div>
        )}
      </div>
    </div>
  );
};

export default PipelineView;
