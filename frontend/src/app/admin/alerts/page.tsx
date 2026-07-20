'use client';

import React, { useState, useEffect, useRef } from 'react';
import { orderService, userService, inventoryService } from '@/lib/api';
import { purchaseService } from '@/services/purchase.service';
import { paymentsDueService } from '@/services/payment.service';
import {
    AlertTriangle, ShoppingBag, CheckCircle2, Clock,
    RefreshCw, Plus, Activity, ClipboardList,
    ShoppingCart, UserPlus, XCircle, ShieldCheck,
    Wallet, CalendarClock, ArrowRight
} from 'lucide-react';
import Link from 'next/link';
import PageLoader from '@/components/ui/PageLoader';
import { formatDate, formatDateTime } from '@/lib/utils';
import { PageHeader, Card, Button, Badge } from '@/components/admin/ui';

const DUE_LINK: Record<string, string> = {
    sale: '/admin/sales',
    purchase: '/admin/purchases',
    sale_return: '/admin/sale-returns',
    purchase_return: '/admin/purchases/returns',
};
const DUE_TYPE_LABEL: Record<string, string> = {
    sale: 'Sale', purchase: 'Purchase', sale_return: 'Sale Refund', purchase_return: 'Purchase Refund',
};
const money = (n: number) => `Rs ${Number(n || 0).toLocaleString(undefined, { maximumFractionDigits: 0 })}`;

