import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ShoppingCart, ListFilter, Search, RefreshCw, Plus, Package,
  CheckCircle2, AlertTriangle, XCircle, Calendar, MapPin, User,
  Truck, FileText, Trash2, Save
} from 'lucide-react';
import StatusBadge from './StatusBadge';
import WorkflowStepper from './WorkflowStepper';
import {
  createPurchaseOrder,
  getAllPurchaseOrders,
  markAsDelivered,
} from '../services/purchaseOrderService';
import { fetchContacts, fetchProducts, createNotification } from '../services/supabaseService';
import { supabase } from '../lib/supabaseClient';
import {
  Contact,
  Product,
  NotificationType,
  PurchaseOrder,
  PurchaseOrderDTO,
  PurchaseOrderItem,
  PurchaseOrderStatus
} from '../types';
import { useRealtimeNestedList } from '../hooks/useRealtimeNestedList';
import { useRealtimeList } from '../hooks/useRealtimeList';
import { applyOptimisticUpdate } from '../utils/optimisticUpdates';

interface PurchaseOrderViewProps {
  initialPoId?: string;
}

const WAREHOUSES = ['WH1', 'WH2', 'WH3', 'WH4', 'WH5', 'WH6'];

const FINAL_DOCUMENT_STATUSES = new Set<PurchaseOrderStatus>([
  PurchaseOrderStatus.DELIVERED,
  PurchaseOrderStatus.CANCELLED
]);

const documentStatusMeta: Record<PurchaseOrderStatus, { label: string; tone: 'neutral' | 'info' | 'success' | 'warning' | 'danger' }> = {
  [PurchaseOrderStatus.DRAFT]: { label: 'Draft', tone: 'neutral' },
  [PurchaseOrderStatus.ORDERED]: { label: 'Ordered', tone: 'info' },
  [PurchaseOrderStatus.DELIVERED]: { label: 'Delivered', tone: 'success' },
  [PurchaseOrderStatus.CANCELLED]: { label: 'Cancelled', tone: 'danger' },
};

