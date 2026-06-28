import api from '@/lib/axios';

/**
 * Service for managing Product catalog items.
 * Linked to the new Stock-integrated Product model.
 */
export const productService = {
    // ── Product Registry ─────────────────────────────────────────────────────
    getAll: async (params?: any): Promise<any> => {
        try {
            const { data } = await api.get('v1/products/items/', { params });
            // Return the full response object so the caller can handle pagination
            return data;
        } catch (error) {
            console.error("Failed to fetch product registry", error);
            return [];
        }
    },
    getById: async (id: string | number): Promise<any> => {
        const { data } = await api.get(`v1/products/items/${id}/`);
        return data;
    },
    // Super-admin master store catalog (consolidated listings).
    getStoreCatalog: async (): Promise<any[]> => {
        const { data } = await api.get('v1/products/store-catalog/');
        return Array.isArray(data) ? data : data?.results || [];
    },
    createStoreListing: async (payload: any): Promise<any> => {
        if (payload.image instanceof File) {
            const fd = new FormData();
            Object.entries(payload).forEach(([k, v]) => {
                if (v !== null && v !== undefined && v !== '') fd.append(k, v as any);
            });
            const { data } = await api.post('v1/products/store-catalog/', fd, {
                headers: { 'Content-Type': 'multipart/form-data' },
            });
            return data;
        }
        const { image, ...rest } = payload;
        const { data } = await api.post('v1/products/store-catalog/', rest);
        return data;
    },
    updateStoreListing: async (id: string | number, payload: any): Promise<any> => {
        if (payload.image instanceof File) {
            const fd = new FormData();
            Object.entries(payload).forEach(([k, v]) => {
                if (v !== null && v !== undefined && v !== '') fd.append(k, v as any);
            });
            const { data } = await api.patch(`v1/products/store-catalog/${id}/`, fd, {
                headers: { 'Content-Type': 'multipart/form-data' },
            });
            return data;
        }
        const { image, ...rest } = payload;
        const { data } = await api.patch(`v1/products/store-catalog/${id}/`, rest);
        return data;
    },
    deleteStoreListing: async (id: string | number): Promise<void> => {
        await api.delete(`v1/products/store-catalog/${id}/`);
    },
    getProducts: async (params?: any): Promise<any> => {
        return productService.getAll(params);
    },
    create: async (payload: any): Promise<any> => {
        const { data } = await api.post('v1/products/items/', payload, {
            headers: {
                'Content-Type': payload instanceof FormData ? 'multipart/form-data' : 'application/json',
            },
        });
        return data;
    },
    update: async (id: string | number, payload: any): Promise<any> => {
        const { data } = await api.patch(`v1/products/items/${id}/`, payload, {
            headers: {
                'Content-Type': payload instanceof FormData ? 'multipart/form-data' : 'application/json',
            },
        });
        return data;
    },
    delete: async (id: string | number): Promise<void> => {
        await api.delete(`v1/products/items/${id}/`);
    },

    // ── Wishlist Operations ──────────────────────────────────────────────────
    getWishlist: async (): Promise<any[]> => {
        try {
            const { data } = await api.get('v1/products/wishlist/');
            return data.results || data || [];
        } catch {
            return [];
        }
    },
    addToWishlist: async (productId: string | number): Promise<any> => {
        const { data } = await api.post('v1/products/wishlist/', { product: productId });
        return data;
    },
    removeFromWishlist: async (id: string | number): Promise<void> => {
        await api.delete(`v1/products/wishlist/${id}/`);
    },

    // ── Supplier Specific Listings ──────────────────────────────────────────
    getAllSupplier: async (params?: any): Promise<any> => {
        try {
            const { data } = await api.get('v1/products/supplier-items/', { params });
            return data;
        } catch (error) {
            console.error("Failed to fetch supplier products", error);
            return { results: [] };
        }
    },
    getByIdSupplier: async (id: string | number): Promise<any> => {
        const { data } = await api.get(`v1/products/supplier-items/${id}/`);
        return data;
    },
    createSupplier: async (payload: any): Promise<any> => {
        const { data } = await api.post('v1/products/supplier-items/', payload, {
            headers: {
                'Content-Type': payload instanceof FormData ? 'multipart/form-data' : 'application/json',
            },
        });
        return data;
    },
    updateSupplier: async (id: string | number, payload: any): Promise<any> => {
        const { data } = await api.patch(`v1/products/supplier-items/${id}/`, payload, {
            headers: {
                'Content-Type': payload instanceof FormData ? 'multipart/form-data' : 'application/json',
            },
        });
        return data;
    },
    deleteSupplier: async (id: string | number): Promise<void> => {
        await api.delete(`v1/products/supplier-items/${id}/`);
    },

    // ── Helpers ──────────────────────────────────────────────────────────────
    getCategories: async () => {
        return [];
    }
};
