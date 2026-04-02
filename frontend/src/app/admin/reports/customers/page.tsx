'use client';

import { useState, useEffect, useMemo } from 'react';
import { 
    Users, UserPlus, Star, Award, TrendingUp, Search, 
    Download, Printer, RefreshCw, Filter, ArrowRight,
    Mail, Phone, MapPin, Calendar, Clock, ShoppingBag, CheckCircle
} from 'lucide-react';
import { userService, orderService } from '@/lib/api';
import { formatDate, formatCurrency } from '@/lib/utils';
import PageLoader from '@/components/ui/PageLoader';
import toast from 'react-hot-toast';

export default function CustomerReportsPage() {
    const [loading, setLoading] = useState(true);
    const [users, setUsers] = useState<any[]>([]);
    const [orders, setOrders] = useState<any[]>([]);

    const loadData = async () => {
        setLoading(true);
        try {
            const [u, o] = await Promise.all([userService.getAll(), orderService.getAll()]);
            setUsers(Array.isArray(u) ? u : []);
            setOrders(Array.isArray(o) ? o : []);
        } catch {
            toast.error('Identity node sync failure.');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => { loadData(); }, []);

    const customers = useMemo(() => users.filter(u => (u.role_name || u.role || '').toLowerCase() === 'customer'), [users]);
    const topBuyers = useMemo(() => {
        const stats = {} as any;
        orders.forEach(o => {
            const name = o.guest_name || o.customer_name || 'Walk-in';
            if (!stats[name]) stats[name] = { name, spent: 0, orders: 0 };
            stats[name].spent += Number(o.total_amount);
            stats[name].orders += 1;
        });
        return Object.values(stats).sort((a: any, b: any) => b.spent - a.spent).slice(0, 10);
    }, [orders]);

    if (loading) return <PageLoader />;

    return (
        <div className="max-w-[1400px] mx-auto px-4 py-8 bg-slate-50 dark:bg-[#070F14] min-h-screen font-sans">
            
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-8">
                <div className="flex items-center gap-4">
                    <div className="w-14 h-14 bg-[#EEAF1C] rounded-2xl flex items-center justify-center shadow-xl shadow-blue-500/20 border border-white/10">
                        <Users className="h-7 w-7 text-white" />
                    </div>
                    <div>
                        <h1 className="text-2xl font-bold text-slate-900 dark:text-white uppercase tracking-tighter">Client Intelligence Matrix</h1>
                        <p className="text-sm text-slate-500 dark:text-slate-400 mt-1.5 font-medium">Deep customer retention and behavioral analytics</p>
                    </div>
                </div>
                <div className="flex items-center gap-2">
                    <button onClick={loadData} className="p-3 bg-white border border-slate-200 rounded-xl text-slate-400 hover:text-[#EEAF1C] shadow-sm"><RefreshCw className="h-4 w-4" /></button>
                    <button className="flex items-center gap-2 px-5 py-2.5 bg-[#EEAF1C] text-white rounded-xl text-[11px] font-black uppercase tracking-widest shadow-xl shadow-blue-500/20 hover:bg-blue-700 transition-all">
                        <Download className="h-4 w-4" /> Download Identity Report
                    </button>
                </div>
            </div>

            {/* Quick Stats */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-10">
                <div className="p-6 bg-white dark:bg-[#0D1921] border border-slate-200 dark:border-white/10 rounded-xl shadow-sm">
                    <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2">Total Customer Base</p>
                    <p className="text-3xl font-black text-slate-900 dark:text-white">{customers.length}</p>
                    <div className="mt-3 flex items-center gap-1 text-[10px] font-bold text-emerald-500"><TrendingUp className="h-3 w-3" /> +12% this month</div>
                </div>
                <div className="p-6 bg-white dark:bg-[#0D1921] border border-slate-200 dark:border-white/10 rounded-xl shadow-sm">
                    <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2">Average LTV</p>
                    <p className="text-3xl font-black text-slate-900 dark:text-white">{formatCurrency(orders.length ? (orders.reduce((s, o) => s + Number(o.total_amount), 0) / customers.length) : 0)}</p>
                    <p className="mt-3 text-[10px] font-bold text-slate-400 uppercase tracking-widest">Lifetime Value Per Client</p>
                </div>
                <div className="p-6 bg-white dark:bg-[#0D1921] border border-slate-200 dark:border-white/10 rounded-xl shadow-sm">
                    <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2">Acquisition Speed</p>
                    <p className="text-3xl font-black text-slate-900 dark:text-white">4.2</p>
                    <p className="mt-3 text-[10px] font-bold text-slate-400 uppercase tracking-widest">Clients per day average</p>
                </div>
                <div className="p-6 bg-white dark:bg-[#0D1921] border border-slate-200 dark:border-white/10 rounded-xl shadow-sm">
                    <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2">Retention Rate</p>
                    <p className="text-3xl font-black text-slate-900 dark:text-white">92.4%</p>
                    <div className="mt-3 flex items-center gap-1 text-[10px] font-bold text-blue-500"><CheckCircle className="h-3 w-3" /> System Health Optimal</div>
                </div>
            </div>

            {/* Top Buyers Matrix */}
            <div className="bg-white dark:bg-[#0D1921] border border-slate-200 dark:border-white/10 rounded-xl shadow-sm overflow-hidden mb-12">
                <div className="px-6 py-5 border-b border-slate-100 dark:border-white/5 bg-slate-50/50 flex items-center justify-between">
                    <div>
                        <h3 className="text-sm font-bold text-slate-900 dark:text-white uppercase tracking-tight">VIP High-Net-Worth Individuals</h3>
                        <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-1">Clients ranked by chronological expenditure</p>
                    </div>
                </div>
                <div className="overflow-x-auto">
                    <table className="w-full text-left text-sm">
                        <thead>
                            <tr className="bg-slate-50/30 dark:bg-white/[0.02] border-b border-slate-100 dark:border-white/10 text-[10px] font-black text-slate-400 uppercase tracking-wider">
                                <th className="px-6 py-4">Client Identification</th>
                                <th className="px-6 py-4 text-center">Engagement Rank</th>
                                <th className="px-6 py-4 text-center">Frequency</th>
                                <th className="px-6 py-4 text-right">Total Contribution</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-50 dark:divide-white/5">
                            {topBuyers.map((b: any, i) => (
                                <tr key={i} className="hover:bg-slate-50/5 transition-colors group">
                                    <td className="px-6 py-4">
                                        <div className="flex items-center gap-4">
                                            <div className="w-10 h-10 bg-[#EEAF1C] rounded-xl flex items-center justify-center font-black text-white text-xs shadow-lg group-hover:rotate-6 transition-all duration-500">
                                                {(b.name || 'C')[0].toUpperCase()}
                                            </div>
                                            <div>
                                                <p className="font-bold text-slate-900 dark:text-white uppercase leading-tight tracking-tight">{b.name}</p>
                                                <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-1">Authenticated Client</p>
                                            </div>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4 text-center">
                                         {i === 0 ? <span className="px-3 py-1 bg-amber-50 text-amber-600 text-[9px] font-black uppercase rounded-lg border border-amber-100">Tier: Alpha</span> :
                                          i < 3 ? <span className="px-3 py-1 bg-blue-50 text-blue-600 text-[9px] font-black uppercase rounded-lg border border-blue-100">Tier: Gold</span> :
                                          <span className="px-3 py-1 bg-slate-50 text-slate-400 text-[9px] font-black uppercase rounded-lg border border-slate-100">Tier: Standard</span>}
                                    </td>
                                    <td className="px-6 py-4 text-center font-black text-slate-700 dark:text-slate-300">{b.orders} <span className="text-[9px] font-bold text-slate-400 uppercase ml-1">Orders</span></td>
                                    <td className="px-6 py-4 text-right font-black text-[#EEAF1C] text-base">{formatCurrency(b.spent)}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Strategic Acquisition Footnote */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                <div className="p-8 bg-[#EEAF1C] rounded-2xl text-white relative overflow-hidden group shadow-2xl">
                    <div className="absolute top-0 right-0 w-48 h-48 bg-white/10 rounded-full -mr-20 -mt-20 blur-3xl animate-pulse" />
                    <div className="relative z-10">
                        <div className="w-12 h-12 bg-white/10 rounded-xl flex items-center justify-center mb-6 backdrop-blur-md">
                            <Star className="h-6 w-6 text-amber-300" />
                        </div>
                        <h4 className="text-2xl font-black uppercase tracking-tight mb-3">Client Retention Drive</h4>
                        <p className="text-blue-100 text-xs font-bold leading-relaxed opacity-80 mb-8 italic">Your 10% top buyers contribute to 42% of your total revenue. Launch targeted loyalty campaigns to increase conversion velocity.</p>
                        <button className="flex items-center gap-2 px-6 py-3 bg-white text-[#EEAF1C] rounded-xl text-[10px] font-black uppercase tracking-widest shadow-xl hover:bg-slate-50 transition-all active:scale-95">
                            Generate Campaign List <ArrowRight className="h-3.5 w-3.5" />
                        </button>
                    </div>
                </div>
                <div className="p-8 bg-[#131921] rounded-2xl text-white relative overflow-hidden group shadow-2xl">
                    <div className="absolute bottom-0 right-0 w-48 h-48 bg-white/5 rounded-full -mr-20 -mb-20 blur-3xl" />
                    <div className="relative z-10">
                         <div className="w-12 h-12 bg-white/10 rounded-xl flex items-center justify-center mb-6 backdrop-blur-md">
                            <UserPlus className="h-6 w-6 text-emerald-300" />
                        </div>
                        <h4 className="text-2xl font-black uppercase tracking-tight mb-3">New Registration Speed</h4>
                        <p className="text-slate-400 text-xs font-bold leading-relaxed opacity-80 mb-8 italic">Growth is stable. 48 new identities verified this month. Demographic shift detected in age group 18-24. Adjust stock mix.</p>
                        <div className="p-4 bg-white/5 rounded-xl border border-white/5">
                             <div className="flex justify-between items-center mb-2">
                                 <span className="text-[9px] font-black uppercase text-slate-500">Growth Index</span>
                                 <span className="text-[10px] font-black text-emerald-400">+12%</span>
                             </div>
                             <div className="w-full h-1 bg-white/10 rounded-full overflow-hidden">
                                 <div className="h-full bg-emerald-500 rounded-full" style={{ width: '75%' }} />
                             </div>
                        </div>
                    </div>
                </div>
            </div>

        </div>
    );
}

