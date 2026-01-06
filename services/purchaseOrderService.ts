// @ts-nocheck
import { supabase } from '../lib/supabaseClient';
import { Database } from '../database.types';
import {
    PurchaseOrder,
    PurchaseOrderInsert,
    PurchaseOrderUpdate,
    PurchaseOrderItem,
    PurchaseOrderItemInsert,
    PurchaseOrderItemUpdate,
    PurchaseOrderWithDetails,
    Product,
    Supplier
} from '../purchaseOrderTypes';

// Suppressing strict type checks for Supabase query chains due to complexity/depth limits
export const purchaseOrderService = {
    // --- Purchase Orders ---

    async getPurchaseOrders(filters?: { month?: number; year?: number; status?: string }): Promise<PurchaseOrderWithDetails[]> {
        let query = supabase
            .from('purchase_orders')
            .select('*, supplier:contacts(*)');

        if (filters?.year) {
            const startDate = `${filters.year}-${String(filters.month || 1).padStart(2, '0')}-01`;
            // Calculate end date properly for filtering
            const endDate = filters.month
                ? new Date(filters.year, filters.month, 0).toISOString().split('T')[0] // Last day of month
                : `${filters.year}-12-31`;

            if (filters.month) {
                query = query.gte('order_date', startDate).lte('order_date', endDate);
            } else {
                query = query.gte('order_date', `${filters.year}-01-01`).lte('order_date', `${filters.year}-12-31`);
            }
        }

        if (filters?.status) {
            query = query.eq('status', filters.status);
        }

        const { data, error } = await query.order('created_at', { ascending: false });
        if (error) throw error;
        return data as unknown as PurchaseOrderWithDetails[];
    },

    async getPurchaseOrderById(id: string): Promise<PurchaseOrderWithDetails> {
        const { data, error } = await supabase
            .from('purchase_orders')
            .select(`
        *,
        supplier:contacts(*),
        items:purchase_order_items(
          *,
          product:products(*)
        )
      `)
            .eq('id', id)
            .single();

        if (error) throw error;
        return data as unknown as PurchaseOrderWithDetails;
    },

    async createPurchaseOrder(po: PurchaseOrderInsert): Promise<PurchaseOrder> {
        const { data, error } = await supabase
            .from('purchase_orders')
            .insert(po)
            .select()
            .single();
        if (error) throw error;
        return data as unknown as PurchaseOrder;
    },

    async updatePurchaseOrder(id: string, updates: PurchaseOrderUpdate): Promise<PurchaseOrder> {
        const { data, error } = await supabase
            .from('purchase_orders')
            .update(updates)
            .eq('id', id)
            .select()
            .single();
        if (error) throw error;
        return data as unknown as PurchaseOrder;
    },

    async deletePurchaseOrder(id: string): Promise<void> {
        const { error } = await supabase
            .from('purchase_orders')
            .delete()
            .eq('id', id);
        if (error) throw error;
    },

    // --- Purchase Order Items ---

    async getPurchaseOrderItems(poId: string): Promise<PurchaseOrderItem[]> {
        const { data, error } = await supabase
            .from('purchase_order_items')
            .select('*, product:products(*)')
            .eq('po_id', poId);
        if (error) throw error;
        return data as unknown as PurchaseOrderItem[];
    },

    async addPurchaseOrderItem(item: PurchaseOrderItemInsert): Promise<PurchaseOrderItem> {
        const { data, error } = await supabase
            .from('purchase_order_items')
            .insert(item)
            .select()
            .single();
        if (error) throw error;
        return data as unknown as PurchaseOrderItem;
    },

    async updatePurchaseOrderItem(id: string, updates: PurchaseOrderItemUpdate): Promise<PurchaseOrderItem> {
        const { data, error } = await supabase
            .from('purchase_order_items')
            .update(updates)
            .eq('id', id)
            .select()
            .single();
        if (error) throw error;
        return data as unknown as PurchaseOrderItem;
    },

    async deletePurchaseOrderItem(id: string): Promise<void> {
        const { error } = await supabase
            .from('purchase_order_items')
            .delete()
            .eq('id', id);
        if (error) throw error;
    },

    // --- Suppliers ---

    async getSuppliers(): Promise<Supplier[]> {
        const { data, error } = await supabase
            .from('contacts')
            .select('*')
            // Assuming 'PO' identifies suppliers based on user input, 
            // or we just fetch all and filter in UI, or fetch specific types.
            // Based on discovery: transactionType='PO' might be the key.
            .ilike('transactionType', '%PO%')
            .order('company', { ascending: true });

        if (error) throw error;
        return data as unknown as Supplier[];
    },

    // --- Products ---

    async getProducts(): Promise<Product[]> {
        const { data, error } = await supabase
            .from('products')
            .select('*')
            .order('part_no', { ascending: true });
        if (error) throw error;
        return data as unknown as Product[];
    },

    // --- Utils ---

    async generatePONumber(): Promise<string> {
        const year = new Date().getFullYear().toString().slice(-2);
        // Simple count query - in production consider a dedicated sequence or more robust locking
        const { count, error } = await supabase
            .from('purchase_orders')
            .select('*', { count: 'exact', head: true })
            .ilike('po_number', `PO-${year}%`);

        if (error) throw error;

        const sequence = String((count || 0) + 1).padStart(2, '0');
        return `PO-${year}${sequence}`;
    }
};
