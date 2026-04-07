'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { 
    Loader2, Image as ImageIcon, Plus, X, 
    ChevronLeft, HelpCircle, Info
} from 'lucide-react';
import { productService, mainCategoryService, categoryService } from '@/lib/api';
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
                    mainCategoryService.getAll(),
                    productService.getById(id)
                ]);
                
                setCategories(catRes || []);
                setMainCategories(mCatRes || []);
                
                // Pre-populate form
                if (productData) {
                    setFormData({
                        name: productData.name || '',
                        description: productData.description || '',
                        category: productData.category?.id?.toString() || productData.category?.toString() || '',
                        main_category: productData.main_categories && productData.main_categories.length > 0 ? productData.main_categories[0].id?.toString() : '',
                        price: productData.price?.toString() || '',
                        cost: productData.cost?.toString() || '',
                        retail_price: productData.retail_price?.toString() || '',
                        sku: productData.sku || '',
                        barcode: productData.barcode || '',
                        status: productData.status || 'active',
                        batch_number: productData.batch_number || 'INITIAL-LOG',
                        quantity_in_stock: productData.quantity_in_stock?.toString() || '0',
                    });
                    
                    if (productData.image) {
                        setMainImagePreview(getImageUrl(productData.image));
                    }
                    if (productData.images) {
                        setExistingImages(productData.images);
                    }
                }
            } catch (err) {
                console.error("Failed to load metadata or product", err);
                toast.error("Failed to load product details.");
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
        setSaving(true);
        try {
            const data = new FormData();
            Object.keys(formData).forEach(key => {
                const val = (formData as any)[key];
                if (val !== undefined && val !== '') {
                    data.append(key, val);
                }
            });

            if (mainImage) data.append('image', mainImage);
            additionalImages.forEach(file => data.append('upload_images', file));
            
            if (formData.main_category) {
                data.append('main_categories', formData.main_category);
            }

            await productService.update(id, data);
            toast.success("Product successfully updated.");
            router.push('/supplier/products');
        } catch (err: any) {
            console.error(err);
            toast.error(err.response?.data?.error || "Failed to update product.");
        } finally {
            setSaving(false);
        }
    };

    if (loading) return (
        <div className="flex flex-col h-[60vh] items-center justify-center space-y-4">
            <Loader2 className="h-10 w-10 text-[#f0c14b] animate-spin" />
            <p className="text-[13px] text-gray-500 font-medium">Refining Listing Details...</p>
        </div>
    );

    return (
        <div className="min-h-screen bg-[#f3f3f3] pb-24 font-sans">
            <div className="max-w-[1240px] mx-auto px-6 pt-8">
                
                {/* Back Nav */}
                <div className="mb-6">
                    <button onClick={() => router.back()} className="text-[13px] text-[#007185] hover:text-[#c45500] hover:underline flex items-center gap-1">
                        <ChevronLeft size={16} /> Back to listing tool
                    </button>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
                    
                    {/* Left Panel */}
                    <div className="lg:col-span-1 hidden lg:block">
                        <div className="bg-white border border-[#ddd] rounded-lg p-5 sticky top-8">
                            <h3 className="text-[13px] font-bold text-[#111] mb-4">Edit Configuration</h3>
                            <div className="space-y-4">
                                <div className="flex items-center gap-3 text-[13px] text-[#ff9900] font-bold">
                                    <div className="w-5 h-5 rounded-full border-2 border-[#ff9900] flex items-center justify-center text-[10px]">1</div>
                                    Vital Info
                                </div>
                                <div className="flex items-center gap-3 text-[13px] text-gray-400 font-medium">
                                    <div className="w-5 h-5 rounded-full border-2 border-gray-200 flex items-center justify-center text-[10px]">2</div>
                                    Offer
                                </div>
                                <div className="flex items-center gap-3 text-[13px] text-gray-400 font-medium">
                                    <div className="w-5 h-5 rounded-full border-2 border-gray-200 flex items-center justify-center text-[10px]">3</div>
                                    Images
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Main Content */}
                    <div className="lg:col-span-3">
                        <div className="mb-6">
                            <h2 className="text-2xl font-medium text-[#111]">Edit Product: {formData.name}</h2>
                            <p className="text-[13px] text-gray-600 mt-1">Update your existing marketplace listing.</p>
                        </div>

                        <form onSubmit={handleSubmit} className="space-y-6">
                            
                            {/* Vital Info */}
                            <div className={cardCls}>
                                <div className="px-6 py-4 bg-[#f8f8f8] border-b border-[#ddd]">
                                    <h3 className="text-[15px] font-bold text-[#111]">Vital Info</h3>
                                </div>
                                <div className="p-8 space-y-6 max-w-[600px]">
                                    <div>
                                        <label className={labelCls}>Product Name</label>
                                        <input 
                                            name="name"
                                            value={formData.name}
                                            onChange={handleChange}
                                            required
                                            className={inputCls}
                                        />
                                    </div>

                                    <div className="grid grid-cols-2 gap-6">
                                        <div>
                                            <label className={labelCls}>Main Category</label>
                                            <select name="main_category" value={formData.main_category} onChange={handleChange} className={inputCls}>
                                                <option value="">Select Category</option>
                                                {mainCategories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                                            </select>
                                        </div>
                                        <div>
                                            <label className={labelCls}>Sub Category</label>
                                            <select name="category" value={formData.category} onChange={handleChange} className={inputCls}>
                                                <option value="">Select Sub-Category</option>
                                                {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                                            </select>
                                        </div>
                                    </div>

                                    <div>
                                        <label className={labelCls}>External Product ID</label>
                                        <input name="barcode" value={formData.barcode} onChange={handleChange} className={inputCls} />
                                    </div>
                                </div>
                            </div>

                            {/* Offer */}
                            <div className={cardCls}>
                                <div className="px-6 py-4 bg-[#f8f8f8] border-b border-[#ddd]">
                                    <h3 className="text-[15px] font-bold text-[#111]">Offer</h3>
                                </div>
                                <div className="p-8 space-y-6 max-w-[600px]">
                                    <div className="grid grid-cols-2 gap-6">
                                        <div>
                                            <label className={labelCls}>Your Price (PKR)</label>
                                            <div className="relative">
                                                <div className="absolute left-3 top-1/2 -translate-y-1/2 text-[13px] text-gray-500 font-bold">Rs.</div>
                                                <input 
                                                    name="price"
                                                    value={formData.price}
                                                    onChange={handleChange}
                                                    required
                                                    type="number"
                                                    className={inputCls + " pl-10"} 
                                                />
                                            </div>
                                        </div>
                                        <div>
                                            <label className={labelCls}>Stock Units</label>
                                            <input 
                                                name="quantity_in_stock" 
                                                value={formData.quantity_in_stock} 
                                                onChange={handleChange} 
                                                type="number"
                                                className={inputCls} 
                                            />
                                        </div>
                                    </div>

                                    <div>
                                        <label className={labelCls}>Seller SKU</label>
                                        <input name="sku" value={formData.sku} onChange={handleChange} className={inputCls} />
                                    </div>

                                    <div>
                                        <label className={labelCls}>Product Description</label>
                                        <textarea 
                                            name="description"
                                            value={formData.description}
                                            onChange={handleChange}
                                            rows={6}
                                            className={inputCls + " resize-none"}
                                        />
                                    </div>
                                </div>
                            </div>

                            {/* Images */}
                            <div className={cardCls}>
                                <div className="px-6 py-4 bg-[#f8f8f8] border-b border-[#ddd]">
                                    <h3 className="text-[15px] font-bold text-[#111]">Images</h3>
                                </div>
                                <div className="p-8 space-y-8">
                                    <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                                        <div className="md:col-span-1 space-y-2">
                                            <p className="text-[13px] font-bold text-gray-700">Main Image</p>
                                            <div 
                                                onClick={() => fileInputRef.current?.click()}
                                                className="aspect-square bg-white border border-[#ddd] rounded-lg flex flex-col items-center justify-center cursor-pointer overflow-hidden p-2"
                                            >
                                                {mainImagePreview ? (
                                                    <img src={mainImagePreview} alt="Preview" className="max-w-full max-h-full object-contain" />
                                                ) : (
                                                    <div className="text-center">
                                                        <ImageIcon className="h-8 w-8 text-gray-300 mx-auto" />
                                                        <p className="text-[11px] text-gray-400">Add Image</p>
                                                    </div>
                                                )}
                                                <input type="file" ref={fileInputRef} className="hidden" accept="image/*" onChange={handleMainImageChange} />
                                            </div>
                                        </div>
                                        
                                        <div className="md:col-span-3">
                                            <p className="text-[13px] font-bold text-gray-700 mb-2">Manage Gallery</p>
                                            <div className="grid grid-cols-4 sm:grid-cols-6 gap-3">
                                                {/* Existing Images */}
                                                {existingImages.map((img, i) => (
                                                    <div key={i} className="aspect-square border border-[#ddd] rounded-md overflow-hidden bg-white">
                                                        <img src={getImageUrl(img.image)} alt="" className="w-full h-full object-cover" />
                                                    </div>
                                                ))}
                                                {/* New Images */}
                                                {additionalImages.map((file, i) => (
                                                    <div key={`new-${i}`} className="aspect-square border border-[#ff9900] rounded-md overflow-hidden relative group">
                                                        <img src={URL.createObjectURL(file)} alt="" className="w-full h-full object-cover" />
                                                        <button 
                                                            type="button" 
                                                            onClick={() => setAdditionalImages(prev => prev.filter((_, idx) => idx !== i))}
                                                            className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 flex items-center justify-center text-white"
                                                        >
                                                            <X size={14} />
                                                        </button>
                                                    </div>
                                                ))}
                                                <button 
                                                    type="button"
                                                    onClick={() => galleryInputRef.current?.click()}
                                                    className="aspect-square bg-[#f8f8f8] border border-dashed border-[#ddd] rounded-md flex items-center justify-center text-gray-400"
                                                >
                                                    <Plus />
                                                </button>
                                                <input type="file" ref={galleryInputRef} className="hidden" multiple accept="image/*" onChange={handleGalleryChange} />
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Actions */}
                            <div className="bg-white border border-[#ddd] rounded-lg p-6 flex items-center justify-end gap-3 sticky bottom-4 shadow-xl">
                                <button type="button" onClick={() => router.back()} className="px-6 py-1.5 bg-white border border-[#adb1b8] rounded-[3px] text-[13px] font-medium">Cancel</button>
                                <button 
                                    type="submit"
                                    disabled={saving}
                                    className="px-8 py-1.5 bg-[#f0c14b] border border-[#a88734] hover:bg-[#ebbd40] rounded-[3px] text-[13px] font-medium shadow-sm flex items-center gap-2"
                                >
                                    {saving ? <Loader2 size={16} className="animate-spin" /> : null}
                                    {saving ? 'Updating...' : 'Save and finish'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            </div>
        </div>
    );
}
