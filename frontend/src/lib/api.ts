import axios from 'axios';
import api from './axios';
import type {
    Product, ProductParams, Order, OrderItem,
    AppUser, AppRole, ActivityLog,
    CompanyInfo, CompanyCategory, UserSettingsData, ProductCategory, PaginatedResponse,
} from '@/types';

// Base URL for unauthenticated public requests
const PUBLIC_API = process.env.NEXT_PUBLIC_API_URL || 'http://127.0.0.1:8000/api';

// Re-export types consumed by other modules that import from '@/lib/api'
export type { Product, ProductParams, Order, AppUser, AppRole, ActivityLog, CompanyInfo, CompanyCategory, UserSettingsData, ProductCategory, PaginatedResponse };

export const productService = {
    getAll: async (params?: ProductParams): Promise<Product[]> => {
        let apiProducts: Product[] = [];
        try {
            const { data } = await api.get('/v1/products/items/', { params });
            apiProducts = data.results || data || [];
        } catch (error: any) {
            if (error.response?.status !== 401) {
                console.error("API Fetch Error", error);
            }
        }

        if (typeof window !== 'undefined') {
            const localProducts = JSON.parse(localStorage.getItem('qavi_products') || '[]');
            const apiIds = new Set(apiProducts.map(p => String(p.id)));
            const filteredLocal = localProducts.filter((p: any) => !apiIds.has(String(p.id)));
            return [...filteredLocal, ...apiProducts];
        }
        return apiProducts;
    },
    getPaginated: async (params?: ProductParams): Promise<PaginatedResponse<Product>> => {
        const page = Number(params?.page) || 1;
        const limit = 10;
        const offset = (page - 1) * limit;

        try {
            // First, get all potential results to handle consistent slicing across merged data
            // Since we must merge local storage, we need the full picture or at least a stable slice
            const { data } = await api.get('/v1/products/items/', { params: { ...params, all_items: 'true', page: undefined, limit: undefined } });
            let apiProducts: Product[] = data.results || (Array.isArray(data) ? data : []);
            let totalApiCount = data.count || apiProducts.length;

            if (typeof window !== 'undefined') {
                const localProducts = JSON.parse(localStorage.getItem('qavi_products') || '[]');
                const apiIds = new Set(apiProducts.map(p => String(p.id)));
                const filteredLocal = localProducts.filter((p: any) => !apiIds.has(String(p.id)));
                
                const combined = [...filteredLocal, ...apiProducts];
                const sliced = combined.slice(offset, offset + limit);
                
                return {
                    results: sliced,
                    count: combined.length,
                    next: offset + limit < combined.length ? String(page + 1) : null,
                    previous: page > 1 ? String(page - 1) : null
                };
            }

            // Fallback if no window/localStorage
            const sliced = apiProducts.slice(offset, offset + limit);
            return {
                results: sliced,
                count: totalApiCount,
                next: offset + limit < totalApiCount ? String(page + 1) : null,
                previous: page > 1 ? String(page - 1) : null
            };
        } catch (error) {
            console.error("Paginated API Fetch Error", error);
            const all = await productService.getAll(params);
            const sliced = all.slice(offset, offset + limit);
            return {
                results: sliced,
                count: all.length,
                next: offset + limit < all.length ? String(page + 1) : null,
                previous: page > 1 ? String(page - 1) : null
            };
        }
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
        return await categoryService.getAll();
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
                stock: 0, // Force 0, stock must come from Inventory module
                description: data.get('description'),
                image: savedProduct?.image || null,
                category_name: 'Cosmetics',
                created_at: new Date().toISOString()
            } : { ...data, id: savedProduct?.id || `lp-${Date.now()}`, created_at: new Date().toISOString() };

            localProducts.unshift(newProduct);
            localStorage.setItem('qavi_products', JSON.stringify(localProducts));
            return (savedProduct || newProduct) as Product;
        }
        return savedProduct as Product;
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

                    // Removed manual stock update to protect Inventory integrity


                    // If image is updated in FormData, we can't save the File object to localStorage,
                    // but if the API succeeded (updated is not null), we use the returned URL.
                    if (updated?.image_url) {
                        updatedFields.image_url = updated.image_url;
                    } else if (updated?.image) {
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
    },
    adjustStock: async (id: string | number, adjustment: number) => {
        try {
            const response = await api.post(`/v1/products/items/${id}/adjust-stock/`, { adjustment });
            return response.data;
        } catch (error) {
            console.error("Stock adjustment failed", error);
            if (typeof window !== 'undefined') {
                const localProducts = JSON.parse(localStorage.getItem('qavi_products') || '[]');
                const idx = localProducts.findIndex((p: any) => String(p.id) === String(id));
                if (idx !== -1) {
                    localProducts[idx].quantity_in_stock = (localProducts[idx].quantity_in_stock || 0) + adjustment;
                    localStorage.setItem('qavi_products', JSON.stringify(localProducts));
                    return localProducts[idx];
                }
            }
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
            // For simple getAll, we just merge all.
            return [...localOrders, ...apiOrders];
        }
        return apiOrders;
    },
    getPaginated: async (params?: any): Promise<PaginatedResponse<Order>> => {
        const page = Number(params?.page) || 1;
        const limit = 10;
        const offset = (page - 1) * limit;

        try {
            const response = await api.get('/v1/sales/orders/', { params: { ...params, page: undefined, limit: undefined } });
            const data = response.data;
            let apiOrders: Order[] = data.results || (Array.isArray(data) ? data : []);
            let totalApiCount = data.count || apiOrders.length;

            if (typeof window !== 'undefined') {
                const localOrders = JSON.parse(localStorage.getItem('qavi_orders') || '[]');
                const apiIds = new Set(apiOrders.map(o => String(o.id)));
                const filteredLocal = localOrders.filter((o: any) => !apiIds.has(String(o.id)));

                const combined = [...filteredLocal, ...apiOrders];
                const sliced = combined.slice(offset, offset + limit);
                
                return {
                    results: sliced,
                    count: combined.length,
                    next: offset + limit < combined.length ? String(page + 1) : null,
                    previous: page > 1 ? String(page - 1) : null
                };
            }

            const sliced = apiOrders.slice(offset, offset + limit);
            return {
                results: sliced,
                count: totalApiCount,
                next: offset + limit < totalApiCount ? String(page + 1) : null,
                previous: page > 1 ? String(page - 1) : null
            };
        } catch (error) {
            console.error("Order Paginated Fetch Error", error);
            const all = await orderService.getAll(params);
            const sliced = all.slice(offset, offset + limit);
            return {
                results: sliced,
                count: all.length,
                next: offset + limit < all.length ? String(page + 1) : null,
                previous: page > 1 ? String(page - 1) : null
            };
        }
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
    getById: async (id: number | string): Promise<any> => {
        try {
            const { data } = await api.get(`/v1/users/roles/${id}/`);
            return data;
        } catch (error) {
            if (typeof window !== 'undefined') {
                const roles = JSON.parse(localStorage.getItem('qavi_roles') || '[]');
                return roles.find((r: any) => String(r.id) === String(id));
            }
            throw error;
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
            throw error;
        }
    },
    update: async (id: number | string, data: any) => {
        try { return (await api.patch(`/v1/users/roles/${id}/`, data)).data; } catch (error) {
            if (typeof window !== 'undefined') {
                const roles = JSON.parse(localStorage.getItem('qavi_roles') || '[]');
                const idx = roles.findIndex((r: any) => String(r.id) === String(id));
                if (idx !== -1) {
                    roles[idx] = { ...roles[idx], ...data };
                    localStorage.setItem('qavi_roles', JSON.stringify(roles));
                    return roles[idx];
                }
            }
            throw error;
        }
    },
    delete: async (id: number | string) => {
        try { await api.delete(`/v1/users/roles/${id}/`); } catch (error) { }
        if (typeof window !== 'undefined') {
            const roles = JSON.parse(localStorage.getItem('qavi_roles') || '[]');
            localStorage.setItem('qavi_roles', JSON.stringify(roles.filter((r: any) => String(r.id) !== String(id))));
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

export const permissionService = {
    getAll: async (): Promise<any[]> => {
        try {
            const { data } = await api.get('/v1/users/permissions/');
            const apiPerms = data.results || data || [];
            if (typeof window !== 'undefined') localStorage.setItem('qavi_permissions', JSON.stringify(apiPerms));
            return apiPerms;
        } catch (error) {
            console.error("Failed to fetch permissions", error);
            return typeof window !== 'undefined' ? JSON.parse(localStorage.getItem('qavi_permissions') || '[]') : [];
        }
    },
    getById: async (id: number | string): Promise<any> => {
        try {
            const { data } = await api.get(`/v1/users/permissions/${id}/`);
            return data;
        } catch (error) {
            if (typeof window !== 'undefined') {
                return JSON.parse(localStorage.getItem('qavi_permissions') || '[]').find((p: any) => String(p.id) === String(id));
            }
        }
    },
    create: async (data: any) => {
        try { return (await api.post('/v1/users/permissions/', data)).data; } catch (error) {
            if (typeof window !== 'undefined') {
                const perms = JSON.parse(localStorage.getItem('qavi_permissions') || '[]');
                const newPerm = { ...data, id: Date.now() };
                perms.unshift(newPerm);
                localStorage.setItem('qavi_permissions', JSON.stringify(perms));
                return newPerm;
            }
        }
    },
    update: async (id: number | string, data: any) => {
        try { return (await api.patch(`/v1/users/permissions/${id}/`, data)).data; } catch (error) {
            if (typeof window !== 'undefined') {
                const perms = JSON.parse(localStorage.getItem('qavi_permissions') || '[]');
                const idx = perms.findIndex((p: any) => String(p.id) === String(id));
                if (idx !== -1) {
                    perms[idx] = { ...perms[idx], ...data };
                    localStorage.setItem('qavi_permissions', JSON.stringify(perms));
                    return perms[idx];
                }
            }
        }
    },
    delete: async (id: number | string) => {
        try { await api.delete(`/v1/users/permissions/${id}/`); } catch (error) { }
        if (typeof window !== 'undefined') {
            const perms = JSON.parse(localStorage.getItem('qavi_permissions') || '[]');
            localStorage.setItem('qavi_permissions', JSON.stringify(perms.filter((p: any) => String(p.id) !== String(id))));
        }
    }
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

// ─── Company Contact Service ──────────────────────────────────────────────────



// ─── Product Category Service ─────────────────────────────────────────────────

export const categoryService = {
    getAll: async (): Promise<ProductCategory[]> => {
        let apiCats: ProductCategory[] = [];
        try {
            // Use authenticated api instance to match backend permission requirements
            const { data } = await api.get('/v1/products/categories/');
            apiCats = Array.isArray(data) ? data : data.results || [];
        } catch (error) {
            console.error("Failed to fetch categories from API", error);
        }

        if (typeof window !== 'undefined') {
            const localCats = JSON.parse(localStorage.getItem('qavi_product_categories') || '[]');
            const apiIds = new Set(apiCats.map(c => String(c.id)));
            // Keep local categories that haven't been synced to the API yet
            const uniqueLocal = localCats.filter((c: any) => !apiIds.has(String(c.id)));
            const merged = [...uniqueLocal, ...apiCats];
            localStorage.setItem('qavi_product_categories', JSON.stringify(merged));
            return merged;
        }
        return apiCats;
    },
    create: async (payload: Partial<ProductCategory>): Promise<ProductCategory> => {
        let saved = null;
        try {
            const { data } = await api.post('/v1/products/categories/', payload);
            saved = data;
        } catch (error) {
            console.error("Failed to create category on API", error);
        }

        if (typeof window !== 'undefined') {
            const list = JSON.parse(localStorage.getItem('qavi_product_categories') || '[]');
            const newItem = {
                ...payload,
                id: saved?.id || `pcat-${Date.now()}`,
                status: payload.status || 'active',
                created_at: new Date().toISOString()
            } as ProductCategory;
            list.unshift(newItem);
            localStorage.setItem('qavi_product_categories', JSON.stringify(list));
            return saved || newItem;
        }
        if (!saved) throw new Error("Failed to create category");
        return saved;
    },
    update: async (id: string | number, payload: Partial<ProductCategory>): Promise<ProductCategory> => {
        let updated = null;
        try {
            const { data } = await api.patch(`/v1/products/categories/${id}/`, payload);
            updated = data;
        } catch (error) {
            console.error("Failed to update category on API", error);
        }

        if (typeof window !== 'undefined') {
            const list = JSON.parse(localStorage.getItem('qavi_product_categories') || '[]');
            const idx = list.findIndex((c: any) => String(c.id) === String(id));
            if (idx !== -1) {
                list[idx] = { ...list[idx], ...payload, ...(updated || {}) };
                localStorage.setItem('qavi_product_categories', JSON.stringify(list));
                return list[idx];
            }
        }
        if (!updated) throw new Error("Failed to update category");
        return updated;
    },
    delete: async (id: string | number): Promise<void> => {
        try {
            await api.delete(`/v1/products/categories/${id}/`);
        } catch (error) {
            console.error("Failed to delete category on API", error);
        }
        if (typeof window !== 'undefined') {
            const list = JSON.parse(localStorage.getItem('qavi_product_categories') || '[]');
            localStorage.setItem('qavi_product_categories', JSON.stringify(list.filter((c: any) => String(c.id) !== String(id))));
        }
    }
};


// ─── Supplier Service ──────────────────────────────────────────────────────────


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

// ─── Inventory Service ────────────────────────────────────────────────────────
export const inventoryService = {
    getInventory: async (params?: any): Promise<any[]> => {
        try {
            const { data } = await api.get('/v1/inventory/records/', { params });
            let apiRecords = data.results || data || [];

            if (typeof window !== 'undefined') {
                const localRecords = JSON.parse(localStorage.getItem('qavi_inventory') || '[]');
                // Simple merge for now
                const apiIds = new Set(apiRecords.map((r: any) => String(r.id)));
                const filteredLocal = localRecords.filter((r: any) => !apiIds.has(String(r.id)));
                return [...filteredLocal, ...apiRecords];
            }
            return apiRecords;
        } catch { 
            if (typeof window !== 'undefined') {
                return JSON.parse(localStorage.getItem('qavi_inventory') || '[]');
            }
            return []; 
        }
    },
    getInventorySummary: async (): Promise<any> => {
        try {
            const { data } = await api.get('/v1/inventory/records/summary/');
            return data;
        } catch { 
            return { total_items: 0, low_stock_count: 0, expired_batches: 0 }; 
        }
    },
    getMovements: async (params?: any): Promise<any[]> => {
        try {
            const { data } = await api.get('/v1/inventory/movements/', { params });
            return data.results || data || [];
        } catch { return []; }
    },
    getBatches: async (params?: any): Promise<any[]> => {
        try {
            const { data } = await api.get('/v1/inventory/batches/', { params });
            return data.results || data || [];
        } catch { return []; }
    },
    getAdjustments: async (params?: any): Promise<any[]> => {
        try {
            const { data } = await api.get('/v1/inventory/adjustments/', { params });
            return data.results || data || [];
        } catch { return []; }
    },
    createAdjustment: async (payload: any): Promise<any> => {
        const { data } = await api.post('/v1/inventory/adjustments/', payload);
        return data;
    },
    getAlerts: async (params?: any): Promise<any[]> => {
        try {
            const { data } = await api.get('/v1/inventory/alerts/', { params });
            return data.results || data || [];
        } catch { return []; }
    },
    getWarehouses: async (params?: any): Promise<any[]> => {
        try {
            const { data } = await api.get('/v1/inventory/warehouses/', { params });
            return data.results || data || [];
        } catch { return []; }
    },
    createWarehouse: async (payload: any): Promise<any> => {
        const { data } = await api.post('/v1/inventory/warehouses/', payload);
        return data;
    },
    updateWarehouse: async (id: string | number, payload: any): Promise<any> => {
        const { data } = await api.patch(`/v1/inventory/warehouses/${id}/`, payload);
        return data;
    },
    deleteWarehouse: async (id: string | number): Promise<void> => {
        await api.delete(`/v1/inventory/warehouses/${id}/`);
    },
    deleteInventory: async (id: string | number): Promise<void> => {
        if (!id) return;
        const idStr = String(id);

        if (idStr.startsWith('li-') && typeof window !== 'undefined') {
            const localRecords = JSON.parse(localStorage.getItem('qavi_inventory') || '[]');
            const updated = localRecords.filter((r: any) => String(r.id) !== idStr);
            localStorage.setItem('qavi_inventory', JSON.stringify(updated));
            return;
        }
        
        try {
            await api.delete(`/v1/inventory/records/${idStr}/`);
        } catch (error: any) {
            // Ignore 404 as it means the record is already gone
            if (error.response?.status === 404) return;
            throw error;
        }
    },
    createInventory: async (payload: any): Promise<any> => {
        // If product ID is local (starts with lp-), we MUST save locally because server will reject non-UUID
        const isLocalProduct = String(payload.product).startsWith('lp-');

        if (isLocalProduct && typeof window !== 'undefined') {
            const localRecords = JSON.parse(localStorage.getItem('qavi_inventory') || '[]');
            const newRecord = {
                ...payload,
                id: `li-${Date.now()}`,
                created_at: new Date().toISOString(),
                // Use provided names if available, otherwise generic placeholders
                product_name: payload.product_name || "Product Registry",
                warehouse_name: payload.warehouse_name || "Storage Node"
            };
            localRecords.unshift(newRecord);
            localStorage.setItem('qavi_inventory', JSON.stringify(localRecords));

            // CRITICAL: Update the product's global "In Stock" count in local storage
            const localProducts = JSON.parse(localStorage.getItem('qavi_products') || '[]');
            const updatedProducts = localProducts.map((p: any) => {
                if (String(p.id) === String(payload.product)) {
                    const currentStock = Number(p.quantity_in_stock || 0);
                    const addedStock = Number(payload.quantity_available || 0);
                    return { ...p, quantity_in_stock: currentStock + addedStock };
                }
                return p;
            });
            localStorage.setItem('qavi_products', JSON.stringify(updatedProducts));

            return newRecord;
        }

        const { data } = await api.post('/v1/inventory/records/', payload);
        return data;
    }
};

// ─── Return Service ───────────────────────────────────────────────────────────

// Payments Module Services
export const paymentCategoryService = {
    getAll: async () => {
        const { data } = await api.get('/v1/payments/categories/');
        return data.results || data || [];
    },
    create: async (payload: any) => {
        const { data } = await api.post('/v1/payments/categories/', payload);
        return data;
    },
    update: async (id: string | number, payload: any) => {
        const { data } = await api.patch(`/v1/payments/categories/${id}/`, payload);
        return data;
    },
    delete: async (id: string | number) => {
        await api.delete(`/v1/payments/categories/${id}/`);
    },
};

export const paymentService = {
    getAll: async (params = {}) => {
        const { data } = await api.get('/v1/payments/transactions/', { params });
        return data.results || data || [];
    },
    create: async (payload: any) => {
        const { data } = await api.post('/v1/payments/transactions/', payload);
        return data;
    },
    update: async (id: string | number, payload: any) => {
        const { data } = await api.patch(`/v1/payments/transactions/${id}/`, payload);
        return data;
    },
    delete: async (id: string | number) => {
        await api.delete(`/v1/payments/transactions/${id}/`);
    },
    getStats: async () => {
        const { data } = await api.get('/v1/payments/stats/summary/');
        return data;
    }
};

