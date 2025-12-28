import { supabase } from '../lib/supabaseClient';
import {
  Invoice,
  OrderSlip,
  RecycleBinItemType,
  SalesInquiryStatus,
  SalesOrder,
  SalesOrderDTO,
  SalesOrderItem,
  SalesOrderStatus,
} from '../types';
import { createFromOrder as createOrderSlipFromOrder } from './orderSlipService';
import { createFromOrder as createInvoiceFromOrder } from './invoiceService';

const formatSequence = (): string => String(Math.floor(Math.random() * 100000)).padStart(5, '0');

export const ORDER_SLIP_TRANSACTION_TYPES = ['Order Slip', 'PO'];
export const INVOICE_TRANSACTION_TYPES = ['Invoice', 'Sales Invoice'];

export const isOrderSlipAllowedForTransactionType = (transactionType?: string | null): boolean => {
  if (!transactionType) return true;
  return !INVOICE_TRANSACTION_TYPES.includes(transactionType);
};

export const isInvoiceAllowedForTransactionType = (transactionType?: string | null): boolean => {
  if (!transactionType) return true;
  return !ORDER_SLIP_TRANSACTION_TYPES.includes(transactionType);
};

export const getDocumentTypeForTransaction = (
  transactionType?: string | null
): 'orderslip' | 'invoice' | null => {
  if (!transactionType) return null;
  if (ORDER_SLIP_TRANSACTION_TYPES.includes(transactionType)) return 'orderslip';
  if (INVOICE_TRANSACTION_TYPES.includes(transactionType)) return 'invoice';
  return null;
};

export const DOCUMENT_POLICY_STORAGE_KEY = 'document:selectedTransactionType';

export const readDocumentPolicyFromStorage = (): string | null => {
  if (typeof window === 'undefined') return null;
  try {
    return window.sessionStorage.getItem(DOCUMENT_POLICY_STORAGE_KEY);
  } catch (err) {
    console.error('Failed to read document policy state:', err);
    return null;
  }
};

export const syncDocumentPolicyState = (transactionType?: string | null): void => {
  if (typeof window === 'undefined') return;
  try {
    if (transactionType) {
      window.sessionStorage.setItem(DOCUMENT_POLICY_STORAGE_KEY, transactionType);
    } else {
      window.sessionStorage.removeItem(DOCUMENT_POLICY_STORAGE_KEY);
    }
  } catch (err) {
    console.error('Failed to persist document policy state:', err);
  }

  try {
    window.dispatchEvent(
      new CustomEvent('documentPolicy:update', {
        detail: { transactionType: transactionType || null },
      })
    );
  } catch (err) {
    console.error('Failed to dispatch document policy event:', err);
  }
};

export const generateOrderNumber = (): string => {
  const date = new Date();
  const dateStr = `${date.getFullYear()}${String(date.getMonth() + 1).padStart(2, '0')}${String(date.getDate()).padStart(2, '0')}`;
  return `ORD-${dateStr}-${formatSequence()}`;
};

const mapOrderItemPayload = (item: Omit<SalesOrderItem, 'id' | 'order_id'>, orderId: string) => ({
  order_id: orderId,
  item_id: item.item_id,
  qty: item.qty,
  part_no: item.part_no,
  item_code: item.item_code,
  location: item.location,
  description: item.description,
  unit_price: item.unit_price,
  amount: item.amount,
  remark: item.remark,
  approval_status: item.approval_status || 'pending',
});

const fetchOrderItems = async (orderId: string): Promise<SalesOrderItem[]> => {
  const { data } = await supabase
    .from('sales_order_items')
    .select('*')
    .eq('order_id', orderId);

  return (data as SalesOrderItem[]) || [];
};

const attachOrderItems = async (order: any): Promise<SalesOrder> => {
  const items = await fetchOrderItems(order.id);
  return {
    ...order,
    items,
  } as SalesOrder;
};

