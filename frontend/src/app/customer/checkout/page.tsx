'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
    CheckCircle, CreditCard, Truck, ShieldCheck, Lock,
    Smartphone, Banknote, ShoppingCart, Copy, Check, MapPin, X, Package,
    Camera, Upload, Image as ImageIcon, ChevronDown, ArrowRight
} from 'lucide-react';
import Navbar from '@/components/layout/Navbar';
import Footer from '@/components/layout/Footer';
import { useCart } from '@/context/CartContext';
import { getImageUrl } from '@/lib/utils';
import { salesService, settingsService } from '@/lib/api';
import { inventoryService } from '@/services/inventory.service';

const STORAGE_KEY = 'alqavi_checkout_info';

/* ═══════════════════════════════════════════════════════
   PURE AMAZON COMPONENTS (Sourced from Admin Design)
═══════════════════════════════════════════════════════ */
const AmazonField = ({ label, required, id, children }: any) => (
    <div className="space-y-2 group">
        <label htmlFor={id} className="block text-[13px] font-bold text-[#0f1111] cursor-pointer group-hover:text-[#119AB8] transition-colors">
            {label} {required && <span className="text-[#119AB8] ml-0.5">*</span>}
        </label>
        <div className="relative">
            {children}
        </div>
    </div>
);

