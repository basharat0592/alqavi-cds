'use client';

import { useCart } from "@/context/CartContext";
import { getImageUrl } from "@/lib/utils";
import { X, ShoppingBag, Plus, Minus, Trash2, ArrowRight, ShieldCheck, Info, CheckCircle } from "lucide-react";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import { useEffect, useState } from "react";
import { useWishlist } from "@/context/WishlistContext";

export default function CartDrawer() {
    const { items, cartTotal, removeFromCart, updateQuantity, isCartOpen, closeCart, cartCount } = useCart();
    const { addToWishlist } = useWishlist();

    const shippingThreshold = 5000;
    const isFreeShipping = cartTotal >= shippingThreshold;
    const remainingForFree = shippingThreshold - cartTotal;

    // Prevent scrolling when drawer is open
    useEffect(() => {
        if (isCartOpen) {
            document.body.style.overflow = 'hidden';
        } else {
            document.body.style.overflow = 'unset';
        }
        return () => { document.body.style.overflow = 'unset'; };
    }, [isCartOpen]);

    return (
        <AnimatePresence>
            {isCartOpen && (
                <>
                    {/* Backdrop */}
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={closeCart}
                        className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[10000]"
                    />

                    {/* Drawer */}
                    <motion.div
                        initial={{ x: '100%' }}
                        animate={{ x: 0 }}
                        exit={{ x: '100%' }}
                        transition={{ type: 'spring', damping: 28, stiffness: 220 }}
                        className="fixed top-0 right-0 h-screen w-full sm:w-[460px] bg-white z-[10001] shadow-2xl flex flex-col font-sans"
                    >
                        {/* Header */}
                        <div className="px-6 py-5 border-b border-slate-100 flex items-center justify-between bg-white sticky top-0 z-10">
                            <div className="flex items-center gap-3">
                                <h2 className="text-[15px] font-black text-slate-800 uppercase tracking-[0.2em]">Shopping Bag</h2>
                                <span className="bg-[#119AB8] text-white text-[11px] font-black px-2.5 py-0.5 rounded-full shadow-sm shadow-[#119AB8]/20 animate-pulse">
                                    {cartCount}
                                </span>
                            </div>
                            {items.length > 0 ? (
                                <button
                                    onClick={closeCart}
                                    className="px-3.5 py-1.5 bg-slate-50 hover:bg-[#119AB8]/15 hover:text-[#119AB8] hover:border-[#119AB8]/30 text-slate-500 font-black rounded-xl transition-all duration-200 active:scale-95 text-[10px] uppercase tracking-wider flex items-center gap-1 border border-slate-200/80"
                                >
                                    <span>+ Add More</span>
                                </button>
                            ) : (
                                <button
                                    onClick={closeCart}
                                    className="p-2 hover:bg-slate-50 text-slate-400 hover:text-slate-800 rounded-full transition-all duration-200 active:scale-95"
                                >
                                    <X size={18} />
                                </button>
                            )}
                        </div>

                        {/* Free Shipping Progress Bar */}
                        {items.length > 0 && (
                            <div className="px-6 py-4 bg-slate-50/60 border-b border-slate-100 space-y-2.5">
                                <div className="flex items-center justify-between text-[12px] font-bold">
                                    {isFreeShipping ? (
                                        <span className="flex items-center gap-1.5 text-emerald-600 font-extrabold uppercase tracking-wider">
                                            <CheckCircle size={14} className="stroke-[3]" /> You've earned Free Shipping!
                                        </span>
                                    ) : (
                                        <span className="text-slate-600">
                                            Add <strong className="text-[#f58220]">Rs. {remainingForFree.toLocaleString()}</strong> more for <strong className="text-[#119AB8]">FREE SHIPPING</strong>
                                        </span>
                                    )}
                                    <span className="text-[10px] text-slate-400 font-medium">Goal: Rs. {shippingThreshold.toLocaleString()}</span>
                                </div>
                                <div className="relative w-full h-1.5 bg-slate-200/80 rounded-full overflow-hidden">
                                    <motion.div
                                        initial={{ width: 0 }}
                                        animate={{ width: `${Math.min(100, (cartTotal / shippingThreshold) * 100)}%` }}
                                        transition={{ duration: 0.5, ease: "easeOut" }}
                                        className={`h-full rounded-full bg-gradient-to-r ${isFreeShipping ? 'from-emerald-400 to-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.3)]' : 'from-amber-400 to-[#f58220]'}`}
                                    />
                                </div>
                            </div>
                        )}

                        {/* Content */}
                        <div className="flex-1 overflow-y-auto no-scrollbar px-6 py-4">
                            {items.length === 0 ? (
                                <div className="h-[65vh] flex flex-col items-center justify-center text-center p-6 space-y-6">
                                    <div className="w-24 h-24 bg-slate-50 border border-slate-100 rounded-full flex items-center justify-center relative shadow-inner">
                                        <ShoppingBag size={36} className="text-slate-350" />
                                        <motion.div
                                            animate={{ scale: [1, 1.15, 1] }}
                                            transition={{ repeat: Infinity, duration: 2.5, ease: "easeInOut" }}
                                            className="absolute -top-1 -right-1 w-4 h-4 bg-[#f58220] rounded-full"
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <h3 className="text-[15px] font-black text-slate-800 uppercase tracking-widest">Your Bag is Empty</h3>
                                        <p className="text-xs text-slate-400 font-medium max-w-[240px] leading-relaxed">
                                            Explore our catalog of premium cosmetic and self-care essentials to get started!
                                        </p>
                                    </div>
                                    <button
                                        onClick={closeCart}
                                        className="px-8 py-3 bg-gradient-to-r from-amber-500 to-[#f58220] hover:brightness-105 active:scale-95 text-white font-bold rounded-xl shadow-md shadow-orange-500/10 transition-all text-xs uppercase tracking-wider"
                                    >
                                        Start Shopping
                                    </button>
                                </div>
                            ) : (
                                <div className="space-y-6 pb-10 divide-y divide-slate-100">
                                    {items.map((item, idx) => (
                                        <div key={item.id} className={`flex gap-5 group relative ${idx > 0 ? 'pt-6' : ''}`}>
                                            {/* Product Image */}
                                            <div className="w-24 h-24 shrink-0 bg-white border border-slate-100 rounded-2xl p-3 flex items-center justify-center group-hover:border-[#119AB8]/30 transition-all shadow-sm relative overflow-hidden">
                                                <img src={getImageUrl(item.image)} className="max-w-full max-h-full object-contain mix-blend-multiply group-hover:scale-105 transition-transform duration-300" alt={item.name} />
                                            </div>

                                            {/* Product Info */}
                                            <div className="flex-1 min-w-0 flex flex-col">
                                                <div className="flex justify-between items-start gap-4 mb-1">
                                                    <h4 className="text-[13px] font-bold text-slate-800 uppercase tracking-tight line-clamp-2 leading-snug group-hover:text-[#119AB8] transition-colors">{item.name}</h4>
                                                    <button
                                                        onClick={() => removeFromCart(item.id)}
                                                        className="text-slate-300 hover:text-rose-600 hover:bg-rose-50 p-1.5 rounded-lg transition-colors shrink-0"
                                                        title="Remove Item"
                                                    >
                                                        <Trash2 size={15} />
                                                    </button>
                                                </div>

                                                {/* Weight / Type Display */}
                                                {(item.weight || item.size || item.batch) && (
                                                    <div className="flex items-center gap-2 mb-1.5">
                                                        <span className="text-[9px] font-extrabold text-[#FD8E23] uppercase tracking-widest bg-amber-50 px-2 py-0.5 rounded border border-amber-100">
                                                            {[item.weight, item.size, item.batch && `Batch: ${item.batch}`].filter(Boolean).join(' • ')}
                                                        </span>
                                                    </div>
                                                )}

                                                <div className="flex items-center gap-2 mb-3">
                                                    <span className="text-[9px] font-black text-[#119AB8] uppercase tracking-widest bg-[#119AB8]/5 px-2 py-0.5 rounded border border-[#119AB8]/10">{item.category}</span>
                                                    <span className="text-[10px] font-bold text-emerald-600 flex items-center gap-1">
                                                        <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse" /> In Stock
                                                    </span>
                                                </div>

                                                <div className="mt-auto flex items-end justify-between gap-4">
                                                    <div className="space-y-3 w-full">
                                                        <QuantityController item={item} updateQuantity={updateQuantity} />

                                                        {/* Secondary Actions */}
                                                        <div className="flex items-center gap-3 text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                                                            <button
                                                                onClick={() => removeFromCart(item.id)}
                                                                className="hover:text-rose-600 transition-colors"
                                                            >
                                                                Remove
                                                            </button>
                                                            <span className="w-1 h-1 bg-slate-200 rounded-full" />
                                                            <button
                                                                onClick={() => {
                                                                    addToWishlist({
                                                                        id: String(item.id),
                                                                        name: item.name,
                                                                        price: item.price,
                                                                        image: item.image,
                                                                        category: item.category || 'Cosmetics',
                                                                        addedAt: new Date().toISOString()
                                                                    });
                                                                    removeFromCart(item.id);
                                                                }}
                                                                className="hover:text-[#119AB8] transition-colors"
                                                            >
                                                                Save For Later
                                                            </button>
                                                        </div>
                                                    </div>

                                                    <div className="text-right shrink-0 min-w-[100px]">
                                                        <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mb-0.5">Price</p>
                                                        <p className="text-[16px] font-extrabold text-slate-900 leading-tight">Rs. {(parseFloat(String(item.price)) * item.quantity).toLocaleString()}</p>
                                                        <p className="text-[9px] font-medium text-slate-400">Rs. {parseFloat(String(item.price)).toLocaleString()} / unit</p>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>

                        {/* Footer */}
                        {items.length > 0 && (
                            <div className="p-4 bg-slate-50/50 border-t border-slate-100 space-y-3">
                                <div className="flex items-center justify-between">
                                    <span className="text-[12px] font-black text-slate-500 uppercase tracking-wider">Subtotal</span>
                                    <span className="text-[18px] font-black text-slate-900">Rs. {cartTotal.toLocaleString()}</span>
                                </div>

                                <Link
                                    href="/customer/checkout"
                                    onClick={closeCart}
                                    className="group w-full py-2.5 bg-gradient-to-r from-amber-500 to-[#f58220] hover:brightness-105 active:scale-[0.99] text-white font-bold rounded-xl flex items-center justify-center gap-2 shadow-md shadow-orange-500/5 hover:shadow-orange-500/15 transition-all text-xs uppercase tracking-wider"
                                >
                                    Proceed to Checkout
                                    <ArrowRight size={14} className="group-hover:translate-x-0.5 transition-transform" />
                                </Link>

                                <div className="flex items-center justify-center gap-1.5 text-[9px] text-slate-400 font-extrabold uppercase tracking-widest pt-0.5">
                                    <ShieldCheck size={12} className="text-emerald-500" />
                                    <span>Secure checkout processed by Al-Qavi</span>
                                </div>
                            </div>
                        )}
                    </motion.div>
                </>
            )}
        </AnimatePresence>
    );
}

/**
 * REUSABLE QUANTITY CONTROLLER
 * Features local sync, stock validation, and interactive input.
 */
function QuantityController({ item, updateQuantity }: { item: any, updateQuantity: Function }) {
    const [localVal, setLocalVal] = useState<string>(item.quantity.toString());
    const [isFocused, setIsFocused] = useState(false);

    useEffect(() => {
        if (!isFocused) {
            setLocalVal(item.quantity.toString());
        }
    }, [item.quantity, isFocused]);

    const maxStock = item.stock || 999;
    const isMax = item.quantity >= maxStock;

    const handleUpdate = (val: number) => {
        const next = Math.max(1, Math.min(maxStock, val));
        updateQuantity(item.id, next);
    };

    return (
        <div className="space-y-1.5">
            <div className="flex items-center h-8 w-fit bg-white border border-slate-200 rounded-full overflow-hidden transition-all focus-within:border-[#119AB8] focus-within:ring-1 focus-within:ring-[#119AB8]/20">
                <button
                    onClick={() => handleUpdate(item.quantity - 1)}
                    disabled={item.quantity <= 1}
                    className="w-8 h-full flex items-center justify-center text-slate-400 hover:text-slate-800 hover:bg-slate-50 disabled:opacity-30 disabled:cursor-not-allowed transition-all"
                >
                    <Minus size={11} />
                </button>

                <input
                    type="text"
                    value={localVal}
                    onFocus={() => setIsFocused(true)}
                    onBlur={() => {
                        setIsFocused(false);
                        const n = parseInt(localVal);
                        handleUpdate(isNaN(n) || n < 1 ? 1 : n);
                    }}
                    onChange={(e) => {
                        const v = e.target.value;
                        if (v === '') {
                            setLocalVal('');
                            return;
                        }
                        if (/^\d+$/.test(v)) {
                            const n = parseInt(v);
                            if (n <= maxStock) {
                                setLocalVal(v);
                                if (n >= 1) handleUpdate(n);
                            } else {
                                setLocalVal(maxStock.toString());
                                handleUpdate(maxStock);
                            }
                        }
                    }}
                    className="w-8 h-full bg-transparent text-center text-[12px] font-bold text-slate-800 focus:outline-none"
                />

                <button
                    onClick={() => handleUpdate(item.quantity + 1)}
                    disabled={isMax}
                    className="w-8 h-full flex items-center justify-center text-slate-400 hover:text-slate-800 hover:bg-slate-50 disabled:opacity-30 disabled:cursor-not-allowed transition-all"
                >
                    <Plus size={11} />
                </button>
            </div>

            <AnimatePresence>
                {isMax && (
                    <motion.div
                        initial={{ opacity: 0, y: -5 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="flex items-center gap-1.5"
                    >
                        <Info size={10} className="text-amber-500" />
                        <span className="text-[9px] font-black text-amber-600 uppercase tracking-widest">Inventory Limit</span>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}
