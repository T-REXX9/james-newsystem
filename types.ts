

export enum DealStage {
  NEW = 'New',
  DISCOVERY = 'Discovery',
  QUALIFIED = 'Qualified',
  PROPOSAL = 'Proposal',
  NEGOTIATION = 'Negotiation',
  CLOSED_WON = 'Closed Won',
  CLOSED_LOST = 'Closed Lost',
}

export enum CustomerStatus {
  ACTIVE = 'Active',
  INACTIVE = 'Inactive',
  PROSPECTIVE = 'Prospective',
  BLACKLISTED = 'Blacklisted'
}

export enum SalesInquiryStatus {
  DRAFT = 'draft',
  APPROVED = 'approved',
  CONVERTED_TO_ORDER = 'converted_to_order',
  CANCELLED = 'cancelled',
}

export enum SalesOrderStatus {
  PENDING = 'pending',
  CONFIRMED = 'confirmed',
  CONVERTED_TO_DOCUMENT = 'converted_to_document',
  CANCELLED = 'cancelled',
}

export enum OrderSlipStatus {
  DRAFT = 'draft',
  FINALIZED = 'finalized',
  CANCELLED = 'cancelled',
}

export enum InvoiceStatus {
  DRAFT = 'draft',
  SENT = 'sent',
  PAID = 'paid',
  OVERDUE = 'overdue',
  CANCELLED = 'cancelled',
}

export type NotificationType = 'info' | 'success' | 'warning' | 'error';

export interface Notification {
  id: string;
  recipient_id: string;
  title: string;
  message: string;
  type: NotificationType;
  action_url?: string;
  metadata?: Record<string, any>;
  is_read: boolean;
  created_at: string;
  read_at?: string;
  is_deleted?: boolean;
  deleted_at?: string;
}

export interface CreateNotificationInput {
  recipient_id: string;
  title: string;
  message: string;
  type: NotificationType;
  action_url?: string;
  metadata?: Record<string, any>;
}

export interface UserProfile {
  id: string;
  email: string;
  full_name?: string;
  avatar_url?: string;
  role?: string;
  access_rights?: string[]; // List of module IDs allowed
  team?: string;
  birthday?: string;
  mobile?: string;
  monthly_quota?: number;
}

export interface ProfileRow extends UserProfile {
  created_at: string;
  updated_at: string;
}

export interface StaffAccountValidationError {
  fullName?: string;
  email?: string;
  password?: string;
  role?: string;
  accessRights?: string;
}

export interface SidebarPreferences {
  isExpanded: boolean;
  favorites: string[];
  recentlyUsed: string[];
}

export interface KeyboardShortcut {
  key: string;
  ctrl?: boolean;
  meta?: boolean;
  shift?: boolean;
  alt?: boolean;
  handler: () => void;
  description: string;
  allowInInput?: boolean;
}

export interface SidebarMenuItem {
  id: string;
  icon: any;
  label: string;
  group: string;
  badge?: number;
  shortcut?: string;
}

// Hierarchical sidebar navigation types
export type MenuLevel = 1 | 2 | 3;

export interface MenuItemLeaf {
  id: string;
  label: string;
  icon?: any;
  level: 3;
  parentId: string;
  /**
   * Route identifier used by the router (activeTab) and access control.
   * Follows the convention: {category}-{subcategory}-{page-name}
   * e.g. "warehouse-inventory-product-database".
   */
  route: string;
  isExpandable?: false;
}

export interface MenuSubCategory {
  id: string;
  label: string;
  icon?: any;
  level: 2;
  parentId: string;
  /**
   * Optional route when the submenu itself should be clickable.
   * Most submenus will only act as containers for leaf pages.
   */
  route?: string;
  isExpandable?: boolean;
  children: MenuItemLeaf[];
}

