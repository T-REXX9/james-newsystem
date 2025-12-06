
import React, { useState, useRef, useEffect, useMemo, useCallback } from 'react';
import { 
  Phone, PhoneIncoming, PhoneOutgoing, Search, Filter, 
  Calendar, Target, ArrowUpRight, Send, MessageSquare,
  PhilippinePeso, TrendingUp, Package, Users, UserCheck, UserX, UserPlus, BarChart3, ClipboardList, Clock, FileText, ShieldAlert, RefreshCw
} from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend } from 'recharts';
import { MOCK_AGENTS } from '../constants';
import { fetchContacts, fetchCallLogs, fetchInquiries, fetchPurchases, subscribeToCallMonitoringUpdates, updateContact, createInquiry } from '../services/supabaseService';
import { Contact, CustomerStatus, CallLogEntry, Inquiry, Purchase } from '../types';
import CompanyName from './CompanyName';
import AgentCallActivity from './AgentCallActivity';
import { useToast } from './ToastProvider';

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

const CallMonitoringView: React.FC = () => {
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
  const [pricingForm, setPricingForm] = useState({ priceGroup: '', terms: '', creditLimit: '' });
  const [reassignForm, setReassignForm] = useState({ agentId: '' });
  const [blacklistReason, setBlacklistReason] = useState('');
  const [replyMessage, setReplyMessage] = useState('');
  const [actionLoading, setActionLoading] = useState(false);
  const [customerSearchQuery, setCustomerSearchQuery] = useState('');
  
  // Customer Stats State
  const [customerStats, setCustomerStats] = useState({ active: 0, inactive: 0, prospective: 0 });

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
  }, []);

  useEffect(() => {
      loadData();
  }, [loadData]);

  useEffect(() => {
      const unsubscribe = subscribeToCallMonitoringUpdates(() => {
          loadData();
      });
      return () => {
          unsubscribe();
      };
  }, [loadData]);


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
  const missedCalls = 0; // No explicit status in new schema; keep placeholder for metric slot
  const inProgressCalls = 0;
  
  const outcomeData = [
    { name: 'Positive', value: effectiveLogs.filter(c => c.outcome === 'positive').length, color: '#10b981' },
    { name: 'Follow-up', value: effectiveLogs.filter(c => c.outcome === 'follow_up').length, color: '#f59e0b' },
    { name: 'Negative', value: effectiveLogs.filter(c => c.outcome === 'negative').length, color: '#ef4444' },
    { name: 'Others', value: effectiveLogs.filter(c => c.outcome === 'other').length, color: '#6366f1' },
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
  const contactInquiries = selectedContactId ? inquiries.filter(i => i.contact_id === selectedContactId).sort((a,b) => (b.occurred_at || '').localeCompare(a.occurred_at || '')) : [];
  const contactPurchases = selectedContactId ? purchases.filter(p => p.contact_id === selectedContactId).sort((a,b) => (b.purchased_at || '').localeCompare(a.purchased_at || '')) : [];

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

  const CompactMetric = ({ title, value, subtext, icon: Icon, colorClass, bgClass }: any) => (
      <div className={`flex items-center gap-3 p-3 rounded-xl border border-slate-200 dark:border-slate-800 ${bgClass || 'bg-white dark:bg-slate-900'} shadow-sm min-w-[140px]`}>
          <div className={`p-2 rounded-lg ${colorClass}`}>
              <Icon className="w-5 h-5" />
          </div>
          <div>
              <p className="text-[10px] uppercase font-bold text-slate-400 tracking-wider whitespace-nowrap">{title}</p>
              <div className="flex items-baseline gap-2">
                  <h4 className="text-xl font-bold text-slate-800 dark:text-white leading-none">{value}</h4>
                  {subtext && <span className="text-[10px] text-slate-500 font-medium">{subtext}</span>}
              </div>
          </div>
      </div>
  );

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
                  Live Monitor
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
      <div className="px-6 py-4 shrink-0 bg-slate-50 dark:bg-slate-950 overflow-x-auto border-b border-slate-100 dark:border-slate-900">
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-8 gap-3 min-w-[1200px] lg:min-w-0">
             {/* Customer Stats (Requested) */}
             <CompactMetric 
                title="Active Clients" 
                value={customerStats.active} 
                icon={UserCheck} 
                bgClass="bg-emerald-50/50 dark:bg-emerald-900/10"
                colorClass="text-emerald-600 dark:text-emerald-400 bg-white dark:bg-emerald-900/20"
             />
             <CompactMetric 
                title="Inactive" 
                value={customerStats.inactive} 
                icon={UserX} 
                bgClass="bg-slate-100/50 dark:bg-slate-800/50"
                colorClass="text-slate-500 dark:text-slate-400 bg-white dark:bg-slate-800"
             />
             <CompactMetric 
                title="Prospective" 
                value={customerStats.prospective} 
                icon={UserPlus} 
                bgClass="bg-blue-50/50 dark:bg-blue-900/10"
                colorClass="text-blue-600 dark:text-blue-400 bg-white dark:bg-blue-900/20"
             />

             {/* Call Stats */}
             <CompactMetric 
                title="Total Calls" 
                value={totalCalls} 
                subtext={`Target: 120`}
                icon={Phone} 
                colorClass="text-brand-blue dark:text-blue-300 bg-blue-50 dark:bg-blue-900/20"
             />
             <CompactMetric 
                title="Missed Calls" 
                value={missedCalls} 
                icon={PhoneIncoming} 
                colorClass="text-rose-600 dark:text-rose-400 bg-rose-50 dark:bg-rose-900/20"
             />
             
             {/* Sales */}
             <CompactMetric 
                title="Weekly Sales" 
                value="₱850k" 
                icon={TrendingUp} 
                colorClass="text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-900/20"
             />
              <CompactMetric 
                title="Monthly Sales" 
                value="₱3.2M" 
                icon={PhilippinePeso} 
                colorClass="text-purple-600 dark:text-purple-400 bg-purple-50 dark:bg-purple-900/20"
             />
             <CompactMetric 
                title="Yearly Sales" 
                value="₱42.5M" 
                icon={BarChart3} 
                colorClass="text-teal-600 dark:text-teal-400 bg-teal-50 dark:bg-teal-900/20"
             />
          </div>
      </div>

      <div className="flex-1 min-h-0 overflow-y-auto px-6 pb-6 pt-4 space-y-4">
         {/* 3. Main Dashboard Grid (Flex-1 to prevent scroll) */}
         <div className="grid grid-cols-12 gap-4">
            {/* Customer Lists */}
            <div className="col-span-12 lg:col-span-5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-sm p-4 space-y-3">
               <div className="flex items-center justify-between">
                   <h3 className="text-sm font-bold text-slate-800 dark:text-white flex items-center gap-2">
                       <ClipboardList className="w-4 h-4 text-brand-blue" /> Daily Customer Lists
                   </h3>
                   <span className="text-[10px] uppercase text-slate-400">Status grouped</span>
               </div>
               <div className="grid grid-cols-1 md:grid-cols-3 gap-3 items-stretch">
                   {groupedCustomers.map(group => (
                       <div key={group.key} className="border border-slate-200 dark:border-slate-800 rounded-lg p-3 bg-slate-50/40 dark:bg-slate-800/50 flex flex-col h-full">
                           <div className="flex items-center justify-between mb-2">
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
            <div className="col-span-12 lg:col-span-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-sm p-4 space-y-3">
                <div className="flex items-center justify-between">
                    <h3 className="text-sm font-bold text-slate-800 dark:text-white flex items-center gap-2">
                        <FileText className="w-4 h-4 text-brand-blue" /> Customer Summary
                    </h3>
                    <span className="text-[10px] text-slate-400">Details, sales, chat</span>
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

            {/* Lead Opportunities + Performance */}
            <div className="col-span-12 lg:col-span-3 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-sm p-4 space-y-3">
                <div className="flex items-center justify-between">
                   <h3 className="text-sm font-bold text-slate-800 dark:text-white flex items-center gap-2">
                       <Target className="w-4 h-4 text-brand-blue" /> Lead Opportunities
                   </h3>
                   <button className="text-[11px] text-brand-blue flex items-center gap-1"><RefreshCw className="w-3 h-3" /> Sync</button>
                </div>
                <div className="space-y-2">
                    <div className="text-[11px] font-bold text-slate-500 uppercase">Active – no purchase this month</div>
                    {leadOpportunities.activeNoPurchase.map(c => {
                       const { companyName, formerName } = getCompanyNameParts(c);
                       return (
                         <div key={c.id} className="text-xs text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-800 rounded-md px-2 py-1">
                             <CompanyName 
                               name={companyName}
                               pastName={formerName}
                               entity={c}
                               className="inline-flex items-center gap-1"
                               formerNameClassName="text-[10px] text-slate-500 font-medium"
                             />
                         </div>
                       );
                    })}
                    {leadOpportunities.activeNoPurchase.length === 0 && <div className="text-xs text-slate-500">All active customers purchased this month.</div>}
                </div>
                <div className="space-y-2">
                    <div className="text-[11px] font-bold text-slate-500 uppercase">Inactive – positive interest</div>
                    {leadOpportunities.inactivePositive.map(c => {
                       const { companyName, formerName } = getCompanyNameParts(c);
                       return (
                         <div key={c.id} className="text-xs text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-800 rounded-md px-2 py-1">
                             <CompanyName 
                               name={companyName}
                               pastName={formerName}
                               entity={c}
                               className="inline-flex items-center gap-1"
                               formerNameClassName="text-[10px] text-slate-500 font-medium"
                             />
                         </div>
                       );
                    })}
                    {leadOpportunities.inactivePositive.length === 0 && <div className="text-xs text-slate-500">No inactive positive leads.</div>}
                </div>
                <div className="space-y-2">
                    <div className="text-[11px] font-bold text-slate-500 uppercase">Prospectives – positive</div>
                    {leadOpportunities.prospectivePositive.map(c => {
                       const { companyName, formerName } = getCompanyNameParts(c);
                       return (
                         <div key={c.id} className="text-xs text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-800 rounded-md px-2 py-1">
                             <CompanyName 
                               name={companyName}
                               pastName={formerName}
                               entity={c}
                               className="inline-flex items-center gap-1"
                               formerNameClassName="text-[10px] text-slate-500 font-medium"
                             />
                         </div>
                       );
                    })}
                    {leadOpportunities.prospectivePositive.length === 0 && <div className="text-xs text-slate-500">No positive prospectives.</div>}
                </div>

                <div className="border-t border-slate-200 dark:border-slate-800 pt-3 space-y-2">
                    <div className="text-[11px] font-bold text-slate-500 uppercase">New today</div>
                    <div className="flex items-center gap-2 text-xs text-slate-700 dark:text-slate-200">
                        <UserPlus className="w-4 h-4 text-brand-blue" /> Prospects: {newProspectsToday.length} | Customers: {newCustomersToday.length}
                    </div>
                </div>

                <div className="border-t border-slate-200 dark:border-slate-800 pt-3 space-y-2">
                    <div className="text-[11px] font-bold text-slate-500 uppercase">Agent Performance</div>
                    <div className="grid grid-cols-2 gap-2 text-xs text-slate-700 dark:text-slate-200">
                       <div className="p-2 rounded-lg bg-blue-50 dark:bg-blue-900/20">
                           <div className="font-bold">Monthly Quota</div>
                           <div className="text-sm">₱1.5M</div>
                       </div>
                       <div className="p-2 rounded-lg bg-emerald-50 dark:bg-emerald-900/20">
                           <div className="font-bold">Current Sales</div>
                           <div className="text-sm">₱{totalSales.toLocaleString()}</div>
                       </div>
                       <div className="p-2 rounded-lg bg-emerald-100 dark:bg-emerald-900/30">
                           <div className="font-bold">Active Customers</div>
                           <div className="text-sm">₱{salesFromStatus(CustomerStatus.ACTIVE).toLocaleString()}</div>
                       </div>
                       <div className="p-2 rounded-lg bg-slate-50 dark:bg-slate-800/40">
                           <div className="font-bold">Inactive Customers</div>
                           <div className="text-sm">₱{salesFromStatus(CustomerStatus.INACTIVE).toLocaleString()}</div>
                       </div>
                       <div className="p-2 rounded-lg bg-amber-50 dark:bg-amber-900/20 col-span-2">
                           <div className="font-bold">Prospective Customers</div>
                           <div className="text-sm">₱{salesFromStatus(CustomerStatus.PROSPECTIVE).toLocaleString()}</div>
                       </div>
                    </div>
                </div>
            </div>
         </div>

         <div className="min-h-0">
         <div className="grid grid-cols-12 gap-4 min-h-0 items-start">
              
              {/* LEFT COLUMN: Activity & List (Span 9) */}
              <div className="col-span-12 lg:col-span-9 flex flex-col gap-4 min-h-0">
                  
                  {/* Row 1: Agent Activity Chart (Fixed Height) */}
                  <div className="h-64 shrink-0 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4 shadow-sm flex flex-col">
                      <div className="flex justify-between items-center mb-2 shrink-0">
                         <h3 className="font-bold text-sm text-slate-800 dark:text-white">Agent Call Volume</h3>
                         <div className="flex gap-4 text-xs">
                            <div className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-blue-500"></span> Calls</div>
                            <div className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-emerald-500"></span> Success</div>
                         </div>
                      </div>
                      <div className="flex-1 w-full min-h-0">
                          <ResponsiveContainer width="100%" height="100%">
                              <BarChart data={agentChartData} margin={{ top: 5, right: 5, left: -25, bottom: 0 }} barSize={20}>
                                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#475569" opacity={0.1} />
                                  <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fontSize: 10, fill: '#94a3b8'}} dy={5} />
                                  <YAxis axisLine={false} tickLine={false} tick={{fontSize: 10, fill: '#94a3b8'}} />
                                  <Tooltip 
                                    cursor={{fill: 'rgba(255,255,255,0.05)'}}
                                    contentStyle={{ backgroundColor: '#1e293b', borderRadius: '4px', border: 'none', color: '#f8fafc', fontSize: '12px' }}
                                  />
                                  <Bar dataKey="calls" fill="#3b82f6" radius={[2, 2, 0, 0]} />
                                  <Bar dataKey="successful" fill="#10b981" radius={[2, 2, 0, 0]} />
                              </BarChart>
                          </ResponsiveContainer>
                      </div>
                  </div>

                  {/* Row 2: Call Log Table (Flex-1 Scrollable) */}
                  <div className="flex-1 min-h-0 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-sm flex flex-col overflow-hidden">
                      <div className="px-4 py-3 border-b border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/30 shrink-0 flex justify-between items-center">
                          <h3 className="font-bold text-sm text-slate-800 dark:text-white">Recent Logs</h3>
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
                                                <span className={`flex items-center gap-1 text-[10px] font-bold ${
                                                    log.direction === 'inbound' ? 'text-emerald-600' : 'text-blue-600'
                                                }`}>
                                                    {log.direction === 'inbound' ? <PhoneIncoming className="w-3 h-3" /> : <PhoneOutgoing className="w-3 h-3" />}
                                                    {log.channel.toUpperCase()} • {log.direction}
                                                </span>
                                            </td>
                                            <td className="px-4 py-2 text-xs text-slate-600 dark:text-slate-300 font-mono">
                                                {formatDuration(log.duration_seconds)}
                                            </td>
                                            <td className="px-4 py-2">
                                                <span className={`px-1.5 py-0.5 rounded text-[9px] font-bold uppercase ${
                                                    log.outcome === 'positive' ? 'bg-emerald-50 text-emerald-600 dark:bg-emerald-900/20 dark:text-emerald-400' :
                                                    log.outcome === 'follow_up' ? 'bg-amber-100 text-amber-600 dark:bg-amber-900/30 dark:text-amber-400' :
                                                    log.outcome === 'negative' ? 'bg-rose-100 text-rose-600 dark:bg-rose-900/30 dark:text-rose-400' :
                                                    'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400'
                                                }`}>
                                                    {log.outcome.replace('_',' ')}
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

              {/* RIGHT COLUMN: Insights & Chat (Span 3) */}
              <div className="col-span-12 lg:col-span-3 flex flex-col gap-4 h-full min-h-0 lg:self-start">
                  <AgentCallActivity
                    callLogs={filteredLogs}
                    inquiries={filteredInquiries}
                    contacts={contacts}
                    maxItems={8}
                    title="Recent Activity"
                  />
                  
                  {/* Outcome Chart (Fixed Height) */}
                  <div className="h-48 shrink-0 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4 shadow-sm flex flex-row items-center">
                       <div className="flex-1 h-full relative">
                          <h3 className="absolute top-0 left-0 text-xs font-bold text-slate-500 uppercase">Outcomes</h3>
                          <ResponsiveContainer width="100%" height="100%">
                              <PieChart>
                                  <Pie data={outcomeData} cx="50%" cy="50%" innerRadius={35} outerRadius={50} paddingAngle={2} dataKey="value">
                                      {outcomeData.map((entry, index) => <Cell key={`cell-${index}`} fill={entry.color} strokeWidth={0} />)}
                                  </Pie>
                                  <Tooltip contentStyle={{borderRadius: '4px', border:'none', backgroundColor: '#1e293b', color: '#fff', fontSize: '10px', padding: '4px'}} />
                              </PieChart>
                          </ResponsiveContainer>
                       </div>
                       <div className="w-28 flex flex-col justify-center gap-2">
                          {outcomeData.map((item) => (
                              <div key={item.name} className="flex items-center justify-between text-[10px]">
                                  <div className="flex items-center gap-1.5">
                                      <div className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: item.color }}></div>
                                      <span className="text-slate-500 dark:text-slate-400">{item.name}</span>
                                  </div>
                                  <span className="font-bold text-slate-700 dark:text-slate-300">{item.value}</span>
                              </div>
                          ))}
                       </div>
                  </div>

                  {/* Chat (Flex-1) */}
                  <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-sm flex flex-col overflow-hidden h-[420px]">
                      <div className="p-3 border-b border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/30 shrink-0 flex items-center gap-2">
                           <MessageSquare className="w-4 h-4 text-brand-blue" />
                           <h3 className="font-bold text-sm text-slate-800 dark:text-white">Team Chat</h3>
                      </div>

                      <div ref={chatContainerRef} className="flex-1 overflow-y-auto p-3 space-y-3 custom-scrollbar">
                          {chatMessages.map((msg) => (
                              <div key={msg.id} className={`flex gap-2 ${msg.isMe ? 'flex-row-reverse' : ''}`}>
                                  <img src={msg.avatar} className="w-6 h-6 rounded-full border border-slate-200 shrink-0" alt="" />
                                  <div className={`flex flex-col max-w-[90%] ${msg.isMe ? 'items-end' : 'items-start'}`}>
                                      <div className={`px-3 py-2 rounded-xl text-xs ${
                                          msg.isMe 
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
                                                className={`w-full text-left p-2 flex items-center gap-2 text-xs ${
                                                    index === selectedIndex ? 'bg-blue-50 dark:bg-blue-900/30' : ''
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

              </div>
          </div>
      </div>
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
                    {['AA','BB','CC','VIP1','VIP2'].map(group => (
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
    </div>
  </div>
  );
};

export default CallMonitoringView;
