'use client';

import { useState, useEffect, useMemo } from 'react';
import { 
    BarChart3, TrendingUp, Package, Users, DollarSign, 
    Calendar, Download, ArrowUpRight, ArrowDownRight,
    Search, Filter, RefreshCw, FileText, PieChart as PieIcon,
    ArrowRight, CheckCircle, Clock, AlertTriangle, Truck,
    TrendingDown, ShoppingCart, ShoppingBag, Layers, Warehouse,
    Printer, FileSpreadsheet, ChevronRight
} from 'lucide-react';
import { 
    AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
    BarChart, Bar, PieChart, Pie, Cell, Legend, LineChart, Line
} from 'recharts';
import { productService, orderService, userService, purchaseService } from '@/lib/api';
import { formatCurrency, formatDate } from '@/lib/utils';
import PageLoader from '@/components/ui/PageLoader';
import toast from 'react-hot-toast';

/* ═══════════════════════════════════════════════
   MODERN ENTERPRISE UI COMPONENTS (SaaS Blue Style)
   ═══════════════════════════════════════════════ */
const Card = ({ children, className = "" }: { children: React.ReactNode; className?: string }) => (
    <div className={`bg-white dark:bg-[#1B1C1E] border border-slate-200 dark:border-white/10 rounded-xl shadow-sm overflow-hidden ${className}`}>
        {children}
    </div>
);

const SummaryCard = ({ title, value, sub, icon: Icon, trend, color }: {
    title: string; value: string | number; sub?: string; icon: any; trend?: string; color: string;
}) => (
    <Card className="p-5 flex flex-col justify-between group hover:shadow-md transition-all duration-300">
        <div className="flex justify-between items-start">
            <div className={`p-2.5 rounded-xl ${color} bg-opacity-10 border border-current border-opacity-20 transition-transform group-hover:scale-110`}>
                <Icon className={`h-5 w-5 ${color}`} />
            </div>
            {trend && (
                <div className={`flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full ${trend.startsWith('+') ? 'bg-emerald-50 text-emerald-600' : 'bg-red-50 text-red-600'}`}>
                    {trend}
                </div>
            )}
        </div>
        <div className="mt-4">
            <p className="text-[11px] font-bold text-slate-500 uppercase tracking-widest leading-none mb-2">{title}</p>
            <p className="text-2xl font-bold text-slate-900 dark:text-white tracking-tighter leading-none">{value}</p>
            {sub && <p className="text-[10px] text-slate-400 mt-2 font-medium">{sub}</p>}
        </div>
    </Card>
);

const TabButton = ({ active, label, onClick }: { active: boolean; label: string; onClick: () => void }) => (
    <button 
        onClick={onClick}
        className={`px-5 py-2.5 text-xs font-bold uppercase tracking-wider transition-all border-b-2
            ${active 
                ? 'border-[#F7CA00] text-[#F7CA00] bg-blue-50/10' 
                : 'border-transparent text-slate-400 hover:text-slate-600 hover:bg-slate-50'}`}
    >
        {label}
    </button>
);

/* ═══════════════════════════════════════════════
   UNIFIED REPORTS DASHBOARD
   ═══════════════════════════════════════════════ */
