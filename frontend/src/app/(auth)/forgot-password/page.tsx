'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Loader2, ArrowLeft, Mail, CheckCircle, ShieldCheck, AlertCircle, KeyRound } from 'lucide-react';

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
        <div className="min-h-screen bg-white flex flex-col font-sans relative overflow-hidden">

            {/* Ambient glow */}
            <div className="fixed inset-0 pointer-events-none -z-10">
                <div className="absolute top-[-15%] left-[-10%] w-[50%] h-[50%] rounded-full bg-[#FF9900]/10 blur-[120px]" />
                <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] rounded-full bg-[#FF9900]/8 blur-[100px]" />
            </div>

            {/* Top bar */}
            <div className="bg-[#131921] py-4 px-6 flex items-center justify-center">
                <Link href="/" className="flex flex-col items-center leading-none group">
                    <span className="font-black text-xl text-white tracking-tight group-hover:text-[#FF9900] transition-colors">Al-Qavi Cosmetics</span>
                    <span className="text-[9px] font-bold tracking-[0.3em] text-white/40 uppercase mt-0.5">Premium · Authentic · Pakistan</span>
                </Link>
            </div>

            <main className="flex-1 flex items-start justify-center py-10 px-4">
                <div className="w-full max-w-sm">

                    {/* Back to login */}
                    <Link href="/login" className="flex items-center gap-1.5 text-sm text-[#FF9900] hover:text-[#e68a00] font-bold mb-4 transition-colors">
                        <ArrowLeft className="h-4 w-4" /> Back to Sign In
                    </Link>

                    <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-8">

                        {submitted ? (
                            /* ── Success state ── */
                            <div className="text-center">
                                <div className="w-14 h-14 bg-emerald-50 border border-emerald-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
                                    <CheckCircle className="h-7 w-7 text-emerald-600" />
                                </div>
                                <h2 className="text-xl font-black text-gray-900 tracking-tight mb-2">Check your email</h2>
                                <p className="text-sm text-gray-500 font-medium mb-1">
                                    We've sent password reset instructions to:
                                </p>
                                <p className="font-black text-gray-900 text-sm mb-5 break-all">{email}</p>

                                <div className="bg-[#FF9900]/5 border border-[#FF9900]/20 rounded-xl p-3 mb-5 text-xs text-gray-600 text-left">
                                    <p className="font-black text-gray-700 mb-1.5 uppercase tracking-widest text-[10px]">Next Steps</p>
                                    <ol className="list-decimal list-inside space-y-1 font-medium">
                                        <li>Check your inbox (and spam/junk folder)</li>
                                        <li>Click the reset link in the email</li>
                                        <li>Create your new password</li>
                                    </ol>
                                </div>

                                <Link href="/login"
                                    className="w-full block text-center py-3 bg-[#FF9900] hover:bg-[#e68a00] text-[#131921] font-black text-sm uppercase tracking-widest rounded-xl transition-all mb-3">
                                    Return to Sign In
                                </Link>
                                <button onClick={() => { setSubmitted(false); setEmail(''); }}
                                    className="text-xs text-[#FF9900] hover:text-[#e68a00] font-bold hover:underline transition-colors">
                                    Try a different email address
                                </button>
                            </div>
                        ) : (
                            /* ── Form state ── */
                            <>
                                {/* Header */}
                                <div className="mb-6">
                                    <div className="w-11 h-11 bg-[#FF9900] rounded-xl flex items-center justify-center mb-4">
                                        <KeyRound className="h-5 w-5 text-[#131921]" strokeWidth={2.5} />
                                    </div>
                                    <h1 className="text-2xl font-black text-gray-900 tracking-tight">Reset Password</h1>
                                    <p className="text-[11px] font-bold text-gray-400 uppercase tracking-widest mt-1">
                                        We'll send you a reset link
                                    </p>
                                </div>

                                {error && (
                                    <div className="flex items-center gap-2 bg-red-50 border border-red-200 text-red-700 rounded-xl p-3 mb-4 text-sm font-bold">
                                        <AlertCircle className="h-4 w-4 flex-shrink-0" /> {error}
                                    </div>
                                )}

                                <form onSubmit={handleSubmit} className="space-y-4">
                                    <div>
                                        <label className="block text-xs font-black text-gray-700 uppercase tracking-widest mb-1.5">
                                            Email Address
                                        </label>
                                        <div className="relative">
                                            <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                                            <input
                                                type="email" required
                                                value={email} onChange={e => { setEmail(e.target.value); setError(null); }}
                                                placeholder="you@example.com"
                                                className="w-full pl-9 pr-4 py-3 border border-gray-200 rounded-xl text-sm outline-none bg-gray-50 focus:bg-white focus:border-[#FF9900] focus:ring-2 focus:ring-[#FF9900]/20 transition-all"
                                            />
                                        </div>
                                    </div>

                                    <button type="submit" disabled={loading}
                                        className="w-full flex items-center justify-center gap-2 py-3 bg-[#FF9900] hover:bg-[#e68a00] text-[#131921] font-black text-sm uppercase tracking-widest rounded-xl transition-all disabled:opacity-60 active:scale-[0.98] shadow-sm">
                                        {loading
                                            ? <><Loader2 className="animate-spin h-4 w-4" /> Sending...</>
                                            : 'Send Reset Link'}
                                    </button>
                                </form>

                                <div className="mt-5 pt-4 border-t border-gray-100 space-y-2 text-center">
                                    <p className="text-xs text-gray-500 font-medium">
                                        Remember your password?{' '}
                                        <Link href="/login" className="text-[#FF9900] hover:text-[#e68a00] font-black transition-colors">
                                            Sign in
                                        </Link>
                                    </p>
                                    <p className="text-xs text-gray-500 font-medium">
                                        Don&apos;t have an account?{' '}
                                        <Link href="/register" className="text-[#FF9900] hover:text-[#e68a00] font-black transition-colors">
                                            Create one
                                        </Link>
                                    </p>
                                </div>
                            </>
                        )}
                    </div>

                    {/* Secure badge */}
                    <div className="flex items-center justify-center gap-1.5 text-xs text-gray-400 mt-5">
                        <ShieldCheck className="h-4 w-4 text-emerald-500" /> Secure & Encrypted
                    </div>
                </div>
            </main>

            {/* Footer */}
            <footer className="bg-[#131921] py-4 px-6 text-center">
                <div className="flex justify-center gap-6 text-xs text-gray-400">
                    <span className="hover:text-[#FF9900] hover:underline cursor-pointer transition-colors">Conditions of Use</span>
                    <span className="hover:text-[#FF9900] hover:underline cursor-pointer transition-colors">Privacy Policy</span>
                    <span className="hover:text-[#FF9900] hover:underline cursor-pointer transition-colors">Help</span>
                </div>
                <p className="text-xs text-gray-500 mt-2">© 2026 Al-Qavi Cosmetics. All rights reserved.</p>
            </footer>
        </div>
    );
}
