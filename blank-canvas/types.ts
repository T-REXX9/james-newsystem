

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

export interface UserProfile {
  id: string;
  email: string;
  full_name?: string;
  avatar_url?: string;
  role?: string;
  access_rights?: string[]; // List of module IDs allowed
  birthday?: string;
  mobile?: string;
}

export interface ProfileRow extends UserProfile {
  created_at: string;
  updated_at: string;
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
