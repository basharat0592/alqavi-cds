'use client';

import { useState, useEffect } from 'react';
import { orderService, productService, userService, Order } from '@/lib/api';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { formatCurrency, formatDate } from '@/lib/utils';
import {
    ShoppingBag, Search, X, RefreshCw, Eye,
    CheckCircle, Clock, DollarSign, Printer, Plus, Trash2, Edit,
    AlertTriangle, Loader2, Package, Users
} from 'lucide-react';

function OrderDetailModal({ order, onClose }: { order: Order; onClose: () => void }) {
    const items = order.items || [];
    const c = order.customer as any;
    const customerName = (order as any).customer_name || (c?.first_name
        ? `${c.first_name} ${c.last_name || ''}`.trim()
        : c?.username || c?.email || (typeof order.customer === 'string' ? order.customer : 'Guest'));

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-[#131921]/40 backdrop-blur-sm p-4 animate-in fade-in duration-300">
            <div className="bg-white rounded-3xl shadow-[0_20px_60px_-15px_rgba(0,0,0,0.2)] w-full max-w-2xl max-h-[calc(100vh-8rem)] sm:max-h-[calc(100vh-12rem)] flex flex-col overflow-hidden relative">
                {/* Ambient Glow */}
                <div className="absolute top-0 right-0 w-64 h-64 bg-[#FF9900]/10 rounded-full blur-[80px] pointer-events-none" />

                {/* Header */}
                <div className="flex items-start justify-between px-8 py-7 border-b border-gray-100/60 relative z-10 bg-white/50 backdrop-blur-md">
                    <div className="flex items-center gap-4">
                        <div className="w-12 h-12 bg-gradient-to-br from-[#232F3E] to-[#131921] rounded-2xl flex items-center justify-center shadow-lg shadow-[#232F3E]/20 text-white">
                            <ShoppingBag className="w-5 h-5" strokeWidth={2.5} />
                        </div>
                        <div>
                            <h2 className="text-xl font-black text-gray-900 tracking-tight">
                                Order <span className="text-[#FF9900]">#{order.order_number || order.id}</span>
                            </h2>
                            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mt-1 flex items-center gap-1.5">
                                <Clock className="w-3 h-3 text-gray-300" />
                                {formatDate(order.created_at, { dateStyle: 'medium', timeStyle: 'short' })}
                            </p>
                        </div>
                    </div>
                    <button onClick={onClose} className="p-2 bg-gray-50 hover:bg-gray-100 hover:scale-105 active:scale-95 rounded-full transition-all border border-gray-200/50">
                        <X className="h-4 w-4 text-gray-500" />
                    </button>
                </div>

                <div className="overflow-y-auto flex-1 p-6 sm:p-8 space-y-8 relative z-10 w-full scrollbar-hide">
                    {/* Status & Customer Info */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                        <div className="bg-gradient-to-br from-gray-50 to-white p-5 rounded-2xl border border-gray-100 shadow-sm relative overflow-hidden group hover:border-[#FF9900]/30 transition-all flex flex-col justify-center">
                            <div className="absolute -right-4 -bottom-4 opacity-[0.03] group-hover:scale-110 group-hover:opacity-[0.05] transition-all pointer-events-none">
                                <Users className="w-24 h-24" />
                            </div>
                            <p className="text-[10px] font-black uppercase tracking-widest text-[#FF9900] mb-3">Customer Information</p>
                            <p className="font-black text-gray-900 text-base relative z-10">{customerName}</p>
                            {c?.email && (
                                <p className="text-xs text-gray-500 font-medium mt-1 relative z-10 truncate">{c.email}</p>
                            )}
                            {c?.phone && (
                                <p className="text-xs text-gray-500 font-medium mt-1 relative z-10">{c.phone}</p>
                            )}
                        </div>
                        <div className="bg-gradient-to-br from-gray-50 to-white p-5 rounded-2xl border border-gray-100 shadow-sm flex flex-col justify-center">
                            <p className="text-[10px] font-black uppercase tracking-widest text-[#FF9900] mb-3">Order Status</p>
                            <div className="flex flex-col gap-3">
                                <div className="flex items-center justify-between">
                                    <span className="text-xs font-bold text-gray-500">Fulfillment</span>
                                    <StatusBadge status={order.status} />
                                </div>
                                {order.status !== 'cancelled' && (
                                    <>
                                        <div className="w-full h-px bg-gray-100/80" />
                                        <div className="flex items-center justify-between">
                                            <span className="text-xs font-bold text-gray-500">Payment</span>
                                            <span className="px-2.5 py-1 rounded-lg text-[10px] font-black uppercase tracking-wider bg-white border border-gray-200 text-gray-700 shadow-sm">
                                                {order.payment_status || 'Pending'}
                                            </span>
                                        </div>
                                    </>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* Order Items */}
                    {items.length > 0 && (
                        <div>
                            <div className="flex items-center gap-2 mb-4 px-1">
                                <div className="w-6 h-6 rounded-lg bg-gray-50 border border-gray-100 flex items-center justify-center">
                                    <Package className="w-3.5 h-3.5 text-gray-400" />
                                </div>
                                <p className="text-[11px] font-black uppercase tracking-widest text-gray-400">Order Items</p>
                            </div>
                            <div className="space-y-3">
                                {items.map((item: any, i: number) => (
                                    <div key={i} className="flex items-center gap-4 bg-white p-3 sm:px-5 sm:py-4 rounded-2xl border border-gray-100 shadow-[0_2px_10px_rgba(0,0,0,0.02)] hover:shadow-md hover:border-[#FF9900]/20 transition-all group">
                                        <div className="w-10 h-10 bg-gray-50 rounded-xl flex items-center justify-center flex-shrink-0 group-hover:bg-[#FF9900]/10 border border-gray-100 group-hover:border-[#FF9900]/20 transition-colors">
                                            <Package className="w-4 h-4 text-gray-400 group-hover:text-[#FF9900]" />
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <p className="font-bold text-gray-900 text-sm truncate group-hover:text-[#FF9900] transition-colors">{item.product_name || item.name || `Item ${i + 1}`}</p>
                                            <p className="text-xs text-gray-500 font-medium mt-0.5">Qty: <span className="font-bold text-gray-700">{item.quantity || 1}</span> &times; {formatCurrency(parseFloat(item.price || item.unit_price || 0))}</p>
                                        </div>
                                        <div className="text-right pl-4">
                                            <p className="font-black text-gray-900 text-sm">
                                                {formatCurrency((parseFloat(item.price || item.unit_price || 0) * (item.quantity || 1)))}
                                            </p>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Total summary */}
                    <div className="bg-gradient-to-r from-[#131921] to-[#232F3E] rounded-2xl p-6 sm:px-8 sm:py-7 text-white shadow-xl shadow-[#131921]/10 flex flex-col sm:flex-row items-center justify-between gap-6 transform transition-all hover:scale-[1.01] relative overflow-hidden">
                        <div className="absolute right-0 top-0 w-64 h-64 bg-white/5 rounded-full blur-[60px] pointer-events-none" />

                        <div className="flex items-center justify-center sm:justify-start gap-4 w-full sm:w-auto relative z-10">
                            <div className="w-12 h-12 bg-white/10 rounded-xl flex items-center justify-center backdrop-blur-md border border-white/5">
                                <DollarSign className="w-6 h-6 text-[#FF9900]" />
                            </div>
                            <div className="text-center sm:text-left">
                                <p className="text-[10px] font-black uppercase tracking-widest text-[#FF9900] mb-0.5">Total Amount</p>
                                <p className="text-xs font-medium text-gray-400 mt-0.5">Including all items</p>
                            </div>
                        </div>
                        <div className="w-full sm:w-auto text-center sm:text-right relative z-10">
                            <p className="text-3xl sm:text-4xl font-black text-white tracking-tight">
                                {formatCurrency(order.total_amount || 0)}
                            </p>
                        </div>
                    </div>
                </div>

                {/* Footer Actions */}
                <div className="bg-gray-50/80 backdrop-blur-md border-t border-gray-100/60 px-8 py-5 flex items-center justify-end gap-3 rounded-b-3xl relative z-10">
                    <button onClick={onClose} className="px-6 py-2.5 bg-white border border-gray-200 text-gray-600 font-black text-xs uppercase tracking-widest hover:bg-gray-50 hover:text-gray-900 transition-all rounded-xl shadow-sm">
                        Close
                    </button>
                    <a href={`/admin/sales/${order.id}/invoice`} target="_blank" rel="noopener noreferrer"
                        className="flex items-center gap-2 px-7 py-2.5 bg-gradient-to-r from-[#FF9900] to-[#e68a00] text-[#131921] font-black text-xs uppercase tracking-widest hover:shadow-[0_8px_20px_rgba(255,153,0,0.3)] hover:-translate-y-0.5 active:translate-y-0 disabled:opacity-50 transition-all rounded-xl shadow-md border border-transparent">
                        <Printer className="w-4 h-4" />
                        View Invoice
                    </a>
                </div>
            </div>
        </div>
    );
}

function UpdateStatusModal({ order, onClose, onSuccess }: { order: Order, onClose: () => void, onSuccess: () => void }) {
    const [status, setStatus] = useState(order.status || 'pending');
    const [paymentStatus, setPaymentStatus] = useState(order.payment_status || 'pending');
    const [loading, setLoading] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        try {
            await orderService.update(order.id as string, { status, payment_status: paymentStatus });

            // Auto-create return order if cancelled AND payment was completed
            if (status === 'cancelled' && order.status !== 'cancelled' && order.payment_status === 'completed') {
                if (typeof window !== 'undefined') {
                    const c = order.customer as any;
                    const customerName = (order as any).customer_name || (c?.first_name ? `${c.first_name} ${c.last_name || ''}`.trim() : c?.username || c?.email || (typeof order.customer === 'string' ? order.customer : 'Guest'));

                    const returnItems = (order.items || []).map((i: any) => ({
                        product_name: i.product?.name || `Product ID ${typeof i.product === 'object' ? i.product?.id : i.product}`,
                        quantity: i.quantity,
                        unit_price: i.unit_price || 0,
                        condition: 'Unopened / Sealed'
                    }));

                    const allReturns = JSON.parse(localStorage.getItem('qavi_sale_returns') || '[]');
                    const newReturn = {
                        id: `SR-${Date.now()}`,
                        return_number: `SR-${String(allReturns.length + 1).padStart(4, '0')}`,
                        customer_name: customerName,
                        customer_email: c?.email || '',
                        order_number: order.order_number || String(order.id).slice(-6).toUpperCase(),
                        return_date: new Date().toISOString().slice(0, 10),
                        status: 'pending',
                        refund_method: 'original_payment',
                        items: returnItems,
                        total_amount: order.total_amount || 0,
                        reason: 'Order Cancelled',
                        notes: 'Auto-generated from cancelled sales order',
                        created_at: new Date().toISOString()
                    };
                    allReturns.unshift(newReturn);
                    localStorage.setItem('qavi_sale_returns', JSON.stringify(allReturns));
                }
            }
            onSuccess();
        } catch (error) {
            console.error('Failed to update status', error);
            onSuccess(); // locally optimistic update behavior
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
            <div className="bg-white rounded-2xl border border-gray-200 shadow-2xl w-full max-w-sm flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-200">
                <div className="flex items-center justify-between px-6 py-5 border-b border-gray-100 bg-gray-50/50">
                    <h2 className="text-lg font-black text-gray-900">Update Order</h2>
                    <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-full transition-colors">
                        <X className="h-4 w-4 text-gray-500" />
                    </button>
                </div>
                <form onSubmit={handleSubmit} className="p-6 space-y-6">
                    <div className="space-y-4">
                        <div className="space-y-2">
                            <label className="text-[10px] font-black uppercase tracking-widest text-gray-400">Order Status</label>
                            <select value={status} onChange={e => setStatus(e.target.value)}
                                className="w-full bg-gray-50 border border-gray-200 text-sm font-bold text-gray-900 rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-[#FF9900]/20 focus:border-[#FF9900] transition-all">
                                <option value="pending">Pending</option>
                                <option value="processing">Processing</option>
                                <option value="shipped">Shipped</option>
                                <option value="delivered">Delivered</option>
                                <option value="cancelled">Cancelled</option>
                            </select>
                        </div>
                        {status !== 'cancelled' && (
                            <div className="space-y-2">
                                <label className="text-[10px] font-black uppercase tracking-widest text-gray-400">Payment Status</label>
                                <select value={paymentStatus} onChange={e => setPaymentStatus(e.target.value)}
                                    className="w-full bg-gray-50 border border-gray-200 text-sm font-bold text-gray-900 rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-[#FF9900]/20 focus:border-[#FF9900] transition-all">
                                    <option value="pending">Pending</option>
                                    <option value="completed">Completed</option>
                                    <option value="failed">Failed</option>
                                    <option value="refunded">Refunded</option>
                                </select>
                            </div>
                        )}
                    </div>
                    <div className="pt-2">
                        <button type="submit" disabled={loading}
                            className="w-full py-3 bg-[#131921] text-[#FF9900] font-black text-xs uppercase tracking-widest hover:bg-gray-900 rounded-xl shadow-md border border-[#FF9900]/20 hover:scale-[1.02] active:scale-95 transition-all disabled:opacity-50">
                            {loading ? 'Updating...' : 'Save Changes'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}

function CreateOrderModal({ onClose, onSuccess }: { onClose: () => void, onSuccess: () => void }) {
    const [products, setProducts] = useState<any[]>([]);
    const [users, setUsers] = useState<any[]>([]);

    const [status, setStatus] = useState('pending');
    const [paymentStatus, setPaymentStatus] = useState('pending');
    const [notes, setNotes] = useState('');
    const [customerId, setCustomerId] = useState<string | null>(null);
    const [guestName, setGuestName] = useState('');
    const [items, setItems] = useState<any[]>([]);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        const loadVars = async () => {
            try {
                const [p, u] = await Promise.all([productService.getAll(), userService.getAll()]);
                setProducts(p);
                setUsers(u);
            } catch (e) { }
        };
        loadVars();
    }, []);

    const addItem = () => setItems([...items, { product: null, quantity: 1, price: 0 }]);
    const updateItem = (index: number, field: string, value: any) => {
        const newItems = [...items];
        if (field === 'product') {
            const prod = products.find((p: any) => String(p.id) === String(value));
            newItems[index] = { ...newItems[index], product: prod || null, price: prod ? (prod.price || 0) : 0 };
        } else {
            newItems[index] = { ...newItems[index], [field]: value };
        }
        setItems(newItems);
    };
    const removeItem = (index: number) => {
        const newItems = [...items];
        newItems.splice(index, 1);
        setItems(newItems);
    };

    const totalCalculated = items.reduce((sum, item) => sum + ((item.price || 0) * (item.quantity || 1)), 0);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        try {
            const payload = {
                order_number: `ORD-${Math.floor(Math.random() * 1000000)}`,
                total_amount: totalCalculated,
                status,
                payment_status: paymentStatus,
                notes,
                customer: customerId ? Number(customerId) : null,
                guest_name: !customerId ? guestName : '',
                items: items.map(i => ({
                    product_id: i.product?.id,
                    product_name: i.product?.name,
                    quantity: i.quantity,
                    price: i.price
                }))
            };
            await orderService.create(payload);
            onSuccess();
        } catch (error) {
            console.error('Failed to create order', error);
            // Even if API fails, API service writes to LS, so we can still call onSuccess
            onSuccess();
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
            <div className="bg-white rounded-2xl border border-gray-200 shadow-2xl w-full max-w-3xl max-h-[90vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-200">
                <div className="flex items-center justify-between px-8 py-6 border-b border-gray-100 bg-gradient-to-r from-white to-gray-50/50">
                    <div>
                        <h2 className="text-xl font-black text-gray-900">Create New Order</h2>
                        <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mt-0.5">Manually record a new sale</p>
                    </div>
                    <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-full transition-colors">
                        <X className="h-5 w-5 text-gray-500" />
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-8 space-y-8">

                    {/* Basic Info */}
                    <div className="grid grid-cols-2 gap-6">
                        <div className="space-y-2 col-span-2 sm:col-span-1">
                            <label className="text-[10px] font-black uppercase tracking-widest text-gray-400">Customer</label>
                            <select value={customerId || ''} onChange={e => setCustomerId(e.target.value || null)}
                                className="w-full bg-gray-50 border border-gray-200 text-sm font-bold text-gray-900 rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-[#FF9900]/20 focus:border-[#FF9900] transition-all">
                                <option value="">Guest (No Account)</option>
                                {users.map((u: any) => (
                                    <option key={u.id} value={u.id}>{u.first_name ? `${u.first_name} ${u.last_name || ''}`.trim() : u.email || u.username}</option>
                                ))}
                            </select>
                        </div>
                        {!customerId && (
                            <div className="space-y-2 col-span-2 sm:col-span-1 animate-in fade-in slide-in-from-top-2">
                                <label className="text-[10px] font-black uppercase tracking-widest text-gray-400">Guest Name</label>
                                <input type="text" value={guestName} onChange={e => setGuestName(e.target.value)}
                                    placeholder="Enter guest name"
                                    className="w-full bg-gray-50 border border-gray-200 text-sm font-bold text-gray-900 rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-[#FF9900]/20 focus:border-[#FF9900] transition-all"
                                />
                            </div>
                        )}
                        <div className="space-y-2 col-span-2 sm:col-span-1">
                            <label className="text-[10px] font-black uppercase tracking-widest text-gray-400">Order Status</label>
                            <select value={status} onChange={e => setStatus(e.target.value)}
                                className="w-full bg-gray-50 border border-gray-200 text-sm font-bold text-gray-900 rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-[#FF9900]/20 focus:border-[#FF9900] transition-all">
                                <option value="pending">Pending</option>
                                <option value="processing">Processing</option>
                                <option value="shipped">Shipped</option>
                                <option value="delivered">Delivered</option>
                                <option value="cancelled">Cancelled</option>
                            </select>
                        </div>
                        {status !== 'cancelled' && (
                            <div className="space-y-2 col-span-2 sm:col-span-1">
                                <label className="text-[10px] font-black uppercase tracking-widest text-gray-400">Payment Status</label>
                                <select value={paymentStatus} onChange={e => setPaymentStatus(e.target.value)}
                                    className="w-full bg-gray-50 border border-gray-200 text-sm font-bold text-gray-900 rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-[#FF9900]/20 focus:border-[#FF9900] transition-all">
                                    <option value="pending">Pending</option>
                                    <option value="completed">Completed</option>
                                    <option value="failed">Failed</option>
                                    <option value="refunded">Refunded</option>
                                </select>
                            </div>
                        )}
                    </div>

                    {/* Order Items */}
                    <div>
                        <div className="flex items-center justify-between mb-4">
                            <label className="text-[10px] font-black uppercase tracking-widest text-gray-400">Order Items</label>
                            <button type="button" onClick={addItem}
                                className="text-xs font-black text-[#FF9900] flex items-center gap-1 hover:underline">
                                <Plus className="w-3 h-3" strokeWidth={3} /> Add Item
                            </button>
                        </div>

                        <div className="space-y-3">
                            {items.length === 0 ? (
                                <div className="text-center py-6 bg-gray-50 border border-dashed border-gray-200 rounded-xl">
                                    <p className="text-sm font-medium text-gray-400">No items added to this order yet.</p>
                                </div>
                            ) : (
                                items.map((item, i) => (
                                    <div key={i} className="flex items-center gap-3 bg-white border border-gray-200 p-2 rounded-xl shadow-sm">
                                        <div className="flex-1">
                                            <select
                                                value={item.product?.id || ''}
                                                onChange={e => updateItem(i, 'product', e.target.value)}
                                                className="w-full bg-gray-50 border-none text-sm font-bold text-gray-900 rounded-lg px-3 py-2 outline-none"
                                            >
                                                <option value="">Select a product...</option>
                                                {products.map(p => (
                                                    <option disabled={!(p.stock || p.quantity_in_stock) || (p.stock || p.quantity_in_stock) <= 0} key={p.id} value={p.id}>
                                                        {p.name} - (Stock: {p.stock || p.quantity_in_stock || 0})
                                                    </option>
                                                ))}
                                            </select>
                                        </div>
                                        <div className="w-24">
                                            <input
                                                type="number" min="1"
                                                value={item.quantity}
                                                onChange={e => updateItem(i, 'quantity', parseInt(e.target.value) || 1)}
                                                className="w-full bg-gray-50 border-none text-sm font-bold text-gray-900 rounded-lg px-3 py-2 outline-none text-center"
                                                placeholder="Qty"
                                            />
                                        </div>
                                        <div className="w-28 text-right font-black text-gray-900 text-sm px-2">
                                            {formatCurrency((item.price || 0) * (item.quantity || 1))}
                                        </div>
                                        <button type="button" onClick={() => removeItem(i)}
                                            className="p-2 text-red-500 hover:bg-red-50 rounded-lg transition-colors">
                                            <Trash2 className="w-4 h-4" />
                                        </button>
                                    </div>
                                ))
                            )}
                        </div>

                        <div className="mt-4 flex justify-end">
                            <div className="bg-[#FF9900]/10 border border-[#FF9900]/20 px-6 py-3 rounded-xl flex items-center gap-4">
                                <span className="text-[10px] font-black uppercase tracking-widest text-[#FF9900]">Total</span>
                                <span className="text-xl font-black text-[#FF9900]">{formatCurrency(totalCalculated)}</span>
                            </div>
                        </div>
                    </div>

                    {/* Notes */}
                    <div className="space-y-2">
                        <label className="text-[10px] font-black uppercase tracking-widest text-gray-400">Notes (Optional)</label>
                        <textarea
                            value={notes} onChange={e => setNotes(e.target.value)} rows={3}
                            className="w-full bg-gray-50 border border-gray-200 text-sm font-medium text-gray-900 rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-[#FF9900]/20 focus:border-[#FF9900] transition-all"
                            placeholder="Add any internal notes..."
                        />
                    </div>

                    <div className="pt-6 border-t border-gray-100 flex justify-end gap-3">
                        <button type="button" onClick={onClose}
                            className="px-6 py-3 bg-white border border-gray-200 text-gray-700 font-black text-xs uppercase tracking-widest hover:bg-gray-50 rounded-xl shadow-sm transition-all">
                            Cancel
                        </button>
                        <button type="submit" disabled={loading}
                            className="px-8 py-3 bg-[#131921] text-[#FF9900] font-black text-xs uppercase tracking-widest hover:bg-gray-900 rounded-xl shadow-md border border-[#FF9900]/20 hover:scale-105 active:scale-95 transition-all disabled:opacity-50 disabled:scale-100">
                            {loading ? 'Creating...' : 'Create Order'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}

const STATUS_FILTERS = ['All', 'Pending', 'Processing', 'Shipped', 'Delivered', 'Cancelled'];

export default function SalesPage() {
    const [orders, setOrders] = useState<Order[]>([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');
    const [statusFilter, setStatusFilter] = useState('All');
    const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
    const [orderToUpdate, setOrderToUpdate] = useState<Order | null>(null);
    const [orderToDelete, setOrderToDelete] = useState<Order | null>(null);
    const [deleting, setDeleting] = useState(false);
    const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);

    const load = async () => {
        setLoading(true);
        try {
            const data = await orderService.getAll({ ordering: '-created_at' });
            setOrders(Array.isArray(data) ? data : []);
        } catch { }
        finally { setLoading(false); }
    };

    useEffect(() => { load(); }, []);

    const filtered = orders.filter(o => {
        const q = search.toLowerCase();
        const matchSearch = !search ||
            (o.order_number || '').toLowerCase().includes(q) ||
            String(o.id).toLowerCase().includes(q) ||
            ((o.customer as any)?.first_name || '').toLowerCase().includes(q) ||
            ((o.customer as any)?.last_name || '').toLowerCase().includes(q) ||
            ((o.customer as any)?.email || '').toLowerCase().includes(q) ||
            ((o as any).customer_name || '').toLowerCase().includes(q) ||
            (typeof o.customer === 'string' && o.customer.toLowerCase().includes(q));
        const matchStatus = statusFilter === 'All' || o.status?.toLowerCase() === statusFilter.toLowerCase();
        return matchSearch && matchStatus;
    });

    // Stats
    const totalRevenue = orders.reduce((s, o) => {
        const ps = (o.payment_status || '').toLowerCase();
        if (ps === 'completed') {
            return s + parseFloat(o.total_amount || '0');
        }
        return s;
    }, 0);
    const pendingCount = orders.filter(o => o.status?.toLowerCase() === 'pending').length;
    const deliveredCount = orders.filter(o => o.status?.toLowerCase() === 'delivered').length;

    const getCustomerName = (o: Order) => {
        if ((o as any).customer_name) return (o as any).customer_name;
        const c = o.customer as any;
        if (!c) return 'Guest';
        if (typeof c === 'string') return c;
        const name = `${c.first_name || ''} ${c.last_name || ''}`.trim();
        return name || c.username || c.email || 'Guest';
    };

    const confirmDelete = async () => {
        if (!orderToDelete) return;
        setDeleting(true);
        try {
            await orderService.delete(orderToDelete.id as string);
            load();
        } catch (error) {
            console.error('Failed to delete order', error);
        } finally {
            setDeleting(false);
            setOrderToDelete(null);
        }
    };

    return (
        <div className="max-w-[1600px] mx-auto space-y-6 pb-12 font-sans px-3 sm:px-6 mt-6 relative z-0">

            {/* Ambient Glow */}
            <div className="fixed top-0 left-0 w-full h-full overflow-hidden pointer-events-none -z-10">
                <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] rounded-full bg-[#FF9900]/10 blur-[120px]" />
                <div className="absolute top-[20%] right-[-10%] w-[30%] h-[50%] rounded-full bg-orange-50/30 blur-[100px]" />
            </div>

            {/* ── Merged Header + Stats Card ── */}
            <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
                <div className="absolute top-0 right-0 w-64 h-64 bg-[#FF9900]/6 rounded-full blur-[80px] -z-10 pointer-events-none" />

                {/* Title + Refresh */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 px-7 sm:px-10 pt-7 pb-5 border-b border-gray-100/60">
                    <div className="flex items-center gap-4">
                        <div className="w-11 h-11 bg-[#FF9900] rounded-xl flex items-center justify-center flex-shrink-0">
                            <ShoppingBag className="h-5 w-5 text-[#131921]" strokeWidth={2.5} />
                        </div>
                        <div>
                            <h1 className="text-xl font-black text-gray-900 tracking-tight">Orders</h1>
                            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mt-0.5">
                                Manage and track all customer orders
                            </p>
                        </div>
                    </div>
                    <div className="flex items-center gap-3 self-start sm:self-auto">
                        <button onClick={load} disabled={loading}
                            className="flex items-center gap-2 px-5 py-2.5 bg-white border border-gray-200 text-gray-700 font-black text-xs uppercase tracking-widest hover:bg-gray-50 hover:shadow-sm transition-all rounded-xl disabled:opacity-50">
                            <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} strokeWidth={2.5} />
                            Refresh
                        </button>
                        <button onClick={() => setIsCreateModalOpen(true)}
                            className="flex items-center gap-2 px-5 py-2.5 bg-[#FF9900] text-[#131921] font-black text-xs uppercase tracking-widest hover:bg-[#e68a00] hover:shadow-md transition-all rounded-xl shadow-sm border border-[#FF9900]">
                            <Plus className="h-4 w-4" strokeWidth={3} />
                            Add Order
                        </button>
                    </div>
                </div>

                {/* 4 Stat strips */}
                <div className="grid grid-cols-2 sm:grid-cols-4 divide-x divide-gray-100/60">
                    <div className="flex items-center justify-between px-6 sm:px-8 py-4">
                        <div>
                            <p className="text-[9px] font-black uppercase tracking-widest text-gray-400 mb-0.5">Total Orders</p>
                            <p className="text-2xl font-black text-gray-900 tracking-tight">{loading ? '—' : orders.length}</p>
                        </div>
                        <div className="w-9 h-9 bg-white border border-gray-100 rounded-xl flex items-center justify-center shadow-sm">
                            <ShoppingBag className="w-4 h-4 text-gray-400" />
                        </div>
                    </div>
                    <div className="flex items-center justify-between px-6 sm:px-8 py-4">
                        <div>
                            <p className="text-[9px] font-black uppercase tracking-widest text-[#FF9900] mb-0.5">Revenue</p>
                            <p className="text-2xl font-black text-[#FF9900] tracking-tight">
                                {loading ? '—' : formatCurrency(totalRevenue)}
                            </p>
                        </div>
                        <div className="w-9 h-9 bg-[#FF9900]/10 border border-[#FF9900]/20 flex items-center justify-center shadow-sm">
                            <DollarSign className="w-4 h-4 text-[#FF9900]" />
                        </div>
                    </div>
                    <div className="flex items-center justify-between px-6 sm:px-8 py-4">
                        <div>
                            <p className="text-[9px] font-black uppercase tracking-widest text-yellow-600 mb-0.5">Pending</p>
                            <p className="text-2xl font-black text-yellow-600 tracking-tight">{loading ? '—' : pendingCount}</p>
                        </div>
                        <div className="w-9 h-9 bg-yellow-50 border border-yellow-100 rounded-xl flex items-center justify-center shadow-sm">
                            <Clock className="w-4 h-4 text-yellow-500" />
                        </div>
                    </div>
                    <div className="flex items-center justify-between px-6 sm:px-8 py-4">
                        <div>
                            <p className="text-[9px] font-black uppercase tracking-widest text-emerald-600 mb-0.5">Delivered</p>
                            <p className="text-2xl font-black text-emerald-600 tracking-tight">{loading ? '—' : deliveredCount}</p>
                        </div>
                        <div className="w-9 h-9 bg-emerald-50 border border-emerald-100 rounded-xl flex items-center justify-center shadow-sm">
                            <CheckCircle className="w-4 h-4 text-emerald-500" />
                        </div>
                    </div>
                </div>
            </div>

            {/* ── Orders Table Card ── */}
            <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-3/4 h-3/4 bg-[#FF9900]/4 blur-[100px] pointer-events-none -z-10" />

                {/* Search + Status Pills */}
                <div className="px-5 sm:px-8 py-5 border-b border-gray-100/50 bg-gradient-to-b from-white to-transparent flex flex-col sm:flex-row items-center gap-4 relative z-10">
                    <div className="flex items-center gap-2.5 bg-white border border-gray-200 px-4 py-2.5 flex-1 min-w-[180px] focus-within:ring-2 focus-within:ring-[#FF9900]/20 focus-within:border-[#FF9900] shadow-sm transition-all">
                        <Search className="h-4 w-4 text-gray-400 flex-shrink-0" strokeWidth={2.5} />
                        <input
                            type="text"
                            value={search}
                            onChange={e => setSearch(e.target.value)}
                            placeholder="Search by order #, customer name or email..."
                            className="text-sm text-gray-900 outline-none w-full bg-transparent font-bold placeholder:font-medium placeholder:text-gray-400"
                        />
                        {search && (
                            <button onClick={() => setSearch('')} className="text-gray-300 hover:text-gray-500 transition-colors">
                                <X className="h-3.5 w-3.5" />
                            </button>
                        )}
                    </div>

                    {/* Status filter pills */}
                    <div className="flex gap-2 flex-wrap">
                        {STATUS_FILTERS.map(s => (
                            <button key={s} onClick={() => setStatusFilter(s)}
                                className={`px-3 py-2 text-[10px] font-black uppercase tracking-widest rounded-xl border transition-all duration-200 ${statusFilter === s
                                    ? 'bg-[#FF9900] text-[#131921] border-transparent shadow-sm -translate-y-0.5'
                                    : 'bg-white border-gray-200 text-gray-600 hover:bg-gray-50'
                                    }`}>
                                {s}
                            </button>
                        ))}
                    </div>

                    <span className="text-[10px] font-black uppercase tracking-widest text-[#FF9900] whitespace-nowrap bg-[#FF9900]/10 px-3 py-2 border border-[#FF9900]/20">
                        {filtered.length} order{filtered.length !== 1 ? 's' : ''}
                    </span>
                </div>

                {/* Table */}
                {loading ? (
                    <div className="py-24 flex flex-col items-center justify-center">
                        <div className="w-10 h-10 border-4 border-[#FF9900]/20 border-t-[#FF9900] rounded-full animate-spin mb-4" />
                        <p className="text-xs font-bold text-gray-400 uppercase tracking-widest">Loading orders...</p>
                    </div>
                ) : filtered.length === 0 ? (
                    <div className="py-24 text-center px-6">
                        <div className="w-16 h-16 bg-gray-50 rounded-full flex items-center justify-center mx-auto mb-4 border border-gray-100">
                            <ShoppingBag className="h-8 w-8 text-gray-300" />
                        </div>
                        <p className="font-black text-gray-900 mb-1">
                            {search || statusFilter !== 'All' ? 'No orders match your filters' : 'No orders yet'}
                        </p>
                        <p className="text-sm font-medium text-gray-400 mt-1">
                            {search || statusFilter !== 'All' ? 'Try adjusting your search or status filter.' : 'Orders will appear here once customers start purchasing.'}
                        </p>
                        {(search || statusFilter !== 'All') && (
                            <button onClick={() => { setSearch(''); setStatusFilter('All'); }}
                                className="mt-4 text-xs font-black text-[#FF9900] uppercase tracking-widest hover:underline">
                                Clear filters
                            </button>
                        )}
                    </div>
                ) : (
                    <div className="overflow-x-auto relative z-10">
                        <table className="w-full text-sm">
                            <thead>
                                <tr className="bg-gray-50/80 border-b border-gray-100 text-[10px] font-black text-gray-400 uppercase tracking-widest">
                                    <th className="text-left px-8 py-4">Order</th>
                                    <th className="text-left px-6 py-4">Customer</th>
                                    <th className="text-left px-6 py-4">Date</th>
                                    <th className="text-left px-6 py-4">Items</th>
                                    <th className="text-left px-6 py-4">Total</th>
                                    <th className="text-left px-6 py-4">Status</th>
                                    <th className="text-center px-6 py-4">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-50">
                                {filtered.map(order => (
                                    <tr key={order.id}
                                        className="hover:bg-white/60 transition-all duration-300 group border-b border-gray-50/50 last:border-0">
                                        <td className="px-8 py-4">
                                            <div className="flex items-center gap-3">
                                                <div className="w-10 h-10 bg-gradient-to-br from-[#FF9900]/10 to-[#FF9900]/20 rounded-xl flex items-center justify-center flex-shrink-0 group-hover:scale-105 transition-transform duration-300 border border-[#FF9900]/20">
                                                    <ShoppingBag className="h-4 w-4 text-[#FF9900]" strokeWidth={2.5} />
                                                </div>
                                                <div>
                                                    <p className="font-black text-gray-900 text-sm group-hover:text-[#FF9900] transition-colors">
                                                        #{order.order_number || String(order.id).slice(-6).toUpperCase()}
                                                    </p>
                                                    <p className="text-[9px] text-gray-400 font-bold uppercase tracking-widest mt-0.5">
                                                        ID: {String(order.id).slice(0, 8)}
                                                    </p>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <p className="font-black text-gray-900 text-sm">{getCustomerName(order)}</p>
                                            {(order.customer as any)?.email && (
                                                <p className="text-[10px] text-gray-400 font-medium mt-0.5">{(order.customer as any).email}</p>
                                            )}
                                        </td>
                                        <td className="px-6 py-4 text-[11px] font-bold text-gray-500 uppercase tracking-widest">
                                            {formatDate(order.created_at)}
                                        </td>
                                        <td className="px-6 py-4">
                                            <span className="bg-gray-100 text-gray-600 px-3 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-widest">
                                                {(order.items || []).length} item{(order.items || []).length !== 1 ? 's' : ''}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 font-black text-gray-900">
                                            {formatCurrency(order.total_amount || 0)}
                                        </td>
                                        <td className="px-6 py-4">
                                            <StatusBadge status={order.status} />
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="flex items-center justify-center gap-2">
                                                <button onClick={() => setSelectedOrder(order)}
                                                    className="p-2 bg-white border border-gray-100 hover:border-[#FF9900]/20 hover:bg-[#FF9900]/5 text-[#FF9900] rounded-xl hover:scale-110 hover:shadow-sm transition-all shadow-sm"
                                                    title="View Details">
                                                    <Eye className="h-4 w-4" strokeWidth={2.5} />
                                                </button>
                                                <button onClick={() => setOrderToUpdate(order)}
                                                    className="p-2 bg-white border border-gray-100 hover:border-blue-500/20 hover:bg-blue-500/5 text-blue-500 rounded-xl hover:scale-110 hover:shadow-sm transition-all shadow-sm"
                                                    title="Update Status">
                                                    <Edit className="h-4 w-4" strokeWidth={2.5} />
                                                </button>
                                                <button onClick={() => setOrderToDelete(order)}
                                                    className="p-2 bg-white border border-gray-100 hover:border-red-500/20 hover:bg-red-500/5 text-red-500 rounded-xl hover:scale-110 hover:shadow-sm transition-all shadow-sm"
                                                    title="Delete Order">
                                                    <Trash2 className="h-4 w-4" strokeWidth={2.5} />
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>

            {/* Order Detail Modal */}
            {selectedOrder && (
                <OrderDetailModal order={selectedOrder} onClose={() => setSelectedOrder(null)} />
            )}

            {/* Update Status Modal */}
            {orderToUpdate && (
                <UpdateStatusModal
                    order={orderToUpdate}
                    onClose={() => setOrderToUpdate(null)}
                    onSuccess={() => { setOrderToUpdate(null); load(); }}
                />
            )}

            {/* Create Order Modal */}
            {isCreateModalOpen && (
                <CreateOrderModal
                    onClose={() => setIsCreateModalOpen(false)}
                    onSuccess={() => { setIsCreateModalOpen(false); load(); }}
                />
            )}

            {/* Delete Confirmation Modal */}
            {orderToDelete && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
                    <div className="bg-white rounded-2xl border border-gray-200 shadow-2xl w-full max-w-md overflow-hidden animate-in fade-in zoom-in-95 duration-200">
                        <div className="flex items-center gap-4 px-6 py-5 border-b border-gray-100 bg-red-50/50">
                            <div className="w-10 h-10 bg-red-100 rounded-xl flex items-center justify-center flex-shrink-0 border border-red-200">
                                <AlertTriangle className="h-5 w-5 text-red-600" strokeWidth={2.5} />
                            </div>
                            <div>
                                <h2 className="text-lg font-black text-gray-900 tracking-tight">Delete Order</h2>
                                <p className="text-[10px] font-bold text-gray-500 uppercase tracking-widest mt-0.5">This action cannot be undone</p>
                            </div>
                        </div>
                        <div className="p-6">
                            <p className="text-sm font-medium text-gray-600 mb-3 leading-relaxed">
                                Are you sure you want to permanently delete order <span className="font-black text-gray-900">#{orderToDelete.order_number || orderToDelete.id}</span>?
                            </p>
                        </div>
                        <div className="px-6 py-4 bg-gray-50/50 flex justify-end gap-3 border-t border-gray-100">
                            <button onClick={() => setOrderToDelete(null)} disabled={deleting}
                                className="px-5 py-2.5 bg-white border border-gray-200 text-gray-700 font-black text-xs uppercase tracking-widest rounded-xl hover:bg-gray-50 transition-all">
                                Cancel
                            </button>
                            <button onClick={confirmDelete} disabled={deleting}
                                className="flex items-center gap-2 px-6 py-2.5 bg-red-600 text-white font-black text-xs uppercase tracking-widest rounded-xl hover:bg-red-700 transition-all shadow-md shadow-red-600/20 disabled:opacity-60">
                                {deleting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
                                {deleting ? 'Deleting...' : 'Yes, Delete'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
