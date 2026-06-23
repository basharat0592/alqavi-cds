'use client';

import { useState, useEffect } from 'react';
import {
    Search, RefreshCw, Key, ShieldCheck
} from 'lucide-react';
import { permissionService } from '@/lib/api';
import { exportToCSV } from '@/lib/utils';
import toast from 'react-hot-toast';
import PageLoader from '@/components/ui/PageLoader';
import { PageHeader, Card, Button, Badge, ui, useTableSelection, SelectAllTh, RowCheckboxTd, BulkBar } from '@/components/admin/ui';

export default function PermissionsPage() {
    const [permissions, setPermissions] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');

    const loadData = async () => {
        setLoading(true);
        try {
            const data = await permissionService.getAll();
            setPermissions(data || []);
        } catch (err) {
            console.error('Failed to load permissions', err);
            toast.error('Failed to sync registry');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => { loadData(); }, []);

    const filtered = permissions.filter(p =>
        p.name?.toLowerCase().includes(search.toLowerCase()) ||
        p.code?.toLowerCase().includes(search.toLowerCase()) ||
        p.category?.toLowerCase().includes(search.toLowerCase())
    );

    const sel = useTableSelection(filtered);

    const bulkDelete = async (ids: (string | number)[]) => {
        await Promise.allSettled(ids.map(id => permissionService.delete(id)));
        setPermissions(prev => prev.filter(p => !ids.map(String).includes(String(p.id))));
        toast.success(`${ids.length} permission(s) deleted`);
    };

    if (loading && permissions.length === 0) return <PageLoader />;

    return (
        <div className="text-left">
            <PageHeader
                title="Permissions"
                subtitle="Granular permission protocols"
                breadcrumbs={[
                    { label: 'Console', href: '/admin/dashboard' },
                    { label: 'Users', href: '/admin/users' },
                    { label: 'Permissions' },
                ]}
                actions={
                    <Button variant="outline" size="sm" onClick={loadData} disabled={loading}>
                        <RefreshCw size={14} className={loading ? 'animate-spin' : ''} /> Sync Registry
                    </Button>
                }
            />

            {/* Search */}
            <Card className="p-4 mb-6 flex flex-col sm:flex-row items-stretch sm:items-center gap-4">
                <div className="relative flex-1 w-full sm:max-w-sm">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                    <input
                        value={search}
                        onChange={e => setSearch(e.target.value)}
                        placeholder="Search permission code or description..."
                        className={ui.inputBase + " pl-10"}
                    />
                </div>
            </Card>

            {/* Table */}
            <Card className="overflow-hidden text-left mb-6">
                <div className="bg-slate-50/60 px-5 py-3 border-b border-slate-100 flex items-center gap-2">
                    <ShieldCheck className="h-4 w-4 text-indigo-600" />
                    <span className="text-[13px] font-bold text-slate-900">Permission Protocol Manifest</span>
                </div>
                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse text-[13px]">
                        <thead>
                            <tr className="bg-slate-50/60 border-b border-slate-100 text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                                <SelectAllTh sel={sel} />
                                <th className="px-2.5 sm:px-6 py-3 whitespace-nowrap">Access Segment</th>
                                <th className="px-2.5 sm:px-6 py-3 whitespace-nowrap">System Code</th>
                                <th className="hidden sm:table-cell px-6 py-3 whitespace-nowrap">Classification</th>
                            </tr>
                        </thead>
                        <tbody>
                            {loading && filtered.length === 0 ? (
                                Array(6).fill(0).map((_, i) => (
                                    <tr key={i} className="animate-pulse border-b border-slate-100">
                                        <td colSpan={4} className="px-2.5 sm:px-6 py-6">
                                            <div className="h-4 bg-slate-100 rounded w-full" />
                                        </td>
                                    </tr>
                                ))
                            ) : filtered.length === 0 ? (
                                <tr>
                                    <td colSpan={4} className="px-10 py-24 text-center text-slate-600">
                                        <Key className="h-10 w-10 text-slate-200 mx-auto mb-3" />
                                        <p className="text-[13px]">No protocol entries discovered.</p>
                                    </td>
                                </tr>
                            ) : (
                                filtered.map(p => (
                                    <tr key={p.id} className="border-b border-slate-100 hover:bg-slate-50 transition-colors group text-[13px]">
                                        <RowCheckboxTd sel={sel} id={p.id} />
                                        <td className="px-2.5 sm:px-6 py-3.5">
                                            <div className="flex items-center gap-3">
                                                <div className="h-8 w-8 bg-slate-100 border border-slate-200 rounded-lg flex items-center justify-center font-black text-[10px] text-slate-500 group-hover:bg-indigo-600 group-hover:text-white group-hover:border-indigo-600 transition-all">
                                                    P
                                                </div>
                                                <div>
                                                    <p className="font-bold text-indigo-600 capitalize leading-none mb-1">
                                                        {p.name.replace(/_/g, ' ')}
                                                    </p>
                                                    <p className="text-[11px] text-slate-500 leading-none">{p.description || "Core system access point"}</p>
                                                    <div className="flex items-center gap-1.5 mt-1 sm:hidden">
                                                        <Badge tone="blue">{p.category}</Badge>
                                                    </div>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-2.5 sm:px-6 py-3.5">
                                            <code className="px-2 py-0.5 bg-slate-100 border border-slate-200 rounded text-[11px] font-mono text-slate-600 font-bold">
                                                {p.code}
                                            </code>
                                        </td>
                                        <td className="hidden sm:table-cell px-6 py-3.5 whitespace-nowrap">
                                            <Badge tone="blue">{p.category}</Badge>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </Card>

            <BulkBar
                sel={sel}
                entity="permissions"
                onDelete={bulkDelete}
                onExport={() => exportToCSV(
                    sel.selectedItems.map((p: any) => ({
                        name: p.name || '',
                        code: p.code || '',
                        category: p.category || '',
                        description: p.description || '',
                    })),
                    'permissions.csv',
                )}
            />
        </div>
    );
}
