"use client";

import { useState, useEffect, useCallback } from 'react';
import { 
    Search, Package, Truck, CheckCircle2, AlertCircle, MapPin, 
    ShoppingBag, Clock, ArrowLeft, RefreshCw, Loader2, ChevronRight, 
    ChevronLeft, ShieldCheck, Box, MoreVertical, ExternalLink,
    Store, Info
} from 'lucide-react';
import { useRouter, useSearchParams } from 'next/navigation';
import api from '@/lib/axios';
import { formatCurrency, formatDate } from '@/lib/utils';
import Link from 'next/link';
import toast from 'react-hot-toast';

/* ─────────────────────────────────────────────────────────────────────────────
   PURE AMAZON RETAIL DESIGN SYSTEM - TRACKING MODULE
   ───────────────────────────────────────────────────────────────────────────── */
const Btn = ({ children, onClick, loading, variant = 'primary', className = '', type = 'button', disabled = false }: any) => {
    const styles = {
        primary: 'bg-gradient-to-b from-[#f7dfa5] to-[#f0c14b] border-[#a88734] hover:from-[#f5d78e] hover:to-[#eeb933] text-[#0f1111] shadow-sm',
        secondary: 'bg-gradient-to-b from-[#f7f8fa] to-[#e7e9ec] border-[#adb1b8] hover:from-[#eef1f3] hover:to-[#dce0e4] text-[#0f1111] shadow-sm',
        danger: 'bg-gradient-to-b from-white to-red-50 border-red-200 text-red-700 hover:to-red-100 shadow-sm'
    };
    return (
        <button type={type} onClick={onClick} disabled={loading || disabled}
            className={`h-[29px] px-4 rounded-[3px] text-[13px] font-medium border transition-all flex items-center justify-center gap-2 disabled:opacity-60 active:scale-[0.98] ${styles[variant as keyof typeof styles]} ${className}`}>
            {loading && <RefreshCw className="h-3 w-3 animate-spin" />}
            {children}
        </button>
    );
};

