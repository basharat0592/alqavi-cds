/**
 * useAdminNotifications - Hook for managing admin notifications
 * Handles real-time notifications for orders, users, and alerts
 */

import { useState, useEffect, useCallback } from 'react';
import { orderService, userService } from '@/lib/api';

export interface AdminNotification {
    id: string;
    type: 'order' | 'user' | 'alert';
    title: string;
    message: string;
    timestamp: string;
    read: boolean;
    icon?: string;
    actionUrl?: string;
}

export const useAdminNotifications = () => {
    const [notifications, setNotifications] = useState<AdminNotification[]>([]);
    const [unreadCount, setUnreadCount] = useState(0);
    const [loading, setLoading] = useState(false);

    const fetchNotifications = useCallback(async () => {
        try {
            setLoading(true);

            const [ordersRes, usersRes] = await Promise.all([
                orderService.getAll?.() ?? Promise.resolve([]),
                userService.getAll?.() ?? Promise.resolve([]),
            ]);

            const orders = Array.isArray(ordersRes) ? ordersRes : (ordersRes as any)?.results || [];
            const users = Array.isArray(usersRes) ? usersRes : (usersRes as any)?.results || [];

            const notifs: AdminNotification[] = [];

            const sortedOrders = [...orders].sort((a: any, b: any) => new Date(b.created_at || b.date || 0).getTime() - new Date(a.created_at || a.date || 0).getTime());
            // Add recent orders as notifications
            sortedOrders.slice(0, 5).forEach((order: any) => {
                const c = order.customer as any;
                const customerName = order.customer_name || (c?.first_name ? `${c.first_name} ${c.last_name || ''}`.trim() : c?.username || c?.email || (typeof order.customer === 'string' ? order.customer : 'Guest'));

                notifs.push({
                    id: `order-${order.id}`,
                    type: 'order',
                    title: `Order #${order.order_number || order.orderNumber || order.id}`,
                    message: `New order from ${customerName}`,
                    timestamp: new Date(order.created_at || order.date || Date.now()).toISOString(),
                    read: false,
                    actionUrl: '/admin/sales',
                });
            });

            const sortedUsers = [...users].sort((a: any, b: any) => new Date(b.date_joined || b.created_at || 0).getTime() - new Date(a.date_joined || a.created_at || 0).getTime());
            // Add recent users as notifications
            sortedUsers.slice(0, 3).forEach((user: any) => {
                const userName = user.first_name ? `${user.first_name} ${user.last_name || ''}`.trim() : user.name || user.email || user.username;
                notifs.push({
                    id: `user-${user.id}`,
                    type: 'user',
                    title: 'New User Registration',
                    message: `${userName} joined`,
                    timestamp: new Date(user.date_joined || user.created_at || Date.now()).toISOString(),
                    read: false,
                    actionUrl: '/admin/users',
                });
            });

            // Sort by timestamp descending
            notifs.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

            setNotifications(notifs);
            setUnreadCount(notifs.filter(n => !n.read).length);
            setLoading(false);
        } catch (error) {
            console.error('Failed to fetch notifications:', error);
            setLoading(false);
        }
    }, []);

    const markAsRead = useCallback((id: string) => {
        setNotifications(prev =>
            prev.map(n => n.id === id ? { ...n, read: true } : n)
        );
        setUnreadCount(prev => Math.max(0, prev - 1));
    }, []);

    const markAllAsRead = useCallback(() => {
        setNotifications(prev => prev.map(n => ({ ...n, read: true })));
        setUnreadCount(0);
    }, []);

    const dismissNotification = useCallback((id: string) => {
        setNotifications(prev => prev.filter(n => n.id !== id));
    }, []);

    useEffect(() => {
        fetchNotifications();
        const interval = setInterval(fetchNotifications, 20000); // Refresh every 20s
        return () => clearInterval(interval);
    }, [fetchNotifications]);

    return {
        notifications,
        unreadCount,
        loading,
        markAsRead,
        markAllAsRead,
        dismissNotification,
        refresh: fetchNotifications,
    };
};