export default function CheckoutPage() {
    const { items, cartTotal, clearCart, cartCount } = useCart();
    const router = useRouter();
    const [payMethod, setPayMethod] = useState<'card' | 'cod' | 'easypaisa'>('cod');
    const [shippingInfo, setShippingInfo] = useState({
        firstName: '',
        lastName: '',
        email: '',
        phone: '',
        whatsapp: '',
        address: '',
        city: '',
        branchId: '',
    });
    // Active branches the Super Admin created — the customer picks which branch
    // fulfils the order. Stock, assignment and deduction all follow this branch.
    const [branches, setBranches] = useState<any[]>([]);
    useEffect(() => {
        inventoryService.getPublicBranches().then((list) => {
            const arr = Array.isArray(list) ? list : [];
            setBranches(arr);
            // Pre-select the branch matching the storefront's selected city, if any.
            try {
                const city = localStorage.getItem('deliver_to_city') || '';
                if (city) {
                    const match = arr.find((b: any) => (b.area || '').toLowerCase() === city.toLowerCase());
                    if (match) setShippingInfo(prev => prev.branchId ? prev : { ...prev, branchId: String(match.id), city: match.area || prev.city });
                }
            } catch { }
        }).catch(() => setBranches([]));
    }, []);
    const [isProcessing, setIsProcessing] = useState(false);
    const [showReview, setShowReview] = useState(false);
    const [placedOrderNumber, setPlacedOrderNumber] = useState<string | null>(null);
    const [copied, setCopied] = useState(false);
    const [branchDropdownOpen, setBranchDropdownOpen] = useState(false);

    // Payment Specific State
    const [selectedEasypaisaNum, setSelectedEasypaisaNum] = useState('');
    const [receiptImage, setReceiptImage] = useState<File | null>(null);
    const [receiptPreview, setReceiptPreview] = useState<string | null>(null);
    const [cardDetails, setCardDetails] = useState({
        number: '',
        expiry: '',
        cvv: '',
        name: ''
    });

    const isLoggedIn = typeof window !== 'undefined' ? !!sessionStorage.getItem('accessToken') : false;

    // Load saved shipping info only for registered users
    useEffect(() => {
        if (!isLoggedIn) return;

        try {
            const saved = localStorage.getItem(STORAGE_KEY);
            if (saved) {
                const parsed = JSON.parse(saved);
                setShippingInfo(prev => ({ ...prev, ...parsed }));
                return;
            }
        } catch { }

        settingsService.getProfile().then((profile: any) => {
            if (profile) {
                setShippingInfo(prev => ({
                    ...prev,
                    firstName: profile.first_name || '',
                    lastName: profile.last_name || '',
                    email: profile.email || '',
                    phone: profile.phone || profile.phone_number || '',
                    whatsapp: profile.whatsapp || profile.phone || profile.phone_number || '',
                    address: profile.address || '',
                    city: profile.city || '',
                }));
            }
        }).catch(() => { });
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
        if (!shippingInfo.branchId) { alert('Please select a branch to receive your order from.'); return; }
        if (payMethod === 'easypaisa') {
            if (!selectedEasypaisaNum) { alert('Please select an Easypaisa account number.'); return; }
            if (!receiptImage) { alert('Please upload or capture your transaction receipt.'); return; }
        } else if (payMethod === 'card') {
            if (!cardDetails.number || !cardDetails.expiry || !cardDetails.cvv || !cardDetails.name) {
                alert('Please fill in all credit card details.');
                return;
            }
        }
        localStorage.setItem(STORAGE_KEY, JSON.stringify(shippingInfo));
        setShowReview(true);
    };

    const processOrder = async () => {
        setIsProcessing(true);
        try {
            const paymentNotes = payMethod === 'easypaisa'
                ? `Easypaisa: ${selectedEasypaisaNum}`
                : payMethod === 'card'
                    ? `Card: ${cardDetails.number.slice(-4)}`
                    : 'COD';

            const payload = {
                customer_name: `${shippingInfo.firstName} ${shippingInfo.lastName}`.trim(),
                shipping_address: `${shippingInfo.address}, ${shippingInfo.city}`,
                phone_number: shippingInfo.phone,
                whatsapp_number: shippingInfo.whatsapp,
                payment_method: payMethod === 'cod' ? 'COD' : 'ONLINE',
                // Route the order to the customer-selected branch: it lands in that
                // branch's admin panel and deducts that branch's stock on delivery.
                warehouse_id: shippingInfo.branchId,
                notes: `Email: ${shippingInfo.email} | Auth: ${isLoggedIn ? 'User' : 'Guest'} | PayInfo: ${paymentNotes}`,
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
                    <Link href={`/customer/tracking?tid=${placedOrderNumber}`} className="flex-1 py-3 bg-[#119AB8] text-white font-bold rounded-xl border border-[#119AB8] hover:bg-[#13B0D1] transition-all text-center">Track Order</Link>
                    <Link href="/customer" className="flex-1 py-3 bg-white border border-gray-200 text-slate-700 font-bold rounded-xl hover:bg-gray-50 transition-all text-center">Back to Shop</Link>
                </div>
            </div>
        );
    }

    if (items.length === 0) {
        return (
            <div className="min-h-screen bg-[#F8F9FA] flex flex-col items-center justify-center p-8 text-center">
                <ShoppingCart className="h-16 w-16 text-slate-300 mb-6" />
                <h2 className="text-2xl font-bold text-slate-900 mb-4">Your cart is empty</h2>
                <Link href="/customer" className="px-10 py-2.5 bg-[#119AB8] text-white font-bold rounded-[8px] border border-[#119AB8] shadow-sm">Browse Products</Link>
            </div>
        );
    }

    const cardCls = "bg-white border border-[#D5D9D9] rounded-[8px] shadow-sm overflow-hidden mb-6";
    const headerCls = "px-6 py-4 border-b border-[#D5D9D9] bg-[#f7f8fa]";
    const inputCls = "w-full h-[46px] px-4 border border-[#D5D9D9] rounded-[8px] text-[14px] outline-none hover:border-[#119AB8] focus:border-[#119AB8] focus:shadow-[0_0_0_2px_rgba(17,154,184,0.1)] font-medium transition-all bg-white cursor-text";
    const selectCls = "w-full h-[46px] px-4 border border-[#D5D9D9] rounded-[8px] text-[14px] outline-none hover:border-[#119AB8] focus:border-[#119AB8] focus:shadow-[0_0_0_2px_rgba(17,154,184,0.1)] font-medium transition-all bg-white cursor-pointer appearance-none";
    const btnPrimary = "w-full h-[42px] bg-[#119AB8] hover:bg-[#13B0D1] rounded-[8px] text-[14px] font-bold text-white shadow-sm active:scale-[0.98] transition-all flex items-center justify-center gap-2";

    return (
        <div className="min-h-screen bg-white font-sans pb-20 text-[#0f1111]">
            <Navbar />
            
            {/* Same to Same Header as Gift Cards */}
            <div className="bg-white border-b border-[#D5D9D9] py-4 mb-10">
                <div className="max-w-[1240px] mx-auto px-6">
                     <h1 className="text-[24px] font-bold tracking-tight">Checkout</h1>
                     <p className="text-[14px] text-[#565959] mt-1">Finalize your premium order from Al-Qavi Hub</p>
                </div>
            </div>

            <div className="max-w-[1100px] mx-auto px-6 py-8">
                <form onSubmit={handlePlaceOrder} className="flex flex-col lg:flex-row gap-6 items-start">
                    <div className="flex-1 space-y-5 min-w-0 w-full">
                        <div className={cardCls}>
                            <div className={headerCls}>
                                <h3 className="text-[14px] font-bold text-[#0f1111]">1. Shipping Address</h3>
                                <p className="text-[12px] text-[#565959]">Please enter the delivery destination.</p>
                            </div>
                            <div className="p-6 grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-4">
                                <AmazonField label="First Name" id="firstName" required>
                                    <input id="firstName" className={inputCls} required value={shippingInfo.firstName} onChange={(e: any) => setShippingInfo({ ...shippingInfo, firstName: e.target.value })} placeholder="Your First Name" />
                                </AmazonField>
                                <AmazonField label="Last Name" id="lastName" required>
                                    <input id="lastName" className={inputCls} required value={shippingInfo.lastName} onChange={(e: any) => setShippingInfo({ ...shippingInfo, lastName: e.target.value })} placeholder="Your Last Name" />
                                </AmazonField>
                                <AmazonField label="Phone Number" id="phone" required>
                                    <input id="phone" className={inputCls} required value={shippingInfo.phone} onChange={(e: any) => setShippingInfo({ ...shippingInfo, phone: e.target.value })} placeholder="e.g. 0300 1234567" />
                                </AmazonField>
                                <AmazonField label="Email Address (Optional)" id="email">
                                    <input id="email" className={inputCls} type="email" value={shippingInfo.email} onChange={(e: any) => setShippingInfo({ ...shippingInfo, email: e.target.value })} placeholder="email@example.com" />
                                </AmazonField>
                                <AmazonField label="WhatsApp Number" id="whatsapp" required>
                                    <input id="whatsapp" className={inputCls} required value={shippingInfo.whatsapp} onChange={(e: any) => setShippingInfo({ ...shippingInfo, whatsapp: e.target.value })} placeholder="e.g. 923001234567" />
                                    <p className="text-[10px] text-slate-500 mt-1">Order confirmation will be sent here.</p>
                                </AmazonField>
                                <div className="sm:col-span-2">
                                    <AmazonField label="Full Street Address" id="address" required>
                                        <textarea
                                            id="address"
                                            required
                                            rows={2}
                                            value={shippingInfo.address}
                                            onChange={(e) => setShippingInfo({ ...shippingInfo, address: e.target.value })}
                                            className="w-full px-4 py-3 border border-[#888c8e] rounded-[8px] text-[15px] outline-none hover:border-[#555] focus:border-[#119AB8] focus:shadow-[0_0_3px_2px_rgba(228,121,17,0.3)] font-medium transition-all min-h-[80px]"
                                            placeholder="House #, Street Name, Area..."
                                        />
                                    </AmazonField>
                                </div>
                                <AmazonField label="Select Branch" id="branch" required>
                                    <div className="relative">
                                        <button
                                            type="button"
                                            id="branch"
                                            onClick={() => setBranchDropdownOpen(!branchDropdownOpen)}
                                            className="w-full h-[46px] px-4 flex items-center justify-between rounded-[8px] border border-[#D5D9D9] bg-white text-[14px] font-medium text-slate-700 outline-none hover:border-[#119AB8] focus:border-[#119AB8] transition-all cursor-pointer select-none text-left"
                                        >
                                            <span className="truncate">
                                                {shippingInfo.branchId ? (() => {
                                                    const b = branches.find((x: any) => String(x.id) === shippingInfo.branchId);
                                                    return b ? (b.name + (b.area ? ` - ${b.area}` : '')) : 'Select Branch';
                                                })() : 'Select Branch'}
                                            </span>
                                            <ChevronDown size={18} className="text-slate-400" />
                                        </button>
                                        {branchDropdownOpen && (
                                            <>
                                                <div className="fixed inset-0 z-[100]" onClick={() => setBranchDropdownOpen(false)} />
                                                <div className="absolute left-0 right-0 mt-1 max-h-60 overflow-y-auto bg-white border border-[#D5D9D9] rounded-[8px] shadow-lg z-[110] divide-y divide-slate-100 text-[14px] font-medium text-[#0f1111] animate-in fade-in slide-in-from-top-1 duration-150">
                                                    <div
                                                        onClick={() => {
                                                            setShippingInfo({ ...shippingInfo, branchId: '' });
                                                            setBranchDropdownOpen(false);
                                                        }}
                                                        className={`px-4 py-3 cursor-pointer hover:bg-slate-50 transition-colors ${!shippingInfo.branchId ? 'bg-indigo-50 text-indigo-700' : ''}`}
                                                    >
                                                        Select Branch
                                                    </div>
                                                    {branches.map((b: any) => (
                                                        <div
                                                            key={b.id}
                                                            onClick={() => {
                                                                setShippingInfo({ ...shippingInfo, branchId: String(b.id), city: b.area || b.name || shippingInfo.city });
                                                                setBranchDropdownOpen(false);
                                                            }}
                                                            className={`px-4 py-3 cursor-pointer hover:bg-slate-50 transition-colors truncate ${String(shippingInfo.branchId) === String(b.id) ? 'bg-indigo-50 text-indigo-700 font-bold' : ''}`}
                                                        >
                                                            {b.name}{b.area ? ` - ${b.area}` : ''}
                                                        </div>
                                                    ))}
                                                </div>
                                            </>
                                        )}
                                    </div>
                                </AmazonField>
                            </div>
                        </div>

                        <div className={cardCls}>
                            <div className={headerCls}>
                                <h3 className="text-[14px] font-bold text-[#0f1111]">2. Payment Method</h3>
                                <p className="text-[12px] text-[#565959]">Select how you would like to pay.</p>
                            </div>
                            <div className="p-6 space-y-3">
                                {[
                                    { id: 'cod', name: 'Cash on Delivery (COD)', desc: 'Scan & Pay or Cash at doorstep' },
                                    { id: 'easypaisa', name: 'Easypaisa / Mobile Wallet', desc: 'Secure digital payment' },
                                    { id: 'card', name: 'Credit or Debit Card', desc: 'Visa, Mastercard, PayPak' }
                                ].map(m => (
                                    <div key={m.id} className="space-y-3">
                                        <label className={`block p-4 border rounded-[8px] cursor-pointer transition-all ${payMethod === m.id ? 'border-[#119AB8] bg-[#f7f8fa]' : 'border-[#D5D9D9] hover:bg-[#f7f8fa]'}`}>
                                            <div className="flex gap-3">
                                                <input type="radio" name="payment" value={m.id} checked={payMethod === m.id} onChange={() => setPayMethod(m.id as any)} className="mt-1 accent-[#119AB8]" />
                                                <div>
                                                    <p className="text-[13px] font-bold text-[#0f1111]">{m.name}</p>
                                                    <p className="text-[11px] text-[#565959]">{m.desc}</p>
                                                </div>
                                            </div>
                                        </label>

                                        {payMethod === 'easypaisa' && m.id === 'easypaisa' && (
                                            <div className="ml-8 p-4 border border-[#D5D9D9] rounded-[8px] bg-white space-y-4 animate-in slide-in-from-top-2 duration-200">
                                                <p className="text-[12px] font-bold text-[#565959] mb-2 uppercase tracking-wider">Select Account Number:</p>
                                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                                    {[
                                                        { num: '0345-1234567', name: 'Al-Qavi Cosmetics (Easypaisa)' },
                                                        { num: '0312-7654321', name: 'Al-Qavi Retail (Easypaisa)' }
                                                    ].map(acc => (
                                                        <button
                                                            key={acc.num}
                                                            type="button"
                                                            onClick={() => setSelectedEasypaisaNum(acc.num)}
                                                            className={`p-3 text-left border rounded-[8px] transition-all ${selectedEasypaisaNum === acc.num ? 'border-[#119AB8] bg-[#f7f8fa] ring-1 ring-[#119AB8]' : 'border-[#D5D9D9] hover:bg-gray-50'}`}
                                                        >
                                                            <p className="text-[13px] font-bold">{acc.num}</p>
                                                            <p className="text-[11px] text-[#565959]">{acc.name}</p>
                                                        </button>
                                                    ))}
                                                </div>
                                                {selectedEasypaisaNum && (
                                                    <div className="pt-4 border-t border-dashed border-[#D5D9D9] space-y-3">
                                                        <p className="text-[12px] font-bold text-[#565959] uppercase tracking-wider">Upload Transaction Receipt:</p>
                                                        <div className="flex flex-col sm:flex-row gap-4">
                                                            <label className="flex-1 cursor-pointer">
                                                                <div className="h-[100px] border-2 border-dashed border-[#D5D9D9] rounded-[8px] flex flex-col items-center justify-center gap-2 hover:border-[#119AB8] hover:bg-[#f7f8fa] transition-all bg-gray-50">
                                                                    {receiptPreview ? (
                                                                        <img src={receiptPreview} className="h-full w-full object-cover rounded-[6px]" />
                                                                    ) : (
                                                                        <>
                                                                            <Camera className="h-6 w-6 text-gray-400" />
                                                                            <span className="text-[11px] font-medium text-gray-500">Capture or Upload</span>
                                                                        </>
                                                                    )}
                                                                </div>
                                                                <input
                                                                    type="file"
                                                                    accept="image/*"
                                                                    className="hidden"
                                                                    onChange={(e) => {
                                                                        const file = e.target.files?.[0];
                                                                        if (file) {
                                                                            setReceiptImage(file);
                                                                            setReceiptPreview(URL.createObjectURL(file));
                                                                        }
                                                                    }}
                                                                />
                                                            </label>
                                                            <div className="flex-1 space-y-2">
                                                                <p className="text-[11px] text-[#565959] leading-relaxed">Please transfer the total amount and upload screenshot.</p>
                                                                <div className="flex items-center gap-2 text-[11px] font-bold text-[#119AB8]"><ShieldCheck className="h-3 w-3" /><span>Verified Account</span></div>
                                                            </div>
                                                        </div>
                                                    </div>
                                                )}
                                            </div>
                                        )}

                                        {payMethod === 'card' && m.id === 'card' && (
                                            <div className="ml-8 p-6 border border-[#D5D9D9] rounded-[8px] bg-white space-y-4 animate-in slide-in-from-top-2 duration-200">
                                                <AmazonField label="Name on card" id="cardName" required>
                                                    <input id="cardName" className={inputCls} value={cardDetails.name} onChange={(e) => setCardDetails({ ...cardDetails, name: e.target.value })} placeholder="Full Name" />
                                                </AmazonField>
                                                <AmazonField label="Card number" id="cardNumber" required>
                                                    <div className="relative">
                                                        <input id="cardNumber" className={inputCls} value={cardDetails.number} onChange={(e) => setCardDetails({ ...cardDetails, number: e.target.value })} placeholder="0000 0000 0000 0000" maxLength={19} />
                                                        <CreditCard className="absolute right-4 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
                                                    </div>
                                                </AmazonField>
                                                <div className="grid grid-cols-2 gap-4">
                                                    <AmazonField label="Expiration date" id="cardExpiry" required>
                                                        <input id="cardExpiry" className={inputCls} value={cardDetails.expiry} onChange={(e) => setCardDetails({ ...cardDetails, expiry: e.target.value })} placeholder="MM / YY" maxLength={5} />
                                                    </AmazonField>
                                                    <AmazonField label="Security code (CVV)" id="cardCvv" required>
                                                        <input id="cardCvv" className={inputCls} type="password" value={cardDetails.cvv} onChange={(e) => setCardDetails({ ...cardDetails, cvv: e.target.value })} placeholder="123" maxLength={4} />
                                                    </AmazonField>
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                ))}
                            </div>
                        </div>

                        <div className={cardCls}>
                            <div className={headerCls}>
                                <h3 className="text-[14px] font-bold text-[#0f1111]">3. Items and Shipping</h3>
                                <p className="text-[12px] text-[#565959]">Review products before placing order.</p>
                            </div>
                            <div className="divide-y divide-[#eee]">
                                {items.map((item: any) => (
                                    <div key={item.id} className="p-6 flex gap-6">
                                        <div className="w-16 h-16 shrink-0 border border-[#eee] rounded-[8px] p-2 flex items-center justify-center bg-white">
                                            <img src={getImageUrl(item.image)} className="max-w-full max-h-full object-contain" alt={item.name} />
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <h4 className="text-[14px] font-bold text-[#119AB8] hover:text-[#119AB8] hover:underline cursor-pointer">{item.name}</h4>
                                            <p className="text-[11px] font-bold text-[#119AB8] mt-1 italic">Qualifies for Fast Shipping</p>
                                            <div className="flex items-center gap-4 mt-2">
                                                <span className="text-[13px] font-black text-[#0f1111]">PKR {parseFloat(item.price).toLocaleString()}</span>
                                                <span className="text-[11px] text-[#565959] font-bold bg-[#f3f3f3] px-2 py-0.5 rounded">Qty: {item.quantity}</span>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>

                    <div className="w-full lg:w-[320px] sticky top-[80px]">
                        <div className="bg-white border border-[#D5D9D9] rounded-[8px] p-5 space-y-5">
                            <button type="submit" className={btnPrimary + " h-[35px] text-[14px]"}>Use this payment method</button>
                            <p className="text-[11px] text-[#565959] text-center px-2 leading-tight">By placing your order, you agree to Al-Qavi's <span className="text-[#119AB8] hover:underline cursor-pointer">privacy notice</span> and <span className="text-[#119AB8] hover:underline cursor-pointer">conditions of use</span>.</p>
                            <div className="pt-4 border-t border-[#eee] space-y-3">
                                <h3 className="text-[16px] font-bold text-[#0f1111]">Order Summary</h3>
                                <div className="space-y-2 text-[12px] text-[#0f1111]">
                                    <div className="flex justify-between"><span className="text-[#565959]">Items:</span><span>PKR {cartTotal.toLocaleString()}</span></div>
                                    <div className="flex justify-between"><span className="text-[#565959]">Shipping & handling:</span><span>PKR {shipping.toLocaleString()}</span></div>
                                    <div className="pt-2 flex justify-between"><span className="w-full border-t border-[#eee]" /></div>
                                    <div className="flex justify-between"><span className="text-[#565959]">Total before tax:</span><span>PKR {total.toLocaleString()}</span></div>
                                </div>
                                <div className="pt-4 border-t border-[#eee]">
                                    <div className="flex justify-between items-center">
                                        <span className="text-[17px] font-bold text-[#119AB8]">Order Total:</span>
                                        <span className="text-[17px] font-bold text-[#119AB8]">PKR {total.toLocaleString()}</span>
                                    </div>
                                </div>
                            </div>
                        </div>
                        <div className="mt-4 bg-[#f1f1f1] border border-[#D5D9D9] rounded-[8px] p-4 flex gap-3">
                            <ShieldCheck className="h-5 w-5 text-[#565959] shrink-0" />
                            <p className="text-[11px] text-[#565959] leading-tight">Your data is encrypted and secure. We do not store full credit card details on our local servers.</p>
                        </div>
                    </div>
                </form>
            </div>

            {showReview && (
                <div className="fixed inset-0 z-[1000] flex items-center justify-center p-4 bg-black/60 backdrop-blur-[2px]">
                    <div className="bg-white rounded-[8px] w-full max-w-2xl max-h-[90vh] overflow-hidden border border-[#D5D9D9] shadow-2xl animate-in zoom-in-95 duration-200">
                        <div className="bg-[#f7f8fa] border-b border-[#D5D9D9] px-8 py-5 flex items-center justify-between">
                            <h2 className="text-[20px] font-medium text-[#0f1111]">Review your order</h2>
                            <button onClick={() => setShowReview(false)} className="text-[#565959] hover:text-[#0f1111] transition-colors"><X size={24} /></button>
                        </div>
                        <div className="p-8 space-y-8 overflow-y-auto max-h-[calc(90vh-140px)]">
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-8">
                                <div className="space-y-2">
                                    <h3 className="text-[13px] font-bold text-[#0f1111] uppercase tracking-tighter">Shipping Address</h3>
                                    <div className="text-[13px] text-[#0f1111] space-y-0.5">
                                        <p className="font-bold">{shippingInfo.firstName} {shippingInfo.lastName}</p>
                                        <p>{shippingInfo.address}</p><p>{shippingInfo.city}</p>
                                        <div className="pt-2 space-y-0.5">
                                            <p className="text-[11px] text-[#565959]">Phone: {shippingInfo.phone}</p>
                                            <p className="text-[11px] text-[#565959]">WhatsApp: {shippingInfo.whatsapp}</p>
                                        </div>
                                    </div>
                                </div>
                                <div className="space-y-2">
                                    <h3 className="text-[13px] font-bold text-[#0f1111] uppercase tracking-tighter">Payment Method</h3>
                                    <p className="text-[13px] capitalize font-bold text-[#119AB8]">{payMethod.replace('cod', 'Cash on Delivery')}</p>
                                    <p className="text-[11px] text-[#565959]">Verification may be required upon delivery.</p>
                                </div>
                            </div>
                            <div className="border border-[#D5D9D9] rounded-[8px] overflow-hidden">
                                <div className="bg-[#f7f8fa] px-4 py-2 border-b border-[#D5D9D9] flex justify-between text-[11px] font-bold text-[#565959] uppercase tracking-widest">
                                    <span>Shipment 1 of 1</span><span>Estimated Delivery: 2-3 Days</span>
                                </div>
                                <div className="divide-y divide-[#eee]">
                                    {items.map((item: any) => (
                                        <div key={item.id} className="px-5 py-4 flex justify-between items-center text-[13px]">
                                            <div className="flex gap-4 items-center min-w-0">
                                                <div className="w-12 h-12 border border-[#eee] rounded-[2px] p-1 shrink-0 bg-white"><img src={getImageUrl(item.image)} className="w-full h-full object-contain" /></div>
                                                <span className="font-bold text-[#119AB8] truncate">{item.name}</span>
                                            </div>
                                            <div className="flex items-center gap-10 shrink-0">
                                                <span className="font-bold text-[#565959]">Qty: {item.quantity}</span>
                                                <span className="w-24 text-right font-black text-[#0f1111]">PKR {(parseFloat(item.price) * item.quantity).toLocaleString()}</span>
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
                                    <div className="flex justify-between text-[18px] font-bold text-[#119AB8] pt-3 border-t border-[#D5D9D9]"><span>Order Total:</span><span>PKR {total.toLocaleString()}</span></div>
                                </div>
                            </div>
                        </div>
                        <div className="bg-[#f7f8fa] border-t border-[#D5D9D9] p-6 flex justify-between items-center">
                            <button onClick={() => setShowReview(false)} className="text-[13px] text-[#119AB8] hover:text-[#119AB8] hover:underline font-bold">Edit Details</button>
                            <button onClick={processOrder} disabled={isProcessing} className="px-12 h-[38px] bg-[#119AB8] border border-[#119AB8] hover:bg-[#13B0D1] rounded-[8px] text-[14px] font-bold text-white shadow-sm disabled:opacity-50 active:scale-[0.98] transition-all">
                                {isProcessing ? 'Placing Order...' : 'Place your order'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
            {/* Order Review Modal remains the same but with rounded-8px as updated earlier */}
            <Footer />
        </div>
    );
}
