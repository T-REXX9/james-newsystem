import { describe, expect, it, beforeEach, vi, afterEach } from 'vitest';
import { DEFAULT_STAFF_ACCESS_RIGHTS, DEFAULT_STAFF_ROLE, STAFF_ROLES } from '../../constants';
import { CreateStaffAccountResult } from '../../types';

const getServices = async () => import('../supabaseService');
const getSupabase = async () => import('../../lib/supabaseClient');

describe('supabaseService createStaffAccount', () => {
  let supabaseModule: Awaited<ReturnType<typeof getSupabase>>;

  beforeEach(async () => {
    localStorage.clear();
    vi.resetModules();
    supabaseModule = await getSupabase();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('creates a staff account with default role and access rights', async () => {
    const service = await getServices();
    const result = await service.createStaffAccount({
      email: 'new.agent@example.com',
      password: 'Password1',
      fullName: 'New Agent'
    });

    expect(result.success).toBe(true);
    expect(result.userId).toBeTruthy();
    const { data } = await supabaseModule.supabase.from('profiles').select('*').eq('id', result.userId).maybeSingle();
    expect(data?.role).toBe(DEFAULT_STAFF_ROLE);
    expect(data?.access_rights).toEqual(DEFAULT_STAFF_ACCESS_RIGHTS);
  });

  it('creates a staff account with optional fields and custom role', async () => {
    const service = await getServices();
    const payload = {
      email: 'manager@example.com',
      password: 'StrongPass1!',
      fullName: 'Manager Example',
      birthday: '1990-01-01',
      mobile: '09171234567',
      role: 'Manager',
      accessRights: ['dashboard', 'tasks']
    };

    const result = await service.createStaffAccount(payload);
    expect(result.success).toBe(true);
    const { data } = await supabaseModule.supabase.from('profiles').select('*').eq('id', result.userId).maybeSingle();
    expect(data?.role).toBe(payload.role);
    expect(data?.birthday).toBe(payload.birthday);
    expect(data?.mobile).toBe(payload.mobile);
    expect(data?.access_rights).toEqual(payload.accessRights);
  });

  it('rejects invalid email format', async () => {
    const service = await getServices();
    const signUpSpy = vi.spyOn(supabaseModule.supabase.auth, 'signUp');
    const result = await service.createStaffAccount({ email: 'invalid-email', password: 'Password1', fullName: 'Bad Email' });

    expect(result.success).toBe(false);
    expect(result.validationErrors?.email).toBeDefined();
    expect(signUpSpy).not.toHaveBeenCalled();
  });

  it('rejects weak password', async () => {
    const service = await getServices();
    const result = await service.createStaffAccount({ email: 'weak@example.com', password: 'weak', fullName: 'Weak Password' });
    expect(result.success).toBe(false);
    expect(result.validationErrors?.password).toBeDefined();
  });

  it('rejects invalid role selection', async () => {
    const service = await getServices();
    const result = await service.createStaffAccount({ email: 'role@example.com', password: 'Password1', fullName: 'Role Test', role: 'NotARole' });
    expect(result.success).toBe(false);
    expect(result.validationErrors?.role).toBe('Invalid role');
  });

  it('surface auth errors from Supabase signUp', async () => {
    const service = await getServices();
    const signUpSpy = vi.spyOn(supabaseModule.supabase.auth, 'signUp').mockResolvedValue({ data: null, error: { message: 'User already registered' } } as any);
    const result = await service.createStaffAccount({ email: 'existing@example.com', password: 'Password1', fullName: 'Duplicate' });

    expect(signUpSpy).toHaveBeenCalled();
    expect(result.success).toBe(false);
    expect(result.error).toMatch(/account with this email/i);
  });

  it('falls back to manual profile creation when trigger did not run', async () => {
    const service = await getServices();
    const profileStore: any[] = [];
    const originalFrom = supabaseModule.supabase.from.bind(supabaseModule.supabase);

    vi.spyOn(supabaseModule.supabase.auth, 'signUp').mockResolvedValue({ data: { user: { id: 'manual-profile-user' } }, error: null } as any);
    vi.spyOn(supabaseModule.supabase, 'from').mockImplementation((table: any) => {
      if (table !== 'profiles') return originalFrom(table);
      return {
        select: () => ({
          eq: () => ({
            maybeSingle: vi.fn(async () => ({ data: profileStore[0] || null, error: null }))
          }),
          maybeSingle: vi.fn(async () => ({ data: profileStore[0] || null, error: null }))
        }),
        insert: (payload: any) => {
          const row = Array.isArray(payload) ? payload[0] : payload;
          profileStore[0] = row;
          return {
            select: () => ({
              maybeSingle: vi.fn(async () => ({ data: row, error: null }))
            })
          };
        }
      };
    });

    const result: CreateStaffAccountResult = await service.createStaffAccount({
      email: 'manual@example.com',
      password: 'Password1',
      fullName: 'Manual Profile',
      role: STAFF_ROLES[0]
    });

    expect(result.success).toBe(true);
    expect(profileStore[0]).toBeDefined();
    expect(profileStore[0].email).toBe('manual@example.com');
  });
});
