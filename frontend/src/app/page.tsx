'use client';

import Link from "next/link";
import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { authService } from "@/lib/auth";
import { productService } from "@/lib/api";
import {
    ArrowRight, ChevronRight, ChevronLeft, Star, ShoppingCart, Shield, Truck, RefreshCcw,
    Clock, Heart, Zap, Sparkles, TrendingUp, CheckCircle, Gift,
    Quote, Users, Crown, Percent, Package, Eye, Play, ChevronDown
} from "lucide-react";
import Navbar from "@/components/layout/Navbar";
import Footer from "@/components/layout/Footer";
import { useCart } from "@/context/CartContext";
import { getImageUrl } from "@/lib/utils";

// ─── Data ──────────────────────────────────────────────────────────────────────
const HERO_SLIDES = [
    {
        badge: "🔥 Today's Deal",
        title: "Up to 40%",
        titleAccent: "Off",
        sub: "Premium Skincare — Curated for radiant skin",
        cta: "Shop Skincare",
        href: "/shop?cat=skincare",
        img: "https://images.unsplash.com/photo-1596462502278-27bfdd403cc2?w=1400&auto=format&fit=crop&q=85",
        tag: "Skincare",
    },
    {
        badge: "✨ New In",
        title: "Fresh",
        titleAccent: "Makeup",
        sub: "2025 Collections — Be the first to glow",
        cta: "Explore Makeup",
        href: "/shop?sort=newest",
        img: "https://images.unsplash.com/photo-1522335789203-aabd1fc54bc9?w=1400&auto=format&fit=crop&q=85",
        tag: "Makeup",
    },
    {
        badge: "💎 Exclusive",
        title: "Luxury",
        titleAccent: "Scents",
        sub: "International Fragrances at Pakistan Prices",
        cta: "Shop Fragrance",
        href: "/shop?cat=fragrance",
        img: "https://images.unsplash.com/photo-1523293182086-7651a899d37f?w=1400&auto=format&fit=crop&q=85",
        tag: "Fragrance",
    },
];

const CATEGORIES = [
    { name: "Skincare", img: "https://images.unsplash.com/photo-1608248543803-ba4f8c70ae0b?q=80&w=700&auto=format&fit=crop", href: "/shop?cat=Skincare", count: "500+" },
    { name: "Makeup", img: "https://images.unsplash.com/photo-1583241475880-083f84372725?q=80&w=700&auto=format&fit=crop", href: "/shop?cat=Makeup", count: "400+" },
    { name: "Fragrance", img: "https://images.unsplash.com/photo-1541643600914-78b084683601?q=80&w=700&auto=format&fit=crop", href: "/shop?cat=Fragrance", count: "200+" },
    { name: "Haircare", img: "https://images.unsplash.com/photo-1527799820374-87412714d9ef?q=80&w=700&auto=format&fit=crop", href: "/shop?cat=Haircare", count: "300+" },
    { name: "Gift Sets", img: "https://images.unsplash.com/photo-1607082348824-0a96f2a4b9da?q=80&w=700&auto=format&fit=crop", href: "/shop?cat=Gift Sets", count: "100+" },
    { name: "New Arrivals", img: "https://images.unsplash.com/photo-1611080626919-7cf5a9dbab12?q=80&w=700&auto=format&fit=crop", href: "/shop?cat=New Arrivals", count: "100+" },
];

const TRUST = [
    { icon: <Truck className="h-5 w-5" />, title: "Free Delivery", desc: "Orders over Rs. 5,000", color: "text-emerald-600", bg: "bg-emerald-50", border: "border-emerald-100" },
    { icon: <Shield className="h-5 w-5" />, title: "100% Authentic", desc: "Authorized distributors", color: "text-[#FF9900]", bg: "bg-[#FF9900]/5", border: "border-[#FF9900]/10" },
    { icon: <RefreshCcw className="h-5 w-5" />, title: "Easy Returns", desc: "7-day hassle-free", color: "text-violet-600", bg: "bg-violet-50", border: "border-violet-100" },
    { icon: <Clock className="h-5 w-5" />, title: "24/7 Support", desc: "Always here to help", color: "text-amber-600", bg: "bg-amber-50", border: "border-amber-100" },
];

const BRANDS = ["L'Oréal", "Maybelline", "The Ordinary", "CeraVe", "MAC", "Garnier", "Neutrogena", "Dove"];

