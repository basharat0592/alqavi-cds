'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Star, ShoppingCart, Eye, Heart, Check, Package, Plus, Minus, Sparkles } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useCart } from "@/context/CartContext";
import { useWishlist } from "@/context/WishlistContext";
import toast from 'react-hot-toast';
import { cn } from '@/lib/utils';

interface ProductCardProps {
    id?: string;
    title: string;
    description?: string;
    image?: string;
    rating?: number;
    reviews?: number;
    price: number;
    originalPrice?: number;
    category?: string;
    badge?: string;
    batch?: string;
    weight?: string;
    size?: string;
    stock?: number;
    onAddToCart?: (qty: number) => void;
    onWishlist?: () => void;
    layout?: 'vertical' | 'horizontal';
}

export default function ProductCard({
    id = '#',
    title,
    description,
    image,
    rating = 4.5,
    reviews = 12,
    price,
    originalPrice,
    category = 'Cosmetic',
    badge,
    batch,
    weight,
    size,
    stock,
    onAddToCart,
    onWishlist,
    layout = 'vertical',
    variant = 'default',
}: ProductCardProps & { variant?: 'default' | 'minimal' | 'overlay' }) {
    const { items, addToCart, updateQuantity } = useCart();
    const { addToWishlist, removeFromWishlist, isInWishlist } = useWishlist();

    const isWishlisted = isInWishlist(id);

    const cartItem = items.find(i => String(i.id) === String(id));
    const quantityInCart = cartItem?.quantity || 0;

    const discount = originalPrice && originalPrice > price
        ? Math.round(((originalPrice - price) / originalPrice) * 100)
        : null;

    const handleAddToCart = (e: React.MouseEvent) => {
        e.preventDefault();
        onAddToCart?.(1); // Default to 1 unit
    };

    const handleUpdateQuantity = (e: React.MouseEvent, delta: number) => {
        e.preventDefault();
        updateQuantity(id, quantityInCart + delta);
    };

    const handleWishlist = async (e: React.MouseEvent) => {
        e.preventDefault();

        const item = {
            id: id,
            name: title,
            price: price,
            image: image || '',
            category: category,
            addedAt: new Date().toISOString()
        };

        if (isWishlisted) {
            await removeFromWishlist(id);
            toast.success('Removed from wishlist');
        } else {
            await addToWishlist(item);
            toast.success('Added to wishlist');
        }
        onWishlist?.();
    };

    const isHorizontal = layout === 'horizontal';
    const isMinimal = variant === 'minimal';
    const isOverlay = variant === 'overlay';

    return (
        <div className={cn(
            "group relative bg-white rounded-[40px] shadow-[0_10px_30px_-5px_rgba(0,0,0,0.1)] hover:shadow-[0_20px_50px_-10px_rgba(0,0,0,0.15)] transition-all duration-500 flex border border-slate-50 overflow-hidden",
            isHorizontal ? "flex-row h-[180px] md:h-[220px]" : "flex-col",
            isOverlay && "aspect-square"
        )}>

            {/* 1. IMAGE PORTAL - ZERO PADDING */}
            <div className={cn(
                "relative bg-[#F0F7FF] flex items-center justify-center overflow-hidden group/img",
                isHorizontal ? "w-1/3 aspect-square" : "aspect-[1.4/1] w-full",
                isOverlay && "w-full h-full aspect-square absolute inset-0"
            )}>
                {/* Badges Stack - Top Left */}
                <div className="absolute top-4 left-4 z-20 flex flex-col gap-2">
                    {batch && (
                        <div className="px-3 py-1.5 bg-[#111]/80 backdrop-blur-md rounded-xl shadow-lg flex items-center gap-2 border border-white/20">
                            <Package className="h-3 w-3 text-white" />
                            <span className="text-white text-[9px] font-black uppercase tracking-widest">
                                Batch: {batch}
                            </span>
                        </div>
                    )}
                    {badge && (
                        <div className="px-3 py-1.5 bg-red-600 rounded-xl shadow-[0_8px_20px_rgba(220,38,38,0.4)] flex items-center gap-2 border border-white/20">
                            <Sparkles className="h-3 w-3 text-white fill-white animate-pulse" />
                            <span className="text-white text-[10px] font-black uppercase tracking-widest">
                                {badge}
                            </span>
                        </div>
                    )}
                </div>

                {/* Wishlist Icon - Top Right on Image */}
                {!isOverlay && (
                    <button
                        onClick={handleWishlist}
                        className={`absolute top-4 right-4 z-20 w-10 h-10 rounded-full flex items-center justify-center transition-all duration-300 backdrop-blur-md border border-white/50
                            ${isWishlisted
                                ? 'bg-[#13B0D1] text-white shadow-lg'
                                : 'bg-white/80 text-[#13B0D1] hover:bg-white shadow-sm'
                            }`}
                    >
                        <Heart className={`h-4.5 w-4.5 ${isWishlisted ? 'fill-white' : ''}`} />
                    </button>
                )}

                <Link href={`/customer/product/${id}`} className="block w-full h-full">
                    <img
                        src={image || '/images/logo.png'}
                        alt={title}
                        className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700 ease-out"
                    />
                </Link>

                {isOverlay && (
                    <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent p-6 flex flex-col justify-end">
                        <h3 className="text-white text-xl font-black uppercase tracking-tighter leading-none mb-1">{title}</h3>
                        <p className="text-[#13B0D1] font-black text-lg">Rs.{price.toLocaleString()}</p>
                    </div>
                )}
            </div>

            {/* 2. CONTENT AREA - WITH PADDING */}
            {!isOverlay && (
                <div className={cn(
                    "p-5 flex flex-col flex-1",
                    isHorizontal && "justify-center"
                )}>
                    {/* Product Info */}
                    <div className="mb-4">
                        <div className="flex items-start justify-between gap-4">
                            <Link href={`/customer/product/${id}`} className="flex-1">
                                <h3 className={cn(
                                    "font-black text-[#1E1B4B] leading-tight line-clamp-1 uppercase tracking-tight group-hover:text-[#0891B2] transition-colors",
                                    isHorizontal ? "text-lg md:text-xl" : "text-[13px]"
                                )}>
                                    {title}
                                </h3>
                            </Link>
                            {!isHorizontal && (
                                <span className={cn(
                                    "font-black text-[#0891B2] whitespace-nowrap tracking-tighter",
                                    "text-[15px]"
                                )}>
                                    Rs.{price.toLocaleString()}
                                </span>
                            )}
                            {isHorizontal && (
                                <span className="text-xl md:text-2xl font-black text-[#0891B2] whitespace-nowrap tracking-tighter">
                                    Rs.{price.toLocaleString()}
                                </span>
                            )}
                        </div>
                        {!isMinimal && (weight || size || batch) && (
                            <div className="flex items-center gap-2 mt-1">
                                <span className="text-slate-400 font-bold text-[10px] uppercase tracking-widest">
                                    {weight} {weight && (size || batch) ? '•' : ''} {size} {(size && batch) ? '•' : ''} {batch && `Batch: ${batch}`}
                                </span>
                            </div>
                        )}

                        {/* Description */}
                        {!isMinimal && description && (
                            <div className="mt-2.5 relative group/desc">
                                <p className={cn(
                                    "text-[#475569] leading-relaxed font-medium pr-1",
                                    isHorizontal ? "text-sm line-clamp-3" : "text-[11px] line-clamp-2"
                                )}>
                                    {description}
                                </p>
                                {!isHorizontal && (
                                    <Link 
                                        href={`/customer/product/${id}`} 
                                        className="absolute bottom-0 right-0 pl-8 bg-gradient-to-r from-transparent via-white/80 to-white text-[#0891B2] font-black text-[11px] hover:underline cursor-pointer"
                                    >
                                        more
                                    </Link>
                                )}
                            </div>
                        )}
                    </div>

                    {/* 3. ACTION ROW */}
                    <div className={cn(
                        "flex items-center mt-auto",
                        isHorizontal ? "max-w-[200px]" : "w-full"
                    )}>
                        {/* Add to Cart Button - Full Width */}
                        <div className="w-full">
                            {quantityInCart === 0 ? (
                                <button
                                    onClick={handleAddToCart}
                                    disabled={stock === 0}
                                    className={`w-full h-11 rounded-full text-[11px] font-black uppercase tracking-widest flex items-center justify-center transition-all duration-300
                                        ${stock === 0
                                            ? 'bg-slate-100 text-slate-300 cursor-not-allowed'
                                            : 'bg-[#13B0D1] text-white hover:bg-[#119ab8] hover:shadow-lg shadow-[#13B0D1]/20 active:scale-95'
                                        }`}
                                >
                                    Add To Cart
                                </button>
                            ) : (
                                <div className="w-full h-11 bg-[#13B0D1] rounded-full flex items-center justify-between px-2.5 text-white shadow-lg">
                                    <button onClick={(e) => handleUpdateQuantity(e, -1)} className="w-7 h-7 rounded-full hover:bg-white/20 flex items-center justify-center">
                                        <Minus className="h-3.5 w-3.5 stroke-[4]" />
                                    </button>
                                    <span className="text-[13px] font-black">{quantityInCart}</span>
                                    <button onClick={(e) => handleUpdateQuantity(e, 1)} className="w-7 h-7 rounded-full hover:bg-white/20 flex items-center justify-center">
                                        <Plus className="h-3.5 w-3.5 stroke-[4]" />
                                    </button>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

