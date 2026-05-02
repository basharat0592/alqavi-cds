'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import {
    TrendingUp, Loader2, Search, Eye, Trash2, RefreshCw, X, AlertTriangle,
    CreditCard, Receipt, CheckCircle2, ChevronRight, Check, X as XIcon, 
    ShieldCheck, Calendar, History, Download, Filter, Printer, Clock, Activity
} from 'lucide-react';
import api from '@/lib/axios';
import { purchaseService } from '@/services/purchase.service';
import toast from 'react-hot-toast';

// ── PURE AMAZON DESIGN TOKENS ────────────────────────────────────────────────
const fmt = (n: number) =>
    new Intl.NumberFormat('en-PK', { 
        style: 'currency', 
        currency: 'PKR', 
        maximumFractionDigits: 0 
    }).format(n).replace('PKR', 'Rs.');

const formatDateTime = (d: string) => {
    const date = new Date(d);
    return {
        date: date.toLocaleDateString('en-PK', { day: '2-digit', month: 'short', year: 'numeric' }),
        time: date.toLocaleTimeString('en-PK', { hour: '2-digit', minute: '2-digit', hour12: true })
    };
};

// ── UI COMPONENTS ────────────────────────────────────────────────────────────
const KPICard = ({ label, value, icon: Icon, colorClass }: any) => (
    <div className="bg-white border border-[#d5d9d9] p-5 rounded-[4px] shadow-sm hover:shadow-md transition-shadow">
        <div className="flex justify-between items-start">
            <div className="space-y-1">
                <span className="block text-[11px] font-bold text-[#565959] uppercase tracking-[0.05em]">{label}</span>
                <span className={`text-[20px] font-bold tracking-tight ${colorClass}`}>{value}</span>
            </div>
            <div className="text-[#d5d9d9] pt-1">
                <Icon size={18} />
            </div>
        </div>
    </div>
);

const Badge = ({ children, variant = 'default' }: any) => {
    const variants = {
        default: 'bg-white text-[#565959] border-[#d5d9d9]',
        wholesale: 'bg-[#e7f4f5] text-[#007185] border-[#007185]/20 font-bold',
        retail: 'bg-[#f0f2f2] text-[#565959] border-[#d5d9d9]',
        paid: 'bg-[#e7f4f5] text-[#007185] border-[#007185]/30 font-bold',
        pending: 'bg-white text-[#c45500] border-[#c45500]/30',
        unpaid: 'bg-[#fdf0f0] text-[#b12704] border-[#b12704]/30',
        partial: 'bg-white text-[#111] border-[#d5d9d9] font-bold',
    };
    return (
        <span className={`text-[10px] uppercase px-2 py-0.5 rounded-[2px] border ${variants[variant as keyof typeof variants]}`}>
            {children}
        </span>
    );
};

