import { supabase } from '../lib/supabaseClient';
import { OrderSlip, OrderSlipDTO, OrderSlipItem, OrderSlipStatus, SalesOrderStatus } from '../types';

const generateSequence = () => String(Math.floor(Math.random() * 100000)).padStart(5, '0');

export const generateSlipNumber = (): string => {
  const date = new Date();
  const dateStr = `${date.getFullYear()}${String(date.getMonth() + 1).padStart(2, '0')}${String(date.getDate()).padStart(2, '0')}`;
  return `OS-${dateStr}-${generateSequence()}`;
};

const orderSlipItemPayload = (item: Omit<OrderSlipItem, 'id' | 'order_slip_id'>, orderSlipId: string) => ({
  order_slip_id: orderSlipId,
  qty: item.qty,
  part_no: item.part_no,
  item_code: item.item_code,
  location: item.location,
  description: item.description,
  unit_price: item.unit_price,
  amount: item.amount,
  remark: item.remark,
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

const fetchOrderSlipItems = async (slipId: string): Promise<OrderSlipItem[]> => {
  const { data } = await supabase
    .from('order_slip_items')
    .select('*')
    .eq('order_slip_id', slipId);

  return (data as OrderSlipItem[]) || [];
};

const attachSlipItems = async (slip: any): Promise<OrderSlip> => ({
  ...slip,
  items: await fetchOrderSlipItems(slip.id),
}) as OrderSlip;

export const createOrderSlip = async (data: OrderSlipDTO): Promise<OrderSlip> => {
  try {
    const { data: authData } = await supabase.auth.getUser();
    const user = authData?.user;
    if (!user) throw new Error('User not authenticated');

    const slipNo = generateSlipNumber();
    const grandTotal = data.items.reduce((sum, item) => sum + (item.amount || 0), 0);

    const payload = {
      slip_no: slipNo,
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
      status: data.status || OrderSlipStatus.DRAFT,
      printed_at: data.printed_at || null,
      printed_by: data.printed_by || null,
      created_by: user.id,
    };

    const { data: slip, error } = await supabase
      .from('order_slips')
      .insert(payload)
      .select()
      .single();

    if (error || !slip) throw error || new Error('Failed to create order slip');

    const { data: itemRows, error: itemsError } = await supabase
      .from('order_slip_items')
      .insert(data.items.map(item => orderSlipItemPayload(item, slip.id)))
      .select();

    if (itemsError) throw itemsError;

    return {
      ...slip,
      items: (itemRows as OrderSlipItem[]) || [],
    } as OrderSlip;
  } catch (err) {
    console.error('Error creating order slip:', err);
    throw err;
  }
};

export const createFromOrder = async (orderId: string): Promise<OrderSlip> => {
  const { order, items } = await fetchOrderWithItems(orderId);

  if (order.status !== SalesOrderStatus.CONFIRMED) {
    throw new Error('Order must be confirmed before generating an order slip');
  }

  const dto: OrderSlipDTO = {
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
      location: item.location,
      description: item.description,
      unit_price: item.unit_price,
      amount: item.amount,
      remark: item.remark,
    })),
  };

  return createOrderSlip(dto);
};

export const getOrderSlip = async (id: string): Promise<OrderSlip | null> => {
  try {
    const { data, error } = await supabase
      .from('order_slips')
      .select('*')
      .eq('id', id)
      .single();

    if (error || !data) return null;
    return attachSlipItems(data);
  } catch (err) {
    console.error('Error fetching order slip:', err);
    return null;
  }
};

export const getOrderSlipsByCustomer = async (customerId: string): Promise<OrderSlip[]> => {
  try {
    const { data, error } = await supabase
      .from('order_slips')
      .select('*')
      .eq('contact_id', customerId)
      .order('created_at', { ascending: false });

    if (error || !data) return [];
    return Promise.all(data.map(slip => attachSlipItems(slip)));
  } catch (err) {
    console.error('Error fetching order slips by customer:', err);
    return [];
  }
};

export const updateOrderSlip = async (
  id: string,
  updates: Partial<OrderSlipDTO>
): Promise<OrderSlip | null> => {
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
      'printed_at',
      'printed_by',
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
        .from('order_slips')
        .update(payload)
        .eq('id', id);

      if (error) throw error;
    }

    if (updates.items) {
      await supabase.from('order_slip_items').delete().eq('order_slip_id', id);
      await supabase
        .from('order_slip_items')
        .insert(updates.items.map(item => orderSlipItemPayload(item, id)));
    }

    return getOrderSlip(id);
  } catch (err) {
    console.error('Error updating order slip:', err);
    return null;
  }
};

export const finalizeOrderSlip = async (id: string): Promise<OrderSlip | null> => {
  try {
    await supabase
      .from('order_slips')
      .update({ status: OrderSlipStatus.FINALIZED })
      .eq('id', id);

    return getOrderSlip(id);
  } catch (err) {
    console.error('Error finalizing order slip:', err);
    throw err;
  }
};

export const printOrderSlip = async (id: string): Promise<OrderSlip | null> => {
  try {
    const { data: authData } = await supabase.auth.getUser();
    const user = authData?.user;
    if (!user) throw new Error('User not authenticated');

    await supabase
      .from('order_slips')
      .update({
        printed_at: new Date().toISOString(),
        printed_by: user.id,
      })
      .eq('id', id);

    return getOrderSlip(id);
  } catch (err) {
    console.error('Error printing order slip:', err);
    throw err;
  }
};

export const deleteOrderSlip = async (id: string): Promise<boolean> => {
  try {
    const { error } = await supabase
      .from('order_slips')
      .update({ status: OrderSlipStatus.CANCELLED })
      .eq('id', id);

    if (error) throw error;
    return true;
  } catch (err) {
    console.error('Error cancelling order slip:', err);
    return false;
  }
};

export const getAllOrderSlips = async (
  filters: { status?: OrderSlipStatus; contactId?: string } = {}
): Promise<OrderSlip[]> => {
  try {
    let query = supabase
      .from('order_slips')
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

    return Promise.all(data.map(slip => attachSlipItems(slip)));
  } catch (err) {
    console.error('Error fetching order slips:', err);
    return [];
  }
};
