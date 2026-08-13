'use client';
import { useState, useEffect } from 'react';
import { Plus, Save, X, Loader2, Check, AlertCircle } from 'lucide-react';
import cmsService from '@/services/cms.service';
import toast from 'react-hot-toast';
import { exportToCSV } from '@/lib/utils';
import { useTableSelection, SelectAllTh, RowCheckboxTd, BulkBar, ui } from '@/components/admin/ui';
interface NavbarPage {
    id?: number;
    name: string;
    slug?: string;
    link: string;
    description: string;
    icon_url: string;
    order: number;
    is_visible: boolean;
    created_at?: string;
    updated_at?: string;
}

const EMPTY_PAGE: NavbarPage = { name: '', slug: '', link: '', description: '', icon_url: '', order: 0, is_visible: true };

// ── AMAZON STYLE COMPONENTS ──
const AmazonBtn = ({ children, onClick, loading, variant = 'primary', className = '', type = 'button', disabled = false, size = 'md' }: any) => {
    const styles = {
        primary: 'bg-[#F59E0B] border-[#B4780B] hover:bg-[#B4780B] text-[#0F172A]',
        secondary: 'bg-gradient-to-b from-[#f8fafc] to-[#e7e9ec] border-[#cbd5e1] hover:from-[#eef1f3] hover:to-[#dce0e4] text-[#0F172A]',
        danger: 'bg-gradient-to-b from-[#f7b5b0] to-[#f08080] border-[#d32f2f] hover:from-[#f5a0a0] hover:to-[#ee6f6f] text-[#0F172A]',
    };
    const sizes = {
        sm: 'h-[28px] px-2 text-[11px]',
        md: 'h-[31px] px-4 text-[13px]',
        lg: 'h-[36px] px-6 text-[14px]',
    };
    return (
        <button type={type} onClick={onClick} disabled={loading || disabled}
            className={`${sizes[size as keyof typeof sizes]} rounded-lg font-medium border shadow-sm transition-all flex items-center justify-center gap-2 disabled:opacity-60 ${styles[variant as keyof typeof styles]} ${className}`}>
            {loading && <Loader2 className="h-3 w-3 animate-spin" />}
            {children}
        </button>
    );
};

const inputCls = ui.inputBase.replace('h-10', 'h-9');
// Shared form fields used by both the "Add" panel and the "Edit" modal.
const PageForm = ({ page, onChange }: { page: NavbarPage; onChange: (p: NavbarPage) => void }) => (
    <div className="space-y-4">
        <div className="grid md:grid-cols-2 gap-4">
            <div className="space-y-1.5">
                <label className="text-[13px] font-bold text-[#111]">Page Name *</label>
                <input type="text" value={page.name}
                    onChange={e => onChange({ ...page, name: e.target.value })}
                    placeholder="e.g., Skincare Products"
                    className={`${inputCls} w-full`} />
            </div>
            <div className="space-y-1.5">
                <label className="text-[13px] font-bold text-[#111]">Link / URL</label>
                <input type="text" value={page.link}
                    onChange={e => onChange({ ...page, link: e.target.value })}
                    placeholder="e.g., /about or /customer/shop"
                    className={`${inputCls} w-full`} />
            </div>
            <div className="space-y-1.5">
                <label className="text-[13px] font-bold text-[#111]">Icon URL</label>
                <input type="text" value={page.icon_url}
                    onChange={e => onChange({ ...page, icon_url: e.target.value })}
                    placeholder="e.g., /icons/skincare.svg"
                    className={`${inputCls} w-full`} />
            </div>
            <div className="space-y-1.5">
                <label className="text-[13px] font-bold text-[#111]">Display Order</label>
                <input type="number" value={page.order}
                    onChange={e => onChange({ ...page, order: parseInt(e.target.value) || 0 })}
                    placeholder="0"
                    className={`${inputCls} w-full`} />
            </div>
        </div>
        <div className="space-y-1.5">
            <label className="text-[13px] font-bold text-[#111]">Description</label>
            <textarea rows={2} value={page.description}
                onChange={e => onChange({ ...page, description: e.target.value })}
                placeholder="Internal description for admin"
                className="w-full px-3 py-2 border border-[#cbd5e1] rounded-lg text-[13px] outline-none focus:border-[#F59E0B] focus:shadow-[0_0_3px_2_rgba(228,121,17,0.5)] bg-white resize-none" />
        </div>
        <div className="flex items-center gap-2 pt-4 border-t border-[#eee]">
            <input type="checkbox" id={`visible-${page.id ?? 'new'}`} checked={page.is_visible}
                onChange={e => onChange({ ...page, is_visible: e.target.checked })}
                className="cursor-pointer w-4 h-4" />
            <label htmlFor={`visible-${page.id ?? 'new'}`} className="text-[13px] font-medium text-[#111] cursor-pointer">Visible on storefront</label>
        </div>
    </div>
);

