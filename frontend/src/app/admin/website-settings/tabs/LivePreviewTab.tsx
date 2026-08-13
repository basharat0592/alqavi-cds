'use client';

import { useState } from 'react';
import {
    Play, Image as ImageIcon, Package, Tag, Star, MessageSquare,
    HelpCircle, Mail, ChevronDown, ChevronUp, Eye, EyeOff,
    ExternalLink, Edit3, Film, Layers, Globe, Monitor, Layout
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
        secondary: 'bg-gradient-to-b from-[#f8fafc] to-[#e7e9ec] border-[#adb1b8] hover:from-[#eef1f3] hover:to-[#dce0e4] text-[#0f1111]',
    };
    const Comp = href ? 'a' : 'button';
    return (
        <Comp href={href} target={href ? "_blank" : undefined} type={type} onClick={onClick} disabled={disabled}
            className={`h-[31px] px-4 rounded-lg text-[13px] font-medium border shadow-sm transition-all flex items-center justify-center gap-2 disabled:opacity-60 ${styles[variant as keyof typeof styles]} ${className}`}>
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
        <div className="bg-white border border-[#e2e8f0] rounded-lg shadow-sm overflow-hidden">
            <button onClick={() => setOpen(!open)}
                className="w-full flex items-center justify-between px-6 py-3 bg-[#f8fafc] hover:bg-[#f3f3f3] transition-colors border-b border-[#e2e8f0]">
                <div className="flex items-center gap-3">
                    <div className="p-1.5 bg-white border border-[#e2e8f0] rounded-lg text-[#565959]">
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

const SECTION_TYPE_ICONS = {
    hero: Film,
    products: Package,
    search_hero: Globe,
    categories: Tag,
    about: Layout,
    faq: HelpCircle,
    newsletter: Mail,
    social: MessageSquare,
    gallery: ImageIcon,
};

export default function LivePreviewTab({ products, categories, media, sections, settings }: Props) {
    const [openFaq, setOpenFaq] = useState<number | null>(null);

    // Filter to show only visible sections for a true "live" feel
    const activeSections = sections.filter(s => s.is_visible);

    return (
        <div className="max-w-6xl mx-auto space-y-8 animate-in fade-in duration-500 text-left">

            {/* Header / Info Bar */}
            <div className="bg-[#f0f2f2] border border-[#e2e8f0] rounded-lg px-6 py-4 flex flex-col md:flex-row md:items-center justify-between gap-4 shadow-sm">
                <div className="flex items-center gap-4">
                    <div className="p-3 bg-white rounded-full border border-[#e2e8f0] shadow-sm">
                        <Monitor size={24} className="text-[#c45500]" />
                    </div>
                    <div>
                        <h3 className="text-[15px] font-bold text-[#111]">Live Content Preview</h3>
                        <p className="text-[12px] text-[#565959]">A real-time visual representation of your active sections. <span className="font-bold text-[#c45500]">{activeSections.length} visible sections</span>.</p>
                    </div>
                </div>
                <div className="flex gap-2">
                    <AmazonBtn href="/" variant="secondary">
                        <ExternalLink size={14} /> View Live Website
                    </AmazonBtn>
                </div>
            </div>

            {/* ── DYNAMIC SECTIONS RENDERER ── */}
            <div className="space-y-4">
                {activeSections.length === 0 ? (
                    <div className="text-center py-20 bg-white border border-dashed border-[#e2e8f0] rounded-[8px]">
                        <Layers size={48} className="mx-auto text-[#cbd5e1] mb-4" strokeWidth={1} />
                        <h4 className="text-lg font-bold text-[#111]">No Visible Sections</h4>
                        <p className="text-[14px] text-[#565959] max-w-sm mx-auto mt-2">Add or enable sections in the <span className="font-bold">Page Builder</span> tab to see them appear here in real-time.</p>
                    </div>
                ) : (
                    activeSections.map((section, idx) => (
                        <SectionCard 
                            key={section.id || idx} 
                            title={`${idx + 1}. ${section.name}`} 
                            icon={SECTION_TYPE_ICONS[section.section_type as keyof typeof SECTION_TYPE_ICONS] || Layers} 
                            badge={`Type: ${section.section_type.replace('_', ' ')}`}
                            defaultOpen={false}
                        >
                            <div className="bg-white border border-[#eee] rounded-[8px] overflow-hidden">
                                {renderSection(section, products, categories, openFaq, setOpenFaq)}
                            </div>
                        </SectionCard>
                    ))
                )}
            </div>

            {/* Final Summary Card */}
            <div className="bg-[#fcfcfc] border border-[#e2e8f0] rounded-[8px] p-8 flex flex-col md:flex-row items-center justify-between gap-8 mt-12">
                <div className="flex gap-12">
                    <div className="text-left">
                        <p className="text-[32px] font-bold text-[#111]">{products.length}</p>
                        <p className="text-[11px] font-bold text-[#565959] uppercase tracking-wider">Inventory</p>
                    </div>
                    <div className="text-left border-l border-[#e2e8f0] pl-12">
                        <p className="text-[32px] font-bold text-[#111]">{media.length}</p>
                        <p className="text-[11px] font-bold text-[#565959] uppercase tracking-wider">Media</p>
                    </div>
                    <div className="text-left border-l border-[#e2e8f0] pl-12">
                        <p className="text-[32px] font-bold text-[#111]">{sections.length}</p>
                        <p className="text-[11px] font-bold text-[#565959] uppercase tracking-wider">Layout Blocks</p>
                    </div>
                </div>
                <div className="flex gap-3">
                    <AmazonBtn href="/customer/shop" variant="secondary" className="h-[40px] px-8">Full Shop Preview</AmazonBtn>
                    <AmazonBtn href="/" className="h-[40px] px-10 font-bold">Go Live Now</AmazonBtn>
                </div>
            </div>
        </div>
    );
}

// ── SECTION RENDERER LOGIC ──────────────────────────────────────────────────
function renderSection(section: WebsiteSection, products: any[], categories: any[], openFaq: number | null, setOpenFaq: any) {
    const { section_type, content } = section;

    switch (section_type) {
        case 'hero':
            const slides = content.slides || [];
            return (
                <div className="relative aspect-[21/9] bg-[#0F172A] overflow-hidden">
                    {slides.length > 0 ? (
                        <>
                            <img src={getImageUrl(slides[0].image)} className="w-full h-full object-cover opacity-60" />
                            <div className="absolute inset-0 flex flex-col justify-center px-12 md:px-20">
                                <p className="text-[#f0c14b] text-[11px] font-black uppercase tracking-[0.3em] mb-3">{slides[0].subtitle}</p>
                                <h3 className="text-4xl md:text-6xl font-bold text-white max-w-2xl leading-tight">{slides[0].title}</h3>
                                <p className="text-slate-300 mt-4 max-w-lg text-sm md:text-base leading-relaxed">{slides[0].description}</p>
                                <div className="mt-8 flex gap-4">
                                    <AmazonBtn className="h-11 px-8 rounded-full font-bold">Explore Now</AmazonBtn>
                                </div>
                            </div>
                        </>
                    ) : (
                        <div className="w-full h-full flex flex-col items-center justify-center text-slate-500 gap-3">
                            <ImageIcon size={48} strokeWidth={1} />
                            <p className="text-sm font-bold uppercase tracking-widest">No Slides Configured</p>
                        </div>
                    )}
                </div>
            );

        case 'products':
            const gridProds = products.filter(p => (content.product_ids || []).includes(p.id));
            return (
                <div className="p-8 space-y-6">
                    <div className="flex flex-col gap-1">
                        <h4 className="text-2xl font-bold text-[#111]">{content.title}</h4>
                        {content.subtitle && <p className="text-slate-500 text-sm">{content.subtitle}</p>}
                    </div>
                    {gridProds.length > 0 ? (
                        <div className={`grid gap-4`} style={{ gridTemplateColumns: `repeat(${content.per_row || 4}, minmax(0, 1fr))` }}>
                            {gridProds.map(p => (
                                <div key={p.id} className="bg-white border border-[#eee] rounded-lg overflow-hidden group">
                                    <div className="aspect-square bg-[#f8f9fa] flex items-center justify-center">
                                        <img src={getImageUrl(p.images?.[0]?.image || p.image)} className="w-full h-full object-cover" />
                                    </div>
                                    <div className="p-3">
                                        <p className="text-[13px] font-bold text-[#111] line-clamp-1">{p.name || p.product_name}</p>
                                        <p className="text-[#c45500] font-black mt-1">Rs. {Number(p.selling_price || p.price).toLocaleString()}</p>
                                    </div>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <div className="py-12 bg-slate-50 rounded-lg text-center text-slate-400">
                            <Package size={24} className="mx-auto mb-2 opacity-30" />
                            <p className="text-[12px] font-bold uppercase tracking-widest">No Products Selected</p>
                        </div>
                    )}
                </div>
            );

        case 'search_hero':
            return (
                <div className="py-20 px-8 bg-slate-900 text-center relative overflow-hidden">
                    <div className="absolute top-0 right-0 w-full h-full bg-[radial-gradient(circle_at_top_right,_var(--tw-gradient-stops))] from-[#c4550010] via-transparent to-transparent" />
                    <div className="relative z-10 max-w-2xl mx-auto space-y-8">
                        <h3 className="text-3xl md:text-5xl font-black text-white tracking-tight">{content.title}</h3>
                        <div className="flex gap-2 p-1 bg-white rounded-full shadow-2xl">
                            <input readOnly placeholder={content.placeholder} className="flex-1 h-12 px-6 rounded-full outline-none text-sm" />
                            <button className="h-12 w-12 bg-[#c45500] text-white rounded-full flex items-center justify-center shadow-lg"><Star size={18} /></button>
                        </div>
                    </div>
                </div>
            );

        case 'categories':
            const catItems = content.items || [];
            return (
                <div className="p-8 space-y-8">
                    <h4 className="text-2xl font-bold text-[#111] text-center">{content.title}</h4>
                    <div className="grid grid-cols-3 md:grid-cols-6 gap-6">
                        {catItems.map((cat: any, i: number) => (
                            <div key={i} className="flex flex-col items-center gap-4 group cursor-pointer">
                                <div className="w-20 h-20 md:w-28 md:h-28 bg-[#f0f2f2] rounded-full border border-[#e2e8f0] overflow-hidden shadow-sm group-hover:border-[#c45500] group-hover:shadow-lg transition-all duration-300">
                                    <img src={getImageUrl(cat.image)} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500" />
                                </div>
                                <span className="text-[13px] font-bold text-[#111] group-hover:text-[#c45500] transition-colors uppercase tracking-tight">{cat.name}</span>
                            </div>
                        ))}
                    </div>
                </div>
            );

        case 'about':
            return (
                <div className="grid md:grid-cols-2 gap-12 p-12 items-center">
                    <div className="space-y-6">
                        <div className="w-12 h-1.5 bg-[#c45500] rounded-full" />
                        <h3 className="text-4xl font-black text-[#111] tracking-tighter leading-tight">{content.title}</h3>
                        <p className="text-[#565959] leading-relaxed text-[15px] whitespace-pre-wrap">{content.body}</p>
                        <AmazonBtn variant="secondary" className="w-fit h-10 px-8 rounded-full font-bold">Learn More Our Story</AmazonBtn>
                    </div>
                    <div className="relative aspect-square rounded-3xl overflow-hidden shadow-2xl border border-[#eee]">
                        <img src={getImageUrl(content.image)} className="w-full h-full object-cover" />
                    </div>
                </div>
            );

        case 'faq':
            const items = content.items || [];
            return (
                <div className="p-8 md:p-16 bg-[#f8fafc] space-y-10">
                    <div className="text-center space-y-2">
                        <h4 className="text-3xl font-black text-[#111] tracking-tight">{content.title}</h4>
                        <p className="text-slate-400 text-sm uppercase font-bold tracking-[0.2em]">Support Center</p>
                    </div>
                    <div className="max-w-3xl mx-auto space-y-3">
                        {items.map((item: any, i: number) => (
                            <div key={i} className="bg-white border border-[#e2e8f0] rounded-xl overflow-hidden shadow-sm">
                                <button onClick={() => setOpenFaq(openFaq === i ? null : i)}
                                    className="w-full flex items-center justify-between px-6 py-4 text-left group">
                                    <span className="text-[15px] font-bold text-[#111] group-hover:text-[#c45500]">{item.q}</span>
                                    <ChevronDown size={18} className={cn("text-[#888] transition-transform duration-300", openFaq === i && "rotate-180")} />
                                </button>
                                {openFaq === i && (
                                    <div className="px-6 pb-6 pt-2 text-[14px] text-[#565959] border-t border-[#f0f2f2] leading-relaxed">
                                        {item.a}
                                    </div>
                                )}
                            </div>
                        ))}
                    </div>
                </div>
            );

        case 'newsletter':
            return (
                <div className="p-16 bg-[#111] text-center relative overflow-hidden">
                    <div className="absolute top-0 left-0 w-full h-full bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-[#c4550020] via-transparent to-transparent" />
                    <div className="relative z-10 space-y-6 max-w-2xl mx-auto">
                        <Mail size={40} className="mx-auto text-[#f0c14b] mb-4" />
                        <h3 className="text-3xl font-black text-white">{content.title}</h3>
                        <p className="text-slate-400">{content.subtitle}</p>
                        <div className="flex gap-2 max-w-md mx-auto pt-4">
                            <input readOnly placeholder={content.placeholder} className="flex-1 h-12 px-6 rounded-lg bg-white/10 border border-white/20 text-white outline-none" />
                            <AmazonBtn className="h-12 px-8 font-bold">Subscribe</AmazonBtn>
                        </div>
                    </div>
                </div>
            );

        case 'banner_split':
            return (
                <div className={cn("grid md:grid-cols-2 bg-white", content.reversed && "md:flex-row-reverse")}>
                    <div className={cn("p-12 md:p-20 flex flex-col justify-center space-y-6", content.reversed ? "order-2" : "order-1")}>
                        <h3 className="text-4xl font-black text-[#111] tracking-tight leading-tight">{content.title}</h3>
                        <p className="text-[#565959] leading-relaxed text-[15px]">{content.body}</p>
                        <AmazonBtn variant="secondary" className="w-fit h-10 px-8 font-bold uppercase tracking-widest text-[11px]">View Details</AmazonBtn>
                    </div>
                    <div className={cn("aspect-square bg-slate-50", content.reversed ? "order-1" : "order-2")}>
                        <img src={getImageUrl(content.image)} className="w-full h-full object-cover" />
                    </div>
                </div>
            );

        case 'marquee':
            return (
                <div className="bg-[#111] py-4 overflow-hidden border-y border-white/10">
                    <div className="whitespace-nowrap flex items-center animate-marquee">
                        {[...Array(4)].map((_, i) => (
                            <span key={i} className="text-white font-black text-sm uppercase tracking-[0.3em] flex items-center shrink-0">
                                {content.text}
                                <Star size={14} className="mx-8 text-[#f0c14b] fill-[#f0c14b]" />
                            </span>
                        ))}
                    </div>
                </div>
            );

        default:
            return (
                <div className="p-12 text-center bg-slate-50 border border-dashed border-[#e2e8f0] m-4 rounded-xl">
                    <Layers size={24} className="mx-auto mb-2 text-slate-300" />
                    <p className="text-[11px] font-black uppercase text-slate-400 tracking-[0.2em]">Preview Placeholder for {section_type}</p>
                </div>
            );
    }
}
