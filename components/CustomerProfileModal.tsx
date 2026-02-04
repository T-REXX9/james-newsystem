import React, { useEffect, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import {
  AlertTriangle,
  Calendar,
  Clock,
  CreditCard,
  DollarSign,
  FileText,
  Mail,
  MapPin,
  MessageSquare,
  Phone,
  Plus,
  ShieldAlert,
  ShoppingBag,
  Trash2,
  TrendingUp,
  User,
  X,
} from 'lucide-react';
import CustomLoadingSpinner from './CustomLoadingSpinner';
import {
  fetchCallLogs,
  fetchIncidentReports,
  fetchInquiries,
  fetchPurchases,
} from '../services/supabaseService';
import {
  CallLogEntry,
  Contact,
  CustomerStatus,
  IncidentReport,
  Inquiry,
  Purchase,
  UserProfile,
} from '../types';

interface CustomerProfileModalProps {
  contact: Contact;
  currentUser: UserProfile | null;
  onClose: () => void;
  onCreateInquiry?: (contact: Contact) => void;
}

type SidebarTab = 'log' | 'purchases' | 'returns' | 'inquiries' | 'calls' | 'ledger';

const formatCurrency = (value: number) =>
  new Intl.NumberFormat('en-PH', {
    style: 'currency',
    currency: 'PHP',
    maximumFractionDigits: 0,
  }).format(value);

const formatDate = (value?: string | null) => {
  if (!value) return '—';
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return '—';
  return parsed.toLocaleDateString('en-PH', {
    month: 'short',
    day: 'numeric',
  });
};

const formatDateFull = (value?: string | null) => {
  if (!value) return '—';
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return '—';
  return parsed.toLocaleDateString('en-PH', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
};

const formatTime = (value?: string | null) => {
  if (!value) return '—';
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return '—';
  return parsed.toLocaleTimeString('en-PH', {
    hour: '2-digit',
    minute: '2-digit',
  });
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

const riskLevelBadge = (level: string) => {
  switch (level?.toLowerCase()) {
    case 'high':
      return 'bg-rose-50 text-rose-600 dark:bg-rose-900/30 dark:text-rose-300';
    case 'medium':
      return 'bg-amber-50 text-amber-600 dark:bg-amber-900/30 dark:text-amber-300';
    case 'low':
      return 'bg-emerald-50 text-emerald-600 dark:bg-emerald-900/30 dark:text-emerald-300';
    default:
      return 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300';
  }
};

const CustomerProfileModal: React.FC<CustomerProfileModalProps> = ({
  contact,
  currentUser,
  onClose,
  onCreateInquiry,
}) => {
  const [activeTab, setActiveTab] = useState<SidebarTab>('log');
  const [purchases, setPurchases] = useState<Purchase[]>([]);
  const [incidents, setIncidents] = useState<IncidentReport[]>([]);
  const [callLogs, setCallLogs] = useState<CallLogEntry[]>([]);
  const [inquiries, setInquiries] = useState<Inquiry[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      try {
        const [purchaseData, incidentData, callLogData, inquiryData] = await Promise.all([
          fetchPurchases(),
          fetchIncidentReports(contact.id),
          fetchCallLogs(),
          fetchInquiries(),
        ]);

        setPurchases(
          purchaseData
            .filter((p) => p.contact_id === contact.id)
            .sort((a, b) => Date.parse(b.purchased_at) - Date.parse(a.purchased_at))
        );
        setIncidents(
          incidentData.sort((a, b) => Date.parse(b.report_date) - Date.parse(a.report_date))
        );
        setCallLogs(
          callLogData
            .filter((log) => log.contact_id === contact.id)
            .sort((a, b) => Date.parse(b.occurred_at) - Date.parse(a.occurred_at))
        );
        setInquiries(
          inquiryData
            .filter((inq) => inq.contact_id === contact.id)
            .sort((a, b) => Date.parse(b.occurred_at) - Date.parse(a.occurred_at))
        );
      } catch (error) {
        console.error('Error loading customer profile:', error);
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, [contact.id]);

  // Build combined timeline
  const timeline = useMemo(() => {
    const items: Array<{
      id: string;
      type: 'call' | 'inquiry' | 'purchase' | 'system_event' | 'risk_alert';
      title: string;
      date: string;
      time: string;
      detail?: string;
      meta?: string;
      severity?: 'high' | 'medium' | 'low';
      icon?: React.ReactNode;
    }> = [];

    // Add system events (these could come from your data or be simulated)
    items.push({
      id: 'sys-001',
      type: 'system_event',
      title: 'System Event',
      date: new Date().toISOString(),
      time: formatTime(new Date().toISOString()),
      detail: 'Customer account created',
      meta: 'System',
    });

    callLogs.forEach((log) => {
      items.push({
        id: `call-${log.id}`,
        type: 'call',
        title: log.channel === 'text' ? 'SMS' : 'Call',
        date: log.occurred_at,
        time: formatTime(log.occurred_at),
        detail: log.notes,
        meta: `${log.direction === 'inbound' ? 'Inbound' : 'Outbound'} • ${log.outcome?.replace('_', ' ') || 'Logged'}`,
      });
    });

    inquiries.forEach((inq) => {
      items.push({
        id: `inq-${inq.id}`,
        type: 'inquiry',
        title: 'Inquiry',
        date: inq.occurred_at,
        time: formatTime(inq.occurred_at),
        detail: inq.notes || inq.title,
        meta: `via ${inq.channel}`,
      });
    });

    purchases.forEach((p) => {
      items.push({
        id: `purchase-${p.id}`,
        type: 'purchase',
        title: 'Purchase',
        date: p.purchased_at,
        time: formatTime(p.purchased_at),
        detail: `${p.notes || 'Order placed'}`,
        meta: `${formatCurrency(p.amount)} • ${p.status}`,
      });
    });

    return items.sort((a, b) => Date.parse(b.date) - Date.parse(a.date));
  }, [callLogs, inquiries, purchases]);

  const totalPurchases = purchases.filter((p) => p.status === 'paid').reduce((sum, p) => sum + p.amount, 0);

  const handleCreateInquiry = () => {
    if (onCreateInquiry) {
      onCreateInquiry(contact);
    }
    onClose();
  };

  const sidebarMenuItems: Array<{ id: SidebarTab; label: string; icon: React.ReactNode; count?: number }> = [
    { id: 'log', label: 'Immutable Log', icon: <FileText className="w-4 h-4" />, count: timeline.length },
    { id: 'purchases', label: 'Purchase History', icon: <ShoppingBag className="w-4 h-4" />, count: purchases.length },
    { id: 'returns', label: 'Sales Returns', icon: <Trash2 className="w-4 h-4" />, count: 0 },
    { id: 'inquiries', label: 'Inquiry History', icon: <MessageSquare className="w-4 h-4" />, count: inquiries.length },
    { id: 'calls', label: 'Daily Call Logs', icon: <Phone className="w-4 h-4" />, count: callLogs.length },
    { id: 'ledger', label: 'Credit Ledger', icon: <CreditCard className="w-4 h-4" /> },
  ];

  const getTierBadge = (contact: Contact) => {
    if (contact.priceGroup?.includes('VIP')) return 'VIP Tier 2';
    if (contact.status === CustomerStatus.ACTIVE) return 'Active';
    return 'Standard';
  };

  const modal = (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm animate-fadeIn">
      <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl w-full max-w-6xl h-[90vh] max-h-[90vh] flex overflow-hidden">
        {/* Left Sidebar */}
        <div className="w-80 border-r border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 flex flex-col overflow-hidden">
          {/* Customer Header */}
          <div className="p-6 border-b border-slate-200 dark:border-slate-800 flex-shrink-0">
            <div className="flex items-center gap-4 mb-4">
              <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-teal-500 to-teal-600 flex items-center justify-center text-white text-2xl font-bold shadow-lg">
                {contact.company?.charAt(0) || 'C'}
              </div>
              <div className="flex-1">
                <h2 className="text-lg font-bold text-slate-800 dark:text-white truncate">
                  {contact.company}
                </h2>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                  Member since {contact.customerSince ? new Date(contact.customerSince).getFullYear() : '2021'}
                </p>
              </div>
            </div>
            
            {/* Status and Tier */}
            <div className="flex items-center gap-2 mb-4">
              <span
                className={`text-xs font-semibold px-2 py-1 rounded-full ${statusBadgeClasses(
                  contact.status
                )}`}
              >
                {contact.status}
              </span>
              <span className="text-xs font-semibold px-2 py-1 rounded-full bg-amber-50 text-amber-600 dark:bg-amber-900/30 dark:text-amber-300">
                {getTierBadge(contact)}
              </span>
            </div>

            {/* RTO Badge */}
            <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-900/50 rounded-lg p-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-red-600 dark:text-red-400">RTO</span>
                <span className="text-lg font-bold text-red-600 dark:text-red-400">5</span>
              </div>
            </div>
          </div>

          {/* Contact Info */}
          <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-800 flex-shrink-0 space-y-3">
            <div>
              <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">EMAIL</p>
              <p className="text-sm text-slate-700 dark:text-slate-200 mt-1">{contact.email || 'Not provided'}</p>
            </div>
            <div>
              <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">PHONE</p>
              <p className="text-sm text-slate-700 dark:text-slate-200 mt-1">{contact.phone || contact.mobile || 'Not provided'}</p>
            </div>
            <div>
              <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">SHIPPING ADDRESS</p>
              <p className="text-sm text-slate-700 dark:text-slate-200 mt-1">
                {contact.address || `${contact.city}, ${contact.province}`} {contact.postalCode}
              </p>
            </div>
          </div>

          {/* Sidebar Menu */}
          <nav className="flex-1 overflow-y-auto py-4 px-3 space-y-1">
            {sidebarMenuItems.map((item) => (
              <button
                key={item.id}
                onClick={() => setActiveTab(item.id)}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-all ${
                  activeTab === item.id
                    ? 'bg-white dark:bg-slate-800 text-slate-900 dark:text-white shadow-sm'
                    : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800/50'
                }`}
              >
                <div className="flex-shrink-0">{item.icon}</div>
                <div className="flex-1 text-left truncate">{item.label}</div>
                {item.count !== undefined && (
                  <span className="text-xs font-semibold bg-slate-200 dark:bg-slate-700 rounded-full px-2 py-0.5">
                    {item.count}
                  </span>
                )}
              </button>
            ))}
          </nav>
        </div>

        {/* Right Content Area */}
        <div className="flex-1 flex flex-col overflow-hidden">
          {/* Header */}
          <div className="p-6 border-b border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 flex-shrink-0 flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-slate-800 dark:text-white">
                {activeTab === 'log' && 'Immutable Interaction Log'}
                {activeTab === 'purchases' && 'Purchase History'}
                {activeTab === 'returns' && 'Sales Returns'}
                {activeTab === 'inquiries' && 'Inquiry History'}
                {activeTab === 'calls' && 'Daily Call Logs'}
                {activeTab === 'ledger' && 'Credit Ledger'}
              </h1>
              {activeTab === 'log' && (
                <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
                  Secure, time-stamped record of all customer touchpoints.
                </p>
              )}
            </div>
            <button
              onClick={onClose}
              className="p-2 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Content Area */}
          <div className="flex-1 min-h-0 overflow-y-auto [scrollbar-gutter:stable] p-6 bg-slate-50 dark:bg-slate-950">
            {loading ? (
              <div className="flex items-center justify-center py-12">
                <CustomLoadingSpinner label="Loading" />
              </div>
            ) : (
              <>
                {/* Immutable Log Tab */}
                {activeTab === 'log' && (
                  <div className="space-y-4">
                    {timeline.length === 0 ? (
                      <div className="text-center py-12 text-slate-400 dark:text-slate-500">
                        <FileText className="w-10 h-10 mx-auto mb-3 opacity-50" />
                        <p>No interaction history</p>
                      </div>
                    ) : (
                      timeline.map((event) => (
                        <div
                          key={event.id}
                          className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-4"
                        >
                          <div className="flex items-start gap-4">
                            {/* Timeline Icon */}
                            <div className="flex-shrink-0 w-10 h-10 rounded-lg bg-slate-100 dark:bg-slate-700 flex items-center justify-center mt-1">
                              {event.type === 'call' ? (
                                <Phone className="w-5 h-5 text-brand-blue" />
                              ) : event.type === 'inquiry' ? (
                                <MessageSquare className="w-5 h-5 text-amber-500" />
                              ) : event.type === 'purchase' ? (
                                <ShoppingBag className="w-5 h-5 text-emerald-500" />
                              ) : event.type === 'system_event' ? (
                                <FileText className="w-5 h-5 text-slate-500" />
                              ) : (
                                <ShieldAlert className="w-5 h-5 text-rose-500" />
                              )}
                            </div>

                            <div className="flex-1 min-w-0">
                              <div className="flex items-center justify-between gap-2">
                                <h3 className="text-sm font-semibold text-slate-800 dark:text-white">
                                  {event.title}
                                </h3>
                                <span className="text-sm font-medium text-slate-500 dark:text-slate-400 whitespace-nowrap">
                                  {event.time}
                                </span>
                              </div>

                              {event.meta && (
                                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">{event.meta}</p>
                              )}

                              {event.detail && (
                                <p className="text-sm text-slate-700 dark:text-slate-300 mt-2">{event.detail}</p>
                              )}

                              <p className="text-xs text-slate-400 dark:text-slate-500 mt-2">
                                {formatDateFull(event.date)}
                              </p>
                            </div>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                )}

                {/* Purchase History Tab */}
                {activeTab === 'purchases' && (
                  <div className="space-y-4">
                    {purchases.length === 0 ? (
                      <div className="text-center py-12 text-slate-400 dark:text-slate-500">
                        <ShoppingBag className="w-10 h-10 mx-auto mb-3 opacity-50" />
                        <p>No purchase history</p>
                      </div>
                    ) : (
                      <>
                        <div className="grid grid-cols-3 gap-4 mb-6">
                          <div className="bg-white dark:bg-slate-800 rounded-xl p-4 border border-slate-200 dark:border-slate-700">
                            <p className="text-xs text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-2">Total Value</p>
                            <p className="text-2xl font-bold text-slate-800 dark:text-white">
                              {formatCurrency(totalPurchases)}
                            </p>
                          </div>
                          <div className="bg-white dark:bg-slate-800 rounded-xl p-4 border border-slate-200 dark:border-slate-700">
                            <p className="text-xs text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-2">Count</p>
                            <p className="text-2xl font-bold text-slate-800 dark:text-white">
                              {purchases.length}
                            </p>
                          </div>
                          <div className="bg-white dark:bg-slate-800 rounded-xl p-4 border border-slate-200 dark:border-slate-700">
                            <p className="text-xs text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-2">Average</p>
                            <p className="text-2xl font-bold text-slate-800 dark:text-white">
                              {formatCurrency(purchases.length > 0 ? totalPurchases / purchases.length : 0)}
                            </p>
                          </div>
                        </div>
                        {purchases.map((purchase) => (
                          <div
                            key={purchase.id}
                            className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-4"
                          >
                            <div className="flex items-center justify-between mb-2">
                              <div className="flex items-center gap-2">
                                <ShoppingBag className="w-4 h-4 text-emerald-500" />
                                <span className="text-sm font-semibold text-slate-800 dark:text-white">
                                  {formatCurrency(purchase.amount)}
                                </span>
                              </div>
                              <span
                                className={`text-xs font-semibold px-2 py-1 rounded-full ${
                                  purchase.status === 'paid'
                                    ? 'bg-emerald-50 text-emerald-600 dark:bg-emerald-900/30 dark:text-emerald-300'
                                    : purchase.status === 'pending'
                                    ? 'bg-amber-50 text-amber-600 dark:bg-amber-900/30 dark:text-amber-300'
                                    : 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300'
                                }`}
                              >
                                {purchase.status}
                              </span>
                            </div>
                            <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
                              <span>{formatDateFull(purchase.purchased_at)}</span>
                              <span>Order</span>
                            </div>
                            {purchase.notes && (
                              <p className="mt-3 text-xs text-slate-600 dark:text-slate-300">{purchase.notes}</p>
                            )}
                          </div>
                        ))}
                      </>
                    )}
                  </div>
                )}

                {/* Returns Tab */}
                {activeTab === 'returns' && (
                  <div className="text-center py-12 text-slate-400 dark:text-slate-500">
                    <Trash2 className="w-10 h-10 mx-auto mb-3 opacity-50" />
                    <p>No returns recorded</p>
                  </div>
                )}

                {/* Inquiries Tab */}
                {activeTab === 'inquiries' && (
                  <div className="space-y-4">
                    {inquiries.length === 0 ? (
                      <div className="text-center py-12 text-slate-400 dark:text-slate-500">
                        <MessageSquare className="w-10 h-10 mx-auto mb-3 opacity-50" />
                        <p>No inquiries</p>
                      </div>
                    ) : (
                      inquiries.map((inquiry) => (
                        <div
                          key={inquiry.id}
                          className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-4"
                        >
                          <div className="flex items-center justify-between mb-2">
                            <h3 className="text-sm font-semibold text-slate-800 dark:text-white">
                              {inquiry.title || 'Inquiry'}
                            </h3>
                            <span className="text-xs text-slate-500 dark:text-slate-400">
                              {formatDate(inquiry.occurred_at)}
                            </span>
                          </div>
                          <p className="text-xs text-slate-500 dark:text-slate-400 mb-2">via {inquiry.channel}</p>
                          {inquiry.notes && (
                            <p className="text-sm text-slate-600 dark:text-slate-300">{inquiry.notes}</p>
                          )}
                        </div>
                      ))
                    )}
                  </div>
                )}

                {/* Calls Tab */}
                {activeTab === 'calls' && (
                  <div className="space-y-4">
                    {callLogs.length === 0 ? (
                      <div className="text-center py-12 text-slate-400 dark:text-slate-500">
                        <Phone className="w-10 h-10 mx-auto mb-3 opacity-50" />
                        <p>No call history</p>
                      </div>
                    ) : (
                      callLogs.map((log) => (
                        <div
                          key={log.id}
                          className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-4"
                        >
                          <div className="flex items-center justify-between mb-2">
                            <div className="flex items-center gap-2">
                              <Phone className="w-4 h-4 text-brand-blue" />
                              <span className="text-sm font-semibold text-slate-800 dark:text-white">
                                {log.channel === 'text' ? 'SMS' : 'Call'}
                              </span>
                            </div>
                            <span className="text-xs text-slate-500 dark:text-slate-400">
                              {formatDate(log.occurred_at)} at {formatTime(log.occurred_at)}
                            </span>
                          </div>
                          <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400 mb-2">
                            <span
                              className={`px-2 py-0.5 rounded-full font-semibold ${
                                log.direction === 'inbound'
                                  ? 'bg-emerald-50 text-emerald-600 dark:bg-emerald-900/30 dark:text-emerald-300'
                                  : 'bg-blue-50 text-blue-600 dark:bg-blue-900/30 dark:text-blue-300'
                              }`}
                            >
                              {log.direction === 'inbound' ? 'Inbound' : 'Outbound'}
                            </span>
                            <span
                              className={`px-2 py-0.5 rounded-full font-semibold ${
                                log.outcome === 'positive'
                                  ? 'bg-emerald-50 text-emerald-600 dark:bg-emerald-900/30 dark:text-emerald-300'
                                  : log.outcome === 'negative'
                                  ? 'bg-rose-50 text-rose-600 dark:bg-rose-900/30 dark:text-rose-300'
                                  : 'bg-amber-50 text-amber-600 dark:bg-amber-900/30 dark:text-amber-300'
                              }`}
                            >
                              {log.outcome?.replace('_', ' ') || 'Logged'}
                            </span>
                          </div>
                          {log.notes && (
                            <p className="text-sm text-slate-600 dark:text-slate-300">{log.notes}</p>
                          )}
                        </div>
                      ))
                    )}
                  </div>
                )}

                {/* Ledger Tab */}
                {activeTab === 'ledger' && (
                  <div className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div className="bg-white dark:bg-slate-800 rounded-xl p-4 border border-slate-200 dark:border-slate-700">
                        <p className="text-xs text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-2">Credit Limit</p>
                        <p className="text-2xl font-bold text-slate-800 dark:text-white">
                          {formatCurrency(contact.creditLimit || 0)}
                        </p>
                      </div>
                      <div className={`rounded-xl p-4 border ${(contact.balance || 0) > 0 ? 'bg-rose-50 dark:bg-rose-900/20 border-rose-200 dark:border-rose-900/50' : 'bg-emerald-50 dark:bg-emerald-900/20 border-emerald-200 dark:border-emerald-900/50'}`}>
                        <p className="text-xs uppercase tracking-wider mb-2 font-semibold" style={{
                          color: (contact.balance || 0) > 0 ? '#dc2626' : '#059669'
                        }}>
                          Outstanding Balance
                        </p>
                        <p className="text-2xl font-bold" style={{
                          color: (contact.balance || 0) > 0 ? '#dc2626' : '#059669'
                        }}>
                          {formatCurrency(contact.balance || 0)}
                        </p>
                      </div>
                    </div>
                    <div className="bg-white dark:bg-slate-800 rounded-xl p-4 border border-slate-200 dark:border-slate-700">
                      <p className="text-sm font-semibold text-slate-800 dark:text-white mb-3">Credit Utilization</p>
                      <div className="w-full h-2 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-gradient-to-r from-emerald-500 to-brand-blue"
                          style={{
                            width: `${Math.min(((contact.balance || 0) / (contact.creditLimit || 1)) * 100, 100)}%`,
                          }}
                        />
                      </div>
                      <p className="text-xs text-slate-500 dark:text-slate-400 mt-2">
                        {Math.round(((contact.balance || 0) / (contact.creditLimit || 1)) * 100)}% utilized
                      </p>
                    </div>
                  </div>
                )}
              </>
            )}
          </div>

          {/* Footer Actions */}
          <div className="p-6 border-t border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 flex-shrink-0 flex items-center justify-between">
            <div className="text-sm text-slate-500 dark:text-slate-400">
              Last updated: {new Date().toLocaleDateString()}
            </div>
            {onCreateInquiry && (
              <button
                onClick={handleCreateInquiry}
                className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-teal-600 text-white text-sm font-semibold shadow-lg shadow-teal-600/20 hover:shadow-teal-600/30 transition-all hover:bg-teal-700"
              >
                <Plus className="w-4 h-4" />
                Create Inquiry
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );

  return createPortal(modal, document.body);
};

export default CustomerProfileModal;
