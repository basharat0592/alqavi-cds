import api from '@/lib/axios';

export interface DeliveryPerson {
    id: number;
    username: string;
    email: string;
    first_name: string;
    last_name: string;
    name: string;
    phone: string;
    vehicle_type: string;
    vehicle_number: string;
    cnic?: string;
    address?: string;
    city?: string;
    area?: number | null;
    area_name?: string;
    warehouse?: number | null;
    warehouse_name?: string;
    status: string;
    is_active: boolean;
    plain_password?: string;
    active_deliveries?: number;
    completed_deliveries?: number;
    created_at?: string;
}

/** Admin-side CRUD for delivery riders. */
export const deliveryService = {
    getAll: async (params?: any): Promise<DeliveryPerson[]> => {
        // Rider list paginates client-side, so pull the full set (not just page 1).
        const { data } = await api.get('v1/delivery/persons/', { params: { no_pagination: 'true', ...params } });
        return data.results || data || [];
    },
    getById: async (id: number | string): Promise<DeliveryPerson> => {
        const { data } = await api.get(`v1/delivery/persons/${id}/`);
        return data;
    },
    create: async (payload: any): Promise<DeliveryPerson> => {
        const { data } = await api.post('v1/delivery/persons/', payload);
        return data;
    },
    update: async (id: number | string, payload: any): Promise<DeliveryPerson> => {
        const { data } = await api.patch(`v1/delivery/persons/${id}/`, payload);
        return data;
    },
    remove: async (id: number | string): Promise<void> => {
        await api.delete(`v1/delivery/persons/${id}/`);
    },
    // Assign / clear a rider on an order (admin), optionally setting the rider's payout.
    assignToOrder: async (orderId: string, riderId: number | string | null, deliveryFee?: number | string): Promise<any> => {
        const payload: any = { delivery_person: riderId };
        if (deliveryFee !== undefined && deliveryFee !== '') payload.delivery_fee = deliveryFee;
        const { data } = await api.patch(`v1/sales/orders/${orderId}/assign_delivery/`, payload);
        return data;
    },
};

/** Rider self-service (their own dashboard). */
export const riderService = {
    myDeliveries: async (status?: string): Promise<any> => {
        const { data } = await api.get('v1/delivery/my-deliveries/', { params: status ? { status } : {} });
        return data; // { rider, stats, results }
    },
    updateStatus: async (orderId: string, status: string): Promise<any> => {
        const { data } = await api.patch(`v1/delivery/orders/${orderId}/status/`, { status });
        return data;
    },
    // Upload proof-of-delivery photo (+ GPS location) for an assigned order.
    uploadProof: async (orderId: string, file: File, lat?: string, lng?: string): Promise<any> => {
        const fd = new FormData();
        fd.append('image', file);
        if (lat) fd.append('lat', lat);
        if (lng) fd.append('lng', lng);
        const { data } = await api.post(`v1/delivery/orders/${orderId}/proof/`, fd, {
            headers: { 'Content-Type': 'multipart/form-data' },
        });
        return data;
    },
    // Rider claims an unassigned order from their branch feed.
    accept: async (orderId: string): Promise<any> => {
        const { data } = await api.post(`v1/delivery/orders/${orderId}/accept/`, {});
        return data;
    },
    changePassword: async (oldPassword: string, newPassword: string): Promise<any> => {
        const { data } = await api.post('v1/delivery/change-password/', {
            old_password: oldPassword, new_password: newPassword,
        });
        return data;
    },
};
