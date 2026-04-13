import api from '@/lib/axios';

/**
 * Service for managing Product catalog items.
 * Linked to the new Stock-integrated Product model.
 */
export const productService = {
    // ── Product Registry ─────────────────────────────────────────────────────
    getAll: async (params?: any): Promise<any[]> => {
        try {
            const { data } = await api.get('v1/products/items/', { params });
            return data.results || data || [];
        } catch (error) {
            console.error("Failed to fetch product registry", error);
            return [];
        }
    },
    getById: async (id: string | number): Promise<any> => {
        const { data } = await api.get(`v1/products/items/${id}/`);
        return data;
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

    // ── Helpers ──────────────────────────────────────────────────────────────
    getCategories: async () => {
        // Placeholder or link to category service if needed
        return [];
    }
};
