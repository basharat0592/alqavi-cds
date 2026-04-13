'use client';

import { HelpCircle, MessageSquare, Phone, Search, BookOpen, Zap, FileText } from 'lucide-react';

export default function SupplierSupport() {
    const TOPICS = [
        { title: 'Onboarding Guide', icon: BookOpen, desc: 'Getting started with Al-Qavi Supplier Hub' },
        { title: 'Inventory & Shipping', icon: Zap, desc: 'Logistics, warehouse protocols, and dispatch' },
        { title: 'Settlement Inquiry', icon: FileText, desc: 'Payment cycles, invoices, and tax records' },
    ];

    return (
        <div className="max-w-[900px] mx-auto animate-in fade-in duration-700 pb-20">

            {/* Header */}
            <div className="mb-10">
                <h1 className="text-3xl font-medium text-slate-900 border-b pb-4 mb-4">Partner Support</h1>
                <p className="text-sm text-slate-500 font-medium">
                    Access priority assistance and comprehensive documentation for your distribution business.
                </p>
            </div>

            {/* Search */}
            <div className="relative mb-10">
                <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                <input
                    type="text"
                    placeholder="Search for solutions or documentation..."
                    className="w-full pl-11 pr-4 py-3 bg-white border border-gray-300 rounded focus:outline-none focus:border-[#F59E0B] transition-all text-sm"
                />
            </div>

            {/* Topic Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-5 mb-10">
                {TOPICS.map((topic, idx) => (
                    <div key={idx} className="bg-white border border-gray-200 rounded-xl p-5 shadow-sm hover:border-[#F59E0B] transition-all cursor-pointer group">
                        <div className="w-10 h-10 bg-gray-50 rounded-xl flex items-center justify-center text-[#F59E0B] group-hover:scale-110 transition-transform mb-3">
                            <topic.icon size={20} />
                        </div>
                        <h3 className="font-bold text-slate-900 text-sm mb-1">{topic.title}</h3>
                        <p className="text-xs text-slate-500 leading-relaxed">{topic.desc}</p>
                    </div>
                ))}
            </div>

            {/* Contact Options */}
            <div className="grid md:grid-cols-2 gap-6">
                <div className="bg-white border border-gray-200 rounded-xl p-7 shadow-sm">
                    <div className="flex items-center gap-3 mb-4">
                        <div className="w-10 h-10 bg-blue-50 text-blue-600 rounded-xl flex items-center justify-center">
                            <MessageSquare size={20} />
                        </div>
                        <div>
                            <h3 className="font-bold text-slate-900 text-sm">Priority Chat</h3>
                            <p className="text-[10px] font-black text-emerald-600 uppercase tracking-widest">Always Online</p>
                        </div>
                    </div>
                    <p className="text-sm text-slate-600 mb-6 leading-relaxed">
                        Connect directly with your dedicated account executive for immediate shipment and settlement queries.
                    </p>
                    <button className="w-full py-2.5 bg-slate-900 text-white font-bold text-xs uppercase tracking-widest rounded hover:bg-slate-800 transition-all">
                        Start Discussion
                    </button>
                </div>

                <div className="bg-white border border-gray-200 rounded-xl p-7 shadow-sm">
                    <div className="flex items-center gap-3 mb-4">
                        <div className="w-10 h-10 bg-amber-50 text-amber-600 rounded-xl flex items-center justify-center">
                            <Phone size={20} />
                        </div>
                        <div>
                            <h3 className="font-bold text-slate-900 text-sm">Partner Hotline</h3>
                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">9AM – 6PM PKT</p>
                        </div>
                    </div>
                    <p className="text-sm text-slate-600 mb-6 leading-relaxed">
                        Our executive logistics team is available for telephonic coordination during business hours.
                    </p>
                    <div className="flex items-center justify-between p-3 bg-gray-50 rounded border border-gray-100">
                        <span className="text-sm font-black text-slate-900">+92 321 8765432</span>
                        <button className="text-[11px] font-bold text-[#F59E0B] hover:text-[#F59E0B] uppercase transition-colors">Copy</button>
                    </div>
                </div>
            </div>

            {/* Footer */}
            <div className="mt-14 pt-8 border-t border-gray-200 flex items-center justify-center gap-8 text-[10px] font-black text-slate-400 uppercase tracking-widest">
                <span className="hover:text-slate-700 cursor-pointer transition-colors">Terms of Service</span>
                <span className="w-1 h-1 bg-gray-300 rounded-full" />
                <span className="hover:text-slate-700 cursor-pointer transition-colors">Privacy Protocol</span>
                <span className="w-1 h-1 bg-gray-300 rounded-full" />
                <span className="hover:text-slate-700 cursor-pointer transition-colors">System Status</span>
            </div>
        </div>
    );
}
