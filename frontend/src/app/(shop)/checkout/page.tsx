'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
    CheckCircle, CreditCard, Truck, ShieldCheck, Lock,
    Smartphone, Banknote, ShoppingCart, Star, Copy, RefreshCw, ChevronRight, Package, Check, Info
} from 'lucide-react';
import { useCart } from '@/context/CartContext';
import { getImageUrl } from '@/lib/utils';
import { orderService } from '@/lib/api';

const STEPS = [
    { id: 1, name: 'Shipping' },
    { id: 2, name: 'Payment' },
    { id: 3, name: 'Review' }
];

export default function CheckoutPage() {
    const { items, cartTotal, clearCart, cartCount } = useCart();
    const router = useRouter();
    const [step, setStep] = useState(1);
    const [payMethod, setPayMethod] = useState<'card' | 'cod' | 'easypaisa'>('card');
    const [shippingInfo, setShippingInfo] = useState<any>({});
    const [isProcessing, setIsProcessing] = useState(false);
    const [placedOrderNumber, setPlacedOrderNumber] = useState<string | null>(null);
    const [copied, setCopied] = useState(false);
    
    // Payment specific states
    const [walletNum, setWalletNum] = useState('');

    const shipping = cartTotal > 5000 ? 0 : 350;
    const total = cartTotal + shipping;

    const handleNext = (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        const fd = new FormData(e.currentTarget);
        setShippingInfo(Object.fromEntries(fd.entries()));
        setStep(2);
    };

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
                <CheckCircle className="h-16 w-16 text-emerald-500 mb-6" />
                <h1 className="text-2xl font-bold mb-2">Thank you, your order has been placed.</h1>
                
                <div className="bg-gray-50 border border-gray-200 rounded-xl p-6 mt-4 mb-8 w-full max-w-sm flex items-center justify-between">
                    <div className="text-left">
                         <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1">Order Tracking ID</p>
                         <p className="text-lg font-bold text-gray-900">{placedOrderNumber}</p>
                    </div>
                    <button 
                        onClick={handleCopy}
                        className="p-3 bg-white border border-gray-200 rounded-lg hover:border-[#FF9900] hover:text-[#FF9900] transition-all active:scale-90 flex items-center justify-center gap-2 group"
                    >
                        {copied ? (
                            <span className="text-[10px] items-center flex gap-1 font-bold text-emerald-500"><Check className="h-4 w-4" /> COPIED</span>
                        ) : (
                            <Copy className="h-4 w-4 text-gray-400 group-hover:text-[#FF9900]" />
                        )}
                    </button>
                </div>

                <Link href="/shop" className="bg-[#FFD814] border border-[#F0C14B] text-[#111] px-10 py-2 rounded-lg font-medium text-sm shadow-sm hover:bg-[#F7CA00] transition-all active:bg-[#F0C14B]">
                    Back to Shop
                </Link>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-white text-[#111] font-sans pb-20 selection:bg-[#FFE099]">
            {/* Amazon Header */}
            <header className="bg-white border-b border-gray-100 py-3 shadow-sm sticky top-0 z-50">
                <div className="container mx-auto px-4 max-w-5xl flex items-center justify-between">
                    <Link href="/" className="flex items-center gap-2">
                        <Star className="h-6 w-6 text-[#FF9900] fill-[#FF9900]" />
                        <span className="font-bold text-lg tracking-tight uppercase">Qavi Secure</span>
                    </Link>
                    <div className="hidden sm:flex items-center gap-2 text-gray-400 font-bold uppercase text-[10px] tracking-widest">
                        <Lock className="h-4 w-4" /> Secure Gateway
                    </div>
                </div>
            </header>

            {/* TOP STEP TRACKER */}
            <div className="bg-gray-50 border-b border-gray-200 py-4">
                <div className="container mx-auto px-4 max-w-xl flex items-center justify-between relative">
                    <div className="absolute top-1/2 left-0 right-0 h-0.5 bg-gray-200 -translate-y-1/2 mx-10" />
                    <div className="absolute top-1/2 left-0 h-0.5 bg-[#FF9900] -translate-y-1/2 mx-10 transition-all duration-500" style={{ width: `${(step - 1) * 50}%` }} />
                    {STEPS.map((s, i) => {
                        const active = step === s.id;
                        const done = step > s.id;
                        return (
                            <div key={s.id} className="relative z-10 flex flex-col items-center gap-1.5">
                                <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center font-bold text-[10px] transition-colors duration-500 ${done ? 'bg-[#FF9900] border-[#FF9900] text-white shadow-md' : active ? 'bg-white border-[#FF9900] text-[#FF9900] shadow-sm' : 'bg-white border-gray-300 text-gray-400'}`}>
                                    {done ? <CheckCircle className="h-3 w-3" /> : s.id}
                                </div>
                                <span className={`text-[9px] font-bold uppercase tracking-widest ${active ? 'text-[#FF9900]' : 'text-gray-400'}`}>{s.name}</span>
                            </div>
                        );
                    })}
                </div>
            </div>

            <main className="container mx-auto px-4 max-w-5xl mt-10">
                <div className="flex flex-col lg:flex-row gap-10 items-start">
                    <div className="flex-1 w-full space-y-4">
                        
                        {/* 1. SHIPPING DETAILS */}
                        <div className="border-b border-gray-200 pb-6">
                            <div className="flex gap-4">
                                <span className="text-xl font-bold min-w-[20px] text-gray-300">1</span>
                                <div className="flex-1">
                                    <h2 className={`text-lg font-bold mb-4 ${step === 1 ? 'text-[#C45500]' : 'text-black'}`}>Shipping details</h2>
                                    {step === 1 ? (
                                        <form onSubmit={handleNext} className="grid grid-cols-2 gap-x-4 gap-y-4 max-w-lg">
                                            <AmaField label="First name" name="firstName" required />
                                            <AmaField label="Last name" name="lastName" required />
                                            <AmaField label="Street address" name="address" required colSpan />
                                            <AmaField label="City" name="city" required />
                                            <AmaField label="Province" name="province" required />
                                            <AmaField label="Phone number" name="phone" required colSpan placeholder="03XXXXXXXXX" />
                                            <div className="col-span-2 pt-2">
                                                <button type="submit" className="px-8 py-2 bg-[#FFD814] border border-[#F0C14B] text-xs rounded-lg hover:bg-[#F7CA00] shadow-sm font-bold uppercase tracking-wide">Continue</button>
                                            </div>
                                        </form>
                                    ) : (
                                        <div className="flex justify-between items-start text-sm">
                                            <div>
                                                <p className="font-bold">{shippingInfo.firstName} {shippingInfo.lastName}</p>
                                                <p>{shippingInfo.address}, {shippingInfo.city}</p>
                                                <p>{shippingInfo.phone}</p>
                                            </div>
                                            <button onClick={() => setStep(1)} className="text-[#007185] hover:underline text-xs font-bold uppercase">Change</button>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>

                        {/* 2. PAYMENT METHOD - DYNAMIC FEEDBACK */}
                        <div className={`border-b border-gray-200 py-6 ${step < 2 ? 'opacity-40 pointer-events-none' : ''}`}>
                             <div className="flex gap-4">
                                <span className="text-xl font-bold min-w-[20px] text-gray-300">2</span>
                                <div className="flex-1">
                                    <h2 className={`text-lg font-bold mb-4 ${step === 2 ? 'text-[#C45500]' : 'text-black'}`}>Payment method</h2>
                                    {step === 2 ? (
                                        <div className="space-y-6 max-w-lg animate-in fade-in slide-in-from-top-2 duration-300">
                                            <div className="space-y-3">
                                                <AmaPayRadio active={payMethod === 'card'} onClick={() => setPayMethod('card')} label="Credit or Debit Card" />
                                                <AmaPayRadio active={payMethod === 'easypaisa'} onClick={() => setPayMethod('easypaisa')} label="Mobile Wallet (E/J)" />
                                                <AmaPayRadio active={payMethod === 'cod'} onClick={() => setPayMethod('cod')} label="Cash on Delivery" />
                                            </div>

                                            {/* Sub-Forms */}
                                            {payMethod === 'card' && (
                                                <div className="p-4 bg-gray-50 border border-gray-200 rounded-xl space-y-4 animate-in slide-in-from-top-4 duration-300">
                                                     <AmaField label="Card Number" name="card_num" placeholder="XXXX XXXX XXXX XXXX" />
                                                     <div className="grid grid-cols-2 gap-4">
                                                         <AmaField label="Expiry (MM/YY)" name="exp" placeholder="MM/YY" />
                                                         <AmaField label="CVV" name="cvv" placeholder="123" />
                                                     </div>
                                                </div>
                                            )}

                                            {payMethod === 'easypaisa' && (
                                                <div className="p-4 bg-gray-50 border border-gray-200 rounded-xl space-y-4 animate-in slide-in-from-top-4 duration-300">
                                                     <div className="flex items-center gap-2 mb-2">
                                                         <Smartphone className="h-4 w-4 text-[#FF9900]" />
                                                         <p className="text-[10px] font-black uppercase text-gray-400 tracking-[0.2em]">Wallet Details</p>
                                                     </div>
                                                     <div>
                                                        <label className="text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-1.5 block">Mobile Number</label>
                                                        <input 
                                                            name="wallet_num" 
                                                            placeholder="03XXXXXXXXX" 
                                                            value={walletNum}
                                                            onChange={(e) => setWalletNum(e.target.value)}
                                                            className="w-full border border-gray-300 rounded-lg px-4 py-2 text-sm focus:border-[#FF9900] focus:ring-1 focus:ring-[#FF9900] outline-none bg-white transition-all font-medium" 
                                                        />
                                                     </div>
                                                     <div className={`p-3 rounded-lg flex gap-3 transition-colors duration-500 ${walletNum.length > 9 ? 'bg-emerald-50 border border-emerald-100' : 'bg-blue-50 border border-blue-100'}`}>
                                                          <Info className={`h-4 w-4 shrink-0 mt-0.5 ${walletNum.length > 9 ? 'text-emerald-500' : 'text-blue-500'}`} />
                                                          <p className={`text-[10px] leading-relaxed uppercase font-black tracking-widest ${walletNum.length > 9 ? 'text-emerald-600' : 'text-blue-600'}`}>
                                                            You will receive a push notification/OTP on <span className="underline decoration-2 underline-offset-2">{walletNum || 'your number'}</span> in real time.
                                                          </p>
                                                     </div>
                                                </div>
                                            )}

                                            {payMethod === 'cod' && (
                                                <div className="p-4 bg-emerald-50 border border-emerald-100 rounded-xl animate-in slide-in-from-top-4 duration-300">
                                                     <p className="text-[10px] text-emerald-600 font-bold uppercase tracking-widest leading-relaxed">Pay at your doorstep after receiving your items.</p>
                                                </div>
                                            )}

                                            <div className="pt-2">
                                                <button onClick={() => setStep(3)} className="px-8 py-2 bg-[#FFD814] border border-[#F0C14B] text-xs rounded-lg hover:bg-[#F7CA00] shadow-sm font-bold uppercase tracking-wide active:scale-95">
                                                    Validate Selection
                                                </button>
                                            </div>
                                        </div>
                                    ) : step > 2 ? (
                                        <div className="flex justify-between items-center text-sm">
                                            <p className="font-bold uppercase tracking-widest text-xs">{payMethod === 'card' ? 'Visa / Mastercard' : payMethod === 'easypaisa' ? (walletNum || 'Mobile Wallet') : 'Cash on Delivery'}</p>
                                            <button onClick={() => setStep(2)} className="text-[#007185] hover:underline text-xs font-bold uppercase">Change</button>
                                        </div>
                                    ) : null}
                                </div>
                            </div>
                        </div>

                        {/* 3. REVIEW ITEMS */}
                        <div className={`py-6 ${step < 3 ? 'opacity-30 pointer-events-none' : ''}`}>
                            <div className="flex gap-4">
                                <span className="text-xl font-bold min-w-[20px] text-gray-300">3</span>
                                <div className="flex-1">
                                    <h2 className={`text-lg font-bold mb-4 ${step === 3 ? 'text-[#C45500]' : 'text-black'}`}>Review and dispatch</h2>
                                    {step === 3 && (
                                        <div className="border border-gray-200 rounded-lg p-4 space-y-4 animate-in fade-in duration-500">
                                            {items.map(item => (
                                                <div key={item.id} className="flex gap-4 items-center border-b border-gray-50 last:border-0 pb-3 last:pb-0">
                                                    <div className="w-10 h-10 bg-white border border-gray-100 p-1 flex items-center justify-center shrink-0">
                                                        <img src={getImageUrl(item.image)} className="max-w-full max-h-full object-contain mix-blend-multiply" alt="" />
                                                    </div>
                                                    <div className="flex-1 text-xs font-bold truncate uppercase tracking-tighter">{item.name}</div>
                                                    <div className="text-xs font-bold text-red-800">Rs. {(parseFloat(String(item.price)) * item.quantity).toLocaleString()}</div>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* SUMMARY */}
                    <div className="w-full lg:w-[300px] lg:sticky lg:top-24">
                        <div className="border border-gray-200 rounded-xl p-6 bg-white space-y-6 shadow-md">
                            <h3 className="text-xs font-bold uppercase tracking-widest text-gray-400">Order Summary</h3>
                            <div className="space-y-2.5 text-xs text-gray-600">
                                <div className="flex justify-between">
                                    <span>Subtotal:</span>
                                    <span className="font-bold">Rs. {cartTotal.toLocaleString()}</span>
                                </div>
                                <div className="flex justify-between">
                                    <span>Logistics:</span>
                                    <span className="font-bold">{shipping === 0 ? 'FREE' : `Rs. ${shipping}`}</span>
                                </div>
                                <div className="pt-4 border-t border-gray-200 flex justify-between font-bold text-xl text-red-900 italic tracking-tighter">
                                    <span>Total:</span>
                                    <span>Rs. {total.toLocaleString()}</span>
                                </div>
                            </div>
                            <button
                                onClick={processOrder}
                                disabled={step < 3 || isProcessing}
                                className={`w-full py-3 bg-[#FFD814] border border-[#F0C14B] text-[#111] font-bold rounded-lg text-xs uppercase shadow-sm transition-all hover:bg-[#F7CA00] active:scale-95 ${step < 3 || isProcessing ? 'opacity-40 grayscale cursor-not-allowed' : ''}`}
                            >
                                {isProcessing ? <RefreshCw className="h-4 w-4 animate-spin mx-auto" /> : 'Place Order'}
                            </button>
                        </div>
                    </div>
                </div>
            </main>
        </div>
    );
}

function AmaField({ label, name, colSpan, required, placeholder }: any) {
    return (
        <div className={colSpan ? 'col-span-2' : 'col-span-1'}>
            <label className="text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-1.5 block">{label}</label>
            <input required={required} name={name} placeholder={placeholder} className="w-full border border-gray-300 rounded-lg px-4 py-2 text-sm focus:border-[#FF9900] focus:ring-1 focus:ring-[#FF9900] outline-none bg-white transition-all font-medium" />
        </div>
    );
}

function AmaPayRadio({ active, onClick, label }: any) {
    return (
        <button onClick={onClick} className={`flex items-center gap-3 w-full p-4 border rounded-xl transition-all ${active ? 'border-[#FF9900] bg-[#FF9900]/5' : 'border-gray-200 hover:bg-gray-50'}`}>
            <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0 ${active ? 'border-[#FF9900]' : 'border-gray-300'}`}>
                {active && <div className="w-2.5 h-2.5 rounded-full bg-[#FF9900]" />}
            </div>
            <span className={`text-xs font-black uppercase tracking-widest ${active ? 'text-black' : 'text-gray-400'}`}>{label}</span>
        </button>
    );
}
