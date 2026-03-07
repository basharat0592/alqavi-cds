import axios from 'axios';
import api from './axios';
import type {
    Product, ProductParams, Order, OrderItem,
    AppUser, AppRole, ActivityLog,
    CompanyInfo, CompanyCategory, UserSettingsData,
} from '@/types';

// Base URL for unauthenticated public requests
const PUBLIC_API = process.env.NEXT_PUBLIC_API_URL || 'http://127.0.0.1:8000/api';

// Re-export types consumed by other modules that import from '@/lib/api'
export type { Product, ProductParams, Order, AppUser, AppRole, ActivityLog, CompanyInfo, CompanyCategory, UserSettingsData };

export const productService = {
    getAll: async (params?: ProductParams): Promise<Product[]> => {
        let apiProducts: Product[] = [];
        try {
            const { data } = await api.get('/v1/products/items/', { params });
            apiProducts = data.results || data || [];
        } catch (error) {
            console.error("API Fetch Error", error);
        }

        if (typeof window !== 'undefined') {
            const localProducts = JSON.parse(localStorage.getItem('qavi_products') || '[]');
            const apiIds = new Set(apiProducts.map(p => String(p.id)));
            const filteredLocal = localProducts.filter((p: any) => !apiIds.has(String(p.id)));
            return [...filteredLocal, ...apiProducts];
        }
        return apiProducts;
    },
    getById: async (id: string) => {
        try {
            const response = await api.get(`/v1/products/items/${id}/`);
            return response.data;
        } catch (error) {
            if (typeof window !== 'undefined') {
                const localProducts = JSON.parse(localStorage.getItem('qavi_products') || '[]');
                return localProducts.find((p: any) => String(p.id) === String(id)) || null;
            }
            throw error;
        }
    },
    getCategories: async () => {
        try {
            const response = await api.get('/v1/products/categories/');
            return response.data;
        } catch (error) {
            return [
                { id: 1, name: 'Skincare' }, { id: 2, name: 'Makeup' },
                { id: 3, name: 'Fragrance' }, { id: 4, name: 'Haircare' }
            ];
        }
    },
    getFeatured: async () => {
        const all = await productService.getAll();
        return all.slice(0, 8);
    },
    create: async (data: FormData | any) => {
        let savedProduct = null;
        try {
            const response = await api.post('/v1/products/items/', data, {
                headers: {
                    'Content-Type': data instanceof FormData ? 'multipart/form-data' : 'application/json',
                },
            });
            savedProduct = response.data;
        } catch (error) {
            console.warn("Product creation on API failed, using local storage");
        }

        if (typeof window !== 'undefined') {
            const localProducts = JSON.parse(localStorage.getItem('qavi_products') || '[]');
            const newProduct = (data instanceof FormData) ? {
                id: savedProduct?.id || `lp-${Date.now()}`,
                name: data.get('name'),
                price: parseFloat(data.get('price')?.toString() || '0'),
                stock: parseInt(data.get('quantity_in_stock')?.toString() || '0'),
                description: data.get('description'),
                image: savedProduct?.image || null,
                category_name: 'Cosmetics',
                created_at: new Date().toISOString()
            } : { ...data, id: savedProduct?.id || `lp-${Date.now()}`, created_at: new Date().toISOString() };

            localProducts.unshift(newProduct);
            localStorage.setItem('qavi_products', JSON.stringify(localProducts));
            return savedProduct || newProduct;
        }
        return savedProduct;
    },
    update: async (id: string, data: FormData | any) => {
        let updated = null;
        try {
            const response = await api.patch(`/v1/products/items/${id}/`, data, {
                headers: {
                    'Content-Type': data instanceof FormData ? 'multipart/form-data' : 'application/json',
                },
            });
            updated = response.data;
        } catch (error) {
            console.error("API Update Product failed", error);
        }

        if (typeof window !== 'undefined') {
            const localProducts = JSON.parse(localStorage.getItem('qavi_products') || '[]');
            const idx = localProducts.findIndex((p: any) => String(p.id) === String(id));
            if (idx !== -1) {
                let updatedFields = data instanceof FormData ? Object.fromEntries(data.entries()) : { ...data };

                // If it's FormData, handle special fields and images
                if (data instanceof FormData) {
                    const price = data.get('price');
                    if (price) updatedFields.price = parseFloat(price.toString());

                    const stock = data.get('quantity_in_stock') || data.get('stock');
                    if (stock) updatedFields.stock = parseInt(stock.toString());

                    // If image is updated in FormData, we can't save the File object to localStorage,
                    // but if the API succeeded (updated is not null), we use the returned URL.
                    if (updated?.image) {
                        updatedFields.image = updated.image;
                    } else if (data.get('image') instanceof File) {
                        // If API failed and we have a new file, we'd need a URL.
                        // For now we keep the old one or set a placeholder since we can't save binary in LS easily.
                        delete updatedFields.image;
                    }
                }

                localProducts[idx] = { ...localProducts[idx], ...updatedFields };
                localStorage.setItem('qavi_products', JSON.stringify(localProducts));
            }
        }
        return updated;
    },
    delete: async (id: string) => {
        try { await api.delete(`/v1/products/items/${id}/`); } catch (error) { }
        if (typeof window !== 'undefined') {
            const localProducts = JSON.parse(localStorage.getItem('qavi_products') || '[]');
            localStorage.setItem('qavi_products', JSON.stringify(localProducts.filter((p: any) => String(p.id) !== String(id))));
        }
    }
};

