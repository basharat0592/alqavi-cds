'use client';

import { useState, useEffect, useCallback } from 'react';
import {
    RotateCcw, TrendingUp, Download, Printer, RefreshCw, Info, Loader2, PackageX
} from 'lucide-react';
import PageLoader from '@/components/ui/PageLoader';
import { exportToCSV, formatCurrency } from '@/lib/utils';
import { reportService } from '@/services/report.service';
import { PageHeader, Card, Button, Badge, ui } from '@/components/admin/ui';
import { InvoiceHeader, InvoiceFooter, invoiceStyles } from '@/components/admin/invoice/InvoiceParts';

const BARS = ['bg-rose-500', 'bg-amber-500', 'bg-indigo-600', 'bg-sky-500', 'bg-emerald-500', 'bg-slate-400'];

export default function SaleReturnsReportPage() {
    const [loading, setLoading] = useState(true);
    const [data, setData] = useState<any>({ totals: {}, status_counts: {}, reasons: [] });
    const [dateFrom, setDateFrom] = useState('');
    const [dateTo, setDateTo] = useState('');

    const load = useCallback(async () => {
        setLoading(true);
        try {
            const d = await reportService.returnsSummary({ date_from: dateFrom || undefined, date_to: dateTo || undefined });
            setData(d || { totals: {}, status_counts: {}, reasons: [] });
        } finally { setLoading(false); }
    }, [dateFrom, dateTo]);

    useEffect(() => { load(); }, [load]);

    if (loading && !data.totals?.total_count && (data.reasons || []).length === 0) return <PageLoader />;

    const t = data.totals || {};
    const sc = data.status_counts || {};
    const reasons = data.reasons || [];

    const STATS = [
        { label: 'Total Returns', value: String(t.total_count || 0), icon: RotateCcw },
        { label: 'Accepted Value', value: formatCurrency(t.accepted_value || 0), icon: TrendingUp, color: 'text-rose-600' },
        { label: 'Return Rate', value: `${t.return_rate || 0}%`, icon: RefreshCw },
        { label: 'Delivered Orders', value: String(t.delivered_orders || 0), icon: PackageX },
    ];

    return (
        <div className="pb-10">
            <div className="hidden print:block mb-4">
                <InvoiceHeader docTitle="Sales Returns Report" />
            </div>

            <div className="print:hidden">
                <PageHeader
                    title="Returns Reports"
                    subtitle="Sales vs Returns Performance"
                    breadcrumbs={[
                        { label: 'Console', href: '/admin/dashboard' },
                        { label: 'Reports Center', href: '/admin/reports' },
                        { label: 'Returns Reports' },
                    ]}
                    actions={
                        <div className="flex gap-2 no-print">
                            <Button variant="outline" size="sm" onClick={() => exportToCSV(
                                reasons.map((r: any) => ({ reason: r.reason, count: r.count, value: r.value, pct: r.pct })),
                                'returns-reasons.csv')}>
                                <Download size={14} /> Export
                            </Button>
                            <Button variant="outline" size="sm" onClick={() => window.print()}>
                                <Printer size={14} /> Print
                            </Button>
                        </div>
                    }
                />
            </div>

            {/* Date filter */}
            <Card className="p-4 mb-6 flex flex-wrap items-center gap-3 no-print print:hidden">
                <span className="text-[12px] font-bold text-slate-500 uppercase tracking-wider">Period</span>
                <input type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)} className={ui.inputBase + ' w-auto'} />
                <span className="text-slate-400 text-[12px]">to</span>
                <input type="date" value={dateTo} onChange={e => setDateTo(e.target.value)} className={ui.inputBase + ' w-auto'} />
                {(dateFrom || dateTo) && <Button variant="ghost" size="sm" onClick={() => { setDateFrom(''); setDateTo(''); }}>Clear</Button>}
                {loading && <Loader2 className="w-4 h-4 animate-spin text-indigo-500" />}
            </Card>

            {/* KPIs */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
                {STATS.map((stat, i) => (
                    <Card key={i} className="p-5">
                        <div className="flex items-center gap-2 mb-2">
                            <stat.icon size={14} className="text-slate-400" />
                            <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">{stat.label}</p>
                        </div>
                        <p className={`text-[20px] font-bold text-slate-900 tracking-tight tabular-nums ${stat.color || ''}`}>{stat.value}</p>
                    </Card>
                ))}
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
                {/* Reason Analysis (real) */}
                <Card className="lg:col-span-2 p-6">
                    <h3 className="text-[14px] font-bold text-slate-900 tracking-tight mb-5 pb-2 border-b border-slate-100">Return Reason Breakdown</h3>
                    {reasons.length === 0 ? (
                        <p className="text-[13px] text-slate-400 py-8 text-center">No returns recorded for this period.</p>
                    ) : (
                        <div className="space-y-4">
                            {reasons.slice(0, 8).map((h: any, i: number) => (
                                <div key={i}>
                                    <div className="flex justify-between text-[12px] font-medium text-slate-700 mb-1">
                                        <span className="truncate pr-3">{h.reason}</span>
                                        <span className="tabular-nums shrink-0">{formatCurrency(h.value)} · {h.pct}%</span>
                                    </div>
                                    <div className="w-full h-1.5 bg-slate-100 rounded-full overflow-hidden">
                                        <div className={`h-full ${BARS[i % BARS.length]}`} style={{ width: `${h.pct}%` }} />
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </Card>

                {/* Status breakdown */}
                <Card className="p-6">
                    <h3 className="text-[14px] font-bold text-slate-900 tracking-tight mb-5 pb-2 border-b border-slate-100">By Status</h3>
                    <div className="space-y-3">
                        {[
                            { k: 'PENDING', tone: 'amber' as const },
                            { k: 'ACCEPTED', tone: 'green' as const },
                            { k: 'REJECTED', tone: 'red' as const },
                        ].map(s => (
                            <div key={s.k} className="flex items-center justify-between">
                                <Badge tone={s.tone}>{s.k}</Badge>
                                <span className="text-[16px] font-bold text-slate-900 tabular-nums">{sc[s.k] || 0}</span>
                            </div>
                        ))}
                        <div className="pt-3 mt-3 border-t border-slate-100 flex items-center justify-between">
                            <span className="text-[12px] font-bold text-slate-500 uppercase tracking-wider">Total Value</span>
                            <span className="text-[16px] font-bold text-rose-600 tabular-nums">{formatCurrency(t.total_value || 0)}</span>
                        </div>
                    </div>
                </Card>
            </div>

            <Card className="mt-8 bg-amber-50 border-amber-100 p-4 flex gap-3 no-print print:hidden">
                <Info className="text-amber-600 shrink-0 mt-0.5" size={16} />
                <p className="text-[12px] text-slate-600 leading-relaxed font-medium">Return rate is accepted returns vs delivered orders in this period and scope. Reasons are grouped from the actual return records.</p>
            </Card>

            <div className="hidden print:block">
                <InvoiceFooter pinned={false} />
            </div>
            <style jsx global>{invoiceStyles}</style>
        </div>
    );
}
