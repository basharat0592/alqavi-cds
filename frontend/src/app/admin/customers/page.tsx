'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
    Users, User, ShoppingBag, Shield, Search,
    Edit3, Trash2, X, Check, Plus,
    Mail, Calendar, AlertTriangle, Loader2, KeyRound, Activity, History
} from 'lucide-react';
import { userService, roleService, AppUser, AppRole, ActivityLog } from '@/lib/api';
import { RoleBadge, ActiveBadge } from '@/components/ui/StatusBadge';
import { formatDate } from '@/lib/utils';

type RoleFilter = 'all' | 'customer' | 'seller' | 'admin' | string;

// ── Add User Modal ─────────────────────────────────────────────────────────────
function AddModal({ roles, onSave, onClose }: { roles: AppRole[], onSave: (u: AppUser) => void; onClose: () => void }) {
    const [form, setForm] = useState({
        first_name: '', last_name: '', email: '', password: '', password_confirm: '',
        role: '' as number | string, phone_number: '', business_name: ''
    });
    const [saving, setSaving] = useState(false);
    const [errors, setErrors] = useState<Record<string, string>>({});

    const handle = (k: string, v: string | number) => {
        setForm(p => ({ ...p, [k]: v }));
        if (errors[k]) setErrors(p => ({ ...p, [k]: '' }));
    };

    const validate = () => {
        const newErrors: Record<string, string> = {};
        if (!form.first_name.trim()) newErrors.first_name = 'First name is required';
        if (!form.last_name.trim()) newErrors.last_name = 'Last name is required';
        if (!form.email.trim()) newErrors.email = 'Email is required';
        else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) newErrors.email = 'Invalid email format';
        if (!form.password.trim()) newErrors.password = 'Password is required';
        else if (form.password.length < 8) newErrors.password = 'Password must be at least 8 characters';
        if (form.password !== form.password_confirm) newErrors.password_confirm = 'Passwords must match';
        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    const submit = async () => {
        if (!validate()) return;
        setSaving(true);
        try {
            const payload = { ...form };
            if (payload.role === '') delete (payload as any).role;
            const created = await userService.create(payload);
            const selectedRole = roles.find(r => r.id === form.role);
            if (selectedRole) created.role_name = selectedRole.name;
            onSave(created);
        } catch (e: any) {
            const errorMsg = e?.response?.data?.detail || e?.response?.data?.password?.[0] || 'Failed to create customer.';
            setErrors({ submit: errorMsg });
        } finally {
            setSaving(false);
        }
    };

    const baseFields = [
        { label: 'First Name', key: 'first_name', type: 'text', placeholder: 'John', required: true },
        { label: 'Last Name', key: 'last_name', type: 'text', placeholder: 'Doe', required: true },
    ];

    const contactFields = [
        { label: 'Email Address', key: 'email', type: 'email', placeholder: 'john@example.com', required: true },
        { label: 'Phone Number', key: 'phone_number', type: 'tel', placeholder: '+92 3001234567' },
    ];

    const securityFields = [
        { label: 'Password', key: 'password', type: 'password', placeholder: 'At least 8 characters', required: true },
        { label: 'Confirm Password', key: 'password_confirm', type: 'password', placeholder: 'Confirm password', required: true },
    ];

    const renderField = (f: any) => (
        <div key={f.key}>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
                {f.label}
                {f.required && <span className="text-red-500 ml-1">*</span>}
            </label>
            <div className="relative">
                <input
                    type={f.type}
                    placeholder={f.placeholder}
                    value={(form as any)[f.key]}
                    onChange={e => handle(f.key, e.target.value)}
                    className={`w-full px-4 py-2.5 bg-gray-50 border-2 rounded-lg text-sm outline-none transition-all ${errors[f.key]
                        ? 'border-red-300 focus:border-red-500 focus:ring-2 focus:ring-red-200'
                        : 'border-gray-200 focus:border-[#FF9900] focus:ring-2 focus:ring-[#FF9900]/10'
                        }`}
                />
                {errors[f.key] && <p className="text-red-600 text-xs mt-1 font-medium">{errors[f.key]}</p>}
            </div>
        </div>
    );

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
            <div className="bg-white rounded-2xl border border-gray-200 shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col">
                {/* Header */}
                <div className="bg-[#131921] px-6 py-5 flex items-center justify-between flex-shrink-0">
                    <div className="flex items-center gap-3">
                        <div className="bg-white/20 rounded-lg p-2">
                            <Plus className="h-5 w-5 text-white" />
                        </div>
                        <div>
                            <h2 className="text-white font-bold text-lg">Add New Customer</h2>
                            <p className="text-blue-100 text-xs">Create a new customer account with proper details</p>
                        </div>
                    </div>
                    <button onClick={onClose} className="text-white/70 hover:text-white transition p-1">
                        <X className="h-6 w-6" />
                    </button>
                </div>

                {/* Body */}
                <div className="overflow-y-auto flex-1 p-6 space-y-6">
                    {errors.submit && (
                        <div className="bg-red-50 border-l-4 border-red-500 p-4 rounded flex items-start gap-3">
                            <AlertTriangle className="h-5 w-5 text-red-500 mt-0.5 flex-shrink-0" />
                            <div>
                                <p className="font-semibold text-red-900">Creation Failed</p>
                                <p className="text-red-700 text-sm mt-0.5">{errors.submit}</p>
                            </div>
                        </div>
                    )}

                    {/* Basic Information Section */}
                    <div>
                        <h3 className="text-sm font-bold text-gray-900 mb-3 flex items-center gap-2">
                            <User className="h-4 w-4 text-[#FF9900]" /> Basic Information
                        </h3>
                        <div className="grid grid-cols-2 gap-4">
                            {baseFields.map(renderField)}
                        </div>
                    </div>

                    {/* Contact Information Section */}
                    <div>
                        <h3 className="text-sm font-bold text-gray-900 mb-3 flex items-center gap-2">
                            <Mail className="h-4 w-4 text-[#FF9900]" /> Contact Information
                        </h3>
                        <div className="space-y-4">
                            {contactFields.map(renderField)}
                        </div>
                    </div>

                    {/* Security Section */}
                    <div>
                        <h3 className="text-sm font-bold text-gray-900 mb-3 flex items-center gap-2">
                            <KeyRound className="h-4 w-4 text-[#FF9900]" /> Security
                        </h3>
                        <div className="mb-4">
                            {securityFields.map(renderField)}
                        </div>
                        <p className="text-xs text-gray-500 bg-gray-50 p-3 rounded-lg">
                            Password must be at least 6 characters long for security.
                        </p>
                    </div>

                    {/* Role & Business Section */}
                    <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
                        <h3 className="text-sm font-bold text-gray-900 mb-3 flex items-center gap-2">
                            <Shield className="h-4 w-4 text-[#FF9900]" /> Role & Business
                        </h3>
                        <div className="space-y-4">
                            <div>
                                <label className="block text-sm font-semibold text-gray-700 mb-2">User Role</label>
                                <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                                    {roles.length > 0 ? roles.map(role => (
                                        <button
                                            key={role.id}
                                            onClick={() => handle('role', role.id)}
                                            className={`p-3 border-2 text-center transition ${form.role === role.id
                                                ? 'border-[#FF9900] bg-[#FF9900]/10'
                                                : 'border-gray-200 bg-white hover:border-gray-300'
                                                }`}
                                        >
                                            <p className="font-bold text-sm text-gray-900">{role.name}</p>
                                        </button>
                                    )) : (
                                        <p className="text-xs text-gray-500 col-span-3">No active roles found in system.</p>
                                    )}
                                </div>
                            </div>

                            {form.role === roles.find(r => r.name.toLowerCase() === 'seller')?.id && (
                                <div>
                                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                                        Business Name
                                    </label>
                                    <div>
                                        <input
                                            type="text"
                                            placeholder="Your business name"
                                            value={form.business_name}
                                            onChange={e => handle('business_name', e.target.value)}
                                            className={`w-full px-4 py-2.5 bg-gray-50 border-2 rounded-lg text-sm outline-none transition-all ${errors.business_name
                                                ? 'border-red-300 focus:border-red-500 focus:ring-2 focus:ring-red-200'
                                                : 'border-gray-200 focus:border-[#FF9900] focus:ring-2 focus:ring-[#FF9900]/10'
                                                }`}
                                        />
                                        {errors.business_name && <p className="text-red-600 text-xs mt-1 font-medium">{errors.business_name}</p>}
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                </div>

                {/* Footer */}
                <div className="px-6 py-4 bg-gray-50 border-t border-gray-200 flex gap-3 flex-shrink-0">
                    <button
                        onClick={onClose}
                        className="flex-1 py-2.5 bg-white border-2 border-gray-300 text-gray-700 font-semibold rounded-lg hover:bg-gray-50 transition"
                    >
                        Cancel
                    </button>
                    <button
                        onClick={submit}
                        disabled={saving}
                        className="flex-1 flex items-center justify-center gap-2 py-2.5 bg-[#FF9900] hover:bg-[#e68a00] text-[#131921] font-semibold transition disabled:opacity-60"
                    >
                        {saving ? (
                            <>
                                <Loader2 className="h-4 w-4 animate-spin" />
                                Creating...
                            </>
                        ) : (
                            <>
                                <Check className="h-4 w-4" />
                                Create Customer
                            </>
                        )}
                    </button>
                </div>
            </div>
        </div>
    );
}

// ── Edit Modal ─────────────────────────────────────────────────────────────────
function EditModal({ user, roles, onSave, onClose }: { user: AppUser; roles: AppRole[]; onSave: (u: AppUser) => void; onClose: () => void }) {
    const defaultRoleId = roles.find(r => r.name === user.role_name)?.id || user.role || '';
    const [form, setForm] = useState({ ...user, role: defaultRoleId });
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState('');

    const submit = async () => {
        setSaving(true); setError('');
        try {
            const updates: any = {
                first_name: form.first_name,
                last_name: form.last_name,
                email: form.email,
                phone: form.phone || form.phone_number,
                address: form.address,
                city: form.city,
                country: form.country,
                postal_code: form.postal_code,
            };
            const updated = await userService.update(user.id, updates);

            if (form.is_active !== user.is_active) {
                if (form.is_active) await userService.activate(user.id);
                else await userService.deactivate(user.id);
                updated.is_active = form.is_active;
                updated.status_display = form.is_active ? 'Active' : 'Inactive';
            }

            const selectedRole = roles.find(r => r.id === Number(form.role));
            if (selectedRole) updated.role_name = selectedRole.name;

            onSave(updated);
        } catch (e: any) {
            setError(e?.response?.data?.detail || 'Failed to update customer.');
        } finally { setSaving(false); }
    };

    const textFields = [
        { label: 'First Name', key: 'first_name', type: 'text' },
        { label: 'Last Name', key: 'last_name', type: 'text' },
        { label: 'Email', key: 'email', type: 'email' },
        { label: 'Phone', key: 'phone', type: 'text' },
        { label: 'Address', key: 'address', type: 'text' },
        { label: 'City', key: 'city', type: 'text' },
        { label: 'Country', key: 'country', type: 'text' },
        { label: 'Postal Code', key: 'postal_code', type: 'text' },
    ];

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
            <div className="bg-white rounded-2xl border border-gray-200 shadow-2xl w-full max-w-md mx-4 overflow-hidden">
                <div className="bg-[#131921] px-5 py-4 flex items-center justify-between">
                    <h2 className="text-white font-bold text-base">Edit Customer</h2>
                    <button onClick={onClose} className="text-white/70 hover:text-white"><X className="h-5 w-5" /></button>
                </div>
                <div className="p-6 space-y-3 max-h-[70vh] overflow-y-auto">
                    {error && <p className="text-xs text-red-600 bg-red-50 border border-red-200 rounded px-3 py-2">{error}</p>}
                    {textFields.map(f => (
                        <div key={f.key}>
                            <label className="block text-xs font-bold text-gray-700 mb-1">{f.label}</label>
                            <input type={f.type} value={(form as any)[f.key] || ''}
                                onChange={e => setForm(p => ({ ...p, [f.key]: e.target.value }))}
                                className="w-full bg-gray-50 border border-gray-200 rounded-lg px-3 py-2.5 text-sm outline-none focus:bg-white focus:ring-2 focus:ring-[#FF9900]/20 focus:border-[#FF9900] transition-all" />
                        </div>
                    ))}

                    <div>
                        <label className="block text-xs font-bold text-gray-700 mb-1">Status</label>
                        <select value={form.is_active === false ? 'inactive' : 'active'}
                            onChange={e => setForm(p => ({ ...p, is_active: e.target.value === 'active' }))}
                            className="w-full bg-gray-50 border border-gray-200 rounded-lg px-3 py-2.5 text-sm outline-none focus:bg-white focus:ring-2 focus:ring-[#FF9900]/20 focus:border-[#FF9900] transition-all">
                            <option value="active">Active</option>
                            <option value="inactive">Inactive</option>
                        </select>
                    </div>
                </div>
                <div className="px-6 pb-6 flex gap-3">
                    <button onClick={onClose} className="flex-1 py-2.5 bg-white border border-gray-300 text-gray-700 font-bold text-sm rounded-lg hover:bg-gray-50 transition">Cancel</button>
                    <button onClick={submit} disabled={saving}
                        className="flex-1 flex items-center justify-center gap-2 py-2.5 bg-[#FF9900] hover:bg-[#e68a00] text-[#131921] font-bold text-sm transition disabled:opacity-60">
                        {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <><Check className="h-4 w-4" /> Save Changes</>}
                    </button>
                </div>
            </div>
        </div>
    );
}

