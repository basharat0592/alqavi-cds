'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { 
    FileText, TrendingUp, Search, Calendar, Download, Filter, 
    Printer, ArrowRight, CheckCircle, Clock, Users, DollarSign,
    ChevronRight, ChevronLeft, LayoutDashboard, RefreshCw, Eye, ShoppingBag, CreditCard, Info
} from 'lucide-react';
import PageLoader from '@/components/ui/PageLoader';
import { formatCurrency, formatDate } from '@/lib/utils';
import toast from 'react-hot-toast';

/* ─────────────────────────────────────────────────────────────────────────────
   PURE AMAZON RETAIL DESIGN SYSTEM - SALES REPORTS
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

const inputCls = "w-full h-[31px] px-3 border border-[#888c8e] rounded-[3px] text-[13px] outline-none focus:border-[#e77600] focus:shadow-[0_0_3px_2px_rgba(228,121,17,0.5)] placeholder:text-[#aaa] bg-white transition-all font-medium";

export default function SalesStatementsPage() {
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');

    useEffect(() => {
        setTimeout(() => setLoading(false), 800);
    }, []);

    if (loading) return <PageLoader />;

    const mockData = [
        { id: 'ST-0042', date: '2026-04-02', name: 'Al-Madina Traders', count: 12, d: 150000, c: 145000, b: 5000 },
        { id: 'ST-0041', date: '2026-04-01', name: 'Zeeshan Cosmetics', count: 5, d: 85000, c: 85000, b: 0 },
        { id: 'ST-0040', date: '2026-04-01', name: 'Metro Mart Retail', count: 3, d: 12000, c: 10000, b: 2000 },
        { id: 'ST-0039', date: '2026-03-31', name: 'The Glow Hub', count: 22, d: 450000, c: 400000, b: 50000 },
        { id: 'ST-0038', date: '2026-03-31', name: 'Luxury Scents Pak', count: 8, d: 110000, c: 110000, b: 0 },
    ];

    return (
        <div className="bg-[#F8F9FA] min-h-screen pb-20 font-sans text-[#0f1111]">
            <div className="max-w-[1440px] mx-auto px-3 sm:px-6 pt-5 text-left">
                
                {/* ── Breadcrumb ── */}
                <div className="flex items-center gap-1 text-[12px] text-[#565959] mb-2 no-print">
                    <Link href="/admin/dashboard" className="hover:text-[#c45500] hover:underline">Dashboard</Link>
                    <ChevronRight size={10} />
                    <Link href="/admin/reports" className="hover:text-[#c45500] hover:underline">Reports</Link>
                    <ChevronRight size={10} />
                    <span className="text-[#c45500] font-bold">Sales Statements</span>
                </div>

                <div className="flex items-center justify-between mb-4 no-print">
                    <div>
                        <h1 className="text-[22px] font-normal text-[#111]">Sales Statements</h1>
                    </div>
                    <div className="flex gap-2">
                        <Btn variant="secondary" onClick={() => toast.success('Manifest Exported')}>
                            <Download size={14} /> Export All
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
                        { label: 'Total Sales', value: 'Rs. 4.2M', icon: TrendingUp },
                        { label: 'Statements Created', value: '142 Statements', icon: FileText },
                        { label: 'Average Order Value', value: 'Rs. 28,400', icon: ShoppingBag },
                        { label: 'Payment Match', value: '100.0%', icon: CheckCircle, color: 'text-[#007600]' },
                    ].map((stat, i) => (
                        <div key={i} className="bg-white border border-[#ddd] rounded-[4px] p-5 shadow-sm">
                            <div className="flex items-center gap-3 mb-2">
                                <stat.icon size={16} className="text-[#565959]" />
                                <p className="text-[11px] font-bold text-[#565959] uppercase tracking-wider">{stat.label}</p>
                            </div>
                            <p className={`text-[20px] font-normal text-[#111] tracking-tight ${stat.color || ''}`}>{stat.value}</p>
                        </div>
                    ))}
                </div>

                {/* Control Matrix */}
                <div className="bg-white border border-[#ddd] rounded-[4px] p-5 mb-6 shadow-sm flex flex-wrap items-center gap-5 no-print animate-in fade-in slide-in-from-top-2 duration-500">
                    <div className="relative flex-1 min-w-[300px]">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[#aaa]" />
                        <input
                            value={searchTerm}
                            onChange={e => setSearchTerm(e.target.value)}
                            placeholder="Search by statement number or customer..."
                            className={inputCls + " pl-10"}
                        />
                    </div>
                    <div className="flex items-center gap-2">
                        <Btn variant="secondary"><Filter size={14} /> Filter</Btn>
                    </div>
                </div>

                {/* Main Ledger Table */}
                <div className="bg-white border border-[#ddd] rounded-[4px] shadow-sm overflow-x-auto animate-in fade-in duration-700">
                    <table className="w-full text-left border-collapse min-w-[800px]">
                        <thead>
                            <tr className="bg-[#f7f8fa] border-b border-[#ddd] text-[11px] font-bold text-[#565959] uppercase tracking-wider">
                                <th className="px-3 sm:px-6 py-2.5 sm:py-3">Statement Number</th>
                                <th className="px-3 sm:px-6 py-2.5 sm:py-3">Date</th>
                                <th className="px-3 sm:px-6 py-2.5 sm:py-3">Customer</th>
                                <th className="px-3 sm:px-6 py-2.5 sm:py-3 text-right">Total Sales</th>
                                <th className="px-3 sm:px-6 py-2.5 sm:py-3 text-right">Total Paid</th>
                                <th className="px-3 sm:px-6 py-2.5 sm:py-3 text-right">Remaining Balance</th>
                                <th className="px-3 sm:px-6 py-2.5 sm:py-3 text-center">Action</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-[#eee]">
                            {mockData.map((st, i) => (
                                <tr key={i} className="hover:bg-[#fcfdff] transition-colors group text-[13px]">
                                    <td className="px-3 sm:px-6 py-3 sm:py-4">
                                        <div className="text-[14px] font-bold text-[#007185] group-hover:underline cursor-pointer">
                                            {st.id}
                                        </div>
                                    </td>
                                    <td className="px-3 sm:px-6 py-3 sm:py-4">
                                        <div className="text-[#565959] font-medium flex items-center gap-1.5">
                                            <Calendar size={12} className="text-[#adb1b8]" /> {st.date}
                                        </div>
                                    </td>
                                    <td className="px-3 sm:px-6 py-3 sm:py-4">
                                        <div className="text-[#111] font-bold flex items-center gap-2">
                                            <Users size={14} className="text-[#adb1b8]" /> {st.name}
                                        </div>
                                        <div className="text-[11px] text-[#565959] mt-1 font-medium italic">{st.count} Orders</div>
                                    </td>
                                    <td className="px-3 sm:px-6 py-3 sm:py-4 text-right text-[#B12704] font-bold">{formatCurrency(st.d)}</td>
                                    <td className="px-3 sm:px-6 py-3 sm:py-4 text-right text-[#007600] font-bold">{formatCurrency(st.c)}</td>
                                    <td className="px-3 sm:px-6 py-3 sm:py-4 text-right font-black">{formatCurrency(st.b)}</td>
                                    <td className="px-3 sm:px-6 py-3 sm:py-4 text-center">
                                        <button className="p-1.5 border border-[#ddd] rounded bg-white hover:bg-[#f7f8fa] text-[#565959] shadow-sm transition-colors">
                                            <Download size={14} />
                                        </button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>

                {/* Summary Note */}
                <div className="mt-8 bg-[#fff4e5] border border-[#ffb347]/30 rounded-[4px] p-4 flex gap-4 items-start animate-in fade-in duration-1000 no-print">
                    <Info className="text-[#e47911] shrink-0 mt-0.5" size={18} />
                    <div>
                        <p className="text-[13px] font-bold text-[#111]">Note on Balances</p>
                        <p className="text-[12px] text-[#565959] leading-relaxed">Balances are updated daily. For live payments, check the customer ledger page.</p>
                    </div>
                </div>
            </div>
        </div>
    );
}
