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
    Filter, ArrowRight
} from 'lucide-react';
import { useCart } from '@/context/CartContext';



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
                    <Star key={i} className={`h-3.5 w-3.5 ${i < count ? 'text-amber-400 fill-amber-400' : 'text-gray-200 fill-gray-100'}`} />
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
        <div className="fixed bottom-8 right-8 z-[100] animate-slide-up">
            <div className="bg-white border border-gray-100 text-gray-900 px-5 py-4 rounded-2xl shadow-2xl flex items-center gap-4 min-w-[280px]">
                <div className="bg-emerald-500 w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0">
                    <CheckCircle className="h-5 w-5 text-white" />
                </div>
                <div>
                    <p className="font-black text-emerald-600 text-[10px] uppercase tracking-widest mb-0.5">Added to Cart</p>
                    <p className="text-gray-600 text-sm font-semibold line-clamp-1">{name}</p>
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

    // ── LIST VIEW ──────────────────────────────────────────────────────────────
    if (viewMode === 'list') {
        return (
            <div className="flex gap-5 p-5 border-b border-gray-50 hover:bg-gray-50/80 transition-all duration-300 group last:border-0">
                <Link href={`/product/${product.id}`} className="w-40 h-40 flex-shrink-0 overflow-hidden rounded-2xl bg-gray-100 relative shadow-sm group-hover:shadow-md transition-all">
                    <img src={product.image || fallbackImg} alt={product.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                    {disc > 0 && <span className="absolute top-2.5 left-2.5 bg-[#FF9900] text-white text-[9px] font-black px-2 py-0.5 rounded-full">-{disc}%</span>}
                </Link>
                <div className="flex-1 min-w-0 flex flex-col justify-between py-1">
                    <div>
                        <div className="flex items-center gap-2 mb-1.5">
                            {product.category_name && <span className="text-[9px] text-[#FF9900] font-black uppercase tracking-[0.18em]">{product.category_name}</span>}
                            {badge && <span className={`text-[9px] font-black px-2 py-0.5 rounded-full ${BADGE_CONFIG[badge].cls}`}>{BADGE_CONFIG[badge].label}</span>}
                        </div>
                        <Link href={`/product/${product.id}`}>
                            <h3 className="text-base font-bold text-gray-900 hover:text-[#FF9900] line-clamp-2 leading-snug mb-2 transition-colors">{product.name}</h3>
                        </Link>
                        <GoldStars count={stars} reviews={reviews} />
                        <div className="flex items-baseline gap-2 mt-3">
                            <span className="text-xl font-black text-gray-900">Rs.&nbsp;{price.toLocaleString()}</span>
                            {disc > 0 && <span className="text-sm text-gray-400 line-through">Rs.&nbsp;{origPrice.toLocaleString()}</span>}
                        </div>
                        <p className={`text-xs font-bold mt-1.5 ${inStock ? 'text-emerald-600' : 'text-red-500'}`}>
                            {inStock ? '✓ In Stock · Express Delivery' : '✗ Out of Stock'}
                        </p>
                    </div>
                    <div className="flex gap-2 mt-4">
                        <button onClick={handleAdd} disabled={!inStock}
                            className={`px-6 py-2.5 rounded-xl text-xs font-black transition-all flex items-center gap-2 ${!inStock ? 'bg-gray-100 text-gray-400 cursor-not-allowed' : justAdded ? 'bg-emerald-50 text-emerald-600 border border-emerald-200' : 'bg-[#131921] hover:bg-[#FF9900] text-white active:scale-95 shadow-sm'}`}>
                            {!inStock ? 'Out of Stock' : justAdded ? <><CheckCircle className="h-3.5 w-3.5" /> Added!</> : <><ShoppingCart className="h-3.5 w-3.5" /> Add to Cart</>}
                        </button>
                        <Link href={`/product/${product.id}`} className="px-6 py-2.5 rounded-xl text-xs font-black bg-white border border-gray-200 text-gray-700 hover:bg-gray-50 transition flex items-center gap-2">
                            <Eye className="h-3.5 w-3.5" /> Details
                        </Link>
                        <button onClick={() => setWishlisted(!wishlisted)}
                            className={`w-10 h-10 rounded-xl border flex items-center justify-center transition-all ${wishlisted ? 'bg-red-50 border-red-200 text-red-500' : 'bg-white border-gray-200 text-gray-400 hover:text-red-400'}`}>
                            <Heart className={`h-4 w-4 ${wishlisted ? 'fill-red-500' : ''}`} />
                        </button>
                    </div>
                </div>
            </div>
        );
    }

    // ── GRID VIEW ──────────────────────────────────────────────────────────────
    return (
        <div className="bg-white group flex flex-col h-full relative rounded-2xl overflow-hidden hover:shadow-[0_8px_40px_rgba(0,113,133,0.12)] transition-all duration-500 border border-gray-100 hover:border-[#FF9900]/20">
            {/* Wishlist */}
            <button onClick={() => setWishlisted(!wishlisted)}
                className={`absolute top-3 right-3 z-10 w-9 h-9 rounded-full flex items-center justify-center shadow-md transition-all duration-300 ${wishlisted ? 'bg-red-50 border border-red-100' : 'bg-white/90 backdrop-blur-sm opacity-0 group-hover:opacity-100 translate-y-1 group-hover:translate-y-0'}`}>
                <Heart className={`h-4 w-4 ${wishlisted ? 'fill-red-500 text-red-500' : 'text-gray-400'}`} />
            </button>

            {/* Badges */}
            <div className="absolute top-3 left-3 z-10 flex flex-col gap-1.5">
                {badge && <span className={`text-[9px] font-black px-2.5 py-1 rounded-full shadow-sm ${BADGE_CONFIG[badge].cls}`}>{BADGE_CONFIG[badge].label}</span>}
                {disc > 0 && <span className="text-[9px] font-black bg-[#FF9900] text-white px-2.5 py-1 rounded-full shadow-sm">-{disc}%</span>}
            </div>

            {/* Image */}
            <Link href={`/product/${product.id}`} className="block overflow-hidden bg-gray-50 relative" style={{ aspectRatio: '1' }}>
                <img src={product.image || fallbackImg} alt={product.name}
                    className="w-full h-full object-cover group-hover:scale-[1.08] transition-transform duration-700 ease-in-out" />
                <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/50 to-transparent p-3 opacity-0 group-hover:opacity-100 transition-all duration-300 translate-y-2 group-hover:translate-y-0 flex items-end">
                    <span className="text-white text-[11px] font-black flex items-center gap-1.5"><Eye className="h-3.5 w-3.5" /> Quick View</span>
                </div>
            </Link>

            {/* Body */}
            <div className="p-4 flex flex-col flex-1 gap-1.5">
                {product.category_name && <span className="text-[9px] text-[#FF9900] font-black uppercase tracking-[0.18em]">{product.category_name}</span>}
                <Link href={`/product/${product.id}`}>
                    <h3 className="text-[13px] text-gray-800 hover:text-[#FF9900] line-clamp-2 leading-snug font-semibold transition-colors">{product.name}</h3>
                </Link>
                <GoldStars count={stars} reviews={reviews} />
                <div className="flex items-baseline gap-2 mt-1">
                    <span className="text-base font-black text-gray-900">Rs.&nbsp;{price.toLocaleString()}</span>
                    {disc > 0 && <span className="text-xs text-gray-400 line-through">Rs.&nbsp;{origPrice.toLocaleString()}</span>}
                </div>
                <p className={`text-[10px] font-bold ${inStock ? 'text-emerald-600' : 'text-red-500'}`}>{inStock ? '✓ In Stock · Express Delivery' : '✗ Out of Stock'}</p>
                <div className="mt-auto pt-3 space-y-2">
                    <button onClick={handleAdd} disabled={!inStock}
                        className={`w-full py-2.5 rounded-xl text-xs font-black transition-all flex items-center justify-center gap-2 ${!inStock ? 'bg-gray-100 text-gray-400 cursor-not-allowed border border-gray-200' : justAdded ? 'bg-emerald-50 text-emerald-600 border border-emerald-200' : 'bg-[#131921] hover:bg-[#FF9900] text-white active:scale-[0.98]'}`}>
                        {!inStock ? 'Out of Stock' : justAdded ? <><CheckCircle className="h-3.5 w-3.5" /> Added!</> : <><ShoppingCart className="h-3.5 w-3.5" /> Add to Cart</>}
                    </button>
                    <Link href={`/product/${product.id}`}
                        className="w-full block text-center py-2 rounded-xl text-xs font-bold bg-white border border-gray-200 text-gray-700 hover:bg-gray-50 hover:border-gray-300 transition-all">
                        View Details
                    </Link>
                </div>
            </div>
        </div>
    );
}

