'use client';

import { useCart } from "@/context/CartContext";
import { getImageUrl } from "@/lib/utils";
import { X, ShoppingBag, Plus, Minus, Trash2, ArrowRight, ShieldCheck, Info, CheckCircle, Sparkles } from "lucide-react";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import { useEffect, useState } from "react";

export default function CartDrawer() {
    const { items, cartTotal, removeFromCart, updateQuantity, isCartOpen, closeCart, cartCount } = useCart();

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
                        transition={{ type: 'spring', damping: 25, stiffness: 200 }}
                        className="fixed top-0 right-0 h-screen w-full sm:w-[480px] bg-white z-[10001] shadow-2xl flex flex-col font-sans"
                    >
                        {/* Header */}
                        <div className="px-6 py-5 border-b border-gray-100 flex items-center justify-between bg-white sticky top-0 z-10">
                            <div className="flex items-center gap-3">
                                <h2 className="text-[16px] font-black text-[#111] uppercase tracking-[0.2em]">Shopping Bag</h2>
                                <span className="bg-[#119AB8] text-white text-[10px] font-black px-2 py-0.5 rounded-full">{cartCount}</span>
                            </div>
                            <button
                                onClick={closeCart}
                                className="p-2 hover:bg-gray-100 rounded-full transition-colors text-gray-400 hover:text-black"
                            >
                                <X size={20} />
                            </button>
                        </div>

                        {/* Content */}
                        <div className="flex-1 overflow-y-auto no-scrollbar px-6 py-6 space-y-6">


                            {items.length === 0 ? (
                                <div className="h-[60vh] flex flex-col items-center justify-center text-center space-y-6">
                                    <div className="w-24 h-24 bg-slate-50 rounded-full flex items-center justify-center">
                                        <ShoppingBag size={40} className="text-slate-200" />
                                    </div>
                                    <div className="space-y-2">
                                        <h3 className="text-[14px] font-black text-[#111] uppercase tracking-widest">Bag is Empty</h3>
                                        <p className="text-[12px] text-slate-400 font-medium max-w-[200px]">Your premium selection will appear here once added.</p>
                                    </div>
                                    <button
                                        onClick={closeCart}
                                        className="px-8 py-3 bg-[#FF8F23] hover:bg-[#E67E22] text-white font-bold rounded-[5px] transition-colors"
                                    >
                                        Start Shopping
                                    </button>
                                </div>
                            ) : (
                                <div className="space-y-8 pb-10">
                                    {items.map((item) => (
                                        <div key={item.id} className="flex gap-5 group relative">
                                            {/* Product Image */}
                                            <div className="w-24 h-24 shrink-0 bg-white border border-slate-100 rounded-xl p-3 flex items-center justify-center group-hover:border-[#119AB8]/30 transition-all shadow-sm">
                                                <img src={getImageUrl(item.image)} className="max-w-full max-h-full object-contain" alt={item.name} />
                                            </div>

                                            {/* Product Info */}
                                            <div className="flex-1 min-w-0 flex flex-col">
                                                <div className="flex justify-between items-start gap-4 mb-1">
                                                    <h4 className="text-[13px] font-black text-[#111] uppercase tracking-tight line-clamp-2 leading-tight group-hover:text-[#119AB8] transition-colors">{item.name}</h4>
                                                    <button
                                                        onClick={() => removeFromCart(item.id)}
                                                        className="text-slate-200 hover:text-red-500 transition-colors"
                                                    >
                                                        <Trash2 size={16} />
                                                    </button>
                                                </div>

                                                {/* Weight / Type Display */}
                                                {(item.weight || item.size || item.batch) && (
                                                    <div className="flex items-center gap-2 mb-1">
                                                        <span className="text-[9px] font-bold text-[#FD8E23] uppercase tracking-widest">
                                                            {item.weight} {item.weight && (item.size || item.batch) ? '•' : ''} {item.size} {(item.size && item.batch) ? '•' : ''} {item.batch && `Batch: ${item.batch}`}
                                                        </span>
                                                    </div>
                                                )}

                                                <div className="flex items-center gap-2 mb-3">
                                                    <span className="text-[9px] font-black text-[#119AB8] uppercase tracking-widest bg-[#119AB8]/5 px-2 py-0.5 rounded border border-[#119AB8]/10">{item.category}</span>
                                                    <span className="text-[10px] font-black text-emerald-500 uppercase tracking-tighter">In Stock</span>
                                                </div>

                                                <div className="mt-auto flex items-end justify-between">
                                                    <div className="space-y-3 w-full">
                                                        <QuantityController item={item} updateQuantity={updateQuantity} />

                                                        {/* Secondary Actions */}
                                                        <div className="flex items-center gap-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">
                                                            <button
                                                                onClick={() => removeFromCart(item.id)}
                                                                className="hover:text-red-500 transition-colors"
                                                            >
                                                                Remove
                                                            </button>
                                                            <span className="w-1 h-1 bg-slate-200 rounded-full" />
                                                            <button className="hover:text-[#119AB8] transition-colors">
                                                                Save For Later
                                                            </button>
                                                        </div>
                                                    </div>

                                                    <div className="text-right shrink-0">
                                                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Price</p>
                                                        <p className="text-[15px] font-black text-[#111]">Rs. {(parseFloat(String(item.price)) * item.quantity).toLocaleString()}</p>
                                                        <p className="text-[9px] font-black text-slate-400 uppercase">Rs. {parseFloat(String(item.price)).toLocaleString()} / unit</p>
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
                            <div className="p-6 bg-white border-t border-slate-100 space-y-6">
                                <div className="flex items-center justify-between gap-6 pt-2">
                                    <div className="shrink-0">
                                        <p className="text-[11px] font-bold text-slate-400 uppercase tracking-widest mb-0.5">Total</p>
                                        <p className="text-[20px] font-black text-[#111] leading-none">
                                            Rs. {cartTotal.toLocaleString()}
                                        </p>
                                    </div>

                                    <Link
                                        href="/customer/checkout"
                                        onClick={closeCart}
                                        className="flex-1 max-w-[200px] py-3.5 bg-[#FF8F23] hover:bg-[#E67E22] text-white font-bold rounded-[5px] flex items-center justify-center gap-2 transition-colors text-[13px]"
                                    >
                                        Checkout
                                        <ArrowRight size={16} />
                                    </Link>
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
            <div className="flex items-center h-8 w-fit bg-slate-50 border border-slate-200 rounded-lg overflow-hidden transition-all focus-within:border-[#119AB8] focus-within:ring-1 focus-within:ring-[#119AB8]/20">
                <button
                    onClick={() => handleUpdate(item.quantity - 1)}
                    disabled={item.quantity <= 1}
                    className="w-8 h-full flex items-center justify-center text-slate-400 hover:text-[#111] hover:bg-slate-100 disabled:opacity-30 disabled:cursor-not-allowed transition-all"
                >
                    <Minus size={12} />
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
                                // If user tries to type more than max, force max
                                setLocalVal(maxStock.toString());
                                handleUpdate(maxStock);
                            }
                        }
                    }}
                    className="w-8 h-full bg-transparent text-center text-[12px] font-black text-[#111] focus:outline-none"
                />

                <button
                    onClick={() => handleUpdate(item.quantity + 1)}
                    disabled={isMax}
                    className="w-8 h-full flex items-center justify-center text-slate-400 hover:text-[#111] hover:bg-slate-100 disabled:opacity-30 disabled:cursor-not-allowed transition-all"
                >
                    <Plus size={12} />
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
