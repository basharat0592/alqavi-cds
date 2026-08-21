'use client';

import { useEffect, useState } from 'react';
import {
    ResponsiveContainer, AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip,
} from 'recharts';
import {
    TrendingUp, Building2, ShoppingBag, PackageX, Activity, Clock,
} from 'lucide-react';
import { paymentService, inventoryService } from '@/lib/api';
import { formatCurrency } from '@/lib/utils';
import type { RevenueDataPoint } from '@/types';

/* Super Admin oversight band: headline numbers, the revenue trend, and a
   per-branch breakdown. Everything here comes from data the dashboard was
   already fetching — the payments/by-branch endpoint returns income, expense
   and transaction counts alongside the net that used to be the only field read,
   and revenueData30 was being passed in and computed but never rendered. */

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

function Panel({ icon: Icon, title, subtitle, children, className = '' }: any) {
    return (
        <div className={`bg-white border border-slate-200/70 rounded-2xl shadow-[0_1px_2px_rgba(15,23,42,0.04)] p-4 sm:p-5 ${className}`}>
            <div className="flex items-center gap-2.5 mb-3">
                <span className="w-8 h-8 rounded-lg bg-[#F59E0B]/10 ring-1 ring-inset ring-[#F59E0B]/25 text-[#B4780B] flex items-center justify-center shrink-0"><Icon size={16} /></span>
                <div className="min-w-0">
                    <h3 className="text-[13px] font-bold text-slate-800 tracking-tight leading-none">{title}</h3>
                    <p className="text-[10.5px] text-slate-400 font-medium mt-1">{subtitle}</p>
                </div>
            </div>
            {children}
        </div>
    );
}

type BranchRow = { name: string; income: number; expense: number; net: number; count: number };

