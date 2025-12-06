




import { MOCK_CONTACTS, MOCK_PIPELINE_DEALS, MOCK_PRODUCTS, MOCK_TASKS, MOCK_REORDER_REPORT, MOCK_TEAM_MESSAGES, generateCallMonitoringSeed } from '../constants';

// --- TYPES ---
type TableName = 'contacts' | 'deals' | 'users' | 'profiles' | 'products' | 'tasks' | 'reorder-report' | 'call_logs' | 'inquiries' | 'purchases' | 'team_messages';

interface MockUser {
  id: string;
  email: string;
  user_metadata: {
    full_name?: string;
    avatar_url?: string;
    role?: string;
    birthday?: string;
    mobile?: string;
  };
  password?: string; // Stored in plaintext for this local demo only
}

// --- LOCAL STORAGE HELPERS ---
const DB_PREFIX = 'nexus_crm_local_';
const DB_VERSION = '3.7'; // Incrementing to force update

const getTable = <T>(table: TableName): T[] => {
  try {
    const stored = localStorage.getItem(DB_PREFIX + table);
    return stored ? JSON.parse(stored) : [];
  } catch {
    return [];
  }
};

const setTable = (table: TableName, data: any[]) => {
  localStorage.setItem(DB_PREFIX + table, JSON.stringify(data));
};

// --- SEEDING ---
const seedData = () => {
  const currentVersion = localStorage.getItem(DB_PREFIX + 'version');

  // If version mismatch, clear DB to inject new data
  if (currentVersion !== DB_VERSION) {
    console.log(`Migrating Database from ${currentVersion} to ${DB_VERSION}... Injecting new data.`);
    localStorage.removeItem(DB_PREFIX + 'contacts');
    localStorage.removeItem(DB_PREFIX + 'deals');
    localStorage.removeItem(DB_PREFIX + 'products');
    localStorage.removeItem(DB_PREFIX + 'reorder-report');
    localStorage.removeItem(DB_PREFIX + 'tasks');
    localStorage.removeItem(DB_PREFIX + 'call_logs');
    localStorage.removeItem(DB_PREFIX + 'inquiries');
    localStorage.removeItem(DB_PREFIX + 'purchases');
    localStorage.removeItem(DB_PREFIX + 'team_messages');
    // We optionally keep users/profiles if they exist to avoid logging everyone out, 
    // but for this update we should probably refresh them to ensure they have access_rights fields if they are missing.
    // However, for safety in this demo environment, let's keep users but maybe patch the admin.
    localStorage.setItem(DB_PREFIX + 'version', DB_VERSION);
  }

  if (!localStorage.getItem(DB_PREFIX + 'contacts') || getTable('contacts').length === 0) {
    setTable('contacts', MOCK_CONTACTS);
  }
  
  if (!localStorage.getItem(DB_PREFIX + 'deals') || getTable('deals').length === 0) {
    setTable('deals', MOCK_PIPELINE_DEALS);
  }

  if (!localStorage.getItem(DB_PREFIX + 'products') || getTable('products').length === 0) {
    setTable('products', MOCK_PRODUCTS);
  }

  if (!localStorage.getItem(DB_PREFIX + 'reorder-report') || getTable('reorder-report').length === 0) {
    setTable('reorder-report', MOCK_REORDER_REPORT);
  }

  if (!localStorage.getItem(DB_PREFIX + 'tasks') || getTable('tasks').length === 0) {
    setTable('tasks', MOCK_TASKS);
  }

  if (!localStorage.getItem(DB_PREFIX + 'team_messages') || getTable('team_messages').length === 0) {
    setTable('team_messages', MOCK_TEAM_MESSAGES);
  }

  const existingCallLogs = getTable('call_logs');
  const existingInquiries = getTable('inquiries');
  const existingPurchases = getTable('purchases');
  const needsCallMonitoringSeed = !existingCallLogs.length || !existingInquiries.length || !existingPurchases.length;

  if (needsCallMonitoringSeed) {
    const { callLogs, inquiries, purchases } = generateCallMonitoringSeed();
    if (!existingCallLogs.length) {
      setTable('call_logs', callLogs);
    }
    if (!existingInquiries.length) {
      setTable('inquiries', inquiries);
    }
    if (!existingPurchases.length) {
      setTable('purchases', purchases);
    }
  }

  // Ensure Admin User exists
  const users = getTable<MockUser>('users');
  const profiles = getTable<any>('profiles');
  
  const adminId = 'user_admin_001';
  const adminExists = users.some(u => u.id === adminId);
  
  if (!adminExists) {
    const adminUser: MockUser = {
      id: adminId,
      email: 'main@tnd-opc.com',
      password: '123456', 
      user_metadata: { full_name: 'James Quek', role: 'Owner', avatar_url: 'https://i.pravatar.cc/150?u=james' }
    };
    setTable('users', [...users, adminUser]);
    setTable('profiles', [...profiles, {
      id: adminId,
      email: adminUser.email,
      full_name: adminUser.user_metadata.full_name,
      avatar_url: adminUser.user_metadata.avatar_url,
      role: 'Owner',
      access_rights: ['*'] // Full access
    }]);
  } else {
    // Patch existing admin to ensure they have full access in this new version
    const updatedProfiles = profiles.map((p: any) => {
        if (p.id === adminId) {
            return { ...p, access_rights: ['*'] };
        }
        return p;
    });
    setTable('profiles', updatedProfiles);
  }

  // Ensure Test Sales Agent exists for testing
  const agentId = 'user_agent_001';
  const agentExists = users.some(u => u.id === agentId);
  
  if (!agentExists) {
    const agentUser: MockUser = {
      id: agentId,
      email: 'agent@tnd-opc.com',
      password: '123456',
      user_metadata: { 
        full_name: 'Test Sales Agent', 
        role: 'Sales Agent', 
        avatar_url: 'https://i.pravatar.cc/150?u=agent' 
      }
    };
    setTable('users', [...users, agentUser]);
    setTable('profiles', [...profiles, {
      id: agentId,
      email: agentUser.email,
      full_name: agentUser.user_metadata.full_name,
      avatar_url: agentUser.user_metadata.avatar_url,
      role: 'Sales Agent',
      access_rights: ['dashboard', 'pipelines', 'mail', 'calendar', 'tasks']
    }]);
  } else {
    // Patch existing agent profile to ensure correct role and permissions
    const updatedProfiles = profiles.map((p: any) => {
      if (p.id === agentId) {
        return { ...p, role: 'Sales Agent', access_rights: ['dashboard','pipelines','mail','calendar','tasks'] };
      }
      return p;
    });
    setTable('profiles', updatedProfiles);
  }
};

