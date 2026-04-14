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
import { supplierProductService, mainCategoryService, categoryService } from '@/lib/api';
import toast from 'react-hot-toast';

// ── Shared UI Styles ────────────────────────────────────────────────────────
const labelCls = `text-[13px] font-bold text-[#111] mb-1.5 block`;
const inputCls = `w-full px-3 py-2 bg-white border border-[#a6a6a6] rounded-[3px] text-[13px] outline-none focus:border-[#e77600] focus:ring-1 focus:ring-[#e77600] transition-shadow shadow-inner-sm placeholder:text-gray-400`;
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
        price: '',
        cost_price: '',
        retail_price: '',
        sku: '',
        barcode: '',
        status: 'active',
        batch_number: 'INITIAL-LOG',
        quantity: '0',
    });

    const [mainImage, setMainImage] = useState<File | null>(null);
    const [mainImagePreview, setMainImagePreview] = useState<string | null>(null);
    const [additionalImages, setAdditionalImages] = useState<File[]>([]);

    const fileInputRef = useRef<HTMLInputElement>(null);
    const galleryInputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        setLoading(false);
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
            toast.error("Required fields missing (Name, Price).");
            return;
        }

        setSaving(true);
        try {
            const data = new FormData();
            Object.keys(formData).forEach(key => {
                const val = (formData as any)[key];
                if (val !== undefined && val !== '' && key !== 'main_category') {
                    data.append(key, val);
                }
            });

            if (mainImage) data.append('image', mainImage);
            additionalImages.forEach(file => data.append('upload_images', file));

            // We don't send main_category as SupplierProduct doesn't have it yet, 
            // but we could map it if needed.

            await supplierProductService.create(data);
            toast.success("Product successfully added.");
            router.push('/supplier/products');
        } catch (err: any) {
            console.error(err);
            const errorMsg = err.response?.data ? JSON.stringify(err.response.data) : "Failed to add product.";
            toast.error(`Error: ${errorMsg}`);
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
        <div className="min-h-screen bg-[#f3f3f3] pb-24 font-sans text-slate-900 border-t-4 border-[#F59E0B]">
            <div className="max-w-[1240px] mx-auto px-6 pt-8">
                {/* Back Nav */}
                <div className="mb-6">
                    <button onClick={() => router.back()} className="text-[13px] text-[#F59E0B] hover:text-[#c45500] hover:underline flex items-center gap-1 font-bold">
                        <ChevronLeft size={16} /> Back to listing tool
                    </button>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
                    {/* Left Panel */}
                    <div className="lg:col-span-1 hidden lg:block">
                        <div className="bg-white border border-[#ddd] rounded-lg p-5 sticky top-8 shadow-sm">
                            <h3 className="text-[13px] font-black text-[#111] mb-4 uppercase tracking-tighter">Required Information</h3>
                            <div className="space-y-4">
                                <div className="flex items-center gap-3 text-[13px] text-[#ff9900] font-bold">
                                    <div className="w-5 h-5 rounded-full border-2 border-[#ff9900] flex items-center justify-center text-[10px]">1</div> Vital Info
                                </div>
                                <div className="flex items-center gap-3 text-[13px] text-gray-400 font-medium">
                                    <div className="w-5 h-5 rounded-full border-2 border-gray-200 flex items-center justify-center text-[10px]">2</div> Offer
                                </div>
                                <div className="flex items-center gap-3 text-[13px] text-gray-400 font-medium">
                                    <div className="w-5 h-5 rounded-full border-2 border-gray-200 flex items-center justify-center text-[10px]">3</div> Images
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Main Content */}
                    <div className="lg:col-span-3">
                        <div className="mb-6">
                            <h2 className="text-2xl font-bold text-[#111] tracking-tight">Add a Product: Vital Info</h2>
                            <p className="text-[13px] text-gray-600 mt-1">Tell us about this product to list it in our marketplace.</p>
                        </div>

                        <form onSubmit={handleSubmit} className="space-y-6">
                            {/* Vital Info Card */}
                            <div className={cardCls}>
                                <div className="px-6 py-4 bg-[#f8f8f8] border-b border-[#ddd]">
                                    <h3 className="text-[15px] font-black text-[#111] uppercase tracking-tighter">Vital Info</h3>
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
                                    </div>

                                    <div>
                                        <label className={labelCls}>External Product ID <span className="font-normal text-gray-500">(EAN/UPC)</span></label>
                                        <input name="barcode" value={formData.barcode} onChange={handleChange} className={inputCls} placeholder="13-digit barcode" />
                                    </div>
                                </div>
                            </div>

                            {/* Offer Card */}
                            <div className={cardCls}>
                                <div className="px-6 py-4 bg-[#f8f8f8] border-b border-[#ddd]">
                                    <h3 className="text-[15px] font-black text-[#111] uppercase tracking-tighter">Offer</h3>
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
                                                name="quantity"
                                                value={formData.quantity}
                                                onChange={handleChange}
                                                type="number"
                                                className={inputCls}
                                                placeholder="0"
                                            />
                                        </div>
                                    </div>

                                    <div className="grid grid-cols-2 gap-6">
                                        <div>
                                            <label className={labelCls}>Cost Price</label>
                                            <input name="cost_price" value={formData.cost_price} onChange={handleChange} type="number" className={inputCls} placeholder="Your acquisition cost" />
                                        </div>
                                        <div>
                                            <label className={labelCls}>Retail Price (MSRP)</label>
                                            <input name="retail_price" value={formData.retail_price} onChange={handleChange} type="number" className={inputCls} placeholder="Recommended price" />
                                        </div>
                                    </div>

                                    <div>
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
                                    <h3 className="text-[15px] font-black text-[#111] uppercase tracking-tighter">Images</h3>
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
                                            <p className="text-[13px] font-bold text-gray-700">Other Images</p>
                                            <div className="grid grid-cols-4 sm:grid-cols-6 gap-3">
                                                {additionalImages.map((file, i) => (
                                                    <div key={i} className="aspect-square bg-white border border-[#ddd] rounded-md overflow-hidden relative group">
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

                            {/* Footer Actions */}
                            <div className="bg-white border border-[#ddd] rounded-lg p-6 flex items-center justify-end gap-3 sticky bottom-4 shadow-xl z-50">
                                <button
                                    type="button"
                                    onClick={() => router.back()}
                                    className="px-6 py-1.5 bg-white border border-[#adb1b8] rounded-[3px] text-[13px] font-medium shadow-sm hover:bg-[#f3f4f4]"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    disabled={saving}
                                    className="px-8 py-1.5 bg-[#1a1a2e] border border-[#a88734] hover:bg-[#F59E0B] hover:text-slate-900 rounded-[3px] text-[13px] font-bold shadow-sm text-white flex items-center gap-2 transition-all active:scale-95 disabled:opacity-50"
                                >
                                    {saving ? <Loader2 size={16} className="animate-spin" /> : null}
                                    {saving ? 'Saving...' : 'Save and finish'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            </div>

            {/* Simple Amazon Footer */}
            <div className="mt-24 border-t border-gray-200 py-12 bg-white flex flex-col items-center">
                <div className="flex gap-8 text-[11px] text-[#F59E0B] font-bold mb-6">
                    <span className="hover:underline cursor-pointer">Conditions of Use</span>
                    <span className="hover:underline cursor-pointer">Privacy Notice</span>
                    <span className="hover:underline cursor-pointer">Help</span>
                </div>
                <p className="text-[11px] text-gray-500 font-medium">© 2024, Al-Qavi CDS. All rights reserved.</p>
            </div>
        </div>
    );
}
