/**
 * useAdminAuth - Hook for managing admin authentication and permissions
 */

import { useState, useEffect, useCallback } from 'react';
import { authService } from '@/lib/auth';

export interface AdminUser {
    id: string;
    name: string;
    email: string;
    role: string;
    avatar?: string;
    permissions: string[];
}


export const useAdminAuth = () => {
    const [user, setUser] = useState<AdminUser | null>(null);
    const [loading, setLoading] = useState(true);
    const [isAuthenticated, setIsAuthenticated] = useState(false);

    const loadUser = useCallback(async () => {
        try {
            const authUser = authService.getUser?.();
            if (authUser) {
                setUser({
                    id: authUser.id || '',
                    name: authUser.name || (authUser as any).username || 'Admin',
                    email: authUser.email || '',
                    role: authUser.role || 'admin',
                    avatar: authUser.avatar,
                    permissions: (authUser as any).permissions || [],
                });
                setIsAuthenticated(true);
            } else {
                setIsAuthenticated(false);
            }
        } catch (error) {
            console.error('Failed to load user:', error);
            setIsAuthenticated(false);
        } finally {
            setLoading(false);
        }
    }, []);

    const logout = useCallback(async () => {
        try {
            await authService.logout?.();
            setUser(null);
            setIsAuthenticated(false);
        } catch (error) {
            console.error('Logout failed:', error);
        }
    }, []);

    const hasPermission = useCallback((permission: string) => {
        return user?.permissions?.includes(permission) || user?.role === 'admin';
    }, [user]);

    useEffect(() => {
        loadUser();
    }, [loadUser]);

    return {
        user,
        loading,
        isAuthenticated,
        logout,
        hasPermission,
        reload: loadUser,
    };
};
