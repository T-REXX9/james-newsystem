import { supabase } from '../lib/supabaseClient';
import { Invoice, InvoiceDTO, InvoiceItem, InvoiceStatus, SalesOrderStatus } from '../types';

const randomSequence = () => String(Math.floor(Math.random() * 100000)).padStart(5, '0');

export const generateInvoiceNumber = (): string => {
  const date = new Date();
  const dateStr = `${date.getFullYear()}${String(date.getMonth() + 1).padStart(2, '0')}${String(date.getDate()).padStart(2, '0')}`;
  return `INV-${dateStr}-${randomSequence()}`;
};

const invoiceItemPayload = (item: Omit<InvoiceItem, 'id' | 'invoice_id'>, invoiceId: string) => ({
  invoice_id: invoiceId,
  qty: item.qty,
  part_no: item.part_no,
  item_code: item.item_code,
  description: item.description,
  unit_price: item.unit_price,
  amount: item.amount,
  vat_rate: item.vat_rate || 0,
});

const fetchOrderWithItems = async (orderId: string) => {
  const { data: order, error } = await supabase
    .from('sales_orders')
    .select('*')
    .eq('id', orderId)
    .single();

  if (error || !order) {
    throw new Error('Sales order not found');
  }

  const { data: items } = await supabase
    .from('sales_order_items')
    .select('*')
    .eq('order_id', orderId);

  return { order, items: items || [] };
};

const fetchInvoiceItems = async (invoiceId: string): Promise<InvoiceItem[]> => {
  const { data } = await supabase
    .from('invoice_items')
    .select('*')
    .eq('invoice_id', invoiceId);

  return (data as InvoiceItem[]) || [];
};

const attachInvoiceItems = async (invoice: any): Promise<Invoice> => ({
  ...invoice,
  items: await fetchInvoiceItems(invoice.id),
}) as Invoice;

export const createInvoice = async (data: InvoiceDTO): Promise<Invoice> => {
  try {
    const { data: authData } = await supabase.auth.getUser();
    const user = authData?.user;
    if (!user) throw new Error('User not authenticated');

    const invoiceNo = generateInvoiceNumber();
    const grandTotal = data.items.reduce((sum, item) => sum + (item.amount || 0), 0);

    const payload = {
      invoice_no: invoiceNo,
      order_id: data.order_id,
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
      status: data.status || InvoiceStatus.DRAFT,
      due_date: data.due_date || null,
      payment_date: data.payment_date || null,
      payment_method: data.payment_method || null,
      printed_at: data.printed_at || null,
      sent_at: data.sent_at || null,
      created_by: user.id,
    };

    const { data: invoice, error } = await supabase
      .from('invoices')
      .insert(payload)
      .select()
      .single();

    if (error || !invoice) throw error || new Error('Failed to create invoice');

    const { data: itemRows, error: itemsError } = await supabase
      .from('invoice_items')
      .insert(data.items.map(item => invoiceItemPayload(item, invoice.id)))
      .select();

    if (itemsError) throw itemsError;

    return {
      ...invoice,
      items: (itemRows as InvoiceItem[]) || [],
    } as Invoice;
  } catch (err) {
    console.error('Error creating invoice:', err);
    throw err;
  }
};

export const createFromOrder = async (orderId: string): Promise<Invoice> => {
  const { order, items } = await fetchOrderWithItems(orderId);

  if (order.status !== SalesOrderStatus.CONFIRMED) {
    throw new Error('Order must be confirmed before generating an invoice');
  }

  const dto: InvoiceDTO = {
    order_id: order.id,
    contact_id: order.contact_id,
    sales_date: order.sales_date,
    sales_person: order.sales_person,
    delivery_address: order.delivery_address,
    reference_no: order.reference_no,
    customer_reference: order.customer_reference,
    send_by: order.send_by,
    price_group: order.price_group,
    credit_limit: order.credit_limit,
    terms: order.terms,
    promise_to_pay: order.promise_to_pay,
    po_number: order.po_number,
    remarks: order.remarks,
    inquiry_type: order.inquiry_type,
    urgency: order.urgency,
    urgency_date: order.urgency_date,
    items: items.map((item: any) => ({
      qty: item.qty,
      part_no: item.part_no,
      item_code: item.item_code,
      description: item.description,
      unit_price: item.unit_price,
      amount: item.amount,
    })),
  };

  return createInvoice(dto);
};

