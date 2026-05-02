"use client";

import React, { useState, useEffect, useRef, useMemo } from 'react';
import { useRouter, useParams } from 'next/navigation';
import {
    Package, RefreshCw, ChevronRight, ChevronLeft, Image as ImageIcon,
    Activity, ShieldCheck, Save, DollarSign, Percent, ArrowRight,
    Search, Info, CheckCircle, Plus, X, ChevronDown, MapPin
} from 'lucide-react';
import { productService, inventoryService } from '@/lib/api';
import { companyService } from '@/services/company.service';
import { getImageUrl } from '@/lib/utils';
import toast from 'react-hot-toast';
import Link from 'next/link';

/* ─────────────────────────────────────────────────────────────────────────────
   PURE AMAZON RETAIL DESIGN SYSTEM - PRODUCT SKU HUB
   ───────────────────────────────────────────────────────────────────────────── */
const Btn = ({ children, onClick, loading, variant = 'primary', className = '', type = 'button', disabled = false }: any) => {
    const styles = {
        primary: 'bg-gradient-to-b from-[#f7dfa5] to-[#f0c14b] border-[#a88734] hover:from-[#f5d78e] hover:to-[#eeb933] text-[#0f1111]',
        secondary: 'bg-gradient-to-b from-[#f7f8fa] to-[#e7e9ec] border-[#adb1b8] hover:from-[#eef1f3] hover:to-[#dce0e4] text-[#0f1111]',
    };
    return (
        <button type={type} onClick={onClick} disabled={loading || disabled}
            className={`h-[29px] px-4 rounded-[3px] text-[13px] font-medium border transition-all flex items-center gap-2 disabled:opacity-60 ${styles[variant as keyof typeof styles]} ${className}`}>
            {loading && <RefreshCw className="h-3 w-3 animate-spin" />}
            {children}
        </button>
    );
};

const Field = ({ label, required = false, children, className = "" }: { label: string; required?: boolean; children: React.ReactNode; className?: string }) => (
    <div className={`w-full ${className}`}>
        <label className="block text-[13px] font-bold text-[#0f1111] mb-1 uppercase tracking-tighter">{label}{required && <span className="text-red-600 ml-0.5">*</span>}</label>
        {children}
    </div>
);

const inputCls = "w-full h-[31px] px-3 border border-[#888c8e] rounded-[3px] text-[13px] outline-none focus:border-[#e77600] focus:shadow-[0_0_3px_2px_rgba(228,121,17,0.5)] placeholder:text-[#aaa] bg-white transition-all disabled:bg-[#f3f3f3] disabled:text-[#565959]";
const selectCls = `${inputCls} cursor-pointer`;

