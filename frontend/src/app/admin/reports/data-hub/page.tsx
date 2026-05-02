'use client';

import { useState } from 'react';
import Link from 'next/link';
import { 
    Download, Database, Calendar, Filter, 
    FileSpreadsheet, FileJson, FileText, 
    ShoppingCart, Truck, Users, Package,
    RefreshCw, AlertCircle, ChevronRight, Info
} from 'lucide-react';
import { orderService, productService, userService } from '@/lib/api';
import toast from 'react-hot-toast';

/* ─────────────────────────────────────────────────────────────────────────────
   PURE AMAZON RETAIL DESIGN SYSTEM - DATA HUB
   ───────────────────────────────────────────────────────────────────────────── */
const Btn = ({ children, onClick, loading, variant = 'primary', className = '', type = 'button', disabled = false }: any) => {
    const styles = {
        primary: 'bg-gradient-to-b from-[#f7dfa5] to-[#f0c14b] border-[#a88734] hover:from-[#f5d78e] hover:to-[#eeb933] text-[#0f1111] shadow-sm',
        secondary: 'bg-gradient-to-b from-[#f7f8fa] to-[#e7e9ec] border-[#adb1b8] hover:from-[#eef1f3] hover:to-[#dce0e4] text-[#0f1111] shadow-sm',
    };
    return (
        <button type={type} onClick={onClick} disabled={loading || disabled}
            className={`h-[35px] px-6 rounded-[3px] text-[13px] font-bold border transition-all flex items-center justify-center gap-2 disabled:opacity-60 active:scale-[0.98] ${styles[variant as keyof typeof styles]} ${className}`}>
            {children}
            {loading && <RefreshCw className="h-3 w-3 animate-spin" />}
        </button>
    );
};

const inputCls = "h-[35px] px-3 border border-[#888c8e] rounded-[3px] text-[13px] outline-none focus:border-[#e77600] focus:shadow-[0_0_3px_2px_rgba(228,121,17,0.5)] placeholder:text-[#aaa] bg-white transition-all font-medium";

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
        <div className="bg-[#F8F9FA] min-h-screen pb-20 font-sans text-[#0f1111]">
            <div className="max-w-[1440px] mx-auto px-6 pt-5 text-left">
                
                {/* ── Breadcrumb ── */}
                <div className="flex items-center gap-1 text-[12px] text-[#565959] mb-2 no-print">
                    <Link href="/admin/dashboard" className="hover:text-[#c45500] hover:underline">Dashboard</Link>
                    <ChevronRight size={10} />
                    <Link href="/admin/reports" className="hover:text-[#c45500] hover:underline">Reports Center</Link>
                    <ChevronRight size={10} />
                    <span className="text-[#c45500] font-bold">Data Hub</span>
                </div>

                <div className="mb-6 no-print">
                    <h1 className="text-[22px] font-normal text-[#111]">System Data Extraction & Hub</h1>
                    <p className="text-[13px] text-[#565959] mt-1">Generate and download secure manifest registries in CSV format.</p>
                </div>
                <div className="border-b border-[#ddd] mb-8 no-print" />

                {/* Range Selection */}
                <div className="bg-white border border-[#ddd] rounded-[4px] p-6 mb-8 shadow-sm no-print">
                    <div className="flex flex-wrap items-end gap-6">
                        <div className="space-y-1.5 flex-1 min-w-[200px]">
                            <label className="text-[11px] font-bold text-[#111] uppercase tracking-wider">Start Date (From)</label>
                            <input type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)} className={inputCls + " w-full"} />
                        </div>
                        <div className="space-y-1.5 flex-1 min-w-[200px]">
                            <label className="text-[11px] font-bold text-[#111] uppercase tracking-wider">End Date (To)</label>
                            <input type="date" value={dateTo} onChange={e => setDateTo(e.target.value)} className={inputCls + " w-full"} />
                        </div>
                        <div className="flex-1 min-w-[250px] bg-[#f7f8fa] p-4 border border-[#ddd] rounded-[4px]">
                            <div className="flex items-center gap-2 mb-1">
                                <FileSpreadsheet size={16} className="text-[#007600]" />
                                <span className="text-[12px] font-bold text-[#111]">Standard Output: Universal CSV</span>
                            </div>
                            <p className="text-[11px] text-[#565959]">Optimized for Excel, Google Sheets, and PowerBI integration.</p>
                        </div>
                    </div>
                </div>

                {/* Export Options Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                    {[
                        { id: 'sales', title: 'Sales Manifest', desc: 'Aggregate sale transaction logs for external analysis.', icon: ShoppingCart },
                        { id: 'purchases', title: 'Purchase Registry', desc: 'Verified procurement chains from all system vendors.', icon: Truck },
                        { id: 'users', title: 'Identity Ledger', desc: 'Complete personnel directory with role attributes.', icon: Users },
                        { id: 'inventory', title: 'Asset Inventory', desc: 'Product stock audits including pricing and status.', icon: Package },
                    ].map((opt) => (
                        <div key={opt.id} className="bg-white border border-[#ddd] rounded-[4px] p-6 shadow-sm flex flex-col justify-between hover:border-[#c45500] transition-colors group">
                            <div>
                                <div className="w-10 h-10 bg-[#f0f2f2] rounded-[4px] flex items-center justify-center mb-4 border border-[#ddd] group-hover:border-[#c45500]">
                                    <opt.icon size={20} className="text-[#565959] group-hover:text-[#c45500]" />
                                </div>
                                <h3 className="text-[14px] font-bold text-[#111] mb-2">{opt.title}</h3>
                                <p className="text-[12px] text-[#565959] mb-6 leading-relaxed italic">{opt.desc}</p>
                            </div>
                            <Btn 
                                onClick={() => handleExport(opt.id)} 
                                loading={loadingMap[opt.id]}
                                disabled={loadingMap[opt.id]}
                            >
                                <Download size={14} /> Extract Data
                            </Btn>
                        </div>
                    ))}
                </div>

                {/* Enterprise Note */}
                <div className="mt-12 bg-[#fff4e5] border border-[#ffb347]/30 rounded-[4px] p-5 flex gap-4 items-start animate-in fade-in duration-1000">
                    <AlertCircle className="text-[#e47911] shrink-0 mt-0.5" size={20} />
                    <div>
                        <p className="text-[13px] font-bold text-[#111]">Enterprise Data Governance</p>
                        <p className="text-[12px] text-[#565959] leading-relaxed font-medium">All data extractions are logged for security audits. Ensure that downloaded manifests are handled according to your company's data privacy policies.</p>
                    </div>
                </div>
            </div>
        </div>
    );
}
