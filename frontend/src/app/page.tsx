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
        <section className="mt-8 container mx-auto px-4 lg:px-8">
            <div className="bg-white p-6 shadow-md">
                <div className="mb-6 flex justify-between items-end">
                    <div className="space-y-1">
                        <h2 className="text-xl font-black tracking-tighter text-[#1d252c] uppercase leading-none">{title}</h2>
                        <p className="text-slate-400 text-[11px] font-bold uppercase tracking-[0.1em]">{subtitle}</p>
                    </div>
                    <Link href={`/shop?cat=${title}`} className="text-[13px] font-bold text-[#007185] hover:text-[#C7511F] transition-colors underline-offset-4 hover:underline">
                        Shop All
                    </Link>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-4">
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
        <div className="min-h-screen bg-[#EAEDED] transition-colors duration-500">
            <Navbar />

            <main className="pb-20">
                {/* ── HERO SECTION ── */}
                <section className="relative h-[480px] lg:h-[600px] overflow-hidden">
                    <div className="absolute inset-0 flex transition-transform duration-1000 ease-in-out" style={{ transform: `translateX(-${currentSlide * 100}%)` }}>
                        {HERO_SLIDES.map((slide, i) => (
                            <div key={i} className="min-w-full relative h-full">
                                <img src={slide.img} className="w-full h-full object-cover" alt="" />
                                <div className="absolute inset-0 bg-gradient-to-t from-[#EAEDED] via-transparent to-transparent" />
                                <div className="absolute inset-0 bg-gradient-to-r from-black/40 via-transparent to-transparent flex items-center">
                                    <div className="container mx-auto px-6 lg:px-12">
                                        <div className="max-w-2xl text-white space-y-6 -mt-32 lg:-mt-48">
                                            <h1 className="text-5xl lg:text-6xl font-black tracking-tight leading-none drop-shadow-2xl uppercase">
                                                {slide.title}
                                            </h1>
                                            <p className="text-lg text-white/90 font-bold leading-relaxed max-w-lg drop-shadow-md">
                                                {slide.sub}
                                            </p>
                                            <div className="flex items-center gap-4 pt-4">
                                                <Link href={slide.href} className="px-10 py-4 bg-[#F7CA00] hover:bg-[#F3A847] text-black font-black rounded-lg transition-all active:scale-95 shadow-lg flex items-center gap-2 group/btn border border-[#F5C000]">
                                                    {slide.cta}
                                                    <ArrowRight className="h-5 w-5 transition-transform group-hover/btn:translate-x-1" />
                                                </Link>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>

                    <div className="absolute bottom-32 right-12 flex gap-3 z-30">
                        {HERO_SLIDES.map((_, i) => (
                            <button key={i} onClick={() => setCurrentSlide(i)} className={`h-2 transition-all duration-500 rounded-full ${currentSlide === i ? 'w-12 bg-[#F7CA00]' : 'w-4 bg-white/40'}`} />
                        ))}
                    </div>
                </section>

                {/* ── CATEGORY GRID (OVERLAYING HERO) ── */}
                <div className="container mx-auto px-4 lg:px-8 -mt-40 lg:-mt-52 relative z-40">
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                        {categories.map((cat, i) => (
                            <div key={cat.id || i} className="bg-white p-6 shadow-md hover:shadow-xl transition-shadow flex flex-col h-[420px]">
                                <h3 className="text-xl font-black text-[#1d252c] mb-4 uppercase tracking-tighter">{cat.name}</h3>
                                <Link href={`/shop?cat=${cat.name}`} className="flex-1 relative overflow-hidden group">
                                    <img src={getImageUrl(cat.image) || CATEGORY_FALLBACK_IMAGES[i % CATEGORY_FALLBACK_IMAGES.length]} className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105" alt="" />
                                </Link>
                                <Link href={`/shop?cat=${cat.name}`} className="mt-4 text-[13px] font-bold text-[#007185] hover:text-[#C7511F] transition-colors underline-offset-4 hover:underline">
                                    Shop Now
                                </Link>
                            </div>
                        ))}
                    </div>
                </div>

                {/* ── METRICS STRIP ── */}
                <div className="container mx-auto px-4 lg:px-8 mt-12">
                    <div className="bg-white border-y border-slate-200 py-6 px-8 grid grid-cols-2 lg:grid-cols-4 gap-8">
                        {[
                            { icon: <Globe className="h-5 w-5" />, label: "Express Shipping", sub: "Global Network" },
                            { icon: <ShieldCheck className="h-5 w-5" />, label: "Certified Original", sub: "100% Authentic" },
                            { icon: <Truck className="h-5 w-5" />, label: "Bulk Delivery", sub: "Nationwide Hubs" },
                            { icon: <Zap className="h-5 w-5" />, label: "Quick Connect", sub: "24/7 Priority Support" },
                        ].map((m, i) => (
                            <div key={i} className="flex items-center gap-4 group cursor-default">
                                <div className="text-[#F7CA00]"><m.icon.type className="h-6 w-6 stroke-[2.5]" /></div>
                                <div>
                                    <div className="text-[14px] font-black text-[#1d252c] uppercase tracking-tighter">{m.label}</div>
                                    <div className="text-[11px] text-slate-400 font-bold">{m.sub}</div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

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
