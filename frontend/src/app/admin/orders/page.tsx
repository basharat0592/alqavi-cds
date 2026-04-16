"use client";

import { useState, useEffect } from 'react';
import { Package, Clock, MapPin, Search, ChevronRight, LayoutDashboard, Globe, MoreHorizontal, User, Phone, CheckCircle2, XCircle, AlertCircle, RefreshCw } from 'lucide-react';
import Link from 'next/link';
import { salesService } from '@/lib/api';
import PageLoader from '@/components/ui/PageLoader';
import { formatDate, formatCurrency } from '@/lib/utils';
import { toast } from 'react-hot-toast';

/* ─────────────────────────────────────────────────────────────────────────────
   PURE AMAZON RETAIL DESIGN SYSTEM - ADMIN ORDERS
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

const inputCls = "w-full h-[35px] px-3 border border-[#888c8e] rounded-[4px] text-[14px] outline-none focus:border-[#e77600] focus:shadow-[0_0_3px_2px_rgba(228,121,17,0.5)] placeholder:text-[#aaa] bg-white transition-all";

const STATUS_OPTIONS = [
    { label: 'Pending', value: 'PENDING', color: 'bg-amber-50 text-amber-700 border-amber-200' },
    { label: 'Confirmed', value: 'CONFIRMED', color: 'bg-blue-50 text-blue-700 border-blue-200' },
    { label: 'Processing', value: 'PROCESSING', color: 'bg-indigo-50 text-indigo-700 border-indigo-200' },
    { label: 'Shipped', value: 'SHIPPED', color: 'bg-cyan-50 text-cyan-700 border-cyan-200' },
    { label: 'Delivered', value: 'DELIVERED', color: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
    { label: 'Cancelled', value: 'CANCELLED', color: 'bg-red-50 text-red-700 border-red-200' },
];

export default function AdminOrdersPage() {
    const [orders, setOrders] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');
    const [statusFilter, setStatusFilter] = useState('ALL');

    useEffect(() => { loadOrders(); }, []);

    const loadOrders = async () => {
        setLoading(true);
        try {
            const data = await salesService.getAdminOrders();
            setOrders(data || []);
        } catch (err) { toast.error("Failed to load orders"); } finally { setLoading(false); }
    };

    const handleStatusUpdate = async (id: string, newStatus: string) => {
        try {
            await salesService.updateOrderStatus(id, newStatus);
            toast.success(`Status updated`);
            loadOrders();
        } catch (err) { toast.error("Update failed"); }
    };

    const filtered = (orders || []).filter(o => {
        const matchesSearch = 
            (o.tracking_id || '').toLowerCase().includes(search.toLowerCase()) ||
            (o.customer_name || '').toLowerCase().includes(search.toLowerCase()) ||
            (o.phone_number || '').includes(search);
        const matchesStatus = statusFilter === 'ALL' || o.status === statusFilter;
        return matchesSearch && matchesStatus;
    });

    if (loading && orders.length === 0) return <PageLoader />;

    return (
        <div className="bg-[#F8F9FA] min-h-screen pb-20 font-sans text-[#0f1111]">
            {/* Header */}
            <div className="bg-white border-b border-[#ddd] py-4 shadow-sm">
                <div className="max-w-[1440px] mx-auto px-6 text-left">
                    <div className="flex items-center gap-1 text-[12px] text-[#565959] mb-3">
                        <Link href="/admin/dashboard" className="hover:text-[#c45500] hover:underline">Dashboard</Link>
                        <ChevronRight size={10} />
                        <span className="text-[#c45500]">Orders Pipeline</span>
                    </div>
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                        <div>
                            <h1 className="text-[22px] font-normal text-[#111]">Orders</h1>
                            <p className="text-[13px] text-[#565959] mt-0.5">Manage and track all customer orders</p>
                        </div>
                        <div className="flex flex-wrap items-center gap-3">
                            <div className="relative w-[240px]">
                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[#aaa]" />
                                <input
                                    placeholder="Search Tracking ID / Name..."
                                    value={search}
                                    onChange={(e) => setSearch(e.target.value)}
                                    className={inputCls + " pl-10"}
                                />
                            </div>
                            <select
                                value={statusFilter}
                                onChange={(e) => setStatusFilter(e.target.value)}
                                className={inputCls + " w-[160px] cursor-pointer"}
                            >
                                <option value="ALL">All Status</option>
                                {STATUS_OPTIONS.map(opt => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
                            </select>
                            <Btn variant="secondary" onClick={loadOrders} loading={loading}>
                                <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
                            </Btn>
                        </div>
                    </div>
                </div>
            </div>

            <div className="max-w-[1440px] mx-auto px-6 mt-8 text-left">
                <div className="bg-white border border-[#ddd] rounded-[4px] shadow-sm overflow-hidden">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="bg-[#f7f8fa] border-b border-[#ddd] text-[12px] font-bold text-[#111]">
                                <th className="px-6 py-3">Customer & Tracking</th>
                                <th className="px-6 py-3">Shipping Address</th>
                                <th className="px-6 py-3">Amount</th>
                                <th className="px-6 py-3">Status</th>
                                <th className="px-6 py-3 text-right">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-[#eee]">
                            {filtered.length === 0 ? (
                                <tr><td colSpan={5} className="py-20 text-center text-[13px] text-[#565959]">No orders found.</td></tr>
                            ) : (
                                filtered.map((order) => {
                                    const st = STATUS_OPTIONS.find(s => s.value === order.status);
                                    return (
                                        <tr key={order.id} className="hover:bg-[#fcfdff] transition-colors group text-[13px]">
                                            <td className="px-6 py-4">
                                                <div className="flex items-center gap-3">
                                                    <div className="w-10 h-10 bg-[#f7f8fa] border border-[#ddd] rounded-[4px] flex items-center justify-center text-[#565959]">
                                                        <Package size={18} />
                                                    </div>
                                                    <div>
                                                        <p className="text-[11px] font-bold text-[#c45500] uppercase tracking-widest">{order.tracking_id}</p>
                                                        <p className="font-bold text-[#111]">{order.customer_name}</p>
                                                        <p className="text-[11px] text-[#aaa] flex items-center gap-1 mt-0.5"><Phone size={10} /> {order.phone_number}</p>
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="px-6 py-4 max-w-[250px]">
                                                <div className="flex items-start gap-2">
                                                    <MapPin size={12} className="text-[#aaa] shrink-0 mt-0.5" />
                                                    <p className="line-clamp-2 text-[#565959]">{order.shipping_address}</p>
                                                </div>
                                                <div className="flex items-center gap-2 mt-2 text-[11px] text-[#aaa]">
                                                    <Clock size={10} /> {formatDate(order.created_at)}
                                                </div>
                                            </td>
                                            <td className="px-6 py-4">
                                                <div className="font-bold text-[#111]">{formatCurrency(order.total_amount)}</div>
                                                <div className="text-[11px] text-green-600 font-bold uppercase">{order.items?.length || 0} items</div>
                                            </td>
                                            <td className="px-6 py-4">
                                                <select
                                                    value={order.status}
                                                    onChange={(e) => handleStatusUpdate(order.id, e.target.value)}
                                                    className={`px-3 py-1.5 rounded-[3px] text-[11px] font-bold border outline-none cursor-pointer transition-all
                                                        ${st?.color || 'bg-white text-[#111]'}`}
                                                >
                                                    {STATUS_OPTIONS.map(opt => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
                                                </select>
                                            </td>
                                            <td className="px-6 py-4 text-right">
                                                <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                                    <Link 
                                                        href={`/admin/tracking?q=${order.tracking_id}`}
                                                        className="p-1.5 border border-[#ddd] rounded bg-white hover:bg-[#f7f8fa] text-[#007185] transition-all"
                                                        title="Track Order"
                                                    >
                                                        <Globe size={14} />
                                                    </Link>
                                                    <button className="p-1.5 border border-[#ddd] rounded bg-white hover:bg-[#f7f8fa] text-[#565959]">
                                                        <MoreHorizontal size={14} />
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    );
                                })
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
}
