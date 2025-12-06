



import { supabase } from '../lib/supabaseClient';
import { DEFAULT_STAFF_ACCESS_RIGHTS, DEFAULT_STAFF_ROLE, generateAvatarUrl, STAFF_ROLES } from '../constants';
import { Contact, PipelineDeal, Product, Task, UserProfile, CallLogEntry, Inquiry, Purchase, ReorderReportEntry, TeamMessage, CreateStaffAccountInput, CreateStaffAccountResult, StaffAccountValidationError } from '../types';

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

// --- STAFF ACCOUNT CREATION ---

const wait = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

const validateStaffAccountInput = (input: CreateStaffAccountInput): StaffAccountValidationError => {
  const errors: StaffAccountValidationError = {};

  if (!input.fullName?.trim()) {
    errors.fullName = 'Full name is required';
  }

  if (!input.email?.trim()) {
    errors.email = 'Email is required';
  } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(input.email)) {
    errors.email = 'Please provide a valid email address';
  }

  if (!input.password) {
    errors.password = 'Password is required';
  } else {
    const hasLength = input.password.length >= 8;
    const hasLetter = /[a-zA-Z]/.test(input.password);
    const hasNumber = /\d/.test(input.password);
    if (!hasLength || !hasLetter || !hasNumber) {
      errors.password = 'Password must be at least 8 characters and include letters and numbers';
    }
  }

  if (input.role && !STAFF_ROLES.includes(input.role)) {
    errors.role = 'Invalid role';
  }

  if (input.accessRights && !input.accessRights.length) {
    errors.accessRights = 'At least one access right is required';
  }

  return errors;
};

const normalizeAccessRights = (accessRights?: string[]) => {
  if (!accessRights || !accessRights.length) {
    return DEFAULT_STAFF_ACCESS_RIGHTS;
  }
  return Array.from(new Set(accessRights));
};

const mapAuthError = (message?: string) => {
  if (!message) return 'Unable to create account right now. Please try again.';
  if (message.toLowerCase().includes('duplicate') || message.toLowerCase().includes('already registered')) {
    return 'An account with this email already exists.';
  }
  if (message.toLowerCase().includes('password')) {
    return 'Password does not meet security requirements.';
  }
  return message;
};

const fetchProfileById = async (userId: string): Promise<UserProfile | null> => {
  try {
    const { data, error } = await supabase.from('profiles').select('*').eq('id', userId).maybeSingle();
    if (error) throw error;
    return (data as UserProfile) || null;
  } catch (err) {
    console.error('Error fetching profile by id:', err);
    return null;
  }
};

export const verifyProfileExists = async (userId: string): Promise<boolean> => {
  const profile = await fetchProfileById(userId);
  return Boolean(profile);
};

export const createProfileManually = async (profile: UserProfile): Promise<UserProfile | null> => {
  try {
    const payload = {
      id: profile.id,
      email: profile.email,
      full_name: profile.full_name,
      avatar_url: profile.avatar_url,
      role: profile.role || DEFAULT_STAFF_ROLE,
      access_rights: profile.access_rights || DEFAULT_STAFF_ACCESS_RIGHTS,
      birthday: profile.birthday || null,
      mobile: profile.mobile || null
    };
    const { data, error } = await supabase.from('profiles').insert(payload).select().maybeSingle();
    if (error) throw error;
    return (data as UserProfile) || null;
  } catch (err) {
    console.error('Error creating profile manually:', err);
    return null;
  }
};

export const createStaffAccount = async (input: CreateStaffAccountInput): Promise<CreateStaffAccountResult> => {
  const validationErrors = validateStaffAccountInput(input);
  if (Object.keys(validationErrors).length) {
    return { success: false, error: 'Validation failed', validationErrors };
  }

  const role = input.role && STAFF_ROLES.includes(input.role) ? input.role : DEFAULT_STAFF_ROLE;
  const accessRights = normalizeAccessRights(input.accessRights);
  const avatarUrl = generateAvatarUrl(input.fullName, input.email);

  try {
    const { data, error } = await supabase.auth.signUp({
      email: input.email.trim(),
      password: input.password,
      options: {
        data: {
          full_name: input.fullName.trim(),
          role,
          avatar_url: avatarUrl,
          access_rights: accessRights,
          birthday: input.birthday || null,
          mobile: input.mobile || null
        }
      }
    });

    if (error) {
      const friendly = mapAuthError(error.message);
      console.error('Auth signup failed:', error);
      return { success: false, error: friendly };
    }

    const userId = data?.user?.id;
    let profile: UserProfile | null = null;

    if (userId) {
      await wait(300);
      const profileReady = await verifyProfileExists(userId);
      profile = profileReady ? await fetchProfileById(userId) : null;

      if (!profile) {
        console.warn('Profile not found after trigger, attempting manual creation', { userId });
        await createProfileManually({
          id: userId,
          email: input.email,
          full_name: input.fullName,
          avatar_url: avatarUrl,
          role,
          access_rights: accessRights,
          birthday: input.birthday,
          mobile: input.mobile
        });
        await wait(150);
        profile = await fetchProfileById(userId);
      }
    }

    console.info('Staff account created', { email: input.email, userId });
    return { success: true, userId: userId || undefined, profile: profile || undefined };
  } catch (err: any) {
    console.error('Error creating staff account:', err);
    return { success: false, error: err?.message || 'Unable to create account' };
  }
};

export const bulkCreateStaffAccounts = async (inputs: CreateStaffAccountInput[]) => {
  const results: CreateStaffAccountResult[] = [];
  for (const input of inputs) {
    const result = await createStaffAccount(input);
    results.push(result);
  }
  return results;
};

export const resetStaffPassword = async (userId: string, newPassword: string) => {
  try {
    const { error } = await supabase.auth.admin.updateUserById(userId, { password: newPassword });
    if (error) throw error;
    console.info('Password reset for user', { userId });
    return true;
  } catch (err) {
    console.error('Error resetting staff password:', err);
    return false;
  }
};

export const deactivateStaffAccount = async (userId: string) => {
  try {
    const { error } = await supabase.from('profiles').update({ access_rights: [] }).eq('id', userId);
    if (error) throw error;
    console.info('Staff account deactivated', { userId });
    return true;
  } catch (err) {
    console.error('Error deactivating staff account:', err);
    return false;
  }
};

export const updateStaffRole = async (userId: string, role: string) => {
  if (!STAFF_ROLES.includes(role)) {
    return false;
  }

  try {
    const { error } = await supabase.from('profiles').update({ role }).eq('id', userId);
    if (error) throw error;
    console.info('Staff role updated', { userId, role });
    return true;
  } catch (err) {
    console.error('Error updating staff role:', err);
    return false;
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
