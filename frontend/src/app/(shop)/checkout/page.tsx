'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
    CheckCircle, CreditCard, Truck, ShieldCheck, Lock,
    Smartphone, Banknote, ShoppingCart, Star, Copy, RefreshCw, ChevronRight, Package, Check, Info, UserPlus, MapPin, Search, Plus
} from 'lucide-react';
import { useCart } from '@/context/CartContext';
import { getImageUrl } from '@/lib/utils';
import { orderService, settingsService } from '@/lib/api';
import Navbar from '@/components/layout/Navbar';

export default function CheckoutPage() {
    const { items, cartTotal, clearCart, cartCount } = useCart();
    const router = useRouter();
    const [step, setStep] = useState(1);
    const [payMethod, setPayMethod] = useState<'card' | 'cod' | 'easypaisa'>('card');
    const [shippingInfo, setShippingInfo] = useState<any>({
        firstName: '',
        lastName: '',
        email: '',
        phone: '',
        address: '',
        city: '',
        province: ''
    });
    const [isProcessing, setIsProcessing] = useState(false);
    const [placedOrderNumber, setPlacedOrderNumber] = useState<string | null>(null);
    const [copied, setCopied] = useState(false);

    const isLoggedIn = typeof window !== 'undefined' ? !!localStorage.getItem('accessToken') : false;

    useEffect(() => {
        if (isLoggedIn) {
            settingsService.getProfile().then(profile => {
                if (profile) {
                    setShippingInfo({
                        firstName: profile.first_name || '',
                        lastName: profile.last_name || '',
                        email: profile.email || '',
                        phone: profile.phone || profile.phone_number || '',
                        address: profile.address || '',
                        city: profile.city || '',
                        province: profile.province || ''
                    });
                }
            }).catch(err => console.error("Error fetching profile", err));
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

    const processOrder = async () => {
        setIsProcessing(true);
        const trackingId = `ORD-${Date.now().toString().slice(-6)}`;
        try {
            const payload = {
                order_number: trackingId,
                total_amount: total,
                status: 'ordered',
                payment_status: payMethod === 'cod' ? 'pending' : 'completed',
                payment_method: payMethod === 'cod' ? 'Cash on Delivery' : payMethod === 'easypaisa' ? 'Mobile Wallet' : 'Credit Card',
                guest_name: `${shippingInfo.firstName || ''} ${shippingInfo.lastName || ''}`.trim(),
                notes: `Address: ${shippingInfo.address}, ${shippingInfo.city}, ${shippingInfo.province}. Contact: ${shippingInfo.phone} (${shippingInfo.email})`,
                items: items.map((i: any) => ({
                    product_id: i.id,
                    quantity: i.quantity,
                    price: parseFloat(String(i.price))
                }))
            };
            await orderService.create(payload);
            setPlacedOrderNumber(trackingId);
            clearCart();
        } catch (err: any) {
            console.error(err);
            alert("Error: Failed to process order.");
        } finally {
            setIsProcessing(false);
        }
    };

    if (placedOrderNumber) {
        return (
            <div className="min-h-screen bg-white flex flex-col items-center justify-center p-8 text-center animate-in zoom-in-95">
                <div className="w-20 h-20 bg-emerald-50 rounded-full flex items-center justify-center mb-6">
                    <CheckCircle className="h-12 w-12 text-emerald-500" />
                </div>
                <h1 className="text-3xl font-bold text-slate-900 mb-2">Order Placed, thank you!</h1>
                <p className="text-slate-500 mb-8 max-w-md">Confirmation will be sent to your email. Your order tracking ID is shown below.</p>

                <div className="bg-gray-50 border border-gray-200 rounded-2xl p-6 mb-8 w-full max-w-sm flex items-center justify-between shadow-sm">
                    <div className="text-left">
                        <p className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] mb-1">Tracking ID</p>
                        <p className="text-xl font-black text-slate-900 tracking-tighter">{placedOrderNumber}</p>
                    </div>
                    <button
                        onClick={handleCopy}
                        className="p-3 bg-white border border-gray-200 rounded-xl hover:border-[#F7CA00] hover:text-[#F7CA00] transition-all flex items-center justify-center gap-2 group"
                    >
                        {copied ? (
                            <span className="text-[10px] font-bold text-emerald-500 flex items-center gap-1"><Check className="h-4 w-4" /> Copied</span>
                        ) : (
                            <Copy className="h-4 w-4 text-gray-400" />
                        )}
                    </button>
                </div>

                <div className="flex flex-col sm:flex-row gap-4 w-full max-w-md">
                    <Link href={`/dashboard/track?order=${placedOrderNumber}`} className="flex-1 py-3 bg-[#F7CA00] text-white font-bold rounded-xl hover:bg-[#1E40AF] transition-all shadow-lg shadow-blue-500/20 text-center">
                        Track Order
                    </Link>
                    <Link href="/shop" className="flex-1 py-3 bg-white border border-gray-200 text-slate-700 font-bold rounded-xl hover:bg-gray-50 transition-all text-center">
                        Back to Shopping
                    </Link>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-white">
            {/* Minimal Header */}
            <div className="bg-[#fcfcfc] border-b border-slate-200 py-3 px-4 sticky top-0 z-50">
                <div className="max-w-[1150px] mx-auto flex items-center justify-between">
                    <Link href="/" className="flex items-center gap-2 group">
                        <div className="w-8 h-8 bg-white border border-slate-200 rounded flex items-center justify-center shadow-sm">
                            <span className="text-xl font-black text-[#1d252c]">A</span>
                        </div>
                        <span className="text-2xl font-medium text-[#1d252c]">Checkout</span>
                    </Link>
                    <div className="flex items-center gap-1 text-slate-500">
                        <Lock className="h-4 w-4" />
                        <span className="text-[18px] font-medium">Secure Checkout</span>
                    </div>
                </div>
            </div>

            <main className="max-w-[1150px] mx-auto px-4 py-8">
                <div className="flex flex-col lg:flex-row gap-8 items-start">
                    
                    {/* Left Column */}
                    <div className="flex-1 space-y-4">
                        
                        {/* Step 1: Shipping Address */}
                        <CheckoutSection 
                            step={1} 
                            title="Shipping address" 
                            isOpen={step === 1}
                            onEdit={() => setStep(1)}
                            summary={step > 1 ? `${shippingInfo.firstName} ${shippingInfo.lastName}\n${shippingInfo.address}, ${shippingInfo.city}` : null}
                        >
                            <form onSubmit={(e) => { e.preventDefault(); setStep(2); }} className="space-y-4 pt-4 max-w-lg">
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="space-y-1">
                                        <label className="text-[13px] font-bold">First name</label>
                                        <input required className="w-full border border-slate-400 rounded-sm px-2 py-1 outline-none focus:ring-2 focus:ring-[#007185]/20 focus:border-[#007185] h-8 text-[13px]" value={shippingInfo.firstName} onChange={e => setShippingInfo({...shippingInfo, firstName: e.target.value})} />
                                    </div>
                                    <div className="space-y-1">
                                        <label className="text-[13px] font-bold">Last name</label>
                                        <input required className="w-full border border-slate-400 rounded-sm px-2 py-1 outline-none focus:ring-2 focus:ring-[#007185]/20 focus:border-[#007185] h-8 text-[13px]" value={shippingInfo.lastName} onChange={e => setShippingInfo({...shippingInfo, lastName: e.target.value})} />
                                    </div>
                                </div>
                                <div className="space-y-1">
                                    <label className="text-[13px] font-bold">Address</label>
                                    <input required className="w-full border border-slate-400 rounded-sm px-2 py-1 outline-none focus:ring-2 focus:ring-[#007185]/20 focus:border-[#007185] h-8 text-[13px]" value={shippingInfo.address} onChange={e => setShippingInfo({...shippingInfo, address: e.target.value})} />
                                </div>
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="space-y-1">
                                        <label className="text-[13px] font-bold">City</label>
                                        <input required className="w-full border border-slate-400 rounded-sm px-2 py-1 outline-none focus:ring-2 focus:ring-[#007185]/20 focus:border-[#007185] h-8 text-[13px]" value={shippingInfo.city} onChange={e => setShippingInfo({...shippingInfo, city: e.target.value})} />
                                    </div>
                                    <div className="space-y-1">
                                        <label className="text-[13px] font-bold">Phone number</label>
                                        <input required className="w-full border border-slate-400 rounded-sm px-2 py-1 outline-none focus:ring-2 focus:ring-[#007185]/20 focus:border-[#007185] h-8 text-[13px]" value={shippingInfo.phone} onChange={e => setShippingInfo({...shippingInfo, phone: e.target.value})} />
                                    </div>
                                </div>
                                <button type="submit" className="bg-[#FFD814] hover:bg-[#F7CA00] border border-[#FCD200] rounded-lg px-6 py-1.5 text-[13px] font-bold shadow-sm transition-colors text-black">
                                    Use this address
                                </button>
                            </form>
                        </CheckoutSection>

                        {/* Step 2: Payment Method */}
                        <CheckoutSection 
                            step={2} 
                            title="Payment method" 
                            isOpen={step === 2}
                            onEdit={() => setStep(2)}
                            summary={step > 2 ? (payMethod === 'card' ? 'Visa ending in 4242' : payMethod === 'cod' ? 'Cash on Delivery' : 'Mobile Wallet') : null}
                            isInteractive={step >= 2}
                        >
                            <div className="space-y-6 pt-6">
                                <div className="border border-slate-300 rounded-lg p-6 bg-[#fcfcfc]">
                                    <h4 className="font-bold text-[15px] mb-4">Your credit and debit cards</h4>
                                    <div className="flex items-start gap-4 p-4 bg-white border border-slate-200 rounded-md">
                                        <input type="radio" checked={payMethod === 'card'} onChange={() => setPayMethod('card')} className="mt-1" />
                                        <div className="flex-1 text-[13px]">
                                            <p className="font-bold uppercase tracking-tight">Visa ending in 4242</p>
                                            <p className="text-slate-500">ZULQARNAIN ALI | 09/2026</p>
                                        </div>
                                        <CreditCard className="h-6 w-6 text-slate-400" />
                                    </div>
                                    <div className="mt-4 flex items-center gap-2 cursor-pointer text-[#007185] hover:text-[#C7511F] hover:underline text-[13px]">
                                        <Plus className="h-4 w-4" /> Add a credit or debit card
                                    </div>
                                </div>

                                <div className="border border-slate-300 rounded-lg p-6 bg-[#fcfcfc]">
                                    <h4 className="font-bold text-[15px] mb-4">Other payment methods</h4>
                                    <div className="space-y-3">
                                        <label className="flex items-start gap-4 p-4 bg-white border border-slate-200 rounded-md cursor-pointer">
                                            <input type="radio" checked={payMethod === 'cod'} onChange={() => setPayMethod('cod')} className="mt-1" />
                                            <div className="flex-1 text-[13px]">
                                                <p className="font-bold">Cash on Delivery (COD)</p>
                                                <p className="text-slate-500">Pay when your items are delivered.</p>
                                            </div>
                                        </label>
                                        <label className="flex items-start gap-4 p-4 bg-white border border-slate-200 rounded-md cursor-pointer">
                                            <input type="radio" checked={payMethod === 'easypaisa'} onChange={() => setPayMethod('easypaisa')} className="mt-1" />
                                            <div className="flex-1 text-[13px]">
                                                <p className="font-bold">Easypaisa / Mobile Wallet</p>
                                                <p className="text-slate-500">Fast and secure mobile payment.</p>
                                            </div>
                                        </label>
                                    </div>
                                </div>

                                <button onClick={() => setStep(3)} className="bg-[#FFD814] hover:bg-[#F7CA00] border border-[#FCD200] rounded-lg px-6 py-1.5 text-[13px] font-bold shadow-sm transition-colors text-black">
                                    Use this payment method
                                </button>
                            </div>
                        </CheckoutSection>

                        {/* Step 3: Review items */}
                        <CheckoutSection 
                            step={3} 
                            title="Review items and shipping" 
                            isOpen={step === 3}
                            onEdit={() => setStep(3)}
                            isInteractive={step >= 3}
                        >
                            <div className="pt-6 space-y-6">
                                <div className="border border-slate-300 rounded-lg overflow-hidden">
                                    <div className="bg-[#fcfcfc] border-b p-4 text-[13px]">
                                        <span className="text-emerald-700 font-bold">Arriving Tomorrow</span>
                                        <span className="text-slate-500 ml-2">if you order within 4 hrs 22 mins</span>
                                    </div>
                                    <div className="p-4 space-y-4">
                                        {items.map(item => (
                                            <div key={item.id} className="flex gap-4">
                                                <div className="w-16 h-16 flex-shrink-0">
                                                    <img src={getImageUrl(item.image) || undefined} className="w-full h-full object-contain" />
                                                </div>
                                                <div className="flex-1 text-[13px]">
                                                    <p className="font-bold leading-tight">{item.name}</p>
                                                    <p className="text-[#b12704] font-bold">Rs.{(parseFloat(String(item.price)) * item.quantity).toLocaleString()}</p>
                                                    <p className="text-slate-500 mt-1">Quantity: {item.quantity}</p>
                                                    <div className="text-[#007185] hover:text-[#C7511F] hover:underline cursor-pointer mt-1">Sold by Al-Qavi Store</div>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                                
                                <div className="border border-slate-300 rounded-lg p-6 bg-[#fcfcfc] flex items-center justify-between">
                                    <div>
                                        <button 
                                            onClick={processOrder}
                                            disabled={isProcessing}
                                            className="bg-[#FFD814] hover:bg-[#F7CA00] border border-[#FCD200] rounded-lg px-8 py-2 text-[14px] font-bold shadow-sm transition-colors text-black"
                                        >
                                            {isProcessing ? 'Processing Order...' : 'Place your order'}
                                        </button>
                                        <div className="mt-2 text-[12px] text-slate-500">By placing your order, you agree to Al-Qavi's <span className="text-[#007185] hover:underline cursor-pointer">privacy notice</span>.</div>
                                    </div>
                                    <div className="text-right">
                                        <p className="text-[15px] font-bold text-[#b12704]">Order Total: Rs.{total.toLocaleString()}</p>
                                    </div>
                                </div>
                            </div>
                        </CheckoutSection>
                    </div>

                    {/* Right Column: Sidebar */}
                    <div className="w-full lg:w-[300px] space-y-4">
                        <div className="border border-slate-300 rounded-lg p-6 space-y-4">
                            <button 
                                onClick={processOrder}
                                disabled={step < 3 || isProcessing}
                                className={`w-full py-2 rounded-lg text-[13px] font-bold shadow-sm transition-colors text-black
                                    ${step === 3 && !isProcessing ? 'bg-[#FFD814] hover:bg-[#F7CA00] border border-[#FCD200]' : 'bg-slate-100 border border-slate-200 text-slate-400 cursor-not-allowed'}
                                `}
                            >
                                {isProcessing ? 'Processing Order...' : 'Place your order'}
                            </button>
                            <div className="text-[11px] text-center text-slate-500 leading-tight">
                                By placing your order, you agree to Al-Qavi's <span className="text-[#007185] hover:underline cursor-pointer">conditions of use</span> and <span className="text-[#007185] hover:underline cursor-pointer">privacy notice</span>.
                            </div>
                            
                            <div className="border-t border-slate-200 pt-3">
                                <h3 className="font-bold text-[14px]">Order Summary</h3>
                                <div className="mt-2 space-y-1 text-[12px] text-slate-600">
                                    <div className="flex justify-between">
                                        <span>Items:</span>
                                        <span>Rs.{cartTotal.toLocaleString()}</span>
                                    </div>
                                    <div className="flex justify-between">
                                        <span>Shipping & handling:</span>
                                        <span>{shipping === 0 ? 'Rs.0.00' : `Rs.${shipping.toLocaleString()}`}</span>
                                    </div>
                                    <div className="flex justify-between border-t border-slate-200 pt-2 mt-2">
                                        <span className="text-lg font-bold text-[#b12704]">Order Total:</span>
                                        <span className="text-lg font-bold text-[#b12704]">Rs.{total.toLocaleString()}</span>
                                    </div>
                                </div>
                            </div>

                            <div className="bg-[#f0f2f2] border-t border-slate-300 -mx-6 -mb-6 p-4 rounded-b-lg">
                                <Link href="#" className="text-[12px] text-[#007185] hover:text-[#C7511F] hover:underline">How are shipping costs calculated?</Link>
                            </div>
                        </div>

                        <div className="flex gap-4 p-4 border border-slate-200 rounded-lg">
                            <ShieldCheck className="h-6 w-6 text-slate-400 shrink-0" />
                            <div className="text-[11px] text-slate-500 leading-tight">
                                <span className="font-bold text-slate-700">A-to-z Guarantee Protected.</span> We never share your personal information with anyone.
                            </div>
                        </div>
                    </div>

                </div>
            </main>
        </div>
    );
}

function CheckoutSection({ step, title, isOpen, onEdit, summary, children, isInteractive = true }: any) {
    return (
        <div className={`border-b border-slate-200 pb-4 ${isInteractive ? 'opacity-100' : 'opacity-40 pointer-events-none'}`}>
            <div className="flex items-start justify-between">
                <div className="flex gap-6">
                    <span className="text-lg font-bold text-slate-800">{step}</span>
                    <div className="flex-1">
                        <h3 className={`text-lg font-bold ${isOpen ? 'text-[#1d252c]' : 'text-slate-800'}`}>{title}</h3>
                        {!isOpen && summary && <div className="text-[13px] text-slate-600 mt-1 whitespace-pre-wrap">{summary}</div>}
                    </div>
                </div>
                {!isOpen && isInteractive && (
                    <button onClick={onEdit} className="text-[13px] text-[#007185] hover:text-[#C7511F] hover:underline">Change</button>
                )}
            </div>
            {isOpen && children}
        </div>
    );
}

