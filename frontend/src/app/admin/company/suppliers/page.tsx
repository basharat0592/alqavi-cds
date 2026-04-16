"use client";

import { useState, useEffect } from 'react';
import { Search, Plus, RefreshCw, Trash2, User, ChevronRight, ChevronLeft, Phone, Mail, MapPin, Pencil, Save, Eye, EyeOff, X, Building2 } from 'lucide-react';
import { companyService } from '@/services/company.service';
import toast from 'react-hot-toast';
import Link from 'next/link';

/* ─────────────────────────────────────────────────────────────────────────────
   PURE AMAZON RETAIL DESIGN SYSTEM - SUPPLIERS
   ───────────────────────────────────────────────────────────────────────────── */
const Btn = ({ children, onClick, loading, variant = 'primary', className = '', type = 'button', disabled = false }: any) => {
    const styles = {
        primary: 'bg-gradient-to-b from-[#f7dfa5] to-[#f0c14b] border-[#a88734] hover:from-[#f5d78e] hover:to-[#eeb933] text-[#0f1111]',
        secondary: 'bg-gradient-to-b from-[#f7f8fa] to-[#e7e9ec] border-[#adb1b8] hover:from-[#eef1f3] hover:to-[#dce0e4] text-[#0f1111]',
    };
    return (
        <button type={type} onClick={onClick} disabled={loading || disabled}
            className={`h-[29px] px-4 rounded-[3px] text-[13px] font-medium border transition-all flex items-center gap-2 disabled:opacity-60 ${styles[variant as keyof typeof styles]} ${className}`}>
            {loading && <RefreshCw className="h-3 w-3 animate-spin" />}
            {children}
        </button>
    );
};

const Field = ({ label, required = false, children }: { label: string; required?: boolean; children: React.ReactNode }) => (
    <div className="w-full">
        <label className="block text-[13px] font-bold text-[#0f1111] mb-1">{label}{required && <span className="text-red-600 ml-0.5">*</span>}</label>
        {children}
    </div>
);

