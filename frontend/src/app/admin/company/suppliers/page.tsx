'use client';

import { useState, useEffect } from 'react';
import { 
    Search, Edit, Trash2, Plus, 
    RefreshCw, MapPin, Phone, Building2, 
    Truck, Save, Loader2, UserCheck
} from 'lucide-react';
import { companyService } from '@/services/company.service';
import toast from 'react-hot-toast';
import PageLoader from '@/components/ui/PageLoader';

const SectionCard = ({ children, className = "" }: { children: React.ReactNode; className?: string }) => (
    <div className={`bg-white dark:bg-[#1a252f] border border-slate-200 dark:border-white/10 rounded-xl shadow-sm overflow-hidden ${className}`}>
        {children}
    </div>
);

const INPUT = "w-full px-4 py-2.5 bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-lg text-sm outline-none transition-all focus:border-[#F59E0B] focus:ring-4 focus:ring-[#F59E0B]/10 font-medium";
const LABEL = "block text-[10px] font-black text-slate-500 dark:text-slate-400 mb-1.5 uppercase tracking-widest";
const PRIMARY_BTN = "bg-[#F59E0B] hover:bg-yellow-600 text-white font-bold rounded-lg shadow-sm text-[11px] uppercase tracking-widest py-2 px-4 transition-all flex items-center justify-center gap-2 active:scale-95";

