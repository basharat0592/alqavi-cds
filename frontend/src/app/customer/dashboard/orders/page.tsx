'use client';

import { useState, useEffect, Fragment } from 'react';
import { Package, Clock, Search, ChevronRight, Globe, ShoppingBag, X, Upload, AlertTriangle, Loader2 } from 'lucide-react';
import Link from 'next/link';
import { authService, User as AuthUser } from '@/lib/auth';
import { salesService } from '@/lib/api';
import { installmentService } from '@/services/payment.service';
import { inventoryService } from '@/services/inventory.service';
import PageLoader from '@/components/ui/PageLoader';
import { formatDate, formatDateTime, formatCurrency } from '@/lib/utils';
export default function CustomerOrdersPage() {
    const [user, setUser] = useState<AuthUser | null>(null);
    const [orders, setOrders] = useState<any[]>([]);
    const [activeTab, setActiveTab] = useState('orders');
    const [expandedOrderId, setExpandedOrderId] = useState<string | null>(null);
    const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
    const [orderToDelete, setOrderToDelete] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');

    // Pagination states
    const [currentPage, setCurrentPage] = useState(1);
    const itemsPerPage = 10;

    // Reset pagination when filter changes
    useEffect(() => {
        setCurrentPage(1);
    }, [search, activeTab]);

    // Modal state for submitting payment
    const [showPayModal, setShowPayModal] = useState(false);
    const [selectedOrder, setSelectedOrder] = useState<any>(null);
    const [amount, setAmount] = useState('');
    const [method, setMethod] = useState('bank_transfer');
    const [selectedWarehouseId, setSelectedWarehouseId] = useState('');
    const [reference, setReference] = useState('');
    const [note, setNote] = useState('');
    const [slip, setSlip] = useState<File | null>(null);
    const [submitting, setSubmitting] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [warehouses, setWarehouses] = useState<any[]>([]);

    useEffect(() => {
        inventoryService.getPublicBranches()
            .then(whs => setWarehouses(whs || []))
            .catch(() => {});
    }, []);

    useEffect(() => {
        setUser(authService.getUser());
        salesService.getOrders()
            .then(setOrders)
            .finally(() => setLoading(false));
    }, []);

    const handleDelete = async (id: string) => {
        try {
            await salesService.deleteOrder(id);
            setOrders(prev => prev.filter(o => o.id !== id));
        } catch (err) {
            alert('Failed to delete order.');
        }
    };

    const openPayModal = (order: any) => {
        const total = Number(order.total_amount || 0);
        const paid = Number(order.amount_paid || 0);
        const remaining = Number(order.remaining_amount ?? (total - paid));

        setSelectedOrder(order);
        setAmount(String(remaining));
        setMethod('bank_transfer');
        setSelectedWarehouseId(order.warehouse || order.warehouse_id || '');
        setReference('');
        setNote('');
        setSlip(null);
        setError(null);
        setShowPayModal(true);
    };

    const handlePaySubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        const amt = Number(amount);
        const total = Number(selectedOrder.total_amount || 0);
        const paid = Number(selectedOrder.amount_paid || 0);
        const remaining = Number(selectedOrder.remaining_amount ?? (total - paid));

        if (!amt || amt <= 0) {
            setError('Please enter a valid amount.');
            return;
        }
        if (amt > remaining) {
            setError(`Amount cannot exceed the remaining balance of Rs. ${remaining.toLocaleString()}.`);
            return;
        }
        if (!selectedWarehouseId) {
            setError('Please select a branch.');
            return;
        }

        setSubmitting(true);
        setError(null);

        try {
            const fd = new FormData();
            fd.append('source_type', 'order');
            fd.append('source_id', selectedOrder.id);
            fd.append('amount', String(amt));
            fd.append('method', method);
            fd.append('warehouse', selectedWarehouseId);
            fd.append('reference', reference);
            fd.append('note', note);
            fd.append('direction', 'inbound');
            fd.append('status', 'pending');
            if (slip) {
                fd.append('slip', slip);
            }

            await installmentService.create(fd);
            setShowPayModal(false);
            
            // Reload orders to reflect updated payment
            salesService.getOrders().then(setOrders);
        } catch (err: any) {
            setError(err?.response?.data ? JSON.stringify(err.response.data) : 'Failed to submit payment.');
        } finally {
            setSubmitting(false);
        }
    };

    const filtered = orders.filter(o => {
        const searchLower = search.toLowerCase();
        const matchesSearch = 
            o.tracking_id.toLowerCase().includes(searchLower) ||
            (o.customer_name || '').toLowerCase().includes(searchLower) ||
            (o.phone_number || '').toLowerCase().includes(searchLower) ||
            (o.status_display || o.status).toLowerCase().includes(searchLower) ||
            o.items?.some((item: any) => item.product_name?.toLowerCase().includes(searchLower));

        if (!matchesSearch) return false;

        // Tab filter
        if (activeTab === 'orders') return o.status !== 'CANCELLED';
        if (activeTab === 'notShip') return ['PENDING', 'CONFIRMED', 'PROCESSING', 'SHIPPED'].includes(o.status);
        if (activeTab === 'cancelled') return o.status === 'CANCELLED';
        return true;
    });

    const paginated = filtered.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);
    const totalPages = Math.ceil(filtered.length / itemsPerPage) || 1;

    if (loading) return <PageLoader />;

    return (
        <div className="space-y-8 animate-in fade-in duration-500">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 border-b border-gray-200 pb-4">
                <div>
                    <h1 className="text-3xl font-normal text-[#111]">Your Orders</h1>
                </div>

                <div className="relative w-full md:w-72">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                    <input
                        type="text"
                        placeholder="Search by ID, name, items..."
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        className="w-full h-8 pl-9 pr-3 bg-white border border-[#D5D9D9] rounded-md text-sm text-[#111] outline-none focus:border-[#F59E0B] shadow-inner"
                    />
                </div>
            </div>

            {/* Tabs */}
            <div className="flex items-center gap-10 border-b border-[#D5D9D9] text-sm overflow-x-auto whitespace-nowrap">
                {[
                    { id: 'orders', label: 'Orders' },
                    { id: 'notShip', label: 'Not Yet Shipped' },
                    { id: 'cancelled', label: 'Cancelled' }
                ].map(tab => (
                    <button
                        key={tab.id}
                        onClick={() => setActiveTab(tab.id)}
                        className={`pb-3 px-1 transition-all relative font-medium ${
                            activeTab === tab.id 
                            ? 'text-[#C45500] border-b-2 border-[#C45500] font-bold' 
                            : 'text-gray-600 hover:text-[#111]'
                        }`}
                    >
                        {tab.label}
                    </button>
                ))}
            </div>

            {orders.length === 0 ? (
                <div className="bg-white rounded-lg p-12 text-center border border-[#D5D9D9]">
                    <div className="w-16 h-16 bg-gray-50 rounded-full flex items-center justify-center mx-auto mb-4">
                        <ShoppingBag className="h-8 w-8 text-gray-300" />
                    </div>
                    <h3 className="text-xl font-bold text-[#111]">No orders found.</h3>
                    <p className="text-sm text-gray-600 mt-2 mb-6">Start shopping to see your orders here.</p>
                    <Link href="/customer" className="inline-block px-6 py-2.5 bg-[#FFD814] hover:bg-[#F7CA00] border border-[#FCD200] rounded-lg text-sm font-medium text-[#111] transition-all">
                        Continue Shopping
                    </Link>
                </div>
            ) : (
                <div className="bg-white border border-[#D5D9D9] rounded-lg overflow-x-auto shadow-sm">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="bg-[#F0F2F2] border-b border-[#D5D9D9] text-[11px] font-bold text-gray-600 uppercase tracking-wider">
                                <th className="px-6 py-4">Date</th>
                                <th className="px-6 py-4">Order #</th>
                                <th className="px-6 py-4">Status</th>
                                <th className="px-6 py-4">Items</th>
                                <th className="px-6 py-4">Total</th>
                                <th className="px-6 py-4">Payment</th>
                                <th className="px-6 py-4 text-right">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-[#D5D9D9]">
                            {paginated.map((order) => (
                                <Fragment key={order.id}>
                                    <tr className="hover:bg-gray-50 transition-colors group">
                                        <td className="px-6 py-4 text-sm text-gray-900 font-medium whitespace-nowrap">
                                            {formatDateTime(order.created_at)}
                                        </td>
                                        <td className="px-6 py-4 text-sm font-bold text-[#111]">
                                            {order.tracking_id}
                                        </td>
                                        <td className="px-6 py-4">
                                            <span className={`px-2 py-1 rounded text-[10px] font-bold uppercase tracking-wider
                                                ${order.status === 'DELIVERED' 
                                                    ? 'bg-[#007600] text-white' 
                                                    : order.status === 'CANCELLED' 
                                                    ? 'bg-red-50 text-red-700' 
                                                    : order.status === 'CANCEL_REQUESTED'
                                                    ? 'bg-amber-50 text-amber-700'
                                                    : 'bg-[#FFD814]/20 text-[#111]'}`}>
                                                {order.status_display || order.status}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 text-sm text-gray-600 font-medium">
                                            {order.items?.length || 0} Products
                                        </td>
                                        <td className="px-6 py-4 text-sm font-bold text-[#B12704]">
                                            Rs. {parseFloat(order.total_amount).toLocaleString()}
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            {(() => {
                                                const total = parseFloat(order.total_amount || '0');
                                                const paid = parseFloat(order.amount_paid || '0');
                                                const remaining = parseFloat(order.remaining_amount ?? String(total - paid));
                                                const isPaid = remaining <= 0;

                                                if (isPaid) {
                                                    return (
                                                        <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-[#007600] text-white uppercase tracking-wider">
                                                            Paid
                                                        </span>
                                                    );
                                                } else {
                                                    return (
                                                        <button
                                                            onClick={() => openPayModal(order)}
                                                            className="px-2.5 py-1 bg-[#FFD814] hover:bg-[#F7CA00] border border-[#FCD200] text-[11px] font-bold text-[#111] rounded shadow-sm transition-all animate-pulse"
                                                        >
                                                            Pay Now
                                                        </button>
                                                    );
                                                }
                                            })()}
                                        </td>
                                        <td className="px-6 py-4 text-right space-x-3 whitespace-nowrap">
                                            <button 
                                                onClick={() => setExpandedOrderId(expandedOrderId === order.id ? null : order.id)}
                                                className="text-xs font-bold text-[#007185] hover:text-[#C45500] hover:underline"
                                            >
                                                {expandedOrderId === order.id ? 'Hide' : 'Details'}
                                            </button>
                                            <Link 
                                                href={`/customer/dashboard/orders/${order.id}/invoice`}
                                                className="text-xs font-bold text-[#007185] hover:text-[#C45500] hover:underline"
                                            >
                                                Invoice
                                            </Link>
                                            <button 
                                                onClick={() => {
                                                    setOrderToDelete(order);
                                                    setIsDeleteModalOpen(true);
                                                }}
                                                className="text-xs font-bold text-red-600 hover:text-red-700 hover:underline"
                                            >
                                                Delete
                                            </button>
                                        </td>
                                    </tr>
                                    {expandedOrderId === order.id && (
                                        <tr className="bg-gray-50 border-t border-[#D5D9D9]">
                                            <td colSpan={7} className="px-12 py-6">
                                                <div className="space-y-4 animate-in slide-in-from-top-2 duration-300">
                                                    <h4 className="text-sm font-bold text-[#111] mb-2 border-b border-gray-200 pb-1">Order Summary</h4>
                                                    <div className="grid md:grid-cols-2 gap-8 text-sm">
                                                        <div>
                                                            <p className="text-xs text-gray-500 font-bold uppercase mb-2">Items Purchased</p>
                                                            <ul className="space-y-2">
                                                                {order.items?.map((item: any, i: number) => (
                                                                    <li key={i} className="flex justify-between items-center text-gray-700 bg-white p-2 rounded border border-gray-100">
                                                                        <span>{item.product_name} <span className="text-gray-400 text-xs">x{item.quantity}</span></span>
                                                                        <span className="font-bold">Rs. {parseFloat(item.price).toLocaleString()}</span>
                                                                    </li>
                                                                ))}
                                                            </ul>
                                                        </div>
                                                        <div className="space-y-4">
                                                            <div>
                                                                <p className="text-xs text-gray-500 font-bold uppercase">Shipping Info</p>
                                                                <p className="text-gray-700 mt-1">{order.notes || 'Default Shipping Address'}</p>
                                                            </div>
                                                            <div className="pt-4 border-t border-gray-200">
                                                                <div className="flex justify-between text-sm font-bold">
                                                                    <span>Grand Total:</span>
                                                                    <span className="text-[#B12704]">Rs. {parseFloat(order.total_amount).toLocaleString()}</span>
                                                                </div>
                                                            </div>
                                                        </div>
                                                    </div>
                                                </div>
                                            </td>
                                        </tr>
                                    )}
                                </Fragment>
                            ))}
                        </tbody>
                    </table>

                    {/* Pagination Footer Controls */}
                    {totalPages > 1 && (
                        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 p-4 bg-slate-50 border-t border-slate-200 text-[12px] text-slate-500 font-medium text-left">
                            <div className="flex items-center gap-1.5 order-2 sm:order-1 text-slate-400 font-bold uppercase tracking-wider text-[10px]">
                                Showing <span className="font-semibold text-slate-700">{((currentPage - 1) * itemsPerPage) + 1}</span> to{' '}
                                <span className="font-semibold text-slate-700">{Math.min(currentPage * itemsPerPage, filtered.length)}</span> of{' '}
                                <span className="font-semibold text-slate-700">{filtered.length}</span> orders
                            </div>
                            <div className="flex items-center gap-2.5 order-1 sm:order-2 w-full sm:w-auto">
                                <button
                                    onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                                    disabled={currentPage === 1}
                                    className="flex-1 sm:flex-initial h-8 px-4 border border-slate-200 bg-white rounded-lg hover:border-slate-355 hover:bg-slate-50 active:scale-95 disabled:opacity-40 transition-all font-bold uppercase tracking-wider text-[10px] text-[#111] disabled:pointer-events-none select-none flex items-center justify-center gap-1.5"
                                >
                                    Previous
                                </button>
                                <div className="text-[11.5px] font-extrabold text-slate-800 tracking-wider tabular-nums px-2">
                                    {currentPage} / {totalPages}
                                </div>
                                <button
                                    onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                                    disabled={currentPage === totalPages}
                                    className="flex-1 sm:flex-initial h-8 px-4 border border-slate-200 bg-white rounded-lg hover:border-slate-355 hover:bg-slate-50 active:scale-95 disabled:opacity-40 transition-all font-bold uppercase tracking-wider text-[10px] text-[#111] disabled:pointer-events-none select-none flex items-center justify-center gap-1.5"
                                >
                                    Next
                                </button>
                            </div>
                        </div>
                    )}
                </div>
            )}

            {/* Custom Delete Modal */}
            {isDeleteModalOpen && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
                    <div className="bg-white rounded-2xl p-8 max-w-sm w-full shadow-2xl scale-in-center">
                        <div className="w-16 h-16 bg-red-50 rounded-full flex items-center justify-center mb-6 mx-auto">
                            <Package className="h-8 w-8 text-red-500" />
                        </div>
                        <h3 className="text-xl font-bold text-gray-900 text-center mb-2">Delete Order?</h3>
                        <p className="text-sm text-gray-500 text-center mb-8">
                            Are you sure you want to delete order <span className="font-bold text-gray-900">#{orderToDelete?.tracking_id}</span>? This action cannot be undone.
                        </p>
                        <div className="flex gap-3">
                            <button
                                onClick={() => setIsDeleteModalOpen(false)}
                                className="flex-1 py-2.5 border border-gray-300 text-gray-600 font-bold rounded-lg hover:bg-gray-50 transition-all"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={async () => {
                                    if (orderToDelete) {
                                        await handleDelete(orderToDelete.id);
                                        setIsDeleteModalOpen(false);
                                    }
                                }}
                                className="flex-1 py-2.5 bg-red-600 text-white font-bold rounded-lg hover:bg-red-700 transition-all shadow-lg shadow-red-500/20"
                            >
                                Confirm Delete
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Custom Payment Record Modal */}
            {showPayModal && selectedOrder && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
                    <div className="bg-white rounded-xl max-w-lg w-full border border-gray-200 shadow-2xl scale-in-center overflow-hidden">
                        <div className="flex justify-between items-center px-5 py-4 border-b border-gray-100 bg-gray-50/50">
                            <h3 className="text-base font-bold text-gray-900">Record Payment</h3>
                            <button 
                                onClick={() => setShowPayModal(false)}
                                className="text-gray-400 hover:text-gray-600"
                            >
                                <X size={18} />
                            </button>
                        </div>

                        <form onSubmit={handlePaySubmit} className="p-6 space-y-4">
                            <div className="flex justify-between items-center bg-gray-50 px-4 py-3 rounded-lg border border-gray-100 text-xs sm:text-sm">
                                <div className="text-left">
                                    <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wide">Order Ref</span>
                                    <p className="font-bold text-gray-900">Order #{selectedOrder.tracking_id}</p>
                                </div>
                                <div className="text-right">
                                    <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wide">Balance Due</span>
                                    <p className="font-black text-rose-600 text-sm sm:text-base">
                                        Rs. {Number(selectedOrder.remaining_amount ?? (Number(selectedOrder.total_amount) - Number(selectedOrder.amount_paid))).toLocaleString()}
                                    </p>
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-4 text-left">
                                <div>
                                    <label className="block text-xs font-bold text-gray-700 mb-1.5">Amount (PKR)</label>
                                    <input
                                        type="number"
                                        required
                                        min={1}
                                        step="0.01"
                                        value={amount}
                                        onChange={(e) => setAmount(e.target.value)}
                                        className="w-full h-10 px-3 border border-[#D5D9D9] rounded-md text-[13px] outline-none focus:border-[#F59E0B] shadow-inner"
                                    />
                                </div>

                                <div>
                                    <label className="block text-xs font-bold text-gray-700 mb-1.5">Method</label>
                                    <select
                                        value={method}
                                        onChange={(e) => setMethod(e.target.value)}
                                        className="w-full h-10 px-2.5 border border-[#D5D9D9] rounded-md text-[13px] bg-white outline-none focus:border-[#F59E0B]"
                                    >
                                        <option value="bank_transfer">Bank Transfer</option>
                                        <option value="wallet">Mobile Wallet</option>
                                        <option value="cheque">Cheque</option>
                                        <option value="cash">Cash / CoD</option>
                                    </select>
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-4 text-left">
                                <div>
                                    <label className="block text-xs font-bold text-gray-700 mb-1.5">Txn ID / Ref</label>
                                    <input
                                        type="text"
                                        required
                                        value={reference}
                                        onChange={(e) => setReference(e.target.value)}
                                        placeholder="Reference #"
                                        className="w-full h-10 px-3 border border-[#D5D9D9] rounded-md text-[13px] outline-none focus:border-[#F59E0B]"
                                    />
                                </div>

                                <div>
                                    <label className="block text-xs font-bold text-gray-700 mb-1.5">Receipt Slip</label>
                                    <label className="flex items-center justify-center gap-1.5 border border-[#D5D9D9] rounded-md h-10 cursor-pointer hover:bg-gray-50 text-[12px] font-bold text-gray-700 px-3 transition-colors">
                                        <Upload size={14} className="text-gray-500 shrink-0" />
                                        <span className="truncate max-w-[100px]">{slip ? slip.name : 'Upload file'}</span>
                                        <input
                                            type="file"
                                            accept="image/*,application/pdf"
                                            className="hidden"
                                            onChange={(e) => setSlip(e.target.files?.[0] || null)}
                                        />
                                    </label>
                                </div>
                            </div>

                            {/* Branch Selection Dropdown */}
                            <div className="text-left">
                                <label className="block text-xs font-bold text-gray-700 mb-1.5">Select Branch</label>
                                <select
                                    value={selectedWarehouseId}
                                    onChange={(e) => setSelectedWarehouseId(e.target.value)}
                                    required
                                    className="w-full h-10 px-2.5 border border-[#D5D9D9] rounded-md text-[13px] bg-white outline-none focus:border-[#F59E0B]"
                                >
                                    <option value="" disabled>Choose a branch...</option>
                                    {warehouses.map((wh) => (
                                        <option key={wh.id} value={wh.id}>
                                            {wh.name} {wh.city ? `(${wh.city})` : ''}
                                        </option>
                                    ))}
                                </select>
                            </div>

                            <div className="text-left">
                                <label className="block text-xs font-bold text-gray-700 mb-1.5">Note (Optional)</label>
                                <input
                                    type="text"
                                    value={note}
                                    onChange={(e) => setNote(e.target.value)}
                                    className="w-full h-10 px-3 border border-[#D5D9D9] rounded-md text-[13px] outline-none focus:border-[#F59E0B]"
                                    placeholder="e.g. Bank name, branch..."
                                />
                            </div>

                            {error && (
                                <div className="p-3 bg-red-50 border border-red-100 rounded-md text-xs text-red-600 font-semibold flex items-start gap-1.5 text-left">
                                    <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5" />
                                    <span>{error}</span>
                                </div>
                            )}

                            <div className="flex gap-3 pt-2">
                                <button
                                    type="button"
                                    onClick={() => setShowPayModal(false)}
                                    className="flex-1 h-10 border border-[#D5D9D9] text-gray-600 font-bold rounded-lg hover:bg-gray-50 transition-all text-xs sm:text-sm"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    disabled={submitting}
                                    className="flex-1 h-10 bg-[#FFD814] hover:bg-[#F7CA00] border border-[#FCD200] text-gray-900 font-bold rounded-lg transition-all text-xs sm:text-sm flex items-center justify-center gap-1.5"
                                >
                                    {submitting ? <Loader2 size={15} className="animate-spin" /> : 'Confirm Payment'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
