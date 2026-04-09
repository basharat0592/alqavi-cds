import api from '@/lib/axios';
import { PaginatedResponse, Product, ProductParams } from '@/types';
import { categoryService } from './category.service';

export const productService = {
    getAll: async (params?: ProductParams): Promise<Product[]> => {
        try {
            const { data } = await api.get('v1/products/items/', { params });
            const apiProducts = data.results || data || [];
            return apiProducts;
        } catch (error: any) {
            console.error("API Fetch Error", error);
            return [];
        }
    },
    getPaginated: async (params?: ProductParams): Promise<PaginatedResponse<Product>> => {
        try {
            const { data } = await api.get('v1/products/items/', { params });
            return {
                results: data.results || [],
                count: data.count || 0,
                next: data.next,
                previous: data.previous
            };
        } catch (error) {
            console.error("Paginated API Fetch Error", error);
            return { results: [], count: 0, next: null, previous: null };
        }
    },
    getById: async (id: string) => {
        const response = await api.get(`v1/products/items/${id}/`);
        return response.data;
    },
    getCategories: async () => {
        return await categoryService.getAll();
    },
    getFeatured: async () => {
        const all = await productService.getAll();
        return all.slice(0, 8);
    },
    create: async (data: FormData | any) => {
        const response = await api.post('v1/products/items/', data, {
            headers: {
                'Content-Type': data instanceof FormData ? 'multipart/form-data' : 'application/json',
            },
        });
        return response.data as Product;
    },
    update: async (id: string, data: FormData | any) => {
        const response = await api.patch(`v1/products/items/${id}/`, data, {
            headers: {
                'Content-Type': data instanceof FormData ? 'multipart/form-data' : 'application/json',
            },
        });
        return response.data;
    },
    delete: async (id: string) => {
        await api.delete(`v1/products/items/${id}/`);
    },
    adjustStock: async (id: string | number, adjustment: number) => {
        const response = await api.post(`v1/products/items/${id}/adjust-stock/`, { adjustment });
        return response.data;
    }
};
