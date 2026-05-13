'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { Loader2, ArrowLeft, AlertTriangle, Mail } from 'lucide-react';
import Logo from '@/components/ui/Logo';

const inputCls = "w-full h-10 px-4 bg-slate-50/50 border border-slate-200 rounded-xl text-[13px] text-slate-700 placeholder:text-slate-400 focus:bg-white focus:border-[#13B0D1] focus:ring-4 focus:ring-[#13B0D1]/5 transition-all duration-300 outline-none font-medium";

const Field = ({ label, children }: { label: string; children: React.ReactNode }) => (
    <div className="w-full">
        <label className="block text-[11px] font-bold uppercase tracking-[0.1em] text-slate-500 mb-2 text-left">{label}</label>
        {children}
    </div>
);

export default function ForgotPasswordPage() {
    const [email, setEmail] = useState('');
    const [loading, setLoading] = useState(false);
    const [submitted, setSubmitted] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError(null);
        if (!email.trim()) { setError('Please enter your email address.'); return; }
        setLoading(true);
        await new Promise(r => setTimeout(r, 1500));
        setLoading(false);
        setSubmitted(true);
    };

    return (
        <div className="h-screen bg-white flex font-sans overflow-hidden">
            {/* Left Column: Form Area */}
            <div className="w-full lg:w-[48%] xl:w-[42%] h-full overflow-y-auto no-scrollbar flex flex-col px-6 md:px-10 py-12 md:py-20 relative z-10 shadow-2xl">
                <div className="max-w-md mx-auto w-full animate-in fade-in slide-in-from-left-4 duration-700">
                    <div className="mb-10 text-center">
                        <Link href="/" className="inline-block mb-10 opacity-80 hover:opacity-100 transition-opacity">
                            <Logo size="lg" />
                        </Link>
                        <h1 className="text-3xl font-bold text-slate-900 tracking-tight leading-none mb-4">
                            Account <span className="text-[#13B0D1]">Recovery</span>
                        </h1>
                        <p className="text-[11px] text-slate-400 font-bold uppercase tracking-[0.2em] leading-relaxed">
                            Reset your secure access password
                        </p>
                    </div>

                    <div className="bg-white border border-slate-200 rounded-2xl p-8 shadow-xl shadow-slate-200/50">
                        {submitted ? (
                            <div className="text-center animate-in fade-in slide-in-from-bottom-4">
                                <div className="w-16 h-16 bg-[#13B0D1]/10 rounded-full flex items-center justify-center mx-auto mb-4 text-[#13B0D1]">
                                    <Mail size={32} />
                                </div>
                                <h3 className="text-xl font-bold text-slate-800 mb-2">Check your email</h3>
                                <p className="text-xs text-slate-500 leading-relaxed mb-6">
                                    We've sent password reset instructions to <br />
                                    <span className="text-slate-900 font-bold">{email}</span>
                                </p>
                                <Link href="/login"
                                    className="w-full h-12 bg-[#13B0D1] hover:bg-[#119ab8] text-white rounded-xl text-[12px] font-black uppercase tracking-[0.2em] shadow-lg shadow-[#13B0D1]/20 active:scale-95 transition-all flex items-center justify-center">
                                    Return to Sign In
                                </Link>
                            </div>
                        ) : (
                            <div className="animate-in fade-in duration-500">
                                {error && (
                                    <div className="mb-6 flex items-start gap-3 border border-red-100 bg-red-50/50 rounded-xl p-4">
                                        <AlertTriangle className="h-5 w-5 text-red-600 shrink-0 mt-0.5" />
                                        <p className="text-gray-800 text-sm leading-relaxed">{error}</p>
                                    </div>
                                )}

                                <form onSubmit={handleSubmit} className="space-y-6">
                                    <Field label="Email Address">
                                        <div className="relative">
                                            <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={14} />
                                            <input
                                                type="email" required
                                                value={email} onChange={e => { setEmail(e.target.value); setError(null); }}
                                                className={`${inputCls} pl-10`}
                                                placeholder="office@email.com"
                                            />
                                        </div>
                                    </Field>

                                    <button type="submit" disabled={loading}
                                        className="w-full h-12 bg-[#13B0D1] hover:bg-[#119ab8] text-white rounded-xl text-[12px] font-black uppercase tracking-[0.2em] shadow-lg shadow-[#13B0D1]/20 active:scale-[0.98] transition-all flex items-center justify-center gap-3 disabled:opacity-60">
                                        {loading ? <Loader2 className="animate-spin h-5 w-5" /> : (
                                            <>Request Reset <ArrowLeft className="h-4 w-4 rotate-180" /></>
                                        )}
                                    </button>
                                </form>

                                <div className="mt-8 pt-6 border-t border-slate-50 text-center">
                                    <Link href="/login" className="text-[11px] font-bold text-slate-400 uppercase tracking-widest hover:text-[#13B0D1] flex items-center justify-center gap-2 transition-colors">
                                        <ArrowLeft className="h-3 w-3" /> Back to Sign In
                                    </Link>
                                </div>
                            </div>
                        )}
                    </div>
                </div>

                <footer className="mt-auto pt-6 text-[10px] text-slate-300 font-bold uppercase tracking-[0.3em] text-center border-t border-slate-50">
                    © 2026 Al-Qavi Hub Recovery
                </footer>
            </div>

            {/* Right Column: Branding */}
            <div className="hidden lg:block lg:flex-1 relative overflow-hidden">
                <img 
                    src="/forgot_password_bg.png" 
                    className="absolute inset-0 w-full h-full object-cover scale-105" 
                    alt="Branding" 
                />
                <div className="absolute inset-0 bg-gradient-to-br from-[#13B0D1]/80 via-transparent to-black/60" />
                <div className="absolute inset-0 p-20 flex flex-col justify-end text-white z-20">
                    <div className="max-w-xl animate-in fade-in slide-in-from-bottom-8 duration-1000">
                        <div className="w-16 h-1 bg-white mb-8 rounded-full" />
                        <h2 className="text-5xl md:text-6xl font-black uppercase tracking-tighter leading-none mb-6">
                            Security <br />
                            <span className="text-[#13B0D1]">First.</span>
                        </h2>
                        <p className="text-xl font-medium text-white/90 leading-relaxed">
                            Your account security is our top priority. Follow our automated recovery protocol to regain access safely.
                        </p>
                    </div>
                </div>
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] border border-white/10 rounded-full animate-pulse" />
            </div>
        </div>
    );
}
