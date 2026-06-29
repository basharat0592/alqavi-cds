'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import {
    Package, Clock, CheckCircle, Truck, Wallet, Star, Loader2, ChevronRight,
} from 'lucide-react';
import toast from 'react-hot-toast';
import { riderService } from '@/services/delivery.service';
import { formatCurrency } from '@/lib/utils';
import {
    computeEarnings, ratingFor, isActive, isDelivered, orderDate,
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
    const earnings = computeEarnings(results, now);
    const rating = ratingFor(completed);

    const CARDS = [
        { label: "Today's Deliveries", value: todaysDeliveries, icon: Package, color: 'text-[#111]', tint: 'bg-[#F0F2F2] text-gray-500' },
        { label: 'Pending Orders', value: pending, icon: Clock, color: 'text-amber-600', tint: 'bg-amber-50 text-amber-600' },
        { label: 'Completed Orders', value: completed, icon: CheckCircle, color: 'text-[#007600]', tint: 'bg-emerald-50 text-[#007600]' },
    ];

    if (loading) return <div className="py-24 text-center text-gray-400"><Loader2 className="w-6 h-6 animate-spin mx-auto" /></div>;

    return (
        <div className="space-y-8 animate-in fade-in duration-500">
            <div className="border-b border-gray-200 pb-4">
                <h1 className="text-3xl font-normal text-[#111]">Dashboard</h1>
                <p className="text-sm text-gray-500 mt-1">
                    {data.rider?.name ? `Welcome back, ${data.rider.name}.` : 'Your delivery overview at a glance.'}
                </p>
            </div>

            {/* Stat cards */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                {CARDS.map((c, i) => (
                    <div key={i} className="bg-white border border-[#D5D9D9] rounded-lg p-5 shadow-sm">
                        <div className="flex items-center justify-between">
                            <p className="text-[11px] font-bold text-gray-400 uppercase tracking-wider">{c.label}</p>
                            <span className={`w-9 h-9 rounded-lg flex items-center justify-center ${c.tint}`}><c.icon size={17} /></span>
                        </div>
                        <p className={`text-[30px] font-bold tabular-nums mt-2 ${c.color}`}>{c.value}</p>
                    </div>
                ))}
            </div>

            {/* Earnings + Rating summary */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                <div className="bg-white border border-[#D5D9D9] rounded-lg p-6 shadow-sm">
                    <div className="flex items-center justify-between mb-4">
                        <div className="flex items-center gap-2">
                            <span className="w-9 h-9 rounded-lg bg-emerald-50 text-[#059669] flex items-center justify-center"><Wallet size={17} /></span>
                            <h3 className="text-[14px] font-bold text-[#111]">Earnings Summary</h3>
                        </div>
                        <Link href="/delivery/earnings" className="text-[12px] font-bold text-[#007185] hover:text-[#C45500] hover:underline flex items-center gap-0.5">Details <ChevronRight size={13} /></Link>
                    </div>
                    <div className="grid grid-cols-3 gap-3 text-center">
                        {[['Today', earnings.today], ['This Week', earnings.week], ['This Month', earnings.month]].map(([l, v]) => (
                            <div key={l as string} className="bg-[#F7FAFA] rounded-lg p-3 border border-gray-100">
                                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">{l}</p>
                                <p className="text-[16px] font-bold text-[#111] tabular-nums mt-1">{formatCurrency(v as number)}</p>
                            </div>
                        ))}
                    </div>
                </div>

                <div className="bg-white border border-[#D5D9D9] rounded-lg p-6 shadow-sm">
                    <div className="flex items-center justify-between mb-4">
                        <div className="flex items-center gap-2">
                            <span className="w-9 h-9 rounded-lg bg-amber-50 text-[#F59E0B] flex items-center justify-center"><Star size={17} /></span>
                            <h3 className="text-[14px] font-bold text-[#111]">Rating Overview</h3>
                        </div>
                        <Link href="/delivery/rating" className="text-[12px] font-bold text-[#007185] hover:text-[#C45500] hover:underline flex items-center gap-0.5">Details <ChevronRight size={13} /></Link>
                    </div>
                    <div className="flex items-center gap-4">
                        <StarMini rating={rating} />
                        <div>
                            <p className="text-[22px] font-bold text-[#111] tabular-nums leading-none">{rating.toFixed(2)} <span className="text-[14px] font-semibold text-gray-400">/ 5.0</span></p>
                            <p className="text-[12px] text-gray-500 mt-1">{completed} completed {completed === 1 ? 'delivery' : 'deliveries'}</p>
                        </div>
                    </div>
                </div>
            </div>

            {/* Quick action */}
            <Link href="/delivery/deliveries" className="inline-flex items-center gap-2 h-10 px-5 rounded-md bg-[#232F3E] text-white text-[13px] font-bold hover:bg-[#1a2532] transition-all">
                <Truck size={15} /> Go to My Deliveries
            </Link>
        </div>
    );
}
