'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { 
    Banknote, TrendingUp, DollarSign, ArrowUpRight, ArrowDownRight, 
    Calendar, Download, Filter, Search, Printer, ChevronRight,
    PieChart as PieIcon, CreditCard, Banknote as BankIcon,
    History, ArrowRight, CheckCircle, Clock, Info, RefreshCw
} from 'lucide-react';
import PageLoader from '@/components/ui/PageLoader';
import { formatCurrency, formatDate } from '@/lib/utils';
import toast from 'react-hot-toast';

/* ─────────────────────────────────────────────────────────────────────────────
   PURE AMAZON RETAIL DESIGN SYSTEM - FINANCIAL REPORTS
   ───────────────────────────────────────────────────────────────────────────── */
const Btn = ({ children, onClick, loading, variant = 'primary', className = '', type = 'button', disabled = false }: any) => {
    const styles = {
        primary: 'bg-gradient-to-b from-[#f7dfa5] to-[#f0c14b] border-[#a88734] hover:from-[#f5d78e] hover:to-[#eeb933] text-[#0f1111] shadow-sm',
        secondary: 'bg-gradient-to-b from-[#f7f8fa] to-[#e7e9ec] border-[#adb1b8] hover:from-[#eef1f3] hover:to-[#dce0e4] text-[#0f1111] shadow-sm',
    };
    return (
        <button type={type} onClick={onClick} disabled={loading || disabled}
            className={`h-[29px] px-4 rounded-[3px] text-[13px] font-medium border transition-all flex items-center justify-center gap-2 disabled:opacity-60 active:scale-[0.98] ${styles[variant as keyof typeof styles]} ${className}`}>
            {children}
            {loading && <RefreshCw className="h-3 w-3 animate-spin" />}
        </button>
    );
};

