"use client";

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useRouter, useParams } from 'next/navigation';
import {
    Package, Tag, Image as ImageIcon,
    Save, Loader2, Truck, ChevronLeft, MapPin,
    Percent, DollarSign, Layers, Filter,
    CheckCircle, ArrowRight, Info
} from 'lucide-react';
import { productService, inventoryService } from '@/lib/api';
import { companyService } from '@/services/company.service';
import { getImageUrl } from '@/lib/utils';
import toast from 'react-hot-toast';
import PageLoader from '@/components/ui/PageLoader';

const inputCls = `w-full px-4 py-3 bg-white dark:bg-[#0d1b24] border border-slate-200 dark:border-white/10 rounded-xl text-sm outline-none focus:border-[#F59E0B] focus:ring-2 focus:ring-[#F59E0B]/10 transition-all placeholder:text-slate-400 text-slate-800 dark:text-slate-200 font-medium`;
const selectCls = `w-full px-4 py-3 bg-white dark:bg-[#0d1b24] border border-slate-200 dark:border-white/10 rounded-xl text-sm outline-none focus:border-[#F59E0B] focus:ring-2 focus:ring-[#F59E0B]/10 text-slate-700 dark:text-slate-200 cursor-pointer transition-all font-medium`;
const labelCls = 'block text-xs font-bold text-slate-500 dark:text-slate-400 mb-2 uppercase tracking-widest';

