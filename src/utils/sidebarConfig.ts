import {
  LayoutDashboard,
  Mail,
  Calendar,
  Phone,
  CheckSquare,
  Users,
  Settings,
  Columns,
  UserCog,
  Package,
  ClipboardList,
  BarChart3,
  FileText,
  FileCheck,
  FileOutput,
  Receipt,
  Trash2,
  Truck,
  ClipboardCheck,
  ShoppingCart,
  RotateCcw,
} from 'lucide-react';

import type { MenuCategory, MenuSubCategory, MenuItemLeaf } from '../../types';
import type { MenuItem } from '../../components/SidebarMenuItem';

// --- Hierarchical menu configuration ---

const createLeaf = (
  id: string,
  label: string,
  parentId: string,
  route: string,
  icon?: any,
): MenuItemLeaf => ({
  id,
  label,
  icon,
  level: 3,
  parentId,
  route,
  isExpandable: false,
});

const HOME_CATEGORY: MenuCategory = {
  id: 'home',
  label: 'Dashboard',
  icon: LayoutDashboard,
  level: 1,
  parentId: null,
  route: 'home',
  isExpandable: false,
};

const WAREHOUSE_CATEGORY: MenuCategory = {
  id: 'warehouse',
  label: 'Warehouse',
  icon: Package,
  level: 1,
  parentId: null,
  isExpandable: true,
  children: [
    {
      id: 'warehouse-inventory',
      label: 'Inventory',
      icon: ClipboardList,
      level: 2,
      parentId: 'warehouse',
      isExpandable: true,
      children: [
        createLeaf(
          'warehouse-inventory-product-database',
          'Product Database',
          'warehouse-inventory',
          'warehouse-inventory-product-database',
          Package,
        ),
        createLeaf(
          'warehouse-inventory-stock-movement',
          'Stock Movement',
          'warehouse-inventory',
          'warehouse-inventory-stock-movement',
          FileOutput,
        ),
        createLeaf(
          'warehouse-inventory-transfer-stock',
          'Transfer Stock',
          'warehouse-inventory',
          'warehouse-inventory-transfer-stock',
          Truck,
        ),
        createLeaf(
          'warehouse-inventory-inventory-audit',
          'Inventory Audit',
          'warehouse-inventory',
          'warehouse-inventory-inventory-audit',
          ClipboardCheck,
        ),
      ],
    } satisfies MenuSubCategory,
    {
      id: 'warehouse-purchasing',
      label: 'Purchasing',
      icon: Truck,
      level: 2,
      parentId: 'warehouse',
      isExpandable: true,
      children: [
        createLeaf(
          'warehouse-purchasing-purchase-request',
          'Purchase Request',
          'warehouse-purchasing',
          'warehouse-purchasing-purchase-request',
          FileText,
        ),
        createLeaf(
          'warehouse-purchasing-purchase-order',
          'Purchase Order',
          'warehouse-purchasing',
          'warehouse-purchasing-purchase-order',
          FileCheck,
        ),
        createLeaf(
          'warehouse-purchasing-receiving-stock',
          'Receiving Stock',
          'warehouse-purchasing',
          'warehouse-purchasing-receiving-stock',
          Package,
        ),
        createLeaf(
          'warehouse-purchasing-return-to-supplier',
          'Return to Supplier',
          'warehouse-purchasing',
          'warehouse-purchasing-return-to-supplier',
          RotateCcw,
        ),
      ],
    } satisfies MenuSubCategory,
    {
      id: 'warehouse-reports',
      label: 'Reports',
      icon: FileText,
      level: 2,
      parentId: 'warehouse',
      isExpandable: true,
      children: [
        createLeaf(
          'warehouse-reports-inventory-report',
          'Inventory Report',
          'warehouse-reports',
          'warehouse-reports-inventory-report',
          FileText,
        ),
        createLeaf(
          'warehouse-reports-reorder-report',
          'Reorder Report',
          'warehouse-reports',
          'warehouse-reports-reorder-report',
          ClipboardList,
        ),
        createLeaf(
          'warehouse-reports-item-suggested-for-stock-report',
          'Item Suggested for Stock Report',
          'warehouse-reports',
          'warehouse-reports-item-suggested-for-stock-report',
          FileCheck,
        ),
        createLeaf(
          'warehouse-reports-fast-slow-inventory-report',
          'Fast/Slow Inventory Report',
          'warehouse-reports',
          'warehouse-reports-fast-slow-inventory-report',
          BarChart3,
        ),
      ],
    } satisfies MenuSubCategory,
  ],
};

