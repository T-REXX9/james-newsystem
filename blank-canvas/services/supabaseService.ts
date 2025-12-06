



import { supabase } from '../lib/supabaseClient';
import { Contact, PipelineDeal, Product, Task, UserProfile, CallLogEntry, Inquiry, Purchase, ReorderReportEntry, TeamMessage } from '../types';

// With our local mock DB, we can just query directly.
// The Mock DB handles the seeding from constants, so we trust it returns data.

export const fetchContacts = async (): Promise<Contact[]> => {
  try {
    const { data, error } = await supabase.from('contacts').select('*');
    if (error) throw error;
    return (data as Contact[]) || [];
  } catch (err) {
    console.error("Error fetching contacts:", err);
    return [];
  }
};

export const createContact = async (contact: Omit<Contact, 'id'>): Promise<void> => {
  try {
    const { error } = await supabase.from('contacts').insert(contact);
    if (error) throw error;
  } catch (err) {
    console.error("Error creating contact:", err);
    throw err;
  }
};

export const updateContact = async (id: string, updates: Partial<Contact>): Promise<void> => {
    try {
      const { error } = await supabase.from('contacts').update(updates).eq('id', id);
      if (error) throw error;
    } catch (err) {
      console.error("Error updating contact:", err);
      throw err;
    }
  };

export const bulkUpdateContacts = async (ids: string[], updates: Partial<Contact>): Promise<void> => {
    try {
        // Mock query builder update isn't sophisticated for "IN" clauses in this demo
        // so we loop. In real Supabase: .in('id', ids).update(updates)
        for (const id of ids) {
            await updateContact(id, updates);
        }
    } catch (err) {
        console.error("Error bulk updating contacts:", err);
        throw err;
    }
}

export const fetchDeals = async (): Promise<PipelineDeal[]> => {
  try {
    const { data, error } = await supabase.from('deals').select('*');
    if (error) throw error;
    return (data as PipelineDeal[]) || [];
  } catch (err) {
    console.error("Error fetching deals:", err);
    return [];
  }
};

// --- PRODUCT SERVICE ---

export const fetchProducts = async (): Promise<Product[]> => {
  try {
    const { data, error } = await supabase.from('products').select('*');
    if (error) throw error;
    return (data as Product[]) || [];
  } catch (err) {
    console.error("Error fetching products:", err);
    return [];
  }
};

// --- REORDER REPORT SERVICE ---

export const fetchReorderReportEntries = async (): Promise<ReorderReportEntry[]> => {
  try {
    const { data, error } = await supabase.from('reorder-report').select('*');
    if (error) throw error;
    return (data as ReorderReportEntry[]) || [];
  } catch (err) {
    console.error('Error fetching reorder report entries:', err);
    return [];
  }
};

export const createProduct = async (product: Omit<Product, 'id'>): Promise<void> => {
  try {
    const { error } = await supabase.from('products').insert(product);
    if (error) throw error;
  } catch (err) {
    console.error("Error creating product:", err);
    throw err;
  }
};

export const updateProduct = async (id: string, updates: Partial<Product>): Promise<void> => {
  try {
    const { error } = await supabase.from('products').update(updates).eq('id', id);
    if (error) throw error;
  } catch (err) {
    console.error("Error updating product:", err);
    throw err;
  }
};

export const deleteProduct = async (id: string): Promise<void> => {
  try {
    const { error } = await supabase.from('products').delete().eq('id', id);
    if (error) throw error;
  } catch (err) {
    console.error("Error deleting product:", err);
    throw err;
  }
};

// --- USER PROFILE SERVICE ---

export const fetchProfiles = async (): Promise<UserProfile[]> => {
  try {
    const { data, error } = await supabase.from('profiles').select('*');
    if (error) throw error;
    return (data as UserProfile[]) || [];
  } catch (err) {
    console.error("Error fetching profiles:", err);
    return [];
  }
};

export const updateProfile = async (id: string, updates: Partial<UserProfile>): Promise<void> => {
  try {
    const { error } = await supabase.from('profiles').update(updates).eq('id', id);
    if (error) throw error;
  } catch (err) {
    console.error("Error updating profile:", err);
    throw err;
  }
};

// --- TASKS SERVICE ---

