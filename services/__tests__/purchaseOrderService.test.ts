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

describe('purchaseOrderService', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    afterEach(() => {
        vi.restoreAllMocks();
    });

    describe('createPurchaseOrder', () => {
        it('successfully creates a purchase order with valid data', async () => {
            const userId = 'user-123';
            const poData = {
                po_no: 'PO-001',
                supplier_id: 'supplier-123',
                order_date: '2024-01-01',
                delivery_date: '2024-01-15',
                warehouse_id: 'WH1',
                items: [
                    {
                        item_id: 'item-1',
                        qty: 10,
                        unit_price: 100,
                        notes: 'Test item',
                    },
                    {
                        item_id: 'item-2',
                        qty: 20,
                        unit_price: 50,
                        notes: 'Test item 2',
                    },
                ],
            };

            const mockCreatedPO = {
                id: 'po-123',
                po_no: 'PO-001',
                supplier_id: 'supplier-123',
                order_date: '2024-01-01',
                delivery_date: '2024-01-15',
                warehouse_id: 'WH1',
                status: 'draft',
                grand_total: 2000,
                created_by: userId,
                is_deleted: false,
            };

            const mockPOWithItems = {
                ...mockCreatedPO,
                purchase_order_items: [
                    {
                        id: 'poi-1',
                        po_id: 'po-123',
                        item_id: 'item-1',
                        qty: 10,
                        unit_price: 100,
                        amount: 1000,
                        notes: 'Test item',
                    },
                    {
                        id: 'poi-2',
                        po_id: 'po-123',
                        item_id: 'item-2',
                        qty: 20,
                        unit_price: 50,
                        amount: 1000,
                        notes: 'Test item 2',
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
                if (table === 'purchase_orders') {
                    return {
                        insert: mockInsert,
                        select: () => ({ single: mockSingle }),
                        delete: () => ({ eq: mockDelete }),
                        eq: mockEq,
                    };
                }
                if (table === 'purchase_order_items') {
                    return {
                        insert: mockInsert,
                        delete: () => ({ eq: mockDelete }),
                    };
                }
                return { select: mockSelect };
            });

            // First insert: create PO
            mockInsert.mockResolvedValueOnce({
                data: mockCreatedPO,
                error: null,
            });

            // Second insert: create items
            mockInsert.mockResolvedValueOnce({
                error: null,
            });

            // getPurchaseOrder call
            mockEq.mockResolvedValue({
                data: mockPOWithItems,
                error: null,
            });

            const { createPurchaseOrder } = await import('../purchaseOrderService');
            const result = await createPurchaseOrder(poData);

            expect(result).toEqual(mockPOWithItems);
            expect(mockInsert).toHaveBeenCalledTimes(2);
            expect(result.grand_total).toBe(2000);
        });

        it('throws error when user is not authenticated', async () => {
            const poData = {
                po_no: 'PO-001',
                supplier_id: 'supplier-123',
                order_date: '2024-01-01',
                delivery_date: '2024-01-15',
                warehouse_id: 'WH1',
                items: [],
            };

            mockSupabase.auth.getUser.mockResolvedValue({
                data: { user: null },
                error: { message: 'Not authenticated' },
            });

            const { createPurchaseOrder } = await import('../purchaseOrderService');

            await expect(createPurchaseOrder(poData)).rejects.toThrow('User not authenticated');
        });

        it('rolls back PO creation when items insertion fails', async () => {
            const userId = 'user-123';
            const poData = {
                po_no: 'PO-001',
                supplier_id: 'supplier-123',
                order_date: '2024-01-01',
                delivery_date: '2024-01-15',
                warehouse_id: 'WH1',
                items: [
                    {
                        item_id: 'item-1',
                        qty: 10,
                        unit_price: 100,
                        notes: 'Test item',
                    },
                ],
            };

            const mockCreatedPO = {
                id: 'po-123',
                po_no: 'PO-001',
                supplier_id: 'supplier-123',
                order_date: '2024-01-01',
                delivery_date: '2024-01-15',
                warehouse_id: 'WH1',
                status: 'draft',
                grand_total: 1000,
                created_by: userId,
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
                if (table === 'purchase_orders') {
                    return {
                        insert: mockInsert,
                        delete: () => ({ eq: mockDelete }),
                    };
                }
                if (table === 'purchase_order_items') {
                    return {
                        insert: mockInsert,
                    };
                }
                return { eq: mockEq };
            });

            // First insert: create PO (success)
            mockInsert.mockResolvedValueOnce({
                data: mockCreatedPO,
                error: null,
            });

            // Second insert: create items (failure)
            mockInsert.mockResolvedValueOnce({
                error: { message: 'Failed to insert items' },
            });

            // Delete for rollback
            mockDelete.mockResolvedValue({ error: null });

            const { createPurchaseOrder } = await import('../purchaseOrderService');

            await expect(createPurchaseOrder(poData)).rejects.toThrow('Failed to insert items');
            expect(mockDelete).toHaveBeenCalled(); // Verify rollback
        });
    });

    describe('getPurchaseOrder', () => {
        it('successfully retrieves a purchase order by ID', async () => {
            const poId = 'po-123';

            const mockPO = {
                id: poId,
                po_no: 'PO-001',
                supplier_id: 'supplier-123',
                order_date: '2024-01-01',
                delivery_date: '2024-01-15',
                warehouse_id: 'WH1',
                status: 'draft',
                grand_total: 1000,
                is_deleted: false,
                purchase_order_items: [
                    {
                        id: 'poi-1',
                        po_id: poId,
                        item_id: 'item-1',
                        qty: 10,
                        unit_price: 100,
                        amount: 1000,
                        notes: 'Test item',
                    },
                ],
            };

            const mockEq = vi.fn();
            const mockSingle = vi.fn();

            mockSupabase.from.mockImplementation((table) => {
                if (table === 'purchase_orders') {
                    return {
                        select: () => ({
                            eq: mockEq,
                        }),
                    };
                }
                return {};
            });

            mockEq.mockReturnValue({ single: mockSingle });
            mockSingle.mockResolvedValue({ data: mockPO, error: null });

            const { getPurchaseOrder } = await import('../purchaseOrderService');
            const result = await getPurchaseOrder(poId);

            expect(result).toEqual(mockPO);
            expect(mockEq).toHaveBeenCalledWith('id', poId);
            expect(mockEq).toHaveBeenCalledWith('is_deleted', false);
        });

        it('returns null when purchase order not found', async () => {
            const poId = 'po-123';

            const mockEq = vi.fn();
            const mockSingle = vi.fn();

            mockSupabase.from.mockImplementation((table) => {
                if (table === 'purchase_orders') {
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

            const { getPurchaseOrder } = await import('../purchaseOrderService');
            const result = await getPurchaseOrder(poId);

            expect(result).toBeNull();
        });
    });

    describe('updatePurchaseOrder', () => {
        it('successfully updates a draft purchase order', async () => {
            const poId = 'po-123';
            const userId = 'user-123';

            const existingPO = {
                id: poId,
                po_no: 'PO-001',
                supplier_id: 'supplier-123',
                order_date: '2024-01-01',
                delivery_date: '2024-01-15',
                warehouse_id: 'WH1',
                status: 'draft', // Draft status - can be updated
                grand_total: 1000,
                is_deleted: false,
                purchase_order_items: [],
            };

            const updates = {
                po_no: 'PO-001-UPDATED',
                supplier_id: 'supplier-456',
                order_date: '2024-01-02',
                delivery_date: '2024-01-16',
                warehouse_id: 'WH2',
                items: [
                    {
                        item_id: 'item-1',
                        qty: 15,
                        unit_price: 120,
                        notes: 'Updated item',
                    },
                ],
            };

            const mockUpdatedPO = {
                ...existingPO,
                po_no: 'PO-001-UPDATED',
                supplier_id: 'supplier-456',
                order_date: '2024-01-02',
                delivery_date: '2024-01-16',
                warehouse_id: 'WH2',
                grand_total: 1800,
            };

            const mockPOWithUpdatedItems = {
                ...mockUpdatedPO,
                purchase_order_items: [
                    {
                        id: 'poi-1',
                        po_id: poId,
                        item_id: 'item-1',
                        qty: 15,
                        unit_price: 120,
                        amount: 1800,
                        notes: 'Updated item',
                    },
                ],
            };

            const mockEq = vi.fn();
            const mockSelect = vi.fn();
            const mockSingle = vi.fn();
            const mockInsert = vi.fn();
            const mockDelete = vi.fn();

            mockSupabase.from.mockImplementation((table) => {
                if (table === 'purchase_orders') {
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
                if (table === 'purchase_order_items') {
                    return {
                        delete: () => ({ eq: mockDelete }),
                        insert: mockInsert,
                    };
                }
                return { select: mockSelect };
            });

            // getPurchaseOrder call
            mockEq.mockImplementation((field, value) => {
                if (field === 'id' && value === poId) {
                    return { eq: () => ({ single: () => Promise.resolve({ data: existingPO, error: null }) }) };
                }
                if (field === 'is_deleted') {
                    return { single: () => Promise.resolve({ data: existingPO, error: null }) };
                }
                return { single: () => Promise.resolve({ data: null, error: null }) };
            });

            // update call
            mockEq.mockResolvedValue({ data: mockUpdatedPO, error: null });
            mockSingle.mockResolvedValue({ data: mockUpdatedPO, error: null });

            // delete items
            mockDelete.mockResolvedValue({ error: null });

            // insert new items
            mockInsert.mockResolvedValue({ error: null });

            // getPurchaseOrder after update
            mockEq.mockResolvedValue({ data: mockPOWithUpdatedItems, error: null });

            const { updatePurchaseOrder } = await import('../purchaseOrderService');
            const result = await updatePurchaseOrder(poId, updates);

            expect(result).toEqual(mockPOWithUpdatedItems);
            expect(result.grand_total).toBe(1800);
        });

        it('throws error when trying to update non-draft PO', async () => {
            const poId = 'po-123';

            const existingPO = {
                id: poId,
                po_no: 'PO-001',
                supplier_id: 'supplier-123',
                order_date: '2024-01-01',
                delivery_date: '2024-01-15',
                warehouse_id: 'WH1',
                status: 'ordered', // Not draft - cannot be updated
                grand_total: 1000,
                is_deleted: false,
                purchase_order_items: [],
            };

            const updates = {
                po_no: 'PO-001-UPDATED',
            };

            const mockEq = vi.fn();

            mockSupabase.from.mockImplementation((table) => {
                if (table === 'purchase_orders') {
                    return {
                        select: () => ({
                            eq: mockEq,
                        }),
                    };
                }
                return {};
            });

            mockEq.mockImplementation((field, value) => {
                if (field === 'id' && value === poId) {
                    return { eq: () => ({ single: () => Promise.resolve({ data: existingPO, error: null }) }) };
                }
                if (field === 'is_deleted') {
                    return { single: () => Promise.resolve({ data: existingPO, error: null }) };
                }
                return { single: () => Promise.resolve({ data: null, error: null }) };
            });

            const { updatePurchaseOrder } = await import('../purchaseOrderService');

            await expect(updatePurchaseOrder(poId, updates)).rejects.toThrow(
                'Only draft purchase orders can be updated'
            );
        });

        it('throws error when PO not found', async () => {
            const poId = 'po-123';
            const updates = { po_no: 'PO-001-UPDATED' };

            const mockEq = vi.fn();

            mockSupabase.from.mockImplementation((table) => {
                if (table === 'purchase_orders') {
                    return {
                        select: () => ({
                            eq: mockEq,
                        }),
                    };
                }
                return {};
            });

            mockEq.mockImplementation((field, value) => {
                if (field === 'id' && value === poId) {
                    return { eq: () => ({ single: () => Promise.resolve({ data: null, error: null }) }) };
                }
                return { single: () => Promise.resolve({ data: null, error: null }) };
            });

            const { updatePurchaseOrder } = await import('../purchaseOrderService');

            await expect(updatePurchaseOrder(poId, updates)).rejects.toThrow(
                'Purchase Order not found'
            );
        });
    });

    describe('markAsDelivered', () => {
        it('successfully marks PO as delivered and creates inventory logs', async () => {
            const poId = 'po-123';
            const userId = 'user-123';

            const existingPO = {
                id: poId,
                po_no: 'PO-001',
                supplier_id: 'supplier-123',
                order_date: '2024-01-01',
                delivery_date: '2024-01-15',
                warehouse_id: 'WH1',
                status: 'ordered', // Can be marked as delivered
                grand_total: 1000,
                is_deleted: false,
                purchase_order_items: [
                    {
                        id: 'poi-1',
                        item_id: 'item-1',
                        qty: 10,
                        unit_price: 100,
                        notes: 'Test item',
                    },
                ],
            };

            const mockDeliveredPO = {
                ...existingPO,
                status: 'delivered',
                delivery_date: expect.any(String),
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
                if (table === 'purchase_orders') {
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

            // getPurchaseOrder call
            mockEq.mockImplementation((field, value) => {
                if (field === 'id' && value === poId) {
                    return { eq: () => ({ single: () => Promise.resolve({ data: existingPO, error: null }) }) };
                }
                if (field === 'is_deleted') {
                    return { single: () => Promise.resolve({ data: existingPO, error: null }) };
                }
                return { single: () => Promise.resolve({ data: null, error: null }) };
            });

            // update call
            mockEq.mockResolvedValue({ data: mockDeliveredPO, error: null });
            mockSingle.mockResolvedValue({ data: mockDeliveredPO, error: null });

            // getPurchaseOrder after update
            mockEq.mockResolvedValue({ data: mockDeliveredPO, error: null });

            const { markAsDelivered } = await import('../purchaseOrderService');
            const result = await markAsDelivered(poId);

            expect(result.status).toBe('delivered');
        });

        it('throws error when PO status is not ordered', async () => {
            const poId = 'po-123';

            const existingPO = {
                id: poId,
                po_no: 'PO-001',
                supplier_id: 'supplier-123',
                order_date: '2024-01-01',
                delivery_date: '2024-01-15',
                warehouse_id: 'WH1',
                status: 'draft', // Cannot be marked as delivered
                grand_total: 1000,
                is_deleted: false,
                purchase_order_items: [],
            };

            const mockEq = vi.fn();

            mockSupabase.from.mockImplementation((table) => {
                if (table === 'purchase_orders') {
                    return {
                        select: () => ({
                            eq: mockEq,
                        }),
                    };
                }
                return {};
            });

            mockEq.mockImplementation((field, value) => {
                if (field === 'id' && value === poId) {
                    return { eq: () => ({ single: () => Promise.resolve({ data: existingPO, error: null }) }) };
                }
                if (field === 'is_deleted') {
                    return { single: () => Promise.resolve({ data: existingPO, error: null }) };
                }
                return { single: () => Promise.resolve({ data: null, error: null }) };
            });

            const { markAsDelivered } = await import('../purchaseOrderService');

            await expect(markAsDelivered(poId)).rejects.toThrow(
                'Only ordered purchase orders can be marked as delivered'
            );
        });

        it('throws error when user is not authenticated', async () => {
            const poId = 'po-123';

            const existingPO = {
                id: poId,
                po_no: 'PO-001',
                supplier_id: 'supplier-123',
                order_date: '2024-01-01',
                delivery_date: '2024-01-15',
                warehouse_id: 'WH1',
                status: 'ordered',
                grand_total: 1000,
                is_deleted: false,
                purchase_order_items: [],
            };

            mockSupabase.auth.getUser.mockResolvedValue({
                data: { user: null },
                error: { message: 'Not authenticated' },
            });

            const mockEq = vi.fn();

            mockSupabase.from.mockImplementation((table) => {
                if (table === 'purchase_orders') {
                    return {
                        select: () => ({
                            eq: mockEq,
                        }),
                    };
                }
                return {};
            });

            mockEq.mockImplementation((field, value) => {
                if (field === 'id' && value === poId) {
                    return { eq: () => ({ single: () => Promise.resolve({ data: existingPO, error: null }) }) };
                }
                if (field === 'is_deleted') {
                    return { single: () => Promise.resolve({ data: existingPO, error: null }) };
                }
                return { single: () => Promise.resolve({ data: null, error: null }) };
            });

            const { markAsDelivered } = await import('../purchaseOrderService');

            await expect(markAsDelivered(poId)).rejects.toThrow('User not authenticated');
        });
    });

    describe('getAllPurchaseOrders', () => {
        it('successfully retrieves all purchase orders without filters', async () => {
            const mockPOs = [
                {
                    id: 'po-1',
                    po_no: 'PO-001',
                    supplier_id: 'supplier-1',
                    order_date: '2024-01-01',
                    status: 'draft',
                    grand_total: 1000,
                    is_deleted: false,
                    purchase_order_items: [],
                },
                {
                    id: 'po-2',
                    po_no: 'PO-002',
                    supplier_id: 'supplier-2',
                    order_date: '2024-01-02',
                    status: 'ordered',
                    grand_total: 2000,
                    is_deleted: false,
                    purchase_order_items: [],
                },
            ];

            const mockOrder = vi.fn();

            mockSupabase.from.mockImplementation((table) => {
                if (table === 'purchase_orders') {
                    return {
                        select: () => ({
                            eq: vi.fn(),
                            order: mockOrder,
                        }),
                    };
                }
                return {};
            });

            mockOrder.mockResolvedValue({ data: mockPOs, error: null });

            const { getAllPurchaseOrders } = await import('../purchaseOrderService');
            const result = await getAllPurchaseOrders();

            expect(result).toEqual(mockPOs);
            expect(result).toHaveLength(2);
        });

        it('successfully retrieves purchase orders with status filter', async () => {
            const mockPOs = [
                {
                    id: 'po-1',
                    po_no: 'PO-001',
                    supplier_id: 'supplier-1',
                    order_date: '2024-01-01',
                    status: 'delivered', // Filtered status
                    grand_total: 1000,
                    is_deleted: false,
                    purchase_order_items: [],
                },
            ];

            const mockEq = vi.fn();
            const mockOrder = vi.fn();

            mockSupabase.from.mockImplementation((table) => {
                if (table === 'purchase_orders') {
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
            mockOrder.mockResolvedValue({ data: mockPOs, error: null });

            const { getAllPurchaseOrders } = await import('../purchaseOrderService');
            const result = await getAllPurchaseOrders({ status: 'delivered' });

            expect(result).toEqual(mockPOs);
            expect(result).toHaveLength(1);
            expect(result[0].status).toBe('delivered');
        });

        it('handles empty results', async () => {
            const mockOrder = vi.fn();

            mockSupabase.from.mockImplementation((table) => {
                if (table === 'purchase_orders') {
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

            const { getAllPurchaseOrders } = await import('../purchaseOrderService');
            const result = await getAllPurchaseOrders();

            expect(result).toEqual([]);
        });

        it('throws error when database query fails', async () => {
            const mockOrder = vi.fn();

            mockSupabase.from.mockImplementation((table) => {
                if (table === 'purchase_orders') {
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

            const { getAllPurchaseOrders } = await import('../purchaseOrderService');

            await expect(getAllPurchaseOrders()).rejects.toThrow('Database error');
        });
    });
});
