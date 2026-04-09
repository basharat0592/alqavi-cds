'use client';

import { useState, useEffect, useCallback } from 'react';
import { Search, Package, Truck, CheckCircle2, AlertCircle, MapPin, ShoppingBag, Clock, ArrowLeft, RefreshCw, Loader2 } from 'lucide-react';
import { useRouter, useSearchParams } from 'next/navigation';
import api from '@/lib/axios';
import { formatCurrency, formatDate } from '@/lib/utils';
import { StatusBadge } from '@/components/ui/StatusBadge';

// ── Tracking Milestones ──
// ── Tracking Milestones (Amazon Logistics Flow) ──
const STEPS = [
    { key: 'draft', label: 'Draft', icon: Clock },
    { key: 'pending', label: 'Confirmed', icon: CheckCircle2 },
    { key: 'processing', label: 'Processing', icon: RefreshCw },
    { key: 'shipped', label: 'Shipped', icon: Truck },
    { key: 'delivered', label: 'Delivered', icon: MapPin },
    { key: 'received', label: 'Received', icon: Package },
];

const STATUS_META: Record<string, { label: string; color: string; icon: any }> = {
    draft:              { label: 'Draft',              color: 'bg-slate-100 text-slate-600',          icon: Clock },
    pending:            { label: 'Confirmed',          color: 'bg-amber-50 text-amber-700',          icon: Clock },
    processing:         { label: 'Processing',         color: 'bg-blue-50 text-blue-700',              icon: RefreshCw },
    shipped:            { label: 'Shipped',            color: 'bg-indigo-50 text-indigo-700',       icon: Truck },
    delivered:          { label: 'Delivered',          color: 'bg-emerald-50 text-emerald-700',    icon: MapPin },
    received:           { label: 'Received',           color: 'bg-emerald-50 text-emerald-700',    icon: CheckCircle2 },
    cancelled:          { label: 'Cancelled',         color: 'bg-red-50 text-red-600',                icon: AlertCircle },
};

