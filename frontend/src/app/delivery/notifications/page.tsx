'use client';

import { useState, useEffect } from 'react';
import { Bell, Truck, CheckCircle, XCircle, Package, Loader2 } from 'lucide-react';
import toast from 'react-hot-toast';
import { riderService } from '@/services/delivery.service';
import { formatDateTime } from '@/lib/utils';
import { upper, isDelivered, isCancelled, orderDate } from '@/lib/deliveryStats';

type Notif = { id: string; icon: any; tint: string; title: string; body: string; at: Date | null };

export default function DeliveryNotificationsPage() {
    const [loading, setLoading] = useState(true);
    const [notifs, setNotifs] = useState<Notif[]>([]);

    const [branch, setBranch] = useState<string | null>(null);

    useEffect(() => {
        riderService.myDeliveries()
            .then((d) => {
                setBranch(d?.rider?.warehouse_name || null);
                const assigned: any[] = d?.results || [];
                const assignedIds = new Set(assigned.map((o: any) => String(o.id)));
                const items: Notif[] = assigned.map((o) => {
                    const ref = o.order_number || o.tracking_id;
                    const cust = o.customer_display_name || o.customer_name || 'a customer';
                    if (isDelivered(o.status)) {
                        return { id: `${o.id}-d`, icon: CheckCircle, tint: 'bg-emerald-50 text-[#007600]', title: `Order #${ref} delivered`, body: `You completed the delivery to ${cust}.`, at: orderDate(o) };
                    }
                    if (isCancelled(o.status)) {
                        return { id: `${o.id}-c`, icon: XCircle, tint: 'bg-red-50 text-red-600', title: `Order #${ref} cancelled`, body: `This delivery to ${cust} was cancelled.`, at: orderDate(o) };
                    }
                    if (upper(o.status) === 'SHIPPED') {
                        return { id: `${o.id}-s`, icon: Truck, tint: 'bg-sky-50 text-sky-600', title: `Out for delivery: #${ref}`, body: `${cust} — ${o.shipping_address || 'address on file'}.`, at: orderDate(o) };
                    }
                    return { id: `${o.id}-a`, icon: Package, tint: 'bg-amber-50 text-amber-600', title: `New delivery assigned: #${ref}`, body: `Deliver to ${cust} — ${o.shipping_address || 'address on file'}.`, at: orderDate(o) };
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
                    });
                });

                items.sort((a, b) => (b.at?.getTime() || 0) - (a.at?.getTime() || 0));
                setNotifs(items);
            })
            .catch(() => toast.error('Failed to load notifications'))
            .finally(() => setLoading(false));
    }, []);

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
                            </div>
                            <span className="text-[11px] text-gray-400 whitespace-nowrap shrink-0">{n.at ? formatDateTime(n.at.toISOString()) : ''}</span>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}
