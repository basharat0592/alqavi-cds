'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useRouter, useParams } from 'next/navigation';
import {
    Loader2, Image as ImageIcon, Plus, X,
    ChevronLeft, HelpCircle, Info, Save, Upload, DollarSign, Tag, ShieldCheck
} from 'lucide-react';
import { productService, sectionService, categoryService } from '@/lib/api';
import { getImageUrl } from '@/lib/utils';
import toast from 'react-hot-toast';

// ── Shared UI Styles ────────────────────────────────────────────────────────
const labelCls = `text-[13px] font-bold text-[#111] mb-1.5 block`;
const inputCls = `w-full px-3 py-2 bg-white border border-[#a6a6a6] rounded-[3px] text-[13px] outline-none focus:border-[#e77600] focus:ring-1 focus:ring-[#e77600] transition-shadow shadow-inner-sm placeholder:text-gray-400`;
const cardCls = `bg-white border border-[#ddd] rounded-lg shadow-sm overflow-hidden mb-6`;

export default function EditSupplierProductAmazon() {
    const router = useRouter();
    const { id } = useParams() as { id: string };

    const [saving, setSaving] = useState(false);
    const [categories, setCategories] = useState<any[]>([]);
    const [mainCategories, setMainCategories] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    const [formData, setFormData] = useState({
        name: '',
        description: '',
        category: '',
        main_category: '',
        price: '',
        cost: '',
        retail_price: '',
        sku: '',
        barcode: '',
        status: 'active',
        batch_number: 'INITIAL-LOG',
        quantity_in_stock: '0',
        is_supplier_only: 'true',
        weight: '',
        size: '',
    });

    const [mainImage, setMainImage] = useState<File | null>(null);
    const [mainImagePreview, setMainImagePreview] = useState<string | null>(null);
    const [additionalImages, setAdditionalImages] = useState<File[]>([]);
    const [existingImages, setExistingImages] = useState<any[]>([]);

    const fileInputRef = useRef<HTMLInputElement>(null);
    const galleryInputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        const fetchMeta = async () => {
            try {
                const [catRes, mCatRes, productData] = await Promise.all([
                    categoryService.getAll(),
                    sectionService.getAll(),
                    productService.getByIdSupplier(id)
                ]);

                setCategories(Array.isArray(catRes) ? catRes : (catRes as any)?.results || []);
                setMainCategories(Array.isArray(mCatRes) ? mCatRes : (mCatRes as any)?.results || []);

                if (productData) {
                    setFormData({
                        name: productData.name || '',
                        description: productData.description || '',
                        category: productData.category?.id?.toString() || productData.category?.toString() || '',
                        main_category: productData.main_categories && productData.main_categories.length > 0 ? productData.main_categories[0].id?.toString() : '',
                        price: productData.retail_price?.toString() || '', // In Add page price maps to retail_price
                        cost: productData.cost_price?.toString() || '',
                        retail_price: productData.retail_price?.toString() || '',
                        sku: productData.sku || '',
                        barcode: productData.barcode || '',
                        status: productData.status || 'active',
                        batch_number: productData.batch_number || 'INITIAL-LOG',
                        quantity_in_stock: productData.quantity?.toString() || '0',
                        is_supplier_only: String(productData.is_supplier_only ?? true),
                        weight: productData.weight || '',
                        size: productData.size || '',
                    });

                    if (productData.image) {
                        setMainImagePreview(getImageUrl(productData.image) || null);
                    }
                    if (productData.images) {
                        setExistingImages(productData.images);
                    }
                }
            } catch (err) {
                console.error("Failed to load metadata", err);
                toast.error("Failed to synchronize edit data.");
            } finally {
                setLoading(false);
            }
        };
        fetchMeta();
    }, [id]);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const handleMainImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            setMainImage(file);
            setMainImagePreview(URL.createObjectURL(file));
        }
    };

    const handleGalleryChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files) {
            const files = Array.from(e.target.files);
            setAdditionalImages(prev => [...prev, ...files]);
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!formData.name || !formData.price) {
            toast.error("Required fields are missing.");
            return;
        }

        setSaving(true);
        try {
            const data = new FormData();
            data.append('name', formData.name);
            data.append('description', formData.description);
            if (formData.category) data.append('category', formData.category);
            data.append('retail_price', formData.price);
            data.append('price', formData.price);
            data.append('cost_price', formData.cost || '0');
            data.append('quantity', formData.quantity_in_stock || '0');
            if (formData.sku) data.append('sku', formData.sku);
            if (formData.barcode) data.append('barcode', formData.barcode);
            data.append('is_supplier_only', formData.is_supplier_only);
            if (formData.weight) data.append('weight', formData.weight);
            if (formData.size) data.append('size', formData.size);

            if (mainImage) data.append('image', mainImage);
            additionalImages.forEach(file => data.append('upload_images', file));

            await productService.updateSupplier(id, data);
            toast.success("Product updated successfully.");
            router.push('/supplier/products');
        } catch (err: any) {
            console.error("Submit error:", err.response?.data);
            const errorData = err.response?.data;
            if (errorData) {
                if (errorData.error) {
                    toast.error(errorData.error);
                } else {
                    const firstKey = Object.keys(errorData)[0];
                    const firstError = Array.isArray(errorData[firstKey]) ? errorData[firstKey][0] : errorData[firstKey];
                    toast.error(`${firstKey}: ${firstError}`);
                }
            } else {
                toast.error("Failed to update product.");
            }
        } finally {
            setSaving(false);
        }
    };

    if (loading) return (
        <div className="flex flex-col h-[60vh] items-center justify-center space-y-4">
            <Loader2 className="h-10 w-10 text-[#f0c14b] animate-spin" />
            <p className="text-[13px] text-gray-500 font-medium tracking-tight">Loading...</p>
        </div>
    );

    return (
        <div className="max-w-[1000px] mx-auto animate-in fade-in duration-500 font-sans">
                
                {/* Back Nav */}
                <div className="mb-6">
                    <button onClick={() => router.back()} className="text-[13px] text-[#007185] hover:text-[#c45500] hover:underline flex items-center gap-1">
                        <ChevronLeft size={16} /> Back to Products
                    </button>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
                    
                    {/* Left Sidebar Info */}
                    <div className="lg:col-span-1 hidden lg:block">
                        <div className="bg-white border border-[#ddd] rounded-lg p-5 sticky top-8">
                            <h3 className="text-[13px] font-bold text-[#111] mb-4">Edit Product Data</h3>
                            <div className="space-y-4 text-[13px] font-medium text-gray-500">
                                <div className="flex items-center gap-2 text-amber-600">
                                    <div className="h-2 w-2 rounded-full bg-amber-600" /> Basic Info
                                </div>
                                <div className="flex items-center gap-2">
                                    <div className="h-2 w-2 rounded-full bg-gray-300" /> Price & Stock
                                </div>
                                <div className="flex items-center gap-2">
                                    <div className="h-2 w-2 rounded-full bg-gray-300" /> Images
                                </div>
                            </div>
                            <div className="mt-8 pt-4 border-t border-[#eee]">
                                <div className="flex items-start gap-2 p-3 bg-amber-50 rounded text-[11px] text-amber-700 leading-tight font-medium">
                                    <Info size={14} className="shrink-0" />
                                    <span>Updating existing SKU details.</span>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Main Content Area */}
                    <div className="lg:col-span-3">
                        <div className="mb-6 border-b border-gray-200 pb-4">
                            <h2 className="text-3xl font-medium text-slate-900">Edit Product</h2>
                        </div>

                        <form onSubmit={handleSubmit} className="space-y-6">
                            {/* Section 1: Basic Information */}
                            <div className={cardCls}>
                                <div className="px-6 py-4 bg-[#f8f8f8] border-b border-[#ddd]">
                                    <h3 className="text-[15px] font-bold text-[#111] flex items-center gap-2">
                                        <Tag size={16} className="text-gray-400" /> Basic Information
                                    </h3>
                                </div>
                                <div className="p-8 space-y-6 max-w-[600px]">
                                    <div>
                                        <label className={labelCls}>Product Name</label>
                                        <input 
                                            name="name" value={formData.name} onChange={handleChange} required
                                            placeholder="Example: Al-Qavi Radiance Serum"
                                            className={inputCls}
                                        />
                                    </div>

                                    <div className="grid grid-cols-2 gap-6">
                                        <div>
                                            <label className={labelCls}>Product Weight (e.g. 500g)</label>
                                            <input name="weight" value={formData.weight} onChange={handleChange} placeholder="Weight" className={inputCls} />
                                        </div>
                                        <div>
                                            <label className={labelCls}>Product Type / Variant</label>
                                            <input name="size" value={formData.size} onChange={handleChange} placeholder="e.g. Liquid, Powder, XL" className={inputCls} />
                                        </div>
                                    </div>


                                    <div className="grid grid-cols-2 gap-6">
                                        <div>
                                            <label className={labelCls}>Barcode (EAN/UPC)</label>
                                            <input name="barcode" value={formData.barcode} onChange={handleChange} placeholder="13-digit code" className={inputCls} />
                                        </div>
                                        <div>
                                            <label className={labelCls}>SKU Number</label>
                                            <input name="sku" value={formData.sku} onChange={handleChange} placeholder="e.g. AQ-99X" className={inputCls} />
                                        </div>
                                    </div>
                                    
                                </div>
                            </div>

                            {/* Section 2: Pricing & Inventory */}
                            <div className={cardCls}>
                                <div className="px-6 py-4 bg-[#f8f8f8] border-b border-[#ddd]">
                                    <h3 className="text-[15px] font-bold text-[#111] flex items-center gap-2">
                                        <DollarSign size={16} className="text-gray-400" /> Pricing & Inventory
                                    </h3>
                                </div>
                                <div className="p-8 space-y-6 max-w-[600px]">
                                    <div className="grid grid-cols-2 gap-6">
                                        <div>
                                            <label className={labelCls}>Your Selling Price (PKR)</label>
                                            <div className="relative">
                                                <div className="absolute left-3 top-1/2 -translate-y-1/2 text-[13px] text-gray-500 font-bold">Rs.</div>
                                                <input 
                                                    name="price" value={formData.price} onChange={handleChange} required type="number"
                                                    placeholder="0" className={inputCls + " pl-10"} 
                                                />
                                            </div>
                                        </div>
                                        <div>
                                            <label className={labelCls}>Available Stock</label>
                                            <input name="quantity_in_stock" value={formData.quantity_in_stock} onChange={handleChange} type="number" className={inputCls} />
                                        </div>
                                    </div>
                                    <div>
                                        <label className={labelCls}>Product Description</label>
                                        <textarea 
                                            name="description" value={formData.description} onChange={handleChange} rows={5}
                                            className={inputCls + " resize-none"}
                                            placeholder="Describe your product here..."
                                        />
                                    </div>
                                </div>
                            </div>

                            {/* Section 3: Product Images */}
                            <div className={cardCls}>
                                <div className="px-6 py-4 bg-[#f8f8f8] border-b border-[#ddd]">
                                    <h3 className="text-[15px] font-bold text-[#111] flex items-center gap-2">
                                        <ImageIcon size={16} className="text-gray-400" /> Product Images
                                    </h3>
                                </div>
                                <div className="p-8 space-y-8">
                                    <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
                                        <div className="md:col-span-1 space-y-2 text-center md:text-left">
                                            <p className={labelCls}>Main Image</p>
                                            <div 
                                                onClick={() => fileInputRef.current?.click()}
                                                className="aspect-square bg-white border border-[#ddd] rounded-lg flex flex-col items-center justify-center cursor-pointer transition-all overflow-hidden relative group p-2"
                                            >
                                                {mainImagePreview ? (
                                                    <img src={mainImagePreview} className="h-full w-full object-contain" alt="" />
                                                ) : (
                                                    <div className="text-center">
                                                        <Upload size={32} className="text-gray-300 mx-auto" />
                                                        <p className="text-[11px] text-gray-400 mt-1">Upload Image</p>
                                                    </div>
                                                )}
                                                <input type="file" ref={fileInputRef} className="hidden" accept="image/*" onChange={handleMainImageChange} />
                                            </div>
                                        </div>

                                        <div className="md:col-span-3 space-y-2">
                                            <p className={labelCls}>More Images (Gallery)</p>
                                            <div className="flex flex-wrap gap-4">
                                                {/* Existing Images */}
                                                {existingImages.map((img, i) => (
                                                    <div key={i} className="h-24 w-24 rounded border border-[#ddd] overflow-hidden relative group shadow-sm">
                                                        <img src={getImageUrl(img.image) || ""} className="h-full w-full object-cover" alt="" />
                                                    </div>
                                                ))}
                                                {/* New Images */}
                                                {additionalImages.map((file, i) => (
                                                    <div key={`new-${i}`} className="h-24 w-24 rounded border border-[#ff9900] overflow-hidden relative group shadow-sm">
                                                        <img src={URL.createObjectURL(file)} className="h-full w-full object-cover" alt="" />
                                                        <button 
                                                            type="button"
                                                            onClick={() => setAdditionalImages(prev => prev.filter((_, idx) => idx !== i))}
                                                            className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 flex items-center justify-center text-white"
                                                        >
                                                            <X size={16} />
                                                        </button>
                                                    </div>
                                                ))}
                                                <button 
                                                    type="button"
                                                    onClick={() => galleryInputRef.current?.click()}
                                                    className="h-24 w-24 rounded bg-[#f8f8f8] border border-dashed border-[#ddd] flex items-center justify-center text-gray-400 hover:border-[#ff9900]"
                                                >
                                                    <Plus />
                                                </button>
                                                <input type="file" ref={galleryInputRef} className="hidden" multiple accept="image/*" onChange={handleGalleryChange} />
                                            </div>
                                        </div>
                                    </div>

                                    <div className="p-5 bg-gray-900 rounded-lg text-white/90 relative overflow-hidden">
                                        <div className="absolute top-0 right-0 p-8 opacity-10 rotate-12">
                                            <ShieldCheck size={100} />
                                        </div>
                                        <div className="relative z-10 flex items-start gap-4">
                                            <Info size={16} className="text-amber-400 shrink-0 mt-0.5" />
                                            <div>
                                                <p className="text-[13px] font-bold uppercase tracking-tight mb-2">Image Guidelines</p>
                                                <ul className="text-[11px] space-y-1 opacity-80 list-disc list-inside">
                                                    <li>Large high-quality images work best.</li>
                                                    <li>Use clear, plain backgrounds.</li>
                                                    <li>Do not include text or watermarks on images.</li>
                                                </ul>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Form Actions */}
                            <div className="bg-white border border-[#ddd] rounded-lg p-6 flex items-center justify-end gap-3 mt-8 shadow-sm">
                                <button type="button" onClick={() => router.back()} className="px-8 py-2 bg-white border border-[#adb1b8] rounded-[3px] text-[13px] font-medium hover:bg-gray-50 transition-colors">Cancel</button>
                                <button 
                                    type="submit" 
                                    disabled={saving} 
                                    className="px-12 py-2 bg-[#f0c14b] border border-[#a88734] hover:bg-[#ebbd40] rounded-[3px] text-[13px] font-bold shadow-sm flex items-center gap-2"
                                >
                                    {saving ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
                                    Save Changes
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            </div>
    );
}
