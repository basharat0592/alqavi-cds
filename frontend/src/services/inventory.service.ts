import api from '@/lib/axios';

/**
 * Service for managing Warehouse and Stock (Inventory) records.
 * Optimized for the new Warehouse and Stock model structure.
 */
export const inventoryService = {
    // ── Warehouses ───────────────────────────────────────────────────────────
    getWarehouses: async (params?: any): Promise<any[]> => {
        const { data } = await api.get('v1/inventory/warehouses/', { params });
        return data.results || data || [];
    },
    createWarehouse: async (payload: any): Promise<any> => {
        const { data } = await api.post('v1/inventory/warehouses/', payload);
        return data;
    },
    updateWarehouse: async (id: string | number, payload: any): Promise<any> => {
        const { data } = await api.patch(`v1/inventory/warehouses/${id}/`, payload);
        return data;
    },
    deleteWarehouse: async (id: string | number): Promise<void> => {
        await api.delete(`v1/inventory/warehouses/${id}/`);
    },

    // ── Stock Records (Inventory) ─────────────────────────────────────────────
    // Note: 'records/' is an alias for 'stocks/' in the backend for compatibility
    getInventory: async (params?: any): Promise<any[]> => {
        const { data } = await api.get('v1/inventory/stocks/', { params });
        return data.results || data || [];
    },
    createStock: async (payload: any): Promise<any> => {
        const { data } = await api.post('v1/inventory/stocks/', payload);
        return data;
    },
    updateInventory: async (id: string | number, payload: any): Promise<any> => {
        const { data } = await api.patch(`v1/inventory/stocks/${id}/`, payload);
        return data;
    },
    deleteInventory: async (id: string | number): Promise<void> => {
        if (!id) return;
        await api.delete(`v1/inventory/stocks/${id}/`);
    },
    transferStock: async (id: string | number, payload: { destination_warehouse: string | number; quantity: number; date?: string }): Promise<any> => {
        const { data } = await api.post(`v1/inventory/stocks/${id}/transfer/`, payload);
        return data;
    },
    getStockMovements: async (stockId: string | number): Promise<any[]> => {
        const { data } = await api.get(`v1/inventory/stocks/${stockId}/movements/`);
        return data;
    },

    // Legacy or placeholder methods - keeping for safety but may be removed if not used
    getInventorySummary: async (): Promise<any> => {
        try {
            const { data } = await api.get('v1/inventory/stocks/summary/');
            return data;
        } catch {
            return { total_items: 0, low_stock_count: 0, expired_batches: 0 };
        }
    },
    createInventory: async (payload: any): Promise<any> => {
        // Alias for createStock for existing components
        return inventoryService.createStock(payload);
    },
    getAdjustments: async (params?: any): Promise<any[]> => {
        const { data } = await api.get('v1/inventory/adjustments/', { params });
        return data.results || data || [];
    },
    createAdjustment: async (payload: any): Promise<any> => {
        const { data } = await api.post('v1/inventory/adjustments/', payload);
        return data;
    },
    getBatches: async (params?: any): Promise<any[]> => {
        const { data } = await api.get('v1/inventory/batches/', { params });
        return data.results || data || [];
    },
    createBatch: async (payload: any): Promise<any> => {
        const { data } = await api.post('v1/inventory/batches/', payload);
        return data;
    },
    createMovement: async (payload: any): Promise<any> => {
        const { data } = await api.post('v1/inventory/movements/', payload);
        return data;
    },

    // ── Movements Aliases ───────────────────────────────────────────────────
    getMovements: async (params?: any): Promise<any[]> => {
        return inventoryService.getInventory(params);
    },
    getMovementsSummary: async (): Promise<any> => {
        return inventoryService.getInventorySummary();
    },
    getAlerts: async (): Promise<any[]> => {
        return [];
    },
};
