"use client";

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import {
    Search, Plus, RefreshCw, Trash2, User, ChevronRight, ChevronLeft,
    Phone, Mail, MapPin, Pencil, Save, Eye, EyeOff, X, Building2,
    Activity, ShieldCheck, ExternalLink, MoreVertical, Loader2, CheckCircle2, Camera, Image
} from 'lucide-react';
import { getImageUrl, exportToCSV } from '@/lib/utils';
import { companyService } from '@/services/company.service';
import toast from 'react-hot-toast';
import PageLoader from '@/components/ui/PageLoader';
import { PageHeader, Card, Button, Badge, ui, useTableSelection, SelectAllTh, RowCheckboxTd, BulkBar } from '@/components/admin/ui';

/* ─────────────────────────────────────────────────────────────────────────────
   SUPPLIER LIST — ADMIN DESIGN SYSTEM
   ───────────────────────────────────────────────────────────────────────────── */
const Field = ({ label, required = false, children }: { label: string; required?: boolean; children: React.ReactNode }) => (
    <div className="w-full">
        <label className="block text-[13px] font-semibold text-slate-700 mb-1.5">{label}{required && <span className="text-rose-600 ml-0.5">*</span>}</label>
        {children}
    </div>
);

const inputCls = ui.inputBase;

export default function SuppliersPage() {
    const router = useRouter();
    const [view, setView] = useState<'list' | 'add' | 'edit'>('list');
    const [currentPage, setCurrentPage] = useState(1);
    const itemsPerPage = 10;
    const [suppliers, setSuppliers] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');
    const [saving, setSaving] = useState(false);
    const [deleteItem, setDeleteItem] = useState<any | null>(null);

    const [addForm, setAddForm] = useState({ firstName: '', lastName: '', email: '', password: '', confirmPassword: '', company: '', phone: '', address: '', is_active: true, avatar: null as File | null });
    const [showPw, setShowPw] = useState(false);
    const [showConfirmPw, setShowConfirmPw] = useState(false);

    const [editTarget, setEditTarget] = useState<any | null>(null);
    const [editForm, setEditForm] = useState({ name: '', email: '', phone: '', company: '', address: '', is_active: true, password: '', avatar: null as File | null });

    const [selectedForView, setSelectedForView] = useState<any | null>(null);

    const loadData = useCallback(async (silent = false) => {
        if (!silent) setLoading(true);
        try {
            const data = await companyService.getSuppliers();
            setSuppliers(data || []);
        } catch { toast.error('Connection failure'); } finally { setLoading(false); }
    }, []);

    useEffect(() => { loadData(); }, [loadData]);

    // Reset pagination on search
    useEffect(() => {
        setCurrentPage(1);
    }, [search]);

    // AUTO-SYNC (30s) — was 2s.
    useEffect(() => {
        if (view !== 'list') return;
        const interval = setInterval(() => {
            if (!loading && !saving) loadData(true);
        }, 30000);
        return () => clearInterval(interval);
    }, [view, loading, saving, loadData]);

    const handleAdd = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!addForm.firstName || !addForm.email || !addForm.password) return toast.error('Please fill required fields');
        if (addForm.password !== addForm.confirmPassword) return toast.error('Passwords do not match');
        setSaving(true);
        try {
            await companyService.createSupplier({
                name: `${addForm.firstName} ${addForm.lastName}`.trim(),
                company: addForm.company, phone: addForm.phone,
                email: addForm.email, password: addForm.password,
                address: addForm.address,
                is_active: addForm.is_active,
                avatar: addForm.avatar
            });
            toast.success('Supplier added');
            setView('list'); loadData();
            setAddForm({ firstName: '', lastName: '', email: '', password: '', confirmPassword: '', company: '', phone: '', address: '', is_active: true, avatar: null });
        } catch { toast.error('Check email or network'); } finally { setSaving(false); }
    };

    const openEdit = (s: any) => {
        setEditTarget(s);
        setEditForm({ name: s.name, email: s.email, phone: s.phone, company: s.company, address: s.address, is_active: !!s.is_active, password: '', avatar: null });
        setView('edit');
    };

    const handleEdit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!editTarget) return;
        setSaving(true);
        try {
            await companyService.updateSupplier(editTarget.id, editForm);
            toast.success('Supplier updated');
            setView('list'); loadData();
        } catch { toast.error('Write error'); } finally { setSaving(false); }
    };

    const confirmDelete = async () => {
        if (!deleteItem) return;
        try {
            await companyService.deleteSupplier(deleteItem.id);
            toast.success('Deleted'); loadData();
            setDeleteItem(null);
        } catch { toast.error('Check dependency before deleting'); }
    };

    const filtered = suppliers.filter(s => 
        (s.name || '').toLowerCase().includes(search.toLowerCase()) || 
        (s.company || '').toLowerCase().includes(search.toLowerCase())
    );

    const totalPages = Math.ceil(filtered.length / itemsPerPage);
    const paginatedItems = filtered.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

    const sel = useTableSelection(paginatedItems);

    const bulkDelete = async (ids: string[]) => {
        await Promise.allSettled(ids.map(id => companyService.deleteSupplier(id)));
        toast.success(`${ids.length} supplier(s) deleted`);
        loadData();
    };

    const bulkStatus = async (ids: string[], active: boolean) => {
        await Promise.allSettled(ids.map(id => companyService.updateSupplier(id, { is_active: active })));
        toast.success(`Marked ${ids.length} ${active ? 'active' : 'inactive'}`);
        loadData();
    };

    if (loading && suppliers.length === 0) return <PageLoader />;

    return (
        <div className="pb-12 text-left text-slate-800">
            <div className="max-w-[1200px] mx-auto">

                <PageHeader
                    title={view === 'list' ? 'Suppliers' : (view === 'add' ? 'New Supplier' : 'Edit Supplier')}
                    breadcrumbs={[{ label: 'Console', href: '/admin/dashboard' }, { label: 'Suppliers' }]}
                    actions={
                        view === 'list' ? (
                            <>
                                <Button variant="outline" onClick={() => loadData()} disabled={loading} className="whitespace-nowrap">
                                    <RefreshCw size={16} className={loading ? 'animate-spin' : ''} /> <span className="hidden sm:inline">Refresh</span>
                                </Button>
                                <Button onClick={() => router.push('/admin/company/suppliers/add')} className="whitespace-nowrap"><Plus size={16} /> Add Supplier</Button>
                            </>
                        ) : (
                            <Button variant="outline" onClick={() => setView('list')} className="whitespace-nowrap">
                                <ChevronLeft size={16} /> Back to List
                            </Button>
                        )
                    }
                />

                {/* ── Mobile Card List ── */}
                <div className="md:hidden space-y-3 mb-6">
                    {filtered.length === 0 ? (
                        <Card className="py-16 text-center">
                            <div className="opacity-20 mb-3"><User size={40} className="mx-auto text-slate-400" /></div>
                            <p className="text-[13px] text-slate-500 font-medium">No suppliers found.</p>
                        </Card>
                    ) : (
                        paginatedItems.map(s => (
                            <Card key={s.id} className="p-4 space-y-3 text-left">
                                {/* Row 1: Avatar + Name & Company + Status */}
                                <div className="flex items-start justify-between gap-2">
                                    <div className="flex items-center gap-3">
                                        <div className="w-10 h-10 rounded-xl overflow-hidden bg-slate-100 border border-slate-200 shrink-0">
                                            {s.avatar ? (
                                                <img src={getImageUrl(s.avatar)} className="w-full h-full object-cover" alt="" />
                                            ) : (
                                                <div className="w-full h-full flex items-center justify-center text-slate-400 font-bold bg-slate-50 uppercase text-[11px]">{s.name ? s.name[0] : '?'}</div>
                                            )}
                                        </div>
                                        <div>
                                            <h3 className="text-[14px] font-bold text-[#B4780B] hover:text-[#92600A] hover:underline cursor-pointer" onClick={() => openEdit(s)}>{s.name}</h3>
                                            <div className="text-[10px] text-slate-400 uppercase font-bold mt-0.5 tracking-tighter flex items-center gap-1">
                                                <Building2 size={11} className="text-slate-400" /> {s.company || 'Private Seller'}
                                            </div>
                                        </div>
                                    </div>
                                    <Badge tone={s.is_active ? 'green' : 'red'}>
                                        {s.is_active ? 'Active' : 'Hidden'}
                                    </Badge>
                                </div>

                                {/* Row 2: Contact Info */}
                                <div className="border-t border-slate-100 pt-2.5 space-y-1.5 text-[12px] text-slate-500">
                                    <div className="flex items-center gap-2">
                                        <Phone size={13} className="text-slate-400 shrink-0" />
                                        <span className="text-slate-700">{s.phone || 'No Phone'}</span>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <Mail size={13} className="text-slate-400 shrink-0" />
                                        <span className="text-slate-700 truncate">{s.email}</span>
                                    </div>
                                </div>

                                {/* Row 3: Address */}
                                <div className="flex items-start gap-2 text-[11px] text-slate-500 bg-slate-50 border border-slate-100 rounded-lg p-2">
                                    <MapPin size={13} className="text-slate-400 mt-0.5 shrink-0" />
                                    <span className="line-clamp-2">{s.address || 'Address not listed'}</span>
                                </div>

                                {/* Row 4: Controls */}
                                <div className="flex items-center justify-end gap-2.5 pt-2 border-t border-slate-100">
                                    <button onClick={() => setSelectedForView(s)} className="text-[12px] font-bold text-slate-600 hover:underline">View</button>
                                    <span className="text-slate-300">|</span>
                                    <button onClick={() => openEdit(s)} className="text-[12px] font-bold text-[#B4780B] hover:underline">Edit</button>
                                    <span className="text-slate-300">|</span>
                                    <button onClick={() => setDeleteItem(s)} className="text-[12px] font-bold text-[#c40000] hover:underline">Delete</button>
                                </div>
                            </Card>
                        ))
                    )}
                </div>

                {/* ── Desktop Table ── */}
                <Card className="hidden md:block overflow-hidden animate-in fade-in duration-700">
                    <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse">
                            <thead>
                                <tr className="bg-slate-50/60 border-b border-slate-200/70">
                                    <SelectAllTh sel={sel} />
                                    <th className="px-6 py-4 text-[11px] font-bold text-slate-400 uppercase tracking-wider">Supplier Detail</th>
                                    <th className="px-6 py-4 text-[11px] font-bold text-slate-400 uppercase tracking-wider">Phone & Email</th>
                                    <th className="px-6 py-4 text-[11px] font-bold text-slate-400 uppercase tracking-wider">Location</th>
                                    <th className="px-6 py-4 text-[11px] font-bold text-slate-400 uppercase tracking-wider text-center">Working</th>
                                    <th className="px-6 py-4 text-[11px] font-bold text-slate-400 uppercase tracking-wider text-right">Controls</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                                {filtered.length === 0 ? (
                                    <tr><td colSpan={6} className="py-24 text-center">
                                        <div className="opacity-20 mb-4"><User size={60} className="mx-auto text-slate-400" /></div>
                                        <p className="text-[14px] text-slate-500 font-medium">No suppliers found in registry.</p>
                                    </td></tr>
                                ) : (
                                    paginatedItems.map(s => (
                                        <tr key={s.id} className="hover:bg-slate-50 transition-colors group text-[13px]">
                                            <RowCheckboxTd sel={sel} id={s.id} />
                                            <td className="px-6 py-5">
                                                <div className="flex items-center gap-3">
                                                    <div className="w-10 h-10 rounded-xl overflow-hidden bg-slate-100 border border-slate-200 shrink-0">
                                                        {s.avatar ? (
                                                            <img src={getImageUrl(s.avatar)} className="w-full h-full object-cover" alt="" />
                                                        ) : (
                                                            <div className="w-full h-full flex items-center justify-center text-slate-400 font-bold bg-slate-50 uppercase text-[11px]">{s.name ? s.name[0] : '?'}</div>
                                                        )}
                                                    </div>
                                                    <div>
                                                        <div className="text-[14px] font-bold text-[#B4780B] group-hover:text-[#92600A] group-hover:underline cursor-pointer" onClick={() => openEdit(s)}>{s.name}</div>
                                                        <div className="text-[11px] text-slate-400 uppercase font-bold mt-0.5 tracking-tighter flex items-center gap-1.5">
                                                            <Building2 size={12} className="text-slate-400" /> {s.company || 'Private Seller'}
                                                        </div>
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="px-6 py-5">
                                                <div className="flex items-center gap-2 text-slate-700 font-medium">
                                                    <Phone size={13} className="text-slate-400" /> {s.phone || 'No Phone'}
                                                </div>
                                                <div className="flex items-center gap-2 text-slate-600 mt-1.5">
                                                    <Mail size={13} className="text-slate-400" /> {s.email}
                                                </div>
                                            </td>
                                            <td className="px-6 py-5 max-w-[250px]">
                                                <div className="flex items-start gap-2 text-slate-600 line-clamp-2">
                                                    <MapPin size={13} className="text-slate-400 mt-0.5 shrink-0" /> {s.address || 'Address not listed'}
                                                </div>
                                            </td>
                                            <td className="px-6 py-5 text-center">
                                                <Badge tone={s.is_active ? 'green' : 'red'}>
                                                    {s.is_active ? 'Active' : 'Hidden'}
                                                </Badge>
                                            </td>
                                            <td className="px-6 py-5 text-right">
                                                <div className="flex items-center justify-end gap-2.5">
                                                    <button onClick={() => setSelectedForView(s)} className="text-[12px] font-bold text-slate-600 hover:underline">View</button>
                                                    <span className="text-slate-300">|</span>
                                                    <button onClick={() => openEdit(s)} className="text-[12px] font-bold text-[#B4780B] hover:underline">Edit</button>
                                                    <span className="text-slate-300">|</span>
                                                    <button onClick={() => setDeleteItem(s)} className="text-[12px] font-bold text-[#c40000] hover:underline">Delete</button>
                                                </div>
                                            </td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>
                </Card>

                {/* ── Pagination Controls ── */}
                {filtered.length > 0 && (
                    <Card className="mt-4 px-4 py-4 sm:px-6 flex flex-col sm:flex-row items-center justify-between gap-4 animate-in fade-in duration-500">
                        <div className="text-[12px] sm:text-[13px] text-slate-600 text-center sm:text-left">
                            Showing <span className="font-bold text-slate-900 tabular-nums">{(currentPage - 1) * itemsPerPage + 1}</span> to <span className="font-bold text-slate-900 tabular-nums">{Math.min(currentPage * itemsPerPage, filtered.length)}</span> of <span className="font-bold text-slate-900 tabular-nums">{filtered.length}</span> suppliers
                        </div>
                        <div className="flex gap-2">
                            <Button
                                variant="outline"
                                size="sm"
                                onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                                disabled={currentPage === 1}
                            >
                                <ChevronLeft size={14} /> Previous
                            </Button>
                            <Button
                                variant="outline"
                                size="sm"
                                onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                                disabled={currentPage === totalPages}
                            >
                                Next <ChevronRight size={14} />
                            </Button>
                        </div>
                    </Card>
                )}
            </div>

            <BulkBar
                sel={sel}
                entity="suppliers"
                onDelete={bulkDelete}
                statusActions={[
                    { label: 'Mark Active', apply: (ids) => bulkStatus(ids, true) },
                    { label: 'Mark Inactive', apply: (ids) => bulkStatus(ids, false) },
                ]}
                onExport={() => exportToCSV(
                    sel.selectedItems.map((s: any) => ({
                        name: s.name || '',
                        company: s.company || '',
                        email: s.email || '',
                        phone: s.phone || '',
                        address: s.address || '',
                        status: s.is_active ? 'active' : 'inactive',
                    })),
                    'suppliers.csv',
                )}
            />

            {/* SUPPLIER MODAL (ADD/EDIT) */}
            {(view === 'add' || view === 'edit') && (
                <div className="fixed inset-0 z-[1000] flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm animate-in fade-in duration-300 overflow-y-auto">
                    <div className="bg-white rounded-2xl w-full max-w-2xl border border-slate-200 shadow-2xl animate-in zoom-in-95 duration-500 overflow-hidden my-auto">
                        {/* Header */}
                        <div className="px-6 py-5 border-b border-slate-100 flex items-center justify-between">
                            <div>
                                <h2 className="text-[17px] font-bold text-slate-900 tracking-tight flex items-center gap-3">
                                    <div className="w-10 h-10 bg-[#F59E0B]/10 text-[#B4780B] rounded-xl flex items-center justify-center">
                                        {view === 'add' ? <Plus size={22} /> : <Pencil size={22} />}
                                    </div>
                                    {view === 'add' ? 'Add New Supplier' : 'Update Supplier Detail'}
                                </h2>
                                <p className="text-[11px] text-slate-400 font-bold uppercase tracking-widest mt-1 ml-13">Fulfillment & Supply Management</p>
                            </div>
                            <button onClick={() => setView('list')} className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 flex items-center justify-center transition-colors">
                                <X size={20} />
                            </button>
                        </div>

                        <form onSubmit={view === 'add' ? handleAdd : handleEdit} className="p-8 space-y-8">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                {/* Left Side: Profile */}
                                <div className="space-y-6">
                                    {/* Image Selector */}
                                    <div className="flex flex-col items-center justify-center p-4 bg-white border-2 border-dashed border-slate-200 rounded-2xl hover:border-[#F59E0B] transition-all group relative overflow-hidden min-h-[140px]">
                                        {((view === 'add' && addForm.avatar) || (view === 'edit' && (editForm.avatar || editTarget?.avatar))) ? (
                                            <div className="relative w-24 h-24 rounded-xl overflow-hidden shadow-md">
                                                <img
                                                    src={view === 'add' ? URL.createObjectURL(addForm.avatar as File) : (editForm.avatar ? URL.createObjectURL(editForm.avatar as File) : getImageUrl(editTarget.avatar))}
                                                    className="w-full h-full object-cover"
                                                    alt="Preview"
                                                />
                                                <button
                                                    type="button"
                                                    onClick={() => view === 'add' ? setAddForm(f => ({ ...f, avatar: null })) : setEditForm(f => ({ ...f, avatar: null }))}
                                                    className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity text-white"
                                                >
                                                    <X size={20} />
                                                </button>
                                            </div>
                                        ) : (
                                            <label className="flex flex-col items-center cursor-pointer w-full">
                                                <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center text-slate-400 group-hover:bg-[#F59E0B]/10 group-hover:text-[#92600A] transition-all">
                                                    <Camera size={28} />
                                                </div>
                                                <span className="mt-2 text-[11px] font-black uppercase text-slate-400 tracking-widest group-hover:text-[#92600A]">Upload Photo</span>
                                                <input 
                                                    type="file" 
                                                    className="hidden" 
                                                    accept="image/*" 
                                                    onChange={(e) => {
                                                        const file = e.target.files?.[0] || null;
                                                        if (view === 'add') setAddForm(f => ({ ...f, avatar: file }));
                                                        else setEditForm(f => ({ ...f, avatar: file }));
                                                    }}
                                                />
                                            </label>
                                        )}
                                    </div>

                                    <div className="space-y-4">
                                        <h3 className="text-[12px] font-black uppercase text-slate-400 tracking-wider flex items-center gap-2">
                                            <User size={14} /> Identity Details
                                        </h3>
                                        {view === 'add' ? (
                                            <div className="grid grid-cols-2 gap-3">
                                                <Field label="First Name" required>
                                                    <input className={inputCls} value={addForm.firstName} onChange={(e) => setAddForm(f => ({ ...f, firstName: e.target.value }))} placeholder="e.g. Ali" />
                                                </Field>
                                                <Field label="Last Name">
                                                    <input className={inputCls} value={addForm.lastName} onChange={(e) => setAddForm(f => ({ ...f, lastName: e.target.value }))} placeholder="e.g. Raza" />
                                                </Field>
                                            </div>
                                        ) : (
                                            <Field label="Full Name" required>
                                                <input className={inputCls} value={editForm.name} onChange={(e) => setEditForm(f => ({ ...f, name: e.target.value }))} placeholder="Full Name" />
                                            </Field>
                                        )}
                                        <Field label="Company / Business Name">
                                            <input className={inputCls} value={view === 'add' ? addForm.company : editForm.company} onChange={(e) => view === 'add' ? setAddForm(f => ({ ...f, company: e.target.value })) : setEditForm(f => ({ ...f, company: e.target.value }))} placeholder="Distributor name..." />
                                        </Field>
                                        <Field label="Contact Number">
                                            <input className={inputCls} value={view === 'add' ? addForm.phone : editForm.phone} onChange={(e) => view === 'add' ? setAddForm(f => ({ ...f, phone: e.target.value })) : setEditForm(f => ({ ...f, phone: e.target.value }))} placeholder="03XXXXXXXXX" />
                                        </Field>
                                    </div>
                                </div>

                                {/* Right Side: Access */}
                                <div className="space-y-6">
                                    <div className="space-y-4">
                                        <h3 className="text-[12px] font-black uppercase text-slate-400 tracking-wider flex items-center gap-2">
                                            <ShieldCheck size={14} /> Login Credentials
                                        </h3>
                                        <Field label="Email Address" required>
                                            <input className={inputCls} type="email" value={view === 'add' ? addForm.email : editForm.email} onChange={(e) => view === 'add' ? setAddForm(f => ({ ...f, email: e.target.value })) : setEditForm(f => ({ ...f, email: e.target.value }))} placeholder="email@domain.com" />
                                        </Field>
                                        
                                        {view === 'add' ? (
                                            <div className="space-y-4">
                                                <Field label="Password" required>
                                                    <div className="relative">
                                                        <input className={inputCls} type={showPw ? 'text' : 'password'} value={addForm.password} onChange={(e) => setAddForm(f => ({ ...f, password: e.target.value }))} />
                                                        <button type="button" onClick={() => setShowPw(!showPw)} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 transition-colors hover:text-[#92600A]">{showPw ? <EyeOff size={14} /> : <Eye size={14} />}</button>
                                                    </div>
                                                </Field>
                                                <Field label="Confirm Password" required>
                                                    <div className="relative">
                                                        <input className={inputCls} type={showConfirmPw ? 'text' : 'password'} value={addForm.confirmPassword} onChange={(e) => setAddForm(f => ({ ...f, confirmPassword: e.target.value }))} />
                                                        <button type="button" onClick={() => setShowConfirmPw(!showConfirmPw)} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 transition-colors hover:text-[#92600A]">{showConfirmPw ? <EyeOff size={14} /> : <Eye size={14} />}</button>
                                                    </div>
                                                </Field>
                                            </div>
                                        ) : (
                                            <Field label="Change Password (Optional)">
                                                <div className="relative">
                                                    <input className={inputCls} type={showPw ? 'text' : 'password'} value={editForm.password} onChange={(e) => setEditForm(f => ({ ...f, password: e.target.value }))} placeholder="Leave blank to keep current" />
                                                    <button type="button" onClick={() => setShowPw(!showPw)} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 transition-colors hover:text-[#92600A]">{showPw ? <EyeOff size={14} /> : <Eye size={14} />}</button>
                                                </div>
                                            </Field>
                                        )}
                                    </div>
                                </div>
                            </div>

                            <Field label="Business Address">
                                <textarea className={`${inputCls} h-auto py-2`} rows={2} value={view === 'add' ? addForm.address : editForm.address} onChange={(e) => view === 'add' ? setAddForm(f => ({ ...f, address: e.target.value })) : setEditForm(f => ({ ...f, address: e.target.value }))} placeholder="Full address..." />
                            </Field>

                            <div className="flex items-center gap-6 pt-4 border-t border-slate-200">
                                <label className="flex items-center gap-3 cursor-pointer group">
                                    <div className="relative flex items-center">
                                        <input
                                            type="checkbox"
                                            className="peer h-5 w-5 cursor-pointer appearance-none rounded border border-slate-300 bg-white checked:border-[#F59E0B] checked:bg-[#F59E0B] transition-all"
                                            checked={view === 'add' ? addForm.is_active : editForm.is_active}
                                            onChange={(e) => view === 'add' ? setAddForm(f => ({ ...f, is_active: e.target.checked })) : setEditForm(f => ({ ...f, is_active: e.target.checked }))}
                                        />
                                        <span className="absolute text-white opacity-0 peer-checked:opacity-100 top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 pointer-events-none transition-opacity">
                                            <CheckCircle2 size={14} strokeWidth={4} />
                                        </span>
                                    </div>
                                    <span className="text-[13px] font-bold text-slate-700">Active in System</span>
                                </label>
                            </div>

                            <div className="flex gap-4 pt-4">
                                <Button size="lg" className="flex-1" onClick={view === 'add' ? handleAdd : handleEdit} disabled={saving}>
                                    {saving && <RefreshCw className="h-4 w-4 animate-spin" />}
                                    {saving ? 'Processing...' : (view === 'add' ? 'Register Supplier' : 'Save Changes')}
                                </Button>
                                <Button variant="outline" size="lg" className="flex-1" onClick={() => setView('list')}>
                                    Discard
                                </Button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Simple Delete Confirmation */}
            {deleteItem && (
                <div className="fixed inset-0 z-[1000] flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm animate-in fade-in duration-200">
                    <div className="bg-white rounded-2xl w-full max-w-sm border border-slate-200 shadow-2xl animate-in zoom-in-95 duration-300 overflow-hidden text-center">
                        <div className="p-8">
                            <div className="w-16 h-16 bg-rose-50 rounded-full flex items-center justify-center mx-auto mb-5 text-rose-600 border border-rose-100">
                                <Trash2 size={32} />
                            </div>
                            <h2 className="text-[18px] font-bold text-slate-900 mb-2 tracking-tight">Delete Supplier?</h2>
                            <p className="text-[13px] text-slate-600 leading-relaxed">Are you sure you want to delete <span className="font-bold text-slate-900">{deleteItem.name}</span>? This action cannot be undone.</p>
                        </div>
                        <div className="bg-slate-50/50 border-t border-slate-100 p-6 flex gap-3">
                            <Button variant="outline" onClick={() => setDeleteItem(null)} className="flex-1">Cancel</Button>
                            <Button variant="danger" onClick={confirmDelete} className="flex-1">Confirm</Button>
                        </div>
                    </div>
                </div>
            )}
            {/* SUPPLIER DETAIL MODAL (QUICK VIEW) */}
            {selectedForView && (
                <div className="fixed inset-0 z-[1000] flex items-center justify-center p-4 py-12 bg-slate-900/50 backdrop-blur-sm animate-in fade-in duration-300 overflow-y-auto">
                    <div className="bg-white rounded-2xl w-full max-w-4xl my-auto shadow-2xl animate-in zoom-in-95 duration-500 overflow-hidden border border-slate-200 max-h-none flex flex-col">
                        {/* Header */}
                        <div className="px-8 py-5 border-b border-slate-100 flex items-center justify-between shrink-0">
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 bg-slate-100 rounded-full flex items-center justify-center p-0.5 border border-slate-200 overflow-hidden shrink-0">
                                    {selectedForView.avatar ? (
                                        <img src={getImageUrl(selectedForView.avatar)} className="w-full h-full object-cover rounded-full" alt="" />
                                    ) : (
                                        <div className="w-full h-full flex items-center justify-center text-slate-500 font-bold text-xl uppercase bg-slate-100 rounded-full">{selectedForView.name?.[0]}</div>
                                    )}
                                </div>
                                <div className="min-w-0">
                                    <div className="flex items-center gap-2">
                                        <h2 className="text-slate-900 text-[18px] font-bold tracking-tight leading-none truncate">{selectedForView.name}</h2>
                                        <Badge tone="indigo">Vendor</Badge>
                                    </div>
                                    <p className="text-slate-400 text-[11px] font-medium mt-1">Supplier Directory Registry • Management Console</p>
                                </div>
                            </div>
                            <button onClick={() => setSelectedForView(null)} className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors"><X size={20} /></button>
                        </div>

                        <div className="flex divide-x divide-slate-100">
                            {/* Identity Column */}
                            <div className="w-[320px] p-8 space-y-6">
                                <div className="space-y-4">
                                    <div className="aspect-square w-full bg-slate-50 rounded-xl border border-slate-200 flex items-center justify-center overflow-hidden group">
                                        {selectedForView.avatar ? (
                                            <img src={getImageUrl(selectedForView.avatar)} className="w-full h-full object-cover transition-transform group-hover:scale-105 duration-700" alt="" />
                                        ) : (
                                            <Building2 size={64} className="text-slate-300" />
                                        )}
                                    </div>
                                    <div>
                                        <h3 className="text-[24px] font-bold text-slate-900 tracking-tight leading-tight mb-1">{selectedForView.name}</h3>
                                        <p className="text-[14px] text-[#B4780B] hover:text-[#92600A] hover:underline cursor-pointer font-bold">{selectedForView.company || 'Private Distribution Partner'}</p>
                                    </div>
                                    <div className="flex items-center gap-2 pt-2">
                                        <Badge tone={selectedForView.is_active ? 'green' : 'red'}>
                                            {selectedForView.is_active ? 'Active Account' : 'Suspended'}
                                        </Badge>
                                        <span className="text-[11px] text-slate-500 font-bold border-l pl-2 border-slate-200">Verified Vendor</span>
                                    </div>
                                </div>

                                <div className="pt-6 border-t border-slate-100">
                                    <Button onClick={() => { setSelectedForView(null); openEdit(selectedForView); }} className="w-full">
                                        <Pencil size={14} /> Update Partner Profile
                                    </Button>
                                </div>
                            </div>

                            {/* Details Grid Column */}
                            <div className="flex-1 p-10 bg-white">
                                <div className="grid grid-cols-1 gap-10">
                                    {/* Contact Section */}
                                    <div className="space-y-4">
                                        <h4 className="text-[13px] font-bold text-slate-900 uppercase tracking-wider border-b border-slate-100 pb-2">Primary Contact Information</h4>
                                        <div className="grid grid-cols-2 gap-8">
                                            <div className="space-y-1">
                                                <p className="text-[12px] font-bold text-slate-400 uppercase tracking-wider">Email Address</p>
                                                <p className="text-[14px] text-[#B4780B] hover:text-[#92600A] hover:underline cursor-pointer truncate font-bold">{selectedForView.email}</p>
                                            </div>
                                            <div className="space-y-1">
                                                <p className="text-[12px] font-bold text-slate-400 uppercase tracking-wider">Mobile Connection</p>
                                                <p className="text-[14px] text-slate-900 font-bold">{selectedForView.phone || 'Not Registered'}</p>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Logistics Section */}
                                    <div className="space-y-4">
                                        <h4 className="text-[13px] font-bold text-slate-900 uppercase tracking-wider border-b border-slate-100 pb-2">Business Logistics & Address</h4>
                                        <div className="flex gap-4 p-5 bg-slate-50 border border-slate-200 rounded-xl relative overflow-hidden group">
                                            <div className="absolute top-0 left-0 w-1 h-full bg-[#F59E0B]/25 group-hover:bg-[#B4780B] transition-colors" />
                                            <MapPin size={24} className="text-slate-400 shrink-0 mt-0.5" />
                                            <div className="space-y-1">
                                                <p className="text-[14px] text-slate-900 leading-relaxed font-bold">
                                                    {selectedForView.address || 'No physical headquarters address provided for this entity.'}
                                                </p>
                                                <p className="text-[10px] text-slate-400 font-bold uppercase tracking-[0.2em]">Global Distribution Point</p>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Administrative Stats */}
                                    <div className="space-y-4">
                                        <h4 className="text-[13px] font-bold text-slate-900 uppercase tracking-wider border-b border-slate-100 pb-2">Administrative Registry Details</h4>
                                        <div className="grid grid-cols-3 gap-6">
                                            <div className="bg-white p-4 border border-slate-200/70 rounded-xl hover:border-slate-300 transition-colors">
                                                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Partner Since</p>
                                                <p className="text-[14px] font-bold text-slate-900">{new Date(selectedForView.created_at || Date.now()).toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}</p>
                                            </div>
                                            <div className="bg-white p-4 border border-slate-200/70 rounded-xl hover:border-slate-300 transition-colors">
                                                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Registry ID</p>
                                                <p className="text-[14px] font-bold text-slate-900 truncate">#VEN-{selectedForView.id?.toString().slice(0, 8).toUpperCase()}</p>
                                            </div>
                                            <div className="bg-white p-4 border border-slate-200/70 rounded-xl hover:border-slate-300 transition-colors">
                                                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Account Health</p>
                                                <div className="flex items-center gap-1.5 text-[14px] font-bold text-emerald-600 uppercase tracking-tighter">
                                                    <CheckCircle2 size={16} /> Excellent
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                <div className="mt-12 pt-8 border-t border-slate-100 flex justify-end">
                                    <Button variant="outline" onClick={() => setSelectedForView(null)} className="px-12">
                                        Close Details
                                    </Button>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
