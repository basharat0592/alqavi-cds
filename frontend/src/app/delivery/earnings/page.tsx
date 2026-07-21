'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { Wallet, Loader2, Calendar, TrendingUp } from 'lucide-react';
import toast from 'react-hot-toast';
import { riderService } from '@/services/delivery.service';
import { installmentService } from '@/services/payment.service';
import { formatCurrency, formatDateTime } from '@/lib/utils';
import { computeEarnings, riderEarning, orderDate } from '@/lib/deliveryStats';

export default function DeliveryEarningsPage() {
    const router = useRouter();
    const [loading, setLoading] = useState(true);
    const [results, setResults] = useState<any[]>([]);

    // Modal state for custom payment
    const [selectedOrder, setSelectedOrder] = useState<any | null>(null);
    const [payAmt, setPayAmt] = useState('');
    const [payMethod, setPayMethod] = useState<'cash' | 'online'>('cash');
    const [postingPayment, setPostingPayment] = useState(false);

    const load = useCallback(() => {
        setLoading(true);
        riderService.myDeliveries()
            .then((d) => {
                // System (salaried) riders have no per-delivery earnings page.
                if (d?.rider?.is_system) { router.replace('/delivery/dashboard'); return; }
                setResults(d?.results || []);
            })
            .catch(() => toast.error('Failed to load earnings'))
            .finally(() => setLoading(false));
    }, [router]);

    useEffect(() => {
        load();
    }, [load]);

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
        <div className="space-y-5 sm:space-y-6 animate-in fade-in duration-500">
            <div className="border-b border-gray-200 pb-3 sm:pb-4">
                <h1 className="text-2xl font-semibold text-[#111]">My Earnings</h1>
                <p className="text-sm text-gray-500 mt-1">You earn the dynamic shipping/delivery fee per completed delivery.</p>
            </div>

            {loading && results.length === 0 ? (
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
                                        <tr className="bg-[#F0F2F2] border-b border-[#D5D9D9] text-[11px] font-bold text-gray-600 uppercase tracking-wider font-sans">
                                            <th className="px-6 py-4">Date</th>
                                            <th className="px-6 py-4">Order #</th>
                                            <th className="px-6 py-4">Customer</th>
                                            <th className="px-6 py-4">Payment</th>
                                            <th className="px-6 py-4 text-right">Earned</th>
                                            <th className="px-6 py-4 text-right">Actions</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-[#D5D9D9]">
                                        {history.map((o) => {
                                            const status = String(o.payment_status || 'UNPAID').toUpperCase();
                                            const isPaid = status === 'PAID';
                                            const remaining = Math.max(0, Number(o.total_amount || 0) - Number(o.amount_paid || 0));
                                            return (
                                                <tr key={o.id} className="hover:bg-gray-50 transition-colors">
                                                    <td className="px-6 py-4 text-sm text-gray-900 font-medium whitespace-nowrap">{o.created_at ? formatDateTime(o.created_at) : '—'}</td>
                                                    <td className="px-6 py-4 text-sm font-bold text-[#111]">{o.order_number || o.tracking_id}</td>
                                                    <td className="px-6 py-4 text-sm text-gray-700 font-medium">{o.customer_display_name || o.customer_name || 'Customer'}</td>
                                                    <td className="px-6 py-4">
                                                        <span className={`px-2 py-0.5 rounded text-[10px] font-extrabold uppercase tracking-wide inline-block border ${
                                                            isPaid ? 'bg-emerald-50 text-emerald-700 border-emerald-200' :
                                                            status === 'PARTIAL' ? 'bg-amber-50 text-amber-700 border-amber-200' :
                                                            'bg-rose-50 text-rose-700 border-rose-200'
                                                        }`}>
                                                            {status === 'PARTIAL' ? 'Partial' : status.toLowerCase()}
                                                        </span>
                                                    </td>
                                                    <td className="px-6 py-4 text-sm font-bold text-[#007600] text-right tabular-nums">+ {formatCurrency(riderEarning(o))}</td>
                                                    <td className="px-6 py-4 text-right whitespace-nowrap">
                                                        {!isPaid && remaining > 0 ? (
                                                            <button
                                                                onClick={() => {
                                                                    setSelectedOrder(o);
                                                                    setPayAmt(remaining.toFixed(2));
                                                                    setPayMethod('cash');
                                                                }}
                                                                className="text-xs font-bold text-[#007185] hover:text-[#C45500] hover:underline"
                                                            >
                                                                Add Payment
                                                            </button>
                                                        ) : (
                                                            <span className="text-xs text-gray-400 font-semibold">—</span>
                                                        )}
                                                    </td>
                                                </tr>
                                            );
                                        })}
                                    </tbody>
                                </table>
                            </div>
                        )}
                    </div>

                    <p className="text-[11.5px] text-gray-400 px-1">
                        Earnings are calculated from completed deliveries based on the order's actual shipping/delivery cost.
                    </p>
                </>
            )}

            {/* Custom Add Payment Modal */}
            {selectedOrder && (
                <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                    <div className="bg-white border border-slate-200 rounded-2xl max-w-md w-full shadow-2xl p-6 relative animate-in zoom-in-95 duration-200 text-left">
                        <h3 className="text-[18px] font-bold text-[#111] mb-2">Record Customer Payment</h3>
                        <p className="text-[12.5px] text-gray-500 mb-4">
                            Adding a payment against Order <span className="font-bold text-[#111]">#{selectedOrder.order_number || selectedOrder.tracking_id}</span>.
                        </p>

                        <div className="space-y-4">
                            <div>
                                <label className="block text-[10.5px] font-bold text-gray-400 uppercase tracking-wider mb-1.5">Amount Received</label>
                                <div className="relative">
                                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[12.5px] font-bold text-gray-400">Rs</span>
                                    <input
                                        type="number"
                                        min={0.01}
                                        max={Math.max(0, Number(selectedOrder.total_amount || 0) - Number(selectedOrder.amount_paid || 0))}
                                        value={payAmt}
                                        onChange={e => setPayAmt(e.target.value)}
                                        className="w-full h-10 pl-8 pr-3 rounded-lg border border-gray-300 text-sm outline-none focus:border-[#F59E0B] transition-all font-medium tabular-nums bg-white"
                                    />
                                </div>
                                <p className="text-[11px] text-gray-400 mt-1">
                                    Remaining Balance: <span className="font-bold text-slate-700">{formatCurrency(Math.max(0, Number(selectedOrder.total_amount || 0) - Number(selectedOrder.amount_paid || 0)))}</span>
                                </p>
                            </div>

                            <div>
                                <label className="block text-[10.5px] font-bold text-gray-400 uppercase tracking-wider mb-1.5">Payment Method</label>
                                <div className="grid grid-cols-2 gap-2">
                                    {(['cash', 'online'] as const).map(m => (
                                        <button
                                            key={m}
                                            type="button"
                                            onClick={() => setPayMethod(m)}
                                            className={`h-10 rounded-lg border text-[13px] font-bold transition-all capitalize ${payMethod === m ? 'border-[#F59E0B] bg-[#FFF8E7] text-[#C45500]' : 'border-gray-200 bg-white text-gray-600 hover:border-gray-300'}`}
                                        >
                                            {m}
                                        </button>
                                    ))}
                                </div>
                            </div>
                        </div>

                        <div className="mt-6 flex flex-col gap-2">
                            <button
                                type="button"
                                disabled={postingPayment || !payAmt || parseFloat(payAmt) <= 0}
                                onClick={async () => {
                                    setPostingPayment(true);
                                    try {
                                        await installmentService.create({
                                            source_type: 'order',
                                            source_id: String(selectedOrder.id),
                                            amount: parseFloat(payAmt),
                                            method: payMethod,
                                            status: 'confirmed',
                                            direction: 'inbound',
                                            paid_at: new Date().toISOString(),
                                            reference: 'Rider Settle',
                                        });
                                        toast.success('Payment recorded successfully');
                                        setSelectedOrder(null);
                                        load();
                                    } catch (err: any) {
                                        toast.error(err?.response?.data?.detail || 'Failed to add payment');
                                    } finally {
                                        setPostingPayment(false);
                                    }
                                }}
                                className="w-full h-10 rounded-lg bg-[#FFD814] text-[#111] hover:bg-[#F7CA00] text-[13px] font-bold transition-all disabled:opacity-50 flex items-center justify-center gap-1.5 shadow-sm"
                            >
                                {postingPayment ? 'Processing...' : 'Confirm & Settle'}
                            </button>
                            <button
                                type="button"
                                onClick={() => setSelectedOrder(null)}
                                className="w-full h-10 text-[13px] text-[#007185] hover:underline font-medium"
                            >
                                Cancel
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
