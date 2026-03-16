'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import Navbar from '@/components/layout/Navbar';
import Footer from '@/components/layout/Footer';
import {
    CheckCircle, CreditCard, Truck, ShieldCheck, Lock,
    Smartphone, Banknote, ArrowLeft, ChevronRight, Package,
    Info, ShoppingBag, Shield, Zap, ShoppingCart
} from 'lucide-react';
import { useCart } from '@/context/CartContext';
import { getImageUrl } from '@/lib/utils';

const STEPS = ['Shipment', 'Method', 'Finalized'];

export default function CheckoutPage() {
    const { items, cartTotal, clearCart } = useCart();
    const router = useRouter();
    const [step, setStep] = useState(1);
    const [payMethod, setPayMethod] = useState<'card' | 'cod' | 'easypaisa'>('card');

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

    if (step === 3) {
        const orderId = `ALQ-${Date.now().toString().slice(-6)}`;
        return (
            <div className="flex flex-col min-h-screen bg-[#F8F9FA] dark:bg-[#0f172a] font-sans transition-colors duration-500">
                <Navbar />
                <main className="flex-1 flex items-center justify-center py-24 px-4">
                    <div className="bg-white dark:bg-slate-900 shadow-2xl shadow-black/5 rounded-[3.5rem] p-12 lg:p-16 max-w-xl w-full text-center border border-gray-100 dark:border-slate-800">
                        <div className="w-24 h-24 bg-emerald-500/10 rounded-[2.5rem] flex items-center justify-center mx-auto mb-10 group">
                            <CheckCircle className="h-12 w-12 text-emerald-500 group-hover:scale-110 transition-transform" />
                        </div>
                        <h1 className="text-4xl font-black text-gray-900 dark:text-white mb-3 tracking-tighter leading-none">Order Established</h1>
                        <p className="text-[#FF9900] font-black uppercase tracking-[0.3em] text-[10px] mb-10">Tracking ID: {orderId}</p>

                        <p className="text-gray-500 dark:text-slate-400 font-medium mb-12 leading-relaxed">
                            Your boutique selection is now being prepared. We&apos;ve sent a digital invoice to your email with the full logistics breakdown.
                        </p>

                        <div className="bg-gray-50 dark:bg-slate-800/50 rounded-3xl p-8 mb-12 border border-gray-100 dark:border-slate-800 text-left space-y-5">
                            <div className="flex justify-between items-center text-[10px] font-black uppercase tracking-widest text-gray-400 dark:text-slate-500">
                                <span>Estimated Transit</span>
                                <span className="text-gray-900 dark:text-white">72 - 96 Hours</span>
                            </div>
                            <div className="flex justify-between items-center text-[10px] font-black uppercase tracking-widest text-gray-400 dark:text-slate-500 pt-5 border-t border-gray-100 dark:border-slate-800">
                                <span>Secured Amount</span>
                                <span className="text-gray-900 dark:text-[#FF9900] text-2xl font-black tracking-tighter">Rs. {total.toLocaleString()}</span>
                            </div>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <Link href="/shop"
                                className="py-5 bg-[#FF9900] hover:bg-[#131921] text-white font-black uppercase tracking-widest rounded-2xl text-[10px] transition-all shadow-xl shadow-[#FF9900]/20 active:scale-95">
                                Shopping Bag
                            </Link>
                            <Link href="/"
                                className="py-5 bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 text-gray-900 dark:text-white font-black uppercase tracking-widest rounded-2xl text-[10px] transition-all">
                                Home Hub
                            </Link>
                        </div>
                    </div>
                </main>
                <Footer />
            </div>
        );
    }

    if (items.length === 0) {
        return (
            <div className="flex flex-col min-h-screen bg-white dark:bg-[#0f172a]">
                <Navbar />
                <main className="flex-1 flex flex-col items-center justify-center py-32">
                    <div className="w-24 h-24 bg-gray-50 dark:bg-slate-800 rounded-3xl flex items-center justify-center text-gray-300 dark:text-slate-700 mb-8">
                        <ShoppingBag className="h-12 w-12" />
                    </div>
                    <h2 className="text-2xl font-black text-gray-900 dark:text-white mb-2">Checkout Unavailable</h2>
                    <p className="text-gray-500 dark:text-slate-500 mb-10">Add items to your bag to proceed.</p>
                    <Link href="/shop" className="px-10 py-5 bg-[#FF9900] text-white font-black rounded-2xl text-[10px] uppercase tracking-widest shadow-xl shadow-[#FF9900]/20">
                        Enter Boutique
                    </Link>
                </main>
                <Footer />
            </div>
        );
    }

    return (
        <div className="flex flex-col min-h-screen bg-[#F8F9FA] dark:bg-[#0f172a] font-sans transition-colors duration-500">
            <Navbar />

            {/* STEP INDICATOR */}
            <div className="bg-white dark:bg-slate-900 border-b border-gray-100 dark:border-slate-800">
                <div className="container mx-auto px-4 lg:px-12 py-8">
                    <div className="flex items-center justify-center gap-6 sm:gap-16 max-w-3xl mx-auto">
                        {STEPS.map((s, i) => (
                            <div key={s} className="flex items-center gap-4 group">
                                <div className={`w-10 h-10 rounded-2xl flex items-center justify-center text-xs font-black transition-all ${step > i + 1 ? 'bg-emerald-500 text-white' : step === i + 1 ? 'bg-[#FF9900] text-white shadow-lg shadow-[#FF9900]/20' : 'bg-gray-100 dark:bg-slate-800 text-gray-400'}`}>
                                    {step > i + 1 ? <CheckCircle className="h-5 w-5" /> : i + 1}
                                </div>
                                <span className={`text-[10px] font-black uppercase tracking-[0.2em] hidden md:inline ${step === i + 1 ? 'text-gray-900 dark:text-white' : 'text-gray-400'}`}>{s}</span>
                                {i < STEPS.length - 1 && <ChevronRight className="h-4 w-4 text-gray-200 dark:text-slate-800 hidden sm:block" />}
                            </div>
                        ))}
                    </div>
                </div>
            </div>

            <main className="flex-1 py-16">
                <div className="container mx-auto px-4 lg:px-12">
                    <div className="flex flex-col lg:flex-row gap-16">
                        
                        {/* FORM AREA */}
                        <div className="flex-1 w-full order-2 lg:order-1">
                            <form onSubmit={handleNext} className="space-y-10">
                                {step === 1 && (
                                    <div className="bg-white dark:bg-slate-900 rounded-[3rem] p-10 lg:p-14 border border-gray-100 dark:border-slate-800 shadow-sm animate-in fade-in slide-in-from-bottom-6 duration-700">
                                        <div className="flex items-center gap-5 mb-14">
                                            <div className="w-14 h-14 bg-[#FF9900]/10 rounded-2xl flex items-center justify-center text-[#FF9900]">
                                                <Truck className="h-7 w-7" />
                                            </div>
                                            <div>
                                                <h2 className="text-2xl font-black text-gray-900 dark:text-white tracking-tighter">Delivery Intel</h2>
                                                <p className="text-[10px] font-black text-gray-400 dark:text-slate-500 uppercase tracking-widest">Global logistics destination</p>
                                            </div>
                                        </div>

                                        <div className="grid sm:grid-cols-2 gap-8">
                                            <Field label="Contact First Name" required placeholder="Ali" />
                                            <Field label="Contact Last Name" required placeholder="Raza" />
                                            <Field label="Primary Email" type="email" required placeholder="ali@distro.com" colSpan />
                                            <Field label="Mobile Connectivity" type="tel" required placeholder="03XX XXX XXXX" colSpan />
                                            <Field label="Street / Suite / Hub" required placeholder="Office 402, Al-Qavi Tower" colSpan />
                                            <Field label="Province" required placeholder="Sindh" />
                                            <Field label="Metropolis" required placeholder="Karachi" />
                                        </div>

                                        <div className="pt-12 flex justify-end">
                                            <button type="submit"
                                                className="w-full sm:w-auto px-16 py-6 bg-[#131921] dark:bg-slate-800 hover:bg-[#FF9900] dark:hover:bg-[#FF9900] text-white font-black uppercase tracking-widest rounded-2xl text-[10px] transition-all shadow-xl active:scale-95">
                                                Proceed to Payment
                                            </button>
                                        </div>
                                    </div>
                                )}

                                {step === 2 && (
                                    <div className="bg-white dark:bg-slate-900 rounded-[3rem] p-10 lg:p-14 border border-gray-100 dark:border-slate-800 shadow-sm animate-in fade-in slide-in-from-bottom-6 duration-700">
                                        <div className="flex items-center gap-5 mb-14">
                                            <div className="w-14 h-14 bg-[#FF9900]/10 rounded-2xl flex items-center justify-center text-[#FF9900]">
                                                <Lock className="h-7 w-7" />
                                            </div>
                                            <div>
                                                <h2 className="text-2xl font-black text-gray-900 dark:text-white tracking-tighter">Secured Payment</h2>
                                                <p className="text-[10px] font-black text-gray-400 dark:text-slate-500 uppercase tracking-widest">End-to-end encrypted hub</p>
                                            </div>
                                        </div>

                                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-5 mb-12">
                                            <PaymentButton active={payMethod==='card'} onClick={()=>setPayMethod('card')} icon={<CreditCard className="h-5 w-5"/>} label="Secure Card"/>
                                            <PaymentButton active={payMethod==='cod'} onClick={()=>setPayMethod('cod')} icon={<Banknote className="h-5 w-5"/>} label="On Delivery"/>
                                            <PaymentButton active={payMethod==='easypaisa'} onClick={()=>setPayMethod('easypaisa')} icon={<Smartphone className="h-5 w-5"/>} label="Mobile Wallet"/>
                                        </div>

                                        <div className="space-y-8 animate-in fade-in duration-500">
                                            {payMethod === 'card' && (
                                                <div className="grid sm:grid-cols-2 gap-8">
                                                    <Field label="Card Credentials" required placeholder="XXXX XXXX XXXX XXXX" colSpan />
                                                    <Field label="Expiration Month/Year" required placeholder="MM / YY" />
                                                    <Field label="Security CVV" type="password" required placeholder="•••" />
                                                    <Field label="Identification Name" required placeholder="ALI RAZA" colSpan />
                                                </div>
                                            )}
                                            {payMethod === 'cod' && (
                                                <div className="bg-amber-50 dark:bg-amber-950/20 rounded-3xl p-8 border border-amber-100 dark:border-amber-900/30 flex items-start gap-4">
                                                    <Info className="h-6 w-6 text-amber-500 mt-1" />
                                                    <p className="text-sm font-medium text-amber-950 dark:text-amber-200 leading-relaxed">
                                                        Cash settlement required upon logistics completion. Please maintain exact amount for rapid clearance. High priority dispatch still applies.
                                                    </p>
                                                </div>
                                            )}
                                            {payMethod === 'easypaisa' && (
                                                <div className="space-y-6">
                                                    <Field label="Mobile Merchant Number" required placeholder="03XXXXXXXXX" />
                                                    <div className="p-6 bg-emerald-50 dark:bg-emerald-950/20 border border-emerald-100 dark:border-emerald-900/30 rounded-2xl">
                                                        <p className="text-[10px] font-black text-emerald-600 dark:text-emerald-400 uppercase tracking-widest flex items-center gap-2">
                                                            <CheckCircle className="h-4 w-4" /> Real-time mobile authorization required
                                                        </p>
                                                    </div>
                                                </div>
                                            )}
                                        </div>

                                        <div className="flex flex-col sm:flex-row gap-5 pt-16">
                                            <button type="button" onClick={() => setStep(1)} className="flex-1 py-6 border-2 border-gray-100 dark:border-slate-800 text-gray-400 dark:text-slate-500 font-black uppercase tracking-widest rounded-2xl text-[10px] transition-all hover:bg-gray-50 dark:hover:bg-slate-800">
                                                <ArrowLeft className="h-4 w-4 inline mr-2" /> Modify Logistics
                                            </button>
                                            <button type="submit" className="flex-[2] py-6 bg-[#FF9900] hover:bg-[#131921] text-white font-black uppercase tracking-widest rounded-2xl text-[10px] transition-all shadow-xl shadow-[#FF9900]/20 active:scale-95">
                                                Authorize & Review · Rs. {total.toLocaleString()}
                                            </button>
                                        </div>
                                    </div>
                                )}
                            </form>
                        </div>

                        {/* SIDE SUMMARY */}
                        <div className="w-full lg:w-[420px] order-1 lg:order-2">
                            <div className="bg-white dark:bg-slate-900 rounded-[3rem] p-10 border border-gray-100 dark:border-slate-800 shadow-sm sticky top-28">
                                <h3 className="text-[10px] font-black text-gray-400 dark:text-slate-500 uppercase tracking-widest mb-10 flex items-center justify-between">
                                    Final Selection <span>{items.length} Items</span>
                                </h3>

                                <div className="space-y-6 max-h-[350px] overflow-y-auto pr-2 scrollbar-none mb-10">
                                    {items.map(item => (
                                        <div key={item.id} className="flex gap-4">
                                            <div className="w-16 h-16 rounded-2xl overflow-hidden flex-shrink-0 bg-gray-50 dark:bg-slate-800 border border-gray-100 dark:border-slate-800">
                                                <img src={getImageUrl(item.image) || 'https://images.unsplash.com/photo-1596462502278-27bfdd403cc2?q=80&w=400'} className="w-full h-full object-cover" />
                                            </div>
                                            <div className="flex-1 min-w-0 flex flex-col justify-center">
                                                <h4 className="text-xs font-bold text-gray-900 dark:text-white line-clamp-1">{item.name}</h4>
                                                <p className="text-[10px] font-black text-[#FF9900] uppercase tracking-widest mt-1">QTY: {item.quantity}</p>
                                            </div>
                                            <p className="text-xs font-black text-gray-900 dark:text-white self-center">Rs. {(parseFloat(String(item.price)) * item.quantity).toLocaleString()}</p>
                                        </div>
                                    ))}
                                </div>

                                <div className="space-y-4 pt-10 border-t border-gray-100 dark:border-slate-800 text-[10px] font-black uppercase tracking-widest text-gray-400 dark:text-slate-500">
                                    <div className="flex justify-between">
                                        <span>Order Base</span>
                                        <span className="text-gray-900 dark:text-white">Rs. {cartTotal.toLocaleString()}</span>
                                    </div>
                                    <div className="flex justify-between">
                                        <span>Logistics</span>
                                        <span className={shipping === 0 ? 'text-[#FF9900]' : 'text-gray-900 dark:text-white'}>
                                            {shipping === 0 ? 'COMPLIMENTARY' : `Rs. ${shipping}`}
                                        </span>
                                    </div>
                                    <div className="pt-8 mt-4 border-t border-gray-100 dark:border-slate-800 flex justify-between items-end">
                                        <span className="text-[10px] text-gray-400 dark:text-slate-500">Finalized Amount</span>
                                        <span className="text-3xl font-black text-gray-900 dark:text-[#FF9900] tracking-tighter">Rs. {total.toLocaleString()}</span>
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

function Field({ label, type = 'text', required = false, placeholder = '', colSpan = false }: { label: string; type?: string; required?: boolean; placeholder?: string; colSpan?: boolean }) {
    return (
        <div className={colSpan ? 'sm:col-span-2' : ''}>
            <label className="text-[10px] font-black text-gray-400 dark:text-slate-500 uppercase tracking-widest ml-1 mb-2 block">{label}</label>
            <input type={type} required={required} placeholder={placeholder}
                className="w-full px-6 py-5 bg-gray-50 dark:bg-slate-800 border-2 border-transparent focus:border-[#FF9900]/30 rounded-2xl text-xs font-black outline-none transition-all text-gray-900 dark:text-white placeholder:text-gray-300 dark:placeholder:text-slate-600" />
        </div>
    );
}

function PaymentButton({ active, onClick, icon, label }: { active: boolean; onClick: ()=>void; icon: any; label: string }) {
    return (
        <button type="button" onClick={onClick}
            className={`flex flex-col items-center gap-4 p-8 rounded-[2.5rem] border-2 transition-all ${active ? 'bg-[#FF9900]/10 border-[#FF9900] text-[#FF9900]' : 'bg-gray-50 dark:bg-slate-800 border-transparent text-gray-400 hover:text-gray-900 dark:hover:text-white'}`}>
            <div className={`w-12 h-12 rounded-2xl flex items-center justify-center transition-all ${active ? 'bg-[#FF9900] text-white shadow-lg shadow-[#FF9900]/20' : 'bg-white dark:bg-slate-700'}`}>{icon}</div>
            <span className="text-[10px] font-black uppercase tracking-widest">{label}</span>
        </button>
    );
}
