'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { authService } from '@/lib/auth';
import api from '@/lib/axios';
import {
    Package, Boxes, TrendingUp, ShieldCheck, LogOut, PlusCircle,
    HelpCircle, RefreshCw, ShoppingBag, ArrowUpRight, Clock,
    CheckCircle2, XCircle, AlertCircle, Loader2, RotateCcw,
    DollarSign, BarChart3, User
} from 'lucide-react';
import { useRouter } from 'next/navigation';

// ── Helpers ───────────────────────────────────────────────────────────────────
const formatCurrency = (n: number) =>
    new Intl.NumberFormat('en-PK', { style: 'currency', currency: 'PKR', maximumFractionDigits: 0 }).format(n);

const formatDate = (d: string | null) => {
    if (!d) return '—';
    return new Date(d).toLocaleDateString('en-PK', { day: 'numeric', month: 'short', year: 'numeric' });
};

// ── Status Pills ──────────────────────────────────────────────────────────────
const STATUS_COLORS: Record<string, string> = {
    draft: 'bg-slate-100 text-slate-600',
    ordered: 'bg-blue-50 text-blue-700',
    received: 'bg-emerald-50 text-emerald-700',
    partially_received: 'bg-amber-50 text-amber-700',
    cancelled: 'bg-red-50 text-red-700',
    pending: 'bg-amber-50 text-amber-700',
    partially_paid: 'bg-indigo-50 text-indigo-700',
    paid: 'bg-emerald-50 text-emerald-700',
};

