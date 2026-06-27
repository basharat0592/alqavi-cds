'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import {
    Users, TrendingUp, Download, Printer, Wallet, Loader2, ShoppingCart, RotateCcw, User
} from 'lucide-react';
import PageLoader from '@/components/ui/PageLoader';
import { exportToCSV, formatCurrency } from '@/lib/utils';
import { reportService } from '@/services/report.service';
import { inventoryService } from '@/services/inventory.service';
import { authService } from '@/lib/auth';
import { PageHeader, Card, Button, ui } from '@/components/admin/ui';
import { InvoiceHeader, InvoiceFooter, invoiceStyles } from '@/components/admin/invoice/InvoiceParts';

export default function UserReportPage() {
    const [loading, setLoading] = useState(true);
    const [rows, setRows] = useState<any[]>([]);
    const [totals, setTotals] = useState<any>({});
    const [dateFrom, setDateFrom] = useState('');
    const [dateTo, setDateTo] = useState('');
    const [userFilter, setUserFilter] = useState('All');
    // Super admin gets cross-staff comparison + a branch filter; a branch admin
    // sees only their own row ("My Performance").
    const [isSuper, setIsSuper] = useState(false);
    const [warehouses, setWarehouses] = useState<any[]>([]);
    const [branchFilter, setBranchFilter] = useState('');

    useEffect(() => {
        const sa = authService.isSuperAdmin();
        setIsSuper(sa);
        if (sa) inventoryService.getWarehouses().then(setWarehouses).catch(() => setWarehouses([]));
    }, []);

    const load = useCallback(async () => {
        setLoading(true);
        try {
            const d = await reportService.byUser({
                date_from: dateFrom || undefined,
                date_to: dateTo || undefined,
                warehouse: branchFilter || undefined,
            });
            setRows(d.results || []);
            setTotals(d.totals || {});
        } finally { setLoading(false); }
    }, [dateFrom, dateTo, branchFilter]);

    useEffect(() => { load(); }, [load]);

    const userOptions = useMemo(() => ['All', ...rows.map(r => r.name)], [rows]);
    const filtered = userFilter === 'All' ? rows : rows.filter(r => r.name === userFilter);

    if (loading && rows.length === 0) return <PageLoader />;

    const STATS = [
        { label: 'Sales Total', value: formatCurrency(totals.sales_total || 0), icon: TrendingUp },
        { label: 'Orders', value: String(totals.orders || 0), icon: ShoppingCart },
        { label: 'Collections', value: formatCurrency(totals.collections || 0), icon: Wallet, color: 'text-emerald-600' },
        { label: 'Purchases Created', value: formatCurrency(totals.purchase_value || 0), icon: User },
    ];

    return (
        <div className="pb-10">
            <div className="hidden print:block mb-4"><InvoiceHeader docTitle={isSuper ? 'Staff Comparison' : 'My Performance'} /></div>

            <div className="print:hidden">
                <PageHeader
                    title={isSuper ? 'Staff Comparison' : 'My Performance'}
                    subtitle={isSuper
                        ? 'Sales, collections and activity for every admin, side by side'
                        : 'Your own sales, collections and activity'}
                    breadcrumbs={[
                        { label: 'Console', href: '/admin/dashboard' },
                        { label: 'Reports', href: '/admin/reports' },
                        { label: isSuper ? 'Staff Comparison' : 'My Performance' },
                    ]}
                    actions={
                        <div className="flex gap-2 no-print">
                            <Button variant="outline" size="sm" onClick={() => exportToCSV(filtered.map((r: any) => ({
                                staff: r.name, role: r.role || '', orders: r.orders, sales_total: r.sales_total,
                                avg_order_value: r.avg_order_value, collections: r.collections,
                                returns_handled: r.returns_handled, purchases_created: r.purchases_created,
                                purchase_value: r.purchase_value,
                            })), 'report-by-user.csv')}>
                                <Download size={14} /> Export
                            </Button>
                            <Button variant="outline" size="sm" onClick={() => window.print()}>
                                <Printer size={14} /> Print
                            </Button>
                        </div>
                    }
                />
            </div>

            {/* Filters */}
            <Card className="p-4 mb-6 flex flex-wrap items-center gap-3 no-print print:hidden">
                <span className="text-[12px] font-bold text-slate-500 uppercase tracking-wider">Period</span>
                <input type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)} className={ui.inputBase + ' w-auto'} />
                <span className="text-slate-400 text-[12px]">to</span>
                <input type="date" value={dateTo} onChange={e => setDateTo(e.target.value)} className={ui.inputBase + ' w-auto'} />
                {isSuper && warehouses.length > 0 && (
                    <select value={branchFilter} onChange={e => setBranchFilter(e.target.value)} className={ui.inputBase + ' w-auto'} title="Filter by branch">
                        <option value="">All branches</option>
                        {warehouses.map((w: any) => <option key={w.id} value={w.id}>{w.name}{w.area_name ? ` · ${w.area_name}` : ''}</option>)}
                    </select>
                )}
                {isSuper && (
                    <select value={userFilter} onChange={e => setUserFilter(e.target.value)} className={ui.inputBase + ' w-auto'}>
                        {userOptions.map(u => <option key={u} value={u}>{u}</option>)}
                    </select>
                )}
                {(dateFrom || dateTo || branchFilter) && <Button variant="ghost" size="sm" onClick={() => { setDateFrom(''); setDateTo(''); setBranchFilter(''); }}>Clear</Button>}
                {loading && <Loader2 className="w-4 h-4 animate-spin text-indigo-500" />}
            </Card>

            {/* KPIs */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
                {STATS.map((s, i) => (
                    <Card key={i} className="p-5">
                        <div className="flex items-center gap-2 mb-2">
                            <s.icon size={14} className="text-slate-400" />
                            <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">{s.label}</p>
                        </div>
                        <p className={`text-[20px] font-bold tracking-tight tabular-nums ${s.color || 'text-slate-900'}`}>{s.value}</p>
                    </Card>
                ))}
            </div>

            {/* Table */}
            <Card className="overflow-x-auto animate-in fade-in duration-700">
                <table className="w-full text-left border-collapse min-w-[900px]">
                    <thead>
                        <tr className="bg-slate-50/60 border-b border-slate-100 text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                            <th className="px-6 py-3">Staff</th>
                            <th className="px-6 py-3 text-center">Orders</th>
                            <th className="px-6 py-3 text-right">Sales Total</th>
                            <th className="px-6 py-3 text-right">Avg Order</th>
                            <th className="px-6 py-3 text-right">Collections</th>
                            <th className="px-6 py-3 text-center">Returns</th>
                            <th className="px-6 py-3 text-right">Purchases</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                        {filtered.length === 0 ? (
                            <tr><td colSpan={7} className="py-20 text-center text-[13px] text-slate-400">No data for this period.</td></tr>
                        ) : filtered.map((r, i) => (
                            <tr key={i} className="hover:bg-slate-50 transition-colors text-[13px]">
                                <td className="px-6 py-4">
                                    <div className="font-bold text-slate-900 flex items-center gap-2"><User size={14} className="text-indigo-500" /> {r.name}</div>
                                    {r.role && <div className="text-[10px] text-slate-400 font-bold uppercase tracking-wider ml-6">{r.role}</div>}
                                </td>
                                <td className="px-6 py-4 text-center text-slate-500 font-medium tabular-nums">{r.orders}</td>
                                <td className="px-6 py-4 text-right font-bold text-slate-900 tabular-nums">{formatCurrency(r.sales_total)}</td>
                                <td className="px-6 py-4 text-right text-slate-500 tabular-nums">{formatCurrency(r.avg_order_value)}</td>
                                <td className="px-6 py-4 text-right font-bold text-emerald-600 tabular-nums">{formatCurrency(r.collections)}</td>
                                <td className="px-6 py-4 text-center text-slate-500 tabular-nums">{r.returns_handled}</td>
                                <td className="px-6 py-4 text-right text-slate-500 tabular-nums">{formatCurrency(r.purchase_value)} <span className="text-[10px] text-slate-400">({r.purchases_created})</span></td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </Card>

            <div className="hidden print:block"><InvoiceFooter pinned={false} /></div>
            <style jsx global>{invoiceStyles}</style>
        </div>
    );
}
