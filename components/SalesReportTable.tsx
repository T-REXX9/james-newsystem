import React, { useState, useMemo } from 'react';
import { ChevronDown, ChevronRight, FileText, ShoppingCart, Receipt, Package } from 'lucide-react';
import { SalesReportTransaction, SalesReportSourceType } from '../types';

interface SalesReportTableProps {
  data: SalesReportTransaction[];
  isLoading?: boolean;
  pageSize?: number;
}

type SortField = 'transaction_date' | 'customer_name' | 'agent_name' | 'total_amount' | 'status';
type SortDirection = 'asc' | 'desc';

const formatCurrency = (amount: number) => {
  return new Intl.NumberFormat('en-PH', {
    style: 'currency',
    currency: 'PHP',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
};

const formatDate = (dateStr: string) => {
  const date = new Date(dateStr);
  return date.toLocaleDateString('en-PH', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
};

const getSourceIcon = (sourceType: SalesReportSourceType) => {
  switch (sourceType) {
    case 'sales_report':
      return <FileText className="w-4 h-4" />;
    case 'sales_order':
      return <ShoppingCart className="w-4 h-4" />;
    case 'invoice':
      return <Receipt className="w-4 h-4" />;
    default:
      return <FileText className="w-4 h-4" />;
  }
};

const getSourceLabel = (sourceType: SalesReportSourceType) => {
  switch (sourceType) {
    case 'sales_report':
      return 'Field Report';
    case 'sales_order':
      return 'Sales Order';
    case 'invoice':
      return 'Invoice';
    default:
      return sourceType;
  }
};

const getStatusBadgeStyles = (status: string) => {
  const normalizedStatus = status?.toLowerCase();
  switch (normalizedStatus) {
    case 'approved':
    case 'confirmed':
    case 'paid':
      return 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400';
    case 'pending':
    case 'draft':
      return 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400';
    case 'rejected':
    case 'cancelled':
      return 'bg-rose-100 text-rose-700 dark:bg-rose-900/30 dark:text-rose-400';
    case 'sent':
    case 'converted_to_document':
      return 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400';
    default:
      return 'bg-slate-100 text-slate-700 dark:bg-slate-700 dark:text-slate-300';
  }
};

const SalesReportTable: React.FC<SalesReportTableProps> = ({
  data,
  isLoading,
  pageSize = 20,
}) => {
  const [currentPage, setCurrentPage] = useState(1);
  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set());
  const [sortField, setSortField] = useState<SortField>('transaction_date');
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc');

  const sortedData = useMemo(() => {
    return [...data].sort((a, b) => {
      let comparison = 0;
      switch (sortField) {
        case 'transaction_date':
          comparison = new Date(a.transaction_date).getTime() - new Date(b.transaction_date).getTime();
          break;
        case 'customer_name':
          comparison = (a.customer_name || '').localeCompare(b.customer_name || '');
          break;
        case 'agent_name':
          comparison = (a.agent_name || '').localeCompare(b.agent_name || '');
          break;
        case 'total_amount':
          comparison = a.total_amount - b.total_amount;
          break;
        case 'status':
          comparison = (a.status || '').localeCompare(b.status || '');
          break;
      }
      return sortDirection === 'asc' ? comparison : -comparison;
    });
  }, [data, sortField, sortDirection]);

  const paginatedData = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return sortedData.slice(start, start + pageSize);
  }, [sortedData, currentPage, pageSize]);

  const totalPages = Math.ceil(data.length / pageSize);

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('desc');
    }
  };

  const toggleRowExpand = (id: string) => {
    const newExpanded = new Set(expandedRows);
    if (newExpanded.has(id)) {
      newExpanded.delete(id);
    } else {
      newExpanded.add(id);
    }
    setExpandedRows(newExpanded);
  };

  const SortHeader = ({ field, children }: { field: SortField; children: React.ReactNode }) => (
    <th
      className="px-4 py-3 text-left text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider cursor-pointer hover:text-brand-blue transition-colors"
      onClick={() => handleSort(field)}
    >
      <div className="flex items-center gap-1">
        {children}
        {sortField === field && (
          <span className="text-brand-blue">{sortDirection === 'asc' ? '↑' : '↓'}</span>
        )}
      </div>
    </th>
  );

  if (isLoading) {
    return (
      <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 overflow-hidden">
        <div className="p-4 border-b border-slate-200 dark:border-slate-700">
          <div className="h-6 bg-slate-200 dark:bg-slate-700 rounded animate-pulse w-40" />
        </div>
        <div className="divide-y divide-slate-200 dark:divide-slate-700">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="p-4 flex gap-4">
              <div className="h-4 bg-slate-200 dark:bg-slate-700 rounded animate-pulse flex-1" />
              <div className="h-4 bg-slate-200 dark:bg-slate-700 rounded animate-pulse w-24" />
              <div className="h-4 bg-slate-200 dark:bg-slate-700 rounded animate-pulse w-20" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (data.length === 0) {
    return (
      <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-8 text-center">
        <FileText className="w-12 h-12 mx-auto mb-4 text-slate-400" />
        <h3 className="text-lg font-semibold text-slate-800 dark:text-white mb-2">No Transactions Found</h3>
        <p className="text-slate-500">Try adjusting your filters to see more results.</p>
      </div>
    );
  }

  return (
    <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 overflow-hidden print:border-0">
      <div className="p-4 border-b border-slate-200 dark:border-slate-700 flex items-center justify-between print:hidden">
        <h3 className="text-lg font-semibold text-slate-800 dark:text-white">
          Transactions ({data.length})
        </h3>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead className="bg-slate-50 dark:bg-slate-900 print:bg-gray-100">
            <tr>
              <th className="w-8 px-2" />
              <SortHeader field="transaction_date">Date</SortHeader>
              <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                Type
              </th>
              <SortHeader field="customer_name">Customer</SortHeader>
              <SortHeader field="agent_name">Agent</SortHeader>
              <SortHeader field="total_amount">Amount</SortHeader>
              <SortHeader field="status">Status</SortHeader>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200 dark:divide-slate-700">
            {paginatedData.map((transaction) => (
              <React.Fragment key={transaction.id}>
                <tr
                  className={`hover:bg-slate-50 dark:hover:bg-slate-700/50 cursor-pointer transition-colors ${
                    transaction.status === 'pending' ? 'bg-yellow-50/50 dark:bg-yellow-900/10' : ''
                  }`}
                  onClick={() => toggleRowExpand(transaction.id)}
                >
                  <td className="px-2 py-3">
                    <button className="p-1 hover:bg-slate-200 dark:hover:bg-slate-600 rounded transition-colors">
                      {expandedRows.has(transaction.id) ? (
                        <ChevronDown className="w-4 h-4 text-slate-500" />
                      ) : (
                        <ChevronRight className="w-4 h-4 text-slate-500" />
                      )}
                    </button>
                  </td>
                  <td className="px-4 py-3 text-sm text-slate-800 dark:text-white whitespace-nowrap">
                    {formatDate(transaction.transaction_date)}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <span className="text-slate-500">{getSourceIcon(transaction.source_type)}</span>
                      <span className="text-sm text-slate-600 dark:text-slate-300">
                        {getSourceLabel(transaction.source_type)}
                      </span>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <div>
                      <p className="text-sm font-medium text-slate-800 dark:text-white">
                        {transaction.customer_name}
                      </p>
                      {transaction.customer_company && (
                        <p className="text-xs text-slate-500">{transaction.customer_company}</p>
                      )}
                    </div>
                  </td>
                  <td className="px-4 py-3 text-sm text-slate-600 dark:text-slate-300">
                    {transaction.agent_name}
                  </td>
                  <td className="px-4 py-3 text-sm font-semibold text-slate-800 dark:text-white whitespace-nowrap">
                    {formatCurrency(transaction.total_amount)}
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={`inline-flex px-2 py-1 rounded-full text-xs font-bold ${getStatusBadgeStyles(
                        transaction.status
                      )}`}
                    >
                      {transaction.status?.charAt(0).toUpperCase() + transaction.status?.slice(1).replace(/_/g, ' ')}
                    </span>
                  </td>
                </tr>
                {expandedRows.has(transaction.id) && (
                  <tr className="bg-slate-50 dark:bg-slate-900/50">
                    <td colSpan={7} className="px-8 py-4">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <h4 className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase mb-2">
                            Products
                          </h4>
                          {transaction.products && transaction.products.length > 0 ? (
                            <div className="space-y-1">
                              {transaction.products.map((product, idx) => (
                                <div
                                  key={idx}
                                  className="flex items-center justify-between text-sm bg-white dark:bg-slate-800 rounded px-3 py-2"
                                >
                                  <div className="flex items-center gap-2">
                                    <Package className="w-4 h-4 text-slate-400" />
                                    <span className="text-slate-700 dark:text-slate-300">
                                      {product.name}
                                    </span>
                                    <span className="text-slate-500 text-xs">x{product.quantity}</span>
                                  </div>
                                  <span className="font-medium text-slate-800 dark:text-white">
                                    {formatCurrency(product.price * product.quantity)}
                                  </span>
                                </div>
                              ))}
                            </div>
                          ) : (
                            <p className="text-sm text-slate-500">No products listed</p>
                          )}
                        </div>
                        {transaction.notes && (
                          <div>
                            <h4 className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase mb-2">
                              Notes
                            </h4>
                            <p className="text-sm text-slate-600 dark:text-slate-300 bg-white dark:bg-slate-800 rounded px-3 py-2">
                              {transaction.notes}
                            </p>
                          </div>
                        )}
                      </div>
                    </td>
                  </tr>
                )}
              </React.Fragment>
            ))}
          </tbody>
        </table>
      </div>
      {totalPages > 1 && (
        <div className="p-4 border-t border-slate-200 dark:border-slate-700 flex items-center justify-between print:hidden">
          <p className="text-sm text-slate-500">
            Showing {(currentPage - 1) * pageSize + 1} to{' '}
            {Math.min(currentPage * pageSize, data.length)} of {data.length}
          </p>
          <div className="flex gap-2">
            <button
              onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
              disabled={currentPage === 1}
              className="px-3 py-1.5 rounded-lg border border-slate-300 dark:border-slate-600 text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
            >
              Previous
            </button>
            <div className="flex items-center gap-1">
              {[...Array(Math.min(5, totalPages))].map((_, i) => {
                const page = i + 1;
                return (
                  <button
                    key={page}
                    onClick={() => setCurrentPage(page)}
                    className={`w-8 h-8 rounded-lg text-sm font-medium transition-colors ${
                      currentPage === page
                        ? 'bg-brand-blue text-white'
                        : 'hover:bg-slate-100 dark:hover:bg-slate-700'
                    }`}
                  >
                    {page}
                  </button>
                );
              })}
              {totalPages > 5 && <span className="px-2 text-slate-500">...</span>}
            </div>
            <button
              onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
              disabled={currentPage === totalPages}
              className="px-3 py-1.5 rounded-lg border border-slate-300 dark:border-slate-600 text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
            >
              Next
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default SalesReportTable;
