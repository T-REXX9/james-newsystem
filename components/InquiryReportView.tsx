
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
    User
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

    if (isLoading) {
        return (
            <div className="flex h-full items-center justify-center bg-slate-50 dark:bg-slate-950">
                <Loader2 className="w-10 h-10 text-brand-blue animate-spin" />
            </div>
        );
    }

    return (
        <div className="flex flex-col h-full bg-slate-50 dark:bg-slate-950 p-6 animate-fadeIn print:p-0 print:bg-white overflow-y-auto">

            {/* Report Header */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4 print:mb-4">
                <div className="flex items-center gap-4">
                    <button
                        onClick={onBack}
                        className="p-2 hover:bg-slate-200 dark:hover:bg-slate-800 rounded-lg transition-colors print:hidden"
                    >
                        <ChevronLeft className="w-6 h-6 text-slate-600 dark:text-slate-400" />
                    </button>
                    <div>
                        <h1 className="text-2xl font-bold text-slate-800 dark:text-white flex items-center gap-2 print:text-black">
                            <FileText className="w-6 h-6 text-brand-blue print:text-black" />
                            Inquiry Report
                        </h1>
                        <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mt-1 text-sm text-slate-500 dark:text-slate-400 print:text-gray-600">
                            <span className="flex items-center gap-1">
                                <Calendar className="w-4 h-4" />
                                {filters.dateFrom} to {filters.dateTo}
                            </span>
                            <span className="flex items-center gap-1">
                                <User className="w-4 h-4" />
                                {!filters.customerId ? 'All Customers' : (inquiries[0]?.customer_company || 'Selected Customer')}
                            </span>
                        </div>
                    </div>
                </div>

                <div className="flex items-center gap-3 print:hidden">
                    <div className="flex bg-white dark:bg-slate-900 p-1 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm">
                        <button
                            onClick={() => setViewMode('summary')}
                            className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${viewMode === 'summary'
                                ? 'bg-brand-blue text-white shadow-sm'
                                : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
                                }`}
                        >
                            <List className="w-4 h-4" /> Summary
                        </button>
                        <button
                            onClick={() => setViewMode('detailed')}
                            className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${viewMode === 'detailed'
                                ? 'bg-brand-blue text-white shadow-sm'
                                : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
                                }`}
                        >
                            <LayoutList className="w-4 h-4" /> Detailed
                        </button>
                    </div>

                    <button
                        onClick={handlePrint}
                        className="flex items-center gap-2 px-4 py-2 bg-brand-blue hover:bg-blue-700 text-white rounded-xl shadow-lg shadow-brand-blue/20 font-medium transition-all"
                    >
                        <Printer className="w-4 h-4" /> Print Report
                    </button>
                </div>
            </div>

            {/* Main Content Area */}
            <div className="flex-1 overflow-hidden bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xl print:shadow-none print:border-none print:overflow-visible flex flex-col">
                <div className="flex-1 overflow-x-auto overflow-y-auto custom-scrollbar print:overflow-visible print:h-auto">
                    {inquiries.length === 0 ? (
                        <div className="flex flex-col items-center justify-center p-20 text-center">
                            <div className="w-20 h-20 bg-slate-50 dark:bg-slate-800 rounded-full flex items-center justify-center mb-4">
                                <FileText className="w-10 h-10 text-slate-300 dark:text-slate-600" />
                            </div>
                            <h3 className="text-xl font-bold text-slate-700 dark:text-slate-300">No inquiry found!</h3>
                            <p className="text-slate-500 dark:text-slate-400 mt-2">Try adjusting your filters to find what you're looking for.</p>
                            <button
                                onClick={onBack}
                                className="mt-6 px-6 py-2 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-lg font-medium transition-colors print:hidden"
                            >
                                Back to Options
                            </button>
                        </div>
                    ) : (
                        <table className="w-full text-left border-collapse print:text-sm">
                            <thead className="bg-slate-50 dark:bg-slate-800/80 sticky top-0 z-10 shadow-sm print:shadow-none print:bg-gray-100 print:static">
                                <tr className="text-xs uppercase text-slate-500 dark:text-slate-400 font-bold border-b border-slate-200 dark:border-slate-700 print:text-black print:border-gray-300">
                                    {viewMode === 'detailed' && <th className="p-4 w-10 print:hidden"></th>}
                                    <th className="p-4 print:p-2">Inquiry Number</th>
                                    <th className="p-4 print:p-2">Sold To (Customer)</th>
                                    <th className="p-4 print:p-2">Date</th>
                                    <th className="p-4 print:p-2">Time</th>
                                    <th className="p-4 text-right print:p-2">Total Amount</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100 dark:divide-slate-800 print:divide-gray-200">
                                {inquiries.map((inquiry) => (
                                    <React.Fragment key={inquiry.id}>
                                        <tr
                                            onClick={() => viewMode === 'detailed' && toggleExpand(inquiry.id)}
                                            className={`transition-colors print:hover:bg-transparent ${viewMode === 'detailed' ? 'cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-800/50' : 'hover:bg-slate-50/50 dark:hover:bg-slate-800/20'
                                                }`}
                                        >
                                            {viewMode === 'detailed' && (
                                                <td className="p-4 print:hidden">
                                                    {expandedInquiryIds.has(inquiry.id) ? (
                                                        <ChevronDown className="w-5 h-5 text-brand-blue" />
                                                    ) : (
                                                        <ChevronRight className="w-5 h-5 text-slate-400" />
                                                    )}
                                                </td>
                                            )}
                                            <td className="p-4 print:p-2">
                                                <div className="font-bold text-slate-800 dark:text-white print:text-black">
                                                    {inquiry.inquiry_no}
                                                </div>
                                            </td>
                                            <td className="p-4 print:p-2">
                                                <div className="text-slate-700 dark:text-slate-300 print:text-black">
                                                    {inquiry.customer_company}
                                                </div>
                                            </td>
                                            <td className="p-4 print:p-2 text-slate-600 dark:text-slate-400 print:text-black">
                                                {new Date(inquiry.sales_date).toLocaleDateString()}
                                            </td>
                                            <td className="p-4 print:p-2 text-slate-600 dark:text-slate-400 print:text-black">
                                                {new Date(inquiry.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                            </td>
                                            <td className="p-4 text-right font-bold text-brand-blue print:text-black print:p-2">
                                                {formatCurrency(inquiry.grand_total || 0)}
                                            </td>
                                        </tr>

                                        {/* Expanded Detail View */}
                                        {viewMode === 'detailed' && expandedInquiryIds.has(inquiry.id) && inquiry.items && (
                                            <tr className="bg-slate-50/50 dark:bg-slate-800/30 print:bg-transparent">
                                                <td colSpan={6} className="p-0">
                                                    <div className="p-4 border-l-4 border-brand-blue m-4 bg-white dark:bg-slate-900 rounded-xl shadow-inner print:m-0 print:shadow-none print:border-l-0">
                                                        <h4 className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-4 flex items-center gap-2">
                                                            Line Item Details
                                                        </h4>
                                                        <div className="overflow-x-auto">
                                                            <table className="w-full text-left text-xs">
                                                                <thead className="text-slate-400 dark:text-slate-500 font-bold border-b border-slate-100 dark:border-slate-800">
                                                                    <tr>
                                                                        <th className="py-2 px-1">Qty</th>
                                                                        <th className="py-2 px-1">Item Code</th>
                                                                        <th className="py-2 px-1">Location</th>
                                                                        <th className="py-2 px-1">Part No</th>
                                                                        <th className="py-2 px-1">Brand</th>
                                                                        <th className="py-2 px-1">Description</th>
                                                                        <th className="py-2 px-1">Unit Price</th>
                                                                        <th className="py-2 px-1">Remark</th>
                                                                        <th className="py-2 px-1 text-right">Line Amount</th>
                                                                    </tr>
                                                                </thead>
                                                                <tbody className="divide-y divide-slate-50 dark:divide-slate-800">
                                                                    {inquiry.items.map((item: any, idx: number) => (
                                                                        <tr key={idx} className="hover:bg-slate-50 dark:hover:bg-slate-800/50">
                                                                            <td className="py-3 px-1 font-bold">{item.qty}</td>
                                                                            <td className="py-3 px-1">{item.item_code}</td>
                                                                            <td className="py-3 px-1">{item.location}</td>
                                                                            <td className="py-3 px-1">{item.part_no}</td>
                                                                            <td className="py-3 px-1">{item.brand || '---'}</td>
                                                                            <td className="py-3 px-1 text-slate-600 dark:text-slate-400">{item.description}</td>
                                                                            <td className="py-3 px-1">{formatCurrency(item.unit_price)}</td>
                                                                            <td className="py-3 px-1 text-slate-500">{item.remark || '---'}</td>
                                                                            <td className="py-3 px-1 text-right font-semibold">{formatCurrency(item.qty * item.unit_price)}</td>
                                                                        </tr>
                                                                    ))}
                                                                    <tr className="border-t-2 border-slate-100 dark:border-slate-800">
                                                                        <td colSpan={8} className="py-4 text-right font-bold text-slate-500 print:text-black">Grand Total:</td>
                                                                        <td className="py-4 text-right font-black text-slate-900 dark:text-white text-sm print:text-black">
                                                                            {formatCurrency(inquiry.grand_total)}
                                                                        </td>
                                                                    </tr>
                                                                </tbody>
                                                            </table>
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
            <div className="hidden print:flex flex-col items-center mt-12 text-[10px] text-gray-500 italic">
                <div className="w-full border-t border-gray-200 mb-2"></div>
                <p>End of Inquiry Report -- Generated on {new Date().toLocaleString()} -- Confidential Information</p>
                <p>TND-OPC Management System</p>
            </div>
        </div>
    );
};

export default InquiryReportView;
