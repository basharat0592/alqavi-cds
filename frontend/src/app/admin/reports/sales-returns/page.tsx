'use client';

import { useState, useEffect } from 'react';
import {
    RotateCcw, TrendingUp, Download,
    Printer, ShoppingCart,
    RefreshCw, Info
} from 'lucide-react';
import PageLoader from '@/components/ui/PageLoader';
import toast from 'react-hot-toast';
import { exportToCSV } from '@/lib/utils';
import { PageHeader, Card, Button, Badge, useTableSelection, SelectAllTh, RowCheckboxTd, BulkBar } from '@/components/admin/ui';
import { InvoiceHeader, InvoiceFooter, invoiceStyles } from '@/components/admin/invoice/InvoiceParts';

const RETURNS = [
    { id: 'RET-2291', o: 'SO-8172', name: 'Al-Noor Cosmetics', s: 'Reconciled', date: '2026-04-02', v: 'Rs. 12,500' },
    { id: 'RET-2290', o: 'SO-8152', name: 'The Glow Mart', s: 'Pending', date: '2026-04-01', v: 'Rs. 4,200' },
    { id: 'RET-2289', o: 'SO-8022', name: 'Walk-in Retail', s: 'Reconciled', date: '2026-03-31', v: 'Rs. 1,500' },
];

export default function SaleReturnsReportPage() {
    const [loading, setLoading] = useState(true);

    const sel = useTableSelection(RETURNS, (r) => r.id);

    useEffect(() => {
        setTimeout(() => setLoading(false), 800);
    }, []);

    if (loading) return <PageLoader />;

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
                            <Button variant="outline" size="sm" onClick={() => toast.success('Manifest Exported')}>
                                <Download size={14} /> Export Manifest
                            </Button>
                            <Button variant="outline" size="sm" onClick={() => window.print()}>
                                <Printer size={14} /> Print
                            </Button>
                        </div>
                    }
                />
            </div>

            {/* Tactical Sensors */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
                {[
                    { label: 'Gross Sales', value: 'Rs. 5.1M', icon: ShoppingCart, trend: '+12.4%' },
                    { label: 'Net Returns', value: 'Rs. 420,500', icon: RotateCcw, trend: '-2.1%' },
                    { label: 'Return Frequency', value: '4.2%', icon: RefreshCw, trend: '+0.5%' },
                    { label: 'Realized Revenue', value: 'Rs. 4.68M', icon: TrendingUp, trend: '+14.1%' },
                ].map((stat, i) => (
                    <Card key={i} className="p-5">
                        <div className="flex items-center justify-between mb-2">
                            <div className="flex items-center gap-2">
                                <stat.icon size={14} className="text-slate-400" />
                                <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">{stat.label}</p>
                            </div>
                            <span className={`text-[10px] font-black ${stat.trend.startsWith('+') ? 'text-emerald-600' : 'text-rose-600'}`}>{stat.trend}</span>
                        </div>
                        <p className="text-[20px] font-bold text-slate-900 tracking-tight tabular-nums">{stat.value}</p>
                    </Card>
                ))}
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
                {/* Recent Returns Table */}
                <Card className="lg:col-span-2 overflow-hidden">
                    <div className="px-5 py-3 bg-slate-50/60 border-b border-slate-100">
                        <h3 className="text-[14px] font-bold text-slate-900 tracking-tight">Recent Returns Registry</h3>
                    </div>
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="border-b border-slate-100 text-[11px] font-bold text-slate-400 uppercase tracking-wider bg-slate-50/60">
                                <SelectAllTh sel={sel} />
                                <th className="px-6 py-3">Return ID</th>
                                <th className="px-6 py-3">Orig. Order</th>
                                <th className="px-6 py-3">Customer Identity</th>
                                <th className="px-6 py-3 text-right">Value</th>
                            </tr>
                        </thead>
                        <tbody>
                            {RETURNS.map((ret, i) => (
                                <tr key={i} className="border-b border-slate-100 hover:bg-slate-50 transition-colors group text-[13px]">
                                    <RowCheckboxTd sel={sel} id={ret.id} />
                                    <td className="px-6 py-4 font-bold text-indigo-600 group-hover:text-indigo-700 group-hover:underline cursor-pointer">{ret.id}</td>
                                    <td className="px-6 py-4 text-slate-600 font-medium">{ret.o}</td>
                                    <td className="px-6 py-4">
                                        <div className="text-slate-900 font-bold uppercase mb-1">{ret.name}</div>
                                        <Badge tone={ret.s === 'Reconciled' ? 'green' : 'amber'}>{ret.s}</Badge>
                                    </td>
                                    <td className="px-6 py-4 text-right text-rose-600 font-bold tabular-nums">{ret.v}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </Card>

                <div className="print:hidden">
                    <BulkBar
                        sel={sel}
                        entity="returns"
                        onExport={() => exportToCSV(
                            sel.selectedItems.map((ret: any) => ({
                                return_id: ret.id,
                                original_order: ret.o,
                                customer: ret.name,
                                status: ret.s,
                                date: ret.date,
                                value: ret.v,
                            })),
                            'sales-returns.csv',
                        )}
                    />
                </div>

                {/* Reason Analysis */}
                <Card className="p-6">
                    <h3 className="text-[14px] font-bold text-slate-900 tracking-tight mb-5 pb-2 border-b border-slate-100">Return Reason Matrix</h3>
                    <div className="space-y-4">
                        {[
                            { l: 'Quality Issue', v: '45%', p: 45, c: 'bg-rose-500' },
                            { l: 'Freight Damage', v: '28%', p: 28, c: 'bg-amber-500' },
                            { l: 'Wrong Product', v: '15%', p: 15, c: 'bg-indigo-600' },
                            { l: 'Others', v: '12%', p: 12, c: 'bg-slate-400' },
                        ].map((h, i) => (
                            <div key={i}>
                                <div className="flex justify-between text-[12px] font-medium text-slate-700 mb-1">
                                    <span>{h.l}</span>
                                    <span className="tabular-nums">{h.v}</span>
                                </div>
                                <div className="w-full h-1.5 bg-slate-100 rounded-full overflow-hidden">
                                    <div className={`h-full ${h.c}`} style={{ width: `${h.p}%` }} />
                                </div>
                            </div>
                        ))}
                    </div>
                </Card>
            </div>

            {/* Footnote */}
            <Card className="mt-8 bg-amber-50 border-amber-100 p-4 flex gap-3 no-print print:hidden">
                <Info className="text-amber-600 shrink-0 mt-0.5" size={16} />
                <p className="text-[12px] text-slate-600 leading-relaxed font-medium">Realized revenue accounts for all returns processed. 'Quality Issues' above 20% should be escalated to the Procurement and QC department immediately.</p>
            </Card>

            <div className="hidden print:block">
                <InvoiceFooter pinned={false} />
            </div>
            <style jsx global>{invoiceStyles}</style>
        </div>
    );
}
