'use client';

import Link from 'next/link';
import {
    Facebook, Instagram, Twitter, Youtube,
    Send, ShieldCheck, Truck, ChevronRight,
    Sparkles
} from 'lucide-react';
import Logo from '@/components/ui/Logo';

const FOOTER_LINKS = [
    {
        title: "Collections",
        links: [
            { name: "Skincare", href: "/customer/shop?category=skincare" },
            { name: "Makeup", href: "/customer/shop?category=makeup" },
            { name: "Best Sellers", href: "/customer/shop?filter=best-sellers" },
            { name: "New Arrivals", href: "/customer/shop?filter=new-arrivals" }
        ]
    },
    {
        title: "Company",
        links: [
            { name: "About Us", href: "/about" },
            { name: "Partners", href: "/partners" },
            { name: "Distribution", href: "/distribution" },
            { name: "Careers", href: "/careers" }
        ]
    },
    {
        title: "Support",
        links: [
            { name: "Track Order", href: "/customer/orders" },
            { name: "Shipping", href: "/shipping" },
            { name: "Returns", href: "/returns" },
            { name: "Contact", href: "/contact" }
        ]
    }
];

const SOCIAL_LINKS = [
    { icon: <Facebook size={24} />, href: "#", brand: "Facebook", color: "hover:text-[#1877F2] hover:drop-shadow-[0_0_10px_rgba(24,119,242,0.4)]" },
    { icon: <Instagram size={24} />, href: "#", brand: "Instagram", color: "hover:text-[#E4405F] hover:drop-shadow-[0_0_10px_rgba(228,64,95,0.4)]" },
    { icon: <Twitter size={24} />, href: "#", brand: "Twitter", color: "hover:text-[#1DA1F2] hover:drop-shadow-[0_0_10px_rgba(29,161,242,0.4)]" },
    { icon: <Youtube size={24} />, href: "#", brand: "Youtube", color: "hover:text-[#FF0000] hover:drop-shadow-[0_0_10px_rgba(255,0,0,0.4)]" }
];

import { getImageUrl } from '@/lib/utils';

