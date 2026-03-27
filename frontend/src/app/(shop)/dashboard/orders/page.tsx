'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { 
    Package, ShoppingBag, Search, ChevronRight, 
    Filter, ArrowUpDown, Clock, CheckCircle, Truck, X
} from 'lucide-react';
import { authService } from '@/lib/auth';
import api from '@/lib/axios';

export default function OrdersPage() {
    const [orders, setOrders] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [filter, setFilter] = useState('all');

    useEffect(() => {
        const fetchOrders = async () => {
            try {
                const response = await api.get('/v1/sales/orders/');
                const data = response.data.results || response.data;
                setOrders(Array.isArray(data) ? data : []);
            } catch (err) {
                console.error("Failed to fetch orders", err);
            } finally {
                setLoading(false);
            }
        };
        fetchOrders();
    }, []);

    const filteredOrders = orders.filter(o => {
        if (filter === 'all') return true;
        if (filter === 'pending') return ['ordered', 'confirmed', 'processing'].includes(o.status.toLowerCase());
        if (filter === 'shipped') return o.status.toLowerCase() === 'shipped';
        if (filter === 'completed') return ['delivered', 'completed'].includes(o.status.toLowerCase());
        return true;
    });

    return (
        <div className="space-y-8 animate-in fade-in duration-500">
            
            {/* ── HEADER (Admin Style) ── */}
            <div className="bg-white dark:bg-slate-900 p-6 rounded border border-gray-100 dark:border-slate-800 shadow-[0_4px_20px_rgba(0,0,0,0.03)] flex flex-col md:flex-row md:items-center justify-between gap-6">
                <div>
                    <h1 className="text-2xl font-black text-slate-900 dark:text-white tracking-tight uppercase">My <span className="text-[#FF9900]">Orders</span></h1>
                    <p className="text-[10px] font-bold text-[#FF9900] tracking-[0.2em] uppercase mt-0.5">View and track all your purchases</p>
                </div>
                
                {/* Filter Tabs */}
                <div className="flex gap-2 p-1.5 bg-slate-50 dark:bg-slate-800 border border-gray-100 dark:border-slate-700 rounded-xl">
                    {['all', 'pending', 'shipped', 'completed'].map(t => (
                        <button
                            key={t}
                            onClick={() => setFilter(t)}
                            className={`
                                px-4 py-2 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all
                                ${filter === t 
                                    ? 'bg-[#FF9900] text-[#131921] shadow-lg shadow-[#FF9900]/20' 
                                    : 'text-gray-400 hover:text-gray-900 dark:hover:text-white'
                                }
                            `}
                        >
                            {t}
                        </button>
                    ))}
                </div>
            </div>

            {/* Orders Table */}
            <div className="bg-white dark:bg-slate-900 rounded-2xl border border-gray-200 dark:border-slate-800 overflow-hidden shadow-sm">
                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="bg-slate-50 dark:bg-slate-800/50 border-b border-gray-100 dark:border-slate-800">
                                <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Order Registry</th>
                                <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Placement Date</th>
                                <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Settlement</th>
                                <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Logistics Status</th>
                                <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] text-right">Dispatch Control</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-50 dark:divide-slate-800/50">
                            {loading ? (
                                <tr>
                                    <td colSpan={5} className="px-6 py-20 text-center">
                                        <span className="animate-spin h-8 w-8 border-4 border-[#FF9900]/20 border-t-[#FF9900] rounded-full inline-block" />
                                    </td>
                                </tr>
                            ) : filteredOrders.length > 0 ? (
                                filteredOrders.map(order => (
                                    <tr key={order.id} className="hover:bg-slate-50/50 dark:hover:bg-white/5 transition-colors group">
                                        <td className="px-6 py-5">
                                            <div className="flex items-center gap-3">
                                                <div className="w-10 h-10 rounded-xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-400 group-hover:text-[#FF9900] transition-colors">
                                                    <Package className="h-5 w-5" />
                                                </div>
                                                <div className="flex flex-col">
                                                    <span className="text-sm font-black text-slate-900 dark:text-white uppercase tracking-tighter">#{order.order_number}</span>
                                                    <span className="text-[9px] text-slate-400 font-bold uppercase tracking-widest italic">Global ID</span>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-6 py-5">
                                            <div className="flex flex-col">
                                                <span className="text-xs font-bold text-slate-600 dark:text-gray-300">
                                                    {new Date(order.created_at).toLocaleDateString('en-US', { day: 'numeric', month: 'short', year: 'numeric' })}
                                                </span>
                                                <span className="text-[9px] text-slate-400 font-medium">{new Date(order.created_at).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}</span>
                                            </div>
                                        </td>
                                        <td className="px-6 py-5">
                                            <div className="flex flex-col">
                                                <span className="text-sm font-black text-[#FF9900] tracking-widest italic">PKR {order.total_amount?.toLocaleString()}</span>
                                                <span className="text-[9px] text-slate-400 font-bold uppercase tracking-tighter">Paid via {order.payment_method?.split(' ')[0]}</span>
                                            </div>
                                        </td>
                                        <td className="px-6 py-5">
                                            <OrderStatusBadge status={order.status} />
                                        </td>
                                        <td className="px-6 py-5 text-right">
                                            <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                                <Link 
                                                    href={`/dashboard/track?order=${order.order_number}`}
                                                    className="p-2 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-gray-300 rounded-lg hover:bg-[#FF9900] hover:text-white transition-all shadow-sm"
                                                    title="Track Order"
                                                >
                                                    <Truck className="h-4 w-4" />
                                                </Link>
                                                <button 
                                                    className="p-2 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-gray-300 rounded-lg hover:bg-[#FF9900] hover:text-white transition-all shadow-sm"
                                                    title="Download Invoice"
                                                    onClick={() => window.open(`/invoice/${order.order_number}`, '_blank')}
                                                >
                                                    <Package className="h-4 w-4" />
                                                </button>
                                                <Link 
                                                    href={`/dashboard/track?order=${order.order_number}`}
                                                    className="p-2 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-gray-300 rounded-lg hover:bg-slate-900 dark:hover:bg-white dark:hover:text-[#131921] transition-all shadow-sm"
                                                >
                                                    <ChevronRight className="h-4 w-4" />
                                                </Link>
                                            </div>
                                        </td>
                                    </tr>
                                ))
                            ) : (
                                <tr>
                                    <td colSpan={5} className="px-6 py-20 text-center">
                                        <div className="flex flex-col items-center space-y-4">
                                            <div className="w-16 h-16 bg-slate-50 dark:bg-slate-800 rounded-full flex items-center justify-center text-slate-300">
                                                <ShoppingBag className="h-8 w-8" />
                                            </div>
                                            <div className="space-y-1">
                                                <p className="text-sm font-bold dark:text-white uppercase tracking-tight">No {filter} orders found</p>
                                                <Link href="/shop" className="text-[11px] text-[#FF9900] font-black uppercase tracking-widest hover:underline italic">Enter Catalog</Link>
                                            </div>
                                        </div>
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
}

function OrderStatusBadge({ status }: { status: string }) {
    const s = status.toLowerCase();
    let config = { 
        bg: 'bg-slate-100 text-slate-600', 
        dot: 'bg-slate-400', 
        label: status 
    };

    if (['ordered', 'processing', 'confirmed'].includes(s)) {
        config = { bg: 'bg-amber-50 text-amber-700 dark:bg-amber-500/10 dark:text-amber-400', dot: 'bg-amber-500', label: status };
    } else if (s === 'shipped') {
        config = { bg: 'bg-blue-50 text-blue-700 dark:bg-blue-500/10 dark:text-blue-400', dot: 'bg-blue-500', label: status };
    } else if (['delivered', 'completed'].includes(s)) {
        config = { bg: 'bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-400', dot: 'bg-emerald-500', label: status };
    } else if (s === 'cancelled' || s === 'rejected') {
        config = { bg: 'bg-red-50 text-red-700 dark:bg-red-500/10 dark:text-red-400', dot: 'bg-red-500', label: status };
    }

    return (
        <span className={`inline-flex items-center gap-2 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest ${config.bg}`}>
            <span className={`w-1.5 h-1.5 rounded-full ${config.dot} animate-pulse`} />
            {config.label}
        </span>
    );
}
