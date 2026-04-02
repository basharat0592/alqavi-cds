'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Star, ShoppingCart, Eye, Heart, Check, Package } from 'lucide-react';

interface ProductCardProps {
    id?: string;
    title: string;
    image?: string;
    rating?: number;
    reviews?: number;
    price: number;
    originalPrice?: number;
    category?: string;
    badge?: string;
    stock?: number;
    onAddToCart?: (qty: number) => void;
    onWishlist?: () => void;
}

export default function ProductCard({
    id = '#',
    title,
    image,
    rating = 4.5,
    reviews = 12,
    price,
    originalPrice,
    category = 'Cosmetic',
    badge,
    stock,
    onAddToCart,
    onWishlist,
}: ProductCardProps) {
    const [added, setAdded] = useState(false);
    const [wishlisted, setWishlisted] = useState(false);

    const discount = originalPrice && originalPrice > price
        ? Math.round(((originalPrice - price) / originalPrice) * 100)
        : null;

    const handleAddToCart = (e: React.MouseEvent) => {
        e.preventDefault();
        if (added) return;
        setAdded(true);
        onAddToCart?.(1); // Default to 1 unit
        setTimeout(() => setAdded(false), 2500);
    };

    const handleWishlist = (e: React.MouseEvent) => {
        e.preventDefault();
        setWishlisted(w => !w);
        onWishlist?.();
    };

    const renderStars = (r: number) =>
        Array.from({ length: 5 }).map((_, i) => (
            <Star
                key={i}
                className={`h-3 w-3 ${i < Math.floor(r) ? 'fill-[#EEAF1C] text-[#EEAF1C]' : i < r ? 'fill-[#EEAF1C]/50 text-[#EEAF1C]' : 'fill-gray-200 text-gray-200'}`}
            />
        ));

    return (
        <div className="group relative bg-white dark:bg-[#0D1921] rounded-2xl border border-gray-100 dark:border-white/5 hover:border-[#EEAF1C]/30 hover:shadow-xl hover:shadow-[#EEAF1C]/8 transition-all duration-400 overflow-hidden flex flex-col">

            {/* Badges Row */}
            <div className="absolute top-3 left-3 z-10 flex flex-col gap-1.5">
                {badge && (
                    <span className="px-2.5 py-1 bg-[#EEAF1C] text-white text-[9px] font-black uppercase tracking-widest rounded-lg shadow-md">
                        {badge}
                    </span>
                )}
                {discount && (
                    <span className="px-2.5 py-1 bg-red-500 text-white text-[9px] font-black uppercase tracking-widest rounded-lg shadow-md">
                        -{discount}%
                    </span>
                )}
                {stock !== undefined && stock <= 5 && stock > 0 && (
                    <span className="px-2.5 py-1 bg-orange-100 text-orange-700 text-[9px] font-black uppercase tracking-widest rounded-lg border border-orange-200">
                        Only {stock} left
                    </span>
                )}
                {stock === 0 && (
                    <span className="px-2.5 py-1 bg-gray-100 dark:bg-white/10 text-gray-500 dark:text-white/40 text-[9px] font-black uppercase tracking-widest rounded-lg">
                        Out of Stock
                    </span>
                )}
            </div>

            {/* Wishlist Button */}
            <button
                onClick={handleWishlist}
                className={`absolute top-3 right-3 z-10 w-9 h-9 rounded-xl flex items-center justify-center transition-all duration-300 shadow-sm border
                    ${wishlisted
                        ? 'bg-red-500 border-red-400 text-white scale-110'
                        : 'bg-white/90 dark:bg-white/5 border-gray-200 dark:border-white/10 text-gray-400 dark:text-white/40 hover:border-red-300 hover:text-red-400'
                    }`}
                title={wishlisted ? 'Remove from Wishlist' : 'Add to Wishlist'}
            >
                <Heart className={`h-4 w-4 ${wishlisted ? 'fill-white' : ''} transition-transform duration-200 ${wishlisted ? 'scale-110' : ''}`} />
            </button>

            {/* Image Area */}
            <Link href={`/product/${id}`} className="block relative overflow-hidden bg-gray-50 dark:bg-white/[0.03]" style={{ aspectRatio: '4/3' }}>
                <img
                    src={image || 'https://images.unsplash.com/photo-1596462502278-27bfdd403cc2?q=80&w=600&auto=format&fit=crop'}
                    alt={title}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700"
                />
                {/* Quick View Overlay */}
                <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-all duration-400 flex items-center justify-center">
                    <span className="px-4 py-2 bg-white/90 dark:bg-[#0D1921]/90 backdrop-blur-sm rounded-xl text-[10px] font-black uppercase tracking-widest text-slate-900 dark:text-white opacity-0 group-hover:opacity-100 translate-y-3 group-hover:translate-y-0 transition-all duration-300 flex items-center gap-2 border border-white/50 dark:border-white/10 shadow-lg">
                        <Eye className="h-3.5 w-3.5" /> Quick View
                    </span>
                </div>
            </Link>

            {/* Content Area */}
            <div className="p-4 flex flex-col flex-1">

                {/* Category + Rating */}
                <div className="flex items-center justify-between mb-2">
                    <span className="text-[9px] font-black text-[#EEAF1C] uppercase tracking-[0.18em]">{category}</span>
                    <div className="flex items-center gap-1.5">
                        <div className="flex items-center gap-0.5">{renderStars(rating)}</div>
                        <span className="text-[9px] font-black text-slate-400 dark:text-white/30">({reviews})</span>
                    </div>
                </div>

                {/* Title */}
                <Link href={`/product/${id}`} className="block mb-3">
                    <h3 className="text-sm font-black text-gray-900 dark:text-white line-clamp-2 group-hover:text-[#EEAF1C] transition-colors tracking-tight leading-snug">
                        {title}
                    </h3>
                </Link>

                {/* Spacer */}
                <div className="flex-1" />

                {/* Price Row */}
                <div className="flex items-end justify-between mb-3">
                    <div>
                        <p className="text-[8px] text-slate-400 dark:text-white/25 font-black uppercase tracking-[0.2em] mb-0.5">Price</p>
                        <div className="flex items-baseline gap-2">
                            <p className="text-lg font-black text-gray-900 dark:text-white tracking-tighter leading-none">
                                Rs.{price.toLocaleString()}
                            </p>
                            {originalPrice && originalPrice > price && (
                                <p className="text-xs text-slate-400 dark:text-white/25 font-bold line-through leading-none">
                                    Rs.{originalPrice.toLocaleString()}
                                </p>
                            )}
                        </div>
                    </div>
                    {/* Stock indicator */}
                    {stock !== undefined && stock > 5 && (
                        <div className="flex items-center gap-1 text-emerald-500">
                            <Package className="h-3 w-3" />
                            <span className="text-[9px] font-black uppercase tracking-widest">In Stock</span>
                        </div>
                    )}
                </div>

                {/* Add to Cart Button */}
                <button
                    onClick={handleAddToCart}
                    disabled={stock === 0}
                    className={`w-full py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest flex items-center justify-center gap-2 transition-all duration-300 border
                        ${added
                            ? 'bg-emerald-500 border-emerald-400 text-white shadow-lg shadow-emerald-500/20'
                            : stock === 0
                                ? 'bg-gray-100 dark:bg-white/5 border-gray-200 dark:border-white/10 text-gray-400 dark:text-white/20 cursor-not-allowed'
                                : 'bg-[#131921] dark:bg-white/10 border-[#131921] dark:border-white/10 text-white hover:bg-[#EEAF1C] hover:border-[#EEAF1C] hover:shadow-lg hover:shadow-[#EEAF1C]/20 active:scale-95'
                        }`}
                >
                    {added ? (
                        <>
                            <Check className="h-3.5 w-3.5 animate-in zoom-in duration-300" />
                            Added!
                        </>
                    ) : stock === 0 ? (
                        'Out of Stock'
                    ) : (
                        <>
                            <ShoppingCart className="h-3.5 w-3.5" />
                            Add to Cart
                        </>
                    )}
                </button>
            </div>
        </div>
    );
}

