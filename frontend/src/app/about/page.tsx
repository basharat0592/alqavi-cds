'use client';

import Navbar from '@/components/layout/Navbar';
import Footer from '@/components/layout/Footer';
import Link from 'next/link';
import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import {
    Sparkles, ShieldCheck, Truck, Heart, Globe, Award, Users, Gem,
    Target, Eye, ArrowRight, MapPin, Phone, Mail, CheckCircle2, Star, Leaf
} from 'lucide-react';
import cmsService, { SiteSettings } from '@/services/cms.service';
import { getImageUrl } from '@/lib/utils';

const VALUES = [
    {
        Icon: ShieldCheck,
        title: 'Authenticity First',
        text: 'Every product is sourced directly from verified brands and authorized channels — never a counterfeit, never a compromise.',
    },
    {
        Icon: Gem,
        title: 'Premium Curation',
        text: 'We hand-select each item in our catalog, focusing on professional-grade quality that beauty experts trust.',
    },
    {
        Icon: Heart,
        title: 'Customer Devotion',
        text: 'From first browse to final delivery, our team is dedicated to making your experience effortless and delightful.',
    },
    {
        Icon: Leaf,
        title: 'Responsible Sourcing',
        text: 'We partner with brands that respect skin, ethics, and the environment — beauty that you can feel good about.',
    },
];

const FEATURES = [
    { Icon: Award, title: 'Industry Expertise', text: 'Years of experience in professional cosmetics distribution across the region.' },
    { Icon: Truck, title: 'Reliable Delivery', text: 'Fast, tracked shipping with priority logistics — even to remote northern areas.' },
    { Icon: Globe, title: 'Global Brands', text: 'A handpicked portfolio of international and local labels under one roof.' },
    { Icon: Users, title: 'Trusted Partners', text: 'A growing network of salons, retailers and wholesale distributors who rely on us.' },
    { Icon: CheckCircle2, title: 'Quality Assured', text: 'Each batch is inspected for authenticity, freshness and condition before dispatch.' },
    { Icon: Star, title: 'Rated Excellence', text: 'Consistently rated highly by professionals for service, range and reliability.' },
];

const STATS = [
    { value: '10K+', label: 'Happy Clients' },
    { value: '500+', label: 'Premium Products' },
    { value: '50+', label: 'Trusted Partners' },
    { value: '99%', label: 'Satisfaction Rate' },
];

const fadeUp = {
    initial: { opacity: 0, y: 24 },
    whileInView: { opacity: 1, y: 0 },
    viewport: { once: true, margin: '-80px' },
    transition: { duration: 0.6, ease: 'easeOut' },
} as const;

