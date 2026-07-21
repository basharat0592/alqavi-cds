'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import {
    User, Mail, Phone, Truck, Hash, LogOut, ShieldCheck, Loader2, Lock, Eye, EyeOff,
} from 'lucide-react';
import toast from 'react-hot-toast';
import { authService } from '@/lib/auth';
import { riderService } from '@/services/delivery.service';

const SectionCard = ({ title, icon: Icon, children }: { title: string; icon: any; children: React.ReactNode }) => (
    <div className="bg-white border border-[#D5D9D9] rounded-lg shadow-sm overflow-hidden">
        <div className="px-5 py-3.5 border-b border-[#D5D9D9] bg-[#F7FAFA] flex items-center gap-2">
            <Icon size={15} className="text-gray-500" />
            <h3 className="text-[13px] font-bold text-[#111] uppercase tracking-wider">{title}</h3>
        </div>
        {children}
    </div>
);

const InfoRow = ({ icon: Icon, label, value }: { icon: any; label: string; value: any }) => (
    <div className="flex items-center gap-4 px-5 py-4">
        <span className="w-10 h-10 rounded-lg bg-[#F0F2F2] text-gray-500 flex items-center justify-center shrink-0"><Icon size={18} /></span>
        <div className="min-w-0">
            <p className="text-[11px] font-bold text-gray-400 uppercase tracking-wider">{label}</p>
            <p className="text-[14px] font-semibold text-[#111] truncate">{value || '—'}</p>
        </div>
    </div>
);