const SALES_CATEGORY: MenuCategory = {
  id: 'sales',
  label: 'Sales',
  icon: BarChart3,
  level: 1,
  parentId: null,
  isExpandable: true,
  children: [
    {
      id: 'sales-pipeline',
      label: 'Pipeline',
      icon: Columns,
      level: 2,
      parentId: 'sales',
      isExpandable: true,
      children: [
        createLeaf(
          'sales-pipeline-board',
          'Pipelines',
          'sales-pipeline',
          'sales-pipeline-board',
          Columns,
        ),
      ],
    } satisfies MenuSubCategory,
    {
      id: 'sales-database',
      label: 'Database',
      icon: Users,
      level: 2,
      parentId: 'sales',
      isExpandable: true,
      children: [
        createLeaf(
          'sales-database-customer-database',
          'Customer Database',
          'sales-database',
          'sales-database-customer-database',
          Users,
        ),
      ],
    } satisfies MenuSubCategory,
    {
      id: 'sales-transaction',
      label: 'Transaction',
      icon: FileText,
      level: 2,
      parentId: 'sales',
      isExpandable: true,
      children: [
        createLeaf(
          'sales-transaction-sales-inquiry',
          'Sales Inquiry',
          'sales-transaction',
          'sales-transaction-sales-inquiry',
          FileText,
        ),
        createLeaf(
          'sales-transaction-sales-order',
          'Sales Orders',
          'sales-transaction',
          'sales-transaction-sales-order',
          FileCheck,
        ),
        createLeaf(
          'sales-transaction-order-slip',
          'Order Slips',
          'sales-transaction',
          'sales-transaction-order-slip',
          FileOutput,
        ),
        createLeaf(
          'sales-transaction-invoice',
          'Invoices',
          'sales-transaction',
          'sales-transaction-invoice',
          Receipt,
        ),
      ],
    } satisfies MenuSubCategory,
    {
      id: 'sales-reports',
      label: 'Reports',
      icon: FileText,
      level: 2,
      parentId: 'sales',
      isExpandable: true,
      children: [
        createLeaf(
          'sales-reports-inquiry-report',
          'Inquiry Report',
          'sales-reports',
          'sales-reports-inquiry-report',
          FileText,
        ),
        createLeaf(
          'sales-reports-sales-report',
          'Sales Report',
          'sales-reports',
          'sales-reports-sales-report',
          BarChart3,
        ),
        createLeaf(
          'sales-reports-sales-development-report',
          'Sales Development Report',
          'sales-reports',
          'sales-reports-sales-development-report',
          BarChart3,
        ),
      ],
    } satisfies MenuSubCategory,
    {
      id: 'sales-performance',
      label: 'Performance',
      icon: BarChart3,
      level: 2,
      parentId: 'sales',
      isExpandable: true,
      children: [
        createLeaf(
          'sales-performance-management-dashboard',
          'Management Dashboard',
          'sales-performance',
          'sales-performance-management-dashboard',
          BarChart3,
        ),
      ],
    } satisfies MenuSubCategory,
  ],
};

