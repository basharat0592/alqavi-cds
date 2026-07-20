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
    Clock,
    AlertTriangle
} from 'lucide-react';
import { authService, User as AuthUser } from '@/lib/auth';
import { salesService } from '@/lib/api';
import { formatDate } from '@/lib/utils';
import PageLoader from '@/components/ui/PageLoader';

export default function CustomerDashboard() {
    const [user, setUser] = useState<AuthUser | null>(null);
    const [orders, setOrders] = useState<any[]>([]);
    const [outstandingBalance, setOutstandingBalance] = useState<number>(0);
    const [expandedOrderId, setExpandedOrderId] = useState<string | null>(null);
    const [loading, setLoading] = useState(true);
    const router = useRouter();

    useEffect(() => {
        setUser(authService.getUser());
        salesService.getOrders()
            .then(data => {
                // Calculate outstanding balance across all non-cancelled orders
                const outstanding = data.reduce((sum: number, o: any) => {
                    if (o.status.toUpperCase() === 'CANCELLED') return sum;
                    const total = Number(o.total_amount || 0);
                    const paid = Number(o.amount_paid || 0);
                    const remaining = Number(o.remaining_amount ?? (total - paid));
                    return sum + remaining;
                }, 0);
                setOutstandingBalance(outstanding);

                const activeOrders = data.filter((o: any) =>
                    !['DELIVERED', 'CANCELLED'].includes(o.status.toUpperCase())
                );
                setOrders(activeOrders.slice(0, 5));
            })
            .finally(() => setLoading(false));
    }, []);

    if (loading) return <PageLoader />;

    return (
        <div className="w-full animate-in fade-in duration-500">
            {/* Header Area */}
            <div className="mb-6">
                <h1 className="text-2xl sm:text-3xl font-semibold sm:font-normal text-[#111]">Your Account</h1>
                <p className="text-[13px] sm:text-sm text-gray-600 mt-1.5 sm:mt-2 leading-relaxed">
                    Hello, <span className="font-bold text-gray-900">{user?.name}</span>. View your recent orders and manage your account settings.
                </p>
            </div>

            {/* Outstanding Balance Banner */}
            {outstandingBalance > 0 && (
                <div className="mb-8 border border-amber-200 bg-amber-50/40 rounded-lg p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-sm">
                    <div className="flex items-start gap-3">
                        <AlertTriangle className="h-5 w-5 text-amber-600 shrink-0 mt-0.5" />
                        <div>
                            <h3 className="text-sm font-bold text-gray-800">Outstanding Balance Due</h3>
                            <p className="text-xs text-gray-600 mt-1">
                                You have an outstanding balance of <span className="font-bold text-rose-600">Rs. {outstandingBalance.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span> on your account. Please review your billing ledger.
                            </p>
                        </div>
                    </div>
                    <Link
                        href="/customer/dashboard/payments"
                        className="inline-flex items-center justify-center px-4 py-2 bg-white hover:bg-gray-50 border border-[#D5D9D9] hover:border-[#B5B9B9] rounded-md text-xs font-bold text-gray-700 shadow-sm transition-all whitespace-nowrap"
                    >
                        View Payments & Dues
                    </Link>
                </div>
            )}

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
                    <div className="space-y-3">
                        {orders.map((order) => (
                            <div key={order.id} className="bg-white border border-[#D5D9D9] rounded-xl overflow-hidden shadow-sm">
                                <div className="p-4">
                                    {/* Top: order id + status */}
                                    <div className="flex items-start justify-between gap-2">
                                        <div className="flex items-center gap-2.5 min-w-0">
                                            <span className="w-9 h-9 rounded-lg bg-amber-50 border border-amber-100 flex items-center justify-center shrink-0">
                                                <Package className="text-[#F59E0B]" size={18} />
                                            </span>
                                            <div className="min-w-0">
                                                <h3 className="text-[14.5px] font-bold text-[#111] truncate">Order #{order.tracking_id}</h3>
                                                <p className="text-[11px] text-gray-400 mt-0.5">Placed {formatDate(order.created_at)}</p>
                                            </div>
                                        </div>
                                        <span className={`px-2 py-0.5 rounded text-[9.5px] font-bold uppercase tracking-wider shrink-0
                                            ${order.status === 'DELIVERED'
                                                ? 'bg-[#007600] text-white'
                                                : order.status === 'CANCELLED'
                                                    ? 'bg-red-50 text-red-700'
                                                    : order.status === 'CANCEL_REQUESTED'
                                                        ? 'bg-amber-50 text-amber-700'
                                                        : 'bg-[#FFD814]/30 text-[#111]'}`}>
                                            {order.status_display || order.status}
                                        </span>
                                    </div>

                                    {/* Meta */}
                                    <div className="flex items-center gap-6 mt-3 pt-3 border-t border-gray-100">
                                        <div>
                                            <p className="text-[9.5px] text-gray-400 uppercase font-bold tracking-wide">Total</p>
                                            <p className="text-[14px] font-bold text-[#B12704] tabular-nums">Rs. {parseFloat(order.total_amount).toLocaleString()}</p>
                                        </div>
                                        <div>
                                            <p className="text-[9.5px] text-gray-400 uppercase font-bold tracking-wide">Items</p>
                                            <p className="text-[13px] font-semibold text-gray-700">{order.items?.length || 0} Products</p>
                                        </div>
                                    </div>

                                    {/* Actions */}
                                    <div className="grid grid-cols-2 gap-2 mt-4">
                                        <Link
                                            href={`/customer/dashboard/track?tid=${order.tracking_id}`}
                                            className="flex items-center justify-center h-9 bg-[#FFD814] hover:bg-[#F7CA00] border border-[#FCD200] rounded-lg text-[12.5px] font-bold text-[#111] transition-colors"
                                        >
                                            Track Package
                                        </Link>
                                        <button
                                            onClick={() => setExpandedOrderId(expandedOrderId === order.id ? null : order.id)}
                                            className="flex items-center justify-center h-9 bg-white hover:bg-gray-50 border border-[#D5D9D9] rounded-lg text-[12.5px] font-bold text-[#111] transition-colors"
                                        >
                                            {expandedOrderId === order.id ? 'Hide Details' : 'View Details'}
                                        </button>
                                    </div>
                                </div>

                                {/* Expandable Details */}
                                {expandedOrderId === order.id && (
                                    <div className="px-4 py-4 bg-gray-50 border-t border-[#D5D9D9] animate-in fade-in slide-in-from-top-1 duration-200">
                                        <h4 className="text-[10px] font-bold text-gray-500 uppercase tracking-wide mb-2.5">Order Content</h4>
                                        <div className="space-y-2">
                                            {order.items?.map((item: any, i: number) => (
                                                <div key={i} className="flex justify-between items-center gap-2 text-[12.5px] bg-white p-2.5 rounded-lg border border-gray-100">
                                                    <span className="text-[#111] font-medium truncate">{item.product_name} <span className="text-gray-400 text-[11px] font-normal">×{item.quantity}</span></span>
                                                    <span className="font-bold text-[#111] tabular-nums whitespace-nowrap">Rs. {parseFloat(item.price).toLocaleString()}</span>
                                                </div>
                                            ))}
                                        </div>
                                        <div className="mt-3 pt-3 border-t border-gray-200 flex justify-between items-center">
                                            <span className="text-[12px] font-bold text-gray-600">Final Total:</span>
                                            <span className="text-[15px] font-bold text-[#B12704] tabular-nums">Rs. {parseFloat(order.total_amount).toLocaleString()}</span>
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