export interface MenuCategory {
  id: string;
  label: string;
  icon: any;
  level: 1;
  parentId?: null;
  /**
   * When present (e.g. for HOME), clicking the category navigates directly
   * to this route instead of expanding children.
   */
  route?: string;
  isExpandable?: boolean;
  children?: Array<MenuSubCategory | MenuItemLeaf>;
}

export type HierarchicalMenuItem = MenuCategory | MenuSubCategory | MenuItemLeaf;

export interface CreateStaffAccountInput {
  email: string;
  password: string;
  fullName: string;
  role?: string;
  birthday?: string;
  mobile?: string;
  accessRights?: string[];
}

export interface CreateStaffAccountResult {
  success: boolean;
  error?: string;
  userId?: string;
  profile?: UserProfile;
  validationErrors?: StaffAccountValidationError;
}

export interface Task {
  id: string;
  title: string;
  description: string;
  assignedTo: string; // User full_name
  assigneeAvatar?: string;
  createdBy: string;
  dueDate: string;
  priority: 'High' | 'Medium' | 'Low';
  status: 'Todo' | 'In Progress' | 'Done';
  is_deleted?: boolean;
  deleted_at?: string;
  updated_at?: string;
}

export interface Interaction {
  id: string;
  date: string;
  type: 'Email' | 'Call' | 'Meeting' | 'SMS';
  notes: string;
  sentiment?: 'Positive' | 'Neutral' | 'Negative';
}

export interface Comment {
  id: string;
  author: string;
  role: string; // e.g., 'Owner', 'Sales Agent'
  text: string;
  timestamp: string;
  avatar?: string;
}

export interface SalesRecord {
  id: string;
  date: string;
  product: string;
  amount: number;
  status: 'Paid' | 'Pending';
}

export interface ContactPerson {
  id: string;
  enabled: boolean;
  name: string;
  position: string;
  birthday: string;
  telephone: string;
  mobile: string;
  email: string;
}

export interface Contact {
  id: string;
  // Core Identifiers
  company: string; // "customer_name"
  pastName?: string;
  customerSince: string; // "since"
  team: string;
  salesman: string; // "salesman" (Assigned Agent)
  referBy: string;

  // Location
  address: string; // Street/Building
  province: string;
  city: string;
  area: string;
  deliveryAddress: string;

  // Financial / Legal
  tin: string;
  priceGroup: string; // "price_group"
  businessLine: string; // "business_line"
  terms: string;
  transactionType: string;
  vatType: string;
  vatPercentage: string;

  // Dealership Specifics
  dealershipTerms: string;
  dealershipSince: string;
  dealershipQuota: number;
  creditLimit: number;

  // Status & Logic
  status: CustomerStatus; // "status_filter"
  isHidden: boolean; // "hide_unhide"
  debtType: 'Good' | 'Bad';
  comment: string; // General comment

  // Nested Data
  contactPersons: ContactPerson[];

  // Legacy / UI Helper Fields (kept for compatibility with existing components)
  name: string; // Primary Contact Name (from contactPersons[0] usually)
  title: string;
  email: string;
  phone: string;
  mobile?: string;
  avatar: string;
  dealValue: number;
  stage: DealStage;
  lastContactDate: string;
  interactions: Interaction[];
  comments: Comment[];
  salesHistory: SalesRecord[];
  topProducts: string[];
  assignedAgent?: string; // Sync with 'salesman'

  // AI Enriched Fields
  aiScore?: number;
  aiReasoning?: string;
  winProbability?: number;
  nextBestAction?: string;

  // Legacy address fields mapping
  officeAddress?: string;
  shippingAddress?: string;
  totalSales?: number;
  balance?: number;
  salesByYear?: Record<string, number>;

  // Soft delete fields
  is_deleted?: boolean;
  deleted_at?: string;
  updated_at?: string;
}

export interface LeadScoreResult {
  score: number;
  winProbability: number;
  reasoning: string;
  nextBestAction: string;
  riskFactors: string[];
}

export interface DashboardStats {
  totalRevenue: number;
  activeDeals: number;
  avgWinRate: number;
  pipelineValue: number;
}

