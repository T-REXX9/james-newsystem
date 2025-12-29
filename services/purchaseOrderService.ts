import { supabase } from '../lib/supabaseClient';
import type { PurchaseOrder, PurchaseOrderDTO, PurchaseOrderItem } from '../types';
import { createInventoryLogFromPO } from './inventoryLogService';

/**
 * Create a new Purchase Order
 */
export async function createPurchaseOrder(data: PurchaseOrderDTO): Promise<PurchaseOrder> {
  // Get current user
  const { data: { user }, error: userError } = await supabase.auth.getUser();

  if (userError || !user) {
    throw new Error('User not authenticated');
  }

  // Calculate grand total
  const grandTotal = data.items.reduce((sum, item) => {
    return sum + (item.qty * item.unit_price);
  }, 0);

  // Create the purchase order
  const { data: po, error: poError } = await supabase
    .from('purchase_orders')
    .insert({
      po_no: data.po_no,
      supplier_id: data.supplier_id,
      order_date: data.order_date,
      delivery_date: data.delivery_date,
      warehouse_id: data.warehouse_id,
      status: 'draft',
      grand_total: grandTotal,
      created_by: user.id,
      is_deleted: false,
    })
    .select()
    .single();

  if (poError || !po) {
    console.error('Error creating purchase order:', poError);
    throw poError || new Error('Failed to create purchase order');
  }

  // Create purchase order items
  const itemsToInsert = data.items.map(item => ({
    po_id: po.id,
    item_id: item.item_id,
    qty: item.qty,
    unit_price: item.unit_price,
    amount: item.qty * item.unit_price,
    notes: item.notes,
  }));

  const { error: itemsError } = await supabase
    .from('purchase_order_items')
    .insert(itemsToInsert);

  if (itemsError) {
    console.error('Error creating purchase order items:', itemsError);
    // Rollback: delete the PO
    await supabase.from('purchase_orders').delete().eq('id', po.id);
    throw itemsError;
  }

  // Fetch the complete PO with items
  return await getPurchaseOrder(po.id) as PurchaseOrder;
}

/**
 * Get a Purchase Order by ID
 */
export async function getPurchaseOrder(id: string): Promise<PurchaseOrder | null> {
  const { data, error } = await supabase
    .from('purchase_orders')
    .select(`
      *,
      purchase_order_items (*)
    `)
    .eq('id', id)
    .eq('is_deleted', false)
    .single();

  if (error) {
    console.error('Error fetching purchase order:', error);
    return null;
  }

  return data as PurchaseOrder;
}

/**
 * Update a Purchase Order
 */
export async function updatePurchaseOrder(
  id: string,
  updates: Partial<PurchaseOrderDTO>
): Promise<PurchaseOrder | null> {
  // Check if PO exists and is not deleted
  const existingPO = await getPurchaseOrder(id);
  if (!existingPO) {
    throw new Error('Purchase Order not found');
  }

  // Only allow updates on draft status
  if (existingPO.status !== 'draft') {
    throw new Error('Only draft purchase orders can be updated');
  }

  // Calculate new grand total if items are being updated
  let grandTotal = existingPO.grand_total;
  if (updates.items) {
    grandTotal = updates.items.reduce((sum, item) => {
      return sum + (item.qty * item.unit_price);
    }, 0);
  }

  // Update the purchase order
  const { data: po, error: poError } = await supabase
    .from('purchase_orders')
    .update({
      po_no: updates.po_no,
      supplier_id: updates.supplier_id,
      order_date: updates.order_date,
      delivery_date: updates.delivery_date,
      warehouse_id: updates.warehouse_id,
      grand_total: grandTotal,
      updated_at: new Date().toISOString(),
    })
    .eq('id', id)
    .select()
    .single();

  if (poError || !po) {
    console.error('Error updating purchase order:', poError);
    throw poError || new Error('Failed to update purchase order');
  }

  // If items are being updated, delete existing items and create new ones
  if (updates.items) {
    // Delete existing items
    await supabase
      .from('purchase_order_items')
      .delete()
      .eq('po_id', id);

    // Create new items
    const itemsToInsert = updates.items.map(item => ({
      po_id: id,
      item_id: item.item_id,
      qty: item.qty,
      unit_price: item.unit_price,
      amount: item.qty * item.unit_price,
      notes: item.notes,
    }));

    const { error: itemsError } = await supabase
      .from('purchase_order_items')
      .insert(itemsToInsert);

    if (itemsError) {
      console.error('Error updating purchase order items:', itemsError);
      throw itemsError;
    }
  }

  // Fetch the complete updated PO
  return await getPurchaseOrder(id) as PurchaseOrder;
}

/**
 * Mark a Purchase Order as delivered
 * This triggers inventory log creation
 */
export async function markAsDelivered(id: string): Promise<PurchaseOrder | null> {
  // Check if PO exists
  const existingPO = await getPurchaseOrder(id);
  if (!existingPO) {
    throw new Error('Purchase Order not found');
  }

  // Only allow marking as delivered if status is 'ordered'
  if (existingPO.status !== 'ordered') {
    throw new Error('Only ordered purchase orders can be marked as delivered');
  }

  // Get current user
  const { data: { user }, error: userError } = await supabase.auth.getUser();

  if (userError || !user) {
    throw new Error('User not authenticated');
  }

  // Update status to 'delivered'
  const { data: po, error: poError } = await supabase
    .from('purchase_orders')
    .update({
      status: 'delivered',
      delivery_date: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq('id', id)
    .select()
    .single();

  if (poError || !po) {
    console.error('Error marking purchase order as delivered:', poError);
    throw poError || new Error('Failed to mark purchase order as delivered');
  }

  // Create inventory logs
  try {
    await createInventoryLogFromPO(id, user.id);
  } catch (error) {
    console.error('Error creating inventory logs:', error);
    // Note: We don't rollback the PO status update here
    // In production, you might want to handle this differently
  }

  // Fetch the complete updated PO
  return await getPurchaseOrder(id) as PurchaseOrder;
}

/**
 * Get all Purchase Orders with optional filters
 */
export async function getAllPurchaseOrders(
  filters?: { status?: string }
): Promise<PurchaseOrder[]> {
  let query = supabase
    .from('purchase_orders')
    .select(`
      *,
      purchase_order_items (*)
    `)
    .eq('is_deleted', false)
    .order('created_at', { ascending: false });

  if (filters?.status) {
    query = query.eq('status', filters.status);
  }

  const { data, error } = await query;

  if (error) {
    console.error('Error fetching purchase orders:', error);
    throw error;
  }

  return data || [];
}
