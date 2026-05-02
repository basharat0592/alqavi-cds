import axios from 'axios';
import api from '@/lib/axios';
import { ProductCategory } from '@/types';

const PUBLIC_API = process.env.NEXT_PUBLIC_API_URL || 'http://127.0.0.1:8000/api';

export const categoryService = {
    getAll: async (params?: any): Promise<ProductCategory[]> => {
        // Categories are public — no auth token needed
        const { data } = await axios.get(`${PUBLIC_API}/v1/products/categories/`, { params });
        return Array.isArray(data) ? data : data.results || [];
    },
    create: async (payload: Partial<ProductCategory>): Promise<ProductCategory> => {
        const { data } = await api.post('v1/products/categories/', payload);
        return data;
    },
    update: async (id: string | number, payload: Partial<ProductCategory>): Promise<ProductCategory> => {
        const { data } = await api.patch(`v1/products/categories/${id}/`, payload);
        return data;
    },
    delete: async (id: string | number): Promise<void> => {
        await api.delete(`v1/products/categories/${id}/`);
    }
};
