'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { authService } from '@/lib/auth';
import { Loader2, AlertTriangle, ArrowLeft, Truck, Mail, User, Lock, Phone, FileText, MapPin } from 'lucide-react';

const inputCls = "w-full h-10 px-4 bg-slate-50/50 border border-slate-200 rounded-xl text-[13px] text-slate-700 placeholder:text-slate-400 focus:bg-white focus:border-[#13B0D1] focus:ring-4 focus:ring-[#13B0D1]/5 transition-all duration-300 outline-none font-medium";
const selectCls = "w-full h-10 px-4 bg-slate-50/50 border border-slate-200 rounded-xl text-[13px] text-slate-700 focus:bg-white focus:border-[#13B0D1] focus:ring-4 focus:ring-[#13B0D1]/5 transition-all duration-300 outline-none font-medium appearance-none cursor-pointer";

const Field = ({ label, children }: { label: string; children: React.ReactNode }) => (
    <div className="w-full">
        <label className="block text-[11px] font-bold uppercase tracking-[0.1em] text-slate-500 mb-1.5 text-left">{label}</label>
        {children}
    </div>
);

export default function RiderRegisterPage() {
    const router = useRouter();
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [formData, setFormData] = useState({
        first_name: '',
        last_name: '',
        username: '',
        email: '',
        phone: '',
        vehicle_type: 'bike',
        vehicle_number: '',
        cnic: '',
        city: '',
        address: '',
        password: '',
        confirmPassword: ''
    });

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
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
            await authService.registerRider({
                first_name: formData.first_name,
                last_name: formData.last_name,
                username: formData.username || formData.email.split('@')[0],
                email: formData.email,
                phone: formData.phone,
                vehicle_type: formData.vehicle_type,
                vehicle_number: formData.vehicle_number,
                cnic: formData.cnic,
                city: formData.city,
                address: formData.address,
                password: formData.password
            });
            router.push('/login?registered=true');
        } catch (err: any) {
            setError(err.message || 'Rider registration failed.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="h-screen bg-white flex font-sans overflow-hidden">
            <div className="w-full lg:w-[58%] xl:w-[52%] h-full overflow-y-auto no-scrollbar flex flex-col px-6 md:px-10 py-6 md:py-8 relative z-10">
                <div className="max-w-md mx-auto w-full animate-in fade-in slide-in-from-left-4 duration-700 my-auto">
                    <div className="mb-6 text-left pt-4 pl-2">
                        <div className="flex items-center justify-between mb-2">
                            <h1 className="text-2xl font-bold text-slate-900 tracking-tight leading-none">
                                <span className="relative inline-block pb-1 mr-2">
                                    Become a Rider
                                    <div className="absolute bottom-0 left-0 w-full h-[3px] bg-[#13B0D1] rounded-full" />
                                </span>
                            </h1>
                            <Truck className="text-[#13B0D1]" size={28} />
                        </div>
                        <p className="text-[10px] text-slate-400 font-bold uppercase tracking-[0.2em] leading-relaxed">
                            Join the distribution network as a logistics partner
                        </p>
                    </div>

                    <div className="bg-white px-2 py-2">
                        {error && (
                            <div className="mb-4 flex items-start gap-3 border border-red-100 bg-red-50/50 rounded-xl p-4 animate-in shake duration-500">
                                <AlertTriangle className="h-5 w-5 text-red-600 shrink-0 mt-0.5" />
                                <p className="text-gray-800 text-sm leading-relaxed">{error}</p>
                            </div>
                        )}

                        <form onSubmit={handleSubmit} className="space-y-4">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <Field label="First Name">
                                    <input
                                        name="first_name" type="text" required
                                        value={formData.first_name} onChange={handleChange}
                                        className={inputCls} placeholder="John"
                                    />
                                </Field>

                                <Field label="Last Name">
                                    <input
                                        name="last_name" type="text" required
                                        value={formData.last_name} onChange={handleChange}
                                        className={inputCls} placeholder="Doe"
                                    />
                                </Field>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <Field label="Official Email">
                                    <div className="relative">
                                        <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={14} />
                                        <input
                                            name="email" type="email" required
                                            value={formData.email} onChange={handleChange}
                                            className={`${inputCls} pl-10`} placeholder="rider@site.com"
                                        />
                                    </div>
                                </Field>

                                <Field label="Contact Phone">
                                    <div className="relative">
                                        <Phone className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={14} />
                                        <input
                                            name="phone" type="tel" required
                                            value={formData.phone} onChange={handleChange}
                                            className={`${inputCls} pl-10`} placeholder="0347-xxxxxxx"
                                        />
                                    </div>
                                </Field>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <Field label="Vehicle Type">
                                    <div className="relative">
                                        <select
                                            name="vehicle_type"
                                            value={formData.vehicle_type}
                                            onChange={handleChange}
                                            className={selectCls}
                                        >
                                            <option value="bike">Bike</option>
                                            <option value="car">Car</option>
                                            <option value="van">Van</option>
                                            <option value="truck">Truck</option>
                                            <option value="other">Other</option>
                                        </select>
                                        <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-4 text-slate-500">
                                            <svg className="fill-current h-4 w-4" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20">
                                                <path d="M9.293 12.95l.707.707L15.657 8l-1.414-1.414L10 10.828 5.757 6.586 4.343 8z" />
                                            </svg>
                                        </div>
                                    </div>
                                </Field>

                                <Field label="Vehicle Plate Number">
                                    <div className="relative">
                                        <FileText className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={14} />
                                        <input
                                            name="vehicle_number" type="text" required
                                            value={formData.vehicle_number} onChange={handleChange}
                                            className={`${inputCls} pl-10`} placeholder="GB-1234"
                                        />
                                    </div>
                                </Field>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <Field label="CNIC / ID Card">
                                    <div className="relative">
                                        <FileText className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={14} />
                                        <input
                                            name="cnic" type="text" required
                                            value={formData.cnic} onChange={handleChange}
                                            className={`${inputCls} pl-10`} placeholder="71101-xxxxxxx-x"
                                        />
                                    </div>
                                </Field>

                                <Field label="City">
                                    <div className="relative">
                                        <MapPin className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={14} />
                                        <input
                                            name="city" type="text" required
                                            value={formData.city} onChange={handleChange}
                                            className={`${inputCls} pl-10`} placeholder="Gilgit"
                                        />
                                    </div>
                                </Field>
                            </div>

                            <Field label="Residential Address">
                                <div className="relative">
                                    <MapPin className="absolute left-4 top-5 text-slate-400" size={14} />
                                    <textarea
                                        name="address" required rows={2}
                                        value={formData.address} onChange={handleChange}
                                        className="w-full px-4 py-2.5 bg-slate-50/50 border border-slate-200 rounded-xl text-[13px] text-slate-700 placeholder:text-slate-400 focus:bg-white focus:border-[#13B0D1] focus:ring-4 focus:ring-[#13B0D1]/5 transition-all duration-300 outline-none font-medium pl-10 resize-none"
                                        placeholder="Enter full physical address"
                                    />
                                </div>
                            </Field>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <Field label="Password">
                                    <div className="relative">
                                        <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={14} />
                                        <input
                                            name="password" type="password" required
                                            value={formData.password} onChange={handleChange}
                                            className={`${inputCls} pl-10`} placeholder="••••••••"
                                        />
                                    </div>
                                </Field>

                                <Field label="Verify Password">
                                    <div className="relative">
                                        <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={14} />
                                        <input
                                            name="confirmPassword" type="password" required
                                            value={formData.confirmPassword} onChange={handleChange}
                                            className={`${inputCls} pl-10`} placeholder="••••••••"
                                        />
                                    </div>
                                </Field>
                            </div>

                            <button type="submit" disabled={loading}
                                className="w-full h-11 bg-[#13B0D1] hover:bg-[#119ab8] text-white rounded-xl text-[12px] font-black uppercase tracking-[0.2em] shadow-lg shadow-[#13B0D1]/20 active:scale-[0.98] transition-all flex items-center justify-center gap-3 disabled:opacity-60 mt-2">
                                {loading ? <Loader2 className="animate-spin h-5 w-5" /> : (
                                    <>Submit Registration <ArrowLeft className="h-4 w-4 rotate-180" /></>
                                )}
                            </button>
                        </form>
                    </div>
                </div>

                <footer className="mt-auto pt-6 text-[10px] text-slate-300 font-bold uppercase tracking-[0.3em] text-center border-t border-slate-50">
                    © 2026 Al-Qavi Hub Delivery Network
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
                            Deliver <br />
                            <span className="text-[#13B0D1]">Freedom.</span>
                        </h2>
                        <p className="text-xl font-medium text-white/90 leading-relaxed">
                            Sign up to deliver with the region's top cosmetics network. Gain route optimization, instant payouts, and full dashboard analytics.
                        </p>
                    </div>
                </div>
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] border border-white/10 rounded-full animate-pulse" />
            </div>
        </div>
    );
}