const ACCOUNTING_CATEGORY: MenuCategory = {
  id: 'accounting',
  label: 'Accounting',
  icon: Receipt,
  level: 1,
  parentId: null,
  isExpandable: true,
  children: [
    {
      id: 'accounting-transactions',
      label: 'Transactions',
      icon: FileText,
      level: 2,
      parentId: 'accounting',
      isExpandable: true,
      children: [
        createLeaf(
          'accounting-transactions-freight-charges-debit',
          'Freight Charges (Debit)',
          'accounting-transactions',
          'accounting-transactions-freight-charges-debit',
          Receipt,
        ),
        createLeaf(
          'accounting-transactions-sales-return-credit',
          'Sales Return (Credit)',
          'accounting-transactions',
          'accounting-transactions-sales-return-credit',
          RotateCcw,
        ),
        createLeaf(
          'accounting-transactions-adjustment-entry',
          'Adjustment Entry',
          'accounting-transactions',
          'accounting-transactions-adjustment-entry',
          FileCheck,
        ),
        createLeaf(
          'accounting-transactions-daily-collection-entry',
          'Daily Collection Entry',
          'accounting-transactions',
          'accounting-transactions-daily-collection-entry',
          FileText,
        ),
      ],
    } satisfies MenuSubCategory,
    {
      id: 'accounting-accounting',
      label: 'Accounting',
      icon: Receipt,
      level: 2,
      parentId: 'accounting',
      isExpandable: true,
      children: [
        createLeaf(
          'accounting-accounting-customer-ledger',
          'Customer Ledger',
          'accounting-accounting',
          'accounting-accounting-customer-ledger',
          FileText,
        ),
        createLeaf(
          'accounting-accounting-collection-summary',
          'Collection Summary',
          'accounting-accounting',
          'accounting-accounting-collection-summary',
          BarChart3,
        ),
        createLeaf(
          'accounting-accounting-statement-of-account',
          'Statement of Account',
          'accounting-accounting',
          'accounting-accounting-statement-of-account',
          FileText,
        ),
        createLeaf(
          'accounting-accounting-accounts-receivable',
          'Accounts Receivable',
          'accounting-accounting',
          'accounting-accounting-accounts-receivable',
          Receipt,
        ),
      ],
    } satisfies MenuSubCategory,
    {
      id: 'accounting-reports',
      label: 'Reports',
      icon: FileText,
      level: 2,
      parentId: 'accounting',
      isExpandable: true,
      children: [
        createLeaf(
          'accounting-reports-accounting-overview',
          'Accounting Overview',
          'accounting-reports',
          'accounting-reports-accounting-overview',
          FileText,
        ),
        createLeaf(
          'accounting-reports-aging-report',
          'Aging Report',
          'accounting-reports',
          'accounting-reports-aging-report',
          BarChart3,
        ),
        createLeaf(
          'accounting-reports-collection-report',
          'Collection Report',
          'accounting-reports',
          'accounting-reports-collection-report',
          BarChart3,
        ),
        createLeaf(
          'accounting-reports-sales-return-report',
          'Sales Return Report',
          'accounting-reports',
          'accounting-reports-sales-return-report',
          RotateCcw,
        ),
        createLeaf(
          'accounting-reports-accounts-receivable-report',
          'Accounts Receivable Report',
          'accounting-reports',
          'accounting-reports-accounts-receivable-report',
          Receipt,
        ),
      ],
    } satisfies MenuSubCategory,
  ],
};

const MAINTENANCE_CATEGORY: MenuCategory = {
  id: 'maintenance',
  label: 'Maintenance',
  icon: Settings,
  level: 1,
  parentId: null,
  isExpandable: true,
  children: [
    {
      id: 'maintenance-customer',
      label: 'Customer',
      icon: Users,
      level: 2,
      parentId: 'maintenance',
      isExpandable: true,
      children: [
        createLeaf(
          'maintenance-customer-customer-data',
          'Customer Data',
          'maintenance-customer',
          'maintenance-customer-customer-data',
          Users,
        ),
        createLeaf(
          'maintenance-customer-daily-call-monitoring',
          'Daily Call Monitoring',
          'maintenance-customer',
          'maintenance-customer-daily-call-monitoring',
          Phone,
        ),
        createLeaf(
          'maintenance-customer-customer-group',
          'Customer Group',
          'maintenance-customer',
          'maintenance-customer-customer-group',
          Users,
        ),
      ],
    } satisfies MenuSubCategory,
    {
      id: 'maintenance-product',
      label: 'Product',
      icon: Package,
      level: 2,
      parentId: 'maintenance',
      isExpandable: true,
      children: [
        createLeaf(
          'maintenance-product-suppliers',
          'Suppliers',
          'maintenance-product',
          'maintenance-product-suppliers',
          ShoppingCart,
        ),
        createLeaf(
          'maintenance-product-special-price',
          'Special Price',
          'maintenance-product',
          'maintenance-product-special-price',
          Receipt,
        ),
        createLeaf(
          'maintenance-product-category-management',
          'Category Management',
          'maintenance-product',
          'maintenance-product-category-management',
          ClipboardList,
        ),
        createLeaf(
          'maintenance-product-courier-management',
          'Courier Management',
          'maintenance-product',
          'maintenance-product-courier-management',
          Truck,
        ),
        createLeaf(
          'maintenance-product-remark-templates',
          'Remark Templates',
          'maintenance-product',
          'maintenance-product-remark-templates',
          FileText,
        ),
      ],
    } satisfies MenuSubCategory,
    {
      id: 'maintenance-profile',
      label: 'Profile',
      icon: UserCog,
      level: 2,
      parentId: 'maintenance',
      isExpandable: true,
      children: [
        createLeaf(
          'maintenance-profile-staff',
          'Staff',
          'maintenance-profile',
          'maintenance-profile-staff',
          UserCog,
        ),
        createLeaf(
          'maintenance-profile-team',
          'Team',
          'maintenance-profile',
          'maintenance-profile-team',
          Users,
        ),
        createLeaf(
          'maintenance-profile-approver',
          'Approver',
          'maintenance-profile',
          'maintenance-profile-approver',
          FileCheck,
        ),
        createLeaf(
          'maintenance-profile-activity-logs',
          'Activity Logs',
          'maintenance-profile',
          'maintenance-profile-activity-logs',
          FileText,
        ),
        createLeaf(
          'maintenance-profile-system-access',
          'System Access',
          'maintenance-profile',
          'maintenance-profile-system-access',
          Settings,
        ),
        createLeaf(
          'maintenance-profile-server-maintenance',
          'Server Maintenance',
          'maintenance-profile',
          'maintenance-profile-server-maintenance',
          Trash2,
        ),
      ],
    } satisfies MenuSubCategory,
  ],
};

