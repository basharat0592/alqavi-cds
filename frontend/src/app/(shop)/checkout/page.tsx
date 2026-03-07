'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import Navbar from '@/components/layout/Navbar';
import Footer from '@/components/layout/Footer';
import {
    CheckCircle, CreditCard, Truck, ShieldCheck, Lock,
    Smartphone, Banknote, ArrowLeft, ChevronRight, Package,
    Info, ShoppingBag, Shield
} from 'lucide-react';
import { useCart } from '@/context/CartContext';

const STEPS = ['Shipping', 'Payment', 'Order Secure'];

export default function CheckoutPage() {
    const { items, cartTotal, clearCart } = useCart();
    const router = useRouter();
    const [step, setStep] = useState(1);
    const [payMethod, setPayMethod] = useState<'card' | 'cod' | 'easypaisa'>('card');

    // Price calculation
    const shipping = cartTotal > 5000 ? 0 : 350;
    const total = cartTotal + shipping;

    const handleNext = (e: React.FormEvent) => {
        e.preventDefault();
        if (step === 2) {
            clearCart();
            setStep(3);
        } else {
            setStep(step + 1);
        }
    };

    // ─── Step 3: Order Confirmed ───────────────────────────────────────────────
    if (step === 3) {
        const orderId = `QAVI-${Date.now().toString().slice(-6)}`;
        return (
            <div className="flex flex-col min-h-screen bg-white font-sans transition-colors duration-300">
                <Navbar />
                <main className="flex-1 flex items-center justify-center py-24 px-4 bg-gray-50/50">
                    <div className="bg-white shadow-2xl shadow-gray-200/50 rounded-[3rem] p-12 max-w-lg w-full text-center border border-gray-100 transition-colors">
                        <div className="w-20 h-20 bg-indigo-50 rounded-3xl flex items-center justify-center mx-auto mb-8 shadow-inner">
                            <CheckCircle className="h-10 w-10 text-[#4f46e5]" />
                        </div>
                        <h1 className="text-3xl font-black text-gray-900 mb-2 tracking-tight">Order Confirmed</h1>
                        <p className="text-[#4f46e5] font-black uppercase tracking-[0.2em] text-[10px] mb-8">Ref: {orderId}</p>

                        <p className="text-gray-500 font-medium mb-10 leading-relaxed">
                            Thank you for your trust in <span className="text-[#4f46e5] font-bold">Al-Qavi Cosmetics</span>. Your order is being prepared for immediate dispatch.
                        </p>

                        <div className="bg-gray-50 rounded-2xl p-6 mb-10 text-sm text-left space-y-4 border border-gray-100 transition-colors">
                            <div className="flex justify-between items-center text-xs font-bold uppercase tracking-widest text-gray-400">
                                <span>Delivery Window</span>
                                <span className="text-gray-900">3–5 Business Days</span>
                            </div>
                            <div className="flex justify-between items-center text-xs font-bold uppercase tracking-widest text-gray-400 border-t border-gray-100 pt-4">
                                <span>Payment Amount</span>
                                <span className="text-gray-900 text-lg font-black tracking-tighter">Rs. {total.toLocaleString()}</span>
                            </div>
                        </div>

                        <div className="flex flex-col gap-4">
                            <Link href="/shop"
                                className="w-full py-5 bg-[#4f46e5] hover:bg-[#005f6e] text-white font-black uppercase tracking-widest rounded-2xl text-[10px] transition shadow-xl shadow-indigo-900/20 text-center">
                                Continue Shopping
                            </Link>
                            <Link href="/"
                                className="w-full py-5 bg-white border border-gray-200 hover:bg-gray-50 text-gray-900 font-black uppercase tracking-widest rounded-2xl text-[10px] transition text-center">
                                Back to Homepage
                            </Link>
                        </div>
                    </div>
                </main>
                <Footer />
            </div>
        );
    }

    // ─── Empty cart guard ──────────────────────────────────────────────────────
    if (items.length === 0) {
        return (
            <div className="flex flex-col min-h-screen bg-white transition-colors duration-300">
                <Navbar />
                <main className="flex-1 flex flex-col items-center justify-center gap-8 py-32">
                    <div className="w-24 h-24 bg-gray-50 shadow-xl rounded-[2rem] flex items-center justify-center text-gray-300 border border-gray-100">
                        <ShoppingBag className="h-12 w-12" />
                    </div>
                    <div className="text-center">
                        <h2 className="text-2xl font-black text-gray-900 mb-2">Shopping Bag is Empty</h2>
                        <p className="text-gray-500 font-medium">Add some premium cosmetics to continue.</p>
                    </div>
                    <Link href="/shop" className="px-10 py-4 bg-[#4f46e5] text-white rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-[#005f6e] transition shadow-xl shadow-indigo-900/20">
                        Explore Collection
                    </Link>
                </main>
                <Footer />
            </div>
        );
    }

    return (
        <div className="flex flex-col min-h-screen bg-white font-sans transition-colors duration-300">
            <Navbar />

            {/* Breadcrumb / Step Indicator */}
            <div className="bg-gray-50 border-b border-gray-100 transition-colors">
                <div className="container mx-auto px-4 lg:px-12 py-6">
                    <div className="flex items-center justify-center gap-4 sm:gap-12 max-w-2xl mx-auto">
                        {STEPS.map((s, i) => (
                            <div key={s} className="flex items-center gap-4 group">
                                <div className={`w-8 h-8 rounded-xl flex items-center justify-center text-[10px] font-black transition-all shadow-sm ${step > i + 1 ? 'bg-[#4f46e5] text-white shadow-[#4f46e5]/20' : step === i + 1 ? 'bg-white border-2 border-[#4f46e5] text-[#4f46e5]' : 'bg-gray-100 text-gray-400'}`}>
                                    {step > i + 1 ? <CheckCircle className="h-4 w-4" /> : i + 1}
                                </div>
                                <span className={`text-[10px] font-black uppercase tracking-widest hidden sm:inline ${step === i + 1 ? 'text-[#4f46e5]' : 'text-gray-400 group-hover:text-gray-600'}`}>{s}</span>
                                {i < STEPS.length - 1 && <ChevronRight className="h-3 w-3 text-gray-200 hidden sm:block" />}
                            </div>
                        ))}
                    </div>
                </div>
            </div>

            <main className="flex-1 py-16 bg-gray-50/30">
                <div className="container mx-auto px-4 lg:px-12">

                    <div className="flex flex-col lg:flex-row gap-16 items-start">

                        {/* ── Form Section ── */}
                        <div className="flex-1 w-full order-2 lg:order-1">
                            <form onSubmit={handleNext} className="space-y-8">
                                {step === 1 && (
                                    <div className="bg-white shadow-2xl shadow-gray-200/50 rounded-[2.5rem] p-8 lg:p-12 border border-gray-100 animate-in fade-in slide-in-from-bottom-4 duration-500 transition-colors">
                                        <div className="flex items-center gap-4 mb-10">
                                            <div className="w-12 h-12 bg-[#4f46e5]/5 rounded-2xl flex items-center justify-center text-[#4f46e5]">
                                                <Truck className="h-6 w-6" />
                                            </div>
                                            <div>
                                                <h2 className="text-xl font-black text-gray-900 tracking-tight">Shipping</h2>
                                                <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Where should we send your order?</p>
                                            </div>
                                        </div>

                                        <div className="grid sm:grid-cols-2 gap-6">
                                            <Field label="First Name" type="text" required placeholder="Ali" />
                                            <Field label="Last Name" type="text" required placeholder="Raza" />
                                            <Field label="Email Address" type="email" required placeholder="ali@example.com" colSpan />
                                            <Field label="Phone Number" type="tel" required placeholder="03XX-XXXXXXX" colSpan />
                                            <Field label="Street Address / House No." type="text" required placeholder="House #12, Street 5, Block B" colSpan />
                                            <Field label="City" type="text" required placeholder="Karachi" />
                                            <Field label="Province" type="text" required placeholder="Sindh" />
                                        </div>

                                        <div className="pt-10 flex justify-end">
                                            <button type="submit"
                                                className="w-full sm:w-auto px-12 py-5 bg-[#4f46e5] hover:bg-[#005f6e] text-white font-black uppercase tracking-widest rounded-2xl text-[10px] transition shadow-xl shadow-indigo-900/20 group">
                                                Continue to Payment
                                            </button>
                                        </div>
                                    </div>
                                )}

                                {step === 2 && (
                                    <div className="bg-white shadow-2xl shadow-gray-200/50 rounded-[2.5rem] p-8 lg:p-12 border border-gray-100 animate-in fade-in slide-in-from-bottom-4 duration-500 transition-colors">
                                        <div className="flex items-center gap-4 mb-10">
                                            <div className="w-12 h-12 bg-[#4f46e5]/5 rounded-2xl flex items-center justify-center text-[#4f46e5]">
                                                <CreditCard className="h-6 w-6" />
                                            </div>
                                            <div>
                                                <h2 className="text-xl font-black text-gray-900 tracking-tight">Payment</h2>
                                                <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Select your preferred method</p>
                                            </div>
                                        </div>

                                        <div className="mb-10 p-4 bg-indigo-50 rounded-2xl border border-indigo-100 flex items-center gap-4 transition-colors">
                                            <Shield className="h-5 w-5 text-[#4f46e5]" />
                                            <p className="text-[10px] font-bold text-[#4f46e5] uppercase tracking-wider">
                                                Al-Qavi Secure 256-bit SSL encrypted transaction.
                                            </p>
                                        </div>

                                        <div className="grid sm:grid-cols-3 gap-4 mb-10">
                                            {[
                                                { id: 'card', label: 'Card Payment', icon: <CreditCard className="h-4 w-4" /> },
                                                { id: 'cod', label: 'Cash on Delivery', icon: <Banknote className="h-4 w-4" /> },
                                                { id: 'easypaisa', label: 'Wallets / Mobile', icon: <Smartphone className="h-4 w-4" /> },
                                            ].map(m => (
                                                <button key={m.id} type="button" onClick={() => setPayMethod(m.id as any)}
                                                    className={`flex flex-col items-center gap-3 p-6 border-2 rounded-[2rem] text-[10px] font-black uppercase tracking-widest transition-all ${payMethod === m.id ? 'border-[#4f46e5] bg-[#4f46e5]/5 text-[#4f46e5] shadow-lg shadow-[#4f46e5]/10' : 'border-gray-50 hover:border-gray-200 text-gray-400 hover:text-gray-900'}`}>
                                                    <div className={`p-3 rounded-xl ${payMethod === m.id ? 'bg-[#4f46e5] text-white' : 'bg-gray-50'}`}>{m.icon}</div>
                                                    {m.label}
                                                </button>
                                            ))}
                                        </div>

                                        {payMethod === 'card' && (
                                            <div className="grid sm:grid-cols-2 gap-6 pt-2 animate-in fade-in duration-300">
                                                <Field label="Card Number" type="text" required placeholder="0000 0000 0000 0000" colSpan />
                                                <Field label="Expiry Date" type="text" required placeholder="MM / YY" />
                                                <div className="space-y-2">
                                                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">CVV Security Code</label>
                                                    <div className="relative">
                                                        <input type="password" maxLength={4} required placeholder="•••"
                                                            className="w-full px-5 py-4 bg-gray-50 border-2 border-transparent rounded-2xl text-[10px] font-black outline-none focus:border-[#4f46e5] focus:bg-white transition-all shadow-inner text-gray-900 placeholder:text-gray-300" />
                                                        <Lock className="absolute right-5 top-4 h-4 w-4 text-gray-300" />
                                                    </div>
                                                </div>
                                                <Field label="Name on Card" type="text" required placeholder="Ali Raza" colSpan />
                                            </div>
                                        )}
                                        {payMethod === 'cod' && (
                                            <div className="bg-gray-50 rounded-3xl p-8 border border-gray-100 flex items-start gap-4 animate-in fade-in duration-300 transition-colors">
                                                <Info className="h-5 w-5 text-[#4f46e5] mt-1" />
                                                <p className="text-sm font-medium text-gray-600 leading-relaxed">
                                                    You will pay in cash upon delivery. Please ensure someone is available at the shipping address to receive the parcel. A nominal service fee of Rs. 50 may apply.
                                                </p>
                                            </div>
                                        )}
                                        {payMethod === 'easypaisa' && (
                                            <div className="space-y-6 animate-in fade-in duration-300">
                                                <Field label="EasyPaisa / JazzCash Number" type="tel" required placeholder="03XX-XXXXXXX" />
                                                <div className="bg-gray-50 rounded-2xl p-6 text-[10px] font-bold text-gray-500 uppercase tracking-widest leading-loose border border-gray-100 transition-colors">
                                                    1. Enter your registered mobile number<br />
                                                    2. You will receive a secure prompt on your phone<br />
                                                    3. Enter your PIN to authorize payment
                                                </div>
                                            </div>
                                        )}

                                        <div className="flex flex-col sm:flex-row gap-4 pt-12">
                                            <button type="button" onClick={() => setStep(1)}
                                                className="flex-1 py-5 border-2 border-gray-100 hover:border-gray-300 text-gray-400 hover:text-gray-900 font-black uppercase tracking-widest rounded-2xl text-[10px] transition group">
                                                <ArrowLeft className="h-4 w-4 inline mr-2 group-hover:-translate-x-1 transition-transform" /> Back to Shipping
                                            </button>
                                            <button type="submit"
                                                className="flex-[2] py-5 bg-[#4f46e5] hover:bg-[#005f6e] text-white font-black uppercase tracking-widest rounded-2xl text-[10px] transition shadow-xl shadow-indigo-900/20">
                                                Finalize Order · Rs. {total.toLocaleString()}
                                            </button>
                                        </div>
                                    </div>
                                )}
                            </form>
                        </div>

                        {/* ── Summary Section ── */}
                        <div className="w-full lg:w-[400px] order-1 lg:order-2 sticky top-32">
                            <div className="bg-white shadow-2xl shadow-gray-200/50 rounded-[2.5rem] p-8 lg:p-10 border border-gray-100 transition-colors">
                                <h3 className="text-sm font-black text-gray-900 uppercase tracking-widest mb-8 flex justify-between">
                                    Summary <span className="text-[#4f46e5]">{items.reduce((s, i) => s + i.quantity, 0)} Items</span>
                                </h3>

                                <div className="space-y-6 max-h-[400px] overflow-y-auto pr-2 custom-scrollbar mb-8">
                                    {items.map(item => {
                                        const p = typeof item.price === 'string' ? parseFloat(item.price) : item.price;
                                        return (
                                            <div key={item.id} className="flex gap-4 group">
                                                <div className="w-16 h-16 rounded-2xl overflow-hidden flex-shrink-0 bg-gray-50 border border-gray-100 group-hover:shadow-lg transition-all">
                                                    <img src={item.image || 'https://images.unsplash.com/photo-1596462502278-27bfdd403cc2?q=80&w=100'} alt={item.name} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500" />
                                                </div>
                                                <div className="flex-1 min-w-0 py-1">
                                                    <p className="text-xs font-bold text-gray-900 line-clamp-1 mb-1">{item.name}</p>
                                                    <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Qty: {item.quantity}</p>
                                                </div>
                                                <div className="py-1">
                                                    <p className="text-xs font-black text-[#4f46e5] tracking-tighter">Rs. {(p * item.quantity).toLocaleString()}</p>
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>

                                <div className="space-y-4 pt-8 border-t border-gray-50 text-[10px] font-black uppercase tracking-widest text-gray-400 transition-colors">
                                    <div className="flex justify-between">
                                        <span>Subtotal</span>
                                        <span className="text-gray-900">Rs. {cartTotal.toLocaleString()}</span>
                                    </div>
                                    <div className="flex justify-between">
                                        <span>Logistics</span>
                                        <span className={shipping === 0 ? 'text-[#4f46e5]' : 'text-gray-900'}>
                                            {shipping === 0 ? 'Complimentary' : `Rs. ${shipping}`}
                                        </span>
                                    </div>
                                    <div className="flex justify-between text-gray-900 text-lg font-black tracking-tighter border-t border-gray-50 pt-6 mt-4 normal-case transition-colors">
                                        <span className="text-sm font-black uppercase tracking-widest">Grand Total</span>
                                        <span>Rs. {total.toLocaleString()}</span>
                                    </div>
                                </div>

                                <div className="mt-10 flex items-center justify-center gap-3 p-4 bg-gray-50 rounded-2xl text-[10px] font-black uppercase tracking-widest text-gray-400 border border-gray-100 transition-colors">
                                    <Lock className="h-3 w-3 text-[#4f46e5]" /> Al-Qavi Shield Protected
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

// ── Field Helper ──────────────────────────────────────────────────────────────
function Field({ label, type = 'text', required = false, placeholder = '', colSpan = false }
    : { label: string; type?: string; required?: boolean; placeholder?: string; colSpan?: boolean }) {
    return (
        <div className={colSpan ? 'sm:col-span-2 space-y-2' : 'space-y-2'}>
            <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">{label}</label>
            <input type={type} required={required} placeholder={placeholder}
                className="w-full px-5 py-4 bg-gray-50 border-2 border-transparent rounded-2xl text-[10px] font-black outline-none focus:border-[#4f46e5] focus:bg-white transition-all shadow-inner placeholder:text-gray-300 text-gray-900" />
        </div>
    );
}
