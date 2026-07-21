'use client';

import React from 'react';
import Link from 'next/link';
import { User, Building2, Truck, ChevronRight, ArrowLeft } from 'lucide-react';
import Logo from '@/components/ui/Logo';

export default function RegisterChoicePage() {
    return (
        <div className="h-screen bg-[#fcfcfc] flex flex-col items-center justify-center font-sans overflow-hidden px-6">
            <div className="max-w-4xl w-full animate-in fade-in slide-in-from-bottom-4 duration-1000">
                <div className="mb-6 text-center">
                    <Link href="/" className="inline-block mb-4 opacity-80 hover:opacity-100 transition-opacity">
                        <Logo size="lg" />
                    </Link>
                    <h1 className="text-3xl font-bold text-slate-900 tracking-tight leading-none mb-4">
                        Account <span className="text-[#13B0D1]">Selection</span>
                    </h1>
                    <p className="text-[11px] text-slate-400 font-bold uppercase tracking-[0.2em] max-w-sm mx-auto leading-relaxed">
                        Choose your primary business role to continue with the registration process
                    </p>
                </div>

                <div className="grid md:grid-cols-3 gap-6">
                    {/* Customer */}
                    <Link href="/register/customer"
                        className="group relative block p-8 bg-white border border-slate-200 rounded-2xl hover:border-[#13B0D1] hover:shadow-xl hover:shadow-slate-200/50 transition-all duration-300">
                        <div className="flex flex-col items-center text-center">
                            <div className="w-12 h-12 bg-slate-50 rounded-xl flex items-center justify-center mb-6 group-hover:bg-[#13B0D1]/10 group-hover:text-[#13B0D1] transition-colors">
                                <User className="h-6 w-6 text-slate-400 group-hover:text-[#13B0D1]" />
                            </div>
                            <h2 className="text-lg font-bold text-slate-800 mb-2">Customer</h2>
                            <p className="text-[11px] text-slate-500 font-medium leading-relaxed">Shop Pakistan's finest collection for personal or retail use.</p>
                        </div>
                    </Link>

                    {/* Supplier */}
                    <Link href="/register/supplier"
                        className="group relative block p-8 bg-white border border-slate-200 rounded-2xl hover:border-[#13B0D1] hover:shadow-xl hover:shadow-slate-200/50 transition-all duration-300">
                        <div className="flex flex-col items-center text-center">
                            <div className="w-12 h-12 bg-slate-50 rounded-xl flex items-center justify-center mb-6 group-hover:bg-[#13B0D1]/10 group-hover:text-[#13B0D1] transition-colors">
                                <Building2 className="h-6 w-6 text-slate-400 group-hover:text-[#13B0D1]" />
                            </div>
                            <h2 className="text-lg font-bold text-slate-800 mb-2">Supplier</h2>
                            <p className="text-[11px] text-slate-500 font-medium leading-relaxed">Wholesale your brand products across the national network.</p>
                        </div>
                    </Link>

                    {/* Rider */}
                    <Link href="/register/rider"
                        className="group relative block p-8 bg-white border border-slate-200 rounded-2xl hover:border-[#13B0D1] hover:shadow-xl hover:shadow-slate-200/50 transition-all duration-300">
                        <div className="flex flex-col items-center text-center">
                            <div className="w-12 h-12 bg-slate-50 rounded-xl flex items-center justify-center mb-6 group-hover:bg-[#13B0D1]/10 group-hover:text-[#13B0D1] transition-colors">
                                <Truck className="h-6 w-6 text-slate-400 group-hover:text-[#13B0D1]" />
                            </div>
                            <h2 className="text-lg font-bold text-slate-800 mb-2">Become a Rider</h2>
                            <p className="text-[11px] text-slate-500 font-medium leading-relaxed">Deliver orders, manage shipments, and earn per delivery.</p>
                        </div>
                    </Link>
                </div>

                <div className="mt-12 text-center">
                    <p className="text-[11px] text-slate-400 font-bold uppercase tracking-widest">
                        Registered User? <Link href="/login" className="text-[#13B0D1] hover:underline ml-1">Sign In</Link>
                    </p>
                </div>
            </div>

            <footer className="absolute bottom-8 text-[9px] text-slate-300 font-bold uppercase tracking-[0.3em] text-center">
                © 2026 Al-Qavi Hub Distribution • Secure Network
            </footer>
        </div>

    );
}
