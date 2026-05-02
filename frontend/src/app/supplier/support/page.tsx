'use client';

import React from 'react';
import { HelpCircle, MessageSquare, Phone, Search, BookOpen, Zap, FileText, ChevronRight, Activity, ShieldCheck, Headphones } from 'lucide-react';
import { useRouter } from 'next/navigation';

export default function SupplierSupport() {
    const router = useRouter();
    const TOPICS = [
        { title: 'Onboarding Guide', icon: BookOpen, desc: 'Getting started with Al-Qavi Supplier Hub protocols.' },
        { title: 'Inventory & Shipping', icon: Zap, desc: 'Logistics, warehouse protocols, and dispatch management.' },
        { title: 'Settlement Inquiry', icon: FileText, desc: 'Payment cycles, invoices, and financial tax records.' },
    ];

    return (
        <div className="max-w-[1000px] mx-auto animate-in fade-in duration-500 font-sans text-left">

            {/* ── Page Header ── */}
            <div className="mb-8">
                <h1 className="text-3xl font-medium text-slate-900 mb-2">Partner Support</h1>
                <p className="text-sm text-slate-500 font-medium">Access priority assistance and comprehensive documentation for your distribution business.</p>
            </div>

            {/* ── Search Module ── */}
            <div className="relative mb-10 group">
                <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-[#F59E0B] transition-colors" size={18} />
                <input
                    type="text"
                    placeholder="Search for solutions or documentation..."
                    className="w-full pl-11 pr-4 py-3 bg-white border border-gray-300 rounded-xl focus:outline-none focus:border-[#F59E0B] transition-all text-sm shadow-sm"
                />
            </div>

            {/* ── Knowledge Hub ── */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-12">
                {TOPICS.map((topic, idx) => (
                    <div key={idx} className="bg-white border border-gray-300 rounded-2xl p-6 shadow-sm hover:border-[#F59E0B] transition-all cursor-pointer group hover:shadow-md">
                        <div className="w-12 h-12 bg-slate-50 rounded-2xl flex items-center justify-center text-slate-400 group-hover:text-[#F59E0B] group-hover:bg-amber-50 transition-all mb-4">
                            <topic.icon size={24} />
                        </div>
                        <h3 className="font-bold text-slate-900 text-[15px] mb-1.5 uppercase tracking-tight">{topic.title}</h3>
                        <p className="text-xs text-slate-500 leading-relaxed font-medium">{topic.desc}</p>
                    </div>
                ))}
            </div>

            {/* ── Direct Terminals ── */}
            <div className="grid md:grid-cols-2 gap-6 mb-12">
                <div className="bg-white border border-gray-300 rounded-2xl p-8 shadow-sm group">
                    <div className="flex items-center gap-4 mb-6">
                        <div className="w-12 h-12 bg-emerald-50 text-emerald-600 rounded-2xl flex items-center justify-center shadow-inner">
                            <MessageSquare size={24} />
                        </div>
                        <div>
                            <h3 className="font-bold text-slate-900 text-base">Priority Hub Chat</h3>
                            <p className="text-[10px] font-black text-emerald-600 uppercase tracking-widest flex items-center gap-1.5">
                                <div className="h-1.5 w-1.5 rounded-full bg-emerald-600 animate-pulse" /> Always Online
                            </p>
                        </div>
                    </div>
                    <p className="text-[14px] text-slate-600 mb-8 leading-relaxed font-medium">
                        Connect directly with your dedicated account executive for immediate shipment and settlement queries.
                    </p>
                    <button className="h-12 w-full bg-slate-900 hover:bg-black text-white font-black text-[10px] uppercase tracking-[0.2em] rounded-xl shadow-xl transition-all active:scale-95">
                        Initialize Discussion
                    </button>
                </div>

                <div className="bg-white border border-gray-300 rounded-2xl p-8 shadow-sm">
                    <div className="flex items-center gap-4 mb-6">
                        <div className="w-12 h-12 bg-amber-50 text-[#F59E0B] rounded-2xl flex items-center justify-center shadow-inner">
                            <Phone size={24} />
                        </div>
                        <div>
                            <h3 className="font-bold text-slate-900 text-base">Partner Hotline</h3>
                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">9AM – 6PM PKT</p>
                        </div>
                    </div>
                    <p className="text-[14px] text-slate-600 mb-8 leading-relaxed font-medium">
                        Our executive logistics team is available for real-time telephonic coordination during business hours.
                    </p>
                    <div className="flex items-center justify-between p-4 bg-slate-50 rounded-xl border border-gray-200">
                        <span className="text-[15px] font-black text-slate-900">+92 321 8765432</span>
                        <button className="text-[11px] font-black text-[#F59E0B] hover:underline uppercase tracking-widest">Copy</button>
                    </div>
                </div>
            </div>

            {/* ── Protocol Footer ── */}
            <div className="bg-slate-900 rounded-3xl p-8 relative overflow-hidden group shadow-2xl">
                <div className="absolute -right-8 -bottom-8 opacity-10 text-white rotate-12 group-hover:scale-110 transition-transform">
                    <ShieldCheck size={160} />
                </div>
                <h4 className="text-[11px] font-black text-white/40 uppercase tracking-[0.3em] mb-4">Support Protocol</h4>
                <p className="text-[14px] font-bold text-white leading-relaxed tracking-tight relative z-10 max-w-2xl">
                    All support interactions are logged within the distributed audit ledger. Priority response is granted based on your node's performance metrics and settlement history.
                </p>
                <div className="flex gap-4 mt-6 relative z-10">
                    <div className="bg-white/5 border border-white/10 px-4 py-2 rounded-xl flex items-center gap-2 text-[10px] font-black text-white uppercase">
                         <Activity size={14} className="text-[#F59E0B]" /> Node Healthy
                    </div>
                    <div className="bg-white/5 border border-white/10 px-4 py-2 rounded-xl flex items-center gap-2 text-[10px] font-black text-white uppercase">
                         <Headphones size={14} className="text-blue-400" /> Executive Priority
                    </div>
                </div>
            </div>

            <div className="mt-12 text-center opacity-20">
                <p className="text-[9px] font-black text-slate-300 uppercase tracking-[0.6em]">Partner Support Node v4.1</p>
            </div>
        </div>
    );
}