/* ─── Searchable Stock Selector ─── */
const StockSelector = ({ selectedId, onSelect, stocks, catalogProducts }: any) => {
    const [open, setOpen] = useState(false);
    const [search, setSearch] = useState('');
    const containerRef = useRef<HTMLDivElement>(null);

    // Group stocks by name and price (merge across warehouses if price is same)
    const groupedStocks = useMemo(() => {
        const groups: Record<string, any> = {};
        stocks.forEach((s: any) => {
            const key = `${(s.product_name || '').toLowerCase().trim()}_${s.price_per_item}`;
            if (!groups[key]) {
                groups[key] = { ...s, total_quantity: 0 };
            }
            groups[key].total_quantity += Number(s.total_quantity || 0);
            
            // If warehouses are different, mark as 'Multiple'
            if (groups[key].warehouse_name !== s.warehouse_name) {
                groups[key].warehouse_name = 'Multiple';
            }
        });
        return Object.values(groups);
    }, [stocks]);

    const filtered = groupedStocks.filter((s: any) =>
        (s.product_name || '').toLowerCase().includes(search.toLowerCase()) ||
        (s.sku && s.sku.toLowerCase().includes(search.toLowerCase())) ||
        (s.barcode && s.barcode.toLowerCase().includes(search.toLowerCase()))
    );

    const selected = stocks.find((s: any) => s.id.toString() === selectedId.toString());
    const selectedGrouped = selected ? groupedStocks.find(g => (g.product_name || '').toLowerCase() === (selected.product_name || '').toLowerCase() && g.price_per_item === selected.price_per_item) : null;

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (containerRef.current && !containerRef.current.contains(event.target as Node)) setOpen(false);
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const getCatalogImg = (name: string) => {
        return catalogProducts.find((p: any) => p.name?.toLowerCase().trim() === name?.toLowerCase().trim())?.image;
    };

    return (
        <div className="relative w-full" ref={containerRef}>
            <button
                type="button"
                onClick={() => setOpen(!open)}
                className={inputCls + " flex items-center justify-between text-left h-[42px] px-2"}
            >
                {selectedGrouped ? (
                    <div className="flex items-center gap-2 overflow-hidden py-1">
                        <div className="w-8 h-8 rounded border border-gray-100 overflow-hidden shrink-0 bg-white">
                            {getCatalogImg(selectedGrouped.product_name) ? (
                                <img src={getImageUrl(getCatalogImg(selectedGrouped.product_name)) || ''} className="w-full h-full object-contain p-0.5" alt="" />
                            ) : (
                                <Package size={14} className="text-gray-300 m-auto mt-2" />
                            )}
                        </div>
                        <div className="flex flex-col min-w-0">
                            <div className="flex items-center gap-1.5 truncate">
                                <span className="text-[13px] font-bold text-[#111]">{selectedGrouped.product_name}</span>
                                {(selectedGrouped.weight || selectedGrouped.size) && (
                                    <span className="text-[10px] text-[#e77600] font-black uppercase tracking-tight shrink-0">
                                        — {selectedGrouped.weight}{selectedGrouped.weight && selectedGrouped.size ? ' • ' : ''}{selectedGrouped.size}
                                    </span>
                                )}
                            </div>
                            <span className="text-[10px] text-[#565959] uppercase font-bold tracking-tighter leading-none">
                                Rs. {Number(selectedGrouped.price_per_item).toLocaleString()} • {selectedGrouped.total_quantity} In Total Stock
                            </span>
                        </div>
                    </div>
                ) : <span className="text-[#565959] italic">Search Stock Registry...</span>}
                <ChevronDown size={14} className={`text-gray-400 transition-transform ${open ? 'rotate-180' : ''}`} />
            </button>

            {open && (
                <div className="absolute z-[100] w-[120%] mt-1 bg-white border border-[#cdcdcd] rounded-[4px] shadow-[0_4px_20px_rgba(0,0,0,0.25)] overflow-hidden">
                    <div className="p-2 bg-[#f3f3f3] border-b border-[#ddd]">
                        <div className="relative">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={14} />
                            <input
                                className="w-full pl-9 pr-3 py-2 text-[13px] border border-[#888c8e] rounded-[3px] outline-none bg-white focus:border-[#e77600]"
                                placeholder="Type product name, SKU or barcode..."
                                value={search}
                                onChange={e => setSearch(e.target.value)}
                                autoFocus
                            />
                        </div>
                    </div>
                    <div className="max-h-[300px] overflow-y-auto">
                        {filtered.length > 0 ? (
                            filtered.map((s: any, idx: number) => (
                                <div 
                                    key={s.id || idx} 
                                    className="p-3 hover:bg-[#f3f7f7] cursor-pointer border-b border-[#eee] last:border-0 transition-all group flex items-start gap-3"
                                    onClick={() => { onSelect(s.id.toString()); setOpen(false); }}
                                >
                                    <div className="w-10 h-10 bg-white rounded border border-[#ddd] overflow-hidden shrink-0 flex items-center justify-center group-hover:border-[#e77600] transition-colors">
                                        {getCatalogImg(s.product_name) ? (
                                            <img src={getImageUrl(getCatalogImg(s.product_name)) || ''} className="w-full h-full object-contain p-1" alt="" />
                                        ) : (
                                            <Package size={20} className="text-gray-200" />
                                        )}
                                    </div>
                                    <div className="flex-1 flex justify-between items-start">
                                        <div className="flex flex-col">
                                            <div className="flex items-center gap-1.5">
                                                <span className="text-[13px] font-bold text-[#111] group-hover:text-[#e77600] group-hover:underline">{s.product_name}</span>
                                                {(s.weight || s.size) && (
                                                    <span className="text-[10px] text-[#e77600] font-black uppercase tracking-tight shrink-0">
                                                        — {s.weight}{s.weight && s.size ? ' • ' : ''}{s.size}
                                                    </span>
                                                )}
                                            </div>
                                            <div className="flex items-center gap-2 mt-0.5">
                                                <span className="text-[10px] text-emerald-600 font-bold">{s.total_quantity} Units</span>
                                                <span className="w-1 h-1 bg-gray-200 rounded-full" />
                                                <span className="text-[10px] text-[#007185] font-bold uppercase tracking-tighter flex items-center gap-0.5">
                                                    <MapPin size={10} /> {s.warehouse_name || 'Unassigned'}
                                                </span>
                                            </div>
                                        </div>
                                        <div className="text-right">
                                            <span className="text-[12px] font-bold text-[#b12704]">Rs. {Number(s.price_per_item).toLocaleString()}</span>
                                            <p className="text-[9px] text-gray-400 uppercase font-black tracking-tighter">Shared Cost</p>
                                        </div>
                                    </div>
                                </div>
                            ))
                        ) : (
                            <div className="p-8 text-center text-gray-400 text-[13px]">No matching stock signatures</div>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
};

export default function AddEditProductPage() {
    const router = useRouter();
    const { id } = useParams();
    const isEdit = !!id;

    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);

    const [allStocks, setAllStocks] = useState<any[]>([]);
    const [allSuppliers, setAllSuppliers] = useState<any[]>([]);
    const [catalogProducts, setCatalogProducts] = useState<any[]>([]);
    const [selectedSupplier, setSelectedSupplier] = useState<string>('all');
    const [filteredStocks, setFilteredStocks] = useState<any[]>([]);
    const [selectedStock, setSelectedStock] = useState<any | null>(null);

    const [pricingMode, setPricingMode] = useState<'percent' | 'manual'>('percent');
    const [profitPercent, setProfitPercent] = useState('');
    const [sellingPrice, setSellingPrice] = useState('');

    const [formData, setFormData] = useState({
        stock: '',
        selling_price: '',
        sku: '',
        barcode: '',
        badge: '',
        batch: '',
        status: 'ACTIVE',
        description: '',
    });

    const [image, setImage] = useState<File | null>(null);
    const [imagePreview, setImagePreview] = useState<string | null>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const [gallery, setGallery] = useState<File[]>([]);
    const [galleryPreviews, setGalleryPreviews] = useState<string[]>([]);
    const galleryInputRef = useRef<HTMLInputElement>(null);

    const [isDraggingMain, setIsDraggingMain] = useState(false);
    const [isDraggingGallery, setIsDraggingGallery] = useState(false);

    useEffect(() => {
        const fetchResources = async () => {
            try {
                const [stockData, supData, catProdData] = await Promise.all([
                    inventoryService.getInventory(),
                    companyService.getSuppliers(),
                    productService.getAllSupplier({ no_pagination: 'true' })
                ]);
                setAllStocks(stockData || []);
                setFilteredStocks(stockData || []);
                setAllSuppliers(supData || []);
                setCatalogProducts(Array.isArray(catProdData) ? catProdData : catProdData?.results || []);

                if (isEdit) {
                    const prod = await productService.getById(id as string);
                    setFormData({
                        stock: prod.stock || '',
                        selling_price: prod.selling_price || '',
                        sku: prod.sku || '',
                        barcode: prod.barcode || '',
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
            } catch { toast.error("Resource sync failure"); } finally { setLoading(false); }
        };
        fetchResources();
    }, [id, isEdit]);

    useEffect(() => {
        if (!isEdit) { // Only clear if not in edit mode
            if (selectedSupplier === 'all') {
                setFilteredStocks(allStocks);
            } else {
                setFilteredStocks(allStocks.filter(s => s.supplier?.toString() === selectedSupplier || s.supplier_name?.toLowerCase() === allSuppliers.find(sup => sup.id?.toString() === selectedSupplier)?.name?.toLowerCase()));
            }
            setSelectedStock(null);
            setSellingPrice('');
            setProfitPercent('');
            setFormData(prev => ({ ...prev, stock: '', selling_price: '', sku: '', barcode: '' }));
        }
    }, [selectedSupplier, allStocks]);
 
    const selectedGrouped = useMemo(() => {
        if (!selectedStock) return null;
        const matching = allStocks.filter(s => 
            (s.product_name || '').toLowerCase() === (selectedStock.product_name || '').toLowerCase() &&
            Number(s.price_per_item) === Number(selectedStock.price_per_item)
        );
        return {
            ...selectedStock,
            total_quantity: matching.reduce((sum, s) => sum + (s.total_quantity || 0), 0)
        };
    }, [selectedStock, allStocks]);

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
        const s = allStocks.find(st => st.id.toString() === stockId.toString());
        setSelectedStock(s || null);
        
        // Find image from catalog if exists
        const catalogMatch = catalogProducts.find(p => p.name?.toLowerCase().trim() === s?.product_name?.toLowerCase().trim());
        if (catalogMatch?.image) {
            setImagePreview(getImageUrl(catalogMatch.image) || null);
        }

        setFormData(prev => ({
            ...prev,
            stock: stockId,
            selling_price: '',
            sku: s?.sku || prev.sku,       // Sync SKU from stock if available
            barcode: s?.barcode || prev.barcode // Sync Barcode from stock if available
        }));
        setSellingPrice('');
        setProfitPercent('');
    };

    const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) { setImage(file); setImagePreview(URL.createObjectURL(file)); }
    };

    const handleGalleryChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const files = Array.from(e.target.files || []);
        if (files.length > 0) {
            setGallery(prev => [...prev, ...files]);
            const newPreviews = files.map(f => URL.createObjectURL(f));
            setGalleryPreviews(prev => [...prev, ...newPreviews]);
        }
    };

    const removeGalleryImage = (index: number) => {
        setGallery(prev => prev.filter((_, i) => i !== index));
        setGalleryPreviews(prev => prev.filter((_, i) => i !== index));
    };

    const handleDrop = (e: React.DragEvent, type: 'main' | 'gallery') => {
        e.preventDefault();
        setIsDraggingMain(false);
        setIsDraggingGallery(false);
        const files = Array.from(e.dataTransfer.files);
        if (files.length === 0) return;

        if (type === 'main') {
            const file = files[0];
            setImage(file);
            setImagePreview(URL.createObjectURL(file));
        } else {
            setGallery(prev => [...prev, ...files]);
            const newPreviews = files.map(f => URL.createObjectURL(f));
            setGalleryPreviews(prev => [...prev, ...newPreviews]);
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!formData.stock) return toast.error("Please select a stock entry");
        if (!formData.selling_price) return toast.error("Please set the selling price");

        setSaving(true);
        try {
            const data = new FormData();
            Object.keys(formData).forEach(key => { data.append(key, (formData as any)[key]); });
            if (image) data.append('image', image);
            gallery.forEach(file => {
                data.append('additional_images', file);
            });

            if (isEdit) { await productService.update(id as string, data); toast.success('SKU updated'); }
            else { await productService.create(data); toast.success('SKU registered'); }
            router.push('/admin/products');
        } catch (err: any) {
            console.error(err);
            let msg = 'Sync failure';
            if (err.response?.data) {
                const data = err.response.data;
                if (typeof data === 'string') msg = data;
                else if (data.error) msg = data.error;
                else if (data.message) msg = data.message;
                else if (data.detail) msg = data.detail;
                else {
                    msg = Object.values(data).flat().join(', ');
                }
            }
            toast.error(msg);
        } finally {
            setSaving(false);
        }
    };

    const profitAmount = sellingPrice && costPrice ? (parseFloat(sellingPrice) - costPrice).toFixed(2) : null;

    if (loading) return (
        <div className="flex items-center justify-center min-h-screen bg-[#F8F9FA]">
            <RefreshCw className="w-10 h-10 animate-spin text-[#c45500] opacity-20" />
        </div>
    );

    return (
        <div className="bg-[#F8F9FA] min-h-screen pb-20 font-sans text-[#0f1111]">
            <div className="max-w-[1100px] mx-auto px-6 pt-5">

                {/* Breadcrumb */}
                <div className="flex items-center gap-1 text-[12px] text-[#565959] mb-2">
                    <Link href="/admin/dashboard" className="hover:text-[#c45500] hover:underline">Dashboard</Link>
                    <ChevronRight size={10} />
                    <Link href="/admin/products" className="hover:text-[#c45500] hover:underline">Product Registry</Link>
                    <ChevronRight size={10} />
                    <span className="text-[#c45500]">{isEdit ? 'Edit SKU' : 'New SKU'}</span>
                </div>

                <div className="flex items-center justify-between mb-4">
                    <h1 className="text-[22px] font-normal">{isEdit ? 'Edit Product SKU' : 'Register New SKU'}</h1>
                    <button onClick={() => router.back()} className="text-[13px] text-[#007185] hover:text-[#c45500] hover:underline flex items-center gap-1">
                        <ChevronLeft size={14} /> Back to registry
                    </button>
                </div>
                <div className="border-b border-[#ddd] mb-8" />

                <form onSubmit={handleSubmit} className="flex flex-col lg:flex-row gap-6 items-start">
                    <div className="flex-1 space-y-6">

                        {/* 1. STOCK LINKAGE */}
                        <div className="bg-white border border-[#ddd] rounded-[4px] shadow-sm relative z-[50]">
                            <div className="px-6 py-4 border-b border-[#ddd] bg-[#f7f8fa] rounded-t-[4px]">
                                <h2 className="text-[14px] font-bold">1. Catalog & Stock Linkage</h2>
                                <p className="text-[12px] text-[#565959]">Bridge physical stock entries to retail signatures.</p>
                            </div>
                            <div className="p-6 space-y-5">
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                                    <Field label="Registry Partner">
                                        <select className={selectCls} value={selectedSupplier} onChange={e => setSelectedSupplier(e.target.value)}>
                                            <option value="all">Global Mesh ({allStocks.length} signatures)</option>
                                            {allSuppliers.map(sup => <option key={sup.id} value={sup.id}>{sup.name}</option>)}
                                        </select>
                                    </Field>
                                    <Field label="Signature Source" required>
                                        <StockSelector selectedId={formData.stock} stocks={filteredStocks} catalogProducts={catalogProducts} onSelect={handleStockSelect} />
                                    </Field>
                                </div>

                                {selectedStock && (
                                    <div className="bg-[#fcfdff] border border-blue-100 rounded-[3px] p-4 animate-in zoom-in-95 mt-2 space-y-4">
                                        <div className="flex gap-4">
                                            <Info className="text-[#007185] shrink-0" size={18} />
                                            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 w-full">
                                                <div><p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Cost Base</p><p className="text-[14px] font-bold">Rs. {Number(selectedGrouped?.price_per_item).toLocaleString()}</p></div>
                                                <div><p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Category</p><p className="text-[14px] font-bold">{selectedGrouped?.category_name || 'Generic'}</p></div>
                                                <div><p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Supplier</p><p className="text-[14px] font-bold truncate">{selectedGrouped?.supplier_name}</p></div>
                                                <div><p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Global Density</p><p className="text-[14px] font-bold text-emerald-600">{selectedGrouped?.total_quantity} Units</p></div>
                                            </div>
                                        </div>
                                        
                                        {/* Warehouse distribution */}
                                        <div className="pt-3 border-t border-blue-50">
                                            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2 flex items-center gap-1.5"><MapPin size={12} /> Stock Distribution</p>
                                            <div className="flex flex-wrap gap-2">
                                                {allStocks.filter(s => (s.product_name || '').toLowerCase() === (selectedStock?.product_name || '').toLowerCase() && Number(s.price_per_item) === Number(selectedStock?.price_per_item)).map((s, idx) => (
                                                    <div key={idx} className="px-2 py-1 bg-white border border-blue-100 rounded text-[11px] font-medium text-[#007185] shadow-sm">
                                                        {s.warehouse_name || 'Unassigned'}: <span className="font-bold text-[#111]">{s.total_quantity}</span>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* 2. PRICING STRATEGY */}
                        <div className={`bg-white border border-[#ddd] rounded-[4px] shadow-sm overflow-hidden transition-all ${!selectedStock ? 'opacity-30 pointer-events-none grayscale' : ''}`}>
                            <div className="px-6 py-4 border-b border-[#ddd] bg-[#f7f8fa]">
                                <h2 className="text-[14px] font-bold">2. Pricing Strategy</h2>
                            </div>
                            <div className="p-6 space-y-6">
                                <div className="flex bg-[#f3f3f3] border border-[#d5d9d9] rounded-[3px] p-[2px] w-[180px]">
                                    <button type="button" onClick={() => setPricingMode('percent')} className={`flex-1 py-1 text-[11px] font-bold uppercase rounded-[2px] transition-all ${pricingMode === 'percent' ? 'bg-white text-[#111] shadow-sm' : 'text-[#565959]'}`}>Yield %</button>
                                    <button type="button" onClick={() => setPricingMode('manual')} className={`flex-1 py-1 text-[11px] font-bold uppercase rounded-[2px] transition-all ${pricingMode === 'manual' ? 'bg-white text-[#111] shadow-sm' : 'text-[#565959]'}`}>Manual</button>
                                </div>

                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                                    <Field label="Yield Margin (%)">
                                        <input type="number" step="0.1" value={profitPercent} onChange={e => handleProfitChange(e.target.value)} className={inputCls} disabled={pricingMode === 'manual'} />
                                    </Field>
                                    <Field label="Merchant Price (Rs.)">
                                        <input type="number" step="0.01" value={sellingPrice} onChange={e => handleSellingPriceChange(e.target.value)} className={inputCls} disabled={pricingMode === 'percent'} />
                                    </Field>
                                </div>

                                {sellingPrice && costPrice > 0 && (
                                    <div className={`p-5 rounded-[3px] border flex items-center justify-between ${parseFloat(sellingPrice) >= costPrice ? 'bg-green-50/30 border-green-100' : 'bg-red-50 border-red-100 animate-pulse'}`}>
                                        <div className="flex items-center gap-4">
                                            <Activity className={parseFloat(sellingPrice) >= costPrice ? 'text-green-600' : 'text-red-600'} size={20} />
                                            <div>
                                                <p className="text-[10px] font-bold uppercase tracking-widest text-[#565959]">Net Profit</p>
                                                <p className={`text-[18px] font-bold ${parseFloat(sellingPrice) >= costPrice ? 'text-green-700' : 'text-red-600'}`}>Rs. {profitAmount}</p>
                                            </div>
                                        </div>
                                        <div className="text-right">
                                            <p className="text-[10px] font-bold uppercase tracking-widest text-[#565959]">Final Customer Price</p>
                                            <p className="text-[24px] font-bold text-[#c45500]">Rs. {parseFloat(sellingPrice).toLocaleString()}</p>
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* 3. DESCRIPTORS */}
                        <div className={`bg-white border border-[#ddd] rounded-[4px] shadow-sm overflow-hidden transition-all ${!selectedStock ? 'opacity-30 pointer-events-none grayscale' : ''}`}>
                            <div className="px-6 py-4 border-b border-[#ddd] bg-[#f7f8fa]">
                                <h2 className="text-[14px] font-bold">3. Visuals & Metadata</h2>
                            </div>
                            <div className="p-6 space-y-5">
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                                    <Field label="Identity SKU">
                                        <input type="text" value={formData.sku} onChange={e => setFormData(p => ({ ...p, sku: e.target.value }))} className={inputCls} placeholder="e.g. PRD-10293" />
                                    </Field>
                                    <Field label="UPC / Barcode">
                                        <input type="text" value={formData.barcode} onChange={e => setFormData(p => ({ ...p, barcode: e.target.value }))} className={inputCls} placeholder="e.g. 500123456789" />
                                    </Field>
                                </div>
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                                    <Field label="Registry Badge">
                                        <select className={selectCls} value={formData.badge} onChange={e => setFormData(p => ({ ...p, badge: e.target.value }))}>
                                            <option value="">No Badge</option>
                                            <option value="NEW">New Entry</option>
                                            <option value="HOT">Trending</option>
                                            <option value="SALE">Flash Sync</option>
                                        </select>
                                    </Field>
                                    <Field label="Signature Status">
                                        <select className={selectCls} value={formData.status} onChange={e => setFormData(p => ({ ...p, status: e.target.value }))}>
                                            <option value="ACTIVE">Visible on Mesh</option>
                                            <option value="INACTIVE">Hidden</option>
                                        </select>
                                    </Field>
                                </div>
                                <Field label="Technical Overview">
                                    <textarea rows={4} className={`${inputCls} h-auto py-2`} value={formData.description} onChange={e => setFormData(p => ({ ...p, description: e.target.value }))} placeholder="Enter SKU metadata..." />
                                </Field>
                            </div>
                        </div>
                    </div>

                    <aside className="w-full lg:w-[320px] shrink-0 space-y-4 lg:sticky lg:top-4">
                        <div className="bg-white border border-[#ddd] rounded-[4px] shadow-sm overflow-hidden">
                            <div className="px-5 py-4 border-b border-[#ddd] bg-[#f7f8fa]">
                                <h3 className="text-[14px] font-bold text-center">SKU Visual</h3>
                            </div>
                            <div className="p-6 text-center">
                                <div
                                    onClick={() => fileInputRef.current?.click()}
                                    onDragOver={(e) => { e.preventDefault(); setIsDraggingMain(true); }}
                                    onDragLeave={() => setIsDraggingMain(false)}
                                    onDrop={(e) => handleDrop(e, 'main')}
                                    className={`aspect-square bg-[#fcfcfc] border-2 border-dashed rounded-[3px] flex items-center justify-center relative overflow-hidden cursor-pointer transition-all group ${isDraggingMain ? 'border-[#e77600] bg-orange-50' : 'border-[#adb1b8] hover:border-[#e77600]'}`}
                                >
                                    {imagePreview ? (
                                        <img src={imagePreview} className="w-full h-full object-contain p-2" alt="Preview" />
                                    ) : (
                                        <div className="flex flex-col items-center opacity-30 group-hover:opacity-100">
                                            <ImageIcon size={32} />
                                            <p className="text-[11px] font-bold mt-2 uppercase">Main Banner</p>
                                        </div>
                                    )}
                                    <input type="file" ref={fileInputRef} className="hidden" accept="image/*" onChange={handleImageChange} />
                                </div>

                                {/* Gallery Section */}
                                <div className="mt-6 text-left">
                                    <h4 className="text-[11px] font-bold text-[#565959] uppercase tracking-widest mb-3">Gallery Pictures</h4>
                                    <div
                                        onDragOver={(e) => { e.preventDefault(); setIsDraggingGallery(true); }}
                                        onDragLeave={() => setIsDraggingGallery(false)}
                                        onDrop={(e) => handleDrop(e, 'gallery')}
                                        className={`grid grid-cols-4 gap-2 p-2 rounded-[4px] transition-colors ${isDraggingGallery ? 'bg-orange-50 border border-dashed border-[#e77600]' : ''}`}
                                    >
                                        {galleryPreviews.map((src, i) => (
                                            <div key={i} className="aspect-square bg-white border border-[#ddd] rounded-[2px] relative group overflow-hidden">
                                                <img src={src} className="w-full h-full object-cover" />
                                                <button type="button" onClick={() => removeGalleryImage(i)} className="absolute top-0 right-0 bg-black/50 text-white p-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                                                    <X size={10} />
                                                </button>
                                            </div>
                                        ))}
                                        <button type="button" onClick={() => galleryInputRef.current?.click()} className="aspect-square border border-dashed border-[#adb1b8] rounded-[2px] flex items-center justify-center hover:bg-[#f7f8fa] transition-colors">
                                            <Plus size={16} className="text-[#565959]" />
                                        </button>
                                    </div>
                                    <input type="file" ref={galleryInputRef} className="hidden" accept="image/*" multiple onChange={handleGalleryChange} />
                                </div>

                                <div className="mt-8 space-y-3 pt-6 border-t border-[#eee]">
                                    <Btn className="w-full h-[35px] text-[14px] justify-center" onClick={handleSubmit} loading={saving}>
                                        <Save size={14} /> {isEdit ? 'Update SKU' : 'Register SKU'}
                                    </Btn>
                                    <button onClick={() => router.push('/admin/products')} className="w-full text-[12px] text-[#565959] hover:text-[#c45500] hover:underline text-center">
                                        Discard
                                    </button>
                                </div>
                            </div>
                        </div>
                        <div className="bg-[#fff9e6] border border-[#ffebcc] rounded-[4px] p-4 flex gap-3 shadow-inner">
                            <ShieldCheck className="text-[#e47911] shrink-0" size={20} />
                            <p className="text-[12px] text-[#565959] leading-relaxed italic">SKUs are cryptographically linked to their source stock signatures for data integrity.</p>
                        </div>
                    </aside>
                </form>
            </div>
        </div>
    );
}