export default function AccountingReportPage() {
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        setTimeout(() => setLoading(false), 800);
    }, []);

    if (loading) return <PageLoader />;

    return (
        <div className="bg-[#F8F9FA] min-h-screen pb-20 font-sans text-[#0f1111]">
            <div className="max-w-[1440px] mx-auto px-6 pt-5 text-left">
                
                {/* ── Breadcrumb ── */}
                <div className="flex items-center gap-1 text-[12px] text-[#565959] mb-2 no-print">
                    <Link href="/admin/dashboard" className="hover:text-[#c45500] hover:underline">Dashboard</Link>
                    <ChevronRight size={10} />
                    <Link href="/admin/reports" className="hover:text-[#c45500] hover:underline">Reports Center</Link>
                    <ChevronRight size={10} />
                    <span className="text-[#c45500] font-bold">Financial Statements</span>
                </div>

                <div className="flex items-center justify-between mb-4 no-print">
                    <div>
                        <h1 className="text-[22px] font-normal text-[#111]">General Ledger & Financial Health</h1>
                    </div>
                    <div className="flex gap-2">
                        <Btn variant="secondary" onClick={() => toast.success('Balance Sheet Downloaded')}>
                            <Download size={14} /> Download PDF
                        </Btn>
                        <Btn variant="secondary" onClick={() => window.print()}>
                            <Printer size={14} /> Print
                        </Btn>
                    </div>
                </div>
                <div className="border-b border-[#ddd] mb-6 no-print" />

                {/* Tactical Sensors */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
                    {[
                        { label: 'Total Receivables', value: 'Rs. 1,240,500', trend: '+5.2%', up: true },
                        { label: 'Total Payables', value: 'Rs. 450,200', trend: '-2.1%', up: false },
                        { label: 'Cash On Hand', value: 'Rs. 890,000', trend: '+12%', up: true },
                        { label: 'Net Profit', value: 'Rs. 790,300', trend: '+8.4%', up: true },
                    ].map((stat, i) => (
                        <div key={i} className="bg-white border border-[#ddd] rounded-[4px] p-5 shadow-sm">
                            <div className="flex items-center justify-between mb-2">
                                <p className="text-[11px] font-bold text-[#565959] uppercase tracking-wider">{stat.label}</p>
                                <span className={`text-[10px] font-black ${stat.up ? 'text-[#007600]' : 'text-[#B12704]'}`}>{stat.trend}</span>
                            </div>
                            <p className="text-[20px] font-normal text-[#111]">{stat.value}</p>
                        </div>
                    ))}
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    {/* Main Ledger Table */}
                    <div className="lg:col-span-2 bg-white border border-[#ddd] rounded-[4px] shadow-sm overflow-hidden animate-in fade-in duration-700">
                        <div className="px-5 py-3 bg-[#f7f8fa] border-b border-[#ddd] flex justify-between items-center">
                            <h3 className="text-[14px] font-bold text-[#111]">Recent Ledger Entries</h3>
                            <button className="text-[12px] text-[#007185] hover:underline hover:text-[#c45500]">View All</button>
                        </div>
                        <table className="w-full text-left border-collapse">
                            <thead>
                                <tr className="border-b border-[#ddd] text-[11px] font-bold text-[#565959] uppercase tracking-wider">
                                    <th className="px-6 py-3">Ref ID</th>
                                    <th className="px-6 py-3">Description</th>
                                    <th className="px-6 py-3 text-right">Debit</th>
                                    <th className="px-6 py-3 text-right">Credit</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-[#eee]">
                                {[
                                    { id: '#TR-8291', type: 'Income', desc: 'Sale Order #SO-7721 - Customer Payment', d: 'Rs. 45,000', c: '-' },
                                    { id: '#TR-8290', type: 'Expense', desc: 'Supplier PO #PO-1120 - Cosmetic Restock', d: '-', c: 'Rs. 12,500' },
                                    { id: '#TR-8289', type: 'Revenue', desc: 'Service Fee Settlement', d: 'Rs. 2,500', c: '-' },
                                    { id: '#TR-8288', type: 'Payroll', desc: 'Monthly Salary Distribution - Logistics', d: '-', c: 'Rs. 150,000' },
                                    { id: '#TR-8287', type: 'Rent', desc: 'Warehouse Facility Rental - Zone A', d: '-', c: 'Rs. 85,000' },
                                ].map((tr, i) => (
                                    <tr key={i} className="hover:bg-[#fcfdff] transition-colors group text-[13px]">
                                        <td className="px-6 py-4 font-bold text-[#007185]">{tr.id}</td>
                                        <td className="px-6 py-4">
                                            <div className="text-[#111] font-medium">{tr.desc}</div>
                                            <span className={`text-[10px] font-black uppercase ${tr.type === 'Income' ? 'text-[#007600]' : 'text-[#565959]'}`}>{tr.type}</span>
                                        </td>
                                        <td className="px-6 py-4 text-right text-[#007600] font-bold">{tr.d}</td>
                                        <td className="px-6 py-4 text-right text-[#B12704] font-bold">{tr.c}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>

                    <div className="space-y-6">
                        {/* Summary Pill */}
                        <div className="bg-white border border-[#ddd] rounded-[4px] p-6 shadow-sm">
                            <h3 className="text-[14px] font-bold text-[#111] mb-5 pb-2 border-b border-[#eee]">Financial Efficiency</h3>
                            <div className="space-y-5">
                                {[
                                    { l: 'Net Margin', v: '18.4%', c: 'text-[#007600]' },
                                    { l: 'Burn Rate', v: 'Rs. 45k/mo', c: 'text-[#565959]' },
                                    { l: 'Tax Liability', v: 'Rs. 12k', c: 'text-[#e47911]' },
                                ].map((h, i) => (
                                    <div key={i} className="flex items-center justify-between">
                                        <span className="text-[12px] font-medium text-[#565959]">{h.l}</span>
                                        <span className={`text-[14px] font-bold ${h.c}`}>{h.v}</span>
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* Note */}
                        <div className="bg-[#fff4e5] border border-[#ffb347]/30 rounded-[4px] p-4 flex gap-3 animate-in fade-in duration-1000 no-print">
                            <Info className="text-[#e47911] shrink-0 mt-0.5" size={16} />
                            <p className="text-[12px] text-[#565959] leading-relaxed font-medium">Account balances are adjusted for current period depreciation and fiscal adjustments.</p>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
