import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  AlertCircle,
  ArrowUpRight,
  BarChart3,
  Bell,
  Calendar,
  CheckCircle2,
  ChevronDown,
  ClipboardList,
  Clock,
  Filter,
  Loader2,
  Mail,
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
  Users,
  X
} from 'lucide-react';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from 'recharts';
import AgentCallActivity from './AgentCallActivity';
import {
  countCallLogsByChannelInRange,
  countCallLogsInRange,
  countCallOutcomes,
  countUniqueContactsInRange,
  getStartOfMonth,
  getStartOfToday,
  isWithinCurrentMonth
} from './callMetricsUtils';
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

interface ActivityItem {
  id: string;
  title: string;
  message: string;
  timestamp: string;
  type: 'report' | 'stock';
}

interface ActivityItemWithRead extends ActivityItem {
  read: boolean;
}

interface VirtualizedListOptions {
  itemHeight?: number;
  viewportHeight?: number;
  overscan?: number;
}

type ClientListKey = 'active' | 'inactivePositive' | 'prospectivePositive';

const PIE_COLORS = ['#2563eb', '#0ea5e9', '#059669', '#f97316'];

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

const matchesSearch = (contact: Contact, query: string) => {
  if (!query) return true;
  const normalized = query.toLowerCase();
  const fields = [contact.company, contact.name, contact.province, contact.city];
  return fields.some((field) => (field || '').toLowerCase().includes(normalized));
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
  const [loadError, setLoadError] = useState<string | null>(null);
  const [hasLoadedData, setHasLoadedData] = useState(false);
  const [selectedClientId, setSelectedClientId] = useState<string | null>(null);

  const [repFilter, setRepFilter] = useState('All');
  const [provinceFilter, setProvinceFilter] = useState('All');
  const [statusFilters, setStatusFilters] = useState<CustomerStatus[]>([]);
  const [noPurchaseOnly, setNoPurchaseOnly] = useState(false);
  const [searchValue, setSearchValue] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [sortField, setSortField] = useState<'priority' | 'lastContact' | 'lastPurchase' | 'salesValue'>('priority');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');
  const [readActivityIds, setReadActivityIds] = useState<Set<string>>(() => new Set());
  const [showFullTimeline, setShowFullTimeline] = useState(false);
  const [openClientLists, setOpenClientLists] = useState<Record<ClientListKey, boolean>>({
    active: false,
    inactivePositive: false,
    prospectivePositive: false
  });

  const agentDataName = currentUser?.full_name?.trim() || null;
  const agentDisplayName = useMemo(() => {
    if (currentUser?.full_name?.trim()) {
      return currentUser.full_name.trim();
    }
    if (currentUser?.email) {
      const prefix = currentUser.email.split('@')[0];
      if (prefix) return prefix;
    }
    return 'Sales Agent';
  }, [currentUser]);
  const isSalesAgent = Boolean(currentUser?.role && currentUser.role.toLowerCase().includes('agent'));
  const dataUnavailable = !loading && !hasLoadedData;

  const toggleClientList = useCallback((listKey: ClientListKey) => {
    setOpenClientLists((previous) => ({
      ...previous,
      [listKey]: !previous[listKey]
    }));
  }, []);

  const loadAgentData = useCallback(async () => {
    if (!agentDataName || !isSalesAgent) return;
    setLoading(true);
    try {
      const [contactData, callLogData, inquiryData, purchaseData, messageData] = await Promise.all([
        fetchContacts(),
        fetchCallLogs(),
        fetchInquiries(),
        fetchPurchases(),
        fetchTeamMessages()
      ]);

      const assignedContacts = contactData.filter((contact) => contact.salesman === agentDataName);
      const contactIds = new Set(assignedContacts.map((contact) => contact.id));

      setContacts(assignedContacts);
      setCallLogs(callLogData.filter((log) => log.agent_name === agentDataName));
      setInquiries(inquiryData.filter((inquiry) => contactIds.has(inquiry.contact_id)));
      setPurchases(purchaseData.filter((purchase) => contactIds.has(purchase.contact_id)));
      setTeamMessages(messageData.filter((message) => message.is_from_owner));
      setLoadError(null);
      setHasLoadedData(true);
    } catch (error) {
      console.error('Error loading daily call monitoring data', error);
      setLoadError('Call activity could not be loaded. Please try again.');
    } finally {
      setLoading(false);
    }
  }, [agentDataName, isSalesAgent]);

  useEffect(() => {
    if (!agentDataName || !isSalesAgent) {
      setLoading(false);
      return;
    }
    loadAgentData();
  }, [agentDataName, isSalesAgent, loadAgentData]);

  useEffect(() => {
    if (!agentDataName || !isSalesAgent) return;
    const unsubscribe = subscribeToCallMonitoringUpdates(() => {
      loadAgentData();
    });
    return () => {
      unsubscribe();
    };
  }, [agentDataName, isSalesAgent, loadAgentData]);

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedSearch(searchValue.trim().toLowerCase());
    }, 300);
    return () => clearTimeout(handler);
  }, [searchValue]);

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
  const achievementsValue = hasLoadedData ? achievements : null;
  const percentAchieved =
    achievementsValue !== null ? Math.min(100, Math.round(((achievementsValue / quota) * 100) || 0)) : null;
  const remainingQuota = achievementsValue !== null ? Math.max(0, quota - achievementsValue) : null;

  const noPurchaseContacts = useMemo(
    () => clientsNoPurchaseThisMonth(contacts, purchases),
    [contacts, purchases]
  );
  const noPurchaseSet = useMemo(() => new Set(noPurchaseContacts.map((contact) => contact.id)), [noPurchaseContacts]);
  const searchScopedNoPurchase = useMemo(
    () => (debouncedSearch ? noPurchaseContacts.filter((contact) => matchesSearch(contact, debouncedSearch)) : noPurchaseContacts),
    [noPurchaseContacts, debouncedSearch]
  );

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
      active: searchScopedNoPurchase
        .filter((contact) => contact.status === CustomerStatus.ACTIVE)
        .map(buildEntry),
      inactivePositive: searchScopedNoPurchase
        .filter((contact) => contact.status === CustomerStatus.INACTIVE && positiveComment(contact))
        .map(buildEntry),
      prospectivePositive: searchScopedNoPurchase
        .filter((contact) => contact.status === CustomerStatus.PROSPECTIVE && positiveComment(contact))
        .map(buildEntry)
    };
  }, [searchScopedNoPurchase, lastContactMap, purchasesByContact]);

  const activeVirtual = useVirtualizedList(categorizedEntries.active, { viewportHeight: 300, itemHeight: 96 });
  const inactiveVirtual = useVirtualizedList(categorizedEntries.inactivePositive, { viewportHeight: 300, itemHeight: 96 });
  const prospectiveVirtual = useVirtualizedList(categorizedEntries.prospectivePositive, { viewportHeight: 300, itemHeight: 96 });

  const contactLookup = useMemo(() => {
    const map = new Map<string, Contact>();
    contacts.forEach((contact) => map.set(contact.id, contact));
    return map;
  }, [contacts]);

  const activityBase = useMemo<ActivityItem[]>(() => {
    const items: ActivityItem[] = [];
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

  const activityItems: ActivityItemWithRead[] = useMemo(
    () =>
      activityBase.map((item) => ({
        ...item,
        read: readActivityIds.has(item.id)
      })),
    [activityBase, readActivityIds]
  );

  const unseenActivityCount = useMemo(
    () => activityItems.filter((item) => !item.read).length,
    [activityItems]
  );

  const handleActivityRead = (id: string) => {
    setReadActivityIds((prev) => {
      const updated = new Set(prev);
      updated.add(id);
      return updated;
    });
  };

  const handleActivityReadAll = () => {
    setReadActivityIds(new Set(activityBase.map((item) => item.id)));
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
      const matchesRep = repFilter === 'All' || row.contact.salesman === repFilter;
      const matchesProvince = provinceFilter === 'All' || row.contact.province === provinceFilter;
      const matchesStatus = !statusFilters.length || statusFilters.includes(row.contact.status);
      const matchesPurchaseFilter = !noPurchaseOnly || noPurchaseSet.has(row.contact.id);
      const matchesSearchQuery = matchesSearch(row.contact, debouncedSearch);
      return matchesRep && matchesProvince && matchesStatus && matchesPurchaseFilter && matchesSearchQuery;
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

  useEffect(() => {
    if (!masterRows.length) {
      if (selectedClientId !== null) {
        setSelectedClientId(null);
      }
      return;
    }
    if (!selectedClientId || !masterRows.some((row) => row.contact.id === selectedClientId)) {
      setSelectedClientId(masterRows[0].contact.id);
    }
  }, [masterRows, selectedClientId]);

  const selectedTimeline = useMemo(() => {
    if (!selectedClientId) return [];
    const calls = (callLogsByContact.get(selectedClientId) || []).map((log) => ({
      id: `call-${log.id}`,
      type: 'call' as const,
      title: log.channel === 'text' ? 'SMS Touch' : 'Call',
      occurred_at: log.occurred_at,
      detail: log.notes,
      meta: `${log.channel === 'text' ? 'SMS' : 'Voice'} • ${log.direction === 'inbound' ? 'Inbound' : 'Outbound'} • ${log.outcome ? log.outcome.replace('_', ' ') : 'Logged'}`
    }));
    const inquiryEvents = (inquiriesByContact.get(selectedClientId) || []).map((inquiry) => ({
      id: `inq-${inquiry.id}`,
      type: 'inquiry' as const,
      title: 'Inquiry',
      occurred_at: inquiry.occurred_at,
      detail: inquiry.notes || inquiry.title,
      meta: `via ${inquiry.channel}`
    }));

    return [...calls, ...inquiryEvents].sort((a, b) => Date.parse(b.occurred_at) - Date.parse(a.occurred_at));
  }, [selectedClientId, callLogsByContact, inquiriesByContact]);

  const visibleTimeline = useMemo(
    () => (showFullTimeline ? selectedTimeline : selectedTimeline.slice(0, 5)),
    [selectedTimeline, showFullTimeline]
  );

  useEffect(() => {
    setShowFullTimeline(false);
  }, [selectedClientId]);

  const todayStart = useMemo(() => getStartOfToday(), []);
  const monthStart = useMemo(() => getStartOfMonth(), []);

  const callsToday = useMemo(
    () => countCallLogsInRange(callLogs, todayStart),
    [callLogs, todayStart]
  );

  const smsToday = useMemo(
    () => countCallLogsByChannelInRange(callLogs, 'text', todayStart),
    [callLogs, todayStart]
  );

  const clientsContactedToday = useMemo(
    () => countUniqueContactsInRange(callLogs, inquiries, todayStart),
    [callLogs, inquiries, todayStart]
  );

  const callsThisMonth = useMemo(
    () => countCallLogsInRange(callLogs, monthStart),
    [callLogs, monthStart]
  );

  const contactsThisMonth = useMemo(
    () => countUniqueContactsInRange(callLogs, inquiries, monthStart),
    [callLogs, inquiries, monthStart]
  );
  const conversionRate = useMemo(
    () => (contactsThisMonth ? Math.round((currentMonthPurchases.length / contactsThisMonth) * 100) : 0),
    [contactsThisMonth, currentMonthPurchases]
  );

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
    const counts = countCallOutcomes(callLogs);
    return [
      { name: 'Positive', value: counts.positive },
      { name: 'Follow-up', value: counts.follow_up },
      { name: 'Negative', value: counts.negative },
      { name: 'Other', value: counts.other }
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

  if (!currentUser) {
    return (
      <div className="flex items-center justify-center h-full p-6">
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-6 text-center shadow-sm max-w-md">
          <ShieldAlert className="w-10 h-10 text-rose-500 mx-auto mb-3" />
          <h2 className="text-lg font-bold text-slate-800 dark:text-white">Sign in to continue</h2>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            Please sign in with your sales agent account to view daily call monitoring insights.
          </p>
        </div>
      </div>
    );
  }

  if (!isSalesAgent) {
    return (
      <div className="flex items-center justify-center h-full p-6">
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-6 text-center shadow-sm max-w-md">
          <ShieldAlert className="w-10 h-10 text-amber-500 mx-auto mb-3" />
          <h2 className="text-lg font-bold text-slate-800 dark:text-white">Sales agent view</h2>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            The Daily Call Monitoring workspace is tailored for sales agents. Switch to the live owner view to monitor the entire team.
          </p>
        </div>
      </div>
    );
  }

  if (!agentDataName) {
    return (
      <div className="flex items-center justify-center h-full p-6">
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-6 text-center shadow-sm max-w-md">
          <ShieldAlert className="w-10 h-10 text-rose-500 mx-auto mb-3" />
          <h2 className="text-lg font-bold text-slate-800 dark:text-white">Profile Required</h2>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            Please make sure your profile includes your full name so we can match assigned accounts for {agentDisplayName}.
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
    <div className="h-full overflow-y-auto bg-slate-50 dark:bg-slate-950 p-4 lg:p-6 space-y-4">
      <header className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <div className="flex items-center gap-3">
            <Phone className="w-6 h-6 text-brand-blue" />
            <h1 className="text-2xl font-bold text-slate-800 dark:text-white">Daily Call Monitoring</h1>
          </div>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-2">
            Tracking every touchpoint for <span className="font-semibold">{agentDisplayName}</span>
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
              onClick={handleActivityReadAll}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-brand-blue text-white text-sm font-semibold shadow-sm"
            >
              <Bell className="w-4 h-4" />
              Activity
              {unseenActivityCount > 0 && (
                <span className="ml-1 px-2 py-0.5 rounded-full text-xs font-bold bg-white/20">
                  {unseenActivityCount}
                </span>
              )}
            </button>
          </div>
        </div>
      </header>

      {loadError && (
        <div className="bg-rose-50 dark:bg-rose-900/20 border border-rose-200 dark:border-rose-900 rounded-xl p-4 shadow-sm flex flex-col gap-2 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex items-start gap-3">
            <ShieldAlert className="w-5 h-5 text-rose-500 mt-0.5" />
            <div>
              <p className="text-sm font-semibold text-rose-600 dark:text-rose-300">Unable to load call activity</p>
              <p className="text-sm text-rose-600/80 dark:text-rose-200/80">
                {loadError}
              </p>
            </div>
          </div>
          <button
            onClick={loadAgentData}
            disabled={loading}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-white dark:bg-slate-900 text-sm font-semibold text-rose-600 dark:text-rose-200 border border-rose-200 dark:border-rose-800 disabled:opacity-50"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            Retry
          </button>
        </div>
      )}

      <section className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 border-l-4 border-l-brand-blue/70 rounded-lg p-3 shadow-sm">
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

        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 border-l-4 border-l-emerald-500/70 rounded-lg p-3 shadow-sm">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2 text-slate-400 dark:text-slate-500">
              <TrendingUp className="w-4 h-4" />
              <span className="text-xs font-semibold uppercase tracking-wide">Achievement</span>
            </div>
            <ArrowUpRight className="w-4 h-4 text-emerald-500" />
          </div>
          <p className="text-2xl font-bold text-slate-800 dark:text-white">
            {achievementsValue !== null ? formatCurrency(achievementsValue) : '—'}
          </p>
          <p
            className={`text-xs font-semibold mt-1 ${percentAchieved !== null && percentAchieved > 80
              ? 'text-emerald-500'
              : 'text-slate-500 dark:text-slate-400'
              }`}
          >
            {percentAchieved !== null ? `${percentAchieved}% of target` : 'Data unavailable'}
          </p>
          <div className="mt-3 h-2 rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
            {percentAchieved !== null ? (
              <div
                className={`h-full rounded-full ${percentAchieved > 80 ? 'bg-emerald-500' : 'bg-brand-blue'}`}
                style={{ width: `${percentAchieved}%` }}
              />
            ) : (
              <div className="h-full rounded-full bg-slate-200 dark:bg-slate-700 animate-pulse" />
            )}
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 border-l-4 border-l-rose-400/70 rounded-lg p-3 shadow-sm">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2 text-slate-400 dark:text-slate-500">
              <BarChart3 className="w-4 h-4" />
              <span className="text-xs font-semibold uppercase tracking-wide">Remaining</span>
            </div>
            <AlertCircle
              className={`w-4 h-4 ${remainingQuota !== null && remainingQuota < quota * 0.2 ? 'text-rose-500' : 'text-slate-400 dark:text-slate-500'
                }`}
            />
          </div>
          <p
            className={`text-2xl font-bold ${remainingQuota !== null && remainingQuota < quota * 0.2 ? 'text-rose-500' : 'text-slate-800 dark:text-white'
              }`}
          >
            {remainingQuota !== null ? formatCurrency(remainingQuota) : '—'}
          </p>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            {remainingQuota !== null ? 'Needed to hit target' : 'Data unavailable'}
          </p>
        </div>

        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 border-l-4 border-l-amber-400/70 rounded-lg p-3 shadow-sm">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2 text-slate-400 dark:text-slate-500">
              <Calendar className="w-4 h-4" />
              <span className="text-xs font-semibold uppercase tracking-wide">Follow-ups Due</span>
            </div>
            <ClipboardList className="w-4 h-4 text-amber-500" />
          </div>
          <p className="text-2xl font-bold text-slate-800 dark:text-white">
            {hasLoadedData ? followUpsDue : '—'}
          </p>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            {hasLoadedData ? 'Need action today' : 'Data unavailable'}
          </p>
        </div>
      </section>

      {/* Master Call View - Main Focus */}
      <section className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 border-l-4 border-l-brand-blue/70 rounded-xl shadow-sm">
        <div className="p-4 border-b border-slate-100 dark:border-slate-800 flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <div className="flex items-center gap-2 text-slate-500 dark:text-slate-400">
              <Filter className="w-4 h-4" />
              <span className="text-sm font-semibold text-slate-800 dark:text-white">Master Call View</span>
            </div>
            <p className="text-xs text-slate-400 dark:text-slate-500 mt-1">Full pipeline coverage across territories</p>
          </div>
          <div className="flex flex-wrap items-center gap-2 text-xs">
            <div className="flex items-center gap-2 bg-slate-50 dark:bg-slate-900/60 border border-slate-100 dark:border-slate-800 px-3 py-1.5 rounded-lg flex-1 min-w-[200px]">
              <Search className="w-4 h-4 text-slate-400" />
              <input
                className="bg-transparent text-sm outline-none text-slate-800 dark:text-slate-200 placeholder:text-slate-400 flex-1"
                placeholder="Search clients"
                value={searchValue}
                onChange={(event) => setSearchValue(event.target.value)}
              />
            </div>
            <select
              className="text-xs bg-slate-50 dark:bg-slate-900/60 border border-slate-100 dark:border-slate-800 rounded-lg px-2 py-1.5"
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
              className="text-xs bg-slate-50 dark:bg-slate-900/60 border border-slate-100 dark:border-slate-800 rounded-lg px-2 py-1.5"
              value={provinceFilter}
              onChange={(event) => setProvinceFilter(event.target.value)}
            >
              {availableProvinces.map((province) => (
                <option key={province} value={province}>
                  {province === 'All' ? 'All Areas' : province}
                </option>
              ))}
            </select>
            <label className="flex items-center gap-2 text-xs text-slate-600 dark:text-slate-300 px-3 py-1.5 bg-slate-50 dark:bg-slate-900/60 border border-slate-100 dark:border-slate-800 rounded-lg cursor-pointer select-none">
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
        <div className="px-4 py-3 border-b border-slate-100 dark:border-slate-800">
          <div className="flex flex-wrap gap-2">
            {statusOptions.map((status) => (
              <button
                key={status}
                onClick={() => toggleStatusFilter(status)}
                className={`text-[11px] font-semibold px-3 py-1 rounded-full border ${statusFilters.includes(status)
                  ? 'bg-brand-blue text-white border-brand-blue'
                  : 'bg-slate-50 dark:bg-slate-900/60 border-slate-100 dark:border-slate-800 text-slate-500 dark:text-slate-300'
                  }`}
              >
                {status}
              </button>
            ))}
          </div>
        </div>
        <div className="overflow-hidden">
          <div className="overflow-x-auto">
            <div className="max-h-[420px] overflow-y-auto">
              <table className="min-w-full divide-y divide-slate-200 dark:divide-slate-800 text-sm">
                <thead className="bg-slate-50 dark:bg-slate-900/60 text-slate-500 dark:text-slate-400">
                  <tr>
                    {[
                      { key: 'client', label: 'Client' },
                      { key: 'status', label: 'Status' },
                      { key: 'lastContact', label: 'Last Contact', sortable: true, sortKey: 'lastContact' },
                      { key: 'potential', label: 'Potential', sortable: true, sortKey: 'salesValue' },
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
                              const newField = column.sortKey || 'lastContact';
                              if (sortField === newField) {
                                setSortDirection((prev) => (prev === 'asc' ? 'desc' : 'asc'));
                              } else {
                                setSortField(newField as typeof sortField);
                                setSortDirection('desc');
                              }
                            }}
                          >
                            {column.label}
                            {(sortField === column.sortKey) && (
                              <ArrowUpRight
                                className={`w-3 h-3 ${sortDirection === 'desc' ? 'rotate-180' : ''}`}
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
                      <td className="px-3 py-4 min-w-[220px]">
                        <div className="flex items-start justify-between gap-3">
                          <div>
                            <p className="font-semibold text-slate-800 dark:text-white">{row.contact.company}</p>
                            <p className="text-xs text-slate-500 dark:text-slate-400">{row.contact.province}</p>
                          </div>
                        </div>
                        <div className="mt-2 flex items-center gap-3 text-slate-400 dark:text-slate-500">
                          <button
                            type="button"
                            title={`Rep: ${row.contact.salesman}`}
                            className="p-1 rounded-full bg-slate-100 dark:bg-slate-900/60"
                          >
                            <UserCheck className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            title={`${row.totalInteractions} touchpoints`}
                            className="p-1 rounded-full bg-slate-100 dark:bg-slate-900/60"
                          >
                            <Clock className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            title={row.contact.comment ? row.contact.comment : 'No notes provided'}
                            className="p-1 rounded-full bg-slate-100 dark:bg-slate-900/60"
                          >
                            <MessageSquare className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                      <td className="px-3 py-4">
                        <span className={`text-[11px] font-semibold px-2 py-0.5 rounded-full ${statusBadgeClasses(row.contact.status)}`}>
                          {row.contact.status}
                        </span>
                      </td>
                      <td className="px-3 py-4">
                        <p className="text-sm font-semibold text-slate-700 dark:text-slate-200">
                          {formatRelativeTime(row.lastContact)}
                        </p>
                        <p className="text-xs text-slate-500 dark:text-slate-400">
                          Last purchase {formatDate(row.lastPurchase)}
                        </p>
                      </td>
                      <td className="px-3 py-4">
                        <p className="text-sm font-bold text-slate-800 dark:text-white">{formatCurrency(row.totalSales)}</p>
                        <p className={`mt-1 inline-flex px-2 py-0.5 rounded-full text-[11px] font-semibold ${priorityBadgeClasses(row.priority)}`}>
                          Priority {Math.round(row.priority)}
                        </p>
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
                      <td colSpan={5} className="px-3 py-6 text-center text-sm text-slate-500 dark:text-slate-400">
                        {dataUnavailable ? 'Client data is unavailable. Retry loading the dashboard.' : 'No clients match the current filters.'}
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </section>


      <section className="grid grid-cols-1 lg:grid-cols-12 gap-4">
        <div className="lg:col-span-7 space-y-4">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 border-l-4 border-l-emerald-400/70 rounded-lg shadow-sm">
            <div className="p-3 border-b border-slate-100 dark:border-slate-800 flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
              <div className="flex items-center gap-2">
                <PhoneCall className="w-5 h-5 text-brand-blue" />
                <h2 className="text-lg font-bold text-slate-800 dark:text-white">Today's Call List</h2>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400">Prioritized outreach for the day</p>
            </div>
            <div className="p-3">
              {hasLoadedData ? (
                <AgentCallActivity
                  callLogs={callLogs}
                  inquiries={inquiries}
                  contacts={contacts}
                  maxItems={15}
                  title="Today's Call List"
                />
              ) : (
                <div className="text-sm text-rose-500 text-center py-6">Call activity unavailable</div>
              )}
            </div>
          </div>

          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 border-l-4 border-l-sky-400/70 rounded-lg shadow-sm p-3">
            <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
              <div className="flex items-center gap-2">
                <PhoneCall className="w-5 h-5 text-brand-blue" />
                <h2 className="text-lg font-bold text-slate-800 dark:text-white">Call Activity Tracker</h2>
              </div>
              <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
                <Clock className="w-4 h-4" />
                Updated live from Supabase
              </div>
            </div>
            <div className="mt-3 grid grid-cols-2 md:grid-cols-4 gap-3">
              <div className="p-2.5 rounded-lg border border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/60">
                <p className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 flex items-center gap-1 uppercase">
                  <PhoneForwarded className="w-3.5 h-3.5 text-brand-blue" />
                  Calls Today
                </p>
                <p className="text-2xl font-bold text-slate-800 dark:text-white mt-1">
                  {hasLoadedData ? callsToday : '—'}
                </p>
                {dataUnavailable && <p className="text-[11px] text-rose-500 mt-0.5">Data unavailable</p>}
              </div>
              <div className="p-2.5 rounded-lg border border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/60">
                <p className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 flex items-center gap-1 uppercase">
                  <MessageSquare className="w-3.5 h-3.5 text-purple-500" />
                  SMS Today
                </p>
                <p className="text-2xl font-bold text-slate-800 dark:text-white mt-1">
                  {hasLoadedData ? smsToday : '—'}
                </p>
                {dataUnavailable && <p className="text-[11px] text-rose-500 mt-0.5">Data unavailable</p>}
              </div>
              <div className="p-2.5 rounded-lg border border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/60">
                <p className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 flex items-center gap-1 uppercase">
                  <Users className="w-3.5 h-3.5 text-emerald-500" />
                  Contacts Today
                </p>
                <p className="text-2xl font-bold text-slate-800 dark:text-white mt-1">
                  {hasLoadedData ? clientsContactedToday : '—'}
                </p>
                {dataUnavailable && <p className="text-[11px] text-rose-500 mt-0.5">Data unavailable</p>}
              </div>
              <div className="p-2.5 rounded-lg border border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/60">
                <p className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 flex items-center gap-1 uppercase">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
                  Calls this Month
                </p>
                <p className="text-2xl font-bold text-slate-800 dark:text-white mt-1">
                  {hasLoadedData ? callsThisMonth : '—'}
                </p>
                {dataUnavailable && <p className="text-[11px] text-rose-500 mt-0.5">Data unavailable</p>}
              </div>
            </div>
            <div className="mt-4 grid grid-cols-1 lg:grid-cols-5 gap-3">
              <div className="lg:col-span-3 bg-slate-50 dark:bg-slate-900/50 rounded-lg p-3 border border-slate-100 dark:border-slate-800">
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
                    <span className="font-semibold text-slate-800 dark:text-white">
                      {hasLoadedData ? contactsThisMonth : '—'}
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-slate-500 dark:text-slate-400">Follow-ups Pending</span>
                    <span className="font-semibold text-amber-500">{hasLoadedData ? followUpsDue : '—'}</span>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-slate-500 dark:text-slate-400">Conversion Ratio</span>
                    <span className="font-semibold text-emerald-500">
                      {hasLoadedData ? `${conversionRate}%` : '—'}
                    </span>
                  </div>
                  {dataUnavailable && (
                    <p className="text-[11px] text-rose-500 mt-1">Monthly summary unavailable</p>
                  )}
                </div>
              </div>
              <div className="lg:col-span-2 bg-slate-50 dark:bg-slate-900/50 rounded-lg p-3 border border-slate-100 dark:border-slate-800">
                <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-300 mb-3">Outcome Mix</h3>
                {hasLoadedData ? (
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
                ) : (
                  <div className="h-48 flex items-center justify-center text-sm text-rose-500">Outcome data unavailable</div>
                )}
              </div>
            </div>
            <div className="mt-4 overflow-x-auto pb-2">
              <div className="flex gap-3 min-w-max">
                {perClientHistory.map((item) => (
                  <div
                    key={item.contact.id}
                    className="min-w-[220px] p-2.5 rounded-lg border border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900 flex flex-col gap-2 shadow-sm"
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
        </div>

        <div className="lg:col-span-5 space-y-6">
          <div className="space-y-6">
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 border-l-4 border-l-purple-400/70 rounded-xl shadow-sm p-4 flex flex-col max-h-[500px] min-h-0">
              <div className="flex items-center justify-between mb-4 shrink-0">
                <div className="flex items-center gap-2">
                  <Bell className="w-5 h-5 text-brand-blue" />
                  <h3 className="text-lg font-bold text-slate-800 dark:text-white">Activity Highlights</h3>
                </div>
                <button
                  onClick={handleActivityReadAll}
                  className="text-xs font-semibold text-brand-blue hover:underline"
                >
                  Mark all seen
                </button>
              </div>
              <div className="flex-1 min-h-0 overflow-y-auto pr-1 scrollbar-thin scrollbar-thumb-slate-300 dark:scrollbar-thumb-slate-700 scrollbar-track-transparent">
                <div className="space-y-3">
                  {activityItems.map((activity) => (
                    <div
                      key={activity.id}
                      className={`p-3 rounded-xl border ${activity.read ? 'border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/60' : 'border-brand-blue/20 bg-blue-50/60 dark:bg-blue-900/30'}`}
                    >
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 flex items-center gap-1">
                          {activity.type === 'report' ? <ShieldAlert className="w-3.5 h-3.5" /> : <Package className="w-3.5 h-3.5" />}
                          {activity.type === 'report' ? 'Owner' : 'Stock'}
                        </span>
                        {!activity.read && (
                          <button
                            onClick={() => handleActivityRead(activity.id)}
                            className="text-[11px] font-semibold text-brand-blue hover:underline"
                          >
                            Mark seen
                          </button>
                        )}
                      </div>
                      <p className="text-sm text-slate-700 dark:text-slate-200 font-semibold">{activity.title}</p>
                      <p className="text-sm text-slate-700 dark:text-slate-200 mt-1">{activity.message}</p>
                      <div className="mt-2 text-[11px] text-slate-400 dark:text-slate-500">
                        {formatRelativeTime(activity.timestamp)}
                      </div>
                    </div>
                  ))}
                  {activityItems.length === 0 && (
                    <div className="text-center text-sm text-slate-400 dark:text-slate-500 py-6">No recent activity</div>
                  )}
                </div>
              </div>
            </div>

            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 border-l-4 border-l-emerald-400/70 rounded-xl shadow-sm p-4 lg:sticky xl:top-24 z-10">
              {selectedClient ? (
                <>
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center">
                        <Phone className="w-5 h-5 text-brand-blue" />
                      </div>
                      <div>
                        <h3 className="text-base font-bold text-slate-800 dark:text-white">{selectedClient.company}</h3>
                        <p className="text-xs text-slate-500 dark:text-slate-400">{selectedClient.province}</p>
                      </div>
                    </div>
                    <button
                      onClick={() => setSelectedClientId(null)}
                      className="p-1 rounded-full text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-white"
                      aria-label="Close client panel"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                  <div className="mt-3 flex items-center gap-3 text-xs text-slate-500 dark:text-slate-400">
                    <span className={`px-2 py-0.5 rounded-full font-semibold ${statusBadgeClasses(selectedClient.status)}`}>
                      {selectedClient.status}
                    </span>
                    <span>Assigned: {selectedClient.salesman}</span>
                  </div>
                  <div className="mt-4 flex flex-wrap gap-2">
                    {[{ label: 'Call', icon: Phone }, { label: 'SMS', icon: MessageSquare }, { label: 'Email', icon: Mail }].map((action) => (
                      <button
                        key={action.label}
                        className="inline-flex items-center gap-2 px-3 py-1.5 text-xs font-semibold rounded-lg border border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-300"
                      >
                        <action.icon className="w-3.5 h-3.5" />
                        {action.label}
                      </button>
                    ))}
                  </div>
                  <div className="mt-4 flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
                    <span className="font-semibold text-slate-700 dark:text-slate-200">Recent activity</span>
                    {selectedTimeline.length > 5 && (
                      <button
                        onClick={() => setShowFullTimeline((prev) => !prev)}
                        className="text-xs font-semibold text-brand-blue hover:underline"
                      >
                        {showFullTimeline ? 'View less' : 'View all'}
                      </button>
                    )}
                  </div>
                  <div className="mt-3 space-y-3">
                    {visibleTimeline.map((event) => (
                      <div
                        key={event.id}
                        className="p-3 rounded-lg bg-slate-50 dark:bg-slate-900/60 border border-slate-100 dark:border-slate-800"
                      >
                        <div className="flex items-center justify-between text-sm font-semibold text-slate-700 dark:text-slate-200">
                          <span>{event.title}</span>
                          <span className="text-xs text-slate-500 dark:text-slate-400">{formatDate(event.occurred_at)}</span>
                        </div>
                        <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">{event.detail || 'No notes added.'}</p>
                        <p className="text-[11px] text-slate-400 dark:text-slate-500">{event.meta}</p>
                      </div>
                    ))}
                    {visibleTimeline.length === 0 && (
                      <div className="text-sm text-slate-500 dark:text-slate-400 text-center py-4">No activity logged yet</div>
                    )}
                  </div>
                </>
              ) : (
                <div className="text-center text-sm text-slate-500 dark:text-slate-400 py-10">
                  {masterRows.length ? 'Select a client to view their timeline.' : 'No clients available for the current filters.'}
                </div>
              )}
            </div>
          </div>

          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 border-l-4 border-l-indigo-400/70 rounded-xl shadow-sm p-4">
            <div className="flex items-center gap-2 mb-4">
              <Users className="w-5 h-5 text-brand-blue" />
              <h3 className="text-lg font-bold text-slate-800 dark:text-white">Client Segments</h3>
            </div>
            <div className="space-y-3">
              {([
                { key: 'active', title: 'Active • No Purchase', icon: UserCheck, data: categorizedEntries.active, virtual: activeVirtual },
                { key: 'inactivePositive', title: 'Inactive Positives', icon: UserPlus, data: categorizedEntries.inactivePositive, virtual: inactiveVirtual },
                { key: 'prospectivePositive', title: 'Prospective Positives', icon: UserX, data: categorizedEntries.prospectivePositive, virtual: prospectiveVirtual }
              ] as const).map(({ key, title, icon: Icon, data, virtual }) => {
                const isOpen = openClientLists[key];
                const { visibleItems, offsetTop, totalHeight, viewportHeight, handleScroll } = virtual;
                return (
                  <div key={title} className="border border-slate-100 dark:border-slate-800 rounded-xl bg-slate-50 dark:bg-slate-900/40">
                    <button
                      onClick={() => toggleClientList(key)}
                      className="w-full flex items-center justify-between px-3 py-3 text-left"
                    >
                      <div className="flex items-center gap-3">
                        <Icon className="w-5 h-5 text-brand-blue" />
                        <div>
                          <p className="text-sm font-semibold text-slate-800 dark:text-white">{title}</p>
                          <p className="text-xs text-slate-500 dark:text-slate-400">{data.length} clients</p>
                        </div>
                      </div>
                      <ChevronDown className={`w-5 h-5 text-slate-500 transition-transform ${isOpen ? '-rotate-180' : ''}`} />
                    </button>
                    {isOpen && (
                      <div className="border-t border-slate-100 dark:border-slate-800 px-3 pb-3">
                        <div
                          className="relative pr-1 max-h-[300px] overflow-y-auto scrollbar-thin scrollbar-thumb-slate-300 dark:scrollbar-thumb-slate-700 scrollbar-track-transparent"
                          style={{ height: `${viewportHeight}px` }}
                          onScroll={handleScroll}
                        >
                          <div style={{ height: `${totalHeight}px` }}>
                            <div style={{ transform: `translateY(${offsetTop}px)` }} className="space-y-3">
                              {visibleItems.map((entry) => (
                                <button
                                  key={entry.contact.id}
                                  onClick={() => setSelectedClientId(entry.contact.id)}
                                  className="w-full text-left bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-lg p-3 hover:border-brand-blue transition-colors"
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
                                  <div className="mt-2 flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
                                    <span>Last touch: {formatRelativeTime(entry.lastContact)}</span>
                                    <span>Priority {Math.round(entry.priority)}</span>
                                  </div>
                                  <p className="text-[11px] text-slate-400 dark:text-slate-500 mt-1">{formatComment(entry.contact.comment)}</p>
                                </button>
                              ))}
                            </div>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </section>
    </div>
  );
};

export default DailyCallMonitoringView;
