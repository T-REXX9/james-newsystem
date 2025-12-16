import { supabase } from '../lib/supabaseClient';
import {
  SalesInquiry,
  SalesInquiryDTO,
  SalesInquiryItem,
  SalesInquiryStatus,
  SalesOrder,
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
      items: items || [],
    };
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
      .single();

    if (error || !data) return null;

    const { data: items } = await supabase
      .from('sales_inquiry_items')
      .select('*')
      .eq('inquiry_id', id);

    return {
      ...data,
      items: items || [],
    };
  } catch (err) {
    console.error('Error fetching sales inquiry:', err);
    return null;
  }
};

/**
 * Get all inquiries for a specific customer
 */
export const getSalesInquiriesByCustomer = async (customerId: string): Promise<SalesInquiry[]> => {
  try {
    const { data: inquiries, error } = await supabase
      .from('sales_inquiries')
      .select('*')
      .eq('contact_id', customerId)
      .order('created_at', { ascending: false });

    if (error || !inquiries) return [];

    // Fetch items for each inquiry
    const inquiriesWithItems = await Promise.all(
      inquiries.map(async (inquiry) => {
        const { data: items } = await supabase
          .from('sales_inquiry_items')
          .select('*')
          .eq('inquiry_id', inquiry.id);

        return {
          ...inquiry,
          items: items || [],
        };
      })
    );

    return inquiriesWithItems;
  } catch (err) {
    console.error('Error fetching sales inquiries by customer:', err);
    return [];
  }
};

/**
 * Update a sales inquiry and its items
 */
export const updateSalesInquiry = async (
  id: string,
  data: Partial<SalesInquiryDTO>
): Promise<SalesInquiry | null> => {
  try {
    // Update the inquiry record
    const updatePayload: Record<string, any> = {};
    const fieldsToUpdate = [
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
    ];

    fieldsToUpdate.forEach(field => {
      if (field in data) {
        updatePayload[field] = (data as any)[field];
      }
    });

    if (data.items) {
      updatePayload.grand_total = data.items.reduce((sum, item) => sum + (item.amount || 0), 0);
    }

    if (Object.keys(updatePayload).length > 0) {
      const { error: updateError } = await supabase
        .from('sales_inquiries')
        .update(updatePayload)
        .eq('id', id);

      if (updateError) throw updateError;
    }

    // If items are being updated, handle them
    if (data.items) {
      // Delete existing items
      await supabase
        .from('sales_inquiry_items')
        .delete()
        .eq('inquiry_id', id);

      // Insert new items
      await supabase
        .from('sales_inquiry_items')
        .insert(
          data.items.map(item => ({
            inquiry_id: id,
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
        );
    }

    return getSalesInquiry(id);
  } catch (err) {
    console.error('Error updating sales inquiry:', err);
    return null;
  }
};

/**
 * Delete a sales inquiry and its items
 */
export const deleteSalesInquiry = async (id: string): Promise<boolean> => {
  try {
    const { error } = await supabase
      .from('sales_inquiries')
      .delete()
      .eq('id', id);

    if (error) throw error;
    return true;
  } catch (err) {
    console.error('Error deleting sales inquiry:', err);
    return false;
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
          items: items || [],
        };
      })
    );

    return inquiriesWithItems;
  } catch (err) {
    console.error('Error fetching all sales inquiries:', err);
    return [];
  }
};

export const updateInquiryStatus = async (id: string, status: SalesInquiryStatus): Promise<void> => {
  try {
    await supabase
      .from('sales_inquiries')
      .update({ status })
      .eq('id', id);
  } catch (err) {
    console.error('Error updating inquiry status:', err);
    throw err;
  }
};

export const approveInquiry = async (id: string): Promise<SalesInquiry | null> => {
  const inquiry = await getSalesInquiry(id);
  if (!inquiry) throw new Error('Inquiry not found');

  if (inquiry.status !== SalesInquiryStatus.DRAFT) {
    throw new Error('Only draft inquiries can be approved');
  }

  await updateInquiryStatus(id, SalesInquiryStatus.APPROVED);
  return getSalesInquiry(id);
};

export const convertToOrder = async (inquiryId: string): Promise<SalesOrder> => {
  const inquiry = await getSalesInquiry(inquiryId);
  if (!inquiry) throw new Error('Inquiry not found');

  if (inquiry.status !== SalesInquiryStatus.APPROVED) {
    throw new Error('Inquiry must be approved before conversion');
  }

  const order = await createSalesOrderFromInquiry(inquiryId);
  await updateInquiryStatus(inquiryId, SalesInquiryStatus.CONVERTED_TO_ORDER);
  return order;
};
