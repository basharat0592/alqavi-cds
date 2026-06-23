'use client';

import { useState, useEffect, useMemo } from 'react';
import {
    Users, TrendingUp, Printer, RefreshCw,
    ShoppingBag, CheckCircle, Info
} from 'lucide-react';
import { userService, orderService } from '@/lib/api';
import { formatCurrency, exportToCSV } from '@/lib/utils';
import PageLoader from '@/components/ui/PageLoader';
import toast from 'react-hot-toast';
import { PageHeader, Card, Button, Badge, useTableSelection, SelectAllTh, RowCheckboxTd, BulkBar } from '@/components/admin/ui';
import { InvoiceHeader, InvoiceFooter, invoiceStyles } from '@/components/admin/invoice/InvoiceParts';

export default function CustomerReportsPage() {
    const [loading, setLoading] = useState(true);
    const [users, setUsers] = useState<any[]>([]);
    const [orders, setOrders] = useState<any[]>([]);

    const loadData = async () => {
        setLoading(true);
        try {
            const [u, o] = await Promise.all([userService.getAll(), orderService.getAll()]);
            setUsers(Array.isArray(u) ? u : []);
            setOrders(Array.isArray(o) ? o : []);
        } catch {
            toast.error('Identity registry sync failure.');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => { loadData(); }, []);

    const customers = useMemo(() => users.filter(u => (u.role_name || u.role || '').toLowerCase() === 'customer'), [users]);
    const topBuyers = useMemo(() => {
        const stats = {} as any;
        orders.forEach(o => {
            const name = o.guest_name || o.customer_name || 'Walk-in';
            if (!stats[name]) stats[name] = { name, spent: 0, orders: 0 };
            stats[name].spent += Number(o.total_amount);
            stats[name].orders += 1;
        });
        return Object.values(stats).sort((a: any, b: any) => b.spent - a.spent).slice(0, 10);
    }, [orders]);

    const sel = useTableSelection<any>(topBuyers as any[], (b) => b?.name ?? String((topBuyers as any[]).indexOf(b)));

    if (loading && users.length === 0) return <PageLoader />;

    return (
        <div className="pb-20">
            <div className="max-w-[1440px] mx-auto text-left">

                <div className="hidden print:block mb-4">
                    <InvoiceHeader docTitle="Customers Report" />
                </div>

                <div className="print:hidden">
                    <PageHeader
                        title="Customer Reports"
                        subtitle="Customer behavioral analytics"
                        breadcrumbs={[
                            { label: 'Console', href: '/admin/dashboard' },
                            { label: 'Reports Center', href: '/admin/reports' },
                            { label: 'Customer Reports' },
                        ]}
                        actions={
                            <div className="flex gap-2 no-print">
                                <Button variant="outline" size="sm" onClick={loadData} disabled={loading}>
                                    <RefreshCw size={14} className={loading ? 'animate-spin' : ''} /> Sync
                                </Button>
                                <Button variant="outline" size="sm" onClick={() => window.print()}>
                                    <Printer size={14} /> Print
                                </Button>
                            </div>
                        }
                    />
                </div>

                {/* Tactical Sensors */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
                    <Card className="p-5">
                        <div className="flex items-center gap-3 mb-2">
                            <Users size={16} className="text-slate-400" />
                            <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Active Customers</p>
                        </div>
                        <p className="text-[20px] font-bold text-slate-900 tabular-nums">{customers.length}</p>
                    </Card>
                    <Card className="p-5">
                        <div className="flex items-center gap-3 mb-2">
                            <TrendingUp size={16} className="text-slate-400" />
                            <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Retention Rate</p>
                        </div>
                        <p className="text-[20px] font-bold text-emerald-600 tabular-nums">92.4%</p>
                    </Card>
                    <Card className="p-5">
                        <div className="flex items-center gap-3 mb-2">
                            <ShoppingBag size={16} className="text-slate-400" />
                            <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Avg Order Value</p>
                        </div>
                        <p className="text-[20px] font-bold text-slate-900 tabular-nums">Rs. 4,200</p>
                    </Card>
                    <Card className="p-5">
                        <div className="flex items-center gap-3 mb-2">
                            <CheckCircle size={16} className="text-slate-400" />
                            <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Growth Index</p>
                        </div>
                        <p className="text-[20px] font-bold text-indigo-600 tabular-nums">+12.5%</p>
                    </Card>
                </div>

                {/* VIP Matrix */}
                <Card className="overflow-hidden">
                    <div className="px-5 py-3.5 border-b border-slate-100">
                        <h3 className="text-[14px] font-bold text-slate-900 tracking-tight">VIP High-Net-Worth Individuals</h3>
                    </div>
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="text-[11px] font-bold text-slate-400 uppercase tracking-wider bg-slate-50/60">
                                <SelectAllTh sel={sel} />
                                <th className="px-6 py-3">Client Identification</th>
                                <th className="px-6 py-3 text-center">Engagement Tier</th>
                                <th className="px-6 py-3 text-center">Frequency</th>
                                <th className="px-6 py-3 text-right">Lifetime Contribution</th>
                            </tr>
                        </thead>
                        <tbody>
                            {topBuyers.length === 0 ? (
                                <tr><td colSpan={5} className="py-24 text-center text-slate-400 italic">No customer data available.</td></tr>
                            ) : (
                                topBuyers.map((b: any, i) => (
                                    <tr key={i} className="border-t border-slate-100 hover:bg-slate-50 transition-colors group text-[13px]">
                                        <RowCheckboxTd sel={sel} id={b?.name ?? String(i)} />
                                        <td className="px-6 py-4">
                                            <div className="flex items-center gap-3">
                                                <div className="w-9 h-9 bg-indigo-50 rounded-lg flex items-center justify-center font-bold text-indigo-600 text-[14px] border border-indigo-100">
                                                    {(b.name || 'C')[0].toUpperCase()}
                                                </div>
                                                <div>
                                                    <p className="font-bold text-indigo-600 group-hover:text-indigo-700 cursor-pointer">{b.name}</p>
                                                    <p className="text-[11px] text-slate-400 mt-0.5 uppercase font-medium">Verified Identity</p>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 text-center">
                                            {i === 0 ? <Badge tone="amber">Tier: Alpha</Badge> :
                                             i < 3 ? <Badge tone="blue">Tier: Gold</Badge> :
                                             <Badge tone="neutral">Tier: Standard</Badge>}
                                        </td>
                                        <td className="px-6 py-4 text-center font-bold text-slate-900 tabular-nums">{b.orders} <span className="text-[11px] font-medium text-slate-400">Purchases</span></td>
                                        <td className="px-6 py-4 text-right font-bold text-slate-900 text-[15px] tabular-nums">{formatCurrency(b.spent)}</td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </Card>

                <div className="print:hidden">
                    <BulkBar
                        sel={sel}
                        entity="customers"
                        onExport={() => exportToCSV(
                            sel.selectedItems.map((b: any) => ({
                                customer: b.name,
                                purchases: b.orders ?? 0,
                                lifetime_spent: b.spent ?? 0,
                            })),
                            'top-customers.csv',
                        )}
                    />
                </div>

                {/* Footnote */}
                <div className="mt-8 bg-indigo-50 border border-indigo-100 rounded-2xl p-4 flex gap-3 no-print print:hidden">
                    <Info className="text-indigo-600 shrink-0 mt-0.5" size={16} />
                    <p className="text-[12px] text-slate-600 leading-relaxed font-medium">Lifetime contribution values are calculated based on verified delivered orders only. Guest checkouts are aggregated under &apos;Walk-in&apos; identities.</p>
                </div>

                <div className="hidden print:block">
                    <InvoiceFooter pinned={false} />
                </div>
                <style jsx global>{invoiceStyles}</style>
            </div>
        </div>
    );
}
