'use client';

import { useState, useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import {
    Package, Truck, CheckCircle, Clock,
    Search, MapPin, Calendar, CreditCard,
    ArrowRight, Info, AlertCircle, ShoppingBag,
    ChevronRight, ExternalLink, XCircle, AlertTriangle
} from 'lucide-react';
import api from '@/lib/axios';

const STATUS_STEPS = [
    { key: 'ordered', label: 'Ordered', icon: ShoppingBag },
    { key: 'confirmed', label: 'Confirmed', icon: CheckCircle },
    { key: 'processing', label: 'Processing', icon: Clock },
    { key: 'shipped', label: 'Shipped', icon: Truck },
    { key: 'delivered', label: 'Delivered', icon: Package },
];

export default function TrackOrderDashboard() {
    const searchParams = useSearchParams();
    const [orderNumber, setOrderNumber] = useState(searchParams.get('order') || '');
    const [loading, setLoading] = useState(false);
    const [order, setOrder] = useState<any>(null);
    const [error, setError] = useState('');

    useEffect(() => {
        if (searchParams.get('order')) {
            handleTrack(null, searchParams.get('order') || '');
        }
    }, [searchParams]);

    const handleTrack = async (e?: React.FormEvent | null, manualOrder?: string) => {
        if (e) e.preventDefault();
        const targetOrder = manualOrder || orderNumber;
        if (!targetOrder.trim()) return;

        setLoading(true);
        setError('');
        setOrder(null);

        try {
            const response = await api.get(`/v1/sales/track/${targetOrder.trim()}/`);
            const orderData = response.data;
            setOrder(orderData);
        } catch (err: any) {
            setError(err.response?.data?.error || 'Order not found. Please check the order number.');
        } finally {
            setLoading(false);
        }
    };

    function getCurrentStatusIndex(currentStatus: string) {
        const index = STATUS_STEPS.findIndex(step => step.key === currentStatus.toLowerCase());
        if (index === -1 && currentStatus.toLowerCase() === 'completed') return 4;
        if (index === -1 && (currentStatus.toLowerCase() === 'rejected' || currentStatus.toLowerCase() === 'cancelled')) return -1;
        return index;
    }

    const statusIndex = order ? getCurrentStatusIndex(order.status) : -1;

    return (
        <div className="space-y-6 animate-in fade-in duration-500 pb-20 relative">


            {/* ── HEADER (Admin Style) ── */}
            <div className="bg-white dark:bg-slate-900 p-6 rounded border border-gray-100 dark:border-slate-800 shadow-[0_4px_20px_rgba(0,0,0,0.03)] flex flex-col md:flex-row md:items-center justify-between gap-6">
                <div>
                    <h1 className="text-2xl font-black text-slate-900 dark:text-white tracking-tight">Live Tracking</h1>
                    <p className="text-[10px] font-bold text-[#F7CA00] tracking-[0.2em] uppercase mt-0.5">Real-time order monitoring</p>
                </div>

                <form onSubmit={(e) => handleTrack(e)} className="relative flex-1 max-w-md">
                    <input
                        type="text"
                        value={orderNumber}
                        onChange={(e) => setOrderNumber(e.target.value.toUpperCase())}
                        placeholder="ORD-XXXXX"
                        className="w-full px-5 py-2.5 bg-slate-50 dark:bg-slate-800 border border-gray-100 dark:border-slate-700 rounded text-sm font-bold tracking-widest focus:ring-1 focus:ring-[#F7CA00] outline-none"
                    />
                    <button
                        type="submit"
                        disabled={loading}
                        className="absolute right-1 top-1 bottom-1 px-4 bg-slate-900 text-white text-[10px] font-black uppercase tracking-widest rounded hover:bg-black transition-all disabled:opacity-50"
                    >
                        {loading ? '...' : 'Track'}
                    </button>
                </form>
            </div>

            {error && (
                <div className="p-4 bg-rose-50 dark:bg-red-900/10 border border-rose-100 dark:border-red-900/20 rounded flex items-center gap-3 text-rose-600">
                    <AlertCircle className="h-4 w-4" />
                    <p className="text-[11px] font-black uppercase tracking-tight">{error}</p>
                </div>
            )}

            {order ? (
                <div className="space-y-6">

                    {/* Visual Stepper Section */}
                    <div className="bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-800 p-8 rounded shadow-sm">
                        <div className="flex justify-between items-center mb-10 pb-6 border-b dark:border-slate-800">
                            <div>
                                <h3 className="text-lg font-black dark:text-white">{order.order_number}</h3>
                                <div className="flex items-center gap-2 mt-1">
                                    <div className={`w-1.5 h-1.5 rounded-full ${order.status.toLowerCase() === 'rejected' ? 'bg-red-500' : 'bg-emerald-500'}`} />
                                    <span className={`text-[10px] font-bold uppercase tracking-widest ${order.status.toLowerCase() === 'rejected' ? 'text-red-500' : 'text-gray-400'}`}>
                                        Status: {order.status}
                                    </span>
                                </div>
                            </div>
                            <div className="text-right">
                                <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest">Order Total</p>
                                <p className="text-lg font-black text-[#F7CA00]">PKR {order.total_amount?.toLocaleString()}</p>
                            </div>
                        </div>

                        {order.status.toLowerCase() === 'rejected' || order.status.toLowerCase() === 'cancelled' ? (
                            <div className="flex flex-col items-center justify-center py-16 text-center animate-in fade-in duration-700 bg-white dark:bg-slate-900 border border-red-200 dark:border-red-900/30 rounded shadow-sm">
                                <div className="w-16 h-16 bg-red-50 dark:bg-red-500/10 rounded-full flex items-center justify-center mb-6">
                                    <AlertCircle className="h-8 w-8 text-red-600" />
                                </div>
                                <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-2">Order Cancelled</h2>
                                <p className="text-sm text-gray-600 dark:text-gray-400 mb-8 max-w-sm px-6">
                                    Your order <span className="font-bold text-red-600">{order.order_number}</span> has been cancelled. Please contact support if you need further assistance.
                                </p>
                                <div className="w-full max-w-xs px-6">
                                    <button
                                        onClick={() => setOrder(null)}
                                        className="w-full py-2.5 bg-[#F7CA00] hover:bg-[#ebae1e] border border-[#a88734] rounded text-sm text-white shadow-sm font-medium transition-all"
                                    >
                                        Track another package
                                    </button>
                                </div>
                                <div className="mt-8 pt-8 border-t border-gray-100 dark:border-slate-800 w-full flex justify-center">
                                    <span className="text-xs text-gray-400 font-medium">Order Reference: {order.order_number}</span>
                                </div>
                            </div>
                        ) : (
                            /* Flat Stepper */
                            <div className="relative pt-6 pb-2">
                                <div className="absolute top-[2.75rem] left-[5%] right-[5%] h-[2px] bg-slate-100 dark:bg-slate-800" />
                                <div
                                    className="absolute top-[2.75rem] left-[5%] h-[2px] bg-[#F7CA00] transition-all duration-1000"
                                    style={{ width: `${Math.max(0, (statusIndex / 4) * 90)}%` }}
                                />

                                <div className="flex justify-between relative">
                                    {STATUS_STEPS.map((step, idx) => {
                                        const Icon = step.icon;
                                        const isActive = idx <= statusIndex;
                                        const isCurrent = idx === statusIndex;

                                        return (
                                            <div key={idx} className="flex flex-col items-center w-[18%]">
                                                <div className={`
                                                    w-10 h-10 rounded shadow-sm flex items-center justify-center transition-all duration-500
                                                    ${isActive
                                                        ? 'bg-[#F7CA00] text-white scale-110 z-10'
                                                        : 'bg-white dark:bg-slate-800 text-slate-300 border border-slate-100 dark:border-slate-700'
                                                    }
                                                `}>
                                                    <Icon className="h-4 w-4" />
                                                </div>
                                                <p className={`mt-3 text-[9px] font-black uppercase tracking-tighter text-center ${isActive ? 'text-slate-900 dark:text-white' : 'text-slate-400'}`}>
                                                    {step.label}
                                                </p>
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Info Grid */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-800 p-6 rounded shadow-sm">
                            <h4 className="text-[11px] font-black text-slate-400 uppercase tracking-[0.2em] mb-4">Shipment Details</h4>
                            <div className="space-y-4">
                                <div className="flex gap-4">
                                    <MapPin className="h-4 w-4 text-slate-400 mt-1" />
                                    <div>
                                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Shipping Address</p>
                                        <p className="text-xs font-black dark:text-white leading-relaxed truncate max-w-[250px] italic">
                                            {order.notes || 'Default Home Address'}
                                        </p>
                                    </div>
                                </div>
                                <div className="flex gap-4">
                                    <Clock className="h-4 w-4 text-slate-400 mt-1" />
                                    <div>
                                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Ordered Date</p>
                                        <p className="text-xs font-black dark:text-white capitalize">
                                            {new Date(order.created_at).toLocaleDateString(undefined, { dateStyle: 'long' })}
                                        </p>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div className="bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-800 p-6 rounded shadow-sm">
                            <h4 className="text-[11px] font-black text-slate-400 uppercase tracking-[0.2em] mb-4">Summary</h4>
                            <div className="space-y-3">
                                {order.items?.map((item: any, i: number) => (
                                    <div key={i} className="flex justify-between items-center bg-slate-50/50 dark:bg-slate-800/30 p-2 rounded">
                                        <span className="text-[10px] font-bold text-slate-700 dark:text-slate-300 truncate max-w-[200px]">{item.product_name} x {item.quantity}</span>
                                        <span className="text-[10px] font-black text-slate-900 dark:text-white">PKR {parseFloat(item.price).toLocaleString()}</span>
                                    </div>
                                ))}
                                <div className="pt-2 border-t dark:border-slate-800 flex justify-between">
                                    <span className="text-[11px] font-black dark:text-white uppercase tracking-widest">Payable</span>
                                    <span className="text-sm font-black text-[#F7CA00]">PKR {order.total_amount?.toLocaleString()}</span>
                                </div>
                            </div>
                        </div>
                    </div>

                </div>
            ) : !loading && (
                <div className="py-20 text-center">
                    <div className="w-16 h-16 bg-slate-50 dark:bg-slate-800 rounded-2xl flex items-center justify-center mx-auto mb-4 border border-slate-100 dark:border-slate-700">
                        <ShoppingBag className="h-8 w-8 text-slate-200" />
                    </div>
                    <p className="text-[11px] font-black text-slate-400 uppercase tracking-[0.2em]">Ready for Tracking...</p>
                </div>
            )}
        </div>
    );
}