export default function SuppliersPage() {
    const [suppliers, setSuppliers] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');
    const [saving, setSaving] = useState(false);
    
    // Add Supplier Form State
    const [form, setForm] = useState({
        name: '',
        company: '',
        contact: '',
        address: ''
    });

    const loadData = async () => {
        setLoading(true);
        try {
            const data = await companyService.getSuppliers();
            setSuppliers(data || []);
        } catch (err) {
            console.error('Failed to load suppliers', err);
            toast.error('Failed to load suppliers');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => { loadData(); }, []);

    const handleChange = (k: string, v: string) => setForm(p => ({ ...p, [k]: v }));

    const handleAddSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!form.name.trim()) {
            toast.error('Name is required');
            return;
        }

        setSaving(true);
        try {
            await companyService.createSupplier(form);
            toast.success('Supplier added successfully!');
            setForm({ name: '', company: '', contact: '', address: '' }); // reset form
            loadData(); // refresh list
        } catch (err) {
            console.error('Add supplier error:', err);
            toast.error('Failed to add supplier');
        } finally {
            setSaving(false);
        }
    };

    const handleDelete = async (id: number) => {
        if (!confirm('Are you sure you want to delete this supplier?')) return;
        try {
            await companyService.deleteSupplier(id);
            toast.success('Supplier deleted');
            setSuppliers(prev => prev.filter(s => s.id !== id));
        } catch (err) {
            toast.error('Failed to delete supplier');
        }
    };

    if (loading && suppliers.length === 0) return <PageLoader />;

    const filtered = suppliers.filter(s => {
        const text = `${s.name} ${s.company} ${s.contact} ${s.address}`.toLowerCase();
        return text.includes(search.toLowerCase());
    });

    return (
        <div className="max-w-[1200px] mx-auto pb-20 px-4 mt-4 font-sans">
            
            <div className="flex items-center gap-3 mb-6 pb-4 border-b border-slate-200 dark:border-white/10">
                <div className="w-10 h-10 bg-[#F59E0B] rounded-xl flex items-center justify-center shadow-lg shadow-blue-500/10">
                    <Truck className="h-5 w-5 text-white" />
                </div>
                <div>
                    <h1 className="text-xl font-bold text-slate-900 dark:text-white uppercase tracking-tight">Suppliers</h1>
                </div>
            </div>

            {/* ADD SUPPLIER FORM */}
            <SectionCard className="mb-8 p-5">
                <h2 className="text-sm font-bold text-slate-800 dark:text-white uppercase tracking-widest mb-4 flex items-center gap-2">
                    <Plus className="w-4 h-4 text-[#F59E0B]" />
                    Add Supplier
                </h2>
                <form onSubmit={handleAddSubmit} className="grid grid-cols-1 md:grid-cols-5 gap-4 items-end">
                    <div className="md:col-span-1">
                        <label className={LABEL}>Name <span className="text-red-500">*</span></label>
                        <input 
                            value={form.name} 
                            onChange={e => handleChange('name', e.target.value)} 
                            className={INPUT} 
                            placeholder="Supplier Name" 
                        />
                    </div>
                    <div className="md:col-span-1">
                        <label className={LABEL}>Company</label>
                        <input 
                            value={form.company} 
                            onChange={e => handleChange('company', e.target.value)} 
                            className={INPUT} 
                            placeholder="Company Name" 
                        />
                    </div>
                    <div className="md:col-span-1">
                        <label className={LABEL}>Contact</label>
                        <input 
                            value={form.contact} 
                            onChange={e => handleChange('contact', e.target.value)} 
                            className={INPUT} 
                            placeholder="Phone Number" 
                        />
                    </div>
                    <div className="md:col-span-1">
                        <label className={LABEL}>Address</label>
                        <input 
                            value={form.address} 
                            onChange={e => handleChange('address', e.target.value)} 
                            className={INPUT} 
                            placeholder="Address" 
                        />
                    </div>
                    <div className="md:col-span-1">
                        <button type="submit" disabled={saving} className={`${PRIMARY_BTN} w-full h-[42px]`}>
                            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                            Save
                        </button>
                    </div>
                </form>
            </SectionCard>

            {/* SUPPLIERS LIST */}
            <div className="space-y-4">
                <div className="bg-white dark:bg-[#1a252f] border border-slate-200 dark:border-white/10 rounded-xl p-3 flex gap-3 items-center">
                    <div className="relative flex-1 group w-full">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 group-focus-within:text-[#F59E0B] transition-colors" />
                        <input
                            value={search}
                            onChange={e => setSearch(e.target.value)}
                            placeholder="Search suppliers..."
                            className="w-full pl-10 pr-4 py-2 bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-lg text-sm outline-none focus:border-[#F59E0B] transition-all font-medium"
                        />
                    </div>
                    <button onClick={loadData} className="bg-slate-100 hover:bg-slate-200 dark:bg-white/5 dark:hover:bg-white/10 p-2.5 rounded-lg text-slate-600 dark:text-slate-300 transition-all shadow-sm">
                        <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
                    </button>
                </div>

                <SectionCard className="border-none shadow-none">
                    <div className="overflow-x-auto border border-slate-200 dark:border-white/10 rounded-xl">
                        <table className="w-full text-left border-collapse">
                            <thead>
                                <tr className="bg-slate-50 dark:bg-white/5 border-b border-slate-200 dark:border-white/10">
                                    <th className="px-6 py-4 text-[10px] font-black text-slate-500 whitespace-nowrap uppercase tracking-widest border-r border-slate-200 dark:border-white/10">Supplier Name</th>
                                    <th className="px-6 py-4 text-[10px] font-black text-slate-500 whitespace-nowrap uppercase tracking-widest border-r border-slate-200 dark:border-white/10">Company</th>
                                    <th className="px-6 py-4 text-[10px] font-black text-slate-500 whitespace-nowrap uppercase tracking-widest border-r border-slate-200 dark:border-white/10">Contact</th>
                                    <th className="px-6 py-4 text-[10px] font-black text-slate-500 whitespace-nowrap uppercase tracking-widest border-r border-slate-200 dark:border-white/10">Address</th>
                                    <th className="px-6 py-4 text-right text-[10px] font-black text-slate-500 whitespace-nowrap uppercase tracking-widest">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100 dark:divide-white/5 bg-white dark:bg-[#1a252f]">
                                {filtered.length === 0 ? (
                                    <tr>
                                        <td colSpan={5} className="px-6 py-24 text-center">
                                            <div className="flex flex-col items-center gap-2 opacity-40">
                                                <Truck className="h-12 w-12 text-slate-400" />
                                                <p className="text-xs font-bold text-slate-500 uppercase tracking-widest">No suppliers found</p>
                                            </div>
                                        </td>
                                    </tr>
                                ) : (
                                    filtered.map(s => (
                                        <tr key={s.id} className="hover:bg-slate-50/50 dark:hover:bg-white/[0.02] transition-colors group">
                                            <td className="px-6 py-4 border-r border-slate-100 dark:border-white/5">
                                                <span className="text-sm font-bold text-slate-900 dark:text-white">{s.name}</span>
                                            </td>
                                            <td className="px-6 py-4 border-r border-slate-100 dark:border-white/5">
                                                <div className="flex items-center gap-2">
                                                    <Building2 className="w-3.5 h-3.5 text-slate-400" />
                                                    <span className="text-xs font-medium text-slate-600 dark:text-slate-300">{s.company || '--'}</span>
                                                </div>
                                            </td>
                                            <td className="px-6 py-4 border-r border-slate-100 dark:border-white/5">
                                                <div className="flex items-center gap-2">
                                                    <Phone className="w-3.5 h-3.5 text-slate-400" />
                                                    <span className="text-xs font-medium text-slate-600 dark:text-slate-300">{s.contact || '--'}</span>
                                                </div>
                                            </td>
                                            <td className="px-6 py-4 border-r border-slate-100 dark:border-white/5">
                                                <div className="flex items-center gap-2">
                                                    <MapPin className="w-3.5 h-3.5 text-slate-400" />
                                                    <span className="text-xs font-medium text-slate-600 dark:text-slate-300">{s.address || '--'}</span>
                                                </div>
                                            </td>
                                            <td className="px-6 py-4 text-right">
                                                <div className="flex justify-end gap-2">
                                                    <button onClick={() => handleDelete(s.id)} className="w-8 h-8 flex items-center justify-center text-slate-400 hover:text-red-600 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/10 transition-all">
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
        </div>
    );
}
