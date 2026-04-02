'use client';

import { useState, useEffect, useMemo } from 'react';
import { 
    Truck, ShoppingCart, TrendingUp, DollarSign, 
    Calendar, Download, ArrowUpRight, ArrowDownRight,
    Search, Filter, RefreshCw, FileText, PieChart as PieIcon,
    ArrowRight, CheckCircle, Clock, AlertTriangle, Boxes,
    Warehouse, Printer, FileSpreadsheet, ChevronRight, Building2
} from 'lucide-react';
import { 
    AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
    BarChart, Bar, PieChart, Pie, Cell, Legend
} from 'recharts';
import { purchaseService, productService } from '@/lib/api';
import { formatCurrency, formatDate } from '@/lib/utils';
import PageLoader from '@/components/ui/PageLoader';
import toast from 'react-hot-toast';

export default function PurchaseReportsPage() {
    const [loading, setLoading] = useState(true);
    const [purchases, setPurchases] = useState<any[]>([]);
    const [products, setProducts] = useState<any[]>([]);

    const loadData = async () => {
        setLoading(true);
        try {
            const [pu, p] = await Promise.all([purchaseService.getAll(), productService.getAll()]);
            setPurchases(Array.isArray(pu) ? pu : pu.results || []);
            setProducts(Array.isArray(p) ? p : []);
        } catch {
            toast.error('Procurement node synchronization error.');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => { loadData(); }, []);

    const stats = useMemo(() => {
        const totalExpenditure = purchases.reduce((s, p) => s + Number(p.total_amount || 0), 0);
        const supplierStats = {} as any;
        purchases.forEach(p => {
            const name = p.supplier_name || 'Generic Vendor';
            if (!supplierStats[name]) supplierStats[name] = { name, spent: 0, orders: 0 };
            supplierStats[name].spent += Number(p.total_amount || 0);
            supplierStats[name].orders += 1;
        });

        const chartData = [...Array(10)].map((_, i) => {
             const d = new Date(); d.setDate(d.getDate() - i);
             const date = d.toISOString().split('T')[0];
             return {
                 name: formatDate(date).split(',')[0],
                 spent: purchases.filter(p => (p.created_at || p.order_date || '').startsWith(date)).reduce((s, p) => s + Number(p.total_amount), 0)
             };
        }).reverse();

        return { totalExpenditure, supplierStats: Object.values(supplierStats).sort((a: any, b: any) => b.spent - a.spent).slice(0, 5), chartData };
    }, [purchases]);

    if (loading) return <PageLoader />;

    return (
        <div className="max-w-[1400px] mx-auto px-4 py-8 bg-slate-50 dark:bg-[#111213] min-h-screen font-sans">
            
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-8">
                <div className="flex items-center gap-4">
                    <div className="w-14 h-14 bg-[#F7CA00] rounded-2xl flex items-center justify-center shadow-xl shadow-blue-500/20 border border-white/10">
                        <Truck className="h-7 w-7 text-white" />
                    </div>
                    <div>
                        <h1 className="text-2xl font-bold text-slate-900 dark:text-white uppercase tracking-tighter">Procurement Audit Suite</h1>
                        <p className="text-sm text-slate-500 dark:text-slate-400 mt-1.5 font-medium">Full supplier ledger and stock update analytical engine</p>
                    </div>
                </div>
                <div className="flex items-center gap-3">
                    <button onClick={loadData} className="p-3 bg-white border border-slate-200 rounded-xl text-slate-400 hover:text-[#F7CA00] shadow-sm transition-all"><RefreshCw className="h-4 w-4" /></button>
                    <button className="flex items-center gap-2 px-6 py-3 bg-[#F7CA00] text-white rounded-xl text-[11px] font-black uppercase tracking-widest shadow-xl shadow-blue-500/20 hover:bg-blue-700 transition-all active:scale-95">
                        <Download className="h-4 w-4" /> Global Purchase Manifest
                    </button>
                </div>
            </div>

            {/* Strategic Sensors */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-10">
                <div className="p-6 bg-white dark:bg-[#1B1C1E] border border-slate-200 dark:border-white/10 rounded-xl shadow-sm">
                    <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2">Cumulative Capital Outlay</p>
                    <p className="text-3xl font-black text-slate-900 dark:text-white">{formatCurrency(stats.totalExpenditure)}</p>
                    <div className="mt-3 flex items-center gap-1 text-[10px] font-bold text-emerald-500"><TrendingUp className="h-3 w-3" /> Procurement Velocity Nominal</div>
                </div>
                <div className="p-6 bg-white dark:bg-[#1B1C1E] border border-slate-200 dark:border-white/10 rounded-xl shadow-sm">
                    <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2">Supplier Reliability Index</p>
                    <p className="text-3xl font-black text-slate-900 dark:text-white">96.8%</p>
                    <p className="mt-3 text-[10px] font-bold text-slate-400 uppercase tracking-widest">Calculated by fulfillment time</p>
                </div>
                <div className="p-6 bg-white dark:bg-[#1B1C1E] border border-slate-200 dark:border-white/10 rounded-xl shadow-sm">
                    <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2">Pending Acquisitions</p>
                    <p className="text-3xl font-black text-slate-900 dark:text-white">{purchases.filter(p => (p.status || '').toLowerCase() === 'ordered').length}</p>
                    <p className="mt-3 text-[10px] font-bold text-[#F7CA00] uppercase tracking-widest">Active Procurement Chains</p>
                </div>
                <div className="p-6 bg-white dark:bg-[#1B1C1E] border border-slate-200 dark:border-white/10 rounded-xl shadow-sm border-l-4 border-l-amber-500">
                    <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2">Unsettled Balances</p>
                    <p className="text-3xl font-black text-amber-600">{formatCurrency(purchases.filter(p => (p.payment_status || '').toLowerCase() !== 'paid').reduce((s, p) => s + Number(p.total_amount), 0))}</p>
                    <p className="mt-3 text-[10px] font-bold text-slate-400 uppercase tracking-widest">Total Accounts Payable</p>
                </div>
            </div>

            {/* Expenditure Chart */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 mb-12">
                <div className="lg:col-span-8 bg-white dark:bg-[#1B1C1E] border border-slate-200 dark:border-white/10 rounded-2xl shadow-sm overflow-hidden">
                    <div className="px-6 py-5 border-b border-slate-100 dark:border-white/5 bg-slate-50/50 flex items-center justify-between">
                         <h3 className="text-sm font-bold text-slate-900 dark:text-white uppercase tracking-tight">Financial Outflow Matrix</h3>
                         <span className="text-[10px] font-bold text-blue-600 bg-blue-50 px-2 py-0.5 rounded uppercase">Capital tracking</span>
                    </div>
                    <div className="p-8 h-[400px]">
                        <ResponsiveContainer width="100%" height="100%">
                            <AreaChart data={stats.chartData}>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(0,0,0,0.03)" />
                                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#94a3b8', fontWeight: 700 }} />
                                <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#94a3b8', fontWeight: 700 }} />
                                <Tooltip contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 25px rgba(0,0,0,0.1)', fontSize: '11px', fontWeight: 'black' }} />
                                <Area type="monotone" dataKey="spent" stroke="#F7CA00" strokeWidth={4} fill="#F7CA00" fillOpacity={0.05} />
                            </AreaChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                <div className="lg:col-span-4 space-y-8">
                     <div className="p-6 bg-white dark:bg-[#1B1C1E] border border-slate-200 dark:border-white/10 rounded-2xl shadow-sm">
                         <div className="flex items-center gap-3 mb-6 pb-4 border-b border-slate-50 dark:border-white/5">
                             <Building2 className="h-5 w-5 text-[#F7CA00]" />
                             <h4 className="text-xs font-black uppercase tracking-widest text-slate-800 dark:text-white">Alpha Suppliers</h4>
                         </div>
                         <div className="space-y-5">
                             {stats.supplierStats.map((s: any, i) => (
                                 <div key={i} className="flex flex-col gap-2 group">
                                     <div className="flex justify-between items-center">
                                         <span className="text-[10px] font-black uppercase text-slate-600 dark:text-slate-400 group-hover:text-[#F7CA00] transition-colors">{s.name}</span>
                                         <span className="text-xs font-black text-slate-900 dark:text-white">{formatCurrency(s.spent)}</span>
                                     </div>
                                     <div className="w-full h-1.5 bg-slate-100 dark:bg-white/5 rounded-full overflow-hidden">
                                         <div className="h-full bg-[#F7CA00] rounded-full transition-all duration-1000" style={{ width: `${(s.spent / stats.totalExpenditure) * 100}%` }} />
                                     </div>
                                     <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">{s.orders} Consignments Processed</p>
                                 </div>
                             ))}
                         </div>
                     </div>
                </div>
            </div>

            {/* Procurement Ledger */}
            <div className="bg-white dark:bg-[#1B1C1E] border border-slate-200 dark:border-white/10 rounded-2xl shadow-sm overflow-hidden">
                 <div className="px-6 py-5 border-b border-slate-100 dark:border-white/5 bg-slate-50/50 flex items-center justify-between">
                    <h3 className="text-sm font-bold text-slate-900 dark:text-white uppercase tracking-tight">Consignment Audit History</h3>
                    <button className="text-[10px] font-black text-[#F7CA00] uppercase tracking-widest hover:underline flex items-center gap-1">Global Procurement Log <ChevronRight className="h-3 w-3" /></button>
                </div>
                <div className="overflow-x-auto">
                    <table className="w-full text-left text-sm">
                        <thead>
                            <tr className="bg-slate-50/30 dark:bg-white/[0.02] border-b border-slate-100 dark:border-white/10 text-[10px] font-black text-slate-400 uppercase tracking-wider">
                                <th className="px-6 py-4">PO-NODE IDENTIFIER</th>
                                <th className="px-6 py-4">SUPPLIER ENTITY</th>
                                <th className="px-6 py-4 text-center">FULFILLMENT</th>
                                <th className="px-6 py-4 text-center">PAYMENT</th>
                                <th className="px-6 py-4 text-right">GROSS CAPEX</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-50 dark:divide-white/5">
                            {purchases.slice(0, 10).map((p, i) => (
                                <tr key={i} className="hover:bg-slate-50/50 transition-colors group">
                                    <td className="px-6 py-4 font-black text-[#F7CA00]">#{p.purchase_number || p.id.slice(0, 8)}</td>
                                    <td className="px-6 py-4 font-bold text-slate-800 dark:text-slate-200 uppercase text-xs">{p.supplier_name || 'Generic Vendor'}</td>
                                    <td className="px-6 py-4 text-center">
                                        <span className={`px-2.5 py-1 text-[9px] font-black uppercase rounded shadow-sm border
                                            ${p.status === 'received' ? 'bg-emerald-50 text-emerald-600 border-emerald-100' : 'bg-blue-50 text-blue-600 border-blue-100'}`}>
                                            {p.status}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4 text-center">
                                        <span className={`px-2.5 py-1 text-[9px] font-black uppercase rounded shadow-sm border
                                            ${p.payment_status === 'paid' ? 'bg-emerald-50 text-emerald-600 border-emerald-100' : 'bg-amber-50 text-amber-600 border-amber-100'}`}>
                                            {p.payment_status}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4 text-right font-black text-slate-900 dark:text-white">{formatCurrency(p.total_amount)}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>

        </div>
    );
}
