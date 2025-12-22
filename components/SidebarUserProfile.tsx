import React, { useState, useRef, useEffect } from 'react';
import { ChevronDown, User, LogOut, Settings as SettingsIcon } from 'lucide-react';
import { supabase } from '../lib/supabaseClient';

interface SidebarUserProfileProps {
  isExpanded: boolean;
}

const SidebarUserProfile: React.FC<SidebarUserProfileProps> = ({ isExpanded }) => {
  const [user, setUser] = useState<any>(null);
  const [showDropdown, setShowDropdown] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const getUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      setUser(user);
    };
    getUser();
  }, []);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setShowDropdown(false);
      }
    };

    if (showDropdown) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [showDropdown]);

  if (!user) return null;

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map(n => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  const displayName = user.fullName || user.email?.split('@')[0] || 'User';
  const initials = getInitials(displayName);

  if (!isExpanded) {
    return (
      <div className="relative px-2 py-2" title={displayName}>
        <div className="
          w-10 h-10 rounded-full
          bg-gradient-to-br from-brand-blue to-blue-600
          flex items-center justify-center
          text-white font-semibold text-sm
          cursor-pointer
          hover:ring-2 hover:ring-brand-blue hover:ring-offset-2 hover:ring-offset-slate-900
          transition-all duration-200
        ">
          {initials}
        </div>
        <div className="absolute bottom-2 right-2 w-3 h-3 bg-green-500 rounded-full border-2 border-slate-900" />
      </div>
    );
  }

  return (
    <div className="relative px-3 py-2" ref={dropdownRef}>
      <button
        onClick={() => setShowDropdown(!showDropdown)}
        className="
          w-full p-3 rounded-lg
          bg-slate-50 dark:bg-slate-800
          border border-slate-200 dark:border-slate-700
          hover:bg-slate-100 dark:hover:bg-slate-750
          transition-all duration-200
          flex items-center gap-3
        "
      >
        <div className="relative flex-shrink-0">
          <div className="
            w-10 h-10 rounded-full
            bg-gradient-to-br from-brand-blue to-blue-600
            flex items-center justify-center
            text-white font-semibold text-sm
          ">
            {initials}
          </div>
          <div className="absolute bottom-0 right-0 w-3 h-3 bg-green-500 rounded-full border-2 border-slate-50 dark:border-slate-800" />
        </div>
        <div className="flex-1 text-left min-w-0">
          <div className="text-sm font-semibold text-slate-900 dark:text-slate-100 truncate">
            {displayName}
          </div>
          <div className="text-xs text-slate-500 dark:text-slate-400 truncate">
            {user.role || 'User'}
          </div>
        </div>
        <ChevronDown className={`w-4 h-4 text-slate-400 transition-transform duration-200 ${showDropdown ? 'rotate-180' : ''}`} />
      </button>

      {showDropdown && (
        <div className="
          absolute bottom-full left-3 right-3 mb-2
          bg-white dark:bg-slate-800
          border border-slate-200 dark:border-slate-700
          rounded-lg shadow-lg
          py-1
          z-50
        ">
          <button
            onClick={() => {
              setShowDropdown(false);
              // Navigate to profile
            }}
            className="
              w-full px-4 py-2 text-left text-sm
              text-slate-700 dark:text-slate-300
              hover:bg-slate-100 dark:hover:bg-slate-700
              flex items-center gap-2
              transition-colors duration-150
            "
          >
            <User className="w-4 h-4" />
            View Profile
          </button>
          <button
            onClick={() => {
              setShowDropdown(false);
              // Navigate to settings
            }}
            className="
              w-full px-4 py-2 text-left text-sm
              text-slate-700 dark:text-slate-300
              hover:bg-slate-100 dark:hover:bg-slate-700
              flex items-center gap-2
              transition-colors duration-150
            "
          >
            <SettingsIcon className="w-4 h-4" />
            Settings
          </button>
          <div className="border-t border-slate-200 dark:border-slate-700 my-1" />
          <button
            onClick={async () => {
              setShowDropdown(false);
              await supabase.auth.signOut();
            }}
            className="
              w-full px-4 py-2 text-left text-sm
              text-red-600 dark:text-red-400
              hover:bg-red-50 dark:hover:bg-red-900/20
              flex items-center gap-2
              transition-colors duration-150
            "
          >
            <LogOut className="w-4 h-4" />
            Sign Out
          </button>
        </div>
      )}
    </div>
  );
};

export default SidebarUserProfile;

