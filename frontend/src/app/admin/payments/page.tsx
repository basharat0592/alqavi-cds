"use client";

import { useState, useEffect } from 'react';
import { paymentService, paymentCategoryService, inventoryService } from '@/lib/api';
import { authService } from '@/lib/auth';
import { formatCurrency, formatDate, exportToCSV } from '@/lib/utils';
import toast from 'react-hot-toast';
import {
    DollarSign, Search, RefreshCw, Plus, ArrowUpRight, ArrowDownLeft,
    X, Loader2, CheckCircle2, LayoutGrid, AlertTriangle
} from 'lucide-react';
import { PageHeader, Card, Button, Badge, ui, useTableSelection, SelectAllTh, RowCheckboxTd, BulkBar } from '@/components/admin/ui';

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
   ADMIN DESIGN SYSTEM - PAYMENTS
   ───────────────────────────────────────────────────────────────────────────── */
const inputCls = ui.inputBase;

export default function PaymentsPage() {
    const [payments, setPayments] = useState<Payment[]>([]);
    const [stats, setStats] = useState({ total_inbound: 0, total_outbound: 0, total_expenses: 0, net_balance: 0 });
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');
    const [typeFilter, setTypeFilter] = useState('all');
    const [formOpen, setFormOpen] = useState(false);
    const [categories, setCategories] = useState<any[]>([]);
    const [warehouses, setWarehouses] = useState<any[]>([]);
    const [isSuperAdmin, setIsSuperAdmin] = useState(false);
    const [myWarehouses, setMyWarehouses] = useState<any[]>([]);
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

    useEffect(() => {
        loadData();
        inventoryService.getWarehouses().then(setWarehouses).catch(() => setWarehouses([]));
        setIsSuperAdmin(authService.isSuperAdmin());
        setMyWarehouses((authService.getUser() as any)?.warehouses || []);
    }, []);

    const filtered = (payments || []).filter(p => {
        const matchesSearch =
            (p.payer_payee || '').toLowerCase().includes(search.toLowerCase()) ||
            (p.reference_number || '').toLowerCase().includes(search.toLowerCase()) ||
            (p.description || '').toLowerCase().includes(search.toLowerCase());
        const matchesType = typeFilter === 'all' || p.payment_type === typeFilter;
        return matchesSearch && matchesType;
    });

    const sel = useTableSelection(filtered);

    const bulkDelete = async (ids: string[]) => {
        await Promise.allSettled(ids.map((id) => paymentService.delete(id)));
        showToast(`${ids.length} payment(s) deleted`);
        loadData();
    };

    return (
        <div className="pb-20 text-left">
            <PageHeader
                title="Payments"
                subtitle="Track money in and out of the business"
                breadcrumbs={[{ label: 'Console', href: '/admin/dashboard' }, { label: 'Payments' }]}
                actions={!formOpen ? (
                    <>
                        <Button variant="outline" onClick={loadData} disabled={loading}>
                            <RefreshCw size={14} className={loading ? 'animate-spin' : ''} /> Refresh
                        </Button>
                        <Button variant="primary" onClick={() => setFormOpen(true)}>
                            <Plus size={14} /> Add Payment
                        </Button>
                    </>
                ) : undefined}
            />
                {formOpen ? (
                    <CreateView
                        onClose={() => setFormOpen(false)}
                        onSuccess={() => { setFormOpen(false); loadData(); showToast('Payment saved'); }}
                        categories={categories}
                        warehouses={isSuperAdmin ? warehouses : myWarehouses}
                        isSuperAdmin={isSuperAdmin}
                    />
                ) : (
                    <>
                        {/* Stats Card */}
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
                            <StatCard label="Income" val={stats.total_inbound} icon={ArrowDownLeft} color="text-emerald-600" bg="#ecfdf5" bar="#10b981" />
                            <StatCard label="Expense" val={stats.total_outbound} icon={ArrowUpRight} color="text-rose-600" bg="#fef2f2" bar="#f43f5e" />
                            <StatCard label="Internal" val={stats.total_expenses} icon={LayoutGrid} color="text-indigo-600" bg="#eef2ff" bar="#6366f1" />
                            <StatCard label="Net Balance" val={stats.net_balance} icon={DollarSign} color="text-slate-900" bg="#f1f5f9" bar="#64748b" />
                        </div>

                        {/* Search & Tabs */}
                        <Card className="p-4 mb-6 flex flex-col sm:flex-row sm:items-center gap-4">
                            <div className="relative flex-1 w-full">
                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                                <input
                                    placeholder="Search by name, ID or info..."
                                    value={search}
                                    onChange={(e) => setSearch(e.target.value)}
                                    className={inputCls + " pl-10"}
                                />
                            </div>
                            <div className="flex bg-slate-100 p-1 rounded-lg gap-1 w-full sm:w-auto justify-center">
                                {['all', 'inbound', 'outbound'].map((type) => (
                                    <button
                                        key={type}
                                        onClick={() => setTypeFilter(type)}
                                        className={`flex-1 sm:flex-initial px-4 py-1.5 text-[11px] font-bold uppercase rounded-md transition-all whitespace-nowrap
                                            ${typeFilter === type ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                                    >
                                        {type === 'inbound' ? 'Income' : type === 'outbound' ? 'Expense' : 'All'}
                                    </button>
                                ))}
                            </div>
                        </Card>

                        {/* History Table */}
                        <Card className="overflow-hidden text-left mb-6">
                            <div className="overflow-x-auto">
                                <table className="w-full text-left border-collapse">
                                    <thead>
                                        <tr className="bg-slate-50/60 border-b border-slate-200/70 text-[11px] font-bold uppercase tracking-wider text-slate-400">
                                            <SelectAllTh sel={sel} />
                                            <th className="px-2.5 sm:px-6 py-3 whitespace-nowrap">Voucher #</th>
                                            <th className="px-2.5 sm:px-6 py-3 whitespace-nowrap">Payment Mode</th>
                                            <th className="px-2.5 sm:px-6 py-3 whitespace-nowrap">Person / Company</th>
                                            <th className="px-2.5 sm:px-6 py-3 whitespace-nowrap">Category</th>
                                            <th className="px-2.5 sm:px-6 py-3 text-right whitespace-nowrap">Amount</th>
                                            <th className="px-2.5 sm:px-6 py-3 text-right whitespace-nowrap">Actions</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-100">
                                        {loading ? (
                                            <tr><td colSpan={7} className="py-20 text-center"><Loader2 className="h-8 w-8 text-slate-300 animate-spin mx-auto" /></td></tr>
                                        ) : filtered.length === 0 ? (
                                            <tr><td colSpan={7} className="py-24 text-center text-[13px] text-slate-500">No payments found.</td></tr>
                                        ) : (
                                            filtered.map((payment) => (
                                                <tr key={payment.id} className="hover:bg-slate-50 transition-colors group text-[13px]">
                                                    <RowCheckboxTd sel={sel} id={payment.id} />
                                                    <td className="px-2.5 sm:px-6 py-3 sm:py-4 whitespace-nowrap">
                                                        <div className="font-bold text-slate-900">#{payment.id}</div>
                                                        <div className="text-[11px] text-slate-400 mt-1">{formatDate(payment.date)}</div>
                                                    </td>
                                                    <td className="px-2.5 sm:px-6 py-3 sm:py-4 text-slate-600 capitalize whitespace-nowrap">
                                                        {payment.method.replace('_', ' ')}
                                                    </td>
                                                    <td className="px-2.5 sm:px-6 py-3 sm:py-4 whitespace-nowrap">
                                                        <div className="font-bold text-slate-900">{payment.payer_payee || "Internal"}</div>
                                                        <div className="text-[11px] text-slate-400 mt-1 italic hidden sm:block">By: {payment.user_name}</div>
                                                    </td>
                                                    <td className="px-2.5 sm:px-6 py-3 sm:py-4 whitespace-nowrap">
                                                        <Badge tone="blue">{payment.category_name}</Badge>
                                                    </td>
                                                    <td className="px-2.5 sm:px-6 py-3 sm:py-4 text-right font-bold tabular-nums whitespace-nowrap">
                                                        <span className={payment.payment_type === 'inbound' ? 'text-emerald-600' : 'text-rose-600'}>
                                                            {payment.payment_type === 'inbound' ? '+' : '-'}{formatCurrency(payment.amount)}
                                                        </span>
                                                    </td>
                                                    <td className="px-2.5 sm:px-6 py-3 sm:py-4 text-right whitespace-nowrap">
                                                        <div className="flex items-center justify-end gap-2.5 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity">
                                                            <button className="text-[12px] font-bold text-slate-600 hover:underline">View</button>
                                                            <span className="text-slate-300">|</span>
                                                            <button className="text-[12px] font-bold text-[#c40000] hover:underline">Delete</button>
                                                        </div>
                                                    </td>
                                                </tr>
                                            ))
                                        )}
                                    </tbody>
                                </table>
                            </div>
                        </Card>

                        <BulkBar
                            sel={sel}
                            entity="payments"
                            onDelete={bulkDelete}
                            onExport={() => exportToCSV(
                                sel.selectedItems.map((p: any) => ({
                                    voucher: p.id,
                                    date: formatDate(p.date),
                                    type: p.payment_type === 'inbound' ? 'Income' : 'Expense',
                                    method: (p.method || '').replace('_', ' '),
                                    party: p.payer_payee || 'Internal',
                                    category: p.category_name || '',
                                    reference: p.reference_number || '',
                                    amount: p.amount ?? 0,
                                    recorded_by: p.user_name || '',
                                })),
                                'payments.csv',
                            )}
                        />
                    </>
                )}

            {/* Toast Hub */}
            {toast && (
                <div className="fixed bottom-6 right-6 z-[200] animate-in slide-in-from-right">
                    <div className={`flex items-center gap-3 px-6 py-3 rounded-xl shadow-2xl border-l-4 ${toast.type === 'success' ? 'bg-slate-900 border-indigo-500 text-white' : 'bg-rose-900 border-rose-500 text-white'}`}>
                        {toast.type === 'success' ? <CheckCircle2 className="h-5 w-5 text-indigo-400" /> : <AlertTriangle className="h-5 w-5 text-rose-400" />}
                        <p className="text-sm font-bold">{toast.msg}</p>
                        <button onClick={() => setToast(null)} className="ml-4 opacity-50 hover:opacity-100"><X size={16} /></button>
                    </div>
                </div>
            )}
        </div>
    );
}

function StatCard({ label, val, icon: Icon, color, bg, bar }: any) {
    return (
        <Card className="p-5 relative overflow-hidden group">
            <div className="absolute top-0 left-0 w-1 h-full" style={{ backgroundColor: bar }}></div>
            <div className="flex justify-between items-start">
                <div>
                    <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1">{label}</p>
                    <p className={`text-[20px] font-bold tabular-nums ${color}`}>Rs. {Math.abs(val).toLocaleString()}</p>
                </div>
                <div className="p-2.5 rounded-xl border border-slate-100" style={{ backgroundColor: bg }}>
                    <Icon size={18} className={color} />
                </div>
            </div>
        </Card>
    );
}

function CreateView({ onClose, onSuccess, categories, warehouses = [], isSuperAdmin = false }: any) {
    const [loading, setLoading] = useState(false);
    const today = new Date().toISOString().slice(0, 10);
    // Branch admins record against their own branch: auto-select when they manage
    // exactly one (and lock it). Super admins pick any branch.
    const lockBranch = !isSuperAdmin && warehouses.length === 1;
    const [formData, setFormData] = useState({
        amount: '',
        payment_type: 'inbound',
        method: 'cash',
        category: '',
        payer_payee: '',
        reference_number: '',
        description: '',
        date: today,
        warehouse_id: warehouses.length === 1 ? String(warehouses[0].id) : '',
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
        <Card className="overflow-hidden text-left mb-6">
            <div className="px-6 py-4 border-b border-slate-100 bg-slate-50/60 flex justify-between items-center">
                <h2 className="text-[16px] font-bold text-slate-900 tracking-tight">New Payment</h2>
                <button onClick={onClose} className="text-slate-400 hover:text-slate-900"><X size={20} /></button>
            </div>
            <form onSubmit={handleSubmit}>
                <div className="p-8 space-y-8">
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-10">
                        {/* Type & Amount */}
                        <div className="space-y-6">
                            <div>
                                <label className="block text-[13px] font-bold text-slate-900 mb-2">Payment Type</label>
                                <div className="grid grid-cols-2 gap-2 p-1 bg-slate-100 rounded-lg">
                                    {['inbound', 'outbound'].map(t => (
                                        <button
                                            key={t}
                                            type="button"
                                            onClick={() => set('payment_type', t)}
                                            className={`py-1.5 rounded-md text-[11px] font-bold uppercase transition-all
                                                ${formData.payment_type === t ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                                        >
                                            {t === 'inbound' ? 'Income' : 'Expense'}
                                        </button>
                                    ))}
                                </div>
                            </div>
                            <div>
                                <label className="block text-[13px] font-bold text-slate-900 mb-2">Amount (PKR)</label>
                                <div className="relative">
                                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 font-bold text-sm">Rs.</span>
                                    <input
                                        required type="number" step="0.01"
                                        value={formData.amount}
                                        onChange={e => set('amount', e.target.value)}
                                        placeholder="0.00"
                                        className={inputCls + " pl-10 text-lg font-bold"}
                                    />
                                </div>
                            </div>
                        </div>

                        {/* Details */}
                        <div className="space-y-6 lg:px-8 lg:border-x border-slate-100">
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-[13px] font-bold text-slate-900 mb-2">Mode</label>
                                    <select value={formData.method} onChange={e => set('method', e.target.value)} className={inputCls + " cursor-pointer"}>
                                        <option value="cash">Cash</option>
                                        <option value="bank_transfer">Bank Transfer</option>
                                        <option value="check">Check</option>
                                        <option value="mobile_wallet">Digital Wallet</option>
                                        <option value="other">Other</option>
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-[13px] font-bold text-slate-900 mb-2">Category</label>
                                    <select required value={formData.category} onChange={e => set('category', e.target.value)} className={inputCls + " cursor-pointer"}>
                                        <option value="">Select...</option>
                                        {categories.map((c: any) => <option key={c.id} value={c.id}>{c.name}</option>)}
                                    </select>
                                </div>
                            </div>
                            <div>
                                <label className="block text-[13px] font-bold text-slate-900 mb-2">Name (Person / Company)</label>
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
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-[13px] font-bold text-slate-900 mb-2">Date</label>
                                    <input
                                        type="date" value={formData.date}
                                        onChange={e => set('date', e.target.value)}
                                        className={inputCls + " cursor-pointer"}
                                    />
                                </div>
                                <div>
                                    <label className="block text-[13px] font-bold text-slate-900 mb-2">Branch</label>
                                    {lockBranch ? (
                                        <div className={inputCls + " flex items-center bg-slate-50 text-slate-700"}>
                                            {warehouses[0]?.name || 'Your branch'}
                                        </div>
                                    ) : (
                                        <select
                                            required={!isSuperAdmin}
                                            value={formData.warehouse_id}
                                            onChange={e => set('warehouse_id', e.target.value)}
                                            className={inputCls + " cursor-pointer"}
                                        >
                                            <option value="">{isSuperAdmin ? 'All / Unassigned' : 'Select branch...'}</option>
                                            {warehouses.map((w: any) => (
                                                <option key={w.id} value={w.id}>{w.name}</option>
                                            ))}
                                        </select>
                                    )}
                                </div>
                            </div>
                            <div>
                                <label className="block text-[13px] font-bold text-slate-900 mb-2">Reference #</label>
                                <input
                                    type="text" value={formData.reference_number}
                                    onChange={e => set('reference_number', e.target.value)}
                                    placeholder="Voucher or Invoice #"
                                    className={inputCls}
                                />
                            </div>
                            <div>
                                <label className="block text-[13px] font-bold text-slate-900 mb-2">Note (Internal)</label>
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
                <div className="px-8 py-5 bg-slate-50/60 border-t border-slate-100 flex items-center justify-end gap-3">
                    <Button type="button" variant="ghost" onClick={onClose} className="mr-4">Discard</Button>
                    <Button type="submit" variant="primary" disabled={loading} className="w-[160px]">
                        {loading && <RefreshCw className="h-3.5 w-3.5 animate-spin" />} Save Payment
                    </Button>
                </div>
            </form>
        </Card>
    );
}