// ── Delete Confirm ────────────────────────────────────────────────────────────
function DeleteConfirm({ user, onConfirm, onClose }: { user: AppUser; onConfirm: () => void; onClose: () => void }) {
    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
            <div className="bg-white rounded-lg shadow-2xl w-full max-w-sm mx-4 overflow-hidden">
                <div className="p-6 text-center">
                    <div className="w-14 h-14 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
                        <AlertTriangle className="h-7 w-7 text-red-500" />
                    </div>
                    <h3 className="font-bold text-gray-900 text-lg mb-1">Delete Customer?</h3>
                    <p className="text-sm text-gray-500 mb-6">
                        Are you sure you want to delete <span className="font-bold text-gray-800">{user.first_name} {user.last_name}</span>? This action cannot be undone.
                    </p>
                    <div className="flex gap-3">
                        <button onClick={onConfirm} className="flex-1 py-2.5 bg-red-600 hover:bg-red-700 text-white font-bold text-sm rounded transition">Yes, Delete</button>
                        <button onClick={onClose} className="flex-1 py-2.5 border border-gray-300 text-gray-700 font-bold text-sm rounded hover:bg-gray-50 transition">Cancel</button>
                    </div>
                </div>
            </div>
        </div>
    );
}

// ── Change Password Modal ─────────────────────────────────────────────────────
function ChangePasswordModal({ user, onClose, onShowToast }: { user: AppUser; onClose: () => void; onShowToast: (msg: string) => void }) {
    const [oldPassword, setOldPassword] = useState('');
    const [newPassword, setNewPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    const submit = async () => {
        if (!oldPassword || !newPassword || !confirmPassword) {
            setError('All fields are required.'); return;
        }
        if (newPassword.length < 8) {
            setError('New password must be at least 8 characters.'); return;
        }
        if (newPassword !== confirmPassword) {
            setError('New passwords do not match.'); return;
        }
        setLoading(true); setError('');
        try {
            await userService.changePassword(user.id, {
                old_password: oldPassword,
                new_password: newPassword,
                new_password_confirm: confirmPassword
            });
            onShowToast('Password updated successfully!');
            onClose();
        } catch (e: any) {
            setError(e?.response?.data?.error || e?.response?.data?.detail || 'Failed to update password.');
        } finally { setLoading(false); }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
            <div className="bg-white rounded-lg shadow-2xl w-full max-w-sm mx-4 overflow-hidden">
                <div className="bg-[#131921] px-5 py-4 flex items-center justify-between">
                    <h2 className="text-white font-bold text-base">Change Password</h2>
                    <button onClick={onClose} className="text-white/70 hover:text-white"><X className="h-5 w-5" /></button>
                </div>
                <div className="p-6 space-y-3">
                    {error && <p className="text-xs text-red-600 bg-red-50 border border-red-200 rounded px-3 py-2">{error}</p>}
                    <div>
                        <label className="block text-xs font-bold text-gray-700 mb-1">Old Password</label>
                        <input type="password" value={oldPassword} onChange={e => setOldPassword(e.target.value)}
                            className="w-full bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none focus:bg-white focus:ring-2 focus:ring-[#FF9900]/20 focus:border-[#FF9900]" />
                    </div>
                    <div>
                        <label className="block text-xs font-bold text-gray-700 mb-1">New Password</label>
                        <input type="password" value={newPassword} onChange={e => setNewPassword(e.target.value)}
                            className="w-full bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none focus:bg-white focus:ring-2 focus:ring-[#FF9900]/20 focus:border-[#FF9900]" />
                    </div>
                    <div>
                        <label className="block text-xs font-bold text-gray-700 mb-1">Confirm New Password</label>
                        <input type="password" value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)}
                            className="w-full bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none focus:bg-white focus:ring-2 focus:ring-[#FF9900]/20 focus:border-[#FF9900]" />
                    </div>
                </div>
                <div className="px-6 pb-6 flex gap-3">
                    <button onClick={onClose} className="flex-1 py-2 bg-white border border-gray-300 text-gray-700 font-bold text-sm rounded-lg hover:bg-gray-50">Cancel</button>
                    <button onClick={submit} disabled={loading} className="flex-1 py-2 bg-[#FF9900] text-[#131921] font-bold text-sm hover:bg-[#e68a00] disabled:opacity-50">
                        {loading ? 'Saving...' : 'Change'}
                    </button>
                </div>
            </div>
        </div>
    );
}

