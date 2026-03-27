'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { 
    Users, Plus, Edit, Trash2, Search, 
    RefreshCw, Package, Phone, Mail, 
    MapPin, Globe, CheckCircle, X, 
    AlertCircle, AlertTriangle, Building2, UserCircle, Eye, ShoppingCart
} from 'lucide-react';
import { companyService, productService } from '@/lib/api';

// ─── Shared Utilities (Matches Company Hub Design) ───────────────────────────
const SectionCard = ({ children, className = "" }: { children: React.ReactNode; className?: string }) => (
    <div className={`bg-white dark:bg-slate-900 border border-[#ddd] dark:border-slate-800 rounded shadow-sm overflow-hidden ${className}`}>
        {children}
    </div>
);

const SectionHeader = ({ title, icon: Icon, action }: { title: string; icon?: any; action?: React.ReactNode }) => (
    <div className="bg-[#f6f6f6] dark:bg-slate-800 px-4 py-3 border-b border-[#ddd] dark:border-slate-800 flex items-center justify-between">
        <div className="flex items-center gap-2">
            {Icon && <Icon className="w-4 h-4 text-gray-600 dark:text-gray-400" />}
            <span className="text-sm font-bold text-gray-800 dark:text-white uppercase tracking-tight">{title}</span>
        </div>
        {action}
    </div>
);

