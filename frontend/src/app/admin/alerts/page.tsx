'use client';

import React, { useState, useEffect, useRef } from 'react';
import { productService, orderService, userService } from '@/lib/api';
import { purchaseService } from '@/services/purchase.service';
import {
    Bell, AlertTriangle, ShoppingBag, CheckCircle2, Clock,
    RefreshCw, ChevronRight, Plus, Activity, ClipboardList,
    ShoppingCart, UserPlus, XCircle, ShieldCheck
} from 'lucide-react';
import Link from 'next/link';
import PageLoader from '@/components/ui/PageLoader';

/* ─────────────────────────────────────────────────────────────────────────────
   PURE AMAZON RETAIL DESIGN SYSTEM - SYSTEM MONITOR & ALERTS
   ───────────────────────────────────────────────────────────────────────────── */
const Btn = ({ children, onClick, loading, variant = 'primary', className = '', type = 'button', disabled = false }: any) => {
    const styles = {
        primary: 'bg-gradient-to-b from-[#f7dfa5] to-[#f0c14b] border-[#a88734] hover:from-[#f5d78e] hover:to-[#eeb933] text-[#0f1111] shadow-sm',
        secondary: 'bg-gradient-to-b from-[#f7f8fa] to-[#e7e9ec] border-[#adb1b8] hover:from-[#eef1f3] hover:to-[#dce0e4] text-[#0f1111] shadow-sm',
    };
    return (
        <button type={type} onClick={onClick} disabled={loading || disabled}
            className={`h-[29px] px-4 rounded-[3px] text-[13px] font-medium border transition-all flex items-center justify-center gap-2 disabled:opacity-60 active:scale-[0.98] whitespace-nowrap ${styles[variant as keyof typeof styles]} ${className}`}>
            {loading && <RefreshCw className="h-3 w-3 animate-spin" />}
            {children}
        </button>
    );
};

