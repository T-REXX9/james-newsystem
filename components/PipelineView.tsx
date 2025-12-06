import React, { useEffect, useMemo, useState } from 'react';
import { 
  Settings, 
  ChevronDown, Plus, Search, ChevronRight, Loader2, Clock3, Activity, ShieldAlert, BarChart3, Target, CheckCircle2, AlertTriangle
} from 'lucide-react';
import { fetchDeals } from '../services/supabaseService';
import { PIPELINE_COLUMNS } from '../constants';
import { PipelineDeal } from '../types';
import CompanyName from './CompanyName';

const PipelineView: React.FC = () => {
  const [deals, setDeals] = useState<PipelineDeal[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const stageMap = useMemo(() => {
    const map = new Map<string, typeof PIPELINE_COLUMNS[number]>();
    PIPELINE_COLUMNS.forEach(col => map.set(col.id, col));
    return map;
  }, []);

  useEffect(() => {
    const loadDeals = async () => {
      setIsLoading(true);
      const data = await fetchDeals();
      setDeals(data);
      setIsLoading(false);
    };
    loadDeals();
  }, []);

  // Helper to get deals for a column
  const getDealsForStage = (stageId: string) => deals.filter(d => d.stageId === stageId);

  // Calculate column stats
  const getColumnStats = (stageId: string) => {
    const stageDeals = getDealsForStage(stageId);
    const totalValue = stageDeals.reduce((sum, d) => sum + d.value, 0);
    const avgAge = stageDeals.length ? Math.round(stageDeals.reduce((sum, d) => sum + (d.daysInStage || 0), 0) / stageDeals.length) : 0;
    return { count: stageDeals.length, value: totalValue, avgAge };
  };

  // Calculate Total Pipeline Stats
  const totalDeals = deals.length;
  const totalValue = deals.reduce((sum, d) => sum + d.value, 0);
  const weightedValue = deals.reduce((sum, d) => {
      const prob = stageMap.get(d.stageId)?.probability ?? 0.2;
      return sum + d.value * prob;
  }, 0);
  const avgDays = deals.length ? Math.round(deals.reduce((sum, d) => sum + (d.daysInStage || 0), 0) / deals.length) : 0;
  const stageDistribution = PIPELINE_COLUMNS.map(col => {
      const items = getDealsForStage(col.id);
      const value = items.reduce((sum, d) => sum + d.value, 0);
      return { id: col.id, title: col.title, count: items.length, value, probability: col.probability ?? 0 };
  });

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
                    <button className="bg-brand-blue hover:bg-blue-800 text-white px-4 py-2.5 rounded-lg font-semibold text-sm flex items-center shadow-sm transition-all transform active:scale-95">
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
                        <span>Projected: <span className="font-semibold text-gray-700 dark:text-slate-300">₱{totalValue.toLocaleString()}</span></span>
                    </div>
                </div>

                <div className="flex items-center gap-3">
                    <button className="flex items-center gap-2 px-3 py-2 border border-gray-200 dark:border-slate-700 rounded-lg text-sm font-medium text-gray-600 dark:text-slate-300 bg-white dark:bg-slate-800 hover:bg-gray-50 dark:hover:bg-slate-700 hover:text-gray-800 dark:hover:text-white transition-colors">
                        Visible deals <ChevronDown className="w-3 h-3" />
                    </button>
                    <div className="relative">
                        <input 
                            type="text" 
                            placeholder="Quick filter deals" 
                            className="pl-3 pr-9 py-2 border border-gray-200 dark:border-slate-700 dark:bg-slate-800 dark:text-white rounded-lg text-sm focus:border-brand-blue focus:ring-1 focus:ring-brand-blue focus:outline-none w-56 transition-all shadow-sm" 
                        />
                        <Search className="w-4 h-4 text-gray-400 dark:text-slate-500 absolute right-3 top-1/2 -translate-y-1/2" />
                    </div>
                    <button className="flex items-center gap-2 px-3 py-2 border border-gray-200 dark:border-slate-700 rounded-lg text-sm font-medium text-gray-600 dark:text-slate-300 bg-white dark:bg-slate-800 hover:bg-gray-50 dark:hover:bg-slate-700 hover:text-gray-800 dark:hover:text-white transition-colors">
                        Advanced filters <ChevronRight className="w-3 h-3" />
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

        {/* Kanban Board */}
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
                                        // For the first element, remove the left cut
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
                                <div className="h-12"></div> {/* Bottom spacer */}
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
      </div>
    </div>
  );
};

export default PipelineView;
