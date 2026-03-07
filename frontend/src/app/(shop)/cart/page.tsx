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
            <div className="flex flex-col min-h-screen bg-white">
                <Navbar />
                <main className="flex-1 flex flex-col items-center justify-center text-center px-6 py-32">
                    <div className="w-24 h-24 bg-gray-50 shadow-xl rounded-[2rem] flex items-center justify-center text-gray-300 mb-8 border border-gray-100">
                        <ShoppingBag className="h-12 w-12" />
                    </div>
                    <h2 className="text-3xl font-black text-gray-900 mb-3 tracking-tight">Shopping Bag is Empty</h2>
                    <p className="text-gray-500 font-medium mb-10 max-w-xs leading-relaxed">
                        Looks like you haven&apos;t added any premium cosmetics to your bag yet.
                    </p>
                    <Link href="/shop"
                        className="px-10 py-4 bg-[#4f46e5] hover:bg-[#005f6e] text-white font-black uppercase tracking-widest rounded-2xl text-[10px] transition shadow-xl shadow-indigo-900/20">
                        Start Shopping
                    </Link>
                </main>
                <Footer />
            </div>
        );
    }

    return (
        <div className="flex flex-col min-h-screen bg-white font-sans">
            <Navbar />

            {/* Header/Breadcrumb */}
            <div className="bg-gray-50 border-b border-gray-100 transition-colors">
                <div className="container mx-auto px-4 lg:px-12 py-6">
                    <h1 className="text-2xl font-black text-gray-900 tracking-tight flex items-center gap-3">
                        Shopping Bag <span className="text-[#4f46e5] bg-[#4f46e5]/5 px-3 py-1 rounded-full text-[10px] uppercase tracking-widest font-black">{items.reduce((s, i) => s + i.quantity, 0)} Items</span>
                    </h1>
                </div>
            </div>

            <main className="flex-1 py-16 bg-gray-50/30">
                <div className="container mx-auto px-4 lg:px-12">
                    <div className="flex flex-col lg:flex-row gap-16 items-start">

                        {/* ── Cart Items ── */}
                        <div className="flex-1 w-full space-y-6">
                            <div className="bg-white shadow-2xl shadow-gray-200/50 rounded-[2.5rem] border border-gray-100 transition-colors overflow-hidden">
                                <div className="p-8 lg:p-10 divide-y divide-gray-100">
                                    {items.map(item => {
                                        const price = typeof item.price === 'string' ? parseFloat(item.price) : item.price;
                                        return (
                                            <div key={item.id} className="flex flex-col sm:flex-row gap-8 py-8 first:pt-0 last:pb-0 group">
                                                {/* Image */}
                                                <Link href={`/product/${item.id}`} className="flex-shrink-0">
                                                    <div className="w-40 h-40 bg-gray-50 rounded-[2.5rem] border border-gray-100 overflow-hidden shadow-sm group-hover:shadow-xl transition-all duration-500">
                                                        <img src={item.image || 'https://images.unsplash.com/photo-1596462502278-27bfdd403cc2?q=80&w=200&auto=format&fit=crop'}
                                                            alt={item.name} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700" />
                                                    </div>
                                                </Link>

                                                {/* Details */}
                                                <div className="flex-1 min-w-0 py-2">
                                                    <div className="flex flex-col h-full">
                                                        <div className="mb-4">
                                                            <Link href={`/product/${item.id}`}>
                                                                <h3 className="text-lg font-black text-gray-900 group-hover:text-[#4f46e5] transition-colors line-clamp-2 tracking-tight mb-1">{item.name}</h3>
                                                            </Link>
                                                            <p className="text-[10px] font-black text-[#4f46e5] uppercase tracking-widest">{item.category}</p>
                                                        </div>

                                                        <div className="flex items-center gap-3 text-[10px] font-bold text-indigo- mb-6 uppercase tracking-widest">
                                                            <div className="w-1.5 h-1.5 rounded-full bg-indigo- animate-pulse" />
                                                            In Stock & Ready to Ship
                                                        </div>

                                                        <div className="mt-auto flex items-center justify-between gap-4 flex-wrap">
                                                            {/* Qty Stepper */}
                                                            <div className="flex items-center bg-gray-50 p-1.5 rounded-2xl shadow-inner border border-gray-100">
                                                                <button onClick={() => updateQuantity(item.id, item.quantity - 1)}
                                                                    className="w-10 h-10 rounded-xl flex items-center justify-center hover:bg-white hover:shadow-sm transition text-gray-900 disabled:opacity-30"
                                                                    disabled={item.quantity <= 1}>
                                                                    <Minus className="h-4 w-4" />
                                                                </button>
                                                                <span className="w-10 text-center text-xs font-black text-gray-900">{item.quantity}</span>
                                                                <button onClick={() => updateQuantity(item.id, item.quantity + 1)}
                                                                    className="w-10 h-10 rounded-xl flex items-center justify-center hover:bg-white hover:shadow-sm transition text-gray-900">
                                                                    <Plus className="h-4 w-4" />
                                                                </button>
                                                            </div>

                                                            <div className="flex items-center gap-6">
                                                                <div className="text-right">
                                                                    <p className="text-lg font-black text-gray-900 tracking-tighter">Rs. {(price * item.quantity).toLocaleString()}</p>
                                                                    {item.quantity > 1 && (
                                                                        <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Rs. {price.toLocaleString()} / unit</p>
                                                                    )}
                                                                </div>
                                                                <button onClick={() => removeFromCart(item.id)}
                                                                    className="p-3 bg-red-50 text-red-500 rounded-xl hover:bg-red-500 hover:text-white transition-all shadow-sm">
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
                                <div className="bg-gray-50 border-t border-gray-100 p-8 flex justify-between items-center transition-colors">
                                    <button onClick={clearCart}
                                        className="text-[10px] font-black uppercase tracking-[0.2em] text-gray-400 hover:text-red-500 transition-colors flex items-center gap-2">
                                        <X className="h-4 w-4" /> Empty Shopping Bag
                                    </button>
                                    <div className="text-right">
                                        <p className="text-[10px] font-black uppercase tracking-widest text-gray-400 mb-1">Bag Subtotal</p>
                                        <p className="text-2xl font-black text-gray-900 tracking-tighter">Rs. {cartTotal.toLocaleString()}</p>
                                    </div>
                                </div>
                            </div>

                            <Link href="/shop" className="inline-flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.2em] text-gray-400 hover:text-[#4f46e5] transition-colors ml-4">
                                <ArrowLeft className="h-4 w-4" /> Keep Exploring
                            </Link>
                        </div>

                        {/* ── Order Summary ── */}
                        <div className="w-full lg:w-[400px] sticky top-32 space-y-6">
                            {/* Promo Code */}
                            <div className="bg-white shadow-2xl shadow-gray-200/50 rounded-[2.5rem] p-8 border border-gray-100 transition-colors">
                                <h3 className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] mb-6 flex items-center gap-2">
                                    <Tag className="h-4 w-4 text-[#4f46e5]" /> Promotional Offer
                                </h3>
                                {appliedPromo ? (
                                    <div className="flex items-center justify-between bg-indigo-50 border border-indigo-100 rounded-2xl px-5 py-4 transition-colors">
                                        <div>
                                            <p className="font-black text-[#4f46e5] text-xs uppercase tracking-widest">{appliedPromo.code}</p>
                                            <p className="text-[10px] font-bold text-[#4f46e5]/70 mt-1 uppercase tracking-wider">{appliedPromo.discount}% Discount Unlocked</p>
                                        </div>
                                        <button onClick={() => setAppliedPromo(null)} className="p-2 bg-white rounded-xl text-gray-300 hover:text-red-500 transition-colors shadow-sm">
                                            <X className="h-4 w-4" />
                                        </button>
                                    </div>
                                ) : (
                                    <div className="space-y-3">
                                        <div className="relative">
                                            <input type="text" placeholder="GIFT CODE"
                                                value={promoCode} onChange={e => { setPromoCode(e.target.value); setPromoError(''); }}
                                                className="w-full px-5 py-4 bg-gray-50 border-2 border-transparent rounded-2xl text-[10px] font-black outline-none focus:border-[#4f46e5] focus:bg-white transition-all shadow-inner placeholder:text-gray-300 uppercase tracking-[0.2em] text-gray-900" />
                                        </div>
                                        <button onClick={applyPromo}
                                            className="w-full py-4 bg-gray-900 hover:bg-black text-white rounded-2xl text-[10px] font-black uppercase tracking-widest transition shadow-lg shadow-gray-200">
                                            Apply Discount
                                        </button>
                                    </div>
                                )}
                                {promoError && <p className="text-red-500 text-[10px] font-black uppercase tracking-widest mt-3 ml-2">{promoError}</p>}
                            </div>

                            {/* Summary */}
                            <div className="bg-white shadow-2xl shadow-gray-200/50 rounded-[3rem] p-8 lg:p-10 border border-gray-100 transition-colors">
                                {shipping > 0 ? (
                                    <div className="bg-indigo-50 border border-indigo-100 rounded-2xl p-4 mb-8 text-[10px] font-black uppercase tracking-widest text-[#4f46e5] leading-loose text-center transition-colors">
                                        Free logistics unlocked at <span className="text-gray-900 border-b border-[#4f46e5]">Rs. {(shippingThreshold).toLocaleString()}</span><br />
                                        Add <span className="text-gray-900">Rs. {(shippingThreshold - cartTotal).toLocaleString()}</span> more to qualify
                                    </div>
                                ) : (
                                    <div className="bg-indigo-50 border border-indigo-100 rounded-2xl p-4 mb-8 text-[10px] font-black uppercase tracking-widest text-[#4f46e5] text-center transition-colors">
                                        <CheckCircle className="h-4 w-4 inline mr-2 text-indigo- mb-0.5" />
                                        Complimentary High-Priority Logistics Unlocked
                                    </div>
                                )}

                                <div className="space-y-4 text-[10px] font-black uppercase tracking-widest text-gray-400 mb-8">
                                    <div className="flex justify-between">
                                        <span>Total Value</span>
                                        <span className="text-gray-900">Rs. {cartTotal.toLocaleString()}</span>
                                    </div>
                                    {appliedPromo && (
                                        <div className="flex justify-between text-indigo-">
                                            <span>Tier Reward ({appliedPromo.discount}%)</span>
                                            <span>- Rs. {discountAmount.toLocaleString()}</span>
                                        </div>
                                    )}
                                    <div className="flex justify-between">
                                        <span>Logistics</span>
                                        <span className={shipping === 0 ? 'text-[#4f46e5]' : 'text-gray-900'}>
                                            {shipping === 0 ? 'Complimentary' : `Rs. ${shipping}`}
                                        </span>
                                    </div>
                                    <div className="border-t border-gray-50 pt-8 mt-4 flex justify-between text-gray-900 text-lg font-black tracking-tighter normal-case transition-colors">
                                        <span className="text-[10px] font-black uppercase tracking-widest text-gray-400">Grand Total</span>
                                        <span>Rs. {total.toLocaleString()}</span>
                                    </div>
                                </div>

                                <Link href="/checkout"
                                    className="w-full flex items-center justify-center gap-3 py-6 bg-[#4f46e5] hover:bg-[#005f6e] text-white font-black uppercase tracking-widest rounded-[2rem] text-[10px] transition shadow-2xl shadow-indigo-900/20 group">
                                    Secure Checkout <ArrowRight className="h-4 w-4 group-hover:translate-x-1 transition-transform" />
                                </Link>

                                <div className="mt-8 space-y-4 pt-8 border-t border-gray-50 transition-colors">
                                    <div className="flex items-center gap-3 text-[10px] font-black uppercase tracking-widest text-gray-400">
                                        <Shield className="h-4 w-4 text-[#4f46e5] flex-shrink-0" />
                                        Industry-Standard Encrypted Checkout
                                    </div>
                                    <div className="flex items-center gap-3 text-[10px] font-black uppercase tracking-widest text-gray-400">
                                        <Truck className="h-4 w-4 text-[#4f46e5] flex-shrink-0" />
                                        Fast Premium Global Logistics
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
