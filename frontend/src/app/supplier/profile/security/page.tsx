'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import {
    ChevronLeft, ShieldCheck, Key, Loader2, Save, Eye, EyeOff,
    AlertTriangle, Lock
} from 'lucide-react';
import api from '@/lib/axios';
import toast from 'react-hot-toast';

export default function SecuritySetup() {
    const router = useRouter();
    const [profile, setProfile] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [showPass, setShowPass] = useState(false);

    const [formData, setFormData] = useState({
        old_password: '', 
        new_password: '',
        confirm_password: ''
    });

    useEffect(() => {
        const fetchProfile = async () => {
            try {
                const { data } = await api.get('/v1/users/profile/');
                setProfile(data);
            } catch {
                toast.error("Auth sync failed. Re-accessing hub.");
                router.push('/supplier/profile');
            } finally {
                setLoading(false);
            }
        };
        fetchProfile();
    }, [router]);

    const handleUpdate = async () => {
        if (!formData.old_password || !formData.new_password) {
            toast.error("Protocol error: All credentials required.");
            return;
        }
        if (formData.new_password !== formData.confirm_password) {
            toast.error("Logic mismatch: Passwords do not correlate.");
            return;
        }

        setSaving(true);
        try {
            await api.post(`/v1/users/${profile.id}/change-password/`, formData);
            toast.success("Security keys successfully rotated.");
            router.push('/supplier/profile');
        } catch (err: any) {
            toast.error(err.response?.data?.message || err.response?.data?.error || "Auth sync failure.");
        } finally {
            setSaving(false);
        }
    };
    if (loading) {
        return (
            <div className="flex h-screen items-center justify-center bg-slate-50/30">
                <div className="flex flex-col items-center gap-4">
                    <Loader2 className="h-8 w-8 animate-spin text-[#F59E0B]" />
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Verifying Encrypted Channel...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="max-w-[600px] mx-auto py-12 px-4 animate-in slide-in-from-bottom-4 duration-500">

            {/* Nav */}
            <div className="flex items-center justify-between mb-10 border-b border-slate-200 pb-6">
                <button
                    onClick={() => router.push('/supplier/profile')}
                    className="flex items-center gap-2 text-slate-400 hover:text-slate-900 transition-colors"
                >
                    <ChevronLeft size={20} />
                    <span className="text-xs font-black uppercase tracking-widest pt-0.5">Cancel Sync</span>
                </button>
                <button
                    onClick={handleUpdate}
                    disabled={saving}
                    className="px-8 py-2.5 bg-slate-900 text-white rounded font-black text-xs uppercase tracking-widest hover:bg-slate-800 transition-all flex items-center gap-2"
                >
                    {saving ? <Loader2 className="h-4 w-4 animate-spin text-[#F59E0B]" /> : <Lock size={16} className="text-[#F59E0B]" />}
                    {saving ? 'Encrypting...' : 'Update Access Keys'}
                </button>
            </div>

            <div className="space-y-10">
                <div>
                    <h1 className="text-3xl font-medium text-slate-900 mb-1">Login & Security</h1>
                    <p className="text-[11px] text-slate-400 font-bold uppercase tracking-widest">Manage access keys and credential rotation</p>
                </div>

                <div className="bg-white border border-slate-300 rounded overflow-hidden divide-y divide-slate-100 shadow-sm">
                    {/* Current Pass */}
                    <div className="p-6 focus-within:bg-slate-50 transition-colors group">
                        <label className="text-[9px] font-black text-slate-300 uppercase tracking-[0.25em] block mb-2 group-focus-within:text-[#F59E0B]">Existing Access Token</label>
                        <div className="flex items-center gap-3">
                            <Key size={16} className="text-slate-300 group-focus-within:text-slate-900" />
                            <input
                                type={showPass ? "text" : "password"}
                                value={formData.old_password}
                                onChange={e => setFormData({ ...formData, old_password: e.target.value })}
                                className="bg-transparent border-none outline-none text-[15px] font-bold text-slate-900 w-full placeholder:text-slate-200"
                                placeholder="Enter current password"
                            />
                            <button onClick={() => setShowPass(!showPass)} className="text-slate-300 hover:text-slate-900 transition-colors">
                                {showPass ? <EyeOff size={16} /> : <Eye size={16} />}
                            </button>
                        </div>
                    </div>

                    {/* New Pass */}
                    <div className="p-6 focus-within:bg-slate-50 transition-colors group">
                        <label className="text-[9px] font-black text-slate-300 uppercase tracking-[0.25em] block mb-2 group-focus-within:text-[#F59E0B]">New Security String</label>
                        <div className="flex items-center gap-3">
                            <ShieldCheck size={16} className="text-slate-300 group-focus-within:text-slate-900" />
                            <input
                                type={showPass ? "text" : "password"}
                                value={formData.new_password}
                                onChange={e => setFormData({ ...formData, new_password: e.target.value })}
                                className="bg-transparent border-none outline-none text-[15px] font-bold text-slate-900 w-full placeholder:text-slate-200"
                                placeholder="Define new access key"
                            />
                        </div>
                    </div>

                    {/* Confirm Pass */}
                    <div className="p-6 focus-within:bg-slate-50 transition-colors group">
                        <label className="text-[9px] font-black text-slate-300 uppercase tracking-[0.25em] block mb-2 group-focus-within:text-[#F59E0B]">Re-Enter String</label>
                        <div className="flex items-center gap-3">
                            <ShieldCheck size={16} className="text-slate-300 group-focus-within:text-slate-900" />
                            <input
                                type={showPass ? "text" : "password"}
                                value={formData.confirm_password}
                                onChange={e => setFormData({ ...formData, confirm_password: e.target.value })}
                                className="bg-transparent border-none outline-none text-[15px] font-bold text-slate-900 w-full placeholder:text-slate-200"
                                placeholder="Correlate new key"
                            />
                        </div>
                    </div>
                </div>

                <div className="bg-amber-50/50 border border-amber-100 p-6 rounded-lg flex gap-4">
                    <AlertTriangle className="text-amber-600 shrink-0 mt-0.5" size={18} />
                    <div className="space-y-1">
                        <p className="text-[11px] font-black text-amber-900 uppercase tracking-widest">Entropy Requirement</p>
                        <p className="text-[10px] text-amber-600 font-medium leading-relaxed">
                            Ensure your new security string is complex. Updating this record will terminate active sessions
                            across unauthorized distribution terminals.
                        </p>
                    </div>
                </div>
            </div>

            <div className="mt-12 text-center">
                <p className="text-[9px] font-black text-slate-300 uppercase tracking-[0.4em]">Auth Rotation Protocol • NIST Compliant</p>
            </div>
        </div>
    );
}
