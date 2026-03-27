'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { authService } from '@/lib/auth';
import { Loader2, AlertTriangle, ArrowLeft } from 'lucide-react';

const INPUT = (err?: boolean) =>
    `w-full px-3 py-1.5 bg-white border rounded text-xs outline-none transition-all
    focus:border-[#e77600] focus:shadow-[0_0_3px_2px_rgba(228,121,17,0.5)] placeholder:text-gray-400
    ${err ? 'border-red-600' : 'border-[#a6a6a6]'}`;

const LABEL = 'block text-[10px] font-black text-gray-900 mb-1.5 uppercase tracking-tight text-left';

export default function SupplierRegisterPage() {
    const router = useRouter();
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [formData, setFormData] = useState({
        first_name: '',
        last_name: '',
        company_name: '',
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
            await authService.registerSupplier({
                first_name: formData.first_name,
                last_name: formData.last_name,
                company_name: formData.company_name,
                username: formData.email.split('@')[0],
                email: formData.email,
                phone: formData.phone,
                password: formData.password,
                password_confirm: formData.password
            });
            router.push('/login?registered=true');
        } catch (err: any) {
            setError(err.message || 'Supplier registration failed.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-[#f1f1f1] flex flex-col font-sans">
            <header className="bg-white border-b border-[#ddd] py-3 shadow-sm flex items-center justify-center">
                <Link href="/" className="flex flex-col items-center">
                    <span className="font-extrabold text-xl text-[#111] tracking-tighter">AL-QAVI</span>
                    <span className="text-[9px] font-bold text-[#FF9900] uppercase tracking-widest mt-0.5">Supplier Enrollment</span>
                </Link>
            </header>

            <main className="flex-1 flex flex-col items-center py-10 px-4">
                <div className="w-full max-w-sm">
                    <div className="bg-white border border-[#ddd] rounded shadow-sm p-6 mb-4">
                        <Link href="/register" className="text-[10px] font-bold uppercase text-[#0066c0] hover:text-[#c45500] hover:underline flex items-center gap-1 mb-6 text-left">
                            <ArrowLeft className="h-3 w-3" /> All Options
                        </Link>
                        
                        <h1 className="text-xl font-bold text-[#111] mb-1 tracking-tight text-left">Partner Registration</h1>
                        <p className="text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-6 text-left">Setup your distribution profile</p>

                        {error && (
                            <div className="flex items-start gap-2 border border-red-200 bg-red-50 rounded p-3 mb-6 text-sm text-left">
                                <AlertTriangle className="h-4 w-4 text-red-600 flex-shrink-0 mt-0.5" />
                                <div>
                                    <p className="text-red-600 font-bold text-xs uppercase">Error</p>
                                    <p className="text-gray-800 text-xs mt-0.5 leading-relaxed">{error}</p>
                                </div>
                            </div>
                        )}

                        <form onSubmit={handleSubmit} className="space-y-4">
                            <div>
                                <label className={LABEL}>Business / Brand Name</label>
                                <input
                                    name="company_name" type="text" required
                                    value={formData.company_name} onChange={handleChange}
                                    placeholder="Enter company name"
                                    className={INPUT()}
                                />
                            </div>

                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label className={LABEL}>Contact F-Name</label>
                                    <input
                                        name="first_name" type="text" required
                                        value={formData.first_name} onChange={handleChange}
                                        placeholder="Ali"
                                        className={INPUT()}
                                    />
                                </div>
                                <div>
                                    <label className={LABEL}>Contact L-Name</label>
                                    <input
                                        name="last_name" type="text" required
                                        value={formData.last_name} onChange={handleChange}
                                        placeholder="Khan"
                                        className={INPUT()}
                                    />
                                </div>
                            </div>

                            <div>
                                <label className={LABEL}>Official Email</label>
                                <input
                                    name="email" type="email" required
                                    value={formData.email} onChange={handleChange}
                                    placeholder="business@example.com"
                                    className={INPUT()}
                                />
                            </div>

                            <div>
                                <label className={LABEL}>Official WhatsApp / Mobile</label>
                                <input
                                    name="phone" type="text" required
                                    value={formData.phone} onChange={handleChange}
                                    placeholder="0300-1234567"
                                    className={INPUT()}
                                />
                            </div>

                            <div className="grid grid-cols-2 gap-3 pt-2">
                                <div>
                                    <label className={LABEL}>Password</label>
                                    <input
                                        name="password" type="password" required
                                        value={formData.password} onChange={handleChange}
                                        className={INPUT()}
                                    />
                                </div>
                                <div>
                                    <label className={LABEL}>Confirm</label>
                                    <input
                                        name="confirmPassword" type="password" required
                                        value={formData.confirmPassword} onChange={handleChange}
                                        className={INPUT()}
                                    />
                                </div>
                            </div>

                            <button type="submit" disabled={loading}
                                className="w-full py-2 bg-[#f0c14b] hover:bg-[#ebae1e] border border-[#a88734] rounded shadow-sm text-xs font-black uppercase tracking-widest text-[#111] transition-colors mt-6">
                                {loading ? <Loader2 className="animate-spin h-4 w-4 mx-auto" strokeWidth={3} /> : 'Create Account'}
                            </button>
                        </form>

                        <div className="mt-8 pt-6 border-t border-[#eee]">
                            <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest mb-2 text-center">Join Al-Qavi Network</p>
                            <div className="grid grid-cols-3 gap-2 opacity-30 invert-[0.5]">
                                <div className="h-6 bg-gray-200 rounded" />
                                <div className="h-6 bg-gray-200 rounded" />
                                <div className="h-6 bg-gray-200 rounded" />
                            </div>
                        </div>
                    </div>
                </div>
            </main>
        </div>
    );
}
