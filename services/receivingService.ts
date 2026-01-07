// @ts-nocheck
import { supabase } from '../lib/supabaseClient';
import {
    ReceivingReport,
    ReceivingReportInsert,
    ReceivingReportUpdate,
    ReceivingReportItem,
    ReceivingReportItemInsert,
    ReceivingReportItemUpdate,
    ReceivingReportWithDetails,
    Product,
    Supplier
} from '../receiving.types';

export const receivingService = {
    // --- Receiving Reports ---

    async getReceivingReports(filters?: { month?: number; year?: number; status?: string; search?: string }): Promise<ReceivingReportWithDetails[]> {
        let query = supabase
            .from('receiving_reports')
            .select('*, supplier_name, received_by');

        if (filters?.year) {
            const startDate = `${filters.year}-${String(filters.month || 1).padStart(2, '0')}-01`;
            const endDate = filters.month
                ? new Date(filters.year, filters.month, 0).toISOString().split('T')[0]
                : `${filters.year}-12-31`;

            if (filters.month) {
                query = query.gte('receive_date', startDate).lte('receive_date', endDate);
            } else {
                query = query.gte('receive_date', `${filters.year}-01-01`).lte('receive_date', `${filters.year}-12-31`);
            }
        }

        if (filters?.status) {
            query = query.eq('status', filters.status);
        }

        if (filters?.search) {
            query = query.or(`rr_no.ilike.%${filters.search}%,supplier_name.ilike.%${filters.search}%`);
        }

        const { data, error } = await query.order('created_at', { ascending: false });
        if (error) throw error;
        return data as unknown as ReceivingReportWithDetails[];
    },

    async getReceivingReportById(id: string): Promise<ReceivingReportWithDetails> {
        const { data, error } = await supabase
            .from('receiving_reports')
            .select(`
                *,
                items:receiving_report_items(
                    *,
                    product:products(*)
                )
            `)
            .eq('id', id)
            .single();

        if (error) throw error;
        return data as unknown as ReceivingReportWithDetails;
    },

    async createReceivingReport(rr: ReceivingReportInsert): Promise<ReceivingReport> {
        // Double check duplicate
        const isDuplicate = await this.checkDuplicateRR(rr.rr_no);
        if (isDuplicate) {
            throw new Error(`RR Number ${rr.rr_no} already exists.`);
        }

        const { data, error } = await supabase
            .from('receiving_reports')
            .insert(rr)
            .select()
            .single();
        if (error) throw error;
        return data as unknown as ReceivingReport;
    },

    async updateReceivingReport(id: string, updates: ReceivingReportUpdate): Promise<ReceivingReport> {
        const { data, error } = await supabase
            .from('receiving_reports')
            .update(updates)
            .eq('id', id)
            .select()
            .single();
        if (error) throw error;
        return data as unknown as ReceivingReport;
    },

    async deleteReceivingReport(id: string): Promise<void> {
        const { error } = await supabase
            .from('receiving_reports')
            .delete()
            .eq('id', id);
        if (error) throw error;
    },

    async finalizeReceivingReport(id: string): Promise<void> {
        const { error } = await supabase.rpc('finalize_receiving_report', { p_rr_id: id });
        if (error) throw error;
    },

    // --- Receiving Report Items ---

    async addReceivingReportItem(item: ReceivingReportItemInsert): Promise<ReceivingReportItem> {
        const { data, error } = await supabase
            .from('receiving_report_items')
            .insert(item)
            .select()
            .single();
        if (error) throw error;
        return data as unknown as ReceivingReportItem;
    },

    async updateReceivingReportItem(id: string, updates: ReceivingReportItemUpdate): Promise<ReceivingReportItem> {
        const { data, error } = await supabase
            .from('receiving_report_items')
            .update(updates)
            .eq('id', id)
            .select()
            .single();
        if (error) throw error;
        return data as unknown as ReceivingReportItem;
    },

    async deleteReceivingReportItem(id: string): Promise<void> {
        const { error } = await supabase
            .from('receiving_report_items')
            .delete()
            .eq('id', id);
        if (error) throw error;
    },

    // --- Helpers ---

    async checkDuplicateRR(rrNo: string): Promise<boolean> {
        const { count, error } = await supabase
            .from('receiving_reports')
            .select('*', { count: 'exact', head: true })
            .eq('rr_no', rrNo);

        if (error) throw error;
        return (count || 0) > 0;
    },

    async generateRRNumber(): Promise<string> {
        const year = new Date().getFullYear().toString().slice(-2);
        const { count, error } = await supabase
            .from('receiving_reports')
            .select('*', { count: 'exact', head: true })
            .ilike('rr_no', `RR-${year}%`);

        if (error) throw error;

        const sequence = String((count || 0) + 1).padStart(2, '0');
        return `RR-${year}${sequence}`;
    },

    async getSuppliers(): Promise<Supplier[]> {
        const { data, error } = await supabase
            .from('contacts')
            .select('*')
            // Using logic from PurchaseOrderService or just all contacts for flexibility if type isn't clear
            // Instructions say "Supplier Selection: Dropdown to select the supplier"
            // I will fetch all for now, or filter if I find a better way.
            .order('company', { ascending: true });

        if (error) throw error;
        return data as unknown as Supplier[];
    },

    async getProducts(): Promise<Product[]> {
        const { data, error } = await supabase
            .from('products')
            .select('*')
            .order('part_no', { ascending: true });
        if (error) throw error;
        return data as unknown as Product[];
    }
};