export const orderService = {
    getAll: async (params?: any) => {
        let apiOrders = [];
        try {
            const response = await api.get('/v1/sales/orders/', { params });
            apiOrders = response.data.results || response.data || [];
        } catch (error) { }

        if (typeof window !== 'undefined') {
            const localOrders = JSON.parse(localStorage.getItem('qavi_orders') || '[]');
            return [...localOrders, ...apiOrders];
        }
        return apiOrders;
    },
    getById: async (id: string) => {
        try { return (await api.get(`/v1/sales/orders/${id}/`)).data; } catch (error) {
            if (typeof window !== 'undefined') {
                return JSON.parse(localStorage.getItem('qavi_orders') || '[]').find((o: any) => String(o.id) === String(id));
            }
        }
    },
    create: async (data: any) => {
        try { return (await api.post('/v1/sales/orders/create/', data)).data; } catch (error) {
            if (typeof window !== 'undefined') {
                const orders = JSON.parse(localStorage.getItem('qavi_orders') || '[]');
                const newOrder = { ...data, id: `ORD-${Date.now()}`, created_at: new Date().toISOString() };
                orders.unshift(newOrder);
                localStorage.setItem('qavi_orders', JSON.stringify(orders));
                return newOrder;
            }
        }
    },
    update: async (id: string, data: any) => {
        let updated = null;
        try {
            const response = await api.patch(`/v1/sales/orders/${id}/update/`, data);
            updated = response.data;
        } catch (error) {
            console.error("API Update Order failed", error);
        }
        if (typeof window !== 'undefined') {
            const localOrders = JSON.parse(localStorage.getItem('qavi_orders') || '[]');
            const idx = localOrders.findIndex((o: any) => String(o.id) === String(id));
            if (idx !== -1) {
                localOrders[idx] = { ...localOrders[idx], ...data };
                localStorage.setItem('qavi_orders', JSON.stringify(localOrders));
                updated = localOrders[idx];
            }
        }
        return updated;
    },
    delete: async (id: string) => {
        try { await api.delete(`/v1/sales/orders/${id}/delete/`); } catch (error) { }
        if (typeof window !== 'undefined') {
            const localOrders = JSON.parse(localStorage.getItem('qavi_orders') || '[]');
            localStorage.setItem('qavi_orders', JSON.stringify(localOrders.filter((o: any) => String(o.id) !== String(id))));
        }
    }
};



