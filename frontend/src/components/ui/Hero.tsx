'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowRight, Sparkles, Star, ChevronRight, ChevronLeft } from 'lucide-react';
import Link from 'next/link';

import { getImageUrl } from '@/lib/utils';

const DEFAULT_SLIDES = [
    {
        title: "Beauty Redefined",
        subtitle: "Luxury Cosmetics",
        description: "Experience the pinnacle of beauty artistry. Our premium studio collections bring professional-grade results to your daily routine.",
        cta: "Shop the Collection",
        href: "/customer/shop",
        video: "/images/beauty-studio.mp4",
        img: "/images/hero-artist.jpg",
        color: "from-amber-500 to-orange-600"
    },
    {
        title: "Studio Artistry",
        subtitle: "Scientific Artistry",
        description: "Witness the magic of cosmetics through our ultra-high-definition captures. Ethereal looks crafted with scientific precision.",
        cta: "Explore Shop",
        href: "/customer/shop",
        video: "/images/abstract-cosmetics.mp4",
        img: "/images/hero-collage.png",
        color: "from-pink-500 to-rose-600"
    }
];

const Particles = () => (
    <div className="absolute inset-0 z-1 pointer-events-none overflow-hidden">
        {[...Array(12)].map((_, i) => (
            <motion.div
                key={i}
                className="absolute w-1 h-1 bg-white/20 rounded-full"
                initial={{
                    x: `${Math.random() * 100}%`,
                    y: `${Math.random() * 100}%`,
                    opacity: 0
                }}
                animate={{
                    y: ["100%", "-10%"],
                    x: [`${Math.random() * 100}%`, `${Math.random() * 100}%`],
                    opacity: [0, 0.5, 0]
                }}
                transition={{
                    duration: Math.random() * 20 + 10,
                    repeat: Infinity,
                    ease: "linear",
                    delay: Math.random() * 10
                }}
            />
        ))}
    </div>
);