export default function NavbarPagesTab() {
    const [pages, setPages] = useState<NavbarPage[]>([]);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [addingNew, setAddingNew] = useState(false);
    const [editingPage, setEditingPage] = useState<NavbarPage | null>(null);
    const [newPage, setNewPage] = useState<NavbarPage>({ ...EMPTY_PAGE });
    const [categoriesCounts, setCategoriesCounts] = useState<Record<number, number>>({});

    useEffect(() => {
        loadPages();
    }, []);

    const loadPages = async () => {
        setLoading(true);
        try {
            const data = await cmsService.getNavbarPages();
            setPages(Array.isArray(data) ? data : []);
            // Load categories count for each navbar page
            try {
                const counts = await cmsService.getNavbarPagesWithCategoriesCount();
                const countsMap: Record<number, number> = {};
                counts.forEach((item: any) => {
                    countsMap[item.id] = item.categories_count || 0;
                });
                setCategoriesCounts(countsMap);
            } catch { }
        } catch (error: any) {
            console.error('Failed to load navbar pages:', error);
            const msg = error?.response?.data?.detail || error?.response?.data || error?.message || 'Failed to load navbar pages';
            toast.error(typeof msg === 'string' ? msg : 'Failed to load navbar pages');
            setPages([]);
        } finally {
            setLoading(false);
        }
    };

    const handleAddPage = async () => {
        if (!newPage.name.trim()) {
            toast.error('Please enter a page name');
            return;
        }
        setSaving(true);
        try {
            const created = await cmsService.createNavbarPage(newPage);
            setPages([...pages, created]);
            setNewPage({ ...EMPTY_PAGE });
            setAddingNew(false);
            toast.success('Navbar page created');
        } catch (error) {
            toast.error('Failed to create navbar page');
        } finally {
            setSaving(false);
        }
    };

    const handleUpdatePage = async () => {
        if (!editingPage?.id) return;
        if (!editingPage.name.trim()) {
            toast.error('Please enter a page name');
            return;
        }
        setSaving(true);
        try {
            const updated = await cmsService.updateNavbarPage(editingPage.id, {
                name: editingPage.name,
                link: editingPage.link,
                icon_url: editingPage.icon_url,
                description: editingPage.description,
                order: editingPage.order,
                is_visible: editingPage.is_visible,
            });
            setPages(pages.map(p => p.id === editingPage.id ? updated : p));
            setEditingPage(null);
            toast.success('Navbar page updated');
        } catch (error) {
            toast.error('Failed to update navbar page');
        } finally {
            setSaving(false);
        }
    };

    const handleDeletePage = async (id: number) => {
        if (!confirm('Are you sure you want to delete this navbar page? Associated categories will not be deleted.')) return;
        try {
            await cmsService.deleteNavbarPage(id);
            setPages(pages.filter(p => p.id !== id));
            toast.success('Navbar page deleted');
        } catch (error) {
            toast.error('Failed to delete navbar page');
        }
    };

    const sel = useTableSelection(pages, (p) => p.id ?? -1);

    const bulkDelete = async (ids: (string | number)[]) => {
        await Promise.allSettled(ids.map(id => cmsService.deleteNavbarPage(Number(id))));
        setPages(prev => prev.filter(p => !ids.map(String).includes(String(p.id))));
        toast.success(`${ids.length} page(s) deleted`);
    };

    const bulkSetVisible = async (ids: (string | number)[], visible: boolean) => {
        await Promise.allSettled(ids.map(id => cmsService.updateNavbarPage(Number(id), { is_visible: visible })));
        setPages(prev => prev.map(p => ids.map(String).includes(String(p.id)) ? { ...p, is_visible: visible } : p));
        toast.success(`${visible ? 'Showed' : 'Hid'} ${ids.length} page(s)`);
    };

    if (loading) return (
        <div className="flex items-center justify-center min-h-[400px]">
            <Loader2 className="h-8 w-8 animate-spin text-[#c45500]" />
        </div>
    );

    return (
        <div className="space-y-6 animate-in fade-in duration-500">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-[21px] font-bold text-[#111]">Navbar Pages</h2>
                    <p className="text-[13px] text-[#64748B] mt-1">Manage pages that appear in the top navigation bar</p>
                </div>
                {!addingNew && (
                    <AmazonBtn onClick={() => setAddingNew(true)} className="flex items-center gap-2">
                        <Plus size={14} /> Add New Page
                    </AmazonBtn>
                )}
            </div>

            {/* Add New Form */}
            {addingNew && (
                <div className="bg-white border border-[#e2e8f0] rounded-lg shadow-sm overflow-hidden">
                    <div className="bg-[#f8fafc] border-b border-[#e2e8f0] px-6 py-3 flex items-center justify-between">
                        <h3 className="font-bold text-[#111]">Create New Navbar Page</h3>
                        <button onClick={() => setAddingNew(false)} className="text-[#64748B] hover:text-[#111]">
                            <X size={18} />
                        </button>
                    </div>
                    <div className="p-6">
                        <PageForm page={newPage} onChange={setNewPage} />
                        <div className="flex items-center justify-end gap-3 pt-6">
                            <AmazonBtn onClick={() => setAddingNew(false)} variant="secondary" size="sm">Cancel</AmazonBtn>
                            <AmazonBtn onClick={handleAddPage} loading={saving} size="sm">
                                <Check size={14} /> Create Page
                            </AmazonBtn>
                        </div>
                    </div>
                </div>
            )}

            {/* Pages Table */}
            <div className="bg-white border border-[#e2e8f0] rounded-lg shadow-sm overflow-hidden">
                <div className="bg-[#f8fafc] border-b border-[#e2e8f0] px-6 py-3">
                    <h3 className="font-bold text-[#111]">All Navbar Pages ({pages.length})</h3>
                </div>

                {pages.length === 0 ? (
                    <div className="p-12 text-center">
                        <AlertCircle size={40} className="mx-auto text-[#aaa] mb-3" />
                        <p className="text-[#64748B] text-[14px]">No navbar pages created yet. Start by creating your first page.</p>
                    </div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full text-[13px]">
                            <thead>
                                <tr className="border-b border-[#eee] bg-[#fafbfc]">
                                    <SelectAllTh sel={sel} />
                                    <th className="px-6 py-3 text-left font-bold text-[#111]">ID</th>
                                    <th className="px-6 py-3 text-left font-bold text-[#111]">Name</th>
                                    <th className="px-6 py-3 text-left font-bold text-[#111]">Link</th>
                                    <th className="px-6 py-3 text-left font-bold text-[#111]">Slug</th>
                                    <th className="px-6 py-3 text-left font-bold text-[#111]">Categories</th>
                                    <th className="px-6 py-3 text-center font-bold text-[#111]">Order</th>
                                    <th className="px-6 py-3 text-center font-bold text-[#111]">Status</th>
                                    <th className="px-6 py-3 text-left font-bold text-[#111]">Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                {pages.map((page, idx) => (
                                    <tr key={page.id ?? idx} className="border-b border-[#eee] hover:bg-[#fafbfc] transition-colors group">
                                        <RowCheckboxTd sel={sel} id={page.id ?? -1} />
                                        <td className="px-6 py-3 text-[13px] text-[#444]">{page.id ?? '-'}</td>
                                        <td className="px-6 py-3">
                                            <div className="font-medium text-[#111]">{page.name}</div>
                                        </td>
                                        <td className="px-6 py-3">
                                            {page.link
                                                ? <a href={page.link} target="_blank" rel="noopener noreferrer" className="text-[#0066c0] hover:text-[#c45500] hover:underline text-[12px]">{page.link}</a>
                                                : <span className="text-[#aaa] text-[12px]">—</span>}
                                        </td>
                                        <td className="px-6 py-3">
                                            <code className="bg-[#f1f3f5] text-[#d63031] px-2 py-1 rounded text-[11px] font-mono">{page.slug}</code>
                                        </td>
                                        <td className="px-6 py-3">
                                            <span className="bg-blue-50 text-blue-700 px-3 py-1 rounded-full text-[12px] font-medium">
                                                {categoriesCounts[page.id || 0] || 0} categories
                                            </span>
                                        </td>
                                        <td className="px-6 py-3 text-center">
                                            <span className="font-medium">{page.order}</span>
                                        </td>
                                        <td className="px-6 py-3 text-center">
                                            {page.is_visible ? (
                                                <span className="inline-block bg-green-100 text-green-700 px-3 py-1 rounded-full text-[11px] font-bold">Active</span>
                                            ) : (
                                                <span className="inline-block bg-gray-100 text-gray-700 px-3 py-1 rounded-full text-[11px] font-bold">Hidden</span>
                                            )}
                                        </td>
                                        <td className="px-6 py-3">
                                            <div className="flex items-center justify-end gap-2.5">
                                                <button onClick={() => setEditingPage({ ...EMPTY_PAGE, ...page })} className="text-[12px] font-bold text-[#B4780B] hover:underline">Edit</button>
                                                <span className="text-slate-300">|</span>
                                                <button onClick={() => handleDeletePage(page.id!)} className="text-[12px] font-bold text-[#c40000] hover:underline">Delete</button>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>

            <BulkBar
                sel={sel}
                entity="pages"
                onDelete={bulkDelete}
                statusActions={[
                    { label: 'Show', apply: (ids) => bulkSetVisible(ids, true) },
                    { label: 'Hide', apply: (ids) => bulkSetVisible(ids, false) },
                ]}
                onExport={() => exportToCSV(
                    sel.selectedItems.map((p: any) => ({
                        id: p.id ?? '',
                        name: p.name || '',
                        link: p.link || '',
                        slug: p.slug || '',
                        categories: categoriesCounts[p.id || 0] || 0,
                        order: p.order ?? 0,
                        status: p.is_visible ? 'Active' : 'Hidden',
                    })),
                    'navbar-pages.csv',
                )}
            />

            {/* Info Box */}
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <p className="text-[13px] text-blue-800 flex items-start gap-2">
                    <AlertCircle size={16} className="mt-0.5 flex-shrink-0" />
                    <span><strong>Tip:</strong> Create navbar pages first, then assign categories to them. Categories will appear as dropdown items in the navbar under their parent page.</span>
                </p>
            </div>

            {/* ── EDIT MODAL ── */}
            {editingPage && (
                <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4">
                    <div className="absolute inset-0 bg-black/50 animate-in fade-in duration-200" onClick={() => !saving && setEditingPage(null)} />
                    <div className="relative bg-white rounded-[6px] shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto animate-in fade-in zoom-in-95 duration-200">
                        <div className="sticky top-0 bg-[#f8fafc] border-b border-[#e2e8f0] px-6 py-4 flex items-center justify-between">
                            <div>
                                <h3 className="font-bold text-[#111] text-[16px]">Edit Navbar Page</h3>
                                <p className="text-[12px] text-[#64748B] mt-0.5">ID #{editingPage.id} · slug: <code className="font-mono text-[#d63031]">{editingPage.slug}</code></p>
                            </div>
                            <button onClick={() => !saving && setEditingPage(null)} className="text-[#64748B] hover:text-[#111]">
                                <X size={20} />
                            </button>
                        </div>
                        <div className="p-6">
                            <PageForm page={editingPage} onChange={setEditingPage} />
                        </div>
                        <div className="sticky bottom-0 bg-white border-t border-[#eee] px-6 py-4 flex items-center justify-end gap-3">
                            <AmazonBtn onClick={() => setEditingPage(null)} variant="secondary" size="md" disabled={saving}>Cancel</AmazonBtn>
                            <AmazonBtn onClick={handleUpdatePage} loading={saving} size="md">
                                <Save size={14} /> Save Changes
                            </AmazonBtn>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