const StatusPill = ({ status }: { status: string }) => (
    <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-widest ${STATUS_COLORS[status] || 'bg-slate-100 text-slate-600'}`}>
        {status.replace('_', ' ')}
    </span>
);

// ── Quick Action Card ─────────────────────────────────────────────────────────
function ActionCard({ title, desc, icon: Icon, href, color }: {
    title: string; desc: string; icon: any; href: string; color: string;
}) {
    return (
        <Link href={href}
            className="flex items-start gap-4 p-5 bg-white border border-gray-200 rounded-xl hover:border-[#F7CA00]/60 hover:shadow-md transition-all group">
            <div className={`p-3.5 bg-white border border-gray-100 rounded-full shadow-sm ${color} group-hover:scale-105 transition-transform`}>
                <Icon className="h-6 w-6" />
            </div>
            <div className="flex-1">
                <h2 className="text-[15px] font-bold text-slate-900 group-hover:text-[#F7CA00] transition-colors flex items-center gap-1">
                    {title} <ArrowUpRight className="h-3.5 w-3.5 opacity-0 group-hover:opacity-100 transition-opacity" />
                </h2>
                <p className="text-sm text-slate-500 mt-0.5 leading-snug">{desc}</p>
            </div>
        </Link>
    );
}

// ── Main Component ────────────────────────────────────────────────────────────
export default function SupplierDashboard() {
    const [user, setUser] = useState<any>(null);
    const [stats, setStats] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [lastRefreshed, setLastRefreshed] = useState<Date | null>(null);
    const router = useRouter();

    const fetchStats = useCallback(async () => {
        try {
            const { data } = await api.get('/v1/sales/supplier/dashboard/stats/');
            setStats(data);
            setLastRefreshed(new Date());
        } catch (e) {
            console.error('Failed to load supplier stats', e);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        setUser(authService.getUser());
        fetchStats();

        // Auto-refresh every 60 seconds
        const interval = setInterval(fetchStats, 60000);
        return () => clearInterval(interval);
    }, [fetchStats]);

    const SUPPLIER_CARDS = [
        { title: 'Manage Catalog', desc: 'Add, edit, or remove your products', icon: Package, href: '/supplier/products', color: 'text-[#F7CA00]' },
        { title: 'Warehouse Status', desc: 'Real-time stock and inventory levels', icon: Boxes, href: '/supplier/inventory', color: 'text-[#F7CA00]' },
        { title: 'Sales Registry', desc: 'View records of your sold items', icon: TrendingUp, href: '/supplier/sales', color: 'text-[#F7CA00]' },
        { title: 'Add Product', desc: 'List a new item to the catalog', icon: PlusCircle, href: '/supplier/products/add', color: 'text-[#F7CA00]' },
        { title: 'Partner Support', desc: 'Contact distributor help desk', icon: HelpCircle, href: '/supplier/support', color: 'text-[#F7CA00]' },
    ];

    const supplierName = stats?.supplier_name || user?.name || 'Partner';

    return (
        <div className="max-w-[1100px] mx-auto py-8 animate-in fade-in duration-500 space-y-8">

            {/* ── Header ── */}
            <div className="flex items-start justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-black text-slate-900 leading-tight">
                        Dashboard
                    </h1>
                    <p className="text-sm text-slate-500 mt-1.5">
                        Welcome back, <span className="font-bold text-slate-800">{supplierName}</span>.
                        {' '}Your real-time procurement dashboard.
                    </p>
                    {lastRefreshed && (
                        <p className="text-[11px] text-slate-400 mt-1 flex items-center gap-1">
                            <Clock className="h-3 w-3" />
                            Last synced: {lastRefreshed.toLocaleTimeString()}
                        </p>
                    )}
                </div>
                <button
                    onClick={() => { setLoading(true); fetchStats(); }}
                    className="flex items-center gap-2 px-4 py-2 text-sm font-semibold text-slate-600 bg-white border border-gray-200 rounded-xl hover:border-[#F7CA00] hover:text-[#F7CA00] transition-all shadow-sm"
                >
                    <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
                    Refresh
                </button>
            </div>

            {/* ── Quick Actions Grid ── */}
            <div>
                <h2 className="text-sm font-black text-slate-400 uppercase tracking-widest mb-4">Quick Actions</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {SUPPLIER_CARDS.map((card, idx) => (
                        <ActionCard key={idx} {...card} />
                    ))}

                    {/* Logout */}
                    <button
                        onClick={() => { authService.logout(); window.location.href = '/login'; }}
                        className="flex items-start gap-4 p-5 bg-white border border-gray-200 rounded-xl hover:border-red-200 hover:bg-rose-50 transition-all group text-left"
                    >
                        <div className="p-3.5 bg-white border border-gray-100 rounded-full shadow-sm text-rose-500 group-hover:scale-105 transition-transform">
                            <LogOut className="h-6 w-6" />
                        </div>
                        <div className="flex-1">
                            <h2 className="text-[15px] font-bold text-slate-900 group-hover:text-rose-600 transition-colors">Sign Out</h2>
                            <p className="text-sm text-slate-500 mt-0.5 leading-snug">Securely end your session</p>
                        </div>
                    </button>
                </div>
            </div>

            {/* ── Bottom Links ── */}
            <div className="pt-6 border-t border-gray-200 grid md:grid-cols-2 gap-8">
                <div>
                    <h3 className="font-bold text-slate-900 mb-3">Inventory &amp; Product Hub</h3>
                    <ul className="text-sm space-y-2 text-[#007185]">
                        <li><Link href="/supplier/products" className="hover:text-[#F7CA00] hover:underline underline-offset-2">Active Catalog</Link></li>
                        <li><Link href="/supplier/inventory" className="hover:text-[#F7CA00] hover:underline underline-offset-2">Low Stock Alerts</Link></li>
                        <li><Link href="/supplier/products/add" className="hover:text-[#F7CA00] hover:underline underline-offset-2">Add New Product</Link></li>
                    </ul>
                </div>
                <div>
                    <h3 className="font-bold text-slate-900 mb-3">Business Settings</h3>
                    <ul className="text-sm space-y-2 text-[#007185]">
                        <li><Link href="/supplier/profile" className="hover:text-[#F7CA00] hover:underline underline-offset-2">Login &amp; Security</Link></li>
                        <li><Link href="/supplier/profile" className="hover:text-[#F7CA00] hover:underline underline-offset-2">Business Address</Link></li>
                        <li><Link href="/supplier/support" className="hover:text-[#F7CA00] hover:underline underline-offset-2">Partner Guidelines</Link></li>
                    </ul>
                </div>
            </div>
        </div>
    );
}
