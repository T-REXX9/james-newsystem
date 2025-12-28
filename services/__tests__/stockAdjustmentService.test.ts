import { describe, expect, it, beforeEach, vi, afterEach } from 'vitest';

// Mock the supabase client
const mockSupabase = {
    auth: {
        getUser: vi.fn(),
    },
    from: vi.fn(),
};

vi.mock('../../lib/supabaseClient', () => ({
    supabase: mockSupabase,
}));

describe('stockAdjustmentService', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    afterEach(() => {
        vi.restoreAllMocks();
    });

    describe('createStockAdjustment', () => {
        it('successfully creates a stock adjustment with valid data', async () => {
            const userId = 'user-123';
            const adjustmentData = {
                adjustment_no: 'SA-001',
                adjustment_date: '2024-01-01',
                warehouse_id: 'WH1',
                adjustment_type: 'physical_count' as const,
                notes: 'Annual inventory count',
                items: [
                    {
                        item_id: 'item-1',
                        system_qty: 10,
                        physical_qty: 15,
                        reason: 'Found extra items',
                    },
                    {
                        item_id: 'item-2',
                        system_qty: 20,
                        physical_qty: 18,
                        reason: 'Missing items',
                    },
                ],
            };

            const mockCreatedAdjustment = {
                id: 'adj-123',
                adjustment_no: 'SA-001',
                adjustment_date: '2024-01-01',
                warehouse_id: 'WH1',
                adjustment_type: 'physical_count',
                notes: 'Annual inventory count',
                status: 'draft',
                processed_by: null,
                is_deleted: false,
            };

            const mockAdjustmentWithItems = {
                ...mockCreatedAdjustment,
                stock_adjustment_items: [
                    {
                        id: 'sai-1',
                        adjustment_id: 'adj-123',
                        item_id: 'item-1',
                        system_qty: 10,
                        physical_qty: 15,
                        difference: 5, // Calculated: 15 - 10
                        reason: 'Found extra items',
                    },
                    {
                        id: 'sai-2',
                        adjustment_id: 'adj-123',
                        item_id: 'item-2',
                        system_qty: 20,
                        physical_qty: 18,
                        difference: -2, // Calculated: 18 - 20
                        reason: 'Missing items',
                    },
                ],
            };

            // Mock auth user
            mockSupabase.auth.getUser.mockResolvedValue({
                data: { user: { id: userId } },
                error: null,
            });

            const mockSelect = vi.fn();
            const mockEq = vi.fn();
            const mockSingle = vi.fn();
            const mockInsert = vi.fn();
            const mockDelete = vi.fn();

            mockSupabase.from.mockImplementation((table) => {
                if (table === 'stock_adjustments') {
                    return {
                        insert: mockInsert,
                        select: () => ({ single: mockSingle }),
                        delete: () => ({ eq: mockDelete }),
                        eq: mockEq,
                    };
                }
                if (table === 'stock_adjustment_items') {
                    return {
                        insert: mockInsert,
                        delete: () => ({ eq: mockDelete }),
                    };
                }
                return { select: mockSelect };
            });

            // First insert: create adjustment
            mockInsert.mockResolvedValueOnce({
                data: mockCreatedAdjustment,
                error: null,
            });

            // Second insert: create items
            mockInsert.mockResolvedValueOnce({
                error: null,
            });

            // getStockAdjustment call
            mockEq.mockResolvedValue({
                data: mockAdjustmentWithItems,
                error: null,
            });

            const { createStockAdjustment } = await import('../stockAdjustmentService');
            const result = await createStockAdjustment(adjustmentData);

            expect(result).toEqual(mockAdjustmentWithItems);
            expect(mockInsert).toHaveBeenCalledTimes(2);
            expect((result as any).stock_adjustment_items[0].difference).toBe(5);
            expect((result as any).stock_adjustment_items[1].difference).toBe(-2);
        });

        it('throws error when user is not authenticated', async () => {
            const adjustmentData = {
                adjustment_no: 'SA-001',
                adjustment_date: '2024-01-01',
                warehouse_id: 'WH1',
                adjustment_type: 'physical_count' as const,
                notes: 'Annual inventory count',
                items: [],
            };

            mockSupabase.auth.getUser.mockResolvedValue({
                data: { user: null },
                error: { message: 'Not authenticated' },
            });

            const { createStockAdjustment } = await import('../stockAdjustmentService');

            await expect(createStockAdjustment(adjustmentData)).rejects.toThrow('User not authenticated');
        });

        it('rolls back adjustment creation when items insertion fails', async () => {
            const userId = 'user-123';
            const adjustmentData = {
                adjustment_no: 'SA-001',
                adjustment_date: '2024-01-01',
                warehouse_id: 'WH1',
                adjustment_type: 'physical_count' as const,
                notes: 'Annual inventory count',
                items: [
                    {
                        item_id: 'item-1',
                        system_qty: 10,
                        physical_qty: 15,
                        reason: 'Found extra items',
                    },
                ],
            };

            const mockCreatedAdjustment = {
                id: 'adj-123',
                adjustment_no: 'SA-001',
                adjustment_date: '2024-01-01',
                warehouse_id: 'WH1',
                adjustment_type: 'physical_count',
                notes: 'Annual inventory count',
                status: 'draft',
                processed_by: null,
                is_deleted: false,
            };

            mockSupabase.auth.getUser.mockResolvedValue({
                data: { user: { id: userId } },
                error: null,
            });

            const mockEq = vi.fn();
            const mockInsert = vi.fn();
            const mockDelete = vi.fn();

            mockSupabase.from.mockImplementation((table) => {
                if (table === 'stock_adjustments') {
                    return {
                        insert: mockInsert,
                        delete: () => ({ eq: mockDelete }),
                    };
                }
                if (table === 'stock_adjustment_items') {
                    return {
                        insert: mockInsert,
                    };
                }
                return { eq: mockEq };
            });

            // First insert: create adjustment (success)
            mockInsert.mockResolvedValueOnce({
                data: mockCreatedAdjustment,
                error: null,
            });

            // Second insert: create items (failure)
            mockInsert.mockResolvedValueOnce({
                error: { message: 'Failed to insert items' },
            });

            // Delete for rollback
            mockDelete.mockResolvedValue({ error: null });

            const { createStockAdjustment } = await import('../stockAdjustmentService');

            await expect(createStockAdjustment(adjustmentData)).rejects.toThrow('Failed to insert items');
            expect(mockDelete).toHaveBeenCalled(); // Verify rollback
        });
    });

    describe('getStockAdjustment', () => {
        it('successfully retrieves a stock adjustment by ID', async () => {
            const adjustmentId = 'adj-123';

            const mockAdjustment = {
                id: adjustmentId,
                adjustment_no: 'SA-001',
                adjustment_date: '2024-01-01',
                warehouse_id: 'WH1',
                adjustment_type: 'physical_count',
                notes: 'Annual inventory count',
                status: 'draft',
                processed_by: null,
                is_deleted: false,
                stock_adjustment_items: [
                    {
                        id: 'sai-1',
                        adjustment_id: adjustmentId,
                        item_id: 'item-1',
                        system_qty: 10,
                        physical_qty: 15,
                        difference: 5,
                        reason: 'Found extra items',
                    },
                ],
            };

            const mockEq = vi.fn();
            const mockSingle = vi.fn();

            mockSupabase.from.mockImplementation((table) => {
                if (table === 'stock_adjustments') {
                    return {
                        select: () => ({
                            eq: mockEq,
                        }),
                    };
                }
                return {};
            });

            mockEq.mockReturnValue({ single: mockSingle });
            mockSingle.mockResolvedValue({ data: mockAdjustment, error: null });

            const { getStockAdjustment } = await import('../stockAdjustmentService');
            const result = await getStockAdjustment(adjustmentId);

            expect(result).toEqual(mockAdjustment);
            expect(mockEq).toHaveBeenCalledWith('id', adjustmentId);
            expect(mockEq).toHaveBeenCalledWith('is_deleted', false);
        });

        it('returns null when stock adjustment not found', async () => {
            const adjustmentId = 'adj-123';

            const mockEq = vi.fn();
            const mockSingle = vi.fn();

            mockSupabase.from.mockImplementation((table) => {
                if (table === 'stock_adjustments') {
                    return {
                        select: () => ({
                            eq: mockEq,
                        }),
                    };
                }
                return {};
            });

            mockEq.mockReturnValue({ single: mockSingle });
            mockSingle.mockResolvedValue({ data: null, error: { message: 'Not found' } });

            const { getStockAdjustment } = await import('../stockAdjustmentService');
            const result = await getStockAdjustment(adjustmentId);

            expect(result).toBeNull();
        });
    });

    describe('finalizeAdjustment', () => {
        it('successfully finalizes a draft adjustment and creates inventory logs', async () => {
            const adjustmentId = 'adj-123';
            const userId = 'user-123';

            const existingAdjustment = {
                id: adjustmentId,
                adjustment_no: 'SA-001',
                adjustment_date: '2024-01-01',
                warehouse_id: 'WH1',
                adjustment_type: 'physical_count',
                notes: 'Annual inventory count',
                status: 'draft', // Draft status - can be finalized
                processed_by: null,
                is_deleted: false,
                stock_adjustment_items: [
                    {
                        id: 'sai-1',
                        item_id: 'item-1',
                        system_qty: 10,
                        physical_qty: 15,
                        difference: 5,
                        reason: 'Found extra items',
                    },
                ],
            };

            const mockFinalizedAdjustment = {
                ...existingAdjustment,
                status: 'finalized',
                processed_by: userId,
                updated_at: expect.any(String),
            };

            mockSupabase.auth.getUser.mockResolvedValue({
                data: { user: { id: userId } },
                error: null,
            });

            const mockEq = vi.fn();
            const mockSingle = vi.fn();
            const mockSelect = vi.fn();

            mockSupabase.from.mockImplementation((table) => {
                if (table === 'stock_adjustments') {
                    return {
                        select: () => ({
                            eq: mockEq,
                        }),
                        update: () => ({
                            eq: mockEq,
                            select: () => ({ single: mockSingle }),
                        }),
                        eq: mockEq,
                    };
                }
                return { select: mockSelect };
            });

            // getStockAdjustment call
            mockEq.mockImplementation((field, value) => {
                if (field === 'id' && value === adjustmentId) {
                    return { eq: () => ({ single: () => Promise.resolve({ data: existingAdjustment, error: null }) }) };
                }
                if (field === 'is_deleted') {
                    return { single: () => Promise.resolve({ data: existingAdjustment, error: null }) };
                }
                return { single: () => Promise.resolve({ data: null, error: null }) };
            });

            // update call
            mockEq.mockResolvedValue({ data: mockFinalizedAdjustment, error: null });
            mockSingle.mockResolvedValue({ data: mockFinalizedAdjustment, error: null });

            // getStockAdjustment after update
            mockEq.mockResolvedValue({ data: mockFinalizedAdjustment, error: null });

            const { finalizeAdjustment } = await import('../stockAdjustmentService');
            const result = await finalizeAdjustment(adjustmentId);

            expect(result.status).toBe('finalized');
            expect(result.processed_by).toBe(userId);
        });

        it('throws error when adjustment status is not draft', async () => {
            const adjustmentId = 'adj-123';

            const existingAdjustment = {
                id: adjustmentId,
                adjustment_no: 'SA-001',
                adjustment_date: '2024-01-01',
                warehouse_id: 'WH1',
                adjustment_type: 'physical_count',
                notes: 'Annual inventory count',
                status: 'finalized', // Already finalized - cannot be finalized again
                processed_by: 'user-456',
                is_deleted: false,
                stock_adjustment_items: [],
            };

            const mockEq = vi.fn();

            mockSupabase.from.mockImplementation((table) => {
                if (table === 'stock_adjustments') {
                    return {
                        select: () => ({
                            eq: mockEq,
                        }),
                    };
                }
                return {};
            });

            mockEq.mockImplementation((field, value) => {
                if (field === 'id' && value === adjustmentId) {
                    return { eq: () => ({ single: () => Promise.resolve({ data: existingAdjustment, error: null }) }) };
                }
                if (field === 'is_deleted') {
                    return { single: () => Promise.resolve({ data: existingAdjustment, error: null }) };
                }
                return { single: () => Promise.resolve({ data: null, error: null }) };
            });

            const { finalizeAdjustment } = await import('../stockAdjustmentService');

            await expect(finalizeAdjustment(adjustmentId)).rejects.toThrow(
                'Only draft stock adjustments can be finalized'
            );
        });

        it('throws error when user is not authenticated', async () => {
            const adjustmentId = 'adj-123';

            const existingAdjustment = {
                id: adjustmentId,
                adjustment_no: 'SA-001',
                adjustment_date: '2024-01-01',
                warehouse_id: 'WH1',
                adjustment_type: 'physical_count',
                notes: 'Annual inventory count',
                status: 'draft',
                processed_by: null,
                is_deleted: false,
                stock_adjustment_items: [],
            };

            mockSupabase.auth.getUser.mockResolvedValue({
                data: { user: null },
                error: { message: 'Not authenticated' },
            });

            const mockEq = vi.fn();

            mockSupabase.from.mockImplementation((table) => {
                if (table === 'stock_adjustments') {
                    return {
                        select: () => ({
                            eq: mockEq,
                        }),
                    };
                }
                return {};
            });

            mockEq.mockImplementation((field, value) => {
                if (field === 'id' && value === adjustmentId) {
                    return { eq: () => ({ single: () => Promise.resolve({ data: existingAdjustment, error: null }) }) };
                }
                if (field === 'is_deleted') {
                    return { single: () => Promise.resolve({ data: existingAdjustment, error: null }) };
                }
                return { single: () => Promise.resolve({ data: null, error: null }) };
            });

            const { finalizeAdjustment } = await import('../stockAdjustmentService');

            await expect(finalizeAdjustment(adjustmentId)).rejects.toThrow('User not authenticated');
        });
    });

    describe('getAllStockAdjustments', () => {
        it('successfully retrieves all stock adjustments without filters', async () => {
            const mockAdjustments = [
                {
                    id: 'adj-1',
                    adjustment_no: 'SA-001',
                    adjustment_date: '2024-01-01',
                    warehouse_id: 'WH1',
                    adjustment_type: 'physical_count',
                    notes: 'Annual count',
                    status: 'draft',
                    processed_by: null,
                    is_deleted: false,
                    stock_adjustment_items: [],
                },
                {
                    id: 'adj-2',
                    adjustment_no: 'SA-002',
                    adjustment_date: '2024-01-02',
                    warehouse_id: 'WH2',
                    adjustment_type: 'damage',
                    notes: 'Damaged items',
                    status: 'finalized',
                    processed_by: 'user-123',
                    is_deleted: false,
                    stock_adjustment_items: [],
                },
            ];

            const mockOrder = vi.fn();

            mockSupabase.from.mockImplementation((table) => {
                if (table === 'stock_adjustments') {
                    return {
                        select: () => ({
                            eq: vi.fn(),
                            order: mockOrder,
                        }),
                    };
                }
                return {};
            });

            mockOrder.mockResolvedValue({ data: mockAdjustments, error: null });

            const { getAllStockAdjustments } = await import('../stockAdjustmentService');
            const result = await getAllStockAdjustments();

            expect(result).toEqual(mockAdjustments);
            expect(result).toHaveLength(2);
        });

        it('successfully retrieves stock adjustments with warehouse filter', async () => {
            const mockAdjustments = [
                {
                    id: 'adj-1',
                    adjustment_no: 'SA-001',
                    adjustment_date: '2024-01-01',
                    warehouse_id: 'WH1', // Filtered warehouse
                    adjustment_type: 'physical_count',
                    notes: 'Annual count',
                    status: 'draft',
                    processed_by: null,
                    is_deleted: false,
                    stock_adjustment_items: [],
                },
            ];

            const mockEq = vi.fn();
            const mockOrder = vi.fn();

            mockSupabase.from.mockImplementation((table) => {
                if (table === 'stock_adjustments') {
                    return {
                        select: () => ({
                            eq: mockEq,
                            order: mockOrder,
                        }),
                    };
                }
                return {};
            });

            mockEq.mockReturnValue({ order: mockOrder });
            mockOrder.mockResolvedValue({ data: mockAdjustments, error: null });

            const { getAllStockAdjustments } = await import('../stockAdjustmentService');
            const result = await getAllStockAdjustments({ warehouseId: 'WH1' });

            expect(result).toEqual(mockAdjustments);
            expect(result).toHaveLength(1);
            expect(result[0].warehouse_id).toBe('WH1');
        });

        it('handles empty results', async () => {
            const mockOrder = vi.fn();

            mockSupabase.from.mockImplementation((table) => {
                if (table === 'stock_adjustments') {
                    return {
                        select: () => ({
                            eq: vi.fn(),
                            order: mockOrder,
                        }),
                    };
                }
                return {};
            });

            mockOrder.mockResolvedValue({ data: null, error: null });

            const { getAllStockAdjustments } = await import('../stockAdjustmentService');
            const result = await getAllStockAdjustments();

            expect(result).toEqual([]);
        });

        it('throws error when database query fails', async () => {
            const mockOrder = vi.fn();

            mockSupabase.from.mockImplementation((table) => {
                if (table === 'stock_adjustments') {
                    return {
                        select: () => ({
                            eq: vi.fn(),
                            order: mockOrder,
                        }),
                    };
                }
                return {};
            });

            mockOrder.mockResolvedValue({ data: null, error: { message: 'Database error' } });

            const { getAllStockAdjustments } = await import('../stockAdjustmentService');

            await expect(getAllStockAdjustments()).rejects.toThrow('Database error');
        });
    });

    describe('difference calculation', () => {
        it('correctly calculates positive differences', async () => {
            const userId = 'user-123';
            const adjustmentData = {
                adjustment_no: 'SA-001',
                adjustment_date: '2024-01-01',
                warehouse_id: 'WH1',
                adjustment_type: 'physical_count' as const,
                notes: 'Annual inventory count',
                items: [
                    {
                        item_id: 'item-1',
                        system_qty: 10,
                        physical_qty: 15,
                        reason: 'Found extra items',
                    },
                ],
            };

            const mockCreatedAdjustment = {
                id: 'adj-123',
                adjustment_no: 'SA-001',
                adjustment_date: '2024-01-01',
                warehouse_id: 'WH1',
                adjustment_type: 'physical_count',
                notes: 'Annual inventory count',
                status: 'draft',
                processed_by: null,
                is_deleted: false,
            };

            const mockAdjustmentWithItems = {
                ...mockCreatedAdjustment,
                stock_adjustment_items: [
                    {
                        id: 'sai-1',
                        adjustment_id: 'adj-123',
                        item_id: 'item-1',
                        system_qty: 10,
                        physical_qty: 15,
                        difference: 5, // Positive: physical > system
                        reason: 'Found extra items',
                    },
                ],
            };

            mockSupabase.auth.getUser.mockResolvedValue({
                data: { user: { id: userId } },
                error: null,
            });

            const mockEq = vi.fn();
            const mockInsert = vi.fn();
            const mockDelete = vi.fn();

            mockSupabase.from.mockImplementation((table) => {
                if (table === 'stock_adjustments') {
                    return {
                        insert: mockInsert,
                        delete: () => ({ eq: mockDelete }),
                        eq: mockEq,
                    };
                }
                if (table === 'stock_adjustment_items') {
                    return {
                        insert: mockInsert,
                    };
                }
                return {};
            });

            mockInsert.mockResolvedValueOnce({
                data: mockCreatedAdjustment,
                error: null,
            });

            mockInsert.mockResolvedValueOnce({
                error: null,
            });

            mockEq.mockResolvedValue({
                data: mockAdjustmentWithItems,
                error: null,
            });

            const { createStockAdjustment } = await import('../stockAdjustmentService');
            const result = await createStockAdjustment(adjustmentData);

            expect((result as any).stock_adjustment_items[0].difference).toBe(5);
            expect((result as any).stock_adjustment_items[0].difference).toBeGreaterThan(0);
        });

        it('correctly calculates negative differences', async () => {
            const userId = 'user-123';
            const adjustmentData = {
                adjustment_no: 'SA-001',
                adjustment_date: '2024-01-01',
                warehouse_id: 'WH1',
                adjustment_type: 'physical_count' as const,
                notes: 'Annual inventory count',
                items: [
                    {
                        item_id: 'item-1',
                        system_qty: 20,
                        physical_qty: 15,
                        reason: 'Missing items',
                    },
                ],
            };

            const mockCreatedAdjustment = {
                id: 'adj-123',
                adjustment_no: 'SA-001',
                adjustment_date: '2024-01-01',
                warehouse_id: 'WH1',
                adjustment_type: 'physical_count',
                notes: 'Annual inventory count',
                status: 'draft',
                processed_by: null,
                is_deleted: false,
            };

            const mockAdjustmentWithItems = {
                ...mockCreatedAdjustment,
                stock_adjustment_items: [
                    {
                        id: 'sai-1',
                        adjustment_id: 'adj-123',
                        item_id: 'item-1',
                        system_qty: 20,
                        physical_qty: 15,
                        difference: -5, // Negative: physical < system
                        reason: 'Missing items',
                    },
                ],
            };

            mockSupabase.auth.getUser.mockResolvedValue({
                data: { user: { id: userId } },
                error: null,
            });

            const mockEq = vi.fn();
            const mockInsert = vi.fn();
            const mockDelete = vi.fn();

            mockSupabase.from.mockImplementation((table) => {
                if (table === 'stock_adjustments') {
                    return {
                        insert: mockInsert,
                        delete: () => ({ eq: mockDelete }),
                        eq: mockEq,
                    };
                }
                if (table === 'stock_adjustment_items') {
                    return {
                        insert: mockInsert,
                    };
                }
                return {};
            });

            mockInsert.mockResolvedValueOnce({
                data: mockCreatedAdjustment,
                error: null,
            });

            mockInsert.mockResolvedValueOnce({
                error: null,
            });

            mockEq.mockResolvedValue({
                data: mockAdjustmentWithItems,
                error: null,
            });

            const { createStockAdjustment } = await import('../stockAdjustmentService');
            const result = await createStockAdjustment(adjustmentData);

            expect((result as any).stock_adjustment_items[0].difference).toBe(-5);
            expect((result as any).stock_adjustment_items[0].difference).toBeLessThan(0);
        });

        it('correctly calculates zero differences', async () => {
            const userId = 'user-123';
            const adjustmentData = {
                adjustment_no: 'SA-001',
                adjustment_date: '2024-01-01',
                warehouse_id: 'WH1',
                adjustment_type: 'physical_count' as const,
                notes: 'Annual inventory count',
                items: [
                    {
                        item_id: 'item-1',
                        system_qty: 10,
                        physical_qty: 10,
                        reason: 'No change',
                    },
                ],
            };

            const mockCreatedAdjustment = {
                id: 'adj-123',
                adjustment_no: 'SA-001',
                adjustment_date: '2024-01-01',
                warehouse_id: 'WH1',
                adjustment_type: 'physical_count',
                notes: 'Annual inventory count',
                status: 'draft',
                processed_by: null,
                is_deleted: false,
            };

            const mockAdjustmentWithItems = {
                ...mockCreatedAdjustment,
                stock_adjustment_items: [
                    {
                        id: 'sai-1',
                        adjustment_id: 'adj-123',
                        item_id: 'item-1',
                        system_qty: 10,
                        physical_qty: 10,
                        difference: 0, // Zero: physical == system
                        reason: 'No change',
                    },
                ],
            };

            mockSupabase.auth.getUser.mockResolvedValue({
                data: { user: { id: userId } },
                error: null,
            });

            const mockEq = vi.fn();
            const mockInsert = vi.fn();
            const mockDelete = vi.fn();

            mockSupabase.from.mockImplementation((table) => {
                if (table === 'stock_adjustments') {
                    return {
                        insert: mockInsert,
                        delete: () => ({ eq: mockDelete }),
                        eq: mockEq,
                    };
                }
                if (table === 'stock_adjustment_items') {
                    return {
                        insert: mockInsert,
                    };
                }
                return {};
            });

            mockInsert.mockResolvedValueOnce({
                data: mockCreatedAdjustment,
                error: null,
            });

            mockInsert.mockResolvedValueOnce({
                error: null,
            });

            mockEq.mockResolvedValue({
                data: mockAdjustmentWithItems,
                error: null,
            });

            const { createStockAdjustment } = await import('../stockAdjustmentService');
            const result = await createStockAdjustment(adjustmentData);

            expect((result as any).stock_adjustment_items[0].difference).toBe(0);
        });
    });
});
