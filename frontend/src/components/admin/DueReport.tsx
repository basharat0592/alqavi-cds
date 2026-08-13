'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import {
    Download, Printer, Loader2, AlertTriangle, CalendarClock, Wallet, ArrowRight
} from 'lucide-react';
import Link from 'next/link';
import { exportToCSV, formatCurrency } from '@/lib/utils';
import { paymentsDueService } from '@/services/payment.service';
import { PageHeader, Card, Button, Badge, ui } from '@/components/admin/ui';
import { InvoiceHeader, InvoiceFooter, invoiceStyles } from '@/components/admin/invoice/InvoiceParts';

// Receivables = money owed TO us; Payables = money WE owe.
const KINDS = {
    receivable: {
        title: 'Receivables',
        subtitle: 'Money owed to us — outstanding customer balances and supplier refunds due',
        types: ['sale', 'purchase_return'],
        partyLabel: 'Customer / Supplier',
        link: (t: string) => (t === 'sale' ? '/admin/sales' : '/admin/purchases/returns'),
    },
    payable: {
        title: 'Payables',
        subtitle: 'Money we owe — supplier balances and customer refunds due',
        types: ['purchase', 'sale_return'],
        partyLabel: 'Supplier / Customer',
        link: (t: string) => (t === 'purchase' ? '/admin/purchases' : '/admin/sale-returns'),
    },
} as const;

const agingBucket = (row: any) => {
    if (!row.is_overdue) return row.bucket === 'due_soon' ? 'due_soon' : 'current';
    const d = row.days_overdue || 0;
    if (d <= 30) return 'd1_30';
    if (d <= 60) return 'd31_60';
    if (d <= 90) return 'd61_90';
    return 'd90_plus';
};

