'use client';

import api from './axios';

export type UserRole = 'admin' | 'customer' | 'supplier' | 'staff' | 'manager';

export interface User {
    id: string;
    name: string;
    first_name?: string;
    last_name?: string;
    email: string;
    role: UserRole | string;
    avatar?: string;
    phone?: string;
    phone_number?: string;
    is_staff?: boolean;
    is_superuser?: boolean;
}

const STORAGE_KEY_USER = 'cosmetic_distro_user';

export const authService = {
    // Registration API
    register: async (userData: any): Promise<User> => {
        try {
            const hasFile = Object.values(userData).some(v => v instanceof File);
            if (hasFile) {
                const fd = new FormData();
                Object.entries(userData).forEach(([k, v]) => {
                    if (v !== null && v !== undefined) fd.append(k, v as any);
                });
                const { data } = await api.post('/v1/users/register/', fd, {
                    headers: { 'Content-Type': 'multipart/form-data' }
                });
                return data as User;
            }
            const { data } = await api.post('/v1/users/register/', userData);
            return data as User;
        } catch (error: any) {
            throw authService.handleAuthError(error, "Registration failed.");
        }
    },

    registerSupplier: async (userData: any): Promise<User> => {
        try {
            const hasFile = Object.values(userData).some(v => v instanceof File);
            if (hasFile) {
                const fd = new FormData();
                Object.entries(userData).forEach(([k, v]) => {
                    if (v !== null && v !== undefined) fd.append(k, v as any);
                });
                const { data } = await api.post('/v1/users/register/supplier/', fd, {
                    headers: { 'Content-Type': 'multipart/form-data' }
                });
                return data as User;
            }
            const { data } = await api.post('/v1/users/register/supplier/', userData);
            return data as User;
        } catch (error: any) {
            throw authService.handleAuthError(error, "Supplier registration failed.");
        }
    },

    registerAdmin: async (userData: any): Promise<User> => {
        try {
            const { data } = await api.post('/v1/users/register/admin/', userData);
            return data as User;
        } catch (error: any) {
            throw authService.handleAuthError(error, "Admin registration failed.");
        }
    },

    handleAuthError: (error: any, defaultMsg: string): Error => {
        const detail = error.response?.data;
        let errorMessage = defaultMsg;
        console.error("Auth Error Detail:", detail);

        if (detail) {
            if (typeof detail === 'string') errorMessage = detail;
            else if (typeof detail === 'object') {
                const field = Object.keys(detail)[0];
                if (field && Array.isArray(detail[field])) {
                    errorMessage = `${field}: ${detail[field][0]}`;
                } else if (detail.detail) {
                    errorMessage = detail.detail;
                }
            }
        }
        return new Error(errorMessage);
    },

    // Login API
    login: async (emailOrUsername: string, password: string): Promise<{ user: User; token: string }> => {
        try {
            const { data } = await api.post('/v1/users/token/', {
                username: emailOrUsername,
                password: password
            });

            const token = data.access;
            const refreshToken = data.refresh;
            const safeUser = data.user as User;
            authService.setSession(token, refreshToken, safeUser);
            return { user: safeUser, token };
        } catch (error: any) {
            const isNetworkError = !error.response;
            console.error("Login Error:", error.response?.data || error.message);
            const errorMessage = error.response?.data?.detail ||
                error.response?.data?.message ||
                (isNetworkError ? "Cannot connect to server." : "Invalid credentials.");
            throw new Error(errorMessage);
        }
    },

    logout: () => {
        if (typeof window === 'undefined') return;
        sessionStorage.removeItem(STORAGE_KEY_USER);
        sessionStorage.removeItem('accessToken');
        sessionStorage.removeItem('refreshToken');
    },

    getUser: (): User | null => {
        if (typeof window === 'undefined') return null;
        const userStr = sessionStorage.getItem(STORAGE_KEY_USER);
        if (!userStr || userStr === 'undefined') return null;
        try {
            return JSON.parse(userStr);
        } catch (e) {
            return null;
        }
    },

    setSession: (token: string, refreshToken?: string, user?: User) => {
        if (typeof window === 'undefined') return;
        sessionStorage.setItem('accessToken', token);
        if (refreshToken) sessionStorage.setItem('refreshToken', refreshToken);
        if (user) sessionStorage.setItem(STORAGE_KEY_USER, JSON.stringify(user));
    },

    isAuthenticated: (): boolean => {
        if (typeof window === 'undefined') return false;
        return !!sessionStorage.getItem('accessToken');
    },

    getToken: () => {
        if (typeof window === 'undefined') return null;
        return sessionStorage.getItem('accessToken');
    },

    getRefreshToken: () => {
        if (typeof window === 'undefined') return null;
        return sessionStorage.getItem('refreshToken');
    },

    updateProfile: async (userId: string, updates: Partial<User>): Promise<User> => {
        // Mock update for now
        await new Promise((resolve) => setTimeout(resolve, 800));
        const currentUser = authService.getUser() || {} as User;
        const updatedUser = { ...currentUser, ...updates };
        authService.setSession(
            sessionStorage.getItem('accessToken') || '',
            sessionStorage.getItem('refreshToken') || '',
            updatedUser
        );
        return updatedUser;
    }
};
