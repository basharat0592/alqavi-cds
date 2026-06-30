'use client';

import { usePathname } from 'next/navigation';
import { useState, useEffect } from 'react';
import { MessageCircle, ShieldCheck, Sparkles } from 'lucide-react';
import cmsService, { SiteSettings } from '@/services/cms.service';

const WhatsAppButton = () => {
    const pathname = usePathname();
    const isAdminPage = pathname?.startsWith('/admin');
    const [settings, setSettings] = useState<SiteSettings | null>(null);

    useEffect(() => {
        cmsService.getFullState().then(data => setSettings(data.settings));
    }, []);

    if (isAdminPage) return null;

    const phoneNumber = settings?.whatsapp_number || '923105855299';
    // Clean number for link (remove +, -, spaces)
    const cleanNumber = phoneNumber.replace(/\D/g, '');
    const whatsappUrl = `https://wa.me/${cleanNumber}?text=Hi!%20I%20need%20help%20with%20my%20order.`;

    return (
        <div className="fixed bottom-4 right-4 sm:bottom-10 sm:right-10 z-[50] print:hidden">
            <div className="relative group">
                {/* ── ULTRA-PRO BACKDROP NEBULA (Layered Atmospheric Glow) ── */}
                <div className="absolute -inset-10 bg-gradient-to-tr from-[#25D366]/15 via-[#D4AF37]/10 to-transparent rounded-full blur-[50px] opacity-0 group-hover:opacity-100 transition-opacity duration-1000 pointer-events-none" />

                {/* ── THE CONCIERGE COMMAND BAR (Entire Bar is Clickable) ── */}
                <a 
                    href={whatsappUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="relative flex items-center bg-white/95 dark:bg-black/90 backdrop-blur-3xl border-0 rounded-full sm:rounded-[2.5rem] p-1 sm:p-1.5 shadow-[0_20px_50px_rgba(0,0,0,0.15)] transition-all duration-700 ease-[cubic-bezier(0.23,1,0.32,1)] hover:shadow-[0_45px_100px_rgba(0,0,0,0.3)] hover:-translate-y-3 outline-none focus:outline-none"
                    aria-label="Chat on WhatsApp"
                >
                    <div className="flex items-center">
                        {/* EXPANDABLE CONTENT (Desktop Only) */}
                        <div className="hidden sm:flex items-center w-[240px] opacity-100 overflow-hidden transition-all duration-700 ease-[cubic-bezier(0.23,1,0.32,1)]">
                            {/* Part 1: Brand Jewel */}
                            <div className="flex-shrink-0 w-10 h-10 ml-1.5 bg-gradient-to-br from-[#111] via-slate-900 to-black rounded-[1rem] flex items-center justify-center border border-white/10 shadow-xl relative overflow-hidden transition-all duration-700 group-hover:rotate-[360deg]">
                                <div className="absolute inset-0 bg-gradient-to-tr from-[#D4AF37]/30 to-transparent opacity-60" />
                                <Sparkles className="w-4 h-4 text-[#D4AF37] animate-pulse" />
                            </div>

                            {/* Part 2: Dynamic Info Center */}
                            <div className="flex flex-col px-4 py-1 whitespace-nowrap">
                                <div className="flex items-center gap-2 mb-0.5">
                                    <span className="text-[8px] font-black uppercase tracking-[0.3em] text-[#D4AF37] opacity-80">Official</span>
                                    <div className="flex items-center gap-1.5 bg-[#25D366]/10 px-2 py-0.5 rounded-full border border-[#25D366]/20">
                                        <span className="w-1 h-1 rounded-full bg-[#25D366] animate-pulse shadow-[0_0_8px_#25D366]" />
                                        <span className="text-[6px] font-black text-[#25D366] uppercase tracking-[0.2em]">Online</span>
                                    </div>
                                </div>
                                <h4 className="text-[12px] font-black text-slate-900 dark:text-white tracking-tight uppercase leading-none">Need Help?</h4>
                            </div>
                        </div>

                        {/* ALWAYS VISIBLE: WhatsApp Anchor */}
                        <div className="relative group/wa">
                            <div className="w-10 h-10 sm:w-12 sm:h-12 bg-gradient-to-br from-[#25D366] to-[#128C7E] rounded-full sm:rounded-[1.2rem] flex items-center justify-center shadow-xl group-hover:rounded-full transition-all duration-700 overflow-hidden border border-white/20">
                                <div className="absolute top-0 left-0 w-full h-[50%] bg-white/25 rounded-b-full pointer-events-none" />
                                <MessageCircle className="w-5.5 h-5.5 sm:w-6 sm:h-6 text-white drop-shadow-md" strokeWidth={2.5} />
                                
                                {/* Inner shine animation */}
                                <div className="absolute -inset-x-full top-0 h-full w-[200%] bg-gradient-to-r from-transparent via-white/10 to-transparent skew-x-[-20deg] transition-all duration-1000 group-hover:translate-x-full" />
                            </div>
                        </div>
                    </div>
                </a>

                {/* ── ULTRA-PRO HOVER TOOLTIP (Authorized Badge - Desktop Only) ── */}
                <div className="absolute -top-14 left-1/2 -translate-x-1/2 opacity-0 group-hover:opacity-100 transition-all duration-500 translate-y-4 group-hover:translate-y-0 pointer-events-none hidden sm:block">
                    <div className="bg-white/95 dark:bg-black/90 backdrop-blur-2xl px-5 py-2.5 rounded-2xl shadow-2xl border border-slate-100 dark:border-white/5 flex items-center gap-3 whitespace-nowrap">
                        <div className="p-1 bg-[#D4AF37]/10 rounded-lg">
                            <ShieldCheck className="w-4 h-4 text-[#D4AF37]" />
                        </div>
                        <div className="flex flex-col">
                            <span className="text-[9px] font-black uppercase tracking-[0.2em] text-slate-900 dark:text-white leading-none mb-1">Secure Chat</span>
                            <span className="text-[8px] font-bold text-slate-400 uppercase tracking-widest leading-none">Official Support</span>
                        </div>
                    </div>
                    {/* Tip */}
                    <div className="absolute -bottom-1.5 left-1/2 -translate-x-1/2 w-3 h-3 bg-white dark:bg-black border-r border-b border-slate-100 dark:border-white/5 rotate-45" />
                </div>

                {/* Bottom Trust Tag (Desktop Only) */}
                <div className="absolute -bottom-8 right-12 opacity-30 group-hover:opacity-100 transition-all duration-700 delay-100 hidden sm:block">
                    <p className="text-[8px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-[0.4em] flex items-center gap-2">
                        <span className="w-1 h-1 bg-slate-400 dark:bg-slate-500 rounded-full" />
                        Fast Response
                        <span className="w-1 h-1 bg-slate-400 dark:bg-slate-500 rounded-full" />
                    </p>
                </div>
            </div>
        </div>
    );
};

export default WhatsAppButton;
