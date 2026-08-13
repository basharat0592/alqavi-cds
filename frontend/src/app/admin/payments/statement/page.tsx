"use client";

import { useState, useEffect } from 'react';
import { formatCurrency, formatDate } from '@/lib/utils';
import { Printer, ArrowLeft } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { PageHeader, Button } from '@/components/admin/ui';
import { InvoiceHeader, InvoiceFooter, invoiceStyles } from '@/components/admin/invoice/InvoiceParts';

// Renders the selected payment rows on the REAL branded invoice (same InvoiceHeader/
// Footer + styles as the sales invoice). The rows are handed over via sessionStorage
// by the Payments page's "Download PDF" bulk action.
const srcLabel = (p: any): string => {
    const s = String(p.source_type || p.source || '').toLowerCase();
    if (s.includes('deliver')) return 'Delivery';
    if (s.includes('return')) return s.includes('purchase') ? 'Purchase Return' : 'Sale Return';
    if (s.includes('purchase')) return 'Purchase';
    if (s === 'order' || s.includes('sale')) return 'Sale';
    return 'Manual';
};

export default function PaymentsStatementPage() {
    const router = useRouter();
    const [rows, setRows] = useState<any[]>([]);

    useEffect(() => {
        try {
            const raw = sessionStorage.getItem('payments_statement');
            const arr = raw ? JSON.parse(raw) : [];
            setRows(Array.isArray(arr) ? arr : []);
        } catch { setRows([]); }
        if (typeof window !== 'undefined' && window.location.search.includes('print=true')) {
            setTimeout(() => window.print(), 900);
        }
    }, []);

    let income = 0, expense = 0;
    rows.forEach((p: any) => { const a = Number(p.amount || 0); if (p.payment_type === 'inbound') income += a; else expense += a; });
    const net = income - expense;

    return (
        <div className="pb-20 font-sans text-slate-900 text-left">
            {/* Action bar (hidden on print) */}
            <div className="max-w-[850px] mx-auto pt-2 px-4 print:hidden">
                <PageHeader
                    title="Payments Statement"
                    breadcrumbs={[{ label: 'Console', href: '/admin/dashboard' }, { label: 'Payments', href: '/admin/payments' }, { label: 'Statement' }]}
                    actions={
                        <>
                            <Button variant="outline" size="sm" onClick={() => router.push('/admin/payments')}><ArrowLeft size={14} /> Back</Button>
                            <Button variant="primary" size="sm" onClick={() => window.print()}><Printer size={14} /> Print</Button>
                        </>
                    }
                />
            </div>

            {/* Paper */}
            <div className="max-w-[850px] mx-auto bg-white p-6 flex flex-col min-h-screen print:min-h-0 print:border-none print:shadow-none print:p-0">
                <InvoiceHeader
                    docTitle="Payments Statement"
                    metaLines={['Gilgit-Baltistan Distribution']}
                    refLabel="Entries"
                    refValue={String(rows.length)}
                    date={formatDate(new Date().toISOString())}
                />

                {/* Payments table */}
                <div className="mb-6">
                    <table className="w-full text-left border-collapse border border-slate-300 [&_th]:border [&_th]:border-slate-300 [&_td]:border [&_td]:border-slate-200">
                        <thead>
                            <tr className="border-b-2 border-slate-300 text-[10px] font-bold uppercase tracking-wider text-slate-400 bg-slate-50/60">
                                <th className="py-1.5 px-2 w-10 text-center">#</th>
                                <th className="py-1.5 px-3">Voucher / Date</th>
                                <th className="py-1.5 px-3">Source</th>
                                <th className="py-1.5 px-3">Mode</th>
                                <th className="py-1.5 px-3">Person / Company</th>
                                <th className="py-1.5 px-3">Category</th>
                                <th className="py-1.5 px-3 text-right w-32">Amount</th>
                            </tr>
                        </thead>
                        <tbody className="text-[12px]">
                            {rows.length === 0 ? (
                                <tr><td colSpan={7} className="py-8 text-center text-slate-400 italic">No payments selected.</td></tr>
                            ) : rows.map((p: any, i: number) => (
                                <tr key={i} className="hover:bg-slate-50">
                                    <td className="py-1.5 px-2 text-center text-slate-400 tabular-nums">{i + 1}</td>
                                    <td className="py-1.5 px-3 whitespace-nowrap">
                                        <span className="font-bold text-slate-900">#{p.id}</span>
                                        <span className="block text-[9.5px] text-slate-400">{formatDate(p.date)}</span>
                                    </td>
                                    <td className="py-1.5 px-3">{srcLabel(p)}</td>
                                    <td className="py-1.5 px-3 capitalize">{String(p.method || '').replace('_', ' ')}</td>
                                    <td className="py-1.5 px-3 font-semibold text-slate-800">{p.payer_payee || 'Internal'}</td>
                                    <td className="py-1.5 px-3 text-slate-600">{p.category_name || ''}</td>
                                    <td className={`py-1.5 px-3 text-right font-black tabular-nums whitespace-nowrap ${p.payment_type === 'inbound' ? 'text-emerald-700' : 'text-rose-600'}`}>
                                        {p.payment_type === 'inbound' ? '+' : '-'}{formatCurrency(Number(p.amount || 0))}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>

                {/* Totals */}
                <div className="flex justify-end mb-6">
                    <div className="w-[280px] text-[12px] space-y-2">
                        <div className="flex justify-between">
                            <span className="text-emerald-600 font-bold uppercase text-[11px]">Total Income</span>
                            <span className="font-bold text-emerald-700 tabular-nums">+{formatCurrency(income)}</span>
                        </div>
                        <div className="flex justify-between">
                            <span className="text-rose-600 font-bold uppercase text-[11px]">Total Expense</span>
                            <span className="font-bold text-rose-600 tabular-nums">-{formatCurrency(expense)}</span>
                        </div>
                        <div className="flex justify-between items-center pt-1 border-t border-slate-200">
                            <span className="text-slate-900 font-black uppercase text-[12px]">Net Balance</span>
                            <span className={`font-black text-[16px] tabular-nums ${net >= 0 ? 'text-[#B4780B]' : 'text-rose-600'}`}>{formatCurrency(net)}</span>
                        </div>
                    </div>
                </div>

                <InvoiceFooter />
            </div>

            <style jsx global>{invoiceStyles}</style>
        </div>
    );
}
