import { supabase } from '../lib/supabaseClient';
import {
  SalesReportFilters,
  SalesReportTransaction,
  SalesReportKPI,
  SalesReportDailySummary,
  SalesReportAgentSummary,
  SalesReportProductSummary,
  SalesReportData,
  SalesReportSourceType,
} from '../types';

async function fetchSalesReportsData(filters: SalesReportFilters): Promise<SalesReportTransaction[]> {
  const { data, error } = await supabase
    .from('sales_reports')
    .select(`
      id,
      contact_id,
      date,
      time,
      products,
      total_amount,
      currency,
      sales_agent,
      approval_status,
      notes,
      created_at,
      contacts!inner(first_name, last_name, company)
    `)
    .gte('date', filters.dateFrom)
    .lte('date', filters.dateTo);

  if (error) {
    console.error('Error fetching sales reports:', error);
    return [];
  }

  return (data || []).map((row: any) => ({
    id: row.id,
    source_type: 'sales_report' as SalesReportSourceType,
    contact_id: row.contact_id,
    customer_name: row.contacts ? `${row.contacts.first_name || ''} ${row.contacts.last_name || ''}`.trim() : 'Unknown',
    customer_company: row.contacts?.company,
    transaction_date: `${row.date}T${row.time || '00:00:00'}`,
    total_amount: parseFloat(row.total_amount) || 0,
    currency: row.currency || 'PHP',
    agent_name: row.sales_agent || 'Unknown',
    agent_id: undefined,
    status: row.approval_status || 'pending',
    products: row.products || [],
    notes: row.notes,
    created_at: row.created_at,
  }));
}

async function fetchSalesOrdersData(filters: SalesReportFilters): Promise<SalesReportTransaction[]> {
  const { data, error } = await supabase
    .from('sales_orders')
    .select(`
      id,
      contact_id,
      total_amount,
      status,
      notes,
      created_by,
      created_at,
      contacts!inner(first_name, last_name, company),
      profiles:created_by(full_name),
      sales_order_items(
        quantity,
        unit_price,
        products(name)
      )
    `)
    .eq('is_deleted', false)
    .gte('created_at', filters.dateFrom)
    .lte('created_at', filters.dateTo + 'T23:59:59');

  if (error) {
    console.error('Error fetching sales orders:', error);
    return [];
  }

  return (data || []).map((row: any) => ({
    id: row.id,
    source_type: 'sales_order' as SalesReportSourceType,
    contact_id: row.contact_id,
    customer_name: row.contacts ? `${row.contacts.first_name || ''} ${row.contacts.last_name || ''}`.trim() : 'Unknown',
    customer_company: row.contacts?.company,
    transaction_date: row.created_at,
    total_amount: parseFloat(row.total_amount) || 0,
    currency: 'PHP',
    agent_name: row.profiles?.full_name || 'Unknown',
    agent_id: row.created_by,
    status: row.status || 'pending',
    products: (row.sales_order_items || []).map((item: any) => ({
      name: item.products?.name || 'Unknown Product',
      quantity: item.quantity || 0,
      price: parseFloat(item.unit_price) || 0,
    })),
    notes: row.notes,
    created_at: row.created_at,
  }));
}

async function fetchInvoicesData(filters: SalesReportFilters): Promise<SalesReportTransaction[]> {
  const { data, error } = await supabase
    .from('invoices')
    .select(`
      id,
      contact_id,
      total_amount,
      status,
      notes,
      created_by,
      created_at,
      contacts!inner(first_name, last_name, company),
      profiles:created_by(full_name),
      invoice_items(
        quantity,
        unit_price,
        products(name)
      )
    `)
    .eq('is_deleted', false)
    .gte('created_at', filters.dateFrom)
    .lte('created_at', filters.dateTo + 'T23:59:59');

  if (error) {
    console.error('Error fetching invoices:', error);
    return [];
  }

  return (data || []).map((row: any) => ({
    id: row.id,
    source_type: 'invoice' as SalesReportSourceType,
    contact_id: row.contact_id,
    customer_name: row.contacts ? `${row.contacts.first_name || ''} ${row.contacts.last_name || ''}`.trim() : 'Unknown',
    customer_company: row.contacts?.company,
    transaction_date: row.created_at,
    total_amount: parseFloat(row.total_amount) || 0,
    currency: 'PHP',
    agent_name: row.profiles?.full_name || 'Unknown',
    agent_id: row.created_by,
    status: row.status || 'draft',
    products: (row.invoice_items || []).map((item: any) => ({
      name: item.products?.name || 'Unknown Product',
      quantity: item.quantity || 0,
      price: parseFloat(item.unit_price) || 0,
    })),
    notes: row.notes,
    created_at: row.created_at,
  }));
}

