

import React, { useEffect, useState, useRef } from 'react';
import { LayoutDashboard, Mail, Calendar, Phone, CheckSquare, Users, Settings, HelpCircle, Columns, UserCog, Package, ClipboardList, BarChart3, FileText, FileCheck, FileOutput, Receipt, Trash2, ChevronUp, ChevronDown } from 'lucide-react';
import { UserProfile } from '../types';
import { DOCUMENT_POLICY_STORAGE_KEY, isInvoiceAllowedForTransactionType, isOrderSlipAllowedForTransactionType, readDocumentPolicyFromStorage } from '../services/salesOrderService';

interface SidebarProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
  user?: UserProfile | null;
}

const Sidebar: React.FC<SidebarProps> = ({ activeTab, setActiveTab, user }) => {
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const [showScrollTop, setShowScrollTop] = useState(false);
  const [showScrollBottom, setShowScrollBottom] = useState(false);

  const menuItems = [
    { id: 'dashboard', icon: LayoutDashboard, label: 'Dashboard', group: 'main' },
    { id: 'pipelines', icon: Columns, label: 'Pipelines', group: 'main' },
    { id: 'customers', icon: Users, label: 'Customer Database', group: 'data' },
    { id: 'products', icon: Package, label: 'Product Database', group: 'data' },
    { id: 'reorder', icon: ClipboardList, label: 'Reorder Report', group: 'data' },
    { id: 'salesinquiry', icon: FileText, label: 'Sales Inquiry', group: 'sales' },
    { id: 'salesorder', icon: FileCheck, label: 'Sales Orders', group: 'sales' },
    { id: 'orderslip', icon: FileOutput, label: 'Order Slips', group: 'sales' },
    { id: 'invoice', icon: Receipt, label: 'Invoices', group: 'sales' },
    { id: 'staff', icon: UserCog, label: 'Staff & Agents', group: 'admin' },
    { id: 'management', icon: BarChart3, label: 'Management', group: 'admin' },
    { id: 'mail', icon: Mail, label: 'Inbox', group: 'tools' },
    { id: 'calendar', icon: Calendar, label: 'Calendar', group: 'tools' },
    { id: 'calls', icon: Phone, label: 'Daily Call Monitoring', group: 'tools' },
    { id: 'tasks', icon: CheckSquare, label: 'Tasks', group: 'tools' },
    { id: 'recyclebin', icon: Trash2, label: 'Recycle Bin', group: 'admin' },
  ];

  // Logic to determine if an item is allowed
  const isItemAllowed = (itemId: string) => {
    // If no user, or no access rights (and not legacy), hide.
    // Owner always sees everything (handled by '*' or explicit list in seed).
    // We check if access_rights includes the ID or '*'
    if (!user) return false;

    // Special case: Recycle Bin only for Owner or Developer
    if (itemId === 'recyclebin') {
      return user.role === 'Owner' || user.role === 'Developer';
    }

    if (user.role === 'Owner') return true;
    if (!user.access_rights) return true; // Fallback: if undefined, show all (or hide all depending on security model)

    return user.access_rights.includes('*') || user.access_rights.includes(itemId);
  };

  // Settings is special - usually visible to everyone but internal pages might be restricted.
  // Or we can restrict the Settings button itself.
  // For this implementation, we will restrict the Settings button to Owner only.
  const canSeeSettings = user?.role === 'Owner' || (user?.access_rights && user.access_rights.includes('settings'));

  const allowedMenuItems = menuItems.filter(item => isItemAllowed(item.id));

  // Check scroll position to show/hide scroll indicators
  const checkScroll = () => {
    if (!scrollContainerRef.current) return;
    const { scrollTop, scrollHeight, clientHeight } = scrollContainerRef.current;
    setShowScrollTop(scrollTop > 10);
    setShowScrollBottom(scrollTop + clientHeight < scrollHeight - 10);
  };

  useEffect(() => {
    checkScroll();
    const container = scrollContainerRef.current;
    if (container) {
      container.addEventListener('scroll', checkScroll);
      // Check on resize as well
      window.addEventListener('resize', checkScroll);
      return () => {
        container.removeEventListener('scroll', checkScroll);
        window.removeEventListener('resize', checkScroll);
      };
    }
  }, [allowedMenuItems]);

  const scrollTo = (direction: 'up' | 'down') => {
    if (!scrollContainerRef.current) return;
    const scrollAmount = 200;
    scrollContainerRef.current.scrollBy({
      top: direction === 'up' ? -scrollAmount : scrollAmount,
      behavior: 'smooth'
    });
  };

  return (
    <div className="w-16 h-full bg-white dark:bg-slate-900 border-r border-gray-200 dark:border-slate-800 flex flex-col items-center fixed left-0 top-14 z-40 shadow-[2px_0_5px_-2px_rgba(0,0,0,0.05)] print:hidden">
      {/* Scroll Up Indicator */}
      {showScrollTop && (
        <button
          onClick={() => scrollTo('up')}
          className="w-full py-2 flex items-center justify-center bg-gradient-to-b from-white dark:from-slate-900 to-transparent text-gray-400 dark:text-slate-500 hover:text-brand-blue dark:hover:text-brand-blue transition-colors z-10"
          aria-label="Scroll up"
        >
          <ChevronUp className="w-4 h-4" />
        </button>
      )}

      {/* Scrollable Menu Items */}
      <div
        ref={scrollContainerRef}
        className="flex-1 w-full overflow-y-auto overflow-x-hidden scrollbar-thin scrollbar-thumb-gray-300 dark:scrollbar-thumb-slate-700 scrollbar-track-transparent hover:scrollbar-thumb-gray-400 dark:hover:scrollbar-thumb-slate-600"
        style={{ scrollbarWidth: 'thin' }}
      >
        <div className="space-y-2 flex flex-col items-center px-2 py-3">
          {allowedMenuItems.map((item, index) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;
            const prevItem = allowedMenuItems[index - 1];
            const showDivider = prevItem && prevItem.group !== item.group;

            return (
              <React.Fragment key={item.id}>
                {showDivider && (
                  <div className="w-8 h-px bg-gray-200 dark:bg-slate-700 my-1" />
                )}
                <div className="relative group">
                  <button
                    onClick={() => setActiveTab(item.id)}
                    className={`w-10 h-10 flex items-center justify-center rounded-xl transition-all duration-200 relative ${isActive
                      ? 'bg-brand-blue/10 dark:bg-brand-blue/20 text-brand-blue shadow-sm'
                      : 'text-gray-400 dark:text-slate-500 hover:bg-gray-50 dark:hover:bg-slate-800 hover:text-gray-600 dark:hover:text-slate-300'
                      }`}
                    aria-label={item.label}
                  >
                    <Icon className="w-5 h-5" />
                    {isActive && <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-5 bg-brand-blue rounded-r-full -ml-3"></div>}
                  </button>
                  {/* Tooltip */}
                  <div className="absolute left-full top-1/2 -translate-y-1/2 ml-2 px-2 py-1 bg-slate-800 dark:bg-slate-700 text-white text-xs rounded opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity whitespace-nowrap z-50">
                    {item.label}
                  </div>
                </div>
              </React.Fragment>
            );
          })}
        </div>
      </div>

      {/* Scroll Down Indicator */}
      {showScrollBottom && (
        <button
          onClick={() => scrollTo('down')}
          className="w-full py-2 flex items-center justify-center bg-gradient-to-t from-white dark:from-slate-900 to-transparent text-gray-400 dark:text-slate-500 hover:text-brand-blue dark:hover:text-brand-blue transition-colors z-10"
          aria-label="Scroll down"
        >
          <ChevronDown className="w-4 h-4" />
        </button>
      )}

      {/* Bottom Fixed Actions */}
      <div className="space-y-2 py-3 border-t border-gray-200 dark:border-slate-800 w-full flex flex-col items-center">
        {canSeeSettings && (
          <div className="relative group">
            <button
              onClick={() => setActiveTab('settings')}
              className={`w-10 h-10 flex items-center justify-center rounded-xl transition-all duration-200 ${activeTab === 'settings' ? 'bg-brand-blue/10 dark:bg-brand-blue/20 text-brand-blue shadow-sm' : 'text-gray-400 dark:text-slate-500 hover:text-gray-600 dark:hover:text-slate-300 hover:bg-gray-50 dark:hover:bg-slate-800'}`}
              aria-label="Settings"
            >
              <Settings className="w-5 h-5" />
            </button>
            <div className="absolute left-full top-1/2 -translate-y-1/2 ml-2 px-2 py-1 bg-slate-800 dark:bg-slate-700 text-white text-xs rounded opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity whitespace-nowrap z-50">
              Settings
            </div>
          </div>
        )}
        <div className="relative group">
          <button
            className="w-10 h-10 flex items-center justify-center text-gray-400 dark:text-slate-500 hover:text-gray-600 dark:hover:text-slate-300 rounded-xl hover:bg-gray-50 dark:hover:bg-slate-800 transition-all duration-200"
            aria-label="Help"
          >
            <HelpCircle className="w-5 h-5" />
          </button>
          <div className="absolute left-full top-1/2 -translate-y-1/2 ml-2 px-2 py-1 bg-slate-800 dark:bg-slate-700 text-white text-xs rounded opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity whitespace-nowrap z-50">
            Help
          </div>
        </div>
      </div>
    </div>
  );
};

export default Sidebar;
