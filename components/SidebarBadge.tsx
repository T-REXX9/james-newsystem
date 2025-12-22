import React from 'react';

interface SidebarBadgeProps {
  count: number;
  isExpanded: boolean;
  className?: string;
}

const SidebarBadge: React.FC<SidebarBadgeProps> = ({ count, isExpanded, className = '' }) => {
  if (count === 0) return null;

  const displayCount = count > 99 ? '99+' : count.toString();

  return (
    <span
      className={`
        bg-red-600 text-white text-xs font-semibold rounded-full
        min-w-[18px] h-[18px] flex items-center justify-center
        ${isExpanded ? 'px-1.5' : 'absolute -top-1 -right-1 px-1'}
        ${className}
      `}
      aria-label={`${count} notifications`}
    >
      {displayCount}
    </span>
  );
};

export default SidebarBadge;

