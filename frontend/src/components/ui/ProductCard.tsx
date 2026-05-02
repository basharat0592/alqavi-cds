'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Star, ShoppingCart, Eye, Heart, Check, Package, Plus, Minus } from 'lucide-react';
import { useCart } from "@/context/CartContext";
import { useWishlist } from "@/context/WishlistContext";
import toast from 'react-hot-toast';

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
}: ProductCardProps) {
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

    const renderStars = (r: number) =>
        Array.from({ length: 5 }).map((_, i) => (
            <Star
                key={i}
                className={`h-3 w-3 ${i < Math.floor(r) ? 'fill-[#F59E0B] text-[#F59E0B]' : i < r ? 'fill-[#F59E0B]/50 text-[#F59E0B]' : 'fill-gray-200 text-gray-200'}`}
            />
        ));

    return (
        <div className="group relative bg-white dark:bg-[#1a252f] rounded-2xl border border-gray-100 dark:border-white/5 hover:border-[#F59E0B]/30 hover:shadow-xl hover:shadow-[#F59E0B]/8 transition-all duration-400 overflow-hidden flex flex-col">

            {/* Badges Row */}
            <div className="absolute top-3 left-3 z-10 flex flex-col gap-1.5">
                {batch && (
                    <span className="px-2.5 py-1 bg-[#F59E0B] text-white text-[9px] font-black uppercase tracking-widest rounded-lg shadow-md">
                        {batch}
                    </span>
                )}
                {badge && (
                    <span className="px-2.5 py-1 bg-[#131921] text-white text-[9px] font-black uppercase tracking-widest rounded-lg shadow-md border border-white/10">
                        {badge}
                    </span>
                )}
                {discount && (
                    <span className="px-2.5 py-1 bg-red-500 text-white text-[9px] font-black uppercase tracking-widest rounded-lg shadow-md">
                        -{discount}%
                    </span>
                )}
                {stock !== undefined && stock < 5 && stock > 0 && (
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
                    ${isWishlisted
                        ? 'bg-red-500 border-red-400 text-white scale-110'
                        : 'bg-white/90 dark:bg-white/5 border-gray-200 dark:border-white/10 text-gray-400 dark:text-white/40 hover:border-red-300 hover:text-red-400'
                    }`}
                title={isWishlisted ? 'Remove from Wishlist' : 'Add to Wishlist'}
            >
                <Heart className={`h-4 w-4 ${isWishlisted ? 'fill-white' : ''} transition-transform duration-200 ${isWishlisted ? 'scale-110' : ''}`} />
            </button>

            {/* Image Area */}
            <Link href={`/customer/product/${id}`} className="block relative overflow-hidden bg-gray-100 dark:bg-white/[0.03]" style={{ aspectRatio: '3/2' }}>
                <img
                    src={image || '/images/logo.png'}
                    alt={title}
                    className="w-full h-full object-contain p-0 group-hover:scale-105 transition-transform duration-700"
                />
                {/* Quick View Overlay */}
                <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-all duration-400 flex items-center justify-center">
                    <span className="px-6 py-2.5 bg-white/90 dark:bg-[#1a252f]/90 backdrop-blur-sm rounded-xl text-[11px] font-black uppercase tracking-widest text-slate-900 dark:text-white opacity-0 group-hover:opacity-100 translate-y-3 group-hover:translate-y-0 transition-all duration-300 flex items-center gap-2 border border-white/50 dark:border-white/10 shadow-lg">
                        <Eye className="h-4 w-4" /> Quick View
                    </span>
                </div>
            </Link>

            {/* Content Area */}
            <div className="p-4 flex flex-col flex-1">

                {/* Category + Rating */}
                <div className="flex items-center justify-between mb-2">
                    <span className="text-[11px] font-black text-[#F59E0B] uppercase tracking-[0.18em]">{category}</span>
                    <div className="flex items-center gap-1.5">
                        <div className="flex items-center gap-0.5">{renderStars(rating)}</div>
                        <span className="text-[10px] font-black text-slate-400 dark:text-white/30">({reviews})</span>
                    </div>
                </div>

                {/* Title */}
                <Link href={`/customer/product/${id}`} className="block mb-1">
                    <h3 className="text-[14px] font-black text-gray-900 dark:text-white line-clamp-2 group-hover:text-[#F59E0B] transition-colors tracking-tight leading-tight">
                        {title}
                        {(weight || size) && (
                            <span className="text-[11px] text-[#F59E0B] font-black ml-1.5 inline-flex items-center gap-1.5">
                                <span className="opacity-20 text-slate-400 font-normal">—</span>
                                {weight}{weight && size ? ' • ' : ''}{size}
                            </span>
                        )}
                    </h3>
                </Link>

                {/* Description */}
                {description && (
                    <p className="text-[12px] text-slate-500 line-clamp-2 mt-1 leading-relaxed">
                        {description}
                    </p>
                )}

                {/* Spacer */}
                <div className="flex-1" />

                {/* Price Row */}
                <div className="flex items-end justify-between mb-4">
                    <div>
                        <p className="text-[9px] text-slate-400 dark:text-white/25 font-black uppercase tracking-[0.2em] mb-1">Price</p>
                        <div className="flex items-baseline gap-1.5">
                            <p className="text-[16px] font-black text-gray-900 dark:text-white tracking-tighter leading-none">
                                Rs.{(price || 0).toLocaleString()}
                            </p>
                            {originalPrice && originalPrice > price && (
                                <p className="text-sm text-slate-400 dark:text-white/25 font-bold line-through leading-none">
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
                <div className="relative h-10">
                    {quantityInCart === 0 ? (
                        <button
                            onClick={handleAddToCart}
                            disabled={stock === 0}
                            className={`w-full h-full rounded-xl text-[11px] font-black uppercase tracking-widest flex items-center justify-center gap-2 transition-all duration-300 border
                                ${stock === 0
                                    ? 'bg-gray-100 dark:bg-white/5 border-gray-200 dark:border-white/10 text-gray-400 dark:text-white/20 cursor-not-allowed'
                                    : 'bg-[#131921] dark:bg-white/10 border-[#131921] dark:border-white/10 text-white hover:bg-[#F59E0B] hover:border-[#F59E0B] hover:shadow-lg hover:shadow-[#F59E0B]/20 active:scale-95'
                                }`}
                        >
                            {stock === 0 ? (
                                'Out of Stock'
                            ) : (
                                <>
                                    <ShoppingCart className="h-4 w-4" />
                                    Add to Cart
                                </>
                            )}
                        </button>
                    ) : (
                        <div className="w-full h-full bg-[#F59E0B] rounded-xl flex items-center justify-between px-3 text-white animate-in zoom-in duration-300 overflow-hidden shadow-lg shadow-[#F59E0B]/20">
                            <button
                                onClick={(e) => handleUpdateQuantity(e, -1)}
                                title="Decrease"
                                className="w-10 h-10 rounded-lg hover:bg-white/20 flex items-center justify-center font-black transition-colors"
                            >
                                <Minus className="h-5 w-5" />
                            </button>
                            <span className="text-[12px] font-black">{quantityInCart} in Cart</span>
                            <button
                                onClick={(e) => handleUpdateQuantity(e, 1)}
                                title="Increase"
                                className="w-10 h-10 rounded-lg hover:bg-white/20 flex items-center justify-center font-black transition-colors"
                            >
                                <Plus className="h-5 w-5" />
                            </button>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}

