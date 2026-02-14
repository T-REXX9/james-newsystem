import { describe, expect, it, beforeEach, vi, afterEach } from 'vitest';
import { DEFAULT_STAFF_ACCESS_RIGHTS, DEFAULT_STAFF_ROLE } from '../../constants';

// Mock the supabase client
const mockSupabase = {
  auth: {
    signUp: vi.fn(),
  },
  functions: {
    invoke: vi.fn(),
  },
  from: vi.fn(() => ({
    select: vi.fn(() => ({
      eq: vi.fn(() => ({
        maybeSingle: vi.fn(),
      })),
      maybeSingle: vi.fn(),
    })),
    insert: vi.fn(() => ({
      select: vi.fn(() => ({
        maybeSingle: vi.fn(),
      })),
    })),
  })),
};

vi.mock('../../lib/supabaseClient', () => ({
  supabase: mockSupabase,
}));

describe('supabaseService createStaffAccount', () => {
  let consoleErrorSpy: ReturnType<typeof vi.spyOn>;
  let consoleWarnSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    vi.clearAllMocks();
    consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    consoleWarnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
  });

  afterEach(() => {
    consoleErrorSpy.mockRestore();
    consoleWarnSpy.mockRestore();
    vi.restoreAllMocks();
  });

  it('creates a staff account with default role and access rights', async () => {
    const userId = 'test-user-id';
    const profileData = {
      id: userId,
      email: 'new.agent@example.com',
      full_name: 'New Agent',
      role: DEFAULT_STAFF_ROLE,
      access_rights: DEFAULT_STAFF_ACCESS_RIGHTS,
    };

    mockSupabase.auth.signUp.mockResolvedValue({
      data: { user: { id: userId } },
      error: null,
    });

    const maybeSingleMock = vi.fn().mockResolvedValue({ data: profileData, error: null });
    mockSupabase.from.mockReturnValue({
      select: vi.fn(() => ({
        eq: vi.fn(() => ({
          maybeSingle: maybeSingleMock,
        })),
      })),
      insert: vi.fn(() => ({
        select: vi.fn(() => ({
          maybeSingle: vi.fn().mockResolvedValue({ data: profileData, error: null }),
        })),
      })),
    });

    const { createStaffAccount } = await import('../supabaseService');
    const result = await createStaffAccount({
      email: 'new.agent@example.com',
      password: 'Password1',
      fullName: 'New Agent',
    });

    expect(result.success).toBe(true);
    expect(result.userId).toBe(userId);
    expect(mockSupabase.auth.signUp).toHaveBeenCalled();
  });

  it('creates a staff account with optional fields and custom role', async () => {
    const userId = 'test-manager-id';
    const payload = {
      email: 'manager@example.com',
      password: 'StrongPass1!',
      fullName: 'Manager Example',
      birthday: '1990-01-01',
      mobile: '09171234567',
      role: 'Manager',
      accessRights: ['dashboard', 'tasks'],
    };

    const profileData = {
      id: userId,
      email: payload.email,
      full_name: payload.fullName,
      role: payload.role,
      access_rights: payload.accessRights,
      birthday: payload.birthday,
      mobile: payload.mobile,
    };

    mockSupabase.auth.signUp.mockResolvedValue({
      data: { user: { id: userId } },
      error: null,
    });

    mockSupabase.from.mockReturnValue({
      select: vi.fn(() => ({
        eq: vi.fn(() => ({
          maybeSingle: vi.fn().mockResolvedValue({ data: profileData, error: null }),
        })),
      })),
      insert: vi.fn(() => ({
        select: vi.fn(() => ({
          maybeSingle: vi.fn().mockResolvedValue({ data: profileData, error: null }),
        })),
      })),
    });

    const { createStaffAccount } = await import('../supabaseService');
    const result = await createStaffAccount(payload);

    expect(result.success).toBe(true);
    expect(result.userId).toBe(userId);
    expect(mockSupabase.auth.signUp).toHaveBeenCalled();
  });

  it('rejects invalid email format', async () => {
    const { createStaffAccount } = await import('../supabaseService');
    const result = await createStaffAccount({
      email: 'invalid-email',
      password: 'Password1',
      fullName: 'Bad Email'
    });

    expect(result.success).toBe(false);
    expect(result.validationErrors?.email).toBeDefined();
    expect(mockSupabase.auth.signUp).not.toHaveBeenCalled();
  });

  it('rejects weak password', async () => {
    const { createStaffAccount } = await import('../supabaseService');
    const result = await createStaffAccount({
      email: 'weak@example.com',
      password: 'weak',
      fullName: 'Weak Password'
    });
    expect(result.success).toBe(false);
    expect(result.validationErrors?.password).toBeDefined();
  });

  it('rejects invalid role selection', async () => {
    const { createStaffAccount } = await import('../supabaseService');
    const result = await createStaffAccount({
      email: 'role@example.com',
      password: 'Password1',
      fullName: 'Role Test',
      role: 'NotARole'
    });
    expect(result.success).toBe(false);
    expect(result.validationErrors?.role).toBe('Invalid role');
  });

  it('surface auth errors from Supabase signUp', async () => {
    mockSupabase.auth.signUp.mockResolvedValue({
      data: null,
      error: { message: 'User already registered' }
    } as any);

    const { createStaffAccount } = await import('../supabaseService');
    const result = await createStaffAccount({
      email: 'existing@example.com',
      password: 'Password1',
      fullName: 'Duplicate'
    });

    expect(mockSupabase.auth.signUp).toHaveBeenCalled();
    expect(result.success).toBe(false);
    expect(result.error).toMatch(/account with this email/i);
  });

  it('falls back to manual profile creation when trigger did not run', async () => {
    const userId = 'manual-profile-user';
    const profileData = {
      id: userId,
      email: 'manual@example.com',
      full_name: 'Manual Profile',
      role: DEFAULT_STAFF_ROLE,
      access_rights: DEFAULT_STAFF_ACCESS_RIGHTS,
    };

    mockSupabase.auth.signUp.mockResolvedValue({
      data: { user: { id: userId } },
      error: null
    } as any);

    // First call returns null (trigger didn't run), second call returns the profile
    const maybeSingleMock = vi.fn()
      .mockResolvedValueOnce({ data: null, error: null })
      .mockResolvedValueOnce({ data: profileData, error: null });

    mockSupabase.from.mockReturnValue({
      select: vi.fn(() => ({
        eq: vi.fn(() => ({
          maybeSingle: maybeSingleMock,
        })),
      })),
      insert: vi.fn(() => ({
        select: vi.fn(() => ({
          maybeSingle: vi.fn().mockResolvedValue({ data: profileData, error: null })
        })),
      })),
    });

    const { createStaffAccount } = await import('../supabaseService');
    const result = await createStaffAccount({
      email: 'manual@example.com',
      password: 'Password1',
      fullName: 'Manual Profile',
    });

    expect(result.success).toBe(true);
    expect(result.userId).toBe(userId);
    expect(mockSupabase.from).toHaveBeenCalledWith('profiles');
  });
});

describe('supabaseService resetStaffPassword', () => {
  let consoleErrorSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    vi.clearAllMocks();
    consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    consoleErrorSpy.mockRestore();
    vi.restoreAllMocks();
  });

  it('calls the reset-staff-password edge function and returns true on success', async () => {
    mockSupabase.functions.invoke.mockResolvedValue({
      data: { success: true },
      error: null,
    });

    const { resetStaffPassword } = await import('../supabaseService');
    const result = await resetStaffPassword('user-123', 'StrongPass1!');

    expect(mockSupabase.functions.invoke).toHaveBeenCalledWith('reset-staff-password', {
      body: { userId: 'user-123', newPassword: 'StrongPass1!' },
    });
    expect(result).toBe(true);
  });

  it('returns false when the edge function reports an error', async () => {
    mockSupabase.functions.invoke.mockResolvedValue({
      data: null,
      error: { message: 'Forbidden' },
    });

    const { resetStaffPassword } = await import('../supabaseService');
    const result = await resetStaffPassword('user-123', 'StrongPass1!');

    expect(result).toBe(false);
  });
});
