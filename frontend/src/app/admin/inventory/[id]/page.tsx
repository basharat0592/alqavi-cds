'use client';

import { useEffect, useMemo, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Package, Loader2, ShoppingCart, Printer } from 'lucide-react';
import api from '@/lib/axios';
import { inventoryService } from '@/services/inventory.service';
import { purchaseService } from '@/services/purchase.service';
import { formatCurrency } from '@/lib/utils';
import { PageHeader, Card, Button, ui } from '@/components/admin/ui';

export default function StockViewPage() {
    const params = useParams();
    const router = useRouter();
    const id = String(params?.id || '');

    const [stock, setStock] = useState<any | null>(null);
    const [loading, setLoading] = useState(true);
    const [notFound, setNotFound] = useState(false);
    const [movements, setMovements] = useState<any[]>([]);
    const [movementsLoading, setMovementsLoading] = useState(true);
    const [poMap, setPoMap] = useState<Record<string, any>>({});
    const [supplierFilter, setSupplierFilter] = useState('all');
    const [dateFrom, setDateFrom] = useState('');
    const [dateTo, setDateTo] = useState('');

    useEffect(() => {
        if (!id) return;
        setLoading(true);
        api.get(`v1/inventory/stocks/${id}/`)
            .then(({ data }) => setStock(data))
            .catch(() => setNotFound(true))
            .finally(() => setLoading(false));
        setMovementsLoading(true);
        inventoryService.getStockMovements(id)
            .then((rows: any[]) => setMovements(Array.isArray(rows) ? rows : []))
            .catch(() => setMovements([]))
            .finally(() => setMovementsLoading(false));
        // Purchase orders → to join each arrival with its payment (paid/remaining/total).
        purchaseService.getAll({ no_pagination: 'true' })
            .then((res: any) => {
                const list = Array.isArray(res) ? res : (res?.results || []);
                const map: Record<string, any> = {};
                list.forEach((p: any) => { if (p.purchase_number) map[p.purchase_number] = p; });
                setPoMap(map);
            })
            .catch(() => setPoMap({}));
    }, [id]);

    const reorderUrl = () => {
        if (!stock) return '/admin/purchases/add';
        const p = new URLSearchParams();
        if (stock.supplier) p.set('supplier', String(stock.supplier));
        if (stock.sku) p.set('sku', stock.sku);
        p.set('product_name', stock.product_name || '');
        if (stock.price_per_item) p.set('price', String(stock.price_per_item));
        if (stock.weight) p.set('weight', stock.weight);
        if (stock.size) p.set('size', stock.size);
        if (stock.warehouse) p.set('warehouse', String(stock.warehouse));
        return `/admin/purchases/add?${p.toString()}`;
    };

    // Join each purchase movement with its PO (payment/total/supplier).
    const rows = useMemo(() => {
        return (movements || []).map((m: any) => {
            const ref = (String(m.description || '').match(/#(\S+)/) || [])[1] || '';
            const po = poMap[ref] || null;
            const total = po ? Number(po.total_amount || 0) : null;
            const paid = po ? Number(po.paid_amount || 0) : null;
            const remaining = po ? Math.max(0, (total || 0) - (paid || 0)) : null;
            const supplier = po?.supplier_name || m.supplier_name || '—';
            return { ...m, ref, po, total, paid, remaining, supplier };
        });
    }, [movements, poMap]);

    const supplierOptions = useMemo(() => {
        const s = new Set<string>();
        rows.forEach(r => { if (r.supplier && r.supplier !== '—') s.add(r.supplier); });
        return Array.from(s).sort();
    }, [rows]);

    const visibleRows = useMemo(() => {
        const from = dateFrom ? new Date(dateFrom + 'T00:00:00').getTime() : -Infinity;
        const to = dateTo ? new Date(dateTo + 'T23:59:59').getTime() : Infinity;
        return rows.filter(r => {
            if (supplierFilter !== 'all' && r.supplier !== supplierFilter) return false;
            const t = new Date(r.created_at || r.date).getTime();
            return isNaN(t) ? true : (t >= from && t <= to);
        });
    }, [rows, supplierFilter, dateFrom, dateTo]);

    // Payment totals across the UNIQUE purchase orders behind the visible arrivals.
    const totals = useMemo(() => {
        const seen = new Set<string>();
        let total = 0, paid = 0;
        visibleRows.forEach(r => {
            if (r.po && r.ref && !seen.has(r.ref)) {
                seen.add(r.ref);
                total += r.total || 0;
                paid += r.paid || 0;
            }
        });
        return { total, paid, remaining: Math.max(0, total - paid), count: seen.size };
    }, [visibleRows]);

    if (loading) {
        return <div className="flex items-center justify-center py-40"><Loader2 className="w-8 h-8 animate-spin text-[#1A1A1A]" /></div>;
    }
    if (notFound || !stock) {
        return (
            <div className="max-w-lg mx-auto py-24 text-center">
                <Package className="w-12 h-12 text-[#DCDCD8] mx-auto mb-3" />
                <p className="text-[14px] text-slate-500">This stock item could not be found.</p>
                <Button variant="outline" className="mt-4" onClick={() => router.push('/admin/inventory/list')}>Back to Current Stock</Button>
            </div>
        );
    }

    const qty = Number(stock.total_quantity || 0);
    const cost = Number(stock.price_per_item || 0);

    return (
        <div className="pb-16 max-w-[1100px] mx-auto">
            <PageHeader
                title={(stock.product_name || 'Stock Item').replace(/\s*\(.*?\)\s*$/, '')}
                subtitle={stock.category_name || 'General Inventory'}
                backUrl="/admin/inventory/list"
                breadcrumbs={[
                    { label: 'Console', href: '/admin/dashboard' },
                    { label: 'Current Stock', href: '/admin/inventory/list' },
                    { label: 'Details' },
                ]}
                actions={
                    <>
                        <Button variant="primary" onClick={() => router.push(reorderUrl())}><ShoppingCart size={14} /> Reorder</Button>
                        <Button variant="outline" onClick={() => {
                            const p = new URLSearchParams();
                            if (supplierFilter !== 'all') p.set('supplier', supplierFilter);
                            if (dateFrom) p.set('from', dateFrom);
                            if (dateTo) p.set('to', dateTo);
                            const q = p.toString();
                            router.push(`/admin/inventory/${id}/invoice${q ? '?' + q : ''}`);
                        }}><Printer size={14} /> Invoice</Button>
                    </>
                }
            />

            <div className="space-y-6">
                {/* Stock metrics */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-0 border border-slate-200/70 rounded-xl divide-y md:divide-y-0 md:divide-x divide-slate-100 overflow-hidden bg-white">
                    <div className="p-4">
                        <p className="text-[10px] font-bold text-slate-400 uppercase mb-0.5">Current Stock</p>
                        <p className="text-[18px] font-bold text-slate-900 tabular-nums">{qty.toLocaleString()} <span className="text-[11px] font-normal text-slate-400">Units</span></p>
                    </div>
                    <div className="p-4">
                        <p className="text-[10px] font-bold text-slate-400 uppercase mb-0.5">Unit Cost</p>
                        <p className="text-[18px] font-bold text-slate-900 tabular-nums">{formatCurrency(cost)}</p>
                    </div>
                    <div className="p-4 bg-slate-50">
                        <p className="text-[10px] font-bold text-slate-400 uppercase mb-0.5">Total Valuation</p>
                        <p className="text-[18px] font-bold text-[#1A1A1A] tabular-nums">{formatCurrency(qty * cost)}</p>
                    </div>
                </div>

                {/* Purchase history + payments */}
                <Card className="overflow-hidden">
                    <div className="px-5 py-3.5 border-b border-slate-100 flex flex-col lg:flex-row lg:items-center justify-between gap-3">
                        <div>
                            <h4 className="text-[13px] font-bold text-slate-900">Purchase History &amp; Payments</h4>
                            <p className="text-[11px] text-slate-400">Every purchase into this stock, with what's paid and due.</p>
                        </div>
                        <div className="flex flex-wrap items-center gap-2">
                            <div className="flex items-center gap-1.5">
                                <input type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)} className={ui.inputBase + ' h-9 w-[140px] text-[12px] px-2'} />
                                <span className="text-[11px] text-slate-400 font-bold">to</span>
                                <input type="date" value={dateTo} onChange={e => setDateTo(e.target.value)} className={ui.inputBase + ' h-9 w-[140px] text-[12px] px-2'} />
                            </div>
                            {(dateFrom || dateTo) && (
                                <button onClick={() => { setDateFrom(''); setDateTo(''); }} className="text-[11px] font-bold text-slate-500 hover:text-slate-700 px-2">Clear</button>
                            )}
                            {supplierOptions.length > 0 && (
                                <select
                                    value={supplierFilter}
                                    onChange={e => setSupplierFilter(e.target.value)}
                                    className={ui.inputBase + ' h-9 sm:w-[190px] cursor-pointer font-semibold'}
                                >
                                    <option value="all">All Suppliers</option>
                                    {supplierOptions.map(s => <option key={s} value={s}>{s}</option>)}
                                </select>
                            )}
                        </div>
                    </div>
                    <div className="overflow-x-auto">
                        <table className="w-full text-left text-[12px] border-collapse">
                            <thead>
                                <tr className="bg-slate-50/60 border-b border-slate-200 font-bold text-slate-400 uppercase tracking-wider text-[10px]">
                                    <th className="px-5 py-2.5">Date &amp; Time</th>
                                    <th className="px-5 py-2.5">Reference</th>
                                    <th className="px-5 py-2.5">Supplier</th>
                                    <th className="px-5 py-2.5 text-right">Qty</th>
                                    <th className="px-5 py-2.5 text-right">Rate / Item</th>
                                    <th className="px-5 py-2.5 text-right">Total</th>
                                    <th className="px-5 py-2.5 text-right">Paid</th>
                                    <th className="px-5 py-2.5 text-right">Remaining</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                                {movementsLoading ? (
                                    <tr><td colSpan={8} className="px-5 py-6 text-center text-slate-400">Loading purchase history…</td></tr>
                                ) : visibleRows.length === 0 ? (
                                    <tr><td colSpan={8} className="px-5 py-6 text-center text-slate-400 italic">No purchases recorded yet.</td></tr>
                                ) : (
                                    visibleRows.map((m: any) => {
                                        const when = m.created_at || m.date;
                                        const isIn = (m.quantity || 0) >= 0 && (m.movement_type || '').toUpperCase() !== 'SALE';
                                        const qtyAbs = Math.abs(m.quantity || 0);
                                        const rate = (m.total != null && qtyAbs > 0) ? (Number(m.total) / qtyAbs) : null;
                                        return (
                                            <tr key={m.id} className="hover:bg-slate-50 transition-colors">
                                                <td className="px-5 py-3">
                                                    <div className="font-bold text-slate-900">{new Date(when).toLocaleDateString('en-PK', { day: 'numeric', month: 'short', year: 'numeric' })}</div>
                                                    <div className="text-[10px] text-slate-400 font-bold uppercase mt-0.5">{new Date(when).toLocaleTimeString('en-PK', { hour: '2-digit', minute: '2-digit', hour12: true })}</div>
                                                </td>
                                                <td className="px-5 py-3 font-semibold text-[#1A1A1A]">{m.ref ? `#${m.ref}` : (m.movement_type_display || m.movement_type)}</td>
                                                <td className="px-5 py-3 text-slate-600">{m.supplier}</td>
                                                <td className={`px-5 py-3 text-right font-black tabular-nums ${isIn ? 'text-emerald-600' : 'text-rose-600'}`}>{isIn ? '+' : '−'}{qtyAbs.toLocaleString()}</td>
                                                <td className="px-5 py-3 text-right font-semibold text-slate-600 tabular-nums">{rate != null ? formatCurrency(rate) : '—'}</td>
                                                <td className="px-5 py-3 text-right font-bold text-slate-900 tabular-nums">{m.total != null ? formatCurrency(m.total) : '—'}</td>
                                                <td className="px-5 py-3 text-right font-bold text-emerald-700 tabular-nums">{m.paid != null ? formatCurrency(m.paid) : '—'}</td>
                                                <td className={`px-5 py-3 text-right font-bold tabular-nums ${m.remaining ? 'text-rose-600' : 'text-slate-400'}`}>{m.remaining != null ? formatCurrency(m.remaining) : '—'}</td>
                                            </tr>
                                        );
                                    })
                                )}
                            </tbody>
                            {totals.count > 0 && (
                                <tfoot>
                                    <tr className="border-t-2 border-slate-200 bg-slate-50 font-bold text-[12px]">
                                        <td className="px-5 py-3 text-slate-900" colSpan={5}>Total ({totals.count} order{totals.count === 1 ? '' : 's'})</td>
                                        <td className="px-5 py-3 text-right text-slate-900 tabular-nums">{formatCurrency(totals.total)}</td>
                                        <td className="px-5 py-3 text-right text-emerald-700 tabular-nums">{formatCurrency(totals.paid)}</td>
                                        <td className={`px-5 py-3 text-right tabular-nums ${totals.remaining > 0 ? 'text-rose-600' : 'text-emerald-700'}`}>{formatCurrency(totals.remaining)}</td>
                                    </tr>
                                </tfoot>
                            )}
                        </table>
                    </div>
                </Card>
            </div>
        </div>
    );
}