export const dashboardService = {
    getStats: async () => {
        const [products, orders] = await Promise.all([
            productService.getAll(),
            orderService.getAll(),
        ]);
        return {
            totalProducts: products.length,
            totalOrders: orders.length,
            totalCustomers: 0,
            totalRevenue: orders.reduce((sum: number, o: any) => sum + parseFloat(o.total_amount || o.total || 0), 0),
            todaySales: 0,
            growth: { revenue: 15, orders: 12, customers: 10 },
            lowStock: products.filter((p: any) => p.stock < 10).length,
            criticalStock: products.filter((p: any) => p.stock < 5).length
        };
    }
};

// ─── User Admin Service ───────────────────────────────────────────────────────

export const roleService = {
    getAll: async (): Promise<any[]> => {
        try {
            const { data } = await api.get('/v1/users/roles/');
            const apiRoles = data.results || data || [];
            if (typeof window !== 'undefined') localStorage.setItem('qavi_roles', JSON.stringify(apiRoles));
            return apiRoles;
        } catch (error) {
            return typeof window !== 'undefined' ? JSON.parse(localStorage.getItem('qavi_roles') || '[{"id":1,"name":"Admin"}]') : [];
        }
    },
    create: async (data: any) => {
        try { return (await api.post('/v1/users/roles/', data)).data; } catch (error) {
            if (typeof window !== 'undefined') {
                const roles = JSON.parse(localStorage.getItem('qavi_roles') || '[]');
                const newRole = { ...data, id: Date.now() };
                roles.push(newRole);
                localStorage.setItem('qavi_roles', JSON.stringify(roles));
                return newRole;
            }
        }
    }
};

export const userService = {
    getAll: async (params?: any): Promise<any[]> => {
        try {
            const { data } = await api.get('/v1/users/', { params });
            const apiUsers = data.results || data || [];
            if (typeof window !== 'undefined') {
                // Keep local users that are not in API
                const localUsers = JSON.parse(localStorage.getItem('registered_users') || '[]');
                const apiUsernames = new Set(apiUsers.map((u: any) => u.username));
                const uniqueLocal = localUsers.filter((u: any) => !apiUsernames.has(u.username));
                return [...uniqueLocal, ...apiUsers];
            }
            return apiUsers;
        } catch (error) {
            return typeof window !== 'undefined' ? JSON.parse(localStorage.getItem('registered_users') || '[]') : [];
        }
    },

    getById: async (id: number): Promise<AppUser> => {
        const { data } = await api.get(`/v1/users/${id}/`);
        return data;
    },

    create: async (userData: Partial<AppUser> & { password?: string, password_confirm?: string }): Promise<AppUser> => {
        let saved = null;
        try {
            const payload = {
                username: userData.email, // backend requires username
                email: userData.email,
                first_name: userData.first_name || '',
                last_name: userData.last_name || '',
                role: userData.role || null,
                phone: userData.phone || userData.phone_number || '',
                password: userData.password,
                password_confirm: userData.password_confirm || userData.password,
            };
            const { data } = await api.post('/v1/users/create/', payload);
            saved = data.user || data;
        } catch (error) { }

        if (typeof window !== 'undefined') {
            const users = JSON.parse(localStorage.getItem('registered_users') || '[]');
            const newUser = { ...userData, id: saved?.id || Date.now(), date_joined: new Date().toISOString() };
            users.unshift(newUser);
            localStorage.setItem('registered_users', JSON.stringify(users));
            return saved || newUser;
        }
        return saved;
    },

    update: async (id: number, updates: Partial<AppUser>): Promise<AppUser> => {
        const payload: any = { ...updates };
        if (payload.phone_number) {
            payload.phone = payload.phone_number;
            delete payload.phone_number;
        }
        if (payload.role && typeof payload.role === 'string' && isNaN(Number(payload.role))) {
            delete payload.role; // don't send string roles like 'admin' if changing backend expects ID
        } else if (payload.role) {
            payload.role = Number(payload.role);
        }

        const { data } = await api.patch(`/v1/users/${id}/update/`, payload);
        return data;
    },

    delete: async (id: number): Promise<void> => {
        try { await api.delete(`/v1/users/${id}/delete/`); } catch (error) { }
        if (typeof window !== 'undefined') {
            const users = JSON.parse(localStorage.getItem('registered_users') || '[]');
            localStorage.setItem('registered_users', JSON.stringify(users.filter((u: any) => u.id !== id)));
        }
    },

    activate: async (id: number): Promise<AppUser> => {
        const { data } = await api.post(`/v1/users/${id}/activate/`);
        return data;
    },

    deactivate: async (id: number): Promise<AppUser> => {
        const { data } = await api.post(`/v1/users/${id}/deactivate/`);
        return data;
    },

    assignRole: async (id: number, roleId: number): Promise<AppUser> => {
        const { data } = await api.post(`/v1/users/${id}/assign-role/`, { role_id: roleId });
        return data;
    },

    changePassword: async (id: number, payload: any): Promise<void> => {
        await api.post(`/v1/users/${id}/change-password/`, payload);
    },

    getActivityLogs: async (id: number, limit = 50): Promise<ActivityLog[]> => {
        const { data } = await api.get(`/v1/users/${id}/activity-logs/`, { params: { limit } });
        return data.results ?? data;
    },
};

