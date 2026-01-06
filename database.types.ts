export type Json =
    | string
    | number
    | boolean
    | null
    | { [key: string]: Json | undefined }
    | Json[]

export type Database = {
    // Allows to automatically instantiate createClient with right options
    // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
    __InternalSupabase: {
        PostgrestVersion: "13.0.5"
    }
    public: {
        Tables: {
            agent_customer_breakdown: {
                Row: {
                    active_count: number
                    agent_id: string
                    created_at: string
                    date: string
                    id: string
                    inactive_count: number
                    prospective_count: number
                    updated_at: string
                }
                Insert: {
                    active_count?: number
                    agent_id: string
                    created_at?: string
                    date: string
                    id?: string
                    inactive_count?: number
                    prospective_count?: number
                    updated_at?: string
                }
                Update: {
                    active_count?: number
                    agent_id?: string
                    created_at?: string
                    date?: string
                    id?: string
                    inactive_count?: number
                    prospective_count?: number
                    updated_at?: string
                }
                Relationships: [
                    {
                        foreignKeyName: "agent_customer_breakdown_agent_id_fkey"
                        columns: ["agent_id"]
                        isOneToOne: false
                        referencedRelation: "profiles"
                        referencedColumns: ["id"]
                    },
                ]
            }
            agent_sales_summary: {
                Row: {
                    agent_id: string
                    created_at: string
                    date: string
                    id: string
                    sales_count: number
                    total_sales: number
                    updated_at: string
                }
                Insert: {
                    agent_id: string
                    created_at?: string
                    date: string
                    id?: string
                    sales_count?: number
                    total_sales?: number
                    updated_at?: string
                }
                Update: {
                    agent_id?: string
                    created_at?: string
                    date?: string
                    id?: string
                    sales_count?: number
                    total_sales?: number
                    updated_at?: string
                }
                Relationships: [
                    {
                        foreignKeyName: "agent_sales_summary_agent_id_fkey"
                        columns: ["agent_id"]
                        isOneToOne: false
                        referencedRelation: "profiles"
                        referencedColumns: ["id"]
                    },
                ]
            }
            contacts: {
                Row: {
                    address: string | null
                    birthday: string | null
                    city: string | null
                    company: string
                    contact_person: string | null
                    created_at: string
                    customer_service_representative: string | null
                    email: string
                    id: string
                    keywords: string[] | null
                    mobile_number: string | null
                    notes: string | null
                    phone_number: string | null
                    province: string | null
                    sales_person: string | null
                    source: string | null
                    status: string
                    telephone_number: string | null
                    tin: string | null
                    transactionType: string
                    type: string
                    updated_at: string
                    website: string | null
                    zip_code: string | null
                }
                Insert: {
                    address?: string | null
                    birthday?: string | null
                    city?: string | null
                    company: string
                    contact_person?: string | null
                    created_at?: string
                    customer_service_representative?: string | null
                    email?: string
                    id?: string
                    keywords?: string[] | null
                    mobile_number?: string | null
                    notes?: string | null
                    phone_number?: string | null
                    province?: string | null
                    sales_person?: string | null
                    source?: string | null
                    status?: string
                    telephone_number?: string | null
                    tin?: string | null
                    transactionType?: string
                    type?: string
                    updated_at?: string
                    website?: string | null
                    zip_code?: string | null
                }
                Update: {
                    address?: string | null
                    birthday?: string | null
                    city?: string | null
                    company?: string
                    contact_person?: string | null
                    created_at?: string
                    customer_service_representative?: string | null
                    email?: string
                    id?: string
                    keywords?: string[] | null
                    mobile_number?: string | null
                    notes?: string | null
                    phone_number?: string | null
                    province?: string | null
                    sales_person?: string | null
                    source?: string | null
                    status?: string
                    telephone_number?: string | null
                    tin?: string | null
                    transactionType?: string
                    type?: string
                    updated_at?: string
                    website?: string | null
                    zip_code?: string | null
                }
                Relationships: []
            }
            invoice_items: {
                Row: {
                    amount: number | null
                    created_at: string
                    description: string | null
                    discount: number | null
                    id: string
                    invoice_id: string
                    is_vat_inclusive: boolean | null
                    item_code: string | null
                    item_id: string | null
                    qty: number
                    unit_price: number | null
                    updated_at: string
                    vat_amount: number | null
                }
                Insert: {
                    amount?: number | null
                    created_at?: string
                    description?: string | null
                    discount?: number | null
                    id?: string
                    invoice_id: string
                    is_vat_inclusive?: boolean | null
                    item_code?: string | null
                    item_id?: string | null
                    qty: number
                    unit_price?: number | null
                    updated_at?: string
                    vat_amount?: number | null
                }
                Update: {
                    amount?: number | null
                    created_at?: string
                    description?: string | null
                    discount?: number | null
                    id?: string
                    invoice_id?: string
                    is_vat_inclusive?: boolean | null
                    item_code?: string | null
                    item_id?: string | null
                    qty?: number
                    unit_price?: number | null
                    updated_at?: string
                    vat_amount?: number | null
                }
                Relationships: [
                    {
                        foreignKeyName: "invoice_items_invoice_id_fkey"
                        columns: ["invoice_id"]
                        isOneToOne: false
                        referencedRelation: "invoices"
                        referencedColumns: ["id"]
                    },
                    {
                        foreignKeyName: "invoice_items_item_id_fkey"
                        columns: ["item_id"]
                        isOneToOne: false
                        referencedRelation: "products"
                        referencedColumns: ["id"]
                    },
                ]
            }
            invoices: {
                Row: {
                    approved_at: string | null
                    approved_by: string | null
                    contact_id: string
                    created_at: string
                    created_by: string
                    delivery_date: string | null
                    discount_amount: number | null
                    discount_rate: number | null
                    due_date: string
                    grand_total: number
                    id: string
                    invoice_date: string
                    invoice_no: string
                    notes: string | null
                    payment_terms: string | null
                    status: string
                    subtotal: number
                    updated_at: string
                    vat_amount: number | null
                }
                Insert: {
                    approved_at?: string | null
                    approved_by?: string | null
                    contact_id: string
                    created_at?: string
                    created_by: string
                    delivery_date?: string | null
                    discount_amount?: number | null
                    discount_rate?: number | null
                    due_date: string
                    grand_total?: number
                    id?: string
                    invoice_date: string
                    invoice_no: string
                    notes?: string | null
                    payment_terms?: string | null
                    status?: string
                    subtotal?: number
                    updated_at?: string
                    vat_amount?: number | null
                }
                Update: {
                    approved_at?: string | null
                    approved_by?: string | null
                    contact_id?: string
                    created_at?: string
                    created_by?: string
                    delivery_date?: string | null
                    discount_amount?: number | null
                    discount_rate?: number | null
                    due_date?: string
                    grand_total?: number
                    id?: string
                    invoice_date?: string
                    invoice_no?: string
                    notes?: string | null
                    payment_terms?: string | null
                    status?: string
                    subtotal?: number
                    updated_at?: string
                    vat_amount?: number | null
                }
                Relationships: [
                    {
                        foreignKeyName: "invoices_contact_id_fkey"
                        columns: ["contact_id"]
                        isOneToOne: false
                        referencedRelation: "contacts"
                        referencedColumns: ["id"]
                    },
                ]
            }
            order_slip_items: {
                Row: {
                    amount: number | null
                    created_at: string
                    description: string | null
                    discount: number | null
                    id: string
                    is_vat_inclusive: boolean | null
                    item_code: string | null
                    item_id: string | null
                    qty: number
                    slip_id: string
                    unit_price: number | null
                    updated_at: string
                    vat_amount: number | null
                }
                Insert: {
                    amount?: number | null
                    created_at?: string
                    description?: string | null
                    discount?: number | null
                    id?: string
                    is_vat_inclusive?: boolean | null
                    item_code?: string | null
                    item_id?: string | null
                    qty: number
                    slip_id: string
                    unit_price?: number | null
                    updated_at?: string
                    vat_amount?: number | null
                }
                Update: {
                    amount?: number | null
                    created_at?: string
                    description?: string | null
                    discount?: number | null
                    id?: string
                    is_vat_inclusive?: boolean | null
                    item_code?: string | null
                    item_id?: string | null
                    qty?: number
                    slip_id?: string
                    unit_price?: number | null
                    updated_at?: string
                    vat_amount?: number | null
                }
                Relationships: [
                    {
                        foreignKeyName: "order_slip_items_item_id_fkey"
                        columns: ["item_id"]
                        isOneToOne: false
                        referencedRelation: "products"
                        referencedColumns: ["id"]
                    },
                    {
                        foreignKeyName: "order_slip_items_slip_id_fkey"
                        columns: ["slip_id"]
                        isOneToOne: false
                        referencedRelation: "order_slips"
                        referencedColumns: ["id"]
                    },
                ]
            }
            order_slips: {
                Row: {
                    approved_at: string | null
                    approved_by: string | null
                    contact_id: string
                    created_at: string
                    created_by: string
                    delivery_date: string | null
                    discount_amount: number | null
                    discount_rate: number | null
                    grand_total: number
                    id: string
                    notes: string | null
                    payment_terms: string | null
                    sales_order_id: string | null
                    slip_date: string
                    slip_no: string
                    status: string
                    subtotal: number
                    updated_at: string
                    vat_amount: number | null
                }
                Insert: {
                    approved_at?: string | null
                    approved_by?: string | null
                    contact_id: string
                    created_at?: string
                    created_by: string
                    delivery_date?: string | null
                    discount_amount?: number | null
                    discount_rate?: number | null
                    grand_total?: number
                    id?: string
                    notes?: string | null
                    payment_terms?: string | null
                    sales_order_id?: string | null
                    slip_date: string
                    slip_no: string
                    status?: string
                    subtotal?: number
                    updated_at?: string
                    vat_amount?: number | null
                }
                Update: {
                    approved_at?: string | null
                    approved_by?: string | null
                    contact_id?: string
                    created_at?: string
                    created_by?: string
                    delivery_date?: string | null
                    discount_amount?: number | null
                    discount_rate?: number | null
                    grand_total?: number
                    id?: string
                    notes?: string | null
                    payment_terms?: string | null
                    sales_order_id?: string | null
                    slip_date?: string
                    slip_no?: string
                    status?: string
                    subtotal?: number
                    updated_at?: string
                    vat_amount?: number | null
                }
                Relationships: [
                    {
                        foreignKeyName: "order_slips_contact_id_fkey"
                        columns: ["contact_id"]
                        isOneToOne: false
                        referencedRelation: "contacts"
                        referencedColumns: ["id"]
                    },
                    {
                        foreignKeyName: "order_slips_sales_order_id_fkey"
                        columns: ["sales_order_id"]
                        isOneToOne: false
                        referencedRelation: "sales_orders"
                        referencedColumns: ["id"]
                    },
                ]
            }
            products: {
                Row: {
                    alert_level: number | null
                    category: string | null
                    cost_price: number | null
                    created_at: string
                    created_by: string | null
                    description: string | null
                    id: string
                    image_url: string | null
                    item_code: string
                    location: string | null
                    old_system_id: string | null
                    part_no: string | null
                    quantity: number
                    reorder_point: number | null
                    srp_price: number | null
                    supplier: string | null
                    unit: string | null
                    updated_at: string
                }
                Insert: {
                    alert_level?: number | null
                    category?: string | null
                    cost_price?: number | null
                    created_at?: string
                    created_by?: string | null
                    description?: string | null
                    id?: string
                    image_url?: string | null
                    item_code: string
                    location?: string | null
                    old_system_id?: string | null
                    part_no?: string | null
                    quantity?: number
                    reorder_point?: number | null
                    srp_price?: number | null
                    supplier?: string | null
                    unit?: string | null
                    updated_at?: string
                }
                Update: {
                    alert_level?: number | null
                    category?: string | null
                    cost_price?: number | null
                    created_at?: string
                    created_by?: string | null
                    description?: string | null
                    id?: string
                    image_url?: string | null
                    item_code?: string
                    location?: string | null
                    old_system_id?: string | null
                    part_no?: string | null
                    quantity?: number
                    reorder_point?: number | null
                    srp_price?: number | null
                    supplier?: string | null
                    unit?: string | null
                    updated_at?: string
                }
                Relationships: []
            }
            profiles: {
                Row: {
                    access_rights: string[] | null
                    avatar_url: string | null
                    created_at: string
                    email: string
                    full_name: string | null
                    id: string
                    role: string
                    updated_at: string
                }
                Insert: {
                    access_rights?: string[] | null
                    avatar_url?: string | null
                    created_at?: string
                    email: string
                    full_name?: string | null
                    id: string
                    role?: string
                    updated_at?: string
                }
                Update: {
                    access_rights?: string[] | null
                    avatar_url?: string | null
                    created_at?: string
                    email?: string
                    full_name?: string | null
                    id?: string
                    role?: string
                    updated_at?: string
                }
                Relationships: []
            }
            purchase_order_items: {
                Row: {
                    amount: number | null
                    created_at: string
                    eta_date: string | null
                    id: string
                    item_id: string
                    notes: string | null
                    po_id: string
                    qty: number | null
                    quantity_received: number | null
                    unit_price: number | null
                }
                Insert: {
                    amount?: number | null
                    created_at?: string
                    eta_date?: string | null
                    id?: string
                    item_id: string
                    notes?: string | null
                    po_id: string
                    qty?: number | null
                    quantity_received?: number | null
                    unit_price?: number | null
                }
                Update: {
                    amount?: number | null
                    created_at?: string
                    eta_date?: string | null
                    id?: string
                    item_id?: string
                    notes?: string | null
                    po_id?: string
                    qty?: number | null
                    quantity_received?: number | null
                    unit_price?: number | null
                }
                Relationships: [
                    {
                        foreignKeyName: "purchase_order_items_item_id_fkey"
                        columns: ["item_id"]
                        isOneToOne: false
                        referencedRelation: "products"
                        referencedColumns: ["id"]
                    },
                    {
                        foreignKeyName: "purchase_order_items_po_id_fkey"
                        columns: ["po_id"]
                        isOneToOne: false
                        referencedRelation: "purchase_orders"
                        referencedColumns: ["id"]
                    },
                ]
            }
            purchase_orders: {
                Row: {
                    amount: number | null
                    approved_at: string | null
                    approved_by: string | null
                    created_at: string
                    created_by: string
                    delivery_date: string | null
                    grand_total: number | null
                    id: string
                    notes: string | null
                    order_date: string
                    payment_terms: string | null
                    po_number: string
                    pr_reference: string | null
                    remarks: string | null
                    status: string
                    supplier_id: string
                    supplier_name: string | null
                    updated_at: string
                    warehouse_id: string | null
                }
                Insert: {
                    amount?: number | null
                    approved_at?: string | null
                    approved_by?: string | null
                    created_at?: string
                    created_by: string
                    delivery_date?: string | null
                    grand_total?: number | null
                    id?: string
                    notes?: string | null
                    order_date: string
                    payment_terms?: string | null
                    po_number: string
                    pr_reference?: string | null
                    remarks?: string | null
                    status?: string
                    supplier_id: string
                    supplier_name?: string | null
                    updated_at?: string
                    warehouse_id?: string | null
                }
                Update: {
                    amount?: number | null
                    approved_at?: string | null
                    approved_by?: string | null
                    created_at?: string
                    created_by?: string
                    delivery_date?: string | null
                    grand_total?: number | null
                    id?: string
                    notes?: string | null
                    order_date?: string
                    payment_terms?: string | null
                    po_number?: string
                    pr_reference?: string | null
                    remarks?: string | null
                    status?: string
                    supplier_id?: string
                    supplier_name?: string | null
                    updated_at?: string
                    warehouse_id?: string | null
                }
                Relationships: [
                    {
                        foreignKeyName: "purchase_orders_supplier_id_fkey"
                        columns: ["supplier_id"]
                        isOneToOne: false
                        referencedRelation: "contacts"
                        referencedColumns: ["id"]
                    },
                ]
            }
            quick_responses: {
                Row: {
                    category: string
                    content: string
                    created_at: string
                    created_by: string | null
                    id: string
                    shortcut: string | null
                    title: string
                    updated_at: string
                    usage_count: number | null
                }
                Insert: {
                    category?: string
                    content: string
                    created_at?: string
                    created_by?: string | null
                    id?: string
                    shortcut?: string | null
                    title: string
                    updated_at?: string
                    usage_count?: number | null
                }
                Update: {
                    category?: string
                    content?: string
                    created_at?: string
                    created_by?: string | null
                    id?: string
                    shortcut?: string | null
                    title?: string
                    updated_at?: string
                    usage_count?: number | null
                }
                Relationships: []
            }
            sales_incentives: {
                Row: {
                    action: string
                    agent_id: string
                    amount: number
                    created_at: string
                    date: string
                    description: string | null
                    id: string
                    updated_at: string
                }
                Insert: {
                    action: string
                    agent_id: string
                    amount?: number
                    created_at?: string
                    date: string
                    description?: string | null
                    id?: string
                    updated_at?: string
                }
                Update: {
                    action?: string
                    agent_id?: string
                    amount?: number
                    created_at?: string
                    date?: string
                    description?: string | null
                    id?: string
                    updated_at?: string
                }
                Relationships: [
                    {
                        foreignKeyName: "sales_incentives_agent_id_fkey"
                        columns: ["agent_id"]
                        isOneToOne: false
                        referencedRelation: "profiles"
                        referencedColumns: ["id"]
                    },
                ]
            }
            sales_inquiries: {
                Row: {
                    assigned_to: string | null
                    company_name: string | null
                    contact_email: string | null
                    contact_person: string | null
                    contact_phone: string | null
                    created_at: string
                    created_by: string | null
                    customer_type: string | null
                    id: string
                    inquiry_date: string
                    inquiry_number: string
                    last_contact_date: string | null
                    notes: string | null
                    priority: string
                    product_interest: string[] | null
                    source: string | null
                    stage: string
                    status: string
                    tags: string[] | null
                    updated_at: string
                }
                Insert: {
                    assigned_to?: string | null
                    company_name?: string | null
                    contact_email?: string | null
                    contact_person?: string | null
                    contact_phone?: string | null
                    created_at?: string
                    created_by?: string | null
                    customer_type?: string | null
                    id?: string
                    inquiry_date?: string
                    inquiry_number: string
                    last_contact_date?: string | null
                    notes?: string | null
                    priority?: string
                    product_interest?: string[] | null
                    source?: string | null
                    stage: string
                    status?: string
                    tags?: string[] | null
                    updated_at?: string
                }
                Update: {
                    assigned_to?: string | null
                    company_name?: string | null
                    contact_email?: string | null
                    contact_person?: string | null
                    contact_phone?: string | null
                    created_at?: string
                    created_by?: string | null
                    customer_type?: string | null
                    id?: string
                    inquiry_date?: string
                    inquiry_number?: string
                    last_contact_date?: string | null
                    notes?: string | null
                    priority?: string
                    product_interest?: string[] | null
                    source?: string | null
                    stage?: string
                    status?: string
                    tags?: string[] | null
                    updated_at?: string
                }
                Relationships: [
                    {
                        foreignKeyName: "sales_inquiries_assigned_to_fkey"
                        columns: ["assigned_to"]
                        isOneToOne: false
                        referencedRelation: "profiles"
                        referencedColumns: ["id"]
                    },
                ]
            }
            sales_order_items: {
                Row: {
                    amount: number | null
                    created_at: string
                    description: string | null
                    discount: number | null
                    id: string
                    is_vat_inclusive: boolean | null
                    item_code: string | null
                    item_id: string | null
                    order_id: string
                    qty: number
                    unit_price: number | null
                    updated_at: string
                    vat_amount: number | null
                }
                Insert: {
                    amount?: number | null
                    created_at?: string
                    description?: string | null
                    discount?: number | null
                    id?: string
                    is_vat_inclusive?: boolean | null
                    item_code?: string | null
                    item_id?: string | null
                    order_id: string
                    qty: number
                    unit_price?: number | null
                    updated_at?: string
                    vat_amount?: number | null
                }
                Update: {
                    amount?: number | null
                    created_at?: string
                    description?: string | null
                    discount?: number | null
                    id?: string
                    is_vat_inclusive?: boolean | null
                    item_code?: string | null
                    item_id?: string | null
                    order_id?: string
                    qty?: number
                    unit_price?: number | null
                    updated_at?: string
                    vat_amount?: number | null
                }
                Relationships: [
                    {
                        foreignKeyName: "sales_order_items_item_id_fkey"
                        columns: ["item_id"]
                        isOneToOne: false
                        referencedRelation: "products"
                        referencedColumns: ["id"]
                    },
                    {
                        foreignKeyName: "sales_order_items_order_id_fkey"
                        columns: ["order_id"]
                        isOneToOne: false
                        referencedRelation: "sales_orders"
                        referencedColumns: ["id"]
                    },
                ]
            }
            sales_orders: {
                Row: {
                    approved_at: string | null
                    approved_by: string | null
                    contact_id: string
                    created_at: string
                    created_by: string
                    delivery_date: string | null
                    discount_amount: number | null
                    discount_rate: number | null
                    grand_total: number
                    id: string
                    notes: string | null
                    order_no: string
                    payment_terms: string | null
                    sales_date: string
                    sales_person: string | null
                    status: string
                    subtotal: number
                    updated_at: string
                    vat_amount: number | null
                }
                Insert: {
                    approved_at?: string | null
                    approved_by?: string | null
                    contact_id: string
                    created_at?: string
                    created_by: string
                    delivery_date?: string | null
                    discount_amount?: number | null
                    discount_rate?: number | null
                    grand_total?: number
                    id?: string
                    notes?: string | null
                    order_no: string
                    payment_terms?: string | null
                    sales_date: string
                    sales_person?: string | null
                    status?: string
                    subtotal?: number
                    updated_at?: string
                    vat_amount?: number | null
                }
                Update: {
                    approved_at?: string | null
                    approved_by?: string | null
                    contact_id?: string
                    created_at?: string
                    created_by?: string
                    delivery_date?: string | null
                    discount_amount?: number | null
                    discount_rate?: number | null
                    grand_total?: number
                    id?: string
                    notes?: string | null
                    order_no?: string
                    payment_terms?: string | null
                    sales_date?: string
                    sales_person?: string | null
                    status?: string
                    subtotal?: number
                    updated_at?: string
                    vat_amount?: number | null
                }
                Relationships: [
                    {
                        foreignKeyName: "sales_orders_contact_id_fkey"
                        columns: ["contact_id"]
                        isOneToOne: false
                        referencedRelation: "contacts"
                        referencedColumns: ["id"]
                    },
                ]
            }
            tasks: {
                Row: {
                    assigned_to: string
                    completed_at: string | null
                    created_at: string
                    created_by: string | null
                    description: string | null
                    due_date: string
                    id: string
                    link: string | null
                    priority: string
                    related_to: string | null
                    related_to_type: string | null
                    status: string
                    title: string
                    updated_at: string
                }
                Insert: {
                    assigned_to: string
                    completed_at?: string | null
                    created_at?: string
                    created_by?: string | null
                    description?: string | null
                    due_date: string
                    id?: string
                    link?: string | null
                    priority?: string
                    related_to?: string | null
                    related_to_type?: string | null
                    status?: string
                    title: string
                    updated_at?: string
                }
                Update: {
                    assigned_to?: string
                    completed_at?: string | null
                    created_at?: string
                    created_by?: string | null
                    description?: string | null
                    due_date?: string
                    id?: string
                    link?: string | null
                    priority?: string
                    related_to?: string | null
                    related_to_type?: string | null
                    status?: string
                    title?: string
                    updated_at?: string
                }
                Relationships: [
                    {
                        foreignKeyName: "tasks_assigned_to_fkey"
                        columns: ["assigned_to"]
                        isOneToOne: false
                        referencedRelation: "profiles"
                        referencedColumns: ["id"]
                    },
                ]
            }
            workflow_settings: {
                Row: {
                    created_at: string
                    id: string
                    invoice_requires_approval: boolean | null
                    order_slip_requires_approval: boolean | null
                    sales_order_requires_approval: boolean | null
                    updated_at: string
                }
                Insert: {
                    created_at?: string
                    id?: string
                    invoice_requires_approval?: boolean | null
                    order_slip_requires_approval?: boolean | null
                    sales_order_requires_approval?: boolean | null
                    updated_at?: string
                }
                Update: {
                    created_at?: string
                    id?: string
                    invoice_requires_approval?: boolean | null
                    order_slip_requires_approval?: boolean | null
                    sales_order_requires_approval?: boolean | null
                    updated_at?: string
                }
                Relationships: []
            }
        }
        Views: {
            [_ in never]: never
        }
        Functions: {
            get_monthly_agent_performance: {
                Args: {
                    start_date: string
                    end_date: string
                }
                Returns: {
                    agent_name: string
                    total_sales: number
                    sales_count: number
                    active_customers: number
                    prospects: number
                }[]
            }
            get_sales_development_report: {
                Args: {
                    report_type: string
                    start_date: string
                    end_date: string
                }
                Returns: {
                    category: string
                    item_code: string
                    description: string
                    total_qty: number
                    total_value: number
                    last_inquiry_date: string
                    inquiry_count: number
                }[]
            }
        }
        Enums: {
            [_ in never]: never
        }
        CompositeTypes: {
            [_ in never]: never
        }
    }
}

