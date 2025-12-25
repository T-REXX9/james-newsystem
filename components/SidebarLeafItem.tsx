import React, { memo } from 'react';
import { Star } from 'lucide-react';
import SidebarBadge from './SidebarBadge';

interface SidebarLeafItemProps {
	id: string;
	label: string;
		tooltipLabel?: string;
	icon: React.ElementType;
	isActive: boolean;
	isSidebarExpanded: boolean;
	isFavorite?: boolean;
	badge?: number;
	depth?: number;
	onClick: (id: string) => void;
	onFavoriteToggle: (id: string) => void;
}

const SidebarLeafItem: React.FC<SidebarLeafItemProps> = memo(({
	id,
	label,
	tooltipLabel,
	icon: Icon,
	isActive,
	isSidebarExpanded,
	isFavorite,
	badge = 0,
	depth = 0,
	onClick,
	onFavoriteToggle,
}) => {
	const indentClass = depth <= 0
		? ''
		: depth === 1
			? 'ml-4'
			: depth === 2
				? 'ml-8'
				: 'ml-12';

	return (
		<div className={`relative group ${indentClass}`}>
			<button
				onClick={() => onClick(id)}
				className={`
					${isSidebarExpanded ? 'w-full justify-start px-3 gap-3' : 'w-10 justify-center'}
					h-10 flex items-center rounded-xl transition-all duration-200 relative
					${isActive
						? 'bg-brand-blue/10 dark:bg-brand-blue/20 text-brand-blue shadow-sm shadow-brand-blue/20'
						: 'text-gray-400 dark:text-slate-500 hover:bg-gray-50 dark:hover:bg-slate-800 hover:text-gray-600 dark:hover:text-slate-300 hover:scale-105'
					}
				`}
				aria-label={label}
			>
				<div className="relative flex-shrink-0">
					<Icon className="w-4 h-4" />
					{badge > 0 && <SidebarBadge count={badge} isExpanded={false} />}
				</div>
				{isSidebarExpanded && (
					<>
						<span className="flex-1 text-sm font-medium text-left truncate">{label}</span>
						{badge > 0 && <SidebarBadge count={badge} isExpanded={true} />}
						<button
							onClick={(e) => {
								e.stopPropagation();
								onFavoriteToggle(id);
							}}
							className={`
								flex-shrink-0 p-1 hover:bg-slate-200 dark:hover:bg-slate-700 rounded transition-opacity
								${isFavorite ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'}
							`}
							aria-label={isFavorite ? 'Remove from favorites' : 'Add to favorites'}
						>
							<Star className={`w-3 h-3 ${isFavorite ? 'fill-yellow-400 text-yellow-400' : 'text-slate-400'}`} />
						</button>
					</>
				)}
				{isActive && !isSidebarExpanded && (
					<div className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-5 bg-brand-blue rounded-r-full -ml-3" />
				)}
			</button>
				{!isSidebarExpanded && (
				<div className="absolute left-full top-1/2 -translate-y-1/2 ml-2 px-2 py-1 bg-slate-800 dark:bg-slate-700 text-white text-xs rounded opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity whitespace-nowrap z-50">
						{tooltipLabel || label}
				</div>
			)}
		</div>
	);
});

SidebarLeafItem.displayName = 'SidebarLeafItem';

export default SidebarLeafItem;
