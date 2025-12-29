import React, { useEffect, useState, useRef, useMemo } from 'react';
import { Settings, HelpCircle, Menu, X } from 'lucide-react';
import { useVirtualizer } from '@tanstack/react-virtual';
import { UserProfile, MenuCategory, MenuSubCategory, MenuItemLeaf } from '../types';
import { useSidebarState } from '../hooks/useSidebarState';
import { useKeyboardShortcuts } from '../hooks/useKeyboardShortcuts';
import { useGroupExpansion } from '../hooks/useGroupExpansion';
import { sidebarAnalytics } from '../utils/sidebarAnalytics';
import SidebarSearch from './SidebarSearch';
import SidebarUserProfile from './SidebarUserProfile';
import SidebarMenuItem, { MenuItem } from './SidebarMenuItem';
import SidebarNestedMenu from './SidebarNestedMenu';
import SidebarSubmenu from './SidebarSubmenu';
import SidebarLeafItem from './SidebarLeafItem';
import { HIERARCHICAL_MENU_CONFIG, SIDEBAR_CONFIG } from '../utils/sidebarConfig';
import { MODULE_ID_ALIASES } from '../constants';



// Build reverse lookup from canonical IDs to legacy aliases
const CANONICAL_TO_ALIASES: Record<string, string[]> = Object.entries(MODULE_ID_ALIASES).reduce(
  (acc, [alias, canonical]) => {
    if (!acc[canonical]) acc[canonical] = [];
    acc[canonical].push(alias);
    return acc;
  },
  {} as Record<string, string[]>
);

// Types for flattened list
type CategoryRow = {
	type: 'category';
	id: string;
	category: MenuCategory;
};

type SubmenuRow = {
	type: 'submenu';
	id: string;
	categoryId: string;
	submenu: MenuSubCategory;
};

type LeafRow = {
	type: 'leaf';
	id: string;
	leaf: MenuItemLeaf;
	categoryId: string;
	submenuId?: string;
	isFavorite: boolean;
	depth: number;
	pathLabel: string;
};

type VirtualItemData =
	| { type: 'favorite_header'; id: 'fav_header' }
	| { type: 'divider'; id: string }
	| CategoryRow
	| SubmenuRow
	| LeafRow;

interface SidebarProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
  user?: UserProfile | null;
}

