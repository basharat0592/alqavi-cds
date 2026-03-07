'use client';

import { useState, useEffect } from 'react';
import {
    Shield, Plus, Edit2, Trash2, Users, Lock,
    Search, X, AlertTriangle, Check, CheckCircle,
    ChevronRight, Star, Settings, ShoppingBag,
    Package, FileText, BarChart2, Truck, DollarSign,
    Eye, Zap
} from 'lucide-react';

interface Role {
    id: string;
    name: string;
    description: string;
    userCount: number;
    permissions: string[];
    isDefault?: boolean;
    color?: string;
}

const AVAILABLE_ROLES: Role[] = [
    { id: '1', name: 'Super Admin', description: 'Full system access with all permissions', userCount: 1, permissions: ['all'], isDefault: true, color: 'violet' },
    { id: '2', name: 'Company Admin', description: 'Manage company operations and staff', userCount: 0, permissions: ['users_manage', 'roles_view', 'reports_view', 'settings_manage'], color: 'blue' },
    { id: '3', name: 'Sales Manager', description: 'Manage sales orders and customers', userCount: 0, permissions: ['orders_manage', 'customers_view', 'reports_view'], color: 'teal' },
    { id: '4', name: 'Purchase Manager', description: 'Manage purchase orders from suppliers', userCount: 0, permissions: ['purchases_manage', 'suppliers_view', 'reports_view'], color: 'orange' },
    { id: '5', name: 'Warehouse Manager', description: 'Manage inventory and stock levels', userCount: 0, permissions: ['inventory_manage', 'products_view', 'reports_view'], color: 'emerald' },
    { id: '6', name: 'Accountant', description: 'Manage financial reports and transactions', userCount: 0, permissions: ['accounting_manage', 'reports_view', 'transactions_view'], color: 'pink' },
    { id: '7', name: 'B2B Client', description: 'Wholesale customer with bulk order access', userCount: 0, permissions: ['orders_create', 'products_view', 'invoices_view'], color: 'indigo' },
    { id: '8', name: 'B2C Customer', description: 'Regular retail customer', userCount: 0, permissions: ['orders_create', 'products_view'], color: 'cyan' },
    { id: '9', name: 'Delivery Staff', description: 'Manage product delivery and tracking', userCount: 0, permissions: ['orders_view', 'deliveries_manage'], color: 'amber' },
];

// Permission metadata
const PERM_META: Record<string, { label: string; icon: any; group: string; color: string }> = {
    all: { label: 'Full System Access', icon: Zap, group: 'System', color: 'text-violet-600 bg-violet-50 border-violet-100' },
    users_manage: { label: 'Manage Users', icon: Users, group: 'Users', color: 'text-blue-600   bg-blue-50   border-blue-100' },
    roles_view: { label: 'View Roles', icon: Shield, group: 'Users', color: 'text-blue-600   bg-blue-50   border-blue-100' },
    settings_manage: { label: 'System Settings', icon: Settings, group: 'System', color: 'text-gray-600   bg-gray-50   border-gray-100' },
    reports_view: { label: 'View Reports', icon: BarChart2, group: 'Analytics', color: 'text-[#FF9900]600 bg-[#FF9900]/10 border-[#FF9900]/20' },
    orders_manage: { label: 'Manage Orders', icon: ShoppingBag, group: 'Sales', color: 'text-[#FF9900]   bg-[#FF9900]/10   border-[#FF9900]/20' },
    orders_create: { label: 'Create Orders', icon: ShoppingBag, group: 'Sales', color: 'text-[#FF9900]   bg-[#FF9900]/10   border-[#FF9900]/20' },
    orders_view: { label: 'View Orders', icon: Eye, group: 'Sales', color: 'text-[#FF9900]   bg-[#FF9900]/10   border-[#FF9900]/20' },
    customers_view: { label: 'View Customers', icon: Users, group: 'Sales', color: 'text-[#FF9900]   bg-[#FF9900]/10   border-[#FF9900]/20' },
    purchases_manage: { label: 'Manage Purchases', icon: Package, group: 'Purchasing', color: 'text-orange-600 bg-orange-50 border-orange-100' },
    suppliers_view: { label: 'View Suppliers', icon: Truck, group: 'Purchasing', color: 'text-orange-600 bg-orange-50 border-orange-100' },
    inventory_manage: { label: 'Manage Inventory', icon: Package, group: 'Inventory', color: 'text-emerald-600 bg-emerald-50 border-emerald-100' },
    products_view: { label: 'View Products', icon: Package, group: 'Inventory', color: 'text-emerald-600 bg-emerald-50 border-emerald-100' },
    accounting_manage: { label: 'Manage Accounts', icon: DollarSign, group: 'Finance', color: 'text-pink-600   bg-pink-50   border-pink-100' },
    transactions_view: { label: 'View Transactions', icon: DollarSign, group: 'Finance', color: 'text-pink-600   bg-pink-50   border-pink-100' },
    invoices_view: { label: 'View Invoices', icon: FileText, group: 'Finance', color: 'text-pink-600   bg-pink-50   border-pink-100' },
    deliveries_manage: { label: 'Manage Deliveries', icon: Truck, group: 'Logistics', color: 'text-amber-600  bg-amber-50  border-amber-100' },
};

