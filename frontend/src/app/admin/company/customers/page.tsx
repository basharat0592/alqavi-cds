"use client";

import React, { useState, useEffect, useCallback } from 'react';
import { 
    Users, Plus, Search, Mail, Phone, MapPin, 
    Trash2, Edit, X, CheckCircle, AlertTriangle, 
    RefreshCw, ChevronRight, ChevronLeft, User, Shield, Eye, Pencil, Save
} from 'lucide-react';
import { companyService } from '@/lib/api';
import toast from 'react-hot-toast';
import Link from 'next/link';

/* ─────────────────────────────────────────────────────────────────────────────
   PURE AMAZON RETAIL DESIGN SYSTEM - CUSTOMER MANAGEMENT (MASTER DIRECTORY)
   ───────────────────────────────────────────────────────────────────────────── */
const BASE_URL = process.env.NEXT_PUBLIC_API_URL?.replace('/api', '') || 'http://127.0.0.1:8000';

const getAvatarUrl = (path: string | null): string | undefined => {
    if (!path) return undefined;
    if (path.startsWith('http')) return path;
    return `${BASE_URL}${path.startsWith('/') ? '' : '/'}${path}`;
};

const Btn = ({ children, onClick, loading, variant = 'primary', className = '', type = 'button', disabled = false }: any) => {
    const styles = {
        primary: 'bg-gradient-to-b from-[#f7dfa5] to-[#f0c14b] border-[#a88734] hover:from-[#f5d78e] hover:to-[#eeb933] text-[#0f1111] shadow-sm',
        secondary: 'bg-gradient-to-b from-[#f7f8fa] to-[#e7e9ec] border-[#adb1b8] hover:from-[#eef1f3] hover:to-[#dce0e4] text-[#0f1111] shadow-sm',
        danger: 'bg-red-600 border-red-700 text-white hover:bg-red-700 shadow-sm',
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

const inputCls = "w-full h-[31px] px-3 border border-[#888c8e] rounded-[3px] text-[13px] outline-none focus:border-[#e77600] focus:shadow-[0_0_3px_2px_rgba(228,121,17,0.5)] placeholder:text-[#aaa] bg-white transition-all font-medium";

export default function CustomersPage() {
    const [customers, setCustomers] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');
    const [showModal, setShowModal] = useState(false);
    const [saving, setSaving] = useState(false);
    const [editTarget, setEditTarget] = useState<any | null>(null);
    const [viewingCustomer, setViewingCustomer] = useState<any | null>(null);
    const [deleteTarget, setDeleteTarget] = useState<any | null>(null);
    const [currentPage, setCurrentPage] = useState(1);
    const itemsPerPage = 10;
    
    // Form State
    const [formData, setFormData] = useState({
        first_name: '',
        last_name: '',
        email: '',
        phone: '',
        address: '',
        city: '',
        country: '',
        postal_code: '',
        password: '',
        status: 'active',
        is_active: true,
        avatar: null as File | string | null
    });

    const loadCustomers = useCallback(async () => {
        setLoading(true);
        try {
            const data = await companyService.getCustomers();
            setCustomers(data || []);
        } catch {
            toast.error('Failed to load customers');
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        loadCustomers();
    }, [loadCustomers]);

    // Reset pagination on search
    useEffect(() => {
        setCurrentPage(1);
    }, [search]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setSaving(true);
        try {
            if (editTarget) {
                // Update
                const payload = { ...formData };
                if (!payload.password) delete (payload as any).password;
                await companyService.updateCustomer(editTarget.id, payload);
                toast.success('Customer updated');
            } else {
                // Create
                const payload = { ...formData };
                if (!payload.password) payload.password = 'Password123';
                await companyService.createCustomer(payload);
                toast.success('Customer registered successfully');
            }
            setShowModal(false);
            setEditTarget(null);
            loadCustomers();
        } catch (err: any) {
            const detail = err.response?.data;
            let msg = 'Failed to process request';
            
            if (detail && typeof detail === 'object') {
                const firstField = Object.keys(detail)[0];
                if (firstField && Array.isArray(detail[firstField])) {
                    msg = `${firstField}: ${detail[firstField][0]}`;
                } else if (detail.error) {
                    msg = detail.error;
                } else if (detail.detail) {
                    msg = detail.detail;
                }
            }
            toast.error(msg);
        } finally {
            setSaving(false);
        }
    };

    const openAdd = () => {
        setEditTarget(null);
        setFormData({ first_name: '', last_name: '', email: '', phone: '', address: '', city: '', country: '', postal_code: '', password: '', status: 'active', is_active: true, avatar: null });
        setShowModal(true);
    };

    const openEdit = (c: any) => {
        setEditTarget(c);
        setFormData({
            first_name: c.first_name || '',
            last_name: c.last_name || '',
            email: c.email || '',
            phone: c.phone || '',
            address: c.address || '',
            city: c.city || '',
            country: c.country || '',
            postal_code: c.postal_code || '',
            password: '',
            status: c.status || 'active',
            is_active: c.is_active !== false,
            avatar: c.avatar || null
        });
        setShowModal(true);
    };

    const handleDelete = async () => {
        if (!deleteTarget) return;
        setSaving(true);
        try {
            await companyService.deleteCustomer(deleteTarget.id);
            toast.success('Customer removed');
            setDeleteTarget(null);
            loadCustomers();
        } catch {
            toast.error('Failed to delete');
        } finally {
            setSaving(false);
        }
    };

    const filteredCustomers = customers.filter(c => 
        (c.first_name + ' ' + c.last_name).toLowerCase().includes(search.toLowerCase()) ||
        c.email?.toLowerCase().includes(search.toLowerCase()) ||
        c.phone?.includes(search)
    );

    const totalPages = Math.ceil(filteredCustomers.length / itemsPerPage);
    const paginatedItems = filteredCustomers.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

    return (
        <div className="bg-[#F8F9FA] min-h-screen pb-20 font-sans text-left text-[#0f1111]">
            <div className="max-w-[1200px] mx-auto px-6 pt-5">
                
                {/* Breadcrumb */}
                <div className="flex items-center gap-1 text-[12px] text-[#565959] mb-2">
                    <Link href="/admin/dashboard" className="hover:text-[#c45500] hover:underline">Dashboard</Link>
                    <ChevronRight size={10} />
                    <span className="text-[#c45500] font-bold">Customer Registry</span>
                </div>

                <div className="flex items-center justify-between mb-4">
                    <h1 className="text-[24px] font-normal text-[#111]">Manage Customers</h1>
                    <Btn onClick={openAdd}>
                        <Plus size={14} /> Add New Customer
                    </Btn>
                </div>
                <div className="border-b border-[#ddd] mb-6" />


                {/* Search & Filters */}
                <div className="bg-white border border-[#ddd] rounded-[4px] p-5 mb-6 shadow-sm flex gap-4 items-center">
                    <div className="relative flex-1">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[#aaa]" />
                        <input
                            value={search}
                            onChange={e => setSearch(e.target.value)}
                            placeholder="Search by name, email or phone number..."
                            className="w-full h-[38px] pl-10 pr-4 border border-[#888c8e] rounded-[3px] text-[14px] outline-none focus:border-[#e77600] focus:shadow-[0_0_3px_2px_rgba(228,121,17,0.5)] transition-all font-medium"
                        />
                    </div>
                    <Btn variant="secondary" onClick={loadCustomers} loading={loading} className="h-[38px] px-6">
                        <RefreshCw size={14} className={loading ? 'animate-spin' : ''} /> Sync Directory
                    </Btn>
                </div>

                {/* Table */}
                <div className="bg-white border border-[#ddd] rounded-[4px] shadow-sm overflow-hidden">
                    <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse">
                            <thead>
                                <tr className="bg-[#f7f8fa] border-b border-[#ddd]">
                                    <th className="px-6 py-4 text-[12px] font-bold text-[#111] uppercase tracking-wider">Customer Profile</th>
                                    <th className="px-6 py-4 text-[12px] font-bold text-[#111] uppercase tracking-wider">Contact Details</th>
                                    <th className="px-6 py-4 text-[12px] font-bold text-[#111] uppercase tracking-wider">Primary Location</th>
                                    <th className="px-6 py-4 text-[12px] font-bold text-[#111] uppercase tracking-wider text-center">Status</th>
                                    <th className="px-6 py-4 text-[12px] font-bold text-[#111] uppercase tracking-wider text-right">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-[#eee]">
                                {loading && customers.length === 0 ? (
                                    <tr><td colSpan={5} className="py-24 text-center text-[14px] text-[#565959] font-medium italic">Loading master customer directory...</td></tr>
                                ) : filteredCustomers.length === 0 ? (
                                    <tr><td colSpan={5} className="py-24 text-center text-[14px] text-[#565959] font-medium italic">No customer accounts found.</td></tr>
                                ) : (
                                    paginatedItems.map(cust => (
                                        <tr key={cust.id} className="hover:bg-[#fcfdff] transition-colors group">
                                            <td className="px-6 py-5">
                                                <div className="flex items-center gap-4">
                                                    <div className="w-12 h-12 bg-[#f3f3f3] rounded-[4px] flex items-center justify-center text-[#999] border border-[#ddd] shadow-inner font-black text-lg overflow-hidden">
                                                        {cust.avatar ? (
                                                            <img src={getAvatarUrl(cust.avatar)} alt="" className="w-full h-full object-cover" />
                                                        ) : (
                                                            cust.first_name?.[0].toUpperCase()
                                                        )}
                                                    </div>
                                                    <div>
                                                        <div className="text-[15px] font-bold text-[#007185] hover:underline cursor-pointer flex items-center gap-1.5" onClick={() => setViewingCustomer(cust)}>
                                                            {cust.first_name} {cust.last_name}
                                                            {cust.is_staff && <Shield size={12} className="text-[#c45500]" />}
                                                        </div>
                                                        <div className="text-[11px] text-[#565959] font-bold uppercase tracking-widest mt-1">ID: #{String(cust.id).slice(-6).toUpperCase()}</div>
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="px-6 py-5">
                                                <div className="flex flex-col gap-1.5">
                                                    <div className="flex items-center gap-2 text-[13px] text-[#111] font-medium">
                                                        <Mail size={12} className="text-[#aaa]" /> {cust.email}
                                                    </div>
                                                    <div className="flex items-center gap-2 text-[13px] text-[#111] font-medium">
                                                        <Phone size={12} className="text-[#aaa]" /> {cust.phone || '—'}
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="px-6 py-5">
                                                <div className="flex items-start gap-2 text-[13px] text-[#565959] font-medium">
                                                    <MapPin size={14} className="text-[#aaa] shrink-0 mt-0.5" />
                                                    <div className="flex flex-col">
                                                        <span className="line-clamp-1">{cust.address || 'No address registered'}</span>
                                                        <span className="text-[11px] text-[#aaa] font-bold uppercase">{cust.city} {cust.country}</span>
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="px-6 py-5 text-center">
                                                <span className={`px-3 py-1 rounded-[3px] text-[10px] font-black uppercase border tracking-widest ${cust.is_active !== false ? 'bg-green-50 text-green-700 border-green-200' : 'bg-red-50 text-red-700 border-red-200'}`}>
                                                    {cust.is_active !== false ? 'Verified' : 'Suspended'}
                                                </span>
                                            </td>
                                            <td className="px-6 py-5 text-right">
                                                <div className="flex justify-end gap-1.5">
                                                    <button onClick={() => setViewingCustomer(cust)} className="p-2 text-slate-400 hover:text-[#007185] hover:bg-sky-50 rounded-full transition-all" title="View Profile">
                                                        <Eye size={18} />
                                                    </button>
                                                    <button onClick={() => openEdit(cust)} className="p-2 text-slate-400 hover:text-[#c45500] hover:bg-orange-50 rounded-full transition-all" title="Edit Customer">
                                                        <Pencil size={18} />
                                                    </button>
                                                    <button onClick={() => setDeleteTarget(cust)} className="p-2 text-slate-300 hover:text-red-600 hover:bg-red-50 rounded-full transition-all" title="Delete Account">
                                                        <Trash2 size={18} />
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                            {filteredCustomers.length > 0 && (
                                <tfoot className="bg-[#f7f8fa] border-t border-[#ddd]">
                                    <tr>
                                        <td colSpan={5} className="px-6 py-3">
                                            <div className="flex items-center justify-between">
                                                <div className="text-[13px] text-[#565959]">
                                                    Showing <span className="font-bold text-[#111]">{(currentPage - 1) * itemsPerPage + 1}</span> to <span className="font-bold text-[#111]">{Math.min(currentPage * itemsPerPage, filteredCustomers.length)}</span> of <span className="font-bold text-[#111]">{filteredCustomers.length}</span> customers
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
            </div>

            {/* Form Modal (Add/Edit) */}
            {showModal && (
                <div className="fixed inset-0 z-[1000] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
                    <div className="bg-white rounded-[4px] border border-[#ddd] shadow-2xl w-full max-w-xl overflow-hidden animate-in zoom-in-95 duration-200">
                        <div className="bg-[#f7f8fa] px-6 py-4 border-b border-[#ddd] flex items-center justify-between">
                            <h3 className="text-[14px] font-black uppercase tracking-wider text-[#111]">{editTarget ? 'Edit Customer Account' : 'Register New Customer'}</h3>
                            <button onClick={() => setShowModal(false)} className="text-slate-400 hover:text-[#111] transition-colors"><X size={24} /></button>
                        </div>
                        <form onSubmit={handleSubmit} className="p-8">
                            <div className="grid grid-cols-2 gap-6 mb-6">
                                <Field label="First Name" required>
                                    <input required className={inputCls} value={formData.first_name} onChange={e => setFormData({...formData, first_name: e.target.value})} placeholder="e.g. Adnan" />
                                </Field>
                                <Field label="Last Name" required>
                                    <input required className={inputCls} value={formData.last_name} onChange={e => setFormData({...formData, last_name: e.target.value})} placeholder="e.g. Ali" />
                                </Field>
                                <Field label="Email Address" required>
                                    <input required type="email" className={inputCls} value={formData.email} onChange={e => setFormData({...formData, email: e.target.value})} placeholder="customer@example.com" />
                                </Field>
                                <Field label="Phone Number">
                                    <input className={inputCls} value={formData.phone} onChange={e => setFormData({...formData, phone: e.target.value})} placeholder="+92 3XX XXXXXXX" />
                                </Field>
                                <Field label="Profile Picture">
                                    <div className="flex items-center gap-3">
                                        <div className="w-[31px] h-[31px] bg-gray-100 rounded-[3px] border border-[#888c8e] flex items-center justify-center overflow-hidden">
                                            {formData.avatar ? (
                                                <img src={typeof formData.avatar === 'string' ? getAvatarUrl(formData.avatar) : URL.createObjectURL(formData.avatar)} alt="" className="w-full h-full object-cover" />
                                            ) : <User size={14} className="text-gray-400" />}
                                        </div>
                                        <input type="file" accept="image/*" className="text-[11px] file:h-[25px] file:bg-gray-100 file:border file:border-gray-300 file:rounded-[2px] file:px-2 file:mr-2 file:cursor-pointer" 
                                            onChange={e => {
                                                const file = e.target.files?.[0];
                                                if (file) setFormData({...formData, avatar: file});
                                            }}
                                        />
                                    </div>
                                </Field>
                            </div>
                            <div className="space-y-6">
                                <Field label="Permanent Address">
                                    <input className={inputCls} value={formData.address} onChange={e => setFormData({...formData, address: e.target.value})} placeholder="Street address, apartment, etc." />
                                </Field>
                                <div className="grid grid-cols-3 gap-6">
                                    <Field label="City">
                                        <input className={inputCls} value={formData.city} onChange={e => setFormData({...formData, city: e.target.value})} placeholder="City" />
                                    </Field>
                                    <Field label="Country">
                                        <input className={inputCls} value={formData.country} onChange={e => setFormData({...formData, country: e.target.value})} placeholder="Country" />
                                    </Field>
                                    <Field label="Postal Code">
                                        <input className={inputCls} value={formData.postal_code} onChange={e => setFormData({...formData, postal_code: e.target.value})} placeholder="00000" />
                                    </Field>
                                </div>
                                <div className="grid grid-cols-2 gap-6">
                                    <Field label={editTarget ? "Reset Password" : "Account Password"}>
                                        <input type="password" className={inputCls} value={formData.password} onChange={e => setFormData({...formData, password: e.target.value})} placeholder={editTarget ? "Leave blank to keep same" : "Default: Password123"} />
                                    </Field>
                                    <Field label="Account Status">
                                        <select className={inputCls + " cursor-pointer"} value={formData.status} onChange={e => setFormData({...formData, status: e.target.value, is_active: e.target.value === 'active'})}>
                                            <option value="active">Active / Verified</option>
                                            <option value="inactive">Suspended / Inactive</option>
                                        </select>
                                    </Field>
                                </div>
                            </div>

                            <div className="mt-10 flex gap-4">
                                <Btn type="submit" loading={saving} className="flex-1 h-[40px] text-[14px] font-black uppercase tracking-widest">
                                    <Save size={18} /> {editTarget ? 'Update Customer' : 'Register Account'}
                                </Btn>
                                <Btn variant="secondary" onClick={() => setShowModal(false)} className="px-10 h-[40px] font-bold">Cancel</Btn>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* CUSTOMER DETAIL MODAL (QUICK VIEW) */}
            {viewingCustomer && (
                <div className="fixed inset-0 z-[1000] flex items-center justify-center p-4 py-12 bg-[#0f1111]/90 backdrop-blur-sm animate-in fade-in duration-300 overflow-y-auto">
                    <div className="bg-white rounded-[8px] w-full max-w-4xl my-auto shadow-[0_20px_60px_rgba(0,0,0,0.5)] animate-in zoom-in-95 duration-500 overflow-hidden border border-[#ddd] max-h-none flex flex-col">
                        {/* Amazon Navy Header */}
                        <div className="bg-[#232F3E] px-8 py-5 flex items-center justify-between shrink-0">
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 bg-white rounded-full flex items-center justify-center p-0.5 border border-white/20 overflow-hidden shadow-inner shrink-0">
                                    {viewingCustomer.avatar ? (
                                        <img src={getAvatarUrl(viewingCustomer.avatar)} className="w-full h-full object-cover rounded-full" alt="" />
                                    ) : (
                                        <div className="w-full h-full flex items-center justify-center text-[#232F3E] font-black text-xl uppercase bg-slate-100 rounded-full">{viewingCustomer.first_name?.[0]}</div>
                                    )}
                                </div>
                                <div className="min-w-0">
                                    <div className="flex items-center gap-2">
                                        <h2 className="text-white text-[18px] font-bold leading-none truncate">{viewingCustomer.first_name} {viewingCustomer.last_name}</h2>
                                        <div className="w-4 h-4 bg-[#f0c14b] rounded-sm flex items-center justify-center text-[#232F3E] text-[10px] font-black italic shadow-sm shrink-0">A</div>
                                    </div>
                                    <p className="text-[#adb1b8] text-[11px] font-medium mt-1">Customer Registry Console • Member Management</p>
                                </div>
                            </div>
                            <button onClick={() => setViewingCustomer(null)} className="text-white/60 hover:text-white transition-colors p-1"><X size={22} /></button>
                        </div>

                        <div className="flex divide-x divide-[#ddd]">
                            {/* Identity Column */}
                            <div className="w-[320px] p-8 space-y-6">
                                <div className="space-y-4">
                                    <div className="aspect-square w-full bg-[#f3f3f3] rounded-[4px] border border-[#eee] flex items-center justify-center overflow-hidden shadow-inner group">
                                        {viewingCustomer.avatar ? (
                                            <img src={getAvatarUrl(viewingCustomer.avatar)} className="w-full h-full object-cover transition-transform group-hover:scale-105 duration-700" alt="" />
                                        ) : (
                                            <User size={64} className="text-[#ccc]" />
                                        )}
                                    </div>
                                    <div>
                                        <h3 className="text-[24px] font-bold text-[#111] leading-tight mb-1">{viewingCustomer.first_name} {viewingCustomer.last_name}</h3>
                                        <p className="text-[12px] text-[#c45500] font-black uppercase tracking-[0.2em] mt-1">ID: #{String(viewingCustomer.id).slice(0, 8).toUpperCase()}</p>
                                    </div>
                                    <div className="flex items-center gap-2 pt-2">
                                        <span className={`px-2 py-0.5 rounded-[2px] text-[11px] font-black border tracking-tighter ${viewingCustomer.is_active !== false ? 'bg-green-50 text-green-700 border-green-200' : 'bg-red-50 text-red-700 border-red-200'}`}>
                                            {viewingCustomer.is_active !== false ? 'VERIFIED Member' : 'SUSPENDED'}
                                        </span>
                                        <span className="text-[11px] text-[#565959] font-bold border-l pl-2 border-[#ddd]">Retail Registry</span>
                                    </div>
                                </div>

                                <div className="pt-6 border-t border-[#eee]">
                                    <button 
                                        onClick={() => { setViewingCustomer(null); openEdit(viewingCustomer); }} 
                                        className="w-full h-[40px] bg-gradient-to-b from-[#f7dfa5] to-[#f0c14b] border border-[#a88734] hover:from-[#f5d78e] hover:to-[#eeb933] text-[#0f1111] text-[13px] font-bold rounded-[3px] shadow-md flex items-center justify-center gap-2 transition-all active:shadow-inner"
                                    >
                                        <Pencil size={14} /> Update Retail Profile
                                    </button>
                                </div>
                            </div>

                            {/* Details Grid Column */}
                            <div className="flex-1 p-10 bg-white">
                                <div className="grid grid-cols-1 gap-10">
                                    {/* Contact Section */}
                                    <div className="space-y-4">
                                        <h4 className="text-[15px] font-bold text-[#c45500] uppercase tracking-wider border-b-2 border-[#eee] pb-2">Customer Communication Details</h4>
                                        <div className="grid grid-cols-2 gap-8">
                                            <div className="space-y-1">
                                                <p className="text-[12px] font-black text-[#111]">Email Address</p>
                                                <p className="text-[14px] text-[#007185] hover:underline cursor-pointer truncate font-bold">{viewingCustomer.email}</p>
                                            </div>
                                            <div className="space-y-1">
                                                <p className="text-[12px] font-black text-[#111]">Mobile Connection</p>
                                                <p className="text-[14px] text-[#111] font-bold">{viewingCustomer.phone || 'Not Registered'}</p>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Address Section */}
                                    <div className="space-y-4">
                                        <h4 className="text-[15px] font-bold text-[#c45500] uppercase tracking-wider border-b-2 border-[#eee] pb-2">Shipping & Residence Address</h4>
                                        <div className="flex gap-4 p-5 bg-[#fcfcfc] border border-[#ddd] rounded-[4px] shadow-sm relative overflow-hidden group">
                                            <div className="absolute top-0 left-0 w-1 h-full bg-[#007185]/20 group-hover:bg-[#007185] transition-colors" />
                                            <MapPin size={24} className="text-[#adb1b8] shrink-0 mt-0.5" />
                                            <div className="space-y-1">
                                                <p className="text-[14px] text-[#111] leading-relaxed font-bold italic">
                                                    {viewingCustomer.address || 'No physical delivery address provided for this member.'}
                                                </p>
                                                {viewingCustomer.city && <p className="text-[10px] text-[#565959] font-black uppercase tracking-[0.2em]">{viewingCustomer.city}, {viewingCustomer.country}</p>}
                                            </div>
                                        </div>
                                    </div>

                                    {/* Account Intelligence */}
                                    <div className="space-y-4">
                                        <h4 className="text-[15px] font-bold text-[#c45500] uppercase tracking-wider border-b-2 border-[#eee] pb-2">Account Intelligence</h4>
                                        <div className="grid grid-cols-3 gap-6">
                                            <div className="bg-white p-4 border border-[#eee] rounded-[4px] shadow-sm hover:border-[#ddd] transition-colors">
                                                <p className="text-[10px] font-black text-[#565959] uppercase tracking-wider mb-1">Member Since</p>
                                                <p className="text-[14px] font-bold text-[#111]">{new Date(viewingCustomer.created_at || Date.now()).toLocaleDateString('en-US', { day: 'numeric', month: 'short', year: 'numeric' })}</p>
                                            </div>
                                            <div className="bg-white p-4 border border-[#eee] rounded-[4px] shadow-sm hover:border-[#ddd] transition-colors">
                                                <p className="text-[10px] font-black text-[#565959] uppercase tracking-wider mb-1">Account Standing</p>
                                                <div className="flex items-center gap-1.5 text-[14px] font-bold text-green-600 uppercase tracking-tighter">
                                                    <CheckCircle size={16} /> Excellent
                                                </div>
                                            </div>
                                            <div className="bg-white p-4 border border-[#eee] rounded-[4px] shadow-sm hover:border-[#ddd] transition-colors">
                                                <p className="text-[10px] font-black text-[#565959] uppercase tracking-wider mb-1">Security</p>
                                                <div className="flex items-center gap-1.5 text-[14px] font-bold text-[#111]">
                                                    <Shield size={16} className="text-[#007185]" /> Protected
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                <div className="mt-12 pt-8 border-t border-[#eee] flex justify-end">
                                    <button 
                                        onClick={() => setViewingCustomer(null)} 
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

            {/* Delete Confirmation Modal */}
            {deleteTarget && (
                <div className="fixed inset-0 z-[1000] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
                    <div className="bg-white rounded-[4px] border border-[#ddd] shadow-2xl w-full max-w-sm overflow-hidden animate-in zoom-in-95 duration-200">
                        <div className="p-8 text-center">
                            <div className="w-16 h-16 bg-red-50 rounded-full flex items-center justify-center text-red-600 mx-auto mb-6">
                                <Trash2 size={32} />
                            </div>
                            <h3 className="text-[18px] font-black text-[#111] mb-2 uppercase">Confirm Deletion</h3>
                            <p className="text-[13px] text-[#565959] leading-relaxed mb-8">
                                Are you sure you want to remove <span className="font-bold text-[#111]">{deleteTarget.first_name} {deleteTarget.last_name}</span>? This action cannot be undone.
                            </p>
                            <div className="flex gap-3">
                                <button 
                                    onClick={handleDelete}
                                    disabled={saving}
                                    className="flex-1 h-[40px] bg-red-600 hover:bg-red-700 text-white text-[13px] font-black uppercase tracking-widest rounded-[3px] shadow-sm flex items-center justify-center gap-2 transition-all active:scale-95 disabled:opacity-50"
                                >
                                    {saving ? <RefreshCw className="h-4 w-4 animate-spin" /> : 'Yes, Delete'}
                                </button>
                                <button 
                                    onClick={() => setDeleteTarget(null)}
                                    className="flex-1 h-[40px] bg-[#f7f8fa] hover:bg-[#e7e9ec] border border-[#adb1b8] text-[#0f1111] text-[13px] font-bold rounded-[3px] transition-all active:scale-95"
                                >
                                    Cancel
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
