'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import {
    ResponsiveContainer, AreaChart, Area, BarChart, Bar, PieChart, Pie, Cell,
    XAxis, YAxis, CartesianGrid, Tooltip, Legend,
} from 'recharts';
import {
    TrendingUp, BarChart3, PieChart as PieIcon, Activity, ClipboardList,
    ArrowRight, PackageCheck, AlertTriangle,
} from 'lucide-react';
import { paymentService, productService } from '@/lib/api';
import { formatCurrency } from '@/lib/utils';
import type { RevenueDataPoint } from '@/types';

/* Branch admin analytics. Everything is drawn from data the app already
   exposes: orders/stats/ for the totals, seven-day history and recent orders;
   payments/transactions/ for the monthly in/out split; the product list for the
   category mix. */

const AMBER = '#F59E0B';
const TEAL = '#0F766E';
const RED = '#DC2626';
const GRID = '#eef2f7';
const AXIS = '#94a3b8';

// Donut slices, in the order categories are ranked.
const SLICE = ['#0F766E', '#F59E0B', '#0EA5E9', '#DC2626', '#7C3AED', '#DB2777', '#65A30D', '#64748B'];

const dayFmt = (d: string) => {
    try { return new Date(d).toLocaleDateString(undefined, { day: '2-digit', month: 'short' }); }
    catch { return d; }
};
const kFmt = (n: number) =>
    Math.abs(n) >= 1_000_000 ? `${(n / 1_000_000).toFixed(1)}M`
        : Math.abs(n) >= 1_000 ? `${Math.round(n / 1_000)}k`
            : `${Math.round(n)}`;

function MoneyTip({ active, payload, label }: any) {
    if (!active || !payload?.length) return null;
    return (
        <div className="rounded-lg border border-slate-200 bg-white px-3 py-2 shadow-lg text-left">
            <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">{label}</p>
            {payload.map((p: any) => (
                <p key={p.dataKey} className="text-[12px] font-bold tabular-nums" style={{ color: p.color || p.fill }}>
                    {p.name}: {formatCurrency(Number(p.value || 0))}
                </p>
            ))}
        </div>
    );
}

/** Card shell: round icon badge, title, subtitle, optional right-hand slot. */
function Panel({ icon: Icon, title, subtitle, action, children, className = '' }: any) {
    return (
        <div className={`bg-white border border-slate-200/80 rounded-2xl shadow-[0_1px_3px_rgba(15,23,42,0.05)] p-5 ${className}`}>
            <div className="flex items-start gap-3 mb-4">
                <span className="w-9 h-9 rounded-full bg-[#F59E0B]/10 text-[#B4780B] flex items-center justify-center shrink-0">
                    <Icon size={17} />
                </span>
                <div className="min-w-0 flex-1">
                    <h3 className="text-[15px] font-bold text-slate-900 tracking-[-0.01em] leading-tight">{title}</h3>
                    {subtitle && <p className="text-[12px] text-slate-500 mt-0.5 leading-snug">{subtitle}</p>}
                </div>
                {action && <div className="shrink-0 text-right">{action}</div>}
            </div>
            {children}
        </div>
    );
}

