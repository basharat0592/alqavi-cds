'use client';

import { useState, useEffect, useCallback, Suspense } from 'react';
import { 
    BarChart3, Calendar, RefreshCw, Printer, FileStack, FileSpreadsheet,
    ListFilter, Search, Download, ClipboardList, Info, CheckCircle
} from 'lucide-react';
import { useSearchParams } from 'next/navigation';
import { productService, orderService, userService, purchaseService } from '@/lib/api';
import { formatCurrency, formatDate } from '@/lib/utils';
import PageLoader from '@/components/ui/PageLoader';
import toast from 'react-hot-toast';

/* ═══════════════════════════════════════════════
   TYPES & MAPPINGS
   ═══════════════════════════════════════════════ */
type ReportType = 'stock' | 'adjustments' | 'purchases' | 'sales' | 'sales_statements' | 'accounting';

const CATEGORIES = [
    { id: 'stock', label: 'Reports Stock' },
    { id: 'adjustments', label: 'Opening / Damage / Short / Excess Stock' },
    { id: 'purchases', label: 'Purchase Order / Purchase / Purchase Return' },
    { id: 'sales', label: 'Sale / Sale Return' },
    { id: 'sales_statements', label: 'Sale Statements' },
    { id: 'accounting', label: 'Accounting' },
];

const SUB_OPTIONS: Record<string, string[]> = {
    stock: [
        'Stock Taking List', 'Company-wise Stock of all Products', 'Company Stock (Specific)',
        'Product-wise Stock (Above Min Qty)', 'Product-wise Stock (Below Min Qty)',
        'Product-wise Stock (Non zero Qty)', 'Product-wise Stock (zero Qty)',
        'Stock Position', 'Company-wise Stock Summary'
    ],
    adjustments: [
        'Opening Stock Add By Date-wise', 'Opening Stock Add By Product-Wise',
        'Opening Stock Less By Date-wise', 'Opening Stock Less By Product-Wise',
        'Damage Stock By Date-wise', 'Damage Stock By Product-Wise',
        'Stock excess By Date-Wise', 'Stock short By Date-Wise'
    ],
    purchases: [
        'Purchase Order By Date-wise', 'Purchase Order By Invoice No', 'Purchase Order By Supplier-Wise',
        'Purchase Detail By Date-wise', 'Purchase Detail By Invoice No', 'Purchase Detail By Product-Wise',
        'Purchase Return By Date-wise', 'Purchase Return By Invoice No', 'Purchase / Pur.Return Summary'
    ],
    sales: [
        'Sale Invoice By Date', 'Sale Invoice By Invoice No', 'Sale Invoice By Customer',
        'Sale Return Invoice By Date', 'Sale Return Invoice By Invoice No',
        'Area-Wise Delivery Challan', 'Area-Wise Customer List', 'Sale Invoice List'
    ],
    sales_statements: [
        'Date-wise', 'Saleman Area-wise', 'Saleman Comp-wise', 'Customer-Wise',
        'Company-Wise', 'Area-Wise', 'Daily Sale Summary Order By Profit'
    ],
    accounting: [
        'Chart of Accounts', 'General Ledger', 'General Journal by Date', 'General Journal by voucher No',
        'Trial Balance(Detail)', 'Income Statement (Short)', 'Balance Sheet (Detail)'
    ]
};

