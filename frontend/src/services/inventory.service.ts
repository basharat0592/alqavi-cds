import api from '@/lib/axios';

export const inventoryService = {
    getInventory: async (params?: any): Promise<any[]> => {
        const { data } = await api.get('v1/inventory/records/', { params });
        return data.results || data || [];
    },
    getInventorySummary: async (): Promise<any> => {
        try {
            const { data } = await api.get('v1/inventory/records/summary/');
            return data;
        } catch {
            return { total_items: 0, low_stock_count: 0, expired_batches: 0 };
        }
    },
    getMovements: async (params?: any): Promise<any[]> => {
        const { data } = await api.get('v1/inventory/movements/', { params });
        return data.results || data || [];
    },
    getBatches: async (params?: any): Promise<any[]> => {
        const { data } = await api.get('v1/inventory/batches/', { params });
        return data.results || data || [];
    },
    getAdjustments: async (params?: any): Promise<any[]> => {
        const { data } = await api.get('v1/inventory/adjustments/', { params });
        return data.results || data || [];
    },
    createAdjustment: async (payload: any): Promise<any> => {
        const { data } = await api.post('v1/inventory/adjustments/', payload);
        return data;
    },
    getAlerts: async (params?: any): Promise<any[]> => {
        const { data } = await api.get('v1/inventory/alerts/', { params });
        return data.results || data || [];
    },
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
    deleteInventory: async (id: string | number): Promise<void> => {
        if (!id) return;
        await api.delete(`v1/inventory/records/${id}/`);
    },
    createInventory: async (payload: any): Promise<any> => {
        const { data } = await api.post('v1/inventory/records/', payload);
        return data;
    },
    addStock: async (inventoryId: string | number, quantity: number, notes?: string): Promise<any> => {
        const { data } = await api.post(`v1/inventory/records/${inventoryId}/add_stock/`, { quantity, notes });
        return data;
    },
    updateInventory: async (id: string | number, payload: any): Promise<any> => {
        const { data } = await api.patch(`v1/inventory/records/${id}/`, payload);
        return data;
    },
};
