'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { authService } from '@/lib/auth';
import { 
    Loader2, AlertTriangle, ArrowLeft, Camera, CheckCircle2, 
    X, User, ShieldCheck, Building2, Phone, Mail, MapPin, Eye, EyeOff
} from 'lucide-react';
import { getImageUrl } from '@/lib/utils';
import Logo from '@/components/ui/Logo';

const inputCls = "w-full h-[42px] px-4 border border-[#888c8e] rounded-[4px] text-[14px] outline-none focus:border-[#e77600] focus:shadow-[0_0_3px_2px_rgba(228,121,17,0.5)] placeholder:text-[#aaa] bg-white transition-all font-medium";

const Field = ({ label, required = false, children }: { label: string; required?: boolean; children: React.ReactNode }) => (
    <div className="w-full">
        <label className="block text-[13px] font-bold text-[#0f1111] mb-1.5 text-left">{label}{required && <span className="text-red-600 ml-0.5">*</span>}</label>
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
        <div className="min-h-screen bg-[#F0F2F2] flex flex-col font-sans text-left">
            {/* Header / Logo */}
            <header className="py-8 flex justify-center">
                <Link href="/">
                    <Logo size="lg" />
                </Link>
            </header>

            <main className="flex-1 flex flex-col items-center pb-20 px-4">
                <div className="w-full max-w-2xl bg-white border border-[#D5D9D9] rounded-2xl shadow-xl overflow-hidden animate-in fade-in zoom-in-95 duration-500">
                    {/* Top Panel */}
                    <div className="bg-[#232F3E] p-8 text-white">
                        <div className="flex items-center justify-between">
                            <div>
                                <h1 className="text-2xl font-bold tracking-tight">Partner Enrollment</h1>
                                <p className="text-[11px] text-slate-400 font-bold uppercase tracking-[0.2em] mt-2 flex items-center gap-2">
                                    <Building2 size={12} className="text-[#F59E0B]" /> Join Al-Qavi Distribution Network
                                </p>
                            </div>
                            <div className="hidden sm:block">
                                <div className="w-14 h-14 bg-white/5 rounded-2xl border border-white/10 flex items-center justify-center text-[#F59E0B]">
                                    <ShieldCheck size={32} strokeWidth={1.5} />
                                </div>
                            </div>
                        </div>
                    </div>

                    <form onSubmit={handleSubmit} className="p-8 space-y-8">
                        {error && (
                            <div className="flex items-start gap-3 border border-red-200 bg-red-50 rounded-xl p-5 animate-in slide-in-from-top-2">
                                <AlertTriangle className="h-5 w-5 text-red-600 shrink-0 mt-0.5" />
                                <div>
                                    <p className="text-red-700 font-black text-[11px] uppercase tracking-widest mb-1">Registration Error</p>
                                    <p className="text-gray-800 text-sm leading-relaxed">{error}</p>
                                </div>
                            </div>
                        )}

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                            {/* Profile Section */}
                            <div className="space-y-6">
                                <h3 className="text-[12px] font-black uppercase text-slate-400 tracking-wider flex items-center gap-2">
                                    <User size={14} /> Profile & Business
                                </h3>

                                {/* Avatar Upload */}
                                <div className="flex flex-col items-center justify-center p-5 bg-[#fcfdff] border-2 border-dashed border-slate-200 rounded-2xl hover:border-[#e77600] transition-all group relative overflow-hidden min-h-[140px]">
                                    {formData.avatar ? (
                                        <div className="relative w-24 h-24 rounded-xl overflow-hidden shadow-md">
                                            <img src={URL.createObjectURL(formData.avatar)} className="w-full h-full object-cover" alt="Preview" />
                                            <button 
                                                type="button" 
                                                onClick={() => setFormData(p => ({ ...p, avatar: null }))}
                                                className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity text-white"
                                            >
                                                <X size={20} />
                                            </button>
                                        </div>
                                    ) : (
                                        <label className="flex flex-col items-center cursor-pointer w-full">
                                            <div className="w-16 h-16 bg-white rounded-full flex items-center justify-center text-slate-400 border border-slate-100 group-hover:scale-110 transition-transform">
                                                <Camera size={28} />
                                            </div>
                                            <span className="mt-2 text-[11px] font-black uppercase text-slate-400 tracking-widest group-hover:text-[#e77600]">Upload Photo</span>
                                            <input type="file" className="hidden" accept="image/*" onChange={handleFileChange} />
                                        </label>
                                    )}
                                </div>

                                <div className="grid grid-cols-2 gap-3">
                                    <Field label="First Name" required>
                                        <input name="first_name" className={inputCls} value={formData.first_name} onChange={handleChange} placeholder="Ali" required />
                                    </Field>
                                    <Field label="Last Name">
                                        <input name="last_name" className={inputCls} value={formData.last_name} onChange={handleChange} placeholder="Khan" />
                                    </Field>
                                </div>
                                <Field label="Company / Business Name" required>
                                    <input name="company" className={inputCls} value={formData.company} onChange={handleChange} placeholder="Distributor name" required />
                                </Field>
                                <Field label="WhatsApp / Contact" required>
                                    <input name="phone" className={inputCls} value={formData.phone} onChange={handleChange} placeholder="03XXXXXXXXX" required />
                                </Field>
                            </div>

                            {/* Access Section */}
                            <div className="space-y-6">
                                <h3 className="text-[12px] font-black uppercase text-slate-400 tracking-wider flex items-center gap-2">
                                    <ShieldCheck size={14} /> Security & Access
                                </h3>
                                <Field label="Email Address" required>
                                    <input name="email" type="email" className={inputCls} value={formData.email} onChange={handleChange} placeholder="business@email.com" required />
                                </Field>
                                <Field label="Choose Password" required>
                                    <div className="relative">
                                        <input name="password" type={showPw ? 'text' : 'password'} className={inputCls} value={formData.password} onChange={handleChange} required />
                                        <button type="button" onClick={() => setShowPw(!showPw)} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-[#e77600] transition-colors">{showPw ? <EyeOff size={16} /> : <Eye size={16} />}</button>
                                    </div>
                                </Field>
                                <Field label="Confirm Password" required>
                                    <div className="relative">
                                        <input name="confirmPassword" type={showConfirmPw ? 'text' : 'password'} className={inputCls} value={formData.confirmPassword} onChange={handleChange} required />
                                        <button type="button" onClick={() => setShowConfirmPw(!showConfirmPw)} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-[#e77600] transition-colors">{showConfirmPw ? <EyeOff size={16} /> : <Eye size={16} />}</button>
                                    </div>
                                </Field>
                                <Field label="Business Address" required>
                                    <textarea name="address" className={`${inputCls} h-auto py-3`} rows={2} value={formData.address} onChange={handleChange} placeholder="City, Area, Street..." required />
                                </Field>
                            </div>
                        </div>

                        <div className="pt-6 border-t border-slate-100 flex flex-col gap-4">
                            <button 
                                type="submit" 
                                disabled={loading}
                                className="w-full h-[52px] bg-gradient-to-b from-[#f7dfa5] to-[#f0c14b] border border-[#a88734] rounded-xl text-[15px] font-black uppercase tracking-widest text-[#111] shadow-lg shadow-[#F59E0B]/10 hover:from-[#f5d78e] hover:to-[#eeb933] active:scale-[0.98] transition-all flex items-center justify-center gap-3 disabled:opacity-60"
                            >
                                {loading ? <Loader2 className="animate-spin h-5 w-5" /> : (
                                    <>Enroll as Partner <ArrowLeft className="h-4 w-4 rotate-180" /></>
                                )}
                            </button>
                            <p className="text-[12px] text-slate-500 text-center font-medium">
                                Already have an account? <Link href="/login" className="text-[#007185] hover:text-[#c45500] hover:underline font-bold">Sign In here</Link>
                            </p>
                        </div>
                    </form>
                </div>
            </main>
        </div>
    );
}
