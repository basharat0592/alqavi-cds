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
    AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
    BarChart, Bar, PieChart, Pie, Cell, Legend
} from 'recharts';

/* ═══════════════════════════════════════════════════════
   THEME CONSTANTS
═══════════════════════════════════════════════════════ */
const THEME = {
    primary: '#FF9900',   // Amazon Orange
    secondary: '#0f172a', // Slate 900
    dark: '#1e293b',      // Slate 800
    hover: '#E68A00',
    link: '#FF9900',
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

    return (
        <Link href={href}
            className="group block admin-card p-6 border-white/40 hover:-translate-y-1 hover:shadow-xl transition-all duration-300">
            <div className="flex items-center gap-4 mb-4">
                <div className="w-12 h-12 bg-orange-50 dark:bg-[#FF9900]/10 border border-orange-100 dark:border-[#FF9900]/20 rounded-xl flex items-center justify-center shadow-inner group-hover:scale-110 transition-transform duration-300">
                    <Icon className="h-6 w-6 text-[#FF9900]" strokeWidth={2} />
                </div>
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-[0.1em]">{label}</p>
            </div>

            <div className="flex items-end justify-between">
                <div>
                    <p className="text-3xl font-black text-slate-900 dark:text-white tracking-tight">{value}</p>
                </div>
                {change !== undefined && (
                    <div className={`flex items-center gap-1 px-2 py-1 rounded-lg text-xs font-bold ${up ? 'bg-emerald-50 text-emerald-600' : 'bg-red-50 text-red-600'}`}>
                        {up ? <ArrowUpRight className="w-3 h-3" /> : <ArrowDownRight className="w-3 h-3" />}
                        {Math.abs(change)}%
                    </div>
                )}
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
        .toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    const statusCls = STATUS_COLORS[status.toLowerCase()] || STATUS_COLORS.pending;

    return (
        <div className="flex items-center justify-between py-3 px-4 border-b border-gray-100 dark:border-slate-800 last:border-0 hover:bg-gray-50 dark:hover:bg-slate-800/50 transition-colors">
            <div className="flex items-center gap-3">
                <div className="w-8 h-8 bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded flex items-center justify-center">
                    <ShoppingBag className="h-4 w-4 text-gray-400" />
                </div>
                <div>
                    <Link href="/admin/sales" className="text-sm font-bold text-slate-900 dark:text-white hover:text-[#FF9900] dark:hover:text-[#FFA41C] transition-colors">
                        {num}
                    </Link>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400 font-medium">{name}</p>
                </div>
            </div>
            <div className="flex items-center gap-6">
                <div className="text-right">
                    <p className="text-sm font-bold text-gray-900 dark:text-white">PKR {amount.toFixed(0)}</p>
                    <p className="text-[10px] text-gray-400 dark:text-slate-500 font-medium">{date}</p>
                </div>
                <div className={`px-2 py-0.5 rounded border text-[10px] font-bold uppercase tracking-wider ${statusCls}`}>
                    {status}
                </div>
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
    const date = new Date(user.created_at || Date.now()).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });

    return (
        <div className="flex items-center justify-between py-3 px-4 border-b border-gray-100 dark:border-slate-800 last:border-0 hover:bg-gray-50 dark:hover:bg-slate-800/50 transition-colors">
            <div className="flex items-center gap-3">
                <div className="h-8 w-8 bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded flex items-center justify-center font-bold text-gray-500 dark:text-slate-400 text-xs">
                    {name[0]?.toUpperCase() || 'U'}
                </div>
                <div>
                    <p className="text-sm font-bold text-gray-900 dark:text-white">{name}</p>
                    <p className="text-[11px] text-gray-500 dark:text-slate-500">{email}</p>
                </div>
            </div>
            <span className="text-[10px] font-bold text-gray-400 dark:text-slate-600">{date}</span>
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
                <div className="w-10 h-10 bg-orange-50 dark:bg-[#FF9900]/10 border border-orange-100 dark:border-[#FF9900]/20 rounded-xl flex items-center justify-center z-10
                                group-hover:bg-[#FF9900] group-hover:text-[#131921] transition-all duration-300 shadow-sm">
                    <ShoppingBag className="h-4 w-4" strokeWidth={2} />
                </div>
                <div className="w-px flex-1 bg-slate-100 dark:bg-slate-800 group-last:hidden" />
            </div>
            <div className="flex-1 pb-6 pt-1">
                <p className="font-bold text-sm text-slate-900 dark:text-white">Order #{order.orderNumber || order.id}</p>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                    {order.customerName || 'Customer'} — PKR {Number(order.total_amount || order.total || 0).toLocaleString()}
                </p>
                <div className="flex items-center gap-1.5 mt-2">
                    <Clock className="w-3 h-3 text-slate-400 dark:text-slate-600" />
                    <p className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest">{time}</p>
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
        <div className="bg-white dark:bg-slate-900 p-4 rounded-xl shadow-2xl border border-gray-100 dark:border-slate-800">
            <p className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-[0.1em] mb-2">{label}</p>
            <p className="text-xl font-black text-[#FF9900]">PKR {payload[0].value.toLocaleString()}</p>
            <p className="text-[10px] font-bold text-slate-500 dark:text-slate-400 mt-1">{payload[1]?.value || 0} total orders</p>
        </div>
    );
}

/* ═══════════════════════════════════════════════════════
   SECTION CARD WRAPPER
═══════════════════════════════════════════════════════ */
function SectionCard({ children, className = '' }: { children: React.ReactNode; className?: string }) {
    return (
        <div className={`admin-card border-white/40 ${className}`}>
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
        <div className="px-6 py-5 border-b border-slate-100/50 dark:border-slate-800 bg-white/20 dark:bg-slate-900/40 flex items-center justify-between gap-4">
            <div className="flex items-center gap-4">
                <div className="p-2 bg-orange-50 dark:bg-[#FF9900]/10 rounded-lg">
                    <Icon className="h-5 w-5 text-[#FF9900]" />
                </div>
                <div>
                    <h2 className="text-sm font-bold text-slate-900 dark:text-white">{title}</h2>
                    <p className="text-[10px] text-slate-400 dark:text-slate-500 font-bold uppercase tracking-widest mt-0.5">{subtitle}</p>
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
            <div className="w-14 h-14 bg-gray-50 dark:bg-slate-800 rounded-2xl flex items-center justify-center mx-auto mb-4 border border-gray-100 dark:border-slate-700">
                <Icon className="h-7 w-7 text-gray-300 dark:text-slate-600" />
            </div>
            <h3 className="font-bold text-gray-900 dark:text-white mb-1">{title}</h3>
            <p className="text-sm text-gray-500 dark:text-slate-400 max-w-xs mx-auto">{description}</p>
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

    return (
        <div className="px-4 py-3 border-b border-gray-100 dark:border-slate-800 last:border-0 hover:bg-gray-50 dark:hover:bg-slate-800/50 transition-all flex items-center justify-between gap-4">
            <div className="flex items-center gap-4 flex-1 min-w-0">
                <div className="w-8 h-8 rounded bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-slate-700 flex items-center justify-center font-bold text-gray-500 dark:text-slate-400 text-xs flex-shrink-0">
                    {rank + 1}
                </div>
                <div className="min-w-0 flex-1">
                    <Link href={`/admin/products/${product.id}`} className="text-sm font-bold text-[#007185] dark:text-[#00A8C1] hover:text-[#C45500] dark:hover:text-[#FF9900] hover:underline truncate block">
                        {product.name}
                    </Link>
                    <div className="h-1.5 w-full bg-gray-100 dark:bg-slate-800 rounded-full mt-1.5 overflow-hidden max-w-[120px]">
                        <div className="h-full bg-[#FF9900] rounded-full transition-all duration-1000" style={{ width: `${pct}%` }} />
                    </div>
                </div>
            </div>
            <div className="text-right">
                <p className="text-sm font-bold text-gray-900 dark:text-white">{product.sales || 0}</p>
                <p className="text-[10px] text-gray-400 dark:text-slate-500 font-medium">units</p>
            </div>
        </div>
    );
}


/* ═══════════════════════════════════════════════════════
   MAIN DASHBOARD PAGE
═══════════════════════════════════════════════════════ */
export default function AdminDashboard() {
    const { stats, recentOrders, recentPurchases, recentUsers, topProducts, products, orders, revenueData, revenueData30, activityLogs, loading, refetch } = useAdminDashboard();
    const { isAuthenticated } = useAdminAuth();
    const [chartRange, setChartRange] = useState<'7' | '30'>('7');

    const chartData = chartRange === '7' ? revenueData : revenueData30;

    // ── DATA PREPARATION ──
    const categoryDist = products.reduce((acc: any, p: any) => {
        const cat = p.category_name || p.category || 'Uncategorized';
        acc[cat] = (acc[cat] || 0) + 1;
        return acc;
    }, {});
    const pieData = Object.entries(categoryDist)
        .map(([name, value]) => ({ name, value }))
        .sort((a, b) => Number(b.value) - Number(a.value))
        .slice(0, 5);

    const stockDist = [
        { name: 'Low Stock', value: products.filter(p => p.quantity_in_stock <= 10 && p.quantity_in_stock > 0).length, color: '#FF9900' },
        { name: 'Out of Stock', value: products.filter(p => p.quantity_in_stock === 0).length, color: '#ef4444' },
    ];

    if (loading) return (
        <div className="flex items-center justify-center min-h-[60vh]">
            <div className="w-10 h-10 border-4 border-gray-100 border-t-[#FF9900] rounded-full animate-spin" />
        </div>
    );

    return (
        <div className="max-w-[1400px] mx-auto pb-12 font-sans px-4 mt-4">

            {/* ── SELLER CENTRAL HEADER ── */}
            <div className="bg-white dark:bg-slate-900 p-6 mb-8 rounded-2xl shadow-[0_8px_30px_rgba(0,0,0,0.04)] dark:shadow-[0_8px_30px_rgba(0,0,0,0.2)] border border-gray-100 dark:border-slate-800 flex items-center justify-between">
                <div className="flex items-center gap-8">
                    <div>
                        <h1 className="text-2xl font-black text-slate-900 dark:text-white tracking-tight">Dashboard Overview</h1>
                        <p className="text-xs font-bold text-[#FF9900] dark:text-[#FFA41C] tracking-widest uppercase mt-0.5">Al-Qavi Distributor Management</p>
                    </div>
                    <div className="h-10 w-px bg-slate-100 dark:bg-slate-800 hidden md:block" />
                    <div className="hidden md:flex items-center gap-3 group cursor-pointer text-slate-500 dark:text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 transition-all duration-300">
                        <div className="p-2 bg-slate-50 dark:bg-slate-800 rounded-lg group-hover:bg-indigo-50 dark:group-hover:bg-indigo-900/30 transition-colors">
                            <Globe className="w-4 h-4" />
                        </div>
                        <span className="text-[10px] font-bold uppercase tracking-widest">Main Node | Pakistan</span>
                    </div>
                </div>
                <div className="flex items-center gap-6">
                    <button onClick={() => refetch?.()} className="p-2.5 bg-slate-50 dark:bg-slate-800 hover:bg-orange-50 dark:hover:bg-[#FF9900]/10 rounded-xl transition-all duration-300 text-slate-400 hover:text-[#FF9900] shadow-sm border border-slate-100 dark:border-slate-700">
                        <RefreshCw className="w-4 h-4" />
                    </button>
                    <div className="text-right">
                        <p className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest">Live Status</p>
                        <p className="text-xs font-black text-slate-900 dark:text-white">{new Date().toLocaleTimeString()}</p>
                    </div>
                </div>
            </div>

            {/* ── CORE METRICS BOARD (Horizontal Strip) ── */}
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 mb-6">
                <MetricBox label="NET BALANCE" value={`PKR ${stats?.totalRevenue?.toLocaleString()}`} change={stats?.revenueChange} />
                <MetricBox label="UNITS SOLD" value={stats?.totalOrders?.toLocaleString() || '0'} change={stats?.ordersChange} />
                <MetricBox label="TODAY'S ORDERS" value={stats?.ordersToday?.toLocaleString() || '0'} />
                <MetricBox label="PENDING" value={stats?.pendingOrders?.toLocaleString() || '0'} />
                <MetricBox label="PRODUCTS" value={stats?.totalProducts || '0'} />
                <MetricBox label="CUSTOMERS" value={stats?.totalCustomers || '0'} />
            </div>

            {/* ── MAIN DASHBOARD GRID ── */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">

                {/* LARGE LEFT COLUMN (Charts & Deep Data) */}
                <div className="lg:col-span-8 space-y-6">

                    {/* 1. SALES TREND CHART */}
                    <div className="bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-800 shadow-[0_4px_20px_rgba(0,0,0,0.03)] dark:shadow-[0_4px_20px_rgba(0,0,0,0.2)] rounded">
                        <div className="px-5 py-3 border-b border-gray-100 dark:border-slate-800 flex items-center justify-between">
                            <h2 className="text-sm font-bold text-gray-800 dark:text-white">Sales Trend</h2>
                            <div className="flex bg-gray-100 dark:bg-slate-800 p-0.5 rounded border border-gray-200 dark:border-slate-700">
                                {(['7', '30'] as const).map(r => (
                                    <button key={r} onClick={() => setChartRange(r)}
                                        className={`px-3 py-1 text-[10px] font-bold rounded transition-all
                                                    ${chartRange === r ? 'bg-white dark:bg-slate-700 text-[#007185] dark:text-[#00A8C1] shadow-sm border border-gray-200 dark:border-slate-600' : 'text-gray-500 dark:text-slate-400 hover:text-gray-900 dark:hover:text-white'}`}>
                                        {r}D
                                    </button>
                                ))}
                            </div>
                        </div>
                        <div className="p-5 h-[320px]">
                            <ResponsiveContainer width="100%" height="100%">
                                <AreaChart data={chartData}>
                                    <defs>
                                        <linearGradient id="amazonGradient" x1="0" y1="0" x2="0" y2="1">
                                            <stop offset="5%" stopColor="#007185" stopOpacity={0.1} /><stop offset="95%" stopColor="#007185" stopOpacity={0} />
                                        </linearGradient>
                                    </defs>
                                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(0,0,0,0.03)" />
                                    <XAxis dataKey="date" axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#94a3b8', fontWeight: 600 }} />
                                    <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#94a3b8', fontWeight: 600 }} />
                                    <Tooltip content={<ChartTooltip />} />
                                    <Area type="monotone" dataKey="revenue" stroke="#FF9900" strokeWidth={3} fill="url(#amazonGradient)" />
                                </AreaChart>
                            </ResponsiveContainer>
                        </div>
                    </div>

                    {/* 2. ORDER VOLUME BAR CHART */}
                    <div className="bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-800 shadow-[0_4px_20px_rgba(0,0,0,0.03)] dark:shadow-[0_4px_20px_rgba(0,0,0,0.2)] rounded">
                        <div className="px-5 py-3 border-b border-gray-100 dark:border-slate-800 flex items-center justify-between bg-gray-50/30 dark:bg-slate-800/20">
                            <h2 className="text-sm font-bold text-gray-800 dark:text-white">Order Volume</h2>
                            <Link href="/admin/sales" className="text-[10px] font-bold text-[#007185] dark:text-[#00A8C1] hover:underline uppercase tracking-wider">Expand Details</Link>
                        </div>
                        <div className="p-5 h-[280px]">
                            <ResponsiveContainer width="100%" height="100%">
                                <BarChart data={chartData}>
                                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f0f0f0" />
                                    <XAxis dataKey="date" axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#666' }} />
                                    <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#666' }} />
                                    <Tooltip cursor={{ fill: '#f7f7f7' }} />
                                    <Bar dataKey="orders" fill="#FF9900" radius={[2, 2, 0, 0]} barSize={32} />
                                </BarChart>
                            </ResponsiveContainer>
                        </div>
                    </div>

                    {/* 3. CATEGORY DISTRIBUTION & SALES LEADERBOARD */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-800 shadow-[0_4px_20px_rgba(0,0,0,0.03)] dark:shadow-[0_4px_20px_rgba(0,0,0,0.2)] rounded">
                            <div className="px-5 py-3 border-b border-gray-100 dark:border-slate-800 bg-gray-50/30 dark:bg-slate-800/20">
                                <h2 className="text-sm font-bold text-gray-800 dark:text-white uppercase tracking-tight">Category Distribution</h2>
                            </div>
                            <div className="p-2 h-[260px]">
                                <ResponsiveContainer width="100%" height="100%">
                                    <PieChart>
                                        <Pie data={pieData} innerRadius={50} outerRadius={75} paddingAngle={4} dataKey="value">
                                            {pieData.map((_, index) => <Cell key={index} fill={['#FF9900', '#232F3E', '#007185', '#C45500', '#37475A'][index % 5]} />)}
                                        </Pie>
                                        <Tooltip />
                                        <Legend verticalAlign="bottom" iconType="circle" wrapperStyle={{ fontSize: '9px', fontWeight: 'bold', paddingTop: '10px' }} />
                                    </PieChart>
                                </ResponsiveContainer>
                            </div>
                        </div>

                        <div className="bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-800 shadow-[0_4px_20px_rgba(0,0,0,0.03)] dark:shadow-[0_4px_20px_rgba(0,0,0,0.2)] rounded">
                            <div className="px-5 py-3 border-b border-gray-100 dark:border-slate-800 bg-gray-50/30 dark:bg-slate-800/20">
                                <h2 className="text-sm font-bold text-gray-800 dark:text-white uppercase tracking-tight">Top Sellers</h2>
                            </div>
                            <div className="p-4 h-[260px]">
                                <ResponsiveContainer width="100%" height="100%">
                                    <BarChart layout="vertical" data={topProducts}>
                                        <XAxis type="number" hide />
                                        <YAxis dataKey="name" type="category" width={80} tick={{ fontSize: 9, fontWeight: 700 }} axisLine={false} tickLine={false} />
                                        <Tooltip cursor={{ fill: '#f7f7f7' }} />
                                        <Bar dataKey="sales" fill="#232F3E" barSize={14} radius={[0, 2, 2, 0]} />
                                    </BarChart>
                                </ResponsiveContainer>
                            </div>
                        </div>
                    </div>
                </div>

                {/* RIGHT COLUMN (Alerts, Inventory & News) */}
                <div className="lg:col-span-4 space-y-6">

                    {/* MANAGE INVENTORY BOX */}
                    <div className="bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-800 shadow-[0_4px_20px_rgba(0,0,0,0.03)] dark:shadow-[0_4px_20px_rgba(0,0,0,0.2)] rounded">
                        <div className="px-5 py-3 border-b border-gray-100 dark:border-slate-800 flex items-center gap-2">
                            <AlertTriangle className="w-4 h-4 text-orange-500" />
                            <h2 className="text-sm font-bold text-gray-800 dark:text-white uppercase">Inventory Health</h2>
                        </div>
                        <div className="p-5 space-y-4">
                            {stockDist.map((item, i) => (
                                <div key={i} className="flex items-center justify-between p-3 bg-gray-50 dark:bg-slate-800 border border-gray-100 dark:border-slate-700 rounded hover:border-gray-300 dark:hover:border-slate-500 transition-colors">
                                    <span className="text-xs font-bold text-gray-600 dark:text-slate-400 tracking-tight">{item.name}</span>
                                    <span className="text-sm font-black" style={{ color: item.color }}>{item.value} ITEMS</span>
                                </div>
                            ))}
                            <Link href="/admin/products" className="block text-center py-2 text-[11px] font-bold text-[#007185] dark:text-[#00A8C1] border border-[#007185]/20 dark:border-[#007185]/40 rounded hover:bg-[#007185]/5 dark:hover:bg-[#007185]/10 transition-colors">
                                MANAGE ALL PRODUCTS
                            </Link>
                        </div>
                    </div>

                    {/* RECENT ACTIVITY (Ticker Style) */}
                    <div className="bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-800 shadow-[0_4px_20px_rgba(0,0,0,0.03)] dark:shadow-[0_4px_20px_rgba(0,0,0,0.2)] rounded h-fit">
                        <div className="px-5 py-3 border-b border-gray-100 dark:border-slate-800 bg-gray-50/30 dark:bg-slate-800/20 flex items-center justify-between">
                            <h2 className="text-sm font-bold text-gray-800 dark:text-white uppercase tracking-tight">Order Lifecycle</h2>
                            <Link href="/admin/sales" className="text-[9px] font-black text-slate-400 hover:text-indigo-600 transition-colors uppercase tracking-widest">View All</Link>
                        </div>
                        <div className="divide-y divide-gray-100 dark:divide-slate-800 overflow-y-auto max-h-[350px]">
                            {recentOrders.map(o => (
                                <div key={o.id} className="p-4 hover:bg-gray-50 dark:hover:bg-slate-800/50 transition-colors group">
                                    <div className="flex justify-between mb-1">
                                        <span className="text-xs font-bold text-[#007185] dark:text-[#00A8C1] group-hover:underline uppercase tracking-tighter transition-all">ORDER {o.orderNumber || o.id}</span>
                                        <span className="text-[10px] font-bold text-gray-400 dark:text-slate-500">{new Date(o.created_at).toLocaleDateString([], { day: '2-digit', month: 'short' })}</span>
                                    </div>
                                    <div className="flex justify-between items-center">
                                        <p className="text-[11px] text-gray-500 dark:text-slate-400 font-medium truncate max-w-[150px]">{o.customerName || 'Customer'}</p>
                                        <span className="text-xs font-black text-gray-900 dark:text-white">PKR {Number(o.total_amount || 0).toFixed(0)}</span>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* RECENT PURCHASE ORDERS */}
                    <div className="bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-800 shadow-[0_4px_20px_rgba(0,0,0,0.03)] dark:shadow-[0_4_20px_rgba(0,0,0,0.2)] rounded h-fit">
                        <div className="px-5 py-3 border-b border-gray-100 dark:border-slate-800 bg-gray-50/30 dark:bg-slate-800/20 flex items-center justify-between">
                            <h2 className="text-sm font-bold text-gray-800 dark:text-white uppercase tracking-tight">Procurement Feed</h2>
                            <Link href="/admin/purchases" className="text-[9px] font-black text-slate-400 hover:text-orange-600 transition-colors uppercase tracking-widest">View All</Link>
                        </div>
                        <div className="divide-y divide-gray-100 dark:divide-slate-800 overflow-y-auto max-h-[350px]">
                            {recentPurchases.length > 0 ? (
                                recentPurchases.map(p => (
                                    <div key={p.id} className="p-4 hover:bg-gray-50 dark:hover:bg-slate-800/50 transition-colors group border-l-4 border-transparent hover:border-orange-400">
                                        <div className="flex justify-between mb-1">
                                            <span className="text-xs font-bold text-gray-900 dark:text-white group-hover:text-orange-500 transition-colors uppercase tracking-tighter underline decoration-dotted decoration-gray-300 group-hover:decoration-orange-300">PO: {p.purchase_number}</span>
                                            <span className="text-[10px] font-bold text-gray-400 dark:text-slate-500">{new Date(p.created_at).toLocaleDateString([], { day: '2-digit', month: 'short' })}</span>
                                        </div>
                                        <div className="flex justify-between items-center">
                                            <p className="text-[11px] text-gray-500 dark:text-slate-400 font-medium truncate max-w-[150px]">{p.supplier_name || 'Generic Supplier'}</p>
                                            <span className="text-xs font-black text-orange-600">- PKR {Number(p.total_amount || 0).toFixed(0)}</span>
                                        </div>
                                    </div>
                                ))
                            ) : (
                                <p className="text-[10px] text-slate-400 italic text-center py-6 uppercase tracking-widest font-bold">No purchase records</p>
                            )}
                        </div>
                    </div>

                    {/* REAL-TIME ACTIVITY LOGS */}
                    <div className="bg-white/40 dark:bg-slate-900/40 glass-effect p-6 rounded-2xl border border-gray-100 dark:border-slate-800 shadow-[0_4px_20px_rgba(0,0,0,0.03)] dark:shadow-[0_4px_20px_rgba(0,0,0,0.2)]">
                        <div className="flex items-center gap-3 mb-6 text-[#FF9900]">
                            <div className="p-2 bg-orange-50 dark:bg-[#FF9900]/10 rounded-lg">
                                <Activity className="w-5 h-5" />
                            </div>
                            <h3 className="text-sm font-bold uppercase tracking-widest">System Activity</h3>
                        </div>
                        <div className="space-y-4">
                            {activityLogs.length > 0 ? (
                                activityLogs.map((log: any) => (
                                    <div key={log.id} className="border-l-4 border-[#FF9900] pl-4 py-2 bg-white/40 dark:bg-slate-800/40 rounded-r-xl transition-all hover:bg-white/60 dark:hover:bg-slate-800/60">
                                        <p className="text-[11px] font-bold text-slate-900 dark:text-white leading-tight uppercase tracking-tight">{log.action_display || log.action}</p>
                                        <p className="text-[10px] text-slate-500 dark:text-slate-400 font-medium mt-1">{log.description}</p>
                                        <div className="flex items-center gap-2 mt-2">
                                            <Clock className="w-2.5 h-2.5 text-slate-400" />
                                            <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">
                                                {new Date(log.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                            </span>
                                        </div>
                                    </div>
                                ))
                            ) : (
                                <p className="text-[10px] text-slate-500 italic text-center py-4">No recent activity found.</p>
                            )}
                        </div>
                    </div>

                </div>
            </div>
        </div>
    );
}

// ── UTILITY COMPONENTS ──

function MetricBox({ label, value, change }: { label: string; value: string | number; change?: number }) {
    const up = change === undefined || change >= 0;
    return (
        <div className="bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-800 p-4 rounded shadow-[0_4px_20px_rgba(0,0,0,0.03)] dark:shadow-[0_4px_20px_rgba(0,0,0,0.2)] hover:border-[#FF9900] transition-colors group">
            <p className="text-[10px] font-bold text-gray-500 dark:text-slate-500 uppercase tracking-widest mb-1 group-hover:text-[#FF9900] transition-colors">{label}</p>
            <div className="flex items-baseline justify-between">
                <span className="text-lg font-black text-gray-900 dark:text-white tracking-tight">{value}</span>
                {change !== undefined && (
                    <span className={`text-[10px] font-bold ${up ? 'text-emerald-600' : 'text-red-600'}`}>
                        {up ? '▲' : '▼'} {Math.abs(change)}%
                    </span>
                )}
            </div>
        </div>
    );
}
