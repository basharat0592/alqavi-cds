'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Search, Package, Truck, CheckCircle2, AlertCircle, MapPin, ShoppingBag, Clock, ArrowLeft, RefreshCw, Loader2, ChevronRight, ChevronLeft, ShieldCheck, Box, MoreVertical, ExternalLink, Globe } from 'lucide-react';
import axios from 'axios';
import Navbar from '@/components/layout/Navbar';
import Footer from '@/components/layout/Footer';
import { formatCurrency, formatDate } from '@/lib/utils';
import Link from 'next/link';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://127.0.0.1:8000/api';

/* ─────────────────────────────────────────────────────────────────────────────
   PURE AMAZON RETAIL DESIGN SYSTEM - PUBLIC TRACKING VERSION 2.0
   ───────────────────────────────────────────────────────────────────────────── */
const Btn = ({ children, onClick, loading, variant = 'primary', className = '', type = 'button', disabled = false }: any) => {
    const styles = {
        primary: 'bg-[#FFD814] hover:bg-[#F7CA00] border-[#FCD200] text-[#0f1111] shadow-[0_2px_5px_0_rgba(213,217,217,0.5)]',
        secondary: 'bg-white hover:bg-[#f7f8fa] border-[#D5D9D9] text-[#0f1111] shadow-[0_2px_5px_0_rgba(213,217,217,0.5)]',
        danger: 'bg-red-50 hover:bg-red-100 border-red-200 text-red-700 shadow-sm'
    };
    return (
        <button type={type} onClick={onClick} disabled={loading || disabled}
            className={`h-[31px] px-4 rounded-[8px] text-[13px] font-medium border transition-all flex items-center justify-center gap-2 disabled:opacity-60 ${styles[variant as keyof typeof styles]} ${className}`}>
            {loading && <RefreshCw className="h-3 w-3 animate-spin" />}
            {children}
        </button>
    );
};

const inputCls = "w-full h-[45px] px-12 border border-[#D5D9D9] rounded-[8px] text-[16px] outline-none focus:border-[#e77600] focus:shadow-[0_0_0_3px_rgba(228,121,17,0.3)] placeholder:text-[#888] bg-white transition-all font-medium";