const fetchInquiry = async (inquiryId: string) => {
  const { data, error } = await supabase
    .from('sales_inquiries')
    .select('*')
    .eq('id', inquiryId)
    .single();

  if (error || !data) {
    throw new Error('Sales inquiry not found');
  }

  const { data: items } = await supabase
    .from('sales_inquiry_items')
    .select('*')
    .eq('inquiry_id', inquiryId);

  return { inquiry: data, items: items || [] };
};

export const createSalesOrder = async (data: SalesOrderDTO): Promise<SalesOrder> => {
  try {
    const { data: authData } = await supabase.auth.getUser();
    const user = authData?.user;
    if (!user) throw new Error('User not authenticated');

    const orderNo = generateOrderNumber();
    const status = data.status || SalesOrderStatus.PENDING;
    const grandTotal = data.items.reduce((sum, item) => sum + (item.amount || 0), 0);

    const payload = {
      order_no: orderNo,
      inquiry_id: data.inquiry_id || null,
      contact_id: data.contact_id,
      sales_date: data.sales_date,
      sales_person: data.sales_person,
      delivery_address: data.delivery_address,
      reference_no: data.reference_no,
      customer_reference: data.customer_reference,
      send_by: data.send_by,
      price_group: data.price_group,
      credit_limit: data.credit_limit,
      terms: data.terms,
      promise_to_pay: data.promise_to_pay,
      po_number: data.po_number,
      remarks: data.remarks,
      inquiry_type: data.inquiry_type,
      urgency: data.urgency,
      urgency_date: data.urgency_date,
      grand_total: grandTotal,
      status,
      approved_by: data.approved_by || null,
      approved_at: data.approved_at || null,
      created_by: user.id,
    };

    const { data: order, error } = await supabase
      .from('sales_orders')
      .insert(payload)
      .select()
      .single();

    if (error || !order) throw error || new Error('Failed to create order');

    const { data: itemRows, error: itemsError } = await supabase
      .from('sales_order_items')
      .insert(data.items.map(item => mapOrderItemPayload(item, order.id)))
      .select();

    if (itemsError) throw itemsError;

    return {
      ...order,
      items: (itemRows as SalesOrderItem[]) || [],
    } as SalesOrder;
  } catch (err) {
    console.error('Error creating sales order:', err);
    throw err;
  }
};

export const createFromInquiry = async (inquiryId: string): Promise<SalesOrder> => {
  try {
    const { inquiry, items } = await fetchInquiry(inquiryId);

    if (inquiry.status !== SalesInquiryStatus.APPROVED) {
      throw new Error('Inquiry must be approved before conversion');
    }

    // Validate that all items have an item_id (product reference)
    // This is crucial for inventory log tracking
    const missingItemIds = items.some((item: any) => !item.item_id);
    if (missingItemIds) {
      throw new Error('Cannot convert inquiry: One or more items are missing product references (item_id). Please recreate the inquiry with valid products.');
    }

    const dto: SalesOrderDTO = {
      inquiry_id: inquiry.id,
      contact_id: inquiry.contact_id,
      sales_date: inquiry.sales_date,
      sales_person: inquiry.sales_person,
      delivery_address: inquiry.delivery_address,
      reference_no: inquiry.reference_no,
      customer_reference: inquiry.customer_reference,
      send_by: inquiry.send_by,
      price_group: inquiry.price_group,
      credit_limit: inquiry.credit_limit,
      terms: inquiry.terms,
      promise_to_pay: inquiry.promise_to_pay,
      po_number: inquiry.po_number,
      remarks: inquiry.remarks,
      inquiry_type: inquiry.inquiry_type,
      urgency: inquiry.urgency,
      urgency_date: inquiry.urgency_date,
      items: items.map((item: any) => ({
        item_id: item.item_id,
        qty: item.qty,
        part_no: item.part_no,
        item_code: item.item_code,
        location: item.location,
        description: item.description,
        unit_price: item.unit_price,
        amount: item.amount,
        remark: item.remark,
        approval_status: item.approval_status,
      })),
    };

    return createSalesOrder(dto);
  } catch (err) {
    console.error('Error creating sales order from inquiry:', err);
    throw err;
  }
};