// ── Activity Logs Modal ───────────────────────────────────────────────────────
function ActivityLogsModal({ user, onClose }: { user: AppUser; onClose: () => void }) {
    const [logs, setLogs] = useState<ActivityLog[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        userService.getActivityLogs(user.id).then(setLogs).catch(() => { })
            .finally(() => setLoading(false));
    }, [user.id]);

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[85vh] flex flex-col">
                <div className="px-6 py-4 border-b flex justify-between items-center bg-gray-50">
                    <div className="flex items-center gap-3">
                        <History className="h-5 w-5 text-[#FF9900]" />
                        <h2 className="font-bold text-gray-900">Activity Logs - {user.first_name} {user.last_name || user.username}</h2>
                    </div>
                    <button onClick={onClose} className="text-gray-500 hover:text-gray-900"><X className="h-5 w-5" /></button>
                </div>
                <div className="flex-1 overflow-y-auto p-4">
                    {loading ? (
                        <div className="flex justify-center py-10"><Loader2 className="animate-spin h-6 w-6 text-[#FF9900]" /></div>
                    ) : logs.length === 0 ? (
                        <p className="text-center text-gray-500 py-10 text-sm">No activity logs found for this customer.</p>
                    ) : (
                        <div className="space-y-4 relative before:absolute before:inset-0 before:ml-5 before:-translate-x-px md:before:mx-auto md:before:translate-x-0 before:h-full before:w-0.5 before:bg-gradient-to-b before:from-transparent before:via-gray-200 before:to-transparent">
                            {logs.map((log) => (
                                <div key={log.id} className="relative flex items-center justify-between md:justify-normal md:odd:flex-row-reverse group is-active">
                                    <div className="flex items-center justify-center w-10 h-10 rounded-full border border-white bg-blue-50 text-[#FF9900] shadow shrink-0 md:order-1 md:group-odd:-translate-x-1/2 md:group-even:translate-x-1/2 z-10">
                                        <Activity className="h-4 w-4" />
                                    </div>
                                    <div className="w-[calc(100%-4rem)] md:w-[calc(50%-2.5rem)] bg-white p-4 rounded-lg shadow-sm border border-gray-100 mb-2">
                                        <div className="flex items-center justify-between mb-1">
                                            <span className="font-bold text-gray-900 text-sm">{log.action_display || log.action}</span>
                                        </div>
                                        <p className="text-sm text-gray-600">{log.description}</p>
                                        <div className="flex items-center gap-2 mt-2 text-xs text-gray-400">
                                            <span>{new Date(log.timestamp).toLocaleString()}</span>
                                            <span>•</span>
                                            <span>{log.ip_address}</span>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}

// ── Main Page ─────────────────────────────────────────────────────────────────
export default function AdminCustomersPage() {
    const [roles, setRoles] = useState<AppRole[]>([]);
    const [users, setUsers] = useState<AppUser[]>([]);
    const [loading, setLoading] = useState(true);
    const [activeRole, setActiveRole] = useState<RoleFilter>('customer');
    const [search, setSearch] = useState('');
    const [showAddModal, setShowAddModal] = useState(false);
    const [deleteUser, setDeleteUser] = useState<AppUser | null>(null);
    const [passwordUser, setPasswordUser] = useState<AppUser | null>(null);
    const [logsUser, setLogsUser] = useState<AppUser | null>(null);
    const [toast, setToast] = useState('');
    const router = useRouter();

    const loadData = async () => {
        setLoading(true);
        try {
            const [usersData, rolesData] = await Promise.all([
                userService.getAll().catch(() => []),
                roleService.getAll().catch(() => [])
            ]);
            setRoles(rolesData);
            setUsers(usersData);
        } catch (err) {
            console.error('Failed to load customers data', err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => { loadData(); }, []);

    const showToast = (msg: string) => { setToast(msg); setTimeout(() => setToast(''), 3000); };

    const handleAdd = (created: AppUser) => {
        setUsers(prev => [created, ...prev]);
        setShowAddModal(false);
        showToast('Customer created successfully!');
    };

    const handleDelete = async () => {
        if (!deleteUser) return;
        try {
            await userService.delete(deleteUser.id);
            setUsers(prev => prev.filter(u => u.id !== deleteUser.id));
            showToast('Customer deleted.');
        } catch {
            showToast('Failed to delete customer.');
        } finally {
            setDeleteUser(null);
        }
    };

    const counts: Record<string, number> = {
        all: users.length,
        admin: users.filter(u => u.role_name?.toLowerCase() === 'admin' || (typeof u.role === 'string' && u.role.toLowerCase() === 'admin')).length,
        seller: users.filter(u => u.role_name?.toLowerCase() === 'seller' || (typeof u.role === 'string' && u.role.toLowerCase() === 'seller')).length,
        customer: users.filter(u => !u.role || u.role_name?.toLowerCase() === 'customer' || (typeof u.role === 'string' && u.role.toLowerCase() === 'customer')).length,
    };

    const filtered = users.filter(u => {
        const name = `${u.first_name} ${u.last_name}`.trim();
        const roleMatch = activeRole === 'all' ||
            (u.role_name && u.role_name.toLowerCase() === activeRole) ||
            (typeof u.role === 'string' && u.role.toLowerCase() === activeRole) ||
            (!u.role && activeRole === 'customer');

        const matchSearch = !search ||
            name.toLowerCase().includes(search.toLowerCase()) ||
            u.email?.toLowerCase().includes(search.toLowerCase()) ||
            u.username?.toLowerCase().includes(search.toLowerCase());
        return roleMatch && matchSearch;
    });

    const sidebarItems: { role: RoleFilter; label: string; icon: any }[] = [
        { role: 'all', label: 'All Users', icon: Users },
        { role: 'customer', label: 'Customers', icon: User },
        { role: 'seller', label: 'Sellers', icon: ShoppingBag },
        { role: 'admin', label: 'Admins', icon: Shield },
    ];

    return (
        <div className="max-w-[1600px] mx-auto space-y-6 pb-12 font-sans px-3 sm:px-6 mt-6 relative z-0">

            {/* Ambient Background Glow for Premium Feel */}
            <div className="fixed top-0 left-0 w-full h-full overflow-hidden pointer-events-none -z-10">
                <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] rounded-full bg-[#FF9900]/10 blur-[120px]" />
                <div className="absolute top-[20%] right-[-10%] w-[30%] h-[50%] rounded-full bg-[#FF9900]/10 blur-[100px]" />
            </div>

            {/* Toast */}
            {toast && (
                <div className="fixed bottom-6 right-6 z-50 bg-[#131921] text-white px-5 py-3 rounded-xl shadow-lg text-sm font-bold flex items-center gap-2 animate-in slide-in-from-bottom-5">
                    <Check className="h-5 w-5 text-white" /> {toast}
                </div>
            )}

            {/* ── Merged Header + Stats Card ── */}
            <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
                <div className="absolute top-0 right-0 w-64 h-64 bg-[#FF9900]/6 rounded-full blur-[80px] -z-10 pointer-events-none" />

                {/* Title + Add User */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 px-7 sm:px-10 pt-7 pb-5 border-b border-gray-100/60">
                    <div className="flex items-center gap-4">
                        <div className="w-11 h-11 bg-[#FF9900] rounded-xl flex items-center justify-center flex-shrink-0">
                            <Users className="h-5 w-5 text-[#131921]" strokeWidth={2.5} />
                        </div>
                        <div>
                            <h1 className="text-xl font-black text-gray-900 tracking-tight">Customer Management</h1>
                            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mt-0.5">Manage Platform Customers</p>
                        </div>
                    </div>
                    <Link href="/admin/customers/add">
                        <button className="flex items-center gap-2 px-5 py-2.5 bg-[#FF9900] text-[#131921] font-black text-xs uppercase tracking-widest rounded-xl hover:bg-[#e68a00] transition-all duration-200 self-start sm:self-auto">
                            <Plus className="h-4 w-4" strokeWidth={2.5} /> Add Customer
                        </button>
                    </Link>
                </div>

                {/* 3 Stat strips — compact */}
                <div className="grid grid-cols-1 sm:grid-cols-3 divide-y sm:divide-y-0 sm:divide-x divide-gray-100/60">
                    <div className="flex items-center justify-between px-7 sm:px-10 py-4">
                        <div>
                            <p className="text-[9px] font-black uppercase tracking-widest text-gray-400 mb-0.5">Total Customers</p>
                            <p className="text-2xl font-black text-gray-900 tracking-tight">{loading ? '—' : users.length}</p>
                        </div>
                        <div className="w-9 h-9 bg-white border border-gray-100 rounded-xl flex items-center justify-center shadow-sm">
                            <Users className="w-4 h-4 text-gray-400" />
                        </div>
                    </div>
                    <div className="flex items-center justify-between px-7 sm:px-10 py-4">
                        <div>
                            <p className="text-[9px] font-black uppercase tracking-widest text-emerald-500 mb-0.5">Active Customers</p>
                            <p className="text-2xl font-black text-emerald-600 tracking-tight">{loading ? '—' : users.filter(u => u.is_active !== false).length}</p>
                        </div>
                        <div className="w-9 h-9 bg-emerald-50 border border-emerald-100 rounded-xl flex items-center justify-center shadow-sm">
                            <User className="w-4 h-4 text-emerald-400" />
                        </div>
                    </div>
                    <div className="flex items-center justify-between px-7 sm:px-10 py-4">
                        <div>
                            <p className="text-[9px] font-black uppercase tracking-widest text-[#FF9900] mb-0.5">New This Month</p>
                            <p className="text-2xl font-black text-[#FF9900] tracking-tight">{loading ? '—' : users.filter(u => {
                                if (!u.date_joined) return false;
                                const j = new Date(u.date_joined); const n = new Date();
                                return j.getMonth() === n.getMonth() && j.getFullYear() === n.getFullYear();
                            }).length}</p>
                        </div>
                        <div className="w-9 h-9 bg-[#FF9900]/10 border border-[#FF9900]/20 rounded-xl flex items-center justify-center shadow-sm">
                            <Calendar className="w-4 h-4 text-[#FF9900]" />
                        </div>
                    </div>
                </div>
            </div>

            {/* ── Main Table Card ── */}
            <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-3/4 h-3/4 bg-[#FF9900]/5 blur-[100px] pointer-events-none -z-10" />

                {/* Search + Role Pills */}
                <div className="px-5 sm:px-8 py-5 border-b border-gray-100/50 bg-gradient-to-b from-white to-transparent flex flex-col sm:flex-row items-center gap-4 relative z-10">
                    <div className="flex items-center gap-3 bg-white border border-gray-100 shadow-sm px-4 py-2.5 flex-1 focus-within:ring-2 focus-within:ring-[#FF9900]/20 focus-within:border-[#FF9900] transition-all">
                        <Search className="h-4 w-4 text-gray-400" strokeWidth={2.5} />
                        <input value={search} onChange={e => setSearch(e.target.value)}
                            placeholder="Search by name, email or username..."
                            className="text-sm text-gray-900 outline-none w-full bg-transparent font-bold placeholder:font-medium placeholder:text-gray-400" />
                    </div>
                    {/* Role filter pills (Hidden for customer specific page but logic kept) */}
                    <div className="hidden">
                        {sidebarItems.map(item => (
                            <button key={item.role} onClick={() => setActiveRole(item.role)}
                                className={`flex items-center gap-1.5 px-3 py-2 text-[10px] font-black uppercase tracking-widest rounded-xl border transition-all duration-200 ${activeRole === item.role
                                    ? 'bg-[#FF9900] text-[#131921] border-transparent shadow-sm -translate-y-0.5'
                                    : 'bg-white border-gray-200 text-gray-600 hover:bg-gray-50'
                                    }`}>
                                <item.icon className="h-3 w-3" strokeWidth={2.5} />
                                {item.label}
                                <span className={`text-[9px] font-black px-1.5 py-0.5 ${activeRole === item.role ? 'bg-white/20 text-[#131921]' : 'bg-gray-100 text-gray-500'}`}>
                                    {counts[item.role]}
                                </span>
                            </button>
                        ))}
                    </div>
                    <span className="text-[10px] font-black uppercase tracking-widest text-[#FF9900] whitespace-nowrap bg-[#FF9900]/10 px-3 py-2 border border-[#FF9900]/20">
                        {filtered.length} Result{filtered.length !== 1 ? 's' : ''}
                    </span>
                </div>

                {loading ? (
                    <div className="py-20 flex flex-col items-center justify-center">
                        <div className="w-10 h-10 border-4 border-[#FF9900] border-t-transparent rounded-full animate-spin mb-3" />
                        <p className="text-gray-500 font-medium">Loading customers...</p>
                    </div>
                ) : filtered.length === 0 ? (
                    <div className="py-20 text-center px-6">
                        <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                            <Users className="h-8 w-8 text-gray-400" />
                        </div>
                        <h3 className="text-gray-900 font-bold text-lg mb-1">No customers found</h3>
                        <p className="text-gray-500 text-sm mb-6">Try adjusting your filters or search terms</p>
                        {activeRole !== 'all' || search ? (
                            <button onClick={() => { setActiveRole('all'); setSearch(''); }}
                                className="inline-flex items-center gap-2 px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 font-semibold rounded-lg transition">
                                Clear Filters
                            </button>
                        ) : (
                            <Link href="/admin/customers/add">
                                <button className="inline-flex items-center gap-2 px-4 py-2 bg-[#FF9900] text-[#131921] font-semibold rounded-lg hover:bg-[#e68a00] transition">
                                    <Plus className="h-4 w-4" /> Add First Customer
                                </button>
                            </Link>
                        )}
                    </div>
                ) : (
                    <div className="overflow-x-auto relative z-10 pb-2">
                        <table className="w-full text-sm">
                            <thead>
                                <tr className="bg-gray-50/80 border-b border-gray-100 text-[10px] font-black text-gray-400 uppercase tracking-widest">
                                    <th className="text-left px-8 py-5">Customer</th>
                                    <th className="text-left px-5 py-5">Email / Contact</th>
                                    <th className="text-left px-5 py-5">Joined</th>
                                    <th className="text-center px-5 py-5">Status</th>
                                    <th className="text-center px-5 py-5">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-50">
                                {filtered.map((u) => {
                                    const name = `${u.first_name} ${u.last_name}`.trim() || u.username;
                                    return (
                                        <tr key={u.id} className="hover:bg-white/60 transition-all duration-300 group border-b border-gray-50/50 last:border-0">
                                            <td className="px-8 py-5">
                                                <div className="flex items-center gap-4">
                                                    <div className="h-11 w-11 bg-[#FF9900] text-[#131921] flex items-center justify-center font-black text-sm flex-shrink-0 shadow-sm group-hover:scale-110 transition-transform duration-500">
                                                        {name?.[0]?.toUpperCase() || '?'}
                                                    </div>
                                                    <div>
                                                        <p className="font-black text-gray-900 group-hover:text-[#FF9900] transition-colors">{name}</p>
                                                        {u.address && <p className="text-[10px] uppercase tracking-wider font-bold text-gray-400 mt-1">📍 {u.address}{u.city ? `, ${u.city}` : ''}</p>}
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="px-5 py-5">
                                                <div className="space-y-1.5">
                                                    <p className="text-gray-900 font-bold text-sm truncate flex items-center gap-2">
                                                        <Mail className="h-4 w-4 text-gray-400 flex-shrink-0" />
                                                        {u.email || u.username}
                                                    </p>
                                                    {(u.phone || u.phone_number) && (
                                                        <p className="text-gray-400 font-bold text-xs uppercase tracking-wide">{u.phone || u.phone_number}</p>
                                                    )}
                                                </div>
                                            </td>
                                            <td className="px-5 py-5 text-[11px] font-black uppercase tracking-widest text-gray-400">
                                                {u.date_joined ? formatDate(u.date_joined) : '—'}
                                            </td>
                                            <td className="px-5 py-5 text-center">
                                                <ActiveBadge isActive={u.is_active} />
                                            </td>
                                            <td className="px-5 py-5">
                                                <div className="flex items-center justify-center gap-2 opaque-0 group-hover:opacity-100 transition-opacity">
                                                    <button title="Edit Customer"
                                                        onClick={() => router.push(`/admin/customers/edit/${u.id}`)}
                                                        className="p-2 bg-white border border-transparent hover:border-blue-200 hover:bg-blue-50 text-blue-600 rounded-xl hover:scale-110 hover:shadow-sm transition-all">
                                                        <Edit3 className="h-4 w-4" strokeWidth={2.5} />
                                                    </button>
                                                    <button title="Change Password" onClick={() => setPasswordUser(u)}
                                                        className="p-2 bg-white border border-transparent hover:border-orange-200 hover:bg-orange-50 text-orange-600 rounded-xl hover:scale-110 hover:shadow-sm transition-all">
                                                        <KeyRound className="h-4 w-4" strokeWidth={2.5} />
                                                    </button>
                                                    <button title="View Logs" onClick={() => setLogsUser(u)}
                                                        className="p-2 bg-white border border-transparent hover:border-gray-200 hover:bg-gray-50 text-gray-700 rounded-xl hover:scale-110 hover:shadow-sm transition-all">
                                                        <History className="h-4 w-4" strokeWidth={2.5} />
                                                    </button>
                                                    <button title="Delete Customer" onClick={() => setDeleteUser(u)}
                                                        className="p-2 bg-white border border-transparent hover:border-red-200 hover:bg-red-50 text-red-600 rounded-xl hover:scale-110 hover:shadow-sm transition-all">
                                                        <Trash2 className="h-4 w-4" strokeWidth={2.5} />
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>

            {/* Modals */}
            {deleteUser && <DeleteConfirm user={deleteUser} onConfirm={handleDelete} onClose={() => setDeleteUser(null)} />}
            {passwordUser && <ChangePasswordModal user={passwordUser} onClose={() => setPasswordUser(null)} onShowToast={showToast} />}
            {logsUser && <ActivityLogsModal user={logsUser} onClose={() => setLogsUser(null)} />}
        </div>
    );
}
