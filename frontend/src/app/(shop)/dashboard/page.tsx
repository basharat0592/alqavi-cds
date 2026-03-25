'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { authService, User as AuthUser } from '@/lib/auth';
import api from '@/lib/axios';
import { 
    ShoppingBag, 
    Truck, 
    CheckCircle, 
    Package, 
    ChevronRight, 
    Search, 
    ArrowUpRight,
    Clock
} from 'lucide-react';

export default function CustomerDashboard() {
    const [user, setUser] = useState<AuthUser | null>(null);
    const [orders, setOrders] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        setUser(authService.getUser());
        
        const fetchOrders = async () => {
            try {
                const response = await api.get('/v1/sales/orders/');
                const data = response.data.results || response.data;
                const currentUser = authService.getUser();
                if (currentUser) {
                    const filtered = data.filter((o: any) => o.customer_email === currentUser.email).slice(0, 5);
                    setOrders(filtered);
                }
            } catch (err) {
                console.error("Failed to fetch dashboard orders", err);
            } finally {
                setLoading(false);
            }
        };

        fetchOrders();
    }, []);

    return (
        <div className="space-y-6 animate-in fade-in duration-500 pb-10">
            
            {/* ── HEADER (Admin Style) ── */}
            <div className="bg-white dark:bg-slate-900 p-6 rounded border border-gray-100 dark:border-slate-800 shadow-[0_4px_20px_rgba(0,0,0,0.03)] flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-black text-slate-900 dark:text-white tracking-tight">Account Overview</h1>
                    <p className="text-[10px] font-bold text-[#FF9900] tracking-[0.2em] uppercase mt-0.5">Welcome back, {user?.name}</p>
                </div>
                <div className="flex gap-3">
                    <Link href="/shop" className="px-5 py-2.5 bg-slate-50 dark:bg-slate-800 text-slate-600 dark:text-slate-300 font-black text-[10px] uppercase tracking-widest rounded border border-slate-200 dark:border-slate-700 hover:bg-slate-100 transition-all">
                        Store Home
                    </Link>
                    <Link href="/dashboard/track" className="px-5 py-2.5 bg-[#FF9900] text-[#131921] font-black text-[10px] uppercase tracking-widest rounded shadow-lg shadow-[#FF9900]/20 hover:bg-[#e68a00] transition-all">
                        Track Order
                    </Link>
                </div>
            </div>

            {/* ── METRICS (Matching Admin Boxes) ── */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <MetricBox label="Total Purchased" value={orders.length} icon={ShoppingBag} />
                <MetricBox 
                    label="Active Orders" 
                    value={orders.filter(o => ['confirmed', 'processing', 'shipped'].includes(o.status.toLowerCase())).length} 
                    icon={Truck} 
                />
                <MetricBox 
                    label="Total Spent" 
                    value={`PKR ${orders.reduce((acc, o) => acc + (o.total_amount || 0), 0).toLocaleString()}`} 
                    icon={CheckCircle} 
                />
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                
                {/* ── RECENT ORDERS (Flat Admin Table) ── */}
                <div className="lg:col-span-8 space-y-4">
                    <div className="flex justify-between items-center px-1">
                        <h2 className="text-[11px] font-black text-slate-400 uppercase tracking-[0.2em]">Recent Activity</h2>
                        <Link href="/dashboard/orders" className="text-[10px] font-bold text-[#FF9900] hover:underline uppercase">View All Orders</Link>
                    </div>

                    <div className="bg-white dark:bg-slate-900 rounded border border-gray-200 dark:border-slate-800 shadow-sm overflow-hidden">
                        {loading ? (
                            <div className="p-12 flex items-center justify-center">
                                <span className="animate-spin h-5 w-5 border-2 border-[#FF9900] border-t-transparent rounded-full" />
                            </div>
                        ) : orders.length > 0 ? (
                            <div className="divide-y divide-gray-50 dark:divide-slate-800">
                                {orders.map(order => (
                                    <div key={order.id} className="flex flex-wrap items-center justify-between p-5 hover:bg-slate-50/50 dark:hover:bg-slate-800/30 transition-colors gap-4">
                                        <div className="flex items-center gap-4">
                                            <div className="w-10 h-10 bg-slate-50 dark:bg-slate-800 rounded flex items-center justify-center border border-gray-100 dark:border-slate-700">
                                                <Package className="h-5 w-5 text-gray-400" />
                                            </div>
                                            <div>
                                                <p className="text-sm font-black text-slate-900 dark:text-white uppercase tracking-tight">{order.order_number}</p>
                                                <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest">{new Date(order.created_at).toLocaleDateString()}</p>
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-8 text-right">
                                            <div>
                                                <p className="text-sm font-black text-slate-900 dark:text-white tracking-widest">PKR {order.total_amount?.toLocaleString()}</p>
                                                <span className={`text-[9px] font-black uppercase tracking-[0.15em] ${order.status === 'delivered' ? 'text-emerald-500' : 'text-amber-500'}`}>
                                                    {order.status}
                                                </span>
                                            </div>
                                            <Link href={`/dashboard/track?order=${order.order_number}`} className="p-2 bg-slate-50 dark:bg-slate-800 rounded hover:bg-[#FF9900] group/btn transition-all border border-gray-100 dark:border-slate-700">
                                                <Search className="h-4 w-4 text-gray-400 group-hover/btn:text-[#131921]" />
                                            </Link>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <div className="p-16 text-center">
                                <ShoppingBag className="h-10 w-10 text-gray-100 mx-auto mb-4" />
                                <p className="text-sm font-bold text-gray-400 uppercase tracking-widest">No order history found</p>
                            </div>
                        )}
                    </div>
                </div>

                {/* ── SIDEBAR INFO ── */}
                <div className="lg:col-span-4 space-y-6">
                    <h2 className="text-[11px] font-black text-slate-400 uppercase tracking-[0.2em] px-1">Security & Contact</h2>
                    <div className="bg-white dark:bg-slate-900 rounded border border-gray-200 dark:border-slate-800 p-6 shadow-sm space-y-6">
                        <div className="space-y-4">
                            <div className="pb-4 border-b dark:border-slate-800 flex items-center justify-between">
                                <div>
                                    <p className="text-[9px] text-gray-400 font-black uppercase tracking-widest mb-1">Email Address</p>
                                    <p className="text-xs font-bold dark:text-white truncate max-w-[150px]">{user?.email}</p>
                                </div>
                                <div className="p-2 bg-emerald-50 dark:bg-emerald-900/20 rounded">
                                    <CheckCircle className="h-3.5 w-3.5 text-emerald-500" />
                                </div>
                            </div>
                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="text-[9px] text-gray-400 font-black uppercase tracking-widest mb-1">Mobile Phone</p>
                                    <p className="text-xs font-bold dark:text-white">{user?.phone || 'Not linked'}</p>
                                </div>
                                <ArrowUpRight className="h-4 w-4 text-slate-200" />
                            </div>
                        </div>
                        
                        <Link href="/dashboard/profile" className="block text-center py-2.5 bg-slate-900 text-white font-black text-[10px] uppercase tracking-widest rounded hover:bg-black transition-all">
                            Manage Security
                        </Link>
                    </div>
                </div>
            </div>
        </div>
    );
}

function MetricBox({ label, value, icon: Icon }: { label: string; value: string | number; icon: any }) {
    return (
        <div className="bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-800 p-5 rounded shadow-sm hover:border-[#FF9900] transition-colors group">
            <div className="flex items-center justify-between mb-3">
                <p className="text-[10px] font-black text-gray-400 dark:text-slate-500 uppercase tracking-[0.2em] group-hover:text-[#FF9900] transition-colors">{label}</p>
                <Icon className="h-4 w-4 text-slate-300 group-hover:text-[#FF9900] transition-colors" />
            </div>
            <span className="text-2xl font-black text-slate-900 dark:text-white tracking-tighter">{value}</span>
        </div>
    );
}