export default function Footer({ settings }: { settings?: any }) {
    const siteLogo = settings?.footer_logo || settings?.logo;
    const siteName = settings?.site_name || "AL-QAVI";

    const socialLinks = [
        { icon: <Facebook size={24} />, href: settings?.facebook_url || "#", brand: "Facebook", color: "hover:text-[#1877F2]" },
        { icon: <Instagram size={24} />, href: settings?.instagram_url || "#", brand: "Instagram", color: "hover:text-[#E4405F]" },
        { icon: <Twitter size={24} />, href: settings?.tiktok_url || "#", brand: "TikTok", color: "hover:text-[#000000]" }, // Using tiktok_url for twitter slot if needed
        { icon: <Youtube size={24} />, href: settings?.youtube_url || "#", brand: "Youtube", color: "hover:text-[#FF0000]" }
    ].filter(s => s.href !== "#" || true); // Show all for now

    return (
        <footer className="relative bg-white text-slate-900 border-t border-slate-100 overflow-hidden font-sans">
            <div className="relative z-10 max-w-[1400px] mx-auto px-6 md:px-12 py-8">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-12 gap-20 mb-8">

                    {/* Brand Section */}
                    <div className="lg:col-span-4 space-y-1">
                        <div className="relative inline-block group/logo">
                            <Link href="/customer" className="relative block transition-transform duration-500 hover:scale-[1.02]">
                                {siteLogo ? (
                                    <img src={getImageUrl(siteLogo)} alt={siteName} className="h-16 w-auto object-contain mix-blend-multiply" />
                                ) : (
                                    <Logo size="lg" className="mix-blend-multiply" />
                                )}
                            </Link>
                        </div>
                        <p className="text-slate-500 text-[15px] leading-relaxed max-w-sm font-medium">
                            <span className="text-accent font-black tracking-widest uppercase text-[10px] block mb-2">Professional Distribution</span>
                            Redefining beauty standards in Pakistan with <span className="text-slate-900 font-bold">authentic global collections</span> and service excellence.
                        </p>
                    </div>

                    {/* Links Sections */}
                    <div className="lg:col-span-5 grid grid-cols-2 sm:grid-cols-3 gap-10">
                        {FOOTER_LINKS.map((section, idx) => (
                            <div key={section.title} className="space-y-8">
                                <h4 className="text-[10px] font-black uppercase tracking-[0.4em] text-slate-400 flex items-center gap-2">
                                    <span className="w-1.5 h-px bg-accent/30" />
                                    {section.title}
                                </h4>
                                <ul className="space-y-4">
                                    {section.links.map((link) => (
                                        <li key={link.name}>
                                            <Link
                                                href={link.href}
                                                className="text-[14px] font-bold text-slate-500 hover:text-slate-900 transition-all duration-300 flex items-center group/link"
                                            >
                                                <ChevronRight size={12} className="mr-0 w-0 opacity-0 transition-all duration-500 group-hover/link:w-4 group-hover/link:mr-2 group-hover/link:opacity-100 text-accent" />
                                                <span className="relative pb-0.5 overflow-hidden">
                                                    {link.name}
                                                    <span className="absolute bottom-0 left-0 w-full h-px bg-slate-200 translate-x-[-105%] group-hover/link:translate-x-0 transition-transform duration-500" />
                                                </span>
                                            </Link>
                                        </li>
                                    ))}
                                </ul>
                            </div>
                        ))}
                    </div>

                    {/* Social Hub */}
                    <div className="lg:col-span-3 space-y-8">
                        <div className="space-y-3">
                            <h4 className="text-[10px] font-black uppercase tracking-[0.4em] text-slate-400 flex items-center gap-2">
                                <span className="w-1.5 h-px bg-accent/30" />
                                Connect With Us
                            </h4>
                            <p className="text-slate-500 text-[13px] font-medium italic">
                                Stay updated with our latest professional collections and industry insights.
                            </p>
                        </div>

                        <div className="flex flex-row gap-6">
                            {socialLinks.map((social, i) => (
                                <Link
                                    key={i}
                                    href={social.href}
                                    aria-label={social.brand}
                                    className={`text-slate-400 transition-all duration-300 hover:scale-125 group/icon ${social.color}`}
                                >
                                    <span className="relative z-10">{social.icon}</span>
                                </Link>
                            ))}
                        </div>
                    </div>
                </div>

                {/* Bottom Bar */}
                <div className="pt-12 border-t border-slate-50 flex flex-col md:flex-row justify-between items-center gap-10">
                    <div className="flex flex-col gap-1.5 group/dev">
                        <span className="text-[8px] font-black uppercase tracking-[0.4em] text-slate-300">Architecture & Design</span>
                        <Link
                            href="https://zulqarnain-ali.vercel.app/"
                            target="_blank"
                            rel="noopener noreferrer"
                            className="group/link flex items-center gap-2.5"
                        >
                            <span className="text-[14px] font-black text-blue-600 hover:text-blue-800 tracking-tight transition-colors underline decoration-blue-600/30 underline-offset-4">Zulqarnain Ali</span>
                            <div className="flex w-6 h-6 items-center justify-center rounded-full border border-blue-100 bg-blue-50 transition-all duration-500 group-hover/link:border-blue-600 group-hover/link:bg-blue-600 group-hover/link:text-white group-hover/link:translate-x-1 group-hover/link:-translate-y-1">
                                <ChevronRight size={12} className="rotate-[-45deg] text-blue-600 group-hover/link:text-white" />
                            </div>
                        </Link>
                    </div>

                    <div className="flex flex-col items-center md:items-end gap-5">
                        <div className="flex gap-10 text-[10px] font-black uppercase tracking-[0.3em] text-slate-400">
                            <Link href="/terms" className="hover:text-slate-900 transition-colors">Terms</Link>
                            <Link href="/privacy" className="hover:text-slate-900 transition-colors">Privacy</Link>
                            <Link href="/contact" className="hover:text-slate-900 transition-colors">Contact</Link>
                        </div>
                        <p className="text-[9px] text-slate-300 font-bold uppercase tracking-[0.4em] flex items-center gap-3">
                            © 2026 {siteName} <span className="w-1 h-1 rounded-full bg-slate-200" /> Professional Service Excellence
                        </p>
                    </div>
                </div>
            </div>
        </footer>
    );
}







