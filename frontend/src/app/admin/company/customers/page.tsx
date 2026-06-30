"use client";

import React, { useState, useEffect, useCallback } from 'react';
import {
    Plus, Search, Mail, Phone, MapPin,
    Trash2, X, CheckCircle,
    RefreshCw, ChevronRight, ChevronLeft, User, Shield, Pencil, Save, Loader2
} from 'lucide-react';
import { companyService } from '@/lib/api';
import toast from 'react-hot-toast';
import { PageHeader, Card, Button, Badge, Modal, ui } from '@/components/admin/ui';

/* ─────────────────────────────────────────────────────────────────────────────
   CUSTOMER MANAGEMENT (MASTER DIRECTORY)
   ───────────────────────────────────────────────────────────────────────────── */
const BASE_URL = process.env.NEXT_PUBLIC_API_URL?.replace('/api', '') || 'http://127.0.0.1:8000';

const getAvatarUrl = (path: string | null): string | undefined => {
    if (!path) return undefined;
    if (path.startsWith('http')) return path;
    return `${BASE_URL}${path.startsWith('/') ? '' : '/'}${path}`;
};

const Field = ({ label, required = false, children }: { label: string; required?: boolean; children: React.ReactNode }) => (
    <div className="w-full">
        <label className="block text-[13px] font-semibold text-slate-700 mb-1.5">{label}{required && <span className="text-rose-600 ml-0.5">*</span>}</label>
        {children}
    </div>
);

