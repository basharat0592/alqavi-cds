'use client';

import { useState, useEffect } from 'react';
import {
    Users, Plus, Search, RefreshCw, Trash2, Edit2, ChevronRight,
    X, Save, Loader2, Building2, Mail, Phone, Package, TrendingUp,
    MapPin, Filter, CheckCircle2, AlertTriangle, Eye, ShoppingCart, Truck
} from 'lucide-react';
import { supplierService } from '@/services/supplier.service';
import Link from 'next/link';
import { cn } from '@/lib/utils';
import toast from 'react-hot-toast';

/* ─── Add / Edit Modal ─────────────────────────────────────────── */
function SupplierModal({
    isOpen, onClose, onSuccess, existing
}: { isOpen: boolean; onClose: () => void; onSuccess: () => void; existing?: any }) {
    const [form, setForm] = useState({ name: '', company: '', contact: '', email: '', address: '' });
    const [loading, setLoading] = useState(false);
    const isEdit = !!existing;

    useEffect(() => {
        if (existing) setForm({ name: existing.name || '', company: existing.company || '', contact: existing.contact || '', email: existing.email || '', address: existing.address || '' });
        else setForm({ name: '', company: '', contact: '', email: '', address: '' });
    }, [existing, isOpen]);

    if (!isOpen) return null;

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        try {
            if (isEdit) {
                await supplierService.update(existing.id, form);
                toast.success('Partner updated successfully');
            } else {
                await supplierService.create(form);
                toast.success('Partner onboarded successfully');
            }
            onSuccess();
            onClose();
        } catch {
            toast.error(isEdit ? 'Failed to update partner' : 'Failed to add partner');
        } finally {
            setLoading(false);
        }
    };

    const fields = [
        { key: 'name', label: 'Full Name', placeholder: 'e.g. John Doe', required: true, type: 'text' },
        { key: 'company', label: 'Company / Brand', placeholder: 'e.g. Al-Qavi Logistics', required: false, type: 'text' },
        { key: 'email', label: 'Email Address', placeholder: 'partner@mail.com', required: false, type: 'email' },
        { key: 'contact', label: 'Phone / Contact', placeholder: '+92 300 0000000', required: false, type: 'text' },
        { key: 'address', label: 'Address', placeholder: 'City, Province', required: false, type: 'text' },
    ];

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 animate-in fade-in duration-200">
            <div className="bg-white dark:bg-[#131921] w-full max-w-lg rounded-3xl border border-slate-200 dark:border-white/10 shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
                {/* Modal Header */}
                <div className="flex items-center justify-between px-8 pt-8 pb-6 border-b border-slate-100 dark:border-white/5">
                    <div>
                        <h2 className="text-xl font-black text-slate-900 dark:text-white uppercase tracking-tight">
                            {isEdit ? 'Edit' : 'Onboard'} <span className="text-[#F59E0B]">Partner</span>
                        </h2>
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-0.5">
                            {isEdit ? 'Update supplier record' : 'Initialize new supply chain node'}
                        </p>
                    </div>
                    <button onClick={onClose} className="p-2.5 bg-slate-100 dark:bg-white/5 hover:bg-slate-200 dark:hover:bg-white/10 rounded-2xl transition-colors">
                        <X className="h-4 w-4 text-slate-500" />
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="p-8 space-y-4">
                    {fields.map(f => (
                        <div key={f.key}>
                            <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5">{f.label}</label>
                            <input
                                required={f.required}
                                type={f.type}
                                className="w-full px-4 py-3 bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-2xl text-sm font-semibold text-slate-900 dark:text-white focus:ring-2 focus:ring-[#F59E0B]/30 focus:border-[#F59E0B] outline-none transition-all placeholder:text-slate-300 dark:placeholder:text-white/20"
                                placeholder={f.placeholder}
                                value={(form as any)[f.key]}
                                onChange={e => setForm({ ...form, [f.key]: e.target.value })}
                            />
                        </div>
                    ))}
                    <div className="flex gap-3 pt-2">
                        <button type="button" onClick={onClose} className="flex-1 py-3.5 bg-slate-100 dark:bg-white/5 text-slate-600 dark:text-white/50 rounded-2xl text-xs font-black uppercase tracking-widest hover:bg-slate-200 transition-all">
                            Cancel
                        </button>
                        <button type="submit" disabled={loading} className="flex-1 flex items-center justify-center gap-2 py-3.5 bg-[#F59E0B] text-white rounded-2xl text-xs font-black uppercase tracking-widest hover:bg-[#D97706] transition-all shadow-lg shadow-amber-500/20 disabled:opacity-50">
                            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                            {isEdit ? 'Save Changes' : 'Onboard Partner'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}

