'use client';

import { useEffect, useState } from 'react';
import { supplierProductService } from '@/services/supplierProduct.service';
import { formatCurrency, formatDate, exportToCSV } from '@/lib/utils';
import { Loader2, Plus } from 'lucide-react';
import Link from 'next/link';
import toast from 'react-hot-toast';
import { PageHeader, Card, Button, useTableSelection, SelectAllTh, RowCheckboxTd, BulkBar } from '@/components/admin/ui';

export default function SupplierProductsPage() {
    const [items, setItems] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    const load = async () => {
        setLoading(true);
        try {
            const data = await supplierProductService.getAll();
            setItems(Array.isArray(data) ? data : (data && data.results) ? data.results : []);
        } catch (err) {
            console.error('Failed to load supplier products', err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => { load(); }, []);

    const sel = useTableSelection(items);

    const bulkDelete = async (ids: string[]) => {
        await Promise.allSettled(ids.map(id => supplierProductService.delete(id)));
        setItems(prev => prev.filter(it => !ids.map(String).includes(String(it.id))));
        toast.success(`${ids.length} mapping(s) deleted`);
    };

    return (
        <div>
            <PageHeader
                title="Supplier Catalog"
                subtitle="Mapping of supplier SKUs, prices and lead times."
                breadcrumbs={[{ label: 'Console', href: '/admin/dashboard' }, { label: 'Supplier Catalog' }]}
                actions={
                    <Link
                        href="/admin/supplier-products/add"
                        className="inline-flex items-center justify-center gap-2 h-10 px-4 text-[13.5px] font-semibold rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white shadow-sm shadow-indigo-600/20 transition-all active:scale-[0.98]"
                    >
                        <Plus className="h-4 w-4" /> New
                    </Link>
                }
            />

            <Card className="overflow-hidden p-0">
                <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                        <thead>
                            <tr className="bg-slate-50/60 border-b border-slate-100">
                                <SelectAllTh sel={sel} />
                                <th className="px-4 py-3 text-left text-[11px] font-bold uppercase tracking-wider text-slate-400">Supplier</th>
                                <th className="px-4 py-3 text-left text-[11px] font-bold uppercase tracking-wider text-slate-400">Product</th>
                                <th className="px-4 py-3 text-left text-[11px] font-bold uppercase tracking-wider text-slate-400">Supplier SKU</th>
                                <th className="px-4 py-3 text-left text-[11px] font-bold uppercase tracking-wider text-slate-400">Price</th>
                                <th className="px-4 py-3 text-left text-[11px] font-bold uppercase tracking-wider text-slate-400">Lead Time</th>
                                <th className="px-4 py-3 text-right text-[11px] font-bold uppercase tracking-wider text-slate-400">Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {loading ? (
                                <tr>
                                    <td colSpan={7} className="p-6 text-center text-slate-500">
                                        <span className="inline-flex items-center gap-2">
                                            <Loader2 className="h-4 w-4 animate-spin text-indigo-600" /> Loading...
                                        </span>
                                    </td>
                                </tr>
                            ) : items.length === 0 ? (
                                <tr><td colSpan={7} className="p-6 text-center text-slate-400">No mappings found.</td></tr>
                            ) : (
                                items.map((it: any) => (
                                    <tr key={it.id} className="border-b border-slate-100 hover:bg-slate-50">
                                        <RowCheckboxTd sel={sel} id={it.id} />
                                        <td className="px-4 py-3 text-slate-900">{it.supplier_name}</td>
                                        <td className="px-4 py-3 text-slate-600">{(it.product_name || '—').replace(/\s*\(.*?\)\s*$/, '')}</td>
                                        <td className="px-4 py-3 text-slate-600">{it.supplier_sku || '—'}</td>
                                        <td className="px-4 py-3 text-slate-900 tabular-nums">{it.price ? formatCurrency(it.price) : '—'}</td>
                                        <td className="px-4 py-3 text-slate-600 tabular-nums">{it.lead_time_days ? `${it.lead_time_days} d` : '—'}</td>
                                        <td className="px-4 py-3 text-right">
                                            <div className="flex items-center justify-end gap-2.5">
                                                <Link
                                                    href={`/admin/supplier-products/${it.id}/edit`}
                                                    className="text-[12px] font-bold text-indigo-600 hover:underline"
                                                >
                                                    Edit
                                                </Link>
                                                <span className="text-slate-300">|</span>
                                                <button className="text-[12px] font-bold text-[#c40000] hover:underline">Delete</button>
                                            </div>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </Card>

            <BulkBar
                sel={sel}
                entity="supplier products"
                onDelete={bulkDelete}
                onExport={() => exportToCSV(
                    sel.selectedItems.map((it: any) => ({
                        supplier: it.supplier_name || '',
                        product: it.product_name || '',
                        supplier_sku: it.supplier_sku || '',
                        price: it.price ?? '',
                        lead_time_days: it.lead_time_days ?? '',
                    })),
                    'supplier-products.csv',
                )}
            />
        </div>
    );
}