// ─── Company Service ──────────────────────────────────────────────────────────

export const companyService = {
    getAll: async (): Promise<CompanyInfo[]> => {
        try {
            // Use unauthenticated axios — list_companies is AllowAny on the backend.
            // Sending a demo/invalid JWT token via the authenticated `api` instance
            // causes DRF to reject the request with 401 before checking permissions.
            const { data } = await axios.get(`${PUBLIC_API}/v1/company/`);
            const list: CompanyInfo[] = Array.isArray(data) ? data : data.results || [];
            if (typeof window !== 'undefined' && list.length > 0)
                localStorage.setItem('qavi_companies', JSON.stringify(list));
            return list;
        } catch {
            // fallback to localStorage cache
            if (typeof window !== 'undefined') {
                const cached = localStorage.getItem('qavi_companies');
                if (cached) return JSON.parse(cached);
            }
            return [];
        }
    },

    getById: async (id: number): Promise<CompanyInfo | null> => {
        try {
            const { data } = await api.get(`/v1/company/${id}/`);
            return data;
        } catch {
            if (typeof window !== 'undefined') {
                const cached = JSON.parse(localStorage.getItem('qavi_companies') || '[]');
                return cached.find((c: any) => String(c.id) === String(id)) || null;
            }
            return null;
        }
    },

    create: async (payload: Partial<CompanyInfo>): Promise<CompanyInfo> => {
        let saved: CompanyInfo | null = null;
        // Use unauthenticated axios — backend is AllowAny; the demo JWT causes 401
        // before DRF can check the permission class.
        try {
            const { data } = await axios.post(`${PUBLIC_API}/v1/company/create/`, payload, {
                headers: { 'Content-Type': 'application/json' },
            });
            console.log('✅ Company created via JSON:', data);
            saved = data;
        } catch (err: any) {
            console.error('❌ JSON create failed:', err?.response?.status, err?.response?.data || err.message);
            try {
                const fd = new FormData();
                Object.entries(payload).forEach(([k, v]) => {
                    if (v !== null && v !== undefined && v !== '') fd.append(k, String(v));
                });
                const { data } = await axios.post(`${PUBLIC_API}/v1/company/create/`, fd);
                console.log('✅ Company created via FormData:', data);
                saved = data;
            } catch (err2: any) {
                console.error('❌ FormData create failed:', err2?.response?.status, err2?.response?.data || err2.message);
                // Bubble up  error so the form can show it
                throw err2;
            }
        }
        // Sync localStorage cache
        if (typeof window !== 'undefined' && saved) {
            const list: CompanyInfo[] = JSON.parse(localStorage.getItem('qavi_companies') || '[]');
            const idx = list.findIndex((c: any) => String(c.id) === String(saved!.id));
            if (idx === -1) list.unshift(saved); else list[idx] = saved;
            localStorage.setItem('qavi_companies', JSON.stringify(list));
        }
        if (!saved) throw new Error('Failed to create company');
        return saved;
    },

    update: async (id: number, payload: Partial<CompanyInfo>): Promise<CompanyInfo> => {
        let saved: CompanyInfo | null = null;
        try {
            const { data } = await axios.patch(`${PUBLIC_API}/v1/company/${id}/`, payload, {
                headers: { 'Content-Type': 'application/json' },
            });
            saved = data;
        } catch {
            try {
                const fd = new FormData();
                Object.entries(payload).forEach(([k, v]) => {
                    if (v !== null && v !== undefined && v !== '') fd.append(k, String(v));
                });
                const { data } = await axios.patch(`${PUBLIC_API}/v1/company/${id}/`, fd);
                saved = data;
            } catch (err2) {
                throw err2;
            }
        }
        if (typeof window !== 'undefined' && saved) {
            const list: CompanyInfo[] = JSON.parse(localStorage.getItem('qavi_companies') || '[]');
            const idx = list.findIndex((c: any) => String(c.id) === String(id));
            if (idx === -1) list.unshift(saved); else list[idx] = saved;
            localStorage.setItem('qavi_companies', JSON.stringify(list));
        }
        if (!saved) throw new Error('Failed to update company');
        return saved;
    },

    delete: async (id: number): Promise<void> => {
        try { await axios.delete(`${PUBLIC_API}/v1/company/${id}/`); } catch { }
        if (typeof window !== 'undefined') {
            const list: CompanyInfo[] = JSON.parse(localStorage.getItem('qavi_companies') || '[]');
            localStorage.setItem('qavi_companies', JSON.stringify(list.filter((c: any) => String(c.id) !== String(id))));
        }
    },
};

