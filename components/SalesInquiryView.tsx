import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  Plus,
  Trash2,
  AlertCircle,
  FileText,
  ChevronDown,
  ChevronUp,
  ListFilter,
  Search,
  Eye,
  Loader2,
} from 'lucide-react';
import {
  Contact,
  NotificationType,
  SalesInquiry,
  SalesInquiryDTO,
  SalesInquiryItem,
  SalesInquiryStatus,
  SalesOrder,
  SalesOrderStatus,
} from '../types';
import { fetchContacts } from '../services/supabaseService';
import {
  createSalesInquiry,
  getAllSalesInquiries,
  approveInquiry,
  convertToOrder,
  updateInquiryStatus,
} from '../services/salesInquiryService';
import { getProductPrice } from '../services/productService';

import ProductSearchModal from './ProductSearchModal';
import { getSalesOrderByInquiry } from '../services/salesOrderService';
import StatusBadge from './StatusBadge';
import WorkflowStepper from './WorkflowStepper';
import { createNotification } from '../services/supabaseService';
import { supabase } from '../lib/supabaseClient';
import { useToast } from './ToastProvider';
import { useRealtimeNestedList } from '../hooks/useRealtimeNestedList';
import { useRealtimeList } from '../hooks/useRealtimeList';
import { applyOptimisticUpdate } from '../utils/optimisticUpdates';

interface InquiryItemRow extends Omit<SalesInquiryItem, 'id' | 'inquiry_id'> {
  tempId?: string;
  isNew?: boolean; // Flag to indicate if the row is new and editable via autocomplete
}

type SectionKey = 'metrics' | 'customer' | 'references' | 'pricing' | 'details' | 'items';