// ─── Sidebar ────────────────────────────────────────────────────────────────────
interface SidebarProps {
    cats: string[];
    selectedCats: string[];
    maxPrice: number;
    catCounts: Record<string, number>;
    onToggleCat: (c: string) => void;
    onClearCats: () => void;
    onMaxPrice: (p: number) => void;
}

function Sidebar({ cats, selectedCats, maxPrice, catCounts, onToggleCat, onClearCats, onMaxPrice }: SidebarProps) {
    const PRICE_RANGES = [
        { label: 'Any Price', val: 999999 },
        { label: 'Under Rs. 2,000', val: 2000 },
        { label: 'Rs. 2,000 – 5,000', val: 5000 },
        { label: 'Rs. 5,000 – 15,000', val: 15000 },
        { label: 'Rs. 15,000+', val: 999999 },
    ];

    return (
        <div className="space-y-6">
            {/* Department */}
            <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden shadow-sm">
                <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
                    <h3 className="font-black text-gray-900 text-xs uppercase tracking-[0.18em] flex items-center gap-2">
                        <Package className="h-4 w-4 text-[#FF9900]" /> Categories
                    </h3>
                    {selectedCats.length > 0 && (
                        <button onClick={onClearCats} className="text-[10px] text-red-500 hover:underline font-black uppercase tracking-wider">Clear</button>
                    )}
                </div>
                <div className="p-3 space-y-0.5">
                    <label className="flex items-center gap-3 cursor-pointer py-2 px-3 rounded-xl hover:bg-gray-50 transition group">
                        <input type="checkbox" checked={selectedCats.length === 0} onChange={onClearCats}
                            className="w-4 h-4 accent-[#FF9900] rounded cursor-pointer" />
                        <span className={`text-sm flex-1 transition ${selectedCats.length === 0 ? 'font-black text-gray-900' : 'text-gray-500 font-semibold group-hover:text-gray-700'}`}>All Products</span>
                        <span className="text-[10px] text-gray-400 font-bold bg-gray-100 px-2 py-0.5 rounded-lg">{catCounts['all'] || cats.reduce((s, c) => s + (catCounts[c] || 0), 0)}</span>
                    </label>
                    {cats.map(c => (
                        <label key={c} className="flex items-center gap-3 cursor-pointer py-2 px-3 rounded-xl hover:bg-gray-50 transition group">
                            <input type="checkbox" checked={selectedCats.includes(c)} onChange={() => onToggleCat(c)}
                                className="w-4 h-4 accent-[#FF9900] cursor-pointer" />
                            <span className="text-base">{CAT_ICONS[c] || '✦'}</span>
                            <span className={`text-sm flex-1 transition ${selectedCats.includes(c) ? 'font-black text-gray-900' : 'text-gray-500 font-semibold group-hover:text-gray-700'}`}>{c}</span>
                            {catCounts[c] !== undefined && (
                                <span className="text-[10px] text-gray-400 font-bold bg-gray-100 px-2 py-0.5 rounded-lg min-w-[28px] text-center">{catCounts[c]}</span>
                            )}
                        </label>
                    ))}
                </div>
            </div>

            {/* Price Range */}
            <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden shadow-sm">
                <div className="px-5 py-4 border-b border-gray-100">
                    <h3 className="font-black text-gray-900 text-xs uppercase tracking-[0.18em] flex items-center gap-2">
                        <Tag className="h-4 w-4 text-[#FF9900]" /> Price Range
                    </h3>
                </div>
                <div className="p-3 space-y-0.5">
                    {PRICE_RANGES.map(p => (
                        <label key={p.val + p.label} className="flex items-center gap-3 cursor-pointer py-2 px-3 rounded-xl hover:bg-gray-50 transition group">
                            <input type="radio" name="price" checked={maxPrice === p.val && p.label !== 'Any Price' ? true : p.label === 'Any Price' && maxPrice === 999999}
                                onChange={() => onMaxPrice(p.val)} className="accent-[#FF9900] cursor-pointer" />
                            <span className={`text-sm transition ${maxPrice === p.val ? 'font-black text-gray-900' : 'text-gray-500 font-semibold group-hover:text-gray-700'}`}>{p.label}</span>
                        </label>
                    ))}
                </div>
            </div>

            {/* Avg Rating */}
            <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden shadow-sm">
                <div className="px-5 py-4 border-b border-gray-100">
                    <h3 className="font-black text-gray-900 text-xs uppercase tracking-[0.18em] flex items-center gap-2">
                        <Star className="h-4 w-4 text-amber-400 fill-amber-400" /> Customer Reviews
                    </h3>
                </div>
                <div className="p-3 space-y-0.5">
                    {[5, 4, 3].map(r => (
                        <div key={r} className="flex items-center gap-2.5 py-2 px-3 rounded-xl hover:bg-gray-50 cursor-pointer group transition">
                            <div className="flex gap-0.5">
                                {Array.from({ length: 5 }).map((_, i) => (
                                    <Star key={i} className={`h-3.5 w-3.5 ${i < r ? 'fill-amber-400 text-amber-400' : 'fill-gray-100 text-gray-200'}`} />
                                ))}
                            </div>
                            <span className="text-xs text-gray-500 font-semibold group-hover:text-gray-700 transition">& Up</span>
                        </div>
                    ))}
                </div>
            </div>

            {/* Discover */}
            <div className="bg-[#FF9900] rounded-2xl overflow-hidden shadow-lg">
                <div className="p-5">
                    <p className="text-white/70 text-[10px] font-black uppercase tracking-widest mb-3">Quick Links</p>
                    <div className="space-y-2">
                        {[
                            { label: "Today's Deals", href: '/shop?sort=newest', icon: <Zap className="h-4 w-4" /> },
                            { label: 'New Arrivals', href: '/shop?sort=newest', icon: <Sparkles className="h-4 w-4" /> },
                            { label: 'Best Sellers', href: '/shop?sort=bestseller', icon: <TrendingUp className="h-4 w-4" /> },
                        ].map(l => (
                            <Link key={l.label} href={l.href}
                                className="flex items-center gap-3 text-sm font-bold text-white/80 hover:text-white py-2 rounded-xl hover:bg-white/10 transition px-2">
                                {l.icon} {l.label}
                            </Link>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );
}

// ─── Shop Content ───────────────────────────────────────────────────────────────
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
                setProducts(api.filter((p: any) => p.status !== 'inactive'));
            })
            .catch((err) => console.error(err))
            .finally(() => setLoading(false));
    }, []);

    // Sync URL queries to state for when user navigates to a new category from navbar/footer
    useEffect(() => {
        if (catQuery) setSelectedCats([catQuery]);
        else setSelectedCats([]);
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

    const rawCats = Array.from(new Set(products.map(p => p.category_name).filter(Boolean))) as string[];
    const cats = rawCats.length > 0 ? rawCats : ['Skincare', 'Makeup', 'Haircare', 'Fragrance', 'Gift Sets'];

    const catCounts: Record<string, number> = {};
    cats.forEach(c => { catCounts[c] = products.filter(p => p.category_name?.toLowerCase().includes(c.toLowerCase())).length; });

    const toggleCat = (c: string) => setSelectedCats(prev => prev.includes(c) ? prev.filter(x => x !== c) : [...prev, c]);
    const clearCats = () => setSelectedCats([]);

    const handleAddToCart = (p: any) => {
        addToCart({ id: p.id, name: p.name, price: p.price, quantity: 1, image: p.image || '', category: p.category_name || 'Cosmetics' });
        setToastName(p.name);
        setShowToast(true);
        setTimeout(() => setShowToast(false), 2500);
    };

    return (
        <div className="flex flex-col min-h-screen bg-gray-50 font-sans">
            <Navbar />

            {/* ── Breadcrumb Bar ───────────────────────────────────────────── */}
            <div className="bg-white border-b border-gray-100">
                <div className="container mx-auto px-4 lg:px-12 py-3.5 flex items-center gap-2 text-[11px] font-bold text-gray-400 uppercase tracking-widest">
                    <Link href="/" className="hover:text-[#FF9900] transition-colors">Home</Link>
                    <ChevronRight className="h-3 w-3 text-gray-300" />
                    {catQuery
                        ? <><Link href="/shop" className="hover:text-[#FF9900] transition-colors">Shop</Link><ChevronRight className="h-3 w-3 text-gray-300" /><span className="text-gray-900">{catQuery}</span></>
                        : searchQuery
                            ? <><Link href="/shop" className="hover:text-[#FF9900] transition-colors">Shop</Link><ChevronRight className="h-3 w-3 text-gray-300" /><span className="text-gray-900">"{searchQuery}"</span></>
                            : <span className="text-gray-900">Shop</span>}
                </div>
            </div>



            <main className="flex-1 py-8">
                <div className="container mx-auto px-4 lg:px-12 flex flex-col lg:flex-row gap-8 items-start">

                    {/* Desktop Sidebar */}
                    <aside className="hidden lg:block w-64 flex-shrink-0 sticky top-24">
                        <Sidebar cats={cats} selectedCats={selectedCats} maxPrice={maxPrice}
                            catCounts={catCounts} onToggleCat={toggleCat} onClearCats={clearCats} onMaxPrice={setMaxPrice} />
                    </aside>

                    {/* Main area */}
                    <div className="flex-1 min-w-0">
                        {/* Toolbar */}
                        <div className="bg-white border border-gray-100 rounded-2xl flex flex-wrap items-center justify-between gap-4 px-5 py-4 mb-6 shadow-sm">
                            <div className="flex items-center gap-3">
                                <span className="text-sm font-bold text-gray-500">
                                    {searchQuery ? <><span className="text-gray-900 font-black">"{searchQuery}"</span> —</> : null}
                                    &nbsp;<span className="text-gray-900 font-black">{filtered.length}</span> products
                                </span>
                                {selectedCats.length > 0 && (
                                    <div className="flex items-center gap-1.5 flex-wrap">
                                        {selectedCats.map(c => (
                                            <span key={c} className="flex items-center gap-1 bg-[#FF9900]/10 text-[#FF9900] text-[10px] font-black px-3 py-1 rounded-full">
                                                {c}
                                                <button onClick={() => toggleCat(c)} className="hover:text-red-500 transition-colors ml-0.5"><X className="h-3 w-3" /></button>
                                            </span>
                                        ))}
                                        <button onClick={clearCats} className="text-[10px] text-red-500 hover:underline font-black">Clear all</button>
                                    </div>
                                )}
                            </div>
                            <div className="flex items-center gap-3">
                                {/* Grid/List toggle */}
                                <div className="hidden sm:flex items-center bg-gray-100 rounded-xl p-1 gap-0.5">
                                    <button onClick={() => setViewMode('grid')}
                                        className={`w-9 h-9 rounded-lg flex items-center justify-center transition-all ${viewMode === 'grid' ? 'bg-white text-[#FF9900] shadow-sm' : 'text-gray-400 hover:text-gray-600'}`}>
                                        <Grid3X3 className="h-4 w-4" />
                                    </button>
                                    <button onClick={() => setViewMode('list')}
                                        className={`w-9 h-9 rounded-lg flex items-center justify-center transition-all ${viewMode === 'list' ? 'bg-white text-[#FF9900] shadow-sm' : 'text-gray-400 hover:text-gray-600'}`}>
                                        <LayoutList className="h-4 w-4" />
                                    </button>
                                </div>
                                {/* Mobile Filter Button */}
                                <button onClick={() => setSidebarOpen(true)}
                                    className="lg:hidden flex items-center gap-2 text-xs font-black border border-gray-200 bg-white rounded-xl px-4 py-2.5 hover:bg-gray-50 text-gray-700 transition shadow-sm">
                                    <Filter className="h-4 w-4" /> Filters {selectedCats.length > 0 && <span className="bg-[#FF9900] text-white rounded-full w-5 h-5 text-[9px] flex items-center justify-center">{selectedCats.length}</span>}
                                </button>
                                {/* Sort */}
                                <div className="flex items-center gap-2 bg-gray-100 rounded-xl px-4 py-2.5">
                                    <ArrowUpDown className="h-3.5 w-3.5 text-gray-500" />
                                    <select value={sort} onChange={e => setSort(e.target.value)}
                                        className="bg-transparent text-xs font-black text-gray-800 uppercase tracking-widest outline-none cursor-pointer">
                                        <option value="default">Featured</option>
                                        <option value="price_low">Price: Low to High</option>
                                        <option value="price_high">Price: High to Low</option>
                                        <option value="newest">Newest First</option>
                                    </select>
                                </div>
                            </div>
                        </div>

                        {/* Products */}
                        {loading ? (
                            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
                                {Array.from({ length: 8 }).map((_, i) => (
                                    <div key={i} className="animate-pulse rounded-2xl overflow-hidden bg-white border border-gray-100">
                                        <div className="aspect-square bg-gray-100" />
                                        <div className="p-4 space-y-2">
                                            <div className="h-3 bg-gray-100 rounded w-1/3" />
                                            <div className="h-4 bg-gray-100 rounded w-3/4" />
                                            <div className="h-3 bg-gray-100 rounded w-1/2" />
                                        </div>
                                    </div>
                                ))}
                            </div>
                        ) : filtered.length > 0 ? (
                            viewMode === 'grid' ? (
                                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
                                    {filtered.map((p, i) => (
                                        <ProductCard key={p.id} product={p} index={i} onAdd={handleAddToCart} viewMode="grid" />
                                    ))}
                                </div>
                            ) : (
                                <div className="bg-white rounded-2xl overflow-hidden border border-gray-100 shadow-sm divide-y divide-gray-50">
                                    {filtered.map((p, i) => (
                                        <ProductCard key={p.id} product={p} index={i} onAdd={handleAddToCart} viewMode="list" />
                                    ))}
                                </div>
                            )
                        ) : (
                            <div className="bg-white py-24 px-6 text-center rounded-3xl border border-gray-100 shadow-sm">
                                <div className="w-20 h-20 mx-auto mb-6 bg-gray-50 rounded-2xl flex items-center justify-center text-[#FF9900]">
                                    <Search className="h-9 w-9" />
                                </div>
                                <h3 className="text-2xl font-black text-gray-900 mb-2 tracking-tight">No Products Found</h3>
                                <p className="text-gray-500 font-medium mb-8 max-w-sm mx-auto">Try adjusting your filters or search terms.</p>
                                <button onClick={() => { clearCats(); setMaxPrice(999999); }}
                                    className="px-10 py-4 bg-[#131921] hover:bg-[#FF9900] text-white font-black rounded-xl text-sm transition shadow-lg">
                                    Reset All Filters
                                </button>
                            </div>
                        )}
                    </div>
                </div>
            </main>

            {/* Mobile sidebar overlay */}
            {sidebarOpen && (
                <div className="fixed inset-0 z-50 lg:hidden flex">
                    <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={() => setSidebarOpen(false)} />
                    <div className="absolute left-0 top-0 h-full w-80 bg-white shadow-2xl overflow-y-auto">
                        <div className="flex justify-between items-center p-5 border-b border-gray-100 sticky top-0 bg-white z-10">
                            <h2 className="font-black text-gray-900 flex items-center gap-2">
                                <Filter className="h-5 w-5 text-[#FF9900]" /> Filters
                                {selectedCats.length > 0 && <span className="bg-[#FF9900] text-white text-[10px] font-black rounded-full w-6 h-6 flex items-center justify-center">{selectedCats.length}</span>}
                            </h2>
                            <button onClick={() => setSidebarOpen(false)} className="p-2 hover:bg-gray-100 rounded-xl transition text-gray-600">
                                <X className="h-5 w-5" />
                            </button>
                        </div>
                        <div className="p-4">
                            <Sidebar cats={cats} selectedCats={selectedCats} maxPrice={maxPrice}
                                catCounts={catCounts} onToggleCat={toggleCat} onClearCats={clearCats} onMaxPrice={setMaxPrice} />
                        </div>
                    </div>
                </div>
            )}

            <Footer />
            <Toast show={showToast} name={toastName} />

            <style jsx global>{`
                @keyframes slide-up {
                    from { transform: translateY(16px); opacity: 0; }
                    to { transform: translateY(0); opacity: 1; }
                }
                .animate-slide-up { animation: slide-up 0.25s ease-out; }
            `}</style>
        </div>
    );
}

export default function Shop() {
    return (
        <Suspense fallback={
            <div className="min-h-screen bg-white flex items-center justify-center">
                <div className="flex flex-col items-center gap-4">
                    <div className="w-14 h-14 border-4 border-[#FF9900]/20 border-t-[#FF9900] rounded-full animate-spin" />
                    <p className="text-gray-400 text-xs font-black uppercase tracking-widest">Loading Shop...</p>
                </div>
            </div>
        }>
            <ShopContent />
        </Suspense>
    );
}