export default function AboutPage() {
    const [settings, setSettings] = useState<SiteSettings | null>(null);

    useEffect(() => {
        cmsService.getFullState().then(data => setSettings(data.settings)).catch(() => { });
    }, []);

    const brand = settings?.site_name || 'Al-Qavi Cosmetics';

    return (
        <div className="min-h-screen bg-white font-sans text-[#0f1111] w-full overflow-x-hidden">
            <Navbar settings={settings || undefined} />

            {/* ─────────────────────────────  HERO  ───────────────────────────── */}
            <section className="relative overflow-hidden bg-[#0d1117] text-white">
                {/* Decorative glows */}
                <div className="absolute -top-[20%] -left-[10%] w-[50%] h-[60%] bg-[#119AB8]/20 blur-[140px] rounded-full pointer-events-none" />
                <div className="absolute -bottom-[20%] -right-[10%] w-[45%] h-[60%] bg-[#D4AF37]/10 blur-[140px] rounded-full pointer-events-none" />
                <div className="absolute inset-0 opacity-[0.04] flex items-center justify-end pointer-events-none">
                    <Sparkles size={520} strokeWidth={0.5} />
                </div>

                <div className="relative z-10 max-w-7xl mx-auto px-6 md:px-12 py-20 md:py-32">
                    <motion.div {...fadeUp} className="max-w-3xl">
                        <span className="inline-flex items-center gap-2 px-4 py-1.5 bg-[#119AB8]/10 text-[#56C7DD] rounded-full text-[10px] font-black uppercase tracking-[0.4em] border border-[#119AB8]/20 mb-6">
                            <Sparkles size={11} /> About Us
                        </span>
                        <h1 className="text-4xl sm:text-5xl md:text-7xl font-bold leading-[1.05] tracking-tight mb-6">
                            Beauty, delivered with <span className="text-[#56C7DD]">integrity</span>.
                        </h1>
                        <p className="text-[15px] md:text-[18px] text-slate-300/90 leading-relaxed max-w-2xl font-medium">
                            {brand} is a premium cosmetics distribution house built on a simple belief —
                            that everyone deserves access to authentic, professional-grade beauty products,
                            delivered with care and absolute trust.
                        </p>

                        <div className="mt-10 flex flex-wrap gap-4">
                            <Link
                                href="/customer/shop"
                                className="group inline-flex items-center gap-2 px-8 py-3.5 bg-[#119AB8] hover:bg-[#13B0D1] text-white rounded-full font-black uppercase tracking-widest text-[11px] transition-all shadow-xl shadow-[#119AB8]/20 active:scale-95"
                            >
                                Explore Collection
                                <ArrowRight size={15} className="group-hover:translate-x-1 transition-transform" />
                            </Link>
                            <Link
                                href="/contact"
                                className="inline-flex items-center gap-2 px-8 py-3.5 border border-white/20 hover:bg-white/10 text-white rounded-full font-black uppercase tracking-widest text-[11px] transition-all active:scale-95"
                            >
                                Get In Touch
                            </Link>
                        </div>
                    </motion.div>
                </div>
            </section>

            {/* ─────────────────────────────  STATS BAND  ───────────────────────────── */}
            <section className="w-full px-6 md:px-12 -mt-12 md:-mt-16 relative z-20">
                <div className="max-w-7xl mx-auto bg-white rounded-[20px] md:rounded-[28px] border border-slate-100 shadow-[0_30px_80px_-30px_rgba(15,23,42,0.25)] grid grid-cols-2 md:grid-cols-4 gap-y-10 gap-x-6 px-8 py-12 md:py-14">
                    {STATS.map((s, i) => (
                        <motion.div
                            key={i}
                            initial={{ opacity: 0, y: 20 }}
                            whileInView={{ opacity: 1, y: 0 }}
                            viewport={{ once: true }}
                            transition={{ delay: i * 0.08, duration: 0.5 }}
                            className="text-center relative group"
                        >
                            {i !== 0 && <div className="hidden md:block absolute top-1/2 -left-3 w-px h-14 bg-slate-100 -translate-y-1/2" />}
                            <h3 className="text-3xl md:text-5xl font-black text-[#111] tracking-tight group-hover:text-[#119AB8] transition-colors">
                                {s.value}
                            </h3>
                            <p className="text-[9px] md:text-[11px] font-black text-slate-400 uppercase tracking-[0.3em] mt-2">
                                {s.label}
                            </p>
                        </motion.div>
                    ))}
                </div>
            </section>

            {/* ─────────────────────────────  OUR STORY  ───────────────────────────── */}
            <section className="w-full px-6 md:px-12 py-20 md:py-28">
                <div className="max-w-7xl mx-auto grid lg:grid-cols-2 gap-12 lg:gap-20 items-center">
                    <motion.div {...fadeUp} className="relative order-2 lg:order-1">
                        <div className="relative aspect-[4/3] rounded-[20px] md:rounded-[28px] overflow-hidden shadow-2xl">
                            <img
                                src={getImageUrl(settings?.og_image || settings?.logo) || '/images/hero-artist.jpg'}
                                alt={brand}
                                className="w-full h-full object-cover"
                                onError={(e: any) => { e.target.src = '/images/hero-artist.jpg'; }}
                            />
                            <div className="absolute inset-0 bg-gradient-to-t from-[#0d1117]/50 via-transparent to-transparent" />
                        </div>
                        {/* Floating accent card */}
                        <div className="absolute -bottom-6 -right-3 md:-right-6 bg-white rounded-2xl shadow-xl border border-slate-100 px-6 py-4 flex items-center gap-3">
                            <div className="w-11 h-11 rounded-xl bg-[#119AB8]/10 flex items-center justify-center">
                                <Award className="text-[#119AB8]" size={22} />
                            </div>
                            <div>
                                <p className="text-[18px] font-black text-[#111] leading-none">Trusted</p>
                                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">Since Day One</p>
                            </div>
                        </div>
                    </motion.div>

                    <motion.div {...fadeUp} className="order-1 lg:order-2 space-y-6">
                        <div className="flex items-center gap-3">
                            <div className="h-[2px] w-8 bg-[#119AB8]" />
                            <span className="text-[10px] font-black text-[#119AB8] uppercase tracking-[0.4em]">Our Story</span>
                        </div>
                        <h2 className="text-3xl md:text-5xl font-bold text-[#2D4059] leading-tight tracking-tight">
                            From a single shelf to a regional name in beauty.
                        </h2>
                        <p className="text-[15px] md:text-[16px] text-[#565959] leading-relaxed font-medium">
                            What began as a passion for authentic cosmetics has grown into a complete distribution
                            ecosystem. We saw a gap — too many counterfeit products, unreliable supply, and customers
                            who couldn't access the brands they loved. So we built {brand} to change that.
                        </p>
                        <p className="text-[15px] md:text-[16px] text-[#565959] leading-relaxed font-medium">
                            Today we serve thousands of customers and a growing family of wholesale partners,
                            salons, and retailers — connecting global innovation with local beauty needs through
                            a catalog that's curated, genuine, and always expanding.
                        </p>
                        <div className="flex flex-wrap gap-x-8 gap-y-3 pt-2">
                            {['100% Authentic', 'Professional Grade', 'Nationwide Delivery'].map((t) => (
                                <div key={t} className="flex items-center gap-2">
                                    <CheckCircle2 size={18} className="text-[#119AB8]" />
                                    <span className="text-[13px] font-bold text-[#111]">{t}</span>
                                </div>
                            ))}
                        </div>
                    </motion.div>
                </div>
            </section>

            {/* ─────────────────────────────  MISSION / VISION  ───────────────────────────── */}
            <section className="w-full px-6 md:px-12 py-12 md:py-16 bg-[#FBFBFB] border-y border-slate-100">
                <div className="max-w-7xl mx-auto grid md:grid-cols-2 gap-6 md:gap-8">
                    <motion.div {...fadeUp} className="bg-white rounded-[20px] border border-slate-100 p-8 md:p-10 shadow-sm hover:shadow-xl transition-shadow duration-500 group">
                        <div className="w-14 h-14 rounded-2xl bg-[#119AB8]/10 flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                            <Target className="text-[#119AB8]" size={26} />
                        </div>
                        <h3 className="text-2xl md:text-3xl font-bold text-[#2D4059] mb-3 tracking-tight">Our Mission</h3>
                        <p className="text-[14px] md:text-[15px] text-[#565959] leading-relaxed font-medium">
                            To make authentic, premium cosmetics effortlessly accessible to every customer and
                            business partner — backed by honest pricing, dependable supply, and service that
                            genuinely cares.
                        </p>
                    </motion.div>

                    <motion.div {...fadeUp} className="bg-white rounded-[20px] border border-slate-100 p-8 md:p-10 shadow-sm hover:shadow-xl transition-shadow duration-500 group">
                        <div className="w-14 h-14 rounded-2xl bg-[#D4AF37]/10 flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                            <Eye className="text-[#D4AF37]" size={26} />
                        </div>
                        <h3 className="text-2xl md:text-3xl font-bold text-[#2D4059] mb-3 tracking-tight">Our Vision</h3>
                        <p className="text-[14px] md:text-[15px] text-[#565959] leading-relaxed font-medium">
                            To become the most trusted name in cosmetics distribution — the first choice for
                            professionals and beauty lovers alike, recognized for integrity, range, and an
                            unwavering commitment to quality.
                        </p>
                    </motion.div>
                </div>
            </section>

            {/* ─────────────────────────────  VALUES  ───────────────────────────── */}
            <section className="w-full px-6 md:px-12 py-20 md:py-28">
                <div className="max-w-7xl mx-auto">
                    <motion.div {...fadeUp} className="text-center max-w-2xl mx-auto mb-14 md:mb-20">
                        <span className="text-[10px] font-black text-[#119AB8] uppercase tracking-[0.4em]">What We Stand For</span>
                        <h2 className="text-3xl md:text-5xl font-bold text-[#2D4059] tracking-tight leading-tight mt-4">
                            The values behind every order.
                        </h2>
                        <div className="h-1 w-12 bg-[#119AB8] rounded-full mx-auto mt-6" />
                    </motion.div>

                    <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-5 md:gap-6">
                        {VALUES.map((v, i) => (
                            <motion.div
                                key={i}
                                initial={{ opacity: 0, y: 24 }}
                                whileInView={{ opacity: 1, y: 0 }}
                                viewport={{ once: true }}
                                transition={{ delay: i * 0.08, duration: 0.5 }}
                                className="group relative bg-white rounded-[18px] border border-slate-100 p-7 md:p-8 hover:border-[#119AB8]/30 hover:shadow-2xl hover:shadow-[#119AB8]/5 hover:-translate-y-1 transition-all duration-300"
                            >
                                <div className="w-12 h-12 rounded-2xl bg-[#119AB8]/8 border border-[#119AB8]/15 flex items-center justify-center mb-5 group-hover:scale-110 transition-transform">
                                    <v.Icon className="text-[#119AB8]" size={22} />
                                </div>
                                <h3 className="text-[17px] font-black text-[#111] mb-2.5 tracking-tight group-hover:text-[#119AB8] transition-colors">
                                    {v.title}
                                </h3>
                                <p className="text-[13px] text-[#565959] leading-relaxed font-medium">{v.text}</p>
                                <div className="absolute bottom-0 left-0 h-0.5 w-0 group-hover:w-full bg-[#119AB8] transition-all duration-500 rounded-b-full" />
                            </motion.div>
                        ))}
                    </div>
                </div>
            </section>

            {/* ─────────────────────────────  WHY CHOOSE US  ───────────────────────────── */}
            <section className="w-full px-6 md:px-12 py-12 md:py-16 bg-[#FBFBFB] border-y border-slate-100">
                <div className="max-w-7xl mx-auto">
                    <motion.div {...fadeUp} className="mb-12 md:mb-16 text-center md:text-left">
                        <h2 className="text-3xl md:text-5xl font-bold text-[#2D4059] tracking-tight leading-tight">
                            Why partners choose us.
                        </h2>
                        <p className="text-[14px] md:text-[15px] text-[#565959] leading-relaxed max-w-2xl font-medium mt-4 mx-auto md:mx-0">
                            We've built our reputation on the details that matter most to professionals and customers.
                        </p>
                    </motion.div>

                    <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5 md:gap-6">
                        {FEATURES.map((f, i) => (
                            <motion.div
                                key={i}
                                initial={{ opacity: 0, y: 20 }}
                                whileInView={{ opacity: 1, y: 0 }}
                                viewport={{ once: true }}
                                transition={{ delay: i * 0.06, duration: 0.5 }}
                                className="flex gap-4 bg-white rounded-[16px] border border-slate-100 p-6 hover:shadow-lg transition-shadow duration-300"
                            >
                                <div className="w-11 h-11 rounded-xl bg-[#119AB8]/10 flex items-center justify-center shrink-0">
                                    <f.Icon className="text-[#119AB8]" size={20} />
                                </div>
                                <div>
                                    <h3 className="text-[15px] font-black text-[#111] mb-1.5 tracking-tight">{f.title}</h3>
                                    <p className="text-[13px] text-[#565959] leading-relaxed font-medium">{f.text}</p>
                                </div>
                            </motion.div>
                        ))}
                    </div>
                </div>
            </section>

            {/* ─────────────────────────────  CTA  ───────────────────────────── */}
            <section className="w-full px-6 md:px-12 py-20 md:py-28">
                <motion.div {...fadeUp} className="max-w-7xl mx-auto relative overflow-hidden rounded-[24px] md:rounded-[36px] bg-[#0d1117] text-white shadow-2xl">
                    <div className="absolute -top-[30%] -right-[5%] w-[40%] h-[80%] bg-[#119AB8]/20 blur-[120px] rounded-full pointer-events-none" />
                    <div className="absolute -bottom-[30%] -left-[5%] w-[35%] h-[80%] bg-[#D4AF37]/10 blur-[120px] rounded-full pointer-events-none" />

                    <div className="relative z-10 px-8 md:px-16 py-16 md:py-20 flex flex-col lg:flex-row items-center justify-between gap-10">
                        <div className="max-w-xl text-center lg:text-left">
                            <h2 className="text-3xl md:text-5xl font-bold tracking-tight leading-tight mb-4">
                                Ready to experience beauty done right?
                            </h2>
                            <p className="text-[15px] text-slate-300 leading-relaxed font-medium">
                                Browse our curated collection or reach out to start a wholesale partnership today.
                            </p>
                        </div>
                        <div className="flex flex-col sm:flex-row gap-4 shrink-0">
                            <Link
                                href="/customer/shop"
                                className="group inline-flex items-center justify-center gap-2 px-9 py-4 bg-[#119AB8] hover:bg-[#13B0D1] text-white rounded-full font-black uppercase tracking-widest text-[11px] transition-all shadow-xl shadow-[#119AB8]/20 active:scale-95"
                            >
                                Shop Now
                                <ArrowRight size={15} className="group-hover:translate-x-1 transition-transform" />
                            </Link>
                            <Link
                                href="/register/supplier"
                                className="inline-flex items-center justify-center gap-2 px-9 py-4 border border-white/20 hover:bg-white/10 text-white rounded-full font-black uppercase tracking-widest text-[11px] transition-all active:scale-95"
                            >
                                Become a Seller
                            </Link>
                        </div>
                    </div>

                    {/* Contact strip */}
                    <div className="relative z-10 border-t border-white/10 grid grid-cols-1 md:grid-cols-3 divide-y md:divide-y-0 md:divide-x divide-white/10">
                        <a href={`tel:${settings?.phone_number || ''}`} className="flex items-center gap-3 px-8 py-5 hover:bg-white/5 transition-colors">
                            <Phone size={18} className="text-[#56C7DD] shrink-0" />
                            <span className="text-[13px] font-semibold text-slate-200">{settings?.phone_number || '+92 300 000 0000'}</span>
                        </a>
                        <a href={`mailto:${settings?.contact_email || ''}`} className="flex items-center gap-3 px-8 py-5 hover:bg-white/5 transition-colors">
                            <Mail size={18} className="text-[#56C7DD] shrink-0" />
                            <span className="text-[13px] font-semibold text-slate-200 truncate">{settings?.contact_email || 'support@alqavi.com'}</span>
                        </a>
                        <div className="flex items-center gap-3 px-8 py-5">
                            <MapPin size={18} className="text-[#56C7DD] shrink-0" />
                            <span className="text-[13px] font-semibold text-slate-200 line-clamp-1">{settings?.address || 'Gilgit-Baltistan, Pakistan'}</span>
                        </div>
                    </div>
                </motion.div>
            </section>

            <Footer settings={settings || undefined} />
        </div>
    );
}
