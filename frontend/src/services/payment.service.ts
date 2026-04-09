import api from '@/lib/axios';

export const paymentCategoryService = {
    getAll: async () => {
        const { data } = await api.get('v1/payments/categories/');
        return data.results || data || [];
    },
    create: async (payload: any) => {
        const { data } = await api.post('v1/payments/categories/', payload);
        return data;
    },
    update: async (id: string | number, payload: any) => {
        const { data } = await api.patch(`v1/payments/categories/${id}/`, payload);
        return data;
    },
    delete: async (id: string | number) => {
        await api.delete(`v1/payments/categories/${id}/`);
    },
};

export const paymentService = {
    getAll: async (params = {}) => {
        const { data } = await api.get('v1/payments/transactions/', { params });
        return data.results || data || [];
    },
    create: async (payload: any) => {
        const { data } = await api.post('v1/payments/transactions/', payload);
        return data;
    },
    update: async (id: string | number, payload: any) => {
        const { data } = await api.patch(`v1/payments/transactions/${id}/`, payload);
        return data;
    },
    delete: async (id: string | number) => {
        await api.delete(`v1/payments/transactions/${id}/`);
    },
    getStats: async () => {
        const { data } = await api.get('v1/payments/stats/summary/');
        return data;
    }
};