// ─── Company Category Service ─────────────────────────────────────────────────

export const companyCategoryService = {
    getAll: async (): Promise<CompanyCategory[]> => {
        try {
            const { data } = await axios.get(`${PUBLIC_API}/v1/company/categories/`);
            const list = Array.isArray(data) ? data : data.results || [];
            if (typeof window !== 'undefined') localStorage.setItem('qavi_company_categories', JSON.stringify(list));
            return list;
        } catch {
            if (typeof window !== 'undefined') {
                return JSON.parse(localStorage.getItem('qavi_company_categories') || '[]');
            }
            return [];
        }
    },
    create: async (payload: Partial<CompanyCategory>): Promise<CompanyCategory> => {
        try {
            const { data } = await axios.post(`${PUBLIC_API}/v1/company/categories/create/`, payload);
            if (typeof window !== 'undefined') {
                const list = JSON.parse(localStorage.getItem('qavi_company_categories') || '[]');
                list.unshift(data);
                localStorage.setItem('qavi_company_categories', JSON.stringify(list));
            }
            return data;
        } catch (error) {
            if (typeof window !== 'undefined') {
                const list = JSON.parse(localStorage.getItem('qavi_company_categories') || '[]');
                const newItem = { ...payload, id: `cat-${Date.now()}`, created_at: new Date().toISOString() } as CompanyCategory;
                list.unshift(newItem);
                localStorage.setItem('qavi_company_categories', JSON.stringify(list));
                return newItem;
            }
            throw error;
        }
    },
    update: async (id: string | number, payload: Partial<CompanyCategory>): Promise<CompanyCategory> => {
        try {
            const { data } = await axios.patch(`${PUBLIC_API}/v1/company/categories/${id}/`, payload);
            if (typeof window !== 'undefined') {
                const list = JSON.parse(localStorage.getItem('qavi_company_categories') || '[]');
                const idx = list.findIndex((c: any) => String(c.id) === String(id));
                if (idx !== -1) { list[idx] = data; localStorage.setItem('qavi_company_categories', JSON.stringify(list)); }
            }
            return data;
        } catch (error) {
            if (typeof window !== 'undefined') {
                const list = JSON.parse(localStorage.getItem('qavi_company_categories') || '[]');
                const idx = list.findIndex((c: any) => String(c.id) === String(id));
                if (idx !== -1) { list[idx] = { ...list[idx], ...payload }; localStorage.setItem('qavi_company_categories', JSON.stringify(list)); return list[idx]; }
            }
            throw error;
        }
    },
    delete: async (id: string | number): Promise<void> => {
        try { await axios.delete(`${PUBLIC_API}/v1/company/categories/${id}/`); } catch { }
        if (typeof window !== 'undefined') {
            const list = JSON.parse(localStorage.getItem('qavi_company_categories') || '[]');
            localStorage.setItem('qavi_company_categories', JSON.stringify(list.filter((c: any) => String(c.id) !== String(id))));
        }
    }
};

