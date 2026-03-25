'use client';

import React, { useState, useEffect, useRef } from 'react';
import { productService, orderService, userService } from '@/lib/api';
import { purchaseService } from '@/services/purchase.service';
import {
    Bell, AlertTriangle, ShoppingBag, Package,
    ArrowRight, CheckCircle2, Clock, Filter,
    RefreshCw, Search, ChevronRight, UserPlus,
    Activity, ClipboardList, TrendingUp, Check, X, Eye,
    User, MapPin, CreditCard
} from 'lucide-react';
import Link from 'next/link';
import { formatDate } from '@/lib/utils';

export default function AlertsPage() {
    const [loading, setLoading] = useState(true);
    const [alerts, setAlerts] = useState<any[]>([]);
    const [activities, setActivities] = useState<any[]>([]);
    const [filter, setFilter] = useState('all'); // all, alerts, activity
    const [lastUpdated, setLastUpdated] = useState(new Date());
    const pollingRef = useRef<any>(null);
    const [updating, setUpdating] = useState<string | null>(null);
    const [selectedOrder, setSelectedOrder] = useState<any>(null);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [loadingDetails, setLoadingDetails] = useState(false);

    const handleReviewOrder = async (e: React.MouseEvent, orderId: string) => {
        e.preventDefault();
        e.stopPropagation();
        setLoadingDetails(true);
        setIsModalOpen(true);
        try {
            const order = await orderService.getById(orderId);
            setSelectedOrder(order);
        } catch (err) {
            console.error("Fetch order detail error", err);
        } finally {
            setLoadingDetails(false);
        }
    };

    const handleUpdateStatus = async (e: React.MouseEvent, orderId: string, newStatus: string) => {
        e.preventDefault();
        e.stopPropagation();
        setUpdating(orderId);
        try {
            await orderService.update(orderId, { status: newStatus });
            fetchData(true);
        } catch (err) {
            console.error("Status update error", err);
        } finally {
            setUpdating(null);
        }
    };

    const fetchData = async (isSilent = false) => {
        if (!isSilent) setLoading(true);
        try {
            const [pRes, oRes] = await Promise.allSettled([
                productService.getAll(),
                orderService.getAll()
            ]);

            const newAlerts: any[] = [];
            const newActivities: any[] = [];

            // 1. STOCK ALERTS
            if (pRes.status === 'fulfilled') {
                const products = Array.isArray(pRes.value) ? pRes.value : [];
                products.forEach((p: any) => {
                    const stock = parseInt(p.quantity_in_stock ?? p.stock ?? 0);
                    if (stock < 10) {
                        newAlerts.push({
                            id: `stock-${p.id}`,
                            type: 'stock',
                            priority: stock === 0 ? 'high' : 'medium',
                            title: stock === 0 ? 'Out of Stock' : 'Low Stock Warning',
                            message: `"${p.name}" has ${stock} units remaining.`,
                            time: 'Live Monitor',
                            href: `/admin/products?search=${p.name}`,
                            icon: AlertTriangle,
                            color: stock === 0 ? 'text-red-600' : 'text-amber-600',
                            bg: stock === 0 ? 'bg-red-50' : 'bg-amber-50',
                            meta: `SKU: ${p.sku || 'N/A'}`
                        });
                    }
                });
            }

            // 2. ORDER ALERTS (Include 'ordered' for manual confirmation - Now in Activity Feed)
            if (oRes.status === 'fulfilled') {
                const orders = Array.isArray(oRes.value) ? oRes.value : [];
                orders.filter((o: any) => o.status === 'ordered').forEach((o: any) => {
                    const isNew = true; // Always true for 'ordered'
                    newActivities.push({
                        id: `order-${o.id}`,
                        orderId: o.id,
                        type: 'order',
                        status: o.status,
                        title: isNew ? 'Order Approval Required' : (o.status === 'pending' ? 'New Order' : 'Order Processing'),
                        message: `Order #${o.order_number || o.id} from ${o.customer_name || 'Guest'} is ${o.status.toLowerCase()}.`,
                        time: new Date(o.created_at).toLocaleString('en-US', { 
                            hour: 'numeric', 
                            minute: 'numeric', 
                            hour12: true, 
                            month: 'short', 
                            day: 'numeric' 
                        }),
                        href: `/admin/sales?search=${o.order_number}`,
                        icon: isNew ? ShoppingBag : Activity,
                        color: isNew ? 'text-indigo-600' : 'text-blue-600',
                        bg: isNew ? 'bg-indigo-50' : 'bg-blue-50',
                        meta: `Amount: RS ${parseFloat(o.total_amount || 0).toLocaleString()}`
                    });
                });
            }

            // ... (Only order approval tasks remain in newActivities)
            
            setAlerts(newAlerts.sort((a, b) => (a.priority === 'high' ? -1 : 1)));
            setActivities(newActivities);
            setLastUpdated(new Date());
        } catch (err) {
            console.error("Alerts load error", err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchData();
        // Setup Polling (every 15 seconds)
        pollingRef.current = setInterval(() => {
            fetchData(true);
        }, 15000);

        return () => {
            if (pollingRef.current) clearInterval(pollingRef.current);
        };
    }, []);

    return (
        <div className="max-w-[1400px] mx-auto pb-12 font-sans px-4 mt-6">
            {/* Header Area */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6 bg-white dark:bg-slate-900 p-6 border border-gray-200 dark:border-slate-800 rounded shadow-sm">
                <div>
                    <h1 className="text-xl font-bold text-gray-900 dark:text-white tracking-tight flex items-center gap-2">
                        <Bell className="h-6 w-6 text-[#E68A00]" /> Alerts & Tasks Center
                    </h1>
                    <div className="flex items-center gap-3 mt-1">
                        <p className="text-[11px] text-gray-500 dark:text-slate-400 font-medium uppercase tracking-wider">Real-time system monitoring active</p>
                        <span className="flex items-center gap-1.5 text-[10px] text-emerald-600 font-bold bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-100">
                            <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse" /> Live Updating
                        </span>
                    </div>
                </div>
                <div className="flex items-center gap-3">
                    <p className="text-[10px] text-gray-400 font-bold uppercase hidden md:block">Last Sync: {lastUpdated.toLocaleTimeString()}</p>
                    <button
                        onClick={() => fetchData()}
                        className="bg-white dark:bg-slate-800 border border-gray-300 dark:border-slate-700 p-2 rounded hover:bg-gray-50 dark:hover:bg-slate-700 transition-all text-gray-600"
                    >
                        <RefreshCw size={18} className={loading ? 'animate-spin' : ''} />
                    </button>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                
                {/* LEFT COL: ACTIVITY FEED (Now taking main space) */}
                <div className="lg:col-span-2 space-y-6">
                    <div className="flex items-center justify-between mb-2">
                        <h2 className="text-sm font-black text-gray-900 dark:text-white uppercase tracking-widest flex items-center gap-2">
                            <ClipboardList className="w-4 h-4 text-[#007185]" /> Activity Feed
                        </h2>
                    </div>

                    <div className="bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-800 rounded-lg shadow-sm">
                        <div className="divide-y divide-gray-100 dark:divide-slate-800">
                            {activities.length === 0 ? (
                                <div className="p-8 text-center text-gray-400 text-xs italic">No recent activity logged.</div>
                            ) : (
                                activities.map(act => (
                                    <div key={act.id} className="p-4 hover:bg-gray-50 dark:hover:bg-slate-800/50 transition-colors border-b last:border-0 border-gray-100 dark:border-slate-800">
                                        <div className="flex gap-4">
                                            <div className={`w-10 h-10 ${act.bg} ${act.color} rounded flex items-center justify-center shrink-0 mt-0.5`}>
                                                <act.icon size={20} />
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <div className="flex justify-between items-start mb-0.5">
                                                    <p className={`text-xs font-bold uppercase tracking-tight ${act.type === 'order' ? act.color : 'text-gray-900 dark:text-white'}`}>{act.title || (act.type === 'order' ? 'Order Event' : 'System Event')}</p>
                                                    <span className="text-[10px] text-gray-400 font-bold whitespace-nowrap ml-2 italic">{act.time}</span>
                                                </div>
                                                <p className="text-xs text-gray-700 dark:text-gray-300 font-medium">{act.message}</p>
                                                
                                                {act.type === 'order' && act.status === 'ordered' && (
                                                    <div className="flex flex-col sm:flex-row sm:items-center justify-between mt-3 p-3 bg-gray-50/50 dark:bg-slate-800/30 rounded border border-gray-100 dark:border-slate-800 gap-3">
                                                        <div className="flex flex-col gap-1">
                                                            <span className="text-[10px] font-bold text-[#E68A00] bg-orange-50 dark:bg-orange-950/20 px-2 py-0.5 border border-orange-100 dark:border-orange-900/30 rounded w-fit">{act.meta}</span>
                                                            <span className="text-[9px] text-gray-400 font-black uppercase tracking-widest flex items-center gap-1"><Clock size={10} /> Received: {act.time}</span>
                                                        </div>
                                                        <div className="flex gap-2">
                                                            <button 
                                                                onClick={(e) => handleReviewOrder(e, act.orderId)}
                                                                className="h-7 px-3 bg-white border border-gray-200 text-gray-600 hover:bg-gray-50 text-[10px] font-bold uppercase rounded shadow-sm transition-all flex items-center gap-1"
                                                            >
                                                                <Eye size={12} /> Review
                                                            </button>
                                                            <button 
                                                                disabled={!!updating}
                                                                onClick={(e) => handleUpdateStatus(e, act.orderId, 'confirmed')}
                                                                className="h-7 px-3 bg-emerald-600 hover:bg-emerald-700 text-white text-[10px] font-bold uppercase rounded shadow-sm transition-all flex items-center gap-1 disabled:opacity-50"
                                                            >
                                                                <Check size={12} /> Accept
                                                            </button>
                                                            <button 
                                                                disabled={!!updating}
                                                                onClick={(e) => handleUpdateStatus(e, act.orderId, 'rejected')}
                                                                className="h-7 px-3 bg-white border border-red-200 text-red-600 hover:bg-red-50 text-[10px] font-bold uppercase rounded shadow-sm transition-all flex items-center gap-1 disabled:opacity-50"
                                                            >
                                                                <X size={12} /> Reject
                                                            </button>
                                                        </div>
                                                    </div>
                                                )}

                                                <div className="flex items-center justify-between mt-2">
                                                    {!act.status && (
                                                        <span className="text-[10px] text-gray-500 font-medium flex items-center gap-1"><Clock size={10} /> Log Record</span>
                                                    )}
                                                    {act.user && <span className="text-[9px] font-black text-[#E68A00] uppercase tracking-widest">{act.user}</span>}
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                ))
                            )}
                        </div>
                        <div className="p-3 bg-gray-50 dark:bg-slate-800/50 border-t border-gray-100 dark:border-slate-800">
                            <Link href="/admin/users" className="text-[10px] font-black text-[#007185] uppercase tracking-widest flex items-center justify-center gap-1 hover:text-[#E68A00]">
                                View All Logs <TrendingUp size={12} />
                            </Link>
                        </div>
                    </div>
                </div>

                {/* RIGHT COL: SYSTEM ALERTS (Now narrow column) */}
                <div className="space-y-6">
                    <div className="flex items-center justify-between mb-2">
                        <h2 className="text-sm font-black text-gray-900 dark:text-white uppercase tracking-widest flex items-center gap-2">
                            <AlertTriangle className="w-4 h-4 text-amber-500" /> Critical Alerts ({alerts.length})
                        </h2>
                    </div>

                    {loading && alerts.length === 0 ? (
                        <div className="space-y-4">
                            {[1, 2, 3].map(i => <div key={i} className="h-24 bg-white dark:bg-slate-900 border border-gray-100 dark:border-slate-800 rounded-lg animate-pulse" />)}
                        </div>
                    ) : alerts.length === 0 ? (
                        <div className="bg-white dark:bg-slate-900 border border-dashed border-gray-200 dark:border-slate-800 rounded-xl py-12 text-center text-gray-400 text-sm italic">
                            No critical alerts at this time.
                        </div>
                    ) : (
                        <div className="space-y-3">
                            {alerts.map(alert => (
                                <Link key={alert.id} href={alert.href} className="group block bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-800 rounded-lg p-4 hover:border-[#E68A00] transition-all shadow-sm">
                                    <div className="flex flex-col gap-3">
                                        <div className="flex gap-4">
                                            <div className={`w-10 h-10 ${alert.bg} ${alert.color} rounded flex items-center justify-center shrink-0`}>
                                                <alert.icon size={20} />
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <div className="flex justify-between items-start mb-0.5">
                                                    <h3 className={`text-sm font-black uppercase tracking-tight ${alert.color}`}>{alert.title}</h3>
                                                </div>
                                                <p className="text-sm text-gray-700 dark:text-gray-300 font-medium">{alert.message}</p>
                                            </div>
                                        </div>
                                        <div className="flex items-center justify-between mt-1 pt-3 border-t border-gray-50 dark:border-slate-800">
                                            <div className="flex flex-col gap-1">
                                                <span className="text-[10px] font-bold text-gray-400 bg-gray-50 dark:bg-slate-800 px-2 py-0.5 rounded border border-gray-100 dark:border-slate-700 w-fit">{alert.time}</span>
                                                {alert.meta && <span className="text-[9px] text-gray-500 font-bold px-1.5">{alert.meta}</span>}
                                            </div>
                                            
                                            <span className="text-[#007185] group-hover:text-[#E68A00] text-[11px] font-black uppercase flex items-center gap-1">Action <ArrowRight size={12} /></span>
                                        </div>
                                    </div>
                                </Link>
                            ))}
                        </div>
                    )}
                </div>

            </div>

            {/* REVIEW ORDER MODAL */}
            {isModalOpen && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-300">
                    <div className="bg-white dark:bg-slate-900 w-full max-w-2xl rounded-xl shadow-2xl border border-gray-200 dark:border-slate-800 overflow-hidden flex flex-col max-h-[90vh]">
                        {/* Modal Header */}
                        <div className="p-4 border-b border-gray-100 dark:border-slate-800 flex justify-between items-center bg-gray-50/50 dark:bg-slate-900">
                            <div>
                                <h3 className="text-sm font-black uppercase tracking-widest text-gray-900 dark:text-white flex items-center gap-2">
                                    <ShoppingBag size={16} className="text-[#E68A00]" /> Order Review: {selectedOrder?.order_number || 'Loading...'}
                                </h3>
                                {selectedOrder && <p className="text-[10px] text-gray-500 font-bold uppercase mt-0.5 tracking-tighter italic">Captured: {new Date(selectedOrder.created_at).toLocaleString()}</p>}
                            </div>
                            <button onClick={() => { setIsModalOpen(false); setSelectedOrder(null); }} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 transition-colors">
                                <X size={20} />
                            </button>
                        </div>

                        {/* Modal Content */}
                        <div className="flex-1 overflow-y-auto p-6">
                            {loadingDetails ? (
                                <div className="flex flex-col items-center justify-center py-20 gap-4">
                                    <RefreshCw className="h-8 w-8 text-[#007185] animate-spin" />
                                    <p className="text-xs font-bold text-gray-400 uppercase tracking-widest animate-pulse">Fetching inventory & ledger data...</p>
                                </div>
                            ) : selectedOrder ? (
                                <div className="space-y-8">
                                    {/* 1. Customer & Payment Info */}
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                        <div className="space-y-4">
                                            <h4 className="text-[10px] font-black uppercase tracking-[0.2em] text-[#007185] border-b border-[#007185]/10 pb-1">Customer Profile</h4>
                                            <div className="space-y-2">
                                                <p className="text-sm font-bold text-gray-900 dark:text-white flex items-center gap-2"><User size={14} className="text-gray-400" /> {selectedOrder.customer_name || 'Guest Customer'}</p>
                                                <p className="text-xs text-gray-600 dark:text-slate-400 flex items-start gap-2 italic"><MapPin size={14} className="text-gray-400 mt-0.5 shrink-0" /> {selectedOrder.notes || 'No address provided'}</p>
                                            </div>
                                        </div>
                                        <div className="space-y-4">
                                            <h4 className="text-[10px] font-black uppercase tracking-[0.2em] text-[#E68A00] border-b border-[#E68A00]/10 pb-1">Financial Settlement</h4>
                                            <div className="space-y-2">
                                                <p className="text-xs font-bold text-gray-900 dark:text-white flex items-center gap-2 uppercase tracking-tighter"><CreditCard size={14} className="text-gray-400" /> Method: {selectedOrder.payment_method}</p>
                                                <div className="flex items-center gap-2 text-xs">
                                                    <span className={`px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-widest border ${selectedOrder.payment_status === 'completed' ? 'bg-emerald-50 text-emerald-600 border-emerald-100' : 'bg-amber-50 text-amber-600 border-amber-100'}`}>
                                                        {selectedOrder.payment_status}
                                                    </span>
                                                </div>
                                            </div>
                                        </div>
                                    </div>

                                    {/* 2. Order Items */}
                                    <div className="space-y-4">
                                        <h4 className="text-[10px] font-black uppercase tracking-[0.2em] text-gray-500 border-b border-gray-100 dark:border-slate-800 pb-1">Manifest (Line Items)</h4>
                                        <div className="border border-gray-100 dark:border-slate-800 rounded-lg overflow-hidden">
                                            <table className="w-full text-left text-xs">
                                                <thead className="bg-gray-50 dark:bg-slate-800/50 text-[10px] font-black uppercase tracking-tighter text-gray-500">
                                                    <tr>
                                                        <th className="px-4 py-3">Product Name</th>
                                                        <th className="px-4 py-3 text-center">Qty</th>
                                                        <th className="px-4 py-3 text-right">Unit Price</th>
                                                        <th className="px-4 py-3 text-right">Subtotal</th>
                                                    </tr>
                                                </thead>
                                                <tbody className="divide-y divide-gray-50 dark:divide-slate-800 font-medium">
                                                    {selectedOrder.items?.map((item: any) => (
                                                        <tr key={item.id} className="hover:bg-gray-50/50 dark:hover:bg-slate-800/30 transition-colors">
                                                            <td className="px-4 py-3 text-gray-900 dark:text-white font-bold italic">{item.product_name}</td>
                                                            <td className="px-4 py-3 text-center">{item.quantity}</td>
                                                            <td className="px-4 py-3 text-right">RS {parseFloat(item.price).toLocaleString()}</td>
                                                            <td className="px-4 py-3 text-right font-black">RS {(item.quantity * parseFloat(item.price)).toLocaleString()}</td>
                                                        </tr>
                                                    ))}
                                                </tbody>
                                                <tfoot className="bg-gray-50/50 dark:bg-slate-800/50">
                                                    <tr>
                                                        <td colSpan={3} className="px-4 py-3 text-right text-[10px] font-black uppercase tracking-widest text-gray-500">Order Aggregate:</td>
                                                        <td className="px-4 py-3 text-right text-sm font-black text-[#E68A00]">RS {parseFloat(selectedOrder.total_amount).toLocaleString()}</td>
                                                    </tr>
                                                </tfoot>
                                            </table>
                                        </div>
                                    </div>

                                    {/* 3. Action Logic Disclaimer */}
                                    <div className="p-3 bg-indigo-50 dark:bg-indigo-950/20 rounded border border-indigo-100 dark:border-indigo-900/30 text-[10px] text-indigo-700 dark:text-indigo-400 italic">
                                        <strong>Admin Protocol:</strong> Accepting this order will automatically deduct stock from the primary warehouse and record the transaction in the global sales ledger.
                                    </div>
                                </div>
                            ) : (
                                <div className="text-center py-20 text-gray-400 text-xs italic">Failed to initialize order review manifest.</div>
                            )}
                        </div>

                        {/* Modal Footer */}
                        <div className="p-4 border-t border-gray-100 dark:border-slate-800 bg-gray-50 dark:bg-slate-900 flex justify-end gap-3">
                            <button 
                                onClick={() => { setIsModalOpen(false); setSelectedOrder(null); }}
                                className="px-6 py-2 bg-white border border-gray-200 text-gray-600 hover:bg-gray-50 text-[10px] font-black uppercase rounded shadow-sm transition-all"
                            >
                                Close
                            </button>
                            <button 
                                disabled={!!updating || !selectedOrder}
                                onClick={(e) => { handleUpdateStatus(e, selectedOrder.id, 'rejected'); setIsModalOpen(false); }}
                                className="px-6 py-2 bg-white border border-red-200 text-red-600 hover:bg-red-50 text-[10px] font-black uppercase rounded shadow-sm transition-all flex items-center gap-1 disabled:opacity-50"
                            >
                                <X size={12} /> Reject Order
                            </button>
                            <button 
                                disabled={!!updating || !selectedOrder}
                                onClick={(e) => { handleUpdateStatus(e, selectedOrder.id, 'confirmed'); setIsModalOpen(false); }}
                                className="px-6 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-[10px] font-black uppercase rounded shadow-sm transition-all flex items-center gap-1 disabled:opacity-50"
                            >
                                <Check size={12} /> Accept Order
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
