import { createClient } from '@supabase/supabase-js';
import { DEFAULT_STAFF_ACCESS_RIGHTS, DEFAULT_STAFF_ROLE, MOCK_CONTACTS, MOCK_PIPELINE_DEALS, MOCK_PRODUCTS, MOCK_REORDER_REPORT, MOCK_TASKS, MOCK_TEAM_MESSAGES, MOCK_NOTIFICATIONS, generateAvatarUrl, generateCallMonitoringSeed, STAFF_ROLES } from '../constants';

type TableName = 'contacts' | 'deals' | 'users' | 'profiles' | 'products' | 'tasks' | 'reorder-report' | 'call_logs' | 'inquiries' | 'purchases' | 'team_messages' | 'notifications';

interface MockUser {
  id: string;
  email: string;
  user_metadata: {
    full_name?: string;
    avatar_url?: string;
    role?: string;
    birthday?: string;
    mobile?: string;
    access_rights?: string[];
  };
  password?: string;
}

const DB_PREFIX = 'nexus_crm_local_';
const DB_VERSION = '4.0';

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

const seedData = () => {
  const currentVersion = localStorage.getItem(DB_PREFIX + 'version');

  if (currentVersion !== DB_VERSION) {
    localStorage.removeItem(DB_PREFIX + 'contacts');
    localStorage.removeItem(DB_PREFIX + 'deals');
    localStorage.removeItem(DB_PREFIX + 'products');
    localStorage.removeItem(DB_PREFIX + 'reorder-report');
    localStorage.removeItem(DB_PREFIX + 'tasks');
    localStorage.removeItem(DB_PREFIX + 'call_logs');
    localStorage.removeItem(DB_PREFIX + 'inquiries');
    localStorage.removeItem(DB_PREFIX + 'purchases');
    localStorage.removeItem(DB_PREFIX + 'team_messages');
    localStorage.removeItem(DB_PREFIX + 'notifications');
    localStorage.setItem(DB_PREFIX + 'version', DB_VERSION);
  }

  if (!getTable('contacts').length) setTable('contacts', MOCK_CONTACTS);
  if (!getTable('deals').length) setTable('deals', MOCK_PIPELINE_DEALS);
  if (!getTable('products').length) setTable('products', MOCK_PRODUCTS);
  if (!getTable('reorder-report').length) setTable('reorder-report', MOCK_REORDER_REPORT);
  if (!getTable('tasks').length) setTable('tasks', MOCK_TASKS);
  if (!getTable('team_messages').length) setTable('team_messages', MOCK_TEAM_MESSAGES);
  if (!getTable('notifications').length) setTable('notifications', MOCK_NOTIFICATIONS);

  const existingCallLogs = getTable('call_logs');
  const existingInquiries = getTable('inquiries');
  const existingPurchases = getTable('purchases');
  if (!existingCallLogs.length || !existingInquiries.length || !existingPurchases.length) {
    const { callLogs, inquiries, purchases } = generateCallMonitoringSeed();
    if (!existingCallLogs.length) setTable('call_logs', callLogs);
    if (!existingInquiries.length) setTable('inquiries', inquiries);
    if (!existingPurchases.length) setTable('purchases', purchases);
  }

  const users = getTable<MockUser>('users');
  const profiles = getTable<any>('profiles');
  const adminId = 'user_admin_001';
  const adminExists = users.some(u => u.id === adminId);

  if (!adminExists) {
    const adminUser: MockUser = {
      id: adminId,
      email: 'main@tnd-opc.com',
      password: '12345678',
      user_metadata: { full_name: 'James Quek', role: 'Owner', avatar_url: generateAvatarUrl('James Quek', 'main@tnd-opc.com'), access_rights: ['*'] }
    };
    setTable('users', [...users, adminUser]);
    setTable('profiles', [...profiles, {
      id: adminId,
      email: adminUser.email,
      full_name: adminUser.user_metadata.full_name,
      avatar_url: adminUser.user_metadata.avatar_url,
      role: 'Owner',
      access_rights: ['*']
    }]);
  } else {
    const updatedProfiles = profiles.map((p: any) => p.id === adminId ? { ...p, access_rights: ['*'], role: 'Owner' } : p);
    setTable('profiles', updatedProfiles);
  }
};

const ensureSeeded = () => {
  if (typeof window === 'undefined') return;
  seedData();
};

class MockQueryBuilder<T> {
  private filters: Array<(row: any) => boolean> = [];
  private orderConfig: { column: string; ascending: boolean } | null = null;
  private operation: 'select' | 'insert' | 'update' | 'delete' = 'select';
  private payload: any = null;
  private returnSelection = false;
  private singleMode: 'single' | 'maybeSingle' | null = null;

