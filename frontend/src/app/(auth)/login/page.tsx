'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { authService } from '@/lib/auth';
import { Loader2, AlertTriangle, ArrowLeft, Mail, Lock, CheckCircle2 } from 'lucide-react';
import Logo from '@/components/ui/Logo';

const inputCls = "w-full h-10 px-4 bg-slate-50/50 border border-slate-200 rounded-xl text-[13px] text-slate-700 placeholder:text-slate-400 focus:bg-white focus:border-[#13B0D1] focus:ring-4 focus:ring-[#13B0D1]/5 transition-all duration-300 outline-none font-medium";

const Field = ({ label, children }: { label: string; children: React.ReactNode }) => (
    <div className="w-full">
        <label className="block text-[11px] font-bold uppercase tracking-[0.1em] text-slate-500 mb-2 text-left">{label}</label>
        {children}
    </div>
);

export default function LoginPage() {
    const router = useRouter();
    const [loading, setLoading] = useState(false);
    const [success, setSuccess] = useState(false);
    const [formData, setFormData] = useState({ username: '', password: '', rememberMe: false });
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        if (typeof window === 'undefined') return;
        const user = authService.getUser();
        const params = new URLSearchParams(window.location.search);
        const isRegisteredFlow = params.get('registered');

        if (isRegisteredFlow) setSuccess(true);

        if (user && !isRegisteredFlow) {
            const role = (user.role || '').toString().toLowerCase();
            if (['admin', 'staff', 'superuser', 'manager'].some(r => role.includes(r)) || user.is_staff || user.is_superuser) {
                router.push('/admin/dashboard');
            } else if (role === 'supplier') {
                router.push('/supplier/dashboard');
            } else {
                router.push('/customer/dashboard');
            }
        }

        const saved = localStorage.getItem('rememberedUsername');
        if (saved) setFormData(p => ({ ...p, username: saved, rememberMe: true }));
    }, [router]);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const { name, value, type, checked } = e.target;
        setFormData(p => ({ ...p, [name]: type === 'checkbox' ? checked : value }));
        if (error) setError(null);
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError(null);
        try {
            const { user } = await authService.login(formData.username, formData.password);
            if (formData.rememberMe) localStorage.setItem('rememberedUsername', formData.username);
            else localStorage.removeItem('rememberedUsername');

            const role = (user.role || '').toString().toLowerCase();
            if (['admin', 'staff', 'superuser', 'manager'].some(r => role.includes(r)) || user.is_staff || user.is_superuser) {
                router.push('/admin/dashboard');
            } else if (role === 'supplier') {
                router.push('/supplier/dashboard');
            } else {
                router.push('/customer/dashboard');
            }
        } catch (err: any) {
            setError(err.message || 'Invalid credentials. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="h-screen bg-white flex font-sans overflow-hidden">
            <div className="w-full lg:w-[48%] xl:w-[42%] h-full overflow-y-auto no-scrollbar flex flex-col px-6 md:px-10 py-12 md:py-20 relative z-10 shadow-2xl">
                <div className="max-w-md mx-auto w-full animate-in fade-in slide-in-from-left-4 duration-700">
                    <div className="mb-6 text-center">
                        <Link href="/" className="inline-block mb-6 opacity-80 hover:opacity-100 transition-opacity">
                            <img src="/logo.png" alt="Logo" className="h-40 w-auto object-contain mx-auto" />
                        </Link>
                        <h1 className="text-3xl font-bold text-slate-900 tracking-tight leading-none mb-4">
                            Welcome <span className="text-[#13B0D1]">Back</span>
                        </h1>
                        <p className="text-[11px] text-slate-400 font-bold uppercase tracking-[0.2em] leading-relaxed">
                            Sign in to your business dashboard
                        </p>
                    </div>

                    {success && (
                        <div className="mb-6 flex items-start gap-3 border border-green-100 bg-green-50/50 rounded-2xl p-4">
                            <CheckCircle2 className="h-5 w-5 text-green-600 shrink-0 mt-0.5" />
                            <div>
                                <p className="text-green-700 font-bold text-sm">Account Ready</p>
                                <p className="text-gray-800 text-xs mt-0.5">Registration successful. Please sign in.</p>
                            </div>
                        </div>
                    )}

                    {error && (
                        <div className="mb-6 flex items-start gap-3 border border-red-100 bg-red-50/50 rounded-2xl p-4 animate-in shake duration-500">
                            <AlertTriangle className="h-5 w-5 text-red-600 shrink-0 mt-0.5" />
                            <p className="text-gray-800 text-sm leading-relaxed">{error}</p>
                        </div>
                    )}

                    <form onSubmit={handleSubmit} className="space-y-6">
                        <Field label="Username or Email">
                            <div className="relative">
                                <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={14} />
                                <input
                                    name="username" type="text" required
                                    value={formData.username} onChange={handleChange}
                                    className={`${inputCls} pl-10`}
                                    placeholder="Enter your credentials"
                                />
                            </div>
                        </Field>

                        <Field label="Security Password">
                            <div className="relative">
                                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={14} />
                                <input
                                    name="password" type="password" required
                                    value={formData.password} onChange={handleChange}
                                    className={`${inputCls} pl-10`}
                                    placeholder="••••••••"
                                />
                                <Link href="/forgot-password" core-link="true" className="absolute right-4 top-1/2 -translate-y-1/2 text-[10px] font-bold text-[#13B0D1] uppercase tracking-widest hover:underline">
                                    Forgot?
                                </Link>
                            </div>
                        </Field>

                        <div className="flex items-center justify-between">
                            <label className="flex items-center gap-2 cursor-pointer group">
                                <input
                                    id="rememberMe" name="rememberMe" type="checkbox"
                                    checked={formData.rememberMe} onChange={handleChange}
                                    className="h-4 w-4 rounded border-slate-200 text-[#13B0D1] focus:ring-[#13B0D1] cursor-pointer"
                                />
                                <span className="text-[11px] font-bold text-slate-500 uppercase tracking-widest group-hover:text-slate-700 transition-colors">Keep me signed in</span>
                            </label>
                        </div>

                        <button type="submit" disabled={loading}
                            className="w-full h-12 bg-[#13B0D1] hover:bg-[#119ab8] text-white rounded-xl text-[12px] font-black uppercase tracking-[0.2em] shadow-lg shadow-[#13B0D1]/20 active:scale-[0.98] transition-all flex items-center justify-center gap-3 disabled:opacity-60">
                            {loading ? <Loader2 className="animate-spin h-5 w-5" /> : (
                                <>Sign In <ArrowLeft className="h-4 w-4 rotate-180" /></>
                            )}
                        </button>

                        <div className="text-center pt-6 border-t border-slate-50">
                            <p className="text-[11px] text-slate-400 font-bold uppercase tracking-widest">
                                New here? <Link href="/register" className="text-[#13B0D1] hover:underline ml-1">Join the Network</Link>
                            </p>
                        </div>
                    </form>
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
                            Excellence <br />
                            <span className="text-[#13B0D1]">Defined.</span>
                        </h2>
                        <p className="text-xl font-medium text-white/90 leading-relaxed">
                            Access your dedicated distribution dashboard and manage your business operations with precision.
                        </p>
                    </div>
                </div>
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] border border-white/10 rounded-full animate-pulse" />
            </div>
        </div>
    );
}
