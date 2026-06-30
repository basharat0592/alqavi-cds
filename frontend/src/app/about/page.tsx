'use client';

import Navbar from '@/components/layout/Navbar';
import Footer from '@/components/layout/Footer';
import { Mail, Phone, MapPin, Clock, Target, Eye, Heart, ShieldCheck, Truck, Gem, CheckCircle2, Building2, ArrowRight, ChevronDown, ChevronUp, Instagram, Facebook, Youtube } from 'lucide-react';
import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import cmsService, { SiteSettings } from '@/services/cms.service';

const TikTokIcon = ({ size = 18 }: { size?: number }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" xmlns="http://www.w3.org/2000/svg">
        <path d="M12.525.02c1.31-.02 2.61-.01 3.91-.02.08 1.53.63 3.09 1.75 4.17 1.12 1.11 2.7 1.62 4.24 1.79v4.03c-1.44-.05-2.89-.35-4.2-.97-.57-.26-1.1-.59-1.62-.93-.01 2.92.01 5.84-.02 8.75-.03 1.4-.54 2.79-1.35 3.94-1.31 1.92-3.58 3.17-5.91 3.21-1.43.08-2.86-.31-4.08-1.03-2.02-1.19-3.44-3.37-3.65-5.71-.02-.5-.03-1-.01-1.49.18-1.9 1.12-3.72 2.58-4.96 1.66-1.44 3.98-2.13 6.15-1.72.02 1.48-.04 2.96-.04 4.44-.9-.32-1.98-.23-2.81.31-.75.42-1.24 1.25-1.33 2.1-.1.7.1 1.41.54 1.96.44.53 1.05.85 1.72.95.75.11 1.55-.07 2.16-.54.65-.47.9-1.32 1.01-2.09.02-3.03.02-6.05.02-9.08z" />
    </svg>
);

