"use client";

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import {
    Plus, Search, Edit, Trash2, Package,
    RefreshCw,
    AlertTriangle,
    ChevronLeft, ChevronRight, Truck, MapPin, TrendingUp
} from 'lucide-react';
import { productService, categoryService, supplierService, inventoryService } from '@/lib/api';
import { formatCurrency, getImageUrl, exportToCSV } from '@/lib/utils';
import toast from 'react-hot-toast';
import { PageHeader, Card, Button, Badge, Modal, ui, useTableSelection, SelectAllTh, RowCheckboxTd, BulkBar, TableShell, Pagination, RowActions } from '@/components/admin/ui';

export default function ProductsPage() {
    const router = useRouter();
    const [products, setProducts] = useState<any[]>([]);
    const [categories, setCategories] = useState<any[]>([]);
    const [suppliers, setSuppliers] = useState<any[]>([]);
    const [allStocks, setAllStocks] = useState<any[]>([]);
    const [catalogProducts, setCatalogProducts] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [syncing, setSyncing] = useState(false);
    const [deleteProd, setDeleteProd] = useState<any | null>(null);
    const [deleting, setDeleting] = useState(false);

    const [search, setSearch] = useState('');
    const [category, setCategory] = useState('');
    const [supplier, setSupplier] = useState('');
    const [ordering, setOrdering] = useState('');
    const [currentPage, setCurrentPage] = useState(1);
    const [totalCount, setTotalCount] = useState(0);
    const [itemsPerPage, setItemsPerPage] = useState(5);
    const changePageSize = (n: number) => { setItemsPerPage(n); setCurrentPage(1); };

    const fetchFilters = async () => {
        try {
            const [cats, sups] = await Promise.all([
                categoryService.getAll(),
                supplierService.getAll()
            ]);
            setCategories(cats || []);
            setSuppliers(sups || []);
        } catch { console.error('Filter sync failure'); }
    };

    const loadData = useCallback(async () => {
        setSyncing(true);
        try {
            const params = {
                page: currentPage,
                page_size: itemsPerPage,
                search: search || undefined,
                category: category || undefined,
                supplier: supplier || undefined,
                ordering: ordering || undefined,
            };
            const [resp, stockResp, catProdData] = await Promise.all([
                productService.getAll(params),
                inventoryService.getInventory({ no_pagination: 'true' }),
                productService.getAllSupplier({ no_pagination: 'true' })
            ]);

            setAllStocks(stockResp || []);
            setCatalogProducts(Array.isArray(catProdData) ? catProdData : catProdData?.results || []);

            if (resp && typeof resp === 'object' && 'results' in resp) {
                setProducts(resp.results);
                setTotalCount(resp.count);
            } else {
                setProducts(Array.isArray(resp) ? resp : []);
                setTotalCount(Array.isArray(resp) ? resp.length : 0);
            }
        } catch { toast.error("Communication failure"); } finally {
            setSyncing(false);
            setLoading(false);
        }
    }, [currentPage, itemsPerPage, search, category, supplier, ordering]);

    useEffect(() => { fetchFilters(); }, []);
    useEffect(() => {
        const t = setTimeout(loadData, 300);
        return () => clearTimeout(t);
    }, [loadData]);

    // Auto-refresh (30s). A 2s poll re-pulled the entire inventory + supplier
    // catalog every tick â€” far too heavy for the value it added.
    useEffect(() => {
        const timer = setInterval(() => {
            if (!loading && !syncing && !deleting) {
                loadData();
            }
        }, 30000);
        return () => clearInterval(timer);
    }, [loading, syncing, deleting, loadData]);

    const handleDelete = async () => {
        if (!deleteProd) return;
        setDeleting(true);
        try {
            await productService.delete(deleteProd.id);
            toast.success('Product deleted');
            setDeleteProd(null);
            loadData();
        } catch { toast.error('Failed to delete product'); } finally { setDeleting(false); }
    };

    // Grouped Products: Merge by [Name + Selling Price].
    // Current units come from the REAL Stock table (warehouse + tenant scoped),
    // counted once per [name|weight|size] variant â€” the same source the POS and
    // Current Stocks read. This avoids the denormalized Product.total_quantity
    // drifting / double-counting across duplicate product rows.
    const groupedProducts = useMemo(() => {
        const stockMap = new Map<string, number>();
        (allStocks || []).forEach((s: any) => {
            const vk = `${(s.product_name || '').toLowerCase().trim()}|${(s.weight || '').trim()}|${(s.size || '').trim()}`;
            stockMap.set(vk, (stockMap.get(vk) || 0) + Number(s.total_quantity || 0));
        });

        const groups = new Map();
        products.forEach(prod => {
            const name = (prod.product_name || '').toLowerCase().trim();
            const key = `${name}_${prod.selling_price}`;
            const vkey = `${name}|${(prod.weight || '').trim()}|${(prod.size || '').trim()}`;
            if (!groups.has(key)) {
                groups.set(key, { ...prod, _variants: new Set([vkey]) });
            } else {
                const g = groups.get(key);
                g._variants.add(vkey);
                if (g.warehouse_name !== prod.warehouse_name) g.warehouse_name = 'Multiple';
            }
        });

        return Array.from(groups.values()).map((g: any) => {
            let units = 0, matched = false;
            g._variants.forEach((vk: string) => {
                if (stockMap.has(vk)) { units += stockMap.get(vk)!; matched = true; }
            });
            delete g._variants;
            // Fall back to the denormalized field only when no stock row matched.
            return { ...g, current_units: matched ? units : Number(g.total_quantity || 0) };
        });
    }, [products, allStocks]);

    const totalPages = Math.ceil(totalCount / itemsPerPage) || 1;

    const sel = useTableSelection(groupedProducts);

    const bulkDelete = async (ids: string[]) => {
        await Promise.allSettled(ids.map(id => productService.delete(id)));
        toast.success(`${ids.length} product(s) deleted`);
        loadData();
    };

    const bulkStatus = async (ids: string[], status: 'ACTIVE' | 'INACTIVE') => {
        await Promise.allSettled(ids.map(id => productService.update(id, { status })));
        toast.success(`Marked ${ids.length} product(s) ${status === 'ACTIVE' ? 'Active' : 'Inactive'}`);
        loadData();
    };

    return (
        <div className="pb-20">
            <div className="max-w-[1100px] mx-auto px-0 sm:px-6 pt-1 sm:pt-5 text-left">

                <PageHeader
                    title="Live Products"
                    breadcrumbs={[{ label: 'Console', href: '/admin/dashboard' }, { label: 'Live Products' }]}
                    actions={
                        <>
                            <Button variant="outline" size="sm" onClick={loadData} disabled={syncing}>
                                <RefreshCw size={14} className={syncing ? 'animate-spin' : ''} /> Refresh
                            </Button>
                            <Button variant="primary" size="sm" onClick={() => router.push('/admin/products/add')}>
                                <Plus size={14} /> Add Listing
                            </Button>
                        </>
                    }
                />

                {/* Filters */}
                <TableShell
                    className="mb-6"
                    filters={
                    <div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-center">
                    <div className="relative flex-1 min-w-0 sm:min-w-[250px]">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[#9C9C98]" />
                        <input
                            value={search}
                            onChange={e => { setSearch(e.target.value); setCurrentPage(1); }}
                            placeholder="Search by name, code or supplier..."
                            className={`${ui.inputBase} pl-10`}
                        />
                    </div>
                    <div className="grid grid-cols-2 sm:flex gap-2 w-full sm:w-auto">
                        <select value={category} onChange={e => { setCategory(e.target.value); setCurrentPage(1); }} className={`${ui.inputBase} px-2 sm:px-3 cursor-pointer sm:w-auto`}>
                            <option value="">All Categories</option>
                            {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                        </select>
                        <select value={supplier} onChange={e => { setSupplier(e.target.value); setCurrentPage(1); }} className={`${ui.inputBase} px-2 sm:px-3 cursor-pointer sm:w-auto`}>
                            <option value="">All Suppliers</option>
                            {suppliers.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                        </select>
                    </div>
                    </div>
                    }
                    footer={
                        <Pagination
                            page={currentPage}
                            totalPages={totalPages}
                            onPage={setCurrentPage}
                            total={totalCount}
                            pageSize={itemsPerPage}
                            onPageSize={changePageSize}
                        />
                    }
                >
                    <div className="overflow-x-auto">
                        <table className={ui.table}>
                            <thead>
                                <tr>
                                    <SelectAllTh sel={sel} />
                                    <th className={ui.th}>Product</th>
                                    <th className={ui.th + ' text-right'}>Cost Price</th>
                                    <th className={ui.th + ' text-right'}>Sale Price</th>
                                    <th className={ui.th + ' text-right'}>Net Profit</th>
                                    <th className={ui.th + ' text-center'}>Status</th>
                                    <th className={ui.th + ' text-right'}>Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                                {loading && products.length === 0 ? (
                                    <tr><td colSpan={7} className="py-20 text-center text-[13px] text-[#8A8A86]">Loading...</td></tr>
                                ) : products.length === 0 ? (
                                    <tr><td colSpan={7} className="py-20 text-center text-[13px] text-[#8A8A86]">No products found.</td></tr>
                                ) : (
                                    groupedProducts.map(prod => {
                                        return (
                                            <tr key={prod.id} className="hover:bg-[#FAFAF8] transition-colors group">
                                                <RowCheckboxTd sel={sel} id={prod.id} />
                                                <td className={ui.td}>
                                                    <div className="flex items-center gap-2 sm:gap-4">
                                                        <div className="w-9 h-9 sm:w-12 sm:h-12 bg-white border border-[#EDEDEA] rounded-lg flex-shrink-0 flex items-center justify-center p-1 overflow-hidden">
                                                            {(() => {
                                                                const finalImg = prod.image || prod.catalog_image;
                                                                return finalImg ? (
                                                                    <img src={getImageUrl(finalImg)} alt="" className="w-full h-full object-contain" />
                                                                ) : (
                                                                    <Package className="h-6 w-6 text-[#DCDCD8]" />
                                                                );
                                                            })()}
                                                        </div>
                                                        <div>
                                                            <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                                                                <div className="flex flex-wrap items-center gap-x-1.5 gap-y-0.5">
                                                                    <div className="text-[13px] font-semibold text-[#119AB8] hover:text-[#0E7F98] cursor-pointer hover:underline" onClick={() => router.push(`/admin/products/edit/${prod.id}`)}>
                                                                        {prod.product_name.replace(/\s*\(.*?\)\s*$/, '')}
                                                                    </div>
                                                                    {(prod.weight || prod.size) && (
                                                                        <span className="text-[10.5px] text-[#1A1A1A] font-semibold uppercase tracking-tight shrink-0">
                                                                            â€” {prod.weight}{prod.weight && prod.size ? ' â€¢ ' : ''}{prod.size}
                                                                        </span>
                                                                    )}
                                                                </div>
                                                                {prod.badge && <Badge tone="indigo">{prod.badge}</Badge>}
                                                            </div>
                                                            <div className="text-[11.5px] text-[#8A8A86] mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-0.5">
                                                                <span className="flex items-center gap-1"><Truck size={12} className="opacity-40" /> {prod.supplier_name}</span>
                                                                <span className="opacity-20 hidden sm:inline">|</span>
                                                                <span className="flex items-center gap-1"><MapPin size={11} className="opacity-40" /> {prod.warehouse_name}</span>
                                                            </div>
                                                        </div>
                                                    </div>
                                                </td>
                                                <td className={ui.td + ' text-right'}>
                                                    <div className="text-[13px] sm:text-[13px] font-semibold text-[#3A3A38] tabular-nums">{formatCurrency(prod.cost_price)}</div>
                                                </td>
                                                <td className={ui.td + ' text-right'}>
                                                    <div className="text-[13px] sm:text-[15px] font-semibold text-[#1A1A1A] tabular-nums">{formatCurrency(prod.selling_price)}</div>
                                                </td>
                                                <td className={ui.td + ' text-right'}>
                                                    {(() => {
                                                        const np = Number(prod.selling_price || 0) - Number(prod.cost_price || 0);
                                                        return (
                                                            <>
                                                                <div className={`text-[13px] sm:text-[13px] font-semibold tabular-nums ${np >= 0 ? 'text-emerald-700' : 'text-rose-600'}`}>{formatCurrency(np)}</div>
                                                                <div className="flex items-center justify-end gap-1 mt-0.5">
                                                                    <TrendingUp className="h-3 w-3 text-emerald-600 shrink-0" />
                                                                    <span className="text-[10.5px] font-semibold text-emerald-700 leading-none tabular-nums">{Number(prod.profit_margin).toFixed(1)}%</span>
                                                                </div>
                                                            </>
                                                        );
                                                    })()}
                                                </td>
                                                <td className={ui.td + ' text-center'}>
                                                    <span className={`inline-flex items-center justify-center rounded-full text-[10.5px] font-semibold uppercase border ${
                                                        prod.status === 'ACTIVE'
                                                            ? 'bg-emerald-50 text-emerald-700 border-emerald-100 px-2 py-0.5'
                                                            : 'bg-[#F2F2F0] text-[#9C9C98] border-[#EDEDEA] px-2 py-0.5'
                                                    } max-sm:w-2.5 max-sm:h-2.5 max-sm:rounded-full max-sm:p-0 max-sm:border-0 ${
                                                        prod.status === 'ACTIVE' ? 'max-sm:bg-emerald-500' : 'max-sm:bg-slate-400'
                                                    }`} title={prod.status === 'ACTIVE' ? 'Visible' : 'Hidden'}>
                                                        <span className="max-sm:hidden">{prod.status === 'ACTIVE' ? 'Visible' : 'Hidden'}</span>
                                                    </span>
                                                </td>
                                                <td className={ui.td + ' text-right'}>
                                                    <RowActions items={[
                                                        { label: 'Edit', onClick: () => router.push(`/admin/products/edit/${prod.id}`) },
                                                        { label: 'Delete', onClick: () => setDeleteProd(prod), danger: true },
                                                    ]} />
                                                </td>
                                            </tr>
                                        );
                                    })
                                )}
                            </tbody>
                        </table>
                    </div>

                </TableShell>
            </div>

            <BulkBar
                sel={sel}
                entity="products"
                onDelete={bulkDelete}
                statusActions={[
                    { label: 'Mark Active', apply: (ids) => bulkStatus(ids, 'ACTIVE') },
                    { label: 'Mark Inactive', apply: (ids) => bulkStatus(ids, 'INACTIVE') },
                ]}
                onExport={() => exportToCSV(
                    sel.selectedItems.map((p: any) => ({
                        name: p.product_name || '',
                        sku: p.sku || '',
                        selling_price: p.selling_price ?? '',
                        profit_margin: p.profit_margin ?? '',
                        status: p.status || '',
                        supplier: p.supplier_name || '',
                        warehouse: p.warehouse_name || '',
                        quantity: p.current_units ?? p.total_quantity ?? 0,
                    })),
                    'products.csv',
                )}
            />

            {/* Delete Modal */}
            <Modal open={!!deleteProd} onClose={() => setDeleteProd(null)} size="sm">
                <div className="text-center">
                    <div className="w-12 h-12 bg-rose-50 rounded-full flex items-center justify-center mx-auto mb-4 border border-rose-100">
                        <AlertTriangle size={24} className="text-rose-600" />
                    </div>
                    <h3 className="text-[17px] font-semibold text-[#1A1A1A] tracking-tight mb-2">Delete Product?</h3>
                    <p className="text-[13px] text-[#3A3A38]">
                        Delete <span className="font-semibold text-[#1A1A1A]">"{deleteProd?.product_name}"</span>?
                    </p>
                    <div className="mt-6 space-y-2">
                        <Button variant="danger" onClick={handleDelete} disabled={deleting} className="w-full">
                            {deleting ? 'Deleting...' : 'Confirm Delete'}
                        </Button>
                        <button onClick={() => setDeleteProd(null)} className="w-full text-[13px] text-[#119AB8] hover:text-[#0E7F98] hover:underline">
                            Cancel
                        </button>
                    </div>
                </div>
            </Modal>
        </div>
    );
}