  constructor(private tableName: TableName) {}

  select(_columns?: string) {
    if (this.operation === 'insert' || this.operation === 'update') {
      this.returnSelection = true;
      return this;
    }
    this.operation = 'select';
    return this;
  }

  insert(row: any) {
    this.operation = 'insert';
    this.payload = row;
    return this;
  }

  update(updates: any) {
    this.operation = 'update';
    this.payload = updates;
    return this;
  }

  delete() {
    this.operation = 'delete';
    return this;
  }

  eq(column: string, value: any) {
    this.filters.push(row => row?.[column] === value);
    return this;
  }

  order(column: string, options?: { ascending?: boolean }) {
    this.orderConfig = { column, ascending: options?.ascending !== false };
    return this;
  }

  single() {
    this.singleMode = 'single';
    return this;
  }

  maybeSingle() {
    this.singleMode = 'maybeSingle';
    return this;
  }

  private applyFilters(data: any[]) {
    return this.filters.reduce((rows, filter) => rows.filter(filter), data);
  }

  private applyOrder(data: any[]) {
    if (!this.orderConfig) return data;
    const { column, ascending } = this.orderConfig;
    return [...data].sort((a, b) => {
      const aVal = a?.[column];
      const bVal = b?.[column];
      if (aVal === bVal) return 0;
      if (aVal == null) return ascending ? 1 : -1;
      if (bVal == null) return ascending ? -1 : 1;
      if (typeof aVal === 'number' && typeof bVal === 'number') return ascending ? aVal - bVal : bVal - aVal;
      return ascending ? String(aVal).localeCompare(String(bVal)) : String(bVal).localeCompare(String(aVal));
    });
  }

  private buildReturn(data: any[]) {
    if (this.singleMode === 'single') {
      if (!data.length) return { data: null, error: { message: 'No rows found' } };
      return { data: data[0], error: null };
    }
    if (this.singleMode === 'maybeSingle') {
      return { data: data[0] || null, error: null };
    }
    return { data, error: null };
  }

  private execute() {
    const tableData = getTable<any>(this.tableName);
    if (this.operation === 'select') {
      const filtered = this.applyOrder(this.applyFilters(tableData));
      return this.buildReturn(filtered);
    }

    if (this.operation === 'insert') {
      const rows = Array.isArray(this.payload) ? this.payload : [this.payload];
      const existing = getTable<any>(this.tableName);
      const inserted = rows.map((row) => {
        const id = row.id || Math.random().toString(36).slice(2, 11);
        return { ...row, id };
      });
      setTable(this.tableName, [...existing, ...inserted]);
      inserted.forEach(row => notifyTableInsert(this.tableName, row));
      return this.buildReturn(this.returnSelection || this.singleMode ? inserted : inserted);
    }

    if (this.operation === 'update') {
      const data = this.applyFilters(tableData);
      const ids = data.map(row => row.id);
      const updatedTable = tableData.map((row: any) => ids.includes(row.id) ? { ...row, ...this.payload } : row);
      setTable(this.tableName, updatedTable);
      const updatedRows = updatedTable.filter((row: any) => ids.includes(row.id));
      return this.buildReturn(this.returnSelection || this.singleMode ? updatedRows : ids);
    }

    if (this.operation === 'delete') {
      const data = this.applyFilters(tableData);
      const ids = data.map(row => row.id);
      const remaining = tableData.filter((row: any) => !ids.includes(row.id));
      setTable(this.tableName, remaining);
      return this.buildReturn(ids);
    }

    return { data: null, error: null };
  }