// Initialize DB on load
if (typeof window !== 'undefined') {
  seedData();
}

// --- QUERY BUILDER ---
class MockQueryBuilder<T> {
  private data: T[];
  private error: any = null;
  private tableName: TableName;
  private operation: 'select' | 'update' | 'delete' = 'select';
  private updatePayload: any = null;
  private isSingle: boolean = false;

  constructor(tableName: TableName) {
    this.tableName = tableName;
    this.data = getTable<T>(tableName);
  }

  select(columns?: string) {
    this.operation = 'select';
    return this;
  }

  eq(column: string, value: any) {
    this.data = this.data.filter((item: any) => item[column] === value);
    return this;
  }

  order(column: string, options?: { ascending?: boolean }) {
    const ascending = options?.ascending ?? true;
    this.data = [...this.data].sort((a: any, b: any) => {
      const aValue = a?.[column];
      const bValue = b?.[column];
      if (aValue == null && bValue == null) return 0;
      if (aValue == null) return ascending ? 1 : -1;
      if (bValue == null) return ascending ? -1 : 1;

      const aDate = typeof aValue === 'string' ? Date.parse(aValue) : NaN;
      const bDate = typeof bValue === 'string' ? Date.parse(bValue) : NaN;
      if (!Number.isNaN(aDate) && !Number.isNaN(bDate)) {
        return ascending ? aDate - bDate : bDate - aDate;
      }

      if (typeof aValue === 'number' && typeof bValue === 'number') {
        return ascending ? aValue - bValue : bValue - aValue;
      }

      const comparison = String(aValue).localeCompare(String(bValue));
      return ascending ? comparison : -comparison;
    });
    return this;
  }