const inputCls = "w-full h-[31px] px-3 border border-[#888c8e] rounded-[3px] text-[13px] outline-none focus:border-[#e77600] focus:shadow-[0_0_3px_2px_rgba(228,121,17,0.5)] placeholder:text-[#aaa] bg-white transition-all";

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

    const loadData = async () => {
        setLoading(true);
        try {
            const data = await companyService.getSuppliers();
            setSuppliers(data || []);
        } catch { toast.error('Failed to load data'); } finally { setLoading(false); }
    };

    useEffect(() => { loadData(); }, []);

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
        } catch { toast.error('Failed to add supplier'); } finally { setSaving(false); }
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
        } catch { toast.error('Failed to update'); } finally { setSaving(false); }
    };

    const confirmDelete = async () => {
        if (!deleteItem) return;
        try {
            await companyService.deleteSupplier(deleteItem.id);
            toast.success('Supplier deleted');
            loadData();
        } catch { toast.error('Failed to delete'); } finally { setDeleteItem(null); }
    };

    const filtered = (suppliers || []).filter(s => `${s.name} ${s.company} ${s.email}`.toLowerCase().includes(search.toLowerCase()));

    if (view === 'add' || view === 'edit') {
        const isEdit = view === 'edit';
        return (
            <div className="bg-[#F8F9FA] min-h-screen pb-20 font-sans text-[#0f1111]">
                <div className="max-w-[1100px] mx-auto px-6 pt-5 text-left">
                    <div className="flex items-center gap-1 text-[12px] text-[#565959] mb-2">
                        <Link href="/admin/dashboard" className="hover:text-[#c45500] hover:underline">Dashboard</Link>
                        <ChevronRight size={10} />
                        <span className="text-[#c45500]">Suppliers</span>
                    </div>

                    <div className="flex items-center justify-between mb-4">
                        <h1 className="text-[22px] font-normal">{isEdit ? 'Edit Supplier' : 'Add Supplier'}</h1>
                        <button onClick={() => setView('list')} className="text-[13px] text-[#007185] hover:text-[#c45500] hover:underline flex items-center gap-1">
                            <ChevronLeft size={14} /> Back to List
                        </button>
                    </div>
                    <div className="border-b border-[#ddd] mb-6" />

                    <form onSubmit={isEdit ? handleEdit : handleAdd} className="flex flex-col lg:flex-row gap-6 items-start">
                        <div className="flex-1 space-y-6">
                            {/* Section 1 */}
                            <div className="bg-white border border-[#ddd] rounded-[4px] shadow-sm overflow-hidden">
                                <div className="px-6 py-4 border-b border-[#ddd] bg-[#f7f8fa]">
                                    <h2 className="text-[14px] font-bold">{isEdit ? 'Basic Info' : 'Account Details'}</h2>
                                </div>
                                <div className="p-6 space-y-5">
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                                        {!isEdit ? (
                                            <>
                                                <Field label="First Name" required>
                                                    <input className={inputCls} value={addForm.firstName} onChange={e => setAddForm({...addForm, firstName: e.target.value})} placeholder="First name" />
                                                </Field>
                                                <Field label="Last Name">
                                                    <input className={inputCls} value={addForm.lastName} onChange={e => setAddForm({...addForm, lastName: e.target.value})} placeholder="Last name" />
                                                </Field>
                                                <Field label="Email" required>
                                                    <input className={inputCls} type="email" value={addForm.email} onChange={e => setAddForm({...addForm, email: e.target.value})} placeholder="email@gmail.com" />
                                                </Field>
                                                <div />
                                                <Field label="Password" required>
                                                    <div className="relative">
                                                        <input type={showPw ? 'text' : 'password'} className={inputCls} value={addForm.password} onChange={e => setAddForm({...addForm, password: e.target.value})} placeholder="••••••••" />
                                                        <button type="button" onClick={() => setShowPw(!showPw)} className="absolute right-2 top-1/2 -translate-y-1/2 text-[#aaa]">{showPw ? <EyeOff size={14} /> : <Eye size={14} />}</button>
                                                    </div>
                                                </Field>
                                                <Field label="Confirm Password" required>
                                                    <input type={showConfirmPw ? 'text' : 'password'} className={inputCls} value={addForm.confirmPassword} onChange={e => setAddForm({...addForm, confirmPassword: e.target.value})} placeholder="Repeat password" />
                                                </Field>
                                            </>
                                        ) : (
                                            <>
                                                <div className="col-span-full">
                                                    <Field label="Full Name" required>
                                                        <input className={inputCls} value={editForm.name} onChange={e => setEditForm({...editForm, name: e.target.value})} />
                                                    </Field>
                                                </div>
                                                <Field label="Email">
                                                    <input className={inputCls} type="email" value={editForm.email} onChange={e => setEditForm({...editForm, email: e.target.value})} />
                                                </Field>
                                                <Field label="Phone">
                                                    <input className={inputCls} value={editForm.contact} onChange={e => setEditForm({...editForm, contact: e.target.value})} />
                                                </Field>
                                                <div className="col-span-full border-t border-[#eee] pt-4 mt-2">
                                                    <Field label="Reset Access Password (Leave blank to keep same)">
                                                        <div className="relative">
                                                            <input 
                                                                type={showPw ? 'text' : 'password'} 
                                                                className={inputCls} 
                                                                value={editForm.password || ''} 
                                                                onChange={e => setEditForm({...editForm, password: e.target.value})} 
                                                                placeholder="Enter new password to reset" 
                                                            />
                                                            <button type="button" onClick={() => setShowPw(!showPw)} className="absolute right-2 top-1/2 -translate-y-1/2 text-[#aaa]">
                                                                {showPw ? <EyeOff size={14} /> : <Eye size={14} />}
                                                            </button>
                                                        </div>
                                                    </Field>
                                                </div>
                                            </>
                                        )}
                                    </div>
                                </div>
                            </div>

                            {/* Section 2 */}
                            <div className="bg-white border border-[#ddd] rounded-[4px] shadow-sm overflow-hidden">
                                <div className="px-6 py-4 border-b border-[#ddd] bg-[#f7f8fa]">
                                    <h2 className="text-[14px] font-bold">Business Details</h2>
                                </div>
                                <div className="p-6 space-y-5">
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                                        <Field label="Company Name">
                                            <input className={inputCls} value={isEdit ? editForm.company : addForm.company} onChange={e => isEdit ? setEditForm({...editForm, company: e.target.value}) : setAddForm({...addForm, company: e.target.value})} placeholder="Company name" />
                                        </Field>
                                        {!isEdit && (
                                            <Field label="Phone Number">
                                                <input className={inputCls} value={addForm.contact} onChange={e => setAddForm({...addForm, contact: e.target.value})} placeholder="Phone number" />
                                            </Field>
                                        )}
                                        <div className="col-span-full">
                                            <Field label="Address">
                                                <input className={inputCls} value={isEdit ? editForm.address : addForm.address} onChange={e => isEdit ? setEditForm({...editForm, address: e.target.value}) : setAddForm({...addForm, address: e.target.value})} placeholder="City or street address" />
                                            </Field>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div className="w-full lg:w-[280px] shrink-0 space-y-4">
                            <div className="bg-white border border-[#ddd] rounded-[4px] shadow-sm overflow-hidden">
                                <div className="px-5 py-4 border-b border-[#ddd] bg-[#f7f8fa]">
                                    <h3 className="text-[14px] font-bold text-center">Settings</h3>
                                </div>
                                <div className="p-5 space-y-4">
                                    <Field label="Status">
                                        <select 
                                            className={inputCls}
                                            value={isEdit ? (editForm.is_active ? 'true' : 'false') : (addForm.is_active ? 'true' : 'false')}
                                            onChange={e => {
                                                const val = e.target.value === 'true';
                                                if(isEdit) setEditForm({...editForm, is_active: val});
                                                else setAddForm({...addForm, is_active: val});
                                            }}
                                        >
                                            <option value="true">Active</option>
                                            <option value="false">Inactive</option>
                                        </select>
                                    </Field>
                                     <Btn className="w-full h-[35px] text-[14px] justify-center" onClick={isEdit ? handleEdit : handleAdd} loading={saving}>
                                        <Save size={14} /> {isEdit ? 'Update' : 'Save'}
                                    </Btn>
                                    <button type="button" onClick={() => setView('list')} className="w-full text-[12px] text-[#565959] hover:text-[#c45500] hover:underline text-center">
                                        Cancel
                                    </button>
                                </div>
                            </div>
                        </div>
                    </form>
                </div>
            </div>
        );
    }

    return (
        <div className="bg-[#F8F9FA] min-h-screen pb-20 font-sans text-[#0f1111]">
            <div className="max-w-[1100px] mx-auto px-6 pt-5 text-left">
                
                {/* Breadcrumb */}
                <div className="flex items-center gap-1 text-[12px] text-[#565959] mb-2">
                    <Link href="/admin/dashboard" className="hover:text-[#c45500] hover:underline">Dashboard</Link>
                    <ChevronRight size={10} />
                    <span className="text-[#c45500]">Suppliers</span>
                </div>

                <div className="flex items-center justify-between mb-4">
                    <h1 className="text-[22px] font-normal">Suppliers List</h1>
                    <div className="flex gap-2">
                         <Btn variant="secondary" onClick={loadData} loading={loading}>
                            <RefreshCw size={14} className={loading ? 'animate-spin' : ''} /> Refresh
                        </Btn>
                        <Btn onClick={() => setView('add')}>
                            <Plus size={14} /> Add Supplier
                        </Btn>
                    </div>
                </div>
                <div className="border-b border-[#ddd] mb-6" />

                <div className="bg-white border border-[#ddd] rounded-[4px] p-5 mb-6 shadow-sm">
                    <div className="relative max-w-sm">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[#aaa]" />
                        <input
                            value={search}
                            onChange={e => setSearch(e.target.value)}
                            placeholder="Search by name, company or email..."
                            className={`${inputCls} pl-10 h-[35px]`}
                        />
                    </div>
                </div>

                <div className="bg-white border border-[#ddd] rounded-[4px] shadow-sm overflow-hidden">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="bg-[#f7f8fa] border-b border-[#ddd] text-[12px] font-bold text-[#111]">
                                <th className="px-6 py-3">Supplier</th>
                                <th className="px-6 py-3">Access Status</th>
                                <th className="px-6 py-3 text-center">User Status</th>
                                <th className="px-6 py-3">Contact info</th>
                                <th className="px-6 py-3 text-right">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-[#eee]">
                            {loading && suppliers.length === 0 ? (
                                <tr><td colSpan={5} className="py-20 text-center text-[13px] text-[#565959]">Loading registry...</td></tr>
                            ) : filtered.length === 0 ? (
                                <tr><td colSpan={5} className="py-20 text-center text-[13px] text-[#565959]">No suppliers matching your search.</td></tr>
                            ) : (
                                filtered.map(s => (
                                    <tr key={s.id} className="hover:bg-[#fcfdff] transition-colors group text-[13px]">
                                        <td className="px-6 py-4">
                                            <div className="text-[14px] font-bold text-[#111]">{s.name}</div>
                                            <div className="text-[11px] text-[#565959] mt-0.5 font-medium">{s.company || 'Registry Entry'}</div>
                                            <div className="text-[11px] text-[#aaa] mt-0.5">{s.email}</div>
                                        </td>
                                        <td className="px-6 py-4">
                                            {s.username ? (
                                                <div className="flex items-center gap-1.5 text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-[3px] border border-emerald-100 w-fit text-[11px] font-bold uppercase tracking-wider">
                                                    Dashboard Access
                                                </div>
                                            ) : (
                                                <div className="text-[#565959] bg-gray-50 px-2.5 py-1 rounded-[3px] border border-gray-100 w-fit text-[11px] font-bold uppercase tracking-wider">
                                                    Manual Entry
                                                </div>
                                            )}
                                        </td>
                                        <td className="px-6 py-4 text-center">
                                             <div className={`px-2.5 py-1 rounded-[3px] border mx-auto text-[10px] font-bold uppercase tracking-wider mb-1 w-fit
                                                ${s.is_active ? 'text-emerald-700 bg-emerald-50 border-emerald-100' : 'text-red-700 bg-red-50 border-red-100'}`}>
                                                {s.is_active ? 'Login Enabled' : 'Login Blocked'}
                                            </div>
                                            <div className="text-[10px] text-[#565959] font-medium capitalize">
                                                Business: {s.status || 'Active'}
                                            </div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="flex items-center gap-2 text-[#444]"><Phone size={12} className="opacity-40" /> {s.contact || '—'}</div>
                                            <div className="flex items-center gap-2 mt-1 text-[#aaa]"><MapPin size={12} className="opacity-40" /> {s.address || '—'}</div>
                                        </td>
                                        <td className="px-6 py-4 text-right">
                                            <div className="flex justify-end gap-2 transition-opacity">
                                                <button onClick={() => setSelectedForView(s)} className="p-1.5 border border-[#ddd] rounded bg-white hover:bg-sky-50 text-sky-600"><Eye size={14} /></button>
                                                <button onClick={() => openEdit(s)} className="p-1.5 border border-[#ddd] rounded bg-white hover:bg-[#f7f8fa] text-[#565959]"><Pencil size={14} /></button>
                                                <button onClick={() => setDeleteItem(s)} className="p-1.5 border border-[#ddd] rounded bg-white hover:bg-red-50 text-red-600"><Trash2 size={14} /></button>
                                            </div>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Detail View Modal */}
            {selectedForView && (
                <div className="fixed inset-0 z-[500] flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm">
                    <div className="bg-white rounded-[4px] border border-[#ddd] max-w-md w-full shadow-2xl overflow-hidden text-left animate-in zoom-in-95">
                        <div className="bg-[#f6f6f6] px-5 py-3 border-b border-[#ddd] flex items-center justify-between">
                            <span className="text-[12px] font-bold text-[#111] uppercase">Supplier Profile</span>
                            <button onClick={() => setSelectedForView(null)} className="text-[#aaa] hover:text-[#111]"><X className="h-5 w-5" /></button>
                        </div>
                        <div className="p-8 space-y-6">
                            <div className="flex items-center gap-4 pb-6 border-b border-[#eee]">
                                <div className="w-12 h-12 bg-[#f0f2f2] border border-[#ddd] flex items-center justify-center rounded-[4px]">
                                    <Building2 size={24} className="text-[#ccc]" />
                                </div>
                                <div className="flex-1 min-w-0">
                                    <h3 className="text-[18px] font-bold text-[#111] leading-none truncate">{selectedForView.name}</h3>
                                    <p className="text-[11px] text-[#c45500] font-bold uppercase mt-1.5 tracking-widest">{selectedForView.company || 'Registry Entry'}</p>
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-x-8 gap-y-6">
                                <div className="space-y-1">
                                    <p className="text-[10px] font-bold text-[#aaa] uppercase tracking-wider">Company Name</p>
                                    <p className="text-[13px] font-bold text-[#111]">{selectedForView.company || '—'}</p>
                                </div>
                                <div className="space-y-1">
                                    <p className="text-[10px] font-bold text-[#aaa] uppercase tracking-wider">Contact Person</p>
                                    <p className="text-[13px] font-bold text-[#111]">{selectedForView.contact_person || '—'}</p>
                                </div>
                                <div className="space-y-1">
                                    <p className="text-[10px] font-bold text-[#aaa] uppercase tracking-wider">Email Address</p>
                                    <p className="text-[13px] font-bold text-[#111]">{selectedForView.email || '—'}</p>
                                </div>
                                <div className="space-y-1">
                                    <p className="text-[10px] font-bold text-[#aaa] uppercase tracking-wider">Contact Phone</p>
                                    <p className="text-[13px] font-bold text-[#111]">{selectedForView.contact || '—'}</p>
                                </div>
                                <div className="space-y-1">
                                    <p className="text-[10px] font-bold text-[#aaa] uppercase tracking-wider">Access Password</p>
                                    <p className="text-[13px] font-bold text-[#c45500] select-all">{selectedForView.plain_password || 'Not visible'}</p>
                                </div>
                                <div className="col-span-2 space-y-1">
                                    <p className="text-[10px] font-bold text-[#aaa] uppercase tracking-wider">Physical Address</p>
                                    <p className="text-[13px] font-bold text-[#111]">{selectedForView.address || 'No address provided'}</p>
                                </div>
                            </div>

                            <div className="pt-6 border-t border-[#eee]">
                                <div className={`px-4 py-2 rounded-[3px] text-[12px] font-bold text-center border
                                    ${selectedForView.is_active ? 'bg-emerald-50 text-emerald-700 border-emerald-100' : 'bg-red-50 text-red-700 border-red-100'}`}>
                                    Account Status: {selectedForView.is_active ? 'ACTIVE' : 'INACTIVE'}
                                </div>
                            </div>
                        </div>
                        <div className="px-6 py-4 bg-[#f6f6f6] border-t border-[#ddd] flex justify-end">
                             <Btn variant="secondary" onClick={() => setSelectedForView(null)} className="w-[80px] h-[31px]">Close</Btn>
                        </div>
                    </div>
                </div>
            )}

            {/* Delete Modal */}
            {deleteItem && (
                <div className="fixed inset-0 z-[500] flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
                    <div className="bg-white rounded-[4px] border border-[#ddd] p-10 w-full max-w-sm shadow-2xl text-center animate-in zoom-in-95">
                        <div className="w-16 h-16 bg-red-50 rounded-full flex items-center justify-center mx-auto mb-6 border border-red-100">
                            <Trash2 size={32} className="text-red-600" />
                        </div>
                        <h3 className="text-[18px] font-bold text-[#111] mb-3">Remove Supplier?</h3>
                        <p className="text-[13px] text-[#565959] leading-relaxed">
                            Are you sure you want to remove <span className="font-bold text-[#111]">"{deleteItem.name}"</span>? 
                            This will also revoke their portal access.
                        </p>
                        <div className="mt-8 space-y-3">
                            <button onClick={confirmDelete} className="w-full h-[35px] bg-red-600 text-white rounded-[3px] text-[13px] font-bold shadow-sm active:bg-red-800 transition-all">
                                Confirm Removal
                            </button>
                            <button onClick={() => setDeleteItem(null)} className="w-full text-[13px] font-bold text-[#565959] hover:underline">
                                Cancel
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
