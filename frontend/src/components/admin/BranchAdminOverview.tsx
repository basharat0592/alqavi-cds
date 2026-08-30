'use client';

import { useMemo } from 'react';
import Link from 'next/link';
import {
    ResponsiveContainer, AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip,
} from 'recharts';
import {
    TrendingUp, Wallet, ShoppingBag, PackageX, Activity, ArrowUpRight,
    Clock, Boxes, ChevronRight, AlertTriangle, Receipt,
} from 'lucide-react';
import { formatCurrency } from '@/lib/utils';
import type { RevenueDataPoint } from '@/types';

/* Branch admin analytics band. Every figure here comes from data the dashboard
   already fetches — orders/stats/ returns the totals, the seven-day revenue
   history, the recent order list and the branch's low-stock rows in one call,
   and most of it was going unrendered. */

const AMBER = '#F59E0B';
const GRID = '#eef2f7';
const AXIS = '#94a3b8';

const kFmt = (n: number) =>
    Math.abs(n) >= 1_000_000 ? `${(n / 1_000_000).toFixed(1)}M`
        : Math.abs(n) >= 1_000 ? `${Math.round(n / 1_000)}k`
            : `${Math.round(n)}`;

const dayFmt = (d: string) => {
    try {
        return new Date(d).toLocaleDateString(undefined, { day: '2-digit', month: 'short' });
    } catch { return d; }
};

function ChartTip({ active, payload, label }: any) {
    if (!active || !payload?.length) return null;
    return (
        <div className="rounded-lg border border-slate-200 bg-white px-3 py-2 shadow-lg text-left">
            <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">{dayFmt(label)}</p>
            {payload.map((p: any) => (
                <p key={p.dataKey} className="text-[12px] font-bold tabular-nums" style={{ color: p.color || p.fill }}>
                    {formatCurrency(Number(p.value || 0))}
                </p>
            ))}
        </div>
    );
}

/** Headline figure. `tone` colours the value, not the whole card — a wall of
 *  coloured panels reads as alarm rather than information. */
