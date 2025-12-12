

import React from 'react';
import { LayoutDashboard, Mail, Calendar, Phone, CheckSquare, Users, Settings, HelpCircle, Columns, UserCog, Package, ClipboardList, BarChart3 } from 'lucide-react';
import { UserProfile } from '../types';

interface SidebarProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
  user?: UserProfile | null;
}

const Sidebar: React.FC<SidebarProps> = ({ activeTab, setActiveTab, user }) => {
  const menuItems = [
    { id: 'dashboard', icon: LayoutDashboard, label: 'Dashboard' },
    { id: 'pipelines', icon: Columns, label: 'Pipelines' },
    { id: 'customers', icon: Users, label: 'Customer Database' },
    { id: 'products', icon: Package, label: 'Product Database' },
    { id: 'reorder', icon: ClipboardList, label: 'Reorder Report' },
    { id: 'staff', icon: UserCog, label: 'Staff & Agents' },
    { id: 'management', icon: BarChart3, label: 'Management' },
    { id: 'mail', icon: Mail, label: 'Inbox' },
    { id: 'calendar', icon: Calendar, label: 'Calendar' },
    { id: 'calls', icon: Phone, label: 'Daily Call Monitoring' },
    { id: 'tasks', icon: CheckSquare, label: 'Tasks' },
  ];

  // Logic to determine if an item is allowed
  const isItemAllowed = (itemId: string) => {
      // If no user, or no access rights (and not legacy), hide.
      // Owner always sees everything (handled by '*' or explicit list in seed).
      // We check if access_rights includes the ID or '*'
      if (!user) return false;
      if (user.role === 'Owner') return true;
      if (!user.access_rights) return true; // Fallback: if undefined, show all (or hide all depending on security model)
      
      return user.access_rights.includes('*') || user.access_rights.includes(itemId);
  };
  
  // Settings is special - usually visible to everyone but internal pages might be restricted.
  // Or we can restrict the Settings button itself.
  // For this implementation, we will restrict the Settings button to Owner only.
  const canSeeSettings = user?.role === 'Owner' || (user?.access_rights && user.access_rights.includes('settings'));

  const allowedMenuItems = menuItems.filter(item => isItemAllowed(item.id));

  return (
    <div className="w-16 h-full bg-white dark:bg-slate-900 border-r border-gray-200 dark:border-slate-800 flex flex-col items-center py-4 fixed left-0 top-14 z-40 shadow-[2px_0_5px_-2px_rgba(0,0,0,0.05)] print:hidden">
      <div className="space-y-4 flex-1 w-full flex flex-col items-center mt-2">
        {allowedMenuItems.map((item) => {
          const Icon = item.icon;
          const isActive = activeTab === item.id;
          return (
            <div key={item.id} className="relative group">
                <button
                  onClick={() => setActiveTab(item.id)}
                  className={`w-10 h-10 flex items-center justify-center rounded-xl transition-all duration-200 relative ${
                    isActive
                      ? 'bg-brand-blue/10 dark:bg-brand-blue/20 text-brand-blue shadow-sm'
                      : 'text-gray-400 dark:text-slate-500 hover:bg-gray-50 dark:hover:bg-slate-800 hover:text-gray-600 dark:hover:text-slate-300'
                  }`}
                >
                  <Icon className="w-5 h-5" />
                  {isActive && <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-5 bg-brand-blue rounded-r-full -ml-3"></div>}
                </button>
                {/* Tooltip */}
                <div className="absolute left-full top-1/2 -translate-y-1/2 ml-2 px-2 py-1 bg-slate-800 dark:bg-slate-700 text-white text-xs rounded opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity whitespace-nowrap z-50">
                    {item.label}
                </div>
            </div>
          );
        })}
      </div>

      <div className="space-y-4 mb-4">
         {canSeeSettings && (
             <button 
                onClick={() => setActiveTab('settings')}
                className={`w-10 h-10 flex items-center justify-center rounded-lg transition-colors ${activeTab === 'settings' ? 'bg-brand-blue/10 dark:bg-brand-blue/20 text-brand-blue' : 'text-gray-400 dark:text-slate-500 hover:text-gray-600 dark:hover:text-slate-300 hover:bg-gray-50 dark:hover:bg-slate-800'}`}
             >
                 <Settings className="w-5 h-5" />
             </button>
         )}
         <button className="w-10 h-10 flex items-center justify-center text-gray-400 dark:text-slate-500 hover:text-gray-600 dark:hover:text-slate-300 rounded-lg hover:bg-gray-50 dark:hover:bg-slate-800 transition-colors">
             <HelpCircle className="w-5 h-5" />
         </button>
      </div>
    </div>
  );
};

export default Sidebar;
