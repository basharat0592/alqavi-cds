'use client';

import Link from 'next/link';
import {
    Facebook, Instagram, Twitter, Youtube,
    Phone, Mail, MapPin, ShoppingBag
} from 'lucide-react';

export default function Footer() {
    return (
        <footer className="bg-white text-gray-600 pt-16 pb-8 border-t border-gray-100 font-sans mt-12">
            {/* Back to Top */}
            <div className="bg-gray-50 py-4 mb-12 hover:bg-gray-100 transition cursor-pointer border-y border-gray-100" onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}>
                <div className="container mx-auto text-center">
                    <span className="text-sm text-[#FF9900] font-bold flex items-center justify-center gap-2">
                        Back to top
                    </span>
                </div>
            </div>

            <div className="container px-4 md:px-6 mx-auto">
                <div className="grid grid-cols-2 md:grid-cols-4 gap-12 mb-16">
                    <div>
                        <h3 className="font-black text-gray-900 mb-6 text-sm uppercase tracking-widest">About Al-Qavi</h3>
                        <ul className="space-y-3 text-sm">
                            <li><Link href="/about" className="hover:text-[#FF9900] transition font-medium">Our Story</Link></li>
                            <li><Link href="/careers" className="hover:text-[#FF9900] transition font-medium">Careers</Link></li>
                            <li><Link href="/press" className="hover:text-[#FF9900] transition font-medium">Press Releases</Link></li>
                            <li><Link href="/blog" className="hover:text-[#FF9900] transition font-medium">Beauty Blog</Link></li>
                            <li><Link href="/investors" className="hover:text-[#FF9900] transition font-medium">Investor Relations</Link></li>
                        </ul>
                    </div>
                    <div>
                        <h3 className="font-black text-gray-900 mb-6 text-sm uppercase tracking-widest">Al-Qavi</h3>
                        <p className="text-sm leading-relaxed mb-6">
                            Pakistan&apos;s leading distributor of premium cosmetics and skincare. Quality and authenticity guaranteed.
                        </p>
                    </div>
                    <div>
                        <h3 className="font-black text-gray-900 mb-6 text-sm uppercase tracking-widest">Stay Connected</h3>
                        <div className="flex gap-3 mb-8">
                            <Link href="#" className="bg-gray-50 p-2.5 rounded-xl hover:bg-[#FF9900] hover:text-white transition shadow-sm"><Facebook className="h-5 w-5" /></Link>
                            <Link href="#" className="bg-gray-50 p-2.5 rounded-xl hover:bg-[#FF9900] hover:text-white transition shadow-sm"><Instagram className="h-5 w-5" /></Link>
                            <Link href="#" className="bg-gray-50 p-2.5 rounded-xl hover:bg-[#FF9900] hover:text-white transition shadow-sm"><Twitter className="h-5 w-5" /></Link>
                            <Link href="#" className="bg-gray-50 p-2.5 rounded-xl hover:bg-[#FF9900] hover:text-white transition shadow-sm"><Youtube className="h-5 w-5" /></Link>
                        </div>
                        <div className="space-y-4 text-sm font-medium">
                            <div className="flex items-center gap-4 group">
                                <div className="p-2 bg-[#FF9900]/10 rounded-lg group-hover:bg-[#FF9900] transition">
                                    <Phone className="h-4 w-4 text-[#FF9900] group-hover:text-white" />
                                </div>
                                <span className="group-hover:text-[#FF9900] transition font-bold">0347-7001241</span>
                            </div>
                            <div className="flex items-center gap-4 group">
                                <div className="p-2 bg-[#FF9900]/10 rounded-lg group-hover:bg-[#FF9900] transition">
                                    <Mail className="h-4 w-4 text-[#FF9900] group-hover:text-white" />
                                </div>
                                <span className="group-hover:text-[#FF9900] transition font-bold text-xs truncate">support@alqavi.com</span>
                            </div>
                        </div>
                    </div>
                </div>

                <div className="border-t border-gray-100 pt-10">
                    <div className="flex flex-col md:flex-row items-center justify-between gap-8">
                        <div className="flex items-center gap-3 group">
                            <div className="bg-[#FF9900] text-white p-2 rounded-xl shadow-lg group-hover:scale-110 transition-transform">
                                <ShoppingBag className="h-6 w-6" />
                            </div>
                            <div className="flex flex-col leading-none">
                                <span className="font-black text-xl text-[#FF9900] tracking-tight">Al-Qavi</span>
                                <span className="text-[10px] font-bold tracking-[0.2em] text-gray-400 -mt-0.5">COSMETICS</span>
                            </div>
                        </div>
                        <div className="flex flex-wrap justify-center gap-6 text-sm text-gray-400">
                            <Link href="/terms" className="hover:text-[#FF9900] transition font-medium">Terms</Link>
                            <Link href="/privacy" className="hover:text-[#FF9900] transition font-medium">Privacy</Link>
                            <Link href="/cookies" className="hover:text-[#FF9900] transition font-medium">Cookies</Link>
                            <Link href="/sitemap" className="hover:text-[#FF9900] transition font-medium">Sitemap</Link>
                        </div>
                        <p className="text-xs text-gray-400 font-medium">
                            © 2026 Al-Qavi Cosmetics. Pure Beauty.
                        </p>
                    </div>
                </div>
            </div>
        </footer>
    );
}
