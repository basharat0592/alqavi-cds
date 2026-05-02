'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import {
    RefreshCw, TrendingUp, Package, Wallet, CheckCircle2,
    ArrowRight, AlertTriangle, Briefcase, Activity, ShoppingCart, ArrowUpRight,
    Search,
    Truck,
    LayoutDashboard,
    Eye,
    Info,
    Check,
    X as XIcon,
    ChevronDown as ChevronDownIcon,
    X
} from 'lucide-react';
import {
    AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip,
    ResponsiveContainer
} from 'recharts';
import api from '@/lib/axios';
import { cn } from '@/lib/utils';
import toast from 'react-hot-toast';

// ── Pure Amazon Formatting ──────────────────────────────────────────────────
const fmt = (n: number) =>
    new Intl.NumberFormat('en-PK', {
        style: 'currency',
        currency: 'PKR',
        maximumFractionDigits: 0
    }).format(n);

const formatDate = (d: string) =>
    new Date(d).toLocaleDateString('en-PK', { day: 'numeric', month: 'short', year: 'numeric' });

export default function SupplierDashboard() {
    const router = useRouter();
    const [orders, setOrders] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [stats, setStats] = useState<any>({ totalRemaining: 0, totalPaid: 0, totalVolume: 0, activeSkus: 0 });
    const [actionLoading, setActionLoading] = useState<string | null>(null);
    const [viewOrder, setViewOrder] = useState<any>(null);

    const fetchDashboard = useCallback(async () => {
        setLoading(true);
        try {
            const [ordersRes, purchasesRes, productsRes, returnsRes] = await Promise.all([
                api.get('/v1/sales/orders/'),
                api.get('/v1/sales/purchases/'),
                api.get('/v1/products/supplier-items/'),
                api.get('/v1/sales/purchase-returns/')
            ]);

            const retailOrders = Array.isArray(ordersRes.data) ? ordersRes.data : ordersRes.data.results || [];
            const purchaseOrders = Array.isArray(purchasesRes.data) ? purchasesRes.data : purchasesRes.data.results || [];
            const products = Array.isArray(productsRes.data) ? productsRes.data : productsRes.data.results || [];
            const returns = Array.isArray(returnsRes.data) ? returnsRes.data : returnsRes.data.results || [];

            const normalizedPOs = purchaseOrders.map((po: any) => ({
                id: po.id,
                order_number: po.purchase_number,
                created_at: po.order_date || po.created_at,
                total_amount: parseFloat(po.total_amount || 0),
                paid_amount: parseFloat(po.paid_amount || 0),
                payment_status: po.payment_status?.toUpperCase() || 'UNPAID',
                status: po.status,
                payment_method: po.payment_method,
                notes: po.notes,
                items: po.items,
                is_wholesale: true
            }));

            const normalizedReturns = returns.map((r: any) => ({
                id: r.id,
                order_number: r.return_number,
                created_at: r.created_at,
                total_amount: parseFloat(r.total_refund_amount || 0),
                status: r.status,
                is_return: true
            }));

            const activePOs = normalizedPOs.filter((o: any) => 
                !['RECEIVED', 'DELIVERED', 'CANCELLED'].includes(o.status?.toUpperCase())
            );
            
            setOrders(activePOs.sort((a: any, b: any) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()));

            const rem = normalizedPOs.reduce((sum: number, o: any) => sum + (o.total_amount - o.paid_amount), 0);
            const paid = normalizedPOs.reduce((sum: number, o: any) => sum + o.paid_amount, 0);
            const vol = normalizedPOs.reduce((sum: number, o: any) => sum + o.total_amount, 0);

            setStats({
                totalRemaining: rem,
                totalPaid: paid,
                totalVolume: vol,
                activeSkus: products.length
            });

        } catch (error) {
            console.error("Dashboard failed:", error);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchDashboard();
        const poll = setInterval(fetchDashboard, 60000);
        return () => clearInterval(poll);
    }, [fetchDashboard]);

    const handleUpdateStatus = async (orderId: string, newStatus: string) => {
        setActionLoading(orderId);
        try {
            await api.patch(`/v1/sales/purchases/${orderId}/`, { status: newStatus });
            toast.success(`Order status updated to ${newStatus}`);
            fetchDashboard();
        } catch (err) {
            toast.error("Failed to update status");
        } finally {
            setActionLoading(null);
        }
    };

    const graphData = useMemo(() => {
        const sorted = [...orders].reverse();
        const dataMap: Record<string, { date: string, val: number }> = {};
        sorted.forEach(o => {
            const d = formatDate(o.created_at);
            if (!dataMap[d]) dataMap[d] = { date: d, val: 0 };
            dataMap[d].val += parseFloat(o.total_amount || 0);
        });
        return Object.values(dataMap).slice(-10);
    }, [orders]);

    return (
        <div className="max-w-[1000px] mx-auto animate-in fade-in duration-500 pb-20">

            {/* ── Page Header ── */}
            <div className="flex items-center justify-between mb-6 no-print">
                <div className="flex items-center gap-3">
                    <LayoutDashboard className="text-[#111] h-6 w-6" />
                    <div className="flex flex-col">
                        <h1 className="text-[22px] font-normal text-[#111] leading-tight">Supplier Dashboard</h1>
                        <p className="text-[12px] text-[#565959] mt-0.5 font-medium">Unified overview of your fulfillment, returns, and sales activity.</p>
                    </div>
                </div>
                <button 
                    onClick={fetchDashboard} 
                    className="flex items-center gap-2 px-3 py-1.5 bg-white border border-[#D5D9D9] hover:bg-[#F7F8FA] rounded-[8px] text-[13px] font-bold text-[#0f1111] shadow-sm transition-all"
                >
                    <RefreshCw className={cn("h-3.5 w-3.5", loading && "animate-spin")} />
                    Sync Dashboard
                </button>
            </div>

            {/* 1. Executive Summary Card (KPIs) */}
            <div className="bg-white border border-[#ddd] rounded-[12px] shadow-sm mb-8 overflow-hidden">
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 divide-y sm:divide-y-0 sm:divide-x divide-[#ddd]">
                    {[
                        { label: 'Settled Funds', val: fmt(stats.totalPaid), color: 'text-[#111]', desc: 'Cash Received' },
                        { label: 'Pending Settlement', val: fmt(stats.totalRemaining), color: 'text-[#B12704]', desc: 'Open Accounts' },
                        { label: 'Active Catalog', val: stats.activeSkus, color: 'text-[#111]', desc: 'SKUs Online' },
                        { label: 'Total Volume', val: fmt(stats.totalVolume), color: 'text-[#111]', desc: 'Gross Value' },
                    ].map((kpi, idx) => (
                        <div key={idx} className="p-5 flex flex-col hover:bg-[#fcfcfc] transition-colors cursor-default">
                            <span className="text-[11px] text-[#565959] font-black uppercase tracking-widest">{kpi.label}</span>
                            <span className={`text-[24px] font-normal mt-1 ${kpi.color}`}>{kpi.val}</span>
                            <span className="text-[10px] text-[#565959] mt-1 font-bold">{kpi.desc}</span>
                        </div>
                    ))}
                </div>
            </div>

            {/* 2. Recent Orders Feed */}
            <div className="bg-white border border-[#ddd] rounded-[12px] shadow-md mb-10 overflow-hidden flex flex-col">
                <div className="px-6 py-4 bg-[#f3f3f3] border-b border-[#ddd] flex items-center justify-between">
                    <div className="flex items-center gap-2">
                        <Package size={18} className="text-[#007185]" />
                        <h2 className="text-[15px] font-bold text-[#111] uppercase tracking-tight">Recent Orders</h2>
                    </div>
                    {!loading && (
                        <span className="text-[11px] font-bold text-[#565959] bg-white px-2 py-1 rounded border border-[#ddd]">
                            {orders.filter(o => o.is_wholesale).length} Active Orders
                        </span>
                    )}
                </div>

                <div className="divide-y divide-[#eee]">
                    {orders.length === 0 && !loading ? (
                        <div className="p-20 text-center text-slate-400">
                            <Package size={40} className="mx-auto mb-4 opacity-20" />
                            <p className="text-[14px] font-bold">No recent orders found</p>
                        </div>
                    ) : (
                        orders.slice(0, 15).map((o) => {
                            const isActionable = !['DELIVERED', 'CANCELLED', 'RECEIVED'].includes(o.status?.toUpperCase());
                            
                            return (
                                <div key={o.id} className={cn(
                                    "p-4 flex flex-col md:flex-row md:items-center justify-between gap-4 transition-all hover:bg-[#fcfcfc]",
                                    isActionable ? "bg-amber-50/40 border-l-4 border-l-[#e77600]" : ""
                                )}>
                                    <div className="flex items-center gap-4 flex-1">
                                        <div className="w-10 h-10 rounded-full flex items-center justify-center text-[12px] font-black border bg-blue-50 text-[#007185] border-blue-100">
                                            {o.order_number?.slice(-2) || '??'}
                                        </div>
                                        <div>
                                            <div className="flex items-center gap-2">
                                                <span 
                                                    onClick={() => setViewOrder(o)}
                                                    className="text-[14px] font-bold text-[#007185] hover:underline cursor-pointer"
                                                >
                                                    #{o.order_number}
                                                </span>
                                                <span className={cn(
                                                    "text-[9px] font-black px-1.5 py-0.5 rounded border uppercase tracking-tighter",
                                                    o.status === 'PENDING' ? "bg-amber-50 text-amber-600 border-amber-200" : "bg-blue-50 text-blue-600 border-blue-200"
                                                )}>
                                                    {o.status}
                                                </span>
                                                {isActionable && (
                                                    <span className="text-[8px] font-black bg-amber-100 text-amber-700 px-1 py-0.5 rounded animate-pulse">ACTION REQUIRED</span>
                                                )}
                                            </div>
                                            <p className="text-[11px] text-[#565959] font-bold uppercase tracking-tight mt-0.5">
                                                {formatDate(o.created_at)} • WHOLESALE PURCHASE
                                            </p>
                                        </div>
                                    </div>

                                    <div className="flex items-center justify-between md:justify-end gap-6 md:w-[450px]">
                                        <div className="text-right">
                                            <p className="text-[14px] font-black text-[#111]">
                                                {fmt(parseFloat(o.total_amount))}
                                            </p>
                                            <p className="text-[9px] text-[#565959] font-bold uppercase tracking-widest">ORDER VALUE</p>
                                        </div>

                                        <div className="flex items-center gap-2 min-w-[200px] justify-end">
                                            {isActionable ? (
                                                <>
                                                    {o.status === 'PENDING' ? (
                                                        <>
                                                            <button 
                                                                disabled={actionLoading === o.id}
                                                                onClick={() => setViewOrder(o)}
                                                                className="h-[32px] px-3 bg-white border border-[#D5D9D9] rounded-[4px] text-[11px] font-bold text-[#007185] hover:underline"
                                                            >
                                                                <Eye size={12} className="inline mr-1" /> View
                                                            </button>
                                                            <button 
                                                                disabled={actionLoading === o.id}
                                                                onClick={() => handleUpdateStatus(o.id, 'PROCESSING')}
                                                                className="h-[32px] px-4 bg-[#FFD814] border border-[#FCD200] rounded-[4px] text-[11px] font-bold text-[#111] hover:bg-[#F7CA00] shadow-sm"
                                                            >
                                                                Accept
                                                            </button>
                                                        </>
                                                    ) : (
                                                        <>
                                                            <div className="flex-1 relative">
                                                                <select 
                                                                    disabled={actionLoading === o.id}
                                                                    value={o.status}
                                                                    onChange={(e) => handleUpdateStatus(o.id, e.target.value)}
                                                                    className="w-full h-[32px] pl-2 pr-7 bg-[#F0F2F2] border border-[#D5D9D9] rounded-[4px] text-[10px] font-black text-[#111] appearance-none focus:ring-1 focus:ring-[#007185] outline-none cursor-pointer"
                                                                >
                                                                    <option value="PENDING">Pending Approval</option>
                                                                    <option value="PROCESSING">Processing Order</option>
                                                                    <option value="SHIPPED">Shipped to Warehouse</option>
                                                                    <option value="DELIVERED">Mark as Delivered</option>
                                                                    <option value="CANCELLED">Reject / Cancel</option>
                                                                </select>
                                                                <ChevronDownIcon size={12} className="absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none text-[#565959]" />
                                                            </div>
                                                            <button 
                                                                onClick={() => setViewOrder(o)}
                                                                className="h-[32px] px-3 bg-white border border-[#D5D9D9] rounded-[4px] text-[11px] font-bold text-[#007185] hover:underline"
                                                            >
                                                                <Eye size={12} />
                                                            </button>
                                                        </>
                                                    )}
                                                </>
                                            ) : (
                                                <button 
                                                    onClick={() => router.push('/supplier/orders')}
                                                    className="h-[32px] px-3 bg-white border border-[#D5D9D9] rounded-[4px] text-[11px] font-bold text-[#007185] hover:underline"
                                                >
                                                    Log
                                                </button>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            );
                        })
                    )}
                </div>
                
                <button 
                    onClick={() => router.push('/supplier/sales')}
                    className="p-3 bg-[#f9f9f9] border-t border-[#ddd] text-[12px] font-bold text-[#007185] hover:text-[#c45500] hover:bg-white text-center transition-all"
                >
                    View Comprehensive Registry &rarr;
                </button>
            </div>

            {/* 3. Performance Analytics Console */}
            <div className="bg-white border border-[#ddd] rounded-[12px] shadow-sm mb-10 overflow-hidden">
                <div className="p-6">
                    <div className="flex items-center justify-between mb-6">
                        <div>
                            <h3 className="text-[15px] font-bold text-[#111]">Sales Velocity Trend</h3>
                            <p className="text-[11px] text-[#565959] font-medium">Daily revenue insights (Last 10 Records)</p>
                        </div>
                        <span className="text-[10px] font-black text-[#007185] bg-blue-50 px-2 py-1 rounded border border-blue-100 uppercase tracking-widest">Live Pulse</span>
                    </div>
                    
                    <div className="h-[280px] w-full">
                        <ResponsiveContainer width="100%" height="100%">
                            <AreaChart data={graphData}>
                                <defs>
                                    <linearGradient id="colorVal" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%" stopColor="#007185" stopOpacity={0.2} />
                                        <stop offset="95%" stopColor="#007185" stopOpacity={0} />
                                    </linearGradient>
                                </defs>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#eee" />
                                <XAxis
                                    dataKey="date"
                                    axisLine={false}
                                    tickLine={false}
                                    tick={{ fontSize: 10, fill: '#565959', fontWeight: 'bold' }}
                                    dy={10}
                                />
                                <YAxis hide />
                                <Tooltip
                                    contentStyle={{ border: '1px solid #ddd', borderRadius: '4px', boxShadow: '0 1px 2px rgba(0,0,0,0.1)', fontSize: '11px', fontWeight: 'bold' }}
                                    cursor={{ stroke: '#007185', strokeWidth: 1, strokeDasharray: '4 4' }}
                                />
                                <Area
                                    type="monotone"
                                    dataKey="val"
                                    stroke="#007185"
                                    strokeWidth={2}
                                    fillOpacity={1}
                                    fill="url(#colorVal)"
                                    animationDuration={1000}
                                />
                            </AreaChart>
                        </ResponsiveContainer>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-8 pt-6 border-t border-[#eee]">
                        <div className="flex gap-3">
                            <CheckCircle2 size={18} className="text-[#007185] mt-0.5" />
                            <div>
                                <h4 className="text-[13px] font-bold text-[#111]">Logistics Performance</h4>
                                <p className="text-[12px] text-[#565959]">Automatic sync with courier nodes is active. Fulfillment health is optimal.</p>
                            </div>
                        </div>
                        <div className="flex gap-3">
                            <AlertTriangle size={18} className="text-[#B12704] mt-0.5" />
                            <div>
                                <h4 className="text-[13px] font-bold text-[#111]">Audit Warnings</h4>
                                <p className="text-[12px] text-[#565959]">Review all partial settlements. Tax reconciliation due in 4 days.</p>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* 4. Partner Advisory */}
            <div className="p-5 bg-[#FEF8F2] border border-[#FCD2B2] rounded-xl flex items-center gap-4">
                <div className="w-10 h-10 bg-[#FFD814] rounded-full flex items-center justify-center shrink-0">
                    <Info size={20} className="text-[#c45500]" />
                </div>
                <div className="flex-1">
                    <h4 className="text-[13px] font-bold text-[#111]">Amazon Partner Advisory</h4>
                    <p className="text-[12px] text-[#111] leading-snug">
                        Maintain high fulfillment rates to qualify for Elite Supplier status. Instant settlements are processed for all verified deliveries within 24 hours.
                    </p>
                </div>
            </div>

            {/* ── Details Modal ── */}
            {viewOrder && (
                <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-in fade-in duration-300">
                    <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl overflow-hidden animate-in zoom-in-95 duration-300 border border-[#ddd]">
                        {/* Header */}
                        <div className="bg-[#f3f3f3] border-b border-[#ddd] px-6 py-4 flex items-center justify-between">
                            <div>
                                <h3 className="text-[18px] font-bold text-[#111]">Order: #{viewOrder.order_number}</h3>
                                <p className="text-[12px] text-[#565959] mt-0.5 font-medium">Record Created: {new Date(viewOrder.created_at).toLocaleString('en-PK', { day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' })}</p>
                            </div>
                            <button onClick={() => setViewOrder(null)} className="p-2 hover:bg-[#e7e9ec] rounded-full transition-colors group">
                                <X size={20} className="text-[#565959] group-hover:text-black" />
                            </button>
                        </div>

                        {/* Modal Content */}
                        <div className="p-6 overflow-y-auto max-h-[75vh]">
                            {/* Summary Grid */}
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-6 mb-8 bg-[#f9f9f9] p-5 rounded-xl border border-[#eee]">
                                <div>
                                    <h4 className="text-[10px] font-black text-[#565959] uppercase tracking-widest mb-1">Status</h4>
                                    <span className={cn(
                                        "text-[11px] font-black px-2 py-0.5 rounded border uppercase tracking-tight inline-block",
                                        viewOrder.status === 'PENDING' ? "bg-amber-50 text-amber-600 border-amber-200" : "bg-blue-50 text-blue-600 border-blue-200"
                                    )}>
                                        {viewOrder.status}
                                    </span>
                                </div>
                                <div>
                                    <h4 className="text-[10px] font-black text-[#565959] uppercase tracking-widest mb-1">Payment</h4>
                                    <span className={cn(
                                        "text-[11px] font-black px-2 py-0.5 rounded border uppercase tracking-tight inline-block",
                                        viewOrder.payment_status === 'PAID' ? "bg-emerald-50 text-emerald-600 border-emerald-200" : "bg-red-50 text-red-600 border-red-200"
                                    )}>
                                        {viewOrder.payment_status || 'UNPAID'}
                                    </span>
                                </div>
                                <div>
                                    <h4 className="text-[10px] font-black text-[#565959] uppercase tracking-widest mb-1">Billing</h4>
                                    <p className="text-[13px] font-bold text-[#111] uppercase tracking-tighter">{viewOrder.payment_method || 'CASH'}</p>
                                </div>
                                <div className="text-right">
                                    <h4 className="text-[10px] font-black text-[#565959] uppercase tracking-widest mb-1">Total Value</h4>
                                    <p className="text-[18px] font-black text-[#B12704]">{fmt(parseFloat(viewOrder.total_amount))}</p>
                                </div>
                            </div>

                            {/* Admin Notes */}
                            {viewOrder.notes && (
                                <div className="mb-8 p-4 bg-[#FEF8F2] border border-[#FCD2B2] rounded-xl shadow-inner">
                                    <h4 className="text-[11px] font-black text-[#c45500] uppercase tracking-widest mb-2 flex items-center gap-2">
                                        <Info size={14} /> Administrative Notice
                                    </h4>
                                    <p className="text-[13px] text-[#111] italic leading-relaxed font-medium">"{viewOrder.notes}"</p>
                                </div>
                            )}

                            {/* Items Table */}
                            <div className="border border-[#ddd] rounded-xl overflow-hidden shadow-sm">
                                <table className="w-full text-left border-collapse">
                                    <thead>
                                        <tr className="bg-[#f0f2f2] border-b border-[#ddd]">
                                            <th className="px-5 py-3 text-[11px] font-black text-[#565959] uppercase tracking-wider">Product Line Item</th>
                                            <th className="px-5 py-3 text-[11px] font-black text-[#565959] uppercase tracking-wider text-center">Qty</th>
                                            <th className="px-5 py-3 text-[11px] font-black text-[#565959] uppercase tracking-wider text-right">Rate</th>
                                            <th className="px-5 py-3 text-[11px] font-black text-[#565959] uppercase tracking-wider text-right">Subtotal</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-[#eee]">
                                        {(viewOrder.items || []).map((item: any, idx: number) => (
                                            <tr key={idx} className="hover:bg-[#fcfcfc] transition-colors">
                                                <td className="px-5 py-4">
                                                    <div className="text-[13px] font-bold text-[#111]">{item.product_name}</div>
                                                    <div className="text-[10px] text-[#565959] font-bold uppercase tracking-tight mt-0.5">SKU: {item.sku || 'N/A'}</div>
                                                </td>
                                                <td className="px-5 py-4 text-center text-[13px] font-black text-[#111]">{item.quantity}</td>
                                                <td className="px-5 py-4 text-right text-[12px] font-bold text-[#565959]">{fmt(parseFloat(item.price))}</td>
                                                <td className="px-5 py-4 text-right text-[13px] font-black text-[#111]">{fmt(item.quantity * parseFloat(item.price))}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>

                        {/* Modal Footer */}
                        <div className="bg-[#f3f3f3] border-t border-[#ddd] px-6 py-4 flex justify-between items-center">
                            <p className="text-[11px] text-[#565959] font-bold italic uppercase tracking-tighter">* All totals include relevant wholesale node discounts.</p>
                            <button 
                                onClick={() => setViewOrder(null)}
                                className="px-8 py-2.5 bg-white border border-[#D5D9D9] rounded-lg text-[13px] font-bold text-[#111] hover:bg-[#F7FAFA] shadow-sm hover:shadow-md transition-all uppercase tracking-tight"
                            >
                                Close Record
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