// New types for Pipeline View
export interface PipelineDeal {
  id: string;
  title: string;
  company: string;
  pastName?: string;
  contactName: string;
  avatar: string; // Contact avatar
  value: number;
  currency: string;
  stageId: string;
  ownerName?: string;
  ownerId?: string;
  team?: string;
  customerType?: 'VIP1' | 'VIP2' | 'Regular';
  createdAt?: string;
  updatedAt?: string;
  daysInStage?: number;
  isOverdue?: boolean;
  isWarning?: boolean; // For pink background
  nextStep?: string;
  entryEvidence?: string;
  exitEvidence?: string;
  riskFlag?: string;
}

export interface PipelineColumn {
  id: string;
  title: string;
  color: string; // Tailwind text color class e.g. 'text-yellow-500'
  accentColor: string; // Hex for border/bg
  probability?: number; // Weighted forecast probability
  entryCriteria?: string;
  exitCriteria?: string;
  keyActivities?: string[];
  rootingDays?: number; // Max days before flagged as stalled
}

// Product Database Type
export interface Product {
  id: string;
  part_no: string;
  oem_no: string;
  brand: string;
  barcode: string;
  no_of_pieces_per_box: number;
  item_code: string;
  description: string;
  size: string;
  reorder_quantity: number;
  status: 'Active' | 'Inactive' | 'Discontinued';
  category: string;
  descriptive_inquiry: string;
  no_of_holes: string;
  replenish_quantity: number;
  original_pn_no: string;
  application: string;
  no_of_cylinder: string;

  // Price Groups
  price_aa: number;
  price_bb: number;
  price_cc: number;
  price_dd: number;
  price_vip1: number;
  price_vip2: number;

  // Warehouse Stocks
  stock_wh1: number;
  stock_wh2: number;
  stock_wh3: number;
  stock_wh4: number;
  stock_wh5: number;
  stock_wh6: number;

  // Soft delete fields
  is_deleted?: boolean;
  deleted_at?: string;
  updated_at?: string;
}

export interface InventoryLog {
  id: string;
  item_id: string;
  date: string;
  transaction_type: 'Purchase Order' | 'Invoice' | 'Order Slip' | 'Transfer Receipt' | 'Credit Memo' | 'Stock Adjustment';
  reference_no: string;
  partner: string;
  warehouse_id: string;
  qty_in: number;
  qty_out: number;
  status_indicator: '+' | '-';
  unit_price: number;
  processed_by: string;
  notes?: string;
  created_at: string;
  updated_at?: string;
  is_deleted?: boolean;
  deleted_at?: string;
  balance?: number;
}

export interface InventoryLogWithProduct extends InventoryLog {
  product?: Product;
}

export interface InventoryLogFilters {
  item_id?: string;
  warehouse_id?: string;
  date_from?: string;
  date_to?: string;
  transaction_type?: string;
}

export type ReorderStatus = 'critical' | 'low' | 'healthy';

export interface ReorderReportEntry {
  id: string;
  product_id?: string;
  part_no: string;
  description?: string;
  brand?: string;
  reorder_point: number;
  total_stock: number;
  replenish_quantity: number;
  status: ReorderStatus;
  stock_snapshot: Record<string, number>;
  notes?: string;
  created_at: string;
  updated_at: string;
}

// --- Daily Call Monitoring Types ---
export type CallOutcome = 'follow_up' | 'positive' | 'negative' | 'other';

export interface CallLogEntry {
  id: string;
  contact_id: string;
  agent_name: string;
  channel: 'call' | 'text';
  direction: 'inbound' | 'outbound';
  duration_seconds: number;
  notes?: string;
  outcome: CallOutcome;
  occurred_at: string;
  next_action?: string | null;
  next_action_due?: string | null;
}

export interface Inquiry {
  id: string;
  contact_id: string;
  title: string;
  channel: 'call' | 'text' | 'email' | 'chat';
  sentiment?: 'positive' | 'neutral' | 'negative';
  occurred_at: string;
  notes?: string;
}

