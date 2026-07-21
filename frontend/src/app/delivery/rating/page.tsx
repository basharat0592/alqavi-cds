'use client';

import { useState, useEffect } from 'react';
import { Star, CheckCircle, Loader2, TrendingUp, Target, Package } from 'lucide-react';
import toast from 'react-hot-toast';
import { riderService } from '@/services/delivery.service';
import {
    ratingFor, DELIVERIES_FOR_FULL, STAR_PER_DELIVERY,
    isDelivered, isCancelled, isReturned, isActive,
} from '@/lib/deliveryStats';

function StarRating({ rating, size = 40 }: { rating: number; size?: number }) {
    const pct = Math.max(0, Math.min(100, (rating / 5) * 100));
    const Row = ({ className }: { className: string }) => (
        <div className={`flex gap-1.5 w-max ${className}`}>
            {[0, 1, 2, 3, 4].map(i => <Star key={i} size={size} fill="currentColor" strokeWidth={0} className="shrink-0" />)}
        </div>
    );
    return (
        <div className="relative inline-block">
            <Row className="text-gray-200" />
            <div className="absolute top-0 left-0 h-full overflow-hidden whitespace-nowrap" style={{ width: `${pct}%` }}>
                <Row className="text-[#F59E0B]" />
            </div>
        </div>
    );
}

export default function DeliveryRatingPage() {
    const [loading, setLoading] = useState(true);
    const [data, setData] = useState<any>({ stats: {}, results: [] });

    useEffect(() => {
        riderService.myDeliveries()
            .then((d) => setData(d || { stats: {}, results: [] }))
            .catch(() => toast.error('Failed to load rating'))
            .finally(() => setLoading(false));
    }, []);

    const results: any[] = data.results || [];
    const total = results.length;
    const delivered = results.filter((o) => isDelivered(o.status)).length;
    const cancelled = results.filter((o) => isCancelled(o.status)).length;
    const returned = results.filter((o) => isReturned(o.status)).length;
    const active = results.filter((o) => isActive(o.status)).length;
    const finished = delivered + cancelled + returned;

    const rating = ratingFor(delivered);
    const remaining = Math.max(0, DELIVERIES_FOR_FULL - delivered);
    const progressPct = Math.min(100, (delivered / DELIVERIES_FOR_FULL) * 100);
    const completionRate = total ? Math.round((delivered / total) * 100) : 0;
    const successRate = finished ? Math.round((delivered / finished) * 100) : 0;

    const METRICS = [
        { label: 'Completion Rate', value: `${completionRate}%`, sub: 'Delivered of all assigned', icon: Target, color: 'text-[#007185]' },
        { label: 'On-Time / Success Rate', value: `${successRate}%`, sub: 'Delivered of finished orders', icon: CheckCircle, color: 'text-[#007600]' },
        { label: 'Total Deliveries', value: total, sub: 'Orders assigned to you', icon: Package, color: 'text-[#111]' },
    ];

    return (
        <div className="space-y-5 sm:space-y-6 animate-in fade-in duration-500">
            <div className="border-b border-gray-200 pb-3 sm:pb-4">
                <h1 className="text-2xl font-semibold text-[#111]">My Rating &amp; Performance</h1>
                <p className="text-sm text-gray-500 mt-1">Your rider rating grows with every completed delivery.</p>
            </div>

            {loading ? (
                <div className="py-24 text-center text-gray-400"><Loader2 className="w-6 h-6 animate-spin mx-auto" /></div>
            ) : (
                <div className="space-y-6">
                    {/* Rating + progress */}
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                        <div className="bg-white border border-[#D5D9D9] rounded-lg shadow-sm p-8 text-center">
                            <StarRating rating={rating} />
                            <div className="mt-5 flex items-baseline justify-center gap-1">
                                <span className="text-[40px] font-bold text-[#111] tabular-nums leading-none">{rating.toFixed(2)}</span>
                                <span className="text-[18px] font-semibold text-gray-400">/ 5.0</span>
                            </div>
                            <p className="text-[13px] text-gray-500 mt-2">Customer Rating · {delivered} completed {delivered === 1 ? 'delivery' : 'deliveries'}</p>
                        </div>

                        <div className="bg-white border border-[#D5D9D9] rounded-lg shadow-sm p-6 flex flex-col justify-center">
                            <div className="flex items-center justify-between mb-3">
                                <div className="flex items-center gap-2">
                                    <TrendingUp size={16} className="text-[#007185]" />
                                    <h3 className="text-[14px] font-bold text-[#111]">Progress to 5 Stars</h3>
                                </div>
                                <span className="text-[12px] font-bold text-gray-500 tabular-nums">{Math.min(delivered, DELIVERIES_FOR_FULL)} / {DELIVERIES_FOR_FULL}</span>
                            </div>
                            <div className="h-3 w-full rounded-full bg-[#F0F2F2] overflow-hidden">
                                <div className="h-full rounded-full bg-[#F59E0B] transition-all duration-500" style={{ width: `${progressPct}%` }} />
                            </div>
                            <p className="text-[12.5px] text-gray-500 mt-3 flex items-center gap-1.5">
                                {remaining === 0
                                    ? (<><CheckCircle size={14} className="text-[#007600]" /> Full rating reached — great work!</>)
                                    : (<>{remaining} more {remaining === 1 ? 'delivery' : 'deliveries'} to a full 5-star rating.</>)}
                            </p>
                        </div>
                    </div>

                    {/* Performance metric cards */}
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                        {METRICS.map((m, i) => (
                            <div key={i} className="bg-white border border-[#D5D9D9] rounded-lg p-5 shadow-sm">
                                <div className="flex items-center gap-2 mb-1.5">
                                    <m.icon size={15} className="text-gray-400" />
                                    <p className="text-[10.5px] font-bold text-gray-400 uppercase tracking-wider">{m.label}</p>
                                </div>
                                <p className={`text-[26px] font-bold tabular-nums ${m.color}`}>{m.value}</p>
                                <p className="text-[11px] text-gray-400 mt-0.5">{m.sub}</p>
                            </div>
                        ))}
                    </div>

                    {/* Performance statistics breakdown */}
                    <div className="bg-white border border-[#D5D9D9] rounded-lg shadow-sm overflow-hidden">
                        <div className="px-5 py-3.5 border-b border-[#D5D9D9] bg-[#F7FAFA]">
                            <h3 className="text-[13px] font-bold text-[#111] uppercase tracking-wider">Performance Statistics</h3>
                        </div>
                        <div className="grid grid-cols-2 sm:grid-cols-5 divide-x divide-y sm:divide-y-0 divide-gray-100">
                            {[
                                ['Total', total, 'text-[#111]'],
                                ['Active', active, 'text-amber-600'],
                                ['Delivered', delivered, 'text-[#007600]'],
                                ['Cancelled', cancelled, 'text-red-600'],
                                ['Returned', returned, 'text-gray-500'],
                            ].map(([l, v, c]) => (
                                <div key={l as string} className="px-5 py-5 text-center">
                                    <p className={`text-[24px] font-bold tabular-nums ${c}`}>{v as number}</p>
                                    <p className="text-[11px] font-bold text-gray-400 uppercase tracking-wider mt-1">{l}</p>
                                </div>
                            ))}
                        </div>
                    </div>

                    <p className="text-[11.5px] text-gray-400 px-1">
                        Each completed delivery earns {STAR_PER_DELIVERY} of a star. A perfect 5-star rating is reached at {DELIVERIES_FOR_FULL} completed deliveries.
                    </p>
                </div>
            )}
        </div>
    );
}
