'use client';

import PageLoader from '@/components/ui/PageLoader';

import Link from "next/link";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import {
    ArrowRight, ChevronRight, ChevronLeft, Star, ShoppingCart,
    Shield, Truck, RefreshCcw, Clock, Package, CheckCircle,
    TrendingUp, Sparkles, Zap, ShieldCheck, Globe, ZapIcon, Heart, Eye
} from "lucide-react";
import Navbar from "@/components/layout/Navbar";
import Footer from "@/components/layout/Footer";
import { useCart } from "@/context/CartContext";
import { getImageUrl } from "@/lib/utils";
import { productService, categoryService, mainCategoryService } from "@/lib/api";
import ProductCard from "@/components/ui/ProductCard";

const HERO_SLIDES = [
    {
        title: "The Art of Beauty",
        sub: "Pakistan's most exclusive collection of clinical grade skincare and luxury fragrances.",
        cta: "Explore Collection",
        href: "/shop",
        img: "https://images.unsplash.com/photo-1596462502278-27bfdd403cc2?w=1600&q=80",
    },
    {
        title: "Clinical Perfection",
        sub: "Directly imported from global manufacturing hubs with 100% authenticity audit protocols.",
        cta: "Shop Essentials",
        href: "/shop?cat=Skincare",
        img: "https://images.unsplash.com/photo-1522335789203-aabd1fc54bc9?w=1600&q=80",
    },
    {
        title: "Signature Scents",
        sub: "Experience rare formulations and artisanal fragrances from the world's finest perfume houses.",
        cta: "Discover More",
        href: "/shop?cat=Fragrance",
        img: "https://images.unsplash.com/photo-1523293182086-7651a899d37f?w=1600&q=80",
    },
];

const CATEGORY_FALLBACK_IMAGES = [
    "https://images.unsplash.com/photo-1608248543803-ba4f8c70ae0b?q=80&w=400",
    "https://images.unsplash.com/photo-1583241475880-083f84372725?q=80&w=400",
    "https://images.unsplash.com/photo-1541643600914-78b084683601?q=80&w=400",
    "https://images.unsplash.com/photo-1527799820374-87412714d9ef?q=80&w=400"
];

function ProductRow({ title, subtitle, products, loading, onAdd }: { title: string, subtitle: string, products: any[], loading: boolean, onAdd: (p: any, e?: React.MouseEvent, qty?: number) => void }) {
    if (!loading && products.length === 0) return null;
    return (
        <section className="mt-20">
            <div className="container mx-auto px-6 mb-8 flex justify-between items-end">
                <div className="space-y-1">
                    <h2 className="text-2xl font-black tracking-tighter dark:text-white uppercase leading-none">{title}</h2>
                    <p className="text-slate-400 text-[10px] font-bold uppercase tracking-[0.2em]">{subtitle}</p>
                </div>
                <Link href={`/shop?cat=${title}`} className="text-[10px] font-black text-[#007185] hover:text-[#F7CA00] flex items-center gap-1.5 group uppercase tracking-widest border-b border-transparent hover:border-[#007185] transition-all pb-0.5">
                    VIEW RANGE <ArrowRight className="h-3 w-3 transition-transform group-hover:translate-x-0.5" />
                </Link>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4 px-6 lg:px-12 pb-4">
                {loading ? (
                    Array.from({ length: 5 }).map((_, i) => (
                        <div key={i} className="h-[360px] bg-slate-50 dark:bg-[#1B1C1E] animate-pulse rounded-2xl" />
                    ))
                ) : (
                    products.map(p => {
                        const price = typeof p.price === 'string' ? parseFloat(p.price) : (p.price || 0);
                        const inStock = p.quantity_in_stock === undefined || p.quantity_in_stock > 0;
                        return (
                            <ProductCard
                                key={p.id}
                                id={String(p.id)}
                                title={p.name}
                                image={getImageUrl(p.image_url || p.image || '') || undefined}
                                price={price}
                                category={p.category_name || 'Beauty'}
                                stock={p.quantity_in_stock}
                                rating={4.5}
                                reviews={p.reviews_count || 12}
                                onAddToCart={(qty) => onAdd(p, undefined, qty)}
                            />
                        );
                    })
                )}
            </div>
        </section>
    );
}

