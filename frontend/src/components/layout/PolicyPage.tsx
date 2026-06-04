'use client';

import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import Navbar from '@/components/layout/Navbar';
import Footer from '@/components/layout/Footer';
import cmsService, { SiteSettings } from '@/services/cms.service';

export interface PolicySection {
    heading: string;
    body: string[];
}

interface PolicyPageProps {
    eyebrow: string;
    title: string;
    intro?: string;
    sections: PolicySection[];
}

export default function PolicyPage({ eyebrow, title, intro, sections }: PolicyPageProps) {
    const [settings, setSettings] = useState<SiteSettings | null>(null);

    useEffect(() => {
        cmsService.getFullState().then(data => setSettings(data.settings)).catch(() => { });
    }, []);

    const brand = settings?.site_name || 'Al-Qavi Cosmetics';

    return (
        <div className="min-h-screen bg-white font-sans text-[#0f1111] w-full overflow-x-hidden flex flex-col">
            <Navbar settings={settings || undefined} />

            {/* HERO */}
            <section className="relative overflow-hidden bg-[#0d1117] text-white">
                <div className="absolute -top-[20%] -left-[10%] w-[50%] h-[60%] bg-[#119AB8]/20 blur-[140px] rounded-full pointer-events-none" />
                <div className="absolute -bottom-[20%] -right-[10%] w-[45%] h-[60%] bg-[#D4AF37]/10 blur-[140px] rounded-full pointer-events-none" />
                <div className="relative z-10 max-w-4xl mx-auto px-6 md:px-12 py-20 md:py-28">
                    <motion.div
                        initial={{ opacity: 0, y: 24 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.6, ease: 'easeOut' }}
                    >
                        <span className="inline-flex items-center gap-2 px-4 py-1.5 bg-[#119AB8]/10 text-[#56C7DD] rounded-full text-[10px] font-black uppercase tracking-[0.4em] border border-[#119AB8]/20 mb-6">
                            {eyebrow}
                        </span>
                        <h1 className="text-4xl sm:text-5xl md:text-6xl font-bold leading-[1.05] tracking-tight mb-6">
                            {title}
                        </h1>
                        {intro && (
                            <p className="text-base md:text-lg text-slate-300 leading-relaxed max-w-2xl">
                                {intro}
                            </p>
                        )}
                    </motion.div>
                </div>
            </section>

            {/* CONTENT */}
            <section className="flex-1 max-w-4xl mx-auto w-full px-6 md:px-12 py-16 md:py-20">
                <div className="space-y-12">
                    {sections.map((section, i) => (
                        <div key={i}>
                            <h2 className="text-xl md:text-2xl font-bold text-[#0f1111] mb-4 flex items-center gap-3">
                                <span className="w-8 h-[3px] bg-[#119AB8] rounded-full" />
                                {section.heading}
                            </h2>
                            <div className="space-y-3 pl-11">
                                {section.body.map((para, j) => (
                                    <p key={j} className="text-[15px] leading-relaxed text-slate-600">
                                        {para}
                                    </p>
                                ))}
                            </div>
                        </div>
                    ))}
                </div>

                <p className="mt-16 text-[13px] text-slate-400 border-t border-slate-100 pt-6">
                    For any questions regarding this policy, please contact{' '}
                    <a href={`mailto:${settings?.contact_email || 'support@alqavi.pk'}`} className="text-[#119AB8] hover:underline font-semibold">
                        {settings?.contact_email || 'support@alqavi.pk'}
                    </a>
                    . © 2026 {brand}. All rights reserved.
                </p>
            </section>

            <Footer settings={settings || undefined} />
        </div>
    );
}