export default function OrderTrackingPage() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const [query, setQuery] = useState('');
    const [order, setOrder] = useState<any | null>(null);
    const [loading, setLoading] = useState(false);
    const [updating, setUpdating] = useState(false);
    const [showCancelConfirm, setShowCancelConfirm] = useState(false);
    const [error, setError] = useState('');

    const handleUpdateStatus = async (newStatus: string) => {
        if (!order) return;
        setUpdating(true);
        try {
            await api.patch(`/v1/sales/purchases/${order.id}/`, { status: newStatus });
            // Re-fetch orders to update the UI with new status and tracking progress
            handleSearch(order.purchase_number);
        } catch (err) {
            console.error('Failed to update status', err);
            alert('Failed to update order status. Please try again.');
        } finally {
            setUpdating(false);
        }
    };

    const handleSearch = useCallback(async (searchQuery: string) => {
        if (!searchQuery.trim()) return;

        setLoading(true);
        setError('');
        setOrder(null);

        try {
            const res = await api.get('/v1/sales/purchases/', { params: { search: searchQuery } });
            const results = res.data.results || [];
            
            if (results.length > 0) {
                const detailed = await api.get(`/v1/sales/purchases/${results[0].id}/`);
                setOrder(detailed.data);
            } else {
                setError('No order found with that reference or tracking ID.');
            }
        } catch (err) {
            setError('System error while retrieving data.');
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        const q = searchParams.get('q');
        if (q) {
            setQuery(q);
            handleSearch(q);
        }
    }, [searchParams, handleSearch]);

    const onSearchSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        handleSearch(query);
    };

    const getStatusKey = (s: string) => {
        const lower = s?.toLowerCase();
        if (lower === 'ordered') return 'draft'; // Map initial 'ordered' to 'Draft' milestone
        return lower;
    };

    const currentStepIndex = STEPS.findIndex(s => s.key === getStatusKey(order?.status));

    return (
        <div className="min-h-screen bg-white font-sans text-[#111]">
            {/* Amazon Style Header */}
            <div className="bg-[#232f3e] py-3 px-6 flex items-center justify-between">
                <div className="flex items-center gap-4">
                    <button onClick={() => router.back()} className="text-white hover:text-[#F7CA00] flex items-center gap-1 text-sm font-bold transition-colors">
                        <ArrowLeft size={16} /> Back
                    </button>
                    <h1 className="text-white text-lg font-bold tracking-tight">Track Package</h1>
                </div>
            </div>

            <div className="max-w-[800px] mx-auto py-8 px-4">
                {/* Search Bar */}
                <div className="mb-10 block">
                    <h2 className="text-xl font-bold mb-4">Tracking your shipment</h2>
                    <form onSubmit={onSearchSubmit} className="flex gap-2 p-1 border border-gray-300 rounded-lg shadow-sm focus-within:ring-2 focus-within:ring-[#e77600] focus-within:border-[#e77600] transition-all">
                        <input 
                            type="text"
                            value={query}
                            onChange={(e) => setQuery(e.target.value)}
                            placeholder="Enter Tracking ID or Order #"
                            className="flex-1 px-4 py-2 outline-none text-sm"
                        />
                        <button 
                            type="submit"
                            disabled={loading}
                            className="px-6 py-2 bg-[#F7CA00] hover:bg-[#f0c14b] border border-[#a88734] rounded text-sm font-medium shadow-[0_1px_0_rgba(255,255,255,0.4)_inset] active:shadow-[0_1px_2px_rgba(0,0,0,0.1)_inset]"
                        >
                            {loading ? <Loader2 className="animate-spin h-4 w-4" /> : 'Track'}
                        </button>
                    </form>
                    {error && <p className="mt-2 text-sm text-red-600 font-medium">! {error}</p>}
                </div>

                {order && (
                    <div className="animate-in fade-in duration-500">
                        {/* Summary Bar */}
                        <div className="bg-[#f0f2f2] border border-[#d5d9d9] rounded-t-lg px-6 py-4 flex flex-wrap gap-x-12 gap-y-4 text-[12px] text-[#565959]">
                            <div>
                                <p className="uppercase font-bold text-[10px]">Order Placed</p>
                                <p className="text-[#111] font-medium mt-0.5">{formatDate(order.created_at)}</p>
                            </div>
                            <div>
                                <p className="uppercase font-bold text-[10px]">Total</p>
                                <p className="text-[#111] font-medium mt-0.5">{formatCurrency(order.total_amount)}</p>
                            </div>
                            <div>
                                <p className="uppercase font-bold text-[10px]">Ship to</p>
                                <p className="text-[#007185] font-medium mt-0.5 hover:text-[#c7511f] cursor-pointer hover:underline">{order.supplier_name}</p>
                            </div>
                            <div className="ml-auto text-right">
                                <p className="uppercase font-bold text-[10px]">Order # {order.purchase_number}</p>
                                <p className="text-[#007185] font-medium mt-0.5 hover:text-[#c7511f] cursor-pointer hover:underline">View balance details</p>
                            </div>
                        </div>

                        {/* Progress Section */}
                        <div className="border-x border-b border-[#d5d9d9] rounded-b-lg p-8 mb-8">
                            <h2 className={`text-xl font-bold mb-2 ${order.status === 'cancelled' ? 'text-red-600' : 'text-[#c45500]'}`}>
                                {order.status === 'received' ? 'Package arrived' : 
                                 order.status === 'cancelled' ? 'Your order is cancelled' : 
                                 'Arriving soon'}
                            </h2>
                            <p className="text-sm text-[#565959] mb-8 font-medium">
                                {order.status === 'cancelled' 
                                    ? 'This shipment was voided by the supplier. Please contact procurement for details.' 
                                    : `Tracking ID: ${order.tracking_id || 'Generating...'}`}
                            </p>

                            {/* Progress Dots */}
                            <div className="relative mb-16 px-4">
                                {/* Base Line */}
                                <div className="absolute top-1/2 left-8 right-8 h-[4px] bg-[#e7e9ec] -translate-y-1/2 rounded-full" />
                                
                                {/* Active Progress Line */}
                                {currentStepIndex >= 0 && order.status !== 'cancelled' && (
                                    <div 
                                        className="absolute top-1/2 left-8 h-[4px] bg-[#067d62] -translate-y-1/2 transition-all duration-1000 rounded-full z-0" 
                                        style={{ width: `calc(${(currentStepIndex / (STEPS.length - 1)) * 100}% - 4px)` }}
                                    />
                                )}
                                
                                <div className="relative flex justify-between">
                                    {STEPS.map((step, idx) => {
                                        const isCompleted = order.status !== 'cancelled' && idx <= currentStepIndex;
                                        const isCurrent = order.status !== 'cancelled' && idx === currentStepIndex;
                                        const StepIcon = step.icon;

                                        return (
                                            <div key={idx} className="flex flex-col items-center group relative z-10">
                                                <div className={`w-8 h-8 rounded-full border-4 flex items-center justify-center transition-all duration-500 bg-white ${
                                                    order.status === 'cancelled' ? 'border-gray-200 text-gray-300' :
                                                    isCompleted ? 'border-[#067d62] text-[#067d62]' : 'border-[#d5d9d9] text-[#ccc]'
                                                } ${isCurrent ? 'scale-110 shadow-lg' : ''}`}>
                                                    <StepIcon size={14} className={isCompleted && order.status !== 'cancelled' ? 'animate-in zoom-in-50 duration-300' : ''} />
                                                </div>
                                                <div className="absolute top-10 flex flex-col items-center min-w-[100px]">
                                                    <p className={`text-[10px] font-black uppercase tracking-tighter text-center leading-tight ${
                                                        order.status === 'cancelled' ? 'text-gray-300' :
                                                        isCompleted ? 'text-[#067d62]' : 'text-[#888]'
                                                    }`}>
                                                        {step.label}
                                                    </p>
                                                    {isCurrent && order.status !== 'cancelled' && (
                                                        <span className="w-1 h-1 bg-[#c45500] rounded-full mt-1 animate-pulse" />
                                                    )}
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>

                            <hr className="border-[#e7e9ec] mb-8" />


                            {/* Simple Manifest */}
                            <div className="space-y-4">
                                <h3 className="text-sm font-bold border-b pb-2">Packages in this shipment</h3>
                                {order.items?.map((item: any) => (
                                    <div key={item.id} className="flex justify-between items-center py-2 border-b border-dashed border-slate-200 last:border-0">
                                        <div>
                                            <p className="text-sm font-bold text-[#111]">{item.product_name}</p>
                                            <p className="text-[11px] text-slate-500">Supplier: {order.supplier_name}</p>
                                        </div>
                                        <div className="text-right">
                                            <p className="text-xs font-bold text-[#c45500]">Qty: {item.quantity}</p>
                                        </div>
                                    </div>
                                ))}
                            </div>
                            <div className="mt-10 pt-8 border-t border-[#e7e9ec] flex items-center justify-between">
                                <div className="space-x-3">
                                    {['draft', 'ordered', 'pending', 'processing'].includes(order.status?.toLowerCase()) && (
                                        <button 
                                            onClick={() => setShowCancelConfirm(true)}
                                            disabled={updating}
                                            className="px-6 py-2 bg-white hover:bg-[#f7fafa] border border-[#d5d9d9] rounded text-sm font-semibold shadow-sm text-slate-700"
                                        >
                                            {updating ? 'Processing...' : 'Cancel Order'}
                                        </button>
                                    )}

                                    {['shipped', 'delivered'].includes(order.status?.toLowerCase()) && (
                                        <button 
                                            onClick={() => handleUpdateStatus('received')}
                                            disabled={updating}
                                            className="px-8 py-2 bg-[#F7CA00] hover:bg-[#F3A847] border border-[#a88734] rounded text-sm font-bold shadow-sm text-[#111]"
                                        >
                                            {updating ? 'Updating...' : 'Confirm Received'}
                                        </button>
                                    )}
                                </div>

                                <div className="text-[11px] text-[#565959] flex items-center gap-2">
                                    <AlertCircle size={14} className="text-[#EEAF1C]" />
                                    <span>Business procurement protocols active</span>
                                </div>
                            </div>
                        </div>

                        {/* Additional Info */}
                        <div className="grid grid-cols-2 gap-8 px-4">
                            <div>
                                <h3 className="text-sm font-bold mb-2">Shipping Address</h3>
                                <p className="text-sm text-[#565959]">{order.supplier_name}</p>
                                <p className="text-sm text-[#565959]">{order.supplier_phone || 'N/A'}</p>
                            </div>
                            <div>
                                <h3 className="text-sm font-bold mb-2">Payment Method</h3>
                                <p className="text-sm text-[#565959]">Bank Transfer / Credit</p>
                            </div>
                        </div>
                    </div>
                )}

                {/* Empty State */}
                {!order && !loading && (
                    <div className="py-20 text-center text-[#565959]">
                        <Package size={64} className="mx-auto mb-4 opacity-20" />
                        <p className="text-sm font-medium">Enter a tracking ID or order number above to see details.</p>
                    </div>
                )}
            </div>

            {/* ── Confirmation Modal ── */}
            {showCancelConfirm && (
                <div className="fixed inset-0 z-[500] flex items-center justify-center bg-black/50 p-4 animate-in fade-in duration-200">
                    <div className="bg-white rounded-lg shadow-2xl w-full max-w-sm overflow-hidden animate-in zoom-in-95 duration-200 border border-gray-200">
                        <div className="p-6">
                            <div className="flex items-start gap-4 mb-4">
                                <div className="p-2 bg-red-50 rounded-full">
                                    <AlertCircle className="h-6 w-6 text-red-600" />
                                </div>
                                <div>
                                    <h3 className="text-lg font-bold text-[#111]">Cancel this order?</h3>
                                    <p className="text-sm text-[#565959] mt-1 leading-relaxed">
                                        This action cannot be undone. The supplier will be notified that this procurement is voided.
                                    </p>
                                </div>
                            </div>
                            
                            <div className="flex flex-col gap-2 mt-6">
                                <button 
                                    onClick={() => {
                                        setShowCancelConfirm(false);
                                        handleUpdateStatus('cancelled');
                                    }}
                                    className="w-full py-2.5 bg-[#F7CA00] hover:bg-[#f0c14b] border border-[#a88734] rounded text-sm font-bold shadow-sm"
                                >
                                    Confirm Cancellation
                                </button>
                                <button 
                                    onClick={() => setShowCancelConfirm(false)}
                                    className="w-full py-2.5 bg-white hover:bg-[#f7fafa] border border-[#d5d9d9] rounded text-sm font-medium shadow-sm"
                                >
                                    Go Back
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

