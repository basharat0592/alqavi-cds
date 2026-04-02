'use client';

import PageLoader from '@/components/ui/PageLoader';

import { useRouter } from 'next/navigation';
import { useState, useEffect } from 'react';
import Link from 'next/link';
import {
    ShoppingBag, Package, Users, DollarSign,
    Clock, AlertTriangle, ArrowRight,
    Activity, ArrowUpRight, ArrowDownRight,
    Crown, TrendingUp, RefreshCw,
    Building2, Mail, Phone, MapPin, Globe, Pencil,
    Truck, FileText, UserCheck, FolderTree
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
    primary: '#EEAF1C',   // Orange Accent
    secondary: '#111D29', // Refined Navy Card
    dark: '#0B131A',      // Refined Navy BG
    hover: '#D49510',     // Darker Orange Hover
    link: '#EEAF1C',
} as const;

const STATUS_COLORS: Record<string, string> = {
    pending: 'bg-amber-500/10 text-amber-600 border-amber-500/20',
    processing: 'bg-[#EEAF1C]/10 text-[#EEAF1C] border-[#EEAF1C]/20',
    shipped: 'bg-cyan-500/10 text-cyan-600 border-cyan-500/20',
    delivered: 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20',
    cancelled: 'bg-red-500/10 text-red-600 border-red-500/20',
};

/* ═══════════════════════════════════════════════════════
   STAT CARD
═══════════════════════════════════════════════════════ */
interface StatCardProps {
    icon: React.ComponentType<any>;
    label: string;
    value: string | number;
    change?: number;
    href: string;
}

