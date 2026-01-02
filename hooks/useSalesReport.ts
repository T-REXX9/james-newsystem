import { useState, useEffect, useCallback } from 'react';
import {
  SalesReportFilters,
  SalesReportData,
  SalesReportTransaction,
  SalesReportKPI,
  SalesReportDailySummary,
  SalesReportAgentSummary,
  SalesReportProductSummary,
} from '../types';
import { getSalesReportData } from '../services/salesReportService';
import { subscribeToSalesReportChanges } from '../services/salesReportRealtimeService';

interface UseSalesReportResult {
  data: SalesReportTransaction[];
  kpis: SalesReportKPI | null;
  dailySummary: SalesReportDailySummary[];
  agentSummary: SalesReportAgentSummary[];
  productSummary: SalesReportProductSummary[];
  isLoading: boolean;
  error: Error | null;
  refetch: () => Promise<void>;
}

const emptyKpis: SalesReportKPI = {
  totalRevenue: 0,
  transactionCount: 0,
  avgTransactionValue: 0,
  uniqueCustomers: 0,
  prevTotalRevenue: 0,
  prevTransactionCount: 0,
  prevAvgTransactionValue: 0,
  prevUniqueCustomers: 0,
  revenueGrowthPct: 0,
  transactionGrowthPct: 0,
};

export function useSalesReport(filters: SalesReportFilters): UseSalesReportResult {
  const [data, setData] = useState<SalesReportTransaction[]>([]);
  const [kpis, setKpis] = useState<SalesReportKPI | null>(null);
  const [dailySummary, setDailySummary] = useState<SalesReportDailySummary[]>([]);
  const [agentSummary, setAgentSummary] = useState<SalesReportAgentSummary[]>([]);
  const [productSummary, setProductSummary] = useState<SalesReportProductSummary[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const fetchData = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const result: SalesReportData = await getSalesReportData(filters);
      setData(result.transactions);
      setKpis(result.kpis);
      setDailySummary(result.dailySummary);
      setAgentSummary(result.agentSummary);
      setProductSummary(result.productSummary);
    } catch (err) {
      console.error('Error fetching sales report data:', err);
      setError(err as Error);
      setData([]);
      setKpis(emptyKpis);
      setDailySummary([]);
      setAgentSummary([]);
      setProductSummary([]);
    } finally {
      setIsLoading(false);
    }
  }, [filters.dateFrom, filters.dateTo, filters.agentId, filters.status?.join(','), filters.sourceType?.join(','), filters.viewType, filters.customerId]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  useEffect(() => {
    const unsubscribe = subscribeToSalesReportChanges({
      onDataChange: () => {
        fetchData();
      },
      onError: (err) => {
        console.error('Realtime subscription error:', err);
      },
    });

    return () => {
      unsubscribe();
    };
  }, [fetchData]);

  return {
    data,
    kpis,
    dailySummary,
    agentSummary,
    productSummary,
    isLoading,
    error,
    refetch: fetchData,
  };
}