export default function AddEditProductPage() {
    const router = useRouter();
    const { id } = useParams();
    const isEdit = !!id;

    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);

    // Data Resources
    const [allStocks, setAllStocks] = useState<any[]>([]);
    const [allSuppliers, setAllSuppliers] = useState<any[]>([]);
    const [selectedSupplier, setSelectedSupplier] = useState<string>('all');
    const [filteredStocks, setFilteredStocks] = useState<any[]>([]);
    const [selectedStock, setSelectedStock] = useState<any | null>(null);

    // Pricing logic
    const [pricingMode, setPricingMode] = useState<'percent' | 'manual'>('percent');
    const [profitPercent, setProfitPercent] = useState('');
    const [sellingPrice, setSellingPrice] = useState('');

    const [formData, setFormData] = useState({
        stock: '',
        selling_price: '',
        badge: '',
        batch: '',
        status: 'ACTIVE',
        description: '',
    });

    const [image, setImage] = useState<File | null>(null);
    const [imagePreview, setImagePreview] = useState<string | null>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        const fetchResources = async () => {
            try {
                const [stockData, supData] = await Promise.all([
                    inventoryService.getInventory(),
                    companyService.getSuppliers(),
                ]);
                setAllStocks(stockData || []);
                setFilteredStocks(stockData || []);
                setAllSuppliers(supData || []);

                if (isEdit) {
                    const prod = await productService.getById(id as string);
                    setFormData({
                        stock: prod.stock || '',
                        selling_price: prod.selling_price || '',
                        badge: prod.badge || '',
                        batch: prod.batch || '',
                        status: prod.status || 'ACTIVE',
                        description: prod.description || '',
                    });
                    setSellingPrice(prod.selling_price || '');
                    if (prod.image) setImagePreview(prod.image);
                    if (prod.stock) {
                        const s = (stockData || []).find((st: any) => st.id === prod.stock);
                        if (s) setSelectedStock(s);
                    }
                }
            } catch (err) {
                console.error('Failed to sync resources', err);
            } finally {
                setLoading(false);
            }
        };
        fetchResources();
    }, [id, isEdit]);

    // Filter stocks when supplier changes
    useEffect(() => {
        if (selectedSupplier === 'all') {
            setFilteredStocks(allStocks);
        } else {
            setFilteredStocks(allStocks.filter(s => s.supplier?.toString() === selectedSupplier || s.supplier_name?.toLowerCase() === allSuppliers.find(sup => sup.id?.toString() === selectedSupplier)?.name?.toLowerCase()));
        }
        // Reset stock selection when filter changes
        setSelectedStock(null);
        setSellingPrice('');
        setProfitPercent('');
        setFormData(prev => ({ ...prev, stock: '', selling_price: '' }));
    }, [selectedSupplier, allStocks]);

    // Pricing calculations
    const costPrice = selectedStock ? Number(selectedStock.price_per_item) : 0;

    const handleProfitChange = (val: string) => {
        setProfitPercent(val);
        if (val && costPrice > 0) {
            const pct = parseFloat(val);
            if (!isNaN(pct)) {
                const calculatedPrice = (costPrice * (1 + pct / 100)).toFixed(2);
                setSellingPrice(calculatedPrice);
                setFormData(prev => ({ ...prev, selling_price: calculatedPrice }));
            }
        }
    };

    const handleSellingPriceChange = (val: string) => {
        setSellingPrice(val);
        setFormData(prev => ({ ...prev, selling_price: val }));
        if (val && costPrice > 0) {
            const sp = parseFloat(val);
            if (!isNaN(sp) && sp > 0) {
                const calculatedPct = (((sp - costPrice) / costPrice) * 100).toFixed(1);
                setProfitPercent(calculatedPct);
            }
        }
    };

    const handleStockSelect = (stockId: string) => {
        const s = filteredStocks.find(st => st.id.toString() === stockId);
        setSelectedStock(s || null);
        setFormData(prev => ({ ...prev, stock: stockId, selling_price: '' }));
        setSellingPrice('');
        setProfitPercent('');
    };

    const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            setImage(file);
            setImagePreview(URL.createObjectURL(file));
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!formData.stock) return toast.error("Please select a stock entry");
        if (!formData.selling_price) return toast.error("Please set the selling price");

        setSaving(true);
        try {
            const data = new FormData();
            Object.keys(formData).forEach(key => {
                data.append(key, (formData as any)[key]);
            });
            if (image) data.append('image', image);

            if (isEdit) {
                await productService.update(id as string, data);
                toast.success('Product updated successfully');
            } else {
                await productService.create(data);
                toast.success('Product added to catalog');
            }
            router.push('/admin/products');
        } catch (error) {
            console.error(error);
            toast.error('Failed to save product');
        } finally {
            setSaving(false);
        }
    };

    const profitAmount = sellingPrice && costPrice ? (parseFloat(sellingPrice) - costPrice).toFixed(2) : null;

    if (loading) return <PageLoader />;

    return (
        <div className="max-w-5xl mx-auto py-8 px-4 font-sans text-left">
            {/* Header */}
            <div className="mb-8">
                <button
                    onClick={() => router.push('/admin/products')}
                    className="flex items-center gap-1.5 text-xs font-semibold text-slate-400 hover:text-[#F59E0B] uppercase tracking-wider transition-all mb-5"
                >
                    <ChevronLeft className="h-4 w-4" /> Back to Products
                </button>
                <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-2xl bg-[#F59E0B]/10 flex items-center justify-center">
                        <Package className="h-6 w-6 text-[#F59E0B]" />
                    </div>
                    <div>
                        <h1 className="text-2xl font-bold text-slate-900 dark:text-white">
                            {isEdit ? 'Edit Product' : 'Add New Product'}
                        </h1>
                        <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">Link a stock entry and set the retail price for your storefront</p>
                    </div>
                </div>
            </div>

            <form onSubmit={handleSubmit} className="grid grid-cols-1 lg:grid-cols-3 gap-6">

                {/* ── Left Column ── */}
                <div className="lg:col-span-2 space-y-5">

                    {/* Step 1: Select Source */}
                    <div className="bg-white dark:bg-[#1a252f] border border-slate-200 dark:border-white/10 rounded-2xl overflow-hidden">
                        <div className="px-6 py-4 border-b border-slate-100 dark:border-white/5 bg-slate-50/50 dark:bg-white/[0.02] flex items-center gap-3">
                            <span className="w-6 h-6 rounded-full bg-[#F59E0B] text-white text-xs font-bold flex items-center justify-center flex-shrink-0">1</span>
                            <div>
                                <h2 className="text-sm font-bold text-slate-800 dark:text-white">Select Stock Source</h2>
                                <p className="text-[10px] text-slate-400 font-medium mt-0.5">Filter by supplier, then pick the stock entry</p>
                            </div>
                        </div>
                        <div className="p-6 space-y-4">
                            {/* Supplier Filter */}
                            <div>
                                <label className={labelCls}>
                                    <Filter className="inline h-3 w-3 mr-1" />
                                    Filter by Supplier
                                </label>
                                <select
                                    value={selectedSupplier}
                                    onChange={e => setSelectedSupplier(e.target.value)}
                                    className={selectCls}
                                >
                                    <option value="all">All Suppliers ({allStocks.length} items)</option>
                                    {allSuppliers.map(sup => (
                                        <option key={sup.id} value={sup.id}>
                                            {sup.name} ({allStocks.filter(s => s.supplier === sup.id || s.supplier_name === sup.name).length} items)
                                        </option>
                                    ))}
                                </select>
                            </div>

                            {/* Stock Selection */}
                            <div>
                                <label className={labelCls}>
                                    <Package className="inline h-3 w-3 mr-1" />
                                    Select Stock Entry <span className="text-red-500">*</span>
                                </label>
                                <select
                                    required
                                    value={formData.stock}
                                    onChange={e => handleStockSelect(e.target.value)}
                                    className={selectCls}
                                >
                                    <option value="">-- Choose a stock entry --</option>
                                    {filteredStocks.map(s => (
                                        <option key={s.id} value={s.id}>
                                            {s.product_name} — {s.supplier_name} ({s.total_quantity} units)
                                        </option>
                                    ))}
                                </select>
                            </div>

                            {/* Stock Preview */}
                            {selectedStock && (
                                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 p-4 bg-emerald-50 dark:bg-emerald-500/5 border border-emerald-200 dark:border-emerald-500/20 rounded-xl animate-in fade-in duration-300">
                                    <div>
                                        <p className="text-[9px] font-bold text-emerald-600 uppercase tracking-wider mb-1">Product</p>
                                        <p className="text-xs font-bold text-slate-800 dark:text-white leading-tight">{selectedStock.product_name}</p>
                                        <p className="text-[9px] text-blue-500 font-semibold mt-0.5">{selectedStock.category_name || 'No Category'}</p>
                                    </div>
                                    <div>
                                        <p className="text-[9px] font-bold text-emerald-600 uppercase tracking-wider mb-1">Supplier</p>
                                        <p className="text-xs font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-1">
                                            <Truck className="h-2.5 w-2.5 text-[#F59E0B]" />{selectedStock.supplier_name}
                                        </p>
                                        <p className="text-[9px] text-slate-500 flex items-center gap-1 mt-0.5">
                                            <MapPin className="h-2 w-2" />{selectedStock.warehouse_name}
                                        </p>
                                    </div>
                                    <div>
                                        <p className="text-[9px] font-bold text-emerald-600 uppercase tracking-wider mb-1">Cost Price</p>
                                        <p className="text-sm font-bold text-slate-800 dark:text-white">Rs. {Number(selectedStock.price_per_item).toLocaleString()}</p>
                                        <p className="text-[9px] text-slate-400 mt-0.5">Per unit</p>
                                    </div>
                                    <div>
                                        <p className="text-[9px] font-bold text-emerald-600 uppercase tracking-wider mb-1">Stock Qty</p>
                                        <p className="text-sm font-bold text-slate-800 dark:text-white">{selectedStock.total_quantity}</p>
                                        <p className="text-[9px] text-emerald-500 font-semibold mt-0.5">Units Available</p>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Step 2: Pricing */}
                    <div className={`bg-white dark:bg-[#1a252f] border rounded-2xl overflow-hidden transition-all ${!selectedStock ? 'border-slate-100 dark:border-white/5 opacity-60 pointer-events-none' : 'border-slate-200 dark:border-white/10'}`}>
                        <div className="px-6 py-4 border-b border-slate-100 dark:border-white/5 bg-slate-50/50 dark:bg-white/[0.02] flex items-center gap-3">
                            <span className="w-6 h-6 rounded-full bg-[#F59E0B] text-white text-xs font-bold flex items-center justify-center flex-shrink-0">2</span>
                            <div>
                                <h2 className="text-sm font-bold text-slate-800 dark:text-white">Set Retail Price</h2>
                                <p className="text-[10px] text-slate-400 font-medium mt-0.5">Use profit margin or enter price directly</p>
                            </div>
                        </div>
                        <div className="p-6 space-y-5">
                            {/* Cost display */}
                            {selectedStock && (
                                <div className="flex items-center gap-3 p-3 bg-slate-50 dark:bg-white/5 rounded-xl border border-slate-100 dark:border-white/5">
                                    <Info className="h-4 w-4 text-slate-400 flex-shrink-0" />
                                    <span className="text-xs text-slate-500 font-medium">
                                        Procurement cost: <strong className="text-slate-800 dark:text-white">Rs. {Number(selectedStock.price_per_item).toLocaleString()}</strong> per unit
                                    </span>
                                </div>
                            )}

                            {/* Pricing Mode Toggle */}
                            <div>
                                <label className={labelCls}>Pricing Method</label>
                                <div className="grid grid-cols-2 gap-3">
                                    <button
                                        type="button"
                                        onClick={() => setPricingMode('percent')}
                                        className={`flex items-center gap-3 px-4 py-3 rounded-xl border-2 transition-all text-left ${pricingMode === 'percent' ? 'border-[#F59E0B] bg-[#F59E0B]/5 text-[#F59E0B]' : 'border-slate-200 dark:border-white/10 text-slate-500 hover:border-slate-300'}`}
                                    >
                                        <Percent className="h-4 w-4 flex-shrink-0" />
                                        <div>
                                            <p className="text-xs font-bold">Markup %</p>
                                            <p className="text-[9px] font-medium opacity-70">Add % to cost price</p>
                                        </div>
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => setPricingMode('manual')}
                                        className={`flex items-center gap-3 px-4 py-3 rounded-xl border-2 transition-all text-left ${pricingMode === 'manual' ? 'border-[#F59E0B] bg-[#F59E0B]/5 text-[#F59E0B]' : 'border-slate-200 dark:border-white/10 text-slate-500 hover:border-slate-300'}`}
                                    >
                                        <DollarSign className="h-4 w-4 flex-shrink-0" />
                                        <div>
                                            <p className="text-xs font-bold">Manual Price</p>
                                            <p className="text-[9px] font-medium opacity-70">Enter price directly</p>
                                        </div>
                                    </button>
                                </div>
                            </div>

                            {/* Pricing Inputs */}
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className={labelCls}>
                                        Markup {pricingMode === 'percent' && <span className="text-red-500">*</span>}
                                    </label>
                                    <div className="relative">
                                        <input
                                            type="number"
                                            min="0"
                                            max="99"
                                            step="0.1"
                                            value={profitPercent}
                                            onChange={e => handleProfitChange(e.target.value)}
                                            placeholder={pricingMode === 'percent' ? 'e.g. 30' : 'Auto-calculated'}
                                            readOnly={pricingMode === 'manual'}
                                            className={inputCls + (pricingMode === 'manual' ? ' bg-slate-50 dark:bg-black/20 text-slate-400 cursor-not-allowed' : '')}
                                        />
                                        <span className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 font-bold text-sm">%</span>
                                    </div>
                                </div>
                                <div>
                                    <label className={labelCls}>
                                        Selling Price {pricingMode === 'manual' && <span className="text-red-500">*</span>}
                                    </label>
                                    <div className="relative">
                                        <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 font-bold text-xs">Rs.</span>
                                        <input
                                            type="number"
                                            step="0.01"
                                            value={sellingPrice}
                                            onChange={e => handleSellingPriceChange(e.target.value)}
                                            placeholder={pricingMode === 'percent' ? 'Auto-calculated' : 'Enter price'}
                                            readOnly={pricingMode === 'percent'}
                                            className={inputCls + ' pl-10' + (pricingMode === 'percent' ? ' bg-slate-50 dark:bg-black/20 text-slate-400 cursor-not-allowed' : '')}
                                        />
                                    </div>
                                </div>
                            </div>

                            {/* Profit Summary */}
                            {sellingPrice && costPrice > 0 && (
                                <div className={`flex items-center gap-4 p-4 rounded-xl border animate-in fade-in duration-300 ${parseFloat(sellingPrice) >= costPrice ? 'bg-emerald-50 dark:bg-emerald-500/5 border-emerald-200 dark:border-emerald-500/20' : 'bg-red-50 dark:bg-red-500/5 border-red-200 dark:border-red-500/20'}`}>
                                    <CheckCircle className={`h-4 w-4 flex-shrink-0 ${parseFloat(sellingPrice) >= costPrice ? 'text-emerald-500' : 'text-red-500'}`} />
                                    <div className="flex-1 grid grid-cols-3 gap-4 text-center">
                                        <div>
                                            <p className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">Cost</p>
                                            <p className="text-sm font-bold text-slate-700 dark:text-white">Rs. {costPrice.toLocaleString()}</p>
                                        </div>
                                        <div>
                                            <p className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">Profit</p>
                                            <p className={`text-sm font-bold ${parseFloat(sellingPrice) >= costPrice ? 'text-emerald-600' : 'text-red-600'}`}>
                                                Rs. {profitAmount}
                                            </p>
                                        </div>
                                        <div>
                                            <p className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">Retail</p>
                                            <p className="text-sm font-bold text-[#F59E0B]">Rs. {parseFloat(sellingPrice).toLocaleString()}</p>
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Step 3: Product Details */}
                    <div className={`bg-white dark:bg-[#1a252f] border rounded-2xl overflow-hidden transition-all ${!selectedStock ? 'border-slate-100 dark:border-white/5 opacity-60 pointer-events-none' : 'border-slate-200 dark:border-white/10'}`}>
                        <div className="px-6 py-4 border-b border-slate-100 dark:border-white/5 bg-slate-50/50 dark:bg-white/[0.02] flex items-center gap-3">
                            <span className="w-6 h-6 rounded-full bg-[#F59E0B] text-white text-xs font-bold flex items-center justify-center flex-shrink-0">3</span>
                            <div>
                                <h2 className="text-sm font-bold text-slate-800 dark:text-white">Product Details</h2>
                                <p className="text-[10px] text-slate-400 font-medium mt-0.5">Badge, description and visibility settings</p>
                            </div>
                        </div>
                        <div className="p-6 space-y-5">
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                <div>
                                    <label className={labelCls}>Promotional Badge</label>
                                    <select
                                        name="badge"
                                        value={formData.badge}
                                        onChange={e => setFormData(prev => ({ ...prev, badge: e.target.value }))}
                                        className={selectCls}
                                    >
                                        <option value="">No Badge</option>
                                        <option value="NEW">🆕 New Arrival</option>
                                        <option value="SALE">🔥 Flash Sale</option>
                                        <option value="HOT">⚡ Trending</option>
                                        <option value="BEST SELLER">⭐ Best Seller</option>
                                        <option value="LIMITED">⏳ Limited Stock</option>
                                    </select>
                                </div>
                                <div>
                                    <label className={labelCls}>Batch Tag (Dynamic)</label>
                                    <input
                                        type="text"
                                        name="batch"
                                        value={formData.batch}
                                        onChange={e => setFormData(prev => ({ ...prev, batch: e.target.value }))}
                                        className={inputCls}
                                        placeholder="e.g. SPECIALTY, FRESH BATCH"
                                    />
                                </div>
                                <div className="sm:col-span-2">
                                    <label className={labelCls}>Visibility Status</label>
                                    <div className="flex gap-3 mt-1">
                                        {['ACTIVE', 'INACTIVE'].map(s => (
                                            <label key={s} className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-xl border-2 cursor-pointer transition-all ${formData.status === s ? 'border-[#F59E0B] bg-[#F59E0B]/5 text-[#F59E0B]' : 'border-slate-200 dark:border-white/10 text-slate-400'}`}>
                                                <input type="radio" name="status" value={s} checked={formData.status === s} onChange={e => setFormData(prev => ({ ...prev, status: e.target.value }))} className="hidden" />
                                                <span className="text-xs font-bold">{s}</span>
                                            </label>
                                        ))}
                                    </div>
                                </div>
                            </div>

                            <div>
                                <label className={labelCls}>Product Description</label>
                                <textarea
                                    name="description"
                                    value={formData.description}
                                    onChange={e => setFormData(prev => ({ ...prev, description: e.target.value }))}
                                    rows={4}
                                    className={inputCls + ' resize-none'}
                                    placeholder="Write a compelling product description for your storefront..."
                                />
                            </div>
                        </div>
                    </div>
                </div>

                {/* ── Right Column ── */}
                <div className="space-y-5">
                    {/* Product Image */}
                    <div className="bg-white dark:bg-[#1a252f] border border-slate-200 dark:border-white/10 rounded-2xl overflow-hidden">
                        <div className="px-6 py-4 border-b border-slate-100 dark:border-white/5 bg-slate-50/50 dark:bg-white/[0.02] flex items-center gap-2">
                            <ImageIcon className="h-4 w-4 text-[#F59E0B]" />
                            <h2 className="text-sm font-bold text-slate-800 dark:text-white">Product Image</h2>
                        </div>
                        <div className="p-5">
                            <div
                                onClick={() => fileInputRef.current?.click()}
                                className="aspect-[4/5] bg-slate-50 dark:bg-black/20 border-2 border-dashed border-slate-200 dark:border-white/10 rounded-2xl flex flex-col items-center justify-center relative overflow-hidden group cursor-pointer hover:border-[#F59E0B]/50 transition-all"
                            >
                                {imagePreview ? (
                                    <img src={imagePreview} className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105" alt="Preview" />
                                ) : (
                                    <div className="text-center p-6">
                                        <div className="w-14 h-14 rounded-2xl bg-slate-100 dark:bg-white/5 flex items-center justify-center mx-auto mb-3">
                                            <ImageIcon className="h-6 w-6 text-slate-300 dark:text-white/20" />
                                        </div>
                                        <p className="text-xs font-bold text-slate-400">Click to upload image</p>
                                        <p className="text-[9px] text-slate-300 dark:text-white/20 mt-1 font-medium">JPG, PNG. Max 5MB</p>
                                    </div>
                                )}
                                <div className="absolute inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all">
                                    <p className="text-xs font-bold text-white">Change Image</p>
                                </div>
                                <input type="file" ref={fileInputRef} className="hidden" accept="image/*" onChange={handleImageChange} />
                            </div>
                            <p className="text-[9px] font-medium text-slate-400 text-center mt-3">Recommended: 4:5 ratio</p>
                        </div>
                    </div>

                    {/* Price Summary Card */}
                    {selectedStock && sellingPrice && (
                        <div className="bg-gradient-to-br from-[#F59E0B] to-orange-400 rounded-2xl p-5 text-white animate-in fade-in duration-300">
                            <p className="text-[10px] font-bold uppercase tracking-widest opacity-80 mb-3">Price Summary</p>
                            <div className="space-y-2">
                                <div className="flex justify-between items-center">
                                    <span className="text-xs font-medium opacity-80">Cost Price</span>
                                    <span className="text-xs font-bold">Rs. {costPrice.toLocaleString()}</span>
                                </div>
                                <div className="flex justify-between items-center">
                                    <span className="text-xs font-medium opacity-80">Profit ({profitPercent}%)</span>
                                    <span className="text-xs font-bold">Rs. {profitAmount}</span>
                                </div>
                                <div className="border-t border-white/20 pt-2 flex justify-between items-center">
                                    <span className="text-sm font-bold">Retail Price</span>
                                    <span className="text-lg font-black">Rs. {parseFloat(sellingPrice).toLocaleString()}</span>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Action Buttons */}
                    <div className="space-y-3">
                        <button
                            type="submit"
                            disabled={saving || !formData.stock || !sellingPrice}
                            className="w-full py-4 bg-[#F59E0B] text-white rounded-2xl text-sm font-bold shadow-lg shadow-[#F59E0B]/30 hover:bg-amber-500 hover:shadow-xl hover:-translate-y-0.5 active:translate-y-0 transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:translate-y-0"
                        >
                            {saving ? <Loader2 className="h-5 w-5 animate-spin" /> : <Save className="h-5 w-5" />}
                            {isEdit ? 'Update Product' : 'Add Product'}
                        </button>
                        <button
                            type="button"
                            onClick={() => router.push('/admin/products')}
                            className="w-full py-3 bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-2xl text-xs font-bold text-slate-500 hover:text-slate-700 hover:bg-slate-100 dark:hover:bg-white/10 transition-all"
                        >
                            Cancel
                        </button>
                    </div>
                </div>
            </form>
        </div>
    );
}
