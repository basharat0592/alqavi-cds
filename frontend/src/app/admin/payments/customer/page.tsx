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
                                <UserCheck className="h-6 w-6 text-white" strokeWidth={2.5} />
                            </div>
                        )}
                        <div>
                            <h1 className="text-2xl font-bold dark:text-white">{formOpen ? 'New Receipt Protocol' : 'Customer Receipts'}</h1>
                            <p className="text-[11px] font-bold text-gray-500 uppercase tracking-widest">{formOpen ? 'Individual Entity Inbound' : 'Capital Inflow Journal'}</p>
                        </div>
                    </div>

                    {!formOpen && (
                        <div className="flex items-center gap-2">
                            <button onClick={load} className={SECONDARY_BTN}>
                                <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
                                Refresh
                            </button>
                            <button onClick={() => setFormOpen(true)} className={PRIMARY_BTN}>
                                <Plus className="h-4 w-4" />
                                Record Receipt
                            </button>
                        </div>
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
                            <SectionCard className="p-4 flex items-center justify-between bg-emerald-50 dark:bg-emerald-900/10 border-emerald-100 dark:border-emerald-900/30">
                                <div>
                                    <p className="text-[10px] font-bold text-emerald-700 dark:text-emerald-500 uppercase tracking-widest leading-none mb-1">Total Collected</p>
                                    <p className="text-2xl font-bold text-emerald-600 tracking-tighter leading-none">{formatCurrency(totalInbound)}</p>
                                </div>
                                <div className="p-3 bg-white dark:bg-slate-800 rounded shadow-sm border border-emerald-100 dark:border-emerald-800">
                                    <Banknote className="h-6 w-6 text-emerald-500" />
                                </div>
                            </SectionCard>
                            <SectionCard className="p-4 flex items-center justify-between">
                                <div>
                                    <p className="text-[10px] font-bold text-gray-500 uppercase tracking-widest leading-none mb-1">Receipt Volume</p>
                                    <p className="text-2xl font-bold text-gray-900 dark:text-white tracking-tighter leading-none">{filtered.length} Entries</p>
                                </div>
                                <div className="p-3 bg-gray-50 dark:bg-slate-800 rounded shadow-sm border border-gray-100 dark:border-slate-800">
                                    <Users className="h-6 w-6 text-gray-400" />
                                </div>
                            </SectionCard>
                        </div>

                        {/* Search Hub */}
                        <SectionCard className="p-4">
                            <div className="relative group max-w-xl">
                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 group-focus-within:text-[#FF9900] transition-colors" />
                                <input
                                    type="text"
                                    placeholder="Entity name or transaction ID..."
                                    value={search}
                                    onChange={(e) => setSearch(e.target.value)}
                                    className={INPUT() + " pl-10 h-10"}
                                />
                            </div>
                        </SectionCard>

                        {/* Journal Table */}
                        <SectionCard>
                            <SectionHeader title="Receipt Log" icon={FileText} />
                            {loading ? (
                                <div className="py-20 flex flex-col items-center justify-center gap-3">
                                    <Loader2 className="h-8 w-8 text-[#FF9900] animate-spin" />
                                    <p className="text-[11px] font-bold text-gray-400 uppercase tracking-widest">Validating Registry...</p>
                                </div>
                            ) : filtered.length === 0 ? (
                                <div className="py-20 text-center">
                                    <div className="w-16 h-16 bg-gray-50 dark:bg-slate-800 rounded-full flex items-center justify-center mx-auto mb-4 border border-gray-100 dark:border-slate-700 shadow-inner">
                                        <ShoppingCart className="h-6 w-6 text-gray-300" />
                                    </div>
                                    <h3 className="text-gray-900 dark:text-white font-bold">No Customer Receipts Found</h3>
                                    <p className="text-xs text-gray-500 max-w-sm mx-auto mt-1">Refine your entity search or initiate a new inbound capital protocol.</p>
                                </div>
                            ) : (
                                <div className="overflow-x-auto">
                                    <table className="w-full text-left border-collapse">
                                        <thead>
                                            <tr className="bg-[#f6f6f6] dark:bg-slate-800/50 border-b border-[#ddd] dark:border-slate-800 text-[10px] font-bold text-gray-600 dark:text-gray-400 uppercase tracking-wider">
                                                <th className="px-6 py-3 w-32">Index / Date</th>
                                                <th className="px-6 py-3">Customer Entity</th>
                                                <th className="px-6 py-3">Classification</th>
                                                <th className="px-6 py-3">Protocol</th>
                                                <th className="px-6 py-3 text-right">Valuation</th>
                                                <th className="px-6 py-3 text-right">Actions</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-gray-100 dark:divide-slate-800">
                                            {filtered.map((payment) => (
                                                <tr key={payment.id} className="hover:bg-[#f6f6f6] dark:hover:bg-slate-800/30 transition-colors group">
                                                    <td className="px-6 py-4">
                                                        <div className="flex flex-col">
                                                            <span className="text-xs font-bold text-gray-900 dark:text-white">#{payment.id}</span>
                                                            <span className="text-[10px] text-gray-400 uppercase">{formatDate(payment.date)}</span>
                                                        </div>
                                                    </td>
                                                    <td className="px-6 py-4">
                                                        <div className="flex items-center gap-2">
                                                            <div className="w-6 h-6 rounded-full bg-[#131921] flex items-center justify-center text-[9px] font-bold text-[#FF9900] uppercase">
                                                                {payment.payer_payee[0]}
                                                            </div>
                                                            <span className="text-xs font-bold text-gray-800 dark:text-slate-200">{payment.payer_payee}</span>
                                                        </div>
                                                    </td>
                                                    <td className="px-6 py-4">
                                                        <span className="text-[10px] px-2 py-0.5 bg-gray-100 dark:bg-slate-800 text-gray-500 rounded-sm border border-gray-200 dark:border-slate-700 font-bold uppercase tracking-tighter">
                                                            {payment.category_name}
                                                        </span>
                                                    </td>
                                                    <td className="px-6 py-4">
                                                        <span className="text-[10px] font-bold text-gray-600 dark:text-gray-400 uppercase">{payment.method.replace('_', ' ')}</span>
                                                    </td>
                                                    <td className="px-6 py-4 text-right">
                                                        <span className="text-sm font-bold text-emerald-600 tracking-tight">+{formatCurrency(payment.amount)}</span>
                                                    </td>
                                                    <td className="px-6 py-4 text-right">
                                                        <div className="flex items-center justify-end gap-1">
                                                            <button className="p-1.5 text-blue-600 hover:bg-white dark:hover:bg-slate-800 border border-transparent hover:border-blue-200 rounded shadow-sm transition-all">
                                                                <Eye className="h-3.5 w-3.5" />
                                                            </button>
                                                            <button className="p-1.5 text-gray-600 hover:bg-white dark:hover:bg-slate-800 border border-transparent hover:border-gray-200 rounded shadow-sm transition-all">
                                                                <Printer className="h-3.5 w-3.5" />
                                                            </button>
                                                        </div>
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                        <tfoot>
                                            <tr>
                                                <td colSpan={6} className="px-6 py-8 text-center bg-gray-50/50 dark:bg-slate-900/50">
                                                    <p className="text-[10px] font-bold text-gray-400 uppercase tracking-[0.2em] italic">Electronic Ledger Termination</p>
                                                </td>
                                            </tr>
                                        </tfoot>
                                    </table>
                                </div>
                            )}
                        </SectionCard>
                    </>
                )}
            </div>

            {/* Notification Hub */}
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
                                        className={INPUT() + " pl-10 text-xl font-bold text-emerald-600 focus:border-emerald-500 focus:shadow-[0_0_3px_2px_rgba(16,185,129,0.3)]"}
                                    />
                                </div>
                            </div>
                            <div>
                                <label className={LABEL}>Customer Identity</label>
                                <div className="relative">
                                    <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
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

                        {/* Remittance डिटेल */}
                        <div className="space-y-6 lg:border-x lg:border-gray-100 lg:dark:border-slate-800 lg:px-8">
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
                <div className="px-8 py-5 bg-gray-50 dark:bg-slate-800 border-t border-[#ddd] dark:border-slate-800 flex items-center justify-between">
                    <button type="button" onClick={onClose} className={SECONDARY_BTN + " !px-8"}>Discard Receipt</button>
                    <button type="submit" disabled={loading} className={PRIMARY_BTN + " !px-10 uppercase tracking-widest border-b-2 border-b-[#a88734]"}>
                        {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                        {loading ? 'Processing...' : 'Authorize Receipt'}
                    </button>
                </div>
            </form>
        </SectionCard>
    );
}

