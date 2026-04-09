'use client';

import PageLoader from '@/components/ui/PageLoader';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import {
    ShoppingBag, Package, Users,
    ShoppingCart, Shield, MapPin,
    BarChart3, Boxes, LogOut, UserCheck, Clock, Banknote, Settings, AlertCircle, TrendingUp, DollarSign, ArrowUpRight
} from 'lucide-react';
import { useAdminDashboard } from '@/hooks';
import { authService } from '@/lib/auth';
import { useState, useEffect } from 'react';
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend
} from 'recharts';
import { formatCurrency } from '@/lib/utils';
import { dashboardService } from '@/services/dashboard.service';

/* ═══════════════════════════════════════════════════════
   ADMIN DASHBOARD PAGE (COMMAND HUB)
   High-density card grid for core distributive operations
═══════════════════════════════════════════════════════ */
export default function AdminDashboard() {
    const { 
        stats, 
        recentOrders, 
        recentPurchases, 
        revenueData, 
        revenueData30, 
        loading 
    } = useAdminDashboard();
    
    const router = useRouter();
    const [timeRange, setTimeRange] = useState<'3d' | '7d' | '30d'>('7d');
    const [isMounted, setIsMounted] = useState(false);

    useEffect(() => {
        setIsMounted(true);
    }, []);

    if (loading) return <PageLoader />;

    // 📈 Real Backend Data Slice based on Time Range
    const getChartData = () => {
        const history = timeRange === '30d' ? revenueData30 : revenueData;
        if (!history || history.length === 0) {
            return Array(7).fill(0).map((_, i) => ({ date: `P${i+1}`, sales: 0, purchases: 0 }));
        }
        
        if (timeRange === '3d') return history.slice(-3);
        return history; // useAdminDashboard already slices correctly for 7d/30d
    };

    const DASHBOARD_ACTIONS = [
        {
            title: "Track Order",
            desc: "Logistics & tracking portal",
            icon: MapPin,
            href: "/admin/tracking",
            color: "text-[#EEAF1C]"
        },
        {
            title: "Recent Orders",
            desc: "Track latest transactions",
            icon: Clock,
            href: "/admin/sales/recent",
            color: "text-[#EEAF1C]"
        },
        {
            title: "Purchases",
            desc: "Product procurement",
            icon: ShoppingBag,
            href: "/admin/purchases",
            color: "text-[#EEAF1C]"
        },
        {
            title: "Sales",
            desc: "Internal checkout system",
            icon: ShoppingCart,
            href: "/admin/sale",
            color: "text-[#EEAF1C]"
        },
        {
            title: "Users Management",
            desc: "Roles & security",
            icon: Users,
            href: "/admin/users",
            color: "text-[#EEAF1C]"
        },
        {
            title: "Reports",
            desc: "Business analytics",
            icon: BarChart3,
            href: "/admin/reports",
            color: "text-[#EEAF1C]"
        },
        {
            title: "Transactions",
            desc: "Financial audit trail",
            icon: Banknote,
            href: "/admin/payments",
            color: "text-[#EEAF1C]"
        },
    ];

    return (
        <div className="max-w-[1200px] mx-auto py-4 px-4 animate-in fade-in duration-700 font-sans">

            {/* Header Area: Simple Business */}
            <div className="mb-6 text-center md:text-left flex items-end justify-between border-b border-slate-200 dark:border-white/10 pb-4">
                <div>
                    <h1 className="text-2xl font-bold text-slate-900 dark:text-white uppercase tracking-tight">Dashboard Overview</h1>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 font-medium italic opacity-80">Track your business operations and performance</p>
                </div>
                <div className="hidden md:flex items-center gap-4 text-[10px] font-black uppercase tracking-widest text-slate-400">
                    <span className="flex items-center gap-1.5"><div className="w-1.5 h-1.5 rounded-full bg-emerald-500" /> Operational</span>
                    <span className="opacity-30">|</span>
                    <span>{new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}</span>
                </div>
            </div>

            {/* ── Key Metrics ── */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
                {[
                    { label: 'Total Revenue', val: formatCurrency(stats.totalRevenue), icon: DollarSign, trend: '+12.5%', color: 'text-emerald-500' },
                    { label: 'Sales Volume', val: stats.totalOrders, icon: ShoppingCart, trend: 'Monthly', color: 'text-[#EEAF1C]' },
                    { label: 'Product Stock', val: stats.totalProducts, icon: Boxes, trend: 'Managed', color: 'text-indigo-500' },
                    { label: 'Daily Sales', val: formatCurrency(revenueData?.[revenueData.length-1]?.sales || 0), icon: TrendingUp, trend: 'Latest', color: 'text-blue-500' },
                ].map((st, i) => (
                    <div key={i} className="bg-white dark:bg-[#2d3a4b] border border-slate-200 dark:border-white/10 p-4 rounded-xl shadow-sm">
                        <div className="flex items-center justify-between mb-2">
                            <div className={`p-1.5 rounded-lg bg-slate-50 dark:bg-white/5 ${st.color}`}>
                                <st.icon className="h-4 w-4" />
                            </div>
                            <span className="text-[9px] font-black uppercase tracking-widest text-slate-400">{st.trend}</span>
                        </div>
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-0.5">{st.label}</p>
                        <p className="text-xl font-black text-slate-900 dark:text-white tracking-tight">{st.val}</p>
                    </div>
                ))}
            </div>

            {/* ── COMMAND HUB: Dual-Pane Tactical Interface ── */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                
                {/* ── LEFT PROTOCOL: Business Intelligence & Data Streams (2/3) ── */}
                <div className="lg:col-span-2 space-y-8">
                    
                    {/* 📋 Recent Sales Hub */}
                    <div className="bg-white dark:bg-[#2d3a4b] border border-slate-200 dark:border-white/10 rounded-2xl overflow-hidden shadow-sm">
                        <div className="p-5 border-b border-slate-100 dark:border-white/10 flex items-center justify-between bg-slate-50 dark:bg-white/5">
                            <div>
                                <h3 className="text-sm font-bold text-slate-800 dark:text-white flex items-center gap-2">
                                    <DollarSign className="h-4 w-4 text-[#EEAF1C]" />
                                    Recent Sales Hub
                                </h3>
                                <p className="text-[11px] text-slate-500 dark:text-slate-400 font-medium tracking-tight">Tracking latest sales and receipts</p>
                            </div>
                            <Link href="/admin/sales/recent" className="flex items-center gap-2 px-3 py-1.5 bg-white dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-lg text-[10px] font-bold text-slate-600 dark:text-slate-300 hover:text-[#EEAF1C] hover:border-[#EEAF1C]/40 transition-all uppercase tracking-wider shadow-sm active:scale-95">
                                View Entries
                            </Link>
                        </div>
                        <div className="overflow-x-auto">
                            <table className="w-full text-left">
                                <thead className="bg-slate-50/50 dark:bg-white/[0.02] border-b border-slate-100 dark:border-white/10">
                                    <tr>
                                        <th className="px-5 py-3 text-[10px] font-black text-slate-400 uppercase tracking-widest pl-6">Order ID</th>
                                        <th className="px-5 py-3 text-[10px] font-black text-slate-400 uppercase tracking-widest">Customer</th>
                                        <th className="px-5 py-3 text-[10px] font-black text-slate-400 uppercase tracking-widest">Total</th>
                                        <th className="px-5 py-3 text-[10px] font-black text-slate-400 uppercase tracking-widest text-right pr-6">Status</th>
                                    </tr>
                                </thead>
                                 <tbody className="divide-y divide-slate-100 dark:divide-white/5">
                                    {recentOrders.length > 0 ? (
                                        recentOrders.map((row, i) => (
                                            <tr key={i} className="hover:bg-slate-50/80 dark:hover:bg-white/[0.01] transition-colors group cursor-default">
                                                <td className="px-5 py-4 text-[12px] font-bold text-[#EEAF1C] pl-6 tracking-tighter">{row.order_number}</td>
                                                <td className="px-5 py-4 text-[12px] font-bold text-slate-800 dark:text-slate-300">
                                                    {row.customer_name || 'Customer'}
                                                </td>
                                                <td className="px-5 py-4 text-[12px] font-black text-slate-900 dark:text-white">{formatCurrency(row.total_amount)}</td>
                                                <td className="px-5 py-4 text-right pr-6">
                                                    <span className={`px-2 py-0.5 rounded text-[9px] font-black uppercase tracking-widest border ${row.status === 'delivered' ? 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20' : 'bg-amber-500/10 text-amber-500 border-amber-500/20'}`}>
                                                        {row.status}
                                                    </span>
                                                </td>
                                            </tr>
                                        ))
                                    ) : (
                                        <tr>
                                            <td colSpan={4} className="px-5 py-10 text-center text-xs text-slate-400 font-bold uppercase tracking-widest opacity-40">No Transaction Data Node Available</td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>

                    {/* 📊 Analytics Graph: Performance Analysis */}
                    <div className="bg-white dark:bg-[#2d3a4b] border border-slate-200 dark:border-white/10 rounded-2xl overflow-hidden shadow-sm flex flex-col">
                        <div className="p-6 border-b border-slate-100 dark:border-white/10 flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-slate-50 dark:bg-white/5">
                            <div>
                                <h3 className="text-sm font-bold text-slate-800 dark:text-white flex items-center gap-2">
                                    <TrendingUp className="h-4 w-4 text-[#EEAF1C]" />
                                    Performance Trends
                                </h3>
                                <p className="text-[11px] text-slate-500 dark:text-slate-400 font-medium tracking-tight">Revenue vs. Purchases Comparison</p>
                            </div>
                            
                            {/* ── Range Selector ── */}
                            <div className="flex bg-white dark:bg-black/20 p-1 border border-slate-200 dark:border-white/5 rounded-lg shadow-sm">
                                {(['3d', '7d', '30d'] as const).map((r) => (
                                    <button
                                        key={r}
                                        onClick={() => setTimeRange(r)}
                                        className={`px-3 py-1 text-[10px] font-black uppercase tracking-tighter rounded-md transition-all ${
                                            timeRange === r 
                                                ? 'bg-[#EEAF1C] text-white shadow-sm' 
                                                : 'text-slate-400 hover:text-slate-600 dark:hover:text-white'
                                        }`}
                                    >
                                        {r}
                                    </button>
                                ))}
                            </div>
                        </div>
                        <div className="flex-1 min-h-[340px]">
                            {isMounted ? (
                                <ResponsiveContainer width="100%" height={340}>
                                    <AreaChart
                                        data={getChartData()}
                                        margin={{ top: 10, right: 10, left: 0, bottom: 0 }}
                                    >
                                        <defs>
                                            <linearGradient id="colorSales" x1="0" y1="0" x2="0" y2="1">
                                                <stop offset="5%" stopColor="#EEAF1C" stopOpacity={0.25}/>
                                                <stop offset="95%" stopColor="#EEAF1C" stopOpacity={0}/>
                                            </linearGradient>
                                            <linearGradient id="colorPurchases" x1="0" y1="0" x2="0" y2="1">
                                                <stop offset="5%" stopColor="#0EA5E9" stopOpacity={0.25}/>
                                                <stop offset="95%" stopColor="#0EA5E9" stopOpacity={0}/>
                                            </linearGradient>
                                        </defs>
                                        <CartesianGrid strokeDasharray="3 3" stroke="#88888822" vertical={false} />
                                        <XAxis 
                                            dataKey="date" 
                                            axisLine={false} 
                                            tickLine={false} 
                                            tick={{fontSize: 10, fontWeight: 700, fill: '#888'}}
                                            dy={10}
                                        />
                                        <YAxis 
                                            axisLine={false} 
                                            tickLine={false} 
                                            tick={{fontSize: 10, fontWeight: 700, fill: '#888'}}
                                        />
                                        <Tooltip 
                                            contentStyle={{ 
                                                backgroundColor: '#2d3a4b', 
                                                borderColor: '#EEAF1C', 
                                                borderRadius: '12px',
                                                fontSize: '11px',
                                                fontWeight: '700',
                                                color: '#fff',
                                                borderWidth: '2px',
                                                boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.3)'
                                            }}
                                            itemStyle={{ padding: '2px 0' }}
                                            formatter={(val: any) => formatCurrency(val)}
                                        />
                                        <Legend 
                                            verticalAlign="top" 
                                            align="right" 
                                            height={36} 
                                            iconType="circle"
                                            wrapperStyle={{ fontSize: '10px', fontWeight: 'bold', textTransform: 'uppercase', letterSpacing: '0.05em' }}
                                        />
                                        <Area 
                                            name="Sales"
                                            type="monotone" 
                                            dataKey="sales" 
                                            stroke="#EEAF1C" 
                                            strokeWidth={3}
                                            fillOpacity={1} 
                                            fill="url(#colorSales)" 
                                        />
                                        <Area 
                                            name="Purchases"
                                            type="monotone" 
                                            dataKey="purchases" 
                                            stroke="#0EA5E9" 
                                            strokeWidth={3}
                                            fillOpacity={1} 
                                            fill="url(#colorPurchases)" 
                                        />
                                    </AreaChart>
                                </ResponsiveContainer>
                            ) : (
                                <div className="w-full h-full flex items-center justify-center">
                                    <div className="h-8 w-8 border-4 border-[#EEAF1C] border-t-transparent rounded-full animate-spin"></div>
                                </div>
                            )}
                        </div>
                    </div>
                </div>

                {/* ── RIGHT PROTOCOL: Operational Command (1/3) ── */}
                <div className="space-y-6">
                    
                    {/* Main Operational Grid */}
                    <div className="flex flex-col gap-3">
                        <div className="flex items-center gap-3 mb-2 opacity-50">
                            <span className="text-[10px] font-black text-slate-400 uppercase tracking-[0.3em]">Quick Links</span>
                            <div className="h-px flex-1 bg-slate-200 dark:bg-white/10" />
                        </div>
                        {DASHBOARD_ACTIONS.map((action, idx) => (
                            <Link
                                key={idx}
                                href={action.href}
                                className="flex items-center gap-4 p-4 bg-white dark:bg-[#2d3a4b] border border-slate-200 dark:border-white/10 rounded-xl hover:bg-slate-50 dark:hover:bg-white/5 shadow-sm hover:shadow-md transition-all group active:scale-95 border-l-4 hover:border-l-[#EEAF1C]"
                            >
                                <div className="p-2.5 rounded-lg bg-slate-50 dark:bg-white/5 text-[#EEAF1C] group-hover:scale-110 transition-transform duration-500">
                                    <action.icon className="h-5 w-5" strokeWidth={2.5} />
                                </div>
                                <div className="flex-1">
                                    <h2 className="text-[14px] font-bold text-slate-900 dark:text-white transition-colors group-hover:text-[#EEAF1C]">{action.title}</h2>
                                    <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-tight">{action.desc}</p>
                                </div>
                            </Link>
                        ))}
                    </div>

                    {/* 🔔 Alerts Section */}
                    <div className="bg-white dark:bg-[#2d3a4b] border border-slate-200 dark:border-white/10 rounded-2xl overflow-hidden shadow-sm flex flex-col">
                        <div className="p-4 border-b border-slate-100 dark:border-white/10 flex items-center justify-between bg-slate-50 dark:bg-white/5">
                            <h3 className="text-[10px] font-black text-slate-400 dark:text-white/20 uppercase tracking-[0.2em]">Latest Updates</h3>
                            <Link href="/admin/alerts" className="text-[10px] font-bold text-[#EEAF1C] hover:underline flex items-center gap-1 uppercase tracking-widest">
                                Manage <ArrowUpRight className="h-2.5 w-2.5" />
                            </Link>
                        </div>
                        <div className="p-4 space-y-3">
                            {[
                                { status: 'CRITICAL', msg: 'Face Serum low stock', time: '14m', color: 'bg-rose-500/10 text-rose-500' },
                                { status: 'WARNING', msg: 'Large order pending auth', time: '32m', color: 'bg-amber-500/10 text-amber-500' },
                            ].map((alert, i) => (
                                <div key={i} className="flex items-center justify-between gap-3 p-2 group cursor-default border-b border-slate-100 dark:border-white/5 last:border-0 pb-3">
                                    <div className="flex-1">
                                        <p className="text-[11.5px] text-slate-800 dark:text-slate-300 font-bold leading-tight group-hover:text-[#EEAF1C] transition-colors">{alert.msg}</p>
                                        <span className="text-[9px] text-slate-400 font-medium uppercase mt-1 inline-block tracking-tighter">{alert.time} ago • Monitoring protocol active</span>
                                    </div>
                                    <span className={`px-1.5 py-0.5 rounded text-[8px] font-black ${alert.color} uppercase tracking-tighter`}>{alert.status}</span>
                                </div>
                            ))}
                        </div>
                    </div>

                </div>
            </div>

            {/* ── Extended Navigation ── */}
            <div className="mt-12 pt-8 border-t border-slate-200 dark:border-white/10">
                <div className="flex items-center gap-4 mb-6">
                    <h3 className="text-[10px] font-black text-slate-400 dark:text-white/20 uppercase tracking-[0.3em] whitespace-nowrap">Explore Modules</h3>
                    <div className="h-px w-full bg-gradient-to-r from-slate-200 dark:from-white/5 to-transparent" />
                </div>

                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-y-4 gap-x-8">
                    {[
                        { name: 'System Alerts', href: '/admin/alerts' },
                        { name: 'Stock Movements', href: '/admin/inventory/movements' },
                        { name: 'Warehouse Control', href: '/admin/inventory/warehouses' },
                        { name: 'Inventory Adjustments', href: '/admin/inventory/adjustments' },
                        { name: 'Product Categories', href: '/admin/products/main-categories' },
                        { name: 'Supplier Registry', href: '/admin/company/suppliers' },
                        { name: 'Return Management', href: '/admin/sale-returns' },
                        { name: 'Sale Registry', href: '/admin/sales' },
                        { name: 'Purchase Returns', href: '/admin/purchases/returns' },
                        { name: 'Client Balances', href: '/admin/payments/customer' },
                        { name: 'Roles & Security', href: '/admin/users/roles' },
                        { name: 'Access Control', href: '/admin/users/permissions' },
                        { name: 'System Accounting', href: '/admin/reports?type=accounting' },
                        { name: 'Executive Audit', href: '/admin/reports' },
                    ].map((link) => (
                        <Link
                            key={link.name}
                            href={link.href}
                            className="text-[10.5px] font-bold uppercase tracking-widest text-slate-500 hover:text-[#EEAF1C] dark:text-slate-400 dark:hover:text-[#EEAF1C] transition-colors flex items-center gap-2 group"
                        >
                            <div className="w-1 h-1 bg-slate-300 dark:bg-white/10 rounded-full group-hover:bg-[#EEAF1C] transition-colors" />
                            {link.name}
                        </Link>
                    ))}
                </div>
            </div>

            {/* Footer Area */}
            <div className="mt-20 py-10 border-t border-slate-200 dark:border-white/10 text-center">
                <div className="flex items-center justify-center gap-2 mb-4 opacity-30 grayscale hover:opacity-100 hover:grayscale-0 transition-all duration-500">
                    <div className="w-6 h-6 bg-slate-900 dark:bg-[#EEAF1C] rounded flex items-center justify-center font-bold text-white dark:text-slate-900 text-[10px]">A</div>
                    <span className="font-black text-xs tracking-tighter uppercase text-slate-900 dark:text-white">Al-Qavi System Dashboard</span>
                </div>
                <p className="text-[10px] text-gray-400 font-bold uppercase tracking-[0.3em]">© 2026 Admin Portal • Enterprise Edition</p>
            </div>
        </div>
    );
}
