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
    <div className={`bg-white dark:bg-[#1B1C1E] border border-slate-200 dark:border-white/10 rounded-xl shadow-sm overflow-hidden ${className}`}>
        {children}
    </div>
);

const SectionHeader = ({ title, icon: Icon, subtitle }: { title: string; icon: any; subtitle?: string }) => (
    <div className="bg-slate-50 dark:bg-white/5 px-4 py-3 border-b border-slate-200 dark:border-white/10 flex items-center justify-between">
        <div className="flex items-center gap-2">
            <Icon className="h-4 w-4 text-[#F7CA00]" />
            <div>
                <span className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-tight">{title}</span>
                {subtitle && <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">{subtitle}</p>}
            </div>
        </div>
    </div>
);

const INPUT = (err?: boolean) =>
    `w-full px-3 py-2 bg-white dark:bg-slate-800 border rounded-lg text-sm outline-none transition-all
    focus:border-[#F7CA00] focus:ring-4 focus:ring-[#F7CA00]/10 placeholder:text-slate-400
    ${err ? 'border-red-600' : 'border-slate-200 dark:border-white/10'}`;

const LABEL = "block text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-[0.1em] mb-1.5";

const PRIMARY_BTN = "bg-[#F7CA00] hover:bg-[#1e40af] text-white font-bold rounded-lg shadow-sm text-[11px] uppercase tracking-widest py-2.5 px-4 transition-all flex items-center justify-center gap-2 active:scale-95";
const SECONDARY_BTN = "bg-white dark:bg-white/5 hover:bg-slate-50 dark:hover:bg-white/10 border border-slate-200 dark:border-white/10 text-slate-600 dark:text-slate-300 rounded-lg shadow-sm text-[11px] font-bold uppercase tracking-widest py-2.5 px-4 transition-all flex items-center justify-center gap-2 active:scale-95";

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
        <div className="max-w-[1400px] mx-auto space-y-6 pb-12">

            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mt-2">
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-[#F7CA00] rounded-xl flex items-center justify-center shadow-lg shadow-blue-500/20">
                        <DollarSign className="h-5 w-5 text-white" strokeWidth={2.5} />
                    </div>
                    <div>
                        <h1 className="text-xl font-black text-slate-900 dark:text-white uppercase tracking-tight">Transaction Logs</h1>
                        <p className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-[0.2em]">Financial Ledger Control</p>
                    </div>
                </div>

                {!formOpen && (
                    <div className="flex items-center gap-2">
                        <button onClick={loadData} className={SECONDARY_BTN}>
                            <RefreshCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} />
                            Sync Ledger
                        </button>
                        <button onClick={() => setFormOpen(true)} className={PRIMARY_BTN}>
                            <Plus className="h-3.5 w-3.5" />
                            Log Transaction
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
                    {/* Metrics Grid */}
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                        <StatCard label="Inflow" val={stats.total_inbound} icon={ArrowDownLeft} color="text-emerald-600" bg="bg-emerald-50 dark:bg-emerald-900/10" />
                        <StatCard label="Outflow" val={stats.total_outbound} icon={ArrowUpRight} color="text-red-600" bg="bg-red-50 dark:bg-red-900/10" />
                        <StatCard label="Internal" val={stats.total_expenses} icon={LayoutGrid} color="text-amber-600" bg="bg-amber-50 dark:bg-amber-900/10" />
                        <StatCard label="Net Balance" val={stats.net_balance} icon={DollarSign} color="text-[#F7CA00]" bg="bg-blue-50 dark:bg-blue-900/10" />
                    </div>

                    {/* Filter Bar */}
                    <div className="bg-white dark:bg-[#1B1C1E] border border-slate-200 dark:border-white/10 rounded-xl p-3 flex flex-col md:flex-row items-center gap-4">
                        <div className="relative flex-1 group w-full">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 group-focus-within:text-[#F7CA00] transition-colors" />
                            <input
                                type="text"
                                placeholder="Search by entity, ID or reference..."
                                value={search}
                                onChange={(e) => setSearch(e.target.value)}
                                className="w-full pl-10 pr-4 py-2 bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-lg text-sm outline-none focus:border-[#F7CA00] focus:ring-4 focus:ring-[#F7CA00]/10 transition-all font-medium"
                            />
                        </div>
                        <div className="flex bg-slate-100 dark:bg-white/5 p-1 rounded-lg border border-slate-200 dark:border-white/10 w-full md:w-auto">
                            {['all', 'inbound', 'outbound'].map((type) => (
                                <button
                                    key={type}
                                    onClick={() => setTypeFilter(type)}
                                    className={`flex-1 md:flex-initial px-6 py-1.5 rounded-md text-[10px] font-black uppercase tracking-wider transition-all ${typeFilter === type
                                        ? 'bg-white dark:bg-white/10 text-[#F7CA00] shadow-sm'
                                        : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'
                                        }`}
                                >
                                    {type}
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Main Table */}
                    <SectionCard>
                        <SectionHeader title="Transaction Journal" icon={FileText} subtitle="Real-time financial activity" />
                        {loading ? (
                            <div className="py-20 flex flex-col items-center justify-center gap-3">
                                <Loader2 className="h-8 w-8 text-[#F7CA00] animate-spin" />
                                <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Synchronizing Records...</p>
                            </div>
                        ) : filtered.length === 0 ? (
                            <div className="py-24 text-center">
                                <div className="w-16 h-16 bg-slate-50 dark:bg-white/5 rounded-2xl flex items-center justify-center mx-auto mb-4 border border-slate-200 dark:border-white/10">
                                    <Filter className="h-6 w-6 text-slate-300" />
                                </div>
                                <h3 className="text-slate-900 dark:text-white font-bold uppercase tracking-tight">No Results Found</h3>
                                <p className="text-xs text-slate-500 max-w-xs mx-auto mt-1 font-medium italic">Try adjusting your filters or search terms.</p>
                            </div>
                        ) : (
                            <div className="overflow-x-auto">
                                <table className="w-full text-left border-collapse">
                                    <thead>
                                        <tr className="bg-slate-50/50 dark:bg-white/5 border-b border-slate-200 dark:border-white/10">
                                            <th className="px-4 py-3 text-xs font-semibold text-slate-500 dark:text-slate-400 whitespace-nowrap">Voucher</th>
                                            <th className="px-4 py-3 text-xs font-semibold text-slate-500 dark:text-slate-400 whitespace-nowrap">Method</th>
                                            <th className="px-4 py-3 text-xs font-semibold text-slate-500 dark:text-slate-400 whitespace-nowrap">Entity Information</th>
                                            <th className="px-4 py-3 text-xs font-semibold text-slate-500 dark:text-slate-400 whitespace-nowrap">Classification</th>
                                            <th className="px-4 py-3 text-right text-xs font-semibold text-slate-500 dark:text-slate-400 whitespace-nowrap">Amount</th>
                                            <th className="px-4 py-3 text-right text-xs font-semibold text-slate-500 dark:text-slate-400 whitespace-nowrap">Actions</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-100 dark:divide-white/5">
                                        {filtered.map((payment) => (
                                            <tr key={payment.id} className="hover:bg-slate-50/60 dark:hover:bg-white/[0.02] transition-colors group">
                                                <td className="px-4 py-3">
                                                    <div className="flex flex-col">
                                                        <span className="text-sm font-medium text-[#F7CA00]">#{payment.id}</span>
                                                        <span className="text-[11px] text-slate-500 font-medium">{formatDate(payment.date)}</span>
                                                    </div>
                                                </td>
                                                <td className="px-4 py-3">
                                                    <div className="flex items-center gap-2">
                                                        <span className="text-sm text-slate-700 dark:text-slate-300 font-medium capitalize">{payment.method.replace('_', ' ')}</span>
                                                    </div>
                                                </td>
                                                <td className="px-4 py-3">
                                                    <div className="flex flex-col">
                                                        <span className="text-sm font-medium text-slate-800 dark:text-slate-200">{payment.payer_payee || "Internal Protocol"}</span>
                                                        <span className="text-[11px] text-slate-500 italic">By: {payment.user_name}</span>
                                                    </div>
                                                </td>
                                                <td className="px-4 py-3">
                                                    <span className="inline-block px-2 py-0.5 rounded border border-blue-200 bg-blue-50 text-[#F7CA00] text-[11px] font-semibold uppercase tracking-tight">
                                                        {payment.category_name}
                                                    </span>
                                                </td>
                                                <td className="px-4 py-3 text-right">
                                                    <span className={`text-sm font-bold tracking-tight ${payment.payment_type === 'inbound' ? 'text-emerald-600' : 'text-red-500'}`}>
                                                        {payment.payment_type === 'inbound' ? '+' : '-'}{formatCurrency(payment.amount)}
                                                    </span>
                                                </td>
                                                <td className="px-4 py-3 text-right">
                                                    <div className="flex items-center justify-end gap-1">
                                                        <button className="p-1.5 rounded-md text-slate-400 hover:text-[#F7CA00] hover:bg-blue-50 dark:hover:bg-[#F7CA00]/10 transition-colors" title="View Details">
                                                            <Eye className="h-4 w-4" />
                                                        </button>
                                                        <button className="p-1.5 rounded-md text-slate-400 hover:text-[#F7CA00] hover:bg-blue-50 dark:hover:bg-[#F7CA00]/10 transition-colors" title="Download Receipt">
                                                            <Download className="h-4 w-4" />
                                                        </button>
                                                        <button className="p-1.5 rounded-md text-slate-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-500/10 transition-colors" title="Delete Entry">
                                                            <Trash2 className="h-4 w-4" />
                                                        </button>
                                                    </div>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        )}
                    </SectionCard>
                </>
            )}

            {/* Toast Hub */}
            {toast && (
                <div className="fixed bottom-6 right-6 z-[200] animate-in slide-in-from-right duration-300">
                    <div className={`flex items-center gap-3 px-6 py-3 rounded shadow-2xl border-l-[6px] ${toast.type === 'success' ? 'bg-[#232f3e] border-[#F7CA00] text-white' : 'bg-red-900 border-red-500 text-white'}`}>
                        {toast.type === 'success' ? <CheckCircle2 className="h-5 w-5 text-[#F7CA00]" /> : <AlertTriangle className="h-5 w-5 text-red-400" />}
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

function StatCard({ label, val, icon: Icon, color, bg }: any) {
    return (
        <SectionCard className="p-4 relative group hover:border-[#F7CA00]/30 transition-all">
            <div className="flex justify-between items-start">
                <div>
                    <p className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-[0.2em] mb-1">{label}</p>
                    <p className={`text-xl font-black tracking-tighter ${color} mb-0.5`}>Rs. {Math.abs(val).toLocaleString()}</p>
                </div>
                <div className={`p-2.5 ${bg} rounded-xl border border-slate-200/50 dark:border-white/5`}>
                    <Icon className={`h-4.5 w-4.5 ${color}`} strokeWidth={2.5} />
                </div>
            </div>
            <div className="mt-3 h-1 w-full bg-slate-50 dark:bg-white/5 rounded-full overflow-hidden">
                <div className={`h-full ${color.replace('text-', 'bg-')} opacity-20 w-2/3 transition-all duration-1000 group-hover:w-full`} />
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
                            <div className="p-4 bg-[#F7CA00]/5 border border-[#F7CA00]/10 rounded shadow-inner">
                                <label className={LABEL}>Protocol Selection</label>
                                <div className="grid grid-cols-2 gap-2">
                                    {['inbound', 'outbound'].map(t => (
                                        <button
                                            key={t}
                                            type="button"
                                            onClick={() => set('payment_type', t)}
                                            className={`py-2 px-3 rounded text-[10px] font-bold uppercase tracking-wider transition-all border ${formData.payment_type === t
                                                ? 'bg-white dark:bg-slate-800 border-[#a88734] text-[#131921] dark:text-[#F7CA00] shadow-sm'
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