export interface Purchase {
  id: string;
  contact_id: string;
  amount: number;
  status: 'paid' | 'pending' | 'cancelled';
  purchased_at: string;
  notes?: string;
}

export interface TeamMessage {
  id: string;
  sender_id: string;
  sender_name: string;
  sender_avatar?: string;
  message: string;
  created_at: string;
  is_from_owner: boolean;
}

// --- Customer Database Enhancement Types ---

export interface PersonalComment {
  id: string;
  contact_id: string;
  author_id: string;
  author_name: string;
  author_avatar?: string;
  text: string;
  timestamp: string;
}

export interface SalesReport {
  id: string;
  contact_id: string;
  date: string;
  time: string;
  products: Array<{
    name: string;
    quantity: number;
    price: number;
  }>;
  totalAmount: number;
  currency: string;
  salesAgent: string;
  approvalStatus: 'pending' | 'approved' | 'rejected';
  approvedBy?: string;
  approvalDate?: string;
  notes?: string;
  created_at: string;
}

export interface DiscountRequest {
  id: string;
  contact_id: string;
  inquiry_id?: string;
  requestDate: string;
  discountPercentage: number;
  reason: string;
  status: 'pending' | 'approved' | 'rejected';
  approvedBy?: string;
  approvalDate?: string;
  notes?: string;
}

export interface UpdatedContactDetails {
  id: string;
  contact_id: string;
  changedFields: Record<string, {
    oldValue: any;
    newValue: any;
  }>;
  submittedBy: string;
  submittedDate: string;
  approvalStatus: 'pending' | 'approved' | 'rejected';
  approvedBy?: string;
  approvalDate?: string;
  notes?: string;
}

export interface SalesProgress {
  id: string;
  contact_id: string;
  inquiryDate: string;
  inquiry: string;
  stage: DealStage;
  stageChangedDate: string;
  expectedClosureDate?: string;
  outcome?: 'closed_won' | 'closed_lost';
  outcomDate?: string;
  lostReason?: string;
  notes?: string;
}

export interface RelatedTransaction {
  transaction_type: 'invoice' | 'order_slip' | 'sales_order' | 'sales_inquiry' | 'purchase_history';
  transaction_id: string;
  transaction_number: string;
  transaction_date: string;
}

export interface IncidentReport {
  id: string;
  contact_id: string;
  report_date: string;
  incident_date: string;
  issue_type: 'product_quality' | 'service_quality' | 'delivery' | 'other';
  description: string;
  reported_by: string;
  attachments?: string[];
  related_transactions?: RelatedTransaction[];
  approval_status: 'pending' | 'approved' | 'rejected';
  approved_by?: string;
  approval_date?: string;
  notes?: string;
}

export interface CreateIncidentReportInput {
  contact_id: string;
  report_date: string;
  incident_date: string;
  issue_type: 'product_quality' | 'service_quality' | 'delivery' | 'other';
  description: string;
  reported_by: string;
  attachments?: string[];
  related_transactions?: RelatedTransaction[];
  notes?: string;
}

export interface ContactTransaction {
  id: string;
  type: 'invoice' | 'order_slip' | 'sales_order' | 'sales_inquiry' | 'purchase_history';
  number: string;
  date: string;
  amount: number;
  label: string;
}

export interface IncidentReportWithCustomer extends IncidentReport {
  customer_company: string;
  customer_city: string;
  customer_salesman: string;
  contacts?: {
    company: string;
    city: string;
    salesman: string;
  };
}

export interface SalesReturn {
  id: string;
  contact_id: string;
  incident_report_id: string;
  returnDate: string;
  products: Array<{
    name: string;
    quantity: number;
    originalPrice: number;
    refundAmount: number;
  }>;
  totalRefund: number;
  currency: string;
  reason: string;
  status: 'processed' | 'pending';
  processedBy?: string;
  processedDate?: string;
  notes?: string;
}