export const fetchTasks = async (): Promise<Task[]> => {
    try {
      const { data, error } = await supabase.from('tasks').select('*');
      if (error) throw error;
      return (data as Task[]) || [];
    } catch (err) {
      console.error("Error fetching tasks:", err);
      return [];
    }
  };
  
  export const createTask = async (task: Omit<Task, 'id'>): Promise<void> => {
    try {
      const { error } = await supabase.from('tasks').insert(task);
      if (error) throw error;
    } catch (err) {
      console.error("Error creating task:", err);
      throw err;
    }
  };
  
  export const updateTask = async (id: string, updates: Partial<Task>): Promise<void> => {
    try {
      const { error } = await supabase.from('tasks').update(updates).eq('id', id);
      if (error) throw error;
    } catch (err) {
      console.error("Error updating task:", err);
      throw err;
    }
  };
  
export const deleteTask = async (id: string): Promise<void> => {
    try {
      const { error } = await supabase.from('tasks').delete().eq('id', id);
      if (error) throw error;
    } catch (err) {
      console.error("Error deleting task:", err);
      throw err;
    }
  };

// --- TEAM MESSAGES SERVICE ---

export const fetchTeamMessages = async (): Promise<TeamMessage[]> => {
  try {
    const { data, error } = await supabase.from('team_messages').select('*').order('created_at', { ascending: true });
    if (error) throw error;
    return (data as TeamMessage[]) || [];
  } catch (err) {
    console.error('Error fetching team messages:', err);
    return [];
  }
};

export const createTeamMessage = async (message: Omit<TeamMessage, 'id'>): Promise<void> => {
  try {
    const payload = { ...message, created_at: message.created_at || new Date().toISOString() };
    const { error } = await supabase.from('team_messages').insert(payload);
    if (error) throw error;
  } catch (err) {
    console.error('Error creating team message:', err);
    throw err;
  }
};

export const updateTeamMessage = async (id: string, updates: Partial<TeamMessage>): Promise<void> => {
  try {
    const { error } = await supabase.from('team_messages').update(updates).eq('id', id);
    if (error) throw error;
  } catch (err) {
    console.error('Error updating team message:', err);
    throw err;
  }
};

export const deleteTeamMessage = async (id: string): Promise<void> => {
  try {
    const { error } = await supabase.from('team_messages').delete().eq('id', id);
    if (error) throw error;
  } catch (err) {
    console.error('Error deleting team message:', err);
    throw err;
  }
};

// --- CALL MONITORING SERVICE ---

export const fetchCallLogs = async (): Promise<CallLogEntry[]> => {
  try {
    const { data, error } = await supabase.from('call_logs').select('*').order('occurred_at', { ascending: false });
    if (error) throw error;
    return (data as CallLogEntry[]) || [];
  } catch (err) {
    console.error('Error fetching call logs:', err);
    return [];
  }
};

export const fetchInquiries = async (): Promise<Inquiry[]> => {
  try {
    const { data, error } = await supabase.from('inquiries').select('*').order('occurred_at', { ascending: false });
    if (error) throw error;
    return (data as Inquiry[]) || [];
  } catch (err) {
    console.error('Error fetching inquiries:', err);
    return [];
  }
};

export const fetchPurchases = async (): Promise<Purchase[]> => {
  try {
    const { data, error } = await supabase.from('purchases').select('*').order('purchased_at', { ascending: false });
    if (error) throw error;
    return (data as Purchase[]) || [];
  } catch (err) {
    console.error('Error fetching purchases:', err);
    return [];
  }
};

export const createInquiry = async (payload: Omit<Inquiry, 'id'>): Promise<void> => {
  try {
    const { error } = await supabase.from('inquiries').insert(payload);
    if (error) throw error;
  } catch (err) {
    console.error('Error creating inquiry:', err);
    throw err;
  }
};

export const subscribeToCallMonitoringUpdates = (onChange: () => void) => {
  const channel = supabase.channel('call-monitoring-realtime');
  const tables = ['call_logs', 'inquiries', 'purchases', 'contacts'];
  tables.forEach((table) => {
    channel.on('postgres_changes', { event: '*', schema: 'public', table }, () => {
      onChange();
    });
  });

  channel.subscribe();

  return () => {
    if (typeof supabase.removeChannel === 'function') {
      supabase.removeChannel(channel);
    }
  };
};
