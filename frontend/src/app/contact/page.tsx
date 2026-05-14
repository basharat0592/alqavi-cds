'use client';

import Navbar from '@/components/layout/Navbar';
import Footer from '@/components/layout/Footer';
import { Mail, Phone, MapPin, Clock, MessageSquare, ShieldCheck, HelpCircle, ChevronDown, ChevronUp, Instagram, Twitter, Facebook, Globe, Youtube, Building2, Truck, Star, CheckCircle2, ShoppingBag, Info, Heart, ArrowRight } from 'lucide-react';
import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import cmsService, { SiteSettings } from '@/services/cms.service';

const FAQS = [
    {
        question: "Where's my order?",
        answer: "You can track your order in real-time through the 'Your Orders' section in your dashboard. Once your order is dispatched, you will also receive a tracking ID via SMS and Email."
    },
    {
        question: "Returns and Refunds",
        answer: "We offer a 7-day return policy for unopened and unused products. If you receive a damaged item, please contact our support team within 24 hours with photos of the product to initiate a refund or replacement."
    },
    {
        question: "Payment Methods",
        answer: "We accept Cash on Delivery (COD), Direct Bank Transfers, and major mobile wallets like JazzCash and EasyPaisa. All transactions are secured and encrypted."
    },
    {
        question: "Manage Your Account",
        answer: "You can update your shipping address, profile details, and security settings directly from your Account Dashboard. If you face any issues logging in, use the 'Forgot Password' link."
    },
    {
        question: "Shipping Rates & Policies",
        answer: "We offer free shipping on orders above Rs. 5000. For smaller orders, a flat shipping fee of Rs. 250 applies across Pakistan. Standard delivery time is 3-5 business days."
    }
];

const TikTokIcon = ({ size = 18 }: { size?: number }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" xmlns="http://www.w3.org/2000/svg">
        <path d="M12.525.02c1.31-.02 2.61-.01 3.91-.02.08 1.53.63 3.09 1.75 4.17 1.12 1.11 2.7 1.62 4.24 1.79v4.03c-1.44-.05-2.89-.35-4.2-.97-.57-.26-1.1-.59-1.62-.93-.01 2.92.01 5.84-.02 8.75-.03 1.4-.54 2.79-1.35 3.94-1.31 1.92-3.58 3.17-5.91 3.21-1.43.08-2.86-.31-4.08-1.03-2.02-1.19-3.44-3.37-3.65-5.71-.02-.5-.03-1-.01-1.49.18-1.9 1.12-3.72 2.58-4.96 1.66-1.44 3.98-2.13 6.15-1.72.02 1.48-.04 2.96-.04 4.44-.9-.32-1.98-.23-2.81.31-.75.42-1.24 1.25-1.33 2.1-.1.7.1 1.41.54 1.96.44.53 1.05.85 1.72.95.75.11 1.55-.07 2.16-.54.65-.47.9-1.32 1.01-2.09.02-3.03.02-6.05.02-9.08z" />
    </svg>
);

