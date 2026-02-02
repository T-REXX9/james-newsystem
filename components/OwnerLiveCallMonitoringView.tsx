
import React, { useState, useRef, useEffect, useMemo, useCallback } from 'react';
import {
    Phone, PhoneIncoming, PhoneOutgoing, Search, Filter,
    Calendar, Target, ArrowUpRight, Send, MessageSquare,
    PhilippinePeso, TrendingUp, Package, Users, UserCheck, UserX, UserPlus, BarChart3, ClipboardList, Clock, FileText, ShieldAlert, RefreshCw, AlertTriangle, CheckCircle, XCircle
} from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend } from 'recharts';
import { MOCK_AGENTS } from '../constants';
import { fetchContacts, fetchCallLogs, fetchInquiries, fetchPurchases, subscribeToCallMonitoringUpdates, updateContact, createInquiry, fetchAgentPerformanceLeaderboard, fetchAgentPerformanceSummary, fetchAllPendingIncidentReports, approveIncidentReport, rejectIncidentReport, fetchPendingContactUpdates } from '../services/supabaseService';
import { Contact, CustomerStatus, CallLogEntry, Inquiry, Purchase, AgentSalesData, AgentPerformanceSummary, IncidentReportWithCustomer, UserProfile } from '../types';
import CompanyName from './CompanyName';
import AgentCallActivity, { AgentActivityItem } from './AgentCallActivity';
import { useToast } from './ToastProvider';
import { countCallOutcomes } from './callMetricsUtils';
import SalesPerformanceCard from './SalesPerformanceCard';
import AgentSummaryModal from './AgentSummaryModal';
import InquiryAlertPanel from './InquiryAlertPanel';
import ContactDetails from './ContactDetails';
import UpdateContactApprovalModal from './UpdateContactApprovalModal';

// Mock Chat Data
interface ChatMessage {
    id: string;
    sender: string;
    avatar: string;
    message: string;
    time: string;
    isMe: boolean;
}

const INITIAL_CHAT_MESSAGES: ChatMessage[] = [
    { id: '1', sender: 'James Quek', avatar: 'https://i.pravatar.cc/150?u=james', message: '@Sarah excellent handling of the objection on the Banawe Auto call earlier. That is exactly how we want to position the Q4 promo.', time: '10:30 AM', isMe: true },
    { id: '2', sender: 'Sarah Sales', avatar: 'https://i.pravatar.cc/150?u=sarah', message: 'Thanks Sir James! I remembered the training points from Monday.', time: '10:32 AM', isMe: false },
    { id: '3', sender: 'James Quek', avatar: 'https://i.pravatar.cc/150?u=james', message: '@Team remember we have a spiff on the Motul synthetic line today. Push for those add-ons!', time: '11:00 AM', isMe: true },
    { id: '4', sender: 'Esther Van', avatar: 'https://i.pravatar.cc/150?u=esther', message: 'Noted boss. I have two dealers interested in bulk orders.', time: '11:15 AM', isMe: false },
];

interface ActionModalProps {
    open: boolean;
    title: string;
    confirmLabel: string;
    onClose: () => void;
    onConfirm: () => void | Promise<void>;
    loading?: boolean;
    confirmClassName?: string;
    children: React.ReactNode;
}

const ActionModal: React.FC<ActionModalProps> = ({ open, title, confirmLabel, onClose, onConfirm, loading, confirmClassName, children }) => {
    if (!open) return null;
    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 px-4">
            <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl w-full max-w-md border border-slate-200 dark:border-slate-800">
                <div className="px-5 py-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
                    <h3 className="text-base font-bold text-slate-800 dark:text-white">{title}</h3>
                    <button onClick={onClose} className="text-slate-400 hover:text-slate-600" aria-label="Close">
                        ✕
                    </button>
                </div>
                <div className="px-5 py-4 text-slate-700 dark:text-slate-200">
                    {children}
                </div>
                <div className="px-5 py-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-end gap-2">
                    <button onClick={onClose} className="px-4 py-2 text-sm font-semibold text-slate-500 hover:text-slate-700">Cancel</button>
                    <button onClick={onConfirm} disabled={loading} className={`px-4 py-2 text-sm font-semibold rounded-lg text-white bg-brand-blue hover:bg-blue-600 disabled:opacity-60 disabled:cursor-not-allowed ${confirmClassName || ''}`}>
                        {loading ? 'Saving...' : confirmLabel}
                    </button>
                </div>
            </div>
        </div>
    );
};

interface OwnerLiveCallMonitoringViewProps {
    currentUser: UserProfile | null;
}

