'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { ArrowRight, Sparkles } from 'lucide-react';
import Navbar from '@/components/layout/Navbar';
import Footer from '@/components/layout/Footer';
import cmsService, { SiteSettings } from '@/services/cms.service';

const POSTS = [
    {
        category: 'Skincare',
        title: 'Building a Simple, Effective Skincare Routine',
        excerpt: 'Cleanse, treat, moisturize, protect — the four steps that matter most, and how to choose the right products for your skin type.',
        date: 'Coming soon',
    },
    {
        category: 'Makeup',
        title: 'Everyday Looks That Last All Day',
        excerpt: 'From flawless base to long-wear finishes, our guide to makeup that stays fresh from morning to evening.',
        date: 'Coming soon',
    },
    {
        category: 'Fragrance',
        title: 'How to Find Your Signature Scent',
        excerpt: 'Understanding notes, families, and longevity so you can choose a fragrance that truly feels like you.',
        date: 'Coming soon',
    },
    {
        category: 'Hair Care',
        title: 'Healthy Hair Starts at the Roots',
        excerpt: 'Nourishment, hydration, and protection — the essentials for stronger, shinier hair every season.',
        date: 'Coming soon',
    },
    {
        category: 'Ingredients',
        title: 'Decoding the Labels: Ingredients That Work',
        excerpt: 'A friendly breakdown of the hero ingredients you keep seeing — what they do and who they are for.',
        date: 'Coming soon',
    },
    {
        category: 'Tips',
        title: 'Seasonal Beauty: Adapting Your Routine',
        excerpt: 'Your skin and hair change with the weather. Here is how to adjust your routine through the year.',
        date: 'Coming soon',
    },
];

export default function BlogPage() {
    const [settings, setSettings] = useState<SiteSettings | null>(null);

    useEffect(() => {
        cmsService.getFullState().then(data => setSettings(data.settings)).catch(() => { });
    }, []);

    return (
        <div className="min-h-screen bg-white font-sans text-[#0f1111] w-full overflow-x-hidden flex flex-col">
            <Navbar settings={settings || undefined} />

            {/* LIGHT HEADER — same style as Wishlist / Tracking pages */}
            <div className="bg-white border-b border-[#D5D9D9] py-4">
                <div className="max-w-[1240px] mx-auto px-6">
                    <p className="text-[11px] font-black uppercase tracking-[0.2em] text-[#119AB8] mb-1">Beauty Journal</p>
                    <h1 className="text-[24px] font-bold tracking-tight">Tips, Trends &amp; Beauty Stories</h1>
                    <p className="text-[14px] text-[#565959] mt-1 max-w-2xl">Expert guides, routines, and inspiration from our beauty team. Fresh articles are on the way — here is a taste of what is coming.</p>
                </div>
            </div>

            {/* POSTS GRID */}
            <section className="flex-1 max-w-6xl mx-auto w-full px-6 md:px-12 py-16 md:py-20">
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8">
                    {POSTS.map((post, i) => (
                        <motion.article
                            key={i}
                            initial={{ opacity: 0, y: 20 }}
                            whileInView={{ opacity: 1, y: 0 }}
                            viewport={{ once: true }}
                            transition={{ duration: 0.4, delay: i * 0.05 }}
                            className="group rounded-2xl border border-slate-200 overflow-hidden hover:shadow-xl hover:border-[#119AB8]/40 transition-all duration-300 flex flex-col"
                        >
                            <div className="relative h-40 bg-gradient-to-br from-[#F5E9E2] via-[#F8F4F1] to-[#EBD9CF] flex items-center justify-center">
                                <Sparkles className="text-[#C8927A]" size={28} />
                                <span className="absolute top-4 left-4 text-[10px] font-black uppercase tracking-[0.2em] text-[#8A5A44] bg-white/70 backdrop-blur-sm px-3 py-1 rounded-full">
                                    {post.category}
                                </span>
                            </div>
                            <div className="p-6 flex flex-col flex-1">
                                <p className="text-[11px] font-bold uppercase tracking-widest text-slate-400 mb-2">{post.date}</p>
                                <h2 className="text-lg font-bold text-[#0f1111] leading-snug mb-3 group-hover:text-[#119AB8] transition-colors">
                                    {post.title}
                                </h2>
                                <p className="text-[14px] text-slate-600 leading-relaxed flex-1">{post.excerpt}</p>
                                <span className="mt-5 inline-flex items-center gap-2 text-[12px] font-black uppercase tracking-widest text-slate-300">
                                    Read soon <ArrowRight size={14} />
                                </span>
                            </div>
                        </motion.article>
                    ))}
                </div>

                <div className="mt-16 text-center">
                    <p className="text-[15px] text-slate-600 mb-6">
                        Want to be notified when new articles go live?
                    </p>
                    <Link
                        href="/customer/shop"
                        className="inline-flex items-center gap-2 px-8 py-4 bg-[#111] text-white rounded-full font-bold uppercase tracking-widest text-[12px] hover:bg-[#119AB8] transition-all active:scale-95"
                    >
                        Explore the Shop <ArrowRight size={16} />
                    </Link>
                </div>
            </section>

            <Footer settings={settings || undefined} />
        </div>
    );
}
