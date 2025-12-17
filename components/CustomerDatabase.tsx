
import React, { useState, useMemo } from 'react';
import {
  Search, Plus, Filter, Users, Eye, EyeOff, Tag, CheckSquare, Square, MoreHorizontal, UserCheck, Smartphone, Mail
} from 'lucide-react';
import { Contact, CustomerStatus } from '../types';
import AddContactModal from './AddContactModal';
import ContactDetails from './ContactDetails';
import CompanyName from './CompanyName';
import { useRealtimeList } from '../hooks/useRealtimeList';
import { fetchContacts, bulkUpdateContacts } from '../services/supabaseService';
import { applyOptimisticBulkUpdate } from '../utils/optimisticUpdates';

const CustomerDatabase: React.FC = () => {
  const [searchQuery, setSearchQuery] = useState('');

  // Filtering
  const [filterStatus, setFilterStatus] = useState<string>('All');
  const [filterVisibility, setFilterVisibility] = useState<string>('All'); // All, Hidden, Unhidden

  // Bulk Selection
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  // Modals
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isBulkAgentModalOpen, setIsBulkAgentModalOpen] = useState(false);
  const [isBulkPriceModalOpen, setIsBulkPriceModalOpen] = useState(false);
  const [selectedCustomerForDetail, setSelectedCustomerForDetail] = useState<string | null>(null);

  // Bulk Values
  const [selectedAgentForBulk, setSelectedAgentForBulk] = useState('James Quek');
  const [selectedPriceGroupForBulk, setSelectedPriceGroupForBulk] = useState('AA');

  // Use real-time list hook for contacts
  const sortByCompany = (a: Contact, b: Contact) => {
    return (a.company || '').localeCompare(b.company || '');
  };

  const { data: customers, isLoading, setData: setCustomers } = useRealtimeList<Contact>({
    tableName: 'contacts',
    initialFetchFn: fetchContacts,
    sortFn: sortByCompany,
  });

  const filteredCustomers = useMemo(() => {
    if (!customers || !Array.isArray(customers)) return [];
    
    return customers.filter(c => {
      // Defensive checks for missing fields
      if (!c) return false;

      const companyName = c.company || '';
      const query = searchQuery.toLowerCase();
      
      // Safe access to nested arrays/objects for search
      const contactPersonMatch = c.contactPersons && Array.isArray(c.contactPersons) 
        ? c.contactPersons.some(p => (p && p.name ? p.name.toLowerCase().includes(query) : false))
        : false;
      
      const legacyNameMatch = (c.name || '').toLowerCase().includes(query);

      const matchSearch = 
        companyName.toLowerCase().includes(query) || 
        contactPersonMatch || 
        legacyNameMatch;
      
      const matchStatus = filterStatus === 'All' || c.status === filterStatus;
      
      const matchVisibility = 
        filterVisibility === 'All' ? true :
        filterVisibility === 'Hidden' ? !!c.isHidden :
        !c.isHidden;

      return matchSearch && matchStatus && matchVisibility;
    });
  }, [customers, searchQuery, filterStatus, filterVisibility]);

  // Selection Logic
  const toggleSelection = (id: string) => {
    const newSet = new Set(selectedIds);
    if (newSet.has(id)) newSet.delete(id);
    else newSet.add(id);
    setSelectedIds(newSet);
  };

  const toggleAll = () => {
    if (selectedIds.size === filteredCustomers.length && filteredCustomers.length > 0) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(filteredCustomers.map(c => c.id)));
    }
  };

  // Bulk Handlers with optimistic updates
  const handleBulkVisibility = async (isHidden: boolean) => {
    if (selectedIds.size === 0) return;
    if (!window.confirm(`Set ${selectedIds.size} customers to ${isHidden ? 'Hidden' : 'Unhidden'}?`)) return;

    const ids = Array.from(selectedIds);
    const updates = ids.map(id => ({ id, updates: { isHidden } }));

    // Optimistic update
    setCustomers(prev => applyOptimisticBulkUpdate(prev, updates));
    setSelectedIds(new Set());

    try {
      await bulkUpdateContacts(ids, { isHidden });
    } catch (error) {
      console.error('Error updating visibility:', error);
      // Real-time subscription will correct the state
    }
  };

  const handleBulkAssignAgent = async () => {
    if (selectedIds.size === 0) return;

    const ids = Array.from(selectedIds);
    const updates = ids.map(id => ({
      id,
      updates: { salesman: selectedAgentForBulk, assignedAgent: selectedAgentForBulk }
    }));

    // Optimistic update
    setCustomers(prev => applyOptimisticBulkUpdate(prev, updates));
    setIsBulkAgentModalOpen(false);
    setSelectedIds(new Set());

    try {
      await bulkUpdateContacts(ids, {
        salesman: selectedAgentForBulk,
        assignedAgent: selectedAgentForBulk
      });
    } catch (error) {
      console.error('Error assigning agent:', error);
      // Real-time subscription will correct the state
    }
  };

  const handleBulkAssignPriceGroup = async () => {
    if (selectedIds.size === 0) return;

    const ids = Array.from(selectedIds);
    const updates = ids.map(id => ({ id, updates: { priceGroup: selectedPriceGroupForBulk } }));

    // Optimistic update
    setCustomers(prev => applyOptimisticBulkUpdate(prev, updates));
    setIsBulkPriceModalOpen(false);
    setSelectedIds(new Set());

    try {
      await bulkUpdateContacts(ids, { priceGroup: selectedPriceGroupForBulk });
    } catch (error) {
      console.error('Error assigning price group:', error);
      // Real-time subscription will correct the state
    }
  };

  // Single CRUD Handlers (UI Only)
  const handleCreateContact = async (data: Omit<Contact, 'id'>) => {
      const newContact: Contact = {
          ...data,
          id: `new-${Date.now()}`,
          // Defaults for required fields if missing
          salesHistory: [],
          topProducts: [],
          interactions: [],
          comments: [],
          dealValue: 0,
          totalSales: 0,
          balance: 0,
          salesByYear: {},
          lastContactDate: new Date().toISOString().split('T')[0],
          avatar: `https://i.pravatar.cc/150?u=${Math.random()}`
      } as Contact;
      
      setCustomers(prev => [newContact, ...prev]);
  };
  
  const handleUpdateContact = (updated: Contact) => {
      setCustomers(prev => prev.map(c => c.id === updated.id ? updated : c));
  };

  // Render detail view safely
  if (selectedCustomerForDetail) {
      const customer = customers.find(c => c.id === selectedCustomerForDetail);
      if (customer) {
          return (
              <ContactDetails 
                contact={customer}
                onClose={() => setSelectedCustomerForDetail(null)}
                onUpdate={handleUpdateContact}
                currentUser={null} // Pass null as default to prevent crash
              />
          )
      }
  }

  // Safe enum values with strict fallback
  const customerStatusOptions = (CustomerStatus && Object.keys(CustomerStatus).length > 0)
    ? Object.values(CustomerStatus) 
    : ['Active', 'Inactive', 'Prospective', 'Blacklisted'];

  return (
    <div className="flex flex-col h-full bg-slate-50 dark:bg-slate-950 p-6 animate-fadeIn relative">
       
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-800 dark:text-white flex items-center gap-2">
            <Users className="w-6 h-6 text-brand-blue" />
            Customer Database
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            UI Template Mode - Viewing mock data.
          </p>
        </div>
        <button 
          onClick={() => setIsAddModalOpen(true)}
          className="flex items-center gap-2 px-4 py-2 bg-brand-blue hover:bg-blue-700 text-white rounded-lg shadow-sm font-medium transition-colors"
        >
          <Plus className="w-4 h-4" /> Add Customer
        </button>
      </div>

      {/* Toolbar */}
      <div className="bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col md:flex-row gap-4 mb-6 sticky top-0 z-20">
         
         {/* Search */}
         <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4" />
          <input 
            type="text" 
            placeholder="Search company, contact person..." 
            className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-white text-sm rounded-lg pl-10 pr-4 py-2 focus:border-brand-blue outline-none transition-all"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>

        {/* Filters */}
        <div className="flex items-center gap-3">
             {/* Status Filter */}
             <div className="relative">
                 <select 
                    value={filterStatus}
                    onChange={(e) => setFilterStatus(e.target.value)}
                    className="bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 text-sm rounded-lg pl-3 pr-8 py-2 appearance-none outline-none focus:border-brand-blue"
                 >
                     <option value="All">All Status</option>
                     {customerStatusOptions.map(s => <option key={s} value={s}>{s}</option>)}
                 </select>
                 <Filter className="absolute right-3 top-1/2 -translate-y-1/2 w-3 h-3 text-slate-400 pointer-events-none" />
             </div>

             {/* Visibility Filter */}
             <div className="relative">
                 <select 
                    value={filterVisibility}
                    onChange={(e) => setFilterVisibility(e.target.value)}
                    className="bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 text-sm rounded-lg pl-3 pr-8 py-2 appearance-none outline-none focus:border-brand-blue"
                 >
                     <option value="All">All Visibility</option>
                     <option value="Unhidden">Unhidden</option>
                     <option value="Hidden">Hidden</option>
                 </select>
                 <Eye className="absolute right-3 top-1/2 -translate-y-1/2 w-3 h-3 text-slate-400 pointer-events-none" />
             </div>
        </div>
      </div>

      {/* Bulk Action Bar (Visible when selectedIds > 0) */}
      {selectedIds.size > 0 && (
          <div className="bg-brand-blue text-white p-3 rounded-lg shadow-md mb-4 flex items-center justify-between animate-fadeIn">
              <span className="font-bold text-sm px-2">{selectedIds.size} customers selected</span>
              <div className="flex items-center gap-3">
                  <button onClick={() => setIsBulkAgentModalOpen(true)} className="flex items-center gap-2 px-3 py-1.5 bg-white/10 hover:bg-white/20 rounded text-xs font-medium transition-colors">
                      <UserCheck className="w-3.5 h-3.5" /> Assign Agent
                  </button>
                  <button onClick={() => setIsBulkPriceModalOpen(true)} className="flex items-center gap-2 px-3 py-1.5 bg-white/10 hover:bg-white/20 rounded text-xs font-medium transition-colors">
                      <Tag className="w-3.5 h-3.5" /> Set Price Group
                  </button>
                  <button onClick={() => handleBulkVisibility(true)} className="flex items-center gap-2 px-3 py-1.5 bg-white/10 hover:bg-white/20 rounded text-xs font-medium transition-colors">
                      <EyeOff className="w-3.5 h-3.5" /> Hide
                  </button>
                  <button onClick={() => handleBulkVisibility(false)} className="flex items-center gap-2 px-3 py-1.5 bg-white/10 hover:bg-white/20 rounded text-xs font-medium transition-colors">
                      <Eye className="w-3.5 h-3.5" /> Unhide
                  </button>
                  <button onClick={() => setSelectedIds(new Set())} className="ml-4 text-xs underline opacity-80 hover:opacity-100">
                      Clear
                  </button>
              </div>
          </div>
      )}

      {/* Main Table */}
      <div className="flex-1 overflow-hidden bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm">
         <div className="h-full overflow-y-auto custom-scrollbar">
            <table className="w-full text-left border-collapse">
                <thead className="bg-slate-50 dark:bg-slate-800 sticky top-0 z-10 shadow-sm">
                    <tr className="text-xs uppercase text-slate-500 dark:text-slate-400 font-semibold border-b border-slate-200 dark:border-slate-700">
                        <th className="p-4 w-10">
                            <button onClick={toggleAll} className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-300">
                                {selectedIds.size === filteredCustomers.length && filteredCustomers.length > 0 ? <CheckSquare className="w-4 h-4 text-brand-blue" /> : <Square className="w-4 h-4" />}
                            </button>
                        </th>
                        <th className="p-4">Customer Name</th>
                        <th className="p-4">Status</th>
                        <th className="p-4">Balance</th>
                        <th className="p-4">Contact Info</th>
                        <th className="p-4">Area / Address</th>
                        <th className="p-4">Sales Agent</th>
                        <th className="p-4">Price Group</th>
                        <th className="p-4 text-right">Actions</th>
                    </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                    {filteredCustomers.length === 0 ? (
                        <tr><td colSpan={9} className="p-8 text-center text-slate-500 italic">No customers found matching filters.</td></tr>
                    ) : (
                        filteredCustomers.map(c => {
                            if (!c) return null; // Defensive Check
                            return (
                                <tr key={c.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors group">
                                    <td className="p-4 align-top">
                                        <button onClick={() => toggleSelection(c.id)} className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-300">
                                            {selectedIds.has(c.id) ? <CheckSquare className="w-4 h-4 text-brand-blue" /> : <Square className="w-4 h-4" />}
                                        </button>
                                    </td>
                                    <td className="p-4 cursor-pointer align-top" onClick={() => setSelectedCustomerForDetail(c.id)}>
                                        <div className="font-bold text-slate-800 dark:text-white flex flex-wrap items-center gap-2">
                                            <CompanyName 
                                              name={c.company}
                                              pastName={c.pastName}
                                              entity={c}
                                              className="flex items-center gap-1"
                                              formerNameClassName="text-xs text-slate-400 italic ml-1 font-medium"
                                            />
                                            {c.isHidden && <EyeOff className="w-3.5 h-3.5 text-slate-400" />}
                                        </div>
                                        <div className="text-xs text-slate-500 mt-0.5">
                                        {/* Safe Rendering for Contact Person */}
                                        {c.contactPersons && Array.isArray(c.contactPersons) && c.contactPersons.length > 0 
                                            ? (c.contactPersons[0]?.name || 'No Name') 
                                            : (c.name || 'No Contact')}
                                        </div>
                                    </td>
                                    <td className="p-4 align-top">
                                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase border ${
                                            (CustomerStatus && c.status === CustomerStatus.ACTIVE) ? 'bg-emerald-50 text-emerald-600 border-emerald-100 dark:bg-emerald-900/20 dark:border-emerald-900' :
                                            (CustomerStatus && c.status === CustomerStatus.INACTIVE) ? 'bg-slate-100 text-slate-500 border-slate-200 dark:bg-slate-800 dark:border-slate-700' :
                                            (CustomerStatus && c.status === CustomerStatus.BLACKLISTED) ? 'bg-rose-50 text-rose-600 border-rose-100 dark:bg-rose-900/20 dark:border-rose-900' :
                                            'bg-blue-50 text-blue-600 border-blue-100 dark:bg-blue-900/20 dark:border-blue-900'
                                        }`}>
                                            {c.status || 'Prospective'}
                                        </span>
                                    </td>
                                    {/* Balance Column */}
                                    <td className="p-4 align-top">
                                        <div className={`font-bold text-sm ${c.balance && c.balance > 0 ? 'text-rose-600 dark:text-rose-400' : 'text-slate-600 dark:text-slate-400'}`}>
                                            ₱{(c.balance || 0).toLocaleString()}
                                        </div>
                                        <div className="text-[10px] text-slate-400">{c.debtType || 'Good'}</div>
                                    </td>
                                    {/* Contact Info Column */}
                                    <td className="p-4 align-top">
                                        <div className="flex flex-col gap-1">
                                            <div className="flex items-center gap-1.5 text-xs text-slate-700 dark:text-slate-300">
                                                <Smartphone className="w-3 h-3 text-slate-400" />
                                                <span>{c.phone || c.mobile || '-'}</span>
                                            </div>
                                            {c.email && (
                                                <div className="flex items-center gap-1.5 text-xs text-slate-500">
                                                    <Mail className="w-3 h-3 text-slate-400" />
                                                    <span className="truncate max-w-[120px]" title={c.email}>{c.email}</span>
                                                </div>
                                            )}
                                        </div>
                                    </td>
                                    <td className="p-4 text-sm text-slate-600 dark:text-slate-300 align-top">
                                        <div className="font-medium">{c.area || '-'}</div>
                                        <div className="text-xs text-slate-400 truncate max-w-[150px]" title={c.address}>{c.address || '-'}</div>
                                    </td>
                                    <td className="p-4 text-sm text-slate-600 dark:text-slate-300 align-top">
                                        {c.salesman || '-'}
                                    </td>
                                    <td className="p-4 align-top">
                                        <span className="px-2 py-0.5 bg-slate-100 dark:bg-slate-800 rounded border border-slate-200 dark:border-slate-700 text-xs font-mono font-bold text-slate-600 dark:text-slate-300">
                                            {c.priceGroup || '-'}
                                        </span>
                                    </td>
                                    <td className="p-4 text-right align-top">
                                        <button onClick={() => setSelectedCustomerForDetail(c.id)} className="p-2 text-slate-400 hover:text-brand-blue hover:bg-blue-50 dark:hover:bg-slate-800 rounded transition-colors">
                                            <MoreHorizontal className="w-4 h-4" />
                                        </button>
                                    </td>
                                </tr>
                            );
                        })
                    )}
                </tbody>
            </table>
         </div>
      </div>

      <AddContactModal 
         isOpen={isAddModalOpen} 
         onClose={() => setIsAddModalOpen(false)}
         onSubmit={handleCreateContact}
      />

      {/* Bulk Agent Modal */}
      {isBulkAgentModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
             <div className="bg-white dark:bg-slate-900 p-6 rounded-xl shadow-xl w-full max-w-sm border border-slate-200 dark:border-slate-800">
                 <h3 className="font-bold text-lg mb-4 text-slate-800 dark:text-white">Assign Agent to {selectedIds.size} Customers</h3>
                 <div className="mb-4">
                     <label className="block text-xs font-bold text-slate-500 uppercase mb-2">Select Sales Agent</label>
                     <select 
                        value={selectedAgentForBulk}
                        onChange={(e) => setSelectedAgentForBulk(e.target.value)}
                        className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg p-2.5 text-sm"
                     >
                        {['James Quek', 'Sarah Sales', 'Esther Van'].map(name => (
                            <option key={name} value={name}>{name}</option>
                        ))}
                     </select>
                 </div>
                 <div className="flex justify-end gap-3">
                     <button onClick={() => setIsBulkAgentModalOpen(false)} className="px-3 py-2 text-sm text-slate-500">Cancel</button>
                     <button onClick={handleBulkAssignAgent} className="px-4 py-2 bg-brand-blue text-white rounded-lg text-sm font-bold">Assign</button>
                 </div>
             </div>
          </div>
      )}

      {/* Bulk Price Group Modal */}
      {isBulkPriceModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
             <div className="bg-white dark:bg-slate-900 p-6 rounded-xl shadow-xl w-full max-w-sm border border-slate-200 dark:border-slate-800">
                 <h3 className="font-bold text-lg mb-4 text-slate-800 dark:text-white">Set Price Group for {selectedIds.size} Customers</h3>
                 <div className="mb-4">
                     <label className="block text-xs font-bold text-slate-500 uppercase mb-2">Select Price Group</label>
                     <select 
                        value={selectedPriceGroupForBulk}
                        onChange={(e) => setSelectedPriceGroupForBulk(e.target.value)}
                        className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg p-2.5 text-sm"
                     >
                        {['AA', 'BB', 'CC', 'DD', 'VIP1', 'VIP2'].map(pg => (
                            <option key={pg} value={pg}>{pg}</option>
                        ))}
                     </select>
                 </div>
                 <div className="flex justify-end gap-3">
                     <button onClick={() => setIsBulkPriceModalOpen(false)} className="px-3 py-2 text-sm text-slate-500">Cancel</button>
                     <button onClick={handleBulkAssignPriceGroup} className="px-4 py-2 bg-brand-blue text-white rounded-lg text-sm font-bold">Set Group</button>
                 </div>
             </div>
          </div>
      )}

    </div>
  );
};

export default CustomerDatabase;