export const getInvoice = async (id: string): Promise<Invoice | null> => {
  try {
    const { data, error } = await supabase
      .from('invoices')
      .select('*')
      .eq('id', id)
      .single();

    if (error || !data) return null;
    return attachInvoiceItems(data);
  } catch (err) {
    console.error('Error fetching invoice:', err);
    return null;
  }
};

export const getInvoicesByCustomer = async (customerId: string): Promise<Invoice[]> => {
  try {
    const { data, error } = await supabase
      .from('invoices')
      .select('*')
      .eq('contact_id', customerId)
      .order('created_at', { ascending: false });

    if (error || !data) return [];
    return Promise.all(data.map(invoice => attachInvoiceItems(invoice)));
  } catch (err) {
    console.error('Error fetching invoices by customer:', err);
    return [];
  }
};

export const updateInvoice = async (
  id: string,
  updates: Partial<InvoiceDTO>
): Promise<Invoice | null> => {
  try {
    const payload: Record<string, any> = {};
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
      'due_date',
      'payment_date',
      'payment_method',
      'printed_at',
      'sent_at',
    ];

    fields.forEach(field => {
      if (field in updates) {
        payload[field] = (updates as any)[field];
      }
    });

    if (updates.items) {
      payload.grand_total = updates.items.reduce((sum, item) => sum + (item.amount || 0), 0);
    }

    if (Object.keys(payload).length) {
      const { error } = await supabase
        .from('invoices')
        .update(payload)
        .eq('id', id);

      if (error) throw error;
    }

    if (updates.items) {
      await supabase.from('invoice_items').delete().eq('invoice_id', id);
      await supabase
        .from('invoice_items')
        .insert(updates.items.map(item => invoiceItemPayload(item, id)));
    }

    return getInvoice(id);
  } catch (err) {
    console.error('Error updating invoice:', err);
    return null;
  }
};

export const sendInvoice = async (id: string): Promise<Invoice | null> => {
  try {
    await supabase
      .from('invoices')
      .update({
        status: InvoiceStatus.SENT,
        sent_at: new Date().toISOString(),
      })
      .eq('id', id);

    return getInvoice(id);
  } catch (err) {
    console.error('Error sending invoice:', err);
    throw err;
  }
};

export const recordPayment = async (
  id: string,
  paymentData: { payment_date: string; payment_method: string }
): Promise<Invoice | null> => {
  try {
    await supabase
      .from('invoices')
      .update({
        status: InvoiceStatus.PAID,
        payment_date: paymentData.payment_date,
        payment_method: paymentData.payment_method,
      })
      .eq('id', id);

    return getInvoice(id);
  } catch (err) {
    console.error('Error recording invoice payment:', err);
    throw err;
  }
};

export const markOverdue = async (id: string): Promise<Invoice | null> => {
  try {
    await supabase
      .from('invoices')
      .update({ status: InvoiceStatus.OVERDUE })
      .eq('id', id);

    return getInvoice(id);
  } catch (err) {
    console.error('Error marking invoice overdue:', err);
    throw err;
  }
};

export const printInvoice = async (id: string): Promise<Invoice | null> => {
  try {
    await supabase
      .from('invoices')
      .update({ printed_at: new Date().toISOString() })
      .eq('id', id);

    return getInvoice(id);
  } catch (err) {
    console.error('Error printing invoice:', err);
    throw err;
  }
};

export const deleteInvoice = async (id: string): Promise<boolean> => {
  try {
    const { error } = await supabase
      .from('invoices')
      .update({ status: InvoiceStatus.CANCELLED })
      .eq('id', id);

    if (error) throw error;
    return true;
  } catch (err) {
    console.error('Error cancelling invoice:', err);
    return false;
  }
};

export const getAllInvoices = async (
  filters: { status?: InvoiceStatus; contactId?: string } = {}
): Promise<Invoice[]> => {
  try {
    let query = supabase
      .from('invoices')
      .select('*')
      .order('created_at', { ascending: false });

    if (filters.status) {
      query = query.eq('status', filters.status);
    }

    if (filters.contactId) {
      query = query.eq('contact_id', filters.contactId);
    }

    const { data, error } = await query;
    if (error || !data) return [];

    return Promise.all(data.map(invoice => attachInvoiceItems(invoice)));
  } catch (err) {
    console.error('Error fetching invoices:', err);
    return [];
  }
};
