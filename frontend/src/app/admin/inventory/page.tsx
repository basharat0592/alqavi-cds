"use client";

import React, { useEffect, useState } from 'react';
import {
    Box, Package, ArrowRightLeft, History, AlertCircle,
    ArrowUpRight, ArrowDownRight, Warehouse, Layers, Settings,
    Search, Filter, Plus, FileText, ChevronRight, BarChart3, TrendingUp
} from 'lucide-react';
import Link from 'next/link';
import { inventoryService } from '@/lib/api';
import { PageWrapper, PageHeader, PrimaryButton, SectionCard } from '@/components/ui/AmazonStyles';

export default function StockManagementOverview() {
    const [stats, setStats] = useState({
        total_items: 0,
        low_stock_count: 0,
        expired_batches: 0,
        total_movements: 0
    });
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchStats = async () => {
            try {
                const summary = await inventoryService.getInventorySummary();
                const movements = await inventoryService.getMovements();
                setStats({
                    ...summary,
                    total_movements: movements.length
                });
            } catch (error) {
                console.error("Failed to fetch inventory stats", error);
            } finally {
                setLoading(false);
            }
        };
        fetchStats();
    }, []);

    const cards = [
        { title: 'Total Stocked Items', value: stats.total_items, icon: Box, color: 'text-blue-600', bg: 'bg-blue-50 dark:bg-blue-900/20', link: '/admin/inventory/list' },
        { title: 'Expired Batches', value: stats.expired_batches, icon: Layers, color: 'text-orange-600', bg: 'bg-orange-50 dark:bg-orange-900/20', link: '/admin/inventory/batches' },
        { title: 'Recent Movements', value: stats.total_movements, icon: History, color: 'text-green-600', bg: 'bg-green-50 dark:bg-green-900/20', link: '/admin/inventory/movements' },
        { title: 'Low Stock Alerts', value: stats.low_stock_count, icon: AlertCircle, color: 'text-red-600', bg: 'bg-red-50 dark:bg-red-900/20', link: '/admin/alerts' },
    ];

    const tools = [
        { name: 'Inventory Ledger', desc: 'Central tracking of all stock levels', icon: Package, link: '/admin/inventory/list' },
        { name: 'Stock Movements', desc: 'Detailed log of every stock change', icon: ArrowRightLeft, link: '/admin/inventory/movements' },
        { name: 'Batch Tracking', desc: 'Monitor production sets and expiry', icon: Layers, link: '/admin/inventory/batches' },
        { name: 'Stock Adjustments', desc: 'Manual corrections and audits', icon: Settings, link: '/admin/inventory/adjustments' },
        { name: 'Warehouse Hub', desc: 'Manage fulfillment centers and nodes', icon: Warehouse, link: '/admin/inventory/warehouses' },
    ];

    return (
        <PageWrapper>

            {/* Header - Matching Users/Company Style */}
            <PageHeader
                title="Inventory Dashboard"
                subtitle="Comprehensive overview of inventory health and operations across all warehouses"
                icon={TrendingUp}
                action={
                    <PrimaryButton href="/admin/inventory/adjustments" className="!bg-[#E68A00] hover:!bg-[#cc7a00] text-white">
                        <Plus className="h-4 w-4" strokeWidth={3} />
                        Create Adjustment
                    </PrimaryButton>
                }
            />

            {/* Quick Stats Grid - Registry Style */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
                {cards.map((card, idx) => (
                    <Link href={card.link} key={idx} className="bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-800 p-5 rounded shadow-sm hover:border-[#E68A00] transition-colors group">
                        <div className="flex items-center justify-between mb-3">
                            <p className="text-[10px] font-bold text-gray-500 dark:text-slate-400 uppercase tracking-widest group-hover:text-[#E68A00] transition-colors">{card.title}</p>
                            <div className={`${card.bg} p-2 rounded-lg transition-colors`}>
                                <card.icon className={`h-4 w-4 ${card.color}`} strokeWidth={2.5} />
                            </div>
                        </div>
                        <p className="text-2xl font-bold tracking-tight text-gray-900 dark:text-white uppercase">
                            {loading ? '...' : card.value}
                        </p>
                    </Link>
                ))}
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Inventory Tools */}
                <div className="lg:col-span-2 space-y-6">
                    <SectionCard>
                        <div className="bg-[#f6f6f6] dark:bg-slate-800 px-4 py-3 border-b border-gray-200 dark:border-slate-800 flex items-center justify-between">
                            <div className="flex items-center gap-2">
                                <BarChart3 className="w-4 h-4 text-gray-600 dark:text-gray-400" />
                                <span className="text-sm font-bold text-gray-800 dark:text-white uppercase tracking-tight">Inventory Control Center</span>
                            </div>
                        </div>
                        <div className="divide-y divide-gray-100 dark:divide-slate-800">
                            {tools.map((tool, idx) => (
                                <Link key={idx} href={tool.link} className="flex items-center p-6 hover:bg-gray-50 dark:hover:bg-slate-800/50 transition-colors group">
                                    <div className="w-12 h-12 bg-gray-100 dark:bg-slate-800 rounded-full flex items-center justify-center mr-4 group-hover:bg-[#E68A00] group-hover:text-white transition-colors border border-gray-200 dark:border-slate-700">
                                        <tool.icon className="w-6 h-6" />
                                    </div>
                                    <div className="flex-1">
                                        <h3 className="font-bold text-gray-900 dark:text-white group-hover:text-[#E68A00] transition-colors">{tool.name}</h3>
                                        <p className="text-sm text-gray-500 dark:text-slate-400">{tool.desc}</p>
                                    </div>
                                    <ArrowUpRight className="w-5 h-5 text-gray-300 group-hover:text-gray-900 dark:group-hover:text-white transition-all opacity-0 group-hover:opacity-100 transform translate-x-2 group-hover:translate-x-0" />
                                </Link>
                            ))}
                        </div>
                    </SectionCard>
                </div>

                {/* Operational Health Summary */}
                <div className="space-y-6">
                    <div className="bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-800 rounded shadow-sm p-6 overflow-hidden">
                        <div className="flex items-center gap-2 mb-6 border-b border-gray-100 dark:border-slate-800 pb-3">
                            <Warehouse className="w-5 h-5 text-[#E68A00]" />
                            <h2 className="font-bold text-gray-900 dark:text-white uppercase text-sm tracking-tight">Operational Health</h2>
                        </div>
                        <div className="space-y-4">
                            <div className="p-4 bg-red-50 dark:bg-red-900/10 border-l-4 border-red-500 rounded">
                                <p className="text-[10px] font-bold text-red-800 dark:text-red-400 uppercase tracking-tight mb-1">Attention Required</p>
                                <p className="text-sm text-red-700 dark:text-red-300">You have <strong>{stats.low_stock_count}</strong> items currently matching or below reorder levels.</p>
                            </div>

                            <div className="p-4 bg-orange-50 dark:bg-orange-900/10 border-l-4 border-orange-500 rounded">
                                <p className="text-[10px] font-bold text-orange-800 dark:text-orange-400 uppercase tracking-tight mb-1">Quality Control</p>
                                <p className="text-sm text-orange-700 dark:text-orange-300"><strong>{stats.expired_batches}</strong> stock batches have reached their expiration dates.</p>
                                <Link href="/admin/inventory/batches" className="text-[10px] font-bold text-orange-800 dark:text-orange-400 hover:underline mt-2 inline-block uppercase bg-orange-100 dark:bg-orange-900/20 px-2 py-1 rounded">Review Batches →</Link>
                            </div>

                            <div className="p-4 bg-blue-50 dark:bg-blue-900/10 border-l-4 border-blue-500 rounded">
                                <p className="text-[10px] font-bold text-blue-800 dark:text-blue-400 uppercase tracking-tight mb-1">System Audit</p>
                                <p className="text-sm text-blue-700 dark:text-blue-300">Stock movements tracking active. Total operations recorded: <strong>{stats.total_movements}</strong>.</p>
                                <Link href="/admin/inventory/movements" className="text-[10px] font-bold text-blue-800 dark:text-blue-400 hover:underline mt-2 inline-block uppercase bg-blue-100 dark:bg-blue-900/20 px-2 py-1 rounded">View History →</Link>
                            </div>
                        </div>
                    </div>

                    {/* Quick Search Hub */}
                    <div className="bg-[#131921] text-white p-6 rounded shadow-lg overflow-hidden relative group border border-slate-800">
                        <div className="relative z-10">
                            <h2 className="font-bold text-lg mb-2 text-[#E68A00] tracking-tight">Global Search</h2>
                            <p className="text-gray-400 text-[10px] font-bold uppercase tracking-widest mb-4 opacity-60 flex items-center gap-2">
                                <Box className="w-3 h-3" /> SKU / Barcode Lookup
                            </p>
                            <div className="relative">
                                <input
                                    type="text"
                                    placeholder="Search by SKU, Name or Barcode..."
                                    className="w-full bg-white text-gray-900 px-4 py-2.5 pr-10 rounded text-sm outline-none focus:ring-2 focus:ring-[#E68A00] font-medium"
                                />
                                <Search className="absolute right-3 top-3 w-4 h-4 text-gray-400" />
                            </div>
                        </div>
                        <Search className="absolute -right-4 -bottom-4 w-32 h-32 text-white/5 opacity-10 blur-sm pointer-events-none transition-transform group-hover:scale-110" />
                    </div>
                </div>
            </div>
        </PageWrapper>
    );
}

