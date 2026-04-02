'use client';

import React, { useEffect, useState } from 'react';
import {
    Box, Package, ArrowRightLeft, History, AlertCircle,
    Warehouse, Layers, Settings, ChevronRight, BarChart3, 
    TrendingUp, RefreshCw, Plus, MapPin, Activity, ShieldCheck, ShoppingBag
} from 'lucide-react';
import Link from 'next/link';
import { inventoryService } from '@/lib/api';
import PageLoader from '@/components/ui/PageLoader';

/* ══════════════════════════════════════════════
   COMPONENTS & STYLES (Synchronized with Company Hub)
   ══════════════════════════════════════════════ */
const SectionCard = ({ children, className = "" }: { children: React.ReactNode; className?: string }) => (
    <div className={`bg-white dark:bg-[#1B1C1E] border border-slate-200 dark:border-white/10 rounded-xl shadow-sm overflow-hidden ${className}`}>
        {children}
    </div>
);

const PRIMARY_BTN = "bg-[#F7CA00] hover:bg-[#1e40af] text-white font-bold rounded-lg shadow-sm text-[11px] uppercase tracking-widest py-2 px-4 transition-all flex items-center justify-center gap-2 active:scale-95 disabled:opacity-50";
const SECONDARY_BTN = "bg-white dark:bg-white/5 hover:bg-slate-50 dark:hover:bg-white/10 border border-slate-200 dark:border-white/10 text-slate-600 dark:text-slate-300 rounded-lg shadow-sm text-[11px] font-bold uppercase tracking-widest py-2 px-4 transition-all flex items-center justify-center gap-2 active:scale-95 disabled:opacity-50";

