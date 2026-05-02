import api from '@/lib/axios';

export const salesService = {
    getOrders: async () => {
        const { data } = await api.get('v1/sales/orders/');
        return Array.isArray(data) ? data : data.results || [];
    },
    trackOrder: async (trackingId: string) => {
        const { data } = await api.get(`v1/sales/orders/track/?tid=${trackingId}`);
        return data;
    },
    createOrder: async (payload: any) => {
        const { data } = await api.post('v1/sales/orders/', payload);
        return data;
    },
    updateOrderStatus: async (id: string, status: string) => {
        const { data } = await api.patch(`v1/sales/orders/${id}/update_status/`, { status });
        return data;
    },
    getAdminOrders: async () => {
        const { data } = await api.get('v1/sales/orders/');
        return Array.isArray(data) ? data : data.results || [];
    },
    deleteOrder: async (id: string) => {
        await api.delete(`v1/sales/orders/${id}/`);
    },
    // Returns
    getReturns: async () => {
        const { data } = await api.get('v1/sales/returns/');
        return Array.isArray(data) ? data : data.results || [];
    },
    createReturn: async (payload: any) => {
        const { data } = await api.post('v1/sales/returns/', payload);
        return data;
    },
    getBoughtProducts: async () => {
        const { data } = await api.get('v1/sales/orders/bought_products/');
        return data;
    },
    deleteReturn: async (id: string) => {
        await api.delete(`v1/sales/returns/${id}/`);
    }
};
