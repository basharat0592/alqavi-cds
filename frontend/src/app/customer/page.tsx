'use client';

import PageLoader from '@/components/ui/PageLoader';
import Link from "next/link";
import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import {
    ArrowRight, ChevronRight, ChevronLeft, Star, ShoppingCart,
    Search, MapPin, Phone, MessageCircle, UtensilsCrossed,
    Flame, Soup, Pizza, Coffee, Menu, X, Plus, Minus, Package,
    Truck, ShieldCheck, Clock, CreditCard, Check, Quote
} from "lucide-react";
import Navbar from "@/components/layout/Navbar";
import Footer from "@/components/layout/Footer";
import { useCart } from "@/context/CartContext";
import { getImageUrl, cn } from "@/lib/utils";
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
    const [openFaq, setOpenFaq] = useState<number | null>(null);
    const [maxItems, setMaxItems] = useState(12);

    useEffect(() => {
        const updateMax = () => {
            if (window.innerWidth >= 1536) setMaxItems(12); // 6 cols
            else if (window.innerWidth >= 1280) setMaxItems(10); // 5 cols
            else if (window.innerWidth >= 1024) setMaxItems(8); // 4 cols
            else setMaxItems(4); // 2 cols
        };
        updateMax();
        window.addEventListener('resize', updateMax);
        return () => window.removeEventListener('resize', updateMax);
    }, []);

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

    const filtered = (() => {
        const raw = activeCategory === 'All'
            ? allProducts
            : allProducts.filter(p => p.category_name === activeCategory || p.category?.name === activeCategory);
        
        // Group by name and price to avoid showing same product multiple times
        const groups = new Map();
        raw.forEach(p => {
            const name = (p.product_name || p.name || '').toLowerCase().trim();
            const price = parseFloat(p.selling_price || p.price || 0);
            const key = `${name}_${price}`;
            
            if (!groups.has(key)) {
                groups.set(key, p);
            } else {
                // If the new record has an image and the existing one doesn't, swap it
                const existing = groups.get(key);
                if ((p.image || p.catalog_image) && !(existing.image || existing.catalog_image)) {
                    groups.set(key, p);
                }
            }
        });
        return Array.from(groups.values());
    })();

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
    const activeSections = sections.filter(s => s.is_visible !== false).sort((a, b) => (a.position || 0) - (b.position || 0));

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
                                    <div className="w-full px-4 md:px-8 lg:px-12 flex flex-col lg:flex-row lg:items-center justify-between gap-12">
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
                                                href="/customer/shop"
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

                <section className="sticky top-[64px] z-40 bg-white border-b border-slate-200">
                    <div className="w-full px-4 md:px-8 lg:px-12 py-4">
                        <div className="flex items-center gap-3 overflow-x-auto no-scrollbar">
                            <button
                                onClick={() => setActiveCategory('All')}
                                className={cn(
                                    "px-5 py-2 rounded-full text-[13px] font-bold transition-all shrink-0",
                                    activeCategory === 'All'
                                        ? "bg-[#111] text-white"
                                        : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                                )}
                            >
                                All Items
                            </button>
                            {categories.map((cat) => (
                                <button
                                    key={cat.id}
                                    onClick={() => setActiveCategory(cat.name)}
                                    className={cn(
                                        "px-5 py-2 rounded-full text-[13px] font-bold transition-all shrink-0 border",
                                        activeCategory === cat.name
                                            ? "bg-[#F59E0B] border-[#F59E0B] text-white"
                                            : "bg-white border-slate-200 text-slate-600 hover:border-slate-300 hover:bg-slate-50"
                                    )}
                                >
                                    {cat.name}
                                </button>
                            ))}
                        </div>
                    </div>
                </section>

                {/* ── 4. PRODUCT CONTENT ── */}
                <div className="w-full px-4 md:px-8 lg:px-12 py-4">
                    <div className="animate-in fade-in duration-500">
                        <div className="mb-4 flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-100 pb-3">
                            <div>
                                <h2 className="text-3xl font-black text-slate-900 tracking-tight">
                                    {activeCategory === 'All' ? "Full Collection" : activeCategory}
                                </h2>
                                <p className="text-sm text-slate-500 mt-2 font-medium">
                                    Showing <span className="text-[#111] font-bold">{filtered.length}</span> premium products
                                </p>
                            </div>
                                <div className="flex flex-col items-end gap-2 -mt-4">
                                    <Link 
                                        href="/customer/shop" 
                                        className="flex items-center gap-1 text-[13px] font-bold text-[#F59E0B] hover:text-[#e69008] transition-colors"
                                    >
                                        View All <ArrowRight size={14} />
                                    </Link>
                                    <div className="hidden md:flex items-center gap-2 text-[10px] text-slate-400 font-bold uppercase tracking-widest">
                                        <span className="flex items-center gap-1"><Package size={12} /> Global Inventory</span>
                                        <span className="w-1 h-1 bg-slate-300 rounded-full"></span>
                                        <span>No Filters Applied</span>
                                    </div>
                                </div>
                        </div>

                        {filtered.length > 0 ? (
                            <div className="grid grid-cols-2 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6 gap-6">
                                {filtered.slice(0, maxItems).map((p: any) => (
                                    <ProductCard
                                        key={p.id}
                                        id={String(p.id)}
                                        title={p.product_name || p.name}
                                        description={p.description}
                                        image={getImageUrl(p.image || p.catalog_image || p.image_url) || undefined}
                                        price={parseFloat(p.selling_price || p.price || 0)}
                                        category={p.category_name || 'Cosmetics'}
                                        batch={p.batch}
                                        badge={p.badge}
                                        weight={p.weight}
                                        size={p.size}
                                        stock={p.total_quantity || p.quantity_in_stock}
                                        onAddToCart={(qty) => handleAdd(p, qty)}
                                    />
                                ))}
                            </div>
                        ) : (
                            <div className="py-32 text-center bg-white rounded-[32px] border-2 border-dashed border-slate-100">
                                <Package size={48} className="mx-auto text-slate-200 mb-4" />
                                <h3 className="text-xl font-bold text-slate-400">Inventory update in progress.</h3>
                                <p className="text-sm text-slate-500 mt-2">Please check back shortly for new arrivals.</p>
                            </div>
                        )}
                    </div>

                    {/* ── 5. TESTIMONIALS ── */}
                    <section className="mt-32">
                        <div className="text-center mb-16">
                            <h2 className="text-2xl lg:text-3xl font-black text-slate-900 uppercase tracking-tight">What Our Customers Say</h2>
                            <div className="w-12 h-1 bg-[#F59E0B] mx-auto mt-4 rounded-full" />
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                            {[
                                { name: "Ayesha Khan", role: "Verified Customer", text: "The quality of the products is amazing. I've been using their skincare line for 3 months and the results are visible!" },
                                { name: "Sarah Ahmed", role: "Professional Makeup Artist", text: "As a professional, I need reliable distributors. Al-Qavi always delivers authentic products on time." },
                                { name: "Zainab Malik", role: "Frequent Buyer", text: "Best customer service in Pakistan! Their WhatsApp support helped me choose the right foundation shade perfectly." }
                            ].map((item, idx) => (
                                <div key={idx} className="bg-white p-8 rounded-2xl border border-slate-200 shadow-sm relative group hover:border-[#F59E0B] transition-all">
                                    <Quote className="absolute top-6 right-6 text-slate-100 group-hover:text-[#F59E0B]/10 transition-colors" size={40} />
                                    <p className="text-slate-600 mb-6 font-medium relative z-10 italic">"{item.text}"</p>
                                    <div className="flex items-center gap-4">
                                        <div className="w-10 h-10 rounded-full bg-slate-100 border border-slate-200 flex items-center justify-center font-bold text-[#F59E0B]">{item.name[0]}</div>
                                        <div>
                                            <h5 className="text-sm font-black text-slate-900">{item.name}</h5>
                                            <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">{item.role}</p>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </section>
                    {/* ── 6 + 7 FAQ & NEWSLETTER ── */}

                    <section className="mt-28">
                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-start">

                            {/* ── LEFT : FAQ SECTION ── */}
                            <div className="bg-white rounded-3xl border border-slate-200 p-8 shadow-sm">
                                <div className="mb-10">
                                    <span className="inline-block px-4 py-2 text-xs font-semibold tracking-[0.2em] uppercase rounded-full bg-slate-100 text-slate-600 mb-4">
                                        FAQ
                                    </span>

                                    <h2 className="text-3xl font-bold text-slate-900 mb-3">
                                        Common Questions
                                    </h2>

                                    <p className="text-slate-500">
                                        Everything you need to know about shopping with Al-Qavi.
                                    </p>
                                </div>

                                <div className="space-y-4">
                                    {[
                                        {
                                            q: "Are your products 100% authentic?",
                                            a: "Yes, we source all products directly from authorized distributors and trusted manufacturers."
                                        },
                                        {
                                            q: "How long does delivery take?",
                                            a: "Major cities usually take 2-3 business days. Remote areas may take 4-5 business days."
                                        },
                                        {
                                            q: "Do you offer cash on delivery?",
                                            a: "Yes, Cash on Delivery is available across Pakistan."
                                        }
                                    ].map((faq, idx) => (
                                        <div
                                            key={idx}
                                            className="rounded-2xl border border-slate-200 overflow-hidden"
                                        >
                                            {/* Question */}
                                            <button
                                                onClick={() =>
                                                    setOpenFaq(openFaq === idx ? null : idx)
                                                }
                                                className="w-full px-5 py-4 flex items-center justify-between bg-slate-50 hover:bg-slate-100 transition-all"
                                            >
                                                <span className="font-semibold text-slate-800 text-sm text-left">
                                                    {faq.q}
                                                </span>

                                                <Plus
                                                    size={16}
                                                    className={`text-slate-400 transition-transform duration-300 ${openFaq === idx ? "rotate-45" : ""
                                                        }`}
                                                />
                                            </button>

                                            {/* Answer */}
                                            <div
                                                className={`grid transition-all duration-300 ${openFaq === idx
                                                    ? "grid-rows-[1fr] opacity-100"
                                                    : "grid-rows-[0fr] opacity-0"
                                                    }`}
                                            >
                                                <div className="overflow-hidden">
                                                    <div className="px-5 py-4 text-sm text-slate-600 leading-relaxed border-t border-slate-100">
                                                        {faq.a}
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            {/* ── RIGHT : NEWSLETTER ── */}
                            <div className="relative overflow-hidden rounded-3xl bg-[#111] p-8 lg:p-10 shadow-xl">
                                <div className="absolute top-0 right-0 h-40 w-40 bg-[#F59E0B]/10 blur-3xl rounded-full" />
                                <div className="absolute bottom-0 left-0 h-32 w-32 bg-white/5 blur-3xl rounded-full" />

                                <div className="relative z-10">
                                    <span className="inline-block px-4 py-2 text-xs font-semibold tracking-[0.2em] uppercase rounded-full bg-[#F59E0B]/10 text-[#F59E0B] border border-[#F59E0B]/20 mb-5">
                                        Newsletter
                                    </span>

                                    <h2 className="text-3xl font-bold text-white leading-tight mb-4">
                                        Stay Updated With Latest Offers
                                    </h2>

                                    <p className="text-slate-400 mb-8 leading-relaxed">
                                        Subscribe to receive discounts, beauty tips, and new arrivals directly in your inbox.
                                    </p>

                                    <div className="space-y-4">
                                        <input
                                            type="email"
                                            placeholder="Enter your email address"
                                            className="w-full px-5 py-4 rounded-2xl bg-white/5 border border-white/10 text-white placeholder:text-slate-500 focus:outline-none focus:border-[#F59E0B]"
                                        />

                                        <button className="w-full px-6 py-4 bg-[#F59E0B] hover:bg-[#e69008] text-white rounded-2xl font-semibold transition-all duration-300 active:scale-95">
                                            Subscribe Now
                                        </button>
                                    </div>

                                    <p className="mt-4 text-sm text-slate-500">
                                        No spam. Only useful updates.
                                    </p>
                                </div>
                            </div>

                        </div>
                    </section>

                </div>

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
            {/* ── 3. BRAND LOGOS (CONTINUOUS MARQUEE) ── */}
            <section className="bg-white border-b border-slate-100 overflow-hidden py-12 relative">
                <style dangerouslySetInnerHTML={{
                    __html: `
                        @keyframes marquee-scroll {
                            0% { transform: translateX(0); }
                            100% { transform: translateX(-33.33%); }
                        }
                        .marquee-inner {
                            display: flex;
                            width: max-content;
                            animation: marquee-scroll 40s linear infinite;
                        }
                        .marquee-inner:hover {
                            animation-play-state: paused;
                        }
                    `}} />

                <div className="relative flex">
                    <div className="marquee-inner whitespace-nowrap">
                        {[1, 2, 3].map((loop) => (
                            <div key={loop} className="flex items-center gap-24 px-12">
                                <div className="flex flex-col items-center gap-1 group cursor-default">
                                    <span className="text-2xl font-black tracking-tighter text-[#111] border-b-4 border-[#A38B5D] transition-colors group-hover:text-[#A38B5D]">L'OREAL</span>
                                    <span className="text-[10px] font-black text-[#A38B5D] uppercase tracking-[0.3em]">PARIS</span>
                                </div>
                                <div className="flex flex-col items-center gap-1 group cursor-default">
                                    <span className="text-2xl font-black tracking-tighter text-[#000] transition-colors group-hover:text-slate-600">MAYBELLINE</span>
                                    <span className="text-[10px] font-black text-[#111] uppercase tracking-[0.3em]">NEW YORK</span>
                                </div>
                                <div className="flex flex-col items-center gap-1 group cursor-default">
                                    <span className="text-2xl font-black tracking-tighter text-[#C20000] transition-transform group-hover:scale-105">REVLON</span>
                                    <div className="h-1 w-full bg-[#C20000]" />
                                </div>
                                <div className="flex flex-col items-center gap-1 group cursor-default">
                                    <div className="bg-[#0032A0] px-5 py-1.5 rounded-sm transition-all group-hover:bg-[#002880] shadow-sm">
                                        <span className="text-2xl font-black tracking-tighter text-white">NIVEA</span>
                                    </div>
                                </div>
                                <div className="flex flex-col items-center gap-1 group cursor-default">
                                    <span className="text-2xl font-bold tracking-tight text-[#003E7E] transition-colors group-hover:text-[#002d5c]">Dove</span>
                                    <div className="h-0.5 w-10 bg-[#E7BC71] group-hover:w-full transition-all" />
                                </div>
                                <div className="flex flex-col items-center gap-1 group cursor-default">
                                    <span className="text-2xl font-black tracking-tighter text-[#111] transition-colors group-hover:text-[#BFA885]">PANTENE</span>
                                    <span className="text-[10px] font-black text-[#BFA885] uppercase tracking-[0.3em]">PRO-V</span>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </section>
            <br />
            <br />
            <Footer />
        </div>
    );
}
