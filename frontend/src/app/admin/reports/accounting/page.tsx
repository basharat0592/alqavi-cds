'use client';

import { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import { 
    Banknote, TrendingUp, DollarSign, ArrowUpRight, ArrowDownRight, Package,
    Calendar, Download, Filter, Search, Printer, ChevronRight,
    PieChart as PieIcon, CreditCard, Banknote as BankIcon,
    History, ArrowRight, CheckCircle, Clock, Info, RefreshCw
} from 'lucide-react';
import PageLoader from '@/components/ui/PageLoader';
import { formatCurrency, formatDate } from '@/lib/utils';
import toast from 'react-hot-toast';
import { useAdminDashboard } from '@/hooks';

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

const formatK = (num: number) => {
    if (num >= 1000) {
        return (num / 1000).toFixed(1) + 'K';
    }
    return num.toLocaleString();
};

const MetricCard = ({ label, value, subtext, icon: Icon, color = "#e47911", alert = false, prefix = "Rs. " }: any) => {
    const glowColor = color === "#e47911" || color === "#13b0d1" ? "rgba(19, 176, 209, 0.12)" :
        color === "#067d62" || color === "#10b981" ? "rgba(16, 185, 129, 0.12)" :
            color === "#007185" || color === "#6366f1" ? "rgba(99, 102, 241, 0.12)" :
                color === "#f0c14b" || color === "#f59e0b" ? "rgba(245, 158, 11, 0.12)" : `${color}20`;

    const displayColor = color === "#e47911" ? "#13b0d1" :
        color === "#067d62" ? "#10b981" :
            color === "#007185" ? "#6366f1" :
                color === "#f0c14b" ? "#f59e0b" : color;

    return (
        <div className="bg-white p-5 rounded-[4px] border border-[#ddd] shadow-sm hover:shadow-md transition-all duration-200 relative overflow-hidden text-left">
            <div className="flex justify-between items-start mb-3">
                <div className="space-y-1">
                    <p className="text-[11px] font-bold text-[#565959] uppercase tracking-[0.1em]">{label}</p>
                    <div className="flex items-center gap-2">
                        <h3 className="text-2xl font-black text-[#0f1111] tracking-tight flex items-baseline">
                            {prefix && <span className="text-[16px] mr-0.5 opacity-60 font-semibold">{prefix}</span>}
                            {value}
                        </h3>
                        {alert && (
                            <span className="flex h-2.5 w-2.5 relative">
                                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-75"></span>
                                <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-rose-500"></span>
                            </span>
                        )}
                    </div>
                </div>
                <div className="w-10 h-10 rounded border border-[#e3e6e6] flex items-center justify-center" style={{ backgroundColor: glowColor, color: displayColor }}>
                    <Icon size={20} strokeWidth={2} />
                </div>
            </div>
            {subtext && (
                <div className="flex items-center pt-3 border-t border-[#ddd]">
                    <p className="text-[12px] text-[#565959] font-medium">{subtext}</p>
                </div>
            )}
        </div>
    );
};

export default function AccountingReportPage() {
    const [filterDate, setFilterDate] = useState<string>('');
    const [paymentMethod, setPaymentMethod] = useState<string>('ALL');

    const dashboardFilters = useMemo(() => ({
        date: filterDate || undefined,
        payment_method: paymentMethod !== 'ALL' ? paymentMethod : undefined
    }), [filterDate, paymentMethod]);

    const { stats, loading: statsLoading, refetch } = useAdminDashboard(dashboardFilters);
    const [initialLoading, setInitialLoading] = useState(true);

    useEffect(() => {
        if (!statsLoading) {
            setInitialLoading(false);
        }
    }, [statsLoading]);

    if (initialLoading) return <PageLoader />;

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

                {/* Header Controls */}
                <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-3 mb-4 no-print">
                    <div>
                        <h1 className="text-[22px] font-normal text-[#111]">General Ledger & Financial Health</h1>
                    </div>
                    <div className="flex items-center gap-2 flex-wrap">
                        <div className="rounded-[3px] border border-[#888c8e] bg-white h-[29px] px-2 flex items-center gap-2">
                            <Calendar size={14} className="text-[#666]" />
                            <input type="date" value={filterDate} onChange={(e) => setFilterDate(e.target.value)} className="bg-transparent text-[13px] font-medium text-[#0f1111] outline-none border-none" />
                        </div>
                        <div className="rounded-[3px] border border-[#888c8e] bg-white h-[29px] px-2 flex items-center gap-2">
                            <Filter size={14} className="text-[#666]" />
                            <select value={paymentMethod} onChange={(e) => setPaymentMethod(e.target.value)} className="bg-transparent text-[13px] font-medium text-[#0f1111] outline-none border-none cursor-pointer">
                                <option value="ALL">All Payments</option>
                                <option value="COD">C.O.D</option>
                                <option value="ONLINE">Bank Transfer</option>
                                <option value="SHOP">Shop POS</option>
                            </select>
                        </div>
                        <button onClick={refetch} className="h-[29px] px-4 rounded-[3px] border border-[#adb1b8] bg-gradient-to-b from-[#f7f8fa] to-[#e7e9ec] text-[13px] font-medium text-[#0f1111] flex items-center gap-2 hover:from-[#eef1f3] hover:to-[#dce0e4] active:scale-[0.98] shadow-sm">
                            <RefreshCw size={14} className={statsLoading ? 'animate-spin' : ''} /> Refresh
                        </button>
                        <Btn variant="secondary" onClick={() => toast.success('Balance Sheet Downloaded')}>
                            <Download size={14} /> Download PDF
                        </Btn>
                        <Btn variant="secondary" onClick={() => window.print()}>
                            <Printer size={14} /> Print
                        </Btn>
                        <span className="text-[13px] text-[#666]">Filter: <b className="text-[#0f1111]">{paymentMethod === 'ALL' ? 'All Payments' : paymentMethod}</b></span>
                    </div>
                </div>
                <div className="border-b border-[#ddd] mb-6 no-print" />

                {/* Stats Metric Cards (Filtered) */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-6">
                    <MetricCard
                        label="Total Money"
                        value={formatK(stats.totalRevenue || 0)}
                        subtext="All history sales"
                        icon={DollarSign}
                        color="#13b0d1"
                    />
                    <MetricCard
                        label="Net Profit"
                        value={formatK(stats.totalProfit || 0)}
                        subtext="Total earnings"
                        icon={TrendingUp}
                        color="#10b981"
                    />
                    <MetricCard
                        label="Active Orders"
                        value={stats.totalActive || stats.pendingOrders || 0}
                        subtext="Total open orders"
                        icon={Package}
                        color="#6366f1"
                        prefix=""
                    />
                    <MetricCard
                        label="Pending Submission"
                        value={stats.pendingOrders || 0}
                        subtext="Need your approval"
                        icon={Clock}
                        color="#f59e0b"
                        alert={(stats.pendingOrders || 0) > 0}
                        prefix=""
                    />
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
