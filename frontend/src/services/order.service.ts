import api from '@/lib/axios';
import { Order, PaginatedResponse } from '@/types';

export const orderService = {
    getAll: async (params?: any) => {
        const response = await api.get('/v1/sales/orders/', { params });
        return response.data.results || response.data || [];
    },
    getPaginated: async (params?: any): Promise<PaginatedResponse<Order>> => {
        try {
            const response = await api.get('/v1/sales/orders/', { params });
            const data = response.data;
            return {
                results: data.results || [],
                count: data.count || 0,
                next: data.next,
                previous: data.previous
            };
        } catch (error: any) {
            console.error("Order Paginated Fetch Error:", error.response?.status || error.message);
            return { results: [], count: 0, next: null, previous: null };
        }
    },
    getById: async (id: string) => {
        const response = await api.get(`/v1/sales/orders/${id}/`);
        return response.data;
    },
    create: async (data: any) => {
        const response = await api.post('/v1/sales/orders/create/', data);
        return response.data;
    },
    update: async (id: string, data: any) => {
        const response = await api.patch(`/v1/sales/orders/${id}/update/`, data);
        return response.data;
    },
    delete: async (id: string) => {
        await api.delete(`/v1/sales/orders/${id}/delete/`);
    }
};