export default function DueReport({ kind }: { kind: 'receivable' | 'payable' }) {
    const cfg = KINDS[kind];
    const [loading, setLoading] = useState(true);
    const [rows, setRows] = useState<any[]>([]);

    const load = useCallback(async () => {
        setLoading(true);
        try {
            const d = await paymentsDueService.get('all');
            const all = Array.isArray(d?.results) ? d.results : [];
            setRows(all.filter((r: any) => (cfg.types as readonly string[]).includes(r.type)));
        } finally { setLoading(false); }
    }, [kind]);

    useEffect(() => { load(); }, [load]);

    const totals = useMemo(() => {
        const t = { total: 0, overdue: 0, overdueAmt: 0, dueSoon: 0,
            aging: { current: 0, due_soon: 0, d1_30: 0, d31_60: 0, d61_90: 0, d90_plus: 0 } as Record<string, number> };
        for (const r of rows) {
            t.total += r.remaining;
            if (r.is_overdue) { t.overdue += 1; t.overdueAmt += r.remaining; }
            if (r.bucket === 'due_soon') t.dueSoon += 1;
            t.aging[agingBucket(r)] += r.remaining;
        }
        return t;
    }, [rows]);

    if (loading && rows.length === 0) return (
        <div className="py-32 flex items-center justify-center text-slate-400"><Loader2 className="w-6 h-6 animate-spin" /></div>
    );

    const sorted = [...rows].sort((a, b) => (b.days_overdue || 0) - (a.days_overdue || 0) || b.remaining - a.remaining);

    const STATS = [
        { label: `Total ${cfg.title}`, value: formatCurrency(totals.total), color: 'text-slate-900' },
        { label: 'Overdue', value: `${totals.overdue} · ${formatCurrency(totals.overdueAmt)}`, color: totals.overdue ? 'text-rose-600' : 'text-slate-900' },
        { label: 'Due Soon', value: String(totals.dueSoon), color: 'text-amber-600' },
        { label: 'Records', value: String(rows.length), color: 'text-slate-900' },
    ];

    const AGING = [
        { k: 'current', label: 'Current' },
        { k: 'due_soon', label: 'Due Soon' },
        { k: 'd1_30', label: '1–30 Days' },
        { k: 'd31_60', label: '31–60 Days' },
        { k: 'd61_90', label: '61–90 Days' },
        { k: 'd90_plus', label: '90+ Days' },
    ];

    return (
        <div className="pb-10">
            <div className="hidden print:block mb-4"><InvoiceHeader docTitle={`${cfg.title} Report`} /></div>

            <div className="print:hidden">
                <PageHeader
                    title={`${cfg.title} Report`}
                    subtitle={cfg.subtitle}
                    breadcrumbs={[
                        { label: 'Console', href: '/admin/dashboard' },
                        { label: 'Reports', href: '/admin/reports' },
                        { label: cfg.title },
                    ]}
                    actions={
                        <div className="flex gap-2 no-print">
                            <Button variant="outline" size="sm" onClick={() => exportToCSV(sorted.map((r: any) => ({
                                type: r.type, ref: r.ref, party: r.party, total: r.total, paid: r.paid,
                                remaining: r.remaining, due_date: r.due_date || '', days_overdue: r.days_overdue,
                            })), `${kind}s.csv`)}>
                                <Download size={14} /> Export
                            </Button>
                            <Button variant="outline" size="sm" onClick={() => window.print()}>
                                <Printer size={14} /> Print
                            </Button>
                        </div>
                    }
                />
            </div>

            {/* KPIs */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
                {STATS.map((s, i) => (
                    <Card key={i} className="p-5">
                        <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-2">{s.label}</p>
                        <p className={`text-[20px] font-bold tracking-tight tabular-nums ${s.color}`}>{s.value}</p>
                    </Card>
                ))}
            </div>

            {/* Aging */}
            <Card className="p-5 mb-6">
                <h3 className="text-[13px] font-bold text-slate-900 mb-4 flex items-center gap-2"><CalendarClock size={15} className="text-[#B4780B]" /> Aging</h3>
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
                    {AGING.map(a => (
                        <div key={a.k} className={`rounded-xl border p-3 ${a.k.startsWith('d9') || a.k.startsWith('d6') ? 'border-rose-100 bg-rose-50/50' : a.k.startsWith('d') ? 'border-amber-100 bg-amber-50/40' : 'border-slate-200 bg-slate-50/50'}`}>
                            <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">{a.label}</p>
                            <p className="text-[15px] font-bold text-slate-900 tabular-nums mt-0.5">{formatCurrency(totals.aging[a.k] || 0)}</p>
                        </div>
                    ))}
                </div>
            </Card>

            {/* Table */}
            <Card className="overflow-x-auto animate-in fade-in duration-700">
                <table className="w-full text-left border-collapse min-w-[820px]">
                    <thead>
                        <tr className="bg-slate-50/60 border-b border-slate-100 text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                            <th className="px-6 py-3">Reference</th>
                            <th className="px-6 py-3">{cfg.partyLabel}</th>
                            <th className="px-6 py-3 text-right">Total</th>
                            <th className="px-6 py-3 text-right">Paid</th>
                            <th className="px-6 py-3 text-right">Remaining</th>
                            <th className="px-6 py-3">Due</th>
                            <th className="px-6 py-3 text-right no-print">Open</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                        {sorted.length === 0 ? (
                            <tr><td colSpan={7} className="py-20 text-center text-[13px] text-slate-400">Nothing outstanding. All settled.</td></tr>
                        ) : sorted.map((r, i) => (
                            <tr key={i} className="hover:bg-slate-50 transition-colors text-[13px] group">
                                <td className="px-6 py-4">
                                    <div className="font-bold text-slate-900">#{r.ref}</div>
                                    <div className="text-[10px] text-slate-400 uppercase tracking-wider font-bold">{r.type.replace('_', ' ')}</div>
                                </td>
                                <td className="px-6 py-4 font-medium text-slate-700">{r.party}</td>
                                <td className="px-6 py-4 text-right text-slate-500 tabular-nums">{formatCurrency(r.total)}</td>
                                <td className="px-6 py-4 text-right text-emerald-600 tabular-nums">{formatCurrency(r.paid)}</td>
                                <td className="px-6 py-4 text-right font-bold text-slate-900 tabular-nums">{formatCurrency(r.remaining)}</td>
                                <td className="px-6 py-4">
                                    {r.is_overdue ? (
                                        <Badge tone="red"><AlertTriangle size={11} /> {r.days_overdue}d overdue</Badge>
                                    ) : r.bucket === 'due_soon' ? (
                                        <Badge tone="amber">Due {r.due_date}</Badge>
                                    ) : r.due_date ? (
                                        <span className="text-[12px] text-slate-500 tabular-nums">{r.due_date}</span>
                                    ) : <span className="text-[12px] text-slate-300">—</span>}
                                </td>
                                <td className="px-6 py-4 text-right no-print">
                                    <Link href={cfg.link(r.type)} className="inline-flex items-center gap-1 text-[12px] font-bold text-[#B4780B] hover:underline">
                                        Open <ArrowRight size={12} />
                                    </Link>
                                </td>
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