// ─── Purchase Service ────────────────────────────────────────────────────────

export const purchaseService = {
    getAll: async (params?: any): Promise<any[]> => {
        try {
            const { data } = await api.get('/v1/purchases/', { params });
            const list = data.results || data || [];
            if (typeof window !== 'undefined') localStorage.setItem('qavi_purchases', JSON.stringify(list));
            return list;
        } catch {
            return typeof window !== 'undefined'
                ? JSON.parse(localStorage.getItem('qavi_purchases') || '[]') : [];
        }
    },
    getById: async (id: number | string): Promise<any> => {
        try { return (await api.get(`/v1/purchases/${id}/`)).data; } catch {
            return typeof window !== 'undefined'
                ? JSON.parse(localStorage.getItem('qavi_purchases') || '[]').find((p: any) => String(p.id) === String(id)) : null;
        }
    },
    create: async (data: any): Promise<any> => {
        try { return (await api.post('/v1/purchases/', data)).data; } catch {
            if (typeof window !== 'undefined') {
                const list = JSON.parse(localStorage.getItem('qavi_purchases') || '[]');
                const newItem = { ...data, id: `PO-${Date.now()}`, created_at: new Date().toISOString(), status: data.status || 'Pending' };
                list.unshift(newItem);
                localStorage.setItem('qavi_purchases', JSON.stringify(list));
                return newItem;
            }
        }
    },
    update: async (id: number | string, data: any): Promise<any> => {
        try { return (await api.patch(`/v1/purchases/${id}/`, data)).data; } catch {
            if (typeof window !== 'undefined') {
                const list = JSON.parse(localStorage.getItem('qavi_purchases') || '[]');
                const idx = list.findIndex((p: any) => String(p.id) === String(id));
                if (idx !== -1) { list[idx] = { ...list[idx], ...data }; localStorage.setItem('qavi_purchases', JSON.stringify(list)); return list[idx]; }
            }
        }
    },
    delete: async (id: number | string): Promise<void> => {
        try { await api.delete(`/v1/purchases/${id}/`); } catch { }
        if (typeof window !== 'undefined') {
            const list = JSON.parse(localStorage.getItem('qavi_purchases') || '[]');
            localStorage.setItem('qavi_purchases', JSON.stringify(list.filter((p: any) => String(p.id) !== String(id))));
        }
    },
    getSuppliers: async (): Promise<any[]> => {
        try {
            const { data } = await api.get('/v1/suppliers/');
            return data.results || data || [];
        } catch {
            return [];
        }
    },
};

// ─── Settings Service ─────────────────────────────────────────────────────────

export const settingsService = {
    /** GET /api/v1/users/settings/ — fetch current user's settings */
    getSettings: async (): Promise<UserSettingsData> => {
        const { data } = await api.get('/v1/users/settings/');
        return data;
    },

    /** PATCH /api/v1/users/settings/update/ — partial update */
    updateSettings: async (payload: Partial<UserSettingsData>): Promise<UserSettingsData> => {
        const { data } = await api.patch('/v1/users/settings/update/', payload);
        return data;
    },

    /** PATCH profile: first_name, last_name, email, phone  */
    updateProfile: async (userId: number, payload: {
        first_name?: string;
        last_name?: string;
        email?: string;
        phone?: string;
    }): Promise<any> => {
        const { data } = await api.patch(`/v1/users/${userId}/update/`, payload);
        return data;
    },

    /** POST change-password */
    changePassword: async (userId: number, old_password: string, new_password: string, new_password_confirm: string): Promise<void> => {
        await api.post(`/v1/users/${userId}/change-password/`, {
            old_password,
            new_password,
            new_password_confirm,
        });
    },

    /** GET current user profile */
    getProfile: async (): Promise<any> => {
        const { data } = await api.get('/v1/users/profile/');
        return data;
    },
};
