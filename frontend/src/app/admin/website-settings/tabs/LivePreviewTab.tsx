'use client';

import { useState } from 'react';
import {
    Play, Image as ImageIcon, Package, Tag, Star, MessageSquare,
    HelpCircle, Mail, ChevronDown, ChevronUp, Eye, EyeOff,
    ExternalLink, Edit3, Film, Layers, Globe, Monitor
} from 'lucide-react';
import { getImageUrl, cn } from '@/lib/utils';
import { SiteSettings, WebsiteSection } from '@/services/cms.service';
import { MediaAsset } from '@/services/cms.service';

interface Props {
    products:   any[];
    categories: any[];
    media:      MediaAsset[];
    sections:   WebsiteSection[];
    settings:   SiteSettings;
}

// ── Hero Slides (real data from Hero.tsx) ─────────────────────────────────────
const HERO_SLIDES = [
    {
        title: "Beauty Redefined", subtitle: "Luxury Cosmetics",
        description: "Experience the pinnacle of beauty artistry.",
        cta: "Shop the Collection", href: "/customer/shop",
        video: "/images/beauty-studio.mp4",
        img: "/images/hero-artist.jpg", color: "from-amber-500 to-orange-600"
    },
    {
        title: "Studio Artistry", subtitle: "Scientific Artistry",
        description: "Witness the magic of cosmetics through ultra-high-definition captures.",
        cta: "Explore Shop", href: "/customer/shop",
        video: "/images/abstract-cosmetics.mp4",
        img: "/images/hero-collage.png", color: "from-pink-500 to-rose-600"
    },
    {
        title: "Pure Radiant Glow", subtitle: "Exclusive Skin Care",
        description: "Experience ultimate hydration and rejuvenation.",
        cta: "Shop Serums", href: "/customer/shop",
        video: "/images/skincare-commercial.mp4",
        img: "/images/hero-3.png", color: "from-violet-500 to-purple-600"
    }
];

const BRANDS = ['L\'OREAL', 'MAYBELLINE', 'REVLON', 'NIVEA', 'Dove', 'PANTENE'];

const TESTIMONIALS = [
    { name: "Ayesha Khan", role: "Verified Customer", text: "The quality of the products is amazing. I've been using their skincare line for 3 months and the results are visible!" },
    { name: "Sarah Ahmed", role: "Professional Makeup Artist", text: "As a professional, I need reliable distributors. Al-Qavi always delivers authentic products on time." },
    { name: "Zainab Malik", role: "Frequent Buyer", text: "Best customer service in Pakistan! Their WhatsApp support helped me choose the right foundation shade perfectly." }
];

const FAQS = [
    { q: "Are your products 100% authentic?", a: "Yes, we source all products directly from authorized distributors and trusted manufacturers." },
    { q: "How long does delivery take?", a: "Major cities usually take 2-3 business days. Remote areas may take 4-5 business days." },
    { q: "Do you offer cash on delivery?", a: "Yes, Cash on Delivery is available across Pakistan." },
];

// ── AMAZON STYLE COMPONENTS ──
const AmazonBtn = ({ children, onClick, loading, variant = 'primary', className = '', type = 'button', disabled = false, href }: any) => {
    const styles = {
        primary: 'bg-gradient-to-b from-[#f7dfa5] to-[#f0c14b] border-[#a88734] hover:from-[#f5d78e] hover:to-[#eeb933] text-[#0f1111]',
        secondary: 'bg-gradient-to-b from-[#f7f8fa] to-[#e7e9ec] border-[#adb1b8] hover:from-[#eef1f3] hover:to-[#dce0e4] text-[#0f1111]',
    };
    const Comp = href ? 'a' : 'button';
    return (
        <Comp href={href} target={href ? "_blank" : undefined} type={type} onClick={onClick} disabled={disabled}
            className={`h-[31px] px-4 rounded-[3px] text-[13px] font-medium border shadow-sm transition-all flex items-center justify-center gap-2 disabled:opacity-60 ${styles[variant as keyof typeof styles]} ${className}`}>
            {children}
        </Comp>
    );
};