export async function getSalesReportTransactions(
  filters: SalesReportFilters
): Promise<SalesReportTransaction[]> {
  const sourceTypes = filters.sourceType || ['sales_report', 'sales_order', 'invoice'];
  
  const promises: Promise<SalesReportTransaction[]>[] = [];
  
  if (sourceTypes.includes('sales_report')) {
    promises.push(fetchSalesReportsData(filters));
  }
  if (sourceTypes.includes('sales_order')) {
    promises.push(fetchSalesOrdersData(filters));
  }
  if (sourceTypes.includes('invoice')) {
    promises.push(fetchInvoicesData(filters));
  }

  const results = await Promise.all(promises);
  let transactions = results.flat();

  if (filters.agentId) {
    transactions = transactions.filter(t => t.agent_id === filters.agentId);
  }

  if (filters.customerId) {
    transactions = transactions.filter(t => t.contact_id === filters.customerId);
  }

  if (filters.status && filters.status.length > 0) {
    transactions = transactions.filter(t => filters.status!.includes(t.status));
  }

  transactions.sort((a, b) => 
    new Date(b.transaction_date).getTime() - new Date(a.transaction_date).getTime()
  );

  return transactions;
}

export async function getSalesReportKPIs(
  filters: SalesReportFilters
): Promise<SalesReportKPI> {
  const transactions = await getSalesReportTransactions(filters);
  
  const daysDiff = Math.ceil(
    (new Date(filters.dateTo).getTime() - new Date(filters.dateFrom).getTime()) / (1000 * 60 * 60 * 24)
  ) + 1;
  
  const prevDateFrom = new Date(filters.dateFrom);
  prevDateFrom.setDate(prevDateFrom.getDate() - daysDiff);
  const prevDateTo = new Date(filters.dateFrom);
  prevDateTo.setDate(prevDateTo.getDate() - 1);

  const prevFilters: SalesReportFilters = {
    ...filters,
    dateFrom: prevDateFrom.toISOString().split('T')[0],
    dateTo: prevDateTo.toISOString().split('T')[0],
  };

  let prevTransactions: SalesReportTransaction[] = [];
  try {
    prevTransactions = await getSalesReportTransactions(prevFilters);
  } catch {
    prevTransactions = [];
  }

  const totalRevenue = transactions.reduce((sum, t) => sum + t.total_amount, 0);
  const transactionCount = transactions.length;
  const avgTransactionValue = transactionCount > 0 ? totalRevenue / transactionCount : 0;
  const uniqueCustomers = new Set(transactions.map(t => t.contact_id)).size;

  const prevTotalRevenue = prevTransactions.reduce((sum, t) => sum + t.total_amount, 0);
  const prevTransactionCount = prevTransactions.length;
  const prevAvgTransactionValue = prevTransactionCount > 0 ? prevTotalRevenue / prevTransactionCount : 0;
  const prevUniqueCustomers = new Set(prevTransactions.map(t => t.contact_id)).size;

  const revenueGrowthPct = prevTotalRevenue > 0 
    ? ((totalRevenue - prevTotalRevenue) / prevTotalRevenue) * 100 
    : 0;
  const transactionGrowthPct = prevTransactionCount > 0 
    ? ((transactionCount - prevTransactionCount) / prevTransactionCount) * 100 
    : 0;

  return {
    totalRevenue,
    transactionCount,
    avgTransactionValue,
    uniqueCustomers,
    prevTotalRevenue,
    prevTransactionCount,
    prevAvgTransactionValue,
    prevUniqueCustomers,
    revenueGrowthPct,
    transactionGrowthPct,
  };
}

export async function getSalesReportDailySummary(
  filters: SalesReportFilters
): Promise<SalesReportDailySummary[]> {
  const transactions = await getSalesReportTransactions(filters);
  
  const dailyMap = new Map<string, {
    date: string;
    transactions: SalesReportTransaction[];
  }>();

  transactions.forEach(t => {
    const date = t.transaction_date.split('T')[0];
    if (!dailyMap.has(date)) {
      dailyMap.set(date, { date, transactions: [] });
    }
    dailyMap.get(date)!.transactions.push(t);
  });

  const result: SalesReportDailySummary[] = [];
  dailyMap.forEach(({ date, transactions: dayTransactions }) => {
    const totalRevenue = dayTransactions.reduce((sum, t) => sum + t.total_amount, 0);
    result.push({
      date,
      transactionCount: dayTransactions.length,
      totalRevenue,
      avgTransactionValue: dayTransactions.length > 0 ? totalRevenue / dayTransactions.length : 0,
      uniqueCustomers: new Set(dayTransactions.map(t => t.contact_id)).size,
    });
  });

  return result.sort((a, b) => a.date.localeCompare(b.date));
}

