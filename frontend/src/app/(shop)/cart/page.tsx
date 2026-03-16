'use client';

import { useState } from 'react';
import Link from 'next/link';
import Navbar from '@/components/layout/Navbar';
import Footer from '@/components/layout/Footer';
import {
    Minus, Plus, Trash2, ArrowRight, ShieldCheck, Truck,
    Tag, X, ShoppingCart, Lock, ArrowLeft, CheckCircle,
    Info, ShoppingBag, Shield
} from 'lucide-react';
import { useCart } from '@/context/CartContext';
import { getImageUrl } from '@/lib/utils';

const PROMO_CODES: Record<string, number> = {
    BEAUTY10: 10,
    FIRST15: 15,
    DISTRO20: 20,
};

export default function CartPage() {
    const { items, updateQuantity, removeFromCart, cartTotal, clearCart } = useCart();
    const [promoCode, setPromoCode] = useState('');
    const [appliedPromo, setAppliedPromo] = useState<{ code: string; discount: number } | null>(null);
    const [promoError, setPromoError] = useState('');

    const shippingThreshold = 5000;
    const shipping = cartTotal >= shippingThreshold ? 0 : 350;
    const discountAmount = appliedPromo ? Math.round((cartTotal * appliedPromo.discount) / 100) : 0;
    const total = cartTotal - discountAmount + shipping;

    const applyPromo = () => {
        const upper = promoCode.toUpperCase().trim();
        if (PROMO_CODES[upper]) {
            setAppliedPromo({ code: upper, discount: PROMO_CODES[upper] });
            setPromoError('');
            setPromoCode('');
        } else {
            setPromoError('Invalid or expired promo code');
        }
    };

    if (items.length === 0) {
        return (
            <div className="flex flex-col min-h-screen bg-white dark:bg-[#0f172a]">
                <Navbar />
                <main className="flex-1 flex flex-col items-center justify-center text-center px-6 py-32">
                    <div className="w-24 h-24 bg-gray-50 dark:bg-slate-900 rounded-[2.5rem] flex items-center justify-center text-gray-300 dark:text-slate-800 mb-8 border border-gray-100 dark:border-slate-800">
                        <ShoppingBag className="h-12 w-12" />
                    </div>
                    <h2 className="text-3xl font-black text-gray-900 dark:text-white mb-3 tracking-tight">Your Bag is Empty</h2>
                    <p className="text-gray-500 dark:text-slate-500 font-medium mb-10 max-w-xs leading-relaxed">
                        Discover the latest in premium skincare and makeup essentials.
                    </p>
                    <Link href="/shop"
                        className="px-10 py-5 bg-[#FF9900] hover:bg-[#131921] text-white font-black uppercase tracking-widest rounded-2xl text-[10px] transition shadow-xl shadow-[#FF9900]/20 active:scale-95">
                        Start Shopping
                    </Link>
                </main>
                <Footer />
            </div>
        );
    }

    return (
        <div className="flex flex-col min-h-screen bg-[#F8F9FA] dark:bg-[#0f172a] font-sans transition-colors duration-500">
            <Navbar />

            <div className="bg-white dark:bg-slate-900 border-b border-gray-100 dark:border-slate-800">
                <div className="container mx-auto px-4 lg:px-12 py-10">
                    <h1 className="text-3xl lg:text-4xl font-black text-gray-900 dark:text-white tracking-tighter flex items-center gap-4">
                        Review Your Bag 
                        <span className="text-sm font-bold text-gray-400 dark:text-slate-500">({items.reduce((s, i) => s + i.quantity, 0)} Items)</span>
                    </h1>
                </div>
            </div>

            <main className="flex-1 py-12">
                <div className="container mx-auto px-4 lg:px-12">
                    <div className="flex flex-col lg:flex-row gap-12 items-start">

                        {/* ITEMS LIST */}
                        <div className="flex-1 w-full space-y-6">
                            <div className="bg-white dark:bg-slate-900 rounded-[2.5rem] border border-gray-100 dark:border-slate-800 overflow-hidden shadow-sm">
                                <div className="p-8 lg:p-10 divide-y divide-gray-100 dark:divide-slate-800">
                                    {items.map(item => {
                                        const price = typeof item.price === 'string' ? parseFloat(item.price) : item.price;
                                        return (
                                            <div key={item.id} className="flex flex-col sm:flex-row gap-8 py-8 first:pt-0 last:pb-0 group">
                                                <Link href={`/product/${item.id}`} className="flex-shrink-0">
                                                    <div className="w-40 h-40 bg-gray-50 dark:bg-slate-800 rounded-3xl overflow-hidden border border-gray-100 dark:border-slate-800">
                                                        <img src={getImageUrl(item.image) || 'https://images.unsplash.com/photo-1596462502278-27bfdd403cc2?q=80&w=400'} alt={item.name} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700" />
                                                    </div>
                                                </Link>

                                                <div className="flex-1 min-w-0 pr-4">
                                                    <div className="flex flex-col h-full">
                                                        <div className="mb-4">
                                                            <p className="text-[10px] text-[#FF9900] font-black uppercase tracking-widest mb-1">{item.category}</p>
                                                            <Link href={`/product/${item.id}`}>
                                                                <h3 className="text-xl font-black text-gray-900 dark:text-white group-hover:text-[#FF9900] transition-colors line-clamp-2 tracking-tight">{item.name}</h3>
                                                            </Link>
                                                        </div>

                                                        <div className="mt-auto flex items-center justify-between gap-6 flex-wrap">
                                                            <div className="flex items-center bg-gray-50 dark:bg-slate-800 p-1.5 rounded-2xl border border-gray-100 dark:border-slate-700">
                                                                <button onClick={() => updateQuantity(item.id, item.quantity - 1)}
                                                                    className="w-10 h-10 rounded-xl flex items-center justify-center hover:bg-white dark:hover:bg-slate-700 transition text-gray-900 dark:text-white disabled:opacity-20"
                                                                    disabled={item.quantity <= 1}>
                                                                    <Minus className="h-4 w-4" />
                                                                </button>
                                                                <span className="w-10 text-center text-sm font-black text-gray-900 dark:text-white">{item.quantity}</span>
                                                                <button onClick={() => updateQuantity(item.id, item.quantity + 1)}
                                                                    className="w-10 h-10 rounded-xl flex items-center justify-center hover:bg-white dark:hover:bg-slate-700 transition text-gray-900 dark:text-white">
                                                                    <Plus className="h-4 w-4" />
                                                                </button>
                                                            </div>

                                                            <div className="flex items-center gap-6">
                                                                <div className="text-right">
                                                                    <p className="text-xl font-black text-gray-900 dark:text-[#FF9900] tracking-tighter">Rs. {(price * item.quantity).toLocaleString()}</p>
                                                                </div>
                                                                <button onClick={() => removeFromCart(item.id)}
                                                                    className="w-10 h-10 flex items-center justify-center bg-red-50 dark:bg-red-950/30 text-red-500 rounded-xl hover:bg-red-500 hover:text-white transition-all">
                                                                    <Trash2 className="h-4 w-4" />
                                                                </button>
                                                            </div>
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                                <div className="bg-gray-50 dark:bg-slate-800/50 border-t border-gray-100 dark:border-slate-800 p-10 flex justify-between items-center">
                                    <button onClick={clearCart} className="text-[10px] font-black uppercase tracking-widest text-gray-400 hover:text-red-500 transition-colors flex items-center gap-2">
                                        <X className="h-4 w-4" /> Clear All Items
                                    </button>
                                    <div className="text-right">
                                        <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest mb-1">Subtotal</p>
                                        <p className="text-3xl font-black text-gray-900 dark:text-white tracking-tighter">Rs. {cartTotal.toLocaleString()}</p>
                                    </div>
                                </div>
                            </div>
                            
                            <Link href="/shop" className="inline-flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-gray-400 hover:text-[#FF9900] transition-colors ml-4">
                                <ArrowLeft className="h-4 w-4" /> Continue Discovering
                            </Link>
                        </div>

                        {/* ORDER SUMMARY */}
                        <div className="w-full lg:w-[420px] sticky top-28 space-y-6">
                            {/* PROMO BOX */}
                            <div className="bg-white dark:bg-slate-900 rounded-[2.5rem] p-8 border border-gray-100 dark:border-slate-800 shadow-sm">
                                <h3 className="text-[10px] font-black text-gray-400 dark:text-slate-500 uppercase tracking-widest mb-6 flex items-center gap-2">
                                    <Tag className="h-4 w-4 text-[#FF9900]" /> Coupon Code
                                </h3>
                                {appliedPromo ? (
                                    <div className="flex items-center justify-between bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-100 dark:border-emerald-900/50 rounded-2xl px-5 py-4">
                                        <div>
                                            <p className="font-black text-emerald-600 dark:text-emerald-400 text-xs tracking-widest uppercase">{appliedPromo.code}</p>
                                            <p className="text-[10px] font-bold text-emerald-600/70 mt-1 uppercase">Tier Discount Applied</p>
                                        </div>
                                        <button onClick={() => setAppliedPromo(null)} className="p-2 hover:bg-white dark:hover:bg-slate-800 rounded-lg text-gray-400 transition-colors">
                                            <X className="h-4 w-4" />
                                        </button>
                                    </div>
                                ) : (
                                    <div className="flex gap-2">
                                        <input type="text" placeholder="ENTER CODE"
                                            value={promoCode} onChange={e => { setPromoCode(e.target.value); setPromoError(''); }}
                                            className="flex-1 px-5 py-4 bg-gray-50 dark:bg-slate-800 border-2 border-transparent rounded-2xl text-xs font-black outline-none focus:border-[#FF9900]/30 transition-all text-gray-900 dark:text-white uppercase tracking-widest" />
                                        <button onClick={applyPromo}
                                            className="px-6 bg-[#131921] hover:bg-[#FF9900] text-white font-black rounded-2xl text-[10px] uppercase tracking-widest transition-all">
                                            Apply
                                        </button>
                                    </div>
                                )}
                                {promoError && <p className="text-red-500 text-[9px] font-black uppercase mt-3 ml-2">{promoError}</p>}
                            </div>

                            {/* PRICE BOX */}
                            <div className="bg-[#131921] rounded-[3rem] p-10 text-white shadow-2xl shadow-black/20 overflow-hidden group">
                                <div className="absolute top-0 right-0 w-32 h-32 bg-[#FF9900]/10 rounded-full blur-2xl -translate-y-1/2 translate-x-1/2 group-hover:scale-150 transition-transform duration-700" />
                                
                                <div className="relative space-y-6 text-[11px] font-bold uppercase tracking-widest text-white/50 mb-10">
                                    <div className="flex justify-between">
                                        <span>Order Value</span>
                                        <span className="text-white">Rs. {cartTotal.toLocaleString()}</span>
                                    </div>
                                    {appliedPromo && (
                                        <div className="flex justify-between text-emerald-400">
                                            <span>Tier reward</span>
                                            <span>- Rs. {discountAmount.toLocaleString()}</span>
                                        </div>
                                    )}
                                    <div className="flex justify-between">
                                        <span>Logistics Fee</span>
                                        <span className={shipping === 0 ? 'text-[#FF9900]' : 'text-white'}>
                                            {shipping === 0 ? 'COMPLIMENTARY' : `Rs. ${shipping}`}
                                        </span>
                                    </div>
                                    <div className="border-t border-white/10 pt-8 mt-4 flex justify-between items-end text-white">
                                        <span className="text-[10px] text-white/40">Total Amount</span>
                                        <span className="text-4xl font-black tracking-tighter text-[#FF9900]">Rs. {total.toLocaleString()}</span>
                                    </div>
                                </div>

                                <Link href="/checkout"
                                    className="relative w-full flex items-center justify-center gap-3 py-6 bg-[#FF9900] hover:bg-white hover:text-[#FF9900] text-[#131921] font-black uppercase tracking-widest rounded-2xl text-xs transition-all shadow-xl shadow-[#FF9900]/10 active:scale-95 group">
                                    Secure Checkout <ArrowRight className="h-5 w-5 group-hover:translate-x-1 transition-transform" />
                                </Link>

                                <div className="relative mt-8 space-y-4 pt-8 border-t border-white/10">
                                    <div className="flex items-center gap-3 text-[9px] font-black uppercase text-white/30 tracking-widest">
                                        <Shield className="h-4 w-4 text-[#FF9900]/60" /> SSL Encrypted Gateway
                                    </div>
                                    <div className="flex items-center gap-3 text-[9px] font-black uppercase text-white/30 tracking-widest">
                                        <Truck className="h-4 w-4 text-[#FF9900]/60" /> Global Priority Fleet
                                    </div>
                                </div>
                            </div>
                        </div>

                    </div>
                </div>
            </main>

            <Footer />
        </div>
    );
}
