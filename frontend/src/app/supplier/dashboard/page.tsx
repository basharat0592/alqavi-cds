'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import {
    RefreshCw, TrendingUp, Package, Wallet, CheckCircle2,
    ArrowRight, AlertTriangle, Briefcase, Activity
} from 'lucide-react';
import {
    AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip,
    ResponsiveContainer
} from 'recharts';
import api from '@/lib/axios';
import { cn } from '@/lib/utils';
import { authService } from '@/lib/auth';

// ── Pure Amazon Formatting ──────────────────────────────────────────────────
const fmt = (n: number) =>
    new Intl.NumberFormat('en-PK', {
        style: 'currency',
        currency: 'PKR',
        maximumFractionDigits: 0
    }).format(n);

const formatDate = (d: string) =>
    new Date(d).toLocaleDateString('en-PK', { day: 'numeric', month: 'short', year: 'numeric' });

export default function SupplierDashboard() {
    const router = useRouter();
    const [orders, setOrders] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [stats, setStats] = useState<any>({ totalRemaining: 0, totalPaid: 0, totalVolume: 0, activeSkus: 0 });

    const fetchDashboard = useCallback(async () => {
        setLoading(true);
        try {
            const [ordersRes, purchasesRes, productsRes] = await Promise.all([
                api.get('/v1/sales/orders/'),
                api.get('/v1/sales/purchases/'),
                api.get('/v1/sales/products/')
            ]);

            const retailOrders = Array.isArray(ordersRes.data) ? ordersRes.data : ordersRes.data.results || [];
            const purchaseOrders = Array.isArray(purchasesRes.data) ? purchasesRes.data : purchasesRes.data.results || [];
            const products = Array.isArray(productsRes.data) ? productsRes.data : productsRes.data.results || [];

            const normalizedPOs = purchaseOrders.map((po: any) => ({
                id: po.id,
                order_number: po.purchase_number,
                created_at: po.order_date || po.created_at,
                total_amount: parseFloat(po.total_amount || 0),
                paid_amount: parseFloat(po.paid_amount || 0),
                payment_status: po.payment_status?.toUpperCase() || 'UNPAID',
                is_wholesale: true
            }));

            const combined = [...retailOrders, ...normalizedPOs];
            setOrders(combined);

            const rem = normalizedPOs.reduce((sum: number, o: any) => sum + (o.total_amount - o.paid_amount), 0);
            const paid = combined.reduce((sum: number, o: any) => sum + (o.is_wholesale ? o.paid_amount : parseFloat(o.total_amount)), 0);
            const vol = combined.reduce((sum: number, o: any) => sum + parseFloat(o.total_amount), 0);

            setStats({
                totalRemaining: rem,
                totalPaid: paid,
                totalVolume: vol,
                activeSkus: products.length
            });

        } catch (error) {
            console.error("Dashboard failed:", error);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchDashboard();
    }, [fetchDashboard]);

    const graphData = useMemo(() => {
        const sorted = [...orders].reverse();
        const dataMap: Record<string, { date: string, val: number }> = {};
        sorted.forEach(o => {
            const d = formatDate(o.created_at);
            if (!dataMap[d]) dataMap[d] = { date: d, val: 0 };
            dataMap[d].val += parseFloat(o.total_amount || 0);
        });
        return Object.values(dataMap).slice(-14);
    }, [orders]);

    return (
        <div className="max-w-[1240px] mx-auto py-6 px-4 lg:px-0 font-sans bg-[#F8FAFC] min-h-screen">

            {/* ── Amazon Professional Header ── */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8 bg-white p-6 rounded shadow-sm border border-gray-300">
                <div>
                    <h1 className="text-[24px] font-bold text-[#111] leading-tight">Partner Central Console</h1>
                    <div className="flex items-center gap-2 mt-1">
                        <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
                        <span className="text-[12px] text-[#565959] font-medium uppercase tracking-widest">System Operational • Live Data</span>
                    </div>
                </div>
                <div className="flex items-center gap-3">
                    <button onClick={fetchDashboard} className="p-2.5 border border-gray-300 rounded hover:bg-gray-50 bg-white transition-colors">
                        <RefreshCw className={`h-4 w-4 text-gray-600 ${loading ? 'animate-spin' : ''}`} />
                    </button>
                    <button
                        onClick={() => router.push('/supplier/sales')}
                        className="bg-[#f0c14b] border border-[#a88734] hover:bg-[#e7b42d] px-6 py-2 rounded shadow-sm text-[13px] text-[#111] font-bold flex items-center gap-2"
                    >
                        Detailed Financial Ledger <ArrowRight size={14} />
                    </button>
                </div>
            </div>

            {/* ── HIGH LEVEL KPI SECTION (Professional Row) ── */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
                {[
                    { label: 'Settled Funds', val: fmt(stats.totalPaid), icon: CheckCircle2, color: 'text-[#007600]', desc: 'Confirmed Cashflow' },
                    { label: 'Pending Settlement', val: fmt(stats.totalRemaining), icon: Wallet, color: 'text-[#b12704]', desc: 'Wholesale Accounts' },
                    { label: 'Active Catalog', val: stats.activeSkus, icon: Package, color: 'text-[#007185]', desc: 'Live Stock Items' },
                    { label: 'Total Volume', val: fmt(stats.totalVolume), icon: TrendingUp, color: 'text-[#111]', desc: 'Year-to-Date Gross' },
                ].map((kpi, idx) => (
                    <div key={idx} className="bg-white border border-gray-300 p-5 rounded shadow-sm hover:shadow-md transition-shadow group">
                        <div className="flex items-center justify-between mb-3">
                            <span className="text-[11px] font-bold text-[#565959] uppercase tracking-widest">{kpi.label}</span>
                            <kpi.icon className={cn("h-4 w-4", kpi.color)} />
                        </div>
                        <div className={cn("text-[20px] font-black tracking-tight", kpi.color)}>{kpi.val}</div>
                        <p className="text-[11px] text-[#565959] mt-2 font-medium">{kpi.desc}</p>
                    </div>
                ))}
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* ── MAIN TREND AREA (Left 2/3) ── */}
                <div className="lg:col-span-2 space-y-6">
                    <div className="bg-white border border-gray-300 rounded shadow-sm overflow-hidden">
                        <div className="bg-gray-50 border-b border-gray-300 px-6 py-3 flex items-center justify-between">
                            <h3 className="text-[15px] font-bold text-[#111]">Gross Sales Velocity (14 Days)</h3>
                            <span className="text-[11px] font-bold text-[#007185] cursor-pointer hover:underline">View Performance Report</span>
                        </div>
                        <div className="p-6">
                            <div className="h-[300px] w-full">
                                <ResponsiveContainer width="100%" height="100%">
                                    <AreaChart data={graphData}>
                                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e0e0e0" />
                                        <XAxis
                                            dataKey="date"
                                            axisLine={{ stroke: '#ccc' }}
                                            tickLine={false}
                                            tick={{ fontSize: 11, fill: '#555' }}
                                            dy={10}
                                        />
                                        <YAxis hide />
                                        <Tooltip
                                            contentStyle={{ border: '1px solid #ccc', fontSize: '13px', borderRadius: '4px' }}
                                            labelStyle={{ fontWeight: 'bold' }}
                                        />
                                        <Area type="monotone" dataKey="val" name="Sales" stroke="#e77600" strokeWidth={3} fill="#ffeddb" />
                                    </AreaChart>
                                </ResponsiveContainer>
                            </div>
                        </div>
                    </div>

                    {/* New Strategy Section: Business Insights */}
                    <div className="bg-white border border-gray-300 rounded shadow-sm p-6">
                        <h3 className="text-[17px] font-bold text-[#111] mb-6 border-b border-gray-100 pb-2">Business Operations Overview</h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                            <div className="flex gap-4">
                                <div className="p-3 bg-blue-50 rounded-lg shrink-0">
                                    <Activity className="h-6 w-6 text-blue-600" />
                                </div>
                                <div>
                                    <h4 className="text-[15px] font-bold text-[#111] mb-1">Stock Health</h4>
                                    <p className="text-[13px] text-[#565959] leading-relaxed">Your inventory sync is showing 100% data integrity with the distribution hub.</p>
                                </div>
                            </div>
                            <div className="flex gap-4">
                                <div className="p-3 bg-amber-50 rounded-lg shrink-0">
                                    <AlertTriangle className="h-6 w-6 text-amber-600" />
                                </div>
                                <div>
                                    <h4 className="text-[15px] font-bold text-[#111] mb-1">Financial Alerts</h4>
                                    <p className="text-[13px] text-[#565959] leading-relaxed">Ensure all pending Wholesale settlements are audited before the week-end close.</p>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* ── SIDEBAR (Professional Widgets) ── */}
                <div className="space-y-6">
                    <div className="bg-white border border-gray-300 rounded-lg shadow-sm overflow-hidden">
                        <div className="bg-gray-100 px-4 py-2 border-b border-gray-300">
                            <h3 className="text-[13px] font-bold text-[#111]">Recent Activity Summary</h3>
                        </div>
                        <div className="p-4 space-y-4">
                            {orders.slice(0, 10).map((o, idx) => (
                                <div key={idx} className="flex flex-col border-b border-gray-100 pb-3 last:border-0 last:pb-0">
                                    <div className="flex justify-between items-start mb-1">
                                        <span className="text-[12px] font-bold text-[#007185] hover:underline cursor-pointer" onClick={() => router.push(`/supplier/sales/${o.id}/invoice`)}>#{o.order_number}</span>
                                        <span className="text-[11px] font-black text-[#565959]">{fmt(parseFloat(o.total_amount))}</span>
                                    </div>
                                    <span className="text-[11px] text-[#565959]">{formatDate(o.created_at)} • {o.is_wholesale ? 'Wholesale' : 'Retail'}</span>
                                </div>
                            ))}
                            <button
                                onClick={() => router.push('/supplier/sales')}
                                className="w-full py-2 bg-gray-50 border border-gray-300 rounded text-[11px] font-bold text-[#111] hover:bg-gray-100 transition-colors mt-2"
                            >
                                View full activity ledger
                            </button>
                        </div>
                    </div>

                    <div className="bg-[#fff9e6] border border-[#f5d7bb] rounded-lg p-5">
                        <div className="flex gap-3">
                            <Briefcase className="h-5 w-5 text-[#c45500] shrink-0" />
                            <div>
                                <h4 className="text-[14px] font-bold text-[#111] mb-1">Professional Advisory</h4>
                                <p className="text-[12px] text-[#565959] leading-relaxed">
                                    Maintaining a 100% settlement rate improves your partner ranking. Wholesale partners are 45% more likely to re-order from high-ranking suppliers.
                                </p>
                            </div>
                        </div>
                    </div>

                    <div className="pt-6 text-center lg:text-left border-t border-gray-200">
                        <div className="flex items-center gap-2 mb-2 opacity-50 grayscale lg:justify-start justify-center">
                            <div className="w-5 h-5 bg-slate-900 rounded flex items-center justify-center font-bold text-white text-[8px]">A</div>
                            <span className="font-black text-[9px] tracking-tighter uppercase text-slate-900">Al-Qavi System</span>
                        </div>
                        <p className="text-[11px] text-[#565959] font-medium uppercase tracking-[0.2em]">© 2026 Partner Console</p>
                    </div>
                </div>
            </div>
        </div>
    );
}
