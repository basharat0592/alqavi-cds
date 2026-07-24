'use client';

import { useEffect, useState } from 'react';
import {
    ResponsiveContainer, AreaChart, Area, BarChart, Bar,
    XAxis, YAxis, CartesianGrid, Tooltip, Cell,
} from 'recharts';
import { TrendingUp, Building2 } from 'lucide-react';
import { paymentService } from '@/lib/api';
import { formatCurrency } from '@/lib/utils';
import type { RevenueDataPoint } from '@/types';

const INDIGO = '#6366F1';
const TEAL = '#119AB8';
const GRID = '#eef2f7';
const AXIS = '#94a3b8';

const kFmt = (n: number) =>
    Math.abs(n) >= 1_000_000 ? `${(n / 1_000_000).toFixed(1)}M`
        : Math.abs(n) >= 1_000 ? `${Math.round(n / 1_000)}k`
            : `${Math.round(n)}`;

const dayFmt = (d: string) => {
    try {
        const dt = new Date(d);
        return dt.toLocaleDateString(undefined, { day: '2-digit', month: 'short' });
    } catch { return d; }
};

function ChartTip({ active, payload, label, isDate }: any) {
    if (!active || !payload?.length) return null;
    return (
        <div className="rounded-lg border border-slate-200 bg-white px-3 py-2 shadow-lg text-left">
            <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">{isDate ? dayFmt(label) : label}</p>
            {payload.map((p: any) => (
                <p key={p.dataKey} className="text-[12px] font-bold tabular-nums" style={{ color: p.color || p.fill }}>
                    {formatCurrency(Number(p.value || 0))}
                </p>
            ))}
        </div>
    );
}

function Panel({ icon: Icon, title, subtitle, children }: any) {
    return (
        <div className="bg-white border border-slate-200/70 rounded-2xl shadow-[0_1px_2px_rgba(15,23,42,0.04)] p-4 sm:p-5">
            <div className="flex items-center gap-2.5 mb-3">
                <span className="w-8 h-8 rounded-lg bg-slate-50 border border-slate-100 text-slate-500 flex items-center justify-center shrink-0"><Icon size={16} /></span>
                <div className="min-w-0">
                    <h3 className="text-[13px] font-bold text-slate-800 tracking-tight leading-none">{title}</h3>
                    <p className="text-[10.5px] text-slate-400 font-medium mt-1">{subtitle}</p>
                </div>
            </div>
            {children}
        </div>
    );
}

export default function SuperAdminCharts({ revenueData }: { revenueData: RevenueDataPoint[] }) {
    const [branches, setBranches] = useState<{ name: string; net: number }[]>([]);

    useEffect(() => {
        paymentService.getByBranch?.()
            .then((d: any) => {
                const rows = (d?.branches || []).map((b: any) => ({
                    name: b.warehouse_name || 'Branch', net: Number(b.net || 0),
                }));
                setBranches(rows.sort((a: any, b: any) => b.net - a.net).slice(0, 8));
            })
            .catch(() => setBranches([]));
    }, []);

    const trend = (revenueData || []).map((r) => ({ date: r.date, sales: Number(r.sales ?? r.revenue ?? 0) }));
    const hasTrend = trend.some((t) => t.sales > 0);
    const totalSales = trend.reduce((s, t) => s + t.sales, 0);
    const totalOrders = (revenueData || []).reduce((s, r: any) => s + Number(r.orders ?? 0), 0);
    const peakDay = trend.reduce((m, t) => (t.sales > m ? t.sales : m), 0);
    const avgDay = trend.length ? totalSales / trend.length : 0;

    return (
        <div className="space-y-4">
            {/* Net by branch — magnitude by identity → bars */}
            <Panel icon={Building2} title="Net by Branch" subtitle="Income minus expense · per branch">
                {branches.length ? (
                    <ResponsiveContainer width="100%" height={200}>
                        <BarChart data={branches} margin={{ top: 6, right: 6, left: -12, bottom: 0 }}>
                            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={GRID} />
                            <XAxis dataKey="name" tick={{ fontSize: 10, fill: AXIS }} axisLine={false} tickLine={false} interval={0} height={40} angle={-18} textAnchor="end" />
                            <YAxis tickFormatter={kFmt} tick={{ fontSize: 10, fill: AXIS }} axisLine={false} tickLine={false} width={44} />
                            <Tooltip content={<ChartTip />} cursor={{ fill: 'rgba(17,154,184,0.06)' }} />
                            <Bar dataKey="net" radius={[4, 4, 0, 0]} maxBarSize={40}>
                                {branches.map((b, i) => (
                                    <Cell key={i} fill={b.net >= 0 ? TEAL : '#f43f5e'} />
                                ))}
                            </Bar>
                        </BarChart>
                    </ResponsiveContainer>
                ) : (
                    <div className="h-[200px] flex items-center justify-center text-[12px] text-slate-400">No branch data yet.</div>
                )}
            </Panel>
        </div>
    );
}
