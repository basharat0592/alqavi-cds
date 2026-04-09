"use client";

import React, { useState, useEffect, useRef } from 'react';
import { useRouter, useParams } from 'next/navigation';
import {
    Package, Tag, Image as ImageIcon, Plus, Trash2,
    Save, Loader2, ArrowLeft, DollarSign, Database,
    X, AlertTriangle, CheckCircle, Barcode, Hash, Building2, Layers, ChevronLeft
} from 'lucide-react';
import { productService, companyCategoryService, companyService, CompanyInfo, mainCategoryService, userService } from '@/lib/api';
import { getImageUrl } from '@/lib/utils';
import { authService } from '@/lib/auth';
import toast from 'react-hot-toast';
import PageLoader from '@/components/ui/PageLoader';

const inputCls = (err?: boolean) => `w-full px-4 py-2.5 bg-white dark:bg-[#1a252f] border rounded-xl text-sm outline-none focus:border-[#EEAF1C] focus:ring-1 focus:ring-[#EEAF1C] transition-all placeholder:text-slate-400 text-slate-800 dark:text-slate-200 ${err ? 'border-red-600' : 'border-slate-200 dark:border-white/10'}`;
const selectCls = `w-full px-4 py-2.5 bg-white dark:bg-[#1a252f] border border-slate-200 dark:border-white/10 rounded-xl text-sm outline-none focus:border-[#EEAF1C] text-slate-600 dark:text-slate-300 cursor-pointer transition-all`;
const labelCls = 'block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5';