/* ── Compact stock-risk card for the right rail ── */
export function StockRiskCard({ lowStock = [] }: { lowStock?: any[] }) {
    const rows = lowStock || [];
    if (!rows.length) return null;
    return (
        <div className="bg-white border border-slate-200/80 rounded-2xl shadow-[0_1px_3px_rgba(15,23,42,0.05)] p-5 mt-4">
            <div className="flex items-start gap-3 mb-3">
                <span className="w-9 h-9 rounded-full bg-[#F59E0B]/10 text-[#B4780B] flex items-center justify-center shrink-0">
                    <PackageCheck size={17} />
                </span>
                <div className="min-w-0 flex-1">
                    <h3 className="text-[15px] font-bold text-slate-900 leading-tight">Stock Risk</h3>
                    <p className="text-[12px] text-slate-500 mt-0.5 leading-snug">At or below the reorder point</p>
                </div>
                <span className="text-[20px] font-bold text-[#B4780B] tabular-nums leading-none">{rows.length}</span>
            </div>
            <div className="divide-y divide-slate-100">
                {rows.slice(0, 5).map((p: any, i: number) => {
                    const qty = Number(p.qty ?? p.total_quantity ?? 0);
                    return (
                        <div key={i} className="flex items-center gap-2 py-2">
                            <AlertTriangle size={13} className={qty <= 0 ? 'text-rose-500 shrink-0' : 'text-[#F59E0B] shrink-0'} />
                            <span className="min-w-0 flex-1 text-[12.5px] text-slate-700 truncate">
                                {p.product_name || p.name || 'Unnamed'}
                            </span>
                            <span className="shrink-0 text-[11px] text-slate-400 tabular-nums">min {Number(p.min ?? 0)}</span>
                            <span className={`shrink-0 w-6 text-right text-[13px] font-bold tabular-nums ${qty <= 0 ? 'text-rose-600' : 'text-[#B4780B]'}`}>
                                {qty}
                            </span>
                        </div>
                    );
                })}
            </div>
        </div>
    );
}

