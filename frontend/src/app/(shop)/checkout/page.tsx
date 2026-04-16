'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
    CheckCircle, CreditCard, Truck, ShieldCheck, Lock,
    Smartphone, Banknote, ShoppingCart, Copy, Check, MapPin, X, Package
} from 'lucide-react';
import { useCart } from '@/context/CartContext';
import { getImageUrl } from '@/lib/utils';
import { salesService, settingsService } from '@/lib/api';

const STORAGE_KEY = 'alqavi_checkout_info';

export default function CheckoutPage() {
    const { items, cartTotal, clearCart, cartCount } = useCart();
    const router = useRouter();
    const [payMethod, setPayMethod] = useState<'card' | 'cod' | 'easypaisa'>('cod');
    const [shippingInfo, setShippingInfo] = useState({
        firstName: '',
        lastName: '',
        email: '',
        phone: '',
        address: '',
        city: '',
    });
    const [isProcessing, setIsProcessing] = useState(false);
    const [showReview, setShowReview] = useState(false);
    const [placedOrderNumber, setPlacedOrderNumber] = useState<string | null>(null);
    const [copied, setCopied] = useState(false);

    const isLoggedIn = typeof window !== 'undefined' ? !!localStorage.getItem('accessToken') : false;

    // Load saved shipping info from localStorage or profile
    useEffect(() => {
        try {
            const saved = localStorage.getItem(STORAGE_KEY);
            if (saved) {
                const parsed = JSON.parse(saved);
                setShippingInfo(prev => ({ ...prev, ...parsed }));
                return; // Already have saved data, skip profile fetch
            }
        } catch {}

        if (isLoggedIn) {
            settingsService.getProfile().then((profile: any) => {
                if (profile) {
                    setShippingInfo({
                        firstName: profile.first_name || '',
                        lastName: profile.last_name || '',
                        email: profile.email || '',
                        phone: profile.phone || profile.phone_number || '',
                        address: profile.address || '',
                        city: profile.city || '',
                    });
                }
            }).catch(() => {});
        }
    }, [isLoggedIn]);

    const shipping = cartTotal > 5000 ? 0 : 350;
    const total = cartTotal + shipping;

    const handleCopy = () => {
        if (placedOrderNumber) {
            navigator.clipboard.writeText(placedOrderNumber);
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        }
    };

    /* Step 1: User fills form & clicks "Place Order" -> save to local & show review */
    const handlePlaceOrder = (e: React.FormEvent) => {
        e.preventDefault();
        // Persist shipping info for next time
        localStorage.setItem(STORAGE_KEY, JSON.stringify(shippingInfo));
        setShowReview(true);
    };

    /* Step 2: User clicks "Confirm Order" in the review modal -> call API */
    const processOrder = async () => {
        setIsProcessing(true);
        try {
            const payload = {
                customer_name: `${shippingInfo.firstName} ${shippingInfo.lastName}`.trim(),
                shipping_address: `${shippingInfo.address}, ${shippingInfo.city}`,
                phone_number: shippingInfo.phone,
                payment_method: payMethod.toUpperCase(),
                notes: `Email: ${shippingInfo.email} | Payment: ${payMethod.toUpperCase()}`,
                items: items.map((i: any) => ({
                    id: i.id,
                    quantity: i.quantity,
                    price: parseFloat(String(i.price))
                }))
            };

            const response = await salesService.createOrder(payload);
            setPlacedOrderNumber(response.tracking_id);
            clearCart();
            setShowReview(false);
        } catch (err: any) {
            console.error('Order creation failed:', err?.response?.data || err);
            alert('Error: Failed to process order. Please try again.');
        } finally {
            setIsProcessing(false);
        }
    };

    /* ═══════════════════════════════════════════════════════
       SUCCESS SCREEN
    ═══════════════════════════════════════════════════════ */
    if (placedOrderNumber) {
        return (
            <div className="min-h-screen bg-white flex flex-col items-center justify-center p-8 text-center animate-in zoom-in-95">
                <div className="w-20 h-20 bg-emerald-50 rounded-full flex items-center justify-center mb-6 animate-in zoom-in duration-500">
                    <CheckCircle className="h-12 w-12 text-emerald-500" />
                </div>
                <h1 className="text-3xl font-bold text-slate-900 mb-2">Order Placed, thank you!</h1>
                <p className="text-slate-500 mb-8 max-w-md">Confirmation will be sent to your email. Your tracking ID is shown below.</p>

                <div className="bg-gray-50 border border-gray-200 rounded-2xl p-6 mb-8 w-full max-w-sm flex items-center justify-between shadow-sm">
                    <div className="text-left">
                        <p className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] mb-1">Tracking ID</p>
                        <p className="text-xl font-black text-slate-900 tracking-tighter">{placedOrderNumber}</p>
                    </div>
                    <button onClick={handleCopy} className="p-3 bg-white border border-gray-200 rounded-xl hover:border-[#F59E0B] hover:text-[#F59E0B] transition-all">
                        {copied ? <span className="text-[10px] font-bold text-emerald-500 flex items-center gap-1"><Check className="h-4 w-4" /> Copied</span> : <Copy className="h-4 w-4 text-gray-400" />}
                    </button>
                </div>

                <div className="flex flex-col sm:flex-row gap-4 w-full max-w-md">
                    <Link href={`/tracking?tid=${placedOrderNumber}`} className="flex-1 py-3 bg-[#F59E0B] text-white font-bold rounded-xl hover:bg-[#F59E0B]/90 transition-all shadow-lg text-center">Track Order</Link>
                    <Link href="/" className="flex-1 py-3 bg-white border border-gray-200 text-slate-700 font-bold rounded-xl hover:bg-gray-50 transition-all text-center">Back to Menu</Link>
                </div>
            </div>
        );
    }

    /* ═══════════════════════════════════════════════════════
       EMPTY CART
    ═══════════════════════════════════════════════════════ */
    if (items.length === 0) {
        return (
            <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-8 text-center">
                <ShoppingCart className="h-16 w-16 text-slate-300 mb-6" />
                <h2 className="text-2xl font-bold text-slate-900 mb-4">Your cart is empty</h2>
                <Link href="/" className="px-6 py-3 bg-[#F59E0B] text-white font-bold rounded-xl">Browse Menu</Link>
            </div>
        );
    }

    /* ═══════════════════════════════════════════════════════
       CHECKOUT FORM (All-In-One)
    ═══════════════════════════════════════════════════════ */
    return (
        <div className="min-h-screen bg-slate-50 font-sans pb-20">
            {/* Header */}
            <div className="bg-white border-b py-4 px-4 sticky top-0 z-50 shadow-sm">
                <div className="max-w-[1240px] mx-auto flex items-center justify-between">
                    <Link href="/" className="flex items-center gap-2 group">
                        <div className="w-8 h-8 bg-[#F59E0B] rounded-lg flex items-center justify-center">
                            <span className="text-lg font-black text-white">A</span>
                        </div>
                        <span className="text-xl font-black text-slate-900 uppercase">Checkout <span className="text-[#F59E0B] font-medium text-lg ml-1">({cartCount})</span></span>
                    </Link>
                    <div className="hidden sm:flex items-center gap-1 text-slate-400">
                        <Lock className="h-4 w-4" />
                        <span className="text-xs font-bold uppercase tracking-widest">Secure Checkout</span>
                    </div>
                </div>
            </div>

            <div className="max-w-[1200px] mx-auto px-4 py-8">
                <form onSubmit={handlePlaceOrder} className="flex flex-col lg:flex-row gap-8">
                    
                    {/* Left Column */}
                    <div className="flex-1 space-y-6">
                        
                        {/* ── 1. Delivery Details ── */}
                        <div className="bg-white border border-gray-200 rounded-2xl p-6 shadow-sm">
                            <div className="flex items-center gap-3 mb-6 border-b border-gray-100 pb-4">
                                <span className="w-8 h-8 rounded-full bg-[#F59E0B]/10 text-[#F59E0B] flex items-center justify-center font-black text-sm">1</span>
                                <h2 className="text-lg font-black text-slate-900 uppercase">Delivery Details</h2>
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div className="col-span-2 sm:col-span-1 border rounded-xl overflow-hidden focus-within:border-[#F59E0B] transition-colors">
                                    <label className="block text-[10px] font-black uppercase text-slate-400 px-4 pt-2.5 tracking-widest">First Name *</label>
                                    <input required className="w-full h-10 px-4 pb-2 bg-transparent text-sm font-bold text-slate-900 outline-none" value={shippingInfo.firstName} onChange={(e) => setShippingInfo({...shippingInfo, firstName: e.target.value})} placeholder="John" />
                                </div>
                                <div className="col-span-2 sm:col-span-1 border rounded-xl overflow-hidden focus-within:border-[#F59E0B] transition-colors">
                                    <label className="block text-[10px] font-black uppercase text-slate-400 px-4 pt-2.5 tracking-widest">Last Name *</label>
                                    <input required className="w-full h-10 px-4 pb-2 bg-transparent text-sm font-bold text-slate-900 outline-none" value={shippingInfo.lastName} onChange={(e) => setShippingInfo({...shippingInfo, lastName: e.target.value})} placeholder="Doe" />
                                </div>
                                <div className="col-span-2 sm:col-span-1 border rounded-xl overflow-hidden focus-within:border-[#F59E0B] transition-colors">
                                    <label className="block text-[10px] font-black uppercase text-slate-400 px-4 pt-2.5 tracking-widest">Phone *</label>
                                    <input required type="tel" className="w-full h-10 px-4 pb-2 bg-transparent text-sm font-bold text-slate-900 outline-none" value={shippingInfo.phone} onChange={(e) => setShippingInfo({...shippingInfo, phone: e.target.value})} placeholder="0300 1234567" />
                                </div>
                                <div className="col-span-2 sm:col-span-1 border rounded-xl overflow-hidden focus-within:border-[#F59E0B] transition-colors">
                                    <label className="block text-[10px] font-black uppercase text-slate-400 px-4 pt-2.5 tracking-widest">Email</label>
                                    <input type="email" className="w-full h-10 px-4 pb-2 bg-transparent text-sm font-bold text-slate-900 outline-none" value={shippingInfo.email} onChange={(e) => setShippingInfo({...shippingInfo, email: e.target.value})} placeholder="john@example.com" />
                                </div>
                                <div className="col-span-2 border rounded-xl overflow-hidden focus-within:border-[#F59E0B] transition-colors">
                                    <label className="block text-[10px] font-black uppercase text-slate-400 px-4 pt-2.5 tracking-widest">Address *</label>
                                    <input required className="w-full h-10 px-4 pb-2 bg-transparent text-sm font-bold text-slate-900 outline-none" value={shippingInfo.address} onChange={(e) => setShippingInfo({...shippingInfo, address: e.target.value})} placeholder="House 123, Street 4" />
                                </div>
                                <div className="col-span-2 sm:col-span-1 border rounded-xl overflow-hidden focus-within:border-[#F59E0B] transition-colors">
                                    <label className="block text-[10px] font-black uppercase text-slate-400 px-4 pt-2.5 tracking-widest">City *</label>
                                    <input required className="w-full h-10 px-4 pb-2 bg-transparent text-sm font-bold text-slate-900 outline-none" value={shippingInfo.city} onChange={(e) => setShippingInfo({...shippingInfo, city: e.target.value})} placeholder="Lahore" />
                                </div>
                            </div>
                        </div>

                        {/* ── 2. Payment Method ── */}
                        <div className="bg-white border border-gray-200 rounded-2xl p-6 shadow-sm">
                            <div className="flex items-center gap-3 mb-6 border-b border-gray-100 pb-4">
                                <span className="w-8 h-8 rounded-full bg-[#F59E0B]/10 text-[#F59E0B] flex items-center justify-center font-black text-sm">2</span>
                                <h2 className="text-lg font-black text-slate-900 uppercase">Payment Method</h2>
                            </div>
                            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                                {[
                                    { id: 'cod', name: 'Cash on Delivery', icon: Banknote },
                                    { id: 'easypaisa', name: 'Easypaisa', icon: Smartphone },
                                    { id: 'card', name: 'Credit Card', icon: CreditCard }
                                ].map(m => (
                                    <label key={m.id} className={`flex flex-col items-center gap-3 p-5 rounded-xl border-2 cursor-pointer transition-all text-center
                                        ${payMethod === m.id ? 'border-[#F59E0B] bg-[#F59E0B]/5 shadow-md shadow-[#F59E0B]/10' : 'border-slate-100 hover:border-[#F59E0B]/30'}`}>
                                        <input type="radio" name="payment" value={m.id} checked={payMethod === m.id} onChange={() => setPayMethod(m.id as any)} className="sr-only" />
                                        <m.icon className={`h-8 w-8 ${payMethod === m.id ? 'text-[#F59E0B]' : 'text-slate-400'}`} />
                                        <span className={`text-[10px] font-black uppercase tracking-widest ${payMethod === m.id ? 'text-[#F59E0B]' : 'text-slate-500'}`}>{m.name}</span>
                                    </label>
                                ))}
                            </div>
                        </div>

                        {/* ── 3. Review Items ── */}
                        <div className="bg-white border border-gray-200 rounded-2xl p-6 shadow-sm">
                            <div className="flex items-center gap-3 mb-6 border-b border-gray-100 pb-4">
                                <span className="w-8 h-8 rounded-full bg-[#F59E0B]/10 text-[#F59E0B] flex items-center justify-center font-black text-sm">3</span>
                                <h2 className="text-lg font-black text-slate-900 uppercase">Your Items</h2>
                            </div>
                            <div className="divide-y divide-slate-100">
                                {items.map((item: any) => (
                                    <div key={item.id} className="py-4 flex gap-4 items-center">
                                        <div className="w-14 h-14 rounded-xl bg-slate-50 flex items-center justify-center p-1.5 border border-slate-100">
                                            {getImageUrl(item.image) ? (
                                                <img src={getImageUrl(item.image)!} className="w-full h-full object-contain" alt={item.name} />
                                            ) : (
                                                <Package className="w-6 h-6 text-gray-300 opacity-50" />
                                            )}
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <h4 className="text-sm font-bold text-slate-900 truncate">{item.name}</h4>
                                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-1">Qty: {item.quantity}</p>
                                        </div>
                                        <p className="text-sm font-black text-[#F59E0B] shrink-0">PKR {(parseFloat(item.price) * item.quantity).toLocaleString()}</p>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>

                    {/* Right Column: Sticky Summary */}
                    <div className="w-full lg:w-[400px]">
                        <div className="bg-white border border-gray-200 rounded-2xl p-6 sticky top-24 shadow-sm">
                            <h3 className="text-lg font-black text-slate-900 uppercase pb-4 mb-4 border-b border-slate-100">Order Summary</h3>

                            <div className="space-y-3 text-sm mb-6">
                                <div className="flex justify-between text-slate-500 font-bold">
                                    <span>Subtotal ({cartCount} items)</span>
                                    <span className="text-slate-900">PKR {cartTotal.toLocaleString()}</span>
                                </div>
                                <div className="flex justify-between text-slate-500 font-bold">
                                    <span>Delivery Fee</span>
                                    <span className={shipping === 0 ? 'text-emerald-600 font-black' : 'text-slate-900'}>{shipping === 0 ? 'FREE' : `PKR ${shipping}`}</span>
                                </div>
                            </div>

                            <div className="pt-4 border-t border-slate-100 mb-6">
                                <div className="flex justify-between items-center">
                                    <span className="text-lg font-black uppercase text-slate-900">Total</span>
                                    <span className="text-2xl font-black text-[#F59E0B]">PKR {total.toLocaleString()}</span>
                                </div>
                            </div>

                            <button
                                type="submit"
                                className="w-full py-4 bg-[#F59E0B] text-white rounded-xl text-sm font-black uppercase tracking-widest hover:bg-[#F59E0B]/90 transition-all shadow-lg shadow-[#F59E0B]/20 active:scale-[0.98] flex justify-center items-center gap-2"
                            >
                                <Package className="h-4 w-4" /> Place Order
                            </button>

                            <div className="mt-5 flex gap-2 items-center justify-center text-[10px] text-slate-400 font-bold uppercase tracking-widest">
                                <ShieldCheck className="h-4 w-4" /> Secure & Encrypted
                            </div>
                        </div>
                    </div>
                </form>
            </div>

            {/* ═══════════════════════════════════════════════════════
               REVIEW & CONFIRM MODAL
            ═══════════════════════════════════════════════════════ */}
            {showReview && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
                    <div className="bg-white rounded-3xl w-full max-w-lg max-h-[90vh] overflow-y-auto shadow-2xl animate-in zoom-in-95 duration-300">
                        {/* Modal Header */}
                        <div className="sticky top-0 bg-white z-10 px-6 pt-6 pb-4 border-b border-slate-100 flex items-center justify-between">
                            <div>
                                <h2 className="text-xl font-black text-slate-900 uppercase">Review Your Order</h2>
                                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-0.5">Please confirm the details below</p>
                            </div>
                            <button onClick={() => setShowReview(false)} className="w-10 h-10 rounded-xl bg-slate-50 flex items-center justify-center hover:bg-slate-100 transition-colors">
                                <X className="h-5 w-5 text-slate-400" />
                            </button>
                        </div>

                        <div className="p-6 space-y-5">
                            {/* Delivery Summary */}
                            <div className="bg-slate-50 rounded-xl p-4 space-y-2">
                                <p className="text-[10px] font-black text-[#F59E0B] uppercase tracking-widest mb-2">Delivery To</p>
                                <p className="text-sm font-bold text-slate-900">{shippingInfo.firstName} {shippingInfo.lastName}</p>
                                <p className="text-xs text-slate-500 flex items-center gap-2"><MapPin className="h-3 w-3" /> {shippingInfo.address}, {shippingInfo.city}</p>
                                <p className="text-xs text-slate-500">{shippingInfo.phone}</p>
                            </div>

                            {/* Payment Summary */}
                            <div className="bg-slate-50 rounded-xl p-4">
                                <p className="text-[10px] font-black text-[#F59E0B] uppercase tracking-widest mb-2">Payment</p>
                                <p className="text-sm font-bold text-slate-900 capitalize">{payMethod === 'cod' ? 'Cash on Delivery' : payMethod === 'easypaisa' ? 'Easypaisa / Mobile Wallet' : 'Credit Card'}</p>
                            </div>

                            {/* Items Summary */}
                            <div>
                                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3">Items ({cartCount})</p>
                                <div className="divide-y divide-slate-100 border border-slate-100 rounded-xl overflow-hidden">
                                    {items.map((item: any) => (
                                        <div key={item.id} className="px-4 py-3 flex items-center gap-3">
                                            <div className="w-10 h-10 rounded-lg bg-slate-50 flex items-center justify-center p-1 border border-slate-100 shrink-0">
                                                {getImageUrl(item.image) ? (
                                                    <img src={getImageUrl(item.image)!} className="w-full h-full object-contain" alt={item.name} />
                                                ) : (
                                                    <Package className="w-5 h-5 text-gray-300 opacity-50" />
                                                )}
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <p className="text-xs font-bold text-slate-900 truncate">{item.name}</p>
                                                <p className="text-[10px] text-slate-400 font-bold">× {item.quantity}</p>
                                            </div>
                                            <p className="text-xs font-black text-slate-900 shrink-0">PKR {(parseFloat(item.price) * item.quantity).toLocaleString()}</p>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            {/* Totals */}
                            <div className="bg-[#F59E0B]/5 border border-[#F59E0B]/20 rounded-xl p-4 space-y-2">
                                <div className="flex justify-between text-xs font-bold text-slate-600">
                                    <span>Subtotal</span>
                                    <span>PKR {cartTotal.toLocaleString()}</span>
                                </div>
                                <div className="flex justify-between text-xs font-bold text-slate-600">
                                    <span>Delivery</span>
                                    <span>{shipping === 0 ? 'FREE' : `PKR ${shipping}`}</span>
                                </div>
                                <div className="flex justify-between text-base font-black text-slate-900 pt-2 border-t border-[#F59E0B]/20">
                                    <span>Total</span>
                                    <span className="text-[#F59E0B]">PKR {total.toLocaleString()}</span>
                                </div>
                            </div>
                        </div>

                        {/* Modal Footer */}
                        <div className="sticky bottom-0 bg-white z-10 px-6 py-5 border-t border-slate-100 flex gap-3">
                            <button
                                type="button"
                                onClick={() => setShowReview(false)}
                                disabled={isProcessing}
                                className="flex-1 py-3.5 border border-slate-200 text-slate-600 font-bold rounded-xl hover:bg-slate-50 transition-all disabled:opacity-50"
                            >
                                Edit Details
                            </button>
                            <button
                                type="button"
                                onClick={processOrder}
                                disabled={isProcessing}
                                className="flex-1 py-3.5 bg-[#F59E0B] text-white font-black rounded-xl uppercase tracking-widest text-xs hover:bg-[#F59E0B]/90 transition-all shadow-lg shadow-[#F59E0B]/20 disabled:opacity-50 active:scale-[0.98] flex items-center justify-center gap-2"
                            >
                                {isProcessing ? 'Processing...' : <><Check className="h-4 w-4" /> Confirm Order</>}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
