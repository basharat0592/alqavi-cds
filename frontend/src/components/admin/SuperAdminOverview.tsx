'use client';

import { useEffect, useState } from 'react';
import {
    ResponsiveContainer, AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip,
} from 'recharts';
import {
    TrendingUp, Building2, Users, Truck, ArrowDownLeft, ArrowUpRight,
    Wallet, Receipt, ShoppingBag,
} from 'lucide-react';
import { paymentService } from '@/lib/api';
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

function Kpi({ icon: Icon, label, value, sub, tone = 'slate' }: {
    icon: any; label: string; value: string; sub?: string;
    tone?: 'slate' | 'amber' | 'emerald' | 'rose';
}) {
    const tones = {
        slate: 'text-slate-900',
        amber: 'text-[#B4780B]',
        emerald: 'text-emerald-700',
        rose: 'text-rose-600',
    } as const;
    const chips = {
        slate: 'bg-slate-100 text-slate-500',
        amber: 'bg-[#F59E0B]/12 text-[#B4780B]',
        emerald: 'bg-emerald-50 text-emerald-600',
        rose: 'bg-rose-50 text-rose-600',
    } as const;
    return (
        <div className="bg-white border border-slate-200/70 rounded-2xl shadow-[0_1px_2px_rgba(15,23,42,0.04)] p-3.5 min-w-0">
            <div className="flex items-center gap-2 mb-2">
                <span className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 ${chips[tone]}`}><Icon size={14} /></span>
                <span className="text-[10.5px] font-bold uppercase tracking-[0.05em] text-slate-500 truncate">{label}</span>
            </div>
            <div className={`text-[19px] font-black tabular-nums leading-none truncate ${tones[tone]}`}>{value}</div>
            {sub && <div className="text-[11px] text-slate-400 font-medium mt-1 truncate">{sub}</div>}
        </div>
    );
}

type BranchRow = { name: string; income: number; expense: number; net: number; count: number };

export default function SuperAdminOverview({ revenueData, counts }: {
    revenueData: RevenueDataPoint[];
    counts?: { branches: number | null; customers: number | null; suppliers: number | null };
}) {
    const [branches, setBranches] = useState<BranchRow[]>([]);
    const [totals, setTotals] = useState<{ income: number; expense: number; net: number; count: number } | null>(null);
    const [loaded, setLoaded] = useState(false);

    useEffect(() => {
        paymentService.getByBranch?.()
            .then((d: any) => {
                const rows: BranchRow[] = (d?.branches || []).map((b: any) => ({
                    name: b.warehouse_name || 'Unnamed branch',
                    income: Number(b.income || 0),
                    expense: Number(b.expense || 0),
                    net: Number(b.net || 0),
                    count: Number(b.count || 0),
                }));
                setBranches(rows.sort((a, b) => b.net - a.net));
                const t = d?.totals;
                if (t) {
                    setTotals({
                        income: Number(t.income || 0),
                        expense: Number(t.expense || 0),
                        net: Number(t.net || 0),
                        count: Number(t.count || 0),
                    });
                }
            })
            .catch(() => { /* leave empty; the panels show their own empty state */ })
            .finally(() => setLoaded(true));
    }, []);

    const trend = (revenueData || []).map((r) => ({ date: r.date, sales: Number(r.sales ?? r.revenue ?? 0) }));
    const hasTrend = trend.some((t) => t.sales > 0);
    const totalSales = trend.reduce((s, t) => s + t.sales, 0);
    const totalOrders = (revenueData || []).reduce((s, r: any) => s + Number(r.orders ?? 0), 0);
    const avgDay = trend.length ? totalSales / trend.length : 0;
    const peakDay = trend.reduce((m, t) => (t.sales > m ? t.sales : m), 0);

    // Widest bar in the branch table is scaled against the largest gross activity,
    // so income and expense stay comparable across rows.
    const maxGross = Math.max(1, ...branches.map((b) => Math.max(b.income, b.expense)));

    return (
        <div className="space-y-4">

            {/* ── Headline numbers ── */}
            <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-6 gap-2.5">
                <Kpi icon={ArrowDownLeft} tone="emerald" label="Income" value={formatCurrency(totals?.income ?? 0)} sub="All branches" />
                <Kpi icon={ArrowUpRight} tone="rose" label="Expense" value={formatCurrency(totals?.expense ?? 0)} sub="All branches" />
                <Kpi
                    icon={Wallet}
                    tone={(totals?.net ?? 0) >= 0 ? 'emerald' : 'rose'}
                    label="Net Position"
                    value={formatCurrency(totals?.net ?? 0)}
                    sub={`${totals?.count ?? 0} transactions`}
                />
                <Kpi icon={TrendingUp} tone="amber" label="Revenue 30d" value={formatCurrency(totalSales)} sub={`${formatCurrency(avgDay)} / day avg`} />
                <Kpi icon={ShoppingBag} label="Orders 30d" value={String(totalOrders)} sub={`Peak day ${formatCurrency(peakDay)}`} />
                <Kpi icon={Building2} label="Branches" value={counts?.branches != null ? String(counts.branches) : '—'} sub={`${counts?.customers ?? '—'} customers · ${counts?.suppliers ?? '—'} suppliers`} />
            </div>

            {/* ── Revenue trend + branch breakdown ── */}
            <div className="grid grid-cols-1 xl:grid-cols-[1.35fr_1fr] gap-4">

                <Panel icon={TrendingUp} title="Revenue Trend" subtitle="Sales across all branches · last 30 days">
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
                            {loaded ? 'No sales recorded in the last 30 days.' : 'Loading…'}
                        </div>
                    )}
                </Panel>

                <Panel icon={Building2} title="Branch Performance" subtitle="Income, expense and net · per branch">
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
                                            <div className="h-full rounded-full bg-emerald-500" style={{ width: `${(b.income / maxGross) * 100}%` }} title={`Income ${formatCurrency(b.income)}`} />
                                            <div className="h-full rounded-full bg-rose-400" style={{ width: `${(b.expense / maxGross) * 100}%` }} title={`Expense ${formatCurrency(b.expense)}`} />
                                        </div>
                                        <div className="flex items-center gap-3 mt-1 text-[10.5px] text-slate-400 font-medium">
                                            <span className="text-emerald-600">In {formatCurrency(b.income)}</span>
                                            <span className="text-rose-500">Out {formatCurrency(b.expense)}</span>
                                            <span className="ml-auto tabular-nums">{b.count} txn</span>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    ) : (
                        <div className="h-[230px] flex items-center justify-center text-[12px] text-slate-400">
                            {loaded ? 'No branch activity recorded yet.' : 'Loading…'}
                        </div>
                    )}
                </Panel>
            </div>
        </div>
    );
}
