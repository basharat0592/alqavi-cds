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
    getAdminOrders: async (params?: any) => {
        const { data } = await api.get('v1/sales/orders/', { params });
        return Array.isArray(data) ? data : data.results || [];
    },
    deleteOrder: async (id: string) => {
        await api.delete(`v1/sales/orders/${id}/`);
    },
    // Customer-initiated cancellation (allowed only before the order ships).
    requestCancel: async (id: string) => {
        const { data } = await api.post(`v1/sales/orders/${id}/request_cancel/`, {});
        return data;
    },
    // Customer confirms they received the order (admin still confirms to finalize).
    confirmDelivery: async (id: string) => {
        const { data } = await api.post(`v1/sales/orders/${id}/confirm_delivery/`, {});
        return data;
    },
    // Returns
    getReturns: async (params?: any) => {
        const { data } = await api.get('v1/sales/returns/', { params });
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
