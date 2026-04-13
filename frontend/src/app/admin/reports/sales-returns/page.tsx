'use client';

import { useState, useEffect } from 'react';
import { 
    RotateCcw, TrendingUp, Search, Calendar, Download, Filter, 
    Printer, ArrowRight, CheckCircle, Clock, ShoppingCart, 
    Package, RefreshCw, Layers, AlertTriangle, TrendingDown
} from 'lucide-react';
import PageLoader from '@/components/ui/PageLoader';
import { formatCurrency, formatDate } from '@/lib/utils';
import { SectionCard } from '@/components/ui/QaviStyles';
import { 
    AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
    BarChart, Bar, Legend, Cell, PieChart, Pie
} from 'recharts';

/* ── Sale & Returns Report Page ── */
export default function SaleReturnsReportPage() {
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
                    <div className="w-16 h-16 bg-[#F59E0B] rounded-2xl flex items-center justify-center shadow-xl shadow-blue-500/20 ring-4 ring-blue-500/5">
                        <RotateCcw className="h-8 w-8 text-white" />
                    </div>
                    <div>
                        <h1 className="text-3xl font-bold text-slate-900 dark:text-white tracking-tight uppercase">Sales & Returns</h1>
                        <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mt-1">Full-Cycle Transactional Performance Matrix</p>
                    </div>
                </div>
                
                <div className="flex flex-wrap items-center gap-3">
                    <button className="flex items-center gap-2 px-6 py-2.5 bg-[#F59E0B] text-white text-[11px] font-black uppercase tracking-widest rounded-xl hover:bg-blue-700 shadow-lg shadow-blue-500/20 transition-all active:scale-95">
                        <Download className="h-4 w-4" /> Export Report Manifest
                    </button>
                </div>
            </div>

            {/* Matrix Sensors */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-10">
                {[
                    { label: 'Gross Sales Volume', value: 'Rs. 5.1M', icon: ShoppingCart, color: 'text-indigo-600', trend: '+12.4%' },
                    { label: 'Net Returns Value', value: 'Rs. 420,500', icon: RotateCcw, color: 'text-rose-600', trend: '-2.1%' },
                    { label: 'Return Frequency', value: '4.2%', icon: RefreshCw, color: 'text-amber-600', trend: '+0.5%' },
                    { label: 'Realized Revenue', value: 'Rs. 4.68M', icon: TrendingUp, color: 'text-emerald-600', trend: '+14.1%' },
                ].map((stat, i) => (
                    <SectionCard key={i} className="p-6">
                        <p className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-[0.2em] mb-4">{stat.label}</p>
                        <div className="flex items-end justify-between relative z-10">
                            <div>
                                <p className={`text-2xl font-black text-slate-900 dark:text-white tracking-tighter`}>{stat.value}</p>
                            </div>
                            <div className={`px-2 py-1 rounded-lg text-[9px] font-black ${stat.trend.startsWith('+') ? 'bg-emerald-50 text-emerald-600' : 'bg-red-50 text-red-600'}`}>
                                {stat.trend}
                            </div>
                        </div>
                    </SectionCard>
                ))}
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 mb-10">
                <SectionCard className="lg:col-span-8 p-6">
                    <div className="flex items-center justify-between mb-8">
                        <h3 className="text-sm font-bold text-slate-900 dark:text-white uppercase tracking-tight">Return Vs Sale Trajectory</h3>
                        <div className="flex items-center gap-4"><span className="w-2.5 h-2.5 rounded-full bg-[#F59E0B]" /> <span className="text-[9px] font-bold uppercase text-slate-500 tracking-wider">Gross Sales</span></div>
                    </div>
                    <div className="h-[350px]">
                        <ResponsiveContainer width="100%" height="100%">
                            <AreaChart data={[
                                { name: 'Mon', s: 4000, r: 400 },
                                { name: 'Tue', s: 3000, r: 200 },
                                { name: 'Wed', s: 2000, r: 600 },
                                { name: 'Thu', s: 2780, r: 500 },
                                { name: 'Fri', s: 1890, r: 100 },
                                { name: 'Sat', s: 2390, r: 400 },
                                { name: 'Sun', s: 3490, r: 200 },
                            ]}>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(0,0,0,0.05)" />
                                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 10, fontWeight: 700 }} />
                                <YAxis hide />
                                <Tooltip />
                                <Area type="monotone" dataKey="s" stroke="#F59E0B" strokeWidth={3} fill="#F59E0B" fillOpacity={0.05} />
                                <Area type="monotone" dataKey="r" stroke="#f43f5e" strokeWidth={3} fill="#f43f5e" fillOpacity={0.05} />
                            </AreaChart>
                        </ResponsiveContainer>
                    </div>
                </SectionCard>

                <SectionCard className="lg:col-span-4 p-6 bg-[#131921] text-white">
                    <div className="flex items-center gap-3 mb-6">
                        <AlertTriangle className="h-5 w-5 text-[#F59E0B]" />
                        <h3 className="text-sm font-bold uppercase tracking-widest">Return Reason Analysis</h3>
                    </div>
                    <div className="space-y-4">
                        {[
                            { l: 'Quality Discrepancy', v: '45%', c: 'text-red-400' },
                            { l: 'Freight Damage', v: '28%', c: 'text-amber-400' },
                            { l: 'Customer Reject', v: '15%', c: 'text-blue-400' },
                            { l: 'Processing Error', v: '12%', c: 'text-slate-400' },
                        ].map((h, i) => (
                            <div key={i} className="flex items-center justify-between p-4 bg-white/5 border border-white/5 rounded-2xl">
                                <span className="text-[10px] font-bold uppercase text-slate-400 tracking-tighter">{h.l}</span>
                                <span className={`text-sm font-black ${h.c}`}>{h.v}</span>
                            </div>
                        ))}
                    </div>
                </SectionCard>
            </div>

            <SectionCard className="p-0 overflow-hidden">
                <div className="px-6 py-5 border-b border-slate-100 dark:border-white/5 flex items-center justify-between bg-slate-50/50">
                    <h3 className="text-sm font-bold text-slate-900 dark:text-white uppercase tracking-tight">Recent Returns Registry</h3>
                    <button className="text-[10px] font-black text-[#F59E0B] uppercase hover:underline">View Full Ledger</button>
                </div>
                <div className="overflow-x-auto">
                    <table className="w-full text-left">
                        <thead className="bg-slate-50/30 dark:bg-white/[0.02] border-b border-slate-100 dark:border-white/10 uppercase text-[9px] font-black text-slate-400 tracking-widest">
                            <tr>
                                <th className="px-6 py-4">Return ID</th>
                                <th className="px-6 py-4">Orig. Order</th>
                                <th className="px-6 py-4">Customer identity</th>
                                <th className="px-6 py-4">Credit Status</th>
                                <th className="px-6 py-4 text-center">Date Manifest</th>
                                <th className="px-6 py-4 text-right">Value</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-50 dark:divide-white/5">
                            {[
                                { id: 'RET-2291', o: 'SO-8172', name: 'Al-Noor Cosmetics', s: 'Reconciled', date: '2026-04-02', v: 'Rs. 12,500' },
                                { id: 'RET-2290', o: 'SO-8152', name: 'The Glow Mart', s: 'Pending Review', date: '2026-04-01', v: 'Rs. 4,200' },
                                { id: 'RET-2289', o: 'SO-8022', name: 'Walk-in Retail', s: 'Reconciled', date: '2026-03-31', v: 'Rs. 1,500' },
                            ].map((ret, i) => (
                                <tr key={i} className="hover:bg-slate-50/50 dark:hover:bg-white/5 transition-colors text-[11px] font-bold">
                                    <td className="px-6 py-4 text-[#F59E0B] uppercase font-black">{ret.id}</td>
                                    <td className="px-6 py-4 text-slate-400 uppercase">{ret.o}</td>
                                    <td className="px-6 py-4 text-slate-900 dark:text-white uppercase tracking-tight">{ret.name}</td>
                                    <td className="px-6 py-4">
                                        <span className={`px-2 py-0.5 rounded text-[9px] font-black uppercase ${ret.s === 'Reconciled' ? 'bg-emerald-50 text-emerald-600' : 'bg-amber-50 text-amber-600'}`}>
                                            {ret.s}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4 text-center text-slate-400 font-bold uppercase">{ret.date}</td>
                                    <td className="px-6 py-4 text-right text-rose-600">{ret.v}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </SectionCard>
        </div>
    );
}
