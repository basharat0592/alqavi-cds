'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { authService } from '@/lib/auth';
import { Eye, EyeOff, Loader2, ArrowRight, Mail, Lock, AlertCircle, User, Phone, ShieldCheck, CheckCircle } from 'lucide-react';

export default function RegisterPage() {
    const router = useRouter();
    const [loading, setLoading] = useState(false);
    const [showPassword, setShowPassword] = useState(false);
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
                username: formData.username || formData.email.split('@')[0], // fallback username
                email: formData.email,
                phone: formData.phone,
                password: formData.password,
                password_confirm: formData.password
            });
            
            // Redirect to login with success message
            router.push('/login?registered=true');
        } catch (err: any) {
            setError(err.message || 'Registration failed. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-white flex flex-col font-sans relative overflow-hidden">
            
            {/* Background Glow */}
            <div className="fixed inset-0 pointer-events-none -z-10">
                <div className="absolute top-[-15%] left-[-10%] w-[50%] h-[50%] rounded-full bg-[#FF9900]/10 blur-[120px]" />
                <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] rounded-full bg-[#FF9900]/8 blur-[100px]" />
            </div>

            {/* Top Bar */}
            <div className="bg-[#131921] py-4 px-6 flex items-center justify-center">
                <Link href="/" className="flex flex-col items-center leading-none group">
                    <span className="font-black text-xl text-white tracking-tight group-hover:text-[#FF9900] transition-colors">Al-Qavi Cosmetics</span>
                    <span className="text-[9px] font-bold tracking-[0.3em] text-white/40 uppercase mt-0.5">Premium · Authentic · Pakistan</span>
                </Link>
            </div>

            {/* Main Section */}
            <main className="flex-1 flex items-start justify-center py-10 px-4">
                <div className="w-full max-w-md">
                    
                    {/* Card */}
                    <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-8">
                        
                        {/* Header */}
                        <div className="mb-6">
                            <div className="w-11 h-11 bg-[#FF9900] rounded-xl flex items-center justify-center mb-4">
                                <User className="h-5 w-5 text-[#131921]" strokeWidth={2.5} />
                            </div>
                            <h1 className="text-2xl font-black text-gray-900 tracking-tight">Create Account</h1>
                            <p className="text-[11px] font-bold text-gray-400 uppercase tracking-widest mt-1">Join the family today</p>
                        </div>

                        {error && (
                            <div className="flex items-center gap-2 bg-red-50 border border-red-200 text-red-700 rounded-xl p-3 mb-5 text-sm font-bold">
                                <AlertCircle className="h-4 w-4 flex-shrink-0" />
                                {error}
                            </div>
                        )}

                        <form onSubmit={handleSubmit} className="space-y-4">
                            
                            {/* Full Name Row */}
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-[10px] font-black text-gray-700 uppercase tracking-widest mb-1.5">First Name</label>
                                    <input
                                        name="first_name" type="text" required
                                        value={formData.first_name} onChange={handleChange}
                                        placeholder="Ali"
                                        className="w-full px-4 py-3 border border-gray-200 rounded-xl text-sm outline-none bg-gray-50 focus:bg-white focus:border-[#FF9900] focus:ring-2 focus:ring-[#FF9900]/20 transition-all"
                                    />
                                </div>
                                <div>
                                    <label className="block text-[10px] font-black text-gray-700 uppercase tracking-widest mb-1.5">Last Name</label>
                                    <input
                                        name="last_name" type="text" required
                                        value={formData.last_name} onChange={handleChange}
                                        placeholder="Khan"
                                        className="w-full px-4 py-3 border border-gray-200 rounded-xl text-sm outline-none bg-gray-50 focus:bg-white focus:border-[#FF9900] focus:ring-2 focus:ring-[#FF9900]/20 transition-all"
                                    />
                                </div>
                            </div>

                            {/* Email */}
                            <div>
                                <label className="block text-[10px] font-black text-gray-700 uppercase tracking-widest mb-1.5">Email Address</label>
                                <div className="relative">
                                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                                    <input
                                        name="email" type="email" required
                                        value={formData.email} onChange={handleChange}
                                        placeholder="you@example.com"
                                        className="w-full pl-9 pr-4 py-3 border border-gray-200 rounded-xl text-sm outline-none bg-gray-50 focus:bg-white focus:border-[#FF9900] focus:ring-2 focus:ring-[#FF9900]/20 transition-all"
                                    />
                                </div>
                            </div>

                            {/* Phone */}
                            <div>
                                <label className="block text-[10px] font-black text-gray-700 uppercase tracking-widest mb-1.5">Phone Number</label>
                                <div className="relative">
                                    <Phone className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                                    <input
                                        name="phone" type="text" required
                                        value={formData.phone} onChange={handleChange}
                                        placeholder="0300-1234567"
                                        className="w-full pl-9 pr-4 py-3 border border-gray-200 rounded-xl text-sm outline-none bg-gray-50 focus:bg-white focus:border-[#FF9900] focus:ring-2 focus:ring-[#FF9900]/20 transition-all"
                                    />
                                </div>
                            </div>

                            {/* Password Row */}
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-[10px] font-black text-gray-700 uppercase tracking-widest mb-1.5">Password</label>
                                    <div className="relative">
                                        <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                                        <input
                                            name="password" type={showPassword ? "text" : "password"} required
                                            value={formData.password} onChange={handleChange}
                                            placeholder="••••••"
                                            className="w-full pl-9 pr-4 py-3 border border-gray-200 rounded-xl text-sm outline-none bg-gray-50 focus:bg-white focus:border-[#FF9900] focus:ring-2 focus:ring-[#FF9900]/20 transition-all"
                                        />
                                    </div>
                                </div>
                                <div>
                                    <label className="block text-[10px] font-black text-gray-700 uppercase tracking-widest mb-1.5">Confirm</label>
                                    <div className="relative">
                                        <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                                        <input
                                            name="confirmPassword" type={showPassword ? "text" : "password"} required
                                            value={formData.confirmPassword} onChange={handleChange}
                                            placeholder="••••••"
                                            className="w-full pl-9 pr-4 py-3 border border-gray-200 rounded-xl text-sm outline-none bg-gray-50 focus:bg-white focus:border-[#FF9900] focus:ring-2 focus:ring-[#FF9900]/20 transition-all"
                                        />
                                    </div>
                                </div>
                            </div>

                            <button type="button" onClick={() => setShowPassword(!showPassword)}
                                className="text-[10px] font-bold text-gray-400 uppercase tracking-widest hover:text-[#FF9900] transition-colors flex items-center gap-1.5">
                                {showPassword ? <EyeOff className="h-3 w-3" /> : <Eye className="h-3 w-3" />}
                                {showPassword ? 'Hide' : 'Show'} Password
                            </button>

                            {/* Submit */}
                            <button type="submit" disabled={loading}
                                className="w-full flex items-center justify-center gap-2 py-3 bg-[#FF9900] hover:bg-[#e68a00] text-[#131921] font-black text-sm uppercase tracking-widest rounded-xl transition-all disabled:opacity-60 active:scale-[0.98] shadow-sm mt-4">
                                {loading
                                    ? <Loader2 className="animate-spin h-4 w-4" />
                                    : <><CheckCircle className="h-4 w-4" /> Create Account</>}
                            </button>
                        </form>

                        <div className="flex items-center gap-3 my-5">
                            <hr className="flex-1 border-gray-100" />
                            <span className="text-[10px] text-gray-400 font-bold uppercase tracking-widest">or</span>
                            <hr className="flex-1 border-gray-100" />
                        </div>

                        <p className="text-sm text-gray-500 text-center font-medium">
                            Already have an account?{' '}
                            <Link href="/login" className="text-[#FF9900] hover:text-[#e68a00] font-black transition-colors">
                                Sign In
                            </Link>
                        </p>
                    </div>

                    <p className="text-xs text-gray-400 mt-4 text-center leading-relaxed">
                        By creating an account, you agree to Al-Qavi's <span className="text-[#FF9900] hover:underline cursor-pointer font-medium">Conditions of Use</span> and <span className="text-[#FF9900] hover:underline cursor-pointer font-medium">Privacy Policy</span>.
                    </p>

                    <div className="flex items-center justify-center gap-1.5 text-xs text-gray-400 mt-4">
                        <ShieldCheck className="h-4 w-4 text-emerald-500" /> Secure SSL Connection
                    </div>
                </div>
            </main>

            <footer className="bg-[#131921] py-4 px-6 text-center">
                <p className="text-xs text-gray-500">© 2026 Al-Qavi Cosmetics. All rights reserved.</p>
            </footer>
        </div>
    );
}