const AmazonInput = ({ ...props }: React.InputHTMLAttributes<HTMLInputElement>) => (
    <input
        {...props}
        className="w-full h-[35px] pl-10 pr-4 border border-[#888c8e] rounded-[3px] text-[13px] outline-none focus:border-[#e77600] focus:shadow-[0_0_3px_2px_rgba(228,121,17,0.5)] transition-all font-medium placeholder:text-[#888]"
    />
);

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
        <div className="bg-[#F8F9FA] min-h-screen pb-20 font-sans text-[#0f1111]">
            
            <div className="max-w-[1100px] mx-auto px-6 pt-5 text-left">
                
                {/* ── Breadcrumb ── */}
                <div className="flex items-center gap-1 text-[12px] text-[#565959] mb-2">
                    <Link href="/admin/dashboard" className="hover:text-[#c45500] hover:underline">Dashboard</Link>
                    <ChevronRight size={10} />
                    <Link href="/admin/purchases" className="hover:text-[#c45500] hover:underline">Purchases</Link>
                    <ChevronRight size={10} />
                    <span className="text-[#c45500]">Tracking</span>
                </div>

                <div className="flex items-center justify-between mb-4">
                    <h1 className="text-[22px] font-normal">Shipment Tracking</h1>
                    <div className="flex gap-2">
                        <Btn variant="secondary" onClick={() => router.back()}>
                            <ArrowLeft size={14} /> Back
                        </Btn>
                        <Btn variant="secondary" onClick={() => query && handleSearch(query)} loading={loading}>
                            <RefreshCw size={14} className={loading ? 'animate-spin' : ''} /> Sync
                        </Btn>
                    </div>
                </div>
                <div className="border-b border-[#ddd] mb-6" />

                {/* ── Tracking Search ── */}
                <div className="bg-white border border-[#ddd] rounded-[4px] p-5 mb-8 shadow-sm animate-in slide-in-from-top-2 duration-500">
                    <form onSubmit={onSearchSubmit} className="flex gap-3 max-w-2xl">
                        <div className="relative flex-1">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[#aaa]" />
                            <AmazonInput 
                                value={query} 
                                onChange={e => setQuery(e.target.value)} 
                                placeholder="Enter PO Number or Tracking ID..." 
                            />
                        </div>
                        <Btn type="submit" loading={loading} className="w-[120px] font-bold">Track</Btn>
                    </form>
                    {error && (
                        <div className="mt-3 flex items-center gap-2 text-red-600 bg-red-50 p-2 rounded text-[13px] border border-red-100 italic animate-in fade-in">
                            <AlertCircle size={14} /> {error}
                        </div>
                    )}
                </div>

                {order ? (
                    <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 animate-in fade-in duration-700">
                        
                        {/* ── Main View (8 Columns) ── */}
                        <div className="lg:col-span-8 space-y-6">
                            
                            {/* Tracker Card */}
                            <div className="bg-white border border-[#ddd] rounded-[4px] shadow-sm overflow-hidden">
                                <div className="bg-[#f7f8fa] px-6 py-4 border-b border-[#ddd] flex items-center justify-between">
                                    <div>
                                        <p className="text-[12px] font-bold text-[#565959] uppercase tracking-wider mb-1">Current Status</p>
                                        <h2 className="text-[18px] font-bold text-[#111]">
                                            {order.status === 'RECEIVED' ? 'Package Received' : 
                                             order.status === 'CANCELLED' ? 'Order Cancelled' : 
                                             order.purchase_number}
                                        </h2>
                                    </div>
                                    <div className="text-right">
                                        <p className="text-[12px] font-bold text-[#565959] uppercase">Last Update</p>
                                        <p className="text-[14px] font-bold text-[#c45500]">{formatDate(order.updated_at)}</p>
                                    </div>
                                </div>
                                <div className="p-10 pb-16">
                                    <div className="relative">
                                        {/* Progress Line */}
                                        <div className="absolute top-1/2 left-0 right-0 h-1 bg-[#F0F2F2] -translate-y-1/2 rounded-full" />
                                        {currentStepIndex >= 0 && order.status !== 'CANCELLED' && (
                                            <div 
                                                className="absolute top-1/2 left-0 h-1 bg-[#007600] -translate-y-1/2 rounded-full transition-all duration-1000 ease-out" 
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
                                                            ${isCompleted ? 'border-[#007600] text-[#007600] ring-4 ring-[#007600]/10' : 'border-[#ddd] text-[#aaa]'}`}>
                                                            {isCompleted ? <CheckCircle2 size={16} fill="currentColor" className="text-white bg-[#007600] rounded-full" /> : <StepIcon size={14} />}
                                                        </div>
                                                        <div className="absolute top-10 flex flex-col items-center">
                                                            <p className={`text-[10px] font-bold uppercase tracking-tight whitespace-nowrap ${isCompleted ? 'text-[#007600]' : 'text-[#888]'}`}>
                                                                {step.label}
                                                            </p>
                                                            {isCurrent && <span className="w-1.5 h-1.5 bg-[#c45500] rounded-full mt-1.5 animate-ping" />}
                                                        </div>
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    </div>
                                </div>
                                
                                <div className="bg-[#fcfdfd] px-6 py-4 border-t border-[#eee] flex items-center gap-3">
                                    <Info size={16} className="text-[#007185]" />
                                    <p className="text-[12px] text-[#565959]">
                                        {order.status === 'SHIPPED' ? 'Your package is on its way.' : 
                                         order.status === 'PENDING' ? 'Waiting for supplier to confirm.' : 
                                         'Status is up to date.'}
                                    </p>
                                </div>
                            </div>

                            {/* Shipment Contents Card */}
                            <div className="bg-white border border-[#ddd] rounded-[4px] shadow-sm">
                                <div className="bg-[#f7f8fa] px-6 py-3 border-b border-[#ddd]">
                                    <h3 className="text-[14px] font-bold text-[#111]">Items in Order</h3>
                                </div>
                                <div className="divide-y divide-[#eee]">
                                    {order.items?.map((item: any) => (
                                        <div key={item.id} className="p-5 flex items-center justify-between hover:bg-[#fcfdff] transition-colors">
                                            <div className="flex gap-4 items-center">
                                                <div className="w-12 h-12 bg-[#F8F9FA] border border-[#eee] rounded-[3px] flex items-center justify-center shrink-0">
                                                    <Box size={24} className="text-slate-300" />
                                                </div>
                                                <div>
                                                    <p className="text-[13px] font-bold text-[#007185] hover:text-[#c45500] hover:underline cursor-pointer">{item.product_name}</p>
                                                    <p className="text-[11px] text-[#565959] mt-0.5">Quantity: <span className="font-bold text-[#111]">{item.quantity} units</span></p>
                                                </div>
                                            </div>
                                            <div className="text-right">
                                                <p className="text-[13px] font-bold text-[#B12704]">{formatCurrency(item.subtotal || (item.price * item.quantity))}</p>
                                                <p className="text-[11px] text-slate-400 font-medium">SKU: {item.product_code || 'N/A'}</p>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                                <div className="p-5 bg-slate-50/50 border-t border-[#eee] flex justify-between items-center font-bold">
                                    <span className="text-[13px] text-[#565959] uppercase tracking-wider">Total Price</span>
                                    <span className="text-[17px] text-[#B12704]">{formatCurrency(order.total_amount)}</span>
                                </div>
                            </div>
                        </div>

                        {/* ── Sidebar (4 Columns) ── */}
                        <div className="lg:col-span-4 space-y-6">
                            
                            {/* Management Actions */}
                            <div className="bg-white border border-[#ddd] rounded-[4px] p-5 shadow-sm space-y-4">
                                <h3 className="text-[14px] font-bold text-[#111] border-b border-[#eee] pb-2">Admin Controls</h3>
                                <div className="space-y-3">
                                    {['PENDING', 'PROCESSING', 'SHIPPED', 'DELIVERED'].includes(order.status) && (
                                        <Btn onClick={() => handleUpdateStatus('RECEIVED')} loading={updating} className="w-full h-[35px] font-bold">Mark as Received</Btn>
                                    )}
                                    <Btn variant="secondary" className="w-full h-[35px] font-medium" onClick={() => router.push(`/admin/purchases?id=${order.id}`)}>Edit Order</Btn>
                                    {['PENDING', 'ORDERED', 'PROCESSING'].includes(order.status) && (
                                        <Btn variant="danger" className="w-full h-[35px] font-medium mt-4" onClick={() => setShowCancelConfirm(true)}>Cancel Order</Btn>
                                    )}
                                </div>
                            </div>

                            {/* Shipping Details */}
                            <div className="bg-white border border-[#ddd] rounded-[4px] shadow-sm overflow-hidden">
                                <div className="bg-[#f7f8fa] px-5 py-3 border-b border-[#ddd]">
                                    <h3 className="text-[14px] font-bold text-[#111]">Shipping Info</h3>
                                </div>
                                <div className="p-5 space-y-5 text-left">
                                    <div>
                                        <label className="text-[11px] font-bold text-[#565959] uppercase tracking-widest block mb-1">Supplier</label>
                                        <p className="text-[14px] font-bold text-[#007185] hover:underline cursor-pointer">{order.supplier_name || 'Partner'}</p>
                                        <p className="text-[12px] text-[#888] mt-0.5">{order.supplier_phone || 'No phone'}</p>
                                    </div>
                                    <div>
                                        <label className="text-[11px] font-bold text-[#565959] uppercase tracking-widest block mb-1">Warehouse</label>
                                        <p className="text-[14px] font-bold text-[#111]">{order.warehouse_name || 'Main Center'}</p>
                                        <div className="flex items-center gap-1.5 mt-2 text-[#007185] hover:text-[#c45500] cursor-pointer text-[12px] font-bold">
                                            <MapPin size={12} /> Show Location <ExternalLink size={12} />
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Secure Certification */}
                            <div className="bg-[#fcf8e3] border border-[#faebcc] rounded-[4px] p-4 flex gap-3 text-left">
                                <ShieldCheck className="h-5 w-5 text-[#8a6d3b] shrink-0" />
                                <div>
                                    <p className="text-[12px] font-bold text-[#8a6d3b]">Audit Certified</p>
                                    <p className="text-[11px] text-[#8a6d3b]/80 mt-1 leading-relaxed">This record is end-to-end encrypted and synced with financial ledgers.</p>
                                </div>
                            </div>

                        </div>

                    </div>
                ) : !loading && (
                    <div className="bg-white border border-[#ddd] rounded-[4px] py-32 flex flex-col items-center justify-center animate-in zoom-in-95 duration-500 shadow-sm">
                        <div className="relative mb-6">
                            <Box size={80} className="text-[#f1f1f1]" />
                            <Search size={32} className="absolute -bottom-2 -right-2 text-[#e77600] bg-white rounded-full p-2 shadow-sm border border-[#eee]" />
                        </div>
                        <h2 className="text-[20px] font-normal text-[#111]">Where is your shipment?</h2>
                        <p className="text-[13px] text-[#565959] mt-2 mb-8 text-center max-w-sm">Enter a Purchase Order number to access the live tracking portal.</p>
                        <div className="flex gap-3">
                            <Btn variant="secondary" onClick={() => router.push('/admin/purchases')}>Browse Catalog</Btn>
                            <Btn variant="secondary" onClick={() => router.push('/admin/dashboard')}>Return Home</Btn>
                        </div>
                    </div>
                )}
            </div>

            {/* Void Confirmation Modal */}
            {showCancelConfirm && (
                <div className="fixed inset-0 z-[1000] flex items-center justify-center p-4 bg-black/60 backdrop-blur-[2px] animate-in fade-in duration-200">
                    <div className="bg-white rounded-[4px] w-full max-w-md border border-[#ddd] shadow-2xl animate-in zoom-in-95 duration-300 overflow-hidden">
                        <div className="bg-[#f7f8fa] border-b border-[#ddd] px-6 py-4 flex items-center justify-between">
                            <h2 className="text-[16px] font-bold text-[#111]">Cancel Order?</h2>
                            <button onClick={() => setShowCancelConfirm(false)} className="text-[#565959] hover:text-[#111] transition-colors"><ChevronLeft className="rotate-90" /></button>
                        </div>
                        <div className="p-8 text-center">
                            <div className="w-16 h-16 bg-red-50 rounded-full flex items-center justify-center mx-auto mb-6 text-red-600 border border-red-100 shadow-inner">
                                <AlertCircle size={32} />
                            </div>
                            <p className="text-[14px] text-[#565959] leading-relaxed">Are you sure you want to cancel <span className="font-bold text-[#111]">PO #{order.purchase_number}</span>? This will undo all items added to your list.</p>
                        </div>
                        <div className="bg-[#f7f8fa] border-t border-[#ddd] p-6 flex justify-end gap-3">
                            <Btn variant="secondary" onClick={() => setShowCancelConfirm(false)} className="w-[100px]">Keep it</Btn>
                            <Btn variant="danger" onClick={() => { setShowCancelConfirm(false); handleUpdateStatus('CANCELLED'); }} className="w-[140px] font-bold">Cancel now</Btn>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
