'use client';

import { useState, useEffect } from 'react';
import { paymentService, paymentCategoryService } from '@/lib/api';
import { formatCurrency, formatDate } from '@/lib/utils';
import {
    DollarSign, Search, RefreshCw, Plus, ArrowUpRight, ArrowDownLeft,
    Filter, Calendar, X, Loader2, CreditCard, Banknote, Wallet,
    CheckCircle2, Clock, Trash2, Printer, Download, Eye, LayoutGrid,
    ChevronDown, AlertTriangle, User, Save, FileText, Settings
} from 'lucide-react';

interface Payment {
    id: number;
    amount: string | number;
    payment_type: 'inbound' | 'outbound';
    method: string;
    category_name: string;
    reference_number: string;
    payer_payee: string;
    description: string;
    date: string;
    user_name: string;
    created_at: string;
}

const METHOD_ICONS: Record<string, any> = {
    cash: Wallet,
    bank_transfer: Banknote,
    check: FileText,
    mobile_wallet: CreditCard,
    other: LayoutGrid,
};


/* ══════════════════════════════════════════════
   COMPONENTS
   ══════════════════════════════════════════════ */
const SectionCard = ({ children, className = "" }: { children: React.ReactNode; className?: string }) => (
    <div className={`bg-white dark:bg-slate-900 border border-[#ddd] dark:border-slate-800 rounded shadow-sm overflow-hidden ${className}`}>
        {children}
    </div>
);

const SectionHeader = ({ title, icon: Icon }: { title: string; icon: any }) => (
    <div className="bg-[#f6f6f6] dark:bg-slate-800 px-4 py-2 border-b border-[#ddd] dark:border-slate-800 flex items-center gap-2">
        <Icon className="h-4 w-4 text-gray-600 dark:text-gray-400" />
        <span className="text-sm font-bold text-gray-800 dark:text-white uppercase tracking-tight">{title}</span>
    </div>
);

const INPUT = (err?: boolean) =>
    `w-full px-3 py-2 bg-white dark:bg-slate-800 border rounded text-sm outline-none transition-all
    focus:border-[#e77600] focus:shadow-[0_0_3px_2px_rgba(228,121,17,0.5)] placeholder:text-gray-400
    ${err ? 'border-red-600' : 'border-[#a6a6a6] dark:border-slate-700'}`;

const LABEL = "block text-[11px] font-bold text-gray-700 dark:text-slate-300 uppercase tracking-wider mb-1.5";

const PRIMARY_BTN = "bg-[#f0c14b] hover:bg-[#ebae1e] border border-[#a88734] text-gray-900 font-bold rounded-[3px] shadow-sm text-sm py-2 px-4 transition-all flex items-center justify-center gap-2 active:bg-[#e2b13c]";
const SECONDARY_BTN = "bg-white dark:bg-slate-800 hover:bg-gray-50 dark:hover:bg-slate-700 border border-[#adb1b8] dark:border-slate-600 text-gray-700 dark:text-slate-200 rounded-[3px] shadow-sm text-sm font-medium py-2 px-4 transition-all flex items-center justify-center gap-2 active:bg-gray-100 dark:active:bg-slate-600";

