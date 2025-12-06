



import React, { useState, useEffect } from 'react';
import Sidebar from './components/Sidebar';
import TopNav from './components/TopNav';
import PipelineView from './components/PipelineView';
import Dashboard from './components/Dashboard';
import Login from './components/Login';
import StaffView from './components/StaffView';
import CallMonitoringView from './components/CallMonitoringView';
import ProductDatabase from './components/ProductDatabase';
import CustomerDatabase from './components/CustomerDatabase';
import ReorderReport from './components/ReorderReport';
import AccessControlSettings from './components/AccessControlSettings';
import TasksView from './components/TasksView';
import SalesAgentDashboard from './components/SalesAgentDashboard';
import { supabase } from './lib/supabaseClient';
import { UserProfile } from './types';
import { Filter, Loader2, Lock } from 'lucide-react';
import { ToastProvider } from './components/ToastProvider';

const App: React.FC = () => {
  const [session, setSession] = useState<any>(null);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [appLoading, setAppLoading] = useState(true);

  const [activeTab, setActiveTab] = useState('dashboard');
  
  // 1. Auth Logic
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      if (session?.user) fetchUserProfile(session.user.id);
      else setAppLoading(false);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      if (session?.user) fetchUserProfile(session.user.id);
      else {
        setUserProfile(null);
        setAppLoading(false);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const fetchUserProfile = async (userId: string) => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single();
      
      if (data) {
        setUserProfile(data);
      } else {
        // Fallback if profile doesn't exist yet
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
             const newProfile = {
                 id: user.id,
                 email: user.email || '',
                 full_name: user.user_metadata?.full_name,
                 avatar_url: user.user_metadata?.avatar_url,
                 role: 'Sales Agent',
                 // Default limited access for fallback profiles
                 access_rights: ['dashboard', 'pipelines', 'mail', 'calendar', 'tasks'] 
             };
             setUserProfile(newProfile);
        }
      }
    } catch (e) {
      console.error('Error fetching profile', e);
    } finally {
      setAppLoading(false);
    }
  };

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    setSession(null);
    setUserProfile(null);
  };

  // 2. Render Logic
  if (appLoading) {
    return (
        <div className="h-screen w-screen flex items-center justify-center bg-slate-100 dark:bg-slate-950">
            <Loader2 className="w-10 h-10 text-brand-blue animate-spin" />
        </div>
    );
  }

  if (!session) {
      return <Login />;
  }

  const renderComingSoon = (title: string) => (
     <div className="flex flex-col items-center justify-center h-full text-center space-y-4">
        <div className="w-20 h-20 bg-slate-200 dark:bg-slate-800 rounded-full flex items-center justify-center">
           <Filter className="w-10 h-10 text-slate-400 dark:text-slate-600 opacity-50" /> 
        </div>
        <h2 className="text-2xl font-bold text-slate-400 dark:text-slate-500">{title}</h2>
        <p className="text-slate-400 dark:text-slate-500 max-w-md">This module is currently under development.</p>
     </div>
  );

  const renderAccessDenied = () => (
    <div className="flex flex-col items-center justify-center h-full text-center space-y-4 animate-fadeIn">
       <div className="w-20 h-20 bg-rose-50 dark:bg-rose-900/20 rounded-full flex items-center justify-center">
          <Lock className="w-10 h-10 text-rose-400 dark:text-rose-500" /> 
       </div>
       <h2 className="text-2xl font-bold text-slate-800 dark:text-white">Access Denied</h2>
       <p className="text-slate-400 dark:text-slate-500 max-w-md">
           You do not have permission to view the <strong>{activeTab}</strong> module. 
           Please contact the administrator if you need access.
       </p>
       <button 
         onClick={() => setActiveTab('dashboard')}
         className="px-4 py-2 bg-slate-200 dark:bg-slate-800 hover:bg-slate-300 dark:hover:bg-slate-700 rounded-lg text-sm font-bold text-slate-700 dark:text-slate-300 transition-colors"
       >
           Go to Dashboard
       </button>
    </div>
  );

  // Permission Check Logic
  const checkPermission = (moduleId: string) => {
    if (!userProfile) return false;
    if (userProfile.role === 'Owner') return true;

    // Sales Agents should always reach their dashboard even if access_rights is misconfigured.
    if (
      moduleId === 'dashboard' &&
      (userProfile.role === 'Sales Agent' || userProfile.role === 'sales_agent')
    ) {
      return true;
    }
    
    // Default to true if access_rights is missing (backward compatibility), 
    // unless we want strict mode. Assuming strict mode for this feature request.
    const rights = userProfile.access_rights || []; 
    return rights.includes('*') || rights.includes(moduleId);
  };

  const renderContent = () => {
    // Special case for settings
    if (activeTab === 'settings') {
        if (checkPermission('settings')) return <AccessControlSettings />;
        return renderAccessDenied();
    }

    if (!checkPermission(activeTab)) {
        return renderAccessDenied();
    }

    switch (activeTab) {
        // Role-based dashboard routing:
        // - Sales Agent role → SalesAgentDashboard (metrics, tasks, calls, team chat)
        // - Owner role → Dashboard (full widgets, charts, customization)
        // - Fallback → Dashboard (for undefined or custom roles)
        case 'dashboard': {
            const isSalesAgent = userProfile?.role === 'Sales Agent' || userProfile?.role === 'sales_agent';

            if (isSalesAgent) {
                return (
                    <div className="p-4 h-full overflow-y-auto bg-slate-100 dark:bg-slate-950">
                        <SalesAgentDashboard currentUser={userProfile} />
                    </div>
                );
            }

            return (
                <div className="p-4 h-full overflow-y-auto bg-slate-100 dark:bg-slate-950">
                    <Dashboard user={userProfile} />
                </div>
            );
        }
        case 'pipelines': return <PipelineView />;
        case 'staff': return <StaffView />;
        case 'products': return (
            <div className="h-full overflow-y-auto">
                <ProductDatabase />
            </div>
        );
        case 'reorder': return (
            <div className="h-full overflow-y-auto">
                <ReorderReport />
            </div>
        );
        case 'customers': return (
            <div className="h-full overflow-y-auto">
                <CustomerDatabase />
            </div>
        );
        case 'calls': return <CallMonitoringView />;
        case 'tasks': return <TasksView currentUser={userProfile} />;
        case 'mail': return renderComingSoon('Inbox');
        case 'calendar': return renderComingSoon('Calendar');
        default: return renderComingSoon(activeTab.charAt(0).toUpperCase() + activeTab.slice(1));
    }
  };

  return (
    <ToastProvider>
      <div className="h-screen overflow-hidden bg-slate-100 dark:bg-slate-950 font-sans text-slate-800 dark:text-slate-100 flex flex-col">
        <TopNav 
          activeTab={activeTab} 
          onNavigate={setActiveTab} 
          user={userProfile} 
          onSignOut={handleSignOut} 
        />
        
        <div className="flex flex-1 overflow-hidden pt-14">
            <Sidebar activeTab={activeTab} setActiveTab={setActiveTab} user={userProfile} />
            
            <main className="flex-1 ml-16 print:ml-0 overflow-hidden flex flex-col relative bg-slate-100 dark:bg-slate-950">
                {renderContent()}
            </main>
        </div>
      </div>
    </ToastProvider>
  );
};

export default App;
