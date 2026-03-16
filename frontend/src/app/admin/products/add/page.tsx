'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useRouter, useParams } from 'next/navigation';
import {
    Package, Tag, Image as ImageIcon, Plus, Trash2,
    Save, Loader2, ArrowLeft, DollarSign, Database,
    X, AlertTriangle, CheckCircle, Barcode, Hash
} from 'lucide-react';
import { productService, companyCategoryService, companyService, CompanyInfo } from '@/lib/api';
import { getImageUrl } from '@/lib/utils';

// ─── Shared Utilities (Same to same as Company pages) ────────────────────────────────
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

// ─── Main Component ───────────────────────────────────────────────────────────
export default function AddEditProductPage() {
    const router = useRouter();
    const { id } = useParams();
    const isEdit = !!id;

    const [loading, setLoading] = useState(isEdit);
    const [saving, setSaving] = useState(false);
    const [toast, setToast] = useState<string | null>(null);

    // Data State
    const [productCategories, setProductCategories] = useState<any[]>([]);
    const [companyCategories, setCompanyCategories] = useState<any[]>([]);
    const [companies, setCompanies] = useState<CompanyInfo[]>([]);

    const [formData, setFormData] = useState({
        name: '',
        description: '',
        category: '',
        company: '',
        company_category: '',
        sku: '',
        barcode: '',
        price: '',
        cost: '',
        retail_price: '',
        status: 'active',
        batch_number: '',
    });

    const [mainImage, setMainImage] = useState<File | null>(null);
    const [mainImagePreview, setMainImagePreview] = useState<string | null>(null);
    const [additionalImages, setAdditionalImages] = useState<File[]>([]);
    const [existingGallery, setExistingGallery] = useState<any[]>([]);

    const fileInputRef = useRef<HTMLInputElement>(null);
    const galleryInputRef = useRef<HTMLInputElement>(null);

    const showToast = (msg: string) => {
        setToast(msg);
        setTimeout(() => setToast(null), 3000);
    };

    useEffect(() => {
        const fetchInitial = async () => {
            try {
                const [pCats, cCats, comps] = await Promise.all([
                    productService.getCategories(),
                    companyCategoryService.getAll(),
                    companyService.getAll()
                ]);
                setProductCategories((pCats || []).filter((c: any) => c.status === 'active'));
                setCompanyCategories((cCats || []).filter((c: any) => c.is_active !== false));
                setCompanies((comps || []).filter((c: any) => c.is_active !== false));

                if (isEdit) {
                    const product = await productService.getById(id as string);
                    setFormData({
                        name: product.name || '',
                        description: product.description || '',
                        category: typeof product.category === 'object' ? product.category.id : product.category || '',
                        company: typeof product.company === 'object' ? product.company.id : product.company || '',
                        company_category: typeof product.company_category === 'object' ? product.company_category.id : product.company_category || '',
                        sku: product.sku || '',
                        barcode: product.barcode || '',
                        price: product.price || '',
                        cost: product.cost || '',
                        retail_price: product.retail_price || '',
                        status: (product.status?.toLowerCase()) || 'active',
                        batch_number: '', 
                    });
                    if (product.image_url || product.image) {
                        setMainImagePreview(getImageUrl(product.image_url || product.image));
                    }
                    setExistingGallery(product.gallery || []);
                }
            } catch (error) {
                console.error(error);
                alert('Failed to load initial data.');
            } finally {
                setLoading(false);
            }
        };
        fetchInitial();
    }, [id, isEdit]);

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

    const removeNewGalleryImage = (index: number) => {
        setAdditionalImages(prev => prev.filter((_, i) => i !== index));
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setSaving(true);
        try {
            const data = new FormData();
            Object.keys(formData).forEach(key => {
                const val = (formData as any)[key];
                if (val !== null && val !== undefined && val !== '') {
                    data.append(key, val);
                }
            });

            if (mainImage) data.append('image', mainImage);
            additionalImages.forEach(file => { data.append('upload_images', file); });

            if (isEdit) {
                await productService.update(id as string, data);
                showToast('Product updated.');
            } else {
                await productService.create(data);
                showToast('Product created.');
            }
            setTimeout(() => router.push('/admin/products'), 1000);
        } catch (err: any) {
            console.error(err);
            const detail = err.response?.data ? JSON.stringify(err.response.data).slice(0, 100) : 'Failed to save.';
            alert(`Error: ${detail}`);
        } finally {
            setSaving(false);
        }
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-screen">
                <Loader2 className="h-8 w-8 animate-spin text-[#E68A00]" />
            </div>
        );
    }

    return (
        <div className="max-w-6xl mx-auto py-8 px-4">
            <div className="flex items-center justify-between mb-6">
                <h1 className="text-2xl font-normal text-gray-900 dark:text-white uppercase tracking-tight">
                    {isEdit ? 'Update Product Listing' : 'New Product Entry'}
                </h1>
                <button onClick={() => router.push('/admin/products')} className="text-sm text-gray-400 hover:text-[#C45500] hover:underline flex items-center gap-1 uppercase font-bold tracking-tighter">
                    <ArrowLeft className="w-4 h-4" /> Back to list
                </button>
            </div>

            <form onSubmit={handleSubmit}>
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    {/* Left Column: Essential Info */}
                    <div className="lg:col-span-2 space-y-6">
                        <SectionCard>
                            <SectionHeader title="General Information" icon={Tag} />
                            <div className="p-6 space-y-4">
                                <div>
                                    <label className={LABEL}>Product Name <span className="text-red-700">*</span></label>
                                    <input required name="name" value={formData.name} onChange={handleChange} className={INPUT()} placeholder="e.g. Premium Lavender Moisturizer" />
                                </div>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div>
                                        <label className={LABEL}>Product Category</label>
                                        <select name="category" value={formData.category} onChange={handleChange} className={INPUT()}>
                                            <option value="">Standard / None</option>
                                            {productCategories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                                        </select>
                                    </div>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        <div>
                                            <label className={LABEL}>Origin / Vendor Category</label>
                                            <select name="company_category" value={formData.company_category} onChange={handleChange} className={INPUT()}>
                                                <option value="">Unspecified</option>
                                                {companyCategories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                                            </select>
                                        </div>
                                        <div>
                                            <label className={LABEL}>Manufacturing Company</label>
                                            <select name="company" value={formData.company} onChange={handleChange} className={INPUT()}>
                                                <option value="">Unspecified</option>
                                                {companies.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                                            </select>
                                        </div>
                                    </div>
                                </div>
                                <div>
                                    <label className={LABEL}>Description</label>
                                    <textarea name="description" value={formData.description} onChange={handleChange} rows={4} className={INPUT() + " resize-none"} placeholder="Detailed product specifications..." />
                                </div>
                            </div>
                        </SectionCard>

                        <SectionCard>
                            <SectionHeader title="Pricing & Identification" icon={DollarSign} />
                            <div className="p-6 grid grid-cols-1 md:grid-cols-3 gap-4">
                                <div>
                                    <label className={LABEL}>Trade Price (Cost)</label>
                                    <input type="number" step="0.01" name="cost" value={formData.cost} onChange={handleChange} className={INPUT()} placeholder="0.00" />
                                </div>
                                <div>
                                    <label className={LABEL}>Selling Price (Base)</label>
                                    <input type="number" step="0.01" name="price" value={formData.price} onChange={handleChange} className={INPUT()} placeholder="0.00" />
                                </div>
                                <div>
                                    <label className={LABEL}>Retail Price (MRP)</label>
                                    <input type="number" step="0.01" name="retail_price" value={formData.retail_price} onChange={handleChange} className={INPUT()} placeholder="0.00" />
                                </div>
                                <div>
                                    <label className={LABEL}>Batch Number</label>
                                    <input name="batch_number" value={formData.batch_number} onChange={handleChange} className={INPUT()} placeholder="e.g. BATCH-2024" />
                                </div>
                                <div>
                                    <label className={LABEL}>SKU <span className="text-gray-400 font-normal ml-1 tracking-tight italic">(Leave for auto-gen)</span></label>
                                    <input name="sku" value={formData.sku} onChange={handleChange} className={INPUT()} placeholder="SKU-XXXX" />
                                </div>
                                <div>
                                    <label className={LABEL}>Barcode / UPC</label>
                                    <input name="barcode" value={formData.barcode} onChange={handleChange} className={INPUT()} placeholder="Barcode" />
                                </div>
                                <div>
                                    <label className={LABEL}>Listing Status</label>
                                    <select name="status" value={formData.status} onChange={handleChange} className={INPUT()}>
                                        <option value="active">Active</option>
                                        <option value="inactive">Inactive</option>
                                        <option value="archived">Archived</option>
                                    </select>
                                </div>
                            </div>
                        </SectionCard>
                    </div>

                    {/* Right Column: Images */}
                    <div className="space-y-6">
                        <SectionCard>
                            <SectionHeader title="Cover Image" icon={ImageIcon} />
                            <div className="p-6 space-y-4 flex flex-col items-center">
                                <div className="w-full aspect-square border-2 border-dashed border-gray-300 rounded-lg flex items-center justify-center bg-gray-50 dark:bg-slate-800 overflow-hidden relative group">
                                    {mainImagePreview ? (
                                        <img src={mainImagePreview} alt="Preview" className="w-full h-full object-contain" />
                                    ) : (
                                        <div className="text-center">
                                            <ImageIcon className="mx-auto h-12 w-12 text-gray-300" />
                                            <p className="mt-2 text-[10px] text-gray-400 font-black uppercase tracking-widest leading-none">Primary Foto</p>
                                        </div>
                                    )}
                                    <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                                        <button type="button" onClick={() => fileInputRef.current?.click()} className="bg-white px-4 py-1.5 rounded-full text-[10px] font-black uppercase shadow-xl hover:scale-105 transition-transform">
                                            {mainImagePreview ? 'Change' : 'Upload'}
                                        </button>
                                    </div>
                                </div>
                                <input type="file" ref={fileInputRef} className="hidden" accept="image/*" onChange={handleMainImageChange} />
                                <p className="text-[10px] text-gray-400 text-center italic">Supported: PNG, JPG, WEBP</p>
                            </div>
                        </SectionCard>

                        <SectionCard>
                            <SectionHeader 
                                title="Gallery" 
                                icon={Database} 
                                action={<button type="button" onClick={() => galleryInputRef.current?.click()} className="p-1 hover:text-[#E68A00] transition-colors"><Plus className="h-4 w-4" /></button>}
                            />
                            <div className="p-4 grid grid-cols-4 gap-2">
                                {existingGallery.map((img, i) => (
                                    <div key={i} className="aspect-square bg-gray-100 dark:bg-slate-800 border border-gray-200 dark:border-slate-800 rounded overflow-hidden">
                                        <img src={getImageUrl(img.image_url || img.image) || ""} className="w-full h-full object-cover" alt="" />
                                    </div>
                                ))}
                                {additionalImages.map((file, i) => (
                                    <div key={i} className="aspect-square bg-gray-100 dark:bg-slate-800 border border-gray-200 dark:border-slate-800 rounded overflow-hidden relative group">
                                        <img src={URL.createObjectURL(file)} className="w-full h-full object-cover" alt="" />
                                        <button onClick={() => removeNewGalleryImage(i)} className="absolute top-1 right-1 p-1 bg-red-600 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity">
                                            <X className="h-2 w-2" />
                                        </button>
                                    </div>
                                ))}
                                <button
                                    type="button"
                                    onClick={() => galleryInputRef.current?.click()}
                                    className="aspect-square border-2 border-dashed border-gray-200 dark:border-slate-800 rounded flex items-center justify-center hover:bg-gray-50 dark:hover:bg-slate-800 transition-colors"
                                >
                                    <Plus className="h-6 w-6 text-gray-300" />
                                </button>
                                <input type="file" ref={galleryInputRef} className="hidden" accept="image/*" multiple onChange={handleGalleryChange} />
                            </div>
                        </SectionCard>

                        <div className="pt-4 space-y-3">
                            <button
                                type="submit"
                                disabled={saving}
                                className="w-full py-3 bg-[#f0c14b] border border-[#a88734] rounded text-sm font-bold shadow-sm hover:bg-[#ebae1e] transition-all flex items-center justify-center gap-2 uppercase tracking-widest disabled:opacity-50"
                            >
                                {saving ? <Loader2 className="h-5 w-5 animate-spin" /> : <Save className="h-5 w-5" />}
                                {isEdit ? 'Update Listing' : 'Publish Product'}
                            </button>
                            <button
                                type="button"
                                onClick={() => router.push('/admin/products')}
                                className="w-full py-2 bg-white dark:bg-slate-800 border border-[#adb1b8] border-gray-300 rounded text-xs font-bold text-gray-700 dark:text-gray-200 hover:bg-gray-50 transition-colors shadow-sm uppercase tracking-widest"
                            >
                                Discard Changes
                            </button>
                        </div>
                    </div>
                </div>
            </form>

            {/* Simple Toast */}
            {toast && (
                <div className="fixed bottom-6 right-6 bg-[#131921] text-white px-5 py-3 rounded shadow-2xl flex items-center gap-3 min-w-[240px] border-l-4 border-[#E68A00] z-[100] animate-in slide-in-from-bottom-5">
                    <CheckCircle className="h-5 w-5 text-green-400" />
                    <span className="text-sm font-medium uppercase tracking-tight">{toast}</span>
                </div>
            )}
        </div>
    );
}
