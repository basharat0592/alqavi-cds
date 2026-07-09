'use client';

import { useState, useEffect } from 'react';
import { Bell, Truck, CheckCircle, XCircle, Package, Loader2, Eye, X, MapPin, Phone, User, Wallet, ShoppingCart } from 'lucide-react';
import toast from 'react-hot-toast';
import { riderService } from '@/services/delivery.service';
import { formatDateTime, formatCurrency } from '@/lib/utils';
import { upper, isDelivered, isCancelled, orderDate } from '@/lib/deliveryStats';

type Notif = { id: string; icon: any; tint: string; title: string; body: string; at: Date | null; acceptId?: string; order?: any };

export default function DeliveryNotificationsPage() {
    const [loading, setLoading] = useState(true);
    const [notifs, setNotifs] = useState<Notif[]>([]);
    const [accepting, setAccepting] = useState<string | null>(null);
    const [viewOrder, setViewOrder] = useState<any | null>(null);
    const [branch, setBranch] = useState<string | null>(null);
    const [riderIsSystem, setRiderIsSystem] = useState(false);

    const load = (silent = false) => {
        if (!silent) setLoading(true);
        riderService.myDeliveries()
            .then((d) => {
                setBranch(d?.rider?.warehouse_name || null);
                setRiderIsSystem(!!d?.rider?.is_system);
                const assigned: any[] = d?.results || [];
                const assignedIds = new Set(assigned.map((o: any) => String(o.id)));
                const items: Notif[] = assigned.map((o) => {
                    const ref = o.order_number || o.tracking_id;
                    const cust = o.customer_display_name || o.customer_name || 'a customer';
                    if (isDelivered(o.status)) {
                        return { id: `${o.id}-d`, icon: CheckCircle, tint: 'bg-emerald-50 text-[#007600]', title: `Order #${ref} delivered`, body: `You completed the delivery to ${cust}.`, at: orderDate(o), order: o };
                    }
                    if (isCancelled(o.status)) {
                        return { id: `${o.id}-c`, icon: XCircle, tint: 'bg-red-50 text-red-600', title: `Order #${ref} cancelled`, body: `This delivery to ${cust} was cancelled.`, at: orderDate(o), order: o };
                    }
                    if (upper(o.status) === 'SHIPPED') {
                        return { id: `${o.id}-s`, icon: Truck, tint: 'bg-sky-50 text-sky-600', title: `Out for delivery: #${ref}`, body: `${cust} — ${o.shipping_address || 'address on file'}.`, at: orderDate(o), order: o };
                    }
                    return { id: `${o.id}-a`, icon: Package, tint: 'bg-amber-50 text-amber-600', title: `New delivery assigned: #${ref}`, body: `Deliver to ${cust} — ${o.shipping_address || 'address on file'}.`, at: orderDate(o), order: o };
                });

                // Branch feed: every active order in the rider's branch not already
                // shown above (i.e. not yet assigned to this rider specifically).
                const branchOrders: any[] = d?.branch_orders || [];
                branchOrders.forEach((o: any) => {
                    if (assignedIds.has(String(o.id))) return;
                    const ref = o.order_number || o.tracking_id;
                    const cust = o.customer_display_name || o.customer_name || 'a customer';
                    items.push({
                        id: `${o.id}-b`, icon: Package, tint: 'bg-indigo-50 text-indigo-600',
                        title: `Branch order #${ref} (${upper(o.status)})`,
                        body: `${cust} — ${o.shipping_address || 'address on file'}.`,
                        at: orderDate(o),
                        acceptId: String(o.id), // unassigned → rider can claim it
                        order: o,
                    });
                });

                items.sort((a, b) => (b.at?.getTime() || 0) - (a.at?.getTime() || 0));
                setNotifs(items);
            })
            .catch(() => toast.error('Failed to load notifications'))
            .finally(() => setLoading(false));
    };

    useEffect(() => {
        load();
        const id = setInterval(() => load(true), 12000);
        return () => clearInterval(id);
    }, []);

    const handleAccept = async (orderId: string) => {
        setAccepting(orderId);
        try {
            await riderService.accept(orderId);
            toast.success('Order accepted — it\'s now yours.');
            setViewOrder(null);
            load();
        } catch (e: any) {
            toast.error(e?.response?.data?.error || 'Could not accept this order.');
        } finally {
            setAccepting(null);
        }
    };

    return (
        <div className="space-y-8 animate-in fade-in duration-500">
            <div className="border-b border-gray-200 pb-4">
                <h1 className="text-3xl font-normal text-[#111]">Notifications</h1>
                <p className="text-sm text-gray-500 mt-1">
                    Delivery alerts and active orders{branch ? <> for <span className="font-semibold text-[#111]">{branch}</span> branch</> : ''}.
                </p>
            </div>

            {loading ? (
                <div className="py-24 text-center text-gray-400"><Loader2 className="w-6 h-6 animate-spin mx-auto" /></div>
            ) : notifs.length === 0 ? (
                <div className="bg-white rounded-lg p-12 text-center border border-[#D5D9D9]">
                    <Bell className="h-8 w-8 text-gray-300 mx-auto mb-3" />
                    <h3 className="text-xl font-bold text-[#111]">You're all caught up.</h3>
                    <p className="text-sm text-gray-600 mt-2">New delivery alerts will show up here.</p>
                </div>
            ) : (
                <div className="bg-white border border-[#D5D9D9] rounded-lg shadow-sm divide-y divide-gray-100">
                    {notifs.map((n) => (
                        <div key={n.id} className="flex items-start gap-4 px-5 py-4 hover:bg-gray-50 transition-colors">
                            <span className={`w-10 h-10 rounded-lg flex items-center justify-center shrink-0 ${n.tint}`}><n.icon size={18} /></span>
                            <div className="min-w-0 flex-1">
                                <p className="text-[14px] font-bold text-[#111]">{n.title}</p>
                                <p className="text-[12.5px] text-gray-500 mt-0.5">{n.body}</p>
                                <div className="flex items-center gap-2 mt-2">
                                    {n.order && (
                                        <button
                                            onClick={() => setViewOrder(n.order)}
                                            className="inline-flex items-center gap-1.5 px-3 py-1.5 border border-[#D5D9D9] bg-white hover:bg-gray-50 text-[#111] text-[12px] font-bold rounded-lg transition-colors"
                                        >
                                            <Eye size={13} /> View
                                        </button>
                                    )}
                                    {n.acceptId && (
                                        <button
                                            onClick={() => handleAccept(n.acceptId!)}
                                            disabled={accepting === n.acceptId}
                                            className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-[#131921] hover:bg-black text-white text-[12px] font-bold rounded-lg transition-colors disabled:opacity-50"
                                        >
                                            {accepting === n.acceptId ? <Loader2 size={13} className="animate-spin" /> : <CheckCircle size={13} />}
                                            Accept this order
                                        </button>
                                    )}
                                </div>
                            </div>
                            <span className="text-[11px] text-gray-400 whitespace-nowrap shrink-0">{n.at ? formatDateTime(n.at.toISOString()) : ''}</span>
                        </div>
                    ))}
                </div>
            )}

            {/* ── Order detail modal ── */}
            {viewOrder && (() => {
                const o = viewOrder;
                const ref = o.order_number || o.tracking_id;
                const fee = Number(o.delivery_fee || 0);
                const pickupName = o.warehouse_name || branch || 'Branch';
                const pickupLoc = [o.warehouse_location, o.warehouse_area].filter(Boolean).join(', ');
                const custName = o.customer_display_name || o.customer_name || 'Customer';
                const phone = o.customer_phone || o.phone_number || '';
                const items: any[] = o.items || [];
                const ps = String(o.payment_status || '').toUpperCase();
                // COD collects on delivery — anything not yet PAID reads as Pending.
                const payLabel = ps === 'PAID' ? 'Paid' : ps === 'PARTIAL' ? 'Partial' : 'Pending';
                const payTint = ps === 'PAID' ? 'text-emerald-600' : ps === 'PARTIAL' ? 'text-amber-600' : 'text-rose-600';
                return (
                    <div className="fixed inset-0 z-[1100] flex items-center justify-center bg-slate-900/50 backdrop-blur-sm p-4" onClick={() => setViewOrder(null)}>
                        <div className="bg-white rounded-2xl border border-slate-200 w-full max-w-md shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200" onClick={(e) => e.stopPropagation()}>
                            {/* Header */}
                            <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/60">
                                <div>
                                    <h3 className="text-[15px] font-bold text-slate-900 tracking-tight">Order #{ref}</h3>
                                    <p className="text-[11.5px] text-slate-400 font-semibold uppercase tracking-wider">{o.status_display || o.status}</p>
                                </div>
                                <button onClick={() => setViewOrder(null)} className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors"><X size={18} /></button>
                            </div>

                            <div className="p-4 space-y-2.5 max-h-[62vh] overflow-y-auto">
                                {/* Shipper price / offer — hidden for system (salaried) riders */}
                                {!riderIsSystem && (
                                    <div className="flex items-center justify-between rounded-lg bg-emerald-50 border border-emerald-100 px-3.5 py-2">
                                        <span className="inline-flex items-center gap-1.5 text-[11.5px] font-bold text-emerald-700"><Wallet size={14} /> Delivery Offer</span>
                                        <span className="text-[15px] font-black text-emerald-700">{fee > 0 ? formatCurrency(fee) : '—'}</span>
                                    </div>
                                )}

                                {/* Pickup → Destination */}
                                <div className="rounded-lg border border-slate-200 divide-y divide-slate-100">
                                    <div className="p-2.5">
                                        <div className="flex items-center gap-1.5 text-[9.5px] font-bold text-emerald-600 uppercase tracking-widest mb-0.5"><MapPin size={11} /> Pickup</div>
                                        <p className="text-[12.5px] font-bold text-slate-800 leading-tight">{pickupName}</p>
                                        {pickupLoc && <p className="text-[11px] text-slate-500 leading-snug">{pickupLoc}</p>}
                                    </div>
                                    <div className="p-2.5">
                                        <div className="flex items-center gap-1.5 text-[9.5px] font-bold text-sky-600 uppercase tracking-widest mb-0.5"><MapPin size={11} /> Destination</div>
                                        <p className="text-[12.5px] font-bold text-slate-800 leading-tight flex items-center gap-1.5"><User size={12} className="text-slate-400 shrink-0" /> {custName}</p>
                                        <p className="text-[11px] text-slate-500 leading-snug mt-0.5">{o.shipping_address || 'Address on file'}</p>
                                        {phone && (
                                            <a href={`tel:${phone}`} className="mt-1.5 inline-flex items-center gap-1.5 text-[12px] font-bold text-sky-700 hover:underline">
                                                <Phone size={12} /> {phone}
                                            </a>
                                        )}
                                    </div>
                                </div>

                                {/* Items */}
                                <div className="border border-slate-200 rounded-lg divide-y divide-slate-100 overflow-hidden">
                                    <div className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-50 text-[9.5px] font-bold text-slate-400 uppercase tracking-widest"><ShoppingCart size={11} /> Items</div>
                                    {items.length === 0 ? (
                                        <p className="px-3 py-2 text-[12px] text-slate-400">No item details.</p>
                                    ) : items.map((it: any, i: number) => (
                                        <div key={i} className="flex items-center justify-between px-3 py-1.5 text-[12px]">
                                            <span className="text-slate-700 truncate pr-2">{it.product_name} <span className="text-slate-400">×{it.quantity}</span></span>
                                            <span className="font-semibold text-slate-800 tabular-nums whitespace-nowrap">{formatCurrency(Number(it.price || 0) * Number(it.quantity || 1))}</span>
                                        </div>
                                    ))}
                                </div>

                                {/* Order total + payment */}
                                <div className="rounded-lg bg-slate-50 border border-slate-100 px-3.5 py-2 space-y-1">
                                    <div className="flex justify-between text-[12px] text-slate-500"><span>Order Total</span><span className="font-bold text-slate-800 tabular-nums">{formatCurrency(Number(o.total_amount || 0))}</span></div>
                                    <div className="flex justify-between text-[12px] text-slate-500"><span>Payment ({o.payment_method || 'COD'})</span><span className={`font-bold ${payTint}`}>{payLabel}</span></div>
                                </div>
                            </div>

                            {/* Footer accept */}
                            {(() => {
                                const acceptable = !o.delivery_person && upper(o.status) !== 'DELIVERED' && upper(o.status) !== 'CANCELLED';
                                return acceptable ? (
                                    <div className="px-5 py-4 border-t border-slate-100 bg-slate-50/60">
                                        <button
                                            onClick={() => handleAccept(String(o.id))}
                                            disabled={accepting === String(o.id)}
                                            className="w-full h-11 rounded-xl bg-[#131921] hover:bg-black text-white text-[13px] font-bold inline-flex items-center justify-center gap-2 disabled:opacity-50"
                                        >
                                            {accepting === String(o.id) ? <Loader2 size={15} className="animate-spin" /> : <CheckCircle size={15} />}
                                            Accept this order
                                        </button>
                                    </div>
                                ) : null;
                            })()}
                        </div>
                    </div>
                );
            })()}
        </div>
    );
}
