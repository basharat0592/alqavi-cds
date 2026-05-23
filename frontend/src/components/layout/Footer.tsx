'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import {
    Facebook, Instagram, Twitter, Youtube,
    Send, ShieldCheck, Truck, ChevronRight,
    Sparkles, Star, Globe, MapPin, Mail, Phone,
    ShoppingBag, Heart
} from 'lucide-react';
import Logo from '@/components/ui/Logo';
import { getImageUrl } from '@/lib/utils';
import cmsService from '@/services/cms.service';

const TikTokIcon = ({ size = 18 }: { size?: number }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" xmlns="http://www.w3.org/2000/svg">
        <path d="M12.525.02c1.31-.02 2.61-.01 3.91-.02.08 1.53.63 3.09 1.75 4.17 1.12 1.11 2.7 1.62 4.24 1.79v4.03c-1.44-.05-2.89-.35-4.2-.97-.57-.26-1.1-.59-1.62-.93-.01 2.92.01 5.84-.02 8.75-.03 1.4-.54 2.79-1.35 3.94-1.31 1.92-3.58 3.17-5.91 3.21-1.43.08-2.86-.31-4.08-1.03-2.02-1.19-3.44-3.37-3.65-5.71-.02-.5-.03-1-.01-1.49.18-1.9 1.12-3.72 2.58-4.96 1.66-1.44 3.98-2.13 6.15-1.72.02 1.48-.04 2.96-.04 4.44-.9-.32-1.98-.23-2.81.31-.75.42-1.24 1.25-1.33 2.1-.1.7.1 1.41.54 1.96.44.53 1.05.85 1.72.95.75.11 1.55-.07 2.16-.54.65-.47.9-1.32 1.01-2.09.02-3.03.02-6.05.02-9.08z" />
    </svg>
);

export default function Footer({ settings }: { settings?: any }) {
    const [siteSettings, setSiteSettings] = useState<any>(settings);

    useEffect(() => {
        if (!settings) {
            cmsService.getFullState().then(state => {
                setSiteSettings(state.settings);
            });
        }
    }, [settings]);

    const siteName = siteSettings?.site_name || "AL-QAVI";

    return (
        <footer className="bg-[#131921] text-white font-sans mt-auto border-t-4 border-[#119AB8]">

            {/* MAIN NAVIGATION GRID */}
            <div className="max-w-[1240px] mx-auto px-6 py-12 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-5 gap-12 lg:gap-16">

                {/* Column 1: Logo & Socials (Moved to main grid) */}
                <div className="space-y-8 md:col-span-2">
                    <div className="flex flex-col gap-4">
                        <Logo size="sm" src={getImageUrl(siteSettings?.footer_logo || siteSettings?.logo)} />
                        <p className="text-[13px] text-slate-400 max-w-sm leading-relaxed">
                            Gilgit-Baltistan's leading distributor of premium cosmetics and skincare. Bridging the gap between global beauty and northern needs.
                        </p>
                    </div>

                    <div className="space-y-4">
                        <p className="text-[11px] font-black uppercase tracking-[0.2em] text-[#119AB8]">Follow Our Journey</p>
                        <div className="flex gap-3">
                            {[
                                { Icon: Facebook, color: 'hover:bg-[#1877F2]', url: siteSettings?.facebook_url },
                                { Icon: Instagram, color: 'hover:bg-[#E4405F]', url: siteSettings?.instagram_url },
                                { Icon: TikTokIcon, color: 'hover:bg-[#000000]', url: siteSettings?.tiktok_url, label: 'TikTok' },
                                { Icon: Youtube, color: 'hover:bg-[#FF0000]', url: siteSettings?.youtube_url }
                            ].map((item, i) => (
                                <Link
                                    key={i}
                                    href={item.url || "#"}
                                    target="_blank"
                                    className={`w-10 h-10 rounded-lg bg-white/5 border border-white/10 flex items-center justify-center transition-all duration-300 hover:scale-110 ${item.color} group`}
                                    title={item.label || ''}
                                >
                                    <item.Icon size={18} className="group-hover:text-white transition-colors" />
                                </Link>
                            ))}
                        </div>
                    </div>
                </div>

                {/* Column 2: Departments */}
                <div className="space-y-4">
                    <h4 className="text-[14px] font-black uppercase tracking-widest text-white">Departments</h4>
                    <ul className="space-y-2.5 text-[14px] text-slate-400">
                        <li><Link href="/customer/shop/cosmetics" className="hover:text-[#119AB8] hover:underline transition-colors">Cosmetics</Link></li>
                        <li><Link href="/customer/shop/skincare" className="hover:text-[#119AB8] hover:underline transition-colors">Skincare</Link></li>
                        <li><Link href="/customer/shop/perfume" className="hover:text-[#119AB8] hover:underline transition-colors">Fragrance</Link></li>
                        <li><Link href="/customer/shop/deals" className="hover:text-[#119AB8] hover:underline transition-colors font-bold">Today's Deals</Link></li>
                    </ul>
                </div>

                {/* Column 3: Logistics */}
                <div className="space-y-4">
                    <h4 className="text-[14px] font-black uppercase tracking-widest text-white">Logistics</h4>
                    <ul className="space-y-2.5 text-[14px] text-slate-400">
                        <li><Link href="/customer/tracking" className="hover:text-[#119AB8] hover:underline transition-colors">Track Parcel</Link></li>
                        <li><Link href="/shipping-policy" className="hover:text-[#119AB8] hover:underline transition-colors">Shipping Rates</Link></li>
                        <li><Link href="/returns" className="hover:text-[#119AB8] hover:underline transition-colors">Return Policy</Link></li>
                        <li><Link href="/customer/wishlist" className="hover:text-[#119AB8] hover:underline transition-colors">Wishlists</Link></li>
                    </ul>
                </div>

                {/* Column 4: Contact Info */}
                <div className="space-y-4">
                    <h4 className="text-[14px] font-black uppercase tracking-widest text-white">Contact</h4>
                    <ul className="space-y-3 text-[14px] text-slate-400">
                        <li className="flex gap-3 leading-relaxed">
                            <MapPin size={16} className="text-[#119AB8] shrink-0 mt-1" />
                            <span>{siteSettings?.address || 'Gilgit City, GB'}</span>
                        </li>
                        <li className="flex gap-3 items-center">
                            <Phone size={16} className="text-[#119AB8] shrink-0" />
                            <span className="font-bold text-white text-[13px]">{siteSettings?.whatsapp_number || '+92 300 1234567'}</span>
                        </li>
                        <li className="flex gap-3 items-center">
                            <Mail size={16} className="text-[#119AB8] shrink-0" />
                            <span className="text-[13px]">{siteSettings?.contact_email || 'support@alqavi.pk'}</span>
                        </li>
                    </ul>
                </div>
            </div>

            {/* COPYRIGHT BAR */}
            <div className="border-t border-white/5 py-6 bg-[#131921]">
                <div className="max-w-[1240px] mx-auto px-6 flex flex-col md:flex-row items-center justify-between gap-6 text-[11px] font-medium text-slate-500 uppercase tracking-widest">
                    <div className="flex flex-wrap justify-center gap-x-6 gap-y-2 md:gap-8">
                        <Link href="/terms" className="hover:text-white transition-colors">Conditions of Use</Link>
                        <Link href="/privacy" className="hover:text-white transition-colors">Privacy Notice</Link>
                        <Link href="/contact" className="hover:text-white transition-colors">Help Center</Link>
                    </div>
                    <p className="italic">
                        © 2026 {siteName} HUB. All Rights Reserved.
                    </p>
                </div>
            </div>
        </footer>
    );
}
