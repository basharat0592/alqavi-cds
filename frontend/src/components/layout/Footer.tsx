'use client';

import Link from 'next/link';
import {
    Facebook, Instagram, Twitter, Youtube,
    Phone, Mail, ShoppingBag, Star, ShieldCheck, Truck, Globe
} from 'lucide-react';
import Logo from '@/components/ui/Logo';

export default function Footer() {
    return (
        <footer className="bg-[#232F3E] text-white font-sans border-t border-white/5">
            {/* Back to Top */}
            <button
                className="w-full bg-[#37475A] py-4 hover:bg-[#48596E] transition-colors text-[11px] font-bold uppercase tracking-widest text-slate-100"
                onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
            >
                Back to Top
            </button>

            <div className="container px-6 md:px-12 mx-auto pt-16 pb-8">
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-12 pb-16 border-b border-white/5">
                    <div className="space-y-6">
                        <Link href="/" className="flex items-center gap-2 group transition-all hover:opacity-90">
                            <Logo size="sm" className="scale-[1.2] grayscale brightness-[10] hover:grayscale-0 hover:brightness-100 transition-all duration-500" />
                        </Link>
                        <p className="text-[13px] text-slate-300 leading-relaxed font-medium max-w-xs">
                            Pakistan's premier distributor of authentic clinical grade skincare and luxury beauty formulations. Directly imported, verified for quality.
                        </p>
                        <div className="flex gap-4">
                            <Link href="#" className="w-9 h-9 rounded-xl bg-white/5 flex items-center justify-center hover:bg-[#F7CA00] hover:text-black transition-all"><Facebook className="h-4 w-4" /></Link>
                            <Link href="#" className="w-9 h-9 rounded-xl bg-white/5 flex items-center justify-center hover:bg-[#F7CA00] hover:text-black transition-all"><Instagram className="h-4 w-4" /></Link>
                            <Link href="#" className="w-9 h-9 rounded-xl bg-white/5 flex items-center justify-center hover:bg-[#F7CA00] hover:text-black transition-all"><Twitter className="h-4 w-4" /></Link>
                        </div>
                    </div>

                    <div>
                        <h3 className="text-[14px] font-black uppercase tracking-widest text-[#F7CA00] mb-6">Get to Know Us</h3>
                        <ul className="space-y-3 text-[13px] font-medium text-slate-300">
                            <li><Link href="/about" className="hover:text-[#F7CA00] transition-colors underline-offset-4 hover:underline">About Al-Qavi</Link></li>
                            <li><Link href="/careers" className="hover:text-[#F7CA00] transition-colors underline-offset-4 hover:underline">Company Profile</Link></li>
                            <li><Link href="/press" className="hover:text-[#F7CA00] transition-colors underline-offset-4 hover:underline">Distribution Network</Link></li>
                            <li><Link href="/vlog" className="hover:text-[#F7CA00] transition-colors underline-offset-4 hover:underline">Authenticity Protocol</Link></li>
                        </ul>
                    </div>

                    <div>
                        <h3 className="text-[14px] font-black uppercase tracking-widest text-[#F7CA00] mb-6">Partner With Us</h3>
                        <ul className="space-y-3 text-[13px] font-medium text-slate-300">
                            <li><Link href="/contact" className="hover:text-[#F7CA00] transition-colors underline-offset-4 hover:underline">Wholesale Portal</Link></li>
                            <li><Link href="/contact" className="hover:text-[#F7CA00] transition-colors underline-offset-4 hover:underline">Supplier Dashboard</Link></li>
                            <li><Link href="/contact" className="hover:text-[#F7CA00] transition-colors underline-offset-4 hover:underline">Bulk Procurement</Link></li>
                            <li><Link href="/contact" className="hover:text-[#F7CA00] transition-colors underline-offset-4 hover:underline">Retail Registration</Link></li>
                        </ul>
                    </div>

                    <div>
                        <h3 className="text-[14px] font-black uppercase tracking-widest text-[#F7CA00] mb-6">Customer Care</h3>
                        <div className="space-y-4">
                            <div className="flex items-center gap-3 text-[13px] font-medium text-slate-300">
                                <div className="w-8 h-8 rounded-lg bg-white/5 flex items-center justify-center text-[#F7CA00]"><Phone className="h-4 w-4" /></div>
                                <span>0347-7001241</span>
                            </div>
                            <div className="flex items-center gap-3 text-[13px] font-medium text-slate-300">
                                <div className="w-8 h-8 rounded-lg bg-white/5 flex items-center justify-center text-[#F7CA00]"><Mail className="h-4 w-4" /></div>
                                <span>support@alqavi.com</span>
                            </div>
                            <div className="flex items-center gap-3 text-[13px] font-medium text-slate-300">
                                <div className="w-8 h-8 rounded-lg bg-white/5 flex items-center justify-center text-[#F7CA00]"><Globe className="h-4 w-4" /></div>
                                <span>Karachi Hub, Pakistan</span>
                            </div>
                        </div>
                    </div>
                </div>

                <div className="pt-8 flex flex-col md:flex-row justify-between items-center gap-6">
                    <div className="flex items-center gap-8 text-[11px] font-bold uppercase tracking-widest text-slate-400">
                        <Link href="/terms" className="hover:text-white transition-colors">Conditions of Use</Link>
                        <Link href="/privacy" className="hover:text-white transition-colors">Privacy Notice</Link>
                        <Link href="/cookies" className="hover:text-white transition-colors">Security Audit</Link>
                    </div>
                    <p className="text-[11px] font-bold uppercase tracking-widest text-slate-500">
                        © 2026 Al-Qavi Cosmetics Distributor. Trusted by Professionals.
                    </p>
                </div>
            </div>
        </footer>
    );
}