const Sidebar: React.FC<SidebarProps> = ({ activeTab, setActiveTab, user }) => {
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const [showKeyboardHelp, setShowKeyboardHelp] = useState(false);

  // Sidebar State
  const {
    isExpanded,
    favorites,
    searchQuery,
    debouncedSearchQuery,
    toggleExpanded,
    toggleFavorite,
    updateSearchQuery,
  } = useSidebarState();

  // Group Expansion State
	  const {
	    toggleGroup,
	    isExpanded: isNodeExpanded,
	  } = useGroupExpansion(HIERARCHICAL_MENU_CONFIG.map(category => category.id));

  // Filter allowed items (supports legacy and canonical IDs)
  const allowedMenuItems = useMemo(() => {
    if (!user) return [];

    const rights = user.access_rights || [];

    return SIDEBAR_CONFIG.filter(item => {
      if (item.id === 'maintenance-profile-server-maintenance') {
        return user.role === 'Owner' || user.role === 'Developer';
      }
      if (user.role === 'Owner') return true;
      if (rights.length === 0) return false;
      if (rights.includes('*')) return true;

      if (rights.includes(item.id)) return true;
      const aliases = CANONICAL_TO_ALIASES[item.id] || [];
      return aliases.some(aliasId => rights.includes(aliasId));
    });
  }, [user]);

  const canSeeSettings =
    user?.role === 'Owner' ||
    !!user?.access_rights?.some(right =>
      right === 'maintenance-profile-system-access' || right === 'settings'
    );

  // Flattened Data for Virtualizer
	  const flattenedData = useMemo(() => {
	    const data: VirtualItemData[] = [];
	    const query = debouncedSearchQuery.toLowerCase().trim();
	    const isSearching = !!query;

	    if (!user) return data;

	    const allowedItemsMap = new Map<string, MenuItem>();
	    allowedMenuItems.forEach(item => {
	      allowedItemsMap.set(item.id, item);
	    });
	    const allowedLeafRoutes = new Set(allowedItemsMap.keys());

	    type LeafEntry = {
	      leaf: MenuItemLeaf;
	      category: MenuCategory;
	      submenu: MenuSubCategory;
	      depth: number;
	      pathLabel: string;
	    };

	    const leafEntries: LeafEntry[] = [];

	    HIERARCHICAL_MENU_CONFIG.forEach(category => {
	      if (!category.children) return;
	      category.children.forEach(child => {
	        if (!('children' in child) || !Array.isArray(child.children)) return;
	        const submenu = child as MenuSubCategory;
	        submenu.children.forEach(leaf => {
	          if (!allowedLeafRoutes.has(leaf.route)) return;
	          const depth = 2; // category -> submenu -> leaf
	          const pathLabel = `${category.label} • ${submenu.label} • ${leaf.label}`;
	          leafEntries.push({ leaf, category, submenu, depth, pathLabel });
	        });
	      });
	    });

	    const matchesSearch = (entry: LeafEntry) => {
	      if (!isSearching) return true;
	      const haystack = `${entry.leaf.label} ${entry.leaf.route} ${entry.category.label} ${entry.submenu.label}`.toLowerCase();
	      return haystack.includes(query);
	    };

	    const favoriteSet = new Set(favorites);
	    const favoriteLeaves = leafEntries.filter(entry => favoriteSet.has(entry.leaf.route));
	    const regularLeaves = leafEntries.filter(entry => !favoriteSet.has(entry.leaf.route));

	    // Favorites section
	    const visibleFavoriteLeaves = isSearching
	      ? favoriteLeaves.filter(matchesSearch)
	      : favoriteLeaves;

	    if (visibleFavoriteLeaves.length > 0) {
	      if (isExpanded) {
	        data.push({ type: 'favorite_header', id: 'fav_header' });
	      }
	      visibleFavoriteLeaves.forEach(entry => {
	        data.push({
	          type: 'leaf',
	          id: `fav_${entry.leaf.route}`,
	          leaf: entry.leaf,
	          categoryId: entry.category.id,
	          submenuId: entry.submenu.id,
	          isFavorite: true,
	          depth: entry.depth,
	          pathLabel: entry.pathLabel,
	        });
	      });
	      data.push({ type: 'divider', id: isExpanded ? 'fav_divider' : 'fav_divider_collapsed' });
	    }

	    // Main hierarchical tree
	    HIERARCHICAL_MENU_CONFIG.forEach(category => {
	      // Special case: categories with direct routes and no children (e.g. Home)
	      if (!category.children || category.children.length === 0) {
	        if (!category.route) return;
	        const isAllowed = allowedLeafRoutes.has(category.route);
	        if (!isAllowed) return;

	        const matchesCategorySearch =
	          !isSearching ||
	          category.label.toLowerCase().includes(query) ||
	          category.route.toLowerCase().includes(query);

	        if (!matchesCategorySearch) return;

	        data.push({
	          type: 'category',
	          id: category.id,
	          category,
	        });
	        return;
	      }

	      const categoryLeaves = regularLeaves.filter(entry => entry.category.id === category.id);
	      if (categoryLeaves.length === 0) {
	        return;
	      }

	      const visibleCategoryLeaves = isSearching
	        ? categoryLeaves.filter(matchesSearch)
	        : categoryLeaves;

	      if (visibleCategoryLeaves.length === 0) {
	        return;
	      }

	      data.push({
	        type: 'category',
	        id: category.id,
	        category,
	      });

	      const shouldShowSubmenus = isSearching || !isExpanded || isNodeExpanded(category.id);
	      if (!shouldShowSubmenus) return;

	      category.children?.forEach(child => {
	        if (!('children' in child) || !Array.isArray(child.children)) return;
	        const submenu = child as MenuSubCategory;
	        if (!submenu.children || submenu.children.length === 0) return;

	        const submenuLeaves = categoryLeaves.filter(entry => entry.submenu.id === submenu.id);
	        if (submenuLeaves.length === 0) return;

	        const visibleSubmenuLeaves = isSearching
	          ? submenuLeaves.filter(matchesSearch)
	          : submenuLeaves;

	        if (visibleSubmenuLeaves.length === 0) return;

	        data.push({
	          type: 'submenu',
	          id: submenu.id,
	          categoryId: category.id,
	          submenu,
	        });

	        const shouldShowLeaves = isSearching || !isExpanded || isNodeExpanded(submenu.id);

	        if (shouldShowLeaves) {
	          visibleSubmenuLeaves.forEach(entry => {
	            data.push({
	              type: 'leaf',
	              id: entry.leaf.route,
	              leaf: entry.leaf,
	              categoryId: entry.category.id,
	              submenuId: entry.submenu.id,
	              isFavorite: false,
	              depth: entry.depth,
	              pathLabel: entry.pathLabel,
	            });
	          });
	        }
	      });
	    });

	    return data;
	  }, [debouncedSearchQuery, allowedMenuItems, favorites, isExpanded, isNodeExpanded, user]);

  // Virtualizer
  const rowVirtualizer = useVirtualizer({
    count: flattenedData.length,
    getScrollElement: () => scrollContainerRef.current,
    estimateSize: (index) => {
      const item = flattenedData[index];
      switch (item.type) {
        case 'favorite_header': return 32; // text-xs font-semibold py-2
	        case 'divider': return isExpanded ? 9 : 5; // border-t my-2 vs w-8 my-1
	        case 'category':
	        case 'submenu':
	        case 'leaf':
	          return 40; // h-10
        default: return 40;
      }
    },
    overscan: 5,
  });

  // Track module clicks
  const handleItemClick = (itemId: string) => {
    sidebarAnalytics.trackModuleClick(itemId);
    setActiveTab(itemId);
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
        if (!isExpanded) toggleExpanded();
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

        {/* Search */}
        {isExpanded && (
          <SidebarSearch
            value={searchQuery}
            onChange={updateSearchQuery}
            autoFocus={false}
          />
        )}

        {/* Virtualized List */}
        <div
          ref={scrollContainerRef}
          className="flex-1 w-full overflow-y-auto overflow-x-hidden scrollbar-thin scrollbar-thumb-gray-300 dark:scrollbar-thumb-slate-700 scrollbar-track-transparent hover:scrollbar-thumb-gray-400 dark:hover:scrollbar-thumb-slate-600"
          style={{ scrollbarWidth: 'thin' }}
        >
          <div
            style={{
              height: `${rowVirtualizer.getTotalSize()}px`,
              width: '100%',
              position: 'relative',
            }}
          >
            {rowVirtualizer.getVirtualItems().map((virtualRow) => {
              const item = flattenedData[virtualRow.index];
              return (
                <div
                  key={virtualRow.key}
                  style={{
                    position: 'absolute',
                    top: 0,
                    left: 0,
                    width: '100%',
                    height: `${virtualRow.size}px`,
                    transform: `translateY(${virtualRow.start}px)`,
                  }}
	                  className={`${isExpanded ? 'px-3' : 'px-0 flex justify-center'}`}
                >
                  {item.type === 'favorite_header' && isExpanded && (
                    <div className="text-xs font-semibold text-slate-400 dark:text-slate-600 uppercase tracking-wider px-2 py-2">
                      Favorites
                    </div>
                  )}
	
	                  {item.type === 'category' && (
	                    <SidebarNestedMenu
	                      id={item.category.id}
	                      label={item.category.label}
	                      icon={item.category.icon}
	                      level={1}
	                      isExpanded={isNodeExpanded(item.category.id)}
	                      isActive={!!item.category.route && activeTab === item.category.route}
	                      isSidebarExpanded={isExpanded}
	                      onToggle={toggleGroup}
	                      onClick={() => {
	                        if (item.category.route) {
	                          handleItemClick(item.category.route);
	                        }
	                      }}
	                    />
	                  )}
	
	                  {item.type === 'submenu' && (
	                    <SidebarSubmenu
	                      id={item.submenu.id}
	                      label={item.submenu.label}
	                      icon={item.submenu.icon || item.category.icon}
	                      isExpanded={isNodeExpanded(item.submenu.id)}
	                      isActive={false}
	                      isSidebarExpanded={isExpanded}
	                      onToggle={toggleGroup}
	                    />
	                  )}
	
	                  {item.type === 'leaf' && (
	                    <SidebarLeafItem
	                      id={item.leaf.route}
	                      label={item.leaf.label}
	                      tooltipLabel={item.pathLabel}
	                      icon={item.leaf.icon}
	                      isActive={activeTab === item.leaf.route}
	                      isSidebarExpanded={isExpanded}
	                      isFavorite={item.isFavorite}
	                      badge={0}
	                      depth={item.depth}
	                      onClick={handleItemClick}
	                      onFavoriteToggle={toggleFavorite}
	                    />
	                  )}
	
                  {item.type === 'divider' && (
                    isExpanded ? (
                      <div className="border-t border-slate-200 dark:border-slate-700 my-2" />
                    ) : (
                      <div className="w-8 h-px bg-gray-200 dark:bg-slate-700 my-1 mx-auto" />
                    )
                  )}
                </div>
              );
            })}
          </div>

          {/* No Results Message */}
          {flattenedData.length === 0 && searchQuery && (
            <div className={`${isExpanded ? 'px-3' : 'px-2'} py-8 text-center`}>
              <p className="text-sm text-slate-400 dark:text-slate-600">
                {isExpanded ? 'No results found' : '?'}
              </p>
            </div>
          )}
        </div>

        {/* User Profile */}
        <div className="border-t border-gray-200 dark:border-slate-800">
          <SidebarUserProfile isExpanded={isExpanded} />
        </div>

        {/* Bottom Actions */}
        <div className={`space-y-2 py-3 border-t border-gray-200 dark:border-slate-800 w-full flex flex-col ${isExpanded ? 'items-stretch px-3' : 'items-center'}`}>
          {canSeeSettings && (
            <SidebarMenuItem
              item={{ id: 'settings', icon: Settings, label: 'Settings', group: 'bottom', badge: 0 }}
              isActive={activeTab === 'settings'}
              isExpanded={isExpanded}
              onClick={handleItemClick}
              onFavoriteToggle={() => { }} // No favorite for settings
              isFavorite={false}
            />
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
      </div>
    </>
  );
};

export default Sidebar;
