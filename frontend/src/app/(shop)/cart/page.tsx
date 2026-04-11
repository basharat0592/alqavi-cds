'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import Navbar from '@/components/layout/Navbar';
import Footer from '@/components/layout/Footer';
import {
    Minus, Plus, Trash2, ShieldCheck,
    Info, ShoppingBag, ChevronRight, CheckCircle, Package,
    ArrowLeft, ShoppingCart, Zap, Sparkles
} from 'lucide-react';
import { useCart } from '@/context/CartContext';
import { getImageUrl } from '@/lib/utils';

export default function CartPage() {
    const { items, updateQuantity, removeFromCart, cartTotal, cartCount } = useCart();

    const shippingThreshold = 5000;
    const isFreeShipping = cartTotal >= shippingThreshold;
    const remainingForFree = shippingThreshold - cartTotal;

    if (items.length === 0) {
        return (
            <div className="flex flex-col min-h-screen bg-[#eaeded] dark:bg-background">
                <Navbar />
                <main className="flex-1 container mx-auto px-4 py-20 flex flex-col items-center justify-center text-center space-y-8 animate-in fade-in duration-500">
                    <div className="w-48 h-48 bg-white dark:bg-slate-900 rounded-full flex items-center justify-center shadow-sm">
                        <ShoppingCart className="h-20 w-20 text-gray-200" />
                    </div>
                    <div className="space-y-4">
                        <h1 className="text-3xl font-bold dark:text-white">Your Shopping Cart is empty.</h1>
                        <p className="text-gray-500 text-sm max-w-sm mx-auto">Your Shopping Cart lives to serve. Give it purpose — fill it with cosmetics, skincare, and more.</p>
                        <Link href="/shop" className="inline-block px-10 py-2.5 bg-[#F7CA00] hover:bg-[#F7CA00] text-white font-bold rounded-lg shadow-sm text-sm">
                            Continue Shopping
                        </Link>
                    </div>
                </main>
                <Footer />
            </div>
        );
    }

    return (
        <div className="flex flex-col min-h-screen bg-[#eaeded]">
            <Navbar />

            <main className="flex-1 py-8 container mx-auto px-4">
                <div className="flex flex-col lg:flex-row gap-6 items-start">

                    {/* LEFT: SHOPPING CART ITEMS */}
                    <div className="flex-1 bg-white p-8 shadow-sm">
                        <div className="border-b border-gray-200 pb-2 mb-6 flex items-end justify-between transition-all">
                            <h1 className="text-3xl font-medium text-[#1d252c]">Shopping Cart</h1>
                            <span className="text-[14px] text-slate-500 hidden md:block">Price</span>
                        </div>

                        <div className="space-y-6">
                            {items.map(item => {
                                const price = typeof item.price === 'string' ? parseFloat(item.price) : item.price;
                                return (
                                    <div key={item.id} className="flex flex-col md:flex-row gap-4 py-4 border-b border-gray-200 last:border-0">
                                        {/* Thumbnail */}
                                        <Link href={`/product/${item.id}`} className="w-[180px] h-[180px] flex-shrink-0 flex items-center justify-center">
                                            <img src={getImageUrl(item.image) || undefined} alt={item.name} className="max-w-full max-h-full object-contain" />
                                        </Link>

                                        {/* Info */}
                                        <div className="flex-1 flex flex-col pt-2">
                                            <div className="flex justify-between items-start">
                                                <Link href={`/product/${item.id}`}>
                                                    <h3 className="text-lg font-medium text-[#007185] hover:text-[#C7511F] hover:underline leading-tight line-clamp-2">
                                                        {item.name}
                                                    </h3>
                                                </Link>
                                                <div className="text-lg font-bold text-[#1d252c] text-right ml-4">Rs.{price.toLocaleString()}</div>
                                            </div>
                                            
                                            <p className="text-[12px] text-emerald-700 font-bold mt-1">In Stock</p>
                                            <p className="text-[12px] text-slate-500 mt-1 capitalize">Eligible for FREE Shipping</p>

                                            <div className="flex items-center gap-4 mt-6">
                                                <div className="bg-[#F0F2F2] border border-[#D5D9D9] hover:bg-[#E3E6E6] rounded-lg px-2 py-1 shadow-sm flex items-center gap-2">
                                                    <span className="text-[13px] font-medium text-[#1d252c]">Qty:</span>
                                                    <select 
                                                        value={item.quantity}
                                                        onChange={(e) => updateQuantity(item.id, parseInt(e.target.value))}
                                                        className="bg-transparent text-[13px] font-bold outline-none cursor-pointer"
                                                    >
                                                        {[1,2,3,4,5,10].map(n => <option key={n} value={n}>{n}</option>)}
                                                    </select>
                                                </div>

                                                <div className="h-4 w-[1px] bg-gray-200" />

                                                <button onClick={() => removeFromCart(item.id)} className="text-[12px] text-[#007185] hover:text-[#C7511F] hover:underline">Delete</button>
                                                <button className="text-[12px] text-[#007185] hover:text-[#C7511F] hover:underline hidden sm:block">Save for later</button>
                                                <button className="text-[12px] text-[#007185] hover:text-[#C7511F] hover:underline hidden sm:block">Compare with similar items</button>
                                            </div>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>

                        <div className="mt-4 text-right">
                            <p className="text-lg text-[#1d252c]">Subtotal ({cartCount} items): <span className="font-bold">Rs.{cartTotal.toLocaleString()}</span></p>
                        </div>
                    </div>

                    {/* RIGHT: SUBBOX */}
                    <div className="w-full lg:w-[300px] flex flex-col gap-6">
                        <div className="bg-white p-6 shadow-sm">
                            <div className="flex gap-2 text-[14px] text-emerald-700 mb-4">
                                <CheckCircle className="h-4 w-4 shrink-0 mt-0.5" />
                                <div>
                                    <p className="font-bold leading-tight">Your order qualifies for FREE Shipping.</p>
                                    <p className="text-slate-500 text-[12px]">Choose this option at checkout. See details</p>
                                </div>
                            </div>
                            
                            <div className="mb-6">
                                <span className="text-lg">Subtotal ({cartCount} items): </span>
                                <span className="text-lg font-bold">Rs.{cartTotal.toLocaleString()}</span>
                            </div>

                            <Link href="/checkout" className="block w-full py-2 bg-[#FFD814] hover:bg-[#F7CA00] border border-[#FCD200] rounded-lg text-[13px] font-bold text-center shadow-sm text-black">
                                Proceed to Checkout
                            </Link>
                        </div>

                        <div className="bg-white p-6 shadow-sm text-center">
                            <h4 className="text-[14px] font-bold text-[#1d252c] mb-2">Bulk Distribution Discount</h4>
                            <p className="text-[12px] text-slate-500 mb-4">Log in as a Retail Partner to unlock wholesale pricing.</p>
                            <Link href="/login" className="text-[12px] font-bold text-[#007185] hover:underline uppercase">Retailer Log In</Link>
                        </div>
                    </div>

                </div>
            </main>

            <Footer />
        </div>
    );
}

/* ═══════════════
   SUBCOMPONENTS
═══════════════ */

function QuantityController({ item, updateQuantity }: { item: any, updateQuantity: Function }) {
    const [localVal, setLocalVal] = useState<string>(item.quantity.toString());
    const [isFocused, setIsFocused] = useState(false);

    // Sync with props when quantity changes from parent, but ONLY if not currently focused/typing
    useEffect(() => {
        if (!isFocused) {
            setLocalVal(item.quantity.toString());
        }
    }, [item.quantity, isFocused]);

    const maxStock = item.stock || 999;
    const isMax = item.quantity >= maxStock;

    return (
        <div className="flex flex-col gap-1.5 min-w-[100px]">
            <div className="flex items-center gap-0 border border-gray-200 dark:border-slate-700 rounded shadow-sm overflow-hidden bg-gray-50 dark:bg-slate-800 h-10">
                <button
                    onClick={() => updateQuantity(item.id, Math.max(1, item.quantity - 1))}
                    className="px-3 h-full hover:bg-gray-200 dark:hover:bg-slate-700 transition-colors border-r dark:border-slate-700 disabled:opacity-30 disabled:cursor-not-allowed"
                    disabled={item.quantity <= 1}
                >
                    <Minus className="h-3 w-3 text-gray-600 dark:text-gray-400" />
                </button>
                <input
                    type="text"
                    value={localVal}
                    onFocus={() => setIsFocused(true)}
                    onChange={(e) => {
                        const v = e.target.value;
                        if (v === '' || /^\d+$/.test(v)) {
                            const n = parseInt(v);
                            if (!isNaN(n)) {
                                if (n > maxStock) {
                                    setLocalVal(maxStock.toString());
                                    updateQuantity(item.id, maxStock);
                                } else {
                                    setLocalVal(v);
                                    if (n >= 1) updateQuantity(item.id, n);
                                }
                            } else {
                                setLocalVal(v);
                            }
                        }
                    }}
                    onBlur={() => {
                        setIsFocused(false);
                        let n = parseInt(localVal);
                        if (isNaN(n) || n < 1) {
                            n = 1;
                        } else if (n > maxStock) {
                            n = maxStock;
                        }
                        setLocalVal(n.toString());
                        updateQuantity(item.id, n);
                    }}
                    className="w-12 text-center text-sm font-bold bg-transparent dark:text-white focus:outline-none [appearance:textfield]"
                    placeholder=""
                />
                <button
                    onClick={() => updateQuantity(item.id, Math.min(maxStock, item.quantity + 1))}
                    className="px-3 h-full hover:bg-gray-200 dark:hover:bg-slate-700 transition-colors border-l dark:border-slate-700 disabled:opacity-30 disabled:cursor-not-allowed"
                    disabled={isMax}
                >
                    <Plus className="h-3 w-3 text-gray-600 dark:text-gray-400" />
                </button>
            </div>
            {isMax && (
                <div className="flex items-center gap-1.5 px-2 py-1 bg-amber-50 dark:bg-amber-900/20 border border-amber-100 dark:border-amber-900/30 rounded-lg animate-in fade-in zoom-in-95 duration-500 w-fit">
                    <Info className="h-2.5 w-2.5 text-amber-600 dark:text-amber-400" />
                    <span className="text-[9px] font-black text-amber-700 dark:text-amber-300 uppercase tracking-widest whitespace-nowrap">Stock Limit Reached</span>
                </div>
            )}
        </div>
    );
}
