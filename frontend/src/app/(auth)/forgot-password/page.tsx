'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Loader2, ArrowLeft, AlertTriangle } from 'lucide-react';

const INPUT = (err?: boolean) =>
    `w-full px-3 py-2 bg-white border rounded text-sm outline-none transition-all
    focus:border-[#e77600] focus:shadow-[0_0_3px_2px_rgba(228,121,17,0.5)] placeholder:text-gray-400
    ${err ? 'border-red-600' : 'border-[#a6a6a6]'}`;

const LABEL = 'block text-xs font-bold text-gray-900 mb-1 text-left';

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
        // Simulate API call
        await new Promise(r => setTimeout(r, 1500));
        setLoading(false);
        setSubmitted(true);
    };

    return (
        <div className="min-h-screen bg-[#f1f1f1] flex flex-col font-sans">
            <header className="bg-white border-b border-[#ddd] py-4 shadow-sm flex items-center justify-center">
                <Link href="/" className="flex flex-col items-center">
                    <span className="font-extrabold text-2xl text-[#111] tracking-tighter uppercase">AL-QAVI</span>
                    <span className="text-[10px] font-bold text-gray-500 uppercase tracking-widest mt-0.5">Password Recovery</span>
                </Link>
            </header>

            <main className="flex-1 flex flex-col items-center py-12 px-4">
                <div className="w-full max-w-sm">
                    <div className="bg-white border border-[#ddd] rounded shadow-sm p-6 mb-4">
                        {submitted ? (
                            <div className="text-left">
                                <h1 className="text-2xl font-bold text-[#111] mb-2 tracking-tight">Check your email</h1>
                                <p className="text-sm text-gray-700 leading-relaxed mb-4">
                                    We've sent password reset instructions to <span className="font-bold">{email}</span>.
                                </p>
                                <p className="text-xs text-gray-600 mb-6">
                                    If you don't see the email, check your spam or junk folder.
                                </p>
                                <Link href="/login"
                                    className="block w-full text-center py-1.5 bg-[#f0c14b] hover:bg-[#ebae1e] border border-[#a88734] rounded shadow-sm text-sm font-bold text-[#111] transition-colors">
                                    Return to Sign In
                                </Link>
                                <button onClick={() => { setSubmitted(false); setEmail(''); }}
                                    className="w-full text-center text-xs text-[#0066c0] hover:text-[#c45500] hover:underline mt-4">
                                    Try a different email address
                                </button>
                            </div>
                        ) : (
                            <>
                                <h1 className="text-2xl font-bold text-[#111] mb-2 tracking-tight text-left">Password assistance</h1>
                                <p className="text-xs text-gray-700 mb-5 leading-relaxed text-left">
                                    Enter the email address associated with your Al-Qavi account.
                                </p>

                                {error && (
                                    <div className="flex items-start gap-2 border border-[#c40000] bg-white rounded p-3 mb-5 text-sm text-left">
                                        <AlertTriangle className="h-4 w-4 text-[#c40000] flex-shrink-0 mt-0.5" />
                                        <div>
                                            <p className="text-[#c40000] font-bold">There was a problem</p>
                                            <p className="text-gray-800 text-xs mt-1 leading-relaxed">{error}</p>
                                        </div>
                                    </div>
                                )}

                                <form onSubmit={handleSubmit} className="space-y-4">
                                    <div>
                                        <label className={LABEL}>Email Address</label>
                                        <input
                                            type="email" required
                                            value={email} onChange={e => { setEmail(e.target.value); setError(null); }}
                                            className={INPUT(!!error)}
                                        />
                                    </div>

                                    <button type="submit" disabled={loading}
                                        className="w-full py-1.5 bg-[#f0c14b] hover:bg-[#ebae1e] border border-[#a88734] rounded shadow-sm text-sm font-bold text-[#111] transition-colors mt-2">
                                        {loading ? <Loader2 className="animate-spin h-4 w-4 mx-auto" strokeWidth={3} /> : 'Continue'}
                                    </button>
                                </form>

                                <div className="mt-8 pt-6 border-t border-[#eee] text-left">
                                    <p className="text-xs text-gray-800 font-bold mb-2">Has your email changed?</p>
                                    <p className="text-xs text-gray-600 leading-relaxed mb-4">
                                        If you no longer use the email address associated with your Al-Qavi account, you may contact <span className="text-[#0066c0] hover:underline cursor-pointer">Customer Service</span> for help restoring access to your account.
                                    </p>
                                    <Link href="/login" className="text-xs text-[#0066c0] hover:text-[#c45500] hover:underline flex items-center gap-1">
                                        <ArrowLeft className="h-3 w-3" /> Back to Sign In
                                    </Link>
                                </div>
                            </>
                        )}
                    </div>
                </div>

                <div className="mt-8 text-center">
                    <p className="text-[10px] text-gray-500 font-bold uppercase tracking-widest">Al-Qavi Cosmetics Distributor Network © 2026</p>
                </div>
            </main>
        </div>
    );
}