export const getSalesOrder = async (id: string): Promise<SalesOrder | null> => {
  try {
    const { data, error } = await supabase
      .from('sales_orders')
      .select('*')
      .eq('id', id)
      .eq('is_deleted', false)
      .single();

    if (error || !data) return null;
    return attachOrderItems(data);
  } catch (err) {
    console.error('Error fetching sales order:', err);
    return null;
  }
};

export const getSalesOrdersByCustomer = async (customerId: string): Promise<SalesOrder[]> => {
  try {
    const { data, error } = await supabase
      .from('sales_orders')
      .select('*')
      .eq('contact_id', customerId)
      .eq('is_deleted', false)
      .order('created_at', { ascending: false });

    if (error || !data) return [];

    return Promise.all(data.map(order => attachOrderItems(order)));
  } catch (err) {
    console.error('Error fetching sales orders by customer:', err);
    return [];
  }
};

export const getSalesOrderByInquiry = async (inquiryId: string): Promise<SalesOrder | null> => {
  try {
    const { data, error } = await supabase
      .from('sales_orders')
      .select('*')
      .eq('inquiry_id', inquiryId)
      .eq('is_deleted', false)
      .maybeSingle();

    if (error || !data) return null;
    return attachOrderItems(data);
  } catch (err) {
    console.error('Error fetching sales order by inquiry:', err);
    return null;
  }
};

export const updateSalesOrder = async (
  id: string,
  data: Partial<SalesOrderDTO>
): Promise<SalesOrder | null> => {
  try {
    const updatePayload: Record<string, any> = {};
    const fields = [
      'sales_date',
      'sales_person',
      'delivery_address',
      'reference_no',
      'customer_reference',
      'send_by',
      'price_group',
      'credit_limit',
      'terms',
      'promise_to_pay',
      'po_number',
      'remarks',
      'inquiry_type',
      'urgency',
      'urgency_date',
      'status',
      'approved_by',
      'approved_at',
    ];

    fields.forEach(field => {
      if (field in data) {
        updatePayload[field] = (data as any)[field];
      }
    });

    if (data.items) {
      updatePayload.grand_total = data.items.reduce((sum, item) => sum + (item.amount || 0), 0);
    }

    if (Object.keys(updatePayload).length) {
      const { error } = await supabase
        .from('sales_orders')
        .update(updatePayload)
        .eq('id', id);

      if (error) throw error;
    }

    if (data.items) {
      await supabase.from('sales_order_items').delete().eq('order_id', id);
      await supabase
        .from('sales_order_items')
        .insert(data.items.map(item => mapOrderItemPayload(item, id)));
    }

    return getSalesOrder(id);
  } catch (err) {
    console.error('Error updating sales order:', err);
    return null;
  }
};

export const confirmSalesOrder = async (id: string): Promise<SalesOrder | null> => {
  try {
    const order = await getSalesOrder(id);
    if (!order) throw new Error('Order not found');
    if (order.status !== SalesOrderStatus.PENDING) {
      throw new Error('Order must be pending before confirmation');
    }

    const { data: authData } = await supabase.auth.getUser();
    const user = authData?.user;
    if (!user) throw new Error('User not authenticated');

    await supabase
      .from('sales_orders')
      .update({
        status: SalesOrderStatus.CONFIRMED,
        approved_by: user.id,
        approved_at: new Date().toISOString(),
      })
      .eq('id', id);

    return getSalesOrder(id);
  } catch (err) {
    console.error('Error confirming sales order:', err);
    throw err;
  }
};

