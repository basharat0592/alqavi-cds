'use client';

import PageLoader from '@/components/ui/PageLoader';
import { useState, useEffect, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import Navbar from '@/components/layout/Navbar';
import Footer from '@/components/layout/Footer';
import { productService } from '@/lib/api';
import { Search, X, LayoutGrid, List, Sliders, ChevronRight, CheckCircle, Star, ChevronDown } from 'lucide-react';
import { useCart } from '@/context/CartContext';
import { cn, getImageUrl } from '@/lib/utils';
import ProductCard from '@/components/ui/ProductCard';
import { motion, AnimatePresence } from 'framer-motion';

function ShopContent() {
    const { addToCart } = useCart();
    const searchParams = useSearchParams();
    const searchQuery = searchParams.get('q') || searchParams.get('search') || '';
    const catQuery = searchParams.get('cat') || searchParams.get('category') || '';

    const [products, setProducts] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [filtered, setFiltered] = useState<any[]>([]);
    const [selectedCat, setSelectedCat] = useState<string>(catQuery);
    const [priceRange, setPriceRange] = useState<string | null>(null);
    const [isMobileFilterOpen, setIsMobileFilterOpen] = useState(false);

    useEffect(() => {
        productService.getAll()
            .then(d => {
                const api = Array.isArray(d) ? d : (d as any).results || [];
                setProducts(api);
            })
            .finally(() => setLoading(false));
    }, []);

    useEffect(() => {
        let r = [...products];
        if (searchQuery) {
            const q = searchQuery.toLowerCase();
            r = r.filter(p => {
                const pName = (p.product_name || p.name || '').toLowerCase();
                const cName = (p.category_name || p.category?.name || '').toLowerCase();
                return pName.includes(q) || cName.includes(q);
            });
        }
        if (selectedCat) {
            const sq = selectedCat.toLowerCase();
            r = r.filter(p => {
                const cName = (p.category_name || p.category?.name || '').toLowerCase();
                return cName.includes(sq);
            });
        }
        if (priceRange) {
            r = r.filter(p => {
                const price = parseFloat(p.selling_price || p.price || 0);
                if (priceRange === 'Under 1000') return price < 1000;
                if (priceRange === '1000-5000') return price >= 1000 && price <= 5000;
                if (priceRange === '5000-10000') return price >= 5000 && price <= 10000;
                if (priceRange === 'Above 10000') return price > 10000;
                return true;
            });
        }

        const groups = new Map();
        r.forEach(p => {
            const name = (p.product_name || p.name || '').toLowerCase().trim();
            const price = parseFloat(p.selling_price || p.price || 0);
            const key = `${name}_${price}`;
            if (!groups.has(key)) groups.set(key, p);
        });
        setFiltered(Array.from(groups.values()));
    }, [products, searchQuery, selectedCat, priceRange]);

    const cats = Array.from(new Set(products.map(p => p.category_name || p.category?.name).filter(Boolean))) as string[];

    if (loading) return <PageLoader />;

    return (
        <div className="min-h-screen bg-white font-sans text-[#111]">
            <Navbar />

            {/* Same to Same Header - EXPANDED WIDTH */}
            <div className="hidden md:block bg-white border-b border-[#D5D9D9] py-4 md:py-5 mb-6 md:mb-10">
                <div className="max-w-[1440px] mx-auto px-4 md:px-6">
                    <h1 className="text-[24px] sm:text-[28px] font-bold tracking-tight uppercase">Distributor Catalog</h1>
                    <p className="text-[13px] sm:text-[14px] text-[#565959] mt-1 font-medium">Regional inventory of premium cosmetics and authentic skincare</p>
                </div>
            </div>

            <main className="max-w-[1440px] mx-auto px-4 md:px-6 pt-4 md:pt-0 pb-20 md:pb-32">

                {/* Mobile Shop Header & Quick Filters */}
                <div className="lg:hidden mb-6">
                    <div className="flex items-center justify-between gap-4 mb-4">
                        <div>
                            <h2 className="text-[20px] font-black uppercase tracking-tight text-[#111]">
                                {selectedCat ? selectedCat : "All Products"}
                            </h2>
                            <p className="text-[12px] text-[#565959] font-medium mt-0.5">
                                Showing {filtered.length} premium products
                            </p>
                        </div>
                        <button
                            onClick={() => setIsMobileFilterOpen(true)}
                            className="flex items-center gap-2 px-4 py-2.5 border border-[#D5D9D9] rounded-full bg-white hover:bg-slate-50 text-[11px] font-bold uppercase tracking-wider text-[#111] shadow-sm transition-all active:scale-[0.97]"
                        >
                            <Sliders size={13} className="text-[#13B0D1]" />
                            Filter
                            {(selectedCat || priceRange) && (
                                <span className="ml-1 w-4 h-4 bg-[#13B0D1] text-white text-[9px] rounded-full flex items-center justify-center font-black">
                                    {[selectedCat, priceRange].filter(Boolean).length}
                                </span>
                            )}
                        </button>
                    </div>

                    {/* Quick Category Scrollbar */}
                    <div className="flex items-center gap-2 overflow-x-auto no-scrollbar py-2.5 border-y border-slate-100 -mx-4 px-4 bg-[#fbfbfb]">
                        <button
                            onClick={() => setSelectedCat('')}
                            className={cn(
                                "px-4 py-2 rounded-full text-[10px] font-black uppercase tracking-wider transition-all shrink-0 border",
                                !selectedCat
                                    ? "bg-[#111] border-[#111] text-white shadow-sm"
                                    : "bg-white border-slate-200 text-slate-500 hover:bg-slate-50"
                            )}
                        >
                            All
                        </button>
                        {cats.map((cat) => (
                            <button
                                key={cat}
                                onClick={() => setSelectedCat(cat)}
                                className={cn(
                                    "px-4 py-2 rounded-full text-[10px] font-black uppercase tracking-wider transition-all shrink-0 border",
                                    selectedCat === cat
                                        ? "bg-[#111] border-[#111] text-white shadow-sm"
                                        : "bg-white border-slate-200 text-slate-500 hover:bg-slate-50"
                                )}
                            >
                                {cat}
                            </button>
                        ))}
                    </div>

                    {/* Active Filter Pills (For Clear Actions) */}
                    {(selectedCat || priceRange) && (
                        <div className="flex flex-wrap gap-2 mt-4">
                            {selectedCat && (
                                <button
                                    onClick={() => setSelectedCat('')}
                                    className="flex items-center gap-1.5 px-3 py-1.5 bg-[#13B0D1]/10 text-[#13B0D1] border border-[#13B0D1]/20 rounded-full text-[10px] font-bold uppercase tracking-wider transition-all hover:bg-[#13B0D1]/20"
                                >
                                    <span>Category: {selectedCat}</span>
                                    <X size={11} className="stroke-[2.5]" />
                                </button>
                            )}
                            {priceRange && (
                                <button
                                    onClick={() => setPriceRange(null)}
                                    className="flex items-center gap-1.5 px-3 py-1.5 bg-[#13B0D1]/10 text-[#13B0D1] border border-[#13B0D1]/20 rounded-full text-[10px] font-bold uppercase tracking-wider transition-all hover:bg-[#13B0D1]/20"
                                >
                                    <span>
                                        Price: {priceRange === 'Under 1000' ? 'Under 1k' :
                                            priceRange === '1000-5000' ? '1k - 5k' :
                                                priceRange === '5000-10000' ? '5k - 10k' : 'Over 10k'}
                                    </span>
                                    <X size={11} className="stroke-[2.5]" />
                                </button>
                            )}
                        </div>
                    )}
                </div>

                <div className="flex flex-col lg:flex-row gap-12">

                    {/* Sidebar Filters - Desktop Only */}
                    <aside className="hidden lg:block w-72 flex-shrink-0 space-y-10">
                        <div className="p-8 border border-[#D5D9D9] rounded-[12px] bg-[#f7f8fa]">
                            <h3 className="text-[12px] font-black text-[#565959] uppercase tracking-[0.2em] mb-6">Inventory Filter</h3>

                            <div className="space-y-8">
                                <div>
                                    <h4 className="text-[14px] font-bold mb-4 uppercase tracking-tight">Departments</h4>
                                    <div className="space-y-2">
                                        <button
                                            onClick={() => setSelectedCat('')}
                                            className={cn(
                                                "block text-[13px] hover:text-[#119AB8] transition-colors uppercase tracking-tight",
                                                !selectedCat ? "font-bold text-[#111]" : "text-[#565959] font-medium"
                                            )}
                                        >
                                            Full Catalog
                                        </button>
                                        {cats.map(c => (
                                            <button
                                                key={c}
                                                onClick={() => setSelectedCat(c)}
                                                className={cn(
                                                    "block text-[13px] hover:text-[#119AB8] transition-colors pl-3 border-l border-[#D5D9D9] uppercase tracking-tight",
                                                    selectedCat === c ? "font-bold text-[#111] border-[#119AB8]" : "text-[#565959] font-medium"
                                                )}
                                            >
                                                {c}
                                            </button>
                                        ))}
                                    </div>
                                </div>

                                <div>
                                    <h4 className="text-[14px] font-bold mb-4 uppercase tracking-tight">Price Structure</h4>
                                    <div className="space-y-2">
                                        {[
                                            { label: 'All Wholesale Prices', value: null },
                                            { label: 'Under PKR 1,000', value: 'Under 1000' },
                                            { label: 'PKR 1,000 - 5,000', value: '1000-5000' },
                                            { label: 'PKR 5,000 - 10,000', value: '5000-10000' },
                                            { label: 'Over PKR 10,000', value: 'Above 10000' }
                                        ].map(range => (
                                            <button
                                                key={range.label}
                                                onClick={() => setPriceRange(range.value)}
                                                className={cn(
                                                    "block text-[13px] hover:text-[#119AB8] transition-colors uppercase tracking-tight",
                                                    priceRange === range.value ? "font-bold text-[#111]" : "text-[#565959] font-medium"
                                                )}
                                            >
                                                {range.label}
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div className="p-8 border border-[#D5D9D9] rounded-[12px] bg-white">
                            <h4 className="text-[12px] font-black text-[#565959] uppercase tracking-[0.2em] mb-4">Quality Verified</h4>
                            <p className="text-[11px] text-[#565959] leading-relaxed font-medium">All items are sourced directly from authorized regional suppliers with guaranteed authenticity.</p>
                        </div>
                    </aside>

                    {/* Product Listing */}
                    <div className="flex-1">

                        {filtered.length > 0 ? (
                            <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-4 gap-4 sm:gap-6 md:gap-8">
                                {filtered.map((p) => (
                                    <ProductCard
                                        key={p.id}
                                        id={String(p.id)}
                                        title={(p.product_name || p.name || '').replace(/\s*\(.*?\)\s*$/, '').trim()}
                                        description={p.description}
                                        image={getImageUrl(p.image_url || p.image || p.catalog_image || '') || undefined}
                                        price={parseFloat(p.selling_price || p.price || 0)}
                                        category={p.category_name || 'Cosmetic'}
                                        weight={p.weight}
                                        size={p.size || p.type}
                                        batch={p.batch_number || p.batch}
                                        stock={p.quantity_in_stock || p.total_quantity}
                                    />
                                ))}
                            </div>
                        ) : (
                            <div className="bg-[#f7f8fa] p-12 sm:p-24 border border-[#D5D9D9] rounded-[12px] text-center">
                                <div className="max-w-md mx-auto space-y-6">
                                    <h3 className="text-[20px] sm:text-[24px] font-bold uppercase tracking-tight">No items matched your criteria</h3>
                                    <p className="text-[#565959] text-[13px] sm:text-[14px] font-medium">Try adjusting your filters or search query to find alternative regional stock.</p>
                                    <button
                                        onClick={() => { setSelectedCat(''); setPriceRange(null); }}
                                        className="px-8 sm:px-10 py-3.5 sm:py-4 bg-[#111] text-white rounded-[8px] text-[11px] sm:text-[12px] font-bold uppercase tracking-[0.2em] hover:bg-[#333] transition-all shadow-xl"
                                    >
                                        Reset Catalog
                                    </button>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </main>

            {/* Mobile Filter Drawer (Sheet) */}
            <AnimatePresence>
                {isMobileFilterOpen && (
                    <>
                        {/* Backdrop */}
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 0.4 }}
                            exit={{ opacity: 0 }}
                            onClick={() => setIsMobileFilterOpen(false)}
                            className="fixed inset-0 bg-black/60 z-[99] lg:hidden"
                        />
                        {/* Drawer */}
                        <motion.div
                            initial={{ y: "100%" }}
                            animate={{ y: 0 }}
                            exit={{ y: "100%" }}
                            transition={{ type: "spring", damping: 28, stiffness: 300 }}
                            className="fixed bottom-0 left-0 right-0 bg-white rounded-t-[24px] z-[100] lg:hidden max-h-[85vh] overflow-hidden shadow-[0_-10px_30px_rgba(0,0,0,0.15)] flex flex-col"
                        >
                            {/* Drawer Header */}
                            <div className="flex items-center justify-between px-6 py-5 border-b border-[#D5D9D9] bg-white">
                                <h3 className="text-[15px] font-bold uppercase tracking-wider text-[#111]">Filter & Refine</h3>
                                <button
                                    onClick={() => setIsMobileFilterOpen(false)}
                                    className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center text-slate-500 hover:text-slate-800 transition-colors"
                                >
                                    <X size={18} />
                                </button>
                            </div>

                            {/* Drawer Content */}
                            <div className="p-6 space-y-8 flex-1 overflow-y-auto">
                                {/* Departments */}
                                <div>
                                    <h4 className="text-[12px] font-black text-[#565959] uppercase tracking-[0.2em] mb-4">Departments</h4>
                                    <div className="grid grid-cols-2 gap-3">
                                        <button
                                            onClick={() => setSelectedCat('')}
                                            className={cn(
                                                "px-4 py-3 rounded-xl border text-[11px] font-bold uppercase tracking-wider text-center transition-all truncate",
                                                !selectedCat
                                                    ? "bg-[#111] border-[#111] text-white shadow-md font-black"
                                                    : "bg-white border-[#D5D9D9] text-[#565959] hover:bg-slate-50"
                                            )}
                                        >
                                            Full Catalog
                                        </button>
                                        {cats.map(c => (
                                            <button
                                                key={c}
                                                onClick={() => setSelectedCat(c)}
                                                className={cn(
                                                    "px-4 py-3 rounded-xl border text-[11px] font-bold uppercase tracking-wider text-center transition-all truncate",
                                                    selectedCat === c
                                                        ? "bg-[#111] border-[#111] text-white shadow-md font-black"
                                                        : "bg-white border-[#D5D9D9] text-[#565959] hover:bg-slate-50"
                                                )}
                                            >
                                                {c}
                                            </button>
                                        ))}
                                    </div>
                                </div>

                                {/* Price Structure */}
                                <div>
                                    <h4 className="text-[12px] font-black text-[#565959] uppercase tracking-[0.2em] mb-4">Price Structure</h4>
                                    <div className="space-y-2.5">
                                        {[
                                            { label: 'All Wholesale Prices', value: null },
                                            { label: 'Under PKR 1,000', value: 'Under 1000' },
                                            { label: 'PKR 1,000 - 5,000', value: '1000-5000' },
                                            { label: 'PKR 5,000 - 10,000', value: '5000-10000' },
                                            { label: 'Over PKR 10,000', value: 'Above 10000' }
                                        ].map(range => (
                                            <button
                                                key={range.label}
                                                onClick={() => setPriceRange(range.value)}
                                                className={cn(
                                                    "w-full text-left px-5 py-3.5 rounded-xl border text-[12px] font-bold uppercase tracking-wider flex items-center justify-between transition-all",
                                                    priceRange === range.value
                                                        ? "bg-[#119AB8]/10 border-[#119AB8] text-[#119AB8]"
                                                        : "bg-white border-[#D5D9D9] text-[#565959] hover:bg-slate-50"
                                                )}
                                            >
                                                <span>{range.label}</span>
                                                {priceRange === range.value && <CheckCircle size={16} className="text-[#119AB8]" />}
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            </div>

                            {/* Drawer Footer */}
                            <div className="p-6 border-t border-[#D5D9D9] bg-white flex gap-4">
                                <button
                                    onClick={() => { setSelectedCat(''); setPriceRange(null); }}
                                    className="flex-1 py-4 border border-[#D5D9D9] rounded-xl text-[12px] font-bold uppercase tracking-wider text-[#565959] hover:bg-slate-50 transition-all text-center"
                                >
                                    Reset
                                </button>
                                <button
                                    onClick={() => setIsMobileFilterOpen(false)}
                                    className="flex-1 py-4 bg-[#111] hover:bg-[#333] text-white rounded-xl text-[12px] font-bold uppercase tracking-wider transition-all text-center shadow-lg shadow-black/10"
                                >
                                    Apply
                                </button>
                            </div>
                        </motion.div>
                    </>
                )}
            </AnimatePresence>

            <Footer />
        </div>
    );
}

export default function Shop() {
    return (
        <Suspense fallback={<PageLoader />}>
            <ShopContent />
        </Suspense>
    );
}
