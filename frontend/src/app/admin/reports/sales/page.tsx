'use client';

import { useState, useEffect } from 'react';
import {
    FileText, TrendingUp, Search, Calendar, Download, Filter,
    Printer, CheckCircle, Users, ShoppingBag, Info
} from 'lucide-react';
import PageLoader from '@/components/ui/PageLoader';
import { formatCurrency } from '@/lib/utils';
import toast from 'react-hot-toast';
import { PageHeader, Card, Button, ui } from '@/components/admin/ui';

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
        <div>
            <PageHeader
                title="Sales Reports"
                breadcrumbs={[
                    { label: 'Console', href: '/admin/dashboard' },
                    { label: 'Reports', href: '/admin/reports' },
                    { label: 'Sales Statements' },
                ]}
                actions={
                    <>
                        <Button variant="outline" size="sm" onClick={() => toast.success('Manifest Exported')}>
                            <Download size={14} /> Export All
                        </Button>
                        <Button variant="outline" size="sm" onClick={() => window.print()}>
                            <Printer size={14} /> Print
                        </Button>
                    </>
                }
            />

            {/* Summary Stats */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
                {[
                    { label: 'Total Sales', value: 'Rs. 4.2M', icon: TrendingUp },
                    { label: 'Statements Created', value: '142 Statements', icon: FileText },
                    { label: 'Average Order Value', value: 'Rs. 28,400', icon: ShoppingBag },
                    { label: 'Payment Match', value: '100.0%', icon: CheckCircle, color: 'text-emerald-600' },
                ].map((stat, i) => (
                    <Card key={i} className="p-5">
                        <div className="flex items-center gap-3 mb-2">
                            <stat.icon size={16} className="text-slate-400" />
                            <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">{stat.label}</p>
                        </div>
                        <p className={`text-[20px] font-bold text-slate-900 tracking-tight ${stat.color || ''}`}>{stat.value}</p>
                    </Card>
                ))}
            </div>

            {/* Control Matrix */}
            <Card className="p-5 mb-6 flex flex-wrap items-center gap-5 no-print animate-in fade-in slide-in-from-top-2 duration-500">
                <div className="relative flex-1 min-w-[300px]">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                    <input
                        value={searchTerm}
                        onChange={e => setSearchTerm(e.target.value)}
                        placeholder="Search by statement number or customer..."
                        className={ui.inputBase + " pl-10"}
                    />
                </div>
                <div className="flex items-center gap-2">
                    <Button variant="outline" size="md"><Filter size={14} /> Filter</Button>
                </div>
            </Card>

            {/* Main Ledger Table */}
            <Card className="overflow-x-auto animate-in fade-in duration-700">
                <table className="w-full text-left border-collapse min-w-[800px]">
                    <thead>
                        <tr className="bg-slate-50/60 border-b border-slate-100 text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                            <th className="px-3 sm:px-6 py-2.5 sm:py-3">Statement Number</th>
                            <th className="px-3 sm:px-6 py-2.5 sm:py-3">Date</th>
                            <th className="px-3 sm:px-6 py-2.5 sm:py-3">Customer</th>
                            <th className="px-3 sm:px-6 py-2.5 sm:py-3 text-right">Total Sales</th>
                            <th className="px-3 sm:px-6 py-2.5 sm:py-3 text-right">Total Paid</th>
                            <th className="px-3 sm:px-6 py-2.5 sm:py-3 text-right">Remaining Balance</th>
                            <th className="px-3 sm:px-6 py-2.5 sm:py-3 text-center">Action</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                        {mockData.map((st, i) => (
                            <tr key={i} className="hover:bg-slate-50 transition-colors group text-[13px]">
                                <td className="px-3 sm:px-6 py-3 sm:py-4">
                                    <div className="text-[14px] font-bold text-indigo-600 group-hover:underline cursor-pointer">
                                        {st.id}
                                    </div>
                                </td>
                                <td className="px-3 sm:px-6 py-3 sm:py-4">
                                    <div className="text-slate-600 font-medium flex items-center gap-1.5">
                                        <Calendar size={12} className="text-slate-400" /> {st.date}
                                    </div>
                                </td>
                                <td className="px-3 sm:px-6 py-3 sm:py-4">
                                    <div className="text-slate-900 font-bold flex items-center gap-2">
                                        <Users size={14} className="text-slate-400" /> {st.name}
                                    </div>
                                    <div className="text-[11px] text-slate-500 mt-1 font-medium italic">{st.count} Orders</div>
                                </td>
                                <td className="px-3 sm:px-6 py-3 sm:py-4 text-right text-rose-600 font-bold tabular-nums">{formatCurrency(st.d)}</td>
                                <td className="px-3 sm:px-6 py-3 sm:py-4 text-right text-emerald-600 font-bold tabular-nums">{formatCurrency(st.c)}</td>
                                <td className="px-3 sm:px-6 py-3 sm:py-4 text-right font-black text-slate-900 tabular-nums">{formatCurrency(st.b)}</td>
                                <td className="px-3 sm:px-6 py-3 sm:py-4 text-center">
                                    <button className="p-1.5 border border-slate-200 rounded-lg bg-white hover:bg-slate-50 text-slate-500 shadow-sm transition-colors">
                                        <Download size={14} />
                                    </button>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </Card>

            {/* Summary Note */}
            <div className="mt-8 bg-indigo-50 border border-indigo-100 rounded-2xl p-4 flex gap-4 items-start animate-in fade-in duration-1000 no-print">
                <Info className="text-indigo-600 shrink-0 mt-0.5" size={18} />
                <div>
                    <p className="text-[13px] font-bold text-slate-900">Note on Balances</p>
                    <p className="text-[12px] text-slate-600 leading-relaxed">Balances are updated daily. For live payments, check the customer ledger page.</p>
                </div>
            </div>
        </div>
    );
}
