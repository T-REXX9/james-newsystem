import { describe, expect, it, vi, afterEach, beforeEach } from 'vitest';

vi.mock('@supabase/supabase-js', () => ({
  createClient: vi.fn(() => ({ client: true }))
}));

const { createClient } = await import('@supabase/supabase-js');

beforeEach(() => {
  localStorage.clear();
});

afterEach(() => {
  vi.resetModules();
  vi.unstubAllEnvs();
  vi.clearAllMocks();
});

describe('supabaseClient', () => {
  it('creates a real client when env vars are present', async () => {
    vi.stubEnv('VITE_SUPABASE_URL', 'https://example.supabase.co');
    vi.stubEnv('VITE_SUPABASE_ANON_KEY', 'anon-key');

    const module = await import('./supabaseClient');

    expect(createClient).toHaveBeenCalledWith('https://example.supabase.co', 'anon-key');
    expect(module.supabase).toBeTruthy();
  });

  it('falls back to mock client when env vars are missing', async () => {
    vi.stubEnv('VITE_SUPABASE_URL', '');
    vi.stubEnv('VITE_SUPABASE_ANON_KEY', '');

    const module = await import('./supabaseClient');
    expect(createClient).not.toHaveBeenCalled();

    const { data } = await module.supabase.from('contacts').select('*');
    expect(Array.isArray(data)).toBe(true);
  });
});
