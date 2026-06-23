import api from '@/lib/axios';

export interface Area {
    id: number;
    name: string;
    code: string;
    description: string;
    parent: number | null;
    parent_name: string | null;
    is_active: boolean;
    created_at: string;
    customer_count: number;
    manager_count: number;
}

export const areaService = {
    getAll: async (params?: any): Promise<Area[]> => {
        const { data } = await api.get('v1/company/areas/', { params });
        return data.results || data || [];
    },
    getActive: async (): Promise<Area[]> => {
        const { data } = await api.get('v1/company/areas/', { params: { is_active: true } });
        const list: Area[] = data.results || data || [];
        return list.filter((a) => a.is_active);
    },
    create: async (payload: any): Promise<Area> => {
        const { data } = await api.post('v1/company/areas/', payload);
        return data;
    },
    update: async (id: number | string, payload: any): Promise<Area> => {
        const { data } = await api.patch(`v1/company/areas/${id}/`, payload);
        return data;
    },
    remove: async (id: number | string): Promise<void> => {
        await api.delete(`v1/company/areas/${id}/`);
    },
};

export default areaService;
