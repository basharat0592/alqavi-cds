'use client';

import { useState, useEffect, Fragment } from 'react';
import { Package, Clock, Search, ChevronRight, Globe, ShoppingBag } from 'lucide-react';
import Link from 'next/link';
import { authService, User as AuthUser } from '@/lib/auth';
import { salesService } from '@/lib/api';
import PageLoader from '@/components/ui/PageLoader';
import { formatDate, formatDateTime } from '@/lib/utils';
export default function CustomerOrdersPage() {
    const [user, setUser] = useState<AuthUser | null>(null);
    const [orders, setOrders] = useState<any[]>([]);
    const [activeTab, setActiveTab] = useState('orders');
    const [expandedOrderId, setExpandedOrderId] = useState<string | null>(null);
    const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
    const [orderToDelete, setOrderToDelete] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');

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
                                <th className="px-6 py-4 text-right">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-[#D5D9D9]">
                            {filtered.map((order) => (
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
                                            <td colSpan={6} className="px-12 py-6">
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
        </div>
    );
}
