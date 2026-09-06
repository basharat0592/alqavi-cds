'use client';

import { useEffect, useMemo, useState, use } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Printer, ArrowLeft } from 'lucide-react';
import api from '@/lib/axios';
import { inventoryService } from '@/services/inventory.service';
import { purchaseService } from '@/services/purchase.service';
import { formatCurrency, formatDate } from '@/lib/utils';
import PageLoader from '@/components/ui/PageLoader';
import { PageHeader, Card, Button } from '@/components/admin/ui';
import { InvoiceHeader, InvoiceFooter, invoiceStyles } from '@/components/admin/invoice/InvoiceParts';

export default function StockInvoicePage({ params }: { params: Promise<{ id: string }> }) {
    const router = useRouter();
    const { id } = use(params);
    const sp = useSearchParams();
    const supplierFilter = sp.get('supplier') || 'all';
    const dateFrom = sp.get('from') || '';
    const dateTo = sp.get('to') || '';

    const [stock, setStock] = useState<any | null>(null);
    const [movements, setMovements] = useState<any[]>([]);
    const [poMap, setPoMap] = useState<Record<string, any>>({});
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (!id) return;
        Promise.all([
            api.get(`v1/inventory/stocks/${id}/`).then(r => r.data).catch(() => null),
            inventoryService.getStockMovements(id).then((r: any[]) => Array.isArray(r) ? r : []).catch(() => []),
            purchaseService.getAll({ no_pagination: 'true' }).then((r: any) => Array.isArray(r) ? r : (r?.results || [])).catch(() => []),
        ]).then(([s, m, pos]) => {
            setStock(s);
            setMovements(m);
            const map: Record<string, any> = {};
            (pos || []).forEach((p: any) => { if (p.purchase_number) map[p.purchase_number] = p; });
            setPoMap(map);
        }).finally(() => {
            setLoading(false);
            if (typeof window !== 'undefined' && window.location.search.includes('print=true')) {
                setTimeout(() => window.print(), 800);
            }
        });
    }, [id]);

    const allRows = useMemo(() => (movements || []).map((m: any) => {
        const ref = (String(m.description || '').match(/#(\S+)/) || [])[1] || '';
        const po = poMap[ref] || null;
        const total = po ? Number(po.total_amount || 0) : null;
        const paid = po ? Number(po.paid_amount || 0) : null;
        const remaining = po ? Math.max(0, (total || 0) - (paid || 0)) : null;
        return { ...m, ref, po, total, paid, remaining, supplier: po?.supplier_name || m.supplier_name || '—' };
    }), [movements, poMap]);

    // Apply the supplier + date filters passed from the detail page.
    const rows = useMemo(() => {
        const from = dateFrom ? new Date(dateFrom + 'T00:00:00').getTime() : -Infinity;
        const to = dateTo ? new Date(dateTo + 'T23:59:59').getTime() : Infinity;
        return allRows.filter(r => {
            if (supplierFilter !== 'all' && r.supplier !== supplierFilter) return false;
            const t = new Date(r.created_at || r.date).getTime();
            return isNaN(t) ? true : (t >= from && t <= to);
        });
    }, [allRows, supplierFilter, dateFrom, dateTo]);

    const totals = useMemo(() => {
        const seen = new Set<string>();
        let total = 0, paid = 0;
        rows.forEach(r => {
            if (r.po && r.ref && !seen.has(r.ref)) { seen.add(r.ref); total += r.total || 0; paid += r.paid || 0; }
        });
        return { total, paid, remaining: Math.max(0, total - paid), count: seen.size };
    }, [rows]);

    if (loading) return <PageLoader />;
    if (!stock) {
        return (
            <div className="max-w-lg mx-auto py-24 text-center">
                <p className="text-[14px] text-slate-500">Stock item not found.</p>
                <Button variant="outline" className="mt-4" onClick={() => router.push('/admin/inventory/list')}>Back</Button>
            </div>
        );
    }

    const name = (stock.product_name || 'Stock Item').replace(/\s*\(.*?\)\s*$/, '');
    const qty = Number(stock.total_quantity || 0);
    const cost = Number(stock.price_per_item || 0);
    // Supplier shown on the invoice follows the selected filter.
    const invoiceSupplier = supplierFilter !== 'all' ? supplierFilter : (stock.supplier_name || 'All Suppliers');
    const periodLine = (dateFrom || dateTo)
        ? `Period: ${dateFrom ? formatDate(dateFrom) : 'start'} — ${dateTo ? formatDate(dateTo) : 'today'}`
        : null;

    return (
        <div className="pb-20 font-sans text-slate-900 text-left">
            {/* Action bar (hidden on print) */}
            <div className="max-w-[850px] mx-auto pt-2 px-4 print:hidden">
                <PageHeader
                    title="Stock Statement"
                    breadcrumbs={[
                        { label: 'Console', href: '/admin/dashboard' },
                        { label: 'Current Stock', href: '/admin/inventory/list' },
                        { label: 'Statement' },
                    ]}
                    actions={
                        <>
                            <Button variant="outline" size="sm" onClick={() => router.push(`/admin/inventory/${id}`)}><ArrowLeft size={14} /> Back</Button>
                            <Button variant="primary" size="sm" onClick={() => window.print()}><Printer size={14} /> Print</Button>
                        </>
                    }
                />
            </div>

            {/* Paper */}
            <Card className="max-w-[850px] mx-auto p-6 flex flex-col min-h-screen print:min-h-0 print:border-none print:shadow-none print:rounded-none print:p-0">
                <InvoiceHeader
                    docTitle="Stock Statement"
                    metaLines={[`Organization: ${stock.warehouse_name || '—'}`, `Supplier: ${invoiceSupplier}`, ...(periodLine ? [periodLine] : [])]}
                    refLabel="SKU"
                    refValue={stock.sku || '—'}
                    date={formatDate(new Date().toISOString())}
                />

                {/* Product + stock summary */}
                <div className="grid grid-cols-3 gap-6 mb-4 px-1 items-start">
                    <div className="col-span-2">
                        <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">Product</p>
                        <p className="text-[16px] font-black text-slate-900 leading-tight">{name}</p>
                        <p className="text-[11px] font-medium text-slate-600 mt-0.5">
                            {[stock.weight, stock.size].filter(Boolean).join(' · ') || stock.category_name || 'General Inventory'}
                        </p>
                    </div>
                    <div className="text-right">
                        <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">In Stock</p>
                        <p className="text-[16px] font-black text-slate-900">{qty.toLocaleString()} Units</p>
                        <p className="text-[11px] text-slate-500">@ {formatCurrency(cost)} = {formatCurrency(qty * cost)}</p>
                    </div>
                </div>

                {/* Purchase history table */}
                <table className="w-full text-left border-collapse border border-slate-300 [&_th]:border [&_th]:border-slate-300 [&_td]:border [&_td]:border-slate-200 text-[11px]">
                    <thead>
                        <tr className="bg-slate-100 text-slate-600 uppercase text-[9px] tracking-wider print-exact">
                            <th className="px-3 py-2">Date</th>
                            <th className="px-3 py-2">Reference</th>
                            <th className="px-3 py-2">Supplier</th>
                            <th className="px-3 py-2 text-right">Qty</th>
                            <th className="px-3 py-2 text-right">Total</th>
                            <th className="px-3 py-2 text-right">Paid</th>
                            <th className="px-3 py-2 text-right">Remaining</th>
                        </tr>
                    </thead>
                    <tbody>
                        {rows.length === 0 ? (
                            <tr><td colSpan={7} className="px-3 py-6 text-center text-slate-400 italic">No purchases recorded.</td></tr>
                        ) : rows.map((m: any) => {
                            const when = m.created_at || m.date;
                            return (
                                <tr key={m.id}>
                                    <td className="px-3 py-2">{new Date(when).toLocaleDateString('en-PK', { day: 'numeric', month: 'short', year: 'numeric' })}</td>
                                    <td className="px-3 py-2 font-semibold">{m.ref ? `#${m.ref}` : (m.movement_type_display || m.movement_type)}</td>
                                    <td className="px-3 py-2">{m.supplier}</td>
                                    <td className="px-3 py-2 text-right tabular-nums">+{Math.abs(m.quantity || 0).toLocaleString()}</td>
                                    <td className="px-3 py-2 text-right tabular-nums">{m.total != null ? formatCurrency(m.total) : '—'}</td>
                                    <td className="px-3 py-2 text-right tabular-nums">{m.paid != null ? formatCurrency(m.paid) : '—'}</td>
                                    <td className="px-3 py-2 text-right tabular-nums">{m.remaining != null ? formatCurrency(m.remaining) : '—'}</td>
                                </tr>
                            );
                        })}
                    </tbody>
                </table>

                {/* Totals */}
                <div className="flex justify-end mt-4">
                    <div className="w-full max-w-[300px] text-[12px]">
                        <div className="flex justify-between py-1 text-slate-600"><span>Total Purchased ({totals.count} order{totals.count === 1 ? '' : 's'})</span><span className="font-bold text-slate-900 tabular-nums">{formatCurrency(totals.total)}</span></div>
                        <div className="flex justify-between py-1 text-slate-600"><span>Paid</span><span className="font-bold text-emerald-700 tabular-nums">{formatCurrency(totals.paid)}</span></div>
                        <div className="flex justify-between py-2 border-t border-slate-300 mt-1 text-[14px] font-black"><span>Remaining / Due</span><span className={`tabular-nums ${totals.remaining > 0 ? 'text-rose-600' : 'text-emerald-700'}`}>{formatCurrency(totals.remaining)}</span></div>
                    </div>
                </div>

                <InvoiceFooter />
            </Card>

            <style jsx global>{invoiceStyles}</style>
        </div>
    );
}