export default function AddEditProductPage() {
    const router = useRouter();
    const { id } = useParams();
    const isEdit = !!id;

    const [loading, setLoading] = useState(isEdit);
    const [saving, setSaving] = useState(false);

    // Data State
    const [productCategories, setProductCategories] = useState<any[]>([]);
    const [companyCategories, setCompanyCategories] = useState<any[]>([]);
    const [companies, setCompanies] = useState<CompanyInfo[]>([]);
    const [mainCategories, setMainCategories] = useState<any[]>([]);
    const [suppliers, setSuppliers] = useState<any[]>([]);
    const [user, setUser] = useState<any>(null);

    const [formData, setFormData] = useState({
        name: '',
        description: '',
        category: '',
        company: '',
        company_category: '',
        supplier: '',
        sku: '',
        barcode: '',
        price: '',
        cost: '',
        retail_price: '',
        status: 'active',
        batch_number: '',
        main_category: '',
    });

    const [mainImage, setMainImage] = useState<File | null>(null);
    const [mainImagePreview, setMainImagePreview] = useState<string | null>(null);
    const [additionalImages, setAdditionalImages] = useState<File[]>([]);
    const [existingGallery, setExistingGallery] = useState<any[]>([]);

    const fileInputRef = useRef<HTMLInputElement>(null);
    const galleryInputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        const fetchInitial = async () => {
            try {
                const [pCats, cCats, comps, mCats, usersRes, supsRes] = await Promise.allSettled([
                    productService.getCategories(),
                    companyCategoryService.getAll(),
                    companyService.getAll(),
                    mainCategoryService.getAll(),
                    userService.getAll(),
                    (companyService as any).getSuppliers?.() ?? Promise.resolve([])
                ]);

                if (pCats.status === 'fulfilled') setProductCategories((pCats.value || []).filter((c: any) => c.status === 'active'));
                if (cCats.status === 'fulfilled') setCompanyCategories((cCats.value || []).filter((c: any) => c.is_active !== false));
                if (comps.status === 'fulfilled') setCompanies((comps.value || []).filter((c: any) => c.is_active !== false));
                if (mCats.status === 'fulfilled') setMainCategories(mCats.value || []);

                const sList = supsRes.status === 'fulfilled' ? (Array.isArray(supsRes.value) ? supsRes.value : []) : [];
                
                // Exclusively use validated Supplier profiles for the product-supplier mapping
                // This ensures IDs match the backend Product model foreign key expectation
                setSuppliers(sList);

                const currentUser = authService.getUser();
                setUser(currentUser);

                if (isEdit) {
                    const product = await productService.getById(id as string);
                    setFormData({
                        name: product.name || '',
                        description: product.description || '',
                        category: (product.category && typeof product.category === 'object') ? product.category.id : product.category || '',
                        company: (product.company && typeof product.company === 'object') ? product.company.id : product.company || '',
                        company_category: (product.company_category && typeof product.company_category === 'object') ? product.company_category.id : product.company_category || '',
                        supplier: (product.supplier && typeof product.supplier === 'object') ? product.supplier.id : product.supplier || '',
                        sku: product.sku || '',
                        barcode: product.barcode || '',
                        price: product.price || '',
                        cost: product.cost || '',
                        retail_price: product.retail_price || '',
                        status: (product.status?.toLowerCase()) || 'active',
                        batch_number: '',
                        main_category: (product.main_categories && product.main_categories.length > 0) ? product.main_categories[0] : '',
                    });
                    if (product.image_url || product.image) {
                        setMainImagePreview(getImageUrl(product.image_url || product.image));
                    }
                    setExistingGallery(product.gallery || []);
                }
            } catch (error: any) {
                console.error('Fetch Initial Error:', error);
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

            if (formData.main_category) {
                data.append('main_categories', formData.main_category);
            }

            if (isEdit) {
                await productService.update(id as string, data);
                toast.success('Product updated successfully.');
            } else {
                await productService.create(data);
                toast.success('Product registered successfully.');
            }
            router.push('/admin/products');
        } catch (err: any) {
            console.error(err);
            toast.error(`Error saving asset record.`);
        } finally {
            setSaving(false);
        }
    };

    if (loading) return <PageLoader />;

    return (
        <div className="max-w-6xl mx-auto py-8 px-6 font-sans pb-20">
            <div className="mb-8">
                <button
                    onClick={() => router.push('/admin/products')}
                    className="text-sm font-bold text-slate-500 hover:text-[#EEAF1C] transition-colors mb-4 flex items-center gap-1"
                >
                    <ChevronLeft className="h-4 w-4" /> Back to List
                </button>
                <h1 className="text-xl font-bold text-slate-900 dark:text-white mb-1 uppercase tracking-tight">
                    {isEdit ? 'Edit Product' : 'Add New Product'}
                </h1>
                <p className="text-sm text-slate-500">Enter product details and stock information</p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-6">
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    {/* Left Column: Data Arrays */}
                    <div className="lg:col-span-2 space-y-6">
                        <div className="bg-white dark:bg-[#1a252f] border border-slate-200 dark:border-white/10 rounded-[16px] overflow-hidden shadow-sm">
                            <div className="px-6 py-4 border-b border-slate-100 dark:border-white/10 flex items-center gap-3 bg-slate-50 dark:bg-white/5">
                                <Tag className="h-4 w-4 text-[#EEAF1C]" />
                                <h2 className="text-sm font-bold text-slate-800 dark:text-white uppercase tracking-wider">Product Information</h2>
                            </div>
                            <div className="p-6 space-y-6">
                                <div>
                                    <label className={labelCls}>Product Name <span className="text-red-500">*</span></label>
                                    <input required name="name" value={formData.name} onChange={handleChange} className={inputCls()} placeholder="e.g. Premium Lavender Moisturizer" />
                                </div>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    <div>
                                        <label className={labelCls}>Navbar Pages</label>
                                        <select name="main_category" value={formData.main_category} onChange={handleChange} className={selectCls}>
                                            <option value="">Select Navbar Page</option>
                                            {mainCategories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                                        </select>
                                    </div>
                                    <div>
                                        <label className={labelCls}>Products Category</label>
                                        <select name="category" value={formData.category} onChange={handleChange} className={selectCls}>
                                            <option value="">Select Products Category</option>
                                            {productCategories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                                        </select>
                                    </div>
                                    <div>
                                        <label className={labelCls}>Manufacturer Node</label>
                                        <select name="company" value={formData.company} onChange={handleChange} className={selectCls}>
                                            <option value="">Select Manufacturer</option>
                                            {companies.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                                        </select>
                                    </div>
                                    <div className={user?.role_name?.toLowerCase().includes('supplier') ? 'hidden' : 'block'}>
                                        <label className={labelCls}>Supplier <span className="text-red-500">*</span></label>
                                        <select name="supplier" value={formData.supplier} onChange={handleChange} className={selectCls}>
                                            <option value="">Select Supplier</option>
                                            {suppliers.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                                        </select>
                                    </div>
                                </div>
                                <div>
                                    <label className={labelCls}>Description</label>
                                    <textarea name="description" value={formData.description} onChange={handleChange} rows={4} className={inputCls() + " resize-none"} placeholder="Detailed product description..." />
                                </div>
                            </div>
                        </div>

                        <div className="bg-white dark:bg-[#1a252f] border border-slate-200 dark:border-white/10 rounded-[16px] overflow-hidden shadow-sm">
                            <div className="px-6 py-4 border-b border-slate-100 dark:border-white/10 flex items-center gap-3 bg-slate-50 dark:bg-white/5">
                                <DollarSign className="h-4 w-4 text-[#EEAF1C]" />
                                <h2 className="text-sm font-bold text-slate-800 dark:text-white uppercase tracking-wider">Pricing & Logistics</h2>
                            </div>
                            <div className="p-6 grid grid-cols-1 md:grid-cols-3 gap-6">
                                <div>
                                    <label className={labelCls}>TP (Cost Basis)</label>
                                    <input type="number" step="0.01" name="cost" value={formData.cost} onChange={handleChange} className={inputCls()} placeholder="0.00" />
                                </div>
                                <div>
                                    <label className={labelCls}>Selling Valuation</label>
                                    <input type="number" step="0.01" name="price" value={formData.price} onChange={handleChange} className={inputCls()} placeholder="0.00" />
                                </div>
                                <div>
                                    <label className={labelCls}>MRP (Retail Cap)</label>
                                    <input type="number" step="0.01" name="retail_price" value={formData.retail_price} onChange={handleChange} className={inputCls()} placeholder="0.00" />
                                </div>
                                <div>
                                    <label className={labelCls}>Batch Assignment</label>
                                    <input name="batch_number" value={formData.batch_number} onChange={handleChange} className={inputCls()} placeholder="e.g. BATCH-2024" />
                                </div>
                                <div>
                                    <label className={labelCls}>SKU Unique ID</label>
                                    <input name="sku" value={formData.sku} onChange={handleChange} className={inputCls()} placeholder="SKU-XXXX" />
                                </div>
                                <div>
                                    <label className={labelCls}>Global Barcode</label>
                                    <input name="barcode" value={formData.barcode} onChange={handleChange} className={inputCls()} placeholder="UPC / EAN" />
                                </div>
                                <div className="md:col-span-3 pt-4 border-t border-slate-100 dark:border-white/5">
                                    <label className={labelCls}>Operational Status</label>
                                    <div className="flex items-center gap-6">
                                        {['active', 'inactive', 'archived'].map(s => (
                                            <label key={s} className="flex items-center gap-2 cursor-pointer group">
                                                <input
                                                    type="radio"
                                                    name="status"
                                                    value={s}
                                                    checked={formData.status === s}
                                                    onChange={handleChange}
                                                    className="w-4 h-4 text-[#EEAF1C]"
                                                />
                                                <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] uppercase tracking-tight text-slate-400 border border-slate-200 dark:border-white/10 font-bold group-hover:text-[#EEAF1C] transition-colors">{s}</span>
                                            </label>
                                        ))}
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Right Column: Visual Assets */}
                    <div className="space-y-6">
                        <div className="bg-white dark:bg-[#1a252f] border border-slate-200 dark:border-white/10 rounded-[16px] overflow-hidden shadow-sm">
                            <div className="px-6 py-4 border-b border-slate-100 dark:border-white/10 flex items-center gap-3 bg-slate-50 dark:bg-white/5">
                                <ImageIcon className="h-4 w-4 text-[#EEAF1C]" />
                                <h2 className="text-sm font-bold text-slate-800 dark:text-white uppercase tracking-wider">Primary Visual</h2>
                            </div>
                            <div className="p-6">
                                <div className="aspect-square bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-2xl flex items-center justify-center overflow-hidden relative group">
                                    {mainImagePreview ? (
                                        <img src={mainImagePreview} alt="Preview" className="w-full h-full object-contain p-2 transition-transform group-hover:scale-105" />
                                    ) : (
                                        <div className="text-center">
                                            <ImageIcon className="h-10 w-10 text-slate-200 mx-auto mb-2" />
                                            <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">Awaiting Manifest</p>
                                        </div>
                                    )}
                                    <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                                        <button type="button" onClick={() => fileInputRef.current?.click()} className="bg-white px-4 py-2 rounded-lg text-xs font-bold uppercase tracking-tight shadow-lg hover:scale-105 transition-all text-slate-900 border">
                                            Modify Asset
                                        </button>
                                    </div>
                                </div>
                                <input type="file" ref={fileInputRef} className="hidden" accept="image/*" onChange={handleMainImageChange} />
                            </div>
                        </div>

                        <div className="bg-white dark:bg-[#1a252f] border border-slate-200 dark:border-white/10 rounded-[16px] overflow-hidden shadow-sm">
                            <div className="px-6 py-4 border-b border-slate-100 dark:border-white/10 flex items-center justify-between bg-slate-50 dark:bg-white/5">
                                <div className="flex items-center gap-3">
                                    <Layers className="h-4 w-4 text-[#EEAF1C]" />
                                    <h2 className="text-sm font-bold text-slate-800 dark:text-white uppercase tracking-wider">Gallery Manifest</h2>
                                </div>
                                <button type="button" onClick={() => galleryInputRef.current?.click()} className="p-1.5 bg-[#EEAF1C]/10 text-[#EEAF1C] rounded-lg hover:bg-blue-600 hover:text-white transition-all">
                                    <Plus className="h-4 w-4" />
                                </button>
                            </div>
                            <div className="p-4 grid grid-cols-3 gap-3">
                                {existingGallery.map((img, i) => (
                                    <div key={i} className="aspect-square bg-slate-50 dark:bg-white/5 border border-slate-100 dark:border-white/10 rounded-lg overflow-hidden">
                                        <img src={getImageUrl(img.image_url || img.image) || ""} className="w-full h-full object-cover" alt="" />
                                    </div>
                                ))}
                                {additionalImages.map((file, i) => (
                                    <div key={i} className="aspect-square bg-slate-50 dark:bg-white/5 border border-slate-100 dark:border-white/10 rounded-lg overflow-hidden relative group">
                                        <img src={URL.createObjectURL(file)} className="w-full h-full object-cover" alt="" />
                                        <button onClick={() => removeNewGalleryImage(i)} className="absolute inset-0 bg-red-600/60 backdrop-blur-sm text-white opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                                            <X className="h-4 w-4 font-bold" />
                                        </button>
                                    </div>
                                ))}
                                <button
                                    type="button"
                                    onClick={() => galleryInputRef.current?.click()}
                                    className="aspect-square border border-dashed border-slate-200 dark:border-white/10 rounded-lg flex items-center justify-center hover:bg-slate-50 dark:hover:bg-white/5 transition-colors group"
                                >
                                    <Plus className="h-5 w-5 text-slate-300 group-hover:text-[#EEAF1C] transition-colors" />
                                </button>
                                <input type="file" ref={galleryInputRef} className="hidden" accept="image/*" multiple onChange={handleGalleryChange} />
                            </div>
                        </div>

                        <div className="pt-4 space-y-3">
                            <button
                                type="submit"
                                disabled={saving}
                                className="w-full py-3.5 bg-[#EEAF1C] text-white rounded-xl text-sm font-bold uppercase tracking-tight shadow-lg hover:bg-blue-700 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
                            >
                                {saving ? <Loader2 className="h-5 w-5 animate-spin" /> : <Save className="h-5 w-5" />}
                                {isEdit ? 'Save Changes' : 'Add Product'}
                            </button>
                            <button
                                type="button"
                                onClick={() => router.push('/admin/products')}
                                className="w-full py-3 bg-white dark:bg-[#1a252f] border border-slate-200 dark:border-white/10 rounded-xl text-xs font-bold text-slate-500 hover:text-red-600 transition-all uppercase tracking-tight"
                            >
                                Discard Protocol
                            </button>
                        </div>
                    </div>
                </div>
            </form>
        </div>
    );
}