export default function Home() {
    const [currentSlide, setCurrentSlide] = useState(0);
    const [mainCategories, setMainCategories] = useState<any[]>([]);
    const [categories, setCategories] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const { addToCart } = useCart();
    const router = useRouter();

    useEffect(() => {
        Promise.all([
            mainCategoryService.getAll(),
            categoryService.getAll().catch(() => [])
        ])
            .then(([mCatData, subCatData]) => {
                const mCats = Array.isArray(mCatData) ? mCatData : (mCatData as any).results || [];
                // filter out main categories with no products if needed, or just show all
                setMainCategories(mCats);

                const subCats = Array.isArray(subCatData) ? subCatData : (subCatData as any).results || [];
                setCategories(subCats.slice(0, 4));
            })
            .finally(() => setLoading(false));
    }, []);

    useEffect(() => {
        const timer = setInterval(() => setCurrentSlide(prev => (prev + 1) % HERO_SLIDES.length), 10000);
        return () => clearInterval(timer);
    }, []);

    const handleAdd = (p: any, e?: React.MouseEvent, qty: number = 1) => {
        e?.preventDefault();
        addToCart({ id: p.id, name: p.name, price: p.price, quantity: qty, image: p.image_url || p.image || '', category: p.category_name || 'Beauty', stock: p.quantity_in_stock });
    };

    if (loading) return <PageLoader />;

    return (
        <div className="min-h-screen bg-background transition-colors duration-500">
            <Navbar />

            <main className="pb-20">
                {/* ── HERO SECTION ── */}
                <section className="relative h-[80vh] overflow-hidden group">
                    <div className="absolute inset-0 flex transition-transform duration-1000 ease-in-out" style={{ transform: `translateX(-${currentSlide * 100}%)` }}>
                        {HERO_SLIDES.map((slide, i) => (
                            <div key={i} className="min-w-full relative h-full">
                                <img src={slide.img} className="w-full h-full object-cover" alt="" />
                                <div className="absolute inset-0 bg-gradient-to-r from-slate-900/60 via-slate-900/20 to-transparent flex items-center">
                                    <div className="container mx-auto px-6 lg:px-12">
                                        <div className="max-w-2xl text-white space-y-6">
                                            <div className="inline-flex items-center gap-2 px-3 py-1 bg-[#F7CA00]/20 backdrop-blur-md rounded-full border border-[#F7CA00]/20">
                                                <Sparkles className="h-4 w-4 text-[#F7CA00]" />
                                                <span className="text-[10px] font-bold uppercase tracking-widest text-[#F7CA00]">Exclusive Wholesale Access</span>
                                            </div>
                                            <h1 className="text-6xl lg:text-7xl font-bold tracking-tight leading-[1.1] drop-shadow-2xl">
                                                {slide.title}
                                            </h1>
                                            <p className="text-lg text-slate-200/90 font-medium leading-relaxed max-w-lg text-balance">
                                                {slide.sub}
                                            </p>
                                            <div className="flex items-center gap-4 pt-4">
                                                <Link href={slide.href} className="px-8 py-4 bg-[#F7CA00] hover:bg-[#F7CA00] text-white font-bold rounded-xl transition-all active:scale-95 shadow-lg shadow-[#F7CA00]/20 flex items-center gap-2 group/btn">
                                                    {slide.cta}
                                                    <ArrowRight className="h-5 w-5 transition-transform group-hover/btn:translate-x-1" />
                                                </Link>
                                                <Link href="/shop" className="px-8 py-4 bg-white/10 hover:bg-white/20 backdrop-blur-md text-white font-bold rounded-xl transition-all border border-white/10">
                                                    View Collection
                                                </Link>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>

                    <div className="absolute bottom-10 left-1/2 -translate-x-1/2 flex gap-3 z-30">
                        {HERO_SLIDES.map((_, i) => (
                            <button key={i} onClick={() => setCurrentSlide(i)} className={`h-1.5 transition-all duration-500 rounded-full ${currentSlide === i ? 'w-12 bg-[#F7CA00]' : 'w-3 bg-white/40 hover:bg-white/60'}`} />
                        ))}
                    </div>
                </section>

                {/* ── METRICS BAR ── */}
                <div className="container mx-auto px-6 -mt-10 relative z-40">
                    <div className="bg-white dark:bg-slate-900 border border-border p-8 rounded-2xl shadow-xl shadow-black/5 grid grid-cols-2 lg:grid-cols-4 gap-8">
                        {[
                            { icon: <Globe className="h-5 w-5" />, label: "Direct Import", sub: "Global Brands" },
                            { icon: <CheckCircle className="h-5 w-5" />, label: "100% Authentic", sub: "Verified Source" },
                            { icon: <Truck className="h-5 w-5" />, label: "Fast Dispatch", sub: "Nationwide" },
                            { icon: <Clock className="h-5 w-5" />, label: "Top Support", sub: "Expert Assistance" },
                        ].map((m, i) => (
                            <div key={i} className="flex items-center gap-4 group">
                                <div className="w-12 h-12 rounded-xl bg-orange-50 dark:bg-[#F7CA00]/10 border border-orange-100 dark:border-[#F7CA00]/20 flex items-center justify-center text-[#F7CA00] transition-transform group-hover:scale-110">
                                    {m.icon}
                                </div>
                                <div>
                                    <div className="text-sm font-bold dark:text-white">{m.label}</div>
                                    <div className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">{m.sub}</div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                {/* ── CATEGORY SHOWCASE ── */}
                <section className="container mx-auto px-6 mt-24">
                    <div className="flex items-end justify-between mb-12">
                        <div className="space-y-4">
                            <h2 className="text-3xl lg:text-4xl font-bold tracking-tight dark:text-white">Shop by Category</h2>
                            <p className="text-slate-500 text-sm font-medium">Find the perfect products for your beauty routine.</p>
                        </div>
                        <Link href="/shop" className="text-sm font-bold text-[#F7CA00] hover:text-[#F7CA00] flex items-center gap-2 group">
                            Browse All
                            <ChevronRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
                        </Link>
                    </div>

                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        {categories.map((cat, i) => (
                            <Link key={cat.id || cat.name} href={`/shop?cat=${cat.name}`} className="group relative aspect-[1/1] rounded-2xl border border-border/40 overflow-hidden bg-white shadow-sm hover:shadow-xl transition-all duration-500">
                                <img src={getImageUrl(cat.image) || CATEGORY_FALLBACK_IMAGES[i % CATEGORY_FALLBACK_IMAGES.length] || undefined} className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110" alt="" />
                                <div className="absolute inset-0 bg-gradient-to-t from-slate-900/80 via-transparent to-transparent flex flex-col justify-end p-4 lg:p-6 text-center">
                                    <h3 className="text-sm lg:text-lg font-black text-white tracking-tighter uppercase leading-tight drop-shadow-md">{cat.name}</h3>
                                    <span className="text-[7px] lg:text-[9px] font-bold uppercase tracking-[0.2em] text-[#F7CA00] mt-1 opacity-0 group-hover:opacity-100 transition-opacity translate-y-2 group-hover:translate-y-0 duration-300">EXPLORE COLLECTION</span>
                                </div>
                            </Link>
                        ))}
                    </div>
                </section>

                {/* ── SECTIONS ── */}
                {loading ? (
                    <div className="container mx-auto px-6 py-12">
                        <div className="h-8 w-48 bg-slate-100 dark:bg-slate-800 animate-pulse rounded mb-4" />
                        <div className="h-4 w-64 bg-slate-100 dark:bg-slate-800 animate-pulse rounded" />
                    </div>
                ) : (
                    mainCategories.map((mcat: any) => (
                        <ProductRow
                            key={mcat.id}
                            title={mcat.name}
                            subtitle={mcat.description || `Explore our exclusive ${mcat.name} collection.`}
                            products={mcat.product_details || []}
                            loading={loading}
                            onAdd={handleAdd}
                        />
                    ))
                )}

                {/* ── BRAND STRIP ── */}
                <section className="bg-slate-50 dark:bg-slate-900/50 py-16 mt-20 border-y border-border overflow-hidden">
                    <div className="container mx-auto px-6">
                        <h3 className="text-[11px] font-bold text-slate-400 text-center uppercase tracking-[0.3em] mb-12">Trusted Wholesale Partners</h3>
                        <div className="flex flex-wrap items-center justify-center gap-12 lg:gap-20 opacity-30 grayscale hover:opacity-100 hover:grayscale-0 transition-all duration-700">
                            {['LOREAL', 'MAYBELLINE', 'THE ORDINARY', 'CERAVE', 'MAC', 'ESTEE LAUDER'].map(brand => (
                                <span key={brand} className="text-xl lg:text-2xl font-bold tracking-tighter text-slate-900 dark:text-white cursor-default">{brand}</span>
                            ))}
                        </div>
                    </div>
                </section>
            </main>

            <Footer />
        </div>
    );
}
