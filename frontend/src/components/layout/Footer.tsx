'use client';

import Link from 'next/link';
import {
    Facebook, Instagram, Twitter, Youtube,
    Phone, Mail, ShoppingBag, Star, ShieldCheck, Truck, Globe
} from 'lucide-react';
import Logo from '@/components/ui/Logo';

export default function Footer() {
    return (
        <footer className="bg-slate-900 text-white font-sans border-t border-white/5">
            {/* Back to Top */}
            <button
                className="w-full bg-slate-800 py-3 hover:bg-slate-700 transition-colors text-[10px] font-bold uppercase tracking-widest text-slate-400 hover:text-white"
                onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
            >
                Back to Top
            </button>

            <div className="container px-6 md:px-12 mx-auto pt-16 pb-8">
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-12 pb-16 border-b border-white/5">
                    <div className="space-y-6">
                        <Link href="/" className="flex items-center gap-2 group transition-all hover:opacity-80">
                            <Logo size="sm" className="scale-[1.1] grayscale brightness-[5] hover:grayscale-0 hover:brightness-100 transition-all duration-500" />
                        </Link>
                        <p className="text-sm text-slate-400 leading-relaxed font-medium">
                            Experience the authentic taste of Gilgit-Baltistan inspired Chinese cuisine. Freshly prepared, traditional recipes, delivered to your doorstep.
                        </p>
                        <div className="flex gap-4">
                            <Link href="#" className="w-9 h-9 rounded-xl bg-white/5 flex items-center justify-center hover:bg-accent hover:text-white transition-all"><Facebook className="h-4 w-4" /></Link>
                            <Link href="#" className="w-9 h-9 rounded-xl bg-white/5 flex items-center justify-center hover:bg-accent hover:text-white transition-all"><Instagram className="h-4 w-4" /></Link>
                            <Link href="#" className="w-9 h-9 rounded-xl bg-white/5 flex items-center justify-center hover:bg-accent hover:text-white transition-all"><Twitter className="h-4 w-4" /></Link>
                        </div>
                    </div>

                    <div>
                        <h3 className="text-xs font-bold uppercase tracking-widest text-accent mb-6">Explore</h3>
                        <ul className="space-y-3 text-sm font-medium text-slate-400">
                            <li><Link href="/shop" className="hover:text-white transition-colors">Catalog</Link></li>
                            <li><Link href="/shop?cat=New Arrivals" className="hover:text-white transition-colors">New Arrivals</Link></li>
                            <li><Link href="/shop?cat=Skincare" className="hover:text-white transition-colors">Skincare Registry</Link></li>
                            <li><Link href="/shop?cat=Makeup" className="hover:text-white transition-colors">Makeup Collection</Link></li>
                        </ul>
                    </div>

                    <div>
                        <h3 className="text-xs font-bold uppercase tracking-widest text-accent mb-6">Partnership</h3>
                        <ul className="space-y-3 text-sm font-medium text-slate-400">
                            <li><Link href="/contact" className="hover:text-white transition-colors">Wholesale Portal</Link></li>
                            <li><Link href="/contact" className="hover:text-white transition-colors">Distribution Access</Link></li>
                            <li><Link href="/contact" className="hover:text-white transition-colors">Bulk Procurement</Link></li>
                            <li><Link href="/contact" className="hover:text-white transition-colors">Partner Registry</Link></li>
                        </ul>
                    </div>

                    <div>
                        <h3 className="text-xs font-bold uppercase tracking-widest text-accent mb-6">Contact Support</h3>
                        <div className="space-y-4">
                            <div className="flex items-center gap-3 text-sm font-medium text-slate-400">
                                <div className="w-8 h-8 rounded-lg bg-white/5 flex items-center justify-center text-accent"><Phone className="h-4 w-4" /></div>
                                <span>0347-7001241</span>
                            </div>
                            <div className="flex items-center gap-3 text-sm font-medium text-slate-400">
                                <div className="w-8 h-8 rounded-lg bg-white/5 flex items-center justify-center text-accent"><Mail className="h-4 w-4" /></div>
                                <span>support@alqavi.com</span>
                            </div>
                            <div className="flex items-center gap-3 text-sm font-medium text-slate-400">
                                <div className="w-8 h-8 rounded-lg bg-white/5 flex items-center justify-center text-accent"><Globe className="h-4 w-4" /></div>
                                <span>Karachi, Pakistan</span>
                            </div>
                        </div>
                    </div>
                </div>

                <div className="pt-8 flex flex-col md:flex-row justify-between items-center gap-6">
                    <div className="flex items-center gap-6 text-[10px] font-bold uppercase tracking-widest text-slate-500">
                        <Link href="/terms" className="hover:text-white transition-colors">Terms</Link>
                        <Link href="/privacy" className="hover:text-white transition-colors">Privacy</Link>
                        <Link href="/cookies" className="hover:text-white transition-colors">Security</Link>
                    </div>
                    <p className="text-[10px] font-bold uppercase tracking-widest text-slate-500">
                        © 2026 Al-Qavi Distributor. All Rights Reserved.
                    </p>
                </div>
            </div>
        </footer>
    );
}

