'use client';

import PageLoader from '@/components/ui/PageLoader';
import Link from "next/link";
import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import {
    ArrowRight, ChevronRight, ChevronLeft, Star, ShoppingCart,
    Search, MapPin, Phone, MessageCircle, UtensilsCrossed,
    Flame, Soup, Pizza, Coffee, Menu, X, Plus, Minus, Package,
    Truck, ShieldCheck, Clock, CreditCard, Check, Quote, AlertTriangle
} from "lucide-react";
import Navbar from "@/components/layout/Navbar";
import Footer from "@/components/layout/Footer";
import { useCart } from "@/context/CartContext";
import { getImageUrl, cn } from "@/lib/utils";
import { productService, categoryService } from "@/lib/api";
import cmsService from "@/services/cms.service";
import ProductCard from "@/components/ui/ProductCard";
import Hero from "@/components/ui/Hero";

export default function Home() {
    const [sections, setSections] = useState<any[]>([]);
    const [settings, setSettings] = useState<any>(null);
    const [categories, setCategories] = useState<any[]>([]);
    const [allProducts, setAllProducts] = useState<any[]>([]);
    const [activeCategory, setActiveCategory] = useState('All');
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const { addToCart } = useCart();
    const [openFaq, setOpenFaq] = useState<number | null>(null);
    const [maxItems, setMaxItems] = useState(12);

    useEffect(() => {
        const updateMax = () => {
            if (window.innerWidth >= 1536) setMaxItems(24);
            else if (window.innerWidth >= 1280) setMaxItems(20);
            else if (window.innerWidth >= 1024) setMaxItems(16);
            else setMaxItems(8);
        };
        updateMax();
        window.addEventListener('resize', updateMax);
        return () => window.removeEventListener('resize', updateMax);
    }, []);

    useEffect(() => {
        const fetchData = async () => {
            try {
                // 1. Get CMS Data (Public)
                const cmsData = await cmsService.getFullState().catch(err => {
                    console.error("CMS Load Failed", err);
                    return { sections: [], settings: null };
                });
                
                setSections(cmsData.sections || []);
                setSettings(cmsData.settings || null);

                // 2. Get Catalog Data
                const [catData, prodData] = await Promise.all([
                    categoryService.getAll().catch(() => []),
                    productService.getAll({ no_pagination: 'true' }).catch(() => [])
                ]);

                setCategories(Array.isArray(catData) ? catData : (catData as any).results || []);
                const prods = Array.isArray(prodData) ? prodData : (prodData as any).results || [];
                setAllProducts(prods);
            } catch (error: any) {
                console.error("Home page data initialization error", error);
                setError(error.message || "Connection Error");
            } finally {
                setLoading(false);
            }
        };

        fetchData();
    }, []);

    const filtered = (() => {
        const raw = activeCategory === 'All'
            ? allProducts
            : allProducts.filter(p => {
                const target = activeCategory.toLowerCase().trim();
                const name1 = (p.category_name || '').toLowerCase().trim();
                const name2 = (p.category?.name || '').toLowerCase().trim();
                return name1 === target || name2 === target;
            });

        const groups = new Map();
        raw.forEach(p => {
            const name = (p.product_name || p.name || '').toLowerCase().trim();
            const price = parseFloat(p.selling_price || p.price || 0);
            const key = `${name}_${price}`;
            if (!groups.has(key)) groups.set(key, p);
        });
        return Array.from(groups.values());
    })();

    const handleAdd = (p: any, qty: number = 1) => {
        const finalImage = p.image || p.catalog_image || p.image_url || '';
        addToCart({
            id: String(p.id),
            name: p.product_name || p.name,
            price: p.selling_price || p.price,
            quantity: qty,
            image: finalImage,
            category: p.category_name || 'Cosmetics',
            stock: p.total_quantity || p.quantity_in_stock
        });
    };

    if (loading) return <PageLoader />;

    // Use 'order' field from database and 'is_visible' boolean
    const activeSections = sections
        .filter(s => s.is_visible)
        .sort((a, b) => (a.order || 0) - (b.order || 0));

    return (
        <div className="min-h-screen bg-[#F8FAFC] dark:bg-[#0F172A] transition-colors duration-500">
            <Navbar settings={settings} />
            
            <main className="pb-20">
                {activeSections.map((section) => {
                    const content = section.content || {};
                    
                    switch (section.section_type) {
                        case 'hero':
                            return <Hero key={section.id} slides={content.slides} />;
                        
                        case 'categories':
                            return (
                                <section key={section.id} className="sticky top-[64px] z-40 bg-white/80 backdrop-blur-md border-b border-slate-100">
                                    <div className="w-full px-4 md:px-8 lg:px-12 py-5">
                                        <div className="flex items-center gap-3 overflow-x-auto no-scrollbar">
                                            <button
                                                onClick={() => setActiveCategory('All')}
                                                className={cn(
                                                    "px-6 py-2.5 rounded-full text-[11px] font-black uppercase tracking-[0.15em] transition-all shrink-0 border",
                                                    activeCategory === 'All'
                                                        ? "bg-[#111] border-[#111] text-white shadow-lg shadow-black/10"
                                                        : "bg-white border-slate-200 text-slate-500 hover:bg-slate-50 hover:border-slate-300"
                                                )}
                                            >
                                                All Items
                                            </button>
                                            {((content.items && content.items.length > 0) ? content.items : categories).map((cat: any) => (
                                                <button
                                                    key={cat.id}
                                                    onClick={() => setActiveCategory(cat.name)}
                                                    className={cn(
                                                        "px-6 py-2.5 rounded-full text-[11px] font-black uppercase tracking-[0.15em] transition-all shrink-0 border",
                                                        activeCategory === cat.name
                                                            ? "bg-[#111] border-[#111] text-white shadow-lg shadow-black/10"
                                                            : "bg-white border-slate-200 text-slate-500 hover:bg-slate-50 hover:border-slate-300"
                                                    )}
                                                >
                                                    {cat.name}
                                                </button>
                                            ))}
                                        </div>
                                    </div>
                                </section>
                            );

                        case 'products':
                            return (
                                <div key={section.id} className="w-full px-4 md:px-8 lg:px-12 py-8 bg-[#FBFBFB]">
                                    <div className="animate-in fade-in duration-700">
                                        <div className="mb-8 flex flex-col md:flex-row md:items-end justify-between gap-6">
                                            <div className="space-y-1">
                                                <h2 className="text-4xl font-black text-[#111] tracking-tighter leading-none">
                                                    {content.title || (activeCategory === 'All' ? "Full Collection" : activeCategory)}
                                                </h2>
                                                {content.subtitle && <p className="text-sm text-slate-500 font-medium">{content.subtitle}</p>}
                                                <p className="text-[13px] text-slate-400 font-bold">
                                                    Showing <span className="text-[#111]">{(content.product_ids && content.product_ids.length > 0) ? content.product_ids.length : filtered.length}</span> premium products
                                                </p>
                                            </div>
                                            
                                            <div className="flex flex-col items-end gap-3">
                                                <Link
                                                    href="/customer/shop"
                                                    className="group flex items-center gap-1.5 text-[11px] font-black uppercase tracking-widest text-[#F59E0B] hover:text-[#111] transition-all"
                                                >
                                                    View All <ArrowRight size={14} className="group-hover:translate-x-1 transition-transform" />
                                                </Link>
                                            </div>
                                        </div>

                                        {error ? (
                                            <div className="py-32 text-center bg-white rounded-[32px] border-2 border-dashed border-rose-100">
                                                <AlertTriangle size={48} className="mx-auto text-rose-200 mb-4" />
                                                <h3 className="text-xl font-bold text-rose-500">Connection Error</h3>
                                                <p className="text-sm text-slate-500 mt-2">Could not connect to the product database.</p>
                                            </div>
                                        ) : (content.product_ids && content.product_ids.length > 0) || filtered.length > 0 ? (
                                            <div className={cn(
                                                content.layout_type === 'carousel' 
                                                    ? "flex overflow-x-auto pb-4 gap-4 no-scrollbar -mx-4 px-4 md:mx-0 md:px-0" 
                                                    : content.layout_type === 'list'
                                                        ? "flex flex-col gap-4"
                                                        : content.layout_type === 'billboard'
                                                            ? "grid grid-cols-1 md:grid-cols-4 lg:grid-cols-5 gap-6"
                                                            : content.layout_type === 'split'
                                                                ? "flex flex-col lg:flex-row gap-8"
                                                                : "grid grid-cols-2 md:grid-cols-3 gap-4 md:gap-6",
                                                content.layout_type === 'grid' && content.per_row === 2 && "lg:grid-cols-2",
                                                content.layout_type === 'grid' && content.per_row === 3 && "lg:grid-cols-3",
                                                content.layout_type === 'grid' && content.per_row === 4 && "lg:grid-cols-4",
                                                content.layout_type === 'grid' && content.per_row === 5 && "lg:grid-cols-5",
                                                content.layout_type === 'grid' && content.per_row === 6 && "lg:grid-cols-6",
                                                content.layout_type === 'grid' && !content.per_row && "lg:grid-cols-4 xl:grid-cols-5",
                                                content.layout_type === 'minimal' && "grid grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4"
                                            )}>
                                                {content.layout_type === 'split' && (
                                                    <div className="lg:w-1/3 xl:w-1/4 h-[400px] lg:h-auto relative rounded-[40px] overflow-hidden group shadow-2xl">
                                                        <img src={getImageUrl(content.banner_image || content.image) || '/images/category-placeholder.jpg'} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-1000" alt="Banner" />
                                                        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent p-10 flex flex-col justify-end">
                                                            <h3 className="text-white text-3xl font-black uppercase tracking-tighter mb-2">{content.title}</h3>
                                                            <p className="text-white/80 text-sm font-medium leading-relaxed">{content.subtitle || "Explore our premium curated collection."}</p>
                                                        </div>
                                                    </div>
                                                )}
                                                
                                                <div className={cn(
                                                    content.layout_type === 'split' ? "lg:w-2/3 xl:w-3/4 grid grid-cols-2 md:grid-cols-3 gap-4" : "contents"
                                                )}>
                                                    {(() => {
                                                        const baseList = (content.product_ids && content.product_ids.length > 0)
                                                            ? allProducts.filter(p => content.product_ids.includes(p.id))
                                                            : allProducts;
                                                        
                                                        const categoryFiltered = activeCategory === 'All'
                                                            ? baseList
                                                            : baseList.filter(p => p.category_name === activeCategory);
                                                            
                                                        return categoryFiltered.slice(0, content.layout_type === 'billboard' ? 5 : maxItems);
                                                    })().map((p: any, i: number) => {
                                                        const displayTitle = (p.product_name || p.name || '').replace(/\s*\(.*?\)\s*$/, '').trim();
                                                        const isBillboardFirst = content.layout_type === 'billboard' && i === 0;
                                                        
                                                        return (
                                                            <div key={p.id} className={cn(
                                                                content.layout_type === 'carousel' && "w-[240px] flex-shrink-0",
                                                                content.layout_type === 'list' && "w-full",
                                                                isBillboardFirst && "md:col-span-2 lg:col-span-2 xl:col-span-2 md:row-span-2 h-full"
                                                            )}>
                                                                <ProductCard
                                                                    id={String(p.id)}
                                                                    title={displayTitle}
                                                                    description={p.description}
                                                                    image={getImageUrl(p.image || p.catalog_image || p.image_url) || undefined}
                                                                    price={parseFloat(p.selling_price || p.price || 0)}
                                                                    category={p.category_name || 'Cosmetics'}
                                                                    stock={p.total_quantity || p.quantity_in_stock}
                                                                    batch={p.batch || p.batch_number}
                                                                    badge={p.badge || p.status}
                                                                    weight={p.weight || p.volume_weight}
                                                                    size={p.size || p.type}
                                                                    onAddToCart={(qty) => handleAdd(p, qty)}
                                                                    layout={content.layout_type === 'list' ? 'horizontal' : (isBillboardFirst ? 'vertical' : 'vertical')}
                                                                    variant={content.layout_type === 'minimal' ? 'minimal' : (isBillboardFirst ? 'default' : 'default')}
                                                                    // For billboard, the first card should be extra special
                                                                    className={cn(
                                                                        isBillboardFirst && "h-full scale-[1.02] shadow-2xl ring-2 ring-[#13B0D1]/20"
                                                                    )}
                                                                />
                                                            </div>
                                                        );
                                                    })}
                                                </div>
                                            </div>
                                        ) : (
                                            <div className="py-32 text-center bg-white rounded-[32px] border-2 border-dashed border-slate-100">
                                                <Package size={48} className="mx-auto text-slate-200 mb-4" />
                                                <h3 className="text-xl font-bold text-slate-400">Inventory update in progress.</h3>
                                                <p className="text-sm text-slate-500 mt-2">Please check back shortly for new arrivals.</p>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            );

                        case 'spotlight':
                            const spotlightProduct = allProducts.find(p => p.id === content.product_id);
                            return (
                                <section key={section.id} className="mt-20 px-4 md:px-8 lg:px-12">
                                    <div className="max-w-6xl mx-auto bg-white rounded-[32px] border border-slate-100 overflow-hidden shadow-xl flex flex-col md:flex-row items-center">
                                        <div className="w-full md:w-1/2 aspect-square relative group overflow-hidden">
                                            <img src={getImageUrl(content.image || spotlightProduct?.image)} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700" alt="Spotlight" />
                                            <div className="absolute inset-0 bg-gradient-to-t from-black/40 to-transparent" />
                                            {spotlightProduct?.batch && (
                                                <div className="absolute top-4 left-4 z-20">
                                                    <div className="px-3 py-1.5 bg-[#111]/80 backdrop-blur-md rounded-xl shadow-lg flex items-center gap-2 border border-white/20">
                                                        <Package className="h-3 w-3 text-white" />
                                                        <span className="text-white text-[9px] font-black uppercase tracking-widest">
                                                            Batch: {spotlightProduct.batch}
                                                        </span>
                                                    </div>
                                                </div>
                                            )}
                                            {spotlightProduct && (
                                                <div className="absolute bottom-8 left-8">
                                                    <span className="px-3 py-1 bg-[#F59E0B] text-white text-[10px] font-black uppercase tracking-widest rounded-full shadow-lg">
                                                        {spotlightProduct.badge || spotlightProduct.status || "Spotlight Item"}
                                                    </span>
                                                </div>
                                            )}
                                        </div>
                                        <div className="w-full md:w-1/2 p-10 lg:p-16 space-y-6">
                                            <h2 className="text-4xl lg:text-5xl font-black text-[#111] leading-[0.9] tracking-tighter">
                                                {content.title || spotlightProduct?.name}
                                            </h2>
                                            <p className="text-slate-500 text-lg leading-relaxed">
                                                {content.description || spotlightProduct?.description}
                                            </p>
                                            {spotlightProduct && (spotlightProduct.weight || spotlightProduct.size || spotlightProduct.type || spotlightProduct.batch) && (
                                                <div className="flex flex-wrap gap-4 pt-2">
                                                    {spotlightProduct.weight && (
                                                        <div className="bg-slate-50 px-4 py-2 rounded-2xl border border-slate-100">
                                                            <p className="text-[10px] text-slate-400 font-black uppercase tracking-widest">Weight</p>
                                                            <p className="text-sm font-bold text-[#111]">{spotlightProduct.weight}</p>
                                                        </div>
                                                    )}
                                                    {(spotlightProduct.size || spotlightProduct.type) && (
                                                        <div className="bg-slate-50 px-4 py-2 rounded-2xl border border-slate-100">
                                                            <p className="text-[10px] text-slate-400 font-black uppercase tracking-widest">Type</p>
                                                            <p className="text-sm font-bold text-[#111]">{spotlightProduct.size || spotlightProduct.type}</p>
                                                        </div>
                                                    )}
                                                    {spotlightProduct.batch && (
                                                        <div className="bg-slate-50 px-4 py-2 rounded-2xl border border-slate-100">
                                                            <p className="text-[10px] text-slate-400 font-black uppercase tracking-widest">Batch</p>
                                                            <p className="text-sm font-bold text-[#111]">{spotlightProduct.batch}</p>
                                                        </div>
                                                    )}
                                                </div>
                                            )}
                                            <div className="pt-4 flex items-center gap-6">
                                                {spotlightProduct && (
                                                    <div>
                                                        <p className="text-[10px] text-slate-400 font-black uppercase tracking-widest mb-1">Retail Price</p>
                                                        <p className="text-3xl font-black text-[#111]">Rs. {parseFloat(spotlightProduct.selling_price || spotlightProduct.price || 0).toLocaleString()}</p>
                                                    </div>
                                                )}
                                                <button 
                                                    onClick={() => spotlightProduct && handleAdd(spotlightProduct)}
                                                    className="px-10 py-4 bg-[#111] hover:bg-[#333] text-white rounded-full font-black uppercase tracking-widest transition-all active:scale-95 shadow-xl shadow-black/20"
                                                >
                                                    Add To Cart
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                </section>
                            );

                        case 'about':
                            return (
                                <section key={section.id} className="mt-20 px-4 md:px-8 lg:px-12">
                                    <div className="max-w-6xl mx-auto grid md:grid-cols-2 gap-12 items-center">
                                        <div className="space-y-6">
                                            <h2 className="text-4xl font-black text-[#111] leading-tight">{content.title}</h2>
                                            <p className="text-slate-600 leading-relaxed text-lg">{content.body}</p>
                                            {content.cta_text && (
                                                <Link href={content.cta_link || '#'} className="inline-block px-8 py-3 bg-[#111] text-white rounded-full font-bold uppercase tracking-widest hover:bg-[#333] transition-all">
                                                    {content.cta_text}
                                                </Link>
                                            )}
                                        </div>
                                        {content.image && (
                                            <div className="relative aspect-square rounded-[32px] overflow-hidden shadow-2xl">
                                                <img src={getImageUrl(content.image)} className="w-full h-full object-cover" alt="About" />
                                            </div>
                                        )}
                                    </div>
                                </section>
                            );

                        case 'testimonials':
                            return (
                                <section key={section.id} className="mt-20 px-4 md:px-8 lg:px-12">
                                    <div className="text-center mb-16">
                                        <h2 className="text-2xl lg:text-3xl font-black text-slate-900 uppercase tracking-tight">{content.title || "What Our Customers Say"}</h2>
                                        <div className="w-12 h-1 bg-[#F59E0B] mx-auto mt-4 rounded-full" />
                                    </div>
                                    <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                                        {(content.reviews && content.reviews.length > 0 ? content.reviews : [
                                            { name: "Ayesha Khan", role: "Verified Customer", text: "The quality of the products is amazing. I've been using their skincare line for 3 months and the results are visible!" },
                                            { name: "Sarah Ahmed", role: "Professional Makeup Artist", text: "As a professional, I need reliable distributors. Al-Qavi always delivers authentic products on time." },
                                            { name: "Zainab Malik", role: "Frequent Buyer", text: "Best customer service in Pakistan! Their WhatsApp support helped me choose the right foundation shade perfectly." }
                                        ]).map((item: any, idx: number) => (
                                            <div key={idx} className="bg-white p-8 rounded-2xl border border-slate-200 shadow-sm relative group hover:border-[#F59E0B] transition-all">
                                                <Quote className="absolute top-6 right-6 text-slate-100 group-hover:text-[#F59E0B]/10 transition-colors" size={40} />
                                                <p className="text-slate-600 mb-6 font-medium relative z-10 italic">"{item.text}"</p>
                                                <div className="flex items-center gap-4">
                                                    <div className="w-10 h-10 rounded-full bg-slate-100 border border-slate-200 flex items-center justify-center font-bold text-[#F59E0B]">{item.name?.[0]}</div>
                                                    <div>
                                                        <h5 className="text-sm font-black text-slate-900">{item.name}</h5>
                                                        <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">{item.role}</p>
                                                    </div>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </section>
                            );

                        case 'faq':
                            return (
                                <section key={section.id} className="mt-20 px-4 md:px-8 lg:px-12">
                                    <div className="bg-white rounded-3xl border border-slate-200 p-8 shadow-sm max-w-4xl mx-auto">
                                        <div className="mb-10 text-center">
                                            <span className="inline-block px-4 py-2 text-xs font-semibold tracking-[0.2em] uppercase rounded-full bg-slate-100 text-slate-600 mb-4">
                                                FAQ
                                            </span>
                                            <h2 className="text-3xl font-bold text-slate-900 mb-3">{content.title || "Common Questions"}</h2>
                                            <p className="text-slate-500">Everything you need to know about shopping with Al-Qavi Hub.</p>
                                        </div>
                                        <div className="space-y-4">
                                            {(content.items && content.items.length > 0 ? content.items : [
                                                { q: "Are your products 100% authentic?", a: "Yes, we source all products directly from authorized distributors and manufacturers." },
                                                { q: "How long does delivery take?", a: "Major cities usually take 2-3 business days. Remote areas 4-5 business days." },
                                                { q: "Do you offer cash on delivery?", a: "Yes, Cash on Delivery is available across Pakistan." }
                                            ]).map((faq: any, idx: number) => (
                                                <div key={idx} className="rounded-2xl border border-slate-200 overflow-hidden">
                                                    <button onClick={() => setOpenFaq(openFaq === idx ? null : idx)} className="w-full px-5 py-4 flex items-center justify-between bg-slate-50 hover:bg-slate-100 transition-all">
                                                        <span className="font-semibold text-slate-800 text-sm text-left">{faq.q}</span>
                                                        <Plus size={16} className={`text-slate-400 transition-transform duration-300 ${openFaq === idx ? "rotate-45" : ""}`} />
                                                    </button>
                                                    <div className={`grid transition-all duration-300 ${openFaq === idx ? "grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0"}`}>
                                                        <div className="overflow-hidden">
                                                            <div className="px-5 py-4 text-sm text-slate-600 leading-relaxed border-t border-slate-100">{faq.a}</div>
                                                        </div>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                </section>
                            );

                        case 'newsletter':
                            return (
                                <section key={section.id} className="mt-20 px-4 md:px-8 lg:px-12">
                                    <div className="relative overflow-hidden rounded-3xl bg-[#111] p-8 lg:p-10 shadow-xl max-w-5xl mx-auto text-center">
                                        <div className="absolute top-0 right-0 h-40 w-40 bg-[#F59E0B]/10 blur-3xl rounded-full" />
                                        <div className="absolute bottom-0 left-0 h-32 w-32 bg-white/5 blur-3xl rounded-full" />
                                        <div className="relative z-10">
                                            <span className="inline-block px-4 py-2 text-xs font-semibold tracking-[0.2em] uppercase rounded-full bg-[#F59E0B]/10 text-[#F59E0B] border border-[#F59E0B]/20 mb-5">Newsletter</span>
                                            <h2 className="text-3xl font-bold text-white leading-tight mb-4">{content.title || "Stay Updated With Latest Offers"}</h2>
                                            <p className="text-slate-400 mb-8 leading-relaxed max-w-lg mx-auto">{content.subtitle || "Subscribe to receive discounts, beauty tips, and new arrivals directly in your inbox."}</p>
                                            <div className="flex flex-col sm:flex-row gap-4 max-w-md mx-auto">
                                                <input type="email" placeholder={content.placeholder || "Enter your email"} className="flex-1 px-5 py-4 rounded-2xl bg-white/5 border border-white/10 text-white placeholder:text-slate-500 focus:outline-none focus:border-[#F59E0B]" />
                                                <button className="px-8 py-4 bg-[#F59E0B] hover:bg-[#e69008] text-white rounded-2xl font-semibold transition-all duration-300 active:scale-95">Subscribe</button>
                                            </div>
                                        </div>
                                    </div>
                                </section>
                            );

                        case 'gallery':
                        case 'promotion':
                        case 'brands':
                            return (
                                <section key={section.id} className="bg-white border-y border-slate-100 overflow-hidden py-12 mt-20 relative">
                                    <style dangerouslySetInnerHTML={{
                                        __html: `
                                            @keyframes marquee-scroll { 0% { transform: translateX(0); } 100% { transform: translateX(-33.33%); } }
                                            .marquee-inner { display: flex; width: max-content; animation: marquee-scroll 40s linear infinite; }
                                            .marquee-inner:hover { animation-play-state: paused; }
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
                            );

                        default:
                            return null;
                    }
                })}
            </main>

            <Footer settings={settings} />
        </div>
    );
}
