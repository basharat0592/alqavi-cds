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
        const { data } = await api.get('v1/delivery/persons/', { params });
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
    // Assign / clear a rider on an order (admin).
    assignToOrder: async (orderId: string, riderId: number | string | null): Promise<any> => {
        const { data } = await api.patch(`v1/sales/orders/${orderId}/assign_delivery/`, { delivery_person: riderId });
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
    changePassword: async (oldPassword: string, newPassword: string): Promise<any> => {
        const { data } = await api.post('v1/delivery/change-password/', {
            old_password: oldPassword, new_password: newPassword,
        });
        return data;
    },
};
