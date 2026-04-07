'use client';

import { useState, useEffect } from 'react';
import { paymentService, paymentCategoryService } from '@/lib/api';
import { formatCurrency, formatDate } from '@/lib/utils';
import {
    Users, Search, RefreshCw, Plus, ArrowDownLeft,
    Filter, X, Loader2, Banknote, CheckCircle2,
    Trash2, Printer, Eye, ShoppingCart, UserCheck,
    ChevronDown, Save, FileText, Download, User,
    DollarSign, AlertTriangle
} from 'lucide-react';

/* ══════════════════════════════════════════════
   COMPONENTS & STYLES
   ══════════════════════════════════════════════ */
const SectionCard = ({ children, className = "" }: { children: React.ReactNode; className?: string }) => (
    <div className={`bg-white dark:bg-[#1a252f] border border-slate-200 dark:border-white/10 rounded-xl shadow-sm overflow-hidden ${className}`}>
        {children}
    </div>
);

const SectionHeader = ({ title, icon: Icon, subtitle }: { title: string; icon: any; subtitle?: string }) => (
    <div className="bg-slate-50 dark:bg-white/5 px-4 py-3 border-b border-slate-200 dark:border-white/10 flex items-center justify-between">
        <div className="flex items-center gap-2">
            <Icon className="h-4 w-4 text-[#EEAF1C]" />
            <div>
                <span className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-tight">{title}</span>
                {subtitle && <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">{subtitle}</p>}
            </div>
        </div>
    </div>
);

const INPUT = (err?: boolean) =>
    `w-full px-3 py-2 bg-white dark:bg-slate-800 border rounded-lg text-sm outline-none transition-all
    focus:border-[#EEAF1C] focus:ring-4 focus:ring-[#EEAF1C]/10 placeholder:text-slate-400
    ${err ? 'border-red-600' : 'border-slate-200 dark:border-white/10'}`;

const LABEL = "block text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-[0.1em] mb-1.5";

const PRIMARY_BTN = "bg-[#EEAF1C] hover:bg-[#1e40af] text-white font-bold rounded-lg shadow-sm text-[11px] uppercase tracking-widest py-2.5 px-4 transition-all flex items-center justify-center gap-2 active:scale-95";
const SECONDARY_BTN = "bg-white dark:bg-white/5 hover:bg-slate-50 dark:hover:bg-white/10 border border-slate-200 dark:border-white/10 text-slate-600 dark:text-slate-300 rounded-lg shadow-sm text-[11px] font-bold uppercase tracking-widest py-2.5 px-4 transition-all flex items-center justify-center gap-2 active:scale-95";

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

export default function CustomerPaymentsPage() {
    const [payments, setPayments] = useState<Payment[]>([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');
    const [formOpen, setFormOpen] = useState(false);
    const [categories, setCategories] = useState<any[]>([]);
    const [toast, setToast] = useState<{ msg: string; type: 'success' | 'error' } | null>(null);

    const showToast = (msg: string, type: 'success' | 'error' = 'success') => {
        setToast({ msg, type });
        setTimeout(() => setToast(null), 3000);
    };

    const load = async () => {
        setLoading(true);
        try {
            const data = await paymentService.getAll({ payment_type: 'inbound' });
            const cData = await paymentCategoryService.getAll();
            setPayments(Array.isArray(data) ? data : []);
            setCategories(cData);
        } catch (error) {
            console.error('Failed to load customer payments', error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => { load(); }, []);

    const filtered = payments.filter(p =>
        p.payer_payee.toLowerCase().includes(search.toLowerCase()) ||
        p.reference_number?.toLowerCase().includes(search.toLowerCase())
    );

    const totalInbound = filtered.reduce((sum, p) => sum + parseFloat(String(p.amount)), 0);

    return (
        <div className="max-w-[1400px] mx-auto space-y-6 pb-12">

            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mt-2">
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-[#EEAF1C] rounded-xl flex items-center justify-center shadow-lg shadow-blue-500/20">
                        <Users className="h-5 w-5 text-white" strokeWidth={2.5} />
                    </div>
                    <div>
                        <h1 className="text-xl font-black text-slate-900 dark:text-white uppercase tracking-tight">Client Balances</h1>
                        <p className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-[0.2em]">Inbound Capital Registry</p>
                    </div>
                </div>

                {!formOpen && (
                    <div className="flex items-center gap-2">
                        <button onClick={load} className={SECONDARY_BTN}>
                            <RefreshCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} />
                            Sync Registry
                        </button>
                        <button onClick={() => setFormOpen(true)} className={PRIMARY_BTN}>
                            <Plus className="h-3.5 w-3.5" />
                            Record Receipt
                        </button>
                    </div>
                )}
                {formOpen && (
                    <button onClick={() => setFormOpen(false)} className={SECONDARY_BTN}>
                        <X className="h-3.5 w-3.5" />
                        Cancel Entry
                    </button>
                )}
            </div>

            {formOpen ? (
                <CreateView
                    onClose={() => setFormOpen(false)}
                    onSuccess={() => { setFormOpen(false); load(); showToast('Receipt recorded successfully'); }}
                    categories={categories}
                />
            ) : (
                <>
                    {/* Summary Bar */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <SectionCard className="p-4 flex items-center justify-between border-emerald-500/10">
                            <div>
                                <p className="text-[10px] font-black text-emerald-600 uppercase tracking-widest mb-1">Total Collected</p>
                                <p className="text-2xl font-black text-emerald-600 tracking-tighter leading-none">{formatCurrency(totalInbound)}</p>
                            </div>
                            <div className="p-3 bg-emerald-50 dark:bg-emerald-900/10 rounded-xl border border-emerald-100 dark:border-emerald-900/20">
                                <Banknote className="h-5 w-5 text-emerald-600" />
                            </div>
                        </SectionCard>
                        <SectionCard className="p-4 flex items-center justify-between">
                            <div>
                                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Registry Volume</p>
                                <p className="text-2xl font-black text-slate-900 dark:text-white tracking-tighter leading-none">{filtered.length} Entries</p>
                            </div>
                            <div className="p-3 bg-slate-50 dark:bg-white/5 rounded-xl border border-slate-200 dark:border-white/10">
                                <Users className="h-5 w-5 text-slate-400" />
                            </div>
                        </SectionCard>
                    </div>

                    {/* Search Hub */}
                    <div className="bg-white dark:bg-[#1a252f] border border-slate-200 dark:border-white/10 rounded-xl p-3">
                        <div className="relative group max-w-xl">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 group-focus-within:text-[#EEAF1C] transition-colors" />
                            <input
                                type="text"
                                placeholder="Search client entity or transaction ID..."
                                value={search}
                                onChange={(e) => setSearch(e.target.value)}
                                className="w-full pl-10 pr-4 py-2 bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-lg text-sm outline-none focus:border-[#EEAF1C] focus:ring-4 focus:ring-[#EEAF1C]/10 transition-all font-medium"
                            />
                        </div>
                    </div>

                    {/* Journal Table */}
                    <SectionCard>
                        <SectionHeader title="Receipt Journal" icon={FileText} subtitle="Inbound client settlements" />
                        {loading ? (
                            <div className="py-20 flex flex-col items-center justify-center gap-3">
                                <Loader2 className="h-8 w-8 text-[#EEAF1C] animate-spin" />
                                <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Validating Registry...</p>
                            </div>
                        ) : filtered.length === 0 ? (
                            <div className="py-24 text-center">
                                <div className="w-16 h-16 bg-slate-50 dark:bg-white/5 rounded-2xl flex items-center justify-center mx-auto mb-4 border border-slate-200 dark:border-white/10">
                                    <ShoppingCart className="h-6 w-6 text-slate-300" />
                                </div>
                                <h3 className="text-slate-900 dark:text-white font-bold uppercase tracking-tight">No Receipts Found</h3>
                                <p className="text-xs text-slate-500 max-w-sm mx-auto mt-1 font-medium italic">Refine your search or record a new transaction.</p>
                            </div>
                        ) : (
                            <div className="overflow-x-auto">
                                <table className="w-full text-left border-collapse">
                                    <thead>
                                        <tr className="bg-slate-50/50 dark:bg-white/5 border-b border-slate-200 dark:border-white/10 text-[11px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-tight">
                                            <th className="px-4 py-3 whitespace-nowrap">Receipt</th>
                                            <th className="px-4 py-3 whitespace-nowrap">Client Entity</th>
                                            <th className="px-4 py-3 whitespace-nowrap">Classification</th>
                                            <th className="px-4 py-3 whitespace-nowrap">Protocol</th>
                                            <th className="px-4 py-3 text-right whitespace-nowrap">Amount</th>
                                            <th className="px-4 py-3 text-right whitespace-nowrap">Actions</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-100 dark:divide-white/5">
                                        {filtered.map((payment) => (
                                            <tr key={payment.id} className="hover:bg-slate-50/60 dark:hover:bg-white/[0.02] transition-colors group text-sm">
                                                <td className="px-4 py-3">
                                                    <div className="flex flex-col">
                                                        <span className="font-medium text-[#EEAF1C]">#{payment.id}</span>
                                                        <span className="text-[11px] text-slate-500 font-medium">{formatDate(payment.date)}</span>
                                                    </div>
                                                </td>
                                                <td className="px-4 py-3">
                                                    <div className="flex items-center gap-2">
                                                        <div className="w-7 h-7 rounded-lg bg-slate-900 dark:bg-white/10 flex items-center justify-center text-[10px] font-black text-[#EEAF1C] uppercase border border-white/10">
                                                            {payment.payer_payee[0]}
                                                        </div>
                                                        <span className="font-medium text-slate-800 dark:text-slate-200">{payment.payer_payee}</span>
                                                    </div>
                                                </td>
                                                <td className="px-4 py-3">
                                                    <span className="inline-block px-2 py-0.5 rounded border border-blue-200 bg-blue-50 text-[#EEAF1C] text-[11px] font-semibold uppercase tracking-tight">
                                                        {payment.category_name}
                                                    </span>
                                                </td>
                                                <td className="px-4 py-3">
                                                    <span className="text-slate-500 dark:text-slate-400 font-medium">{payment.method.replace('_', ' ')}</span>
                                                </td>
                                                <td className="px-4 py-3 text-right">
                                                    <span className="font-bold text-emerald-600 tracking-tight">+{formatCurrency(payment.amount)}</span>
                                                </td>
                                                <td className="px-4 py-3 text-right">
                                                    <div className="flex items-center justify-end gap-1">
                                                        <button className="p-1.5 rounded-md text-slate-400 hover:text-[#EEAF1C] hover:bg-blue-50 dark:hover:bg-[#EEAF1C]/10 transition-colors" title="View Receipt">
                                                            <Eye className="h-4 w-4" />
                                                        </button>
                                                        <button className="p-1.5 rounded-md text-slate-400 hover:text-[#EEAF1C] hover:bg-blue-50 dark:hover:bg-[#EEAF1C]/10 transition-colors" title="Print Statement">
                                                            <Printer className="h-4 w-4" />
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

            {/* Notification Hub */}
            {toast && (
                <div className="fixed bottom-6 right-6 z-[200] animate-in slide-in-from-right duration-300">
                    <div className={`flex items-center gap-3 px-6 py-3 rounded shadow-2xl border-l-[6px] ${toast.type === 'success' ? 'bg-[#232f3e] border-[#EEAF1C] text-white' : 'bg-red-900 border-red-500 text-white'}`}>
                        {toast.type === 'success' ? <CheckCircle2 className="h-5 w-5 text-[#EEAF1C]" /> : <AlertTriangle className="h-5 w-5 text-red-400" />}
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
            <SectionHeader title="Protocol Configuration" icon={DollarSign} />
            <form onSubmit={handleSubmit}>
                <div className="p-6 lg:p-8 space-y-8">
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                        {/* Receipt Core */}
                        <div className="space-y-6">
                            <div className="p-5 bg-emerald-50/10 dark:bg-emerald-900/5 border border-emerald-500/10 rounded shadow-inner">
                                <label className={LABEL}>Receipt Valuation (PKR)</label>
                                <div className="relative">
                                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-emerald-600 font-bold">Rs.</span>
                                    <input
                                        required
                                        type="number"
                                        step="0.01"
                                        value={formData.amount}
                                        onChange={e => set('amount', e.target.value)}
                                        placeholder="0.00"
                                        className={INPUT() + " pl-10 text-xl font-bold text-emerald-600"}
                                    />
                                </div>
                            </div>
                            <div>
                                <label className={LABEL}>Customer Identity</label>
                                <div className="relative">
                                    <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                                    <input
                                        required
                                        type="text"
                                        value={formData.payer_payee}
                                        onChange={e => set('payer_payee', e.target.value)}
                                        placeholder="Enter Customer Name"
                                        className={INPUT() + " pl-10"}
                                    />
                                </div>
                            </div>
                        </div>

                        {/* Remittance Detail */}
                        <div className="space-y-6 lg:border-x lg:border-slate-100 lg:dark:border-white/5 lg:px-8">
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className={LABEL}>Protocol</label>
                                    <select
                                        value={formData.method}
                                        onChange={e => set('method', e.target.value)}
                                        className={INPUT()}
                                    >
                                        <option value="cash">Hard Cash</option>
                                        <option value="bank_transfer">Bank Wire</option>
                                        <option value="check">Bankers Check</option>
                                        <option value="mobile_wallet">Digital Wallet</option>
                                    </select>
                                </div>
                                <div>
                                    <label className={LABEL}>Class</label>
                                    <select
                                        required
                                        value={formData.category}
                                        onChange={e => set('category', e.target.value)}
                                        className={INPUT()}
                                    >
                                        <option value="">Category...</option>
                                        {categories.map((c: any) => <option key={c.id} value={c.id}>{c.name}</option>)}
                                    </select>
                                </div>
                            </div>
                            <div>
                                <label className={LABEL}>Reference Number</label>
                                <input
                                    type="text"
                                    value={formData.reference_number}
                                    onChange={e => set('reference_number', e.target.value)}
                                    placeholder="e.g. TR-5510"
                                    className={INPUT()}
                                />
                            </div>
                        </div>

                        {/* Audit Note */}
                        <div className="space-y-6">
                            <div>
                                <label className={LABEL}>Internal Receipt Note</label>
                                <textarea
                                    rows={4}
                                    value={formData.description}
                                    onChange={e => set('description', e.target.value)}
                                    placeholder="Brief context for this financial event..."
                                    className={INPUT() + " resize-none h-[126px]"}
                                />
                            </div>
                        </div>
                    </div>
                </div>

                {/* Footer */}
                <div className="px-8 py-5 bg-slate-50 dark:bg-white/5 border-t border-slate-200 dark:border-white/10 flex items-center justify-between">
                    <button type="button" onClick={onClose} className={SECONDARY_BTN + " !px-8"}>Discard Receipt</button>
                    <button type="submit" disabled={loading} className={PRIMARY_BTN + " !px-10"}>
                        {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                        {loading ? 'Processing...' : 'Authorize Receipt'}
                    </button>
                </div>
            </form>
        </SectionCard>
    );
}

