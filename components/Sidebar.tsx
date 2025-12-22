

import React, { useEffect, useState, useRef, useMemo } from 'react';
import { LayoutDashboard, Mail, Calendar, Phone, CheckSquare, Users, Settings, HelpCircle, Columns, UserCog, Package, ClipboardList, BarChart3, FileText, FileCheck, FileOutput, Receipt, Trash2, ChevronUp, ChevronDown, Menu, X, Star } from 'lucide-react';
import { UserProfile } from '../types';
import { DOCUMENT_POLICY_STORAGE_KEY, isInvoiceAllowedForTransactionType, isOrderSlipAllowedForTransactionType, readDocumentPolicyFromStorage } from '../services/salesOrderService';
import { useSidebarState } from '../hooks/useSidebarState';
import { useKeyboardShortcuts } from '../hooks/useKeyboardShortcuts';
import { sidebarAnalytics } from '../utils/sidebarAnalytics';
import SidebarBadge from './SidebarBadge';
import SidebarSearch from './SidebarSearch';
import SidebarUserProfile from './SidebarUserProfile';

interface SidebarProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
  user?: UserProfile | null;
}

const Sidebar: React.FC<SidebarProps> = ({ activeTab, setActiveTab, user }) => {
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const [showScrollTop, setShowScrollTop] = useState(false);
  const [showScrollBottom, setShowScrollBottom] = useState(false);
  const [showKeyboardHelp, setShowKeyboardHelp] = useState(false);

  // Use custom hooks for sidebar state management
  const {
    isExpanded,
    favorites,
    searchQuery,
    toggleExpanded,
    toggleFavorite,
    isFavorite,
    updateSearchQuery,
  } = useSidebarState();

  const menuItems = [
    { id: 'dashboard', icon: LayoutDashboard, label: 'Dashboard', group: 'main', badge: 0 },
    { id: 'pipelines', icon: Columns, label: 'Pipelines', group: 'main', badge: 0 },
    { id: 'customers', icon: Users, label: 'Customer Database', group: 'data', badge: 0 },
    { id: 'products', icon: Package, label: 'Product Database', group: 'data', badge: 0 },
    { id: 'reorder', icon: ClipboardList, label: 'Reorder Report', group: 'data', badge: 0 },
    { id: 'salesinquiry', icon: FileText, label: 'Sales Inquiry', group: 'sales', badge: 0 },
    { id: 'salesorder', icon: FileCheck, label: 'Sales Orders', group: 'sales', badge: 0 },
    { id: 'orderslip', icon: FileOutput, label: 'Order Slips', group: 'sales', badge: 0 },
    { id: 'invoice', icon: Receipt, label: 'Invoices', group: 'sales', badge: 0 },
    { id: 'staff', icon: UserCog, label: 'Staff & Agents', group: 'admin', badge: 0 },
    { id: 'management', icon: BarChart3, label: 'Management', group: 'admin', badge: 0 },
    { id: 'mail', icon: Mail, label: 'Inbox', group: 'tools', badge: 0 },
    { id: 'calendar', icon: Calendar, label: 'Calendar', group: 'tools', badge: 0 },
    { id: 'calls', icon: Phone, label: 'Daily Call Monitoring', group: 'tools', badge: 0 },
    { id: 'tasks', icon: CheckSquare, label: 'Tasks', group: 'tools', badge: 0 },
    { id: 'recyclebin', icon: Trash2, label: 'Recycle Bin', group: 'admin', badge: 0 },
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

  // Filter menu items based on search query
  const filteredMenuItems = useMemo(() => {
    if (!searchQuery.trim()) return allowedMenuItems;
    const query = searchQuery.toLowerCase();
    return allowedMenuItems.filter(item =>
      item.label.toLowerCase().includes(query) ||
      item.id.toLowerCase().includes(query)
    );
  }, [allowedMenuItems, searchQuery]);

  // Separate favorites from regular items
  const favoriteItems = useMemo(() => {
    return filteredMenuItems.filter(item => isFavorite(item.id));
  }, [filteredMenuItems, favorites]);

  const regularItems = useMemo(() => {
    return filteredMenuItems.filter(item => !isFavorite(item.id));
  }, [filteredMenuItems, favorites]);

  // Group items by section
  const groupedItems = useMemo(() => {
    const groups: { [key: string]: typeof regularItems } = {};
    regularItems.forEach(item => {
      if (!groups[item.group]) {
        groups[item.group] = [];
      }
      groups[item.group].push(item);
    });
    return groups;
  }, [regularItems]);

  const groupLabels: { [key: string]: string } = {
    main: 'Main',
    data: 'Data Management',
    sales: 'Sales Workflow',
    admin: 'Administration',
    tools: 'Tools',
  };

  // Keyboard shortcuts
  useKeyboardShortcuts([
    {
      key: 'b',
      meta: true,
      handler: toggleExpanded,
      description: 'Toggle sidebar',
    },
    {
      key: 'k',
      meta: true,
      handler: () => {
        if (!isExpanded) {
          toggleExpanded();
        }
        setTimeout(() => searchInputRef.current?.focus(), 100);
      },
      description: 'Search navigation',
    },
    {
      key: '?',
      handler: () => setShowKeyboardHelp(true),
      description: 'Show keyboard shortcuts',
    },
  ], true);

  // Track module clicks
  const handleItemClick = (itemId: string) => {
    sidebarAnalytics.trackModuleClick(itemId);
    setActiveTab(itemId);
  };

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
    <>
      <div
        className={`
          ${isExpanded ? 'w-64' : 'w-16'}
          h-full bg-white dark:bg-slate-900
          border-r border-gray-200 dark:border-slate-800
          flex flex-col
          fixed left-0 top-14 z-40
          shadow-[2px_0_5px_-2px_rgba(0,0,0,0.05)]
          print:hidden
          transition-all duration-300 ease-in-out
        `}
        role="navigation"
        aria-label="Main navigation"
      >
        {/* Toggle Button */}
        <div className={`${isExpanded ? 'px-3' : 'px-2'} py-3 border-b border-gray-200 dark:border-slate-800`}>
          <button
            onClick={toggleExpanded}
            className={`
              ${isExpanded ? 'w-full justify-between' : 'w-10 justify-center'}
              h-10 flex items-center rounded-xl
              text-gray-600 dark:text-slate-400
              hover:bg-gray-50 dark:hover:bg-slate-800
              transition-all duration-200
              group
            `}
            aria-expanded={isExpanded}
            aria-label={isExpanded ? 'Collapse sidebar' : 'Expand sidebar'}
          >
            {isExpanded ? (
              <>
                <span className="text-sm font-semibold ml-2">Navigation</span>
                <X className="w-5 h-5 mr-1" />
              </>
            ) : (
              <Menu className="w-5 h-5" />
            )}
          </button>
        </div>

        {/* Search - Only when expanded */}
        {isExpanded && (
          <SidebarSearch
            value={searchQuery}
            onChange={updateSearchQuery}
            autoFocus={false}
          />
        )}

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
          <div className={`space-y-2 flex flex-col ${isExpanded ? 'items-stretch px-3' : 'items-center px-2'} py-3`}>
            {/* Favorites Section */}
            {favoriteItems.length > 0 && (
              <>
                {isExpanded && (
                  <div className="text-xs font-semibold text-slate-400 dark:text-slate-600 uppercase tracking-wider px-2 py-2">
                    Favorites
                  </div>
                )}
                {favoriteItems.map((item) => {
                  const Icon = item.icon;
                  const isActive = activeTab === item.id;

                  return (
                    <div key={item.id} className="relative group">
                      <button
                        onClick={() => handleItemClick(item.id)}
                        className={`
                        ${isExpanded ? 'w-full justify-start px-3 gap-3' : 'w-10 justify-center'}
                        h-10 flex items-center rounded-xl transition-all duration-200 relative
                        ${isActive
                            ? 'bg-brand-blue/10 dark:bg-brand-blue/20 text-brand-blue shadow-sm'
                            : 'text-gray-400 dark:text-slate-500 hover:bg-gray-50 dark:hover:bg-slate-800 hover:text-gray-600 dark:hover:text-slate-300 hover:scale-105'
                          }
                      `}
                        aria-label={item.label}
                      >
                        <div className="relative flex-shrink-0">
                          <Icon className="w-5 h-5" />
                          {item.badge > 0 && <SidebarBadge count={item.badge} isExpanded={false} />}
                        </div>
                        {isExpanded && (
                          <>
                            <span className="flex-1 text-sm font-medium text-left truncate">{item.label}</span>
                            {item.badge > 0 && <SidebarBadge count={item.badge} isExpanded={true} />}
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                toggleFavorite(item.id);
                              }}
                              className="flex-shrink-0 p-1 hover:bg-slate-200 dark:hover:bg-slate-700 rounded"
                              aria-label="Remove from favorites"
                            >
                              <Star className="w-3 h-3 fill-yellow-400 text-yellow-400" />
                            </button>
                          </>
                        )}
                        {isActive && !isExpanded && <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-5 bg-brand-blue rounded-r-full -ml-3"></div>}
                      </button>
                      {/* Tooltip - only when collapsed */}
                      {!isExpanded && (
                        <div className="absolute left-full top-1/2 -translate-y-1/2 ml-2 px-2 py-1 bg-slate-800 dark:bg-slate-700 text-white text-xs rounded opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity whitespace-nowrap z-50">
                          {item.label}
                        </div>
                      )}
                    </div>
                  );
                })}
                {isExpanded ? (
                  <div className="border-t border-slate-200 dark:border-slate-700 my-2" />
                ) : (
                  <div className="w-8 h-px bg-gray-200 dark:bg-slate-700 my-1" />
                )}
              </>
            )}

            {/* Regular Items by Group */}
            {Object.entries(groupedItems).map(([group, items]: [string, typeof menuItems], groupIndex) => (
              <React.Fragment key={group}>
                {isExpanded && (
                  <div className="text-xs font-semibold text-slate-400 dark:text-slate-600 uppercase tracking-wider px-2 py-2">
                    {groupLabels[group] || group}
                  </div>
                )}
                {items.map((item) => {
                  const Icon = item.icon;
                  const isActive = activeTab === item.id;

                  return (
                    <div key={item.id} className="relative group">
                      <button
                        onClick={() => handleItemClick(item.id)}
                        className={`
                        ${isExpanded ? 'w-full justify-start px-3 gap-3' : 'w-10 justify-center'}
                        h-10 flex items-center rounded-xl transition-all duration-200 relative
                        ${isActive
                            ? 'bg-brand-blue/10 dark:bg-brand-blue/20 text-brand-blue shadow-sm shadow-brand-blue/20'
                            : 'text-gray-400 dark:text-slate-500 hover:bg-gray-50 dark:hover:bg-slate-800 hover:text-gray-600 dark:hover:text-slate-300 hover:scale-105'
                          }
                      `}
                        aria-label={item.label}
                      >
                        <div className="relative flex-shrink-0">
                          <Icon className="w-5 h-5" />
                          {item.badge > 0 && <SidebarBadge count={item.badge} isExpanded={false} />}
                        </div>
                        {isExpanded && (
                          <>
                            <span className="flex-1 text-sm font-medium text-left truncate">{item.label}</span>
                            {item.badge > 0 && <SidebarBadge count={item.badge} isExpanded={true} />}
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                toggleFavorite(item.id);
                              }}
                              className="flex-shrink-0 p-1 hover:bg-slate-200 dark:hover:bg-slate-700 rounded opacity-0 group-hover:opacity-100 transition-opacity"
                              aria-label="Add to favorites"
                            >
                              <Star className="w-3 h-3 text-slate-400" />
                            </button>
                          </>
                        )}
                        {isActive && !isExpanded && <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-5 bg-brand-blue rounded-r-full -ml-3"></div>}
                      </button>
                      {/* Tooltip - only when collapsed */}
                      {!isExpanded && (
                        <div className="absolute left-full top-1/2 -translate-y-1/2 ml-2 px-2 py-1 bg-slate-800 dark:bg-slate-700 text-white text-xs rounded opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity whitespace-nowrap z-50">
                          {item.label}
                        </div>
                      )}
                    </div>
                  );
                })}
                {groupIndex < Object.keys(groupedItems).length - 1 && (
                  isExpanded ? (
                    <div className="border-t border-slate-200 dark:border-slate-700 my-2" />
                  ) : (
                    <div className="w-8 h-px bg-gray-200 dark:bg-slate-700 my-1" />
                  )
                )}
              </React.Fragment>
            ))}

            {/* No Results Message */}
            {filteredMenuItems.length === 0 && searchQuery && (
              <div className={`${isExpanded ? 'px-3' : 'px-2'} py-8 text-center`}>
                <p className="text-sm text-slate-400 dark:text-slate-600">
                  {isExpanded ? 'No results found' : '?'}
                </p>
              </div>
            )}
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

        {/* User Profile Section */}
        <div className="border-t border-gray-200 dark:border-slate-800">
          <SidebarUserProfile isExpanded={isExpanded} />
        </div>

        {/* Bottom Fixed Actions */}
        <div className={`space-y-2 py-3 border-t border-gray-200 dark:border-slate-800 w-full flex flex-col ${isExpanded ? 'items-stretch px-3' : 'items-center'}`}>
          {canSeeSettings && (
            <div className="relative group">
              <button
                onClick={() => handleItemClick('settings')}
                className={`
                ${isExpanded ? 'w-full justify-start px-3 gap-3' : 'w-10 justify-center'}
                h-10 flex items-center rounded-xl transition-all duration-200
                ${activeTab === 'settings'
                    ? 'bg-brand-blue/10 dark:bg-brand-blue/20 text-brand-blue shadow-sm'
                    : 'text-gray-400 dark:text-slate-500 hover:text-gray-600 dark:hover:text-slate-300 hover:bg-gray-50 dark:hover:bg-slate-800'
                  }
              `}
                aria-label="Settings"
              >
                <Settings className="w-5 h-5 flex-shrink-0" />
                {isExpanded && <span className="text-sm font-medium">Settings</span>}
              </button>
              {!isExpanded && (
                <div className="absolute left-full top-1/2 -translate-y-1/2 ml-2 px-2 py-1 bg-slate-800 dark:bg-slate-700 text-white text-xs rounded opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity whitespace-nowrap z-50">
                  Settings
                </div>
              )}
            </div>
          )}
          <div className="relative group">
            <button
              onClick={() => setShowKeyboardHelp(true)}
              className={`
              ${isExpanded ? 'w-full justify-start px-3 gap-3' : 'w-10 justify-center'}
              h-10 flex items-center rounded-xl transition-all duration-200
              text-gray-400 dark:text-slate-500 hover:text-gray-600 dark:hover:text-slate-300 hover:bg-gray-50 dark:hover:bg-slate-800
            `}
              aria-label="Help"
            >
              <HelpCircle className="w-5 h-5 flex-shrink-0" />
              {isExpanded && <span className="text-sm font-medium">Help</span>}
            </button>
            {!isExpanded && (
              <div className="absolute left-full top-1/2 -translate-y-1/2 ml-2 px-2 py-1 bg-slate-800 dark:bg-slate-700 text-white text-xs rounded opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity whitespace-nowrap z-50">
                Help
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Keyboard Shortcuts Help Modal */}
      {showKeyboardHelp && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" onClick={() => setShowKeyboardHelp(false)}>
          <div className="bg-white dark:bg-slate-800 rounded-lg shadow-xl p-6 max-w-md w-full mx-4" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100">Keyboard Shortcuts</h3>
              <button
                onClick={() => setShowKeyboardHelp(false)}
                className="p-1 hover:bg-slate-100 dark:hover:bg-slate-700 rounded"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="space-y-3">
              <div className="flex items-center justify-between py-2 border-b border-slate-200 dark:border-slate-700">
                <span className="text-sm text-slate-600 dark:text-slate-400">Toggle sidebar</span>
                <kbd className="px-2 py-1 bg-slate-100 dark:bg-slate-700 rounded text-xs font-mono">⌘ B</kbd>
              </div>
              <div className="flex items-center justify-between py-2 border-b border-slate-200 dark:border-slate-700">
                <span className="text-sm text-slate-600 dark:text-slate-400">Search navigation</span>
                <kbd className="px-2 py-1 bg-slate-100 dark:bg-slate-700 rounded text-xs font-mono">⌘ K</kbd>
              </div>
              <div className="flex items-center justify-between py-2 border-b border-slate-200 dark:border-slate-700">
                <span className="text-sm text-slate-600 dark:text-slate-400">Show shortcuts</span>
                <kbd className="px-2 py-1 bg-slate-100 dark:bg-slate-700 rounded text-xs font-mono">?</kbd>
              </div>
            </div>
            <button
              onClick={() => setShowKeyboardHelp(false)}
              className="mt-6 w-full py-2 bg-brand-blue text-white rounded-lg hover:bg-brand-blue/90 transition-colors"
            >
              Got it
            </button>
          </div>
        </div>
      )}
    </>
  );
};

export default Sidebar;
