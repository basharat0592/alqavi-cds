'use client';

import { useState, useEffect } from 'react';
import { 
    FileText, TrendingUp, Search, Calendar, Download, Filter, 
    Printer, ArrowRight, CheckCircle, Clock, Users, DollarSign
} from 'lucide-react';
import PageLoader from '@/components/ui/PageLoader';
import { formatCurrency, formatDate } from '@/lib/utils';
import { SectionCard } from '@/components/ui/QaviStyles';

/* ── Sales Statements Matrix ── */
export default function SalesStatementsPage() {
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
                    <div className="w-16 h-16 bg-[#F59E0B] rounded-2xl flex items-center justify-center shadow-xl shadow-blue-500/20 ring-4 ring-blue-500/5">
                        <FileText className="h-8 w-8 text-white" />
                    </div>
                    <div>
                        <h1 className="text-3xl font-bold text-slate-900 dark:text-white tracking-tight uppercase">Sales Ledger</h1>
                        <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mt-1">Official Sales Statements & Ledger Manifests</p>
                    </div>
                </div>
                
                <div className="flex flex-wrap items-center gap-3">
                    <button className="flex items-center gap-2 px-6 py-2.5 bg-[#F59E0B] text-white text-[11px] font-black uppercase tracking-widest rounded-xl hover:bg-blue-700 shadow-lg shadow-blue-500/20 transition-all active:scale-95">
                        <Download className="h-4 w-4" /> Export All Statements
                    </button>
                </div>
            </div>

            {/* ── Analytical Ledger Strip ── */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-10">
                {[
                    { label: 'Total Sales Manifest', value: 'Rs. 4.2M' },
                    { label: 'Statements Issued', value: '142 Files' },
                    { label: 'Avg Sale Value', value: 'Rs. 28,400' },
                    { label: 'Reconciliation', value: '100.0%', color: 'text-emerald-500' },
                ].map((stat, i) => (
                    <SectionCard key={i} className="p-6">
                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-2">{stat.label}</p>
                        <p className={`text-2xl font-black text-slate-900 dark:text-white tracking-tighter ${stat.color || ''}`}>{stat.value}</p>
                    </SectionCard>
                ))}
            </div>

            {/* ── Main Ledger Table ── */}
            <SectionCard className="p-0 overflow-hidden">
                <div className="px-6 py-5 border-b border-slate-100 dark:border-white/5 flex items-center justify-between bg-slate-50/50">
                    <div className="relative max-w-sm w-full">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                        <input 
                            type="text" 
                            placeholder="Search Statement ID, Customer Name..." 
                            className="w-full bg-white dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-xl py-2.5 pl-10 pr-4 text-xs font-bold outline-none focus:border-[#F59E0B] transition-all"
                        />
                    </div>
                    <div className="flex items-center gap-3">
                        <button className="p-2.5 bg-white dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-xl text-slate-400 hover:text-[#F59E0B] shadow-sm"><Filter className="h-4.5 w-4.5" /></button>
                        <button className="p-2.5 bg-white dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-xl text-slate-400 hover:text-[#F59E0B] shadow-sm"><Printer className="h-4.5 w-4.5" /></button>
                    </div>
                </div>
                
                <div className="overflow-x-auto">
                    <table className="w-full text-left">
                        <thead className="bg-slate-50/30 dark:bg-white/[0.02] border-b border-slate-100 dark:border-white/10 uppercase text-[9px] font-black text-slate-400 tracking-widest">
                            <tr>
                                <th className="px-6 py-4">Statement ID</th>
                                <th className="px-6 py-4 text-center">Date Manifest</th>
                                <th className="px-6 py-4">Identity</th>
                                <th className="px-6 py-4">Transactions</th>
                                <th className="px-6 py-4 text-right">Debit</th>
                                <th className="px-6 py-4 text-right">Credit</th>
                                <th className="px-6 py-4 text-right">Balance</th>
                                <th className="px-6 py-4">Action</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-50 dark:divide-white/5">
                            {[
                                { id: 'ST-0042', date: '2026-04-02', name: 'Al-Madina Traders', count: 12, d: 'Rs. 150,000', c: 'Rs. 145,000', b: 'Rs. 5,000' },
                                { id: 'ST-0041', date: '2026-04-01', name: 'Zeeshan Cosmetics', count: 5, d: 'Rs. 85,000', c: 'Rs. 85,000', b: 'Rs. 0' },
                                { id: 'ST-0040', date: '2026-04-01', name: 'Metro Mart Retail', count: 3, d: 'Rs. 12,000', c: 'Rs. 10,000', b: 'Rs. 2,000' },
                                { id: 'ST-0039', date: '2026-03-31', name: 'The Glow Hub', count: 22, d: 'Rs. 450,000', c: 'Rs. 400,000', b: 'Rs. 50,000' },
                                { id: 'ST-0038', date: '2026-03-31', name: 'Luxury Scents Pak', count: 8, d: 'Rs. 110,000', c: 'Rs. 110,000', b: 'Rs. 0' },
                            ].map((st, i) => (
                                <tr key={i} className="hover:bg-slate-50/50 dark:hover:bg-white/5 transition-colors text-[11px] font-bold">
                                    <td className="px-6 py-4 text-[#F59E0B] uppercase font-black">{st.id}</td>
                                    <td className="px-6 py-4 text-center text-slate-400">{st.date}</td>
                                    <td className="px-6 py-4 text-slate-900 dark:text-white uppercase tracking-tight">{st.name}</td>
                                    <td className="px-6 py-4 text-slate-500 uppercase">{st.count} Items</td>
                                    <td className="px-6 py-4 text-right text-rose-600">{st.d}</td>
                                    <td className="px-6 py-4 text-right text-emerald-600">{st.c}</td>
                                    <td className="px-6 py-4 text-right">{st.b}</td>
                                    <td className="px-6 py-4">
                                        <button className="p-1.5 text-slate-400 hover:text-[#F59E0B] transition-colors"><Download className="h-4 w-4" /></button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </SectionCard>
        </div>
    );
}