const Grain = () => (
    <div className="absolute inset-0 z-[5] pointer-events-none opacity-[0.03] mix-blend-overlay" style={{ backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.65' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)'/%3E%3C/svg%3E")` }} />
);

export default function Hero({ slides }: { slides?: any[] }) {
    const [currentSlide, setCurrentSlide] = useState(0);
    const [isHovered, setIsHovered] = useState(false);

    const activeSlides = slides && slides.length > 0 ? slides.map(s => ({
        title: s.title || "New Arrival",
        subtitle: s.subtitle || "Featured Collection",
        description: s.description || "",
        cta: s.cta_text || "Shop Now",
        href: s.cta_link || "/customer/shop",
        img: getImageUrl(s.image || s.img || s.src || s.url) || "/images/hero-artist.jpg",
        video: s.media_type === 'video' ? getImageUrl(s.video) : null,
        color: "from-amber-500 to-orange-600" // Default for now
    })) : DEFAULT_SLIDES;

    useEffect(() => {
        if (isHovered || activeSlides[currentSlide].video) return;
        const timer = setInterval(() => {
            nextSlide();
        }, 6000);
        return () => clearInterval(timer);
    }, [isHovered, currentSlide, activeSlides]);

    const nextSlide = () => setCurrentSlide((prev) => (prev + 1) % activeSlides.length);
    const prevSlide = () => setCurrentSlide((prev) => (prev - 1 + activeSlides.length) % activeSlides.length);

    return (
        <section
            className="relative h-[70vh] lg:h-[75vh] overflow-hidden bg-[#0F172A]"
            onMouseEnter={() => setIsHovered(true)}
            onMouseLeave={() => setIsHovered(false)}
        >
            <Grain />
            <Particles />

            <div className="absolute inset-0 z-0 overflow-hidden">
                <div className="absolute -top-[10%] -left-[10%] w-[50%] h-[50%] bg-[#F59E0B]/10 blur-[150px] rounded-full animate-pulse" />
                <div className="absolute -bottom-[10%] -right-[10%] w-[50%] h-[50%] bg-purple-500/10 blur-[150px] rounded-full animate-pulse" style={{ animationDelay: '2s' }} />
            </div>

            <AnimatePresence mode="wait">
                <motion.div
                    key={currentSlide}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 1.2, ease: "easeInOut" }}
                    className="absolute inset-0"
                >
                    <motion.div
                        initial={{ scale: 1.2, rotate: 1 }}
                        animate={{ scale: 1, rotate: 0 }}
                        transition={{ duration: 10, ease: "linear" }}
                        className="relative w-full h-full"
                    >
                        {activeSlides[currentSlide].video ? (
                            <video
                                src={activeSlides[currentSlide].video}
                                autoPlay
                                muted
                                playsInline
                                onEnded={nextSlide}
                                className="w-full h-full object-cover opacity-50 lg:opacity-70 grayscale-[20%] contrast-[110%]"
                            />
                        ) : (
                            <img
                                src={activeSlides[currentSlide].img}
                                alt={activeSlides[currentSlide].title}
                                className="w-full h-full object-cover opacity-80 lg:opacity-90 grayscale-[10%] contrast-[105%]"
                            />
                        )}
                        <div className="absolute inset-0 bg-gradient-to-r from-[#0F172A]/80 via-[#0F172A]/30 to-transparent lg:from-[#0F172A]/60 lg:via-[#0F172A]/20 lg:to-transparent" />
                        <div className="absolute inset-0 bg-gradient-to-t from-[#0F172A]/40 via-transparent to-transparent opacity-40" />
                    </motion.div>
                </motion.div>
            </AnimatePresence>

            <div className="relative z-10 h-full w-full px-4 md:px-8 lg:px-16 flex flex-col justify-center items-start text-left">
                <div className="max-w-4xl flex flex-col items-start">
                    <AnimatePresence mode="wait">
                        <motion.div
                            key={currentSlide}
                            initial={{ x: -30, opacity: 0 }}
                            animate={{ x: 0, opacity: 1 }}
                            exit={{ x: 30, opacity: 0 }}
                            transition={{ type: "spring", stiffness: 100, damping: 20 }}
                        >
                            <motion.div
                                initial={{ opacity: 0, scale: 0.8 }}
                                animate={{ opacity: 1, scale: 1 }}
                                transition={{ delay: 0.2 }}
                                className="inline-flex items-center gap-2 px-4 py-1.5 bg-white/5 backdrop-blur-2xl rounded-full border border-white/10 mb-6"
                            >
                                <Sparkles className="h-4 w-4 text-[#F59E0B]" />
                                <span className="text-[10px] md:text-xs font-bold uppercase tracking-[0.3em] text-white/90">
                                    {activeSlides[currentSlide].subtitle}
                                </span>
                            </motion.div>

                            <h1 className="text-4xl md:text-6xl lg:text-7xl font-black leading-none tracking-tighter mb-4 drop-shadow-2xl flex flex-wrap items-center gap-x-3">
                                {activeSlides[currentSlide].title.split(' ').map((word: string, i: number) => (
                                    <span key={i} className="inline-block overflow-hidden h-fit">
                                        <motion.span
                                            initial={{ y: "100%" }}
                                            animate={{ y: 0 }}
                                            transition={{ delay: 0.4 + (i * 0.1), duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
                                            className={`inline-block ${i === 0 ? "text-white" : "bg-clip-text text-transparent bg-gradient-to-r " + activeSlides[currentSlide].color}`}
                                        >
                                            {word}
                                        </motion.span>
                                    </span>
                                ))}
                            </h1>

                            <motion.p
                                initial={{ opacity: 0, filter: "blur(10px)" }}
                                animate={{ opacity: 1, filter: "blur(0px)" }}
                                transition={{ delay: 0.6 }}
                                className="text-sm md:text-lg text-slate-300/90 max-w-xl mb-8 leading-relaxed font-medium"
                            >
                                {activeSlides[currentSlide].description}
                            </motion.p>

                            <motion.div
                                initial={{ opacity: 0, x: -20 }}
                                animate={{ opacity: 1, x: 0 }}
                                transition={{ delay: 0.8 }}
                                className="flex flex-wrap gap-5 justify-start"
                            >
                                <motion.div
                                    whileHover={{ scale: 1.05 }}
                                    whileTap={{ scale: 0.98 }}
                                    className="relative group mt-4"
                                >
                                    <Link
                                        href={activeSlides[currentSlide].href}
                                        className="relative px-4 py-3 flex items-center group"
                                    >
                                        <span className="relative z-20 flex items-center gap-6 text-sm md:text-base text-white">
                                            <span className="font-black uppercase tracking-[0.5em] bg-clip-text text-transparent bg-gradient-to-r from-white via-white to-white/50 group-hover:from-[#F59E0B] group-hover:to-[#FFB81C] transition-all duration-500">
                                                {activeSlides[currentSlide].cta}
                                            </span>
                                            <motion.div
                                                animate={{ x: [0, 10, 0] }}
                                                transition={{ repeat: Infinity, duration: 1.5, ease: "easeInOut" }}
                                            >
                                                <ArrowRight className="h-6 w-6 stroke-[3px] text-[#F59E0B]" />
                                            </motion.div>
                                        </span>

                                        <div className="absolute bottom-0 left-0 w-full">
                                            <div className="h-[1px] w-full bg-white/10" />
                                            <motion.div
                                                className="h-[3px] w-full bg-gradient-to-r from-[#F59E0B] via-[#FFB81C] to-[#E67E22] absolute top-0 left-0"
                                                initial={{ scaleX: 0.2, opacity: 0.5 }}
                                                whileHover={{ scaleX: 1, opacity: 1 }}
                                                transition={{ duration: 0.5, ease: "circOut" }}
                                            />
                                            <div className="absolute top-0 left-0 w-full h-[10px] bg-[#F59E0B]/30 blur-md opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                                        </div>
                                    </Link>
                                </motion.div>
                            </motion.div>
                        </motion.div>
                    </AnimatePresence>
                </div>
            </div>

            <div className="absolute inset-y-0 inset-x-0 z-20 pointer-events-none flex items-center justify-between px-4 md:px-8 lg:px-12">
                <button
                    onClick={prevSlide}
                    className="p-3 md:p-4 rounded-full bg-white/5 backdrop-blur-xl border border-white/10 text-white hover:bg-white/20 transition-all active:scale-90 pointer-events-auto group"
                >
                    <ChevronLeft className="h-6 w-6 group-hover:-translate-x-0.5 transition-transform" />
                </button>
                <button
                    onClick={nextSlide}
                    className="p-3 md:p-4 rounded-full bg-white/5 backdrop-blur-xl border border-white/10 text-white hover:bg-white/20 transition-all active:scale-90 pointer-events-auto group"
                >
                    <ChevronRight className="h-6 w-6 group-hover:translate-x-0.5 transition-transform" />
                </button>
            </div>

            <div className="absolute bottom-8 left-1/2 -translate-x-1/2 z-20 flex items-center gap-3 bg-white/5 backdrop-blur-xl border border-white/10 px-6 py-3.5 rounded-full">
                {activeSlides.map((_, i) => (
                    <button
                        key={i}
                        onClick={() => setCurrentSlide(i)}
                        className="group relative h-1.5 w-10 md:w-12 bg-white/10 rounded-full overflow-hidden transition-all hover:w-16"
                    >
                        <div
                            className={`absolute inset-0 bg-[#F59E0B] transition-all duration-700 ease-out ${currentSlide === i ? 'w-full' : 'w-0'}`}
                        />
                    </button>
                ))}
            </div>

            <div className="absolute bottom-0 right-16 z-20 hidden lg:flex flex-col items-center h-32">
                <motion.div
                    animate={{ y: [0, 15, 0] }}
                    transition={{ repeat: Infinity, duration: 2 }}
                    className="w-[1px] h-12 bg-gradient-to-b from-[#F59E0B] to-transparent"
                />
            </div>

            <div className="absolute left-16 top-1/2 -translate-y-1/2 -rotate-90 origin-left hidden xl:block">
                <span className="text-[10px] font-bold text-white/10 uppercase tracking-[1em] whitespace-nowrap">
                    Premium Cosmetics & Beauty Supply
                </span>
            </div>
        </section>
    );
}