export default function BranchAdminOverview({
    stats, revenueData, recentOrders, lowStock, productCount, loading,
}: {
    stats?: any;
    revenueData?: RevenueDataPoint[];
    recentOrders?: any[];
    lowStock?: any[];
    productCount?: number;
    loading?: boolean;
}) {
    // Out of stock is the subset of low stock that has actually run out.
    const outOfStock = (lowStock || []).filter(
        (p: any) => Number(p.qty ?? p.total_quantity ?? 0) <= 0
    ).length;
    // ── Revenue trend ──
    const trend = useMemo(
        () => (revenueData || []).map(r => ({ date: r.date, sales: Number(r.sales ?? r.revenue ?? 0) })),
        [revenueData]
    );
    const hasTrend = trend.some(t => t.sales > 0);
    const weekTotal = trend.reduce((s, t) => s + t.sales, 0);

    // ── Income vs expenses, last six months ──
    // Built from the payment ledger rather than a dedicated endpoint: every sale,
    // purchase, return and manual entry already lands there as inbound/outbound.
    const [months, setMonths] = useState<{ m: string; income: number; expense: number }[]>([]);
    const [flowLoaded, setFlowLoaded] = useState(false);
    useEffect(() => {
        let cancelled = false;
        paymentService.getAll()
            .then((rows: any[]) => {
                if (cancelled) return;
                const now = new Date();
                const buckets: { key: string; m: string; income: number; expense: number }[] = [];
                for (let i = 5; i >= 0; i--) {
                    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
                    buckets.push({
                        key: `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`,
                        m: d.toLocaleDateString(undefined, { month: 'short' }).toUpperCase(),
                        income: 0, expense: 0,
                    });
                }
                const byKey = new Map(buckets.map(b => [b.key, b]));
                for (const p of (Array.isArray(rows) ? rows : [])) {
                    const raw = String(p?.date || p?.created_at || '');
                    const key = raw.slice(0, 7);
                    const b = byKey.get(key);
                    if (!b) continue;
                    const amt = Math.abs(Number(p.amount || 0));
                    if (String(p.payment_type) === 'outbound') b.expense += amt;
                    else b.income += amt;
                }
                setMonths(buckets.map(({ m, income, expense }) => ({ m, income, expense })));
            })
            .catch(() => { if (!cancelled) setMonths([]); })
            .finally(() => { if (!cancelled) setFlowLoaded(true); });
        return () => { cancelled = true; };
    }, []);
    const hasFlow = months.some(m => m.income > 0 || m.expense > 0);

    // ── Category mix ──
    // The catalogue's split by category. Sales-by-category would need the order
    // lines joined to categories, which no endpoint returns today.
    const [cats, setCats] = useState<{ name: string; value: number }[]>([]);
    const [catsLoaded, setCatsLoaded] = useState(false);
    useEffect(() => {
        let cancelled = false;
        productService.getAll?.({ all_items: 'true' } as any)
            .then((res: any) => {
                if (cancelled) return;
                const list = Array.isArray(res) ? res : (res?.results || []);
                const tally = new Map<string, number>();
                for (const p of list) {
                    const name = String(p?.category_name || 'Uncategorised').trim() || 'Uncategorised';
                    tally.set(name, (tally.get(name) || 0) + 1);
                }
                setCats([...tally.entries()]
                    .map(([name, value]) => ({ name, value }))
                    .sort((a, b) => b.value - a.value)
                    .slice(0, 6));
            })
            .catch(() => { if (!cancelled) setCats([]); })
            .finally(() => { if (!cancelled) setCatsLoaded(true); });
        return () => { cancelled = true; };
    }, []);
    const catTotal = cats.reduce((s, c) => s + c.value, 0);

    // ── Pipeline ──
    const pipeline = [
        { label: 'Pending', value: Number(stats?.pendingOrders || 0), bar: 'bg-[#F59E0B]', tone: 'text-[#B4780B]' },
        { label: 'Active', value: Number(stats?.totalActive || 0), bar: 'bg-[#0F766E]', tone: 'text-[#0F766E]' },
        { label: 'Delivered', value: Number(stats?.deliveredOrders || 0), bar: 'bg-emerald-500', tone: 'text-emerald-600' },
        { label: 'Today', value: Number(stats?.ordersToday || 0), bar: 'bg-violet-500', tone: 'text-violet-600' },
    ];
    const pipelineMax = Math.max(1, ...pipeline.map(r => r.value));
    const orders = (recentOrders || []).slice(0, 5);

    const statusTone = (st: string) =>
        st === 'DELIVERED' ? 'bg-emerald-50 text-emerald-700'
            : st === 'CANCELLED' ? 'bg-rose-50 text-rose-600'
                : 'bg-[#F59E0B]/12 text-[#B4780B]';

    return (
        <div className="space-y-4">

            {/* ── Revenue trend · Income vs expenses ── */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">

                <Panel
                    icon={TrendingUp}
                    title="Revenue Trend"
                    subtitle="Delivered sales · last 7 days"
                    action={
                        <>
                            <p className="text-[19px] font-bold text-slate-900 tabular-nums leading-none">
                                {formatCurrency(weekTotal)}
                            </p>
                            <p className="text-[11px] text-slate-400 mt-1">7-day total</p>
                        </>
                    }
                >
                    {hasTrend ? (
                        <ResponsiveContainer width="100%" height={190}>
                            <AreaChart data={trend} margin={{ top: 6, right: 8, left: -18, bottom: 0 }}>
                                <defs>
                                    <linearGradient id="baRev" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="0%" stopColor={AMBER} stopOpacity={0.32} />
                                        <stop offset="100%" stopColor={AMBER} stopOpacity={0.02} />
                                    </linearGradient>
                                </defs>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={GRID} />
                                <XAxis dataKey="date" tickFormatter={dayFmt} tick={{ fontSize: 10, fill: AXIS }} axisLine={false} tickLine={false} minTickGap={18} />
                                <YAxis tickFormatter={kFmt} tick={{ fontSize: 10, fill: AXIS }} axisLine={false} tickLine={false} width={44} />
                                <Tooltip content={<MoneyTip />} />
                                <Area type="monotone" dataKey="sales" name="Sales" stroke={AMBER} strokeWidth={2} fill="url(#baRev)" />
                            </AreaChart>
                        </ResponsiveContainer>
                    ) : (
                        <div className="h-[190px] flex flex-col items-center justify-center text-center px-6">
                            <p className="text-[14px] font-semibold text-slate-700">
                                {loading ? 'Loading…' : 'No delivered orders in the last 7 days.'}
                            </p>
                            {!loading && (
                                <p className="text-[11.5px] text-slate-400 mt-1.5 leading-relaxed">
                                    Only delivered sales count as revenue — mark orders delivered to see them here.
                                </p>
                            )}
                        </div>
                    )}
                </Panel>

                <Panel
                    icon={BarChart3}
                    title="Profitability Analysis"
                    subtitle="Income vs expenses · last 6 months"
                >
                    {hasFlow ? (
                        <ResponsiveContainer width="100%" height={218}>
                            <BarChart data={months} margin={{ top: 6, right: 8, left: -18, bottom: 0 }} barGap={4}>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={GRID} />
                                <XAxis dataKey="m" tick={{ fontSize: 10, fill: AXIS }} axisLine={false} tickLine={false} />
                                <YAxis tickFormatter={kFmt} tick={{ fontSize: 10, fill: AXIS }} axisLine={false} tickLine={false} width={44} />
                                <Tooltip content={<MoneyTip />} cursor={{ fill: 'rgba(15,23,42,0.035)' }} />
                                <Legend
                                    verticalAlign="bottom" height={26} iconType="circle" iconSize={8}
                                    formatter={(v) => <span style={{ fontSize: 11, color: '#64748b', fontWeight: 600 }}>{String(v).toUpperCase()}</span>}
                                />
                                <Bar dataKey="income" name="Income" fill={TEAL} radius={[3, 3, 0, 0]} maxBarSize={16} />
                                <Bar dataKey="expense" name="Expenses" fill={RED} radius={[3, 3, 0, 0]} maxBarSize={16} />
                            </BarChart>
                        </ResponsiveContainer>
                    ) : (
                        <div className="h-[218px] flex items-center justify-center text-[12.5px] text-slate-400">
                            {flowLoaded ? 'No payments recorded in the last 6 months.' : 'Loading…'}
                        </div>
                    )}
                </Panel>
            </div>

            {/* ── Category mix · pipeline ── */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">

                <Panel icon={PieIcon} title="Top Categories" subtitle="Products by category">
                    {cats.length ? (
                        <>
                            <div className="relative">
                                <ResponsiveContainer width="100%" height={200}>
                                    <PieChart>
                                        <Pie
                                            data={cats} dataKey="value" nameKey="name"
                                            cx="50%" cy="50%" innerRadius={58} outerRadius={88}
                                            paddingAngle={2} stroke="none"
                                        >
                                            {cats.map((_, i) => <Cell key={i} fill={SLICE[i % SLICE.length]} />)}
                                        </Pie>
                                        <Tooltip
                                            formatter={(v: any, n: any) => [`${v} product${Number(v) === 1 ? '' : 's'}`, n]}
                                            contentStyle={{ borderRadius: 8, border: '1px solid #e2e8f0', fontSize: 12 }}
                                        />
                                    </PieChart>
                                </ResponsiveContainer>
                                <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                                    <span className="text-[13px] font-bold text-slate-800 leading-none">Total</span>
                                    <span className="text-[12px] text-slate-400 mt-1 tabular-nums">{catTotal}</span>
                                </div>
                            </div>
                            <div className="mt-3 pt-3 border-t border-slate-100 grid grid-cols-2 gap-x-4 gap-y-2">
                                {cats.map((c, i) => (
                                    <div key={c.name} className="flex items-center gap-2 min-w-0">
                                        <span className="w-2 h-2 rounded-full shrink-0" style={{ background: SLICE[i % SLICE.length] }} />
                                        <span className="text-[12px] text-slate-600 truncate">{c.name}</span>
                                        <span className="ml-auto text-[11.5px] font-semibold text-slate-400 tabular-nums shrink-0">
                                            {catTotal ? Math.round((c.value / catTotal) * 100) : 0}%
                                        </span>
                                    </div>
                                ))}
                            </div>
                        </>
                    ) : (
                        <div className="h-[240px] flex items-center justify-center text-[12.5px] text-slate-400">
                            {catsLoaded ? 'No products yet.' : 'Loading…'}
                        </div>
                    )}
                </Panel>

                <Panel icon={Activity} title="Order Pipeline" subtitle="Where orders currently sit">
                    <div className="space-y-3.5">
                        {pipeline.map(row => (
                            <div key={row.label}>
                                <div className="flex items-baseline justify-between gap-2 mb-1.5">
                                    <span className="text-[13.5px] font-semibold text-slate-700">{row.label}</span>
                                    <span className={`text-[14px] font-bold tabular-nums ${row.tone}`}>{row.value}</span>
                                </div>
                                <div className="h-1.5 rounded-full bg-slate-100 overflow-hidden">
                                    <div className={`h-full rounded-full ${row.bar} transition-[width] duration-500`}
                                        style={{ width: `${(row.value / pipelineMax) * 100}%` }} />
                                </div>
                            </div>
                        ))}
                    </div>
                    <div className="mt-5 pt-4 border-t border-slate-100 flex items-start justify-between gap-4">
                        <div>
                            <p className="text-[10.5px] font-semibold uppercase tracking-wider text-slate-400">Products</p>
                            <p className="text-[22px] font-bold text-slate-900 tabular-nums leading-none mt-1.5">{productCount ?? 0}</p>
                        </div>
                        <div className="text-right">
                            <p className="text-[10.5px] font-semibold uppercase tracking-wider text-slate-400">Out of stock</p>
                            <p className={`text-[22px] font-bold tabular-nums leading-none mt-1.5 ${outOfStock ? 'text-rose-600' : 'text-slate-900'}`}>
                                {outOfStock}
                            </p>
                        </div>
                    </div>
                </Panel>
            </div>

            {/* ── Recent orders ── */}
            <Panel
                icon={ClipboardList}
                title="Recent Orders"
                subtitle="Latest sales from this organization"
                action={
                    <Link href="/admin/orders" className="inline-flex items-center gap-1.5 text-[13px] font-semibold text-slate-800 hover:text-[#B4780B] transition-colors">
                        View all <ArrowRight size={14} />
                    </Link>
                }
            >
                {orders.length ? (
                    <div className="divide-y divide-slate-100 -mt-1">
                        {orders.map((o: any) => {
                            const st = String(o.status || 'PENDING').toUpperCase();
                            return (
                                <Link key={o.id} href={`/admin/sales/${o.id}/invoice`}
                                    className="flex items-center gap-3 py-3 hover:bg-slate-50/70 -mx-2 px-2 rounded-lg transition-colors">
                                    <div className="min-w-0 flex-1">
                                        <p className="text-[14px] font-semibold text-slate-900 truncate">
                                            {o.customer_name || 'Walk-in'}
                                        </p>
                                        <p className="text-[12px] text-slate-400 tabular-nums truncate">
                                            {o.order_number || String(o.id).slice(0, 8)}
                                        </p>
                                    </div>
                                    <span className={`shrink-0 px-2.5 py-1 rounded-md text-[10px] font-bold uppercase tracking-wider ${statusTone(st)}`}>
                                        {st}
                                    </span>
                                    <span className="shrink-0 text-[14px] font-bold tabular-nums text-slate-900 w-[104px] text-right">
                                        {formatCurrency(Number(o.total_amount || 0))}
                                    </span>
                                </Link>
                            );
                        })}
                    </div>
                ) : (
                    <div className="h-[160px] flex items-center justify-center text-[12.5px] text-slate-400">
                        {loading ? 'Loading…' : 'No orders yet.'}
                    </div>
                )}
            </Panel>
        </div>
    );
}
