'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { authService } from '@/lib/auth';
import { Eye, EyeOff, Loader2, ArrowRight, Mail, Lock, AlertCircle, CheckCircle, ShieldCheck } from 'lucide-react';

export default function LoginPage() {
    const router = useRouter();
    const [loading, setLoading] = useState(false);
    const [showPassword, setShowPassword] = useState(false);
    const [success, setSuccess] = useState(false);
    const [formData, setFormData] = useState({ username: '', password: '', rememberMe: false });
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        if (typeof window === 'undefined') return;
        const user = authService.getUser();
        const params = new URLSearchParams(window.location.search);
        const isRegisteredFlow = params.get('registered');
        const redirect = params.get('redirect') || '';
        if (isRegisteredFlow) setSuccess(true);
        if (user && !isRegisteredFlow) {
            if (redirect) router.push(redirect);
            else if (user.role === 'admin') router.push('/admin/dashboard');
            else router.push('/');
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
        setLoading(true); setError(null);
        try {
            const { user } = await authService.login(formData.username, formData.password);
            if (formData.rememberMe) localStorage.setItem('rememberedUsername', formData.username);
            else localStorage.removeItem('rememberedUsername');
            const redirect = new URLSearchParams(window.location.search).get('redirect');
            if (redirect) router.push(redirect);
            else if (user.role === 'admin') router.push('/admin/dashboard');
            else router.push('/');
        } catch (err: any) {
            setError(err.message || 'Invalid credentials. Please try again.');
        } finally { setLoading(false); }
    };

    return (
        <div className="min-h-screen bg-white flex flex-col font-sans relative overflow-hidden">

            {/* Ambient glow — matches admin dashboard */}
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

            {/* Main */}
            <main className="flex-1 flex items-start justify-center py-10 px-4">
                <div className="w-full max-w-sm">

                    {/* Card */}
                    <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-8">

                        {/* Header */}
                        <div className="mb-6">
                            <div className="w-11 h-11 bg-[#FF9900] rounded-xl flex items-center justify-center mb-4">
                                <Lock className="h-5 w-5 text-[#131921]" strokeWidth={2.5} />
                            </div>
                            <h1 className="text-2xl font-black text-gray-900 tracking-tight">Sign In</h1>
                            <p className="text-[11px] font-bold text-gray-400 uppercase tracking-widest mt-1">Welcome back</p>
                        </div>

                        {/* Success banner */}
                        {success && (
                            <div className="flex items-center gap-2 bg-emerald-50 border border-emerald-200 text-emerald-700 rounded-xl p-3 mb-5 text-sm font-bold">
                                <CheckCircle className="h-4 w-4 flex-shrink-0" />
                                Account created! Please sign in.
                            </div>
                        )}

                        {/* Error */}
                        {error && (
                            <div className="flex items-center gap-2 bg-red-50 border border-red-200 text-red-700 rounded-xl p-3 mb-5 text-sm font-bold">
                                <AlertCircle className="h-4 w-4 flex-shrink-0" />
                                {error}
                            </div>
                        )}

                        <form onSubmit={handleSubmit} className="space-y-4">
                            {/* Email/Username */}
                            <div>
                                <label className="block text-xs font-black text-gray-700 uppercase tracking-widest mb-1.5">
                                    Email or Username
                                </label>
                                <div className="relative">
                                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                                    <input
                                        name="username" type="text" required autoComplete="username"
                                        value={formData.username} onChange={handleChange}
                                        placeholder="you@example.com"
                                        className="w-full pl-9 pr-4 py-3 border border-gray-200 rounded-xl text-sm outline-none bg-gray-50 focus:bg-white focus:border-[#FF9900] focus:ring-2 focus:ring-[#FF9900]/20 transition-all"
                                    />
                                </div>
                            </div>

                            {/* Password */}
                            <div>
                                <div className="flex justify-between items-center mb-1.5">
                                    <label className="block text-xs font-black text-gray-700 uppercase tracking-widest">Password</label>
                                    <Link href="/forgot-password" className="text-xs text-[#FF9900] hover:text-[#e68a00] font-bold transition-colors">
                                        Forgot password?
                                    </Link>
                                </div>
                                <div className="relative">
                                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                                    <input
                                        name="password" type={showPassword ? 'text' : 'password'} required
                                        value={formData.password} onChange={handleChange}
                                        placeholder="••••••••"
                                        className="w-full pl-9 pr-10 py-3 border border-gray-200 rounded-xl text-sm outline-none bg-gray-50 focus:bg-white focus:border-[#FF9900] focus:ring-2 focus:ring-[#FF9900]/20 transition-all"
                                    />
                                    <button type="button" onClick={() => setShowPassword(!showPassword)}
                                        className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors">
                                        {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                                    </button>
                                </div>
                            </div>

                            {/* Remember Me */}
                            <label className="flex items-center gap-2 cursor-pointer">
                                <input name="rememberMe" type="checkbox" checked={formData.rememberMe} onChange={handleChange}
                                    className="w-4 h-4 accent-[#FF9900] rounded" />
                                <span className="text-sm text-gray-600 font-medium">Keep me signed in</span>
                            </label>

                            {/* Submit */}
                            <button type="submit" disabled={loading}
                                className="w-full flex items-center justify-center gap-2 py-3 bg-[#FF9900] hover:bg-[#e68a00] text-[#131921] font-black text-sm uppercase tracking-widest rounded-xl transition-all disabled:opacity-60 active:scale-[0.98] shadow-sm">
                                {loading
                                    ? <Loader2 className="animate-spin h-4 w-4" />
                                    : <><ArrowRight className="h-4 w-4" /> Sign In</>}
                            </button>
                        </form>

                        {/* Divider */}
                        <div className="flex items-center gap-3 my-5">
                            <hr className="flex-1 border-gray-100" />
                            <span className="text-[10px] text-gray-400 font-bold uppercase tracking-widest">or</span>
                            <hr className="flex-1 border-gray-100" />
                        </div>

                        {/* New account */}
                        <p className="text-sm text-gray-500 text-center font-medium">
                            New to Al-Qavi?{' '}
                            <Link href="/register" className="text-[#FF9900] hover:text-[#e68a00] font-black transition-colors">
                                Create an account
                            </Link>
                        </p>

                        {/* Demo hint */}
                        <div className="mt-5 p-3 bg-[#FF9900]/5 border border-[#FF9900]/20 rounded-xl text-center">
                            <p className="text-xs text-gray-500">
                                <span className="font-black text-gray-700">Demo Admin:</span> admin / admin12
                            </p>
                        </div>
                    </div>

                    {/* Agree note */}
                    <p className="text-xs text-gray-400 mt-4 text-center leading-relaxed px-2">
                        By continuing, you agree to Al-Qavi's{' '}
                        <span className="text-[#FF9900] hover:underline cursor-pointer font-medium">Conditions of Use</span> and{' '}
                        <span className="text-[#FF9900] hover:underline cursor-pointer font-medium">Privacy Policy</span>.
                    </p>

                    {/* Secure badge */}
                    <div className="flex items-center justify-center gap-1.5 text-xs text-gray-400 mt-4">
                        <ShieldCheck className="h-4 w-4 text-emerald-500" /> Secure & Encrypted Login
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
