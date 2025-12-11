import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  AlertCircle,
  ArrowUpRight,
  BarChart3,
  Bell,
  Calendar,
  CheckCircle2,
  ClipboardList,
  Clock,
  Filter,
  Loader2,
  MessageSquare,
  Package,
  Phone,
  PhoneCall,
  PhoneForwarded,
  PhilippinePeso,
  RefreshCw,
  Search,
  ShieldAlert,
  Target,
  TrendingUp,
  UserCheck,
  UserPlus,
  UserX,
  Users
} from 'lucide-react';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from 'recharts';
import AgentCallActivity from './AgentCallActivity';
import {
  fetchCallLogs,
  fetchContacts,
  fetchInquiries,
  fetchPurchases,
  fetchTeamMessages,
  subscribeToCallMonitoringUpdates
} from '../services/supabaseService';
import {
  CallLogEntry,
  Contact,
  CustomerStatus,
  Inquiry,
  Purchase,
  TeamMessage,
  UserProfile
} from '../types';

interface DailyCallMonitoringViewProps {
  currentUser: UserProfile | null;
}

interface NotificationItem {
  id: string;
  title: string;
  message: string;
  timestamp: string;
  type: 'report' | 'stock';
}

interface NotificationWithRead extends NotificationItem {
  read: boolean;
}

interface VirtualizedListOptions {
  itemHeight?: number;
  viewportHeight?: number;
  overscan?: number;
}

const PIE_COLORS = ['#2563eb', '#0ea5e9', '#059669', '#f97316'];

const isWithinCurrentMonth = (value?: string | null) => {
  if (!value) return false;
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return false;
  const now = new Date();
  return parsed.getFullYear() === now.getFullYear() && parsed.getMonth() === now.getMonth();
};

const getCurrentMonthPurchases = (purchases: Purchase[]) =>
  purchases.filter((purchase) => isWithinCurrentMonth(purchase.purchased_at) && purchase.status === 'paid');

const clientsNoPurchaseThisMonth = (contacts: Contact[], purchases: Purchase[]) => {
  const currentIds = new Set(
    getCurrentMonthPurchases(purchases).map((purchase) => purchase.contact_id)
  );
  return contacts.filter((contact) => !currentIds.has(contact.id));
};

const calculatePriority = (contact: Contact, daysSinceContact: number, totalSales: number) => {
  return (daysSinceContact * 2) + totalSales / 10000 + (contact.status === CustomerStatus.ACTIVE ? 50 : 0);
};

const formatCurrency = (value: number) =>
  new Intl.NumberFormat('en-PH', { style: 'currency', currency: 'PHP', maximumFractionDigits: 0 }).format(value);

const formatDate = (value?: string | null) => {
  if (!value) return '—';
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return '—';
  return parsed.toLocaleDateString('en-PH', { month: 'short', day: 'numeric' });
};

const formatRelativeTime = (value?: string | null) => {
  if (!value) return 'No activity yet';
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return 'No activity yet';
  const diffMs = Date.now() - parsed.getTime();
  const minutes = Math.max(1, Math.round(diffMs / 60000));
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.round(hours / 24);
  if (days < 30) return `${days}d ago`;
  const months = Math.round(days / 30);
  return `${months}mo ago`;
};

const getDaysSince = (value?: string | null) => {
  if (!value) return 999;
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return 999;
  const diffMs = Date.now() - parsed.getTime();
  return Math.max(0, Math.round(diffMs / 86400000));
};

const formatComment = (value?: string | null) => {
  if (!value) return 'No notes provided';
  const trimmed = value.trim();
  if (!trimmed) return 'No notes provided';
  return trimmed.length > 90 ? `${trimmed.slice(0, 87)}...` : trimmed;
};

const useVirtualizedList = <T,>(items: T[], options: VirtualizedListOptions = {}) => {
  const { itemHeight = 96, viewportHeight = 320, overscan = 3 } = options;
  const [scrollTop, setScrollTop] = useState(0);

  const handleScroll = useCallback((event: React.UIEvent<HTMLDivElement>) => {
    setScrollTop(event.currentTarget.scrollTop);
  }, []);

  const startIndex = Math.max(0, Math.floor(scrollTop / itemHeight) - overscan);
  const visibleCount = Math.ceil(viewportHeight / itemHeight) + overscan * 2;
  const endIndex = Math.min(items.length, startIndex + visibleCount);

  const visibleItems = useMemo(() => items.slice(startIndex, endIndex), [items, startIndex, endIndex]);
  const offsetTop = startIndex * itemHeight;
  const totalHeight = items.length * itemHeight;

  return { visibleItems, offsetTop, totalHeight, handleScroll, viewportHeight };
};

const statusBadgeClasses = (status: CustomerStatus) => {
  switch (status) {
    case CustomerStatus.ACTIVE:
      return 'bg-emerald-50 text-emerald-600 dark:bg-emerald-900/30 dark:text-emerald-300';
    case CustomerStatus.INACTIVE:
      return 'bg-amber-50 text-amber-600 dark:bg-amber-900/30 dark:text-amber-300';
    case CustomerStatus.PROSPECTIVE:
      return 'bg-blue-50 text-blue-600 dark:bg-blue-900/30 dark:text-blue-300';
    default:
      return 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300';
  }
};

const priorityBadgeClasses = (priority: number) => {
  if (priority >= 150) {
    return 'bg-rose-50 text-rose-600 dark:bg-rose-900/30 dark:text-rose-300';
  }
  if (priority >= 110) {
    return 'bg-amber-50 text-amber-600 dark:bg-amber-900/30 dark:text-amber-300';
  }
  return 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300';
};

