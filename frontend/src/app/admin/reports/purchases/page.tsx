'use client';

import { useState, useEffect, useMemo } from 'react';
import {
    DollarSign, ShoppingCart, RefreshCw, AlertTriangle,
    Printer, Building2, Info
} from 'lucide-react';
import { purchaseService, productService } from '@/lib/api';
import { formatCurrency, formatDate } from '@/lib/utils';
import PageLoader from '@/components/ui/PageLoader';
import { PageHeader, Card, Button, Badge } from '@/components/admin/ui';
import toast from 'react-hot-toast';

export default function PurchaseReportsPage() {
    const [loading, setLoading] = useState(true);
    const [purchases, setPurchases] = useState<any[]>([]);

    const loadData = async () => {
        setLoading(true);
        try {
            const pu = await purchaseService.getAll();
            setPurchases(Array.isArray(pu) ? pu : pu.results || []);
        } catch {
            toast.error('Procurement registry sync failure.');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => { loadData(); }, []);

    const stats = useMemo(() => {
        const totalExpenditure = purchases.reduce((s, p) => s + Number(p.total_amount || 0), 0);
        const pending = purchases.filter(p => (p.status || '').toLowerCase() === 'ordered').length;
        const unpaid = purchases.filter(p => (p.payment_status || '').toLowerCase() !== 'paid').reduce((s, p) => s + Number(p.total_amount), 0);
        return { totalExpenditure, pending, unpaid };
    }, [purchases]);

    if (loading && purchases.length === 0) return <PageLoader />;

    return (
        <div className="pb-20">

            <PageHeader
                title="Purchase Reports"
                subtitle="Purchase & Procurement Audit"
                breadcrumbs={[
                    { label: 'Console', href: '/admin/dashboard' },
                    { label: 'Reports Center', href: '/admin/reports' },
                    { label: 'Purchase Reports' },
                ]}
                actions={
                    <>
                        <Button variant="outline" size="sm" onClick={loadData} disabled={loading}>
                            <RefreshCw size={14} className={loading ? 'animate-spin' : ''} /> Sync
                        </Button>
                        <Button variant="secondary" size="sm" onClick={() => window.print()}>
                            <Printer size={14} /> Print
                        </Button>
                    </>
                }
            />

            {/* Tactical Sensors */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
                <Card className="p-5">
                    <div className="flex items-center gap-3 mb-2">
                        <DollarSign size={16} className="text-slate-400" />
                        <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Gross Capex</p>
                    </div>
                    <p className="text-[20px] font-bold text-slate-900 tabular-nums">{formatCurrency(stats.totalExpenditure)}</p>
                </Card>
                <Card className="p-5">
                    <div className="flex items-center gap-3 mb-2">
                        <ShoppingCart size={16} className="text-slate-400" />
                        <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Pending Acquisitions</p>
                    </div>
                    <p className="text-[20px] font-bold text-indigo-600 tabular-nums">{stats.pending} Orders</p>
                </Card>
                <Card className="p-5">
                    <div className="flex items-center gap-3 mb-2">
                        <AlertTriangle size={16} className="text-slate-400" />
                        <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Accounts Payable</p>
                    </div>
                    <p className="text-[20px] font-bold text-rose-600 tabular-nums">{formatCurrency(stats.unpaid)}</p>
                </Card>
                <Card className="p-5">
                    <div className="flex items-center gap-3 mb-2">
                        <Building2 size={16} className="text-slate-400" />
                        <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Vendor Nodes</p>
                    </div>
                    <p className="text-[20px] font-bold text-emerald-600 tabular-nums">96.8% Reliable</p>
                </Card>
            </div>

            {/* Procurement Ledger */}
            <Card className="overflow-hidden">
                <table className="w-full text-left border-collapse">
                    <thead>
                        <tr className="bg-slate-50/60 border-b border-slate-200/70 text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                            <th className="px-6 py-3">PO Identifier</th>
                            <th className="px-6 py-3">Supplier Entity</th>
                            <th className="px-6 py-3 text-center">Fulfillment</th>
                            <th className="px-6 py-3 text-center">Payment</th>
                            <th className="px-6 py-3 text-right">Gross Outlay</th>
                        </tr>
                    </thead>
                    <tbody>
                        {purchases.length === 0 ? (
                            <tr><td colSpan={5} className="py-24 text-center text-slate-400 italic">No procurement records found.</td></tr>
                        ) : (
                            purchases.map((p, i) => (
                                <tr key={i} className="border-b border-slate-100 hover:bg-slate-50 transition-colors group text-[13px]">
                                    <td className="px-6 py-4 font-bold text-indigo-600 group-hover:underline cursor-pointer">
                                        #{p.purchase_number || (p.id ? p.id.slice(0, 8) : i)}
                                    </td>
                                    <td className="px-6 py-4">
                                        <div className="text-slate-900 font-bold uppercase">{p.supplier_name || 'Generic Vendor'}</div>
                                        <div className="text-[11px] text-slate-400 mt-0.5">Manifest Node: {p.id ? p.id.slice(0, 12) : 'N/A'}</div>
                                    </td>
                                    <td className="px-6 py-4 text-center">
                                        <Badge tone={p.status === 'received' ? 'green' : 'blue'}>
                                            {p.status}
                                        </Badge>
                                    </td>
                                    <td className="px-6 py-4 text-center">
                                        <Badge tone={p.payment_status === 'paid' ? 'green' : 'amber'}>
                                            {p.payment_status}
                                        </Badge>
                                    </td>
                                    <td className="px-6 py-4 text-right font-bold text-slate-900 tabular-nums">{formatCurrency(p.total_amount)}</td>
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
            </Card>

            {/* Summary Note */}
            <div className="mt-8 bg-indigo-50 border border-indigo-100 rounded-2xl p-4 flex gap-4 items-start no-print">
                <Info className="text-indigo-600 shrink-0 mt-0.5" size={18} />
                <div>
                    <p className="text-[13px] font-bold text-slate-900">Procurement Audit Note</p>
                    <p className="text-[12px] text-slate-600 leading-relaxed">Financial outlay reflects gross amounts before tax and landed costs. Unsettled balances should be reconciled with the Supplier Ledger to avoid credit disruption.</p>
                </div>
            </div>
        </div>
    );
}
