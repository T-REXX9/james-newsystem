import { supabase } from '../lib/supabaseClient';
import { SupplierReturn, CreateReturnDTO, RRItemForReturn } from '../returnToSupplier.types';
import { ENTITY_TYPES, logCreate, logDelete, logStatusChange } from './activityLogService';

export const returnToSupplierService = {
    // 1. Fetch all returns
    getAllReturns: async (): Promise<SupplierReturn[]> => {
        const { data, error } = await supabase
            .from('supplier_returns')
            .select('*')
            .order('created_at', { ascending: false });

        if (error) throw error;
        return data || [];
    },

    // 2. Fetch specific return by ID
    getReturnById: async (id: string): Promise<SupplierReturn | null> => {
        const { data, error } = await supabase
            .from('supplier_returns')
            .select('*')
            .eq('id', id)
            .single();

        if (error) throw error;
        return data;
    },

    // 3. Fetch return items
    getReturnItems: async (returnId: string) => {
        const { data, error } = await supabase
            .from('supplier_return_items')
            .select('*')
            .eq('return_id', returnId);

        if (error) throw error;
        return data || [];
    },

    // 4. Create new return
    createReturn: async (returnData: CreateReturnDTO) => {
        // Start a transaction-like process (client-side orchestration)

        // A. Generate Return Number (Simple auto-increment logic or random for now)
        // Ideally this should be a DB function or use a sequence. 
        // For this implementation, we'll try to find the latest and increment, or use a timestamp based generated ID if allowed.
        // However, the schema has return_no. Let's assume we generate it here or let the user input it? 
        // The guide says "Auto-generated Return Number".
        // Let's generate a unique string.

        const { count } = await supabase.from('supplier_returns').select('*', { count: 'exact', head: true });
        const nextNum = (count || 0) + 1;
        const returnNo = `RTS-${new Date().getFullYear()}-${String(nextNum).padStart(4, '0')}`;

        const { data: returnRecord, error: returnError } = await supabase
            .from('supplier_returns')
            .insert({
                return_no: returnNo,
                reference_no: returnNo, // fallback
                return_date: returnData.return_date,
                return_type: returnData.return_type,
                rr_id: returnData.rr_id,
                rr_no: returnData.rr_no,
                supplier_id: returnData.supplier_id,
                supplier_name: returnData.supplier_name,
                po_no: returnData.po_no,
                status: 'Pending',
                remarks: returnData.remarks,
                grand_total: returnData.items.reduce((sum, item) => sum + item.total_amount, 0),
                created_by: (await supabase.auth.getUser()).data.user?.id
            })
            .select()
            .single();

        if (returnError) throw returnError;

        // B. Insert Items
        if (returnRecord && returnData.items.length > 0) {
            const itemsToInsert = returnData.items.map(item => ({
                return_id: returnRecord.id,
                rr_item_id: item.rr_item_id,
                item_id: item.item_id,
                item_code: item.item_code,
                part_no: item.part_no,
                description: item.description,
                qty_returned: item.qty_returned,
                unit_cost: item.unit_cost,
                total_amount: item.total_amount,
                return_reason: item.return_reason,
                remarks: item.remarks
            }));

            const { error: itemsError } = await supabase
                .from('supplier_return_items')
                .insert(itemsToInsert);

            if (itemsError) {
                // cleanup if items fail? Manual delete?
                // Ideally we use an RPC for atomic transaction, but for now we follow the simple service pattern.
                console.error("Error inserting items:", itemsError);
                throw itemsError;
            }
        }

        if (returnRecord) {
            try {
                await logCreate(ENTITY_TYPES.RETURN_TO_SUPPLIER, returnRecord.id, {
                    return_no: returnRecord.return_no || returnNo,
                    supplier_id: returnRecord.supplier_id,
                    grand_total: returnRecord.grand_total,
                });
            } catch (logError) {
                console.error('Failed to log activity:', logError);
            }
        }

        return returnRecord;
    },

    // 5. Finalize Return
    finalizeReturn: async (returnId: string) => {
        const { data: existing } = await supabase
            .from('supplier_returns')
            .select('status')
            .eq('id', returnId)
            .single();
        const { error } = await supabase.rpc('finalize_supplier_return', { p_return_id: returnId });
        if (error) throw error;
        try {
            await logStatusChange(
                ENTITY_TYPES.RETURN_TO_SUPPLIER,
                returnId,
                existing?.status || 'PENDING',
                'FINALIZED'
            );
        } catch (logError) {
            console.error('Failed to log activity:', logError);
        }
    },

    // 6. Delete Return (only if Pending)
    deleteReturn: async (id: string) => {
        const { data: existing } = await supabase
            .from('supplier_returns')
            .select('return_no')
            .eq('id', id)
            .single();
        const { error } = await supabase
            .from('supplier_returns')
            .delete()
            .eq('id', id)
            .eq('status', 'Pending'); // Safety check

        if (error) throw error;
        try {
            await logDelete(ENTITY_TYPES.RETURN_TO_SUPPLIER, id, {
                return_no: existing?.return_no ?? null,
            });
        } catch (logError) {
            console.error('Failed to log activity:', logError);
        }
    },

    // 7. Get Available Items for RR
    // This is complex. We need items from RR and subtract already returned quantities.
    getRRItemsForReturn: async (rrId: string): Promise<RRItemForReturn[]> => {
        // A. Get RR Items
        const { data: rrItems, error: rrError } = await supabase
            .from('receiving_report_items')
            .select('*')
            .eq('rr_id', rrId);

        if (rrError) throw rrError;

        // B. Get all returned items linked to this RR (via supplier_returns -> supplier_return_items)
        // We can join or just fetch all returns for this RR.

        // First get all return IDs for this RR
        const { data: returns } = await supabase
            .from('supplier_returns')
            .select('id')
            .eq('rr_id', rrId);

        const returnIds = returns?.map(r => r.id) || [];

        let returnedItemsMap: Record<string, number> = {};

        if (returnIds.length > 0) {
            const { data: returnedItems } = await supabase
                .from('supplier_return_items')
                .select('rr_item_id, qty_returned')
                .in('return_id', returnIds);

            returnedItems?.forEach(item => {
                if (item.rr_item_id) {
                    returnedItemsMap[item.rr_item_id] = (returnedItemsMap[item.rr_item_id] || 0) + (item.qty_returned || 0);
                }
            });
        }

        // C. Map results
        return rrItems.map((item: any) => ({
            id: item.id,
            item_id: item.item_id,
            item_code: item.item_code,
            part_number: item.part_number,
            description: item.description,
            quantity_received: item.qty_received || item.quantity_received || 0, // Handle potential column name diffs
            unit_cost: item.unit_cost,
            qty_returned_already: returnedItemsMap[item.id] || 0
        }));
    },

    // 8. Search RRs
    searchRRs: async (query: string) => {
        const { data, error } = await supabase
            .from('receiving_reports')
            .select('*')
            .ilike('rr_number', `%${query}%`) // Assuming rr_number exists
            .eq('status', 'Posted') // Only from posted RRs
            .limit(10);

        if (error) throw error;
        return data || [];
    }
};
