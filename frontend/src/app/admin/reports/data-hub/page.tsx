'use client';

import { useState } from 'react';
import { 
    Download, Database, Calendar, Filter, 
    FileSpreadsheet, FileJson, FileText, 
    ShoppingCart, Truck, Users, Package,
    RefreshCw, AlertCircle
} from 'lucide-react';
import { orderService, productService, userService } from '@/lib/api';
import toast from 'react-hot-toast';

const SectionCard = ({ children, className = "" }: { children: React.ReactNode; className?: string }) => (
    <div className={`bg-white dark:bg-[#1a252f] border border-slate-200 dark:border-white/10 rounded-xl shadow-sm ${className}`}>
        {children}
    </div>
);

const ExportOption = ({ title, desc, icon: Icon, onClick, loading }: { 
    title: string; desc: string; icon: any; onClick: () => void; loading?: boolean 
}) => (
    <div className="p-8 flex flex-col justify-between h-full bg-white dark:bg-[#1a252f] rounded-xl border border-slate-100 dark:border-white/5 hover:border-[#EEAF1C] transition-all hover:shadow-lg">
        <div>
            <div className={`w-12 h-12 rounded-xl bg-blue-50 dark:bg-[#EEAF1C]/10 flex items-center justify-center mb-6`}>
                <Icon className={`h-6 w-6 text-[#EEAF1C]`} />
            </div>
            <h3 className="text-sm font-bold text-slate-800 dark:text-white uppercase tracking-tight mb-2">{title}</h3>
            <p className="text-[11px] font-medium text-slate-400 dark:text-slate-500 mb-6 italic leading-relaxed">{desc}</p>
        </div>
        <button 
            disabled={loading}
            onClick={onClick}
            className={`w-full py-2.5 flex items-center justify-center gap-2 rounded-lg text-xs font-bold uppercase tracking-widest transition-all
                ${loading 
                    ? 'bg-slate-100 text-slate-400 cursor-not-allowed' 
                    : 'bg-[#EEAF1C] text-white hover:bg-blue-700 shadow-md active:scale-[0.98]'}`}
        >
            {loading ? 'Compiling Registry...' : <>Extract Manifest <Download className="h-4 w-4" /></>}
        </button>
    </div>
);

export default function DataHubPage() {
    const [dateFrom, setDateFrom] = useState('');
    const [dateTo, setDateTo] = useState('');
    const [loadingMap, setLoadingMap] = useState<Record<string, boolean>>({});

    const downloadCSV = (filename: string, rows: any[]) => {
        if (!rows.length) {
            toast.error('No tactical data found in this temporal range.');
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
            toast.success(`Data exported successfully.`);
        } catch {
            toast.error(`Export failure: Data registry offline.`);
        } finally {
            setLoadingMap(prev => ({ ...prev, [type]: false }));
        }
    };

    return (
        <div className="max-w-[1400px] mx-auto px-4 py-8 bg-slate-50 dark:bg-[#070F14] min-h-screen font-sans">
            
            {/* Header */}
            <div className="flex flex-col md:flex-row items-center justify-between gap-4 mb-8 pb-4 border-b border-slate-200 dark:border-white/10">
                <div className="flex items-center gap-4">
                    <div className="p-2.5 bg-[#EEAF1C] rounded-xl shadow-lg shadow-blue-500/20">
                        <Database className="h-6 w-6 text-white" />
                    </div>
                    <div>
                        <h1 className="text-xl font-bold text-slate-900 dark:text-white leading-none tracking-tight">Data Engine Hub</h1>
                        <p className="text-sm text-slate-500 dark:text-slate-400 mt-1.5">Extract secure manifests and system registries</p>
                    </div>
                </div>
                <div className="p-3 bg-blue-50 dark:bg-[#EEAF1C]/10 rounded-lg border border-blue-100 dark:border-white/5 flex items-center gap-3">
                    <AlertCircle className="h-4 w-4 text-[#EEAF1C]" />
                    <p className="text-[10px] font-bold text-[#EEAF1C] uppercase tracking-tight">Enterprise Export Enabled</p>
                </div>
            </div>

            {/* Range Selection Card */}
            <SectionCard className="p-8 mb-10 bg-white">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 items-end">
                    <div className="space-y-2">
                        <label className="text-[10px] font-bold text-slate-400 uppercase ml-2 tracking-widest">Chronos Start (From)</label>
                        <input type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)} className="w-full px-4 py-2.5 border border-slate-200 rounded-lg text-sm bg-slate-50 outline-none focus:border-[#EEAF1C] focus:bg-white transition-all shadow-inner" />
                    </div>
                    <div className="space-y-2">
                        <label className="text-[10px] font-bold text-slate-400 uppercase ml-2 tracking-widest">Chronos End (To)</label>
                        <input type="date" value={dateTo} onChange={e => setDateTo(e.target.value)} className="w-full px-4 py-2.5 border border-slate-200 rounded-lg text-sm bg-slate-50 outline-none focus:border-[#EEAF1C] focus:bg-white transition-all shadow-inner" />
                    </div>
                    <div className="p-3 border-l border-slate-100 pl-8 hidden lg:block">
                        <p className="text-[11px] font-bold text-slate-400 uppercase mb-3">Manifest Standards</p>
                        <div className="flex items-center gap-3">
                             <FileSpreadsheet className="h-5 w-5 text-emerald-600" />
                             <span className="text-[10px] font-bold uppercase text-slate-600">Universal CSV (RFC 4180)</span>
                        </div>
                    </div>
                </div>
            </SectionCard>

            {/* Export Selection Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                <ExportOption title="Sales Manifest" desc="Aggregate sale transaction logs for external analysis." icon={ShoppingCart} onClick={() => handleExport('sales')} loading={loadingMap['sales']} />
                <ExportOption title="Purchase Audit" desc="Verified procurement chains from all system vendors." icon={Truck} onClick={() => handleExport('purchases')} loading={loadingMap['purchases']} />
                <ExportOption title="Identity List" desc="Complete personnel directory with role attributes." icon={Users} onClick={() => handleExport('users')} loading={loadingMap['users']} />
                <ExportOption title="Asset Inventory" icon={Package} desc="Product stock audits including pricing and status." onClick={() => handleExport('inventory')} loading={loadingMap['inventory']} />
            </div>

            {/* Information Strategy Block */}
            <div className="mt-16 bg-[#131921] p-10 rounded-[2rem] text-white flex flex-col md:flex-row justify-between items-center gap-8 shadow-2xl">
                <div>
                    <h4 className="text-2xl font-bold tracking-tight uppercase mb-3">Secure System Export</h4>
                    <p className="text-slate-400 text-xs font-medium leading-relaxed max-w-sm italic opacity-80 underline decoration-blue-500 decoration-2 underline-offset-8">Optimized for Excel, Google Sheets, PowerBI and ERP integration.</p>
                </div>
                <div className="p-6 border-4 border-white/5 rounded-2xl rotate-3 transition-transform hover:rotate-0 duration-700 bg-white/5 backdrop-blur-md shadow-xl">
                    <Database className="h-10 w-10 text-[#EEAF1C]" />
                </div>
            </div>
        </div>
    );
}

