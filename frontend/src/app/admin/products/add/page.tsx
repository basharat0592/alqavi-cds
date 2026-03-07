'use client';

import React, { useState, useRef, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import Link from 'next/link';
import { Card } from '@/components/ui/Card';
import { productService, companyService, companyCategoryService } from '@/lib/api';
import type { CompanyInfo, CompanyCategory } from '@/lib/api';
import {
    Upload, X, Save, ArrowLeft, Image as ImageIcon,
    Type, AlignLeft, Tag, Box, Building2, Calendar,
    DollarSign, Percent, Info, Settings, ShieldCheck,
    CreditCard, CheckCircle, XCircle, Globe
} from 'lucide-react';

const PRODUCT_CATEGORIES = [
    { id: 'New Arrivals', name: 'New Arrivals' },
    { id: 'Best Sellers', name: 'Best Sellers' },
    { id: 'Wholesale / B2B', name: 'Wholesale / B2B' },
    { id: 'Skincare', name: 'Skincare' },
    { id: 'Makeup', name: 'Makeup' },
    { id: 'Fragrance', name: 'Fragrance' },
    { id: 'Haircare', name: 'Haircare' },
    { id: 'Gift Sets', name: 'Gift Sets' }
];

export default function AddEditProductPage() {
    const router = useRouter();
    const params = useParams();
    const productId = params?.id as string;
    const isEditMode = productId && productId !== 'add';

    const fileInputRef = useRef<HTMLInputElement>(null);
    const [images, setImages] = useState<string[]>([]);
    const [imageFiles, setImageFiles] = useState<File[]>([]);
    const [categories, setCategories] = useState<any[]>([]);
    const [companies, setCompanies] = useState<CompanyInfo[]>([]);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [isLoading, setIsLoading] = useState(isEditMode);

    const [toast, setToast] = useState<{ show: boolean, message: string, type: 'success' | 'error' }>({ show: false, message: '', type: 'success' });
    const [validationErrors, setValidationErrors] = useState<Record<string, string>>({});

    const showToast = (message: string, type: 'success' | 'error') => {
        setToast({ show: true, message, type });
        setTimeout(() => setToast(t => ({ ...t, show: false })), 4000);
    };

    const [formData, setFormData] = useState({
        name: '',
        description: '',
        category: '',
        price: '',
        costPrice: '',
        retailPrice: '',
        stock: '',
        sku: '',
        brand: '',
        companyName: '',
        company_category: '',
        purchaseDate: '',
        expiryDate: '',
        status: 'active'
    });

    // Fetch Categories
    useEffect(() => {
        const fetchCategories = async () => {
            try {
                const cats = await productService.getCategories();
                const fetchedCats = Array.isArray(cats) ? cats : cats.results || [];

                const combined = PRODUCT_CATEGORIES.map(staticCat => {
                    const found = fetchedCats.find((c: any) => c.name.toLowerCase() === staticCat.name.toLowerCase());
                    return found ? { id: found.id, name: staticCat.name } : staticCat;
                });

                fetchedCats.forEach((fc: any) => {
                    if (!combined.some(c => c.name.toLowerCase() === fc.name.toLowerCase())) {
                        combined.push(fc);
                    }
                });
                setCategories(combined);
            } catch (error) {
                setCategories(PRODUCT_CATEGORIES);
            }
        };
        fetchCategories();
    }, []);

    // Fetch Companies & Company Categories
    const [companyCategories, setCompanyCategories] = useState<CompanyCategory[]>([]);
    useEffect(() => {
        companyService.getAll()
            .then(data => setCompanies(data))
            .catch(() => setCompanies([]));

        companyCategoryService.getAll()
            .then(data => setCompanyCategories(data))
            .catch(() => setCompanyCategories([]));
    }, []);

    // Load Data for Edit Mode
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
                        costPrice: product.cost_price ? product.cost_price.toString() : (product.costPrice || ''),
                        retailPrice: product.retail_price ? product.retail_price.toString() : (product.retailPrice || ''),
                        stock: product.stock !== undefined ? product.stock.toString() : (product.stock_quantity !== undefined ? product.stock_quantity.toString() : '0'),
                        sku: product.sku || '',
                        brand: product.brand || '',
                        companyName: product.company_name || product.companyName || '',
                        purchaseDate: product.purchase_date || product.purchaseDate || '',
                        expiryDate: product.expiry_date || product.expiryDate || '',
                        company_category: product.company_category?.id || product.company_category || '',
                        status: (product.is_active === false || product.is_visible_on_landing === false) ? 'draft' : 'active'
                    });
                    if (product.image) {
                        setImages([product.image]);
                    }
                } catch (error) {
                    console.error("Error fetching product", error);
                } finally {
                    setIsLoading(false);
                }
            };
            fetchProduct();
        } else {
            setIsLoading(false);
        }
    }, [isEditMode, productId]);

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const files = e.target.files;
        if (files && files.length > 0) {
            const newImages: string[] = [];
            const newFiles: File[] = [];
            Array.from(files).forEach(file => {
                const imageUrl = URL.createObjectURL(file);
                newImages.push(imageUrl);
                newFiles.push(file);
            });
            setImages(prev => [...prev, ...newImages]);
            setImageFiles(prev => [...prev, ...newFiles]);
        }
    };

    const removeImage = (index: number) => {
        setImages(prev => prev.filter((_, i) => i !== index));
        setImageFiles(prev => prev.filter((_, i) => i !== index));
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        // ── Validation ──────────────────────────────────
        const errs: Record<string, string> = {};
        if (!formData.name.trim()) errs.name = 'Product name is required';
        if (!formData.price || parseFloat(formData.price) <= 0)
            errs.price = 'Selling price must be greater than 0';
        if (!formData.stock && formData.stock !== '0')
            errs.stock = 'Stock quantity is required';
        if (!formData.category) errs.category = 'Please select a category';

        if (Object.keys(errs).length > 0) {
            setValidationErrors(errs);
            showToast('Please fill in all required fields.', 'error');
            return;
        }
        setValidationErrors({});
        setIsSubmitting(true);

        try {
            const data = new FormData();
            data.append('name', formData.name);
            data.append('description', formData.description);

            // Handle Category
            const isNumber = /^\d+$/.test(formData.category.toString());
            if (isNumber) {
                data.append('category', formData.category.toString());
            } else {
                const cat = categories.find(c => c.name === formData.category || c.id.toString() === formData.category);
                if (cat) data.append('category', cat.id.toString());
                else if (categories.length > 0) data.append('category', categories[0].id.toString()); // Fallback
            }

            data.append('price', formData.price || '0');
            if (formData.costPrice) data.append('cost', formData.costPrice);
            if (formData.retailPrice) data.append('retail_price', formData.retailPrice);
            data.append('quantity_in_stock', formData.stock || '0');

            if (formData.sku) {
                data.append('sku', formData.sku);
            } else {
                data.append('sku', `SKU-${Date.now()}`);
            }

            data.append('status', formData.status);
            if (formData.company_category) data.append('company_category', formData.company_category);

            if (imageFiles.length > 0) {
                data.append('image', imageFiles[0]); // Take first file
            }

            if (isEditMode) {
                try {
                    await productService.update(productId, data);
                    showToast(`Product "${formData.name}" updated successfully!`, 'success');
                    setTimeout(() => router.push('/admin/products'), 1500);
                } catch (e: any) {
                    console.warn("API update failed", e);
                    const errMsg = e?.response?.data ? JSON.stringify(e.response.data) : (e.message || "");
                    showToast(`Failed to update product "${formData.name}". ${errMsg}`, 'error');
                }
            } else {
                try {
                    await productService.create(data);
                    showToast(`Product "${formData.name}" added successfully!`, 'success');
                    setTimeout(() => router.push('/admin/products'), 1500);
                } catch (e: any) {
                    console.warn("API create failed", e);
                    const errMsg = e?.response?.data ? JSON.stringify(e.response.data) : (e.message || "");
                    showToast(`Failed to add product "${formData.name}". ${errMsg}`, 'error');
                }
            }
        } finally {
            setIsSubmitting(false);
        }
    };

    if (isLoading) {
        return <div className="p-8 text-center text-gray-500">Loading details...</div>;
    }

    return (
        <div className="max-w-4xl mx-auto space-y-6">
            <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-4">
                    <Link href="/admin/products" className="p-2 bg-white border border-gray-200 rounded-full text-gray-500 hover:text-[#FF9900] hover:bg-[#FF9900]/10 hover:border-[#FF9900]/30 transition-all shadow-sm">
                        <ArrowLeft size={20} />
                    </Link>
                    <div>
                        <h1 className="text-2xl font-bold text-gray-900">{isEditMode ? 'Edit Product' : 'Add New Product'}</h1>
                        <p className="text-gray-500 text-sm mt-1">{isEditMode ? `Update details for ${formData.name}` : 'Create a new product in the catalog.'}</p>
                    </div>
                </div>
            </div>

            <form onSubmit={handleSubmit} className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Left Column: General, Pricing, Inventory */}
                <div className="lg:col-span-2 space-y-6">
                    {/* General Information */}
                    <Card title="General Information">
                        <div className="space-y-4">
                            <div>
                                <label className="block text-xs font-bold text-gray-700 mb-1">Product Name</label>
                                <div className="relative">
                                    <Type className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                                    <input
                                        type="text"
                                        name="name"
                                        value={formData.name}
                                        onChange={e => { handleInputChange(e); setValidationErrors(prev => ({ ...prev, name: '' })); }}
                                        className={`w-full pl-10 pr-4 py-3 bg-gray-50 border rounded-xl focus:bg-white focus:outline-none focus:ring-2 text-sm text-gray-900 transition-all font-medium ${validationErrors.name
                                            ? 'border-red-400 focus:ring-red-100 focus:border-red-400'
                                            : 'border-gray-200 focus:ring-[#FF9900]/20 focus:border-[#FF9900]'
                                            }`}
                                        placeholder="e.g. Vitamin C Face Serum 30ml"
                                    />
                                </div>
                                {validationErrors.name && <p className="text-red-500 text-[10px] font-bold mt-1">{validationErrors.name}</p>}
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-gray-700 mb-1">Description</label>
                                <div className="relative">
                                    <AlignLeft className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                                    <textarea
                                        name="description"
                                        value={formData.description}
                                        onChange={handleInputChange}
                                        rows={4}
                                        className="w-full pl-10 pr-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#FF9900]/20 focus:border-[#FF9900] text-sm text-gray-900 transition-all resize-none"
                                        placeholder="Write an engaging product description..."
                                    />
                                </div>
                            </div>
                        </div>
                    </Card>

                    {/* Pricing */}
                    <Card title="Pricing">
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="block text-xs font-bold text-gray-700 mb-1">Cost Price (Rs.)</label>
                                <div className="relative">
                                    <CreditCard className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                                    <input
                                        type="number"
                                        name="costPrice"
                                        value={formData.costPrice}
                                        onChange={handleInputChange}
                                        className="w-full pl-10 pr-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#FF9900]/20 focus:border-[#FF9900] text-sm text-gray-900 transition-all font-medium"
                                        placeholder="0.00"
                                        min="0"
                                    />
                                </div>
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-gray-700 mb-1">Retail Price (Rs.)</label>
                                <div className="relative">
                                    <Tag className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-blue-400" />
                                    <input
                                        type="number"
                                        name="retailPrice"
                                        value={formData.retailPrice}
                                        onChange={handleInputChange}
                                        className="w-full pl-10 pr-4 py-3 bg-gray-50 border border-blue-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-200 focus:border-blue-400 text-sm text-blue-700 transition-all font-medium"
                                        placeholder="0.00"
                                        min="0"
                                    />
                                </div>
                            </div>
                            <div className="col-span-2">
                                <label className="block text-xs font-bold text-gray-700 mb-1">Selling Price (Rs.) <span className="text-red-500">*</span></label>
                                <div className="relative">
                                    <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[#FF9900]" />
                                    <input
                                        type="number"
                                        name="price"
                                        value={formData.price}
                                        onChange={e => { handleInputChange(e); setValidationErrors(prev => ({ ...prev, price: '' })); }}
                                        className={`w-full pl-10 pr-4 py-3 bg-gray-50 border rounded-xl focus:bg-white focus:outline-none focus:ring-2 text-sm font-bold transition-all ${validationErrors.price
                                            ? 'border-red-400 text-red-500 focus:ring-red-100 focus:border-red-400'
                                            : 'border-gray-200 text-[#FF9900] focus:ring-[#FF9900]/20 focus:border-[#FF9900]'
                                            }`}
                                        placeholder="0.00"
                                        min="0"
                                    />
                                </div>
                                {validationErrors.price && <p className="text-red-500 text-[10px] font-bold mt-1">{validationErrors.price}</p>}
                            </div>
                        </div>
                    </Card>

                    {/* Inventory & Tracking */}
                    <Card title="Inventory & Tracking">
                        <div className="space-y-4">
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-xs font-bold text-gray-700 mb-1">SKU</label>
                                    <div className="relative">
                                        <Settings className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                                        <input
                                            type="text"
                                            name="sku"
                                            value={formData.sku}
                                            onChange={handleInputChange}
                                            className="w-full pl-10 pr-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#FF9900]/20 focus:border-[#FF9900] text-sm text-gray-900 transition-all font-medium"
                                            placeholder="e.g. SKU-123456"
                                        />
                                    </div>
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-gray-700 mb-1">Stock Quantity</label>
                                    <div className="relative">
                                        <Box className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                                        <input
                                            type="number"
                                            name="stock"
                                            value={formData.stock}
                                            onChange={e => { handleInputChange(e); setValidationErrors(prev => ({ ...prev, stock: '' })); }}
                                            className={`w-full pl-10 pr-4 py-3 bg-gray-50 border rounded-xl focus:bg-white focus:outline-none focus:ring-2 text-sm text-gray-900 transition-all font-medium ${validationErrors.stock
                                                ? 'border-red-400 focus:ring-red-100 focus:border-red-400'
                                                : 'border-gray-200 focus:ring-[#FF9900]/20 focus:border-[#FF9900]'
                                                }`}
                                            placeholder="0"
                                            min="0"
                                        />
                                    </div>
                                    {validationErrors.stock && <p className="text-red-500 text-[10px] font-bold mt-1">{validationErrors.stock}</p>}
                                </div>
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-xs font-bold text-gray-700 mb-1">Purchase Date</label>
                                    <div className="relative">
                                        <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                                        <input
                                            type="date"
                                            name="purchaseDate"
                                            value={formData.purchaseDate}
                                            onChange={handleInputChange}
                                            className="w-full pl-10 pr-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#FF9900]/20 focus:border-[#FF9900] transition-all text-gray-700 uppercase tracking-wider text-xs font-bold"
                                        />
                                    </div>
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-gray-700 mb-1">Expiry Date</label>
                                    <div className="relative">
                                        <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                                        <input
                                            type="date"
                                            name="expiryDate"
                                            value={formData.expiryDate}
                                            onChange={handleInputChange}
                                            className="w-full pl-10 pr-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#FF9900]/20 focus:border-[#FF9900] transition-all text-gray-700 uppercase tracking-wider text-xs font-bold"
                                        />
                                    </div>
                                </div>
                            </div>
                        </div>
                    </Card>
                </div>

                {/* Right Column: Organization & Media */}
                <div className="space-y-6">
                    {/* Status / Publish Card */}
                    <Card title="Product Status">
                        <div className="flex items-center justify-between">

                            {/* Left: Label + Status */}
                            <div className="flex flex-col">
                                <span className="text-sm font-medium text-gray-900">
                                    Product Visibility
                                </span>
                                <span className="text-xs text-gray-500">
                                    {formData.status === 'active'
                                        ? 'Visible on storefront'
                                        : 'Hidden from storefront'}
                                </span>
                            </div>

                            {/* Right: Modern Toggle */}
                            <button
                                type="button"
                                onClick={() =>
                                    setFormData(prev => ({
                                        ...prev,
                                        status: prev.status === 'active' ? 'inactive' : 'active'
                                    }))
                                }
                                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors duration-300 ${formData.status === 'active'
                                    ? 'bg-[#FF9900]'
                                    : 'bg-gray-300'
                                    }`}
                            >
                                <span
                                    className={`inline-block h-4 w-4 transform rounded-full bg-white transition duration-300 ${formData.status === 'active'
                                        ? 'translate-x-6'
                                        : 'translate-x-1'
                                        }`}
                                />
                            </button>

                        </div>
                    </Card>

                    {/* Product Images */}
                    <Card title="Product Images">
                        <div className="space-y-4">
                            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                                {images.map((img, index) => (
                                    <div key={index} className="relative aspect-square rounded-xl border border-gray-200 overflow-hidden group">
                                        <img src={img} alt={`Product ${index}`} className="w-full h-full object-cover" />
                                        <button
                                            type="button"
                                            onClick={() => removeImage(index)}
                                            className="absolute top-1 right-1 bg-white/90 p-1 rounded-full text-red-600 opacity-0 group-hover:opacity-100 transition-opacity hover:bg-white shadow-sm"
                                        >
                                            <X size={14} />
                                        </button>
                                    </div>
                                ))}

                                <button
                                    type="button"
                                    onClick={() => fileInputRef.current?.click()}
                                    className="aspect-square rounded-xl border-2 border-dashed border-gray-300 flex flex-col items-center justify-center text-gray-400 hover:border-[#FF9900] hover:text-[#FF9900] hover:bg-[#FF9900]/5 transition-colors bg-gray-50"
                                >
                                    <Upload size={20} className="mb-1" />
                                    <span className="text-[10px] font-bold">Add</span>
                                </button>
                                <input
                                    type="file"
                                    ref={fileInputRef}
                                    className="hidden"
                                    multiple
                                    accept="image/*"
                                    onChange={handleImageUpload}
                                />
                            </div>
                            <p className="text-[11px] text-gray-500 font-medium text-center">
                                Supports JPG, PNG up to 4 images.
                            </p>
                        </div>
                    </Card>

                    {/* Organization */}
                    <Card title="Organization">
                        <div className="space-y-4">
                            <div>
                                <label className="block text-xs font-bold text-gray-700 mb-1">Category</label>
                                <div className="relative">
                                    <Tag className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                                    <select
                                        name="category"
                                        value={formData.category}
                                        onChange={handleInputChange}
                                        className="w-full pl-10 pr-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#FF9900]/20 focus:border-[#FF9900] text-sm text-gray-900 transition-all appearance-none cursor-pointer font-medium"
                                        required
                                    >
                                        <option value="" disabled>Select Category</option>
                                        {categories.map((cat: any) => (
                                            <option key={cat.id} value={cat.id}>{cat.name}</option>
                                        ))}
                                    </select>
                                </div>
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-gray-700 mb-1">Brand</label>
                                <div className="relative">
                                    <ShieldCheck className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                                    <input
                                        type="text"
                                        name="brand"
                                        value={formData.brand}
                                        onChange={handleInputChange}
                                        className="w-full pl-10 pr-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#FF9900]/20 focus:border-[#FF9900] text-sm text-gray-900 transition-all font-medium"
                                        placeholder="e.g. L'Oreal"
                                    />
                                </div>
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-gray-700 mb-1">Company Name</label>
                                <div className="relative">
                                    <Building2 className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 pointer-events-none z-10" />
                                    {companies.length > 0 ? (
                                        <select
                                            name="companyName"
                                            value={formData.companyName}
                                            onChange={handleInputChange}
                                            className="w-full pl-10 pr-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#FF9900]/20 focus:border-[#FF9900] text-sm text-gray-900 transition-all appearance-none cursor-pointer font-medium"
                                        >
                                            <option value="">Select Company</option>
                                            {companies.map(c => (
                                                <option key={c.id} value={c.name}>{c.name}</option>
                                            ))}
                                        </select>
                                    ) : (
                                        <input
                                            type="text"
                                            name="companyName"
                                            value={formData.companyName}
                                            onChange={handleInputChange}
                                            className="w-full pl-10 pr-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#FF9900]/20 focus:border-[#FF9900] text-sm text-gray-900 transition-all font-medium"
                                            placeholder="No companies yet — add one first"
                                        />
                                    )}
                                </div>
                                {companies.length === 0 && (
                                    <p className="text-[10px] text-amber-600 font-bold mt-1 flex items-center gap-1">
                                        <Building2 className="h-3 w-3" /> Go to Company section to add companies first
                                    </p>
                                )}
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-gray-700 mb-1">Product Origin / Region</label>
                                <div className="relative">
                                    <Globe className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 pointer-events-none z-10" />
                                    <select
                                        name="company_category"
                                        value={formData.company_category}
                                        onChange={handleInputChange}
                                        className="w-full pl-10 pr-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#FF9900]/20 focus:border-[#FF9900] text-sm text-gray-900 transition-all appearance-none cursor-pointer font-medium"
                                    >
                                        <option value="">Select Origin (Local/Imported)</option>
                                        {companyCategories.map(cat => (
                                            <option key={cat.id} value={cat.id}>{cat.name}</option>
                                        ))}
                                    </select>
                                </div>
                            </div>
                        </div>
                    </Card>

                    {/* ── Action Buttons ── */}
                    <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-4 flex flex-col gap-3">
                        <button
                            type="button"
                            disabled={isSubmitting}
                            onClick={handleSubmit as any}
                            className="w-full flex items-center justify-center gap-2 py-3 bg-gradient-to-r from-[#FF9900] to-[#e68a00] text-white font-black text-xs uppercase tracking-widest rounded-xl hover:shadow-[0_8px_20px_rgba(255,153,0,0.35)] hover:-translate-y-0.5 transition-all disabled:opacity-60 disabled:transform-none shadow-md"
                        >
                            {isSubmitting
                                ? <span className="animate-spin w-4 h-4 border-2 border-white/30 border-t-white rounded-full" />
                                : <Save size={16} />
                            }
                            {isSubmitting ? 'Saving...' : 'Save Product'}
                        </button>
                        <Link href="/admin/products">
                            <button type="button"
                                className="w-full py-3 bg-white border border-gray-200 text-gray-700 font-black text-xs uppercase tracking-widest rounded-xl hover:bg-gray-50 transition-all">
                                Cancel
                            </button>
                        </Link>
                    </div>
                </div>
            </form>

            {/* Toast Notification */}
            {toast.show && (
                <div className="fixed bottom-8 right-8 z-[100] animate-in fade-in slide-in-from-bottom-5 duration-300">
                    <div className="bg-white border border-gray-100 px-5 py-4 rounded-2xl shadow-2xl flex items-center gap-4 min-w-[300px]">
                        <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${toast.type === 'success' ? 'bg-emerald-500' : 'bg-red-500'}`}>
                            {toast.type === 'success' ? <CheckCircle className="h-5 w-5 text-white" /> : <XCircle className="h-5 w-5 text-white" />}
                        </div>
                        <div className="flex-1">
                            <p className={`font-black text-[10px] uppercase tracking-widest mb-0.5 ${toast.type === 'success' ? 'text-emerald-600' : 'text-red-600'}`}>
                                {toast.type === 'success' ? 'Success' : 'Error'}
                            </p>
                            <p className="text-gray-900 text-sm font-bold leading-tight">{toast.message}</p>
                        </div>
                        <button type="button" onClick={() => setToast(t => ({ ...t, show: false }))} className="p-1 hover:bg-gray-100 rounded-full transition-colors text-gray-400">
                            <X className="h-4 w-4" />
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
}
