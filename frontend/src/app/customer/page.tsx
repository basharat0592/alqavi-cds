'use client';

import PageLoader from '@/components/ui/PageLoader';
import Link from "next/link";
import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import {
    ArrowRight, Star,
    MapPin, Phone, Coffee,
    X, Plus, Package,
    Truck, ShieldCheck, Clock, CreditCard, Check, AlertTriangle,
    Sparkles, Image as ImageIcon, Zap, Users, Globe, Heart, Shield,
    GalleryHorizontal, ChevronLeft, ChevronRight
} from "lucide-react";
import Navbar from "@/components/layout/Navbar";
import Footer from "@/components/layout/Footer";
import { useCart } from "@/context/CartContext";
import { getImageUrl, cn } from "@/lib/utils";
import { productService, categoryService } from "@/lib/api";
import cmsService from "@/services/cms.service";
import ProductCard from "@/components/ui/ProductCard";
import Hero from "@/components/ui/Hero";
import { motion, AnimatePresence } from "framer-motion";
import toast from 'react-hot-toast';

export default function Home() {
    const router = useRouter();
    const [sections, setSections] = useState<any[]>([]);
    const [settings, setSettings] = useState<any>(null);
    const [categories, setCategories] = useState<any[]>([]);
    const [allProducts, setAllProducts] = useState<any[]>([]);
    const [activeCategory, setActiveCategory] = useState('All');
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const { addToCart, closeCart } = useCart();
    const [openFaq, setOpenFaq] = useState<number | null>(null);
    const [maxItems, setMaxItems] = useState(12);
    const [isReviewOpen, setIsReviewOpen] = useState(false);
    const [rating, setRating] = useState(5);
    const [reviewName, setReviewName] = useState("");
    const [reviewText, setReviewText] = useState("");
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [newsletterEmail, setNewsletterEmail] = useState("");
    const [isNewsletterSubmitting, setIsNewsletterSubmitting] = useState(false);
    const categoryScrollRef = useRef<HTMLDivElement>(null);

    const scrollCategories = (dir: number) => {
        categoryScrollRef.current?.scrollBy({ left: dir * 200, behavior: 'smooth' });
    };

    const handleNewsletterSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!newsletterEmail) return;
        setIsNewsletterSubmitting(true);
        try {
            await cmsService.subscribeNewsletter(newsletterEmail);
            toast.success("Your email has been submitted for the latest updates");
            setNewsletterEmail("");
        } catch (error) {
            console.error("Subscription failed", error);
            toast.error("Subscription failed. Please try again.");
        } finally {
            setIsNewsletterSubmitting(false);
        }
    };

    const handleReviewSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsSubmitting(true);
        try {
            await cmsService.submitReview({
                name: reviewName,
                rating: rating,
                text: reviewText
            });
            toast.success("Review submitted! Admin has been notified.");
            setIsReviewOpen(false);
            setReviewName("");
            setReviewText("");
            setRating(5);
        } catch (error) {
            console.error("Submission failed", error);
            toast.error("Failed to submit review. Please try again.");
        } finally {
            setIsSubmitting(false);
        }
    };

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

                // Only update state when the data actually changed. Returning the
                // previous reference makes React bail out of the re-render, so the
                // 1-second sync below doesn't re-mount the Hero / promo card and
                // replay their entrance animations every second.
                const nextSections = cmsData.sections || [];
                const nextSettings = cmsData.settings || null;
                setSections((prev: any) => JSON.stringify(prev) === JSON.stringify(nextSections) ? prev : nextSections);
                setSettings((prev: any) => JSON.stringify(prev) === JSON.stringify(nextSettings) ? prev : nextSettings);

                // 2. Get Catalog Data
                const [catData, prodData] = await Promise.all([
                    categoryService.getAll().catch(() => []),
                    productService.getAll({ no_pagination: 'true' }).catch(() => [])
                ]);

                const nextCategories = Array.isArray(catData) ? catData : (catData as any).results || [];
                const prods = Array.isArray(prodData) ? prodData : (prodData as any).results || [];
                setCategories((prev: any) => JSON.stringify(prev) === JSON.stringify(nextCategories) ? prev : nextCategories);
                setAllProducts((prev: any) => JSON.stringify(prev) === JSON.stringify(prods) ? prev : prods);
            } catch (error: any) {
                console.error("Home page data initialization error", error);
                setError(error.message || "Connection Error");
            } finally {
                setLoading(false);
            }
        };

        fetchData();
        const interval = setInterval(fetchData, 1000); // 1-second sync
        return () => clearInterval(interval);
    }, []);

    useEffect(() => {
        const handleSync = (e: StorageEvent) => {
            if (e.key === 'cms-sync-reload') window.location.reload();
        };
        window.addEventListener('storage', handleSync);
        return () => window.removeEventListener('storage', handleSync);
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
    const rawActiveSections = sections
        .filter(s => s.is_visible)
        .sort((a, b) => (a.order || 0) - (b.order || 0));

    // Group FAQ and Newsletter if they are adjacent
    const activeSections: any[] = [];
    for (let i = 0; i < rawActiveSections.length; i++) {
        const current = rawActiveSections[i];
        const next = rawActiveSections[i + 1];

        if (current.section_type === 'faq' && next?.section_type === 'newsletter') {
            activeSections.push({
                ...current,
                section_type: 'faq_newsletter_combined',
                newsletter_section: next
            });
            i++; // skip next
        } else if (current.section_type === 'newsletter' && next?.section_type === 'faq') {
            activeSections.push({
                ...next,
                section_type: 'faq_newsletter_combined',
                newsletter_section: current,
                reversed: true
            });
            i++; // skip next
        } else {
            activeSections.push(current);
        }
    }

    // Special offer (promotion) to overlay on top of the hero on large screens
    const heroPromoSection = activeSections.find((s) => s.section_type === 'promotion');
    const heroPromoContent = heroPromoSection?.content || {};
    const heroPromoIds = Array.isArray(heroPromoContent.product_ids)
        ? heroPromoContent.product_ids
        : (heroPromoContent.product_id ? [heroPromoContent.product_id] : []);
    const heroPromoProduct = allProducts.find((p) => heroPromoIds.some((sid: any) => String(sid) === String(p.id)));
    const heroPromoPrice = heroPromoProduct ? parseFloat(heroPromoProduct.selling_price || heroPromoProduct.price || 0) : 0;
    const heroPromoDiscount = parseFloat(heroPromoContent.discount_percent || 0);
    const heroPromoFinal = heroPromoDiscount > 0 ? Math.round(heroPromoPrice * (1 - heroPromoDiscount / 100)) : heroPromoPrice;

    return (
        <div className="min-h-screen bg-[#F8FAFC] dark:bg-[#0F172A] transition-colors duration-500 w-full overflow-x-hidden">
            <Navbar settings={settings} />

            <main className="pb-20 w-full overflow-x-hidden">
                {activeSections.map((section) => {
                    const content = section.content || {};

                    switch (section.section_type) {
                        case 'hero':
                            return (
                                <div key={section.id} className="relative">
                                    <Hero slides={content.slides} />

                                    {/* Special Offer — overlaid on the hero (desktop only) */}
                                    {heroPromoProduct && (
                                        <div className="hidden lg:flex absolute inset-y-0 right-0 w-1/2 items-center justify-end pr-10 xl:pr-16 z-20 pointer-events-none">
                                            <motion.div
                                                initial={{ opacity: 0, y: 28, scale: 0.95 }}
                                                animate={{ opacity: 1, y: 0, scale: 1 }}
                                                transition={{ delay: 0.4, duration: 0.7, ease: "easeOut" }}
                                                className="group/promo pointer-events-auto relative w-full max-w-md overflow-hidden rounded-[30px] bg-gradient-to-br from-white/[0.14] via-white/[0.06] to-white/[0.03] backdrop-blur-2xl shadow-[0_30px_80px_-20px_rgba(0,0,0,0.75)] ring-1 ring-white/10 border border-white/15 hover:-translate-y-1.5 transition-all duration-500"
                                            >
                                                {/* Top sheen */}
                                                <div className="pointer-events-none absolute inset-x-8 top-0 z-20 h-px bg-gradient-to-r from-transparent via-white/60 to-transparent" />

                                                {/* Cover image */}
                                                <div className="relative h-48 overflow-hidden">
                                                    <img
                                                        src={getImageUrl(heroPromoContent.image || heroPromoProduct.image || heroPromoProduct.catalog_image || heroPromoProduct.image_url)}
                                                        className="w-full h-full object-cover group-hover/promo:scale-105 transition-transform duration-700"
                                                        alt={heroPromoProduct.product_name || 'Special Offer'}
                                                    />
                                                    {/* Legibility gradient */}
                                                    <div className="absolute inset-0 bg-gradient-to-t from-slate-950/95 via-slate-950/30 to-slate-950/40" />

                                                    {/* Eyebrow */}
                                                    <span className="absolute top-5 left-6 inline-flex items-center gap-1.5 rounded-full border border-white/15 bg-white/10 backdrop-blur-md px-3 py-1 text-[10px] font-bold uppercase tracking-[0.3em] text-white/90 shadow">
                                                        <Sparkles size={12} className="text-[#5FDDEE]" /> Special Offer
                                                    </span>

                                                    {/* Discount pill */}
                                                    {heroPromoDiscount > 0 && (
                                                        <span className="absolute top-5 right-6 rounded-full bg-gradient-to-r from-[#E6C04D] to-[#C7991F] px-3 py-1.5 text-[11px] font-black tracking-wide text-[#1a1205] shadow-lg shadow-black/30">
                                                            −{heroPromoDiscount}% OFF
                                                        </span>
                                                    )}

                                                    {/* Title + price over image */}
                                                    <div className="absolute bottom-5 left-6 right-6">
                                                        <h3 className="text-white font-semibold text-[18px] leading-snug line-clamp-2 tracking-tight drop-shadow-md">
                                                            {heroPromoContent.title || heroPromoProduct.product_name}
                                                        </h3>
                                                        <div className="flex items-baseline gap-2.5 mt-2 flex-wrap">
                                                            <span className="text-white text-[34px] font-black tracking-tight leading-none drop-shadow-lg">Rs. {heroPromoFinal.toLocaleString()}</span>
                                                            {heroPromoDiscount > 0 && (
                                                                <span className="text-white/60 line-through text-[15px] font-medium">Rs. {heroPromoPrice.toLocaleString()}</span>
                                                            )}
                                                        </div>
                                                    </div>
                                                </div>

                                                {/* CTA section */}
                                                <div className="relative p-5">
                                                    {heroPromoDiscount > 0 && heroPromoPrice > heroPromoFinal && (
                                                        <div className="mb-3 flex items-center justify-between">
                                                            <span className="inline-flex items-center gap-1.5 text-[12px] font-bold text-[#5FDDEE]">
                                                                <Zap size={14} className="fill-[#5FDDEE]" /> You save Rs. {(heroPromoPrice - heroPromoFinal).toLocaleString()}
                                                            </span>
                                                            <span className="inline-flex items-center gap-1 text-[10px] font-semibold uppercase tracking-wider text-white/45">
                                                                <Clock size={11} /> Limited time
                                                            </span>
                                                        </div>
                                                    )}
                                                    <button
                                                        onClick={() => {
                                                            handleAdd(heroPromoProduct);
                                                            closeCart();
                                                            router.push('/customer/checkout');
                                                        }}
                                                        className="group/btn relative w-full overflow-hidden rounded-2xl py-4 bg-gradient-to-r from-[#0E8AA6] via-[#13B0D1] to-[#0E8AA6] bg-[length:200%_100%] text-white font-bold uppercase tracking-[0.25em] text-[12px] shadow-lg shadow-[#13B0D1]/30 transition-all duration-500 active:scale-[0.98] hover:bg-[position:100%_0]"
                                                    >
                                                        <span className="relative z-10 flex items-center justify-center gap-2">
                                                            {heroPromoContent.cta_text || 'Grab Deal'}
                                                            <ArrowRight size={16} className="group-hover/btn:translate-x-1 transition-transform" />
                                                        </span>
                                                        <span className="absolute inset-0 -translate-x-full group-hover/btn:translate-x-full bg-gradient-to-r from-transparent via-white/25 to-transparent transition-transform duration-700" />
                                                    </button>

                                                    {/* Trust row */}
                                                    <div className="mt-3.5 flex items-center justify-center gap-4 text-[10px] font-medium text-white/55">
                                                        <span className="inline-flex items-center gap-1.5"><ShieldCheck size={13} className="text-[#5FDDEE]" /> 100% Authentic</span>
                                                        <span className="h-3 w-px bg-white/15" />
                                                        <span className="inline-flex items-center gap-1.5"><Truck size={13} className="text-[#5FDDEE]" /> Fast Delivery</span>
                                                    </div>
                                                </div>
                                            </motion.div>
                                        </div>
                                    )}
                                </div>
                            );

                        case 'faq_newsletter_combined':
                            const faqSec = section.reversed ? section.newsletter_section : section;
                            const newsSec = section.reversed ? section : section.newsletter_section;
                            const faqContent = faqSec.content || {};
                            const newsContent = newsSec.content || {};

                            return (
                                <section key={section.id} className="w-full px-4 md:px-12 xl:px-20 py-6 md:py-12 bg-[#FBFBFB] border-y border-slate-100 mt-6 md:mt-10 overflow-x-hidden">
                                    <div className="flex flex-col lg:flex-row gap-10 md:gap-16 items-start">
                                        {/* Left: FAQ Section */}
                                        <div className="flex-1 w-full animate-in fade-in duration-700">
                                            <div className="mb-8 md:mb-12">
                                                <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold text-[#2D4059] tracking-tight leading-none mb-4">
                                                    {faqContent.title || "Common Questions"}
                                                </h2>
                                                <p className="text-[14px] md:text-[15px] text-[#565959] leading-relaxed max-w-2xl font-medium">
                                                    {faqContent.subtitle || "Providing clarity for our professional partners and distribution network."}
                                                </p>
                                            </div>

                                            <div className="space-y-3">
                                                {(faqContent.items || []).map((faq: any, idx: number) => (
                                                    <div key={idx} className="bg-white rounded-[8px] border border-[#D5D9D9] shadow-sm overflow-hidden group hover:border-[#119AB8] transition-all duration-300">
                                                        <button
                                                            onClick={() => setOpenFaq(openFaq === idx ? null : idx)}
                                                            className={cn(
                                                                "w-full px-6 py-5 flex items-center justify-between transition-all duration-300",
                                                                openFaq === idx ? "bg-slate-50" : "bg-white"
                                                            )}
                                                        >
                                                            <span className="font-bold text-[13px] md:text-[14px] text-left text-[#0f1111] uppercase tracking-tight">{faq.q}</span>
                                                            <div className={cn(
                                                                "w-6 h-6 rounded-md flex items-center justify-center transition-all duration-300",
                                                                openFaq === idx ? "bg-[#119AB8] text-white rotate-45" : "bg-slate-50 text-slate-400"
                                                            )}>
                                                                <Plus size={16} className="stroke-[3]" />
                                                            </div>
                                                        </button>
                                                        <div className={cn(
                                                            "grid transition-all duration-300 ease-in-out",
                                                            openFaq === idx ? "grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0"
                                                        )}>
                                                            <div className="overflow-hidden">
                                                                <div className="px-6 pb-6 text-[13px] md:text-[14px] text-slate-500 font-medium leading-relaxed border-t border-slate-50 pt-4 mx-6">
                                                                    {faq.a}
                                                                </div>
                                                            </div>
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>

                                        {/* Right: Newsletter Section */}
                                        <div className="w-full lg:w-[450px] animate-in fade-in duration-700 lg:sticky lg:top-32 text-center lg:text-left pt-6 lg:pt-0">
                                            {(newsContent.title || newsContent.subtitle) && (
                                                <div className="mb-8">
                                                    {newsContent.title && (
                                                        <h2 className="text-2xl md:text-3xl font-bold text-[#2D4059] tracking-tight mb-4">
                                                            {newsContent.title}
                                                        </h2>
                                                    )}
                                                    {newsContent.subtitle && (
                                                        <p className="text-[14px] md:text-[15px] text-[#565959] leading-relaxed max-w-sm mx-auto lg:mx-0">
                                                            {newsContent.subtitle}
                                                        </p>
                                                    )}
                                                </div>
                                            )}

                                            <div className="relative group max-w-md mx-auto lg:mx-0 w-full">
                                                <div className="flex flex-col sm:flex-row items-center bg-white rounded-[20px] sm:rounded-full shadow-[0_20px_40px_-15px_rgba(0,0,0,0.08)] p-1.5 sm:p-1 md:p-1.5 border border-slate-50 gap-2 sm:gap-0">
                                                    <input
                                                        type="email"
                                                        value={newsletterEmail}
                                                        onChange={(e) => setNewsletterEmail(e.target.value)}
                                                        placeholder="Enter your email address"
                                                        className="w-full sm:flex-1 bg-transparent px-4 sm:px-6 py-2 sm:py-1.5 outline-none text-[14px] text-[#2D4059] placeholder:text-slate-300 font-medium text-center sm:text-left"
                                                    />
                                                    <button
                                                        onClick={handleNewsletterSubmit}
                                                        disabled={isNewsletterSubmitting}
                                                        className="w-full sm:w-auto px-8 py-2 bg-[#56B8E6] hover:bg-[#45A7D5] text-white rounded-[15px] sm:rounded-full font-bold text-[13px] transition-all active:scale-95 shadow-md shadow-[#56B8E6]/10 disabled:opacity-50 whitespace-nowrap"
                                                    >
                                                        {isNewsletterSubmitting ? "..." : "Subscribe"}
                                                    </button>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </section>
                            );

                        case 'floating_canvas':
                            const canvasProducts = allProducts.filter(p => {
                                const searchIds = Array.isArray(content.product_ids) ? content.product_ids : [];
                                return searchIds.some((sid: string | number) => String(sid) === String(p.id));
                            });
                            return (
                                <section key={section.id} className="relative w-full md:h-[90vh] overflow-hidden bg-white mt-10 md:mt-20 py-10 md:py-0 flex flex-col justify-center">
                                    <div className="absolute top-0 left-0 w-full h-full opacity-30 pointer-events-none">
                                        <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] bg-[#13B0D1]/20 blur-[120px] rounded-full animate-pulse" />
                                        <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] bg-[#F59E0B]/10 blur-[120px] rounded-full animate-pulse" />
                                    </div>

                                    <div className="relative z-10 w-full flex flex-col items-center justify-center pointer-events-none px-4 md:px-12 xl:px-20 text-center max-w-7xl mx-auto">
                                        <div className="space-y-6">
                                            <span className="px-4 py-2 bg-[#13B0D1]/10 text-[#13B0D1] rounded-full text-[10px] font-black uppercase tracking-[0.3em] border border-[#13B0D1]/20">
                                                Interactive Discovery
                                            </span>
                                            <h2 className="text-3xl md:text-5xl font-bold text-[#2D4059] tracking-tight leading-none">
                                                {content.title || "Floating Collection"}
                                            </h2>
                                            <p className="text-[14px] md:text-[15px] text-[#565959] leading-relaxed max-w-xl mx-auto font-medium">
                                                {content.subtitle || "Drag and discover our premium products in this interactive spatial gallery."}
                                            </p>
                                        </div>
                                    </div>

                                    {/* Desktop Floating Canvas */}
                                    <div className="absolute inset-0 z-20 overflow-hidden hidden md:block">
                                        {canvasProducts.map((p, idx) => {
                                            const randomX = Math.random() * 80 + 10;
                                            const randomY = Math.random() * 80 + 10;
                                            const randomRotate = Math.random() * 20 - 10;

                                            return (
                                                <motion.div
                                                    key={p.id}
                                                    drag
                                                    dragConstraints={{ left: 0, right: 0, top: 0, bottom: 0 }}
                                                    dragElastic={0.6}
                                                    whileHover={{ scale: 1.1, rotate: 0, zIndex: 50 }}
                                                    whileTap={{ scale: 0.9, cursor: "grabbing" }}
                                                    initial={{
                                                        x: `${randomX}vw`,
                                                        y: `${randomY}vh`,
                                                        rotate: randomRotate,
                                                        opacity: 0,
                                                        scale: 0.5
                                                    }}
                                                    animate={{
                                                        opacity: 1,
                                                        scale: 1,
                                                        y: [`${randomY}vh`, `${randomY + (Math.random() * 2 - 1)}vh`, `${randomY}vh`]
                                                    }}
                                                    transition={{
                                                        opacity: { duration: 1, delay: idx * 0.1 },
                                                        scale: { duration: 1, delay: idx * 0.1 },
                                                        y: {
                                                            duration: 4 + Math.random() * 2,
                                                            repeat: Infinity,
                                                            ease: "easeInOut"
                                                        }
                                                    }}
                                                    className="absolute w-24 md:w-48 group cursor-grab active:cursor-grabbing pointer-events-auto"
                                                    style={{
                                                        left: 0,
                                                        top: 0,
                                                        transform: `translate(-50%, -50%)`
                                                    }}
                                                >
                                                    <div className="relative p-3 md:p-6 bg-white/10 backdrop-blur-md rounded-[32px] md:rounded-[40px] border border-white/20 shadow-2xl transition-all duration-500 group-hover:bg-white/40 group-hover:border-white/40">
                                                        <img
                                                            src={getImageUrl(p.image || p.catalog_image || p.image_url)}
                                                            className="w-full h-full object-contain drop-shadow-[0_15px_40px_rgba(0,0,0,0.15)] group-hover:drop-shadow-[0_20px_50px_rgba(19,176,209,0.3)] transition-all duration-500"
                                                            alt={p.name}
                                                        />

                                                        {/* Quick Add Button - Floating Overlay */}
                                                        <motion.button
                                                            whileHover={{ scale: 1.1 }}
                                                            whileTap={{ scale: 0.9 }}
                                                            onClick={(e) => {
                                                                e.stopPropagation();
                                                                handleAdd(p);
                                                                toast.success('Added to bag!');
                                                            }}
                                                            className="absolute -bottom-3 left-1/2 -translate-x-1/2 w-8 h-8 md:w-12 md:h-12 bg-[#111] text-white rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all shadow-xl pointer-events-auto"
                                                        >
                                                            <Plus size={16} className="md:w-5 md:h-5" />
                                                        </motion.button>
                                                    </div>
                                                </motion.div>
                                            );
                                        })}
                                    </div>

                                    {/* Mobile Fallback Grid/List */}
                                    <div className="block md:hidden w-full px-4 pb-4 mt-8 overflow-x-auto no-scrollbar z-20">
                                        <div className="flex gap-4">
                                            {canvasProducts.map((p) => (
                                                <div key={p.id} className="w-[160px] flex-shrink-0 bg-slate-50 border border-slate-100 rounded-2xl p-4 flex flex-col items-center text-center relative group">
                                                    <Link href={`/customer/product/${p.id}`} className="block w-24 h-24 mb-3">
                                                        <img
                                                            src={getImageUrl(p.image || p.catalog_image || p.image_url)}
                                                            className="w-full h-full object-contain"
                                                            alt={p.name}
                                                        />
                                                    </Link>
                                                    <h4 className="text-[12px] font-bold text-[#2D4059] line-clamp-1 uppercase tracking-tight w-full">
                                                        {(p.product_name || p.name || '').replace(/\s*\(.*?\)\s*$/, '').trim()}
                                                    </h4>
                                                    <p className="text-[#13B0D1] font-black text-xs mt-1">
                                                        Rs. {parseFloat(p.selling_price || p.price || 0).toLocaleString()}
                                                    </p>

                                                    {/* Add to Cart button */}
                                                    <button
                                                        onClick={() => {
                                                            handleAdd(p);
                                                            toast.success('Added to bag!');
                                                        }}
                                                        className="mt-3 w-full py-1.5 bg-[#111] hover:bg-[#333] text-white rounded-lg text-[10px] font-bold uppercase tracking-wider transition-all"
                                                    >
                                                        Add To Cart
                                                    </button>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                </section>
                            );


                        case 'products': {
                            const isFullCollection = !content.title || content.title === 'Full Collection';
                            return (
                                <div key={section.id} className="w-full px-4 md:px-[1%] pt-4 md:pt-8 pb-6 md:pb-12 bg-[#FBFBFB] overflow-x-hidden -mt-6 md:mt-0 relative z-10">
                                    <div className="animate-in fade-in duration-700">
                                        {(() => {
                                            if (isFullCollection) {
                                                return (
                                                    <div className="mb-8 md:mb-12 space-y-2 md:space-y-3">
                                                        {/* Top Row: Title & Filters */}
                                                        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                                                            <div className="hidden md:block space-y-1 md:space-y-2 text-center md:text-left">
                                                                <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold text-[#2D4059] tracking-tight leading-tight">
                                                                    {content.title || (activeCategory === 'All' ? "Full Collection" : activeCategory)}
                                                                </h2>
                                                            </div>

                                                            <div className="flex items-center justify-between gap-1.5 w-full md:w-auto md:justify-end">
                                                                {/* Mobile scroll-left arrow */}
                                                                <button
                                                                    onClick={() => scrollCategories(-1)}
                                                                    className="md:hidden shrink-0 p-0.5 -ml-3 text-[#13B0D1] active:scale-90 transition"
                                                                    aria-label="Scroll categories left"
                                                                >
                                                                    <ChevronLeft size={22} className="stroke-[4]" />
                                                                </button>

                                                                <div ref={categoryScrollRef} className="flex items-center gap-2 overflow-x-auto no-scrollbar py-1 w-full md:w-auto md:justify-end max-w-full min-w-0">
                                                                    <button
                                                                        onClick={() => setActiveCategory('All')}
                                                                        className={cn(
                                                                            "px-5 py-2 rounded-full text-[10px] font-black uppercase tracking-widest transition-all shrink-0 border",
                                                                            activeCategory === 'All'
                                                                                ? "bg-[#111] border-[#111] text-white shadow-lg"
                                                                                : "bg-white border-slate-200 text-slate-500 hover:bg-slate-50"
                                                                        )}
                                                                    >
                                                                        All Items
                                                                    </button>
                                                                    {categories.map((cat) => (
                                                                        <button
                                                                            key={cat.id}
                                                                            onClick={() => setActiveCategory(cat.name)}
                                                                            className={cn(
                                                                                "px-5 py-2 rounded-full text-[10px] font-black uppercase tracking-widest transition-all shrink-0 border",
                                                                                activeCategory === cat.name
                                                                                    ? "bg-[#111] border-[#111] text-white shadow-lg"
                                                                                    : "bg-white border-slate-200 text-slate-500 hover:bg-slate-50"
                                                                            )}
                                                                        >
                                                                            {cat.name}
                                                                        </button>
                                                                    ))}
                                                                </div>

                                                                {/* Mobile scroll-right arrow */}
                                                                <button
                                                                    onClick={() => scrollCategories(1)}
                                                                    className="md:hidden shrink-0 p-0.5 -mr-3 text-[#13B0D1] active:scale-90 transition"
                                                                    aria-label="Scroll categories right"
                                                                >
                                                                    <ChevronRight size={22} className="stroke-[4]" />
                                                                </button>
                                                            </div>
                                                        </div>

                                                        {/* Bottom Row: Filters & Stats */}
                                                        <div className="hidden md:flex flex-col md:flex-row items-center justify-between gap-4">
                                                            <p className="text-[11px] md:text-[13px] text-slate-400 font-bold uppercase tracking-widest">
                                                                Showing <span className="text-[#111]">{filtered.length}</span> of premium products
                                                            </p>

                                                            {/* View All removed from here as per request */}
                                                            <div className="hidden md:block w-24" /> {/* Spacer to keep layout balanced */}
                                                        </div>
                                                    </div>
                                                );
                                            }

                                            // Default Header for other product sections
                                            return (
                                                <div className="mb-6 md:mb-10 flex flex-col md:flex-row md:items-end justify-between gap-3 md:gap-6">
                                                    <div className="flex flex-col text-left space-y-1 md:space-y-2 w-full md:w-auto">
                                                        <div className="flex flex-row items-center justify-between w-full md:w-auto">
                                                            <h2 className="text-xl sm:text-3xl md:text-4xl font-bold text-[#2D4059] tracking-tight leading-tight">
                                                                {content.title}
                                                            </h2>
                                                            <Link
                                                                href="/customer/shop"
                                                                className="md:hidden group flex items-center gap-1 text-[10px] font-black uppercase tracking-widest text-[#13B0D1] hover:text-[#111] transition-all whitespace-nowrap"
                                                            >
                                                                View All <ArrowRight size={14} className="group-hover:translate-x-1.5 transition-transform" />
                                                            </Link>
                                                        </div>
                                                        {content.subtitle && <p className="text-[13px] md:text-[15px] text-[#565959] leading-relaxed font-medium">{content.subtitle}</p>}
                                                        <p className="text-[11px] md:text-[13px] text-slate-400 font-bold uppercase tracking-widest">
                                                            Showing <span className="text-[#111]">{(() => {
                                                                const baseList = (isFullCollection || !content.product_ids || content.product_ids.length === 0)
                                                                    ? allProducts
                                                                    : allProducts.filter(p => {
                                                                        const searchIds = Array.isArray(content.product_ids) ? content.product_ids : [];
                                                                        return searchIds.some((sid: string | number) => String(sid) === String(p.id));
                                                                    });
                                                                return baseList.length;
                                                            })()}</span> of premium products
                                                        </p>
                                                    </div>

                                                    <div className="hidden md:flex justify-end">
                                                        <Link
                                                            href="/customer/shop"
                                                            className="group flex items-center gap-2 text-[11px] font-black uppercase tracking-widest text-[#13B0D1] hover:text-[#111] transition-all"
                                                        >
                                                            View Full Collection <ArrowRight size={16} className="group-hover:translate-x-1.5 transition-transform" />
                                                        </Link>
                                                    </div>
                                                </div>
                                            );
                                        })()}

                                        {error ? (
                                            <div className="py-20 md:py-32 text-center bg-white rounded-[32px] border-2 border-dashed border-rose-100">
                                                <AlertTriangle size={48} className="mx-auto text-rose-200 mb-4" />
                                                <h3 className="text-xl font-bold text-rose-500">Connection Error</h3>
                                                <p className="text-sm text-slate-500 mt-2">Could not connect to the product database.</p>
                                            </div>
                                        ) : (content.product_ids && content.product_ids.length > 0) || filtered.length > 0 ? (
                                            <CarouselContainer layoutType={content.layout_type || 'grid'} isFullCollection={isFullCollection}>
                                                {(() => {
                                                    const baseList = (!content.title || content.title === 'Full Collection' || !content.product_ids || content.product_ids.length === 0)
                                                        ? allProducts
                                                        : allProducts.filter(p => {
                                                            const searchIds = Array.isArray(content.product_ids) ? content.product_ids : [];
                                                            return searchIds.some((sid: string | number) => String(sid) === String(p.id));
                                                        });

                                                    const categoryFiltered = activeCategory === 'All'
                                                        ? baseList
                                                        : baseList.filter(p => {
                                                            const target = activeCategory.toLowerCase().trim();
                                                            const name1 = (p.category_name || '').toLowerCase().trim();
                                                            const name2 = (p.category?.name || '').toLowerCase().trim();
                                                            return name1 === target || name2 === target;
                                                        });

                                                    return categoryFiltered.slice(0, content.layout_type === 'billboard' ? 5 : maxItems);
                                                })().map((p: any, i: number) => {
                                                    const displayTitle = (p.product_name || p.name || '').replace(/\s*\(.*?\)\s*$/, '').trim();
                                                    const isBillboardFirst = content.layout_type === 'billboard' && i === 0;

                                                    return (
                                                        <div key={p.id} className={cn(
                                                            // Mobile: list items are full width; others are fixed carousel cards
                                                            content.layout_type === 'list' 
                                                                ? "w-full" 
                                                                : (isFullCollection ? "w-[185px] sm:w-[210px] flex-shrink-0" : "w-[160px] flex-shrink-0"),
                                                            // Desktop: layout-specific width overrides
                                                            content.layout_type === 'carousel' ? "md:w-[240px]" : "md:w-auto",
                                                            content.layout_type === 'list' && "md:w-full",
                                                            isBillboardFirst && "md:col-span-2 lg:col-span-2 xl:col-span-2 md:row-span-2 md:h-full",
                                                            content.layout_type === 'highlight' && i === 0 && "md:col-span-2 md:h-full",
                                                            content.layout_type === 'masonry' && "md:break-inside-avoid md:mb-4"
                                                        )}>
                                                            <ProductCard
                                                                id={String(p.id)}
                                                                title={displayTitle}
                                                                description={p.description}
                                                                image={getImageUrl(p.images?.[0]?.image || p.image || p.catalog_image || p.image_url) || undefined}
                                                                price={parseFloat(p.selling_price || p.price || 0)}
                                                                category={p.category_name || 'Cosmetics'}
                                                                stock={p.total_quantity || p.quantity_in_stock}
                                                                batch={p.batch || p.batch_number}
                                                                badge={p.badge || p.status}
                                                                weight={p.weight || p.volume_weight}
                                                                size={p.size || p.type}
                                                                onAddToCart={(qty) => handleAdd(p, qty)}
                                                                layout={content.layout_type === 'list' ? 'horizontal' : (isBillboardFirst || (content.layout_type === 'highlight' && i === 0) ? 'vertical' : 'vertical')}
                                                                variant={content.layout_type === 'minimal' ? 'minimal' : (content.layout_type === 'luxury' ? 'luxury' : 'default')}
                                                            />
                                                        </div>
                                                    );
                                                })}
                                            </CarouselContainer>
                                        ) : (
                                            <div className="py-20 md:py-32 text-center bg-white rounded-[32px] border-2 border-dashed border-slate-100">
                                                <Package size={48} className="mx-auto text-slate-200 mb-4" />
                                                <h3 className="text-xl font-bold text-slate-400">
                                                    {allProducts.length === 0 ? "No products available at the moment." : "Inventory update in progress."}
                                                </h3>
                                                <p className="text-sm text-slate-500 mt-2">
                                                    {allProducts.length === 0 ? "Our team is currently stocking the catalog." : "Please check back shortly for new arrivals."}
                                                </p>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            );
                        }

                        case 'spotlight':
                            const spotlightProduct = allProducts.find(p => String(p.id) === String(content.product_id));
                            return (
                                <section key={section.id} className="w-full px-4 md:px-12 xl:px-20 mt-6 md:mt-10 animate-in fade-in duration-700 overflow-x-hidden">
                                    <div className="max-w-7xl mx-auto bg-white rounded-[12px] md:rounded-[16px] border border-slate-100 overflow-hidden shadow-xl flex flex-col md:flex-row items-center">
                                        <div className="w-full md:w-1/2 aspect-square relative group overflow-hidden">
                                            <img src={getImageUrl(content.image || spotlightProduct?.image)} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700" alt="Spotlight" />
                                            <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent hidden md:block" />

                                            {/* Permanent Product Identity Overlay on Image */}
                                            <div className="absolute bottom-0 left-0 right-0 p-6 md:p-10 z-20 hidden md:block">
                                                <h3 className="text-white text-xl md:text-3xl font-black uppercase tracking-tighter leading-tight drop-shadow-2xl">
                                                    {content.title || spotlightProduct?.name}
                                                </h3>
                                                <p className="text-white/70 text-[10px] md:text-[12px] font-bold uppercase tracking-widest mt-2 line-clamp-2 drop-shadow-md max-w-md">
                                                    {content.description || spotlightProduct?.description}
                                                </p>
                                            </div>

                                            {/* Floating Price Badge - Positioned to the right edge */}
                                            <div className="absolute top-8 -right-2 z-20">
                                                <div className="px-5 py-2 bg-[#13B0D1] text-white rounded-l-xl shadow-2xl border-y border-l border-white/20">
                                                    <span className="text-[14px] font-black uppercase tracking-widest">
                                                        Rs. {parseFloat(spotlightProduct?.selling_price || spotlightProduct?.price || 0).toLocaleString()}
                                                    </span>
                                                </div>
                                            </div>

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
                                        </div>
                                        <div className="w-full md:w-1/2 p-6 md:p-10 lg:p-16 space-y-4 md:space-y-6 text-center md:text-left">
                                            <h2 className="text-3xl md:text-4xl font-bold text-[#2D4059] leading-[0.9] tracking-tight">
                                                {content.title || spotlightProduct?.name}
                                            </h2>
                                            <p className="text-[14px] md:text-[16px] text-[#565959] leading-relaxed font-medium">
                                                {content.description || spotlightProduct?.description}
                                            </p>
                                            {spotlightProduct && (spotlightProduct.weight || spotlightProduct.size || spotlightProduct.type) && (
                                                <div className="flex flex-wrap justify-center md:justify-start gap-3 md:gap-4 pt-2">
                                                    {spotlightProduct.weight && (
                                                        <div className="bg-slate-50 px-3 md:px-4 py-1.5 md:py-2 rounded-xl md:rounded-2xl border border-slate-100">
                                                            <p className="text-[9px] md:text-[10px] text-slate-400 font-black uppercase tracking-widest">Weight</p>
                                                            <p className="text-xs md:text-sm font-bold text-[#111]">{spotlightProduct.weight}</p>
                                                        </div>
                                                    )}
                                                    {(spotlightProduct.size || spotlightProduct.type) && (
                                                        <div className="bg-slate-50 px-3 md:px-4 py-1.5 md:py-2 rounded-xl md:rounded-2xl border border-slate-100">
                                                            <p className="text-[9px] md:text-[10px] text-slate-400 font-black uppercase tracking-widest">Type</p>
                                                            <p className="text-xs md:text-sm font-bold text-[#111]">{spotlightProduct.size || spotlightProduct.type}</p>
                                                        </div>
                                                    )}
                                                </div>
                                            )}
                                            <div className="pt-4 flex flex-col sm:flex-row items-center gap-4 md:gap-8">
                                                {spotlightProduct && (
                                                    <div className="flex-1">
                                                        <p className="text-[9px] md:text-[10px] text-slate-400 font-black uppercase tracking-widest mb-1">Retail Price</p>
                                                        <p className="text-3xl md:text-4xl font-black text-[#111]">Rs. {parseFloat(spotlightProduct.selling_price || spotlightProduct.price || 0).toLocaleString()}</p>
                                                    </div>
                                                )}
                                                <button
                                                    onClick={() => spotlightProduct && handleAdd(spotlightProduct)}
                                                    className="w-full sm:w-auto px-8 md:px-10 py-3.5 md:py-4 bg-[#111] hover:bg-[#333] text-white rounded-full font-black uppercase tracking-widest transition-all active:scale-95 shadow-xl shadow-black/20 text-[11px] md:text-[13px]"
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
                                <section key={section.id} className="w-full px-4 md:px-12 xl:px-20 py-8 md:py-16 bg-[#FBFBFB] border-y border-slate-100 mt-6 md:mt-10 overflow-x-hidden">
                                    <div className="max-w-7xl mx-auto grid md:grid-cols-2 gap-10 md:gap-20 items-center">
                                        <div className="space-y-6 md:space-y-8 text-center md:text-left order-2 md:order-1">
                                            <div className="space-y-3">
                                                <h2 className="text-3xl md:text-4xl font-bold text-[#2D4059] leading-tight tracking-tight">{content.title}</h2>
                                                <div className="h-1 w-12 bg-[#119AB8] rounded-full mx-auto md:mx-0" />
                                            </div>
                                            <p className="text-[#565959] leading-relaxed text-[15px] md:text-[17px] font-medium">{content.body}</p>
                                            {content.cta_text && (
                                                <Link
                                                    href={content.cta_link || '#'}
                                                    className="inline-flex items-center gap-2 px-10 py-4 bg-[#111] text-white rounded-full font-bold uppercase tracking-widest hover:bg-[#119AB8] transition-all text-[12px] shadow-xl hover:shadow-[#119AB8]/20 group active:scale-95"
                                                >
                                                    {content.cta_text} <ArrowRight size={18} className="group-hover:translate-x-1 transition-transform" />
                                                </Link>
                                            )}
                                        </div>
                                        {content.image && (
                                            <div className="relative aspect-[4/3] rounded-[12px] md:rounded-[16px] overflow-hidden shadow-2xl order-1 md:order-2 group">
                                                <img src={getImageUrl(content.image)} className="w-full h-full object-cover transition-transform duration-1000 group-hover:scale-105" alt="About" />
                                                <div className="absolute inset-0 bg-gradient-to-t from-[#2D4059]/40 via-transparent to-transparent opacity-60" />
                                            </div>
                                        )}
                                    </div>
                                </section>
                            );

                        case 'testimonials':
                            return (
                                <section key={section.id} className="w-full px-4 md:px-12 xl:px-20 py-6 md:py-12 bg-[#FBFBFB] border-y border-slate-100 mt-6 md:mt-10 overflow-x-hidden">
                                    <div className="mb-10 md:mb-16">
                                        <div className="flex flex-wrap items-center justify-between gap-4 mb-4">
                                            <h2 className="text-3xl md:text-4xl font-bold text-[#2D4059] tracking-tight">{content.title || "Elite Feedback"}</h2>
                                            <button
                                                onClick={() => setIsReviewOpen(true)}
                                                className="px-6 py-2.5 bg-[#111] text-white rounded-[8px] font-bold uppercase tracking-widest text-[10px] md:text-[11px] hover:bg-[#119AB8] transition-all shadow-lg flex items-center gap-2 group"
                                            >
                                                Write a Review <Plus size={16} className="group-hover:rotate-90 transition-transform" />
                                            </button>
                                        </div>
                                        <p className="text-[14px] md:text-[15px] text-[#565959] leading-relaxed max-w-2xl font-medium">
                                            {content.subtitle || ""}
                                        </p>
                                    </div>

                                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6 md:gap-8">
                                        {(content.reviews || []).map((item: any, idx: number) => (
                                            <div key={idx} className="bg-white p-8 rounded-[12px] border border-[#D5D9D9] shadow-sm relative group hover:border-[#119AB8] transition-all duration-300 flex flex-col h-full">
                                                <div className="flex gap-0.5 mb-4">
                                                    {[...Array(5)].map((_, i) => (
                                                        <Star
                                                            key={i}
                                                            size={14}
                                                            className={cn(
                                                                i < (item.rating || 5) ? "fill-[#119AB8] text-[#119AB8]" : "text-slate-200"
                                                            )}
                                                        />
                                                    ))}
                                                </div>

                                                <p className="text-[#0f1111] mb-8 font-medium text-[14px] md:text-[15px] leading-relaxed flex-1">
                                                    "{item.text}"
                                                </p>

                                                <div className="flex items-center gap-4 pt-6 border-t border-slate-50">
                                                    <div className="w-10 h-10 rounded-full bg-[#f7f8fa] border border-[#D5D9D9] flex items-center justify-center font-bold text-[#119AB8] text-[13px] overflow-hidden">
                                                        {item.image ? (
                                                            <img src={getImageUrl(item.image)} className="w-full h-full object-cover" alt={item.name} />
                                                        ) : (
                                                            item.name?.[0]
                                                        )}
                                                    </div>
                                                    <div>
                                                        <h5 className="text-[13px] font-bold text-[#0f1111] uppercase tracking-tight">{item.name}</h5>
                                                        <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">{item.role}</p>
                                                    </div>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </section>
                            );

                        case 'faq':
                            return (
                                <section key={section.id} className="w-full px-4 md:px-12 xl:px-20 py-6 md:py-12 bg-[#FBFBFB] border-y border-slate-100 mt-6 md:mt-10 overflow-x-hidden">
                                    <div className="animate-in fade-in duration-700">
                                        <div className="mb-8 md:mb-12">
                                            <h2 className="text-3xl md:text-4xl font-bold text-[#2D4059] tracking-tight leading-none mb-4">
                                                {content.title || "Common Questions"}
                                            </h2>
                                            <p className="text-[14px] md:text-[15px] text-[#565959] leading-relaxed max-w-2xl font-medium">
                                                {content.subtitle || "Everything you need to know about our professional distribution ecosystem."}
                                            </p>
                                        </div>

                                        <div className="max-w-4xl space-y-3">
                                            {(content.items || []).map((faq: any, idx: number) => (
                                                <div key={idx} className="bg-white rounded-[8px] border border-[#D5D9D9] shadow-sm overflow-hidden group hover:border-[#119AB8] transition-all duration-300">
                                                    <button
                                                        onClick={() => setOpenFaq(openFaq === idx ? null : idx)}
                                                        className={cn(
                                                            "w-full px-6 py-5 flex items-center justify-between transition-all duration-300",
                                                            openFaq === idx ? "bg-slate-50" : "bg-white"
                                                        )}
                                                    >
                                                        <span className="font-bold text-[13px] md:text-[14px] text-left text-[#0f1111] uppercase tracking-tight">{faq.q}</span>
                                                        <div className={cn(
                                                            "w-6 h-6 rounded-md flex items-center justify-center transition-all duration-300",
                                                            openFaq === idx ? "bg-[#119AB8] text-white rotate-45" : "bg-slate-50 text-slate-400"
                                                        )}>
                                                            <Plus size={16} className="stroke-[3]" />
                                                        </div>
                                                    </button>
                                                    <div className={cn(
                                                        "grid transition-all duration-300 ease-in-out",
                                                        openFaq === idx ? "grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0"
                                                    )}>
                                                        <div className="overflow-hidden">
                                                            <div className="px-6 pb-6 text-[13px] md:text-[14px] text-slate-500 font-medium leading-relaxed border-t border-slate-50 pt-4 mx-6">
                                                                {faq.a}
                                                            </div>
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
                                <section key={section.id} className="w-full px-4 md:px-12 xl:px-20 py-6 md:py-12 mt-6 md:mt-10 overflow-x-hidden">
                                    <div className="animate-in fade-in duration-700">
                                        <div className="max-w-4xl mx-auto text-center py-10">
                                            {content.title && (
                                                <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold text-[#2D4059] mb-4">
                                                    {content.title}
                                                </h2>
                                            )}
                                            {content.subtitle && (
                                                <p className="text-[14px] md:text-[16px] text-[#565959] leading-relaxed mb-12 max-w-2xl mx-auto font-medium">
                                                    {content.subtitle}
                                                </p>
                                            )}

                                            <div className="relative max-w-3xl mx-auto">
                                                <div className="flex flex-col sm:flex-row items-center bg-white rounded-[20px] sm:rounded-full shadow-[0_20px_40px_-15px_rgba(0,0,0,0.08)] p-1.5 sm:p-1 md:p-2 border border-slate-50 gap-2 sm:gap-0">
                                                    <input
                                                        type="email"
                                                        value={newsletterEmail}
                                                        onChange={(e) => setNewsletterEmail(e.target.value)}
                                                        placeholder="Enter your email address"
                                                        className="w-full sm:flex-1 bg-transparent px-4 sm:px-6 py-2 sm:py-1.5 outline-none text-[14px] text-[#2D4059] placeholder:text-slate-300 font-medium text-center sm:text-left"
                                                    />
                                                    <button
                                                        onClick={handleNewsletterSubmit}
                                                        disabled={isNewsletterSubmitting}
                                                        className="w-full sm:w-auto px-8 py-2 bg-[#56B8E6] hover:bg-[#45A7D5] text-white rounded-[15px] sm:rounded-full font-bold text-[13px] transition-all active:scale-95 shadow-md shadow-[#56B8E6]/20 disabled:opacity-50 whitespace-nowrap"
                                                    >
                                                        {isNewsletterSubmitting ? "..." : "Subscribe"}
                                                    </button>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </section>
                            );


                        case 'gallery':
                            return (
                                <section key={section.id} className="w-full px-4 md:px-12 xl:px-20 mt-6 md:mt-10 overflow-x-hidden">
                                    <div className="mb-10 md:mb-16 text-center md:text-left">
                                        <h2 className="text-3xl md:text-4xl font-bold text-[#2D4059] tracking-tight leading-none">{content.title || "Visual Showcase"}</h2>
                                        <p className="text-[14px] md:text-[15px] text-[#565959] leading-relaxed max-w-2xl font-medium">
                                            {content.subtitle || "A cinematic display of our most prestigious collections and distribution excellence across the region."}
                                        </p>
                                    </div>
                                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 md:gap-6 h-[400px] md:h-[600px]">
                                        {(content.items || []).slice(0, 4).map((img: any, idx: number) => (
                                            <div key={idx} className={cn(
                                                "relative rounded-[8px] md:rounded-[12px] overflow-hidden group shadow-xl",
                                                idx === 0 && "md:col-span-2 md:row-span-2",
                                                idx === 1 && "md:col-span-2",
                                            )}>
                                                <img src={getImageUrl(img.image || img.url)} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-1000" alt="Gallery" />
                                                <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity p-6 flex flex-col justify-end">
                                                    <p className="text-white font-black uppercase tracking-widest text-[10px] md:text-xs">{img.title || "View Detail"}</p>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </section>
                            );

                        case 'video':
                            return (
                                <section key={section.id} className="w-full px-4 md:px-12 xl:px-20 py-6 md:py-10 bg-[#FBFBFB] border-y border-slate-100 mt-6 md:mt-10 overflow-x-hidden">
                                    <div className="max-w-7xl mx-auto">
                                        <div className="mb-10 md:mb-16 text-center md:text-left space-y-4">
                                            <div className="space-y-3">
                                                <h2 className="text-3xl md:text-4xl font-bold text-[#2D4059] tracking-tight leading-none">{content.title || "Watch Our Story"}</h2>
                                                <div className="h-1 w-12 bg-[#119AB8] rounded-full mx-auto md:mx-0" />
                                            </div>
                                            <p className="text-[14px] md:text-[15px] text-[#565959] leading-relaxed max-w-2xl font-medium">
                                                {content.subtitle || "A cinematic journey through our professional distribution network and our commitment to cosmetic excellence."}
                                            </p>
                                        </div>

                                        <div className="relative aspect-video w-full rounded-[12px] md:rounded-[20px] overflow-hidden shadow-[0_20px_50px_rgba(0,0,0,0.15)] group border-4 border-white bg-slate-900">
                                            {content.url ? (
                                                <iframe
                                                    src={content.url.replace('watch?v=', 'embed/')}
                                                    className="w-full h-full border-0"
                                                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                                                    allowFullScreen
                                                />
                                            ) : (
                                                <div className="w-full h-full bg-slate-100 flex items-center justify-center">
                                                    <div className="text-center space-y-4">
                                                        <div className="w-20 h-20 bg-white rounded-full flex items-center justify-center mx-auto shadow-lg">
                                                            <Coffee className="text-[#13B0D1]" size={32} />
                                                        </div>
                                                        <p className="text-slate-400 font-bold uppercase tracking-widest text-[10px]">Video Experience Coming Soon</p>
                                                    </div>
                                                </div>
                                            )}



                                            {/* Play Overlay Decorator */}
                                            {!content.url && (
                                                <div className="absolute inset-0 bg-black/5 flex items-center justify-center pointer-events-none">
                                                    <div className="w-16 h-16 md:w-24 md:h-24 bg-white/20 backdrop-blur-md rounded-full flex items-center justify-center border border-white/30">
                                                        <div className="w-0 h-0 border-t-[10px] border-t-transparent border-l-[20px] border-l-white border-b-[10px] border-b-transparent ml-2" />
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </section>
                            );

                        case 'promotion':
                            const promoProductIds = Array.isArray(content.product_ids) ? content.product_ids : (content.product_id ? [content.product_id] : []);
                            const promoProducts = allProducts.filter(p => promoProductIds.some((sid: any) => String(sid) === String(p.id)));
                            const promoProduct = promoProducts[0];

                            return (
                                <section key={section.id} className={cn(
                                    "w-full px-4 md:px-12 xl:px-20 pb-4 md:pb-16 pt-2 md:pt-4 -mt-16 md:-mt-10 relative z-10 overflow-hidden",
                                    // Hidden on desktop because it is shown as an overlay on the hero instead
                                    heroPromoProduct && heroPromoSection && section.id === heroPromoSection.id && "lg:hidden"
                                )}>
                                    <motion.div
                                        initial={{ opacity: 0 }}

                                        whileInView={{ opacity: 1 }}
                                        viewport={{ once: true }}
                                        className="relative grid md:grid-cols-2 overflow-hidden group min-h-[200px] md:min-h-[340px]"
                                    >
                                        <div className="relative overflow-hidden bg-white flex items-center justify-center p-4 min-h-[200px] md:min-h-auto">
                                            <div className="absolute inset-0 opacity-[0.02] flex items-center justify-center pointer-events-none">
                                                <Sparkles size={300} className="text-[#119AB8]" />
                                            </div>

                                            {promoProducts.length > 1 ? (
                                                <div className="grid grid-cols-2 gap-3 w-full h-full relative z-10">
                                                    {promoProducts.slice(0, 4).map((p, idx) => (
                                                        <motion.div
                                                            key={p.id}
                                                            whileHover={{ scale: 1.05 }}
                                                            className="relative aspect-square bg-slate-50 rounded-xl overflow-hidden border border-slate-100 shadow-sm"
                                                        >
                                                            <img
                                                                src={getImageUrl(p.image || p.catalog_image || p.image_url)}
                                                                className="w-full h-full object-contain p-3"
                                                                alt={p.name}
                                                            />
                                                            <div className="absolute bottom-1 right-1 bg-white/95 backdrop-blur-md px-2 py-0.5 rounded-lg text-[8px] font-black text-[#111] shadow-sm">
                                                                Rs. {parseFloat(p.selling_price || p.price || 0).toLocaleString()}
                                                            </div>
                                                            <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/60 to-transparent p-2 opacity-0 group-hover/item:opacity-100 transition-opacity">
                                                                <p className="text-[7px] text-white font-bold truncate uppercase">{p.name}</p>
                                                            </div>
                                                        </motion.div>
                                                    ))}
                                                </div>
                                            ) : (
                                                <div className="relative w-full h-full flex items-center justify-center group/promo">
                                                    <motion.img
                                                        whileHover={{ scale: 1.05 }}
                                                        transition={{ duration: 1.5 }}
                                                        src={getImageUrl(content.image || promoProduct?.image || promoProduct?.catalog_image || promoProduct?.image_url) || ''}
                                                        className="absolute inset-0 w-full h-full object-cover"
                                                        alt={content.title || promoProduct?.product_name || "Promotion"}
                                                        onError={(e: any) => { e.target.style.display = 'none'; }}
                                                    />

                                                    <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/30 to-transparent hidden md:flex flex-col justify-end p-8 opacity-0 group-hover/promo:opacity-100 transition-all duration-500 transform translate-y-4 group-hover/promo:translate-y-0">
                                                        <h3 className="text-white text-2xl md:text-3xl font-black tracking-tighter drop-shadow-2xl mb-1">
                                                            {promoProduct?.product_name || content.title}
                                                        </h3>
                                                        <p className="text-[#D4AF37] text-[10px] md:text-xs font-bold uppercase tracking-[0.2em] line-clamp-2">
                                                            {promoProduct?.description || content.subtitle}
                                                        </p>
                                                    </div>

                                                    {/* Mobile view permanent overlay at the bottom of the image */}
                                                    {promoProduct && promoProducts.length === 1 && (
                                                        <div className="absolute bottom-0 inset-x-0 bg-gradient-to-t from-black/95 via-black/50 to-transparent p-5 pt-12 hidden flex-col gap-1 z-10 text-left">
                                                            <h3 className="text-white text-lg font-black tracking-tight drop-shadow-md">
                                                                {promoProduct.product_name}
                                                            </h3>
                                                            <div className="flex flex-wrap gap-1.5 mt-0.5">
                                                                {promoProduct.weight && (
                                                                    <span className="px-2 py-0.5 bg-white/10 backdrop-blur-md rounded text-[9px] font-bold text-white uppercase tracking-wider border border-white/10">
                                                                        {promoProduct.weight}
                                                                    </span>
                                                                )}
                                                                {(promoProduct.size || promoProduct.type) && (
                                                                    <span className="px-2 py-0.5 bg-white/10 backdrop-blur-md rounded text-[9px] font-bold text-white uppercase tracking-wider border border-white/10">
                                                                        {promoProduct.size || promoProduct.type}
                                                                    </span>
                                                                )}
                                                                <span className="px-2 py-0.5 bg-[#119AB8]/20 backdrop-blur-md rounded text-[9px] font-black text-[#4ad7f5] uppercase tracking-wider border border-[#119AB8]/30">
                                                                    {promoProduct.category_name || "Cosmetics"}
                                                                </span>
                                                            </div>
                                                        </div>
                                                    )}
                                                    {/* Price badge — inside group/promo, same as working bottom overlay */}
                                                    {promoProduct && promoProducts.length === 1 && (
                                                        <div className="absolute top-3 right-0 z-50">
                                                            <div className="px-4 py-2 bg-[#13B0D1] text-white rounded-l-xl shadow-2xl border-y border-l border-white/20 font-black tracking-widest text-sm">
                                                                Rs. {parseFloat(promoProduct.selling_price || promoProduct.price || 0).toLocaleString()}
                                                            </div>
                                                        </div>
                                                    )}

                                                    {/* Discount badge */}
                                                    {content.discount_percent && (
                                                        <div className="absolute top-14 right-0 z-50">
                                                            <div className="px-4 py-1.5 bg-[#e77600] text-white rounded-l-xl shadow-2xl border-y border-l border-white/20 font-black text-[10px] uppercase tracking-widest">
                                                                {content.discount_percent}% OFF
                                                            </div>
                                                        </div>
                                                    )}
                                                </div>
                                            )}

                                            <div className="absolute inset-0 bg-gradient-to-tr from-white/10 via-transparent to-transparent pointer-events-none" />
                                        </div>

                                        <div className="absolute md:relative inset-x-0 bottom-0 z-30 px-5 pb-4 pt-12 md:mt-0 md:p-12 lg:p-16 flex flex-col justify-end md:justify-center space-y-2 md:space-y-6 bg-gradient-to-t from-black/95 via-black/60 to-transparent md:bg-none md:bg-transparent">
                                            <div className="absolute top-10 md:top-4 right-10 md:right-24 z-40 hidden md:flex flex-col items-center min-h-[150px] md:min-h-[200px] scale-[0.78] md:scale-100 origin-top-right">
                                                <motion.div
                                                    initial={{ y: -100, rotate: -40 }}
                                                    whileInView={{ y: 0 }}
                                                    animate={{
                                                        rotate: 40,
                                                        y: [0, 2, 0]
                                                    }}
                                                    transition={{
                                                        rotate: { duration: 2.5, repeat: Infinity, repeatType: "mirror", ease: "easeInOut" },
                                                        y: { duration: 1.25, repeat: Infinity, repeatType: "mirror", ease: "easeInOut" }
                                                    }}
                                                    style={{ originX: "50%", originY: "0px" }}
                                                    className="mt-[6px] flex flex-col items-center pointer-events-none group z-40"
                                                >
                                                    <div className="w-[1.5px] h-12 bg-slate-400 shadow-sm" />
                                                    <div className="relative w-24 md:w-32 aspect-square drop-shadow-[0_15px_30px_rgba(0,0,0,0.4)]">
                                                        <div className="absolute inset-0 bg-[#D4AF37] shadow-xl"
                                                            style={{
                                                                clipPath: 'polygon(50% 0%, 64% 6%, 78% 0%, 82% 14%, 96% 18%, 91% 32%, 100% 45%, 91% 58%, 96% 72%, 82% 76%, 78% 90%, 64% 84%, 50% 100%, 36% 84%, 22% 90%, 18% 76%, 4% 72%, 9% 58%, 0% 45%, 9% 32%, 4% 18%, 18% 14%, 22% 0%, 36% 6%)'
                                                            }}>
                                                            <div className="absolute inset-[4px] bg-[#C41E3A] rounded-full border-2 border-white/20 flex flex-col items-center justify-center p-2 text-center">
                                                                <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(255,215,0,0.2),transparent)]" />
                                                                <span className="text-[#FFD700] text-[7px] md:text-[9px] font-black uppercase tracking-[0.3em] leading-none mb-1">
                                                                    Limited Time
                                                                </span>
                                                                <span className="text-white text-[10px] md:text-[14px] font-black uppercase tracking-tighter leading-tight drop-shadow-lg">
                                                                    Special<br />Offer
                                                                </span>
                                                                <div className="mt-1 h-[1px] w-6 bg-[#FFD700]/50" />
                                                            </div>
                                                        </div>
                                                    </div>
                                                </motion.div>
                                                <div className="absolute top-0 left-1/2 -translate-x-1/2 w-3 h-3 bg-gradient-to-br from-slate-300 via-slate-500 to-slate-700 rounded-full shadow-[0_2px_4px_rgba(0,0,0,0.3)] border border-slate-400 z-50">
                                                    <div className="absolute top-0.5 left-0.5 w-1 h-1 bg-white/30 rounded-full" />
                                                </div>
                                            </div>
                                            <div className="space-y-4">
                                                <div className="hidden md:flex items-center gap-3">
                                                    <div className="h-[2px] w-8 bg-[#119AB8]" />
                                                    <span className="text-[9px] font-bold text-[#119AB8] uppercase tracking-[0.4em]">
                                                        {promoProducts.length > 1 ? `Selective Portfolio (${promoProducts.length})` : "Featured Essential"}
                                                    </span>
                                                </div>

                                                <h2 className="text-2xl md:text-4xl lg:text-5xl font-bold text-white md:text-[#2D4059] leading-tight tracking-tight drop-shadow-lg md:drop-shadow-none">
                                                    {content.title || (promoProducts.length > 1 ? "Premium Series" : promoProduct?.product_name) || "Special Offer"}
                                                </h2>

                                                <p className="text-[13px] md:text-[15px] text-white/85 md:text-[#565959] leading-relaxed border-l-4 border-[#119AB8]/60 md:border-[#119AB8]/20 pl-4 font-medium">
                                                    {promoProducts.length === 1 && promoProduct
                                                        ? [
                                                            (promoProduct.product_name || promoProduct.name || '').replace(/\s*\(.*?\)\s*$/, '').trim(),
                                                            promoProduct.weight || promoProduct.size || promoProduct.type
                                                          ].filter(Boolean).join(' • ')
                                                        : (content.subtitle || "A curated collection of our most requested professional products.")}
                                                </p>

                                                {/* Write a Review Modal */}
                                                <AnimatePresence>
                                                    {isReviewOpen && (
                                                        <motion.div
                                                            initial={{ opacity: 0 }}
                                                            animate={{ opacity: 1 }}
                                                            exit={{ opacity: 0 }}
                                                            className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
                                                        >
                                                            <motion.div
                                                                initial={{ scale: 0.95, opacity: 0, y: 20 }}
                                                                animate={{ scale: 1, opacity: 1, y: 0 }}
                                                                exit={{ scale: 0.95, opacity: 0, y: 20 }}
                                                                className="bg-white w-full max-w-xl rounded-[16px] overflow-hidden shadow-2xl"
                                                            >
                                                                <div className="bg-[#119AB8] p-6 text-white flex items-center justify-between">
                                                                    <div>
                                                                        <h3 className="text-xl font-bold uppercase tracking-tight">Submit Your Review</h3>
                                                                        <p className="text-white/80 text-[10px] uppercase tracking-widest font-bold">We value your professional feedback</p>
                                                                    </div>
                                                                    <button onClick={() => setIsReviewOpen(false)} className="text-white/80 hover:text-white transition-all">
                                                                        <X size={24} />
                                                                    </button>
                                                                </div>

                                                                <form className="p-6 space-y-5" onSubmit={handleReviewSubmit}>
                                                                    <div className="space-y-4">
                                                                        <div className="grid grid-cols-2 gap-4">
                                                                            <div className="space-y-1.5">
                                                                                <label className="text-[10px] font-bold uppercase text-slate-500 tracking-wider">Rating</label>
                                                                                <div className="flex gap-1">
                                                                                    {[1, 2, 3, 4, 5].map((star) => (
                                                                                        <button key={star} type="button" onClick={() => setRating(star)} disabled={isSubmitting}>
                                                                                            <Star size={20} className={cn(star <= rating ? "fill-[#119AB8] text-[#119AB8]" : "text-slate-200")} />
                                                                                        </button>
                                                                                    ))}
                                                                                </div>
                                                                            </div>
                                                                            <div className="space-y-1.5">
                                                                                <label className="text-[10px] font-bold uppercase text-slate-500 tracking-wider">Full Name</label>
                                                                                <input
                                                                                    required
                                                                                    value={reviewName}
                                                                                    onChange={(e) => setReviewName(e.target.value)}
                                                                                    placeholder="Name"
                                                                                    disabled={isSubmitting}
                                                                                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg outline-none focus:border-[#119AB8] transition-all text-[13px]"
                                                                                />
                                                                            </div>
                                                                        </div>

                                                                        <div className="space-y-1.5">
                                                                            <label className="text-[10px] font-bold uppercase text-slate-500 tracking-wider">Your Experience</label>
                                                                            <textarea
                                                                                required
                                                                                value={reviewText}
                                                                                onChange={(e) => setReviewText(e.target.value)}
                                                                                rows={3}
                                                                                placeholder="Write your review here..."
                                                                                disabled={isSubmitting}
                                                                                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg outline-none focus:border-[#119AB8] transition-all text-[13px] resize-none"
                                                                            />
                                                                        </div>

                                                                        <div className="space-y-1.5">
                                                                            <label className="text-[10px] font-bold uppercase text-slate-500 tracking-wider">Upload Photo</label>
                                                                            <label htmlFor="review-photo" className="flex items-center justify-center gap-2 p-2.5 border border-dashed border-slate-200 rounded-lg cursor-pointer hover:border-[#119AB8] hover:bg-[#119AB8]/5 transition-all group">
                                                                                <input type="file" className="hidden" id="review-photo" accept="image/*" disabled={isSubmitting} />
                                                                                <ImageIcon size={16} className="text-slate-400 group-hover:text-[#119AB8]" />
                                                                                <span className="text-[11px] font-bold text-slate-500 group-hover:text-[#119AB8] uppercase tracking-tight">Click to select image</span>
                                                                            </label>
                                                                        </div>
                                                                    </div>

                                                                    <button
                                                                        type="submit"
                                                                        disabled={isSubmitting}
                                                                        className="w-full py-3.5 bg-[#119AB8] text-white rounded-lg font-bold uppercase tracking-widest text-[11px] hover:bg-[#0e7e96] transition-all shadow-lg active:scale-[0.99] flex items-center justify-center gap-2"
                                                                    >
                                                                        {isSubmitting ? (
                                                                            <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                                                        ) : null}
                                                                        {isSubmitting ? "Submitting..." : "Submit Review"}
                                                                    </button>
                                                                </form>
                                                            </motion.div>
                                                        </motion.div>
                                                    )}
                                                </AnimatePresence>

                                                {promoProducts.length === 1 && promoProduct && (
                                                    <div className="hidden md:flex flex-wrap gap-3 pt-1">
                                                        {promoProduct.weight && (
                                                            <div className="bg-slate-50 px-3 py-1 rounded-lg border border-slate-100">
                                                                <p className="text-[8px] text-slate-400 font-bold uppercase tracking-widest">Weight</p>
                                                                <p className="text-[10px] font-black text-[#111]">{promoProduct.weight}</p>
                                                            </div>
                                                        )}
                                                        {(promoProduct.size || promoProduct.type) && (
                                                            <div className="bg-slate-50 px-3 py-1 rounded-lg border border-slate-100">
                                                                <p className="text-[8px] text-slate-400 font-bold uppercase tracking-widest">Type</p>
                                                                <p className="text-[10px] font-black text-[#111]">{promoProduct.size || promoProduct.type}</p>
                                                            </div>
                                                        )}
                                                        <div className="bg-[#119AB8]/5 px-3 py-1 rounded-lg border border-[#119AB8]/10">
                                                            <p className="text-[8px] text-[#119AB8] font-bold uppercase tracking-widest">Category</p>
                                                            <p className="text-[10px] font-black text-[#111]">{promoProduct.category_name || "Cosmetics"}</p>
                                                        </div>
                                                    </div>
                                                )}

                                                <div className="hidden md:flex items-center gap-4">
                                                    {content.discount_percent && (
                                                        <div className="px-3 py-1 bg-[#e77600] text-white font-black text-[9px] uppercase tracking-widest rounded-full shadow-lg">
                                                            {content.discount_percent}% OFF
                                                        </div>
                                                    )}
                                                </div>
                                            </div>

                                            <div className="pt-0 md:pt-2 flex flex-col sm:flex-row items-center gap-4">
                                                <button
                                                    onClick={() => {
                                                        if (promoProduct) {
                                                            addToCart({
                                                                id: promoProduct.id,
                                                                name: promoProduct.product_name,
                                                                price: promoProduct.selling_price || promoProduct.price,
                                                                quantity: 1,
                                                                image: promoProduct.image || promoProduct.catalog_image || promoProduct.image_url,
                                                                category: promoProduct.category_name || 'Promotion'
                                                            });
                                                            router.push('/customer/checkout');
                                                        } else {
                                                            router.push('/customer/shop');
                                                        }
                                                    }}
                                                    className="w-full sm:w-auto h-12 px-10 bg-gradient-to-r from-[#0E8AA6] via-[#13B0D1] to-[#0E8AA6] text-white rounded-[4px] font-bold uppercase tracking-widest text-[10px] transition-all hover:shadow-xl hover:shadow-[#13B0D1]/30 active:scale-95 group/btn flex items-center justify-center"
                                                >
                                                    {content.cta_text || "Avail Deal"}
                                                </button>

                                                {promoProducts.length > 1 && (
                                                    <div className="flex -space-x-2">
                                                        {promoProducts.slice(0, 3).map((p, i) => (
                                                            <div key={p.id} className="w-8 h-8 rounded-full border-2 border-white bg-slate-100 overflow-hidden shadow-sm">
                                                                <img src={getImageUrl(p.image || p.catalog_image)} className="w-full h-full object-cover" alt="Selected" />
                                                            </div>
                                                        ))}
                                                        {promoProducts.length > 3 && (
                                                            <div className="w-8 h-8 rounded-full border-2 border-white bg-[#119AB8] flex items-center justify-center text-[9px] text-white font-bold">
                                                                +{promoProducts.length - 3}
                                                            </div>
                                                        )}
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    </motion.div>
                                </section>
                            );

                        case 'categories':
                            return (
                                <section key={section.id} className="w-full px-4 md:px-12 xl:px-20 py-8 md:py-16 bg-[#FBFBFB] border-y border-slate-100 mt-6 md:mt-10 overflow-x-hidden">
                                    <div className="max-w-7xl mx-auto">
                                        <div className="mb-10 md:mb-16 text-center md:text-left">
                                            <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold text-[#2D4059] tracking-tight leading-none">{content.title || "Shop by Department"}</h2>
                                            <div className="h-1 w-12 bg-[#119AB8] rounded-full mx-auto md:mx-0 mt-4 mb-6" />
                                            <p className="text-[14px] md:text-[15px] text-[#565959] leading-relaxed max-w-2xl font-medium">
                                                {content.subtitle || "Discover our specialized categories curated for professional distribution and individual beauty needs."}
                                            </p>
                                        </div>
                                        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4 md:gap-8">
                                            {(content.items || []).map((cat: any, idx: number) => (
                                                <Link key={idx} href={`/customer/shop?category=${cat.name}`} className="group relative aspect-square rounded-[24px] overflow-hidden shadow-xl hover:shadow-[#119AB8]/20 transition-all active:scale-95 border-4 border-white">
                                                    <img src={getImageUrl(cat.image)} className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110" alt={cat.name} />
                                                    <div className="absolute inset-0 bg-gradient-to-t from-[#111]/80 via-transparent to-transparent flex flex-col justify-end p-5">
                                                        <h3 className="text-white text-sm font-black uppercase tracking-widest">{cat.name}</h3>
                                                        <div className="h-0.5 w-0 group-hover:w-full bg-[#119AB8] transition-all duration-300" />
                                                    </div>
                                                </Link>
                                            ))}
                                        </div>
                                    </div>
                                </section>
                            );

                        case 'brands':
                            const brandLogos = content.logos || [];
                            return (
                                <section key={section.id} className="w-full mt-10 md:mt-16 py-12 md:py-16 bg-transparent border-y border-slate-200/50 overflow-hidden relative">
                                    <div className="max-w-7xl mx-auto px-4 md:px-12 xl:px-20">
                                        <div className="flex items-center justify-center gap-4 mb-10 md:mb-14">
                                            <div className="h-px w-12 md:w-24 bg-gradient-to-r from-transparent to-slate-300" />
                                            <h2 className="text-[10px] md:text-[11px] font-black text-slate-400 uppercase tracking-[0.5em]">{content.title || "OUR ELITE PARTNERS"}</h2>
                                            <div className="h-px w-12 md:w-24 bg-gradient-to-l from-transparent to-slate-300" />
                                        </div>
                                    </div>

                                    {/* Gradient Masks for smooth fading edges */}
                                    <div className="absolute top-0 bottom-0 left-0 w-24 md:w-64 bg-gradient-to-r from-[#F8FAFC] dark:from-[#0F172A] to-transparent z-10 pointer-events-none" />
                                    <div className="absolute top-0 bottom-0 right-0 w-24 md:w-64 bg-gradient-to-l from-[#F8FAFC] dark:from-[#0F172A] to-transparent z-10 pointer-events-none" />

                                    <style dangerouslySetInnerHTML={{
                                        __html: `
                                            @keyframes marquee-scroll { 0% { transform: translateX(0); } 100% { transform: translateX(-33.3333%); } }
                                            .marquee-inner { display: flex; width: max-content; animation: marquee-scroll 35s linear infinite; }
                                            .marquee-inner:hover { animation-play-state: paused; }
                                        `}} />
                                    <div className="relative flex w-full overflow-hidden">
                                        <div className="marquee-inner whitespace-nowrap">
                                            {[1, 2, 3].map((loop) => (
                                                <div key={loop} className="flex items-center justify-center gap-16 md:gap-32 px-8 md:px-16">
                                                    {brandLogos.length > 0 ? brandLogos.map((logo: string, i: number) => (
                                                        <div key={i} className="flex items-center justify-center w-32 md:w-48 h-16 group cursor-pointer">
                                                            <img src={getImageUrl(logo)} className="max-h-full max-w-full object-contain opacity-40 grayscale group-hover:opacity-100 group-hover:grayscale-0 group-hover:scale-105 transition-all duration-500" alt="Brand Logo" />
                                                        </div>
                                                    )) : null}
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                </section>
                            );

                        case 'stats':
                            return (
                                <section key={section.id} className="w-full px-4 md:px-12 xl:px-20 mt-10 md:mt-16 overflow-x-hidden">
                                    <div className="max-w-7xl mx-auto bg-[#0d1117] rounded-[24px] md:rounded-[32px] overflow-hidden relative shadow-[0_40px_120px_-20px_rgba(0,0,0,0.2)] py-12 md:py-20 border border-slate-800">
                                        {/* Decorative Background Elements */}
                                        <div className="absolute top-0 left-1/4 w-96 h-96 bg-[#119AB8]/20 rounded-full blur-[100px] -translate-y-1/2 pointer-events-none" />
                                        <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-[#119AB8]/10 rounded-full blur-[100px] translate-y-1/2 pointer-events-none" />

                                        <div className="relative z-10 grid grid-cols-2 md:grid-cols-4 gap-y-12 gap-x-6 md:gap-8 px-6">
                                            {(content.items || []).map((item: any, idx: number) => (
                                                <div key={idx} className="text-center space-y-4 relative group">
                                                    {/* Divider between columns (hidden on mobile for 2x2 grid, visible on desktop) */}
                                                    {idx !== 0 && (
                                                        <div className="hidden md:block absolute top-1/2 -left-4 md:-left-4 w-px h-16 bg-slate-800 -translate-y-1/2 group-hover:bg-[#119AB8]/50 transition-colors duration-500" />
                                                    )}
                                                    <motion.h3
                                                        initial={{ opacity: 0, y: 20 }}
                                                        whileInView={{ opacity: 1, y: 0 }}
                                                        viewport={{ once: true }}
                                                        transition={{ delay: idx * 0.1, duration: 0.6 }}
                                                        className="text-4xl md:text-5xl lg:text-6xl font-black text-white tracking-tighter group-hover:text-[#119AB8] transition-colors duration-300"
                                                    >
                                                        {item.value}
                                                    </motion.h3>
                                                    <p className="text-[9px] md:text-[11px] font-black text-slate-400 uppercase tracking-[0.4em] group-hover:text-slate-200 transition-colors duration-300">
                                                        {item.label}
                                                    </p>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                </section>
                            );


                        case 'features':
                            const featureIconMap: Record<string, React.ReactNode> = {
                                truck: <Truck size={22} className="text-[#119AB8]" />,
                                shield: <ShieldCheck size={22} className="text-[#119AB8]" />,
                                clock: <Clock size={22} className="text-[#119AB8]" />,
                                credit: <CreditCard size={22} className="text-[#119AB8]" />,
                                star: <Star size={22} className="text-[#119AB8]" />,
                                check: <Check size={22} className="text-[#119AB8]" />,
                                users: <Users size={22} className="text-[#119AB8]" />,
                                globe: <Globe size={22} className="text-[#119AB8]" />,
                                heart: <Heart size={22} className="text-[#119AB8]" />,
                                sparkles: <Sparkles size={22} className="text-[#119AB8]" />,
                                zap: <Zap size={22} className="text-[#119AB8]" />,
                                default: <ShieldCheck size={22} className="text-[#119AB8]" />,
                            };
                            const featItems = content.items || [];
                            return (
                                <section key={section.id} className="w-full px-4 md:px-12 xl:px-20 py-10 md:py-16 mt-6 md:mt-10 overflow-x-hidden">
                                    <div className="max-w-7xl mx-auto">
                                        <div className="grid lg:grid-cols-[400px_1fr] gap-12 md:gap-20 items-start">

                                            {/* ── Left: Dark Info Panel ── */}
                                            <div className="lg:sticky lg:top-24 space-y-10">
                                                <div className="space-y-6">
                                                    <span className="inline-flex items-center gap-2 px-4 py-1.5 bg-[#119AB8]/10 text-[#119AB8] rounded-full text-[10px] font-black uppercase tracking-[0.4em] border border-[#119AB8]/20">
                                                        <Sparkles size={10} /> {content.badge || 'The Premium Edge'}
                                                    </span>
                                                    <h2 className="text-2xl sm:text-4xl md:text-5xl font-black text-[#111] tracking-tighter leading-[1.05]">
                                                        {content.title || 'Why Professionals Choose Us'}
                                                    </h2>
                                                    <p className="text-[#565959] text-[15px] leading-relaxed font-medium max-w-sm">
                                                        Every feature we build is designed around one goal: making your business faster, safer, and more profitable.
                                                    </p>
                                                </div>

                                                {/* Decorative divider */}
                                                <div className="flex items-center gap-4">
                                                    <div className="h-px flex-1 bg-gradient-to-r from-[#119AB8] to-transparent" />
                                                    <div className="w-2 h-2 rounded-full bg-[#119AB8] shrink-0" />
                                                </div>

                                                {/* Trust Counters */}
                                                <div className="grid grid-cols-2 gap-4">
                                                    {[
                                                        { value: '10K+', label: 'Happy Clients' },
                                                        { value: '99%', label: 'Satisfaction Rate' },
                                                        { value: '500+', label: 'Product SKUs' },
                                                        { value: '24h', label: 'Order Processing' },
                                                    ].map((stat, i) => (
                                                        <div key={i} className="bg-slate-50 border border-slate-100 rounded-2xl p-5 hover:border-[#119AB8]/30 hover:bg-white transition-all group">
                                                            <p className="text-2xl font-black text-[#111] group-hover:text-[#119AB8] transition-colors">{stat.value}</p>
                                                            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">{stat.label}</p>
                                                        </div>
                                                    ))}
                                                </div>

                                                {/* CTA */}
                                                <Link
                                                    href="/customer/shop"
                                                    className="inline-flex items-center gap-3 px-8 py-4 bg-[#111] hover:bg-[#119AB8] text-white rounded-2xl font-black text-[12px] uppercase tracking-widest transition-all duration-300 shadow-xl shadow-black/10 group"
                                                >
                                                    Explore Our Store
                                                    <ArrowRight size={16} className="group-hover:translate-x-1 transition-transform" />
                                                </Link>
                                            </div>

                                            {/* ── Right: Feature Cards ── */}
                                            <div className="grid sm:grid-cols-2 gap-5 md:gap-6">
                                                {featItems.map((item: any, idx: number) => {
                                                    const iconKey = (item.icon || 'default').toLowerCase();
                                                    const iconEl = featureIconMap[iconKey] || featureIconMap['default'];
                                                    return (
                                                        <motion.div
                                                            key={idx}
                                                            initial={{ opacity: 0, y: 20 }}
                                                            whileInView={{ opacity: 1, y: 0 }}
                                                            viewport={{ once: true }}
                                                            transition={{ delay: idx * 0.07, duration: 0.5 }}
                                                            className={cn(
                                                                "relative group p-7 md:p-8 rounded-[20px] border transition-all duration-300 overflow-hidden cursor-default",
                                                                "bg-white border-slate-100 hover:border-[#119AB8]/40 hover:shadow-2xl hover:shadow-[#119AB8]/8",
                                                                // Make the first card span full width if odd total
                                                                idx === 0 && featItems.length % 2 !== 0 ? "sm:col-span-2" : ""
                                                            )}
                                                        >
                                                            {/* Hover glow */}
                                                            <div className="absolute inset-0 bg-gradient-to-br from-[#119AB8]/[0.03] to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none" />

                                                            {/* Number badge */}
                                                            <div className="absolute top-5 right-5 w-8 h-8 rounded-xl bg-slate-50 group-hover:bg-[#119AB8]/10 flex items-center justify-center transition-colors">
                                                                <span className="text-[10px] font-black text-slate-300 group-hover:text-[#119AB8] transition-colors">
                                                                    {String(idx + 1).padStart(2, '0')}
                                                                </span>
                                                            </div>

                                                            {/* Icon */}
                                                            <div className="w-12 h-12 rounded-2xl bg-[#119AB8]/8 border border-[#119AB8]/15 flex items-center justify-center mb-6 group-hover:scale-110 transition-transform duration-300">
                                                                {iconEl}
                                                            </div>

                                                            {/* Text */}
                                                            <h3 className="text-[17px] font-black text-[#111] mb-3 tracking-tight leading-tight group-hover:text-[#119AB8] transition-colors">
                                                                {item.title}
                                                            </h3>
                                                            <p className="text-[13px] text-[#565959] leading-relaxed font-medium">
                                                                {item.text}
                                                            </p>

                                                            {/* Bottom accent line */}
                                                            <div className="absolute bottom-0 left-0 h-0.5 w-0 group-hover:w-full bg-gradient-to-r from-[#119AB8] to-[#0d87a3] transition-all duration-500 rounded-b-full" />
                                                        </motion.div>
                                                    );
                                                })}
                                            </div>
                                        </div>
                                    </div>
                                </section>
                            );

                        case 'steps':
                            return (
                                <section key={section.id} className="w-full px-4 md:px-12 xl:px-20 py-8 md:py-16 bg-[#FBFBFB] border-y border-slate-100 mt-6 md:mt-10 overflow-x-hidden">
                                    <div className="max-w-7xl mx-auto">
                                        <div className="text-center mb-12 md:mb-20">
                                            <h2 className="text-2xl sm:text-3xl md:text-5xl font-bold text-[#2D4059] tracking-tight">{content.title || "How It Works"}</h2>
                                            <div className="h-1 w-12 bg-[#119AB8] rounded-full mx-auto mt-4" />
                                        </div>
                                        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
                                            {(content.items || []).map((item: any, idx: number) => (
                                                <div key={idx} className="relative text-center">
                                                    <div className="w-16 h-16 md:w-20 md:h-20 bg-[#111] text-white rounded-full flex items-center justify-center mx-auto text-xl md:text-2xl font-black mb-6 md:mb-8 shadow-2xl relative z-10 border-4 border-white">
                                                        {idx + 1}
                                                    </div>
                                                    {idx < (content.items.length - 1) && (
                                                        <div className="hidden md:block absolute top-10 left-[60%] w-full h-[2px] bg-slate-200 border-t-2 border-dashed border-slate-200 -z-0" />
                                                    )}
                                                    <h3 className="text-lg font-bold text-[#111] mb-3">{item.title}</h3>
                                                    <p className="text-slate-500 text-[13px] px-4 leading-relaxed font-medium">{item.text}</p>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                </section>
                            );

                        case 'banner_split':
                            return (
                                <section key={section.id} className="w-full px-4 md:px-12 xl:px-20 py-4 md:py-8 mt-6 md:mt-10 overflow-x-hidden">
                                    <div className={cn("max-w-7xl mx-auto flex flex-col md:flex-row min-h-[400px] md:min-h-[600px] rounded-[24px] md:rounded-[40px] overflow-hidden shadow-2xl", content.reversed && "md:flex-row-reverse")}>
                                        <div className="flex-1 bg-[#111] p-10 md:p-16 flex flex-col justify-center space-y-6 md:space-y-8">
                                            <div className="flex items-center gap-3">
                                                <div className="h-[2px] w-8 bg-[#119AB8]" />
                                                <span className="text-[9px] font-black text-[#119AB8] uppercase tracking-[0.5em]">Exclusive Series</span>
                                            </div>
                                            <h2 className="text-2xl sm:text-3xl md:text-5xl font-bold text-white tracking-tight leading-tight">{content.title}</h2>
                                            <p className="text-slate-400 text-[15px] md:text-[17px] leading-relaxed max-w-xl font-medium">{content.body}</p>
                                            <div className="pt-4">
                                                <Link href="/customer/shop" className="px-10 py-4 bg-[#119AB8] text-white rounded-full font-black uppercase tracking-widest hover:bg-white hover:text-[#111] transition-all inline-block shadow-2xl text-[12px]">
                                                    Discover Collection
                                                </Link>
                                            </div>
                                        </div>
                                        <div className="flex-1 relative min-h-[300px]">
                                            <img src={getImageUrl(content.image)} className="absolute inset-0 w-full h-full object-cover" alt="Banner" />
                                            <div className="absolute inset-0 bg-gradient-to-t from-black/40 to-transparent" />
                                        </div>
                                    </div>
                                </section>
                            );

                        case 'parallax':
                            return (
                                <section key={section.id} className="w-full px-4 md:px-12 xl:px-20 py-4 md:py-8 mt-6 md:mt-10 overflow-x-hidden">
                                    <div className="max-w-7xl mx-auto relative h-[400px] md:h-[550px] overflow-hidden flex items-center justify-center rounded-[24px] md:rounded-[40px] shadow-2xl">
                                        <motion.div
                                            className="absolute inset-0 z-0"
                                            style={{ y: "-15%" }}
                                        >
                                            <img src={getImageUrl(content.bg_image)} className="w-full h-[130%] object-cover" alt="Parallax" />
                                        </motion.div>
                                        <div className="absolute inset-0 bg-black/50 z-10" />
                                        <div className="relative z-20 text-center space-y-6 px-4">
                                            <h2 className="text-2xl sm:text-4xl md:text-6xl font-black text-white tracking-tighter drop-shadow-2xl">{content.title}</h2>
                                            <p className="text-white/80 text-[16px] md:text-[18px] max-w-xl mx-auto font-medium leading-relaxed drop-shadow-lg">{content.subtitle}</p>
                                        </div>
                                    </div>
                                </section>
                            );

                        case 'marquee':
                            const speedStr = (content.speed || 'medium').toLowerCase();
                            const duration = speedStr === 'slow' ? '50s' : speedStr === 'fast' ? '15s' : '30s';
                            return (
                                <section key={section.id} className="w-full m-0 p-0 overflow-hidden bg-[#119AB8] relative z-[40]">
                                    <style dangerouslySetInnerHTML={{
                                        __html: `
                                            @keyframes ticker-scroll-${section.id} { 0% { transform: translateX(0); } 100% { transform: translateX(-50%); } }
                                            .ticker-wrapper-${section.id} { display: flex; width: max-content; animation: ticker-scroll-${section.id} ${duration} linear infinite; }
                                            .ticker-wrapper-${section.id}:hover { animation-play-state: paused; }
                                        `}} />
                                    <div className="py-3 md:py-4 w-full overflow-hidden">
                                        <div className={`ticker-wrapper-${section.id}`}>
                                            {/* We render the content twice to allow seamless scrolling of 50% */}
                                            {[1, 2].map((wrapperIdx) => (
                                                <div key={wrapperIdx} className="flex items-center shrink-0">
                                                    {[1, 2, 3, 4, 5].map((itemIdx) => (
                                                        <div key={itemIdx} className="flex items-center gap-8 md:gap-12 px-4 md:px-8 whitespace-nowrap">
                                                            <span className="text-white font-black uppercase tracking-[0.3em] text-[9px] md:text-[10px] flex items-center gap-3">
                                                                <Sparkles size={14} className="text-white/80" /> {content.text || "AUTHENTIC COSMETICS DISTRIBUTION"}
                                                            </span>
                                                        </div>
                                                    ))}
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                </section>
                            );


                        case 'map':
                            return (
                                <section key={section.id} className="w-full px-4 md:px-12 xl:px-20 mt-10 md:mt-20 overflow-x-hidden">
                                    <div className="max-w-7xl mx-auto">

                                        {/* ── Section Header ── */}
                                        <div className="text-center mb-12 space-y-4">
                                            <span className="inline-flex items-center gap-2 px-4 py-1.5 bg-[#119AB8]/10 text-[#119AB8] rounded-full text-[10px] font-black uppercase tracking-[0.4em] border border-[#119AB8]/20">
                                                <MapPin size={10} /> Find Us In Person
                                            </span>
                                            {content.title && (
                                                <h2 className="text-2xl sm:text-4xl md:text-5xl font-black text-[#111] tracking-tighter leading-tight">
                                                    {content.title}
                                                </h2>
                                            )}
                                            <div className="flex items-center justify-center gap-3">
                                                <div className="h-px w-16 bg-gradient-to-r from-transparent to-[#119AB8]" />
                                                <div className="w-2 h-2 rounded-full bg-[#119AB8]" />
                                                <div className="h-px w-16 bg-gradient-to-l from-transparent to-[#119AB8]" />
                                            </div>
                                        </div>

                                        {/* ── Main Card ── */}
                                        <div className="relative rounded-[24px] md:rounded-[32px] overflow-hidden shadow-[0_40px_120px_-20px_rgba(0,0,0,0.2)] border border-slate-100">

                                            {/* Info Sidebar + Map Grid */}
                                            <div className="grid md:grid-cols-[320px_1fr]">

                                                {/* Left: Info Panel */}
                                                <div className="bg-[#0d1117] p-8 md:p-10 flex flex-col justify-between gap-8 relative overflow-hidden">
                                                    {/* Decorative blobs */}
                                                    <div className="absolute top-0 right-0 w-48 h-48 bg-[#119AB8]/10 rounded-full blur-[60px] -translate-y-1/2 translate-x-1/2 pointer-events-none" />
                                                    <div className="absolute bottom-0 left-0 w-32 h-32 bg-[#119AB8]/5 rounded-full blur-[40px] pointer-events-none" />

                                                    <div className="relative space-y-8">
                                                        <div>
                                                            <span className="text-[9px] font-black text-[#119AB8] uppercase tracking-[0.5em] block mb-3">Our Showroom</span>
                                                            <h3 className="text-2xl font-black text-white tracking-tight leading-tight">
                                                                {content.title || 'Visit Our Store'}
                                                            </h3>
                                                        </div>

                                                        <div className="space-y-5">
                                                            {/* Address */}
                                                            <div className="flex items-start gap-4">
                                                                <div className="w-10 h-10 rounded-xl bg-[#119AB8]/10 border border-[#119AB8]/20 flex items-center justify-center shrink-0 mt-0.5">
                                                                    <MapPin size={16} className="text-[#119AB8]" />
                                                                </div>
                                                                <div>
                                                                    <p className="text-[9px] font-black text-slate-500 uppercase tracking-widest mb-1">Address</p>
                                                                    <p className="text-sm font-semibold text-slate-200 leading-relaxed">
                                                                        {content.address || 'Pindora, Rawalpindi, Pakistan'}
                                                                    </p>
                                                                </div>
                                                            </div>

                                                            {/* Hours */}
                                                            <div className="flex items-start gap-4">
                                                                <div className="w-10 h-10 rounded-xl bg-[#119AB8]/10 border border-[#119AB8]/20 flex items-center justify-center shrink-0 mt-0.5">
                                                                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#119AB8" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10" /><polyline points="12 6 12 12 16 14" /></svg>
                                                                </div>
                                                                <div>
                                                                    <p className="text-[9px] font-black text-slate-500 uppercase tracking-widest mb-1">Business Hours</p>
                                                                    <p className="text-sm font-semibold text-slate-200">Mon – Sat: 9am – 7pm</p>
                                                                    <p className="text-xs text-slate-500 mt-0.5">Sunday: Closed</p>
                                                                </div>
                                                            </div>

                                                            {/* Phone */}
                                                            <div className="flex items-start gap-4">
                                                                <div className="w-10 h-10 rounded-xl bg-[#119AB8]/10 border border-[#119AB8]/20 flex items-center justify-center shrink-0 mt-0.5">
                                                                    <Phone size={16} className="text-[#119AB8]" />
                                                                </div>
                                                                <div>
                                                                    <p className="text-[9px] font-black text-slate-500 uppercase tracking-widest mb-1">Call Us</p>
                                                                    <p className="text-sm font-semibold text-slate-200">+92 300 000 0000</p>
                                                                </div>
                                                            </div>
                                                        </div>
                                                    </div>

                                                    {/* CTA Button */}
                                                    <a
                                                        href={`https://www.google.com/maps/search/${encodeURIComponent(content.address || 'Pindora Rawalpindi')}`}
                                                        target="_blank"
                                                        rel="noopener noreferrer"
                                                        className="relative inline-flex items-center justify-center gap-2 px-6 py-4 bg-[#119AB8] hover:bg-[#0d87a3] text-white rounded-xl font-black text-[11px] uppercase tracking-widest transition-all duration-300 shadow-lg shadow-[#119AB8]/20 active:scale-95"
                                                    >
                                                        <MapPin size={14} />
                                                        Get Directions
                                                    </a>
                                                </div>

                                                {/* Right: Map */}
                                                <div className="relative h-[360px] md:h-auto min-h-[400px]">
                                                    {content.iframe_url ? (
                                                        <iframe
                                                            src={content.iframe_url}
                                                            className="absolute inset-0 w-full h-full grayscale-[40%] hover:grayscale-0 transition-all duration-1000"
                                                            style={{ border: 0 }}
                                                            allowFullScreen={true}
                                                            loading="lazy"
                                                            referrerPolicy="no-referrer-when-downgrade"
                                                        />
                                                    ) : (
                                                        <div className="absolute inset-0 flex flex-col items-center justify-center bg-slate-50 text-slate-300 space-y-4">
                                                            <MapPin size={56} strokeWidth={1} className="opacity-30" />
                                                            <p className="text-xs font-black uppercase tracking-[0.3em] opacity-50">Map Not Configured</p>
                                                            <p className="text-[10px] text-slate-400 opacity-40">Paste your Google Maps embed URL in the admin panel</p>
                                                        </div>
                                                    )}

                                                    {/* Top overlay pin badge */}
                                                    <div className="absolute top-4 left-4 z-10 pointer-events-none">
                                                        <div className="flex items-center gap-2 px-3 py-1.5 bg-white/90 backdrop-blur-md rounded-xl shadow-lg border border-white/40">
                                                            <div className="w-2 h-2 rounded-full bg-[#119AB8] animate-pulse" />
                                                            <span className="text-[9px] font-black text-[#111] uppercase tracking-widest">Live Location</span>
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </section>
                            );

                        case 'html':
                            return (
                                <section key={section.id} className="w-full px-4 md:px-12 xl:px-20 mt-6 md:mt-10 overflow-x-hidden">
                                    <div className="max-w-7xl mx-auto" dangerouslySetInnerHTML={{ __html: content.code }} />
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

/* ─────────────────────────────────────────────────────────────────────────────
   CAROUSEL CONTAINER SUB-COMPONENT
   Features scroll tracking, horizontal scroll progress trackbar, and arrow buttons.
   ───────────────────────────────────────────────────────────────────────────── */
function CarouselContainer({ children, layoutType, isFullCollection }: { children: React.ReactNode; layoutType: string; isFullCollection?: boolean }) {
    const containerRef = useRef<HTMLDivElement>(null);
    const [scrollProgress, setScrollProgress] = useState(0);
    const [showBar, setShowBar] = useState(false);

    const handleScroll = () => {
        const el = containerRef.current;
        if (!el) return;
        const maxScroll = el.scrollWidth - el.clientWidth;
        if (maxScroll <= 0) {
            setScrollProgress(0);
            setShowBar(false);
            return;
        }
        setShowBar(true);
        const progress = (el.scrollLeft / maxScroll) * 100;
        setScrollProgress(progress);
    };

    useEffect(() => {
        const el = containerRef.current;
        if (!el) return;
        handleScroll();
        el.addEventListener('scroll', handleScroll);
        window.addEventListener('resize', handleScroll);
        // Also run after a tiny delay for hydration/rendering of products
        const timer = setTimeout(handleScroll, 500);
        return () => {
            el.removeEventListener('scroll', handleScroll);
            window.removeEventListener('resize', handleScroll);
            clearTimeout(timer);
        };
    }, [children]);

    const scroll = (direction: 'left' | 'right') => {
        const el = containerRef.current;
        if (!el) return;
        const amount = el.clientWidth * 0.75;
        el.scrollBy({
            left: direction === 'left' ? -amount : amount,
            behavior: 'smooth'
        });
    };

    if (layoutType === 'list') {
        return <div className="w-full flex flex-col gap-4">{children}</div>;
    }

    return (
        <div className="w-full relative group/carousel">
            {/* Scrollable Container */}
            <div
                ref={containerRef}
                className={cn(
                    "flex overflow-x-auto pb-4 gap-3 no-scrollbar -mx-4 px-4 scroll-smooth",
                    layoutType === 'split' && "md:grid md:grid-cols-2 lg:grid-cols-3 md:overflow-visible md:mx-0 md:px-0 md:pb-0 md:gap-4 lg:w-2/3 xl:w-3/4",
                    layoutType === 'carousel' && "md:mx-0 md:px-0",
                    layoutType === 'billboard' && "md:grid md:grid-cols-4 lg:grid-cols-5 md:overflow-visible md:mx-0 md:px-0 md:pb-0 md:gap-6",
                    layoutType === 'luxury' && "md:grid md:grid-cols-4 lg:grid-cols-5 md:overflow-visible md:mx-0 md:px-0 md:pb-0 md:gap-8",
                    layoutType === 'masonry' && "md:block md:columns-4 lg:columns-5 md:overflow-visible md:mx-0 md:px-0 md:pb-0 md:gap-4 md:space-y-4",
                    layoutType === 'highlight' && "md:grid md:grid-cols-4 lg:grid-cols-5 md:overflow-visible md:mx-0 md:px-0 md:pb-0 md:gap-6",
                    layoutType === 'grid' && (isFullCollection
                        ? "md:grid md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 md:overflow-visible md:mx-0 md:px-0 md:pb-0 md:gap-6"
                        : "md:grid md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 md:overflow-visible md:mx-0 md:px-0 md:pb-0 md:gap-6")
                )}
            >
                {children}
            </div>

            {/* Carousel Navigation Buttons - visible on hover on desktop */}
            {showBar && (
                <>
                    <button
                        onClick={() => scroll('left')}
                        aria-label="Scroll left"
                        className="flex absolute left-0 md:-left-4 top-[38%] -translate-x-1/2 md:translate-x-0 -translate-y-1/2 w-8 h-8 md:w-10 md:h-10 rounded-full bg-white text-[#13B0D1] shadow-md md:shadow-[0_10px_30px_-8px_rgba(15,23,42,0.35)] border border-[#D5D9D9] items-center justify-center opacity-100 md:opacity-100 group-hover/carousel:opacity-100 transition-all duration-300 hover:bg-[#119AB8] hover:text-white hover:border-[#119AB8] hover:scale-110 active:scale-95 z-30"
                    >
                        <ChevronLeft size={17} className="stroke-[3] md:stroke-[2.5] -ml-px" />
                    </button>
                    <button
                        onClick={() => scroll('right')}
                        aria-label="Scroll right"
                        className="flex absolute right-0 md:-right-4 top-[38%] translate-x-1/2 md:translate-x-0 -translate-y-1/2 w-8 h-8 md:w-10 md:h-10 rounded-full bg-white text-[#13B0D1] shadow-md md:shadow-[0_10px_30px_-8px_rgba(15,23,42,0.35)] border border-[#D5D9D9] items-center justify-center opacity-100 md:opacity-100 group-hover/carousel:opacity-100 transition-all duration-300 hover:bg-[#119AB8] hover:text-white hover:border-[#119AB8] hover:scale-110 active:scale-95 z-30"
                    >
                        <ChevronRight size={17} className="stroke-[3] md:stroke-[2.5] ml-px" />
                    </button>
                </>
            )}

            {/* Custom Carousel Progress Bar Track at the Bottom */}
            {showBar && (
                <div className="w-32 h-1 bg-slate-200 dark:bg-slate-800 rounded-full mx-auto mt-2 overflow-hidden relative">
                    <div
                        className="absolute top-0 bottom-0 bg-[#13B0D1] rounded-full transition-all duration-150"
                        style={{
                            width: '30%',
                            left: `${scrollProgress * 0.7}%`
                        }}
                    />
                </div>
            )}
        </div>
    );
}
