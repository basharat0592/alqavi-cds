'use client';

import { useState, useEffect } from 'react';
import { 
    Package, ShoppingBag, TrendingUp, AlertCircle, 
    ArrowUpRight, Clock, CheckCircle2, Package2 
} from 'lucide-react';
import { supplierService } from '@/services/supplier.service';
import { cn } from '@/lib/utils';
import Link from 'next/link';

export default function SupplierDashboardPage() {
    const [stats, setStats] = useState({
        totalProducts: 0,
        activeOrders: 0,
        shippedValue: 0,
        lowStockAlerts: 0
    });
    const [recentOrders, setRecentOrders] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const loadDashboardData = async () => {
            setLoading(true);
            try {
                const [orders, products] = await Promise.all([
                    supplierService.getOrders(),
                    // We'll need a way for suppliers to get THEIR products
                    // For now we assume they can see products tied to them
                    [] 
                ]);

                const active = orders.filter((o: any) => o.status === 'PENDING' || o.status === 'ACCEPTED').length;
                const deliveredValue = orders
                    .filter((o: any) => o.status === 'DELIVERED')
                    .reduce((acc: number, o: any) => acc + parseFloat(o.total_amount), 0);

                setStats({
                    totalProducts: products.length,
                    activeOrders: active,
                    shippedValue: deliveredValue,
                    lowStockAlerts: 0 // Placeholder
                });
                setRecentOrders(orders.slice(0, 5));
            } catch (error) {
                console.error("Dashboard load failed", error);
            } finally {
                setLoading(false);
            }
        };

        loadDashboardData();
    }, []);

    const statCards = [
        { label: 'Live Catalog', value: stats.totalProducts, icon: Package, color: 'text-blue-600', bg: 'bg-blue-50' },
        { label: 'Active POs', value: stats.activeOrders, icon: ShoppingBag, color: 'text-amber-600', bg: 'bg-amber-50' },
        { label: 'Total Supply Value', value: `PKR ${stats.shippedValue.toLocaleString()}`, icon: TrendingUp, color: 'text-emerald-600', bg: 'bg-emerald-50' },
        { label: 'Supply Alerts', value: stats.lowStockAlerts, icon: AlertCircle, color: 'text-red-600', bg: 'bg-red-50' },
    ];

    return (
        <div className="space-y-8 animate-in fade-in duration-500">
            {/* Welcome Banner */}
            <div className="bg-[#1a1a2e] rounded-3xl p-8 text-white relative overflow-hidden shadow-2xl">
                <div className="relative z-10 max-w-2xl">
                    <h1 className="text-3xl font-black mb-2 tracking-tight">Supplying <span className="text-[#F59E0B]">Success</span></h1>
                    <p className="text-slate-400 font-medium">Manage your B2B product catalog and fulfill Purchase Orders from Al-Qavi Trades administrative team.</p>
                </div>
                <div className="absolute right-0 top-0 h-full w-1/3 bg-gradient-to-l from-[#F59E0B]/10 to-transparent pointer-events-none" />
                <Package2 className="absolute -right-8 -bottom-8 h-48 w-48 text-white/5 rotate-12" />
            </div>

            {/* Quick Stats */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                {statCards.map((stat, idx) => (
                    <div key={idx} className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm hover:shadow-md transition-all group">
                        <div className="flex items-center justify-between mb-4">
                            <div className={`p-3 rounded-xl ${stat.bg} ${stat.color} transition-colors group-hover:scale-110`}>
                                <stat.icon className="h-5 w-5" />
                            </div>
                            <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest bg-slate-50 px-2 py-1 rounded-md">Realtime</span>
                        </div>
                        <p className="text-xs font-bold text-slate-500 uppercase tracking-tight mb-1">{stat.label}</p>
                        <h3 className="text-2xl font-black text-slate-900 tracking-tight">{stat.value}</h3>
                    </div>
                ))}
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Recent Orders List */}
                <div className="lg:col-span-2 bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
                    <div className="px-8 py-6 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
                        <h3 className="text-sm font-black text-slate-900 uppercase tracking-widest">Recent Purchase Orders</h3>
                        <Link href="/supplier/orders" className="text-xs font-bold text-amber-600 hover:underline flex items-center gap-1">
                            View Monitor <ArrowUpRight className="h-3 w-3" />
                        </Link>
                    </div>
                    <div className="divide-y divide-slate-100">
                        {loading ? (
                            Array(3).fill(0).map((_, i) => (
                                <div key={i} className="p-8 animate-pulse flex items-center justify-between">
                                    <div className="space-y-2"><div className="h-4 w-32 bg-slate-100 rounded" /><div className="h-3 w-20 bg-slate-50 rounded" /></div>
                                    <div className="h-8 w-24 bg-slate-100 rounded-lg" />
                                </div>
                            ))
                        ) : recentOrders.length === 0 ? (
                            <div className="p-16 text-center">
                                <ShoppingBag className="h-10 w-10 text-slate-200 mx-auto mb-3" />
                                <p className="text-sm font-bold text-slate-400">No incoming orders yet.</p>
                            </div>
                        ) : (
                            recentOrders.map((order: any) => (
                                <div key={order.id} className="p-6 flex items-center justify-between hover:bg-slate-50 transition-colors group">
                                    <div className="flex items-center gap-4">
                                        <div className="p-3 bg-slate-100 rounded-xl text-slate-500 group-hover:bg-amber-100 group-hover:text-amber-600 transition-colors">
                                            <ShoppingBag className="h-5 w-5" />
                                        </div>
                                        <div>
                                            <p className="text-sm font-black text-slate-900 font-mono tracking-tight">{order.tracking_id}</p>
                                            <p className="text-[10px] font-bold text-slate-500 uppercase flex items-center gap-1.5 mt-0.5">
                                                <Clock className="h-3 w-3" /> {new Date(order.created_at).toLocaleDateString()}
                                            </p>
                                        </div>
                                    </div>
                                    <div className="text-right">
                                        <p className="text-sm font-black text-slate-900 mb-1">PKR {parseFloat(order.total_amount).toLocaleString()}</p>
                                        <span className={cn(
                                            "inline-block px-2.5 py-0.5 rounded-full text-[9px] font-black uppercase tracking-widest border",
                                            order.status === 'DELIVERED' ? "bg-emerald-50 text-emerald-700 border-emerald-100" :
                                            order.status === 'PENDING' ? "bg-amber-50 text-amber-700 border-amber-100" :
                                            "bg-blue-50 text-blue-700 border-blue-100"
                                        )}>
                                            {order.status}
                                        </span>
                                    </div>
                                </div>
                            ))
                        )}
                    </div>
                </div>

                {/* Growth / Activity Tracking */}
                <div className="bg-white rounded-3xl border border-slate-200 shadow-sm p-8">
                    <h3 className="text-sm font-black text-slate-900 uppercase tracking-widest mb-6">Workflow Guide</h3>
                    <div className="space-y-6">
                        {[
                            { title: 'Add Catalog', desc: 'Listing new products in your B2B store.', icon: Package, status: 'complete' },
                            { title: 'Receive PO', desc: 'Wait for Admin to order specific stock.', icon: ShoppingBag, status: 'current' },
                            { title: 'Accept & Ship', desc: 'Confirm availability and send the items.', icon: CheckCircle2, status: 'pending' },
                        ].map((step, idx) => (
                            <div key={idx} className="flex gap-4 relative">
                                {idx < 2 && <div className="absolute left-4 top-10 w-0.5 h-6 bg-slate-100" />}
                                <div className={cn(
                                    "h-8 w-8 rounded-full flex items-center justify-center shrink-0 border-2",
                                    step.status === 'complete' ? "bg-emerald-500 border-emerald-500 text-white" :
                                    step.status === 'current' ? "bg-amber-500 border-amber-500 text-white" :
                                    "bg-white border-slate-200 text-slate-300"
                                )}>
                                    <step.icon className="h-4 w-4" />
                                </div>
                                <div>
                                    <h4 className="text-xs font-black text-slate-900 uppercase tracking-tight">{step.title}</h4>
                                    <p className="text-[10px] font-medium text-slate-500 mt-0.5">{step.desc}</p>
                                </div>
                            </div>
                        ))}
                    </div>

                    <div className="mt-8 pt-8 border-t border-slate-100">
                        <button className="w-full py-3 bg-[#1a1a2e] text-white rounded-2xl text-xs font-black uppercase tracking-widest hover:bg-[#F59E0B] transition-all shadow-xl shadow-slate-900/10">
                            Download Ledger
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}