/* ─── Delete Confirm Modal ──────────────────────────────────────── */
function DeleteModal({ supplier, onClose, onConfirm, loading }: { supplier: any; onClose: () => void; onConfirm: () => void; loading: boolean }) {
    return (
        <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 animate-in fade-in duration-200">
            <div className="bg-white dark:bg-[#131921] w-full max-w-sm rounded-3xl border border-slate-200 dark:border-white/10 shadow-2xl p-8 animate-in zoom-in-95 duration-200">
                <div className="flex items-center gap-4 mb-6">
                    <div className="p-3 bg-red-50 dark:bg-red-500/10 rounded-2xl">
                        <AlertTriangle className="h-6 w-6 text-red-500" />
                    </div>
                    <div>
                        <h3 className="text-lg font-black text-slate-900 dark:text-white">Remove Supplier?</h3>
                        <p className="text-xs text-slate-500 mt-0.5">This action cannot be undone.</p>
                    </div>
                </div>
                <p className="text-sm text-slate-600 dark:text-white/60 mb-6 bg-slate-50 dark:bg-white/5 rounded-2xl p-4">
                    You are about to permanently remove <span className="font-black text-slate-900 dark:text-white">{supplier?.name}</span> from the B2B roster.
                </p>
                <div className="flex gap-3">
                    <button onClick={onClose} className="flex-1 py-3 bg-slate-100 dark:bg-white/5 text-slate-600 dark:text-white/50 rounded-2xl text-xs font-black uppercase tracking-widest hover:bg-slate-200 transition-all">Keep</button>
                    <button onClick={onConfirm} disabled={loading} className="flex-1 flex items-center justify-center gap-2 py-3 bg-red-500 text-white rounded-2xl text-xs font-black uppercase tracking-widest hover:bg-red-600 transition-all disabled:opacity-50">
                        {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
                        Remove
                    </button>
                </div>
            </div>
        </div>
    );
}

/* ─── Supplier Card ─────────────────────────────────────────────── */
function SupplierCard({ supplier, onEdit, onDelete }: { supplier: any; onEdit: () => void; onDelete: () => void }) {
    const initials = (supplier.name || 'S').slice(0, 2).toUpperCase();
    const hue = (supplier.name?.charCodeAt(0) || 70) % 360;

    return (
        <div className="group relative bg-white dark:bg-[#1a252f] rounded-3xl border border-slate-200 dark:border-white/5 hover:border-[#F59E0B]/50 hover:shadow-xl hover:shadow-[#F59E0B]/5 transition-all duration-300 overflow-hidden">
            {/* Top accent bar */}
            <div className="h-1 w-full bg-gradient-to-r from-[#F59E0B] to-amber-300 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />

            <div className="p-6">
                {/* Header Row */}
                <div className="flex items-start gap-4 mb-5">
                    {/* Avatar */}
                    <div
                        className="h-14 w-14 rounded-2xl flex items-center justify-center text-white text-xl font-black shrink-0 shadow-inner"
                        style={{ background: `hsl(${hue}, 65%, 50%)` }}
                    >
                        {initials}
                    </div>
                    <div className="flex-1 min-w-0">
                        <h3 className="text-base font-black text-slate-900 dark:text-white truncate">{supplier.name}</h3>
                        <p className="text-[11px] font-semibold text-slate-400 flex items-center gap-1.5 mt-0.5 truncate">
                            <Building2 className="h-3 w-3 shrink-0" />
                            {supplier.company || 'Independent Supplier'}
                        </p>
                    </div>
                    {/* Actions */}
                    <div className="flex gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button onClick={onEdit} className="p-2 bg-slate-50 dark:bg-white/5 hover:bg-blue-50 dark:hover:bg-blue-500/10 hover:text-blue-600 text-slate-400 rounded-xl transition-all">
                            <Edit2 className="h-3.5 w-3.5" />
                        </button>
                        <button onClick={onDelete} className="p-2 bg-slate-50 dark:bg-white/5 hover:bg-red-50 dark:hover:bg-red-500/10 hover:text-red-500 text-slate-400 rounded-xl transition-all">
                            <Trash2 className="h-3.5 w-3.5" />
                        </button>
                    </div>
                </div>

                {/* Contact Info */}
                <div className="space-y-2 mb-5">
                    <div className="flex items-center gap-2.5 text-slate-500 dark:text-slate-400">
                        <Mail className="h-3.5 w-3.5 shrink-0 text-slate-300 dark:text-white/20" />
                        <span className="text-xs font-medium truncate">{supplier.email || 'No email on file'}</span>
                    </div>
                    <div className="flex items-center gap-2.5 text-slate-500 dark:text-slate-400">
                        <Phone className="h-3.5 w-3.5 shrink-0 text-slate-300 dark:text-white/20" />
                        <span className="text-xs font-medium">{supplier.contact || 'No contact on file'}</span>
                    </div>
                    {supplier.address && (
                        <div className="flex items-center gap-2.5 text-slate-500 dark:text-slate-400">
                            <MapPin className="h-3.5 w-3.5 shrink-0 text-slate-300 dark:text-white/20" />
                            <span className="text-xs font-medium truncate">{supplier.address}</span>
                        </div>
                    )}
                </div>

                {/* Stats Row */}
                <div className="flex items-center gap-3 p-3 bg-slate-50 dark:bg-white/[0.03] rounded-2xl mb-4">
                    <div className="flex items-center gap-2 flex-1">
                        <Package className="h-4 w-4 text-[#F59E0B]" />
                        <div>
                            <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Products</p>
                            <p className="text-base font-black text-slate-900 dark:text-white leading-none">{supplier.product_count || 0}</p>
                        </div>
                    </div>
                    <div className="w-px h-8 bg-slate-200 dark:bg-white/10" />
                    <div className="flex items-center gap-2 flex-1">
                        <TrendingUp className="h-4 w-4 text-emerald-500" />
                        <div>
                            <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Status</p>
                            <p className="text-xs font-black text-emerald-500 leading-none">Active</p>
                        </div>
                    </div>
                </div>

                {/* Action Buttons */}
                <div className="flex gap-2">
                    <Link
                        href={`/admin/tracking?supplier=${supplier.id}&name=${encodeURIComponent(supplier.name)}`}
                        className="flex-1 flex items-center justify-center gap-1.5 py-2.5 bg-slate-100 dark:bg-white/5 hover:bg-slate-200 dark:hover:bg-white/10 text-slate-600 dark:text-white/60 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all"
                    >
                        <Eye className="h-3.5 w-3.5" /> Track POs
                    </Link>
                    <Link
                        href={`/admin/suppliers/${supplier.id}/order`}
                        className="flex-1 flex items-center justify-center gap-1.5 py-2.5 bg-[#F59E0B] hover:bg-[#D97706] text-white rounded-xl text-[10px] font-black uppercase tracking-widest transition-all shadow-md shadow-amber-500/20"
                    >
                        <ShoppingCart className="h-3.5 w-3.5" /> Order Stock
                    </Link>
                </div>
            </div>
        </div>
    );
}

/* ─── Main Page ────────────────────────────────────────────────── */
export default function AdminSuppliersPage() {
    const [suppliers, setSuppliers] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');
    const [filterHasProducts, setFilterHasProducts] = useState<'all' | 'with' | 'without'>('all');
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingSupplier, setEditingSupplier] = useState<any>(null);
    const [deletingSupplier, setDeletingSupplier] = useState<any>(null);
    const [deleteLoading, setDeleteLoading] = useState(false);

    const loadSuppliers = async () => {
        setLoading(true);
        try {
            const res = await supplierService.getAll();
            setSuppliers(res);
        } catch {
            toast.error('Failed to load suppliers');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => { loadSuppliers(); }, []);

    const handleDelete = async () => {
        if (!deletingSupplier) return;
        setDeleteLoading(true);
        try {
            await supplierService.delete(deletingSupplier.id);
            toast.success('Supplier removed');
            setDeletingSupplier(null);
            loadSuppliers();
        } catch {
            toast.error('Failed to remove supplier');
        } finally {
            setDeleteLoading(false);
        }
    };

    const filteredSuppliers = suppliers.filter(s => {
        const matchesSearch = (s.name || '').toLowerCase().includes(search.toLowerCase()) ||
            (s.company || '').toLowerCase().includes(search.toLowerCase()) ||
            (s.email || '').toLowerCase().includes(search.toLowerCase());
        const matchesFilter =
            filterHasProducts === 'all' ? true :
            filterHasProducts === 'with' ? (s.product_count || 0) > 0 :
            (s.product_count || 0) === 0;
        return matchesSearch && matchesFilter;
    });

    const totalProducts = suppliers.reduce((sum, s) => sum + (s.product_count || 0), 0);
    const activeSuppliers = suppliers.filter(s => (s.product_count || 0) > 0).length;

    const FILTERS = [
        { key: 'all', label: 'All Partners' },
        { key: 'with', label: 'With Products' },
        { key: 'without', label: 'No Products' },
    ] as const;

    return (
        <div className="space-y-8 animate-in fade-in duration-500">

            {/* ── Page Header ── */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6">
                <div>
                    <h1 className="text-3xl font-black text-slate-900 dark:text-white tracking-tight uppercase flex items-center gap-3">
                        <div className="p-2.5 bg-[#F59E0B]/10 rounded-2xl">
                            <Truck className="h-7 w-7 text-[#F59E0B]" />
                        </div>
                        B2B Supplier <span className="text-[#F59E0B]">Roster</span>
                    </h1>
                    <p className="text-sm text-slate-500 dark:text-slate-400 mt-2 font-medium">
                        Manage manufacturers, brands, and supply chain partners.
                    </p>
                </div>
                <div className="flex items-center gap-3">
                    <button
                        onClick={loadSuppliers}
                        className="p-3 bg-white dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-2xl text-slate-500 hover:text-[#F59E0B] hover:border-[#F59E0B]/30 transition-all shadow-sm"
                    >
                        <RefreshCw className={cn('h-5 w-5', loading && 'animate-spin')} />
                    </button>
                    <button
                        onClick={() => { setEditingSupplier(null); setIsModalOpen(true); }}
                        className="flex items-center gap-2.5 px-6 py-3.5 bg-[#131921] dark:bg-[#F59E0B] text-white dark:text-black rounded-2xl text-xs font-black uppercase tracking-widest hover:scale-105 transition-all shadow-xl"
                    >
                        <Plus className="h-4 w-4" /> Add Partner
                    </button>
                </div>
            </div>

            {/* ── Metric Cards ── */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
                {[
                    { label: 'Total Partners', value: suppliers.length, icon: Users, color: 'text-blue-600', bg: 'bg-blue-50 dark:bg-blue-500/10', border: 'border-blue-100 dark:border-blue-500/20' },
                    { label: 'Active Suppliers', value: activeSuppliers, icon: CheckCircle2, color: 'text-emerald-600', bg: 'bg-emerald-50 dark:bg-emerald-500/10', border: 'border-emerald-100 dark:border-emerald-500/20' },
                    { label: 'Total Products', value: totalProducts, icon: Package, color: 'text-[#F59E0B]', bg: 'bg-amber-50 dark:bg-amber-500/10', border: 'border-amber-100 dark:border-amber-500/20' },
                ].map((m, i) => (
                    <div key={i} className="bg-white dark:bg-[#1a252f] rounded-2xl border border-slate-200 dark:border-white/5 p-5 flex items-center justify-between shadow-sm">
                        <div>
                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">{m.label}</p>
                            <p className="text-2xl font-black text-slate-900 dark:text-white">{m.value}</p>
                        </div>
                        <div className={cn('p-3.5 rounded-2xl border', m.bg, m.border)}>
                            <m.icon className={cn('h-5 w-5', m.color)} />
                        </div>
                    </div>
                ))}
            </div>

            {/* ── Search + Filter Bar ── */}
            <div className="bg-[#131921] rounded-3xl p-4 flex flex-col md:flex-row gap-4 shadow-xl">
                <div className="relative flex-1">
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-500" />
                    <input
                        type="text"
                        placeholder="Search by name, company, or email..."
                        className="w-full pl-11 pr-4 py-3 bg-white/5 border border-white/5 rounded-2xl text-white text-sm font-medium outline-none focus:ring-2 focus:ring-[#F59E0B]/20 focus:border-[#F59E0B]/30 transition-all placeholder:text-zinc-600"
                        value={search}
                        onChange={e => setSearch(e.target.value)}
                    />
                </div>
                <div className="flex gap-2 items-center">
                    <Filter className="h-4 w-4 text-zinc-500 ml-1" />
                    {FILTERS.map(f => (
                        <button
                            key={f.key}
                            onClick={() => setFilterHasProducts(f.key)}
                            className={cn(
                                'px-4 py-3 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all whitespace-nowrap',
                                filterHasProducts === f.key
                                    ? 'bg-[#F59E0B] text-white shadow-lg shadow-amber-500/20'
                                    : 'bg-white/5 text-zinc-400 hover:bg-white/10 hover:text-white'
                            )}
                        >
                            {f.label}
                        </button>
                    ))}
                </div>
            </div>

            {/* ── Supplier Grid ── */}
            {loading ? (
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                    {Array(6).fill(0).map((_, i) => (
                        <div key={i} className="h-64 bg-slate-200 dark:bg-white/5 rounded-3xl animate-pulse" />
                    ))}
                </div>
            ) : filteredSuppliers.length === 0 ? (
                <div className="py-24 text-center">
                    <div className="w-20 h-20 bg-slate-100 dark:bg-white/5 rounded-3xl flex items-center justify-center mx-auto mb-6">
                        <Users className="h-10 w-10 text-slate-300 dark:text-white/10" />
                    </div>
                    <p className="text-lg font-black text-slate-400 uppercase tracking-wide">No suppliers found</p>
                    <p className="text-sm text-slate-400 mt-2">
                        {search ? `No results for "${search}"` : 'Add your first B2B partner to get started.'}
                    </p>
                </div>
            ) : (
                <>
                    <p className="text-xs font-black text-slate-400 uppercase tracking-widest -mb-2">
                        Showing {filteredSuppliers.length} of {suppliers.length} partners
                    </p>
                    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                        {filteredSuppliers.map(supplier => (
                            <SupplierCard
                                key={supplier.id}
                                supplier={supplier}
                                onEdit={() => { setEditingSupplier(supplier); setIsModalOpen(true); }}
                                onDelete={() => setDeletingSupplier(supplier)}
                            />
                        ))}
                    </div>
                </>
            )}

            {/* ── Modals ── */}
            <SupplierModal
                isOpen={isModalOpen}
                onClose={() => setIsModalOpen(false)}
                onSuccess={loadSuppliers}
                existing={editingSupplier}
            />
            {deletingSupplier && (
                <DeleteModal
                    supplier={deletingSupplier}
                    onClose={() => setDeletingSupplier(null)}
                    onConfirm={handleDelete}
                    loading={deleteLoading}
                />
            )}
        </div>
    );
}