// ── Section Card wrapper ─────────────────────────────────────────────────────
function SectionCard({ title, icon: Icon, badge, count, children, defaultOpen = false }: {
    title: string; icon: any; badge?: string; count?: number;
    children: React.ReactNode; defaultOpen?: boolean;
}) {
    const [open, setOpen] = useState(defaultOpen);
    return (
        <div className="bg-white border border-[#ddd] rounded-[4px] shadow-sm overflow-hidden">
            <button onClick={() => setOpen(!open)}
                className="w-full flex items-center justify-between px-6 py-3 bg-[#f7f8fa] hover:bg-[#f3f3f3] transition-colors border-b border-[#ddd]">
                <div className="flex items-center gap-3">
                    <div className="p-1.5 bg-white border border-[#ddd] rounded-[4px] text-[#565959]">
                        <Icon size={16} />
                    </div>
                    <div className="text-left">
                        <p className="font-bold text-[#111] text-[15px]">{title}</p>
                        {badge && <p className="text-[11px] text-[#565959] font-medium">{badge}</p>}
                    </div>
                    {count !== undefined && (
                        <span className="ml-2 text-[11px] font-bold bg-[#eee] text-[#565959] px-2 py-0.5 rounded-full">{count} items</span>
                    )}
                </div>
                {open ? <ChevronUp size={18} className="text-[#565959]" /> : <ChevronDown size={18} className="text-[#565959]" />}
            </button>
            {open && <div className="p-6">{children}</div>}
        </div>
    );
}

