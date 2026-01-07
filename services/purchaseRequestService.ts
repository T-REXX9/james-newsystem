// @ts-nocheck
import { supabase } from '../lib/supabaseClient';
import {
    PurchaseRequest,
    PurchaseRequestWithItems,
    CreatePRPayload,
    CreatePRItemPayload
} from '../purchaseRequest.types';

export const purchaseRequestService = {
    // --- Purchase Requests ---

    async getPurchaseRequests(filters?: { month?: number; year?: number; status?: string }): Promise<PurchaseRequestWithItems[]> {
        let query = supabase
            .from('purchase_requests')
            .select(`
                *,
                items:purchase_request_items(*)
            `);

        if (filters?.year) {
            const startDate = `${filters.year}-${String(filters.month || 1).padStart(2, '0')}-01`;
            const endDate = filters.month
                ? new Date(filters.year, filters.month, 0).toISOString().split('T')[0]
                : `${filters.year}-12-31`;

            query = query.gte('request_date', startDate).lte('request_date', endDate);
        }

        if (filters?.status && filters.status !== 'All') {
            query = query.eq('status', filters.status);
        }

        const { data, error } = await query.order('created_at', { ascending: false });
        if (error) throw error;
        return data as unknown as PurchaseRequestWithItems[];
    },

    async getPurchaseRequestById(id: string): Promise<PurchaseRequestWithItems> {
        const { data, error } = await supabase
            .from('purchase_requests')
            .select(`
                *,
                items:purchase_request_items(*)
            `)
            .eq('id', id)
            .single();

        if (error) throw error;
        return data as unknown as PurchaseRequestWithItems;
    },

    async createPurchaseRequest(payload: CreatePRPayload): Promise<PurchaseRequestWithItems> {
        // 1. Create Header
        const { data: prData, error: prError } = await supabase
            .from('purchase_requests')
            .insert({
                pr_number: payload.pr_number,
                request_date: payload.request_date,
                notes: payload.notes,
                reference_no: payload.reference_no,
                status: 'Draft'
            })
            .select()
            .single();

        if (prError) throw prError;
        if (!prData) throw new Error('Failed to create purchase request');

        // 2. Create Items
        if (payload.items.length > 0) {
            const itemsToInsert = payload.items.map(item => ({
                pr_id: prData.id,
                item_id: item.item_id,
                item_code: item.item_code,
                part_number: item.part_number,
                description: item.description,
                quantity: item.quantity,
                unit_cost: item.unit_cost,
                supplier_id: item.supplier_id,
                supplier_name: item.supplier_name,
                eta_date: item.eta_date
            }));

            const { error: itemsError } = await supabase
                .from('purchase_request_items')
                .insert(itemsToInsert);

            if (itemsError) {
                // Rollback header if items fail? 
                // For simplicity, we just throw for now, manually delete prData id?
                await supabase.from('purchase_requests').delete().eq('id', prData.id);
                throw itemsError;
            }
        }

        return await this.getPurchaseRequestById(prData.id);
    },

    async updatePurchaseRequest(id: string, updates: Partial<PurchaseRequest>): Promise<void> {
        const { error } = await supabase
            .from('purchase_requests')
            .update(updates)
            .eq('id', id);
        if (error) throw error;
    },

    async deletePurchaseRequest(id: string): Promise<void> {
        const { error } = await supabase
            .from('purchase_requests')
            .delete()
            .eq('id', id);
        if (error) throw error;
    },

    // --- PR Items (Individual Management) ---
    async addPRItem(prId: string, item: CreatePRItemPayload): Promise<void> {
        const { error } = await supabase
            .from('purchase_request_items')
            .insert({
                pr_id: prId,
                ...item
            });
        if (error) throw error;
    },

    async updatePRItem(itemId: string, updates: any): Promise<void> {
        const { error } = await supabase
            .from('purchase_request_items')
            .update(updates)
            .eq('id', itemId);
        if (error) throw error;
    },

    async deletePRItem(itemId: string): Promise<void> {
        const { error } = await supabase
            .from('purchase_request_items')
            .delete()
            .eq('id', itemId);
        if (error) throw error;
    },

    // --- Helpers ---

    async generatePRNumber(): Promise<string> {
        const year = new Date().getFullYear().toString().slice(-2);
        // Using RPC function as discovered in backend types
        const { data: count, error } = await supabase
            .rpc('get_year_pr_count', { year_suffix: year });

        if (error) throw error;

        const sequence = String((count || 0) + 1).padStart(2, '0');
        // Check uniqueness loop? skipping for now as per instructions
        return `PR-${year}${sequence}`;
    },

    async getSuppliers() {
        // Reuse logic from PurchaseOrderService
        const { data, error } = await supabase
            .from('contacts')
            .select('id, company, payment_terms') // Fetching terms for cost/payment info
            .ilike('transactionType', '%PO%')
            .order('company', { ascending: true });
        if (error) throw error;
        return data;
    },

    async getProducts() {
        const { data, error } = await supabase
            .from('products')
            .select('id, item_code, part_number, name, description, cost, quantity') // Added quantity for inventory check
            .order('part_number', { ascending: true });
        if (error) throw error;
        return data;
    },

    async getSupplierItemCost(supplierId: string, itemId: string) {
        const { data, error } = await supabase
            .from('supplier_item_costs')
            .select('unit_cost')
            .eq('supplier_id', supplierId)
            .eq('item_id', itemId)
            .maybeSingle(); // Use maybeSingle to avoid 406 not found error

        if (error) return 0;
        return data?.unit_cost || 0;
    },

    // Convert to PO
    async convertToPO(prIds: string[], approverId: string): Promise<string> {
        // This is complex. The guide implies "User converts to PO".
        // It says "Selected items are added to a new Purchase Order".
        // For simplicity, let's assume 1 PR -> 1 PO or selected items from 1 PR.
        // Implementation: Create PO header, copy items.
        // Returning generated PO ID.
        return 'TODO_PO_ID';
        // Note: The UI for conversion might need selection. 
        // I will implement basic "Convert All" for now in UI.
    }
};