export async function getSalesReportAgentSummary(
  filters: SalesReportFilters
): Promise<SalesReportAgentSummary[]> {
  const transactions = await getSalesReportTransactions(filters);
  
  const agentMap = new Map<string, {
    agentName: string;
    agentId?: string;
    transactions: SalesReportTransaction[];
  }>();

  transactions.forEach(t => {
    const key = t.agent_name || 'Unknown';
    if (!agentMap.has(key)) {
      agentMap.set(key, { agentName: key, agentId: t.agent_id, transactions: [] });
    }
    agentMap.get(key)!.transactions.push(t);
  });

  const result: SalesReportAgentSummary[] = [];
  agentMap.forEach(({ agentName, agentId, transactions: agentTransactions }) => {
    const totalRevenue = agentTransactions.reduce((sum, t) => sum + t.total_amount, 0);
    result.push({
      agentName,
      agentId,
      transactionCount: agentTransactions.length,
      totalRevenue,
      avgTransactionValue: agentTransactions.length > 0 ? totalRevenue / agentTransactions.length : 0,
      uniqueCustomers: new Set(agentTransactions.map(t => t.contact_id)).size,
    });
  });

  return result.sort((a, b) => b.totalRevenue - a.totalRevenue);
}

export async function getSalesReportProductSummary(
  filters: SalesReportFilters
): Promise<SalesReportProductSummary[]> {
  const transactions = await getSalesReportTransactions(filters);
  
  const productMap = new Map<string, {
    productName: string;
    totalQuantity: number;
    totalRevenue: number;
    transactionIds: Set<string>;
  }>();

  transactions.forEach(t => {
    if (t.products && Array.isArray(t.products)) {
      t.products.forEach(p => {
        const key = p.name || 'Unknown Product';
        if (!productMap.has(key)) {
          productMap.set(key, {
            productName: key,
            totalQuantity: 0,
            totalRevenue: 0,
            transactionIds: new Set(),
          });
        }
        const entry = productMap.get(key)!;
        entry.totalQuantity += p.quantity || 0;
        entry.totalRevenue += (p.price || 0) * (p.quantity || 0);
        entry.transactionIds.add(t.id);
      });
    }
  });

  const result: SalesReportProductSummary[] = [];
  productMap.forEach(({ productName, totalQuantity, totalRevenue, transactionIds }) => {
    result.push({
      productName,
      totalQuantity,
      totalRevenue,
      transactionCount: transactionIds.size,
    });
  });

  return result.sort((a, b) => b.totalRevenue - a.totalRevenue);
}

