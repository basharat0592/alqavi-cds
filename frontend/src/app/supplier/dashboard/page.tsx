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
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8 no-print">
                <div className="flex items-center gap-3">
                    <div className="w-11 h-11 rounded-2xl bg-cyan-50 border border-cyan-100 flex items-center justify-center text-cyan-600 shrink-0">
                        <LayoutDashboard className="h-5 w-5" />
                    </div>
                    <div className="flex flex-col">
                        <h1 className="text-2xl font-bold text-slate-900 leading-tight tracking-tight">Supplier Dashboard</h1>
                        <p className="text-[13px] text-slate-500 mt-0.5 font-medium">Unified overview of your fulfillment, returns, and sales activity.</p>
                    </div>
                </div>
                <button
                    onClick={fetchDashboard}
                    className="inline-flex items-center gap-2 px-4 py-2.5 bg-white border border-slate-200 hover:border-cyan-200 hover:bg-cyan-50/40 rounded-xl text-[13px] font-bold text-slate-700 shadow-sm transition-all self-start sm:self-auto"
                >
                    <RefreshCw className={cn("h-4 w-4 text-cyan-600", loading && "animate-spin")} />
                    Sync Dashboard
                </button>
            </div>

            {/* 1. Executive Summary (KPIs) */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
                {[
                    { label: 'Settled Funds', val: fmt(stats.totalPaid), color: 'text-emerald-600', desc: 'Cash Received', icon: Wallet, iconCls: 'bg-emerald-50 text-emerald-600' },
                    { label: 'Pending Settlement', val: fmt(stats.totalRemaining), color: 'text-rose-600', desc: 'Open Accounts', icon: AlertTriangle, iconCls: 'bg-rose-50 text-rose-600' },
                    { label: 'Active Catalog', val: stats.activeSkus, color: 'text-slate-900', desc: 'SKUs Online', icon: Package, iconCls: 'bg-cyan-50 text-cyan-600' },
                    { label: 'Total Volume', val: fmt(stats.totalVolume), color: 'text-slate-900', desc: 'Gross Value', icon: TrendingUp, iconCls: 'bg-slate-100 text-slate-600' },
                ].map((kpi, idx) => (
                    <div key={idx} className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm hover:shadow-md transition-all">
                        <div className="flex items-center justify-between">
                            <span className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">{kpi.label}</span>
                            <div className={cn("w-8 h-8 rounded-lg flex items-center justify-center shrink-0", kpi.iconCls)}>
                                <kpi.icon size={15} />
                            </div>
                        </div>
                        <p className={cn("text-[26px] font-bold tracking-tight mt-3 leading-none", kpi.color)}>{kpi.val}</p>
                        <p className="text-[11px] text-slate-400 mt-2 font-semibold">{kpi.desc}</p>
                    </div>
                ))}
            </div>

            {/* 2. Recent Orders Feed */}
            <div className="bg-white border border-slate-200 rounded-2xl shadow-sm mb-8 overflow-hidden flex flex-col">
                <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
                    <div className="flex items-center gap-2.5">
                        <Package size={18} className="text-cyan-600" />
                        <h2 className="text-[15px] font-bold text-slate-900 tracking-tight">Recent Orders</h2>
                    </div>
                    {!loading && (
                        <span className="text-[11px] font-bold text-slate-500 bg-slate-50 px-2.5 py-1 rounded-full border border-slate-200">
                            {orders.filter(o => o.is_wholesale).length} Active
                        </span>
                    )}
                </div>

                <div className="divide-y divide-slate-100">
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
                                    "px-5 py-4 flex flex-col md:flex-row md:items-center justify-between gap-4 transition-all hover:bg-slate-50/70",
                                    isActionable ? "bg-cyan-50/30 border-l-2 border-l-cyan-500" : ""
                                )}>
                                    <div className="flex items-center gap-4 flex-1">
                                        <div className="w-10 h-10 rounded-xl flex items-center justify-center text-[12px] font-black border bg-cyan-50 text-cyan-600 border-cyan-100 shrink-0">
                                            {o.order_number?.slice(-2) || '??'}
                                        </div>
                                        <div>
                                            <div className="flex items-center gap-2 flex-wrap">
                                                <span
                                                    onClick={() => setViewOrder(o)}
                                                    className="text-[14px] font-bold text-cyan-700 hover:underline cursor-pointer"
                                                >
                                                    #{o.order_number}
                                                </span>
                                                <span className={cn(
                                                    "text-[9px] font-black px-2 py-0.5 rounded-full border uppercase tracking-tight",
                                                    o.status === 'PENDING' ? "bg-amber-50 text-amber-600 border-amber-200" : "bg-cyan-50 text-cyan-700 border-cyan-200"
                                                )}>
                                                    {o.status}
                                                </span>
                                                {isActionable && (
                                                    <span className="text-[8px] font-black bg-amber-100 text-amber-700 px-1.5 py-0.5 rounded-full uppercase tracking-wider">Action Required</span>
                                                )}
                                            </div>
                                            <p className="text-[11px] text-slate-400 font-bold uppercase tracking-tight mt-1">
                                                {formatDate(o.created_at)} • Wholesale Purchase
                                            </p>
                                        </div>
                                    </div>

                                    <div className="flex items-center justify-between md:justify-end gap-6 md:w-[450px]">
                                        <div className="text-right">
                                            <p className="text-[15px] font-black text-slate-900">
                                                {fmt(parseFloat(o.total_amount))}
                                            </p>
                                            <p className="text-[9px] text-slate-400 font-bold uppercase tracking-widest">Order Value</p>
                                        </div>

                                        <div className="flex items-center gap-2 min-w-[200px] justify-end">
                                            {isActionable ? (
                                                <>
                                                    {o.status === 'PENDING' ? (
                                                        <>
                                                            <button
                                                                disabled={actionLoading === o.id}
                                                                onClick={() => setViewOrder(o)}
                                                                className="h-9 px-3 bg-white border border-slate-200 rounded-lg text-[11px] font-bold text-slate-600 hover:bg-slate-50 transition-all inline-flex items-center gap-1"
                                                            >
                                                                <Eye size={13} /> View
                                                            </button>
                                                            <button
                                                                disabled={actionLoading === o.id}
                                                                onClick={() => handleUpdateStatus(o.id, 'PROCESSING')}
                                                                className="h-9 px-4 bg-cyan-600 rounded-lg text-[11px] font-bold text-white hover:bg-cyan-700 shadow-sm shadow-cyan-600/20 transition-all disabled:opacity-60"
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
                                                                    className="w-full h-9 pl-3 pr-7 bg-slate-50 border border-slate-200 rounded-lg text-[10px] font-black text-slate-700 appearance-none focus:ring-2 focus:ring-cyan-100 focus:border-cyan-500 outline-none cursor-pointer transition-all"
                                                                >
                                                                    <option value="PENDING">Pending Approval</option>
                                                                    <option value="PROCESSING">Processing Order</option>
                                                                    <option value="SHIPPED">Shipped to Warehouse</option>
                                                                    <option value="DELIVERED">Mark as Delivered</option>
                                                                    <option value="CANCELLED">Reject / Cancel</option>
                                                                </select>
                                                                <ChevronDownIcon size={12} className="absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400" />
                                                            </div>
                                                            <button
                                                                onClick={() => setViewOrder(o)}
                                                                className="h-9 w-9 flex items-center justify-center bg-white border border-slate-200 rounded-lg text-slate-600 hover:bg-slate-50 transition-all"
                                                            >
                                                                <Eye size={14} />
                                                            </button>
                                                        </>
                                                    )}
                                                </>
                                            ) : (
                                                <button
                                                    onClick={() => router.push('/supplier/orders')}
                                                    className="h-9 px-3 bg-white border border-slate-200 rounded-lg text-[11px] font-bold text-slate-600 hover:bg-slate-50 transition-all"
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
                    className="p-3.5 border-t border-slate-100 text-[12px] font-bold text-cyan-700 hover:bg-cyan-50/50 text-center transition-all"
                >
                    View Comprehensive Registry &rarr;
                </button>
            </div>

            {/* 3. Performance Analytics Console */}
            <div className="bg-white border border-slate-200 rounded-2xl shadow-sm mb-8 overflow-hidden">
                <div className="p-6">
                    <div className="flex items-center justify-between mb-6">
                        <div>
                            <h3 className="text-[15px] font-bold text-slate-900 tracking-tight">Sales Velocity Trend</h3>
                            <p className="text-[11px] text-slate-400 font-medium mt-0.5">Daily revenue insights (Last 10 Records)</p>
                        </div>
                        <span className="text-[10px] font-black text-cyan-700 bg-cyan-50 px-2.5 py-1 rounded-full border border-cyan-100 uppercase tracking-widest">Live Pulse</span>
                    </div>

                    <div className="h-[280px] w-full">
                        <ResponsiveContainer width="100%" height="100%">
                            <AreaChart data={graphData}>
                                <defs>
                                    <linearGradient id="colorVal" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%" stopColor="#0891b2" stopOpacity={0.18} />
                                        <stop offset="95%" stopColor="#0891b2" stopOpacity={0} />
                                    </linearGradient>
                                </defs>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                                <XAxis
                                    dataKey="date"
                                    axisLine={false}
                                    tickLine={false}
                                    tick={{ fontSize: 10, fill: '#94a3b8', fontWeight: 'bold' }}
                                    dy={10}
                                />
                                <YAxis hide />
                                <Tooltip
                                    contentStyle={{ border: '1px solid #e2e8f0', borderRadius: '12px', boxShadow: '0 8px 24px rgba(15,23,42,0.08)', fontSize: '11px', fontWeight: 'bold' }}
                                    cursor={{ stroke: '#0891b2', strokeWidth: 1, strokeDasharray: '4 4' }}
                                />
                                <Area
                                    type="monotone"
                                    dataKey="val"
                                    stroke="#0891b2"
                                    strokeWidth={2.5}
                                    fillOpacity={1}
                                    fill="url(#colorVal)"
                                    animationDuration={1000}
                                />
                            </AreaChart>
                        </ResponsiveContainer>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-8 pt-6 border-t border-slate-100">
                        <div className="flex gap-3 p-4 rounded-xl bg-emerald-50/50 border border-emerald-100">
                            <CheckCircle2 size={18} className="text-emerald-600 mt-0.5 shrink-0" />
                            <div>
                                <h4 className="text-[13px] font-bold text-slate-900">Logistics Performance</h4>
                                <p className="text-[12px] text-slate-500 mt-0.5">Automatic sync with courier nodes is active. Fulfillment health is optimal.</p>
                            </div>
                        </div>
                        <div className="flex gap-3 p-4 rounded-xl bg-rose-50/50 border border-rose-100">
                            <AlertTriangle size={18} className="text-rose-600 mt-0.5 shrink-0" />
                            <div>
                                <h4 className="text-[13px] font-bold text-slate-900">Audit Warnings</h4>
                                <p className="text-[12px] text-slate-500 mt-0.5">Review all partial settlements. Tax reconciliation due in 4 days.</p>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* 4. Partner Advisory */}
            <div className="p-5 bg-gradient-to-r from-cyan-50 to-white border border-cyan-100 rounded-2xl flex items-center gap-4">
                <div className="w-11 h-11 bg-cyan-600 rounded-xl flex items-center justify-center shrink-0 shadow-sm shadow-cyan-600/20">
                    <Info size={20} className="text-white" />
                </div>
                <div className="flex-1">
                    <h4 className="text-[13px] font-bold text-slate-900">Partner Advisory</h4>
                    <p className="text-[12px] text-slate-600 leading-snug mt-0.5">
                        Maintain high fulfillment rates to qualify for Elite Supplier status. Instant settlements are processed for all verified deliveries within 24 hours.
                    </p>
                </div>
            </div>

            {/* ── Details Modal ── */}
            {viewOrder && (
                <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-in fade-in duration-300">
                    <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl overflow-hidden animate-in zoom-in-95 duration-300 border border-slate-200">
                        {/* Header */}
                        <div className="border-b border-slate-100 px-6 py-5 flex items-center justify-between">
                            <div>
                                <h3 className="text-[18px] font-bold text-slate-900 tracking-tight">Order #{viewOrder.order_number}</h3>
                                <p className="text-[12px] text-slate-400 mt-0.5 font-medium">Created {new Date(viewOrder.created_at).toLocaleString('en-PK', { day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' })}</p>
                            </div>
                            <button onClick={() => setViewOrder(null)} className="p-2 hover:bg-slate-100 rounded-full transition-colors group">
                                <X size={20} className="text-slate-400 group-hover:text-slate-900" />
                            </button>
                        </div>

                        {/* Modal Content */}
                        <div className="p-6 overflow-y-auto max-h-[75vh]">
                            {/* Summary Grid */}
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-6 mb-8 bg-slate-50 p-5 rounded-2xl border border-slate-100">
                                <div>
                                    <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5">Status</h4>
                                    <span className={cn(
                                        "text-[11px] font-black px-2 py-0.5 rounded-full border uppercase tracking-tight inline-block",
                                        viewOrder.status === 'PENDING' ? "bg-amber-50 text-amber-600 border-amber-200" : "bg-cyan-50 text-cyan-700 border-cyan-200"
                                    )}>
                                        {viewOrder.status}
                                    </span>
                                </div>
                                <div>
                                    <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5">Payment</h4>
                                    <span className={cn(
                                        "text-[11px] font-black px-2 py-0.5 rounded-full border uppercase tracking-tight inline-block",
                                        viewOrder.payment_status === 'PAID' ? "bg-emerald-50 text-emerald-600 border-emerald-200" : "bg-rose-50 text-rose-600 border-rose-200"
                                    )}>
                                        {viewOrder.payment_status || 'UNPAID'}
                                    </span>
                                </div>
                                <div>
                                    <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5">Billing</h4>
                                    <p className="text-[13px] font-bold text-slate-900 uppercase tracking-tight">{viewOrder.payment_method || 'CASH'}</p>
                                </div>
                                <div className="text-right">
                                    <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5">Total Value</h4>
                                    <p className="text-[18px] font-black text-slate-900">{fmt(parseFloat(viewOrder.total_amount))}</p>
                                </div>
                            </div>

                            {/* Admin Notes */}
                            {viewOrder.notes && (
                                <div className="mb-8 p-4 bg-cyan-50/50 border border-cyan-100 rounded-2xl">
                                    <h4 className="text-[11px] font-black text-cyan-700 uppercase tracking-widest mb-2 flex items-center gap-2">
                                        <Info size={14} /> Administrative Notice
                                    </h4>
                                    <p className="text-[13px] text-slate-700 italic leading-relaxed font-medium">"{viewOrder.notes}"</p>
                                </div>
                            )}

                            {/* Items Table */}
                            <div className="border border-slate-200 rounded-2xl overflow-hidden">
                                <table className="w-full text-left border-collapse">
                                    <thead>
                                        <tr className="bg-slate-50 border-b border-slate-200">
                                            <th className="px-5 py-3 text-[11px] font-bold text-slate-400 uppercase tracking-wider">Product Line Item</th>
                                            <th className="px-5 py-3 text-[11px] font-bold text-slate-400 uppercase tracking-wider text-center">Qty</th>
                                            <th className="px-5 py-3 text-[11px] font-bold text-slate-400 uppercase tracking-wider text-right">Rate</th>
                                            <th className="px-5 py-3 text-[11px] font-bold text-slate-400 uppercase tracking-wider text-right">Subtotal</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-100">
                                        {(viewOrder.items || []).map((item: any, idx: number) => (
                                            <tr key={idx} className="hover:bg-slate-50/70 transition-colors">
                                                <td className="px-5 py-4">
                                                    <div className="text-[13px] font-bold text-slate-900">{item.product_name}</div>
                                                    <div className="text-[10px] text-slate-400 font-bold uppercase tracking-tight mt-0.5">SKU: {item.sku || 'N/A'}</div>
                                                </td>
                                                <td className="px-5 py-4 text-center text-[13px] font-black text-slate-900">{item.quantity}</td>
                                                <td className="px-5 py-4 text-right text-[12px] font-bold text-slate-500">{fmt(parseFloat(item.price))}</td>
                                                <td className="px-5 py-4 text-right text-[13px] font-black text-slate-900">{fmt(item.quantity * parseFloat(item.price))}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>

                        {/* Modal Footer */}
                        <div className="bg-slate-50 border-t border-slate-100 px-6 py-4 flex justify-between items-center">
                            <p className="text-[11px] text-slate-400 font-medium italic">* All totals include relevant wholesale discounts.</p>
                            <button
                                onClick={() => setViewOrder(null)}
                                className="px-6 py-2.5 bg-cyan-600 rounded-xl text-[13px] font-bold text-white hover:bg-cyan-700 shadow-sm shadow-cyan-600/20 transition-all"
                            >
                                Close
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
