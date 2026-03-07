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

const TESTIMONIALS = [
    { name: "Sara Khan", role: "Skincare Enthusiast", text: "The quality of products is amazing! Every product has been 100% authentic. Fast delivery and great packaging.", rating: 5, img: "https://images.unsplash.com/photo-1531746020798-e6953c6e8e04?w=100&auto=format&fit=crop&q=80", verified: true },
    { name: "Aisha Malik", role: "Professional Makeup Artist", text: "As a professional MUA, I need reliable products. Al-Qavi never disappoints — wide range and competitive prices.", rating: 5, img: "https://images.unsplash.com/photo-1580489944761-15a19d654956?w=100&auto=format&fit=crop&q=80", verified: true },
    { name: "Hina Raza", role: "Regular Customer", text: "Best pricing in Pakistan! The loyalty program is a game-changer. Easy ordering and fast shipping.", rating: 5, img: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=100&auto=format&fit=crop&q=80", verified: true },
];

const BRANDS = ["L'Oréal", "Maybelline", "The Ordinary", "CeraVe", "MAC", "Garnier", "Neutrogena", "Dove"];

const STATS = [
    { value: "10K+", label: "Happy Customers", icon: <Users className="h-5 w-5" /> },
    { value: "2,500+", label: "Products", icon: <Package className="h-5 w-5" /> },
    { value: "100%", label: "Authentic Brands", icon: <Shield className="h-5 w-5" /> },
    { value: "4.9★", label: "Average Rating", icon: <Star className="h-5 w-5" /> },
];



// ─── Helpers ───────────────────────────────────────────────────────────────────
function GoldStars({ count = 4, total = 5 }: { count?: number; total?: number }) {
    return (
        <div className="flex gap-0.5">
            {Array.from({ length: total }).map((_, i) => (
                <Star key={i} className={`h-3.5 w-3.5 ${i < count ? 'text-amber-400 fill-amber-400' : 'text-gray-200 fill-gray-100'}`} />
            ))}
        </div>
    );
}

function SectionHeader({ eyebrow, title, cta, href }: { eyebrow: string; title: string; cta?: string; href?: string }) {
    return (
        <div className="flex items-end justify-between mb-10">
            <div>
                <p className="text-[11px] text-[#FF9900] font-black uppercase tracking-[0.3em] mb-2">{eyebrow}</p>
                <h2 className="text-3xl lg:text-4xl font-black text-gray-900 tracking-tight">{title}</h2>
            </div>
            {cta && href && (
                <Link href={href} className="hidden sm:flex items-center gap-1.5 text-sm text-gray-500 hover:text-[#FF9900] font-bold transition-colors group">
                    {cta} <ChevronRight className="h-4 w-4 group-hover:translate-x-1 transition-transform" />
                </Link>
            )}
        </div>
    );
}

function CountdownTimer() {
    const [time, setTime] = useState({ h: 11, m: 45, s: 30 });
    useEffect(() => {
        const t = setInterval(() => {
            setTime(prev => {
                let { h, m, s } = prev;
                s--;
                if (s < 0) { s = 59; m--; }
                if (m < 0) { m = 59; h--; }
                if (h < 0) { h = 23; m = 59; s = 59; }
                return { h, m, s };
            });
        }, 1000);
        return () => clearInterval(t);
    }, []);
    const pad = (n: number) => String(n).padStart(2, '0');
    const units = [{ v: time.h, l: 'HRS' }, { v: time.m, l: 'MIN' }, { v: time.s, l: 'SEC' }];
    return (
        <div className="flex items-center gap-2">
            {units.map((t, i) => (
                <div key={i} className="flex items-center gap-2">
                    <div className="bg-white/15 text-white text-xl font-mono font-black px-4 py-2.5 rounded-xl min-w-[56px] text-center leading-tight backdrop-blur-md ring-1 ring-white/20">
                        {pad(t.v)}
                        <div className="text-[9px] font-sans font-bold text-white/50 mt-0.5 tracking-widest">{t.l}</div>
                    </div>
                    {i < 2 && <span className="text-white/40 font-black text-xl pb-4">:</span>}
                </div>
            ))}
        </div>
    );
}

const BADGE_STYLES: Record<string, string> = {
    "Best Seller": "bg-amber-500 text-white",
    "New": "bg-emerald-500 text-white",
    "Sale": "bg-red-500 text-white",
    "Luxury": "bg-violet-600 text-white",
    "Premium": "bg-gray-900 text-white",
};

function ProductCard({ product, onAddToCart, index = 0 }: { product: any; onAddToCart: (p: any) => void; index?: number }) {
    const [wishlisted, setWishlisted] = useState(false);
    const [justAdded, setJustAdded] = useState(false);

    const price = typeof product.price === "string" ? parseFloat(product.price) : (product.price || 0);
    const originalPrice = price * 1.2;
    const discount = Math.round(((originalPrice - price) / originalPrice) * 100);
    const reviews = 68 + (index * 31) % 312;
    const inStock = product.stock === undefined || product.stock > 0;
    const rating = Math.min(5, Math.round((3.8 + (index % 5) * 0.2) * 2) / 2);
    const handleAdd = () => { if (!inStock) return; onAddToCart(product); setJustAdded(true); setTimeout(() => setJustAdded(false), 2000); };
    const badge = product.badge && BADGE_STYLES[product.badge] ? { text: product.badge, cls: BADGE_STYLES[product.badge] } : null;

    return (
        <div className="bg-white group rounded-2xl overflow-hidden transition-all duration-500 border border-gray-100 hover:border-[#FF9900]/20 hover:shadow-[0_8px_40px_rgba(0,113,133,0.12)] relative flex flex-col">
            <button onClick={() => setWishlisted(!wishlisted)}
                className={`absolute top-3 right-3 z-10 w-8 h-8 rounded-full flex items-center justify-center shadow-md transition-all duration-300 ${wishlisted ? 'bg-red-50 border border-red-100 scale-110' : 'bg-white/90 backdrop-blur-sm opacity-0 group-hover:opacity-100 translate-y-1 group-hover:translate-y-0'}`}>
                <Heart className={`h-3.5 w-3.5 ${wishlisted ? 'fill-red-500 text-red-500' : 'text-gray-400'}`} />
            </button>
            <div className="absolute top-3 left-3 z-10 flex flex-col gap-1.5">
                {badge && <span className={`text-[9px] font-black px-2.5 py-1 rounded-full shadow-sm tracking-wider ${badge.cls}`}>{badge.text}</span>}
                {discount > 0 && <span className="text-[9px] font-black bg-[#FF9900] text-white px-2.5 py-1 rounded-full shadow-sm">-{discount}%</span>}
            </div>
            <Link href={`/product/${product.id}`} className="block overflow-hidden bg-gray-50 relative" style={{ aspectRatio: '1' }}>
                <img src={product.image || 'https://images.unsplash.com/photo-1596462502278-27bfdd403cc2?q=80&w=400'} alt={product.name}
                    className="w-full h-full object-cover group-hover:scale-[1.07] transition-transform duration-700" />
                <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/50 to-transparent p-4 opacity-0 group-hover:opacity-100 transition-all duration-300 translate-y-3 group-hover:translate-y-0 flex items-end">
                    <span className="text-white text-[11px] font-black flex items-center gap-1.5"><Eye className="h-3.5 w-3.5" /> Quick View</span>
                </div>
            </Link>
            <div className="p-4 flex flex-col flex-1 gap-1.5">
                {product.category_name && <span className="text-[9px] text-[#FF9900] font-black uppercase tracking-[0.2em]">{product.category_name}</span>}
                <Link href={`/product/${product.id}`}>
                    <h3 className="text-[13px] text-gray-800 hover:text-[#FF9900] line-clamp-2 leading-snug font-semibold transition-colors">{product.name}</h3>
                </Link>
                <div className="flex items-center gap-1.5">
                    <GoldStars count={Math.round(rating)} />
                    <span className="text-[10px] text-gray-400 font-medium">({reviews})</span>
                </div>
                <div className="flex items-baseline gap-2 mt-1">
                    <span className="text-base font-black text-gray-900">Rs.&nbsp;{price.toLocaleString()}</span>
                    {discount > 0 && <span className="text-xs text-gray-400 line-through">Rs.&nbsp;{Math.round(originalPrice).toLocaleString()}</span>}
                </div>
                <p className={`text-[10px] font-bold ${inStock ? 'text-emerald-600' : 'text-red-500'}`}>{inStock ? '✓ In Stock · Express Delivery' : '✗ Out of Stock'}</p>
                <div className="mt-auto pt-3">
                    <button onClick={handleAdd} disabled={!inStock}
                        className={`w-full py-2.5 rounded-xl text-xs font-black transition-all flex items-center justify-center gap-2 ${!inStock ? 'bg-gray-100 text-gray-400 cursor-not-allowed' : justAdded ? 'bg-emerald-50 text-emerald-600 border border-emerald-200' : 'bg-[#131921] hover:bg-[#FF9900] text-white active:scale-[0.98]'}`}>
                        {!inStock ? 'Out of Stock' : justAdded ? <><CheckCircle className="h-4 w-4" /> Added!</> : <><ShoppingCart className="h-4 w-4" /> Add to Cart</>}
                    </button>
                </div>
            </div>
        </div>
    );
}

function ProductScroller({ products, onAddToCart }: { products: any[]; onAddToCart: (p: any) => void }) {
    const ref = useRef<HTMLDivElement>(null);
    const scroll = (dir: number) => ref.current?.scrollBy({ left: dir * 280, behavior: 'smooth' });
    return (
        <div className="relative group/scroller -mx-4 px-4">
            <button onClick={() => scroll(-1)} className="absolute left-0 top-1/2 -translate-y-1/2 z-10 w-10 h-20 bg-white/95 shadow-lg rounded-r-xl flex items-center justify-center opacity-0 group-hover/scroller:opacity-100 transition hover:bg-white border-y border-r border-gray-100">
                <ChevronLeft className="h-5 w-5 text-gray-600" />
            </button>
            <div ref={ref} className="flex gap-4 overflow-x-auto pb-2 snap-x snap-mandatory" style={{ scrollbarWidth: 'none' }}>
                {products.map((p, i) => (
                    <div key={p.id || i} className="min-w-[210px] max-w-[210px] snap-start flex-shrink-0">
                        <ProductCard product={p} onAddToCart={onAddToCart} index={i} />
                    </div>
                ))}
            </div>
            <button onClick={() => scroll(1)} className="absolute right-0 top-1/2 -translate-y-1/2 z-10 w-10 h-20 bg-white/95 shadow-lg rounded-l-xl flex items-center justify-center opacity-0 group-hover/scroller:opacity-100 transition hover:bg-white border-y border-l border-gray-100">
                <ChevronRight className="h-5 w-5 text-gray-600" />
            </button>
        </div>
    );
}

// ─── Main Page ─────────────────────────────────────────────────────────────────
export default function Home() {
    const router = useRouter();
    const { addToCart } = useCart();
    const [products, setProducts] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [heroSlide, setHeroSlide] = useState(0);
    const [animating, setAnimating] = useState(false);

    useEffect(() => {
        // Fetch products for B2C shop
        productService.getAll().then(data => {
            const api = Array.isArray(data) ? data : (data as any).results || [];
            setProducts(api);
        }).catch((err) => {
            console.error(err);
        }).finally(() => {
            setLoading(false);
        });
    }, [router]);

    useEffect(() => {
        const t = setInterval(() => {
            setAnimating(true);
            setTimeout(() => { setHeroSlide(s => (s + 1) % HERO_SLIDES.length); setAnimating(false); }, 400);
        }, 6000);
        return () => clearInterval(t);
    }, []);

    const changeSlide = (idx: number) => { setAnimating(true); setTimeout(() => { setHeroSlide(idx); setAnimating(false); }, 300); };
    const handleAddToCart = (p: any) => addToCart({ id: p.id, name: p.name, price: p.price, quantity: 1, image: p.image || '', category: p.category_name || 'Cosmetics' });
    const featured = products.slice(0, 8);
    const slide = HERO_SLIDES[heroSlide];

    return (
        <div className="flex flex-col min-h-screen bg-white font-sans">
            <Navbar />

            <main className="flex-1">
                {/* ════════════════════════ HERO ════════════════════════════ */}
                <div className="relative overflow-hidden bg-gray-950" style={{ minHeight: '90vh' }}>
                    {/* BG */}
                    <div className={`absolute inset-0 transition-opacity duration-700 ${animating ? 'opacity-0' : 'opacity-100'}`}>
                        <img src={slide.img} alt={slide.title} className="w-full h-full object-cover" />
                        <div className="absolute inset-0 bg-gradient-to-r from-black/85 via-black/50 to-black/10" />
                        <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-transparent to-transparent" />
                    </div>

                    {/* Content */}
                    <div className={`relative container mx-auto px-6 lg:px-12 flex flex-col lg:flex-row items-center justify-between min-h-[90vh] py-24 gap-12 transition-all duration-500 ${animating ? 'opacity-0 translate-y-4' : 'opacity-100 translate-y-0'}`}>
                        <div className="flex-1 max-w-xl">
                            <div className="inline-flex items-center gap-2 bg-white/10 backdrop-blur-md border border-white/20 text-white text-[11px] font-black tracking-[0.2em] uppercase px-5 py-2.5 rounded-full mb-8 shadow-xl">
                                <Sparkles className="h-3.5 w-3.5 text-amber-400" /> {slide.badge}
                            </div>
                            <h1 className="text-6xl lg:text-8xl font-black text-white leading-[0.9] mb-5 tracking-tighter">
                                {slide.title} <span className="text-[#FF9900]">{slide.titleAccent}</span>
                            </h1>
                            <p className="text-lg text-white/65 font-medium mb-10 leading-relaxed">{slide.sub}</p>
                            <div className="flex flex-wrap items-center gap-4">
                                <Link href={slide.href} className="inline-flex items-center gap-3 bg-white text-gray-900 px-9 py-4 rounded-2xl font-black text-sm hover:bg-gray-50 transition-all shadow-2xl hover:-translate-y-1 active:scale-95">
                                    {slide.cta} <ArrowRight className="h-4 w-4" />
                                </Link>
                                <Link href="/shop" className="inline-flex items-center gap-3 bg-white/10 backdrop-blur-md border border-white/20 text-white px-9 py-4 rounded-2xl font-black text-sm hover:bg-white/20 transition-all">
                                    Browse All
                                </Link>
                            </div>
                            {/* Social proof */}
                            <div className="mt-12 flex items-center gap-5">
                                <div className="flex -space-x-3">
                                    {["photo-1531746020798-e6953c6e8e04", "photo-1580489944761-15a19d654956", "photo-1494790108377-be9c29b29330", "photo-1534528741775-53994a69daeb"].map((id, i) => (
                                        <img key={i} src={`https://images.unsplash.com/${id}?w=64&auto=format&fit=crop`} className="w-9 h-9 rounded-full border-2 border-white/30 object-cover" alt="" />
                                    ))}
                                </div>
                                <div>
                                    <div className="flex items-center gap-0.5 mb-0.5">
                                        {[...Array(5)].map((_, i) => <Star key={i} className="h-3.5 w-3.5 fill-amber-400 text-amber-400" />)}
                                    </div>
                                    <p className="text-white/60 text-xs">Trusted by <span className="text-white font-bold">10,000+</span> customers</p>
                                </div>
                            </div>
                        </div>

                        {/* Floating sidebar card */}
                        <div className="hidden lg:flex flex-col gap-3 w-72">
                            <div className="bg-white/10 backdrop-blur-xl border border-white/20 rounded-2xl p-5 shadow-2xl">
                                <div className="text-[10px] text-white/50 font-bold uppercase tracking-widest mb-3 flex items-center gap-2">
                                    <TrendingUp className="h-3.5 w-3.5" /> Trending Right Now
                                </div>
                                {products.slice(0, 3).map((p, i) => (
                                    <div key={i} className="flex items-center gap-3 py-3 border-b border-white/10 last:border-0">
                                        <img src={p.image} alt={p.name} className="w-11 h-11 rounded-xl object-cover flex-shrink-0" />
                                        <div className="flex-1 min-w-0">
                                            <p className="text-white text-xs font-bold line-clamp-1">{p.name}</p>
                                            <p className="text-white/60 text-[11px] font-medium">Rs. {p.price.toLocaleString()}</p>
                                        </div>
                                        <ChevronRight className="h-3.5 w-3.5 text-white/40 flex-shrink-0" />
                                    </div>
                                ))}
                            </div>
                            <div className="bg-[#FF9900] rounded-2xl p-4 shadow-xl flex items-center gap-3">
                                <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center flex-shrink-0">
                                    <Zap className="h-5 w-5 text-white fill-white" />
                                </div>
                                <div>
                                    <p className="text-white text-xs font-black">Flash Sale Active!</p>
                                    <p className="text-white/70 text-[10px] font-medium">Up to 50% OFF today only</p>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Slide dots */}
                    <div className="absolute bottom-8 left-1/2 -translate-x-1/2 flex items-center gap-2.5">
                        {HERO_SLIDES.map((_, i) => (
                            <button key={i} onClick={() => changeSlide(i)}
                                className={`rounded-full transition-all duration-500 ${i === heroSlide ? 'w-8 h-2 bg-white' : 'w-2 h-2 bg-white/30 hover:bg-white/60'}`} />
                        ))}
                    </div>

                    {/* Scroll indicator */}
                    <div className="absolute bottom-8 right-8 hidden lg:flex flex-col items-center gap-1.5 text-white/30">
                        <ChevronDown className="h-4 w-4 animate-bounce" />
                        <span className="text-[9px] font-bold tracking-widest uppercase">Scroll</span>
                    </div>
                </div>

                {/* ════════════════ TRUST BAR ════════════════ */}
                <div className="relative z-20 -mt-6 mx-4 lg:mx-auto max-w-5xl mb-4">
                    <div className="bg-white rounded-2xl shadow-[0_16px_48px_rgba(0,0,0,0.10)] border border-gray-100 overflow-hidden">
                        <div className="grid grid-cols-2 lg:grid-cols-4 divide-x divide-y lg:divide-y-0 divide-gray-100">
                            {TRUST.map((t, i) => (
                                <div key={i} className="flex items-center gap-4 p-5 lg:p-6 group hover:bg-gray-50 transition-colors">
                                    <div className={`w-11 h-11 rounded-xl ${t.bg} border ${t.border} flex items-center justify-center ${t.color} flex-shrink-0 group-hover:scale-105 transition-transform`}>{t.icon}</div>
                                    <div>
                                        <p className="font-black text-sm text-gray-900">{t.title}</p>
                                        <p className="text-xs text-gray-500">{t.desc}</p>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>

                {/* ════════════════ SECTIONS ════════════════ */}
                <div className="container mx-auto px-4 lg:px-8 py-16 space-y-20">

                    {/* CATEGORIES */}
                    <div>
                        <SectionHeader eyebrow="Explore By Category" title="Shop Your Style" cta="All Categories" href="/shop" />
                        <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
                            {CATEGORIES.slice(0, 6).map((c, i) => (
                                <Link key={c.name} href={c.href}
                                    className={`relative overflow-hidden rounded-2xl group cursor-pointer ${i === 0 ? 'lg:row-span-2' : ''}`}
                                    style={{ aspectRatio: i === 0 ? 'auto' : '4/3', minHeight: i === 0 ? '420px' : 'auto' }}>
                                    <img src={c.img} alt={c.name} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700" />
                                    <div className="absolute inset-0 bg-gradient-to-t from-black/75 via-black/15 to-transparent" />
                                    <div className="absolute inset-0 bg-[#FF9900]/0 group-hover:bg-[#FF9900]/20 transition-colors duration-500" />
                                    <div className="absolute inset-0 p-5 flex flex-col justify-end">
                                        <span className="text-white/55 text-[10px] font-bold uppercase tracking-widest mb-1">{c.count} Products</span>
                                        <h3 className="text-white font-black text-xl lg:text-2xl tracking-tight">{c.name}</h3>
                                        <div className="flex items-center gap-2 mt-2 opacity-0 group-hover:opacity-100 translate-y-2 group-hover:translate-y-0 transition-all duration-300">
                                            <span className="text-white text-xs font-bold">Shop Now</span>
                                            <ArrowRight className="h-3.5 w-3.5 text-white" />
                                        </div>
                                    </div>
                                </Link>
                            ))}
                        </div>
                    </div>

                    {/* FLASH DEAL BANNER */}
                    <div className="relative bg-gray-950 rounded-3xl overflow-hidden shadow-2xl">
                        <div className="absolute inset-0">
                            <img src="https://images.unsplash.com/photo-1596462502278-27bfdd403348?q=80&w=1200&auto=format&fit=crop" className="w-full h-full object-cover opacity-15" alt="" />
                        </div>
                        <div className="absolute top-0 left-0 w-80 h-80 bg-[#FF9900]/25 rounded-full blur-3xl -translate-x-1/2 -translate-y-1/2" />
                        <div className="absolute bottom-0 right-0 w-72 h-72 bg-violet-500/15 rounded-full blur-3xl translate-x-1/2 translate-y-1/2" />
                        <div className="relative p-10 lg:p-14 flex flex-col lg:flex-row items-center justify-between gap-10">
                            <div className="text-center lg:text-left">
                                <div className="inline-flex items-center gap-2 bg-[#FF9900]/20 border border-[#FF9900]/30 text-[#FF9900] text-[10px] font-black tracking-[0.25em] uppercase px-4 py-2 rounded-full mb-5">
                                    <Zap className="h-3.5 w-3.5 fill-current" /> Flash Sale
                                </div>
                                <h3 className="text-white text-4xl lg:text-6xl font-black tracking-tighter mb-2">Up to <span className="text-[#FF9900]">50%</span> Off</h3>
                                <p className="text-white/45 text-base font-medium max-w-sm">Limited time on premium international cosmetics</p>
                            </div>
                            <div className="flex flex-col items-center lg:items-end gap-7">
                                <div>
                                    <p className="text-white/35 text-[10px] font-bold uppercase tracking-widest mb-3 text-center">Offer Ends In</p>
                                    <CountdownTimer />
                                </div>
                                <Link href="/shop?sort=newest" className="inline-flex items-center gap-3 bg-[#FF9900] hover:bg-[#e68a00] text-white px-10 py-4 rounded-xl font-black text-sm transition-all shadow-xl shadow-[#FF9900]/20 hover:-translate-y-1">
                                    Claim Discount <ArrowRight className="h-4 w-4" />
                                </Link>
                            </div>
                        </div>
                    </div>

                    {/* FEATURED PRODUCTS */}
                    <div>
                        <SectionHeader eyebrow="Staff Favorites" title="Bestselling Products" cta="View all" href="/shop" />
                        {loading ? (
                            <div className="grid grid-cols-2 lg:grid-cols-4 gap-5">
                                {Array.from({ length: 8 }).map((_, i) => (
                                    <div key={i} className="animate-pulse rounded-2xl overflow-hidden bg-gray-50 border border-gray-100">
                                        <div className="aspect-square bg-gray-100" />
                                        <div className="p-4 space-y-2">
                                            <div className="h-3 bg-gray-100 rounded w-3/4" />
                                            <div className="h-3 bg-gray-100 rounded w-1/2" />
                                        </div>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <div className="grid grid-cols-2 lg:grid-cols-4 gap-5">
                                {featured.map((p, i) => (
                                    <ProductCard key={p.id || i} product={p} onAddToCart={handleAddToCart} index={i} />
                                ))}
                            </div>
                        )}
                    </div>

                    {/* SHIPPING */}
                    <div className="grid grid-cols-1 gap-5">
                        {/* Shipping */}
                        <div className="relative bg-gray-950 rounded-3xl p-10 overflow-hidden shadow-xl group min-h-[300px] flex items-center">
                            <div className="absolute inset-0">
                                <img src="https://images.unsplash.com/photo-1607082348824-0a96f2a4b9da?q=80&w=800&auto=format&fit=crop" className="w-full h-full object-cover opacity-10 group-hover:scale-105 transition-transform duration-1000" alt="" />
                            </div>
                            <div className="relative z-10">
                                <div className="w-12 h-12 bg-white/10 border border-white/10 rounded-2xl flex items-center justify-center mb-5">
                                    <Truck className="h-6 w-6 text-white" />
                                </div>
                                <span className="text-[10px] font-black uppercase tracking-[0.25em] text-[#FF9900] mb-2 block">Free Delivery</span>
                                <h3 className="text-3xl font-black text-white tracking-tight mb-2 leading-tight">Express Shipping<br />Nationwide</h3>
                                <p className="text-white/40 font-medium mb-7 text-sm max-w-sm">Free delivery on all orders over Rs. 5,000 anywhere in Pakistan.</p>
                                <Link href="/shop" className="inline-flex items-center gap-2 bg-white text-gray-900 px-7 py-3 rounded-xl font-black text-sm hover:bg-gray-100 transition shadow-lg">
                                    Start Shopping <ArrowRight className="h-4 w-4" />
                                </Link>
                            </div>
                        </div>
                    </div>

                    {/* TRENDING SCROLLER */}
                    {!loading && (
                        <div>
                            <SectionHeader eyebrow="Trending Now" title="Everyone's Talking" cta="See all" href="/shop" />
                            <ProductScroller products={products} onAddToCart={handleAddToCart} />
                        </div>
                    )}

                    {/* STATS */}
                    <div className="bg-gray-950 rounded-3xl overflow-hidden">
                        <div className="relative">
                            <div className="absolute inset-0 opacity-10">
                                <img src="https://images.unsplash.com/photo-1522335789203-aabd1fc54bc9?q=80&w=1200&auto=format&fit=crop" className="w-full h-full object-cover" alt="" />
                            </div>
                            <div className="relative grid grid-cols-2 lg:grid-cols-4 divide-x divide-y lg:divide-y-0 divide-white/10">
                                {STATS.map((s, i) => (
                                    <div key={i} className="flex flex-col items-center gap-3 p-10 lg:p-14 text-center group hover:bg-white/5 transition-colors">
                                        <div className="w-12 h-12 bg-white/10 rounded-2xl flex items-center justify-center text-white group-hover:bg-[#FF9900] transition-colors">
                                            {s.icon}
                                        </div>
                                        <p className="text-4xl lg:text-5xl font-black text-white tracking-tighter">{s.value}</p>
                                        <p className="text-white/40 text-[10px] font-bold uppercase tracking-[0.2em]">{s.label}</p>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>

                    {/* TESTIMONIALS */}
                    <div>
                        <div className="text-center mb-12">
                            <p className="text-[11px] text-[#FF9900] font-black uppercase tracking-[0.3em] mb-3">Real Reviews</p>
                            <h2 className="text-3xl lg:text-4xl font-black text-gray-900 tracking-tight mb-3">Loved by Thousands</h2>
                            <div className="flex items-center justify-center gap-1">
                                {[...Array(5)].map((_, i) => <Star key={i} className="h-4 w-4 fill-amber-400 text-amber-400" />)}
                                <span className="text-gray-500 text-sm font-bold ml-2">4.9 out of 5</span>
                            </div>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                            {TESTIMONIALS.map((t, i) => (
                                <div key={i} className="bg-white rounded-2xl p-7 border border-gray-100 hover:border-[#FF9900]/20 hover:shadow-xl transition-all duration-500 shadow-sm flex flex-col gap-4">
                                    <div className="flex gap-0.5">
                                        {Array.from({ length: 5 }).map((_, j) => (
                                            <Star key={j} className={`h-3.5 w-3.5 ${j < t.rating ? 'text-amber-400 fill-amber-400' : 'text-gray-200 fill-gray-100'}`} />
                                        ))}
                                    </div>
                                    <p className="text-gray-600 font-medium leading-relaxed flex-1 text-sm">&ldquo;{t.text}&rdquo;</p>
                                    <div className="flex items-center gap-3 pt-4 border-t border-gray-100">
                                        <img src={t.img} alt={t.name} className="w-10 h-10 rounded-xl object-cover" />
                                        <div className="flex-1 min-w-0">
                                            <p className="font-black text-gray-900 text-sm">{t.name}</p>
                                            <p className="text-[11px] text-gray-500">{t.role}</p>
                                        </div>
                                        {t.verified && (
                                            <div className="flex items-center gap-1 bg-emerald-50 text-emerald-600 text-[10px] font-bold px-2 py-1 rounded-full">
                                                <CheckCircle className="h-3 w-3" /> Verified
                                            </div>
                                        )}
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* BRANDS */}
                    <div className="text-center">
                        <p className="text-[11px] text-gray-400 font-black uppercase tracking-[0.3em] mb-8">Official Distributor Of</p>
                        <div className="flex flex-wrap justify-center gap-3">
                            {BRANDS.map(b => (
                                <Link key={b} href={`/shop?search=${encodeURIComponent(b)}`}
                                    className="px-6 py-3 bg-gray-50 hover:bg-[#FF9900] border border-gray-200 hover:border-[#FF9900] rounded-xl text-[11px] font-black tracking-widest uppercase text-gray-500 hover:text-white transition-all duration-300 hover:-translate-y-0.5 hover:shadow-md">
                                    {b}
                                </Link>
                            ))}
                        </div>
                    </div>

                    {/* NEWSLETTER */}
                    <div className="relative bg-gradient-to-br from-[#131921] via-[#1a2530] to-[#0f1923] rounded-3xl p-12 lg:p-20 text-center overflow-hidden shadow-2xl">
                        <div className="absolute top-0 right-0 w-72 h-72 bg-white/5 rounded-full translate-x-1/3 -translate-y-1/3" />
                        <div className="absolute bottom-0 left-0 w-56 h-56 bg-white/5 rounded-full -translate-x-1/3 translate-y-1/3" />
                        <div className="relative max-w-lg mx-auto">
                            <div className="w-14 h-14 bg-white/10 rounded-2xl flex items-center justify-center mx-auto mb-7">
                                <Gift className="h-7 w-7 text-white" />
                            </div>
                            <h3 className="text-4xl lg:text-5xl font-black text-white mb-3 tracking-tighter leading-none">Get 15% Off</h3>
                            <p className="text-white/60 text-base font-medium mb-9">Join our list for exclusive deals, early access & beauty tips.</p>
                            <form className="flex flex-col sm:flex-row max-w-md mx-auto gap-3" onSubmit={e => e.preventDefault()}>
                                <input type="email" placeholder="your@email.com"
                                    className="flex-1 px-5 py-3.5 rounded-xl text-sm text-gray-900 outline-none focus:ring-4 focus:ring-white/30 bg-white placeholder:text-gray-400 shadow-lg" />
                                <button type="submit" className="px-7 py-3.5 bg-[#131921] hover:bg-[#FF9900] hover:text-[#131921] text-white font-black rounded-xl text-sm transition shadow-lg hover:-translate-y-0.5 whitespace-nowrap">
                                    Subscribe Free
                                </button>
                            </form>
                            <p className="text-white/35 text-[11px] mt-5">No spam, ever. Unsubscribe anytime.</p>
                        </div>
                    </div>

                </div>
            </main>

            <Footer />
        </div>
    );
}