export default function SuperAdminOverview({ revenueData, stats, recentOrders, lowStock, activityLogs }: {
    revenueData: RevenueDataPoint[];
    stats?: any;
    recentOrders?: any[];
    lowStock?: any[];
    activityLogs?: any[];
}) {
    const [branches, setBranches] = useState<BranchRow[]>([]);
    const [loaded, setLoaded] = useState(false);

    useEffect(() => {
        // by-branch only reports organizations that have payment records, so an
        // organization with no activity would silently vanish from this list.
        // Merge the full warehouse list in so every organization is accounted for.
        Promise.all([
            paymentService.getByBranch?.() ?? Promise.resolve(null),
            inventoryService.getWarehouses().catch(() => []),
        ])
            .then(([d, whs]: any[]) => {
                const byName = new Map<string, BranchRow>();
                for (const w of (whs || [])) {
                    const name = String(w?.name || '').trim();
                    if (!name) continue;
                    byName.set(name.toLowerCase(), { name, income: 0, expense: 0, net: 0, count: 0 });
                }
                for (const b of (d?.branches || [])) {
                    const name = String(b.warehouse_name || '').trim() || 'Unnamed organization';
                    byName.set(name.toLowerCase(), {
                        name,
                        income: Number(b.income || 0),
                        expense: Number(b.expense || 0),
                        net: Number(b.net || 0),
                        count: Number(b.count || 0),
                    });
                }
                // Active organizations first (by net), dormant ones after.
                const rows = [...byName.values()].sort((a, b) =>
                    (b.count > 0 ? 1 : 0) - (a.count > 0 ? 1 : 0) || b.net - a.net);
                setBranches(rows);
            })
            .catch(() => { /* leave empty; the panels show their own empty state */ })
            .finally(() => setLoaded(true));
    }, []);

    const trend = (revenueData || []).map((r) => ({ date: r.date, sales: Number(r.sales ?? r.revenue ?? 0) }));
    const hasTrend = trend.some((t) => t.sales > 0);
    // Widest bar in the branch table is scaled against the largest gross activity,
    // so income and expense stay comparable across rows.
    const maxGross = Math.max(1, ...branches.map((b) => Math.max(b.income, b.expense)));

    const orders = (recentOrders || []).slice(0, 12);
    const stockRows = (lowStock || []).slice(0, 12);
    const logs = (activityLogs || []).slice(0, 8);

    const pipeline = [
        { label: 'Pending', value: Number(stats?.pendingOrders || 0), bar: 'bg-[#F59E0B]' },
        { label: 'Active', value: Number(stats?.totalActive || 0), bar: 'bg-sky-500' },
        { label: 'Delivered', value: Number(stats?.deliveredOrders || 0), bar: 'bg-emerald-500' },
        { label: 'Today', value: Number(stats?.ordersToday || 0), bar: 'bg-violet-500' },
    ];
    const pipelineMax = Math.max(1, ...pipeline.map((r) => r.value));

    return (
        <div className="space-y-4">

            {/* The headline KPI row was removed on request. */}

            {/* ── Revenue trend + branch breakdown ── */}
            <div className="grid grid-cols-1 xl:grid-cols-[1.35fr_1fr] gap-4">

                <Panel icon={TrendingUp} title="Revenue Trend" subtitle="Delivered sales · last 7 days">
                    {hasTrend ? (
                        <ResponsiveContainer width="100%" height={230}>
                            <AreaChart data={trend} margin={{ top: 6, right: 8, left: -14, bottom: 0 }}>
                                <defs>
                                    <linearGradient id="saOverviewRev" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="0%" stopColor={AMBER} stopOpacity={0.30} />
                                        <stop offset="100%" stopColor={AMBER} stopOpacity={0.02} />
                                    </linearGradient>
                                </defs>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={GRID} />
                                <XAxis dataKey="date" tickFormatter={dayFmt} tick={{ fontSize: 10, fill: AXIS }} axisLine={false} tickLine={false} minTickGap={22} />
                                <YAxis tickFormatter={kFmt} tick={{ fontSize: 10, fill: AXIS }} axisLine={false} tickLine={false} width={46} />
                                <Tooltip content={<ChartTip />} />
                                <Area type="monotone" dataKey="sales" stroke={AMBER} strokeWidth={2} fill="url(#saOverviewRev)" />
                            </AreaChart>
                        </ResponsiveContainer>
                    ) : (
                        <div className="h-[230px] flex items-center justify-center text-[12px] text-slate-400">
                            {loaded ? 'No delivered orders in the last 7 days.' : 'Loading…'}
                        </div>
                    )}
                </Panel>

                <Panel icon={Building2} title="Organization Performance" subtitle="Every organization · income, expense and net">
                    {branches.length ? (
                        <div className="max-h-[230px] overflow-y-auto custom-scrollbar -mx-1 px-1">
                            <div className="space-y-2.5">
                                {branches.map((b) => (
                                    <div key={b.name} className="min-w-0">
                                        <div className="flex items-baseline justify-between gap-2 mb-1">
                                            <span className="text-[12.5px] font-bold text-slate-800 truncate">{b.name}</span>
                                            <span className={`text-[12.5px] font-black tabular-nums shrink-0 ${b.net >= 0 ? 'text-emerald-700' : 'text-rose-600'}`}>
                                                {formatCurrency(b.net)}
                                            </span>
                                        </div>
                                        <div className="flex items-center gap-1 h-1.5">
                                            {b.count === 0 ? (
                                                <div className="h-full w-full rounded-full bg-slate-100" title="No activity recorded" />
                                            ) : (
                                                <>
                                                    <div className="h-full rounded-full bg-emerald-500" style={{ width: `${(b.income / maxGross) * 100}%` }} title={`Income ${formatCurrency(b.income)}`} />
                                                    <div className="h-full rounded-full bg-rose-400" style={{ width: `${(b.expense / maxGross) * 100}%` }} title={`Expense ${formatCurrency(b.expense)}`} />
                                                </>
                                            )}
                                        </div>
                                        <div className="flex items-center gap-3 mt-1 text-[10.5px] text-slate-400 font-medium">
                                            {b.count === 0 ? (
                                                <span className="italic">No activity yet</span>
                                            ) : (
                                                <>
                                                    <span className="text-emerald-600">In {formatCurrency(b.income)}</span>
                                                    <span className="text-rose-500">Out {formatCurrency(b.expense)}</span>
                                                </>
                                            )}
                                            <span className="ml-auto tabular-nums">{b.count} txn</span>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    ) : (
                        <div className="h-[230px] flex items-center justify-center text-[12px] text-slate-400">
                            {loaded ? 'No organization activity recorded yet.' : 'Loading…'}
                        </div>
                    )}
                </Panel>
            </div>

            {/* ── Orders + pipeline ── */}
            <div className="grid grid-cols-1 xl:grid-cols-[1.35fr_1fr] gap-4">

                <Panel icon={ShoppingBag} title="Recent Orders" subtitle="Latest activity across every organization">
                    {orders.length ? (
                        <div className="max-h-[260px] overflow-y-auto custom-scrollbar -mx-1 px-1">
                            <div className="divide-y divide-slate-100">
                                {orders.map((o: any) => {
                                    const st = String(o.status || '').toUpperCase();
                                    const tone = st === 'DELIVERED' ? 'bg-emerald-50 text-emerald-700'
                                        : st === 'CANCELLED' ? 'bg-rose-50 text-rose-600'
                                            : 'bg-[#F59E0B]/12 text-[#B4780B]';
                                    return (
                                        <div key={o.id} className="flex items-center gap-3 py-2">
                                            <div className="min-w-0 flex-1">
                                                <p className="text-[12.5px] font-semibold text-slate-800 truncate">
                                                    {o.customer_name || 'Walk-in'}
                                                </p>
                                                <p className="text-[10.5px] text-slate-400 font-medium truncate">
                                                    {o.order_number || String(o.id).slice(0, 8)}
                                                    {o.warehouse_name ? ` · ${o.warehouse_name}` : ''}
                                                </p>
                                            </div>
                                            <span className={`shrink-0 px-2 py-0.5 rounded-full text-[9.5px] font-black uppercase tracking-wider ${tone}`}>
                                                {st || 'PENDING'}
                                            </span>
                                            <span className="shrink-0 text-[12.5px] font-black tabular-nums text-slate-900 w-[92px] text-right">
                                                {formatCurrency(Number(o.total_amount || 0))}
                                            </span>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    ) : (
                        <div className="h-[260px] flex items-center justify-center text-[12px] text-slate-400">No orders yet.</div>
                    )}
                </Panel>

                <Panel icon={Activity} title="Order Pipeline" subtitle="Where orders currently sit">
                    <div className="space-y-2.5">
                        {pipeline.map((row) => (
                            <div key={row.label}>
                                <div className="flex items-baseline justify-between gap-2 mb-1">
                                    <span className="text-[12px] font-semibold text-slate-600">{row.label}</span>
                                    <span className="text-[13px] font-black tabular-nums text-slate-900">{row.value}</span>
                                </div>
                                <div className="h-1.5 rounded-full bg-slate-100 overflow-hidden">
                                    <div className={`h-full rounded-full ${row.bar}`} style={{ width: `${pipelineMax ? (row.value / pipelineMax) * 100 : 0}%` }} />
                                </div>
                            </div>
                        ))}
                        <div className="pt-2 mt-1 border-t border-slate-100 grid grid-cols-2 gap-2">
                            <div>
                                <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Receivable</p>
                                <p className="text-[14px] font-black tabular-nums text-rose-600">{formatCurrency(Number(stats?.totalPayable || 0))}</p>
                            </div>
                            <div>
                                <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Profit</p>
                                <p className="text-[14px] font-black tabular-nums text-emerald-700">{formatCurrency(Number(stats?.totalProfit || 0))}</p>
                            </div>
                        </div>
                    </div>
                </Panel>
            </div>

            {/* ── Stock risk + audit trail ── */}
            <div className="grid grid-cols-1 xl:grid-cols-[1.35fr_1fr] gap-4">

                <Panel icon={PackageX} title="Low Stock" subtitle="Products at or below their reorder point">
                    {stockRows.length ? (
                        <div className="max-h-[230px] overflow-y-auto custom-scrollbar -mx-1 px-1">
                            <div className="divide-y divide-slate-100">
                                {stockRows.map((p: any, i: number) => (
                                    <div key={i} className="flex items-center gap-3 py-2">
                                        <span className="min-w-0 flex-1 text-[12.5px] font-semibold text-slate-800 truncate">
                                            {p.product_name || p.name || 'Unnamed product'}
                                        </span>
                                        <span className="shrink-0 text-[11px] text-slate-400 font-medium tabular-nums">
                                            min {Number(p.min ?? p.reorder_level ?? 0)}
                                        </span>
                                        <span className={`shrink-0 w-[58px] text-right text-[12.5px] font-black tabular-nums ${Number(p.qty ?? p.total_quantity ?? 0) <= 0 ? 'text-rose-600' : 'text-[#B4780B]'}`}>
                                            {Number(p.qty ?? p.total_quantity ?? 0)}
                                        </span>
                                    </div>
                                ))}
                            </div>
                        </div>
                    ) : (
                        <div className="h-[230px] flex items-center justify-center text-[12px] text-slate-400">Nothing below its reorder point.</div>
                    )}
                </Panel>

                <Panel icon={Clock} title="Recent Activity" subtitle="Latest system events">
                    {logs.length ? (
                        <div className="max-h-[230px] overflow-y-auto custom-scrollbar -mx-1 px-1">
                            <div className="space-y-2.5">
                                {logs.map((l: any, i: number) => (
                                    <div key={i} className="flex gap-2.5">
                                        <span className="mt-1.5 w-1.5 h-1.5 rounded-full bg-[#F59E0B] shrink-0" />
                                        <div className="min-w-0">
                                            <p className="text-[12px] font-semibold text-slate-700 leading-snug line-clamp-2">
                                                {l.description || l.action || l.title || 'Activity'}
                                            </p>
                                            <p className="text-[10.5px] text-slate-400 font-medium">
                                                {(l.created_at || l.timestamp || '').toString().slice(0, 16).replace('T', ' ')}
                                            </p>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    ) : (
                        <div className="h-[230px] flex items-center justify-center text-[12px] text-slate-400">No recent activity.</div>
                    )}
                </Panel>
            </div>
        </div>
    );
}
