"use client";

import { useState, useEffect, useCallback } from 'react';
import { 
    Search, Plus, RefreshCw, Trash2, User, ChevronRight, ChevronLeft, 
    Phone, Mail, MapPin, Pencil, Save, Eye, EyeOff, X, Building2, 
    Activity, ShieldCheck, ExternalLink, MoreVertical, Loader2, CheckCircle2, Camera, Image
} from 'lucide-react';
import { getImageUrl } from '@/lib/utils';
import { companyService } from '@/services/company.service';
import toast from 'react-hot-toast';
import Link from 'next/link';
import PageLoader from '@/components/ui/PageLoader';

/* ─────────────────────────────────────────────────────────────────────────────
   PURE AMAZON RETAIL DESIGN SYSTEM - SUPPLIER LIST
   ───────────────────────────────────────────────────────────────────────────── */
const Btn = ({ children, onClick, loading, variant = 'primary', className = '', type = 'button', disabled = false }: any) => {
    const styles = {
        primary: 'bg-gradient-to-b from-[#f7dfa5] to-[#f0c14b] border-[#a88734] hover:from-[#f5d78e] hover:to-[#eeb933] text-[#0f1111] shadow-sm',
        secondary: 'bg-gradient-to-b from-[#f7f8fa] to-[#e7e9ec] border-[#adb1b8] hover:from-[#eef1f3] hover:to-[#dce0e4] text-[#0f1111] shadow-sm',
    };
    return (
        <button type={type} onClick={onClick} disabled={loading || disabled}
            className={`h-[29px] px-4 rounded-[3px] text-[13px] font-medium border transition-all flex items-center justify-center gap-2 disabled:opacity-60 active:scale-[0.98] ${styles[variant as keyof typeof styles]} ${className}`}>
            {children}
            {loading && <RefreshCw className="h-3 w-3 animate-spin" />}
        </button>
    );
};

const Field = ({ label, required = false, children }: { label: string; required?: boolean; children: React.ReactNode }) => (
    <div className="w-full">
        <label className="block text-[13px] font-bold text-[#0f1111] mb-1">{label}{required && <span className="text-red-600 ml-0.5">*</span>}</label>
        {children}
    </div>
);

const inputCls = "w-full h-[35px] px-3 border border-[#888c8e] rounded-[3px] text-[13px] outline-none focus:border-[#e77600] focus:shadow-[0_0_3px_2px_rgba(228,121,17,0.5)] placeholder:text-[#aaa] bg-white transition-all font-medium";

