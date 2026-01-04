import { supabase } from '../lib/supabaseClient';
import {
  SalesInquiry,
  SalesInquiryDTO,
  SalesInquiryStatus,
  SalesOrder,
  RecycleBinItemType,
} from '../types';
import { createFromInquiry as createSalesOrderFromInquiry } from './salesOrderService';

/**
 * Generate a unique inquiry number with format INQYYYYMMDD-XXXXX
 */
const generateInquiryNumber = (): string => {
  const date = new Date();
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  const random = String(Math.floor(Math.random() * 100000)).padStart(5, '0');
  return `INQ${year}${month}${day}-${random}`;
};

/**
 * Create a new sales inquiry
 */
export const createSalesInquiry = async (data: SalesInquiryDTO): Promise<SalesInquiry> => {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('User not authenticated');

    const inquiryNo = generateInquiryNumber();

    // Create the main inquiry record
    const { data: inquiry, error: inquiryError } = await supabase
      .from('sales_inquiries')
      .insert({
        inquiry_no: inquiryNo,
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
        grand_total: data.items.reduce((sum, item) => sum + (item.amount || 0), 0),
        status: data.status || SalesInquiryStatus.DRAFT,
        created_by: user.id,
      })
      .select()
      .single();

    if (inquiryError) throw inquiryError;

    // Create inquiry items
    const { data: items, error: itemsError } = await supabase
      .from('sales_inquiry_items')
      .insert(
        data.items.map(item => ({
          inquiry_id: inquiry.id,
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
        }))
      )
      .select();

    if (itemsError) throw itemsError;

    return {
      ...inquiry,
      items: (items || []) as any,
    } as SalesInquiry;
  } catch (err) {
    console.error('Error creating sales inquiry:', err);
    throw err;
  }
};

/**
 * Get a single inquiry by ID with items
 */
export const getSalesInquiry = async (id: string): Promise<SalesInquiry | null> => {
  try {
    const { data, error } = await supabase
      .from('sales_inquiries')
      .select('*')
      .eq('id', id)
      .eq('is_deleted', false)
      .single();

    if (error || !data) return null;

    const { data: items } = await supabase
      .from('sales_inquiry_items')
      .select('*')
      .eq('inquiry_id', id);

    return {
      ...data,
      items: (items || []) as any,
    } as SalesInquiry;
  } catch (err) {
    console.error('Error fetching sales inquiry:', err);
    return null;
  }
};

/**
 * Get all sales inquiries (admin/owner view)
 */
export const getAllSalesInquiries = async (): Promise<SalesInquiry[]> => {
  try {
    const { data: inquiries, error } = await supabase
      .from('sales_inquiries')
      .select('*')
      .eq('is_deleted', false)
      .order('created_at', { ascending: false });

    if (error || !inquiries) return [];

    const inquiriesWithItems = await Promise.all(
      inquiries.map(async (inquiry) => {
        const { data: items } = await supabase
          .from('sales_inquiry_items')
          .select('*')
          .eq('inquiry_id', inquiry.id);

        return {
          ...inquiry,
          items: (items || []) as any,
        } as SalesInquiry;
      })
    );

    return inquiriesWithItems;
  } catch (err) {
    console.error('Error fetching all sales inquiries:', err);
    return [];
  }
};

/**
 * Update inquiry status
 */
export const updateInquiryStatus = async (id: string, status: SalesInquiryStatus): Promise<void> => {
  try {
    // Check if inquiry exists and is not deleted
    const inquiry = await getSalesInquiry(id);
    if (!inquiry) throw new Error('Inquiry not found');

    await supabase
      .from('sales_inquiries')
      .update({ status })
      .eq('id', id);
  } catch (err) {
    console.error('Error updating inquiry status:', err);
    throw err;
  }
};

/**
 * Approve an inquiry
 */
