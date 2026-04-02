'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
    CheckCircle, CreditCard, Truck, ShieldCheck, Lock,
    Smartphone, Banknote, ShoppingCart, Star, Copy, RefreshCw, ChevronRight, Package, Check, Info, UserPlus, MapPin, Search
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
        <div className="min-h-screen bg-slate-50 font-sans">
            {/* Minimal Header */}
            <div className="bg-white border-b py-4 px-4 sticky top-0 z-50">
                <div className="max-w-[1240px] mx-auto flex items-center justify-between">
                    <Link href="/" className="flex items-center gap-2 group">
                        <div className="w-8 h-8 bg-[#F7CA00] rounded-lg flex items-center justify-center">
                            <span className="text-lg font-black text-white">A</span>
                        </div>
                        <span className="text-xl font-black text-slate-900">Checkout <span className="text-[#007185] font-medium text-lg ml-1">({cartCount} items)</span></span>
                    </Link>
                    <div className="hidden sm:flex items-center gap-1 text-slate-400">
                        <Lock className="h-4 w-4" />
                        <span className="text-xs font-bold uppercase tracking-widest">Secure Checkout</span>
                    </div>
                </div>
            </div>

            <div className="max-w-[1150px] mx-auto px-4 py-8 flex flex-col lg:flex-row gap-8">
                
                {/* Left Column: Progress & Forms */}
                <div className="flex-1 space-y-4">
                    
                    {/* Step 1: Shipping Address */}
                    <Section 
                        number={1} 
                        title="Shipping Address" 
                        isEditing={step === 1}
                        summary={`${shippingInfo.firstName} ${shippingInfo.lastName}, ${shippingInfo.address}, ${shippingInfo.city}`}
                        onEdit={() => setStep(1)}
                    >
                        <form onSubmit={(e) => { e.preventDefault(); setStep(2); }} className="grid grid-cols-2 gap-4 mt-4">
                            <div className="col-span-2 sm:col-span-1">
                                <label className="block text-sm font-bold mb-1.5 ml-1">First Name</label>
                                <input 
                                    required 
                                    className="w-full h-10 px-4 rounded-lg border border-gray-300 focus:border-[#F7CA00] focus:ring-4 focus:ring-blue-100 outline-none transition-all text-sm" 
                                    value={shippingInfo.firstName}
                                    onChange={(e) => setShippingInfo({...shippingInfo, firstName: e.target.value})}
                                />
                            </div>
                            <div className="col-span-2 sm:col-span-1">
                                <label className="block text-sm font-bold mb-1.5 ml-1">Last Name</label>
                                <input 
                                    required 
                                    className="w-full h-10 px-4 rounded-lg border border-gray-300 focus:border-[#F7CA00] focus:ring-4 focus:ring-blue-100 outline-none transition-all text-sm"
                                    value={shippingInfo.lastName}
                                    onChange={(e) => setShippingInfo({...shippingInfo, lastName: e.target.value})}
                                />
                            </div>
                            <div className="col-span-2">
                                <label className="block text-sm font-bold mb-1.5 ml-1">Address</label>
                                <input 
                                    required 
                                    className="w-full h-10 px-4 rounded-lg border border-gray-300 focus:border-[#F7CA00] focus:ring-4 focus:ring-blue-100 outline-none transition-all text-sm"
                                    value={shippingInfo.address}
                                    onChange={(e) => setShippingInfo({...shippingInfo, address: e.target.value})}
                                />
                            </div>
                            <div className="col-span-2 sm:col-span-1">
                                <label className="block text-sm font-bold mb-1.5 ml-1">City</label>
                                <input 
                                    required 
                                    className="w-full h-10 px-4 rounded-lg border border-gray-300 focus:border-[#F7CA00] focus:ring-4 focus:ring-blue-100 outline-none transition-all text-sm"
                                    value={shippingInfo.city}
                                    onChange={(e) => setShippingInfo({...shippingInfo, city: e.target.value})}
                                />
                            </div>
                            <div className="col-span-2 sm:col-span-1">
                                <label className="block text-sm font-bold mb-1.5 ml-1">Phone</label>
                                <input 
                                    required 
                                    className="w-full h-10 px-4 rounded-lg border border-gray-300 focus:border-[#F7CA00] focus:ring-4 focus:ring-blue-100 outline-none transition-all text-sm"
                                    value={shippingInfo.phone}
                                    onChange={(e) => setShippingInfo({...shippingInfo, phone: e.target.value})}
                                />
                            </div>
                            <button className="col-span-2 mt-4 py-2 bg-[#FFD814] hover:bg-[#F7CA00] border border-[#F0C14B] rounded-lg text-sm font-bold shadow-sm transition-all">
                                Use this address
                            </button>
                        </form>
                    </Section>

                    {/* Step 2: Payment Method */}
                    <Section 
                        number={2} 
                        title="Payment Method" 
                        isEditing={step === 2}
                        summary={payMethod.toUpperCase()}
                        onEdit={() => setStep(2)}
                        isDisabled={step < 2}
                    >
                        <div className="space-y-4 mt-4">
                            {[
                                { id: 'card', name: 'Credit or Debit Card', icon: CreditCard },
                                { id: 'cod', name: 'Cash on Delivery (COD)', icon: Banknote },
                                { id: 'easypaisa', name: 'Easypaisa / Mobile Wallet', icon: Smartphone }
                            ].map(m => (
                                <label key={m.id} className={`flex items-start gap-4 p-4 rounded-xl border-2 cursor-pointer transition-all ${payMethod === m.id ? 'border-[#F7CA00] bg-blue-50' : 'border-transparent bg-gray-50 hover:bg-gray-100'}`}>
                                    <input type="radio" value={m.id} checked={payMethod === m.id} onChange={() => setPayMethod(m.id as any)} className="mt-1 w-4 h-4 text-[#F7CA00] focus:ring-[#F7CA00]" />
                                    <div className="flex-1">
                                        <div className="flex items-center gap-2 mb-1">
                                            <m.icon className={`h-4 w-4 ${payMethod === m.id ? 'text-[#F7CA00]' : 'text-slate-400'}`} />
                                            <span className="text-sm font-bold text-slate-900">{m.name}</span>
                                        </div>
                                        <p className="text-xs text-slate-500 leading-relaxed">Secure payment processing through our certified gateway providers.</p>
                                    </div>
                                </label>
                            ))}
                            <button onClick={() => setStep(3)} className="w-full mt-4 py-2 bg-[#FFD814] hover:bg-[#F7CA00] border border-[#F0C14B] rounded-lg text-sm font-bold shadow-sm transition-all">
                                Use this payment method
                            </button>
                        </div>
                    </Section>

                    {/* Step 3: Review Items */}
                    <Section 
                        number={3} 
                        title="Review items and shipping" 
                        isEditing={step === 3}
                        onEdit={() => setStep(3)}
                        isDisabled={step < 3}
                    >
                        <div className="mt-4 border rounded-xl overflow-hidden bg-white">
                            <div className="p-4 bg-emerald-50 border-b border-emerald-100 flex items-center gap-2">
                                <Truck className="h-5 w-5 text-emerald-600" />
                                <span className="text-sm font-bold text-emerald-700">Estimated delivery: Tomorrow, before 8:00 PM</span>
                            </div>
                            <div className="divide-y">
                                {items.map((item: any) => (
                                    <div key={item.id} className="p-4 flex gap-4">
                                        <div className="w-16 h-16 rounded bg-gray-50 flex items-center justify-center p-1 border">
                                            <img src={getImageUrl(item.image)} className="w-full h-full object-contain" />
                                        </div>
                                        <div className="flex-1">
                                            <h4 className="text-sm font-bold text-slate-900 line-clamp-1">{item.name}</h4>
                                            <p className="text-xs text-slate-500 mt-1">Quantity: {item.quantity}</p>
                                            <p className="text-sm font-bold text-[#b12704] mt-1">PKR {parseFloat(item.price).toLocaleString()}</p>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </Section>

                </div>

                {/* Right Column: Order Summary Card */}
                <div className="w-full lg:w-[350px] space-y-4">
                    <div className="bg-white border rounded-xl p-6 sticky top-24 shadow-sm">
                        <button 
                            disabled={step < 3 || isProcessing}
                            onClick={processOrder}
                            className={`w-full py-2.5 rounded-lg text-sm font-bold transition-all shadow-sm mb-4
                                ${step === 3 && !isProcessing 
                                    ? 'bg-[#FFD814] hover:bg-[#F7CA00] border border-[#F0C14B] text-slate-900' 
                                    : 'bg-gray-100 text-gray-400 cursor-not-allowed border-gray-200'}
                            `}
                        >
                            {isProcessing ? 'Processing...' : 'Place your order'}
                        </button>
                        <p className="text-[10px] text-center text-gray-500 mb-6 leading-relaxed">
                            By placing your order, you agree to our <span className="text-[#007185] hover:underline cursor-pointer">privacy notice</span> and <span className="text-[#007185] hover:underline cursor-pointer">conditions of use</span>.
                        </p>

                        <div className="border-t pt-4 space-y-2">
                            <h3 className="text-lg font-bold text-slate-900 mb-4">Order Summary</h3>
                            <div className="flex items-center justify-between text-xs text-slate-600">
                                <span>Items:</span>
                                <span>PKR {cartTotal.toLocaleString()}</span>
                            </div>
                            <div className="flex items-center justify-between text-xs text-slate-600">
                                <span>Shipping:</span>
                                <span>{shipping === 0 ? 'FREE' : `PKR ${shipping}`}</span>
                            </div>
                            <div className="flex items-center justify-between text-lg font-bold text-[#b12704] pt-4 border-t mt-4">
                                <span>Order Total:</span>
                                <span>PKR {total.toLocaleString()}</span>
                            </div>
                        </div>
                    </div>

                    <div className="bg-white border rounded-xl p-4 flex gap-4">
                        <ShieldCheck className="h-6 w-6 text-slate-400 shrink-0" />
                        <div>
                            <h4 className="text-xs font-bold text-slate-900">Secure Payments</h4>
                            <p className="text-[10px] text-slate-500 mt-1 leading-relaxed">Your data is always encrypted and protected through our banking partners.</p>
                        </div>
                    </div>
                </div>

            </div>
        </div>
    );
}

function Section({ children, number, title, isEditing, summary, onEdit, isDisabled }: any) {
    if (isDisabled) return (
        <div className="bg-white border border-gray-100 p-6 flex items-center gap-6 opacity-40 grayscale pointer-events-none">
            <span className="text-xl font-black text-slate-300">{number}</span>
            <h3 className="text-xl font-bold text-slate-300">{title}</h3>
        </div>
    );

    return (
        <div className={`bg-white border rounded-xl p-6 transition-all ${isEditing ? 'ring-2 ring-[#F7CA00] shadow-lg' : 'shadow-sm'}`}>
            <div className="flex items-start justify-between">
                <div className="flex items-center gap-6">
                    <span className={`text-xl font-black ${isEditing ? 'text-[#F7CA00]' : 'text-slate-400'}`}>{number}</span>
                    <div>
                        <h3 className="text-xl font-bold text-slate-900">{title}</h3>
                        {!isEditing && summary && <p className="text-sm text-slate-600 mt-1 line-clamp-1">{summary}</p>}
                    </div>
                </div>
                {!isEditing && (
                    <button onClick={onEdit} className="text-sm font-bold text-[#007185] hover:text-[#F7CA00] hover:underline uppercase tracking-tight">Change</button>
                )}
            </div>
            {isEditing && children}
        </div>
    );
}