export default function DeliveryProfilePage() {
    const router = useRouter();
    const [loading, setLoading] = useState(true);
    const [rider, setRider] = useState<any>({});
    const [account, setAccount] = useState<any>({});

    const [oldPw, setOldPw] = useState('');
    const [newPw, setNewPw] = useState('');
    const [confirmPw, setConfirmPw] = useState('');
    const [show, setShow] = useState(false);
    const [saving, setSaving] = useState(false);

    useEffect(() => {
        setAccount(authService.getUser() || {});
        riderService.myDeliveries()
            .then((d) => setRider(d?.rider || {}))
            .catch(() => { })
            .finally(() => setLoading(false));
    }, []);

    const logout = () => { authService.logout(); router.replace('/login'); };

    const changePassword = async () => {
        if (newPw.length < 8) return toast.error('Password must be at least 8 characters.');
        if (newPw !== confirmPw) return toast.error('Passwords do not match.');
        setSaving(true);
        try {
            await riderService.changePassword(oldPw, newPw);
            toast.success('Password changed successfully!');
            setOldPw(''); setNewPw(''); setConfirmPw('');
        } catch (e: any) {
            toast.error(e?.response?.data?.error || 'Failed to change password.');
        } finally { setSaving(false); }
    };

    const name = rider.name || account.name || 'Rider';
    const initials = name.split(' ').map((w: string) => w[0]).join('').slice(0, 2).toUpperCase();
    const pwInput = 'w-full h-10 px-3 border border-[#D5D9D9] rounded-md text-sm text-[#111] outline-none focus:border-[#F59E0B] bg-white';

    return (
        <div className="space-y-5 sm:space-y-6 animate-in fade-in duration-500">
            <div className="border-b border-gray-200 pb-3 sm:pb-4">
                <h1 className="text-2xl font-semibold text-[#111]">Profile &amp; Security</h1>
                <p className="text-sm text-gray-500 mt-1">Your rider account details and password.</p>
            </div>

            {loading ? (
                <div className="py-24 text-center text-gray-400"><Loader2 className="w-6 h-6 animate-spin mx-auto" /></div>
            ) : (
                <div className="max-w-2xl space-y-6">
                    {/* Identity */}
                    <div className="bg-white border border-[#D5D9D9] rounded-lg shadow-sm overflow-hidden">
                        <div className="flex items-center gap-4 p-6 bg-[#F7FAFA] border-b border-[#D5D9D9]">
                            <div className="w-16 h-16 rounded-full bg-[#232F3E] text-white flex items-center justify-center text-[20px] font-bold shrink-0">
                                {initials || <User size={24} />}
                            </div>
                            <div className="min-w-0">
                                <h2 className="text-[18px] font-bold text-[#111] truncate">{name}</h2>
                                <span className="inline-flex items-center gap-1.5 mt-1 px-2.5 py-0.5 rounded-full bg-sky-50 text-sky-700 border border-sky-200 text-[10px] font-bold uppercase tracking-wider">
                                    <ShieldCheck size={11} /> Delivery Rider
                                </span>
                            </div>
                        </div>
                    </div>

                    {/* Personal Information */}
                    <SectionCard title="Personal Information" icon={User}>
                        <div className="divide-y divide-gray-100">
                            <InfoRow icon={Mail} label="Email" value={account.email || rider.email} />
                            <InfoRow icon={Phone} label="Phone" value={rider.phone} />
                        </div>
                    </SectionCard>

                    {/* Vehicle Details */}
                    <SectionCard title="Vehicle Details" icon={Truck}>
                        <div className="divide-y divide-gray-100">
                            <InfoRow icon={Truck} label="Vehicle Type" value={rider.vehicle_type} />
                            <InfoRow icon={Hash} label="Vehicle Number" value={rider.vehicle_number} />
                        </div>
                    </SectionCard>

                    {/* Change Password */}
                    <SectionCard title="Change Password" icon={Lock}>
                        <div className="p-5 space-y-4">
                            <div>
                                <label className="block text-[12px] font-bold text-gray-600 mb-1.5">Current Password</label>
                                <input type={show ? 'text' : 'password'} value={oldPw} onChange={e => setOldPw(e.target.value)} className={pwInput} placeholder="Enter current password" />
                            </div>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-[12px] font-bold text-gray-600 mb-1.5">New Password</label>
                                    <input type={show ? 'text' : 'password'} value={newPw} onChange={e => setNewPw(e.target.value)} className={pwInput} placeholder="At least 8 characters" />
                                </div>
                                <div>
                                    <label className="block text-[12px] font-bold text-gray-600 mb-1.5">Confirm New Password</label>
                                    <input type={show ? 'text' : 'password'} value={confirmPw} onChange={e => setConfirmPw(e.target.value)} className={pwInput} placeholder="Re-enter new password" />
                                </div>
                            </div>
                            <div className="flex items-center justify-between">
                                <button type="button" onClick={() => setShow(s => !s)} className="inline-flex items-center gap-1.5 text-[12px] font-semibold text-gray-500 hover:text-[#007185]">
                                    {show ? <EyeOff size={14} /> : <Eye size={14} />} {show ? 'Hide' : 'Show'} passwords
                                </button>
                                <button onClick={changePassword} disabled={saving || !oldPw || !newPw}
                                    className="inline-flex items-center gap-2 h-10 px-5 rounded-md bg-[#232F3E] text-white text-[13px] font-bold hover:bg-[#1a2532] transition-all disabled:opacity-50">
                                    {saving ? <Loader2 size={15} className="animate-spin" /> : <Lock size={15} />} Update Password
                                </button>
                            </div>
                        </div>
                    </SectionCard>

                    {/* Login & Security */}
                    <SectionCard title="Login & Security" icon={ShieldCheck}>
                        <div className="p-5 flex items-center justify-between gap-4">
                            <p className="text-[13px] text-gray-600">Sign out of this device.</p>
                            <button onClick={logout}
                                className="inline-flex items-center gap-2 h-10 px-5 rounded-md border border-[#D5D9D9] bg-white text-[13px] font-bold text-red-600 hover:bg-red-50 hover:border-red-200 transition-all">
                                <LogOut size={15} /> Sign Out
                            </button>
                        </div>
                    </SectionCard>
                </div>
            )}
        </div>
    );
}
