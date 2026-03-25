import axios from 'axios';
import api from '@/lib/axios';

const PUBLIC_API = (process.env.NEXT_PUBLIC_API_URL || 'http://127.0.0.1:8000/api').replace(/\/$/, '');

export const mainCategoryService = {
    getAll: async (): Promise<any[]> => {
        const { data } = await axios.get(`${PUBLIC_API}/v1/products/main-categories/`);
        return Array.isArray(data) ? data : data.results || [];
    },
    getById: async (id: string | number): Promise<any> => {
        const { data } = await axios.get(`${PUBLIC_API}/v1/products/main-categories/${id}/`);
        return data;
    },
    create: async (payload: any): Promise<any> => {
        const { data } = await api.post('/v1/products/main-categories/', payload);
        return data;
    },
    update: async (id: string | number, payload: any): Promise<any> => {
        const { data } = await api.patch(`/v1/products/main-categories/${id}/`, payload);
        return data;
    },
    delete: async (id: string | number): Promise<void> => {
        await api.delete(`/v1/products/main-categories/${id}/`);
    }
};
