'use client';

import { useState, useEffect, useRef } from 'react';
import { 
    Plus, Search, Edit2, Trash2, Package, 
    MoreVertical, ExternalLink, Image as ImageIcon,
    RefreshCw, Filter, CheckCircle2, XCircle, Upload, Tag
} from 'lucide-react';
import { productService } from '@/lib/api';
import { authService } from '@/lib/auth';
import { getImageUrl } from '@/lib/utils';

export default function SupplierProductsPage() {
    const [products, setProducts] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [currentUser, setCurrentUser] = useState<any>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const [imagePreview, setImagePreview] = useState<string | null>(null);

    // 🆕 Category creation state
    const [isCreatingCategory, setIsCreatingCategory] = useState(false);
    const [isCategoryModalOpen, setIsCategoryModalOpen] = useState(false);
    const [newCategoryName, setNewCategoryName] = useState('');
    const [isSavingCategory, setIsSavingCategory] = useState(false);

    const [form, setForm] = useState({
        product_name: '',
        category: '',
        description: '',
        cost_price: '',
        selling_price: '',
        image: null as File | null
    });

    const [categories, setCategories] = useState<any[]>([]);

    const loadData = async () => {
        setLoading(true);
        try {
            const cats = await productService.getCategories(); 
            setCategories(cats);

            // Auto-select 'Supplier' category if available
            const supplierCat = cats.find(c => 
                c.name?.toLowerCase().includes('supplier') || 
                c.name?.toLowerCase().includes('b2b')
            );
            if (supplierCat) {
                setForm(prev => ({ ...prev, category: String(supplierCat.id) }));
            }

            const res = await productService.getAll();
            setProducts(Array.isArray(res) ? res : res.results || []);
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        const user = authService.getUser();
        if (user) setCurrentUser(user);
        loadData();
    }, []);

    const handleCreateCategory = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!newCategoryName.trim()) return;
        setIsSavingCategory(true);
        try {
            const newCat = await productService.createCategory({ name: newCategoryName });
            const allCats = await productService.getCategories();
            setCategories(allCats);
            setForm(prev => ({ ...prev, category: String(newCat.id) }));
            setNewCategoryName('');
            setIsCreatingCategory(false);
        } catch (err) {
            alert("Failed to create category");
        } finally {
            setIsSavingCategory(false);
        }
    };

    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsSubmitting(true);
        try {
            const formData = new FormData();
            formData.append('product_name', form.product_name);
            formData.append('category', form.category);
            formData.append('description', form.description);
            formData.append('cost_price', form.cost_price);
            if (form.selling_price) {
                formData.append('selling_price', form.selling_price);
            }
            formData.append('is_supplier_only', 'true'); 
            if (form.image) formData.append('image', form.image);

            await productService.create(formData as any);
            setIsModalOpen(false);
            setForm({
                product_name: '',
                category: form.category, // keep category for convenience
                description: '',
                cost_price: '',
                selling_price: '',
                image: null
            });
            setImagePreview(null);
            loadData();
        } catch (err) {
            alert("Error saving product");
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div className="space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-black text-slate-900 tracking-tight uppercase">My B2B Catalog</h1>
                    <p className="text-sm font-bold text-slate-500 mt-0.5">Manage products offered to Al-Qavi Trades administrative team.</p>
                </div>
                <div className="flex items-center gap-3">
                    <button 
                        onClick={() => setIsCategoryModalOpen(true)}
                        className="flex items-center gap-2 px-6 py-3 bg-white text-slate-700 border border-slate-200 rounded-2xl text-xs font-black uppercase tracking-widest hover:bg-slate-50 transition-all shadow-sm"
                    >
                        <Tag className="h-4 w-4 text-[#F59E0B]" /> Categories
                    </button>
                    <button 
                        onClick={() => setIsModalOpen(true)}
                        className="flex items-center gap-2 px-6 py-3 bg-[#F59E0B] text-white rounded-2xl text-xs font-black uppercase tracking-widest hover:scale-105 transition-all shadow-lg shadow-amber-500/20"
                    >
                        <Plus className="h-4 w-4" /> Add To Catalog
                    </button>
                </div>
            </div>

            {/* Filters */}
            <div className="bg-white p-4 rounded-2xl border border-slate-200 flex flex-col md:flex-row gap-4 items-center shadow-sm">
                <div className="relative flex-1 w-full">
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                    <input 
                        type="text" 
                        placeholder="Search your catalog..." 
                        className="w-full pl-11 pr-4 py-2.5 bg-slate-50 border-none rounded-xl text-sm font-bold outline-none focus:ring-2 focus:ring-amber-500/20 transition-all"
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                    />
                </div>
                <div className="flex items-center gap-2 w-full md:w-auto">
                    <select className="bg-slate-50 border-none rounded-xl px-4 py-2.5 text-sm font-bold outline-none focus:ring-2 focus:ring-amber-500/20">
                        <option>All Categories</option>
                        {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                    </select>
                    <button className="p-2.5 bg-slate-50 text-slate-500 rounded-xl hover:bg-slate-100">
                        <Filter className="h-4 w-4" />
                    </button>
                    <button className="p-2.5 bg-slate-50 text-slate-500 rounded-xl hover:bg-slate-100">
                        <RefreshCw className="h-4 w-4" />
                    </button>
                </div>
            </div>

            {/* Product Table */}
            <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
                <table className="w-full text-left">
                    <thead>
                        <tr className="bg-slate-50/50 border-b border-slate-100">
                            <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest">Product Details</th>
                            <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest">Category</th>
                            <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest text-right">Supply Price</th>
                            <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest text-center">Visibility</th>
                            <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest text-right">Actions</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                        {loading ? (
                            Array(5).fill(0).map((_, i) => (
                                <tr key={i} className="animate-pulse">
                                    <td colSpan={5} className="px-8 py-6"><div className="h-4 bg-slate-100 rounded w-full" /></td>
                                </tr>
                            ))
                        ) : products.length === 0 ? (
                            <tr>
                                <td colSpan={5} className="px-8 py-20 text-center">
                                    <Package className="h-12 w-12 text-slate-200 mx-auto mb-4" />
                                    <p className="text-sm font-bold text-slate-400">Your B2B catalog is empty. Add items to sell to admins.</p>
                                </td>
                            </tr>
                        ) : (
                            products.map((product: any) => (
                                <tr key={product.id} className="hover:bg-slate-50/50 transition-colors group">
                                    <td className="px-8 py-5">
                                        <div className="flex items-center gap-4">
                                            <div className="h-12 w-12 bg-slate-100 rounded-xl overflow-hidden border-2 border-slate-200 shadow-sm grow-0 shrink-0">
                                                {product.image ? (
                                                    <img src={getImageUrl(product.image)} alt="P" className="w-full h-full object-cover" />
                                                ) : (
                                                    <div className="w-full h-full flex items-center justify-center text-slate-300">
                                                        <ImageIcon className="h-5 w-5" />
                                                    </div>
                                                )}
                                            </div>
                                            <div className="min-w-0">
                                                <p className="text-sm font-black text-slate-900 uppercase tracking-tight truncate max-w-[200px]">{product.product_name || product.name}</p>
                                                <p className="text-[10px] font-bold text-slate-500 uppercase tracking-tighter mt-0.5">SKU: {product.sku || 'PENDING'}</p>
                                            </div>
                                        </div>
                                    </td>
                                    <td className="px-8 py-5">
                                        <span className="text-xs font-bold text-slate-600 bg-slate-100 px-3 py-1 rounded-lg">
                                            {product.category_name || 'General'}
                                        </span>
                                    </td>
                                    <td className="px-8 py-5 text-right font-black text-slate-900 text-sm">
                                        PKR {parseFloat(product.cost_price || 0).toLocaleString()}
                                    </td>
                                    <td className="px-8 py-5 text-center">
                                        <div className="flex items-center justify-center gap-1.5">
                                            {product.is_supplier_only ? (
                                                <span className="flex items-center gap-1.5 px-3 py-1 bg-amber-50 text-amber-700 text-[9px] font-black uppercase rounded-full border border-amber-100">
                                                    <Package className="h-3 w-3" /> Catalog Only
                                                </span>
                                            ) : (
                                                <span className="flex items-center gap-1.5 px-3 py-1 bg-emerald-50 text-emerald-700 text-[9px] font-black uppercase rounded-full border border-emerald-100">
                                                    <CheckCircle2 className="h-3 w-3" /> Live Store
                                                </span>
                                            )}
                                        </div>
                                    </td>
                                    <td className="px-8 py-5 text-right">
                                        <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                            <button className="p-2 hover:bg-slate-100 rounded-lg text-slate-400 hover:text-blue-600 transition-all">
                                                <Edit2 className="h-4 w-4" />
                                            </button>
                                            <button className="p-2 hover:bg-slate-100 rounded-lg text-slate-400 hover:text-red-600 transition-all">
                                                <Trash2 className="h-4 w-4" />
                                            </button>
                                            <button className="p-2 hover:bg-slate-100 rounded-lg text-slate-400 hover:text-amber-600 transition-all">
                                                <MoreVertical className="h-4 w-4" />
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
            </div>

            {/* Add Product Modal */}
            {isModalOpen && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
                    <div className="bg-white rounded-3xl w-full max-w-xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-300">
                        <div className="px-8 py-6 border-b border-slate-100 flex items-center justify-between">
                            <h2 className="text-xl font-black text-slate-900 uppercase tracking-tight">Add Catalog Item</h2>
                            <button onClick={() => setIsModalOpen(false)} className="p-2 hover:bg-slate-50 rounded-xl text-slate-400 transition-colors">
                                <XCircle className="h-6 w-6" />
                            </button>
                        </div>
                        <form onSubmit={handleSave} className="p-8 space-y-6">
                            <div className="grid grid-cols-2 gap-6">
                                <div className="col-span-2">
                                    <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2">Product Official Name</label>
                                    <input 
                                        required 
                                        className="w-full px-5 py-3 bg-slate-50 border-none rounded-2xl text-sm font-bold outline-none focus:ring-4 focus:ring-amber-500/10 transition-all"
                                        placeholder="e.g. Premium Cotton Shirting"
                                        value={form.product_name}
                                        onChange={(e) => setForm({...form, product_name: e.target.value})}
                                    />
                                </div>
                                <div>
                                    <div className="flex items-center justify-between mb-2">
                                        <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest">Category</label>
                                        <button 
                                            type="button"
                                            onClick={() => setIsCreatingCategory(!isCreatingCategory)}
                                            className="text-[9px] font-black text-[#F59E0B] uppercase tracking-wider hover:underline"
                                        >
                                            {isCreatingCategory ? 'Cancel' : '+ Add New'}
                                        </button>
                                    </div>
                                    
                                    {isCreatingCategory ? (
                                        <div className="flex gap-2">
                                            <input 
                                                autoFocus
                                                className="flex-1 px-4 py-3 bg-slate-50 border-none rounded-2xl text-sm font-bold outline-none focus:ring-2 focus:ring-amber-500/20 transition-all"
                                                placeholder="Category Name"
                                                value={newCategoryName}
                                                onChange={(e) => setNewCategoryName(e.target.value)}
                                                onKeyDown={(e) => e.key === 'Enter' && handleCreateCategory(e)}
                                            />
                                            <button 
                                                type="button"
                                                disabled={isSavingCategory}
                                                onClick={handleCreateCategory}
                                                className="px-4 bg-[#F59E0B] text-white rounded-2xl text-[10px] font-black uppercase hover:bg-orange-600 disabled:opacity-50"
                                            >
                                                {isSavingCategory ? '...' : 'Add'}
                                            </button>
                                        </div>
                                    ) : (
                                        <select 
                                            required
                                            className="w-full px-5 py-3 bg-slate-50 border-none rounded-2xl text-sm font-bold outline-none focus:ring-4 focus:ring-amber-500/10 transition-all cursor-pointer appearance-none"
                                            value={form.category}
                                            onChange={(e) => setForm({...form, category: e.target.value})}
                                        >
                                            <option value="">Select...</option>
                                            {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                                        </select>
                                    )}
                                </div>
                                <div>
                                    <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2">Supply Price (PKR)</label>
                                    <input 
                                        type="number" 
                                        required
                                        className="w-full px-5 py-3 bg-slate-50 border-none rounded-2xl text-sm font-bold outline-none focus:ring-4 focus:ring-amber-500/10 transition-all"
                                        placeholder="0.00"
                                        value={form.cost_price}
                                        onChange={(e) => setForm({...form, cost_price: e.target.value})}
                                    />
                                </div>
                                <div className="col-span-2">
                                    <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2">Detailed Description</label>
                                    <textarea 
                                        rows={3}
                                        className="w-full px-5 py-3 bg-slate-50 border-none rounded-2xl text-sm font-bold outline-none focus:ring-4 focus:ring-amber-500/10 transition-all resize-none"
                                        placeholder="Specifications, materials, lead times..."
                                        value={form.description}
                                        onChange={(e) => setForm({...form, description: e.target.value})}
                                    />
                                </div>
                                <div className="col-span-2">
                                    <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2">Product Imagery</label>
                                    <div 
                                        onClick={() => fileInputRef.current?.click()}
                                        className="border-2 border-dashed border-slate-200 rounded-2xl p-6 text-center hover:border-amber-500 group transition-all cursor-pointer overflow-hidden relative min-h-[140px] flex flex-col items-center justify-center"
                                    >
                                        {imagePreview ? (
                                            <div className="absolute inset-0">
                                                <img src={imagePreview} alt="Preview" className="w-full h-full object-cover opacity-20" />
                                                <div className="absolute inset-0 flex flex-col items-center justify-center">
                                                    <CheckCircle2 className="h-8 w-8 text-emerald-500 mb-2" />
                                                    <p className="text-xs font-black text-slate-900 uppercase">Image Selected</p>
                                                    <p className="text-[10px] text-slate-500 mt-1">Click to change</p>
                                                </div>
                                            </div>
                                        ) : (
                                            <>
                                                <ImageIcon className="h-8 w-8 text-slate-300 mx-auto mb-2 group-hover:text-amber-500 transition-colors" />
                                                <p className="text-xs font-bold text-slate-400 group-hover:text-slate-600 transition-colors">Drag and drop or click to upload HQ image</p>
                                            </>
                                        )}
                                        <input 
                                            ref={fileInputRef}
                                            type="file" 
                                            accept="image/*"
                                            className="hidden" 
                                            onChange={(e) => {
                                                const file = e.target.files?.[0] || null;
                                                setForm({...form, image: file});
                                                if (file) {
                                                    const reader = new FileReader();
                                                    reader.onloadend = () => setImagePreview(reader.result as string);
                                                    reader.readAsDataURL(file);
                                                } else {
                                                    setImagePreview(null);
                                                }
                                            }} 
                                        />
                                    </div>
                                </div>
                            </div>

                            <div className="pt-4 flex gap-4">
                                <button 
                                    type="button" 
                                    onClick={() => setIsModalOpen(false)}
                                    className="flex-1 py-4 bg-slate-100 text-slate-600 rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-slate-200 transition-all"
                                >
                                    Cancel
                                </button>
                                <button 
                                    type="submit"
                                    disabled={isSubmitting}
                                    className="flex-1 py-4 bg-[#F59E0B] text-white rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-[#F59E0B]/90 transition-all shadow-xl shadow-amber-500/20 disabled:opacity-50"
                                >
                                    {isSubmitting ? 'Syncing...' : 'Add to Catalog'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
            {/* Category Manager Modal */}
            {isCategoryModalOpen && (
                <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
                    <div className="bg-white rounded-3xl w-full max-w-md shadow-2xl overflow-hidden animate-in zoom-in-95 duration-300">
                        <div className="px-8 py-6 border-b border-slate-100 flex items-center justify-between">
                            <h2 className="text-lg font-black text-slate-900 uppercase tracking-tight">Manage Categories</h2>
                            <button onClick={() => setIsCategoryModalOpen(false)} className="p-2 hover:bg-slate-50 rounded-xl text-slate-400">
                                <XCircle className="h-5 w-5" />
                            </button>
                        </div>
                        <div className="p-8 space-y-6">
                            <div>
                                <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2">New Category Name</label>
                                <div className="flex gap-2">
                                    <input 
                                        autoFocus
                                        className="flex-1 px-5 py-3 bg-slate-50 border-none rounded-2xl text-sm font-bold outline-none focus:ring-4 focus:ring-amber-500/10"
                                        placeholder="e.g. Organic Care"
                                        value={newCategoryName}
                                        onChange={(e) => setNewCategoryName(e.target.value)}
                                        onKeyDown={(e) => e.key === 'Enter' && handleCreateCategory(e)}
                                    />
                                    <button 
                                        onClick={handleCreateCategory}
                                        disabled={isSavingCategory}
                                        className="px-6 bg-[#F59E0B] text-white rounded-2xl text-xs font-black uppercase hover:bg-orange-600 disabled:opacity-50"
                                    >
                                        {isSavingCategory ? '...' : 'Add'}
                                    </button>
                                </div>
                            </div>
                            
                            <div className="space-y-2">
                                <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2">Your Categories</label>
                                <div className="max-h-60 overflow-y-auto pr-2 space-y-2">
                                    {categories.length === 0 ? (
                                        <p className="text-xs text-slate-400 italic">No categories created yet.</p>
                                    ) : (
                                        categories.map(cat => (
                                            <div key={cat.id} className="flex items-center justify-between p-3 bg-slate-50 rounded-xl group">
                                                <span className="text-sm font-bold text-slate-700">{cat.name}</span>
                                                <Tag className="h-3 w-3 text-slate-300 group-hover:text-[#F59E0B] transition-colors" />
                                            </div>
                                        ))
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
