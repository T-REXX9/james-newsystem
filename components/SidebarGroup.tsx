import React, { memo } from 'react';
import { ChevronDown, ChevronRight } from 'lucide-react';

interface SidebarGroupHeaderProps {
    groupId: string;
    label: string;
    isExpanded: boolean;
    isGroupExpanded: boolean;
    onToggleGroup: (groupId: string) => void;
    itemCount: number;
}

const SidebarGroupHeader: React.FC<SidebarGroupHeaderProps> = memo(({
    groupId,
    label,
    isExpanded,
    isGroupExpanded,
    onToggleGroup,
    itemCount
}) => {
    if (!isExpanded) return null;

    return (
        <button
            onClick={() => onToggleGroup(groupId)}
            className="w-full flex items-center justify-between px-2 py-2 text-xs font-semibold text-slate-400 dark:text-slate-600 uppercase tracking-wider hover:text-slate-600 dark:hover:text-slate-400 transition-colors group mt-2"
        >
            <div className="flex items-center gap-2">
                <span>{label}</span>
                {itemCount > 0 && <span className="text-[10px] bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 rounded-full">{itemCount}</span>}
            </div>
            {isGroupExpanded ? (
                <ChevronDown className="w-3 h-3 opacity-0 group-hover:opacity-100 transition-opacity" />
            ) : (
                <ChevronRight className="w-3 h-3 opacity-0 group-hover:opacity-100 transition-opacity" />
            )}
        </button>
    );
});

SidebarGroupHeader.displayName = 'SidebarGroupHeader';

export default SidebarGroupHeader;
