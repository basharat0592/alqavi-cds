'use client';

import { useState, useEffect } from 'react';
import { Wallet, Loader2, Calendar, TrendingUp } from 'lucide-react';
import toast from 'react-hot-toast';
import { riderService } from '@/services/delivery.service';
import { formatCurrency, formatDateTime } from '@/lib/utils';
import { computeEarnings, DELIVERY_FEE, orderDate } from '@/lib/deliveryStats';

export default function DeliveryEarningsPage() {
    const [loading, setLoading] = useState(true);
    const [results, setResults] = useState<any[]>([]);

    useEffect(() => {
        riderService.myDeliveries()
            .then((d) => setResults(d?.results || []))
            .catch(() => toast.error('Failed to load earnings'))
            .finally(() => setLoading(false));
    }, []);

    const now = new Date();
    const e = computeEarnings(results, now);

    const CARDS = [
        { label: 'Today', value: e.today, icon: Calendar, tint: 'bg-[#F0F2F2] text-gray-500' },
        { label: 'This Week', value: e.week, icon: TrendingUp, tint: 'bg-sky-50 text-sky-600' },
        { label: 'This Month', value: e.month, icon: Wallet, tint: 'bg-emerald-50 text-[#059669]' },
        { label: 'All Time', value: e.allTime, icon: Wallet, tint: 'bg-amber-50 text-[#F59E0B]' },
    ];

    // Newest delivered first for the payment history.
    const history = [...e.deliveredOrders].sort((a, b) => {
        const ta = orderDate(a)?.getTime() || 0; const tb = orderDate(b)?.getTime() || 0; return tb - ta;
    });

    return (
        <div className="space-y-8 animate-in fade-in duration-500">
            <div className="border-b border-gray-200 pb-4">
                <h1 className="text-3xl font-normal text-[#111]">My Earnings</h1>
                <p className="text-sm text-gray-500 mt-1">You earn {formatCurrency(DELIVERY_FEE)} per completed delivery.</p>
            </div>

            {loading ? (
                <div className="py-24 text-center text-gray-400"><Loader2 className="w-6 h-6 animate-spin mx-auto" /></div>
            ) : (
                <>
                    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                        {CARDS.map((c, i) => (
                            <div key={i} className="bg-white border border-[#D5D9D9] rounded-lg p-5 shadow-sm">
                                <div className="flex items-center justify-between">
                                    <p className="text-[11px] font-bold text-gray-400 uppercase tracking-wider">{c.label}</p>
                                    <span className={`w-8 h-8 rounded-lg flex items-center justify-center ${c.tint}`}><c.icon size={15} /></span>
                                </div>
                                <p className="text-[24px] font-bold text-[#111] tabular-nums mt-2">{formatCurrency(c.value)}</p>
                            </div>
                        ))}
                    </div>

                    <div>
                        <h2 className="text-[15px] font-bold text-[#111] mb-3">Payment History</h2>
                        {history.length === 0 ? (
                            <div className="bg-white rounded-lg p-12 text-center border border-[#D5D9D9]">
                                <Wallet className="h-8 w-8 text-gray-300 mx-auto mb-3" />
                                <p className="text-sm text-gray-600">No earnings yet. Complete deliveries to start earning.</p>
                            </div>
                        ) : (
                            <div className="bg-white border border-[#D5D9D9] rounded-lg overflow-x-auto shadow-sm">
                                <table className="w-full text-left border-collapse">
                                    <thead>
                                        <tr className="bg-[#F0F2F2] border-b border-[#D5D9D9] text-[11px] font-bold text-gray-600 uppercase tracking-wider">
                                            <th className="px-6 py-4">Date</th>
                                            <th className="px-6 py-4">Order #</th>
                                            <th className="px-6 py-4">Customer</th>
                                            <th className="px-6 py-4 text-right">Earned</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-[#D5D9D9]">
                                        {history.map((o) => (
                                            <tr key={o.id} className="hover:bg-gray-50 transition-colors">
                                                <td className="px-6 py-4 text-sm text-gray-900 font-medium whitespace-nowrap">{o.created_at ? formatDateTime(o.created_at) : '—'}</td>
                                                <td className="px-6 py-4 text-sm font-bold text-[#111]">{o.order_number || o.tracking_id}</td>
                                                <td className="px-6 py-4 text-sm text-gray-700 font-medium">{o.customer_display_name || o.customer_name || 'Customer'}</td>
                                                <td className="px-6 py-4 text-sm font-bold text-[#007600] text-right tabular-nums">+ {formatCurrency(DELIVERY_FEE)}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        )}
                    </div>

                    <p className="text-[11.5px] text-gray-400 px-1">
                        Earnings are calculated from completed deliveries at a flat {formatCurrency(DELIVERY_FEE)} per order. Wire this to your real payout model when available.
                    </p>
                </>
            )}
        </div>
    );
}
