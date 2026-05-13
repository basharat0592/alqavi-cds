'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { authService } from '@/lib/auth';
import { Loader2, AlertTriangle, X, Save, User } from 'lucide-react';

const INPUT_CLS = "w-full h-[31px] px-3 border border-[#888c8e] rounded-[3px] text-[13px] outline-none focus:border-[#e77600] focus:shadow-[0_0_3px_2px_rgba(228,121,17,0.5)] placeholder:text-[#aaa] bg-white transition-all font-medium";

const LABEL_CLS = "block text-[13px] font-bold text-[#0f1111] mb-1 text-left";

const REQ = <span className="text-red-600 ml-0.5">*</span>;

const BASE_URL = process.env.NEXT_PUBLIC_API_URL?.replace('/api', '') || 'http://127.0.0.1:8000';

const getAvatarUrl = (path: string | null): string | undefined => {
    if (!path) return undefined;
    if (path.startsWith('http')) return path;
    return `${BASE_URL}${path.startsWith('/') ? '' : '/'}${path}`;
};

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
        address: '',
        city: '',
        country: '',
        postal_code: '',
        password: '',
        confirmPassword: '',
        avatar: null as File | null
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
                username: formData.username || formData.email,
                email: formData.email,
                phone: formData.phone,
                address: formData.address,
                city: formData.city,
                country: formData.country,
                postal_code: formData.postal_code,
                password: formData.password,
                password_confirm: formData.password,
                avatar: formData.avatar
            });
            router.push('/login?registered=true');
        } catch (err: any) {
            setError(err.message || 'Registration failed.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-[#F1F1F1] flex flex-col items-center justify-center py-10 px-4 font-sans text-[#0f1111]">
            <div className="w-full max-w-[650px] bg-white rounded-[4px] border border-[#ddd] shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
                {/* Header */}
                <div className="bg-white px-8 py-5 border-b border-[#eee] flex items-center justify-between">
                    <h3 className="text-[14px] font-black uppercase tracking-wider text-[#111]">REGISTER NEW CUSTOMER</h3>
                    <Link href="/" className="text-slate-400 hover:text-[#111] transition-colors"><X size={20} /></Link>
                </div>

                {error && (
                    <div className="mx-8 mt-6 flex items-start gap-2 border border-[#c40000] bg-white rounded p-3 text-sm text-left">
                        <AlertTriangle className="h-4 w-4 text-[#c45500] flex-shrink-0 mt-0.5" />
                        <div>
                            <p className="text-[#c45500] font-bold">There was a problem</p>
                            <p className="text-gray-800 text-xs mt-1 leading-relaxed">{error}</p>
                        </div>
                    </div>
                )}

                <form onSubmit={handleSubmit} className="p-10 pt-8">
                    <div className="grid grid-cols-3 gap-x-6 gap-y-6 mb-6">
                        <div className="col-span-1">
                            <label className={LABEL_CLS}>Profile Pic</label>
                            <div className="mt-1 flex flex-col items-center gap-2">
                                <div className="w-20 h-20 bg-gray-50 border border-dashed border-gray-300 rounded-[4px] flex items-center justify-center overflow-hidden">
                                    {formData.avatar ? (
                                        <img src={URL.createObjectURL(formData.avatar)} alt="" className="w-full h-full object-cover" />
                                    ) : <User size={32} className="text-gray-200" />}
                                </div>
                                <input type="file" accept="image/*" className="hidden" id="avatar-up" 
                                    onChange={e => {
                                        const file = e.target.files?.[0];
                                        if (file) setFormData({...formData, avatar: file});
                                    }}
                                />
                                <label htmlFor="avatar-up" className="text-[10px] font-bold text-[#007185] hover:text-[#c45500] cursor-pointer uppercase tracking-wider">Upload</label>
                            </div>
                        </div>
                        <div className="col-span-2 grid grid-cols-1 gap-y-6">
                            <div>
                                <label className={LABEL_CLS}>First Name {REQ}</label>
                                <input name="first_name" required className={INPUT_CLS} value={formData.first_name} onChange={handleChange} placeholder="e.g. Adnan" />
                            </div>
                            <div>
                                <label className={LABEL_CLS}>Last Name {REQ}</label>
                                <input name="last_name" required className={INPUT_CLS} value={formData.last_name} onChange={handleChange} placeholder="e.g. Ali" />
                            </div>
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-6 mb-6">
                        <div>
                            <label className={LABEL_CLS}>Email Address {REQ}</label>
                            <input name="email" type="email" required className={INPUT_CLS} value={formData.email} onChange={handleChange} placeholder="customer@example.com" />
                        </div>
                        <div>
                            <label className={LABEL_CLS}>Phone Number</label>
                            <input name="phone" className={INPUT_CLS} value={formData.phone} onChange={handleChange} placeholder="+92 3XX XXXXXXX" />
                        </div>
                    </div>

                    <div className="space-y-6">
                        <div>
                            <label className={LABEL_CLS}>Permanent Address</label>
                            <input name="address" className={INPUT_CLS} value={formData.address} onChange={handleChange} placeholder="Street address, apartment, etc." />
                        </div>
                        <div className="grid grid-cols-3 gap-6">
                            <div>
                                <label className={LABEL_CLS}>City</label>
                                <input name="city" className={INPUT_CLS} value={formData.city} onChange={handleChange} placeholder="City" />
                            </div>
                            <div>
                                <label className={LABEL_CLS}>Country</label>
                                <input name="country" className={INPUT_CLS} value={formData.country} onChange={handleChange} placeholder="Country" />
                            </div>
                            <div>
                                <label className={LABEL_CLS}>Postal Code</label>
                                <input name="postal_code" className={INPUT_CLS} value={formData.postal_code} onChange={handleChange} placeholder="00000" />
                            </div>
                        </div>
                        <div className="grid grid-cols-2 gap-6">
                            <div>
                                <label className={LABEL_CLS}>Account Password {REQ}</label>
                                <input name="password" type="password" required className={INPUT_CLS} value={formData.password} onChange={handleChange} placeholder="At least 8 characters" />
                            </div>
                            <div>
                                <label className={LABEL_CLS}>Confirm Password {REQ}</label>
                                <input name="confirmPassword" type="password" required className={INPUT_CLS} value={formData.confirmPassword} onChange={handleChange} placeholder="Repeat password" />
                            </div>
                        </div>
                    </div>

                    <div className="mt-10 flex gap-4">
                        <button type="submit" disabled={loading}
                            className="flex-1 h-[40px] bg-gradient-to-b from-[#f7dfa5] to-[#f0c14b] border border-[#a88734] hover:from-[#f5d78e] hover:to-[#eeb933] rounded-[3px] text-[14px] font-black uppercase tracking-widest text-[#0f1111] shadow-sm flex items-center justify-center gap-2 active:scale-[0.98] transition-all">
                            {loading ? <Loader2 className="animate-spin h-5 w-5" /> : (
                                <>
                                    <Save size={18} /> REGISTER ACCOUNT
                                </>
                            )}
                        </button>
                        <Link href="/login" className="px-10 h-[40px] bg-gradient-to-b from-[#f7f8fa] to-[#e7e9ec] border border-[#adb1b8] hover:from-[#eef1f3] hover:to-[#dce0e4] rounded-[3px] text-[13px] font-bold text-[#0f1111] flex items-center justify-center">
                            Cancel
                        </Link>
                    </div>
                </form>

                <div className="bg-[#f7f8fa] px-8 py-4 border-t border-[#eee] text-center">
                    <p className="text-[11px] text-[#565959]">
                        Already have an account? <Link href="/login" className="text-[#007185] hover:text-[#c45500] hover:underline font-bold">Sign In</Link>
                    </p>
                </div>
            </div>
        </div>
    );
}
