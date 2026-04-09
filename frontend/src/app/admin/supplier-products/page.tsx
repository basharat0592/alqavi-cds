'use client';

import { useEffect, useState } from 'react';
import { supplierProductService } from '@/services/supplierProduct.service';
import { formatCurrency, formatDate } from '@/lib/utils';
import { Loader2, Plus, Trash2, Edit2 } from 'lucide-react';
import Link from 'next/link';

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

    return (
        <div>
            <div className="flex items-center justify-between mb-4">
                <div>
                    <h1 className="text-xl font-bold">Supplier Products</h1>
                    <p className="text-sm text-slate-500">Mapping of supplier SKUs, prices and lead times.</p>
                </div>
                <div>
                    <Link href="/admin/supplier-products/add" className="inline-flex items-center gap-2 px-3 py-2 bg-amber-500 text-sm text-white rounded">
                        <Plus className="h-4 w-4" /> New
                    </Link>
                </div>
            </div>

            <div className="bg-white rounded-lg border border-slate-100 overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                        <thead>
                            <tr className="bg-slate-50 border-b">
                                <th className="px-4 py-3 text-left">Supplier</th>
                                <th className="px-4 py-3 text-left">Product</th>
                                <th className="px-4 py-3 text-left">Supplier SKU</th>
                                <th className="px-4 py-3 text-left">Price</th>
                                <th className="px-4 py-3 text-left">Lead Time</th>
                                <th className="px-4 py-3 text-right">Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {loading ? (
                                <tr><td colSpan={6} className="p-6 text-center">Loading...</td></tr>
                            ) : items.length === 0 ? (
                                <tr><td colSpan={6} className="p-6 text-center">No mappings found.</td></tr>
                            ) : (
                                items.map((it: any) => (
                                    <tr key={it.id} className="hover:bg-slate-50">
                                        <td className="px-4 py-3">{it.supplier_name}</td>
                                        <td className="px-4 py-3">{it.product_name || '—'}</td>
                                        <td className="px-4 py-3">{it.supplier_sku || '—'}</td>
                                        <td className="px-4 py-3">{it.price ? formatCurrency(it.price) : '—'}</td>
                                        <td className="px-4 py-3">{it.lead_time_days ? `${it.lead_time_days} d` : '—'}</td>
                                        <td className="px-4 py-3 text-right">
                                            <div className="flex items-center justify-end gap-2">
                                                <Link href={`/admin/supplier-products/${it.id}/edit`} className="px-3 py-1 bg-white border rounded text-sm"> <Edit2 className="h-4 w-4" /> </Link>
                                                <button className="px-3 py-1 bg-rose-500 text-white rounded text-sm"> <Trash2 className="h-4 w-4" /> </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
}
