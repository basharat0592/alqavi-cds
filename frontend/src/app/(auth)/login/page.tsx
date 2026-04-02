'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { authService } from '@/lib/auth';
import { Loader2, AlertTriangle, ChevronRight } from 'lucide-react';

const INPUT = (err?: boolean) =>
    `w-full px-3 py-2 bg-white border rounded text-sm outline-none transition-all
    focus:border-[#F7CA00] focus:shadow-[0_0_3px_2px_rgba(29,78,216,0.3)] placeholder:text-gray-400
    ${err ? 'border-red-600' : 'border-[#a6a6a6]'}`;

const LABEL = 'block text-xs font-bold text-gray-900 mb-1 text-left';

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
        const redirectParam = params.get('redirect') || '';
        
        if (isRegisteredFlow) setSuccess(true);
        
        if (user && !isRegisteredFlow) {
            const role = (user.role || '').toString().toLowerCase();
            if (redirectParam) router.push(redirectParam);
            else if (['admin', 'staff', 'superuser', 'manager'].some(r => role.includes(r)) || user.is_staff || user.is_superuser) {
                router.push('/admin/dashboard');
            } else if (role === 'supplier') {
                router.push('/supplier/dashboard');
            } else {
                router.push('/dashboard');
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
            
            const params = new URLSearchParams(window.location.search);
            const redirectParam = params.get('redirect');
            
            if (redirectParam) {
                router.push(redirectParam);
            } else {
                const role = (user.role || '').toString().toLowerCase();
                if (['admin', 'staff', 'superuser', 'manager'].some(r => role.includes(r)) || user.is_staff || user.is_superuser) {
                    router.push('/admin/dashboard');
                } else if (role === 'supplier') {
                    router.push('/supplier/dashboard');
                } else {
                    router.push('/dashboard');
                }
            }
        } catch (err: any) {
            setError(err.message || 'Invalid credentials. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-[#f1f1f1] flex flex-col font-sans">
            <header className="bg-white border-b border-[#ddd] py-4 shadow-sm flex items-center justify-center">
                <Link href="/" className="flex flex-col items-center">
                    <span className="font-extrabold text-2xl text-[#F7CA00] tracking-tighter uppercase">AL-QAVI</span>
                    <span className="text-[10px] font-bold text-gray-500 uppercase tracking-widest mt-0.5">Cosmetics Distributor</span>
                </Link>
            </header>

            <main className="flex-1 flex flex-col items-center py-12 px-4">
                <div className="w-full max-w-sm">
                    <div className="bg-white border border-[#ddd] rounded shadow-sm p-6 mb-4">
                        <h1 className="text-2xl font-bold text-slate-800 mb-5 tracking-tight text-left">Sign in</h1>

                        {success && (
                            <div className="flex items-start gap-2 border border-green-600 bg-white rounded p-3 mb-5 text-sm text-left">
                                <div className="h-4 w-4 text-green-600 flex-shrink-0 mt-0.5 font-bold">✓</div>
                                <div>
                                    <p className="text-green-700 font-bold">Registration Successful</p>
                                    <p className="text-gray-800 text-xs mt-1 leading-relaxed">Please sign in with your new account credentials.</p>
                                </div>
                            </div>
                        )}

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
                                <label className={LABEL}>Email or Username</label>
                                <input
                                    name="username" type="text" required
                                    value={formData.username} onChange={handleChange}
                                    className={INPUT(!!error)}
                                />
                            </div>

                            <div>
                                <div className="flex items-center justify-between mb-1">
                                    <label className={LABEL}>Password</label>
                                    <Link href="/forgot-password" className="text-xs text-[#0066c0] hover:text-[#F7CA00] hover:underline">
                                        Forgot your password?
                                    </Link>
                                </div>
                                <input
                                    name="password" type="password" required
                                    value={formData.password} onChange={handleChange}
                                    className={INPUT(!!error)}
                                />
                            </div>

                            <button type="submit" disabled={loading}
                                className="w-full py-1.5 bg-[#F7CA00] hover:bg-[#1E40AF] border border-[#1E3A8A] rounded shadow-sm text-sm font-bold text-white transition-colors mt-6">
                                {loading ? <Loader2 className="animate-spin h-4 w-4 mx-auto" strokeWidth={3} /> : 'Sign in'}
                            </button>

                            <div className="flex items-center gap-2 mt-4">
                                <input
                                    id="rememberMe" name="rememberMe" type="checkbox"
                                    checked={formData.rememberMe} onChange={handleChange}
                                    className="h-3.5 w-3.5 rounded border-[#d5d9d9] accent-[#F7CA00]"
                                />
                                <label htmlFor="rememberMe" className="text-xs text-gray-800 cursor-pointer">
                                    Keep me signed in
                                </label>
                            </div>
                        </form>

                        <p className="text-[11px] text-gray-800 mt-6 leading-relaxed text-left">
                            By continuing, you agree to Al-Qavi's <span className="text-[#0066c0] hover:underline cursor-pointer">Conditions of Use</span> and <span className="text-[#0066c0] hover:underline cursor-pointer">Privacy Notice</span>.
                        </p>
                    </div>

                    <div className="flex items-center gap-2 my-6">
                        <hr className="flex-1 border-[#ddd]" />
                        <span className="text-xs text-gray-500 whitespace-nowrap">New to Al-Qavi?</span>
                        <hr className="flex-1 border-[#ddd]" />
                    </div>

                    <Link href="/register" className="block w-full text-center py-1 border border-slate-200 bg-[#e7e9ec] hover:bg-[#d8dadd] rounded text-xs shadow-sm shadow-black/5 transition-all text-gray-800 font-medium">
                        Create your Al-Qavi account
                    </Link>
                </div>

                {/* Minimal Footer */}
                <div className="mt-8 text-center">
                    <p className="text-[10px] text-gray-500 font-bold uppercase tracking-widest">Al-Qavi Cosmetics Distributor Network © 2026</p>
                </div>
            </main>
        </div>
    );
}
