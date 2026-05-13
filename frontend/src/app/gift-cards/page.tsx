'use client';

import Navbar from '@/components/layout/Navbar';
import Footer from '@/components/layout/Footer';
import { Gift, ShieldCheck, CreditCard, Send, Sparkles, Star, ChevronRight, Info, CheckCircle2 } from 'lucide-react';
import { motion } from 'framer-motion';

export default function GiftCardsPage() {
    return (
        <div className="min-h-screen bg-white font-sans text-[#0f1111]">
            <Navbar />

            {/* Same to Same Header as Tracking Page */}
            <div className="bg-white border-b border-[#D5D9D9] py-4 mb-10">
                <div className="max-w-[1240px] mx-auto px-6">
                     <h1 className="text-[24px] font-bold tracking-tight">Gift Cards</h1>
                     <p className="text-[14px] text-[#565959] mt-1">Share the luxury of Al-Qavi Hub with your loved ones</p>
                </div>
            </div>

            <main className="max-w-[1100px] mx-auto px-6 pb-24">
                <div className="space-y-16">
                    
                    {/* Hero Section */}
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
                        <div className="space-y-6">
                            <h2 className="text-[32px] font-bold leading-tight tracking-tight">The Perfect Gift for <br /><span className="text-[#119AB8]">Every Skincare Lover.</span></h2>
                            <p className="text-[15px] text-[#565959] leading-relaxed max-w-lg">
                                Not sure what to choose? Give the gift of choice with an Al-Qavi Hub Digital Gift Card. Perfect for birthdays, weddings, or just to say thank you.
                            </p>
                            <div className="flex flex-wrap gap-4 pt-4">
                                <button className="px-8 py-2.5 bg-[#119AB8] text-white rounded-[8px] text-[13px] font-bold hover:bg-[#13B0D1] transition-colors shadow-sm">Purchase Gift Card</button>
                                <button className="px-8 py-2.5 border border-[#D5D9D9] rounded-[8px] text-[13px] font-bold hover:bg-[#f7f8fa] transition-colors">Check Balance</button>
                            </div>
                        </div>
                        <div className="relative">
                            <div className="aspect-[16/10] bg-[#131921] rounded-[16px] p-8 text-white relative overflow-hidden shadow-2xl border border-white/10 group">
                                <div className="absolute top-0 right-0 p-12 opacity-10 group-hover:scale-110 transition-transform duration-1000">
                                    <Sparkles size={120} />
                                </div>
                                <div className="h-full flex flex-col justify-between relative z-10">
                                    <div className="flex justify-between items-start">
                                        <div className="w-12 h-12 bg-[#119AB8] rounded-xl flex items-center justify-center">
                                            <Gift size={24} />
                                        </div>
                                        <h3 className="text-[14px] font-bold tracking-widest uppercase">Elite Access</h3>
                                    </div>
                                    <div>
                                        <p className="text-[12px] opacity-60 uppercase tracking-widest mb-1">Gift Card Value</p>
                                        <p className="text-[36px] font-bold tracking-tighter">Rs. 5,000</p>
                                    </div>
                                    <div className="flex justify-between items-end">
                                        <div>
                                            <p className="text-[10px] opacity-40 uppercase mb-1">Card Holder</p>
                                            <p className="text-[12px] font-bold">AL-QAVI HUB PREMIER</p>
                                        </div>
                                        <div className="flex gap-1">
                                            <div className="w-6 h-6 bg-[#119AB8]/40 rounded-full" />
                                            <div className="w-6 h-6 bg-[#119AB8]/80 rounded-full -ml-3" />
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Features */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-8 border-t border-[#D5D9D9] pt-12">
                        <div className="flex gap-4">
                            <div className="w-10 h-10 bg-[#f7f8fa] border border-[#D5D9D9] rounded-lg flex items-center justify-center text-[#119AB8] shrink-0">
                                <Send size={20} />
                            </div>
                            <div>
                                <h4 className="font-bold text-[14px] mb-1">Instant Delivery</h4>
                                <p className="text-[12px] text-[#565959] leading-relaxed">Cards are delivered immediately via email or WhatsApp.</p>
                            </div>
                        </div>
                        <div className="flex gap-4">
                            <div className="w-10 h-10 bg-[#f7f8fa] border border-[#D5D9D9] rounded-lg flex items-center justify-center text-[#119AB8] shrink-0">
                                <CreditCard size={20} />
                            </div>
                            <div>
                                <h4 className="font-bold text-[14px] mb-1">Zero Fees</h4>
                                <p className="text-[12px] text-[#565959] leading-relaxed">No hidden charges or activation fees. Pay for what you give.</p>
                            </div>
                        </div>
                        <div className="flex gap-4">
                            <div className="w-10 h-10 bg-[#f7f8fa] border border-[#D5D9D9] rounded-lg flex items-center justify-center text-[#119AB8] shrink-0">
                                <ShieldCheck size={20} />
                            </div>
                            <div>
                                <h4 className="font-bold text-[14px] mb-1">Never Expires</h4>
                                <p className="text-[12px] text-[#565959] leading-relaxed">Al-Qavi Hub Gift Cards have no expiration date.</p>
                            </div>
                        </div>
                    </div>

                    {/* FAQ Area */}
                    <div className="bg-[#f7f8fa] border border-[#D5D9D9] rounded-[8px] p-10">
                        <h3 className="text-[18px] font-bold mb-8">Gift Card Support</h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-x-12 gap-y-8">
                            <div className="space-y-2">
                                <h5 className="text-[14px] font-bold flex items-center gap-2">
                                    <CheckCircle2 size={16} className="text-[#119AB8]" /> 
                                    How to redeem?
                                </h5>
                                <p className="text-[12px] text-[#565959] leading-relaxed ml-6">
                                    Simply enter your gift card code at the payment stage during checkout. The value will be deducted automatically.
                                </p>
                            </div>
                            <div className="space-y-2">
                                <h5 className="text-[14px] font-bold flex items-center gap-2">
                                    <CheckCircle2 size={16} className="text-[#119AB8]" /> 
                                    Can I use multiple cards?
                                </h5>
                                <p className="text-[12px] text-[#565959] leading-relaxed ml-6">
                                    Yes, you can combine multiple gift cards for a single order.
                                </p>
                            </div>
                            <div className="space-y-2">
                                <h5 className="text-[14px] font-bold flex items-center gap-2">
                                    <CheckCircle2 size={16} className="text-[#119AB8]" /> 
                                    Where to buy?
                                </h5>
                                <p className="text-[12px] text-[#565959] leading-relaxed ml-6">
                                    Digital gift cards are available on our website and at our main Gilgit hub.
                                </p>
                            </div>
                            <div className="space-y-2">
                                <h5 className="text-[14px] font-bold flex items-center gap-2">
                                    <CheckCircle2 size={16} className="text-[#119AB8]" /> 
                                    Balance inquiry?
                                </h5>
                                <p className="text-[12px] text-[#565959] leading-relaxed ml-6">
                                    Check your balance anytime through our customer service portal or using the "Check Balance" button above.
                                </p>
                            </div>
                        </div>
                    </div>
                </div>
            </main>

            <Footer />
        </div>
    );
}