  single() {
    this.isSingle = true;
    return this;
  }

  // insert returns Promise directly for compatibility
  async insert(row: any) {
    const currentData = getTable(this.tableName);
    const insertedRow = { ...row };
    // Add ID if missing
    if (!insertedRow.id) insertedRow.id = Math.random().toString(36).substr(2, 9);
    const newData = [...currentData, insertedRow];
    setTable(this.tableName, newData);
    notifyTableInsert(this.tableName, insertedRow);
    return { data: [insertedRow], error: null };
  }

  update(updates: any) {
    this.operation = 'update';
    this.updatePayload = updates;
    return this;
  }

  delete() {
    this.operation = 'delete';
    return this;
  }

  // Execute
  then(resolve: (result: { data: any, error: any }) => void, reject?: (err: any) => void) {
    try {
        if (this.operation === 'select') {
             if (this.isSingle) {
                if (this.data.length === 0) {
                   resolve({ data: null, error: { message: 'No rows found' } });
                } else {
                   resolve({ data: this.data[0], error: null });
                }
             } else {
                resolve({ data: this.data, error: this.error });
             }
        } 
        else if (this.operation === 'update') {
            const idsToUpdate = (this.data as any[]).map(item => item.id);
            const fullTableData = getTable<any>(this.tableName);
            
            const updatedTableData = fullTableData.map(item => {
                if (idsToUpdate.includes(item.id)) {
                    return { ...item, ...this.updatePayload };
                }
                return item;
            });
    
            setTable(this.tableName, updatedTableData);
            resolve({ data: idsToUpdate, error: null });
        } 
        else if (this.operation === 'delete') {
            const idsToDelete = (this.data as any[]).map(item => item.id);
            const fullTableData = getTable<any>(this.tableName);
            
            const remainingData = fullTableData.filter(item => !idsToDelete.includes(item.id));
            
            setTable(this.tableName, remainingData);
            resolve({ data: idsToDelete, error: null });
        } else {
            resolve({ data: null, error: null });
        }
    } catch (e) {
        if (reject) reject(e);
    }
  }
}

class MockRealtimeChannel {
  private handlers: Array<{ eventType: string; filter: any; callback: (payload: any) => void }> = [];
  private boundTables: Set<TableName | string> = new Set();
  constructor(private name: string) {}

  getName() {
    return this.name;
  }

  on(eventType: string, filter: any, callback: (payload: any) => void) {
    this.handlers.push({ eventType, filter, callback });
    if (eventType === 'postgres_changes' && filter?.table) {
      this.boundTables.add(filter.table);
      registerChannelForTable(filter.table, this);
    }
    return this;
  }

  async subscribe(statusCallback?: (status: 'SUBSCRIBED' | 'CLOSED' | 'CHANNEL_ERROR' | 'TIMED_OUT') => void) {
    statusCallback?.('SUBSCRIBED');
    return { data: { subscription: { unsubscribe: () => this.unsubscribe() } }, error: null };
  }

  unsubscribe() {
    this.handlers = [];
    removeChannelFromRegistry(this);
    this.boundTables.clear();
  }

  // Utility to trigger handlers in the mock environment
  emit(payload?: any, options?: { eventType?: string }) {
    const incomingEvent = options?.eventType || payload?.eventType || 'INSERT';
    this.handlers.forEach(({ eventType, filter, callback }) => {
      if (eventType === 'postgres_changes') {
        const filterTable = filter?.table;
        const filterEvent = filter?.event || '*';
        if (filterTable && filterTable !== payload?.table) {
          return;
        }
        if (filterEvent !== '*' && filterEvent !== incomingEvent) {
          return;
        }
      }
      callback(payload);
    });
  }

  getBoundTables() {
    return Array.from(this.boundTables);
  }
}

const realtimeTableRegistry = new Map<TableName | string, Set<MockRealtimeChannel>>();
const channelNameRegistry = new Map<string, MockRealtimeChannel>();
const activeChannels = new Set<MockRealtimeChannel>();

function registerChannelForTable(table: TableName | string, channel: MockRealtimeChannel) {
  if (!realtimeTableRegistry.has(table)) {
    realtimeTableRegistry.set(table, new Set());
  }
  realtimeTableRegistry.get(table)?.add(channel);
}

