'use client';

import { useState, useEffect, useCallback } from 'react';
import { useSearchParams } from 'next/navigation';
import {
    Package, Truck, CheckCircle, Clock,
    Search, MapPin, AlertCircle, ShoppingBag,
    XCircle, PackageCheck, AlertTriangle, RefreshCw
} from 'lucide-react';
import api from '@/lib/axios';

const STATUS_STEPS = [
    { key: 'ordered', label: 'Ordered', icon: ShoppingBag },
    { key: 'pending', label: 'Pending', icon: Clock },
    { key: 'confirmed', label: 'Confirmed', icon: CheckCircle },
    { key: 'processing', label: 'Processing', icon: RefreshCw },
    { key: 'shipped', label: 'Shipped', icon: Truck },
    { key: 'delivered', label: 'Delivered', icon: PackageCheck },
];

function getCurrentStatusIndex(status: string) {
    const s = status?.toLowerCase();
    const idx = STATUS_STEPS.findIndex(step => step.key === s);
    if (idx === -1 && s === 'completed') return 5;
    if (idx === -1 && ['rejected', 'cancelled'].includes(s)) return -1;
    return idx;
}

export default function TrackOrderDashboard() {
    const searchParams = useSearchParams();
    const tid = searchParams.get('tid') || searchParams.get('order') || '';
    const [orderNumber, setOrderNumber] = useState(tid);
    const [loading, setLoading] = useState(false);
    const [order, setOrder] = useState<any>(null);
    const [error, setError] = useState('');

    // Action states
    const [cancelTarget, setCancelTarget] = useState(false);
    const [receivedTarget, setReceivedTarget] = useState(false);
    const [actionLoading, setActionLoading] = useState(false);
    const [actionError, setActionError] = useState('');

    /* ── Fetch order silently (no full loading spinner) ── */
    const fetchOrder = useCallback(async (num: string, silent = false) => {
        if (!num.trim()) return;
        if (!silent) { setLoading(true); setError(''); setOrder(null); }
        try {
            const res = await api.get(`/v1/sales/track/${num.trim()}/`);
            setOrder(res.data);
        } catch (err: any) {
            if (!silent) setError(err.response?.data?.error || 'Order not found. Please check the order number.');
        } finally {
            if (!silent) setLoading(false);
        }
    }, []);

    /* ── Auto fetch + poll when URL has tracking number ── */
    useEffect(() => {
        const num = searchParams.get('tid') || searchParams.get('order');
        if (num) {
            setOrderNumber(num);
            fetchOrder(num);
        }

        const interval = setInterval(() => {
            const cur = searchParams.get('tid') || searchParams.get('order');
            if (cur) fetchOrder(cur, true);
        }, 8000);

        return () => clearInterval(interval);
    }, [searchParams, fetchOrder]);

    const handleTrack = (e: React.FormEvent) => {
        e.preventDefault();
        fetchOrder(orderNumber);
    };

    /* ── Cancel Order ── */
    const handleCancel = async () => {
        if (!order) return;
        setActionLoading(true); setActionError('');
        try {
            await api.post(`/v1/sales/orders/${order.id}/cancel/`);
            setOrder((prev: any) => ({ ...prev, status: 'cancelled' }));
            setCancelTarget(false);
        } catch (err: any) {
            setActionError(err.response?.data?.error || 'Failed to cancel order.');
        } finally {
            setActionLoading(false);
        }
    };

    /* ── Order Received → delivered ── */
    const handleReceived = async () => {
        if (!order) return;
        setActionLoading(true); setActionError('');
        try {
            await api.post(`/v1/sales/orders/${order.id}/received/`);
            setOrder((prev: any) => ({ ...prev, status: 'delivered' }));
            setReceivedTarget(false);
        } catch (err: any) {
            console.error('Confirm Error:', err);
            setActionError(err.response?.data?.error || err.message || 'Failed to confirm receipt.');
        } finally {
            setActionLoading(false);
        }
    };

    const canCancel = (s: string) => ['ordered', 'pending', 'confirmed', 'processing'].includes(s?.toLowerCase());
    const isShipped = (s: string) => s?.toLowerCase() === 'shipped';
    const isCancelled = (s: string) => ['cancelled', 'rejected'].includes(s?.toLowerCase());
    const isDelivered = (s: string) => s?.toLowerCase() === 'delivered';

    const statusIndex = order ? getCurrentStatusIndex(order.status) : -1;

    return (
        <div className="space-y-6 animate-in fade-in duration-500 pb-20">

            {/* ── Header ── */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 border-b border-gray-200 pb-4">
                <div>
                    <h1 className="text-3xl font-normal text-[#111]">Track your package</h1>
                </div>
                <form onSubmit={handleTrack} className="relative flex-1 max-w-lg group">
                    <Search className={`absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 transition-colors ${loading ? 'text-[#F59E0B] animate-pulse' : 'text-gray-400 group-focus-within:text-[#F59E0B]'}`} />
                    <input
                        type="text"
                        value={orderNumber}
                        onChange={e => setOrderNumber(e.target.value.toUpperCase())}
                        placeholder="Enter tracking number"
                        className="w-full h-8 pl-9 pr-20 bg-white border border-[#D5D9D9] rounded-md text-sm text-[#111] outline-none focus:border-[#F59E0B] shadow-inner"
                    />
                    <button
                        type="submit"
                        disabled={loading}
                        className="absolute right-2 top-1 bottom-1 px-4 bg-[#FFD814] hover:bg-[#F7CA00] border border-[#FCD200] text-xs font-medium text-[#111] rounded shadow-sm disabled:opacity-50"
                    >
                        {loading ? '...' : 'Track'}
                    </button>
                </form>
            </div>

            {/* Error */}
            {error && (
                <div className="p-4 bg-rose-50 border border-rose-100 rounded-xl flex items-center gap-3 text-rose-600">
                    <AlertCircle className="h-4 w-4 shrink-0" />
                    <p className="text-xs font-bold">{error}</p>
                </div>
            )}

            {order ? (
                <div className="space-y-6">

                    {/* ── Stepper Card ── */}
                    <div className="bg-white border border-gray-200 p-8 rounded-xl shadow-sm">

                        {/* Order header row */}
                        <div className="flex flex-wrap justify-between items-start gap-4 mb-8 pb-6 border-b border-gray-100">
                            <div>
                                <h3 className="text-lg font-black text-slate-900">{order.order_number}</h3>
                                <div className="flex items-center gap-2 mt-1">
                                    <div className={`w-2 h-2 rounded-full ${isCancelled(order.status) ? 'bg-red-500' : isDelivered(order.status) ? 'bg-emerald-500' : 'bg-amber-400 animate-pulse'}`} />
                                    <span className={`text-[10px] font-bold uppercase tracking-widest ${isCancelled(order.status) ? 'text-red-500' : isDelivered(order.status) ? 'text-emerald-600' : 'text-slate-400'}`}>
                                        {order.status}
                                    </span>
                                </div>
                            </div>

                            {/* Right side: actions + total */}
                            <div className="flex items-center gap-4 flex-wrap">
                                {/* Cancel button — pre-shipped only */}
                                {canCancel(order.status) && (
                                    <button
                                        onClick={() => { setCancelTarget(true); setActionError(''); }}
                                        className="flex items-center gap-1.5 px-4 py-2 bg-rose-50 text-rose-600 border border-rose-100 hover:bg-rose-100 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all"
                                    >
                                        <XCircle className="h-3.5 w-3.5" />
                                        Cancel Order
                                    </button>
                                )}

                                {/* Order Received — only when shipped */}
                                {isShipped(order.status) && (
                                    <button
                                        onClick={() => { setReceivedTarget(true); setActionError(''); }}
                                        className="flex items-center gap-1.5 px-4 py-2 bg-emerald-50 text-emerald-700 border border-emerald-100 hover:bg-emerald-100 rounded-lg text-[10px] font-black uppercase tracking-widest shadow-sm transition-all active:scale-95"
                                    >
                                        <CheckCircle className="h-3.5 w-3.5" />
                                        Order Received
                                    </button>
                                )}

                                <div className="text-right">
                                    <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest">Order Total</p>
                                    <p className="text-lg font-black text-[#F59E0B]">PKR {order.total_amount?.toLocaleString()}</p>
                                </div>
                            </div>
                        </div>

                        {/* Cancelled / Rejected State */}
                        {isCancelled(order.status) ? (
                            <div className="flex flex-col items-center justify-center py-12 text-center">
                                <div className="w-16 h-16 bg-red-50 rounded-full flex items-center justify-center mb-5">
                                    <XCircle className="h-8 w-8 text-red-500" />
                                </div>
                                <h2 className="text-lg font-bold text-slate-900 mb-2">Order Cancelled</h2>
                                <p className="text-sm text-slate-500 mb-6 max-w-sm">
                                    Your order <span className="font-bold text-red-600">{order.order_number}</span> has been cancelled.
                                </p>
                                <button
                                    onClick={() => { setOrder(null); setOrderNumber(''); }}
                                    className="px-6 py-2 bg-[#F59E0B] text-slate-900 font-bold rounded-lg text-sm hover:bg-amber-400 transition-all"
                                >
                                    Track Another Order
                                </button>
                            </div>

                        ) : isDelivered(order.status) ? (
                            /* Delivered celebration */
                            <div className="flex flex-col items-center justify-center py-10 text-center animate-in zoom-in duration-500">
                                <div className="w-16 h-16 bg-emerald-50 rounded-full flex items-center justify-center mb-5 border border-emerald-100">
                                    <CheckCircle className="h-8 w-8 text-emerald-600" strokeWidth={2.5} />
                                </div>
                                <h2 className="text-2xl font-black text-slate-900 mb-1">Order Delivered! 🎉</h2>
                                <p className="text-sm font-bold text-slate-400">Your order has been successfully delivered and verified. Thank you for shopping!</p>
                            </div>

                        ) : (
                            <div className="mb-12">
                                <div className="relative h-2 bg-[#F0F2F2] rounded-full overflow-hidden">
                                    <div
                                        className="absolute top-0 left-0 h-full bg-[#007600] transition-all duration-1000 ease-out"
                                        style={{ width: `${Math.max(10, ((statusIndex + 1) / STATUS_STEPS.length) * 100)}%` }}
                                    />
                                </div>
                                <div className="flex justify-between mt-4">
                                    {STATUS_STEPS.map((step, idx) => {
                                        const isActive = idx <= statusIndex;
                                        return (
                                            <div key={idx} className="flex flex-col items-center">
                                                <div className={`w-3 h-3 rounded-full ${isActive ? 'bg-[#007600]' : 'bg-gray-200'}`} />
                                                <p className={`mt-2 text-[10px] sm:text-xs font-bold ${isActive ? 'text-[#007600]' : 'text-gray-400'}`}>
                                                    {step.label}
                                                </p>
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Order Info Grid */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="bg-white border border-[#D5D9D9] rounded-lg p-6">
                            <h3 className="text-lg font-bold text-[#111] mb-4">Shipping Information</h3>
                            <div className="space-y-4">
                                <div>
                                    <p className="text-xs text-gray-500 font-bold uppercase">Shipping Address</p>
                                    <p className="text-sm text-[#111] mt-1">{order.notes || 'Default Address'}</p>
                                </div>
                                <div>
                                    <p className="text-xs text-gray-500 font-bold uppercase">Ordered On</p>
                                    <p className="text-sm text-[#111] mt-1">{new Date(order.created_at).toLocaleDateString()}</p>
                                </div>
                            </div>
                        </div>

                        <div className="bg-white border border-[#D5D9D9] rounded-lg p-6">
                            <h3 className="text-lg font-bold text-[#111] mb-4">Order Items</h3>
                            <div className="space-y-2">
                                {order.items?.map((item: any, i: number) => (
                                    <div key={i} className="flex justify-between items-center text-sm border-b border-[#F0F2F2] pb-2 last:border-0">
                                        <span className="text-[#111] line-clamp-1">{item.product_name} <span className="text-gray-400">x{item.quantity}</span></span>
                                        <span className="font-bold text-[#111]">Rs. {parseFloat(item.price).toLocaleString()}</span>
                                    </div>
                                ))}
                                <div className="pt-2 flex justify-between mt-2">
                                    <span className="text-sm font-bold text-[#111]">Total</span>
                                    <span className="text-sm font-bold text-[#B12704]">Rs. {order.total_amount?.toLocaleString()}</span>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Live indicator */}
                    <p className="text-center text-[10px] font-bold text-slate-300 flex items-center justify-center gap-2">
                        <span className="w-1.5 h-1.5 bg-emerald-400 rounded-full animate-pulse" />
                        Status updates automatically every 8 seconds
                    </p>
                </div>

            ) : !loading && (
                <div className="py-20 text-center">
                    <div className="w-16 h-16 bg-slate-50 rounded-2xl flex items-center justify-center mx-auto mb-4 border border-slate-100">
                        <ShoppingBag className="h-8 w-8 text-slate-200" />
                    </div>
                    <p className="text-[11px] font-black text-slate-400 uppercase tracking-[0.2em]">Enter an order number to start tracking</p>
                </div>
            )}

            {/* ══════════════════════════════════════════
                CANCEL MODAL
            ══════════════════════════════════════════ */}
            {cancelTarget && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
                    <div className="bg-white rounded-2xl p-8 max-w-md w-full shadow-2xl">
                        <div className="w-14 h-14 bg-rose-50 rounded-full flex items-center justify-center mb-5 mx-auto">
                            <AlertTriangle className="h-7 w-7 text-rose-500" />
                        </div>
                        <h3 className="text-xl font-bold text-slate-900 text-center mb-2">Cancel Order?</h3>
                        <p className="text-sm text-slate-500 text-center mb-6">
                            You are about to cancel order <span className="font-bold text-slate-800">#{order?.order_number}</span>. This cannot be undone.
                        </p>
                        {actionError && (
                            <div className="mb-4 p-3 bg-rose-50 border border-rose-100 rounded-xl text-xs text-rose-600 font-bold text-center">{actionError}</div>
                        )}
                        <div className="flex gap-3">
                            <button
                                onClick={() => { setCancelTarget(false); setActionError(''); }}
                                disabled={actionLoading}
                                className="flex-1 py-3 border border-gray-200 text-slate-600 font-bold rounded-xl hover:bg-gray-50 transition-all disabled:opacity-50"
                            >
                                Keep Order
                            </button>
                            <button
                                onClick={handleCancel}
                                disabled={actionLoading}
                                className="flex-1 py-3 bg-rose-500 text-white font-bold rounded-xl hover:bg-rose-600 transition-all shadow-lg shadow-rose-500/20 disabled:opacity-50"
                            >
                                {actionLoading ? 'Cancelling...' : 'Yes, Cancel'}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* ══════════════════════════════════════════
                ORDER RECEIVED MODAL
            ══════════════════════════════════════════ */}
            {receivedTarget && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
                    <div className="bg-white rounded-2xl p-8 max-w-md w-full shadow-2xl">
                        <div className="w-14 h-14 bg-emerald-50 rounded-full flex items-center justify-center mb-5 mx-auto">
                            <CheckCircle className="h-7 w-7 text-emerald-600" strokeWidth={2.5} />
                        </div>
                        <h3 className="text-xl font-bold text-slate-900 text-center mb-2">Confirm Order Received?</h3>
                        <p className="text-sm text-slate-500 text-center mb-2">
                            Confirm that you have received order <span className="font-bold text-slate-800">#{order?.order_number}</span>.
                        </p>
                        <p className="text-xs text-slate-400 text-center mb-6">
                            This will mark the order as <span className="font-bold text-emerald-600">Delivered</span> on both your dashboard and the admin panel.
                        </p>
                        {actionError && (
                            <div className="mb-4 p-3 bg-rose-50 border border-rose-100 rounded-xl text-xs text-rose-600 font-bold text-center">{actionError}</div>
                        )}
                        <div className="flex gap-3">
                            <button
                                onClick={() => { setReceivedTarget(false); setActionError(''); }}
                                disabled={actionLoading}
                                className="flex-1 py-3 border border-gray-200 text-slate-600 font-bold rounded-xl hover:bg-gray-50 transition-all disabled:opacity-50"
                            >
                                Not Yet
                            </button>
                            <button
                                onClick={handleReceived}
                                disabled={actionLoading}
                                className="flex-1 py-3 bg-emerald-500 text-white font-bold rounded-xl hover:bg-emerald-600 transition-all shadow-lg shadow-emerald-500/20 disabled:opacity-50"
                            >
                                {actionLoading ? 'Confirming...' : 'Yes, Received!'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
