"use client";

import React, { useEffect, useState } from 'react';
import {
    Search, Plus, Trash2, Edit2, Eye,
    AlertTriangle, RefreshCw, X, CheckCircle, Package
} from 'lucide-react';
import { useSearchParams } from 'next/navigation';
import { inventoryService, productService } from '@/lib/api';
import { formatCurrency } from '@/lib/utils'; // if needed

const StatusPill = ({ status }: { status: string }) => {
    // Inventory statuses based on reorder level
    let bg = 'bg-slate-100 text-slate-600 border-slate-200';
    let text = status;

    if (status === 'Pending') {
        bg = 'bg-amber-50 text-amber-700 border-amber-200';
    } else if (status === 'Low Stock') {
        bg = 'bg-red-50 text-red-600 border-red-200';
    } else if (status === 'In Stock') {
        bg = 'bg-emerald-50 text-emerald-700 border-emerald-200';
    }

    return (
        <span className={`inline-block px-2 py-0.5 rounded border text-[11px] font-semibold capitalize ${bg}`}>
            {text}
        </span>
    );
};

export default function InventoryListPage() {
    const searchParams = useSearchParams();
    const warehouseId = searchParams.get('warehouse') || '';

    const [view, setView] = useState<'list' | 'form'>('list');
    const [inventory, setInventory] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');
    const [selectedWarehouse, setSelectedWarehouse] = useState(warehouseId);
    const [warehouses, setWarehouses] = useState<any[]>([]);

    const [viewRow, setViewRow] = useState<any | null>(null);
    const [editRow, setEditRow] = useState<any | null>(null);
    const [deleteRow, setDeleteRow] = useState<any | null>(null);
    
    const [allProducts, setAllProducts] = useState<any[]>([]);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [isEditing, setIsEditing] = useState(false);
    const [editingId, setEditingId] = useState<string|number|null>(null);

    const [form, setForm] = useState({
        product: '', warehouse: '', sku: '', barcode: '',
        quantity_available: 0, reorder_level: 0, batch_number: '',
    });

    const loadData = async () => {
        setLoading(true);
        try {
            const [invData, whData, prodData] = await Promise.all([
                inventoryService.getInventory(),
                inventoryService.getWarehouses(),
                productService.getAll({ all_items: 'true' } as any)
            ]);
            
            const defaultWarehouse = whData.find((w: any) => w.is_default) || whData[0];
            let finalInventory: any[] = [];

            if (selectedWarehouse) {
                finalInventory = prodData.map((prod: any) => {
                    const record = invData.find((inv: any) => 
                        String(inv.product) === String(prod.id) && 
                        String(inv.warehouse) === String(selectedWarehouse)
                    );
                    if (record) return { ...record, product_name: prod.name, sku: prod.sku, barcode: prod.barcode, product_image: prod.image || prod.image_url };
                    return {
                        id: `virtual-${prod.id}-${selectedWarehouse}`,
                        product: prod.id, product_name: prod.name, sku: prod.sku,
                        barcode: prod.barcode, product_image: prod.image || prod.image_url,
                        warehouse: selectedWarehouse,
                        warehouse_name: whData.find((w: any) => String(w.id) === String(selectedWarehouse))?.name,
                        quantity_available: 0, is_virtual: true
                    };
                });
            } else {
                const recordsWithInfo = invData.map((inv: any) => {
                    const prod = prodData.find((p: any) => String(p.id) === String(inv.product));
                    const wh = whData.find((w: any) => String(w.id) === String(inv.warehouse));
                    return {
                        ...inv,
                        product_name: prod?.name || inv.product_name,
                        sku: prod?.sku || inv.sku,
                        barcode: prod?.barcode || inv.barcode,
                        product_image: prod?.image || prod?.image_url || inv.product_image,
                        warehouse_name: wh?.name || inv.warehouse_name,
                        warehouse_type: wh?.warehouse_type || inv.warehouse_type
                    };
                });
                
                const missingProducts = prodData.filter((p: any) => !invData.some((inv: any) => String(inv.product) === String(p.id)));
                const virtualRecords = missingProducts.map((p: any) => ({
                    id: `virtual-${p.id}`, product: p.id, product_name: p.name,
                    sku: p.sku, barcode: p.barcode, product_image: p.image || p.image_url,
                    warehouse: defaultWarehouse?.id, warehouse_name: defaultWarehouse?.name || "Main Hub",
                    quantity_available: 0, is_virtual: true
                }));
                finalInventory = [...recordsWithInfo, ...virtualRecords];
            }

            setInventory(finalInventory.filter(item => item.product_name && !isNaN(Number(item.quantity_available))));
            setWarehouses(whData);
            setAllProducts(prodData);
        } catch (error) { console.error(error); } finally { setLoading(false); }
    };

    useEffect(() => { loadData(); }, []);

    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsSubmitting(true);
        try {
            const payload = {
                product: form.product, warehouse: form.warehouse,
                sku: form.sku, barcode: form.barcode,
                quantity_available: Number(form.quantity_available),
                reorder_level: Number(form.reorder_level),
                batch_number: form.batch_number || null,
            };
            if (isEditing && editingId) {
                await inventoryService.updateInventory(editingId, payload);
            } else {
                await inventoryService.createInventory(payload);
            }
            setView('list');
            loadData();
        } catch {
            alert("Error saving record");
        } finally { setIsSubmitting(false); }
    };

    const confirmDelete = async () => {
        if (!deleteRow) return;
        setIsSubmitting(true);
        try {
            await inventoryService.deleteInventory(deleteRow.id);
            setDeleteRow(null);
            loadData();
        } catch { alert("Error deleting record"); } finally { setIsSubmitting(false); setDeleteRow(null); }
    };

    const handleEditClick = (item: any) => {
        setForm({
            product: String(item.product), warehouse: String(item.warehouse),
            sku: item.sku || '', barcode: item.barcode || '',
            quantity_available: item.quantity_available,
            reorder_level: item.reorder_level || 0, batch_number: item.batch_number || '',
        });
        setIsEditing(true); setEditingId(item.is_virtual ? null : item.id); setView('form');
    };

    const handleAddClick = () => {
        setForm({
            product: '', warehouse: selectedWarehouse || '', sku: '', barcode: '',
            quantity_available: 0, reorder_level: 0, batch_number: '',
        });
        setIsEditing(false); setEditingId(null); setView('form');
    };

    const filtered = inventory.filter(item => {
        const matchesSearch = 
            (item.product_name?.toLowerCase().includes(search.toLowerCase())) ||
            (item.sku?.toLowerCase().includes(search.toLowerCase()));
        const matchesWarehouse = !selectedWarehouse || String(item.warehouse) === String(selectedWarehouse);
        return matchesSearch && matchesWarehouse;
    });

    if (view === 'form') {
        return (
            <div className="max-w-[1400px] mx-auto pb-20 px-4 mt-4 font-sans">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-5 pb-4 border-b border-slate-200 dark:border-white/10">
                    <div>
                        <h1 className="text-xl font-bold text-slate-900 dark:text-white">
                            {isEditing ? 'Edit Stock Record' : 'New Stock Record'}
                        </h1>
                        <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">Manage inbound procurement records</p>
                    </div>
                </div>

                <form onSubmit={handleSave} className="bg-white dark:bg-[#1B1C1E] border border-slate-200 dark:border-white/10 rounded-xl overflow-hidden shadow-sm max-w-4xl">
                    <div className="p-5 space-y-4">
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1.5">Product</label>
                                <select required className="px-3 py-2 text-sm bg-white border border-slate-200 rounded-lg outline-none focus:border-[#F7CA00] text-slate-700 cursor-pointer w-full" value={form.product} onChange={(e) => setForm({ ...form, product: e.target.value })}>
                                    <option value="">Select Product...</option>
                                    {allProducts.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                                </select>
                            </div>
                            <div>
                                <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1.5">Warehouse</label>
                                <select required className="px-3 py-2 text-sm bg-white border border-slate-200 rounded-lg outline-none focus:border-[#F7CA00] text-slate-700 cursor-pointer w-full" value={form.warehouse} onChange={(e) => setForm({ ...form, warehouse: e.target.value })}>
                                    <option value="">Select Warehouse...</option>
                                    {warehouses.filter(w => w.status?.toLowerCase() !== 'inactive').map(wh => <option key={wh.id} value={wh.id}>{wh.name}</option>)}
                                </select>
                            </div>
                            <div>
                                <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1.5">SKU</label>
                                <input className="w-full px-3 py-2 text-sm bg-white border border-slate-200 rounded-lg outline-none focus:border-[#F7CA00] focus:ring-2 focus:ring-[#F7CA00]/10 transition-all placeholder:text-slate-400" placeholder="System Assigned" value={form.sku} onChange={(e) => setForm({ ...form, sku: e.target.value })} />
                            </div>
                            <div>
                                <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1.5">Batch Identifier</label>
                                <input className="w-full px-3 py-2 text-sm bg-white border border-slate-200 rounded-lg outline-none focus:border-[#F7CA00] focus:ring-2 focus:ring-[#F7CA00]/10 transition-all placeholder:text-slate-400" placeholder="e.g. LOT-01" value={form.batch_number} onChange={(e) => setForm({ ...form, batch_number: e.target.value })} />
                            </div>
                            <div>
                                <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1.5">Available Quantity</label>
                                <input type="number" required min="0" className="w-full px-3 py-2 text-sm bg-white border border-slate-200 rounded-lg outline-none focus:border-[#F7CA00] focus:ring-2 focus:ring-[#F7CA00]/10 transition-all placeholder:text-slate-400" value={form.quantity_available} onChange={(e) => setForm({ ...form, quantity_available: Number(e.target.value) })} />
                            </div>
                            <div>
                                <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1.5">Reorder Level</label>
                                <input type="number" min="0" className="w-full px-3 py-2 text-sm bg-white border border-slate-200 rounded-lg outline-none focus:border-[#F7CA00] focus:ring-2 focus:ring-[#F7CA00]/10 transition-all placeholder:text-slate-400" value={form.reorder_level} onChange={(e) => setForm({ ...form, reorder_level: Number(e.target.value) })} />
                            </div>
                        </div>
                    </div>
                    
                    <div className="px-5 py-3 bg-slate-50 dark:bg-white/5 border-t border-slate-100 dark:border-white/10 flex justify-end gap-3">
                        <button type="button" onClick={() => setView('list')} className="px-4 py-2 text-sm font-medium text-slate-600 dark:text-slate-300 bg-white dark:bg-white/10 border border-slate-200 dark:border-white/10 rounded-lg hover:bg-slate-50 transition-colors">
                            Cancel
                        </button>
                        <button type="submit" disabled={isSubmitting} className="flex items-center gap-2 px-4 py-2 bg-[#F7CA00] text-white rounded-lg text-sm font-semibold hover:bg-blue-700 transition-colors shadow-sm disabled:opacity-50">
                            {isSubmitting ? 'Saving...' : 'Save'}
                        </button>
                    </div>
                </form>
            </div>
        );
    }

    return (
        <div className="max-w-[1400px] mx-auto pb-20 px-4 mt-4 font-sans">
            
            {/* ── Page Header ── */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-5 pb-4 border-b border-slate-200 dark:border-white/10">
                <div>
                    <h1 className="text-xl font-bold text-slate-900 dark:text-white">Stock Management</h1>
                    <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">Manage inbound procurement records</p>
                </div>
                <div className="flex items-center gap-2">
                    <button
                        onClick={loadData}
                        className="p-2 rounded-lg border border-slate-200 dark:border-white/10 bg-white dark:bg-white/5 text-slate-500 hover:text-[#F7CA00] hover:border-[#F7CA00]/40 transition-all"
                        title="Refresh"
                    >
                        <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
                    </button>
                    <button
                        onClick={handleAddClick}
                        className="flex items-center gap-2 px-4 py-2 bg-[#F7CA00] text-white text-sm font-semibold rounded-lg hover:bg-blue-700 transition-colors shadow-sm"
                    >
                        <Plus className="h-4 w-4" />
                        New Stock Entry
                    </button>
                </div>
            </div>

            {/* ── Filters Bar ── */}
            <div className="flex flex-col sm:flex-row gap-2 mb-4">
                <div className="relative flex-1 max-w-sm">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                    <input
                        value={search}
                        onChange={e => setSearch(e.target.value)}
                        placeholder="Search by SKU or product..."
                        className="w-full pl-9 pr-4 py-2 text-sm bg-white dark:bg-[#1B1C1E] border border-slate-200 dark:border-white/10 rounded-lg outline-none focus:border-[#F7CA00] focus:ring-2 focus:ring-[#F7CA00]/10 transition-all placeholder:text-slate-400"
                    />
                </div>
                <select
                    value={selectedWarehouse}
                    onChange={e => setSelectedWarehouse(e.target.value)}
                    className="px-3 py-2 text-sm bg-white dark:bg-[#1B1C1E] border border-slate-200 dark:border-white/10 rounded-lg outline-none focus:border-[#F7CA00] text-slate-700 dark:text-slate-300 cursor-pointer"
                >
                    <option value="">All Warehouses</option>
                    {warehouses.filter(w => w.status?.toLowerCase() !== 'inactive').map(wh => <option key={wh.id} value={wh.id}>{wh.name}</option>)}
                </select>
            </div>

            {/* ── Results count ── */}
            <p className="text-xs text-slate-500 dark:text-slate-400 mb-3">
                {loading ? 'Loading...' : `${filtered.length} result${filtered.length !== 1 ? 's' : ''}`}
            </p>

            {/* ── Table ── */}
            <div className="bg-white dark:bg-[#1B1C1E] border border-slate-200 dark:border-white/10 rounded-xl overflow-hidden shadow-sm">
                <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                        <thead>
                            <tr className="bg-slate-50 dark:bg-white/5 border-b border-slate-200 dark:border-white/10 text-left">
                                <th className="px-4 py-3 text-xs font-semibold text-slate-500 dark:text-slate-400 whitespace-nowrap">SKU No</th>
                                <th className="px-4 py-3 text-xs font-semibold text-slate-500 dark:text-slate-400 whitespace-nowrap">Product</th>
                                <th className="px-4 py-3 text-xs font-semibold text-slate-500 dark:text-slate-400 whitespace-nowrap">Warehouse</th>
                                <th className="px-4 py-3 text-xs font-semibold text-slate-500 dark:text-slate-400 text-right whitespace-nowrap">Qty</th>
                                <th className="px-4 py-3 text-xs font-semibold text-slate-500 dark:text-slate-400 whitespace-nowrap">Status</th>
                                <th className="px-4 py-3 text-xs font-semibold text-slate-500 dark:text-slate-400 text-right whitespace-nowrap">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 dark:divide-white/5">
                            {loading && filtered.length === 0 ? (
                                Array(6).fill(0).map((_, i) => (
                                    <tr key={i} className="animate-pulse">
                                        <td colSpan={6} className="px-4 py-4">
                                            <div className="h-4 bg-slate-100 dark:bg-white/5 rounded w-full" />
                                        </td>
                                    </tr>
                                ))
                            ) : filtered.length === 0 ? (
                                <tr>
                                    <td colSpan={6} className="px-4 py-16 text-center">
                                        <Package className="h-10 w-10 text-slate-200 dark:text-white/10 mx-auto mb-3" />
                                        <p className="text-sm text-slate-500 dark:text-slate-400 mb-3">No stock records found.</p>
                                        <button
                                            onClick={handleAddClick}
                                            className="text-sm text-[#F7CA00] hover:underline font-medium"
                                        >
                                            Create your first stock entry
                                        </button>
                                    </td>
                                </tr>
                            ) : (
                                filtered.map((item) => {
                                    const qtyStatus = item.is_virtual ? 'Pending' : (Number(item.quantity_available) <= Number(item.reorder_level || 0) ? 'Low Stock' : 'In Stock');
                                    
                                    return (
                                        <tr key={item.id} className="hover:bg-slate-50/60 dark:hover:bg-white/[0.02] transition-colors group">
                                            <td className="px-4 py-3">
                                                <span className="text-[#F7CA00] font-medium text-sm">#{item.sku || 'N/A'}</span>
                                            </td>
                                            <td className="px-4 py-3 max-w-[180px]">
                                                <span className="text-slate-800 dark:text-slate-200 font-medium text-sm truncate block" title={item.product_name}>
                                                    {item.product_name || '—'}
                                                </span>
                                            </td>
                                            <td className="px-4 py-3">
                                                <span className="text-slate-500 dark:text-slate-400 text-sm">{item.warehouse_name || '—'}</span>
                                            </td>
                                            <td className="px-4 py-3 text-right">
                                                <span className="text-slate-800 dark:text-slate-200 font-semibold text-sm">
                                                    {Number(item.quantity_available).toLocaleString()}
                                                </span>
                                            </td>
                                            <td className="px-4 py-3">
                                                <StatusPill status={qtyStatus} />
                                            </td>
                                            <td className="px-4 py-3">
                                                <div className="flex justify-end items-center gap-1">
                                                    <button
                                                        onClick={() => setViewRow(item)}
                                                        className="p-1.5 rounded-md text-slate-400 hover:text-[#F7CA00] hover:bg-blue-50 dark:hover:bg-[#F7CA00]/10 transition-colors"
                                                        title="View details"
                                                    >
                                                        <Eye className="h-4 w-4" />
                                                    </button>
                                                    <button
                                                        onClick={() => handleEditClick(item)}
                                                        className="p-1.5 rounded-md text-slate-400 hover:text-amber-600 hover:bg-amber-50 dark:hover:bg-amber-500/10 transition-colors"
                                                        title="Edit"
                                                    >
                                                        <Edit2 className="h-4 w-4" />
                                                    </button>
                                                    <button
                                                        onClick={() => setDeleteRow(item)}
                                                        className="p-1.5 rounded-md text-slate-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-500/10 transition-colors"
                                                        title="Delete"
                                                    >
                                                        <Trash2 className="h-4 w-4" />
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    );
                                })
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* ── View Modal ── */}
            {viewRow && (
                <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/30 backdrop-blur-sm p-4 animate-in fade-in duration-200">
                    <div className="bg-white dark:bg-[#1B1C1E] rounded-xl border border-slate-200 dark:border-white/10 w-full max-w-md shadow-xl overflow-hidden animate-in zoom-in-95 duration-200">
                        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100 dark:border-white/10">
                            <div>
                                <h3 className="text-base font-bold text-slate-900 dark:text-white">Stock #{viewRow.sku || 'N/A'}</h3>
                                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">Stock details</p>
                            </div>
                            <button onClick={() => setViewRow(null)} className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 dark:hover:bg-white/10 transition-colors">
                                <X className="h-4 w-4" />
                            </button>
                        </div>
                        <div className="p-5 space-y-4">
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <p className="text-xs text-slate-500 dark:text-slate-400 mb-1">Product</p>
                                    <p className="text-sm font-semibold text-slate-800 dark:text-slate-200">{viewRow.product_name || '—'}</p>
                                </div>
                                <div>
                                    <p className="text-xs text-slate-500 dark:text-slate-400 mb-1">Warehouse</p>
                                    <p className="text-sm font-semibold text-slate-800 dark:text-slate-200">{viewRow.warehouse_name || '—'}</p>
                                </div>
                                <div>
                                    <p className="text-xs text-slate-500 dark:text-slate-400 mb-1">Stock Status</p>
                                    <StatusPill status={viewRow.is_virtual ? 'Pending' : (Number(viewRow.quantity_available) <= Number(viewRow.reorder_level || 0) ? 'Low Stock' : 'In Stock')} />
                                </div>
                                <div>
                                    <p className="text-xs text-slate-500 dark:text-slate-400 mb-1">Batch Number</p>
                                    <p className="text-sm font-semibold text-slate-800 dark:text-slate-200">{viewRow.batch_number || 'Default'}</p>
                                </div>
                            </div>
                            <div className="pt-3 border-t border-slate-100 dark:border-white/10">
                                <p className="text-xs text-slate-500 dark:text-slate-400 mb-1">Total Quantity</p>
                                <p className="text-2xl font-bold text-[#F7CA00]">{Number(viewRow.quantity_available).toLocaleString()}</p>
                            </div>
                        </div>
                        <div className="px-5 py-3 bg-slate-50 dark:bg-white/5 border-t border-slate-100 dark:border-white/10 flex justify-end">
                            <button onClick={() => setViewRow(null)} className="px-4 py-2 text-sm font-medium text-slate-600 dark:text-slate-300 bg-white dark:bg-white/10 border border-slate-200 dark:border-white/10 rounded-lg hover:bg-slate-50 transition-colors">
                                Close
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* ── Delete Modal ── */}
            {deleteRow && (
                <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/30 backdrop-blur-sm p-4 animate-in fade-in duration-200">
                    <div className="bg-white dark:bg-[#1B1C1E] rounded-xl border border-slate-200 dark:border-white/10 w-full max-w-sm shadow-xl overflow-hidden animate-in zoom-in-95 duration-200">
                        <div className="p-5 text-center">
                            <div className="w-10 h-10 rounded-full bg-red-50 dark:bg-red-500/10 flex items-center justify-center mx-auto mb-3">
                                <AlertTriangle className="h-5 w-5 text-red-600" />
                            </div>
                            <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-2">Delete Record</h3>
                            <p className="text-sm text-slate-500 dark:text-slate-400 mb-5">
                                Are you sure? This will remove the stock record <br/><strong className="text-slate-700 dark:text-slate-300">#{deleteRow.sku}</strong>.
                            </p>
                            <div className="flex justify-end gap-2">
                                <button
                                    onClick={() => setDeleteRow(null)}
                                    disabled={isSubmitting}
                                    className="px-4 py-2 text-sm font-medium text-slate-600 border border-slate-200 dark:border-white/10 rounded-lg hover:bg-slate-50 transition-colors"
                                >
                                    Cancel
                                </button>
                                <button
                                    onClick={confirmDelete}
                                    disabled={isSubmitting}
                                    className="flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded-lg text-sm font-semibold hover:bg-red-700 transition-colors shadow-sm disabled:opacity-50"
                                >
                                    {isSubmitting ? <RefreshCw className="h-4 w-4 animate-spin" /> : 'Delete'}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

        </div>
    );
}
