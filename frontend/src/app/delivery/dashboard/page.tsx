'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import {
    Package, Clock, CheckCircle, Truck, Star, Loader2, ChevronRight, Bell,
} from 'lucide-react';
import toast from 'react-hot-toast';
import { riderService } from '@/services/delivery.service';
import {
    ratingFor, isActive, isDelivered, orderDate,
} from '@/lib/deliveryStats';

const StarMini = ({ rating }: { rating: number }) => {
    const pct = Math.max(0, Math.min(100, (rating / 5) * 100));
    const Row = ({ c }: { c: string }) => (
        <div className={`flex gap-0.5 w-max ${c}`}>{[0, 1, 2, 3, 4].map(i => <Star key={i} size={18} fill="currentColor" strokeWidth={0} className="shrink-0" />)}</div>
    );
    return (
        <div className="relative inline-block">
            <Row c="text-gray-200" />
            <div className="absolute top-0 left-0 h-full overflow-hidden whitespace-nowrap" style={{ width: `${pct}%` }}><Row c="text-[#F59E0B]" /></div>
        </div>
    );
};

export default function DeliveryDashboardOverview() {
    const [loading, setLoading] = useState(true);
    const [data, setData] = useState<any>({ rider: {}, stats: {}, results: [] });

    useEffect(() => {
        riderService.myDeliveries()
            .then((d) => setData(d || { rider: {}, stats: {}, results: [] }))
            .catch(() => toast.error('Failed to load dashboard'))
            .finally(() => setLoading(false));
    }, []);

    const results: any[] = data.results || [];
    const stats = data.stats || {};
    const now = new Date();
    const today0 = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
    const todaysDeliveries = results.filter((o) => {
        const d = orderDate(o); return d && d.getTime() >= today0;
    }).length;
    const pending = results.filter((o) => isActive(o.status)).length;
    const completed = Number(stats.delivered || results.filter((o) => isDelivered(o.status)).length);
    const rating = ratingFor(completed);
    const riderName = (data.rider?.name || 'Rider').trim();

    const CARDS = [
        { label: "Today", value: todaysDeliveries, icon: Package, color: 'text-[#111]', tint: 'bg-[#F0F2F2] text-gray-500', bar: '#64748b' },
        { label: 'Pending', value: pending, icon: Clock, color: 'text-amber-600', tint: 'bg-amber-50 text-amber-600', bar: '#F59E0B' },
        { label: 'Completed', value: completed, icon: CheckCircle, color: 'text-[#007600]', tint: 'bg-emerald-50 text-[#007600]', bar: '#10b981' },
    ];

    if (loading) return <div className="py-24 text-center text-gray-400"><Loader2 className="w-6 h-6 animate-spin mx-auto" /></div>;

    return (
        <div className="space-y-5 animate-in fade-in duration-500">
            {/* Greeting */}
            <div className="flex items-center gap-3 border-b border-gray-200 pb-4">
                <span className="w-11 h-11 rounded-xl bg-[#232F3E] text-white flex items-center justify-center text-[17px] font-bold shrink-0">
                    {riderName.charAt(0).toUpperCase()}
                </span>
                <div className="min-w-0">
                    <h1 className="text-[19px] sm:text-[21px] font-bold text-[#111] leading-tight truncate">Hello, {riderName}</h1>
                    <p className="text-[12.5px] text-gray-500">Here's your delivery overview.</p>
                </div>
            </div>

            {/* Stat cards — 3 across with colored accents */}
            <div className="grid grid-cols-3 gap-2.5 sm:gap-4">
                {CARDS.map((c, i) => (
                    <div key={i} className="relative bg-white border border-[#E3E6E6] rounded-2xl p-3 sm:p-5 shadow-sm overflow-hidden">
                        <span className="absolute top-0 inset-x-0 h-1" style={{ backgroundColor: c.bar }} />
                        <span className={`w-8 h-8 sm:w-9 sm:h-9 rounded-lg flex items-center justify-center ${c.tint}`}><c.icon size={16} /></span>
                        <p className={`text-[26px] sm:text-[32px] font-black tabular-nums mt-2.5 leading-none ${c.color}`}>{c.value}</p>
                        <p className="text-[10px] sm:text-[11px] font-bold text-gray-400 uppercase tracking-wide mt-1.5 leading-tight">{c.label}</p>
                    </div>
                ))}
            </div>

            {/* Rating (full width) */}
            <div className="bg-white border border-[#E3E6E6] rounded-2xl p-4 sm:p-6 shadow-sm">
                <div className="flex items-center justify-between mb-3.5">
                    <div className="flex items-center gap-2">
                        <span className="w-8 h-8 rounded-lg bg-amber-50 text-[#F59E0B] flex items-center justify-center"><Star size={16} /></span>
                        <h3 className="text-[13.5px] font-bold text-[#111]">Your Rating</h3>
                    </div>
                    <Link href="/delivery/rating" className="text-[12px] font-bold text-[#007185] active:text-[#C45500] hover:underline flex items-center gap-0.5">Details <ChevronRight size={13} /></Link>
                </div>
                <div className="flex items-center gap-4">
                    <StarMini rating={rating} />
                    <div>
                        <p className="text-[22px] font-black text-[#111] tabular-nums leading-none">{rating.toFixed(2)} <span className="text-[13px] font-semibold text-gray-400">/ 5.0</span></p>
                        <p className="text-[11.5px] text-gray-500 mt-1">{completed} completed {completed === 1 ? 'delivery' : 'deliveries'}</p>
                    </div>
                </div>
            </div>

            {/* Quick actions */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                <Link href="/delivery/deliveries" className="flex items-center justify-center gap-2 h-12 rounded-xl bg-[#232F3E] text-white text-[14px] font-bold hover:bg-[#1a2532] active:scale-[0.99] transition-all">
                    <Truck size={16} /> Active Orders
                </Link>
                <Link href="/delivery/notifications" className="flex items-center justify-center gap-2 h-12 rounded-xl border border-[#D5D9D9] bg-white text-[#111] text-[14px] font-bold hover:bg-gray-50 active:scale-[0.99] transition-all">
                    <Bell size={16} /> Notifications
                </Link>
            </div>
        </div>
    );
}