export default function PaymentsPage() {
    const [payments, setPayments] = useState<Payment[]>([]);
    const [stats, setStats] = useState({ total_inbound: 0, total_outbound: 0, total_expenses: 0, net_balance: 0 });
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');
    const [typeFilter, setTypeFilter] = useState('all');
    const [formOpen, setFormOpen] = useState(false);
    const [categories, setCategories] = useState<any[]>([]);
    const [toast, setToast] = useState<{ msg: string; type: 'success' | 'error' } | null>(null);

    const showToast = (msg: string, type: 'success' | 'error' = 'success') => {
        setToast({ msg, type });
        setTimeout(() => setToast(null), 3000);
    };

    const loadData = async () => {
        setLoading(true);
        try {
            const [pData, sData, cData] = await Promise.all([
                paymentService.getAll(),
                paymentService.getStats(),
                paymentCategoryService.getAll()
            ]);
            setPayments(Array.isArray(pData) ? pData : []);
            setStats(sData);
            setCategories(cData);
        } catch (error) {
            console.error('Failed to load payments', error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => { loadData(); }, []);

    const filtered = payments.filter(p => {
        const matchesSearch =
            p.payer_payee.toLowerCase().includes(search.toLowerCase()) ||
            p.reference_number?.toLowerCase().includes(search.toLowerCase()) ||
            p.description?.toLowerCase().includes(search.toLowerCase());
        const matchesType = typeFilter === 'all' || p.payment_type === typeFilter;
        return matchesSearch && matchesType;
    });

    return (
        <div className="min-h-screen bg-[#f3f3f3] dark:bg-slate-950 p-4 lg:p-8">
            <div className="max-w-[1400px] mx-auto space-y-6">

                {/* Header */}
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-2">
                    <div className="flex items-center gap-3">
                        {formOpen ? (
                            <button onClick={() => setFormOpen(false)} className="p-2 hover:bg-white border border-transparent hover:border-gray-300 rounded cursor-pointer transition-all">
                                <ChevronDown className="h-6 w-6 transform rotate-90 text-gray-600" />
                            </button>
                        ) : (
                            <div className="w-10 h-10 bg-[#FF9900] rounded flex items-center justify-center shadow-sm">
                                <DollarSign className="h-6 w-6 text-white" strokeWidth={2.5} />
                            </div>
                        )}
                        <div>
                            <h1 className="text-2xl font-bold dark:text-white">{formOpen ? 'New Ledger Entry' : 'Financial Ledger'}</h1>
                            <p className="text-[11px] font-bold text-gray-500 uppercase tracking-widest">{formOpen ? 'Protocol Initiation' : 'System Wide Transactions'}</p>
                        </div>
                    </div>

                    {!formOpen && (
                        <div className="flex items-center gap-2">
                            <button onClick={loadData} className={SECONDARY_BTN}>
                                <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
                                Refresh
                            </button>
                            <button onClick={() => setFormOpen(true)} className={PRIMARY_BTN}>
                                <Plus className="h-4 w-4" />
                                Record Entry
                            </button>
                        </div>
                    )}
                </div>

                {formOpen ? (
                    <CreateView
                        onClose={() => setFormOpen(false)}
                        onSuccess={() => { setFormOpen(false); loadData(); showToast('Transaction recorded successfully'); }}
                        categories={categories}
                    />
                ) : (
                    <>
                        {/* Stats Grid */}
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                            <StatCard label="Total Inbound" val={stats.total_inbound} icon={ArrowDownLeft} color="text-emerald-600" trend="Capital In" />
                            <StatCard label="Total Outbound" val={stats.total_outbound} icon={ArrowUpRight} color="text-red-600" trend="Expenses" />
                            <StatCard label="Operational" val={stats.total_expenses} icon={LayoutGrid} color="text-amber-600" trend="Overhead" />
                            <StatCard label="Net Balance" val={stats.net_balance} icon={DollarSign} color="text-[#FF9900]" trend="Workspace" />
                        </div>

                        {/* Search & Filter Hub */}
                        <SectionCard className="p-4 flex flex-col md:flex-row items-center gap-4">
                            <div className="relative flex-1 group w-full">
                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                                <input
                                    type="text"
                                    placeholder="Search by payer, ID or reference..."
                                    value={search}
                                    onChange={(e) => setSearch(e.target.value)}
                                    className={INPUT() + " pl-10 h-10"}
                                />
                            </div>
                            <div className="flex items-center gap-2 w-full md:w-auto">
                                <div className="flex bg-gray-100 dark:bg-slate-800 p-1 rounded border border-gray-200 dark:border-slate-700 w-full md:w-auto">
                                    {['all', 'inbound', 'outbound'].map((type) => (
                                        <button
                                            key={type}
                                            onClick={() => setTypeFilter(type)}
                                            className={`flex-1 px-4 py-1.5 rounded text-[10px] font-bold uppercase tracking-wider transition-all ${typeFilter === type
                                                ? 'bg-white dark:bg-slate-700 text-[#FF9900] shadow-sm shadow-black/5'
                                                : 'text-gray-500 hover:text-gray-700'
                                                }`}
                                        >
                                            {type}
                                        </button>
                                    ))}
                                </div>
                                <button className={SECONDARY_BTN + " !py-2.5"}>
                                    <Download className="h-4 w-4" />
                                </button>
                            </div>
                        </SectionCard>

                        {/* Ledger Table */}
                        <SectionCard>
                            <SectionHeader title="Transaction Journal" icon={FileText} />
                            {loading ? (
                                <div className="py-20 flex flex-col items-center justify-center gap-3">
                                    <Loader2 className="h-8 w-8 text-[#FF9900] animate-spin" />
                                    <p className="text-[11px] font-bold text-gray-400 uppercase tracking-widest">Synchronizing Journal...</p>
                                </div>
                            ) : filtered.length === 0 ? (
                                <div className="py-20 text-center">
                                    <div className="w-16 h-16 bg-gray-50 dark:bg-slate-800 rounded-full flex items-center justify-center mx-auto mb-4 border border-gray-100 dark:border-slate-700 shadow-inner">
                                        <Filter className="h-6 w-6 text-gray-300" />
                                    </div>
                                    <h3 className="text-gray-900 dark:text-white font-bold">No Records Detected</h3>
                                    <p className="text-xs text-gray-500 max-w-xs mx-auto mt-1">Refine your search parameters or log a new transaction protocol.</p>
                                </div>
                            ) : (
                                <div className="overflow-x-auto">
                                    <table className="w-full text-left border-collapse">
                                        <thead>
                                            <tr className="bg-[#f6f6f6] dark:bg-slate-800/50 border-b border-[#ddd] dark:border-slate-800 text-[10px] font-bold text-gray-600 dark:text-gray-400 uppercase tracking-wider">
                                                <th className="px-6 py-3">REF / Date</th>
                                                <th className="px-6 py-3">Method</th>
                                                <th className="px-6 py-3">Payer / Payee</th>
                                                <th className="px-6 py-3">Category</th>
                                                <th className="px-6 py-3 text-right">Valuation</th>
                                                <th className="px-6 py-3 text-right">Actions</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-gray-100 dark:divide-slate-800">
                                            {filtered.map((payment) => (
                                                <tr key={payment.id} className="hover:bg-[#f6f6f6] dark:hover:bg-slate-800/30 transition-colors group">
                                                    <td className="px-6 py-4">
                                                        <div className="flex flex-col">
                                                            <span className="text-xs font-bold text-gray-900 dark:text-white tracking-tight">#{payment.id}</span>
                                                            <span className="text-[10px] font-medium text-gray-500 uppercase">{formatDate(payment.date)}</span>
                                                        </div>
                                                    </td>
                                                    <td className="px-6 py-4">
                                                        <div className="flex items-center gap-2">
                                                            {(() => {
                                                                const Icon = METHOD_ICONS[payment.method] || Wallet;
                                                                return <Icon className="w-3.5 h-3.5 text-gray-400" />;
                                                            })()}
                                                            <span className="text-[10px] font-bold text-gray-600 dark:text-gray-400 uppercase tracking-tighter">{payment.method.replace('_', ' ')}</span>
                                                        </div>
                                                    </td>
                                                    <td className="px-6 py-4">
                                                        <div className="flex flex-col">
                                                            <span className="text-xs font-bold text-gray-800 dark:text-slate-200">{payment.payer_payee || "Internal Transfer"}</span>
                                                            <span className="text-[10px] text-gray-500">{payment.user_name}</span>
                                                        </div>
                                                    </td>
                                                    <td className="px-6 py-4">
                                                        <span className="text-[10px] font-bold px-2 py-0.5 bg-gray-100 dark:bg-slate-800 text-gray-600 dark:text-gray-400 rounded-sm border border-gray-200 dark:border-slate-700">
                                                            {payment.category_name}
                                                        </span>
                                                    </td>
                                                    <td className="px-6 py-4 text-right">
                                                        <span className={`text-sm font-bold tracking-tight ${payment.payment_type === 'inbound' ? 'text-emerald-600' : 'text-red-600'}`}>
                                                            {payment.payment_type === 'inbound' ? '+' : '-'}{formatCurrency(payment.amount)}
                                                        </span>
                                                    </td>
                                                    <td className="px-6 py-4 text-right">
                                                        <div className="flex items-center justify-end gap-1">
                                                            <button className="p-1.5 text-blue-600 hover:bg-white dark:hover:bg-slate-800 border border-transparent hover:border-blue-200 rounded shadow-sm transition-all">
                                                                <Eye className="h-3.5 w-3.5" />
                                                            </button>
                                                            <button className="p-1.5 text-gray-600 hover:bg-white dark:hover:bg-slate-800 border border-transparent hover:border-gray-200 rounded shadow-sm transition-all" title="Print Receipt">
                                                                <Printer className="h-3.5 w-3.5" />
                                                            </button>
                                                            <button className="p-1.5 text-red-600 hover:bg-white dark:hover:bg-slate-800 border border-transparent hover:border-red-200 rounded shadow-sm transition-all">
                                                                <Trash2 className="h-3.5 w-3.5" />
                                                            </button>
                                                        </div>
                                                    </td>
                                                </tr>
                                            ))}
                                            {filtered.length > 0 && (
                                                <tr>
                                                    <td colSpan={6} className="px-6 py-8 text-center bg-gray-50/50 dark:bg-slate-900/50">
                                                        <p className="text-[10px] font-bold text-gray-400 uppercase tracking-[0.2em] italic">End of Ledger Records</p>
                                                    </td>
                                                </tr>
                                            )}
                                        </tbody>
                                    </table>
                                </div>
                            )}
                        </SectionCard>
                    </>
                )}
            </div>

            {/* Toast Hub */}
            {toast && (
                <div className="fixed bottom-6 right-6 z-[200] animate-in slide-in-from-right duration-300">
                    <div className={`flex items-center gap-3 px-6 py-3 rounded shadow-2xl border-l-[6px] ${toast.type === 'success' ? 'bg-[#232f3e] border-[#f0c14b] text-white' : 'bg-red-900 border-red-500 text-white'}`}>
                        {toast.type === 'success' ? <CheckCircle2 className="h-5 w-5 text-[#f0c14b]" /> : <AlertTriangle className="h-5 w-5 text-red-400" />}
                        <p className="text-sm font-bold tracking-tight">{toast.msg}</p>
                        <button onClick={() => setToast(null)} className="ml-4 hover:opacity-70 transition-opacity">
                            <X className="h-4 w-4" />
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
}

function StatCard({ label, val, icon: Icon, color, trend }: any) {
    return (
        <SectionCard className="p-4 group">
            <div className="flex justify-between items-start">
                <div>
                    <p className="text-[10px] font-bold text-gray-500 uppercase tracking-widest leading-none mb-1">{label}</p>
                    <p className={`text-2xl font-bold tracking-tighter ${color} mb-1`}>{formatCurrency(Math.abs(val))}</p>
                    <div className="flex items-center gap-1">
                        <span className="text-[9px] font-bold text-gray-400 uppercase tracking-tighter opacity-60">{trend}</span>
                    </div>
                </div>
                <div className="p-2.5 bg-gray-50 dark:bg-slate-800 rounded group-hover:shadow-inner transition-all border border-gray-100 dark:border-slate-800">
                    <Icon className={`h-5 w-5 ${color}`} strokeWidth={2.5} />
                </div>
            </div>
        </SectionCard>
    );
}

function CreateView({ onClose, onSuccess, categories }: any) {
    const [loading, setLoading] = useState(false);
    const [formData, setFormData] = useState({
        amount: '',
        payment_type: 'inbound',
        method: 'cash',
        category: '',
        payer_payee: '',
        reference_number: '',
        description: ''
    });

    const set = (f: string, v: any) => setFormData(prev => ({ ...prev, [f]: v }));

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        try {
            await paymentService.create(formData);
            onSuccess();
        } catch (error) {
            console.error('Entry failed', error);
        } finally {
            setLoading(false);
        }
    };

    return (
        <SectionCard className="animate-in fade-in slide-in-from-bottom-4 duration-500">
            <SectionHeader title="Protocol Configuration" icon={Settings} />
            <form onSubmit={handleSubmit}>
                <div className="p-6 lg:p-8 space-y-8">
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                        {/* Transaction Core */}
                        <div className="space-y-6">
                            <div className="p-4 bg-[#f0c14b]/5 border border-[#f0c14b]/10 rounded shadow-inner">
                                <label className={LABEL}>Protocol Selection</label>
                                <div className="grid grid-cols-2 gap-2">
                                    {['inbound', 'outbound'].map(t => (
                                        <button
                                            key={t}
                                            type="button"
                                            onClick={() => set('payment_type', t)}
                                            className={`py-2 px-3 rounded text-[10px] font-bold uppercase tracking-wider transition-all border ${formData.payment_type === t
                                                ? 'bg-white dark:bg-slate-800 border-[#a88734] text-[#131921] dark:text-[#f0c14b] shadow-sm'
                                                : 'bg-transparent border-transparent text-gray-500 hover:text-gray-700'
                                                }`}
                                        >
                                            {t === 'inbound' ? 'Receive (+)' : 'Disburse (-)'}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            <div>
                                <label className={LABEL}>Valuation (PKR)</label>
                                <div className="relative">
                                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 font-bold text-sm">Rs.</span>
                                    <input
                                        required
                                        type="number"
                                        step="0.01"
                                        value={formData.amount}
                                        onChange={e => set('amount', e.target.value)}
                                        placeholder="0.00"
                                        className={INPUT() + " pl-10 text-lg font-bold text-gray-900"}
                                    />
                                </div>
                            </div>
                        </div>

                        {/* Remittance Detail */}
                        <div className="space-y-6 lg:border-x lg:border-gray-100 lg:dark:border-slate-800 lg:px-8">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div>
                                    <label className={LABEL}>Method</label>
                                    <select
                                        value={formData.method}
                                        onChange={e => set('method', e.target.value)}
                                        className={INPUT()}
                                    >
                                        <option value="cash">Hard Cash</option>
                                        <option value="bank_transfer">Bank Wire</option>
                                        <option value="check">Bankers Check</option>
                                        <option value="mobile_wallet">Digital Wallet</option>
                                        <option value="other">Other Protocol</option>
                                    </select>
                                </div>
                                <div>
                                    <label className={LABEL}>Classification</label>
                                    <select
                                        required
                                        value={formData.category}
                                        onChange={e => set('category', e.target.value)}
                                        className={INPUT()}
                                    >
                                        <option value="">Select Category...</option>
                                        {categories.map((c: any) => <option key={c.id} value={c.id}>{c.name}</option>)}
                                    </select>
                                </div>
                            </div>
                            <div>
                                <label className={LABEL}>External Entity (Payer/Payee)</label>
                                <div className="relative">
                                    <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                                    <input
                                        type="text"
                                        value={formData.payer_payee}
                                        onChange={e => set('payer_payee', e.target.value)}
                                        placeholder="Individual or Entity Name"
                                        className={INPUT() + " pl-10"}
                                    />
                                </div>
                            </div>
                        </div>

                        {/* Reference & Audit */}
                        <div className="space-y-6">
                            <div>
                                <label className={LABEL}>Reference Identifier</label>
                                <input
                                    type="text"
                                    value={formData.reference_number}
                                    onChange={e => set('reference_number', e.target.value)}
                                    placeholder="Voucher # or Invoice #"
                                    className={INPUT()}
                                />
                            </div>
                            <div>
                                <label className={LABEL}>Internal Protocol Note</label>
                                <textarea
                                    rows={2}
                                    value={formData.description}
                                    onChange={e => set('description', e.target.value)}
                                    placeholder="Additional context for this financial event..."
                                    className={INPUT() + " resize-none h-[76px]"}
                                />
                            </div>
                        </div>
                    </div>
                </div>

                {/* Footer Actions */}
                <div className="px-8 py-5 bg-gray-50 dark:bg-slate-800 border-t border-[#ddd] dark:border-slate-800 flex items-center justify-between">
                    <button type="button" onClick={onClose} className={SECONDARY_BTN + " !px-8"}>Discard Entry</button>
                    <button type="submit" disabled={loading} className={PRIMARY_BTN + " !px-10 uppercase tracking-widest border-b-2 border-b-[#a88734]"}>
                        {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                        {loading ? 'Processing...' : 'Synchronize to Ledger'}
                    </button>
                </div>
            </form>
        </SectionCard>
    );
}

