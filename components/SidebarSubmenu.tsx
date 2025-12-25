import React, { memo } from 'react';
import { ChevronRight, ChevronDown } from 'lucide-react';

interface SidebarSubmenuProps {
	id: string;
	label: string;
	icon: React.ElementType;
	isExpanded: boolean;
	isActive: boolean;
	isSidebarExpanded: boolean;
	onToggle: (id: string) => void;
	onClick?: (id: string) => void;
}

const SidebarSubmenu: React.FC<SidebarSubmenuProps> = memo(({
	id,
	label,
	icon: Icon,
	isExpanded,
	isActive,
	isSidebarExpanded,
	onToggle,
	onClick,
}) => {
	const ChevronIcon = isExpanded ? ChevronDown : ChevronRight;

	const handleClick = () => {
		onToggle(id);
		if (onClick) {
			onClick(id);
		}
	};

	return (
		<div className="relative group ml-4">
			<button
				onClick={handleClick}
				className={`
					${isSidebarExpanded ? 'w-full justify-between px-3' : 'w-10 justify-center'}
					h-10 flex items-center rounded-xl transition-all duration-200
					${isActive
						? 'bg-brand-blue/10 dark:bg-brand-blue/20 text-brand-blue shadow-sm shadow-brand-blue/20'
						: 'text-gray-400 dark:text-slate-500 hover:bg-gray-50 dark:hover:bg-slate-800 hover:text-gray-600 dark:hover:text-slate-300 hover:scale-105'
					}
				`}
				aria-label={label}
			>
				<div className="flex items-center gap-2">
					<Icon className="w-4 h-4 flex-shrink-0" />
					{isSidebarExpanded && (
						<span className="text-sm truncate">{label}</span>
					)}
				</div>
				{isSidebarExpanded && (
					<ChevronIcon className="w-3 h-3 text-slate-400" />
				)}
			</button>
			{!isSidebarExpanded && (
				<div className="absolute left-full top-1/2 -translate-y-1/2 ml-2 px-2 py-1 bg-slate-800 dark:bg-slate-700 text-white text-xs rounded opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity whitespace-nowrap z-50">
					{label}
				</div>
			)}
		</div>
	);
});

SidebarSubmenu.displayName = 'SidebarSubmenu';

export default SidebarSubmenu;
