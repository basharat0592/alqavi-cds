'use client';

import { useState, useEffect } from 'react';
import { RefreshCw } from 'lucide-react';
import { authService } from '@/lib/auth';
import api from '@/lib/axios';
import Link from 'next/link';
import toast from 'react-hot-toast';

type Section = 'name' | 'email' | 'phone' | 'password' | null;

export default function ProfileDashboard() {
    const [user, setUser] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [editing, setEditing] = useState<Section>(null);
    const [saving, setSaving] = useState(false);

    // Edit form values
    const [form, setForm] = useState({ first_name: '', last_name: '', email: '', phone: '' });
    const [pwd, setPwd] = useState({ old_password: '', new_password: '', new_password_confirm: '' });

    const loadProfile = async () => {
        try {
            const response = await api.get('/v1/users/profile/');
            setUser(response.data);
        } catch (err) {
            console.error('Failed to fetch profile', err);
            setUser(authService.getUser());
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => { loadProfile(); }, []);

    const displayName = `${user?.first_name || ''} ${user?.last_name || ''}`.trim()
        || user?.name || user?.username || 'Not provided';

    const openEdit = (section: Section) => {
        setForm({
            first_name: user?.first_name || '',
            last_name: user?.last_name || '',
            email: user?.email || '',
            phone: user?.phone || '',
        });
        setPwd({ old_password: '', new_password: '', new_password_confirm: '' });
        setEditing(section);
    };

    const saveProfile = async (patch: Record<string, any>) => {
        if (!user?.id) return toast.error('Profile not loaded yet.');
        setSaving(true);
        try {
            await api.patch(`/v1/users/${user.id}/update/`, patch);
            toast.success('Profile updated');
            setEditing(null);
            await loadProfile();
        } catch (err: any) {
            toast.error(err?.response?.data?.error || 'Update failed');
        } finally {
            setSaving(false);
        }
    };

    const savePassword = async () => {
        if (!user?.id) return toast.error('Profile not loaded yet.');
        if (pwd.new_password.length < 8) return toast.error('New password must be at least 8 characters.');
        if (pwd.new_password !== pwd.new_password_confirm) return toast.error('New passwords do not match.');
        setSaving(true);
        try {
            await api.post(`/v1/users/${user.id}/change-password/`, pwd);
            toast.success('Password changed');
            setEditing(null);
        } catch (err: any) {
            toast.error(err?.response?.data?.error || 'Failed to change password');
        } finally {
            setSaving(false);
        }
    };

    const inputCls = 'w-full px-3 py-2 text-sm border border-[#D5D9D9] rounded-md outline-none focus:border-[#e77600] focus:ring-2 focus:ring-[#e77600]/20 transition-all';
    const EditBtn = ({ section }: { section: Section }) => (
        <button onClick={() => openEdit(section)}
            className="px-6 py-1.5 bg-white hover:bg-gray-50 border border-[#D5D9D9] rounded-lg text-xs font-medium text-[#111] shadow-sm">
            Edit
        </button>
    );
    const Actions = ({ onSave }: { onSave: () => void }) => (
        <div className="flex items-center gap-2 mt-3">
            <button onClick={onSave} disabled={saving}
                className="px-5 py-1.5 bg-[#FFD814] hover:bg-[#F7CA00] border border-[#FCD200] rounded-lg text-xs font-bold text-[#111] shadow-sm disabled:opacity-50 flex items-center gap-1.5">
                {saving && <RefreshCw size={12} className="animate-spin" />} Save
            </button>
            <button onClick={() => setEditing(null)} disabled={saving}
                className="px-5 py-1.5 bg-white hover:bg-gray-50 border border-[#D5D9D9] rounded-lg text-xs font-medium text-[#111]">
                Cancel
            </button>
        </div>
    );

    if (loading) {
        return <div className="flex items-center justify-center py-32"><RefreshCw className="w-8 h-8 animate-spin text-gray-300" /></div>;
    }

    return (
        <div className="max-w-[800px] mx-auto space-y-8 animate-in fade-in duration-500 pb-20">
            <div>
                <h1 className="text-3xl font-normal text-[#111] mb-2">Login & Security</h1>
            </div>

            <div className="bg-white border border-[#D5D9D9] rounded-lg overflow-hidden">
                <div className="divide-y divide-[#D5D9D9]">
                    {/* Name */}
                    <div className="p-6 flex justify-between items-start gap-4 hover:bg-gray-50 transition-colors">
                        <div className="flex-1">
                            <p className="text-sm font-bold text-[#111]">Name:</p>
                            {editing === 'name' ? (
                                <div className="mt-2 max-w-md">
                                    <div className="grid grid-cols-2 gap-2">
                                        <input className={inputCls} placeholder="First name" value={form.first_name}
                                            onChange={e => setForm(f => ({ ...f, first_name: e.target.value }))} />
                                        <input className={inputCls} placeholder="Last name" value={form.last_name}
                                            onChange={e => setForm(f => ({ ...f, last_name: e.target.value }))} />
                                    </div>
                                    <Actions onSave={() => saveProfile({ first_name: form.first_name, last_name: form.last_name })} />
                                </div>
                            ) : (
                                <p className="text-sm text-gray-700 mt-1">{displayName}</p>
                            )}
                        </div>
                        {editing !== 'name' && <EditBtn section="name" />}
                    </div>

                    {/* Email */}
                    <div className="p-6 flex justify-between items-start gap-4 hover:bg-gray-50 transition-colors">
                        <div className="flex-1">
                            <p className="text-sm font-bold text-[#111]">Email:</p>
                            {editing === 'email' ? (
                                <div className="mt-2 max-w-md">
                                    <input className={inputCls} type="email" value={form.email}
                                        onChange={e => setForm(f => ({ ...f, email: e.target.value }))} />
                                    <Actions onSave={() => saveProfile({ email: form.email })} />
                                </div>
                            ) : (
                                <p className="text-sm text-gray-700 mt-1">{user?.email || 'Not provided'}</p>
                            )}
                        </div>
                        {editing !== 'email' && <EditBtn section="email" />}
                    </div>

                    {/* Phone */}
                    <div className="p-6 flex justify-between items-start gap-4 hover:bg-gray-50 transition-colors">
                        <div className="flex-1">
                            <p className="text-sm font-bold text-[#111]">Mobile Phone Number:</p>
                            {editing === 'phone' ? (
                                <div className="mt-2 max-w-md">
                                    <input className={inputCls} value={form.phone}
                                        onChange={e => setForm(f => ({ ...f, phone: e.target.value }))} />
                                    <Actions onSave={() => saveProfile({ phone: form.phone })} />
                                </div>
                            ) : (
                                <p className="text-sm text-gray-700 mt-1">{user?.phone || 'Not provided'}</p>
                            )}
                        </div>
                        {editing !== 'phone' && <EditBtn section="phone" />}
                    </div>

                    {/* Password */}
                    <div className="p-6 flex justify-between items-start gap-4 hover:bg-gray-50 transition-colors">
                        <div className="flex-1">
                            <p className="text-sm font-bold text-[#111]">Password:</p>
                            {editing === 'password' ? (
                                <div className="mt-2 max-w-md space-y-2">
                                    <input className={inputCls} type="password" placeholder="Current password" value={pwd.old_password}
                                        onChange={e => setPwd(p => ({ ...p, old_password: e.target.value }))} />
                                    <input className={inputCls} type="password" placeholder="New password (min 8 chars)" value={pwd.new_password}
                                        onChange={e => setPwd(p => ({ ...p, new_password: e.target.value }))} />
                                    <input className={inputCls} type="password" placeholder="Confirm new password" value={pwd.new_password_confirm}
                                        onChange={e => setPwd(p => ({ ...p, new_password_confirm: e.target.value }))} />
                                    <Actions onSave={savePassword} />
                                </div>
                            ) : (
                                <p className="text-sm text-gray-700 mt-1">********</p>
                            )}
                        </div>
                        {editing !== 'password' && <EditBtn section="password" />}
                    </div>
                </div>
            </div>

            {/* Back Button */}
            <div className="pt-4 flex justify-start">
                <Link
                    href="/customer/dashboard"
                    className="inline-block px-8 py-2 bg-[#FFD814] hover:bg-[#F7CA00] border border-[#FCD200] rounded-lg text-sm font-medium text-[#111] transition-all shadow-sm shadow-[#FCD200]/20"
                >
                    Done
                </Link>
            </div>
        </div>
    );
}
