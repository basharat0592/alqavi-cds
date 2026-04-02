'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import {
    Package, ShoppingBag, Search, ChevronRight,
    Filter, ArrowUpDown, Clock, CheckCircle, Truck, X, Trash2, AlertTriangle, Ban,
    MoreVertical, ChevronDown, Download, Eye, ExternalLink
} from 'lucide-react';
import { authService } from '@/lib/auth';
import api from '@/lib/axios';

export default function OrdersPage() {
    const [orders, setOrders] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [filter, setFilter] = useState('all');

    // Modal state
    const [isCancelling, setIsCancelling] = useState(false);
    const [orderToCancel, setOrderToCancel] = useState<any>(null);

    const fetchOrders = async () => {
        setLoading(true);
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

    useEffect(() => {
        fetchOrders();
    }, []);

    const confirmCancel = (order: any) => {
        setOrderToCancel(order);
        setIsCancelling(true);
    };

    const handleCancel = async () => {
        if (!orderToCancel) return;

        try {
            await api.post(`/v1/sales/orders/${orderToCancel.id}/cancel/`);
            setOrders(prev => prev.map(o => o.id === orderToCancel.id ? { ...o, status: 'Cancelled' } : o));
            setIsCancelling(false);
            setOrderToCancel(null);
        } catch (err: any) {
            console.error("Failed to cancel order", err);
            alert(err.response?.data?.error || "Failed to cancel order. Please try again.");
        }
    };

    const filteredOrders = orders.filter(o => {
        if (filter === 'all') return true;
        const status = o.status.toLowerCase();
        if (filter === 'pending') return ['ordered', 'confirmed', 'pending', 'processing'].includes(status);
        if (filter === 'shipped') return ['shipped'].includes(status);
        if (filter === 'completed') return ['delivered'].includes(status);
        if (filter === 'cancelled') return ['cancelled', 'rejected', 'cancel_requested'].includes(status);
        return true;
    });

    return (
        <div className="max-w-[900px] mx-auto animate-in fade-in duration-500 pb-20">

            {/* Title Area */}
            <div className="mb-6">
                <h1 className="text-3xl font-medium text-slate-900 mb-6">Your Orders</h1>
                
                {/* Filter Tabs - Amazon Style Flat */}
                <div className="flex gap-8 border-b border-gray-200">
                    {['all', 'pending', 'shipped', 'completed', 'cancelled'].map(t => (
                        <button
                            key={t}
                            onClick={() => setFilter(t)}
                            className={`
                                pb-3 text-sm font-bold capitalize transition-all border-b-2
                                ${filter === t
                                    ? 'border-[#F7CA00] text-slate-900'
                                    : 'border-transparent text-slate-500 hover:text-slate-900'
                                }
                            `}
                        >
                            {t === 'all' ? 'Orders' : t}
                        </button>
                    ))}
                </div>
            </div>

            {/* Statistics Row */}
            <p className="text-sm text-slate-600 mb-6 font-medium">
                <span className="font-bold">{filteredOrders.length} orders</span> placed in 
                <span className="text-[#007185] hover:underline cursor-pointer ml-1 font-bold">past 3 months</span>
            </p>

            {/* Orders List */}
            <div className="space-y-6">
                {loading ? (
                    <div className="py-20 text-center">
                        <div className="w-10 h-10 border-4 border-blue-100 border-t-[#F7CA00] rounded-full animate-spin mx-auto mb-4" />
                        <p className="text-sm font-bold text-slate-400 uppercase tracking-widest">Searching History...</p>
                    </div>
                ) : filteredOrders.length > 0 ? (
                    filteredOrders.map(order => (
                        <div key={order.id} className="bg-white border border-gray-300 rounded-lg overflow-hidden shadow-sm hover:shadow-md transition-shadow">
                            
                            {/* Card Header (metadata) */}
                            <div className="bg-[#f0f2f2] border-b border-gray-300 px-6 py-4 flex flex-wrap items-center justify-between gap-6 text-[11px] font-medium text-slate-600 uppercase tracking-wider">
                                <div className="flex gap-10">
                                    <div className="flex flex-col gap-1">
                                        <span>Order Placed</span>
                                        <span className="text-sm font-bold text-slate-800 tracking-tight lowercase first-letter:uppercase">
                                            {new Date(order.created_at).toLocaleDateString('en-US', { day: 'numeric', month: 'long', year: 'numeric' })}
                                        </span>
                                    </div>
                                    <div className="flex flex-col gap-1">
                                        <span>Total</span>
                                        <span className="text-sm font-bold text-slate-800 tracking-tight">PKR {order.total_amount?.toLocaleString()}</span>
                                    </div>
                                    <div className="flex flex-col gap-1 hidden sm:flex">
                                        <span>Ship To</span>
                                        <span className="text-sm font-bold text-[#007185] hover:text-red-700 hover:underline cursor-pointer tracking-tight capitalize">{authService.getUser()?.name}</span>
                                    </div>
                                </div>
                                <div className="text-right flex flex-col gap-1">
                                    <span>Order # {order.order_number}</span>
                                    <div className="flex items-center gap-3 justify-end text-[#007185]">
                                        <Link href={`/dashboard/track?order=${order.order_number}`} className="hover:text-red-700 hover:underline">View order details</Link>
                                        <div className="w-[1px] h-3 bg-gray-300" />
                                        <Link href="#" className="hover:text-red-700 hover:underline">Invoice</Link>
                                    </div>
                                </div>
                            </div>

                            {/* Card Content (Status & Items) */}
                            <div className="p-6 flex flex-col md:flex-row md:items-start justify-between gap-8">
                                <div className="flex-1">
                                    <div className="flex items-center gap-2 mb-4">
                                        <h3 className={`text-lg font-black tracking-tight ${order.status.toLowerCase() === 'delivered' ? 'text-emerald-600' : 'text-slate-900'}`}>
                                            {order.status.toUpperCase()}
                                        </h3>
                                        <p className="text-sm text-slate-500 font-medium">
                                            {order.status.toLowerCase() === 'delivered' ? 'on ' + new Date(order.created_at).toLocaleDateString() : 'Update available in Track Package'}
                                        </p>
                                    </div>

                                    <div className="flex items-start gap-4 p-1">
                                        <div className="w-20 h-20 bg-gray-50 border border-gray-100 rounded-lg flex items-center justify-center shrink-0">
                                            <Package className="h-8 w-8 text-gray-300" />
                                        </div>
                                        <div>
                                            <p className="text-sm font-bold text-[#007185] hover:text-[#F7CA00] hover:underline cursor-pointer leading-snug">
                                                Package Registry Entry #{order.order_number} - Professional Distribution Shipment
                                            </p>
                                            <p className="text-xs text-slate-500 mt-2 font-medium">Standard Logistics Delivery</p>
                                            <button className="mt-4 px-4 py-1.5 bg-[#FFD814] hover:bg-[#F7CA00] border border-[#F0C14B] rounded-lg text-xs font-bold shadow-sm shadow-[#F7CA00]/10 flex items-center gap-2 transition-all">
                                                <ShoppingBag className="h-4 w-4" />
                                                Buy it again
                                            </button>
                                        </div>
                                    </div>
                                </div>

                                {/* Right Side Actions */}
                                <div className="flex flex-col gap-2 w-full md:w-56">
                                    <Link href={`/dashboard/track?order=${order.order_number}`} className="w-full text-center py-1.5 bg-[#F7CA00] text-white hover:bg-[#1E40AF] rounded-lg text-xs font-bold shadow-sm transition-all">
                                        Track package
                                    </Link>
                                    <button className="w-full text-center py-1.5 border border-gray-300 hover:bg-gray-50 rounded-lg text-xs font-bold shadow-sm transition-all">
                                        Return or replace items
                                    </button>
                                    <button className="w-full text-center py-1.5 border border-gray-300 hover:bg-gray-50 rounded-lg text-xs font-bold shadow-sm transition-all">
                                        Share gift receipt
                                    </button>
                                    <button className="w-full text-center py-1.5 border border-gray-300 hover:bg-gray-50 rounded-lg text-xs font-bold shadow-sm transition-all">
                                        Write a product review
                                    </button>
                                    
                                    {['ordered', 'confirmed', 'pending'].includes(order.status.toLowerCase()) && (
                                        <button 
                                            onClick={() => confirmCancel(order)}
                                            className="w-full text-center mt-2 py-1.5 bg-rose-50 text-rose-600 border border-rose-100 hover:bg-rose-100 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all"
                                        >
                                            Request Cancellation
                                        </button>
                                    )}
                                </div>
                            </div>
                        </div>
                    ))
                ) : (
                    <div className="py-24 text-center bg-gray-50 rounded-xl border border-dashed border-gray-300">
                        <ShoppingBag className="h-12 w-12 text-gray-200 mx-auto mb-4" />
                        <h3 className="text-xl font-bold text-slate-900 mb-2">No orders found</h3>
                        <p className="text-sm text-slate-500 max-w-sm mx-auto mb-8">It looks like you haven't placed any orders yet. Visit our store to find your first purchase!</p>
                        <Link href="/shop" className="px-10 py-2 bg-[#F7CA00] text-white font-bold rounded-lg hover:bg-[#1E40AF] transition-all">
                            Go to Store
                        </Link>
                    </div>
                )}
            </div>

            {/* Cancel Modal */}
            {isCancelling && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-300">
                    <div className="bg-white rounded-2xl p-8 max-w-md w-full shadow-2xl border border-gray-200">
                        <div className="w-16 h-16 bg-amber-50 rounded-full flex items-center justify-center mb-6 mx-auto">
                            <AlertTriangle className="h-8 w-8 text-amber-500" />
                        </div>
                        <h3 className="text-2xl font-bold text-slate-900 text-center mb-2">Cancel Order?</h3>
                        <p className="text-slate-500 text-center mb-8">Are you sure you want to request cancellation for order <span className="font-bold text-slate-800">#{orderToCancel?.order_number}</span>? This action cannot be reversed.</p>
                        <div className="flex gap-3 mt-4">
                            <button onClick={() => setIsCancelling(false)} className="flex-1 px-4 py-3 border border-gray-200 text-slate-600 font-medium rounded-xl hover:bg-gray-50 transition-all font-bold">Nevermind</button>
                            <button onClick={handleCancel} className="flex-1 px-4 py-3 bg-amber-500 text-white font-bold rounded-xl hover:bg-amber-600 transition-all shadow-lg shadow-amber-500/20">Yes, Cancel</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