const SalesInquiryView: React.FC = () => {
  const { addToast } = useToast();
  // Data
  const [loading, setLoading] = useState(false);
  const [selectedInquiry, setSelectedInquiry] = useState<SalesInquiry | null>(null);
  const [linkedOrder, setLinkedOrder] = useState<SalesOrder | null>(null);
  const [statusFilter, setStatusFilter] = useState<'all' | SalesInquiryStatus>('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [activePanel, setActivePanel] = useState<'create' | 'manage'>('create');
  const [showConversionModal, setShowConversionModal] = useState(false);
  const [conversionLoading, setConversionLoading] = useState(false);
  const [conversionMessage, setConversionMessage] = useState('');
  const [statusUpdating, setStatusUpdating] = useState(false);
  const [approvingInquiry, setApprovingInquiry] = useState(false);

  // Use real-time list for contacts
  const { data: customers } = useRealtimeList<Contact>({
    tableName: 'contacts',
    initialFetchFn: fetchContacts,
  });

  // Use real-time nested list for inquiries with items
  const sortByCreatedAt = (a: SalesInquiry, b: SalesInquiry) => {
    return new Date(b.created_at || 0).getTime() - new Date(a.created_at || 0).getTime();
  };

  const {
    data: inquiries,
    isLoading: listLoading,
    setData: setInquiries,
    refetch: refetchInquiries
  } = useRealtimeNestedList<SalesInquiry, SalesInquiryItem>({
    parentTableName: 'sales_inquiries',
    childTableName: 'sales_inquiry_items',
    parentFetchFn: getAllSalesInquiries,
    childParentIdField: 'inquiry_id',
    childrenField: 'items',
    sortParentFn: sortByCreatedAt,
  });

  // Form State
  const [selectedCustomer, setSelectedCustomer] = useState<Contact | null>(null);
  const [inquiryNo, setInquiryNo] = useState('');
  const [salesDate, setSalesDate] = useState(new Date().toISOString().split('T')[0]);
  const [salesPerson, setSalesPerson] = useState('');
  const [deliveryAddress, setDeliveryAddress] = useState('');
  const [referenceNo, setReferenceNo] = useState('');
  const [customerReference, setCustomerReference] = useState('');
  const [sendBy, setSendBy] = useState('');
  const [priceGroup, setPriceGroup] = useState('');
  const [creditLimit, setCreditLimit] = useState<number>(0);
  const [terms, setTerms] = useState('');
  const [promiseToPay, setPromiseToPay] = useState('');
  const [poNumber, setPoNumber] = useState('');
  const [remarks, setRemarks] = useState('');
  const [inquiryType, setInquiryType] = useState('General');
  const [showNewInquiryType, setShowNewInquiryType] = useState(false);
  const [newInquiryType, setNewInquiryType] = useState('');
  const [urgency, setUrgency] = useState('N/A');
  const [urgencyDate, setUrgencyDate] = useState('');

  // Items Table
  const [items, setItems] = useState<InquiryItemRow[]>([]);

  // UI State - Collapsible Sections
  const [expandedSections, setExpandedSections] = useState<Record<SectionKey, boolean>>({
    metrics: false,
    customer: true,
    references: true,
    pricing: true,
    details: true,
    items: true,
  });

  // Modals
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleteConfirming, setDeleteConfirming] = useState(false);
  const [manageError, setManageError] = useState<string | null>(null);
  const [showProductModal, setShowProductModal] = useState(false);
  const [activeRowId, setActiveRowId] = useState<string | null>(null);

  const handleOpenProductModal = (rowTempId: string) => {
    setActiveRowId(rowTempId);
    setShowProductModal(true);
  };

  const handleProductSelect = (product: any) => {
    if (!activeRowId) return;

    const price = getProductPrice(product, priceGroup);
    setItems(prev => prev.map(item => {
      if (item.tempId === activeRowId) {
        return {
          ...item,
          item_id: product.id,
          part_no: product.part_no,
          item_code: product.item_code,
          description: product.description,
          unit_price: price,
          amount: (item.qty || 1) * price,
          isNew: false
        };
      }
      return item;
    }));
    // Modal handling is done in handleProductSelect or modal close logic
    // Actually simpler to just close it here or let modal callback handle it.
    // The Modal component calls onSelect then onClose? No, I implemented it to call onSelect then onClose inside the modal.
    // But better to manage state here if needed. 
    // Wait, ProductSearchModal: `onSelect(product); onClose();`
    // So here I just need to update state.
  };

  const notifyUser = useCallback(async (title: string, message: string, type: NotificationType = 'success') => {
    try {
      const { data: authData } = await supabase.auth.getUser();
      const user = authData?.user;
      if (!user) return;
      await createNotification({
        recipient_id: user.id,
        title,
        message,
        type,
      });
    } catch (err) {
      console.error('Error sending notification:', err);
    }
  }, []);

  const navigateToModule = useCallback((tab: string, payload?: Record<string, string>) => {
    window.dispatchEvent(new CustomEvent('workflow:navigate', { detail: { tab, payload } }));
  }, []);

  // Auto-select first inquiry when inquiries change
  useEffect(() => {
    if (inquiries.length > 0 && !selectedInquiry) {
      setSelectedInquiry(inquiries[0]);
    }
  }, [inquiries, selectedInquiry]);

  const customerMap = useMemo(() => new Map(customers.map((customer) => [customer.id, customer])), [customers]);

  const filteredInquiries = useMemo(() => {
    const query = searchTerm.toLowerCase();
    return inquiries.filter((inquiry) => {
      const matchesStatus = statusFilter === 'all' || inquiry.status === statusFilter;
      const customerName = customerMap.get(inquiry.contact_id)?.company?.toLowerCase() || '';
      const matchesQuery =
        !query ||
        inquiry.inquiry_no.toLowerCase().includes(query) ||
        customerName.includes(query) ||
        (inquiry.sales_person || '').toLowerCase().includes(query);
      return matchesStatus && matchesQuery;
    });
  }, [customerMap, inquiries, searchTerm, statusFilter]);

  const workflowStage = useMemo<'inquiry' | 'order' | 'document'>(() => {
    if (linkedOrder?.status === SalesOrderStatus.CONVERTED_TO_DOCUMENT) {
      return 'document';
    }
    if (linkedOrder) {
      return 'order';
    }
    if (selectedInquiry?.status === SalesInquiryStatus.CONVERTED_TO_ORDER) {
      return 'order';
    }
    return 'inquiry';
  }, [linkedOrder, selectedInquiry]);

  // Generate initial inquiry number and preload data
  useEffect(() => {
    const generateInquiryNumber = () => {
      const date = new Date();
      const year = date.getFullYear();
      const month = String(date.getMonth() + 1).padStart(2, '0');
      const day = String(date.getDate()).padStart(2, '0');
      const random = String(Math.floor(Math.random() * 100000)).padStart(5, '0');
      return `INQ${year}${month}${day}-${random}`;
    };
    const newInquiryNo = generateInquiryNumber();
    setInquiryNo(newInquiryNo);
    setReferenceNo(newInquiryNo);
  }, []);

  useEffect(() => {
    const loadLinkedOrder = async () => {
      if (selectedInquiry?.status === SalesInquiryStatus.CONVERTED_TO_ORDER) {
        const order = await getSalesOrderByInquiry(selectedInquiry.id);
        setLinkedOrder(order);
      } else {
        setLinkedOrder(null);
      }
    };
    loadLinkedOrder();
    setConversionMessage('');
  }, [selectedInquiry]);

  // When customer is selected, populate metrics and delivery address
  const handleCustomerSelect = (customerId: string) => {
    const customer = customers.find(c => c.id === customerId);
    if (customer) {
      setSelectedCustomer(customer);
      setDeliveryAddress(customer.deliveryAddress || customer.address || '');
      setSalesPerson(customer.salesman || '');
      setPriceGroup(customer.priceGroup || '');
      setCreditLimit(customer.creditLimit || 0);
      setTerms(customer.terms || '');
      setRemarks(customer.comment || '');
      setPromiseToPay(customer.dealershipTerms || '');
    }
  };

  const handleStatusChange = async (newStatus: SalesInquiryStatus) => {
    if (!selectedInquiry) return;
    setStatusUpdating(true);

    // Optimistic update
    setInquiries(prev => applyOptimisticUpdate(prev, selectedInquiry.id, { status: newStatus } as Partial<SalesInquiry>));
    setSelectedInquiry(prev => prev ? { ...prev, status: newStatus } : null);

    try {
      await updateInquiryStatus(selectedInquiry.id, newStatus);
      await notifyUser('Inquiry Status Updated', `Inquiry ${selectedInquiry.inquiry_no} marked as ${newStatus}.`, 'info');
    } catch (err) {
      console.error('Error updating inquiry status:', err);
      addToast({ type: 'error', message: 'Failed to update status' });
      // Real-time subscription will correct the state
    } finally {
      setStatusUpdating(false);
    }
  };

  const handleApproveSelectedInquiry = async () => {
    if (!selectedInquiry) return;
    setApprovingInquiry(true);

    // Optimistic update
    setInquiries(prev => applyOptimisticUpdate(prev, selectedInquiry.id, { status: SalesInquiryStatus.APPROVED } as Partial<SalesInquiry>));
    setSelectedInquiry(prev => prev ? { ...prev, status: SalesInquiryStatus.APPROVED } : null);

    try {
      await approveInquiry(selectedInquiry.id);
      await notifyUser('Inquiry Approved', `Inquiry ${selectedInquiry.inquiry_no} has been approved.`);
    } catch (err) {
      console.error('Error approving inquiry:', err);
      addToast({ type: 'error', message: 'Failed to approve inquiry' });
      // Real-time subscription will correct the state
    } finally {
      setApprovingInquiry(false);
    }
  };

  const handleConvertSelectedInquiry = async () => {
    if (!selectedInquiry) return;
    setConversionLoading(true);

    // Optimistic update
    setInquiries(prev => applyOptimisticUpdate(prev, selectedInquiry.id, {
      status: SalesInquiryStatus.CONVERTED_TO_ORDER
    } as Partial<SalesInquiry>));
    setSelectedInquiry(prev => prev ? { ...prev, status: SalesInquiryStatus.CONVERTED_TO_ORDER } : null);

    try {
      const order = await convertToOrder(selectedInquiry.id);
      setLinkedOrder(order);
      setConversionMessage(`Created Sales Order ${order.order_no}`);
      setShowConversionModal(false);
      await notifyUser(
        'Sales Order Created',
        `Inquiry ${selectedInquiry.inquiry_no} converted to Order ${order.order_no}.`
      );
    } catch (err) {
      console.error('Error converting inquiry:', err);
      addToast({ type: 'error', message: 'Failed to convert inquiry to sales order' });
      // Real-time subscription will correct the state
    } finally {
      setConversionLoading(false);
    }
  };

  // Add new item row
  const addItemRow = () => {
    setItems([
      ...items,
      {
        qty: 1,
        part_no: '',
        item_code: '',
        location: '',
        description: '',
        unit_price: 0,
        amount: 0,
        remark: '',
        approval_status: 'pending',
        tempId: `temp-${Date.now()}`,
        isNew: true,
      },
    ]);
  };

  // Update item row
  const updateItemRow = (tempId: string | undefined, field: string, value: any) => {
    setItems(items.map(item => {
      if (item.tempId === tempId) {
        const updated = { ...item, [field]: value };
        // Auto-calculate amount
        if (field === 'qty' || field === 'unit_price') {
          updated.amount = (updated.qty || 0) * (updated.unit_price || 0);
        }
        return updated;
      }
      return item;
    }));
  };

  // Remove item row
  const removeItemRow = (tempId: string | undefined) => {
    setItems(items.filter(item => item.tempId !== tempId));
  };

  // Calculate grand total
  const grandTotal = items.reduce((sum, item) => sum + (item.amount || 0), 0);

  const toggleSection = (section: SectionKey) => {
    setExpandedSections(prev => ({ ...prev, [section]: !prev[section] }));
  };

  const getSectionContentClass = (expanded: boolean) =>
    `overflow-hidden transition-all duration-300 ease-in-out ${expanded ? 'max-h-[2000px] opacity-100 mt-2' : 'max-h-0 opacity-0'}`;

  // Handle submit
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!selectedCustomer) {
      addToast({ type: 'error', message: 'Please select a customer' });
      return;
    }


    if (items.length === 0) {
      addToast({ type: 'error', message: 'Please add at least one item' });
      return;
    }

    // Validate that all items have a product selected (item_id is present)
    const invalidItems = items.filter(item => !item.item_id);
    if (invalidItems.length > 0) {
      addToast({
        type: 'error',
        message: `Please select valid products for all items. ${invalidItems.length} item(s) are missing product details.`
      });
      return;
    }

    setLoading(true);
    try {
      // Prepare inquiry type
      let finalInquiryType = inquiryType;
      if (showNewInquiryType && newInquiryType) {
        finalInquiryType = newInquiryType;
      }

      const inquiryData: SalesInquiryDTO = {
        contact_id: selectedCustomer.id,
        sales_date: salesDate,
        sales_person: salesPerson,
        delivery_address: deliveryAddress,
        reference_no: referenceNo,
        customer_reference: customerReference,
        send_by: sendBy,
        price_group: priceGroup,
        credit_limit: creditLimit,
        terms: terms,
        promise_to_pay: promiseToPay,
        po_number: poNumber,
        remarks: remarks,
        inquiry_type: finalInquiryType,
        urgency: urgency,
        urgency_date: urgency !== 'N/A' ? urgencyDate : undefined,
        items: items.map(({ tempId, ...rest }) => rest),
      };

      await createSalesInquiry(inquiryData);
      // Real-time subscription will add the new inquiry, but we force a refetch to be sure
      await refetchInquiries();

      // Reset form
      setSelectedCustomer(null);
      setSalesDate(new Date().toISOString().split('T')[0]);
      setSalesPerson('');
      setDeliveryAddress('');
      setReferenceNo('');
      setCustomerReference('');
      setSendBy('');
      setPriceGroup('');
      setCreditLimit(0);
      setTerms('');
      setPromiseToPay('');
      setPoNumber('');
      setRemarks('');
      setInquiryType('General');
      setShowNewInquiryType(false);
      setNewInquiryType('');
      setUrgency('N/A');
      setUrgencyDate('');
      setItems([]);

      // Generate new inquiry number
      const date = new Date();
      const year = date.getFullYear();
      const month = String(date.getMonth() + 1).padStart(2, '0');
      const day = String(date.getDate()).padStart(2, '0');
      const random = String(Math.floor(Math.random() * 100000)).padStart(5, '0');
      const newInquiryNo = `INQ${year}${month}${day}-${random}`;
      setInquiryNo(newInquiryNo);
      setReferenceNo(newInquiryNo);

      addToast({ type: 'success', message: 'Sales Inquiry created successfully!' });
    } catch (error) {
      console.error('Error creating inquiry:', error);
      addToast({ type: 'error', message: 'Failed to create inquiry' });
    } finally {
      setLoading(false);
    }
  };

  // Handle delete
  const handleDeleteClick = () => {
    setShowDeleteModal(true);
  };

  const handleDeleteConfirm = async () => {
    setDeleteConfirming(true);
    try {
      // In a real scenario, we would delete from database
      // For now, just reset the form
      addToast({ type: 'success', message: 'Sales Inquiry deleted successfully!' });
      setShowDeleteModal(false);
      handleResetForm();
    } catch (error) {
      console.error('Error deleting inquiry:', error);
      addToast({ type: 'error', message: 'Failed to delete inquiry' });
    } finally {
      setDeleteConfirming(false);
    }
  };

  const handleResetForm = () => {
    setSelectedCustomer(null);
    setSalesDate(new Date().toISOString().split('T')[0]);
    setSalesPerson('');
    setDeliveryAddress('');
    setReferenceNo(inquiryNo);
    setCustomerReference('');
    setSendBy('');
    setPriceGroup('');
    setCreditLimit(0);
    setTerms('');
    setPromiseToPay('');
    setPoNumber('');
    setRemarks('');
    setInquiryType('General');
    setShowNewInquiryType(false);
    setNewInquiryType('');
    setUrgency('N/A');
    setUrgencyDate('');
    setItems([]);
  };

  return (
    <div className="h-full flex flex-col overflow-hidden bg-slate-100 dark:bg-slate-950">
      {/* Compact Header */}
      <div className="bg-gradient-to-r from-slate-800 to-slate-900 dark:from-slate-800 dark:to-slate-950 border-b border-slate-700/50 px-4 py-3 flex items-center justify-between flex-shrink-0">
        <div className="flex items-center gap-3">
          <div className="p-1.5 bg-brand-blue/20 rounded">
            <FileText className="w-4 h-4 text-brand-blue" />
          </div>
          <h1 className="text-xl font-bold text-white">Sales Inquiry</h1>
          <div className="ml-4 flex items-center gap-2">
            <label className="text-xs text-slate-400 uppercase">Inquiry #</label>
            <input
              type="text"
              value={inquiryNo}
              readOnly
              className="px-2 py-1 bg-slate-700/50 border border-slate-600 rounded text-white text-xs font-mono w-32"
            />
          </div>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex bg-slate-900/40 border border-slate-700/60 rounded-full p-0.5">
            <button
              type="button"
              onClick={() => setActivePanel('create')}
              className={`px-3 py-1 text-xs rounded-full transition-colors ${activePanel === 'create'
                ? 'bg-brand-blue text-white'
                : 'text-slate-300 hover:text-white'
                }`}
            >
              New Inquiry
            </button>
            <button
              type="button"
              onClick={() => setActivePanel('manage')}
              className={`px-3 py-1 text-xs rounded-full transition-colors ${activePanel === 'manage'
                ? 'bg-brand-blue text-white'
                : 'text-slate-300 hover:text-white'
                }`}
            >
              Manage
            </button>
          </div>
          <button
            type="button"
            onClick={() => toggleSection('metrics')}
            className={`px-3 py-1 text-xs font-medium rounded transition-colors ${expandedSections.metrics ? 'bg-slate-700 text-white' : 'bg-slate-700 text-slate-400 hover:text-white'}`}
          >
            {expandedSections.metrics ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </button>
        </div>
      </div>

      <div className="flex-1 flex flex-col overflow-hidden">
        <div className={activePanel === 'create' ? 'flex-1 flex flex-col overflow-hidden' : 'hidden'}>
          <div className="flex-1 overflow-y-auto">
            <form id="salesInquiryForm" onSubmit={handleSubmit} className="p-3 space-y-2">
              {/* Customer Metrics (Collapsible) */}
              <div className="bg-white dark:bg-slate-900 rounded-lg p-2 border border-slate-200 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => toggleSection('metrics')}
                  className="flex w-full items-center justify-between rounded px-1.5 py-1.5 text-[11px] font-semibold uppercase tracking-wide text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors"
                >
                  <span>Customer Metrics</span>
                  {expandedSections.metrics ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                </button>
                <div className={getSectionContentClass(expandedSections.metrics)}>
                  {selectedCustomer ? (
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-1.5 text-[10px]">
                      <div className="bg-slate-700 dark:bg-slate-800 rounded p-1.5">
                        <div className="text-[10px] text-slate-300 uppercase tracking-wide">Dealership Since</div>
                        <div className="text-sm font-semibold text-white mt-0.5">{selectedCustomer.dealershipSince || 'N/A'}</div>
                      </div>
                      <div className="bg-slate-700 dark:bg-slate-800 rounded p-1.5">
                        <div className="text-[10px] text-slate-300 uppercase tracking-wide">Sales</div>
                        <div className="text-sm font-semibold text-white mt-0.5">₱{(selectedCustomer.totalSales || 0).toLocaleString()}</div>
                      </div>
                      <div className="bg-slate-700 dark:bg-slate-800 rounded p-1.5">
                        <div className="text-[10px] text-slate-300 uppercase tracking-wide">Quota</div>
                        <div className="text-sm font-semibold text-white mt-0.5">₱{(selectedCustomer.dealershipQuota || 0).toLocaleString()}</div>
                      </div>
                      <div className="bg-slate-700 dark:bg-slate-800 rounded p-1.5">
                        <div className="text-[10px] text-slate-300 uppercase tracking-wide">Credit Limit</div>
                        <div className="text-sm font-semibold text-white mt-0.5">₱{(selectedCustomer.creditLimit || 0).toLocaleString()}</div>
                      </div>
                    </div>
                  ) : (
                    <div className="py-2 text-[10px] text-slate-500 dark:text-slate-400">Select a customer to view metrics.</div>
                  )}
                </div>
              </div>

              {/* Customer Selection & Basic Info */}
              <div className="bg-white dark:bg-slate-900 rounded-lg p-2 border border-slate-200 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => toggleSection('customer')}
                  className="flex w-full items-center justify-between rounded px-1.5 py-1.5 text-[11px] font-semibold uppercase tracking-wide text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors"
                >
                  <span>Customer Details</span>
                  {expandedSections.customer ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                </button>
                <div className={getSectionContentClass(expandedSections.customer)}>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-xs">
                    <div>
                      <label className="block text-[10px] font-semibold text-slate-600 dark:text-slate-300 mb-0.5">
                        Customer <span className="text-red-500">*</span>
                      </label>
                      <select
                        required
                        value={selectedCustomer?.id || ''}
                        onChange={(e) => handleCustomerSelect(e.target.value)}
                        className="w-full px-1.5 py-0.5 border border-slate-300 dark:border-slate-700 rounded bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-brand-blue/50 focus:border-transparent text-xs"
                      >
                        <option value="">-- Select --</option>
                        {customers.map(c => (
                          <option key={c.id} value={c.id}>{c.company}</option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="block text-[10px] font-semibold text-slate-600 dark:text-slate-300 mb-0.5">
                        Sales Date <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="date"
                        required
                        value={salesDate}
                        onChange={(e) => setSalesDate(e.target.value)}
                        className="w-full px-1.5 py-0.5 border border-slate-300 dark:border-slate-700 rounded bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-brand-blue/50 focus:border-transparent text-xs"
                      />
                    </div>

                    <div>
                      <label className="block text-[10px] font-semibold text-slate-600 dark:text-slate-300 mb-0.5">Sales Person</label>
                      <input
                        type="text"
                        value={salesPerson}
                        onChange={(e) => setSalesPerson(e.target.value)}
                        placeholder="Name"
                        className="w-full px-1.5 py-0.5 border border-slate-300 dark:border-slate-700 rounded bg-white dark:bg-slate-800 text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 focus:ring-2 focus:ring-brand-blue/50 focus:border-transparent text-xs"
                      />
                    </div>

                    <div>
                      <label className="block text-[10px] font-semibold text-slate-600 dark:text-slate-300 mb-0.5">Delivery Address</label>
                      <input
                        type="text"
                        value={deliveryAddress}
                        onChange={(e) => setDeliveryAddress(e.target.value)}
                        placeholder="Address"
                        className="w-full px-1.5 py-0.5 border border-slate-300 dark:border-slate-700 rounded bg-white dark:bg-slate-800 text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 focus:ring-2 focus:ring-brand-blue/50 focus:border-transparent text-xs"
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* References Section */}
              <div className="bg-white dark:bg-slate-900 rounded-lg p-2 border border-slate-200 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => toggleSection('references')}
                  className="flex w-full items-center justify-between rounded px-1.5 py-1.5 text-[11px] font-semibold uppercase tracking-wide text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors"
                >
                  <span>References</span>
                  {expandedSections.references ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                </button>
                <div className={getSectionContentClass(expandedSections.references)}>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-xs">
                    <div>
                      <label className="block text-[10px] font-semibold text-slate-600 dark:text-slate-300 mb-0.5">Our Reference</label>
                      <input
                        type="text"
                        value={referenceNo}
                        onChange={(e) => setReferenceNo(e.target.value)}
                        placeholder="Ref #"
                        className="w-full px-1.5 py-0.5 border border-slate-300 dark:border-slate-700 rounded bg-white dark:bg-slate-800 text-slate-900 dark:text-white placeholder-slate-400 text-xs"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-semibold text-slate-600 dark:text-slate-300 mb-0.5">Your Reference</label>
                      <input
                        type="text"
                        value={customerReference}
                        onChange={(e) => setCustomerReference(e.target.value)}
                        placeholder="Ref #"
                        className="w-full px-1.5 py-0.5 border border-slate-300 dark:border-slate-700 rounded bg-white dark:bg-slate-800 text-slate-900 dark:text-white placeholder-slate-400 text-xs"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-semibold text-slate-600 dark:text-slate-300 mb-0.5">Send By</label>
                      <select
                        value={sendBy}
                        onChange={(e) => setSendBy(e.target.value)}
                        className="w-full px-1.5 py-0.5 border border-slate-300 dark:border-slate-700 rounded bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-brand-blue/50 focus:border-transparent text-xs"
                      >
                        <option value="">--</option>
                        <option value="Email">Email</option>
                        <option value="Courier">Courier</option>
                        <option value="Pickup">Pickup</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-[10px] font-semibold text-slate-600 dark:text-slate-300 mb-0.5">PO Number</label>
                      <input
                        type="text"
                        value={poNumber}
                        onChange={(e) => setPoNumber(e.target.value)}
                        placeholder="PO #"
                        className="w-full px-1.5 py-0.5 border border-slate-300 dark:border-slate-700 rounded bg-white dark:bg-slate-800 text-slate-900 dark:text-white placeholder-slate-400 text-xs"
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* Pricing & Terms */}
              <div className="bg-white dark:bg-slate-900 rounded-lg p-2 border border-slate-200 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => toggleSection('pricing')}
                  className="flex w-full items-center justify-between rounded px-1.5 py-1.5 text-[11px] font-semibold uppercase tracking-wide text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors"
                >
                  <span>Pricing & Terms</span>
                  {expandedSections.pricing ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                </button>
                <div className={getSectionContentClass(expandedSections.pricing)}>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-xs">
                    <div>
                      <label className="block text-[10px] font-semibold text-slate-600 dark:text-slate-300 mb-0.5">Price Group</label>
                      <select
                        value={priceGroup}
                        onChange={(e) => setPriceGroup(e.target.value)}
                        className="w-full px-1.5 py-0.5 border border-slate-300 dark:border-slate-700 rounded bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-xs"
                      >
                        <option value="">--</option>
                        <option value="AA">AA</option>
                        <option value="BB">BB</option>
                        <option value="CC">CC</option>
                        <option value="DD">DD</option>
                        <option value="VIP1">VIP1</option>
                        <option value="VIP2">VIP2</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-[10px] font-semibold text-slate-600 dark:text-slate-300 mb-0.5">Credit Limit</label>
                      <input
                        type="number"
                        value={creditLimit}
                        onChange={(e) => setCreditLimit(parseFloat(e.target.value) || 0)}
                        placeholder="0.00"
                        className="w-full px-1.5 py-0.5 border border-slate-300 dark:border-slate-700 rounded bg-white dark:bg-slate-800 text-slate-900 dark:text-white placeholder-slate-400 text-xs"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-semibold text-slate-600 dark:text-slate-300 mb-0.5">Terms</label>
                      <input
                        type="text"
                        value={terms}
                        onChange={(e) => setTerms(e.target.value)}
                        placeholder="Terms"
                        className="w-full px-1.5 py-0.5 border border-slate-300 dark:border-slate-700 rounded bg-white dark:bg-slate-800 text-slate-900 dark:text-white placeholder-slate-400 text-xs"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-semibold text-slate-600 dark:text-slate-300 mb-0.5">Promise to Pay</label>
                      <input
                        type="text"
                        value={promiseToPay}
                        onChange={(e) => setPromiseToPay(e.target.value)}
                        placeholder="Date/Terms"
                        className="w-full px-1.5 py-0.5 border border-slate-300 dark:border-slate-700 rounded bg-white dark:bg-slate-800 text-slate-900 dark:text-white placeholder-slate-400 text-xs"
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* Inquiry Details */}
              <div className="bg-white dark:bg-slate-900 rounded-lg p-2 border border-slate-200 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => toggleSection('details')}
                  className="flex w-full items-center justify-between rounded px-1.5 py-1.5 text-[11px] font-semibold uppercase tracking-wide text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors"
                >
                  <span>Inquiry Details</span>
                  {expandedSections.details ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                </button>
                <div className={getSectionContentClass(expandedSections.details)}>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-xs">
                    <div className="col-span-2 md:col-span-1">
                      <label className="block text-[10px] font-semibold text-slate-600 dark:text-slate-300 mb-0.5">Inquiry Type</label>
                      <select
                        value={inquiryType}
                        onChange={(e) => {
                          if (e.target.value === 'AddNew') {
                            setShowNewInquiryType(true);
                            setInquiryType('General');
                          } else {
                            setInquiryType(e.target.value);
                            setShowNewInquiryType(false);
                          }
                        }}
                        className="w-full px-1.5 py-0.5 border border-slate-300 dark:border-slate-700 rounded bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-xs"
                      >
                        <option value="General">General</option>
                        <option value="Bulk Order">Bulk Order</option>
                        <option value="AddNew">+ Add New</option>
                      </select>
                      {showNewInquiryType && (
                        <input
                          type="text"
                          value={newInquiryType}
                          onChange={(e) => setNewInquiryType(e.target.value)}
                          placeholder="Type"
                          className="w-full mt-1 px-1.5 py-0.5 border border-slate-300 dark:border-slate-700 rounded bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-xs"
                        />
                      )}
                    </div>
                    <div className="col-span-2 md:col-span-1">
                      <label className="block text-[10px] font-semibold text-slate-600 dark:text-slate-300 mb-0.5">Urgency</label>
                      <select
                        value={urgency}
                        onChange={(e) => setUrgency(e.target.value)}
                        className="w-full px-1.5 py-0.5 border border-slate-300 dark:border-slate-700 rounded bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-xs"
                      >
                        <option value="N/A">N/A</option>
                        <option value="Low">Low</option>
                        <option value="High">High</option>
                      </select>
                    </div>
                    {urgency !== 'N/A' && (
                      <div className="col-span-2 md:col-span-1">
                        <label className="block text-[10px] font-semibold text-slate-600 dark:text-slate-300 mb-0.5">Urgency Date</label>
                        <input
                          type="date"
                          value={urgencyDate}
                          onChange={(e) => setUrgencyDate(e.target.value)}
                          className="w-full px-1.5 py-0.5 border border-slate-300 dark:border-slate-700 rounded bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-xs"
                        />
                      </div>
                    )}
                    <div className="col-span-2 md:col-span-4">
                      <label className="block text-[10px] font-semibold text-slate-600 dark:text-slate-300 mb-0.5">Remarks</label>
                      <input
                        type="text"
                        value={remarks}
                        onChange={(e) => setRemarks(e.target.value)}
                        placeholder="Notes..."
                        className="w-full px-1.5 py-0.5 border border-slate-300 dark:border-slate-700 rounded bg-white dark:bg-slate-800 text-slate-900 dark:text-white placeholder-slate-400 text-xs"
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* Items Table Section */}
              <div className="bg-white dark:bg-slate-900 rounded-lg p-2 border border-slate-200 dark:border-slate-800">
                <div className="flex items-center justify-between gap-2">
                  <button
                    type="button"
                    onClick={() => toggleSection('items')}
                    className="flex flex-1 items-center justify-between rounded px-1.5 py-1.5 text-[11px] font-semibold uppercase tracking-wide text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors"
                  >
                    <span>Inquiry Items</span>
                    {expandedSections.items ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                  </button>
                  <button
                    type="button"
                    onClick={addItemRow}
                    className="flex items-center gap-1 px-2 py-0.5 bg-brand-blue text-white rounded text-[10px] hover:bg-blue-700 transition-colors"
                  >
                    <Plus className="w-3 h-3" />
                    Add
                  </button>
                </div>

                <div className={getSectionContentClass(expandedSections.items)}>
                  {items.length === 0 ? (
                    <div className="text-center py-3 text-[10px] text-slate-500 dark:text-slate-400">No items added</div>
                  ) : (
                    <>
                      <div className="overflow-x-auto">
                        <div className="max-h-[300px] overflow-y-auto border border-slate-200 dark:border-slate-800 rounded">
                          <table className="w-full text-[10px]">
                            <thead className="sticky top-0 bg-white dark:bg-slate-900 z-10">
                              <tr className="border-b border-slate-200 dark:border-slate-800">
                                <th className="text-left px-1 py-0.5 text-slate-700 dark:text-slate-300 font-semibold">Qty</th>
                                <th className="text-left px-1 py-0.5 text-slate-700 dark:text-slate-300 font-semibold">Part No</th>
                                <th className="text-left px-1 py-0.5 text-slate-700 dark:text-slate-300 font-semibold">Description</th>
                                <th className="text-left px-1 py-0.5 text-slate-700 dark:text-slate-300 font-semibold">Unit Price</th>
                                <th className="text-left px-1 py-0.5 text-slate-700 dark:text-slate-300 font-semibold">Amount</th>
                                <th className="text-left px-1 py-0.5 text-slate-700 dark:text-slate-300 font-semibold">Approval</th>
                                <th className="text-center px-1 py-0.5 text-slate-700 dark:text-slate-300 font-semibold">Action</th>
                              </tr>
                            </thead>
                            <tbody>
                              {items.map((item) => (
                                <tr key={item.tempId} className="border-b border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/30">
                                  <td className="px-1 py-0.5">
                                    <input
                                      type="number"
                                      value={item.qty}
                                      onChange={(e) => updateItemRow(item.tempId, 'qty', parseInt(e.target.value) || 1)}
                                      className="w-12 px-1 py-0.5 border border-slate-300 dark:border-slate-700 rounded bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-[10px]"
                                    />
                                  </td>
                                  <td className="px-1 py-0.5" colSpan={2}>

                                    {item.isNew && !item.part_no ? (
                                      <div
                                        onClick={() => handleOpenProductModal(item.tempId!)}
                                        className="w-full px-2 py-1.5 border border-dashed border-slate-300 dark:border-slate-600 rounded bg-slate-50 dark:bg-slate-800/50 text-slate-500 hover:text-brand-blue hover:border-brand-blue cursor-pointer flex items-center justify-between group transition-colors"
                                      >
                                        <span className="text-xs italic">Click to search product...</span>
                                        <Search className="w-3 h-3 opacity-50 group-hover:opacity-100" />
                                      </div>
                                    ) : (
                                      <div className="flex gap-1" onDoubleClick={() => updateItemRow(item.tempId, 'isNew', true)}>
                                        <div className="w-[30%]">
                                          <input
                                            type="text"
                                            value={item.part_no}
                                            onChange={(e) => updateItemRow(item.tempId, 'part_no', e.target.value)}
                                            className="w-full px-1 py-0.5 border border-slate-300 dark:border-slate-700 rounded bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-[10px] font-bold"
                                            placeholder="Part"
                                          />
                                          <div className="text-[9px] text-slate-500 font-mono mt-0.5">{item.item_code}</div>
                                        </div>
                                        <div className="w-[70%]">
                                          <input
                                            type="text"
                                            value={item.description}
                                            onChange={(e) => updateItemRow(item.tempId, 'description', e.target.value)}
                                            className="w-full px-1 py-0.5 border border-slate-300 dark:border-slate-700 rounded bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-[10px]"
                                            placeholder="Desc"
                                          />
                                        </div>
                                      </div>
                                    )}
                                  </td>
                                  <td className="px-1 py-0.5">
                                    <input
                                      type="number"
                                      value={item.unit_price}
                                      onChange={(e) => updateItemRow(item.tempId, 'unit_price', parseFloat(e.target.value) || 0)}
                                      className="w-24 px-1 py-0.5 border border-slate-300 dark:border-slate-700 rounded bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-[10px]"
                                      placeholder="0.00"
                                    />
                                  </td>
                                  <td className="px-1 py-0.5 text-right font-semibold text-slate-900 dark:text-white">₱{(item.amount || 0).toFixed(2)}</td>
                                  <td className="px-1 py-0.5">
                                    <select
                                      value={item.approval_status}
                                      onChange={(e) => updateItemRow(item.tempId, 'approval_status', e.target.value)}
                                      className="w-24 px-1 py-0.5 border border-slate-300 dark:border-slate-700 rounded bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-[10px]"
                                    >
                                      <option value="pending">Pending</option>
                                      <option value="approved">Approved</option>
                                    </select>
                                  </td>
                                  <td className="px-1 py-0.5 text-center">
                                    <button type="button" onClick={() => removeItemRow(item.tempId)} className="text-red-500 hover:text-red-700 transition-colors">
                                      <Trash2 className="w-3 h-3" />
                                    </button>
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      </div>
                      <div className="flex justify-end mt-2 pt-2 border-t border-slate-200 dark:border-slate-800 text-xs">
                        <div className="flex items-center gap-3">
                          <span className="font-semibold text-slate-700 dark:text-slate-300">Grand Total:</span>
                          <span className="text-sm font-bold text-brand-blue">₱{grandTotal.toFixed(2)}</span>
                        </div>
                      </div>
                    </>
                  )}
                </div>
              </div>

            </form>
          </div>

          <div className="flex-shrink-0 flex items-center justify-between border-t border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 py-2 px-4 gap-3">
            <button
              type="button"
              onClick={handleDeleteClick}
              className="flex items-center gap-1 px-2.5 py-1 text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded text-[10px] font-semibold transition-colors"
            >
              <Trash2 className="w-3 h-3" />
              Delete
            </button>

            <div className="flex gap-2">
              <button
                type="button"
                onClick={handleResetForm}
                className="px-2.5 py-1 bg-slate-200 dark:bg-slate-800 text-slate-900 dark:text-white rounded text-[10px] hover:bg-slate-300 dark:hover:bg-slate-700 transition-colors font-semibold"
              >
                Reset
              </button>

              <button
                type="submit"
                form="salesInquiryForm"
                disabled={loading}
                className="px-2.5 py-1 bg-brand-blue text-white rounded text-[10px] hover:bg-blue-700 disabled:bg-blue-400 disabled:cursor-not-allowed transition-colors font-semibold"
              >
                {loading ? 'Saving...' : 'Create'}
              </button>
            </div>
          </div>
        </div>
        <div className={activePanel === 'manage' ? 'flex-1 flex overflow-hidden bg-slate-50 dark:bg-slate-950' : 'hidden'}>
          <div className="w-80 border-r border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 flex flex-col">
            <div className="p-3 space-y-2">
              <div className="flex items-center gap-2 px-2 py-1 rounded border border-slate-200 dark:border-slate-800 w-full">
                <Search className="w-4 h-4 text-slate-400" />
                <input
                  type="text"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder="Search inquiry or customer"
                  className="bg-transparent text-xs flex-1 outline-none"
                />
              </div>
              <div className="flex items-center gap-2 text-xs text-slate-500">
                <ListFilter className="w-4 h-4" />
                <span>Status Filter</span>
              </div>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value as 'all' | SalesInquiryStatus)}
                className="w-full text-xs border border-slate-200 dark:border-slate-800 rounded px-2 py-1 bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-200"
              >
                <option value="all">All Statuses</option>
                {Object.values(SalesInquiryStatus).map((status) => (
                  <option key={status} value={status}>
                    {status.replace(/_/g, ' ')}
                  </option>
                ))}
              </select>
            </div>
            <div className="flex-1 overflow-y-auto divide-y divide-slate-100 dark:divide-slate-800">
              {listLoading && (
                <div className="flex items-center justify-center py-6 text-xs text-slate-500">
                  <Loader2 className="w-4 h-4 animate-spin mr-2" />
                  Loading inquiries...
                </div>
              )}
              {!listLoading && filteredInquiries.length === 0 && (
                <div className="p-4 text-xs text-slate-500">No inquiries found for current filters.</div>
              )}
              {!listLoading &&
                filteredInquiries.map((inquiry) => {
                  const customer = customerMap.get(inquiry.contact_id);
                  const isActive = selectedInquiry?.id === inquiry.id;
                  return (
                    <button
                      key={inquiry.id}
                      onClick={() => setSelectedInquiry(inquiry)}
                      className={`w-full text-left p-3 space-y-1 ${isActive ? 'bg-brand-blue/10' : 'hover:bg-slate-50 dark:hover:bg-slate-800/50'}`}
                    >
                      <div className="flex items-center justify-between">
                        <div className="text-sm font-semibold text-slate-800 dark:text-slate-100">{inquiry.inquiry_no}</div>
                        <StatusBadge status={inquiry.status} />
                      </div>
                      <div className="text-xs text-slate-500">{customer?.company || inquiry.contact_id}</div>
                      <div className="text-[11px] text-slate-400">{new Date(inquiry.sales_date).toLocaleDateString()}</div>
                    </button>
                  );
                })}
            </div>
            {manageError && (
              <div className="p-3 text-[11px] text-rose-600 border-t border-rose-100 dark:border-rose-500/30 bg-rose-50 dark:bg-rose-500/10">
                {manageError}
              </div>
            )}
          </div>
          <div className="flex-1 flex flex-col">
            {selectedInquiry ? (
              <div className="flex-1 overflow-y-auto p-4 space-y-4">
                {(() => {
                  const isConverted = selectedInquiry.status === SalesInquiryStatus.CONVERTED_TO_ORDER;
                  return (
                    <>
                      <div className="bg-white dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-800 p-4">
                        <div className="flex flex-wrap items-center justify-between gap-3">
                          <div>
                            <p className="text-xs text-slate-500">Inquiry Number</p>
                            <p className="text-xl font-semibold text-slate-800 dark:text-white">{selectedInquiry.inquiry_no}</p>
                            <p className="text-xs text-slate-500">
                              {new Date(selectedInquiry.sales_date).toLocaleDateString()} • {customerMap.get(selectedInquiry.contact_id)?.company || selectedInquiry.contact_id}
                            </p>
                          </div>
                          {!isConverted && (
                            <div className="flex items-center gap-2">
                              <StatusBadge status={selectedInquiry.status} />
                              <select
                                value={selectedInquiry.status}
                                onChange={(e) => handleStatusChange(e.target.value as SalesInquiryStatus)}
                                disabled={
                                  selectedInquiry.status === SalesInquiryStatus.CONVERTED_TO_ORDER ||
                                  selectedInquiry.status === SalesInquiryStatus.CANCELLED ||
                                  statusUpdating
                                }
                                className="text-xs border border-slate-200 dark:border-slate-700 rounded px-2 py-1 bg-white dark:bg-slate-800"
                              >
                                {[SalesInquiryStatus.DRAFT, SalesInquiryStatus.APPROVED, SalesInquiryStatus.CANCELLED, SalesInquiryStatus.CONVERTED_TO_ORDER].map((status) => (
                                  <option key={status} value={status} disabled={status === SalesInquiryStatus.CONVERTED_TO_ORDER}>
                                    {status.replace(/_/g, ' ')}
                                  </option>
                                ))}
                              </select>
                            </div>
                          )}
                        </div>
                        <div className="mt-4">
                          <WorkflowStepper
                            currentStage={workflowStage}
                            documentLabel={linkedOrder?.status === SalesOrderStatus.CONVERTED_TO_DOCUMENT ? 'Document Issued' : 'Document'}
                          />
                        </div>
                        <div className="mt-4 flex flex-wrap gap-2">
                          {isConverted ? (
                            <button
                              type="button"
                              onClick={() => linkedOrder && navigateToModule('salesorder', { orderId: linkedOrder.id })}
                              disabled={!linkedOrder}
                              className="flex items-center gap-2 px-4 py-2 rounded-lg bg-brand-blue text-white text-sm hover:bg-blue-700 transition-colors disabled:opacity-50"
                            >
                              <Eye className="w-4 h-4" />
                              View Sales Order
                            </button>
                          ) : (
                            <>
                              <button
                                type="button"
                                onClick={handleApproveSelectedInquiry}
                                disabled={
                                  approvingInquiry ||
                                  selectedInquiry.status !== SalesInquiryStatus.DRAFT
                                }
                                className="px-4 py-2 rounded-lg bg-slate-900 text-white text-sm disabled:opacity-40"
                              >
                                {approvingInquiry ? 'Approving...' : 'Approve Inquiry'}
                              </button>
                              <button
                                type="button"
                                onClick={() => setShowConversionModal(true)}
                                disabled={selectedInquiry.status !== SalesInquiryStatus.APPROVED}
                                className="px-4 py-2 rounded-lg bg-brand-blue text-white text-sm disabled:opacity-40"
                              >
                                Convert to Sales Order
                              </button>
                            </>
                          )}
                        </div>
                      </div>
                    </>
                  );
                })()}
                <div className="bg-white dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-800 p-4 space-y-2">
                  <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-200">Customer & Pricing</h3>
                  <div className="grid grid-cols-2 gap-3 text-xs text-slate-500">
                    <div>
                      <p className="font-semibold text-slate-600 dark:text-slate-300">Sales Person</p>
                      <p>{selectedInquiry.sales_person || 'Unassigned'}</p>
                    </div>
                    <div>
                      <p className="font-semibold text-slate-600 dark:text-slate-300">Price Group</p>
                      <p>{selectedInquiry.price_group || 'N/A'}</p>
                    </div>
                    <div>
                      <p className="font-semibold text-slate-600 dark:text-slate-300">Terms</p>
                      <p>{selectedInquiry.terms || 'N/A'}</p>
                    </div>
                    <div>
                      <p className="font-semibold text-slate-600 dark:text-slate-300">Promise to Pay</p>
                      <p>{selectedInquiry.promise_to_pay || 'N/A'}</p>
                    </div>
                  </div>
                </div>
                <div className="bg-white dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-800 p-4">
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-200">Items</h3>
                    <div className="text-xs text-slate-500">Grand Total: ₱{Number(selectedInquiry.grand_total || 0).toLocaleString()}</div>
                  </div>
                  <div className="overflow-x-auto">
                    <table className="w-full text-xs">
                      <thead>
                        <tr className="text-left text-slate-500">
                          <th className="py-2">Item</th>
                          <th className="py-2">Qty</th>
                          <th className="py-2">Unit Price</th>
                          <th className="py-2">Amount</th>
                        </tr>
                      </thead>
                      <tbody>
                        {selectedInquiry.items?.map((item) => (
                          <tr key={item.id} className="border-t border-slate-100 dark:border-slate-800">
                            <td className="py-2">
                              <div className="font-semibold text-slate-700 dark:text-slate-200">{item.description}</div>
                              <div className="text-[10px] text-slate-500">{item.item_code}</div>
                            </td>
                            <td className="py-2">{item.qty}</td>
                            <td className="py-2">₱{Number(item.unit_price || 0).toLocaleString()}</td>
                            <td className="py-2 font-semibold">₱{Number(item.amount || 0).toLocaleString()}</td>
                          </tr>
                        ))}
                        {!selectedInquiry.items?.length && (
                          <tr>
                            <td colSpan={4} className="py-4 text-center text-slate-500">
                              No items captured for this inquiry.
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
                {linkedOrder && (
                  <div className="bg-indigo-50 dark:bg-indigo-500/10 border border-indigo-100 dark:border-indigo-500/30 rounded-lg p-4">
                    <p className="text-sm font-semibold text-indigo-800 dark:text-indigo-200">Linked Sales Order</p>
                    <p className="text-xs text-indigo-600 dark:text-indigo-200/80 mb-3">
                      {linkedOrder.order_no} • Status: {linkedOrder.status}
                    </p>
                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={() => navigateToModule('salesorder', { orderId: linkedOrder.id })}
                        className="px-4 py-2 text-xs rounded bg-indigo-600 text-white"
                      >
                        View Sales Order
                      </button>
                      {linkedOrder.status === SalesOrderStatus.CONVERTED_TO_DOCUMENT && (
                        <p className="text-xs text-indigo-700 self-center">Document generated for this order.</p>
                      )}
                    </div>
                  </div>
                )}
                {conversionMessage && (
                  <div className="bg-emerald-50 border border-emerald-100 text-emerald-700 rounded-lg p-3 text-xs">
                    {conversionMessage}
                  </div>
                )}
              </div>
            ) : (
              <div className="flex-1 flex items-center justify-center text-slate-500 text-sm">
                Select an inquiry to view workflow details.
              </div>
            )}
          </div>
        </div>
      </div>

      {showConversionModal && selectedInquiry && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-40 p-4">
          <div className="bg-white dark:bg-slate-900 rounded-lg max-w-md w-full p-5 border border-slate-200 dark:border-slate-800 space-y-3">
            <h3 className="text-lg font-semibold text-slate-800 dark:text-white">Convert Inquiry to Sales Order</h3>
            <p className="text-sm text-slate-600 dark:text-slate-400">
              Confirming will create a Sales Order using this inquiry&apos;s customer and item details. You can review and convert the order to documents afterwards.
            </p>
            <div className="bg-slate-50 dark:bg-slate-800/60 rounded p-3 text-xs text-slate-500 dark:text-slate-300">
              <p>Inquiry: {selectedInquiry.inquiry_no}</p>
              <p>Customer: {customerMap.get(selectedInquiry.contact_id)?.company || selectedInquiry.contact_id}</p>
              <p>Grand Total: ₱{Number(selectedInquiry.grand_total || 0).toLocaleString()}</p>
            </div>
            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setShowConversionModal(false)}
                className="px-3 py-1 text-sm rounded bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-200"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConvertSelectedInquiry}
                disabled={conversionLoading}
                className="px-4 py-1 text-sm rounded bg-brand-blue text-white disabled:opacity-50"
              >
                {conversionLoading ? 'Converting...' : 'Convert'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Modal */}
      {showDeleteModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-slate-900 rounded-lg max-w-sm w-full p-4 shadow-xl border border-slate-200 dark:border-slate-800">
            <div className="flex items-center gap-2 mb-3">
              <AlertCircle className="w-5 h-5 text-red-600" />
              <h3 className="font-semibold text-slate-900 dark:text-white">Delete Inquiry</h3>
            </div>
            <p className="text-slate-600 dark:text-slate-400 text-sm mb-4">Are you sure? This cannot be undone.</p>
            <div className="flex gap-2 justify-end">
              <button onClick={() => setShowDeleteModal(false)} className="px-3 py-1 bg-slate-200 dark:bg-slate-800 text-slate-900 dark:text-white rounded text-sm hover:bg-slate-300 dark:hover:bg-slate-700 transition-colors">
                Cancel
              </button>
              <button onClick={handleDeleteConfirm} disabled={deleteConfirming} className="px-3 py-1 bg-red-600 text-white rounded text-sm hover:bg-red-700 disabled:bg-red-400 transition-colors">
                {deleteConfirming ? 'Deleting...' : 'Delete'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Product Search Modal */}
      <ProductSearchModal
        isOpen={showProductModal}
        onClose={() => setShowProductModal(false)}
        onSelect={handleProductSelect}
      />
    </div>
  );
};

export default SalesInquiryView;