const COMMUNICATION_CATEGORY: MenuCategory = {
  id: 'communication',
  label: 'Communication',
  icon: Mail,
  level: 1,
  parentId: null,
  isExpandable: true,
  children: [
    {
      id: 'communication-messaging',
      label: 'Messaging',
      icon: Mail,
      level: 2,
      parentId: 'communication',
      isExpandable: true,
      children: [
        createLeaf(
          'communication-messaging-inbox',
          'Inbox',
          'communication-messaging',
          'communication-messaging-inbox',
          Mail,
        ),
      ],
    } satisfies MenuSubCategory,
    {
      id: 'communication-text-menu',
      label: 'Text Menu',
      icon: Mail,
      level: 2,
      parentId: 'communication',
      isExpandable: true,
      children: [
        createLeaf(
          'communication-text-menu-text-messages',
          'Text Messages',
          'communication-text-menu',
          'communication-text-menu-text-messages',
          Mail,
        ),
        createLeaf(
          'communication-text-menu-inbox',
          'Inbox',
          'communication-text-menu',
          'communication-text-menu-inbox',
          Mail,
        ),
        createLeaf(
          'communication-text-menu-sent',
          'Sent',
          'communication-text-menu',
          'communication-text-menu-sent',
          Mail,
        ),
        createLeaf(
          'communication-text-menu-pending',
          'Pending',
          'communication-text-menu',
          'communication-text-menu-pending',
          Mail,
        ),
        createLeaf(
          'communication-text-menu-failed',
          'Failed',
          'communication-text-menu',
          'communication-text-menu-failed',
          Mail,
        ),
        createLeaf(
          'communication-text-menu-operator',
          'Operator',
          'communication-text-menu',
          'communication-text-menu-operator',
          Users,
        ),
      ],
    } satisfies MenuSubCategory,
    {
      id: 'communication-productivity',
      label: 'Productivity',
      icon: Calendar,
      level: 2,
      parentId: 'communication',
      isExpandable: true,
      children: [
        createLeaf(
          'communication-productivity-calendar',
          'Calendar',
          'communication-productivity',
          'communication-productivity-calendar',
          Calendar,
        ),
        createLeaf(
          'communication-productivity-daily-call-monitoring',
          'Daily Call Monitoring',
          'communication-productivity',
          'communication-productivity-daily-call-monitoring',
          Phone,
        ),
        createLeaf(
          'communication-productivity-tasks',
          'Tasks',
          'communication-productivity',
          'communication-productivity-tasks',
          CheckSquare,
        ),
      ],
    } satisfies MenuSubCategory,
  ],
};

export const HIERARCHICAL_MENU_CONFIG: MenuCategory[] = [
  HOME_CATEGORY,
  WAREHOUSE_CATEGORY,
  SALES_CATEGORY,
  ACCOUNTING_CATEGORY,
  MAINTENANCE_CATEGORY,
  COMMUNICATION_CATEGORY,
];

// --- Legacy flat exports (used by existing Sidebar implementation and tests) ---

export const SIDEBAR_GROUPS: Record<string, string> = {
  home: 'Home',
  warehouse: 'Warehouse',
  sales: 'Sales',
  accounting: 'Accounting',
  maintenance: 'Maintenance',
  communication: 'Communication',
};

const flattenToMenuItems = (config: MenuCategory[]): MenuItem[] => {
  const items: MenuItem[] = [];

  config.forEach(category => {
    // Category-level route (e.g. Home)
    if (category.route) {
      items.push({
        id: category.route,
        icon: category.icon,
        label: category.label,
        group: category.id,
        badge: 0,
      });
    }

    category.children?.forEach(child => {
      if ('children' in child && Array.isArray(child.children)) {
        child.children.forEach(leaf => {
          items.push({
            id: leaf.route,
            icon: leaf.icon || child.icon || category.icon,
            label: leaf.label,
            group: category.id,
            badge: 0,
          });
        });
      }
    });
  });

  return items;
};

export const SIDEBAR_CONFIG: MenuItem[] = flattenToMenuItems(HIERARCHICAL_MENU_CONFIG);
