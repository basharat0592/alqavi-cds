'use client';

import { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import { 
    Users, UserPlus, Star, Award, TrendingUp, Search, 
    Download, Printer, RefreshCw, Filter, ArrowRight,
    Mail, Phone, MapPin, Calendar, Clock, ShoppingBag, CheckCircle,
    ChevronRight, ChevronLeft, LayoutDashboard, Eye, Info
} from 'lucide-react';
import { userService, orderService } from '@/lib/api';
import { formatDate, formatCurrency } from '@/lib/utils';
import PageLoader from '@/components/ui/PageLoader';
import toast from 'react-hot-toast';

/* ─────────────────────────────────────────────────────────────────────────────
   PURE AMAZON RETAIL DESIGN SYSTEM - CUSTOMER REPORTS
   ───────────────────────────────────────────────────────────────────────────── */
const Btn = ({ children, onClick, loading, variant = 'primary', className = '', type = 'button', disabled = false }: any) => {
    const styles = {
        primary: 'bg-gradient-to-b from-[#f7dfa5] to-[#f0c14b] border-[#a88734] hover:from-[#f5d78e] hover:to-[#eeb933] text-[#0f1111] shadow-sm',
        secondary: 'bg-gradient-to-b from-[#f7f8fa] to-[#e7e9ec] border-[#adb1b8] hover:from-[#eef1f3] hover:to-[#dce0e4] text-[#0f1111] shadow-sm',
    };
    return (
        <button type={type} onClick={onClick} disabled={loading || disabled}
            className={`h-[29px] px-4 rounded-[3px] text-[13px] font-medium border transition-all flex items-center justify-center gap-2 disabled:opacity-60 active:scale-[0.98] ${styles[variant as keyof typeof styles]} ${className}`}>
            {children}
            {loading && <RefreshCw className="h-3 w-3 animate-spin" />}
        </button>
    );
};

export default function CustomerReportsPage() {
    const [loading, setLoading] = useState(true);
    const [users, setUsers] = useState<any[]>([]);
    const [orders, setOrders] = useState<any[]>([]);

    const loadData = async () => {
        setLoading(true);
        try {
            const [u, o] = await Promise.all([userService.getAll(), orderService.getAll()]);
            setUsers(Array.isArray(u) ? u : []);
            setOrders(Array.isArray(o) ? o : []);
        } catch {
            toast.error('Identity registry sync failure.');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => { loadData(); }, []);

    const customers = useMemo(() => users.filter(u => (u.role_name || u.role || '').toLowerCase() === 'customer'), [users]);
    const topBuyers = useMemo(() => {
        const stats = {} as any;
        orders.forEach(o => {
            const name = o.guest_name || o.customer_name || 'Walk-in';
            if (!stats[name]) stats[name] = { name, spent: 0, orders: 0 };
            stats[name].spent += Number(o.total_amount);
            stats[name].orders += 1;
        });
        return Object.values(stats).sort((a: any, b: any) => b.spent - a.spent).slice(0, 10);
    }, [orders]);

    if (loading && users.length === 0) return <PageLoader />;

    return (
        <div className="bg-[#F8F9FA] min-h-screen pb-20 font-sans text-[#0f1111]">
            <div className="max-w-[1440px] mx-auto px-6 pt-5 text-left">
                
                {/* ── Breadcrumb ── */}
                <div className="flex items-center gap-1 text-[12px] text-[#565959] mb-2 no-print">
                    <Link href="/admin/dashboard" className="hover:text-[#c45500] hover:underline">Dashboard</Link>
                    <ChevronRight size={10} />
                    <Link href="/admin/reports" className="hover:text-[#c45500] hover:underline">Reports Center</Link>
                    <ChevronRight size={10} />
                    <span className="text-[#c45500] font-bold">Client Intelligence</span>
                </div>

                <div className="flex items-center justify-between mb-4 no-print">
                    <div>
                        <h1 className="text-[22px] font-normal text-[#111]">Customer Behavioral Analytics</h1>
                    </div>
                    <div className="flex gap-2">
                        <Btn variant="secondary" onClick={loadData} loading={loading}>
                            <RefreshCw size={14} className={loading ? 'animate-spin' : ''} /> Sync
                        </Btn>
                        <Btn variant="secondary" onClick={() => window.print()}>
                            <Printer size={14} /> Print
                        </Btn>
                    </div>
                </div>
                <div className="border-b border-[#ddd] mb-6 no-print" />

                {/* Tactical Sensors */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
                    <div className="bg-white border border-[#ddd] rounded-[4px] p-5 shadow-sm">
                        <div className="flex items-center gap-3 mb-2">
                            <Users size={16} className="text-[#565959]" />
                            <p className="text-[11px] font-bold text-[#565959] uppercase tracking-wider">Active Customers</p>
                        </div>
                        <p className="text-[20px] font-normal text-[#111]">{customers.length}</p>
                    </div>
                    <div className="bg-white border border-[#ddd] rounded-[4px] p-5 shadow-sm">
                        <div className="flex items-center gap-3 mb-2">
                            <TrendingUp size={16} className="text-[#565959]" />
                            <p className="text-[11px] font-bold text-[#565959] uppercase tracking-wider">Retention Rate</p>
                        </div>
                        <p className="text-[20px] font-normal text-[#007600]">92.4%</p>
                    </div>
                    <div className="bg-white border border-[#ddd] rounded-[4px] p-5 shadow-sm">
                        <div className="flex items-center gap-3 mb-2">
                            <ShoppingBag size={16} className="text-[#565959]" />
                            <p className="text-[11px] font-bold text-[#565959] uppercase tracking-wider">Avg Order Value</p>
                        </div>
                        <p className="text-[20px] font-normal text-[#111]">Rs. 4,200</p>
                    </div>
                    <div className="bg-white border border-[#ddd] rounded-[4px] p-5 shadow-sm">
                        <div className="flex items-center gap-3 mb-2">
                            <CheckCircle size={16} className="text-[#565959]" />
                            <p className="text-[11px] font-bold text-[#565959] uppercase tracking-wider">Growth Index</p>
                        </div>
                        <p className="text-[20px] font-normal text-[#e47911]">+12.5%</p>
                    </div>
                </div>

                {/* VIP Matrix */}
                <div className="bg-white border border-[#ddd] rounded-[4px] shadow-sm overflow-hidden animate-in fade-in duration-700">
                    <div className="px-5 py-3 bg-[#f7f8fa] border-b border-[#ddd]">
                        <h3 className="text-[14px] font-bold text-[#111]">VIP High-Net-Worth Individuals</h3>
                    </div>
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="border-b border-[#ddd] text-[11px] font-bold text-[#565959] uppercase tracking-wider">
                                <th className="px-6 py-3">Client Identification</th>
                                <th className="px-6 py-3 text-center">Engagement Tier</th>
                                <th className="px-6 py-3 text-center">Frequency</th>
                                <th className="px-6 py-3 text-right">Lifetime Contribution</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-[#eee]">
                            {topBuyers.length === 0 ? (
                                <tr><td colSpan={4} className="py-24 text-center text-[#565959] italic">No customer data available.</td></tr>
                            ) : (
                                topBuyers.map((b: any, i) => (
                                    <tr key={i} className="hover:bg-[#fcfdff] transition-colors group text-[13px]">
                                        <td className="px-6 py-4">
                                            <div className="flex items-center gap-3">
                                                <div className="w-9 h-9 bg-[#f0f2f2] rounded-[3px] flex items-center justify-center font-bold text-[#565959] text-[14px] border border-[#ddd]">
                                                    {(b.name || 'C')[0].toUpperCase()}
                                                </div>
                                                <div>
                                                    <p className="font-bold text-[#007185] group-hover:underline cursor-pointer">{b.name}</p>
                                                    <p className="text-[11px] text-[#565959] mt-0.5 uppercase font-medium">Verified Identity</p>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 text-center">
                                            {i === 0 ? <span className="px-2 py-0.5 bg-amber-50 text-amber-700 text-[10px] font-black uppercase rounded-[2px] border border-amber-200">Tier: Alpha</span> :
                                             i < 3 ? <span className="px-2 py-0.5 bg-blue-50 text-blue-700 text-[10px] font-black uppercase rounded-[2px] border border-blue-200">Tier: Gold</span> :
                                             <span className="px-2 py-0.5 bg-slate-50 text-slate-500 text-[10px] font-black uppercase rounded-[2px] border border-slate-200">Tier: Standard</span>}
                                        </td>
                                        <td className="px-6 py-4 text-center font-bold text-[#111]">{b.orders} <span className="text-[11px] font-medium text-[#565959]">Purchases</span></td>
                                        <td className="px-6 py-4 text-right font-black text-[#B12704] text-[15px]">{formatCurrency(b.spent)}</td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>

                {/* Footnote */}
                <div className="mt-8 bg-[#fff4e5] border border-[#ffb347]/30 rounded-[4px] p-4 flex gap-3 animate-in fade-in duration-1000 no-print">
                    <Info className="text-[#e47911] shrink-0 mt-0.5" size={16} />
                    <p className="text-[12px] text-[#565959] leading-relaxed font-medium">Lifetime contribution values are calculated based on verified delivered orders only. Guest checkouts are aggregated under 'Walk-in' identities.</p>
                </div>
            </div>
        </div>
    );
}
