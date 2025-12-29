import React, { memo } from 'react';
import { Star } from 'lucide-react';
import SidebarBadge from './SidebarBadge';

// Helper type for the item prop
export interface MenuItem {
    id: string;
    icon: React.ElementType;
    label: string;
    group: string;
    badge: number;
}

interface SidebarMenuItemProps {
    item: MenuItem;
    isActive: boolean;
    isExpanded: boolean;
    onClick: (id: string) => void;
    onFavoriteToggle: (id: string) => void;
    isFavorite?: boolean; // Optional because not all items might show favorite status in all contexts
}

const SidebarMenuItem: React.FC<SidebarMenuItemProps> = memo(({
    item,
    isActive,
    isExpanded,
    onClick,
    onFavoriteToggle,
    isFavorite
}) => {
    const Icon = item.icon;

    return (
        <div className="relative group">
            <button
                onClick={() => onClick(item.id)}
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
                                onFavoriteToggle(item.id);
                            }}
                            className={`
                flex-shrink-0 p-1 hover:bg-slate-200 dark:hover:bg-slate-700 rounded transition-opacity
                ${isFavorite ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'}
              `}
                            aria-label={isFavorite ? "Remove from favorites" : "Add to favorites"}
                        >
                            <Star className={`w-3 h-3 ${isFavorite ? 'fill-yellow-400 text-yellow-400' : 'text-slate-400'}`} />
                        </button>
                    </>
                )}

                {isActive && !isExpanded && (
                    <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-5 bg-brand-blue rounded-r-full -ml-3"></div>
                )}
            </button>

            {/* Tooltip - only when collapsed */}
            {!isExpanded && (
                <div className="absolute left-full top-1/2 -translate-y-1/2 ml-2 px-2 py-1 bg-slate-800 dark:bg-slate-700 text-white text-xs rounded opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity whitespace-nowrap z-50">
                    {item.label}
                </div>
            )}
        </div>
    );
});

SidebarMenuItem.displayName = 'SidebarMenuItem';

export default SidebarMenuItem;