export interface PurchaseHistory {
  id: string;
  contact_id: string;
  purchaseDate: string;
  products: Array<{
    name: string;
    quantity: number;
    price: number;
  }>;
  totalAmount: number;
  currency: string;
  paymentStatus: 'paid' | 'pending' | 'overdue';
  invoiceNumber?: string;
  notes?: string;
}

export interface InquiryHistory {
  id: string;
  contact_id: string;
  inquiryDate: string;
  product: string;
  quantity: number;
  status: 'converted' | 'pending' | 'cancelled';
  convertedToPurchase?: boolean;
  notes?: string;
}

export interface PaymentTerms {
  id: string;
  contact_id: string;
  termsType: 'cash' | 'credit' | 'installment';
  creditDays?: number;
  installmentMonths?: number;
  startDate: string;
  endDate?: string;
  status: 'active' | 'expired' | 'upgraded' | 'downgraded';
  previousTerms?: string;
  changedDate: string;
  changedBy?: string;
  reason?: string;
}

export interface CustomerMetrics {
  contact_id: string;
  averageMonthlyPurchase: number;
  purchaseFrequency: number; // Days between purchases
  outstandingBalance: number;
  totalPurchases: number;
  lastPurchaseDate?: string;
  averageOrderValue: number;
  currency: string;
}

// Management Page Types
export interface SalesPerformanceData {
  salesPersonName: string;
  currentMonthSales: number;
  previousMonthSales: number;
  salesChange: number;
  percentageChange: number;
  customerCount: number;
}

export interface CityPerformanceData {
  city: string;
  currentMonthSales: number;
  previousMonthSales: number;
  salesChange: number;
  percentageChange: number;
  customerCount: number;
}

export interface CustomerStatusPerformance {
  status: CustomerStatus;
  currentMonthSales: number;
  previousMonthSales: number;
  salesChange: number;
  percentageChange: number;
  customerCount: number;
}

export interface PaymentTypePerformance {
  paymentType: 'cash' | 'credit' | 'term';
  currentMonthSales: number;
  previousMonthSales: number;
  salesChange: number;
  percentageChange: number;
  customerCount: number;
}

export interface CustomerStatusNotification {
  id: string;
  contactId: string;
  company: string;
  city: string;
  salesman: string;
  status: CustomerStatus;
  notificationType: 'sales_increase' | 'sales_decrease' | 'inactive' | 'inactive_critical' | 'inquiry_only';
  lastPurchaseDate?: string;
  daysSinceLastPurchase?: number;
  currentMonthSales?: number;
  previousMonthSales?: number;
  salesChange?: number;
  inquiryToSalesRatio?: number;
  outstandingBalance?: number;
  severity: 'high' | 'medium' | 'low';
  createdAt: string;
}

export interface InquiryOnlyAlert {
  id: string;
  contactId: string;
  company: string;
  city: string;
  salesman: string;
  totalInquiries: number;
  totalPurchases: number;
  inquiryToPurchaseRatio: number;
  lastInquiryDate?: string;
  lastPurchaseDate?: string;
}

export interface MonthlyTeamPerformance {
  month: string;
  totalSales: number;
  activeSalesCount: number;
  totalCustomers: number;
  averageOrderValue: number;
}

// --- Sales Performance Leaderboard Types ---

export interface AgentSalesData {
  agent_id: string;
  agent_name: string;
  avatar_url?: string;
  total_sales: number;
  rank: number;
}

export interface TopCustomer {
  id: string;
  company: string;
  total_sales: number;
  last_purchase_date?: string;
}

export interface AgentPerformanceSummary {
  agent_id: string;
  agent_name: string;
  avatar_url?: string;
  monthly_quota: number;
  current_achievement: number;
  remaining_quota: number;
  achievement_percentage: number;
  prospective_count: number;
  active_count: number;
  inactive_count: number;
  // new fields for sales breakdown
  active_sales: number;
  prospective_sales: number;
  inactive_sales: number;
  top_customers: TopCustomer[];
}

