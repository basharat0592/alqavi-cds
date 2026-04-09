import api from '@/lib/axios';
import { AppUser, ActivityLog, UserSettingsData } from '@/types';

export const roleService = {
    getAll: async (): Promise<any[]> => {
        const { data } = await api.get('v1/users/roles/');
        return data.results || data || [];
    },
    getById: async (id: number | string): Promise<any> => {
        const { data } = await api.get(`v1/users/roles/${id}/`);
        return data;
    },
    create: async (data: any) => {
        const response = await api.post('v1/users/roles/create/', data);
        return response.data;
    },
    update: async (id: number | string, data: any) => {
        const response = await api.patch(`v1/users/roles/${id}/`, data);
        return response.data;
    },
    delete: async (id: number | string) => {
        await api.delete(`v1/users/roles/${id}/`);
    },
};

export const userService = {
    getAll: async (params?: any): Promise<any[]> => {
        const { data } = await api.get('v1/users/', { params });
        return data.results || data || [];
    },
    getById: async (id: number): Promise<AppUser> => {
        const { data } = await api.get(`v1/users/${id}/`);
        return data;
    },
    create: async (userData: Partial<AppUser> & { password?: string, password_confirm?: string }): Promise<AppUser> => {
        const payload = {
            username: userData.email,
            email: userData.email,
            first_name: userData.first_name || '',
            last_name: userData.last_name || '',
            role: userData.role || null,
            phone: userData.phone || userData.phone_number || '',
            password: userData.password,
            password_confirm: userData.password_confirm || userData.password,
        };
        const { data } = await api.post('v1/users/create/', payload);
        return data.user || data;
    },
    update: async (id: number, updates: Partial<AppUser>): Promise<AppUser> => {
        const payload: any = { ...updates };
        if (payload.phone_number) {
            payload.phone = payload.phone_number;
            delete payload.phone_number;
        }
        if (payload.role && typeof payload.role === 'string' && isNaN(Number(payload.role))) {
            delete payload.role;
        } else if (payload.role) {
            payload.role = Number(payload.role);
        }
        const { data } = await api.patch(`v1/users/${id}/update/`, payload);
        return data;
    },
    delete: async (id: number): Promise<void> => {
        await api.delete(`v1/users/${id}/delete/`);
    },
    activate: async (id: number): Promise<AppUser> => {
        const { data } = await api.post(`v1/users/${id}/activate/`);
        return data;
    },
    deactivate: async (id: number): Promise<AppUser> => {
        const { data } = await api.post(`v1/users/${id}/deactivate/`);
        return data;
    },
    assignRole: async (id: number, roleId: number): Promise<AppUser> => {
        const { data } = await api.post(`v1/users/${id}/assign-role/`, { role_id: roleId });
        return data;
    },
    changePassword: async (id: number, payload: any): Promise<void> => {
        await api.post(`v1/users/${id}/change-password/`, payload);
    },
    adminResetPassword: async (id: number, newPassword: string): Promise<void> => {
        await api.post(`v1/users/${id}/admin-reset-password/`, { new_password: newPassword });
    },
    getActivityLogs: async (id: number, limit = 50): Promise<ActivityLog[]> => {
        const { data } = await api.get(`v1/users/${id}/activity-logs/`, { params: { limit } });
        return data.results ?? data;
    },
    getAllActivityLogs: async (limit = 50): Promise<ActivityLog[]> => {
        const { data } = await api.get('v1/users/Admin/all-activity-logs/', { params: { limit } });
        return data.results ?? data;
    },
};

export const permissionService = {
    getAll: async (): Promise<any[]> => {
        const { data } = await api.get('v1/users/permissions/');
        return data.results || data || [];
    },
    getById: async (id: number | string): Promise<any> => {
        const { data } = await api.get(`v1/users/permissions/${id}/`);
        return data;
    },
    create: async (data: any) => {
        const response = await api.post('v1/users/permissions/', data);
        return response.data;
    },
    update: async (id: number | string, data: any) => {
        const response = await api.patch(`v1/users/permissions/${id}/`, data);
        return response.data;
    },
    delete: async (id: number | string) => {
        await api.delete(`v1/users/permissions/${id}/`);
    },
};

export const settingsService = {
    getSettings: async (): Promise<UserSettingsData> => {
        const { data } = await api.get('v1/users/settings/');
        return data;
    },
    updateSettings: async (payload: Partial<UserSettingsData>): Promise<UserSettingsData> => {
        const { data } = await api.patch('v1/users/settings/update/', payload);
        return data;
    },
    updateProfile: async (userId: number, payload: any): Promise<any> => {
        const { data } = await api.patch(`v1/users/${userId}/update/`, payload);
        return data;
    },
    changePassword: async (userId: number, old_password: string, new_password: string, new_password_confirm: string): Promise<void> => {
        await api.post(`v1/users/${userId}/change-password/`, {
            old_password,
            new_password,
            new_password_confirm,
        });
    },
    getProfile: async (): Promise<any> => {
        const { data } = await api.get('v1/users/profile/');
        return data;
    },
};
