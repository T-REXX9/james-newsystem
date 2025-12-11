import React, { useEffect, useState } from 'react';
import { FileText, CheckCircle, Clock, AlertCircle } from 'lucide-react';
import { SalesReport } from '../types';
import { fetchSalesReports, updateSalesReportApproval } from '../services/supabaseService';

interface SalesReportTabProps {
  contactId: string;
  currentUserId?: string;
  onApprove?: (reportId: string) => void;
}

const SalesReportTab: React.FC<SalesReportTabProps> = ({ contactId, currentUserId, onApprove }) => {
  const [reports, setReports] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadReports = async () => {
      try {
        const data = await fetchSalesReports(contactId);
        setReports(data || []);
      } catch (err) {
        console.error('Error loading sales reports:', err);
      } finally {
        setLoading(false);
      }
    };
    
    loadReports();
  }, [contactId]);

  const handleApprove = async (reportId: string) => {
    try {
      await updateSalesReportApproval(reportId, 'approved', currentUserId);
      setReports(prev => prev.map(r => r.id === reportId ? { ...r, approval_status: 'approved' } : r));
      onApprove?.(reportId);
    } catch (err) {
      console.error('Error approving report:', err);
    }
  };

  const handleReject = async (reportId: string) => {
    try {
      await updateSalesReportApproval(reportId, 'rejected', currentUserId);
      setReports(prev => prev.map(r => r.id === reportId ? { ...r, approval_status: 'rejected' } : r));
    } catch (err) {
      console.error('Error rejecting report:', err);
    }
  };

  if (loading) {
    return <div className="p-6 text-center text-slate-500">Loading reports...</div>;
  }

  if (reports.length === 0) {
    return (
      <div className="p-6 text-center text-slate-500">
        <FileText className="w-8 h-8 mx-auto mb-2 opacity-50" />
        <p>No sales reports yet</p>
      </div>
    );
  }

  return (
    <div className="space-y-4 p-6">
      {reports.map(report => (
        <div key={report.id} className="bg-white dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700 p-4">
          <div className="flex items-start justify-between mb-3">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <h4 className="font-semibold text-slate-800 dark:text-white">
                  Report - {new Date(report.date).toLocaleDateString()} {report.time}
                </h4>
                <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-bold ${
                  report.approval_status === 'approved' ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300' :
                  report.approval_status === 'rejected' ? 'bg-rose-100 text-rose-700 dark:bg-rose-900/30 dark:text-rose-300' :
                  'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-300'
                }`}>
                  {report.approval_status === 'approved' && <CheckCircle className="w-3 h-3" />}
                  {report.approval_status === 'pending' && <Clock className="w-3 h-3" />}
                  {report.approval_status === 'rejected' && <AlertCircle className="w-3 h-3" />}
                  {report.approval_status.charAt(0).toUpperCase() + report.approval_status.slice(1)}
                </span>
              </div>
              <p className="text-sm text-slate-600 dark:text-slate-400">Agent: {report.sales_agent}</p>
            </div>
            <p className="text-lg font-bold text-slate-800 dark:text-white">
              ₱{report.total_amount?.toLocaleString() || '0'}
            </p>
          </div>

          <div className="mb-3">
            <h5 className="text-xs font-semibold text-slate-500 dark:text-slate-400 mb-2">Products:</h5>
            <div className="space-y-1">
              {report.products?.map((product: any, idx: number) => (
                <div key={idx} className="flex justify-between text-sm">
                  <span className="text-slate-700 dark:text-slate-300">
                    {product.name} x{product.quantity}
                  </span>
                  <span className="text-slate-600 dark:text-slate-400">
                    ₱{(product.price * product.quantity).toLocaleString()}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {report.notes && (
            <div className="mb-3 p-2 bg-slate-50 dark:bg-slate-900 rounded text-sm text-slate-600 dark:text-slate-300">
              <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1">Notes:</p>
              {report.notes}
            </div>
          )}

          {report.approval_status === 'pending' && (
            <div className="flex gap-2 pt-3 border-t border-slate-200 dark:border-slate-700">
              <button
                onClick={() => handleApprove(report.id)}
                className="flex-1 px-3 py-2 bg-emerald-500 hover:bg-emerald-600 text-white text-sm font-bold rounded transition-colors"
              >
                Approve
              </button>
              <button
                onClick={() => handleReject(report.id)}
                className="flex-1 px-3 py-2 bg-rose-500 hover:bg-rose-600 text-white text-sm font-bold rounded transition-colors"
              >
                Reject
              </button>
            </div>
          )}
        </div>
      ))}
    </div>
  );
};

export default SalesReportTab;
