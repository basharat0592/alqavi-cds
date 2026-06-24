'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import {
    MapPin, TrendingUp, Download, Printer, Wallet, Loader2, BarChart3, RotateCcw
} from 'lucide-react';
import PageLoader from '@/components/ui/PageLoader';
import { exportToCSV, formatCurrency } from '@/lib/utils';
import { reportService } from '@/services/report.service';
import { PageHeader, Card, Button, ui } from '@/components/admin/ui';
import { InvoiceHeader, InvoiceFooter, invoiceStyles } from '@/components/admin/invoice/InvoiceParts';

export default function AreaReportPage() {
    const [loading, setLoading] = useState(true);
    const [rows, setRows] = useState<any[]>([]);
    const [totals, setTotals] = useState<any>({});
    const [dateFrom, setDateFrom] = useState('');
    const [dateTo, setDateTo] = useState('');
    const [areaFilter, setAreaFilter] = useState('All');

    const load = useCallback(async () => {
        setLoading(true);
        try {
            const d = await reportService.byArea({ date_from: dateFrom || undefined, date_to: dateTo || undefined });
            setRows(d.results || []);
            setTotals(d.totals || {});
        } finally { setLoading(false); }
    }, [dateFrom, dateTo]);

    useEffect(() => { load(); }, [load]);

    const areaOptions = useMemo(() => ['All', ...rows.map(r => r.area)], [rows]);
    const filtered = areaFilter === 'All' ? rows : rows.filter(r => r.area === areaFilter);

    if (loading && rows.length === 0) return <PageLoader />;

    const STATS = [
        { label: 'Revenue', value: formatCurrency(totals.revenue || 0), icon: TrendingUp },
        { label: 'Profit', value: formatCurrency(totals.profit || 0), icon: BarChart3, color: 'text-emerald-600' },
        { label: 'Outstanding', value: formatCurrency(totals.outstanding || 0), icon: Wallet, color: (totals.outstanding || 0) > 0 ? 'text-rose-600' : 'text-slate-900' },
        { label: 'Orders', value: String(totals.orders || 0), icon: MapPin },
    ];
    const maxRevenue = Math.max(1, ...filtered.map(r => r.revenue));

    return (
        <div className="pb-10">
            <div className="hidden print:block mb-4"><InvoiceHeader docTitle="Area-wise Report" /></div>

            <div className="print:hidden">
                <PageHeader
                    title="Area-wise Report"
                    subtitle="Revenue, profit and outstanding grouped by customer area"
                    breadcrumbs={[
                        { label: 'Console', href: '/admin/dashboard' },
                        { label: 'Reports', href: '/admin/reports' },
                        { label: 'Area-wise' },
                    ]}
                    actions={
                        <div className="flex gap-2 no-print">
                            <Button variant="outline" size="sm" onClick={() => exportToCSV(filtered.map((r: any) => ({
                                area: r.area, revenue: r.revenue, profit: r.profit, orders: r.orders,
                                outstanding: r.outstanding, returns_value: r.returns_value, returns_count: r.returns_count,
                            })), 'report-by-area.csv')}>
                                <Download size={14} /> Export
                            </Button>
                            <Button variant="outline" size="sm" onClick={() => window.print()}>
                                <Printer size={14} /> Print
                            </Button>
                        </div>
                    }
                />
            </div>

            {/* Filters */}
            <Card className="p-4 mb-6 flex flex-wrap items-center gap-3 no-print print:hidden">
                <span className="text-[12px] font-bold text-slate-500 uppercase tracking-wider">Period</span>
                <input type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)} className={ui.inputBase + ' w-auto'} />
                <span className="text-slate-400 text-[12px]">to</span>
                <input type="date" value={dateTo} onChange={e => setDateTo(e.target.value)} className={ui.inputBase + ' w-auto'} />
                <select value={areaFilter} onChange={e => setAreaFilter(e.target.value)} className={ui.inputBase + ' w-auto'}>
                    {areaOptions.map(a => <option key={a} value={a}>{a}</option>)}
                </select>
                {(dateFrom || dateTo) && <Button variant="ghost" size="sm" onClick={() => { setDateFrom(''); setDateTo(''); }}>Clear</Button>}
                {loading && <Loader2 className="w-4 h-4 animate-spin text-indigo-500" />}
            </Card>

            {/* KPIs */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
                {STATS.map((s, i) => (
                    <Card key={i} className="p-5">
                        <div className="flex items-center gap-2 mb-2">
                            <s.icon size={14} className="text-slate-400" />
                            <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">{s.label}</p>
                        </div>
                        <p className={`text-[20px] font-bold tracking-tight tabular-nums ${s.color || 'text-slate-900'}`}>{s.value}</p>
                    </Card>
                ))}
            </div>

            {/* Table */}
            <Card className="overflow-x-auto animate-in fade-in duration-700">
                <table className="w-full text-left border-collapse min-w-[820px]">
                    <thead>
                        <tr className="bg-slate-50/60 border-b border-slate-100 text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                            <th className="px-6 py-3">Area</th>
                            <th className="px-6 py-3 text-right">Revenue</th>
                            <th className="px-6 py-3">Share</th>
                            <th className="px-6 py-3 text-right">Profit</th>
                            <th className="px-6 py-3 text-center">Orders</th>
                            <th className="px-6 py-3 text-right">Outstanding</th>
                            <th className="px-6 py-3 text-right">Returns</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                        {filtered.length === 0 ? (
                            <tr><td colSpan={7} className="py-20 text-center text-[13px] text-slate-400">No data for this period.</td></tr>
                        ) : filtered.map((r, i) => (
                            <tr key={i} className="hover:bg-slate-50 transition-colors text-[13px]">
                                <td className="px-6 py-4 font-bold text-slate-900 flex items-center gap-2"><MapPin size={14} className="text-indigo-500" /> {r.area}</td>
                                <td className="px-6 py-4 text-right font-bold text-slate-900 tabular-nums">{formatCurrency(r.revenue)}</td>
                                <td className="px-6 py-4 w-40">
                                    <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
                                        <div className="h-full bg-indigo-500" style={{ width: `${(r.revenue / maxRevenue) * 100}%` }} />
                                    </div>
                                </td>
                                <td className="px-6 py-4 text-right font-bold text-emerald-600 tabular-nums">{formatCurrency(r.profit)}</td>
                                <td className="px-6 py-4 text-center text-slate-500 font-medium tabular-nums">{r.orders}</td>
                                <td className={`px-6 py-4 text-right font-bold tabular-nums ${r.outstanding > 0 ? 'text-rose-600' : 'text-slate-400'}`}>{formatCurrency(r.outstanding)}</td>
                                <td className="px-6 py-4 text-right text-slate-500 tabular-nums">{formatCurrency(r.returns_value)} <span className="text-[10px] text-slate-400">({r.returns_count})</span></td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </Card>

            <div className="hidden print:block"><InvoiceFooter pinned={false} /></div>
            <style jsx global>{invoiceStyles}</style>
        </div>
    );
}
