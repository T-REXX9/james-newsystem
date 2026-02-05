import { RealtimeChannel } from '@supabase/supabase-js';
import { supabase } from '../lib/supabaseClient';
import {
  Contact,
  CustomerStatus,
  DailyActivityRecord,
  DailyCallCustomerFilterStatus,
  DailyCallCustomerRow,
  LBCRTORecord,
} from '../types';

export interface DailyCallFilterParams {
  status?: DailyCallCustomerFilterStatus;
  search?: string;
}

export interface DailyActivityDateRange {
  from: string;
  to: string;
}

export interface DailyCallRealtimeCallbacks {
  onInsert?: () => void;
  onUpdate?: () => void;
  onDelete?: () => void;
  onError?: (error: Error) => void;
}

interface PurchaseHistoryRow {
  id: string;
  contact_id: string;
  total_amount?: number;
  purchase_date?: string;
}

interface CustomerMetricRow {
  contact_id: string;
  outstanding_balance?: number;
  average_monthly_purchase?: number;
}

interface CallLogRow {
  id: string;
  contact_id: string;
  occurred_at: string;
  channel: 'call' | 'text';
  notes?: string;
}

export interface WeeklyRangeBucket {
  label: string;
  startDay: number;
  endDay: number;
  month: number;
  year: number;
}

const formatDate = (value?: string | null) => {
  if (!value) return '—';
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return '—';
  return parsed.toLocaleDateString('en-PH', { month: 'short', day: 'numeric', year: 'numeric' });
};

const formatCodeDate = (codeText?: string | null, codeDate?: string | null) => {
  const trimmedText = (codeText || '').trim();
  const formattedDate = formatDate(codeDate);
  if (trimmedText && formattedDate !== '—') {
    return `${trimmedText} (${formattedDate})`;
  }
  if (trimmedText) return trimmedText;
  if (formattedDate !== '—') return formattedDate;
  return '—';
};

const normalizeText = (value: string) => value.trim().toLowerCase();

const mapStatusFilter = (status: DailyCallCustomerFilterStatus): CustomerStatus | null => {
  if (status === 'active') return CustomerStatus.ACTIVE;
  if (status === 'inactive') return CustomerStatus.INACTIVE;
  if (status === 'prospective') return CustomerStatus.PROSPECTIVE;
  return null;
};

const createMonthRange = () => {
  const now = new Date();
  const from = new Date(now.getFullYear(), now.getMonth(), 1);
  const to = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);
  return {
    from: from.toISOString(),
    to: to.toISOString(),
  };
};

export const getWeeklyRangeBuckets = (referenceDate = new Date()): WeeklyRangeBucket[] => {
  const year = referenceDate.getFullYear();
  const month = referenceDate.getMonth();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const monthLabel = referenceDate.toLocaleString('en-US', { month: 'long' }).toUpperCase();
  const buckets: WeeklyRangeBucket[] = [];
  let rangeStart: number | null = null;

  for (let day = 1; day <= daysInMonth; day += 1) {
    const date = new Date(year, month, day);
    const dayOfWeek = date.getDay();
    const isSunday = dayOfWeek === 0;
    const isSaturday = dayOfWeek === 6;

    if (isSunday) {
      if (rangeStart !== null) {
        buckets.push({
          label: `${monthLabel} ${rangeStart}-${day - 1}`,
          startDay: rangeStart,
          endDay: day - 1,
          month,
          year,
        });
        rangeStart = null;
      }
      continue;
    }

    if (rangeStart === null) rangeStart = day;

    if (isSaturday || day === daysInMonth) {
      buckets.push({
        label: `${monthLabel} ${rangeStart}-${day}`,
        startDay: rangeStart,
        endDay: day,
        month,
        year,
      });
      rangeStart = null;
    }
  }

  return buckets;
};

const computeMonthlyOrderTotal = (purchaseRows: PurchaseHistoryRow[]) => {
  const monthRange = createMonthRange();
  return purchaseRows
    .filter((row) => {
      if (!row.purchase_date) return false;
      return row.purchase_date >= monthRange.from && row.purchase_date <= monthRange.to;
    })
    .reduce((sum, row) => sum + (row.total_amount || 0), 0);
};

const computeWeeklyRangeTotals = (
  purchaseRows: PurchaseHistoryRow[],
  buckets: WeeklyRangeBucket[]
) => {
  const totals = buckets.map(() => 0);

  purchaseRows.forEach((row) => {
    if (!row.purchase_date) return;
    const date = new Date(row.purchase_date);
    if (Number.isNaN(date.getTime())) return;

    buckets.forEach((bucket, index) => {
      if (date.getFullYear() !== bucket.year || date.getMonth() !== bucket.month) return;
      const day = date.getDate();
      if (day >= bucket.startDay && day <= bucket.endDay) {
        totals[index] += row.total_amount || 0;
      }
    });
  });

  return totals;
};

