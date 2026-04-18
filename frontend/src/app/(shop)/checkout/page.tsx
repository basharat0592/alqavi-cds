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
                return; 
            }
        } catch { }

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
            }).catch(() => { });
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

    const handlePlaceOrder = (e: React.FormEvent) => {
        e.preventDefault();
        localStorage.setItem(STORAGE_KEY, JSON.stringify(shippingInfo));
        setShowReview(true);
    };

    const processOrder = async () => {
        setIsProcessing(true);
        try {
            const payload = {
                customer_name: `${shippingInfo.firstName} ${shippingInfo.lastName}`.trim(),
                shipping_address: `${shippingInfo.address}, ${shippingInfo.city}`,
                phone_number: shippingInfo.phone,
                payment_method: payMethod === 'cod' ? 'COD' : 'ONLINE',
                notes: `Email: ${shippingInfo.email} | Auth: ${isLoggedIn ? 'User' : 'Guest'}`,
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
            const errorMsg = err?.response?.data ? JSON.stringify(err.response.data) : 'Please try again.';
            alert(`Error: Failed to process order. ${errorMsg}`);
        } finally {
            setIsProcessing(false);
        }
    };

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
                    <Link href={`/tracking?tid=${placedOrderNumber}`} className="flex-1 py-3 bg-[#f0c14b] text-[#111] font-bold rounded-xl border border-[#a88734] hover:bg-[#f0c14b]/90 transition-all text-center">Track Order</Link>
                    <Link href="/" className="flex-1 py-3 bg-white border border-gray-200 text-slate-700 font-bold rounded-xl hover:bg-gray-50 transition-all text-center">Back to Shop</Link>
                </div>
            </div>
        );
    }

    if (items.length === 0) {
        return (
            <div className="min-h-screen bg-[#F8F9FA] flex flex-col items-center justify-center p-8 text-center">
                <ShoppingCart className="h-16 w-16 text-slate-300 mb-6" />
                <h2 className="text-2xl font-bold text-slate-900 mb-4">Your cart is empty</h2>
                <Link href="/" className="px-10 py-2.5 bg-[#f0c14b] text-[#111] font-bold rounded-[3px] border border-[#a88734] shadow-sm">Browse Products</Link>
            </div>
        );
    }

    /* ═══════════════════════════════════════════════════════
       PURE AMAZON COMPONENTS (Sourced from Admin Design)
    ═══════════════════════════════════════════════════════ */
    const cardCls = "bg-white border border-[#ddd] rounded-[4px] shadow-sm overflow-hidden mb-5";
    const headerCls = "px-6 py-4 border-b border-[#ddd] bg-[#f7f8fa]";
    const inputCls = "w-full h-[31px] px-3 border border-[#888c8e] rounded-[3px] text-[13px] outline-none focus:border-[#e77600] focus:shadow-[0_0_3px_2px_rgba(228,121,17,0.5)] font-medium transition-all bg-white";
    const btnPrimary = "w-full h-[32px] bg-gradient-to-b from-[#f7dfa5] to-[#f0c14b] border border-[#a88734] hover:from-[#f5d78e] hover:to-[#eeb933] rounded-[3px] text-[13px] font-medium text-[#111] shadow-sm active:scale-[0.98] transition-all flex items-center justify-center gap-2";
    
    const AmazonField = ({ label, required, children }: any) => (
        <div className="space-y-1">
            <label className="block text-[13px] font-bold text-[#111]">
                {label} {required && <span className="text-red-600 ml-0.5">*</span>}
            </label>
            {children}
        </div>
    );

    return (
        <div className="min-h-screen bg-[#F8F9FA] font-sans pb-20 text-[#111]">
            {/* Amazon Universal Header */}
            <header className="bg-[#131921] py-3 px-6 sticky top-0 z-[100] border-b border-black">
                <div className="max-w-[1150px] mx-auto flex items-center justify-between">
                    <Link href="/" className="flex items-center gap-2">
                         <div className="w-8 h-8 bg-[#ff9900] rounded-[2px] flex items-center justify-center font-black text-[#131921] text-xl pb-1">a</div>
                         <h1 className="text-xl font-bold text-white tracking-tighter">Checkout <span className="text-[#aaa] font-normal text-sm ml-1">({cartCount} items)</span></h1>
                    </Link>
                    <div className="flex items-center gap-2 text-[#aaa]">
                        <Lock className="h-4 w-4" />
                        <span className="text-[11px] font-bold uppercase tracking-wider">Secure Transaction</span>
                    </div>
                </div>
            </header>

            <div className="max-w-[1100px] mx-auto px-6 py-8">
                <form onSubmit={handlePlaceOrder} className="flex flex-col lg:flex-row gap-6 items-start">
                    
                    {/* LEFT COLUMN: FULFILLMENT */}
                    <div className="flex-1 space-y-5 min-w-0 w-full">
                        
                        {/* 1. SHIPPING ADDRESS */}
                        <div className={cardCls}>
                            <div className={headerCls}>
                                <h3 className="text-[14px] font-bold text-[#111]">1. Shipping Address</h3>
                                <p className="text-[12px] text-[#565959]">Please enter the delivery destination.</p>
                            </div>
                            <div className="p-6 grid grid-cols-2 gap-x-6 gap-y-4">
                                <AmazonField label="First Name" required>
                                    <input className={inputCls} required value={shippingInfo.firstName} onChange={(e:any) => setShippingInfo({...shippingInfo, firstName: e.target.value})} />
                                </AmazonField>
                                <AmazonField label="Last Name" required>
                                    <input className={inputCls} required value={shippingInfo.lastName} onChange={(e:any) => setShippingInfo({...shippingInfo, lastName: e.target.value})} />
                                </AmazonField>
                                <AmazonField label="Phone Number" required>
                                    <input className={inputCls} required value={shippingInfo.phone} onChange={(e:any) => setShippingInfo({...shippingInfo, phone: e.target.value})} placeholder="e.g. 0300 1234567" />
                                </AmazonField>
                                <AmazonField label="Email Address (Optional)">
                                    <input className={inputCls} type="email" value={shippingInfo.email} onChange={(e:any) => setShippingInfo({...shippingInfo, email: e.target.value})} />
                                </AmazonField>
                                <div className="col-span-2">
                                    <AmazonField label="Street Address" required>
                                        <textarea 
                                            required
                                            rows={2}
                                            value={shippingInfo.address}
                                            onChange={(e) => setShippingInfo({...shippingInfo, address: e.target.value})}
                                            className="w-full px-3 py-2 border border-[#888c8e] rounded-[3px] text-[13px] outline-none focus:border-[#e77600] focus:shadow-[0_0_3px_2px_rgba(228,121,17,0.5)] font-medium transition-all"
                                        />
                                    </AmazonField>
                                </div>
                                <AmazonField label="City" required>
                                    <input className={inputCls} required value={shippingInfo.city} onChange={(e:any) => setShippingInfo({...shippingInfo, city: e.target.value})} />
                                </AmazonField>
                            </div>
                        </div>

                        {/* 2. PAYMENT METHOD */}
                        <div className={cardCls}>
                            <div className={headerCls}>
                                <h3 className="text-[14px] font-bold text-[#111]">2. Payment Method</h3>
                                <p className="text-[12px] text-[#565959]">Select how you would like to pay.</p>
                            </div>
                            <div className="p-6 space-y-3">
                                {[
                                    { id: 'cod', name: 'Cash on Delivery (COD)', desc: 'Scan & Pay or Cash at doorstep' },
                                    { id: 'easypaisa', name: 'Easypaisa / Mobile Wallet', desc: 'Secure digital payment' },
                                    { id: 'card', name: 'Credit or Debit Card', desc: 'Visa, Mastercard, PayPak' }
                                ].map(m => (
                                    <label key={m.id} className={`block p-4 border rounded-[4px] cursor-pointer transition-all ${payMethod === m.id ? 'border-[#e77600] bg-[#fcf5ee]' : 'border-[#ddd] hover:bg-[#f7f8fa]'}`}>
                                        <div className="flex gap-3">
                                            <input type="radio" name="payment" value={m.id} checked={payMethod === m.id} onChange={() => setPayMethod(m.id as any)} className="mt-1 accent-[#e77600]" />
                                            <div>
                                                <p className="text-[13px] font-bold text-[#111]">{m.name}</p>
                                                <p className="text-[11px] text-[#565959]">{m.desc}</p>
                                            </div>
                                        </div>
                                    </label>
                                ))}
                            </div>
                        </div>

                        {/* 3. REVIEW ITEMS */}
                        <div className={cardCls}>
                             <div className={headerCls}>
                                <h3 className="text-[14px] font-bold text-[#111]">3. Items and Shipping</h3>
                                <p className="text-[12px] text-[#565959]">Review products before placing order.</p>
                             </div>
                             <div className="divide-y divide-[#eee]">
                                {items.map((item: any) => (
                                    <div key={item.id} className="p-6 flex gap-6">
                                        <div className="w-16 h-16 shrink-0 border border-[#eee] rounded-[4px] p-2 flex items-center justify-center bg-white">
                                            <img src={getImageUrl(item.image)} className="max-w-full max-h-full object-contain" alt={item.name} />
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <h4 className="text-[14px] font-bold text-[#007185] hover:text-[#c45500] hover:underline cursor-pointer">{item.name}</h4>
                                            <p className="text-[11px] font-bold text-[#c45500] mt-1 italic">Qualifies for Fast Shipping</p>
                                            <div className="flex items-center gap-4 mt-2">
                                                <span className="text-[13px] font-black text-[#111]">PKR {parseFloat(item.price).toLocaleString()}</span>
                                                <span className="text-[11px] text-[#565959] font-bold bg-[#f3f3f3] px-2 py-0.5 rounded">Qty: {item.quantity}</span>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                             </div>
                        </div>
                    </div>

                    {/* RIGHT COLUMN: SUMMARY */}
                    <div className="w-full lg:w-[320px] sticky top-[80px]">
                        <div className="bg-white border border-[#ddd] rounded-[4px] p-5 space-y-5">
                            <button type="submit" className={btnPrimary + " h-[35px] text-[14px]"}>
                                Use this payment method
                            </button>
                            <p className="text-[11px] text-[#565959] text-center px-2 leading-tight">By placing your order, you agree to Al-Qavi's <span className="text-[#007185] hover:underline cursor-pointer">privacy notice</span> and <span className="text-[#007185] hover:underline cursor-pointer">conditions of use</span>.</p>
                            
                            <div className="pt-4 border-t border-[#eee] space-y-3">
                                <h3 className="text-[16px] font-bold text-[#111]">Order Summary</h3>
                                <div className="space-y-2 text-[12px] text-[#111]">
                                    <div className="flex justify-between">
                                        <span className="text-[#565959]">Items:</span>
                                        <span>PKR {cartTotal.toLocaleString()}</span>
                                    </div>
                                    <div className="flex justify-between">
                                        <span className="text-[#565959]">Shipping & handling:</span>
                                        <span>PKR {shipping.toLocaleString()}</span>
                                    </div>
                                    <div className="pt-2 flex justify-between">
                                        <span className="w-full border-t border-[#eee]" />
                                    </div>
                                    <div className="flex justify-between">
                                        <span className="text-[#565959]">Total before tax:</span>
                                        <span>PKR {total.toLocaleString()}</span>
                                    </div>
                                </div>

                                <div className="pt-4 border-t border-[#eee]">
                                    <div className="flex justify-between items-center">
                                        <span className="text-[17px] font-bold text-[#B12704]">Order Total:</span>
                                        <span className="text-[17px] font-bold text-[#B12704]">PKR {total.toLocaleString()}</span>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div className="mt-4 bg-[#f1f1f1] border border-[#ddd] rounded-[4px] p-4 flex gap-3">
                             <ShieldCheck className="h-5 w-5 text-[#565959] shrink-0" />
                             <p className="text-[11px] text-[#565959] leading-tight">Your data is encrypted and secure. We do not store full credit card details on our local servers.</p>
                        </div>
                    </div>
                </form>
            </div>

            {/* REVIEW MODAL (High-Fidelity) */}
            {showReview && (
                <div className="fixed inset-0 z-[1000] flex items-center justify-center p-4 bg-black/60 backdrop-blur-[2px]">
                    <div className="bg-white rounded-[4px] w-full max-w-2xl max-h-[90vh] overflow-hidden border border-[#ddd] shadow-2xl animate-in zoom-in-95 duration-200">
                        {/* Modal Header */}
                        <div className="bg-[#f7f8fa] border-b border-[#ddd] px-8 py-5 flex items-center justify-between">
                            <h2 className="text-[20px] font-medium text-[#111]">Review your order</h2>
                            <button onClick={() => setShowReview(false)} className="text-[#565959] hover:text-[#111] transition-colors"><X size={24} /></button>
                        </div>

                        <div className="p-8 space-y-8 overflow-y-auto max-h-[calc(90vh-140px)]">
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-8">
                                <div className="space-y-2">
                                    <h3 className="text-[13px] font-bold text-[#111] uppercase tracking-tighter">Shipping Address</h3>
                                    <div className="text-[13px] text-[#111] space-y-0.5">
                                        <p className="font-bold">{shippingInfo.firstName} {shippingInfo.lastName}</p>
                                        <p>{shippingInfo.address}</p>
                                        <p>{shippingInfo.city}</p>
                                        <p className="pt-1">Phone: {shippingInfo.phone}</p>
                                    </div>
                                </div>
                                <div className="space-y-2">
                                    <h3 className="text-[13px] font-bold text-[#111] uppercase tracking-tighter">Payment Method</h3>
                                    <p className="text-[13px] text-[#111] capitalize font-bold text-[#B12704]">{payMethod.replace('cod', 'Cash on Delivery')}</p>
                                    <p className="text-[11px] text-[#565959]">Verification may be required upon delivery.</p>
                                </div>
                            </div>

                            <div className="border border-[#ddd] rounded-[4px] overflow-hidden">
                                <div className="bg-[#f7f8fa] px-4 py-2 border-b border-[#ddd] flex justify-between text-[11px] font-bold text-[#565959] uppercase tracking-widest">
                                    <span>Shipment 1 of 1</span>
                                    <span>Estimated Delivery: 2-3 Days</span>
                                </div>
                                <div className="divide-y divide-[#eee]">
                                    {items.map((item: any) => (
                                        <div key={item.id} className="px-5 py-4 flex justify-between items-center text-[13px]">
                                            <div className="flex gap-4 items-center min-w-0">
                                                <div className="w-12 h-12 border border-[#eee] rounded-[2px] p-1 shrink-0 bg-white">
                                                    <img src={getImageUrl(item.image)} className="w-full h-full object-contain" />
                                                </div>
                                                <span className="font-bold text-[#007185] truncate">{item.name}</span>
                                            </div>
                                            <div className="flex items-center gap-10 shrink-0">
                                                <span className="font-bold text-[#565959]">Qty: {item.quantity}</span>
                                                <span className="w-24 text-right font-black text-[#111]">PKR {(parseFloat(item.price) * item.quantity).toLocaleString()}</span>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            <div className="flex justify-end pt-4" />
                            <div className="flex justify-end">
                                <div className="w-[320px] space-y-2">
                                     <div className="flex justify-between text-[13px]"><span>Items:</span><span>PKR {cartTotal.toLocaleString()}</span></div>
                                     <div className="flex justify-between text-[13px]"><span>Shipping:</span><span>PKR {shipping.toLocaleString()}</span></div>
                                     <div className="flex justify-between text-[18px] font-bold text-[#B12704] pt-3 border-t border-[#ddd]">
                                        <span>Order Total:</span>
                                        <span>PKR {total.toLocaleString()}</span>
                                     </div>
                                </div>
                            </div>
                        </div>

                        {/* Modal Footer */}
                        <div className="bg-[#f7f8fa] border-t border-[#ddd] p-6 flex justify-between items-center">
                            <button onClick={() => setShowReview(false)} className="text-[13px] text-[#007185] hover:text-[#c45500] hover:underline font-bold">Edit Details</button>
                            <button
                                onClick={processOrder}
                                disabled={isProcessing}
                                className="px-12 h-[38px] bg-gradient-to-b from-[#f7dfa5] to-[#f0c14b] border border-[#a88734] hover:from-[#f5d78e] hover:to-[#eeb933] rounded-[3px] text-[14px] font-bold text-[#111] shadow-sm disabled:opacity-50 active:scale-[0.98] transition-all"
                            >
                                {isProcessing ? 'Placing Order...' : 'Place your order'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
