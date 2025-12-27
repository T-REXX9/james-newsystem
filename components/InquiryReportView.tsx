
import React, { useState, useEffect } from 'react';
import { getInquiryReportData, getInquiryReportSummary } from '../services/salesInquiryService';
import { SalesInquiry, InquiryReportFilters } from '../types';
import {
    Printer,
    ChevronLeft,
    ChevronDown,
    ChevronRight,
    Loader2,
    FileText,
    LayoutList,
    List,
    Calendar,
    User,
    TrendingUp,
    DollarSign,
    Hash,
    Clock
} from 'lucide-react';

interface InquiryReportViewProps {
    filters: InquiryReportFilters;
    onBack: () => void;
}

const InquiryReportView: React.FC<InquiryReportViewProps> = ({ filters, onBack }) => {
    const [inquiries, setInquiries] = useState<any[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [viewMode, setViewMode] = useState<'summary' | 'detailed'>('summary');
    const [expandedInquiryIds, setExpandedInquiryIds] = useState<Set<string>>(new Set());

    // Computed Stats
    const totalInquiries = inquiries.length;
    const totalAmount = inquiries.reduce((sum, item) => sum + (item.grand_total || 0), 0);
    const averageamount = totalInquiries > 0 ? totalAmount / totalInquiries : 0;
    const dateRangeDays = Math.ceil((new Date(filters.dateTo).getTime() - new Date(filters.dateFrom).getTime()) / (1000 * 3600 * 24)) + 1;

    useEffect(() => {
        loadReportData();
    }, [filters, viewMode]);

    const loadReportData = async () => {
        setIsLoading(true);
        try {
            let data;
            if (viewMode === 'detailed') {
                data = await getInquiryReportData(filters.dateFrom, filters.dateTo, filters.customerId);
            } else {
                data = await getInquiryReportSummary(filters.dateFrom, filters.dateTo, filters.customerId);
            }
            setInquiries(data);
        } finally {
            setIsLoading(false);
        }
    };

    const toggleExpand = (id: string) => {
        const newExpanded = new Set(expandedInquiryIds);
        if (newExpanded.has(id)) {
            newExpanded.delete(id);
        } else {
            newExpanded.add(id);
        }
        setExpandedInquiryIds(newExpanded);
    };

    const handlePrint = () => {
        window.print();
    };

    const formatCurrency = (amount: number) => {
        return new Intl.NumberFormat('en-PH', {
            style: 'currency',
            currency: 'PHP',
        }).format(amount);
    };

    const formatCompactCurrency = (amount: number) => {
        return new Intl.NumberFormat('en-PH', {
            style: 'currency',
            currency: 'PHP',
            notation: "compact",
            maximumFractionDigits: 1
        }).format(amount);
    };

    if (isLoading) {
        return (
            <div className="flex h-full items-center justify-center bg-slate-50 dark:bg-slate-950">
                <div className="flex flex-col items-center gap-4">
                    <div className="relative">
                        <div className="absolute inset-0 bg-brand-blue blur-xl opacity-20 animate-pulse"></div>
                        <Loader2 className="w-12 h-12 text-brand-blue animate-spin relative z-10" />
                    </div>
                    <p className="text-slate-500 font-medium animate-pulse">Generating Report...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="flex flex-col h-full bg-slate-50 dark:bg-slate-950 p-6 md:p-8 animate-fadeIn print:p-0 print:bg-white overflow-y-auto">

            {/* Header & Controls */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4 print:mb-4 animate-slideInUp">
                <div className="flex items-center gap-4">
                    <button
                        onClick={onBack}
                        className="p-2.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-500 hover:text-brand-blue transition-all duration-300 shadow-sm print:hidden group"
                    >
                        <ChevronLeft className="w-5 h-5 group-hover:-translate-x-0.5 transition-transform" />
                    </button>
                    <div>
                        <h1 className="text-2xl font-bold text-slate-800 dark:text-white flex items-center gap-3 print:text-black">
                            <span className="p-2 bg-brand-blue/10 rounded-lg print:hidden">
                                <FileText className="w-6 h-6 text-brand-blue" />
                            </span>
                            Inquiry Report
                        </h1>
                        <div className="flex flex-wrap items-center gap-x-6 gap-y-2 mt-2 text-sm text-slate-500 dark:text-slate-400 print:text-gray-600">
                            <span className="flex items-center gap-2 bg-slate-100 dark:bg-slate-800/50 px-3 py-1 rounded-full">
                                <Calendar className="w-4 h-4 text-brand-blue" />
                                {filters.dateFrom} <span className="text-slate-300 mx-1">→</span> {filters.dateTo}
                            </span>
                            <span className="flex items-center gap-2 bg-slate-100 dark:bg-slate-800/50 px-3 py-1 rounded-full">
                                <User className="w-4 h-4 text-brand-blue" />
                                {!filters.customerId ? 'All Customers' : (inquiries[0]?.customer_company || 'Selected Customer')}
                            </span>
                        </div>
                    </div>
                </div>

                <div className="flex items-center gap-3 print:hidden">
                    <div className="glass-card p-1 rounded-xl flex items-center">
                        <button
                            onClick={() => setViewMode('summary')}
                            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold transition-all duration-300 ${viewMode === 'summary'
                                ? 'bg-brand-blue text-white shadow-md'
                                : 'text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800'
                                }`}
                        >
                            <List className="w-4 h-4" /> Summary
                        </button>
                        <button
                            onClick={() => setViewMode('detailed')}
                            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold transition-all duration-300 ${viewMode === 'detailed'
                                ? 'bg-brand-blue text-white shadow-md'
                                : 'text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800'
                                }`}
                        >
                            <LayoutList className="w-4 h-4" /> Detailed
                        </button>
                    </div>

                    <button
                        onClick={handlePrint}
                        className="flex items-center gap-2 px-5 py-3 bg-slate-900 dark:bg-slate-800 hover:bg-slate-800 dark:hover:bg-slate-700 text-white rounded-xl shadow-lg font-medium transition-all hover:-translate-y-0.5 active:translate-y-0"
                    >
                        <Printer className="w-4 h-4" /> Print
                    </button>
                </div>
            </div>

            {/* Summary Stats Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8 print:hidden animate-slideInUp" style={{ animationDelay: '0.1s' }}>
                <div className="glass-card p-5 rounded-2xl relative overflow-hidden group hover:border-brand-blue/30 transition-colors">
                    <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
                        <Hash className="w-16 h-16 text-brand-blue" />
                    </div>
                    <p className="text-sm font-medium text-slate-500 dark:text-slate-400 mb-1">Total Inquiries</p>
                    <h3 className="text-2xl font-black text-slate-800 dark:text-white animate-countUp">{totalInquiries}</h3>
                    <div className="mt-2 text-xs font-medium text-green-500 flex items-center gap-1">
                        <TrendingUp className="w-3 h-3" />
                        <span>Recorded</span>
                    </div>
                </div>

                <div className="glass-card p-5 rounded-2xl relative overflow-hidden group hover:border-brand-blue/30 transition-colors">
                    <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
                        <DollarSign className="w-16 h-16 text-brand-blue" />
                    </div>
                    <p className="text-sm font-medium text-slate-500 dark:text-slate-400 mb-1">Total Amount</p>
                    <h3 className="text-2xl font-black text-slate-800 dark:text-white animate-countUp" style={{ animationDelay: '0.1s' }}>
                        {formatCompactCurrency(totalAmount)}
                    </h3>
                    <div className="mt-2 text-xs font-medium text-brand-blue flex items-center gap-1">
                        <span>Gross Revenue</span>
                    </div>
                </div>

                <div className="glass-card p-5 rounded-2xl relative overflow-hidden group hover:border-brand-blue/30 transition-colors">
                    <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
                        <TrendingUp className="w-16 h-16 text-brand-blue" />
                    </div>
                    <p className="text-sm font-medium text-slate-500 dark:text-slate-400 mb-1">Average Value</p>
                    <h3 className="text-2xl font-black text-slate-800 dark:text-white animate-countUp" style={{ animationDelay: '0.2s' }}>
                        {formatCompactCurrency(averageamount)}
                    </h3>
                    <div className="mt-2 text-xs font-medium text-slate-400 flex items-center gap-1">
                        <span>Per Inquiry</span>
                    </div>
                </div>

                <div className="glass-card p-5 rounded-2xl relative overflow-hidden group hover:border-brand-blue/30 transition-colors">
                    <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
                        <Clock className="w-16 h-16 text-brand-blue" />
                    </div>
                    <p className="text-sm font-medium text-slate-500 dark:text-slate-400 mb-1">Period Length</p>
                    <h3 className="text-2xl font-black text-slate-800 dark:text-white animate-countUp" style={{ animationDelay: '0.3s' }}>
                        {dateRangeDays} <span className="text-sm font-normal text-slate-500">days</span>
                    </h3>
                    <div className="mt-2 text-xs font-medium text-slate-400 flex items-center gap-1">
                        <span>Selected Range</span>
                    </div>
                </div>
            </div>

            {/* Main Content Area */}
            <div className="flex-1 overflow-hidden glass-card bg-white/50 dark:bg-slate-900/50 rounded-2xl shadow-xl print:shadow-none print:border-none print:overflow-visible flex flex-col animate-slideInUp" style={{ animationDelay: '0.2s' }}>
                <div className="flex-1 overflow-x-auto overflow-y-auto custom-scrollbar print:overflow-visible print:h-auto">
                    {inquiries.length === 0 ? (
                        <div className="flex flex-col items-center justify-center p-20 text-center">
                            <div className="w-24 h-24 bg-slate-50 dark:bg-slate-800 rounded-full flex items-center justify-center mb-6 animate-pulse-subtle">
                                <FileText className="w-12 h-12 text-slate-300 dark:text-slate-600" />
                            </div>
                            <h3 className="text-xl font-bold text-slate-700 dark:text-slate-300">No data available</h3>
                            <p className="text-slate-500 dark:text-slate-400 mt-2 max-w-sm">
                                We couldn't find any inquiries for this period. Try calculating a different date range.
                            </p>
                            <button
                                onClick={onBack}
                                className="mt-8 px-8 py-3 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-xl font-bold transition-colors print:hidden"
                            >
                                Adjust Filters
                            </button>
                        </div>
                    ) : (
                        <table className="w-full text-left border-collapse print:text-sm">
                            <thead className="bg-slate-50/80 dark:bg-slate-800/80 backdrop-blur sticky top-0 z-10 shadow-sm print:shadow-none print:bg-gray-100 print:static">
                                <tr className="text-xs uppercase tracking-wider text-slate-500 dark:text-slate-400 font-bold border-b border-slate-200 dark:border-slate-700 print:text-black print:border-gray-300">
                                    {viewMode === 'detailed' && <th className="p-4 w-10 print:hidden text-center">#</th>}
                                    <th className="p-4 print:p-2">Inquiry Details</th>
                                    <th className="p-4 print:p-2">Customer</th>
                                    <th className="p-4 print:p-2">Date & Time</th>
                                    <th className="p-4 text-right print:p-2">Amount</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100 dark:divide-slate-800 print:divide-gray-200">
                                {inquiries.map((inquiry, index) => (
                                    <React.Fragment key={inquiry.id}>
                                        <tr
                                            onClick={() => viewMode === 'detailed' && toggleExpand(inquiry.id)}
                                            className={`group transition-all duration-200 print:hover:bg-transparent border-l-4 border-transparent ${viewMode === 'detailed'
                                                ? 'cursor-pointer hover:bg-blue-50/50 dark:hover:bg-blue-900/10 hover:border-brand-blue'
                                                : 'hover:bg-slate-50/50 dark:hover:bg-slate-800/20'
                                                }`}
                                            style={{ animationDelay: `${index * 0.05}s` }}
                                        >
                                            {viewMode === 'detailed' && (
                                                <td className="p-4 print:hidden text-center">
                                                    <div className={`transition-transform duration-300 ${expandedInquiryIds.has(inquiry.id) ? 'rotate-180' : ''}`}>
                                                        {expandedInquiryIds.has(inquiry.id) ? (
                                                            <ChevronDown className="w-5 h-5 text-brand-blue" />
                                                        ) : (
                                                            <ChevronDown className="w-5 h-5 text-slate-300 group-hover:text-brand-blue" />
                                                        )}
                                                    </div>
                                                </td>
                                            )}
                                            <td className="p-4 print:p-2">
                                                <div className="font-bold text-slate-800 dark:text-white print:text-black group-hover:text-brand-blue transition-colors">
                                                    {inquiry.inquiry_no}
                                                </div>
                                                <div className="text-xs text-slate-400 dark:text-slate-500 mt-0.5 font-mono">
                                                    ID: {inquiry.id.slice(0, 8)}
                                                </div>
                                            </td>
                                            <td className="p-4 print:p-2">
                                                <div className="font-medium text-slate-700 dark:text-slate-300 print:text-black">
                                                    {inquiry.customer_company}
                                                </div>
                                            </td>
                                            <td className="p-4 print:p-2">
                                                <div className="text-sm text-slate-600 dark:text-slate-400 print:text-black">
                                                    {new Date(inquiry.sales_date).toLocaleDateString()}
                                                </div>
                                                <div className="text-xs text-slate-400 dark:text-slate-500 mt-0.5">
                                                    {new Date(inquiry.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                                </div>
                                            </td>
                                            <td className="p-4 text-right print:p-2">
                                                <span className="inline-flex items-center px-3 py-1 rounded-lg bg-blue-50 dark:bg-blue-900/20 text-brand-blue font-bold text-sm badge-glow">
                                                    {formatCurrency(inquiry.grand_total || 0)}
                                                </span>
                                            </td>
                                        </tr>

                                        {/* Expanded Detail View */}
                                        {viewMode === 'detailed' && inquiry.items && (
                                            <tr className={`transition-all duration-300 overflow-hidden ${expandedInquiryIds.has(inquiry.id) ? 'opacity-100' : 'opacity-0 h-0 hidden'}`}>
                                                <td colSpan={5} className="p-0 bg-slate-50/30 dark:bg-slate-800/20 print:bg-transparent">
                                                    <div className="p-4 md:p-6 print:p-0">
                                                        <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden animate-slideInUp">
                                                            <div className="px-6 py-3 bg-slate-50 dark:bg-slate-800/80 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
                                                                <h4 className="text-xs font-bold text-slate-500 uppercase tracking-widest flex items-center gap-2">
                                                                    <List className="w-3 h-3" /> Line Items
                                                                </h4>
                                                                <span className="text-xs bg-slate-200 dark:bg-slate-700 px-2 py-0.5 rounded text-slate-600 dark:text-slate-300">
                                                                    {inquiry.items.length} items
                                                                </span>
                                                            </div>
                                                            <div className="overflow-x-auto">
                                                                <table className="w-full text-left text-xs">
                                                                    <thead className="text-slate-400 dark:text-slate-500 font-semibold border-b border-slate-100 dark:border-slate-800">
                                                                        <tr>
                                                                            <th className="py-3 px-4 w-16">Qty</th>
                                                                            <th className="py-3 px-4">Item Code</th>
                                                                            <th className="py-3 px-4">Part No</th>
                                                                            <th className="py-3 px-4">Brand</th>
                                                                            <th className="py-3 px-4">Description</th>
                                                                            <th className="py-3 px-4 text-right">Unit Price</th>
                                                                            <th className="py-3 px-4 text-right">Total</th>
                                                                        </tr>
                                                                    </thead>
                                                                    <tbody className="divide-y divide-slate-50 dark:divide-slate-800">
                                                                        {inquiry.items.map((item: any, idx: number) => (
                                                                            <tr key={idx} className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                                                                                <td className="py-3 px-4 font-bold text-slate-700 dark:text-slate-300">{item.qty}</td>
                                                                                <td className="py-3 px-4 font-mono text-slate-600 dark:text-slate-400">{item.item_code}</td>
                                                                                <td className="py-3 px-4">{item.part_no}</td>
                                                                                <td className="py-3 px-4">
                                                                                    <span className="px-2 py-0.5 bg-slate-100 dark:bg-slate-800 rounded text-slate-600 dark:text-slate-400">
                                                                                        {item.brand || '---'}
                                                                                    </span>
                                                                                </td>
                                                                                <td className="py-3 px-4 text-slate-600 dark:text-slate-400 max-w-xs truncate" title={item.description}>
                                                                                    {item.description}
                                                                                </td>
                                                                                <td className="py-3 px-4 text-right font-medium text-slate-600 dark:text-slate-400">{formatCurrency(item.unit_price)}</td>
                                                                                <td className="py-3 px-4 text-right font-bold text-slate-800 dark:text-slate-200">{formatCurrency(item.qty * item.unit_price)}</td>
                                                                            </tr>
                                                                        ))}
                                                                    </tbody>
                                                                    <tfoot className="bg-slate-50 dark:bg-slate-800/30">
                                                                        <tr>
                                                                            <td colSpan={6} className="py-3 px-4 text-right font-bold text-slate-500 uppercase text-[10px] tracking-wider">Grand Total</td>
                                                                            <td className="py-3 px-4 text-right font-black text-brand-blue text-sm">
                                                                                {formatCurrency(inquiry.grand_total)}
                                                                            </td>
                                                                        </tr>
                                                                    </tfoot>
                                                                </table>
                                                            </div>
                                                        </div>
                                                    </div>
                                                </td>
                                            </tr>
                                        )}
                                    </React.Fragment>
                                ))}
                            </tbody>
                        </table>
                    )}
                </div>
            </div>

            {/* Print Footer */}
            <div className="hidden print:flex flex-col items-center mt-auto pt-8 text-[10px] text-gray-400 italic">
                <div className="w-full border-t border-gray-100 mb-2"></div>
                <p>Generated by TND-OPC System on {new Date().toLocaleString()}</p>
            </div>
        </div>
    );
};

export default InquiryReportView;