function removeChannelFromRegistry(channel: MockRealtimeChannel) {
  realtimeTableRegistry.forEach((channels, table) => {
    channels.delete(channel);
    if (channels.size === 0) {
      realtimeTableRegistry.delete(table);
    }
  });
  channelNameRegistry.delete(channel.getName());
  activeChannels.delete(channel);
}

function notifyTableInsert(table: TableName, row: any) {
  // Forward inserts to any mock realtime subscribers for this table
  const channels = realtimeTableRegistry.get(table);
  if (!channels) return;

  const payload = {
    eventType: 'INSERT',
    schema: 'public',
    table,
    new: row,
    old: null
  };

  channels.forEach((channel) => channel.emit(payload, { eventType: 'INSERT' }));
}

// --- AUTH OBSERVER ---
const authSubscribers: Array<(event: string, session: any) => void> = [];

const notifySubscribers = (event: string, session: any) => {
  authSubscribers.forEach(callback => callback(event, session));
};

// --- SUPABASE MOCK CLIENT ---
export const supabase = {
  from: (table: TableName) => new MockQueryBuilder(table),
  channel: (name: string) => {
    const channel = new MockRealtimeChannel(name);
    activeChannels.add(channel);
    channelNameRegistry.set(name, channel);
    return channel;
  },
  removeChannel: async (channel: MockRealtimeChannel) => {
    channel.unsubscribe();
    return { data: null, error: null };
  },
  
  auth: {
    getSession: async () => {
      const sessionStr = localStorage.getItem(DB_PREFIX + 'session');
      return { data: { session: sessionStr ? JSON.parse(sessionStr) : null }, error: null };
    },
    
    getUser: async () => {
       const sessionStr = localStorage.getItem(DB_PREFIX + 'session');
       const session = sessionStr ? JSON.parse(sessionStr) : null;
       return { data: { user: session?.user || null }, error: null };
    },

    onAuthStateChange: (callback: (event: string, session: any) => void) => {
      authSubscribers.push(callback);
      return { 
        data: { 
          subscription: { 
            unsubscribe: () => {
              const index = authSubscribers.indexOf(callback);
              if (index > -1) authSubscribers.splice(index, 1);
            } 
          } 
        } 
      };
    },

    signUp: async ({ email, password, options }: any) => {
      const users = getTable<MockUser>('users');
      if (users.find(u => u.email === email)) {
        return { data: null, error: { message: 'User already exists' } };
      }

      const newUser: MockUser = {
        id: Math.random().toString(36).substr(2, 9),
        email,
        password,
        user_metadata: options?.data || {}
      };

      setTable('users', [...users, newUser]);
      
      // Also create profile with default LIMITED permissions
      const profiles = getTable('profiles');
      setTable('profiles', [...profiles, {
        id: newUser.id,
        email: newUser.email,
        full_name: newUser.user_metadata.full_name,
        role: newUser.user_metadata.role || 'Sales Agent', // Use provided role or default
        avatar_url: newUser.user_metadata.avatar_url,
        birthday: newUser.user_metadata.birthday,
        mobile: newUser.user_metadata.mobile,
        // Default permissions for new users: Dashboard, Pipelines, Mail, Calendar, Tasks
        access_rights: ['dashboard', 'pipelines', 'mail', 'calendar', 'tasks']
      }]);

      return { data: { user: newUser, session: null }, error: null };
    },

    signInWithPassword: async ({ email, password }: any) => {
      const users = getTable<MockUser>('users');
      const user = users.find(u => u.email === email && u.password === password);

      if (!user) {
        return { data: { session: null }, error: { message: 'Invalid login credentials' } };
      }

      const session = {
        access_token: 'mock_token_' + Date.now(),
        user: user
      };
      localStorage.setItem(DB_PREFIX + 'session', JSON.stringify(session));
      
      // Notify App.tsx immediately
      notifySubscribers('SIGNED_IN', session);

      return { data: { session, user }, error: null };
    },

    signOut: async () => {
      localStorage.removeItem(DB_PREFIX + 'session');
      notifySubscribers('SIGNED_OUT', null);
      return { error: null };
    }
  }
};
