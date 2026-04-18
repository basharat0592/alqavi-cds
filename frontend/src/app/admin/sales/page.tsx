"use client";

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { orderService, Order } from '@/lib/api';
import { formatCurrency, formatDate } from '@/lib/utils';
import {
    ShoppingBag, Search, X, RefreshCw, Eye,
    Plus, Printer, Loader2, Edit, User, Calendar, CreditCard, Trash2, AlertTriangle, ChevronRight, ChevronLeft, LayoutDashboard
} from 'lucide-react';
import PageLoader from '@/components/ui/PageLoader';
import toast from 'react-hot-toast';

/* ─────────────────────────────────────────────────────────────────────────────
   PURE AMAZON RETAIL DESIGN SYSTEM - SALES LIST
   ───────────────────────────────────────────────────────────────────────────── */
const Btn = ({ children, onClick, loading, variant = 'primary', className = '', type = 'button', disabled = false }: any) => {
    const styles = {
        primary: 'bg-gradient-to-b from-[#f7dfa5] to-[#f0c14b] border-[#a88734] hover:from-[#f5d78e] hover:to-[#eeb933] text-[#0f1111]',
        secondary: 'bg-gradient-to-b from-[#f7f8fa] to-[#e7e9ec] border-[#adb1b8] hover:from-[#eef1f3] hover:to-[#dce0e4] text-[#0f1111]',
    };
    return (
        <button type={type} onClick={onClick} disabled={loading || disabled}
            className={`h-[29px] px-4 rounded-[3px] text-[13px] font-medium border transition-all flex items-center justify-center gap-2 disabled:opacity-60 ${styles[variant as keyof typeof styles]} ${className}`}>
            {loading && <RefreshCw className="h-3 w-3 animate-spin" />}
            {children}
        </button>
    );
};

const inputCls = "w-full h-[31px] px-3 border border-[#888c8e] rounded-[3px] text-[13px] outline-none focus:border-[#e77600] focus:shadow-[0_0_3px_2px_rgba(228,121,17,0.5)] placeholder:text-[#aaa] bg-white transition-all";

const STATUS_FILTERS = ['All', 'Pending', 'Confirmed', 'Processing', 'Shipped', 'Delivered', 'Cancelled'];

