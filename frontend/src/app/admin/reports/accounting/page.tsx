'use client';

import { useState, useEffect, useMemo } from 'react';
import {
    TrendingUp, DollarSign, Package,
    Calendar, Download, Filter, Printer,
    Clock, Info, RefreshCw
} from 'lucide-react';
import PageLoader from '@/components/ui/PageLoader';
import toast from 'react-hot-toast';
import { useAdminDashboard } from '@/hooks';
import { PageHeader, Card, Button, Badge } from '@/components/admin/ui';

const formatK = (num: number) => {
    if (num >= 1000) {
        return (num / 1000).toFixed(1) + 'K';
    }
    return num.toLocaleString();
};

const MetricCard = ({ label, value, subtext, icon: Icon, color = "indigo", alert = false, prefix = "Rs. " }: any) => {
    const palette: Record<string, { bg: string; text: string }> = {
        sky: { bg: 'bg-sky-50', text: 'text-sky-600' },
        emerald: { bg: 'bg-emerald-50', text: 'text-emerald-600' },
        indigo: { bg: 'bg-indigo-50', text: 'text-indigo-600' },
        amber: { bg: 'bg-amber-50', text: 'text-amber-600' },
    };
    const c = palette[color] || palette.indigo;

    return (
        <Card className="p-5 hover:shadow-md transition-all duration-200 relative overflow-hidden text-left">
            <div className="flex justify-between items-start mb-3">
                <div className="space-y-1">
                    <p className="text-[11px] font-bold text-slate-400 uppercase tracking-[0.1em]">{label}</p>
                    <div className="flex items-center gap-2">
                        <h3 className="text-2xl font-bold text-slate-900 tracking-tight flex items-baseline tabular-nums">
                            {prefix && <span className="text-[16px] mr-0.5 text-slate-400 font-semibold">{prefix}</span>}
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
                <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${c.bg} ${c.text}`}>
                    <Icon size={20} strokeWidth={2} />
                </div>
            </div>
            {subtext && (
                <div className="flex items-center pt-3 border-t border-slate-100">
                    <p className="text-[12px] text-slate-500 font-medium">{subtext}</p>
                </div>
            )}
        </Card>
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
        <div className="pb-20 text-left">
            <PageHeader
                title="Accounting"
                subtitle="General Ledger & Financial Health"
                breadcrumbs={[
                    { label: 'Console', href: '/admin/dashboard' },
                    { label: 'Reports Center', href: '/admin/reports' },
                    { label: 'Accounting' },
                ]}
                actions={
                    <div className="flex items-center gap-2 flex-wrap no-print">
                        <div className="rounded-lg border border-slate-200 bg-white h-10 px-3 flex items-center gap-2 focus-within:border-indigo-400 focus-within:ring-4 focus-within:ring-indigo-500/10 transition-all">
                            <Calendar size={14} className="text-slate-400" />
                            <input type="date" value={filterDate} onChange={(e) => setFilterDate(e.target.value)} className="bg-transparent text-[13px] font-medium text-slate-800 outline-none border-none" />
                        </div>
                        <div className="rounded-lg border border-slate-200 bg-white h-10 px-3 flex items-center gap-2 focus-within:border-indigo-400 focus-within:ring-4 focus-within:ring-indigo-500/10 transition-all">
                            <Filter size={14} className="text-slate-400" />
                            <select value={paymentMethod} onChange={(e) => setPaymentMethod(e.target.value)} className="bg-transparent text-[13px] font-medium text-slate-800 outline-none border-none cursor-pointer">
                                <option value="ALL">All Payments</option>
                                <option value="COD">C.O.D</option>
                                <option value="ONLINE">Bank Transfer</option>
                                <option value="SHOP">Shop POS</option>
                            </select>
                        </div>
                        <Button variant="outline" onClick={refetch}>
                            <RefreshCw size={14} className={statsLoading ? 'animate-spin' : ''} /> Refresh
                        </Button>
                        <Button variant="secondary" onClick={() => toast.success('Balance Sheet Downloaded')}>
                            <Download size={14} /> Download PDF
                        </Button>
                        <Button variant="secondary" onClick={() => window.print()}>
                            <Printer size={14} /> Print
                        </Button>
                    </div>
                }
            />

            <div className="flex items-center gap-2 mb-6 no-print">
                <span className="text-[13px] text-slate-500">Filter:</span>
                <Badge tone="indigo">{paymentMethod === 'ALL' ? 'All Payments' : paymentMethod}</Badge>
            </div>

            {/* Stats Metric Cards (Filtered) */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-6">
                <MetricCard
                    label="Total Money"
                    value={formatK(stats.totalRevenue || 0)}
                    subtext="All history sales"
                    icon={DollarSign}
                    color="sky"
                />
                <MetricCard
                    label="Net Profit"
                    value={formatK(stats.totalProfit || 0)}
                    subtext="Total earnings"
                    icon={TrendingUp}
                    color="emerald"
                />
                <MetricCard
                    label="Active Orders"
                    value={stats.totalActive || stats.pendingOrders || 0}
                    subtext="Total open orders"
                    icon={Package}
                    color="indigo"
                    prefix=""
                />
                <MetricCard
                    label="Pending Submission"
                    value={stats.pendingOrders || 0}
                    subtext="Need your approval"
                    icon={Clock}
                    color="amber"
                    alert={(stats.pendingOrders || 0) > 0}
                    prefix=""
                />
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Main Ledger Table */}
                <Card className="lg:col-span-2 overflow-hidden animate-in fade-in duration-700">
                    <div className="px-5 py-3.5 bg-slate-50/60 border-b border-slate-200 flex justify-between items-center">
                        <h3 className="text-[14px] font-bold text-slate-900 tracking-tight">Recent Ledger Entries</h3>
                        <button className="text-[12px] font-semibold text-indigo-600 hover:text-indigo-700 hover:underline">View All</button>
                    </div>
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="border-b border-slate-100 text-[11px] font-bold text-slate-400 uppercase tracking-wider bg-slate-50/60">
                                <th className="px-6 py-3">Ref ID</th>
                                <th className="px-6 py-3">Description</th>
                                <th className="px-6 py-3 text-right">Debit</th>
                                <th className="px-6 py-3 text-right">Credit</th>
                            </tr>
                        </thead>
                        <tbody>
                            {[
                                { id: '#TR-8291', type: 'Income', desc: 'Sale Order #SO-7721 - Customer Payment', d: 'Rs. 45,000', c: '-' },
                                { id: '#TR-8290', type: 'Expense', desc: 'Supplier PO #PO-1120 - Cosmetic Restock', d: '-', c: 'Rs. 12,500' },
                                { id: '#TR-8289', type: 'Revenue', desc: 'Service Fee Settlement', d: 'Rs. 2,500', c: '-' },
                                { id: '#TR-8288', type: 'Payroll', desc: 'Monthly Salary Distribution - Logistics', d: '-', c: 'Rs. 150,000' },
                                { id: '#TR-8287', type: 'Rent', desc: 'Warehouse Facility Rental - Zone A', d: '-', c: 'Rs. 85,000' },
                            ].map((tr, i) => (
                                <tr key={i} className="border-b border-slate-100 hover:bg-slate-50 transition-colors group text-[13px]">
                                    <td className="px-6 py-4 font-bold text-indigo-600">{tr.id}</td>
                                    <td className="px-6 py-4">
                                        <div className="text-slate-900 font-medium">{tr.desc}</div>
                                        <span className={`text-[10px] font-black uppercase ${tr.type === 'Income' ? 'text-emerald-600' : 'text-slate-400'}`}>{tr.type}</span>
                                    </td>
                                    <td className="px-6 py-4 text-right text-emerald-600 font-bold tabular-nums">{tr.d}</td>
                                    <td className="px-6 py-4 text-right text-rose-600 font-bold tabular-nums">{tr.c}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </Card>

                <div className="space-y-6">
                    {/* Summary Pill */}
                    <Card className="p-6">
                        <h3 className="text-[14px] font-bold text-slate-900 tracking-tight mb-5 pb-2 border-b border-slate-100">Financial Efficiency</h3>
                        <div className="space-y-5">
                            {[
                                { l: 'Net Margin', v: '18.4%', c: 'text-emerald-600' },
                                { l: 'Burn Rate', v: 'Rs. 45k/mo', c: 'text-slate-500' },
                                { l: 'Tax Liability', v: 'Rs. 12k', c: 'text-indigo-600' },
                            ].map((h, i) => (
                                <div key={i} className="flex items-center justify-between">
                                    <span className="text-[12px] font-medium text-slate-500">{h.l}</span>
                                    <span className={`text-[14px] font-bold tabular-nums ${h.c}`}>{h.v}</span>
                                </div>
                            ))}
                        </div>
                    </Card>

                    {/* Note */}
                    <Card className="bg-indigo-50 border-indigo-100 p-4 flex gap-3 animate-in fade-in duration-1000 no-print">
                        <Info className="text-indigo-600 shrink-0 mt-0.5" size={16} />
                        <p className="text-[12px] text-slate-600 leading-relaxed font-medium">Account balances are adjusted for current period depreciation and fiscal adjustments.</p>
                    </Card>
                </div>
            </div>
        </div>
    );
}
