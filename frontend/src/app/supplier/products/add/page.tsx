'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import {
    Package, ArrowLeft, Upload, DollarSign, Box, Tag, Info,
    ChevronRight, Save, Loader2, Image as ImageIcon, Plus, X, Layers,
    ChevronLeft, ExternalLink, HelpCircle
} from 'lucide-react';
import Link from 'next/link';
import api from '@/lib/axios';
import { getImageUrl } from '@/lib/utils';
import { productService, mainCategoryService, categoryService } from '@/lib/api';
import toast from 'react-hot-toast';

// ── Shared UI Styles ────────────────────────────────────────────────────────
const labelCls = `text-[13px] font-bold text-[#111] mb-1.5 block`;
const inputCls = `w-full px-3 py-2 bg-white border border-[#a6a6a6] rounded-[3px] text-[13px] outline-none focus:border-[#e77600] focus:ring-1 focus:ring-[#e77600] transition-shadow shadow-inner-sm placeholder:text-gray-400`;
const sectionHeaderCls = `text-[17px] font-bold text-[#111] border-b border-[#e7e7e7] pb-2 mb-6 uppercase tracking-tight`;
const cardCls = `bg-white border border-[#ddd] rounded-lg shadow-sm overflow-hidden mb-6`;

export default function AddSupplierProductAmazon() {
    const router = useRouter();
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
        is_supplier_only: 'true', // Default to true (hidden from admin catalog by default)
    });

    const [mainImage, setMainImage] = useState<File | null>(null);
    const [mainImagePreview, setMainImagePreview] = useState<string | null>(null);
    const [additionalImages, setAdditionalImages] = useState<File[]>([]);

    const fileInputRef = useRef<HTMLInputElement>(null);
    const galleryInputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        const fetchMeta = async () => {
            try {
                const [catRes, mCatRes] = await Promise.allSettled([
                    categoryService.getAll(),
                    mainCategoryService.getAll()
                ]);
                setCategories(catRes.status === 'fulfilled' ? (catRes.value || []) : []);
                setMainCategories(mCatRes.status === 'fulfilled' ? (mCatRes.value || []) : []);
            } catch (err) {
                console.error("Failed to load metadata", err);
            } finally {
                setLoading(false);
            }
        };
        fetchMeta();
    }, []);

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
            toast.error("Required fields missing.");
            return;
        }

        setSaving(true);
        try {
            const data = new FormData();

            // Map form keys to backend SupplierProduct schema
            data.append('name', formData.name);
            data.append('description', formData.description);
            if (formData.category) data.append('category', formData.category);
            data.append('retail_price', formData.price);
            data.append('cost_price', formData.cost || '0');
            data.append('quantity', formData.quantity_in_stock || '0');
            data.append('sku', formData.sku);
            data.append('barcode', formData.barcode);

            if (mainImage) data.append('image', mainImage);
            additionalImages.forEach(file => data.append('upload_images', file));

            await productService.createSupplier(data);
            toast.success("Product successfully added.");
            router.push('/supplier/products');
        } catch (err: any) {
            console.error(err);
            toast.error(err.response?.data?.error || "Failed to add product.");
        } finally {
            setSaving(false);
        }
    };

    if (loading) return (
        <div className="flex flex-col h-[60vh] items-center justify-center space-y-4">
            <Loader2 className="h-10 w-10 text-[#1a1a2e] animate-spin" />
            <p className="text-[13px] text-gray-500 font-medium">Loading Amazon Partner Central...</p>
        </div>
    );

    return (
        <div className="min-h-screen bg-[#f3f3f3] pb-24 font-sans">


            <div className="max-w-[1240px] mx-auto px-6">

                {/* Back Nav */}
                <div className="mb-6">
                    <button onClick={() => router.back()} className="text-[13px] text-[#F59E0B] hover:text-[#c45500] hover:underline flex items-center gap-1">
                        <ChevronLeft size={16} /> Back to listing tool
                    </button>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">

                    {/* Left Panel: Steps / Sections */}
                    <div className="lg:col-span-1 hidden lg:block">
                        <div className="bg-white border border-[#ddd] rounded-lg p-5 sticky top-8">
                            <h3 className="text-[13px] font-bold text-[#111] mb-4">Required Information</h3>
                            <div className="space-y-4">
                                <div className="flex items-center gap-3 text-[13px] text-[#ff9900] font-bold">
                                    <div className="w-5 h-5 rounded-full border-2 border-[#ff9900] flex items-center justify-center text-[10px]">1</div>
                                    Vital Info
                                </div>
                                <div className="flex items-center gap-3 text-[13px] text-gray-400 font-medium">
                                    <div className="w-5 h-5 rounded-full border-2 border-gray-200 flex items-center justify-center text-[10px]">2</div>
                                    Variations
                                </div>
                                <div className="flex items-center gap-3 text-[13px] text-gray-400 font-medium">
                                    <div className="w-5 h-5 rounded-full border-2 border-gray-200 flex items-center justify-center text-[10px]">3</div>
                                    Offer
                                </div>
                                <div className="flex items-center gap-3 text-[13px] text-gray-400 font-medium">
                                    <div className="w-5 h-5 rounded-full border-2 border-gray-200 flex items-center justify-center text-[10px]">4</div>
                                    Images
                                </div>
                            </div>
                            <div className="mt-8 pt-6 border-t border-[#eee]">
                                <p className="text-[11px] text-gray-500 leading-relaxed font-medium">
                                    Product listings must adhere to Amazon's Selling Policies and Code of Conduct.
                                </p>
                                <a href="#" className="text-[11px] text-[#F59E0B] hover:underline block mt-2">Learn more</a>
                            </div>
                        </div>
                    </div>

                    {/* Main Content: Form */}
                    <div className="lg:col-span-3">
                        <div className="mb-6">
                            <h2 className="text-2xl font-medium text-[#111]">Add a Product: Vital Info</h2>
                            <p className="text-[13px] text-gray-600 mt-1">Tell us about this product to list it in our marketplace.</p>
                        </div>

                        <form onSubmit={handleSubmit} className="space-y-6">

                            {/* Vital Info Card */}
                            <div className={cardCls}>
                                <div className="px-6 py-4 bg-[#f8f8f8] border-b border-[#ddd]">
                                    <h3 className="text-[15px] font-bold text-[#111]">Vital Info</h3>
                                </div>
                                <div className="p-8 space-y-6 max-w-[600px]">
                                    <div>
                                        <label className={labelCls}>Product Name <span className="font-normal text-gray-500">(required)</span></label>
                                        <input
                                            name="name"
                                            value={formData.name}
                                            onChange={handleChange}
                                            required
                                            className={inputCls}
                                            placeholder="Example: Al-Qavi Radiance Serum 50ml"
                                        />
                                        <p className="text-[11px] text-gray-500 mt-1 font-medium">Maximum 200 characters.</p>
                                    </div>

                                    <div className="grid grid-cols-2 gap-6">
                                        <div>
                                            <label className={labelCls}>Manufacturer</label>
                                            <input className={inputCls} placeholder="Al-Qavi CDS" disabled />
                                        </div>
                                        <div>
                                            <label className={labelCls}>Brand Name</label>
                                            <input className={inputCls} placeholder="Al-Qavi" />
                                        </div>
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
                                        <label className={labelCls}>External Product ID <span className="font-normal text-gray-500">(EAN/UPC)</span></label>
                                        <div className="flex gap-2">
                                            <input name="barcode" value={formData.barcode} onChange={handleChange} className={inputCls} placeholder="13-digit barcode" />
                                            <select className="px-2 py-1 bg-[#f0f2f2] border border-[#a6a6a6] rounded text-[12px] font-medium outline-none">
                                                <option>EAN</option>
                                                <option>UPC</option>
                                            </select>
                                        </div>
                                    </div>

                                    <div className="pt-4 border-t border-[#eee]">
                                        <div className="flex items-start gap-3 p-3 bg-blue-50/50 border border-blue-100 rounded-md">
                                            <input
                                                type="checkbox"
                                                id="show_to_admin"
                                                checked={formData.is_supplier_only === 'false'}
                                                onChange={(e) => setFormData(prev => ({ ...prev, is_supplier_only: e.target.checked ? 'false' : 'true' }))}
                                                className="mt-1 h-4 w-4 text-[#ff9900] border-gray-300 rounded focus:ring-[#ff9900]"
                                            />
                                            <label htmlFor="show_to_admin" className="cursor-pointer">
                                                <span className="text-[13px] font-bold text-[#111] block">Show to Admin Registry</span>
                                                <span className="text-[11px] text-gray-500 block leading-tight mt-0.5">
                                                    If checked, this product will appear in the main Admin Dashboard catalog for procurement and inventory tracking.
                                                </span>
                                            </label>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Offer Card */}
                            <div className={cardCls}>
                                <div className="px-6 py-4 bg-[#f8f8f8] border-b border-[#ddd]">
                                    <h3 className="text-[15px] font-bold text-[#111]">Offer</h3>
                                </div>
                                <div className="p-8 space-y-6 max-w-[600px]">
                                    <div className="grid grid-cols-2 gap-6">
                                        <div>
                                            <label className={labelCls}>Your Price <span className="font-normal text-gray-500">(PKR)</span></label>
                                            <div className="relative">
                                                <div className="absolute left-3 top-1/2 -translate-y-1/2 text-[13px] text-gray-500 font-bold">Rs.</div>
                                                <input
                                                    name="price"
                                                    value={formData.price}
                                                    onChange={handleChange}
                                                    required
                                                    type="number"
                                                    className={inputCls + " pl-10"}
                                                    placeholder="0.00"
                                                />
                                            </div>
                                        </div>
                                        <div>
                                            <label className={labelCls}>Quantity</label>
                                            <input
                                                name="quantity_in_stock"
                                                value={formData.quantity_in_stock}
                                                onChange={handleChange}
                                                type="number"
                                                className={inputCls}
                                                placeholder="0"
                                            />
                                        </div>
                                    </div>

                                    <div className="max-w-[300px]">
                                        <label className={labelCls}>Seller SKU</label>
                                        <input name="sku" value={formData.sku} onChange={handleChange} className={inputCls} placeholder="e.g. AQ-SERUM-01" />
                                    </div>

                                    <div>
                                        <label className={labelCls}>Product Description</label>
                                        <textarea
                                            name="description"
                                            value={formData.description}
                                            onChange={handleChange}
                                            rows={6}
                                            className={inputCls + " resize-none"}
                                            placeholder="Detailed features, ingredients, and instructions..."
                                        />
                                    </div>
                                </div>
                            </div>

                            {/* Images Card */}
                            <div className={cardCls}>
                                <div className="px-6 py-4 bg-[#f8f8f8] border-b border-[#ddd]">
                                    <h3 className="text-[15px] font-bold text-[#111]">Images</h3>
                                </div>
                                <div className="p-8 space-y-8">
                                    <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                                        {/* Main Image Slot */}
                                        <div className="md:col-span-1 space-y-2">
                                            <p className="text-[13px] font-bold text-gray-700">Main Image</p>
                                            <div
                                                onClick={() => fileInputRef.current?.click()}
                                                className="aspect-square bg-[#f8f8f8] border border-[#ddd] rounded-lg flex flex-col items-center justify-center cursor-pointer hover:bg-gray-50 transition-colors overflow-hidden relative group"
                                            >
                                                {mainImagePreview ? (
                                                    <img src={mainImagePreview} alt="Preview" className="w-full h-full object-contain p-2" />
                                                ) : (
                                                    <div className="text-center p-4">
                                                        <ImageIcon className="h-8 w-8 text-gray-300 mx-auto mb-2" />
                                                        <p className="text-[11px] text-gray-500 font-bold">Add Image</p>
                                                    </div>
                                                )}
                                                <input type="file" ref={fileInputRef} className="hidden" accept="image/*" onChange={handleMainImageChange} />
                                            </div>
                                        </div>

                                        {/* Gallery Slots */}
                                        <div className="md:col-span-3 space-y-2">
                                            <p className="text-[13px] font-bold text-gray-700">Other Images <span className="font-normal text-gray-500">(Optional)</span></p>
                                            <div className="grid grid-cols-4 sm:grid-cols-6 gap-3">
                                                {additionalImages.map((file, i) => (
                                                    <div key={i} className="aspect-square bg-white border border-[#ddd] rounded-md overflow-hidden relative group">
                                                        <img src={URL.createObjectURL(file)} alt="" className="w-full h-full object-cover" />
                                                        <button
                                                            type="button"
                                                            onClick={() => setAdditionalImages(prev => prev.filter((_, idx) => idx !== i))}
                                                            className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 flex items-center justify-center text-white transition-all"
                                                        >
                                                            <X size={14} />
                                                        </button>
                                                    </div>
                                                ))}
                                                <button
                                                    type="button"
                                                    onClick={() => galleryInputRef.current?.click()}
                                                    className="aspect-square bg-[#f8f8f8] border border-dashed border-[#ddd] rounded-md flex items-center justify-center text-gray-400 hover:text-[#ff9900] hover:border-[#ff9900] transition-all"
                                                >
                                                    <Plus size={20} />
                                                </button>
                                                <input type="file" ref={galleryInputRef} className="hidden" multiple accept="image/*" onChange={handleGalleryChange} />
                                            </div>
                                        </div>
                                    </div>

                                    <div className="bg-[#fff4f4] border border-[#d9b8b8] rounded p-4 flex gap-4">
                                        <Info size={20} className="text-[#c45500] shrink-0 mt-1" />
                                        <div className="text-[12px] text-[#222]">
                                            <p className="font-bold">Image Guidelines</p>
                                            <ul className="list-disc list-inside mt-1 space-y-1 text-gray-600 font-medium">
                                                <li>Minimum 1000px on the longest side.</li>
                                                <li>Pure white background is mandatory for main images.</li>
                                                <li>No text, logos, or watermarks on main images.</li>
                                            </ul>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Footer / Actions */}
                            <div className="bg-white border border-[#ddd] rounded-lg p-6 flex items-center justify-between sticky bottom-4 shadow-xl z-50">
                                <div className="flex items-center gap-2 text-[12px] text-gray-500 font-medium">
                                    <HelpCircle size={16} /> Need help with this section?
                                </div>
                                <div className="flex gap-3">
                                    <button
                                        type="button"
                                        onClick={() => router.back()}
                                        className="px-6 py-1.5 bg-white border border-[#adb1b8] rounded-[3px] text-[13px] font-medium shadow-sm hover:bg-[#f3f4f4] transition-colors"
                                    >
                                        Cancel
                                    </button>
                                    <button
                                        type="submit"
                                        disabled={saving}
                                        className="px-8 py-1.5 bg-[#1a1a2e] border border-[#a88734] hover:border-[#9c7e31] hover:bg-[#ebbd40] rounded-[3px] text-[13px] font-medium shadow-sm flex items-center gap-2 active:shadow-inner-sm disabled:opacity-50"
                                    >
                                        {saving ? <Loader2 size={16} className="animate-spin" /> : null}
                                        {saving ? 'Saving...' : 'Save and finish'}
                                    </button>
                                </div>
                            </div>
                        </form>
                    </div>
                </div>
            </div>

            {/* Simple Amazon Footer */}
            <div className="mt-24 border-t border-gray-200 py-12 bg-white flex flex-col items-center">
                <div className="flex gap-8 text-[11px] text-[#F59E0B] font-medium mb-6">
                    <span className="hover:underline cursor-pointer">Conditions of Use</span>
                    <span className="hover:underline cursor-pointer">Privacy Notice</span>
                    <span className="hover:underline cursor-pointer">Help</span>
                </div>
                <p className="text-[11px] text-gray-500 font-medium">© 2024, Al-Qavi CDS. All rights reserved.</p>
            </div>
        </div>
    );
}
