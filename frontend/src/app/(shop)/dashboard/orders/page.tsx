'use client';

import { useState, useEffect } from 'react';
import { Package, Clock, Search, ChevronRight, Globe, ShoppingBag } from 'lucide-react';
import Link from 'next/link';
import { salesService } from '@/lib/api';
import PageLoader from '@/components/ui/PageLoader';
import { formatDate } from '@/lib/utils';

export default function CustomerOrdersPage() {
    const [orders, setOrders] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');

    useEffect(() => {
        salesService.getOrders()
            .then(setOrders)
            .finally(() => setLoading(false));
    }, []);

    const filtered = orders.filter(o => 
        o.tracking_id.toLowerCase().includes(search.toLowerCase()) ||
        (o.status_display || o.status).toLowerCase().includes(search.toLowerCase())
    );

    if (loading) return <PageLoader />;

    return (
        <div className="space-y-8 animate-in fade-in duration-500">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                <div>
                    <h1 className="text-2xl font-black text-slate-900 dark:text-white tracking-tighter uppercase">My Orders</h1>
                    <p className="text-xs text-slate-500 font-medium">History of your recent orders.</p>
                </div>

                <div className="relative w-full md:w-72">
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                    <input
                        type="text"
                        placeholder="Search by Tracking ID..."
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        className="w-full h-11 pl-11 pr-4 bg-white dark:bg-[#1a252f] border border-slate-200 dark:border-white/10 rounded-xl text-sm font-bold text-slate-900 dark:text-white outline-none focus:border-[#F59E0B] transition-all shadow-sm"
                    />
                </div>
            </div>

            {orders.length === 0 ? (
                <div className="bg-white dark:bg-[#1a252f] rounded-3xl p-20 text-center border border-slate-200 dark:border-white/10 border-dashed">
                    <div className="w-16 h-16 bg-slate-50 dark:bg-white/5 rounded-2xl flex items-center justify-center mx-auto mb-6">
                        <ShoppingBag className="h-8 w-8 text-slate-300" />
                    </div>
                    <h3 className="text-lg font-bold text-slate-900 dark:text-white">No orders yet</h3>
                    <p className="text-xs text-slate-500 mt-2 mb-8">Ready to taste the best Chinese food?</p>
                    <Link href="/" className="px-8 py-3 bg-[#F59E0B] text-white font-black rounded-xl uppercase tracking-widest text-[10px] hover:shadow-lg hover:shadow-[#F59E0B]/20 transition-all active:scale-95">
                        Browse Menu
                    </Link>
                </div>
            ) : (
                <div className="bg-white dark:bg-[#1a252f] rounded-2xl border border-slate-200 dark:border-white/10 shadow-sm overflow-hidden">
                    <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse">
                            <thead>
                                <tr className="bg-slate-50/50 dark:bg-white/[0.02] border-b border-slate-100 dark:border-white/5">
                                    <th className="px-5 py-4 text-[9px] font-black uppercase tracking-widest text-slate-400">Order Ref</th>
                                    <th className="px-5 py-4 text-[9px] font-black uppercase tracking-widest text-slate-400">Date</th>
                                    <th className="px-5 py-4 text-[9px] font-black uppercase tracking-widest text-slate-400">Amount</th>
                                    <th className="px-5 py-4 text-[9px] font-black uppercase tracking-widest text-slate-400 text-center">Status</th>
                                    <th className="px-5 py-4 text-[9px] font-black uppercase tracking-widest text-slate-400 text-right">Action</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-50 dark:divide-white/5">
                                {filtered.map((order) => (
                                    <tr key={order.id} className="hover:bg-slate-50/30 dark:hover:bg-white/[0.01] transition-colors group">
                                        <td className="px-5 py-4">
                                            <div className="flex items-center gap-3">
                                                <div className="w-8 h-8 rounded-lg bg-slate-50 dark:bg-white/5 flex items-center justify-center text-[#F59E0B]">
                                                    <Package className="h-4 w-4" />
                                                </div>
                                                <span className="text-xs font-black text-slate-900 dark:text-white uppercase">{order.tracking_id}</span>
                                            </div>
                                        </td>
                                        <td className="px-5 py-4">
                                            <div className="flex flex-col">
                                                <span className="text-xs font-bold text-slate-700 dark:text-slate-300">{formatDate(order.created_at)}</span>
                                                <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest flex items-center gap-1">
                                                    <Clock className="h-2.5 w-2.5" /> {new Date(order.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                                </span>
                                            </div>
                                        </td>
                                        <td className="px-5 py-4 text-xs font-black text-slate-900 dark:text-white">
                                            Rs. {parseFloat(order.total_amount).toLocaleString()}
                                        </td>
                                        <td className="px-5 py-4">
                                            <div className="flex justify-center">
                                                <span className={`px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-widest border
                                                    ${order.status === 'DELIVERED' ? 'bg-emerald-50 text-emerald-600 border-emerald-100' :
                                                      order.status === 'CANCELLED' ? 'bg-red-50 text-red-600 border-red-100' :
                                                      'bg-[#F59E0B]/10 text-[#F59E0B] border-[#F59E0B]/20'}`}>
                                                    {order.status_display || order.status}
                                                </span>
                                            </div>
                                        </td>
                                        <td className="px-5 py-4 text-right">
                                            <Link 
                                                href={`/tracking?tid=${order.tracking_id}`}
                                                className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-lg text-[9px] font-black uppercase text-slate-600 dark:text-slate-400 hover:text-[#F59E0B] hover:border-[#F59E0B] transition-all active:scale-95"
                                            >
                                                <Globe className="h-3 w-3" /> Track <ChevronRight className="h-3 w-3" />
                                            </Link>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}
        </div>
    );
}