const buildActivityByDay = (logs: CallLogRow[]): DailyActivityRecord[] => {
  const map = new Map<string, DailyActivityRecord>();

  logs.forEach((log) => {
    const date = new Date(log.occurred_at);
    if (Number.isNaN(date.getTime())) return;

    const key = date.toISOString().slice(0, 10);
    const existing = map.get(key);
    const nextType = log.channel === 'text' ? 'text' : 'call';

    if (!existing) {
      map.set(key, {
        id: `${log.contact_id}-${key}`,
        contact_id: log.contact_id,
        activity_date: key,
        activity_type: nextType,
        activity_count: 1,
        notes: log.notes,
      });
      return;
    }

    map.set(key, {
      ...existing,
      activity_count: existing.activity_count + 1,
      activity_type: existing.activity_type === 'call' || nextType === 'call' ? 'call' : 'text',
      notes: existing.notes || log.notes,
    });
  });

  return Array.from(map.values()).sort((a, b) => b.activity_date.localeCompare(a.activity_date));
};

const matchesSearch = (contact: Contact, query: string) => {
  if (!query) return true;
  const normalizedQuery = normalizeText(query);

  const searchable = [
    contact.company,
    contact.name,
    contact.city,
    contact.province,
    contact.phone,
    contact.mobile || '',
    contact.salesman,
    contact.deliveryAddress,
  ]
    .join(' ')
    .toLowerCase();

  return searchable.includes(normalizedQuery);
};

export const fetchCustomerDailyActivity = async (
  contactId: string,
  dateRange: DailyActivityDateRange
): Promise<DailyActivityRecord[]> => {
  try {
    const { data, error } = await supabase
      .from('call_logs')
      .select('id, contact_id, occurred_at, channel, notes')
      .eq('contact_id', contactId)
      .gte('occurred_at', dateRange.from)
      .lte('occurred_at', dateRange.to)
      .order('occurred_at', { ascending: false });

    if (error) throw error;
    return buildActivityByDay((data as CallLogRow[]) || []);
  } catch (error) {
    console.error('Error fetching customer daily activity:', error);
    return [];
  }
};

export const fetchLBCRTOData = async (contactId: string): Promise<LBCRTORecord[]> => {
  try {
    const { data, error } = await supabase
      .from('lbc_rto_records')
      .select('id, contact_id, date, tracking_number, reason, status, notes')
      .eq('contact_id', contactId)
      .order('date', { ascending: false });

    if (!error && data) {
      return (data as LBCRTORecord[]) || [];
    }
  } catch (error) {
    console.warn('LBC RTO table unavailable, falling back to sales returns:', error);
  }

  try {
    const { data, error } = await supabase
      .from('sales_returns')
      .select('id, contact_id, return_date, reason, status, notes')
      .eq('contact_id', contactId)
      .order('return_date', { ascending: false });

    if (error) throw error;

    return ((data as Array<{ id: string; contact_id: string; return_date: string; reason?: string; status?: string; notes?: string }>) || []).map(
      (row) => ({
        id: row.id,
        contact_id: row.contact_id,
        date: row.return_date,
        tracking_number: `RTO-${row.id.slice(0, 8).toUpperCase()}`,
        reason: row.reason || 'Return to origin',
        status:
          row.status === 'processed'
            ? 'resolved'
            : row.status === 'cancelled'
              ? 'cancelled'
              : 'pending',
        notes: row.notes,
      })
    );
  } catch (error) {
    console.error('Error fetching fallback LBC RTO data:', error);
    return [];
  }
};

