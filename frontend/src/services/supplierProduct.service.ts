import api from '@/lib/axios';

export const supplierProductService = {
    getAll: async (params?: any): Promise<any> => {
        const { data } = await api.get('/v1/company/supplier-products/', { params });
        return data;
    },
    getById: async (id: string): Promise<any> => {
        const { data } = await api.get(`/v1/company/supplier-products/${id}/`);
        return data;
    },
    create: async (payload: any): Promise<any> => {
        const { data } = await api.post('/v1/company/supplier-products/create/', payload);
        return data;
    },
    update: async (id: string, payload: any): Promise<any> => {
        const { data } = await api.patch(`/v1/company/supplier-products/${id}/`, payload);
        return data;
    },
    delete: async (id: string): Promise<void> => {
        await api.delete(`/v1/company/supplier-products/${id}/`);
    },
};
