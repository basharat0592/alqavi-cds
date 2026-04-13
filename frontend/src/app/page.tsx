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
import { productService, categoryService, mainCategoryService } from "@/lib/api";
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
    const [categories, setCategories] = useState<any[]>([]);
    const [activeCategory, setActiveCategory] = useState<string>('All');
    const [allProducts, setAllProducts] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const { addToCart } = useCart();
    
    const categoryScrollRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const fetchData = async () => {
            try {
                const [subCatData, prodData] = await Promise.all([
                    categoryService.getAll().catch(err => {
                        console.error("Categories fetch failed", err);
                        return [];
                    }),
                    productService.getAll().catch(err => {
                        console.error("Products fetch failed", err);
                        return [];
                    })
                ]);

                // Handle both paginated and flat responses
                const subCats = Array.isArray(subCatData) ? subCatData : (subCatData as any).results || [];
                setCategories(subCats);

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

    useEffect(() => {
        if (HERO_SLIDES.length > 1) {
            const timer = setInterval(() => setCurrentSlide(prev => (prev + 1) % HERO_SLIDES.length), 8000);
            return () => clearInterval(timer);
        }
    }, []);

    const handleAdd = (p: any, qty: number = 1) => {
        addToCart({ 
            id: p.id, 
            name: p.product_name || p.name, 
            price: p.selling_price || p.price, 
            quantity: qty, 
            image: p.image || p.image_url || '', 
            category: p.category_name || 'Food', 
            stock: p.total_quantity || p.quantity_in_stock 
        });
    };

    const filteredProducts = activeCategory === 'All' 
        ? allProducts 
        : allProducts.filter(p => {
            const catName = p.category_name || p.category?.name || '';
            return catName.toLowerCase() === activeCategory.toLowerCase();
        });

    if (loading) return <PageLoader />;

    return (
        <div className="min-h-screen bg-[#F8FAFC] dark:bg-[#0F172A] transition-colors duration-500">
            <Navbar />

            <main className="pb-20">
                {/* ── HERO SECTION ── */}
                <section className="relative h-[40vh] lg:h-[50vh] overflow-hidden bg-[#131921]">
                    <div className="absolute inset-0 flex transition-transform duration-1000 ease-in-out" style={{ transform: `translateX(-${currentSlide * 100}%)` }}>
                        {HERO_SLIDES.map((slide, i) => (
                            <div key={i} className="min-w-full relative h-full">
                                {slide.img && !slide.img.startsWith('http') && (
                                    <img src={slide.img} className="w-full h-full object-cover opacity-60" alt="" onError={(e) => { e.currentTarget.style.display = 'none'; }} />
                                )}
                                <div className="absolute inset-0 flex items-center">
                                    <div className="container mx-auto px-6 lg:px-12">
                                        <div className="max-w-2xl text-white space-y-6 animate-in fade-in slide-in-from-bottom-5 duration-700">
                                            <div className="inline-flex items-center gap-2 px-3 py-1 bg-[#F59E0B]/20 backdrop-blur-md rounded-full border border-[#F59E0B]/20">
                                                <Flame className="h-4 w-4 text-[#F59E0B]" />
                                                <span className="text-[10px] font-bold uppercase tracking-widest text-[#F59E0B]">Freshly Made Just For You</span>
                                            </div>
                                            <h1 className="text-5xl lg:text-7xl font-black tracking-tighter leading-[1.1] drop-shadow-2xl">
                                                {slide.title}
                                            </h1>
                                            <p className="text-lg text-slate-200/90 font-medium leading-relaxed max-w-lg mb-8">
                                                {slide.sub}
                                            </p>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                </section>

                {/* ── STICKY CATEGORY NAV ── */}
                <div id="menu-section" className="sticky top-[64px] z-40 bg-white dark:bg-[#0F172A] border-b border-slate-200 dark:border-white/10 shadow-sm">
                    <div className="container mx-auto px-6 py-4">
                        <div 
                            ref={categoryScrollRef}
                            className="flex items-center gap-3 overflow-x-auto no-scrollbar pb-1 cursor-grab active:cursor-grabbing select-none"
                        >
                            <button
                                onClick={() => setActiveCategory('All')}
                                className={`px-6 py-2.5 rounded-full text-xs font-black uppercase tracking-widest transition-all whitespace-nowrap border ${activeCategory === 'All' ? 'bg-[#F59E0B] border-[#F59E0B] text-white shadow-lg shadow-[#F59E0B]/20' : 'bg-white dark:bg-white/5 border-slate-200 dark:border-white/10 text-slate-500 dark:text-slate-400 hover:border-[#F59E0B]'}`}
                            >
                                All Items
                            </button>
                            {categories.map((cat) => (
                                <button
                                    key={cat.id}
                                    onClick={() => setActiveCategory(cat.name)}
                                    className={`px-6 py-2.5 rounded-full text-xs font-black uppercase tracking-widest transition-all whitespace-nowrap border flex items-center gap-2 ${activeCategory === cat.name ? 'bg-[#F59E0B] border-[#F59E0B] text-white shadow-lg shadow-[#F59E0B]/20' : 'bg-white dark:bg-white/5 border-slate-200 dark:border-white/10 text-slate-500 dark:text-slate-400 hover:border-[#F59E0B]'}`}
                                >
                                    {cat.name}
                                </button>
                            ))}
                        </div>
                    </div>
                </div>

                {/* ── PRODUCT GRID ── */}
                <section className="container mx-auto px-6 py-12">
                    <div className="mb-10 flex flex-col md:flex-row md:items-end justify-between gap-4">
                        <div>
                            <h2 className="text-3xl font-black text-slate-900 dark:text-white uppercase tracking-tighter">
                                {activeCategory === 'All' ? 'Our Full Menu' : activeCategory}
                            </h2>
                            <p className="text-slate-500 dark:text-slate-400 text-sm font-medium mt-1">
                                {filteredProducts.length} items available
                            </p>
                        </div>
                        <div className="flex items-center gap-3">
                            <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Displaying Database Menu</span>
                        </div>
                    </div>

                    {filteredProducts.length === 0 ? (
                        <div className="py-20 text-center">
                            <div className="w-20 h-20 bg-slate-100 dark:bg-white/5 rounded-3xl flex items-center justify-center mx-auto mb-6 text-slate-300">
                                <UtensilsCrossed className="h-10 w-10" />
                            </div>
                            <h3 className="text-xl font-bold text-slate-900 dark:text-white">Empty Category</h3>
                            <p className="text-slate-500 mt-2">No products are currently assigned to this category.</p>
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                            {filteredProducts.map(p => (
                                <ProductCard
                                    key={p.id}
                                    id={String(p.id)}
                                    title={p.product_name || p.name}
                                    description={p.description || "Fresh dish from our kitchen."}
                                    image={getImageUrl(p.image || p.image_url) || undefined}
                                    price={parseFloat(p.selling_price || p.price || 0)}
                                    category={p.category_name || 'Food'}
                                    batch={p.batch}
                                    badge={p.badge}
                                    stock={p.total_quantity || p.quantity_in_stock}
                                    onAddToCart={(qty) => handleAdd(p, qty)}
                                />
                            ))}
                        </div>
                    )}
                </section>

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