const PurchaseOrderView: React.FC<PurchaseOrderViewProps> = ({ initialPoId }) => {
  const [selectedPo, setSelectedPo] = useState<PurchaseOrder | null>(null);
  const [statusFilter, setStatusFilter] = useState<'all' | PurchaseOrderStatus>('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [markingDelivered, setMarkingDelivered] = useState(false);
  const [showDeliverConfirm, setShowDeliverConfirm] = useState(false);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [creating, setCreating] = useState(false);
  
  // Form state
  const [poNo, setPoNo] = useState('');
  const [supplierId, setSupplierId] = useState('');
  const [warehouseId, setWarehouseId] = useState('WH1');
  const [orderDate, setOrderDate] = useState('');
  const [deliveryDate, setDeliveryDate] = useState('');
  const [items, setItems] = useState<Array<{
    item_id: string;
    qty: number;
    unit_price: number;
    notes?: string;
  }>>([]);
  const [itemSearch, setItemSearch] = useState('');
  const [showItemDropdown, setShowItemDropdown] = useState(false);

  // Use real-time list for contacts (suppliers)
  const { data: contacts } = useRealtimeList<Contact>({
    tableName: 'contacts',
    initialFetchFn: fetchContacts,
  });

  // Use real-time list for products
  const { data: products } = useRealtimeList<Product>({
    tableName: 'products',
    initialFetchFn: fetchProducts,
  });

  // Use real-time nested list for purchase orders with items
  const sortByCreatedAt = (a: PurchaseOrder, b: PurchaseOrder) => {
    return new Date(b.created_at || 0).getTime() - new Date(a.created_at || 0).getTime();
  };

  const {
    data: purchaseOrders,
    isLoading: loading,
    setData: setPurchaseOrders,
  } = useRealtimeNestedList<PurchaseOrder, PurchaseOrderItem>({
    parentTableName: 'purchase_orders',
    childTableName: 'purchase_order_items',
    parentFetchFn: getAllPurchaseOrders,
    childParentIdField: 'po_id',
    childrenField: 'items',
    sortParentFn: sortByCreatedAt,
  });

  const supplierMap = useMemo(() => new Map(contacts.map(contact => [contact.id, contact])), [contacts]);
  const productMap = useMemo(() => new Map(products.map(product => [product.id, product])), [products]);

  const notifyUser = useCallback(async (title: string, message: string, type: NotificationType = 'success') => {
    try {
      const { data: authData } = await supabase.auth.getUser();
      const user = authData?.user;
      if (!user) return;
      await createNotification({ recipient_id: user.id, title, message, type });
    } catch (err) {
      console.error('Error sending notification:', err);
    }
  }, []);

  // Auto-select first PO when POs change
  useEffect(() => {
    if (purchaseOrders.length > 0 && !selectedPo) {
      setSelectedPo(purchaseOrders[0]);
    }
  }, [purchaseOrders, selectedPo]);

  useEffect(() => {
    if (!initialPoId || !purchaseOrders.length) return;
    const po = purchaseOrders.find(entry => entry.id === initialPoId);
    if (po) setSelectedPo(po);
  }, [initialPoId, purchaseOrders]);

  const filteredPos = useMemo(() => {
    const query = searchTerm.toLowerCase();
    return purchaseOrders.filter(po => {
      const matchesStatus = statusFilter === 'all' || po.status === statusFilter;
      const matchesSearch =
        !query ||
        po.po_no.toLowerCase().includes(query) ||
        (supplierMap.get(po.supplier_id)?.company || '').toLowerCase().includes(query);
      return matchesStatus && matchesSearch;
    });
  }, [supplierMap, purchaseOrders, searchTerm, statusFilter]);

  const selectedSupplier = selectedPo ? supplierMap.get(selectedPo.supplier_id) : null;
  const workflowStage = useMemo<'inquiry' | 'order' | 'document'>(() => {
    if (!selectedPo) return 'inquiry';
    return FINAL_DOCUMENT_STATUSES.has(selectedPo.status) ? 'document' : 'order';
  }, [selectedPo]);
  const workflowDocumentStatus = useMemo(() => {
    if (!selectedPo || workflowStage !== 'document') return undefined;
    return documentStatusMeta[selectedPo.status];
  }, [selectedPo, workflowStage]);

  // Filter products for autocomplete
  const filteredProducts = useMemo(() => {
    if (!itemSearch) return products.slice(0, 50);
    const query = itemSearch.toLowerCase();
    return products.filter(p =>
      p.part_no.toLowerCase().includes(query) ||
      p.description.toLowerCase().includes(query) ||
      p.brand.toLowerCase().includes(query) ||
      p.item_code.toLowerCase().includes(query)
    ).slice(0, 50);
  }, [products, itemSearch]);

  const handleMarkDelivered = async () => {
    if (!selectedPo) return;
    setMarkingDelivered(true);

    // Optimistic update
    setPurchaseOrders(prev => applyOptimisticUpdate(prev, selectedPo.id, {
      status: PurchaseOrderStatus.DELIVERED,
      delivery_date: new Date().toISOString()
    } as Partial<PurchaseOrder>));
    setSelectedPo(prev => prev ? { ...prev, status: PurchaseOrderStatus.DELIVERED, delivery_date: new Date().toISOString() } : null);

    try {
      await markAsDelivered(selectedPo.id);
      await notifyUser(
        'Purchase Order Delivered',
        `PO ${selectedPo.po_no} marked as delivered. Inventory updated.`,
        'success'
      );
      setShowDeliverConfirm(false);
    } catch (err) {
      console.error('Error marking PO as delivered:', err);
      alert('Failed to mark PO as delivered');
      // Real-time subscription will correct the state
    } finally {
      setMarkingDelivered(false);
    }
  };

  const handleCreatePO = async () => {
    if (!poNo || !supplierId || !orderDate || items.length === 0) {
      alert('Please fill in all required fields');
      return;
    }

    setCreating(true);
    const poData: PurchaseOrderDTO = {
      po_no: poNo,
      supplier_id: supplierId,
      order_date: orderDate,
      delivery_date: deliveryDate || undefined,
      warehouse_id: warehouseId,
      items: items,
    };

    try {
      const newPo = await createPurchaseOrder(poData);
      await notifyUser('Purchase Order Created', `PO ${poNo} has been created successfully.`);
      setShowCreateForm(false);
      // Reset form
      setPoNo('');
      setSupplierId('');
      setWarehouseId('WH1');
      setOrderDate('');
      setDeliveryDate('');
      setItems([]);
      setItemSearch('');
    } catch (err) {
      console.error('Error creating PO:', err);
      alert('Failed to create purchase order');
    } finally {
      setCreating(false);
    }
  };

  const handleAddItem = (product: Product) => {
    const existingItemIndex = items.findIndex(item => item.item_id === product.id);
    if (existingItemIndex >= 0) {
      // Update existing item
      const newItems = [...items];
      newItems[existingItemIndex] = {
        ...newItems[existingItemIndex],
        qty: newItems[existingItemIndex].qty + 1,
      };
      setItems(newItems);
    } else {
      // Add new item
      setItems([...items, {
        item_id: product.id,
        qty: 1,
        unit_price: product.price_aa || 0,
      }]);
    }
    setItemSearch('');
    setShowItemDropdown(false);
  };

  const handleRemoveItem = (index: number) => {
    setItems(items.filter((_, i) => i !== index));
  };

  const handleUpdateItem = (index: number, field: 'qty' | 'unit_price' | 'notes', value: any) => {
    const newItems = [...items];
    newItems[index] = { ...newItems[index], [field]: value };
    setItems(newItems);
  };

  const calculateTotal = () => {
    return items.reduce((sum, item) => sum + (item.qty * item.unit_price), 0);
  };

  const getInventoryImpactPreview = () => {
    if (!selectedPo) return { stockIn: [], stockOut: [] };
    const stockIn = selectedPo.items?.map(item => ({
      part_no: productMap.get(item.item_id)?.part_no || item.item_id,
      qty: item.qty,
      warehouse: selectedPo.warehouse_id,
    })) || [];
    return { stockIn, stockOut: [] };
  };

  const { stockIn, stockOut } = useMemo(() => getInventoryImpactPreview(), [selectedPo, productMap]);

  return (
    <div className="h-full flex flex-col bg-slate-100 dark:bg-slate-950">
      {/* Header */}
      <div className="bg-gradient-to-r from-slate-800 to-slate-900 text-white px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <span className="p-2 rounded bg-white/10"><ShoppingCart className="w-5 h-5" /></span>
          <div>
            <h1 className="text-lg font-semibold">Purchase Orders</h1>
            <p className="text-xs text-slate-300">Manage supplier orders and inventory intake</p>
          </div>
        </div>
        <button
          onClick={() => setShowCreateForm(true)}
          className="flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg transition-colors text-sm font-medium"
        >
          <Plus className="w-4 h-4" />
          <span>New PO</span>
        </button>
      </div>

      <div className="flex-1 flex overflow-hidden">
        {/* Sidebar */}
        <aside className="w-80 border-r border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 flex flex-col">
          <div className="p-4 space-y-3">
            <div className="flex items-center gap-2 px-2 py-1 rounded border border-slate-200 dark:border-slate-800">
              <Search className="w-4 h-4 text-slate-400" />
              <input
                className="flex-1 text-xs bg-transparent outline-none"
                placeholder="Search PO or supplier..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            <div>
              <label className="text-xs text-slate-500 flex items-center gap-1 mb-1">
                <ListFilter className="w-3 h-3" /> Status
              </label>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value as 'all' | PurchaseOrderStatus)}
                className="w-full text-xs border border-slate-200 dark:border-slate-800 rounded px-2 py-1 bg-slate-50 dark:bg-slate-800"
              >
                <option value="all">All</option>
                {Object.values(PurchaseOrderStatus).map(status => (
                  <option key={status} value={status}>{status}</option>
                ))}
              </select>
            </div>
          </div>
          <div className="flex-1 overflow-y-auto divide-y divide-slate-100 dark:divide-slate-800">
            {loading && (
              <div className="flex items-center justify-center py-6 text-xs text-slate-500">
                <RefreshCw className="w-4 h-4 animate-spin mr-2" /> Loading purchase orders...
              </div>
            )}
            {!loading && filteredPos.map(po => {
              const supplier = supplierMap.get(po.supplier_id);
              const isActive = selectedPo?.id === po.id;
              return (
                <button
                  key={po.id}
                  onClick={() => setSelectedPo(po)}
                  className={`w-full text-left p-3 space-y-1 ${isActive ? 'bg-brand-blue/10' : 'hover:bg-slate-50 dark:hover:bg-slate-800/50'}`}
                >
                  <div className="flex items-center justify-between">
                    <span className="font-semibold text-sm text-slate-800 dark:text-slate-100">{po.po_no}</span>
                    <StatusBadge status={po.status} />
                  </div>
                  <p className="text-xs text-slate-500">{supplier?.company || po.supplier_id}</p>
                  <p className="text-[11px] text-slate-400">{new Date(po.order_date).toLocaleDateString()}</p>
                </button>
              );
            })}
            {!loading && filteredPos.length === 0 && (
              <div className="p-4 text-xs text-slate-500">No purchase orders found.</div>
            )}
          </div>
        </aside>

        {/* Main Content */}
        <section className="flex-1 overflow-y-auto p-4">
          {selectedPo ? (
            <div className="space-y-4">
              {/* PO Header Card */}
              <div className="bg-white dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-800 p-4 space-y-4">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <p className="text-xs text-slate-500">Purchase Order</p>
                    <h2 className="text-2xl font-semibold text-slate-800 dark:text-white">{selectedPo.po_no}</h2>
                    <p className="text-xs text-slate-500">{new Date(selectedPo.order_date).toLocaleDateString()} · {selectedSupplier?.company || selectedPo.supplier_id}</p>
                  </div>
                  <StatusBadge status={selectedPo.status} />
                </div>
                <WorkflowStepper currentStage={workflowStage} documentLabel="Purchase Order" documentSubStatus={workflowDocumentStatus} />
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-xs text-slate-600">
                  <div>
                    <p className="font-semibold text-slate-500">Warehouse</p>
                    <p className="flex items-center gap-1">
                      <MapPin className="w-3 h-3" />
                      {selectedPo.warehouse_id}
                    </p>
                  </div>
                  <div>
                    <p className="font-semibold text-slate-500">Order Date</p>
                    <p className="flex items-center gap-1">
                      <Calendar className="w-3 h-3" />
                      {new Date(selectedPo.order_date).toLocaleDateString()}
                    </p>
                  </div>
                  <div>
                    <p className="font-semibold text-slate-500">Expected Delivery</p>
                    <p className="flex items-center gap-1">
                      <Truck className="w-3 h-3" />
                      {selectedPo.delivery_date ? new Date(selectedPo.delivery_date).toLocaleDateString() : 'Not specified'}
                    </p>
                  </div>
                  <div>
                    <p className="font-semibold text-slate-500">Total Amount</p>
                    <p className="font-semibold text-brand-blue">₱{Number(selectedPo.grand_total).toLocaleString()}</p>
                  </div>
                </div>
                <div className="flex flex-wrap gap-2 text-xs">
                  {selectedPo.status === PurchaseOrderStatus.ORDERED && (
                    <button
                      type="button"
                      onClick={() => setShowDeliverConfirm(true)}
                      disabled={markingDelivered}
                      className="px-4 py-2 rounded bg-emerald-600 text-white disabled:opacity-40 flex items-center gap-2"
                    >
                      <CheckCircle2 className="w-4 h-4" />
                      {markingDelivered ? 'Processing...' : 'Mark as Delivered'}
                    </button>
                  )}
                </div>
              </div>

              {/* PO Details Card */}
              <div className="bg-white dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-800 p-4">
                <div className="flex justify-between items-center mb-4">
                  <h3 className="text-lg font-semibold text-slate-800 dark:text-white flex items-center gap-2">
                    <FileText className="w-5 h-5" />
                    Order Details
                  </h3>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-xs">
                    <thead>
                      <tr className="text-left text-slate-500 border-b border-slate-200 dark:border-slate-700">
                        <th className="py-2">Item</th>
                        <th className="py-2 text-right">Qty</th>
                        <th className="py-2 text-right">Unit Price</th>
                        <th className="py-2 text-right">Amount</th>
                        <th className="py-2">Notes</th>
                      </tr>
                    </thead>
                    <tbody>
                      {selectedPo.items?.map(item => {
                        const product = productMap.get(item.item_id);
                        return (
                          <tr key={item.id} className="border-t border-slate-100 dark:border-slate-800">
                            <td className="py-2">
                              <div className="font-semibold text-slate-700 dark:text-slate-200">{product?.part_no || item.item_id}</div>
                              <div className="text-[10px] text-slate-500">{product?.description || ''}</div>
                            </td>
                            <td className="py-2 text-right">{item.qty}</td>
                            <td className="py-2 text-right">₱{Number(item.unit_price || 0).toLocaleString()}</td>
                            <td className="py-2 text-right font-semibold">₱{Number(item.amount || 0).toLocaleString()}</td>
                            <td className="py-2 text-slate-500">{item.notes || '-'}</td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
                <div className="flex justify-end text-sm font-semibold text-slate-700 dark:text-slate-200 mt-3">
                  Total: ₱{Number(selectedPo.grand_total || 0).toLocaleString()}
                </div>
              </div>

              {/* Inventory Impact Preview */}
              {selectedPo.status === PurchaseOrderStatus.ORDERED && (
                <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg p-4">
                  <h4 className="text-sm font-semibold text-amber-800 dark:text-amber-200 mb-2 flex items-center gap-2">
                    <AlertTriangle className="w-4 h-4" />
                    Inventory Impact Preview
                  </h4>
                  <p className="text-xs text-amber-700 dark:text-amber-300 mb-3">
                    When marked as delivered, the following inventory changes will occur:
                  </p>
                  {stockIn.length > 0 && (
                    <div className="space-y-1">
                      <p className="text-xs font-semibold text-amber-800 dark:text-amber-200">Stock In:</p>
                      {stockIn.map((item, idx) => (
                        <div key={idx} className="text-xs text-amber-700 dark:text-amber-300 flex items-center gap-2">
                          <CheckCircle2 className="w-3 h-3" />
                          {item.part_no}: +{item.qty} at {item.warehouse}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          ) : (
            <div className="h-full flex items-center justify-center text-slate-500 text-sm">
              Select a purchase order to view details.
            </div>
          )}
        </section>
      </div>

      {/* Delivery Confirmation Modal */}
      {showDeliverConfirm && selectedPo && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-40 p-4">
          <div className="bg-white dark:bg-slate-900 rounded-lg max-w-md w-full p-5 border border-slate-200 dark:border-slate-800 space-y-4">
            <div className="flex items-center gap-3">
              <div className="p-3 bg-amber-100 dark:bg-amber-900/30 rounded-full">
                <AlertTriangle className="w-6 h-6 text-amber-600 dark:text-amber-400" />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-slate-800 dark:text-white">Confirm Delivery</h3>
                <p className="text-sm text-slate-500">PO {selectedPo.po_no}</p>
              </div>
            </div>
            <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded p-3 text-xs">
              <p className="font-semibold text-amber-800 dark:text-amber-200 mb-2">Inventory Impact:</p>
              {stockIn.map((item, idx) => (
                <div key={idx} className="text-amber-700 dark:text-amber-300 flex items-center gap-2 mb-1">
                  <CheckCircle2 className="w-3 h-3" />
                  {item.part_no}: +{item.qty} at {item.warehouse}
                </div>
              ))}
            </div>
            <p className="text-xs text-slate-600 dark:text-slate-400">
              This action will update inventory levels and cannot be undone.
            </p>
            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setShowDeliverConfirm(false)}
                className="px-4 py-2 text-sm rounded bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-200"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleMarkDelivered}
                disabled={markingDelivered}
                className="px-4 py-2 text-sm rounded bg-emerald-600 text-white disabled:opacity-40"
              >
                {markingDelivered ? 'Processing...' : 'Confirm Delivery'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Create PO Modal */}
      {showCreateForm && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-40 p-4 overflow-y-auto">
          <div className="bg-white dark:bg-slate-900 rounded-lg max-w-4xl w-full my-8 border border-slate-200 dark:border-slate-800 space-y-4">
            <div className="p-4 border-b border-slate-200 dark:border-slate-700">
              <h3 className="text-lg font-semibold text-slate-800 dark:text-white">Create New Purchase Order</h3>
            </div>
            <div className="p-4 space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-slate-500 mb-1">PO Number *</label>
                  <input
                    type="text"
                    value={poNo}
                    onChange={(e) => setPoNo(e.target.value)}
                    className="w-full text-sm border border-slate-200 dark:border-slate-700 rounded px-3 py-2 bg-white dark:bg-slate-800"
                    placeholder="PO-XXXXX"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-500 mb-1">Supplier *</label>
                  <select
                    value={supplierId}
                    onChange={(e) => setSupplierId(e.target.value)}
                    className="w-full text-sm border border-slate-200 dark:border-slate-700 rounded px-3 py-2 bg-white dark:bg-slate-800"
                  >
                    <option value="">Select supplier...</option>
                    {contacts.map(contact => (
                      <option key={contact.id} value={contact.id}>{contact.company}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-500 mb-1">Warehouse *</label>
                  <select
                    value={warehouseId}
                    onChange={(e) => setWarehouseId(e.target.value)}
                    className="w-full text-sm border border-slate-200 dark:border-slate-700 rounded px-3 py-2 bg-white dark:bg-slate-800"
                  >
                    {WAREHOUSES.map(wh => (
                      <option key={wh} value={wh}>{wh}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-500 mb-1">Order Date *</label>
                  <input
                    type="date"
                    value={orderDate}
                    onChange={(e) => setOrderDate(e.target.value)}
                    className="w-full text-sm border border-slate-200 dark:border-slate-700 rounded px-3 py-2 bg-white dark:bg-slate-800"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-500 mb-1">Expected Delivery Date</label>
                  <input
                    type="date"
                    value={deliveryDate}
                    onChange={(e) => setDeliveryDate(e.target.value)}
                    className="w-full text-sm border border-slate-200 dark:border-slate-700 rounded px-3 py-2 bg-white dark:bg-slate-800"
                  />
                </div>
              </div>

              {/* Items Section */}
              <div>
                <label className="block text-xs font-medium text-slate-500 mb-1">Items *</label>
                <div className="relative mb-3">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4" />
                  <input
                    type="text"
                    placeholder="Search products..."
                    className="w-full text-sm border border-slate-200 dark:border-slate-700 rounded-lg pl-10 pr-4 py-2 bg-white dark:bg-slate-800"
                    value={itemSearch}
                    onChange={(e) => {
                      setItemSearch(e.target.value);
                      setShowItemDropdown(true);
                    }}
                    onFocus={() => setShowItemDropdown(true)}
                  />
                  {showItemDropdown && filteredProducts.length > 0 && (
                    <div className="absolute z-10 w-full mt-1 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg shadow-lg max-h-64 overflow-y-auto">
                      {filteredProducts.map(product => (
                        <button
                          key={product.id}
                          onClick={() => handleAddItem(product)}
                          className="w-full text-left p-3 hover:bg-slate-50 dark:hover:bg-slate-800 border-b border-slate-100 dark:border-slate-800 last:border-0"
                        >
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-slate-800 dark:text-white text-sm">{product.part_no}</span>
                            <span className="px-1.5 py-0.5 bg-slate-100 dark:bg-slate-800 text-slate-500 text-[10px] rounded uppercase font-bold">{product.brand}</span>
                          </div>
                          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">{product.description}</p>
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                {/* Items Table */}
                {items.length > 0 && (
                  <div className="border border-slate-200 dark:border-slate-700 rounded-lg overflow-hidden">
                    <table className="w-full text-xs">
                      <thead className="bg-slate-50 dark:bg-slate-800">
                        <tr>
                          <th className="px-3 py-2 text-left">Item</th>
                          <th className="px-3 py-2 text-right">Qty</th>
                          <th className="px-3 py-2 text-right">Unit Price</th>
                          <th className="px-3 py-2">Notes</th>
                          <th className="px-3 py-2"></th>
                        </tr>
                      </thead>
                      <tbody>
                        {items.map((item, idx) => {
                          const product = productMap.get(item.item_id);
                          return (
                            <tr key={idx} className="border-t border-slate-200 dark:border-slate-700">
                              <td className="px-3 py-2">
                                <div className="font-semibold">{product?.part_no || item.item_id}</div>
                                <div className="text-[10px] text-slate-500">{product?.description || ''}</div>
                              </td>
                              <td className="px-3 py-2">
                                <input
                                  type="number"
                                  min="1"
                                  value={item.qty}
                                  onChange={(e) => handleUpdateItem(idx, 'qty', parseInt(e.target.value) || 1)}
                                  className="w-20 text-right border border-slate-200 dark:border-slate-700 rounded px-2 py-1 bg-white dark:bg-slate-800"
                                />
                              </td>
                              <td className="px-3 py-2">
                                <input
                                  type="number"
                                  min="0"
                                  step="0.01"
                                  value={item.unit_price}
                                  onChange={(e) => handleUpdateItem(idx, 'unit_price', parseFloat(e.target.value) || 0)}
                                  className="w-24 text-right border border-slate-200 dark:border-slate-700 rounded px-2 py-1 bg-white dark:bg-slate-800"
                                />
                              </td>
                              <td className="px-3 py-2">
                                <input
                                  type="text"
                                  value={item.notes || ''}
                                  onChange={(e) => handleUpdateItem(idx, 'notes', e.target.value)}
                                  className="w-full border border-slate-200 dark:border-slate-700 rounded px-2 py-1 bg-white dark:bg-slate-800"
                                  placeholder="Notes..."
                                />
                              </td>
                              <td className="px-3 py-2 text-right">
                                <button
                                  onClick={() => handleRemoveItem(idx)}
                                  className="text-rose-500 hover:text-rose-700"
                                >
                                  <Trash2 className="w-4 h-4" />
                                </button>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                    <div className="px-3 py-2 bg-slate-50 dark:bg-slate-800 text-right font-semibold">
                      Total: ₱{calculateTotal().toLocaleString()}
                    </div>
                  </div>
                )}
              </div>
            </div>
            <div className="p-4 border-t border-slate-200 dark:border-slate-700 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setShowCreateForm(false)}
                className="px-4 py-2 text-sm rounded bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-200"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleCreatePO}
                disabled={creating || !poNo || !supplierId || !orderDate || items.length === 0}
                className="px-4 py-2 text-sm rounded bg-emerald-600 text-white disabled:opacity-40 flex items-center gap-2"
              >
                <Save className="w-4 h-4" />
                {creating ? 'Creating...' : 'Create PO'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default PurchaseOrderView;
