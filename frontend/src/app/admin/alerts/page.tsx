'use client';

import React, { useState, useEffect, useRef } from 'react';
import { productService, orderService, userService } from '@/lib/api';
import { purchaseService } from '@/services/purchase.service';
import {
    Bell, AlertTriangle, ShoppingBag, Package,
    ArrowRight, CheckCircle2, Clock, Filter,
    RefreshCw, Search, ChevronRight, UserPlus,
    Activity, ClipboardList, TrendingUp, User, ShoppingCart, Tag, Zap, XCircle
} from 'lucide-react';
import Link from 'next/link';

export default function AlertsPage() {
    const [loading, setLoading] = useState(true);
    const [alerts, setAlerts] = useState<any[]>([]);
    const [activities, setActivities] = useState<any[]>([]);
    const [lastUpdated, setLastUpdated] = useState(new Date());
    const pollingRef = useRef<any>(null);

    const fetchData = async (isSilent = false) => {
        if (!isSilent) setLoading(true);
        console.log("Intelligence Hub: Fetching live data...");
        try {
            const [pRes, oRes, uRes, purRes] = await Promise.allSettled([
                productService.getAll(),
                orderService.getAll(),
                userService.getAll(),
                purchaseService.getAll() // Changed from getPurchaseOrders
            ]);

            const newAlerts: any[] = [];
            const newActivities: any[] = [];

            // Helper to extract array from various response formats
            const getArr = (res: any) => {
                if (res.status !== 'fulfilled') return [];
                const val = res.value;
                if (Array.isArray(val)) return val;
                if (val && typeof val === 'object' && Array.isArray(val.results)) return val.results;
                return [];
            };

            // 1. LIVE STOCK MONITOR
            const products = getArr(pRes);
            console.log("Monitoring products:", products.length);
            products.forEach((p: any) => {
                const stock = parseInt(p.quantity_in_stock ?? p.stock ?? 0);
                if (stock < 10) {
                    newAlerts.push({
                        id: `stock-${p.id}`,
                        type: stock === 0 ? 'OUT_OF_STOCK' : 'LOW_STOCK',
                        priority: stock === 0 ? 'high' : 'medium',
                        title: stock === 0 ? 'CRITICAL: OUT OF STOCK' : 'WARNING: LOW STOCK',
                        product: p.name,
                        remaining: stock,
                        sku: p.sku || 'No SKU',
                        time: 'Live',
                        href: `/admin/products?search=${p.name}`,
                        icon: stock === 0 ? XCircle : AlertTriangle,
                        color: stock === 0 ? 'text-red-600' : 'text-amber-600',
                        bg: stock === 0 ? 'bg-red-50' : 'bg-amber-50',
                    });
                }
            });

            // 2. SALES ACTIVITIES
            const orders = getArr(oRes);
            console.log("Monitoring orders:", orders.length);
            orders.slice(0, 10).forEach(o => {
                newActivities.push({
                    id: `sale-${o.id}`,
                    type: 'sale',
                    title: 'Trade Recorded',
                    message: `Order #${o.order_number || o.id} • RS ${parseFloat(o.total_amount || 0).toLocaleString()} • ${o.customer_name || o.guest_name || 'Customer'}`,
                    time: new Date(o.created_at || Date.now()),
                    icon: ShoppingCart,
                    color: 'text-emerald-600',
                    bg: 'bg-emerald-50'
                });
            });

            // 3. USER ACTIVITIES
            const users = getArr(uRes);
            console.log("Monitoring users:", users.length);
            users.slice(0, 5).forEach(u => {
                newActivities.push({
                    id: `user-${u.id}`,
                    type: 'user',
                    title: 'Account Update',
                    message: `${u.first_name || u.username} detected in system as ${u.role_name || u.role || 'Member'}`,
                    time: new Date(u.date_joined || u.created_at || Date.now()),
                    icon: UserPlus,
                    color: 'text-blue-600',
                    bg: 'bg-blue-50'
                });
            });

            // 4. PURCHASE ACTIVITIES
            const purchases = getArr(purRes);
            console.log("Monitoring purchases:", purchases.length);
            purchases.slice(0, 10).forEach(p => {
                newActivities.push({
                    id: `purchase-${p.id}`,
                    type: 'purchase',
                    title: 'Procurement Entry',
                    message: `PO #${p.purchase_number || p.id} issued for RS ${parseFloat(p.total_amount || 0).toLocaleString()}`,
                    time: new Date(p.created_at || Date.now()),
                    icon: ShoppingBag,
                    color: 'text-indigo-600',
                    bg: 'bg-indigo-50'
                });
            });

            setAlerts(newAlerts.sort((a, b) => (a.priority === 'high' ? -1 : 1)));
            setActivities(newActivities.sort((a, b) => b.time.getTime() - a.time.getTime()).slice(0, 30));
            setLastUpdated(new Date());
        } catch (err) {
            console.error("Hub refresh error:", err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchData();
        pollingRef.current = setInterval(() => fetchData(true), 15000);
        return () => clearInterval(pollingRef.current);
    }, []);

    return (
        <div className="max-w-[1400px] mx-auto pb-20 font-sans px-4 mt-6">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-10 bg-white dark:bg-slate-900 px-8 py-10 border-b-4 border-[#FF9900] rounded-b-3xl shadow-xl">
                <div>
                    <h1 className="text-3xl font-black text-gray-900 dark:text-white tracking-tighter flex items-center gap-3 uppercase italic">
                        <Zap className="h-8 w-8 text-[#FF9900] fill-[#FF9900]" /> Intelligence Center
                    </h1>
                    <div className="flex items-center gap-4 mt-2">
                        <span className="flex h-2 w-2 rounded-full bg-emerald-500 animate-ping"></span>
                        <p className="text-[10px] text-gray-400 font-black uppercase tracking-[0.4em]">Live System Data Extraction Active</p>
                    </div>
                </div>
                <div className="flex items-center gap-6">
                    <button onClick={() => fetchData()} className="w-12 h-12 bg-[#FF9900]/10 border border-[#FF9900]/20 rounded-full flex items-center justify-center hover:bg-[#FF9900]/20 transition-all group">
                        <RefreshCw size={24} className={`${loading ? 'animate-spin' : 'group-hover:rotate-180'} text-[#FF9900] transition-all duration-500`} />
                    </button>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-10">
                <div className="lg:col-span-12 space-y-10">
                    {/* LIVE STOCK ALERTS */}
                    <section className="space-y-4">
                        <div className="flex items-center justify-between border-l-4 border-red-500 pl-4">
                            <h2 className="text-[12px] font-black text-red-500 uppercase tracking-[0.3em] flex items-center gap-2">
                                <AlertTriangle className="h-5 w-5 animate-bounce" /> Critical Inventory
                            </h2>
                            <span className="text-[10px] bg-red-500/10 text-red-600 px-3 py-1 rounded-full font-black uppercase tracking-tighter shadow-sm border border-red-100">
                                {alerts.length} Warnings Active
                            </span>
                        </div>
                        {alerts.length === 0 ? (
                            <div className="p-8 bg-emerald-50/20 border-2 border-dashed border-emerald-100 dark:border-emerald-900/40 rounded-3xl text-center text-emerald-600 font-black uppercase tracking-widest text-xs">
                                All stock levels optimal.
                            </div>
                        ) : (
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                                {alerts.map(a => (
                                    <Link key={a.id} href={a.href} className={`group block p-5 transition-all duration-300 transform hover:-translate-y-1 ${a.priority === 'high' ? 'bg-red-50/50 border-red-500' : 'bg-amber-50/50 border-amber-500'} border-l-4 rounded-xl shadow-lg`}>
                                        <div className="flex items-center gap-4">
                                            <div className={`w-12 h-12 ${a.bg} ${a.color} rounded-2xl flex items-center justify-center shrink-0 shadow-sm`}><a.icon size={24} /></div>
                                            <div className="flex-1 min-w-0">
                                                <p className={`text-[10px] font-black uppercase tracking-widest ${a.color} truncate`}>{a.title}</p>
                                                <h3 className="text-lg font-black text-gray-900 dark:text-white leading-none mt-1 truncate">{a.product}</h3>
                                                <p className={`text-[10px] font-black uppercase mt-2 ${a.color}`}>{a.remaining} Units Left</p>
                                            </div>
                                        </div>
                                    </Link>
                                ))}
                            </div>
                        )}
                    </section>

                    <hr className="border-gray-100 dark:border-slate-800" />

                    {/* RECENT ACTIVITY */}
                    <div className="grid grid-cols-1 lg:grid-cols-4 gap-12">
                        <div className="lg:col-span-3 space-y-8">
                            <h2 className="text-[12px] font-black text-gray-400 uppercase tracking-[0.3em] flex items-center gap-2 border-l-4 border-[#FF9900] pl-4">
                                <ClipboardList className="h-5 w-5 text-[#FF9900]" /> Operational Journal
                            </h2>
                            <div className="relative">
                                <div className="absolute left-6 top-4 bottom-4 w-0.5 bg-slate-100 dark:bg-white/5" />
                                <div className="space-y-6">
                                    {activities.map((act) => (
                                        <div key={act.id} className="relative pl-14 group">
                                            <div className={`absolute left-0 top-1 w-12 h-12 ${act.bg} ${act.color} rounded-2xl border-4 border-white dark:border-slate-900 z-10 flex items-center justify-center shadow-lg transform group-hover:scale-110 transition-all duration-500`}>
                                                <act.icon size={22} strokeWidth={2.5} />
                                            </div>
                                            <div className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-white/5 rounded-2xl p-6 shadow-sm group-hover:shadow-xl transition-all duration-500">
                                                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-2">
                                                    <div className="flex items-center gap-2">
                                                        <span className={`text-[9px] font-black px-2 py-0.5 rounded uppercase tracking-widest ${act.bg} ${act.color}`}>{act.type}</span>
                                                        <h3 className="text-xs font-black text-gray-900 dark:text-white uppercase tracking-tighter">{act.title}</h3>
                                                    </div>
                                                    <div className="text-[9px] font-bold text-gray-400 uppercase tracking-widest flex items-center gap-1.5 italic">
                                                        <Clock size={10} /> {act.time.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                                    </div>
                                                </div>
                                                <p className="text-sm text-gray-600 dark:text-gray-400 font-medium leading-relaxed italic">"{act.message}"</p>
                                            </div>
                                        </div>
                                    ))}
                                    {activities.length === 0 && !loading && (
                                        <p className="p-20 text-center text-gray-400 font-bold uppercase tracking-widest text-xs italic">Awaiting database activity logs...</p>
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
