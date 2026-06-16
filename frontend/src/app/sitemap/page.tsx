'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { ChevronRight } from 'lucide-react';
import Navbar from '@/components/layout/Navbar';
import Footer from '@/components/layout/Footer';
import cmsService, { SiteSettings } from '@/services/cms.service';

const GROUPS = [
    {
        title: 'Shop',
        links: [
            { name: 'All Products', href: '/customer/shop' },
            { name: 'Cosmetics', href: '/customer/shop/cosmetics' },
            { name: 'Skincare', href: '/customer/shop/skincare' },
            { name: 'Makeup', href: '/customer/shop/makeup' },
            { name: 'Hair Care', href: '/customer/shop/haircare' },
            { name: 'Fragrance', href: '/customer/shop/perfume' },
            { name: "Today's Deals", href: '/customer/shop/deals' },
        ],
    },
    {
        title: 'Your Account',
        links: [
            { name: 'Account Dashboard', href: '/customer/dashboard' },
            { name: 'Your Orders', href: '/customer/dashboard/orders' },
            { name: 'Wishlist', href: '/customer/wishlist' },
            { name: 'Cart', href: '/customer/cart' },
            { name: 'Track Parcel', href: '/customer/tracking' },
            { name: 'Log In', href: '/login' },
            { name: 'Create Account', href: '/register' },
        ],
    },
    {
        title: 'Company',
        links: [
            { name: 'About Us', href: '/about' },
            { name: 'Customer Service', href: '/contact' },
            { name: 'Become a Seller', href: '/register/supplier' },
            { name: 'Gift Cards', href: '/gift-cards' },
            { name: 'Beauty Blog', href: '/blog' },
            { name: 'Careers', href: '/careers' },
        ],
    },
    {
        title: 'Help & Policies',
        links: [
            { name: 'FAQs', href: '/faq' },
            { name: 'Shipping Rates', href: '/shipping-policy' },
            { name: 'Returns & Refunds', href: '/returns' },
            { name: 'Conditions of Use', href: '/terms' },
            { name: 'Privacy Notice', href: '/privacy' },
            { name: 'Cookie Policy', href: '/cookies' },
        ],
    },
];

export default function SitemapPage() {
    const [settings, setSettings] = useState<SiteSettings | null>(null);

    useEffect(() => {
        cmsService.getFullState().then(data => setSettings(data.settings)).catch(() => { });
    }, []);

    return (
        <div className="min-h-screen bg-white font-sans text-[#0f1111] w-full overflow-x-hidden flex flex-col">
            <Navbar settings={settings || undefined} />

            {/* LIGHT HEADER — same style as Wishlist / Tracking pages */}
            <div className="bg-white border-b border-[#D5D9D9] py-4">
                <div className="max-w-[1240px] mx-auto px-6">
                    <p className="text-[11px] font-black uppercase tracking-[0.2em] text-[#119AB8] mb-1">Navigation</p>
                    <h1 className="text-[24px] font-bold tracking-tight">Sitemap</h1>
                    <p className="text-[14px] text-[#565959] mt-1 max-w-2xl">Every page on our site, all in one place. Find what you are looking for quickly.</p>
                </div>
            </div>

            {/* LINK GROUPS */}
            <section className="flex-1 max-w-6xl mx-auto w-full px-6 md:px-12 py-16 md:py-20">
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-12">
                    {GROUPS.map((group, i) => (
                        <div key={i}>
                            <h2 className="text-[13px] font-black uppercase tracking-widest text-[#0f1111] mb-5 flex items-center gap-3">
                                <span className="w-6 h-[3px] bg-[#119AB8] rounded-full" />
                                {group.title}
                            </h2>
                            <ul className="space-y-3">
                                {group.links.map((link, j) => (
                                    <li key={j}>
                                        <Link
                                            href={link.href}
                                            className="group flex items-center gap-1.5 text-[14px] text-slate-600 hover:text-[#119AB8] transition-colors"
                                        >
                                            <ChevronRight size={14} className="text-slate-300 group-hover:text-[#119AB8] group-hover:translate-x-0.5 transition-all" />
                                            {link.name}
                                        </Link>
                                    </li>
                                ))}
                            </ul>
                        </div>
                    ))}
                </div>
            </section>

            <Footer settings={settings || undefined} />
        </div>
    );
}
