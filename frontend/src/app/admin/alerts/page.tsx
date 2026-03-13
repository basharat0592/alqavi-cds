'use client';

import React, { useState, useEffect } from 'react';
import { productService, orderService } from '@/lib/api';
import {
    Bell, AlertTriangle, ShoppingBag, Package,
    ArrowRight, CheckCircle2, Clock, Filter,
    RefreshCw, Search, ChevronRight
} from 'lucide-react';
import Link from 'next/link';

export default function AlertsPage() {
    const [loading, setLoading] = useState(true);
    const [alerts, setAlerts] = useState<any[]>([]);
    const [filter, setFilter] = useState('all'); // all, stock, orders

    const fetchAlerts = async () => {
        setLoading(true);
        try {
            const [pRes, oRes] = await Promise.allSettled([
                productService.getAll(),
                orderService.getAll()
            ]);

            const newAlerts: any[] = [];

            if (pRes.status === 'fulfilled') {
                const products = Array.isArray(pRes.value) ? pRes.value : [];
                products.forEach((p: any) => {
                    const stock = parseInt(p.quantity_in_stock ?? p.stock ?? 0);
                    if (stock < 10) {
                        newAlerts.push({
                            id: `stock-${p.id}`,
                            type: 'stock',
                            priority: stock === 0 ? 'high' : 'medium',
                            title: stock === 0 ? 'Out of Stock' : 'Low Stock Warning',
                            message: `"${p.name}" has ${stock} units remaining.`,
                            time: 'System Monitor',
                            href: `/admin/products?search=${p.name}`,
                            icon: AlertTriangle,
                            color: stock === 0 ? 'text-red-600' : 'text-amber-600',
                            bg: stock === 0 ? 'bg-red-50' : 'bg-amber-50',
                            meta: `SKU: ${p.sku || 'N/A'}`
                        });
                    }
                });
            }

            if (oRes.status === 'fulfilled') {
                const orders = Array.isArray(oRes.value) ? oRes.value : [];
                orders.filter((o: any) => o.status === 'Pending' || o.status === 'Processing').forEach((o: any) => {
                    newAlerts.push({
                        id: `order-${o.id}`,
                        type: 'order',
                        priority: o.status === 'Pending' ? 'high' : 'medium',
                        title: o.status === 'Pending' ? 'New Order Awaiting Review' : 'Order in Processing',
                        message: `Order #${o.order_number || o.id} from ${o.customer_name || 'Guest'} needs attention.`,
                        time: new Date(o.created_at).toLocaleDateString(),
                        href: '/admin/sales',
                        icon: ShoppingBag,
                        color: 'text-[#007185]',
                        bg: 'bg-blue-50',
                        meta: `Amount: RS ${o.total_amount || 0}`
                    });
                });
            }

            // Sort by priority (high first) and type
            setAlerts(newAlerts.sort((a, b) => (a.priority === 'high' ? -1 : 1)));
        } catch (err) {
            console.error("Alerts load error", err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchAlerts();
    }, []);

    const filteredAlerts = alerts.filter(a => {
        if (filter === 'all') return true;
        if (filter === 'stock') return a.type === 'stock';
        if (filter === 'orders') return a.type === 'order';
        return true;
    });

    return (
        <div className="max-w-5xl mx-auto pb-12">
            {/* Header Area */}
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 mb-8">
                <div>
                    <h1 className="text-2xl font-black text-gray-900 flex items-center gap-3">
                        <Bell className="text-[#FF9900]" />
                        Alerts Center
                    </h1>
                    <p className="text-sm text-gray-500 mt-1 font-medium">Critical system alerts, low stock warnings, and pending order requirements.</p>
                </div>
                <div className="flex items-center gap-2">
                    <button
                        onClick={fetchAlerts}
                        className="p-2 bg-white border border-gray-300 rounded hover:bg-gray-50 text-gray-600 transition-colors"
                        title="Refresh Data"
                    >
                        <RefreshCw size={18} className={loading ? 'animate-spin' : ''} />
                    </button>
                    <div className="bg-white border border-gray-300 rounded flex p-1 shadow-sm">
                        <button
                            onClick={() => setFilter('all')}
                            className={`px-4 py-1.5 text-xs font-bold rounded transition-all ${filter === 'all' ? 'bg-[#FF9900] text-white' : 'text-gray-600 hover:bg-gray-50'}`}
                        >
                            All
                        </button>
                        <button
                            onClick={() => setFilter('stock')}
                            className={`px-4 py-1.5 text-xs font-bold rounded transition-all ${filter === 'stock' ? 'bg-[#FF9900] text-white' : 'text-gray-600 hover:bg-gray-50'}`}
                        >
                            Stock
                        </button>
                        <button
                            onClick={() => setFilter('orders')}
                            className={`px-4 py-1.5 text-xs font-bold rounded transition-all ${filter === 'orders' ? 'bg-[#FF9900] text-white' : 'text-gray-600 hover:bg-gray-50'}`}
                        >
                            Orders
                        </button>
                    </div>
                </div>
            </div>

            {/* Content Area */}
            {loading ? (
                <div className="space-y-4">
                    {[1, 2, 3].map(i => (
                        <div key={i} className="bg-white border border-gray-200 h-32 rounded-lg animate-pulse" />
                    ))}
                </div>
            ) : filteredAlerts.length === 0 ? (
                <div className="bg-white border border-dashed border-gray-300 rounded-xl py-20 text-center">
                    <div className="w-16 h-16 bg-emerald-50 text-emerald-600 rounded-full flex items-center justify-center mx-auto mb-4">
                        <CheckCircle2 size={32} />
                    </div>
                    <h3 className="text-lg font-bold text-gray-900">All Clear!</h3>
                    <p className="text-sm text-gray-500 max-w-xs mx-auto mt-2 font-medium">No critical alerts found. Your inventory and orders are currently in good standing.</p>
                </div>
            ) : (
                <div className="space-y-4">
                    {filteredAlerts.map((alert) => (
                        <Link
                            key={alert.id}
                            href={alert.href}
                            className="bg-white border border-gray-200 rounded-lg p-5 flex items-start gap-5 hover:border-[#FF9900] hover:shadow-md transition-all group"
                        >
                            <div className={`w-12 h-12 ${alert.bg} ${alert.color} rounded-xl flex items-center justify-center shrink-0`}>
                                <alert.icon size={24} strokeWidth={2.5} />
                            </div>
                            <div className="flex-1 min-w-0">
                                <div className="flex items-center justify-between gap-2 mb-1">
                                    <h3 className={`text-base font-black tracking-tight ${alert.color}`}>
                                        {alert.title}
                                    </h3>
                                    <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">{alert.time}</span>
                                </div>
                                <p className="text-sm text-gray-700 font-medium mb-3 leading-relaxed">
                                    {alert.message}
                                </p>
                                <div className="flex items-center justify-between">
                                    <span className="text-xs font-bold text-gray-400 bg-gray-50 px-2 py-0.5 rounded border border-gray-100 uppercase tracking-tight">
                                        {alert.meta}
                                    </span>
                                    <span className="flex items-center gap-1 text-[#007185] group-hover:text-[#FF9900] text-xs font-bold transition-colors">
                                        Take Action <ChevronRight size={14} />
                                    </span>
                                </div>
                            </div>
                        </Link>
                    ))}
                </div>
            )}

            {/* Footer Summary */}
            {!loading && filteredAlerts.length > 0 && (
                <p className="mt-8 text-center text-[11px] font-bold text-gray-400 uppercase tracking-[0.2em]">
                    Showing {filteredAlerts.length} Active System Notifications
                </p>
            )}
        </div>
    );
}