const COLOR_MAP: Record<string, { grad: string; glow: string; bg: string; text: string; border: string }> = {
    violet: { grad: 'from-violet-500 to-purple-600', glow: 'rgba(139,92,246,0.2)', bg: 'bg-violet-50', text: 'text-violet-700', border: 'border-violet-100' },
    blue: { grad: 'from-blue-500 to-indigo-600', glow: 'rgba(59,130,246,0.2)', bg: 'bg-blue-50', text: 'text-blue-700', border: 'border-blue-100' },
    teal: { grad: 'from-[#FF9900] to-[#e68a00]', glow: 'rgba(0,113,133,0.2)', bg: 'bg-[#FF9900]/10', text: 'text-[#FF9900]', border: 'border-[#FF9900]/20' },
    orange: { grad: 'from-orange-500 to-amber-500', glow: 'rgba(249,115,22,0.2)', bg: 'bg-orange-50', text: 'text-orange-700', border: 'border-orange-100' },
    emerald: { grad: 'from-emerald-500 to-indigo-', glow: 'rgba(16,185,129,0.2)', bg: 'bg-emerald-50', text: 'text-emerald-700', border: 'border-emerald-100' },
    pink: { grad: 'from-pink-500 to-rose-600', glow: 'rgba(236,72,153,0.2)', bg: 'bg-pink-50', text: 'text-pink-700', border: 'border-pink-100' },
    indigo: { grad: 'from-indigo-500 to-purple-500', glow: 'rgba(99,102,241,0.2)', bg: 'bg-[#FF9900]/10', text: 'text-[#FF9900]700', border: 'border-[#FF9900]/20' },
    cyan: { grad: 'from-cyan-500 to-sky-600', glow: 'rgba(6,182,212,0.2)', bg: 'bg-cyan-50', text: 'text-cyan-700', border: 'border-cyan-100' },
    amber: { grad: 'from-amber-500 to-orange-400', glow: 'rgba(245,158,11,0.2)', bg: 'bg-amber-50', text: 'text-amber-700', border: 'border-amber-100' },
};

