'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import {
    Users, User, Shield, Search,
    Edit, Trash2, X, Plus, CheckCircle,
    Mail, Calendar, AlertTriangle, Loader2, RefreshCw,
    UserCheck, MapPin, Phone, Building2, ShieldCheck,
    Lock, MoreHorizontal, Truck
} from 'lucide-react';
import { userService, AppUser } from '@/lib/api';
import { formatDate } from '@/lib/utils';
import toast from 'react-hot-toast';
import PageLoader from '@/components/ui/PageLoader';

/* ══════════════════════════════════════════════
   COMPONENTS & STYLES
   ══════════════════════════════════════════════ */
const SectionCard = ({ children, className = "" }: { children: React.ReactNode; className?: string }) => (
    <div className={`bg-white dark:bg-[#1a252f] border border-slate-200 dark:border-white/10 rounded-xl shadow-sm overflow-hidden ${className}`}>
        {children}
    </div>
);

const SectionHeader = ({ title, icon: Icon, subtitle }: { title: string; icon: any; subtitle?: string }) => (
    <div className="bg-slate-50 dark:bg-white/5 px-4 py-3 border-b border-slate-200 dark:border-white/10 flex items-center justify-between">
        <div className="flex items-center gap-2">
            <Icon className="h-4 w-4 text-[#EEAF1C]" />
            <div>
                <span className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-tight">{title}</span>
                {subtitle && <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">{subtitle}</p>}
            </div>
        </div>
    </div>
);

const PRIMARY_BTN = "bg-[#EEAF1C] hover:bg-blue-700 text-white font-bold rounded-lg shadow-sm text-[11px] uppercase tracking-widest py-2 px-4 transition-all flex items-center justify-center gap-2 active:scale-95";
const SECONDARY_BTN = "bg-white dark:bg-white/5 hover:bg-slate-50 dark:hover:bg-white/10 border border-slate-200 dark:border-white/10 text-slate-600 dark:text-slate-300 rounded-lg shadow-sm text-[11px] font-bold uppercase tracking-widest py-2 px-4 transition-all flex items-center justify-center gap-2 active:scale-95";

export default function SuppliersPage() {
    const router = useRouter();
    const [suppliers, setSuppliers] = useState<AppUser[]>([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');
    const [deleteUser, setDeleteUser] = useState<AppUser | null>(null);
    const [deleting, setDeleting] = useState(false);

    const loadData = async () => {
        setLoading(true);
        try {
            const usersData = await userService.getAll();
            // Filter only suppliers
            const filteredSuppliers = (usersData || []).filter(u => 
                (u.role_name || '').toLowerCase().includes('supplier')
            );
            setSuppliers(filteredSuppliers);
        } catch (err) {
            console.error('Failed to load supplier registry', err);
            toast.error('Failed to load supplier registry');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => { loadData(); }, []);

    if (loading) return <PageLoader />;

    const confirmDelete = async () => {
        if (!deleteUser) return;
        setDeleting(true);
        try {
            await userService.delete(deleteUser.id);
            setSuppliers(prev => prev.filter(u => u.id !== deleteUser.id));
            toast.success(`Supplier access revoked.`);
        } catch {
            toast.error('Failed to remove supplier.');
        } finally {
            setDeleting(false);
            setDeleteUser(null);
        }
    };

    const toggleUserStatus = async (user: AppUser) => {
        try {
            if (user.is_active) {
                await userService.deactivate(user.id);
                toast.success('Supplier account disabled.');
            } else {
                await userService.activate(user.id);
                toast.success('Supplier account activated.');
            }
            setSuppliers(prev => prev.map(u => u.id === user.id ? { ...u, is_active: !u.is_active } : u));
        } catch (error) {
            toast.error('Failed to change supplier status.');
        }
    };

    const filtered = suppliers.filter(u => {
        const fullName = `${u.first_name || ''} ${u.last_name || ''}`.toLowerCase();
        const matchesSearch = fullName.includes(search.toLowerCase()) || 
                            (u.email || '').toLowerCase().includes(search.toLowerCase()) ||
                            (u.business_name || '').toLowerCase().includes(search.toLowerCase());
        return matchesSearch;
    });

    return (
        <div className="max-w-[1400px] mx-auto pb-20 px-4 mt-4 font-sans">
            
            {/* ── Page Header ── */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-8 pb-4 border-b border-slate-200 dark:border-white/10">
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-[#EEAF1C] rounded-xl flex items-center justify-center shadow-lg shadow-blue-500/10">
                        <UserCheck className="h-5 w-5 text-white" />
                    </div>
                    <div>
                        <h1 className="text-xl font-bold text-slate-900 dark:text-white uppercase tracking-tight">Suppliers</h1>
                    </div>
                </div>
                <div className="flex items-center gap-2">
                    <button onClick={loadData} className={SECONDARY_BTN} title="Refresh">
                        <RefreshCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} />
                    </button>
                    <button
                        onClick={() => router.push('/admin/company/suppliers/add')}
                        className={PRIMARY_BTN}
                    >
                        <Plus className="h-3.5 w-3.5" />
                        Add
                    </button>
                </div>
            </div>

            <div className="space-y-4">
                {/* Search */}
                <div className="bg-white dark:bg-[#1a252f] border border-slate-200 dark:border-white/10 rounded-xl p-3 flex flex-col md:flex-row gap-3 items-center">
                    <div className="relative flex-1 group w-full">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 group-focus-within:text-[#EEAF1C] transition-colors" />
                        <input
                            value={search}
                            onChange={e => setSearch(e.target.value)}
                            placeholder="Search suppliers..."
                            className="w-full pl-10 pr-4 py-2 bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-lg text-sm outline-none focus:border-[#EEAF1C] focus:ring-4 focus:ring-[#EEAF1C]/10 transition-all font-medium"
                        />
                    </div>
                </div>

                {/* Table */}
                <SectionCard className="border-none shadow-none">
                    <div className="overflow-x-auto border border-slate-200 dark:border-white/10 rounded-xl">
                        <table className="w-full text-left border-collapse">
                            <thead>
                                <tr className="bg-slate-50 dark:bg-white/5 border-b border-slate-200 dark:border-white/10">
                                    <th className="px-6 py-4 text-[10px] font-black text-slate-500 dark:text-slate-400 whitespace-nowrap uppercase tracking-widest border-r border-slate-200 dark:border-white/10 last:border-r-0">Identity</th>
                                    <th className="px-6 py-4 text-[10px] font-black text-slate-500 dark:text-slate-400 whitespace-nowrap uppercase tracking-widest border-r border-slate-200 dark:border-white/10 last:border-r-0">Organization</th>
                                    <th className="px-6 py-4 text-[10px] font-black text-slate-500 dark:text-slate-400 whitespace-nowrap uppercase tracking-widest border-r border-slate-200 dark:border-white/10 last:border-r-0">Contact Details</th>
                                    <th className="px-6 py-4 text-center text-[10px] font-black text-slate-500 dark:text-slate-400 whitespace-nowrap uppercase tracking-widest border-r border-slate-200 dark:border-white/10 last:border-r-0">Status</th>
                                    <th className="px-6 py-4 text-right text-[10px] font-black text-slate-500 dark:text-slate-400 whitespace-nowrap uppercase tracking-widest">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100 dark:divide-white/5 bg-white dark:bg-[#1a252f]">
                                {filtered.length === 0 ? (
                                    <tr>
                                        <td colSpan={5} className="px-6 py-24 text-center">
                                            <div className="flex flex-col items-center gap-2 opacity-40">
                                                <Building2 className="h-12 w-12 text-slate-400" />
                                                <p className="text-xs font-bold text-slate-500 uppercase tracking-widest">No records found</p>
                                            </div>
                                        </td>
                                    </tr>
                                ) : (
                                    filtered.map(user => (
                                        <tr key={user.id} className="hover:bg-slate-50/50 dark:hover:bg-white/[0.02] transition-colors group">
                                            <td className="px-6 py-4 border-r border-slate-100 dark:border-white/5 last:border-r-0">
                                                <div className="flex items-center gap-4">
                                                    <div className="h-10 w-10 bg-slate-100 dark:bg-white/10 text-slate-400 rounded-xl flex items-center justify-center font-black text-xs group-hover:bg-[#EEAF1C] group-hover:text-white transition-all shadow-sm">
                                                        {(user.first_name?.[0] || '') + (user.last_name?.[0] || '')}
                                                    </div>
                                                    <div>
                                                        <p className="text-sm font-bold text-slate-900 dark:text-white leading-tight">{user.first_name} {user.last_name}</p>
                                                        <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-0.5">{user.email}</p>
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="px-6 py-4 border-r border-slate-100 dark:border-white/5 last:border-r-0">
                                                <div className="flex flex-col gap-1">
                                                    <span className="text-sm font-bold text-slate-800 dark:text-slate-200">{user.business_name || 'Personal'}</span>
                                                    <div className="flex items-center gap-1.5">
                                                        <span className="text-[9px] px-1.5 py-0.5 bg-slate-100 dark:bg-white/10 text-slate-500 rounded font-black uppercase tracking-tighter">ID: #{user.id}</span>
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="px-6 py-4 border-r border-slate-100 dark:border-white/5 last:border-r-0">
                                                <div className="space-y-1.5 text-xs text-slate-600 dark:text-slate-400 font-medium">
                                                    <div className="flex items-center gap-2">
                                                        <Phone className="h-3.5 w-3.5 text-slate-300" />
                                                        <span>{user.phone_number || '--'}</span>
                                                    </div>
                                                    <div className="flex items-center gap-2">
                                                        <MapPin className="h-3.5 w-3.5 text-slate-300" />
                                                        <span className="truncate max-w-[200px]">{user.address || 'Location Pending'}</span>
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="px-6 py-4 text-center border-r border-slate-100 dark:border-white/5 last:border-r-0">
                                                <button 
                                                    onClick={() => toggleUserStatus(user)}
                                                    className={`px-3 py-1.5 rounded-lg text-[9px] font-black uppercase tracking-widest transition-all shadow-sm border
                                                        ${user.is_active 
                                                            ? 'bg-emerald-50 text-emerald-600 border-emerald-100 hover:bg-emerald-100' 
                                                            : 'bg-slate-50 text-slate-400 border-slate-200 hover:bg-slate-100'}`}
                                                >
                                                    {user.is_active ? 'Active' : 'Offline'}
                                                </button>
                                            </td>
                                            <td className="px-6 py-4 text-right">
                                                <div className="flex justify-end gap-2">
                                                    <button onClick={() => router.push(`/admin/users/edit/${user.id}`)} className="w-8 h-8 flex items-center justify-center text-slate-400 hover:text-[#EEAF1C] rounded-lg hover:bg-yellow-50 dark:hover:bg-yellow-900/10 transition-all">
                                                        <Edit className="h-4 w-4" />
                                                    </button>
                                                    <button onClick={() => setDeleteUser(user)} className="w-8 h-8 flex items-center justify-center text-slate-400 hover:text-red-600 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/10 transition-all">
                                                        <Trash2 className="h-4 w-4" />
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>
                </SectionCard>
            </div>

            {/* Delete Confirmation */}
            {deleteUser && (
                <div className="fixed inset-0 z-[200] flex items-center justify-center bg-slate-900/40 p-4 animate-in fade-in duration-300">
                    <div className="bg-white dark:bg-[#1a252f] rounded-xl border border-slate-200 dark:border-white/10 max-w-sm w-full shadow-2xl overflow-hidden animate-in zoom-in-95 duration-300">
                        <div className="px-6 py-4 border-b border-slate-100 dark:border-white/10 flex items-center justify-between bg-slate-50/50 dark:bg-white/5">
                            <div className="flex items-center gap-2">
                                <AlertTriangle className="h-5 w-5 text-red-600" />
                                <h3 className="text-sm font-bold text-slate-800 dark:text-white uppercase tracking-wider">Confirm Revoke</h3>
                            </div>
                            <button onClick={() => setDeleteUser(null)} className="p-1 text-slate-400 hover:text-slate-600">
                                <X className="h-5 w-5" />
                            </button>
                        </div>
                        <div className="p-8">
                            <p className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed font-medium">
                                Confirm permanent removal of supplier <span className="text-[#EEAF1C] font-bold">"{deleteUser.first_name} {deleteUser.last_name}"</span>?
                            <br/><span className="text-[10px] text-red-500 font-bold uppercase mt-2 block tracking-widest">This action cannot be undone.</span>
                            </p>
                        </div>
                        <div className="px-6 py-4 border-t border-slate-100 dark:border-white/10 flex justify-end gap-3 bg-slate-50/50 dark:bg-white/5">
                            <button onClick={() => setDeleteUser(null)} disabled={deleting} className="px-4 py-2 text-sm font-semibold text-slate-600 hover:text-slate-800 disabled:opacity-50 transition-colors">Abort</button>
                            <button 
                                onClick={confirmDelete} 
                                disabled={deleting} 
                                className="px-6 py-2 bg-red-600 hover:bg-red-700 text-white rounded-xl text-sm font-semibold transition-all shadow-sm flex items-center gap-2 disabled:opacity-50"
                            >
                                {deleting && <RefreshCw className="h-4 w-4 animate-spin" />} Confirm Purge
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
