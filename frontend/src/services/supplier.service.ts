import api from '@/lib/axios';

export const supplierService = {
    // ── Supplier Management (B2B Catalog) ──────────────────────────────
    getAll: async (): Promise<any[]> => {
        const { data } = await api.get('/v1/supplier/list/');
        return Array.isArray(data) ? data : data.results || [];
    },
    getById: async (id: string): Promise<any> => {
        const { data } = await api.get(`/v1/supplier/list/${id}/`);
        return data;
    },
    getSupplierProducts: async (id: string): Promise<any[]> => {
        const { data } = await api.get(`/v1/supplier/list/${id}/products/`);
        return data;
    },

    // ── Purchase Orders (B2B Transactions) ─────────────────────────────
    getOrders: async (params?: any): Promise<any[]> => {
        const { data } = await api.get('/v1/supplier/orders/', { params });
        return Array.isArray(data) ? data : data.results || [];
    },
    getOrderById: async (id: string): Promise<any> => {
        const { data } = await api.get(`/v1/supplier/orders/${id}/`);
        return data;
    },
    createOrder: async (payload: { supplier: string; notes?: string; items: any[] }): Promise<any> => {
        const { data } = await api.post('/v1/supplier/orders/', payload);
        return data;
    },
    updateOrderStatus: async (id: string, status: string): Promise<any> => {
        const { data } = await api.patch(`/v1/supplier/orders/${id}/status/`, { status });
        return data;
    },

    // ── Supplier CRUD (Management) ────────────────────────────────────
    create: async (payload: any): Promise<any> => {
        const { data } = await api.post('/v1/supplier/list/', payload);
        return data;
    },
    update: async (id: string | number, payload: any): Promise<any> => {
        const { data } = await api.patch(`/v1/supplier/list/${id}/`, payload);
        return data;
    },
    delete: async (id: string | number): Promise<void> => {
        await api.delete(`/v1/supplier/list/${id}/`);
    }
};