  then(resolve: (value: any) => void, reject?: (reason?: any) => void) {
    try {
      resolve(this.execute());
    } catch (err) {
      reject?.(err);
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

  emit(payload?: any, options?: { eventType?: string }) {
    const incomingEvent = options?.eventType || payload?.eventType || 'INSERT';
    this.handlers.forEach(({ eventType, filter, callback }) => {
      if (eventType === 'postgres_changes') {
        const filterTable = filter?.table;
        const filterEvent = filter?.event || '*';
        if (filterTable && filterTable !== payload?.table) return;
        if (filterEvent !== '*' && filterEvent !== incomingEvent) return;
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

const registerChannelForTable = (table: TableName | string, channel: MockRealtimeChannel) => {
  if (!realtimeTableRegistry.has(table)) realtimeTableRegistry.set(table, new Set());
  realtimeTableRegistry.get(table)?.add(channel);
  channelNameRegistry.set(channel.getName(), channel);
};

const removeChannelFromRegistry = (channel: MockRealtimeChannel) => {
  realtimeTableRegistry.forEach((channels, table) => {
    channels.delete(channel);
    if (channels.size === 0) realtimeTableRegistry.delete(table);
  });
  channelNameRegistry.delete(channel.getName());
};

const notifyTableInsert = (table: TableName, row: any) => {
  const channels = realtimeTableRegistry.get(table);
  if (!channels) return;
  const payload = { eventType: 'INSERT', schema: 'public', table, new: row, old: null };
  channels.forEach((channel) => channel.emit(payload, { eventType: 'INSERT' }));
};

const authSubscribers: Array<(event: string, session: any) => void> = [];

const notifyAuthSubscribers = (event: string, session: any) => {
  authSubscribers.forEach(callback => callback(event, session));
};

const isEmailValid = (email: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
const isPasswordValid = (password: string) => password.length >= 8 && /[A-Za-z]/.test(password) && /\d/.test(password);

const createMockSupabase = () => {
  ensureSeeded();

  return {
    from: (table: TableName) => new MockQueryBuilder(table),
    channel: (name: string) => new MockRealtimeChannel(name),
    removeChannel: async (channel: MockRealtimeChannel) => {
      channel.unsubscribe();
      return { data: null, error: null };
    },
    auth: {
      getSession: async () => {
        const sessionStr = localStorage.getItem(DB_PREFIX + 'session');
        const session = sessionStr ? JSON.parse(sessionStr) : null;
        return { data: { session }, error: null };
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
                const idx = authSubscribers.indexOf(callback);
                if (idx > -1) authSubscribers.splice(idx, 1);
              }
            }
          }
        };
      },
      signUp: async ({ email, password, options }: any) => {
        const users = getTable<MockUser>('users');
        if (users.find(u => u.email === email)) {
          return { data: null, error: { message: 'User already registered' } };
        }
        if (!isEmailValid(email)) {
          return { data: null, error: { message: 'Invalid email address' } };
        }
        if (!isPasswordValid(password)) {
          return { data: null, error: { message: 'Password must be at least 8 characters and include letters and numbers' } };
        }

        const metadata = options?.data || {};
        const role = metadata.role && STAFF_ROLES.includes(metadata.role) ? metadata.role : DEFAULT_STAFF_ROLE;
        const accessRights = metadata.access_rights && metadata.access_rights.length ? metadata.access_rights : DEFAULT_STAFF_ACCESS_RIGHTS;
        const avatar = metadata.avatar_url || generateAvatarUrl(metadata.full_name, email);

        const newUser: MockUser = {
          id: Math.random().toString(36).slice(2, 11),
          email,
          password,
          user_metadata: { ...metadata, role, access_rights: accessRights, avatar_url: avatar }
        };

        setTable('users', [...users, newUser]);

        const profiles = getTable('profiles');
        const profilePayload = {
          id: newUser.id,
          email: newUser.email,
          full_name: metadata.full_name,
          avatar_url: avatar,
          role,
          access_rights: accessRights,
          birthday: metadata.birthday,
          mobile: metadata.mobile
        };
        setTable('profiles', [...profiles, profilePayload]);
        notifyTableInsert('profiles', profilePayload);

        return { data: { user: newUser, session: null }, error: null };
      },
      signInWithPassword: async ({ email, password }: any) => {
        const users = getTable<MockUser>('users');
        const user = users.find(u => u.email === email && u.password === password);
        if (!user) {
          return { data: { session: null }, error: { message: 'Invalid login credentials' } };
        }
        const session = { access_token: 'mock_token_' + Date.now(), user };
        localStorage.setItem(DB_PREFIX + 'session', JSON.stringify(session));
        notifyAuthSubscribers('SIGNED_IN', session);
        return { data: { session, user }, error: null };
      },
      signOut: async () => {
        localStorage.removeItem(DB_PREFIX + 'session');
        notifyAuthSubscribers('SIGNED_OUT', null);
        return { error: null };
      },
      admin: {
        updateUserById: async (userId: string, updates: any) => {
          const users = getTable<MockUser>('users');
          const userIndex = users.findIndex(u => u.id === userId);
          if (userIndex === -1) {
            return { data: null, error: { message: 'User not found' } };
          }
          const updatedUser = { ...users[userIndex], ...updates, user_metadata: { ...users[userIndex].user_metadata, ...updates.user_metadata } };
          if (updates.password) {
            updatedUser.password = updates.password;
          }
          const newUsers = [...users];
          newUsers[userIndex] = updatedUser;
          setTable('users', newUsers);
          return { data: { user: updatedUser }, error: null };
        }
      }
    }
  };
};

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

export const supabase = supabaseUrl && supabaseAnonKey ? createClient(supabaseUrl, supabaseAnonKey) : createMockSupabase();
