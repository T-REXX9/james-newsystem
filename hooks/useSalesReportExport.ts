import { useState, useCallback } from 'react';
import {
  SalesReportFilters,
  SalesReportTransaction,
  SalesReportKPI,
  SalesReportAgentSummary,
  SalesReportProductSummary,
} from '../types';

interface UseSalesReportExportResult {
  exportPDF: () => void;
  exportExcel: () => Promise<void>;
  isExporting: boolean;
}

interface ExportData {
  filters: SalesReportFilters;
  transactions: SalesReportTransaction[];
  kpis: SalesReportKPI | null;
  agentSummary: SalesReportAgentSummary[];
  productSummary: SalesReportProductSummary[];
}

export function useSalesReportExport(data: ExportData): UseSalesReportExportResult {
  const [isExporting, setIsExporting] = useState(false);

  const exportPDF = useCallback(() => {
    window.print();
  }, []);

  const exportExcel = useCallback(async () => {
    setIsExporting(true);
    try {
      const { exportSalesReportToExcel } = await import('../utils/salesReportExcelExport');
      await exportSalesReportToExcel(data);
    } catch (error) {
      console.error('Error exporting to Excel:', error);
    } finally {
      setIsExporting(false);
    }
  }, [data]);

  return {
    exportPDF,
    exportExcel,
    isExporting,
  };
}
