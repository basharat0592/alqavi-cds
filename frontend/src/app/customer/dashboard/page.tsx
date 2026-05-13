'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import {
    Package,
    ShoppingBag,
    Heart,
    ShieldCheck,
    ChevronRight,
    Clock
} from 'lucide-react';
import { authService, User as AuthUser } from '@/lib/auth';
import { salesService } from '@/lib/api';
import { formatDate } from '@/lib/utils';
import PageLoader from '@/components/ui/PageLoader';

export default function CustomerDashboard() {
    const [user, setUser] = useState<AuthUser | null>(null);
    const [orders, setOrders] = useState<any[]>([]);
    const [expandedOrderId, setExpandedOrderId] = useState<string | null>(null);
    const [loading, setLoading] = useState(true);
    const router = useRouter();

    useEffect(() => {
        setUser(authService.getUser());
        salesService.getOrders()
            .then(data => {
                const activeOrders = data.filter((o: any) =>
                    !['DELIVERED', 'CANCELLED'].includes(o.status.toUpperCase())
                );
                setOrders(activeOrders.slice(0, 5));
            })
            .finally(() => setLoading(false));
    }, []);

    if (loading) return <PageLoader />;

    return (
        <div className="w-full py-4 sm:py-8 animate-in fade-in duration-500">
            {/* Header Area */}
            <div className="mb-10">
                <h1 className="text-3xl font-normal text-[#111]">Your Account</h1>
                <p className="text-sm text-gray-600 mt-2">
                    Hello, <span className="font-bold text-gray-900">{user?.name}</span>. View your recent orders and manage your account settings from the sidebar.
                </p>
            </div>

            {/* Recent Orders Section */}
            <section className="mb-12">
                <div className="flex items-center justify-between mb-4 border-b border-[#D5D9D9] pb-2">
                    <h2 className="text-xl font-bold text-[#111]">Active Orders</h2>
                    <Link href="/customer/dashboard/orders" className="text-sm text-[#007185] hover:text-[#C45500] hover:underline">
                        View All Orders
                    </Link>
                </div>

                {orders.length === 0 ? (
                    <div className="bg-white border border-[#D5D9D9] rounded-lg p-10 text-center">
                        <ShoppingBag className="h-12 w-12 text-gray-200 mx-auto mb-4" />
                        <h3 className="text-lg font-bold text-[#111]">No recent orders found</h3>
                        <p className="text-sm text-gray-600 mt-1 mb-6">You haven't placed any orders yet. Start shopping to see them here.</p>
                        <Link href="/customer/shop" className="inline-block px-8 py-2 bg-[#FFD814] hover:bg-[#F7CA00] border border-[#FCD200] rounded-md text-sm font-medium">
                            Start Shopping
                        </Link>
                    </div>
                ) : (
                    <div className="space-y-4">
                        {orders.map((order) => (
                            <div key={order.id} className="bg-white border border-[#D5D9D9] rounded-lg overflow-hidden flex flex-col shadow-sm hover:shadow-md transition-all">
                                <div className="p-4 flex flex-col sm:flex-row gap-6">
                                    <div className="w-16 h-16 bg-gray-50 border border-gray-100 rounded-lg flex items-center justify-center shrink-0">
                                        <Package className="h-8 w-8 text-[#F59E0B]" />
                                    </div>
                                    <div className="flex-1">
                                        <div className="flex justify-between items-start mb-2">
                                            <div>
                                                <h3 className="text-base font-bold text-[#111]">Order #{order.tracking_id}</h3>
                                                <p className="text-xs text-gray-500 uppercase font-black tracking-tighter mt-0.5">Placed on {formatDate(order.created_at)}</p>
                                            </div>
                                            <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider
                                                ${order.status === 'DELIVERED'
                                                    ? 'bg-[#007600] text-white'
                                                    : order.status === 'CANCELLED'
                                                        ? 'bg-red-50 text-red-700'
                                                        : order.status === 'CANCEL_REQUESTED'
                                                            ? 'bg-amber-50 text-amber-700'
                                                            : 'bg-[#FFD814]/20 text-[#111]'}`}>
                                                {order.status_display || order.status}
                                            </span>
                                        </div>
                                        <div className="flex flex-wrap gap-x-6 gap-y-2 mt-3">
                                            <div>
                                                <p className="text-[10px] text-gray-500 uppercase font-bold">Total Amount</p>
                                                <p className="text-sm font-bold text-[#B12704]">Rs. {parseFloat(order.total_amount).toLocaleString()}</p>
                                            </div>
                                            <div>
                                                <p className="text-[10px] text-gray-500 uppercase font-bold">Items</p>
                                                <p className="text-sm text-gray-700">{order.items?.length || 0} Products</p>
                                            </div>
                                        </div>
                                    </div>
                                    <div className="border-t sm:border-t-0 sm:border-l border-[#D5D9D9] p-4 flex flex-col gap-2 shrink-0 sm:w-48 justify-center bg-[#F7FAFA]">
                                        <Link
                                            href={`/customer/dashboard/track?tid=${order.tracking_id}`}
                                            className="w-full py-1.5 bg-[#FFD814] hover:bg-[#F7CA00] border border-[#FCD200] rounded-md text-xs font-medium text-center text-[#111]"
                                        >
                                            Track Package
                                        </Link>
                                        <button
                                            onClick={() => setExpandedOrderId(expandedOrderId === order.id ? null : order.id)}
                                            className="w-full py-1.5 bg-white hover:bg-gray-50 border border-[#D5D9D9] rounded-md text-xs font-medium text-center text-[#111]"
                                        >
                                            {expandedOrderId === order.id ? 'Hide Details' : 'View Details'}
                                        </button>
                                    </div>
                                </div>

                                {/* Expandable Details */}
                                {expandedOrderId === order.id && (
                                    <div className="px-6 py-4 bg-gray-50 border-t border-[#D5D9D9] animate-in fade-in slide-in-from-top-2 duration-300">
                                        <h4 className="text-xs font-bold text-gray-500 uppercase mb-3 px-2">Order Content</h4>
                                        <div className="space-y-2">
                                            {order.items?.map((item: any, i: number) => (
                                                <div key={i} className="flex justify-between items-center text-sm bg-white p-2.5 rounded border border-gray-100 shadow-sm">
                                                    <span className="text-[#111] font-medium">{item.product_name} <span className="text-gray-400 text-xs font-normal">x{item.quantity}</span></span>
                                                    <span className="font-bold text-[#111]">Rs. {parseFloat(item.price).toLocaleString()}</span>
                                                </div>
                                            ))}
                                        </div>
                                        <div className="mt-4 pt-3 border-t border-gray-200 flex justify-between items-center px-2">
                                            <span className="text-xs font-bold text-gray-600">Final Total:</span>
                                            <span className="text-base font-bold text-[#B12704]">Rs. {parseFloat(order.total_amount).toLocaleString()}</span>
                                        </div>
                                    </div>
                                )}
                            </div>
                        ))}
                    </div>
                )}
            </section>

        </div>
    );
}