// --- Sales Inquiry Types ---

export interface SalesInquiryItem {
  id: string;
  inquiry_id: string;
  item_id?: string;
  qty: number;
  part_no: string;
  item_code: string;
  location: string;
  description: string;
  unit_price: number;
  amount: number;
  remark?: string;
  approval_status: 'pending' | 'approved' | 'rejected';
}

export interface SalesInquiry {
  id: string;
  inquiry_no: string;
  contact_id: string;
  sales_date: string;
  sales_person: string;
  delivery_address: string;
  reference_no: string;
  customer_reference: string;
  send_by: string;
  price_group: string;
  credit_limit: number;
  terms: string;
  promise_to_pay: string;
  po_number: string;
  remarks?: string;
  inquiry_type: string;
  urgency: string;
  urgency_date?: string;
  grand_total: number;
  created_by: string;
  created_at: string;
  updated_at?: string;
  status: SalesInquiryStatus;
  is_deleted: boolean;
  deleted_at?: string;
  items?: SalesInquiryItem[];
}

export interface InquiryReportFilters {
  dateFrom: string;
  dateTo: string;
  customerId?: string;
  reportType: 'today' | 'week' | 'month' | 'year' | 'custom';
}

export interface InquiryReportData extends SalesInquiry {
  customer_company: string;
  formatted_date: string;
  formatted_time: string;
}

export interface SalesInquiryDTO {
  contact_id: string;
  sales_date: string;
  sales_person: string;
  delivery_address: string;
  reference_no: string;
  customer_reference: string;
  send_by: string;
  price_group: string;
  credit_limit: number;
  terms: string;
  promise_to_pay: string;
  po_number: string;
  remarks?: string;
  inquiry_type: string;
  urgency: string;
  urgency_date?: string;
  status?: SalesInquiryStatus;
  items: Omit<SalesInquiryItem, 'id' | 'inquiry_id'>[];
}

export interface SalesOrderItem {
  id: string;
  order_id: string;
  item_id?: string;
  qty: number;
  part_no: string;
  item_code: string;
  location: string;
  description: string;
  unit_price: number;
  amount: number;
  remark?: string;
  approval_status?: 'pending' | 'approved' | 'rejected';
}

export interface SalesOrder {
  id: string;
  order_no: string;
  inquiry_id?: string;
  contact_id: string;
  sales_date: string;
  sales_person: string;
  delivery_address: string;
  reference_no: string;
  customer_reference: string;
  send_by: string;
  price_group: string;
  credit_limit: number;
  terms: string;
  promise_to_pay: string;
  po_number: string;
  remarks?: string;
  inquiry_type: string;
  urgency: string;
  urgency_date?: string;
  grand_total: number;
  status: SalesOrderStatus;
  approved_by?: string;
  approved_at?: string;
  created_by: string;
  created_at: string;
  updated_at?: string;
  items: SalesOrderItem[];
  is_deleted?: boolean;
  deleted_at?: string;
}

export interface SalesOrderDTO {
  inquiry_id?: string;
  contact_id: string;
  sales_date: string;
  sales_person: string;
  delivery_address: string;
  reference_no: string;
  customer_reference: string;
  send_by: string;
  price_group: string;
  credit_limit: number;
  terms: string;
  promise_to_pay: string;
  po_number: string;
  remarks?: string;
  inquiry_type: string;
  urgency: string;
  urgency_date?: string;
  status?: SalesOrderStatus;
  approved_by?: string;
  approved_at?: string;
  items: Omit<SalesOrderItem, 'id' | 'order_id'>[];
}

export interface OrderSlipItem {
  id: string;
  order_slip_id: string;
  item_id?: string;
  qty: number;
  part_no: string;
  item_code: string;
  location: string;
  description: string;
  unit_price: number;
  amount: number;
  remark?: string;
}

