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
    }
};
