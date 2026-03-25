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
                        <Link href="/shop" className="inline-block px-10 py-2.5 bg-[#ffd814] hover:bg-[#f7ca00] text-[#111] font-bold rounded-lg shadow-sm text-sm">
                            Continue Shopping
                        </Link>
                    </div>
                </main>
                <Footer />
            </div>
        );
    }

    return (
        <div className="flex flex-col min-h-screen bg-[#eaeded] dark:bg-background">
            <Navbar />

            <main className="flex-1 py-8">
                <div className="container mx-auto px-4">
                    <div className="flex flex-col lg:flex-row gap-6 items-start">

                        {/* LEFT: SHOPPING CART ITEMS */}
                        <div className="flex-1 bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-800 p-8 rounded shadow-sm animate-in fade-in duration-500">
                            <div className="border-b border-gray-100 dark:border-slate-800 pb-4 mb-8 flex items-baseline justify-between transition-all">
                                <h1 className="text-3xl font-bold dark:text-white">Shopping Cart</h1>
                                <span className="text-sm text-gray-500 font-bold uppercase tracking-widest leading-none">Price Per Unit</span>
                            </div>

                            <div className="space-y-10">
                                {items.map(item => {
                                    const price = typeof item.price === 'string' ? parseFloat(item.price) : item.price;
                                    return (
                                        <div key={item.id} className="flex flex-col md:flex-row gap-6 pb-10 border-b border-gray-100 dark:border-slate-800 last:border-0">
                                            {/* Thumbnail */}
                                            <Link href={`/product/${item.id}`} className="w-40 h-40 flex-shrink-0 bg-gray-50 dark:bg-slate-800 p-4 border border-gray-100 rounded group overflow-hidden">
                                                <img src={getImageUrl(item.image) || ''} alt={item.name} className="w-full h-full object-contain mix-blend-multiply dark:mix-blend-normal transform transition-transform group-hover:scale-105" />
                                            </Link>

                                            {/* Info */}
                                            <div className="flex-1 space-y-2">
                                                <div className="flex justify-between items-start gap-4">
                                                    <Link href={`/product/${item.id}`}>
                                                        <h3 className="text-lg font-bold text-[#007185] hover:text-[#C45500] hover:underline cursor-pointer line-clamp-2 max-w-xl items-baseline">
                                                            {item.name}
                                                        </h3>
                                                    </Link>
                                                    <div className="text-lg font-black dark:text-white text-right shrink-0">PKR {price.toLocaleString()}</div>
                                                </div>
                                                <p className="text-xs text-emerald-600 font-bold uppercase tracking-tighter">In Stock</p>
                                                <p className="text-[10px] text-gray-400 font-bold uppercase tracking-[0.2em]">{item.category}</p>
                                                <div className="flex items-center gap-6 mt-8">
                                                    <QuantityController item={item} updateQuantity={updateQuantity} />
                                                    
                                                    <div className="h-4 w-[1px] bg-gray-200 dark:bg-slate-700" />
                                                    
                                                    <button 
                                                        onClick={() => removeFromCart(item.id)} 
                                                        className="text-xs text-[#007185] hover:text-[#C45500] hover:underline transition-all tracking-tight font-medium"
                                                    >
                                                        Delete Item
                                                    </button>
                                                    
                                                    <div className="h-4 w-[1px] bg-gray-200 dark:bg-slate-700 hidden sm:block" />
                                                    
                                                    <button className="hidden sm:block text-xs text-[#007185] hover:text-[#C45500] hover:underline transition-all tracking-tight font-medium">
                                                        Save for later
                                                    </button>
                                                </div>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>

                            <div className="mt-8 text-right">
                                <p className="text-lg font-bold dark:text-white tracking-tight">Subtotal ({cartCount} items): <span className="text-xl font-black">PKR {cartTotal.toLocaleString()}</span></p>
                            </div>
                        </div>

                        {/* RIGHT: BUY BOX */}
                        <div className="w-full lg:w-[320px] sticky top-24 space-y-4">
                            <div className="bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-800 p-6 rounded shadow-sm space-y-6">
                                {isFreeShipping ? (
                                    <div className="flex gap-3 text-xs">
                                        <div className="w-5 h-5 rounded-full bg-emerald-500 flex items-center justify-center text-white shrink-0"><CheckCircle className="h-3 w-3" /></div>
                                        <p className="text-emerald-600 font-bold uppercase tracking-tighter leading-none pt-1">Your order qualifies for FREE Shipping.</p>
                                    </div>
                                ) : (
                                    <div className="space-y-4">
                                        <div className="w-full h-2 bg-gray-100 dark:bg-slate-800 rounded-full overflow-hidden">
                                            <div className="h-full bg-emerald-500 transition-all duration-1000" style={{ width: `${(cartTotal / shippingThreshold) * 100}%` }} />
                                        </div>
                                        <p className="text-xs text-gray-500 leading-tight">Add PKR <span className="font-bold text-[#C45500] underline">{remainingForFree.toLocaleString()}</span> for free shipping.</p>
                                    </div>
                                )}

                                <div>
                                    <p className="text-lg font-medium dark:text-white leading-tight">Subtotal ({cartCount} items):</p>
                                    <p className="text-2xl font-black dark:text-white tracking-widest mt-1">PKR {cartTotal.toLocaleString()}</p>
                                </div>

                                <Link href="/checkout" className="block w-full py-2 bg-[#ffd814] hover:bg-[#f7ca00] text-[#111] font-bold rounded-lg text-sm text-center shadow-sm active:shadow-inner active:scale-[0.98] transition-all">
                                    Proceed to Checkout
                                </Link>
                                
                                <div className="pt-2">
                                    <div className="flex items-center gap-2 p-3 border border-gray-100 dark:border-slate-800 bg-gray-50/50 dark:bg-slate-800/50 rounded pointer-events-none">
                                        <ShieldCheck className="h-4 w-4 text-gray-400" />
                                        <span className="text-[10px] text-gray-400 font-bold uppercase tracking-widest">A-to-z Guarantee Protected</span>
                                    </div>
                                </div>
                            </div>
                            
                            <div className="bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-800 p-6 rounded shadow-sm">
                                <h4 className="text-sm font-bold dark:text-white mb-2 uppercase tracking-tighter">Your Browsing History</h4>
                                <div className="text-[10px] text-gray-500 italic">Explore recently viewed items in the collection.</div>
                                <Link href="/shop" className="block text-xs text-[#007185] hover:text-[#C45500] hover:underline mt-4 font-bold tracking-widest uppercase">Visit Store Catalog</Link>
                            </div>
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

    return (
        <div className="flex items-center gap-0 border border-gray-200 dark:border-slate-700 rounded shadow-sm overflow-hidden bg-gray-50 dark:bg-slate-800">
            <button 
                onClick={() => updateQuantity(item.id, Math.max(1, item.quantity - 1))} 
                className="px-3 py-1.5 hover:bg-gray-200 dark:hover:bg-slate-700 transition-colors border-r dark:border-slate-700"
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
                        setLocalVal(v);
                        const n = parseInt(v);
                        if (!isNaN(n) && n >= 1) {
                            // Important: We update the store but don't force localVal back 
                            // because the user might still be typing (e.g. typing 10)
                            updateQuantity(item.id, n);
                        }
                    }
                }}
                onBlur={() => {
                    setIsFocused(false);
                    const n = parseInt(localVal);
                    if (isNaN(n) || n < 1) {
                        setLocalVal('1');
                        updateQuantity(item.id, 1);
                    } else {
                        // Ensure display is cleaned up (e.g. leading zeros)
                        setLocalVal(n.toString());
                        updateQuantity(item.id, n);
                    }
                }}
                className="w-12 text-center text-sm font-bold bg-transparent dark:text-white focus:outline-none [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                placeholder=""
            />
            <button 
                onClick={() => updateQuantity(item.id, item.quantity + 1)} 
                className="px-3 py-1.5 hover:bg-gray-200 dark:hover:bg-slate-700 transition-colors border-l dark:border-slate-700"
            >
                <Plus className="h-3 w-3 text-gray-600 dark:text-gray-400" />
            </button>
        </div>
    );
}
