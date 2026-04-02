'use client';

import { 
    HelpCircle, 
    MessageSquare, 
    FileText, 
    Phone, 
    Mail, 
    ChevronRight,
    Search,
    BookOpen,
    Zap
} from 'lucide-react';
import Link from 'next/link';

export default function SupplierSupport() {
    const TOPICS = [
        { title: "Onboarding Guide", icon: BookOpen, desc: "Getting started with Al-Qavi" },
        { title: "Inventory Shipping", icon: Zap, desc: "Logistics and warehouse protocols" },
        { title: "Settlement Inquiry", icon: FileText, desc: "Payment cycles and tax invoices" }
    ];

    return (
        <div className="max-w-[1000px] mx-auto animate-in fade-in duration-700 pb-20">
            
            {/* Title Area */}
            <div className="mb-10 px-2 text-center">
                <h1 className="text-4xl font-medium text-slate-900 mb-4 tracking-tight">Executive Partner Support</h1>
                <p className="text-slate-500 font-medium max-w-lg mx-auto">Access priority assistance and comprehensive documentation for your distribution business.</p>
            </div>

            {/* Support Search */}
            <div className="max-w-2xl mx-auto mb-16 px-2">
                <div className="relative group">
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-[#F7CA00] transition-colors" size={20} />
                    <input 
                        type="text" 
                        placeholder="Search for solutions or documentation..." 
                        className="w-full pl-12 pr-4 py-4 bg-white border border-gray-200 rounded-2xl shadow-sm focus:outline-none focus:ring-4 focus:ring-yellow-500/10 focus:border-[#F7CA00] transition-all text-lg"
                    />
                </div>
            </div>

            {/* Topic Grid */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-16">
                {TOPICS.map((topic, idx) => (
                    <div key={idx} className="bg-white border border-gray-200 rounded-2xl p-6 shadow-sm hover:border-[#F7CA00] transition-all cursor-pointer group">
                        <div className="w-12 h-12 bg-gray-50 rounded-xl flex items-center justify-center text-[#F7CA00] group-hover:scale-110 transition-transform mb-4">
                            <topic.icon size={24} />
                        </div>
                        <h3 className="font-black text-slate-900 uppercase tracking-tight mb-2">{topic.title}</h3>
                        <p className="text-xs text-slate-500 font-medium leading-relaxed">{topic.desc}</p>
                    </div>
                ))}
            </div>

            {/* Direct Contact Options */}
            <div className="grid md:grid-cols-2 gap-8">
                <div className="bg-white border border-gray-200 rounded-2xl p-8 shadow-sm">
                    <div className="flex items-center gap-4 mb-6">
                        <div className="w-12 h-12 bg-blue-50 text-blue-600 rounded-xl flex items-center justify-center">
                            <MessageSquare size={24} />
                        </div>
                        <div>
                            <h3 className="font-bold text-slate-900 leading-none mb-1">Priority Chat</h3>
                            <p className="text-[10px] font-black text-emerald-600 uppercase tracking-widest">Always Online</p>
                        </div>
                    </div>
                    <p className="text-sm text-slate-600 mb-8 leading-relaxed">Connect directly with your dedicated account executive for immediate shipment and settlement queries.</p>
                    <button className="w-full py-2.5 bg-slate-900 text-white font-black text-xs uppercase tracking-widest rounded-lg hover:bg-slate-800 transition-all shadow-lg shadow-slate-900/20">Start Discussion</button>
                </div>

                <div className="bg-white border border-gray-200 rounded-2xl p-8 shadow-sm">
                    <div className="flex items-center gap-4 mb-6">
                        <div className="w-12 h-12 bg-amber-50 text-amber-600 rounded-xl flex items-center justify-center">
                            <Phone size={24} />
                        </div>
                        <div>
                            <h3 className="font-bold text-slate-900 leading-none mb-1">Partner Hotline</h3>
                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">9AM - 6PM PKT</p>
                        </div>
                    </div>
                    <p className="text-sm text-slate-600 mb-8 leading-relaxed">Prefer voice? Our executive logistics team is available for telephonic coordination during business hours.</p>
                    <div className="flex items-center justify-between p-3 bg-gray-50 rounded-xl border border-gray-100">
                        <span className="text-sm font-black text-slate-900 tracking-tighter uppercase">+92 321 8765432</span>
                        <button className="text-[10px] font-black text-[#007185] uppercase hover:text-[#F7CA00]">Copy Link</button>
                    </div>
                </div>
            </div>

            {/* Bottom FAQ link */}
            <div className="mt-16 pt-8 border-t border-gray-200 flex items-center justify-center gap-8 text-[11px] font-black text-slate-400 uppercase tracking-[0.3em]">
                <span className="hover:text-slate-900 cursor-pointer">Terms of Service</span>
                <span className="w-1.5 h-1.5 bg-gray-200 rounded-full"></span>
                <span className="hover:text-slate-900 cursor-pointer">Privacy Protocol</span>
                <span className="w-1.5 h-1.5 bg-gray-200 rounded-full"></span>
                <span className="hover:text-slate-900 cursor-pointer">System Status</span>
            </div>
        </div>
    );
}
