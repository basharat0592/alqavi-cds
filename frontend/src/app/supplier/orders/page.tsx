'use client';

import { useState, useEffect } from 'react';
import { 
    ShoppingBag, Search, Filter, RefreshCw, 
    Clock, CheckCircle2, Truck, AlertTriangle,
    Eye, FileText, Download
} from 'lucide-react';
import { supplierService } from '@/services/supplier.service';
import { cn } from '@/lib/utils';

export default function SupplierOrdersPage() {
    const [orders, setOrders] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [selectedOrder, setSelectedOrder] = useState<any | null>(null);
    const [isSubmitting, setIsSubmitting] = useState(false);

    const loadOrders = async () => {
        setLoading(true);
        try {
            const res = await supplierService.getOrders();
            setOrders(res);
        } catch (error) {
            console.error(error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadOrders();
    }, []);

    const handleUpdateStatus = async (id: string, status: string) => {
        setIsSubmitting(true);
        try {
            await supplierService.updateOrderStatus(id, status);
            setSelectedOrder(null);
            loadOrders();
        } catch (error) {
            alert("Failed to update status");
        } finally {
            setIsSubmitting(false);
        }
    };

    const getStatusStyle = (status: string) => {
        switch (status) {
            case 'DELIVERED': return 'bg-emerald-50 text-emerald-700 border-emerald-100';
            case 'ACCEPTED': return 'bg-blue-50 text-blue-700 border-blue-100';
            case 'PENDING': return 'bg-amber-50 text-amber-700 border-amber-100';
            case 'CANCELLED': return 'bg-red-50 text-red-700 border-red-100';
            default: return 'bg-slate-50 text-slate-700 border-slate-100';
        }
    };

    return (
        <div className="space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-black text-slate-900 tracking-tight uppercase">Order Fulfillment</h1>
                    <p className="text-sm font-bold text-slate-500 mt-0.5">Manage incoming purchase orders from Al-Qavi administrative team.</p>
                </div>
                <div className="flex items-center gap-2">
                    <button onClick={loadOrders} className="p-3 bg-white border border-slate-200 rounded-xl text-slate-500 hover:text-amber-600 transition-all shadow-sm">
                        <RefreshCw className={cn("h-4 w-4", loading && "animate-spin")} />
                    </button>
                    <button className="flex items-center gap-2 px-6 py-3 bg-[#111] text-white rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-[#F59E0B] transition-all shadow-xl shadow-slate-900/10">
                        <Download className="h-4 w-4" /> Export Ledger
                    </button>
                </div>
            </div>

            {/* Orders Feed */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                <div className="lg:col-span-2 space-y-4">
                    {loading ? (
                        Array(3).fill(0).map((_, i) => (
                            <div key={i} className="bg-white h-32 rounded-3xl border border-slate-200 animate-pulse" />
                        ))
                    ) : orders.length === 0 ? (
                        <div className="bg-white rounded-3xl border border-slate-200 p-16 text-center">
                            <ShoppingBag className="h-12 w-12 text-slate-200 mx-auto mb-4" />
                            <p className="text-sm font-bold text-slate-400 uppercase tracking-widest">No orders received yet.</p>
                        </div>
                    ) : (
                        orders.map((order: any) => (
                            <div 
                                key={order.id} 
                                className={cn(
                                    "bg-white rounded-3xl border transition-all cursor-pointer group",
                                    selectedOrder?.id === order.id ? "border-amber-500 ring-4 ring-amber-500/5 shadow-xl" : "border-slate-200 hover:border-amber-300 shadow-sm"
                                )}
                                onClick={() => setSelectedOrder(order)}
                            >
                                <div className="p-6 sm:p-8 flex flex-col sm:flex-row sm:items-center justify-between gap-6">
                                    <div className="flex items-center gap-5">
                                        <div className={cn(
                                            "h-14 w-14 rounded-2xl flex items-center justify-center border-2 shrink-0 transition-transform group-hover:scale-105",
                                            order.status === 'DELIVERED' ? "bg-emerald-50 border-emerald-100 text-emerald-600" :
                                            order.status === 'PENDING' ? "bg-amber-50 border-amber-100 text-amber-600" :
                                            "bg-blue-50 border-blue-100 text-blue-600"
                                        )}>
                                            <ShoppingBag className="h-6 w-6" />
                                        </div>
                                        <div>
                                            <div className="flex items-center gap-2 mb-1">
                                                <p className="text-sm font-black text-slate-900 font-mono italic tracking-tighter">{order.tracking_id}</p>
                                                <span className={cn("px-2.5 py-0.5 rounded-full text-[9px] font-black uppercase tracking-widest border", getStatusStyle(order.status))}>
                                                    {order.status}
                                                </span>
                                            </div>
                                            <div className="flex items-center gap-4 text-[10px] font-bold text-slate-500 uppercase">
                                                <span className="flex items-center gap-1"><Clock className="h-3 w-3" /> {new Date(order.created_at).toLocaleDateString()}</span>
                                                <span className="flex items-center gap-1 font-black text-slate-700"><FileText className="h-3 w-3" /> {order.item_count} Items</span>
                                            </div>
                                        </div>
                                    </div>
                                    <div className="flex items-center justify-between sm:justify-end gap-8 border-t sm:border-t-0 pt-4 sm:pt-0 border-slate-50">
                                        <div className="text-left sm:text-right">
                                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Grand Total</p>
                                            <p className="text-xl font-black text-slate-900 tracking-tight">PKR {parseFloat(order.total_amount).toLocaleString()}</p>
                                        </div>
                                        <div className="p-2 bg-slate-50 rounded-xl text-slate-400 group-hover:text-amber-500 group-hover:bg-amber-50 transition-all">
                                            <Eye className="h-5 w-5" />
                                        </div>
                                    </div>
                                </div>
                            </div>
                        ))
                    )}
                </div>

                {/* Sidebar - Order Details & Actions */}
                <div className="lg:col-span-1">
                    <div className="bg-white rounded-3xl border border-slate-200 shadow-xl overflow-hidden sticky top-24">
                        {!selectedOrder ? (
                            <div className="p-12 text-center">
                                <AlertTriangle className="h-10 w-10 text-slate-100 mx-auto mb-4" />
                                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-relaxed px-4">
                                    Select a purchase order to view manifest and update fulfillment status.
                                </p>
                            </div>
                        ) : (
                            <div className="flex flex-col h-full animate-in slide-in-from-right-4 duration-300">
                                <div className="p-8 border-b border-slate-50 bg-slate-50/50">
                                    <p className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] mb-2">Order Registry</p>
                                    <h3 className="text-2xl font-black text-slate-900 font-mono tracking-tighter">{selectedOrder.tracking_id}</h3>
                                    <div className="mt-4 p-3 bg-white rounded-xl border border-slate-100 shadow-sm flex items-center justify-between">
                                        <div className="flex items-center gap-2">
                                            <div className="w-2 h-2 rounded-full bg-emerald-500" />
                                            <p className="text-[10px] font-bold text-slate-600 uppercase">From: Admin Team</p>
                                        </div>
                                        <span className="text-[9px] font-black text-slate-400">{new Date(selectedOrder.created_at).toLocaleTimeString()}</span>
                                    </div>
                                </div>

                                <div className="p-8 space-y-6">
                                    <div className="space-y-4">
                                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Manifest items</p>
                                        <div className="space-y-3">
                                            {selectedOrder.items?.map((item: any) => (
                                                <div key={item.id} className="flex items-center justify-between group/item">
                                                    <div className="flex items-center gap-3">
                                                        <div className="w-8 h-8 rounded-lg bg-slate-50 flex items-center justify-center text-[10px] font-black text-slate-500 border border-slate-100 group-hover/item:border-amber-200 transition-colors">
                                                            x{item.quantity}
                                                        </div>
                                                        <p className="text-xs font-bold text-slate-800 truncate max-w-[120px]">{item.product_name}</p>
                                                    </div>
                                                    <p className="text-xs font-black text-slate-600">PKR {parseFloat(item.cost_price).toLocaleString()}</p>
                                                </div>
                                            ))}
                                        </div>
                                    </div>

                                    <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100">
                                        <div className="flex justify-between items-center mb-1">
                                            <p className="text-[10px] font-black text-slate-400 uppercase italic">Subtotal</p>
                                            <p className="text-xs font-bold text-slate-600">PKR {parseFloat(selectedOrder.total_amount).toLocaleString()}</p>
                                        </div>
                                        <div className="flex justify-between items-center mt-2 pt-2 border-t border-slate-200">
                                            <p className="text-xs font-black text-slate-900 uppercase">Settlement</p>
                                            <p className="text-sm font-black text-amber-600 tracking-tight">PKR {parseFloat(selectedOrder.total_amount).toLocaleString()}</p>
                                        </div>
                                    </div>

                                    <div className="space-y-3 pt-6 border-t border-slate-100">
                                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Fulfillment Control</p>
                                        {selectedOrder.status === 'PENDING' && (
                                            <button 
                                                onClick={() => handleUpdateStatus(selectedOrder.id, 'ACCEPTED')}
                                                disabled={isSubmitting}
                                                className="w-full py-4 bg-blue-600 text-white rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-blue-700 transition-all shadow-lg shadow-blue-500/20 disabled:opacity-50"
                                            >
                                                Accept Order
                                            </button>
                                        )}
                                        {selectedOrder.status === 'ACCEPTED' && (
                                            <button 
                                                onClick={() => handleUpdateStatus(selectedOrder.id, 'DELIVERED')}
                                                disabled={isSubmitting}
                                                className="w-full py-4 bg-emerald-600 text-white rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-emerald-700 transition-all shadow-lg shadow-emerald-500/20 flex items-center justify-center gap-2 group disabled:opacity-50"
                                            >
                                                <Truck className="h-4 w-4 group-hover:translate-x-1 transition-transform" />
                                                Mark Delivered & Auto-Stock
                                            </button>
                                        )}
                                        {selectedOrder.status === 'DELIVERED' && (
                                            <div className="p-4 bg-emerald-50 rounded-2xl border border-emerald-100 flex items-center gap-3">
                                                <CheckCircle2 className="h-5 w-5 text-emerald-500 shrink-0" />
                                                <p className="text-[10px] font-black text-emerald-700 uppercase leading-snug">
                                                    Transaction finalized. Items synced to Al-Qavi stock system.
                                                </p>
                                            </div>
                                        )}
                                        <button className="w-full py-3 bg-slate-50 text-slate-500 rounded-xl text-[9px] font-black uppercase tracking-widest hover:bg-slate-100 transition-all">
                                            Download Invoice
                                        </button>
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}
