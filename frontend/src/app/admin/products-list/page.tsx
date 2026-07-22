'use client';

import { useEffect, useState, useMemo } from 'react';
import { Boxes, Plus, Trash2, Search, RefreshCw } from 'lucide-react';
import { productService } from '@/services/product.service';
import { companyService } from '@/services/company.service';
import toast from 'react-hot-toast';
import { PageHeader, Card, Button, ui } from '@/components/admin/ui';
import AddProductModal from '@/components/admin/AddProductModal';

export default function ProductsListPage() {
    const [products, setProducts] = useState<any[]>([]);
    const [companies, setCompanies] = useState<any[]>([]);
    const [suppliers, setSuppliers] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');
    const [addOpen, setAddOpen] = useState(false);

    const loadProducts = async () => {
        setLoading(true);
        try {
            const res = await productService.getAllSupplier();
            const raw = res as any;
            setProducts(Array.isArray(raw) ? raw : raw?.results || []);
        } catch { toast.error('Failed to load products'); }
        finally { setLoading(false); }
    };
    const loadCompanies = () => (companyService as any).getCompanies?.()
        .then((r: any) => setCompanies(Array.isArray(r) ? r : r?.results || [])).catch(() => { });

    useEffect(() => {
        loadProducts();
        loadCompanies();
        (companyService as any).getSuppliers?.().then((r: any) => setSuppliers(Array.isArray(r) ? r : r?.results || [])).catch(() => { });
    }, []);

    const remove = async (p: any) => {
        if (!confirm(`Delete product “${p.name}”?`)) return;
        try {
            await productService.deleteSupplier(p.id);
            toast.success('Product deleted');
            loadProducts();
        } catch { toast.error('Failed to delete product'); }
    };

    const filtered = useMemo(() => products.filter((p: any) => {
        const q = search.trim().toLowerCase();
        if (!q) return true;
        return (p.name || '').toLowerCase().includes(q)
            || (p.company_name || '').toLowerCase().includes(q)
            || (p.category_name || '').toLowerCase().includes(q)
            || (p.barcode || p.sku || '').toLowerCase().includes(q);
    }), [products, search]);

    return (
        <div className="pb-20 max-w-[1120px] mx-auto">
            <PageHeader
                title="Products List"
                subtitle="All products — add new ones with the same popup used on the purchase page."
                breadcrumbs={[{ label: 'Console', href: '/admin/dashboard' }, { label: 'Products List' }]}
                actions={<Button variant="primary" onClick={() => setAddOpen(true)}><Plus size={15} /> Add Products</Button>}
            />

            <Card className="overflow-hidden">
                <div className="px-5 sm:px-6 py-3.5 border-b border-slate-100 flex items-center justify-between gap-3">
                    <h3 className="text-[13px] font-bold text-slate-900 tracking-tight flex items-center gap-2">
                        <Boxes size={16} className="text-indigo-600" /> Products
                        <span className="text-[10px] font-black text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded-full tabular-nums">{filtered.length}</span>
                    </h3>
                    <div className="flex items-center gap-2">
                        <div className="relative w-full max-w-[240px]">
                            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                            <input className={ui.inputBase + ' pl-9 h-9'} value={search} onChange={e => setSearch(e.target.value)} placeholder="Search products..." />
                        </div>
                        <Button variant="outline" size="sm" onClick={loadProducts} disabled={loading}>
                            <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
                        </Button>
                    </div>
                </div>
                <div className="overflow-x-auto">
                    <table className="w-full text-left text-[12.5px] border-collapse">
                        <thead>
                            <tr className="bg-slate-50/60 border-b border-slate-200 font-bold text-slate-400 uppercase tracking-wider text-[10px]">
                                <th className="px-5 py-2.5">Product Name</th>
                                <th className="px-5 py-2.5">Company</th>
                                <th className="px-5 py-2.5">Category</th>
                                <th className="px-5 py-2.5">Bar Code</th>
                                <th className="px-5 py-2.5 text-center">Status</th>
                                <th className="px-5 py-2.5 text-right w-20">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {loading ? (
                                <tr><td colSpan={6} className="px-5 py-8 text-center text-slate-400">Loading…</td></tr>
                            ) : filtered.length === 0 ? (
                                <tr><td colSpan={6} className="px-5 py-8 text-center text-slate-400 italic">No products yet. Click “Add Products”.</td></tr>
                            ) : (
                                filtered.map((p: any) => (
                                    <tr key={p.id} className="hover:bg-slate-50 transition-colors">
                                        <td className="px-5 py-3 font-bold text-slate-900">{p.name}</td>
                                        <td className="px-5 py-3 text-slate-600">{p.company_name || '—'}</td>
                                        <td className="px-5 py-3">
                                            {p.category_name
                                                ? <span className="inline-flex items-center px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 text-[11px] font-semibold">{p.category_name}</span>
                                                : <span className="text-slate-400">—</span>}
                                        </td>
                                        <td className="px-5 py-3 text-slate-500 tabular-nums">{p.barcode || p.sku || '—'}</td>
                                        <td className="px-5 py-3 text-center">
                                            <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-black uppercase ${String(p.status).toUpperCase() === 'ACTIVE' ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-100 text-slate-500'}`}>
                                                {p.status || 'ACTIVE'}
                                            </span>
                                        </td>
                                        <td className="px-5 py-3 text-right whitespace-nowrap">
                                            <button onClick={() => remove(p)} className="text-slate-400 hover:text-rose-600 p-1.5 rounded-lg hover:bg-rose-50 transition-colors" title="Delete"><Trash2 size={15} /></button>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </Card>

            <AddProductModal
                open={addOpen}
                onClose={() => setAddOpen(false)}
                companies={companies}
                onCompaniesReload={loadCompanies}
                suppliers={suppliers}
                onCreated={() => loadProducts()}
            />
        </div>
    );
}