function Kpi({ icon: Icon, label, value, sub, tone = 'slate', href }: {
    icon: any; label: string; value: string; sub?: string;
    tone?: 'slate' | 'emerald' | 'rose' | 'amber'; href?: string;
}) {
    const toneCls = {
        slate: 'text-slate-900',
        emerald: 'text-emerald-700',
        rose: 'text-rose-600',
        amber: 'text-[#B4780B]',
    }[tone];
    const iconCls = {
        slate: 'bg-slate-100 text-slate-500',
        emerald: 'bg-emerald-50 text-emerald-600',
        rose: 'bg-rose-50 text-rose-500',
        amber: 'bg-[#F59E0B]/10 text-[#B4780B]',
    }[tone];

    const body = (
        <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-[0_1px_2px_rgba(15,23,42,0.04)] hover:border-slate-300 transition-colors h-full">
            <div className="flex items-center gap-2 mb-2.5">
                <span className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 ${iconCls}`}>
                    <Icon size={15} />
                </span>
                <span className="text-[11.5px] font-semibold text-slate-500 truncate">{label}</span>
                {href && <ChevronRight size={14} className="ml-auto text-slate-300 shrink-0" />}
            </div>
            <p className={`text-[22px] leading-none font-bold tabular-nums tracking-[-0.02em] ${toneCls}`}>{value}</p>
            {sub && <p className="mt-2 text-[11.5px] text-slate-400 truncate">{sub}</p>}
        </div>
    );
    return href ? <Link href={href} className="block h-full">{body}</Link> : body;
}

function Panel({ icon: Icon, title, subtitle, action, children, className = '' }: any) {
    return (
        <div className={`bg-white border border-slate-200 rounded-xl shadow-[0_1px_2px_rgba(15,23,42,0.04)] p-4 sm:p-5 ${className}`}>
            <div className="flex items-center gap-2.5 mb-4">
                <span className="w-8 h-8 rounded-lg bg-[#F59E0B]/10 text-[#B4780B] flex items-center justify-center shrink-0">
                    <Icon size={16} />
                </span>
                <div className="min-w-0">
                    <h3 className="text-[13.5px] font-bold text-slate-800 tracking-tight leading-none">{title}</h3>
                    {subtitle && <p className="text-[11px] text-slate-400 font-medium mt-1">{subtitle}</p>}
                </div>
                {action && <div className="ml-auto shrink-0">{action}</div>}
            </div>
            {children}
        </div>
    );
}

export default function BranchAdminOverview({
    stats, revenueData, recentOrders, lowStock, activityLogs, productCount, loading,
}: {
    stats?: any;
    revenueData?: RevenueDataPoint[];
    recentOrders?: any[];
    lowStock?: any[];
    activityLogs?: any[];
    productCount?: number;
    loading?: boolean;
}) {
    const trend = useMemo(
        () => (revenueData || []).map(r => ({ date: r.date, sales: Number(r.sales ?? r.revenue ?? 0) })),
        [revenueData]
    );
    const hasTrend = trend.some(t => t.sales > 0);
    const weekTotal = trend.reduce((s, t) => s + t.sales, 0);
    const bestDay = trend.reduce<{ date: string; sales: number } | null>(
        (best, t) => (!best || t.sales > best.sales ? t : best), null);

    const orders = (recentOrders || []).slice(0, 7);
    const stock = (lowStock || []);
    const logs = (activityLogs || []).slice(0, 6);

    const pipeline = [
        { label: 'Pending', value: Number(stats?.pendingOrders || 0), bar: 'bg-[#F59E0B]', tone: 'text-[#B4780B]' },
        { label: 'Active', value: Number(stats?.totalActive || 0), bar: 'bg-sky-500', tone: 'text-sky-700' },
        { label: 'Delivered', value: Number(stats?.deliveredOrders || 0), bar: 'bg-emerald-500', tone: 'text-emerald-700' },
        { label: 'Today', value: Number(stats?.ordersToday || 0), bar: 'bg-violet-500', tone: 'text-violet-700' },
    ];
    const pipelineMax = Math.max(1, ...pipeline.map(r => r.value));

    // Out of stock is a strictly worse case than low stock and worth calling out
    // on its own — a zero cannot be sold, a three still can.
    const outOfStock = stock.filter(p => Number(p.qty ?? p.total_quantity ?? 0) <= 0).length;

    return (
        <div className="space-y-4">

            {/* ── Headline figures ── */}
            <div className="grid grid-cols-2 xl:grid-cols-4 gap-3 sm:gap-4">
                <Kpi
                    icon={TrendingUp} label="Revenue" tone="emerald"
                    value={loading ? '—' : formatCurrency(Number(stats?.totalRevenue || 0))}
                    sub="Delivered sales"
                    href="/admin/sales"
                />
                <Kpi
                    icon={Wallet} label="Profit" tone="slate"
                    value={loading ? '—' : formatCurrency(Number(stats?.totalProfit || 0))}
                    sub="Margin, net of returns"
                    href="/admin/reports"
                />
                <Kpi
                    icon={ShoppingBag} label="Active Orders" tone="amber"
                    value={loading ? '—' : String(stats?.totalActive ?? 0)}
                    sub={`${Number(stats?.ordersToday || 0)} placed today`}
                    href="/admin/orders"
                />
                <Kpi
                    icon={Receipt} label="Payable" tone="rose"
                    value={loading ? '—' : formatCurrency(Number(stats?.totalPayable || 0))}
                    sub="Owed on open purchases"
                    href="/admin/purchases"
                />
            </div>

            {/* ── Trend + pipeline ── */}
            <div className="grid grid-cols-1 xl:grid-cols-[1.4fr_1fr] gap-4">

                <Panel
                    icon={TrendingUp}
                    title="Revenue Trend"
                    subtitle="Delivered sales · last 7 days"
                    action={
                        <div className="text-right">
                            <p className="text-[15px] font-bold text-slate-900 tabular-nums leading-none">
                                {formatCurrency(weekTotal)}
                            </p>
                            <p className="text-[10.5px] text-slate-400 font-medium mt-1">7-day total</p>
                        </div>
                    }
                >
                    {hasTrend ? (
                        <>
                            <ResponsiveContainer width="100%" height={220}>
                                <AreaChart data={trend} margin={{ top: 6, right: 8, left: -14, bottom: 0 }}>
                                    <defs>
                                        <linearGradient id="baRev" x1="0" y1="0" x2="0" y2="1">
                                            <stop offset="0%" stopColor={AMBER} stopOpacity={0.30} />
                                            <stop offset="100%" stopColor={AMBER} stopOpacity={0.02} />
                                        </linearGradient>
                                    </defs>
                                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={GRID} />
                                    <XAxis dataKey="date" tickFormatter={dayFmt} tick={{ fontSize: 10, fill: AXIS }} axisLine={false} tickLine={false} minTickGap={20} />
                                    <YAxis tickFormatter={kFmt} tick={{ fontSize: 10, fill: AXIS }} axisLine={false} tickLine={false} width={46} />
                                    <Tooltip content={<ChartTip />} />
                                    <Area type="monotone" dataKey="sales" stroke={AMBER} strokeWidth={2} fill="url(#baRev)" />
                                </AreaChart>
                            </ResponsiveContainer>
                            {bestDay && bestDay.sales > 0 && (
                                <p className="mt-2 text-[11.5px] text-slate-400">
                                    Best day <b className="text-slate-600">{dayFmt(bestDay.date)}</b> at{' '}
                                    <b className="text-slate-600 tabular-nums">{formatCurrency(bestDay.sales)}</b>
                                </p>
                            )}
                        </>
                    ) : (
                        <div className="h-[220px] flex flex-col items-center justify-center gap-1 text-center">
                            <p className="text-[12.5px] text-slate-400">
                                {loading ? 'Loading…' : 'No delivered orders in the last 7 days.'}
                            </p>
                            {!loading && (
                                <p className="text-[11px] text-slate-400">
                                    Only delivered sales count as revenue — mark orders delivered to see them here.
                                </p>
                            )}
                        </div>
                    )}
                </Panel>

                <Panel icon={Activity} title="Order Pipeline" subtitle="Where orders currently sit">
                    <div className="space-y-3">
                        {pipeline.map(row => (
                            <div key={row.label}>
                                <div className="flex items-baseline justify-between gap-2 mb-1.5">
                                    <span className="text-[12.5px] font-semibold text-slate-600">{row.label}</span>
                                    <span className={`text-[14px] font-bold tabular-nums ${row.tone}`}>{row.value}</span>
                                </div>
                                <div className="h-2 rounded-full bg-slate-100 overflow-hidden">
                                    <div className={`h-full rounded-full ${row.bar} transition-[width] duration-500`}
                                        style={{ width: `${(row.value / pipelineMax) * 100}%` }} />
                                </div>
                            </div>
                        ))}
                    </div>

                    <div className="mt-4 pt-3 border-t border-slate-100 grid grid-cols-2 gap-3">
                        <div>
                            <p className="text-[10.5px] font-semibold uppercase tracking-wider text-slate-400">Products</p>
                            <p className="text-[16px] font-bold text-slate-900 tabular-nums mt-1">{productCount ?? 0}</p>
                        </div>
                        <div>
                            <p className="text-[10.5px] font-semibold uppercase tracking-wider text-slate-400">Out of stock</p>
                            <p className={`text-[16px] font-bold tabular-nums mt-1 ${outOfStock ? 'text-rose-600' : 'text-slate-900'}`}>
                                {outOfStock}
                            </p>
                        </div>
                    </div>
                </Panel>
            </div>

            {/* ── Orders + stock risk ── */}
            <div className="grid grid-cols-1 xl:grid-cols-[1.4fr_1fr] gap-4">

                <Panel
                    icon={ShoppingBag}
                    title="Recent Orders"
                    subtitle="Latest sales from this organization"
                    action={
                        <Link href="/admin/orders" className="inline-flex items-center gap-1 text-[11.5px] font-bold text-[#B4780B] hover:underline">
                            View all <ArrowUpRight size={12} />
                        </Link>
                    }
                >
                    {orders.length ? (
                        <div className="divide-y divide-slate-100 -mt-1">
                            {orders.map((o: any) => {
                                const st = String(o.status || '').toUpperCase();
                                const tone = st === 'DELIVERED' ? 'bg-emerald-50 text-emerald-700'
                                    : st === 'CANCELLED' ? 'bg-rose-50 text-rose-600'
                                        : 'bg-[#F59E0B]/12 text-[#B4780B]';
                                return (
                                    <Link key={o.id} href={`/admin/sales/${o.id}/invoice`}
                                        className="flex items-center gap-3 py-2.5 hover:bg-slate-50/70 -mx-2 px-2 rounded-lg transition-colors">
                                        <div className="min-w-0 flex-1">
                                            <p className="text-[12.5px] font-semibold text-slate-800 truncate">
                                                {o.customer_name || 'Walk-in'}
                                            </p>
                                            <p className="text-[10.5px] text-slate-400 font-medium truncate">
                                                {o.order_number || String(o.id).slice(0, 8)}
                                            </p>
                                        </div>
                                        <span className={`shrink-0 px-2 py-0.5 rounded-full text-[9.5px] font-bold uppercase tracking-wider ${tone}`}>
                                            {st || 'PENDING'}
                                        </span>
                                        <span className="shrink-0 text-[12.5px] font-bold tabular-nums text-slate-900 w-[92px] text-right">
                                            {formatCurrency(Number(o.total_amount || 0))}
                                        </span>
                                    </Link>
                                );
                            })}
                        </div>
                    ) : (
                        <div className="h-[200px] flex items-center justify-center text-[12.5px] text-slate-400">
                            {loading ? 'Loading…' : 'No orders yet.'}
                        </div>
                    )}
                </Panel>

                <Panel
                    icon={PackageX}
                    title="Stock Risk"
                    subtitle="At or below the reorder point"
                    action={
                        stock.length ? (
                            <span className={`px-2 py-0.5 rounded-full text-[10.5px] font-bold ${outOfStock ? 'bg-rose-50 text-rose-600' : 'bg-[#F59E0B]/12 text-[#B4780B]'}`}>
                                {stock.length}
                            </span>
                        ) : undefined
                    }
                >
                    {stock.length ? (
                        <div className="max-h-[240px] overflow-y-auto custom-scrollbar -mx-1 px-1">
                            <div className="divide-y divide-slate-100">
                                {stock.slice(0, 12).map((p: any, i: number) => {
                                    const qty = Number(p.qty ?? p.total_quantity ?? 0);
                                    const min = Number(p.min ?? p.reorder_level ?? 0);
                                    return (
                                        <div key={i} className="flex items-center gap-2.5 py-2">
                                            {qty <= 0
                                                ? <AlertTriangle size={13} className="text-rose-500 shrink-0" />
                                                : <Boxes size={13} className="text-[#B4780B] shrink-0" />}
                                            <span className="min-w-0 flex-1 text-[12.5px] font-medium text-slate-700 truncate">
                                                {p.product_name || p.name || 'Unnamed product'}
                                            </span>
                                            <span className="shrink-0 text-[10.5px] text-slate-400 tabular-nums">min {min}</span>
                                            <span className={`shrink-0 w-[42px] text-right text-[12.5px] font-bold tabular-nums ${qty <= 0 ? 'text-rose-600' : 'text-[#B4780B]'}`}>
                                                {qty}
                                            </span>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    ) : (
                        <div className="h-[200px] flex items-center justify-center text-[12.5px] text-slate-400">
                            {loading ? 'Loading…' : 'Nothing below its reorder point.'}
                        </div>
                    )}
                </Panel>
            </div>

            {/* ── Activity ── */}
            {logs.length > 0 && (
                <Panel icon={Clock} title="Recent Activity" subtitle="Latest events in this organization">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-2.5">
                        {logs.map((l: any, i: number) => (
                            <div key={i} className="flex gap-2.5 min-w-0">
                                <span className="mt-[7px] w-1.5 h-1.5 rounded-full bg-[#F59E0B] shrink-0" />
                                <div className="min-w-0">
                                    <p className="text-[12px] font-medium text-slate-700 leading-snug line-clamp-2">
                                        {l.description || l.action || l.title || 'Activity'}
                                    </p>
                                    <p className="text-[10.5px] text-slate-400">
                                        {(l.created_at || l.timestamp || '').toString().slice(0, 16).replace('T', ' ')}
                                    </p>
                                </div>
                            </div>
                        ))}
                    </div>
                </Panel>
            )}
        </div>
    );
}