export default function RolesPage() {
    const [roles, setRoles] = useState<Role[]>(AVAILABLE_ROLES);
    const [search, setSearch] = useState('');
    const [selectedRole, setSelectedRole] = useState<Role | null>(AVAILABLE_ROLES[0]);
    const [showModal, setShowModal] = useState(false);
    const [editingRole, setEditingRole] = useState<Role | null>(null);
    const [form, setForm] = useState({ name: '', description: '' });
    const [nameError, setNameError] = useState('');
    const [roleToDelete, setRoleToDelete] = useState<Role | null>(null);
    const [toast, setToast] = useState<string | null>(null);

    useEffect(() => {
        const saved = localStorage.getItem('qavi_roles');
        if (saved) {
            const parsed = JSON.parse(saved);
            setRoles(parsed);
            setSelectedRole(parsed[0]);
        } else {
            localStorage.setItem('qavi_roles', JSON.stringify(AVAILABLE_ROLES));
        }
    }, []);

    const showToast = (msg: string) => {
        setToast(msg);
        setTimeout(() => setToast(null), 3000);
    };

    const filtered = roles.filter(r =>
        r.name.toLowerCase().includes(search.toLowerCase()) ||
        r.description.toLowerCase().includes(search.toLowerCase())
    );

    const openAdd = () => { setEditingRole(null); setForm({ name: '', description: '' }); setNameError(''); setShowModal(true); };
    const openEdit = (role: Role) => { setEditingRole(role); setForm({ name: role.name, description: role.description }); setNameError(''); setShowModal(true); };

    const saveRole = () => {
        if (!form.name.trim()) { setNameError('Role name is required'); return; }
        let updated: Role[];
        if (editingRole) {
            updated = roles.map(r => r.id === editingRole.id ? { ...r, name: form.name, description: form.description } : r);
            showToast('Role updated!');
        } else {
            const colors = Object.keys(COLOR_MAP);
            const newRole: Role = { id: Date.now().toString(), name: form.name, description: form.description, userCount: 0, permissions: [], color: colors[roles.length % colors.length] };
            updated = [...roles, newRole];
            showToast('Role created!');
        }
        setRoles(updated);
        localStorage.setItem('qavi_roles', JSON.stringify(updated));
        setShowModal(false);
    };

    const confirmDelete = () => {
        if (!roleToDelete) return;
        const updated = roles.filter(r => r.id !== roleToDelete.id);
        setRoles(updated);
        localStorage.setItem('qavi_roles', JSON.stringify(updated));
        if (selectedRole?.id === roleToDelete.id) setSelectedRole(updated[0] || null);
        showToast(`"${roleToDelete.name}" deleted.`);
        setRoleToDelete(null);
    };

    const totalUsers = roles.reduce((s, r) => s + r.userCount, 0);
    const c = (role: Role | null) => COLOR_MAP[role?.color || 'teal'] || COLOR_MAP.teal;

    // Group permissions
    const groupedPerms = selectedRole ? Object.entries(
        selectedRole.permissions.reduce((acc: Record<string, string[]>, p) => {
            const group = PERM_META[p]?.group || 'Other';
            if (!acc[group]) acc[group] = [];
            acc[group].push(p);
            return acc;
        }, {})
    ) : [];

    return (
        <div className="max-w-[1600px] mx-auto space-y-6 pb-12 font-sans px-3 sm:px-6 mt-6 relative z-0">

            {/* Ambient Glow */}
            <div className="fixed top-0 left-0 w-full h-full overflow-hidden pointer-events-none -z-10">
                <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] rounded-full bg-violet-100/20 blur-[120px]" />
                <div className="absolute top-[30%] right-[-10%] w-[30%] h-[40%] rounded-full bg-[#FF9900]/10/40 blur-[100px]" />
            </div>

            {/* Toast */}
            {toast && (
                <div className="fixed bottom-6 right-6 z-[100] animate-in fade-in slide-in-from-bottom-5 duration-300">
                    <div className="bg-white border border-gray-100 px-5 py-4 rounded-2xl shadow-2xl flex items-center gap-3 min-w-[240px]">
                        <div className="w-8 h-8 rounded-xl bg-emerald-500 flex items-center justify-center flex-shrink-0">
                            <CheckCircle className="h-4 w-4 text-white" />
                        </div>
                        <p className="text-gray-900 text-sm font-bold">{toast}</p>
                    </div>
                </div>
            )}

            {/* ── Header + Stats Card ── */}
            <div className="bg-white rounded-2xl border border-gray-200 shadow-md overflow-hidden relative">
                <div className="absolute top-0 right-0 w-64 h-64 bg-violet-100/20 rounded-full blur-[80px] -z-10 pointer-events-none" />
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 px-7 sm:px-10 pt-7 pb-5 border-b border-gray-100/60">
                    <div className="flex items-center gap-4">
                        <div className="w-11 h-11 bg-gradient-to-br from-violet-500 to-purple-600 rounded-2xl flex items-center justify-center shadow-[0_8px_20px_rgba(139,92,246,0.25)] flex-shrink-0">
                            <Shield className="h-5 w-5 text-white" strokeWidth={2.5} />
                        </div>
                        <div>
                            <h1 className="text-xl font-black text-gray-900 tracking-tight">Roles & Access</h1>
                            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mt-0.5">Manage system roles and permissions</p>
                        </div>
                    </div>
                    <button onClick={openAdd}
                        className="flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-violet-500 to-purple-600 text-white font-black text-xs uppercase tracking-widest rounded-xl hover:shadow-[0_8px_20px_rgba(139,92,246,0.3)] hover:-translate-y-0.5 transition-all duration-300 self-start sm:self-auto">
                        <Plus className="h-4 w-4" strokeWidth={2.5} /> Add Role
                    </button>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-3 divide-y sm:divide-y-0 sm:divide-x divide-gray-100/60">
                    <div className="flex items-center justify-between px-7 sm:px-10 py-4">
                        <div>
                            <p className="text-[9px] font-black uppercase tracking-widest text-gray-400 mb-0.5">Total Roles</p>
                            <p className="text-2xl font-black text-gray-900">{roles.length}</p>
                        </div>
                        <div className="w-9 h-9 bg-white border border-gray-100 rounded-xl flex items-center justify-center shadow-sm">
                            <Shield className="w-4 h-4 text-gray-400" />
                        </div>
                    </div>
                    <div className="flex items-center justify-between px-7 sm:px-10 py-4">
                        <div>
                            <p className="text-[9px] font-black uppercase tracking-widest text-violet-500 mb-0.5">System Roles</p>
                            <p className="text-2xl font-black text-violet-600">{AVAILABLE_ROLES.length}</p>
                        </div>
                        <div className="w-9 h-9 bg-violet-50 border border-violet-100 rounded-xl flex items-center justify-center shadow-sm">
                            <Lock className="w-4 h-4 text-violet-400" />
                        </div>
                    </div>
                    <div className="flex items-center justify-between px-7 sm:px-10 py-4">
                        <div>
                            <p className="text-[9px] font-black uppercase tracking-widest text-[#FF9900] mb-0.5">Total Users</p>
                            <p className="text-2xl font-black text-[#FF9900]">{totalUsers}</p>
                        </div>
                        <div className="w-9 h-9 bg-[#FF9900]/10 border border-[#FF9900]/20 rounded-xl flex items-center justify-center shadow-sm">
                            <Users className="w-4 h-4 text-[#FF9900]" />
                        </div>
                    </div>
                </div>
            </div>

            {/* ── Split Layout ── */}
            <div className="flex flex-col lg:flex-row gap-6">

                {/* Left — Roles List */}
                <div className="w-full lg:w-80 flex-shrink-0 bg-white rounded-2xl border border-gray-200 shadow-md overflow-hidden flex flex-col">

                    {/* Search */}
                    <div className="px-5 py-4 border-b border-gray-100/60">
                        <div className="flex items-center gap-2.5 bg-gray-50 border border-gray-200 rounded-xl px-3.5 py-2.5 focus-within:ring-2 focus-within:ring-violet-200 focus-within:border-violet-400 transition-all">
                            <Search className="h-3.5 w-3.5 text-gray-400 flex-shrink-0" strokeWidth={2.5} />
                            <input value={search} onChange={e => setSearch(e.target.value)}
                                placeholder="Search roles..."
                                className="text-xs text-gray-900 outline-none w-full bg-transparent font-bold placeholder:font-medium placeholder:text-gray-400" />
                            {search && <button onClick={() => setSearch('')}><X className="h-3 w-3 text-gray-300 hover:text-gray-500" /></button>}
                        </div>
                    </div>

                    {/* Role List */}
                    <div className="flex-1 overflow-y-auto divide-y divide-gray-50">
                        {filtered.map(role => {
                            const col = COLOR_MAP[role.color || 'teal'] || COLOR_MAP.teal;
                            const isSelected = selectedRole?.id === role.id;
                            const initials = role.name.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase();
                            return (
                                <button key={role.id} onClick={() => setSelectedRole(role)}
                                    className={`w-full flex items-center gap-3 px-5 py-3.5 text-left transition-all duration-200 group relative
                                        ${isSelected ? 'bg-white shadow-[inset_4px_0_0_0] shadow-violet-500' : 'hover:bg-gray-50/80'}`}>

                                    {/* Avatar */}
                                    <div className={`w-10 h-10 bg-gradient-to-br ${col.grad} rounded-2xl flex items-center justify-center text-white font-black text-xs flex-shrink-0 shadow-sm transition-transform ${isSelected ? 'scale-105' : 'group-hover:scale-105'}`}>
                                        {initials}
                                    </div>

                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-center gap-1.5">
                                            <p className={`text-sm font-black truncate ${isSelected ? 'text-gray-900' : 'text-gray-700'}`}>{role.name}</p>
                                            {role.isDefault && <Star className="h-3 w-3 text-violet-400 flex-shrink-0" fill="currentColor" />}
                                        </div>
                                        <p className="text-[10px] font-medium text-gray-400 truncate mt-0.5">{role.description}</p>
                                    </div>

                                    <div className="flex items-center gap-2 flex-shrink-0">
                                        <span className={`text-[9px] font-black px-2 py-0.5 rounded-lg ${isSelected ? `${col.bg} ${col.text} ${col.border} border` : 'bg-gray-100 text-gray-500'}`}>
                                            {role.permissions.length === 1 && role.permissions[0] === 'all' ? '∞' : role.permissions.length}
                                        </span>
                                        <ChevronRight className={`h-3.5 w-3.5 transition-colors ${isSelected ? 'text-violet-400' : 'text-gray-300'}`} />
                                    </div>
                                </button>
                            );
                        })}
                    </div>

                    {/* Footer count */}
                    <div className="px-5 py-3 border-t border-gray-100/60 bg-gray-50/50">
                        <p className="text-[9px] font-black uppercase tracking-widest text-gray-400 text-center">
                            {filtered.length} of {roles.length} roles
                        </p>
                    </div>
                </div>

                {/* Right — Role Detail Panel */}
                <div className="flex-1 min-w-0">
                    {selectedRole ? (
                        <div className="space-y-5">
                            {/* Role Hero Card */}
                            <div className={`bg-white rounded-2xl border border-gray-200 shadow-md p-7 relative overflow-hidden`}>
                                <div className={`absolute -top-10 -right-10 w-48 h-48 bg-gradient-to-br ${c(selectedRole).grad} opacity-5 rounded-full blur-[40px] pointer-events-none`} />

                                <div className="flex items-start justify-between gap-4">
                                    <div className="flex items-center gap-5">
                                        <div className={`w-16 h-16 bg-gradient-to-br ${c(selectedRole).grad} rounded-2xl flex items-center justify-center text-white font-black text-xl shadow-[0_8px_24px_${c(selectedRole).glow}] flex-shrink-0`}>
                                            {selectedRole.name.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase()}
                                        </div>
                                        <div>
                                            <div className="flex items-center gap-2 flex-wrap">
                                                <h2 className="text-2xl font-black text-gray-900 tracking-tight">{selectedRole.name}</h2>
                                                {selectedRole.isDefault && (
                                                    <span className="text-[9px] font-black px-2.5 py-1 bg-violet-100 text-violet-700 rounded-lg uppercase tracking-widest border border-violet-200 flex items-center gap-1">
                                                        <Star className="h-2.5 w-2.5" fill="currentColor" /> Root
                                                    </span>
                                                )}
                                            </div>
                                            <p className="text-sm font-medium text-gray-500 mt-1">{selectedRole.description}</p>
                                        </div>
                                    </div>

                                    {/* Actions */}
                                    {!selectedRole.isDefault && (
                                        <div className="flex gap-2 flex-shrink-0">
                                            <button onClick={() => openEdit(selectedRole)}
                                                className="flex items-center gap-1.5 px-4 py-2 bg-white border border-gray-200 text-blue-600 font-black text-xs uppercase tracking-widest rounded-xl hover:bg-blue-50 hover:border-blue-200 hover:-translate-y-0.5 hover:shadow-sm transition-all">
                                                <Edit2 className="h-3.5 w-3.5" strokeWidth={2.5} /> Edit
                                            </button>
                                            <button onClick={() => setRoleToDelete(selectedRole)}
                                                className="flex items-center gap-1.5 px-4 py-2 bg-white border border-gray-200 text-red-600 font-black text-xs uppercase tracking-widest rounded-xl hover:bg-red-50 hover:border-red-200 hover:-translate-y-0.5 hover:shadow-sm transition-all">
                                                <Trash2 className="h-3.5 w-3.5" strokeWidth={2.5} /> Delete
                                            </button>
                                        </div>
                                    )}
                                </div>

                                {/* Quick stats */}
                                <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 mt-6 pt-6 border-t border-gray-100/60">
                                    <div className={`${c(selectedRole).bg} ${c(selectedRole).border} border rounded-2xl p-4 text-center`}>
                                        <p className={`text-2xl font-black ${c(selectedRole).text}`}>{selectedRole.userCount}</p>
                                        <p className="text-[9px] font-black uppercase tracking-widest text-gray-500 mt-0.5">Users</p>
                                    </div>
                                    <div className="bg-gray-50 border border-gray-100 rounded-2xl p-4 text-center">
                                        <p className="text-2xl font-black text-gray-900">
                                            {selectedRole.permissions.length === 1 && selectedRole.permissions[0] === 'all' ? '∞' : selectedRole.permissions.length}
                                        </p>
                                        <p className="text-[9px] font-black uppercase tracking-widest text-gray-500 mt-0.5">Permissions</p>
                                    </div>
                                    <div className="bg-gray-50 border border-gray-100 rounded-2xl p-4 text-center">
                                        <p className="text-2xl font-black text-gray-900">{groupedPerms.length || (selectedRole.permissions[0] === 'all' ? '∞' : 0)}</p>
                                        <p className="text-[9px] font-black uppercase tracking-widest text-gray-500 mt-0.5">Groups</p>
                                    </div>
                                </div>
                            </div>

                            {/* Permissions Panel */}
                            <div className="bg-white rounded-2xl border border-gray-200 shadow-md overflow-hidden">
                                <div className="px-7 py-5 border-b border-gray-100/60 flex items-center gap-3">
                                    <div className="w-8 h-8 bg-gray-100 rounded-xl flex items-center justify-center">
                                        <Lock className="h-4 w-4 text-gray-500" strokeWidth={2.5} />
                                    </div>
                                    <h3 className="text-sm font-black text-gray-900 uppercase tracking-widest">Permissions</h3>
                                    <span className={`ml-auto text-[9px] font-black px-2.5 py-1 rounded-lg border ${c(selectedRole).bg} ${c(selectedRole).text} ${c(selectedRole).border}`}>
                                        {selectedRole.permissions[0] === 'all' ? 'ALL ACCESS' : `${selectedRole.permissions.length} granted`}
                                    </span>
                                </div>

                                {selectedRole.permissions[0] === 'all' ? (
                                    <div className="p-10 text-center">
                                        <div className="w-16 h-16 bg-gradient-to-br from-violet-500 to-purple-600 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-[0_8px_24px_rgba(139,92,246,0.25)]">
                                            <Zap className="h-8 w-8 text-white" strokeWidth={2.5} />
                                        </div>
                                        <p className="font-black text-gray-900 text-lg">Unrestricted Access</p>
                                        <p className="text-sm font-medium text-gray-400 mt-1">This role has full permission to all system modules</p>
                                    </div>
                                ) : groupedPerms.length === 0 ? (
                                    <div className="p-10 text-center">
                                        <div className="w-12 h-12 bg-gray-100 rounded-2xl flex items-center justify-center mx-auto mb-3">
                                            <Lock className="h-6 w-6 text-gray-300" />
                                        </div>
                                        <p className="font-black text-gray-500">No permissions assigned</p>
                                    </div>
                                ) : (
                                    <div className="p-6 space-y-5">
                                        {groupedPerms.map(([group, perms]) => (
                                            <div key={group}>
                                                <p className="text-[9px] font-black uppercase tracking-widest text-gray-400 mb-3 flex items-center gap-2">
                                                    <span className="flex-1 h-px bg-gray-100" />
                                                    {group}
                                                    <span className="flex-1 h-px bg-gray-100" />
                                                </p>
                                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                                                    {perms.map(perm => {
                                                        const meta = PERM_META[perm];
                                                        if (!meta) return null;
                                                        const Icon = meta.icon;
                                                        return (
                                                            <div key={perm} className="flex items-center gap-3 bg-white border border-gray-100 rounded-2xl px-4 py-3 hover:shadow-sm transition-all group">
                                                                <div className={`w-8 h-8 rounded-xl border flex items-center justify-center flex-shrink-0 ${meta.color}`}>
                                                                    <Icon className="h-3.5 w-3.5" strokeWidth={2.5} />
                                                                </div>
                                                                <span className="text-xs font-black text-gray-800 flex-1">{meta.label}</span>
                                                                <div className="w-5 h-5 bg-emerald-500 rounded-full flex items-center justify-center flex-shrink-0 opacity-60 group-hover:opacity-100 transition-opacity">
                                                                    <Check className="h-3 w-3 text-white" strokeWidth={3} />
                                                                </div>
                                                            </div>
                                                        );
                                                    })}
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        </div>
                    ) : (
                        <div className="bg-white rounded-2xl border border-gray-200 shadow-md h-full min-h-[400px] flex flex-col items-center justify-center">
                            <div className="w-16 h-16 bg-gray-50 rounded-full flex items-center justify-center mb-4 border border-gray-100">
                                <Shield className="h-8 w-8 text-gray-300" />
                            </div>
                            <p className="font-black text-gray-500">Select a role to view details</p>
                        </div>
                    )}
                </div>
            </div>

            {/* ── Add / Edit Modal ── */}
            {showModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
                    <div className="bg-white rounded-3xl shadow-2xl w-full max-w-md border border-gray-100 overflow-hidden">
                        <div className="flex items-center justify-between px-8 py-6 border-b border-gray-100">
                            <div className="flex items-center gap-3">
                                <div className="w-9 h-9 bg-gradient-to-br from-violet-500 to-purple-600 rounded-xl flex items-center justify-center">
                                    <Shield className="h-4 w-4 text-white" strokeWidth={2.5} />
                                </div>
                                <h2 className="text-lg font-black text-gray-900">{editingRole ? 'Edit Role' : 'New Role'}</h2>
                            </div>
                            <button onClick={() => setShowModal(false)} className="p-2 hover:bg-gray-100 rounded-xl transition-colors">
                                <X className="h-5 w-5 text-gray-400" />
                            </button>
                        </div>
                        <div className="p-8 space-y-5">
                            <div>
                                <label className="block text-[10px] font-black uppercase tracking-widest text-gray-500 mb-2">
                                    Role Name <span className="text-red-500">*</span>
                                </label>
                                <input type="text" value={form.name}
                                    onChange={e => { setForm(f => ({ ...f, name: e.target.value })); setNameError(''); }}
                                    placeholder="e.g. Content Manager"
                                    className={`w-full px-4 py-3 bg-gray-50 border rounded-xl text-sm font-medium text-gray-900 outline-none transition-all focus:bg-white focus:ring-2 ${nameError ? 'border-red-300 focus:ring-red-200' : 'border-gray-200 focus:ring-violet-200 focus:border-violet-400'}`}
                                />
                                {nameError && <p className="text-red-500 text-[10px] font-bold mt-1.5">{nameError}</p>}
                            </div>
                            <div>
                                <label className="block text-[10px] font-black uppercase tracking-widest text-gray-500 mb-2">Description</label>
                                <textarea value={form.description}
                                    onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
                                    placeholder="What is the purpose of this role?"
                                    rows={3}
                                    className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-sm font-medium text-gray-900 outline-none resize-none transition-all focus:bg-white focus:ring-2 focus:ring-violet-200 focus:border-violet-400"
                                />
                            </div>
                        </div>
                        <div className="px-8 pb-8 flex gap-3">
                            <button onClick={() => setShowModal(false)}
                                className="flex-1 py-3 bg-white border border-gray-200 text-gray-700 font-black text-xs uppercase tracking-widest rounded-xl hover:bg-gray-50 transition-all">
                                Cancel
                            </button>
                            <button onClick={saveRole}
                                className="flex-1 py-3 bg-gradient-to-r from-violet-500 to-purple-600 text-white font-black text-xs uppercase tracking-widest rounded-xl hover:shadow-[0_8px_20px_rgba(139,92,246,0.3)] hover:-translate-y-0.5 transition-all flex items-center justify-center gap-2">
                                <Check className="h-4 w-4" strokeWidth={2.5} />
                                {editingRole ? 'Update' : 'Create'}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* ── Delete Confirm ── */}
            {roleToDelete && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
                    <div className="bg-white rounded-3xl shadow-2xl w-full max-w-sm border border-gray-100 overflow-hidden">
                        <div className="flex justify-center pt-8 pb-2">
                            <div className="relative">
                                <div className="absolute inset-0 bg-red-100 rounded-full animate-pulse scale-125" />
                                <div className="relative w-16 h-16 bg-red-50 rounded-2xl border border-red-100 flex items-center justify-center">
                                    <AlertTriangle className="h-7 w-7 text-red-500" strokeWidth={2.5} />
                                </div>
                            </div>
                        </div>
                        <div className="px-8 py-6 text-center">
                            <h2 className="text-xl font-black text-gray-900 mb-2">Delete Role?</h2>
                            <p className="text-sm font-medium text-gray-500">
                                Permanently delete <span className="font-black text-gray-900">"{roleToDelete.name}"</span>?
                            </p>
                            {roleToDelete.userCount > 0 && (
                                <div className="mt-4 p-3 bg-orange-50 border border-orange-100 rounded-2xl">
                                    <p className="text-[11px] text-orange-700 font-black flex items-center justify-center gap-2">
                                        <AlertTriangle className="h-3.5 w-3.5" />
                                        {roleToDelete.userCount} user{roleToDelete.userCount !== 1 ? 's' : ''} assigned
                                    </p>
                                </div>
                            )}
                            <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest mt-4">Cannot be undone</p>
                        </div>
                        <div className="px-8 pb-8 flex gap-3">
                            <button onClick={() => setRoleToDelete(null)}
                                className="flex-1 py-3 bg-white border border-gray-200 text-gray-700 font-black text-xs uppercase tracking-widest rounded-xl hover:bg-gray-50 transition-all">
                                Cancel
                            </button>
                            <button onClick={confirmDelete}
                                className="flex-1 py-3 bg-gradient-to-r from-red-500 to-rose-600 text-white font-black text-xs uppercase tracking-widest rounded-xl hover:shadow-[0_8px_20px_rgba(239,68,68,0.3)] hover:-translate-y-0.5 transition-all flex items-center justify-center gap-2">
                                <Trash2 className="h-4 w-4" strokeWidth={2.5} /> Delete
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