export const approveInquiry = async (id: string): Promise<SalesInquiry | null> => {
  const inquiry = await getSalesInquiry(id);
  if (!inquiry) throw new Error('Inquiry not found');

  if (inquiry.is_deleted) {
    throw new Error('Cannot approve a deleted inquiry');
  }

  if (inquiry.status !== SalesInquiryStatus.DRAFT) {
    throw new Error('Only draft inquiries can be approved');
  }

  await updateInquiryStatus(id, SalesInquiryStatus.APPROVED);
  return getSalesInquiry(id);
};

/**
 * Convert inquiry to sales order
 */
export const convertToOrder = async (inquiryId: string): Promise<SalesOrder> => {
  const inquiry = await getSalesInquiry(inquiryId);
  if (!inquiry) throw new Error('Inquiry not found');

  if (inquiry.is_deleted) {
    throw new Error('Cannot convert a deleted inquiry');
  }

  if (inquiry.status !== SalesInquiryStatus.APPROVED) {
    throw new Error('Inquiry must be approved before conversion');
  }

  const order = await createSalesOrderFromInquiry(inquiryId);
  await updateInquiryStatus(inquiryId, SalesInquiryStatus.CONVERTED_TO_ORDER);
  return order;
};

/**
 * Soft delete a sales inquiry
 */
export const deleteSalesInquiry = async (id: string): Promise<boolean> => {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('User not authenticated');

    // Get the inquiry before deleting
    const inquiry = await getSalesInquiry(id);
    if (!inquiry) throw new Error('Inquiry not found');

    // Soft delete the inquiry
    const { error } = await supabase
      .from('sales_inquiries')
      .update({
        is_deleted: true,
        deleted_at: new Date().toISOString(),
      })
      .eq('id', id);

    if (error) throw error;

    // Add to recycle bin
    await supabase
      .from('recycle_bin_items')
      .insert({
        item_type: RecycleBinItemType.INQUIRY,
        item_id: id,
        original_data: inquiry as any,
        deleted_by: user.id,
        restore_token: `restore_${id}_${Date.now()}`,
        expires_at: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(), // 30 days
        permanent_delete_at: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
      });

    return true;
  } catch (err) {
    console.error('Error deleting sales inquiry:', err);
    return false;
  }
};

/**
 * Restore a soft-deleted sales inquiry
 */
export const restoreSalesInquiry = async (id: string): Promise<boolean> => {
  try {
    const { error } = await supabase
      .from('sales_inquiries')
      .update({
        is_deleted: false,
        deleted_at: null,
      })
      .eq('id', id);

    if (error) throw error;
    return true;
  } catch (err) {
    console.error('Error restoring sales inquiry:', err);
    return false;
  }
};

/**
 * Get inquiry report data with detailed items
 */
export const getInquiryReportData = async (dateFrom: string, dateTo: string, customerId?: string): Promise<SalesInquiry[]> => {
  try {
    let query = supabase
      .from('sales_inquiries')
      .select(`
        *,
        contacts (
          company
        )
      `)
      .gte('sales_date', dateFrom)
      .lte('sales_date', dateTo)
      .eq('is_deleted', false)
      .order('sales_date', { ascending: false });

    if (customerId) {
      query = query.eq('contact_id', customerId);
    }

    const { data: inquiries, error } = await query;

    if (error || !inquiries) return [];

    const inquiriesWithItems = await Promise.all(
      inquiries.map(async (inquiry) => {
        const { data: items } = await supabase
          .from('sales_inquiry_items')
          .select('*')
          .eq('inquiry_id', inquiry.id);

        return {
          ...inquiry,
          customer_company: (inquiry.contacts as any)?.company || 'N/A',
          items: (items || []) as any,
        } as SalesInquiry;
      })
    );

    return inquiriesWithItems;
  } catch (err) {
    console.error('Error fetching inquiry report data:', err);
    return [];
  }
};


/**
 * Get inquiry report summary headers
 */
