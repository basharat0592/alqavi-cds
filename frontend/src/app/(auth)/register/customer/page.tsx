'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { authService } from '@/lib/auth';
import { Loader2, AlertTriangle, ArrowLeft } from 'lucide-react';

const INPUT = (err?: boolean) =>
    `w-full px-3 py-2 bg-white border rounded text-sm outline-none transition-all
    focus:border-[#e77600] focus:shadow-[0_0_3px_2px_rgba(228,121,17,0.5)] placeholder:text-gray-400
    ${err ? 'border-red-600' : 'border-[#a6a6a6]'}`;

const LABEL = 'block text-xs font-bold text-gray-900 mb-1 text-left';

export default function CustomerRegisterPage() {
    const router = useRouter();
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [formData, setFormData] = useState({
        first_name: '',
        last_name: '',
        username: '',
        email: '',
        phone: '',
        password: '',
        confirmPassword: ''
    });

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const { name, value } = e.target;
        setFormData(p => ({ ...p, [name]: value }));
        if (error) setError(null);
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
            await authService.register({
                first_name: formData.first_name,
                last_name: formData.last_name,
                username: formData.username || formData.email.split('@')[0],
                email: formData.email,
                phone: formData.phone,
                password: formData.password,
                password_confirm: formData.password
            });
            router.push('/login?registered=true');
        } catch (err: any) {
            setError(err.message || 'Registration failed.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-[#f1f1f1] flex flex-col font-sans">
            <header className="bg-white border-b border-[#ddd] py-4 shadow-sm flex items-center justify-center">
                <Link href="/" className="flex flex-col items-center">
                    <span className="font-extrabold text-2xl text-[#111] tracking-tighter">AL-QAVI</span>
                    <span className="text-[10px] font-bold text-gray-500 uppercase tracking-widest mt-0.5">Customer Registration</span>
                </Link>
            </header>

            <main className="flex-1 flex flex-col items-center py-12 px-4">
                <div className="w-full max-w-sm">
                    <div className="bg-white border border-[#ddd] rounded shadow-sm p-6 mb-4">
                        <Link href="/register" className="text-xs text-[#0066c0] hover:text-[#c45500] hover:underline flex items-center gap-1 mb-4 text-left">
                            <ArrowLeft className="h-3 w-3" /> All Options
                        </Link>
                        
                        <h1 className="text-2xl font-bold text-[#111] mb-5 tracking-tight text-left">Create Account</h1>

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
                                <label className={LABEL}>Your Name</label>
                                <div className="grid grid-cols-2 gap-3">
                                    <input
                                        name="first_name" type="text" required
                                        value={formData.first_name} onChange={handleChange}
                                        placeholder="First Name"
                                        className={INPUT()}
                                    />
                                    <input
                                        name="last_name" type="text" required
                                        value={formData.last_name} onChange={handleChange}
                                        placeholder="Last Name"
                                        className={INPUT()}
                                    />
                                </div>
                            </div>

                            <div>
                                <label className={LABEL}>Email</label>
                                <input
                                    name="email" type="email" required
                                    value={formData.email} onChange={handleChange}
                                    placeholder="example@mail.com"
                                    className={INPUT()}
                                />
                            </div>

                            <div>
                                <label className={LABEL}>Mobile Number</label>
                                <input
                                    name="phone" type="text" required
                                    value={formData.phone} onChange={handleChange}
                                    placeholder="0300-1234567"
                                    className={INPUT()}
                                />
                            </div>

                            <div>
                                <label className={LABEL}>Password</label>
                                <input
                                    name="password" type="password" required
                                    value={formData.password} onChange={handleChange}
                                    placeholder="At least 8 characters"
                                    className={INPUT()}
                                />
                            </div>

                            <div>
                                <label className={LABEL}>Confirm Password</label>
                                <input
                                    name="confirmPassword" type="password" required
                                    value={formData.confirmPassword} onChange={handleChange}
                                    className={INPUT()}
                                />
                            </div>

                            <button type="submit" disabled={loading}
                                className="w-full py-1.5 bg-[#f0c14b] hover:bg-[#ebae1e] border border-[#a88734] rounded shadow-sm text-sm font-bold text-[#111] transition-colors mt-6">
                                {loading ? <Loader2 className="animate-spin h-4 w-4 mx-auto" /> : 'Continue'}
                            </button>
                        </form>

                        <p className="text-[11px] text-gray-800 mt-6 leading-relaxed text-left">
                            By creating an account, you agree to Al-Qavi's <span className="text-[#0066c0] hover:underline cursor-pointer">Conditions of Use</span> and <span className="text-[#0066c0] hover:underline cursor-pointer">Privacy Notice</span>.
                        </p>

                        <div className="flex items-center gap-2 my-6">
                            <hr className="flex-1 border-[#eee]" />
                        </div>

                        <p className="text-xs text-gray-800 font-bold mb-2 text-left">Already have an account?</p>
                        <Link href="/login" className="block w-full text-center py-1 border border-[#adb1b8] bg-[#e7e9ec] hover:bg-[#d8dadd] rounded text-xs shadow-sm shadow-black/5 transition-all">
                            Sign In
                        </Link>
                    </div>
                </div>
            </main>
        </div>
    );
}
