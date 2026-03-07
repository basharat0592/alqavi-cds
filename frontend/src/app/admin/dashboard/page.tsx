'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import {
    ShoppingBag, Package, Users, DollarSign,
    Clock, AlertTriangle, ArrowRight,
    Activity, ArrowUpRight, ArrowDownRight,
    Crown, TrendingUp, RefreshCw,
    Building2, Mail, Phone, MapPin, Globe, Pencil
} from 'lucide-react';
import { useAdminDashboard, useAdminAuth } from '@/hooks';
import { companyService, CompanyInfo } from '@/lib/api';
import {
    AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer
} from 'recharts';

/* ═══════════════════════════════════════════════════════
   THEME CONSTANTS
═══════════════════════════════════════════════════════ */
const THEME = {
    primary: '#FF9900',   // Rose Gold
    secondary: '#232F3E', // Deep Blue/Navy
    dark: '#131921',
    hover: '#e68a00',
} as const;

const STATUS_COLORS: Record<string, string> = {
    pending: 'bg-amber-50 text-amber-700 border-amber-200',
    processing: 'bg-blue-50 text-blue-700 border-blue-200',
    shipped: 'bg-cyan-50 text-cyan-700 border-cyan-200',
    delivered: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    cancelled: 'bg-red-50 text-red-700 border-red-200',
};

/* ═══════════════════════════════════════════════════════
   STAT CARD
═══════════════════════════════════════════════════════ */
interface StatCardProps {
    icon: React.ComponentType<any>;
    label: string;
    value: string | number;
    change?: number;
    accent: string;     // e.g. 'emerald', 'orange', 'purple'
    href: string;
}

