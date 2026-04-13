'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { authService } from '@/lib/auth';
import api from '@/lib/axios';
import {
    Package, Boxes, TrendingUp, ShieldCheck, LogOut, PlusCircle,
    HelpCircle, RefreshCw, ShoppingBag, ArrowUpRight, Clock,
    CheckCircle2, XCircle, AlertCircle, Loader2, RotateCcw,
    DollarSign, BarChart3, User, ArrowRight, Eye, Trash2, Truck
} from 'lucide-react';
import { useRouter } from 'next/navigation';
import toast from 'react-hot-toast';

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
    received: 'bg-emerald-50 text-emerald-700 font-bold border-emerald-100',
    completed: 'bg-emerald-50 text-emerald-700 font-bold border-emerald-100',
    partially_received: 'bg-amber-50 text-amber-700',
    cancelled: 'bg-red-50 text-red-700 font-bold border-red-100',
    pending: 'bg-amber-50 text-amber-700',
    partially_paid: 'bg-indigo-50 text-indigo-700',
    paid: 'bg-emerald-50 text-emerald-700',
    delivered: 'bg-emerald-50 text-emerald-700 font-bold border-emerald-100',
};

const StatusPill = ({ status }: { status: string }) => (
    <span className={`px-2 py-0.5 rounded text-[8px] font-black uppercase tracking-widest border ${STATUS_COLORS[status] || 'bg-slate-100 text-slate-600 border-slate-200'}`}>
        {status.replace('_', ' ')}
    </span>
);

