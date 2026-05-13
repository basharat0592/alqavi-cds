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
}: ProductCardProps & { variant?: 'default' | 'minimal' | 'overlay' | 'luxury' }) {
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
        
        if (onAddToCart) {
            onAddToCart(1);
        } else {
            addToCart({
                id: id,
                name: title,
                price: price,
                image: image || '',
                category: category,
                weight: weight,
                size: size,
                batch: batch,
                quantity: 1
            });
        }
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
    const isLuxury = variant === 'luxury';

    return (
        <div className={cn(
            "group relative bg-white rounded-[8px] shadow-sm hover:shadow-md transition-all duration-300 flex border border-[#D5D9D9] overflow-hidden",
            isHorizontal ? "flex-row h-[180px] md:h-[220px]" : "flex-col",
            isOverlay && "aspect-square",
            isLuxury && "border-0 shadow-xl rounded-[16px] ring-1 ring-slate-100"
        )}>

            {/* 1. IMAGE PORTAL - ZERO PADDING */}
            <div className={cn(
                "relative bg-[#F0F7FF] flex items-center justify-center overflow-hidden group/img",
                isHorizontal ? "w-1/3 aspect-square" : "aspect-[4/3] w-full",
                isOverlay && "w-full h-full aspect-square absolute inset-0"
            )}>
                {/* Badges Stack - Top Left */}
                <div className="absolute top-2 left-2 z-20 flex flex-col gap-1.5">
                    {batch && (
                        <div className="px-2 py-0.5 bg-[#111]/80 backdrop-blur-md rounded-[3px] shadow-lg flex items-center gap-1.5 border border-white/20">
                            <Package className="h-2.5 w-2.5 text-white" />
                            <span className="text-white text-[8px] font-black uppercase tracking-widest">
                                {batch}
                            </span>
                        </div>
                    )}
                    {badge && (
                        <div className="px-2 py-0.5 bg-red-600 rounded-[3px] shadow-lg flex items-center gap-1.5 border border-white/20">
                            <Sparkles className="h-2.5 w-2.5 text-white fill-white animate-pulse" />
                            <span className="text-white text-[8px] font-black uppercase tracking-widest">
                                {badge}
                            </span>
                        </div>
                    )}
                </div>

                {/* Wishlist Icon - Top Right on Image */}
                {!isOverlay && (
                    <button
                        onClick={handleWishlist}
                        className={`absolute top-2 right-2 z-20 w-8 h-8 rounded-full flex items-center justify-center transition-all duration-300 backdrop-blur-md border border-white/50
                            ${isWishlisted
                                ? 'bg-[#13B0D1] text-white shadow-lg'
                                : 'bg-white/80 text-[#13B0D1] hover:bg-white shadow-sm'
                            }`}
                    >
                        <Heart className={`h-3.5 w-3.5 ${isWishlisted ? 'fill-white' : ''}`} />
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
                    <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent p-4 flex flex-col justify-end">
                        <h3 className="text-white text-lg font-black uppercase tracking-tighter leading-none mb-1">{title}</h3>
                        <p className="text-[#13B0D1] font-black text-base">Rs.{price.toLocaleString()}</p>
                    </div>
                )}
            </div>

            {/* 2. CONTENT AREA - WITH PADDING */}
            {!isOverlay && (
                <div className={cn(
                    "p-2.5 md:p-3 flex flex-col flex-1",
                    isHorizontal && "justify-center"
                )}>
                    {/* Product Info */}
                    <div className="mb-3">
                        <div className="flex items-start justify-between gap-2">
                            <Link href={`/customer/product/${id}`} className="flex-1">
                                <h3 className={cn(
                                    "font-black text-[#1E1B4B] leading-tight line-clamp-1 uppercase tracking-tight group-hover:text-[#0891B2] transition-colors",
                                    isHorizontal ? "text-base md:text-lg" : "text-[11px]"
                                )}>
                                    {title}
                                </h3>
                            </Link>
                            {!isHorizontal && (
                                <span className={cn(
                                    "font-black text-[#0891B2] whitespace-nowrap tracking-tighter",
                                    "text-[13px]"
                                )}>
                                    Rs.{price.toLocaleString()}
                                </span>
                            )}
                            {isHorizontal && (
                                <span className="text-lg md:text-xl font-black text-[#0891B2] whitespace-nowrap tracking-tighter">
                                    Rs.{price.toLocaleString()}
                                </span>
                            )}
                        </div>
                        {!isMinimal && (weight || size || batch) && (
                            <div className="flex items-center gap-2 mt-0.5">
                                <span className="text-[#FD8E23] font-bold text-[9px] uppercase tracking-widest">
                                    {weight} {weight && (size || batch) ? '•' : ''} {size} {(size && batch) ? '•' : ''} {batch && `Batch: ${batch}`}
                                </span>
                            </div>
                        )}

                        {/* Description */}
                        {!isMinimal && description && (
                            <div className="mt-1.5 relative">
                                <p className={cn(
                                    "text-[#475569] leading-tight font-medium line-clamp-2 pr-2",
                                    isHorizontal ? "text-xs" : "text-[10px]"
                                )}>
                                    {description}
                                </p>
                                <Link
                                    href={`/customer/product/${id}`}
                                    className="absolute bottom-0 right-0 bg-white pl-1 text-[#FD8E23] font-black text-[10px] hover:underline"
                                >
                                    Read More
                                </Link>
                            </div>
                        )}
                    </div>

                    {/* 3. ACTION ROW */}
                    <div className={cn(
                        "flex items-center mt-auto",
                        isHorizontal ? "max-w-[160px]" : "w-full"
                    )}>
                        {/* Add to Cart Button - Full Width */}
                        <div className="w-full">
                            {quantityInCart === 0 ? (
                                <button
                                    onClick={handleAddToCart}
                                    disabled={stock === 0}
                                    className={`w-full h-8 rounded-[4px] text-[10px] font-bold uppercase tracking-widest flex items-center justify-center transition-all duration-300
                                        ${stock === 0
                                            ? 'bg-slate-100 text-slate-300 cursor-not-allowed'
                                            : 'bg-[#119AB8] text-white hover:bg-[#13B0D1] shadow-sm active:scale-95'
                                        }`}
                                >
                                    Add To Cart
                                </button>
                            ) : (
                                <div className="w-full h-8 bg-[#119AB8] rounded-[4px] flex items-center justify-between px-2 text-white shadow-sm">
                                    <button
                                        onClick={(e) => handleUpdateQuantity(e, -1)}
                                        className="w-5 h-5 rounded-md hover:bg-white/20 flex items-center justify-center transition-colors"
                                    >
                                        <Minus className="h-2.5 w-2.5 stroke-[4]" />
                                    </button>
                                    <span className="text-[12px] font-bold">{quantityInCart}</span>
                                    <button
                                        onClick={(e) => handleUpdateQuantity(e, 1)}
                                        disabled={stock !== undefined && quantityInCart >= stock}
                                        className="w-5 h-5 rounded-md hover:bg-white/20 flex items-center justify-center transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
                                    >
                                        <Plus className="h-2.5 w-2.5 stroke-[4]" />
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

