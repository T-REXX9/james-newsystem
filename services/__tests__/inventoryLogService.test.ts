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

describe('inventoryLogService', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    afterEach(() => {
        vi.restoreAllMocks();
    });

    describe('createInventoryLogFromPO', () => {
        it('successfully creates inventory logs from delivered PO', async () => {
            const poId = 'po-123';
            const userId = 'user-123';

            const mockPO = {
                id: poId,
                po_no: 'PO-001',
                supplier_id: 'supplier-123',
                status: 'delivered',
                order_date: '2024-01-01',
                delivery_date: '2024-01-15',
                warehouse_id: 'WH1',
                purchase_order_items: [
                    {
                        id: 'poi-1',
                        item_id: 'item-1',
                        qty: 10,
                        unit_price: 100,
                        notes: 'Test item',
                    },
                    {
                        id: 'poi-2',
                        item_id: 'item-2',
                        qty: 20,
                        unit_price: 50,
                        notes: 'Test item 2',
                    },
                ],
            };

            const mockSupplier = {
                id: 'supplier-123',
                company: 'Test Supplier Inc.',
            };

            // Mock auth user
            mockSupabase.auth.getUser.mockResolvedValue({
                data: { user: { id: userId } },
                error: null,
            });

            // Setup chain mocks
            const mockSelect = vi.fn();
            const mockEq = vi.fn();
            const mockSingle = vi.fn();
            const mockInsert = vi.fn();

            mockSupabase.from.mockImplementation((table) => {
                if (table === 'purchase_orders') {
                    return {
                        select: () => ({
                            eq: () => ({ single: mockSingle }),
                        }),
                    };
                }
                if (table === 'contacts') {
                    return {
                        select: () => ({
                            eq: () => ({ single: mockSingle }),
                        }),
                    };
                }
                if (table === 'inventory_logs') {
                    return {
                        insert: mockInsert,
                    };
                }
                return { select: mockSelect };
            });

            // Setup return values
            mockSingle.mockImplementation(() => {
                const lastCall = mockSupabase.from.mock.calls[mockSupabase.from.mock.calls.length - 1];
                if (lastCall[0] === 'purchase_orders') {
                    return Promise.resolve({ data: mockPO, error: null });
                }
                if (lastCall[0] === 'contacts') {
                    return Promise.resolve({ data: mockSupplier, error: null });
                }
                return Promise.resolve({ data: null, error: null });
            });

            mockInsert.mockResolvedValue({
                data: { id: 'log-1', item_id: 'item-1' },
                error: null,
            });

            const { createInventoryLogFromPO } = await import('../inventoryLogService');
            const result = await createInventoryLogFromPO(poId, userId);

            expect(result).toHaveLength(2);
            expect(mockInsert).toHaveBeenCalledTimes(2);
        });

        it('throws error when PO status is not delivered', async () => {
            const poId = 'po-123';
            const userId = 'user-123';

            const mockPO = {
                id: poId,
                po_no: 'PO-001',
                supplier_id: 'supplier-123',
                status: 'draft', // Invalid status
                order_date: '2024-01-01',
                warehouse_id: 'WH1',
                purchase_order_items: [],
            };

            const mockSingle = vi.fn();
            mockSupabase.from.mockImplementation((table) => {
                if (table === 'purchase_orders') {
                    return {
                        select: () => ({
                            eq: () => ({ single: mockSingle }),
                        }),
                    };
                }
                return { select: vi.fn() };
            });

            mockSingle.mockResolvedValue({ data: mockPO, error: null });

            const { createInventoryLogFromPO } = await import('../inventoryLogService');

            await expect(createInventoryLogFromPO(poId, userId)).rejects.toThrow(
                'Purchase Order must be delivered to create inventory logs'
            );
        });

        it('throws error when PO not found', async () => {
            const poId = 'po-123';
            const userId = 'user-123';

            const mockSingle = vi.fn();
            mockSupabase.from.mockImplementation((table) => {
                if (table === 'purchase_orders') {
                    return {
                        select: () => ({
                            eq: () => ({ single: mockSingle }),
                        }),
                    };
                }
                return { select: vi.fn() };
            });

            mockSingle.mockResolvedValue({ data: null, error: { message: 'Not found' } });

            const { createInventoryLogFromPO } = await import('../inventoryLogService');

            await expect(createInventoryLogFromPO(poId, userId)).rejects.toThrow(
                'Purchase Order not found'
            );
        });
    });

    describe('createInventoryLogFromInvoice', () => {
        it('successfully creates inventory logs from sent invoice', async () => {
            const invoiceId = 'invoice-123';
            const userId = 'user-123';

            const mockInvoice = {
                id: invoiceId,
                invoice_no: 'INV-001',
                contact_id: 'customer-123',
                status: 'sent',
                sales_date: '2024-01-01',
                invoice_items: [
                    {
                        id: 'ii-1',
                        item_id: 'item-1',
                        qty: 5,
                        unit_price: 200,
                    },
                ],
            };

            const mockCustomer = {
                id: 'customer-123',
                company: 'Test Customer Corp.',
            };

            const mockSingle = vi.fn();
            const mockInsert = vi.fn();

            mockSupabase.from.mockImplementation((table) => {
                if (table === 'invoices') {
                    return {
                        select: () => ({
                            eq: () => ({ single: mockSingle }),
                        }),
                    };
                }
                if (table === 'contacts') {
                    return {
                        select: () => ({
                            eq: () => ({ single: mockSingle }),
                        }),
                    };
                }
                if (table === 'inventory_logs') {
                    return {
                        insert: mockInsert,
                    };
                }
                return { select: vi.fn() };
            });

            mockSingle.mockImplementation(() => {
                const lastCall = mockSupabase.from.mock.calls[mockSupabase.from.mock.calls.length - 1];
                if (lastCall[0] === 'invoices') {
                    return Promise.resolve({ data: mockInvoice, error: null });
                }
                if (lastCall[0] === 'contacts') {
                    return Promise.resolve({ data: mockCustomer, error: null });
                }
                return Promise.resolve({ data: null, error: null });
            });

            mockInsert.mockResolvedValue({
                data: { id: 'log-1', item_id: 'item-1' },
                error: null,
            });

            const { createInventoryLogFromInvoice } = await import('../inventoryLogService');
            const result = await createInventoryLogFromInvoice(invoiceId, userId);

            expect(result).toHaveLength(1);
            expect(mockInsert).toHaveBeenCalledWith(
                expect.objectContaining({
                    qty_in: 0,
                    qty_out: 5,
                    status_indicator: '-',
                })
            );
        });

        it('successfully creates inventory logs from paid invoice', async () => {
            const invoiceId = 'invoice-123';
            const userId = 'user-123';

            const mockInvoice = {
                id: invoiceId,
                invoice_no: 'INV-001',
                contact_id: 'customer-123',
                status: 'paid', // Valid status
                sales_date: '2024-01-01',
                invoice_items: [
                    {
                        id: 'ii-1',
                        item_id: 'item-1',
                        qty: 3,
                        unit_price: 150,
                    },
                ],
            };

            const mockCustomer = {
                id: 'customer-123',
                company: 'Test Customer Corp.',
            };

            const mockSingle = vi.fn();
            const mockInsert = vi.fn();

            mockSupabase.from.mockImplementation((table) => {
                if (table === 'invoices') {
                    return {
                        select: () => ({
                            eq: () => ({ single: mockSingle }),
                        }),
                    };
                }
                if (table === 'contacts') {
                    return {
                        select: () => ({
                            eq: () => ({ single: mockSingle }),
                        }),
                    };
                }
                if (table === 'inventory_logs') {
                    return {
                        insert: mockInsert,
                    };
                }
                return { select: vi.fn() };
            });

            mockSingle.mockImplementation(() => {
                const lastCall = mockSupabase.from.mock.calls[mockSupabase.from.mock.calls.length - 1];
                if (lastCall[0] === 'invoices') {
                    return Promise.resolve({ data: mockInvoice, error: null });
                }
                if (lastCall[0] === 'contacts') {
                    return Promise.resolve({ data: mockCustomer, error: null });
                }
                return Promise.resolve({ data: null, error: null });
            });

            mockInsert.mockResolvedValue({
                data: { id: 'log-1', item_id: 'item-1' },
                error: null,
            });

            const { createInventoryLogFromInvoice } = await import('../inventoryLogService');
            const result = await createInventoryLogFromInvoice(invoiceId, userId);

            expect(result).toHaveLength(1);
        });

        it('throws error when invoice status is invalid', async () => {
            const invoiceId = 'invoice-123';
            const userId = 'user-123';

            const mockInvoice = {
                id: invoiceId,
                invoice_no: 'INV-001',
                contact_id: 'customer-123',
                status: 'draft', // Invalid status
                sales_date: '2024-01-01',
                invoice_items: [],
            };

            const mockSingle = vi.fn();
            mockSupabase.from.mockImplementation((table) => {
                if (table === 'invoices') {
                    return {
                        select: () => ({
                            eq: () => ({ single: mockSingle }),
                        }),
                    };
                }
                return { select: vi.fn() };
            });

            mockSingle.mockResolvedValue({ data: mockInvoice, error: null });

            const { createInventoryLogFromInvoice } = await import('../inventoryLogService');

            await expect(createInventoryLogFromInvoice(invoiceId, userId)).rejects.toThrow(
                'Invoice must be sent or paid to create inventory logs'
            );
        });
    });

    describe('createInventoryLogFromOrderSlip', () => {
        it('successfully creates inventory logs from finalized order slip', async () => {
            const slipId = 'slip-123';
            const userId = 'user-123';

            const mockSlip = {
                id: slipId,
                slip_no: 'OS-001',
                contact_id: 'customer-123',
                status: 'finalized',
                sales_date: '2024-01-01',
                order_slip_items: [
                    {
                        id: 'osi-1',
                        item_id: 'item-1',
                        qty: 8,
                        unit_price: 75,
                    },
                ],
            };

            const mockCustomer = {
                id: 'customer-123',
                company: 'Test Customer Corp.',
            };

            const mockSingle = vi.fn();
            const mockInsert = vi.fn();

            mockSupabase.from.mockImplementation((table) => {
                if (table === 'order_slips') {
                    return {
                        select: () => ({
                            eq: () => ({ single: mockSingle }),
                        }),
                    };
                }
                if (table === 'contacts') {
                    return {
                        select: () => ({
                            eq: () => ({ single: mockSingle }),
                        }),
                    };
                }
                if (table === 'inventory_logs') {
                    return {
                        insert: mockInsert,
                    };
                }
                return { select: vi.fn() };
            });

            mockSingle.mockImplementation(() => {
                const lastCall = mockSupabase.from.mock.calls[mockSupabase.from.mock.calls.length - 1];
                if (lastCall[0] === 'order_slips') {
                    return Promise.resolve({ data: mockSlip, error: null });
                }
                if (lastCall[0] === 'contacts') {
                    return Promise.resolve({ data: mockCustomer, error: null });
                }
                return Promise.resolve({ data: null, error: null });
            });

            mockInsert.mockResolvedValue({
                data: { id: 'log-1', item_id: 'item-1' },
                error: null,
            });

            const { createInventoryLogFromOrderSlip } = await import('../inventoryLogService');
            const result = await createInventoryLogFromOrderSlip(slipId, userId);

            expect(result).toHaveLength(1);
            expect(mockInsert).toHaveBeenCalledWith(
                expect.objectContaining({
                    transaction_type: 'Order Slip',
                    qty_in: 0,
                    qty_out: 8,
                    status_indicator: '-',
                })
            );
        });

        it('throws error when order slip status is not finalized', async () => {
            const slipId = 'slip-123';
            const userId = 'user-123';

            const mockSlip = {
                id: slipId,
                slip_no: 'OS-001',
                contact_id: 'customer-123',
                status: 'draft', // Invalid status
                sales_date: '2024-01-01',
                order_slip_items: [],
            };

            const mockSingle = vi.fn();
            mockSupabase.from.mockImplementation((table) => {
                if (table === 'order_slips') {
                    return {
                        select: () => ({
                            eq: () => ({ single: mockSingle }),
                        }),
                    };
                }
                return { select: vi.fn() };
            });

            mockSingle.mockResolvedValue({ data: mockSlip, error: null });

            const { createInventoryLogFromOrderSlip } = await import('../inventoryLogService');

            await expect(createInventoryLogFromOrderSlip(slipId, userId)).rejects.toThrow(
                'Order Slip must be finalized to create inventory logs'
            );
        });
    });

    describe('createInventoryLogFromStockAdjustment', () => {
        it('successfully creates inventory logs for positive differences', async () => {
            const adjustmentId = 'adj-123';
            const userId = 'user-123';

            const mockAdjustment = {
                id: adjustmentId,
                adjustment_no: 'SA-001',
                warehouse_id: 'WH1',
                status: 'finalized',
                adjustment_date: '2024-01-01',
                adjustment_type: 'Physical Count',
                notes: 'Annual count',
                stock_adjustment_items: [
                    {
                        id: 'sai-1',
                        item_id: 'item-1',
                        system_qty: 10,
                        physical_qty: 15,
                        difference: 5, // Positive difference
                        reason: 'Found extra items',
                    },
                ],
            };

            const mockSingle = vi.fn();
            const mockInsert = vi.fn();

            mockSupabase.from.mockImplementation((table) => {
                if (table === 'stock_adjustments') {
                    return {
                        select: () => ({
                            eq: () => ({ single: mockSingle }),
                        }),
                    };
                }
                if (table === 'inventory_logs') {
                    return {
                        insert: mockInsert,
                    };
                }
                return { select: vi.fn() };
            });

            mockSingle.mockResolvedValue({ data: mockAdjustment, error: null });
            mockInsert.mockResolvedValue({
                data: { id: 'log-1', item_id: 'item-1' },
                error: null,
            });

            const { createInventoryLogFromStockAdjustment } = await import('../inventoryLogService');
            const result = await createInventoryLogFromStockAdjustment(adjustmentId, userId);

            expect(result).toHaveLength(1);
            expect(mockInsert).toHaveBeenCalledWith(
                expect.objectContaining({
                    qty_in: 5,
                    qty_out: 0,
                    status_indicator: '+',
                    unit_price: 0,
                })
            );
        });

        it('successfully creates inventory logs for negative differences', async () => {
            const adjustmentId = 'adj-123';
            const userId = 'user-123';

            const mockAdjustment = {
                id: adjustmentId,
                adjustment_no: 'SA-001',
                warehouse_id: 'WH1',
                status: 'finalized',
                adjustment_date: '2024-01-01',
                adjustment_type: 'Damage',
                notes: 'Damaged items',
                stock_adjustment_items: [
                    {
                        id: 'sai-1',
                        item_id: 'item-1',
                        system_qty: 20,
                        physical_qty: 15,
                        difference: -5, // Negative difference
                        reason: 'Damaged items removed',
                    },
                ],
            };

            const mockSingle = vi.fn();
            const mockInsert = vi.fn();

            mockSupabase.from.mockImplementation((table) => {
                if (table === 'stock_adjustments') {
                    return {
                        select: () => ({
                            eq: () => ({ single: mockSingle }),
                        }),
                    };
                }
                if (table === 'inventory_logs') {
                    return {
                        insert: mockInsert,
                    };
                }
                return { select: vi.fn() };
            });

            mockSingle.mockResolvedValue({ data: mockAdjustment, error: null });
            mockInsert.mockResolvedValue({
                data: { id: 'log-1', item_id: 'item-1' },
                error: null,
            });

            const { createInventoryLogFromStockAdjustment } = await import('../inventoryLogService');
            const result = await createInventoryLogFromStockAdjustment(adjustmentId, userId);

            expect(result).toHaveLength(1);
            expect(mockInsert).toHaveBeenCalledWith(
                expect.objectContaining({
                    qty_in: 0,
                    qty_out: 5,
                    status_indicator: '-',
                    unit_price: 0,
                })
            );
        });

        it('skips items with zero difference', async () => {
            const adjustmentId = 'adj-123';
            const userId = 'user-123';

            const mockAdjustment = {
                id: adjustmentId,
                adjustment_no: 'SA-001',
                warehouse_id: 'WH1',
                status: 'finalized',
                adjustment_date: '2024-01-01',
                adjustment_type: 'Physical Count',
                notes: 'Annual count',
                stock_adjustment_items: [
                    {
                        id: 'sai-1',
                        item_id: 'item-1',
                        system_qty: 10,
                        physical_qty: 10,
                        difference: 0, // No difference - should be skipped
                        reason: 'No change',
                    },
                ],
            };

            const mockSingle = vi.fn();
            const mockInsert = vi.fn();

            mockSupabase.from.mockImplementation((table) => {
                if (table === 'stock_adjustments') {
                    return {
                        select: () => ({
                            eq: () => ({ single: mockSingle }),
                        }),
                    };
                }
                if (table === 'inventory_logs') {
                    return {
                        insert: mockInsert,
                    };
                }
                return { select: vi.fn() };
            });

            mockSingle.mockResolvedValue({ data: mockAdjustment, error: null });

            const { createInventoryLogFromStockAdjustment } = await import('../inventoryLogService');
            const result = await createInventoryLogFromStockAdjustment(adjustmentId, userId);

            expect(result).toHaveLength(0);
            expect(mockInsert).not.toHaveBeenCalled();
        });

        it('throws error when adjustment status is not finalized', async () => {
            const adjustmentId = 'adj-123';
            const userId = 'user-123';

            const mockAdjustment = {
                id: adjustmentId,
                adjustment_no: 'SA-001',
                warehouse_id: 'WH1',
                status: 'draft', // Invalid status
                adjustment_date: '2024-01-01',
                stock_adjustment_items: [],
            };

            const mockSingle = vi.fn();
            mockSupabase.from.mockImplementation((table) => {
                if (table === 'stock_adjustments') {
                    return {
                        select: () => ({
                            eq: () => ({ single: mockSingle }),
                        }),
                    };
                }
                return { select: vi.fn() };
            });

            mockSingle.mockResolvedValue({ data: mockAdjustment, error: null });

            const { createInventoryLogFromStockAdjustment } = await import('../inventoryLogService');

            await expect(createInventoryLogFromStockAdjustment(adjustmentId, userId)).rejects.toThrow(
                'Stock Adjustment must be finalized to create inventory logs'
            );
        });
    });

    describe('createInventoryLogFromReturn', () => {
        it('successfully creates inventory logs from processed return', async () => {
            const returnId = 'ret-123';
            const userId = 'user-123';

            const mockReturn = {
                id: returnId,
                contact_id: 'customer-123',
                status: 'processed',
                returnDate: '2024-01-01',
                reason: 'Defective product',
                products: [
                    {
                        name: 'Product A',
                        quantity: 2,
                        originalPrice: 100,
                        refundAmount: 200,
                    },
                ],
            };

            const mockCustomer = {
                id: 'customer-123',
                company: 'Test Customer Corp.',
            };

            const mockProduct = {
                id: 'product-1',
                description: 'Product A',
            };

            const mockSingle = vi.fn();
            const mockInsert = vi.fn();

            mockSupabase.from.mockImplementation((table) => {
                if (table === 'sales_returns') {
                    return {
                        select: () => ({
                            eq: () => ({ single: mockSingle }),
                        }),
                    };
                }
                if (table === 'contacts') {
                    return {
                        select: () => ({
                            eq: () => ({ single: mockSingle }),
                        }),
                    };
                }
                if (table === 'products') {
                    return {
                        select: () => ({
                            eq: () => ({ single: mockSingle }),
                        }),
                    };
                }
                if (table === 'inventory_logs') {
                    return {
                        insert: mockInsert,
                    };
                }
                return { select: vi.fn() };
            });

            mockSingle.mockImplementation(() => {
                const lastCall = mockSupabase.from.mock.calls[mockSupabase.from.mock.calls.length - 1];
                if (lastCall[0] === 'sales_returns') {
                    return Promise.resolve({ data: mockReturn, error: null });
                }
                if (lastCall[0] === 'contacts') {
                    return Promise.resolve({ data: mockCustomer, error: null });
                }
                if (lastCall[0] === 'products') {
                    return Promise.resolve({ data: mockProduct, error: null });
                }
                return Promise.resolve({ data: null, error: null });
            });

            mockInsert.mockResolvedValue({
                data: { id: 'log-1', item_id: 'product-1' },
                error: null,
            });

            const { createInventoryLogFromReturn } = await import('../inventoryLogService');
            const result = await createInventoryLogFromReturn(returnId, userId);

            expect(result).toHaveLength(1);
            expect(mockInsert).toHaveBeenCalledWith(
                expect.objectContaining({
                    transaction_type: 'Credit Memo',
                    qty_in: 2,
                    qty_out: 0,
                    status_indicator: '+',
                    unit_price: 100,
                })
            );
        });

        it('throws error when return status is not processed', async () => {
            const returnId = 'ret-123';
            const userId = 'user-123';

            const mockReturn = {
                id: returnId,
                contact_id: 'customer-123',
                status: 'pending', // Invalid status
                returnDate: '2024-01-01',
                products: [],
            };

            const mockSingle = vi.fn();
            mockSupabase.from.mockImplementation((table) => {
                if (table === 'sales_returns') {
                    return {
                        select: () => ({
                            eq: () => ({ single: mockSingle }),
                        }),
                    };
                }
                return { select: vi.fn() };
            });

            mockSingle.mockResolvedValue({ data: mockReturn, error: null });

            const { createInventoryLogFromReturn } = await import('../inventoryLogService');

            await expect(createInventoryLogFromReturn(returnId, userId)).rejects.toThrow(
                'Sales Return must be processed to create inventory logs'
            );
        });
    });

    describe('concurrent transaction scenarios', () => {
        it('handles concurrent inventory log creation', async () => {
            const poId = 'po-123';
            const userId = 'user-123';

            const mockPO = {
                id: poId,
                po_no: 'PO-001',
                supplier_id: 'supplier-123',
                status: 'delivered',
                order_date: '2024-01-01',
                delivery_date: '2024-01-15',
                warehouse_id: 'WH1',
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

            const mockSupplier = {
                id: 'supplier-123',
                company: 'Test Supplier Inc.',
            };

            mockSupabase.auth.getUser.mockResolvedValue({
                data: { user: { id: userId } },
                error: null,
            });

            const mockSingle = vi.fn();
            const mockInsert = vi.fn();

            mockSupabase.from.mockImplementation((table) => {
                if (table === 'purchase_orders') {
                    return {
                        select: () => ({
                            eq: () => ({ single: mockSingle }),
                        }),
                    };
                }
                if (table === 'contacts') {
                    return {
                        select: () => ({
                            eq: () => ({ single: mockSingle }),
                        }),
                    };
                }
                if (table === 'inventory_logs') {
                    return {
                        insert: mockInsert,
                    };
                }
                return { select: vi.fn() };
            });

            mockSingle.mockImplementation(() => {
                const lastCall = mockSupabase.from.mock.calls[mockSupabase.from.mock.calls.length - 1];
                if (lastCall[0] === 'purchase_orders') {
                    return Promise.resolve({ data: mockPO, error: null });
                }
                if (lastCall[0] === 'contacts') {
                    return Promise.resolve({ data: mockSupplier, error: null });
                }
                return Promise.resolve({ data: null, error: null });
            });

            mockInsert.mockResolvedValue({
                data: { id: 'log-1', item_id: 'item-1' },
                error: null,
            });

            const { createInventoryLogFromPO } = await import('../inventoryLogService');

            // Create concurrent calls
            const [result1, result2] = await Promise.all([
                createInventoryLogFromPO(poId, userId),
                createInventoryLogFromPO(poId, userId),
            ]);

            expect(result1).toHaveLength(1);
            expect(result2).toHaveLength(1);
            expect(mockInsert).toHaveBeenCalledTimes(2);
        });
    });
});
