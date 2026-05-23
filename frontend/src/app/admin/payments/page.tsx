"use client";

import { useState, useEffect } from 'react';
import { paymentService, paymentCategoryService } from '@/lib/api';
import { formatCurrency, formatDate } from '@/lib/utils';
import toast from 'react-hot-toast';
import {
    DollarSign, Search, RefreshCw, Plus, ArrowUpRight, ArrowDownLeft,
    Filter, Calendar, X, Loader2, CreditCard, Banknote, Wallet,
    CheckCircle2, Clock, Trash2, Printer, Download, Eye, LayoutGrid,
    ChevronDown, AlertTriangle, User, Save, FileText, Settings, ChevronRight
} from 'lucide-react';
import Link from 'next/link';

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

/* ─────────────────────────────────────────────────────────────────────────────
   PURE AMAZON RETAIL DESIGN SYSTEM - PAYMENTS
   ───────────────────────────────────────────────────────────────────────────── */
const Btn = ({ children, onClick, loading, variant = 'primary', className = '', type = 'button', disabled = false }: any) => {
    const styles = {
        primary: 'bg-gradient-to-b from-[#f7dfa5] to-[#f0c14b] border-[#a88734] hover:from-[#f5d78e] hover:to-[#eeb933] text-[#0f1111]',
        secondary: 'bg-gradient-to-b from-[#f7f8fa] to-[#e7e9ec] border-[#adb1b8] hover:from-[#eef1f3] hover:to-[#dce0e4] text-[#0f1111]',
    };
    return (
        <button type={type} onClick={onClick} disabled={loading || disabled}
            className={`h-[29px] px-4 rounded-[3px] text-[13px] font-medium border transition-all flex items-center justify-center gap-2 disabled:opacity-60 ${styles[variant as keyof typeof styles]} ${className}`}>
            {loading && <RefreshCw className="h-3 w-3 animate-spin" />}
            {children}
        </button>
    );
};