export default function AlertsPage() {
    const [loading, setLoading] = useState(true);
    const [alerts, setAlerts] = useState<any[]>([]);
    const [activities, setActivities] = useState<any[]>([]);
    const [lastUpdated, setLastUpdated] = useState(new Date());
    const pollingRef = useRef<any>(null);

    const fetchData = async (isSilent = false) => {
        if (!isSilent) setLoading(true);
        try {
            const [pRes, oRes, uRes, purRes] = await Promise.allSettled([
                productService.getAll(),
                orderService.getAll(),
                userService.getAll(),
                purchaseService.getAll()
            ]);

            const newAlerts: any[] = [];
            const newActivities: any[] = [];

            const getArr = (res: any) => {
                if (res.status !== 'fulfilled') return [];
                const val = res.value;
                if (Array.isArray(val)) return val;
                if (val && typeof val === 'object' && Array.isArray(val.results)) return val.results;
                return [];
            };

            const products = getArr(pRes);
            products.forEach((p: any) => {
                const stock = parseInt(p.quantity_in_stock ?? p.stock ?? 0);
                if (stock < 10) {
                    newAlerts.push({
                        id: `stock-${p.id}`,
                        productId: p.id,
                        type: stock === 0 ? 'Out of Stock' : 'Low Stock',
                        priority: stock === 0 ? 'high' : 'medium',
                        title: stock === 0 ? 'Out of Stock' : 'Low Stock',
                        product: p.name,
                        remaining: stock,
                        supplierName: p.supplier_name || p.company_name || 'Al-Qavi Hub',
                        sku: p.sku || 'No Identifier',
                        time: 'Live',
                        href: `/admin/products?search=${p.name}`,
                        icon: stock === 0 ? XCircle : AlertTriangle,
                        color: stock === 0 ? 'text-red-600' : 'text-amber-600',
                        bg: stock === 0 ? 'bg-red-50' : 'bg-amber-50',
                        border: stock === 0 ? 'border-red-200' : 'border-amber-200',
                    });
                }
            });

            const orders = getArr(oRes);
            orders.slice(0, 10).forEach((o: any) => {
                newActivities.push({
                    id: `sale-${o.id}`,
                    type: 'Sale',
                    title: 'New Order',
                    message: `Order #${o.order_number || o.id} • RS ${parseFloat(o.total_amount || 0).toLocaleString()} • ${o.customer_name || o.guest_name || 'Individual'}`,
                    time: new Date(o.created_at || Date.now()),
                    icon: ShoppingCart,
                    color: 'text-emerald-600',
                    bg: 'bg-emerald-50',
                    border: 'border-emerald-200'
                });
            });

            const users = getArr(uRes);
            users.slice(0, 5).forEach((u: any) => {
                newActivities.push({
                    id: `user-${u.id}`,
                    type: 'User',
                    title: 'User Registered',
                    message: `${u.first_name || u.username} verified as ${u.role_name || u.role || 'Member'}`,
                    time: new Date(u.date_joined || u.created_at || Date.now()),
                    icon: UserPlus,
                    color: 'text-blue-600',
                    bg: 'bg-blue-50',
                    border: 'border-blue-200'
                });
            });

            const purchases = getArr(purRes);
            purchases.slice(0, 10).forEach((p: any) => {
                newActivities.push({
                    id: `purchase-${p.id}`,
                    type: 'Purchase',
                    title: 'New Purchase Order',
                    message: `Purchase Order #${p.purchase_number || p.id} created for RS ${parseFloat(p.total_amount || 0).toLocaleString()}`,
                    time: new Date(p.created_at || Date.now()),
                    icon: ShoppingBag,
                    color: 'text-indigo-600',
                    bg: 'bg-indigo-50',
                    border: 'border-indigo-200'
                });
            });

            setAlerts(newAlerts.sort((a, b) => (a.priority === 'high' ? -1 : 1)));
            setActivities(newActivities.sort((a, b) => b.time.getTime() - a.time.getTime()).slice(0, 30));
            setLastUpdated(new Date());
        } catch (err) {
            console.error("Hub refresh failure.");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchData();
        pollingRef.current = setInterval(() => fetchData(true), 20000); // 20s interval
        return () => clearInterval(pollingRef.current);
    }, []);

    if (loading && alerts.length === 0 && activities.length === 0) return <PageLoader />;

    const outOfStockCount = alerts.filter(a => a.priority === 'high').length;
    const lowStockCount = alerts.length - outOfStockCount;

    return (
        <div className="bg-[#F8F9FA] min-h-screen pb-20 font-sans text-[#0f1111] text-left">
            
            {/* Header */}
            <div className="bg-white border-b border-[#ddd] py-4 shadow-sm">
                <div className="max-w-[1400px] mx-auto px-3 sm:px-6">
                    <div className="flex items-center gap-1 text-[12px] text-[#565959] mb-3">
                        <Link href="/admin/dashboard" className="hover:text-[#c45500] hover:underline">Dashboard</Link>
                        <ChevronRight size={10} />
                        <span className="text-[#c45500]">Alerts</span>
                    </div>
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                        <div>
                            <h1 className="text-[22px] font-normal text-[#111]">Stock & Activity Alerts</h1>
                            <p className="text-[13px] text-[#565959] mt-0.5">Real-time updates on low stock and recent events</p>
                        </div>
                        <div className="flex gap-4 w-full sm:w-auto items-center justify-between sm:justify-end">
                            <Btn variant="secondary" onClick={() => fetchData()} loading={loading}>
                                <RefreshCw size={14} className={loading ? 'animate-spin' : ''} /> Refresh
                            </Btn>
                            <div className="flex items-center gap-1.5 text-[11px] font-bold text-green-700 uppercase tracking-wider">
                                <ShieldCheck className="h-4 w-4" /> All Systems Good
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            <div className="max-w-[1400px] mx-auto px-3 sm:px-6 mt-6 space-y-8">
                
                {/* INVENTORY MESH MONITOR */}
                <section className="space-y-4">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-l-4 border-red-500 pl-4 py-0.5">
                        <div>
                            <h2 className="text-[14px] font-bold text-[#111] uppercase tracking-tight flex items-center gap-2">
                                <Activity className="h-4 w-4 text-red-500" /> Low Stock Alerts
                            </h2>
                            <p className="text-[11px] text-[#565959] uppercase tracking-widest mt-0.5">Products running low or out of stock</p>
                        </div>
                        <span className="self-start sm:self-auto text-[10px] bg-red-50 text-red-700 px-3 py-1 rounded-[2px] font-bold uppercase tracking-wider border border-red-200">
                            {outOfStockCount} Out of Stock / {lowStockCount} Low Stock
                        </span>
                    </div>

                    {alerts.length === 0 ? (
                        <div className="bg-white border border-[#ddd] rounded-[4px] p-12 text-center shadow-sm">
                            <div className="w-16 h-16 bg-green-50 rounded-full flex items-center justify-center mx-auto mb-4 border border-green-100">
                                <CheckCircle2 className="h-8 w-8 text-green-600" />
                            </div>
                            <p className="text-[12px] font-bold text-[#565959] uppercase tracking-widest leading-relaxed">All products have sufficient stock levels.</p>
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                            {alerts.map(a => (
                                <div key={a.id} className="bg-white border border-[#ddd] rounded-[4px] shadow-sm hover:shadow-md transition-all flex flex-col justify-between">
                                    <div className="p-4 flex-1">
                                        <div className="flex items-center justify-between mb-4">
                                            <div className={`w-8 h-8 ${a.bg} ${a.color} rounded-[3px] flex items-center justify-center shrink-0 border ${a.border}`}>
                                                <a.icon size={16} />
                                            </div>
                                            <span className={`text-[10px] font-bold px-2 py-0.5 rounded-[2px] border uppercase tracking-wider ${a.color} ${a.bg} ${a.border}`}>
                                                {a.remaining} Left
                                            </span>
                                        </div>
                                        <div>
                                            <Link href={a.href || '#'} className="block group">
                                                <h3 className="text-[13px] font-bold text-[#007185] group-hover:text-[#c45500] group-hover:underline truncate">{a.product}</h3>
                                            </Link>
                                            <p className={`text-[10px] font-bold uppercase tracking-widest mt-1.5 flex items-center gap-1 ${a.color}`}>
                                                <AlertTriangle className="h-3.5 w-3.5" /> {a.type.replace(/_/g, ' ')}
                                            </p>
                                        </div>
                                    </div>
                                    <div className="p-4 pt-0">
                                        <Link href={`/admin/purchases/add?product_id=${a.productId}&product_name=${encodeURIComponent(a.product)}&quantity=0`} className="block w-full">
                                            <button className="w-full flex items-center justify-center gap-1.5 h-[29px] bg-gradient-to-b from-[#f7f8fa] to-[#e7e9ec] border border-[#adb1b8] hover:from-[#eef1f3] hover:to-[#dce0e4] text-[#0f1111] rounded-[3px] text-[11px] font-bold uppercase tracking-wider shadow-sm">
                                                <Plus size={13} /> Order Stock
                                            </button>
                                        </Link>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </section>

                {/* RECENT ACTIVITY LOG */}
                <section className="space-y-4">
                    <div className="border-l-4 border-[#e47911] pl-4 py-0.5">
                        <h2 className="text-[14px] font-bold text-[#111] uppercase tracking-tight flex items-center gap-2">
                            <ClipboardList className="h-4 w-4 text-[#e47911]" /> Recent Activity Log
                        </h2>
                        <p className="text-[11px] text-[#565959] uppercase tracking-widest mt-0.5">Recent actions on orders, users, and purchases</p>
                    </div>

                    <div className="relative">
                        <div className="absolute left-6 top-8 bottom-8 w-0.5 bg-[#eee]" />
                        <div className="space-y-4">
                            {activities.map((act) => (
                                <div key={act.id} className="relative pl-14 group">
                                    <div className={`absolute left-0 top-1.5 w-9 h-9 ${act.bg} ${act.color} rounded-[3px] z-10 flex items-center justify-center shadow-sm border ${act.border} transform group-hover:scale-105 transition-all`}>
                                        <act.icon size={16} />
                                    </div>
                                    <div className="bg-white border border-[#ddd] rounded-[4px] p-4 shadow-sm hover:bg-[#fcfdff] transition-all">
                                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-2">
                                            <div className="flex flex-wrap items-center gap-2">
                                                <span className="text-[10px] font-bold px-2 py-0.5 rounded-[2px] bg-[#f7f8fa] border border-[#ddd] text-[#565959] uppercase tracking-wider">{act.type}</span>
                                                <h3 className="text-[13px] font-bold text-[#111] uppercase tracking-tight">{act.title}</h3>
                                            </div>
                                            <div className="text-[10px] font-bold text-[#565959] flex items-center gap-1.5 uppercase tracking-wider">
                                                <Clock size={11} className="text-[#e47911]" /> {act.time.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                            </div>
                                        </div>
                                        <p className="text-[12px] text-[#565959] font-medium leading-relaxed">{act.message}</p>
                                    </div>
                                </div>
                            ))}
                            {activities.length === 0 && !loading && (
                                <p className="text-[12px] text-[#565959] font-bold text-center py-20 uppercase tracking-widest">No recent activity recorded.</p>
                            )}
                        </div>
                    </div>
                </section>
            </div>
        </div>
    );
}
