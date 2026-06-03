"use client";

import React, { useEffect, useState } from 'react';
import {
    Search, Plus, RefreshCw,
    TrendingUp, AlertCircle, Settings, User,
    Calendar, Package
} from 'lucide-react';
import Link from 'next/link';
import { inventoryService } from '@/lib/api';
import { PageHeader, Card, Button, Badge, ui } from '@/components/admin/ui';

const StatusPill = ({ type }: { type: string }) => {
    const isAddition = type === 'Addition' || type === 'Gain';

    return (
        <Badge tone={isAddition ? 'green' : 'red'} className="capitalize">
            {isAddition ? <TrendingUp className="h-3 w-3" /> : <AlertCircle className="h-3 w-3" />}
            {type}
        </Badge>
    );
};

export default function StockAdjustmentsPage() {
    const [adjustments, setAdjustments] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');

    const loadData = async () => {
        setLoading(true);
        try {
            const data = await inventoryService.getAdjustments();
            setAdjustments(data || []);
        } catch (error) {
            console.error(error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => { loadData(); }, []);

    const filtered = adjustments.filter(adj =>
        (adj.product_name?.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (adj.reason?.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (adj.product_sku?.toLowerCase().includes(searchTerm.toLowerCase()))
    );

    return (
        <div className="max-w-[1400px] mx-auto pb-20">

            {/* ── Page Header ── */}
            <PageHeader
                title="Stock Adjustments"
                subtitle="Manual inventory overrides and audit records"
                breadcrumbs={[{ label: 'Console', href: '/admin/dashboard' }, { label: 'Stock Adjustments' }]}
                actions={
                    <>
                        <Button
                            variant="outline"
                            size="md"
                            onClick={loadData}
                            title="Refresh"
                            className="px-2.5"
                        >
                            <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
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

            {/* ── Filters Bar ── */}
            <div className="flex flex-col sm:flex-row gap-2 mb-4">
                <div className="relative flex-1 max-w-sm">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 z-10" />
                    <input
                        value={searchTerm}
                        onChange={e => setSearchTerm(e.target.value)}
                        placeholder="Search product, SKU or reason..."
                        className={`${ui.inputBase} pl-9`}
                    />
                </div>
            </div>

            {/* ── Results count ── */}
            <p className="text-xs text-slate-400 mb-3">
                {loading ? 'Loading...' : `${filtered.length} result${filtered.length !== 1 ? 's' : ''}`}
            </p>

            {/* ── Table ── */}
            <Card className="overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                        <thead>
                            <tr className="bg-slate-50/60 border-b border-slate-100 text-left">
                                <th className="px-4 py-3 text-[11px] font-bold text-slate-400 whitespace-nowrap uppercase tracking-wider">Product & Warehouse</th>
                                <th className="px-4 py-3 text-[11px] font-bold text-slate-400 whitespace-nowrap uppercase tracking-wider">Type</th>
                                <th className="px-4 py-3 text-[11px] font-bold text-slate-400 whitespace-nowrap uppercase tracking-wider">Reason</th>
                                <th className="px-4 py-3 text-[11px] font-bold text-slate-400 text-right whitespace-nowrap uppercase tracking-wider">Delta</th>
                                <th className="px-4 py-3 text-[11px] font-bold text-slate-400 text-right whitespace-nowrap uppercase tracking-wider">Executor / Time</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {loading && filtered.length === 0 ? (
                                Array(6).fill(0).map((_, i) => (
                                    <tr key={i} className="animate-pulse">
                                        <td colSpan={5} className="px-4 py-4">
                                            <div className="h-4 bg-slate-100 rounded w-full" />
                                        </td>
                                    </tr>
                                ))
                            ) : filtered.length === 0 ? (
                                <tr>
                                    <td colSpan={5} className="px-4 py-16 text-center">
                                        <Settings className="h-10 w-10 text-slate-200 mx-auto mb-3" />
                                        <p className="text-sm text-slate-500">No adjustment overrides found.</p>
                                    </td>
                                </tr>
                            ) : (
                                filtered.map((adj) => (
                                    <tr key={adj.id} className="hover:bg-slate-50 transition-colors group">
                                        <td className="px-4 py-3">
                                            <div className="flex items-center gap-2">
                                                <div className="w-8 h-8 rounded-lg bg-slate-100 flex items-center justify-center shrink-0">
                                                    <Package className="h-4 w-4 text-slate-400" />
                                                </div>
                                                <div>
                                                    <p className="font-medium text-slate-800">{adj.product_name}</p>
                                                    <div className="flex items-center gap-1.5 text-[10px] text-slate-400 font-medium">
                                                        <span className="font-bold text-indigo-600 uppercase">{adj.product_sku || 'SYS-ID'}</span>
                                                        <span>•</span>
                                                        <span>{adj.warehouse_name || 'Global Node'}</span>
                                                    </div>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-4 py-3">
                                            <StatusPill type={adj.adjustment_type} />
                                        </td>
                                        <td className="px-4 py-3">
                                            <p className="text-slate-700 font-medium text-xs mb-0.5">{adj.reason}</p>
                                            <p className="text-[10px] text-slate-400 truncate max-w-[200px]">{adj.notes || 'No supporting commentary'}</p>
                                        </td>
                                        <td className="px-4 py-3 text-right">
                                            <div className={`font-bold text-sm tabular-nums ${adj.adjustment_type === 'Addition' || adj.adjustment_type === 'Gain' ? 'text-emerald-600' : 'text-rose-600'}`}>
                                                {adj.adjustment_type === 'Addition' || adj.adjustment_type === 'Gain' ? '+' : '-'}{Math.abs(Number(adj.quantity)).toLocaleString()}
                                            </div>
                                        </td>
                                        <td className="px-4 py-3 text-right">
                                            <div className="flex flex-col items-end">
                                                <div className="flex items-center gap-1 text-[11px] font-semibold text-slate-600">
                                                    <User className="h-3 w-3 text-indigo-600" />
                                                    <span>{adj.user_name || 'Admin'}</span>
                                                </div>
                                                <div className="flex items-center gap-1 text-[10px] text-slate-400 mt-0.5 tabular-nums">
                                                    <Calendar className="h-3 w-3" />
                                                    <span>{new Date(adj.created_at).toLocaleDateString()} • {new Date(adj.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                                                </div>
                                            </div>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </Card>

        </div>
    );
}

