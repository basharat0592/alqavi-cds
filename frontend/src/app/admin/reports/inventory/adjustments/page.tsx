'use client';

import { useState, useEffect } from 'react';
import {
    Boxes, TrendingUp, AlertTriangle, ArrowRight,
    Calendar, Download, Filter, Search, Printer,
    RefreshCw, Layers, Warehouse, PlusCircle, MinusCircle, Info
} from 'lucide-react';
import PageLoader from '@/components/ui/PageLoader';
import { formatCurrency, formatDate } from '@/lib/utils';
import { PageHeader, Card, Button, Badge } from '@/components/admin/ui';

/* ── Stock Adjustments Audit Page ── */
export default function StockAdjustmentsReportPage() {
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        setTimeout(() => setLoading(false), 800);
    }, []);

    if (loading) return <PageLoader />;

    return (
        <div className="max-w-[1600px] mx-auto">

            {/* Header */}
            <PageHeader
                title="Adjustment Reports"
                subtitle="Audit log for damage, shortage, and opening stock"
                breadcrumbs={[
                    { label: 'Console', href: '/admin/dashboard' },
                    { label: 'Adjustment Reports' },
                ]}
                actions={
                    <Button variant="primary">
                        <Download className="h-4 w-4" /> Export Adjustment Log
                    </Button>
                }
            />

            {/* Tactical Metrics Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
                {[
                    { label: 'Opening Stock Value', value: 'Rs. 2.8M', icon: Layers, color: 'text-indigo-600' },
                    { label: 'Damaged Stock', value: '42 Items', icon: AlertTriangle, color: 'text-rose-500' },
                    { label: 'Shortage Detected', value: '18 Items', icon: MinusCircle, color: 'text-amber-500' },
                    { label: 'Excess Stock', value: '25 Items', icon: PlusCircle, color: 'text-emerald-500' },
                ].map((stat, i) => (
                    <Card key={i} className="p-6 flex items-center gap-5">
                        <div className={`p-3 rounded-xl bg-slate-50 ${stat.color} border border-current border-opacity-10`}>
                            <stat.icon className="h-6 w-6" />
                        </div>
                        <div>
                            <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1">{stat.label}</p>
                            <p className="text-xl font-bold text-slate-900 tracking-tight tabular-nums">{stat.value}</p>
                        </div>
                    </Card>
                ))}
            </div>

            {/* Detailed Adjustment Ledger */}
            <Card className="p-0 overflow-hidden">
                <div className="px-6 py-5 border-b border-slate-100 flex items-center justify-between bg-slate-50/60">
                    <h3 className="text-sm font-bold text-slate-900 tracking-tight">Adjustment Ledger</h3>
                    <div className="flex items-center gap-3">
                        <div className="flex bg-slate-100 p-1 rounded-xl">
                            <button className="px-4 py-1.5 text-[10px] font-bold uppercase tracking-wider bg-white text-indigo-600 rounded-lg shadow-sm border border-slate-200">All Logs</button>
                            <button className="px-4 py-1.5 text-[10px] font-bold uppercase tracking-wider text-slate-400 hover:text-indigo-600">Damaged</button>
                            <button className="px-4 py-1.5 text-[10px] font-bold uppercase tracking-wider text-slate-400 hover:text-indigo-600">Shortage</button>
                        </div>
                    </div>
                </div>
                <div className="overflow-x-auto">
                    <table className="w-full text-left">
                        <thead className="bg-slate-50/60 border-b border-slate-100 uppercase text-[11px] font-bold text-slate-400 tracking-wider">
                            <tr>
                                <th className="px-6 py-4">Manifest ID</th>
                                <th className="px-6 py-4">Date Manifest</th>
                                <th className="px-6 py-4">Identity</th>
                                <th className="px-6 py-4">Adjustment Type</th>
                                <th className="px-6 py-4 text-center">Qty Shift</th>
                                <th className="px-6 py-4">Operational Reason</th>
                                <th className="px-6 py-4 text-right">Action</th>
                            </tr>
                        </thead>
                        <tbody>
                            {[
                                { id: 'ADJ-8812', date: '2026-04-02', name: 'Premium Face Cream (50ml)', type: 'Damaged', q: '-5', r: 'Found leaking in Zone B' },
                                { id: 'ADJ-8811', date: '2026-04-01', name: 'Moisturizing Lotion - Bulk pack', type: 'Shortage', q: '-2', r: 'Discrepancy at checkout' },
                                { id: 'ADJ-8810', date: '2026-04-01', name: 'Opening Stock Entry - New Batch', type: 'Opening', q: '+150', r: 'Initial catalog population' },
                                { id: 'ADJ-8809', date: '2026-03-31', name: 'Herbal Essence (Small)', type: 'Excess', q: '+3', r: 'Found misplaced stock' },
                                { id: 'ADJ-8808', date: '2026-03-31', name: 'Night Serum (Advanced)', type: 'Damaged', q: '-1', r: 'Glass breakage during shelving' },
                            ].map((adj, i) => (
                                <tr key={i} className="border-b border-slate-100 hover:bg-slate-50 transition-colors text-[12px] font-medium">
                                    <td className="px-6 py-4 text-indigo-600 uppercase font-bold">{adj.id}</td>
                                    <td className="px-6 py-4 text-slate-400 tabular-nums">{adj.date}</td>
                                    <td className="px-6 py-4 text-slate-900 font-semibold tracking-tight">{adj.name}</td>
                                    <td className="px-6 py-4">
                                        <Badge tone={adj.type === 'Damaged' ? 'red' : adj.type === 'Shortage' ? 'amber' : 'green'}>
                                            {adj.type}
                                        </Badge>
                                    </td>
                                    <td className={`px-6 py-4 text-center font-bold tabular-nums ${adj.q.startsWith('+') ? 'text-emerald-600' : 'text-rose-600'}`}>{adj.q}</td>
                                    <td className="px-6 py-4 text-slate-500 italic max-w-[200px] truncate">{adj.r}</td>
                                    <td className="px-6 py-4 text-right">
                                        <button className="text-indigo-600 hover:text-indigo-700 hover:underline flex items-center gap-1 justify-end font-semibold">Audit <Info className="h-3 w-3" /></button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </Card>
        </div>
    );
}
