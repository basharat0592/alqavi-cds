/**
 * useAdminDashboard - Hook for managing admin dashboard data
 * Handles fetching and caching dashboard statistics
 */

import { useState, useEffect, useCallback } from 'react';
import { productService, orderService, userService } from '@/lib/api';
import type { DashboardStats, RevenueDataPoint, ActivityLog } from '@/types';

export type { DashboardStats, RevenueDataPoint };

export interface DashboardData {
    stats: DashboardStats;
    recentOrders: any[];
    recentPurchases: any[];
    recentUsers: any[];
    topProducts: any[];
    products: any[];
    orders: any[];
    revenueData: RevenueDataPoint[];
    revenueData30: RevenueDataPoint[];
    activityLogs: ActivityLog[];
    loading: boolean;
    error: string | null;
}

export const useAdminDashboard = (filters: { date?: string; payment_method?: string } = {}) => {
    const [data, setData] = useState<DashboardData>({
        stats: {
            totalOrders: 0,
            totalRevenue: 0,
            totalProducts: 0,
            activeUsers: 0,
            ordersToday: 0,
            pendingOrders: 0,
            totalCustomers: 0,
            totalProfit: 0,
            revenueChange: 0,
            ordersChange: 0,
            totalPayable: 0,
            productsChange: 0,
            customersChange: 0,
        },
        recentOrders: [],
        recentPurchases: [],
        recentUsers: [],
        topProducts: [],
        products: [],
        orders: [],
        revenueData: [],
        revenueData30: [],
        activityLogs: [],
        loading: true,
        error: null,
    });

    const fetchDashboardData = useCallback(async () => {
        try {
            setData(prev => ({ ...prev, loading: true, error: null }));

            // Fetch comprehensive stats and other data in parallel
            const [statsData, usersRes, productsRes, activityRes] = await Promise.all([
                orderService.getStats(filters),
                userService.getAll?.() ?? Promise.resolve([]),
                productService.getAll?.({ all_items: 'true' } as any) ?? Promise.resolve([]),
                userService.getAllActivityLogs?.(10) ?? Promise.resolve([]),
            ]);

            const users = Array.isArray(usersRes) ? usersRes : (usersRes as any)?.results || [];
            const products = Array.isArray(productsRes) ? productsRes : (productsRes as any)?.results || [];
            const activityLogs = (Array.isArray(activityRes) ? activityRes : (activityRes as any)?.results || []).slice(0, 5);

            const history = statsData.revenue_history || [];
            
            setData({
                stats: {
                    totalOrders: statsData.total_orders || 0,
                    totalRevenue: statsData.total_revenue || 0,
                    totalProfit: statsData.total_profit || 0,
                    totalProducts: products.length,
                    activeUsers: users.length,
                    totalCustomers: users.length,
                    ordersToday: statsData.orders_today || 0,
                    pendingOrders: statsData.pending_orders || 0,
                    totalPayable: statsData.total_payable || 0,
                    deliveredOrders: statsData.delivered_orders || 0,
                    totalActive: statsData.total_active || 0,
                    systemTotal: statsData.system_total || 0,
                },
                recentOrders: statsData.recent_orders || [],
                recentPurchases: statsData.recent_purchases || [],
                recentUsers: users.slice(-5).reverse(),
                topProducts: statsData.top_products || [],
                products: products,
                orders: statsData.recent_orders || [],
                revenueData: history.slice(-7),
                revenueData30: history,
                activityLogs: activityLogs,
                loading: false,
                error: null,
            });
        } catch (err) {
            setData(prev => ({
                ...prev,
                loading: false,
                error: err instanceof Error ? err.message : 'Failed to fetch dashboard data',
            }));
        }
    }, [filters]);

    useEffect(() => {
        fetchDashboardData();
    }, [fetchDashboardData]);

    return { ...data, refetch: fetchDashboardData };
};
