'use client';

import { useState, useEffect } from 'react';
import { 
    Banknote, TrendingUp, DollarSign, ArrowUpRight, ArrowDownRight, 
    Calendar, Download, Filter, Search, Printer, ChevronRight,
    PieChart as PieIcon, CreditCard, Banknote as BankIcon,
    History, ArrowRight, CheckCircle, Clock
} from 'lucide-react';
import { 
    AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
    BarChart, Bar, Legend, Cell, PieChart, Pie
} from 'recharts';
import PageLoader from '@/components/ui/PageLoader';
import { formatCurrency, formatDate } from '@/lib/utils';
import { SectionCard } from '@/components/ui/AmazonStyles';

/* ── Accounting Matrix Component ── */
export default function AccountingReportPage() {
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        setTimeout(() => setLoading(false), 800);
    }, []);

    if (loading) return <PageLoader />;

    return (
        <div className="max-w-[1600px] mx-auto px-6 py-8 bg-slate-50 dark:bg-[#070F14] min-h-screen font-sans">
            
            {/* ── Header ── */}
            <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-6 mb-10">
                <div className="flex items-center gap-5">
                    <div className="w-16 h-16 bg-[#EEAF1C] rounded-2xl flex items-center justify-center shadow-xl shadow-blue-500/20 ring-4 ring-blue-500/5">
                        <Banknote className="h-8 w-8 text-white" />
                    </div>
                    <div>
                        <h1 className="text-3xl font-bold text-slate-900 dark:text-white tracking-tight uppercase">Financial Hub</h1>
                        <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mt-1">General Ledger & Balance Insights</p>
                    </div>
                </div>
                
                <div className="flex flex-wrap items-center gap-3">
                    <button className="flex items-center gap-2 px-6 py-2.5 bg-[#EEAF1C] text-white text-[11px] font-black uppercase tracking-widest rounded-xl hover:bg-blue-700 shadow-lg shadow-blue-500/20 transition-all active:scale-95">
                        <Download className="h-4 w-4" /> Download Balance Sheet
                    </button>
                    <button className="p-2.5 bg-white dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-xl text-slate-400 hover:text-[#EEAF1C] transition-all shadow-sm">
                        <Printer className="h-4.5 w-4.5" />
                    </button>
                </div>
            </div>

            {/* ── Ledger Summary ── */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-10">
                {[
                    { label: 'Total Receivables', value: 'Rs. 1,240,500', sub: 'Owed by Customers', trend: '+5.2%', up: true, color: 'text-indigo-600' },
                    { label: 'Total Payables', value: 'Rs. 450,200', sub: 'Owed to Suppliers', trend: '-2.1%', up: false, color: 'text-rose-600' },
                    { label: 'Cash On Hand', value: 'Rs. 890,000', sub: 'Liquid Business Assets', trend: '+12%', up: true, color: 'text-emerald-600' },
                    { label: 'Net Profit', value: 'Rs. 790,300', sub: 'Current Fiscal Period', trend: '+8.4%', up: true, color: 'text-amber-600' },
                ].map((stat, i) => (
                    <SectionCard key={i} className="p-6">
                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-3">{stat.label}</p>
                        <div className="flex items-end justify-between">
                            <div>
                                <p className={`text-2xl font-black text-slate-900 dark:text-white tracking-tighter`}>{stat.value}</p>
                                <p className="text-[10px] text-slate-400 font-bold uppercase mt-1">{stat.sub}</p>
                            </div>
                            <div className={`px-2 py-1 rounded-lg text-[9px] font-black ${stat.up ? 'bg-emerald-50 text-emerald-600' : 'bg-red-50 text-red-600'}`}>
                                {stat.trend}
                            </div>
                        </div>
                    </SectionCard>
                ))}
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                <SectionCard className="lg:col-span-2 p-0 overflow-hidden">
                    <div className="px-6 py-5 border-b border-slate-100 dark:border-white/5 flex items-center justify-between bg-slate-50/50">
                        <h3 className="text-sm font-bold text-slate-900 dark:text-white uppercase tracking-tight">Recent Ledger Entries</h3>
                        <Filter className="h-4 w-4 text-slate-400 cursor-pointer hover:text-[#EEAF1C]" />
                    </div>
                    <div className="overflow-x-auto">
                        <table className="w-full text-left">
                            <thead className="bg-slate-50/30 dark:bg-white/[0.02] border-b border-slate-100 dark:border-white/10 uppercase text-[9px] font-black text-slate-400 tracking-widest">
                                <tr>
                                    <th className="px-6 py-4">Ref ID</th>
                                    <th className="px-6 py-4">Account Type</th>
                                    <th className="px-6 py-4">Description</th>
                                    <th className="px-6 py-4 text-right">Debit</th>
                                    <th className="px-6 py-4 text-right">Credit</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-50 dark:divide-white/5">
                                {[
                                    { id: '#TR-8291', type: 'Income', desc: 'Sale Order #SO-7721 - Customer Payment', d: 'Rs. 45,000', c: '-' },
                                    { id: '#TR-8290', type: 'Expense', desc: 'Supplier PO #PO-1120 - Cosmetic Restock', d: '-', c: 'Rs. 12,500' },
                                    { id: '#TR-8289', type: 'Revenue', desc: 'Service Fee Settlement', d: 'Rs. 2,500', c: '-' },
                                    { id: '#TR-8288', type: 'Payroll', desc: 'Monthly Salary Distribution - Logistics', d: '-', c: 'Rs. 150,000' },
                                    { id: '#TR-8287', type: 'Rent', desc: 'Warehouse Facility Rental - Zone A', d: '-', c: 'Rs. 85,000' },
                                ].map((tr, i) => (
                                    <tr key={i} className="hover:bg-slate-50/50 dark:hover:bg-white/5 transition-colors text-[11px] font-bold">
                                        <td className="px-6 py-4 text-[#EEAF1C] uppercase">{tr.id}</td>
                                        <td className="px-6 py-4">
                                            <span className={`px-2 py-0.5 rounded text-[9px] font-black uppercase ${tr.type === 'Income' ? 'bg-emerald-50 text-emerald-600' : 'bg-slate-100 text-slate-500'}`}>
                                                {tr.type}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 text-slate-500 max-w-[200px] truncate">{tr.desc}</td>
                                        <td className="px-6 py-4 text-right text-emerald-600">{tr.d}</td>
                                        <td className="px-6 py-4 text-right text-rose-600">{tr.c}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </SectionCard>

                <div className="space-y-8">
                    <SectionCard className="p-6">
                        <h3 className="text-sm font-bold text-slate-900 dark:text-white uppercase tracking-tight mb-6">Asset Allocation</h3>
                        <div className="h-[250px]">
                            <ResponsiveContainer width="100%" height="100%">
                                <BarChart data={[
                                    { name: 'Cash', value: 400 },
                                    { name: 'Stock', value: 700 },
                                    { name: 'Receivable', value: 300 },
                                ]}>
                                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(0,0,0,0.05)" />
                                    <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 10, fontWeight: 700 }} />
                                    <YAxis hide />
                                    <Tooltip />
                                    <Bar dataKey="value" fill="#EEAF1C" radius={[4, 4, 0, 0]} barSize={40} />
                                </BarChart>
                            </ResponsiveContainer>
                        </div>
                    </SectionCard>

                    <SectionCard className="p-6 bg-[#131921] text-white">
                        <div className="flex items-center gap-3 mb-6">
                            <History className="h-5 w-5 text-[#EEAF1C]" />
                            <h3 className="text-sm font-bold uppercase tracking-widest">Financial Health</h3>
                        </div>
                        <div className="space-y-4">
                            {[
                                { l: 'Net Margin', v: '18.4%', c: 'text-emerald-400' },
                                { l: 'Burn Rate', v: 'Rs. 45k/mo', c: 'text-slate-400' },
                                { l: 'Tax Liability', v: 'Rs. 12k', c: 'text-amber-400' },
                            ].map((h, i) => (
                                <div key={i} className="flex items-center justify-between p-4 bg-white/5 border border-white/5 rounded-2xl">
                                    <span className="text-[10px] font-bold uppercase text-slate-400 tracking-tighter">{h.l}</span>
                                    <span className={`text-sm font-black ${h.c}`}>{h.v}</span>
                                </div>
                            ))}
                        </div>
                    </SectionCard>
                </div>
            </div>
        </div>
    );
}