const inputCls = "w-full h-[35px] px-3 border border-[#888c8e] rounded-[4px] text-[14px] outline-none focus:border-[#e77600] focus:shadow-[0_0_3px_2px_rgba(228,121,17,0.5)] placeholder:text-[#aaa] bg-white transition-all";

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
        } catch (error) { } finally { setLoading(false); }
    };

    useEffect(() => { loadData(); }, []);

    const filtered = (payments || []).filter(p => {
        const matchesSearch =
            (p.payer_payee || '').toLowerCase().includes(search.toLowerCase()) ||
            (p.reference_number || '').toLowerCase().includes(search.toLowerCase()) ||
            (p.description || '').toLowerCase().includes(search.toLowerCase());
        const matchesType = typeFilter === 'all' || p.payment_type === typeFilter;
        return matchesSearch && matchesType;
    });

    return (
        <div className="bg-[#F8F9FA] min-h-screen pb-20 font-sans text-[#0f1111]">
            {/* Header */}
            <div className="bg-white border-b border-[#ddd] py-4 shadow-sm">
                <div className="max-w-[1400px] mx-auto px-6 text-left">
                    <div className="flex items-center gap-1 text-[12px] text-[#565959] mb-3">
                        <Link href="/admin/dashboard" className="hover:text-[#c45500] hover:underline">Dashboard</Link>
                        <ChevronRight size={10} />
                        <span className="text-[#c45500]">Payments</span>
                    </div>
                    <div className="flex items-center justify-between">
                        <div>
                            <h1 className="text-[22px] font-normal text-[#111]">Payments</h1>
                            <p className="text-[13px] text-[#565959] mt-0.5">Track money in and out of the business</p>
                        </div>
                        {!formOpen && (
                            <div className="flex gap-2">
                                <Btn variant="secondary" onClick={loadData} loading={loading}>
                                    <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
                                </Btn>
                                <Btn onClick={() => setFormOpen(true)}>
                                    <Plus size={14} /> Add Payment
                                </Btn>
                            </div>
                        )}
                    </div>
                </div>
            </div>

            <div className="max-w-[1400px] mx-auto px-6 mt-8 text-left">
                {formOpen ? (
                    <CreateView
                        onClose={() => setFormOpen(false)}
                        onSuccess={() => { setFormOpen(false); loadData(); showToast('Payment saved'); }}
                        categories={categories}
                    />
                ) : (
                    <>
                        {/* Stats Card */}
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
                            <StatCard label="Income" val={stats.total_inbound} icon={ArrowDownLeft} color="text-green-700" bg="#e7f4ed" />
                            <StatCard label="Expense" val={stats.total_outbound} icon={ArrowUpRight} color="text-red-700" bg="#fbeae9" />
                            <StatCard label="Internal" val={stats.total_expenses} icon={LayoutGrid} color="text-amber-700" bg="#fcf8e3" />
                            <StatCard label="Net Balance" val={stats.net_balance} icon={DollarSign} color="text-[#111]" bg="#f0f2f2" />
                        </div>

                        {/* Search & Tabs */}
                        <div className="bg-white border border-[#ddd] rounded-[4px] p-4 mb-6 shadow-sm flex flex-col md:flex-row items-center gap-4">
                            <div className="relative flex-1 w-full">
                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[#aaa]" />
                                <input
                                    placeholder="Search by name, ID or info..."
                                    value={search}
                                    onChange={(e) => setSearch(e.target.value)}
                                    className={inputCls + " pl-10 h-[38px]"}
                                />
                            </div>
                            <div className="flex bg-[#f3f3f3] p-1 rounded-[4px] border border-[#ddd] gap-1 shrink-0">
                                {['all', 'inbound', 'outbound'].map((type) => (
                                    <button
                                        key={type}
                                        onClick={() => setTypeFilter(type)}
                                        className={`px-4 py-1.5 text-[11px] font-bold uppercase rounded-[3px] transition-all
                                            ${typeFilter === type ? 'bg-white text-[#c45500] shadow-sm' : 'text-[#565959] hover:bg-[#eee]'}`}
                                    >
                                        {type === 'inbound' ? 'Income' : type === 'outbound' ? 'Expense' : 'All'}
                                    </button>
                                ))}
                            </div>
                        </div>

                        {/* History Table */}
                        <div className="bg-white border border-[#ddd] rounded-[4px] shadow-sm overflow-hidden text-left mb-6">
                            <table className="w-full text-left border-collapse">
                                <thead>
                                    <tr className="bg-[#f7f8fa] border-b border-[#ddd] text-[12px] font-bold text-[#111]">
                                        <th className="px-6 py-3">Voucher #</th>
                                        <th className="px-6 py-3">Payment Mode</th>
                                        <th className="px-6 py-3">Person / Company</th>
                                        <th className="px-6 py-3">Category</th>
                                        <th className="px-6 py-3 text-right">Amount</th>
                                        <th className="px-6 py-3 text-right">Actions</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-[#eee]">
                                    {loading ? (
                                        <tr><td colSpan={6} className="py-20 text-center"><Loader2 className="h-8 w-8 text-[#aaa] animate-spin mx-auto" /></td></tr>
                                    ) : filtered.length === 0 ? (
                                        <tr><td colSpan={6} className="py-24 text-center text-[13px] text-[#565959]">No payments found.</td></tr>
                                    ) : (
                                        filtered.map((payment) => (
                                            <tr key={payment.id} className="hover:bg-[#fcfdff] transition-colors group text-[13px]">
                                                <td className="px-6 py-4">
                                                    <div className="font-bold text-[#111]">#{payment.id}</div>
                                                    <div className="text-[11px] text-[#aaa] mt-1">{formatDate(payment.date)}</div>
                                                </td>
                                                <td className="px-6 py-4 text-[#565959] capitalize">
                                                    {payment.method.replace('_', ' ')}
                                                </td>
                                                <td className="px-6 py-4">
                                                    <div className="font-bold text-[#111]">{payment.payer_payee || "Internal"}</div>
                                                    <div className="text-[11px] text-[#aaa] mt-1 italic">By: {payment.user_name}</div>
                                                </td>
                                                <td className="px-6 py-4">
                                                    <span className="inline-block px-2 py-0.5 rounded-[2px] border border-blue-100 bg-blue-50 text-blue-700 text-[10px] font-bold uppercase">
                                                        {payment.category_name}
                                                    </span>
                                                </td>
                                                <td className="px-6 py-4 text-right">
                                                    <span className={`font-bold ${payment.payment_type === 'inbound' ? 'text-green-700' : 'text-red-700'}`}>
                                                        {payment.payment_type === 'inbound' ? '+' : '-'}{formatCurrency(payment.amount)}
                                                    </span>
                                                </td>
                                                <td className="px-6 py-4 text-right">
                                                    <div className="flex justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                                        <button className="p-1.5 border border-[#ddd] rounded bg-white hover:bg-[#f7f8fa] text-[#565959]"><Eye size={14} /></button>
                                                        <button className="p-1.5 border border-[#ddd] rounded bg-white hover:bg-red-50 text-red-600"><Trash2 size={14} /></button>
                                                    </div>
                                                </td>
                                            </tr>
                                        ))
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </>
                )}
            </div>

            {/* Toast Hub */}
            {toast && (
                <div className="fixed bottom-6 right-6 z-[200] animate-in slide-in-from-right">
                    <div className={`flex items-center gap-3 px-6 py-3 rounded-[4px] shadow-2xl border-l-[4px] ${toast.type === 'success' ? 'bg-[#232f3e] border-[#f0c14b] text-white' : 'bg-red-900 border-red-500 text-white'}`}>
                        {toast.type === 'success' ? <CheckCircle2 className="h-5 w-5 text-[#f0c14b]" /> : <AlertTriangle className="h-5 w-5 text-red-400" />}
                        <p className="text-sm font-bold">{toast.msg}</p>
                        <button onClick={() => setToast(null)} className="ml-4 opacity-50 hover:opacity-100"><X size={16} /></button>
                    </div>
                </div>
            )}
        </div>
    );
}

function StatCard({ label, val, icon: Icon, color, bg }: any) {
    return (
        <div className="bg-white border border-[#ddd] p-5 rounded-[4px] shadow-sm relative overflow-hidden group">
            <div className="absolute top-0 left-0 w-[4px] h-full" style={{ backgroundColor: color === 'text-green-700' ? '#27ae60' : color === 'text-red-700' ? '#c0392b' : '#34495e' }}></div>
            <div className="flex justify-between items-start">
                <div>
                    <p className="text-[11px] font-bold text-[#565959] uppercase mb-1">{label}</p>
                    <p className={`text-[20px] font-bold ${color}`}>Rs. {Math.abs(val).toLocaleString()}</p>
                </div>
                <div className="p-2.5 rounded-[4px] border border-[#eee]" style={{ backgroundColor: bg }}>
                    <Icon size={18} className={color} />
                </div>
            </div>
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
        } catch (error) { toast.error("Failed to save payment"); } finally { setLoading(false); }
    };

    return (
        <div className="bg-white border border-[#ddd] rounded-[4px] shadow-sm overflow-hidden text-left mb-6">
            <div className="px-6 py-4 border-b border-[#ddd] bg-[#f7f8fa] flex justify-between items-center">
                <h2 className="text-[16px] font-bold text-[#111]">New Payment</h2>
                <button onClick={onClose} className="text-[#aaa] hover:text-[#111]"><X size={20} /></button>
            </div>
            <form onSubmit={handleSubmit}>
                <div className="p-8 space-y-8">
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-10">
                        {/* Type & Amount */}
                        <div className="space-y-6">
                            <div>
                                <label className="block text-[13px] font-bold text-[#111] mb-2">Payment Type</label>
                                <div className="grid grid-cols-2 gap-2 p-1 bg-[#f3f3f3] rounded-[4px]">
                                    {['inbound', 'outbound'].map(t => (
                                        <button
                                            key={t}
                                            type="button"
                                            onClick={() => set('payment_type', t)}
                                            className={`py-1.5 rounded-[3px] text-[11px] font-bold uppercase transition-all
                                                ${formData.payment_type === t ? 'bg-white text-[#c45500] shadow-sm' : 'text-[#565959] hover:bg-[#eee]'}`}
                                        >
                                            {t === 'inbound' ? 'Income' : 'Expense'}
                                        </button>
                                    ))}
                                </div>
                            </div>
                            <div>
                                <label className="block text-[13px] font-bold text-[#111] mb-2">Amount (PKR)</label>
                                <div className="relative">
                                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[#aaa] font-bold text-sm">Rs.</span>
                                    <input
                                        required type="number" step="0.01"
                                        value={formData.amount}
                                        onChange={e => set('amount', e.target.value)}
                                        placeholder="0.00"
                                        className={inputCls + " pl-10 h-[38px] text-lg font-bold"}
                                    />
                                </div>
                            </div>
                        </div>

                        {/* Details */}
                        <div className="space-y-6 lg:px-8 lg:border-x border-[#eee]">
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-[13px] font-bold text-[#111] mb-2">Mode</label>
                                    <select value={formData.method} onChange={e => set('method', e.target.value)} className={inputCls + " cursor-pointer"}>
                                        <option value="cash">Cash</option>
                                        <option value="bank_transfer">Bank Transfer</option>
                                        <option value="check">Check</option>
                                        <option value="mobile_wallet">Digital Wallet</option>
                                        <option value="other">Other</option>
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-[13px] font-bold text-[#111] mb-2">Category</label>
                                    <select required value={formData.category} onChange={e => set('category', e.target.value)} className={inputCls + " cursor-pointer"}>
                                        <option value="">Select...</option>
                                        {categories.map((c: any) => <option key={c.id} value={c.id}>{c.name}</option>)}
                                    </select>
                                </div>
                            </div>
                            <div>
                                <label className="block text-[13px] font-bold text-[#111] mb-2">Name (Person / Company)</label>
                                <input
                                    type="text" value={formData.payer_payee}
                                    onChange={e => set('payer_payee', e.target.value)}
                                    placeholder="Enter entity name"
                                    className={inputCls}
                                />
                            </div>
                        </div>

                        {/* Reference & Note */}
                        <div className="space-y-6">
                            <div>
                                <label className="block text-[13px] font-bold text-[#111] mb-2">Reference #</label>
                                <input
                                    type="text" value={formData.reference_number}
                                    onChange={e => set('reference_number', e.target.value)}
                                    placeholder="Voucher or Invoice #"
                                    className={inputCls}
                                />
                            </div>
                            <div>
                                <label className="block text-[13px] font-bold text-[#111] mb-2">Note (Internal)</label>
                                <textarea
                                    rows={2} value={formData.description}
                                    onChange={e => set('description', e.target.value)}
                                    placeholder="Additional details..."
                                    className={inputCls + " h-[60px] resize-none py-2"}
                                />
                            </div>
                        </div>
                    </div>
                </div>
                <div className="px-8 py-5 bg-[#f7f8fa] border-t border-[#ddd] flex items-center justify-end gap-3">
                    <button type="button" onClick={onClose} className="text-[13px] font-bold text-[#565959] hover:underline mr-4">Discard</button>
                    <Btn type="submit" loading={loading} className="w-[160px] h-[35px]">Save Payment</Btn>
                </div>
            </form>
        </div>
    );
}
