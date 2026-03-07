'use client';

import { useState, useEffect, useRef } from 'react';
import {
    Building2, Plus, Pencil, Trash2, Save, X,
    AlertCircle, Loader2, Search, RefreshCw,
    CheckCircle, ArrowLeft, Mail, Phone,
    MapPin, Hash, Map, Globe, Sparkles, Star, ArrowRight, Tag
} from 'lucide-react';
import { companyService, companyCategoryService, CompanyInfo, CompanyCategory } from '@/lib/api';

// ─── Shared input/label style ─────────────────────────────────────────────────
const INPUT = (err?: boolean) =>
    `w-full px-4 py-3 bg-gray-50 border rounded-xl text-sm font-medium text-gray-900 outline-none transition-all
    focus:bg-white focus:ring-2 placeholder:text-gray-400
    ${err
        ? 'border-red-300 focus:ring-red-200 focus:border-red-400'
        : 'border-gray-200 focus:ring-[#FF9900]/20 focus:border-[#FF9900]'}`;

const LABEL = 'block text-[10px] font-black uppercase tracking-widest text-gray-500 mb-2';

const EMPTY: Partial<CompanyInfo> = {
    name: '', email: '', phone: '', address: '', city: '', tax_number: '', website: ''
};

// ─── Success Popup ────────────────────────────────────────────────────────────
function SuccessPopup({
    companyName, isEdit, onDone
}: {
    companyName: string;
    isEdit: boolean;
    onDone: () => void;
}) {
    const [visible, setVisible] = useState(false);
    const timerRef = useRef<ReturnType<typeof setTimeout>>();

    useEffect(() => {
        document.body.style.overflow = 'hidden';
        requestAnimationFrame(() => setVisible(true));
        timerRef.current = setTimeout(() => handleClose(), 2800);
        return () => {
            document.body.style.overflow = '';
            clearTimeout(timerRef.current);
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const handleClose = () => {
        clearTimeout(timerRef.current);
        setVisible(false);
        setTimeout(onDone, 350);
    };

    const particles = Array.from({ length: 16 }, (_, i) => ({
        id: i,
        x: 10 + (i * 73 + 17) % 80,
        y: 10 + (i * 47 + 33) % 80,
        size: 4 + (i % 4) * 3,
        delay: (i * 0.15) % 1.2,
        color: i % 4 === 0 ? '#FF9900' : i % 4 === 1 ? '#FFD700' : i % 4 === 2 ? '#232F3E' : '#10B981',
    }));

    return (
        <div
            className="fixed inset-0 z-[200] flex items-center justify-center p-4"
            style={{
                background: 'rgba(0,0,0,0.65)',
                backdropFilter: 'blur(14px)',
                WebkitBackdropFilter: 'blur(14px)',
                transition: 'opacity 0.35s ease',
                opacity: visible ? 1 : 0,
            }}
        >
            {/* Floating particles */}
            {particles.map(p => (
                <div
                    key={p.id}
                    className="absolute rounded-full pointer-events-none"
                    style={{
                        left: `${p.x}%`,
                        top: `${p.y}%`,
                        width: p.size,
                        height: p.size,
                        background: p.color,
                        opacity: visible ? 0.65 : 0,
                        transform: visible
                            ? `translateY(-${20 + p.id * 5}px) scale(1)`
                            : 'translateY(0) scale(0)',
                        transition: `all 1.5s ease ${p.delay}s`,
                    }}
                />
            ))}

            {/* Main Card */}
            <div
                className="relative bg-white rounded-3xl w-full max-w-md overflow-hidden shadow-[0_40px_100px_rgba(0,0,0,0.4)]"
                style={{
                    transition: 'transform 0.45s cubic-bezier(0.34,1.56,0.64,1), opacity 0.35s ease',
                    transform: visible ? 'translateY(0) scale(1)' : 'translateY(50px) scale(0.92)',
                    opacity: visible ? 1 : 0,
                }}
            >
                {/* ── Dark Header ── */}
                <div className="relative bg-gradient-to-br from-[#131921] via-[#1c2b3a] to-[#232F3E] pt-12 pb-8 px-8 flex flex-col items-center overflow-hidden">
                    {/* Glow blobs */}
                    <div className="absolute top-0 left-1/2 -translate-x-1/2 w-64 h-32 bg-[#FF9900]/20 blur-[60px] pointer-events-none rounded-full" />
                    <div className="absolute -bottom-4 right-0 w-40 h-24 bg-emerald-400/10 blur-[50px] pointer-events-none rounded-full" />

                    {/* Checkmark ring */}
                    <div className="relative mb-5">
                        {/* Outer pulse */}
                        <div
                            className="absolute inset-0 rounded-full bg-emerald-400/20"
                            style={{
                                transform: visible ? 'scale(1.8)' : 'scale(1)',
                                opacity: visible ? 0 : 0.6,
                                transition: 'transform 1.2s ease 0.3s, opacity 1.2s ease 0.3s',
                            }}
                        />
                        {/* Middle ring */}
                        <div
                            className="absolute inset-0 rounded-full bg-emerald-400/15"
                            style={{
                                transform: visible ? 'scale(1.45)' : 'scale(1)',
                                opacity: visible ? 0 : 0.5,
                                transition: 'transform 1s ease 0.2s, opacity 1s ease 0.2s',
                            }}
                        />
                        {/* Icon */}
                        <div
                            className="relative w-24 h-24 bg-gradient-to-br from-emerald-400 to-emerald-600 rounded-full flex items-center justify-center shadow-[0_8px_32px_rgba(16,185,129,0.5)]"
                            style={{
                                transform: visible ? 'scale(1) rotate(0deg)' : 'scale(0.3) rotate(-180deg)',
                                transition: 'transform 0.6s cubic-bezier(0.34,1.56,0.64,1) 0.1s',
                            }}
                        >
                            <CheckCircle className="h-12 w-12 text-white" strokeWidth={2} />
                        </div>
                    </div>

                    {/* Stars */}
                    {(['-left-1 top-2', 'right-2 top-1', 'left-4 bottom-4', 'right-6 bottom-6'] as const).map((pos, i) => (
                        <Star
                            key={i}
                            className={`absolute ${pos} text-[#FF9900] fill-[#FF9900]`}
                            style={{
                                width: 10 + (i % 2) * 6,
                                height: 10 + (i % 2) * 6,
                                opacity: visible ? 0.8 : 0,
                                transform: visible ? 'scale(1) rotate(0deg)' : 'scale(0) rotate(90deg)',
                                transition: `all 0.6s ease ${0.3 + i * 0.1}s`,
                            }}
                        />
                    ))}

                    {/* Sparkles */}
                    <Sparkles
                        className="absolute top-4 right-4 text-[#FF9900]/60"
                        style={{
                            width: 20, height: 20,
                            opacity: visible ? 1 : 0,
                            transition: 'opacity 0.5s ease 0.4s',
                        }}
                    />

                    {/* Title */}
                    <div
                        className="text-center relative"
                        style={{
                            opacity: visible ? 1 : 0,
                            transform: visible ? 'translateY(0)' : 'translateY(16px)',
                            transition: 'all 0.5s ease 0.35s',
                        }}
                    >
                        <p className="text-[9px] font-black uppercase tracking-[0.3em] text-emerald-400 mb-1">
                            {isEdit ? 'Updated Successfully' : 'Created Successfully'}
                        </p>
                        <h2 className="text-2xl font-black text-white tracking-tight">
                            {isEdit ? 'Changes Saved!' : 'Company Added!'}
                        </h2>
                    </div>
                </div>

                {/* ── White Body ── */}
                <div
                    className="p-7"
                    style={{
                        opacity: visible ? 1 : 0,
                        transform: visible ? 'translateY(0)' : 'translateY(12px)',
                        transition: 'all 0.5s ease 0.5s',
                    }}
                >
                    {/* Company name badge */}
                    <div className="flex items-center gap-3 bg-gray-50 border border-gray-100 rounded-2xl p-4 mb-5">
                        <div className="w-10 h-10 bg-gradient-to-br from-[#FF9900] to-[#e68a00] rounded-xl flex items-center justify-center flex-shrink-0 shadow-sm">
                            <Building2 className="h-5 w-5 text-white" strokeWidth={2.5} />
                        </div>
                        <div className="min-w-0 flex-1">
                            <p className="text-[9px] font-black uppercase tracking-widest text-gray-400 mb-0.5">Company Name</p>
                            <p className="font-black text-gray-900 text-sm truncate">{companyName}</p>
                        </div>
                        <CheckCircle className="h-5 w-5 text-emerald-500 flex-shrink-0" />
                    </div>

                    {/* Message */}
                    <p className="text-center text-sm text-gray-500 font-medium mb-6">
                        {isEdit
                            ? 'Your company details have been updated and saved successfully.'
                            : 'Your new company profile is now live and ready to use.'}
                    </p>

                    {/* Auto-dismiss progress bar */}
                    <div className="w-full h-1 bg-gray-100 rounded-full overflow-hidden mb-5">
                        <div
                            className="h-full bg-gradient-to-r from-[#FF9900] to-emerald-400 rounded-full"
                            style={{
                                width: visible ? '0%' : '100%',
                                transition: 'width 2.8s linear',
                            }}
                        />
                    </div>

                    {/* Button */}
                    <button
                        onClick={handleClose}
                        className="w-full flex items-center justify-center gap-2.5 py-3.5 bg-gradient-to-r from-[#131921] to-[#232F3E] text-white font-black text-xs uppercase tracking-widest rounded-xl hover:shadow-[0_8px_24px_rgba(19,25,33,0.35)] hover:-translate-y-0.5 transition-all group"
                    >
                        Go to Companies
                        <ArrowRight className="h-4 w-4 group-hover:translate-x-1 transition-transform" strokeWidth={2.5} />
                    </button>
                </div>
            </div>
        </div>
    );
}

// ─── Company Form ─────────────────────────────────────────────────────────────
function CompanyForm({
    editCompany, onCancel, onSaved,
}: {
    editCompany?: CompanyInfo | null;
    onCancel: () => void;
    onSaved: (c: CompanyInfo) => void;
}) {
    const [form, setForm] = useState({ ...EMPTY } as any);
    const [saving, setSaving] = useState(false);
    const [errors, setErrors] = useState<Record<string, string>>({});
    const [apiError, setApiError] = useState('');
    const [successData, setSuccessData] = useState<{ name: string; isEdit: boolean } | null>(null);

    useEffect(() => {
        if (editCompany) {
            setForm({
                name: editCompany.name || '',
                email: editCompany.email || '',
                phone: editCompany.phone || '',
                address: editCompany.address || '',
                city: editCompany.city || '',
                tax_number: editCompany.tax_number || '',
                website: editCompany.website || '',
                category: editCompany.category || '',
            });
        }
    }, [editCompany]);

    const COLOR_PALETTE = [
        { bg: 'bg-emerald-50', border: 'border-emerald-200', text: 'text-emerald-700', dot: 'bg-emerald-500', val: 'emerald' },
        { bg: 'bg-blue-50', border: 'border-blue-200', text: 'text-blue-700', dot: 'bg-blue-500', val: 'blue' },
        { bg: 'bg-violet-50', border: 'border-violet-200', text: 'text-violet-700', dot: 'bg-violet-500', val: 'violet' },
        { bg: 'bg-amber-50', border: 'border-amber-200', text: 'text-amber-700', dot: 'bg-amber-500', val: 'amber' },
        { bg: 'bg-red-50', border: 'border-red-200', text: 'text-red-700', dot: 'bg-red-500', val: 'red' },
        { bg: 'bg-sky-50', border: 'border-sky-200', text: 'text-sky-700', dot: 'bg-sky-500', val: 'sky' },
        { bg: 'bg-orange-50', border: 'border-orange-200', text: 'text-orange-700', dot: 'bg-orange-500', val: 'orange' },
        { bg: 'bg-pink-50', border: 'border-pink-200', text: 'text-pink-700', dot: 'bg-pink-500', val: 'pink' },
        { bg: 'bg-indigo-50', border: 'border-indigo-200', text: 'text-indigo-700', dot: 'bg-indigo-500', val: 'indigo' },
        { bg: 'bg-teal-50', border: 'border-teal-200', text: 'text-teal-700', dot: 'bg-teal-500', val: 'teal' },
    ];
    const getColor = (val: string) => COLOR_PALETTE.find(c => c.val === val) || COLOR_PALETTE[0];

    const h = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
        setForm((p: any) => ({ ...p, [e.target.name]: e.target.value }));
        setErrors(p => ({ ...p, [e.target.name]: '' }));
    };

    const validate = () => {
        const e: Record<string, string> = {};
        if (!form.name?.trim()) e.name = 'Company name is required';
        if (!form.email?.trim()) e.email = 'Email is required';
        if (!form.phone?.trim()) e.phone = 'Phone is required';
        if (!form.city?.trim()) e.city = 'City is required';
        if (!form.address?.trim()) e.address = 'Address is required';
        setErrors(e);
        return Object.keys(e).length === 0;
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setApiError('');
        if (!validate()) return;
        setSaving(true);
        try {
            // Build a plain object — service will try JSON first, then FormData
            const payload: Partial<CompanyInfo> = {};
            (Object.keys(form) as (keyof typeof form)[]).forEach(k => {
                if (form[k] !== null && form[k] !== undefined && form[k] !== '') {
                    (payload as any)[k] = form[k];
                }
            });
            let result: CompanyInfo;
            const isEdit = !!editCompany?.id;
            if (isEdit) {
                result = await companyService.update(editCompany!.id!, payload);
            } else {
                result = await companyService.create(payload);
            }
            // Show success popup, then notify parent after popup closes
            setSuccessData({ name: result.name || form.name, isEdit });
            setTimeout(() => onSaved(result), 100);
        } catch (err: any) {
            const msg = err?.response?.data
                ? Object.values(err.response.data).flat().join(', ')
                : err?.message || 'Failed to save. Please try again.';
            setApiError(msg);
        } finally {
            setSaving(false);
        }
    };

    const [categories, setCategories] = useState<CompanyCategory[]>([]);
    useEffect(() => {
        companyCategoryService.getAll().then(setCategories);
    }, []);

    const selectedCat = categories.find(c => String(c.id) === String(form.category));
    const catColor = selectedCat?.color || 'emerald';
    const c = getColor(catColor);

    return (
        <>
            {/* ── Success Popup ── */}
            {successData && (
                <SuccessPopup
                    companyName={successData.name}
                    isEdit={successData.isEdit}
                    onDone={() => setSuccessData(null)}
                />
            )}

            <div className="max-w-[1600px] mx-auto space-y-6 pb-12 font-sans px-3 sm:px-6 mt-6">
                {/* Page Header */}
                <div className="flex items-center gap-4">
                    <button onClick={onCancel}
                        className="p-2.5 bg-white border border-gray-200 rounded-xl text-gray-500 hover:text-[#FF9900] hover:bg-[#FF9900]/10 hover:border-[#FF9900]/30 transition-all shadow-sm">
                        <ArrowLeft className="h-5 w-5" strokeWidth={2.5} />
                    </button>
                    <div>
                        <h1 className="text-xl font-black text-gray-900 tracking-tight">
                            {editCompany ? 'Edit Company' : 'Add New Company'}
                        </h1>
                        <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mt-0.5">
                            {editCompany ? `Editing: ${editCompany.name}` : 'Create a new business profile'}
                        </p>
                    </div>
                </div>

                <form onSubmit={handleSubmit} noValidate>
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

                        {/* Left — Main Info */}
                        <div className="lg:col-span-2 space-y-6">

                            {/* Error Banner */}
                            {apiError && (
                                <div className="flex items-center gap-3 bg-red-50 border border-red-200 text-red-700 text-sm font-bold px-5 py-4 rounded-2xl">
                                    <AlertCircle className="h-4 w-4 flex-shrink-0" />
                                    {apiError}
                                </div>
                            )}

                            {/* Basic Info */}
                            <div className="bg-white rounded-2xl border border-gray-200 shadow-md p-7 relative overflow-hidden">
                                <div className="absolute top-0 right-0 w-48 h-48 bg-[#FF9900]/5 rounded-full blur-[60px] pointer-events-none" />
                                <div className="flex items-center justify-between mb-6">
                                    <div className="flex items-center gap-3">
                                        <div className="w-8 h-8 bg-[#FF9900]/10 rounded-xl flex items-center justify-center">
                                            <Building2 className="h-4 w-4 text-[#FF9900]" strokeWidth={2.5} />
                                        </div>
                                        <h2 className="text-sm font-black text-gray-900 uppercase tracking-widest">Basic Information</h2>
                                    </div>

                                    {/* Category pill */}
                                    {selectedCat && (
                                        <span className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-[0.1em] border animate-in fade-in zoom-in duration-300 ${c.bg} ${c.border} ${c.text}`}>
                                            <span className={`w-1.5 h-1.5 rounded-full ${c.dot}`} />
                                            {selectedCat.name}
                                        </span>
                                    )}
                                </div>

                                <div className="space-y-5">
                                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
                                        <div className="sm:col-span-2">
                                            <label className={LABEL}>Company Name <span className="text-red-500">*</span></label>
                                            <div className="relative">
                                                <Building2 className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                                                <input name="name" value={form.name} onChange={h}
                                                    placeholder="e.g. Al-Qavi Cosmetics"
                                                    className={INPUT(!!errors.name) + ' pl-10'} />
                                            </div>
                                            {errors.name && <p className="text-red-500 text-[10px] font-bold mt-1">{errors.name}</p>}
                                        </div>
                                        <div>
                                            <label className={LABEL}>Category <span className="text-red-500">*</span></label>
                                            <div className="relative">
                                                <Tag className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                                                <select
                                                    name="category"
                                                    value={form.category || ''}
                                                    onChange={h as any}
                                                    className={INPUT() + ' pl-10 appearance-none'}
                                                >
                                                    <option value="">Select Category</option>
                                                    {categories.map(cat => (
                                                        <option key={cat.id} value={cat.id}>{cat.name}</option>
                                                    ))}
                                                </select>
                                                <div className="absolute right-3.5 top-1/2 -translate-y-1/2 pointer-events-none">
                                                    <div className="w-1.5 h-1.5 border-b-2 border-r-2 border-gray-400 rotate-45 mb-0.5" />
                                                </div>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                                        <div>
                                            <label className={LABEL}>Tax / NTN Number</label>
                                            <div className="relative">
                                                <Hash className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                                                <input name="tax_number" value={form.tax_number} onChange={h}
                                                    placeholder="1234567-8"
                                                    className={INPUT() + ' pl-10'} />
                                            </div>
                                        </div>
                                        <div>
                                            <label className={LABEL}>Website</label>
                                            <div className="relative">
                                                <Globe className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                                                <input name="website" value={form.website} onChange={h}
                                                    placeholder="https://yoursite.com"
                                                    className={INPUT() + ' pl-10'} />
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Contact */}
                            <div className="bg-white rounded-2xl border border-gray-200 shadow-md p-7 relative overflow-hidden">
                                <div className="flex items-center gap-3 mb-6">
                                    <div className="w-8 h-8 bg-blue-50 rounded-xl flex items-center justify-center">
                                        <Phone className="h-4 w-4 text-blue-500" strokeWidth={2.5} />
                                    </div>
                                    <h2 className="text-sm font-black text-gray-900 uppercase tracking-widest">Contact Details</h2>
                                </div>
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                                    <div>
                                        <label className={LABEL}>Email Address <span className="text-red-500">*</span></label>
                                        <div className="relative">
                                            <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                                            <input name="email" type="email" value={form.email} onChange={h}
                                                placeholder="info@company.com"
                                                className={INPUT(!!errors.email) + ' pl-10'} />
                                        </div>
                                        {errors.email && <p className="text-red-500 text-[10px] font-bold mt-1">{errors.email}</p>}
                                    </div>
                                    <div>
                                        <label className={LABEL}>Phone Number <span className="text-red-500">*</span></label>
                                        <div className="relative">
                                            <Phone className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                                            <input name="phone" value={form.phone} onChange={h}
                                                placeholder="+92 300 0000000"
                                                className={INPUT(!!errors.phone) + ' pl-10'} />
                                        </div>
                                        {errors.phone && <p className="text-red-500 text-[10px] font-bold mt-1">{errors.phone}</p>}
                                    </div>
                                </div>
                            </div>

                            {/* Location */}
                            <div className="bg-white rounded-2xl border border-gray-200 shadow-md p-7 relative overflow-hidden">
                                <div className="flex items-center gap-3 mb-6">
                                    <div className="w-8 h-8 bg-emerald-50 rounded-xl flex items-center justify-center">
                                        <MapPin className="h-4 w-4 text-emerald-500" strokeWidth={2.5} />
                                    </div>
                                    <h2 className="text-sm font-black text-gray-900 uppercase tracking-widest">Location</h2>
                                </div>
                                <div className="space-y-5">
                                    <div>
                                        <label className={LABEL}>City <span className="text-red-500">*</span></label>
                                        <div className="relative">
                                            <Map className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                                            <input name="city" value={form.city} onChange={h}
                                                placeholder="Lahore"
                                                className={INPUT(!!errors.city) + ' pl-10'} />
                                        </div>
                                        {errors.city && <p className="text-red-500 text-[10px] font-bold mt-1">{errors.city}</p>}
                                    </div>
                                    <div>
                                        <label className={LABEL}>Full Address <span className="text-red-500">*</span></label>
                                        <div className="relative">
                                            <MapPin className="absolute left-3.5 top-3.5 h-4 w-4 text-gray-400" />
                                            <textarea name="address" value={form.address} onChange={h} rows={3}
                                                placeholder="Street, Area, City"
                                                className={INPUT(!!errors.address) + ' pl-10 resize-none'} />
                                        </div>
                                        {errors.address && <p className="text-red-500 text-[10px] font-bold mt-1">{errors.address}</p>}
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Right — Actions */}
                        <div className="space-y-6">
                            <div className="bg-white rounded-2xl border border-gray-200 shadow-md p-6">
                                <button type="submit" disabled={saving}
                                    className="w-full flex items-center justify-center gap-2.5 py-3 bg-gradient-to-r from-[#FF9900] to-[#e68a00] text-white font-black text-xs uppercase tracking-widest rounded-xl hover:shadow-[0_8px_20px_rgba(0,113,133,0.3)] hover:-translate-y-0.5 transition-all disabled:opacity-60 disabled:transform-none mb-3">
                                    {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" strokeWidth={2.5} />}
                                    {saving ? 'Saving...' : editCompany ? 'Save Changes' : 'Add Company'}
                                </button>
                                <button type="button" onClick={onCancel}
                                    className="w-full py-3 bg-white border border-gray-200 text-gray-700 font-black text-xs uppercase tracking-widest rounded-xl hover:bg-gray-50 transition-all">
                                    Cancel
                                </button>
                            </div>

                            <div className="bg-white rounded-2xl border border-gray-200 shadow-md p-6">
                                <p className="text-[10px] font-black uppercase tracking-widest text-gray-400 mb-3">Tips</p>
                                <ul className="space-y-2 text-[11px] font-medium text-gray-500">
                                    <li className="flex items-start gap-2"><CheckCircle className="h-3.5 w-3.5 text-emerald-400 mt-0.5 flex-shrink-0" />Fields marked with <span className="text-red-400 font-bold">*</span> are required</li>
                                    <li className="flex items-start gap-2"><CheckCircle className="h-3.5 w-3.5 text-emerald-400 mt-0.5 flex-shrink-0" />Use a valid business email address</li>
                                    <li className="flex items-start gap-2"><CheckCircle className="h-3.5 w-3.5 text-emerald-400 mt-0.5 flex-shrink-0" />NTN number helps with invoicing</li>
                                </ul>
                            </div>
                        </div>
                    </div>
                </form>
            </div>
        </>
    );
}

// ─── Delete Confirm Modal ─────────────────────────────────────────────────────
function DeleteModal({ company, onClose, onDeleted }: {
    company: CompanyInfo;
    onClose: () => void;
    onDeleted: (id: number) => void;
}) {
    const [loading, setLoading] = useState(false);

    const handleDelete = async () => {
        setLoading(true);
        try {
            await companyService.delete(company.id!);
            onDeleted(company.id!);
        } catch { setLoading(false); }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
            <div className="bg-white rounded-3xl shadow-2xl w-full max-w-sm border border-gray-100 overflow-hidden">
                <div className="flex justify-center pt-8 pb-2">
                    <div className="relative">
                        <div className="absolute inset-0 bg-red-100 rounded-full animate-pulse scale-125" />
                        <div className="relative w-16 h-16 bg-red-50 rounded-2xl border border-red-100 flex items-center justify-center">
                            <Trash2 className="h-7 w-7 text-red-500" strokeWidth={2.5} />
                        </div>
                    </div>
                </div>
                <div className="px-8 py-6 text-center">
                    <h2 className="text-xl font-black text-gray-900 mb-2">Delete Company?</h2>
                    <p className="text-sm font-medium text-gray-500">
                        You're about to permanently delete <span className="font-black text-gray-900">"{company.name}"</span>.
                    </p>
                    <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest mt-4">This action cannot be undone</p>
                </div>
                <div className="px-8 pb-8 flex gap-3">
                    <button onClick={onClose}
                        className="flex-1 py-3 bg-white border border-gray-200 text-gray-700 font-black text-xs uppercase tracking-widest rounded-xl hover:bg-gray-50 transition-all">
                        Cancel
                    </button>
                    <button onClick={handleDelete} disabled={loading}
                        className="flex-1 py-3 bg-gradient-to-r from-red-500 to-rose-600 text-white font-black text-xs uppercase tracking-widest rounded-xl hover:shadow-[0_8px_20px_rgba(239,68,68,0.3)] hover:-translate-y-0.5 transition-all flex items-center justify-center gap-2 disabled:opacity-60">
                        {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" strokeWidth={2.5} />}
                        {loading ? 'Deleting...' : 'Delete'}
                    </button>
                </div>
            </div>
        </div>
    );
}

// ─── Main Page ────────────────────────────────────────────────────────────────
export default function CompanyPage() {
    const [view, setView] = useState<'list' | 'form'>('list');
    const [companies, setCompanies] = useState<CompanyInfo[]>([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');
    const [editCompany, setEditCompany] = useState<CompanyInfo | null>(null);
    const [deleteCompany, setDeleteCompany] = useState<CompanyInfo | null>(null);
    const [toast, setToast] = useState<{ msg: string; type: 'success' | 'error' } | null>(null);

    const load = async () => {
        setLoading(true);
        const data = await companyService.getAll();
        setCompanies(data);
        setLoading(false);
    };

    useEffect(() => { load(); }, []);

    const showToast = (msg: string, type: 'success' | 'error' = 'success') => {
        setToast({ msg, type });
        setTimeout(() => setToast(null), 3500);
    };

    const filtered = companies.filter(c =>
        c.name?.toLowerCase().includes(search.toLowerCase()) ||
        c.email?.toLowerCase().includes(search.toLowerCase()) ||
        c.city?.toLowerCase().includes(search.toLowerCase())
    );

    const handleSaved = (saved: CompanyInfo) => {
        setCompanies(prev => {
            const idx = prev.findIndex(c => c.id === saved.id);
            if (idx >= 0) { const u = [...prev]; u[idx] = saved; return u; }
            return [saved, ...prev];
        });
        showToast(editCompany ? 'Company updated successfully!' : 'Company created successfully!');
        setView('list');
        setEditCompany(null);
    };

    const handleDeleted = (id: number) => {
        const name = companies.find(c => c.id === id)?.name || 'Company';
        setCompanies(prev => prev.filter(c => c.id !== id));
        setDeleteCompany(null);
        showToast(`"${name}" deleted successfully.`);
    };

    if (view === 'form') {
        return (
            <CompanyForm
                editCompany={editCompany}
                onCancel={() => { setView('list'); setEditCompany(null); }}
                onSaved={handleSaved}
            />
        );
    }

    return (
        <div className="max-w-[1600px] mx-auto space-y-6 pb-12 font-sans px-3 sm:px-6 mt-6 relative z-0">

            {/* Ambient Glow */}
            <div className="fixed top-0 left-0 w-full h-full overflow-hidden pointer-events-none -z-10">
                <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] rounded-full bg-[#FF9900]/15 blur-[120px]" />
                <div className="absolute top-[20%] right-[-10%] w-[30%] h-[50%] rounded-full bg-orange-50/30 blur-[100px]" />
            </div>

            {/* Toast */}
            {toast && (
                <div className="fixed bottom-6 right-6 z-[100] animate-in fade-in slide-in-from-bottom-5 duration-300">
                    <div className="bg-white border border-gray-100 px-5 py-4 rounded-2xl shadow-2xl flex items-center gap-3 min-w-[270px]">
                        <div className={`w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 ${toast.type === 'success' ? 'bg-emerald-500' : 'bg-red-500'}`}>
                            {toast.type === 'success' ? <CheckCircle className="h-4 w-4 text-white" /> : <AlertCircle className="h-4 w-4 text-white" />}
                        </div>
                        <p className="text-gray-900 text-sm font-bold">{toast.msg}</p>
                    </div>
                </div>
            )}

            {/* Delete Modal */}
            {deleteCompany && (
                <DeleteModal
                    company={deleteCompany}
                    onClose={() => setDeleteCompany(null)}
                    onDeleted={handleDeleted}
                />
            )}

            {/* ── Merged Header + Stats Card ── */}
            <div className="bg-white rounded-2xl border border-gray-200 shadow-md overflow-hidden relative">
                <div className="absolute top-0 right-0 w-64 h-64 bg-[#FF9900]/6 rounded-full blur-[80px] -z-10 pointer-events-none" />

                {/* Title + Buttons */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 px-7 sm:px-10 pt-7 pb-5 border-b border-gray-100/60">
                    <div className="flex items-center gap-4">
                        <div className="w-11 h-11 bg-gradient-to-br from-[#FF9900] to-[#e68a00] rounded-2xl flex items-center justify-center shadow-[0_8px_20px_rgba(0,113,133,0.25)] flex-shrink-0">
                            <Building2 className="h-5 w-5 text-white" strokeWidth={2.5} />
                        </div>
                        <div>
                            <h1 className="text-xl font-black text-gray-900 tracking-tight">Company Management</h1>
                            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mt-0.5">Manage your business profiles</p>
                        </div>
                    </div>
                    <div className="flex items-center gap-2 self-start sm:self-auto">
                        <button onClick={load} disabled={loading}
                            className="p-2.5 bg-white border border-gray-200 rounded-xl text-gray-500 hover:text-[#FF9900] hover:bg-gray-50 transition-all shadow-sm disabled:opacity-50">
                            <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} strokeWidth={2.5} />
                        </button>
                        <button onClick={() => { setEditCompany(null); setView('form'); }}
                            className="flex items-center gap-2 px-5 py-2.5 bg-[#FF9900] text-white font-black text-xs uppercase tracking-widest rounded-xl hover:bg-[#cc7a00] hover:shadow-[0_8px_20px_rgba(0,113,133,0.3)] hover:-translate-y-0.5 transition-all duration-300">
                            <Plus className="h-4 w-4" strokeWidth={2.5} /> Add Company
                        </button>
                    </div>
                </div>

                {/* Stats strips */}
                <div className="grid grid-cols-1 sm:grid-cols-3 divide-y sm:divide-y-0 sm:divide-x divide-gray-100/60">
                    <div className="flex items-center justify-between px-7 sm:px-10 py-4">
                        <div>
                            <p className="text-[9px] font-black uppercase tracking-widest text-gray-400 mb-0.5">Total Companies</p>
                            <p className="text-2xl font-black text-gray-900 tracking-tight">{loading ? '—' : companies.length}</p>
                        </div>
                        <div className="w-9 h-9 bg-white border border-gray-100 rounded-xl flex items-center justify-center shadow-sm">
                            <Building2 className="w-4 h-4 text-gray-400" />
                        </div>
                    </div>
                    <div className="flex items-center justify-between px-7 sm:px-10 py-4">
                        <div>
                            <p className="text-[9px] font-black uppercase tracking-widest text-[#FF9900] mb-0.5">With Email</p>
                            <p className="text-2xl font-black text-[#FF9900] tracking-tight">{loading ? '—' : companies.filter(c => c.email).length}</p>
                        </div>
                        <div className="w-9 h-9 bg-[#FF9900]/10 border border-[#FF9900]/20 rounded-xl flex items-center justify-center shadow-sm">
                            <Mail className="w-4 h-4 text-[#FF9900]" />
                        </div>
                    </div>
                    <div className="flex items-center justify-between px-7 sm:px-10 py-4">
                        <div>
                            <p className="text-[9px] font-black uppercase tracking-widest text-emerald-600 mb-0.5">With Website</p>
                            <p className="text-2xl font-black text-emerald-600 tracking-tight">{loading ? '—' : companies.filter(c => c.website).length}</p>
                        </div>
                        <div className="w-9 h-9 bg-emerald-50 border border-emerald-100 rounded-xl flex items-center justify-center shadow-sm">
                            <Globe className="w-4 h-4 text-emerald-400" />
                        </div>
                    </div>
                </div>
            </div>

            {/* ── Companies Table Card ── */}
            <div className="bg-white rounded-2xl border border-gray-200 shadow-md overflow-hidden relative">
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-3/4 h-3/4 bg-[#FF9900]/4 blur-[100px] pointer-events-none -z-10" />

                {/* Search bar */}
                <div className="px-5 sm:px-8 py-5 border-b border-gray-100/50 bg-gradient-to-b from-white to-transparent flex items-center gap-4 relative z-10">
                    <div className="flex items-center gap-2.5 bg-white border border-gray-200 rounded-xl px-4 py-2.5 flex-1 focus-within:ring-2 focus-within:ring-[#FF9900]/20 focus-within:border-[#FF9900] shadow-sm transition-all">
                        <Search className="h-4 w-4 text-gray-400 flex-shrink-0" strokeWidth={2.5} />
                        <input
                            value={search}
                            onChange={e => setSearch(e.target.value)}
                            placeholder="Search by name, email or city..."
                            className="text-sm text-gray-900 outline-none w-full bg-transparent font-bold placeholder:font-medium placeholder:text-gray-400"
                        />
                        {search && (
                            <button onClick={() => setSearch('')} className="text-gray-300 hover:text-gray-500 transition-colors">
                                <X className="h-3.5 w-3.5" />
                            </button>
                        )}
                    </div>
                    <span className="text-[10px] font-black uppercase tracking-widest text-[#FF9900] whitespace-nowrap bg-[#FF9900]/10 px-3 py-2 rounded-xl border border-[#FF9900]/20">
                        {filtered.length} result{filtered.length !== 1 ? 's' : ''}
                    </span>
                </div>

                {/* Table */}
                {loading ? (
                    <div className="py-24 flex flex-col items-center justify-center">
                        <div className="w-10 h-10 border-4 border-[#FF9900]/20 border-t-[#FF9900] rounded-full animate-spin mb-4" />
                        <p className="text-xs font-bold text-gray-400 uppercase tracking-widest">Loading companies...</p>
                    </div>
                ) : filtered.length === 0 ? (
                    <div className="py-24 text-center px-6">
                        <div className="w-16 h-16 bg-gray-50 rounded-full flex items-center justify-center mx-auto mb-4 border border-gray-100">
                            <Building2 className="h-8 w-8 text-gray-300" />
                        </div>
                        <p className="font-black text-gray-900 mb-1">
                            {search ? 'No companies match your search' : 'No companies yet'}
                        </p>
                        <p className="text-sm font-medium text-gray-400">
                            {search ? 'Try a different keyword.' : 'Click "Add Company" to create your first business profile.'}
                        </p>
                        {search && (
                            <button onClick={() => setSearch('')}
                                className="mt-4 text-xs font-black text-[#FF9900] uppercase tracking-widest hover:underline">
                                Clear search
                            </button>
                        )}
                    </div>
                ) : (
                    <div className="overflow-x-auto relative z-10">
                        <table className="w-full text-sm">
                            <thead>
                                <tr className="bg-gray-50/80 border-b border-gray-100 text-[10px] font-black text-gray-400 uppercase tracking-widest">
                                    <th className="text-left px-8 py-4">Company</th>
                                    <th className="text-left px-6 py-4">Contact</th>
                                    <th className="text-left px-6 py-4">Location</th>
                                    <th className="text-left px-6 py-4">Tax / NTN</th>
                                    <th className="text-center px-6 py-4">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-50">
                                {filtered.map(c => (
                                    <tr key={c.id}
                                        className="hover:bg-white/60 transition-all duration-300 group border-b border-gray-50/50 last:border-0">
                                        <td className="px-8 py-4">
                                            <div className="flex items-center gap-3">
                                                <div className="w-10 h-10 bg-gradient-to-br from-[#FF9900]/10 to-[#FF9900]/20 rounded-xl flex items-center justify-center flex-shrink-0 group-hover:scale-105 transition-transform border border-[#FF9900]/10">
                                                    <Building2 className="h-4 w-4 text-[#FF9900]" strokeWidth={2.5} />
                                                </div>
                                                <div>
                                                    <p className="font-black text-gray-900 group-hover:text-[#FF9900] transition-colors">{c.name}</p>
                                                    {c.website && (
                                                        <p className="text-[10px] text-gray-400 font-medium mt-0.5 truncate max-w-[180px]">{c.website}</p>
                                                    )}
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <p className="font-bold text-gray-900 text-sm">{c.phone || '—'}</p>
                                            <p className="text-[10px] text-gray-400 font-medium mt-0.5">{c.email || '—'}</p>
                                        </td>
                                        <td className="px-6 py-4">
                                            <p className="font-black text-gray-900 text-sm">{c.city || '—'}</p>
                                            <p className="text-[10px] text-gray-400 font-medium mt-0.5 truncate max-w-[200px]" title={c.address}>{c.address || '—'}</p>
                                        </td>
                                        <td className="px-6 py-4">
                                            {c.tax_number ? (
                                                <span className="bg-gray-100 text-gray-600 px-3 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-widest">
                                                    {c.tax_number}
                                                </span>
                                            ) : (
                                                <span className="text-gray-300 font-bold text-sm">—</span>
                                            )}
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="flex items-center justify-center gap-2">
                                                <button
                                                    onClick={() => { setEditCompany(c); setView('form'); }}
                                                    className="p-2 bg-white border border-transparent hover:border-blue-200 hover:bg-blue-50 text-blue-600 rounded-xl hover:scale-110 hover:shadow-sm transition-all"
                                                    title="Edit">
                                                    <Pencil className="h-4 w-4" strokeWidth={2.5} />
                                                </button>
                                                <button
                                                    onClick={() => setDeleteCompany(c)}
                                                    className="p-2 bg-white border border-transparent hover:border-red-200 hover:bg-red-50 text-red-600 rounded-xl hover:scale-110 hover:shadow-sm transition-all"
                                                    title="Delete">
                                                    <Trash2 className="h-4 w-4" strokeWidth={2.5} />
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>
        </div>
    );
}
