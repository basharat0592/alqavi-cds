import api from '@/lib/axios';

export const purchaseService = {
    // ── Purchase Orders ──────────────────────────────────────────────────────
    getAll: async (params?: any): Promise<any> => {
        const { data } = await api.get('v1/sales/purchases/', { params });
        return data;
    },
    getById: async (id: string): Promise<any> => {
        const { data } = await api.get(`v1/sales/purchases/${id}/`);
        return data;
    },
    create: async (payload: any): Promise<any> => {
        const { data } = await api.post('v1/sales/purchases/create/', payload);
        return data;
    },
    update: async (id: string, payload: any): Promise<any> => {
        const { data } = await api.patch(`v1/sales/purchases/${id}/`, payload);
        return data;
    },
    delete: async (id: string): Promise<void> => {
        await api.delete(`v1/sales/purchases/${id}/`);
    },

    // ── Purchase Returns ─────────────────────────────────────────────────────
    getReturns: async (params?: any): Promise<any> => {
        const { data } = await api.get('v1/sales/purchase-returns/', { params });
        return data;
    },
    getReturnById: async (id: string): Promise<any> => {
        const { data } = await api.get(`v1/sales/purchase-returns/${id}/`);
        return data;
    },
    createReturn: async (payload: any): Promise<any> => {
        const { data } = await api.post('v1/sales/purchase-returns/create/', payload);
        return data;
    },
    updateReturn: async (id: string, payload: any): Promise<any> => {
        const { data } = await api.patch(`v1/sales/purchase-returns/${id}/`, payload);
        return data;
    },
    deleteReturn: async (id: string): Promise<void> => {
        await api.delete(`v1/sales/purchase-returns/${id}/`);
    },
    acceptReturn: async (id: string): Promise<any> => {
        const { data } = await api.post(`v1/sales/purchase-returns/${id}/accept/`);
        return data;
    },
    rejectReturn: async (id: string): Promise<any> => {
        const { data } = await api.post(`v1/sales/purchase-returns/${id}/reject/`);
        return data;
    },

    // ── Payment Verification ──────────────────────────────────────────────────
    acceptPayment: async (id: string): Promise<any> => {
        const { data } = await api.post(`v1/sales/purchases/${id}/accept_payment/`);
        return data;
    },
    rejectPayment: async (id: string, reason: string): Promise<any> => {
        const { data } = await api.post(`v1/sales/purchases/${id}/reject_payment/`, { reason });
        return data;
    },
};
