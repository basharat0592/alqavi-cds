'use client';

import { useState, useRef } from 'react';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { Heart, ArrowUpRight } from 'lucide-react';
import { useWishlist } from '@/context/WishlistContext';
import { getImageUrl, cn } from '@/lib/utils';
import toast from 'react-hot-toast';

interface ShowcaseCarouselProps {
    products: any[];
}

// Fanned "coverflow" carousel: the active card sits upright in the center while
// its neighbours tilt and slide behind it. Click a side card to bring it forward.
export default function ShowcaseCarousel({ products }: ShowcaseCarouselProps) {
    const { addToWishlist, removeFromWishlist, isInWishlist } = useWishlist();
    const [active, setActive] = useState(() => Math.floor((products?.length || 1) / 2));
    const [imgIdx, setImgIdx] = useState<Record<string, number>>({});
    // Swipe / drag navigation (works with touch and mouse).
    // NOTE: every hook must run before any early return — otherwise the hook
    // count changes between an empty-products render and a populated one,
    // which throws React error #300 and white-screens the page.
    const dragStartX = useRef<number | null>(null);

    if (!products || products.length === 0) return null;

    const clampActive = (i: number) => Math.max(0, Math.min(products.length - 1, i));
    const onPointerDown = (e: React.PointerEvent) => { dragStartX.current = e.clientX; };
    const onPointerUp = (e: React.PointerEvent) => {
        if (dragStartX.current === null) return;
        const dx = e.clientX - dragStartX.current;
        dragStartX.current = null;
        if (Math.abs(dx) < 40) return; // ignore taps / tiny moves
        setActive(a => clampActive(dx < 0 ? a + 1 : a - 1));
    };

    return (
        <div className="w-full select-none pb-4 sm:pb-10">
            {/* Stage */}
            <div
                className="relative h-[320px] sm:h-[410px] flex items-center justify-center overflow-hidden touch-pan-y"
                onPointerDown={onPointerDown}
                onPointerUp={onPointerUp}
            >
                {products.map((p, i) => {
                    const offset = i - active;
                    const abs = Math.abs(offset);

                    // Cards more than 2 away are hidden to keep the stage clean.
                    const hidden = abs > 2;

                    const id = String(p.id);
                    const name = (p.product_name || p.name || '').replace(/\s*\(.*?\)\s*$/, '').trim();
                    const price = parseFloat(p.selling_price || p.price || 0);

                    const imgs: string[] = (Array.isArray(p.images) ? p.images : [])
                        .map((im: any) => getImageUrl(im.image || im.url))
                        .filter(Boolean);
                    if (imgs.length === 0) {
                        const single = getImageUrl(p.image || p.catalog_image || p.image_url);
                        if (single) imgs.push(single);
                    }
                    const currentImg = imgs[imgIdx[id] || 0] || imgs[0] || '/images/logo.png';

                    const wishlisted = isInWishlist(id);

                    const handleWishlist = async (e: React.MouseEvent) => {
                        e.preventDefault();
                        e.stopPropagation();
                        if (wishlisted) {
                            await removeFromWishlist(id);
                            toast.success('Removed from wishlist');
                        } else {
                            await addToWishlist({ id, name, price, image: currentImg, category: p.category_name || 'Cosmetics', addedAt: new Date().toISOString() });
                            toast.success('Added to wishlist');
                        }
                    };

                    return (
                        <motion.div
                            key={id}
                            initial={false}
                            animate={{
                                x: `${offset * 56}%`,
                                rotate: offset * 13,
                                scale: offset === 0 ? 1 : 0.82,
                                y: offset === 0 ? 0 : 26,
                                opacity: hidden ? 0 : abs === 2 ? 0.55 : 1,
                                zIndex: 30 - abs,
                            }}
                            transition={{ type: 'spring', stiffness: 260, damping: 30 }}
                            onClick={() => offset !== 0 && setActive(clampActive(i))}
                            className={cn(
                                "absolute w-[190px] sm:w-[270px] bg-white rounded-[28px] sm:rounded-[34px] p-2 sm:p-2.5 shadow-[0_30px_60px_-20px_rgba(0,0,0,0.45)]",
                                offset !== 0 ? "cursor-pointer" : "cursor-default",
                                hidden && "pointer-events-none"
                            )}
                        >
                            {/* Image */}
                            <div className="relative rounded-[26px] overflow-hidden aspect-[4/5] bg-[#F0F7FF]">
                                <img src={currentImg} alt={name} className="w-full h-full object-cover" draggable={false} />

                                {/* Wishlist */}
                                <button
                                    onClick={handleWishlist}
                                    aria-label="Add to wishlist"
                                    className={cn(
                                        "absolute top-3 right-3 w-10 h-10 rounded-full flex items-center justify-center backdrop-blur-md transition-all duration-300",
                                        wishlisted ? "bg-[#13B0D1] text-white" : "bg-black/35 text-white hover:bg-black/55"
                                    )}
                                >
                                    <Heart className={cn("h-4 w-4", wishlisted && "fill-white")} />
                                </button>

                                {/* Image dots */}
                                {imgs.length > 1 && (
                                    <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex items-center gap-1.5">
                                        {imgs.map((_, di) => (
                                            <button
                                                key={di}
                                                onClick={(e) => { e.preventDefault(); e.stopPropagation(); setImgIdx(s => ({ ...s, [id]: di })); }}
                                                aria-label={`View image ${di + 1}`}
                                                className={cn(
                                                    "h-1.5 rounded-full transition-all duration-300",
                                                    (imgIdx[id] || 0) === di ? "w-5 bg-white" : "w-1.5 bg-white/55 hover:bg-white/80"
                                                )}
                                            />
                                        ))}
                                    </div>
                                )}
                            </div>

                            {/* Footer */}
                            <div className="flex items-center justify-between gap-2 px-1.5 pt-3 pb-0.5">
                                <div className="min-w-0">
                                    <h3 className="text-[15px] font-bold text-[#1E1B4B] truncate">{name}</h3>
                                    <p className="text-[17px] font-extrabold text-amber-500 leading-tight">Rs.{price.toLocaleString()}</p>
                                </div>
                                <Link
                                    href={`/customer/product/${id}`}
                                    onClick={(e) => e.stopPropagation()}
                                    aria-label={`View ${name}`}
                                    className="flex-shrink-0 w-10 h-10 rounded-full bg-[#111] text-white flex items-center justify-center hover:bg-[#13B0D1] hover:scale-105 active:scale-95 transition-all duration-300"
                                >
                                    <ArrowUpRight className="h-4 w-4" />
                                </Link>
                            </div>
                        </motion.div>
                    );
                })}
            </div>

            {/* Progress dots */}
            <div className="flex items-center justify-center gap-2 mt-3 sm:mt-6">
                {products.map((_, i) => (
                    <button
                        key={i}
                        onClick={() => setActive(i)}
                        aria-label={`Go to product ${i + 1}`}
                        className={cn(
                            "h-2 rounded-full transition-all duration-300",
                            i === active ? "w-7 bg-[#111]" : "w-2 bg-slate-300 hover:bg-slate-400"
                        )}
                    />
                ))}
            </div>
        </div>
    );
}
