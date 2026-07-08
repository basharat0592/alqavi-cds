'use client';

import { useState, useEffect, useMemo } from 'react';
import { paymentService, paymentCategoryService } from '@/lib/api';
import { formatCurrency, formatDate, exportToExcel } from '@/lib/utils';
import toast from 'react-hot-toast';
import {
    Search, RefreshCw, Plus, X, Loader2, Trash2, Wallet,
    CalendarDays, ListChecks, AlertTriangle, Download,
} from 'lucide-react';
import { PageHeader, Card, Button, Badge, Modal, ui } from '@/components/admin/ui';

type Kind = 'inbound' | 'outbound';

interface Entry {
    id: number;
    amount: string | number;
    payment_type: Kind;
    method: string;
    category: number | null;
    category_name: string;
    reference_number: string;
    payer_payee: string;
    description: string;
    date: string;
    user_name: string;
    source: string;
    is_auto: boolean;
}

const SOURCE_LABELS: Record<string, string> = {
    sale: 'Sale',
    purchase: 'Purchase Payment',
    sale_return: 'Sale Return',
    purchase_return: 'Purchase Return',
    manual: 'Manual',
};

const SOURCE_TONE: Record<string, any> = {
    sale: 'green',
    purchase: 'amber',
    sale_return: 'red',
    purchase_return: 'blue',
    manual: 'indigo',
};

const CONFIG = {
    inbound: {
        title: 'Income',
        subtitle: 'All money coming into the business',
        accent: 'text-emerald-600',
        accentBg: '#ecfdf5',
        accentBar: '#10b981',
        sources: ['all', 'sale', 'purchase_return', 'manual'],
        addLabel: 'Add Income',
    },
    outbound: {
        title: 'Expense',
        subtitle: 'All money going out of the business',
        accent: 'text-rose-600',
        accentBg: '#fef2f2',
        accentBar: '#f43f5e',
        sources: ['all', 'purchase', 'sale_return', 'manual'],
        addLabel: 'Add Expense',
    },
} as const;