export default function SupplierDashboard() {
    const [user, setUser] = useState<any>(null);
    const [stats, setStats] = useState<any>(null);
    const [sales, setSales] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [loadingSales, setLoadingSales] = useState(true);
    const [lastRefreshed, setLastRefreshed] = useState<Date | null>(null);
    const router = useRouter();

    const fetchDashboardData = useCallback(async () => {
        setLoading(true);
        setLoadingSales(true);
        try {
            const statsPromise = api.get('/v1/sales/supplier/dashboard/stats/');
            const retailPromise = api.get('/v1/sales/orders/');
            const wholesalePromise = api.get('/v1/sales/purchases/', { 
                params: { status: 'delivered,received,cancelled' } 
            });

            const [statsRes, retailRes, wholesaleRes] = await Promise.all([
                statsPromise, retailPromise, wholesalePromise
            ]);

            setStats(statsRes.data);

            const retailList = Array.isArray(retailRes.data) ? retailRes.data : retailRes.data.results || [];
            const wholesaleList = Array.isArray(wholesaleRes.data) ? wholesaleRes.data : wholesaleRes.data.results || [];

            const normalizedWholesale = wholesaleList.map((po: any) => ({
                id: po.id,
                order_number: po.purchase_number,
                created_at: po.order_date || po.created_at,
                total_amount: po.total_amount,
                status: po.status,
                customer_name: 'Wholesale Partner',
                is_wholesale: true
            }));

            const combined = [...retailList, ...normalizedWholesale].sort((a, b) => 
                new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
            );

            setSales(combined.slice(0, 10));
            setLastRefreshed(new Date());
        } catch (e) {
            console.error(e);
        } finally {
            setLoading(false);
            setLoadingSales(false);
        }
    }, []);

    const handleDelete = async (entry: any) => {
        if (!confirm(`Are you sure you want to remove ${entry.order_number} from the registry?`)) return;
        try {
            if (entry.is_wholesale) {
                await api.delete(`/v1/sales/purchases/${entry.id}/`);
            } else {
                await api.post(`/v1/sales/orders/${entry.id}/delete/`);
            }
            toast.success("Record deleted successfully.");
            fetchDashboardData();
        } catch (err: any) {
            toast.error(err.response?.data?.error || "Permission denied for deletion.");
        }
    };

    useEffect(() => {
        setUser(authService.getUser());
        fetchDashboardData();
    }, [fetchDashboardData]);

    const QUICK_ACTIONS = [
        {
            title: "Your Inventory",
            desc: "Track manufacturing stock & refills",
            icon: Boxes,
            href: "/supplier/inventory",
            color: "text-[#F59E0B]"
        },
        {
            title: "Purchase Orders",
            desc: "View wholesale procurement requests",
            icon: Truck,
            href: "/supplier/orders",
            color: "text-[#F59E0B]"
        },
        {
            title: "Sale Registry",
            desc: "Audit your retail & wholesale ledger",
            icon: TrendingUp,
            href: "/supplier/sales",
            color: "text-[#F59E0B]"
        },
        {
            title: "Product Catalog",
            desc: "Add, edit, or remove your items",
            icon: Package,
            href: "/supplier/products",
            color: "text-[#F59E0B]"
        },
        {
            title: "Business Profile",
            desc: "Manage factory details & security",
            icon: ShieldCheck,
            href: "/supplier/profile",
            color: "text-[#F59E0B]"
        },
        {
            title: "Partner Support",
            desc: "Contact distributor help desk",
            icon: HelpCircle,
            href: "/supplier/support",
            color: "text-[#F59E0B]"
        }
    ];

    const supplierName = stats?.supplier_name || user?.name || 'Partner';

    return (
        <div className="max-w-[1000px] mx-auto py-10 animate-in fade-in duration-700 px-4 space-y-12">
            
            {/* Header Area */}
            <div className="flex flex-col md:flex-row md:items-end justify-between border-b border-gray-100 pb-6 gap-4">
                <div>
                    <h1 className="text-3xl font-medium text-slate-900 leading-tight">Your Dashboard</h1>
                    <p className="text-sm text-slate-600 font-medium mt-1">Hello, <span className="font-bold">{supplierName}</span>. Monitor your production metrics and sales below.</p>
                </div>
                {lastRefreshed && (
                    <div className="flex flex-col items-end text-[10px] text-slate-400 font-black uppercase tracking-widest">
                        <span>Registry Sync: Active</span>
                        <span>Last Latency Check: {lastRefreshed.toLocaleTimeString()}</span>
                    </div>
                )}
            </div>

            {/* KPI Stats Top */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                 {[
                    { label: 'Live Catalog', val: stats?.total_products || '0', color: 'text-blue-600' },
                    { label: 'Pending POs', val: stats?.pending_orders || '0', color: 'text-amber-600' },
                    { label: 'Finalized', val: stats?.received_orders || '0', color: 'text-emerald-600' },
                    { label: 'Net Revenue', val: formatCurrency(stats?.total_order_value || 0), color: 'text-slate-900' },
                 ].map((s, i) => (
                    <div key={i} className="bg-white border border-gray-100 p-4 rounded-xl shadow-sm hover:shadow-md transition-shadow">
                        <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-1">{s.label}</span>
                        <p className={`text-lg font-bold ${s.color}`}>{s.val}</p>
                    </div>
                 ))}
            </div>

            {/* Amazon Quick Action Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                {QUICK_ACTIONS.map((card, idx) => (
                    <Link 
                        key={idx} 
                        href={card.href}
                        className="flex items-start gap-4 p-5 bg-white border border-gray-200 rounded-xl hover:bg-gray-50 transition-all shadow-sm group"
                    >
                        <div className={`p-4 bg-white border border-gray-100 rounded-full shadow-sm ${card.color}`}>
                            <card.icon className="h-7 w-7" />
                        </div>
                        <div className="flex-1">
                            <h2 className="text-[17px] font-bold text-slate-900 group-hover:text-[#F59E0B] transition-colors">{card.title}</h2>
                            <p className="text-sm text-slate-500 mt-0.5 leading-snug">{card.desc}</p>
                        </div>
                    </Link>
                ))}

                {/* Logout Card */}
                <button 
                    onClick={() => {
                        authService.logout();
                        window.location.href = '/login';
                    }}
                    className="flex items-start gap-4 p-5 bg-white border border-gray-200 rounded-xl hover:bg-rose-50 transition-all shadow-sm group text-left"
                >
                    <div className="p-4 bg-white border border-gray-100 rounded-full shadow-sm text-rose-500">
                        <LogOut className="h-7 w-7" />
                    </div>
                    <div className="flex-1">
                        <h2 className="text-[17px] font-bold text-slate-900 group-hover:text-rose-600 transition-colors">Sign Out</h2>
                        <p className="text-sm text-slate-500 mt-0.5 leading-snug">Securely end your procurement session</p>
                    </div>
                </button>
            </div>

            {/* Simple Sales Registry Table */}
            <div className="bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden">
                <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between bg-slate-50">
                    <div>
                        <h3 className="text-sm font-black text-slate-900 uppercase tracking-widest leading-none">Recent Transaction Registry</h3>
                        <p className="text-[10px] text-slate-400 font-bold uppercase mt-1 tracking-wider">Historical wholesale and retail ledger</p>
                    </div>
                    <Link href="/supplier/sales" className="text-[11px] text-[#F59E0B] font-black hover:underline uppercase tracking-wide">Enter Full Registry</Link>
                </div>
                <div className="overflow-x-auto">
                    <table className="w-full text-left">
                        <thead className="bg-[#f0f2f2] text-[9px] font-black text-slate-500 uppercase tracking-[0.2em] border-b border-gray-200">
                            <tr>
                                <th className="px-6 py-3">Reference</th>
                                <th className="px-6 py-3">Party</th>
                                <th className="px-6 py-3 text-center">Class</th>
                                <th className="px-6 py-3">Date</th>
                                <th className="px-6 py-3 text-right">Settlement</th>
                                <th className="px-6 py-3 text-center">Protocol</th>
                                <th className="px-6 py-3 text-center">System</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-50">
                            {loadingSales ? (
                                Array(5).fill(0).map((_, i) => (
                                    <tr key={i} className="animate-pulse">
                                        <td colSpan={7} className="px-6 py-4"><div className="h-3 bg-slate-50 rounded w-full" /></td>
                                    </tr>
                                ))
                            ) : sales.length === 0 ? (
                                <tr><td colSpan={7} className="py-20 text-center text-slate-400 font-black uppercase text-[10px] tracking-[0.4em] opacity-30">Zero Record Sync</td></tr>
                            ) : (
                                sales.map((entry) => (
                                    <tr key={entry.is_wholesale ? `po-${entry.id}` : `order-${entry.id}`} className="hover:bg-slate-50 transition-colors">
                                        <td className="px-6 py-4 font-bold text-slate-900 text-[11px]">#{entry.order_number}</td>
                                        <td className="px-6 py-4">
                                            <div className="flex flex-col">
                                                <span className="text-[11px] font-bold text-slate-800 leading-tight">{entry.customer_name}</span>
                                                <span className="text-[8px] text-slate-400 font-bold uppercase tracking-tighter">Verified Member</span>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 text-center">
                                            <span className={`text-[8px] px-2 py-0.5 rounded-sm font-black uppercase tracking-widest border ${entry.is_wholesale ? 'bg-blue-50 text-blue-600 border-blue-100' : 'bg-emerald-50 text-emerald-700 border-emerald-100'}`}>
                                                {entry.is_wholesale ? 'Wholesale' : 'Retail'}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 text-slate-500 text-[11px] whitespace-nowrap">{formatDate(entry.created_at)}</td>
                                        <td className="px-6 py-4 text-right font-black text-slate-900 text-[11px]">{formatCurrency(parseFloat(entry.total_amount))}</td>
                                        <td className="px-6 py-4 text-center"><StatusPill status={entry.status} /></td>
                                        <td className="px-6 py-4 text-center">
                                            <div className="flex items-center justify-center gap-1.5 opacity-60 hover:opacity-100 transition-opacity">
                                                <button 
                                                    onClick={() => router.push(entry.is_wholesale ? `/supplier/orders` : `/supplier/sales`)}
                                                    className="p-1 px-1.5 border border-slate-200 rounded text-slate-400 hover:text-[#F59E0B] hover:bg-white transition-all shadow-sm"
                                                    title="View"
                                                >
                                                    <Eye className="h-3.5 w-3.5" />
                                                </button>
                                                <button 
                                                    onClick={() => handleDelete(entry)}
                                                    className="p-1 px-1.5 border border-slate-200 rounded text-slate-400 hover:text-red-500 hover:bg-white transition-all shadow-sm"
                                                    title="Purge"
                                                >
                                                    <Trash2 className="h-3.5 w-3.5" />
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Business Preferences Registry Mock */}
            <div className="mt-12 pt-8 border-t border-gray-100 grid md:grid-cols-2 gap-8">
                <div>
                    <h3 className="text-sm font-bold text-slate-900 mb-3 border-b border-slate-50 pb-2 uppercase tracking-wide">Procurement Hub</h3>
                    <ul className="text-xs space-y-3 font-semibold text-[#F59E0B]">
                        <li><Link href="/supplier/products" className="hover:text-[#F59E0B] flex items-center gap-2 group"><div className="w-1 h-1 bg-slate-300 rounded-full group-hover:bg-[#F59E0B] transition-colors" /> Active Product Catalog</Link></li>
                        <li><Link href="/supplier/inventory" className="hover:text-[#F59E0B] flex items-center gap-2 group"><div className="w-1 h-1 bg-slate-300 rounded-full group-hover:bg-[#F59E0B] transition-colors" /> Batch Replenishment Alerts</Link></li>
                        <li><Link href="/supplier/orders" className="hover:text-[#F59E0B] flex items-center gap-2 group"><div className="w-1 h-1 bg-slate-300 rounded-full group-hover:bg-[#F59E0B] transition-colors" /> Incoming Purchase Registry</Link></li>
                    </ul>
                </div>
                <div>
                    <h3 className="text-sm font-bold text-slate-900 mb-3 border-b border-slate-50 pb-2 uppercase tracking-wide">Account Governance</h3>
                    <ul className="text-xs space-y-3 font-semibold text-[#F59E0B]">
                        <li><Link href="/supplier/profile" className="hover:text-[#F59E0B] flex items-center gap-2 group"><div className="w-1 h-1 bg-slate-300 rounded-full group-hover:bg-[#F59E0B] transition-colors" /> Settlement & Security Protocols</Link></li>
                        <li><Link href="/supplier/profile" className="hover:text-[#F59E0B] flex items-center gap-2 group"><div className="w-1 h-1 bg-slate-300 rounded-full group-hover:bg-[#F59E0B] transition-colors" /> Registered Warehouse Address</Link></li>
                        <li><Link href="/supplier/support" className="hover:text-[#F59E0B] flex items-center gap-2 group"><div className="w-1 h-1 bg-slate-300 rounded-full group-hover:bg-[#F59E0B] transition-colors" /> Global Partner Logistics Policy</Link></li>
                    </ul>
                </div>
            </div>

            <div className="text-center">
                <p className="text-[10px] font-black text-slate-300 uppercase tracking-[0.6em]">Al-Qavi CDS Ecosystem Proxy</p>
            </div>
        </div>
    );
}