export default function SalesPage() {
    const router = useRouter();
    const [orders, setOrders] = useState<Order[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [statusFilter, setStatusFilter] = useState('All');
    const [updatingRow, setUpdatingRow] = useState<string | null>(null);

    const handleQuickStatusUpdate = async (orderId: string, newStatus: string) => {
        setUpdatingRow(orderId);
        try {
            await orderService.update(orderId, { status: newStatus.toUpperCase() });
            setOrders(prev => prev.map(o => o.id.toString() === orderId ? { ...o, status: newStatus.toUpperCase() } : o));
            toast.success('Status updated');
        } catch (error) { toast.error('Update failed'); } finally { setUpdatingRow(null); }
    };

    const loadOrders = async () => {
        setLoading(true);
        try {
            const data = await orderService.getAll();
            setOrders(Array.isArray(data) ? data : (data as any).results || []);
        } catch { toast.error('Failed to load sales'); } finally { setLoading(false); }
    };

    useEffect(() => { loadOrders(); }, []);

    const filtered = (orders || []).filter(o => {
        const q = searchTerm.toLowerCase();
        const matchesSearch = (o.order_number || '').toLowerCase().includes(q) || o.id.toString().includes(q) || ((o as any).customer_name || '').toLowerCase().includes(q);
        const matchesStatus = statusFilter === 'All' || o.status.toLowerCase() === statusFilter.toLowerCase();
        return matchesSearch && matchesStatus;
    });

    if (loading && orders.length === 0) return <PageLoader />;

    return (
        <div className="bg-[#F8F9FA] min-h-screen pb-20 font-sans text-[#0f1111]">
            {/* Header */}
            <div className="bg-white border-b border-[#ddd] py-4 shadow-sm">
                <div className="max-w-[1400px] mx-auto px-6 text-left">
                    <div className="flex items-center gap-1 text-[12px] text-[#565959] mb-3">
                        <Link href="/admin/dashboard" className="hover:text-[#c45500] hover:underline">Dashboard</Link>
                        <ChevronRight size={10} />
                        <span className="text-[#c45500]">Sales</span>
                    </div>
                    <div className="flex items-center justify-between">
                        <div>
                            <h1 className="text-[22px] font-normal text-[#111]">Sales List</h1>
                            <p className="text-[13px] text-[#565959] mt-0.5">List of all orders and sales</p>
                        </div>
                        <div className="flex gap-2">
                             <Btn variant="secondary" onClick={loadOrders} loading={loading}>
                                <RefreshCw size={14} className={loading ? 'animate-spin' : ''} /> Refresh
                            </Btn>
                            <Btn onClick={() => router.push('/admin/sales/create')}>
                                <Plus size={14} /> Add Sale
                            </Btn>
                        </div>
                    </div>
                </div>
            </div>

            <div className="max-w-[1400px] mx-auto px-6 mt-8 text-left">
                {/* Search & Filter */}
                <div className="bg-white border border-[#ddd] rounded-[4px] p-5 mb-6 shadow-sm flex items-center gap-4">
                    <div className="relative flex-1 max-w-sm">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[#aaa]" />
                        <input
                            value={searchTerm}
                            onChange={e => setSearchTerm(e.target.value)}
                            placeholder="Find by Sale ID or customer..."
                            className={inputCls + " pl-10 h-[35px]"}
                        />
                    </div>
                    <div className="ml-auto flex items-center gap-3">
                        <span className="text-[13px] font-bold">Status:</span>
                        <select
                            value={statusFilter}
                            onChange={e => setStatusFilter(e.target.value)}
                            className={inputCls + " w-[160px] h-[35px] cursor-pointer"}
                        >
                            {STATUS_FILTERS.map(f => <option key={f} value={f}>{f === 'All' ? 'All Sales' : f}</option>)}
                        </select>
                    </div>
                </div>

                {/* Grid/Table */}
                <div className="bg-white border border-[#ddd] rounded-[4px] shadow-sm overflow-hidden text-left">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="bg-[#f7f8fa] border-b border-[#ddd] text-[12px] font-bold text-[#111]">
                                <th className="px-6 py-3">Sale ID</th>
                                <th className="px-6 py-3">Customer</th>
                                <th className="px-6 py-3">Date</th>
                                <th className="px-6 py-3">Status</th>
                                <th className="px-6 py-3 text-right">Total</th>
                                <th className="px-6 py-3 text-right">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-[#eee]">
                            {filtered.length === 0 ? (
                                <tr><td colSpan={6} className="py-20 text-center text-[13px] text-[#565959]">No sales found.</td></tr>
                            ) : (
                                filtered.map(o => (
                                    <tr key={o.id} className="hover:bg-[#fcfdff] transition-colors group text-[13px]">
                                        <td className="px-6 py-4">
                                            <Link href={`/admin/sales/${o.id}/invoice`} className="font-bold text-[#007185] hover:underline">
                                                {o.order_number || `#${o.id}`}
                                            </Link>
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="font-bold text-[#111]">{(o as any).customer_name || 'Walk-in'}</div>
                                            <div className="text-[11px] text-[#aaa]">{o.payment_method || 'Internal'}</div>
                                        </td>
                                        <td className="px-6 py-4 text-[#565959]">{formatDate(o.created_at)}</td>
                                        <td className="px-6 py-4">
                                            <div className="relative inline-block">
                                                <select
                                                    value={(o.status || '').toLowerCase()}
                                                    onChange={(e) => handleQuickStatusUpdate(o.id.toString(), e.target.value)}
                                                    disabled={updatingRow === o.id.toString() || (o.status || '').toUpperCase() === 'DELIVERED'}
                                                    className={`h-[26px] pl-2 pr-6 border border-[#adb1b8] rounded-[3px] text-[11px] font-medium outline-none cursor-pointer bg-[#f7f8fa] hover:bg-white
                                                        ${(o.status || '').toUpperCase() === 'DELIVERED' ? 'text-green-700 bg-green-50' : 'text-[#111]'}`}
                                                >
                                                    {STATUS_FILTERS.filter(f => f !== 'All').map(s => (
                                                        <option key={s} value={s.toLowerCase()}>{s}</option>
                                                    ))}
                                                </select>
                                                {updatingRow === o.id.toString() && <Loader2 className="absolute -right-6 top-1/2 -translate-y-1/2 h-4 w-4 animate-spin text-[#e77600]" />}
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 text-right font-bold text-[#111]">
                                            {formatCurrency(o.total_amount)}
                                        </td>
                                        <td className="px-6 py-4 text-right">
                                            <div className="flex justify-end gap-2 transition-all">
                                                <Btn variant="secondary" onClick={() => router.push(`/admin/sales/${o.id}/invoice`)} className="h-[26px] px-3 font-bold text-[11px]">
                                                    <Eye size={12} /> View Invoice
                                                </Btn>
                                            </div>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
}