export type Tables<
    PublicTableNameOrOptions extends
    | keyof (Database["public"]["Tables"] & Database["public"]["Views"])
    | { schema: keyof Database },
    TableName extends PublicTableNameOrOptions extends { schema: keyof Database }
    ? keyof (Database[PublicTableNameOrOptions["schema"]]["Tables"] &
        Database[PublicTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = PublicTableNameOrOptions extends { schema: keyof Database }
    ? (Database[PublicTableNameOrOptions["schema"]]["Tables"] &
        Database[PublicTableNameOrOptions["schema"]]["Views"])[TableName] extends {
            Row: infer R
        }
    ? R
    : never
    : PublicTableNameOrOptions extends keyof (Database["public"]["Tables"] &
        Database["public"]["Views"])
    ? (Database["public"]["Tables"] &
        Database["public"]["Views"])[PublicTableNameOrOptions] extends {
            Row: infer R
        }
    ? R
    : never
    : never

export type TablesInsert<
    PublicTableNameOrOptions extends
    | keyof Database["public"]["Tables"]
    | { schema: keyof Database },
    TableName extends PublicTableNameOrOptions extends { schema: keyof Database }
    ? keyof Database[PublicTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = PublicTableNameOrOptions extends { schema: keyof Database }
    ? Database[PublicTableNameOrOptions["schema"]]["Tables"][TableName] extends {
        Insert: infer I
    }
    ? I
    : never
    : PublicTableNameOrOptions extends keyof Database["public"]["Tables"]
    ? Database["public"]["Tables"][PublicTableNameOrOptions] extends {
        Insert: infer I
    }
    ? I
    : never
    : never

export type TablesUpdate<
    PublicTableNameOrOptions extends
    | keyof Database["public"]["Tables"]
    | { schema: keyof Database },
    TableName extends PublicTableNameOrOptions extends { schema: keyof Database }
    ? keyof Database[PublicTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = PublicTableNameOrOptions extends {
    schema: keyof Database
}
    ? Database[PublicTableNameOrOptions["schema"]]["Tables"][TableName] extends {
        Update: infer U
    }
    ? U
    : never
    : PublicTableNameOrOptions extends keyof Database["public"]["Tables"]
    ? Database["public"]["Tables"][PublicTableNameOrOptions] extends {
        Update: infer U
    }
    ? U
    : never
    : never

export type Enums<
    PublicEnumNameOrOptions extends
    | keyof Database["public"]["Enums"]
    | { schema: keyof Database },
    EnumName extends PublicEnumNameOrOptions extends { schema: keyof Database }
    ? keyof Database[PublicEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = PublicEnumNameOrOptions extends { schema: keyof Database }
    ? Database[PublicEnumNameOrOptions["schema"]]["Enums"][EnumName]
    : PublicEnumNameOrOptions extends keyof Database["public"]["Enums"]
    ? Database["public"]["Enums"][PublicEnumNameOrOptions]
    : never