export default function LedgerView({ kind }: { kind: Kind }) {
    const cfg = CONFIG[kind];

    const [entries, setEntries] = useState<Entry[]>([]);
    const [categories, setCategories] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');
    const [sourceTab, setSourceTab] = useState('all');
    const [formOpen, setFormOpen] = useState(false);
    const [deleting, setDeleting] = useState<number | null>(null);
    const [confirmEntry, setConfirmEntry] = useState<Entry | null>(null);
    const [currentPage, setCurrentPage] = useState(1);
    const pageSize = 10;

    const load = async () => {
        setLoading(true);
        try {
            const [data, cats] = await Promise.all([
                paymentService.getAll({ payment_type: kind, no_pagination: 'true' }),
                paymentCategoryService.getAll(),
            ]);
            setEntries(Array.isArray(data) ? data : []);
            setCategories(cats);
        } catch {
            toast.error('Could not load data');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => { load(); }, [kind]);

    const filtered = useMemo(() => {
        const q = search.toLowerCase();
        return entries.filter((e) => {
            const matchesSource = sourceTab === 'all' || e.source === sourceTab;
            const matchesSearch =
                !q ||
                (e.payer_payee || '').toLowerCase().includes(q) ||
                (e.reference_number || '').toLowerCase().includes(q) ||
                (e.description || '').toLowerCase().includes(q);
            return matchesSource && matchesSearch;
        });
    }, [entries, search, sourceTab]);

    useEffect(() => { setCurrentPage(1); }, [search, sourceTab, kind]);
    const totalPages = Math.ceil(filtered.length / pageSize);
    const paginated = useMemo(
        () => filtered.slice((currentPage - 1) * pageSize, currentPage * pageSize),
        [filtered, currentPage],
    );

    const exportCsv = () => {
        if (!filtered.length) return toast.error('Nothing to export');
        exportToExcel(filtered.map((e) => ({
            Date: formatDate(e.date),
            Reference: e.reference_number || `#${e.id}`,
            Source: SOURCE_LABELS[e.source] || e.source,
            Name: e.payer_payee || 'Internal',
            Category: e.category_name || '',
            Note: e.description || '',
            Amount: Number(e.amount || 0),
        })), `${cfg.title.toLowerCase()}-ledger`, cfg.title);
    };

    const total = useMemo(
        () => filtered.reduce((s, e) => s + Number(e.amount || 0), 0),
        [filtered],
    );
    const thisMonth = useMemo(() => {
        const now = new Date();
        return entries
            .filter((e) => {
                const d = new Date(e.date);
                return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
            })
            .reduce((s, e) => s + Number(e.amount || 0), 0);
    }, [entries]);

    const doDelete = async () => {
        const entry = confirmEntry;
        if (!entry) return;
        setDeleting(entry.id);
        try {
            await paymentService.delete(entry.id);
            toast.success('Entry deleted');
            setConfirmEntry(null);
            load();
        } catch {
            toast.error('Could not delete entry');
        } finally {
            setDeleting(null);
        }
    };

    return (
        <div className="pb-20 text-left">
            <PageHeader
                title={cfg.title}
                subtitle={cfg.subtitle}
                breadcrumbs={[{ label: 'Console', href: '/admin/dashboard' }, { label: cfg.title }]}
                actions={!formOpen ? (
                    <>
                        <Button variant="outline" onClick={load} disabled={loading}>
                            <RefreshCw size={14} className={loading ? 'animate-spin' : ''} /> Refresh
                        </Button>
                        <Button variant="outline" onClick={exportCsv} disabled={loading || filtered.length === 0}>
                            <Download size={14} /> Export
                        </Button>
                        <Button variant="primary" onClick={() => setFormOpen(true)}>
                            <Plus size={14} /> {cfg.addLabel}
                        </Button>
                    </>
                ) : undefined}
            />

            {formOpen ? (
                <ManualEntryForm
                    kind={kind}
                    categories={categories}
                    onClose={() => setFormOpen(false)}
                    onSuccess={() => { setFormOpen(false); load(); toast.success(`${cfg.title} saved`); }}
                />
            ) : (
                <>
                    {/* Stat cards */}
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
                        <StatCard label={`Total ${cfg.title} (filtered)`} val={total} icon={Wallet}
                            color={cfg.accent} bg={cfg.accentBg} bar={cfg.accentBar} />
                        <StatCard label="This Month" val={thisMonth} icon={CalendarDays}
                            color={cfg.accent} bg={cfg.accentBg} bar={cfg.accentBar} />
                        <StatCard label="Entries" val={filtered.length} icon={ListChecks}
                            color="text-slate-900" bg="#f1f5f9" bar="#64748b" isCount />
                    </div>

                    {/* Search + source tabs */}
                    <Card className="p-4 mb-6 flex flex-col lg:flex-row lg:items-center gap-4">
                        <div className="relative flex-1 w-full">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                            <input
                                placeholder="Search by name, reference or note..."
                                value={search}
                                onChange={(e) => setSearch(e.target.value)}
                                className={ui.inputBase + ' pl-10'}
                            />
                        </div>
                        <div className="flex bg-slate-100 p-1 rounded-lg gap-1 overflow-x-auto no-scrollbar">
                            {cfg.sources.map((s) => (
                                <button
                                    key={s}
                                    onClick={() => setSourceTab(s)}
                                    className={`px-3.5 py-1.5 text-[11px] font-bold uppercase rounded-md transition-all whitespace-nowrap
                                        ${sourceTab === s ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                                >
                                    {s === 'all' ? 'All' : SOURCE_LABELS[s]}
                                </button>
                            ))}
                        </div>
                    </Card>

                    {/* Table */}
                    <Card className="overflow-hidden text-left">
                        <div className="overflow-x-auto">
                            <table className="w-full text-left border-collapse">
                                <thead>
                                    <tr className="bg-slate-50/60 border-b border-slate-200/70 text-[11px] font-bold uppercase tracking-wider text-slate-400">
                                        <th className="px-2.5 sm:px-6 py-3 whitespace-nowrap">Reference</th>
                                        <th className="px-2.5 sm:px-6 py-3 whitespace-nowrap">Source</th>
                                        <th className="px-2.5 sm:px-6 py-3 whitespace-nowrap">Person / Company</th>
                                        <th className="px-2.5 sm:px-6 py-3 whitespace-nowrap">Category</th>
                                        <th className="px-2.5 sm:px-6 py-3 text-right whitespace-nowrap">Amount</th>
                                        <th className="px-2.5 sm:px-6 py-3 text-right whitespace-nowrap">Actions</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100">
                                    {loading ? (
                                        <tr><td colSpan={6} className="py-20 text-center"><Loader2 className="h-8 w-8 text-slate-300 animate-spin mx-auto" /></td></tr>
                                    ) : filtered.length === 0 ? (
                                        <tr><td colSpan={6} className="py-24 text-center text-[13px] text-slate-500">No {cfg.title.toLowerCase()} entries found.</td></tr>
                                    ) : (
                                        paginated.map((e) => (
                                            <tr key={e.id} className="hover:bg-slate-50 transition-colors group text-[13px]">
                                                <td className="px-2.5 sm:px-6 py-3 sm:py-4 whitespace-nowrap">
                                                    <div className="font-bold text-slate-900">{e.reference_number || `#${e.id}`}</div>
                                                    <div className="text-[11px] text-slate-400 mt-1">{formatDate(e.date)}</div>
                                                </td>
                                                <td className="px-2.5 sm:px-6 py-3 sm:py-4 whitespace-nowrap">
                                                    <Badge tone={SOURCE_TONE[e.source] || 'neutral'}>{SOURCE_LABELS[e.source] || e.source}</Badge>
                                                </td>
                                                <td className="px-2.5 sm:px-6 py-3 sm:py-4 whitespace-nowrap">
                                                    <div className="font-bold text-slate-900">{e.payer_payee || 'Internal'}</div>
                                                    {e.description && (
                                                        <div className="text-[11px] text-slate-400 mt-1 italic max-w-xs truncate hidden sm:block">{e.description}</div>
                                                    )}
                                                </td>
                                                <td className="px-2.5 sm:px-6 py-3 sm:py-4 text-slate-600 whitespace-nowrap">
                                                    {e.category_name || '—'}
                                                </td>
                                                <td className={`px-2.5 sm:px-6 py-3 sm:py-4 text-right font-bold tabular-nums whitespace-nowrap ${cfg.accent}`}>
                                                    {kind === 'inbound' ? '+' : '-'}{formatCurrency(e.amount)}
                                                </td>
                                                <td className="px-2.5 sm:px-6 py-3 sm:py-4 text-right whitespace-nowrap">
                                                    <div className="inline-flex items-center gap-2">
                                                        {e.is_auto && <span className="text-[10px] text-slate-400 italic">Auto</span>}
                                                        <button
                                                            onClick={() => setConfirmEntry(e)}
                                                            disabled={deleting === e.id}
                                                            className="inline-flex items-center gap-1 text-[12px] font-bold text-[#c40000] hover:underline disabled:opacity-50"
                                                        >
                                                            {deleting === e.id ? <Loader2 size={12} className="animate-spin" /> : <Trash2 size={12} />} Delete
                                                        </button>
                                                    </div>
                                                </td>
                                            </tr>
                                        ))
                                    )}
                                </tbody>
                            </table>
                        </div>
                        {totalPages > 1 && (
                            <div className="px-4 sm:px-6 py-3 border-t border-slate-100 flex items-center justify-between text-[12px]">
                                <span className="text-slate-500">
                                    Showing {(currentPage - 1) * pageSize + 1}–{Math.min(currentPage * pageSize, filtered.length)} of {filtered.length}
                                </span>
                                <div className="flex items-center gap-2">
                                    <button onClick={() => setCurrentPage(p => Math.max(1, p - 1))} disabled={currentPage === 1}
                                        className="px-3 py-1.5 rounded-lg border border-slate-200 font-semibold text-slate-600 disabled:opacity-40 disabled:cursor-not-allowed hover:bg-slate-50">Prev</button>
                                    <span className="text-slate-500 font-semibold">Page {currentPage} / {totalPages}</span>
                                    <button onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))} disabled={currentPage === totalPages}
                                        className="px-3 py-1.5 rounded-lg border border-slate-200 font-semibold text-slate-600 disabled:opacity-40 disabled:cursor-not-allowed hover:bg-slate-50">Next</button>
                                </div>
                            </div>
                        )}
                    </Card>
                </>
            )}

            {/* Delete confirmation */}
            <Modal open={!!confirmEntry} onClose={() => setConfirmEntry(null)} size="sm">
                {confirmEntry && (
                    <div className="text-center py-2">
                        <div className="w-12 h-12 bg-rose-50 rounded-full flex items-center justify-center mx-auto mb-4 border border-rose-100">
                            <AlertTriangle size={24} className="text-rose-600" />
                        </div>
                        <h3 className="text-[17px] font-bold text-slate-900 mb-2">Delete this entry?</h3>
                        <p className="text-[13px] text-slate-600">
                            <span className="font-bold text-slate-900">{confirmEntry.payer_payee || confirmEntry.reference_number || 'Entry'}</span>
                            {' · '}{kind === 'inbound' ? '+' : '-'}{formatCurrency(confirmEntry.amount)}
                        </p>
                        {confirmEntry.is_auto && (
                            <p className="mt-3 text-[11.5px] text-amber-700 bg-amber-50/70 border border-amber-100 rounded-lg px-3 py-2 leading-snug">
                                This line was generated from a {SOURCE_LABELS[confirmEntry.source] || 'transaction'}.
                                Deleting it only removes this ledger line — the original transaction stays, and the
                                line can reappear if that transaction is edited later.
                            </p>
                        )}
                        <div className="mt-6 space-y-2">
                            <Button variant="danger" onClick={doDelete} disabled={deleting === confirmEntry.id} className="w-full">
                                {deleting === confirmEntry.id ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Delete'}
                            </Button>
                            <button
                                onClick={() => setConfirmEntry(null)}
                                disabled={deleting === confirmEntry.id}
                                className="w-full text-[13px] text-indigo-600 hover:text-indigo-700 hover:underline font-bold"
                            >
                                Cancel
                            </button>
                        </div>
                    </div>
                )}
            </Modal>
        </div>
    );
}

