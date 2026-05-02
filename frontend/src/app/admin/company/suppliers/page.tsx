"use client";

import { useState, useEffect, useCallback } from 'react';
import { 
    Search, Plus, RefreshCw, Trash2, User, ChevronRight, ChevronLeft, 
    Phone, Mail, MapPin, Pencil, Save, Eye, EyeOff, X, Building2, 
    Activity, ShieldCheck, ExternalLink, MoreVertical, Loader2, CheckCircle2
} from 'lucide-react';
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
    const [suppliers, setSuppliers] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');
    const [saving, setSaving] = useState(false);
    const [deleteItem, setDeleteItem] = useState<any | null>(null);

    const [addForm, setAddForm] = useState({ firstName: '', lastName: '', email: '', password: '', confirmPassword: '', company: '', contact: '', address: '', is_active: true });
    const [showPw, setShowPw] = useState(false);
    const [showConfirmPw, setShowConfirmPw] = useState(false);

    const [editTarget, setEditTarget] = useState<any | null>(null);
    const [editForm, setEditForm] = useState({ name: '', email: '', contact: '', company: '', address: '', is_active: true, password: '' });

    const [selectedForView, setSelectedForView] = useState<any | null>(null);

    const loadData = useCallback(async (silent = false) => {
        if (!silent) setLoading(true);
        try {
            const data = await companyService.getSuppliers();
            setSuppliers(data || []);
        } catch { toast.error('Connection failure'); } finally { setLoading(false); }
    }, []);

    useEffect(() => { loadData(); }, [loadData]);

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
                company: addForm.company, contact: addForm.contact,
                email: addForm.email, password: addForm.password,
                address: addForm.address,
                is_active: addForm.is_active
            });
            toast.success('Supplier added');
            setView('list'); loadData();
            setAddForm({ firstName: '', lastName: '', email: '', password: '', confirmPassword: '', company: '', contact: '', address: '', is_active: true });
        } catch { toast.error('Check email or network'); } finally { setSaving(false); }
    };

    const openEdit = (s: any) => {
        setEditTarget(s);
        setEditForm({ name: s.name, email: s.email, contact: s.contact, company: s.company, address: s.address, is_active: !!s.is_active, password: '' });
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

                {view === 'list' ? (
                    <div className="space-y-6">
                        {/* Search Bar */}
                        <div className="bg-white border border-[#ddd] rounded-[4px] p-5 shadow-sm animate-in fade-in slide-in-from-top-2 duration-500">
                            <div className="relative max-w-sm">
                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[#aaa]" />
                                <input
                                    value={search}
                                    onChange={e => setSearch(e.target.value)}
                                    placeholder="Search by name or company..."
                                    className={`${inputCls} pl-10 h-[35px]`}
                                />
                            </div>
                        </div>

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
                                        filtered.map(s => (
                                            <tr key={s.id} className="hover:bg-[#fcfdff] transition-colors group text-[13px]">
                                                <td className="px-6 py-4">
                                                    <div className="text-[14px] font-bold text-[#007185] group-hover:underline cursor-pointer" onClick={() => openEdit(s)}>{s.name}</div>
                                                    <div className="text-[11px] text-[#565959] uppercase font-bold mt-1 tracking-tighter flex items-center gap-1.5">
                                                        <Building2 size={12} className="text-[#adb1b8]" /> {s.company || 'Private Seller'}
                                                    </div>
                                                </td>
                                                <td className="px-6 py-4">
                                                    <div className="flex items-center gap-2 text-[#111] font-bold">
                                                        <Phone size={13} className="text-[#adb1b8]" /> {s.contact || 'No Phone'}
                                                    </div>
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
                                                    <div className="flex justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                                        <button onClick={() => openEdit(s)} className="p-1.5 border border-[#ddd] rounded bg-white hover:bg-[#f7f8fa] text-[#565959] shadow-sm"><Pencil size={14} /></button>
                                                        <button onClick={() => setDeleteItem(s)} className="p-1.5 border border-[#ddd] rounded bg-white hover:bg-red-50 text-red-600 shadow-sm"><Trash2 size={14} /></button>
                                                    </div>
                                                </td>
                                            </tr>
                                        ))
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>
                ) : (
                    /* Add/Edit Form */
                    <div className="flex flex-col lg:flex-row gap-8 items-start animate-in fade-in duration-500">
                        <form className="flex-1 space-y-8" onSubmit={view === 'add' ? handleAdd : handleEdit}>
                            <div className="bg-white border border-[#ddd] rounded-[4px] shadow-sm overflow-hidden text-left">
                                <div className="px-6 py-4 border-b border-[#ddd] bg-[#f7f8fa]">
                                    <h2 className="text-[14px] font-bold text-[#111]">Primary Information</h2>
                                </div>
                                <div className="p-6 space-y-5">
                                    {view === 'add' ? (
                                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
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
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                                        <Field label="Company Name">
                                            <input className={inputCls} value={view === 'add' ? addForm.company : editForm.company} onChange={(e) => view === 'add' ? setAddForm(f => ({ ...f, company: e.target.value })) : setEditForm(f => ({ ...f, company: e.target.value }))} placeholder="Business or Shop Name" />
                                        </Field>
                                        <Field label="Phone / Contact">
                                            <input className={inputCls} value={view === 'add' ? addForm.contact : editForm.contact} onChange={(e) => view === 'add' ? setAddForm(f => ({ ...f, contact: e.target.value })) : setEditForm(f => ({ ...f, contact: e.target.value }))} placeholder="03XXXXXXXXX" />
                                        </Field>
                                    </div>
                                    <Field label="Full Address">
                                        <textarea className={`${inputCls} h-auto py-2`} rows={3} value={view === 'add' ? addForm.address : editForm.address} onChange={(e) => view === 'add' ? setAddForm(f => ({ ...f, address: e.target.value })) : setEditForm(f => ({ ...f, address: e.target.value }))} placeholder="Street, City, Area..." />
                                    </Field>
                                </div>
                            </div>

                            <div className="bg-white border border-[#ddd] rounded-[4px] shadow-sm overflow-hidden text-left">
                                <div className="px-6 py-4 border-b border-[#ddd] bg-[#f7f8fa]">
                                    <h2 className="text-[14px] font-bold text-[#111]">Login Credentials</h2>
                                </div>
                                <div className="p-6 space-y-5">
                                    <Field label="Email Address" required>
                                        <input className={inputCls} type="email" value={view === 'add' ? addForm.email : editForm.email} onChange={(e) => view === 'add' ? setAddForm(f => ({ ...f, email: e.target.value })) : setEditForm(f => ({ ...f, email: e.target.value }))} placeholder="email@example.com" />
                                    </Field>
                                    {view === 'add' ? (
                                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                                            <Field label="Password" required>
                                                <div className="relative">
                                                    <input className={inputCls} type={showPw ? 'text' : 'password'} value={addForm.password} onChange={(e) => setAddForm(f => ({ ...f, password: e.target.value }))} />
                                                    <button type="button" onClick={() => setShowPw(!showPw)} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400">{showPw ? <EyeOff size={14} /> : <Eye size={14} />}</button>
                                                </div>
                                            </Field>
                                            <Field label="Confirm Password" required>
                                                <div className="relative">
                                                    <input className={inputCls} type={showConfirmPw ? 'text' : 'password'} value={addForm.confirmPassword} onChange={(e) => setAddForm(f => ({ ...f, confirmPassword: e.target.value }))} />
                                                    <button type="button" onClick={() => setShowConfirmPw(!showConfirmPw)} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400">{showConfirmPw ? <EyeOff size={14} /> : <Eye size={14} />}</button>
                                                </div>
                                            </Field>
                                        </div>
                                    ) : (
                                        <Field label="Change Password (Optional)">
                                            <div className="relative">
                                                <input className={inputCls} type={showPw ? 'text' : 'password'} value={editForm.password} onChange={(e) => setEditForm(f => ({ ...f, password: e.target.value }))} placeholder="Leave blank to keep current" />
                                                <button type="button" onClick={() => setShowPw(!showPw)} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400">{showPw ? <EyeOff size={14} /> : <Eye size={14} />}</button>
                                            </div>
                                        </Field>
                                    )}
                                </div>
                                <div className="bg-slate-50 p-6 border-t border-[#eee]">
                                    <label className="flex items-center gap-3 cursor-pointer group">
                                        <div className="relative flex items-center">
                                            <input 
                                                type="checkbox" 
                                                className=" peer h-5 w-5 cursor-pointer appearance-none rounded border border-[#adb1b8] border-opacity-60 bg-white checked:border-[#e77600] checked:bg-[#e77600] transition-all" 
                                                checked={view === 'add' ? addForm.is_active : editForm.is_active} 
                                                onChange={(e) => view === 'add' ? setAddForm(f => ({ ...f, is_active: e.target.checked })) : setEditForm(f => ({ ...f, is_active: e.target.checked }))}
                                            />
                                            <span className="absolute text-white opacity-0 peer-checked:opacity-100 top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 pointer-events-none transition-opacity">
                                                <X size={14} className="rotate-45" strokeWidth={4} />
                                            </span>
                                        </div>
                                        <div>
                                            <p className="text-[14px] font-bold text-[#111] group-hover:text-[#c45500] transition-colors">Visible in System</p>
                                            <p className="text-[11px] text-[#565959]">If hidden, this supplier cannot log in or be selected for orders.</p>
                                        </div>
                                    </label>
                                </div>
                            </div>
                        </form>

                        {/* Actions Sidebar */}
                        <div className="w-full lg:w-[300px] shrink-0 space-y-6">
                            <div className="bg-white border border-[#ddd] rounded-[4px] shadow-sm overflow-hidden">
                                <div className="px-5 py-4 border-b border-[#ddd] bg-[#f7f8fa]">
                                    <h3 className="text-[14px] font-bold text-[#111]">Actions</h3>
                                </div>
                                <div className="p-6 space-y-4">
                                     <Btn className="w-full h-[35px] text-[14px] justify-center font-bold" onClick={view === 'add' ? handleAdd : handleEdit} loading={saving}>
                                        <Save size={14} /> {view === 'add' ? 'Create Supplier' : 'Update Supplier'}
                                    </Btn>
                                    <button onClick={() => setView('list')} className="w-full text-[12px] text-[#007185] hover:text-[#c45500] hover:underline font-bold text-center">
                                        Cancel
                                    </button>
                                </div>
                            </div>
                            
                            <div className="bg-[#fcf8e3] border border-[#faebcc] rounded-[4px] p-5 text-[12px] text-[#8a6d3b] leading-relaxed shadow-sm">
                                <div className="flex gap-3">
                                    <ShieldCheck className="h-5 w-5 shrink-0" />
                                    <div>
                                        <p className="font-bold uppercase tracking-wide mb-1">Security Note</p>
                                        Suppliers will receive their credentials via email. Ensure the email address is accurate before saving.
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                )}
            </div>

            {/* Simple Delete Confirmation */}
            {deleteItem && (
                <div className="fixed inset-0 z-[1000] flex items-center justify-center p-4 bg-black/60 backdrop-blur-[2px] animate-in fade-in duration-200">
                    <div className="bg-white rounded-[4px] w-full max-w-sm border border-[#ddd] shadow-2xl animate-in zoom-in-95 duration-300 overflow-hidden text-center">
                        <div className="p-8">
                            <div className="w-16 h-16 bg-red-50 rounded-full flex items-center justify-center mx-auto mb-5 text-red-600 border border-red-100 shadow-inner">
                                <Trash2 size={32} />
                            </div>
                            <h2 className="text-[17px] font-bold text-[#111] mb-2">Delete Supplier?</h2>
                            <p className="text-[13px] text-[#565959] leading-relaxed">Are you sure you want to delete <span className="font-bold text-[#111]">{deleteItem.name}</span>? This action is permanent.</p>
                        </div>
                        <div className="bg-slate-50 p-6 flex gap-3">
                            <Btn variant="secondary" onClick={() => setDeleteItem(null)} className="flex-1">Keep it</Btn>
                            <Btn variant="primary" onClick={confirmDelete} className="flex-1 bg-red-600 hover:bg-red-700 !text-white !border-red-800">Delete Now</Btn>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
