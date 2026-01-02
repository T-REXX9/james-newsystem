import {
  SalesReportFilters,
  SalesReportTransaction,
  SalesReportKPI,
  SalesReportAgentSummary,
  SalesReportProductSummary,
} from '../types';

interface ExportData {
  filters: SalesReportFilters;
  transactions: SalesReportTransaction[];
  kpis: SalesReportKPI | null;
  agentSummary: SalesReportAgentSummary[];
  productSummary: SalesReportProductSummary[];
}

const formatCurrency = (amount: number) => {
  return amount.toFixed(2);
};

const formatDate = (dateStr: string) => {
  const date = new Date(dateStr);
  return date.toLocaleDateString('en-PH', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
};

const escapeCSV = (value: any): string => {
  if (value === null || value === undefined) return '';
  const str = String(value);
  if (str.includes(',') || str.includes('"') || str.includes('\n')) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
};

function arrayToCSV(headers: string[], rows: any[][]): string {
  const headerRow = headers.map(escapeCSV).join(',');
  const dataRows = rows.map(row => row.map(escapeCSV).join(',')).join('\n');
  return `${headerRow}\n${dataRows}`;
}

function downloadCSV(content: string, filename: string) {
  const blob = new Blob([content], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  const url = URL.createObjectURL(blob);
  link.setAttribute('href', url);
  link.setAttribute('download', filename);
  link.style.visibility = 'hidden';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

export async function exportSalesReportToExcel(data: ExportData): Promise<void> {
  const transactionHeaders = ['Date', 'Type', 'Customer', 'Company', 'Agent', 'Amount (PHP)', 'Status', 'Notes'];
  const transactionRows = data.transactions.map((t) => [
    formatDate(t.transaction_date),
    t.source_type === 'sales_report' ? 'Field Report' :
      t.source_type === 'sales_order' ? 'Sales Order' : 'Invoice',
    t.customer_name,
    t.customer_company || '',
    t.agent_name,
    formatCurrency(t.total_amount),
    t.status,
    t.notes || '',
  ]);

  const summaryLines = [
    ['Sales Report Summary'],
    [''],
    ['Date Range', `${data.filters.dateFrom} to ${data.filters.dateTo}`],
    ['View Type', data.filters.viewType === 'company' ? 'Company-wide' : 'By Agent'],
    [''],
    ['Key Metrics'],
    ['Total Revenue (PHP)', data.kpis ? formatCurrency(data.kpis.totalRevenue) : '0'],
    ['Total Transactions', String(data.kpis?.transactionCount || 0)],
    ['Average Transaction (PHP)', data.kpis ? formatCurrency(data.kpis.avgTransactionValue) : '0'],
    ['Unique Customers', String(data.kpis?.uniqueCustomers || 0)],
    [''],
    ['Comparison vs Previous Period'],
    ['Previous Revenue (PHP)', data.kpis ? formatCurrency(data.kpis.prevTotalRevenue) : '0'],
    ['Revenue Growth %', data.kpis ? `${data.kpis.revenueGrowthPct.toFixed(1)}%` : '0%'],
    [''],
    [''],
    ...transactionRows.map((row, i) => i === 0 ? transactionHeaders : []).filter(r => r.length > 0),
    ...transactionRows,
  ];

  const csv = summaryLines.map(row => row.map(escapeCSV).join(',')).join('\n');
  
  const fullContent = `${csv}\n\n` +
    `\nBy Agent\n${arrayToCSV(
      ['Agent', 'Total Revenue (PHP)', 'Transactions', 'Avg Transaction (PHP)', 'Customers'],
      data.agentSummary.map(a => [a.agentName, formatCurrency(a.totalRevenue), a.transactionCount, formatCurrency(a.avgTransactionValue), a.uniqueCustomers])
    )}\n\n` +
    `\nBy Product\n${arrayToCSV(
      ['Product', 'Total Revenue (PHP)', 'Quantity Sold', 'Transactions'],
      data.productSummary.map(p => [p.productName, formatCurrency(p.totalRevenue), p.totalQuantity, p.transactionCount])
    )}`;

  const transactionsCSV = arrayToCSV(transactionHeaders, transactionRows);

  const fileName = `sales-report-${data.filters.dateFrom}-to-${data.filters.dateTo}.csv`;
  downloadCSV(transactionsCSV, fileName);
}