function StatCard({ label, val, icon: Icon, color, bg, bar, isCount = false }: any) {
    return (
        <Card className="p-5 relative overflow-hidden">
            <div className="absolute top-0 left-0 w-1 h-full" style={{ backgroundColor: bar }} />
            <div className="flex justify-between items-start">
                <div>
                    <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1">{label}</p>
                    <p className={`text-[20px] font-bold tabular-nums ${color}`}>
                        {isCount ? Number(val).toLocaleString() : `Rs. ${Math.abs(Number(val)).toLocaleString()}`}
                    </p>
                </div>
                <div className="p-2.5 rounded-xl border border-slate-100" style={{ backgroundColor: bg }}>
                    <Icon size={18} className={color} />
                </div>
            </div>
        </Card>
    );
}

function ManualEntryForm({ kind, categories, onClose, onSuccess }: {
    kind: Kind; categories: any[]; onClose: () => void; onSuccess: () => void;
}) {
    const cfg = CONFIG[kind];
    const [loading, setLoading] = useState(false);
    const [form, setForm] = useState({
        amount: '',
        method: 'cash',
        category: '',
        payer_payee: '',
        reference_number: '',
        description: '',
    });
    const set = (f: string, v: any) => setForm((p) => ({ ...p, [f]: v }));

    // Only show categories that fit this ledger side (or "both").
    const relevant = categories.filter((c: any) => c.type === 'both' || c.type === kind);

    const submit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        try {
            await paymentService.create({ ...form, payment_type: kind });
            onSuccess();
        } catch {
            toast.error('Failed to save');
        } finally {
            setLoading(false);
        }
    };

    return (
        <Card className="overflow-hidden text-left mb-6">
            <div className="px-6 py-4 border-b border-slate-100 bg-slate-50/60 flex justify-between items-center">
                <h2 className="text-[16px] font-bold text-slate-900 tracking-tight">New {cfg.title}</h2>
                <button onClick={onClose} className="text-slate-400 hover:text-slate-900"><X size={20} /></button>
            </div>
            <form onSubmit={submit}>
                <div className="p-8 grid grid-cols-1 lg:grid-cols-2 gap-x-10 gap-y-6">
                    <div>
                        <label className="block text-[13px] font-bold text-slate-900 mb-2">Amount (PKR)</label>
                        <div className="relative">
                            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 font-bold text-sm">Rs.</span>
                            <input required type="number" step="0.01" min="0" value={form.amount}
                                onChange={(e) => set('amount', e.target.value)} placeholder="0.00"
                                className={ui.inputBase + ' pl-10 text-lg font-bold'} />
                        </div>
                    </div>
                    <div>
                        <label className="block text-[13px] font-bold text-slate-900 mb-2">Method</label>
                        <select value={form.method} onChange={(e) => set('method', e.target.value)} className={ui.inputBase + ' cursor-pointer'}>
                            <option value="cash">Cash</option>
                            <option value="bank_transfer">Bank Transfer</option>
                            <option value="check">Check</option>
                            <option value="mobile_wallet">Digital Wallet</option>
                            <option value="other">Other</option>
                        </select>
                    </div>
                    <div>
                        <label className="block text-[13px] font-bold text-slate-900 mb-2">Category</label>
                        <select required value={form.category} onChange={(e) => set('category', e.target.value)} className={ui.inputBase + ' cursor-pointer'}>
                            <option value="">Select...</option>
                            {relevant.map((c: any) => <option key={c.id} value={c.id}>{c.name}</option>)}
                        </select>
                    </div>
                    <div>
                        <label className="block text-[13px] font-bold text-slate-900 mb-2">Name (Person / Company)</label>
                        <input type="text" value={form.payer_payee} onChange={(e) => set('payer_payee', e.target.value)}
                            placeholder="Who paid / was paid" className={ui.inputBase} />
                    </div>
                    <div>
                        <label className="block text-[13px] font-bold text-slate-900 mb-2">Reference #</label>
                        <input type="text" value={form.reference_number} onChange={(e) => set('reference_number', e.target.value)}
                            placeholder="Voucher or invoice #" className={ui.inputBase} />
                    </div>
                    <div>
                        <label className="block text-[13px] font-bold text-slate-900 mb-2">Note</label>
                        <input type="text" value={form.description} onChange={(e) => set('description', e.target.value)}
                            placeholder="Extra details" className={ui.inputBase} />
                    </div>
                </div>
                <div className="px-8 py-5 bg-slate-50/60 border-t border-slate-100 flex items-center justify-end gap-3">
                    <Button type="button" variant="ghost" onClick={onClose}>Discard</Button>
                    <Button type="submit" variant="primary" disabled={loading} className="w-[160px]">
                        {loading && <RefreshCw className="h-3.5 w-3.5 animate-spin" />} Save {cfg.title}
                    </Button>
                </div>
            </form>
        </Card>
    );
}
