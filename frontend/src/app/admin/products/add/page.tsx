'use client';

import React, { useState, useRef, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import Link from 'next/link';
import { productService, companyService } from '@/lib/api';
import {
    ArrowLeft, Camera, Trash2, CheckCircle, AlertCircle, RefreshCw, Barcode, Hash, Plus, Save, Box, Package, Tag, Loader2
} from 'lucide-react';

// ─── Shared Utilities ─────────────────────────────────────────────────────────
const INPUT = (err?: boolean) =>
    `w-full px-3 py-2 bg-white dark:bg-slate-800 border rounded text-sm outline-none transition-all
    focus:border-[#e77600] focus:shadow-[0_0_3px_2px_rgba(228,121,17,0.5)] placeholder:text-gray-400
    ${err ? 'border-red-600' : 'border-[#a6a6a6] dark:border-slate-700'}`;

const LABEL = 'block text-xs font-bold text-gray-900 dark:text-gray-200 mb-1';

const SectionCard = ({ children, className = "" }: { children: React.ReactNode; className?: string }) => (
    <div className={`bg-white dark:bg-slate-900 border border-[#ddd] dark:border-slate-800 rounded shadow-sm overflow-hidden ${className}`}>
        {children}
    </div>
);

const SectionHeader = ({ title, icon: Icon, action }: { title: string; icon?: any; action?: React.ReactNode }) => (
    <div className="bg-[#f6f6f6] dark:bg-slate-800 px-4 py-2 border-b border-[#ddd] dark:border-slate-800 flex items-center justify-between">
        <div className="flex items-center gap-2">
            {Icon && <Icon className="w-4 h-4 text-gray-600 dark:text-gray-400" />}
            <span className="text-sm font-bold text-gray-800 dark:text-white uppercase tracking-tight">{title}</span>
        </div>
        {action}
    </div>
);

export default function AddEditProductPage() {
    const router = useRouter();
    const params = useParams();
    const productId = params?.id as string;
    const isEditMode = productId && productId !== 'add';

    const fileInputRef = useRef<HTMLInputElement>(null);
    const additionalFilesRef = useRef<HTMLInputElement>(null);
    const [images, setImages] = useState<string[]>([]);
    const [imageFiles, setImageFiles] = useState<File[]>([]);
    const [additionalPreviews, setAdditionalPreviews] = useState<string[]>([]);
    const [additionalFiles, setAdditionalFiles] = useState<File[]>([]);
    const [categories, setCategories] = useState<any[]>([]);
    const [companies, setCompanies] = useState<any[]>([]);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [isLoading, setIsLoading] = useState(isEditMode);

    const [toast, setToast] = useState<string | null>(null);
    const [errors, setErrors] = useState<Record<string, string>>({});

    const [formData, setFormData] = useState({
        name: '', description: '', category: '', price: '', costPrice: '',
        retailPrice: '', sku: '', barcode: '', batchNumber: '', company: '', status: 'active'
    });

    useEffect(() => {
        const fetchMeta = async () => {
            try {
                const [cats, comps] = await Promise.all([
                    productService.getCategories(),
                    companyService.getAll()
                ]);
                setCategories(cats);
                setCompanies(comps);
            } catch (err) { console.error("Meta fetch error", err); }
        };
        fetchMeta();
    }, []);

    useEffect(() => {
        if (isEditMode) {
            const fetchProduct = async () => {
                try {
                    const product = await productService.getById(productId);
                    setFormData({
                        name: product.name || '',
                        description: product.description || '',
                        category: product.category?.id || product.category || '',
                        price: product.price ? product.price.toString() : '',
                        costPrice: product.cost ? product.cost.toString() : '',
                        retailPrice: product.retail_price ? product.retail_price.toString() : '',
                        sku: product.sku || '',
                        barcode: product.barcode || '',
                        batchNumber: product.batch_number || '',
                        company: product.company?.id || product.company || '',
                        status: product.status || 'active'
                    });
                    if (product.image_url || product.image) setImages([product.image_url || product.image]);
                    if (product.additional_images) {
                        setAdditionalPreviews(product.additional_images.map((img: any) => img.image_url || img.image));
                    }
                } catch (error) {
                    showToast('Failed to load product data');
                } finally {
                    setIsLoading(false);
                }
            };
            fetchProduct();
        } else {
            setIsLoading(false);
        }
    }, [isEditMode, productId]);

    const showToast = (msg: string) => {
        setToast(msg);
        setTimeout(() => setToast(null), 3000);
    };

    const h = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
        setFormData(prev => ({ ...prev, [e.target.name]: e.target.value }));
        setErrors(p => ({ ...p, [e.target.name]: '' }));
    };

    const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const files = Array.from(e.target.files || []);
        if (files.length > 0) {
            setImageFiles([files[0]]);
            const reader = new FileReader();
            reader.onloadend = () => setImages([reader.result as string]);
            reader.readAsDataURL(files[0]);
        }
    };

    const handleAdditionalUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const files = Array.from(e.target.files || []);
        if (files.length > 0) {
            setAdditionalFiles(prev => [...prev, ...files]);
            files.forEach(file => {
                const reader = new FileReader();
                reader.onloadend = () => setAdditionalPreviews(prev => [...prev, reader.result as string]);
                reader.readAsDataURL(file);
            });
        }
    };

    const removeAdditional = (index: number) => {
        setAdditionalPreviews(prev => prev.filter((_, i) => i !== index));
        setAdditionalFiles(prev => prev.filter((_, i) => i !== index));
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        const errs: Record<string, string> = {};
        if (!formData.name.trim()) errs.name = 'Required';
        if (!formData.price) errs.price = 'Required';
        if (!formData.category) errs.category = 'Required';

        if (Object.keys(errs).length > 0) {
            setErrors(errs);
            window.scrollTo({ top: 0, behavior: 'smooth' });
            return;
        }

        setIsSubmitting(true);
        try {
            const data = new FormData();
            data.append('name', formData.name);
            data.append('description', formData.description);
            data.append('category', formData.category);
            data.append('price', formData.price);
            if (formData.costPrice) data.append('cost', formData.costPrice);
            if (formData.retailPrice) data.append('retail_price', formData.retailPrice);
            if (formData.sku) data.append('sku', formData.sku);
            if (formData.barcode) data.append('barcode', formData.barcode);
            if (formData.batchNumber) data.append('batch_number', formData.batchNumber);
            if (formData.company) data.append('company', formData.company);
            data.append('status', formData.status);

            if (imageFiles.length > 0) data.append('image', imageFiles[0]);
            additionalFiles.forEach(file => data.append('upload_images', file));

            if (isEditMode) await productService.update(productId, data);
            else await productService.create(data);

            showToast('Changes saved successfully!');
            setTimeout(() => router.push('/admin/products'), 1000);
        } catch (err) {
            showToast('Failed to save changes');
        } finally {
            setIsSubmitting(false);
        }
    };

    if (isLoading) return <div className="p-20 text-center text-gray-500">Loading catalog data...</div>;

    return (
        <div className="max-w-4xl mx-auto py-8 px-4">
            <div className="flex items-center justify-between mb-6">
                <h1 className="text-2xl font-normal text-gray-900 dark:text-white">
                    {isEditMode ? 'Edit Product' : 'Add New Product'}
                </h1>
                <button onClick={() => router.push('/admin/products')} className="text-sm text-[#007185] hover:text-[#C45500] hover:underline flex items-center gap-1">
                    <ArrowLeft className="w-4 h-4" /> Back to list
                </button>
            </div>

            <form onSubmit={handleSubmit}>
                <div className="space-y-6">
                    {/* Basic Info */}
                    <SectionCard>
                        <SectionHeader title="Basic Information" icon={Tag} />
                        <div className="p-6">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div className="md:col-span-2">
                                    <label className={LABEL}>Product Name <span className="text-red-700">*</span></label>
                                    <input name="name" value={formData.name} onChange={h} className={INPUT(!!errors.name)} placeholder="e.g. Lavender Face Wash" />
                                </div>
                                <div>
                                    <label className={LABEL}>Category <span className="text-red-700">*</span></label>
                                    <select name="category" value={formData.category} onChange={h} className={INPUT(!!errors.category)}>
                                        <option value="">Select Category</option>
                                        {categories.map((c: any) => <option key={c.id} value={c.id}>{c.name}</option>)}
                                    </select>
                                </div>
                                <div>
                                    <label className={LABEL}>Producer / Company</label>
                                    <select name="company" value={formData.company} onChange={h} className={INPUT()}>
                                        <option value="">Select Company</option>
                                        {companies.map((comp: any) => <option key={comp.id} value={comp.id}>{comp.name}</option>)}
                                    </select>
                                </div>
                                <div className="md:col-span-2">
                                    <label className={LABEL}>Description</label>
                                    <textarea name="description" value={formData.description} onChange={h} rows={3} className={INPUT() + ' resize-none'} placeholder="Technical specs and benefits..." />
                                </div>
                            </div>
                        </div>
                    </SectionCard>

                    {/* Pricing & Inventory */}
                    <SectionCard>
                        <SectionHeader title="Pricing & Inventory" icon={Box} />
                        <div className="p-6">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div>
                                    <label className={LABEL}>List Price (PKR) <span className="text-red-700">*</span></label>
                                    <input type="number" name="price" value={formData.price} onChange={h} className={INPUT(!!errors.price)} placeholder="0.00" />
                                </div>
                                <div>
                                    <label className={LABEL}>Retail Price (MRP)</label>
                                    <input type="number" name="retailPrice" value={formData.retailPrice} onChange={h} className={INPUT()} placeholder="0.00" />
                                </div>
                                <div>
                                    <label className={LABEL}>SKU Identifier</label>
                                    <input name="sku" value={formData.sku} onChange={h} className={INPUT()} placeholder="Manual code or auto-gen" />
                                </div>
                                <div>
                                    <label className={LABEL}>Barcode (UPC/EAN)</label>
                                    <input name="barcode" value={formData.barcode} onChange={h} className={INPUT()} placeholder="Standard code" />
                                </div>
                            </div>
                        </div>
                    </SectionCard>

                    {/* Images */}
                    <SectionCard>
                        <SectionHeader title="Product Media" icon={Camera} />
                        <div className="p-6">
                            <div className="flex flex-wrap gap-4">
                                <div
                                    onClick={() => fileInputRef.current?.click()}
                                    className="w-32 h-32 border border-[#ddd] rounded flex flex-col items-center justify-center cursor-pointer hover:bg-gray-50 bg-white"
                                >
                                    {images[0] ? (
                                        <img src={images[0]} className="w-full h-full object-contain p-2" />
                                    ) : (
                                        <div className="text-center p-2">
                                            <Camera className="w-6 h-6 mx-auto text-gray-400" />
                                            <span className="text-[10px] font-bold text-gray-500 uppercase mt-1">Main Image</span>
                                        </div>
                                    )}
                                </div>
                                {additionalPreviews.map((src, idx) => (
                                    <div key={idx} className="w-32 h-32 border border-[#ddd] rounded relative group bg-white">
                                        <img src={src} className="w-full h-full object-contain p-2" />
                                        <button
                                            type="button"
                                            onClick={() => removeAdditional(idx)}
                                            className="absolute top-1 right-1 bg-red-500 text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity"
                                        >
                                            <Trash2 className="w-3 h-3" />
                                        </button>
                                    </div>
                                ))}
                                <div
                                    onClick={() => additionalFilesRef.current?.click()}
                                    className="w-32 h-32 border border-dashed border-[#a6a6a6] rounded flex items-center justify-center cursor-pointer hover:bg-gray-50 transition-colors"
                                >
                                    <Plus className="w-6 h-6 text-gray-400" />
                                </div>
                                <input type="file" ref={fileInputRef} className="hidden" onChange={handleImageUpload} />
                                <input type="file" ref={additionalFilesRef} className="hidden" onChange={handleAdditionalUpload} multiple />
                            </div>
                        </div>
                    </SectionCard>

                    <div className="flex justify-end gap-3 pt-4">
                        <button
                            type="button"
                            onClick={() => router.push('/admin/products')}
                            className="px-6 py-1.5 bg-white dark:bg-slate-700 border border-[#a6a6a6] dark:border-slate-600 rounded text-sm hover:bg-gray-100 transition-colors"
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            disabled={isSubmitting}
                            className="px-8 py-1.5 bg-[#f0c14b] border border-[#a88734] rounded text-sm font-medium hover:bg-[#ebae1e] shadow-sm flex items-center gap-2 disabled:opacity-50"
                        >
                            {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4 text-gray-800" />}
                            {isEditMode ? 'Save Changes' : 'Create Product'}
                        </button>
                    </div>
                </div>
            </form>

            {toast && (
                <div className="fixed bottom-6 right-6 bg-[#232f3e] text-white px-6 py-3 rounded shadow-lg flex items-center gap-3 animate-in fade-in slide-in-from-bottom-2">
                    <CheckCircle className="h-5 w-5 text-green-400" />
                    <span className="text-sm font-medium">{toast}</span>
                </div>
            )}
        </div>
    );
}