export interface OrderSlip {
  id: string;
  slip_no: string;
  order_id: string;
  contact_id: string;
  sales_date: string;
  sales_person: string;
  delivery_address: string;
  reference_no: string;
  customer_reference: string;
  send_by: string;
  price_group: string;
  credit_limit: number;
  terms: string;
  promise_to_pay: string;
  po_number: string;
  remarks?: string;
  inquiry_type: string;
  urgency: string;
  urgency_date?: string;
  grand_total: number;
  status: OrderSlipStatus;
  printed_at?: string;
  printed_by?: string;
  created_by: string;
  created_at: string;
  updated_at?: string;
  items: OrderSlipItem[];
  is_deleted?: boolean;
  deleted_at?: string;
}

export interface OrderSlipDTO {
  order_id: string;
  contact_id: string;
  sales_date: string;
  sales_person: string;
  delivery_address: string;
  reference_no: string;
  customer_reference: string;
  send_by: string;
  price_group: string;
  credit_limit: number;
  terms: string;
  promise_to_pay: string;
  po_number: string;
  remarks?: string;
  inquiry_type: string;
  urgency: string;
  urgency_date?: string;
  status?: OrderSlipStatus;
  printed_at?: string;
  printed_by?: string;
  items: Omit<OrderSlipItem, 'id' | 'order_slip_id'>[];
}

export interface InvoiceItem {
  id: string;
  invoice_id: string;
  item_id?: string;
  qty: number;
  part_no: string;
  item_code: string;
  description: string;
  unit_price: number;
  amount: number;
  // Optional per-line VAT rate; manual invoices may populate this
  // but it is not derived when converting sales orders, which use a global VAT rule.
  vat_rate?: number;
}

export interface Invoice {
  id: string;
  invoice_no: string;
  order_id: string;
  contact_id: string;
  sales_date: string;
  sales_person: string;
  delivery_address: string;
  reference_no: string;
  customer_reference: string;
  send_by: string;
  price_group: string;
  credit_limit: number;
  terms: string;
  promise_to_pay: string;
  po_number: string;
  remarks?: string;
  inquiry_type: string;
  urgency: string;
  urgency_date?: string;
  grand_total: number;
  status: InvoiceStatus;
  due_date?: string;
  payment_date?: string;
  payment_method?: string;
  printed_at?: string;
  sent_at?: string;
  created_by: string;
  created_at: string;
  updated_at?: string;
  items: InvoiceItem[];
  is_deleted?: boolean;
  deleted_at?: string;
}

export interface InvoiceDTO {
  order_id: string;
  contact_id: string;
  sales_date: string;
  sales_person: string;
  delivery_address: string;
  reference_no: string;
  customer_reference: string;
  send_by: string;
  price_group: string;
  credit_limit: number;
  terms: string;
  promise_to_pay: string;
  po_number: string;
  remarks?: string;
  inquiry_type: string;
  urgency: string;
  urgency_date?: string;
  status?: InvoiceStatus;
  due_date?: string;
  payment_date?: string;
  payment_method?: string;
  printed_at?: string;
  sent_at?: string;
  items: Omit<InvoiceItem, 'id' | 'invoice_id'>[];
}

// --- Developer Cockpit Types ---

export enum LogType {
  SYSTEM = 'system',
  SECURITY = 'security',
  PERFORMANCE = 'performance',
  ERROR = 'error',
  WARNING = 'warning',
  INFO = 'info'
}

export enum LogLevel {
  DEBUG = 'debug',
  INFO = 'info',
  WARN = 'warn',
  ERROR = 'error',
  FATAL = 'fatal'
}

export interface SystemLog {
  id: string;
  log_type: LogType;
  log_level: LogLevel;
  message: string;
  details: Record<string, any>;
  user_id: string;
  ip_address: string;
  user_agent: string;
  created_at: string;
  is_deleted: boolean;
  deleted_at: string | null;
}

export interface SystemMetric {
  id: string;
  metric_name: string;
  metric_value: Record<string, any>;
  timestamp: string;
  is_deleted: boolean;
  deleted_at: string | null;
}

