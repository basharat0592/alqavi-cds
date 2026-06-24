'use client';

import { useState, useEffect, useCallback } from 'react';
import {
    FileText, TrendingUp, Search, Download,
    Printer, Users, ShoppingBag, Info, Wallet, Loader2
} from 'lucide-react';
import PageLoader from '@/components/ui/PageLoader';
import { formatCurrency, exportToCSV } from '@/lib/utils';
import { reportService } from '@/services/report.service';
import { PageHeader, Card, Button, ui, useTableSelection, SelectAllTh, RowCheckboxTd, BulkBar } from '@/components/admin/ui';
import { InvoiceHeader, InvoiceFooter, invoiceStyles } from '@/components/admin/invoice/InvoiceParts';

export default function SalesStatementsPage() {
    const [loading, setLoading] = useState(true);
    const [rows, setRows] = useState<any[]>([]);
    const [totals, setTotals] = useState<any>({ total_billed: 0, total_paid: 0, remaining: 0, customers: 0 });
    const [searchTerm, setSearchTerm] = useState('');
    const [dateFrom, setDateFrom] = useState('');
    const [dateTo, setDateTo] = useState('');

    const load = useCallback(async () => {
        setLoading(true);
        try {
            const data = await reportService.statements({ date_from: dateFrom || undefined, date_to: dateTo || undefined });
            setRows(data.results || []);
            setTotals(data.totals || {});
        } finally {
            setLoading(false);
        }
    }, [dateFrom, dateTo]);

    useEffect(() => { load(); }, [load]);

    const filtered = rows.filter(r =>
        (r.name || '').toLowerCase().includes(searchTerm.toLowerCase()));

    const sel = useTableSelection(filtered, (s) => s.name);

    if (loading && rows.length === 0) return <PageLoader />;

    const avgOrderValue = totals.total_billed && rows.reduce((s, r) => s + r.orders, 0)
        ? totals.total_billed / rows.reduce((s, r) => s + r.orders, 0) : 0;
    const matchPct = totals.total_billed ? (totals.total_paid / totals.total_billed) * 100 : 0;

    const STATS = [
        { label: 'Total Billed', value: formatCurrency(totals.total_billed || 0), icon: TrendingUp },
        { label: 'Total Collected', value: formatCurrency(totals.total_paid || 0), icon: Wallet, color: 'text-emerald-600' },
        { label: 'Outstanding', value: formatCurrency(totals.remaining || 0), icon: FileText, color: (totals.remaining || 0) > 0 ? 'text-rose-600' : 'text-slate-900' },
        { label: 'Collection Rate', value: `${matchPct.toFixed(1)}%`, icon: ShoppingBag },
    ];

    return (
        <div>
            <div className="hidden print:block mb-4">
                <InvoiceHeader docTitle="Customer Statements" />
            </div>

            <div className="print:hidden">
                <PageHeader
                    title="Customer Statements"
                    breadcrumbs={[
                        { label: 'Console', href: '/admin/dashboard' },
                        { label: 'Reports', href: '/admin/reports' },
                        { label: 'Customer Statements' },
                    ]}
                    actions={
                        <>
                            <Button variant="outline" size="sm" onClick={() => exportToCSV(
                                filtered.map((r: any) => ({
                                    customer: r.name, orders: r.orders,
                                    total_billed: r.total_billed, total_paid: r.total_paid,
                                    remaining: r.remaining, last_payment: r.last_payment || '',
                                })), 'customer-statements.csv')}>
                                <Download size={14} /> Export
                            </Button>
                            <Button variant="outline" size="sm" onClick={() => window.print()}>
                                <Printer size={14} /> Print
                            </Button>
                        </>
                    }
                />
            </div>

            {/* Summary Stats */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
                {STATS.map((stat, i) => (
                    <Card key={i} className="p-5">
                        <div className="flex items-center gap-3 mb-2">
                            <stat.icon size={16} className="text-slate-400" />
                            <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">{stat.label}</p>
                        </div>
                        <p className={`text-[20px] font-bold text-slate-900 tracking-tight tabular-nums ${stat.color || ''}`}>{stat.value}</p>
                    </Card>
                ))}
            </div>

            {/* Control Matrix */}
            <Card className="p-5 mb-6 flex flex-wrap items-center gap-4 no-print print:hidden animate-in fade-in slide-in-from-top-2 duration-500">
                <div className="relative flex-1 min-w-[260px]">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                    <input
                        value={searchTerm}
                        onChange={e => setSearchTerm(e.target.value)}
                        placeholder="Search by customer..."
                        className={ui.inputBase + " pl-10"}
                    />
                </div>
                <div className="flex items-center gap-2">
                    <input type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)} className={ui.inputBase + ' w-auto'} />
                    <span className="text-slate-400 text-[12px]">to</span>
                    <input type="date" value={dateTo} onChange={e => setDateTo(e.target.value)} className={ui.inputBase + ' w-auto'} />
                    {(dateFrom || dateTo) && (
                        <Button variant="ghost" size="sm" onClick={() => { setDateFrom(''); setDateTo(''); }}>Clear</Button>
                    )}
                    {loading && <Loader2 className="w-4 h-4 animate-spin text-indigo-500" />}
                </div>
            </Card>

            {/* Main Ledger Table */}
            <Card className="overflow-x-auto animate-in fade-in duration-700">
                <table className="w-full text-left border-collapse min-w-[760px]">
                    <thead>
                        <tr className="bg-slate-50/60 border-b border-slate-100 text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                            <SelectAllTh sel={sel} />
                            <th className="px-3 sm:px-6 py-2.5 sm:py-3">Customer</th>
                            <th className="px-3 sm:px-6 py-2.5 sm:py-3 text-center">Orders</th>
                            <th className="px-3 sm:px-6 py-2.5 sm:py-3 text-right">Total Billed</th>
                            <th className="px-3 sm:px-6 py-2.5 sm:py-3 text-right">Total Paid</th>
                            <th className="px-3 sm:px-6 py-2.5 sm:py-3 text-right">Remaining</th>
                            <th className="px-3 sm:px-6 py-2.5 sm:py-3">Last Payment</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                        {filtered.length === 0 ? (
                            <tr><td colSpan={7} className="py-20 text-center text-[13px] text-slate-400">No statements for this period.</td></tr>
                        ) : filtered.map((st, i) => (
                            <tr key={i} className="hover:bg-slate-50 transition-colors group text-[13px]">
                                <RowCheckboxTd sel={sel} id={st.name} />
                                <td className="px-3 sm:px-6 py-3 sm:py-4">
                                    <div className="text-slate-900 font-bold flex items-center gap-2">
                                        <Users size={14} className="text-slate-400" /> {st.name}
                                    </div>
                                </td>
                                <td className="px-3 sm:px-6 py-3 sm:py-4 text-center text-slate-500 font-medium tabular-nums">{st.orders}</td>
                                <td className="px-3 sm:px-6 py-3 sm:py-4 text-right text-slate-900 font-bold tabular-nums">{formatCurrency(st.total_billed)}</td>
                                <td className="px-3 sm:px-6 py-3 sm:py-4 text-right text-emerald-600 font-bold tabular-nums">{formatCurrency(st.total_paid)}</td>
                                <td className={`px-3 sm:px-6 py-3 sm:py-4 text-right font-black tabular-nums ${st.remaining > 0 ? 'text-rose-600' : 'text-slate-400'}`}>{formatCurrency(st.remaining)}</td>
                                <td className="px-3 sm:px-6 py-3 sm:py-4 text-slate-500 text-[12px] tabular-nums">{st.last_payment || '—'}</td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </Card>

            <div className="print:hidden">
                <BulkBar
                    sel={sel}
                    entity="statements"
                    onExport={() => exportToCSV(
                        sel.selectedItems.map((st: any) => ({
                            customer: st.name, orders: st.orders,
                            total_billed: st.total_billed, total_paid: st.total_paid,
                            remaining: st.remaining, last_payment: st.last_payment || '',
                        })),
                        'customer-statements.csv',
                    )}
                />
            </div>

            <div className="mt-8 bg-indigo-50 border border-indigo-100 rounded-2xl p-4 flex gap-4 items-start animate-in fade-in duration-1000 no-print print:hidden">
                <Info className="text-indigo-600 shrink-0 mt-0.5" size={18} />
                <div>
                    <p className="text-[13px] font-bold text-slate-900">Live balances</p>
                    <p className="text-[12px] text-slate-600 leading-relaxed">Billed and paid totals are computed live from real orders and recorded payments. Open a customer for their full ledger and aging.</p>
                </div>
            </div>

            <div className="hidden print:block">
                <InvoiceFooter pinned={false} />
            </div>
            <style jsx global>{invoiceStyles}</style>
        </div>
    );
}