function StatCard({ icon: Icon, label, value, change, href }: StatCardProps) {
    const up = change === undefined || change >= 0;

    return (
        <Link href={href}
            className="group block bg-white dark:bg-[#111D29] border border-slate-200 dark:border-white/10 rounded-xl p-5 hover:border-[#EEAF1C]/30 transition-all shadow-sm">
            <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 bg-blue-50 dark:bg-blue-900/20 border border-blue-100 dark:border-blue-900/30 rounded-lg flex items-center justify-center">
                    <Icon className="h-5 w-5 text-[#EEAF1C]" />
                </div>
                <p className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-[0.2em]">{label}</p>
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
        <div className="flex items-center justify-between py-3 px-4 border-b border-slate-100 dark:border-white/5 last:border-0 hover:bg-slate-50 dark:hover:bg-white/5 transition-colors group">
            <div className="flex items-center gap-3">
                <div className="w-8 h-8 bg-white dark:bg-white/10 border border-slate-200 dark:border-white/10 rounded-lg flex items-center justify-center">
                    <ShoppingBag className="h-4 w-4 text-slate-400 group-hover:text-[#EEAF1C] transition-colors" />
                </div>
                <div>
                    <Link href="/admin/sales" className="text-sm font-bold text-slate-900 dark:text-white hover:text-[#EEAF1C] transition-colors">
                        {num}
                    </Link>
                    <p className="text-[10px] text-slate-500 font-bold uppercase">{name}</p>
                </div>
            </div>
            <div className="flex items-center gap-4">
                <div className="text-right">
                    <p className="text-sm font-bold text-slate-900 dark:text-white">Rs. {amount.toLocaleString()}</p>
                    <p className="text-[10px] text-slate-400 font-medium uppercase tracking-tight">{date}</p>
                </div>
                <div className={`px-2 py-0.5 rounded border text-[10px] font-bold uppercase ${statusCls}`}>
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
                <div className="w-10 h-10 bg-[#EEAF1C]/10 dark:bg-[#EEAF1C]/20 border border-[#EEAF1C]/20 rounded-xl flex items-center justify-center z-10
                                group-hover:bg-[#EEAF1C] group-hover:text-white transition-all duration-500 shadow-lg shadow-[#EEAF1C]/20">
                    <ShoppingBag className="h-4.5 w-4.5" strokeWidth={2.5} />
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
        <div className="bg-white dark:bg-[#111D29] p-4 rounded-xl shadow-xl border border-slate-200 dark:border-white/10">
            <p className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-1">{label}</p>
            <p className="text-xl font-bold text-slate-900 dark:text-white tracking-tighter">Rs. {payload[0].value.toLocaleString()}</p>
            <p className="text-[10px] font-bold text-[#EEAF1C] mt-1 uppercase">
                {payload[1]?.value || 0} Products Sold
            </p>
        </div>
    );
}

/* ═══════════════════════════════════════════════════════
   SECTION CARD WRAPPER
═══════════════════════════════════════════════════════ */
function SectionCard({ children, className = '' }: { children: React.ReactNode; className?: string }) {
    return (
        <div className={`bg-white dark:bg-[#111D29] border border-slate-200 dark:border-white/10 shadow-sm rounded-[16px] overflow-hidden ${className}`}>
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
        <div className="px-6 py-4 border-b border-slate-100 dark:border-white/10 bg-slate-50 dark:bg-white/5 flex items-center justify-between gap-4">
            <div className="flex items-center gap-3">
                <div className="p-2 bg-blue-50 dark:bg-blue-900/20 border border-blue-100 dark:border-blue-900/30 rounded-lg">
                    <Icon className="h-4 w-4 text-[#EEAF1C]" />
                </div>
                <div>
                    <h2 className="text-sm font-bold text-slate-900 dark:text-white uppercase tracking-tight">{title}</h2>
                    <p className="text-[10px] text-slate-400 dark:text-slate-500 font-bold uppercase tracking-widest">{subtitle}</p>
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
    'bg-[#EEAF1C]/10 border-[#EEAF1C]/30 text-[#EEAF1C]',
    'bg-slate-100 border-slate-200 text-slate-500',
    'bg-slate-50 border-slate-100 text-slate-400',
    'bg-transparent border-transparent text-slate-300',
];

function ProductRow({ product, rank }: { product: any; rank: number }) {
    return (
        <div className="px-4 py-3.5 border-b border-slate-100 dark:border-white/5 last:border-0 hover:bg-slate-50 dark:hover:bg-white/5 transition-colors flex items-center justify-between gap-4 group">
            <div className="flex items-center gap-4 flex-1 min-w-0">
                <div className="w-8 h-8 rounded-lg bg-white dark:bg-white/10 border border-slate-200 dark:border-white/10 flex items-center justify-center font-bold text-[#EEAF1C] text-xs shrink-0">
                    {rank + 1}
                </div>
                <div className="min-w-0 flex-1">
                    <Link href={`/admin/products/${product.id}`} className="text-sm font-bold text-slate-900 dark:text-white group-hover:text-[#EEAF1C] transition-colors truncate block uppercase tracking-tight">
                        {product.name}
                    </Link>
                    <div className="h-1 w-full bg-slate-100 dark:bg-white/10 rounded-full mt-2 overflow-hidden max-w-[120px]">
                        <div className="h-full bg-[#EEAF1C] rounded-full transition-all duration-1000" style={{ width: `${Math.max(20, 100 - rank * 20)}%` }} />
                    </div>
                </div>
            </div>
            <div className="text-right">
                <p className="text-sm font-bold text-slate-900 dark:text-white uppercase tracking-tighter">{product.sales || 0}</p>
                <p className="text-[9px] text-slate-400 font-bold uppercase tracking-widest">Units Sold</p>
            </div>
        </div>
    );
}


/* ═══════════════════════════════════════════════════════
   MAIN DASHBOARD PAGE
═══════════════════════════════════════════════════════ */
export default function AdminDashboard() {
    const router = useRouter();
    const { stats, recentOrders, recentPurchases, recentUsers, topProducts, products, orders, revenueData, revenueData30, activityLogs, loading, refetch } = useAdminDashboard();
    const { user, isAuthenticated } = useAdminAuth();
    const [chartRange, setChartRange] = useState<'7' | '30'>('7');

    const isSupplier = (user?.role || '').toLowerCase() === 'supplier';

    useEffect(() => {
        if (isSupplier) {
            router.push('/supplier/dashboard');
        }
    }, [isSupplier, router]);

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
        { name: 'Low Stock', value: products.filter(p => p.quantity_in_stock <= 10 && p.quantity_in_stock > 0).length, color: '#EEAF1C' },
        { name: 'Out of Stock', value: products.filter(p => p.quantity_in_stock === 0).length, color: '#ef4444' },
    ];

    if (loading) return <PageLoader />;

    return (
        <div className="max-w-[1400px] mx-auto pb-12 font-sans px-4 mt-6">



            {/* ── COMMAND CENTER : COMPREHENSIVE QUICK ACTIONS ── */}
            <div className="mb-8 bg-white dark:bg-[#111D29] border border-slate-200 dark:border-white/10 rounded-[20px] p-5 shadow-sm">
                <div className="flex items-center gap-3 mb-5 border-b border-slate-100 dark:border-white/5 pb-4">
                    <div className="w-8 h-8 rounded-lg bg-[#EEAF1C]/10 flex items-center justify-center">
                        <Activity className="w-4 h-4 text-[#EEAF1C]" />
                    </div>
                    <h2 className="text-sm font-black text-slate-900 dark:text-white uppercase tracking-widest">
                        Command Center
                    </h2>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-3">
                    {[
                        { label: 'Sale Order', icon: ShoppingBag, color: 'text-emerald-600', bg: 'bg-emerald-50 dark:bg-emerald-500/10', href: '/admin/sale' },
                        { label: 'Purchase', icon: Truck, color: 'text-amber-600', bg: 'bg-amber-50 dark:bg-amber-500/10', href: '/admin/purchases/add' },
                        { label: 'Products', icon: Package, color: 'text-blue-600', bg: 'bg-blue-50 dark:bg-blue-500/10', href: '/admin/products' },
                        { label: 'Invoices', icon: FileText, color: 'text-indigo-600', bg: 'bg-indigo-50 dark:bg-indigo-500/10', href: '/admin/invoices' },
                        { label: 'Suppliers', icon: UserCheck, color: 'text-teal-600', bg: 'bg-teal-50 dark:bg-teal-500/10', href: '/admin/company/suppliers' },
                        { label: 'Categories', icon: FolderTree, color: 'text-orange-600', bg: 'bg-orange-50 dark:bg-orange-500/10', href: '/admin/company/categories' },
                        { label: 'Inventory', icon: AlertTriangle, color: 'text-rose-600', bg: 'bg-rose-50 dark:bg-rose-500/10', href: '/admin/inventory' },
                        { label: 'Users', icon: Users, color: 'text-slate-600', bg: 'bg-slate-50 dark:bg-slate-500/10', href: '/admin/users' },
                    ].map((action, idx) => (
                        <Link key={idx} href={action.href}
                            className="group flex flex-col items-center justify-center gap-3 p-4 rounded-2xl hover:bg-slate-50 dark:hover:bg-white/5 border border-transparent hover:border-slate-200 dark:hover:border-white/10 transition-all active:scale-[0.97]">
                            <div className={`w-12 h-12 ${action.bg} rounded-full flex items-center justify-center group-hover:scale-110 transition-transform shadow-sm`}>
                                <action.icon className={`h-5 w-5 ${action.color}`} strokeWidth={2.5} />
                            </div>
                            <span className="text-[9px] font-black text-slate-600 dark:text-slate-400 group-hover:text-[#EEAF1C] uppercase tracking-widest text-center leading-tight transition-colors">
                                {action.label}
                            </span>
                        </Link>
                    ))}
                </div>
            </div>

            {/* ── MAIN DASHBOARD GRID ── */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">

                {/* LARGE LEFT COLUMN (Charts & Deep Data) */}
                <div className="lg:col-span-8 space-y-6">

                    {/* 1. SALES TREND CHART */}
                    <div className="bg-white/95 dark:bg-[#111D29]/95 backdrop-blur-xl border border-slate-200 dark:border-white/10 shadow-2xl shadow-black/5 rounded-3xl overflow-hidden">
                        <div className="px-6 py-5 border-b border-slate-100 dark:border-white/5 flex items-center justify-between bg-slate-50 dark:bg-white/5">
                            <div>
                                <h2 className="text-sm font-bold text-slate-900 dark:text-white uppercase tracking-tight">Revenue Trends</h2>
                                <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-0.5">Real-time Sales Performance</p>
                            </div>
                            <div className="flex bg-slate-100 dark:bg-white/5 p-1 rounded-xl border border-slate-200 dark:border-white/10">
                                {(['7', '30'] as const).map(r => (
                                    <button key={r} onClick={() => setChartRange(r)}
                                        className={`px-4 py-1.5 text-[10px] font-black rounded-lg transition-all uppercase tracking-widest
                                                    ${chartRange === r ? 'bg-white dark:bg-white/10 text-[#EEAF1C] shadow-sm border border-slate-200 dark:border-white/10' : 'text-slate-400 hover:text-[#EEAF1C]'}`}>
                                        {r} Days
                                    </button>
                                ))}
                            </div>
                        </div>
                        <div className="p-6 h-[400px]">
                            <ResponsiveContainer width="100%" height="100%">
                                <AreaChart data={chartData}>
                                    <defs>
                                        <linearGradient id="tacticalGradient" x1="0" y1="0" x2="0" y2="1">
                                            <stop offset="5%" stopColor="#EEAF1C" stopOpacity={0.2} /><stop offset="95%" stopColor="#EEAF1C" stopOpacity={0} />
                                        </linearGradient>
                                    </defs>
                                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(0,0,0,0.05)" />
                                    <XAxis dataKey="date" axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#94a3b8', fontWeight: 700 }} />
                                    <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#94a3b8', fontWeight: 700 }} tickFormatter={(v) => `PKR ${v / 1000}k`} />
                                    <Tooltip content={<ChartTooltip />} cursor={{ stroke: '#EEAF1C', strokeWidth: 2, strokeDasharray: '5 5' }} />
                                    <Area type="monotone" dataKey="revenue" stroke="#EEAF1C" strokeWidth={4} fill="url(#tacticalGradient)" animationDuration={2000} />
                                </AreaChart>
                            </ResponsiveContainer>
                        </div>
                    </div>

                    {/* 2. ORDER VOLUME BAR CHART */}
                    <div className="bg-white/95 dark:bg-[#111D29]/95 backdrop-blur-xl border border-slate-200 dark:border-white/10 shadow-2xl shadow-black/5 rounded-3xl overflow-hidden">
                        <div className="px-6 py-4 border-b border-slate-100 dark:border-white/5 flex items-center justify-between bg-white/40 dark:bg-white/5">
                            <h2 className="text-[11px] font-black text-slate-800 dark:text-white uppercase tracking-[0.2em]">Inventory Flow Velocity</h2>
                            <Link href="/admin/sales" className="text-[9px] font-black text-[#EEAF1C] hover:underline uppercase tracking-[0.2em] transition-all">Deep Analytics Portal</Link>
                        </div>
                        <div className="p-6 h-[300px]">
                            <ResponsiveContainer width="100%" height="100%">
                                <BarChart data={chartData}>
                                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(0,0,0,0.05)" />
                                    <XAxis dataKey="date" axisLine={false} tickLine={false} tick={{ fontSize: 9, fill: '#94a3b8', fontWeight: 700 }} />
                                    <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 9, fill: '#94a3b8', fontWeight: 700 }} />
                                    <Tooltip cursor={{ fill: 'rgba(29,78,216,0.05)' }} content={<ChartTooltip />} />
                                    <Bar dataKey="orders" fill="#EEAF1C" radius={[4, 4, 0, 0]} barSize={24} />
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
                                            {pieData.map((_, index) => <Cell key={index} fill={['#EEAF1C', '#3B82F6', '#60A5FA', '#93C5FD', '#BFDBFE'][index % 5]} />)}
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
                            <Link href="/admin/products" className="block text-center py-2.5 text-[10px] font-black text-[#EEAF1C] bg-[#EEAF1C]/5 border border-[#EEAF1C]/20 rounded-xl hover:bg-[#EEAF1C]/10 tracking-[0.2em] transition-all uppercase">
                                Full Inventory Audit
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
                                <div key={o.id} className="p-4 hover:bg-slate-50 dark:hover:bg-white/5 transition-colors group">
                                    <div className="flex justify-between mb-1">
                                        <span className="text-xs font-bold text-[#EEAF1C] uppercase tracking-tight">ORDER {o.orderNumber || o.id}</span>
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

                    {/* RECENT PURCHASE ORDERS (Skip for Suppliers) */}
                    {!isSupplier && (
                        <div className="bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-800 shadow-[0_4px_20px_rgba(0,0,0,0.03)] dark:shadow-[0_4px_20px_rgba(0,0,0,0.2)] rounded h-fit">
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
                                    <p className="text-[10px] text-slate-400 text-center py-6 uppercase tracking-widest font-bold">No purchase records</p>
                                )}
                            </div>
                        </div>
                    )}

                    {/* REAL-TIME ACTIVITY LOGS */}
                    <div className="bg-white/40 dark:bg-slate-900/40 glass-effect p-6 rounded-2xl border border-gray-100 dark:border-slate-800 shadow-[0_4px_20px_rgba(0,0,0,0.03)] dark:shadow-[0_4px_20px_rgba(0,0,0,0.2)]">
                        <div className="flex items-center gap-3 mb-6 text-[#EEAF1C]">
                            <div className="p-2 bg-orange-50 dark:bg-[#EEAF1C]/10 rounded-lg">
                                <Activity className="w-5 h-5" />
                            </div>
                            <h3 className="text-sm font-bold uppercase tracking-widest">System Activity</h3>
                        </div>
                        <div className="space-y-4">
                            {activityLogs.length > 0 ? (
                                activityLogs.map((log: any) => (
                                    <div key={log.id} className="border-l-4 border-[#EEAF1C] pl-4 py-3 bg-white dark:bg-white/10 rounded-r-xl transition-all hover:bg-slate-50 dark:hover:bg-white/15 group">
                                        <p className="text-[11px] font-bold text-slate-900 dark:text-white leading-tight uppercase tracking-tight group-hover:text-[#EEAF1C] transition-colors">{log.action_display || log.action}</p>
                                        <p className="text-[10px] text-slate-500 dark:text-slate-400 font-bold mt-1 uppercase tracking-wider">{log.description}</p>
                                        <div className="flex items-center gap-2 mt-2">
                                            <Clock className="w-3 h-3 text-[#EEAF1C]" />
                                            <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">
                                                {new Date(log.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                            </span>
                                        </div>
                                    </div>
                                ))
                            ) : (
                                <p className="text-[10px] text-slate-500 text-center py-4 uppercase tracking-widest font-bold">No recent activity found.</p>
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
        <div className="bg-white/95 dark:bg-[#111D29]/95 backdrop-blur-xl border border-slate-200 dark:border-white/10 p-5 rounded-2xl shadow-xl shadow-black/5 hover:border-[#EEAF1C] transition-all duration-500 group relative overflow-hidden">
            <div className="absolute top-0 right-0 w-20 h-20 bg-[#EEAF1C]/5 rounded-full -mr-10 -mt-10 blur-2xl group-hover:bg-[#EEAF1C]/10 transition-colors" />
            <p className="text-[9px] font-black text-[#EEAF1C] uppercase tracking-[0.3em] mb-2 group-hover:translate-x-1 transition-transform">{label}</p>
            <div className="flex items-baseline justify-between relative z-10">
                <span className="text-xl font-black text-slate-900 dark:text-white tracking-tighter">{value}</span>
                {change !== undefined && (
                    <span className={`text-[9px] font-black px-2 py-0.5 rounded-lg ${up ? 'bg-emerald-500/10 text-emerald-600' : 'bg-red-500/10 text-red-600'} flex items-center gap-1`}>
                        {up ? '▲' : '▼'}{Math.abs(change)}%
                    </span>
                )}
            </div>
        </div>
    );
}

