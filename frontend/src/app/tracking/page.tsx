'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useSearchParams } from 'next/navigation';
import { Search, Package, MapPin, Clock, CheckCircle2, AlertCircle, Globe, RefreshCw } from 'lucide-react';
import axios from 'axios';
import Navbar from '@/components/layout/Navbar';
import Footer from '@/components/layout/Footer';
import { formatCurrency, formatDate } from '@/lib/utils';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://127.0.0.1:8000/api';

export default function TrackingPage() {
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
        }, 1000); // poll every 1 second
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
        <div className="min-h-screen bg-slate-50 dark:bg-[#0F172A]">
            <Navbar />
            
            <main className="container mx-auto px-6 py-12">
                <div className="max-w-3xl mx-auto">
                    {/* Header */}
                    <div className="text-center mb-10 space-y-4">
                        <div className="inline-flex items-center gap-2 px-3 py-1 bg-[#F59E0B]/10 rounded-full border border-[#F59E0B]/20">
                            <Globe className="h-4 w-4 text-[#F59E0B]" />
                            <span className="text-[10px] font-bold uppercase tracking-widest text-[#F59E0B]">Real-time Tracking</span>
                        </div>
                        <h1 className="text-4xl font-black text-slate-900 dark:text-white tracking-tighter uppercase">Track Your Order</h1>
                        <p className="text-slate-500 dark:text-slate-400 font-medium">Enter your tracking ID to see the current status of your order.</p>
                    </div>

                    {/* Search Box */}
                    <form onSubmit={handleTrack} className="relative mb-12">
                        <input
                            type="text"
                            value={trackingId}
                            onChange={(e) => setTrackingId(e.target.value)}
                            placeholder="Enter Tracking ID (e.g. ALQ-123456)"
                            className="w-full h-16 pl-6 pr-32 bg-white dark:bg-[#1a252f] border-2 border-slate-200 dark:border-white/10 rounded-2xl text-lg font-bold text-slate-900 dark:text-white outline-none focus:border-[#F59E0B] transition-all shadow-xl shadow-slate-200/50 dark:shadow-none"
                        />
                        <button
                            type="submit"
                            disabled={loading}
                            className="absolute right-2 top-2 bottom-2 px-6 bg-[#F59E0B] hover:bg-amber-500 text-white font-black rounded-xl transition-all flex items-center gap-2 active:scale-95 disabled:opacity-50"
                        >
                            {loading ? 'Searching...' : <><Search className="h-5 w-5" /> Track</>}
                        </button>
                    </form>

                    {error && (
                        <div className="p-4 bg-red-50 dark:bg-red-500/10 border border-red-200 dark:border-red-500/20 rounded-2xl flex items-center gap-3 text-red-600 dark:text-red-400 animate-in fade-in zoom-in duration-300">
                            <AlertCircle className="h-5 w-5" />
                            <span className="font-bold text-sm tracking-tight">{error}</span>
                        </div>
                    )}

                    {order && (
                        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-5 duration-500">
                            {/* Live Update Indicator */}
                            <div className="flex items-center justify-center gap-2 text-[10px] font-black uppercase tracking-widest text-emerald-500">
                                <span className="relative flex h-2 w-2">
                                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                                    <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                                </span>
                                Live — Auto-refreshing every 1s
                            </div>

                            {/* Tracking Timeline */}
                            <div className="bg-white dark:bg-[#1a252f] p-8 rounded-3xl border border-slate-200 dark:border-white/10 shadow-sm relative overflow-hidden">
                                <div className="relative z-10">
                                    <div className="flex justify-between mb-12 relative">
                                        {/* Line Background */}
                                        <div className="absolute top-5 left-0 right-0 h-0.5 bg-slate-100 dark:bg-white/5 z-0" />
                                        {/* Progressive Line */}
                                        <div 
                                            className="absolute top-5 left-0 h-0.5 bg-[#F59E0B] transition-all duration-1000 ease-out z-0" 
                                            style={{ width: `${(currentStepIndex / (steps.length - 1)) * 100}%` }}
                                        />

                                        {steps.map((step, i) => {
                                            const Icon = step.icon;
                                            const isActive = i <= currentStepIndex;
                                            const isCurrent = i === currentStepIndex;

                                            return (
                                                <div key={step.status} className="relative z-10 flex flex-col items-center gap-3">
                                                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center border-2 transition-all duration-500 ${isActive ? 'bg-[#F59E0B] border-[#F59E0B] text-white' : 'bg-white dark:bg-[#1a252f] border-slate-200 dark:border-white/10 text-slate-300'} ${isCurrent ? 'ring-4 ring-[#F59E0B]/20 scale-110' : ''}`}>
                                                        <Icon className="h-5 w-5" />
                                                    </div>
                                                    <span className={`text-[10px] font-black uppercase tracking-widest ${isActive ? 'text-[#F59E0B]' : 'text-slate-400'}`}>
                                                        {step.label}
                                                    </span>
                                                </div>
                                            );
                                        })}
                                    </div>

                                    <div className="flex flex-col md:flex-row justify-between items-center gap-6 pt-6 border-t border-slate-50 dark:border-white/5">
                                        <div className="text-center md:text-left">
                                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Customer Name</p>
                                            <p className="text-xl font-black text-slate-900 dark:text-white uppercase">{order.customer_name}</p>
                                        </div>
                                        <div className="text-center md:text-right">
                                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Current Status</p>
                                            <div className="px-4 py-2 bg-[#F59E0B]/10 rounded-xl border border-[#F59E0B]/20">
                                                <span className="text-sm font-black text-[#F59E0B] uppercase">{order.status_display}</span>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Order Details */}
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div className="bg-white dark:bg-[#1a252f] p-6 rounded-3xl border border-slate-200 dark:border-white/10 shadow-sm">
                                    <h3 className="text-sm font-black text-slate-900 dark:text-white uppercase tracking-widest mb-4">Delivery Info</h3>
                                    <div className="space-y-4">
                                        <div className="flex gap-3">
                                            <MapPin className="h-5 w-5 text-[#F59E0B] shrink-0" />
                                            <div>
                                                <p className="text-[10px] font-black text-slate-400 uppercase mb-1">Address</p>
                                                <p className="text-sm font-bold text-slate-700 dark:text-slate-300 leading-tight">{order.shipping_address}</p>
                                            </div>
                                        </div>
                                        <div className="flex gap-3">
                                            <Clock className="h-5 w-5 text-[#F59E0B] shrink-0" />
                                            <div>
                                                <p className="text-[10px] font-black text-slate-400 uppercase mb-1">Ordered On</p>
                                                <p className="text-sm font-bold text-slate-700 dark:text-slate-300">{formatDate(order.created_at)}</p>
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                <div className="bg-[#131921] p-6 rounded-3xl shadow-xl">
                                    <h3 className="text-sm font-black text-white/50 uppercase tracking-widest mb-4">Total Amount</h3>
                                    <div className="flex items-baseline gap-2">
                                        <span className="text-4xl font-black text-[#F59E0B] tracking-tighter">Rs. {parseFloat(order.total_amount).toLocaleString()}</span>
                                    </div>
                                    <p className="text-[10px] text-white/30 font-medium mt-4 leading-relaxed uppercase tracking-widest">
                                        Inclusive of all taxes and delivery charges.
                                    </p>
                                </div>
                            </div>

                            {/* Items List */}
                            <div className="bg-white dark:bg-[#1a252f] rounded-3xl border border-slate-200 dark:border-white/10 shadow-sm overflow-hidden">
                                <div className="px-6 py-4 border-b border-slate-50 dark:border-white/5 bg-slate-50/30 dark:bg-white/[0.02]">
                                    <h3 className="text-xs font-black text-slate-900 dark:text-white uppercase tracking-widest">Items Detail</h3>
                                </div>
                                <div className="divide-y divide-slate-50 dark:divide-white/5">
                                    {order.items.map((item: any) => (
                                        <div key={item.id} className="p-4 flex items-center justify-between hover:bg-slate-50 dark:hover:bg-white/[0.02] transition-colors">
                                            <div className="flex items-center gap-4">
                                                <div className="w-12 h-12 rounded-xl bg-slate-100 dark:bg-white/5 p-1 border border-slate-200 dark:border-white/10">
                                                    <img 
                                                        src={item.image ? (API_URL.replace('/api', '') + item.image) : '/images/logo.png'} 
                                                        alt="" 
                                                        className="w-full h-full object-contain"
                                                    />
                                                </div>
                                                <div>
                                                    <p className="text-sm font-black text-slate-900 dark:text-white uppercase tracking-tight">{item.product_name}</p>
                                                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{item.quantity} unit(s) @ Rs. {parseFloat(item.price).toLocaleString()}</p>
                                                </div>
                                            </div>
                                            <p className="text-sm font-black text-slate-900 dark:text-white">Rs. {(item.quantity * parseFloat(item.price)).toLocaleString()}</p>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            </main>

            <Footer />
        </div>
    );
}
