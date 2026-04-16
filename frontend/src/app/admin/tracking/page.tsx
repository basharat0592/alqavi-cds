"use client";

import { useState, useEffect, useCallback } from 'react';
import { Search, Package, Truck, CheckCircle2, AlertCircle, MapPin, ShoppingBag, Clock, ArrowLeft, RefreshCw, Loader2, ChevronRight, ChevronLeft, ShieldCheck, Box, MoreVertical, ExternalLink } from 'lucide-react';
import { useRouter, useSearchParams } from 'next/navigation';
import api from '@/lib/axios';
import { formatCurrency, formatDate } from '@/lib/utils';
import Link from 'next/link';
import toast from 'react-hot-toast';

/* ─────────────────────────────────────────────────────────────────────────────
   PURE AMAZON RETAIL DESIGN SYSTEM - TRACKING VERSION 2.0
   ───────────────────────────────────────────────────────────────────────────── */
const Btn = ({ children, onClick, loading, variant = 'primary', className = '', type = 'button', disabled = false }: any) => {
    const styles = {
        primary: 'bg-[#FFD814] hover:bg-[#F7CA00] border-[#FCD200] text-[#0f1111] shadow-[0_2px_5px_0_rgba(213,217,217,0.5)]',
        secondary: 'bg-white hover:bg-[#f7f8fa] border-[#D5D9D9] text-[#0f1111] shadow-[0_2px_5px_0_rgba(213,217,217,0.5)]',
        danger: 'bg-red-50 hover:bg-red-100 border-red-200 text-red-700 shadow-sm'
    };
    return (
        <button type={type} onClick={onClick} disabled={loading || disabled}
            className={`h-[31px] px-4 rounded-[8px] text-[13px] font-medium border transition-all flex items-center justify-center gap-2 disabled:opacity-60 ${styles[variant as keyof typeof styles]} ${className}`}>
            {loading && <RefreshCw className="h-3 w-3 animate-spin" />}
            {children}
        </button>
    );
};

const inputCls = "w-full h-[40px] px-10 border border-[#D5D9D9] rounded-[8px] text-[14px] outline-none focus:border-[#e77600] focus:shadow-[0_0_0_3px_rgba(228,121,17,0.3)] placeholder:text-[#888] bg-white transition-all font-medium";