function MetricCard({ label, value, icon: Icon, color, link }: { label: string; value: string | number; icon: any; color: string; link: string }) {
    return (
        <Link href={link} className="bg-white dark:bg-[#1B1C1E] border border-slate-200 dark:border-white/10 p-5 rounded-xl shadow-sm hover:border-[#F7CA00]/30 transition-all group flex flex-col justify-between h-full">
            <div className="flex items-center justify-between mb-4">
                <div className={`p-2 rounded-xl bg-slate-50 dark:bg-white/5 group-hover:bg-[#F7CA00] group-hover:text-white transition-all`}>
                    <Icon className={`h-5 w-5 transition-colors ${color} group-hover:text-white`} />
                </div>
                <div className="text-2xl font-black text-slate-900 dark:text-white tracking-tighter">{value}</div>
            </div>
            <div>
                <p className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest group-hover:text-[#F7CA00] transition-colors">{label}</p>
                <div className="flex items-center gap-1 text-[9px] text-[#F7CA00] font-black mt-1 opacity-0 group-hover:opacity-100 transition-opacity uppercase tracking-tighter">
                    Access Grid <ChevronRight className="h-3 w-3" />
                </div>
            </div>
        </Link>
    );
}

export default function StockManagementOverview() {
    const [stats, setStats] = useState({
        total_items: 0,
        low_stock_count: 0,
        expired_batches: 0,
        total_movements: 0
    });
    const [loading, setLoading] = useState(true);

    const loadData = async () => {
        setLoading(true);
        try {
            const summary = await inventoryService.getInventorySummary();
            const movements = await inventoryService.getMovements();
            setStats({
                ...summary,
                total_movements: movements.length
            });
        } catch (error) {
            console.error(error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => { loadData(); }, []);

    if (loading) return <PageLoader />;

    const tools = [
        { name: 'Inventory Ledger', desc: 'Central tracking of all stock levels', icon: Package, link: '/admin/inventory/list' },
        { name: 'Stock Movements', desc: 'Detailed log of every stock change', icon: ArrowRightLeft, link: '/admin/inventory/movements' },
        { name: 'Batch Tracking', desc: 'Monitor production sets and expiry', icon: Layers, link: '/admin/inventory/batches' },
        { name: 'Stock Adjustments', desc: 'Manual corrections and audits', icon: Settings, link: '/admin/inventory/adjustments' },
        { name: 'Warehouse Hub', desc: 'Manage fulfillment centers and nodes', icon: Warehouse, link: '/admin/inventory/warehouses' },
    ];

    return (
        <div className="max-w-[1400px] mx-auto pb-24 px-4 mt-4 font-sans animate-in fade-in duration-500">
            
            {/* ── Page Header ── */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-8 pb-4 border-b border-slate-200 dark:border-white/10">
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-[#F7CA00] rounded-xl flex items-center justify-center shadow-lg shadow-blue-500/20">
                        <Activity className="h-5 w-5 text-white" />
                    </div>
                    <div>
                        <h1 className="text-xl font-bold text-slate-900 dark:text-white uppercase tracking-tight">Inventory Monitor</h1>
                        <p className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-[0.2em]">Logistics Grid Control Plane</p>
                    </div>
                </div>
                <div className="flex items-center gap-2">
                    <button onClick={loadData} className={SECONDARY_BTN}>
                        <RefreshCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} />
                    </button>
                    <Link href="/admin/inventory/adjustments/add" className={PRIMARY_BTN}>
                        <Plus className="h-4 w-4" />
                        Log Adjustment
                    </Link>
                </div>
            </div>

            {/* ── Metrics Grid ── */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-10">
                <MetricCard label="Stock Identifiers" value={stats.total_items} icon={Box} color="text-blue-600" link="/admin/inventory/list" />
                <MetricCard label="Batch Thresholds" value={stats.expired_batches} icon={Layers} color="text-amber-600" link="/admin/inventory/batches" />
                <MetricCard label="Mesh Movements" value={stats.total_movements} icon={History} color="text-emerald-600" link="/admin/inventory/movements" />
                <MetricCard label="Critical Alerts" value={stats.low_stock_count} icon={AlertCircle} color="text-red-600" link="/admin/inventory/list" />
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Protocol Control Center */}
                <div className="lg:col-span-2 space-y-6">
                    <SectionCard>
                        <div className="px-6 py-4 bg-slate-50 dark:bg-white/5 border-b border-slate-100 dark:border-white/10 flex items-center justify-between">
                            <h2 className="text-[10px] font-black text-slate-800 dark:text-white uppercase tracking-[0.2em]">Logistics Framework</h2>
                            <ShieldCheck className="h-4 w-4 text-[#F7CA00]" />
                        </div>
                        <div className="divide-y divide-slate-100 dark:divide-white/5">
                            {tools.map((tool, idx) => (
                                <Link key={idx} href={tool.link} className="flex items-center p-6 hover:bg-slate-50/60 dark:hover:bg-white/[0.02] transition-colors group">
                                    <div className="w-12 h-12 bg-slate-100 dark:bg-white/5 text-slate-400 rounded-xl flex items-center justify-center mr-5 group-hover:bg-[#F7CA00] group-hover:text-white transition-all transform group-hover:rotate-12">
                                        <tool.icon className="h-5 w-5" />
                                    </div>
                                    <div className="flex-1">
                                        <h3 className="text-sm font-black text-slate-900 dark:text-white uppercase tracking-tight group-hover:text-[#F7CA00] transition-colors">{tool.name}</h3>
                                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-0.5 opacity-60">{tool.desc}</p>
                                    </div>
                                    <ChevronRight className="h-4 w-4 text-slate-300 group-hover:text-[#F7CA00] transition-all transform group-hover:translate-x-1" />
                                </Link>
                            ))}
                        </div>
                    </SectionCard>
                </div>

                {/* Status Sidebar */}
                <div className="space-y-6">
                    <SectionCard className="p-6">
                        <div className="flex items-center gap-2 mb-6 border-l-4 border-red-500 pl-4 py-0.5">
                            <AlertCircle className="h-4 w-4 text-red-500" />
                            <h2 className="text-xs font-black text-slate-800 dark:text-white uppercase tracking-widest">Mesh Violations</h2>
                        </div>
                        
                        <div className="space-y-4">
                            <div className="p-4 bg-red-50 dark:bg-red-900/10 border border-red-100 dark:border-red-900/30 rounded-xl">
                                <p className="text-[10px] font-black text-red-700 dark:text-red-400 uppercase tracking-widest mb-1 flex items-center gap-1.5">
                                    <Activity className="h-3 w-3" /> Low Stock Protocol
                                </p>
                                <p className="text-[11px] text-red-600 dark:text-red-400/80 leading-relaxed font-bold uppercase tracking-tight">
                                    <span className="text-lg font-black">{stats.low_stock_count}</span> SKU(s) below reorder mesh. Initialize procurement.
                                </p>
                            </div>

                            <div className="p-4 bg-amber-50 dark:bg-amber-900/10 border border-amber-100 dark:border-amber-900/30 rounded-xl">
                                <p className="text-[10px] font-black text-amber-700 dark:text-amber-400 uppercase tracking-widest mb-1 flex items-center gap-1.5">
                                    <History className="h-3 w-3" /> Batch Integrity
                                </p>
                                <p className="text-[11px] text-amber-600 dark:text-amber-400/80 leading-relaxed font-bold uppercase tracking-tight">
                                    <span className="text-lg font-black">{stats.expired_batches}</span> Expired packets detected. Purge from ledger.
                                </p>
                                <Link href="/admin/inventory/batches" className="inline-flex mt-4 items-center gap-1.5 text-[9px] font-black text-amber-800 dark:text-amber-500 uppercase tracking-widest hover:translate-x-1 transition-transform">
                                    Verify Batches <ChevronRight className="h-3 w-3" />
                                </Link>
                            </div>
                        </div>
                    </SectionCard>

                    <SectionCard className="p-6 bg-[#F7CA00]/5 border-[#F7CA00]/10 shadow-none">
                        <div className="flex items-center gap-2 mb-4">
                            <ShieldCheck className="h-4 w-4 text-[#F7CA00]" />
                            <h3 className="text-[10px] font-black text-slate-800 dark:text-white uppercase tracking-widest">Network Health</h3>
                        </div>
                        <p className="text-[11px] text-slate-500 dark:text-slate-400 font-bold uppercase leading-relaxed mb-6 tracking-tight">
                            Matrix heartbeat is nominal. Logistics nodes are synchronized across the global fulfillment mesh.
                        </p>
                        <div className="flex items-center gap-2 text-[9px] font-black text-[#F7CA00] uppercase tracking-[0.2em] animate-pulse">
                            <RefreshCw className="h-3 w-3 animate-spin" /> Live Telemetry Linked
                        </div>
                    </SectionCard>
                </div>
            </div>
        </div>
    );
}
