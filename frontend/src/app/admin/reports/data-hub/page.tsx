'use client';

import { useState } from 'react';
import {
    Download, FileSpreadsheet,
    ShoppingCart, Truck, Users, Package,
    RefreshCw, AlertCircle
} from 'lucide-react';
import { orderService, productService, userService } from '@/lib/api';
import toast from 'react-hot-toast';
import { PageHeader, Card, Button, ui } from '@/components/admin/ui';

export default function DataHubPage() {
    const [dateFrom, setDateFrom] = useState('');
    const [dateTo, setDateTo] = useState('');
    const [loadingMap, setLoadingMap] = useState<Record<string, boolean>>({});

    const downloadCSV = (filename: string, rows: any[]) => {
        if (!rows.length) {
            toast.error('No data found in this range.');
            return;
        }
        const headers = Object.keys(rows[0]);
        const csvContent = [
            headers.join(','),
            ...rows.map(row => headers.map(fieldName => JSON.stringify(row[fieldName] || '')).join(','))
        ].join('\n');

        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement('a');
        const url = URL.createObjectURL(blob);
        link.setAttribute('href', url);
        link.setAttribute('download', `${filename}_${new Date().toISOString().split('T')[0]}.csv`);
        link.style.visibility = 'hidden';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    const handleExport = async (type: string) => {
        setLoadingMap(prev => ({ ...prev, [type]: true }));
        try {
            let data: any[] = [];
            let name = '';

            if (type === 'sales') {
                data = await orderService.getAll({ from: dateFrom, to: dateTo });
                name = 'Sales_Manifest';
            } else if (type === 'purchases') {
                data = await orderService.getAll({ type: 'purchase', from: dateFrom, to: dateTo });
                name = 'Purchase_Registry';
            } else if (type === 'users') {
                data = await userService.getAll();
                name = 'Identity_Ledger';
            } else if (type === 'inventory') {
                data = await productService.getAll();
                name = 'Asset_Inventory';
            }

            await new Promise(r => setTimeout(r, 1200));
            downloadCSV(name, data);
            toast.success(`${type.toUpperCase()} data exported.`);
        } catch {
            toast.error(`Export failure.`);
        } finally {
            setLoadingMap(prev => ({ ...prev, [type]: false }));
        }
    };

    return (
        <div className="pb-20">
            <div className="max-w-[1440px] mx-auto px-6 pt-5 text-left">

                <PageHeader
                    title="Data Hub"
                    subtitle="Generate and download secure manifest registries in CSV format."
                    breadcrumbs={[
                        { label: 'Console', href: '/admin/dashboard' },
                        { label: 'Reports Center', href: '/admin/reports' },
                        { label: 'Data Hub' },
                    ]}
                />

                {/* Range Selection */}
                <Card className="p-6 mb-8 no-print">
                    <div className="flex flex-wrap items-end gap-6">
                        <div className="space-y-1.5 flex-1 min-w-[200px]">
                            <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Start Date (From)</label>
                            <input type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)} className={ui.inputBase} />
                        </div>
                        <div className="space-y-1.5 flex-1 min-w-[200px]">
                            <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">End Date (To)</label>
                            <input type="date" value={dateTo} onChange={e => setDateTo(e.target.value)} className={ui.inputBase} />
                        </div>
                        <div className="flex-1 min-w-[250px] bg-slate-50 p-4 border border-slate-200/70 rounded-xl">
                            <div className="flex items-center gap-2 mb-1">
                                <FileSpreadsheet size={16} className="text-emerald-600" />
                                <span className="text-[12px] font-bold text-slate-900">Standard Output: Universal CSV</span>
                            </div>
                            <p className="text-[11px] text-slate-500">Optimized for Excel, Google Sheets, and PowerBI integration.</p>
                        </div>
                    </div>
                </Card>

                {/* Export Options Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                    {[
                        { id: 'sales', title: 'Sales Manifest', desc: 'Aggregate sale transaction logs for external analysis.', icon: ShoppingCart },
                        { id: 'purchases', title: 'Purchase Registry', desc: 'Verified procurement chains from all system vendors.', icon: Truck },
                        { id: 'users', title: 'Identity Ledger', desc: 'Complete personnel directory with role attributes.', icon: Users },
                        { id: 'inventory', title: 'Asset Inventory', desc: 'Product stock audits including pricing and status.', icon: Package },
                    ].map((opt) => (
                        <Card key={opt.id} className="p-6 flex flex-col justify-between hover:border-indigo-300 transition-colors group">
                            <div>
                                <div className="w-10 h-10 bg-indigo-50 rounded-xl flex items-center justify-center mb-4 border border-indigo-100 group-hover:border-indigo-300 transition-colors">
                                    <opt.icon size={20} className="text-indigo-600" />
                                </div>
                                <h3 className="text-[14px] font-bold text-slate-900 mb-2">{opt.title}</h3>
                                <p className="text-[12px] text-slate-600 mb-6 leading-relaxed">{opt.desc}</p>
                            </div>
                            <Button
                                className="w-full"
                                onClick={() => handleExport(opt.id)}
                                disabled={loadingMap[opt.id]}
                            >
                                {loadingMap[opt.id]
                                    ? <RefreshCw size={14} className="animate-spin" />
                                    : <Download size={14} />}
                                Extract Data
                            </Button>
                        </Card>
                    ))}
                </div>

                {/* Enterprise Note */}
                <div className="mt-12 bg-amber-50 border border-amber-200 rounded-2xl p-5 flex gap-4 items-start animate-in fade-in duration-1000">
                    <AlertCircle className="text-amber-600 shrink-0 mt-0.5" size={20} />
                    <div>
                        <p className="text-[13px] font-bold text-slate-900">Enterprise Data Governance</p>
                        <p className="text-[12px] text-slate-600 leading-relaxed">All data extractions are logged for security audits. Ensure that downloaded manifests are handled according to your company's data privacy policies.</p>
                    </div>
                </div>
            </div>
        </div>
    );
}