const DailyCallMonitoringView: React.FC<DailyCallMonitoringViewProps> = ({ currentUser }) => {
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [callLogs, setCallLogs] = useState<CallLogEntry[]>([]);
  const [inquiries, setInquiries] = useState<Inquiry[]>([]);
  const [purchases, setPurchases] = useState<Purchase[]>([]);
  const [teamMessages, setTeamMessages] = useState<TeamMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedClientId, setSelectedClientId] = useState<string | null>(null);

  const [repFilter, setRepFilter] = useState('All');
  const [provinceFilter, setProvinceFilter] = useState('All');
  const [statusFilters, setStatusFilters] = useState<CustomerStatus[]>([]);
  const [noPurchaseOnly, setNoPurchaseOnly] = useState(false);
  const [searchValue, setSearchValue] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [sortField, setSortField] = useState<'priority' | 'lastContact' | 'lastPurchase' | 'salesValue'>('priority');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');
  const [readNotifications, setReadNotifications] = useState<Set<string>>(() => new Set());

  const agentName = currentUser?.full_name || '';

  const loadAgentData = useCallback(async () => {
    if (!agentName) {
      setContacts([]);
      setCallLogs([]);
      setInquiries([]);
      setPurchases([]);
      setTeamMessages([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    try {
      const [contactData, callLogData, inquiryData, purchaseData, messageData] = await Promise.all([
        fetchContacts(),
        fetchCallLogs(),
        fetchInquiries(),
        fetchPurchases(),
        fetchTeamMessages()
      ]);

      const assignedContacts = contactData.filter((contact) => contact.salesman === agentName);
      const contactIds = new Set(assignedContacts.map((contact) => contact.id));

      setContacts(assignedContacts);
      setCallLogs(callLogData.filter((log) => log.agent_name === agentName));
      setInquiries(inquiryData.filter((inquiry) => contactIds.has(inquiry.contact_id)));
      setPurchases(purchaseData.filter((purchase) => contactIds.has(purchase.contact_id)));
      setTeamMessages(messageData.filter((message) => message.is_from_owner));
    } catch (error) {
      console.error('Error loading daily call monitoring data', error);
    } finally {
      setLoading(false);
    }
  }, [agentName]);

  useEffect(() => {
    loadAgentData();
  }, [loadAgentData]);

  useEffect(() => {
    const unsubscribe = subscribeToCallMonitoringUpdates(() => {
      loadAgentData();
    });
    return () => {
      unsubscribe();
    };
  }, [loadAgentData]);

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedSearch(searchValue.trim().toLowerCase());
    }, 300);
    return () => clearTimeout(handler);
  }, [searchValue]);

  useEffect(() => {
    if (contacts.length && !selectedClientId) {
      setSelectedClientId(contacts[0].id);
    }
  }, [contacts, selectedClientId]);

  const selectedClient = useMemo(
    () => contacts.find((contact) => contact.id === selectedClientId) || null,
    [contacts, selectedClientId]
  );

  const purchasesByContact = useMemo(() => {
    const map = new Map<string, Purchase[]>();
    purchases.forEach((purchase) => {
      if (!map.has(purchase.contact_id)) {
        map.set(purchase.contact_id, []);
      }
      map.get(purchase.contact_id)!.push(purchase);
    });
    map.forEach((value) => value.sort((a, b) => Date.parse(b.purchased_at) - Date.parse(a.purchased_at)));
    return map;
  }, [purchases]);

  const callLogsByContact = useMemo(() => {
    const map = new Map<string, CallLogEntry[]>();
    callLogs.forEach((log) => {
      if (!map.has(log.contact_id)) {
        map.set(log.contact_id, []);
      }
      map.get(log.contact_id)!.push(log);
    });
    map.forEach((value) => value.sort((a, b) => Date.parse(b.occurred_at) - Date.parse(a.occurred_at)));
    return map;
  }, [callLogs]);

  const inquiriesByContact = useMemo(() => {
    const map = new Map<string, Inquiry[]>();
    inquiries.forEach((inquiry) => {
      if (!map.has(inquiry.contact_id)) {
        map.set(inquiry.contact_id, []);
      }
      map.get(inquiry.contact_id)!.push(inquiry);
    });
    map.forEach((value) => value.sort((a, b) => Date.parse(b.occurred_at) - Date.parse(a.occurred_at)));
    return map;
  }, [inquiries]);

  const lastContactMap = useMemo(() => {
    const map = new Map<string, string>();
    contacts.forEach((contact) => {
      if (contact.lastContactDate) {
        map.set(contact.id, contact.lastContactDate);
      }
    });
    callLogs.forEach((log) => {
      const current = map.get(log.contact_id);
      if (!current || Date.parse(log.occurred_at) > Date.parse(current)) {
        map.set(log.contact_id, log.occurred_at);
      }
    });
    inquiries.forEach((inquiry) => {
      const current = map.get(inquiry.contact_id);
      if (!current || Date.parse(inquiry.occurred_at) > Date.parse(current)) {
        map.set(inquiry.contact_id, inquiry.occurred_at);
      }
    });
    return map;
  }, [contacts, callLogs, inquiries]);

  const currentMonthPurchases = useMemo(() => getCurrentMonthPurchases(purchases), [purchases]);
  const quota = currentUser?.monthly_quota || 1_500_000;
  const achievements = useMemo(
    () => currentMonthPurchases.reduce((sum, purchase) => sum + (purchase.amount || 0), 0),
    [currentMonthPurchases]
  );
  const percentAchieved = Math.min(100, Math.round((achievements / quota) * 100 || 0));
  const remainingQuota = Math.max(0, quota - achievements);

  const noPurchaseContacts = useMemo(
    () => clientsNoPurchaseThisMonth(contacts, purchases),
    [contacts, purchases]
  );
  const noPurchaseSet = useMemo(() => new Set(noPurchaseContacts.map((contact) => contact.id)), [noPurchaseContacts]);

  const categorizedEntries = useMemo(() => {
    const buildEntry = (contact: Contact) => {
      const lastContact = lastContactMap.get(contact.id);
      const lastPurchase = purchasesByContact.get(contact.id)?.find((purchase) => purchase.status === 'paid')?.purchased_at;
      const totalSales = purchasesByContact
        .get(contact.id)
        ?.filter((purchase) => purchase.status === 'paid')
        .reduce((sum, purchase) => sum + purchase.amount, 0) || 0;
      return {
        contact,
        lastContact,
        lastPurchase,
        priority: calculatePriority(contact, getDaysSince(lastContact), totalSales)
      };
    };

    const positiveComment = (contact: Contact) => contact.comment?.toLowerCase().includes('positive') || false;

    return {
      active: noPurchaseContacts
        .filter((contact) => contact.status === CustomerStatus.ACTIVE)
        .map(buildEntry),
      inactivePositive: noPurchaseContacts
        .filter((contact) => contact.status === CustomerStatus.INACTIVE && positiveComment(contact))
        .map(buildEntry),
      prospectivePositive: noPurchaseContacts
        .filter((contact) => contact.status === CustomerStatus.PROSPECTIVE && positiveComment(contact))
        .map(buildEntry)
    };
  }, [noPurchaseContacts, lastContactMap, purchasesByContact]);

  const activeVirtual = useVirtualizedList(categorizedEntries.active, { viewportHeight: 320, itemHeight: 120 });
  const inactiveVirtual = useVirtualizedList(categorizedEntries.inactivePositive, { viewportHeight: 320, itemHeight: 120 });
  const prospectiveVirtual = useVirtualizedList(categorizedEntries.prospectivePositive, { viewportHeight: 320, itemHeight: 120 });

  const contactLookup = useMemo(() => {
    const map = new Map<string, Contact>();
    contacts.forEach((contact) => map.set(contact.id, contact));
    return map;
  }, [contacts]);

  const notificationBase = useMemo<NotificationItem[]>(() => {
    const items: NotificationItem[] = [];
    teamMessages.forEach((message) => {
      items.push({
        id: `msg-${message.id}`,
        title: 'Owner Reply',
        message: message.message,
        timestamp: message.created_at,
        type: 'report'
      });
    });

    purchases.forEach((purchase) => {
      if (purchase.status === 'pending') {
        const company = contactLookup.get(purchase.contact_id)?.company || 'Client';
        items.push({
          id: `stock-${purchase.id}`,
          title: 'Pending Confirmation',
          message: `${company} awaiting confirmation for ₱${Math.round(purchase.amount).toLocaleString()} order`,
          timestamp: purchase.purchased_at,
          type: 'stock'
        });
      }
    });

    return items.sort((a, b) => Date.parse(b.timestamp) - Date.parse(a.timestamp));
  }, [teamMessages, purchases, contactLookup]);

  const notifications: NotificationWithRead[] = useMemo(
    () =>
      notificationBase.map((item) => ({
        ...item,
        read: readNotifications.has(item.id)
      })),
    [notificationBase, readNotifications]
  );

  const unreadNotificationCount = useMemo(
    () => notifications.filter((notification) => !notification.read).length,
    [notifications]
  );

  const handleNotificationRead = (id: string) => {
    setReadNotifications((prev) => {
      const updated = new Set(prev);
      updated.add(id);
      return updated;
    });
  };

  const handleNotificationReadAll = () => {
    setReadNotifications(new Set(notificationBase.map((item) => item.id)));
  };

  const availableReps = useMemo(() => {
    const reps = Array.from(new Set(contacts.map((contact) => contact.salesman)));
    return ['All', ...reps];
  }, [contacts]);

  const availableProvinces = useMemo(() => {
    const provinces = Array.from(new Set(contacts.map((contact) => contact.province).filter(Boolean)));
    return ['All', ...provinces];
  }, [contacts]);

  const statusOptions: CustomerStatus[] = [
    CustomerStatus.ACTIVE,
    CustomerStatus.INACTIVE,
    CustomerStatus.PROSPECTIVE,
    CustomerStatus.BLACKLISTED
  ];

  const masterRows = useMemo(() => {
    const rows = contacts.map((contact) => {
      const contactPurchases = purchasesByContact.get(contact.id) || [];
      const lastPaid = contactPurchases.find((purchase) => purchase.status === 'paid');
      const totalSales = contactPurchases
        .filter((purchase) => purchase.status === 'paid')
        .reduce((sum, purchase) => sum + purchase.amount, 0);
      const lastContact = lastContactMap.get(contact.id);
      const totalInteractions =
        (callLogsByContact.get(contact.id)?.length || 0) + (inquiriesByContact.get(contact.id)?.length || 0);
      const priority = calculatePriority(contact, getDaysSince(lastContact), totalSales);
      return {
        contact,
        priority,
        lastContact,
        lastPurchase: lastPaid?.purchased_at,
        totalSales,
        totalInteractions,
        latestOutcome: callLogsByContact.get(contact.id)?.[0]?.outcome
      };
    });

    const filtered = rows.filter((row) => {
      if (repFilter !== 'All' && row.contact.salesman !== repFilter) return false;
      if (provinceFilter !== 'All' && row.contact.province !== provinceFilter) return false;
      if (noPurchaseOnly && !noPurchaseSet.has(row.contact.id)) return false;
      if (statusFilters.length && !statusFilters.includes(row.contact.status)) return false;
      if (debouncedSearch) {
        const haystack = `${row.contact.company} ${row.contact.province} ${row.contact.city} ${row.contact.comment}`.toLowerCase();
        if (!haystack.includes(debouncedSearch)) return false;
      }
      return true;
    });

    const direction = sortDirection === 'asc' ? 1 : -1;
    const sorted = filtered.sort((a, b) => {
      if (sortField === 'priority') {
        return (a.priority - b.priority) * direction * -1;
      }
      if (sortField === 'salesValue') {
        return (a.totalSales - b.totalSales) * direction;
      }
      if (sortField === 'lastContact') {
        const aTime = a.lastContact ? Date.parse(a.lastContact) : 0;
        const bTime = b.lastContact ? Date.parse(b.lastContact) : 0;
        return (aTime - bTime) * direction;
      }
      const aPurchase = a.lastPurchase ? Date.parse(a.lastPurchase) : 0;
      const bPurchase = b.lastPurchase ? Date.parse(b.lastPurchase) : 0;
      return (aPurchase - bPurchase) * direction;
    });

    return sorted;
  }, [
    contacts,
    purchasesByContact,
    lastContactMap,
    callLogsByContact,
    inquiriesByContact,
    repFilter,
    provinceFilter,
    noPurchaseSet,
    noPurchaseOnly,
    statusFilters,
    debouncedSearch,
    sortField,
    sortDirection
  ]);

  const selectedTimeline = useMemo(() => {
    if (!selectedClientId) return [];
    const calls = (callLogsByContact.get(selectedClientId) || []).map((log) => ({
      id: `call-${log.id}`,
      type: 'call' as const,
      title: log.channel === 'text' ? 'SMS Touch' : 'Call',
      occurred_at: log.occurred_at,
      detail: log.notes,
      meta: `${log.direction === 'inbound' ? 'Inbound' : 'Outbound'} • ${log.outcome.replace('_', ' ')}`
    }));
    const inquiryEvents = (inquiriesByContact.get(selectedClientId) || []).map((inquiry) => ({
      id: `inq-${inquiry.id}`,
      type: 'inquiry' as const,
      title: 'Inquiry',
      occurred_at: inquiry.occurred_at,
      detail: inquiry.notes || inquiry.title,
      meta: `via ${inquiry.channel}`
    }));

    return [...calls, ...inquiryEvents]
      .sort((a, b) => Date.parse(b.occurred_at) - Date.parse(a.occurred_at))
      .slice(0, 6);
  }, [selectedClientId, callLogsByContact, inquiriesByContact]);

  const weekdayStart = useMemo(() => {
    const now = new Date();
    now.setHours(0, 0, 0, 0);
    return now;
  }, []);

  const callsToday = useMemo(
    () => callLogs.filter((log) => Date.parse(log.occurred_at) >= weekdayStart.getTime()).length,
    [callLogs, weekdayStart]
  );

  const smsToday = useMemo(
    () =>
      callLogs.filter(
        (log) => Date.parse(log.occurred_at) >= weekdayStart.getTime() && log.channel === 'text'
      ).length,
    [callLogs, weekdayStart]
  );

  const clientsContactedToday = useMemo(() => {
    const ids = new Set<string>();
    callLogs.forEach((log) => {
      if (Date.parse(log.occurred_at) >= weekdayStart.getTime()) {
        ids.add(log.contact_id);
      }
    });
    inquiries.forEach((inquiry) => {
      if (Date.parse(inquiry.occurred_at) >= weekdayStart.getTime()) {
        ids.add(inquiry.contact_id);
      }
    });
    return ids.size;
  }, [callLogs, inquiries, weekdayStart]);

  const callsThisMonth = useMemo(() => callLogs.filter((log) => isWithinCurrentMonth(log.occurred_at)).length, [callLogs]);
  const contactsThisMonth = useMemo(() => {
    const ids = new Set<string>();
    callLogs.forEach((log) => {
      if (isWithinCurrentMonth(log.occurred_at)) {
        ids.add(log.contact_id);
      }
    });
    inquiries.forEach((inquiry) => {
      if (isWithinCurrentMonth(inquiry.occurred_at)) {
        ids.add(inquiry.contact_id);
      }
    });
    return ids.size;
  }, [callLogs, inquiries]);

  const followUpsDue = useMemo(
    () =>
      callLogs.filter(
        (log) =>
          log.outcome === 'follow_up' &&
          log.next_action_due &&
          Date.parse(log.next_action_due) <= Date.now()
      ).length,
    [callLogs]
  );

  const callOutcomeBreakdown = useMemo(() => {
    const base = {
      positive: 0,
      follow_up: 0,
      negative: 0,
      other: 0
    };
    callLogs.forEach((log) => {
      if (log.outcome === 'positive') base.positive += 1;
      else if (log.outcome === 'follow_up') base.follow_up += 1;
      else if (log.outcome === 'negative') base.negative += 1;
      else base.other += 1;
    });
    return [
      { name: 'Positive', value: base.positive },
      { name: 'Follow-up', value: base.follow_up },
      { name: 'Negative', value: base.negative },
      { name: 'Other', value: base.other }
    ];
  }, [callLogs]);

  const perClientHistory = useMemo(() => {
    return contacts
      .map((contact) => {
        const logs = callLogsByContact.get(contact.id) || [];
        const followUps = logs.filter((log) => log.outcome === 'follow_up').length;
        const positive = logs.filter((log) => log.outcome === 'positive').length;
        const total = logs.length + (inquiriesByContact.get(contact.id)?.length || 0);
        return {
          contact,
          total,
          positive,
          followUps,
          lastInteraction: lastContactMap.get(contact.id)
        };
      })
      .sort((a, b) => b.total - a.total)
      .slice(0, 4);
  }, [contacts, callLogsByContact, inquiriesByContact, lastContactMap]);

  const toggleStatusFilter = (status: CustomerStatus) => {
    setStatusFilters((prev) => {
      if (prev.includes(status)) {
        return prev.filter((item) => item !== status);
      }
      return [...prev, status];
    });
  };

  if (!agentName) {
    return (
      <div className="flex items-center justify-center h-full p-6">
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-6 text-center shadow-sm max-w-md">
          <ShieldAlert className="w-10 h-10 text-rose-500 mx-auto mb-3" />
          <h2 className="text-lg font-bold text-slate-800 dark:text-white">Profile Required</h2>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            Please make sure your profile includes a full name so we can load your assigned accounts.
          </p>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full p-6">
        <Loader2 className="w-8 h-8 text-brand-blue animate-spin" />
      </div>
    );
  }

  return (
    <div className="h-full overflow-y-auto bg-slate-50 dark:bg-slate-950 p-4 lg:p-6 space-y-6">
      <header className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <div className="flex items-center gap-3">
            <Phone className="w-6 h-6 text-brand-blue" />
            <h1 className="text-2xl font-bold text-slate-800 dark:text-white">Daily Call Monitoring</h1>
          </div>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-2">
            Tracking every touchpoint for <span className="font-semibold">{agentName}</span>
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={loadAgentData}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-sm font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800"
          >
            <RefreshCw className="w-4 h-4" />
            Refresh
          </button>
          <div className="relative">
            <button
              onClick={handleNotificationReadAll}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-brand-blue text-white text-sm font-semibold shadow-sm"
            >
              <Bell className="w-4 h-4" />
              Notifications
              {unreadNotificationCount > 0 && (
                <span className="ml-1 px-2 py-0.5 rounded-full text-xs font-bold bg-white/20">
                  {unreadNotificationCount}
                </span>
              )}
            </button>
          </div>
        </div>
      </header>

      {/* Master Call View - Main Focus */}
      <section className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-sm">
        <div className="p-4 border-b border-slate-100 dark:border-slate-800 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div className="flex items-center gap-2 text-slate-500 dark:text-slate-400">
            <Filter className="w-4 h-4" />
            <span className="text-sm font-semibold text-slate-800 dark:text-white">Master Call View</span>
          </div>
          <div className="flex flex-wrap gap-2">
            <div className="flex items-center gap-2 bg-slate-50 dark:bg-slate-900/60 border border-slate-100 dark:border-slate-800 px-3 py-1.5 rounded-lg">
              <Search className="w-4 h-4 text-slate-400" />
              <input
                className="bg-transparent text-sm outline-none text-slate-800 dark:text-slate-200 placeholder:text-slate-400 w-36"
                placeholder="Search clients"
                value={searchValue}
                onChange={(event) => setSearchValue(event.target.value)}
              />
            </div>
            <select
              className="text-sm bg-slate-50 dark:bg-slate-900/60 border border-slate-100 dark:border-slate-800 rounded-lg px-2 py-1.5"
              value={repFilter}
              onChange={(event) => setRepFilter(event.target.value)}
            >
              {availableReps.map((rep) => (
                <option key={rep} value={rep}>
                  {rep === 'All' ? 'All Reps' : rep}
                </option>
              ))}
            </select>
            <select
              className="text-sm bg-slate-50 dark:bg-slate-900/60 border border-slate-100 dark:border-slate-800 rounded-lg px-2 py-1.5"
              value={provinceFilter}
              onChange={(event) => setProvinceFilter(event.target.value)}
            >
              {availableProvinces.map((province) => (
                <option key={province} value={province}>
                  {province === 'All' ? 'All Areas' : province}
                </option>
              ))}
            </select>
            <label className="flex items-center gap-2 text-sm text-slate-600 dark:text-slate-300 px-3 py-1.5 bg-slate-50 dark:bg-slate-900/60 border border-slate-100 dark:border-slate-800 rounded-lg cursor-pointer select-none">
              <input
                type="checkbox"
                className="form-checkbox"
                checked={noPurchaseOnly}
                onChange={(event) => setNoPurchaseOnly(event.target.checked)}
              />
              No purchase
            </label>
          </div>
        </div>
        <div className="px-4 py-3 border-b border-slate-100 dark:border-slate-800 flex flex-wrap gap-2">
          {statusOptions.map((status) => (
            <button
              key={status}
              onClick={() => toggleStatusFilter(status)}
              className={`text-xs font-semibold px-3 py-1 rounded-full border ${
                statusFilters.includes(status)
                  ? 'bg-brand-blue text-white border-brand-blue'
                  : 'bg-slate-50 dark:bg-slate-900/60 border-slate-100 dark:border-slate-800 text-slate-500 dark:text-slate-300'
              }`}
            >
              {status}
            </button>
          ))}
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-slate-200 dark:divide-slate-800 text-sm">
            <thead className="bg-slate-50 dark:bg-slate-900/60 text-slate-500 dark:text-slate-400">
              <tr>
                {[
                  { key: 'client', label: 'Client' },
                  { key: 'status', label: 'Status' },
                  { key: 'rep', label: 'Rep' },
                  { key: 'lastPurchase', label: 'Last Purchase', sortable: true },
                  { key: 'lastContact', label: 'Last Contact', sortable: true },
                  { key: 'history', label: 'History' },
                  { key: 'notes', label: 'Notes' },
                  { key: 'potential', label: 'Potential', sortable: true },
                  { key: 'reason', label: 'Reason' },
                  { key: 'actions', label: 'Actions' }
                ].map((column) => (
                  <th
                    key={column.key}
                    className="px-3 py-3 text-left text-xs font-semibold uppercase tracking-wide"
                  >
                    {column.sortable ? (
                      <button
                        className="flex items-center gap-1"
                        onClick={() => {
                          const newField = column.key === 'lastPurchase' ? 'lastPurchase' : column.key === 'potential' ? 'salesValue' : 'lastContact';
                          if (sortField === newField) {
                            setSortDirection((prev) => (prev === 'asc' ? 'desc' : 'asc'));
                          } else {
                            setSortField(newField as typeof sortField);
                            setSortDirection('desc');
                          }
                        }}
                      >
                        {column.label}
                        {((column.key === 'lastPurchase' && sortField === 'lastPurchase') ||
                          (column.key === 'lastContact' && sortField === 'lastContact') ||
                          (column.key === 'potential' && sortField === 'salesValue')) && (
                          <ArrowUpRight
                            className={`w-3 h-3 ${
                              sortDirection === 'desc' ? 'rotate-180' : ''
                            }`}
                          />
                        )}
                      </button>
                    ) : (
                      column.label
                    )}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {masterRows.map((row) => (
                <tr
                  key={row.contact.id}
                  className="hover:bg-slate-50 dark:hover:bg-slate-900/40 transition-colors cursor-pointer"
                  onClick={() => setSelectedClientId(row.contact.id)}
                >
                  <td className="px-3 py-4">
                    <div className="flex flex-col">
                      <span className="font-semibold text-slate-800 dark:text-white">{row.contact.company}</span>
                      <span className="text-xs text-slate-500 dark:text-slate-400">{row.contact.province}</span>
                    </div>
                  </td>
                  <td className="px-3 py-4">
                    <span className={`text-[11px] font-semibold px-2 py-0.5 rounded-full ${statusBadgeClasses(row.contact.status)}`}>
                      {row.contact.status}
                    </span>
                  </td>
                  <td className="px-3 py-4 text-xs text-slate-500 dark:text-slate-400">{row.contact.salesman}</td>
                  <td className="px-3 py-4 text-xs text-slate-600 dark:text-slate-300">{formatDate(row.lastPurchase)}</td>
                  <td className="px-3 py-4 text-xs text-slate-600 dark:text-slate-300">{formatRelativeTime(row.lastContact)}</td>
                  <td className="px-3 py-4 text-xs text-slate-600 dark:text-slate-300">
                    {row.totalInteractions} touchpoints
                  </td>
                  <td className="px-3 py-4 text-xs text-slate-600 dark:text-slate-300 line-clamp-2 max-w-xs">
                    {row.contact.comment || '—'}
                  </td>
                  <td className="px-3 py-4">
                    <div className="flex flex-col text-xs text-slate-600 dark:text-slate-300">
                      <span>{formatCurrency(row.totalSales)}</span>
                      <span className={`mt-1 text-[11px] font-semibold px-2 py-0.5 rounded-full self-start ${priorityBadgeClasses(row.priority)}`}>
                        Priority {Math.round(row.priority)}
                      </span>
                    </div>
                  </td>
                  <td className="px-3 py-4 text-xs text-slate-600 dark:text-slate-300">
                    {row.latestOutcome ? row.latestOutcome.replace('_', ' ') : 'No recent update'}
                  </td>
                  <td className="px-3 py-4">
                    <div className="flex flex-wrap gap-2">
                      <button className="px-2 py-1 text-xs font-semibold rounded-lg bg-brand-blue/10 text-brand-blue">Call</button>
                      <button className="px-2 py-1 text-xs font-semibold rounded-lg bg-emerald-50 text-emerald-600">SMS</button>
                      <button className="px-2 py-1 text-xs font-semibold rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
                        Details
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {masterRows.length === 0 && (
                <tr>
                  <td colSpan={10} className="px-3 py-6 text-center text-sm text-slate-500 dark:text-slate-400">
                    No clients match the current filters.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>

      {/* Today's Call List */}
      <section className="grid grid-cols-1 xl:grid-cols-12 gap-4 lg:gap-6">
        <div className="xl:col-span-8">
          <AgentCallActivity
            callLogs={callLogs}
            inquiries={inquiries}
            contacts={contacts}
            maxItems={15}
            title="Today's Call List"
          />
        </div>
        <div className="xl:col-span-4">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-sm p-4 xl:sticky xl:top-6">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <Bell className="w-5 h-5 text-brand-blue" />
                <h3 className="text-lg font-bold text-slate-800 dark:text-white">Notifications</h3>
              </div>
              <button
                onClick={handleNotificationReadAll}
                className="text-xs font-semibold text-brand-blue hover:underline"
              >
                Mark all read
              </button>
            </div>
            <div className="space-y-3 max-h-[400px] overflow-y-auto pr-1 scrollbar-thin scrollbar-thumb-slate-300 dark:scrollbar-thumb-slate-700 scrollbar-track-transparent">
              {notifications.map((notification) => (
                <div
                  key={notification.id}
                  className={`p-3 rounded-xl border ${
                    notification.read
                      ? 'border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/60'
                      : 'border-brand-blue/20 bg-blue-50/60 dark:bg-blue-900/30'
                  }`}
                >
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 flex items-center gap-1">
                      {notification.type === 'report' ? <ShieldAlert className="w-3.5 h-3.5" /> : <Package className="w-3.5 h-3.5" />}
                      {notification.type === 'report' ? 'Owner' : 'Stock'}
                    </span>
                    {!notification.read && (
                      <button
                        onClick={() => handleNotificationRead(notification.id)}
                        className="text-[11px] font-semibold text-brand-blue hover:underline"
                      >
                        Mark read
                      </button>
                    )}
                  </div>
                  <p className="text-sm text-slate-700 dark:text-slate-200 font-semibold">{notification.title}</p>
                  <p className="text-sm text-slate-700 dark:text-slate-200 mt-1">{notification.message}</p>
                  <div className="mt-2 text-[11px] text-slate-400 dark:text-slate-500">
                    {formatRelativeTime(notification.timestamp)}
                  </div>
                </div>
              ))}
              {notifications.length === 0 && (
                <div className="text-center text-sm text-slate-400 dark:text-slate-500 py-6">No notifications</div>
              )}
            </div>
          </div>
        </div>
      </section>



      <section className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4 shadow-sm">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2 text-slate-400 dark:text-slate-500">
              <PhilippinePeso className="w-4 h-4" />
              <span className="text-xs font-semibold uppercase tracking-wide">Monthly Quota</span>
            </div>
            <Target className="w-4 h-4 text-brand-blue" />
          </div>
          <p className="text-2xl font-bold text-slate-800 dark:text-white">{formatCurrency(quota)}</p>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">Goal for the current month</p>
        </div>

        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4 shadow-sm">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2 text-slate-400 dark:text-slate-500">
              <TrendingUp className="w-4 h-4" />
              <span className="text-xs font-semibold uppercase tracking-wide">Achievement</span>
            </div>
            <ArrowUpRight className="w-4 h-4 text-emerald-500" />
          </div>
          <p className="text-2xl font-bold text-slate-800 dark:text-white">{formatCurrency(achievements)}</p>
          <p className={`text-xs font-semibold mt-1 ${percentAchieved > 80 ? 'text-emerald-500' : 'text-slate-500 dark:text-slate-400'}`}>
            {percentAchieved}% of target
          </p>
          <div className="mt-3 h-2 rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
            <div
              className={`h-full rounded-full ${percentAchieved > 80 ? 'bg-emerald-500' : 'bg-brand-blue'}`}
              style={{ width: `${percentAchieved}%` }}
            />
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4 shadow-sm">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2 text-slate-400 dark:text-slate-500">
              <BarChart3 className="w-4 h-4" />
              <span className="text-xs font-semibold uppercase tracking-wide">Remaining</span>
            </div>
            <AlertCircle className={`w-4 h-4 ${remainingQuota < quota * 0.2 ? 'text-rose-500' : 'text-slate-400 dark:text-slate-500'}`} />
          </div>
          <p className={`text-2xl font-bold ${remainingQuota < quota * 0.2 ? 'text-rose-500' : 'text-slate-800 dark:text-white'}`}>
            {formatCurrency(remainingQuota)}
          </p>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">Needed to hit target</p>
        </div>

        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4 shadow-sm">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2 text-slate-400 dark:text-slate-500">
              <Calendar className="w-4 h-4" />
              <span className="text-xs font-semibold uppercase tracking-wide">Follow-ups Due</span>
            </div>
            <ClipboardList className="w-4 h-4 text-amber-500" />
          </div>
          <p className="text-2xl font-bold text-slate-800 dark:text-white">{followUpsDue}</p>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">Need action today</p>
        </div>
      </section>

      <section className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {[
          { title: 'Active • No Purchase', icon: UserCheck, data: categorizedEntries.active, virtual: activeVirtual },
          { title: 'Inactive Positives', icon: UserPlus, data: categorizedEntries.inactivePositive, virtual: inactiveVirtual },
          { title: 'Prospective Positives', icon: UserX, data: categorizedEntries.prospectivePositive, virtual: prospectiveVirtual }
        ].map((list) => (
          <div key={list.title} className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-sm p-4 flex flex-col">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <list.icon className="w-5 h-5 text-brand-blue" />
                <h3 className="text-lg font-bold text-slate-800 dark:text-white">{list.title}</h3>
              </div>
              <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">{list.data.length} clients</span>
            </div>
            <div
              className="relative overflow-y-auto pr-1 scrollbar-thin scrollbar-thumb-slate-300 dark:scrollbar-thumb-slate-700 scrollbar-track-transparent"
              style={{ maxHeight: list.virtual.viewportHeight }}
              onScroll={list.virtual.handleScroll}
            >
              <div style={{ height: `${list.virtual.totalHeight}px` }}>
                <div style={{ transform: `translateY(${list.virtual.offsetTop}px)` }} className="space-y-3">
                  {list.virtual.visibleItems.map((entry) => (
                    <button
                      key={entry.contact.id}
                      onClick={() => setSelectedClientId(entry.contact.id)}
                      className="w-full text-left bg-slate-50 dark:bg-slate-900/60 border border-slate-100 dark:border-slate-800 rounded-lg p-3 hover:border-brand-blue transition-colors"
                    >
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm font-semibold text-slate-800 dark:text-white">{entry.contact.company}</p>
                          <p className="text-xs text-slate-500 dark:text-slate-400">{entry.contact.province}</p>
                        </div>
                        <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${statusBadgeClasses(entry.contact.status)}`}>
                          {entry.contact.status}
                        </span>
                      </div>
                      <div className="mt-3 flex items-center justify-between">
                        <div className="text-xs text-slate-500 dark:text-slate-400">
                          <p>Last touch: {formatRelativeTime(entry.lastContact)}</p>
                          <p>Last purchase: {formatDate(entry.lastPurchase)}</p>
                          <p className="mt-1 text-[11px] text-slate-400 dark:text-slate-500">
                            Notes: {formatComment(entry.contact.comment)}
                          </p>
                        </div>
                        <div className="flex flex-col items-end gap-1">
                          <span className={`text-[11px] font-semibold px-2 py-0.5 rounded-full ${priorityBadgeClasses(entry.priority)}`}>
                            Priority {Math.round(entry.priority)}
                          </span>
                          <span className="text-[11px] text-slate-500 dark:text-slate-400">{entry.contact.salesman}</span>
                        </div>
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>
        ))}
      </section>

      <section className="grid grid-cols-1 xl:grid-cols-12 gap-6">
        <div className="xl:col-span-8 space-y-6">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-sm p-4">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
              <div className="flex items-center gap-2">
                <PhoneCall className="w-5 h-5 text-brand-blue" />
                <h2 className="text-lg font-bold text-slate-800 dark:text-white">Call Activity Tracker</h2>
              </div>
              <div className="flex items-center gap-3 text-xs text-slate-500 dark:text-slate-400">
                <Clock className="w-4 h-4" />
                Updated live from Supabase
              </div>
            </div>
            <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="p-3 rounded-xl border border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/60">
                <p className="text-xs text-slate-500 dark:text-slate-400 flex items-center gap-1">
                  <PhoneForwarded className="w-3.5 h-3.5 text-brand-blue" />
                  Calls Today
                </p>
                <p className="text-2xl font-bold text-slate-800 dark:text-white mt-1">{callsToday}</p>
              </div>
              <div className="p-3 rounded-xl border border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/60">
                <p className="text-xs text-slate-500 dark:text-slate-400 flex items-center gap-1">
                  <MessageSquare className="w-3.5 h-3.5 text-purple-500" />
                  SMS Today
                </p>
                <p className="text-2xl font-bold text-slate-800 dark:text-white mt-1">{smsToday}</p>
              </div>
              <div className="p-3 rounded-xl border border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/60">
                <p className="text-xs text-slate-500 dark:text-slate-400 flex items-center gap-1">
                  <Users className="w-3.5 h-3.5 text-emerald-500" />
                  Contacts Today
                </p>
                <p className="text-2xl font-bold text-slate-800 dark:text-white mt-1">{clientsContactedToday}</p>
              </div>
              <div className="p-3 rounded-xl border border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/60">
                <p className="text-xs text-slate-500 dark:text-slate-400 flex items-center gap-1">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
                  Calls this Month
                </p>
                <p className="text-2xl font-bold text-slate-800 dark:text-white mt-1">{callsThisMonth}</p>
              </div>
            </div>
            <div className="mt-6 grid grid-cols-1 lg:grid-cols-5 gap-4">
              <div className="lg:col-span-3">
                <div className="bg-slate-50 dark:bg-slate-900/50 rounded-xl p-4 border border-slate-100 dark:border-slate-800">
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-300">Monthly Summary</h3>
                    <div className="text-xs text-slate-500 dark:text-slate-400 flex items-center gap-1">
                      <Calendar className="w-3 h-3" />
                      {contactsThisMonth} clients
                    </div>
                  </div>
                  <div className="space-y-2">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-slate-500 dark:text-slate-400">Unique Clients</span>
                      <span className="font-semibold text-slate-800 dark:text-white">{contactsThisMonth}</span>
                    </div>
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-slate-500 dark:text-slate-400">Follow-ups Pending</span>
                      <span className="font-semibold text-amber-500">{followUpsDue}</span>
                    </div>
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-slate-500 dark:text-slate-400">Conversion Ratio</span>
                      <span className="font-semibold text-emerald-500">
                        {contactsThisMonth ? Math.round((currentMonthPurchases.length / contactsThisMonth) * 100) : 0}%
                      </span>
                    </div>
                  </div>
                </div>
              </div>
              <div className="lg:col-span-2">
                <div className="bg-slate-50 dark:bg-slate-900/50 rounded-xl p-4 border border-slate-100 dark:border-slate-800">
                  <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-300 mb-3">Outcome Mix</h3>
                  <div className="h-48">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie data={callOutcomeBreakdown} dataKey="value" nameKey="name" innerRadius={40} outerRadius={70} paddingAngle={4}>
                          {callOutcomeBreakdown.map((entry, index) => (
                            <Cell key={entry.name} fill={PIE_COLORS[index % PIE_COLORS.length]} />
                          ))}
                        </Pie>
                        <Tooltip />
                        <Legend />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              </div>
            </div>
            <div className="mt-6 grid grid-cols-1 md:grid-cols-2 gap-4">
              {perClientHistory.map((item) => (
                <div
                  key={item.contact.id}
                  className="p-3 rounded-xl border border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900 flex flex-col gap-2"
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-semibold text-slate-800 dark:text-white">{item.contact.company}</p>
                      <p className="text-xs text-slate-500 dark:text-slate-400">{item.contact.province}</p>
                    </div>
                    <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">
                      {item.total} interactions
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
                    <span>Positive: {item.positive}</span>
                    <span>Follow-ups: {item.followUps}</span>
                    <span>{formatRelativeTime(item.lastInteraction)}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

        </div>

        <div className="xl:col-span-4 space-y-6">
          {selectedClient && (
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-sm p-4">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 rounded-xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center">
                  <Phone className="w-5 h-5 text-brand-blue" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-800 dark:text-white">{selectedClient.company}</h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400">{selectedClient.province}</p>
                </div>
              </div>
              <div className="flex items-center gap-3 text-xs text-slate-500 dark:text-slate-400">
                <span className={`px-2 py-0.5 rounded-full font-semibold ${statusBadgeClasses(selectedClient.status)}`}>
                  {selectedClient.status}
                </span>
                <span>Assigned: {selectedClient.salesman}</span>
              </div>
              <div className="mt-4 space-y-3">
                {selectedTimeline.map((event) => (
                  <div
                    key={event.id}
                    className="p-3 rounded-lg bg-slate-50 dark:bg-slate-900/60 border border-slate-100 dark:border-slate-800"
                  >
                    <div className="flex items-center justify-between text-sm font-semibold text-slate-700 dark:text-slate-200">
                      <span>{event.title}</span>
                      <span className="text-xs text-slate-500 dark:text-slate-400">
                        {formatDate(event.occurred_at)}
                      </span>
                    </div>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">{event.detail || 'No notes added.'}</p>
                    <p className="text-[11px] text-slate-400 dark:text-slate-500 mt-1">{event.meta}</p>
                  </div>
                ))}
                {selectedTimeline.length === 0 && (
                  <div className="text-sm text-slate-500 dark:text-slate-400 text-center py-4">No activity logged yet</div>
                )}
              </div>
            </div>
          )}
        </div>
      </section>
    </div>
  );
};

export default DailyCallMonitoringView;