function ReportsEngineInner() {
    const searchParams = useSearchParams();
    const [loading, setLoading] = useState(true);
    const [generating, setGenerating] = useState(false);
    
    // ── Filters State ───────────────────────────────────────────────────────────
    const [filters, setFilters] = useState({
        dateFrom: new Date(new Date().setDate(new Date().getDate() - 30)).toISOString().split('T')[0],
        dateTo: new Date().toISOString().split('T')[0],
        type: (searchParams.get('type') as ReportType) || '' as any,
        subType: ''
    });

    const [data, setData] = useState({ orders: [], products: [], buys: [] });
    const [reportResult, setReportResult] = useState<any[]>([]);

    useEffect(() => {
        const type = searchParams.get('type') as ReportType;
        if (type) setFilters(f => ({ ...f, type, subType: '' }));
    }, [searchParams]);

    const loadData = useCallback(async () => {
        setLoading(true);
        try {
            const [o, p, pu] = await Promise.all([orderService.getAll(), productService.getAll(), purchaseService.getAll()]);
            setData({ orders: o || [], products: p || [], buys: pu || [] });
        } catch { toast.error('Failed to sync report data nodes.'); }
        finally { setLoading(false); }
    }, []);

    useEffect(() => { loadData(); }, [loadData]);

    const generateReport = () => {
        if (!filters.type) { toast.error('Select a report category'); return; }
        if (!filters.subType) { toast.error('Select a specific view'); return; }
        
        setGenerating(true);
        setTimeout(() => {
            let result = [];
            const { type, subType, dateFrom, dateTo } = filters;
            const isDateMatch = (dateStr: string) => {
                const d = new Date(dateStr);
                return d >= new Date(dateFrom) && d <= new Date(dateTo + 'T23:59:59');
            };

            if (type === 'sales' || type === 'sales_statements') result = data.orders.filter(o => isDateMatch(o.created_at));
            else if (type === 'purchases') result = data.buys.filter(p => isDateMatch(p.created_at || p.order_date));
            else if (type === 'stock' || type === 'adjustments') result = data.products;
            else result = data.orders.filter(o => isDateMatch(o.created_at));

            setReportResult(result);
            setGenerating(false);
            if (result.length > 0) toast.success(`Generated: ${result.length} results.`);
            else toast.error('No matching records found.');
        }, 600);
    };

    if (loading) return <PageLoader />;

    return (
        <div className="max-w-[1400px] mx-auto pb-20 px-4 mt-6 font-sans">
            
            {/* ── Page Header (Purchase Style) ── */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6 pb-5 border-b border-slate-200 dark:border-white/10">
                <div>
                    <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Central Intelligence Reports</h1>
                    <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">Cross-departmental diagnostic and analytical manifest</p>
                </div>
                <div className="flex items-center gap-2">
                    <button onClick={loadData} className="p-2.5 rounded-lg border border-slate-200 dark:border-white/10 bg-white dark:bg-white/5 text-slate-500 hover:text-[#EEAF1C] transition-all shadow-sm">
                        <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
                    </button>
                    <div className="h-8 w-px bg-slate-200 dark:bg-white/10 mx-1 hidden sm:block" />
                    <button className="p-2.5 rounded-lg border border-slate-200 dark:border-white/10 bg-white dark:bg-white/5 text-slate-500 hover:text-emerald-600 transition-all shadow-sm">
                        <FileSpreadsheet className="h-4 w-4" />
                    </button>
                    <button className="p-2.5 rounded-lg border border-slate-200 dark:border-white/10 bg-white dark:bg-white/5 text-slate-500 hover:text-[#EEAF1C] transition-all shadow-sm">
                        <Printer className="h-4 w-4" />
                    </button>
                </div>
            </div>

            {/* ── Filters Bar (Purchase Style) ── */}
            <div className="bg-white dark:bg-[#0D1921] border border-slate-200 dark:border-white/10 rounded-xl p-5 mb-6 shadow-sm">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
                    <div className="space-y-1.5">
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">1. Category</label>
                        <select 
                            value={filters.type}
                            onChange={e => setFilters({...filters, type: e.target.value as any, subType: ''})}
                            className="w-full px-4 py-2.5 text-sm bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-lg outline-none focus:border-[#EEAF1C] transition-all cursor-pointer font-bold text-slate-700 dark:text-slate-200"
                        >
                            <option value="">Select Department...</option>
                            {CATEGORIES.map(cat => <option key={cat.id} value={cat.id}>{cat.label}</option>)}
                        </select>
                    </div>

                    <div className="space-y-1.5">
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">2. Manifest View</label>
                        <select 
                            value={filters.subType}
                            onChange={e => setFilters({...filters, subType: e.target.value})}
                            disabled={!filters.type}
                            className="w-full px-4 py-2.5 text-sm bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-lg outline-none focus:border-[#EEAF1C] transition-all cursor-pointer font-bold text-slate-700 dark:text-slate-200 disabled:opacity-50"
                        >
                            <option value="">Select View Type...</option>
                            {filters.type && SUB_OPTIONS[filters.type]?.map(opt => <option key={opt} value={opt}>{opt}</option>)}
                        </select>
                    </div>

                    <div className="space-y-1.5">
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">3. From Date</label>
                        <div className="relative">
                            <input 
                                type="date" value={filters.dateFrom} 
                                onChange={e => setFilters({...filters, dateFrom: e.target.value})}
                                className="w-full pl-4 pr-4 py-2.5 text-sm bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-lg outline-none focus:border-[#EEAF1C] transition-all font-bold text-slate-700 dark:text-slate-200"
                            />
                        </div>
                    </div>

                    <div className="space-y-1.5">
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">4. To Date</label>
                        <div className="relative">
                            <input 
                                type="date" value={filters.dateTo} 
                                onChange={e => setFilters({...filters, dateTo: e.target.value})}
                                className="w-full pl-4 pr-4 py-2.5 text-sm bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-lg outline-none focus:border-[#EEAF1C] transition-all font-bold text-slate-700 dark:text-slate-200"
                            />
                        </div>
                    </div>

                    <div className="flex items-end">
                        <button 
                            onClick={generateReport}
                            disabled={generating || !filters.subType}
                            className="w-full py-2.5 bg-[#EEAF1C] hover:bg-blue-700 text-white text-sm font-black rounded-lg shadow-sm transition-all disabled:opacity-50 flex items-center justify-center gap-2"
                        >
                            {generating ? <RefreshCw className="h-4 w-4 animate-spin" /> : <BarChart3 className="h-4 w-4" />}
                            Run Report
                        </button>
                    </div>
                </div>
            </div>

            {/* ── Table (Purchase Style) ── */}
            {reportResult.length > 0 ? (
                <div className="space-y-4 animate-in fade-in duration-500">
                    <div className="flex items-center justify-between px-2">
                         <p className="text-xs text-slate-500 dark:text-slate-400 font-bold uppercase tracking-widest">
                            Audit Result: {reportResult.length} Matches Found
                         </p>
                         <p className="text-xs text-slate-500 dark:text-slate-400 font-bold uppercase tracking-widest">
                            Net Valuation: <span className="text-[#EEAF1C] font-black underline decoration-2 underline-offset-4">{formatCurrency(reportResult.reduce((s, r) => s + Number(r.total_amount || r.price || 0), 0))}</span>
                         </p>
                    </div>

                    <div className="bg-white dark:bg-[#0D1921] border border-slate-200 dark:border-white/10 rounded-xl overflow-hidden shadow-sm">
                        <div className="overflow-x-auto">
                            <table className="w-full text-sm">
                                <thead>
                                    <tr className="bg-slate-50 dark:bg-white/5 border-b border-slate-200 dark:border-white/10 text-left">
                                        <th className="px-6 py-4 text-xs font-black text-slate-500 uppercase tracking-wider">Reference Node</th>
                                        <th className="px-6 py-4 text-xs font-black text-slate-500 uppercase tracking-wider">Date Manifest</th>
                                        <th className="px-6 py-4 text-xs font-black text-slate-500 uppercase tracking-wider">Subject Entity</th>
                                        <th className="px-6 py-4 text-xs font-black text-slate-500 uppercase tracking-wider text-center">Status</th>
                                        <th className="px-6 py-4 text-xs font-black text-slate-500 uppercase tracking-wider text-right">Gross Valuation</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100 dark:divide-white/5 font-medium">
                                    {reportResult.map((row, idx) => (
                                        <tr key={idx} className="hover:bg-slate-50/60 transition-colors group">
                                            <td className="px-6 py-4">
                                                <span className="text-[#EEAF1C] font-black">#{row.purchase_number || row.order_number || row.id.slice(0, 8)}</span>
                                            </td>
                                            <td className="px-6 py-4 text-slate-500 dark:text-slate-400">
                                                {formatDate(row.created_at || row.order_date)}
                                            </td>
                                            <td className="px-6 py-4">
                                                <div className="flex flex-col">
                                                    <span className="text-slate-900 dark:text-white font-black uppercase text-xs tracking-tight">{row.supplier_name || row.customer_name || row.guest_name || 'System Auto'}</span>
                                                    <span className="text-[10px] text-slate-400 font-bold uppercase mt-0.5">{filters.type} Record</span>
                                                </div>
                                            </td>
                                            <td className="px-6 py-4 text-center">
                                                <span className={`inline-block px-2.5 py-1 rounded text-[10px] font-black uppercase border
                                                    ${row.status === 'received' || row.status === 'paid' ? 'bg-emerald-50 text-emerald-700 border-emerald-100' : 'bg-amber-50 text-amber-700 border-amber-100'}`}>
                                                    {row.status || 'Verified'}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4 text-right font-black text-slate-900 dark:text-white">
                                                {formatCurrency(row.total_amount || row.price || 0)}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
            ) : (
                <div className="flex flex-col items-center justify-center py-32 border-2 border-dashed border-slate-200 dark:border-white/10 rounded-2xl bg-white dark:bg-[#0D1921] text-center px-10">
                    <BarChart3 className="h-12 w-12 text-slate-200 dark:text-white/10 mb-5" />
                    <h3 className="text-lg font-bold text-slate-400 mb-2">Awaiting Diagnostic Configuration</h3>
                    <p className="text-sm text-slate-400 font-medium max-w-sm lowercase tracking-tight leading-relaxed">Select a category and view from the filter bar above to manifestation audit records.</p>
                </div>
            )}
        </div>
    );
}

export default function MasterReportsEngine() {
    return (
        <Suspense fallback={<PageLoader />}>
            <ReportsEngineInner />
        </Suspense>
    );
}
