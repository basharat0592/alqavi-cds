'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import {
    ChevronLeft, Save, Loader2, User, Phone, MapPin, Mail,
    RefreshCw, ShieldCheck, AlertCircle
} from 'lucide-react';
import api from '@/lib/axios';
import toast from 'react-hot-toast';

export default function EditPersonalDetails() {
    const router = useRouter();
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);

    const [profile, setProfile] = useState<any>(null);
    const [formData, setFormData] = useState({
        first_name: '',
        last_name: '',
        phone: '',
        city: '',
        address: ''
    });

    useEffect(() => {
        const fetchProfile = async () => {
            try {
                const { data } = await api.get('/v1/users/profile/');
                setProfile(data);
                setFormData({
                    first_name: data.first_name || '',
                    last_name: data.last_name || '',
                    phone: data.phone || '',
                    city: data.city || '',
                    address: data.address || ''
                });
            } catch {
                toast.error("Telemetry failure. Resetting sync.");
                router.push('/supplier/profile');
            } finally {
                setLoading(false);
            }
        };
        fetchProfile();
    }, [router]);

    const handleSave = async () => {
        setSaving(true);
        try {
            await api.patch(`/v1/users/${profile.id}/update/`, formData);
            toast.success("Identity credentials updated in database.");
            router.push('/supplier/profile');
        } catch (err: any) {
            toast.error(err.response?.data?.message || "Cloud persistence error.");
        } finally {
            setSaving(false);
        }
    };

    if (loading) {
        return (
            <div className="flex h-screen items-center justify-center bg-slate-50/30">
                <div className="flex flex-col items-center gap-4">
                    <Loader2 className="h-8 w-8 animate-spin text-[#F7CA00]" />
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Accessing Mainframe...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="max-w-[700px] mx-auto py-12 px-4 animate-in slide-in-from-bottom-4 duration-500">

            {/* Sticky Identity Nav */}
            <div className="flex items-center justify-between mb-10 border-b border-slate-200 pb-6">
                <button
                    onClick={() => router.push('/supplier/profile')}
                    className="flex items-center gap-2 text-slate-400 hover:text-slate-900 transition-colors"
                >
                    <ChevronLeft size={20} />
                    <span className="text-xs font-black uppercase tracking-widest pt-0.5">Cancel & Return</span>
                </button>
                <button
                    onClick={handleSave}
                    disabled={saving}
                    className="px-8 py-2.5 bg-[#F7CA00] text-slate-900 rounded font-black text-xs uppercase tracking-widest shadow-lg shadow-[#F7CA00]/20 hover:bg-[#e6be00] active:scale-95 transition-all flex items-center gap-2"
                >
                    {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save size={16} />}
                    {saving ? 'Synchronizing...' : 'Update Database'}
                </button>
            </div>

            <div className="space-y-12">
                {/* Title Segment */}
                <div>
                    <h1 className="text-2xl font-black text-slate-900 uppercase tracking-tighter italic">Personal Identity Protocol</h1>
                    <p className="text-[11px] text-slate-400 font-bold uppercase tracking-widest mt-1">Modify core distributing member credentials</p>
                </div>

                {/* Tactical Form Fieldsets */}
                <div className="bg-white border border-slate-300 rounded overflow-hidden divide-y divide-slate-100 flex flex-col">

                    {/* Name Pair */}
                    <div className="grid grid-cols-1 md:grid-cols-2">
                        <div className="p-6 border-r border-slate-100 group focus-within:bg-slate-50 transition-colors">
                            <label className="text-[9px] font-black text-slate-300 uppercase tracking-[0.25em] block mb-2 group-focus-within:text-[#F7CA00] transition-colors">First Identity Name</label>
                            <div className="flex items-center gap-3">
                                <User size={16} className="text-slate-300 group-focus-within:text-slate-900 transition-colors" />
                                <input
                                    type="text"
                                    value={formData.first_name}
                                    onChange={e => setFormData({ ...formData, first_name: e.target.value })}
                                    className="bg-transparent border-none outline-none text-[15px] font-bold text-slate-900 w-full placeholder:text-slate-200"
                                    placeholder="Enter given name"
                                />
                            </div>
                        </div>
                        <div className="p-6 group focus-within:bg-slate-50 transition-colors">
                            <label className="text-[9px] font-black text-slate-300 uppercase tracking-[0.25em] block mb-2 group-focus-within:text-[#F7CA00] transition-colors">Surname / Family Label</label>
                            <div className="flex items-center gap-3">
                                <User size={16} className="text-slate-300 group-focus-within:text-slate-900 transition-colors" />
                                <input
                                    type="text"
                                    value={formData.last_name}
                                    onChange={e => setFormData({ ...formData, last_name: e.target.value })}
                                    className="bg-transparent border-none outline-none text-[15px] font-bold text-slate-900 w-full placeholder:text-slate-200"
                                    placeholder="Enter family name"
                                />
                            </div>
                        </div>
                    </div>

                    {/* Contact Pair */}
                    <div className="grid grid-cols-1 md:grid-cols-2">
                        <div className="p-6 border-r border-slate-100 group focus-within:bg-slate-50 transition-colors">
                            <label className="text-[9px] font-black text-slate-300 uppercase tracking-[0.25em] block mb-2 group-focus-within:text-[#F7CA00] transition-colors">Telemetry Phone</label>
                            <div className="flex items-center gap-3">
                                <Phone size={16} className="text-slate-300 group-focus-within:text-slate-900 transition-colors" />
                                <input
                                    type="tel"
                                    value={formData.phone}
                                    onChange={e => setFormData({ ...formData, phone: e.target.value })}
                                    className="bg-transparent border-none outline-none text-[15px] font-bold text-slate-900 w-full placeholder:text-slate-200"
                                    placeholder="+92 XXX XXXXXXX"
                                />
                            </div>
                        </div>
                        <div className="p-6 group focus-within:bg-slate-50 transition-colors">
                            <label className="text-[9px] font-black text-slate-300 uppercase tracking-[0.25em] block mb-2 group-focus-within:text-[#F7CA00] transition-colors">Regional Hub (City)</label>
                            <div className="flex items-center gap-3">
                                <MapPin size={16} className="text-slate-300 group-focus-within:text-slate-900 transition-colors" />
                                <input
                                    type="text"
                                    value={formData.city}
                                    onChange={e => setFormData({ ...formData, city: e.target.value })}
                                    className="bg-transparent border-none outline-none text-[15px] font-bold text-slate-900 w-full placeholder:text-slate-200"
                                    placeholder="e.g. Karachi, Lahore"
                                />
                            </div>
                        </div>
                    </div>

                    {/* Full Address Block */}
                    <div className="p-6 group focus-within:bg-slate-50 transition-colors">
                        <label className="text-[9px] font-black text-slate-300 uppercase tracking-[0.25em] block mb-2 group-focus-within:text-[#F7CA00] transition-colors">Full Geographic Warehouse Address</label>
                        <div className="flex items-start gap-3">
                            <MapPin size={16} className="text-slate-300 pt-1 group-focus-within:text-slate-900 transition-colors" />
                            <textarea
                                rows={3}
                                value={formData.address}
                                onChange={e => setFormData({ ...formData, address: e.target.value })}
                                className="bg-transparent border-none outline-none text-[15px] font-bold text-slate-900 w-full placeholder:text-slate-200 resize-none"
                                placeholder="Enter full registered business address for distribution..."
                            />
                        </div>
                    </div>
                </div>

                {/* Footer Warning Segment */}
                <div className="bg-blue-50/50 border border-blue-100 p-6 rounded-lg flex items-start gap-4">
                    <AlertCircle className="text-blue-600 shrink-0 mt-0.5" size={18} />
                    <div className="space-y-1">
                        <p className="text-[11px] font-black text-blue-900 uppercase tracking-widest">Database Compliance Notice</p>
                        <p className="text-[11px] text-blue-600 font-medium leading-relaxed">
                            Changes to your identity credentials will impact manufacturing manifests and shipping certificates.
                            Re-verification protocol may trigger if regional data is significantly altered.
                        </p>
                    </div>
                </div>
            </div>

            <div className="mt-12 text-center">
                <p className="text-[9px] font-black text-slate-300 uppercase tracking-[0.4em]">Protocol Sync v4.2.0 • Region-Lock Enabled</p>
            </div>
        </div>
    );
}