export const getInquiryReportSummary = async (dateFrom: string, dateTo: string, customerId?: string): Promise<any[]> => {
  try {
    let query = supabase
      .from('sales_inquiries')
      .select(`
        id,
        inquiry_no,
        sales_date,
        created_at,
        grand_total,
        contact_id,
        contacts (
          company
        )
      `)
      .gte('sales_date', dateFrom)
      .lte('sales_date', dateTo)
      .eq('is_deleted', false)
      .order('sales_date', { ascending: false });

    if (customerId) {
      query = query.eq('contact_id', customerId);
    }

    const { data: inquiries, error } = await query;

    if (error || !inquiries) return [];

    return inquiries.map(inquiry => ({
      ...inquiry,
      customer_company: (inquiry.contacts as any)?.company || 'N/A'
    }));
  } catch (err) {
    console.error('Error fetching inquiry report summary:', err);
    return [];
  }
};

/**
 * Get sales development report data - Inquiry details grouped by category
 * Category: 'not_purchase' (On Stock but no SO) or 'no_stock' (Out of Stock)
 */
export const getSalesDevelopmentReportData = async (
  dateFrom: string,
  dateTo: string,
  category: 'not_purchase' | 'no_stock'
): Promise<any[]> => {
  try {
    let query = supabase
      .from('sales_inquiry_items')
      .select(`
        id,
        inquiry_id,
        qty,
        part_no,
        item_code,
        description,
        unit_price,
        amount,
        remark,
        sales_inquiries (
          inquiry_no,
          sales_date,
          sales_person,
          grand_total,
          contact_id,
          contacts (
            company
          )
        )
      `)
      .eq('sales_inquiries.is_deleted', false)
      .gte('sales_inquiries.sales_date', dateFrom)
      .lte('sales_inquiries.sales_date', dateTo);

    if (category === 'not_purchase') {
      query = query.eq('remark', 'On Stock');
    } else if (category === 'no_stock') {
      query = query.eq('remark', 'OutStock');
    }

    const { data: items, error } = await query.order('sales_inquiries.sales_date', { ascending: false });

    if (error || !items) return [];

    return items.map(item => ({
      id: item.id,
      inquiry_id: item.inquiry_id,
      inquiry_no: (item.sales_inquiries as any)?.inquiry_no,
      customer_company: (item.sales_inquiries as any)?.contacts?.company || 'N/A',
      sales_person: (item.sales_inquiries as any)?.sales_person,
      sales_date: (item.sales_inquiries as any)?.sales_date,
      part_no: item.part_no,
      item_code: item.item_code,
      description: item.description,
      qty: item.qty,
      unit_price: item.unit_price,
      amount: item.amount,
      remark: item.remark,
    }));
  } catch (err) {
    console.error('Error fetching sales development report data:', err);
    return [];
  }
};

/**
 * Get demand summary - aggregated by part number
 */
export const getSalesDevelopmentDemandSummary = async (
  dateFrom: string,
  dateTo: string,
  category: 'not_purchase' | 'no_stock'
): Promise<any[]> => {
  try {
    let query = supabase
      .from('sales_inquiry_items')
      .select(`
        part_no,
        item_code,
        description,
        qty,
        unit_price
      `)
      .eq('sales_inquiries.is_deleted', false)
      .gte('sales_inquiries.sales_date', dateFrom)
      .lte('sales_inquiries.sales_date', dateTo);

    if (category === 'not_purchase') {
      query = query.eq('remark', 'On Stock');
    } else if (category === 'no_stock') {
      query = query.eq('remark', 'OutStock');
    }

    const { data: items, error } = await query;

    if (error || !items) return [];

    const grouped = new Map<string, any>();

    items.forEach(item => {
      const key = item.part_no;
      if (!grouped.has(key)) {
        grouped.set(key, {
          part_no: item.part_no,
          item_code: item.item_code,
          description: item.description,
          total_quantity: 0,
          customer_count: 0,
          customers: new Set<string>(),
          average_price: item.unit_price,
        });
      }

      const summary = grouped.get(key);
      summary.total_quantity += item.qty || 0;
      summary.customers.add(item.part_no);
    });

    return Array.from(grouped.values()).map(item => ({
      ...item,
      customer_count: item.customers.size,
      customers: undefined,
    }));
  } catch (err) {
    console.error('Error fetching demand summary:', err);
    return [];
  }
};