const inputCls = ui.inputBase;

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
        <div className="pb-12 text-left text-slate-800">
            <div className="max-w-[1200px] mx-auto">

                <PageHeader
                    title="Customers"
                    breadcrumbs={[{ label: 'Console', href: '/admin/dashboard' }, { label: 'Customers' }]}
                    actions={
                        <Button onClick={openAdd} className="whitespace-nowrap">
                            <Plus size={16} /> Add New Customer
                        </Button>
                    }
                />

                {/* Search & Filters */}
                <Card className="p-4 sm:p-5 mb-6 flex flex-col sm:flex-row gap-3 sm:gap-4 items-stretch sm:items-center">
                    <div className="relative flex-1">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                        <input
                            value={search}
                            onChange={e => setSearch(e.target.value)}
                            placeholder="Search by name, email or phone number..."
                            className={inputCls + ' pl-10'}
                        />
                    </div>
                    <Button variant="outline" onClick={loadCustomers} disabled={loading} className="whitespace-nowrap">
                        <RefreshCw size={14} className={loading ? 'animate-spin' : ''} /> <span className="hidden xs:inline">Sync Directory</span><span className="xs:hidden">Sync</span>
                    </Button>
                </Card>

                {/* ── Mobile Card List ── */}
                <div className="md:hidden space-y-3 mb-6">
                    {loading && customers.length === 0 ? (
                        <Card className="py-16 text-center">
                            <Loader2 size={32} className="animate-spin text-indigo-600 mx-auto mb-3" />
                            <p className="text-[13px] text-slate-500 font-medium">Loading customer directory...</p>
                        </Card>
                    ) : filteredCustomers.length === 0 ? (
                        <Card className="py-16 text-center">
                            <p className="text-[13px] text-slate-500">No customer accounts found.</p>
                        </Card>
                    ) : (
                        paginatedItems.map(cust => (
                            <Card key={cust.id} className="p-4 space-y-3 text-left">
                                {/* Row 1: Avatar + Name / Staff status + Verified status */}
                                <div className="flex items-start justify-between gap-2">
                                    <div className="flex items-center gap-3">
                                        <div className="w-10 h-10 bg-slate-100 rounded-xl flex items-center justify-center text-slate-500 border border-slate-200 font-bold text-[15px] overflow-hidden shrink-0">
                                            {cust.avatar ? (
                                                <img src={getAvatarUrl(cust.avatar)} alt="" className="w-full h-full object-cover" />
                                            ) : (
                                                cust.first_name?.[0].toUpperCase()
                                            )}
                                        </div>
                                        <div>
                                            <h3 className="text-[14px] font-bold text-indigo-600 hover:text-indigo-700 hover:underline cursor-pointer flex items-center gap-1" onClick={() => setViewingCustomer(cust)}>
                                                {cust.first_name} {cust.last_name}
                                                {cust.is_staff && <Shield size={11} className="text-indigo-600 shrink-0" />}
                                            </h3>
                                            <div className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-0.5">ID: #{String(cust.id).slice(-6).toUpperCase()}</div>
                                        </div>
                                    </div>
                                    <Badge tone={cust.is_active !== false ? 'green' : 'red'}>
                                        {cust.is_active !== false ? 'Verified' : 'Suspended'}
                                    </Badge>
                                </div>

                                {/* Row 2: Email & Phone */}
                                <div className="border-t border-slate-100 pt-2.5 space-y-1.5 text-[12px] text-slate-500">
                                    <div className="flex items-center gap-2">
                                        <Mail size={12} className="text-slate-400" />
                                        <span className="text-slate-700 truncate">{cust.email}</span>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <Phone size={12} className="text-slate-400" />
                                        <span className="text-slate-700">{cust.phone || '—'}</span>
                                    </div>
                                </div>

                                {/* Row 3: Location */}
                                <div className="flex items-start gap-2 text-[11px] text-slate-500 bg-slate-50 border border-slate-100 rounded-lg p-2">
                                    <MapPin size={13} className="text-slate-400 mt-0.5 shrink-0" />
                                    <div>
                                        <div className="line-clamp-1">{cust.address || 'No address registered'}</div>
                                        {cust.city && <div className="text-[9px] text-slate-400 font-bold uppercase mt-0.5">{cust.city} {cust.country}</div>}
                                    </div>
                                </div>

                                {/* Row 4: Controls */}
                                <div className="flex items-center justify-end gap-2.5 pt-2 border-t border-slate-100">
                                    <button onClick={() => setViewingCustomer(cust)} className="text-[12px] font-bold text-slate-600 hover:underline">View</button>
                                    <span className="text-slate-300">|</span>
                                    <button onClick={() => openEdit(cust)} className="text-[12px] font-bold text-indigo-600 hover:underline">Edit</button>
                                    <span className="text-slate-300">|</span>
                                    <button onClick={() => setDeleteTarget(cust)} className="text-[12px] font-bold text-[#c40000] hover:underline">Delete</button>
                                </div>
                            </Card>
                        ))
                    )}
                </div>

                {/* Desktop Table */}
                <Card className="hidden md:block overflow-hidden">
                    <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse">
                            <thead>
                                <tr className="bg-slate-50/60 border-b border-slate-200/70">
                                    <th className="px-6 py-4 text-[11px] font-bold text-slate-400 uppercase tracking-wider">Customer Profile</th>
                                    <th className="px-6 py-4 text-[11px] font-bold text-slate-400 uppercase tracking-wider">Contact Details</th>
                                    <th className="px-6 py-4 text-[11px] font-bold text-slate-400 uppercase tracking-wider">Primary Location</th>
                                    <th className="px-6 py-4 text-[11px] font-bold text-slate-400 uppercase tracking-wider text-center">Status</th>
                                    <th className="px-6 py-4 text-[11px] font-bold text-slate-400 uppercase tracking-wider text-right">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                                {loading && customers.length === 0 ? (
                                    <tr><td colSpan={5} className="py-24 text-center text-[14px] text-slate-500 font-medium">Loading master customer directory...</td></tr>
                                ) : filteredCustomers.length === 0 ? (
                                    <tr><td colSpan={5} className="py-24 text-center text-[14px] text-slate-500 font-medium">No customer accounts found.</td></tr>
                                ) : (
                                    paginatedItems.map(cust => (
                                        <tr key={cust.id} className="hover:bg-slate-50 transition-colors group">
                                            <td className="px-6 py-5">
                                                <div className="flex items-center gap-4">
                                                    <div className="w-12 h-12 bg-slate-100 rounded-xl flex items-center justify-center text-slate-500 border border-slate-200 font-bold text-lg overflow-hidden">
                                                        {cust.avatar ? (
                                                            <img src={getAvatarUrl(cust.avatar)} alt="" className="w-full h-full object-cover" />
                                                        ) : (
                                                            cust.first_name?.[0].toUpperCase()
                                                        )}
                                                    </div>
                                                    <div>
                                                        <div className="text-[15px] font-bold text-indigo-600 hover:text-indigo-700 hover:underline cursor-pointer flex items-center gap-1.5" onClick={() => setViewingCustomer(cust)}>
                                                            {cust.first_name} {cust.last_name}
                                                            {cust.is_staff && <Shield size={12} className="text-indigo-600" />}
                                                        </div>
                                                        <div className="text-[11px] text-slate-400 font-bold uppercase tracking-widest mt-1">ID: #{String(cust.id).slice(-6).toUpperCase()}</div>
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="px-6 py-5">
                                                <div className="flex flex-col gap-1.5">
                                                    <div className="flex items-center gap-2 text-[13px] text-slate-700 font-medium">
                                                        <Mail size={12} className="text-slate-400" /> {cust.email}
                                                    </div>
                                                    <div className="flex items-center gap-2 text-[13px] text-slate-700 font-medium">
                                                        <Phone size={12} className="text-slate-400" /> {cust.phone || '—'}
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="px-6 py-5">
                                                <div className="flex items-start gap-2 text-[13px] text-slate-600 font-medium">
                                                    <MapPin size={14} className="text-slate-400 shrink-0 mt-0.5" />
                                                    <div className="flex flex-col">
                                                        <span className="line-clamp-1">{cust.address || 'No address registered'}</span>
                                                        <span className="text-[11px] text-slate-400 font-bold uppercase">{cust.city} {cust.country}</span>
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="px-6 py-5 text-center">
                                                <Badge tone={cust.is_active !== false ? 'green' : 'red'}>
                                                    {cust.is_active !== false ? 'Verified' : 'Suspended'}
                                                </Badge>
                                            </td>
                                            <td className="px-6 py-5 text-right">
                                                <div className="flex items-center justify-end gap-2.5">
                                                    <button onClick={() => setViewingCustomer(cust)} className="text-[12px] font-bold text-slate-600 hover:underline">View</button>
                                                    <span className="text-slate-300">|</span>
                                                    <button onClick={() => openEdit(cust)} className="text-[12px] font-bold text-indigo-600 hover:underline">Edit</button>
                                                    <span className="text-slate-300">|</span>
                                                    <button onClick={() => setDeleteTarget(cust)} className="text-[12px] font-bold text-[#c40000] hover:underline">Delete</button>
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
                {filteredCustomers.length > 0 && (
                    <Card className="mt-4 px-4 py-4 sm:px-6 flex flex-col sm:flex-row items-center justify-between gap-4 animate-in fade-in duration-500">
                        <div className="text-[12px] sm:text-[13px] text-slate-600 text-center sm:text-left">
                            Showing <span className="font-bold text-slate-900 tabular-nums">{(currentPage - 1) * itemsPerPage + 1}</span> to <span className="font-bold text-slate-900 tabular-nums">{Math.min(currentPage * itemsPerPage, filteredCustomers.length)}</span> of <span className="font-bold text-slate-900 tabular-nums">{filteredCustomers.length}</span> customers
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

            {/* Form Modal (Add/Edit) */}
            <Modal
                open={showModal}
                onClose={() => setShowModal(false)}
                title={editTarget ? 'Edit Customer Account' : 'Register New Customer'}
                size="lg"
                footer={
                    <>
                        <Button variant="outline" onClick={() => setShowModal(false)}>Cancel</Button>
                        <Button type="submit" form="customer-form" disabled={saving}>
                            {saving ? <RefreshCw size={16} className="animate-spin" /> : <Save size={16} />} {editTarget ? 'Update Customer' : 'Register Account'}
                        </Button>
                    </>
                }
            >
                <form id="customer-form" onSubmit={handleSubmit}>
                    <div className="grid grid-cols-2 gap-5 mb-5">
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
                                <div className="w-10 h-10 bg-slate-100 rounded-lg border border-slate-200 flex items-center justify-center overflow-hidden">
                                    {formData.avatar ? (
                                        <img src={typeof formData.avatar === 'string' ? getAvatarUrl(formData.avatar) : URL.createObjectURL(formData.avatar)} alt="" className="w-full h-full object-cover" />
                                    ) : <User size={14} className="text-slate-400" />}
                                </div>
                                <input type="file" accept="image/*" className="text-[11px] file:h-[26px] file:bg-slate-100 file:border file:border-slate-200 file:rounded-lg file:px-2 file:mr-2 file:cursor-pointer file:text-slate-600 file:font-semibold"
                                    onChange={e => {
                                        const file = e.target.files?.[0];
                                        if (file) setFormData({...formData, avatar: file});
                                    }}
                                />
                            </div>
                        </Field>
                    </div>
                    <div className="space-y-5">
                        <Field label="Permanent Address">
                            <input className={inputCls} value={formData.address} onChange={e => setFormData({...formData, address: e.target.value})} placeholder="Street address, apartment, etc." />
                        </Field>
                        <div className="grid grid-cols-3 gap-5">
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
                        <div className="grid grid-cols-2 gap-5">
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
                </form>
            </Modal>

            {/* CUSTOMER DETAIL MODAL (QUICK VIEW) */}
            {viewingCustomer && (
                <div className="fixed inset-0 z-[1000] flex items-center justify-center p-4 py-12 bg-slate-900/50 backdrop-blur-sm animate-in fade-in duration-300 overflow-y-auto">
                    <div className="bg-white rounded-2xl w-full max-w-4xl my-auto shadow-2xl animate-in zoom-in-95 duration-500 overflow-hidden border border-slate-200 max-h-none flex flex-col">
                        {/* Header */}
                        <div className="bg-slate-900 px-8 py-5 flex items-center justify-between shrink-0">
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 bg-white rounded-full flex items-center justify-center p-0.5 border border-white/20 overflow-hidden shadow-inner shrink-0">
                                    {viewingCustomer.avatar ? (
                                        <img src={getAvatarUrl(viewingCustomer.avatar)} className="w-full h-full object-cover rounded-full" alt="" />
                                    ) : (
                                        <div className="w-full h-full flex items-center justify-center text-slate-900 font-bold text-xl uppercase bg-slate-100 rounded-full">{viewingCustomer.first_name?.[0]}</div>
                                    )}
                                </div>
                                <div className="min-w-0">
                                    <div className="flex items-center gap-2">
                                        <h2 className="text-white text-[18px] font-bold leading-none truncate">{viewingCustomer.first_name} {viewingCustomer.last_name}</h2>
                                        <div className="w-4 h-4 bg-indigo-600 rounded-sm flex items-center justify-center text-white text-[10px] font-black shadow-sm shrink-0">A</div>
                                    </div>
                                    <p className="text-slate-400 text-[11px] font-medium mt-1">Customer Registry Console • Member Management</p>
                                </div>
                            </div>
                            <button onClick={() => setViewingCustomer(null)} className="text-white/60 hover:text-white transition-colors p-1"><X size={22} /></button>
                        </div>

                        <div className="flex divide-x divide-slate-200">
                            {/* Identity Column */}
                            <div className="w-[320px] p-8 space-y-6">
                                <div className="space-y-4">
                                    <div className="aspect-square w-full bg-slate-100 rounded-2xl border border-slate-200 flex items-center justify-center overflow-hidden group">
                                        {viewingCustomer.avatar ? (
                                            <img src={getAvatarUrl(viewingCustomer.avatar)} className="w-full h-full object-cover transition-transform group-hover:scale-105 duration-700" alt="" />
                                        ) : (
                                            <User size={64} className="text-slate-300" />
                                        )}
                                    </div>
                                    <div>
                                        <h3 className="text-[24px] font-bold text-slate-900 tracking-tight leading-tight mb-1">{viewingCustomer.first_name} {viewingCustomer.last_name}</h3>
                                        <p className="text-[12px] text-indigo-600 font-bold uppercase tracking-[0.2em] mt-1">ID: #{String(viewingCustomer.id).slice(0, 8).toUpperCase()}</p>
                                    </div>
                                    <div className="flex items-center gap-2 pt-2">
                                        <Badge tone={viewingCustomer.is_active !== false ? 'green' : 'red'}>
                                            {viewingCustomer.is_active !== false ? 'Verified Member' : 'Suspended'}
                                        </Badge>
                                        <span className="text-[11px] text-slate-500 font-semibold border-l pl-2 border-slate-200">Retail Registry</span>
                                    </div>
                                </div>

                                <div className="pt-6 border-t border-slate-100">
                                    <Button
                                        onClick={() => { setViewingCustomer(null); openEdit(viewingCustomer); }}
                                        className="w-full"
                                    >
                                        <Pencil size={14} /> Update Retail Profile
                                    </Button>
                                </div>
                            </div>

                            {/* Details Grid Column */}
                            <div className="flex-1 p-10 bg-white">
                                <div className="grid grid-cols-1 gap-10">
                                    {/* Contact Section */}
                                    <div className="space-y-4">
                                        <h4 className="text-[13px] font-bold text-slate-900 uppercase tracking-wider border-b border-slate-100 pb-2">Customer Communication Details</h4>
                                        <div className="grid grid-cols-2 gap-8">
                                            <div className="space-y-1">
                                                <p className="text-[12px] font-semibold text-slate-400">Email Address</p>
                                                <p className="text-[14px] text-indigo-600 hover:text-indigo-700 hover:underline cursor-pointer truncate font-bold">{viewingCustomer.email}</p>
                                            </div>
                                            <div className="space-y-1">
                                                <p className="text-[12px] font-semibold text-slate-400">Mobile Connection</p>
                                                <p className="text-[14px] text-slate-900 font-bold">{viewingCustomer.phone || 'Not Registered'}</p>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Address Section */}
                                    <div className="space-y-4">
                                        <h4 className="text-[13px] font-bold text-slate-900 uppercase tracking-wider border-b border-slate-100 pb-2">Shipping & Residence Address</h4>
                                        <div className="flex gap-4 p-5 bg-slate-50 border border-slate-200/70 rounded-2xl relative overflow-hidden group">
                                            <div className="absolute top-0 left-0 w-1 h-full bg-indigo-200 group-hover:bg-indigo-600 transition-colors" />
                                            <MapPin size={24} className="text-slate-400 shrink-0 mt-0.5" />
                                            <div className="space-y-1">
                                                <p className="text-[14px] text-slate-900 leading-relaxed font-semibold">
                                                    {viewingCustomer.address || 'No physical delivery address provided for this member.'}
                                                </p>
                                                {viewingCustomer.city && <p className="text-[10px] text-slate-500 font-bold uppercase tracking-[0.2em]">{viewingCustomer.city}, {viewingCustomer.country}</p>}
                                            </div>
                                        </div>
                                    </div>

                                    {/* Account Intelligence */}
                                    <div className="space-y-4">
                                        <h4 className="text-[13px] font-bold text-slate-900 uppercase tracking-wider border-b border-slate-100 pb-2">Account Intelligence</h4>
                                        <div className="grid grid-cols-3 gap-6">
                                            <div className="bg-white p-4 border border-slate-200/70 rounded-xl shadow-[0_1px_2px_rgba(15,23,42,0.04)] hover:border-slate-300 transition-colors">
                                                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Member Since</p>
                                                <p className="text-[14px] font-bold text-slate-900">{new Date(viewingCustomer.created_at || Date.now()).toLocaleDateString('en-US', { day: 'numeric', month: 'short', year: 'numeric' })}</p>
                                            </div>
                                            <div className="bg-white p-4 border border-slate-200/70 rounded-xl shadow-[0_1px_2px_rgba(15,23,42,0.04)] hover:border-slate-300 transition-colors">
                                                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Account Standing</p>
                                                <div className="flex items-center gap-1.5 text-[14px] font-bold text-emerald-600">
                                                    <CheckCircle size={16} /> Excellent
                                                </div>
                                            </div>
                                            <div className="bg-white p-4 border border-slate-200/70 rounded-xl shadow-[0_1px_2px_rgba(15,23,42,0.04)] hover:border-slate-300 transition-colors">
                                                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Security</p>
                                                <div className="flex items-center gap-1.5 text-[14px] font-bold text-slate-900">
                                                    <Shield size={16} className="text-indigo-600" /> Protected
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                <div className="mt-12 pt-8 border-t border-slate-100 flex justify-end">
                                    <Button variant="outline" onClick={() => setViewingCustomer(null)} className="px-12">
                                        Close Details
                                    </Button>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Delete Confirmation Modal */}
            <Modal open={!!deleteTarget} onClose={() => setDeleteTarget(null)} size="sm">
                {deleteTarget && (
                    <div className="text-center py-2">
                        <div className="w-16 h-16 bg-rose-50 rounded-full flex items-center justify-center text-rose-600 mx-auto mb-6">
                            <Trash2 size={32} />
                        </div>
                        <h3 className="text-[18px] font-bold text-slate-900 tracking-tight mb-2">Confirm Deletion</h3>
                        <p className="text-[13px] text-slate-600 leading-relaxed mb-8">
                            Are you sure you want to remove <span className="font-bold text-slate-900">{deleteTarget.first_name} {deleteTarget.last_name}</span>? This action cannot be undone.
                        </p>
                        <div className="flex gap-3">
                            <Button variant="danger" onClick={handleDelete} disabled={saving} className="flex-1">
                                {saving ? <RefreshCw className="h-4 w-4 animate-spin" /> : 'Yes, Delete'}
                            </Button>
                            <Button variant="outline" onClick={() => setDeleteTarget(null)} className="flex-1">
                                Cancel
                            </Button>
                        </div>
                    </div>
                )}
            </Modal>
        </div>
    );
}
