
import React, { useState, useEffect } from 'react';
import { fetchContacts } from '../services/supabaseService';
import { Contact, InquiryReportFilters } from '../types';
import { FileText, Calendar, Users, ArrowRight, Loader2, Search } from 'lucide-react';
import InquiryReportView from './InquiryReportView';

const InquiryReportFilter: React.FC = () => {
    // Default to 'month' view to show recent data
    const [reportType, setReportType] = useState<InquiryReportFilters['reportType']>('month');

    // Calculate initial date range for 'month' (today - 30 days)
    const [dateFrom, setDateFrom] = useState<string>(() => {
        const d = new Date();
        d.setDate(d.getDate() - 30);
        return d.toISOString().split('T')[0];
    });

    const [dateTo, setDateTo] = useState<string>(new Date().toISOString().split('T')[0]);
    const [selectedCustomerId, setSelectedCustomerId] = useState<string | null>(null);
    const [customers, setCustomers] = useState<Contact[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [showView, setShowView] = useState(false);

    useEffect(() => {
        const loadCustomers = async () => {
            setIsLoading(true);
            try {
                const data = await fetchContacts();
                setCustomers(data);
            } finally {
                setIsLoading(false);
            }
        };
        loadCustomers();
    }, []);

    const handleReportTypeChange = (type: InquiryReportFilters['reportType']) => {
        setReportType(type);
        const today = new Date();
        let from = new Date();

        switch (type) {
            case 'today':
                from = today;
                break;
            case 'week':
                from.setDate(today.getDate() - 7);
                break;
            case 'month':
                from.setDate(today.getDate() - 30);
                break;
            case 'year':
                from.setDate(today.getDate() - 365);
                break;
            default:
                return;
        }

        setDateFrom(from.toISOString().split('T')[0]);
        setDateTo(today.toISOString().split('T')[0]);
    };

    const handleGenerateReport = () => {
        setShowView(true);
    };

    if (showView) {
        return (
            <InquiryReportView
                filters={{ dateFrom, dateTo, customerId: selectedCustomerId ?? undefined, reportType }}
                onBack={() => setShowView(false)}
            />
        );
    }

    if (isLoading) {
        return (
            <div className="flex h-full items-center justify-center bg-slate-50 dark:bg-slate-950">
                <Loader2 className="w-10 h-10 text-brand-blue animate-spin" />
            </div>
        );
    }

    return (
        <div className="flex flex-col h-full bg-slate-50 dark:bg-slate-950 p-8 animate-fadeIn">
            <div className="max-w-4xl mx-auto w-full">
                <div className="flex items-center gap-3 mb-8">
                    <div className="p-3 bg-brand-blue/10 rounded-xl">
                        <FileText className="w-8 h-8 text-brand-blue" />
                    </div>
                    <div>
                        <h1 className="text-2xl font-bold text-slate-800 dark:text-white">
                            Inquiry Report - Filter Options
                        </h1>
                        <p className="text-slate-500 dark:text-slate-400">
                            Configure your report parameters to view inquiry data
                        </p>
                    </div>
                </div>

                <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xl overflow-hidden">
                    <div className="p-8 space-y-8">
                        {/* Report Type */}
                        <div>
                            <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-4 flex items-center gap-2">
                                <Calendar className="w-4 h-4 text-brand-blue" />
                                Select Report Period
                            </label>
                            <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
                                {[
                                    { id: 'today', label: 'Today' },
                                    { id: 'week', label: 'This Week' },
                                    { id: 'month', label: 'This Month' },
                                    { id: 'year', label: 'This Year' },
                                    { id: 'custom', label: 'Custom Range' },
                                ].map((type) => (
                                    <button
                                        key={type.id}
                                        onClick={() => handleReportTypeChange(type.id as any)}
                                        className={`px-4 py-3 rounded-xl text-sm font-medium transition-all ${reportType === type.id
                                            ? 'bg-brand-blue text-white shadow-lg shadow-brand-blue/30'
                                            : 'bg-slate-50 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700'
                                            }`}
                                    >
                                        {type.label}
                                    </button>
                                ))}
                            </div>
                        </div>

                        {/* Date Range Inputs (Conditional) */}
                        {reportType === 'custom' && (
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 p-6 bg-slate-50 dark:bg-slate-800/50 rounded-2xl border border-slate-100 dark:border-slate-800 animate-slideInDown">
                                <div>
                                    <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">
                                        Date From
                                    </label>
                                    <input
                                        type="date"
                                        value={dateFrom}
                                        onChange={(e) => setDateFrom(e.target.value)}
                                        className="w-full px-4 py-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-100 focus:ring-2 focus:ring-brand-blue outline-none transition-all"
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">
                                        Date To
                                    </label>
                                    <input
                                        type="date"
                                        value={dateTo}
                                        onChange={(e) => setDateTo(e.target.value)}
                                        className="w-full px-4 py-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-100 focus:ring-2 focus:ring-brand-blue outline-none transition-all"
                                    />
                                </div>
                            </div>
                        )}

                        {/* Customer Selection */}
                        <div>
                            <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-4 flex items-center gap-2">
                                <Users className="w-4 h-4 text-brand-blue" />
                                Filter by Customer
                            </label>
                            <div className="relative">
                                <Users className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400 pointer-events-none" />
                                <select
                                    value={selectedCustomerId || ''}
                                    onChange={(e) => setSelectedCustomerId(e.target.value || null)}
                                    className="w-full pl-12 pr-4 py-4 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-100 focus:ring-2 focus:ring-brand-blue outline-none appearance-none transition-all"
                                >
                                    <option value="">All Customers</option>
                                    {customers.map((customer) => (
                                        <option key={customer.id} value={customer.id}>
                                            {customer.company}
                                        </option>
                                    ))}
                                </select>
                                <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400">
                                    <ArrowRight className="w-5 h-5 rotate-90" />
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="p-8 bg-slate-50 dark:bg-slate-800/50 border-t border-slate-200 dark:border-slate-800 flex justify-end">
                        <button
                            onClick={handleGenerateReport}
                            className="flex items-center gap-2 px-8 py-4 bg-brand-blue hover:bg-blue-700 text-white rounded-xl shadow-lg shadow-brand-blue/20 font-bold transition-all transform hover:scale-105 active:scale-95"
                        >
                            <Search className="w-5 h-5" />
                            Generate Report
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default InquiryReportFilter;
