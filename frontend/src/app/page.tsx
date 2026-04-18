'use client';

import PageLoader from '@/components/ui/PageLoader';
import Link from "next/link";
import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import {
    ArrowRight, ChevronRight, ChevronLeft, Star, ShoppingCart,
    Search, MapPin, Phone, MessageCircle, UtensilsCrossed,
    Flame, Soup, Pizza, Coffee, Menu, X, Plus, Minus
} from "lucide-react";
import Navbar from "@/components/layout/Navbar";
import Footer from "@/components/layout/Footer";
import { useCart } from "@/context/CartContext";
import { getImageUrl } from "@/lib/utils";
import { productService, categoryService, sectionService } from "@/lib/api";
import ProductCard from "@/components/ui/ProductCard";

const HERO_SLIDES = [
    {
        title: "Al-Qavi Cosmetic Shop",
        sub: "Discover the secret to radiant skin with our premium cosmetic collections. Quality beauty products curated just for you.",
        cta: "Explore Our Shop",
        href: "#menu-section",
        img: "/images/hero.png",
    }
];

export default function Home() {
    const [currentSlide, setCurrentSlide] = useState(0);
    const [sections, setSections] = useState<any[]>([]);
    const [categories, setCategories] = useState<any[]>([]);
    const [allProducts, setAllProducts] = useState<any[]>([]);
    const [activeCategory, setActiveCategory] = useState('All');
    const [loading, setLoading] = useState(true);
    const { addToCart } = useCart();
    
    useEffect(() => {
        const fetchData = async () => {
            try {
                const [sectionData, catData, prodData] = await Promise.all([
                    sectionService.getAll().catch(() => []),
                    categoryService.getAll().catch(() => []),
                    productService.getAll().catch(() => [])
                ]);

                setSections(Array.isArray(sectionData) ? sectionData : (sectionData as any).results || []);
                setCategories(Array.isArray(catData) ? catData : (catData as any).results || []);
                
                const prods = Array.isArray(prodData) ? prodData : (prodData as any).results || [];
                setAllProducts(prods);
            } catch (error) {
                console.error("Home page data initialization error", error);
            } finally {
                setLoading(false);
            }
        };

        fetchData();
    }, []);

    const filtered = activeCategory === 'All' 
        ? allProducts 
        : allProducts.filter(p => p.category_name === activeCategory || p.category?.name === activeCategory);

    const handleAdd = (p: any, qty: number = 1) => {
        addToCart({ 
            id: p.id, 
            name: p.product_name || p.name, 
            price: p.selling_price || p.price, 
            quantity: qty, 
            image: p.image || p.image_url || '', 
            category: p.category_name || 'Cosmetics', 
            stock: p.total_quantity || p.quantity_in_stock 
        });
    };

    if (loading) return <PageLoader />;

    // Filter sections that are marked visible
    const activeSections = sections.filter(s => s.is_visible !== false).sort((a,b) => (a.position || 0) - (b.position || 0));

    return (
        <div className="min-h-screen bg-[#F8FAFC] dark:bg-[#0F172A] transition-colors duration-500">
            <Navbar />

            <main className="pb-20">
                {/* ── HERO SECTION ── */}
                <section className="relative h-[40vh] lg:h-[60vh] overflow-hidden bg-[#131921]">
                    <div className="absolute inset-0 flex transition-transform duration-1000 ease-in-out" style={{ transform: `translateX(-${currentSlide * 100}%)` }}>
                        {HERO_SLIDES.map((slide, i) => (
                            <div key={i} className="min-w-full relative h-full">
                                <img src={slide.img} className="w-full h-full object-cover opacity-50" alt="" />
                                <div className="absolute inset-0 flex items-center">
                                    <div className="container mx-auto px-6 lg:px-12 flex flex-col lg:flex-row lg:items-center justify-between gap-12">
                                        <div className="max-w-2xl text-left text-white space-y-6 animate-in fade-in slide-in-from-bottom-5 duration-700">
                                            <div className="inline-flex items-center gap-2 px-3 py-1 bg-[#F59E0B]/20 backdrop-blur-md rounded-full border border-[#F59E0B]/20">
                                                <Flame className="h-4 w-4 text-[#F59E0B]" />
                                                <span className="text-[10px] font-bold uppercase tracking-widest text-[#F59E0B]">Premium Beauty Collections</span>
                                            </div>
                                            <h1 className="text-5xl lg:text-7xl font-black tracking-tighter leading-[1.1] drop-shadow-2xl">
                                                {slide.title}
                                            </h1>
                                            <p className="text-lg text-slate-200/90 font-medium leading-relaxed max-w-lg mb-0 text-left">
                                                {slide.sub}
                                            </p>
                                        </div>

                                        <div className="flex flex-wrap lg:flex-col gap-4 items-center lg:items-end animate-in fade-in slide-in-from-right-5 duration-700 shrink-0">
                                            <Link 
                                                href="/shop" 
                                                className="px-8 py-4 bg-[#F59E0B] hover:bg-[#F59E0B] text-white rounded-lg text-sm font-black uppercase tracking-widest transition-all shadow-2xl shadow-[#F59E0B]/20 flex items-center gap-3 active:scale-95 group/btn"
                                            >
                                                Explore Shop
                                                <ArrowRight className="h-5 w-5 transition-transform group-hover/btn:translate-x-1" />
                                            </Link>
                                            <button 
                                                onClick={() => window.scrollTo({ top: window.innerHeight, behavior: 'smooth' })}
                                                className="px-8 py-4 bg-white/10 backdrop-blur-md hover:bg-white/20 text-white border border-white/20 rounded-lg text-sm font-black uppercase tracking-widest transition-all active:scale-95 shadow-xl"
                                            >
                                                View Collections
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                </section>

                {/* ── CATEGORIES ROW ── */}
                <section className="bg-white dark:bg-[#0F172A] border-b border-slate-200 dark:border-white/5 sticky top-[64px] z-40 shadow-sm">
                    <div className="container mx-auto px-6 py-4">
                        <div className="flex items-center gap-4 overflow-x-auto no-scrollbar">
                            <button 
                                onClick={() => setActiveCategory('All')}
                                className={`px-6 py-2 rounded-full text-xs font-black uppercase tracking-widest shadow-md flex-shrink-0 transition-all ${activeCategory === 'All' ? 'bg-[#F59E0B] text-white' : 'bg-slate-100 dark:bg-white/5 text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-white/10'}`}
                            >
                                All Items
                            </button>
                            {categories.map((cat) => (
                                <button 
                                    key={cat.id} 
                                    onClick={() => setActiveCategory(cat.name)}
                                    className={`px-6 py-2 rounded-full text-xs font-black uppercase tracking-widest transition-all flex-shrink-0 border ${activeCategory === cat.name ? 'bg-[#F59E0B] border-[#F59E0B] text-white shadow-md' : 'bg-slate-100 dark:bg-white/5 border-slate-200 dark:border-white/10 text-slate-600 dark:text-slate-400 hover:border-[#F59E0B] hover:text-[#F59E0B]'}`}
                                >
                                    {cat.name}
                                </button>
                            ))}
                        </div>
                    </div>
                </section>

                {/* ── DYNAMIC CONTENT ── */}
                {activeCategory !== 'All' ? (
                    <section className="container mx-auto px-6 py-16 animate-in fade-in duration-700">
                        <div className="mb-12">
                            <h2 className="text-[32px] font-black text-slate-900 dark:text-white uppercase tracking-tighter leading-tight">
                                {activeCategory}
                            </h2>
                            <p className="text-slate-500 dark:text-slate-400 text-lg mt-2">
                                Showing {filtered.length} products in this category
                            </p>
                            <div className="w-16 h-1 bg-[#F59E0B] mt-4 rounded-full" />
                        </div>

                        {filtered.length > 0 ? (
                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-8">
                                {filtered.map((p: any) => (
                                    <ProductCard
                                        key={p.id}
                                        id={String(p.id)}
                                        title={p.product_name || p.name}
                                        description={p.description || "Premium quality beauty product."}
                                        image={getImageUrl(p.image || p.image_url) || undefined}
                                        price={parseFloat(p.selling_price || p.price || 0)}
                                        category={p.category_name || 'Cosmetics'}
                                        batch={p.batch}
                                        badge={p.badge}
                                        stock={p.total_quantity || p.quantity_in_stock}
                                        onAddToCart={(qty) => handleAdd(p, qty)}
                                    />
                                ))}
                            </div>
                        ) : (
                            <div className="py-20 text-center">
                                <h3 className="text-xl font-bold text-slate-400">No products found in this category.</h3>
                            </div>
                        )}
                    </section>
                ) : (
                    <>
                        {/* ── 1. CURATED SECTIONS (MAIN CATEGORIES) ── */}
                        {activeSections.map((section, idx) => {
                            const sectionProducts = section.product_details || [];
                            if (sectionProducts.length === 0) return null;

                            return (
                                <section 
                                    key={`section-${section.id}`} 
                                    className={`py-20 border-b border-slate-100 dark:border-white/5 ${idx % 2 === 1 ? 'bg-slate-50/50 dark:bg-white/[0.02]' : 'bg-white dark:bg-[#0F172A]'}`}
                                >
                                    <div className="container mx-auto px-6">
                                        <div className="mb-12">
                                            <h2 className="text-[32px] font-black text-slate-900 dark:text-white uppercase tracking-tighter leading-tight">
                                                {section.name}
                                            </h2>
                                            {section.description && (
                                                <p className="text-slate-500 dark:text-slate-400 text-lg mt-2 max-w-3xl">
                                                    {section.description}
                                                </p>
                                            )}
                                            <div className="w-16 h-1 bg-[#F59E0B] mt-4 rounded-full" />
                                        </div>

                                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-8">
                                            {sectionProducts.slice(0, 8).map((p: any) => (
                                                <ProductCard
                                                    key={p.id}
                                                    id={String(p.id)}
                                                    title={p.product_name || p.name}
                                                    description={p.description || "Premium quality beauty product."}
                                                    image={getImageUrl(p.image || p.image_url) || undefined}
                                                    price={parseFloat(p.selling_price || p.price || 0)}
                                                    category={p.category_name || 'Cosmetics'}
                                                    batch={p.batch}
                                                    badge={p.badge}
                                                    stock={p.total_quantity || p.quantity_in_stock}
                                                    onAddToCart={(qty) => handleAdd(p, qty)}
                                                />
                                            ))}
                                        </div>
                                    </div>
                                </section>
                            );
                        })}

                        {/* ── 2. INDIVIDUAL CATEGORY GALLERIES (ONE AFTER ANOTHER) ── */}
                        {categories.map((cat, idx) => {
                            const catProducts = allProducts.filter(p => p.category_name === cat.name || p.category?.name === cat.name);
                            if (catProducts.length === 0) return null;

                            return (
                                <section 
                                    key={`cat-${cat.id}`} 
                                    className={`py-20 border-b border-slate-100 dark:border-white/5 last:border-0 ${idx % 2 === 0 ? 'bg-slate-50/50 dark:bg-white/[0.02]' : 'bg-white dark:bg-[#0F172A]'}`}
                                >
                                    <div className="container mx-auto px-6">
                                        <div className="mb-12">
                                            <h2 className="text-[32px] font-black text-slate-900 dark:text-white uppercase tracking-tighter leading-tight">
                                                {cat.name}
                                            </h2>
                                            <p className="text-slate-500 dark:text-slate-400 text-lg mt-2">
                                                Discover our full range of {cat.name.toLowerCase()}
                                            </p>
                                            <div className="w-16 h-1 bg-[#F59E0B] mt-4 rounded-full" />
                                        </div>

                                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-8">
                                            {catProducts.slice(0, 4).map((p: any) => (
                                                <ProductCard
                                                    key={p.id}
                                                    id={String(p.id)}
                                                    title={p.product_name || p.name}
                                                    description={p.description || "Premium quality beauty product."}
                                                    image={getImageUrl(p.image || p.image_url) || undefined}
                                                    price={parseFloat(p.selling_price || p.price || 0)}
                                                    category={p.category_name || 'Cosmetics'}
                                                    batch={p.batch}
                                                    badge={p.badge}
                                                    stock={p.total_quantity || p.quantity_in_stock}
                                                    onAddToCart={(qty) => handleAdd(p, qty)}
                                                />
                                            ))}
                                        </div>
                                        <div className="mt-12 text-center">
                                            <button 
                                                onClick={() => { setActiveCategory(cat.name); window.scrollTo({ top: 400, behavior: 'smooth' }); }}
                                                className="px-8 py-3 bg-white dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-lg text-xs font-black uppercase tracking-widest text-slate-600 dark:text-slate-400 hover:border-[#F59E0B] hover:text-[#F59E0B] transition-all"
                                            >
                                                View All {cat.name}
                                            </button>
                                        </div>
                                    </div>
                                </section>
                            );
                        })}
                    </>
                )}

                {/* ── WHATSAPP FLOATING BUTTON ── */}
                <a 
                    href="https://wa.me/03105855299?text=Hello!%20I'd%20like%20to%20order%20from%20Al-Qavi%20Cosmetic%20Shop."
                    target="_blank"
                    rel="noopener noreferrer"
                    className="fixed bottom-8 right-8 z-[100] bg-[#25D366] hover:bg-[#128C7E] text-white p-4 rounded-full shadow-2xl transition-all hover:scale-110 active:scale-95 group"
                    title="Order on WhatsApp"
                >
                    <MessageCircle className="h-6 w-6 font-bold" />
                    <span className="absolute right-full mr-4 top-1/2 -translate-y-1/2 px-4 py-2 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-xs font-bold rounded-xl shadow-xl opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none">
                        Order on WhatsApp
                    </span>
                </a>
            </main>

            <Footer />
        </div>
    );
}
