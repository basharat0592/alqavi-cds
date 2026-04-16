'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { authService, User as AuthUser } from '@/lib/auth';
import { salesService } from '@/lib/api';
import { useWishlist } from '@/context/WishlistContext';
import { getImageUrl, formatDate } from '@/lib/utils';
import {
    Package,
    Heart,
    ShoppingBag,
    TrendingUp,
    Clock,
    ChevronRight,
    ArrowRight,
    Eye,
    Globe
} from 'lucide-react';
import { useRouter } from 'next/navigation';

export default function CustomerDashboard() {
    const [user, setUser] = useState<AuthUser | null>(null);
    const [orders, setOrders] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const { wishlist } = useWishlist();
    const router = useRouter();

    useEffect(() => {
        setUser(authService.getUser());
        salesService.getOrders()
            .then(setOrders)
            .catch(() => setOrders([]))
            .finally(() => setLoading(false));
    }, []);

    const totalOrders = orders.length;
    const deliveredOrders = orders.filter(o => o.status === 'DELIVERED').length;
    const pendingOrders = orders.filter(o => !['DELIVERED', 'CANCELLED'].includes(o.status)).length;
    const totalSpent = orders
        .filter(o => o.status !== 'CANCELLED')
        .reduce((sum: number, o: any) => sum + parseFloat(o.total_amount || '0'), 0);

    const recentOrders = orders.slice(0, 5);

    const statusColor = (status: string) => {
        switch (status) {
            case 'DELIVERED': return 'bg-emerald-50 text-emerald-600 border-emerald-100';
            case 'CANCELLED': return 'bg-red-50 text-red-500 border-red-100';
            case 'PROCESSING': return 'bg-blue-50 text-blue-600 border-blue-100';
            case 'SHIPPED': return 'bg-purple-50 text-purple-600 border-purple-100';
            default: return 'bg-amber-50 text-amber-600 border-amber-100';
        }
    };

    const STATS = [
        {
            label: 'Total Orders',
            value: totalOrders,
            icon: Package,
            color: 'from-[#4f46e5] to-[#7c3aed]',
            iconBg: 'bg-[#4f46e5]/10',
            iconColor: 'text-[#4f46e5]'
        },
        {
            label: 'Delivered',
            value: deliveredOrders,
            icon: TrendingUp,
            color: 'from-emerald-500 to-emerald-600',
            iconBg: 'bg-emerald-50',
            iconColor: 'text-emerald-500'
        },
        {
            label: 'In Progress',
            value: pendingOrders,
            icon: Clock,
            color: 'from-amber-500 to-orange-500',
            iconBg: 'bg-amber-50',
            iconColor: 'text-amber-500'
        },
        {
            label: 'Total Spent',
            value: `Rs. ${totalSpent.toLocaleString()}`,
            icon: ShoppingBag,
            color: 'from-pink-500 to-rose-500',
            iconBg: 'bg-pink-50',
            iconColor: 'text-pink-500'
        },
    ];

    return (
        <div className="space-y-8 animate-in fade-in duration-700">

            {/* Welcome Banner */}
            <div className="relative overflow-hidden bg-gradient-to-br from-[#4f46e5] via-[#6366f1] to-[#7c3aed] rounded-2xl p-8 text-white shadow-xl">
                <div className="absolute right-0 top-0 w-64 h-64 bg-white/5 rounded-full -translate-y-1/2 translate-x-1/3" />
                <div className="absolute right-20 bottom-0 w-40 h-40 bg-white/5 rounded-full translate-y-1/2" />
                <div className="relative z-10">
                    <p className="text-indigo-200 text-sm font-medium mb-1">Welcome back,</p>
                    <h1 className="text-2xl md:text-3xl font-black tracking-tight">{user?.name || 'Customer'} 👋</h1>
                    <p className="text-indigo-200 text-sm mt-2 max-w-lg">
                        Here's an overview of your orders and saved items. Browse our store to discover new products.
                    </p>
                    <Link
                        href="/"
                        className="inline-flex items-center gap-2 mt-5 px-5 py-2.5 bg-white text-[#4f46e5] font-bold text-sm rounded-xl hover:bg-indigo-50 transition-all shadow-md"
                    >
                        <ShoppingBag className="h-4 w-4" /> Browse Store <ArrowRight className="h-4 w-4" />
                    </Link>
                </div>
            </div>

            {/* Stats Grid */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                {STATS.map((stat, idx) => {
                    const Icon = stat.icon;
                    return (
                        <div key={idx} className="bg-white rounded-2xl border border-gray-100 p-5 shadow-sm hover:shadow-md transition-shadow group">
                            <div className="flex items-center justify-between mb-3">
                                <div className={`w-10 h-10 rounded-xl ${stat.iconBg} flex items-center justify-center group-hover:scale-110 transition-transform`}>
                                    <Icon className={`h-5 w-5 ${stat.iconColor}`} />
                                </div>
                            </div>
                            <p className="text-2xl font-black text-gray-900 tracking-tight">{loading ? '—' : stat.value}</p>
                            <p className="text-xs text-gray-400 font-bold mt-1 uppercase tracking-wider">{stat.label}</p>
                        </div>
                    );
                })}
            </div>

            {/* Recent Orders Section */}
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
                <div className="flex items-center justify-between px-6 py-5 border-b border-gray-50">
                    <div>
                        <h2 className="text-lg font-bold text-gray-900">Recent Orders</h2>
                        <p className="text-xs text-gray-400 font-medium mt-0.5">Your latest order activity</p>
                    </div>
                    <Link
                        href="/dashboard/orders"
                        className="text-xs font-bold text-[#4f46e5] hover:underline flex items-center gap-1"
                    >
                        View All <ChevronRight className="h-3 w-3" />
                    </Link>
                </div>

                {loading ? (
                    <div className="p-16 text-center">
                        <div className="w-6 h-6 border-3 border-[#4f46e5]/20 border-t-[#4f46e5] rounded-full animate-spin mx-auto" />
                    </div>
                ) : recentOrders.length === 0 ? (
                    <div className="p-16 text-center">
                        <div className="w-14 h-14 rounded-2xl bg-gray-50 flex items-center justify-center mx-auto mb-4">
                            <Package className="h-7 w-7 text-gray-300" />
                        </div>
                        <h3 className="text-base font-bold text-gray-900 mb-1">No orders yet</h3>
                        <p className="text-xs text-gray-400 mb-6">Start shopping to see your order history here</p>
                        <Link 
                            href="/"
                            className="px-6 py-2.5 bg-[#4f46e5] text-white font-bold text-sm rounded-xl hover:bg-[#4338ca] transition-all inline-flex items-center gap-2"
                        >
                            <ShoppingBag className="h-4 w-4" /> Start Shopping
                        </Link>
                    </div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full text-left">
                            <thead>
                                <tr className="bg-gray-50/50">
                                    <th className="px-6 py-3 text-[10px] font-black uppercase tracking-widest text-gray-400">Order</th>
                                    <th className="px-6 py-3 text-[10px] font-black uppercase tracking-widest text-gray-400">Date</th>
                                    <th className="px-6 py-3 text-[10px] font-black uppercase tracking-widest text-gray-400">Amount</th>
                                    <th className="px-6 py-3 text-[10px] font-black uppercase tracking-widest text-gray-400 text-center">Status</th>
                                    <th className="px-6 py-3 text-[10px] font-black uppercase tracking-widest text-gray-400 text-right">Action</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-50">
                                {recentOrders.map((order) => (
                                    <tr key={order.id} className="hover:bg-gray-50/50 transition-colors group">
                                        <td className="px-6 py-4">
                                            <div className="flex items-center gap-3">
                                                <div className="w-8 h-8 rounded-lg bg-[#4f46e5]/5 flex items-center justify-center text-[#4f46e5]">
                                                    <Package className="h-4 w-4" />
                                                </div>
                                                <span className="text-xs font-black text-gray-900 uppercase">{order.tracking_id}</span>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="flex flex-col">
                                                <span className="text-xs font-bold text-gray-700">{formatDate(order.created_at)}</span>
                                                <span className="text-[10px] font-bold text-gray-400 flex items-center gap-1">
                                                    <Clock className="h-2.5 w-2.5" />
                                                    {new Date(order.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                                </span>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 text-sm font-black text-gray-900">
                                            Rs. {parseFloat(order.total_amount).toLocaleString()}
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="flex justify-center">
                                                <span className={`px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-widest border ${statusColor(order.status)}`}>
                                                    {order.status_display || order.status}
                                                </span>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 text-right">
                                            <Link 
                                                href={`/tracking?tid=${order.tracking_id}`}
                                                className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-gray-50 border border-gray-100 rounded-lg text-[10px] font-bold text-gray-500 hover:text-[#4f46e5] hover:border-[#4f46e5]/30 transition-all"
                                            >
                                                <Globe className="h-3 w-3" /> Track
                                            </Link>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>

            {/* Wishlist Preview */}
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
                <div className="flex items-center justify-between px-6 py-5 border-b border-gray-50">
                    <div>
                        <h2 className="text-lg font-bold text-gray-900">Saved Items</h2>
                        <p className="text-xs text-gray-400 font-medium mt-0.5">
                            {wishlist.length > 0 ? `${wishlist.length} item${wishlist.length > 1 ? 's' : ''} in your wishlist` : 'Your wishlist is empty'}
                        </p>
                    </div>
                    {wishlist.length > 0 && (
                        <Link
                            href="/dashboard/wishlist"
                            className="text-xs font-bold text-[#4f46e5] hover:underline flex items-center gap-1"
                        >
                            View All <ChevronRight className="h-3 w-3" />
                        </Link>
                    )}
                </div>

                {wishlist.length === 0 ? (
                    <div className="p-12 text-center">
                        <div className="w-14 h-14 rounded-2xl bg-pink-50 flex items-center justify-center mx-auto mb-4">
                            <Heart className="h-7 w-7 text-pink-300" />
                        </div>
                        <h3 className="text-base font-bold text-gray-900 mb-1">No saved items</h3>
                        <p className="text-xs text-gray-400 mb-6">Tap the heart icon on products to save them here</p>
                        <Link 
                            href="/"
                            className="text-sm font-bold text-[#4f46e5] hover:underline inline-flex items-center gap-1"
                        >
                            Browse Products <ArrowRight className="h-4 w-4" />
                        </Link>
                    </div>
                ) : (
                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4 p-5">
                        {wishlist.slice(0, 4).map((item) => (
                            <Link
                                key={item.id}
                                href={`/product/${item.id}`}
                                className="group bg-gray-50 rounded-xl p-3 hover:bg-white hover:shadow-md border border-transparent hover:border-gray-100 transition-all"
                            >
                                <div className="aspect-square bg-white rounded-lg overflow-hidden mb-3 flex items-center justify-center p-2">
                                    <img
                                        src={getImageUrl(item.image) || '/placeholder.png'}
                                        alt={item.name}
                                        className="w-full h-full object-contain group-hover:scale-110 transition-transform duration-300"
                                    />
                                </div>
                                <p className="text-xs font-bold text-gray-900 line-clamp-2 leading-snug mb-1">{item.name}</p>
                                <p className="text-xs font-black text-[#4f46e5]">
                                    PKR {parseFloat(item.price.toString()).toLocaleString()}
                                </p>
                            </Link>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}
