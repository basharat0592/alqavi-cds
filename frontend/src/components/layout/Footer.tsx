'use client';

import Link from 'next/link';
import {
    Facebook, Instagram, Twitter, Youtube,
    Send, ShieldCheck, Truck, ChevronRight,
    Sparkles, Star, Globe, MapPin, Mail, Phone,
    ShoppingBag, Heart
} from 'lucide-react';
import Logo from '@/components/ui/Logo';

export default function Footer({ settings }: { settings?: any }) {
    const siteName = settings?.site_name || "AL-QAVI";

    return (
        <footer className="bg-[#131921] text-white font-sans mt-auto border-t-4 border-[#119AB8]">

            {/* MAIN NAVIGATION GRID */}
            <div className="max-w-[1240px] mx-auto px-6 py-12 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-5 gap-12 lg:gap-16">

                {/* Column 1: Logo & Socials (Moved to main grid) */}
                <div className="space-y-8 md:col-span-2">
                    <div className="flex flex-col gap-4">
                        <Logo size="sm" />
                        <p className="text-[13px] text-slate-400 max-w-sm leading-relaxed">
                            Gilgit-Baltistan's leading distributor of premium cosmetics and skincare. Bridging the gap between global beauty and northern needs.
                        </p>
                    </div>

                    <div className="space-y-4">
                        <p className="text-[11px] font-black uppercase tracking-[0.2em] text-[#119AB8]">Follow Our Journey</p>
                        <div className="flex gap-3">
                            {[
                                { Icon: Facebook, color: 'hover:bg-[#1877F2]' },
                                { Icon: Instagram, color: 'hover:bg-[#E4405F]' },
                                { Icon: Twitter, color: 'hover:bg-[#1DA1F2]' },
                                { Icon: Youtube, color: 'hover:bg-[#FF0000]' }
                            ].map((item, i) => (
                                <Link
                                    key={i}
                                    href="#"
                                    className={`w-10 h-10 rounded-lg bg-white/5 border border-white/10 flex items-center justify-center transition-all duration-300 hover:scale-110 ${item.color} group`}
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
                            <span>Gilgit City, GB</span>
                        </li>
                        <li className="flex gap-3 items-center">
                            <Phone size={16} className="text-[#119AB8] shrink-0" />
                            <span className="font-bold text-white text-[13px]">+92 300 1234567</span>
                        </li>
                        <li className="flex gap-3 items-center">
                            <Mail size={16} className="text-[#119AB8] shrink-0" />
                            <span className="text-[13px]">support@alqavi.pk</span>
                        </li>
                    </ul>
                </div>
            </div>

            {/* COPYRIGHT BAR */}
            <div className="border-t border-white/5 py-6 bg-[#131921]">
                <div className="max-w-[1240px] mx-auto px-6 flex flex-col md:flex-row items-center justify-between gap-6 text-[11px] font-medium text-slate-500 uppercase tracking-widest">
                    <div className="flex gap-8">
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