const OwnerLiveCallMonitoringView: React.FC<OwnerLiveCallMonitoringViewProps> = ({ currentUser }) => {
    const [filterAgent, setFilterAgent] = useState('All');
    const [filterType, setFilterType] = useState('All');
    const [searchQuery, setSearchQuery] = useState('');

    // Data State
    const [contacts, setContacts] = useState<Contact[]>([]);
    const [callLogs, setCallLogs] = useState<CallLogEntry[]>([]);
    const [inquiries, setInquiries] = useState<Inquiry[]>([]);
    const [purchases, setPurchases] = useState<Purchase[]>([]);
    const [selectedContactId, setSelectedContactId] = useState<string | null>(null);
    const [listState, setListState] = useState<Record<string, { scrollTop: number; height: number }>>({});
    const [showPricingModal, setShowPricingModal] = useState(false);
    const [showReassignModal, setShowReassignModal] = useState(false);
    const [showBlacklistModal, setShowBlacklistModal] = useState(false);
    const [showReplyModal, setShowReplyModal] = useState(false);
    const [showContactDetails, setShowContactDetails] = useState(false);
    const [showStatsModal, setShowStatsModal] = useState(false);
    const [showActivityModal, setShowActivityModal] = useState(false);
    const [selectedActivityItem, setSelectedActivityItem] = useState<AgentActivityItem | null>(null);
    const [statsModalKey, setStatsModalKey] = useState<
        'active'
        | 'inactive'
        | 'prospective'
        | 'totalCalls'
        | 'missedCalls'
        | 'pendingReports'
        | 'weeklySales'
        | 'monthlySales'
        | 'yearlySales'
        | null
    >(null);
    const [statsModalSearch, setStatsModalSearch] = useState('');
    const [statsCallsRange, setStatsCallsRange] = useState<'today' | 'week' | 'month' | 'year' | 'all'>('today');
    const [pricingForm, setPricingForm] = useState({ priceGroup: '', terms: '', creditLimit: '' });
    const [reassignForm, setReassignForm] = useState({ agentId: '' });
    const [blacklistReason, setBlacklistReason] = useState('');
    const [replyMessage, setReplyMessage] = useState('');
    const [actionLoading, setActionLoading] = useState(false);
    const [customerSearchQuery, setCustomerSearchQuery] = useState('');

    // Customer Stats State
    const [customerStats, setCustomerStats] = useState({ active: 0, inactive: 0, prospective: 0 });

    // Sales Performance Leaderboard State
    const [agentLeaderboard, setAgentLeaderboard] = useState<AgentSalesData[]>([]);
    const [leaderboardLoading, setLeaderboardLoading] = useState(false);
    const [selectedAgentId, setSelectedAgentId] = useState<string | null>(null);
    const [showAgentModal, setShowAgentModal] = useState(false);
    const [agentSummary, setAgentSummary] = useState<AgentPerformanceSummary | null>(null);
    const [agentSummaryLoading, setAgentSummaryLoading] = useState(false);

    // Incident Reports State
    const [pendingIncidentReports, setPendingIncidentReports] = useState<IncidentReportWithCustomer[]>([]);
    const [incidentReportsLoading, setIncidentReportsLoading] = useState(false);
    const [selectedIncidentReport, setSelectedIncidentReport] = useState<IncidentReportWithCustomer | null>(null);
    const [pendingContactUpdates, setPendingContactUpdates] = useState<any[]>([]);
    const [pendingContactUpdatesLoading, setPendingContactUpdatesLoading] = useState(false);
    const [updateReviewContact, setUpdateReviewContact] = useState<Contact | null>(null);

    // Chat State
    const [chatMessages, setChatMessages] = useState<ChatMessage[]>(INITIAL_CHAT_MESSAGES);
    const [newMessage, setNewMessage] = useState('');

    // Mention State
    const [mentionQuery, setMentionQuery] = useState('');
    const [showMentions, setShowMentions] = useState(false);
    const [selectedIndex, setSelectedIndex] = useState(0);

    const chatContainerRef = useRef<HTMLDivElement>(null);
    const inputRef = useRef<HTMLInputElement>(null);
    const { addToast } = useToast();

    const loadData = useCallback(async () => {
        try {
            const [contactData, callLogData, inquiryData, purchaseData] = await Promise.all([
                fetchContacts(),
                fetchCallLogs(),
                fetchInquiries(),
                fetchPurchases()
            ]);

            setContacts(contactData);
            setCallLogs(callLogData.length ? callLogData : []);
            setInquiries(inquiryData);
            setPurchases(purchaseData);

            setSelectedContactId((prev) => {
                if (prev) return prev;
                return contactData.length ? contactData[0].id : null;
            });

            setCustomerStats({
                active: contactData.filter(c => c.status === CustomerStatus.ACTIVE).length,
                inactive: contactData.filter(c => c.status === CustomerStatus.INACTIVE).length,
                prospective: contactData.filter(c => c.status === CustomerStatus.PROSPECTIVE).length,
            });

            // Load sales performance leaderboard for current month
            const today = new Date();
            const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1).toISOString().split('T')[0];
            const endOfMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0).toISOString().split('T')[0];

            setLeaderboardLoading(true);
            const leaderboardData = await fetchAgentPerformanceLeaderboard(startOfMonth, endOfMonth);
            setAgentLeaderboard(leaderboardData);
            setLeaderboardLoading(false);
        } catch (error) {
            console.error('Error loading live call monitoring data:', error);
            setLeaderboardLoading(false);
        }
    }, []);

    const loadAgentSummary = useCallback(async (agentId: string) => {
        try {
            setSelectedAgentId(agentId);
            setShowAgentModal(true);
            setAgentSummaryLoading(true);

            const today = new Date();
            const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1).toISOString().split('T')[0];
            const endOfMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0).toISOString().split('T')[0];

            const summary = await fetchAgentPerformanceSummary(agentId, startOfMonth, endOfMonth);
            setAgentSummary(summary);
            setAgentSummaryLoading(false);
        } catch (error) {
            console.error('Error loading agent summary:', error);
            setAgentSummaryLoading(false);
        }
    }, []);

    const loadPendingContactUpdates = useCallback(async () => {
        try {
            setPendingContactUpdatesLoading(true);
            const updates = await fetchPendingContactUpdates();
            setPendingContactUpdates(updates || []);
        } catch (error) {
            console.error('Error loading pending contact updates:', error);
        } finally {
            setPendingContactUpdatesLoading(false);
        }
    }, []);

    const loadPendingIncidentReports = useCallback(async () => {
        try {
            setIncidentReportsLoading(true);
            const reports = await fetchAllPendingIncidentReports();
            setPendingIncidentReports(reports);
            setIncidentReportsLoading(false);
        } catch (error) {
            console.error('Error loading pending incident reports:', error);
            addToast('Failed to load pending incident reports', 'error');
            setIncidentReportsLoading(false);
        }
    }, [addToast]);

    const handleReviewContactUpdate = (contactId: string) => {
        const contact = contactsMap.get(contactId) || ({ id: contactId } as Contact);
        setUpdateReviewContact(contact);
    };

    const handleApproveIncidentReport = useCallback(async (reportId: string) => {
        if (!currentUser) {
            addToast('User not authenticated', 'error');
            return;
        }
        try {
            await approveIncidentReport(reportId, currentUser.id);
            addToast('Incident report approved successfully', 'success');
            await loadPendingIncidentReports();
        } catch (error) {
            console.error('Error approving incident report:', error);
            addToast('Failed to approve incident report', 'error');
        }
    }, [currentUser, addToast, loadPendingIncidentReports]);

    const handleRejectIncidentReport = useCallback(async (reportId: string, notes?: string) => {
        if (!currentUser) {
            addToast('User not authenticated', 'error');
            return;
        }
        try {
            await rejectIncidentReport(reportId, currentUser.id, notes);
            addToast('Incident report rejected', 'success');
            await loadPendingIncidentReports();
        } catch (error) {
            console.error('Error rejecting incident report:', error);
            addToast('Failed to reject incident report', 'error');
        }
    }, [currentUser, addToast, loadPendingIncidentReports]);

    useEffect(() => {
        loadData();
        loadPendingIncidentReports();
        loadPendingContactUpdates();
    }, [loadData, loadPendingIncidentReports, loadPendingContactUpdates]);

    useEffect(() => {
        const unsubscribe = subscribeToCallMonitoringUpdates(() => {
            loadData();
            loadPendingContactUpdates();
        });
        return () => {
            unsubscribe();
        };
    }, [loadData, loadPendingContactUpdates]);


    // Keep the chat scrolled to the latest message without moving the page itself
    useEffect(() => {
        const container = chatContainerRef.current;
        if (container) {
            container.scrollTo({ top: container.scrollHeight, behavior: 'smooth' });
        }
    }, [chatMessages]);

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const val = e.target.value;
        setNewMessage(val);

        // Check if we are typing a mention
        const lastAt = val.lastIndexOf('@');
        if (lastAt !== -1) {
            const query = val.slice(lastAt + 1);
            // If query contains space, assume mention is finished or invalid for this simple picker
            if (!query.includes(' ')) {
                setMentionQuery(query);
                setShowMentions(true);
                setSelectedIndex(0);
                return;
            }
        }
        setShowMentions(false);
    };

    const insertMention = (agentName: string) => {
        const lastAt = newMessage.lastIndexOf('@');
        if (lastAt !== -1) {
            const prefix = newMessage.slice(0, lastAt);
            setNewMessage(`${prefix}@${agentName} `);
            setShowMentions(false);
            inputRef.current?.focus();
        }
    };

    const handleSendMessage = () => {
        if (!newMessage.trim()) return;
        const msg: ChatMessage = {
            id: Date.now().toString(),
            sender: 'James Quek',
            avatar: 'https://i.pravatar.cc/150?u=james',
            message: newMessage,
            time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
            isMe: true
        };
        setChatMessages([...chatMessages, msg]);
        setNewMessage('');
        setShowMentions(false);
    };

    const filteredAgents = MOCK_AGENTS.filter(agent =>
        agent.name.toLowerCase().includes(mentionQuery.toLowerCase()) ||
        agent.role.toLowerCase().includes(mentionQuery.toLowerCase())
    );

    const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
        if (showMentions && filteredAgents.length > 0) {
            if (e.key === 'ArrowUp') {
                e.preventDefault();
                setSelectedIndex(prev => (prev > 0 ? prev - 1 : filteredAgents.length - 1));
                return;
            }
            if (e.key === 'ArrowDown') {
                e.preventDefault();
                setSelectedIndex(prev => (prev < filteredAgents.length - 1 ? prev + 1 : 0));
                return;
            }
            if (e.key === 'Enter' || e.key === 'Tab') {
                e.preventDefault();
                insertMention(filteredAgents[selectedIndex].name);
                return;
            }
            if (e.key === 'Escape') {
                e.preventDefault();
                setShowMentions(false);
                return;
            }
        }

        if (e.key === 'Enter') {
            e.preventDefault();
            handleSendMessage();
        }
    };

    const contactsMap = useMemo(() => {
        const map = new Map<string, Contact>();
        contacts.forEach((c) => map.set(c.id, c));
        return map;
    }, [contacts]);

    const effectiveLogs = useMemo(() => callLogs, [callLogs]);

    const formatDate = (value?: string | null) => value ? new Date(value).toLocaleDateString() : 'N/A';
    const formatDateTime = (value?: string | null) => value ? new Date(value).toLocaleString() : 'N/A';
    const formatDuration = (seconds: number) => {
        if (!seconds) return '0s';
        const m = Math.floor(seconds / 60);
        const s = seconds % 60;
        return m ? `${m}m ${s}s` : `${s}s`;
    };
    const getFormerName = (contact?: Contact | null) => {
        if (!contact) return '';
        const candidateKeys = [
            'pastName',
            'past_name',
            'pastname',
            'formerName',
            'former_name',
            'formername'
        ];
        for (const key of candidateKeys) {
            const value = (contact as any)[key];
            if (typeof value === 'string' && value.trim().length > 0) {
                return value;
            }
        }
        return '';
    };
    const getCompanyNameParts = (contact?: Contact | null) => {
        const companyName = contact?.company || 'Unknown';
        const formerName = getFormerName(contact);
        const combinedLabel = formerName ? `${companyName} (formerly ${formerName})` : companyName;
        return { companyName, formerName, combinedLabel };
    };

    const latestActivityDate = useCallback((contactId: string) => {
        const log = effectiveLogs.find(l => l.contact_id === contactId);
        const inquiry = inquiries.find(i => i.contact_id === contactId);
        const purchase = purchases.find(p => p.contact_id === contactId);
        const dates = [log?.occurred_at, inquiry?.occurred_at, purchase?.purchased_at, contactsMap.get(contactId)?.lastContactDate].filter(Boolean) as string[];
        if (!dates.length) return null;
        return dates.sort().reverse()[0];
    }, [effectiveLogs, inquiries, purchases, contactsMap]);

    // --- Virtualized list helpers for large customer groups ---
    const ITEM_HEIGHT = 64;
    const getRange = (key: string, total: number) => {
        const state = listState[key] || { scrollTop: 0, height: 200 };
        const start = Math.max(0, Math.floor(state.scrollTop / ITEM_HEIGHT));
        const visibleCount = Math.ceil(state.height / ITEM_HEIGHT) + 6; // buffer
        const end = Math.min(total, start + visibleCount);
        return { start, end, height: state.height };
    };

    const handleListScroll = (key: string) => (e: React.UIEvent<HTMLDivElement>) => {
        const target = e.currentTarget;
        setListState((prev) => ({
            ...prev,
            [key]: { scrollTop: target.scrollTop, height: target.clientHeight }
        }));
    };

    const totalCalls = effectiveLogs.length;

    const outcomeCounts = useMemo(() => countCallOutcomes(effectiveLogs), [effectiveLogs]);
    const outcomeData = [
        { name: 'Positive', value: outcomeCounts.positive, color: '#10b981' },
        { name: 'Follow-up', value: outcomeCounts.follow_up, color: '#f59e0b' },
        { name: 'Negative', value: outcomeCounts.negative, color: '#ef4444' },
        { name: 'Others', value: outcomeCounts.other, color: '#6366f1' },
    ];

    // --- Agent Chart Data ---
    const agentChartData = MOCK_AGENTS.map(agent => {
        const agentLogs = effectiveLogs.filter(log => log.agent_name === agent.name);
        return {
            name: agent.name.split(' ')[0],
            calls: agentLogs.length,
            successful: agentLogs.filter(l => l.outcome === 'positive').length
        };
    });

    const agentAvatarMap = useMemo(() => {
        const m = new Map<string, string>();
        MOCK_AGENTS.forEach(a => m.set(a.name, a.avatar));
        return m;
    }, []);

    // --- Filter Logic ---
    const filteredLogs = effectiveLogs.filter(log => {
        const contact = contactsMap.get(log.contact_id);
        const matchesAgent = filterAgent === 'All' || log.agent_name === filterAgent;
        const matchesType = filterType === 'All' || log.direction === filterType;
        const matchesSearch = (contact?.company || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
            (contact?.name || '').toLowerCase().includes(searchQuery.toLowerCase());
        return matchesAgent && matchesType && matchesSearch;
    });

    const filteredInquiries = useMemo(() => {
        return inquiries.filter((inquiry) => {
            const contact = contactsMap.get(inquiry.contact_id);
            const matchesAgent = filterAgent === 'All' || contact?.salesman === filterAgent;
            const matchesSearch =
                (contact?.company || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
                (contact?.name || '').toLowerCase().includes(searchQuery.toLowerCase());
            return matchesAgent && matchesSearch;
        });
    }, [contactsMap, filterAgent, inquiries, searchQuery]);

    const isPositiveInterest = (contactId: string) => {
        return effectiveLogs.some(l => l.contact_id === contactId && (l.outcome === 'positive' || l.outcome === 'follow_up')) ||
            inquiries.some(i => i.contact_id === contactId && i.sentiment === 'positive');
    };

    const isThisMonth = (dateStr?: string | null) => {
        if (!dateStr) return false;
        const d = new Date(dateStr);
        const now = new Date();
        return d.getUTCFullYear() === now.getUTCFullYear() && d.getUTCMonth() === now.getUTCMonth();
    };

    const groupedCustomers = useMemo(() => {
        const groups = [
            { key: CustomerStatus.ACTIVE, label: 'Active' },
            { key: CustomerStatus.INACTIVE, label: 'Inactive' },
            { key: CustomerStatus.PROSPECTIVE, label: 'Prospective' },
        ];
        return groups.map((g) => {
            const items = contacts.filter(c => c.status === g.key).map((c) => ({
                contact: c,
                lastActivity: latestActivityDate(c.id) || c.lastContactDate,
            }));
            return { ...g, items };
        });
    }, [contacts, latestActivityDate]);

    const leadOpportunities = useMemo(() => {
        const activeNoPurchase = contacts.filter(c => c.status === CustomerStatus.ACTIVE && !purchases.some(p => p.contact_id === c.id && isThisMonth(p.purchased_at)));
        const inactivePositive = contacts.filter(c => c.status === CustomerStatus.INACTIVE && isPositiveInterest(c.id));
        const prospectivePositive = contacts.filter(c => c.status === CustomerStatus.PROSPECTIVE && isPositiveInterest(c.id));
        return { activeNoPurchase, inactivePositive, prospectivePositive };
    }, [contacts, purchases, inquiries, effectiveLogs]);

    const todayIso = new Date().toISOString().slice(0, 10);
    const newProspectsToday = contacts.filter(c => c.status === CustomerStatus.PROSPECTIVE && (latestActivityDate(c.id) || '').startsWith(todayIso));
    const newCustomersToday = contacts.filter(c => c.status === CustomerStatus.ACTIVE && (latestActivityDate(c.id) || '').startsWith(todayIso));

    const selectedContact = selectedContactId ? contactsMap.get(selectedContactId) : undefined;
    const contactInquiries = selectedContactId ? inquiries.filter(i => i.contact_id === selectedContactId).sort((a, b) => (b.occurred_at || '').localeCompare(a.occurred_at || '')) : [];
    const contactPurchases = selectedContactId ? purchases.filter(p => p.contact_id === selectedContactId).sort((a, b) => (b.purchased_at || '').localeCompare(a.purchased_at || '')) : [];

    const salesFromStatus = (status: CustomerStatus) => {
        const ids = contacts.filter(c => c.status === status).map(c => c.id);
        return purchases.filter(p => ids.includes(p.contact_id)).reduce((sum, p) => sum + Number(p.amount || 0), 0);
    };
    const totalSales = purchases.reduce((sum, p) => sum + Number(p.amount || 0), 0);

    const renderMessageText = (text: string) => {
        // Simple highlight for words starting with @
        return text.split(' ').map((word, i) => {
            if (word.startsWith('@')) {
                return <span key={i} className="font-bold text-brand-blue dark:text-blue-300">{word} </span>
            }
            return <span key={i}>{word} </span>
        });
    };

    const openStatsModal = (
        key:
            | 'active'
            | 'inactive'
            | 'prospective'
            | 'totalCalls'
            | 'missedCalls'
            | 'pendingReports'
            | 'weeklySales'
            | 'monthlySales'
            | 'yearlySales'
    ) => {
        setStatsModalKey(key);
        setStatsModalSearch('');
        if (key === 'totalCalls' || key === 'missedCalls') {
            setStatsCallsRange('today');
        }
        setShowStatsModal(true);
    };

    const formatPeso = (value: number) =>
        new Intl.NumberFormat('en-PH', { style: 'currency', currency: 'PHP', maximumFractionDigits: 0 }).format(value || 0);

    const formatPesoCompact = (value: number) => {
        const formatted = new Intl.NumberFormat('en-PH', {
            notation: 'compact',
            compactDisplay: 'short',
            maximumFractionDigits: 1
        }).format(value || 0);
        return `₱${formatted}`;
    };

    const getStartOfTodayLocal = () => {
        const start = new Date();
        start.setHours(0, 0, 0, 0);
        return start;
    };

    const getStartOfWeekLocal = () => {
        const start = getStartOfTodayLocal();
        const day = start.getDay();
        const diff = (day - 1 + 7) % 7;
        start.setDate(start.getDate() - diff);
        return start;
    };

    const getStartOfMonthLocal = () => {
        const start = new Date();
        start.setDate(1);
        start.setHours(0, 0, 0, 0);
        return start;
    };

    const getStartOfYearLocal = () => {
        const start = new Date();
        start.setMonth(0, 1);
        start.setHours(0, 0, 0, 0);
        return start;
    };

    const isWithinStart = (value?: string | null, start?: Date | null) => {
        if (!value) return false;
        const timestamp = Date.parse(value);
        if (Number.isNaN(timestamp)) return false;
        if (!start) return true;
        return timestamp >= start.getTime();
    };

    const missedCallPredicate = useCallback((log: CallLogEntry) => {
        return log.channel === 'call' && (!log.duration_seconds || log.duration_seconds === 0);
    }, []);

    const statsModalTitle = useMemo(() => {
        if (statsModalKey === 'active') return 'Active Clients';
        if (statsModalKey === 'inactive') return 'Inactive Clients';
        if (statsModalKey === 'prospective') return 'Prospective Clients';
        if (statsModalKey === 'totalCalls') return 'Total Calls';
        if (statsModalKey === 'missedCalls') return 'Missed Calls';
        if (statsModalKey === 'pendingReports') return 'Pending Incident Reports';
        if (statsModalKey === 'weeklySales') return 'Weekly Sales Breakdown';
        if (statsModalKey === 'monthlySales') return 'Monthly Sales Breakdown';
        if (statsModalKey === 'yearlySales') return 'Yearly Sales Breakdown';
        return 'Details';
    }, [statsModalKey]);

    const statsModalSearchNormalized = useMemo(() => statsModalSearch.trim().toLowerCase(), [statsModalSearch]);

    const statsModalContacts = useMemo(() => {
        if (!statsModalKey) return [] as Contact[];
        if (!['active', 'inactive', 'prospective'].includes(statsModalKey)) return [] as Contact[];

        const status = statsModalKey === 'active'
            ? CustomerStatus.ACTIVE
            : statsModalKey === 'inactive'
                ? CustomerStatus.INACTIVE
                : CustomerStatus.PROSPECTIVE;

        return contacts
            .filter((contact) => contact.status === status)
            .filter((contact) => {
                if (!statsModalSearchNormalized) return true;
                return [contact.company, contact.name, contact.province, contact.city]
                    .filter(Boolean)
                    .some((field) => String(field).toLowerCase().includes(statsModalSearchNormalized));
            })
            .sort((a, b) => (a.company || '').localeCompare(b.company || ''));
    }, [contacts, statsModalKey, statsModalSearchNormalized]);

    const statsCallsRangeStart = useMemo(() => {
        if (statsCallsRange === 'today') return getStartOfTodayLocal();
        if (statsCallsRange === 'week') return getStartOfWeekLocal();
        if (statsCallsRange === 'month') return getStartOfMonthLocal();
        if (statsCallsRange === 'year') return getStartOfYearLocal();
        return null;
    }, [statsCallsRange]);

    const statsModalCallLogs = useMemo(() => {
        if (!statsModalKey) return [] as CallLogEntry[];
        if (!['totalCalls', 'missedCalls'].includes(statsModalKey)) return [] as CallLogEntry[];

        return effectiveLogs
            .filter((log) => isWithinStart(log.occurred_at, statsCallsRangeStart))
            .filter((log) => {
                if (!statsModalSearchNormalized) return true;
                const contact = contactsMap.get(log.contact_id);
                return [contact?.company, contact?.name, log.agent_name, log.direction, log.channel, log.outcome]
                    .filter(Boolean)
                    .some((field) => String(field).toLowerCase().includes(statsModalSearchNormalized));
            })
            .filter((log) => (statsModalKey === 'missedCalls' ? missedCallPredicate(log) : true))
            .sort((a, b) => Date.parse(b.occurred_at || '') - Date.parse(a.occurred_at || ''));
    }, [statsModalKey, effectiveLogs, statsCallsRangeStart, statsModalSearchNormalized, contactsMap, missedCallPredicate]);

    const statsModalSalesRows = useMemo(() => {
        if (!statsModalKey) return [] as Array<{ contactId: string; company: string; salesman: string; total: number }>;
        if (!['weeklySales', 'monthlySales', 'yearlySales'].includes(statsModalKey)) {
            return [] as Array<{ contactId: string; company: string; salesman: string; total: number }>;
        }

        const rangeStart = statsModalKey === 'weeklySales'
            ? getStartOfWeekLocal()
            : statsModalKey === 'monthlySales'
                ? getStartOfMonthLocal()
                : getStartOfYearLocal();

        const totals = new Map<string, number>();
        purchases
            .filter((purchase) => purchase.status === 'paid')
            .filter((purchase) => isWithinStart(purchase.purchased_at, rangeStart))
            .forEach((purchase) => {
                totals.set(purchase.contact_id, (totals.get(purchase.contact_id) || 0) + Number(purchase.amount || 0));
            });

        const rows = Array.from(totals.entries()).map(([contactId, total]) => {
            const contact = contactsMap.get(contactId);
            return {
                contactId,
                company: contact?.company || 'Unknown customer',
                salesman: contact?.salesman || contact?.assignedAgent || '—',
                total
            };
        });

        return rows
            .filter((row) => {
                if (!statsModalSearchNormalized) return true;
                return [row.company, row.salesman]
                    .filter(Boolean)
                    .some((field) => String(field).toLowerCase().includes(statsModalSearchNormalized));
            })
            .sort((a, b) => b.total - a.total);
    }, [statsModalKey, purchases, contactsMap, statsModalSearchNormalized]);

    const statsModalSalesTotal = useMemo(() => {
        return statsModalSalesRows.reduce((sum, row) => sum + (row.total || 0), 0);
    }, [statsModalSalesRows]);

    const weeklySalesTotal = useMemo(() => {
        const start = getStartOfWeekLocal();
        return purchases
            .filter((purchase) => purchase.status === 'paid')
            .filter((purchase) => isWithinStart(purchase.purchased_at, start))
            .reduce((sum, purchase) => sum + Number(purchase.amount || 0), 0);
    }, [purchases]);

    const monthlySalesTotal = useMemo(() => {
        const start = getStartOfMonthLocal();
        return purchases
            .filter((purchase) => purchase.status === 'paid')
            .filter((purchase) => isWithinStart(purchase.purchased_at, start))
            .reduce((sum, purchase) => sum + Number(purchase.amount || 0), 0);
    }, [purchases]);

    const yearlySalesTotal = useMemo(() => {
        const start = getStartOfYearLocal();
        return purchases
            .filter((purchase) => purchase.status === 'paid')
            .filter((purchase) => isWithinStart(purchase.purchased_at, start))
            .reduce((sum, purchase) => sum + Number(purchase.amount || 0), 0);
    }, [purchases]);

    const missedCallsToday = useMemo(() => {
        const start = getStartOfTodayLocal();
        return effectiveLogs
            .filter((log) => isWithinStart(log.occurred_at, start))
            .filter((log) => missedCallPredicate(log)).length;
    }, [effectiveLogs, missedCallPredicate]);

    const openActivityModal = useCallback((item: AgentActivityItem) => {
        setSelectedActivityItem(item);
        setShowActivityModal(true);
    }, []);

    const selectedActivityContact = useMemo(() => {
        if (!selectedActivityItem) return null;
        return contactsMap.get(selectedActivityItem.contact_id) || null;
    }, [selectedActivityItem, contactsMap]);

    const getIssueTypeBadge = useCallback((type: IncidentReportWithCustomer['issue_type']) => {
        const badges = {
            product_quality: { label: 'Product Quality', color: 'bg-rose-100 dark:bg-rose-900/30 text-rose-700 dark:text-rose-400' },
            service_quality: { label: 'Service Quality', color: 'bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-400' },
            delivery: { label: 'Delivery', color: 'bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400' },
            other: { label: 'Other', color: 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-400' }
        };
        return badges[type] || badges.other;
    }, []);

    const openIncidentReportModal = useCallback((report: IncidentReportWithCustomer) => {
        setSelectedIncidentReport(report);
    }, []);

    const closeIncidentReportModal = useCallback(() => {
        setSelectedIncidentReport(null);
    }, []);

    const handleApproveSelectedIncidentReport = useCallback(async () => {
        if (!selectedIncidentReport) return;
        await handleApproveIncidentReport(selectedIncidentReport.id);
        setSelectedIncidentReport(null);
    }, [selectedIncidentReport, handleApproveIncidentReport]);

    const handleRejectSelectedIncidentReport = useCallback(async () => {
        if (!selectedIncidentReport) return;
        await handleRejectIncidentReport(selectedIncidentReport.id);
        setSelectedIncidentReport(null);
    }, [selectedIncidentReport, handleRejectIncidentReport]);

    const CompactMetric = ({ title, value, subtext, icon: Icon, colorClass, bgClass, onClick }: any) => {
        const inner = (
            <>
                <div className={`p-1.5 rounded-md ${colorClass}`}>
                    <Icon className="w-4 h-4" />
                </div>
                <div className="min-w-0 flex-1">
                    <p className="text-[9px] uppercase font-bold text-slate-400 tracking-wide whitespace-nowrap truncate">{title}</p>
                    <div className="flex items-baseline gap-1.5">
                        <h4 className="text-lg font-bold text-slate-800 dark:text-white leading-none">{value}</h4>
                        {subtext && <span className="text-[9px] text-slate-500 font-medium truncate">{subtext}</span>}
                    </div>
                </div>
            </>
        );

        const baseClasses = `flex items-center gap-2 p-2.5 rounded-lg border border-slate-200 dark:border-slate-800 ${bgClass || 'bg-white dark:bg-slate-900'} shadow-sm`;

        if (typeof onClick === 'function') {
            return (
                <button
                    type="button"
                    onClick={onClick}
                    className={`${baseClasses} text-left hover:bg-white/80 dark:hover:bg-slate-900/70 transition-colors cursor-pointer focus:outline-none focus:ring-2 focus:ring-brand-blue/40`}
                >
                    {inner}
                </button>
            );
        }

        return (
            <div className={baseClasses}>
                {inner}
            </div>
        );
    };

    const selectedAgentOptions = useMemo(() => MOCK_AGENTS.map(agent => ({ id: agent.id, name: agent.name })), []);
    const customerSearchResults = useMemo(() => {
        if (!customerSearchQuery.trim()) return [];
        const q = customerSearchQuery.toLowerCase();
        return contacts
            .filter(c => (c.company || '').toLowerCase().includes(q) || (c.name || '').toLowerCase().includes(q))
            .slice(0, 8);
    }, [customerSearchQuery, contacts]);

    const ensureSelectedContact = () => {
        if (!selectedContact) {
            addToast({ type: 'error', message: 'Please select a customer first.' });
            return false;
        }
        return true;
    };

    const openPricingModal = () => {
        if (!ensureSelectedContact() || !selectedContact) return;
        setPricingForm({
            priceGroup: selectedContact.priceGroup || '',
            terms: selectedContact.terms || '',
            creditLimit: selectedContact.creditLimit ? String(selectedContact.creditLimit) : ''
        });
        setShowPricingModal(true);
    };

    const openReassignModal = () => {
        if (!ensureSelectedContact()) return;
        const defaultAgent = selectedAgentOptions[0]?.id || '';
        setReassignForm({ agentId: selectedAgentOptions.find(a => a.name === selectedContact?.assignedAgent)?.id || defaultAgent });
        setShowReassignModal(true);
    };

    const openBlacklistModal = () => {
        if (!ensureSelectedContact()) return;
        setBlacklistReason('');
        setShowBlacklistModal(true);
    };

    const openReplyModal = () => {
        if (!ensureSelectedContact()) return;
        setReplyMessage('');
        setShowReplyModal(true);
    };

    const openContactDetails = () => {
        if (!ensureSelectedContact()) return;
        setShowContactDetails(true);
    };

    const handlePricingSubmit = async () => {
        if (!selectedContact) return;
        setActionLoading(true);
        try {
            await updateContact(selectedContact.id, {
                priceGroup: pricingForm.priceGroup,
                terms: pricingForm.terms,
                creditLimit: pricingForm.creditLimit ? Number(pricingForm.creditLimit) : null
            });
            await loadData();
            setShowPricingModal(false);
            addToast({ type: 'success', message: 'Pricing updated successfully.' });
        } catch (error) {
            console.error(error);
            addToast({ type: 'error', message: 'Failed to update pricing.' });
        } finally {
            setActionLoading(false);
        }
    };

    const handleReassignSubmit = async () => {
        if (!selectedContact) return;
        setActionLoading(true);
        try {
            const agent = MOCK_AGENTS.find(a => a.id === reassignForm.agentId);
            await updateContact(selectedContact.id, {
                salesman: agent?.name,
                assignedAgent: agent?.name
            });
            await loadData();
            setShowReassignModal(false);
            addToast({ type: 'success', message: 'Client reassigned successfully.' });
        } catch (error) {
            console.error(error);
            addToast({ type: 'error', message: 'Failed to reassign client.' });
        } finally {
            setActionLoading(false);
        }
    };

    const handleBlacklistSubmit = async () => {
        if (!selectedContact) return;
        setActionLoading(true);
        try {
            await updateContact(selectedContact.id, {
                status: CustomerStatus.BLACKLISTED,
                comment: blacklistReason || selectedContact.comment,
                isHidden: false
            });
            await loadData();
            setShowBlacklistModal(false);
            addToast({ type: 'success', message: `${selectedContact.company} has been blacklisted.` });
        } catch (error) {
            console.error(error);
            addToast({ type: 'error', message: 'Failed to blacklist client.' });
        } finally {
            setActionLoading(false);
        }
    };

    const handleReplySubmit = async () => {
        if (!selectedContact || !replyMessage.trim()) {
            addToast({ type: 'error', message: 'Reply cannot be empty.' });
            return;
        }
        setActionLoading(true);
        try {
            await createInquiry({
                contact_id: selectedContact.id,
                title: 'Manager Reply',
                channel: 'chat',
                sentiment: 'positive',
                occurred_at: new Date().toISOString(),
                notes: replyMessage
            });
            await loadData();
            setShowReplyModal(false);
            addToast({ type: 'success', message: 'Reply logged successfully.' });
        } catch (error) {
            console.error(error);
            addToast({ type: 'error', message: 'Failed to send reply.' });
        } finally {
            setActionLoading(false);
        }
    };

    return (
        <div className="h-full bg-slate-50 dark:bg-slate-950 animate-fadeIn flex flex-col overflow-hidden">

            {/* 1. Header & Toolbar (Compact) */}
            <div className="bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 px-6 py-3 flex flex-row justify-between items-center gap-4 shrink-0 z-10 shadow-sm h-16">
                <div className="flex items-center gap-3">
                    <h1 className="text-lg font-bold text-slate-800 dark:text-white flex items-center gap-2">
                        <Phone className="w-5 h-5 text-brand-blue" />
                        Daily Call Monitoring
                    </h1>
                    <div className="h-4 w-px bg-slate-200 dark:bg-slate-700 mx-1"></div>
                    <div className="flex items-center gap-2 text-xs bg-slate-100 dark:bg-slate-800 px-2 py-1 rounded-md text-slate-600 dark:text-slate-300">
                        <Calendar className="w-3 h-3" /> <span>Today</span>
                    </div>
                </div>

                <div className="flex items-center gap-3">
                    <div className="relative">
                        <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400 w-3.5 h-3.5" />
                        <input
                            type="text"
                            placeholder="Search logs..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="pl-8 pr-3 py-1.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-md text-xs focus:outline-none focus:border-brand-blue transition-colors w-48 text-slate-800 dark:text-white"
                        />
                    </div>
                    <div className="flex items-center gap-2">
                        <select
                            className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs rounded p-1.5 outline-none text-slate-700 dark:text-slate-300"
                            value={filterAgent}
                            onChange={(e) => setFilterAgent(e.target.value)}
                        >
                            <option value="All">All Agents</option>
                            {[...new Set(effectiveLogs.map(c => c.agent_name))].map(agent => (
                                <option key={agent} value={agent}>{agent}</option>
                            ))}
                        </select>
                        <select
                            className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs rounded p-1.5 outline-none text-slate-700 dark:text-slate-300"
                            value={filterType}
                            onChange={(e) => setFilterType(e.target.value)}
                        >
                            <option value="All">All Types</option>
                            <option value="inbound">Inbound</option>
                            <option value="outbound">Outbound</option>
                        </select>
                    </div>
                </div>
            </div>

            {/* 2. High Density Stats Bar (Fixed Row) */}
            <div className="px-6 py-3 shrink-0 bg-slate-50 dark:bg-slate-950 overflow-x-auto border-b border-slate-100 dark:border-slate-900">
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-9 gap-2">
                    {/* Customer Stats (Requested) */}
                    <CompactMetric
                        title="Active Clients"
                        value={customerStats.active}
                        icon={UserCheck}
                        bgClass="bg-emerald-50/50 dark:bg-emerald-900/10"
                        colorClass="text-emerald-600 dark:text-emerald-400 bg-white dark:bg-emerald-900/20"
                        onClick={() => openStatsModal('active')}
                    />
                    <CompactMetric
                        title="Inactive"
                        value={customerStats.inactive}
                        icon={UserX}
                        bgClass="bg-slate-100/50 dark:bg-slate-800/50"
                        colorClass="text-slate-500 dark:text-slate-400 bg-white dark:bg-slate-800"
                        onClick={() => openStatsModal('inactive')}
                    />
                    <CompactMetric
                        title="Prospective"
                        value={customerStats.prospective}
                        icon={UserPlus}
                        bgClass="bg-blue-50/50 dark:bg-blue-900/10"
                        colorClass="text-blue-600 dark:text-blue-400 bg-white dark:bg-blue-900/20"
                        onClick={() => openStatsModal('prospective')}
                    />

                    {/* Call Stats */}
                    <CompactMetric
                        title="Total Calls"
                        value={totalCalls}
                        subtext={`Target: 120`}
                        icon={Phone}
                        colorClass="text-brand-blue dark:text-blue-300 bg-blue-50 dark:bg-blue-900/20"
                        onClick={() => openStatsModal('totalCalls')}
                    />
                    <CompactMetric
                        title="Missed Calls"
                        value={missedCallsToday}
                        icon={PhoneIncoming}
                        colorClass="text-rose-600 dark:text-rose-400 bg-rose-50 dark:bg-rose-900/20"
                        onClick={() => openStatsModal('missedCalls')}
                    />

                    {/* Pending Reports */}
                    <CompactMetric
                        title="Pending Reports"
                        value={pendingIncidentReports.length}
                        icon={AlertTriangle}
                        bgClass="bg-amber-50/50 dark:bg-amber-900/10"
                        colorClass="text-amber-600 dark:text-amber-400 bg-white dark:bg-amber-900/20"
                        onClick={() => openStatsModal('pendingReports')}
                    />

                    {/* Sales */}
                    <CompactMetric
                        title="Weekly Sales"
                        value={formatPesoCompact(weeklySalesTotal)}
                        icon={TrendingUp}
                        colorClass="text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-900/20"
                        onClick={() => openStatsModal('weeklySales')}
                    />
                    <CompactMetric
                        title="Monthly Sales"
                        value={formatPesoCompact(monthlySalesTotal)}
                        icon={PhilippinePeso}
                        colorClass="text-purple-600 dark:text-purple-400 bg-purple-50 dark:bg-purple-900/20"
                        onClick={() => openStatsModal('monthlySales')}
                    />
                    <CompactMetric
                        title="Yearly Sales"
                        value={formatPesoCompact(yearlySalesTotal)}
                        icon={BarChart3}
                        colorClass="text-teal-600 dark:text-teal-400 bg-teal-50 dark:bg-teal-900/20"
                        onClick={() => openStatsModal('yearlySales')}
                    />
                </div>
            </div>

            <div className="flex-1 min-h-0 overflow-y-auto px-6 pb-6 pt-4 space-y-3">
                {/* Inquiry Alert Panel */}
                <InquiryAlertPanel currentUser={currentUser} />

                {/* 3. Main Dashboard Grid (Flex-1 to prevent scroll) */}
                <div className="grid grid-cols-12 gap-3">
                    {/* Customer Lists & Details - TOP PRIORITY ROW */}
                    {/* Customer Lists */}
                    <div className="col-span-12 lg:col-span-5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg shadow-sm p-3 space-y-2">
                        <div className="flex items-center justify-between">
                            <h3 className="text-xs font-bold text-slate-800 dark:text-white flex items-center gap-2">
                                <ClipboardList className="w-3.5 h-3.5 text-brand-blue" /> Daily Customer Lists
                            </h3>
                            <span className="text-[9px] uppercase text-slate-400">Status grouped</span>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-2 items-stretch">
                            {groupedCustomers.map(group => (
                                <div key={group.key} className="border border-slate-200 dark:border-slate-800 rounded-md p-2.5 bg-slate-50/40 dark:bg-slate-800/50 flex flex-col h-full">
                                    <div className="flex items-center justify-between mb-1.5">
                                        <div className="text-xs font-bold text-slate-700 dark:text-slate-200">{group.label}</div>
                                        <span className="text-[10px] text-slate-400">{group.items.length} customers</span>
                                    </div>
                                    <div
                                        className="relative flex-1 min-h-0 overflow-y-auto custom-scrollbar"
                                        onScroll={handleListScroll(group.key)}
                                        ref={(el) => {
                                            if (el && !listState[group.key]) {
                                                setListState((prev) => ({ ...prev, [group.key]: { scrollTop: 0, height: el.clientHeight } }));
                                            }
                                        }}
                                    >
                                        <div style={{ height: group.items.length * ITEM_HEIGHT }} className="relative">
                                            <div style={{ transform: `translateY(${getRange(group.key, group.items.length).start * ITEM_HEIGHT}px)` }} className="space-y-2 absolute left-0 right-0">
                                                {group.items.slice(getRange(group.key, group.items.length).start, getRange(group.key, group.items.length).end).map(({ contact, lastActivity }) => {
                                                    const { companyName, formerName } = getCompanyNameParts(contact);
                                                    return (
                                                        <button
                                                            key={contact.id}
                                                            onClick={() => setSelectedContactId(contact.id)}
                                                            className={`w-full text-left p-2 rounded-md border border-transparent hover:border-brand-blue/40 transition-colors ${selectedContactId === contact.id ? 'bg-blue-50 dark:bg-blue-900/20 border-brand-blue/40' : 'bg-white dark:bg-slate-900/60'}`}
                                                            style={{ height: ITEM_HEIGHT - 4 }} // slight gap compensation
                                                        >
                                                            <div className="text-xs font-bold text-slate-800 dark:text-white truncate">
                                                                <CompanyName
                                                                    name={companyName}
                                                                    pastName={formerName}
                                                                    entity={contact}
                                                                    className="inline-flex items-center gap-1"
                                                                    formerNameClassName="text-[10px] text-slate-500 font-medium"
                                                                />
                                                            </div>
                                                            <div className="text-[11px] text-slate-500 flex items-center gap-1">
                                                                <Clock className="w-3 h-3" /> {group.label} – {lastActivity ? formatDate(lastActivity) : 'No activity'}
                                                            </div>
                                                        </button>
                                                    );
                                                })}
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Customer Detail + History */}
                    <div className="col-span-12 lg:col-span-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg shadow-sm p-3 space-y-2">
                        <div className="flex items-center justify-between">
                            <h3 className="text-xs font-bold text-slate-800 dark:text-white flex items-center gap-2">
                                <FileText className="w-3.5 h-3.5 text-brand-blue" /> Customer Summary
                            </h3>
                            <span className="text-[9px] text-slate-400">Details, sales, chat</span>
                        </div>
                        <div className="relative">
                            <input
                                type="text"
                                value={customerSearchQuery}
                                onChange={(e) => setCustomerSearchQuery(e.target.value)}
                                placeholder="Search customers..."
                                className="w-full px-3 py-2 text-sm rounded-lg border border-slate-200 focus:border-brand-blue focus:ring-1 focus:ring-brand-blue outline-none"
                            />
                            {customerSearchResults.length > 0 && (
                                <div className="absolute z-20 mt-1 w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg shadow-lg max-h-60 overflow-y-auto">
                                    {customerSearchResults.map((contact) => (
                                        <button
                                            key={contact.id}
                                            onClick={() => {
                                                setSelectedContactId(contact.id);
                                                setCustomerSearchQuery('');
                                            }}
                                            className="w-full text-left px-3 py-2 text-sm hover:bg-blue-50 dark:hover:bg-slate-800"
                                        >
                                            <div className="font-semibold text-slate-800 dark:text-white truncate">{contact.company}</div>
                                            <div className="text-xs text-slate-500">{contact.status} • {contact.city}</div>
                                        </button>
                                    ))}
                                </div>
                            )}
                        </div>
                        {selectedContact ? (
                            <div className="space-y-3">
                                <div className="flex items-start gap-3">
                                    <img src={selectedContact.avatar} className="w-10 h-10 rounded-full border border-slate-200" alt="" />
                                    <div className="flex-1 space-y-1">
                                        {(() => {
                                            const { companyName, formerName } = getCompanyNameParts(selectedContact);
                                            return (
                                                <div className="text-sm font-bold text-slate-800 dark:text-white">
                                                    <CompanyName
                                                        name={companyName}
                                                        pastName={formerName}
                                                        entity={selectedContact}
                                                        className="inline-flex items-center gap-1"
                                                        formerNameClassName="text-[11px] text-slate-500 font-normal ml-1"
                                                        formerLabel="formerly"
                                                    />
                                                </div>
                                            );
                                        })()}
                                        <div className="text-[11px] text-slate-500">{selectedContact.status} • Assigned: {selectedContact.salesman || 'Unassigned'}</div>
                                        <div className="text-[11px] text-slate-500">Terms: {selectedContact.terms || 'N/A'} | Balance: ₱{Number(selectedContact.balance || 0).toLocaleString()}</div>
                                        <div className="text-[11px] text-slate-500">Last purchase: {formatDate(contactPurchases[0]?.purchased_at)}</div>
                                        <div className="text-[11px] text-slate-500">Email: {selectedContact.email || '—'} | Phone: {selectedContact.phone || selectedContact.mobile || '—'}</div>
                                        <div className="text-[11px] text-slate-500">Address: {selectedContact.address || selectedContact.officeAddress || '—'}</div>
                                    </div>
                                </div>

                                <div className="grid grid-cols-2 gap-2">
                                    <button onClick={openPricingModal} className="text-xs px-2 py-2 rounded-md border border-slate-200 dark:border-slate-700 flex items-center gap-2 hover:border-brand-blue/60">
                                        <TrendingUp className="w-4 h-4 text-brand-blue" /> Adjust pricing
                                    </button>
                                    <button onClick={openReassignModal} className="text-xs px-2 py-2 rounded-md border border-slate-200 dark:border-slate-700 flex items-center gap-2 hover:border-brand-blue/60">
                                        <Users className="w-4 h-4 text-brand-blue" /> Reassign client
                                    </button>
                                    <button onClick={openBlacklistModal} className="text-xs px-2 py-2 rounded-md border border-rose-200 dark:border-rose-700 flex items-center gap-2 hover:border-rose-400/80">
                                        <ShieldAlert className="w-4 h-4 text-rose-500" /> Blacklist
                                    </button>
                                    <button onClick={openReplyModal} className="text-xs px-2 py-2 rounded-md border border-slate-200 dark:border-slate-700 flex items-center gap-2 hover:border-brand-blue/60">
                                        <MessageSquare className="w-4 h-4 text-brand-blue" /> Reply to report
                                    </button>
                                    <button onClick={openContactDetails} className="text-xs px-2 py-2 rounded-md border border-slate-200 dark:border-slate-700 flex items-center gap-2 hover:border-brand-blue/60">
                                        <FileText className="w-4 h-4 text-brand-blue" /> Full details
                                    </button>
                                </div>

                                <div className="border border-slate-200 dark:border-slate-800 rounded-lg p-3">
                                    <div className="text-[11px] uppercase text-slate-500 font-bold mb-2">Sales Report / Purchase History</div>
                                    <div className="space-y-2 max-h-36 overflow-y-auto custom-scrollbar">
                                        {contactPurchases.map((p) => (
                                            <div key={p.id} className="flex items-center justify-between text-xs text-slate-700 dark:text-slate-300">
                                                <span className="font-bold">₱{Number(p.amount).toLocaleString()}</span>
                                                <span className="text-[11px] text-slate-500">{p.status} • {formatDate(p.purchased_at)}</span>
                                                <span className="text-[11px] text-slate-500">{p.notes || '—'}</span>
                                            </div>
                                        ))}
                                        {contactPurchases.length === 0 && (
                                            <div className="text-xs text-slate-500">No purchases yet.</div>
                                        )}
                                    </div>
                                </div>

                                <div className="border border-slate-200 dark:border-slate-800 rounded-lg p-3">
                                    <div className="text-[11px] uppercase text-slate-500 font-bold mb-2">Chat History (date & time)</div>
                                    <div className="space-y-2 max-h-36 overflow-y-auto custom-scrollbar">
                                        {contactInquiries.map((inq) => (
                                            <div key={inq.id} className="text-xs text-slate-700 dark:text-slate-300 flex items-center gap-2">
                                                <MessageSquare className="w-3 h-3 text-brand-blue" />
                                                <span className="font-bold">{inq.title}</span>
                                                <span className="text-[11px] text-slate-500">{formatDate(inq.occurred_at)} • {new Date(inq.occurred_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                                                <span className="text-[11px] text-slate-500">({inq.channel})</span>
                                            </div>
                                        ))}
                                        {contactInquiries.length === 0 && <div className="text-xs text-slate-500">No chats logged.</div>}
                                    </div>
                                </div>
                            </div>
                        ) : (
                            <div className="text-sm text-slate-500">Select a customer from the list to see details.</div>
                        )}
                    </div>

                    {showContactDetails && selectedContact && (
                        <div className="fixed inset-0 z-50 bg-white dark:bg-slate-950">
                            <ContactDetails
                                contact={selectedContact}
                                currentUser={currentUser}
                                onClose={() => setShowContactDetails(false)}
                                onUpdate={(updated) => {
                                    setContacts(prev => prev.map(c => c.id === updated.id ? updated : c));
                                }}
                            />
                        </div>
                    )}

                    {updateReviewContact && (
                        <UpdateContactApprovalModal
                            contact={updateReviewContact}
                            isOpen={!!updateReviewContact}
                            onClose={() => setUpdateReviewContact(null)}
                            currentUserId={currentUser?.id}
                            onApprove={loadPendingContactUpdates}
                        />
                    )}

                    {/* Team Chat */}
                    <div className="col-span-12 lg:col-span-3 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-sm flex flex-col overflow-hidden h-full">
                        <div className="p-3 border-b border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/30 shrink-0 flex items-center gap-2">
                            <MessageSquare className="w-4 h-4 text-brand-blue" />
                            <h3 className="font-bold text-sm text-slate-800 dark:text-white">Team Chat</h3>
                        </div>

                        <div ref={chatContainerRef} className="flex-1 overflow-y-auto p-3 space-y-3 custom-scrollbar">
                            {chatMessages.map((msg) => (
                                <div key={msg.id} className={`flex gap-2 ${msg.isMe ? 'flex-row-reverse' : ''}`}>
                                    <img src={msg.avatar} className="w-6 h-6 rounded-full border border-slate-200 shrink-0" alt="" />
                                    <div className={`flex flex-col max-w-[90%] ${msg.isMe ? 'items-end' : 'items-start'}`}>
                                        <div className={`px-3 py-2 rounded-xl text-xs ${msg.isMe
                                            ? 'bg-brand-blue text-white rounded-tr-none'
                                            : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 rounded-tl-none'
                                            }`}>
                                            {renderMessageText(msg.message)}
                                        </div>
                                        <span className="text-[9px] text-slate-400 mt-0.5">{msg.time}</span>
                                    </div>
                                </div>
                            ))}
                        </div>

                        <div className="p-2 border-t border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/30 shrink-0">
                            <div className="relative">
                                {showMentions && filteredAgents.length > 0 && (
                                    <div className="absolute bottom-full left-0 mb-1 w-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg shadow-lg overflow-hidden z-50">
                                        <div className="max-h-32 overflow-y-auto">
                                            {filteredAgents.map((agent, index) => (
                                                <button
                                                    key={agent.id}
                                                    onClick={() => insertMention(agent.name)}
                                                    onMouseEnter={() => setSelectedIndex(index)}
                                                    className={`w-full text-left p-2 flex items-center gap-2 text-xs ${index === selectedIndex ? 'bg-blue-50 dark:bg-blue-900/30' : ''
                                                        }`}
                                                >
                                                    <img src={agent.avatar} className="w-5 h-5 rounded-full" alt="" />
                                                    <span className="font-bold text-slate-800 dark:text-white">{agent.name}</span>
                                                </button>
                                            ))}
                                        </div>
                                    </div>
                                )}
                                <input
                                    ref={inputRef}
                                    type="text"
                                    value={newMessage}
                                    onChange={handleInputChange}
                                    onKeyDown={handleKeyDown}
                                    placeholder="Type message..."
                                    className="w-full bg-white dark:bg-slate-700 border border-slate-300 dark:border-slate-600 rounded-lg pl-3 pr-10 py-2 text-xs focus:outline-none focus:border-brand-blue focus:ring-1 focus:ring-brand-blue transition-all"
                                />
                                <button
                                    onClick={handleSendMessage}
                                    className="absolute right-1 top-1/2 -translate-y-1/2 p-1.5 rounded hover:bg-slate-100 dark:hover:bg-slate-600 text-brand-blue"
                                >
                                    <Send className="w-3.5 h-3.5" />
                                </button>
                            </div>
                        </div>
                    </div>

                    {/* Pending Contact Update Requests */}
                    <div className="col-span-12 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-sm p-4">
                        <div className="flex items-center justify-between mb-3">
                            <div className="flex items-center gap-2">
                                <FileText className="w-4 h-4 text-brand-blue" />
                                <h3 className="text-sm font-bold text-slate-800 dark:text-white">Pending Contact Updates</h3>
                            </div>
                            <span className="text-xs font-semibold text-slate-500">
                                {pendingContactUpdates.length} pending
                            </span>
                        </div>
                        {pendingContactUpdatesLoading ? (
                            <div className="text-sm text-slate-500">Loading update requests...</div>
                        ) : pendingContactUpdates.length === 0 ? (
                            <div className="text-sm text-slate-500">No pending update requests.</div>
                        ) : (
                            <div className="space-y-2 max-h-48 overflow-y-auto custom-scrollbar">
                                {pendingContactUpdates.slice(0, 10).map((update) => {
                                    const contactRef = Array.isArray(update.contacts) ? update.contacts[0] : update.contacts;
                                    const contactName = contactRef?.company || contactRef?.name || 'Unknown customer';
                                    const submittedDate = update.submitted_date
                                        ? new Date(update.submitted_date).toLocaleDateString()
                                        : 'Unknown date';
                                    return (
                                        <div key={update.id} className="flex items-center justify-between gap-3 rounded-lg border border-slate-100 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-900/60 p-3">
                                            <div className="min-w-0">
                                                <div className="text-sm font-semibold text-slate-800 dark:text-slate-200 truncate">
                                                    {contactName}
                                                </div>
                                                <div className="text-xs text-slate-500">
                                                    Submitted {submittedDate} • {update.submitted_by || 'Staff'}
                                                </div>
                                            </div>
                                            <button
                                                onClick={() => handleReviewContactUpdate(update.contact_id)}
                                                className="px-3 py-1.5 text-xs font-semibold rounded-lg border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:border-brand-blue/60"
                                            >
                                                Review
                                            </button>
                                        </div>
                                    );
                                })}
                            </div>
                        )}
                    </div>

                    {/* [NEW] Priority Dashboard Row */}
                    <div className="col-span-12 grid grid-cols-1 md:grid-cols-12 gap-3">
                        {/* 1. Agent Call Volume (5 cols) */}
                        <div className="col-span-12 md:col-span-5 h-64 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg p-3 shadow-sm flex flex-col">
                            <div className="flex justify-between items-center mb-2 shrink-0">
                                <h3 className="font-bold text-xs text-slate-800 dark:text-white">Agent Call Volume</h3>
                                <div className="flex gap-3 text-[10px]">
                                    <div className="flex items-center gap-1"><span className="w-1.5 h-1.5 rounded-full bg-blue-500"></span> Calls</div>
                                    <div className="flex items-center gap-1"><span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span> Success</div>
                                </div>
                            </div>
                            <div className="flex-1 w-full min-h-0">
                                <ResponsiveContainer width="100%" height="100%">
                                    <BarChart data={agentChartData} margin={{ top: 5, right: 5, left: -25, bottom: 0 }} barSize={20}>
                                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#475569" opacity={0.1} />
                                        <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#94a3b8' }} dy={5} />
                                        <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#94a3b8' }} />
                                        <Tooltip
                                            cursor={{ fill: 'rgba(255,255,255,0.05)' }}
                                            contentStyle={{ backgroundColor: '#1e293b', borderRadius: '4px', border: 'none', color: '#f8fafc', fontSize: '12px' }}
                                        />
                                        <Bar dataKey="calls" fill="#3b82f6" radius={[2, 2, 0, 0]} />
                                        <Bar dataKey="successful" fill="#10b981" radius={[2, 2, 0, 0]} />
                                    </BarChart>
                                </ResponsiveContainer>
                            </div>
                        </div>

                        {/* 2. Outcomes (3 cols) */}
                        <div className="col-span-12 md:col-span-3 h-64 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg p-3 shadow-sm flex flex-col items-center justify-center relative">
                            <h3 className="absolute top-3 left-3 text-[10px] font-bold text-slate-500 uppercase">Outcomes</h3>
                            <div className="flex-1 w-full h-full min-h-0">
                                <ResponsiveContainer width="100%" height="100%">
                                    <PieChart>
                                        <Pie data={outcomeData} cx="50%" cy="50%" innerRadius={40} outerRadius={60} paddingAngle={2} dataKey="value">
                                            {outcomeData.map((entry, index) => <Cell key={`cell-${index}`} fill={entry.color} strokeWidth={0} />)}
                                        </Pie>
                                        <Tooltip contentStyle={{ borderRadius: '4px', border: 'none', backgroundColor: '#1e293b', color: '#fff', fontSize: '10px', padding: '4px' }} />
                                    </PieChart>
                                </ResponsiveContainer>
                            </div>
                            <div className="w-full flex justify-center gap-3 mt-0">
                                {outcomeData.slice(0, 2).map((item) => (
                                    <div key={item.name} className="flex items-center gap-1.5 text-[10px]">
                                        <div className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: item.color }}></div>
                                        <span className="text-slate-500 dark:text-slate-400">{item.name}</span>
                                        <span className="font-bold text-slate-700 dark:text-slate-300">{item.value}</span>
                                    </div>
                                ))}
                            </div>
                            <div className="w-full flex justify-center gap-3 mt-1">
                                {outcomeData.slice(2).map((item) => (
                                    <div key={item.name} className="flex items-center gap-1.5 text-[10px]">
                                        <div className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: item.color }}></div>
                                        <span className="text-slate-500 dark:text-slate-400">{item.name}</span>
                                        <span className="font-bold text-slate-700 dark:text-slate-300">{item.value}</span>
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* 3. Recent Activity (4 cols) */}
                        <div className="col-span-12 md:col-span-4 h-64">
                            <AgentCallActivity
                                callLogs={filteredLogs.slice(0, 10)}
                                inquiries={filteredInquiries}
                                contacts={contacts}
                                maxItems={8}
                                title="Recent Activity"
                                className="h-full"
                                onItemClick={openActivityModal}
                            />
                        </div>
                    </div>

                    {/* Sales Performance Leaderboard Row */}
                    <div className="col-span-12 grid grid-cols-1 md:grid-cols-12 gap-3">
                        <SalesPerformanceCard
                            agents={agentLeaderboard}
                            onAgentClick={loadAgentSummary}
                            loading={leaderboardLoading}
                        />
                    </div>

                    {/* Pending Incident Reports Row */}
                    <div className="col-span-12">
                        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg shadow-sm p-3">
                            <div className="flex items-center justify-between mb-4">
                                <h3 className="text-sm font-bold text-slate-800 dark:text-white flex items-center gap-2">
                                    <AlertTriangle className="w-4 h-4 text-amber-500" />
                                    Pending Incident Reports
                                    {pendingIncidentReports.length > 0 && (
                                        <span className="ml-2 px-2 py-0.5 text-xs font-semibold bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400 rounded-full">
                                            {pendingIncidentReports.length}
                                        </span>
                                    )}
                                </h3>
                                <button
                                    onClick={loadPendingIncidentReports}
                                    className="p-1.5 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors"
                                    title="Refresh"
                                >
                                    <RefreshCw className="w-4 h-4 text-slate-500" />
                                </button>
                            </div>

                            {incidentReportsLoading ? (
                                <div className="flex items-center justify-center py-12">
                                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-brand-blue"></div>
                                </div>
                            ) : pendingIncidentReports.length === 0 ? (
                                <div className="flex flex-col items-center justify-center py-12 text-center">
                                    <CheckCircle className="w-12 h-12 text-emerald-500 mb-3" />
                                    <p className="text-sm font-medium text-slate-600 dark:text-slate-400">
                                        No pending incident reports
                                    </p>
                                    <p className="text-xs text-slate-500 dark:text-slate-500 mt-1">
                                        All incident reports have been reviewed
                                    </p>
                                </div>
                            ) : (
                                <div className="space-y-3">
                                    {pendingIncidentReports.map((report) => {
                                        const badge = getIssueTypeBadge(report.issue_type);
                                        const incidentDate = new Date(report.incident_date).toLocaleDateString();
                                        const reportDate = new Date(report.report_date).toLocaleDateString();

                                        return (
                                            <div
                                                key={report.id}
                                                role="button"
                                                tabIndex={0}
                                                onClick={() => openIncidentReportModal(report)}
                                                onKeyDown={(event) => {
                                                    if (event.key === 'Enter' || event.key === ' ') {
                                                        event.preventDefault();
                                                        openIncidentReportModal(report);
                                                    }
                                                }}
                                                className="border border-slate-200 dark:border-slate-800 rounded-lg p-4 bg-slate-50/40 dark:bg-slate-800/50 hover:border-amber-300 dark:hover:border-amber-700 transition-colors cursor-pointer focus:outline-none focus:ring-2 focus:ring-amber-400/60"
                                            >
                                                <div className="flex items-start justify-between gap-4">
                                                    <div className="flex-1 min-w-0">
                                                        <div className="flex items-center gap-2 mb-2">
                                                            <h4 className="text-sm font-bold text-slate-800 dark:text-white truncate">
                                                                {report.customer_company}
                                                            </h4>
                                                            <span className={`px-2 py-0.5 text-xs font-semibold rounded-full ${badge.color}`}>
                                                                {badge.label}
                                                            </span>
                                                        </div>
                                                        <div className="flex items-center gap-3 text-xs text-slate-600 dark:text-slate-400 mb-2">
                                                            <span className="flex items-center gap-1">
                                                                <Users className="w-3 h-3" />
                                                                {report.customer_city}
                                                            </span>
                                                            <span>•</span>
                                                            <span>Salesman: {report.customer_salesman}</span>
                                                        </div>
                                                        <div className="flex items-center gap-3 text-xs text-slate-500 dark:text-slate-500 mb-3">
                                                            <span>Incident: {incidentDate}</span>
                                                            <span>•</span>
                                                            <span>Reported: {reportDate}</span>
                                                            <span>•</span>
                                                            <span>By: {report.reported_by}</span>
                                                        </div>
                                                        <p className="text-sm text-slate-700 dark:text-slate-300 line-clamp-2">
                                                            {report.description}
                                                        </p>
                                                    </div>
                                                    <div className="flex flex-col gap-2 shrink-0">
                                                        <button
                                                            onClick={(event) => {
                                                                event.stopPropagation();
                                                                handleApproveIncidentReport(report.id);
                                                            }}
                                                            className="px-3 py-1.5 bg-emerald-500 hover:bg-emerald-600 text-white text-xs font-semibold rounded-lg transition-colors flex items-center gap-1.5"
                                                        >
                                                            <CheckCircle className="w-3.5 h-3.5" />
                                                            Approve
                                                        </button>
                                                        <button
                                                            onClick={(event) => {
                                                                event.stopPropagation();
                                                                handleRejectIncidentReport(report.id);
                                                            }}
                                                            className="px-3 py-1.5 bg-rose-500 hover:bg-rose-600 text-white text-xs font-semibold rounded-lg transition-colors flex items-center gap-1.5"
                                                        >
                                                            <XCircle className="w-3.5 h-3.5" />
                                                            Deny
                                                        </button>
                                                    </div>
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            )}
                        </div>
                    </div>

                </div>

                <div className="min-h-0">
                    <div className="grid grid-cols-12 gap-3 min-h-0 items-start">

                        {/* LEFT COLUMN: Activity & List (Span 9) */}
                        <div className="col-span-12 lg:col-span-9 flex flex-col gap-3 min-h-0">



                            {/* Row 2: Call Log Table (Flex-1 Scrollable) */}
                            <div className="h-[450px] min-h-0 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg shadow-sm flex flex-col overflow-hidden">
                                <div className="px-3 py-2.5 border-b border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/30 shrink-0 flex justify-between items-center">
                                    <h3 className="font-bold text-xs text-slate-800 dark:text-white">Recent Logs</h3>
                                    <div className="text-xs text-slate-500">{filteredLogs.length} records found</div>
                                </div>

                                <div className="flex-1 overflow-y-auto custom-scrollbar">
                                    <table className="w-full text-left border-collapse">
                                        <thead className="bg-slate-50 dark:bg-slate-800 sticky top-0 z-10 shadow-sm">
                                            <tr className="text-[10px] uppercase text-slate-500 dark:text-slate-400 font-semibold border-b border-slate-200 dark:border-slate-700">
                                                <th className="px-4 py-2 w-20">Time</th>
                                                <th className="px-4 py-2">Agent</th>
                                                <th className="px-4 py-2">Customer</th>
                                                <th className="px-4 py-2 w-24">Type</th>
                                                <th className="px-4 py-2 w-20">Dur.</th>
                                                <th className="px-4 py-2 w-28">Outcome</th>
                                                <th className="px-4 py-2">Notes</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                                            {filteredLogs.map((log) => {
                                                const contact = contactsMap.get(log.contact_id);
                                                const agentAvatar = agentAvatarMap.get(log.agent_name) || 'https://i.pravatar.cc/150?u=agent';
                                                return (
                                                    <tr key={log.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                                                        <td className="px-4 py-2 text-xs font-mono text-slate-500 dark:text-slate-400 whitespace-nowrap">
                                                            {new Date(log.occurred_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                                        </td>
                                                        <td className="px-4 py-2">
                                                            <div className="flex items-center gap-2">
                                                                <img src={agentAvatar} className="w-5 h-5 rounded-full" alt="" />
                                                                <span className="text-xs font-medium text-slate-700 dark:text-slate-200 truncate max-w-[80px]">{log.agent_name.split(' ')[0]}</span>
                                                            </div>
                                                        </td>
                                                        <td className="px-4 py-2">
                                                            {(() => {
                                                                const { companyName, formerName, combinedLabel } = getCompanyNameParts(contact);
                                                                return (
                                                                    <div className="truncate max-w-[160px]" title={combinedLabel}>
                                                                        <CompanyName
                                                                            name={companyName}
                                                                            pastName={formerName}
                                                                            entity={contact}
                                                                            className="text-xs font-bold text-slate-800 dark:text-white inline-flex items-center gap-1"
                                                                            formerNameClassName="text-[10px] text-slate-500 font-medium"
                                                                        />
                                                                    </div>
                                                                );
                                                            })()}
                                                        </td>
                                                        <td className="px-4 py-2">
                                                            <span className={`flex items-center gap-1 text-[10px] font-bold ${log.direction === 'inbound' ? 'text-emerald-600' : 'text-blue-600'
                                                                }`}>
                                                                {log.direction === 'inbound' ? <PhoneIncoming className="w-3 h-3" /> : <PhoneOutgoing className="w-3 h-3" />}
                                                                {log.channel.toUpperCase()} • {log.direction}
                                                            </span>
                                                        </td>
                                                        <td className="px-4 py-2 text-xs text-slate-600 dark:text-slate-300 font-mono">
                                                            {formatDuration(log.duration_seconds)}
                                                        </td>
                                                        <td className="px-4 py-2">
                                                            <span className={`px-1.5 py-0.5 rounded text-[9px] font-bold uppercase ${log.outcome === 'positive' ? 'bg-emerald-50 text-emerald-600 dark:bg-emerald-900/20 dark:text-emerald-400' :
                                                                log.outcome === 'follow_up' ? 'bg-amber-100 text-amber-600 dark:bg-amber-900/30 dark:text-amber-400' :
                                                                    log.outcome === 'negative' ? 'bg-rose-100 text-rose-600 dark:bg-rose-900/30 dark:text-rose-400' :
                                                                        'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400'
                                                                }`}>
                                                                {log.outcome.replace('_', ' ')}
                                                            </span>
                                                        </td>
                                                        <td className="px-4 py-2 text-xs text-slate-500 dark:text-slate-400 truncate max-w-[180px]" title={log.notes || ''}>
                                                            {log.notes}
                                                        </td>
                                                    </tr>
                                                )
                                            })}
                                        </tbody>
                                    </table>
                                </div>
                            </div>

                        </div>
                    </div>
                </div>
                <ActionModal
                    open={showActivityModal}
                    title={selectedActivityItem
                        ? `${selectedActivityItem.type === 'call' ? 'Call' : 'Inquiry'} Details`
                        : 'Activity Details'}
                    confirmLabel="Close"
                    onClose={() => setShowActivityModal(false)}
                    onConfirm={() => setShowActivityModal(false)}
                >
                    {selectedActivityItem ? (
                        <div className="space-y-4">
                            <div className="border border-slate-200 dark:border-slate-800 rounded-lg p-3 bg-slate-50/60 dark:bg-slate-800/40">
                                <div className="flex items-start justify-between gap-3">
                                    <div className="min-w-0">
                                        <p className="text-sm font-bold text-slate-800 dark:text-white truncate">
                                            {selectedActivityContact?.company || 'Unknown customer'}
                                        </p>
                                        <p className="text-xs text-slate-500 dark:text-slate-400 truncate">
                                            {selectedActivityContact?.address ? selectedActivityContact.address : '—'}
                                        </p>
                                        <p className="text-xs text-slate-500 dark:text-slate-400 truncate">
                                            {selectedActivityContact?.city || '—'}{selectedActivityContact?.province ? `, ${selectedActivityContact.province}` : ''}
                                        </p>
                                        <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 truncate">
                                            Assigned: {selectedActivityContact?.salesman || selectedActivityContact?.assignedAgent || '—'}
                                        </p>
                                    </div>
                                    <div className="shrink-0">
                                        <button
                                            type="button"
                                            onClick={() => {
                                                setSelectedContactId(selectedActivityItem.contact_id);
                                                setShowActivityModal(false);
                                            }}
                                            className="px-3 py-1.5 text-xs font-semibold rounded-lg bg-brand-blue/10 text-brand-blue hover:bg-brand-blue/20"
                                        >
                                            Open Customer
                                        </button>
                                    </div>
                                </div>
                            </div>

                            {selectedActivityItem.type === 'call' ? (
                                <div className="space-y-2">
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                                        <div className="border border-slate-200 dark:border-slate-800 rounded-lg p-3">
                                            <p className="text-[11px] font-semibold text-slate-500 dark:text-slate-400">Agent</p>
                                            <p className="text-sm font-bold text-slate-800 dark:text-white">{selectedActivityItem.agent_name || '—'}</p>
                                        </div>
                                        <div className="border border-slate-200 dark:border-slate-800 rounded-lg p-3">
                                            <p className="text-[11px] font-semibold text-slate-500 dark:text-slate-400">Occurred</p>
                                            <p className="text-sm font-bold text-slate-800 dark:text-white">{formatDateTime(selectedActivityItem.occurred_at)}</p>
                                        </div>
                                        <div className="border border-slate-200 dark:border-slate-800 rounded-lg p-3">
                                            <p className="text-[11px] font-semibold text-slate-500 dark:text-slate-400">Direction</p>
                                            <p className="text-sm font-bold text-slate-800 dark:text-white">{selectedActivityItem.direction}</p>
                                        </div>
                                        <div className="border border-slate-200 dark:border-slate-800 rounded-lg p-3">
                                            <p className="text-[11px] font-semibold text-slate-500 dark:text-slate-400">Channel</p>
                                            <p className="text-sm font-bold text-slate-800 dark:text-white">{selectedActivityItem.channel}</p>
                                        </div>
                                        <div className="border border-slate-200 dark:border-slate-800 rounded-lg p-3">
                                            <p className="text-[11px] font-semibold text-slate-500 dark:text-slate-400">Outcome</p>
                                            <p className="text-sm font-bold text-slate-800 dark:text-white">{selectedActivityItem.outcome || '—'}</p>
                                        </div>
                                        <div className="border border-slate-200 dark:border-slate-800 rounded-lg p-3">
                                            <p className="text-[11px] font-semibold text-slate-500 dark:text-slate-400">Duration</p>
                                            <p className="text-sm font-bold text-slate-800 dark:text-white">{formatDuration(selectedActivityItem.duration_seconds || 0)}</p>
                                        </div>
                                    </div>
                                    <div className="border border-slate-200 dark:border-slate-800 rounded-lg p-3">
                                        <p className="text-[11px] font-semibold text-slate-500 dark:text-slate-400">Notes</p>
                                        <p className="text-sm text-slate-700 dark:text-slate-200 mt-1 whitespace-pre-wrap">{selectedActivityItem.notes || '—'}</p>
                                    </div>
                                    {(selectedActivityItem.next_action || selectedActivityItem.next_action_due) && (
                                        <div className="border border-slate-200 dark:border-slate-800 rounded-lg p-3">
                                            <p className="text-[11px] font-semibold text-slate-500 dark:text-slate-400">Next Action</p>
                                            <p className="text-sm font-semibold text-slate-800 dark:text-white mt-1">{selectedActivityItem.next_action || '—'}</p>
                                            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">Due: {formatDateTime(selectedActivityItem.next_action_due)}</p>
                                        </div>
                                    )}
                                </div>
                            ) : (
                                <div className="space-y-2">
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                                        <div className="border border-slate-200 dark:border-slate-800 rounded-lg p-3">
                                            <p className="text-[11px] font-semibold text-slate-500 dark:text-slate-400">Channel</p>
                                            <p className="text-sm font-bold text-slate-800 dark:text-white">{selectedActivityItem.channel}</p>
                                        </div>
                                        <div className="border border-slate-200 dark:border-slate-800 rounded-lg p-3">
                                            <p className="text-[11px] font-semibold text-slate-500 dark:text-slate-400">Occurred</p>
                                            <p className="text-sm font-bold text-slate-800 dark:text-white">{formatDateTime(selectedActivityItem.occurred_at)}</p>
                                        </div>
                                        <div className="border border-slate-200 dark:border-slate-800 rounded-lg p-3">
                                            <p className="text-[11px] font-semibold text-slate-500 dark:text-slate-400">Title</p>
                                            <p className="text-sm font-bold text-slate-800 dark:text-white">{selectedActivityItem.title || '—'}</p>
                                        </div>
                                        <div className="border border-slate-200 dark:border-slate-800 rounded-lg p-3">
                                            <p className="text-[11px] font-semibold text-slate-500 dark:text-slate-400">Sentiment</p>
                                            <p className="text-sm font-bold text-slate-800 dark:text-white">{selectedActivityItem.sentiment || '—'}</p>
                                        </div>
                                    </div>
                                    <div className="border border-slate-200 dark:border-slate-800 rounded-lg p-3">
                                        <p className="text-[11px] font-semibold text-slate-500 dark:text-slate-400">Notes</p>
                                        <p className="text-sm text-slate-700 dark:text-slate-200 mt-1 whitespace-pre-wrap">{selectedActivityItem.notes || '—'}</p>
                                    </div>
                                </div>
                            )}
                        </div>
                    ) : (
                        <div className="text-sm text-slate-500 dark:text-slate-400">No activity selected.</div>
                    )}
                </ActionModal>

                <ActionModal
                    open={Boolean(selectedIncidentReport)}
                    title="Incident Report Details"
                    confirmLabel="Close"
                    onClose={closeIncidentReportModal}
                    onConfirm={closeIncidentReportModal}
                >
                    {selectedIncidentReport ? (
                        <div className="space-y-4">
                            <div className="flex items-center justify-between gap-3">
                                <div className="min-w-0">
                                    <p className="text-sm font-bold text-slate-800 dark:text-white truncate">
                                        {selectedIncidentReport.customer_company}
                                    </p>
                                    <p className="text-xs text-slate-500 dark:text-slate-400">
                                        {selectedIncidentReport.customer_city} • Salesman: {selectedIncidentReport.customer_salesman}
                                    </p>
                                </div>
                                <span className={`px-2 py-1 text-xs font-semibold rounded-full ${getIssueTypeBadge(selectedIncidentReport.issue_type).color}`}>
                                    {getIssueTypeBadge(selectedIncidentReport.issue_type).label}
                                </span>
                            </div>

                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                                <div className="border border-slate-200 dark:border-slate-800 rounded-lg p-3">
                                    <p className="text-[11px] font-semibold text-slate-500 dark:text-slate-400">Incident Date</p>
                                    <p className="text-sm font-bold text-slate-800 dark:text-white">
                                        {new Date(selectedIncidentReport.incident_date).toLocaleDateString()}
                                    </p>
                                </div>
                                <div className="border border-slate-200 dark:border-slate-800 rounded-lg p-3">
                                    <p className="text-[11px] font-semibold text-slate-500 dark:text-slate-400">Reported Date</p>
                                    <p className="text-sm font-bold text-slate-800 dark:text-white">
                                        {new Date(selectedIncidentReport.report_date).toLocaleDateString()}
                                    </p>
                                </div>
                                <div className="border border-slate-200 dark:border-slate-800 rounded-lg p-3 sm:col-span-2">
                                    <p className="text-[11px] font-semibold text-slate-500 dark:text-slate-400">Reported By</p>
                                    <p className="text-sm font-bold text-slate-800 dark:text-white">
                                        {selectedIncidentReport.reported_by || '—'}
                                    </p>
                                </div>
                            </div>

                            <div className="border border-slate-200 dark:border-slate-800 rounded-lg p-3">
                                <p className="text-[11px] font-semibold text-slate-500 dark:text-slate-400">Description</p>
                                <p className="text-sm text-slate-700 dark:text-slate-200 mt-1 whitespace-pre-wrap">
                                    {selectedIncidentReport.description || '—'}
                                </p>
                            </div>

                            {selectedIncidentReport.notes && (
                                <div className="border border-slate-200 dark:border-slate-800 rounded-lg p-3">
                                    <p className="text-[11px] font-semibold text-slate-500 dark:text-slate-400">Internal Notes</p>
                                    <p className="text-sm text-slate-700 dark:text-slate-200 mt-1 whitespace-pre-wrap">
                                        {selectedIncidentReport.notes}
                                    </p>
                                </div>
                            )}

                            {selectedIncidentReport.related_transactions && selectedIncidentReport.related_transactions.length > 0 && (
                                <div className="border border-slate-200 dark:border-slate-800 rounded-lg p-3">
                                    <p className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 mb-2">Related Transactions</p>
                                    <div className="space-y-2 max-h-40 overflow-y-auto">
                                        {selectedIncidentReport.related_transactions.map((transaction) => (
                                            <div key={`${transaction.transaction_type}-${transaction.transaction_id}`} className="flex items-center justify-between text-xs">
                                                <span className="font-semibold text-slate-700 dark:text-slate-300">
                                                    {transaction.transaction_number}
                                                </span>
                                                <span className="text-slate-500 dark:text-slate-400 uppercase">
                                                    {transaction.transaction_type.replace('_', ' ')}
                                                </span>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}

                            <div className="flex items-center justify-end gap-2">
                                <button
                                    type="button"
                                    onClick={handleApproveSelectedIncidentReport}
                                    className="px-3 py-2 bg-emerald-500 hover:bg-emerald-600 text-white text-xs font-semibold rounded-lg transition-colors flex items-center gap-1.5"
                                >
                                    <CheckCircle className="w-3.5 h-3.5" />
                                    Approve Report
                                </button>
                                <button
                                    type="button"
                                    onClick={handleRejectSelectedIncidentReport}
                                    className="px-3 py-2 bg-rose-500 hover:bg-rose-600 text-white text-xs font-semibold rounded-lg transition-colors flex items-center gap-1.5"
                                >
                                    <XCircle className="w-3.5 h-3.5" />
                                    Deny Report
                                </button>
                            </div>
                        </div>
                    ) : (
                        <div className="text-sm text-slate-500 dark:text-slate-400">No incident report selected.</div>
                    )}
                </ActionModal>

                <ActionModal
                    open={showStatsModal}
                    title={`${statsModalTitle}${statsModalKey && ['active', 'inactive', 'prospective'].includes(statsModalKey) ? ` (${statsModalContacts.length})` : ''}`}
                    confirmLabel="Close"
                    onClose={() => setShowStatsModal(false)}
                    onConfirm={() => setShowStatsModal(false)}
                >
                    <div className="space-y-3">
                        <div className="flex items-center gap-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 px-3 py-2 rounded-lg">
                            <Search className="w-4 h-4 text-slate-400" />
                            <input
                                value={statsModalSearch}
                                onChange={(e) => setStatsModalSearch(e.target.value)}
                                placeholder={
                                    statsModalKey && ['totalCalls', 'missedCalls'].includes(statsModalKey)
                                        ? 'Search customers, agents, outcomes...'
                                        : statsModalKey && ['weeklySales', 'monthlySales', 'yearlySales'].includes(statsModalKey)
                                            ? 'Search customers or salesman...'
                                            : statsModalKey === 'pendingReports'
                                                ? 'Search reports...'
                                                : 'Search clients...'
                                }
                                className="bg-transparent text-sm outline-none text-slate-800 dark:text-slate-200 placeholder:text-slate-400 flex-1"
                            />
                        </div>

                        {statsModalKey && ['totalCalls', 'missedCalls'].includes(statsModalKey) && (
                            <div className="flex flex-wrap items-center gap-2">
                                <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">Range</span>
                                <select
                                    value={statsCallsRange}
                                    onChange={(e) => setStatsCallsRange(e.target.value as typeof statsCallsRange)}
                                    className="text-xs bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-2 py-1.5 text-slate-700 dark:text-slate-200"
                                >
                                    <option value="today">Today</option>
                                    <option value="week">This week</option>
                                    <option value="month">This month</option>
                                    <option value="year">This year</option>
                                    <option value="all">All time</option>
                                </select>
                                <span className="text-xs text-slate-500 dark:text-slate-400">
                                    {statsModalCallLogs.length} logs
                                </span>
                            </div>
                        )}

                        <div className="max-h-[420px] overflow-y-auto border border-slate-200 dark:border-slate-800 rounded-lg">
                            {statsModalKey && ['active', 'inactive', 'prospective'].includes(statsModalKey) && (
                                statsModalContacts.length === 0 ? (
                                    <div className="p-4 text-sm text-slate-500 dark:text-slate-400 text-center">No clients found.</div>
                                ) : (
                                    <div className="divide-y divide-slate-100 dark:divide-slate-800">
                                        {statsModalContacts.map((contact) => {
                                            const lastActivity = latestActivityDate(contact.id) || contact.lastContactDate;
                                            return (
                                                <button
                                                    key={contact.id}
                                                    type="button"
                                                    onClick={() => {
                                                        setSelectedContactId(contact.id);
                                                        setShowStatsModal(false);
                                                    }}
                                                    className="w-full text-left p-3 hover:bg-slate-50 dark:hover:bg-slate-800/60 transition-colors"
                                                >
                                                    <div className="flex items-start justify-between gap-3">
                                                        <div className="min-w-0">
                                                            <p className="text-sm font-bold text-slate-800 dark:text-white truncate">{contact.company}</p>
                                                            <p className="text-xs text-slate-500 dark:text-slate-400 truncate">
                                                                {contact.city}{contact.province ? `, ${contact.province}` : ''}
                                                                {contact.salesman ? ` • ${contact.salesman}` : ''}
                                                            </p>
                                                        </div>
                                                        <div className="text-right shrink-0">
                                                            <p className="text-xs font-semibold text-slate-700 dark:text-slate-200">{formatDate(lastActivity)}</p>
                                                            <p className="text-[10px] text-slate-500 dark:text-slate-400">Last activity</p>
                                                        </div>
                                                    </div>
                                                </button>
                                            );
                                        })}
                                    </div>
                                )
                            )}

                            {statsModalKey && ['totalCalls', 'missedCalls'].includes(statsModalKey) && (
                                statsModalCallLogs.length === 0 ? (
                                    <div className="p-4 text-sm text-slate-500 dark:text-slate-400 text-center">No call logs found.</div>
                                ) : (
                                    <div className="divide-y divide-slate-100 dark:divide-slate-800">
                                        {statsModalCallLogs.map((log) => {
                                            const contact = contactsMap.get(log.contact_id);
                                            return (
                                                <button
                                                    key={log.id}
                                                    type="button"
                                                    onClick={() => {
                                                        if (contact?.id) setSelectedContactId(contact.id);
                                                        setShowStatsModal(false);
                                                    }}
                                                    className="w-full text-left p-3 hover:bg-slate-50 dark:hover:bg-slate-800/60 transition-colors"
                                                >
                                                    <div className="flex items-start justify-between gap-3">
                                                        <div className="min-w-0">
                                                            <p className="text-sm font-bold text-slate-800 dark:text-white truncate">{contact?.company || 'Unknown customer'}</p>
                                                            <p className="text-xs text-slate-500 dark:text-slate-400 truncate">
                                                                {log.agent_name} • {log.direction} • {log.channel} • {log.outcome}
                                                            </p>
                                                        </div>
                                                        <div className="text-right shrink-0">
                                                            <p className="text-xs font-semibold text-slate-700 dark:text-slate-200">{formatDate(log.occurred_at)}</p>
                                                            <p className="text-[10px] text-slate-500 dark:text-slate-400">
                                                                {log.channel === 'call' ? formatDuration(log.duration_seconds) : '—'}
                                                            </p>
                                                        </div>
                                                    </div>
                                                </button>
                                            );
                                        })}
                                    </div>
                                )
                            )}

                            {statsModalKey === 'pendingReports' && (
                                pendingIncidentReports.length === 0 ? (
                                    <div className="p-4 text-sm text-slate-500 dark:text-slate-400 text-center">No pending incident reports.</div>
                                ) : (
                                    <div className="divide-y divide-slate-100 dark:divide-slate-800">
                                        {pendingIncidentReports
                                            .filter((report) => {
                                                if (!statsModalSearchNormalized) return true;
                                                return [report.customer_company, report.customer_city, report.customer_salesman, report.issue_type, report.description]
                                                    .filter(Boolean)
                                                    .some((field) => String(field).toLowerCase().includes(statsModalSearchNormalized));
                                            })
                                            .map((report) => (
                                                <div key={report.id} className="p-3">
                                                    <div className="flex items-start justify-between gap-3">
                                                        <div className="min-w-0">
                                                            <p className="text-sm font-bold text-slate-800 dark:text-white truncate">{report.customer_company}</p>
                                                            <p className="text-xs text-slate-500 dark:text-slate-400 truncate">
                                                                {report.customer_city} • {report.customer_salesman} • {report.issue_type}
                                                            </p>
                                                            <p className="text-xs text-slate-600 dark:text-slate-300 mt-2 line-clamp-2">{report.description}</p>
                                                        </div>
                                                        <div className="flex flex-col gap-2 shrink-0">
                                                            <button
                                                                onClick={() => handleApproveIncidentReport(report.id)}
                                                                className="px-3 py-1.5 bg-emerald-500 hover:bg-emerald-600 text-white text-xs font-semibold rounded-lg transition-colors"
                                                            >
                                                                Approve
                                                            </button>
                                                            <button
                                                                onClick={() => handleRejectIncidentReport(report.id)}
                                                                className="px-3 py-1.5 bg-rose-500 hover:bg-rose-600 text-white text-xs font-semibold rounded-lg transition-colors"
                                                            >
                                                                Deny
                                                            </button>
                                                        </div>
                                                    </div>
                                                </div>
                                            ))}
                                    </div>
                                )
                            )}

                            {statsModalKey && ['weeklySales', 'monthlySales', 'yearlySales'].includes(statsModalKey) && (
                                statsModalSalesRows.length === 0 ? (
                                    <div className="p-4 text-sm text-slate-500 dark:text-slate-400 text-center">No paid purchases found for this period.</div>
                                ) : (
                                    <div className="divide-y divide-slate-100 dark:divide-slate-800">
                                        <div className="p-3 bg-slate-50/60 dark:bg-slate-800/40 flex items-center justify-between">
                                            <p className="text-xs font-semibold text-slate-500 dark:text-slate-400">Total</p>
                                            <p className="text-sm font-bold text-slate-800 dark:text-white">{formatPeso(statsModalSalesTotal)}</p>
                                        </div>
                                        {statsModalSalesRows.map((row) => (
                                            <button
                                                key={row.contactId}
                                                type="button"
                                                onClick={() => {
                                                    setSelectedContactId(row.contactId);
                                                    setShowStatsModal(false);
                                                }}
                                                className="w-full text-left p-3 hover:bg-slate-50 dark:hover:bg-slate-800/60 transition-colors"
                                            >
                                                <div className="flex items-start justify-between gap-3">
                                                    <div className="min-w-0">
                                                        <p className="text-sm font-bold text-slate-800 dark:text-white truncate">{row.company}</p>
                                                        <p className="text-xs text-slate-500 dark:text-slate-400 truncate">Salesman: {row.salesman}</p>
                                                    </div>
                                                    <div className="text-right shrink-0">
                                                        <p className="text-sm font-bold text-slate-800 dark:text-white">{formatPeso(row.total)}</p>
                                                    </div>
                                                </div>
                                            </button>
                                        ))}
                                    </div>
                                )
                            )}
                        </div>
                    </div>
                </ActionModal>

                <ActionModal
                    open={showPricingModal}
                    title="Adjust Pricing"
                    confirmLabel="Save changes"
                    onClose={() => setShowPricingModal(false)}
                    onConfirm={handlePricingSubmit}
                    loading={actionLoading}
                >
                    <div className="space-y-3">
                        <div>
                            <label className="text-xs font-semibold text-slate-500">Price Group</label>
                            <select value={pricingForm.priceGroup} onChange={(e) => setPricingForm({ ...pricingForm, priceGroup: e.target.value })} className="w-full mt-1 text-sm px-3 py-2 rounded-md border border-slate-200 focus:border-brand-blue focus:outline-none">
                                {['AA', 'BB', 'CC', 'VIP1', 'VIP2'].map(group => (
                                    <option key={group} value={group}>{group}</option>
                                ))}
                            </select>
                        </div>
                        <div>
                            <label className="text-xs font-semibold text-slate-500">Payment Terms</label>
                            <input value={pricingForm.terms} onChange={(e) => setPricingForm({ ...pricingForm, terms: e.target.value })} className="w-full mt-1 text-sm px-3 py-2 rounded-md border border-slate-200 focus:border-brand-blue focus:outline-none" />
                        </div>
                        <div>
                            <label className="text-xs font-semibold text-slate-500">Credit Limit (₱)</label>
                            <input type="number" value={pricingForm.creditLimit} onChange={(e) => setPricingForm({ ...pricingForm, creditLimit: e.target.value })} className="w-full mt-1 text-sm px-3 py-2 rounded-md border border-slate-200 focus:border-brand-blue focus:outline-none" />
                        </div>
                    </div>
                </ActionModal>

                <ActionModal
                    open={showReassignModal}
                    title="Reassign Client"
                    confirmLabel="Reassign"
                    onClose={() => setShowReassignModal(false)}
                    onConfirm={handleReassignSubmit}
                    loading={actionLoading}
                >
                    <div className="space-y-3">
                        <label className="text-xs font-semibold text-slate-500">Select Agent</label>
                        <select value={reassignForm.agentId} onChange={(e) => setReassignForm({ agentId: e.target.value })} className="w-full mt-1 text-sm px-3 py-2 rounded-md border border-slate-200 focus:border-brand-blue focus:outline-none">
                            {selectedAgentOptions.map(agent => (
                                <option key={agent.id} value={agent.id}>{agent.name}</option>
                            ))}
                        </select>
                    </div>
                </ActionModal>

                <ActionModal
                    open={showBlacklistModal}
                    title="Blacklist Client"
                    confirmLabel="Blacklist"
                    confirmClassName="bg-rose-600 hover:bg-rose-700"
                    onClose={() => setShowBlacklistModal(false)}
                    onConfirm={handleBlacklistSubmit}
                    loading={actionLoading}
                >
                    <p className="text-sm text-slate-600 mb-3">Provide a short note so the team knows why this client is blocked.</p>
                    <textarea value={blacklistReason} onChange={(e) => setBlacklistReason(e.target.value)} className="w-full text-sm px-3 py-2 rounded-md border border-slate-200 focus:border-rose-500 focus:outline-none min-h-[100px]"></textarea>
                </ActionModal>

                <ActionModal
                    open={showReplyModal}
                    title="Reply to Report"
                    confirmLabel="Send reply"
                    onClose={() => setShowReplyModal(false)}
                    onConfirm={handleReplySubmit}
                    loading={actionLoading}
                >
                    <textarea value={replyMessage} onChange={(e) => setReplyMessage(e.target.value)} className="w-full text-sm px-3 py-2 rounded-md border border-slate-200 focus:border-brand-blue focus:outline-none min-h-[120px]" placeholder="Type your response for the field team..."></textarea>
                </ActionModal>

                {/* Agent Summary Modal */}
                <AgentSummaryModal
                    isOpen={showAgentModal}
                    onClose={() => setShowAgentModal(false)}
                    agentSummary={agentSummary}
                    loading={agentSummaryLoading}
                />
            </div>
        </div>
    );
};

export default OwnerLiveCallMonitoringView;
