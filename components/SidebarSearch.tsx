import React, { useRef, useEffect } from 'react';
import { Search, X } from 'lucide-react';

interface SidebarSearchProps {
  value: string;
  onChange: (value: string) => void;
  onFocus?: () => void;
  placeholder?: string;
  autoFocus?: boolean;
}

const SidebarSearch: React.FC<SidebarSearchProps> = ({
  value,
  onChange,
  onFocus,
  placeholder = 'Search navigation...',
  autoFocus = false,
}) => {
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (autoFocus && inputRef.current) {
      inputRef.current.focus();
    }
  }, [autoFocus]);

  const handleClear = () => {
    onChange('');
    inputRef.current?.focus();
  };

  return (
    <div className="relative px-3 py-2">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
        <input
          ref={inputRef}
          type="text"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onFocus={onFocus}
          placeholder={placeholder}
          className="
            w-full pl-9 pr-8 py-2 text-sm
            bg-slate-100 dark:bg-slate-800
            border border-slate-200 dark:border-slate-700
            rounded-lg
            text-slate-900 dark:text-slate-100
            placeholder-slate-400 dark:placeholder-slate-500
            focus:outline-none focus:ring-2 focus:ring-brand-blue focus:border-transparent
            transition-all duration-200
          "
          aria-label="Search navigation"
        />
        {value && (
          <button
            onClick={handleClear}
            className="
              absolute right-2 top-1/2 -translate-y-1/2
              p-1 rounded-md
              text-slate-400 hover:text-slate-600 dark:hover:text-slate-300
              hover:bg-slate-200 dark:hover:bg-slate-700
              transition-colors duration-150
            "
            aria-label="Clear search"
          >
            <X className="w-3 h-3" />
          </button>
        )}
      </div>
    </div>
  );
};

export default SidebarSearch;

