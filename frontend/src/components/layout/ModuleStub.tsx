'use client';

import React from 'react';
import {
    Construction,
    ArrowLeft,
    ChevronRight,
    LayoutDashboard,
    Bell,
    Settings
} from 'lucide-react';
import Link from 'next/link';

interface SubModulePageProps {
    title: string;
    section: string;
    description?: string;
}

export default function SubModuleStub({ title, section, description }: SubModulePageProps) {
    return (
        <div className="max-w-5xl mx-auto py-12 px-4">
            {/* Breadcrumbs */}
            <div className="flex items-center gap-2 text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-8">
                <Link href="/admin/dashboard text-gray-400 hover:text-[#007185]">Dashboard</Link>
                <ChevronRight size={10} />
                <span className="text-gray-400">{section}</span>
                <ChevronRight size={10} />
                <span className="text-gray-900">{title}</span>
            </div>

            <div className="bg-white border border-[#D5D9D9] rounded shadow-sm overflow-hidden">
                {/* Header Banner */}
                <div className="bg-[#232F3E] p-10 text-white relative overflow-hidden">
                    <div className="relative z-10">
                        <div className="flex items-center gap-4 mb-4">
                            <div className="w-12 h-12 bg-[#F7CA00] rounded shadow-lg flex items-center justify-center">
                                <Construction className="w-7 h-7 text-white" />
                            </div>
                            <span className="bg-[#ffffff20] text-[#F7CA00] px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest border border-[#ffffff10]">
                                System Engineering Mode
                            </span>
                        </div>
                        <h1 className="text-4xl font-black tracking-tighter uppercase italic mb-2">
                            {title}
                        </h1>
                        <p className="text-gray-400 font-medium max-w-xl leading-relaxed">
                            {description || `This module is currently being optimized and integrated into the ${section} suite. Real-time data synchronization and Amazon-style interfaces are coming soon.`}
                        </p>
                    </div>

                    {/* Decorative Background Element */}
                    <div className="absolute top-0 right-0 -mr-16 -mt-16 w-64 h-64 bg-[#F7CA00]/10 rounded-full blur-3xl" />
                </div>

                {/* Content Area */}
                <div className="p-12 text-center border-b border-[#D5D9D9]">
                    <div className="max-w-md mx-auto">
                        <div className="w-20 h-20 bg-gray-50 rounded-full flex items-center justify-center mx-auto mb-6 border border-[#D5D9D9] shadow-inner text-gray-200">
                            <Construction size={40} />
                        </div>
                        <h3 className="text-xl font-black text-gray-900 tracking-tight uppercase mb-4">Implementation in Progress</h3>
                        <p className="text-sm text-gray-500 font-medium leading-relaxed mb-8">
                            We are configuring the backend tables and frontend schemas for <strong>{title}</strong>. This section will feature full CRUD capabilities and seamless integration with the core ERP database.
                        </p>
                        <div className="flex items-center justify-center gap-4">
                            <Link href="/admin/dashboard" className="px-8 py-3 bg-[#F7CA00] border border-[#a88734] text-gray-900 font-black text-xs uppercase tracking-widest rounded hover:bg-[#F0982D] transition-all shadow-md active:scale-95 flex items-center gap-2">
                                <LayoutDashboard size={14} strokeWidth={2.5} /> Return to Cockpit
                            </Link>
                        </div>
                    </div>
                </div>

                {/* Technical Roadmap */}
                <div className="bg-[#F7FAFA] p-8">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        {[
                            { step: "01", name: "Data Schema", status: "Verified", desc: "Database tables and relationships defined." },
                            { step: "02", name: "API Integrity", status: "Active", desc: "Backend endpoints established for data flow." },
                            { step: "03", name: "UI Synthesis", status: "Wait", desc: "Amazon-style premium interface layering." }
                        ].map((item, i) => (
                            <div key={i} className="bg-white border border-[#D5D9D9] p-5 rounded shadow-sm">
                                <div className="flex items-center justify-between mb-3">
                                    <span className="text-[10px] font-black text-[#F7CA00] uppercase tracking-widest">Phase {item.step}</span>
                                    <span className={`text-[9px] font-black uppercase px-2 py-0.5 rounded ${item.status === 'Wait' ? 'bg-amber-100 text-amber-700' : 'bg-emerald-100 text-emerald-700'}`}>
                                        {item.status}
                                    </span>
                                </div>
                                <h4 className="text-xs font-black text-gray-900 uppercase tracking-tight mb-1">{item.name}</h4>
                                <p className="text-[10px] text-gray-500 font-medium italic">{item.desc}</p>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );
}
