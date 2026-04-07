'use client';

import React, { useState, useEffect, useRef } from 'react';
import { productService, orderService, userService } from '@/lib/api';
import { purchaseService } from '@/services/purchase.service';
import {
    Bell, AlertTriangle, ShoppingBag, Package,
    ArrowRight, CheckCircle2, Clock, Filter,
    RefreshCw, Search, ChevronRight, UserPlus, Plus,
    Activity, ClipboardList, TrendingUp, User, ShoppingCart, Tag, XCircle, HeartPulse, ShieldCheck
} from 'lucide-react';
import Link from 'next/link';
import PageLoader from '@/components/ui/PageLoader';

/* ══════════════════════════════════════════════
   COMPONENTS & STYLES (Synchronized with Company Hub)
   ══════════════════════════════════════════════ */
const SectionCard = ({ children, className = "" }: { children: React.ReactNode; className?: string }) => (
    <div className={`bg-white dark:bg-[#1a252f] border border-slate-200 dark:border-white/10 rounded-xl shadow-sm overflow-hidden ${className}`}>
        {children}
    </div>
);

const PRIMARY_BTN = "bg-[#EEAF1C] hover:bg-[#1e40af] text-white font-bold rounded-lg shadow-sm text-[11px] uppercase tracking-widest py-2 px-4 transition-all flex items-center justify-center gap-2 active:scale-95 disabled:opacity-50";
const SECONDARY_BTN = "bg-white dark:bg-white/5 hover:bg-slate-50 dark:hover:bg-white/10 border border-slate-200 dark:border-white/10 text-slate-600 dark:text-slate-300 rounded-lg shadow-sm text-[11px] font-bold uppercase tracking-widest py-2 px-4 transition-all flex items-center justify-center gap-2 active:scale-95 disabled:opacity-50";

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
                        type: stock === 0 ? 'PURGE_CRITICAL' : 'REPLENISHMENT_REQUIRED',
                        priority: stock === 0 ? 'high' : 'medium',
                        title: stock === 0 ? 'CRITICAL: STOCK OUT' : 'WARNING: LOW THRESHOLD',
                        product: p.name,
                        remaining: stock,
                        supplierName: p.supplier_name || p.company_name || 'Al-Qavi Hub',
                        sku: p.sku || 'No Identifier',
                        time: 'LIVE-MESH',
                        href: `/admin/products?search=${p.name}`,
                        icon: stock === 0 ? XCircle : AlertTriangle,
                        color: stock === 0 ? 'text-red-600' : 'text-amber-600',
                        bg: stock === 0 ? 'bg-red-50 dark:bg-red-900/10' : 'bg-amber-50 dark:bg-amber-900/10',
                    });
                }
            });

            const orders = getArr(oRes);
            orders.slice(0, 10).forEach((o: any) => {
                newActivities.push({
                    id: `sale-${o.id}`,
                    type: 'TRANSACTION',
                    title: 'Trade Registered',
                    message: `Order #${o.order_number || o.id} • RS ${parseFloat(o.total_amount || 0).toLocaleString()} • ${o.customer_name || o.guest_name || 'Individual'}`,
                    time: new Date(o.created_at || Date.now()),
                    icon: ShoppingCart,
                    color: 'text-emerald-600',
                    bg: 'bg-emerald-50 dark:bg-emerald-900/10'
                });
            });

            const users = getArr(uRes);
            users.slice(0, 5).forEach((u: any) => {
                newActivities.push({
                    id: `user-${u.id}`,
                    type: 'SECURITY',
                    title: 'Identity Update',
                    message: `${u.first_name || u.username} verified as ${u.role_name || u.role || 'Member'}`,
                    time: new Date(u.date_joined || u.created_at || Date.now()),
                    icon: UserPlus,
                    color: 'text-[#EEAF1C]',
                    bg: 'bg-blue-50 dark:bg-blue-900/10'
                });
            });

            const purchases = getArr(purRes);
            purchases.slice(0, 10).forEach((p: any) => {
                newActivities.push({
                    id: `purchase-${p.id}`,
                    type: 'PROCUREMENT',
                    title: 'Logistics Entry',
                    message: `PO #${p.purchase_number || p.id} issued for RS ${parseFloat(p.total_amount || 0).toLocaleString()}`,
                    time: new Date(p.created_at || Date.now()),
                    icon: ShoppingBag,
                    color: 'text-indigo-600',
                    bg: 'bg-indigo-50 dark:bg-indigo-900/10'
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

    if (loading) return <PageLoader />;

    return (
        <div className="max-w-[1400px] mx-auto pb-20 font-sans px-4 mt-6 animate-in fade-in duration-500">

            {/* ── Page Header ── */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-8 pb-4 border-b border-slate-200 dark:border-white/10">
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-[#EEAF1C] rounded-xl flex items-center justify-center shadow-lg shadow-blue-500/20">
                        <Bell className="h-5 w-5 text-white" />
                    </div>
                    <div>
                        <h1 className="text-xl font-bold text-slate-900 dark:text-white uppercase tracking-tight">System Monitor</h1>
                        <p className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-[0.2em]">Live Intelligence Protocol</p>
                    </div>
                </div>
                <div className="flex items-center gap-2">
                    <button onClick={() => fetchData()} className={SECONDARY_BTN}>
                        <RefreshCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} />
                    </button>
                    <div className="flex items-center gap-1.5 text-[9px] font-black text-[#EEAF1C] uppercase tracking-widest pl-4">
                        <ShieldCheck className="h-3 w-3" /> System Nominal
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-10">
                <div className="lg:col-span-12 space-y-12">

                    {/* INVENTORY MESH MONITOR */}
                    <section className="space-y-6">
                        <div className="flex items-center justify-between border-l-4 border-red-500 pl-5 py-0.5">
                            <div>
                                <h2 className="text-sm font-bold text-slate-900 dark:text-white uppercase tracking-tight flex items-center gap-2">
                                    <Activity className="h-4 w-4 text-red-500" /> Critical Pulse Monitor
                                </h2>
                                <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-1">Inventory threshold violations</p>
                            </div>
                            <span className="text-[10px] bg-red-50 dark:bg-red-900/20 text-red-600 px-3 py-1 rounded-full font-bold uppercase tracking-wider border border-red-100 dark:border-red-900/30">
                                {alerts.filter(a => a.priority === 'high').length} Critical / {alerts.length} Warnings
                            </span>
                        </div>

                        {alerts.length === 0 ? (
                            <SectionCard className="p-12 text-center">
                                <div className="w-16 h-16 bg-blue-50 dark:bg-blue-900/10 rounded-2xl flex items-center justify-center mx-auto mb-6">
                                    <CheckCircle2 className="h-8 w-8 text-[#EEAF1C]" />
                                </div>
                                <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.4em]">All logistical nodes are operating within optimal parameters.</p>
                            </SectionCard>
                        ) : (
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                                {alerts.map(a => (
                                    <SectionCard key={a.id} className="group hover:border-[#EEAF1C]/30 transition-all">
                                        <div className="p-5 flex flex-col h-full">
                                            <div className="flex items-center justify-between mb-4">
                                                <div className={`w-10 h-10 ${a.bg} ${a.color} rounded-xl flex items-center justify-center shrink-0 border border-current opacity-30`}>
                                                    <a.icon size={20} />
                                                </div>
                                                <span className={`text-[10px] font-black px-2 py-1 rounded bg-slate-50 dark:bg-white/5 border border-slate-100 dark:border-white/10 uppercase tracking-widest ${a.color}`}>
                                                    {a.remaining} Left
                                                </span>
                                            </div>
                                            <div className="flex-1">
                                                <Link href={a.href || '#'} className="block group/link">
                                                    <h3 className="text-sm font-black text-slate-900 dark:text-white uppercase tracking-tight truncate group-hover/link:text-[#EEAF1C] transition-colors">{a.product}</h3>
                                                </Link>
                                                <p className={`text-[9px] font-black uppercase tracking-widest mt-1 mb-6 flex items-center gap-1.5 ${a.color}`}>
                                                    <AlertTriangle className="h-3 w-3" /> {a.type}
                                                </p>
                                            </div>
                                            <Link href={`/admin/purchases/add?product_id=${a.productId}&product_name=${encodeURIComponent(a.product)}&supplier_name=${encodeURIComponent(a.supplierName)}&quantity=0`}
                                                className="w-full flex items-center justify-center gap-2 py-2.5 bg-slate-900 hover:bg-slate-800 text-white dark:bg-white/10 dark:hover:bg-[#EEAF1C] rounded-xl text-[10px] font-black uppercase tracking-widest transition-all">
                                                <Plus className="h-3.5 w-3.5" /> Initialize Procurement
                                            </Link>
                                        </div>
                                    </SectionCard>
                                ))}
                            </div>
                        )}
                    </section>

                    {/* OPERATIONAL MESH ACTIVITY LOG */}
                    <section className="space-y-6">
                        <div className="flex items-center justify-between border-l-4 border-[#EEAF1C] pl-5 py-0.5">
                            <div>
                                <h2 className="text-sm font-bold text-slate-900 dark:text-white uppercase tracking-tight flex items-center gap-2">
                                    <ClipboardList className="h-4 w-4 text-[#EEAF1C]" /> Operational Lifecycle Hub
                                </h2>
                                <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-1">Real-time system telemetry record</p>
                            </div>
                        </div>

                        <div className="relative">
                            <div className="absolute left-6 top-8 bottom-8 w-0.5 bg-slate-100 dark:bg-white/5" />
                            <div className="space-y-4">
                                {activities.map((act) => (
                                    <div key={act.id} className="relative pl-14 group animate-in slide-in-from-left-4 duration-500">
                                        <div className={`absolute left-0 top-1.5 w-10 h-10 ${act.bg} ${act.color} rounded-xl z-10 flex items-center justify-center shadow-sm border border-current opacity-30 transform group-hover:scale-110 transition-all`}>
                                            <act.icon size={18} />
                                        </div>
                                        <SectionCard className="p-5 hover:border-[#EEAF1C]/30 transition-all group-hover:bg-slate-50/10">
                                            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-2">
                                                <div className="flex items-center gap-3">
                                                    <span className={`text-[10px] font-black px-2 py-0.5 rounded-md bg-slate-100 dark:bg-white/10 text-slate-600 dark:text-slate-400 uppercase tracking-widest`}>{act.type}</span>
                                                    <h3 className="text-sm font-black text-slate-900 dark:text-white uppercase tracking-tight">{act.title}</h3>
                                                </div>
                                                <div className="text-[9px] font-black text-slate-400 flex items-center gap-1.5 uppercase tracking-[0.2em]">
                                                    <Clock size={10} className="text-[#EEAF1C] group-hover:animate-spin" /> {act.time.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                                </div>
                                            </div>
                                            <p className="text-[11px] text-slate-500 font-bold uppercase tracking-tight opacity-70 group-hover:opacity-100 transition-all">{act.message}</p>
                                        </SectionCard>
                                    </div>
                                ))}
                                {activities.length === 0 && !loading && (
                                    <p className="text-[10px] text-slate-500 font-black text-center py-20 uppercase tracking-[0.4em]">Telemetry void. Matrix awaiting signal.</p>
                                )}
                            </div>
                        </div>
                    </section>
                </div>
            </div>
        </div>
    );
}

