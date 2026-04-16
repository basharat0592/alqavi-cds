"use client";

import React, { useState, useEffect, useRef } from 'react';
import { useRouter, useParams } from 'next/navigation';
import {
    Package, RefreshCw, ChevronRight, ChevronLeft, Image as ImageIcon,
    Activity, ShieldCheck, Save, DollarSign, Percent, ArrowRight,
    Search, Info, CheckCircle
} from 'lucide-react';
import { productService, inventoryService } from '@/lib/api';
import { companyService } from '@/services/company.service';
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

export default function AddEditProductPage() {
    const router = useRouter();
    const { id } = useParams();
    const isEdit = !!id;

    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);

    const [allStocks, setAllStocks] = useState<any[]>([]);
    const [allSuppliers, setAllSuppliers] = useState<any[]>([]);
    const [selectedSupplier, setSelectedSupplier] = useState<string>('all');
    const [filteredStocks, setFilteredStocks] = useState<any[]>([]);
    const [selectedStock, setSelectedStock] = useState<any | null>(null);

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
            } catch { toast.error("Resource sync failure"); } finally { setLoading(false); }
        };
        fetchResources();
    }, [id, isEdit]);

    useEffect(() => {
        if (selectedSupplier === 'all') {
            setFilteredStocks(allStocks);
        } else {
            setFilteredStocks(allStocks.filter(s => s.supplier?.toString() === selectedSupplier || s.supplier_name?.toLowerCase() === allSuppliers.find(sup => sup.id?.toString() === selectedSupplier)?.name?.toLowerCase()));
        }
        setSelectedStock(null);
        setSellingPrice('');
        setProfitPercent('');
        setFormData(prev => ({ ...prev, stock: '', selling_price: '' }));
    }, [selectedSupplier, allStocks]);

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
        if (file) { setImage(file); setImagePreview(URL.createObjectURL(file)); }
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

            if (isEdit) { await productService.update(id as string, data); toast.success('SKU updated'); } 
            else { await productService.create(data); toast.success('SKU registered'); }
            router.push('/admin/products');
        } catch { toast.error('Sync failure'); } finally { setSaving(false); }
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
                        <div className="bg-white border border-[#ddd] rounded-[4px] shadow-sm overflow-hidden">
                            <div className="px-6 py-4 border-b border-[#ddd] bg-[#f7f8fa]">
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
                                        <select className={selectCls} value={formData.stock} onChange={e => handleStockSelect(e.target.value)}>
                                            <option value="">-- Choose Stock Entry --</option>
                                            {filteredStocks.map(s => <option key={s.id} value={s.id}>{s.product_name} ({s.total_quantity} units)</option>)}
                                        </select>
                                    </Field>
                                </div>

                                {selectedStock && (
                                    <div className="bg-[#fcfdff] border border-blue-100 rounded-[3px] p-4 flex gap-4 animate-in zoom-in-95 mt-2">
                                        <Info className="text-[#007185] shrink-0" size={18} />
                                        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 w-full">
                                            <div><p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Cost Base</p><p className="text-[14px] font-bold">Rs. {Number(selectedStock.price_per_item).toLocaleString()}</p></div>
                                            <div><p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Category</p><p className="text-[14px] font-bold">{selectedStock.category_name || 'Generic'}</p></div>
                                            <div><p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Supplier</p><p className="text-[14px] font-bold truncate">{selectedStock.supplier_name}</p></div>
                                            <div><p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Density</p><p className="text-[14px] font-bold">{selectedStock.total_quantity} Units</p></div>
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
                                <div onClick={() => fileInputRef.current?.click()} className="aspect-square bg-[#fcfcfc] border border-dashed border-[#adb1b8] rounded-[3px] flex items-center justify-center relative overflow-hidden cursor-pointer hover:border-[#e77600] transition-colors group">
                                    {imagePreview ? (
                                        <img src={imagePreview} className="w-full h-full object-contain p-2" alt="Preview" />
                                    ) : (
                                        <div className="flex flex-col items-center opacity-30 group-hover:opacity-100">
                                            <ImageIcon size={32} />
                                            <p className="text-[11px] font-bold mt-2 uppercase">Attach Image</p>
                                        </div>
                                    )}
                                    <input type="file" ref={fileInputRef} className="hidden" accept="image/*" onChange={handleImageChange} />
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