// ─── Helpers ───────────────────────────────────────────────────────────────────
function SectionHeader({ eyebrow, title, cta, href }: { eyebrow: string; title: string; cta?: string; href?: string }) {
    return (
        <div className="flex items-end justify-between mb-8">
            <div>
                <p className="text-[11px] text-[#FF9900] font-black uppercase tracking-[0.3em] mb-2">{eyebrow}</p>
                <h2 className="text-2xl lg:text-3xl font-black text-gray-900 dark:text-white tracking-tight">{title}</h2>
            </div>
            {cta && href && (
                <Link href={href} className="text-sm font-bold text-[#FF9900] hover:text-[#e68a00] flex items-center gap-1 group transition-colors">
                    {cta} <ArrowRight className="h-4 w-4 group-hover:translate-x-1 transition-transform" />
                </Link>
            )}
        </div>
    );
}

// ─── Component ─────────────────────────────────────────────────────────────────
export default function Home() {
    const [currentSlide, setCurrentSlide] = useState(0);
    const [bestsellers, setBestsellers] = useState<any[]>([]);
    const [flashSale, setFlashSale] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const { addToCart } = useCart();
    const router = useRouter();

    useEffect(() => {
        const load = async () => {
            try {
                const data = await productService.getAll();
                const api = Array.isArray(data) ? data : (data as any).results || [];
                const active = api.filter((p: any) => p.status === 'active');
                setBestsellers(active.slice(0, 8));
                setFlashSale(active.filter((p: any) => p.price < 3000).slice(0, 4));
            } catch (err) { } finally { setLoading(false); }
        };
        load();
    }, []);

    useEffect(() => {
        const timer = setInterval(() => {
            setCurrentSlide(prev => (prev + 1) % HERO_SLIDES.length);
        }, 6000);
        return () => clearInterval(timer);
    }, []);

    const nextSlide = () => setCurrentSlide(prev => (prev + 1) % HERO_SLIDES.length);
    const prevSlide = () => setCurrentSlide(prev => (prev - 1 + HERO_SLIDES.length) % HERO_SLIDES.length);

    return (
        <div className="min-h-screen bg-[#F8F9FA] dark:bg-[#0f172a] font-sans selection:bg-[#FF9900]/30 transition-colors duration-500">
            <Navbar />

            <main>
                {/* ── HERO CAROUSEL ── */}
                <section className="relative h-[400px] lg:h-[500px] overflow-hidden group">
                    {HERO_SLIDES.map((slide, i) => (
                        <div key={i} className={`absolute inset-0 transition-all duration-1000 ease-out ${i === currentSlide ? 'opacity-100 scale-100 z-10' : 'opacity-0 scale-105 z-0'}`}>
                            <div className="absolute inset-0 bg-gradient-to-r from-black/60 via-black/20 to-transparent z-10" />
                            <img src={slide.img} alt={slide.title} className="w-full h-full object-cover" />
                            <div className="absolute inset-0 z-20 flex items-center">
                                <div className="container mx-auto px-4 lg:px-12">
                                    <div className="max-w-xl animate-fade-in-up">
                                        <span className="inline-block px-4 py-1.5 bg-[#FF9900] text-white text-[10px] font-black uppercase tracking-widest rounded-full mb-6">
                                            {slide.badge}
                                        </span>
                                        <h1 className="text-5xl lg:text-7xl font-black text-white mb-4 tracking-tighter leading-[0.9]">
                                            {slide.title} <span className="text-[#FF9900] italic">{slide.titleAccent}</span>
                                        </h1>
                                        <p className="text-white/80 text-lg lg:text-xl font-medium mb-10 max-w-md leading-relaxed">
                                            {slide.sub}
                                        </p>
                                        <Link href={slide.href}
                                            className="inline-flex items-center gap-3 px-8 py-4 bg-white hover:bg-[#FF9900] hover:text-white text-gray-900 font-bold rounded-xl transition-all shadow-xl hover:-translate-y-1 active:scale-95 group">
                                            {slide.cta}
                                            <ArrowRight className="h-5 w-5 group-hover:translate-x-1 transition-transform" />
                                        </Link>
                                    </div>
                                </div>
                            </div>
                        </div>
                    ))}

                    <button onClick={prevSlide} className="absolute left-4 top-1/2 -translate-y-1/2 z-30 w-12 h-12 bg-white/10 hover:bg-white/20 backdrop-blur-md border border-white/20 rounded-full flex items-center justify-center text-white p-2 transition opacity-0 group-hover:opacity-100">
                        <ChevronLeft className="h-6 w-6" />
                    </button>
                    <button onClick={nextSlide} className="absolute right-4 top-1/2 -translate-y-1/2 z-30 w-12 h-12 bg-white/10 hover:bg-white/20 backdrop-blur-md border border-white/20 rounded-full flex items-center justify-center text-white p-2 transition opacity-0 group-hover:opacity-100">
                        <ChevronRight className="h-6 w-6" />
                    </button>

                    <div className="absolute bottom-8 left-1/2 -translate-x-1/2 z-30 flex gap-2">
                        {HERO_SLIDES.map((_, i) => (
                            <button key={i} onClick={() => setCurrentSlide(i)}
                                className={`h-1.5 rounded-full transition-all ${i === currentSlide ? 'w-8 bg-[#FF9900]' : 'w-2 bg-white/40 hover:bg-white/60'}`} />
                        ))}
                    </div>
                </section>

                {/* ── TRUST BAR ── */}
                <section className="bg-white dark:bg-slate-900 border-b border-gray-100 dark:border-slate-800 py-6">
                    <div className="container mx-auto px-4 lg:px-12">
                        <div className="grid grid-cols-2 lg:grid-cols-4 gap-8">
                            {TRUST.map((t, i) => (
                                <div key={i} className="flex items-center gap-4">
                                    <div className={`w-12 h-12 rounded-2xl ${t.bg} flex items-center justify-center ${t.color}`}>
                                        {t.icon}
                                    </div>
                                    <div>
                                        <h4 className="text-sm font-black text-gray-900 dark:text-white uppercase tracking-tight">{t.title}</h4>
                                        <p className="text-[11px] text-gray-500 font-medium">{t.desc}</p>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </section>

                <div className="container mx-auto px-4 lg:px-12 py-12 space-y-20">

                    {/* ── CATEGORIES GRID ── */}
                    <section>
                        <SectionHeader eyebrow="Curated Collections" title="Shop by Category" cta="View All" href="/shop" />
                        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
                            {CATEGORIES.map((cat, i) => (
                                <Link key={i} href={cat.href} className="group flex flex-col items-center">
                                    <div className="w-full aspect-square rounded-2xl overflow-hidden bg-white dark:bg-slate-800 border border-gray-100 dark:border-slate-800 mb-4 shadow-sm group-hover:shadow-xl group-hover:border-[#FF9900]/30 transition-all duration-500">
                                        <img src={cat.img} alt={cat.name} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700" />
                                    </div>
                                    <h3 className="text-sm font-bold text-gray-900 dark:text-white group-hover:text-[#FF9900] transition-colors">{cat.name}</h3>
                                    <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest mt-0.5">{cat.count} Products</p>
                                </Link>
                            ))}
                        </div>
                    </section>

                    {/* ── BEST SELLERS CAROUSEL ── */}
                    <section>
                        <SectionHeader eyebrow="The Glow List" title="Our Best Sellers" cta="Explore More" href="/shop?cat=Best Sellers" />
                        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-6">
                            {loading ? (
                                Array.from({ length: 5 }).map((_, i) => (
                                    <div key={i} className="animate-pulse bg-white dark:bg-slate-800 rounded-3xl h-80 border border-gray-100 dark:border-slate-800" />
                                ))
                            ) : (
                                bestsellers.map((p, i) => {
                                    const price = typeof p.price === 'string' ? parseFloat(p.price) : (p.price || 0);
                                    return (
                                        <div key={p.id} className="group relative bg-white dark:bg-slate-900 rounded-3xl border border-gray-100 dark:border-slate-800 p-3 hover:shadow-2xl hover:border-[#FF9900]/20 transition-all duration-500">
                                            <Link href={`/product/${p.id}`} className="block aspect-[4/5] rounded-2xl overflow-hidden mb-4 bg-gray-50 dark:bg-slate-800 relative">
                                                <img src={getImageUrl(p.image_url || p.image) || "https://images.unsplash.com/photo-1596462502278-27bfdd403cc2?w=400"} alt={p.name}
                                                    className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700" />
                                                <button className="absolute bottom-3 right-3 w-10 h-10 bg-white dark:bg-slate-700 rounded-xl shadow-lg flex items-center justify-center text-gray-900 dark:text-white opacity-0 group-hover:opacity-100 translate-y-2 group-hover:translate-y-0 transition-all active:scale-95 duration-300">
                                                    <ShoppingCart className="h-5 w-5" />
                                                </button>
                                            </Link>
                                            <div className="px-1">
                                                <p className="text-[9px] text-[#FF9900] font-black uppercase tracking-widest mb-1">{p.category_name || 'Beauty'}</p>
                                                <Link href={`/product/${p.id}`}>
                                                    <h3 className="text-sm font-bold text-gray-900 dark:text-white mb-2 line-clamp-1 group-hover:text-[#FF9900] transition-colors">{p.name}</h3>
                                                </Link>
                                                <div className="flex items-center justify-between">
                                                    <p className="text-base font-black text-gray-900 dark:text-[#FF9900]">Rs. {price.toLocaleString()}</p>
                                                    <div className="flex items-center gap-1 text-[10px] text-amber-500 font-bold">
                                                        <Star className="h-3 w-3 fill-amber-500" /> 4.9
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    )
                                })
                            )}
                        </div>
                    </section>

                    {/* ── PROMO BANNER ── */}
                    <section className="relative rounded-[2rem] overflow-hidden bg-[#131921] py-20 lg:py-32">
                        <img src="https://images.unsplash.com/photo-1512496011931-d21d88e35223?w=1400&auto=format&fit=crop&q=80" 
                             className="absolute inset-0 w-full h-full object-cover opacity-40 mix-blend-luminosity" />
                        <div className="absolute inset-0 bg-gradient-to-r from-[#131921] via-[#131921]/60 to-transparent" />
                        <div className="relative container mx-auto px-8 lg:px-20">
                            <div className="max-w-2xl">
                                <span className="inline-flex items-center gap-2 px-4 py-1.5 bg-[#FF9900]/20 border border-[#FF9900]/30 text-[#FF9900] text-[10px] font-black uppercase tracking-[0.2em] rounded-full mb-6">
                                    <Crown className="h-3 w-3" /> Exclusive Selection
                                </span>
                                <h2 className="text-5xl lg:text-7xl font-black text-white mb-6 leading-none tracking-tighter">Luxury Beyond <br/> <span className="text-[#FF9900]">Limits.</span></h2>
                                <p className="text-lg text-white/70 font-medium mb-10 max-w-lg leading-relaxed">
                                    Discover international skincare and fragrance brands, now available right here in Pakistan. Authentic products, wholesale prices.
                                </p>
                                <div className="flex flex-wrap gap-4">
                                    <Link href="/shop" className="px-8 py-4 bg-[#FF9900] hover:bg-white hover:text-[#FF9900] text-[#131921] font-black rounded-xl transition-all shadow-xl hover:-translate-y-1 active:scale-95">
                                        Shop The Collection
                                    </Link>
                                    <Link href="/about" className="px-8 py-4 bg-white/10 hover:bg-white/20 backdrop-blur-md border border-white/20 text-white font-black rounded-xl transition-all hover:-translate-y-1">
                                        Our Story
                                    </Link>
                                </div>
                            </div>
                        </div>
                    </section>

                    {/* ── BRANDS ── */}
                    <section>
                        <div className="text-center mb-10">
                            <p className="text-[10px] text-gray-400 font-black uppercase tracking-[0.3em] mb-4">Official Distributors Of</p>
                            <div className="flex flex-wrap justify-center gap-x-12 gap-y-8 grayscale opacity-50 hover:grayscale-0 hover:opacity-100 transition-all duration-700">
                                {BRANDS.map(b => (
                                    <span key={b} className="text-2xl font-black text-gray-900 dark:text-white tracking-tighter italic">
                                        {b}
                                    </span>
                                ))}
                            </div>
                        </div>
                    </section>

                    {/* ── NEWSLETTER ── */}
                    <section className="bg-white dark:bg-slate-900 rounded-[2.5rem] border border-gray-100 dark:border-slate-800 p-12 lg:p-24 text-center relative overflow-hidden">
                        <div className="absolute top-0 right-0 w-64 h-64 bg-[#FF9900]/5 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2" />
                        <div className="absolute bottom-0 left-0 w-64 h-64 bg-[#FF9900]/5 rounded-full blur-3xl translate-y-1/2 -translate-x-1/2" />
                        
                        <div className="relative max-w-2xl mx-auto">
                            <div className="w-16 h-16 bg-[#FF9900]/10 rounded-2xl flex items-center justify-center mx-auto mb-8">
                                <Gift className="h-8 w-8 text-[#FF9900]" />
                            </div>
                            <h2 className="text-4xl lg:text-5xl font-black text-gray-900 dark:text-white mb-4 tracking-tighter leading-none">Join the Al-Qavi Family</h2>
                            <p className="text-gray-500 dark:text-gray-400 text-lg font-medium mb-12">Sign up for secret sales, launch notifications & beauty tips delivered to your inbox.</p>
                            
                            <form className="flex flex-col sm:flex-row gap-4 max-w-lg mx-auto" onSubmit={e => e.preventDefault()}>
                                <input type="email" placeholder="Enter your email" 
                                    className="flex-1 px-6 py-4 rounded-xl bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-slate-800 text-gray-900 dark:text-white outline-none focus:ring-4 focus:ring-[#FF9900]/10 focus:border-[#FF9900] transition-all" />
                                <button className="px-8 py-4 bg-[#131921] hover:bg-[#FF9900] text-white font-black rounded-xl transition-all shadow-xl active:scale-95">
                                    Subscribe Now
                                </button>
                            </form>
                            <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest mt-6">Secure. Spam-free. Simple.</p>
                        </div>
                    </section>

                </div>
            </main>

            <Footer />
        </div>
    );
}

const ACCENT_PRESETS = ['#FF9900', '#2563EB', '#10B981', '#EF4444', '#8B5CF6', '#EC4899', '#06B6D4'];