// ── DETAIL MODAL ──
const OrderDetailModal = ({ order, onClose }: { order: any, onClose: () => void }) => {
    if (!order) return null;
    const { date, time } = formatDateTime(order.created_at);

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
            <div className="bg-white w-full max-w-2xl rounded-[8px] shadow-2xl overflow-hidden border border-[#d5d9d9] animate-in zoom-in-95 duration-200">
                {/* Modal Header */}
                <div className="px-6 py-3 bg-[#f0f2f2] border-b border-[#d5d9d9] flex justify-between items-center">
                    <h3 className="text-[15px] font-bold text-[#111]">Order Details</h3>
                    <button onClick={onClose} className="p-1 hover:bg-white rounded-sm border border-transparent hover:border-[#d5d9d9] transition-all">
                        <X size={18} className="text-[#565959]" />
                    </button>
                </div>

                {/* Modal Content */}
                <div className="p-8 max-h-[75vh] overflow-y-auto text-left font-sans">
                    <div className="grid grid-cols-2 gap-12 mb-10 pb-8 border-b border-dashed border-[#d5d9d9]">
                        <div className="space-y-6">
                            <div>
                                <label className="block text-[11px] font-bold text-[#565959] uppercase mb-1">Customer / Party</label>
                                <p className="text-[14px] font-bold text-[#111]">{order.customer_name || 'Retail'}</p>
                            </div>
                            <div>
                                <label className="block text-[11px] font-bold text-[#565959] uppercase mb-1">Order #</label>
                                <p className="text-[13px] font-medium text-[#c45500] font-bold">#{order.order_number || order.tracking_id}</p>
                            </div>
                        </div>
                        <div className="space-y-6 text-right">
                            <div>
                                <label className="block text-[11px] font-bold text-[#565959] uppercase mb-1">Status</label>
                                <div className="flex gap-2 justify-end">
                                    <Badge variant={order.payment_status?.toLowerCase() || 'paid'}>{order.payment_status || 'PAID'}</Badge>
                                </div>
                            </div>
                            <div>
                                <label className="block text-[11px] font-bold text-[#565959] uppercase mb-1">Audit Log</label>
                                <p className="text-[13px] font-medium text-[#111]">{date}, {time}</p>
                            </div>
                        </div>
                    </div>

                    {/* Receipt Image */}
                    {order.payment_slip && (
                        <div className="mb-10 p-5 bg-[#fcfcfc] border border-[#d5d9d9] rounded-[4px]">
                            <label className="block text-[11px] font-bold text-[#565959] uppercase mb-3">Evidence of Payment</label>
                            <img src={order.payment_slip} alt="Receipt" className="max-h-[300px] rounded-[2px] border border-[#d5d9d9] mx-auto block shadow-sm" />
                        </div>
                    )}

                    {/* Items Table */}
                    <div className="mb-8">
                        <label className="block text-[11px] font-bold text-[#565959] uppercase mb-3">Line Items</label>
                        <div className="border border-[#d5d9d9] rounded-[4px] overflow-hidden">
                            <table className="w-full text-left text-[13px]">
                                <thead className="bg-[#f0f2f2] border-b border-[#d5d9d9] font-bold text-[#111]">
                                    <tr>
                                        <th className="p-3">Item Descriptor</th>
                                        <th className="p-3 text-center">Quantity</th>
                                        <th className="p-3 text-right">Total Price</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-[#f0f2f2] text-[#111]">
                                    {(order.items || []).map((item: any, idx: number) => (
                                        <tr key={idx}>
                                            <td className="p-3 font-medium">{item.product_name || item.name || 'Product'}</td>
                                            <td className="p-3 text-center">{item.quantity || item.total_units}</td>
                                            <td className="p-3 text-right font-bold">{fmt(parseFloat(item.price || item.unit_price || 0))}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>

                    <div className="flex justify-end pt-6 border-t border-[#d5d9d9]">
                        <div className="text-right">
                            <span className="text-[11px] font-bold text-[#565959] uppercase">Order Total:</span>
                            <p className="text-[22px] font-bold text-[#b12704]">{fmt(parseFloat(order.total_amount))}</p>
                        </div>
                    </div>
                </div>

                <div className="px-6 py-4 bg-[#f0f2f2] border-t border-[#d5d9d9] flex justify-end gap-2">
                    <button onClick={onClose} className="px-5 py-1.5 bg-white border border-[#adb1b8] rounded-[3px] text-[12px] font-medium text-[#111] hover:bg-[#f7fafa] shadow-sm">Dismiss</button>
                    <button onClick={() => window.print()} className="px-5 py-1.5 bg-[#232f3e] text-white rounded-[3px] text-[12px] font-medium hover:bg-[#131921] shadow-md flex items-center gap-2">
                        <Printer size={14} /> Print
                    </button>
                </div>
            </div>
        </div>
    );
};

export default function SupplierFinancialRegistry() {
    const [filter, setFilter] = useState('all');
    const [orders, setOrders] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');
    const [isUpdating, setIsUpdating] = useState(false);
    const [selectedOrder, setSelectedOrder] = useState<any>(null);
    const [viewedOrderIds, setViewedOrderIds] = useState<Set<string>>(new Set());

    const fetchOrders = useCallback(async () => {
        setLoading(true);
        try {
            const [ordersRes, purchasesRes] = await Promise.all([
                api.get('/v1/sales/orders/', { params: { no_pagination: 'true', search: search || undefined } }),
                api.get('/v1/sales/purchases/', { params: { no_pagination: 'true', search: search || undefined } })
            ]);
            const retail = Array.isArray(ordersRes.data) ? ordersRes.data : ordersRes.data.results || [];
            const purchase = Array.isArray(purchasesRes.data) ? purchasesRes.data : purchasesRes.data.results || [];
            const combined = [
                ...retail.map((r: any) => ({ ...r, is_wholesale: false })),
                ...purchase.map((p: any) => ({ ...p, is_wholesale: true, order_number: p.purchase_number, customer_name: 'Distributor Purchase' }))
            ].sort((a, b) => new Date(b.created_at || b.order_date).getTime() - new Date(a.created_at || a.order_date).getTime());
            setOrders(combined);
        } catch (error) { toast.error("Sync error"); } finally { setLoading(false); }
    }, [search]);

    useEffect(() => { fetchOrders(); }, [fetchOrders]);

    const handleOpenView = (order: any) => {
        setViewedOrderIds(prev => new Set(prev).add(String(order.id)));
        setSelectedOrder(order);
    };

    const handleAcceptPayment = async (id: string) => {
        setIsUpdating(true);
        try {
            await purchaseService.acceptPayment(id);
            toast.success("Accepted");
            fetchOrders();
        } catch { toast.error("Error"); } finally { setIsUpdating(false); }
    };

    const handleRejectPayment = async (id: string) => {
        const reason = prompt("Rejection reason:");
        if (!reason) return;
        setIsUpdating(true);
        try {
            await purchaseService.rejectPayment(id, reason);
            toast.success("Rejected");
            fetchOrders();
        } catch { toast.error("Error"); } finally { setIsUpdating(false); }
    };

    const totalVolume = orders.reduce((sum, o) => sum + parseFloat(o.total_amount || 0), 0);
    const totalPaid = orders.reduce((sum, o) => sum + parseFloat(o.paid_amount || (o.payment_status === 'PAID' ? o.total_amount : 0) || 0), 0);
    const totalRemaining = totalVolume - totalPaid;

    return (
        <div className="max-w-[1200px] mx-auto p-8 font-sans text-left bg-white min-h-screen">
            {selectedOrder && <OrderDetailModal order={selectedOrder} onClose={() => setSelectedOrder(null)} />}

            {/* HEADER */}
            <div className="flex justify-between items-end mb-10">
                <div className="space-y-1">
                    <div className="flex items-center gap-1 text-[11px] font-bold text-[#565959] uppercase tracking-wider">
                        <span>Partner</span> <ChevronRight size={12} /> <span className="text-[#c45500]">Financial Registry</span>
                    </div>
                    <h1 className="text-[26px] font-normal text-[#111]">Settlements & Ledger</h1>
                </div>
                <div className="flex gap-2">
                    <button onClick={() => fetchOrders()} className="h-[31px] px-4 border border-[#adb1b8] rounded-[3px] text-[13px] font-medium bg-gradient-to-b from-[#f7f8fa] to-[#e7e9ec] hover:from-[#eef1f3] hover:to-[#dce0e4] text-[#0f1111] shadow-sm flex items-center gap-2">
                        <RefreshCw size={14} className={loading ? 'animate-spin' : ''} /> Sync
                    </button>
                    <button className="h-[31px] px-4 border border-[#adb1b8] rounded-[3px] text-[13px] font-medium bg-[#232f3e] text-white hover:bg-[#131921] shadow-sm flex items-center gap-2">
                        <Download size={14} /> Export
                    </button>
                </div>
            </div>

            {/* KPI GRID */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-5 mb-10">
                <KPICard label="Settled Funds" value={fmt(totalPaid)} icon={CheckCircle2} colorClass="text-[#007185]" />
                <KPICard label="Unsettled Balance" value={fmt(totalRemaining)} icon={Clock} colorClass="text-[#b12704]" />
                <KPICard label="Total Registry" value={fmt(totalVolume)} icon={History} colorClass="text-[#111]" />
            </div>

            {/* LEDGER TABLE */}
            <div className="bg-white border border-[#d5d9d9] rounded-[4px] shadow-sm overflow-hidden">
                
                {/* Amazon Toolbar */}
                <div className="px-6 py-4 border-b border-[#d5d9d9] flex justify-between items-center bg-[#fcfcfc] gap-6">
                    <div className="flex gap-2">
                        {['all', 'unpaid', 'paid'].map(t => (
                            <button 
                                key={t} 
                                onClick={() => setFilter(t)} 
                                className={`px-4 py-1.5 text-[12px] font-bold rounded-[3px] border shadow-sm transition-all ${filter === t ? 'bg-[#232f3e] text-white border-[#232f3e]' : 'bg-white text-[#565959] border-[#d5d9d9] hover:bg-[#f7fafa]'}`}
                            >
                                {t.toUpperCase()}
                            </button>
                        ))}
                    </div>
                    <div className="relative w-72">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-[#888]" />
                        <input 
                            value={search} 
                            onChange={e => setSearch(e.target.value)} 
                            placeholder="Search orders..." 
                            className="w-full pl-9 pr-3 h-[31px] text-[13px] border border-[#888c8e] rounded-[3px] outline-none focus:border-[#e77600] focus:ring-1 focus:ring-[#e77600] transition-all" 
                        />
                    </div>
                </div>

                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse font-sans">
                        <thead>
                            <tr className="bg-[#f6f6f6] border-b border-[#d5d9d9] text-[11px] font-bold text-[#565959] uppercase tracking-wider">
                                <th className="px-6 py-4">Order Reference</th>
                                <th className="px-6 py-4">Recipient</th>
                                <th className="px-6 py-4 text-right">Settlement Value</th>
                                <th className="px-6 py-4 text-center">Status</th>
                                <th className="px-6 py-4 text-right">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-[#f0f2f2]">
                            {loading ? (
                                <tr><td colSpan={5} className="py-20 text-center text-[#565959] italic text-[13px]">Fetching financial data...</td></tr>
                            ) : (
                                orders.map(o => {
                                    const isWaiting = o.is_wholesale && o.payment_status !== 'UNPAID' && !o.payment_confirmed;
                                    const isViewed = viewedOrderIds.has(String(o.id));
                                    
                                    return (
                                        <tr key={o.id} className="hover:bg-[#fcfcfc] transition-colors group">
                                            <td className="px-6 py-4">
                                                <div className="flex flex-col">
                                                    <span className="text-[14px] font-bold text-[#c45500]">#{o.order_number || o.tracking_id}</span>
                                                    <span className="text-[11px] text-[#565959] font-medium">{formatDateTime(o.created_at || o.order_date).date}</span>
                                                </div>
                                            </td>
                                            <td className="px-6 py-4">
                                                <span className="text-[13px] font-medium text-[#111]">{o.customer_name || 'Retail Point of Sale'}</span>
                                            </td>
                                            <td className="px-6 py-4 text-right font-bold text-[#111]">
                                                {fmt(parseFloat(o.total_amount))}
                                            </td>
                                            <td className="px-6 py-4 text-center">
                                                <Badge variant={o.payment_status?.toLowerCase() || 'paid'}>{o.payment_status || 'PAID'}</Badge>
                                            </td>
                                            <td className="px-6 py-4 text-right">
                                                <div className="flex justify-end gap-5 items-center">
                                                    {isWaiting && (
                                                        <>
                                                            <button 
                                                                onClick={() => handleAcceptPayment(o.id)} 
                                                                disabled={!isViewed || isUpdating} 
                                                                className={`text-[12px] font-bold transition-all ${!isViewed ? 'text-gray-300 cursor-not-allowed' : 'text-[#007185] hover:underline hover:text-[#c45500] cursor-pointer'}`}
                                                            >
                                                                Accept
                                                            </button>
                                                            <button 
                                                                onClick={() => handleRejectPayment(o.id)} 
                                                                disabled={!isViewed || isUpdating} 
                                                                className={`text-[12px] font-bold transition-all ${!isViewed ? 'text-gray-300 cursor-not-allowed' : 'text-[#b12704] hover:underline cursor-pointer'}`}
                                                            >
                                                                Reject
                                                            </button>
                                                        </>
                                                    )}
                                                    <button 
                                                        onClick={() => handleOpenView(o)} 
                                                        className={`text-[12px] font-bold text-[#007185] hover:underline cursor-pointer transition-all ${isViewed ? 'opacity-50' : ''}`}
                                                    >
                                                        View
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    );
                                })
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
}
