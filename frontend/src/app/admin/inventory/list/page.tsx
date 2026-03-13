"use client";

import React, { useEffect, useState } from 'react';
import { 
    Search, Filter, Plus, FileText, ChevronDown, 
    MoreHorizontal, Download, Trash2, Edit, Warehouse,
    Package, AlertTriangle, CheckCircle2, History, Layers, X, Info, ChevronLeft,
    RefreshCw, Boxes, AlertCircle, TrendingUp
} from 'lucide-react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { inventoryService, productService } from '@/lib/api';
import toast from 'react-hot-toast';

export default function InventoryListPage() {
    const searchParams = useSearchParams();
    const warehouseId = searchParams.get('warehouse') || '';
    
    const [view, setView] = useState<'list' | 'add'>('list');
    const [inventory, setInventory] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedWarehouse, setSelectedWarehouse] = useState(warehouseId);
    const [warehouses, setWarehouses] = useState<any[]>([]);

    const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
    const [selectedItem, setSelectedItem] = useState<any>(null);
    const [allProducts, setAllProducts] = useState<any[]>([]);
    const [isSubmitting, setIsSubmitting] = useState(false);

    const SECONDARY_COLOR = "#E68A00";

    const [addFormData, setAddFormData] = useState({
        product: '',
        warehouse: '',
        sku: '',
        barcode: '',
        quantity_available: 0,
        reorder_level: 0,
        batch_number: '',
    });

    const purgeLocalInventory = () => {
        if (confirm("Are you sure you want to clear all local/temp stock entries? Sync'd server data will remain.")) {
            localStorage.removeItem('qavi_inventory');
            toast.success("Local session purged");
            loadData();
        }
    };

    useEffect(() => {
        loadData();
    }, []);

    const loadData = async () => {
        setLoading(true);
        try {
            const [invData, whData, prodData] = await Promise.all([
                inventoryService.getInventory(),
                inventoryService.getWarehouses(),
                productService.getAll({ all_items: 'true' } as any)
            ]);
            // Enrich records if names are missing
            const enrichedInventory = invData.map((item: any) => {
                if (!item.product_name || item.product_name === "Product Record") {
                    const prod = prodData.find((p: any) => String(p.id) === String(item.product));
                    item.product_name = prod?.name || item.product_name || "Product Record";
                }
                if (!item.warehouse_name || item.warehouse_name === "Main Node") {
                    const wh = whData.find((w: any) => String(w.id) === String(item.warehouse));
                    item.warehouse_name = wh?.name || item.warehouse_name || "Main Node";
                    item.warehouse_type = wh?.warehouse_type || item.warehouse_type;
                }
                return item;
            });

            // Clean and Filter invalid/stale records
            const cleanedInventory = enrichedInventory.filter((item: any) => {
                const isPlaceholder = item.product_name === "Local Product (Pending Sync)" || item.product_name === "Product Record";
                const isBroken = isNaN(Number(item.quantity_available));
                // Only keep records that are not broken
                return !isBroken;
            });

            setInventory(cleanedInventory);
            setWarehouses(whData);
            setAllProducts(prodData);
        } catch (error) {
            console.error("Failed to load inventory", error);
            toast.error("Resource error: Failed to map stock units");
        } finally {
            setLoading(false);
        }
    };

    const handleDelete = async () => {
        if (!selectedItem) return;
        setIsSubmitting(true);
        try {
            await inventoryService.deleteInventory(selectedItem.id);
            toast.success("Inventory record removed");
            setIsDeleteModalOpen(false);
            loadData();
        } catch (error) {
            toast.error("Failed to delete record");
            console.error("Delete failed", error);
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleCreateInventory = async (e: React.FormEvent) => {
        e.preventDefault();
        
        // Basic Validation
        if (!addFormData.product || !addFormData.warehouse) {
            toast.error("Please select both product and warehouse");
            return;
        }

        setIsSubmitting(true);
        try {
            // Sanitize payload: DRF unique constraints often treat "" as a value, 
            // so we convert empty strings to null for optional fields.
            // Find names for local display (especially for internal storage)
            const prodObj = allProducts.find(p => String(p.id) === String(addFormData.product));
            const whObj = warehouses.find(w => String(w.id) === String(addFormData.warehouse));

            const payload = {
                ...addFormData,
                product_name: prodObj?.name,
                warehouse_name: whObj?.name,
                sku: addFormData.sku.trim() || null,
                barcode: addFormData.barcode.trim() || null,
                batch_number: addFormData.batch_number.trim() || null,
                // Ensure numbers are indeed numbers (DecimalField in backend)
                quantity_available: Number(addFormData.quantity_available),
                reorder_level: Number(addFormData.reorder_level),
            };

            await inventoryService.createInventory(payload);
            toast.success("New inventory record created");
            setView('list');
            setAddFormData({
                product: '',
                warehouse: '',
                sku: '',
                barcode: '',
                quantity_available: 0,
                reorder_level: 0,
                batch_number: '',
            });
            loadData();
        } catch (error: any) {
            const errorData = error.response?.data;
            console.error("Inventory Creation Detailed Error:", errorData || error);
            
            if (errorData) {
                // Check for unique constraint specifically
                const isUniqueError = JSON.stringify(errorData).toLowerCase().includes("unique");
                if (isUniqueError) {
                    toast.error("Record already exists for this product/batch at this warehouse.");
                    return;
                }

                // Try to find any specific field error (e.g. "product: This field is required")
                const firstField = Object.keys(errorData)[0];
                if (firstField && firstField !== 'detail') {
                    const firstErr = Array.isArray(errorData[firstField]) ? errorData[firstField][0] : errorData[firstField];
                    toast.error(`${firstField}: ${firstErr}`);
                    return;
                }

                if (errorData.detail) {
                    toast.error(errorData.detail);
                    return;
                }
            }
            
            toast.error("Failed to create inventory record context");
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleAddClick = () => {
        setAddFormData(p => ({
            ...p,
            warehouse: selectedWarehouse || ''
        }));
        setView('add');
    };

    const filtered = inventory.filter(item => {
        const matchesSearch = 
            (item.product_name?.toLowerCase().includes(searchTerm.toLowerCase())) ||
            (item.sku?.toLowerCase().includes(searchTerm.toLowerCase())) ||
            (item.barcode?.toLowerCase().includes(searchTerm.toLowerCase())) ||
            (item.batch_number?.toLowerCase().includes(searchTerm.toLowerCase()));
        
        const matchesWarehouse = !selectedWarehouse || String(item.warehouse) === String(selectedWarehouse);
        
        return matchesSearch && matchesWarehouse;
    });

    if (view === 'add') {
        return (
            <div className="max-w-[900px] mx-auto pb-12 font-sans px-4 mt-6 animate-in fade-in duration-300">
                {/* Amazon-style Breadcrumb/Back link */}
                <div className="mb-6">
                    <button 
                        onClick={() => setView('list')}
                        className="flex items-center text-sm text-[#007185] dark:text-[#4caec2] hover:text-[#c45500] hover:underline gap-1 transition-colors font-bold uppercase tracking-tight"
                    >
                        <ChevronLeft className="w-4 h-4" />
                        <span>Back to core ledger</span>
                    </button>
                </div>

                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6 bg-white dark:bg-slate-900 p-6 border border-gray-200 dark:border-slate-800 rounded shadow-sm">
                    <div>
                        <h1 className="text-xl font-bold text-gray-900 dark:text-white tracking-tight flex items-center gap-2">
                            <Plus className="h-5 w-5 text-[#E68A00]" />
                            Add Inventory Entry
                        </h1>
                        <p className="text-[11px] text-gray-500 dark:text-slate-400 font-medium uppercase tracking-wider mt-1">Initialize a new stock record for a product in your network</p>
                    </div>
                </div>

                <div className="bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-800 rounded shadow-sm overflow-hidden">
                    <div className="p-6 border-b border-gray-100 dark:border-slate-800">
                        <div className="bg-[#f7fafa] dark:bg-slate-800/50 border border-[#d5dbdb] dark:border-slate-700 p-4 rounded flex gap-3 text-[#111] dark:text-gray-300 text-sm italic">
                            <Info className="w-5 h-5 text-[#007185] dark:text-blue-400 shrink-0" />
                            <p>This form creates a master record for a product at a specific location. If the product already exists in this warehouse, please use the <b>Adjustments</b> module instead.</p>
                        </div>
                    </div>

                    <form onSubmit={handleCreateInventory} className="p-8 space-y-6">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                            <div className="flex flex-col">
                                <label className="text-xs font-bold text-gray-900 dark:text-gray-200 uppercase tracking-wider mb-1">Select Product <span className="text-red-600">*</span></label>
                                <select 
                                    required
                                    className="w-full bg-white dark:bg-slate-800 border border-gray-300 dark:border-slate-700 rounded px-3 py-2 text-sm outline-none focus:border-[#e77600] focus:ring-1 focus:ring-[#e77600] transition-all shadow-sm text-gray-900 dark:text-white"
                                    value={addFormData.product}
                                    onChange={(e) => setAddFormData({...addFormData, product: e.target.value})}
                                >
                                    <option value="" className="bg-white dark:bg-slate-900">Select a product...</option>
                                    {allProducts.map(p => (
                                        <option key={p.id} value={p.id} className="bg-white dark:bg-slate-900">{p.name} (SKU: {p.sku || 'N/A'})</option>
                                    ))}
                                </select>
                            </div>
                            <div className="flex flex-col">
                                <label className="text-xs font-bold text-gray-900 dark:text-gray-200 uppercase tracking-wider mb-1">Warehouse / Location <span className="text-red-600">*</span></label>
                                <select 
                                    required
                                    className="w-full bg-white dark:bg-slate-800 border border-gray-300 dark:border-slate-700 rounded px-3 py-2 text-sm outline-none focus:border-[#e77600] focus:ring-1 focus:ring-[#e77600] transition-all shadow-sm text-gray-900 dark:text-white"
                                    value={addFormData.warehouse}
                                    onChange={(e) => setAddFormData({...addFormData, warehouse: e.target.value})}
                                >
                                    <option value="" className="bg-white dark:bg-slate-900">Select storage location...</option>
                                    {warehouses.map(wh => (
                                        <option key={wh.id} value={wh.id} className="bg-white dark:bg-slate-900">{wh.name}</option>
                                    ))}
                                </select>
                            </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 text-gray-900 dark:text-white">
                            <div className="flex flex-col">
                                <label className="text-xs font-bold uppercase tracking-wider mb-1">SKU (optional)</label>
                                <input 
                                    type="text" 
                                    placeholder="Leave blank for auto-assign"
                                    className="w-full bg-white dark:bg-slate-800 border border-gray-300 dark:border-slate-700 rounded px-3 py-2 text-sm outline-none focus:border-[#e77600] focus:ring-1 focus:ring-[#e77600] shadow-sm"
                                    value={addFormData.sku}
                                    onChange={(e) => setAddFormData({...addFormData, sku: e.target.value})}
                                />
                            </div>
                            <div className="flex flex-col">
                                <label className="text-xs font-bold uppercase tracking-wider mb-1">EAN / Barcode</label>
                                <input 
                                    type="text" 
                                    placeholder="Scan barcode..."
                                    className="w-full bg-white dark:bg-slate-800 border border-gray-300 dark:border-slate-700 rounded px-3 py-2 text-sm outline-none focus:border-[#e77600] focus:ring-1 focus:ring-[#e77600] shadow-sm"
                                    value={addFormData.barcode}
                                    onChange={(e) => setAddFormData({...addFormData, barcode: e.target.value})}
                                />
                            </div>
                            <div className="flex flex-col">
                                <label className="text-xs font-bold uppercase tracking-wider mb-1">Batch Number</label>
                                <input 
                                    type="text" 
                                    placeholder="LOT-Default"
                                    className="w-full bg-white dark:bg-slate-800 border border-gray-300 dark:border-slate-700 rounded px-3 py-2 text-sm outline-none focus:border-[#e77600] focus:ring-1 focus:ring-[#e77600] shadow-sm"
                                    value={addFormData.batch_number}
                                    onChange={(e) => setAddFormData({...addFormData, batch_number: e.target.value})}
                                />
                            </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-gray-900 dark:text-white">
                            <div className="flex flex-col text-gray-900 dark:text-white">
                                <label className="text-xs font-bold mb-1 text-[#c45500] uppercase tracking-wider">Opening Stock <span className="text-red-500">*</span></label>
                                <input 
                                    type="number" 
                                    required
                                    min="0"
                                    className="w-full bg-white dark:bg-slate-800 border border-gray-300 dark:border-slate-700 rounded px-3 py-2 text-sm outline-none focus:border-[#e77600] focus:ring-1 focus:ring-[#e77600] shadow-sm font-medium"
                                    value={addFormData.quantity_available}
                                    onChange={(e) => setAddFormData({...addFormData, quantity_available: Number(e.target.value)})}
                                />
                            </div>
                            <div className="flex flex-col">
                                <label className="text-xs font-bold uppercase tracking-wider mb-1">Reorder Threshold</label>
                                <input 
                                    type="number" 
                                    min="0"
                                    className="w-full bg-white dark:bg-slate-800 border border-gray-300 dark:border-slate-700 rounded px-3 py-2 text-sm outline-none focus:border-[#e77600] focus:ring-1 focus:ring-[#e77600] shadow-sm"
                                    value={addFormData.reorder_level}
                                    onChange={(e) => setAddFormData({...addFormData, reorder_level: Number(e.target.value)})}
                                />
                            </div>
                        </div>

                        <div className="flex items-center justify-end gap-3 p-6 bg-[#f7fafa] dark:bg-slate-800/80 -mx-8 -mb-8 mt-10 border-t border-gray-200 dark:border-slate-800">
                            <button 
                                type="button" 
                                onClick={() => setView('list')}
                                className="px-5 py-1.5 text-xs font-bold uppercase tracking-wider text-gray-500 hover:text-gray-900 dark:hover:text-white transition-colors"
                            >
                                Cancel
                            </button>
                            <button 
                                type="submit" 
                                disabled={isSubmitting}
                                style={{ backgroundColor: '#E68A00', borderColor: '#d67d00' }}
                                className="hover:opacity-90 disabled:bg-gray-200 disabled:text-gray-400 text-white px-8 py-1.5 rounded border shadow-sm text-xs font-bold uppercase tracking-wider transition-all flex items-center gap-2"
                            >
                                {isSubmitting ? (
                                    <div className="w-4 h-4 border-2 border-white/20 border-t-white rounded-full animate-spin"></div>
                                ) : "Save and continue"}
                            </button>
                        </div>
                    </form>
                </div>
            </div>
        );
    }

    return (
        <div className="max-w-[1400px] mx-auto pb-12 font-sans px-4 mt-6">

            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6 bg-white dark:bg-slate-900 p-6 border border-gray-200 dark:border-slate-800 rounded shadow-sm">
                <div>
                    <h1 className="text-xl font-bold text-gray-900 dark:text-white tracking-tight flex items-center gap-2">
                        <Boxes className="h-5 w-5 text-[#E68A00]" />
                        Inventory Ledger
                    </h1>
                    <p className="text-[11px] text-gray-500 dark:text-slate-400 font-medium uppercase tracking-wider mt-1">Central registry of stock keeping units across all physical nodes</p>
                </div>
                <div className="flex items-center gap-2">
                    <button onClick={loadData} className="p-2 border border-gray-200 dark:border-slate-800 rounded hover:bg-gray-50 dark:hover:bg-slate-800 text-gray-400 transition-colors">
                        <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
                    </button>
                    <button 
                        onClick={purgeLocalInventory}
                        title="Clear local test data"
                        className="p-2 border border-gray-200 dark:border-slate-800 rounded hover:bg-red-50 dark:hover:bg-red-900/20 text-gray-400 hover:text-red-500 transition-colors"
                    >
                        <Trash2 className="h-4 w-4" />
                    </button>
                    <button className="flex items-center gap-2 px-4 py-2 bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-800 rounded shadow-sm text-xs font-bold uppercase tracking-wider hover:bg-gray-50 dark:hover:bg-slate-700 transition-all">
                        <Download className="w-4 h-4" /> Export
                    </button>
                    <button 
                        onClick={handleAddClick}
                        style={{ backgroundColor: SECONDARY_COLOR }}
                        className="text-white px-6 py-2 rounded shadow-sm text-xs font-bold uppercase tracking-wider flex items-center gap-2 transition-all hover:opacity-90"
                    >
                        <Plus className="w-4 h-4" strokeWidth={3} /> Log New Stock
                    </button>
                </div>
            </div>

            {/* Metrics Bar */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
                <MetricBox label="Total Units" value={filtered.reduce((acc, curr) => acc + (Number(curr.quantity_available) || 0), 0)} icon={Boxes} />
                <MetricBox label="Active SKUs" value={filtered.length} icon={Package} color="text-indigo-600" />
                <MetricBox label="Low Stock" value={filtered.filter(i => Number(i.quantity_available) <= Number(i.reorder_level || 0)).length} icon={AlertCircle} color="text-red-500" />
                <MetricBox label="Locations" value={warehouses.length} icon={Warehouse} color="text-emerald-600" />
            </div>

            {/* Filters Bar */}
            <div className="bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-800 rounded-t p-4 flex flex-col md:flex-row gap-4 items-center">
                <div className="relative flex-1 w-full max-w-md">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" strokeWidth={2.5} />
                    <input 
                        type="text" 
                        placeholder="Search by SKU, Product Name, Barcode..."
                        className="w-full pl-10 pr-4 py-2 bg-gray-50 dark:bg-slate-800 border border-gray-100 dark:border-slate-700 rounded text-sm outline-none focus:bg-white dark:focus:bg-slate-900 focus:border-[#E68A00] dark:text-white transition-all shadow-sm"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                    />
                </div>
                <div className="relative w-full md:w-72">
                    <Warehouse className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" strokeWidth={2.5} />
                    <select 
                        className="w-full pl-10 pr-10 py-2 bg-gray-50 dark:bg-slate-800 border border-gray-100 dark:border-slate-700 rounded text-sm font-bold text-gray-700 dark:text-slate-200 outline-none focus:bg-white dark:focus:bg-slate-900 focus:border-[#E68A00] transition-all shadow-sm cursor-pointer appearance-none"
                        value={selectedWarehouse}
                        onChange={(e) => setSelectedWarehouse(e.target.value)}
                    >
                        <option value="" className="bg-white dark:bg-slate-900">All Storage Hubs</option>
                        {warehouses.map(wh => (
                            <option key={wh.id} value={wh.id} className="bg-white dark:bg-slate-900">{wh.name}</option>
                        ))}
                    </select>
                    <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 pointer-events-none" />
                </div>
            </div>

            {/* Main Table */}
            <div className="bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-800 rounded-b shadow-sm overflow-hidden min-h-[500px]">
                <div className="overflow-x-auto">
                    <table className="w-full text-left">
                        <thead>
                            <tr className="bg-gray-50/50 dark:bg-slate-800/50 border-b border-gray-100 dark:border-slate-800 text-[10px] font-black text-gray-400 dark:text-slate-500 uppercase tracking-widest">
                                <th className="px-6 py-4">Product Info</th>
                                <th className="px-6 py-4">Warehouse</th>
                                <th className="px-6 py-4 text-right">Inventory Counts</th>
                                <th className="px-6 py-4">Status & Batch</th>
                                <th className="px-6 py-4 text-right">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100 dark:divide-slate-800">
                            {loading ? (
                                Array(5).fill(0).map((_, i) => (
                                    <tr key={i} className="animate-pulse">
                                        <td colSpan={5} className="px-6 py-4 h-20 bg-gray-50/20 dark:bg-slate-800/20"></td>
                                    </tr>
                                ))
                            ) : filtered.length === 0 ? (
                                <tr>
                                    <td colSpan={5} className="px-10 py-24 text-center">
                                        <div className="w-16 h-16 bg-gray-50 dark:bg-slate-800 rounded-full flex items-center justify-center mx-auto mb-6 shadow-inner border border-gray-100 dark:border-slate-800">
                                            <Boxes className="w-8 h-8 text-gray-200 dark:text-slate-700" strokeWidth={1.5} />
                                        </div>
                                        <h3 className="text-sm font-bold text-gray-900 dark:text-white tracking-tight">No stock units found</h3>
                                        <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mt-2">Adjust your warehouse filter or register new stock to begin</p>
                                    </td>
                                </tr>
                            ) : filtered.map((item) => (
                                <tr key={item.id} className="group hover:bg-gray-50 dark:hover:bg-slate-800/50 transition-colors">
                                    <td className="px-6 py-4">
                                        <div className="flex items-start">
                                            <div className="w-10 h-10 bg-slate-50 dark:bg-slate-800 border border-slate-100 dark:border-slate-700 rounded-lg flex items-center justify-center mr-3 shrink-0 group-hover:bg-[#E68A00]/10 dark:group-hover:bg-[#E68A00]/20 group-hover:border-[#E68A00]/20 transition-colors">
                                                <Package className="w-5 h-5 text-slate-400 group-hover:text-[#E68A00]" strokeWidth={2.5} />
                                            </div>
                                            <div className="min-w-0">
                                                <div className="font-bold text-slate-900 dark:text-white group-hover:text-[#E68A00] transition-colors leading-tight truncate">{item.product_name}</div>
                                                <div className="flex flex-col gap-0.5 mt-1">
                                                    <div className="text-[10px] text-slate-500 font-bold uppercase tracking-tight">SKU: <span className="text-slate-900 dark:text-slate-300">{item.sku || 'N/A'}</span></div>
                                                    <div className="text-[10px] text-slate-400 font-medium">UPC: {item.barcode || '--'}</div>
                                                </div>
                                            </div>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4">
                                        <div className="flex items-center gap-2">
                                            <div className="w-1.5 h-1.5 rounded-full bg-indigo-500" />
                                            <div className="text-sm font-bold text-slate-700 dark:text-slate-200">{item.warehouse_name}</div>
                                        </div>
                                        <div className="text-[10px] text-slate-400 font-bold uppercase ml-3.5 tracking-tighter">{item.warehouse_type || 'Main Warehouse'}</div>
                                    </td>
                                    <td className="px-6 py-4 text-right">
                                        <div className="flex flex-col items-end gap-1">
                                            <div className="flex items-center gap-2">
                                                <span className="text-[10px] font-bold text-slate-400 uppercase">Available:</span>
                                                <span className={`text-sm font-black ${Number(item.quantity_available) <= Number(item.reorder_level || 0) ? 'text-red-500' : 'text-blue-600 dark:text-blue-400'}`}>{Number(item.quantity_available).toLocaleString()}</span>
                                            </div>
                                            <div className="flex items-center gap-2 text-[10px]">
                                                <span className="font-bold text-slate-400 dark:text-slate-500 uppercase tracking-tighter">Res: {item.quantity_reserved || 0}</span>
                                                <span className="text-slate-200 dark:text-slate-800">|</span>
                                                <span className="font-bold text-red-400 uppercase tracking-tighter">Dmg: {item.quantity_damaged || 0}</span>
                                            </div>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4">
                                        <div className="flex flex-col gap-2">
                                            {Number(item.quantity_available) <= Number(item.reorder_level || 0) ? (
                                                <div className="inline-flex items-center gap-1.5 text-[9px] font-black text-red-600 bg-red-50 dark:bg-red-900/20 px-2 py-0.5 rounded border border-red-100 dark:border-red-900/50 uppercase w-fit">
                                                    <AlertTriangle className="w-3 h-3" /> Reorder Level
                                                </div>
                                            ) : (
                                                <div className="inline-flex items-center gap-1.5 text-[9px] font-black text-emerald-600 bg-emerald-50 dark:bg-emerald-900/20 px-2 py-0.5 rounded border border-emerald-100 dark:border-emerald-900/50 uppercase w-fit">
                                                    <CheckCircle2 className="w-3 h-3" /> Healthy Stock
                                                </div>
                                            )}
                                            <div className="text-[10px] text-slate-500 dark:text-slate-400 font-bold flex items-center gap-1">
                                                <Layers className="w-3 h-3 text-slate-300 dark:text-slate-600" />
                                                LOT: <span className="text-slate-900 dark:text-slate-300">{item.batch_number || 'Default'}</span>
                                            </div>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4 text-right">
                                        <div className="flex items-center justify-end gap-1">
                                            <button onClick={() => { setSelectedItem(item); setIsDeleteModalOpen(true); }} className="p-2 hover:bg-red-50 dark:hover:bg-red-900/30 rounded-lg text-slate-300 hover:text-red-500 transition-all border border-transparent hover:border-red-100 dark:hover:border-red-900/50">
                                                <Trash2 className="w-4 h-4" />
                                            </button>
                                            <div className="text-right border-l border-slate-100 dark:border-slate-800 pl-3">
                                                <div className="text-[9px] font-black text-slate-400 uppercase">Updated</div>
                                                <div className="text-[10px] text-slate-600 dark:text-slate-400 font-bold whitespace-nowrap">
                                                    {item.last_stock_update ? new Date(item.last_stock_update).toLocaleDateString([], { day: '2-digit', month: 'short' }) : 'Never'}
                                                </div>
                                            </div>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
                {/* Footer Count Strip */}
                <div className="bg-gray-50/50 dark:bg-slate-800/50 p-4 border-t border-gray-50 dark:border-slate-800 text-center">
                    <p className="text-[10px] font-bold text-gray-400 dark:text-slate-500 uppercase tracking-widest italic leading-none">
                        System Registry Check Complete • Total Records Mapping: {inventory.length}
                    </p>
                </div>
            </div>

            {/* Amazon-Style Delete Popup */}
            {isDeleteModalOpen && (
                <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                    <div className="bg-white dark:bg-slate-900 rounded shadow-2xl w-full max-w-sm overflow-hidden animate-in zoom-in-95 duration-200 border border-gray-300 dark:border-slate-700">
                        <div className="flex items-center justify-between px-4 py-3 bg-gray-50 dark:bg-slate-800/50 border-b border-gray-200 dark:border-slate-700">
                            <div className="flex items-center gap-2">
                                <AlertCircle className="h-4 w-4 text-[#e47911]" strokeWidth={2.5} />
                                <h3 className="text-sm font-bold text-gray-900 dark:text-white uppercase tracking-tight">Remove From Ledger</h3>
                            </div>
                            <button onClick={() => setIsDeleteModalOpen(false)} className="text-gray-400 hover:text-gray-600 dark:hover:text-white transition-colors">
                                <X className="h-4 w-4" />
                            </button>
                        </div>
                        <div className="p-6">
                            <p className="text-sm text-gray-700 dark:text-gray-300 leading-relaxed">
                                Are you sure you want to delete the stock record for <span className="font-bold text-gray-900 dark:text-white">{selectedItem?.product_name}</span> at <span className="font-bold text-gray-900 dark:text-white">{selectedItem?.warehouse_name}</span>?
                                <br /><br />
                                <span className="text-[11px] font-bold text-amber-600 dark:text-amber-500 uppercase bg-amber-50 dark:bg-amber-900/20 px-2 py-1 rounded">This action is irreversible and affects master logs.</span>
                            </p>
                        </div>
                        <div className="px-4 py-3 bg-gray-50 dark:bg-slate-800/50 border-t border-gray-200 dark:border-slate-700 flex flex-col gap-2">
                            <button 
                                onClick={handleDelete}
                                disabled={isSubmitting}
                                className="w-full bg-[#f0c14b] border border-[#a88734] hover:bg-[#e7bb46] disabled:bg-gray-200 disabled:text-gray-400 text-[#111] py-2 rounded font-bold text-xs uppercase tracking-widest shadow-sm transition-all flex items-center justify-center gap-2"
                            >
                                {isSubmitting ? (
                                    <div className="w-4 h-4 border-2 border-[#111]/20 border-t-[#111] rounded-full animate-spin"></div>
                                ) : "Delete Permanent"}
                            </button>
                            <button 
                                onClick={() => setIsDeleteModalOpen(false)}
                                className="w-full bg-white dark:bg-slate-800 border border-gray-300 dark:border-slate-600 hover:bg-gray-50 dark:hover:bg-slate-700 text-gray-700 dark:text-gray-200 py-2 rounded font-bold text-xs uppercase tracking-widest transition-all shadow-sm"
                            >
                                Cancel
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

function MetricBox({ label, value, icon: Icon, color = 'text-gray-900 dark:text-white' }: { label: string; value: string | number; icon: any; color?: string }) {
    return (
        <div className="bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-800 p-5 rounded shadow-sm hover:border-[#E68A00] transition-colors group">
            <div className="flex items-center justify-between mb-3">
                <p className="text-[10px] font-bold text-gray-500 dark:text-slate-400 uppercase tracking-widest group-hover:text-[#E68A00] transition-colors">{label}</p>
                <Icon className="h-4 w-4 text-gray-300 dark:text-slate-700 group-hover:text-[#E68A00]/40 transition-colors" />
            </div>
            <p className={`text-2xl font-bold tracking-tight ${color}`}>{value}</p>
        </div>
    );
}

