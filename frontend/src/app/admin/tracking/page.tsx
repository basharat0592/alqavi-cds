"use client";

import { useState, useEffect, useCallback } from 'react';
import {
    Search, Package, Truck, CheckCircle2, AlertCircle, MapPin,
    ShoppingBag, Clock, RefreshCw, Loader2, ChevronRight,
    ChevronLeft, ShieldCheck, Box, MoreVertical, ExternalLink,
    Store, Info
} from 'lucide-react';
import { useRouter, useSearchParams } from 'next/navigation';
import api from '@/lib/axios';
import { formatCurrency, formatDate } from '@/lib/utils';
import Link from 'next/link';
import toast from 'react-hot-toast';
import { PageHeader, Card, Button, Modal, ui } from '@/components/admin/ui';

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
    }, []);

    useEffect(() => {
        const q = searchParams.get('q');
        if (q) { setQuery(q); handleSearch(q); }
    }, [searchParams, handleSearch]);

    // AUTO-SYNC (2s)
    useEffect(() => {
        if (!order || loading || updating) return;
        const interval = setInterval(() => {
            handleSearch(order.purchase_number, true);
        }, 2000);
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
        <div className="text-left">
            <div className="max-w-[1100px] mx-auto">

                <PageHeader
                    title="Purchase Order Tracking"
                    subtitle="Look up a purchase order by its number to view and update its status."
                    breadcrumbs={[
                        { label: 'Console', href: '/admin/dashboard' },
                        { label: 'Purchases', href: '/admin/purchases' },
                        { label: 'Purchase Order Tracking' },
                    ]}
                    actions={
                        <Button variant="secondary" size="sm" onClick={() => query && handleSearch(query)} disabled={loading}>
                            <RefreshCw size={14} className={loading ? 'animate-spin' : ''} /> Sync
                        </Button>
                    }
                />

                {/* ── Tracking Search ── */}
                <Card className="p-5 mb-8 animate-in slide-in-from-top-2 duration-500">
                    <form onSubmit={onSearchSubmit} className="flex gap-3 max-w-2xl">
                        <div className="relative flex-1">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                            <input
                                value={query}
                                onChange={e => setQuery(e.target.value)}
                                placeholder="Enter PO Number or Tracking ID..."
                                className={`${ui.inputBase} pl-10`}
                            />
                        </div>
                        <Button type="submit" disabled={loading} className="w-[120px]">
                            {loading && <RefreshCw className="h-3.5 w-3.5 animate-spin" />}
                            Track
                        </Button>
                    </form>
                    {error && (
                        <div className="mt-3 flex items-center gap-2 text-rose-600 bg-rose-50 p-2.5 rounded-lg text-[13px] border border-rose-100 animate-in fade-in">
                            <AlertCircle size={14} /> {error}
                        </div>
                    )}
                </Card>

                {order ? (
                    <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 animate-in fade-in duration-700">

                        {/* ── Main View (8 Columns) ── */}
                        <div className="lg:col-span-8 space-y-6">

                            {/* Tracker Card */}
                            <Card className="overflow-hidden">
                                <div className="bg-slate-50/60 px-6 py-4 border-b border-slate-100 flex items-center justify-between">
                                    <div>
                                        <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1">Current Status</p>
                                        <h2 className="text-[18px] font-bold text-slate-900 tracking-tight">
                                            {order.status === 'RECEIVED' ? 'Package Received' :
                                             order.status === 'CANCELLED' ? 'Order Cancelled' :
                                             order.purchase_number}
                                        </h2>
                                    </div>
                                    <div className="text-right">
                                        <p className="text-[11px] font-bold text-slate-400 uppercase">Last Update</p>
                                        <p className="text-[14px] font-bold text-[#0E8CA8]">{formatDate(order.updated_at)}</p>
                                    </div>
                                </div>
                                <div className="p-10 pb-16">
                                    <div className="relative">
                                        {/* Progress Line */}
                                        <div className="absolute top-1/2 left-0 right-0 h-1 bg-slate-100 -translate-y-1/2 rounded-full" />
                                        {currentStepIndex >= 0 && order.status !== 'CANCELLED' && (
                                            <div
                                                className="absolute top-1/2 left-0 h-1 bg-[#13B0D1] -translate-y-1/2 rounded-full transition-all duration-1000 ease-out"
                                                style={{ width: `${(currentStepIndex / (STEPS.length - 1)) * 100}%` }}
                                            />
                                        )}

                                        <div className="relative flex justify-between">
                                            {STEPS.map((step, idx) => {
                                                const isCompleted = order.status !== 'CANCELLED' && idx <= currentStepIndex;
                                                const isCurrent = order.status !== 'CANCELLED' && idx === currentStepIndex;
                                                const StepIcon = step.icon;

                                                return (
                                                    <div key={idx} className="flex flex-col items-center group">
                                                        <div className={`w-8 h-8 rounded-full border flex items-center justify-center bg-white z-10 transition-all duration-500
                                                            ${isCompleted ? 'border-[#13B0D1] text-[#0E8CA8] ring-4 ring-[#13B0D1]/10' : 'border-slate-200 text-slate-400'}`}>
                                                            {isCompleted ? <CheckCircle2 size={16} fill="currentColor" className="text-white bg-[#13B0D1] rounded-full" /> : <StepIcon size={14} />}
                                                        </div>
                                                        <div className="absolute top-10 flex flex-col items-center">
                                                            <p className={`text-[10px] font-bold uppercase tracking-tight whitespace-nowrap ${isCompleted ? 'text-[#0E8CA8]' : 'text-slate-400'}`}>
                                                                {step.label}
                                                            </p>
                                                            {isCurrent && <span className="w-1.5 h-1.5 bg-[#13B0D1] rounded-full mt-1.5 animate-ping" />}
                                                        </div>
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    </div>
                                </div>

                                <div className="bg-slate-50/40 px-6 py-4 border-t border-slate-100 flex items-center gap-3">
                                    <Info size={16} className="text-sky-600" />
                                    <p className="text-[12px] text-slate-600">
                                        {order.status === 'SHIPPED' ? 'Your package is on its way.' :
                                         order.status === 'PENDING' ? 'Waiting for supplier to confirm.' :
                                         'Status is up to date.'}
                                    </p>
                                </div>
                            </Card>

                            {/* Shipment Contents Card */}
                            <Card className="overflow-hidden">
                                <div className="bg-slate-50/60 px-6 py-3 border-b border-slate-100">
                                    <h3 className="text-[14px] font-bold text-slate-900 tracking-tight">Items in Order</h3>
                                </div>
                                <div className="divide-y divide-slate-100">
                                    {order.items?.map((item: any) => (
                                        <div key={item.id} className="p-5 flex items-center justify-between hover:bg-slate-50 transition-colors">
                                            <div className="flex gap-4 items-center">
                                                <div className="w-12 h-12 bg-slate-50 border border-slate-200/70 rounded-lg flex items-center justify-center shrink-0">
                                                    <Box size={24} className="text-slate-300" />
                                                </div>
                                                <div>
                                                    <p className="text-[13px] font-bold text-slate-800 hover:text-[#0A6F85] cursor-pointer">{item.product_name}</p>
                                                    <p className="text-[11px] text-slate-500 mt-0.5">Quantity: <span className="font-bold text-slate-900">{item.quantity} units</span></p>
                                                </div>
                                            </div>
                                            <div className="text-right">
                                                <p className="text-[13px] font-bold text-slate-900 tabular-nums">{formatCurrency(item.subtotal || (item.price * item.quantity))}</p>
                                                <p className="text-[11px] text-slate-400 font-medium">SKU: {item.product_code || 'N/A'}</p>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                                <div className="p-5 bg-slate-50/60 border-t border-slate-100 flex justify-between items-center font-bold">
                                    <span className="text-[13px] text-slate-500 uppercase tracking-wider">Total Price</span>
                                    <span className="text-[17px] text-slate-900 tabular-nums">{formatCurrency(order.total_amount)}</span>
                                </div>
                            </Card>
                        </div>

                        {/* ── Sidebar (4 Columns) ── */}
                        <div className="lg:col-span-4 space-y-6">

                            {/* Management Actions */}
                            <Card className="p-5 space-y-4">
                                <h3 className="text-[14px] font-bold text-slate-900 tracking-tight border-b border-slate-100 pb-2">Admin Controls</h3>
                                <div className="space-y-3">
                                    {['PENDING', 'PROCESSING', 'SHIPPED', 'DELIVERED'].includes(order.status) && (
                                        <Button onClick={() => handleUpdateStatus('RECEIVED')} disabled={updating} className="w-full">
                                            {updating && <RefreshCw className="h-3.5 w-3.5 animate-spin" />}
                                            Mark as Received
                                        </Button>
                                    )}
                                    <Button variant="outline" className="w-full" onClick={() => router.push(`/admin/purchases?id=${order.id}`)}>Edit Order</Button>
                                    {['PENDING', 'ORDERED', 'PROCESSING'].includes(order.status) && (
                                        <Button variant="danger" className="w-full mt-4" onClick={() => setShowCancelConfirm(true)}>Cancel Order</Button>
                                    )}
                                </div>
                            </Card>

                            {/* Shipping Details */}
                            <Card className="overflow-hidden">
                                <div className="bg-slate-50/60 px-5 py-3 border-b border-slate-100">
                                    <h3 className="text-[14px] font-bold text-slate-900 tracking-tight">Shipping Info</h3>
                                </div>
                                <div className="p-5 space-y-5 text-left">
                                    <div>
                                        <label className="text-[11px] font-bold text-slate-400 uppercase tracking-widest block mb-1">Supplier</label>
                                        <p className="text-[14px] font-bold text-slate-800 hover:text-[#0A6F85] cursor-pointer">{order.supplier_name || 'Partner'}</p>
                                        <p className="text-[12px] text-slate-400 mt-0.5">{order.supplier_phone || 'No phone'}</p>
                                    </div>
                                    <div>
                                        <label className="text-[11px] font-bold text-slate-400 uppercase tracking-widest block mb-1">Warehouse</label>
                                        <p className="text-[14px] font-bold text-slate-900">{order.warehouse_name || 'Main Center'}</p>
                                        <div className="flex items-center gap-1.5 mt-2 text-[#0E8CA8] hover:text-[#0A6F85] cursor-pointer text-[12px] font-bold">
                                            <MapPin size={12} /> Show Location <ExternalLink size={12} />
                                        </div>
                                    </div>
                                </div>
                            </Card>

                            {/* Secure Certification */}
                            <div className="bg-[#13B0D1]/10 border border-[#13B0D1]/15 rounded-2xl p-4 flex gap-3 text-left">
                                <ShieldCheck className="h-5 w-5 text-[#0E8CA8] shrink-0" />
                                <div>
                                    <p className="text-[12px] font-bold text-[#0E8CA8]">Audit Certified</p>
                                    <p className="text-[11px] text-[#0E8CA8]/80 mt-1 leading-relaxed">This record is end-to-end encrypted and synced with financial ledgers.</p>
                                </div>
                            </div>

                        </div>

                    </div>
                ) : !loading && (
                    <Card className="py-32 flex flex-col items-center justify-center animate-in zoom-in-95 duration-500">
                        <div className="relative mb-6">
                            <Box size={80} className="text-slate-100" />
                            <Search size={32} className="absolute -bottom-2 -right-2 text-[#0E8CA8] bg-white rounded-full p-2 shadow-sm border border-slate-200/70" />
                        </div>
                        <h2 className="text-[20px] font-bold text-slate-900 tracking-tight">Where is your shipment?</h2>
                        <p className="text-[13px] text-slate-600 mt-2 mb-8 text-center max-w-sm">Enter a Purchase Order number to access the live tracking portal.</p>
                        <div className="flex gap-3">
                            <Button variant="outline" onClick={() => router.push('/admin/purchases')}>Browse Catalog</Button>
                            <Button variant="outline" onClick={() => router.push('/admin/dashboard')}>Return Home</Button>
                        </div>
                    </Card>
                )}
            </div>

            {/* Void Confirmation Modal */}
            <Modal
                open={showCancelConfirm}
                onClose={() => setShowCancelConfirm(false)}
                title="Cancel Order?"
                footer={
                    <>
                        <Button variant="outline" onClick={() => setShowCancelConfirm(false)} className="w-[100px]">Keep it</Button>
                        <Button variant="danger" onClick={() => { setShowCancelConfirm(false); handleUpdateStatus('CANCELLED'); }} className="w-[140px]">Cancel now</Button>
                    </>
                }
            >
                <div className="text-center py-3">
                    <div className="w-16 h-16 bg-rose-50 rounded-full flex items-center justify-center mx-auto mb-6 text-rose-600 border border-rose-100">
                        <AlertCircle size={32} />
                    </div>
                    <p className="text-[14px] text-slate-600 leading-relaxed">Are you sure you want to cancel <span className="font-bold text-slate-900">PO #{order?.purchase_number}</span>? This will undo all items added to your list.</p>
                </div>
            </Modal>
        </div>
    );
}
