'use client';

import { useState, useEffect } from 'react';
import { Package, Clock, MapPin, Search, ChevronRight, LayoutDashboard, Globe, MoreHorizontal, User, Phone, CheckCircle2, XCircle, AlertCircle } from 'lucide-react';
import Link from 'next/link';
import { salesService } from '@/lib/api';
import PageLoader from '@/components/ui/PageLoader';
import { formatDate } from '@/lib/utils';
import { toast } from 'react-hot-toast';

const STATUS_OPTIONS = [
    { label: 'Pending', value: 'PENDING', color: 'bg-yellow-100 text-yellow-700' },
    { label: 'Confirmed', value: 'CONFIRMED', color: 'bg-blue-100 text-blue-700' },
    { label: 'Processing', value: 'PROCESSING', color: 'bg-purple-100 text-purple-700' },
    { label: 'Shipped', value: 'SHIPPED', color: 'bg-indigo-100 text-indigo-700' },
    { label: 'Delivered', value: 'DELIVERED', color: 'bg-emerald-100 text-emerald-700' },
    { label: 'Cancelled', value: 'CANCELLED', color: 'bg-red-100 text-red-700' },
];

export default function AdminOrdersPage() {
    const [orders, setOrders] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');
    const [statusFilter, setStatusFilter] = useState('ALL');

    useEffect(() => {
        loadOrders();
    }, []);

    const loadOrders = async () => {
        try {
            const data = await salesService.getAdminOrders();
            setOrders(data);
        } catch (err) {
            toast.error("Failed to load orders");
        } finally {
            setLoading(false);
        }
    };

    const handleStatusUpdate = async (id: string, newStatus: string) => {
        try {
            await salesService.updateOrderStatus(id, newStatus);
            toast.success(`Order status updated to ${newStatus}`);
            // Optimistic update
            setOrders(prev => prev.map(o => o.id === id ? { ...o, status: newStatus, status_display: newStatus } : o));
            // Actual reload to sync display name from server if needed
            loadOrders();
        } catch (err) {
            toast.error("Failed to update status");
        }
    };

    const filtered = orders.filter(o => {
        const matchesSearch = 
            o.tracking_id.toLowerCase().includes(search.toLowerCase()) ||
            o.customer_name.toLowerCase().includes(search.toLowerCase()) ||
            o.phone_number.includes(search);
        
        const matchesStatus = statusFilter === 'ALL' || o.status === statusFilter;
        
        return matchesSearch && matchesStatus;
    });

    if (loading) return <PageLoader />;

    return (
        <div className="max-w-[1600px] mx-auto py-8 px-4 lg:px-6">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-10">
                <div className="space-y-1">
                    <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-[#F59E0B]">
                        <Package className="h-3 w-3" /> Sales Management
                    </div>
                    <h1 className="text-3xl font-black text-slate-900 dark:text-white tracking-tighter uppercase">Order Pipeline</h1>
                    <p className="text-sm text-slate-500 font-medium">Monitor real-time orders and manage status transitions.</p>
                </div>

                <div className="flex flex-col sm:flex-row items-center gap-4 w-full md:w-auto">
                    <div className="relative w-full sm:w-64">
                        <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                        <input
                            type="text"
                            placeholder="Search Tracking ID / Name..."
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            className="w-full h-12 pl-11 pr-4 bg-white dark:bg-[#1a252f] border border-slate-200 dark:border-white/10 rounded-xl text-sm font-bold text-slate-900 dark:text-white outline-none focus:border-[#F59E0B] transition-all shadow-sm"
                        />
                    </div>
                    <select
                        value={statusFilter}
                        onChange={(e) => setStatusFilter(e.target.value)}
                        className="h-12 px-4 bg-white dark:bg-[#1a252f] border border-slate-200 dark:border-white/10 rounded-xl text-sm font-bold text-slate-900 dark:text-white outline-none cursor-pointer"
                    >
                        <option value="ALL">All Statuses</option>
                        {STATUS_OPTIONS.map(opt => (
                            <option key={opt.value} value={opt.value}>{opt.label}</option>
                        ))}
                    </select>
                </div>
            </div>

            <div className="bg-white dark:bg-[#1a252f] rounded-3xl border border-slate-200 dark:border-white/10 shadow-sm overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse min-w-[1000px]">
                        <thead>
                            <tr className="bg-slate-50/50 dark:bg-white/[0.02] border-b border-slate-100 dark:border-white/5">
                                <th className="px-6 py-5 text-[10px] font-black uppercase tracking-widest text-slate-400">Order & Customer</th>
                                <th className="px-6 py-5 text-[10px] font-black uppercase tracking-widest text-slate-400">Details</th>
                                <th className="px-6 py-5 text-[10px] font-black uppercase tracking-widest text-slate-400">Amount</th>
                                <th className="px-6 py-5 text-[10px] font-black uppercase tracking-widest text-slate-400">Status Management</th>
                                <th className="px-6 py-5 text-[10px] font-black uppercase tracking-widest text-slate-400 text-right">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-50 dark:divide-white/5">
                            {filtered.map((order) => (
                                <tr key={order.id} className="hover:bg-slate-50/30 dark:hover:bg-white/[0.01] transition-colors group">
                                    <td className="px-6 py-5">
                                        <div className="flex items-center gap-4">
                                            <div className="w-12 h-12 rounded-2xl bg-[#F59E0B]/10 flex items-center justify-center text-[#F59E0B] flex-shrink-0">
                                                <Package className="h-6 w-6" />
                                            </div>
                                            <div>
                                                <p className="text-[10px] font-black text-[#F59E0B] uppercase tracking-widest mb-0.5">{order.tracking_id}</p>
                                                <p className="text-base font-black text-slate-900 dark:text-white uppercase leading-none">{order.customer_name}</p>
                                                <p className="text-[10px] font-bold text-slate-400 mt-1 flex items-center gap-1">
                                                    <Phone className="h-3 w-3" /> {order.phone_number}
                                                </p>
                                            </div>
                                        </div>
                                    </td>
                                    <td className="px-6 py-5 max-w-[250px]">
                                        <div className="space-y-1.5">
                                            <div className="flex gap-2">
                                                <MapPin className="h-3.5 w-3.5 text-slate-400 shrink-0 mt-0.5" />
                                                <p className="text-[11px] font-bold text-slate-600 dark:text-slate-400 line-clamp-2">{order.shipping_address}</p>
                                            </div>
                                            <div className="flex gap-2">
                                                <Clock className="h-3.5 w-3.5 text-slate-400 shrink-0 mt-0.5" />
                                                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{formatDate(order.created_at)}</p>
                                            </div>
                                        </div>
                                    </td>
                                    <td className="px-6 py-5">
                                        <div className="flex flex-col">
                                            <span className="text-base font-black text-slate-900 dark:text-white">Rs. {parseFloat(order.total_amount).toLocaleString()}</span>
                                            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{order.items?.length || 0} items</span>
                                        </div>
                                    </td>
                                    <td className="px-6 py-5">
                                        <select
                                            value={order.status}
                                            onChange={(e) => handleStatusUpdate(order.id, e.target.value)}
                                            className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest border transition-all outline-none cursor-pointer
                                                ${STATUS_OPTIONS.find(s => s.value === order.status)?.color || 'bg-slate-100'}`}
                                        >
                                            {STATUS_OPTIONS.map(opt => (
                                                <option key={opt.value} value={opt.value}>
                                                    {opt.label}
                                                </option>
                                            ))}
                                        </select>
                                    </td>
                                    <td className="px-6 py-5 text-right">
                                        <div className="flex items-center justify-end gap-2">
                                            <Link 
                                                href={`/tracking?tid=${order.tracking_id}`}
                                                title="View tracking"
                                                className="w-10 h-10 rounded-xl bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 flex items-center justify-center text-slate-400 hover:text-[#F59E0B] hover:border-[#F59E0B] transition-all active:scale-95"
                                            >
                                                <Globe className="h-4 w-4" />
                                            </Link>
                                            <button className="w-10 h-10 rounded-xl bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 flex items-center justify-center text-slate-400 hover:text-slate-900 dark:hover:text-white transition-all">
                                                <MoreHorizontal className="h-4 w-4" />
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
}
