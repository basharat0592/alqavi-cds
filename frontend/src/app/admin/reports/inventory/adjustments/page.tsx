'use client';

import { useState, useEffect } from 'react';
import { 
    Boxes, TrendingUp, AlertTriangle, ArrowRight, 
    Calendar, Download, Filter, Search, Printer, 
    RefreshCw, Layers, Warehouse, PlusCircle, MinusCircle, Info
} from 'lucide-react';
import PageLoader from '@/components/ui/PageLoader';
import { formatCurrency, formatDate } from '@/lib/utils';
import { SectionCard } from '@/components/ui/AmazonStyles';

/* ── Stock Adjustments Audit Page ── */
export default function StockAdjustmentsReportPage() {
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        setTimeout(() => setLoading(false), 800);
    }, []);

    if (loading) return <PageLoader />;

    return (
        <div className="max-w-[1600px] mx-auto px-6 py-8 bg-slate-50 dark:bg-[#070F14] min-h-screen font-sans">
            
            {/* Header */}
            <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-6 mb-10">
                <div className="flex items-center gap-5">
                    <div className="w-16 h-16 bg-[#EEAF1C] rounded-2xl flex items-center justify-center shadow-xl shadow-blue-500/20 ring-4 ring-blue-500/5">
                        <Boxes className="h-8 w-8 text-white" />
                    </div>
                    <div>
                        <h1 className="text-3xl font-bold text-slate-900 dark:text-white tracking-tight uppercase">Stock Adjustments</h1>
                        <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mt-1">Audit Log for Damage, Shortage, and Opening Stock</p>
                    </div>
                </div>
                
                <div className="flex flex-wrap items-center gap-3">
                    <button className="flex items-center gap-2 px-6 py-2.5 bg-[#EEAF1C] text-white text-[11px] font-black uppercase tracking-widest rounded-xl hover:bg-blue-700 shadow-lg shadow-blue-500/20 transition-all active:scale-95">
                        <Download className="h-4 w-4" /> Export Adjustment Log
                    </button>
                </div>
            </div>

            {/* Tactical Metrics Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-10">
                {[
                    { label: 'Opening Stock Value', value: 'Rs. 2.8M', icon: Layers, color: 'text-blue-500' },
                    { label: 'Damaged Stock', value: '42 Items', icon: AlertTriangle, color: 'text-red-500' },
                    { label: 'Shortage Detected', value: '18 Items', icon: MinusCircle, color: 'text-orange-500' },
                    { label: 'Excess Stock', value: '25 Items', icon: PlusCircle, color: 'text-emerald-500' },
                ].map((stat, i) => (
                    <SectionCard key={i} className="p-6 flex items-center gap-5">
                        <div className={`p-3 rounded-xl bg-slate-50 dark:bg-white/5 ${stat.color} border border-current border-opacity-10`}>
                            <stat.icon className="h-6 w-6" />
                        </div>
                        <div>
                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">{stat.label}</p>
                            <p className="text-xl font-black text-slate-900 dark:text-white tracking-tighter">{stat.value}</p>
                        </div>
                    </SectionCard>
                ))}
            </div>

            {/* Detailed Adjustment Ledger */}
            <SectionCard className="p-0 overflow-hidden">
                <div className="px-6 py-5 border-b border-slate-100 dark:border-white/5 flex items-center justify-between bg-slate-50/50">
                    <h3 className="text-sm font-bold text-slate-900 dark:text-white uppercase tracking-tight">Adjustment Ledger</h3>
                    <div className="flex items-center gap-3">
                        <div className="flex bg-slate-100 dark:bg-white/5 p-1 rounded-xl">
                            <button className="px-4 py-1.5 text-[9px] font-black uppercase bg-white dark:bg-white/10 text-[#EEAF1C] rounded-lg shadow-sm border border-slate-200 dark:border-white/10">All Logs</button>
                            <button className="px-4 py-1.5 text-[9px] font-black uppercase text-slate-400 hover:text-[#EEAF1C]">Damaged</button>
                            <button className="px-4 py-1.5 text-[9px] font-black uppercase text-slate-400 hover:text-[#EEAF1C]">Shortage</button>
                        </div>
                    </div>
                </div>
                <div className="overflow-x-auto">
                    <table className="w-full text-left">
                        <thead className="bg-slate-50/30 dark:bg-white/[0.02] border-b border-slate-100 dark:border-white/10 uppercase text-[9px] font-black text-slate-400 tracking-widest">
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
                        <tbody className="divide-y divide-slate-50 dark:divide-white/5">
                            {[
                                { id: 'ADJ-8812', date: '2026-04-02', name: 'Premium Face Cream (50ml)', type: 'Damaged', q: '-5', r: 'Found leaking in Zone B' },
                                { id: 'ADJ-8811', date: '2026-04-01', name: 'Moisturizing Lotion - Bulk pack', type: 'Shortage', q: '-2', r: 'Discrepancy at checkout' },
                                { id: 'ADJ-8810', date: '2026-04-01', name: 'Opening Stock Entry - New Batch', type: 'Opening', q: '+150', r: 'Initial catalog population' },
                                { id: 'ADJ-8809', date: '2026-03-31', name: 'Herbal Essence (Small)', type: 'Excess', q: '+3', r: 'Found misplaced stock' },
                                { id: 'ADJ-8808', date: '2026-03-31', name: 'Night Serum (Advanced)', type: 'Damaged', q: '-1', r: 'Glass breakage during shelving' },
                            ].map((adj, i) => (
                                <tr key={i} className="hover:bg-slate-50/50 dark:hover:bg-white/5 transition-colors text-[11px] font-bold">
                                    <td className="px-6 py-4 text-[#EEAF1C] uppercase font-black">{adj.id}</td>
                                    <td className="px-6 py-4 text-slate-400">{adj.date}</td>
                                    <td className="px-6 py-4 text-slate-900 dark:text-white uppercase tracking-tight">{adj.name}</td>
                                    <td className="px-6 py-4">
                                        <span className={`px-2 py-0.5 rounded text-[9px] font-black uppercase ${adj.type === 'Damaged' ? 'bg-red-50 text-red-600' : adj.type === 'Shortage' ? 'bg-amber-50 text-amber-600' : 'bg-emerald-50 text-emerald-600'}`}>
                                            {adj.type}
                                        </span>
                                    </td>
                                    <td className={`px-6 py-4 text-center font-black ${adj.q.startsWith('+') ? 'text-emerald-600' : 'text-rose-600'}`}>{adj.q}</td>
                                    <td className="px-6 py-4 text-slate-500 italic max-w-[200px] truncate">{adj.r}</td>
                                    <td className="px-6 py-4 text-right">
                                        <button className="text-[#EEAF1C] hover:underline flex items-center gap-1 justify-end">Audit <Info className="h-3 w-3" /></button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </SectionCard>
        </div>
    );
}