export default function AlertsPage() {
    const [loading, setLoading] = useState(true);
    const [alerts, setAlerts] = useState<any[]>([]);
    const [activities, setActivities] = useState<any[]>([]);
    const [due, setDue] = useState<any[]>([]);
    const [dueSummary, setDueSummary] = useState<any>({ overdue: 0, due_soon: 0, upcoming: 0, total_outstanding: 0, overdue_amount: 0 });
    const [lastUpdated, setLastUpdated] = useState(new Date());
    const pollingRef = useRef<any>(null);

    const fetchData = async (isSilent = false) => {
        if (!isSilent) setLoading(true);
        try {
            const [pRes, oRes, uRes, purRes, dueRes] = await Promise.allSettled([
                inventoryService.getLowStock(),
                orderService.getAll(),
                userService.getAll(),
                purchaseService.getAll(),
                paymentsDueService.get('all'),
            ]);

            if (dueRes.status === 'fulfilled' && dueRes.value) {
                setDue(Array.isArray(dueRes.value.results) ? dueRes.value.results : []);
                setDueSummary(dueRes.value.summary || {});
            }

            const newAlerts: any[] = [];
            const newActivities: any[] = [];

            const getArr = (res: any) => {
                if (res.status !== 'fulfilled') return [];
                const val = res.value;
                if (Array.isArray(val)) return val;
                if (val && typeof val === 'object' && Array.isArray(val.results)) return val.results;
                return [];
            };

            // Per-branch low stock from the server (tenant + branch scoped, vs each
            // product's min_count) — not a hardcoded client-side threshold.
            const lowStock = getArr(pRes);
            lowStock.forEach((p: any) => {
                const qty = parseInt(p.qty ?? 0);
                const isOut = qty <= 0;
                newAlerts.push({
                    id: `stock-${p.product_name}`,
                    type: isOut ? 'Out of Stock' : 'Low Stock',
                    priority: isOut ? 'high' : 'medium',
                    title: isOut ? 'Out of Stock' : 'Low Stock',
                    product: p.product_name,
                    remaining: qty,
                    min: p.min,
                    supplierName: p.supplier || 'Al-Qavi Hub',
                    supplierId: p.supplier || '',
                    sku: p.sku || 'No Identifier',
                    time: 'Live',
                    href: `/admin/products?search=${encodeURIComponent(p.product_name || '')}`,
                    icon: isOut ? XCircle : AlertTriangle,
                    color: isOut ? 'text-red-600' : 'text-amber-600',
                    bg: isOut ? 'bg-red-50' : 'bg-amber-50',
                    border: isOut ? 'border-red-200' : 'border-amber-200',
                });
            });

            const orders = getArr(oRes);
            orders.slice(0, 10).forEach((o: any) => {
                newActivities.push({
                    id: `sale-${o.id}`,
                    type: 'Sale',
                    title: 'New Order',
                    message: `Order #${o.order_number || o.id} • RS ${parseFloat(o.total_amount || 0).toLocaleString()} • ${o.customer_name || o.guest_name || 'Individual'}`,
                    time: new Date(o.created_at || Date.now()),
                    icon: ShoppingCart,
                    color: 'text-emerald-600',
                    bg: 'bg-emerald-50',
                    border: 'border-emerald-200'
                });
            });

            const users = getArr(uRes);
            users.slice(0, 5).forEach((u: any) => {
                newActivities.push({
                    id: `user-${u.id}`,
                    type: 'User',
                    title: 'User Registered',
                    message: `${u.first_name || u.username} verified as ${u.role_name || u.role || 'Member'}`,
                    time: new Date(u.date_joined || u.created_at || Date.now()),
                    icon: UserPlus,
                    color: 'text-blue-600',
                    bg: 'bg-blue-50',
                    border: 'border-blue-200'
                });
            });

            const purchases = getArr(purRes);
            purchases.slice(0, 10).forEach((p: any) => {
                newActivities.push({
                    id: `purchase-${p.id}`,
                    type: 'Purchase',
                    title: 'New Purchase Order',
                    message: `Purchase Order #${p.purchase_number || p.id} created for RS ${parseFloat(p.total_amount || 0).toLocaleString()}`,
                    time: new Date(p.created_at || Date.now()),
                    icon: ShoppingBag,
                    color: 'text-indigo-600',
                    bg: 'bg-indigo-50',
                    border: 'border-indigo-200'
                });
            });

            setAlerts(newAlerts.sort((a, b) => (a.priority === 'high' ? -1 : 1)));
            setActivities(newActivities.sort((a, b) => b.time.getTime() - a.time.getTime()).slice(0, 30));
            setLastUpdated(new Date());
        } catch (err) {
            console.error("Hub refresh failure.");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchData();
        pollingRef.current = setInterval(() => fetchData(true), 20000); // 20s interval
        return () => clearInterval(pollingRef.current);
    }, []);

    if (loading && alerts.length === 0 && activities.length === 0) return <PageLoader />;

    const outOfStockCount = alerts.filter(a => a.priority === 'high').length;
    const lowStockCount = alerts.length - outOfStockCount;

    // Real system status — anything out of stock or overdue is critical; low stock
    // or a payment due soon is a warning. Only a genuinely clean board reads green.
    const overdueCount = Number(dueSummary.overdue || 0);
    const dueSoonCount = Number(dueSummary.due_soon || 0);
    const criticalCount = outOfStockCount + overdueCount;
    const warningCount = lowStockCount + dueSoonCount;
    const status = criticalCount > 0
        ? { tone: 'red' as const, label: `${criticalCount} Need${criticalCount === 1 ? 's' : ''} Action`, Icon: AlertTriangle }
        : warningCount > 0
            ? { tone: 'amber' as const, label: `${warningCount} Need${warningCount === 1 ? 's' : ''} Attention`, Icon: Clock }
            : { tone: 'green' as const, label: 'All Systems Good', Icon: ShieldCheck };

    return (
        <div className="text-left">

            <PageHeader
                title="System Alerts"
                subtitle="Real-time updates on low stock and recent events"
                breadcrumbs={[{ label: 'Console', href: '/admin/dashboard' }, { label: 'System Alerts' }]}
                actions={
                    <div className="flex items-center gap-3">
                        <Badge tone={status.tone}>
                            <status.Icon className="h-3.5 w-3.5" /> {status.label}
                        </Badge>
                        <Button variant="outline" size="sm" onClick={() => fetchData()} disabled={loading}>
                            <RefreshCw size={14} className={loading ? 'animate-spin' : ''} /> Refresh
                        </Button>
                    </div>
                }
            />

            <div className="space-y-8">

                {/* PAYMENTS DUE & OVERDUE */}
                <section className="space-y-4">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                        <div>
                            <h2 className="text-[15px] font-bold text-slate-900 tracking-tight flex items-center gap-2">
                                <Wallet className="h-4 w-4 text-indigo-600" /> Payments Due
                            </h2>
                            <p className="text-[12px] text-slate-500 mt-0.5">Outstanding settlements across sales, purchases and refunds</p>
                        </div>
                        <div className="flex items-center gap-2 flex-wrap">
                            {dueSummary.overdue > 0 && <Badge tone="red">{dueSummary.overdue} Overdue · {money(dueSummary.overdue_amount)}</Badge>}
                            {dueSummary.due_soon > 0 && <Badge tone="amber">{dueSummary.due_soon} Due Soon</Badge>}
                            <Badge tone="neutral">{money(dueSummary.total_outstanding)} Outstanding</Badge>
                        </div>
                    </div>

                    {due.length === 0 ? (
                        <Card className="p-10 text-center">
                            <div className="w-14 h-14 bg-emerald-50 rounded-full flex items-center justify-center mx-auto mb-3 border border-emerald-100">
                                <CheckCircle2 className="h-7 w-7 text-emerald-600" />
                            </div>
                            <p className="text-[13px] font-semibold text-slate-500">No outstanding payments. Everything is settled.</p>
                        </Card>
                    ) : (
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                            {due.slice(0, 12).map((d, i) => {
                                const overdue = d.bucket === 'overdue';
                                const soon = d.bucket === 'due_soon';
                                const tone = overdue ? { bg: 'bg-rose-50', text: 'text-rose-600', border: 'border-rose-200' }
                                    : soon ? { bg: 'bg-amber-50', text: 'text-amber-600', border: 'border-amber-200' }
                                        : { bg: 'bg-slate-50', text: 'text-slate-500', border: 'border-slate-200' };
                                return (
                                    <Link key={`${d.type}-${d.ref}-${i}`} href={DUE_LINK[d.type] || '/admin/payments'}
                                        className={`group block rounded-xl border bg-white p-3.5 hover:shadow-md transition-all ${tone.border}`}>
                                        <div className="flex items-center justify-between mb-2">
                                            <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border uppercase tracking-wider ${tone.text} ${tone.bg} ${tone.border}`}>
                                                {DUE_TYPE_LABEL[d.type] || d.type}
                                            </span>
                                            <span className={`text-[10px] font-bold flex items-center gap-1 ${tone.text}`}>
                                                {overdue ? <><AlertTriangle className="h-3 w-3" /> {d.days_overdue}d late</>
                                                    : soon ? <><CalendarClock className="h-3 w-3" /> Due soon</>
                                                        : d.due_date ? <><CalendarClock className="h-3 w-3" /> {formatDate(d.due_date)}</> : 'No due date'}
                                            </span>
                                        </div>
                                        <p className="text-[13px] font-bold text-slate-900 truncate">{d.party}</p>
                                        <p className="text-[10.5px] text-slate-400 font-medium mb-2">#{d.ref}</p>
                                        <div className="flex items-end justify-between">
                                            <div>
                                                <p className="text-[9.5px] font-bold uppercase tracking-wider text-slate-400">Remaining</p>
                                                <p className={`text-[15px] font-bold tabular-nums ${tone.text}`}>{money(d.remaining)}</p>
                                            </div>
                                            <span className="inline-flex items-center gap-1 text-[11px] font-bold text-indigo-600 group-hover:gap-1.5 transition-all">
                                                Settle <ArrowRight className="h-3 w-3" />
                                            </span>
                                        </div>
                                    </Link>
                                );
                            })}
                        </div>
                    )}
                </section>

                {/* INVENTORY MESH MONITOR */}
                <section className="space-y-4">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                        <div>
                            <h2 className="text-[15px] font-bold text-slate-900 tracking-tight flex items-center gap-2">
                                <Activity className="h-4 w-4 text-indigo-600" /> Low Stock Alerts
                            </h2>
                            <p className="text-[12px] text-slate-500 mt-0.5">Products running low or out of stock</p>
                        </div>
                        <Badge
                            tone={outOfStockCount > 0 ? 'red' : lowStockCount > 0 ? 'amber' : 'green'}
                            className="self-start sm:self-auto"
                        >
                            {alerts.length === 0
                                ? 'All stocked'
                                : `${outOfStockCount} Out of Stock · ${lowStockCount} Low Stock`}
                        </Badge>
                    </div>

                    {alerts.length === 0 ? (
                        <Card className="p-12 text-center">
                            <div className="w-16 h-16 bg-emerald-50 rounded-full flex items-center justify-center mx-auto mb-4 border border-emerald-100">
                                <CheckCircle2 className="h-8 w-8 text-emerald-600" />
                            </div>
                            <p className="text-[13px] font-semibold text-slate-500 leading-relaxed">All products have sufficient stock levels.</p>
                        </Card>
                    ) : (
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                            {alerts.map(a => (
                                <Card key={a.id} className="hover:shadow-md transition-all flex flex-col justify-between">
                                    <div className="p-4 flex-1">
                                        <div className="flex items-center justify-between mb-4">
                                            <div className={`w-8 h-8 ${a.bg} ${a.color} rounded-lg flex items-center justify-center shrink-0 border ${a.border}`}>
                                                <a.icon size={16} />
                                            </div>
                                            <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border uppercase tracking-wider ${a.color} ${a.bg} ${a.border}`}>
                                                {a.remaining} Left
                                            </span>
                                        </div>
                                        <div>
                                            <Link href={a.href || '#'} className="block group">
                                                <h3 className="text-[13px] font-bold text-indigo-600 group-hover:text-indigo-700 group-hover:underline truncate">{a.product}</h3>
                                            </Link>
                                            <p className={`text-[10px] font-bold uppercase tracking-widest mt-1.5 flex items-center gap-1 ${a.color}`}>
                                                <AlertTriangle className="h-3.5 w-3.5" /> {a.type.replace(/_/g, ' ')}
                                            </p>
                                        </div>
                                    </div>
                                    <div className="p-4 pt-0">
                                        <Link href={`/admin/purchases/add?${new URLSearchParams({
                                            ...(a.supplierId ? { supplier: String(a.supplierId) } : {}),
                                            ...(a.sku && a.sku !== 'No Identifier' ? { sku: a.sku } : {}),
                                            product_name: a.product || '',
                                        }).toString()}`} className="block w-full">
                                            <Button variant="outline" size="sm" className="w-full uppercase tracking-wider text-[11px]">
                                                <Plus size={13} /> Order Stock
                                            </Button>
                                        </Link>
                                    </div>
                                </Card>
                            ))}
                        </div>
                    )}
                </section>

                {/* RECENT ACTIVITY LOG */}
                <section className="space-y-4">
                    <div>
                        <h2 className="text-[15px] font-bold text-slate-900 tracking-tight flex items-center gap-2">
                            <ClipboardList className="h-4 w-4 text-indigo-600" /> Recent Activity Log
                        </h2>
                        <p className="text-[12px] text-slate-500 mt-0.5">Recent actions on orders, users, and purchases</p>
                    </div>

                    <div className="relative">
                        <div className="absolute left-6 top-8 bottom-8 w-0.5 bg-slate-100" />
                        <div className="space-y-4">
                            {activities.map((act) => (
                                <div key={act.id} className="relative pl-14 group">
                                    <div className={`absolute left-0 top-1.5 w-9 h-9 ${act.bg} ${act.color} rounded-lg z-10 flex items-center justify-center shadow-sm border ${act.border} transform group-hover:scale-105 transition-all`}>
                                        <act.icon size={16} />
                                    </div>
                                    <Card className="p-4 hover:bg-slate-50 transition-all">
                                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-2">
                                            <div className="flex flex-wrap items-center gap-2">
                                                <Badge tone="neutral">{act.type}</Badge>
                                                <h3 className="text-[13px] font-bold text-slate-900 tracking-tight">{act.title}</h3>
                                            </div>
                                            <div className="text-[10px] font-bold text-slate-400 flex items-center gap-1.5 tracking-wider tabular-nums whitespace-nowrap">
                                                <Clock size={11} className="text-indigo-600" /> {formatDateTime(act.time.toISOString())}
                                            </div>
                                        </div>
                                        <p className="text-[12px] text-slate-600 font-medium leading-relaxed">{act.message}</p>
                                    </Card>
                                </div>
                            ))}
                            {activities.length === 0 && !loading && (
                                <p className="text-[13px] text-slate-400 font-semibold text-center py-20">No recent activity recorded.</p>
                            )}
                        </div>
                    </div>
                </section>
            </div>
        </div>
    );
}