export const fetchCustomersForDailyCall = async (
  filters: DailyCallFilterParams = {}
): Promise<DailyCallCustomerRow[]> => {
  const statusFilter = filters.status || 'all';
  const search = filters.search || '';
  const weeklyRangeBuckets = getWeeklyRangeBuckets();

  try {
    const contactQuery = supabase.from('contacts').select('*').eq('is_deleted', false);

    const statusValue = mapStatusFilter(statusFilter);
    const { data: contactsData, error: contactsError } = statusValue
      ? await contactQuery.eq('status', statusValue)
      : await contactQuery;

    if (contactsError) throw contactsError;

    const contacts = ((contactsData as Contact[]) || []).filter((contact) => matchesSearch(contact, search));

    if (contacts.length === 0) return [];

    const contactIds = contacts.map((contact) => contact.id);
    const monthRange = createMonthRange();

    const [purchaseResponse, metricsResponse, callLogResponse] = await Promise.all([
      supabase
        .from('purchase_history')
        .select('id, contact_id, total_amount, purchase_date')
        .in('contact_id', contactIds),
      supabase
        .from('customer_metrics')
        .select('contact_id, outstanding_balance, average_monthly_purchase')
        .in('contact_id', contactIds),
      supabase
        .from('call_logs')
        .select('id, contact_id, occurred_at, channel, notes')
        .in('contact_id', contactIds)
        .gte('occurred_at', monthRange.from)
        .lte('occurred_at', monthRange.to),
    ]);

    const purchasesByContact = new Map<string, PurchaseHistoryRow[]>();
    ((purchaseResponse.data as PurchaseHistoryRow[]) || []).forEach((row) => {
      if (!purchasesByContact.has(row.contact_id)) purchasesByContact.set(row.contact_id, []);
      purchasesByContact.get(row.contact_id)?.push(row);
    });

    const metricsByContact = new Map<string, CustomerMetricRow>();
    ((metricsResponse.data as CustomerMetricRow[]) || []).forEach((row) => {
      metricsByContact.set(row.contact_id, row);
    });

    const logsByContact = new Map<string, CallLogRow[]>();
    ((callLogResponse.data as CallLogRow[]) || []).forEach((row) => {
      if (!logsByContact.has(row.contact_id)) logsByContact.set(row.contact_id, []);
      logsByContact.get(row.contact_id)?.push(row);
    });

    const rows: DailyCallCustomerRow[] = contacts.map((contact) => {
      const contactPurchases = purchasesByContact.get(contact.id) || [];
      const metrics = metricsByContact.get(contact.id);
      const monthlyOrder = computeMonthlyOrderTotal(contactPurchases);
      const weeklyRangeTotals = computeWeeklyRangeTotals(contactPurchases, weeklyRangeBuckets);
      const activity = buildActivityByDay(logsByContact.get(contact.id) || []);
      const ishinomotoDealerSince = formatDate(contact.ishinomotoDealerSince || contact.dealershipSince);
      const ishinomotoSignageSince = formatDate(contact.ishinomotoSignageSince || contact.signageSince);
      const codeText = contact.codeText || contact.priceGroup || contact.dealershipTerms;
      const codeDateValue = contact.codeDate || contact.dealershipSince || contact.ishinomotoDealerSince;

      return {
        id: contact.id,
        source: contact.referBy || 'Manual',
        assignedTo: contact.salesman || contact.assignedAgent || 'Unassigned',
        assignedDate: formatDate(contact.updated_at),
        clientSince: formatDate(contact.customerSince),
        city: contact.city || '—',
        shopName: contact.company || 'Unnamed Shop',
        contactNumber: contact.mobile || contact.phone || '—',
        codeDate: formatCodeDate(codeText, codeDateValue),
        ishinomotoDealerSince,
        ishinomotoSignageSince,
        quota: Number(contact.dealershipQuota || 0),
        modeOfPayment: contact.terms || '—',
        courier: contact.deliveryAddress ? 'Assigned' : '—',
        status: contact.status,
        outstandingBalance: Number(metrics?.outstanding_balance || contact.balance || 0),
        averageMonthlyOrder: Number(metrics?.average_monthly_purchase || 0),
        monthlyOrder,
        weeklyRangeTotals,
        dailyActivity: activity,
      };
    });

    return rows.sort((a, b) => a.shopName.localeCompare(b.shopName));
  } catch (error) {
    console.error('Error fetching daily call customers:', error);
    return [];
  }
};

export const subscribeToDailyCallMonitoringUpdates = (
  callbacks: DailyCallRealtimeCallbacks
): (() => void) => {
  const channelName = `daily-call-monitoring-${Date.now()}`;
  const channel: RealtimeChannel = supabase.channel(channelName);

  const tables = ['contacts', 'call_logs', 'purchase_history', 'customer_metrics', 'sales_returns'];

  tables.forEach((table) => {
    channel.on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table,
      },
      (payload) => {
        try {
          if (payload.eventType === 'INSERT') callbacks.onInsert?.();
          if (payload.eventType === 'UPDATE') callbacks.onUpdate?.();
          if (payload.eventType === 'DELETE') callbacks.onDelete?.();
        } catch (error) {
          callbacks.onError?.(error as Error);
        }
      }
    );
  });

  channel.subscribe((status) => {
    if (status === 'CHANNEL_ERROR') {
      callbacks.onError?.(new Error('Daily call realtime subscription failed'));
    }
  });

  return () => {
    supabase.removeChannel(channel);
  };
};