export async function getSalesReportData(
  filters: SalesReportFilters
): Promise<SalesReportData> {
  const transactions = await getSalesReportTransactions(filters);
  
  const daysDiff = Math.ceil(
    (new Date(filters.dateTo).getTime() - new Date(filters.dateFrom).getTime()) / (1000 * 60 * 60 * 24)
  ) + 1;
  
  const prevDateFrom = new Date(filters.dateFrom);
  prevDateFrom.setDate(prevDateFrom.getDate() - daysDiff);
  const prevDateTo = new Date(filters.dateFrom);
  prevDateTo.setDate(prevDateTo.getDate() - 1);

  const prevFilters: SalesReportFilters = {
    ...filters,
    dateFrom: prevDateFrom.toISOString().split('T')[0],
    dateTo: prevDateTo.toISOString().split('T')[0],
  };

  let prevTransactions: SalesReportTransaction[] = [];
  try {
    prevTransactions = await getSalesReportTransactions(prevFilters);
  } catch {
    prevTransactions = [];
  }

  const totalRevenue = transactions.reduce((sum, t) => sum + t.total_amount, 0);
  const transactionCount = transactions.length;
  const avgTransactionValue = transactionCount > 0 ? totalRevenue / transactionCount : 0;
  const uniqueCustomers = new Set(transactions.map(t => t.contact_id)).size;

  const prevTotalRevenue = prevTransactions.reduce((sum, t) => sum + t.total_amount, 0);
  const prevTransactionCount = prevTransactions.length;
  const prevAvgTransactionValue = prevTransactionCount > 0 ? prevTotalRevenue / prevTransactionCount : 0;
  const prevUniqueCustomers = new Set(prevTransactions.map(t => t.contact_id)).size;

  const revenueGrowthPct = prevTotalRevenue > 0 
    ? ((totalRevenue - prevTotalRevenue) / prevTotalRevenue) * 100 
    : 0;
  const transactionGrowthPct = prevTransactionCount > 0 
    ? ((transactionCount - prevTransactionCount) / prevTransactionCount) * 100 
    : 0;

  const kpis: SalesReportKPI = {
    totalRevenue,
    transactionCount,
    avgTransactionValue,
    uniqueCustomers,
    prevTotalRevenue,
    prevTransactionCount,
    prevAvgTransactionValue,
    prevUniqueCustomers,
    revenueGrowthPct,
    transactionGrowthPct,
  };

  const dailyMap = new Map<string, SalesReportTransaction[]>();
  transactions.forEach(t => {
    const date = t.transaction_date.split('T')[0];
    if (!dailyMap.has(date)) {
      dailyMap.set(date, []);
    }
    dailyMap.get(date)!.push(t);
  });

  const dailySummary: SalesReportDailySummary[] = [];
  dailyMap.forEach((dayTransactions, date) => {
    const dayRevenue = dayTransactions.reduce((sum, t) => sum + t.total_amount, 0);
    dailySummary.push({
      date,
      transactionCount: dayTransactions.length,
      totalRevenue: dayRevenue,
      avgTransactionValue: dayTransactions.length > 0 ? dayRevenue / dayTransactions.length : 0,
      uniqueCustomers: new Set(dayTransactions.map(t => t.contact_id)).size,
    });
  });
  dailySummary.sort((a, b) => a.date.localeCompare(b.date));

  const agentMap = new Map<string, { agentId?: string; transactions: SalesReportTransaction[] }>();
  transactions.forEach(t => {
    const key = t.agent_name || 'Unknown';
    if (!agentMap.has(key)) {
      agentMap.set(key, { agentId: t.agent_id, transactions: [] });
    }
    agentMap.get(key)!.transactions.push(t);
  });

  const agentSummary: SalesReportAgentSummary[] = [];
  agentMap.forEach(({ agentId, transactions: agentTransactions }, agentName) => {
    const agentRevenue = agentTransactions.reduce((sum, t) => sum + t.total_amount, 0);
    agentSummary.push({
      agentName,
      agentId,
      transactionCount: agentTransactions.length,
      totalRevenue: agentRevenue,
      avgTransactionValue: agentTransactions.length > 0 ? agentRevenue / agentTransactions.length : 0,
      uniqueCustomers: new Set(agentTransactions.map(t => t.contact_id)).size,
    });
  });
  agentSummary.sort((a, b) => b.totalRevenue - a.totalRevenue);

  const productMap = new Map<string, { totalQuantity: number; totalRevenue: number; transactionIds: Set<string> }>();
  transactions.forEach(t => {
    if (t.products && Array.isArray(t.products)) {
      t.products.forEach(p => {
        const key = p.name || 'Unknown Product';
        if (!productMap.has(key)) {
          productMap.set(key, { totalQuantity: 0, totalRevenue: 0, transactionIds: new Set() });
        }
        const entry = productMap.get(key)!;
        entry.totalQuantity += p.quantity || 0;
        entry.totalRevenue += (p.price || 0) * (p.quantity || 0);
        entry.transactionIds.add(t.id);
      });
    }
  });

  const productSummary: SalesReportProductSummary[] = [];
  productMap.forEach(({ totalQuantity, totalRevenue, transactionIds }, productName) => {
    productSummary.push({
      productName,
      totalQuantity,
      totalRevenue,
      transactionCount: transactionIds.size,
    });
  });
  productSummary.sort((a, b) => b.totalRevenue - a.totalRevenue);

  return {
    transactions,
    kpis,
    dailySummary,
    agentSummary,
    productSummary,
  };
}

export async function getAgentsList(): Promise<{ id: string; name: string }[]> {
  const { data, error } = await supabase
    .from('profiles')
    .select('id, full_name')
    .order('full_name');

  if (error) {
    console.error('Error fetching agents:', error);
    return [];
  }

  return (data || []).map((p: any) => ({
    id: p.id,
    name: p.full_name || 'Unknown',
  }));
}