export default function SuppliersPage() {
    const router = useRouter();
    const [suppliers, setSuppliers] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');
    const [refreshing, setRefreshing] = useState(false);
    
    // Detailed Product View Modal
    const [selectedSupplier, setSelectedSupplier] = useState<any | null>(null);
    const [supplierProducts, setSupplierProducts] = useState<any[]>([]);
    const [fetchingProducts, setFetchingProducts] = useState(false);

    const loadData = async () => {
        setLoading(true);
        try {
            const data = await companyService.getSuppliers();
            setSuppliers(data || []);
        } catch (err) {
            console.error('Failed to load suppliers:', err);
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    };

    const viewProducts = async (supplier: any) => {
        setSelectedSupplier(supplier);
        setFetchingProducts(true);
        try {
            const data = await productService.getAll({ supplier: supplier.id } as any);
            setSupplierProducts(Array.isArray(data) ? data : (data as any).results || []);
        } catch (err) {
            console.error('Error fetching supplier products:', err);
            setSupplierProducts([]);
        } finally {
            setFetchingProducts(false);
        }
    };

    useEffect(() => {
        loadData();
    }, []);

    const filtered = suppliers.filter(s => 
        s.name?.toLowerCase().includes(search.toLowerCase()) || 
        s.email?.toLowerCase().includes(search.toLowerCase()) ||
        s.city?.toLowerCase().includes(search.toLowerCase())
    );

    return (
        <>
        <div className="p-6 space-y-8 animate-in fade-in duration-500">
            {/* Header Area */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-black text-gray-900 dark:text-white tracking-tight flex items-center gap-3">
                        <Users className="w-8 h-8 text-[#FF9900]" />
                        Registered Suppliers
                    </h1>
                    <p className="text-xs text-gray-500 mt-1 font-medium uppercase tracking-widest">
                        Manage Vendor Profiles & Product Contributions
                    </p>
                </div>
                <div className="flex items-center gap-3">
                    <button 
                        onClick={() => { setRefreshing(true); loadData(); }}
                        disabled={refreshing}
                        className="p-2 bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-lg text-gray-600 dark:text-gray-300 hover:text-[#FF9900] transition-all disabled:opacity-50"
                    >
                        <RefreshCw className={`w-5 h-5 ${refreshing ? 'animate-spin' : ''}`} />
                    </button>
                    <button className="flex items-center gap-2 px-4 py-2 bg-[#FF9900] hover:bg-[#e68a00] text-[#111] font-bold rounded-lg text-sm shadow-sm transition-all active:scale-95">
                        <Plus className="w-4 h-4" /> Add New Supplier
                    </button>
                </div>
            </div>

            {/* Metrics Overview */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                {[
                    { label: 'Total Suppliers', val: suppliers.length, icon: Users, color: 'blue' },
                    { label: 'Active Suppliers', val: suppliers.filter(s => s.is_active).length, icon: CheckCircle, color: 'emerald' },
                    { label: 'Avg Products/Supp', val: suppliers.length ? (suppliers.reduce((acc, s) => acc + (s.product_count || 0), 0) / suppliers.length).toFixed(1) : 0, icon: Package, color: 'orange' },
                    { label: 'Total Contributed', val: suppliers.reduce((acc, s) => acc + (s.product_count || 0), 0), icon: Building2, color: 'purple' },
                ].map((m, i) => (
                    <SectionCard key={i} className="p-4 border-l-4 border-l-[#FF9900]">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">{m.label}</p>
                                <p className="text-2xl font-black text-gray-900 dark:text-white mt-1">{m.val}</p>
                            </div>
                            <div className={`p-2 bg-gray-50 dark:bg-slate-800 rounded-xl`}>
                                <m.icon className="w-5 h-5 text-[#FF9900]" />
                            </div>
                        </div>
                    </SectionCard>
                ))}
            </div>

            {/* List Section */}
            <SectionCard>
                <SectionHeader 
                    title="Supplier Directory" 
                    icon={Building2}
                    action={
                        <div className="relative">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                            <input 
                                type="text"
                                placeholder="Search suppliers..."
                                value={search}
                                onChange={(e) => setSearch(e.target.value)}
                                className="pl-9 pr-4 py-1.5 bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-700 rounded-lg text-xs outline-none focus:border-[#FF9900] w-64"
                            />
                        </div>
                    }
                />
                
                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="bg-gray-50 dark:bg-slate-800/50 text-[10px] font-black text-gray-500 dark:text-gray-400 uppercase tracking-[0.15em] border-b border-gray-200 dark:border-slate-800">
                                <th className="px-6 py-4">Supplier Identity</th>
                                <th className="px-6 py-4">Contact & Location</th>
                                <th className="px-6 py-4">Product Catalog</th>
                                <th className="px-6 py-4">Status</th>
                                <th className="px-6 py-4 text-right">Acion</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100 dark:divide-slate-800">
                            {loading ? (
                                Array.from({ length: 5 }).map((_, i) => (
                                    <tr key={i} className="animate-pulse">
                                        <td colSpan={5} className="px-6 py-6 h-12 bg-gray-50/50 dark:bg-slate-800/20"></td>
                                    </tr>
                                ))
                            ) : filtered.length > 0 ? (
                                filtered.map(s => (
                                    <tr key={s.id} className="hover:bg-gray-50 dark:hover:bg-slate-800/30 transition-colors group">
                                        <td className="px-6 py-5">
                                            <div className="flex items-center gap-3">
                                                <div className="w-10 h-10 rounded-xl bg-[#FF9900]/10 flex items-center justify-center text-[#FF9900] font-black border border-[#FF9900]/20 group-hover:bg-[#FF9900] group-hover:text-white transition-all">
                                                    {s.name?.charAt(0).toUpperCase()}
                                                </div>
                                                <div>
                                                    <p className="text-sm font-bold text-gray-900 dark:text-white">{s.name}</p>
                                                    <p className="text-[10px] text-gray-500 font-medium uppercase tracking-tight">{s.contact_person || 'Standard Vendor'}</p>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-6 py-5">
                                            <div className="space-y-1">
                                                <div className="flex items-center gap-2 text-xs text-gray-600 dark:text-gray-400">
                                                    <Mail className="w-3 h-3 text-gray-400" /> {s.email || 'no-email@vendor.com'}
                                                </div>
                                                <div className="flex items-center gap-2 text-xs text-gray-600 dark:text-gray-400 font-bold">
                                                    <Phone className="w-3 h-3 text-[#FF9900]" /> {s.phone || 'No Contact'}
                                                </div>
                                                <div className="flex items-center gap-2 text-[10px] text-gray-400 uppercase tracking-tighter">
                                                    <MapPin className="w-3 h-3" /> {s.city || 'Global Origin'}
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-6 py-5">
                                            <div className="flex flex-col gap-2">
                                                <div className="flex items-center gap-2">
                                                    <span className="px-2 py-0.5 bg-sky-100 dark:bg-sky-900/30 text-sky-700 dark:text-sky-300 rounded text-[10px] font-black uppercase tracking-widest">
                                                        {s.product_count || 0} Products
                                                    </span>
                                                </div>
                                                {s.product_list?.length > 0 && (
                                                    <div className="flex flex-wrap gap-1">
                                                        {s.product_list.map((pName: string, idx: number) => (
                                                            <span key={idx} className="px-1.5 py-0.5 bg-gray-100 dark:bg-slate-800 text-[9px] font-bold text-gray-500 rounded truncate max-w-[80px]">
                                                                {pName}
                                                            </span>
                                                        ))}
                                                        {s.product_count > 5 && <span className="text-[9px] text-gray-400 font-bold">+{s.product_count - 5} more</span>}
                                                    </div>
                                                )}
                                            </div>
                                        </td>
                                        <td className="px-6 py-5">
                                            {s.is_active ? (
                                                <span className="flex items-center gap-1.5 text-xs text-emerald-600 dark:text-emerald-400 font-bold">
                                                    <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></div>
                                                    Verified
                                                </span>
                                            ) : (
                                                <span className="flex items-center gap-1.5 text-xs text-red-500 font-bold">
                                                    <X className="w-3 h-3" /> Restricted
                                                </span>
                                            )}
                                        </td>
                                        <td className="px-6 py-5 text-right">
                                            <div className="flex items-center justify-end gap-3">
                                                <button 
                                                    onClick={() => router.push(`/admin/company/suppliers/${s.id}/products`)}
                                                    className="flex items-center gap-1.5 px-3 py-1.5 bg-sky-50 dark:bg-sky-900/30 text-sky-700 dark:text-sky-300 rounded-lg text-[10px] font-black uppercase hover:bg-sky-100 transition-all border border-sky-100 dark:border-sky-800"
                                                >
                                                    <Eye className="w-3 h-3" /> View Catalog
                                                </button>
                                                <button 
                                                    onClick={() => router.push(`/admin/purchases/add?supplier_name=${encodeURIComponent(s.name)}`)}
                                                    className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-50 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-400 rounded-lg text-[10px] font-black uppercase hover:bg-emerald-100 transition-all border border-emerald-100 dark:border-emerald-800"
                                                >
                                                    <ShoppingCart className="w-3 h-3" /> Purchase
                                                </button>
                                                <button className="p-2 text-gray-400 hover:text-red-500 transition-colors rounded-lg hover:bg-white dark:hover:bg-slate-800 shadow-none hover:shadow-sm border border-transparent hover:border-gray-200">
                                                    <Trash2 className="w-4 h-4" />
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))
                            ) : (
                                <tr>
                                    <td colSpan={5} className="px-6 py-24 text-center">
                                        <div className="max-w-xs mx-auto space-y-3">
                                            <div className="w-16 h-16 bg-gray-50 dark:bg-slate-800 rounded-2xl flex items-center justify-center mx-auto">
                                                <Search className="w-8 h-8 text-gray-300" />
                                            </div>
                                            <h3 className="text-sm font-bold text-gray-900 dark:text-white">Zero Suppliers Found</h3>
                                            <p className="text-[10px] text-gray-500 uppercase tracking-widest leading-relaxed"> No vendors match your current search Axis. Adjust your parameters or add a new portal user.</p>
                                        </div>
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </SectionCard>

            {/* Warning Section */}
            {!loading && filtered.length > 0 && (
                <div className="p-4 bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-900/50 rounded-xl flex items-start gap-4">
                    <AlertTriangle className="w-5 h-5 text-amber-500 shrink-0 mt-0.5" />
                    <div>
                        <h4 className="text-[11px] font-black text-amber-900 dark:text-amber-200 uppercase tracking-[0.15em] mb-1 italic">Supplier Distribution Alert</h4>
                        <p className="text-[10px] text-amber-700 dark:text-amber-400 leading-relaxed font-bold">
                            Product counts reflect verified catalog items. Suppliers with high volume and low sales conversion may require administrative audit.
                        </p>
                    </div>
                </div>
            )}
        </div>
        </>
    );
}