export default function TrackingPage() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const [trackingId, setTrackingId] = useState('');
    const [order, setOrder] = useState<any>(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const pollingRef = useRef<NodeJS.Timeout | null>(null);
    const trackingIdRef = useRef('');

    // Fetch order by tracking ID
    const fetchOrder = useCallback(async (tid: string, showLoading = true) => {
        if (!tid.trim()) return;
        if (showLoading) setLoading(true);
        setError('');

        try {
            const { data } = await axios.get(`${API_URL}/v1/sales/orders/track/?tid=${tid}`);
            setOrder(data);
        } catch (err: any) {
            if (showLoading) {
                setError(err.response?.data?.error || 'Order not found. Please check your ID.');
                setOrder(null);
            }
        } finally {
            if (showLoading) setLoading(false);
        }
    }, []);

    // Start polling for real-time updates
    const startPolling = useCallback((tid: string) => {
        // Clear any existing polling
        if (pollingRef.current) {
            clearInterval(pollingRef.current);
        }
        trackingIdRef.current = tid;
        pollingRef.current = setInterval(() => {
            fetchOrder(trackingIdRef.current, false); // silent refresh
        }, 5000); // poll every 5 seconds
    }, [fetchOrder]);

    // Stop polling on unmount
    useEffect(() => {
        return () => {
            if (pollingRef.current) {
                clearInterval(pollingRef.current);
            }
        };
    }, []);

    // Auto-read tid from URL and auto-fetch on page load
    useEffect(() => {
        const tidFromUrl = searchParams.get('tid');
        if (tidFromUrl) {
            setTrackingId(tidFromUrl);
            fetchOrder(tidFromUrl).then(() => {
                startPolling(tidFromUrl);
            });
        }
    }, [searchParams, fetchOrder, startPolling]);

    const handleTrack = async (e?: React.FormEvent) => {
        if (e) e.preventDefault();
        if (!trackingId.trim()) return;

        await fetchOrder(trackingId);
        startPolling(trackingId);
    };

    const steps = [
        { label: 'Pending', status: 'PENDING', icon: Clock },
        { label: 'Confirmed', status: 'CONFIRMED', icon: CheckCircle2 },
        { label: 'Processing', status: 'PROCESSING', icon: Package },
        { label: 'Shipped', status: 'SHIPPED', icon: Globe },
        { label: 'Delivered', status: 'DELIVERED', icon: MapPin },
    ];

    const currentStepIndex = steps.findIndex(s => s.status === order?.status);

    return (
        <div className="bg-white min-h-screen font-sans text-[#0f1111]">
            <Navbar />
            
            <div className="bg-white border-b border-[#D5D9D9] py-4 mb-10">
                <div className="max-w-[1240px] mx-auto px-6">
                     <h1 className="text-[24px] font-bold tracking-tight">Track Your Shipment</h1>
                     <p className="text-[14px] text-[#565959] mt-1">Real-time status updates for your cosmetic order</p>
                </div>
            </div>

            <main className="max-w-[1100px] mx-auto px-6 pb-24">
                {/* Search Bar */}
                <div className="mb-12 group">
                    <form onSubmit={handleTrack} className="relative max-w-2xl mx-auto drop-shadow-sm hover:drop-shadow-md transition-all">
                        <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-[#888] group-focus-within:text-[#e77600]" />
                        <input
                            type="text"
                            value={trackingId}
                            onChange={(e) => setTrackingId(e.target.value)}
                            placeholder="Enter Tracking ID (e.g. ALQ-123456)"
                            className={inputCls}
                        />
                        <button type="submit" disabled={loading} className="absolute right-1.5 top-1.5 bottom-1.5 px-8 rounded-[7px] bg-[#FFD814] hover:bg-[#F7CA00] text-[14px] font-bold transition-colors">
                            {loading ? <Loader2 size={16} className="animate-spin" /> : 'Track'}
                        </button>
                    </form>
                    {error && <div className="mt-4 flex items-center gap-2 justify-center text-red-600 animate-in slide-in-from-top-2 duration-300"><AlertCircle size={14} /> <span className="text-[13px] font-medium">{error}</span></div>}
                </div>

                {order ? (
                    <div className="animate-in fade-in duration-700 space-y-8">
                        
                        {/* Summary Header */}
                        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 border-b border-[#D5D9D9] pb-6">
                            <div>
                                <h2 className="text-[28px] font-bold text-[#111] mb-1 leading-tight tracking-tight uppercase italic">
                                    {order.status === 'DELIVERED' ? 'Arrived' : 
                                     order.status === 'CANCELLED' ? 'Cancelled' : 
                                     order.status === 'SHIPPED' ? 'In Transit' : 'In Preparation'}
                                </h2>
                                <div className="flex items-center gap-2 text-[14px] text-[#565959]">
                                    <span className="font-medium">Tracking ID: <b className="text-[#111]">{order.tracking_id}</b></span>
                                    <span className="w-1 h-1 bg-[#D5D9D9] rounded-full" />
                                    <span>Placed on {formatDate(order.created_at)}</span>
                                </div>
                            </div>
                            <div className="flex gap-2">
                                <Btn variant="secondary" className="font-bold">Share Link</Btn>
                                <Btn variant="secondary" className="font-bold">Contact Support</Btn>
                            </div>
                        </div>

                        {/* Tracking Grid */}
                        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                            
                            {/* Left: Progress & Items */}
                            <div className="lg:col-span-2 space-y-6">
                                
                                <div className="bg-white border border-[#D5D9D9] rounded-[8px] p-8 shadow-sm">
                                    {/* Amazon Progress Tracker */}
                                    <div className="relative mb-20 px-4">
                                        <div className="absolute top-1/2 left-0 right-0 h-1.5 bg-[#F0F2F2] -translate-y-1/2 rounded-full" />
                                        {currentStepIndex >= 0 && order.status !== 'CANCELLED' && (
                                            <div 
                                                className="absolute top-1/2 left-0 h-1.5 bg-[#007600] -translate-y-1/2 rounded-full transition-all duration-1000 ease-out" 
                                                style={{ width: `${(currentStepIndex / (steps.length - 1)) * 100}%` }}
                                            />
                                        )}
                                        
                                        <div className="relative flex justify-between items-center">
                                            {steps.map((step, idx) => {
                                                const isCompleted = order.status !== 'CANCELLED' && idx <= currentStepIndex;
                                                const isCurrent = order.status !== 'CANCELLED' && idx === currentStepIndex;
                                                const Icon = step.icon;

                                                return (
                                                    <div key={idx} className="flex flex-col items-center relative group">
                                                        <div className={`w-10 h-10 rounded-full border-2 flex items-center justify-center bg-white z-10 transition-all duration-500
                                                            ${isCompleted ? 'border-[#007600] text-[#007600] scale-110 shadow-sm' : 'border-[#D5D9D9] text-[#888]'}`}>
                                                            {isCompleted ? <CheckCircle2 size={20} fill="currentColor" className="text-white bg-[#007600] rounded-full" /> : <Icon size={18} />}
                                                        </div>
                                                        <div className="absolute top-14 flex flex-col items-center min-w-[100px] text-center">
                                                            <p className={`text-[11px] font-bold uppercase tracking-tight leading-tight ${isCompleted ? 'text-[#007600]' : 'text-[#888]'}`}>{step.label}</p>
                                                            {isCurrent && <span className="text-[9px] text-[#c45500] font-black animate-pulse mt-1">CURRENT STATUS</span>}
                                                        </div>
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    </div>

                                    {/* Latest Update Status */}
                                    <div className="flex items-center gap-4 pt-6 border-t border-[#F0F2F2]">
                                        <div className="w-12 h-12 bg-emerald-50 text-emerald-600 rounded-full flex items-center justify-center shrink-0">
                                            <RefreshCw size={20} className="animate-spin duration-[4s]" />
                                        </div>
                                        <div>
                                            <p className="text-[15px] font-bold text-[#111]">Auto-Refreshing Status</p>
                                            <p className="text-[13px] text-[#565959]">We are monitoring your shipment in real-time. Last checked just now.</p>
                                        </div>
                                    </div>
                                </div>

                                {/* Items Visualization */}
                                <div className="bg-white border border-[#D5D9D9] rounded-[8px] p-6 shadow-sm">
                                    <h3 className="text-[17px] font-bold text-[#111] mb-5">Order Content</h3>
                                    <div className="space-y-4">
                                        {order.items?.map((item: any) => (
                                            <div key={item.id} className="flex gap-4 p-4 border border-[#F0F2F2] rounded-[8px] hover:bg-[#F7F8FA] transition-colors group">
                                                <div className="w-20 h-20 bg-white border border-[#F0F2F2] rounded-[8px] p-2 flex items-center justify-center shrink-0 overflow-hidden">
                                                    <img 
                                                       src={item.image ? (API_URL.replace('/api', '') + item.image) : '/images/logo.png'} 
                                                       alt="" 
                                                       className="w-full h-full object-contain group-hover:scale-110 transition-transform duration-500"
                                                   />
                                                </div>
                                                <div className="flex-1">
                                                    <div className="flex justify-between items-start gap-4">
                                                        <p className="text-[15px] font-bold text-[#007185] hover:text-[#c45500] cursor-pointer leading-tight">{item.product_name}</p>
                                                        <p className="text-[15px] font-bold text-[#111]">{formatCurrency(item.price * item.quantity)}</p>
                                                    </div>
                                                    <div className="flex items-center gap-3 mt-2 text-[12px] text-[#565959] font-medium uppercase tracking-wider">
                                                        <span>Quantity: <b className="text-[#111]">{item.quantity}</b></span>
                                                        <span className="w-1 h-1 bg-[#D5D9D9] rounded-full" />
                                                        <span>Price: {formatCurrency(item.price)}</span>
                                                    </div>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            </div>

                            {/* Right: Sidebar Info */}
                            <div className="space-y-6">
                                
                                {/* Shipment Summary Box */}
                                <div className="bg-white border border-[#D5D9D9] rounded-[8px] shadow-sm overflow-hidden">
                                     <div className="bg-[#F0F2F2] px-5 py-3 border-b border-[#D5D9D9]">
                                        <h3 className="text-[14px] font-bold text-[#111]">Shipment Summary</h3>
                                     </div>
                                     <div className="p-5 space-y-6">
                                        <div className="space-y-2">
                                            <p className="text-[11px] text-[#565959] font-bold uppercase tracking-wider">Customer Name</p>
                                            <p className="text-[16px] font-black text-[#111] uppercase tracking-tighter">{order.customer_name}</p>
                                        </div>
                                        <div className="space-y-2 border-t border-[#F0F2F2] pt-4">
                                            <p className="text-[11px] text-[#565959] font-bold uppercase tracking-wider">Delivery Destination</p>
                                            <p className="text-[14px] font-medium text-[#111] leading-relaxed">
                                                <MapPin size={14} className="inline mr-1 text-[#565959]" /> {order.shipping_address}<br />
                                                <span className="text-[12px] text-[#007185] cursor-pointer hover:underline flex items-center gap-1 mt-2 font-bold tracking-tight">VIEW ON MAP <ExternalLink size={12} /></span>
                                            </p>
                                        </div>
                                        <div className="space-y-2 border-t border-[#F0F2F2] pt-4">
                                            <p className="text-[11px] text-[#565959] font-bold uppercase tracking-wider">Payment Details</p>
                                            <p className="text-[14px] font-bold text-[#111] mb-1">Method: {order.payment_method || 'COD'}</p>
                                            <div className="bg-[#111] text-[#F59E0B] p-3 rounded-[4px] mt-2">
                                                <p className="text-[10px] uppercase font-bold text-white/50 mb-1">Total Bill</p>
                                                <p className="text-[20px] font-black tracking-tighter">Rs. {parseFloat(order.total_amount).toLocaleString()}</p>
                                            </div>
                                        </div>
                                     </div>
                                </div>

                                {/* Security Banner */}
                                <div className="bg-[#FDF8E1] border border-[#F5D8A4] rounded-[8px] p-5 flex gap-3">
                                    <ShieldCheck className="shrink-0 text-[#c45500]" size={20} />
                                    <div>
                                        <p className="text-[13px] font-bold text-[#111]">Secured Tracking</p>
                                        <p className="text-[12px] text-[#565959] mt-1 leading-normal italic">Your order data is encrypted. Log in to your account for more control over your deliveries.</p>
                                    </div>
                                </div>

                                {/* Support Card */}
                                <div className="border border-[#D5D9D9] rounded-[8px] p-5 bg-[#F7F8FA]">
                                    <p className="text-[13px] font-bold text-[#111]">Need assistance?</p>
                                    <p className="text-[12px] text-[#565959] mt-1 mb-4">Contact our priority support line for any shipment queries.</p>
                                    <Btn variant="secondary" className="w-full font-bold">Call Helpline</Btn>
                                </div>

                            </div>

                        </div>
                    </div>
                ) : !loading && (
                    <div className="flex flex-col items-center justify-center py-32 border-2 border-dashed border-[#D5D9D9] rounded-[16px] bg-[#F7F8FA] animate-in zoom-in duration-500">
                        <div className="relative mb-6">
                            <Box size={80} className="text-[#D5D9D9]" />
                            <Search size={32} className="absolute -bottom-2 -right-2 text-[#e77600] bg-white rounded-full p-1.5 shadow-md" />
                        </div>
                        <h2 className="text-[22px] font-bold text-[#111]">Track your parcel</h2>
                        <p className="text-[14px] text-[#565959] mt-2 mb-10 text-center max-w-sm">Enter the Tracking ID provided in your SMS or email to see its journey.</p>
                        <div className="flex gap-4">
                            <Btn onClick={() => router.push('/')}>Return to Store</Btn>
                            <Btn variant="secondary">View My Orders</Btn>
                        </div>
                    </div>
                )}
            </main>

            <Footer />
        </div>
    );
}
