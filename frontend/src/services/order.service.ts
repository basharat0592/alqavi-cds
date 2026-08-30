import api from '@/lib/axios';
import { Order, PaginatedResponse } from '@/types';

export const orderService = {
    getAll: async (params?: any) => {
        const response = await api.get('v1/sales/orders/', { params: { no_pagination: 'true', ...params } });
        return response.data.results || response.data || [];
    },
    getPaginated: async (params?: any): Promise<PaginatedResponse<Order>> => {
        try {
            const response = await api.get('v1/sales/orders/', { params });
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
        const response = await api.get(`v1/sales/orders/${id}/`);
        return response.data;
    },
    create: async (data: any) => {
        const response = await api.post('v1/sales/orders/', data);
        return response.data;
    },
    update: async (id: string, data: any) => {
        const response = await api.patch(`v1/sales/orders/${id}/`, data);
        return response.data;
    },
    // Dedicated settlement-date update (works even on locked/delivered orders).
    setDueDate: async (id: string, due_date: string) => {
        const response = await api.patch(`v1/sales/orders/${id}/set_due_date/`, { due_date });
        return response.data;
    },
    delete: async (id: string) => {
        await api.delete(`v1/sales/orders/${id}/`);
    },
    getStats: async (params?: any) => {
        const response = await api.get('v1/sales/orders/stats/', { params });
        return response.data;
    },
    // Dashboard series the stats endpoint does not cover: monthly gross profit
    // vs expenses, and delivered sales by product category.
    getAnalytics: async (params?: any) => {
        const response = await api.get('v1/sales/orders/analytics/', { params });
        return response.data as {
            monthly: { month: string; key: string; profit: number; expenses: number }[];
            categories: { name: string; value: number }[];
        };
    },
    getBoughtProducts: async () => {
        const response = await api.get('v1/sales/orders/bought_products/');
        return response.data.results || response.data || [];
    },
    // Outstanding balance (previous unpaid dues) for a registered customer — POS Prev. Bal.
    // Pass excludeOrderId to leave the current sale out (invoice / detail views).
    getCustomerBalance: async (customerId: string, excludeOrderId?: string) => {
        const params: any = { customer: customerId };
        if (excludeOrderId) params.exclude = excludeOrderId;
        const response = await api.get('v1/sales/orders/customer_balance/', { params });
        return response.data;
    },
};