export const deleteSalesOrder = async (id: string): Promise<boolean> => {
  try {
    // Fetch the current user
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('User not authenticated');

    // Get the order data before deletion
    const order = await getSalesOrder(id);
    if (!order) throw new Error('Order not found');

    // Insert into recycle bin
    const { error: recycleError } = await supabase
      .from('recycle_bin_items')
      .insert({
        item_type: RecycleBinItemType.ORDER,
        item_id: id,
        original_data: order as any,
        deleted_by: user.id,
        deleted_at: new Date().toISOString(),
        restore_token: `restore_${id}_${Date.now()}`,
        expires_at: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
        permanent_delete_at: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
      });

    if (recycleError) throw recycleError;

    // Soft delete the order
    const { error } = await supabase
      .from('sales_orders')
      .update({
        is_deleted: true,
        deleted_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq('id', id);

    if (error) throw error;
    return true;
  } catch (err) {
    console.error('Error deleting sales order:', err);
    return false;
  }
};

export const restoreSalesOrder = async (id: string): Promise<SalesOrder | null> => {
  try {
    // Fetch the current user
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('User not authenticated');

    // Check user role (Owner/Developer only)
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single();

    if (!profile || !['Owner', 'Developer'].includes(profile.role)) {
      throw new Error('Only Owner or Developer can restore items');
    }

    // Update recycle bin item as restored
    await supabase
      .from('recycle_bin_items')
      .update({
        is_restored: true,
        restored_at: new Date().toISOString(),
        restored_by: user.id,
      })
      .eq('item_id', id)
      .eq('item_type', RecycleBinItemType.ORDER);

    // Restore the order
    const { error } = await supabase
      .from('sales_orders')
      .update({
        is_deleted: false,
        deleted_at: null,
        updated_at: new Date().toISOString(),
      })
      .eq('id', id);

    if (error) throw error;
    return getSalesOrder(id);
  } catch (err) {
    console.error('Error restoring sales order:', err);
    return null;
  }
};

export const getAllSalesOrders = async (
  filters: { status?: SalesOrderStatus; contactId?: string } = {}
): Promise<SalesOrder[]> => {
  try {
    let query = supabase
      .from('sales_orders')
      .select('*')
      .eq('is_deleted', false)
      .order('created_at', { ascending: false });

    if (filters.status) {
      query = query.eq('status', filters.status);
    }

    if (filters.contactId) {
      query = query.eq('contact_id', filters.contactId);
    }

    const { data, error } = await query;
    if (error || !data) return [];

    return Promise.all(data.map(order => attachOrderItems(order)));
  } catch (err) {
    console.error('Error fetching all sales orders:', err);
    return [];
  }
};

const fetchContactTransactionType = async (contactId: string): Promise<string | null> => {
  const { data } = await supabase
    .from('contacts')
    .select('transactionType')
    .eq('id', contactId)
    .single();

  return data?.transactionType || null;
};

export const convertToDocument = async (orderId: string): Promise<OrderSlip | Invoice | null> => {
  const order = await getSalesOrder(orderId);
  if (!order) throw new Error('Order not found');

  if (order.status !== SalesOrderStatus.CONFIRMED) {
    throw new Error('Only confirmed orders can be converted');
  }

  const transactionType = await fetchContactTransactionType(order.contact_id);
  // Default to Invoice if transaction type not found (fallback)
  const typeToUse = transactionType || 'Invoice';

  if (!typeToUse) {
    // Should be unreachable due to fallback, but keeping for type safety/completeness if logic changes
    throw new Error('Unable to determine customer transaction type');
  }

  let document: OrderSlip | Invoice | null = null;

  if (ORDER_SLIP_TRANSACTION_TYPES.includes(typeToUse)) {
    document = await createOrderSlipFromOrder(orderId);
  } else if (INVOICE_TRANSACTION_TYPES.includes(typeToUse)) {
    document = await createInvoiceFromOrder(orderId);
  } else {
    throw new Error(`Unsupported transaction type: ${typeToUse}`);
  }

  await supabase
    .from('sales_orders')
    .update({ status: SalesOrderStatus.CONVERTED_TO_DOCUMENT })
    .eq('id', orderId);

  return document;
};
