'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { authService } from '@/lib/auth';
import {
    Loader2, AlertTriangle, ArrowLeft, Camera,
    X, Building2, Phone, Mail, MapPin, Eye, EyeOff, Truck
} from 'lucide-react';

const inputCls = "w-full h-10 px-4 bg-slate-50/50 border border-slate-200 rounded-xl text-[13px] text-slate-700 placeholder:text-slate-400 focus:bg-white focus:border-[#13B0D1] focus:ring-4 focus:ring-[#13B0D1]/5 transition-all duration-300 outline-none font-medium";

const Field = ({ label, required = false, children }: { label: string; required?: boolean; children: React.ReactNode }) => (
    <div className="w-full">
        <label className="block text-[11px] font-bold uppercase tracking-[0.1em] text-slate-500 mb-2 text-left">
            {label}{required && <span className="text-red-600 ml-0.5">*</span>}
        </label>
        {children}
    </div>
);

export default function SupplierRegisterPage() {
    const router = useRouter();
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [showPw, setShowPw] = useState(false);
    const [showConfirmPw, setShowConfirmPw] = useState(false);

    const [formData, setFormData] = useState({
        first_name: '',
        last_name: '',
        company: '',
        email: '',
        phone: '',
        address: '',
        password: '',
        confirmPassword: '',
        avatar: null as File | null
    });

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
        const { name, value } = e.target;
        setFormData(p => ({ ...p, [name]: value }));
        if (error) setError(null);
    };

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0] || null;
        setFormData(p => ({ ...p, avatar: file }));
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (formData.password !== formData.confirmPassword) {
            setError("Passwords do not match.");
            return;
        }

        setLoading(true);
        setError(null);
        try {
            await authService.registerSupplier({
                first_name: formData.first_name,
                last_name: formData.last_name,
                company: formData.company,
                username: formData.email.split('@')[0],
                email: formData.email,
                phone: formData.phone,
                address: formData.address,
                password: formData.password,
                password_confirm: formData.password,
                avatar: formData.avatar
            });
            router.push('/login?registered=true');
        } catch (err: any) {
            setError(err.message || 'Supplier registration failed.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="h-screen bg-white flex font-sans overflow-hidden">
            <div className="w-full lg:w-[58%] xl:w-[52%] h-full overflow-y-auto no-scrollbar flex flex-col px-6 md:px-10 py-6 md:py-8 relative z-10">
                <div className="max-w-lg mx-auto w-full animate-in fade-in slide-in-from-left-4 duration-700">
                    <div className="mb-8 text-left pt-4 pl-2">
                        <div className="flex items-center justify-between mb-3">
                            <h1 className="text-3xl font-bold text-slate-900 tracking-tight leading-none">
                                <span className="relative inline-block pb-1 mr-2">
                                    Partner
                                    <div className="absolute bottom-0 left-0 w-full h-[3px] bg-[#13B0D1] rounded-full" />
                                </span>
                                <span className="text-[#13B0D1]">Enrollment</span>
                            </h1>
                            <Truck className="text-[#13B0D1]" size={32} />
                        </div>
                        <p className="text-[11px] text-slate-400 font-bold uppercase tracking-[0.2em] leading-relaxed">
                            Join our premium distribution network
                        </p>
                    </div>

                    <div className="bg-white px-2 py-4">
                        {error && (
                            <div className="mb-6 flex items-start gap-3 border border-red-100 bg-red-50/50 rounded-xl p-4 animate-in shake duration-500">
                                <AlertTriangle className="h-5 w-5 text-red-600 shrink-0 mt-0.5" />
                                <p className="text-gray-800 text-sm leading-relaxed">{error}</p>
                            </div>
                        )}

                        <form onSubmit={handleSubmit} className="space-y-5">
                            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 items-start">
                                <div className="md:col-span-1">
                                    <div className="relative w-full aspect-square bg-slate-50 rounded-2xl border-2 border-dashed border-slate-200 flex items-center justify-center overflow-hidden group hover:border-[#13B0D1] transition-colors">
                                        {formData.avatar ? (
                                            <>
                                                <img src={URL.createObjectURL(formData.avatar)} className="w-full h-full object-cover" alt="Avatar" />
                                                <button
                                                    type="button"
                                                    onClick={() => setFormData(p => ({ ...p, avatar: null }))}
                                                    className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity text-white"
                                                >
                                                    <X size={14} />
                                                </button>
                                            </>
                                        ) : (
                                            <label className="flex flex-col items-center cursor-pointer w-full h-full justify-center">
                                                <Camera className="text-slate-300 group-hover:text-[#13B0D1]" size={18} />
                                                <span className="text-[9px] font-bold uppercase text-slate-400 mt-2">Upload</span>
                                                <input type="file" className="hidden" accept="image/*" onChange={handleFileChange} />
                                            </label>
                                        )}
                                    </div>
                                </div>
                                <div className="md:col-span-3 grid grid-cols-1 md:grid-cols-2 gap-3">
                                    <Field label="First Name" required>
                                        <input name="first_name" className={inputCls} value={formData.first_name} onChange={handleChange} placeholder="Ali" required />
                                    </Field>
                                    <Field label="Last Name">
                                        <input name="last_name" className={inputCls} value={formData.last_name} onChange={handleChange} placeholder="Khan" />
                                    </Field>
                                    <div className="md:col-span-2">
                                        <Field label="Company Name" required>
                                            <div className="relative">
                                                <Building2 className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={14} />
                                                <input name="company" className={`${inputCls} pl-10`} value={formData.company} onChange={handleChange} placeholder="Business Ltd." required />
                                            </div>
                                        </Field>
                                    </div>
                                </div>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                                <Field label="WhatsApp Contact" required>
                                    <div className="relative">
                                        <Phone className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={14} />
                                        <input name="phone" className={`${inputCls} pl-10`} value={formData.phone} onChange={handleChange} placeholder="03XX XXXXXXX" required />
                                    </div>
                                </Field>
                                <Field label="Business Email" required>
                                    <div className="relative">
                                        <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={14} />
                                        <input name="email" type="email" className={`${inputCls} pl-10`} value={formData.email} onChange={handleChange} placeholder="office@email.com" required />
                                    </div>
                                </Field>
                                <Field label="Password" required>
                                    <div className="relative">
                                        <input name="password" type={showPw ? 'text' : 'password'} className={inputCls} value={formData.password} onChange={handleChange} required />
                                        <button type="button" onClick={() => setShowPw(!showPw)} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-[#13B0D1] transition-colors">{showPw ? <EyeOff size={14} /> : <Eye size={14} />}</button>
                                    </div>
                                </Field>
                                <Field label="Confirm" required>
                                    <div className="relative">
                                        <input name="confirmPassword" type={showConfirmPw ? 'text' : 'password'} className={inputCls} value={formData.confirmPassword} onChange={handleChange} required />
                                        <button type="button" onClick={() => setShowConfirmPw(!showConfirmPw)} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-[#13B0D1] transition-colors">{showConfirmPw ? <EyeOff size={14} /> : <Eye size={14} />}</button>
                                    </div>
                                </Field>
                                <div className="md:col-span-2">
                                    <Field label="Warehouse Address" required>
                                        <div className="relative">
                                            <MapPin className="absolute left-4 top-3 text-slate-400" size={14} />
                                            <textarea name="address" className={`${inputCls} h-16 py-2.5 pl-10 resize-none`} value={formData.address} onChange={handleChange} placeholder="Full address details..." required />
                                        </div>
                                    </Field>
                                </div>
                            </div>

                            <button type="submit" disabled={loading}
                                className="w-full h-12 bg-[#13B0D1] hover:bg-[#119ab8] text-white rounded-xl text-[12px] font-black uppercase tracking-[0.2em] shadow-lg shadow-[#13B0D1]/20 active:scale-[0.98] transition-all flex items-center justify-center gap-3 disabled:opacity-60">
                                {loading ? <Loader2 className="animate-spin h-5 w-5" /> : (
                                    <>Register Supplier <ArrowLeft className="h-4 w-4 rotate-180" /></>
                                )}
                            </button>

                            <div className="text-center pt-4 border-t border-slate-50">
                                <p className="text-[11px] text-slate-400 font-bold uppercase tracking-widest">
                                    Already a partner? <Link href="/login" className="text-[#13B0D1] hover:underline ml-1">Sign In</Link>
                                </p>
                            </div>
                        </form>
                    </div>
                </div>

                <footer className="mt-auto pt-6 text-[10px] text-slate-300 font-bold uppercase tracking-[0.3em] text-center border-t border-slate-50">
                    © 2026 Al-Qavi Hub Distribution
                </footer>
            </div>

            <div className="hidden lg:block lg:flex-1 relative overflow-hidden">
                <img
                    src="/images/admin-security-bg.png.png"
                    className="absolute inset-0 w-full h-full object-cover scale-105"
                    alt="Branding"
                />
                <div className="absolute inset-0 bg-gradient-to-br from-[#13B0D1]/80 via-transparent to-black/60" />
                <div className="absolute inset-0 p-20 flex flex-col justify-end text-white z-20">
                    <div className="max-w-xl animate-in fade-in slide-in-from-bottom-8 duration-1000">
                        <div className="w-16 h-1 bg-white mb-8 rounded-full" />
                        <h2 className="text-5xl md:text-6xl font-black uppercase tracking-tighter leading-none mb-6">
                            Growth <br />
                            <span className="text-[#13B0D1]">Unbound.</span>
                        </h2>
                        <p className="text-xl font-medium text-white/90 leading-relaxed">
                            Scale your business with Pakistan's leading cosmetic distribution network. Join our curated community of verified suppliers.
                        </p>
                    </div>
                </div>
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] border border-white/10 rounded-full animate-pulse" />
            </div>
        </div>
    );
}