export default function UnifiedReportsDashboard() {
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState<'sales' | 'inventory' | 'customers' | 'purchases'>('sales');
    const [dateFrom, setDateFrom] = useState('');
    const [dateTo, setDateTo] = useState('');

    const [data, setData] = useState({
        orders: [] as any[],
        products: [] as any[],
        users: [] as any[],
        purchases: [] as any[]
    });

    const loadData = async () => {
        setLoading(true);
        try {
            const [o, p, u, pu] = await Promise.all([
                orderService.getAll(),
                productService.getAll(),
                userService.getAll(),
                purchaseService.getAll()
            ]);
            setData({
                orders: Array.isArray(o) ? o : [],
                products: Array.isArray(p) ? p : [],
                users: Array.isArray(u) ? u : [],
                purchases: Array.isArray(pu) ? pu : []
            });
        } catch {
            toast.error('Failed to synchronize business data.');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => { loadData(); }, []);

    // ── DATA TRANSFORMATIONS ──
    const analytics = useMemo(() => {
        const orders = data.orders;
        const totalRevenue = orders.reduce((s, o) => s + Number(o.total_amount || 0), 0);
        const totalProfit = totalRevenue * 0.15; // Simulated profit margin
        const totalStockValue = data.products.reduce((s, p) => s + (Number(p.price || 0) * Number(p.stock || 0)), 0);

        // Chart Data (Last 7 Days)
        const days = [...Array(7)].map((_, i) => {
            const d = new Date(); d.setDate(d.getDate() - i);
            return d.toISOString().split('T')[0];
        }).reverse();

        const chartData = days.map(d => ({
            date: formatDate(d).split(',')[0],
            revenue: orders.filter(o => (o.created_at || '').startsWith(d)).reduce((s, o) => s + Number(o.total_amount), 0),
            orders: orders.filter(o => (o.created_at || '').startsWith(d)).length,
            purchases: data.purchases.filter(p => (p.created_at || '').startsWith(d)).reduce((s, p) => s + Number(p.total_amount), 0)
        }));

        const categories = {} as any;
        data.products.forEach(p => categories[p.category_name || 'General'] = (categories[p.category_name || 'General'] || 0) + 1);
        const pieData = Object.entries(categories).map(([name, value]) => ({ name, value })).sort((a: any, b: any) => b.value - a.value).slice(0, 5);

        return { totalRevenue, totalProfit, totalStockValue, chartData, pieData };
    }, [data]);

    const COLORS = ['#F7CA00', '#2563EB', '#3B82F6', '#60A5FA', '#93C5FD'];

    if (loading) return <PageLoader />;

    return (
        <div className="max-w-[1600px] mx-auto px-4 py-8 bg-slate-50 dark:bg-[#111213] min-h-screen font-sans">
            
            {/* ── Dashboard Header ── */}
            <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-6 mb-8">
                <div className="flex items-center gap-5">
                    <div className="w-16 h-16 bg-[#F7CA00] rounded-2xl flex items-center justify-center shadow-xl shadow-blue-500/20 ring-4 ring-blue-500/5">
                        <TrendingUp className="h-8 w-8 text-white" />
                    </div>
                    <div>
                        <h1 className="text-3xl font-bold text-slate-900 dark:text-white tracking-tight uppercase">Intelligence Command</h1>
                        <div className="flex items-center gap-2 mt-1">
                            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                            <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">Real-Time Data Matrix Active</p>
                        </div>
                    </div>
                </div>
                
                <div className="flex flex-wrap items-center gap-3">
                    <div className="flex gap-2 p-1 bg-white dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-xl shadow-sm">
                        <input type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)} className="px-3 py-2 text-xs font-bold outline-none bg-transparent text-slate-600 dark:text-white" />
                        <span className="self-center text-slate-300">to</span>
                        <input type="date" value={dateTo} onChange={e => setDateTo(e.target.value)} className="px-3 py-2 text-xs font-bold outline-none bg-transparent text-slate-600 dark:text-white" />
                    </div>
                    <button className="flex items-center gap-2 px-6 py-2.5 bg-[#F7CA00] text-white text-[11px] font-black uppercase tracking-widest rounded-xl hover:bg-blue-700 shadow-lg shadow-blue-500/20 transition-all active:scale-95">
                        <Download className="h-4 w-4" /> Export Master Report
                    </button>
                    <button onClick={() => window.print()} className="p-2.5 bg-white dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-xl text-slate-400 hover:text-[#F7CA00] transition-all shadow-sm">
                        <Printer className="h-4.5 w-4.5" />
                    </button>
                </div>
            </div>

            {/* ── Executive Summary Strips ── */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-10">
                <SummaryCard title="Gross Transaction Volume" value={formatCurrency(analytics.totalRevenue)} sub="Total revenue across all channels" icon={DollarSign} trend="+14.2%" color="text-indigo-600" />
                <SummaryCard title="Operational Net Profit" value={formatCurrency(analytics.totalProfit)} sub="Estimated margin after tax & cost" icon={TrendingUp} trend="+8.4%" color="text-emerald-600" />
                <SummaryCard title="System Order Velocity" value={data.orders.length} sub="Total processed sales manifest" icon={ShoppingCart} trend="+24" color="text-blue-600" />
                <SummaryCard title="Total Asset Valuation" value={formatCurrency(analytics.totalStockValue)} sub="Current inventory stock value" icon={Package} color="text-amber-600" />
            </div>

            {/* ── Tactical Navigation ── */}
            <div className="flex border-b border-slate-200 dark:border-white/10 mb-8 overflow-x-auto no-scrollbar">
                <TabButton active={activeTab === 'sales'} label="Sales Analytics" onClick={() => setActiveTab('sales')} />
                <TabButton active={activeTab === 'inventory'} label="Logistics & Stock" onClick={() => setActiveTab('inventory')} />
                <TabButton active={activeTab === 'customers'} label="Client Intelligence" onClick={() => setActiveTab('customers')} />
                <TabButton active={activeTab === 'purchases'} label="Procurement Audit" onClick={() => setActiveTab('purchases')} />
            </div>

            {/* ── Main Analytical Matrix ── */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 mb-12">
                
                {/* Visual Chart Deck */}
                <div className="lg:col-span-8 space-y-8">
                    <Card>
                        <div className="px-6 py-5 border-b border-slate-100 dark:border-white/5 flex items-center justify-between bg-slate-50/30">
                            <div>
                                <h3 className="text-sm font-bold text-slate-900 dark:text-white uppercase tracking-tight">Performance Trajectory</h3>
                                <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-1">Live data feed comparison</p>
                            </div>
                            <div className="flex gap-4">
                                <div className="flex items-center gap-2"><span className="w-3 h-3 rounded-full bg-[#F7CA00]" /> <span className="text-[9px] font-bold uppercase text-slate-500 tracking-wider">Revenue</span></div>
                                <div className="flex items-center gap-2"><span className="w-3 h-3 rounded-full bg-emerald-500" /> <span className="text-[9px] font-bold uppercase text-slate-500 tracking-wider">Procurement</span></div>
                            </div>
                        </div>
                        <div className="p-8 h-[450px]">
                            <ResponsiveContainer width="100%" height="100%">
                                <AreaChart data={analytics.chartData}>
                                    <defs>
                                        <linearGradient id="colorRev" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#F7CA00" stopOpacity={0.15}/><stop offset="95%" stopColor="#F7CA00" stopOpacity={0}/></linearGradient>
                                        <linearGradient id="colorPur" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#10b981" stopOpacity={0.15}/><stop offset="95%" stopColor="#10b981" stopOpacity={0}/></linearGradient>
                                    </defs>
                                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(0,0,0,0.03)" />
                                    <XAxis dataKey="date" axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#94a3b8', fontWeight: 700 }} />
                                    <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#94a3b8', fontWeight: 700 }} />
                                    <Tooltip contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 25px rgba(0,0,0,0.1)', fontSize: '12px', fontWeight: 'bold' }} />
                                    <Area type="monotone" dataKey="revenue" stroke="#F7CA00" strokeWidth={4} fill="url(#colorRev)" animationDuration={1000} />
                                    <Area type="monotone" dataKey="purchases" stroke="#10b981" strokeWidth={4} fill="url(#colorPur)" animationDuration={1000} />
                                </AreaChart>
                            </ResponsiveContainer>
                        </div>
                    </Card>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                        <Card>
                            <div className="px-6 py-4 border-b border-slate-100 dark:border-white/5">
                                <h3 className="text-sm font-bold text-slate-800 dark:text-white uppercase tracking-tight">Catalog Distribution</h3>
                            </div>
                            <div className="p-4 h-[320px]">
                                <ResponsiveContainer width="100%" height="100%">
                                    <PieChart>
                                        <Pie data={analytics.pieData} innerRadius={60} outerRadius={85} paddingAngle={5} dataKey="value">
                                            {analytics.pieData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                                        </Pie>
                                        <Tooltip />
                                        <Legend iconType="circle" wrapperStyle={{ fontSize: '10px', fontWeight: 'black', paddingTop: '10px' }} />
                                    </PieChart>
                                </ResponsiveContainer>
                            </div>
                        </Card>

                        <Card>
                            <div className="px-6 py-4 border-b border-slate-100 dark:border-white/5">
                                <h3 className="text-sm font-bold text-slate-800 dark:text-white uppercase tracking-tight">Order Intensity</h3>
                            </div>
                            <div className="p-4 h-[320px]">
                                <ResponsiveContainer width="100%" height="100%">
                                    <BarChart data={analytics.chartData}>
                                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(0,0,0,0.03)" />
                                        <XAxis dataKey="date" axisLine={false} tickLine={false} tick={{ fontSize: 9, fontWeight: 700 }} />
                                        <Tooltip cursor={{ fill: 'rgba(29, 78, 216, 0.05)' }} />
                                        <Bar dataKey="orders" fill="#F7CA00" radius={[4, 4, 0, 0]} barSize={25} />
                                    </BarChart>
                                </ResponsiveContainer>
                            </div>
                        </Card>
                    </div>
                </div>

                {/* Tactical Ledger Side Panel */}
                <div className="lg:col-span-4 space-y-8">
                    <Card>
                        <div className="px-6 py-5 border-b border-slate-100 dark:border-white/5 bg-slate-50/50 flex items-center justify-between">
                            <h3 className="text-[11px] font-black text-slate-900 dark:text-white uppercase tracking-widest">Alpha Product Index</h3>
                            <span className="text-[9px] font-bold text-blue-600 bg-blue-50 px-2 py-0.5 rounded uppercase">High Velocity</span>
                        </div>
                        <div className="divide-y divide-slate-50 dark:divide-white/5">
                            {data.products.slice(0, 8).map((p, i) => (
                                <div key={i} className="px-6 py-4 flex items-center justify-between hover:bg-slate-50 transition-colors group">
                                    <div className="flex items-center gap-4">
                                        <span className="text-xs font-bold text-slate-300 dark:text-slate-700 w-4 group-hover:text-blue-600">0{i+1}</span>
                                        <div>
                                            <p className="text-[11px] font-bold text-slate-900 dark:text-white uppercase leading-tight tracking-tight max-w-[150px] truncate">{p.name}</p>
                                            <p className="text-[9px] text-slate-400 font-bold uppercase tracking-wider mt-1">{p.category_name || 'General'}</p>
                                        </div>
                                    </div>
                                    <div className="text-right">
                                        <p className="text-xs font-bold text-slate-900 dark:text-white">{p.stock || 0}</p>
                                        <p className="text-[8px] font-bold text-slate-400 uppercase tracking-widest">In Warehouse</p>
                                    </div>
                                </div>
                            ))}
                        </div>
                        <div className="p-4 bg-slate-50 dark:bg-white/5 border-t border-slate-100 dark:border-white/5">
                            <button className="w-full py-3 bg-white dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-xl text-[10px] font-black uppercase tracking-[0.2em] text-[#F7CA00] hover:bg-blue-50 transition-all flex items-center justify-center gap-2">
                                Audit All Assets <ArrowRight className="h-3 w-3" />
                            </button>
                        </div>
                    </Card>

                    <Card className="p-6 bg-[#131921] text-white">
                        <div className="flex items-center gap-3 mb-6">
                            <div className="p-2 bg-amber-500 rounded-lg">
                                <AlertTriangle className="h-5 w-5 text-[#131921]" />
                            </div>
                            <h3 className="text-sm font-bold uppercase tracking-widest">Operational Health</h3>
                        </div>
                        <div className="space-y-4">
                            {[
                                { l: 'Zero Stock Manifest', v: data.products.filter(p => !p.stock || p.stock === 0).length, c: 'text-red-400' },
                                { l: 'Shortage Warning', v: data.products.filter(p => p.stock > 0 && p.stock < 10).length, c: 'text-amber-400' },
                                { l: 'Pending Consignments', v: data.orders.filter(o => o.status === 'ordered').length, c: 'text-blue-400' },
                            ].map((h, i) => (
                                <div key={i} className="flex items-center justify-between p-4 bg-white/5 border border-white/5 rounded-2xl backdrop-blur-md">
                                    <span className="text-[10px] font-bold uppercase text-slate-400 tracking-tighter">{h.l}</span>
                                    <span className={`text-sm font-black ${h.c}`}>{h.v}</span>
                                </div>
                            ))}
                        </div>
                        <button className="w-full mt-8 py-3.5 bg-[#FFA41C] text-[#131921] rounded-2xl text-[11px] font-black uppercase tracking-[0.2em] shadow-xl hover:bg-[#F5A623] transition-all hover:-translate-y-1 active:translate-y-0">
                            Launch Logistics Audit
                        </button>
                    </Card>
                </div>
            </div>

            {/* ── Recent Analytical Log ── */}
            <Card>
                <div className="px-6 py-5 border-b border-slate-100 dark:border-white/5 flex items-center justify-between bg-slate-50/50">
                    <h3 className="text-sm font-bold text-slate-900 dark:text-white uppercase tracking-tight">Recent Historical Transactions</h3>
                    <button className="text-xs font-bold text-[#F7CA00] hover:underline flex items-center gap-1">View Full Registry <ChevronRight className="h-3 w-3" /></button>
                </div>
                <div className="overflow-x-auto">
                    <table className="w-full text-left text-sm">
                        <thead>
                            <tr className="bg-slate-50/30 dark:bg-white/[0.02] border-b border-slate-100 dark:border-white/10 uppercase text-[10px] font-black text-slate-400 tracking-wider">
                                <th className="px-6 py-4">Transaction ID</th>
                                <th className="px-6 py-4">Identity</th>
                                <th className="px-6 py-4">Fulfillment Status</th>
                                <th className="px-6 py-4 text-center">Date Manifest</th>
                                <th className="px-6 py-4 text-right">Value</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-50 dark:divide-white/5">
                            {data.orders.slice(0, 10).map((o, i) => (
                                <tr key={i} className="hover:bg-slate-50/50 dark:hover:bg-white/5 transition-colors">
                                    <td className="px-6 py-4 font-bold text-[#F7CA00]">#{o.order_number || o.id.slice(0, 8)}</td>
                                    <td className="px-6 py-4">
                                        <p className="font-bold text-slate-800 dark:text-slate-200">{o.guest_name || o.customer_name || 'Walk-in'}</p>
                                        <p className="text-[10px] text-slate-400 uppercase font-medium">{o.customer_type || 'Retail'}</p>
                                    </td>
                                    <td className="px-6 py-4">
                                        <span className={`px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-widest border
                                            ${o.status === 'delivered' ? 'bg-emerald-50 text-emerald-600 border-emerald-100' : 'bg-amber-50 text-amber-600 border-amber-100'}`}>
                                            {o.status}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4 text-center text-slate-500 font-bold text-[11px]">{formatDate(o.created_at)}</td>
                                    <td className="px-6 py-4 text-right font-black text-slate-900 dark:text-white">{formatCurrency(o.total_amount)}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </Card>

        </div>
    );
}