export enum DeploymentType {
  API = 'api',
  FRONTEND = 'frontend',
  DATABASE = 'database',
  INFRASTRUCTURE = 'infrastructure'
}

export enum DeploymentStatus {
  PENDING = 'pending',
  IN_PROGRESS = 'in_progress',
  SUCCESS = 'success',
  FAILED = 'failed',
  ROLLBACK = 'rollback'
}

export interface DeploymentRecord {
  id: string;
  deployment_type: DeploymentType;
  deployment_version: string;
  deployment_description: string;
  deployment_status: DeploymentStatus;
  deployment_start: string;
  deployment_end: string | null;
  deployment_log: string;
  is_deleted: boolean;
  deleted_at: string | null;
}

export interface SystemSetting {
  id: string;
  setting_key: string;
  setting_value: Record<string, any>;
  description: string;
  is_deleted: boolean;
  deleted_at: string | null;
}

// --- Recycle Bin Types ---

export enum RecycleBinItemType {
  CONTACT = 'contact',
  INQUIRY = 'inquiry',
  ORDER = 'order',
  ORDERSLIP = 'orderslip',
  INVOICE = 'invoice',
  TASK = 'task',
  PRODUCT = 'product',
  TEAM_MESSAGE = 'team_message',
  COMMENT = 'comment',
  NOTIFICATION = 'notification'
}

export interface RecycleBinItem {
  id: string;
  item_type: RecycleBinItemType;
  item_id: string;
  original_data: Record<string, any>;
  deleted_by: string;
  deleted_at: string;
  restore_token: string;
  expires_at: string;
  is_restored: boolean;
  restored_at: string | null;
  restored_by: string | null;
  permanent_delete_at: string;
}

// Purchase Order types
export interface PurchaseOrderItem {
  id: string;
  po_id: string;
  item_id: string;
  qty: number;
  unit_price: number;
  amount: number;
  notes?: string;
}

export interface PurchaseOrder {
  id: string;
  po_no: string;
  supplier_id: string;
  order_date: string;
  delivery_date?: string;
  warehouse_id: string;
  status: 'draft' | 'ordered' | 'delivered' | 'cancelled';
  grand_total: number;
  created_by: string;
  created_at: string;
  updated_at: string;
  is_deleted: boolean;
  deleted_at?: string;
  items?: PurchaseOrderItem[];
}

export interface PurchaseOrderDTO {
  po_no: string;
  supplier_id: string;
  order_date: string;
  delivery_date?: string;
  warehouse_id: string;
  items: Omit<PurchaseOrderItem, 'id' | 'po_id' | 'amount'>[];
}

export enum PurchaseOrderStatus {
  DRAFT = 'draft',
  ORDERED = 'ordered',
  DELIVERED = 'delivered',
  CANCELLED = 'cancelled'
}

// Stock Adjustment types
export interface StockAdjustmentItem {
  id: string;
  adjustment_id: string;
  item_id: string;
  system_qty: number;
  physical_qty: number;
  difference: number;
  reason?: string;
}

export interface StockAdjustment {
  id: string;
  adjustment_no: string;
  adjustment_date: string;
  warehouse_id: string;
  adjustment_type: 'physical_count' | 'damage' | 'correction';
  notes?: string;
  status: 'draft' | 'finalized';
  processed_by?: string;
  created_at: string;
  updated_at: string;
  items?: StockAdjustmentItem[];
}

export interface StockAdjustmentDTO {
  adjustment_no: string;
  adjustment_date: string;
  warehouse_id: string;
  adjustment_type: 'physical_count' | 'damage' | 'correction';
  notes?: string;
  items: Omit<StockAdjustmentItem, 'id' | 'adjustment_id' | 'difference'>[];
}

export enum StockAdjustmentType {
  PHYSICAL_COUNT = 'physical_count',
  DAMAGE = 'damage',
  CORRECTION = 'correction'
}
