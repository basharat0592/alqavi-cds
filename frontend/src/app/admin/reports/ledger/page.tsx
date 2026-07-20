'use client';

import { useState, useEffect } from 'react';
import { Search, Printer, FileSpreadsheet, Loader2, BookUser } from 'lucide-react';
import api from '@/lib/axios';
import { companyService } from '@/services/company.service';
import { exportToExcel, formatCurrency, formatDate } from '@/lib/utils';
import { PageHeader, Card, Button, ui } from '@/components/admin/ui';
import { InvoiceHeader, InvoiceFooter, invoiceStyles } from '@/components/admin/invoice/InvoiceParts';
import toast from 'react-hot-toast';

// Customer Ledger — per-party running-balance statement (desktop "Ledger" report),
// computed live from the web app's own orders (Debit) and payments (Credit).
export default function CustomerLedgerReport() {
    const [customers, setCustomers] = useState<any[]>([]);
    const [customerId, setCustomerId] = useState('');
    const [dateFrom, setDateFrom] = useState('');
    const [dateTo, setDateTo] = useState('');
    const [loading, setLoading] = useState(false);
    const [data, setData] = useState<any>(null);

    useEffect(() => {
        companyService.getCustomers()
            .then((list) => setCustomers(Array.isArray(list) ? list : []))
            .catch(() => setCustomers([]));
    }, []);

    const run = async () => {
        if (!customerId) { toast.error('Select a customer'); return; }
        setLoading(true);
        try {
            const params: any = { customer_id: customerId };
            if (dateFrom) params.date_from = dateFrom;
            if (dateTo) params.date_to = dateTo;
            const { data } = await api.get('v1/sales/reports/ledger/', { params });
            setData(data);
        } catch {
            toast.error('Failed to load ledger');
        } finally {
            setLoading(false);
        }
    };

    const exportXlsx = () => {
        if (!data?.rows?.length) return;
        const rows = [
            { Date: '', Reference: 'OPENING BALANCE', Detail: '', Debit: '', Credit: '', Balance: data.opening },
            ...data.rows.map((r: any) => ({
                Date: formatDate(r.date), Reference: r.ref, Detail: r.detail,
                Debit: r.debit || '', Credit: r.credit || '', Balance: r.balance,
            })),
            { Date: '', Reference: 'CLOSING BALANCE', Detail: '', Debit: data.totals.debit, Credit: data.totals.credit, Balance: data.closing },
        ];
        exportToExcel(rows, `Ledger_${(data.customer || 'customer').replace(/\s+/g, '_')}`, 'Ledger');
    };

    return (
        <div className="pb-20 text-left">
            <div className="print:hidden">
                <PageHeader
                    title="Customer Ledger"
                    subtitle="Per-party running-balance statement"
                    breadcrumbs={[{ label: 'Console', href: '/admin/dashboard' }, { label: 'Reports', href: '/admin/reports' }, { label: 'Customer Ledger' }]}
                />

                {/* Filters */}
                <Card className="p-4 mb-6">
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 items-end">
                        <div className="lg:col-span-2">
                            <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1">Customer</label>
                            <select value={customerId} onChange={(e) => setCustomerId(e.target.value)} className={ui.inputBase + ' cursor-pointer'}>
                                <option value="">Select a customer…</option>
                                {customers.map((c) => (
                                    <option key={c.id} value={c.id}>{c.name}{c.area_name ? ` — ${c.area_name}` : ''}</option>
                                ))}
                            </select>
                        </div>
                        <div>
                            <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1">From</label>
                            <input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} className={ui.inputBase + ' cursor-pointer'} />
                        </div>
                        <div>
                            <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1">To</label>
                            <input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} className={ui.inputBase + ' cursor-pointer'} />
                        </div>
                    </div>
                    <div className="flex flex-wrap gap-2 mt-3">
                        <Button variant="primary" onClick={run} disabled={loading}>
                            {loading ? <Loader2 size={14} className="animate-spin" /> : <Search size={14} />} Generate
                        </Button>
                        {data?.rows?.length > 0 && (
                            <>
                                <Button variant="outline" onClick={() => window.print()}><Printer size={14} /> Print</Button>
                                <Button variant="outline" onClick={exportXlsx}><FileSpreadsheet size={14} /> Excel</Button>
                            </>
                        )}
                    </div>
                </Card>
            </div>

            {/* Ledger */}
            {loading ? (
                <div className="py-24 text-center text-slate-400"><Loader2 className="w-6 h-6 animate-spin mx-auto" /></div>
            ) : !data ? (
                <Card className="py-16 text-center print:hidden">
                    <BookUser className="w-10 h-10 text-slate-200 mx-auto mb-3" />
                    <p className="text-[13px] text-slate-500">Select a customer and click <b>Generate</b> to view the ledger.</p>
                </Card>
            ) : data.rows.length === 0 ? (
                <Card className="py-16 text-center print:hidden"><p className="text-[13px] text-slate-500">No transactions for this customer in the selected range.</p></Card>
            ) : (
                <div className="max-w-[900px] mx-auto bg-white p-4 sm:p-6 rounded-lg print:p-0 print:shadow-none">
                    <InvoiceHeader
                        docTitle="Customer Ledger"
                        metaLines={[data.customer, (dateFrom || dateTo) ? `${dateFrom ? formatDate(dateFrom) : '…'} → ${dateTo ? formatDate(dateTo) : '…'}` : 'All time']}
                        refLabel="Closing"
                        refValue={formatCurrency(data.closing)}
                        date={formatDate(new Date().toISOString())}
                    />
                    <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse border border-slate-300 [&_th]:border [&_th]:border-slate-300 [&_td]:border [&_td]:border-slate-200 text-[12px]">
                            <thead>
                                <tr className="bg-slate-50 text-[10px] font-bold uppercase tracking-wider text-slate-400">
                                    <th className="py-1.5 px-2">Date</th>
                                    <th className="py-1.5 px-2">Reference</th>
                                    <th className="py-1.5 px-2">Detail</th>
                                    <th className="py-1.5 px-2 text-right">Debit</th>
                                    <th className="py-1.5 px-2 text-right">Credit</th>
                                    <th className="py-1.5 px-2 text-right">Balance</th>
                                </tr>
                            </thead>
                            <tbody>
                                <tr className="bg-amber-50/40 font-bold">
                                    <td className="py-1.5 px-2" colSpan={5}>Opening Balance</td>
                                    <td className="py-1.5 px-2 text-right tabular-nums">{formatCurrency(data.opening)}</td>
                                </tr>
                                {data.rows.map((r: any, i: number) => (
                                    <tr key={i} className="hover:bg-slate-50">
                                        <td className="py-1.5 px-2 whitespace-nowrap">{formatDate(r.date)}</td>
                                        <td className="py-1.5 px-2 font-semibold text-slate-700">{r.ref}</td>
                                        <td className="py-1.5 px-2 text-slate-600">{r.detail}</td>
                                        <td className="py-1.5 px-2 text-right tabular-nums text-slate-800">{r.debit ? formatCurrency(r.debit) : ''}</td>
                                        <td className="py-1.5 px-2 text-right tabular-nums text-emerald-700">{r.credit ? formatCurrency(r.credit) : ''}</td>
                                        <td className="py-1.5 px-2 text-right tabular-nums font-bold">{formatCurrency(r.balance)}</td>
                                    </tr>
                                ))}
                                <tr className="bg-slate-100 font-black">
                                    <td className="py-2 px-2" colSpan={3}>Closing Balance</td>
                                    <td className="py-2 px-2 text-right tabular-nums">{formatCurrency(data.totals.debit)}</td>
                                    <td className="py-2 px-2 text-right tabular-nums">{formatCurrency(data.totals.credit)}</td>
                                    <td className="py-2 px-2 text-right tabular-nums text-indigo-700">{formatCurrency(data.closing)}</td>
                                </tr>
                            </tbody>
                        </table>
                    </div>
                    <InvoiceFooter />
                    <style jsx global>{invoiceStyles}</style>
                </div>
            )}
        </div>
    );
}