export default function LivePreviewTab({ products, categories, media, sections, settings }: Props) {
    const [activeSlide, setActiveSlide] = useState(0);
    const [openFaq, setOpenFaq] = useState<number | null>(null);

    // Deduplicate products
    const uniqueProducts = (() => {
        const groups = new Map();
        products.forEach(p => {
            const key = `${(p.product_name || p.name || '').toLowerCase()}_${parseFloat(p.selling_price || p.price || 0)}`;
            if (!groups.has(key) || (!groups.get(key).image && (p.image || p.catalog_image))) {
                groups.set(key, p);
            }
        });
        return Array.from(groups.values());
    })();

    return (
        <div className="max-w-6xl mx-auto space-y-6 animate-in fade-in duration-500 text-left">

            {/* Header / Info Bar */}
            <div className="bg-[#f0f2f2] border border-[#ddd] rounded-[4px] px-6 py-4 flex flex-col md:flex-row md:items-center justify-between gap-4 shadow-sm">
                <div className="flex items-center gap-4">
                    <div className="p-3 bg-white rounded-full border border-[#ddd] shadow-sm">
                        <Monitor size={24} className="text-[#c45500]" />
                    </div>
                    <div>
                        <h3 className="text-[15px] font-bold text-[#111]">Interactive Content Audit</h3>
                        <p className="text-[12px] text-[#565959]">A read-only snapshot of what customers see on the <span className="font-bold">Al-Qavi Hub</span> storefront.</p>
                    </div>
                </div>
                <AmazonBtn href="/" variant="secondary">
                    <ExternalLink size={14} /> View Live Website
                </AmazonBtn>
            </div>

            {/* ── 1. HERO SLIDER ───────────────────────────────────────────────── */}
            <SectionCard title="Interactive Hero Banner" icon={Film} badge="Main storefront gateway" defaultOpen={true}>
                <div className="space-y-6">
                    {/* Mini slide preview */}
                    <div className="relative rounded-[4px] overflow-hidden bg-[#0F172A] aspect-[21/9] shadow-inner border border-[#ddd]">
                        <video
                            key={HERO_SLIDES[activeSlide].video}
                            src={HERO_SLIDES[activeSlide].video}
                            autoPlay muted playsInline loop
                            className="w-full h-full object-cover opacity-60"
                        />
                        <div className="absolute inset-0 bg-gradient-to-r from-[#000000a0] via-[#00000040] to-transparent flex flex-col justify-center pl-12">
                            <span className="text-[11px] font-bold uppercase tracking-widest text-[#f0c14b] mb-2">{HERO_SLIDES[activeSlide].subtitle}</span>
                            <h3 className="text-4xl font-bold text-white max-w-lg leading-tight">{HERO_SLIDES[activeSlide].title}</h3>
                            <p className="text-[14px] text-[#eee] mt-2 max-w-sm font-medium">{HERO_SLIDES[activeSlide].description}</p>
                            <div className="mt-6 flex gap-4">
                                <button className="h-[35px] px-6 bg-[#f0c14b] text-[#111] rounded-[3px] text-[13px] font-bold flex items-center gap-2 hover:bg-[#e2b03a] transition-all">
                                    <Play size={12} fill="currentColor" /> {HERO_SLIDES[activeSlide].cta}
                                </button>
                            </div>
                        </div>
                        {/* Slide indicators */}
                        <div className="absolute bottom-6 left-12 flex gap-2">
                            {HERO_SLIDES.map((_, i) => (
                                <button key={i} onClick={() => setActiveSlide(i)}
                                    className={`h-1.5 rounded-full transition-all ${i === activeSlide ? 'w-10 bg-[#f0c14b]' : 'w-4 bg-white/40 hover:bg-white/60'}`} />
                            ))}
                        </div>
                    </div>
                    {/* Slide list */}
                    <div className="grid grid-cols-3 gap-4">
                        {HERO_SLIDES.map((s, i) => (
                            <button key={i} onClick={() => setActiveSlide(i)}
                                className={cn(
                                    "p-4 rounded-[4px] border text-left transition-all relative overflow-hidden group",
                                    activeSlide === i ? "border-[#e77600] bg-[#fff9e6] ring-1 ring-[#e77600]" : "border-[#ddd] hover:border-[#888c8e] bg-white"
                                )}>
                                <div className="flex items-center gap-2 mb-1">
                                    <Film size={12} className={activeSlide === i ? "text-[#c45500]" : "text-[#565959]"} />
                                    <span className={cn("text-[11px] font-bold uppercase", activeSlide === i ? "text-[#c45500]" : "text-[#565959]")}>Slide {i + 1}</span>
                                </div>
                                <p className="text-[13px] font-bold text-[#111] truncate">{s.title}</p>
                                <p className="text-[11px] text-[#565959] truncate">{s.subtitle}</p>
                                {activeSlide === i && <div className="absolute top-0 right-0 w-8 h-8 bg-[#e77600] text-white flex items-center justify-center rounded-bl-xl"><Play size={10} fill="currentColor" /></div>}
                            </button>
                        ))}
                    </div>
                </div>
            </SectionCard>

            {/* ── 2. CATEGORIES ───────────────────────────────────────────────── */}
            <SectionCard title="Product Discovery Bar" icon={Tag} badge="Category-based navigation" count={categories.length}>
                <div className="flex flex-wrap gap-2">
                    <div className="px-5 py-2 rounded-[3px] bg-[#111] text-white text-[13px] font-bold border border-[#111]">Browse All</div>
                    {categories.length === 0 ? (
                        <p className="text-[13px] text-[#565959] py-2 italic">Waiting for category data sync...</p>
                    ) : (
                        categories.map((cat) => (
                            <div key={cat.id} className="px-5 py-2 rounded-[3px] bg-white border border-[#adb1b8] text-[#111] text-[13px] font-medium hover:bg-[#f7f8fa] cursor-default transition-all shadow-sm">
                                {cat.name}
                            </div>
                        ))
                    )}
                </div>
            </SectionCard>

            {/* ── 3. PRODUCT GRID ─────────────────────────────────────────────── */}
            <SectionCard title="Merchandising Grid" icon={Package} badge="Featured product inventory" count={uniqueProducts.length}>
                {uniqueProducts.length === 0 ? (
                    <div className="text-center py-12 bg-[#f7f8fa] border border-dashed border-[#ddd] rounded-[4px]">
                        <Package size={32} className="mx-auto text-[#ccc] mb-2" />
                        <p className="text-[14px] font-bold text-[#565959]">Storefront inventory is empty</p>
                    </div>
                ) : (
                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
                        {uniqueProducts.slice(0, 10).map((p) => {
                            const title = (p.product_name || p.name || '').replace(/\s*\(.*?\)\s*$/, '').trim();
                            const img = getImageUrl(p.image || p.catalog_image || p.image_url);
                            const price = parseFloat(p.selling_price || p.price || 0);
                            return (
                                <div key={p.id} className="bg-white border border-[#ddd] rounded-[3px] overflow-hidden hover:shadow-md transition-all group">
                                    <div className="aspect-square bg-[#f0f2f2] relative overflow-hidden flex items-center justify-center">
                                        {img ? (
                                            <img src={img} alt={title} className="w-full h-full object-cover group-hover:scale-105 transition-all duration-500" />
                                        ) : (
                                            <Package size={24} className="text-[#ccc]" />
                                        )}
                                        <div className="absolute top-2 right-2 px-1.5 py-0.5 bg-white/90 border border-[#ddd] rounded-[2px] text-[9px] font-black uppercase text-[#c45500]">In Stock</div>
                                    </div>
                                    <div className="p-3">
                                        <p className="text-[13px] font-medium text-[#111] line-clamp-2 leading-tight min-h-[32px]">{title}</p>
                                        <div className="flex items-center gap-1.5 mt-2">
                                            <div className="flex text-[#e77600]">
                                                {[...Array(5)].map((_, i) => <Star key={i} size={10} fill="currentColor" />)}
                                            </div>
                                            <span className="text-[11px] text-[#007185] font-medium">84</span>
                                        </div>
                                        <p className="text-[16px] font-bold text-[#111] mt-1">
                                            <span className="text-[11px] align-top mt-0.5 mr-0.5 font-medium">Rs.</span>
                                            {price.toLocaleString()}
                                        </p>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}
                {uniqueProducts.length > 10 && (
                    <div className="mt-6 pt-4 border-t border-[#eee] text-center">
                        <AmazonBtn variant="secondary" className="w-fit mx-auto">Load All {uniqueProducts.length} Items</AmazonBtn>
                    </div>
                )}
            </SectionCard>

            {/* ── 4. BRAND LOGOS ─────────────────────────────────────────────── */}
            <SectionCard title="Authorized Brands" icon={Layers} badge="Partner distribution network">
                <div className="flex flex-wrap items-center justify-center gap-10 opacity-70 grayscale hover:grayscale-0 transition-all">
                    {BRANDS.map((brand, i) => (
                        <span key={i} className="text-lg font-black text-[#888c8e] tracking-tighter uppercase whitespace-nowrap hover:text-[#111] cursor-default transition-colors">
                            {brand}
                        </span>
                    ))}
                </div>
            </SectionCard>

            {/* ── 5. TESTIMONIALS ─────────────────────────────────────────────── */}
            <SectionCard title="Customer Reviews" icon={Star} badge="Verified social proof">
                <div className="grid md:grid-cols-3 gap-6">
                    {TESTIMONIALS.map((t, i) => (
                        <div key={i} className="bg-white p-5 border border-[#ddd] rounded-[4px] shadow-sm flex flex-col">
                            <div className="flex gap-0.5 mb-2">
                                {[...Array(5)].map((_, s) => <Star key={s} size={13} className="text-[#e77600] fill-[#e77600]" />)}
                            </div>
                            <p className="text-[13px] font-bold text-[#111] mb-1">Verified Purchase</p>
                            <p className="text-[13px] text-[#565959] italic flex-1">"{t.text}"</p>
                            <div className="flex items-center gap-3 mt-4 pt-4 border-t border-[#eee]">
                                <div className="w-10 h-10 bg-[#f0f2f2] border border-[#ddd] rounded-full flex items-center justify-center text-[#565959] font-bold text-[14px]">{t.name[0]}</div>
                                <div>
                                    <p className="text-[13px] font-bold text-[#111]">{t.name}</p>
                                    <p className="text-[11px] text-[#007185] font-medium">{t.role}</p>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            </SectionCard>

            {/* ── 6. FAQ ──────────────────────────────────────────────────────── */}
            <SectionCard title="Help & Support Center" icon={HelpCircle} badge="Frequently asked questions">
                <div className="space-y-3">
                    {FAQS.map((faq, i) => (
                        <div key={i} className="border border-[#ddd] rounded-[4px] overflow-hidden shadow-sm">
                            <button onClick={() => setOpenFaq(openFaq === i ? null : i)}
                                className="w-full flex items-center justify-between px-6 py-3 bg-white hover:bg-[#f7f8fa] transition-colors text-left group">
                                <span className="text-[14px] font-bold text-[#111] group-hover:text-[#c45500]">{faq.q}</span>
                                {openFaq === i ? <ChevronUp size={16} className="text-[#565959]" /> : <ChevronDown size={16} className="text-[#565959]" />}
                            </button>
                            {openFaq === i && (
                                <div className="px-6 py-4 text-[13px] text-[#565959] border-t border-[#ddd] bg-[#fcfcfc] leading-relaxed">
                                    {faq.a}
                                </div>
                            )}
                        </div>
                    ))}
                </div>
            </SectionCard>

            {/* ── 7. NEWSLETTER ───────────────────────────────────────────────── */}
            <SectionCard title="Newsletter Hub" icon={Mail} badge="Customer retention system">
                <div className="bg-[#111] rounded-[4px] p-10 text-center relative overflow-hidden shadow-xl">
                    <div className="absolute -top-20 -right-20 h-64 w-64 bg-[#e77600]/10 blur-[80px] rounded-full" />
                    <div className="absolute -bottom-20 -left-20 h-64 w-64 bg-[#e77600]/10 blur-[80px] rounded-full" />
                    
                    <div className="relative z-10">
                        <span className="inline-block px-4 py-1 text-[11px] font-bold tracking-[2px] uppercase rounded-full bg-[#e77600]/20 text-[#e77600] border border-[#e77600]/30 mb-4">
                            Subscriber Perks
                        </span>
                        <h3 className="text-3xl font-bold text-white mb-3">Join our beauty community</h3>
                        <p className="text-[#ccc] text-[15px] mb-8 max-w-lg mx-auto">Get exclusive offers, first access to new arrivals, and personalized beauty advice.</p>
                        
                        <div className="flex gap-2 max-w-md mx-auto">
                            <input readOnly placeholder="your@email.com" className="flex-1 h-[45px] px-4 rounded-[3px] bg-white text-[14px] outline-none border-none shadow-inner" />
                            <button className="h-[45px] px-8 bg-[#f0c14b] text-[#111] rounded-[3px] text-[15px] font-bold hover:bg-[#e2b03a] transition-all whitespace-nowrap shadow-md">
                                Sign Up
                            </button>
                        </div>
                        <p className="text-[11px] text-[#888] mt-6">By signing up, you agree to our <span className="underline cursor-pointer">Privacy Policy</span> and <span className="underline cursor-pointer">Terms of Service</span>.</p>
                    </div>
                </div>
            </SectionCard>

            {/* Final Footer Context */}
            <div className="bg-[#fcfcfc] border border-[#ddd] rounded-[4px] p-10 flex flex-col md:flex-row items-center justify-between gap-8">
                <div className="flex gap-12">
                    <div className="text-left">
                        <p className="text-[28px] font-bold text-[#111]">{uniqueProducts.length}</p>
                        <p className="text-[11px] font-bold text-[#565959] uppercase tracking-wider">Live Items</p>
                    </div>
                    <div className="text-left border-l border-[#ddd] pl-12">
                        <p className="text-[28px] font-bold text-[#111]">{media.length}</p>
                        <p className="text-[11px] font-bold text-[#565959] uppercase tracking-wider">Media Assets</p>
                    </div>
                    <div className="text-left border-l border-[#ddd] pl-12">
                        <p className="text-[28px] font-bold text-[#111]">{sections.length}</p>
                        <p className="text-[11px] font-bold text-[#565959] uppercase tracking-wider">Dynamic Blocks</p>
                    </div>
                </div>
                <div className="flex gap-4">
                    <AmazonBtn href="/customer/shop" variant="secondary" className="h-[40px] px-8">Preview Customer View</AmazonBtn>
                    <AmazonBtn href="/" className="h-[40px] px-10">Launch Storefront</AmazonBtn>
                </div>
            </div>
        </div>
    );
}
