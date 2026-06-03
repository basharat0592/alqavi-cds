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
import { PageHeader, Card, Button } from '@/components/admin/ui';

function MetricCard({ label, value, icon: Icon, color, link }: { label: string; value: string | number; icon: any; color: string; link: string }) {
    return (
        <Link href={link} className="bg-white border border-slate-200/70 rounded-2xl shadow-[0_1px_2px_rgba(15,23,42,0.04)] p-5 hover:border-indigo-300 transition-all group flex flex-col justify-between h-full">
            <div className="flex items-center justify-between mb-4">
                <div className={`p-2 rounded-xl bg-slate-50 group-hover:bg-indigo-600 group-hover:text-white transition-all`}>
                    <Icon className={`h-5 w-5 transition-colors ${color} group-hover:text-white`} />
                </div>
                <div className="text-2xl font-bold text-slate-900 tracking-tight tabular-nums">{value}</div>
            </div>
            <div>
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest group-hover:text-indigo-600 transition-colors">{label}</p>
                <div className="flex items-center gap-1 text-[9px] text-indigo-600 font-bold mt-1 opacity-0 group-hover:opacity-100 transition-opacity uppercase tracking-tighter">
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
    const [recentMovements, setRecentMovements] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    const loadData = async (silent = false) => {
        if (!silent) setLoading(true);
        try {
            const summary = await inventoryService.getInventorySummary();
            const movements = await inventoryService.getMovements();
            
            setStats({
                ...summary,
                total_movements: movements.length
            });

            // Sort by latest created_at or date and pick top 5
            const sorted = [...movements].sort((a: any, b: any) => 
                new Date(b.created_at || b.date).getTime() - new Date(a.created_at || a.date).getTime()
            );
            setRecentMovements(sorted.slice(0, 5));
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
            <PageHeader
                title="Inventory"
                subtitle="Logistics grid control plane"
                breadcrumbs={[{ label: 'Console', href: '/admin/dashboard' }, { label: 'Inventory' }]}
                actions={
                    <>
                        <Button variant="outline" size="md" onClick={() => loadData()} aria-label="Refresh">
                            <RefreshCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} />
                        </Button>
                        <Link href="/admin/inventory/adjustments/add">
                            <Button variant="primary" size="md">
                                <Plus className="h-4 w-4" />
                                Log Adjustment
                            </Button>
                        </Link>
                    </>
                }
            />

            {/* ── Metrics Grid ── */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-10">
                <MetricCard label="Stock Identifiers" value={stats.total_items} icon={Box} color="text-sky-600" link="/admin/inventory/list" />
                <MetricCard label="Batch Thresholds" value={stats.expired_batches} icon={Layers} color="text-indigo-600" link="/admin/inventory/batches" />
                <MetricCard label="Mesh Movements" value={stats.total_movements} icon={History} color="text-emerald-600" link="/admin/inventory/movements" />
                <MetricCard label="Critical Alerts" value={stats.low_stock_count} icon={AlertCircle} color="text-rose-600" link="/admin/inventory/list" />
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Protocol Control Center */}
                <div className="lg:col-span-2 space-y-6">
                    <Card className="overflow-hidden">
                        <div className="px-6 py-4 bg-slate-50/60 border-b border-slate-100 flex items-center justify-between">
                            <h2 className="text-[10px] font-bold text-slate-800 uppercase tracking-[0.2em]">Logistics Framework</h2>
                            <ShieldCheck className="h-4 w-4 text-indigo-600" />
                        </div>
                        <div className="divide-y divide-slate-100">
                            {tools.map((tool, idx) => (
                                <Link key={idx} href={tool.link} className="flex items-center p-6 hover:bg-slate-50 transition-colors group">
                                    <div className="w-12 h-12 bg-slate-100 text-slate-400 rounded-xl flex items-center justify-center mr-5 group-hover:bg-indigo-600 group-hover:text-white transition-all transform group-hover:rotate-12">
                                        <tool.icon className="h-5 w-5" />
                                    </div>
                                    <div className="flex-1">
                                        <h3 className="text-sm font-bold text-slate-900 uppercase tracking-tight group-hover:text-indigo-600 transition-colors">{tool.name}</h3>
                                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-0.5 opacity-60">{tool.desc}</p>
                                    </div>
                                    <ChevronRight className="h-4 w-4 text-slate-300 group-hover:text-indigo-600 transition-all transform group-hover:translate-x-1" />
                                </Link>
                            ))}
                        </div>
                    </Card>
                </div>

                {/* Status Sidebar */}
                <div className="space-y-6">
                    <Card className="p-6">
                        <div className="flex items-center gap-2 mb-6 border-l-4 border-rose-500 pl-4 py-0.5">
                            <AlertCircle className="h-4 w-4 text-rose-500" />
                            <h2 className="text-xs font-bold text-slate-800 uppercase tracking-widest">Mesh Violations</h2>
                        </div>

                        <div className="space-y-4">
                            <div className="p-4 bg-rose-50 border border-rose-100 rounded-xl">
                                <p className="text-[10px] font-bold text-rose-700 uppercase tracking-widest mb-1 flex items-center gap-1.5">
                                    <Activity className="h-3 w-3" /> Low Stock Protocol
                                </p>
                                <p className="text-[11px] text-rose-600 leading-relaxed font-bold uppercase tracking-tight">
                                    <span className="text-lg font-bold tabular-nums">{stats.low_stock_count}</span> SKU(s) below reorder mesh. Initialize procurement.
                                </p>
                            </div>

                            <div className="p-4 bg-amber-50 border border-amber-100 rounded-xl">
                                <p className="text-[10px] font-bold text-amber-700 uppercase tracking-widest mb-1 flex items-center gap-1.5">
                                    <History className="h-3 w-3" /> Batch Integrity
                                </p>
                                <p className="text-[11px] text-amber-600 leading-relaxed font-bold uppercase tracking-tight">
                                    <span className="text-lg font-bold tabular-nums">{stats.expired_batches}</span> Expired packets detected. Purge from ledger.
                                </p>
                                <Link href="/admin/inventory/batches" className="inline-flex mt-4 items-center gap-1.5 text-[9px] font-bold text-amber-800 uppercase tracking-widest hover:translate-x-1 transition-transform">
                                    Verify Batches <ChevronRight className="h-3 w-3" />
                                </Link>
                            </div>
                        </div>
                    </Card>

                    <Card className="p-6">
                        <div className="flex items-center justify-between mb-6">
                            <div className="flex items-center gap-2 border-l-4 border-indigo-600 pl-4 py-0.5">
                                <Activity className="h-4 w-4 text-indigo-600" />
                                <h2 className="text-xs font-bold text-slate-800 uppercase tracking-widest">Live Stock Stream</h2>
                            </div>
                            <Link href="/admin/inventory/movements" className="text-[10px] font-bold text-indigo-600 hover:text-indigo-700 uppercase hover:underline">View All</Link>
                        </div>

                        <div className="space-y-4">
                            {recentMovements.length === 0 ? (
                                <p className="text-[11px] text-slate-400 italic text-center py-4 uppercase font-bold tracking-tighter">No recent arrivals recorded.</p>
                            ) : (
                                recentMovements.slice(0, 5).map((m, i) => (
                                    <div key={i} className="flex items-center gap-3 p-3 rounded-lg bg-slate-50 border border-slate-100 hover:border-indigo-200 transition-all group">
                                        <div className="w-8 h-8 rounded bg-white border border-slate-100 flex items-center justify-center shrink-0">
                                            <ShoppingBag size={14} className="text-emerald-500" />
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <p className="text-[12px] font-bold text-slate-800 truncate group-hover:text-indigo-600 transition-colors">
                                                {(m.product_name || '').replace(/\s*\(.*?\)\s*$/, '').trim()}
                                            </p>
                                            <p className="text-[9px] text-slate-400 font-bold uppercase tracking-tighter flex items-center gap-1 mt-0.5">
                                                <MapPin size={10} /> {m.warehouse_name || 'Central Hub'}
                                            </p>
                                        </div>
                                        <div className="text-right shrink-0">
                                            <p className="text-[12px] font-bold text-emerald-600 tabular-nums">+{m.total_quantity || m.quantity}</p>
                                            <p className="text-[8px] text-slate-400 font-bold uppercase tracking-tighter tabular-nums">
                                                {new Date(m.created_at || m.date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: true })}
                                            </p>
                                        </div>
                                    </div>
                                ))
                            )}
                        </div>

                        <div className="mt-8 pt-6 border-t border-slate-100">
                            <div className="flex items-center gap-2 mb-4">
                                <ShieldCheck className="h-4 w-4 text-indigo-600" />
                                <h3 className="text-[10px] font-bold text-slate-800 uppercase tracking-widest">Network Health</h3>
                            </div>
                            <p className="text-[10px] text-slate-400 font-bold uppercase leading-relaxed mb-4 tracking-tight">
                                Matrix heartbeat is nominal. Logistics nodes are synchronized across the global fulfillment mesh.
                            </p>
                            <div className="flex items-center gap-2 text-[9px] font-bold text-indigo-600 uppercase tracking-[0.2em] animate-pulse">
                                <RefreshCw className="h-3 w-3 animate-spin" /> Live Telemetry Linked
                            </div>
                        </div>
                    </Card>
                </div>
            </div>
        </div>
    );
}

