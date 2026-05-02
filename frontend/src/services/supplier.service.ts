import api from '@/lib/axios';

/**
 * Service for managing Suppliers.
 * Linked to the Supplier model via company endpoints.
 */
export const supplierService = {
    getAll: async (params?: any): Promise<any[]> => {
        try {
            const { data } = await api.get('v1/company/suppliers/', { params });
            return Array.isArray(data) ? data : data.results || [];
        } catch (error) {
            console.error("Failed to fetch suppliers", error);
            return [];
        }
    },
    getById: async (id: string | number): Promise<any> => {
        const { data } = await api.get(`v1/company/suppliers/${id}/`);
        return data;
    },
    create: async (payload: any): Promise<any> => {
        const { data } = await api.post('v1/company/suppliers/create/', payload);
        return data;
    },
    update: async (id: string | number, payload: any): Promise<any> => {
        const { data } = await api.patch(`v1/company/suppliers/${id}/`, payload);
        return data;
    },
    delete: async (id: string | number): Promise<void> => {
        await api.delete(`v1/company/suppliers/${id}/`);
    }
};