export default function CustomerServicePage() {
    const [openIndex, setOpenIndex] = useState<number | null>(null);
    const [settings, setSettings] = useState<SiteSettings | null>(null);

    useEffect(() => {
        cmsService.getFullState().then(data => setSettings(data.settings));
    }, []);

    const toggleAccordion = (index: number) => {
        setOpenIndex(openIndex === index ? null : index);
    };

    return (
        <div className="min-h-screen bg-white font-sans text-[#0f1111]">
            <Navbar />

            {/* Same to Same Header as Tracking Page */}
            <div className="bg-white border-b border-[#D5D9D9] py-4 mb-10">
                <div className="max-w-[1240px] mx-auto px-6">
                    <h1 className="text-[24px] font-bold tracking-tight">Customer Service</h1>
                    <p className="text-[14px] text-[#565959] mt-1">How can we assist your beauty journey today?</p>
                </div>
            </div>

            <main className="max-w-[1100px] mx-auto px-6 pb-24">
                <div className="space-y-16">

                    {/* SECTION 1: Support Hub */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        <div className="p-8 border border-[#D5D9D9] rounded-[8px] flex flex-col items-center text-center hover:shadow-md transition-shadow">
                            <div className="w-12 h-12 bg-[#119AB8]/10 text-[#119AB8] rounded-full flex items-center justify-center mb-4">
                                <MessageSquare size={24} />
                            </div>
                            <h3 className="text-[17px] font-bold mb-2">Live Session</h3>
                            <p className="text-[13px] text-[#565959] mb-6">Instant connection with our skincare consultants for personalized guidance.</p>
                            <button className="w-full py-2 bg-[#119AB8] text-white rounded-[8px] text-[13px] font-bold hover:bg-[#13B0D1] transition-colors shadow-sm">Start Chat</button>
                        </div>
                        <div className="p-8 border border-[#D5D9D9] rounded-[8px] flex flex-col items-center text-center hover:shadow-md transition-shadow">
                            <div className="w-12 h-12 bg-[#119AB8]/10 text-[#119AB8] rounded-full flex items-center justify-center mb-4">
                                <Phone size={24} />
                            </div>
                            <h3 className="text-[17px] font-bold mb-2">Voice Hub</h3>
                            <p className="text-[13px] text-[#565959] mb-6">Speak directly with our regional logistics team for order and delivery status.</p>
                            <a href={`tel:${settings?.phone_number || '+923001234567'}`} className="w-full py-2 border border-[#D5D9D9] rounded-[8px] text-[13px] font-bold hover:bg-[#f7f8fa] text-center transition-colors">Dial Support</a>
                        </div>
                        <div className="p-8 border border-[#D5D9D9] rounded-[8px] flex flex-col items-center text-center hover:shadow-md transition-shadow">
                            <div className="w-12 h-12 bg-[#119AB8]/10 text-[#119AB8] rounded-full flex items-center justify-center mb-4">
                                <Mail size={24} />
                            </div>
                            <h3 className="text-[17px] font-bold mb-2">Email Desk</h3>
                            <p className="text-[13px] text-[#565959] mb-6">For formal inquiries, business partnership proposals, and distribution docs.</p>
                            <a href={`mailto:${settings?.contact_email || 'support@alqavi.com'}`} className="w-full py-2 border border-[#D5D9D9] rounded-[8px] text-[13px] font-bold hover:bg-[#f7f8fa] text-center transition-colors">Send Email</a>
                        </div>
                    </div>

                    {/* SECTION 2: Our Commitment */}
                    <div className="border border-[#D5D9D9] rounded-[8px] p-10 bg-white">
                        <div className="text-center mb-10">
                            <h3 className="text-[20px] font-bold tracking-tight mb-2">Standard of Excellence</h3>
                            <p className="text-[14px] text-[#565959] italic">We bridge the distance between global innovation and northern beauty needs.</p>
                        </div>
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
                            <div className="text-center">
                                <CheckCircle2 size={24} className="mx-auto text-[#119AB8] mb-4" />
                                <h4 className="text-[14px] font-bold">100% Genuine</h4>
                                <p className="text-[12px] text-[#565959] mt-1">Verified sources only.</p>
                            </div>
                            <div className="text-center">
                                <Truck size={24} className="mx-auto text-[#119AB8] mb-4" />
                                <h4 className="text-[14px] font-bold">Priority GB</h4>
                                <p className="text-[12px] text-[#565959] mt-1">Regional fast delivery.</p>
                            </div>
                            <div className="text-center">
                                <ShieldCheck size={24} className="mx-auto text-[#119AB8] mb-4" />
                                <h4 className="text-[14px] font-bold">Secure Pay</h4>
                                <p className="text-[12px] text-[#565959] mt-1">Encrypted gateways.</p>
                            </div>
                            <div className="text-center">
                                <ShoppingBag size={24} className="mx-auto text-[#119AB8] mb-4" />
                                <h4 className="text-[14px] font-bold">Fair Policy</h4>
                                <p className="text-[12px] text-[#565959] mt-1">Transparent returns.</p>
                            </div>
                        </div>
                    </div>

                    {/* SECTION 3: Business Partnerships */}
                    <div className="bg-[#131921] rounded-[8px] p-12 text-white relative overflow-hidden">
                        <div className="absolute top-0 right-0 p-10 opacity-10">
                            <Building2 size={120} />
                        </div>
                        <div className="max-w-2xl relative z-10">
                            <h2 className="text-[24px] font-bold mb-4 text-[#119AB8]">Wholesale & Business Partnerships</h2>
                            <p className="text-[15px] text-slate-300 mb-8 leading-relaxed">
                                Join our network of <span className="text-white font-bold">50+ regional partners</span>. Access tiered bulk pricing, priority inventory allocation, and professional marketing support.
                            </p>
                            <div className="flex flex-wrap gap-4">
                                <button className="px-8 py-2.5 bg-[#119AB8] rounded-[8px] text-[13px] font-bold hover:bg-[#13B0D1] transition-colors flex items-center gap-2">Partner Inquiry <ArrowRight size={16} /></button>
                                <button className="px-8 py-2.5 border border-white/20 rounded-[8px] text-[13px] font-bold hover:bg-white/10 transition-colors">Download Catalog</button>
                            </div>
                        </div>
                    </div>

                    {/* SECTION 4: FAQ & Operations */}
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 pt-8 border-t border-[#D5D9D9]">
                        <div>
                            <h2 className="text-[18px] font-bold mb-6">Support Help Topics</h2>
                            <div className="space-y-3">
                                {FAQS.map((faq, index) => (
                                    <div key={index} className="border border-[#D5D9D9] rounded-[8px] overflow-hidden">
                                        <button
                                            onClick={() => toggleAccordion(index)}
                                            className="w-full p-4 flex items-center justify-between text-left hover:bg-[#f7f8fa] transition-colors"
                                        >
                                            <span className="text-[14px] font-bold">{faq.question}</span>
                                            <div className="text-[#119AB8]">
                                                {openIndex === index ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
                                            </div>
                                        </button>
                                        <AnimatePresence>
                                            {openIndex === index && (
                                                <motion.div
                                                    initial={{ height: 0, opacity: 0 }}
                                                    animate={{ height: "auto", opacity: 1 }}
                                                    exit={{ height: 0, opacity: 0 }}
                                                    className="bg-white border-t border-[#D5D9D9] p-4 text-[13px] text-[#565959] leading-relaxed"
                                                >
                                                    {faq.answer}
                                                </motion.div>
                                            )}
                                        </AnimatePresence>
                                    </div>
                                ))}
                            </div>
                        </div>

                        <div className="space-y-10">
                            <div className="p-8 bg-[#f7f8fa] border border-[#D5D9D9] rounded-[8px] space-y-6">
                                <h2 className="text-[18px] font-bold">Gilgit-Baltistan Hub</h2>
                                <div className="flex gap-4">
                                    <MapPin size={20} className="text-[#119AB8] shrink-0 mt-1" />
                                    <div>
                                        <h4 className="font-bold text-[14px]">Main Distribution Center</h4>
                                        <p className="text-[#565959] text-[13px] mt-1 leading-relaxed">
                                            {settings?.address || 'Al-Qavi Hub, Block 4, Main Commercial Area, Gilgit City, GB, Pakistan'}
                                        </p>
                                    </div>
                                </div>
                                <div className="flex gap-4">
                                    <Clock size={20} className="text-[#119AB8] shrink-0 mt-1" />
                                    <div>
                                        <h4 className="font-bold text-[14px]">Service Window</h4>
                                        <p className="text-[#565959] text-[13px] mt-1">Monday - Saturday: 09:00 AM - 09:00 PM</p>
                                    </div>
                                </div>
                            </div>

                            <div className="flex gap-3">
                                {[
                                    { Icon: Instagram, url: settings?.instagram_url },
                                    { Icon: Facebook, url: settings?.facebook_url },
                                    { Icon: TikTokIcon, url: settings?.tiktok_url },
                                    { Icon: Youtube, url: settings?.youtube_url }
                                ].map((item, i) => (
                                    <a
                                        key={i}
                                        href={item.url || "#"}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="w-10 h-10 rounded-[8px] border border-[#D5D9D9] flex items-center justify-center text-[#565959] hover:text-[#119AB8] hover:border-[#119AB8] transition-all"
                                    >
                                        <item.Icon size={18} />
                                    </a>
                                ))}
                            </div>
                        </div>
                    </div>
                </div>
            </main>

            <Footer />
        </div>
    );
}
