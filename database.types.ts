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
            branch_inventory_transfer_items: {
                Row: {
                    amount: number
                    created_at: string | null
                    id: string
                    item_id: string | null
                    notes: string | null
                    price: number
                    qty: number
                    transfer_id: string | null
                    unit: string | null
                }
                Insert: {
                    amount?: number
                    created_at?: string | null
                    id?: string
                    item_id?: string | null
                    notes?: string | null
                    price?: number
                    qty?: number
                    transfer_id?: string | null
                    unit?: string | null
                }
                Update: {
                    amount?: number
                    created_at?: string | null
                    id?: string
                    item_id?: string | null
                    notes?: string | null
                    price?: number
                    qty?: number
                    transfer_id?: string | null
                    unit?: string | null
                }
                Relationships: [
                    {
                        foreignKeyName: "branch_inventory_transfer_items_item_id_fkey"
                        columns: ["item_id"]
                        isOneToOne: false
                        referencedRelation: "products"
                        referencedColumns: ["id"]
                    },
                    {
                        foreignKeyName: "branch_inventory_transfer_items_transfer_id_fkey"
                        columns: ["transfer_id"]
                        isOneToOne: false
                        referencedRelation: "branch_inventory_transfers"
                        referencedColumns: ["id"]
                    },
                ]
            }
            branch_inventory_transfers: {
                Row: {
                    approved_at: string | null
                    approved_by: string | null
                    branch_to: string
                    created_at: string | null
                    created_by: string | null
                    date: string | null
                    id: string
                    reason: string | null
                    ref_no: string | null
                    status: string
                    total_items: number
                    updated_at: string | null
                    vehicle_plate_no: string | null
                }
                Insert: {
                    approved_at?: string | null
                    approved_by?: string | null
                    branch_to: string
                    created_at?: string | null
                    created_by?: string | null
                    date?: string | null
                    id?: string
                    reason?: string | null
                    ref_no?: string | null
                    status?: string
                    total_items?: number
                    updated_at?: string | null
                    vehicle_plate_no?: string | null
                }
                Update: {
                    approved_at?: string | null
                    approved_by?: string | null
                    branch_to?: string
                    created_at?: string | null
                    created_by?: string | null
                    date?: string | null
                    id?: string
                    reason?: string | null
                    ref_no?: string | null
                    status?: string
                    total_items?: number
                    updated_at?: string | null
                    vehicle_plate_no?: string | null
                }
                Relationships: []
            }
            contact_comments: {
                Row: {
                    comment: string
                    contact_id: string
                    created_at: string | null
                    created_by: string
                    id: string
                }
                Insert: {
                    comment: string
                    contact_id: string
                    created_at?: string | null
                    created_by: string
                    id?: string
                }
                Update: {
                    comment?: string
                    contact_id?: string
                    created_at?: string | null
                    created_by?: string
                    id?: string
                }
                Relationships: [
                    {
                        foreignKeyName: "contact_comments_contact_id_fkey"
                        columns: ["contact_id"]
                        isOneToOne: false
                        referencedRelation: "contacts"
                        referencedColumns: ["id"]
                    },
                ]
            }
            contact_interactions: {
                Row: {
                    contact_id: string
                    created_at: string | null
                    created_by: string
                    date: string
                    details: string | null
                    id: string
                    type: string
                }
                Insert: {
                    contact_id: string
                    created_at?: string | null
                    created_by: string
                    date?: string
                    details?: string | null
                    id?: string
                    type: string
                }
                Update: {
                    contact_id?: string
                    created_at?: string | null
                    created_by?: string
                    date?: string
                    details?: string | null
                    id?: string
                    type?: string
                }
                Relationships: [
                    {
                        foreignKeyName: "contact_interactions_contact_id_fkey"
                        columns: ["contact_id"]
                        isOneToOne: false
                        referencedRelation: "contacts"
                        referencedColumns: ["id"]
                    },
                ]
            }
            contacts: {
                Row: {
                    address: string | null
                    aiReasoning: string | null
                    aiScore: number | null
                    area: string | null
                    assignedAgent: string | null
                    avatar: string | null
                    balance: number | null
                    businessLine: string | null
                    city: string | null
                    comments: Json | null
                    company: string
                    contactPersons: Json | null
                    created_at: string | null
                    creditLimit: number | null
                    customerSince: string | null
                    dealershipQuota: number | null
                    dealershipSince: string | null
                    dealershipTerms: string | null
                    dealValue: number | null
                    debtType: string | null
                    deleted_at: string | null
                    deliveryAddress: string | null
                    email: string | null
                    id: string
                    interactions: Json | null
                    is_deleted: boolean | null
                    isHidden: boolean | null
                    lastContactDate: string | null
                    mobile: string | null
                    name: string | null
                    nextBestAction: string | null
                    officeAddress: string | null
                    pastName: string | null
                    phone: string | null
                    priceGroup: string | null
                    province: string | null
                    referBy: string | null
                    salesByYear: Json | null
                    salesHistory: Json | null
                    salesman: string | null
                    shippingAddress: string | null
                    stage: string | null
                    status: string | null
                    team: string | null
                    terms: string | null
                    tin: string | null
                    title: string | null
                    topProducts: Json | null
                    totalSales: number | null
                    transactionType: string | null
                    updated_at: string | null
                    vatPercentage: string | null
                    vatType: string | null
                    winProbability: number | null
                }
                Insert: {
                    address?: string | null
                    aiReasoning?: string | null
                    aiScore?: number | null
                    area?: string | null
                    assignedAgent?: string | null
                    avatar?: string | null
                    balance?: number | null
                    businessLine?: string | null
                    city?: string | null
                    comments?: Json | null
                    company: string
                    contactPersons?: Json | null
                    created_at?: string | null
                    creditLimit?: number | null
                    customerSince?: string | null
                    dealershipQuota?: number | null
                    dealershipSince?: string | null
                    dealershipTerms?: string | null
                    dealValue?: number | null
                    debtType?: string | null
                    deleted_at?: string | null
                    deliveryAddress?: string | null
                    email?: string | null
                    id?: string
                    interactions?: Json | null
                    is_deleted?: boolean | null
                    isHidden?: boolean | null
                    lastContactDate?: string | null
                    mobile?: string | null
                    name?: string | null
                    nextBestAction?: string | null
                    officeAddress?: string | null
                    pastName?: string | null
                    phone?: string | null
                    priceGroup?: string | null
                    province?: string | null
                    referBy?: string | null
                    salesByYear?: Json | null
                    salesHistory?: Json | null
                    salesman?: string | null
                    shippingAddress?: string | null
                    stage?: string | null
                    status?: string | null
                    team?: string | null
                    terms?: string | null
                    tin?: string | null
                    title?: string | null
                    topProducts?: Json | null
                    totalSales?: number | null
                    transactionType?: string | null
                    updated_at?: string | null
                    vatPercentage?: string | null
                    vatType?: string | null
                    winProbability?: number | null
                }
                Update: {
                    address?: string | null
                    aiReasoning?: string | null
                    aiScore?: number | null
                    area?: string | null
                    assignedAgent?: string | null
                    avatar?: string | null
                    balance?: number | null
                    businessLine?: string | null
                    city?: string | null
                    comments?: Json | null
                    company?: string
                    contactPersons?: Json | null
                    created_at?: string | null
                    creditLimit?: number | null
                    customerSince?: string | null
                    dealershipQuota?: number | null
                    dealershipSince?: string | null
                    dealershipTerms?: string | null
                    dealValue?: number | null
                    debtType?: string | null
                    deleted_at?: string | null
                    deliveryAddress?: string | null
                    email?: string | null
                    id?: string
                    interactions?: Json | null
                    is_deleted?: boolean | null
                    isHidden?: boolean | null
                    lastContactDate?: string | null
                    mobile?: string | null
                    name?: string | null
                    nextBestAction?: string | null
                    officeAddress?: string | null
                    pastName?: string | null
                    phone?: string | null
                    priceGroup?: string | null
                    province?: string | null
                    referBy?: string | null
                    salesByYear?: Json | null
                    salesHistory?: Json | null
                    salesman?: string | null
                    shippingAddress?: string | null
                    stage?: string | null
                    status?: string | null
                    team?: string | null
                    terms?: string | null
                    tin?: string | null
                    title?: string | null
                    topProducts?: Json | null
                    totalSales?: number | null
                    transactionType?: string | null
                    updated_at?: string | null
                    vatPercentage?: string | null
                    vatType?: string | null
                    winProbability?: number | null
                }
                Relationships: []
            }
            delivery_receipt_items: {
                Row: {
                    created_at: string | null
                    dr_id: string
                    id: string
                    item_code: string | null
                    item_id: string
                    part_number: string | null
                    price: number
                    qty: number
                }
                Insert: {
                    created_at?: string | null
                    dr_id: string
                    id?: string
                    item_code?: string | null
                    item_id: string
                    part_number?: string | null
                    price?: number
                    qty?: number
                }
                Update: {
                    created_at?: string | null
                    dr_id?: string
                    id?: string
                    item_code?: string | null
                    item_id?: string
                    part_number?: string | null
                    price?: number
                    qty?: number
                }
                Relationships: [
                    {
                        foreignKeyName: "delivery_receipt_items_dr_id_fkey"
                        columns: ["dr_id"]
                        isOneToOne: false
                        referencedRelation: "delivery_receipts"
                        referencedColumns: ["id"]
                    },
                    {
                        foreignKeyName: "delivery_receipt_items_item_id_fkey"
                        columns: ["item_id"]
                        isOneToOne: false
                        referencedRelation: "products"
                        referencedColumns: ["id"]
                    },
                ]
            }
            delivery_receipts: {
                Row: {
                    created_at: string | null
                    created_by: string | null
                    customer_id: string
                    date: string
                    dr_number: string
                    encoded_by: string | null
                    id: string
                    is_deleted: boolean | null
                    notes: string | null
                    sales_agent: string | null
                    total_amount: number | null
                    updated_at: string | null
                }
                Insert: {
                    created_at?: string | null
                    created_by?: string | null
                    customer_id: string
                    date: string
                    dr_number: string
                    encoded_by?: string | null
                    id?: string
                    is_deleted?: boolean | null
                    notes?: string | null
                    sales_agent?: string | null
                    total_amount?: number | null
                    updated_at?: string | null
                }
                Update: {
                    created_at?: string | null
                    created_by?: string | null
                    customer_id?: string
                    date?: string
                    dr_number?: string
                    encoded_by?: string | null
                    id?: string
                    is_deleted?: boolean | null
                    notes?: string | null
                    sales_agent?: string | null
                    total_amount?: number | null
                    updated_at?: string | null
                }
                Relationships: [
                    {
                        foreignKeyName: "delivery_receipts_customer_id_fkey"
                        columns: ["customer_id"]
                        isOneToOne: false
                        referencedRelation: "contacts"
                        referencedColumns: ["id"]
                    },
                ]
            }
            discount_requests: {
                Row: {
                    approved_at: string | null
                    approved_by: string | null
                    branch_id: string | null
                    created_at: string | null
                    customer_id: string | null
                    discount_percentage: number
                    id: string
                    item_id: string
                    new_price: number
                    original_price: number
                    reason: string | null
                    requested_by: string
                    status: string | null
                    updated_at: string | null
                }
                Insert: {
                    approved_at?: string | null
                    approved_by?: string | null
                    branch_id?: string | null
                    created_at?: string | null
                    customer_id?: string | null
                    discount_percentage: number
                    id?: string
                    item_id: string
                    new_price: number
                    original_price: number
                    reason?: string | null
                    requested_by: string
                    status?: string | null
                    updated_at?: string | null
                }
                Update: {
                    approved_at?: string | null
                    approved_by?: string | null
                    branch_id?: string | null
                    created_at?: string | null
                    customer_id?: string | null
                    discount_percentage?: number
                    id?: string
                    item_id?: string
                    new_price?: number
                    original_price?: number
                    reason?: string | null
                    requested_by?: string
                    status?: string | null
                    updated_at?: string | null
                }
                Relationships: [
                    {
                        foreignKeyName: "discount_requests_customer_id_fkey"
                        columns: ["customer_id"]
                        isOneToOne: false
                        referencedRelation: "contacts"
                        referencedColumns: ["id"]
                    },
                    {
                        foreignKeyName: "discount_requests_item_id_fkey"
                        columns: ["item_id"]
                        isOneToOne: false
                        referencedRelation: "products"
                        referencedColumns: ["id"]
                    },
                ]
            }
            inventory_logs: {
                Row: {
                    category: string | null
                    change_amount: number | null
                    created_at: string | null
                    event: string
                    id: string
                    log_date: string | null
                    new_quantity: number | null
                    notes: string | null
                    previous_quantity: number | null
                    product_id: string | null
                    product_name: string | null
                    quantity_change: number
                    reference_id: string | null
                    reference_number: string | null
                    user_id: string | null
                    warehouse_id: string | null
                }
                Insert: {
                    category?: string | null
                    change_amount?: number | null
                    created_at?: string | null
                    event: string
                    id?: string
                    log_date?: string | null
                    new_quantity?: number | null
                    notes?: string | null
                    previous_quantity?: number | null
                    product_id?: string | null
                    product_name?: string | null
                    quantity_change: number
                    reference_id?: string | null
                    reference_number?: string | null
                    user_id?: string | null
                    warehouse_id?: string | null
                }
                Update: {
                    category?: string | null
                    change_amount?: number | null
                    created_at?: string | null
                    event?: string
                    id?: string
                    log_date?: string | null
                    new_quantity?: number | null
                    notes?: string | null
                    previous_quantity?: number | null
                    product_id?: string | null
                    product_name?: string | null
                    quantity_change?: number
                    reference_id?: string | null
                    reference_number?: string | null
                    user_id?: string | null
                    warehouse_id?: string | null
                }
                Relationships: [
                    {
                        foreignKeyName: "inventory_logs_product_id_fkey"
                        columns: ["product_id"]
                        isOneToOne: false
                        referencedRelation: "products"
                        referencedColumns: ["id"]
                    },
                ]
            }
            invoice_items: {
                Row: {
                    created_at: string | null
                    id: string
                    invoice_id: string | null
                    item_code: string | null
                    part_number: string | null
                    price: number
                    product_id: string
                    quantity: number
                    total: number | null
                }
                Insert: {
                    created_at?: string | null
                    id?: string
                    invoice_id?: string | null
                    item_code?: string | null
                    part_number?: string | null
                    price: number
                    product_id: string
                    quantity: number
                    total?: number | null
                }
                Update: {
                    created_at?: string | null
                    id?: string
                    invoice_id?: string | null
                    item_code?: string | null
                    part_number?: string | null
                    price?: number
                    product_id?: string
                    quantity?: number
                    total?: number | null
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
                        foreignKeyName: "invoice_items_product_id_fkey"
                        columns: ["product_id"]
                        isOneToOne: false
                        referencedRelation: "products"
                        referencedColumns: ["id"]
                    },
                ]
            }
            invoices: {
                Row: {
                    agent_id: string | null
                    amount_paid: number | null
                    balance: number | null
                    created_at: string | null
                    customer_id: string | null
                    dispatch_date: string | null
                    due_date: string | null
                    id: string
                    invoice_date: string | null
                    invoice_number: string
                    is_deleted: boolean | null
                    notes: string | null
                    payment_ref: string | null
                    payment_status: string | null
                    payment_terms: string | null
                    prepared_by: string | null
                    reference_number: string | null
                    status: string
                    subtotal: number | null
                    tax_amount: number | null
                    total_amount: number
                    updated_at: string | null
                }
                Insert: {
                    agent_id?: string | null
                    amount_paid?: number | null
                    balance?: number | null
                    created_at?: string | null
                    customer_id?: string | null
                    dispatch_date?: string | null
                    due_date?: string | null
                    id?: string
                    invoice_date?: string | null
                    invoice_number: string
                    is_deleted?: boolean | null
                    notes?: string | null
                    payment_ref?: string | null
                    payment_status?: string | null
                    payment_terms?: string | null
                    prepared_by?: string | null
                    reference_number?: string | null
                    status?: string
                    subtotal?: number | null
                    tax_amount?: number | null
                    total_amount: number
                    updated_at?: string | null
                }
                Update: {
                    agent_id?: string | null
                    amount_paid?: number | null
                    balance?: number | null
                    created_at?: string | null
                    customer_id?: string | null
                    dispatch_date?: string | null
                    due_date?: string | null
                    id?: string
                    invoice_date?: string | null
                    invoice_number?: string
                    is_deleted?: boolean | null
                    notes?: string | null
                    payment_ref?: string | null
                    payment_status?: string | null
                    payment_terms?: string | null
                    prepared_by?: string | null
                    reference_number?: string | null
                    status?: string
                    subtotal?: number | null
                    tax_amount?: number | null
                    total_amount?: number
                    updated_at?: string | null
                }
                Relationships: [
                    {
                        foreignKeyName: "invoices_customer_id_fkey"
                        columns: ["customer_id"]
                        isOneToOne: false
                        referencedRelation: "contacts"
                        referencedColumns: ["id"]
                    },
                ]
            }
            order_slip_items: {
                Row: {
                    created_at: string | null
                    id: string
                    item_code: string | null
                    order_slip_id: string | null
                    part_number: string | null
                    price: number
                    product_id: string
                    quantity: number
                }
                Insert: {
                    created_at?: string | null
                    id?: string
                    item_code?: string | null
                    order_slip_id?: string | null
                    part_number?: string | null
                    price: number
                    product_id: string
                    quantity: number
                }
                Update: {
                    created_at?: string | null
                    id?: string
                    item_code?: string | null
                    order_slip_id?: string | null
                    part_number?: string | null
                    price?: number
                    product_id?: string
                    quantity?: number
                }
                Relationships: [
                    {
                        foreignKeyName: "order_slip_items_order_slip_id_fkey"
                        columns: ["order_slip_id"]
                        isOneToOne: false
                        referencedRelation: "order_slips"
                        referencedColumns: ["id"]
                    },
                    {
                        foreignKeyName: "order_slip_items_product_id_fkey"
                        columns: ["product_id"]
                        isOneToOne: false
                        referencedRelation: "products"
                        referencedColumns: ["id"]
                    },
                ]
            }
            order_slips: {
                Row: {
                    agent_id: string | null
                    balance: number | null
                    created_at: string | null
                    customer_id: string | null
                    delivery_date: string | null
                    id: string
                    is_deleted: boolean | null
                    notes: string | null
                    order_date: string | null
                    order_number: string
                    payment_status: string | null
                    payment_terms: string | null
                    prepared_by: string | null
                    reference_number: string | null
                    sales_agent: string | null
                    status: string
                    total_amount: number
                    updated_at: string | null
                }
                Insert: {
                    agent_id?: string | null
                    balance?: number | null
                    created_at?: string | null
                    customer_id?: string | null
                    delivery_date?: string | null
                    id?: string
                    is_deleted?: boolean | null
                    notes?: string | null
                    order_date?: string | null
                    order_number: string
                    payment_status?: string | null
                    payment_terms?: string | null
                    prepared_by?: string | null
                    reference_number?: string | null
                    sales_agent?: string | null
                    status?: string
                    total_amount: number
                    updated_at?: string | null
                }
                Update: {
                    agent_id?: string | null
                    balance?: number | null
                    created_at?: string | null
                    customer_id?: string | null
                    delivery_date?: string | null
                    id?: string
                    is_deleted?: boolean | null
                    notes?: string | null
                    order_date?: string | null
                    order_number?: string
                    payment_status?: string | null
                    payment_terms?: string | null
                    prepared_by?: string | null
                    reference_number?: string | null
                    sales_agent?: string | null
                    status?: string
                    total_amount?: number
                    updated_at?: string | null
                }
                Relationships: [
                    {
                        foreignKeyName: "order_slips_customer_id_fkey"
                        columns: ["customer_id"]
                        isOneToOne: false
                        referencedRelation: "contacts"
                        referencedColumns: ["id"]
                    },
                ]
            }
            products: {
                Row: {
                    category: string
                    compatibility: string | null
                    cost: number | null
                    created_at: string | null
                    description: string | null
                    engines: string | null
                    id: string
                    image_url: string | null
                    is_deleted: boolean | null
                    item_code: string
                    location: string | null
                    maintenance_id: string | null
                    name: string
                    part_number: string
                    price: number
                    quantity: number
                }
                Insert: {
                    category: string
                    compatibility?: string | null
                    cost?: number | null
                    created_at?: string | null
                    description?: string | null
                    engines?: string | null
                    id?: string
                    image_url?: string | null
                    is_deleted?: boolean | null
                    item_code: string
                    location?: string | null
                    maintenance_id?: string | null
                    name: string
                    part_number: string
                    price: number
                    quantity?: number
                }
                Update: {
                    category?: string
                    compatibility?: string | null
                    cost?: number | null
                    created_at?: string | null
                    description?: string | null
                    engines?: string | null
                    id?: string
                    image_url?: string | null
                    is_deleted?: boolean | null
                    item_code?: string
                    location?: string | null
                    maintenance_id?: string | null
                    name?: string
                    part_number?: string
                    price?: number
                    quantity?: number
                }
                Relationships: []
            }
            profile_creation_logs: {
                Row: {
                    created_at: string | null
                    details: string | null
                    id: string
                    status: string
                    user_email: string
                    user_id: string
                }
                Insert: {
                    created_at?: string | null
                    details?: string | null
                    id?: string
                    status: string
                    user_email: string
                    user_id: string
                }
                Update: {
                    created_at?: string | null
                    details?: string | null
                    id?: string
                    status?: string
                    user_email?: string
                    user_id?: string
                }
                Relationships: []
            }
            profiles: {
                Row: {
                    access_rights: string[] | null
                    avatar_url: string | null
                    created_at: string | null
                    email: string | null
                    full_name: string | null
                    id: string
                    role: string | null
                    status: string | null
                    updated_at: string | null
                }
                Insert: {
                    access_rights?: string[] | null
                    avatar_url?: string | null
                    created_at?: string | null
                    email?: string | null
                    full_name?: string | null
                    id: string
                    role?: string | null
                    status?: string | null
                    updated_at?: string | null
                }
                Update: {
                    access_rights?: string[] | null
                    avatar_url?: string | null
                    created_at?: string | null
                    email?: string | null
                    full_name?: string | null
                    id?: string
                    role?: string | null
                    status?: string | null
                    updated_at?: string | null
                }
                Relationships: []
            }
            purchase_history: {
                Row: {
                    created_at: string | null
                    id: string
                    order_id: string | null
                    status_from: string
                    status_to: string
                    updated_by: string | null
                }
                Insert: {
                    created_at?: string | null
                    id?: string
                    order_id?: string | null
                    status_from: string
                    status_to: string
                    updated_by?: string | null
                }
                Update: {
                    created_at?: string | null
                    id?: string
                    order_id?: string | null
                    status_from?: string
                    status_to?: string
                    updated_by?: string | null
                }
                Relationships: [
                    {
                        foreignKeyName: "purchase_history_order_id_fkey"
                        columns: ["order_id"]
                        isOneToOne: false
                        referencedRelation: "purchase_orders"
                        referencedColumns: ["id"]
                    },
                ]
            }
            purchase_order_items: {
                Row: {
                    created_at: string | null
                    delivered_quantity: number | null
                    eta_date: string | null
                    id: string
                    item_code: string | null
                    item_id: string
                    part_number: string | null
                    purchase_order_id: string
                    quantity: number
                    status: string | null
                    unit_cost: number
                }
                Insert: {
                    created_at?: string | null
                    delivered_quantity?: number | null
                    eta_date?: string | null
                    id?: string
                    item_code?: string | null
                    item_id: string
                    part_number?: string | null
                    purchase_order_id: string
                    quantity: number
                    status?: string | null
                    unit_cost: number
                }
                Update: {
                    created_at?: string | null
                    delivered_quantity?: number | null
                    eta_date?: string | null
                    id?: string
                    item_code?: string | null
                    item_id?: string
                    part_number?: string | null
                    purchase_order_id?: string
                    quantity?: number
                    status?: string | null
                    unit_cost?: number
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
                        foreignKeyName: "purchase_order_items_purchase_order_id_fkey"
                        columns: ["purchase_order_id"]
                        isOneToOne: false
                        referencedRelation: "purchase_orders"
                        referencedColumns: ["id"]
                    },
                ]
            }
            purchase_orders: {
                Row: {
                    approved_by: string | null
                    created_at: string | null
                    created_by: string
                    deleted_at: string | null
                    delivery_date: string | null
                    grand_total: number
                    id: string
                    is_deleted: boolean | null
                    notes: string | null
                    order_date: string
                    po_number: string
                    status: string
                    supplier_id: string
                    updated_at: string | null
                }
                Insert: {
                    approved_by?: string | null
                    created_at?: string | null
                    created_by: string
                    deleted_at?: string | null
                    delivery_date?: string | null
                    grand_total?: number
                    id?: string
                    is_deleted?: boolean | null
                    notes?: string | null
                    order_date?: string
                    po_number: string
                    status?: string
                    supplier_id: string
                    updated_at?: string | null
                }
                Update: {
                    approved_by?: string | null
                    created_at?: string | null
                    created_by?: string
                    deleted_at?: string | null
                    delivery_date?: string | null
                    grand_total?: number
                    id?: string
                    is_deleted?: boolean | null
                    notes?: string | null
                    order_date?: string
                    po_number?: string
                    status?: string
                    supplier_id?: string
                    updated_at?: string | null
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
            purchase_request_items: {
                Row: {
                    created_at: string | null
                    description: string | null
                    eta_date: string | null
                    id: string
                    item_code: string | null
                    item_id: string | null
                    part_number: string | null
                    po_reference: string | null
                    pr_id: string
                    quantity: number
                    supplier_id: string | null
                    supplier_name: string | null
                    unit_cost: number | null
                    updated_at: string | null
                }
                Insert: {
                    created_at?: string | null
                    description?: string | null
                    eta_date?: string | null
                    id?: string
                    item_code?: string | null
                    item_id?: string | null
                    part_number?: string | null
                    po_reference?: string | null
                    pr_id: string
                    quantity?: number
                    supplier_id?: string | null
                    supplier_name?: string | null
                    unit_cost?: number | null
                    updated_at?: string | null
                }
                Update: {
                    created_at?: string | null
                    description?: string | null
                    eta_date?: string | null
                    id?: string
                    item_code?: string | null
                    item_id?: string | null
                    part_number?: string | null
                    po_reference?: string | null
                    pr_id?: string
                    quantity?: number
                    supplier_id?: string | null
                    supplier_name?: string | null
                    unit_cost?: number | null
                    updated_at?: string | null
                }
                Relationships: [
                    {
                        foreignKeyName: "purchase_request_items_item_id_fkey"
                        columns: ["item_id"]
                        isOneToOne: false
                        referencedRelation: "products"
                        referencedColumns: ["id"]
                    },
                    {
                        foreignKeyName: "purchase_request_items_pr_id_fkey"
                        columns: ["pr_id"]
                        isOneToOne: false
                        referencedRelation: "purchase_requests"
                        referencedColumns: ["id"]
                    },
                    {
                        foreignKeyName: "purchase_request_items_supplier_id_fkey"
                        columns: ["supplier_id"]
                        isOneToOne: false
                        referencedRelation: "contacts"
                        referencedColumns: ["id"]
                    },
                ]
            }
            purchase_requests: {
                Row: {
                    approved_at: string | null
                    approved_by: string | null
                    created_at: string | null
                    created_by: string | null
                    deleted_at: string | null
                    id: string
                    is_deleted: boolean | null
                    notes: string | null
                    pr_number: string
                    reference_no: string | null
                    request_date: string | null
                    status: string | null
                    updated_at: string | null
                }
                Insert: {
                    approved_at?: string | null
                    approved_by?: string | null
                    created_at?: string | null
                    created_by?: string | null
                    deleted_at?: string | null
                    id?: string
                    is_deleted?: boolean | null
                    notes?: string | null
                    pr_number: string
                    reference_no?: string | null
                    request_date?: string | null
                    status?: string | null
                    updated_at?: string | null
                }
                Update: {
                    approved_at?: string | null
                    approved_by?: string | null
                    created_at?: string | null
                    created_by?: string | null
                    deleted_at?: string | null
                    id?: string
                    is_deleted?: boolean | null
                    notes?: string | null
                    pr_number?: string
                    reference_no?: string | null
                    request_date?: string | null
                    status?: string | null
                    updated_at?: string | null
                }
                Relationships: []
            }
            purchases: {
                Row: {
                    created_at: string
                    id: number
                    item: string | null
                    price: number | null
                    purchase_date: string | null
                }
                Insert: {
                    created_at?: string
                    id?: number
                    item?: string | null
                    price?: number | null
                    purchase_date?: string | null
                }
                Update: {
                    created_at?: string
                    id?: number
                    item?: string | null
                    price?: number | null
                    purchase_date?: string | null
                }
                Relationships: []
            }
            receiving_report_items: {
                Row: {
                    created_at: string | null
                    created_by: string | null
                    expiry_date: string | null
                    id: string
                    item_code: string | null
                    item_id: string
                    notes: string | null
                    part_number: string | null
                    po_item_id: string | null
                    quantity_received: number
                    rr_id: string
                    status: string | null
                    unit_cost: number | null
                }
                Insert: {
                    created_at?: string | null
                    created_by?: string | null
                    expiry_date?: string | null
                    id?: string
                    item_code?: string | null
                    item_id: string
                    notes?: string | null
                    part_number?: string | null
                    po_item_id?: string | null
                    quantity_received: number
                    rr_id: string
                    status?: string | null
                    unit_cost?: number | null
                }
                Update: {
                    created_at?: string | null
                    created_by?: string | null
                    expiry_date?: string | null
                    id?: string
                    item_code?: string | null
                    item_id?: string
                    notes?: string | null
                    part_number?: string | null
                    po_item_id?: string | null
                    quantity_received?: number
                    rr_id?: string
                    status?: string | null
                    unit_cost?: number | null
                }
                Relationships: [
                    {
                        foreignKeyName: "receiving_report_items_item_id_fkey"
                        columns: ["item_id"]
                        isOneToOne: false
                        referencedRelation: "products"
                        referencedColumns: ["id"]
                    },
                    {
                        foreignKeyName: "receiving_report_items_po_item_id_fkey"
                        columns: ["po_item_id"]
                        isOneToOne: false
                        referencedRelation: "purchase_order_items"
                        referencedColumns: ["id"]
                    },
                    {
                        foreignKeyName: "receiving_report_items_rr_id_fkey"
                        columns: ["rr_id"]
                        isOneToOne: false
                        referencedRelation: "receiving_reports"
                        referencedColumns: ["id"]
                    },
                ]
            }
            receiving_reports: {
                Row: {
                    created_at: string | null
                    created_by: string | null
                    delivery_date: string | null
                    id: string
                    is_deleted: boolean | null
                    notes: string | null
                    po_id: string | null
                    received_date: string
                    rr_number: string
                    status: string | null
                    supplier_id: string
                    updated_at: string | null
                }
                Insert: {
                    created_at?: string | null
                    created_by?: string | null
                    delivery_date?: string | null
                    id?: string
                    is_deleted?: boolean | null
                    notes?: string | null
                    po_id?: string | null
                    received_date: string
                    rr_number: string
                    status?: string | null
                    supplier_id: string
                    updated_at?: string | null
                }
                Update: {
                    created_at?: string | null
                    created_by?: string | null
                    delivery_date?: string | null
                    id?: string
                    is_deleted?: boolean | null
                    notes?: string | null
                    po_id?: string | null
                    received_date?: string
                    rr_number?: string
                    status?: string | null
                    supplier_id?: string
                    updated_at?: string | null
                }
                Relationships: [
                    {
                        foreignKeyName: "receiving_reports_po_id_fkey"
                        columns: ["po_id"]
                        isOneToOne: false
                        referencedRelation: "purchase_orders"
                        referencedColumns: ["id"]
                    },
                    {
                        foreignKeyName: "receiving_reports_supplier_id_fkey"
                        columns: ["supplier_id"]
                        isOneToOne: false
                        referencedRelation: "contacts"
                        referencedColumns: ["id"]
                    },
                ]
            }
            recycle_bin_items: {
                Row: {
                    deleted_at: string | null
                    deleted_by: string | null
                    deletion_date: string | null
                    details: Json | null
                    id: string
                    item_type: string
                    original_data: Json
                    restored_at: string | null
                    restored_by: string | null
                }
                Insert: {
                    deleted_at?: string | null
                    deleted_by?: string | null
                    deletion_date?: string | null
                    details?: Json | null
                    id?: string
                    item_type: string
                    original_data: Json
                    restored_at?: string | null
                    restored_by?: string | null
                }
                Update: {
                    deleted_at?: string | null
                    deleted_by?: string | null
                    deletion_date?: string | null
                    details?: Json | null
                    id?: string
                    item_type?: string
                    original_data?: Json
                    restored_at?: string | null
                    restored_by?: string | null
                }
                Relationships: []
            }
            sales_inquiry: {
                Row: {
                    assigned_agent: string | null
                    company: string
                    contact_person: string | null
                    created_at: string | null
                    customer_id: string | null
                    email: string | null
                    id: string
                    inquiry_date: string | null
                    inquiry_number: string
                    is_deleted: boolean | null
                    mobile: string | null
                    notes: string | null
                    phone: string | null
                    priority: string | null
                    reference_number: string | null
                    requirements: string | null
                    source: string | null
                    stage: string | null
                    status: string
                    subject: string | null
                    updated_at: string | null
                }
                Insert: {
                    assigned_agent?: string | null
                    company: string
                    contact_person?: string | null
                    created_at?: string | null
                    customer_id?: string | null
                    email?: string | null
                    id?: string
                    inquiry_date?: string | null
                    inquiry_number: string
                    is_deleted?: boolean | null
                    mobile?: string | null
                    notes?: string | null
                    phone?: string | null
                    priority?: string | null
                    reference_number?: string | null
                    requirements?: string | null
                    source?: string | null
                    stage?: string | null
                    status?: string
                    subject?: string | null
                    updated_at?: string | null
                }
                Update: {
                    assigned_agent?: string | null
                    company?: string
                    contact_person?: string | null
                    created_at?: string | null
                    customer_id?: string | null
                    email?: string | null
                    id?: string
                    inquiry_date?: string | null
                    inquiry_number?: string
                    is_deleted?: boolean | null
                    mobile?: string | null
                    notes?: string | null
                    phone?: string | null
                    priority?: string | null
                    reference_number?: string | null
                    requirements?: string | null
                    source?: string | null
                    stage?: string | null
                    status?: string
                    subject?: string | null
                    updated_at?: string | null
                }
                Relationships: [
                    {
                        foreignKeyName: "sales_inquiry_customer_id_fkey"
                        columns: ["customer_id"]
                        isOneToOne: false
                        referencedRelation: "contacts"
                        referencedColumns: ["id"]
                    },
                ]
            }
            sales_inquiry_items: {
                Row: {
                    created_at: string | null
                    id: string
                    inquiry_id: string
                    item_code: string | null
                    part_number: string | null
                    price: number | null
                    product_id: string
                    quantity: number
                }
                Insert: {
                    created_at?: string | null
                    id?: string
                    inquiry_id: string
                    item_code?: string | null
                    part_number?: string | null
                    price?: number | null
                    product_id: string
                    quantity: number
                }
                Update: {
                    created_at?: string | null
                    id?: string
                    inquiry_id?: string
                    item_code?: string | null
                    part_number?: string | null
                    price?: number | null
                    product_id?: string
                    quantity?: number
                }
                Relationships: [
                    {
                        foreignKeyName: "sales_inquiry_items_inquiry_id_fkey"
                        columns: ["inquiry_id"]
                        isOneToOne: false
                        referencedRelation: "sales_inquiry"
                        referencedColumns: ["id"]
                    },
                    {
                        foreignKeyName: "sales_inquiry_items_product_id_fkey"
                        columns: ["product_id"]
                        isOneToOne: false
                        referencedRelation: "products"
                        referencedColumns: ["id"]
                    },
                ]
            }
            sales_order_items: {
                Row: {
                    created_at: string | null
                    id: string
                    item_code: string | null
                    part_number: string | null
                    price: number
                    product_id: string
                    quantity: number
                    sales_order_id: string | null
                }
                Insert: {
                    created_at?: string | null
                    id?: string
                    item_code?: string | null
                    part_number?: string | null
                    price: number
                    product_id: string
                    quantity: number
                    sales_order_id?: string | null
                }
                Update: {
                    created_at?: string | null
                    id?: string
                    item_code?: string | null
                    part_number?: string | null
                    price?: number
                    product_id?: string
                    quantity?: number
                    sales_order_id?: string | null
                }
                Relationships: [
                    {
                        foreignKeyName: "sales_order_items_product_id_fkey"
                        columns: ["product_id"]
                        isOneToOne: false
                        referencedRelation: "products"
                        referencedColumns: ["id"]
                    },
                    {
                        foreignKeyName: "sales_order_items_sales_order_id_fkey"
                        columns: ["sales_order_id"]
                        isOneToOne: false
                        referencedRelation: "sales_orders"
                        referencedColumns: ["id"]
                    },
                ]
            }
            sales_orders: {
                Row: {
                    sales_type: string | null
                    agent_id: string | null
                    balance: number | null
                    created_at: string | null
                    customer_id: string | null
                    delivery_date: string | null
                    id: string
                    is_deleted: boolean | null
                    notes: string | null
                    order_date: string | null
                    order_number: string
                    payment_status: string | null
                    payment_terms: string | null
                    prepared_by: string | null
                    reference_number: string | null
                    sales_agent: string | null
                    status: string
                    total_amount: number | null
                    updated_at: string | null
                }
                Insert: {
                    sales_type?: string | null
                    agent_id?: string | null
                    balance?: number | null
                    created_at?: string | null
                    customer_id?: string | null
                    delivery_date?: string | null
                    id?: string
                    is_deleted?: boolean | null
                    notes?: string | null
                    order_date?: string | null
                    order_number: string
                    payment_status?: string | null
                    payment_terms?: string | null
                    prepared_by?: string | null
                    reference_number?: string | null
                    sales_agent?: string | null
                    status?: string
                    total_amount?: number | null
                    updated_at?: string | null
                }
                Update: {
                    sales_type?: string | null
                    agent_id?: string | null
                    balance?: number | null
                    created_at?: string | null
                    customer_id?: string | null
                    delivery_date?: string | null
                    id?: string
                    is_deleted?: boolean | null
                    notes?: string | null
                    order_date?: string | null
                    order_number?: string
                    payment_status?: string | null
                    payment_terms?: string | null
                    prepared_by?: string | null
                    reference_number?: string | null
                    sales_agent?: string | null
                    status?: string
                    total_amount?: number | null
                    updated_at?: string | null
                }
                Relationships: [
                    {
                        foreignKeyName: "sales_orders_customer_id_fkey"
                        columns: ["customer_id"]
                        isOneToOne: false
                        referencedRelation: "contacts"
                        referencedColumns: ["id"]
                    },
                ]
            }
            sales_progress: {
                Row: {
                    amount: number | null
                    contact_id: string
                    created_at: string | null
                    created_by: string
                    currency: string
                    id: string
                    notes: string | null
                    probability: number
                    stage_from: string
                    stage_to: string
                    updated_at: string | null
                }
                Insert: {
                    amount?: number | null
                    contact_id: string
                    created_at?: string | null
                    created_by: string
                    currency?: string
                    id?: string
                    notes?: string | null
                    probability?: number
                    stage_from: string
                    stage_to: string
                    updated_at?: string | null
                }
                Update: {
                    amount?: number | null
                    contact_id?: string
                    created_at?: string | null
                    created_by?: string
                    currency?: string
                    id?: string
                    notes?: string | null
                    probability?: number
                    stage_from?: string
                    stage_to?: string
                    updated_at?: string | null
                }
                Relationships: [
                    {
                        foreignKeyName: "sales_progress_contact_id_fkey"
                        columns: ["contact_id"]
                        isOneToOne: false
                        referencedRelation: "contacts"
                        referencedColumns: ["id"]
                    },
                ]
            }
            stock_adjustment_items: {
                Row: {
                    adjustment_id: string | null
                    created_at: string | null
                    id: string
                    item_code: string | null
                    item_id: string
                    notes: string | null
                    part_number: string | null
                    qty_adjustment: number
                    unit_cost: number | null
                }
                Insert: {
                    adjustment_id?: string | null
                    created_at?: string | null
                    id?: string
                    item_code?: string | null
                    item_id: string
                    notes?: string | null
                    part_number?: string | null
                    qty_adjustment: number
                    unit_cost?: number | null
                }
                Update: {
                    adjustment_id?: string | null
                    created_at?: string | null
                    id?: string
                    item_code?: string | null
                    item_id?: string
                    notes?: string | null
                    part_number?: string | null
                    qty_adjustment?: number
                    unit_cost?: number | null
                }
                Relationships: [
                    {
                        foreignKeyName: "stock_adjustment_items_adjustment_id_fkey"
                        columns: ["adjustment_id"]
                        isOneToOne: false
                        referencedRelation: "stock_adjustments"
                        referencedColumns: ["id"]
                    },
                    {
                        foreignKeyName: "stock_adjustment_items_item_id_fkey"
                        columns: ["item_id"]
                        isOneToOne: false
                        referencedRelation: "products"
                        referencedColumns: ["id"]
                    },
                ]
            }
            stock_adjustments: {
                Row: {
                    adjustment_date: string
                    adjustment_number: string
                    approved_at: string | null
                    approved_by: string | null
                    created_at: string | null
                    created_by: string | null
                    id: string
                    notes: string | null
                    reason: string
                    status: string
                    updated_at: string | null
                }
                Insert: {
                    adjustment_date: string
                    adjustment_number: string
                    approved_at?: string | null
                    approved_by?: string | null
                    created_at?: string | null
                    created_by?: string | null
                    id?: string
                    notes?: string | null
                    reason: string
                    status: string
                    updated_at?: string | null
                }
                Update: {
                    adjustment_date?: string
                    adjustment_number?: string
                    approved_at?: string | null
                    approved_by?: string | null
                    created_at?: string | null
                    created_by?: string | null
                    id?: string
                    notes?: string | null
                    reason?: string
                    status?: string
                    updated_at?: string | null
                }
                Relationships: []
            }
            supplier_item_costs: {
                Row: {
                    created_at: string | null
                    id: string
                    item_id: string
                    last_updated: string | null
                    supplier_id: string
                    unit_cost: number
                }
                Insert: {
                    created_at?: string | null
                    id?: string
                    item_id: string
                    last_updated?: string | null
                    supplier_id: string
                    unit_cost?: number
                }
                Update: {
                    created_at?: string | null
                    id?: string
                    item_id?: string
                    last_updated?: string | null
                    supplier_id?: string
                    unit_cost?: number
                }
                Relationships: [
                    {
                        foreignKeyName: "supplier_item_costs_item_id_fkey"
                        columns: ["item_id"]
                        isOneToOne: false
                        referencedRelation: "products"
                        referencedColumns: ["id"]
                    },
                    {
                        foreignKeyName: "supplier_item_costs_supplier_id_fkey"
                        columns: ["supplier_id"]
                        isOneToOne: false
                        referencedRelation: "contacts"
                        referencedColumns: ["id"]
                    },
                ]
            }
            supplier_return_items: {
                Row: {
                    created_at: string | null
                    description: string | null
                    id: string
                    item_code: string | null
                    item_id: string | null
                    part_no: string | null
                    qty_returned: number
                    remarks: string | null
                    return_id: string
                    return_reason: string | null
                    rr_item_id: string | null
                    total_amount: number | null
                    unit_cost: number | null
                }
                Insert: {
                    created_at?: string | null
                    description?: string | null
                    id?: string
                    item_code?: string | null
                    item_id?: string | null
                    part_no?: string | null
                    qty_returned: number
                    remarks?: string | null
                    return_id: string
                    return_reason?: string | null
                    rr_item_id?: string | null
                    total_amount?: number | null
                    unit_cost?: number | null
                }
                Update: {
                    created_at?: string | null
                    description?: string | null
                    id?: string
                    item_code?: string | null
                    item_id?: string | null
                    part_no?: string | null
                    qty_returned?: number
                    remarks?: string | null
                    return_id?: string
                    return_reason?: string | null
                    rr_item_id?: string | null
                    total_amount?: number | null
                    unit_cost?: number | null
                }
                Relationships: [
                    {
                        foreignKeyName: "supplier_return_items_item_id_fkey"
                        columns: ["item_id"]
                        isOneToOne: false
                        referencedRelation: "products"
                        referencedColumns: ["id"]
                    },
                    {
                        foreignKeyName: "supplier_return_items_return_id_fkey"
                        columns: ["return_id"]
                        isOneToOne: false
                        referencedRelation: "supplier_returns"
                        referencedColumns: ["id"]
                    },
                    {
                        foreignKeyName: "supplier_return_items_rr_item_id_fkey"
                        columns: ["rr_item_id"]
                        isOneToOne: false
                        referencedRelation: "receiving_report_items"
                        referencedColumns: ["id"]
                    },
                ]
            }
            supplier_returns: {
                Row: {
                    created_at: string | null
                    created_by: string | null
                    id: string
                    notes: string | null
                    return_date: string
                    return_number: string
                    status: string
                    supplier_id: string
                    total_amount: number | null
                    updated_at: string | null
                }
                Insert: {
                    created_at?: string | null
                    created_by?: string | null
                    id?: string
                    notes?: string | null
                    return_date: string
                    return_number: string
                    status: string
                    supplier_id: string
                    total_amount?: number | null
                    updated_at?: string | null
                }
                Update: {
                    created_at?: string | null
                    created_by?: string | null
                    id?: string
                    notes?: string | null
                    return_date?: string
                    return_number?: string
                    status?: string
                    supplier_id?: string
                    total_amount?: number | null
                    updated_at?: string | null
                }
                Relationships: [
                    {
                        foreignKeyName: "supplier_returns_supplier_id_fkey"
                        columns: ["supplier_id"]
                        isOneToOne: false
                        referencedRelation: "contacts"
                        referencedColumns: ["id"]
                    },
                ]
            }
            team_messages: {
                Row: {
                    attachments: Json | null
                    content: string
                    created_at: string | null
                    id: string
                    sender_id: string
                    type: string
                }
                Insert: {
                    attachments?: Json | null
                    content: string
                    created_at?: string | null
                    id?: string
                    sender_id: string
                    type: string
                }
                Update: {
                    attachments?: Json | null
                    content?: string
                    created_at?: string | null
                    id?: string
                    sender_id?: string
                    type?: string
                }
                Relationships: [
                    {
                        foreignKeyName: "team_messages_sender_id_fkey"
                        columns: ["sender_id"]
                        isOneToOne: false
                        referencedRelation: "profiles"
                        referencedColumns: ["id"]
                    },
                ]
            }
        }
        Views: {
            [_ in never]: never
        }
        Functions: {
            get_year_pr_count: {
                Args: {
                    year_suffix: string
                }
                Returns: number
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
