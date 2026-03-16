'use client';

import api from './axios';

export type UserRole = 'admin';

export interface User {
    id: string;
    name: string;
    email: string;
    role: UserRole;
    avatar?: string;
}

const STORAGE_KEY_USER = 'cosmetic_distro_user';

export const authService = {
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
            authService.setSession(safeUser, token, refreshToken);
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
        localStorage.removeItem(STORAGE_KEY_USER);
        localStorage.removeItem('accessToken');
        localStorage.removeItem('refreshToken');
    },

    getUser: (): User | null => {
        if (typeof window === 'undefined') return null;
        const userStr = localStorage.getItem(STORAGE_KEY_USER);
        if (!userStr || userStr === 'undefined') return null;
        try {
            return JSON.parse(userStr);
        } catch (e) {
            return null;
        }
    },

    setSession: (user: User, token: string, refreshToken?: string) => {
        localStorage.setItem(STORAGE_KEY_USER, JSON.stringify(user));
        localStorage.setItem('accessToken', token);
        if (refreshToken) localStorage.setItem('refreshToken', refreshToken);
    },

    isAuthenticated: (): boolean => {
        if (typeof window === 'undefined') return false;
        return !!localStorage.getItem('accessToken');
    },

    updateProfile: async (userId: string, updates: Partial<User>): Promise<User> => {
        await new Promise((resolve) => setTimeout(resolve, 800));
        const currentUser = authService.getUser() || {} as User;
        const updatedUser = { ...currentUser, ...updates };
        authService.setSession(updatedUser, localStorage.getItem('accessToken') || '', localStorage.getItem('refreshToken') || '');
        return updatedUser;
    }
};