export default function AboutPage() {
    const [openIndex, setOpenIndex] = useState<number | null>(null);
    const [settings, setSettings] = useState<SiteSettings | null>(null);

    useEffect(() => {
        cmsService.getFullState().then(data => setSettings(data.settings)).catch(() => { });
    }, []);

    const brand = settings?.site_name || 'Al-Qavi Cosmetics';

    const STORY = [
        {
            question: 'Who We Are',
            answer: `${brand} is a premium cosmetics distribution house bringing authentic, professional-grade beauty products to customers and partners across Gilgit-Baltistan and beyond. We bridge the distance between global innovation and northern beauty needs.`
        },
        {
            question: 'Our Journey',
            answer: "What began as a passion for genuine cosmetics has grown into a complete distribution ecosystem — serving thousands of customers and a growing family of wholesale partners, salons, and retailers."
        },
        {
            question: 'What Makes Us Different',
            answer: "Every product is sourced from verified brands and authorized channels — never a counterfeit, never a compromise. We hand-select each item in our catalog for the professional-grade quality that beauty experts trust."
        },
        {
            question: 'Our Commitment',
            answer: "From first browse to final delivery, our team is dedicated to honest pricing, dependable supply, and service that genuinely cares about your experience."
        }
    ];

    const toggleAccordion = (index: number) => {
        setOpenIndex(openIndex === index ? null : index);
    };

    return (
        <div className="min-h-screen bg-white font-sans text-[#0f1111]">
            <Navbar settings={settings || undefined} />

            {/* Header */}
            <div className="bg-white border-b border-[#D5D9D9] py-4 mb-10">
                <div className="max-w-[1240px] mx-auto px-6">
                    <h1 className="text-[24px] font-bold tracking-tight">About Us</h1>
                    <p className="text-[14px] text-[#565959] mt-1">Get to know the people behind your beauty essentials.</p>
                </div>
            </div>

            <main className="max-w-[1100px] mx-auto px-6 pb-24">
                <div className="space-y-16">

                    {/* SECTION 1: Mission / Vision / Promise */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        <div className="p-8 border border-[#D5D9D9] rounded-[8px] flex flex-col items-center text-center hover:shadow-md transition-shadow">
                            <div className="w-12 h-12 bg-[#119AB8]/10 text-[#119AB8] rounded-full flex items-center justify-center mb-4">
                                <Target size={24} />
                            </div>
                            <h3 className="text-[17px] font-bold mb-2">Our Mission</h3>
                            <p className="text-[13px] text-[#565959] mb-6">To make authentic, premium cosmetics effortlessly accessible to every customer and business partner.</p>
                            <a href="/customer/shop" className="w-full py-2 bg-[#119AB8] text-white rounded-[8px] text-[13px] font-bold hover:bg-[#13B0D1] transition-colors shadow-sm text-center">Explore Shop</a>
                        </div>
                        <div className="p-8 border border-[#D5D9D9] rounded-[8px] flex flex-col items-center text-center hover:shadow-md transition-shadow">
                            <div className="w-12 h-12 bg-[#119AB8]/10 text-[#119AB8] rounded-full flex items-center justify-center mb-4">
                                <Eye size={24} />
                            </div>
                            <h3 className="text-[17px] font-bold mb-2">Our Vision</h3>
                            <p className="text-[13px] text-[#565959] mb-6">To become the most trusted name in cosmetics distribution across the region and beyond.</p>
                            <a href="/register/supplier" className="w-full py-2 border border-[#D5D9D9] rounded-[8px] text-[13px] font-bold hover:bg-[#f7f8fa] text-center transition-colors">Become a Seller</a>
                        </div>
                        <div className="p-8 border border-[#D5D9D9] rounded-[8px] flex flex-col items-center text-center hover:shadow-md transition-shadow">
                            <div className="w-12 h-12 bg-[#119AB8]/10 text-[#119AB8] rounded-full flex items-center justify-center mb-4">
                                <Heart size={24} />
                            </div>
                            <h3 className="text-[17px] font-bold mb-2">Our Promise</h3>
                            <p className="text-[13px] text-[#565959] mb-6">Genuine products, fair pricing, and service that genuinely cares — from browse to delivery.</p>
                            <a href="/contact" className="w-full py-2 border border-[#D5D9D9] rounded-[8px] text-[13px] font-bold hover:bg-[#f7f8fa] text-center transition-colors">Contact Us</a>
                        </div>
                    </div>

                    {/* SECTION 2: What We Stand For */}
                    <div className="border border-[#D5D9D9] rounded-[8px] p-10 bg-white">
                        <div className="text-center mb-10">
                            <h3 className="text-[20px] font-bold tracking-tight mb-2">What We Stand For</h3>
                            <p className="text-[14px] text-[#565959] italic">The values behind every order we deliver.</p>
                        </div>
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
                            <div className="text-center">
                                <CheckCircle2 size={24} className="mx-auto text-[#119AB8] mb-4" />
                                <h4 className="text-[14px] font-bold">100% Genuine</h4>
                                <p className="text-[12px] text-[#565959] mt-1">Verified sources only.</p>
                            </div>
                            <div className="text-center">
                                <Gem size={24} className="mx-auto text-[#119AB8] mb-4" />
                                <h4 className="text-[14px] font-bold">Premium Curation</h4>
                                <p className="text-[12px] text-[#565959] mt-1">Hand-selected quality.</p>
                            </div>
                            <div className="text-center">
                                <Truck size={24} className="mx-auto text-[#119AB8] mb-4" />
                                <h4 className="text-[14px] font-bold">Priority GB</h4>
                                <p className="text-[12px] text-[#565959] mt-1">Regional fast delivery.</p>
                            </div>
                            <div className="text-center">
                                <ShieldCheck size={24} className="mx-auto text-[#119AB8] mb-4" />
                                <h4 className="text-[14px] font-bold">Secure Pay</h4>
                                <p className="text-[12px] text-[#565959] mt-1">Encrypted gateways.</p>
                            </div>
                        </div>
                    </div>

                    {/* SECTION 3: Business Partnerships */}
                    <div className="bg-[#131921] rounded-[8px] p-12 text-white relative overflow-hidden">
                        <div className="absolute top-0 right-0 p-10 opacity-10">
                            <Building2 size={120} />
                        </div>
                        <div className="max-w-2xl relative z-10">
                            <h2 className="text-[24px] font-bold mb-4 text-[#119AB8]">Wholesale & Business Partnerships</h2>
                            <p className="text-[15px] text-slate-300 mb-8 leading-relaxed">
                                Join our network of <span className="text-white font-bold">50+ regional partners</span>. Access tiered bulk pricing, priority inventory allocation, and professional marketing support.
                            </p>
                            <div className="flex flex-wrap gap-4">
                                <a href="/register/supplier" className="px-8 py-2.5 bg-[#119AB8] rounded-[8px] text-[13px] font-bold hover:bg-[#13B0D1] transition-colors flex items-center gap-2">Partner Inquiry <ArrowRight size={16} /></a>
                                <a href="/contact" className="px-8 py-2.5 border border-white/20 rounded-[8px] text-[13px] font-bold hover:bg-white/10 transition-colors">Get In Touch</a>
                            </div>
                        </div>
                    </div>

                    {/* SECTION 4: Our Story & Hub */}
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 pt-8 border-t border-[#D5D9D9]">
                        <div>
                            <h2 className="text-[18px] font-bold mb-6">Our Story</h2>
                            <div className="space-y-3">
                                {STORY.map((item, index) => (
                                    <div key={index} className="border border-[#D5D9D9] rounded-[8px] overflow-hidden">
                                        <button
                                            onClick={() => toggleAccordion(index)}
                                            className="w-full p-4 flex items-center justify-between text-left hover:bg-[#f7f8fa] transition-colors"
                                        >
                                            <span className="text-[14px] font-bold">{item.question}</span>
                                            <div className="text-[#119AB8]">
                                                {openIndex === index ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
                                            </div>
                                        </button>
                                        <AnimatePresence>
                                            {openIndex === index && (
                                                <motion.div
                                                    initial={{ height: 0, opacity: 0 }}
                                                    animate={{ height: "auto", opacity: 1 }}
                                                    exit={{ height: 0, opacity: 0 }}
                                                    className="bg-white border-t border-[#D5D9D9] p-4 text-[13px] text-[#565959] leading-relaxed"
                                                >
                                                    {item.answer}
                                                </motion.div>
                                            )}
                                        </AnimatePresence>
                                    </div>
                                ))}
                            </div>
                        </div>

                        <div className="space-y-10">
                            <div className="p-8 bg-[#f7f8fa] border border-[#D5D9D9] rounded-[8px] space-y-6">
                                <h2 className="text-[18px] font-bold">Gilgit-Baltistan Hub</h2>
                                <div className="flex gap-4">
                                    <MapPin size={20} className="text-[#119AB8] shrink-0 mt-1" />
                                    <div>
                                        <h4 className="font-bold text-[14px]">Main Distribution Center</h4>
                                        <p className="text-[#565959] text-[13px] mt-1 leading-relaxed">
                                            {settings?.address || 'Al-Qavi Hub, Block 4, Main Commercial Area, Gilgit City, GB, Pakistan'}
                                        </p>
                                    </div>
                                </div>
                                <div className="flex gap-4">
                                    <Clock size={20} className="text-[#119AB8] shrink-0 mt-1" />
                                    <div>
                                        <h4 className="font-bold text-[14px]">Service Window</h4>
                                        <p className="text-[#565959] text-[13px] mt-1">Monday - Saturday: 09:00 AM - 09:00 PM</p>
                                    </div>
                                </div>
                            </div>

                            <div className="flex gap-3">
                                {[
                                    { Icon: Instagram, url: settings?.instagram_url },
                                    { Icon: Facebook, url: settings?.facebook_url },
                                    { Icon: TikTokIcon, url: settings?.tiktok_url },
                                    { Icon: Youtube, url: settings?.youtube_url }
                                ].map((item, i) => (
                                    <a
                                        key={i}
                                        href={item.url || "#"}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="w-10 h-10 rounded-[8px] border border-[#D5D9D9] flex items-center justify-center text-[#565959] hover:text-[#119AB8] hover:border-[#119AB8] transition-all"
                                    >
                                        <item.Icon size={18} />
                                    </a>
                                ))}
                            </div>
                        </div>
                    </div>
                </div>
            </main>

            <Footer settings={settings || undefined} />
        </div>
    );
}
