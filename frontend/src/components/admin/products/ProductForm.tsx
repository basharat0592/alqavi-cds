"use client";

import React, { useState, useEffect, useRef, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import {
    Package, RefreshCw, ChevronRight, ChevronLeft, Image as ImageIcon,
    Activity, ShieldCheck, Save,
    Search, Info, Plus, X, ChevronDown, MapPin
} from 'lucide-react';
import { productService, inventoryService, categoryService } from '@/lib/api';
import { companyService } from '@/services/company.service';
import { getImageUrl } from '@/lib/utils';
import toast from 'react-hot-toast';
import Link from 'next/link';
import { ui } from '@/components/admin/ui';

/* ─────────────────────────────────────────────────────────────────────────────
   PURE AMAZON RETAIL DESIGN SYSTEM - PRODUCT FORM COMPONENT
   ───────────────────────────────────────────────────────────────────────────── */

const Btn = ({ children, onClick, loading, variant = 'primary', className = '', type = 'button', disabled = false }: any) => {
    const styles = {
        primary: 'bg-[#F59E0B] border-[#F59E0B] hover:bg-[#D97706] hover:border-[#F59E0B] text-white shadow-sm hover:shadow',
        secondary: 'bg-white border-slate-200 hover:bg-slate-50 text-slate-700',
    };
    return (
        <button type={type} onClick={onClick} disabled={loading || disabled}
            className={`h-10 px-4 rounded-lg text-[13px] font-semibold border transition-all flex items-center gap-2 disabled:opacity-60 ${styles[variant as keyof typeof styles]} ${className}`}>
            {loading && <RefreshCw className="h-3 w-3 animate-spin" />}
            {children}
        </button>
    );
};

const Field = ({ label, required = false, children, className = "" }: { label: string; required?: boolean; children: React.ReactNode; className?: string }) => (
    <div className={`w-full ${className}`}>
        <label className="block text-[11px] font-bold text-slate-500 mb-1.5 uppercase tracking-wider">{label}{required && <span className="text-rose-500 ml-0.5">*</span>}</label>
        {children}
    </div>
);

const inputCls = ui.inputBase;
/* ─── Professional Searchable Select ─── */
const ProfessionalSelect = ({ label, value, options, onChange, placeholder = "Select...", searchable = false, required = false }: any) => {
    const [open, setOpen] = useState(false);
    const [search, setSearch] = useState('');
    const ref = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (ref.current && !ref.current.contains(event.target as Node)) setOpen(false);
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const selectedOption = options.find((o: any) =>
        String(o.id || '') === String(value || '')
    );
    const filtered = searchable
        ? options.filter((o: any) => (o.name || '').toLowerCase().includes(search.toLowerCase()))
        : options;

    return (
        <Field label={label} required={required} className="relative" >
            <div ref={ref}>
                <button
                    type="button"
                    onClick={() => setOpen(!open)}
                    className={`${inputCls} flex items-center justify-between text-left bg-white h-10`}
                >
                    <span className={selectedOption ? 'text-[#0f172a]' : 'text-gray-400'}>
                        {selectedOption ? selectedOption.name : placeholder}
                    </span>
                    <ChevronDown size={14} className={`text-gray-400 transition-transform ${open ? 'rotate-180' : ''}`} />
                </button>

                {open && (
                    <div className="absolute z-[120] w-full mt-1 bg-white border border-slate-200 rounded-xl shadow-[0_4px_12px_rgba(0,0,0,0.15)] overflow-hidden animate-in fade-in zoom-in-95 duration-150">
                        {searchable && (
                            <div className="p-2 border-b border-slate-100 bg-slate-50">
                                <div className="relative">
                                    <Search className="absolute left-2 top-1/2 -translate-y-1/2 text-gray-400" size={12} />
                                    <input
                                        className="w-full pl-7 pr-2 py-1 text-[12px] border border-slate-200 rounded-md outline-none focus:border-[#4f46e5]"
                                        placeholder="Search..."
                                        value={search}
                                        onChange={e => setSearch(e.target.value)}
                                        autoFocus
                                    />
                                </div>
                            </div>
                        )}
                        <div className="max-h-[220px] overflow-y-auto">
                            {filtered.length > 0 ? (
                                filtered.map((opt: any) => (
                                    <div
                                        key={opt.id}
                                        className={`px-3 py-2 text-[13px] hover:bg-slate-50 cursor-pointer transition-colors ${String(value || '') === String(opt.id || '') ? 'bg-[#F59E0B]/10 font-bold text-[#4f46e5]' : 'text-[#0f172a]'}`}
                                        onClick={() => {
                                            onChange(opt.id.toString());
                                            setOpen(false);
                                            setSearch('');
                                        }}
                                    >
                                        {opt.name}
                                    </div>
                                ))
                            ) : (
                                <div className="p-4 text-center text-gray-400 text-[12px]">No results found</div>
                            )}
                        </div>
                    </div>
                )}
            </div>
        </Field>
    );
};

/* ─── Searchable Stock Selector ─── */
const StockSelector = ({ selectedId, onSelect, stocks, catalogProducts }: any) => {
    const [open, setOpen] = useState(false);
    const [search, setSearch] = useState('');
    const containerRef = useRef<HTMLDivElement>(null);

    const groupedStocks = useMemo(() => {
        const groups: Record<string, any> = {};
        stocks.forEach((s: any) => {
            const key = `${(s.product_name || '').toLowerCase().trim()}_${s.price_per_item}`;
            if (!groups[key]) {
                groups[key] = { ...s, total_quantity: 0 };
            }
            groups[key].total_quantity += Number(s.total_quantity || 0);
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
    const selectedGrouped = selected ? groupedStocks.find(g => (g.product_name || '').toLowerCase() === (selected.product_name || '').toLowerCase() && Number(g.price_per_item) === Number(selected.price_per_item)) : null;

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
                className="w-full px-2 border border-slate-200 rounded-lg text-[13px] bg-white outline-none focus:border-[#F59E0B] focus:ring-4 focus:ring-[#F59E0B]/10 transition-all flex items-center justify-between text-left h-[46px]"
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
                                <span className="text-[13px] font-bold text-[#0f172a]">{selectedGrouped.product_name.replace(/\s*\(.*?\)\s*$/, '')}</span>
                                {(selectedGrouped.weight || selectedGrouped.size) && (
                                    <span className="text-[10px] text-[#4f46e5] font-black uppercase tracking-tight shrink-0">
                                        — {selectedGrouped.weight}{selectedGrouped.weight && selectedGrouped.size ? ' • ' : ''}{selectedGrouped.size}
                                    </span>
                                )}
                            </div>
                            <span className="text-[10px] text-[#64748b] uppercase font-bold tracking-tighter leading-none">
                                Rs. {Number(selectedGrouped.price_per_item).toLocaleString()} • {selectedGrouped.total_quantity} In Total Stock
                            </span>
                        </div>
                    </div>
                ) : <span className="text-[#64748b] italic">Search Stock Registry...</span>}
                <ChevronDown size={14} className={`text-gray-400 transition-transform ${open ? 'rotate-180' : ''}`} />
            </button>

            {open && (
                <div className="absolute z-[100] w-[120%] mt-1 bg-white border border-slate-200 rounded-xl shadow-[0_4px_20px_rgba(0,0,0,0.25)] overflow-hidden">
                    <div className="p-2 bg-slate-100 border-b border-slate-200">
                        <div className="relative">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={14} />
                            <input
                                className="w-full pl-9 pr-3 py-2 text-[13px] border border-slate-300 rounded-lg outline-none bg-white focus:border-[#4f46e5]"
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
                                    className="p-3 hover:bg-slate-50 cursor-pointer border-b border-slate-100 last:border-0 transition-all group flex items-start gap-3"
                                    onClick={() => { onSelect(s.id.toString()); setOpen(false); }}
                                >
                                    <div className="w-10 h-10 bg-white rounded border border-slate-200 overflow-hidden shrink-0 flex items-center justify-center group-hover:border-[#4f46e5] transition-colors">
                                        {getCatalogImg(s.product_name) ? (
                                            <img src={getImageUrl(getCatalogImg(s.product_name)) || ''} className="w-full h-full object-contain p-1" alt="" />
                                        ) : (
                                            <Package size={20} className="text-gray-200" />
                                        )}
                                    </div>
                                    <div className="flex-1 flex justify-between items-start">
                                        <div className="flex flex-col">
                                            <div className="flex items-center gap-1.5">
                                                <span className="text-[13px] font-bold text-[#0f172a] group-hover:text-[#4f46e5] group-hover:underline">{s.product_name.replace(/\s*\(.*?\)\s*$/, '')}</span>
                                                {(s.weight || s.size) && (
                                                    <span className="text-[10px] text-[#4f46e5] font-black uppercase tracking-tight shrink-0">
                                                        — {s.weight}{s.weight && s.size ? ' • ' : ''}{s.size}
                                                    </span>
                                                )}
                                            </div>
                                            <div className="flex items-center gap-2 mt-0.5">
                                                <span className="text-[10px] text-emerald-600 font-bold">{s.total_quantity} Units</span>
                                                <span className="w-1 h-1 bg-gray-200 rounded-full" />
                                                <span className="text-[10px] text-[#4f46e5] font-bold uppercase tracking-tighter flex items-center gap-0.5">
                                                    <MapPin size={10} /> {s.warehouse_name || 'Unassigned'}
                                                </span>
                                                {s.supplier_name && (
                                                    <>
                                                        <span className="w-1 h-1 bg-gray-200 rounded-full" />
                                                        <span className="text-[10px] text-slate-500 font-bold uppercase tracking-tighter">
                                                            {s.supplier_name}
                                                        </span>
                                                    </>
                                                )}
                                                {s.category_name && (
                                                    <>
                                                        <span className="w-1 h-1 bg-gray-200 rounded-full" />
                                                        <span className="text-[10px] text-slate-500 font-bold uppercase tracking-tighter">
                                                            {s.category_name}
                                                        </span>
                                                    </>
                                                )}
                                            </div>
                                            <div className="mt-1 flex items-center gap-2">
                                                {s.sku && (
                                                    <div className="text-[9px] text-slate-400 font-mono flex gap-2">
                                                        <span>SKU: <span className="text-slate-600 font-bold">{s.sku}</span></span>
                                                        {s.barcode && <span>• BAR: <span className="text-slate-600 font-bold">{s.barcode}</span></span>}
                                                    </div>
                                                )}
                                                {s.date && (
                                                    <span className="text-[9px] text-slate-400 uppercase font-bold ml-auto">
                                                        Arrived: {new Date(s.date).toLocaleDateString()}
                                                    </span>
                                                )}
                                            </div>
                                        </div>
                                        <div className="text-right">
                                            <span className="text-[12px] font-bold text-slate-900">Rs. {Number(s.price_per_item).toLocaleString()}</span>
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

interface ProductFormProps {
    id?: string;
}

export default function ProductForm({ id }: ProductFormProps) {
    const router = useRouter();
    const isEdit = !!id;

    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);

    const [allStocks, setAllStocks] = useState<any[]>([]);
    const [allSuppliers, setAllSuppliers] = useState<any[]>([]);
    const [allCategories, setAllCategories] = useState<any[]>([]);
    const [catalogProducts, setCatalogProducts] = useState<any[]>([]);
    const [selectedSupplier, setSelectedSupplier] = useState<string>('all');
    const [filteredStocks, setFilteredStocks] = useState<any[]>([]);
    const [selectedStock, setSelectedStock] = useState<any | null>(null);

    const [pricingMode, setPricingMode] = useState<'percent' | 'manual'>('percent');
    const [profitPercent, setProfitPercent] = useState('');
    const [sellingPrice, setSellingPrice] = useState('');

    const [formData, setFormData] = useState({
        stock: '',
        category: '',
        sections: [] as string[],
        selling_price: '',
        original_price: '',
        sku: '',
        barcode: '',
        badge: '',
        batch: '',
        status: 'ACTIVE',
        description: '',
        weight: '',
        size: '',
        min_count: '10',
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
                // Each lookup is independent — one failing endpoint (e.g. a 500 on
                // categories) must not blank out the others (stock, suppliers, catalog).
                const [stockData, supData, catData, catProdData] = await Promise.all([
                    inventoryService.getInventory().catch(() => []),
                    companyService.getSuppliers().catch(() => []),
                    categoryService.getAll().catch(() => []),
                    productService.getAllSupplier({ no_pagination: 'true' }).catch(() => [])
                ]);
                setAllStocks(stockData || []);
                setFilteredStocks(stockData || []);
                setAllSuppliers(supData || []);
                setAllCategories(catData || []);
                setCatalogProducts(Array.isArray(catProdData) ? catProdData : catProdData?.results || []);

                if (isEdit) {
                    const prod = await productService.getById(id as string);

                    // Robust category ID extraction
                    const catId = (
                        (typeof prod.category === 'object' ? prod.category?.id : prod.category) ||
                        prod.category_id ||
                        ''
                    );

                    setFormData({
                        stock: (typeof prod.stock === 'object' ? prod.stock?.id : prod.stock) || '',
                        category: String(catId),
                        sections: Array.isArray(prod.sections) ? prod.sections.map((s: any) => String(typeof s === 'object' ? s.id : s)) : [],
                        selling_price: prod.selling_price || '',
                        original_price: prod.original_price || '',
                        sku: prod.sku || '',
                        barcode: prod.barcode || '',
                        badge: prod.badge || '',
                        batch: prod.batch || '',
                        status: prod.status || 'ACTIVE',
                        description: prod.description || '',
                        weight: prod.weight || '',
                        size: prod.size || '',
                        min_count: prod.min_count != null ? String(prod.min_count) : '10',
                    });
                    setSellingPrice(prod.selling_price || '');

                    // Exhaustive image source check
                    const bannerSrc = prod.image || prod.image_url || prod.banner_image || prod.main_image;
                    if (bannerSrc) {
                        const imgUrl = getImageUrl(bannerSrc);
                        if (imgUrl) setImagePreview(imgUrl);
                    }

                    if (prod.additional_images && prod.additional_images.length > 0) {
                        const existingPreviews = prod.additional_images
                            .map((img: any) => getImageUrl(img.image || img.image_url || img.url))
                            .filter((url: string | undefined): url is string => !!url);
                        setGalleryPreviews(existingPreviews);
                    }

                    if (prod.stock) {
                        const sId = typeof prod.stock === 'object' ? prod.stock?.id : prod.stock;
                        const s = (stockData || []).find((st: any) => String(st.id) === String(sId));
                        if (s) {
                            setSelectedStock(s);
                            // Fallback to stock/catalog image ONLY if product has no image
                            if (!bannerSrc) {
                                const catalogImg = (catProdData as any)?.results?.find((p: any) => p.name?.toLowerCase().trim() === s.product_name?.toLowerCase().trim())?.image;
                                if (catalogImg) setImagePreview(getImageUrl(catalogImg) || null);
                            }
                            // Sync profit percent
                            const cp = Number(s.price_per_item);
                            const sp = Number(prod.selling_price);
                            if (cp > 0 && sp > 0) {
                                setProfitPercent((((sp - cp) / cp) * 100).toFixed(1));
                            }
                        }
                    }
                }
            } catch (err) {
                console.error("Resource fetch error:", err);
                toast.error("Resource sync failure");
            } finally { setLoading(false); }
        };
        fetchResources();
    }, [id, isEdit]);

    useEffect(() => {
        if (!isEdit) {
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

        const catalogMatch = catalogProducts.find(p => p.name?.toLowerCase().trim() === s?.product_name?.toLowerCase().trim());
        if (catalogMatch?.image) {
            setImagePreview(getImageUrl(catalogMatch.image) || null);
        }

        setFormData(prev => ({
            ...prev,
            stock: stockId,
            category: s?.category || prev.category,
            selling_price: '',
            sku: s?.sku || prev.sku,
            barcode: s?.barcode || prev.barcode,
            description: s?.description || catalogMatch?.description || prev.description,
            weight: s?.weight || prev.weight,
            size: s?.size || prev.size
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
            Object.keys(formData).forEach(key => {
                if (key === 'sections') {
                    formData.sections.forEach(s => data.append('sections', s));
                } else if (key === 'category' && !(formData as any).category) {
                    // Category is optional — omit when blank so the backend falls back
                    // to the linked stock's category (or leaves it empty).
                } else if (key === 'original_price' && !(formData as any).original_price) {
                    // Optional compare-at price — omit when blank ('' fails Decimal validation).
                } else {
                    data.append(key, (formData as any)[key]);
                }
            });
            if (image) data.append('image', image);
            gallery.forEach(file => {
                data.append('additional_images', file);
            });

            if (isEdit) { await productService.update(id as string, data); toast.success('Product updated'); }
            else { await productService.create(data); toast.success('Product added'); }
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
            <RefreshCw className="w-10 h-10 animate-spin text-[#4338ca] opacity-20" />
        </div>
    );

    return (
        <div className="bg-[#F8F9FA] min-h-screen pb-20 font-sans text-[#0f172a]">
            <div className="max-w-[1100px] mx-auto px-0 sm:px-6 pt-1 sm:pt-5">

                {/* Breadcrumb */}
                <div className="flex items-center gap-1 text-[12px] text-[#64748b] mb-2">
                    <Link href="/admin/dashboard" className="hover:text-[#4338ca] hover:underline">Dashboard</Link>
                    <ChevronRight size={10} />
                    <Link href="/admin/products" className="hover:text-[#4338ca] hover:underline">Product Registry</Link>
                    <ChevronRight size={10} />
                    <span className="text-[#4338ca]">{isEdit ? 'Update Listing' : 'Add Listing'}</span>
                </div>

                <div className="flex items-center justify-between mb-4">
                    <h1 className="text-2xl font-bold text-slate-900 tracking-tight">{isEdit ? 'Update Product' : 'Add New Product'}</h1>
                    <button onClick={() => router.back()} className="text-[13px] text-[#4f46e5] hover:text-[#4338ca] hover:underline flex items-center gap-1">
                        <ChevronLeft size={14} /> Back to registry
                    </button>
                </div>
                <div className="border-b border-slate-200 mb-8" />

                <form onSubmit={handleSubmit} className="flex flex-col lg:flex-row gap-6 items-start">
                    <div className="flex-1 space-y-6">

                        {/* 1. PRODUCT & STOCK INFO */}
                        <div className="bg-white border border-slate-200/70 rounded-2xl shadow-[0_1px_2px_rgba(15,23,42,0.04)] relative z-[50]">
                            <div className="px-6 py-4 border-b border-slate-100 bg-slate-50/60 rounded-t-2xl">
                                <h2 className="text-[14px] font-bold">1. Product & Stock Info</h2>
                                <p className="text-[12px] text-[#64748b]">Link this product to your warehouse stock.</p>
                            </div>
                            <div className="p-6 space-y-5">
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                                    <ProfessionalSelect
                                        label="Supplier"
                                        value={selectedSupplier}
                                        options={[
                                            { id: 'all', name: `All Suppliers (${allStocks.length} items)` },
                                            ...allSuppliers.map(s => ({ id: s.id, name: s.name }))
                                        ]}
                                        onChange={setSelectedSupplier}
                                        searchable
                                    />
                                    <Field label="Select Stock Item" required>
                                        <StockSelector selectedId={formData.stock} stocks={filteredStocks} catalogProducts={catalogProducts} onSelect={handleStockSelect} />
                                    </Field>
                                </div>

                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 pt-2">
                                    <ProfessionalSelect
                                        label="Product Category"
                                        value={formData.category}
                                        options={allCategories.map(c => ({ id: c.id, name: c.name }))}
                                        onChange={(val: string) => setFormData(p => ({ ...p, category: val }))}
                                        searchable
                                    />

                                    <Field label="Min Count (Low Stock Alert)">
                                        <input
                                            type="number"
                                            min="0"
                                            step="1"
                                            value={formData.min_count}
                                            onChange={e => setFormData(p => ({ ...p, min_count: e.target.value }))}
                                            placeholder="10"
                                            className={inputCls}
                                        />
                                        <p className="text-[11px] text-[#94a3b8] mt-1.5">Alert on the dashboard when stock falls at or below this number.</p>
                                    </Field>

                                </div>

                                {selectedStock && (
                                    <div className="bg-[#F59E0B]/40 border border-[#F59E0B]/15 rounded-lg p-4 animate-in zoom-in-95 mt-2 space-y-4">
                                        <div className="flex gap-4">
                                            <Info className="text-[#4f46e5] shrink-0" size={18} />
                                            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 w-full">
                                                <div><p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Cost Base</p><p className="text-[14px] font-bold">Rs. {Number(selectedGrouped?.price_per_item).toLocaleString()}</p></div>
                                                <div><p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Category</p><p className="text-[14px] font-bold">{selectedGrouped?.category_name || 'Generic'}</p></div>
                                                <div><p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Supplier</p><p className="text-[14px] font-bold truncate">{selectedGrouped?.supplier_name}</p></div>
                                                <div><p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Total Stock</p><p className="text-[14px] font-bold text-emerald-600">{selectedGrouped?.total_quantity} Units</p></div>
                                            </div>
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* 2. PRICING */}
                        <div className={`bg-white border border-slate-200/70 rounded-2xl shadow-[0_1px_2px_rgba(15,23,42,0.04)] overflow-hidden transition-all ${!selectedStock ? 'opacity-30 pointer-events-none grayscale' : ''}`}>
                            <div className="px-6 py-4 border-b border-slate-100 bg-slate-50/60">
                                <h2 className="text-[14px] font-bold">2. Pricing</h2>
                            </div>
                            <div className="p-6 space-y-6">
                                <div className="flex bg-slate-100 border border-slate-200 rounded-lg p-[2px] w-[180px]">
                                    <button type="button" onClick={() => setPricingMode('percent')} className={`flex-1 py-1 text-[11px] font-bold uppercase rounded-md transition-all ${pricingMode === 'percent' ? 'bg-white text-[#1A1A1A] shadow-sm' : 'text-[#64748b]'}`}>Profit %</button>
                                    <button type="button" onClick={() => setPricingMode('manual')} className={`flex-1 py-1 text-[11px] font-bold uppercase rounded-md transition-all ${pricingMode === 'manual' ? 'bg-white text-[#1A1A1A] shadow-sm' : 'text-[#64748b]'}`}>Manual Price</button>
                                </div>

                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                                    <Field label="Profit Percentage (%)">
                                        <input type="number" step="0.1" value={profitPercent} onChange={e => handleProfitChange(e.target.value)} className={inputCls} disabled={pricingMode === 'manual'} />
                                    </Field>
                                    <Field label="Selling Price (Rs.)">
                                        <input type="number" step="0.01" value={sellingPrice} onChange={e => handleSellingPriceChange(e.target.value)} className={inputCls} disabled={pricingMode === 'percent'} />
                                    </Field>
                                </div>

                                <Field label="Compare-at / “Was” Price (Rs.) — optional">
                                    <input
                                        type="number"
                                        step="0.01"
                                        value={formData.original_price}
                                        onChange={e => setFormData(prev => ({ ...prev, original_price: e.target.value }))}
                                        className={inputCls}
                                        placeholder="Leave blank for no discount"
                                    />
                                    <p className="text-[11px] text-slate-400 mt-1">
                                        Set higher than the selling price to show a strikethrough discount and list the item under Deals.
                                    </p>
                                </Field>

                                {sellingPrice && costPrice > 0 && (
                                    <div className={`p-5 rounded-lg border flex items-center justify-between ${parseFloat(sellingPrice) >= costPrice ? 'bg-green-50/30 border-green-100' : 'bg-red-50 border-red-100 animate-pulse'}`}>
                                        <div className="flex items-center gap-4">
                                            <Activity className={parseFloat(sellingPrice) >= costPrice ? 'text-green-600' : 'text-red-600'} size={20} />
                                            <div>
                                                <p className="text-[10px] font-bold uppercase tracking-widest text-[#64748b]">Net Profit</p>
                                                <p className={`text-[18px] font-bold ${parseFloat(sellingPrice) >= costPrice ? 'text-green-700' : 'text-red-600'}`}>Rs. {profitAmount}</p>
                                            </div>
                                        </div>
                                        <div className="text-right">
                                            <p className="text-[10px] font-bold uppercase tracking-widest text-[#64748b]">Final Customer Price</p>
                                            <p className="text-[24px] font-bold text-[#4338ca]">Rs. {parseFloat(sellingPrice).toLocaleString()}</p>
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* 3. OTHER DETAILS */}
                        <div className={`bg-white border border-slate-200/70 rounded-2xl shadow-[0_1px_2px_rgba(15,23,42,0.04)] overflow-hidden transition-all ${!selectedStock ? 'opacity-30 pointer-events-none grayscale' : ''}`}>
                            <div className="px-6 py-4 border-b border-slate-100 bg-slate-50/60">
                                <h2 className="text-[14px] font-bold">3. Other Details</h2>
                            </div>
                            <div className="p-6 space-y-5">
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                                    <Field label="Product SKU">
                                        <input type="text" value={formData.sku} onChange={e => setFormData(p => ({ ...p, sku: e.target.value }))} className={inputCls} placeholder="e.g. PRD-10293" />
                                    </Field>
                                    <Field label="Barcode">
                                        <input type="text" value={formData.barcode} onChange={e => setFormData(p => ({ ...p, barcode: e.target.value }))} className={inputCls} placeholder="e.g. 500123456789" />
                                    </Field>
                                </div>
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                                    <Field label="Weight / Volume">
                                        <input type="text" value={formData.weight} onChange={e => setFormData(p => ({ ...p, weight: e.target.value }))} className={inputCls} placeholder="e.g. 100ml, 50g" />
                                    </Field>
                                    <Field label="Size / Variant">
                                        <input type="text" value={formData.size} onChange={e => setFormData(p => ({ ...p, size: e.target.value }))} className={inputCls} placeholder="e.g. Small, XL, Matte" />
                                    </Field>
                                </div>
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                                    <ProfessionalSelect
                                        label="Product Badge"
                                        value={formData.badge}
                                        options={[
                                            { id: '', name: 'No Badge' },
                                            { id: 'NEW', name: 'New Arrival' },
                                            { id: 'HOT', name: 'Hot Deal' },
                                            { id: 'SALE', name: 'On Sale' },
                                            { id: 'FEATURED', name: 'Featured' },
                                            { id: 'TOP_RATED', name: 'Top Rated' },
                                            { id: 'BEST_SELLER', name: 'Best Seller' },
                                            { id: 'LIMITED', name: 'Limited Edition' },
                                            { id: 'TRENDING', name: 'Trending' },
                                            { id: 'PREMIUM', name: 'Premium Quality' },
                                            { id: 'ORGANIC', name: 'Organic' },
                                            { id: 'CLEARANCE', name: 'Clearance' }
                                        ]}
                                        onChange={(val: string) => setFormData(p => ({ ...p, badge: val }))}
                                    />
                                    <ProfessionalSelect
                                        label="Show on Website"
                                        value={formData.status}
                                        options={[
                                            { id: 'ACTIVE', name: 'Yes, show product' },
                                            { id: 'INACTIVE', name: 'No, hide it' }
                                        ]}
                                        onChange={(val: string) => setFormData(p => ({ ...p, status: val }))}
                                    />
                                </div>
                                <Field label="Product Description">
                                    <textarea rows={4} className={`${inputCls} !h-auto py-2`} value={formData.description} onChange={e => setFormData(p => ({ ...p, description: e.target.value }))} placeholder="Enter product details..." />
                                </Field>
                            </div>
                        </div>
                    </div>

                    <aside className="w-full lg:w-[320px] shrink-0 space-y-4 lg:sticky lg:top-4">
                        <div className="bg-white border border-slate-200/70 rounded-2xl shadow-[0_1px_2px_rgba(15,23,42,0.04)] overflow-hidden">
                            <div className="px-5 py-4 border-b border-slate-100 bg-slate-50/60">
                                <h3 className="text-[14px] font-bold text-center">Product Image</h3>
                            </div>
                            <div className="p-6 text-center">
                                <div
                                    onClick={() => fileInputRef.current?.click()}
                                    onDragOver={(e) => { e.preventDefault(); setIsDraggingMain(true); }}
                                    onDragLeave={() => setIsDraggingMain(false)}
                                    onDrop={(e) => handleDrop(e, 'main')}
                                    className={`aspect-square bg-slate-50 border-2 border-dashed rounded-lg flex items-center justify-center relative overflow-hidden cursor-pointer transition-all group ${isDraggingMain ? 'border-[#4f46e5] bg-[#F59E0B]/10' : 'border-slate-300 hover:border-[#4f46e5]'}`}
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

                                <div className="mt-6 text-left">
                                    <h4 className="text-[11px] font-bold text-[#64748b] uppercase tracking-widest mb-3">Gallery Pictures</h4>
                                    <div
                                        onDragOver={(e) => { e.preventDefault(); setIsDraggingGallery(true); }}
                                        onDragLeave={() => setIsDraggingGallery(false)}
                                        onDrop={(e) => handleDrop(e, 'gallery')}
                                        className={`grid grid-cols-4 gap-2 p-2 rounded-xl transition-colors ${isDraggingGallery ? 'bg-[#F59E0B]/10 border border-dashed border-[#4f46e5]' : ''}`}
                                    >
                                        {galleryPreviews.map((src, i) => (
                                            <div key={i} className="aspect-square bg-white border border-slate-200 rounded-md relative group overflow-hidden">
                                                <img src={src} className="w-full h-full object-cover" />
                                                <button type="button" onClick={() => removeGalleryImage(i)} className="absolute top-0 right-0 bg-black/50 text-white p-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                                                    <X size={10} />
                                                </button>
                                            </div>
                                        ))}
                                        <button type="button" onClick={() => galleryInputRef.current?.click()} className="aspect-square border border-dashed border-slate-300 rounded-md flex items-center justify-center hover:bg-slate-50 transition-colors">
                                            <Plus size={16} className="text-[#64748b]" />
                                        </button>
                                    </div>
                                    <input type="file" ref={galleryInputRef} className="hidden" accept="image/*" multiple onChange={handleGalleryChange} />
                                </div>

                                <div className="mt-8 space-y-3 pt-6 border-t border-slate-100">
                                    <Btn className="w-full text-[14px] justify-center" onClick={handleSubmit} loading={saving}>
                                        <Save size={14} /> {isEdit ? 'Update Listing' : 'Add Listing'}
                                    </Btn>
                                    <button onClick={() => router.push('/admin/products')} className="w-full text-[12px] text-[#64748b] hover:text-[#4338ca] hover:underline text-center">
                                        Discard
                                    </button>
                                </div>
                            </div>
                        </div>
                        <div className="bg-[#F59E0B]/60 border border-[#F59E0B]/15 rounded-xl p-4 flex gap-3">
                            <ShieldCheck className="text-[#1A1A1A] shrink-0" size={20} />
                            <p className="text-[12px] text-[#64748b] leading-relaxed italic">Products are linked to their source stock signatures for data integrity.</p>
                        </div>
                    </aside>
                </form>
            </div>
        </div>
    );
}
