/**
 * useAdminDashboard - Hook for managing admin dashboard data
 * Handles fetching and caching dashboard statistics
 */

import { useState, useEffect, useCallback } from 'react';
import { productService, orderService, userService } from '@/lib/api';
import type { DashboardStats, RevenueDataPoint } from '@/types';

export type { DashboardStats, RevenueDataPoint };

export interface DashboardData {
    stats: DashboardStats;
    recentOrders: any[];
    recentUsers: any[];
    topProducts: any[];
    products: any[];
    orders: any[];
    revenueData: RevenueDataPoint[];
    revenueData30: RevenueDataPoint[];
    loading: boolean;
    error: string | null;
}

export const useAdminDashboard = () => {
    const [data, setData] = useState<DashboardData>({
        stats: {
            totalOrders: 0,
            totalRevenue: 0,
            totalProducts: 0,
            activeUsers: 0,
            ordersToday: 0,
            pendingOrders: 0,
            totalCustomers: 0,
            revenueChange: 0,
            ordersChange: 0,
            productsChange: 0,
            customersChange: 0,
        },
        recentOrders: [],
        recentUsers: [],
        topProducts: [],
        products: [],
        orders: [],
        revenueData: [],
        revenueData30: [],
        loading: true,
        error: null,
    });

    const fetchDashboardData = async () => {
        try {
            setData(prev => ({ ...prev, loading: true, error: null }));

            // Fetch all data in parallel
            const [ordersRes, usersRes, productsRes] = await Promise.all([
                orderService.getAll?.() ?? Promise.resolve([]),
                userService.getAll?.() ?? Promise.resolve([]),
                productService.getAll?.({ all_items: 'true' } as any) ?? Promise.resolve([]),
            ]);

            const orders = Array.isArray(ordersRes) ? ordersRes : (ordersRes as any)?.results || [];
            const users = Array.isArray(usersRes) ? usersRes : (usersRes as any)?.results || [];
            const products = Array.isArray(productsRes) ? productsRes : (productsRes as any)?.results || [];

            // Filter completed payments for revenue calculation
            const validOrders = orders.filter((o: any) => {
                const ps = (o.payment_status || '').toLowerCase();
                return ps === 'completed';
            });

            // Calculate statistics
            const totalRevenue = validOrders.reduce((sum: number, order: any) => sum + (parseFloat(order.total_amount || order.total || 0)), 0);
            const today = new Date().toDateString();
            const ordersToday = orders.filter((o: any) =>
                new Date(o.created_at || o.date || Date.now()).toDateString() === today
            ).length;

            const pendingOrders = orders.filter((o: any) =>
                (o.status || '').toLowerCase() === 'pending' || (o.status || '').toLowerCase() === 'processing'
            ).length;

            const recentOrders = [...orders]
                .sort((a: any, b: any) => new Date(b.created_at || b.date || 0).getTime() - new Date(a.created_at || a.date || 0).getTime())
                .slice(0, 5);

            const recentUsers = [...users].slice(-5).reverse();

            // Calculate real product sales from orders
            const productSales: Record<string, number> = {};
            orders.forEach((o: any) => {
                if ((o.status || '').toLowerCase() !== 'cancelled') {
                    (o.items || []).forEach((item: any) => {
                        const pid = String(item.product?.id || item.product || item.product_id);
                        if (pid && pid !== 'undefined' && pid !== 'null') {
                            productSales[pid] = (productSales[pid] || 0) + (item.quantity || 1);
                        }
                    });
                }
            });

            // Map calculated sales back to products and sort
            const enhancedProducts = products.map((p: any) => ({
                ...p,
                sales: productSales[String(p.id)] || 0
            }));

            const topProducts = enhancedProducts
                .sort((a: any, b: any) => (b.sales || 0) - (a.sales || 0))
                .slice(0, 5);

            // 7-day chart
            const revenueData: RevenueDataPoint[] = [];
            for (let i = 6; i >= 0; i--) {
                const d = new Date();
                d.setDate(d.getDate() - i);
                const dateStr = d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
                const dayOrders = orders.filter((o: any) =>
                    new Date(o.created_at || o.date || Date.now()).toDateString() === d.toDateString()
                );
                const validDayOrders = validOrders.filter((o: any) =>
                    new Date(o.created_at || o.date || Date.now()).toDateString() === d.toDateString()
                );
                const dayRev = validDayOrders.reduce((sum: number, o: any) =>
                    sum + parseFloat(o.total_amount || o.total || 0), 0
                );
                revenueData.push({
                    date: dateStr,
                    revenue: dayRev,
                    orders: dayOrders.length,
                });
            }

            // 30-day chart
            const revenueData30: RevenueDataPoint[] = [];
            for (let i = 29; i >= 0; i--) {
                const d = new Date();
                d.setDate(d.getDate() - i);
                const dateStr = d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
                const dayOrders = orders.filter((o: any) =>
                    new Date(o.created_at || o.date || Date.now()).toDateString() === d.toDateString()
                );
                const validDayOrders = validOrders.filter((o: any) =>
                    new Date(o.created_at || o.date || Date.now()).toDateString() === d.toDateString()
                );
                const dayRev = validDayOrders.reduce((sum: number, o: any) =>
                    sum + parseFloat(o.total_amount || o.total || 0), 0
                );
                revenueData30.push({
                    date: dateStr,
                    revenue: dayRev,
                    orders: dayOrders.length,
                });
            }

            setData({
                stats: {
                    totalOrders: orders.length,
                    totalRevenue,
                    totalProducts: products.length,
                    activeUsers: users.length,
                    totalCustomers: users.length,
                    ordersToday,
                    pendingOrders,
                },
                recentOrders,
                recentUsers,
                topProducts,
                products: enhancedProducts,
                orders,
                revenueData,
                revenueData30,
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
    };

    useEffect(() => {
        fetchDashboardData();
    }, []);

    return { ...data, refetch: fetchDashboardData };
};