function StatCard({ icon: Icon, label, value, change, accent, href }: StatCardProps) {
    const up = change === undefined || change >= 0;
    const accentMap: Record<string, { bg: string; text: string }> = {
        emerald: { bg: 'bg-emerald-50', text: 'text-emerald-600' },
        orange: { bg: 'bg-[#FF9900]/10', text: 'text-[#FF9900]' },
        amber: { bg: 'bg-amber-50', text: 'text-amber-600' },
        purple: { bg: 'bg-purple-50', text: 'text-purple-600' },
    };
    const a = accentMap[accent] || accentMap.orange;

    return (
        <Link href={href}
            className="group block bg-white rounded-2xl p-6 border border-gray-100 shadow-[0_2px_10px_rgba(0,0,0,0.04)]
                       hover:shadow-[0_8px_30px_rgba(0,0,0,0.08)] hover:-translate-y-1 hover:border-[#FF9900]/30
                       transition-all duration-300">
            <div className="flex items-start justify-between mb-4">
                <div className={`${a.bg} p-3 rounded-xl transition-colors`}>
                    <Icon className={`h-6 w-6 ${a.text}`} strokeWidth={2.2} />
                </div>
                {change !== undefined && (
                    <span className={`flex items-center gap-1 text-[11px] font-black px-2 py-1 rounded-lg
                                      ${up ? 'text-emerald-600 bg-emerald-50 border border-emerald-100'
                            : 'text-red-600 bg-red-50 border border-red-100'}`}>
                        {up ? <ArrowUpRight className="h-3.5 w-3.5" strokeWidth={3} />
                            : <ArrowDownRight className="h-3.5 w-3.5" strokeWidth={3} />}
                        {Math.abs(change)}%
                    </span>
                )}
            </div>

            <div>
                <p className="text-[11px] font-black text-gray-400 uppercase tracking-widest mb-1">{label}</p>
                <p className="text-3xl font-black text-gray-900 tracking-tight">{value}</p>
            </div>
        </Link>
    );
}

/* ═══════════════════════════════════════════════════════
   ORDER ROW
═══════════════════════════════════════════════════════ */
function OrderRow({ order }: { order: any }) {
    const num = order.orderNumber || `#${order.id}`;
    const name = order.customerName || 'Customer';
    const amount = Number(order.total_amount || order.total || 0);
    const status = order.status || 'Pending';
    const date = new Date(order.created_at || order.date || Date.now())
        .toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
    const statusCls = STATUS_COLORS[status.toLowerCase()] || STATUS_COLORS.pending;

    return (
        <div className="flex items-center justify-between py-3.5 px-4 hover:bg-gray-50/80 rounded-xl
                        transition-all group cursor-default">
            <div className="flex items-center gap-3.5">
                <div className="w-10 h-10 bg-gray-50 rounded-xl border border-gray-100 flex items-center justify-center
                                group-hover:bg-[#FF9900]/10 group-hover:border-[#FF9900]/20 transition-all">
                    <ShoppingBag className="h-4 w-4 text-gray-400 group-hover:text-[#FF9900] transition-colors" strokeWidth={2.5} />
                </div>
                <div>
                    <p className="font-bold text-gray-900 text-sm group-hover:text-[#FF9900] transition-colors">{num}</p>
                    <p className="text-[11px] text-gray-400 font-medium mt-0.5">{name}</p>
                </div>
            </div>
            <div className="flex items-center gap-4 sm:gap-6">
                <div className="text-right hidden sm:block">
                    <p className="font-bold text-gray-900 text-sm">PKR {amount.toFixed(2)}</p>
                    <p className="text-[10px] text-gray-400 font-medium mt-0.5">{date}</p>
                </div>
                <span className={`px-3 py-1.5 text-[10px] font-black uppercase tracking-widest rounded-lg border ${statusCls}`}>
                    {status}
                </span>
            </div>
        </div>
    );
}

/* ═══════════════════════════════════════════════════════
   USER ROW (New Signups)
═══════════════════════════════════════════════════════ */
function UserRow({ user }: { user: any }) {
    const name = user.name || user.first_name || 'User';
    const email = user.email || '';
    const date = new Date(user.created_at || Date.now())
        .toLocaleDateString('en-US', { month: 'short', day: 'numeric' });

    return (
        <div className="flex items-center justify-between py-3 px-4 hover:bg-gray-50/80 rounded-xl transition-all group">
            <div className="flex items-center gap-3.5">
                <div className="relative">
                    <div className="h-10 w-10 bg-[#FF9900] rounded-xl text-white flex items-center justify-center
                                    font-black text-sm group-hover:scale-105 transition-transform shadow-md">
                        {name[0]?.toUpperCase() || 'U'}
                    </div>
                    <div className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-emerald-400 rounded-full border-2 border-white" />
                </div>
                <div className="min-w-0">
                    <p className="font-bold text-gray-900 text-sm truncate group-hover:text-[#FF9900] transition-colors">{name}</p>
                    <p className="text-[11px] text-gray-400 truncate mt-0.5">{email}</p>
                </div>
            </div>
            <span className="text-[10px] font-bold text-gray-400 bg-gray-50 px-2.5 py-1 rounded-lg border border-gray-100
                             group-hover:bg-[#FF9900]/5 group-hover:text-[#FF9900] transition-colors">
                {date}
            </span>
        </div>
    );
}

/* ═══════════════════════════════════════════════════════
   ACTIVITY TIMELINE ITEM
═══════════════════════════════════════════════════════ */
function ActivityItem({ order }: { order: any }) {
    const time = new Date(order.created_at || order.date || Date.now())
        .toLocaleDateString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });

    return (
        <div className="flex gap-4 group">
            <div className="relative flex flex-col items-center">
                <div className="w-8 h-8 bg-[#FF9900]/10 rounded-lg flex items-center justify-center z-10
                                group-hover:scale-110 transition-transform">
                    <ShoppingBag className="h-3.5 w-3.5 text-[#FF9900]" strokeWidth={2.5} />
                </div>
                <div className="w-px flex-1 bg-gradient-to-b from-gray-200 to-transparent group-last:hidden" />
            </div>
            <div className="flex-1 pb-6 pt-1">
                <p className="font-bold text-sm text-gray-900">Order #{order.orderNumber || order.id}</p>
                <p className="text-xs text-gray-500 mt-0.5">
                    {order.customerName || 'Customer'} — PKR {Number(order.total_amount || order.total || 0).toFixed(2)}
                </p>
                <div className="flex items-center gap-1.5 mt-1.5">
                    <Clock className="w-3 h-3 text-gray-300" />
                    <p className="text-[10px] font-medium text-gray-400">{time}</p>
                </div>
            </div>
        </div>
    );
}

/* ═══════════════════════════════════════════════════════
   CHART TOOLTIP
═══════════════════════════════════════════════════════ */
function ChartTooltip({ active, payload, label }: any) {
    if (!active || !payload?.length) return null;
    return (
        <div className="bg-[#ffffffea] backdrop-blur-md p-4 rounded-xl shadow-[0_8px_30px_rgba(0,0,0,0.12)] border border-gray-100">
            <p className="text-[11px] font-black text-gray-400 uppercase tracking-widest mb-2">{label}</p>
            <p className="text-2xl font-black text-[#FF9900] mb-1">PKR {payload[0].value.toFixed(2)}</p>
            <p className="text-xs font-medium text-gray-500 flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-[#232F3E]" />
                {payload[1]?.value || 0} orders
            </p>
        </div>
    );
}

/* ═══════════════════════════════════════════════════════
   SECTION CARD WRAPPER
═══════════════════════════════════════════════════════ */
function SectionCard({ children, className = '' }: { children: React.ReactNode; className?: string }) {
    return (
        <div className={`bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden ${className}`}>
            {children}
        </div>
    );
}

function SectionHeader({ icon: Icon, title, subtitle, action }: {
    icon: React.ComponentType<any>;
    title: string;
    subtitle: string;
    action?: React.ReactNode;
}) {
    return (
        <div className="px-6 sm:px-8 py-5 border-b border-gray-100 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-center gap-3.5">
                <div className="w-10 h-10 bg-[#FF9900] rounded-xl flex items-center justify-center">
                    <Icon className="h-5 w-5 text-[#131921]" strokeWidth={2.5} />
                </div>
                <div>
                    <h2 className="text-base font-black text-gray-900 tracking-tight">{title}</h2>
                    <p className="text-[10px] font-medium text-gray-400 uppercase tracking-widest mt-0.5">{subtitle}</p>
                </div>
            </div>
            {action}
        </div>
    );
}

/* ═══════════════════════════════════════════════════════
   EMPTY STATE
═══════════════════════════════════════════════════════ */
function EmptyState({ icon: Icon, title, description }: {
    icon: React.ComponentType<any>; title: string; description: string;
}) {
    return (
        <div className="py-16 text-center px-6">
            <div className="w-14 h-14 bg-gray-50 rounded-2xl flex items-center justify-center mx-auto mb-4 border border-gray-100">
                <Icon className="h-7 w-7 text-gray-300" />
            </div>
            <h3 className="font-bold text-gray-900 mb-1">{title}</h3>
            <p className="text-sm text-gray-500 max-w-xs mx-auto">{description}</p>
        </div>
    );
}

/* ═══════════════════════════════════════════════════════
   TOP PRODUCT ROW
═══════════════════════════════════════════════════════ */
const RANK_STYLES = [
    'bg-[#FF9900]/10 border-[#FF9900]/30 text-[#FF9900]',
    'bg-[#232F3E]/10 border-[#232F3E]/20 text-[#232F3E]',
    'bg-gray-100 border-gray-200 text-gray-500',
    'bg-gray-50 border-gray-100 text-gray-400',
];

function ProductRow({ product, rank }: { product: any; rank: number }) {
    const pct = Math.max(10, 100 - rank * 18);
    const rankStyle = RANK_STYLES[rank] || RANK_STYLES[3];

    return (
        <Link href={`/admin/products/${product.id}`}
            className="block px-4 py-3 hover:bg-gray-50/80 rounded-xl transition-colors group">
            <div className="flex items-center gap-4">
                <div className={`w-11 h-11 rounded-xl flex items-center justify-center border
                                font-black text-lg shadow-sm ${rankStyle}`}>
                    #{rank + 1}
                </div>
                <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between mb-2">
                        <p className="font-bold text-sm text-gray-900 truncate pr-3
                                      group-hover:text-[#FF9900] transition-colors">
                            {product.name}
                        </p>
                        <span className="font-black text-sm text-[#FF9900] flex-shrink-0">{product.sales || 0}</span>
                    </div>
                    <div className="flex items-center gap-3">
                        <div className="h-1.5 flex-1 bg-gray-100 rounded-full overflow-hidden">
                            <div className={`h-full rounded-full transition-all duration-1000 ease-out
                                            ${rank === 0 ? 'bg-gradient-to-r from-[#FF9900] to-[#e68a00]'
                                    : 'bg-gradient-to-r from-[#232F3E] to-[#FF9900]'}`}
                                style={{ width: `${pct}%` }} />
                        </div>
                        <span className="text-[10px] font-medium text-gray-400 w-16 text-right">
                            PKR {Number(product.price || 0).toFixed(2)}
                        </span>
                    </div>
                </div>
            </div>
        </Link>
    );
}


/* ═══════════════════════════════════════════════════════
   MAIN DASHBOARD PAGE
═══════════════════════════════════════════════════════ */
export default function AdminDashboard() {
    const { stats, recentOrders, recentUsers, topProducts, revenueData, revenueData30, loading, refetch } = useAdminDashboard();
    const { isAuthenticated } = useAdminAuth();
    const [chartRange, setChartRange] = useState<'7' | '30'>('7');


    const chartData = chartRange === '7' ? revenueData : revenueData30;

    // ── Loading State ──
    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-[60vh]">
                <div className="text-center">
                    <div className="w-12 h-12 border-4 border-gray-100 border-t-[#FF9900] rounded-full animate-spin mx-auto mb-4" />
                    <p className="text-sm font-medium text-gray-400">Loading dashboard...</p>
                </div>
            </div>
        );
    }

    // ── Auth Guard ──
    if (!isAuthenticated) {
        return (
            <div className="max-w-md mx-auto py-20 px-6">
                <div className="bg-white rounded-2xl border border-red-100 p-10 text-center shadow-sm">
                    <div className="w-16 h-16 bg-red-50 rounded-2xl flex items-center justify-center mx-auto mb-5">
                        <AlertTriangle className="h-8 w-8 text-red-500" />
                    </div>
                    <h2 className="text-xl font-black text-gray-900 mb-2">Access Denied</h2>
                    <p className="text-sm text-gray-500">Please log in to access the admin dashboard.</p>
                </div>
            </div>
        );
    }

    // ── Format helpers ──
    const rawRev = Number(stats?.totalRevenue || 0);
    const fmtRevenue = `PKR ${Intl.NumberFormat('en-US', { notation: 'compact', maximumFractionDigits: 1 }).format(rawRev)}`;

    return (
        <div className="max-w-[1600px] mx-auto space-y-7 pb-12 font-sans px-3 sm:px-6 mt-6 relative z-0">

            {/* ── Ambient Background ── */}
            <div className="fixed inset-0 overflow-hidden pointer-events-none -z-10">
                <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] rounded-full bg-[#FF9900]/5 blur-[120px]" />
                <div className="absolute top-[20%] right-[-10%] w-[30%] h-[50%] rounded-full bg-orange-50/30 blur-[100px]" />
            </div>

            {/* ── Welcome Bar ── */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-black text-gray-900 tracking-tight">Dashboard</h1>
                    <p className="text-sm text-gray-500 font-medium mt-0.5">Overview of your business performance</p>
                </div>
                <button onClick={() => refetch?.()}
                    className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-200 rounded-xl
                               text-xs font-bold text-gray-600 hover:bg-gray-50 hover:shadow-sm transition-all">
                    <RefreshCw className="h-3.5 w-3.5" strokeWidth={2.5} />
                    Refresh
                </button>
            </div>





            {/* ═══ CONSOLIDATED STATS BOARD ═══ */}
            <div className="bg-white rounded-2xl border border-gray-100 shadow-[0_2px_10px_rgba(0,0,0,0.04)] overflow-hidden">
                <div className="grid grid-cols-2 md:grid-cols-4 divide-x divide-y md:divide-y-0 divide-gray-100">

                    {/* Revenue item */}
                    <div className="p-5 sm:p-6 group hover:bg-gray-50 transition-colors">
                        <div className="flex items-center gap-3 mb-2">
                            <div className="bg-emerald-50 p-2.5 rounded-xl text-emerald-600 group-hover:bg-emerald-100 transition-colors">
                                <DollarSign className="w-5 h-5" strokeWidth={2.5} />
                            </div>
                            <p className="text-[11px] font-black text-gray-400 uppercase tracking-widest">Total Revenue</p>
                        </div>
                        <div className="flex items-end justify-between mt-1">
                            <p className="text-2xl sm:text-3xl font-black text-gray-900 tracking-tight ml-2">{fmtRevenue}</p>
                            {(stats?.revenueChange !== undefined) && (
                                <span className={`text-[10px] font-black px-2 py-1 rounded-md mb-1
                                    ${stats.revenueChange >= 0 ? 'text-emerald-600 bg-emerald-50' : 'text-red-600 bg-red-50'}`}>
                                    {stats.revenueChange}%
                                </span>
                            )}
                        </div>
                    </div>

                    {/* Orders item */}
                    <div className="p-5 sm:p-6 group hover:bg-gray-50 transition-colors">
                        <div className="flex items-center gap-3 mb-2">
                            <div className="bg-[#FF9900]/10 p-2.5 rounded-xl text-[#FF9900] group-hover:bg-[#FF9900]/20 transition-colors">
                                <ShoppingBag className="w-5 h-5" strokeWidth={2.5} />
                            </div>
                            <p className="text-[11px] font-black text-gray-400 uppercase tracking-widest">Total Orders</p>
                        </div>
                        <div className="flex items-end justify-between mt-1">
                            <p className="text-2xl sm:text-3xl font-black text-gray-900 tracking-tight ml-2">
                                {stats?.totalOrders?.toLocaleString() || '0'}
                            </p>
                            {(stats?.ordersChange !== undefined) && (
                                <span className={`text-[10px] font-black px-2 py-1 rounded-md mb-1
                                    ${stats.ordersChange >= 0 ? 'text-emerald-600 bg-emerald-50' : 'text-red-600 bg-red-50'}`}>
                                    {stats.ordersChange}%
                                </span>
                            )}
                        </div>
                    </div>

                    {/* Products item */}
                    <div className="p-5 sm:p-6 group hover:bg-gray-50 transition-colors">
                        <div className="flex items-center gap-3 mb-2">
                            <div className="bg-amber-50 p-2.5 rounded-xl text-amber-600 group-hover:bg-amber-100 transition-colors">
                                <Package className="w-5 h-5" strokeWidth={2.5} />
                            </div>
                            <p className="text-[11px] font-black text-gray-400 uppercase tracking-widest">Products</p>
                        </div>
                        <div className="flex items-end justify-between mt-1">
                            <p className="text-2xl sm:text-3xl font-black text-gray-900 tracking-tight ml-2">
                                {stats?.totalProducts?.toLocaleString() || '0'}
                            </p>
                            {(stats?.productsChange !== undefined) && (
                                <span className={`text-[10px] font-black px-2 py-1 rounded-md mb-1
                                    ${stats.productsChange >= 0 ? 'text-emerald-600 bg-emerald-50' : 'text-red-600 bg-red-50'}`}>
                                    {stats.productsChange}%
                                </span>
                            )}
                        </div>
                    </div>

                    {/* Users item */}
                    <div className="p-5 sm:p-6 group hover:bg-gray-50 transition-colors">
                        <div className="flex items-center gap-3 mb-2">
                            <div className="bg-purple-50 p-2.5 rounded-xl text-purple-600 group-hover:bg-purple-100 transition-colors">
                                <Users className="w-5 h-5" strokeWidth={2.5} />
                            </div>
                            <p className="text-[11px] font-black text-gray-400 uppercase tracking-widest">Users</p>
                        </div>
                        <div className="flex items-end justify-between mt-1">
                            <p className="text-2xl sm:text-3xl font-black text-gray-900 tracking-tight ml-2">
                                {stats?.totalCustomers?.toLocaleString() || '0'}
                            </p>
                            {(stats?.customersChange !== undefined) && (
                                <span className={`text-[10px] font-black px-2 py-1 rounded-md mb-1
                                    ${stats.customersChange >= 0 ? 'text-emerald-600 bg-emerald-50' : 'text-red-600 bg-red-50'}`}>
                                    {stats.customersChange}%
                                </span>
                            )}
                        </div>
                    </div>

                </div>
            </div>

            {/* ═══ MAIN GRID ═══ */}
            {/* ═══ MAIN CONTENT ═══ */}
            <div className="space-y-7">

                {/* ── TOP: Revenue Graph (Full Width) ── */}
                <SectionCard>
                    <div className="p-6 sm:p-8">
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-8 gap-4">
                            <div className="flex items-center gap-4">
                                <div className="w-12 h-12 bg-gradient-to-br from-[#232F3E] to-[#131921] rounded-2xl flex items-center justify-center shadow-lg shadow-[#232F3E]/20">
                                    <TrendingUp className="h-6 w-6 text-white" strokeWidth={2.5} />
                                </div>
                                <div>
                                    <h2 className="text-sm font-black text-gray-900">Revenue Overview</h2>
                                    <p className="text-[10px] font-medium text-gray-400 uppercase tracking-widest">Sales trajectory</p>
                                </div>
                            </div>
                            <div className="flex bg-gray-100 p-1 rounded-lg border border-gray-200 w-fit">
                                {(['7', '30'] as const).map(r => (
                                    <button key={r} onClick={() => setChartRange(r)}
                                        className={`px-5 py-2 text-[11px] font-black rounded-xl transition-all
                                                    ${chartRange === r
                                                ? 'bg-[#232F3E] text-white shadow-md'
                                                : 'text-gray-400 hover:text-gray-900 hover:bg-white'}`}>
                                        {r} Days
                                    </button>
                                ))}
                            </div>
                        </div>

                        <div className="w-full h-[320px]">
                            <ResponsiveContainer width="100%" height="100%">
                                <AreaChart data={chartData || []} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                                    <defs>
                                        <linearGradient id="colorRev" x1="0" y1="0" x2="0" y2="1">
                                            <stop offset="5%" stopColor={THEME.primary} stopOpacity={0.25} />
                                            <stop offset="95%" stopColor={THEME.primary} stopOpacity={0} />
                                        </linearGradient>
                                    </defs>
                                    <XAxis dataKey="date" axisLine={false} tickLine={false}
                                        tick={{ fill: '#9CA3AF', fontSize: 11, fontWeight: 600 }} dy={10} />
                                    <YAxis yAxisId="left" axisLine={false} tickLine={false}
                                        tick={{ fill: '#9CA3AF', fontSize: 11, fontWeight: 600 }}
                                        tickFormatter={v => `Rs. ${v}`} />
                                    <YAxis yAxisId="right" orientation="right" axisLine={false} tickLine={false} hide />
                                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#F3F4F6" />
                                    <Tooltip content={<ChartTooltip />} />
                                    <Area yAxisId="left" type="monotone" dataKey="revenue" stroke={THEME.primary}
                                        strokeWidth={3} fillOpacity={1} fill="url(#colorRev)"
                                        animationDuration={1500} animationEasing="ease-in-out" />
                                    <Area yAxisId="right" type="monotone" dataKey="orders" stroke={THEME.secondary}
                                        strokeWidth={2} strokeDasharray="5 5" fill="none" animationDuration={1200} />
                                </AreaChart>
                            </ResponsiveContainer>
                        </div>
                    </div>
                </SectionCard>

                {/* ── MIDDLE: Orders & Top Products ── */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-7">

                    {/* Recent Orders */}
                    <div className="lg:col-span-2">
                        <SectionCard className="h-full flex flex-col">
                            <SectionHeader icon={ShoppingBag} title="Recent Orders" subtitle="Latest transactions"
                                action={
                                    <Link href="/admin/sales"
                                        className="flex items-center gap-2 px-5 py-2.5 text-[11px] font-black uppercase tracking-widest
                                                   bg-[#FF9900] text-white shadow-md shadow-[#FF9900]/20 rounded-xl hover:bg-[#e68a00] transition-all group">
                                        View All
                                        <ArrowRight className="h-3.5 w-3.5 group-hover:translate-x-1 transition-transform" strokeWidth={2.5} />
                                    </Link>
                                }
                            />
                            <div className="p-4 sm:p-6 flex-1">
                                {recentOrders?.length ? (
                                    <div className="space-y-0.5">
                                        {recentOrders.slice(0, 6).map(order => (
                                            <OrderRow key={order.id} order={order} />
                                        ))}
                                    </div>
                                ) : (
                                    <EmptyState icon={ShoppingBag} title="No orders yet"
                                        description="When customers start buying, transactions will appear here." />
                                )}
                            </div>
                        </SectionCard>
                    </div>

                    {/* Top Products */}
                    <div>
                        <SectionCard className="h-full flex flex-col">
                            <SectionHeader icon={Crown} title="Best Sellers" subtitle="Top products this month" />
                            <div className="p-4 sm:p-6 flex-1">
                                {topProducts?.length ? (
                                    <div className="space-y-1">
                                        {topProducts.slice(0, 5).map((product, idx) => (
                                            <ProductRow key={product.id} product={product} rank={idx} />
                                        ))}
                                    </div>
                                ) : (
                                    <EmptyState icon={Package} title="No data yet"
                                        description="Product sales data will populate here." />
                                )}
                            </div>
                        </SectionCard>
                    </div>
                </div>

                {/* ── BOTTOM: Activity & Users ── */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-7">

                    {/* Activity Feed */}
                    <SectionCard className="h-full flex flex-col">
                        <div className="px-6 sm:px-8 py-6 border-b border-gray-100/50 flex items-center gap-4">
                            <div className="w-12 h-12 bg-gradient-to-br from-[#FF9900] to-[#e68a00] rounded-2xl flex items-center justify-center shadow-lg shadow-[#FF9900]/20">
                                <Activity className="h-6 w-6 text-white" strokeWidth={2.5} />
                            </div>
                            <div>
                                <h2 className="text-base font-black text-gray-900 tracking-tight">Activity Feed</h2>
                                <p className="text-[10px] font-medium text-gray-400 uppercase tracking-widest mt-0.5">LATEST UPDATES</p>
                            </div>
                        </div>
                        <div className="p-6 flex-1">
                            {recentOrders?.length ? (
                                <div className="space-y-0">
                                    {recentOrders.slice(0, 4).map(order => (
                                        <ActivityItem key={`act-${order.id}`} order={order} />
                                    ))}
                                </div>
                            ) : (
                                <div className="text-center py-8">
                                    <p className="text-xs font-medium text-gray-400">No recent activity</p>
                                </div>
                            )}
                        </div>
                    </SectionCard>

                    {/* New Signups */}
                    <SectionCard className="h-full flex flex-col">
                        <div className="px-6 sm:px-8 py-6 border-b border-gray-100/50 flex items-center justify-between gap-4">
                            <div className="flex items-center gap-4">
                                <div className="w-12 h-12 bg-gradient-to-br from-[#232F3E] to-[#131921] rounded-2xl flex items-center justify-center shadow-lg shadow-[#232F3E]/20">
                                    <Users className="h-6 w-6 text-white" strokeWidth={2.5} />
                                </div>
                                <div>
                                    <h2 className="text-base font-black text-gray-900 tracking-tight">New Signups</h2>
                                    <p className="text-[10px] font-medium text-gray-400 uppercase tracking-widest mt-0.5">RECENT JOINTS</p>
                                </div>
                            </div>
                            <span className="bg-[#FF9900]/10 text-[#FF9900] text-[10px] font-bold uppercase tracking-wider
                                            px-3 py-1.5 rounded-xl border border-[#FF9900]/20 shadow-sm">
                                Recent
                            </span>
                        </div>
                        <div className="p-4 sm:p-6 flex-1">
                            {recentUsers?.length ? (
                                <div className="space-y-0.5">
                                    {recentUsers.slice(0, 4).map(user => (
                                        <UserRow key={user.id} user={user} />
                                    ))}
                                </div>
                            ) : (
                                <div className="text-center py-8">
                                    <p className="text-xs font-medium text-gray-400">No recent signups</p>
                                </div>
                            )}
                        </div>
                    </SectionCard>
                </div>
            </div>
        </div>
    );
}
