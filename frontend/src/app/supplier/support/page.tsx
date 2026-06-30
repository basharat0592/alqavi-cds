'use client';

import React from 'react';
import { HelpCircle, MessageSquare, Phone, Search, BookOpen, Zap, FileText, ChevronRight, Activity, ShieldCheck, Headphones, ExternalLink, Mail, Shield } from 'lucide-react';
import { useRouter } from 'next/navigation';

export default function SupplierSupport() {
    const router = useRouter();
    const TOPICS = [
        { title: 'Onboarding Guide', icon: BookOpen, desc: 'Complete manual for new partners joining the Al-Qavi Hub distribution network.' },
        { title: 'Inventory Protocols', icon: Zap, desc: 'Standards for warehouse management, SKU registration, and stock dispatch.' },
        { title: 'Financial Ledger', icon: FileText, desc: 'Understanding your settlement cycles, tax reporting, and ledger maintenance.' },
    ];

    return (
        <div className="max-w-[1200px] mx-auto animate-in fade-in duration-500 font-sans text-left p-6">

            {/* ── Page Header (Same as Orders Page) ── */}
            <div className="mb-8">
                <h1 className="text-3xl font-medium text-slate-900 leading-tight">Partner Support</h1>
                <p className="text-[13px] text-slate-500 mt-1 font-medium">Access priority documentation and dedicated assistance for your business operations.</p>
            </div>

            {/* ── Search Module (Same as Orders Page style) ── */}
            <div className="relative mb-10 group">
                <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-[#F59E0B] transition-colors" size={18} />
                <input
                    type="text"
                    placeholder="Search for guides, protocols, or solutions..."
                    className="w-full pl-12 pr-4 py-3 bg-white border border-gray-300 rounded-xl focus:outline-none focus:border-[#F59E0B] transition-all text-sm shadow-sm"
                />
            </div>

            {/* ── Knowledge Base ── */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 mb-12">
                {TOPICS.map((topic, idx) => (
                    <div key={idx} className="bg-white border border-gray-200 rounded-2xl p-8 shadow-sm hover:border-[#F59E0B] hover:shadow-md transition-all cursor-pointer group">
                        <div className="w-14 h-14 bg-slate-50 rounded-xl flex items-center justify-center text-slate-400 group-hover:text-[#F59E0B] group-hover:bg-amber-50 transition-all mb-6">
                            <topic.icon size={28} />
                        </div>
                        <h3 className="font-bold text-slate-900 text-[15px] mb-2 uppercase tracking-tight">{topic.title}</h3>
                        <p className="text-[13px] text-slate-500 leading-relaxed font-medium mb-4">{topic.desc}</p>
                        <div className="flex items-center gap-1 text-[11px] font-black text-[#F59E0B] uppercase tracking-widest opacity-0 group-hover:opacity-100 transition-opacity">
                            Read Guide <ExternalLink size={12} />
                        </div>
                    </div>
                ))}
            </div>

            {/* ── Direct Assistance Terminals ── */}
            <div className="grid md:grid-cols-2 gap-8 mb-12">
                {/* Chat Terminal */}
                <div className="bg-white border border-gray-200 rounded-3xl p-10 shadow-sm group hover:shadow-md transition-all">
                    <div className="flex items-center gap-5 mb-8">
                        <div className="w-16 h-16 bg-emerald-50 text-emerald-600 rounded-2xl flex items-center justify-center shadow-inner group-hover:scale-110 transition-transform">
                            <MessageSquare size={32} />
                        </div>
                        <div>
                            <h3 className="font-bold text-slate-900 text-lg uppercase tracking-tight">Executive Hub Chat</h3>
                            <div className="flex items-center gap-2 mt-1">
                                <span className="flex h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
                                <span className="text-[10px] font-black text-emerald-600 uppercase tracking-[0.2em]">Priority Online</span>
                            </div>
                        </div>
                    </div>
                    <p className="text-[15px] text-slate-500 mb-10 leading-relaxed font-medium">
                        Connect directly with our logistics headquarters for real-time coordination of your active shipments and financial settlements.
                    </p>
                    <button className="w-full py-4 bg-slate-900 hover:bg-black text-white font-bold text-sm rounded-2xl transition-all shadow-xl shadow-slate-900/10 active:scale-[0.98]">
                        Open Secure Discussion
                    </button>
                </div>

                {/* Telephone Terminal */}
                <div className="bg-white border border-gray-200 rounded-3xl p-10 shadow-sm group hover:shadow-md transition-all">
                    <div className="flex items-center gap-5 mb-8">
                        <div className="w-16 h-16 bg-amber-50 text-[#F59E0B] rounded-2xl flex items-center justify-center shadow-inner group-hover:scale-110 transition-transform">
                            <Phone size={32} />
                        </div>
                        <div>
                            <h3 className="font-bold text-slate-900 text-lg uppercase tracking-tight">Partner Hotline</h3>
                            <div className="flex items-center gap-2 mt-1">
                                <span className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">09:00 – 18:00 PKT</span>
                            </div>
                        </div>
                    </div>
                    <p className="text-[15px] text-slate-500 mb-10 leading-relaxed font-medium">
                        Our dedicated support team is available for urgent telephonic verification and account inquiries during standard business hours.
                    </p>
                    <div className="flex items-center justify-between p-5 bg-slate-50 rounded-2xl border border-gray-100">
                        <div className="flex flex-col">
                            <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Direct Dial</span>
                            <span className="text-lg font-black text-slate-900">+92 321 8765432</span>
                        </div>
                        <button className="p-3 bg-white border border-gray-200 rounded-xl text-slate-400 hover:text-[#F59E0B] hover:border-[#F59E0B] transition-all shadow-sm">
                             <Mail size={18} />
                        </button>
                    </div>
                </div>
            </div>

            {/* ── Compliance Footer ── */}
            <div className="bg-slate-900 rounded-[32px] p-10 relative overflow-hidden group shadow-2xl">
                {/* Background Decor */}
                <div className="absolute -right-12 -bottom-12 opacity-5 text-white rotate-12 group-hover:scale-110 transition-transform">
                    <ShieldCheck size={200} />
                </div>
                
                <div className="relative z-10">
                    <div className="flex items-center gap-3 mb-6">
                        <div className="p-2 bg-white/10 rounded-lg">
                            <Shield className="text-amber-400" size={20} />
                        </div>
                        <h4 className="text-[12px] font-black text-white/50 uppercase tracking-[0.3em]">Support Protocol & Ledger</h4>
                    </div>
                    
                    <p className="text-lg font-bold text-white/90 leading-relaxed max-w-3xl mb-8">
                        Every support interaction is timestamped and recorded within our distribution audit log. Priority response is automatically allocated based on your warehouse performance and fulfillment history.
                    </p>
                    
                    <div className="flex flex-wrap gap-4">
                        <div className="bg-white/5 border border-white/10 px-5 py-2.5 rounded-xl flex items-center gap-3">
                             <Activity size={16} className="text-emerald-400" />
                             <span className="text-[11px] font-black text-white uppercase tracking-wider">Node Status: Optimized</span>
                        </div>
                        <div className="bg-white/5 border border-white/10 px-5 py-2.5 rounded-xl flex items-center gap-3">
                             <Headphones size={16} className="text-blue-400" />
                             <span className="text-[11px] font-black text-white uppercase tracking-wider">Tier: Executive Partner</span>
                        </div>
                    </div>
                </div>
            </div>

            <div className="mt-16 text-center opacity-30">
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.8em]">Operational Support System v5.2.0</p>
            </div>
        </div>
    );
}
