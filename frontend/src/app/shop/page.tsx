'use client';

import { useState, useEffect, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import Navbar from '@/components/layout/Navbar';
import Footer from '@/components/layout/Footer';
import { productService } from '@/lib/api';
import {
    ShoppingCart, Star, SlidersHorizontal, ChevronRight,
    Search, CheckCircle, X, Heart, Flame, Sparkles, Package,
    Grid3X3, LayoutList, ArrowUpDown, Tag, Eye, TrendingUp, Zap,
    Filter, ArrowRight, ChevronDown, Shield, Phone
} from 'lucide-react';
import { useCart } from '@/context/CartContext';
import { getImageUrl } from '@/lib/utils';

const CAT_ICONS: Record<string, string> = {
    'Skincare': '🧴', 'Makeup': '💄', 'Fragrance': '🌹',
    'Haircare': '💇', 'Gift Sets': '🎁', 'New Arrivals': '✨',
    'Best Sellers': '🔥', 'Wholesale / B2B': '📦',
};

// ─── Stars Component ────────────────────────────────────────────────────────────
function GoldStars({ count = 4, reviews = 120 }: { count?: number; reviews?: number }) {
    return (
        <div className="flex items-center gap-1.5">
            <div className="flex gap-0.5">
                {Array.from({ length: 5 }).map((_, i) => (
                    <Star key={i} className={`h-3 w-3 ${i < count ? 'text-amber-400 fill-amber-400' : 'text-gray-200 dark:text-slate-700 fill-gray-100 dark:fill-slate-800'}`} />
                ))}
            </div>
            <span className="text-[10px] font-bold text-gray-400">({reviews})</span>
        </div>
    );
}

// ─── Toast ─────────────────────────────────────────────────────────────────────
function Toast({ show, name }: { show: boolean; name: string }) {
    if (!show) return null;
    return (
        <div className="fixed bottom-8 right-8 z-[100] animate-in fade-in slide-in-from-bottom-4 duration-300">
            <div className="bg-white dark:bg-slate-900 border border-gray-100 dark:border-slate-800 text-gray-900 dark:text-white px-5 py-4 rounded-2xl shadow-2xl flex items-center gap-4 min-w-[280px]">
                <div className="bg-emerald-500 w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0">
                    <CheckCircle className="h-5 w-5 text-white" />
                </div>
                <div>
                    <p className="font-black text-emerald-600 text-[10px] uppercase tracking-widest mb-0.5">Added to Cart</p>
                    <p className="text-gray-600 dark:text-gray-400 text-sm font-semibold line-clamp-1">{name}</p>
                </div>
            </div>
        </div>
    );
}

// ─── Badge config ───────────────────────────────────────────────────────────────
const BADGE_CONFIG: Record<string, { label: string; cls: string }> = {
    'Best Seller': { label: 'Best Seller', cls: 'bg-amber-500 text-white' },
    'New': { label: 'New', cls: 'bg-emerald-500 text-white' },
    'Sale': { label: 'Sale', cls: 'bg-red-500 text-white' },
    'Luxury': { label: 'Luxury', cls: 'bg-violet-600 text-white' },
    'Premium': { label: 'Premium', cls: 'bg-gray-900 text-white' },
};

// ─── Product Card ───────────────────────────────────────────────────────────────
function ProductCard({ product, index, onAdd, viewMode }: { product: any; index: number; onAdd: (p: any) => void; viewMode: 'grid' | 'list' }) {
    const [wishlisted, setWishlisted] = useState(false);
    const [justAdded, setJustAdded] = useState(false);

    const price = typeof product.price === 'string' ? parseFloat(product.price) : (product.price || 0);
    const origPrice = Math.round(price * (1.18 + (index % 3) * 0.04));
    const disc = Math.round(((origPrice - price) / origPrice) * 100);
    const reviews = 48 + (index * 23) % 290;
    const stars = Math.min(5, 3 + (index % 3));
    const inStock = product.stock === undefined || product.stock > 0;
    const badge = product.badge && BADGE_CONFIG[product.badge] ? product.badge : null;

    const handleAdd = () => {
        if (!inStock) return;
        onAdd(product);
        setJustAdded(true);
        setTimeout(() => setJustAdded(false), 2000);
    };

    const fallbackImg = 'https://images.unsplash.com/photo-1596462502278-27bfdd403cc2?q=80&w=400&auto=format&fit=crop';

    if (viewMode === 'list') {
        return (
            <div className="flex gap-6 p-6 border-b border-gray-100 dark:border-slate-800 hover:bg-gray-50 dark:hover:bg-slate-800/50 transition-all duration-300 group last:border-0">
                <Link href={`/product/${product.id}`} className="w-48 h-48 flex-shrink-0 overflow-hidden rounded-2xl bg-gray-100 dark:bg-slate-800 relative shadow-sm group-hover:shadow-lg transition-all">
                    <img src={getImageUrl(product.image_url || product.image) || fallbackImg} alt={product.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                    {disc > 0 && <span className="absolute top-3 left-3 bg-[#FF9900] text-white text-[10px] font-black px-2.5 py-1 rounded-full shadow-md">-{disc}%</span>}
                </Link>
                <div className="flex-1 min-w-0 flex flex-col justify-between py-1">
                    <div>
                        <div className="flex items-center gap-2 mb-2">
                            {product.category_name && <span className="text-[10px] text-[#FF9900] font-black uppercase tracking-[0.2em]">{product.category_name}</span>}
                            {badge && <span className={`text-[9px] font-black px-2.5 py-1 rounded-full ${BADGE_CONFIG[badge].cls}`}>{BADGE_CONFIG[badge].label}</span>}
                        </div>
                        <Link href={`/product/${product.id}`}>
                            <h3 className="text-lg font-bold text-gray-900 dark:text-white hover:text-[#FF9900] line-clamp-2 leading-tight mb-2 transition-colors">{product.name}</h3>
                        </Link>
                        <GoldStars count={stars} reviews={reviews} />
                        <div className="flex items-baseline gap-3 mt-4">
                            <span className="text-2xl font-black text-gray-900 dark:text-[#FF9900]">Rs.&nbsp;{price.toLocaleString()}</span>
                            {disc > 0 && <span className="text-sm text-gray-400 dark:text-gray-500 line-through">Rs.&nbsp;{origPrice.toLocaleString()}</span>}
                        </div>
                        <p className={`text-[11px] font-bold mt-2 ${inStock ? 'text-emerald-500' : 'text-red-500'}`}>
                            {inStock ? '✓ In Stock · 24h Dispatch' : '✗ Currently Unavailable'}
                        </p>
                    </div>
                    <div className="flex gap-3 mt-6">
                        <button onClick={handleAdd} disabled={!inStock}
                            className={`flex-1 max-w-[200px] h-11 rounded-xl text-xs font-black transition-all flex items-center justify-center gap-2 ${!inStock ? 'bg-gray-100 dark:bg-slate-800 text-gray-400 cursor-not-allowed' : justAdded ? 'bg-emerald-500 text-white' : 'bg-[#131921] text-white hover:bg-[#FF9900] active:scale-95 shadow-lg shadow-black/5'}`}>
                            {!inStock ? 'Out of Stock' : justAdded ? <><CheckCircle className="h-4 w-4" /> Added!</> : <><ShoppingCart className="h-4 w-4" /> Add to Cart</>}
                        </button>
                        <button onClick={() => setWishlisted(!wishlisted)}
                            className={`w-11 h-11 rounded-xl border flex items-center justify-center transition-all ${wishlisted ? 'bg-red-50 dark:bg-red-950/30 border-red-200 dark:border-red-900/50 text-red-500' : 'bg-white dark:bg-slate-800 border-gray-200 dark:border-slate-700 text-gray-400 hover:text-red-400'}`}>
                            <Heart className={`h-5 w-5 ${wishlisted ? 'fill-red-500' : ''}`} />
                        </button>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="bg-white dark:bg-slate-900 group flex flex-col h-full relative rounded-3xl overflow-hidden hover:shadow-2xl transition-all duration-500 border border-gray-100 dark:border-slate-800 hover:border-[#FF9900]/30">
            {/* Wishlist */}
            <button onClick={() => setWishlisted(!wishlisted)}
                className={`absolute top-4 right-4 z-10 w-10 h-10 rounded-full flex items-center justify-center shadow-lg transition-all duration-300 ${wishlisted ? 'bg-white dark:bg-slate-800 text-red-500' : 'bg-white/90 dark:bg-slate-800/90 backdrop-blur-sm opacity-0 group-hover:opacity-100 translate-y-2 group-hover:translate-y-0'}`}>
                <Heart className={`h-5 w-5 ${wishlisted ? 'fill-red-500' : 'text-gray-400'}`} />
            </button>

            {/* Badges */}
            <div className="absolute top-4 left-4 z-10 flex flex-col gap-2">
                {badge && <span className={`text-[9px] font-black px-3 py-1.5 rounded-full shadow-lg ${BADGE_CONFIG[badge].cls}`}>{BADGE_CONFIG[badge].label}</span>}
                {disc > 0 && <span className="text-[9px] font-black bg-[#FF9900] text-white px-3 py-1.5 rounded-full shadow-lg">-{disc}%</span>}
            </div>

            {/* Image */}
            <Link href={`/product/${product.id}`} className="block overflow-hidden bg-gray-50 dark:bg-slate-800 relative" style={{ aspectRatio: '1' }}>
                <img src={getImageUrl(product.image_url || product.image) || fallbackImg} alt={product.name}
                    className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700" />
                <div className="absolute inset-0 bg-black/5 opacity-0 group-hover:opacity-100 transition-opacity" />
            </Link>

            {/* Body */}
            <div className="p-5 flex flex-col flex-1">
                <div className="flex flex-col gap-1 mb-3">
                    {product.category_name && <span className="text-[9px] text-[#FF9900] font-black uppercase tracking-[0.2em]">{product.category_name}</span>}
                    <Link href={`/product/${product.id}`}>
                        <h3 className="text-sm font-bold text-gray-900 dark:text-white hover:text-[#FF9900] line-clamp-1 leading-snug transition-colors">{product.name}</h3>
                    </Link>
                    <GoldStars count={stars} reviews={reviews} />
                </div>
                
                <div className="flex items-baseline gap-2 mb-4">
                    <span className="text-lg font-black text-gray-900 dark:text-[#FF9900]">Rs. {price.toLocaleString()}</span>
                    {disc > 0 && <span className="text-xs text-gray-400 dark:text-gray-500 line-through">Rs.{origPrice.toLocaleString()}</span>}
                </div>

                <div className="mt-auto space-y-2">
                    <button onClick={handleAdd} disabled={!inStock}
                        className={`w-full h-11 rounded-xl text-xs font-black transition-all flex items-center justify-center gap-2 ${!inStock ? 'bg-gray-100 dark:bg-slate-800 text-gray-400 cursor-not-allowed border border-gray-200 dark:border-slate-700' : justAdded ? 'bg-emerald-500 text-white' : 'bg-[#131921] hover:bg-[#FF9900] text-white active:scale-[0.98] shadow-lg shadow-black/5'}`}>
                        {!inStock ? 'Out of Stock' : justAdded ? <><CheckCircle className="h-4 w-4" /> Added!</> : <><ShoppingCart className="h-4 w-4" /> Add to Cart</>}
                    </button>
                </div>
            </div>
        </div>
    );
}

// ─── Sidebar Component ──────────────────────────────────────────────────────────
function Sidebar({ 
    cats, selectedCats, maxPrice, catCounts, onToggleCat, onClearCats, onMaxPrice 
}: { 
    cats: string[]; selectedCats: string[]; maxPrice: number; catCounts: Record<string, number>;
    onToggleCat: (c: string) => void; onClearCats: () => void; onMaxPrice: (p: number) => void;
}) {
    const PRICE_RANGES = [
        { label: 'All Prices', val: 999999 },
        { label: 'Under Rs. 2,500', val: 2500 },
        { label: 'Rs. 2,500 – 7,500', val: 7500 },
        { label: 'Rs. 7,500 – 15,000', val: 15000 },
        { label: 'Over Rs. 15,000', val: 999999 },
    ];

    const filterBoxCls = "bg-white dark:bg-slate-900 rounded-3xl border border-gray-100 dark:border-slate-800 overflow-hidden shadow-sm hover:shadow-md transition-shadow";

    return (
        <div className="space-y-6">
            {/* Category Filter */}
            <div className={filterBoxCls}>
                <div className="px-6 py-4 border-b border-gray-100 dark:border-slate-800 flex items-center justify-between">
                    <h3 className="font-black text-gray-900 dark:text-white text-[10px] uppercase tracking-[0.2em] flex items-center gap-2">
                        <Package className="h-4 w-4 text-[#FF9900]" /> Departments
                    </h3>
                    {selectedCats.length > 0 && (
                        <button onClick={onClearCats} className="text-[10px] text-red-500 hover:text-red-600 font-bold uppercase transition-colors">Clear</button>
                    )}
                </div>
                <div className="p-3 space-y-0.5">
                    {cats.map(c => {
                        const active = selectedCats.includes(c);
                        return (
                            <button key={c} onClick={() => onToggleCat(c)}
                                className={`w-full flex items-center gap-3 px-4 py-3 rounded-2xl transition-all ${active ? 'bg-[#FF9900]/10 text-[#FF9900]' : 'text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-slate-800'}`}>
                                <span className="text-base grayscale">{CAT_ICONS[c] || '✨'}</span>
                                <span className={`text-sm flex-1 text-left ${active ? 'font-black' : 'font-semibold'}`}>{c}</span>
                                {catCounts[c] !== undefined && (
                                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-lg ${active ? 'bg-[#FF9900] text-white' : 'bg-gray-100 dark:bg-slate-800 text-gray-400'}`}>
                                        {catCounts[c]}
                                    </span>
                                )}
                            </button>
                        )
                    })}
                </div>
            </div>

            {/* Price Filter */}
            <div className={filterBoxCls}>
                <div className="px-6 py-4 border-b border-gray-100 dark:border-slate-800">
                    <h3 className="font-black text-gray-900 dark:text-white text-[10px] uppercase tracking-[0.2em] flex items-center gap-2">
                        <Tag className="h-4 w-4 text-[#FF9900]" /> Price Filter
                    </h3>
                </div>
                <div className="p-3 space-y-1">
                    {PRICE_RANGES.map(p => {
                        const isActive = maxPrice === p.val && p.label !== 'All Prices' ? true : p.label === 'All Prices' && maxPrice === 999999;
                        return (
                            <button key={p.label} onClick={() => onMaxPrice(p.val)}
                                className={`w-full flex items-center justify-between px-4 py-3 rounded-2xl transition-all ${isActive ? 'bg-[#FF9900]/10 text-[#FF9900]' : 'text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-slate-800'}`}>
                                <span className={`text-sm ${isActive ? 'font-black' : 'font-semibold'}`}>{p.label}</span>
                                <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center ${isActive ? 'border-[#FF9900]' : 'border-gray-200 dark:border-slate-700'}`}>
                                    {isActive && <div className="w-2 h-2 bg-[#FF9900] rounded-full" />}
                                </div>
                            </button>
                        )
                    })}
                </div>
            </div>

            {/* Promo */}
            <div className="bg-[#131921] rounded-[2rem] p-8 text-center relative overflow-hidden group">
                <div className="absolute top-0 right-0 w-32 h-32 bg-[#FF9900]/10 rounded-full blur-2xl -translate-y-1/2 translate-x-1/2 group-hover:scale-150 transition-transform duration-700" />
                <h4 className="relative text-white font-black text-lg mb-2">Need Bulk?</h4>
                <p className="relative text-white/50 text-[11px] font-medium mb-6 uppercase tracking-widest">Wholesale Discounts Available</p>
                <Link href="/contact" className="relative inline-block w-full py-3 bg-[#FF9900] hover:bg-white hover:text-[#FF9900] text-[#131921] font-black rounded-xl text-xs uppercase tracking-widest transition-all shadow-xl active:scale-95">
                    Contact Us
                </Link>
            </div>
        </div>
    );
}

// ─── Main Shop Content ────────────────────────────────────────────────────────
function ShopContent() {
    const { addToCart } = useCart();
    const searchParams = useSearchParams();
    const searchQuery = searchParams.get('search') || searchParams.get('q') || '';
    const catQuery = searchParams.get('cat') || searchParams.get('category') || '';
    const sortQuery = searchParams.get('sort') || 'default';

    const [products, setProducts] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [filtered, setFiltered] = useState<any[]>([]);
    const [selectedCats, setSelectedCats] = useState<string[]>(catQuery ? [catQuery] : []);
    const [maxPrice, setMaxPrice] = useState(999999);
    const [sort, setSort] = useState(sortQuery);
    const [sidebarOpen, setSidebarOpen] = useState(false);
    const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
    const [toastName, setToastName] = useState('');
    const [showToast, setShowToast] = useState(false);

    useEffect(() => {
        productService.getAll()
            .then(d => {
                const api = Array.isArray(d) ? d : (d as any).results || [];
                setProducts(api.filter((p: any) => p.status === 'active'));
            })
            .catch((err) => console.error("Fetch Error:", err))
            .finally(() => setLoading(false));
    }, []);

    useEffect(() => {
        if (catQuery) setSelectedCats([catQuery]);
    }, [catQuery]);

    useEffect(() => {
        let r = [...products];
        if (searchQuery) {
            const q = searchQuery.toLowerCase();
            r = r.filter(p => p.name?.toLowerCase().includes(q) || p.description?.toLowerCase().includes(q) || p.category_name?.toLowerCase().includes(q));
        }
        if (selectedCats.length > 0) {
            r = r.filter(p => selectedCats.some(c => p.category_name?.toLowerCase().includes(c.toLowerCase())));
        }
        r = r.filter(p => parseFloat(p.price) <= maxPrice);
        
        if (sort === 'price_low') r.sort((a, b) => parseFloat(a.price) - parseFloat(b.price));
        else if (sort === 'price_high') r.sort((a, b) => parseFloat(b.price) - parseFloat(a.price));
        else if (sort === 'newest') r.sort((a, b) => new Date(b.created_at || 0).getTime() - new Date(a.created_at || 0).getTime());
        
        setFiltered(r);
    }, [products, searchQuery, selectedCats, maxPrice, sort]);

    const cats = Array.from(new Set(products.map(p => p.category_name).filter(Boolean))) as string[];
    const catCounts: Record<string, number> = {};
    cats.forEach(c => { catCounts[c] = products.filter(p => p.category_name?.toLowerCase().includes(c.toLowerCase())).length; });

    const toggleCat = (c: string) => setSelectedCats(prev => prev.includes(c) ? prev.filter(x => x !== c) : [...prev, c]);
    const handleAddToCart = (p: any) => {
        addToCart({ id: p.id, name: p.name, price: p.price, quantity: 1, image: p.image_url || p.image || '', category: p.category_name || 'Cosmetics' });
        setToastName(p.name);
        setShowToast(true);
        setTimeout(() => setShowToast(false), 2500);
    };

    return (
        <div className="flex flex-col min-h-screen bg-[#F8F9FA] dark:bg-[#0f172a] font-sans selection:bg-[#FF9900]/30 transition-colors duration-500">
            <Navbar />

            {/* Breadcrumb / Top Bar */}
            <div className="bg-white dark:bg-slate-900 border-b border-gray-100 dark:border-slate-800">
                <div className="container mx-auto px-4 lg:px-12 py-4 flex items-center justify-between">
                    <div className="flex items-center gap-2 text-[10px] font-black text-gray-400 dark:text-slate-500 uppercase tracking-[0.2em]">
                        <Link href="/" className="hover:text-[#FF9900] transition-colors">Home</Link>
                        <ChevronRight className="h-3 w-3" />
                        <span className="text-gray-900 dark:text-white">Shop</span>
                    </div>
                </div>
            </div>

            <main className="flex-1 py-12">
                <div className="container mx-auto px-4 lg:px-12">
                    <div className="flex flex-col lg:flex-row gap-10">
                        
                        {/* Desktop Sidebar */}
                        <aside className="hidden lg:block w-72 flex-shrink-0 sticky top-28 h-fit">
                            <Sidebar 
                                cats={cats} selectedCats={selectedCats} maxPrice={maxPrice} 
                                catCounts={catCounts} onToggleCat={toggleCat} 
                                onClearCats={() => setSelectedCats([])} onMaxPrice={setMaxPrice} 
                            />
                        </aside>

                        {/* Product Grid Area */}
                        <div className="flex-1 min-w-0">
                            {/* Toolbar */}
                            <div className="bg-white dark:bg-slate-900 rounded-[2rem] border border-gray-100 dark:border-slate-800 flex flex-wrap items-center justify-between gap-6 px-8 py-5 mb-8 shadow-sm">
                                <div className="flex items-center gap-4">
                                    <h1 className="text-xl font-black text-gray-900 dark:text-white tracking-tight">
                                        {catQuery || "All Collections"}
                                        <span className="text-sm font-medium text-gray-400 ml-3">({filtered.length} Results)</span>
                                    </h1>
                                </div>

                                <div className="flex items-center gap-4">
                                    {/* View Mode */}
                                    <div className="hidden sm:flex bg-gray-50 dark:bg-slate-800 rounded-xl p-1">
                                        <button onClick={() => setViewMode('grid')} 
                                            className={`w-10 h-10 flex items-center justify-center rounded-lg transition-all ${viewMode === 'grid' ? 'bg-[#FF9900] text-white shadow-lg' : 'text-gray-400 hover:text-gray-900 dark:hover:text-white'}`}>
                                            <Grid3X3 className="h-5 w-5" />
                                        </button>
                                        <button onClick={() => setViewMode('list')}
                                            className={`w-10 h-10 flex items-center justify-center rounded-lg transition-all ${viewMode === 'list' ? 'bg-[#FF9900] text-white shadow-lg' : 'text-gray-400 hover:text-gray-900 dark:hover:text-white'}`}>
                                            <LayoutList className="h-5 w-5" />
                                        </button>
                                    </div>

                                    {/* Sort Dropdown */}
                                    <div className="relative group">
                                        <div className="flex items-center gap-3 bg-gray-50 dark:bg-slate-800 rounded-2xl px-5 py-3 border border-transparent focus-within:border-[#FF9900]/30 transition-all">
                                            <ArrowUpDown className="h-4 w-4 text-[#FF9900]" />
                                            <select 
                                                value={sort} 
                                                onChange={e => setSort(e.target.value)}
                                                className="bg-transparent text-xs font-black text-gray-800 dark:text-white uppercase tracking-widest outline-none cursor-pointer appearance-none pr-6"
                                            >
                                                <option value="default">Sort: Featured</option>
                                                <option value="price_low">Price: Low to High</option>
                                                <option value="price_high">Price: High to Low</option>
                                                <option value="newest">New Arrivals</option>
                                            </select>
                                            <ChevronDown className="absolute right-4 h-3 w-3 text-gray-400" />
                                        </div>
                                    </div>
                                    
                                    {/* Mobile Filter Toggle */}
                                    <button onClick={() => setSidebarOpen(true)} className="lg:hidden w-11 h-11 flex items-center justify-center bg-[#FF9900] text-white rounded-xl shadow-lg shadow-[#FF9900]/20">
                                        <Filter className="h-5 w-5" />
                                    </button>
                                </div>
                            </div>

                            {/* Products Rendering */}
                            {loading ? (
                                <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                                    {Array.from({ length: 8 }).map((_, i) => (
                                        <div key={i} className="animate-pulse bg-white dark:bg-slate-900 rounded-[2rem] aspect-[3/4] border border-gray-100 dark:border-slate-800" />
                                    ))}
                                </div>
                            ) : filtered.length > 0 ? (
                                <div className={viewMode === 'grid' ? "grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6" : "space-y-6"}>
                                    {filtered.map((p, i) => (
                                        <ProductCard key={p.id} product={p} index={i} onAdd={handleAddToCart} viewMode={viewMode} />
                                    ))}
                                </div>
                            ) : (
                                <div className="bg-white dark:bg-slate-900 rounded-[3rem] py-32 text-center border border-gray-100 dark:border-slate-800 shadow-sm">
                                    <div className="w-24 h-24 bg-gray-50 dark:bg-slate-800 rounded-[2.5rem] flex items-center justify-center mx-auto mb-8 text-gray-300">
                                        <Search className="h-10 w-10" />
                                    </div>
                                    <h3 className="text-3xl font-black text-gray-900 dark:text-white mb-4 tracking-tighter leading-none">Nothing Matches Your Search</h3>
                                    <p className="text-gray-500 dark:text-gray-400 font-medium mb-10 max-w-sm mx-auto">Try adjusting your filters or use different keywords to find products.</p>
                                    <button onClick={() => { setSelectedCats([]); setMaxPrice(999999); setSort('default'); }}
                                        className="px-10 py-4 bg-[#FF9900] hover:bg-[#131921] text-white font-black rounded-xl transition-all shadow-xl active:scale-95 shadow-[#FF9900]/10">
                                        Clear All Filters
                                    </button>
                                </div>
                            )}

                            {/* Trust Bar @ Bottom */}
                            <div className="mt-20 grid grid-cols-2 lg:grid-cols-4 gap-8">
                                {[
                                    { icon: <Shield />, title: "Authentic", text: "100% Genuine Brands" },
                                    { icon: <Zap />, title: "Express", text: "Same Day Dispatch" },
                                    { icon: <Star />, title: "Premium", text: "Curated Luxury Items" },
                                    { icon: <Phone />, title: "Support", text: "Expert Beauty Advice" },
                                ].map((item, i) => (
                                    <div key={i} className="flex flex-col items-center text-center p-6 bg-white dark:bg-slate-900 rounded-[2rem] border border-gray-100 dark:border-slate-800">
                                        <div className="w-12 h-12 bg-[#FF9900]/10 text-[#FF9900] rounded-2xl flex items-center justify-center mb-4 transition-transform hover:scale-110">
                                            {item.icon}
                                        </div>
                                        <h4 className="text-xs font-black text-gray-900 dark:text-white uppercase tracking-widest">{item.title}</h4>
                                        <p className="text-[10px] text-gray-400 font-bold mt-1 uppercase tracking-tight">{item.text}</p>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                </div>
            </main>

            {/* Mobile Filter Sidebar */}
            {sidebarOpen && (
                <div className="fixed inset-0 z-[100] lg:hidden">
                    <div className="absolute inset-0 bg-black/60 backdrop-blur-md" onClick={() => setSidebarOpen(false)} />
                    <div className="absolute right-0 top-0 h-full w-[85%] bg-white dark:bg-[#0f172a] shadow-2xl flex flex-col animate-in slide-in-from-right duration-500">
                        <div className="flex items-center justify-between p-6 border-b border-gray-100 dark:border-slate-800 sticky top-0 bg-white dark:bg-[#0f172a] z-10">
                            <h2 className="text-lg font-black text-gray-900 dark:text-white uppercase tracking-tighter">Refine Search</h2>
                            <button onClick={() => setSidebarOpen(false)} className="w-10 h-10 flex items-center justify-center hover:bg-gray-100 dark:hover:bg-slate-800 rounded-full transition-colors">
                                <X className="h-6 w-6 text-gray-400" />
                            </button>
                        </div>
                        <div className="flex-1 overflow-y-auto p-6">
                            <Sidebar 
                                cats={cats} selectedCats={selectedCats} maxPrice={maxPrice} 
                                catCounts={catCounts} onToggleCat={toggleCat} 
                                onClearCats={() => setSelectedCats([])} onMaxPrice={setMaxPrice} 
                            />
                        </div>
                        <div className="p-6 border-t border-gray-100 dark:border-slate-800 bg-gray-50 dark:bg-slate-900/50">
                            <button onClick={() => setSidebarOpen(false)} 
                                className="w-full h-14 bg-[#FF9900] hover:bg-[#131921] text-white font-black rounded-2xl transition-all shadow-xl active:scale-95">
                                Show {filtered.length} Products
                            </button>
                        </div>
                    </div>
                </div>
            )}

            <Footer />
            <Toast show={showToast} name={toastName} />
        </div>
    );
}

export default function Shop() {
    return (
        <Suspense fallback={
            <div className="min-h-screen bg-white dark:bg-[#0f172a] flex items-center justify-center">
                <div className="flex flex-col items-center gap-6">
                    <div className="w-20 h-20 border-[6px] border-[#FF9900]/10 border-t-[#FF9900] rounded-full animate-spin" />
                    <p className="text-gray-400 dark:text-slate-500 text-xs font-black uppercase tracking-[0.4em] animate-pulse">Initializing Shop...</p>
                </div>
            </div>
        }>
            <ShopContent />
        </Suspense>
    );
}