export default function SuppliersPage() {
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

    // AUTO-SYNC (2s)
    useEffect(() => {
        if (view !== 'list') return;
        const interval = setInterval(() => {
            if (!loading && !saving) loadData(true);
        }, 2000);
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

    if (loading && suppliers.length === 0) return <PageLoader />;

    return (
        <div className="bg-[#F8F9FA] min-h-screen pb-20 font-sans text-[#0f1111]">
            <div className="max-w-[1440px] mx-auto px-6 pt-5 text-left">
                
                {/* ── Breadcrumb ── */}
                <div className="flex items-center gap-1 text-[12px] text-[#565959] mb-2">
                    <Link href="/admin/dashboard" className="hover:text-[#c45500] hover:underline">Dashboard</Link>
                    <ChevronRight size={10} />
                    <span className="text-[#c45500] font-bold">Supplier List</span>
                </div>

                <div className="flex items-center justify-between mb-4">
                    <h1 className="text-[22px] font-normal">
                        {view === 'list' ? 'Supplier List' : (view === 'add' ? 'New Supplier' : 'Edit Supplier')}
                    </h1>
                    {view === 'list' ? (
                        <div className="flex gap-2">
                             <Btn variant="secondary" onClick={loadData} loading={loading}>
                                <RefreshCw size={14} className={loading ? 'animate-spin' : ''} /> Refresh
                            </Btn>
                            <Btn onClick={() => setView('add')}><Plus size={14} /> Add Supplier</Btn>
                        </div>
                    ) : (
                        <button onClick={() => setView('list')} className="text-[13px] text-[#007185] hover:text-[#c45500] hover:underline flex items-center gap-1 font-bold">
                            <ChevronLeft size={14} /> Back to List
                        </button>
                    )}
                </div>
                <div className="border-b border-[#ddd] mb-6" />

                {/* List Table */}
                <div className="bg-white border border-[#ddd] rounded-[4px] shadow-sm overflow-hidden animate-in fade-in duration-700">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="bg-[#f7f8fa] border-b border-[#ddd] text-[11px] font-bold text-[#565959] uppercase tracking-wider">
                                <th className="px-6 py-3">Supplier Detail</th>
                                <th className="px-6 py-3">Phone & Email</th>
                                <th className="px-6 py-3">Location</th>
                                <th className="px-6 py-3 text-center">Working</th>
                                <th className="px-6 py-3 text-right">Controls</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-[#eee]">
                            {filtered.length === 0 ? (
                                <tr><td colSpan={5} className="py-24 text-center">
                                    <div className="opacity-10 mb-4"><User size={60} className="mx-auto" /></div>
                                    <p className="text-[14px] text-[#565959] font-medium">No suppliers found in registry.</p>
                                </td></tr>
                            ) : (
                                paginatedItems.map(s => (
                                    <tr key={s.id} className="hover:bg-[#fcfdff] transition-colors group text-[13px]">
                                        <td className="px-6 py-4">
                                            <div className="flex items-center gap-3">
                                                <div className="w-10 h-10 rounded-lg overflow-hidden bg-slate-100 border border-slate-200 shrink-0 shadow-sm">
                                                    {s.avatar ? (
                                                        <img src={getImageUrl(s.avatar)} className="w-full h-full object-cover" alt="" />
                                                    ) : (
                                                        <div className="w-full h-full flex items-center justify-center text-slate-400 font-bold bg-slate-50 uppercase text-[11px]">{s.name ? s.name[0] : '?'}</div>
                                                    )}
                                                </div>
                                                <div>
                                                    <div className="text-[14px] font-bold text-[#007185] group-hover:underline cursor-pointer" onClick={() => openEdit(s)}>{s.name}</div>
                                                    <div className="text-[11px] text-[#565959] uppercase font-bold mt-0.5 tracking-tighter flex items-center gap-1.5">
                                                        <Building2 size={12} className="text-[#adb1b8]" /> {s.company || 'Private Seller'}
                                                    </div>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4">
                                                <Phone size={13} className="text-[#adb1b8]" /> {s.phone || 'No Phone'}
                                            <div className="flex items-center gap-2 text-[#565959] mt-1.5">
                                                <Mail size={13} className="text-[#adb1b8]" /> {s.email}
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 max-w-[250px]">
                                            <div className="flex items-start gap-2 text-[#565959] line-clamp-2 italic">
                                                <MapPin size={13} className="text-[#adb1b8] mt-0.5 shrink-0" /> {s.address || 'Address not listed'}
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 text-center">
                                            <span className={`px-2 py-0.5 rounded-[2px] text-[10px] font-bold uppercase border ${s.is_active ? 'bg-green-50 text-green-700 border-green-200' : 'bg-red-50 text-red-700 border-red-200'}`}>
                                                {s.is_active ? 'Active' : 'Hidden'}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 text-right">
                                            <div className="flex justify-end gap-2">
                                                <button onClick={() => setSelectedForView(s)} className="p-1.5 border border-[#ddd] rounded bg-white hover:bg-slate-50 text-[#007185] shadow-sm transition-all" title="Quick View"><Eye size={14} /></button>
                                                <button onClick={() => openEdit(s)} className="p-1.5 border border-[#ddd] rounded bg-white hover:bg-[#f7f8fa] text-[#565959] shadow-sm transition-all" title="Edit Profile"><Pencil size={14} /></button>
                                                <button onClick={() => setDeleteItem(s)} className="p-1.5 border border-[#ddd] rounded bg-white hover:bg-red-50 text-red-600 shadow-sm transition-all" title="Delete Supplier"><Trash2 size={14} /></button>
                                            </div>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                        {filtered.length > 0 && (
                            <tfoot className="bg-[#f7f8fa] border-t border-[#ddd]">
                                <tr>
                                    <td colSpan={5} className="px-6 py-3">
                                        <div className="flex items-center justify-between">
                                            <div className="text-[13px] text-[#565959]">
                                                Showing <span className="font-bold text-[#111]">{(currentPage - 1) * itemsPerPage + 1}</span> to <span className="font-bold text-[#111]">{Math.min(currentPage * itemsPerPage, filtered.length)}</span> of <span className="font-bold text-[#111]">{filtered.length}</span> suppliers
                                            </div>
                                            <div className="flex gap-2">
                                                <button 
                                                    onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                                                    disabled={currentPage === 1}
                                                    className="h-[29px] px-4 border border-[#adb1b8] rounded-[3px] bg-gradient-to-b from-[#f7f8fa] to-[#e7e9ec] text-[12px] font-bold text-[#0f1111] hover:from-[#eef1f3] hover:to-[#dce0e4] disabled:opacity-50 disabled:cursor-not-allowed shadow-sm transition-all flex items-center gap-2"
                                                >
                                                    <ChevronLeft size={14} /> Previous
                                                </button>
                                                <button 
                                                    onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                                                    disabled={currentPage === totalPages}
                                                    className="h-[29px] px-4 border border-[#adb1b8] rounded-[3px] bg-gradient-to-b from-[#f7f8fa] to-[#e7e9ec] text-[12px] font-bold text-[#0f1111] hover:from-[#eef1f3] hover:to-[#dce0e4] disabled:opacity-50 disabled:cursor-not-allowed shadow-sm transition-all flex items-center gap-2"
                                                >
                                                    Next <ChevronRight size={14} />
                                                </button>
                                            </div>
                                        </div>
                                    </td>
                                </tr>
                            </tfoot>
                        )}
                    </table>
                </div>
            </div>

            {/* SUPPLIER MODAL (ADD/EDIT) */}
            {(view === 'add' || view === 'edit') && (
                <div className="fixed inset-0 z-[1000] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-300 overflow-y-auto">
                    <div className="bg-[#F8F9FA] rounded-2xl w-full max-w-2xl border border-white/20 shadow-2xl animate-in zoom-in-95 duration-500 overflow-hidden my-auto">
                        {/* Header */}
                        <div className="bg-[#232F3E] p-6 text-white flex items-center justify-between">
                            <div>
                                <h2 className="text-xl font-bold flex items-center gap-3">
                                    <div className="w-10 h-10 bg-[#F59E0B] rounded-xl flex items-center justify-center shadow-lg shadow-[#F59E0B]/20">
                                        {view === 'add' ? <Plus size={24} /> : <Pencil size={24} />}
                                    </div>
                                    {view === 'add' ? 'Add New Supplier' : 'Update Supplier Detail'}
                                </h2>
                                <p className="text-[11px] text-slate-400 font-bold uppercase tracking-widest mt-1 ml-13">Fulfillment & Supply Management</p>
                            </div>
                            <button onClick={() => setView('list')} className="w-10 h-10 rounded-xl hover:bg-white/10 flex items-center justify-center transition-colors">
                                <X size={20} />
                            </button>
                        </div>

                        <form onSubmit={view === 'add' ? handleAdd : handleEdit} className="p-8 space-y-8">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                {/* Left Side: Profile */}
                                <div className="space-y-6">
                                    {/* Image Selector */}
                                    <div className="flex flex-col items-center justify-center p-4 bg-white border-2 border-dashed border-slate-200 rounded-2xl hover:border-[#e77600] transition-all group relative overflow-hidden min-h-[140px]">
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
                                                <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center text-slate-400 group-hover:bg-[#e77600]/10 group-hover:text-[#e77600] transition-all">
                                                    <Camera size={28} />
                                                </div>
                                                <span className="mt-2 text-[11px] font-black uppercase text-slate-400 tracking-widest group-hover:text-[#e77600]">Upload Photo</span>
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
                                                        <button type="button" onClick={() => setShowPw(!showPw)} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 transition-colors hover:text-[#e77600]">{showPw ? <EyeOff size={14} /> : <Eye size={14} />}</button>
                                                    </div>
                                                </Field>
                                                <Field label="Confirm Password" required>
                                                    <div className="relative">
                                                        <input className={inputCls} type={showConfirmPw ? 'text' : 'password'} value={addForm.confirmPassword} onChange={(e) => setAddForm(f => ({ ...f, confirmPassword: e.target.value }))} />
                                                        <button type="button" onClick={() => setShowConfirmPw(!showConfirmPw)} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 transition-colors hover:text-[#e77600]">{showConfirmPw ? <EyeOff size={14} /> : <Eye size={14} />}</button>
                                                    </div>
                                                </Field>
                                            </div>
                                        ) : (
                                            <Field label="Change Password (Optional)">
                                                <div className="relative">
                                                    <input className={inputCls} type={showPw ? 'text' : 'password'} value={editForm.password} onChange={(e) => setEditForm(f => ({ ...f, password: e.target.value }))} placeholder="Leave blank to keep current" />
                                                    <button type="button" onClick={() => setShowPw(!showPw)} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 transition-colors hover:text-[#e77600]">{showPw ? <EyeOff size={14} /> : <Eye size={14} />}</button>
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
                                            className="peer h-5 w-5 cursor-pointer appearance-none rounded border border-[#adb1b8] border-opacity-60 bg-white checked:border-[#e77600] checked:bg-[#e77600] transition-all" 
                                            checked={view === 'add' ? addForm.is_active : editForm.is_active} 
                                            onChange={(e) => view === 'add' ? setAddForm(f => ({ ...f, is_active: e.target.checked })) : setEditForm(f => ({ ...f, is_active: e.target.checked }))}
                                        />
                                        <span className="absolute text-white opacity-0 peer-checked:opacity-100 top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 pointer-events-none transition-opacity">
                                            <CheckCircle2 size={14} strokeWidth={4} />
                                        </span>
                                    </div>
                                    <span className="text-[13px] font-bold text-[#111]">Active in System</span>
                                </label>
                            </div>

                            <div className="flex gap-4 pt-4">
                                <Btn className="flex-1 h-[45px] text-[15px] font-bold" onClick={view === 'add' ? handleAdd : handleEdit} loading={saving}>
                                    {saving ? 'Processing...' : (view === 'add' ? 'Register Supplier' : 'Save Changes')}
                                </Btn>
                                <Btn variant="secondary" className="flex-1 h-[45px] text-[15px] font-bold" onClick={() => setView('list')}>
                                    Discard
                                </Btn>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Simple Delete Confirmation */}
            {deleteItem && (
                <div className="fixed inset-0 z-[1000] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
                    <div className="bg-white rounded-2xl w-full max-w-sm border border-[#ddd] shadow-2xl animate-in zoom-in-95 duration-300 overflow-hidden text-center">
                        <div className="p-8">
                            <div className="w-16 h-16 bg-red-50 rounded-full flex items-center justify-center mx-auto mb-5 text-red-600 border border-red-100 shadow-inner">
                                <Trash2 size={32} />
                            </div>
                            <h2 className="text-[18px] font-bold text-[#111] mb-2">Delete Supplier?</h2>
                            <p className="text-[13px] text-[#565959] leading-relaxed">Are you sure you want to delete <span className="font-bold text-[#111]">{deleteItem.name}</span>? This action cannot be undone.</p>
                        </div>
                        <div className="bg-slate-50 p-6 flex gap-3">
                            <Btn variant="secondary" onClick={() => setDeleteItem(null)} className="flex-1 h-10">Cancel</Btn>
                            <Btn variant="primary" onClick={confirmDelete} className="flex-1 h-10 bg-red-600 hover:bg-red-700 !text-white !border-red-800">Confirm</Btn>
                        </div>
                    </div>
                </div>
            )}
            {/* SUPPLIER DETAIL MODAL (QUICK VIEW) */}
            {selectedForView && (
                <div className="fixed inset-0 z-[1000] flex items-center justify-center p-4 py-12 bg-[#0f1111]/90 backdrop-blur-sm animate-in fade-in duration-300 overflow-y-auto">
                    <div className="bg-white rounded-[8px] w-full max-w-4xl my-auto shadow-[0_20px_60px_rgba(0,0,0,0.5)] animate-in zoom-in-95 duration-500 overflow-hidden border border-[#ddd] max-h-none flex flex-col">
                        {/* Amazon Navy Header */}
                        <div className="bg-[#232F3E] px-8 py-5 flex items-center justify-between shrink-0">
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 bg-white rounded-full flex items-center justify-center p-0.5 border border-white/20 overflow-hidden shadow-inner shrink-0">
                                    {selectedForView.avatar ? (
                                        <img src={getImageUrl(selectedForView.avatar)} className="w-full h-full object-cover rounded-full" alt="" />
                                    ) : (
                                        <div className="w-full h-full flex items-center justify-center text-[#232F3E] font-black text-xl uppercase bg-slate-100 rounded-full">{selectedForView.name?.[0]}</div>
                                    )}
                                </div>
                                <div className="min-w-0">
                                    <div className="flex items-center gap-2">
                                        <h2 className="text-white text-[18px] font-bold leading-none truncate">{selectedForView.name}</h2>
                                        <div className="w-4 h-4 bg-[#f0c14b] rounded-sm flex items-center justify-center text-[#232F3E] text-[10px] font-black italic shadow-sm shrink-0">A</div>
                                    </div>
                                    <p className="text-[#adb1b8] text-[11px] font-medium mt-1">Supplier Directory Registry • Management Console</p>
                                </div>
                            </div>
                            <button onClick={() => setSelectedForView(null)} className="text-white/60 hover:text-white transition-colors p-1"><X size={22} /></button>
                        </div>

                        <div className="flex divide-x divide-[#ddd]">
                            {/* Identity Column */}
                            <div className="w-[320px] p-8 space-y-6">
                                <div className="space-y-4">
                                    <div className="aspect-square w-full bg-[#f3f3f3] rounded-[4px] border border-[#eee] flex items-center justify-center overflow-hidden shadow-inner group">
                                        {selectedForView.avatar ? (
                                            <img src={getImageUrl(selectedForView.avatar)} className="w-full h-full object-cover transition-transform group-hover:scale-105 duration-700" alt="" />
                                        ) : (
                                            <Building2 size={64} className="text-[#ccc]" />
                                        )}
                                    </div>
                                    <div>
                                        <h3 className="text-[24px] font-bold text-[#111] leading-tight mb-1">{selectedForView.name}</h3>
                                        <p className="text-[14px] text-[#007185] hover:underline cursor-pointer font-bold">{selectedForView.company || 'Private Distribution Partner'}</p>
                                    </div>
                                    <div className="flex items-center gap-2 pt-2">
                                        <span className={`px-2 py-0.5 rounded-[2px] text-[11px] font-black border tracking-tighter ${selectedForView.is_active ? 'bg-green-50 text-green-700 border-green-200' : 'bg-red-50 text-red-700 border-red-200'}`}>
                                            {selectedForView.is_active ? 'ACTIVE ACCOUNT' : 'SUSPENDED'}
                                        </span>
                                        <span className="text-[11px] text-[#565959] font-bold border-l pl-2 border-[#ddd]">Verified Vendor</span>
                                    </div>
                                </div>

                                <div className="pt-6 border-t border-[#eee]">
                                    <Btn onClick={() => { setSelectedForView(null); openEdit(selectedForView); }} className="w-full h-[40px] text-[13px] font-bold shadow-md">
                                        <Pencil size={14} /> Update Partner Profile
                                    </Btn>
                                </div>
                            </div>

                            {/* Details Grid Column */}
                            <div className="flex-1 p-10 bg-white">
                                <div className="grid grid-cols-1 gap-10">
                                    {/* Contact Section */}
                                    <div className="space-y-4">
                                        <h4 className="text-[15px] font-bold text-[#c45500] uppercase tracking-wider border-b-2 border-[#eee] pb-2">Primary Contact Information</h4>
                                        <div className="grid grid-cols-2 gap-8">
                                            <div className="space-y-1">
                                                <p className="text-[12px] font-black text-[#111]">Email Address</p>
                                                <p className="text-[14px] text-[#007185] hover:underline cursor-pointer truncate font-bold">{selectedForView.email}</p>
                                            </div>
                                            <div className="space-y-1">
                                                <p className="text-[12px] font-black text-[#111]">Mobile Connection</p>
                                                <p className="text-[14px] text-[#111] font-bold">{selectedForView.phone || 'Not Registered'}</p>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Logistics Section */}
                                    <div className="space-y-4">
                                        <h4 className="text-[15px] font-bold text-[#c45500] uppercase tracking-wider border-b-2 border-[#eee] pb-2">Business Logistics & Address</h4>
                                        <div className="flex gap-4 p-5 bg-[#fcfcfc] border border-[#ddd] rounded-[4px] shadow-sm relative overflow-hidden group">
                                            <div className="absolute top-0 left-0 w-1 h-full bg-[#007185]/20 group-hover:bg-[#007185] transition-colors" />
                                            <MapPin size={24} className="text-[#adb1b8] shrink-0 mt-0.5" />
                                            <div className="space-y-1">
                                                <p className="text-[14px] text-[#111] leading-relaxed font-bold italic">
                                                    {selectedForView.address || 'No physical headquarters address provided for this entity.'}
                                                </p>
                                                <p className="text-[10px] text-[#565959] font-black uppercase tracking-[0.2em]">Global Distribution Point</p>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Administrative Stats */}
                                    <div className="space-y-4">
                                        <h4 className="text-[15px] font-bold text-[#c45500] uppercase tracking-wider border-b-2 border-[#eee] pb-2">Administrative Registry Details</h4>
                                        <div className="grid grid-cols-3 gap-6">
                                            <div className="bg-white p-4 border border-[#eee] rounded-[4px] shadow-sm hover:border-[#ddd] transition-colors">
                                                <p className="text-[10px] font-black text-[#565959] uppercase tracking-wider mb-1">Partner Since</p>
                                                <p className="text-[14px] font-bold text-[#111]">{new Date(selectedForView.created_at || Date.now()).toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}</p>
                                            </div>
                                            <div className="bg-white p-4 border border-[#eee] rounded-[4px] shadow-sm hover:border-[#ddd] transition-colors">
                                                <p className="text-[10px] font-black text-[#565959] uppercase tracking-wider mb-1">Registry ID</p>
                                                <p className="text-[14px] font-bold text-[#111] truncate">#VEN-{selectedForView.id?.toString().slice(0, 8).toUpperCase()}</p>
                                            </div>
                                            <div className="bg-white p-4 border border-[#eee] rounded-[4px] shadow-sm hover:border-[#ddd] transition-colors">
                                                <p className="text-[10px] font-black text-[#565959] uppercase tracking-wider mb-1">Account Health</p>
                                                <div className="flex items-center gap-1.5 text-[14px] font-bold text-green-600 uppercase tracking-tighter">
                                                    <CheckCircle2 size={16} /> Excellent
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                <div className="mt-12 pt-8 border-t border-[#eee] flex justify-end">
                                    <button 
                                        onClick={() => setSelectedForView(null)} 
                                        className="h-[36px] px-12 bg-white border border-[#adb1b8] text-[#111] text-[13px] font-bold rounded-[3px] hover:bg-slate-50 transition-all shadow-sm active:bg-slate-100"
                                    >
                                        Close Details
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
