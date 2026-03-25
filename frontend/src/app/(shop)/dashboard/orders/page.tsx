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
                const user = authService.getUser();
                if (user) {
                    const filtered = data.filter((o: any) => o.customer_email === user.email);
                    setOrders(filtered);
                }
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
        if (filter === 'pending') return ['pending', 'confirmed', 'processing'].includes(o.status.toLowerCase());
        if (filter === 'shipped') return o.status.toLowerCase() === 'shipped';
        if (filter === 'completed') return ['delivered', 'completed'].includes(o.status.toLowerCase());
        return true;
    });

    return (
        <div className="space-y-8 animate-in fade-in duration-500">
            
            {/* Header */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-6">
                <div className="space-y-1">
                    <h1 className="text-3xl font-black dark:text-white tracking-tight uppercase">My <span className="text-[#FF9900]">Orders</span></h1>
                    <p className="text-[10px] text-gray-500 font-bold uppercase tracking-[0.2em]">View and track all your purchases</p>
                </div>
                
                {/* Filter Tabs */}
                <div className="flex gap-2 p-1.5 bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-800 rounded-2xl shadow-sm">
                    {['all', 'pending', 'shipped', 'completed'].map(t => (
                        <button
                            key={t}
                            onClick={() => setFilter(t)}
                            className={`
                                px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all
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

            {/* Orders List */}
            <div className="space-y-4">
                {loading ? (
                    <div className="bg-white dark:bg-slate-900 rounded-3xl border border-gray-200 dark:border-slate-800 p-20 flex items-center justify-center">
                        <span className="animate-spin h-8 w-8 border-4 border-[#FF9900]/20 border-t-[#FF9900] rounded-full" />
                    </div>
                ) : filteredOrders.length > 0 ? (
                    filteredOrders.map(order => (
                        <div key={order.id} className="bg-white dark:bg-slate-900 rounded-3xl border border-gray-200 dark:border-slate-800 overflow-hidden shadow-sm hover:border-[#FF9900] transition-colors group">
                            {/* Order Header */}
                            <div className="bg-slate-50 dark:bg-slate-800/50 p-6 flex flex-wrap justify-between items-center gap-6 border-b dark:border-slate-800">
                                <div className="flex gap-10">
                                    <div className="space-y-1">
                                        <p className="text-[9px] text-gray-400 font-black uppercase tracking-widest">Order Placed</p>
                                        <p className="text-xs font-bold dark:text-white uppercase tracking-tighter">
                                            {new Date(order.created_at).toLocaleDateString('en-US', { day: 'numeric', month: 'short', year: 'numeric' })}
                                        </p>
                                    </div>
                                    <div className="space-y-1">
                                        <p className="text-[9px] text-gray-400 font-black uppercase tracking-widest">Total Amount</p>
                                        <p className="text-xs font-black dark:text-white tracking-widest">PKR {order.total_amount?.toLocaleString()}</p>
                                    </div>
                                </div>
                                <div className="space-y-1 text-right">
                                    <p className="text-[9px] text-gray-500 font-black uppercase tracking-widest">Order # {order.order_number}</p>
                                    <Link href={`/dashboard/track?order=${order.order_number}`} className="text-xs text-[#007185] hover:text-[#C45500] hover:underline font-bold transition-transform inline-flex items-center gap-1 group/link">
                                        View Details <ChevronRight className="h-3 w-3 group-hover/link:translate-x-1 transition-transform" />
                                    </Link>
                                </div>
                            </div>

                            {/* Order Body */}
                            <div className="p-8 flex flex-col md:flex-row justify-between items-center gap-8">
                                <div className="flex items-center gap-6 flex-1">
                                    <div className="w-20 h-20 bg-slate-50 dark:bg-slate-800 p-4 border border-gray-100 rounded-2xl flex items-center justify-center shrink-0">
                                        <ShoppingBag className="h-8 w-8 text-gray-300" />
                                    </div>
                                    <div className="space-y-2">
                                        <h4 className="text-lg font-black dark:text-white tracking-widest uppercase">
                                            {['delivered', 'completed'].includes(order.status.toLowerCase()) ? 'Delivered' : 'In Transit'}
                                        </h4>
                                        <p className="text-xs text-emerald-600 font-bold uppercase tracking-tighter flex items-center gap-2">
                                            {order.status.toLowerCase() === 'delivered' ? <CheckCircle className="h-3 w-3" /> : <Clock className="h-3 w-3" />}
                                            Current Status: {order.status}
                                        </p>
                                        <p className="text-[10px] text-gray-400 font-medium">Tracking Info: Official Hub Shipping</p>
                                    </div>
                                </div>
                                <div className="flex gap-4">
                                    <Link href={`/dashboard/track?order=${order.order_number}`} className="px-6 py-2 bg-slate-100 font-black text-[10px] uppercase tracking-widest rounded-xl hover:bg-slate-200 transition-all dark:bg-slate-800 dark:text-white">
                                        Track Item
                                    </Link>
                                    <button className="px-6 py-2 bg-white border border-gray-200 font-black text-[10px] uppercase tracking-widest rounded-xl hover:bg-gray-50 transition-all dark:bg-slate-900 dark:border-slate-700 dark:text-white">
                                        Invoice
                                    </button>
                                </div>
                            </div>
                        </div>
                    ))
                ) : (
                    <div className="bg-white dark:bg-slate-900 rounded-3xl border border-gray-200 dark:border-slate-800 p-20 text-center space-y-6">
                        <div className="w-20 h-20 bg-slate-50 dark:bg-slate-800 rounded-full flex items-center justify-center mx-auto ring-8 ring-white dark:ring-slate-900">
                        <ShoppingBag className="h-8 w-8 text-gray-300" />
                        </div>
                        <div className="space-y-1">
                            <h3 className="text-xl font-bold dark:text-white uppercase tracking-tight">No {filter} orders found</h3>
                            <p className="text-gray-400 text-xs font-medium max-w-xs mx-auto">Looks like you haven't placed any {filter === 'all' ? '' : filter} orders yet.</p>
                        </div>
                        <Link href="/shop" className="inline-block px-10 py-3 bg-[#FF9900] text-[#131921] font-black text-xs uppercase tracking-widest rounded-xl hover:shadow-lg transition-all active:scale-[0.98]">
                            Start Shopping
                        </Link>
                    </div>
                )}
            </div>
        </div>
    );
}
