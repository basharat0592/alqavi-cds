'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import Navbar from '@/components/layout/Navbar';
import Footer from '@/components/layout/Footer';
import {
    CheckCircle, CreditCard, Truck, ShieldCheck, Lock,
    Smartphone, Banknote, ArrowLeft, ChevronRight, Package,
    Info, ShoppingBag, Shield, Zap, ShoppingCart, Sparkles, Globe, RefreshCw, Star
} from 'lucide-react';
import { useCart } from '@/context/CartContext';
import { getImageUrl } from '@/lib/utils';
import { orderService } from '@/lib/api';

const STEPS = ['Shipping', 'Payment', 'Review & Place Order'];

function ProgressTracker({ currentStep }: { currentStep: number }) {
    return (
        <div className="bg-[#fcfcfc] border-b border-gray-200 dark:bg-slate-900/50 dark:border-slate-800">
            <div className="container mx-auto px-4 py-6">
                <div className="flex items-center justify-between max-w-2xl mx-auto relative px-10">
                    <div className="absolute top-1/2 left-0 right-0 h-[2px] bg-gray-100 dark:bg-slate-800 -translate-y-1/2" />
                    <div className="absolute top-1/2 left-0 h-[2px] bg-[#FF9900] -translate-y-1/2 transition-all duration-700" style={{ width: `${(currentStep - 1) * 50}%` }} />
                    
                    {STEPS.map((s, i) => {
                        const active = currentStep === i + 1;
                        const done = currentStep > i + 1;
                        return (
                            <div key={s} className="relative z-10 flex flex-col items-center gap-2 group">
                                <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold transition-all duration-500 border-2 ${done ? 'bg-[#FF9900] border-[#FF9900] text-white' : active ? 'bg-white dark:bg-slate-900 border-[#FF9900] text-[#FF9900] shadow-xl scale-110' : 'bg-white dark:bg-slate-900 border-gray-100 text-gray-300'}`}>
                                    {done ? <CheckCircle className="h-4 w-4" /> : i + 1}
                                </div>
                                <span className={`text-[10px] font-bold uppercase tracking-tight transition-all duration-300 absolute -bottom-5 whitespace-nowrap ${active ? 'text-[#FF9900]' : 'text-gray-400'}`}>{s}</span>
                            </div>
                        );
                    })}
                </div>
            </div>
        </div>
    );
}

export default function CheckoutPage() {
    const { items, cartTotal, clearCart, cartCount } = useCart();
    const router = useRouter();
    const [step, setStep] = useState(1);
    const [payMethod, setPayMethod] = useState<'card' | 'cod' | 'easypaisa'>('card');
    const [shippingInfo, setShippingInfo] = useState<any>({});
    const [isProcessing, setIsProcessing] = useState(false);
    const [placedOrderNumber, setPlacedOrderNumber] = useState<string | null>(null);
    const [showConfirmModal, setShowConfirmModal] = useState(false);

    const shipping = cartTotal > 5000 ? 0 : 350;
    const total = cartTotal + shipping;

    const handleNext = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        if (step === 1) {
            const fd = new FormData(e.currentTarget);
            setShippingInfo(Object.fromEntries(fd.entries()));
            setStep(2);
        } else if (step === 2) {
            setStep(3); // Amazon Style Review Step
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
            setStep(4); // Success Step
        } catch (err: any) {
            console.error(err);
            alert("Error: Failed to process order.");
        } finally {
            setIsProcessing(false);
        }
    };

    if (step === 4) {
        return (
            <div className="flex flex-col min-h-screen bg-slate-50 dark:bg-background">
                <Navbar />
                <main className="flex-1 flex flex-col items-center justify-center py-20 px-4">
                    <div className="max-w-2xl w-full bg-white dark:bg-slate-900 border border-gray-100 dark:border-slate-800 rounded-3xl shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-1000">
                        {/* Header Banner */}
                        <div className="bg-slate-900 p-12 text-center relative overflow-hidden">
                            <div className="absolute top-0 right-0 w-64 h-64 bg-[#FF9900]/10 rounded-full blur-3xl -mr-32 -mt-32" />
                            <div className="relative z-10">
                                <div className="w-16 h-16 bg-emerald-500 text-white rounded-full flex items-center justify-center mx-auto mb-6 shadow-xl animate-bounce">
                                    <CheckCircle className="h-8 w-8" />
                                </div>
                                <h1 className="text-3xl font-black text-white tracking-tight uppercase italic underline decoration-[#FF9900] decoration-4 underline-offset-8">
                                    Order Confirmed
                                </h1>
                                <p className="text-slate-400 mt-6 text-sm font-bold uppercase tracking-widest leading-loose">
                                    We've received your shipment request.<br /> 
                                    Preparing your beauty essentials for dispatch.
                                </p>
                            </div>
                        </div>

                        {/* Order Tracking ID Box */}
                        <div className="p-10 space-y-8">
                            <div className="bg-slate-50 dark:bg-slate-800/50 border border-dashed border-slate-200 dark:border-slate-700 p-8 rounded-2xl text-center group">
                                <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.3em] mb-2">Unique Tracking ID</p>
                                <div className="flex items-center justify-center gap-4">
                                    <span className="text-4xl font-black text-slate-900 dark:text-white tracking-[0.1em] font-mono group-hover:text-[#FF9900] transition-colors">
                                        {placedOrderNumber}
                                    </span>
                                </div>
                                <div className="mt-4 inline-flex items-center gap-2 px-3 py-1 bg-white dark:bg-slate-800 border dark:border-slate-700 rounded-full shadow-sm text-[9px] font-black text-emerald-600 uppercase tracking-widest">
                                    <ShieldCheck className="h-3 w-3" /> Securely Registered
                                </div>
                            </div>

                            <div className="grid md:grid-cols-2 gap-6">
                                <Link 
                                    href={`/dashboard/track?order=${placedOrderNumber}`}
                                    className="flex items-center justify-between p-6 bg-slate-900 dark:bg-[#FF9900] text-white dark:text-[#131921] rounded-2xl hover:scale-[1.02] transition-all shadow-xl shadow-slate-900/10 group"
                                >
                                    <div className="text-left">
                                        <h3 className="text-sm font-black uppercase tracking-widest">Live Track</h3>
                                        <p className="text-[10px] opacity-70 font-bold uppercase mt-1">Real-time Dashboard</p>
                                    </div>
                                    <div className="p-3 bg-white/10 rounded-xl group-hover:bg-white/20 transition-colors">
                                        <Truck className="h-5 w-5" />
                                    </div>
                                </Link>

                                <Link 
                                    href="/shop"
                                    className="flex items-center justify-between p-6 bg-white dark:bg-slate-800 border border-gray-100 dark:border-slate-700 rounded-2xl hover:scale-[1.02] transition-all group"
                                >
                                    <div className="text-left">
                                        <h3 className="text-sm font-black text-slate-900 dark:text-white uppercase tracking-widest">Back to Store</h3>
                                        <p className="text-[10px] text-slate-400 font-bold uppercase mt-1">Continue Discovery</p>
                                    </div>
                                    <div className="p-3 bg-slate-50 dark:bg-slate-700 rounded-xl group-hover:bg-slate-100 transition-colors">
                                        <ShoppingBag className="h-5 w-5 text-slate-400 dark:text-white" />
                                    </div>
                                </Link>
                            </div>

                            <div className="pt-8 border-t border-gray-100 dark:border-slate-800 flex justify-center">
                                <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest flex items-center gap-2 italic">
                                    <Info className="h-3 w-3" /> Need help? Reach out to Al-Qavi Logistics Support
                                </p>
                            </div>
                        </div>
                    </div>
                </main>
                <Footer />
            </div>
        );
    }

    if (items.length === 0) {
        return (
            <div className="flex flex-col min-h-screen bg-white text-center pt-40">
                <Navbar />
                <ShoppingCart className="h-16 w-16 text-gray-200 mx-auto mb-8" />
                <h2 className="text-2xl font-bold dark:text-white mb-4 italic">The selection is unpopulated.</h2>
                <Link href="/shop" className="px-10 py-2 bg-[#FF9900] text-white font-bold rounded-lg uppercase tracking-tighter">Enter Store Catalog</Link>
                <Footer />
            </div>
        );
    }

    return (
        <div className="flex flex-col min-h-screen bg-white dark:bg-background">
            <Navbar />
            
            {/* Minimalist Header for Checkout */}
            <div className="bg-[#f3f3f3] dark:bg-slate-900 border-b border-gray-200 dark:border-slate-800 py-6">
                <div className="container mx-auto px-4 flex items-center gap-6">
                    <Link href="/" className="flex items-center gap-2 group shrink-0">
                        <div className="w-10 h-10 bg-slate-900 dark:bg-accent rounded-xl flex items-center justify-center text-white shadow-lg transition-transform group-hover:scale-105">
                            <Star className="h-6 w-6 fill-white" />
                        </div>
                    </Link>
                    <h1 className="text-2xl font-normal dark:text-white tracking-widest uppercase items-baseline"><span className="font-bold">Checkout</span> <span className="text-gray-400 italic">({cartCount} items)</span></h1>
                </div>
            </div>

            <ProgressTracker currentStep={step} />

            <main className="flex-1 py-12">
                <div className="container mx-auto px-4">
                    <div className="flex flex-col lg:flex-row gap-8 items-start">

                        {/* LEFT: STEP CONTENT */}
                        <div className="flex-1 w-full space-y-6">
                            <div className="bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-800 rounded p-10 animate-in fade-in duration-500">
                                {step === 1 && (
                                    <form onSubmit={handleNext} className="space-y-10">
                                        <h2 className="text-xl font-bold dark:text-white border-b border-gray-100 dark:border-slate-800 pb-4 uppercase tracking-tighter">1. Shipping Address</h2>
                                        <div className="grid sm:grid-cols-2 gap-8">
                                            <AmaField label="First Name" name="firstName" required />
                                            <AmaField label="Last Name" name="lastName" required />
                                            <AmaField label="Email Address" name="email" type="email" required colSpan />
                                            <AmaField label="Phone Number" name="phone" type="tel" required colSpan />
                                            <AmaField label="Full Street Address" name="address" required colSpan />
                                            <AmaField label="Province" name="province" required />
                                            <AmaField label="City" name="city" required />
                                        </div>
                                        <button type="submit" className="px-10 py-1.5 bg-[#FF9900] hover:bg-[#e68a00] text-[#111] font-bold rounded shadow-sm text-sm uppercase tracking-tighter">
                                            Use this address
                                        </button>
                                    </form>
                                )}

                                {step === 2 && (
                                    <form onSubmit={handleNext} className="space-y-10">
                                        <div className="flex items-baseline justify-between border-b border-gray-100 dark:border-slate-800 pb-4">
                                            <h2 className="text-xl font-bold dark:text-white uppercase tracking-tighter items-baseline">2. Payment Method</h2>
                                            <button type="button" onClick={() => setStep(1)} className="text-xs text-[#007185] hover:underline font-bold tracking-widest uppercase">Go Back</button>
                                        </div>

                                        <div className="space-y-4">
                                            <AmaPaymentOption active={payMethod === 'card'} onClick={() => setPayMethod('card')} label="Credit or Debit Card" icon={<CreditCard className="h-5 w-5" />} />
                                            {payMethod === 'card' && (
                                                <div className="ml-10 p-6 bg-gray-50 dark:bg-slate-800 rounded border border-gray-100 dark:border-slate-700 grid sm:grid-cols-2 gap-6 animate-in slide-in-from-top-2 duration-300">
                                                    <AmaField label="Name on card" name="cardName" />
                                                    <AmaField label="Card number" name="cardNumber" />
                                                    <AmaField label="Expiration" name="cardExpiry" placeholder="MM/YY" />
                                                    <AmaField label="CVV" name="cardCvv" type="password" />
                                                </div>
                                            )}
                                            
                                            <AmaPaymentOption active={payMethod === 'cod'} onClick={() => setPayMethod('cod')} label="Cash on Delivery" icon={<Banknote className="h-5 w-5" />} />
                                            {payMethod === 'cod' && (
                                                <div className="ml-10 p-4 border-l-4 border-orange-500 bg-orange-50/50 text-orange-800 text-xs font-bold uppercase tracking-tighter animate-in slide-in-from-top-2">
                                                    Settlement upon physical arrival at your hub.
                                                </div>
                                            )}

                                            <AmaPaymentOption active={payMethod === 'easypaisa'} onClick={() => setPayMethod('easypaisa')} label="Mobile Wallet (Easypaisa/JazzCash)" icon={<Smartphone className="h-5 w-5" />} />
                                        </div>

                                        <button type="submit" className="px-10 py-1.5 bg-[#FF9900] hover:bg-[#e68a00] text-[#111] font-bold rounded shadow-sm text-sm uppercase tracking-tighter">
                                            Continue to Review
                                        </button>
                                    </form>
                                )}

                                {step === 3 && (
                                    <div className="space-y-10 animate-in fade-in duration-500">
                                        <div className="flex items-baseline justify-between border-b border-gray-100 dark:border-slate-800 pb-4">
                                            <h2 className="text-xl font-bold dark:text-white uppercase tracking-tighter items-baseline">3. Review and Place Order</h2>
                                            <button type="button" onClick={() => setStep(2)} className="text-xs text-[#007185] hover:underline font-bold tracking-widest uppercase">Go Back</button>
                                        </div>

                                        <div className="grid md:grid-cols-2 gap-10">
                                            <div className="space-y-2">
                                                <h4 className="text-xs font-bold dark:text-gray-300 uppercase tracking-widest italic decoration-[#FF9900]">Shipping Address</h4>
                                                <p className="text-sm dark:text-gray-400 font-bold">{shippingInfo.firstName} {shippingInfo.lastName}</p>
                                                <p className="text-sm dark:text-gray-400">{shippingInfo.address}</p>
                                                <p className="text-sm dark:text-gray-400">{shippingInfo.city}, {shippingInfo.province}</p>
                                                <p className="text-sm dark:text-gray-400">{shippingInfo.phone}</p>
                                            </div>
                                            <div className="space-y-2">
                                                <h4 className="text-xs font-bold dark:text-gray-300 uppercase tracking-widest italic decoration-[#FF9900]">Payment Method</h4>
                                                <p className="text-sm dark:text-gray-400 font-bold uppercase tracking-tighter">{payMethod === 'cod' ? 'Cash on Delivery' : payMethod === 'easypaisa' ? 'Mobile Wallet' : 'Credit Card'}</p>
                                            </div>
                                        </div>

                                        <div className="border-t border-gray-100 dark:border-slate-800 pt-8">
                                            <h4 className="text-sm font-bold dark:text-white mb-6 uppercase tracking-widest items-baseline italic underline decoration-[#FF9900]">Registry Overview</h4>
                                            <div className="space-y-6">
                                                {items.map(i => (
                                                    <div key={i.id} className="flex gap-4 group">
                                                        <div className="w-16 h-16 bg-gray-50 dark:bg-slate-800 p-2 border shrink-0">
                                                            <img src={getImageUrl(i.image) || ''} className="w-full h-full object-contain mix-blend-multiply dark:mix-blend-normal transform transition-transform group-hover:scale-105" />
                                                        </div>
                                                        <div className="flex-1">
                                                            <h5 className="text-sm font-bold text-[#007185] line-clamp-1 italic">{i.name}</h5>
                                                            <div className="flex items-center justify-between mt-2">
                                                                <p className="text-xs text-slate-500 font-bold uppercase tracking-widest leading-none">Quantity: {i.quantity}</p>
                                                                <p className="text-sm font-black dark:text-white tracking-widest italic">PKR {(parseFloat(String(i.price)) * i.quantity).toLocaleString()}</p>
                                                            </div>
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>

                                        <div className="pt-8 border-t border-gray-100 dark:border-slate-800 flex justify-end">
                                            <button 
                                                onClick={processOrder}
                                                disabled={isProcessing}
                                                className="px-12 py-3 bg-[#FF9900] hover:bg-[#e68a00] text-[#111] font-bold rounded shadow-lg text-sm transition-all active:scale-95 flex items-center gap-2 uppercase tracking-tighter"
                                            >
                                                {isProcessing && <RefreshCw className="h-4 w-4 animate-spin" />}
                                                Place your order
                                            </button>
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* RIGHT: BUY BOX SUMMARY */}
                        <div className="w-full lg:w-[320px] sticky top-24">
                            <div className="bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-800 rounded p-6 shadow-md space-y-6">
                                <button 
                                    onClick={step === 3 ? processOrder : undefined}
                                    disabled={step < 3 || isProcessing}
                                    className={`w-full py-2 bg-[#ffd814] hover:bg-[#f7ca00] text-[#111] font-bold rounded-lg text-sm text-center shadow active:scale-95 transition-all uppercase tracking-widest ${step < 3 ? 'opacity-50 cursor-not-allowed grayscale' : ''}`}
                                >
                                    Place your order
                                </button>
                                <p className="text-[10px] text-gray-500 text-center uppercase tracking-widest font-bold">By placing your order, you agree to Al-Qavi's Global Logistics Terms of Service.</p>
                                
                                <div className="border-t border-gray-100 dark:border-slate-800 pt-4 space-y-3">
                                    <h3 className="text-lg font-bold dark:text-white uppercase tracking-tighter">Order Summary</h3>
                                    <div className="flex justify-between text-xs dark:text-gray-400">
                                        <span>Items ({cartCount}):</span>
                                        <span className="font-bold underline">PKR {cartTotal.toLocaleString()}</span>
                                    </div>
                                    <div className="flex justify-between text-xs dark:text-gray-400">
                                        <span>Shipping & Handling:</span>
                                        <span className="font-bold">{shipping > 0 ? `PKR ${shipping}` : 'FREE'}</span>
                                    </div>
                                    <div className="flex justify-between text-xl font-bold dark:text-white pt-2 border-t border-[#FF9900]/20">
                                        <span className="items-baseline uppercase tracking-tighter">Order Total:</span>
                                        <span className="text-[#FF9900] tracking-widest italic decoration-double">PKR {total.toLocaleString()}</span>
                                    </div>
                                </div>
                                
                                <div className="p-4 bg-gray-50 dark:bg-slate-800 rounded text-[10px] space-y-2 pointer-events-none">
                                    <p className="flex items-center gap-2 text-[#007185] font-black uppercase tracking-widest"><Globe className="h-3 w-3" /> Overseas Dispatch Axis</p>
                                    <p className="text-gray-500 italic">This transaction includes global handling protocols for delicate skincare curation.</p>
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

function AmaField({ label, name, type = 'text', required = false, placeholder = '', colSpan = false }: { label: string; name: string; type?: string; required?: boolean; placeholder?: string; colSpan?: boolean }) {
    return (
        <div className={colSpan ? 'sm:col-span-2' : ''}>
            <label className="text-xs font-bold dark:text-gray-300 mb-2 block uppercase tracking-tighter italic decoration-[#FF9900]">{label}</label>
            <input 
                type={type} 
                name={name} 
                required={required} 
                placeholder={placeholder}
                className="w-full px-3 py-2 border border-gray-300 dark:border-slate-700 rounded text-sm focus:border-orange-500 focus:ring-1 focus:ring-orange-500 outline-none transition-all dark:bg-slate-800 dark:text-white"
            />
        </div>
    );
}

function AmaPaymentOption({ active, onClick, icon, label }: { active: boolean; onClick: () => void; icon: any; label: string }) {
    return (
        <button type="button" onClick={onClick} className="flex items-center gap-4 w-full text-left group">
            <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center shrink-0 ${active ? 'border-[#FF9900]' : 'border-gray-300'}`}>
                {active && <div className="w-2 h-2 rounded-full bg-[#FF9900]" />}
            </div>
            <div className={`flex flex-1 items-center gap-3 p-4 border rounded transition-all ${active ? 'border-[#FF9900] bg-orange-50/10' : 'border-gray-200 hover:bg-gray-50 dark:border-slate-800'}`}>
                <div className="text-gray-600 dark:text-gray-300 shrink-0">{icon}</div>
                <span className="text-sm font-bold dark:text-white uppercase tracking-tighter italic">{label}</span>
            </div>
        </button>
    );
}