const STEPS = [
    { key: 'PENDING', label: 'Ordered', icon: Clock },
    { key: 'PROCESSING', label: 'Confirmed', icon: CheckCircle2 },
    { key: 'SHIPPED', label: 'In Transit', icon: Truck },
    { key: 'DELIVERED', label: 'Delivered', icon: MapPin },
    { key: 'RECEIVED', label: 'Received', icon: Box },
];

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
            handleSearch(order.purchase_number);
            toast.success('Status updated');
        } catch (err) { toast.error('Update failed'); } finally { setUpdating(false); }
    };

    const handleSearch = useCallback(async (searchQuery: string, silent = false) => {
        if (!searchQuery.trim()) return;
        if (!silent) {
            setLoading(true);
            setOrder(null);
        }
        setError('');
        try {
            const res = await api.get('/v1/sales/purchases/', { params: { search: searchQuery } });
            const results = Array.isArray(res.data) ? res.data : (res.data.results || []);
            if (results.length > 0) {
                const matchedOrder = results.find((o: any) => 
                    o.purchase_number.toLowerCase() === searchQuery.toLowerCase() || o.id === searchQuery
                ) || results[0];
                const detailed = await api.get(`/v1/sales/purchases/${matchedOrder.id}/`);
                setOrder(detailed.data);
            } else if (!silent) {
                setError('No order found with that ID.');
            }
        } catch (err) {
            if (!silent) setError('Failed to find order.');
        } finally {
            if (!silent) setLoading(false);
        }
    }, [setLoading, setOrder, setError]);

    useEffect(() => {
        const q = searchParams.get('q');
        if (q) { setQuery(q); handleSearch(q); }
    }, [searchParams, handleSearch]);

    // REAL-TIME AUTO-SYNC: Poll for updates every 2s if an order is visible
    useEffect(() => {
        if (!order || loading || updating) return;
        const interval = setInterval(() => {
            handleSearch(order.purchase_number, true);
        }, 2000); // 2 seconds
        return () => clearInterval(interval);
    }, [order, loading, updating, handleSearch]);

    const onSearchSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        handleSearch(query);
    };

    const getStatusIndex = (status: string) => {
        const s = status?.toUpperCase();
        if (s === 'ORDERED' || s === 'PENDING') return 0;
        return STEPS.findIndex(step => step.key === s);
    };

    const currentStepIndex = getStatusIndex(order?.status);

    return (
        <div className="bg-white min-h-screen pb-24 font-sans text-[#0f1111]">
            {/* Nav */}
            <div className="bg-white border-b border-[#D5D9D9] sticky top-0 z-50 py-3 mb-8">
                <div className="max-w-[1240px] mx-auto px-6 flex items-center justify-between">
                    <div className="flex items-center gap-4">
                         <Btn variant="secondary" onClick={() => router.back()} className="rounded-full w-10 p-0 flex items-center justify-center">
                            <ArrowLeft size={16} />
                         </Btn>
                         <h1 className="text-[20px] font-bold tracking-tight">Track Your Shipment</h1>
                    </div>
                    <Link href="/admin/dashboard" className="text-[13px] text-[#007185] hover:text-[#c45500] hover:underline transition-colors font-medium">Dashboard Account</Link>
                </div>
            </div>

            <div className="max-w-[1000px] mx-auto px-6">
                
                {/* Search Bar - Amazon 2024 Header Style */}
                <div className="mb-10 group">
                    <form onSubmit={onSearchSubmit} className="relative max-w-2xl mx-auto drop-shadow-sm hover:drop-shadow-md transition-all">
                        <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-[#888] group-focus-within:text-[#e77600]" />
                        <input
                            value={query}
                            onChange={(e) => setQuery(e.target.value)}
                            placeholder="Tracking ID, Order Number or Batch Ref..."
                            className={inputCls}
                        />
                        <button type="submit" disabled={loading} className="absolute right-1 top-1 bottom-1 px-8 rounded-[7px] bg-[#FFD814] hover:bg-[#F7CA00] text-[13px] font-bold transition-colors">
                            {loading ? <Loader2 size={16} className="animate-spin" /> : 'Track'}
                        </button>
                    </form>
                    {error && <div className="mt-4 flex items-center gap-2 justify-center text-red-600 animate-in slide-in-from-top-2 duration-300"><AlertCircle size={14} /> <span className="text-[13px] font-medium">{error}</span></div>}
                </div>

                {order ? (
                    <div className="animate-in fade-in duration-700 space-y-8">
                        
                        {/* Summary Header */}
                        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 border-b border-[#D5D9D9] pb-6">
                            <div>
                                <h2 className="text-[24px] font-bold text-[#111] mb-1">
                                    {order.status === 'RECEIVED' ? 'Package Delivered' : 
                                     order.status === 'CANCELLED' ? 'Order Cancelled' : 
                                     order.status === 'SHIPPED' ? 'On its way' : 'Preparing shipment'}
                                </h2>
                                <p className="text-[14px] text-[#565959]">
                                    {order.status === 'RECEIVED' ? `Your package was received on ${formatDate(order.updated_at)}` : 
                                     order.status === 'CANCELLED' ? 'This procurement request was cancelled.' : 
                                     `Estimated delivery: ${order.expected_delivery_date ? formatDate(order.expected_delivery_date) : 'Coming soon'}`}
                                </p>
                            </div>
                            <div className="flex gap-2">
                                <Btn variant="secondary" className="font-bold">Order Details</Btn>
                                <Btn variant="secondary" className="font-bold">Share Tracking</Btn>
                            </div>
                        </div>

                        {/* Tracking Grid */}
                        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                            
                            {/* Left: Progress & Items */}
                            <div className="lg:col-span-2 space-y-6">
                                
                                <div className="bg-white border border-[#D5D9D9] rounded-[8px] p-8 shadow-sm">
                                    {/* Professional Visual Tracker */}
                                    <div className="relative mb-20 px-4">
                                        <div className="absolute top-1/2 left-0 right-0 h-1.5 bg-[#F0F2F2] -translate-y-1/2 rounded-full" />
                                        {currentStepIndex >= 0 && order.status !== 'CANCELLED' && (
                                            <div 
                                                className="absolute top-1/2 left-0 h-1.5 bg-[#007600] -translate-y-1/2 rounded-full transition-all duration-1000 ease-out" 
                                                style={{ width: `${(currentStepIndex / (STEPS.length - 1)) * 100}%` }}
                                            />
                                        )}
                                        
                                        <div className="relative flex justify-between items-center">
                                            {STEPS.map((step, idx) => {
                                                const isCompleted = order.status !== 'CANCELLED' && idx <= currentStepIndex;
                                                const isCurrent = order.status !== 'CANCELLED' && idx === currentStepIndex;
                                                const Icon = step.icon;

                                                return (
                                                    <div key={idx} className="flex flex-col items-center relative group">
                                                        <div className={`w-9 h-9 rounded-full border-2 flex items-center justify-center bg-white z-10 transition-all duration-500
                                                            ${isCompleted ? 'border-[#007600] text-[#007600] scale-110 shadow-sm' : 'border-[#D5D9D9] text-[#888]'}`}>
                                                            {isCompleted ? <CheckCircle2 size={18} fill="currentColor" className="text-white bg-[#007600] rounded-full" /> : <Icon size={16} />}
                                                        </div>
                                                        <div className="absolute top-12 flex flex-col items-center min-w-[100px] text-center">
                                                            <p className={`text-[11px] font-bold uppercase tracking-tight leading-tight ${isCompleted ? 'text-[#007600]' : 'text-[#565959]'}`}>{step.label}</p>
                                                            {isCurrent && <span className="text-[9px] text-[#c45500] font-black animate-pulse mt-1">LATEST UPDATE</span>}
                                                        </div>
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    </div>

                                    {/* Actions */}
                                    <div className="flex flex-wrap items-center gap-3 pt-4 border-t border-[#F0F2F2]">
                                        {['PENDING', 'PROCESSING', 'SHIPPED', 'DELIVERED'].includes(order.status) && (
                                            <Btn onClick={() => handleUpdateStatus('RECEIVED')} loading={updating} className="w-full sm:w-auto px-10">Confirm Delivery</Btn>
                                        )}
                                        {['PENDING', 'ORDERED'].includes(order.status) && (
                                            <Btn variant="secondary" onClick={() => setShowCancelConfirm(true)} disabled={updating}>Request Cancellation</Btn>
                                        )}
                                        {order.status === 'CANCELLED' && (
                                            <div className="flex items-center gap-3">
                                                <div className="flex items-center gap-2 px-4 py-1.5 bg-red-50 text-red-700 border border-red-200 rounded-md text-[13px] font-bold">
                                                    <AlertCircle size={14} /> Order Cancelled
                                                </div>
                                                <a href={`tel:${order.supplier_phone}`} className="h-[31px] px-4 rounded-[8px] text-[13px] font-bold border border-[#D5D9D9] bg-white hover:bg-[#f7f8fa] flex items-center justify-center gap-2 shadow-sm">
                                                    Contact Supplier: {order.supplier_phone || 'N/A'}
                                                </a>
                                            </div>
                                        )}
                                    </div>
                                </div>

                                <div className="bg-white border border-[#D5D9D9] rounded-[8px] p-6 shadow-sm">
                                    <h3 className="text-[17px] font-bold text-[#111] mb-5">Shipment Details</h3>
                                    <div className="space-y-4">
                                        {order.items?.map((item: any) => (
                                            <div key={item.id} className="flex gap-4 p-4 border border-[#F0F2F2] rounded-[8px] hover:bg-[#F7F8FA] transition-colors group">
                                                <div className="w-16 h-16 bg-[#F0F2F2] rounded-[4px] flex items-center justify-center shrink-0">
                                                    <Box size={32} className="text-[#888] opacity-50 group-hover:scale-110 transition-transform" />
                                                </div>
                                                <div className="flex-1">
                                                    <div className="flex justify-between">
                                                        <p className="text-[14px] font-bold text-[#007185] hover:text-[#c45500] cursor-pointer leading-tight">{item.product_name}</p>
                                                        <p className="text-[14px] font-bold text-[#111]">{formatCurrency(item.subtotal || item.total_price || (item.price * item.quantity))}</p>
                                                    </div>
                                                    <div className="flex items-center gap-3 mt-1 text-[12px] text-[#565959] font-medium">
                                                        <span>Qty: <b className="text-[#111]">{item.quantity}</b></span>
                                                        <span className="w-1 h-1 bg-[#D5D9D9] rounded-full" />
                                                        <span>{item.packaging_type || 'SINGLE'} PACK</span>
                                                    </div>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            </div>

                            {/* Right: Sidebar Info */}
                            <div className="space-y-6">
                                
                                {/* Info Box */}
                                <div className="bg-white border border-[#D5D9D9] rounded-[8px] shadow-sm overflow-hidden">
                                     <div className="bg-[#F0F2F2] px-5 py-3 border-b border-[#D5D9D9]">
                                        <h3 className="text-[14px] font-bold text-[#111]">Shipment Summary</h3>
                                     </div>
                                     <div className="p-5 space-y-6">
                                        <div className="space-y-1">
                                            <p className="text-[12px] text-[#565959] font-bold uppercase tracking-wider">Purchase Order Number</p>
                                            <p className="text-[14px] font-bold text-[#111]">{order.purchase_number}</p>
                                        </div>
                                        <div className="space-y-1 text-left">
                                            <p className="text-[12px] text-[#565959] font-bold uppercase tracking-wider">Storage Warehouse</p>
                                            <p className="text-[14px] font-medium text-[#111] leading-relaxed">
                                                Al-Qavi Central Warehouse<br />
                                                {order.warehouse_name || 'Main Registry'}<br />
                                                <span className="text-[12px] text-[#007185] cursor-pointer hover:underline flex items-center gap-1 mt-1 font-bold">See Location <ExternalLink size={12} /></span>
                                            </p>
                                        </div>
                                        <div className="space-y-1 text-left border-t border-[#F0F2F2] pt-4">
                                            <p className="text-[12px] text-[#565959] font-bold uppercase tracking-wider">Supplier Source</p>
                                            <p className="text-[14px] font-bold text-[#111]">{order.supplier_name || 'Verified Supplier'}</p>
                                            <Link href={`/admin/suppliers?id=${order.supplier}`} className="text-[13px] text-[#007185] hover:text-[#c45500] hover:underline block font-medium">View Supplier Profile</Link>
                                        </div>
                                     </div>
                                </div>

                                {/* Security Info */}
                                <div className="bg-[#FDF8E1] border border-[#F5D8A4] rounded-[8px] p-5 flex gap-3 text-left">
                                    <ShieldCheck className="shrink-0 text-[#c45500]" size={20} />
                                    <div>
                                        <p className="text-[13px] font-bold text-[#111]">Secured Shipment</p>
                                        <p className="text-[12px] text-[#565959] mt-1 leading-normal">Your shipment is synchronized with the distributor inventory records for total accuracy.</p>
                                    </div>
                                </div>

                            </div>

                        </div>
                    </div>
                ) : !loading && (
                    <div className="animate-in zoom-in duration-500 flex flex-col items-center justify-center py-32 border-2 border-dashed border-[#D5D9D9] rounded-[16px] bg-[#F7F8FA]">
                        <div className="relative mb-6">
                            <Box size={80} className="text-[#D5D9D9]" />
                            <Search size={32} className="absolute -bottom-2 -right-2 text-[#e77600] bg-white rounded-full p-1.5 shadow-md" />
                        </div>
                        <h2 className="text-[20px] font-bold text-[#111]">Where is your shipment?</h2>
                        <p className="text-[14px] text-[#565959] mt-2 mb-8 text-center max-w-sm">Enter the Purchase Order number or Tracking ID above to see real-time shipment status.</p>
                        <div className="flex gap-4">
                            <Btn variant="secondary" onClick={() => router.push('/admin/purchases')}>View All Purchases</Btn>
                        </div>
                    </div>
                )}
            </div>

            {/* Cancel Modal (Amazon Style Overlay) */}
            {showCancelConfirm && (
                <div className="fixed inset-0 z-[600] flex items-center justify-center bg-[#000000cc] p-4 backdrop-blur-sm animate-in fade-in duration-300">
                    <div className="bg-white rounded-[8px] p-8 w-full max-w-md text-center shadow-2xl relative animate-in zoom-in duration-300">
                        <Btn variant="secondary" onClick={() => setShowCancelConfirm(false)} className="absolute top-4 right-4 rounded-full w-8 h-8 p-0">×</Btn>
                        <div className="w-16 h-16 bg-red-50 rounded-full flex items-center justify-center mx-auto mb-6 text-red-600 border border-red-100 shadow-inner">
                            <AlertCircle size={32} />
                        </div>
                        <h3 className="text-[22px] font-bold text-[#111]">Request Cancellation?</h3>
                        <p className="text-[14px] text-[#565959] mt-3 leading-relaxed">Are you sure you want to cancel <span className="font-bold text-[#111]">PO #{order.purchase_number}</span>? This shipment registry will be voided.</p>
                        <div className="mt-10 flex gap-3">
                            <Btn variant="secondary" onClick={() => setShowCancelConfirm(false)} className="flex-1 h-[40px] font-bold text-[14px]">Keep Order</Btn>
                            <Btn variant="danger" onClick={() => { setShowCancelConfirm(false); handleUpdateStatus('CANCELLED'); }} className="flex-1 h-[40px] font-bold text-[14px] border-red-200">
                                Cancel Order
                            </Btn>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
