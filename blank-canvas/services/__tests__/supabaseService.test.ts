import { describe, expect, it, beforeEach, vi } from 'vitest';
import * as service from '../supabaseService';
import { Contact } from '../../types';

const mocks = vi.hoisted(() => ({
  fromMock: vi.fn()
}));

vi.mock('../../lib/supabaseClient', () => ({
  supabase: {
    from: mocks.fromMock
  }
}));

const { fromMock } = mocks;

describe('supabaseService', () => {
  beforeEach(() => {
    fromMock.mockReset();
  });

  it('fetchContacts returns the rows provided by Supabase', async () => {
    const rows = [{ id: '1', company: 'Acme' } as Contact];
    const select = vi.fn().mockResolvedValue({ data: rows, error: null });
    fromMock.mockReturnValue({ select });

    const result = await service.fetchContacts();

    expect(fromMock).toHaveBeenCalledWith('contacts');
    expect(select).toHaveBeenCalledWith('*');
    expect(result).toEqual(rows);
  });

  it('fetchContacts logs the error and resolves to an empty array', async () => {
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    const select = vi.fn().mockResolvedValue({ data: null, error: { message: 'boom' } });
    fromMock.mockReturnValue({ select });

    const result = await service.fetchContacts();

    expect(result).toEqual([]);
    expect(consoleSpy).toHaveBeenCalled();
    consoleSpy.mockRestore();
  });

  it('updateContact forwards updates to Supabase', async () => {
    const eq = vi.fn().mockResolvedValue({ data: null, error: null });
    const update = vi.fn().mockReturnValue({ eq });
    fromMock.mockReturnValue({ update });

    await service.updateContact('contact-1', { company: 'Updated Co.' } as Partial<Contact>);

    expect(fromMock).toHaveBeenCalledWith('contacts');
    expect(update).toHaveBeenCalledWith({ company: 'Updated Co.' });
    expect(eq).toHaveBeenCalledWith('id', 'contact-1');
  });

  it('bulkUpdateContacts updates each id sequentially', async () => {
    const eq = vi.fn().mockResolvedValue({ data: null, error: null });
    const update = vi.fn().mockReturnValue({ eq });
    fromMock.mockReturnValue({ update });

    await service.bulkUpdateContacts(['a', 'b'], { status: 'Active' } as Partial<Contact>);

    expect(fromMock).toHaveBeenCalledTimes(2);
    expect(update).toHaveBeenCalledTimes(2);
    expect(eq).toHaveBeenCalledTimes(2);
    expect(eq.mock.calls.map(([, value]) => value)).toEqual(['a', 'b']);
  });
});
